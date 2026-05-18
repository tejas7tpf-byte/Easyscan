import React from 'react';
import { 
  Smartphone, 
  Monitor, 
  Sun, 
  Moon, 
  ArrowLeft, 
  Database,
  LayoutDashboard,
  ScanLine,
  FileText,
  Store,
  Activity,
  LogOut
} from 'lucide-react';

const Layout = ({ 
  children, 
  activeTab, 
  onTabChange, 
  showBack, 
  onBack, 
  theme, 
  onThemeToggle, 
  viewMode, 
  onViewModeToggle,
  currentLocationName,
  onLogout 
}) => {
  return (
    <div className={`app-wrapper ${viewMode === 'mobile' ? 'mode-mobile' : 'mode-pc'}`}>
      
      {/* Premium Header */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {showBack ? (
            <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
              <ArrowLeft size={24} />
            </button>
          ) : (
            <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <ScanLine size={18} />
            </div>
          )}
          <div>
            <h1 className="font-bold text-lg" style={{ lineHeight: '1.2', display: 'flex', alignItems: 'center', gap: '6px' }}>
              EasyScan
              {currentLocationName && (
                <span style={{ fontSize: '11px', fontWeight: 600, backgroundColor: 'var(--bg-surface)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--primary)' }}>
                  {currentLocationName}
                </span>
              )}
            </h1>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onViewModeToggle} title="Toggle View Mode" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            {viewMode === 'pc' ? <Smartphone size={20} /> : <Monitor size={20} />}
          </button>
          <button onClick={onThemeToggle} title="Toggle Theme" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {onLogout && (
            <button onClick={onLogout} title="Logout" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}>
              <LogOut size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-content">
        {children}
      </main>

      {/* Premium Bottom Navigation */}
      <nav className="app-nav">
        {[
          { id: 'load', icon: Database, label: 'Data' },
          { id: 'analyse', icon: Activity, label: 'Analyse' },
          { id: 'shipment', icon: LayoutDashboard, label: 'Shipment' },
          { id: 'scan', icon: ScanLine, label: 'Receive' },
          { id: 'tally', icon: FileText, label: 'Report' },
          { id: 'profile', icon: Store, label: 'Profile' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button 
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                height: '100%'
              }}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span style={{ fontSize: '9px', fontWeight: isActive ? 600 : 500 }}>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  );
};

export default Layout;
