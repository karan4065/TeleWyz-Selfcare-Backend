import { BaseAdapter } from '../base.adapter';
import { logger } from '../../core/logger';

export interface DwhEvent {
  eventName: string;
  entityId: string;
  entityType: string;
  timestamp: string;
  payload: Record<string, any>;
}

export interface DwhAdapter {
  publishEvent(event: DwhEvent): Promise<boolean>;
  getPublishedEvents(): DwhEvent[];
}

export class MockDwhAdapter extends BaseAdapter implements DwhAdapter {
  private publishedEvents: DwhEvent[] = [];

  constructor() {
    super('DataWarehouse', 2000);
  }

  async publishEvent(event: DwhEvent): Promise<boolean> {
    return this.executeWithRetry('publishEvent', async () => {
      this.publishedEvents.push(event);
      logger.debug({ eventName: event.eventName, entityId: event.entityId }, 'DWH Event exported');
      return true;
    }, true);
  }

  getPublishedEvents(): DwhEvent[] {
    return [...this.publishedEvents];
  }

  clear(): void {
    this.publishedEvents = [];
  }
}

export const dwhAdapter: DwhAdapter = new MockDwhAdapter();

