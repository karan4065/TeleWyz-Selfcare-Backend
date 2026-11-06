import { BaseAdapter } from '../base.adapter';
import { SmsAdapter, SendSmsParams, SendSmsResult } from './sms.interface';
import { v4 as uuidv4 } from 'uuid';

export class MockSmsAdapter extends BaseAdapter implements SmsAdapter {
  private sentMessages: SendSmsParams[] = [];

  constructor() {
    super('SmsGateway', 3000);
  }

  async sendSms(params: SendSmsParams): Promise<SendSmsResult> {
    return this.executeWithRetry('sendSms', async () => {
      this.sentMessages.push(params);
      return {
        messageId: `SMS-${uuidv4()}`,
        status: 'SENT',
        to: params.to,
        timestamp: new Date().toISOString()
      };
    }, true);
  }

  getSentMessages(): SendSmsParams[] {
    return [...this.sentMessages];
  }

  clear(): void {
    this.sentMessages = [];
  }
}

export const smsAdapter: SmsAdapter = new MockSmsAdapter();

