import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Info, Layers, Briefcase, GraduationCap, FolderGit, Award,
  MessageSquare, Settings, LogOut, Plus, Trash2, ArrowUp, ArrowDown,
  Upload, Save, Check, AlertCircle, Eye
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { db, storage, ref, get, set, storageRef, uploadBytes, getDownloadURL } from '../firebase';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('hero');
  const [data, setData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState({ section: '', type: '', text: '' }); // 'success', 'error', 'loading'
  
  // Local edit states
  const [heroForm, setHeroForm] = useState({});
  const [aboutBio, setAboutBio] = useState('');
  const [aboutDetails, setAboutDetails] = useState([]);
  const [skills, setSkills] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [education, setEducation] = useState([]);
  const [projects, setProjects] = useState([]);
  const [achievements, setAchievements] = useState([]);
  
  // Security Form
  const [securityForm, setSecurityForm] = useState({ currentPassword: '', newPassword: '' });

  // Upload progress indicator
  const [uploadProgress, setUploadProgress] = useState({ target: '', loading: false });

  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  // Verify Auth on mount
  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
    }
  }, [token, navigate]);

  // Fetch portfolio data and contact messages
  useEffect(() => {
    if (!token) return;

    const fetchAllData = async () => {
      try {
        setLoading(true);
        let portData = null;

        // 1. Try Firebase Web SDK (Authoritative Live Database)
        try {
          const snapshot = await get(ref(db, 'portfolio'));
          if (snapshot.exists() && snapshot.val()) {
            portData = snapshot.val();
          }
        } catch (fbErr) {
          console.warn('Firebase direct load warning in Dashboard:', fbErr.message);
        }

        // 2. Try LocalStorage Cache
        let localCache = null;
        try {
          const cached = localStorage.getItem('cached_portfolio_data');
          if (cached) {
            localCache = JSON.parse(cached);
          }
        } catch (e) {
          console.warn('LocalStorage read error:', e);
        }

        // 3. Merge LocalCache (local edits take precedence if newer)
        if (localCache) {
          portData = portData ? { ...portData, ...localCache } : localCache;
        }

        // 4. Fallback to API endpoint only if no Firebase or cached data exists
        if (!portData) {
          try {
            const portRes = await fetch('/api/portfolio');
            if (portRes.ok) {
              portData = await portRes.json();
            }
          } catch (fetchErr) {
            console.warn('API fetch failed in Dashboard:', fetchErr);
          }
        }

        if (portData) {
          setData(portData);
          setHeroForm(portData.hero || {});
          setAboutBio(portData.about?.bio || '');
          setAboutDetails(portData.about?.details || []);
          setSkills(portData.skills || []);
          setExperiences(portData.experience || []);
          setEducation(portData.education || []);
          setProjects(portData.projects || []);
          setAchievements(portData.achievements || []);
        }

        // Fetch Messages
        try {
          const msgRes = await fetch('/api/messages', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (msgRes.status === 401 || msgRes.status === 403) {
            handleLogout();
            return;
          }
          if (msgRes.ok) {
            const msgData = await msgRes.json();
            setMessages(msgData);
          }
        } catch (mErr) {
          console.warn('Messages fetch error:', mErr);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [token]);

  // Flash save status helper
  const triggerStatus = (section, type, text) => {
    setSaveStatus({ section, type, text });
    if (type !== 'loading') {
      setTimeout(() => setSaveStatus({ section: '', type: '', text: '' }), 3000);
    }
  };

  // Logout routine
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  // Protected Fetch Handler wrapper with timeout
  const secureRequest = async (url, options = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const defaultHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    const config = {
      ...options,
      signal: controller.signal,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    try {
      const res = await fetch(url, config);
      clearTimeout(timer);
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        throw new Error('Session expired. Please log in again.');
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  // ==========================================
  // Save Handlers for Sections
  // ==========================================

  const saveSectionWithFallback = async (sectionKey, apiPath, payload, payloadKey, stateSetter) => {
    triggerStatus(sectionKey, 'loading', 'Saving...');
    const valToSave = payloadKey ? payload[payloadKey] : payload;
    
    // Always update local state & local cache first
    if (stateSetter) stateSetter(valToSave);
    try {
      const currentCache = JSON.parse(localStorage.getItem('cached_portfolio_data') || '{}');
      currentCache[apiPath] = valToSave;
      localStorage.setItem('cached_portfolio_data', JSON.stringify(currentCache));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }

    // 1. Try Backend API save with 3.5s timeout
    try {
      const res = await secureRequest(`/api/portfolio/${apiPath}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok) {
        if (stateSetter && result[payloadKey || apiPath]) {
          stateSetter(result[payloadKey || apiPath]);
        }
        triggerStatus(sectionKey, 'success', `${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)} saved successfully!`);
        return;
      }
    } catch (err) {
      console.warn(`Backend API save for ${sectionKey} failed or timed out, trying direct Firebase Web SDK...`, err.message);
    }

    // 2. Direct Firebase Web SDK Save with 3.5s timeout
    try {
      const fbTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase timeout')), 3500));
      await Promise.race([
        set(ref(db, `portfolio/${apiPath}`), valToSave),
        fbTimeout
      ]);
      triggerStatus(sectionKey, 'success', `${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)} saved to Firebase!`);
      return;
    } catch (fbErr) {
      console.warn(`Firebase direct save timed out or failed for ${sectionKey}:`, fbErr.message);
    }

    // 3. Guaranteed Local Save Fallback
    triggerStatus(sectionKey, 'success', `${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)} saved locally!`);
  };

  const saveHero = async () => {
    await saveSectionWithFallback('hero', 'hero', heroForm);
  };

  const saveAbout = async () => {
    await saveSectionWithFallback('about', 'about', { bio: aboutBio, details: aboutDetails });
  };

  const saveSkills = async () => {
    const orderedSkills = skills.map((s, idx) => ({ ...s, order: idx + 1 }));
    await saveSectionWithFallback('skills', 'skills', { skills: orderedSkills }, 'skills', setSkills);
  };

  const saveExperience = async () => {
    const ordered = experiences.map((item, idx) => ({ ...item, order: idx + 1 }));
    await saveSectionWithFallback('experience', 'experience', { experience: ordered }, 'experience', setExperiences);
  };

  const saveEducation = async () => {
    const ordered = education.map((item, idx) => ({ ...item, order: idx + 1 }));
    await saveSectionWithFallback('education', 'education', { education: ordered }, 'education', setEducation);
  };

  const saveProjects = async () => {
    const ordered = projects.map((item, idx) => ({ ...item, order: idx + 1 }));
    await saveSectionWithFallback('projects', 'projects', { projects: ordered }, 'projects', setProjects);
  };

  const saveAchievements = async () => {
    const ordered = achievements.map((item, idx) => ({ ...item, order: idx + 1 }));
    await saveSectionWithFallback('achievements', 'achievements', { achievements: ordered }, 'achievements', setAchievements);
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    if (!securityForm.currentPassword || !securityForm.newPassword) return;
    triggerStatus('security', 'loading', 'Updating...');
    try {
      const res = await secureRequest('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(securityForm)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to update password.');
      setSecurityForm({ currentPassword: '', newPassword: '' });
      triggerStatus('security', 'success', 'Password updated successfully!');
    } catch (err) {
      triggerStatus('security', 'error', err.message);
    }
  };

  // ==========================================
  // File Upload Helper (API + Firebase Storage + Base64)
  // ==========================================
  const handleFileUpload = async (e, targetField, sectionName, callback) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit: 10MB max
    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Max size is 10MB.");
      return;
    }

    setUploadProgress({ target: targetField, loading: true });

    // 1. Attempt Backend API upload
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await res.json();
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }
      
      if (res.ok && result.url) {
        callback(result.url);
        triggerStatus(sectionName, 'success', 'File uploaded successfully!');
        setUploadProgress({ target: '', loading: false });
        return;
      }
    } catch (err) {
      console.warn('Server upload endpoint unreachable, trying Firebase Storage upload...', err);
    }

    // 2. Direct Firebase Storage Upload Fallback
    try {
      const sanitizedName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
      const filename = `${Date.now()}_${sanitizedName}`;
      const fileRef = storageRef(storage, `uploads/${filename}`);
      const snapshot = await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      callback(downloadUrl);
      triggerStatus(sectionName, 'success', 'File uploaded to Firebase Storage!');
      setUploadProgress({ target: '', loading: false });
      return;
    } catch (fbErr) {
      console.warn('Firebase Storage upload failed, falling back to base64...', fbErr);
    }

    // 3. Base64 Reader Fallback
    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result);
      triggerStatus(sectionName, 'success', 'File uploaded (Base64) successfully!');
      setUploadProgress({ target: '', loading: false });
    };
    reader.onerror = () => {
      triggerStatus(sectionName, 'error', 'Error reading file.');
      setUploadProgress({ target: '', loading: false });
    };
    reader.readAsDataURL(file);
  };

  // ==========================================
  // Array Operations: Add, Delete, Reorder
  // ==========================================

  const moveItem = (list, setList, idx, direction) => {
    const newList = [...list];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newList.length) return;
    
    // Swap
    const temp = newList[idx];
    newList[idx] = newList[targetIdx];
    newList[targetIdx] = temp;
    
    setList(newList);
  };

  const deleteItem = (list, setList, idx) => {
    if (window.confirm('Are you sure you want to delete this item? You will still need to click Save to persist the deletion.')) {
      const newList = list.filter((_, i) => i !== idx);
      setList(newList);
    }
  };

  // Contact Inquiries Deletion
  const deleteMessage = async (id) => {
    if (window.confirm('Are you sure you want to delete this contact message? This is permanent.')) {
      try {
        const res = await secureRequest(`/api/messages/${id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          setMessages(prev => prev.filter(m => m.id !== id));
        } else {
          const result = await res.json();
          alert(result.message || 'Failed to delete message.');
        }
      } catch (err) {
        alert(err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid var(--glow-color)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ fontFamily: 'var(--font-heading)', fontWeight: '600' }}>Loading Admin Workspace...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Dashboard Top Header */}
      <header style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--card-border)',
        height: '70px',
        position: 'sticky',
        top: '0',
        zIndex: '100'
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.25rem',
              fontWeight: '800'
            }}>
              Raghav <span className="text-gradient">Console</span>
            </span>
            <span style={{
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--glow-color)',
              color: 'var(--primary)',
              fontWeight: '700'
            }}>
              ADMIN
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <ThemeToggle />
            <a href="/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary flex-center" style={{ padding: '6px 12px', fontSize: '0.85rem', gap: '4px', borderColor: 'var(--card-border)' }}>
              <Eye size={14} />
              View Site
            </a>
            <button onClick={handleLogout} className="btn btn-danger flex-center" style={{ padding: '6px 12px', fontSize: '0.85rem', gap: '4px', border: 'none' }}>
              <LogOut size={14} />
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div style={{
        flexGrow: '1',
        display: 'flex',
        flexWrap: 'wrap'
      }}>
        
        {/* Sidebar Tabs */}
        <aside style={{
          flex: '1 0 240px',
          maxWidth: '280px',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--card-border)',
          padding: '24px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }} className="dashboard-sidebar">
          {[
            { id: 'hero', label: 'Hero & Socials', icon: <User size={18} /> },
            { id: 'about', label: 'About Me', icon: <Info size={18} /> },
            { id: 'skills', label: 'Skills & Tech', icon: <Layers size={18} /> },
            { id: 'experience', label: 'Experience', icon: <Briefcase size={18} /> },
            { id: 'education', label: 'Education', icon: <GraduationCap size={18} /> },
            { id: 'projects', label: 'Projects', icon: <FolderGit size={18} /> },
            { id: 'achievements', label: 'Achievements', icon: <Award size={18} /> },
            {
              id: 'messages',
              label: 'Messages',
              icon: <MessageSquare size={18} />,
              badge: messages.length > 0 ? messages.length : null
            },
            { id: 'security', label: 'Security & Auth', icon: <Settings size={18} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === tab.id ? 'var(--glow-color)' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.id ? '600' : '500',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)'
              }}
            >
              {tab.icon}
              <span style={{ flexGrow: '1' }}>{tab.label}</span>
              {tab.badge && (
                <span style={{
                  fontSize: '0.75rem',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: '#ef4444',
                  color: 'white',
                  fontWeight: '700'
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* Console Workspace Area */}
        <main style={{
          flex: '10 1 500px',
          padding: '40px',
          maxHeight: 'calc(100vh - 70px)',
          overflowY: 'auto'
        }}>
          {error && (
            <div style={{
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertCircle size={20} />
              <p>{error}</p>
            </div>
          )}

          {/* ==========================================
             TAB: HERO & SOCIALS
             ========================================== */}
          {activeTab === 'hero' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Hero Details & Social Channels</h2>
                <button onClick={saveHero} disabled={saveStatus.section === 'hero' && saveStatus.type === 'loading'} className="btn btn-primary">
                  <Save size={16} />
                  {saveStatus.section === 'hero' && saveStatus.type === 'loading' ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              {saveStatus.section === 'hero' && saveStatus.type !== 'loading' && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: saveStatus.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: saveStatus.type === 'success' ? '#22c55e' : '#ef4444' }}>
                  {saveStatus.text}
                </div>
              )}

              <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="grid-form-2">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-input" value={heroForm.name || ''} onChange={e => setHeroForm({ ...heroForm, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tagline / Subtitle</label>
                    <input type="text" className="form-input" value={heroForm.tagline || ''} onChange={e => setHeroForm({ ...heroForm, tagline: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Hero Introduction Bio</label>
                  <textarea className="form-input" style={{ minHeight: '80px' }} value={heroForm.introduction || ''} onChange={e => setHeroForm({ ...heroForm, introduction: e.target.value })}></textarea>
                </div>

                <div className="grid-form-2">
                  {/* Profile Image Uploader */}
                  <div className="form-group">
                    <label className="form-label">Profile Photo URL</label>
                    <input type="text" className="form-input" value={heroForm.profilePhoto || ''} onChange={e => setHeroForm({ ...heroForm, profilePhoto: e.target.value })} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                      <label className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', gap: '4px', cursor: 'pointer' }}>
                        <Upload size={14} />
                        Upload Profile Photo
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={e => handleFileUpload(e, 'profilePhoto', 'hero', (url) => setHeroForm(prev => ({ ...prev, profilePhoto: url })))}
                        />
                      </label>
                      {uploadProgress.target === 'profilePhoto' && <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Uploading...</span>}
                    </div>
                  </div>

                  {/* CV Resume Uploader */}
                  <div className="form-group">
                    <label className="form-label">Resume PDF URL</label>
                    <input type="text" className="form-input" value={heroForm.resumeUrl || ''} onChange={e => setHeroForm({ ...heroForm, resumeUrl: e.target.value })} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                      <label className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', gap: '4px', cursor: 'pointer' }}>
                        <Upload size={14} />
                        Upload Resume (PDF)
                        <input
                          type="file"
                          accept=".pdf"
                          style={{ display: 'none' }}
                          onChange={e => handleFileUpload(e, 'resumeUrl', 'hero', (url) => setHeroForm(prev => ({ ...prev, resumeUrl: url })))}
                        />
                      </label>
                      {uploadProgress.target === 'resumeUrl' && <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Uploading...</span>}
                    </div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)', margin: '12px 0' }} />
                <h3>Contact & Location details</h3>

                <div className="grid-form-3">
                  <div className="form-group">
                    <label className="form-label">Public Email</label>
                    <input type="email" className="form-input" value={heroForm.email || ''} onChange={e => setHeroForm({ ...heroForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Public Phone</label>
                    <input type="text" className="form-input" value={heroForm.phone || ''} onChange={e => setHeroForm({ ...heroForm, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location / City</label>
                    <input type="text" className="form-input" value={heroForm.location || ''} onChange={e => setHeroForm({ ...heroForm, location: e.target.value })} />
                  </div>
                </div>

                <div className="grid-form-2">
                  <div className="form-group">
                    <label className="form-label">GitHub URL</label>
                    <input type="url" className="form-input" value={heroForm.github || ''} onChange={e => setHeroForm({ ...heroForm, github: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">LinkedIn URL</label>
                    <input type="url" className="form-input" value={heroForm.linkedin || ''} onChange={e => setHeroForm({ ...heroForm, linkedin: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
             TAB: ABOUT ME
             ========================================== */}
          {activeTab === 'about' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>About Me bio & Personal Details grid</h2>
                <button onClick={saveAbout} disabled={saveStatus.section === 'about' && saveStatus.type === 'loading'} className="btn btn-primary">
                  <Save size={16} />
                  {saveStatus.section === 'about' && saveStatus.type === 'loading' ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              {saveStatus.section === 'about' && saveStatus.type !== 'loading' && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: saveStatus.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: saveStatus.type === 'success' ? '#22c55e' : '#ef4444' }}>
                  {saveStatus.text}
                </div>
              )}

              <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="form-group">
                  <label className="form-label">About Biography Text</label>
                  <textarea className="form-input" style={{ minHeight: '160px' }} value={aboutBio} onChange={e => setAboutBio(e.target.value)}></textarea>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--card-border)' }} />

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3>Quick Fact Details Grid</h3>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.85rem', gap: '4px' }}
                      onClick={() => setAboutDetails([...aboutDetails, { id: Date.now().toString(), label: '', value: '' }])}
                    >
                      <Plus size={14} />
                      Add Quick Fact
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {aboutDetails.map((detail, idx) => (
                      <div key={detail.id || idx} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ flex: '1' }}>
                          <input
                            type="text"
                            placeholder="Label (e.g. Nationality)"
                            className="form-input"
                            value={detail.label}
                            style={{ width: '100%' }}
                            onChange={e => {
                              const list = [...aboutDetails];
                              list[idx].label = e.target.value;
                              setAboutDetails(list);
                            }}
                          />
                        </div>
                        <div style={{ flex: '2' }}>
                          <input
                            type="text"
                            placeholder="Value (e.g. Indian)"
                            className="form-input"
                            value={detail.value}
                            style={{ width: '100%' }}
                            onChange={e => {
                              const list = [...aboutDetails];
                              list[idx].value = e.target.value;
                              setAboutDetails(list);
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '12px', borderRadius: 'var(--radius-sm)' }}
                          onClick={() => setAboutDetails(aboutDetails.filter((_, i) => i !== idx))}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {aboutDetails.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No personal details rows. Click Add to create one.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
             TAB: SKILLS & TECH
             ========================================== */}
          {activeTab === 'skills' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Skills & Technologies</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setSkills([...skills, { id: 's_' + Date.now().toString(36), name: '', category: 'Frontend', level: 'Expert' }])}
                    className="btn btn-secondary flex-center"
                    style={{ gap: '4px' }}
                  >
                    <Plus size={16} />
                    Add Skill
                  </button>
                  <button onClick={saveSkills} disabled={saveStatus.section === 'skills' && saveStatus.type === 'loading'} className="btn btn-primary flex-center" style={{ gap: '4px' }}>
                    <Save size={16} />
                    {saveStatus.section === 'skills' && saveStatus.type === 'loading' ? 'Saving...' : 'Save Skills'}
                  </button>
                </div>
              </div>

              {saveStatus.section === 'skills' && saveStatus.type !== 'loading' && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: saveStatus.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: saveStatus.type === 'success' ? '#22c55e' : '#ef4444' }}>
                  {saveStatus.text}
                </div>
              )}

              <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {skills.map((skill, idx) => (
                  <div key={skill.id || idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--card-border)'
                  }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '700', minWidth: '24px' }}>#{idx + 1}</span>
                    
                    <div style={{ flex: '2' }}>
                      <input
                        type="text"
                        placeholder="Skill Name"
                        className="form-input"
                        value={skill.name}
                        style={{ width: '100%' }}
                        onChange={e => {
                          const list = [...skills];
                          list[idx].name = e.target.value;
                          setSkills(list);
                        }}
                      />
                    </div>
                    
                    <div style={{ flex: '1.5' }}>
                      <input
                        type="text"
                        placeholder="Category (e.g. Frontend)"
                        className="form-input"
                        value={skill.category}
                        style={{ width: '100%' }}
                        onChange={e => {
                          const list = [...skills];
                          list[idx].category = e.target.value;
                          setSkills(list);
                        }}
                      />
                    </div>

                    <div style={{ flex: '1.5' }}>
                      <input
                        type="text"
                        placeholder="Level (e.g. Expert, 85%)"
                        className="form-input"
                        value={skill.level || ''}
                        style={{ width: '100%' }}
                        onChange={e => {
                          const list = [...skills];
                          list[idx].level = e.target.value;
                          setSkills(list);
                        }}
                      />
                    </div>

                    {/* Reorder Shuttles & Delete */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={idx === 0}
                        style={{ padding: '8px', border: 'none', background: 'var(--card-bg)' }}
                        onClick={() => moveItem(skills, setSkills, idx, 'up')}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={idx === skills.length - 1}
                        style={{ padding: '8px', border: 'none', background: 'var(--card-bg)' }}
                        onClick={() => moveItem(skills, setSkills, idx, 'down')}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ padding: '8px', border: 'none' }}
                        onClick={() => deleteItem(skills, setSkills, idx)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {skills.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No skills added. Click Add Skill to start.</p>}
              </div>
            </div>
          )}

          {/* ==========================================
             TAB: EXPERIENCE
             ========================================== */}
          {activeTab === 'experience' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Work Experience Timeline</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setExperiences([...experiences, { id: 'exp_' + Date.now().toString(36), role: '', company: '', period: '', description: '' }])}
                    className="btn btn-secondary flex-center"
                    style={{ gap: '4px' }}
                  >
                    <Plus size={16} />
                    Add Work Item
                  </button>
                  <button onClick={saveExperience} disabled={saveStatus.section === 'experience' && saveStatus.type === 'loading'} className="btn btn-primary flex-center" style={{ gap: '4px' }}>
                    <Save size={16} />
                    {saveStatus.section === 'experience' && saveStatus.type === 'loading' ? 'Saving...' : 'Save Experience'}
                  </button>
                </div>
              </div>

              {saveStatus.section === 'experience' && saveStatus.type !== 'loading' && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: saveStatus.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: saveStatus.type === 'success' ? '#22c55e' : '#ef4444' }}>
                  {saveStatus.text}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {experiences.map((exp, idx) => (
                  <div key={exp.id || idx} className="glass-card" style={{ padding: '24px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
                      <span style={{ fontWeight: '700', color: 'var(--primary)' }}>Work Experience #{idx + 1}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="btn btn-secondary" disabled={idx === 0} style={{ padding: '6px 10px', fontSize: '0.8rem', border: 'none' }} onClick={() => moveItem(experiences, setExperiences, idx, 'up')}>
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" className="btn btn-secondary" disabled={idx === experiences.length - 1} style={{ padding: '6px 10px', fontSize: '0.8rem', border: 'none' }} onClick={() => moveItem(experiences, setExperiences, idx, 'down')}>
                          <ArrowDown size={14} />
                        </button>
                        <button type="button" className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '0.8rem', border: 'none' }} onClick={() => deleteItem(experiences, setExperiences, idx)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid-form-3">
                      <div className="form-group">
                        <label className="form-label">Role Title</label>
                        <input type="text" className="form-input" value={exp.role} onChange={e => {
                          const list = [...experiences];
                          list[idx].role = e.target.value;
                          setExperiences(list);
                        }} placeholder="e.g. Lead Developer" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Company Name</label>
                        <input type="text" className="form-input" value={exp.company} onChange={e => {
                          const list = [...experiences];
                          list[idx].company = e.target.value;
                          setExperiences(list);
                        }} placeholder="e.g. Google" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Period / Dates</label>
                        <input type="text" className="form-input" value={exp.period} onChange={e => {
                          const list = [...experiences];
                          list[idx].period = e.target.value;
                          setExperiences(list);
                        }} placeholder="e.g. Jan 2024 - Present" />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label">Role Description</label>
                      <textarea className="form-input" style={{ minHeight: '80px' }} value={exp.description} onChange={e => {
                        const list = [...experiences];
                        list[idx].description = e.target.value;
                        setExperiences(list);
                      }} placeholder="Describe duties and accomplishments..."></textarea>
                    </div>
                  </div>
                ))}
                {experiences.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }} className="glass-card">No work items added. Click Add Work Item to start.</p>}
              </div>
            </div>
          )}

          {/* ==========================================
             TAB: EDUCATION
             ========================================== */}
          {activeTab === 'education' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Education Timeline</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setEducation([...education, { id: 'edu_' + Date.now().toString(36), degree: '', institution: '', period: '', description: '' }])}
                    className="btn btn-secondary flex-center"
                    style={{ gap: '4px' }}
                  >
                    <Plus size={16} />
                    Add Education Item
                  </button>
                  <button onClick={saveEducation} disabled={saveStatus.section === 'education' && saveStatus.type === 'loading'} className="btn btn-primary flex-center" style={{ gap: '4px' }}>
                    <Save size={16} />
                    {saveStatus.section === 'education' && saveStatus.type === 'loading' ? 'Saving...' : 'Save Education'}
                  </button>
                </div>
              </div>

              {saveStatus.section === 'education' && saveStatus.type !== 'loading' && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: saveStatus.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: saveStatus.type === 'success' ? '#22c55e' : '#ef4444' }}>
                  {saveStatus.text}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {education.map((edu, idx) => (
                  <div key={edu.id || idx} className="glass-card" style={{ padding: '24px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
                      <span style={{ fontWeight: '700', color: 'var(--secondary)' }}>Education Item #{idx + 1}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="btn btn-secondary" disabled={idx === 0} style={{ padding: '6px 10px', fontSize: '0.8rem', border: 'none' }} onClick={() => moveItem(education, setEducation, idx, 'up')}>
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" className="btn btn-secondary" disabled={idx === education.length - 1} style={{ padding: '6px 10px', fontSize: '0.8rem', border: 'none' }} onClick={() => moveItem(education, setEducation, idx, 'down')}>
                          <ArrowDown size={14} />
                        </button>
                        <button type="button" className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '0.8rem', border: 'none' }} onClick={() => deleteItem(education, setEducation, idx)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid-form-3">
                      <div className="form-group">
                        <label className="form-label">Degree / Program</label>
                        <input type="text" className="form-input" value={edu.degree} onChange={e => {
                          const list = [...education];
                          list[idx].degree = e.target.value;
                          setEducation(list);
                        }} placeholder="e.g. M.S. in Software Engineering" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">School / Institution</label>
                        <input type="text" className="form-input" value={edu.institution} onChange={e => {
                          const list = [...education];
                          list[idx].institution = e.target.value;
                          setEducation(list);
                        }} placeholder="e.g. Stanford University" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Period / Dates</label>
                        <input type="text" className="form-input" value={edu.period} onChange={e => {
                          const list = [...education];
                          list[idx].period = e.target.value;
                          setEducation(list);
                        }} placeholder="e.g. 2020 - 2022" />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label">Description / Core Syllabus</label>
                      <textarea className="form-input" style={{ minHeight: '80px' }} value={edu.description || ''} onChange={e => {
                        const list = [...education];
                        list[idx].description = e.target.value;
                        setEducation(list);
                      }} placeholder="e.g. Core focus on Algorithms, Networks and Software Architectures. Graduated top 10%..."></textarea>
                    </div>
                  </div>
                ))}
                {education.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }} className="glass-card">No education items added. Click Add Education to start.</p>}
              </div>
            </div>
          )}

          {/* ==========================================
             TAB: PROJECTS
             ========================================== */}
          {activeTab === 'projects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Projects Catalogue</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setProjects([...projects, { id: 'p_' + Date.now().toString(36), title: '', description: '', image: '', technologies: [], githubLink: '', liveLink: '' }])}
                    className="btn btn-secondary flex-center"
                    style={{ gap: '4px' }}
                  >
                    <Plus size={16} />
                    Add Project
                  </button>
                  <button onClick={saveProjects} disabled={saveStatus.section === 'projects' && saveStatus.type === 'loading'} className="btn btn-primary flex-center" style={{ gap: '4px' }}>
                    <Save size={16} />
                    {saveStatus.section === 'projects' && saveStatus.type === 'loading' ? 'Saving...' : 'Save Projects'}
                  </button>
                </div>
              </div>

              {saveStatus.section === 'projects' && saveStatus.type !== 'loading' && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: saveStatus.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: saveStatus.type === 'success' ? '#22c55e' : '#ef4444' }}>
                  {saveStatus.text}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {projects.map((proj, idx) => (
                  <div key={proj.id || idx} className="glass-card" style={{ padding: '32px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
                      <span style={{ fontWeight: '700', color: 'var(--primary)' }}>Project #{idx + 1}: {proj.title || 'Untitled'}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="btn btn-secondary" disabled={idx === 0} style={{ padding: '6px 10px', fontSize: '0.8rem', border: 'none' }} onClick={() => moveItem(projects, setProjects, idx, 'up')}>
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" className="btn btn-secondary" disabled={idx === projects.length - 1} style={{ padding: '6px 10px', fontSize: '0.8rem', border: 'none' }} onClick={() => moveItem(projects, setProjects, idx, 'down')}>
                          <ArrowDown size={14} />
                        </button>
                        <button type="button" className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '0.8rem', border: 'none' }} onClick={() => deleteItem(projects, setProjects, idx)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }} className="project-grid-fields">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="form-group">
                          <label className="form-label">Project Title</label>
                          <input type="text" className="form-input" value={proj.title} onChange={e => {
                            const list = [...projects];
                            list[idx].title = e.target.value;
                            setProjects(list);
                          }} placeholder="e.g. Chat application" />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Technologies (Comma-separated)</label>
                          <input type="text" className="form-input" value={proj.technologies ? proj.technologies.join(', ') : ''} onChange={e => {
                            const list = [...projects];
                            list[idx].technologies = e.target.value.split(',').map(item => item.trim()).filter(item => item !== '');
                            setProjects(list);
                          }} placeholder="e.g. React, Node.js, Socket.io" />
                        </div>
                      </div>

                      {/* Project Image Panel */}
                      <div className="form-group">
                        <label className="form-label">Project Image URL</label>
                        <input type="text" className="form-input" value={proj.image || ''} onChange={e => {
                          const list = [...projects];
                          list[idx].image = e.target.value;
                          setProjects(list);
                        }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                          <label className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', gap: '4px', cursor: 'pointer' }}>
                            <Upload size={14} />
                            Upload Project Image
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={e => handleFileUpload(e, `project_${idx}_img`, 'projects', (url) => {
                                const list = [...projects];
                                list[idx].image = url;
                                setProjects(list);
                              })}
                            />
                          </label>
                          {uploadProgress.target === `project_${idx}_img` && <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Uploading...</span>}
                        </div>
                      </div>
                    </div>

                    <div className="grid-form-2">
                      <div className="form-group">
                        <label className="form-label">GitHub Repository URL</label>
                        <input type="url" className="form-input" value={proj.githubLink || ''} onChange={e => {
                          const list = [...projects];
                          list[idx].githubLink = e.target.value;
                          setProjects(list);
                        }} placeholder="https://github.com/..." />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Live Demo Link</label>
                        <input type="url" className="form-input" value={proj.liveLink || ''} onChange={e => {
                          const list = [...projects];
                          list[idx].liveLink = e.target.value;
                          setProjects(list);
                        }} placeholder="https://demo-app.com" />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label">Project Description</label>
                      <textarea className="form-input" style={{ minHeight: '80px' }} value={proj.description} onChange={e => {
                        const list = [...projects];
                        list[idx].description = e.target.value;
                        setProjects(list);
                      }} placeholder="Detail the purpose, features and architecture of the project..."></textarea>
                    </div>
                  </div>
                ))}
                {projects.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }} className="glass-card">No projects added. Click Add Project to start.</p>}
              </div>
            </div>
          )}

          {/* ==========================================
             TAB: ACHIEVEMENTS
             ========================================== */}
          {activeTab === 'achievements' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Achievements & Certifications</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setAchievements([...achievements, { id: 'ach_' + Date.now().toString(36), title: '', issuer: '', date: '', description: '' }])}
                    className="btn btn-secondary flex-center"
                    style={{ gap: '4px' }}
                  >
                    <Plus size={16} />
                    Add Achievement
                  </button>
                  <button onClick={saveAchievements} disabled={saveStatus.section === 'achievements' && saveStatus.type === 'loading'} className="btn btn-primary flex-center" style={{ gap: '4px' }}>
                    <Save size={16} />
                    {saveStatus.section === 'achievements' && saveStatus.type === 'loading' ? 'Saving...' : 'Save Achievements'}
                  </button>
                </div>
              </div>

              {saveStatus.section === 'achievements' && saveStatus.type !== 'loading' && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: saveStatus.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: saveStatus.type === 'success' ? '#22c55e' : '#ef4444' }}>
                  {saveStatus.text}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {achievements.map((ach, idx) => (
                  <div key={ach.id || idx} className="glass-card" style={{ padding: '24px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
                      <span style={{ fontWeight: '700', color: 'var(--primary)' }}>Achievement #{idx + 1}: {ach.title || 'Untitled'}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="btn btn-secondary" disabled={idx === 0} style={{ padding: '6px 10px', fontSize: '0.8rem', border: 'none' }} onClick={() => moveItem(achievements, setAchievements, idx, 'up')}>
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" className="btn btn-secondary" disabled={idx === achievements.length - 1} style={{ padding: '6px 10px', fontSize: '0.8rem', border: 'none' }} onClick={() => moveItem(achievements, setAchievements, idx, 'down')}>
                          <ArrowDown size={14} />
                        </button>
                        <button type="button" className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '0.8rem', border: 'none' }} onClick={() => deleteItem(achievements, setAchievements, idx)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="grid-form-3">
                      <div className="form-group">
                        <label className="form-label">Title / Recognition</label>
                        <input type="text" className="form-input" value={ach.title} onChange={e => {
                          const list = [...achievements];
                          list[idx].title = e.target.value;
                          setAchievements(list);
                        }} placeholder="e.g. AWS Certified Solutions Architect" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Issuer Org</label>
                        <input type="text" className="form-input" value={ach.issuer} onChange={e => {
                          const list = [...achievements];
                          list[idx].issuer = e.target.value;
                          setAchievements(list);
                        }} placeholder="e.g. Amazon Web Services" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Date Earned</label>
                        <input type="text" className="form-input" value={ach.date} onChange={e => {
                          const list = [...achievements];
                          list[idx].date = e.target.value;
                          setAchievements(list);
                        }} placeholder="e.g. March 2024" />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label">Description / Credentials</label>
                      <textarea className="form-input" style={{ minHeight: '80px' }} value={ach.description || ''} onChange={e => {
                        const list = [...achievements];
                        list[idx].description = e.target.value;
                        setAchievements(list);
                      }} placeholder="Brief description of credential, skills validated or grade..."></textarea>
                    </div>
                  </div>
                ))}
                {achievements.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }} className="glass-card">No achievements added. Click Add Achievement to start.</p>}
              </div>
            </div>
          )}

          {/* ==========================================
             TAB: MESSAGES
             ========================================== */}
          {activeTab === 'messages' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2>Contact Inquiries Inbox</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {messages.map((msg) => (
                  <div key={msg.id} className="glass-card" style={{ padding: '24px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      borderBottom: '1px solid var(--card-border)',
                      paddingBottom: '12px',
                      marginBottom: '16px',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>{msg.subject}</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          From: <strong>{msg.name}</strong> ({msg.email})
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          className="btn btn-danger"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', border: 'none' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p style={{
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      background: 'var(--bg-primary)',
                      padding: '16px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--card-border)'
                    }}>
                      {msg.message}
                    </p>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '60px' }} className="glass-card">
                    Your inbox is empty. No user inquiries received yet.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ==========================================
             TAB: SECURITY / PASSWORD
             ========================================== */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2>Security Settings & Authentication</h2>

              {saveStatus.section === 'security' && saveStatus.type !== 'loading' && (
                <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: saveStatus.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: saveStatus.type === 'success' ? '#22c55e' : '#ef4444' }}>
                  {saveStatus.text}
                </div>
              )}

              <div className="glass-card" style={{ padding: '32px', maxWidth: '500px' }}>
                <h3 style={{ marginBottom: '20px' }}>Update Admin Password</h3>
                <form onSubmit={updatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={securityForm.currentPassword}
                      onChange={e => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={securityForm.newPassword}
                      onChange={e => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary flex-center"
                    disabled={saveStatus.section === 'security' && saveStatus.type === 'loading'}
                    style={{ gap: '6px', width: '100%', marginTop: '8px' }}
                  >
                    <Save size={16} />
                    {saveStatus.section === 'security' && saveStatus.type === 'loading' ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Responsive layout style override for dashboard sidebar */}
      <style>{`
        .grid-form-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .grid-form-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 768px) {
          .grid-form-2, .grid-form-3 {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .dashboard-sidebar {
            flex: 1 0 100% !important;
            max-width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid var(--card-border) !important;
            flex-direction: row !important;
            overflow-x: auto !important;
            padding: 12px !important;
          }
          .dashboard-sidebar button {
            white-space: nowrap !important;
            padding: 8px 12px !important;
          }
          .dashboard-sidebar button span {
            display: none !important;
          }
          main {
            padding: 20px !important;
            max-height: none !important;
            overflow-y: visible !important;
          }
          .project-grid-fields {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
