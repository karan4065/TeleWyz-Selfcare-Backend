import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { DashboardTab } from './components/DashboardTab';
import { PlansTab } from './components/PlansTab';
import { NumbersTab } from './components/NumbersTab';
import { SimKycTab } from './components/SimKycTab';
import { MnpTab } from './components/MnpTab';
import { PaymentsTab } from './components/PaymentsTab';
import { FamilyTab } from './components/FamilyTab';
import { ServicesTab } from './components/ServicesTab';
import { api } from './api/client';
import { Activity, ExternalLink, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [selectedMsisdnForSim, setSelectedMsisdnForSim] = useState<string | undefined>(undefined);
  const [backendHealth, setBackendHealth] = useState<'CHECKING' | 'ONLINE' | 'OFFLINE'>('CHECKING');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await api.get('/health');
        setBackendHealth('ONLINE');
      } catch {
        setBackendHealth('OFFLINE');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectMsisdnForSim = (msisdn: string) => {
    setSelectedMsisdnForSim(msisdn);
    setActiveTab('sim');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
      <Navbar
        onOpenLogin={() => setIsLoginOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', padding: '24px 20px' }}>
        {activeTab === 'dashboard' && (
          <DashboardTab
            onOpenLogin={() => setIsLoginOpen(true)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === 'plans' && <PlansTab onOpenLogin={() => setIsLoginOpen(true)} />}
        {activeTab === 'numbers' && <NumbersTab onSelectMsisdnForSim={handleSelectMsisdnForSim} />}
        {activeTab === 'sim' && <SimKycTab initialMsisdn={selectedMsisdnForSim} />}
        {activeTab === 'mnp' && <MnpTab />}
        {activeTab === 'payments' && <PaymentsTab />}
        {activeTab === 'family' && <FamilyTab onOpenLogin={() => setIsLoginOpen(true)} />}
        {activeTab === 'services' && <ServicesTab onOpenLogin={() => setIsLoginOpen(true)} />}
      </main>

      {/* Global Auth Modal */}
      <AuthModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      {/* Footer */}
      <footer style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '20px 24px',
        marginTop: 40
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
              TeleWyz E-Care Telecom Platform
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              BSS / Optiva EPC • NIMC / NCC KYC • Postpaid / Prepaid Real-Time Architecture
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Backend status indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.8rem',
              fontWeight: 600,
              color: backendHealth === 'ONLINE' ? '#16a34a' : backendHealth === 'CHECKING' ? '#f59e0b' : '#dc2626'
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: backendHealth === 'ONLINE' ? '#16a34a' : backendHealth === 'CHECKING' ? '#f59e0b' : '#dc2626',
                display: 'inline-block'
              }} />
              Backend: {backendHealth}
            </div>

            <a
              href="http://localhost:3000/api-docs"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.8rem',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              Swagger Docs <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
