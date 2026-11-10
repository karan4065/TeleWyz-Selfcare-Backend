import React, { useState } from 'react';
import { api } from '../api/client';
import { ArrowLeftRight, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, Clock } from 'lucide-react';

export const MnpTab: React.FC = () => {
  const [msisdn, setMsisdn] = useState('2348031234567');
  const [donorOperator, setDonorOperator] = useState<'MTN' | 'AIRTEL' | 'GLO' | '9MOBILE'>('MTN');
  const [accountType, setAccountType] = useState<'PREPAID' | 'POSTPAID'>('PREPAID');
  const [simType, setSimType] = useState<'PHYSICAL' | 'ESIM'>('ESIM');
  const [nin, setNin] = useState('12345678901');
  const [deliveryAddress, setDeliveryAddress] = useState('Plot 45, Adeola Odeku, VI, Lagos');
  
  const [step, setStep] = useState<'CHECK' | 'SUBMIT' | 'RESULT'>('CHECK');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eligibilityResult, setEligibilityResult] = useState<any>(null);
  const [portingResult, setPortingResult] = useState<any>(null);

  const handleCheckEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.post('/mnp/validate', {
        msisdn,
        donorOperator,
        accountType
      });
      setEligibilityResult(res.data);
      if (res.data.eligible) {
        setStep('SUBMIT');
      } else {
        setError(res.data.rejectionReason || 'Number is currently not eligible for porting.');
      }
    } catch (err: any) {
      setError(err.message || 'Porting eligibility check failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        msisdn,
        donorOperator,
        simType,
        nin
      };
      if (simType === 'PHYSICAL') {
        payload.deliveryAddress = deliveryAddress;
      }
      const res: any = await api.post('/mnp/request', payload);
      setPortingResult(res.data);
      setStep('RESULT');
    } catch (err: any) {
      setError(err.message || 'Failed to submit porting request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ padding: 10, borderRadius: 10, backgroundColor: '#ede9fe', color: '#7c3aed' }}>
            <ArrowLeftRight size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
              Switch to TeleWyz & Keep Your Number
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              National Mobile Number Portability (MNP) via Nigerian Communications Commission Clearinghouse.
            </p>
          </div>
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

      {/* Step 1: Check Eligibility */}
      {step === 'CHECK' && (
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
            Step 1: Check Number Portability Status
          </h3>

          <form onSubmit={handleCheckEligibility} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                Existing Phone Number (MSISDN)
              </label>
              <input
                type="text"
                value={msisdn}
                onChange={(e) => setMsisdn(e.target.value)}
                required
                style={{ width: '100%' }}
                placeholder="2348031234567"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                  Current Network Provider
                </label>
                <select
                  value={donorOperator}
                  onChange={(e) => setDonorOperator(e.target.value as any)}
                  style={{ width: '100%' }}
                >
                  <option value="MTN">MTN Nigeria</option>
                  <option value="AIRTEL">Airtel Nigeria</option>
                  <option value="GLO">Globacom (Glo)</option>
                  <option value="9MOBILE">9mobile</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                  Plan Category
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as any)}
                  style={{ width: '100%' }}
                >
                  <option value="PREPAID">Prepaid Subscriber</option>
                  <option value="POSTPAID">Postpaid Subscriber</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent: 'center', padding: '12px' }}>
              {loading ? 'Verifying with NPC Clearinghouse...' : 'Verify Porting Eligibility'}
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Submit Porting Request */}
      {step === 'SUBMIT' && (
        <div className="card">
          <div style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '12px',
            borderRadius: 8,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <CheckCircle2 size={20} />
            <div>
              <strong>+{msisdn} is eligible for porting!</strong> (No active disputes or lockouts)
            </div>
          </div>

          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
            Step 2: Submit Clearinghouse Request
          </h3>

          <form onSubmit={handleSubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                11-Digit National Identification Number (NIN)
              </label>
              <input
                type="text"
                maxLength={11}
                value={nin}
                onChange={(e) => setNin(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                New SIM Delivery Format
              </label>
              <select
                value={simType}
                onChange={(e) => setSimType(e.target.value as any)}
                style={{ width: '100%' }}
              >
                <option value="ESIM">Instant eSIM Profile (Recommended)</option>
                <option value="PHYSICAL">Physical SIM (Courier Delivery)</option>
              </select>
            </div>

            {simType === 'PHYSICAL' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                  Delivery Address
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent: 'center', padding: '12px' }}>
              {loading ? 'Submitting to NPC...' : 'Submit Port-In Request'}
            </button>
          </form>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 'RESULT' && (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <Clock size={48} color="#2563eb" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e40af', marginBottom: 8 }}>
            Port-In Request Logged with NCC
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 20 }}>
            Request ID: <strong>{portingResult?.id || 'MNP-REQ-LIVE'}</strong>
          </p>

          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 16,
            textAlign: 'left',
            maxWidth: 420,
            margin: '0 auto 24px',
            fontSize: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <div><strong>Number:</strong> +{msisdn}</div>
            <div><strong>Donor Network:</strong> {donorOperator}</div>
            <div><strong>Recipient Network:</strong> TeleWyz E-Care</div>
            <div><strong>Current State:</strong> <span style={{ color: '#2563eb', fontWeight: 700 }}>VALIDATED_BY_CLEARINGHOUSE</span></div>
            <div><strong>Expected Completion:</strong> Within 2 to 24 hours</div>
          </div>

          <button onClick={() => setStep('CHECK')} className="btn-secondary">
            Check Another Line
          </button>
        </div>
      )}
    </div>
  );
};
