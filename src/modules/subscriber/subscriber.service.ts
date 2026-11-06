import jwt from 'jsonwebtoken';
import { authRepository } from '../auth/auth.repository';
import { subscriberRepository } from './subscriber.repository';
import { authService } from '../auth/auth.service';
import { bssAdapter } from '../../integrations/bss/bss.adapter';
import { config } from '../../config';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../core/errors';
import {
  UpdateProfileDto,
  LinkAssociatedAccountDto,
  VerifyAssociatedAccountDto,
  SwitchAccountDto
} from './subscriber.dto';

export class SubscriberService {
  async getProfile(subscriberId: string) {
    const subscriber = await authRepository.findSubscriberById(subscriberId);
    if (!subscriber) {
      throw new NotFoundError('Subscriber account not found');
    }

    // Fetch live authoritative balances from BSS
    const balances = await bssAdapter.getBalances(subscriber.msisdn);

    return {
      subscriber: {
        id: subscriber.id,
        msisdn: subscriber.msisdn,
        imsi: subscriber.imsi,
        email: subscriber.email,
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        accountType: subscriber.accountType,
        status: subscriber.status,
        role: subscriber.role,
        loyaltyPoints: subscriber.loyaltyPoints,
        createdAt: subscriber.createdAt
      },
      telecomBalance: balances
    };
  }

  async updateProfile(subscriberId: string, dto: UpdateProfileDto) {
    const subscriber = await authRepository.findSubscriberById(subscriberId);
    if (!subscriber) {
      throw new NotFoundError('Subscriber account not found');
    }

    const updated = await authRepository.updateSubscriber(subscriberId, {
      firstName: dto.firstName || subscriber.firstName,
      lastName: dto.lastName || subscriber.lastName,
      email: dto.email || subscriber.email
    });

    return {
      id: updated.id,
      msisdn: updated.msisdn,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      accountType: updated.accountType
    };
  }

  async getUsage(subscriberId: string, requestedMsisdn?: string) {
    const subscriber = await authRepository.findSubscriberById(subscriberId);
    if (!subscriber) {
      throw new NotFoundError('Subscriber account not found');
    }

    const targetMsisdn = requestedMsisdn || subscriber.msisdn;

    // If querying another MSISDN, verify it is an approved associated account with VIEW_BALANCE permission
    if (targetMsisdn !== subscriber.msisdn) {
      const associated = await subscriberRepository.findAssociatedAccountByMsisdn(subscriberId, targetMsisdn);
      if (!associated || !associated.verified) {
        throw new ForbiddenError(`Access denied to MSISDN ${targetMsisdn}. Account is not linked or not verified.`);
      }
      if (!associated.permissions.includes('VIEW_BALANCE')) {
        throw new ForbiddenError(`Associated account does not have VIEW_BALANCE permission.`);
      }
    }

    // Authoritative telecom usage meters from BSS
    return bssAdapter.getUsage(targetMsisdn);
  }

  async getAssociatedAccounts(subscriberId: string) {
    return subscriberRepository.findAssociatedAccounts(subscriberId);
  }

  async linkAssociatedAccount(primarySubscriberId: string, dto: LinkAssociatedAccountDto) {
    const primary = await authRepository.findSubscriberById(primarySubscriberId);
    if (!primary) {
      throw new NotFoundError('Primary subscriber not found');
    }

    if (primary.msisdn === dto.secondaryMsisdn) {
      throw new BadRequestError('Cannot link your own primary MSISDN as an associated account');
    }

    const existing = await subscriberRepository.findAssociatedAccountByMsisdn(primarySubscriberId, dto.secondaryMsisdn);
    if (existing && existing.verified) {
      throw new BadRequestError(`MSISDN ${dto.secondaryMsisdn} is already linked and verified`);
    }

    let record = existing;
    if (!record) {
      record = await subscriberRepository.createAssociatedAccount({
        primarySubscriberId,
        secondaryMsisdn: dto.secondaryMsisdn,
        relationship: dto.relationship,
        permissions: dto.permissions
      });
    }

    // Trigger OTP verification sent to the secondary MSISDN to ensure ownership permission
    const otpResult = await authService.sendOtp({
      msisdn: dto.secondaryMsisdn,
      purpose: 'LINK_ACCOUNT'
    });

    return {
      associatedAccountId: record.id,
      secondaryMsisdn: record.secondaryMsisdn,
      relationship: record.relationship,
      status: 'PENDING_OTP_VERIFICATION',
      message: `Verification OTP dispatched to secondary number ${dto.secondaryMsisdn}`,
      cooldownSeconds: otpResult.cooldownSeconds,
      debugOtp: otpResult.debugOtp
    };
  }

  async verifyAssociatedAccount(primarySubscriberId: string, dto: VerifyAssociatedAccountDto) {
    const associated = await subscriberRepository.findAssociatedAccountByMsisdn(primarySubscriberId, dto.secondaryMsisdn);
    if (!associated) {
      throw new NotFoundError(`No pending association found for MSISDN ${dto.secondaryMsisdn}`);
    }

    // Verify OTP using authService
    await authService.verifyOtp({
      msisdn: dto.secondaryMsisdn,
      code: dto.otpCode,
      purpose: 'LINK_ACCOUNT'
    });

    await subscriberRepository.verifyAssociatedAccount(associated.id);

    return {
      associatedAccountId: associated.id,
      secondaryMsisdn: associated.secondaryMsisdn,
      status: 'VERIFIED',
      permissions: associated.permissions,
      message: `Account ${dto.secondaryMsisdn} successfully linked and authorized`
    };
  }

  async delinkAssociatedAccount(primarySubscriberId: string, id: string) {
    const deleted = await subscriberRepository.deleteAssociatedAccount(primarySubscriberId, id);
    if (!deleted) {
      throw new NotFoundError('Associated account not found or does not belong to this subscriber');
    }
    return { success: true, message: 'Associated account delinked successfully' };
  }

  async switchAccount(subscriberId: string, dto: SwitchAccountDto) {
    const subscriber = await authRepository.findSubscriberById(subscriberId);
    if (!subscriber) throw new NotFoundError('Subscriber not found');

    if (dto.targetMsisdn === subscriber.msisdn) {
      // Switching back to primary account
      return {
        activeMsisdn: subscriber.msisdn,
        isPrimary: true,
        permissions: ['FULL_ACCESS']
      };
    }

    const associated = await subscriberRepository.findAssociatedAccountByMsisdn(subscriberId, dto.targetMsisdn);
    if (!associated || !associated.verified) {
      throw new ForbiddenError(`Cannot switch context to MSISDN ${dto.targetMsisdn}. Account not verified.`);
    }

    // Issue a scoped switch token for this context
    const switchToken = jwt.sign(
      {
        subscriberId: subscriber.id,
        primaryMsisdn: subscriber.msisdn,
        activeMsisdn: associated.secondaryMsisdn,
        permissions: associated.permissions,
        isContextSwitched: true
      },
      config.JWT_SECRET,
      { expiresIn: '2h' }
    );

    return {
      activeMsisdn: associated.secondaryMsisdn,
      isPrimary: false,
      permissions: associated.permissions,
      contextToken: switchToken
    };
  }
}

export const subscriberService = new SubscriberService();

