export interface SendSmsParams {
  to: string;
  message: string;
  templateId?: string;
  senderId?: string;
}

export interface SendSmsResult {
  messageId: string;
  status: 'SENT' | 'QUEUED' | 'FAILED';
  to: string;
  timestamp: string;
}

export interface SmsAdapter {
  sendSms(params: SendSmsParams): Promise<SendSmsResult>;
  getSentMessages(): SendSmsParams[];
}

