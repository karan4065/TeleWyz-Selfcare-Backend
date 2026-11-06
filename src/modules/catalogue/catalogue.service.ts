import { TELECOM_PLANS, TELECOM_BUNDLES, TelecomPlan, TelecomBundle } from './catalogue.data';
import { catalogueRepository, SubscriptionRecord } from './catalogue.repository';
import { authRepository } from '../auth/auth.repository';
import { bssAdapter } from '../../integrations/bss/bss.adapter';
import { cvmAdapter } from '../../integrations/cvm/cvm.adapter';
import { smsAdapter } from '../../integrations/sms/sms.adapter';
import { cacheService } from '../../database/redis';
import { BadRequestError, NotFoundError } from '../../core/errors';
import { SubscribeDto } from './catalogue.dto';
import { logger } from '../../core/logger';

const CATALOGUE_CACHE_KEY = 'catalogue:plans';

export class CatalogueService {
  async listPlans(type?: 'PREPAID' | 'POSTPAID', category?: string): Promise<TelecomPlan[]> {
    // Check cache
    const cacheKey = `${CATALOGUE_CACHE_KEY}:${type || 'ALL'}:${category || 'ALL'}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let plans = TELECOM_PLANS.filter(p => p.isActive);

    if (type) {
      plans = plans.filter(p => p.type === type);
    }

    if (category) {
      plans = plans.filter(p => p.category === category);
    }

    // Cache catalogue for 1 hour
    await cacheService.set(cacheKey, JSON.stringify(plans), 3600);

    return plans;
  }

  async getPlanDetails(planId: string): Promise<TelecomPlan> {
    const plan = TELECOM_PLANS.find(p => p.id === planId || p.code === planId);
    if (!plan || !plan.isActive) {
      throw new NotFoundError(`Plan with identifier '${planId}' not found`);
    }
    return plan;
  }

  async listPackages(category?: string): Promise<TelecomBundle[]> {
    let bundles = TELECOM_BUNDLES.filter(b => b.isActive);
    if (category) {
      bundles = bundles.filter(b => b.category === category);
    }
    return bundles;
  }

  async listEligibleOffers(subscriberId: string) {
    const subscriber = await authRepository.findSubscriberById(subscriberId);
    if (!subscriber) throw new NotFoundError('Subscriber not found');

    return cvmAdapter.getPersonalizedOffers(subscriber.msisdn);
  }

  async subscribe(subscriberId: string, dto: SubscribeDto) {
    const subscriber = await authRepository.findSubscriberById(subscriberId);
    if (!subscriber) throw new NotFoundError('Subscriber not found');

    let item: TelecomPlan | TelecomBundle | undefined;
    let itemName: string;
    let itemPrice: number;
    let validityDays: number;

    if (dto.itemType === 'PLAN') {
      const plan = TELECOM_PLANS.find(p => p.id === dto.itemId || p.code === dto.itemId);
      if (!plan) throw new NotFoundError(`Plan '${dto.itemId}' not found`);

      // Rule: Prepaid subscribers cannot directly subscribe to postpaid plans
      if (subscriber.accountType === 'PREPAID' && plan.type === 'POSTPAID') {
        throw new BadRequestError('Prepaid subscribers cannot subscribe to postpaid contract plans. Please apply for postpaid migration.');
      }

      item = plan;
      itemName = plan.name;
      itemPrice = plan.price;
      validityDays = plan.validityDays;
    } else {
      const bundle = TELECOM_BUNDLES.find(b => b.id === dto.itemId || b.code === dto.itemId);
      if (!bundle) throw new NotFoundError(`Bundle '${dto.itemId}' not found`);

      item = bundle;
      itemName = bundle.name;
      itemPrice = bundle.price;
      validityDays = bundle.validityDays;
    }

    // Eligibility & authoritative telecom balance check against BSS
    const balances = await bssAdapter.getBalances(subscriber.msisdn);

    if (subscriber.accountType === 'PREPAID') {
      const currentBalance = balances.prepaidBalance?.amount || 0;
      if (currentBalance < itemPrice) {
        throw new BadRequestError(
          `Insufficient prepaid airtime balance. Required: ₦${itemPrice.toLocaleString()}, Available: ₦${currentBalance.toLocaleString()}. Please recharge.`
        );
      }
    } else if (subscriber.accountType === 'POSTPAID') {
      const billing = balances.postpaidBilling;
      if (billing && (billing.unbilledAmount + itemPrice > billing.creditLimit)) {
        throw new BadRequestError(`Subscription exceeds your approved credit limit of ₦${billing.creditLimit.toLocaleString()}`);
      }
    }

    // Execute authoritative activation in BSS
    const bssActivation = await bssAdapter.activatePackage(subscriber.msisdn, dto.itemId);

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + validityDays * 86400 * 1000);

    // Save record locally
    const record = await catalogueRepository.createSubscription({
      subscriberId: subscriber.id,
      msisdn: subscriber.msisdn,
      planOrBundleId: dto.itemId,
      name: itemName,
      type: dto.itemType,
      status: 'ACTIVE',
      startDate,
      endDate,
      autoRenew: dto.autoRenew,
      price: itemPrice,
      currency: 'NGN'
    });

    // Send SMS confirmation asynchronously
    smsAdapter.sendSms({
      to: subscriber.msisdn,
      message: `You have successfully subscribed to ${itemName}. Valid until ${endDate.toDateString()}. Ref: ${bssActivation.transactionReference}`
    }).catch(err => logger.warn({ err }, 'Failed to dispatch subscription confirmation SMS'));

    return {
      subscriptionId: record.id,
      name: itemName,
      type: dto.itemType,
      status: 'ACTIVE',
      startDate: record.startDate,
      endDate: record.endDate,
      autoRenew: record.autoRenew,
      price: itemPrice,
      currency: 'NGN',
      networkTransactionRef: bssActivation.transactionReference
    };
  }

  async unsubscribe(subscriberId: string, subscriptionId: string) {
    const sub = await catalogueRepository.findSubscriptionById(subscriptionId);
    if (!sub || sub.subscriberId !== subscriberId) {
      throw new NotFoundError('Subscription record not found or does not belong to this subscriber');
    }

    if (sub.status !== 'ACTIVE') {
      throw new BadRequestError(`Subscription is already ${sub.status}`);
    }

    await catalogueRepository.updateSubscriptionStatus(subscriptionId, 'CANCELLED');

    return {
      subscriptionId,
      status: 'CANCELLED',
      message: `Successfully unsubscribed from ${sub.name}`
    };
  }

  async getSubscriptions(subscriberId: string): Promise<SubscriptionRecord[]> {
    return catalogueRepository.findSubscriptionsBySubscriber(subscriberId);
  }
}

export const catalogueService = new CatalogueService();

