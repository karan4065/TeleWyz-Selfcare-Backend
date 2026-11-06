export interface NinVerificationParams {
  nin: string;
  msisdn: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
}

export interface NinVerificationResult {
  verified: boolean;
  kycReference: string;
  matchScore: number;
  nimcData?: {
    firstName: string;
    lastName: string;
    nin: string;
    photoHash?: string;
  };
  rejectionReason?: string;
}

export interface BiometricMatchResult {
  matched: boolean;
  confidenceScore: number;
  livenessPassed: boolean;
}

export interface KycAdapter {
  verifyNin(params: NinVerificationParams): Promise<NinVerificationResult>;
  verifyBiometrics(nin: string, livePhotoBase64?: string): Promise<BiometricMatchResult>;
}

