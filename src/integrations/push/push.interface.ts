export interface SendPushParams {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface SendPushResult {
  messageId: string;
  success: boolean;
  deviceToken: string;
}

export interface PushAdapter {
  sendPush(params: SendPushParams): Promise<SendPushResult>;
}

