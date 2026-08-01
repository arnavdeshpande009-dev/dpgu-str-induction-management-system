import React, { useState, useEffect } from 'react';

export default function UserManagementView({ apiBase, showToast, currentUser }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, [currentUser]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const deptQuery = currentUser?.department ? `?dept=${encodeURIComponent(currentUser.department)}` : "";
      const res = await fetch(`${apiBase}/api/users${deptQuery}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      } else {
        showToast("Error", "Failed to fetch employee profiles.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error", "Could not connect to user database.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAuth = async (username) => {
    try {
      const res = await fetch(`${apiBase}/api/users/${username}/toggle-auth`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        const action = data.is_authorized ? "Authorized" : "Suspended";
        showToast(
          `Account ${action}`, 
          `${username} status has been updated to ${action.toLowerCase()}.`, 
          data.is_authorized ? "success" : "info"
        );
        // Update local state instantly
        setEmployees(prev => prev.map(emp => 
          emp.username === username ? { ...emp, is_authorized: data.is_authorized } : emp
        ));
      } else {
        showToast("Error", "Failed to toggle authorization status.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error", "Server request failed.", "error");
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="view-container">
      <div className="view-header" style={{ marginBottom: '25px' }}>
        <div>
          <h1 className="view-title">User & Access Management</h1>
          <p className="view-subtitle">Authorize or suspend employee accounts for the live QR scanners.</p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={fetchEmployees}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh Accounts"}
        </button>
      </div>

      <div className="panel" style={{ marginBottom: '25px' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input 
              type="text" 
              className="search-input"
              placeholder="Search employees by name or username..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '40px' }}
            />
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        </div>
      </div>

      {loading && employees.length === 0 ? (
        <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading employee accounts...
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No employee profiles match your search criteria.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredEmployees.map((emp) => (
            <div 
              key={emp.id} 
              className="panel" 
              style={{ 
                padding: '20px', 
                border: emp.is_authorized ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div 
                style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  height: '4px', 
                  width: '100%', 
                  background: emp.is_authorized ? 'var(--color-success)' : 'var(--color-error)'
                }}
              />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontFamily: 'var(--font-heading)' }}>{emp.name}</h3>
                  <code style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'inline-block' }}>@{emp.username}</code>
                </div>
                <span 
                  className={`badge ${emp.is_authorized ? 'badge-success' : 'badge-danger'}`}
                  style={{
                    boxShadow: emp.is_authorized 
                      ? '0 0 10px rgba(16, 185, 129, 0.2)' 
                      : '0 0 10px rgba(239, 68, 68, 0.2)'
                  }}
                >
                  {emp.is_authorized ? "Authorized" : "Suspended"}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>PIN: <code>1234</code> (Default)</span>
                
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={emp.is_authorized} 
                    onChange={() => handleToggleAuth(emp.username)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
