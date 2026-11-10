import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CreditCard, CheckCircle2, AlertCircle, History, ArrowRight, RefreshCw, Zap } from 'lucide-react';

export const PaymentsTab: React.FC = () => {
  const { activeMsisdn, subscriber } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'AIRTIME' | 'POSTPAID_BILL' | 'HISTORY'>('AIRTIME');
  const [msisdn, setMsisdn] = useState(activeMsisdn || subscriber?.msisdn || '2348012345678');
  const [amount, setAmount] = useState<number>(1000);
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'USSD' | 'BANK_TRANSFER' | 'WALLET'>('CARD');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [currentBill, setCurrentBill] = useState<any>(null);

  useEffect(() => {
    if (activeMsisdn) setMsisdn(activeMsisdn);
  }, [activeMsisdn]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/payments/history');
      setHistory(res?.data?.records || res?.data?.history || []);
    } catch {
      // Ignored if empty
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentBill = async () => {
    try {
      const res: any = await api.get(`/payments/bills/current?msisdn=${msisdn}`);
      setCurrentBill(res?.data || null);
    } catch {
      // Postpaid only
    }
  };

  useEffect(() => {
    if (activeSubTab === 'HISTORY') fetchHistory();
    if (activeSubTab === 'POSTPAID_BILL') fetchCurrentBill();
  }, [activeSubTab, msisdn]);

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res: any = await api.post('/payments/recharge', {
        msisdn,
        amount: Number(amount),
        rechargeType: 'AIRTIME',
        paymentMethod
      });
      setMsg({
        type: 'success',
        text: `₦${amount} recharge initiated successfully! Ref: ${res?.data?.reference || res?.data?.transactionId || 'SUCCESS'}`
      });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Payment initiation failed' });
    } finally {
      setLoading(false);
    }
  };

  const handlePayBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res: any = await api.post('/payments/bills/pay', {
        msisdn,
        amount: Number(amount),
        paymentMethod
      });
      setMsg({
        type: 'success',
        text: `Postpaid bill of ₦${amount} cleared via payment gateway! Ref: ${res?.data?.reference || 'SUCCESS'}`
      });
      fetchCurrentBill();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Bill payment failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setActiveSubTab('AIRTIME')}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            fontSize: '0.9rem',
            fontWeight: 600,
            backgroundColor: activeSubTab === 'AIRTIME' ? '#4f46e5' : '#ffffff',
            color: activeSubTab === 'AIRTIME' ? '#ffffff' : '#64748b',
            border: '1px solid #e2e8f0'
          }}
        >
          Airtime Top-Up
        </button>
        <button
          onClick={() => setActiveSubTab('POSTPAID_BILL')}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            fontSize: '0.9rem',
            fontWeight: 600,
            backgroundColor: activeSubTab === 'POSTPAID_BILL' ? '#4f46e5' : '#ffffff',
            color: activeSubTab === 'POSTPAID_BILL' ? '#ffffff' : '#64748b',
            border: '1px solid #e2e8f0'
          }}
        >
          Postpaid Bill Settlement
        </button>
        <button
          onClick={() => setActiveSubTab('HISTORY')}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            fontSize: '0.9rem',
            fontWeight: 600,
            backgroundColor: activeSubTab === 'HISTORY' ? '#4f46e5' : '#ffffff',
            color: activeSubTab === 'HISTORY' ? '#ffffff' : '#64748b',
            border: '1px solid #e2e8f0'
          }}
        >
          Transaction History
        </button>
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

      {/* Airtime Recharge Form */}
      {activeSubTab === 'AIRTIME' && (
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
            Instant Airtime Top-Up
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 20 }}>
            Recharge your own number or any family member line with instantaneous BSS balance update.
          </p>

          <form onSubmit={handleRecharge} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                Target Mobile Number
              </label>
              <input
                type="text"
                value={msisdn}
                onChange={(e) => setMsisdn(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                Select Amount (NGN)
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                {[500, 1000, 2000, 5000, 10000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 6,
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      backgroundColor: amount === val ? '#4f46e5' : '#f1f5f9',
                      color: amount === val ? '#ffffff' : '#334155'
                    }}
                  >
                    ₦{val.toLocaleString()}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={50}
                max={100000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                style={{ width: '100%' }}
              >
                <option value="CARD">Debit / Credit Card (Visa / Mastercard)</option>
                <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                <option value="USSD">Quick USSD (*737#, *901#)</option>
                <option value="WALLET">TeleWyz Pay Wallet</option>
              </select>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent: 'center', padding: '12px' }}>
              {loading ? 'Processing Payment...' : `Pay ₦${amount.toLocaleString()} Now`}
            </button>
          </form>
        </div>
      )}

      {/* Postpaid Bill Settlement */}
      {activeSubTab === 'POSTPAID_BILL' && (
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
            Postpaid Bill Payment
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 20 }}>
            Fetch your monthly billing statement from BSS and pay outstanding charges.
          </p>

          {currentBill && (
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16
            }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Current Outstanding Due:</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
                ₦{(currentBill.amountDue || currentBill.currentDue || 12500).toLocaleString()}
              </div>
            </div>
          )}

          <form onSubmit={handlePayBill} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                Postpaid MSISDN
              </label>
              <input
                type="text"
                value={msisdn}
                onChange={(e) => setMsisdn(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                Payment Amount (NGN)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                style={{ width: '100%' }}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent: 'center', padding: '12px' }}>
              {loading ? 'Paying Bill...' : `Settle Bill (₦${amount.toLocaleString()})`}
            </button>
          </form>
        </div>
      )}

      {/* History */}
      {activeSubTab === 'HISTORY' && (
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>
            Recent Payment Ledger
          </h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Loading records...</div>
          ) : history.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No recent transactions recorded.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map((tx: any, idx: number) => (
                <div key={idx} style={{
                  padding: '12px 16px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{tx.type || 'RECHARGE'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{tx.msisdn} • {tx.paymentMethod}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>₦{Number(tx.amount).toLocaleString()}</div>
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>{tx.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
