import { BaseAdapter } from '../base.adapter';

export interface DealerStore {
  storeId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  latitude: number;
  longitude: number;
  openingHours: string;
  services: string[];
}

export interface DmpAdapter {
  getStores(city?: string): Promise<DealerStore[]>;
  validateAgent(agentCode: string): Promise<{ valid: boolean; agentName: string; region: string }>;
}

export class MockDmpAdapter extends BaseAdapter implements DmpAdapter {
  private stores: DealerStore[] = [
    {
      storeId: 'STR-LAG-01',
      name: 'TeleWyz Flagship Experience Center',
      address: 'Plot 12, Adeola Odeku St, Victoria Island',
      city: 'Lagos',
      state: 'Lagos',
      phone: '+2348010000001',
      latitude: 6.4281,
      longitude: 3.4219,
      openingHours: 'Mon-Sat 8:00 AM - 6:00 PM',
      services: ['SIM_REPLACEMENT', 'ESIM_ACTIVATION', 'BILL_PAYMENT', 'DEVICE_SALES', 'NIMC_KYC']
    },
    {
      storeId: 'STR-ABJ-01',
      name: 'TeleWyz Central Business District Store',
      address: 'Central Plaza, Shehu Shagari Way',
      city: 'Abuja',
      state: 'FCT',
      phone: '+2348010000002',
      latitude: 9.0579,
      longitude: 7.4951,
      openingHours: 'Mon-Sat 8:30 AM - 5:30 PM',
      services: ['SIM_REPLACEMENT', 'ESIM_ACTIVATION', 'BILL_PAYMENT', 'NIMC_KYC']
    },
    {
      storeId: 'STR-PHC-01',
      name: 'TeleWyz Port Harcourt Store',
      address: '24 Aba Road, Port Harcourt',
      city: 'Port Harcourt',
      state: 'Rivers',
      phone: '+2348010000003',
      latitude: 4.8156,
      longitude: 7.0498,
      openingHours: 'Mon-Sat 8:00 AM - 5:00 PM',
      services: ['SIM_REPLACEMENT', 'ESIM_ACTIVATION', 'BILL_PAYMENT']
    }
  ];

  constructor() {
    super('DealerManagementPlatform', 3000);
  }

  async getStores(city?: string): Promise<DealerStore[]> {
    return this.executeWithRetry('getStores', async () => {
      if (city) {
        return this.stores.filter(s => s.city.toLowerCase() === city.toLowerCase());
      }
      return this.stores;
    }, true);
  }

  async validateAgent(agentCode: string) {
    return this.executeWithRetry('validateAgent', async () => {
      if (agentCode === 'INVALID-AGENT') {
        return { valid: false, agentName: '', region: '' };
      }
      return {
        valid: true,
        agentName: 'Authorized Retail Partner - SmartComms',
        region: 'Lagos Island'
      };
    }, true);
  }
}

export const dmpAdapter: DmpAdapter = new MockDmpAdapter();

