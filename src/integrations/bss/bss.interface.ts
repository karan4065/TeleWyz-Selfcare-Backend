export interface TelecomBalance {
  msisdn: string;
  accountType: 'PREPAID' | 'POSTPAID';
  prepaidBalance?: {
    amount: number;
    currency: string;
    expiryDate: string;
  };
  postpaidBilling?: {
    unbilledAmount: number;
    lastBilledAmount: number;
    currency: string;
    dueDate: string;
    creditLimit: number;
  };
}

export interface TelecomUsage {
  msisdn: string;
  data: {
    totalBytes: number;
    usedBytes: number;
    remainingBytes: number;
    formattedRemaining: string; // e.g. "12.4 GB"
    expiryDate: string;
  };
  voice: {
    totalSeconds: number;
    usedSeconds: number;
    remainingSeconds: number;
    formattedRemaining: string; // e.g. "145 mins"
    expiryDate: string;
  };
  sms: {
    totalCount: number;
    usedCount: number;
    remainingCount: number;
    formattedRemaining: string; // e.g. "80 SMS"
    expiryDate: string;
  };
}

export interface ProvisionSimResult {
  msisdn: string;
  iccid: string;
  simType: 'PHYSICAL' | 'ESIM';
  status: 'PROVISIONED' | 'PENDING' | 'FAILED';
  networkReference: string;
  activationDate: string;
}

export interface BssAdapter {
  getBalances(msisdn: string): Promise<TelecomBalance>;
  getUsage(msisdn: string): Promise<TelecomUsage>;
  provisionSim(msisdn: string, iccid: string, simType: 'PHYSICAL' | 'ESIM'): Promise<ProvisionSimResult>;
  activatePackage(msisdn: string, packageId: string): Promise<{ success: boolean; expiryDate: string; transactionReference: string }>;
  topupPrepaidBalance(msisdn: string, amount: number, paymentRef: string): Promise<{ newBalance: number; currency: string; transactionReference: string }>;
}

