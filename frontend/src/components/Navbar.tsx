import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Smartphone, LogIn, LogOut, Award, RefreshCw, UserCheck } from 'lucide-react';

interface NavbarProps {
  onOpenLogin: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenLogin, activeTab, setActiveTab }) => {
  const { isAuthenticated, subscriber, activeMsisdn, logout, refreshProfile } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'plans', label: 'Plans & Bundles' },
    { id: 'numbers', label: 'Number Reservation' },
    { id: 'sim', label: 'SIM & KYC' },
    { id: 'mnp', label: 'Port-In (MNP)' },
    { id: 'payments', label: 'Payments & Recharge' },
    { id: 'family', label: 'Family Accounts' },
    { id: 'services', label: 'More Services' }
  ];

  return (
    <header style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      {/* Top Banner Bar */}
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
            width: 38,
            height: 38,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <Smartphone size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
              Tele<span style={{ color: '#4f46e5' }}>Wyz</span> E-Care
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
              Telecom Self-Care Portal
            </div>
          </div>
        </div>

        {/* User Status / Auth Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isAuthenticated && subscriber ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* Active Line Badge */}
              <div style={{
                backgroundColor: '#eef2ff',
                color: '#4338ca',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <UserCheck size={16} />
                Line: <span>{activeMsisdn || subscriber.msisdn}</span>
                <span style={{
                  fontSize: '0.7rem',
                  backgroundColor: '#4338ca',
                  color: '#fff',
                  padding: '2px 6px',
                  borderRadius: 4
                }}>
                  {subscriber.accountType}
                </span>
              </div>

              {/* Loyalty Points */}
              <div style={{
                backgroundColor: '#fef3c7',
                color: '#92400e',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <Award size={16} />
                <span>{subscriber.loyaltyPoints ?? 500} pts</span>
              </div>

              {/* Refresh Profile */}
              <button
                onClick={() => refreshProfile()}
                title="Refresh Profile"
                style={{
                  padding: '8px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: 8,
                  color: '#475569'
                }}
              >
                <RefreshCw size={16} />
              </button>

              {/* Logout Button */}
              <button
                onClick={logout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="btn-primary"
              style={{ fontSize: '0.9rem', padding: '8px 18px' }}
            >
              <LogIn size={18} /> Sign In / Test OTP
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        borderTop: '1px solid #f1f5f9'
      }}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              padding: '12px 16px',
              fontSize: '0.9rem',
              fontWeight: activeTab === item.id ? 700 : 500,
              color: activeTab === item.id ? '#4f46e5' : '#64748b',
              backgroundColor: 'transparent',
              borderBottom: activeTab === item.id ? '2px solid #4f46e5' : '2px solid transparent',
              whiteSpace: 'nowrap'
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
};
