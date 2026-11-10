import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Wifi,
  PhoneCall,
  MessageSquare,
  CreditCard,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface DashboardData {
  subscriber: {
    id: string;
    name: string;
    msisdn: string;
    accountType: string;
    status: string;
    loyaltyPoints: number;
  };
  currentPlan: {
    name: string;
    category: string;
    expiryDate: string;
    status: string;
  };
  billingAndBalance: any;
  meters: {
    data: {
      remaining: string;
      percentUsed: number;
      expiryDate: string;
    };
    voice: {
      remaining: string;
      percentUsed: number;
      expiryDate: string;
    };
    sms: {
      remaining: string;
      percentUsed: number;
      expiryDate: string;
    };
  };
  promotions: Array<{
    id: string;
    title: string;
    description: string;
    discountPercent: number;
    price: number;
    currency: string;
    category: string;
  }>;
}

export const DashboardTab: React.FC<{
  onOpenLogin: () => void;
  onNavigateToTab: (tab: string) => void;
}> = ({ onOpenLogin, onNavigateToTab }) => {
  const { isAuthenticated, activeMsisdn } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.get('/dashboard/summary');
      setData(res?.data || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboard();
    }
  }, [isAuthenticated, activeMsisdn]);

  if (!isAuthenticated) {
    return (
      <div style={{
        maxWidth: 700,
        margin: '60px auto',
        textAlign: 'center',
        padding: 40,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          backgroundColor: '#e0e7ff',
          color: '#4f46e5',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20
        }}>
          <ShieldCheck size={36} />
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
          Welcome to TeleWyz Self-Care
        </h2>
        <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: 500, margin: '0 auto 28px', lineHeight: 1.5 }}>
          Log in with your subscriber mobile number to monitor your live BSS real-time balance, view active data and voice meters, and claim exclusive CVM rewards.
        </p>
        <button onClick={onOpenLogin} className="btn-primary" style={{ padding: '12px 28px', fontSize: '1rem' }}>
          Sign In with Mobile OTP
        </button>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
        <RefreshCw size={32} className="spin" style={{ margin: '0 auto 16px', display: 'block' }} />
        <p style={{ fontWeight: 600 }}>Connecting to Authoritative BSS / EPC Gateway...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: '#b91c1c', marginBottom: 12 }}>
          <AlertTriangle size={24} />
          <h3 style={{ fontWeight: 700 }}>Unable to load dashboard</h3>
        </div>
        <p style={{ color: '#991b1b', fontSize: '0.9rem', marginBottom: 16 }}>{error}</p>
        <button onClick={fetchDashboard} className="btn-primary" style={{ fontSize: '0.85rem' }}>
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overview Top Card */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
        color: '#ffffff',
        padding: '28px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                {data.subscriber.accountType}
              </span>
              <span style={{
                backgroundColor: '#10b981',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                ● {data.subscriber.status}
              </span>
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '4px 0' }}>
              Hello, {data.subscriber.name}
            </h1>
            <p style={{ color: '#c7d2fe', fontSize: '0.95rem' }}>
              MSISDN: +{data.subscriber.msisdn}
            </p>
          </div>

          {/* Balance Widget */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            padding: '16px 24px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.15)',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: 1 }}>
              {data.subscriber.accountType === 'POSTPAID' ? 'Amount Due' : 'Airtime Balance'}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, margin: '4px 0' }}>
              {data.subscriber.accountType === 'POSTPAID'
                ? `₦${(data.billingAndBalance?.currentDue ?? 0).toLocaleString()}`
                : `₦${(data.billingAndBalance?.amount ?? 0).toLocaleString()}`}
            </div>
            <button
              onClick={() => onNavigateToTab('payments')}
              style={{
                backgroundColor: '#ffffff',
                color: '#4338ca',
                fontWeight: 700,
                fontSize: '0.85rem',
                padding: '6px 14px',
                borderRadius: 6,
                marginTop: 6
              }}
            >
              {data.subscriber.accountType === 'POSTPAID' ? 'Pay Bill' : '+ Top Up'}
            </button>
          </div>
        </div>
      </div>

      {/* 3 Real-time Authoritative BSS Meters */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20
      }}>
        {/* Data Meter */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ padding: 10, borderRadius: 10, backgroundColor: '#e0e7ff', color: '#4f46e5' }}>
                <Wifi size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>Data Balance</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>High-Speed 4G/5G</div>
              </div>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4f46e5' }}>
              {100 - data.meters.data.percentUsed}% Left
            </span>
          </div>

          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '8px 0' }}>
            {data.meters.data.remaining}
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', height: 8, backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${100 - data.meters.data.percentUsed}%`,
              height: '100%',
              backgroundColor: '#4f46e5',
              borderRadius: 999
            }} />
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 10 }}>
            Expires: {new Date(data.meters.data.expiryDate).toLocaleDateString()}
          </div>
        </div>

        {/* Voice Meter */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ padding: 10, borderRadius: 10, backgroundColor: '#ecfdf5', color: '#059669' }}>
                <PhoneCall size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>Voice Minutes</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>All Networks (National)</div>
              </div>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#059669' }}>
              {100 - data.meters.voice.percentUsed}% Left
            </span>
          </div>

          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '8px 0' }}>
            {data.meters.voice.remaining}
          </div>

          <div style={{ width: '100%', height: 8, backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${100 - data.meters.voice.percentUsed}%`,
              height: '100%',
              backgroundColor: '#10b981',
              borderRadius: 999
            }} />
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 10 }}>
            Expires: {new Date(data.meters.voice.expiryDate).toLocaleDateString()}
          </div>
        </div>

        {/* SMS Meter */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ padding: 10, borderRadius: 10, backgroundColor: '#fef3c7', color: '#d97706' }}>
                <MessageSquare size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>SMS Messages</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Local & Roaming</div>
              </div>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#d97706' }}>
              {100 - data.meters.sms.percentUsed}% Left
            </span>
          </div>

          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '8px 0' }}>
            {data.meters.sms.remaining}
          </div>

          <div style={{ width: '100%', height: 8, backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${100 - data.meters.sms.percentUsed}%`,
              height: '100%',
              backgroundColor: '#f59e0b',
              borderRadius: 999
            }} />
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 10 }}>
            Expires: {new Date(data.meters.sms.expiryDate).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Current Plan & CVM Offers row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Active Plan */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Active Subscription</h3>
            <span style={{
              backgroundColor: '#dbeafe',
              color: '#1e40af',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: 6
            }}>
              {data.currentPlan.status}
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>
            {data.currentPlan.name}
          </div>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 16 }}>
            Renewal date: {new Date(data.currentPlan.expiryDate).toLocaleDateString()}
          </p>
          <button
            onClick={() => onNavigateToTab('plans')}
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.9rem' }}
          >
            Change / Upgrade Plan <ArrowUpRight size={16} />
          </button>
        </div>

        {/* Personalized CVM Promotions */}
        <div className="card" style={{ borderColor: '#c7d2fe', backgroundColor: '#faf5ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Sparkles size={20} color="#7c3aed" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#581c87' }}>Recommended For You (CVM)</h3>
          </div>
          {data.promotions && data.promotions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.promotions.slice(0, 2).map((offer) => (
                <div
                  key={offer.id}
                  style={{
                    backgroundColor: '#ffffff',
                    padding: 14,
                    borderRadius: 10,
                    border: '1px solid #e9d5ff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                      {offer.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                      {offer.description}
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigateToTab('plans')}
                    style={{
                      backgroundColor: '#7c3aed',
                      color: '#ffffff',
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      flexShrink: 0
                    }}
                  >
                    ₦{offer.price}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No special offers available right now.</p>
          )}
        </div>
      </div>
    </div>
  );
};
