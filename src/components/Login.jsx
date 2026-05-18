import React, { useState, useEffect } from 'react';
import { Lock, User, CheckSquare, Square, ScanLine, ShieldAlert } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('easyscan_remember_v29');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.remember) {
          setUsername(parsed.username || '');
          setPassword(parsed.password || '');
          setRemember(true);
        }
      } catch (e) {}
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const users = JSON.parse(localStorage.getItem('easyscan_users_v29')) || [];
    const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password);

    if (!user) {
      setError('Invalid username or password');
      return;
    }

    if (remember) {
      localStorage.setItem('easyscan_remember_v29', JSON.stringify({ username: username.trim(), password, remember: true }));
    } else {
      localStorage.removeItem('easyscan_remember_v29');
    }

    onLogin(user);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px', backgroundColor: 'var(--bg-app)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '24px', backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', backgroundColor: 'var(--primary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 16px rgba(10, 132, 255, 0.4)' }}>
            <ScanLine size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">EasyScan Enterprise</h2>
            <p className="text-xs text-muted" style={{ marginTop: '4px' }}>Warehouse Integrity & Audit System</p>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--error)', fontSize: '13px', fontWeight: 600 }}>
            <ShieldAlert size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>USERNAME</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                className="input-text" 
                style={{ paddingLeft: '42px', paddingRight: '14px', height: '44px', fontSize: '14px' }} 
                placeholder="e.g. pegasus.spare"
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                type="password" 
                className="input-text" 
                style={{ paddingLeft: '42px', paddingRight: '14px', height: '44px', fontSize: '14px' }} 
                placeholder="••••••••"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button 
              type="button"
              onClick={() => setRemember(!remember)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }}
            >
              {remember ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} />}
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Remember Me</span>
            </button>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ height: '46px', fontSize: '15px', fontWeight: 700, borderRadius: '8px', marginTop: '8px', boxShadow: '0 4px 12px rgba(10, 132, 255, 0.3)' }}
          >
            Login to EasyScan
          </button>
        </form>

        <div style={{ textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <p className="text-xs text-muted">
            Developed by <strong>Tejas</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
