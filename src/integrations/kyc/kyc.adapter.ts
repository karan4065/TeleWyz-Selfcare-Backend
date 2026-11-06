import { BaseAdapter } from '../base.adapter';
import { KycAdapter, NinVerificationParams, NinVerificationResult, BiometricMatchResult } from './kyc.interface';
import { v4 as uuidv4 } from 'uuid';

export class MockKycAdapter extends BaseAdapter implements KycAdapter {
  constructor() {
    super('NIMC/NCC-KYC', 4000);
  }

  async verifyNin(params: NinVerificationParams): Promise<NinVerificationResult> {
    return this.executeWithRetry('verifyNin', async () => {
      // Deterministic test rejections
      if (params.nin.startsWith('000') || params.nin.startsWith('111')) {
        return {
          verified: false,
          kycReference: `NIMC-REJ-${Date.now()}`,
          matchScore: 32,
          rejectionReason: 'Name and date of birth do not match NIMC registry'
        };
      }

      if (params.nin.length !== 11) {
        return {
          verified: false,
          kycReference: `NIMC-INV-${Date.now()}`,
          matchScore: 0,
          rejectionReason: 'Invalid National Identity Number length (must be 11 digits)'
        };
      }

      return {
        verified: true,
        kycReference: `NIMC-VER-${uuidv4().substring(0, 8).toUpperCase()}`,
        matchScore: 98,
        nimcData: {
          firstName: params.firstName,
          lastName: params.lastName,
          nin: params.nin,
          photoHash: 'hash-nimc-biometric-token'
        }
      };
    }, true);
  }

  async verifyBiometrics(nin: string, livePhotoBase64?: string): Promise<BiometricMatchResult> {
    return this.executeWithRetry('verifyBiometrics', async () => {
      if (livePhotoBase64 === 'fail-liveness') {
        return {
          matched: false,
          confidenceScore: 40,
          livenessPassed: false
        };
      }

      return {
        matched: true,
        confidenceScore: 99.4,
        livenessPassed: true
      };
    }, true);
  }
}

export const kycAdapter: KycAdapter = new MockKycAdapter();

