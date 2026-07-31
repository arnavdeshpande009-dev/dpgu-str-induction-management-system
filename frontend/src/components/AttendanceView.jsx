import React, { useState, useEffect } from 'react';

export default function AttendanceView({ showToast, apiBase }) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [checkedInFilter, setCheckedInFilter] = useState("all");
  const [emailFilter, setEmailFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [selectedQR, setSelectedQR] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, [search, checkedInFilter, emailFilter]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      let queryParams = [];
      if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
      if (checkedInFilter !== "all") queryParams.push(`checked_in=${checkedInFilter === "yes"}`);
      if (emailFilter !== "all") queryParams.push(`email_sent=${emailFilter === "yes"}`);

      const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
      const res = await fetch(`${apiBase}/api/students${queryString}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) {
      showToast("Error", "Failed to fetch student directory.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheckIn = async (studentId, currentStatus) => {
    const endpoint = currentStatus ? "checkout" : "checkin";
    try {
      const res = await fetch(`${apiBase}/api/students/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Success", data.message, "success");
        fetchStudents();
      } else {
        showToast("Error", data.message || "Action failed", "error");
      }
    } catch (err) {
      showToast("Error", "Server connection failed.", "error");
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    }) + " " + date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Induction Attendance Tracker ({students.length})
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchStudents} disabled={loading}>
            {loading ? "Syncing..." : "Sync List"}
          </button>
          <a href={`${apiBase}/api/students/export`} className="btn btn-primary" download>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download Attendance (XLSX)
          </a>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="filters-bar">
        <div className="search-input-wrapper">
          <input 
            type="text" 
            placeholder="Search by name, email, department..." 
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg className="search-icon-svg" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path></svg>
        </div>

        <select 
          className="select-filter" 
          value={checkedInFilter} 
          onChange={(e) => setCheckedInFilter(e.target.value)}
        >
          <option value="all">Check-in Status (All)</option>
          <option value="yes">Checked In</option>
          <option value="no">Pending Check-in</option>
        </select>

        <select 
          className="select-filter" 
          value={emailFilter} 
          onChange={(e) => setEmailFilter(e.target.value)}
        >
          <option value="all">Email Passes (All)</option>
          <option value="yes">Pass Sent</option>
          <option value="no">Pass Pending</option>
        </select>
      </div>

      {/* Roster Table */}
      <div className="table-container">
        {loading && students.length === 0 ? (
          <div style={{ padding: '40px', textAlignment: 'center', color: 'var(--text-secondary)' }}>Loading directory...</div>
        ) : students.length === 0 ? (
          <div style={{ padding: '40px', textAlignment: 'center', color: 'var(--text-muted)' }}>
            No students found. Try adjusting filters or import a CSV/Excel roster.
          </div>
        ) : (
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Invitation Status</th>
                <th>Check-in Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '13px' }}>
                    {student.student_id}
                  </td>
                  <td style={{ fontWeight: '500' }}>{student.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{student.email}</td>
                  <td>{student.department || "General"}</td>
                  <td>
                    {student.email_sent ? (
                      <span className="badge badge-email-sent" title={`Sent at ${student.email_sent_time}`}>
                        📧 Sent
                      </span>
                    ) : (
                      <span className="badge badge-email-pending">
                        ⏳ Pending
                      </span>
                    )}
                  </td>
                  <td>
                    {student.checked_in ? (
                      <span className="badge badge-success" title={`Checked in at ${student.check_in_time}`}>
                        ✔ Checked In
                      </span>
                    ) : (
                      <span className="badge badge-pending">
                        ⏳ Pending
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        title="View QR Code"
                        onClick={() => setSelectedQR(student)}
                      >
                        🔎 QR
                      </button>
                      <button 
                        className={`btn ${student.checked_in ? 'btn-danger' : 'btn-primary'}`}
                        style={{ padding: '6px 12px', fontSize: '12px', minWidth: '85px' }}
                        onClick={() => handleManualCheckIn(student.student_id, student.checked_in)}
                      >
                        {student.checked_in ? "Checkout" : "Check-in"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* QR Code Modal */}
      {selectedQR && (
        <div className="modal-overlay" onClick={() => setSelectedQR(null)}>
          <div className="modal-content" style={{ maxWidth: '380px', textAlignment: 'center' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedQR(null)}>×</button>
            <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: '8px' }}>Student QR Pass</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>{selectedQR.name}</p>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', display: 'inline-block', marginBottom: '15px' }}>
              <img 
                src={`${apiBase}/static/qrcodes/${selectedQR.student_id}.png`} 
                alt="Student QR Code"
                style={{ width: '200px', height: '200px', display: 'block' }}
                onError={(e) => {
                  // Fallback if not generated yet
                  e.target.src = "https://placehold.co/200x200/fff/000?text=QR+Not+Generated";
                }}
              />
            </div>
            <div style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--text-muted)' }}>
              Token: {selectedQR.student_id}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
