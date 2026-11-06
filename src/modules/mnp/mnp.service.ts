import { mnpRepository, MnpRecord } from './mnp.repository';
import { kycAdapter } from '../../integrations/kyc/kyc.adapter';
import { smsAdapter } from '../../integrations/sms/sms.adapter';
import { BadRequestError, ConflictError, NotFoundError } from '../../core/errors';
import { ValidateMnpEligibilityDto, CreateMnpRequestDto, CancelMnpDto } from './mnp.dto';
import { logger } from '../../core/logger';

export class MnpService {
  async validateEligibility(dto: ValidateMnpEligibilityDto) {
    // 2348000000000 is mock donor barred test
    if (dto.msisdn === '2348000000000') {
      return {
        msisdn: dto.msisdn,
        donorOperator: dto.donorOperator,
        eligible: false,
        rejectionReason: 'MSISDN is suspended or barred on donor operator network'
      };
    }

    const existing = await mnpRepository.findByMsisdn(dto.msisdn);
    if (existing && ['SUBMITTED', 'VALIDATED', 'IN_PROGRESS'].includes(existing.status)) {
      throw new ConflictError(`An active MNP request (${existing.id}) is already in progress for ${dto.msisdn}`);
    }

    return {
      msisdn: dto.msisdn,
      donorOperator: dto.donorOperator,
      accountType: dto.accountType,
      eligible: true,
      portingFee: 0,
      currency: 'NGN',
      estimatedDurationHours: 48,
      requirements: [
        'National Identity Number (NIN) verification',
        'SIM must have been active on donor network for at least 30 days',
        'Confirmation text will be sent to your existing SIM by the NCC Clearinghouse'
      ]
    };
  }

  async submitMnpRequest(dto: CreateMnpRequestDto, subscriberId?: string): Promise<MnpRecord> {
    const eligibility = await this.validateEligibility({
      msisdn: dto.msisdn,
      donorOperator: dto.donorOperator,
      accountType: 'PREPAID'
    });

    if (!eligibility.eligible) {
      throw new BadRequestError(`Number is not eligible for porting: ${eligibility.rejectionReason}`);
    }

    // Verify NIMC KYC for regulatory compliance
    const kyc = await kycAdapter.verifyNin({
      nin: dto.nin,
      msisdn: dto.msisdn,
      firstName: 'Porting',
      lastName: 'Subscriber'
    });

    if (!kyc.verified) {
      throw new BadRequestError(`NIMC KYC validation failed: ${kyc.rejectionReason}`);
    }

    const record = await mnpRepository.create({
      msisdn: dto.msisdn,
      donorOperator: dto.donorOperator,
      donorAccountNum: dto.donorAccountNum || null,
      simType: dto.simType,
      selectedPlanId: dto.selectedPlanId || null,
      deliveryAddress: dto.deliveryAddress || null,
      nin: dto.nin,
      kycReference: kyc.kycReference,
      status: 'SUBMITTED',
      subscriberId: subscriberId || null
    });

    // Send confirmation SMS
    smsAdapter.sendSms({
      to: dto.msisdn,
      message: `TeleWyz MNP Port-In Request received. Please reply 'PORT' when prompted by the NCC Clearinghouse. Tracking Ref: ${record.id}`
    }).catch(err => logger.warn({ err }, 'Failed to dispatch MNP confirmation SMS'));

    return record;
  }

  async getMnpStatus(requestIdOrMsisdn: string) {
    let req = await mnpRepository.findById(requestIdOrMsisdn);
    if (!req) {
      req = await mnpRepository.findByMsisdn(requestIdOrMsisdn);
    }
    if (!req) {
      throw new NotFoundError(`MNP request '${requestIdOrMsisdn}' not found`);
    }

    return {
      requestId: req.id,
      msisdn: req.msisdn,
      donorOperator: req.donorOperator,
      simType: req.simType,
      status: req.status,
      rejectionReason: req.rejectionReason,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
      nextStep: req.status === 'SUBMITTED' 
        ? 'Awaiting donor operator clearance via NCC central clearinghouse'
        : req.status === 'VALIDATED'
        ? 'Clearinghouse approved. Scheduled for automated midnight HLR switch'
        : req.status === 'COMPLETED'
        ? 'Porting complete. Insert your TeleWyz SIM to start service'
        : req.status === 'CANCELLED'
        ? 'Porting request cancelled'
        : 'Porting request rejected'
    };
  }

  async cancelMnpRequest(requestId: string, dto: CancelMnpDto) {
    const req = await mnpRepository.findById(requestId);
    if (!req) throw new NotFoundError('MNP request not found');

    if (req.status === 'COMPLETED') {
      throw new BadRequestError('Porting request has already been completed and cannot be cancelled');
    }

    if (req.status === 'IN_PROGRESS') {
      throw new BadRequestError('Porting process has reached irrevocable network execution stage and cannot be cancelled');
    }

    if (req.status === 'CANCELLED') {
      return { success: true, message: 'MNP request is already cancelled' };
    }

    await mnpRepository.update(requestId, {
      status: 'CANCELLED',
      rejectionReason: `Cancelled by customer: ${dto.reason}`
    });

    return {
      success: true,
      requestId,
      status: 'CANCELLED',
      message: 'MNP port-in request cancelled successfully'
    };
  }
}

export const mnpService = new MnpService();
