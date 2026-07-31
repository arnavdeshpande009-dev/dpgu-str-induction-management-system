import React, { useState, useEffect } from 'react';

export default function DashboardView({ stats, fetchStats, showToast, apiBase }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [mockEmails, setMockEmails] = useState([]);
  const [previewEmail, setPreviewEmail] = useState(null);

  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventDressCode, setEventDressCode] = useState("");
  
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    fetchMockEmails();
    loadEmailSettings();
    loadAttachments();
  }, []);

  const loadEmailSettings = async () => {
    try {
      const res = await fetch(`${apiBase}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        setEmailSubject(data.email_subject || "");
        setEmailBody(data.email_body || "");
        setEventDate(data.event_date || "");
        setEventTime(data.event_time || "");
        setEventVenue(data.event_venue || "");
        setEventDressCode(data.event_dress_code || "");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAttachments = async () => {
    try {
      const res = await fetch(`${apiBase}/api/attachments`);
      if (res.ok) {
        const data = await res.json();
        setAttachments(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    try {
      const settingsRes = await fetch(`${apiBase}/api/settings`);
      let existingSettings = {};
      if (settingsRes.ok) {
        existingSettings = await settingsRes.json();
      }
      
      const payload = {
        ...existingSettings,
        email_subject: emailSubject,
        email_body: emailBody,
        event_date: eventDate,
        event_time: eventTime,
        event_venue: eventVenue,
        event_dress_code: eventDressCode
      };

      const res = await fetch(`${apiBase}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast("Success", "Email template saved successfully.", "success");
      } else {
        showToast("Error", "Failed to save email template.", "error");
      }
    } catch (err) {
      showToast("Error", "Server connection failed.", "error");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAttachment(true);
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch(`${apiBase}/api/attachments/upload`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        showToast("Success", `${file.name} uploaded successfully.`, "success");
        loadAttachments();
      } else {
        showToast("Error", "Failed to upload attachment.", "error");
      }
    } catch (err) {
      showToast("Error", "Server upload failed.", "error");
    } finally {
      setUploadingAttachment(false);
      e.target.value = null;
    }
  };

  const handleDeleteAttachment = async (filename) => {
    try {
      const res = await fetch(`${apiBase}/api/attachments/${encodeURIComponent(filename)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showToast("Deleted", "Attachment removed.", "info");
        loadAttachments();
      } else {
        showToast("Error", "Failed to delete attachment.", "error");
      }
    } catch (err) {
      showToast("Error", "Server connection failed.", "error");
    }
  };

  // Poll server for stats and email previews during background email sending
  useEffect(() => {
    let intervalId;
    if (sendingEmails) {
      intervalId = setInterval(() => {
        fetchStats();
        fetchMockEmails();
      }, 1500);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [sendingEmails]);

  // Turn off loading spinner and alert when all emails are dispatched
  useEffect(() => {
    if (sendingEmails && stats.emails_sent === stats.total_students && stats.total_students > 0) {
      setSendingEmails(false);
      showToast("Dispatch Complete", "All student QR passes have been generated and dispatched!", "success");
    }
  }, [stats, sendingEmails]);

  const fetchMockEmails = async () => {
    try {
      const res = await fetch(`${apiBase}/api/preview-emails`);
      if (res.ok) {
        const data = await res.json();
        setMockEmails(data);
      }
    } catch (err) {
      console.error("Failed to load mock email previews", err);
    }
  };

  const handleClearPreviews = async () => {
    if (!window.confirm("Are you sure you want to clear the local preview pass history? This will delete the preview images from the server but will not affect student attendance records.")) {
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/preview-emails/clear`, {
        method: "POST"
      });
      if (res.ok) {
        showToast("History Cleared", "Sent QR pass preview files have been deleted.", "success");
        fetchMockEmails();
      } else {
        showToast("Error", "Failed to clear preview history.", "error");
      }
    } catch (err) {
      showToast("Error", "Server communication failed.", "error");
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`${apiBase}/api/students/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Success", "Student records imported successfully!", "success");
        fetchStats();
        setSelectedFile(null);
        fetchMockEmails();
      } else {
        showToast("Error", data.detail || "Failed to parse file.", "error");
      }
    } catch (err) {
      showToast("Error", "Server connection failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSendEmails = async () => {
    setSendingEmails(true);
    try {
      const res = await fetch(`${apiBase}/api/students/send-emails`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Info", data.message, "info");
        fetchStats();
        fetchMockEmails();
      } else {
        showToast("Error", data.detail || "Failed to trigger email distribution.", "error");
        setSendingEmails(false);
      }
    } catch (err) {
      showToast("Error", "Server connection failed.", "error");
      setSendingEmails(false);
    }
  };

  return (
    <div>
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span>Total Freshers</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <div className="stat-value">{stats.total_students}</div>
          <div className="stat-desc">Registered in database</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Checked In</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <div className="stat-value">{stats.checked_in}</div>
          <div className="stat-desc">{stats.check_in_rate}% attendance rate</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span>Passes Emailed</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          </div>
          <div className="stat-value">{stats.emails_sent}</div>
          <div className="stat-desc">QR invitations dispatched</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '30px', alignItems: 'start' }} className="dashboard-sections-grid">
        {/* Upload & Actions Panel */}
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              Student Roster Upload
            </h2>
          </div>
          
          <div 
            className={`upload-container ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById("fileUploadInput").click()}
          >
            <input 
              id="fileUploadInput"
              type="file" 
              style={{ display: 'none' }} 
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
            />
            <div className="upload-icon">📁</div>
            <div className="upload-text">
              <span>Click to upload</span> or drag and drop
            </div>
            <div className="upload-subtext">CSV or Excel files only (.csv, .xlsx, .xls)</div>
          </div>

          {selectedFile && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div className="selected-file-badge">
                📄 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
              <button 
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? "Importing..." : "Process Student Roster"}
              </button>
            </div>
          )}

          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '24px', display: 'flex', gap: '16px' }}>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1 }}
              onClick={handleSendEmails}
              disabled={sendingEmails || stats.total_students === 0 || stats.total_students === stats.emails_sent}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              {sendingEmails ? "Sending Passes..." : "Generate QR Pass & Send Invitation Emails"}
            </button>
          </div>
        </div>

        {/* Email Customization & Attachments Panel */}
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              Email Customization & Attachments
            </h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="form-group">
              <label className="form-label">Email Subject Prefix</label>
              <input 
                type="text" 
                className="settings-input" 
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="e.g. Your Induction Check-In QR Pass"
                style={{ width: '100%' }}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Email Message Body</label>
              <textarea 
                className="settings-input" 
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Write the welcome text for students here..."
                style={{ width: '100%', minHeight: '100px', resize: 'vertical', padding: '10px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label className="form-label">Event Date</label>
                <input 
                  type="text" 
                  className="settings-input" 
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  placeholder="e.g. August 5, 2026"
                  style={{ width: '100%' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Reporting Time</label>
                <input 
                  type="text" 
                  className="settings-input" 
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  placeholder="e.g. 09:00 AM"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label className="form-label">Venue</label>
                <input 
                  type="text" 
                  className="settings-input" 
                  value={eventVenue}
                  onChange={(e) => setEventVenue(e.target.value)}
                  placeholder="e.g. Main Auditorium"
                  style={{ width: '100%' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Dress Code</label>
                <input 
                  type="text" 
                  className="settings-input" 
                  value={eventDressCode}
                  onChange={(e) => setEventDressCode(e.target.value)}
                  placeholder="e.g. Smart Casuals"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <button 
              className="btn btn-primary"
              onClick={handleSaveTemplate}
              disabled={savingTemplate}
              style={{ alignSelf: 'flex-start', marginTop: '10px' }}
            >
              {savingTemplate ? "Saving..." : "Save Template"}
            </button>

            {/* Custom Attachments Section */}
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span className="form-label" style={{ margin: 0 }}>Additional Attachments ({attachments.length})</span>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => document.getElementById("attachmentUploadInput").click()}
                  disabled={uploadingAttachment}
                >
                  {uploadingAttachment ? "Uploading..." : "Add File"}
                </button>
                <input 
                  id="attachmentUploadInput"
                  type="file" 
                  style={{ display: 'none' }}
                  onChange={handleAttachmentUpload}
                />
              </div>

              {attachments.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '15px', border: '1px dashed var(--border-glass)', borderRadius: '8px' }}>
                  No extra attachments. Only the student pass PNG card will be attached.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {attachments.map((file, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: 'rgba(255,255,255,0.02)', 
                        padding: '10px 15px', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border-glass)' 
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '14px', color: '#fff', fontWeight: '500' }}>{file.filename}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <button 
                        className="btn" 
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-error)', padding: '0 5px', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}
                        onClick={() => handleDeleteAttachment(file.filename)}
                        title="Remove Attachment"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Local Email Previews (Dry-Run Mode helper) */}
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
              Emailed QR Pass Previews ({mockEmails.length})
            </h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              {mockEmails.length > 0 && (
                <button 
                  className="btn btn-secondary" 
                  style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
                  onClick={handleClearPreviews}
                >
                  Clear History
                </button>
              )}
              <button className="btn btn-secondary" onClick={fetchMockEmails}>Refresh</button>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
            Outgoing emails are saved as local HTML copies. Click any pass below to view its visual structure and scan the QR code to test check-in!
          </p>

          <div className="preview-emails-container">
            {mockEmails.length === 0 ? (
              <div style={{ padding: '30px', textAlignment: 'center', color: 'var(--text-muted)' }}>
                No passes generated yet. Upload a roster and trigger the email dispatch!
              </div>
            ) : (
              mockEmails.map((email, idx) => (
                <div 
                  key={idx} 
                  className="preview-email-item"
                  onClick={() => setPreviewEmail(email)}
                >
                  <div className="preview-email-info">
                    <h4>{email.email}</h4>
                    <p>Token ID: {email.student_id}</p>
                  </div>
                  <div style={{ color: 'var(--color-primary)', fontWeight: '600', fontSize: '12px' }}>
                    View Pass →
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewEmail && (
        <div className="modal-overlay" onClick={() => setPreviewEmail(null)}>
          <div className="modal-content" style={{ maxWidth: '650px' }} onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setPreviewEmail(null)}>×</button>
            <h3 style={{ marginBottom: '15px', fontFamily: 'var(--font-heading)' }}>
              Pass Preview: {previewEmail.email}
            </h3>
            {previewEmail.file_url.endsWith('.png') ? (
              <div style={{ display: 'flex', justifyContent: 'center', background: '#111', padding: '20px', borderRadius: '8px', overflow: 'hidden' }}>
                <img 
                  src={`${apiBase}${previewEmail.file_url}`} 
                  alt="QR Pass Preview"
                  style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} 
                />
              </div>
            ) : (
              <iframe 
                src={`${apiBase}${previewEmail.file_url}`} 
                className="email-preview-frame"
                title="Email Preview"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
