import React, { useState, useEffect } from 'react';

export default function SystemHealthView({ apiBase, showToast }) {
  const [health, setHealth] = useState(null);
  const [integrity, setIntegrity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [activeIssuesTab, setActiveIssuesTab] = useState('qrcodes');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch system health status
      const healthRes = await fetch(`${apiBase}/api/system/health`);
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      }

      // Fetch integrity report details
      const integrityRes = await fetch(`${apiBase}/api/system/integrity`);
      if (integrityRes.ok) {
        const integrityData = await integrityRes.json();
        setIntegrity(integrityData);
      }
    } catch (err) {
      console.error(err);
      showToast("Connection Error", "Could not connect to health diagnostic APIs.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRunIntegrityCheck = async () => {
    setRunningCheck(true);
    setCheckResult(null);
    try {
      const res = await fetch(`${apiBase}/api/system/integrity/check`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setCheckResult(data);
        if (data.ready) {
          showToast("Ready", "System verified and ready for the event!", "success");
        } else {
          showToast("Warning", "Integrity check failed. Please review the issues.", "warning");
        }
        // Refresh integrity statistics
        if (data.details) {
          setIntegrity(data.details);
        }
      } else {
        showToast("Error", "Failed to run system integrity validation check.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error", "Could not execute integrity check.", "error");
    } finally {
      setRunningCheck(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Running system diagnostics, please wait...</p>
      </div>
    );
  }

  // Filter lists based on search term
  const filterList = (list) => {
    if (!list) return [];
    if (!searchTerm) return list;
    return list.filter(item => 
      (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.student_id && item.student_id.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const missingQrs = integrity?.missing_qrcodes || [];
  const missingEmails = integrity?.missing_emails || [];
  const missingDepts = integrity?.missing_departments || [];
  const duplicates = integrity?.duplicates || [];

  const filteredQrs = filterList(missingQrs);
  const filteredEmails = filterList(missingEmails);
  const filteredDepts = filterList(missingDepts);
  const filteredDuplicates = filterList(duplicates);

  const totalIssues = missingQrs.length + missingEmails.length + missingDepts.length + duplicates.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>System Health & Database Verification</h2>
          <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Verify PostgreSQL production settings, scanning concurrency parameters, and student records before the event day.
          </p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={fetchData} 
          disabled={runningCheck}
          style={{ padding: '8px 16px', fontSize: '13px' }}
        >
          🔄 Refresh Status
        </button>
      </div>

      {/* Grid of Diagnostics */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
        {/* Connection card */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Database Connection
            </span>
            <span style={{ 
              display: 'inline-block', 
              width: '10px', 
              height: '10px', 
              borderRadius: '50%', 
              background: health?.status === 'online' ? '#22c55e' : '#ef4444',
              boxShadow: health?.status === 'online' ? '0 0 8px #22c55e' : '0 0 8px #ef4444'
            }}></span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', textTransform: 'capitalize' }}>
            {health?.status === 'online' ? 'Connected' : 'Disconnected'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Engine: <strong>{health?.database === 'postgresql' ? 'PostgreSQL (Production)' : 'SQLite (Fallback)'}</strong>
          </div>
        </div>

        {/* Total Students */}
        <div className="stat-card">
          <span className="stat-label">Total Students</span>
          <div className="stat-value">{integrity?.total_students || 0}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Active roster records loaded
          </div>
        </div>

        {/* QR Code passes status */}
        <div className="stat-card">
          <span className="stat-label">QR Passes Generated</span>
          <div className="stat-value">{integrity?.total_qr_generated || 0}</div>
          <div style={{ fontSize: '12px', color: missingQrs.length > 0 ? '#fca5a5' : 'var(--text-secondary)', marginTop: '4px' }}>
            {missingQrs.length > 0 ? `⚠️ ${missingQrs.length} missing QR passes` : '✅ All QR codes generated'}
          </div>
        </div>

        {/* Invitation Emails Sent */}
        <div className="stat-card">
          <span className="stat-label">Invitation Emails</span>
          <div className="stat-value">{integrity?.total_emails_sent || 0}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {integrity?.total_students ? `${Math.round(((integrity?.total_emails_sent || 0) / integrity.total_students) * 100)}% coverage sent` : 'No student data'}
          </div>
        </div>

        {/* Attendance Marked */}
        <div className="stat-card">
          <span className="stat-label">Event Attendance</span>
          <div className="stat-value">{integrity?.total_attendance || 0}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Students checked in so far
          </div>
        </div>
      </div>

      {/* Main Action - Integrity Check Trigger */}
      <div style={{ 
        background: 'var(--bg-secondary)', 
        border: '1px solid var(--border-color)', 
        borderRadius: '12px', 
        padding: '25px', 
        textAlign: 'center' 
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '600' }}>Pre-Event Database Verification</h3>
        <p style={{ maxWidth: '600px', margin: '0 auto 20px auto', color: 'var(--text-secondary)', fontSize: '14px' }}>
          Execute a full database validation sweep. This verifies name indices, email formats, department assignments, file system QR directories, and ensures there are no duplicate ID allocations.
        </p>
        <button 
          className="btn btn-primary"
          onClick={handleRunIntegrityCheck}
          disabled={runningCheck}
          style={{ padding: '12px 30px', fontSize: '15px' }}
        >
          {runningCheck ? "Scanning database..." : "🔍 Run System Integrity Check"}
        </button>

        {/* Integrity Check Results */}
        {checkResult && (
          <div style={{ marginTop: '25px', textAlign: 'left' }}>
            {checkResult.ready ? (
              /* Ready Result */
              <div style={{ 
                background: 'rgba(34, 197, 94, 0.1)', 
                border: '1px solid rgba(34, 197, 94, 0.3)', 
                borderRadius: '8px', 
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}>
                <div style={{ fontSize: '32px' }}>🚀</div>
                <div>
                  <h4 style={{ margin: 0, color: '#4ade80', fontSize: '18px', fontWeight: 'bold' }}>
                    {checkResult.message}
                  </h4>
                  <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    All student profiles, QR maps, and database indexes are verified. No duplicate records or missing assets were found. System is completely ready for high-concurrency event day scanning.
                  </p>
                </div>
              </div>
            ) : (
              /* Failed Result */
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)', 
                borderRadius: '8px', 
                padding: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                  <div style={{ fontSize: '32px' }}>⚠️</div>
                  <div>
                    <h4 style={{ margin: 0, color: '#f87171', fontSize: '18px', fontWeight: 'bold' }}>
                      Integrity Issues Found
                    </h4>
                    <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {checkResult.message}
                    </p>
                  </div>
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#fca5a5', fontSize: '13px', lineHeight: '1.6' }}>
                  {checkResult.issues_summary?.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Diagnostics details Section */}
      {totalIssues > 0 && (
        <div className="settings-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Affected Records needing Attention</h3>
            
            {/* Search filter */}
            <input 
              type="text"
              placeholder="Search by student name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="settings-input"
              style={{ width: '250px', padding: '8px 12px', fontSize: '13px' }}
            />
          </div>

          {/* Issue category tabs */}
          <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', marginBottom: '15px', paddingBottom: '10px', overflowX: 'auto' }}>
            <button 
              className={`nav-tab ${activeIssuesTab === 'qrcodes' ? 'active' : ''}`}
              onClick={() => setActiveIssuesTab('qrcodes')}
              style={{ fontSize: '13px', padding: '6px 12px' }}
            >
              Missing QR Passes ({missingQrs.length})
            </button>
            <button 
              className={`nav-tab ${activeIssuesTab === 'emails' ? 'active' : ''}`}
              onClick={() => setActiveIssuesTab('emails')}
              style={{ fontSize: '13px', padding: '6px 12px' }}
            >
              Missing/Invalid Emails ({missingEmails.length})
            </button>
            <button 
              className={`nav-tab ${activeIssuesTab === 'departments' ? 'active' : ''}`}
              onClick={() => setActiveIssuesTab('departments')}
              style={{ fontSize: '13px', padding: '6px 12px' }}
            >
              Missing Depts ({missingDepts.length})
            </button>
            <button 
              className={`nav-tab ${activeIssuesTab === 'duplicates' ? 'active' : ''}`}
              onClick={() => setActiveIssuesTab('duplicates')}
              style={{ fontSize: '13px', padding: '6px 12px' }}
            >
              Duplicate IDs ({duplicates.length})
            </button>
          </div>

          {/* Details Table */}
          <div style={{ overflowX: 'auto' }}>
            {activeIssuesTab === 'qrcodes' && (
              filteredQrs.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>No records match this filter.</p>
              ) : (
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Full Name</th>
                      <th>Problem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQrs.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 'bold' }}>{item.student_id}</td>
                        <td>{item.name}</td>
                        <td style={{ color: '#f87171' }}>{item.issue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {activeIssuesTab === 'emails' && (
              filteredEmails.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>No records match this filter.</p>
              ) : (
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Full Name</th>
                      <th>Email Provided</th>
                      <th>Problem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmails.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 'bold' }}>{item.student_id}</td>
                        <td>{item.name}</td>
                        <td style={{ color: '#fca5a5' }}>{item.email || 'None'}</td>
                        <td style={{ color: '#f87171' }}>{item.issue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {activeIssuesTab === 'departments' && (
              filteredDepts.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>No records match this filter.</p>
              ) : (
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Full Name</th>
                      <th>Problem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDepts.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 'bold' }}>{item.student_id}</td>
                        <td>{item.name}</td>
                        <td style={{ color: '#f87171' }}>{item.issue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {activeIssuesTab === 'duplicates' && (
              filteredDuplicates.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>No records match this filter.</p>
              ) : (
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>Duplicate Student ID</th>
                      <th>Occurrence Count</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDuplicates.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 'bold', color: '#f87171' }}>{item.student_id}</td>
                        <td>{item.count} times</td>
                        <td>Must delete or rename duplicate rows in CSV</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
