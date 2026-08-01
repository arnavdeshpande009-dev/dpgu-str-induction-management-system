import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function ScannerView({ fetchStats, showToast, apiBase, currentUser }) {
  const [scanHistory, setScanHistory] = useState([]);
  const [activeScan, setActiveScan] = useState(false);
  const [currentResult, setCurrentResult] = useState(null); // { success: bool, name: str, message: str }
  const [manualToken, setManualToken] = useState("");
  const html5QrCodeRef = useRef(null);
  const scannerId = "qr-reader-viewport";

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const playSound = (type) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 (Pleasant high tone)
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.stop(audioCtx.currentTime + 0.15);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime); // Low buzz
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.stop(audioCtx.currentTime + 0.35);
      }
    } catch (e) {
      console.warn("Audio Context playback blocked by browser/gesture restriction", e);
    }
  };

  const startScanner = async () => {
    try {
      setActiveScan(true);
      setCurrentResult(null);
      
      // Request camera permissions and get list
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        showToast("Error", "No cameras found on your device.", "error");
        setActiveScan(false);
        return;
      }
      
      // Default to back/rear camera if available
      const backCamera = devices.find(device => 
        device.label.toLowerCase().includes("back") || 
        device.label.toLowerCase().includes("rear") ||
        device.label.toLowerCase().includes("environment")
      );
      const cameraId = backCamera ? backCamera.id : devices[0].id;
      
      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          // Prevent rapid double-scans of the same token
          stopScanner();
          await handleScannedToken(decodedText);
        },
        (errorMessage) => {
          // Volatile error logs on frame search - silent skip
        }
      );
    } catch (err) {
      console.error("Failed to start scanner:", err);
      showToast("Error", "Unable to access camera permissions.", "error");
      setActiveScan(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner", err);
      }
    }
    setActiveScan(false);
  };

  const handleScannedToken = async (token) => {
    // Basic verification format check
    if (!token || !token.startsWith("DPGU-IND-")) {
      playSound('error');
      const resultObj = { success: false, name: "Unknown Pass", message: "Invalid QR format. Not a DPGU token." };
      setCurrentResult(resultObj);
      addToHistory(resultObj);
      return;
    }

    try {
      const deptQuery = currentUser?.department ? `?dept=${encodeURIComponent(currentUser.department)}` : "";
      const res = await fetch(`${apiBase}/api/students/checkin${deptQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: token })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.success) {
          playSound('success');
          const resultObj = { 
            success: true, 
            name: data.student ? data.student.name : "Student", 
            message: data.message,
            dept: data.student ? data.student.department : ""
          };
          setCurrentResult(resultObj);
          addToHistory(resultObj);
          fetchStats(); // Update dashboard stats in background
        } else {
          playSound('error');
          const resultObj = { 
            success: false, 
            name: data.student ? data.student.name : "Registered Student", 
            message: data.message 
          };
          setCurrentResult(resultObj);
          addToHistory(resultObj);
        }
      } else {
        playSound('error');
        const resultObj = { success: false, name: "Server Error", message: "Failed to verify check-in." };
        setCurrentResult(resultObj);
        addToHistory(resultObj);
      }
    } catch (err) {
      playSound('error');
      const resultObj = { success: false, name: "Connection Error", message: "Failed to reach server." };
      setCurrentResult(resultObj);
      addToHistory(resultObj);
    }
  };

  const addToHistory = (result) => {
    setScanHistory(prev => [
      {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        ...result
      },
      ...prev
    ].slice(0, 10)); // Keep last 10 entries
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          On-Site Camera QR Scanner
        </h2>
        <div>
          {activeScan ? (
            <button className="btn btn-danger" onClick={stopScanner}>
              Stop Scanner
            </button>
          ) : (
            <button className="btn btn-primary" onClick={startScanner}>
              Launch Camera
            </button>
          )}
        </div>
      </div>

      <div className="scanner-grid">
        {/* Viewfinder Column */}
        <div className="scanner-viewfinder-card">
          <div className="scanner-viewport" id={scannerId}>
            {!activeScan && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                textAlign: 'center',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>📷</div>
                <div style={{ fontWeight: '600', marginBottom: '5px', color: '#fff' }}>Camera Offline</div>
                <div style={{ fontSize: '12px' }}>Click 'Launch Camera' to initiate QR scanning</div>
              </div>
            )}
          </div>
          
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            {activeScan && (
              <div className="badge badge-email-sent" style={{ animation: 'pulse 1.5s infinite' }}>
                🔴 Viewfinder Active
              </div>
            )}
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!manualToken.trim()) return;
              stopScanner();
              handleScannedToken(manualToken.trim());
              setManualToken("");
            }} 
            style={{ 
              marginTop: '25px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '10px', 
              width: '100%', 
              maxWidth: '320px',
              padding: '15px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '12px',
              border: '1px solid var(--border-glass)'
            }}
          >
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
              Keyboard Check-in (Backup / Mock Testing):
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                className="settings-input" 
                style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                placeholder="Enter Student ID (e.g. DPGU-IND-1001-XXXX)" 
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0 16px', fontSize: '13px' }}>
                Verify
              </button>
            </div>
          </form>
        </div>

        {/* Scan Log & Feedback Column */}
        <div>
          {/* Result Overlay Card */}
          {currentResult && (
            <div 
              className={`scan-alert-overlay ${currentResult.success ? 'scan-alert-success' : 'scan-alert-error'}`}
              style={{ marginBottom: '24px' }}
            >
              <div className="scan-alert-icon">
                {currentResult.success ? '✅' : '❌'}
              </div>
              <h3 style={{ fontFamily: 'var(--font-heading)', color: '#fff', fontSize: '20px', marginBottom: '6px' }}>
                {currentResult.name}
              </h3>
              <p style={{ fontSize: '14px', opacity: 0.95, maxWidth: '300px', margin: '0 auto' }}>
                {currentResult.message}
              </p>
              
              <button 
                className="btn btn-secondary" 
                style={{ marginTop: '16px', background: 'rgba(255,255,255,0.1)', padding: '6px 16px', fontSize: '12px' }}
                onClick={() => {
                  setCurrentResult(null);
                  if (activeScan === false) {
                    startScanner();
                  }
                }}
              >
                Scan Next Pass
              </button>
            </div>
          )}

          {/* History Log */}
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#fff', fontFamily: 'var(--font-heading)' }}>
              Recent Check-in Log
            </h3>
            <div className="scan-history-list">
              {scanHistory.length === 0 ? (
                <div style={{ padding: '24px', textAlignment: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                  Scan history is empty. Scanned passes will display here.
                </div>
              ) : (
                scanHistory.map((item) => (
                  <div key={item.id} className="scan-history-item">
                    <div className="scan-history-info">
                      <h4>{item.name}</h4>
                      <p>{item.dept ? `${item.dept} • ` : ''}{item.time}</p>
                    </div>
                    <div>
                      {item.success ? (
                        <span className="badge badge-success">Success</span>
                      ) : (
                        <span className="badge badge-pending" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.25)' }}>
                          Alert
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
