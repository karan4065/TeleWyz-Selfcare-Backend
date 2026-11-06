import { BaseAdapter } from '../base.adapter';
import { v4 as uuidv4 } from 'uuid';

export interface DispatchParams {
  orderNumber: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  itemType: 'PHYSICAL_SIM' | 'DEVICE';
}

export interface DispatchResult {
  trackingNumber: string;
  courier: string;
  estimatedDeliveryDate: string;
  status: 'DISPATCHED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
}

export interface LogisticsAdapter {
  createDispatch(params: DispatchParams): Promise<DispatchResult>;
  getTrackingStatus(trackingNumber: string): Promise<DispatchResult & { timeline: Array<{ status: string; timestamp: string; location: string }> }>;
}

export class MockLogisticsAdapter extends BaseAdapter implements LogisticsAdapter {
  constructor() {
    super('LogisticsPlatform', 3000);
  }

  async createDispatch(params: DispatchParams): Promise<DispatchResult> {
    return this.executeWithRetry('createDispatch', async () => {
      const trackingNumber = `TLWZ-EXP-${uuidv4().substring(0, 8).toUpperCase()}`;
      return {
        trackingNumber,
        courier: 'TeleWyz Express Delivery',
        estimatedDeliveryDate: new Date(Date.now() + 2 * 86400 * 1000).toISOString(),
        status: 'DISPATCHED'
      };
    }, false);
  }

  async getTrackingStatus(trackingNumber: string) {
    return this.executeWithRetry('getTrackingStatus', async () => {
      return {
        trackingNumber,
        courier: 'TeleWyz Express Delivery',
        estimatedDeliveryDate: new Date(Date.now() + 86400 * 1000).toISOString(),
        status: 'IN_TRANSIT' as const,
        timeline: [
          { status: 'Order Dispatched from Fulfillment Center', timestamp: new Date(Date.now() - 3600 * 1000).toISOString(), location: 'Central Hub, Lagos' },
          { status: 'Package Processed at Sort Facility', timestamp: new Date().toISOString(), location: 'Ikeja Distribution Center' }
        ]
      };
    }, true);
  }
}

export const logisticsAdapter: LogisticsAdapter = new MockLogisticsAdapter();

