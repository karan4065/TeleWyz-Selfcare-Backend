import { v4 as uuidv4 } from 'uuid';
import { simRepository, SimOrderRecord } from './sim.repository';
import { reservationRepository } from '../reservation/reservation.repository';
import { kycAdapter } from '../../integrations/kyc/kyc.adapter';
import { bssAdapter } from '../../integrations/bss/bss.adapter';
import { logisticsAdapter } from '../../integrations/logistics/logistics.adapter';
import { smsAdapter } from '../../integrations/sms/sms.adapter';
import { smtpAdapter } from '../../integrations/smtp/smtp.adapter';
import { authRepository } from '../auth/auth.repository';
import { BadRequestError, NotFoundError } from '../../core/errors';
import { CreateSimOrderDto, SubmitKycDto, ActivateSimDto, SimReplacementDto } from './sim.dto';
import { logger } from '../../core/logger';

export class SimService {
  async createSimOrder(dto: CreateSimOrderDto, subscriberId?: string): Promise<SimOrderRecord & { trackingNumber?: string; esimQrPayload?: string }> {
    // Check number state
    const numberRecord = await reservationRepository.findByMsisdn(dto.msisdn);
    if (numberRecord && numberRecord.status === 'ASSIGNED') {
      throw new BadRequestError(`MSISDN ${dto.msisdn} is already active and assigned to an existing customer`);
    }

    const orderNumber = `ORD-SIM-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const iccid = `8923401${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    let trackingNumber: string | undefined;
    let esimQrPayload: string | undefined;

    if (dto.simType === 'PHYSICAL') {
      const dispatch = await logisticsAdapter.createDispatch({
        orderNumber,
        recipientName: `${dto.firstName} ${dto.lastName}`,
        recipientPhone: dto.msisdn,
        deliveryAddress: dto.deliveryAddress!,
        itemType: 'PHYSICAL_SIM'
      });
      trackingNumber = dispatch.trackingNumber;
    } else {
      esimQrPayload = `LPA:1$smdp.telewyz.net$CONF-${uuidv4().substring(0, 12).toUpperCase()}`;
    }

    const order = await simRepository.createSimOrder({
      orderNumber,
      msisdn: dto.msisdn,
      simType: dto.simType,
      deliveryAddress: dto.deliveryAddress || null,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      kycStatus: 'NOT_SUBMITTED',
      activationStatus: 'PENDING',
      iccid,
      trackingNumber: trackingNumber || null,
      subscriberId: subscriberId || null
    });

    // Mark number as assigned in reservation store
    if (numberRecord) {
      numberRecord.status = 'ASSIGNED';
    }

    // Send order confirmation email
    smtpAdapter.sendEmail({
      to: dto.email,
      subject: `Your TeleWyz ${dto.simType} Order Confirmation - ${orderNumber}`,
      html: `<p>Thank you for your order ${orderNumber}. Please proceed to NIMC KYC verification.</p>`
    }).catch(err => logger.warn({ err }, 'Failed to send SIM order confirmation email'));

    return {
      ...order,
      trackingNumber,
      esimQrPayload
    };
  }

  async submitKyc(dto: SubmitKycDto) {
    const order = await simRepository.findByOrderNumber(dto.orderNumber);
    if (!order) {
      throw new NotFoundError(`SIM Order '${dto.orderNumber}' not found`);
    }

    if (order.kycStatus === 'VERIFIED') {
      return {
        orderNumber: order.orderNumber,
        kycStatus: 'VERIFIED',
        message: 'KYC identity is already verified for this SIM order'
      };
    }

    // Call NIMC/NCC KYC verification adapter
    const kycResult = await kycAdapter.verifyNin({
      nin: dto.nin,
      msisdn: order.msisdn,
      firstName: order.firstName,
      lastName: order.lastName
    });

    if (!kycResult.verified) {
      await simRepository.updateSimOrder(order.id, {
        kycStatus: 'REJECTED',
        nin: dto.nin
      });

      throw new BadRequestError(`NIMC KYC verification failed: ${kycResult.rejectionReason}`, {
        matchScore: kycResult.matchScore
      });
    }

    // If biometric live photo provided, run liveness check
    if (dto.livePhotoBase64) {
      const bioResult = await kycAdapter.verifyBiometrics(dto.nin, dto.livePhotoBase64);
      if (!bioResult.matched) {
        await simRepository.updateSimOrder(order.id, { kycStatus: 'REJECTED' });
        throw new BadRequestError('Biometric facial liveness check failed.');
      }
    }

    const updated = await simRepository.updateSimOrder(order.id, {
      kycStatus: 'VERIFIED',
      kycReference: kycResult.kycReference,
      nin: dto.nin
    });

    return {
      orderNumber: updated.orderNumber,
      kycStatus: updated.kycStatus,
      kycReference: updated.kycReference,
      message: 'NIMC biometric KYC verified successfully. Ready for network activation.'
    };
  }

  async activateSim(dto: ActivateSimDto) {
    const order = await simRepository.findByOrderNumber(dto.orderNumber);
    if (!order) {
      throw new NotFoundError(`SIM Order '${dto.orderNumber}' not found`);
    }

    // CRITICAL BUSINESS RULE: Do not mark a SIM as active until authoritative provisioning confirms
    if (order.kycStatus !== 'VERIFIED') {
      throw new BadRequestError(
        `Cannot activate SIM. Identity verification required (Current KYC status: ${order.kycStatus})`
      );
    }

    if (order.activationStatus === 'ACTIVE') {
      return {
        orderNumber: order.orderNumber,
        msisdn: order.msisdn,
        activationStatus: 'ACTIVE',
        message: 'SIM is already active on the TeleWyz telecom network'
      };
    }

    // Trigger provisioning on network HLR via authoritative BSS adapter
    const provisionResult = await bssAdapter.provisionSim(order.msisdn, order.iccid, order.simType);

    if (provisionResult.status !== 'PROVISIONED') {
      await simRepository.updateSimOrder(order.id, { activationStatus: 'FAILED' });
      throw new BadRequestError(`Network provisioning failed: ${provisionResult.status}`);
    }

    // Mark active only after confirmation from BSS
    const updated = await simRepository.updateSimOrder(order.id, {
      activationStatus: 'ACTIVE'
    });

    // Ensure subscriber account is provisioned in local store
    let subscriber = await authRepository.findSubscriberByMsisdn(order.msisdn);
    if (!subscriber) {
      subscriber = await authRepository.createSubscriber({
        msisdn: order.msisdn,
        imsi: `621${order.iccid.slice(-12)}`,
        email: order.email,
        firstName: order.firstName,
        lastName: order.lastName,
        accountType: 'PREPAID',
        status: 'ACTIVE',
        role: 'SUBSCRIBER',
        loyaltyPoints: 100
      });
    }

    // Send activation SMS
    smsAdapter.sendSms({
      to: order.msisdn,
      message: `Welcome to TeleWyz E-Care! Your ${order.simType} has been successfully activated. Ref: ${provisionResult.networkReference}`
    }).catch(err => logger.warn({ err }, 'Failed to dispatch activation SMS'));

    return {
      orderNumber: updated.orderNumber,
      msisdn: updated.msisdn,
      iccid: updated.iccid,
      simType: updated.simType,
      activationStatus: 'ACTIVE',
      networkReference: provisionResult.networkReference,
      activationDate: provisionResult.activationDate,
      message: 'SIM activated successfully on TeleWyz telecom network'
    };
  }

  async getOrderDetails(orderNumberOrMsisdn: string) {
    let order = await simRepository.findByOrderNumber(orderNumberOrMsisdn);
    if (!order) {
      order = await simRepository.findByMsisdn(orderNumberOrMsisdn);
    }
    if (!order) {
      throw new NotFoundError(`SIM Order '${orderNumberOrMsisdn}' not found`);
    }

    let trackingTimeline: any = null;
    if (order.trackingNumber) {
      trackingTimeline = await logisticsAdapter.getTrackingStatus(order.trackingNumber);
    }

    return {
      orderNumber: order.orderNumber,
      msisdn: order.msisdn,
      simType: order.simType,
      kycStatus: order.kycStatus,
      activationStatus: order.activationStatus,
      iccid: order.iccid,
      deliveryAddress: order.deliveryAddress,
      trackingNumber: order.trackingNumber,
      trackingDetails: trackingTimeline,
      createdAt: order.createdAt
    };
  }

  async requestSimReplacement(subscriberId: string, dto: SimReplacementDto) {
    const subscriber = await authRepository.findSubscriberById(subscriberId);
    if (!subscriber) throw new NotFoundError('Subscriber not found');

    const replacementOrderNumber = `REP-SIM-${Date.now().toString().slice(-6)}`;
    const newIccid = `8923401${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    let trackingNumber: string | undefined;
    if (dto.simType === 'PHYSICAL') {
      const dispatch = await logisticsAdapter.createDispatch({
        orderNumber: replacementOrderNumber,
        recipientName: `${subscriber.firstName} ${subscriber.lastName}`,
        recipientPhone: subscriber.msisdn,
        deliveryAddress: dto.deliveryAddress || 'Registered Home Address',
        itemType: 'PHYSICAL_SIM'
      });
      trackingNumber = dispatch.trackingNumber;
    }

    const order = await simRepository.createSimOrder({
      orderNumber: replacementOrderNumber,
      msisdn: subscriber.msisdn,
      simType: dto.simType,
      deliveryAddress: dto.deliveryAddress || null,
      email: subscriber.email,
      firstName: subscriber.firstName,
      lastName: subscriber.lastName,
      kycStatus: 'VERIFIED', // existing subscriber already passed KYC
      activationStatus: 'PENDING',
      iccid: newIccid,
      trackingNumber: trackingNumber || null,
      subscriberId: subscriber.id
    });

    return {
      orderNumber: order.orderNumber,
      msisdn: order.msisdn,
      simType: order.simType,
      reason: dto.reason,
      newIccid,
      trackingNumber,
      message: 'SIM replacement order initiated. Present replacement order at any TeleWyz store or wait for courier dispatch.'
    };
  }
}

export const simService = new SimService();

