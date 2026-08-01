import React, { useState, useEffect } from 'react';

export default function SettingsView({ stats, fetchStats, showToast, apiBase, currentUser }) {
  const [mockEmail, setMockEmail] = useState(false);
  const [emailProvider, setEmailProvider] = useState("smtp");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("induction@dpgu.edu.in");
  const [smtpFromName, setSmtpFromName] = useState("DPGU STR Induction Team");
  
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [wipingDb, setWipingDb] = useState(false);

  const deptQuery = currentUser?.department ? `?dept=${encodeURIComponent(currentUser.department)}` : "";

  useEffect(() => {
    loadSettings();
  }, [currentUser]);

  const loadSettings = async () => {
    try {
      const res = await fetch(`${apiBase}/api/settings${deptQuery}`);
      if (res.ok) {
        const data = await res.json();
        setMockEmail(data.mock_email);
        setEmailProvider(data.email_provider || "smtp");
        setSmtpHost(data.smtp_host);
        setSmtpPort(data.smtp_port);
        setSmtpUser(data.smtp_user);
        setSmtpPassword(data.smtp_password);
        setSmtpFrom(data.smtp_from);
        setSmtpFromName(data.smtp_from_name);
      }
    } catch (err) {
      console.error("Failed to load SMTP settings from backend:", err);
    }
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    const settingsPayload = {
      mock_email: mockEmail,
      email_provider: emailProvider,
      smtp_host: smtpHost,
      smtp_port: parseInt(smtpPort),
      smtp_user: smtpUser,
      smtp_password: smtpPassword,
      smtp_from: smtpFrom,
      smtp_from_name: smtpFromName
    };

    try {
      const res = await fetch(`${apiBase}/api/settings${deptQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsPayload)
      });
      if (res.ok) {
        showToast("Success", `Configuration settings saved for ${currentUser?.department || 'System'}.`, "success");
        fetchStats();
      } else {
        showToast("Error", "Failed to save configuration settings.", "error");
      }
    } catch (err) {
      showToast("Error", "Server connection failed.", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestSmtp = async (e) => {
    e.preventDefault();
    setTestingSmtp(true);
    
    const settingsPayload = {
      mock_email: mockEmail,
      email_provider: emailProvider,
      smtp_host: smtpHost,
      smtp_port: parseInt(smtpPort),
      smtp_user: smtpUser,
      smtp_password: smtpPassword,
      smtp_from: smtpFrom,
      smtp_from_name: smtpFromName
    };

    try {
      const res = await fetch(`${apiBase}/api/settings/test-smtp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsPayload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Success", data.message, "success");
      } else {
        showToast("Email Connection Failed", data.message || "Failed to reach server.", "error");
      }
    } catch (err) {
      showToast("Error", "Server communication failed.", "error");
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleResetSystem = async () => {
    if (resetConfirmText !== "RESET") return;
    setWipingDb(true);
    try {
      const res = await fetch(`${apiBase}/api/students/reset${deptQuery}`, {
        method: "POST"
      });
      if (res.ok) {
        showToast("System Reset", `All data for ${currentUser?.department || 'all departments'} has been wiped.`, "success");
        setResetConfirmText("");
        fetchStats();
      } else {
        showToast("Error", "Failed to wipe system data.", "error");
      }
    } catch (err) {
      showToast("Error", "Server connection failed.", "error");
    } finally {
      setWipingDb(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px', margin: '@media (min-width: 1024px)' }} className="settings-grid-layout">
      {/* Email / SMTP settings */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            Email Dispatch Settings
          </h2>
        </div>

        <form onSubmit={handleTestSmtp}>
          <div className="settings-form-group" style={{ marginBottom: '20px' }}>
            <label className="settings-label">Email Dispatch Method</label>
            <select 
              className="settings-input"
              value={emailProvider}
              onChange={(e) => setEmailProvider(e.target.value)}
              style={{ background: 'rgba(30, 27, 75, 0.5)', color: '#fff', cursor: 'pointer' }}
            >
              <option value="smtp">Standard SMTP (Username/Password)</option>
              <option value="gmail_oauth">Google OAuth2 (Gmail API)</option>
            </select>
          </div>

          {emailProvider === 'gmail_oauth' && (
            <div style={{ 
              background: 'rgba(79, 70, 229, 0.1)', 
              border: '1px solid rgba(79, 70, 229, 0.25)', 
              borderRadius: '12px', 
              padding: '15px', 
              marginBottom: '20px', 
              fontSize: '14.5px', 
              lineHeight: '1.5',
              color: 'rgba(255, 255, 255, 0.85)' 
            }}>
              <strong style={{ color: '#a5b4fc', display: 'block', marginBottom: '5px' }}>Google OAuth2 Setup:</strong>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Make sure your <code>client_secret_*.json</code> file is placed in your backend folder.</li>
                <li>Clicking <strong>Test Connection</strong> will open a browser window locally to authorize your account (e.g. <code>info.str@dypdpu.edu.in</code>).</li>
                <li>After authorization, a <code>token.json</code> file is generated locally, allowing automated sends without future prompts.</li>
              </ul>
            </div>
          )}

          {emailProvider === 'smtp' && (
            <div className="settings-row-grid">
              <div className="settings-form-group">
                <label className="settings-label">SMTP Server Host</label>
                <input 
                  type="text" 
                  className="settings-input" 
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  required={emailProvider === 'smtp'}
                />
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Port</label>
                <input 
                  type="number" 
                  className="settings-input" 
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(parseInt(e.target.value))}
                  required={emailProvider === 'smtp'}
                />
              </div>
            </div>
          )}

          <div className="settings-row-grid">
            <div className="settings-form-group">
              <label className="settings-label">
                {emailProvider === 'gmail_oauth' ? "Authorized Account Email" : "Username / Username Email"}
              </label>
              <input 
                type="text" 
                className="settings-input" 
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="e.g. info.str@dypdpu.edu.in"
                required
              />
            </div>
            {emailProvider === 'smtp' && (
              <div className="settings-form-group">
                <label className="settings-label">Password / App Password</label>
                <input 
                  type="password" 
                  className="settings-input" 
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder="SMTP account password"
                  required={emailProvider === 'smtp'}
                />
              </div>
            )}
          </div>

          <div className="settings-row-grid">
            <div className="settings-form-group">
              <label className="settings-label">Sender Email Address</label>
              <input 
                type="email" 
                className="settings-input" 
                value={smtpFrom}
                onChange={(e) => setSmtpFrom(e.target.value)}
                required
              />
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Sender Display Name</label>
              <input 
                type="text" 
                className="settings-input" 
                value={smtpFromName}
                onChange={(e) => setSmtpFromName(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={testingSmtp}
            >
              {testingSmtp 
                ? "Connecting & Sending..." 
                : (emailProvider === 'gmail_oauth' ? "Test OAuth Connection" : "Test SMTP Connection")}
            </button>
          </div>
        </form>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '20px' }}>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={handleSaveSettings}
            disabled={savingSettings}
          >
            {savingSettings ? "Saving Settings..." : "Save Configuration Settings"}
          </button>
        </div>
      </div>

      {/* Database control — visible to Induction Admin only */}
      {currentUser?.username === 'admin' && (
      <div className="panel" style={{ border: '1px solid rgba(239, 68, 68, 0.15)' }}>
        <div className="panel-header" style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.1)' }}>
          <h2 className="panel-title" style={{ color: '#fca5a5' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Danger Zone
          </h2>
        </div>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Wiping the system will permanently drop all registered student rows from the database and delete all generated QR code images and local mock email HTML pass files. This cannot be undone.
        </p>

        <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed rgba(239, 68, 68, 0.25)', borderRadius: '12px', padding: '20px' }}>
          <div className="settings-form-group">
            <label className="settings-label" style={{ color: '#fca5a5' }}>
              To verify deletion, type <strong>RESET</strong> in the input below:
            </label>
            <input 
              type="text" 
              className="settings-input" 
              style={{ borderColor: resetConfirmText === "RESET" ? 'var(--color-error)' : 'var(--border-glass)' }}
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="Type RESET here"
            />
          </div>

          <button 
            className="btn btn-danger"
            style={{ width: '100%' }}
            onClick={handleResetSystem}
            disabled={resetConfirmText !== "RESET" || wipingDb}
          >
            {wipingDb ? "Wiping Database..." : "Permanently Reset All System Data"}
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
