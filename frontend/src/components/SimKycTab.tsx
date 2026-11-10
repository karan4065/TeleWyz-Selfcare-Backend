import React, { useState } from 'react';
import { api } from '../api/client';
import { Cpu, Truck, QrCode, ShieldCheck, CheckCircle2, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';

export const SimKycTab: React.FC<{ initialMsisdn?: string }> = ({ initialMsisdn }) => {
  const [stage, setStage] = useState<'ORDER' | 'KYC' | 'ACTIVATE' | 'SUCCESS'>('ORDER');
  const [simType, setSimType] = useState<'PHYSICAL' | 'ESIM'>('ESIM');
  const [msisdn, setMsisdn] = useState(initialMsisdn || '2348019998877');
  const [firstName, setFirstName] = useState('Karan');
  const [lastName, setLastName] = useState('Sharma');
  const [email, setEmail] = useState('karan.sharma@example.com');
  const [deliveryAddress, setDeliveryAddress] = useState('12 Victoria Island, Lagos, Nigeria');
  const [orderNumber, setOrderNumber] = useState('');
  const [nin, setNin] = useState('12345678901');
  const [activationResult, setActivationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        msisdn,
        simType,
        firstName,
        lastName,
        email
      };
      if (simType === 'PHYSICAL') {
        payload.deliveryAddress = deliveryAddress;
      }
      const res: any = await api.post('/sim/order', payload);
      setOrderNumber(res.data.orderNumber);
      setStage('KYC');
    } catch (err: any) {
      setError(err.message || 'Failed to place SIM order');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/sim/kyc/verify', {
        orderNumber,
        nin
      });
      setStage('ACTIVATE');
    } catch (err: any) {
      setError(err.message || 'NIMC KYC verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateSim = async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.post('/sim/activate', {
        orderNumber
      });
      setActivationResult(res.data);
      setStage('SUCCESS');
    } catch (err: any) {
      setError(err.message || 'BSS SIM Activation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stepper Indicator */}
      <div className="card" style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {[
            { key: 'ORDER', label: '1. Order SIM' },
            { key: 'KYC', label: '2. NIMC KYC' },
            { key: 'ACTIVATE', label: '3. Network Activate' },
            { key: 'SUCCESS', label: '4. Ready' }
          ].map((st, idx) => (
            <div key={st.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 700,
                backgroundColor: stage === st.key ? '#4f46e5' : '#f1f5f9',
                color: stage === st.key ? '#ffffff' : '#64748b'
              }}>
                {idx + 1}
              </div>
              <span style={{
                fontSize: '0.85rem',
                fontWeight: stage === st.key ? 700 : 500,
                color: stage === st.key ? '#0f172a' : '#94a3b8'
              }}>
                {st.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: 8,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Order Form */}
      {stage === 'ORDER' && (
        <div className="card">
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
            Order SIM or Instant eSIM
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 20 }}>
            Choose eSIM for instant QR delivery, or physical SIM dispatched to your address.
          </p>

          <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* SIM Type Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div
                onClick={() => setSimType('ESIM')}
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: `2px solid ${simType === 'ESIM' ? '#4f46e5' : '#e2e8f0'}`,
                  backgroundColor: simType === 'ESIM' ? '#f5f3ff' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <div style={{ padding: 10, borderRadius: 8, backgroundColor: '#e0e7ff', color: '#4f46e5' }}>
                  <QrCode size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Instant eSIM</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Digital QR activation</div>
                </div>
              </div>

              <div
                onClick={() => setSimType('PHYSICAL')}
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: `2px solid ${simType === 'PHYSICAL' ? '#4f46e5' : '#e2e8f0'}`,
                  backgroundColor: simType === 'PHYSICAL' ? '#f5f3ff' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <div style={{ padding: 10, borderRadius: 8, backgroundColor: '#ecfdf5', color: '#059669' }}>
                  <Truck size={24} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Physical SIM</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Doorstep delivery</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>First Name</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Last Name</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={{ width: '100%' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Target MSISDN</label>
              <input type="text" value={msisdn} onChange={(e) => setMsisdn(e.target.value)} required style={{ width: '100%' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%' }} />
            </div>

            {simType === 'PHYSICAL' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Delivery Street Address</label>
                <input type="text" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} required style={{ width: '100%' }} />
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent: 'center', padding: '12px' }}>
              {loading ? 'Creating Order...' : <>Proceed to NIMC KYC <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      )}

      {/* Step 2: KYC Form */}
      {stage === 'KYC' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <ShieldCheck size={28} color="#4f46e5" />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>National Identity Verification (NIN)</h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Order reference: <strong>{orderNumber}</strong></p>
            </div>
          </div>

          <form onSubmit={handleVerifyKyc} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>11-Digit National Identification Number (NIN)</label>
              <input
                type="text"
                maxLength={11}
                value={nin}
                onChange={(e) => setNin(e.target.value)}
                placeholder="12345678901"
                required
                style={{ width: '100%', fontSize: '1.1rem', letterSpacing: 2 }}
              />
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                Default test NIN: <code>12345678901</code> (Passes NIMC validation)
              </p>
            </div>

            <button type="submit" disabled={loading || nin.length !== 11} className="btn-primary" style={{ justifyContent: 'center', padding: '12px' }}>
              {loading ? 'Verifying with NIMC...' : 'Verify NIN & Continue'}
            </button>
          </form>
        </div>
      )}

      {/* Step 3: Activation */}
      {stage === 'ACTIVATE' && (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
            KYC Verified Successfully
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 24, maxWidth: 460, margin: '0 auto 24px' }}>
            Your identity has been confirmed against the national database. Click below to provision your SIM profile on the BSS network.
          </p>

          <button
            onClick={handleActivateSim}
            disabled={loading}
            className="btn-primary"
            style={{ padding: '12px 32px', fontSize: '1rem', margin: '0 auto' }}
          >
            {loading ? <><RefreshCw size={18} className="spin" /> Provisioning on BSS...</> : 'Activate Line Now'}
          </button>
        </div>
      )}

      {/* Step 4: Success Result */}
      {stage === 'SUCCESS' && (
        <div className="card" style={{ textAlign: 'center', padding: 32, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <CheckCircle2 size={56} color="#15803d" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#166534', marginBottom: 8 }}>
            SIM Activated & Live!
          </h2>
          <p style={{ color: '#15803d', fontSize: '0.95rem', marginBottom: 20 }}>
            Your line has been successfully registered and provisioned on the TeleWyz core network.
          </p>

          <div style={{
            backgroundColor: '#ffffff',
            padding: 20,
            borderRadius: 12,
            border: '1px solid #bbf7d0',
            textAlign: 'left',
            maxWidth: 420,
            margin: '0 auto 24px'
          }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Assigned ICCID:</span>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{activationResult?.iccid || '892340001234567890'}</div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Activated MSISDN:</span>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>+{activationResult?.msisdn || msisdn}</div>
            </div>
            {activationResult?.qrCodeUrl && (
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: 6 }}>eSIM Activation Profile QR:</span>
                <div style={{
                  padding: 12,
                  backgroundColor: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: 8,
                  display: 'inline-block'
                }}>
                  <QrCode size={120} color="#4f46e5" />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setStage('ORDER');
              setActivationResult(null);
            }}
            className="btn-secondary"
          >
            Start Another SIM Order
          </button>
        </div>
      )}
    </div>
  );
};
