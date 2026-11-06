import { paymentRepository, PaymentTransactionRecord } from './payment.repository';
import { paymentAdapter } from '../../integrations/payment/payment.adapter';
import { bssAdapter } from '../../integrations/bss/bss.adapter';
import { smsAdapter } from '../../integrations/sms/sms.adapter';
import { smtpAdapter } from '../../integrations/smtp/smtp.adapter';
import { BadRequestError, NotFoundError } from '../../core/errors';
import { InitiateRechargeDto, PayPostpaidBillDto } from './payment.dto';
import { logger } from '../../core/logger';

export class PaymentService {
  getRechargeCatalogue() {
    return {
      airtimeDenominations: [
        { amount: 100, bonusPercentage: 0, label: '₦100' },
        { amount: 200, bonusPercentage: 0, label: '₦200' },
        { amount: 500, bonusPercentage: 10, label: '₦500 (+10% Bonus)' },
        { amount: 1000, bonusPercentage: 15, label: '₦1,000 (+15% Bonus)' },
        { amount: 2000, bonusPercentage: 20, label: '₦2,000 (+20% Bonus)' },
        { amount: 5000, bonusPercentage: 25, label: '₦5,000 (+25% Bonus)' }
      ],
      quickDataRecharges: [
        { code: 'DATA_1GB_1D', name: '1GB Daily', amount: 300, validity: '1 Day' },
        { code: 'DATA_3GB_7D', name: '3GB Weekly', amount: 1000, validity: '7 Days' },
        { code: 'DATA_10GB_30D', name: '10GB Monthly', amount: 3000, validity: '30 Days' },
        { code: 'DATA_40GB_30D', name: '40GB Super Monthly', amount: 10000, validity: '30 Days' }
      ]
    };
  }

  async getCurrentPostpaidBill(msisdn: string) {
    const balances = await bssAdapter.getBalances(msisdn);
    if (balances.accountType !== 'POSTPAID' || !balances.postpaidBilling) {
      throw new BadRequestError(`MSISDN ${msisdn} is not a postpaid subscriber account`);
    }

    return {
      msisdn,
      accountType: 'POSTPAID',
      unbilledAmount: balances.postpaidBilling.unbilledAmount,
      lastBilledAmount: balances.postpaidBilling.lastBilledAmount,
      currency: balances.postpaidBilling.currency,
      dueDate: balances.postpaidBilling.dueDate,
      creditLimit: balances.postpaidBilling.creditLimit,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`
    };
  }

  async initiateRecharge(dto: InitiateRechargeDto, subscriberId?: string, idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing = await paymentRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) return existing;
    }

    const transactionId = `TX-RECH-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const gwResult = await paymentAdapter.initiatePayment({
      transactionId,
      amount: dto.amount,
      currency: 'NGN',
      msisdn: dto.msisdn,
      paymentMethod: dto.paymentMethod,
      description: `TeleWyz ${dto.rechargeType} Recharge for ${dto.msisdn}`,
      callbackUrl: dto.callbackUrl,
      idempotencyKey
    });

    const tx = await paymentRepository.createTransaction({
      transactionId,
      msisdn: dto.msisdn,
      amount: dto.amount,
      currency: 'NGN',
      paymentMethod: dto.paymentMethod,
      type: 'RECHARGE',
      status: 'PENDING',
      gatewayReference: gwResult.gatewayReference,
      idempotencyKey: idempotencyKey || null
    });

    return {
      transactionId: tx.transactionId,
      gatewayReference: gwResult.gatewayReference,
      checkoutUrl: gwResult.checkoutUrl,
      amount: tx.amount,
      currency: tx.currency,
      status: tx.status
    };
  }

  async payPostpaidBill(dto: PayPostpaidBillDto, subscriberId?: string, idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing = await paymentRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) return existing;
    }

    const transactionId = `TX-BILL-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const gwResult = await paymentAdapter.initiatePayment({
      transactionId,
      amount: dto.amount,
      currency: 'NGN',
      msisdn: dto.msisdn,
      paymentMethod: dto.paymentMethod,
      description: `Postpaid Bill Settlement for ${dto.msisdn}`,
      callbackUrl: dto.callbackUrl,
      idempotencyKey
    });

    const tx = await paymentRepository.createTransaction({
      transactionId,
      msisdn: dto.msisdn,
      amount: dto.amount,
      currency: 'NGN',
      paymentMethod: dto.paymentMethod,
      type: 'BILL_PAYMENT',
      status: 'PENDING',
      gatewayReference: gwResult.gatewayReference,
      idempotencyKey: idempotencyKey || null
    });

    return {
      transactionId: tx.transactionId,
      gatewayReference: gwResult.gatewayReference,
      checkoutUrl: gwResult.checkoutUrl,
      amount: tx.amount,
      currency: tx.currency,
      status: tx.status
    };
  }

  async verifyPayment(refOrTxId: string): Promise<PaymentTransactionRecord> {
    let tx = await paymentRepository.findByGatewayRef(refOrTxId);
    if (!tx) {
      tx = await paymentRepository.findByTransactionId(refOrTxId);
    }
    if (!tx) {
      throw new NotFoundError(`Transaction reference '${refOrTxId}' not found`);
    }

    // If already verified, return idempotent result without double-crediting
    if (tx.status === 'SUCCESS') {
      return tx;
    }

    // Always query authoritative payment provider directly
    const verification = await paymentAdapter.verifyPayment(tx.gatewayReference || refOrTxId);

    if (verification.status === 'SUCCESS') {
      const updated = await paymentRepository.updateTransactionStatus(tx.id, 'SUCCESS');

      if (tx.type === 'RECHARGE') {
        // Authoritative balance topup in BSS
        await bssAdapter.topupPrepaidBalance(tx.msisdn, tx.amount, tx.transactionId);

        // Record recharge
        await paymentRepository.createRechargeRecord({
          transactionId: tx.transactionId,
          msisdn: tx.msisdn,
          amount: tx.amount,
          rechargeType: 'AIRTIME',
          status: 'SUCCESS'
        });

        // Dispatch SMS receipt
        smsAdapter.sendSms({
          to: tx.msisdn,
          message: `Recharge successful! ₦${tx.amount.toLocaleString()} has been credited to ${tx.msisdn}. Ref: ${tx.transactionId}`
        }).catch(err => logger.warn({ err }, 'Failed to send recharge SMS'));
      } else if (tx.type === 'BILL_PAYMENT') {
        smsAdapter.sendSms({
          to: tx.msisdn,
          message: `Postpaid bill payment of ₦${tx.amount.toLocaleString()} received. Thank you! Ref: ${tx.transactionId}`
        }).catch(err => logger.warn({ err }, 'Failed to send bill payment SMS'));
      }

      return updated;
    } else if (verification.status === 'FAILED') {
      return paymentRepository.updateTransactionStatus(
        tx.id,
        'FAILED',
        undefined,
        verification.failureReason || 'Payment declined by financial institution'
      );
    }

    return tx;
  }

  async handleWebhook(payload: any) {
    const reference = payload.reference || payload.gatewayReference;
    if (!reference) {
      throw new BadRequestError('Webhook payload missing reference');
    }
    return this.verifyPayment(reference);
  }

  async getTransactionHistory(msisdn: string) {
    return paymentRepository.findTransactionsByMsisdn(msisdn);
  }

  async getRechargeHistory(msisdn: string) {
    return paymentRepository.findRechargesByMsisdn(msisdn);
  }
}

export const paymentService = new PaymentService();

