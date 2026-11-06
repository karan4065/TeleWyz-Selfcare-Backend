export interface TelecomPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  type: 'PREPAID' | 'POSTPAID';
  category: 'VOICE_DATA' | 'DATA_ONLY' | 'UNLIMITED';
  price: number;
  currency: string;
  validityDays: number;
  dataAllowanceBytes: number;
  voiceSeconds: number;
  smsCount: number;
  features: string[];
  isActive: boolean;
}

export interface TelecomBundle {
  id: string;
  code: string;
  name: string;
  description: string;
  category: 'DATA_BOOSTER' | 'VOICE_BOOSTER' | 'ROAMING' | 'INTERNATIONAL';
  price: number;
  currency: string;
  validityDays: number;
  dataAllowanceBytes?: number;
  voiceSeconds?: number;
  smsCount?: number;
  features: string[];
  isActive: boolean;
}

export const TELECOM_PLANS: TelecomPlan[] = [
  {
    id: 'PLAN-PRE-01',
    code: 'SMART_DAILY',
    name: 'Smart Daily 500MB',
    description: 'Instant high-speed 4G/5G data for daily usage',
    type: 'PREPAID',
    category: 'DATA_ONLY',
    price: 200,
    currency: 'NGN',
    validityDays: 1,
    dataAllowanceBytes: 524288000,
    voiceSeconds: 0,
    smsCount: 10,
    features: ['Instant Activation', 'Roll-over on daily renewal'],
    isActive: true
  },
  {
    id: 'PLAN-PRE-02',
    code: 'SMART_WEEKLY_3GB',
    name: 'Smart Weekly 3GB Combo',
    description: '3GB data + 60 minutes all-net voice calls for 7 days',
    type: 'PREPAID',
    category: 'VOICE_DATA',
    price: 1000,
    currency: 'NGN',
    validityDays: 7,
    dataAllowanceBytes: 3221225472,
    voiceSeconds: 3600,
    smsCount: 50,
    features: ['7-Day Validity', 'Free night browsing (12AM - 5AM)'],
    isActive: true
  },
  {
    id: 'PLAN-PRE-03',
    code: 'SMART_MONTHLY_20GB',
    name: 'Smart Monthly 20GB Power Bundle',
    description: 'Our most popular monthly prepaid data & voice plan',
    type: 'PREPAID',
    category: 'VOICE_DATA',
    price: 3500,
    currency: 'NGN',
    validityDays: 30,
    dataAllowanceBytes: 21474836480,
    voiceSeconds: 10800,
    smsCount: 100,
    features: ['30-Day Validity', 'Data rollover', 'Free YouTube streaming 11PM-6AM'],
    isActive: true
  },
  {
    id: 'PLAN-POST-01',
    code: 'POSTPAID_ESSENTIAL',
    name: 'TeleWyz Postpaid Essential',
    description: 'Worry-free monthly billing with 40GB data & unlimited on-net voice',
    type: 'POSTPAID',
    category: 'VOICE_DATA',
    price: 12000,
    currency: 'NGN',
    validityDays: 30,
    dataAllowanceBytes: 42949672960,
    voiceSeconds: 36000,
    smsCount: 500,
    features: ['Monthly consolidated invoicing', 'Priority VIP network QOS', 'eSIM support included'],
    isActive: true
  },
  {
    id: 'PLAN-POST-02',
    code: 'POSTPAID_ENTERPRISE_UNLIMITED',
    name: 'TeleWyz Enterprise Unlimited',
    description: 'Truly unlimited 5G high-speed connectivity with international roaming pack',
    type: 'POSTPAID',
    category: 'UNLIMITED',
    price: 30000,
    currency: 'NGN',
    validityDays: 30,
    dataAllowanceBytes: 1073741824000, // 1TB
    voiceSeconds: 180000,
    smsCount: 2000,
    features: ['Unlimited 5G Data', 'Dedicated Account Manager', 'Free 10GB Roaming in 45 countries'],
    isActive: true
  }
];

export const TELECOM_BUNDLES: TelecomBundle[] = [
  {
    id: 'BND-DATA-01',
    code: 'DATA_BOOSTER_5GB',
    name: '5GB Data Top-Up Booster',
    description: 'Add 5GB immediately to your current active data bundle',
    category: 'DATA_BOOSTER',
    price: 1500,
    currency: 'NGN',
    validityDays: 14,
    dataAllowanceBytes: 5368709120,
    features: ['Ties into existing plan validity'],
    isActive: true
  },
  {
    id: 'BND-VOICE-01',
    code: 'VOICE_ALLNET_120',
    name: 'All-Net 120 Voice Minutes',
    description: '120 voice minutes to any Nigerian telecom network',
    category: 'VOICE_BOOSTER',
    price: 1200,
    currency: 'NGN',
    validityDays: 30,
    voiceSeconds: 7200,
    features: ['No hidden access charges', 'Per-second billing'],
    isActive: true
  },
  {
    id: 'BND-ROAM-01',
    code: 'ROAMING_PASSPORT_GLOBAL',
    name: 'Global Roaming Passport 10GB',
    description: 'Stay connected across UK, USA, UAE, Ghana, Kenya and South Africa',
    category: 'ROAMING',
    price: 15000,
    currency: 'NGN',
    validityDays: 30,
    dataAllowanceBytes: 10737418240,
    voiceSeconds: 3600,
    smsCount: 50,
    features: ['No bill shocks', 'Seamless partner network handover'],
    isActive: true
  }
];

