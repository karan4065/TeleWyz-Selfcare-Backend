import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, CheckCircle2, AlertCircle, RefreshCw, Trash2, ArrowLeftRight } from 'lucide-react';

export const FamilyTab: React.FC<{ onOpenLogin: () => void }> = ({ onOpenLogin }) => {
  const { isAuthenticated, activeMsisdn, switchActiveMsisdn } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [secondaryMsisdn, setSecondaryMsisdn] = useState('2348099887766');
  const [relationship, setRelationship] = useState<'FAMILY' | 'BUSINESS' | 'SECONDARY' | 'DEPENDENT'>('FAMILY');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'LIST' | 'SEND_OTP' | 'VERIFY_OTP'>('LIST');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAccounts = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res: any = await api.get('/subscriber/associated-accounts');
      setAccounts(res?.data?.accounts || []);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load associated accounts' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchAccounts();
  }, [isAuthenticated]);

  const handleInitiateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res: any = await api.post('/subscriber/associated-accounts/link', {
        secondaryMsisdn,
        relationship,
        permissions: ['VIEW_BALANCE', 'RECHARGE', 'MANAGE_BUNDLES']
      });
      setMsg({ type: 'success', text: res?.message || 'Verification code sent to secondary line (Test OTP: 123456)' });
      setOtpCode('123456');
      setStep('VERIFY_OTP');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to initiate account link' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await api.post('/subscriber/associated-accounts/verify', {
        secondaryMsisdn,
        otpCode
      });
      setMsg({ type: 'success', text: `Line +${secondaryMsisdn} linked successfully to your account!` });
      setStep('LIST');
      fetchAccounts();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to verify OTP' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelink = async (id: string) => {
    setLoading(true);
    try {
      await api.delete(`/subscriber/associated-accounts/${id}`);
      setMsg({ type: 'success', text: 'Associated line unlinked.' });
      fetchAccounts();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to delink' });
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchLine = async (targetMsisdn: string) => {
    try {
      await api.post('/subscriber/switch-account', { targetMsisdn });
      switchActiveMsisdn(targetMsisdn);
      setMsg({ type: 'success', text: `Switched active dashboard context to +${targetMsisdn}` });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to switch context' });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40, maxWidth: 540, margin: '40px auto' }}>
        <Users size={40} color="#4f46e5" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 }}>Sign In Required</h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>
          Please sign in to manage your family bundle, secondary phone numbers, and child lines.
        </p>
        <button onClick={onOpenLogin} className="btn-primary" style={{ margin: '0 auto' }}>
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>Family & Linked Accounts</h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>
              Manage multiple SIMs, switch context, and top up secondary lines from one portal.
            </p>
          </div>
          {step === 'LIST' && (
            <button
              onClick={() => setStep('SEND_OTP')}
              className="btn-primary"
              style={{ fontSize: '0.85rem', padding: '8px 14px' }}
            >
              <Plus size={16} /> Link New Line
            </button>
          )}
        </div>
      </div>

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
          {msg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Step 1: Send OTP to Secondary Line */}
      {step === 'SEND_OTP' && (
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
            Link Secondary MSISDN
          </h3>
          <form onSubmit={handleInitiateLink} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                Secondary Mobile Number
              </label>
              <input
                type="text"
                value={secondaryMsisdn}
                onChange={(e) => setSecondaryMsisdn(e.target.value)}
                required
                style={{ width: '100%' }}
                placeholder="2348099887766"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                Relationship Type
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value as any)}
                style={{ width: '100%' }}
              >
                <option value="FAMILY">Family Member</option>
                <option value="DEPENDENT">Child / Dependent</option>
                <option value="SECONDARY">Personal Secondary Line</option>
                <option value="BUSINESS">Corporate / Business Line</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                {loading ? 'Sending Code...' : 'Send OTP to Secondary Number'}
              </button>
              <button type="button" onClick={() => setStep('LIST')} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Verify OTP */}
      {step === 'VERIFY_OTP' && (
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
            Verify Consent from +{secondaryMsisdn}
          </h3>
          <form onSubmit={handleVerifyLink} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                6-Digit Authorization Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
                style={{ width: '100%', fontSize: '1.1rem', letterSpacing: 2 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={loading || otpCode.length !== 6} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                {loading ? 'Verifying...' : 'Confirm Account Link'}
              </button>
              <button type="button" onClick={() => setStep('LIST')} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Linked Accounts List */}
      {step === 'LIST' && (
        <div className="card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Loading linked accounts...</div>
          ) : accounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
              <Users size={32} style={{ margin: '0 auto 8px', color: '#cbd5e1' }} />
              <p>No associated lines attached to your account yet.</p>
              <button
                onClick={() => setStep('SEND_OTP')}
                className="btn-primary"
                style={{ marginTop: 12, fontSize: '0.85rem' }}
              >
                + Add First Linked Number
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {accounts.map((acc) => {
                const isCurrentActive = activeMsisdn === acc.secondaryMsisdn;
                return (
                  <div
                    key={acc.id}
                    style={{
                      padding: 16,
                      backgroundColor: isCurrentActive ? '#eff6ff' : '#f8fafc',
                      border: `1px solid ${isCurrentActive ? '#93c5fd' : '#e2e8f0'}`,
                      borderRadius: 10,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                          +{acc.secondaryMsisdn}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: '#e2e8f0',
                          color: '#475569',
                          padding: '2px 8px',
                          borderRadius: 4
                        }}>
                          {acc.relationship}
                        </span>
                        {isCurrentActive && (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            padding: '2px 8px',
                            borderRadius: 4
                          }}>
                            ACTIVE IN PORTAL
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
                        Status: <strong style={{ color: '#10b981' }}>{acc.status}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {!isCurrentActive && (
                        <button
                          onClick={() => handleSwitchLine(acc.secondaryMsisdn)}
                          className="btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                        >
                          <ArrowLeftRight size={14} /> Switch To This Line
                        </button>
                      )}
                      <button
                        onClick={() => handleDelink(acc.id)}
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          padding: '6px 10px',
                          borderRadius: 6
                        }}
                        title="Unlink"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
