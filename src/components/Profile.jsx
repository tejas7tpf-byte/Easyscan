import React, { useState } from 'react';
import { Store, MapPin, CheckCircle2, User, HardDrive, ShieldCheck, ArrowRight, Plus, Users, Key, LogOut, RefreshCw, AlertCircle } from 'lucide-react';

const Profile = ({ 
  currentUser, 
  locations, 
  users, 
  onAddLocation, 
  onAddUser, 
  onResetPassword, 
  onChangePassword, 
  onLogout, 
  currentLocation, 
  onSelectLocation 
}) => {
  // New Location State
  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locMsg, setLocMsg] = useState('');

  // New User State
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newLocId, setNewLocId] = useState('vastral');
  const [userMsg, setUserMsg] = useState('');

  // Change Password State
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState('');

  const handleAddLocationSubmit = (e) => {
    e.preventDefault();
    if (!locName.trim() || !locCode.trim()) return;
    const id = locName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    onAddLocation({ id, name: locName.trim(), code: locCode.trim().toUpperCase(), address: locAddress.trim() || 'N/A' });
    setLocName(''); setLocCode(''); setLocAddress('');
    setLocMsg('New location added successfully!');
    setTimeout(() => setLocMsg(''), 3000);
  };

  const handleAddUserSubmit = (e) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    onAddUser({ 
      username: newUsername.trim(), 
      password: '123', 
      role: newRole, 
      name: `${newUsername.trim()} Manager`, 
      locationId: newRole === 'admin' ? 'all' : newLocId 
    });
    setNewUsername('');
    setUserMsg('New user created with default password: 123');
    setTimeout(() => setUserMsg(''), 4000);
  };

  const handleChangePassSubmit = (e) => {
    e.preventDefault();
    const success = onChangePassword(oldPass, newPass);
    if (success) {
      setPassMsg('Password updated successfully!');
      setOldPass(''); setNewPass('');
    } else {
      setPassMsg('Error: Incorrect current password.');
    }
    setTimeout(() => setPassMsg(''), 3000);
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.username === 'pegasus.spare';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="text-2xl font-bold">Store Profile & Administration</h2>
          <p className="text-sm text-muted" style={{ marginTop: '4px' }}>
            {isAdmin ? "Master Administration Hub: Manage locations, users, and passwords." : "Manage your store profile and update your account password."}
          </p>
        </div>
        <button 
          onClick={onLogout}
          className="btn" 
          style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', color: 'var(--error)', border: '1px solid rgba(255, 59, 48, 0.3)', padding: '10px 16px', fontWeight: 700, gap: '8px' }}
        >
          <LogOut size={18} /> Logout
        </button>
      </div>

      {/* Current User Summary */}
      <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--bg-surface)', borderColor: isAdmin ? 'var(--primary)' : 'var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: isAdmin ? 'rgba(10, 132, 255, 0.1)' : 'rgba(52, 199, 89, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isAdmin ? 'var(--primary)' : 'var(--success)' }}>
            <User size={28} />
          </div>
          <div>
            <h3 className="text-lg font-bold">{currentUser?.name || currentUser?.username}</h3>
            <p className="text-xs text-muted" style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>User ID: {currentUser?.username}</span>
              <span>• Role: {isAdmin ? 'Master Administrator' : 'Store Manager'}</span>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <HardDrive size={16} className="text-primary" />
            <span>Storage: <strong>Local Isolated Persistent (v29)</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <ShieldCheck size={16} className="text-success" />
            <span>Assigned Location: <strong>{isAdmin ? 'All Locations (Master)' : (locations.find(l => l.id === currentUser?.locationId)?.name || currentUser?.locationId)}</strong></span>
          </div>
        </div>
      </div>

      {/* Change Password Section (For Everyone) */}
      <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Key size={20} className="text-primary" />
          <h3 className="font-bold text-base">Change Your Password</h3>
        </div>
        {passMsg && (
          <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: passMsg.includes('Error') ? 'rgba(255,59,48,0.1)' : 'rgba(52,199,89,0.1)', color: passMsg.includes('Error') ? 'var(--error)' : 'var(--success)', fontSize: '13px', fontWeight: 600 }}>
            {passMsg}
          </div>
        )}
        <form onSubmit={handleChangePassSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>CURRENT PASSWORD</label>
            <input type="password" className="input-text" value={oldPass} onChange={e => setOldPass(e.target.value)} required placeholder="••••••••" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>NEW PASSWORD</label>
            <input type="password" className="input-text" value={newPass} onChange={e => setNewPass(e.target.value)} required placeholder="••••••••" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '42px', fontWeight: 700 }}>Update Password</button>
        </form>
      </div>

      {/* Location Switcher */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 className="text-sm font-bold text-muted uppercase" style={{ paddingLeft: '4px' }}>Active Store Locations ({locations.length})</h3>
        <p className="text-xs text-muted" style={{ marginTop: '-8px', paddingLeft: '4px' }}>
          {isAdmin ? "As Master Admin, you can switch into any store location to inspect or manage its data." : "Your account is assigned to the store below."}
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {locations.map((loc) => {
            const isActive = currentLocation === loc.id;
            const canSwitch = isAdmin || currentUser?.locationId === loc.id;
            return (
              <div 
                key={loc.id} 
                className={`card ${canSwitch ? 'card-clickable' : ''}`}
                onClick={() => canSwitch && onSelectLocation(loc.id)}
                style={{ 
                  padding: '20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: '16px',
                  cursor: canSwitch ? 'pointer' : 'default',
                  borderColor: isActive ? 'var(--success)' : 'var(--border-color)',
                  backgroundColor: isActive ? 'rgba(52, 199, 89, 0.05)' : 'var(--bg-card)',
                  opacity: canSwitch ? 1 : 0.5
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: isActive ? 'var(--success)' : 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? '#fff' : 'var(--text-secondary)' }}>
                    <Store size={22} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 className="font-bold text-base">{loc.name}</h4>
                      <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: 'var(--bg-surface)', padding: '2px 6px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        {loc.code}
                      </span>
                    </div>
                    <p className="text-xs text-muted" style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} style={{ flexShrink: 0 }} /> {loc.address}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isActive ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(52, 199, 89, 0.1)', color: 'var(--success)', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 700 }}>
                      <CheckCircle2 size={16} /> Active Store
                    </div>
                  ) : canSwitch ? (
                    <button className="btn btn-sm" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '12px', fontWeight: 600 }}>
                      Switch <ArrowRight size={14} />
                    </button>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Restricted</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MASTER ADMIN SECTION: Add Location & Add User */}
      {isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '16px', paddingTop: '24px', borderTop: '2px solid var(--border-color)' }}>
          <div>
            <h3 className="text-xl font-bold" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={24} /> Master Admin Control Panel
            </h3>
            <p className="text-xs text-muted" style={{ marginTop: '4px' }}>Add new store locations, create user accounts, and reset employee passwords.</p>
          </div>

          {/* Add New Location Form */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--bg-surface)' }}>
            <h4 className="font-bold text-base" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} className="text-primary" /> Create New Store Location
            </h4>
            {locMsg && (
              <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: 'rgba(52,199,89,0.1)', color: 'var(--success)', fontSize: '13px', fontWeight: 600 }}>
                {locMsg}
              </div>
            )}
            <form onSubmit={handleAddLocationSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>STORE NAME</label>
                <input type="text" className="input-text" value={locName} onChange={e => setLocName(e.target.value)} placeholder="e.g. Rajkot Store" required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>STORE CODE</label>
                <input type="text" className="input-text" value={locCode} onChange={e => setLocCode(e.target.value)} placeholder="e.g. RAJ-06" required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>ADDRESS</label>
                <input type="text" className="input-text" value={locAddress} onChange={e => setLocAddress(e.target.value)} placeholder="e.g. 12 Ring Road" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ height: '42px', fontWeight: 700 }}>Add Location</button>
            </form>
          </div>

          {/* Add New User Form */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--bg-surface)' }}>
            <h4 className="font-bold text-base" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} className="text-primary" /> Create New User Account
            </h4>
            {userMsg && (
              <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: 'rgba(52,199,89,0.1)', color: 'var(--success)', fontSize: '13px', fontWeight: 600 }}>
                {userMsg}
              </div>
            )}
            <form onSubmit={handleAddUserSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>USERNAME</label>
                <input type="text" className="input-text" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="e.g. rajkot.user" required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>ASSIGNED LOCATION</label>
                <select className="input-text" value={newLocId} onChange={e => setNewLocId(e.target.value)} style={{ height: '42px' }}>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>ROLE</label>
                <select className="input-text" value={newRole} onChange={e => setNewRole(e.target.value)} style={{ height: '42px' }}>
                  <option value="user">Store Manager (User)</option>
                  <option value="admin">Master Admin (All Locations)</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ height: '42px', fontWeight: 700 }}>Create User</button>
            </form>
          </div>

          {/* User Management & Password Resets List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 className="font-bold text-sm uppercase text-muted" style={{ paddingLeft: '4px' }}>User Accounts & Password Resets ({users.length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {users.map(u => (
                <div key={u.username} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: u.role === 'admin' ? 'rgba(10, 132, 255, 0.1)' : 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: u.role === 'admin' ? 'var(--primary)' : 'var(--text-secondary)' }}>
                      <User size={18} />
                    </div>
                    <div>
                      <h5 className="font-bold text-sm">{u.username}</h5>
                      <p className="text-xs text-muted" style={{ marginTop: '2px' }}>
                        Role: {u.role === 'admin' ? 'Admin' : 'User'} | Store: {u.locationId === 'all' ? 'All (Master)' : (locations.find(l => l.id === u.locationId)?.name || u.locationId)}
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      onResetPassword(u.username);
                      alert(`Password for ${u.username} has been reset to default: 123`);
                    }}
                    className="btn btn-sm" 
                    style={{ backgroundColor: 'rgba(255, 149, 0, 0.1)', color: 'var(--warning)', border: '1px solid rgba(255, 149, 0, 0.3)', fontWeight: 600, gap: '6px' }}
                  >
                    <RefreshCw size={14} /> Reset Pass to 123
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
