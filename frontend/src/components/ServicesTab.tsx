import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Award, MapPin, Radio, LifeBuoy, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export const ServicesTab: React.FC<{ onOpenLogin: () => void }> = ({ onOpenLogin }) => {
  const { isAuthenticated, refreshProfile } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'LOYALTY' | 'STORES' | 'COVERAGE' | 'SUPPORT'>('LOYALTY');

  // Loyalty State
  const [loyalty, setLoyalty] = useState<any>(null);
  const [redeemPoints, setRedeemPoints] = useState(100);
  const [rewardType, setRewardType] = useState<'AIRTIME' | 'DATA_BUNDLE'>('AIRTIME');

  // Stores State
  const [stores, setStores] = useState<any[]>([]);
  const [cityFilter, setCityFilter] = useState('Lagos');

  // Coverage State
  const [coverageState, setCoverageState] = useState('Lagos');
  const [coverageData, setCoverageData] = useState<any>(null);

  // Support State
  const [ticketCategory, setTicketCategory] = useState<'BILLING' | 'NETWORK' | 'SIM' | 'VAS' | 'GENERAL'>('NETWORK');
  const [ticketSubject, setTicketSubject] = useState('Poor 4G Reception Indoors');
  const [ticketDesc, setTicketDesc] = useState('Experiencing low signal bars in Victoria Island during peak afternoon hours.');
  const [ticketPriority, setTicketPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchLoyalty = async () => {
    if (!isAuthenticated) return;
    try {
      const res: any = await api.get('/services/loyalty');
      setLoyalty(res.data);
    } catch {
      // Ignored
    }
  };

  const fetchStores = async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/services/stores?city=${cityFilter}`);
      setStores(res?.data?.stores || []);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to fetch stores' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCoverage = async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/services/coverage?state=${coverageState}`);
      setCoverageData(res?.data || null);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to check coverage' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'LOYALTY' && isAuthenticated) fetchLoyalty();
    if (activeSubTab === 'STORES') fetchStores();
    if (activeSubTab === 'COVERAGE') fetchCoverage();
  }, [activeSubTab, isAuthenticated]);

  const handleRedeemLoyalty = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res: any = await api.post('/services/loyalty/redeem', {
        points: Number(redeemPoints),
        rewardType
      });
      setMsg({ type: 'success', text: res?.message || 'Loyalty points successfully redeemed!' });
      fetchLoyalty();
      refreshProfile();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Loyalty redemption failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res: any = await api.post('/services/support/tickets', {
        category: ticketCategory,
        subject: ticketSubject,
        description: ticketDesc,
        priority: ticketPriority
      });
      setMsg({
        type: 'success',
        text: `Support ticket #${res?.data?.ticketNumber || 'TKT-LIVE'} created! Our NOC / Helpdesk team will investigate.`
      });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to create support ticket' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveSubTab('LOYALTY')}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            fontSize: '0.9rem',
            fontWeight: 600,
            backgroundColor: activeSubTab === 'LOYALTY' ? '#4f46e5' : '#ffffff',
            color: activeSubTab === 'LOYALTY' ? '#ffffff' : '#64748b',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Award size={18} /> TeleWyz Rewards
        </button>
        <button
          onClick={() => setActiveSubTab('STORES')}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            fontSize: '0.9rem',
            fontWeight: 600,
            backgroundColor: activeSubTab === 'STORES' ? '#4f46e5' : '#ffffff',
            color: activeSubTab === 'STORES' ? '#ffffff' : '#64748b',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <MapPin size={18} /> Store Locator
        </button>
        <button
          onClick={() => setActiveSubTab('COVERAGE')}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            fontSize: '0.9rem',
            fontWeight: 600,
            backgroundColor: activeSubTab === 'COVERAGE' ? '#4f46e5' : '#ffffff',
            color: activeSubTab === 'COVERAGE' ? '#ffffff' : '#64748b',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Radio size={18} /> 4G/5G Coverage
        </button>
        <button
          onClick={() => setActiveSubTab('SUPPORT')}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            fontSize: '0.9rem',
            fontWeight: 600,
            backgroundColor: activeSubTab === 'SUPPORT' ? '#4f46e5' : '#ffffff',
            color: activeSubTab === 'SUPPORT' ? '#ffffff' : '#64748b',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <LifeBuoy size={18} /> Help & Support
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

      {/* Loyalty Tab */}
      {activeSubTab === 'LOYALTY' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>Loyalty Points & Rewards</h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Earn points on recharges and convert them directly into free airtime or data boosters.
              </p>
            </div>
            {loyalty && (
              <div style={{
                textAlign: 'right',
                backgroundColor: '#fef3c7',
                border: '1px solid #fde68a',
                padding: '10px 18px',
                borderRadius: 10
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e', textTransform: 'uppercase' }}>Available Balance</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#78350f' }}>{loyalty.points || 500} pts</div>
              </div>
            )}
          </div>

          {!isAuthenticated ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ color: '#64748b', marginBottom: 12 }}>Sign in to view your loyalty tier and redeem prizes.</p>
              <button onClick={onOpenLogin} className="btn-primary">Sign In to Redeem</button>
            </div>
          ) : (
            <form onSubmit={handleRedeemLoyalty} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                  Points to Redeem
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {[100, 250, 500, 1000].map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setRedeemPoints(pt)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        backgroundColor: redeemPoints === pt ? '#4f46e5' : '#f1f5f9',
                        color: redeemPoints === pt ? '#ffffff' : '#334155'
                      }}
                    >
                      {pt} pts
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={50}
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(Number(e.target.value))}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                  Select Reward Type
                </label>
                <select
                  value={rewardType}
                  onChange={(e) => setRewardType(e.target.value as any)}
                  style={{ width: '100%' }}
                >
                  <option value="AIRTIME">Free Airtime Top-Up (1 pt = ₦1)</option>
                  <option value="DATA_BUNDLE">High-Speed 4G Data Booster</option>
                </select>
              </div>

              <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent: 'center', padding: '12px' }}>
                {loading ? 'Redeeming...' : `Convert ${redeemPoints} Points to ${rewardType}`}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Stores Tab */}
      {activeSubTab === 'STORES' && (
        <div className="card">
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
            TeleWyz Experience Centers & Stores
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 16 }}>
            Find customer care kiosks and SIM registration stores near you.
          </p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <input
              type="text"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="Search city (e.g. Lagos, Abuja, Port Harcourt)..."
              style={{ flex: 1 }}
            />
            <button onClick={fetchStores} className="btn-primary">Search</button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Locating stores...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stores.map((s, idx) => (
                <div key={idx} style={{ padding: 14, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: 4 }}>{s.address}, {s.city}</div>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginTop: 6 }}>
                    ● Open: {s.hours || '8:00 AM - 6:00 PM'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Coverage Tab */}
      {activeSubTab === 'COVERAGE' && (
        <div className="card">
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
            4G LTE & 5G Network Coverage
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 16 }}>
            Check signal availability across Nigerian states and metropolitan hubs.
          </p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <select
              value={coverageState}
              onChange={(e) => setCoverageState(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="Lagos">Lagos State</option>
              <option value="Abuja">Abuja FCT</option>
              <option value="Rivers">Rivers (Port Harcourt)</option>
              <option value="Oyo">Oyo (Ibadan)</option>
              <option value="Kano">Kano State</option>
            </select>
            <button onClick={fetchCoverage} className="btn-primary">Check Signal</button>
          </div>

          {coverageData && (
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 10,
              padding: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <CheckCircle2 size={24} color="#16a34a" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#166534' }}>
                  Ultra-Fast 5G & 4G Coverage Available in {coverageState}
                </h3>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#15803d', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div>● <strong>5G Standalone (SA):</strong> Supported (Speed up to 1Gbps)</div>
                <div>● <strong>4G LTE Advanced:</strong> 99.4% Territorial Coverage</div>
                <div>● <strong>VoLTE (Voice over LTE):</strong> Active on all compatible devices</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Support Tab */}
      {activeSubTab === 'SUPPORT' && (
        <div className="card">
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
            Raise a Customer Support Ticket
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 20 }}>
            Submit an inquiry or report an incident directly to TeleWyz Tier-2 NOC / Customer Operations.
          </p>

          <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Category</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value as any)}
                  style={{ width: '100%' }}
                >
                  <option value="NETWORK">Network Signal / Quality</option>
                  <option value="BILLING">Billing & Recharge Dispute</option>
                  <option value="SIM">SIM & KYC Activation</option>
                  <option value="VAS">Value Added Services</option>
                  <option value="GENERAL">General Inquiry</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Priority</label>
                <select
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value as any)}
                  style={{ width: '100%' }}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent (Loss of Service)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Subject</label>
              <input
                type="text"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>Detailed Description</label>
              <textarea
                value={ticketDesc}
                onChange={(e) => setTicketDesc(e.target.value)}
                rows={4}
                required
                style={{ width: '100%' }}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent: 'center', padding: '12px' }}>
              {loading ? 'Submitting Ticket...' : 'Submit Support Ticket'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
