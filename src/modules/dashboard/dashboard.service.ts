import { authRepository } from '../auth/auth.repository';
import { bssAdapter } from '../../integrations/bss/bss.adapter';
import { cvmAdapter } from '../../integrations/cvm/cvm.adapter';
import { NotFoundError } from '../../core/errors';

export class DashboardService {
  async getDashboardSummary(subscriberId: string) {
    const subscriber = await authRepository.findSubscriberById(subscriberId);
    if (!subscriber) {
      throw new NotFoundError('Subscriber not found');
    }

    // Call authoritative external systems in parallel for sub-millisecond response time
    const [balances, usage, promotions] = await Promise.all([
      bssAdapter.getBalances(subscriber.msisdn),
      bssAdapter.getUsage(subscriber.msisdn),
      cvmAdapter.getPersonalizedOffers(subscriber.msisdn)
    ]);

    // Calculate usage percentages
    const dataPercentUsed = Math.round((usage.data.usedBytes / usage.data.totalBytes) * 100);
    const voicePercentUsed = Math.round((usage.voice.usedSeconds / usage.voice.totalSeconds) * 100);
    const smsPercentUsed = Math.round((usage.sms.usedCount / usage.sms.totalCount) * 100);

    return {
      subscriber: {
        id: subscriber.id,
        name: `${subscriber.firstName} ${subscriber.lastName}`,
        msisdn: subscriber.msisdn,
        accountType: subscriber.accountType,
        status: subscriber.status,
        loyaltyPoints: subscriber.loyaltyPoints
      },
      currentPlan: {
        name: subscriber.accountType === 'POSTPAID' ? 'TeleWyz Enterprise Postpaid' : 'TeleWyz Smart Monthly 20GB',
        category: subscriber.accountType,
        expiryDate: usage.data.expiryDate,
        status: 'ACTIVE'
      },
      billingAndBalance: subscriber.accountType === 'POSTPAID' ? balances.postpaidBilling : balances.prepaidBalance,
      meters: {
        data: {
          remaining: usage.data.formattedRemaining,
          remainingBytes: usage.data.remainingBytes,
          totalBytes: usage.data.totalBytes,
          percentUsed: dataPercentUsed,
          expiryDate: usage.data.expiryDate
        },
        voice: {
          remaining: usage.voice.formattedRemaining,
          remainingSeconds: usage.voice.remainingSeconds,
          totalSeconds: usage.voice.totalSeconds,
          percentUsed: voicePercentUsed,
          expiryDate: usage.voice.expiryDate
        },
        sms: {
          remaining: usage.sms.formattedRemaining,
          remainingCount: usage.sms.remainingCount,
          totalCount: usage.sms.totalCount,
          percentUsed: smsPercentUsed,
          expiryDate: usage.sms.expiryDate
        }
      },
      promotions: promotions.slice(0, 3) // Top 3 eligible promotional offers
    };
  }
}

export const dashboardService = new DashboardService();

