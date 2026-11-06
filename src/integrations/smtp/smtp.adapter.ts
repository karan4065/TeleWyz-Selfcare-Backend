import { BaseAdapter } from '../base.adapter';
import { SmtpAdapter, SendEmailParams, SendEmailResult } from './smtp.interface';
import { v4 as uuidv4 } from 'uuid';

export class MockSmtpAdapter extends BaseAdapter implements SmtpAdapter {
  private sentEmails: SendEmailParams[] = [];

  constructor() {
    super('SmtpMailer', 5000);
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    return this.executeWithRetry('sendEmail', async () => {
      this.sentEmails.push(params);
      return {
        messageId: `EMAIL-${uuidv4()}`,
        status: 'SENT',
        to: params.to,
        timestamp: new Date().toISOString()
      };
    }, true);
  }

  getSentEmails(): SendEmailParams[] {
    return [...this.sentEmails];
  }

  clear(): void {
    this.sentEmails = [];
  }
}

export const smtpAdapter: SmtpAdapter = new MockSmtpAdapter();

