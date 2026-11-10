import React, { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { X, Smartphone, ShieldCheck, ArrowRight, KeyRound, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const [msisdn, setMsisdn] = useState('2348012345678');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'SEND_OTP' | 'VERIFY_OTP'>('SEND_OTP');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res: any = await api.post('/auth/otp/send', {
        msisdn,
        purpose: 'LOGIN'
      });
      setInfo(res?.message || 'OTP sent successfully to your mobile number.');
      if (res?.data?.debugOtp) {
        setDebugOtp(res.data.debugOtp);
        setOtpCode(res.data.debugOtp);
      }
      setStep('VERIFY_OTP');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.post('/auth/otp/verify', {
        msisdn,
        code: otpCode,
        purpose: 'LOGIN',
        deviceType: 'WEB_BROWSER'
      });
      if (res?.data?.accessToken && res?.data?.subscriber) {
        login(res.data.accessToken, res.data.subscriber);
        onClose();
      } else {
        setError('Unexpected response from server');
      }
    } catch (err: any) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: 16
    }}>
      <div className="card" style={{
        maxWidth: 440,
        width: '100%',
        position: 'relative',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 18,
            right: 18,
            backgroundColor: 'transparent',
            color: '#94a3b8',
            padding: 4
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 52,
            height: 52,
            background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
            borderRadius: 14,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            marginBottom: 12
          }}>
            <ShieldCheck size={28} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
            {step === 'SEND_OTP' ? 'Sign in to TeleWyz' : 'Verify One-Time PIN'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>
            {step === 'SEND_OTP'
              ? 'Enter your mobile subscriber number (MSISDN) to receive an OTP'
              : `Enter the 6-digit code sent to ${msisdn}`}
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Success / Debug Notification */}
        {info && (
          <div style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: '0.85rem'
          }}>
            {info}
            {debugOtp && (
              <div style={{ marginTop: 6, fontWeight: 700, color: '#047857' }}>
                🚀 Dev Mode Test OTP: <span style={{ textDecoration: 'underline' }}>{debugOtp}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Send OTP Form */}
        {step === 'SEND_OTP' && (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#334155' }}>
                Subscriber Mobile Number (MSISDN)
              </label>
              <div style={{ position: 'relative' }}>
                <Smartphone size={18} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} />
                <input
                  type="text"
                  value={msisdn}
                  onChange={(e) => setMsisdn(e.target.value)}
                  placeholder="2348012345678"
                  required
                  style={{ width: '100%', paddingLeft: 38 }}
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                Default test line: <code>2348012345678</code> (Prepaid, Active)
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ justifyContent: 'center', width: '100%', padding: '12px' }}
            >
              {loading ? 'Sending OTP...' : <>Send Secure OTP <ArrowRight size={18} /></>}
            </button>
          </form>
        )}

        {/* Step 2: Verify OTP Form */}
        {step === 'VERIFY_OTP' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#334155' }}>
                6-Digit Security OTP
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: 12, top: 13, color: '#94a3b8' }} />
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  required
                  style={{ width: '100%', paddingLeft: 38, letterSpacing: '4px', fontSize: '1.1rem', fontWeight: 700 }}
                />
              </div>
              {debugOtp && (
                <button
                  type="button"
                  onClick={() => setOtpCode(debugOtp)}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#4f46e5',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    marginTop: 6,
                    padding: 0,
                    textAlign: 'left'
                  }}
                >
                  ⚡ Click to auto-fill test code ({debugOtp})
                </button>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || otpCode.length !== 6}
              style={{ justifyContent: 'center', width: '100%', padding: '12px' }}
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setStep('SEND_OTP')}
                style={{ backgroundColor: 'transparent', color: '#64748b', fontSize: '0.85rem' }}
              >
                Change Number
              </button>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                style={{ backgroundColor: 'transparent', color: '#4f46e5', fontSize: '0.85rem', fontWeight: 600 }}
              >
                Resend Code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
