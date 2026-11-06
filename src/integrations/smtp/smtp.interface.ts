export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  attachments?: Array<{ filename: string; content: string }>;
}

export interface SendEmailResult {
  messageId: string;
  status: 'SENT' | 'FAILED';
  to: string;
  timestamp: string;
}

export interface SmtpAdapter {
  sendEmail(params: SendEmailParams): Promise<SendEmailResult>;
  getSentEmails(): SendEmailParams[];
}

