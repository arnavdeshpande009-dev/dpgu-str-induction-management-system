import React, { useState, useEffect } from 'react';
import DashboardView from './components/DashboardView';
import AttendanceView from './components/AttendanceView';
import ScannerView from './components/ScannerView';
import SettingsView from './components/SettingsView';
import UserManagementView from './components/UserManagementView';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.port === "8000" ? "" : "http://localhost:8000");

const LOGIN_PROFILES = [
  { username: 'admin', name: 'Induction Admin', role: 'admin' },
  ...Array.from({ length: 10 }, (_, i) => ({
    username: `emp${i + 1}`,
    name: `Employee ${i + 1}`,
    role: `employee`
  }))
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('dpgu_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);

  const [stats, setStats] = useState({
    total_students: 0,
    checked_in: 0,
    emails_sent: 0,
    check_in_rate: 0
  });
  
  const [toast, setToast] = useState({ show: false, title: "", message: "", type: "info" });

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin') {
        setActiveTab('dashboard');
        fetchStats();
      } else {
        setActiveTab('attendance');
      }
    }
  }, [currentUser]);

  const fetchStats = async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
      const res = await fetch(`${API_BASE}/api/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to connect to backend stats API", err);
    }
  };

  const showToast = (title, message, type = "info") => {
    setToast({ show: true, title, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginPin) {
      setLoginError("Please enter your PIN.");
      return;
    }
    setLoginError("");
    setAuthenticating(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, pin: loginPin })
      });

      if (res.ok) {
        const userData = await res.json();
        setCurrentUser(userData);
        localStorage.setItem('dpgu_user', JSON.stringify(userData));
        showToast("Welcome", `Logged in as ${userData.name}.`, "success");
        setLoginPin('');
      } else {
        const errData = await res.json();
        setLoginError(errData.detail || "Authentication failed.");
      }
    } catch (err) {
      console.error(err);
      setLoginError("Server communication failed.");
    } finally {
      setAuthenticating(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('dpgu_user');
    setLoginUsername('admin');
    setLoginPin('');
    setLoginError('');
  };

  const renderActiveView = () => {
    if (!currentUser) return null;

    switch (activeTab) {
      case 'dashboard':
        return currentUser.role === 'admin' ? (
          <DashboardView 
            stats={stats} 
            fetchStats={fetchStats} 
            showToast={showToast} 
            apiBase={API_BASE} 
          />
        ) : null;
      case 'attendance':
        return (
          <AttendanceView 
            showToast={showToast} 
            apiBase={API_BASE} 
            currentUser={currentUser}
          />
        );
      case 'scanner':
        return (
          <ScannerView 
            fetchStats={fetchStats} 
            showToast={showToast} 
            apiBase={API_BASE} 
          />
        );
      case 'users':
        return currentUser.role === 'admin' ? (
          <UserManagementView 
            apiBase={API_BASE} 
            showToast={showToast} 
          />
        ) : null;
      case 'settings':
        return currentUser.role === 'admin' ? (
          <SettingsView 
            stats={stats} 
            fetchStats={fetchStats} 
            showToast={showToast} 
            apiBase={API_BASE} 
          />
        ) : null;
      default:
        return null;
    }
  };

  // Render Login Portal if not authenticated
  if (!currentUser) {
    return (
      <div className="login-portal-container">
        {toast.show && (
          <div className={`toast-notification toast-${toast.type}`}>
            <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>{toast.title}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{toast.message}</div>
          </div>
        )}

        <div className="login-card">
          <div className="login-logo">
            <div className="logo-icon">D</div>
            <h2>DPGU STR</h2>
            <p>Induction Management Portal</p>
          </div>

          <form onSubmit={handleLogin} style={{ marginTop: '20px' }}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Select User Profile</label>
              <select 
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="settings-input"
                style={{ width: '100%', cursor: 'pointer' }}
              >
                {LOGIN_PROFILES.map((prof) => (
                  <option key={prof.username} value={prof.username}>
                    {prof.name} ({prof.role === 'admin' ? 'Admin' : 'Employee'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '25px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Enter 4-Digit PIN</label>
              <input 
                type="password" 
                maxLength={4}
                placeholder="••••"
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))}
                className="settings-input"
                style={{ 
                  width: '100%', 
                  textAlign: 'center', 
                  fontSize: '24px', 
                  letterSpacing: '8px',
                  fontFamily: 'monospace' 
                }}
              />
            </div>
            {loginError && (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.25)', 
                color: '#fca5a5', 
                padding: '12px', 
                borderRadius: '8px', 
                fontSize: '13px', 
                marginBottom: '20px',
                textAlign: 'center' 
              }}>
                {loginError}
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px', fontSize: '15px' }}
              disabled={authenticating}
            >
              {authenticating ? "Logging in..." : "Enter Portal"}
            </button>
          </form>


        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Toast alert */}
      {toast.show && (
        <div className={`toast-notification toast-${toast.type}`}>
          <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>{toast.title}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{toast.message}</div>
        </div>
      )}

      {/* Main Header */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">D</div>
          <div className="logo-text">
            <h1>DPGU STR</h1>
            <p>Induction Management System</p>
          </div>
        </div>

        <nav className="app-nav">
          {currentUser.role === 'admin' && (
            <button 
              className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setActiveTab('dashboard'); fetchStats(); }}
            >
              📊 Dashboard
            </button>
          )}
          <button 
            className={`nav-tab ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            📋 Attendance Tracker
          </button>
          <button 
            className={`nav-tab ${activeTab === 'scanner' ? 'active' : ''}`}
            onClick={() => setActiveTab('scanner')}
          >
            📷 Live QR Scanner
          </button>
          {currentUser.role === 'admin' && (
            <button 
              className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              👥 User Management
            </button>
          )}
          {currentUser.role === 'admin' && (
            <button 
              className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              ⚙ Settings
            </button>
          )}
        </nav>

        {/* User Identity Profile / Logout */}
        <div className="user-profile-widget" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{currentUser.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {currentUser.role === 'admin' ? 'Administrator' : 'Employee Staff'}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout} style={{ padding: '6px 12px', fontSize: '12px' }}>
            Logout
          </button>
        </div>
      </header>

      {/* Primary Page Content Area */}
      <main style={{ paddingBottom: '50px' }}>
        {renderActiveView()}
      </main>
    </div>
  );
}
