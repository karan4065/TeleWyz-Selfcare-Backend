import { BaseAdapter } from '../base.adapter';
import { BssAdapter, TelecomBalance, TelecomUsage, ProvisionSimResult } from './bss.interface';
import { v4 as uuidv4 } from 'uuid';

export class MockBssAdapter extends BaseAdapter implements BssAdapter {
  constructor() {
    super('BSS/Optiva-EPC', 3000);
  }

  async getBalances(msisdn: string): Promise<TelecomBalance> {
    return this.executeWithRetry('getBalances', async () => {
      // 2348099999999 is mock postpaid account
      if (msisdn === '2348099999999') {
        return {
          msisdn,
          accountType: 'POSTPAID',
          postpaidBilling: {
            unbilledAmount: 14250.0,
            lastBilledAmount: 18000.0,
            currency: 'NGN',
            dueDate: new Date(Date.now() + 15 * 86400 * 1000).toISOString(),
            creditLimit: 50000.0
          }
        };
      }

      // Default mock prepaid account
      return {
        msisdn,
        accountType: 'PREPAID',
        prepaidBalance: {
          amount: 2850.5,
          currency: 'NGN',
          expiryDate: new Date(Date.now() + 60 * 86400 * 1000).toISOString()
        }
      };
    });
  }

  async getUsage(msisdn: string): Promise<TelecomUsage> {
    return this.executeWithRetry('getUsage', async () => {
      const expiry = new Date(Date.now() + 20 * 86400 * 1000).toISOString();
      return {
        msisdn,
        data: {
          totalBytes: 21474836480, // 20 GB
          usedBytes: 8589934592,   // 8 GB
          remainingBytes: 12884901888, // 12 GB
          formattedRemaining: '12.0 GB',
          expiryDate: expiry
        },
        voice: {
          totalSeconds: 18000, // 300 mins
          usedSeconds: 7200,   // 120 mins
          remainingSeconds: 10800, // 180 mins
          formattedRemaining: '180 Mins',
          expiryDate: expiry
        },
        sms: {
          totalCount: 100,
          usedCount: 22,
          remainingCount: 78,
          formattedRemaining: '78 SMS',
          expiryDate: expiry
        }
      };
    });
  }

  async provisionSim(msisdn: string, iccid: string, simType: 'PHYSICAL' | 'ESIM'): Promise<ProvisionSimResult> {
    return this.executeWithRetry('provisionSim', async () => {
      return {
        msisdn,
        iccid,
        simType,
        status: 'PROVISIONED',
        networkReference: `BSS-HLR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        activationDate: new Date().toISOString()
      };
    }, false);
  }

  async activatePackage(msisdn: string, packageId: string): Promise<{ success: boolean; expiryDate: string; transactionReference: string }> {
    return this.executeWithRetry('activatePackage', async () => {
      return {
        success: true,
        expiryDate: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
        transactionReference: `OPTIVA-ACT-${uuidv4().substring(0, 8).toUpperCase()}`
      };
    }, false);
  }

  async topupPrepaidBalance(msisdn: string, amount: number, paymentRef: string): Promise<{ newBalance: number; currency: string; transactionReference: string }> {
    return this.executeWithRetry('topupPrepaidBalance', async () => {
      return {
        newBalance: 2850.5 + amount,
        currency: 'NGN',
        transactionReference: `BSS-RECH-${paymentRef}-${Date.now()}`
      };
    }, false);
  }
}

export const bssAdapter: BssAdapter = new MockBssAdapter();

