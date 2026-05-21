import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Smartphone, Bluetooth, Keyboard, Search, Scan, Box, CheckCircle2 } from 'lucide-react';

const Scanner = ({ onScan, onChange, value = '', placeholder = "Scan identifier...", autoClear = true, focusTrigger = 0, inlineDetail, onInlineOk, onInlineCancel }) => {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef(null);

  // Sync internal state with external value if provided
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Auto-focus logic
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [focusTrigger]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onScan(inputValue.trim());
      if (autoClear) {
        setInputValue('');
        if (onChange) onChange('');
      }
    }
  };

  const handleInputChange = (val) => {
    setInputValue(val);
    if (onChange) onChange(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Inline Detail Card — shown in place of camera after a scan match */}
      {inlineDetail && (
        <div className="animate-fade-in" style={{ backgroundColor: 'var(--bg-surface)', borderRadius: '12px', border: `2px solid ${inlineDetail.type === 'box' ? 'var(--primary)' : 'var(--success)'}`, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', backgroundColor: inlineDetail.type === 'box' ? 'rgba(0,122,255,0.12)' : 'rgba(52,199,89,0.12)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {inlineDetail.type === 'box'
              ? <Box size={20} color="var(--primary)" />
              : <CheckCircle2 size={20} color="var(--success)" />}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: '13px', color: inlineDetail.type === 'box' ? 'var(--primary)' : 'var(--success)' }}>
                {inlineDetail.type === 'box' ? `BOX FOUND ✓ — ${inlineDetail.boxId}` : 'PART FOUND ✓'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Press OK to confirm</div>
            </div>
          </div>
          {/* Body */}
          <div style={{ padding: '12px 16px' }}>
            {inlineDetail.type === 'part' ? (
              <>
                <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '6px' }}>{inlineDetail.partNumber}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{inlineDetail.description || '—'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Qty</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--primary)' }}>{inlineDetail.qty}</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Bin Location</div>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--success)' }}>{inlineDetail.binLocation || 'N/A'}</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Invoice</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{inlineDetail.invoiceNumber || '—'}</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Box/Carton</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{inlineDetail.boxId || '—'}</div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '30vh', overflowY: 'auto' }}>
                {(inlineDetail.parts || []).map((p, i) => (
                  <div key={i} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '12px' }}>{p.partNumber}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{p.description}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 900, fontSize: '12px', color: 'var(--primary)' }}>Qty: {p.qty}</div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--success)' }}>{p.binLocation || 'N/A'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Footer */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px' }}>
            <button onClick={onInlineCancel} className="btn" style={{ flex: 1, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 700, padding: '10px' }}>Cancel</button>
            <button onClick={onInlineOk} className="btn btn-primary" style={{ flex: 2, fontSize: '15px', fontWeight: 900, padding: '12px' }}>✓ OK — Confirmed</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <form onSubmit={handleSubmit} style={{ flex: 1, position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            ref={inputRef}
            type="text"
            className="input-text"
            style={{ paddingLeft: '48px', fontSize: '18px', fontWeight: 600, height: '64px', width: '100%' }}
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            autoFocus
          />
          <button 
            type="submit"
            className="btn btn-primary"
            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', padding: '10px', borderRadius: '10px' }}
          >
            <Search size={20} />
          </button>
        </form>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', width: 'fit-content' }}>
        <div style={{ display: 'flex', gap: '4px', color: 'var(--text-tertiary)' }}>
          <Bluetooth size={14} />
          <Smartphone size={14} />
          <Keyboard size={14} />
        </div>
        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hardware Ready</span>
      </div>
    </div>
  );
};

export default Scanner;
