import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Search, Sparkles, Clock, CheckCircle2, XCircle, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

interface NumberItem {
  msisdn: string;
  category: 'NORMAL' | 'SILVER' | 'GOLD' | 'PLATINUM';
  price: number;
  status: string;
}

interface Reservation {
  id: string;
  msisdn: string;
  status: string;
  expiresAt: string;
}

export const NumbersTab: React.FC<{ onSelectMsisdnForSim?: (msisdn: string) => void }> = ({ onSelectMsisdnForSim }) => {
  const [numbers, setNumbers] = useState<NumberItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [category, setCategory] = useState<string>('');
  const [pattern, setPattern] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [reserveLoading, setReserveLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchNumbers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (pattern) params.append('pattern', pattern);
      const res: any = await api.get(`/numbers/search?${params.toString()}`);
      setNumbers(res?.data?.numbers || []);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to search numbers' });
    } finally {
      setLoading(false);
    }
  };

  const fetchReservations = async () => {
    try {
      const res: any = await api.get('/numbers/reservations');
      setReservations(res?.data?.reservations || []);
    } catch {
      // User might be guest
    }
  };

  useEffect(() => {
    fetchNumbers();
    fetchReservations();
  }, [category]);

  const handleReserve = async (msisdn: string) => {
    setReserveLoading(msisdn);
    setMsg(null);
    try {
      const res: any = await api.post('/numbers/reserve', {
        msisdn,
        ttlMinutes: 15
      });
      setMsg({ type: 'success', text: `MSISDN ${msisdn} reserved for 15 minutes! Order reference: ${res?.data?.id || 'ACTIVE'}` });
      fetchNumbers();
      fetchReservations();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to reserve number' });
    } finally {
      setReserveLoading(null);
    }
  };

  const handleCancelReservation = async (id: string) => {
    try {
      await api.post(`/numbers/reservations/${id}/cancel`);
      setMsg({ type: 'success', text: 'Reservation cancelled.' });
      fetchReservations();
      fetchNumbers();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to cancel reservation' });
    }
  };

  const getCategoryBadgeStyle = (cat: string) => {
    switch (cat) {
      case 'PLATINUM':
        return { background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', color: '#3730a3', border: '1px solid #818cf8' };
      case 'GOLD':
        return { background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#92400e', border: '1px solid #f59e0b' };
      case 'SILVER':
        return { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' };
      default:
        return { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Active Reservations Banner (if any) */}
      {reservations.length > 0 && (
        <div className="card" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Clock size={20} color="#2563eb" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e40af' }}>
              Your Active Number Reservations
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reservations.map((r) => (
              <div
                key={r.id}
                style={{
                  backgroundColor: '#ffffff',
                  padding: '12px 16px',
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10
                }}
              >
                <div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>+{r.msisdn}</span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: 12 }}>
                    Expires: {new Date(r.expiresAt).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {onSelectMsisdnForSim && (
                    <button
                      onClick={() => onSelectMsisdnForSim(r.msisdn)}
                      className="btn-primary"
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    >
                      Order SIM with this Number <ArrowRight size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleCancelReservation(r.id)}
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '6px 12px',
                      borderRadius: 6
                    }}
                  >
                    Release
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Header */}
      <div className="card">
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
          Choose Your Perfect VIP or Vanity Number
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 20 }}>
          Reserve premium memorable numbers in real-time with an authoritative 15-minute lock before purchase.
        </p>

        {msg && (
          <div style={{
            backgroundColor: msg.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: msg.type === 'success' ? '#065f46' : '#991b1b',
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Filter controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {/* Pattern Search */}
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchNumbers()}
              placeholder="Search digits (e.g. 888, 777, 1234)..."
              style={{ width: '100%', paddingLeft: 38 }}
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ padding: '10px 14px', minWidth: 160 }}
          >
            <option value="">All Tiers (VIP & Normal)</option>
            <option value="PLATINUM">💎 Platinum Tier</option>
            <option value="GOLD">⭐ Gold Tier</option>
            <option value="SILVER">✨ Silver Tier</option>
            <option value="NORMAL">Standard Tier</option>
          </select>

          <button onClick={fetchNumbers} className="btn-primary" style={{ padding: '10px 18px' }}>
            Search Numbers
          </button>
        </div>
      </div>

      {/* Numbers Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px', display: 'block' }} />
          Querying pool availability...
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16
        }}>
          {numbers.map((num) => (
            <div
              key={num.msisdn}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 18,
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span
                    style={{
                      ...getCategoryBadgeStyle(num.category),
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 6
                    }}
                  >
                    {num.category}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                    {num.price ? `₦${num.price.toLocaleString()}` : 'Free'}
                  </span>
                </div>

                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', letterSpacing: '1px', marginBottom: 8 }}>
                  +{num.msisdn}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginBottom: 16 }}>
                  ● Available for immediate lock
                </div>
              </div>

              <button
                onClick={() => handleReserve(num.msisdn)}
                disabled={reserveLoading === num.msisdn}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem', padding: '8px' }}
              >
                {reserveLoading === num.msisdn ? 'Reserving...' : 'Reserve (15 Mins)'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
