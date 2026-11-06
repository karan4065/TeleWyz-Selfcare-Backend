import { BaseAdapter } from '../base.adapter';

export interface PersonalizedOffer {
  offerId: string;
  title: string;
  description: string;
  category: 'DATA' | 'VOICE' | 'COMBO' | 'DEVICE';
  price: number;
  discountPercentage: number;
  validityDays: number;
  dataAllowanceBytes?: number;
  voiceSeconds?: number;
  eligibilityExpiry: string;
}

export interface CvmAdapter {
  getPersonalizedOffers(msisdn: string): Promise<PersonalizedOffer[]>;
}

export class MockCvmAdapter extends BaseAdapter implements CvmAdapter {
  constructor() {
    super('CustomerValueManagement', 3000);
  }

  async getPersonalizedOffers(msisdn: string): Promise<PersonalizedOffer[]> {
    return this.executeWithRetry('getPersonalizedOffers', async () => {
      const expiry = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
      return [
        {
          offerId: 'CVM-OFFER-D1',
          title: 'Special Weekend 10GB Data Blast',
          description: 'Tailored for your heavy weekend streaming. 10GB high-speed data for 3 days.',
          category: 'DATA',
          price: 1500,
          discountPercentage: 25,
          validityDays: 3,
          dataAllowanceBytes: 10737418240,
          eligibilityExpiry: expiry
        },
        {
          offerId: 'CVM-OFFER-C1',
          title: 'Loyalty Combo: 5GB + 100 All-Net Mins',
          description: 'Personalized voice and data mix for loyal TeleWyz subscribers.',
          category: 'COMBO',
          price: 2000,
          discountPercentage: 20,
          validityDays: 14,
          dataAllowanceBytes: 5368709120,
          voiceSeconds: 6000,
          eligibilityExpiry: expiry
        }
      ];
    }, true);
  }
}

export const cvmAdapter: CvmAdapter = new MockCvmAdapter();

