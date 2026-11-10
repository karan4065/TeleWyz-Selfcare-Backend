import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Check, Zap, Layers, RefreshCw, AlertCircle, ShoppingBag, ShieldCheck } from 'lucide-react';

export const PlansTab: React.FC<{ onOpenLogin: () => void }> = ({ onOpenLogin }) => {
  const { isAuthenticated } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [planType, setPlanType] = useState<'PREPAID' | 'POSTPAID'>('PREPAID');
  const [viewTab, setViewTab] = useState<'PLANS' | 'ADDONS' | 'MY_SUBSCRIPTIONS'>('PLANS');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/catalogue/plans?type=${planType}`);
      setPlans(res?.data?.plans || []);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load plans' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/catalogue/packages');
      setPackages(res?.data?.packages || []);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load bundles' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res: any = await api.get('/catalogue/subscriptions');
      setSubscriptions(res?.data?.subscriptions || []);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load subscriptions' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewTab === 'PLANS') fetchPlans();
    if (viewTab === 'ADDONS') fetchPackages();
    if (viewTab === 'MY_SUBSCRIPTIONS') fetchSubscriptions();
  }, [viewTab, planType, isAuthenticated]);

  const handleSubscribe = async (itemId: string, itemType: 'PLAN' | 'ADDON') => {
    if (!isAuthenticated) {
      onOpenLogin();
      return;
    }
    setActionLoading(itemId);
    setMsg(null);
    try {
      const res: any = await api.post('/catalogue/subscribe', {
        itemId,
        itemType,
        autoRenew: false
      });
      setMsg({ type: 'success', text: res?.message || 'Subscription successfully activated via BSS!' });
      if (viewTab === 'MY_SUBSCRIPTIONS') fetchSubscriptions();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Subscription failed' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnsubscribe = async (subscriptionId: string) => {
    setActionLoading(subscriptionId);
    setMsg(null);
    try {
      const res: any = await api.post('/catalogue/unsubscribe', { subscriptionId });
      setMsg({ type: 'success', text: res?.message || 'Unsubscribed successfully.' });
      fetchSubscriptions();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to unsubscribe' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tab Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setViewTab('PLANS')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: '0.9rem',
              fontWeight: 600,
              backgroundColor: viewTab === 'PLANS' ? '#4f46e5' : '#ffffff',
              color: viewTab === 'PLANS' ? '#ffffff' : '#64748b',
              border: '1px solid #e2e8f0'
            }}
          >
            Base Plans
          </button>
          <button
            onClick={() => setViewTab('ADDONS')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: '0.9rem',
              fontWeight: 600,
              backgroundColor: viewTab === 'ADDONS' ? '#4f46e5' : '#ffffff',
              color: viewTab === 'ADDONS' ? '#ffffff' : '#64748b',
              border: '1px solid #e2e8f0'
            }}
          >
            Add-on Boosters
          </button>
          {isAuthenticated && (
            <button
              onClick={() => setViewTab('MY_SUBSCRIPTIONS')}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: '0.9rem',
                fontWeight: 600,
                backgroundColor: viewTab === 'MY_SUBSCRIPTIONS' ? '#4f46e5' : '#ffffff',
                color: viewTab === 'MY_SUBSCRIPTIONS' ? '#ffffff' : '#64748b',
                border: '1px solid #e2e8f0'
              }}
            >
              My Subscriptions
            </button>
          )}
        </div>

        {viewTab === 'PLANS' && (
          <div style={{ display: 'flex', gap: 6, backgroundColor: '#f1f5f9', padding: 4, borderRadius: 8 }}>
            <button
              onClick={() => setPlanType('PREPAID')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: '0.85rem',
                fontWeight: 600,
                backgroundColor: planType === 'PREPAID' ? '#ffffff' : 'transparent',
                color: planType === 'PREPAID' ? '#0f172a' : '#64748b',
                boxShadow: planType === 'PREPAID' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Prepaid
            </button>
            <button
              onClick={() => setPlanType('POSTPAID')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: '0.85rem',
                fontWeight: 600,
                backgroundColor: planType === 'POSTPAID' ? '#ffffff' : 'transparent',
                color: planType === 'POSTPAID' ? '#0f172a' : '#64748b',
                boxShadow: planType === 'POSTPAID' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Postpaid
            </button>
          </div>
        )}
      </div>

      {/* Status banner */}
      {msg && (
        <div style={{
          backgroundColor: msg.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: msg.type === 'success' ? '#065f46' : '#991b1b',
          padding: '12px 16px',
          borderRadius: 8,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          {msg.type === 'success' ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
          <span>{msg.text}</span>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px', display: 'block' }} />
          Loading catalogue from EPC...
        </div>
      )}

      {/* Base Plans Grid */}
      {viewTab === 'PLANS' && !loading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20
        }}>
          {plans.map((p) => (
            <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#4f46e5',
                    backgroundColor: '#e0e7ff',
                    padding: '4px 8px',
                    borderRadius: 6
                  }}>
                    {p.type}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {p.validityDays} Days
                  </span>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                  {p.name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 16 }}>
                  {p.description}
                </p>

                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>
                  ₦{p.price.toLocaleString()}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#334155' }}>
                    <Check size={16} color="#10b981" /> <strong>{p.dataAllowanceMb ? `${p.dataAllowanceMb / 1024} GB` : 'Custom Data'}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#334155' }}>
                    <Check size={16} color="#10b981" /> <strong>{p.voiceAllowanceMinutes} mins</strong> national calls
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#334155' }}>
                    <Check size={16} color="#10b981" /> <strong>{p.smsAllowanceCount} SMS</strong> messages
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSubscribe(p.id, 'PLAN')}
                disabled={actionLoading === p.id}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {actionLoading === p.id ? 'Subscribing...' : 'Subscribe Now'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Addons Grid */}
      {viewTab === 'ADDONS' && !loading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 20
        }}>
          {packages.map((pkg) => (
            <div key={pkg.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#059669',
                    backgroundColor: '#d1fae5',
                    padding: '4px 8px',
                    borderRadius: 6
                  }}>
                    {pkg.category}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{pkg.validityDays} Days</span>
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                  {pkg.name}
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 12 }}>
                  {pkg.description}
                </p>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>
                  ₦{pkg.price.toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => handleSubscribe(pkg.id, 'ADDON')}
                disabled={actionLoading === pkg.id}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}
              >
                {actionLoading === pkg.id ? 'Activating...' : '+ Add Booster'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* My Subscriptions */}
      {viewTab === 'MY_SUBSCRIPTIONS' && !loading && (
        <div>
          {subscriptions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              <Layers size={32} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
              <p>No active subscriptions found for this account.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {subscriptions.map((s) => (
                <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>
                      {s.planName || s.planId}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                      Status: <span style={{ color: '#10b981', fontWeight: 600 }}>{s.status}</span> • Auto-renew: {s.autoRenew ? 'ON' : 'OFF'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnsubscribe(s.id)}
                    disabled={actionLoading === s.id}
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      padding: '8px 14px',
                      borderRadius: 8,
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                  >
                    {actionLoading === s.id ? 'Cancelling...' : 'Unsubscribe'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
