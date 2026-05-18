import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Smartphone, Bluetooth, Keyboard, Search, Scan, Box, CheckCircle2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const Scanner = ({ onScan, onChange, value = '', placeholder = "Scan identifier...", autoClear = true, focusTrigger = 0, isCameraOpenProp, setIsCameraOpenProp, inlineDetail, onInlineOk, onInlineCancel }) => {
  const [inputValue, setInputValue] = useState(value);
  const [internalCameraOpen, setInternalCameraOpen] = useState(false);
  const [digitalZoom, setDigitalZoom] = useState(1.0);
  
  const isCameraOpen = setIsCameraOpenProp ? isCameraOpenProp : internalCameraOpen;
  const setIsCameraOpen = setIsCameraOpenProp ? setIsCameraOpenProp : setInternalCameraOpen;
  
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

  useEffect(() => {
    let html5QrCode = null;
    let lastScannedText = '';
    let lastScanTime = 0;
    let timeoutId = null;

    if (isCameraOpen) {
      setDigitalZoom(1.0); // Reset zoom
      // Small delay to ensure the DOM element 'reader' is fully painted
      timeoutId = setTimeout(() => {
        try {
          html5QrCode = new Html5Qrcode("reader");
          
          const config = {
            fps: 10,
            aspectRatio: 1.5 // Wide aspect ratio to save vertical space
          };
          
          html5QrCode.start(
            { facingMode: "environment" }, 
            config,
            (decodedText) => {
              const now = Date.now();
              // Prevent duplicate scans within 2 seconds
              if (decodedText !== lastScannedText || (now - lastScanTime) > 2000) {
                lastScannedText = decodedText;
                lastScanTime = now;
                onScan(decodedText);
                
                // Flash the screen briefly to indicate scan
                const readerElement = document.getElementById('reader');
                if (readerElement) {
                  readerElement.style.opacity = '0.5';
                  setTimeout(() => {
                    if (readerElement) readerElement.style.opacity = '1';
                  }, 150);
                }
              }
            },
            (errorMessage) => {
              // Ignore parse errors
            }
          ).then(() => {
            // Apply initial CSS zoom
            const videoObj = document.querySelector('#reader video');
            if (videoObj) {
              videoObj.style.transform = `scale(1.0)`;
              videoObj.style.transformOrigin = 'center center';
            }
          }).catch((err) => {
            console.error("Camera start failed", err);
          });
        } catch (err) {
          console.error("Html5Qrcode initialization failed", err);
        }
      }, 100);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error);
      }
    };
  }, [isCameraOpen, onScan]);

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

  const handleZoomChange = (e) => {
    const val = parseFloat(e.target.value);
    setDigitalZoom(val);
    const videoObj = document.querySelector('#reader video');
    if (videoObj) {
      videoObj.style.transform = `scale(${val})`;
    }
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

      {/* Camera view — hidden when inlineDetail is showing */}
      {isCameraOpen && !inlineDetail && (
        <div className="animate-fade-in" style={{ backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: '12px', border: '1px solid var(--primary)', marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={14} /> LIVE SCANNER
            </span>
            <button 
              onClick={() => setIsCameraOpen(false)}
              className="btn btn-xs"
              style={{ backgroundColor: 'rgba(255,59,48,0.1)', color: 'var(--danger)', padding: '4px' }}
            >
              <X size={16} />
            </button>
          </div>
          
          <div id="reader" style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000', maxHeight: '35vh' }}></div>
          
          {/* Universal Zoom Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', padding: '0 8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>Zoom</span>
            <input 
              type="range" 
              min="1.0" max="3.0" step="0.1" 
              value={digitalZoom}
              onChange={handleZoomChange}
              style={{ flex: 1, accentColor: 'var(--primary)' }}
            />
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', minWidth: '30px' }}>{digitalZoom.toFixed(1)}x</span>
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
            style={{ paddingLeft: '48px', fontSize: '18px', fontWeight: 600, height: '64px' }}
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

        <button 
          onClick={() => setIsCameraOpen(!isCameraOpen)}
          className="btn"
          style={{ width: '64px', height: '64px', backgroundColor: isCameraOpen ? 'var(--primary)' : 'var(--bg-card)', border: '1px solid var(--border-color)', color: isCameraOpen ? '#FFF' : 'var(--primary)', padding: 0 }}
        >
          {isCameraOpen ? <X size={28} /> : <Camera size={28} />}
        </button>
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
