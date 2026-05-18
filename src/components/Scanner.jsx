import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Smartphone, Bluetooth, Keyboard, Search, Scan } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const Scanner = ({ onScan, onChange, value = '', placeholder = "Scan identifier...", autoClear = true, focusTrigger = 0 }) => {
  const [inputValue, setInputValue] = useState(value);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
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
      // Small delay to ensure the DOM element 'reader' is fully painted
      timeoutId = setTimeout(() => {
        try {
          html5QrCode = new Html5Qrcode("reader");
          
          const config = {
            fps: 10,
            qrbox: { width: 280, height: 150 },
            aspectRatio: 1.0
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
            // Attempt to apply hardware zoom AFTER camera successfully starts
            try {
              const track = html5QrCode.getRunningTrack();
              if (track && track.getCapabilities && track.applyConstraints) {
                const capabilities = track.getCapabilities();
                if (capabilities.zoom) {
                  track.applyConstraints({
                    advanced: [{ zoom: Math.min(2.0, capabilities.zoom.max) }]
                  }).catch(() => {});
                }
              }
            } catch(e) {
               console.warn("Hardware zoom not supported or failed", e);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {isCameraOpen && (
        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: '12px', border: '1px solid var(--primary)', marginBottom: '4px' }}>
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
          <div id="reader" style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000' }}></div>
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
          onClick={() => setIsCameraOpen(true)}
          className="btn"
          style={{ width: '64px', height: '64px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--primary)', padding: 0 }}
        >
          <Camera size={28} />
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
