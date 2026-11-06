import { BaseAdapter } from '../base.adapter';
import { PushAdapter, SendPushParams, SendPushResult } from './push.interface';
import { v4 as uuidv4 } from 'uuid';

export class MockPushAdapter extends BaseAdapter implements PushAdapter {
  constructor() {
    super('FirebaseCloudMessaging', 4000);
  }

  async sendPush(params: SendPushParams): Promise<SendPushResult> {
    return this.executeWithRetry('sendPush', async () => {
      return {
        messageId: `FCM-${uuidv4()}`,
        success: true,
        deviceToken: params.deviceToken
      };
    }, true);
  }
}

export const pushAdapter: PushAdapter = new MockPushAdapter();

