import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ChatbotPanel from '../components/ChatbotPanel';
import FeasibilityReportModal from '../components/FeasibilityReportModal';
import ScopeReportModal from '../components/ScopeReportModal';
import TechStackReportModal from '../components/TechStackReportModal';
import RiskReportModal from '../components/RiskReportModal';
import { Store, fmtDate } from '../utils/store';
import { showToast } from '../utils/toast';
import {
  submitIdeaToBackend,
  fetchFeasibilityReport,
  fetchScopeReport,
  fetchTechStackReport,
  fetchRiskReport,
  getUserProfile,
  fetchUserIdeas,
  updateIdeaInBackend,
  deleteIdeaInBackend
} from '../utils/api';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ done: 0, total: 0, pct: 0, feasibility: '—', week: '—', weekLabel: 'Not evaluated' });
  
  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  // AI Feasibility Agent State (Real CrewAI + Groq)
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [analyzingProjectTitle, setAnalyzingProjectTitle] = useState(null);

  // AI Scope Definition Agent State (Real CrewAI + Groq)
  const [selectedScopeReport, setSelectedScopeReport] = useState(null);
  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
  const [scopingProjectTitle, setScopingProjectTitle] = useState(null);

  // AI Tech Stack Agent State (Real CrewAI + Groq — Agent 3, chained)
  const [selectedTechStackReport, setSelectedTechStackReport] = useState(null);
  const [isTechStackModalOpen, setIsTechStackModalOpen] = useState(false);
  const [techStackingProjectTitle, setTechStackingProjectTitle] = useState(null);

  // AI Risk Assessment Agent State (Real CrewAI + Groq — Agent 4, chained)
  const [selectedRiskReport, setSelectedRiskReport] = useState(null);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [riskingProjectTitle, setRiskingProjectTitle] = useState(null);
  
  // Idea Form State
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDesc, setIdeaDesc] = useState('');
  const [ideaDomain, setIdeaDomain] = useState('');
  const [ideaDuration, setIdeaDuration] = useState('30');
  const [ideaTeamSize, setIdeaTeamSize] = useState('3');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [ideaTechIdeas, setIdeaTechIdeas] = useState('');
  const [ideaRefLink, setIdeaRefLink] = useState('');
  const [ideaFeatures, setIdeaFeatures] = useState([]);
  const [featureInput, setFeatureInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [durationMode, setDurationMode] = useState('weeks'); // 'weeks' or 'days'
  const fileInputRef = useRef(null);

  // Chat State
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hello! I am your AI Project Mentor. Ask me anything about your project feasibility, scope boundaries, tech stack selection, or milestone deliverables!', time: new Date().toISOString() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [avatar, setAvatar] = useState(null);

  const chatMessagesEndRef = useRef(null);
  const avatarInputRef = useRef(null);

  const updateStats = (projs = []) => {
    const first = projs[0];
    const feas = first?.feasibility ? `${first.feasibility}%` : '—';
    const verdict = first?.feasibilityReport?.verdict || 'Awaiting Review';

    setStats({ 
      done: projs.length, 
      total: projs.length, 
      pct: first?.feasibility ? first.feasibility : 0, 
      feasibility: feas, 
      week: verdict, 
      weekLabel: first?.feasibilityReport ? 'AI Verified (CrewAI)' : 'Pending Review' 
    });
  };

  const loadProjects = async (forcedEmail = null) => {
    const user = Store.get('currentUser');
    const email = (forcedEmail || user?.email || '').trim().toLowerCase();
    if (!email) return;

    // 1. Immediate load from account-isolated localStorage
    let userProjs = Store.getUserProjects(email);
    setProjects(userProjs);
    updateStats(userProjs);

    // 2. Query backend for this specific user's ideas
    try {
      const remoteIdeas = await fetchUserIdeas(email);
      if (Array.isArray(remoteIdeas)) {
        const mapped = remoteIdeas.map(item => ({
          id: item.idea_id || item.id || item._id,
          idea_id: item.idea_id || item.id || item._id,
          title: item.title || 'Academic Project',
          desc: item.desc || '',
          domain: item.domain || 'web',
          teamSize: item.team_size || item.teamSize || '3',
          durationDays: item.duration_days || item.durationDays || 30,
          durationUnit: item.duration_unit || item.durationUnit || 'weeks',
          techIdeas: item.tech_ideas || item.techIdeas || '',
          refLink: item.refLink || '',
          features: item.features || [],
          uploadedFiles: item.uploaded_files || item.uploadedFiles || [],
          feasibility: item.feasibility || (item.feasibilityReport ? item.feasibilityReport.overallScore : null),
          feasibilityReport: item.feasibilityReport || item.feasibility_report || null,
          scopeReport: item.scopeReport || item.scope_report || null,
          techStackReport: item.techStackReport || item.tech_stack_report || null,
          riskReport: item.riskReport || item.risk_report || null,
          status: item.status || 'pending_review',
          submittedAt: item.created_at || item.submittedAt || new Date().toISOString()
        }));

        const combined = mapped.map(rm => {
          const localMatch = userProjs.find(lp => (lp.id && lp.id === rm.id) || lp.title === rm.title);
          if (localMatch) {
            return {
              ...rm,
              rawFiles: localMatch.rawFiles || rm.uploadedFiles,
              feasibilityReport: rm.feasibilityReport || localMatch.feasibilityReport,
              scopeReport: rm.scopeReport || localMatch.scopeReport,
              techStackReport: rm.techStackReport || localMatch.techStackReport,
              riskReport: rm.riskReport || localMatch.riskReport,
              feasibility: rm.feasibility || localMatch.feasibility,
            };
          }
          return rm;
        });

        setProjects(combined);
        Store.setUserProjects(email, combined);
        updateStats(combined);
      }
    } catch (err) {
      console.log('Backend user ideas fetch:', err);
    }
  };

  useEffect(() => {
    const user = Store.get('currentUser');
    if (!user || !user.loggedIn) {
      navigate('/login');
      return;
    }
    let p = Store.get('profile');
    const hasCompleted = Boolean(
      user.hasCompletedProfile ||
      p?.hasCompletedProfile ||
      (p?.skills && Object.keys(p.skills).length > 0)
    );

    if (!hasCompleted && (!p || !p.skills || Object.keys(p.skills).length === 0)) {
      getUserProfile(user.email).then(remoteUser => {
        if (remoteUser && (remoteUser.hasCompletedProfile || (remoteUser.skills && Object.keys(remoteUser.skills).length > 0))) {
          const profileData = {
            ...remoteUser,
            skills: remoteUser.skills || {},
            domains: remoteUser.domains || [],
            hasCompletedProfile: true
          };
          Store.set('profile', profileData);
          setProfile(profileData);
          loadProjects(user.email);
        } else {
          navigate('/profile');
        }
      }).catch(() => {
        navigate('/profile');
      });
      return;
    }
    if (p) {
      setProfile(p);
      if (p.domains && p.domains.length > 0) {
        setIdeaDomain(p.domains[0]);
      }
      if (p.teamSize) {
        setIdeaTeamSize(p.teamSize);
      }
    }

    const storedAvatar = Store.get('avatarDataUrl') || p?.avatar || user.avatar;
    if (storedAvatar) setAvatar(storedAvatar);

    loadProjects(user.email);
  }, [navigate]);

  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCheckFeasibility = async (proj, pIndex = null) => {
    const user = Store.get('currentUser');
    const email = user?.email;
    setAnalyzingProjectTitle(proj.title);
    try {
      // Prepare files with base64 content for text extraction
      const filesRaw = proj.rawFiles || proj.uploadedFiles || [];
      const filesToSend = [];
      for (const f of filesRaw) {
        if (f.dataUrl) {
          const base64Content = f.dataUrl.split(',')[1] || '';
          filesToSend.push({
            name: f.name,
            contentBase64: base64Content,
            contentType: f.type,
          });
        }
      }

      const report = await fetchFeasibilityReport({
        title: proj.title || 'Academic Project',
        desc: proj.desc || '',
        domain: (proj.domain || 'web').toLowerCase(),
        teamSize: String(proj.teamSize || 3),
        durationDays: parseInt(proj.durationDays) || 30,
        techIdeas: proj.techIdeas || '',
        features: proj.features || [],
        studentSkills: profile?.skills || {},
        uploadedFiles: filesToSend,
      });

      let currentProjs = email ? Store.getUserProjects(email) : [...projects];
      let targetIdx = pIndex;
      if (targetIdx === null) {
        targetIdx = currentProjs.findIndex(p => p.title === proj.title || (p.id && p.id === proj.id));
      }

      const updatedProj = {
        ...proj,
        feasibility: report.overallScore,
        feasibilityReport: report,
        status: 'reviewed',
        submittedAt: proj.submittedAt || new Date().toISOString()
      };

      if (targetIdx !== -1 && targetIdx !== null && currentProjs[targetIdx]) {
        currentProjs[targetIdx] = {
          ...currentProjs[targetIdx],
          ...updatedProj
        };
      } else {
        currentProjs.unshift(updatedProj);
      }

      if (email) {
        Store.setUserProjects(email, currentProjs);
      }
      setProjects(currentProjs);
      updateStats(currentProjs);

      // Persist to backend
      const ideaId = updatedProj.id || updatedProj.idea_id;
      if (ideaId) {
        updateIdeaInBackend(ideaId, {
          feasibility: report.overallScore,
          feasibilityReport: report,
          status: 'reviewed'
        }).catch(err => console.warn('Could not sync report to backend:', err));
      }

      setSelectedReport(report);
      setSelectedProject(updatedProj);
      setIsReportModalOpen(true);
    } catch (err) {
      console.error('Feasibility agent failed:', err);
      showToast('AI Feasibility agent failed. Backend running?', '❌');
    } finally {
      setAnalyzingProjectTitle(null);
    }
  };

  // ── Scope Definition Agent handler ──
  const handleRunScope = async (proj, pIndex = null) => {
    const user = Store.get('currentUser');
    const email = user?.email;
    setScopingProjectTitle(proj.title);
    try {
      const filesRaw = proj.rawFiles || proj.uploadedFiles || [];
      const filesToSend = [];
      for (const f of filesRaw) {
        if (f.dataUrl) {
          const base64Content = f.dataUrl.split(',')[1] || '';
          filesToSend.push({ name: f.name, contentBase64: base64Content, contentType: f.type });
        }
      }

      const scopeReport = await fetchScopeReport({
        title: proj.title || 'Academic Project',
        desc: proj.desc || '',
        domain: (proj.domain || 'web').toLowerCase(),
        teamSize: String(proj.teamSize || 3),
        durationDays: parseInt(proj.durationDays) || 30,
        techIdeas: proj.techIdeas || '',
        features: proj.features || [],
        studentSkills: profile?.skills || {},
        uploadedFiles: filesToSend,
        // Agent chaining: pass Agent 1 output so backend embeds it in the response
        feasibilityReport: proj.feasibilityReport || null,
      });

      // Persist scope to project
      let currentProjs = email ? Store.getUserProjects(email) : [...projects];
      let targetIdx = pIndex;
      if (targetIdx === null) {
        targetIdx = currentProjs.findIndex(p => p.title === proj.title || (p.id && p.id === proj.id));
      }
      if (targetIdx !== -1 && targetIdx !== null && currentProjs[targetIdx]) {
        currentProjs[targetIdx] = { ...currentProjs[targetIdx], scopeReport };
      }
      if (email) {
        Store.setUserProjects(email, currentProjs);
      }
      setProjects(currentProjs);
      updateStats(currentProjs);

      // Persist to backend
      const ideaId = proj.id || proj.idea_id;
      if (ideaId) {
        updateIdeaInBackend(ideaId, { scopeReport }).catch(err => console.warn('Scope sync failed:', err));
      }

      setSelectedScopeReport(scopeReport);
      setSelectedProject(proj);
      setIsScopeModalOpen(true);
    } catch (err) {
      console.error('Scope agent failed:', err);
      showToast('Scope agent failed. Is the backend running?', '❌');
    } finally {
      setScopingProjectTitle(null);
    }
  };

  // ── Tech Stack Agent handler (Agent 3 — chained from Agent 1 + Agent 2) ──
  const handleRunTechStack = async (proj, pIndex = null) => {
    // Enforce chaining: both upstream reports must exist
    if (!proj.feasibilityReport) {
      showToast('Run Feasibility Agent first (Agent 1 required)', '⚠️');
      return;
    }
    if (!proj.scopeReport) {
      showToast('Run Scope Agent first (Agent 2 required)', '⚠️');
      return;
    }

    const user = Store.get('currentUser');
    const email = user?.email;
    setTechStackingProjectTitle(proj.title);
    try {
      // Agent chaining: feasibilityReport is embedded inside scopeReport by the backend.
      // Fall back to proj.feasibilityReport if the scope was run before this feature was added.
      const chainedFeasReport = proj.scopeReport?.feasibilityReport || proj.feasibilityReport;

      const techStackReport = await fetchTechStackReport({
        title:            proj.title || 'Academic Project',
        desc:             proj.desc || '',
        domain:           (proj.domain || 'web').toLowerCase(),
        teamSize:         String(proj.teamSize || 3),
        durationDays:     parseInt(proj.durationDays) || 30,
        techIdeas:        proj.techIdeas || '',
        features:         proj.features || [],
        studentSkills:    profile?.skills || {},
        // Chain: Agent 1 output (from embedded scope or direct), Agent 2 output
        feasibilityReport: chainedFeasReport,
        scopeReport:       proj.scopeReport,
      });

      // Persist tech stack to project
      let currentProjs = email ? Store.getUserProjects(email) : [...projects];
      let targetIdx = pIndex;
      if (targetIdx === null) {
        targetIdx = currentProjs.findIndex(p => p.title === proj.title || (p.id && p.id === proj.id));
      }
      if (targetIdx !== -1 && targetIdx !== null && currentProjs[targetIdx]) {
        currentProjs[targetIdx] = { ...currentProjs[targetIdx], techStackReport };
      }
      if (email) {
        Store.setUserProjects(email, currentProjs);
      }
      setProjects(currentProjs);
      updateStats(currentProjs);

      // Persist to backend
      const ideaId = proj.id || proj.idea_id;
      if (ideaId) {
        updateIdeaInBackend(ideaId, { techStackReport }).catch(err =>
          console.warn('Tech stack sync failed:', err)
        );
      }

      setSelectedTechStackReport(techStackReport);
      setSelectedProject(proj);
      setIsTechStackModalOpen(true);
    } catch (err) {
      console.error('Tech Stack agent failed:', err);
      showToast('Tech Stack agent failed. Is the backend running?', '❌');
    } finally {
      setTechStackingProjectTitle(null);
    }
  };

  // ── Risk Assessment Agent handler (Agent 4 — chained from Agents 1, 2, 3) ──
  const handleRunRisk = async (proj, pIndex = null) => {
    // Enforce chaining: all three upstream reports must exist
    if (!proj.feasibilityReport) {
      showToast('Run Feasibility Agent first (Agent 1 required)', '⚠️');
      return;
    }
    if (!proj.scopeReport) {
      showToast('Run Scope Agent first (Agent 2 required)', '⚠️');
      return;
    }
    if (!proj.techStackReport) {
      showToast('Run Tech Stack Agent first (Agent 3 required)', '⚠️');
      return;
    }

    const user = Store.get('currentUser');
    const email = user?.email;
    setRiskingProjectTitle(proj.title);
    try {
      // Agent chaining: pass all three upstream reports
      const chainedFeasReport = proj.scopeReport?.feasibilityReport || proj.feasibilityReport;

      const riskReport = await fetchRiskReport({
        title:             proj.title || 'Academic Project',
        desc:              proj.desc || '',
        domain:            (proj.domain || 'web').toLowerCase(),
        teamSize:          String(proj.teamSize || 3),
        durationDays:      parseInt(proj.durationDays) || 30,
        techIdeas:         proj.techIdeas || '',
        features:          proj.features || [],
        studentSkills:     profile?.skills || {},
        // Chain: all three upstream agent outputs
        feasibilityReport: chainedFeasReport,
        scopeReport:       proj.scopeReport,
        techStackReport:   proj.techStackReport,
      });

      // Persist risk report to project
      let currentProjs = email ? Store.getUserProjects(email) : [...projects];
      let targetIdx = pIndex;
      if (targetIdx === null) {
        targetIdx = currentProjs.findIndex(p => p.title === proj.title || (p.id && p.id === proj.id));
      }
      if (targetIdx !== -1 && targetIdx !== null && currentProjs[targetIdx]) {
        currentProjs[targetIdx] = { ...currentProjs[targetIdx], riskReport };
      }
      if (email) {
        Store.setUserProjects(email, currentProjs);
      }
      setProjects(currentProjs);
      updateStats(currentProjs);

      // Persist to backend
      const ideaId = proj.id || proj.idea_id;
      if (ideaId) {
        updateIdeaInBackend(ideaId, { riskReport }).catch(err =>
          console.warn('Risk report sync failed:', err)
        );
      }

      setSelectedRiskReport(riskReport);
      setSelectedProject(proj);
      setIsRiskModalOpen(true);
    } catch (err) {
      console.error('Risk Assessment agent failed:', err);
      showToast('Risk agent failed. Is the backend running?', '❌');
    } finally {
      setRiskingProjectTitle(null);
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2MB', '⚠️');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setAvatar(evt.target.result);
      Store.set('avatarDataUrl', evt.target.result);
      showToast('Profile photo updated!', '📸');
    };
    reader.readAsDataURL(file);
  };

  const openIdeaModal = (index = null) => {
    if (index !== null && projects[index]) {
      const p = projects[index];
      setIdeaTitle(p.title || '');
      setIdeaDesc(p.desc || '');
      setIdeaDomain(p.domain || '');
      setIdeaDuration((p.durationDays || 30).toString());
      setIdeaTeamSize(p.teamSize || '3');
      setIdeaTechIdeas(p.techIdeas || '');
      setIdeaRefLink(p.refLink || '');
      setIdeaFeatures(p.features || []);
      setUploadedFiles(p.uploadedFiles || []);
      setDurationMode(p.durationUnit || 'weeks');
      setEditingIndex(index);
    } else {
      setIdeaTitle('');
      setIdeaDesc('');
      setIdeaDuration('30');
      setIdeaTechIdeas('');
      setIdeaRefLink('');
      setIdeaFeatures([]);
      setUploadedFiles([]);
      setDurationMode('weeks');
      setEditingIndex(null);
    }
    setFeatureInput('');
    setIsModalOpen(true);
  };

  const closeIdeaModal = () => setIsModalOpen(false);

  // Feature tag helpers
  const addFeature = () => {
    const f = featureInput.trim();
    if (!f || ideaFeatures.includes(f)) return;
    setIdeaFeatures(prev => [...prev, f]);
    setFeatureInput('');
  };
  const removeFeature = (f) => setIdeaFeatures(prev => prev.filter(x => x !== f));

  // File upload helpers
  const ACCEPTED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'application/zip',
    'application/x-zip-compressed',
    'text/plain'
  ];
  const MAX_FILE_MB = 10;

  const processFiles = (files) => {
    Array.from(files).forEach(file => {
      if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|png|jpg|jpeg|gif|webp|zip|txt)$/i)) {
        showToast(`Unsupported file: ${file.name}`, '⚠️'); return;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        showToast(`${file.name} exceeds ${MAX_FILE_MB}MB limit`, '⚠️'); return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        setUploadedFiles(prev => {
          if (prev.some(f => f.name === file.name && f.size === file.size)) return prev;
          return [...prev, {
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: file.type.startsWith('image/') ? evt.target.result : null,
            uploadedAt: new Date().toISOString()
          }];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileInput = (e) => processFiles(e.target.files);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const removeFile = (name) => setUploadedFiles(prev => prev.filter(f => f.name !== name));

  const getFileIcon = (file) => {
    if (file.type === 'application/pdf') return '📄';
    if (file.type.includes('word')) return '📝';
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.includes('zip')) return '🗜️';
    return '📎';
  };

  const fmtFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Text formatting helper: wrap selected textarea text
  const applyFormat = (format) => {
    const ta = document.getElementById('ideaDescTA');
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ideaDesc.substring(start, end);
    let replaced = selected;
    if (format === 'bold') replaced = `**${selected || 'bold text'}**`;
    else if (format === 'bullet') replaced = `\n• ${selected || 'feature'}`;
    else if (format === 'numbered') replaced = `\n1. ${selected || 'step'}`;
    else if (format === 'code') replaced = `\`${selected || 'code'}\``;
    const newVal = ideaDesc.substring(0, start) + replaced + ideaDesc.substring(end);
    setIdeaDesc(newVal);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + replaced.length, start + replaced.length); }, 0);
  };

  const submitIdea = async (e) => {
    e.preventDefault();
    if (!ideaDesc.trim()) {
      showToast('Please enter an idea description.', '⚠️');
      return;
    }
    setIsSubmitting(true);

    const user = Store.get('currentUser');
    const email = (user?.email || '').trim().toLowerCase();

    const rawDur = parseInt(ideaDuration) || (durationMode === 'weeks' ? 4 : 30);
    const duration = durationMode === 'weeks' ? rawDur * 7 : rawDur;
    const domain = ideaDomain || 'web';
    const teamSize = ideaTeamSize || '3';
    const title = ideaTitle.trim() || 'Academic Project';

    const proj = {
      title,
      desc: ideaDesc.trim(),
      domain,
      teamSize,
      durationDays: duration,
      durationUnit: durationMode,
      techIdeas: ideaTechIdeas.trim(),
      refLink: ideaRefLink.trim(),
      features: ideaFeatures,
      uploadedFiles: uploadedFiles.map(f => ({ name: f.name, size: f.size, type: f.type, uploadedAt: f.uploadedAt })),
      status: 'pending_review',
      submittedAt: new Date().toISOString(),
      student_email: email,
    };

    // Send to backend attached to student email
    let backendIdeaId = null;
    try {
      const res = await submitIdeaToBackend({
        student_id: user?.id || user?.studentId || email,
        student_email: email,
        user_email: email,
        title: proj.title,
        desc: proj.desc,
        domain: proj.domain,
        teamSize: proj.teamSize,
        durationDays: proj.durationDays,
        durationUnit: durationMode,
        techIdeas: proj.techIdeas,
        refLink: proj.refLink,
        features: proj.features,
        uploadedFiles: proj.uploadedFiles
      });
      if (res && res.idea_id) {
        backendIdeaId = res.idea_id;
        proj.id = res.idea_id;
        proj.idea_id = res.idea_id;
      }
    } catch (err) {
      console.error('Backend submission failed, saving locally:', err);
    }

    let updatedProjects = email ? Store.getUserProjects(email) : [...projects];
    if (editingIndex !== null) {
      updatedProjects[editingIndex] = {
        ...updatedProjects[editingIndex],
        ...proj,
        submittedAt: updatedProjects[editingIndex].submittedAt || proj.submittedAt
      };
    } else {
      updatedProjects.unshift(proj);
    }

    if (email) {
      Store.setUserProjects(email, updatedProjects);
    }
    setProjects(updatedProjects);
    updateStats(updatedProjects);

    setIsSubmitting(false);
    closeIdeaModal();
    handleCheckFeasibility({ ...proj, rawFiles: uploadedFiles }, 0);
  };

  const handleDeleteProject = async (pIdx, e) => {
    if (e) e.stopPropagation();
    const projToDelete = projects[pIdx];
    if (!projToDelete) return;
    if (!window.confirm(`Are you sure you want to delete "${projToDelete.title}"?`)) return;

    const user = Store.get('currentUser');
    const email = (user?.email || '').trim().toLowerCase();
    const updated = projects.filter((_, idx) => idx !== pIdx);
    setProjects(updated);
    if (email) {
      Store.setUserProjects(email, updated);
    }
    updateStats(updated);

    const ideaId = projToDelete.id || projToDelete.idea_id;
    if (ideaId) {
      try {
        await deleteIdeaInBackend(ideaId);
      } catch (err) {
        console.warn('Backend delete failed:', err);
      }
    }
    showToast('Project deleted successfully.', '🗑️');
  };


  const startVoiceRecord = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition is not supported in this browser.', '⚠️');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      setIsListening(true);
      showToast('Listening... Speak now 🎙️', '🎤');

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setChatInput(transcript);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        showToast(`Voice error: ${event.error}`, '❌');
      };

      recognition.onend = () => {
        setIsListening(false);
        showToast('Voice recorded successfully', '✅');
      };

      recognition.start();
    } catch {
      setIsListening(false);
      showToast('Could not start voice recognition', '⚠️');
    }
  };

  const sendChatMessage = (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { role: 'user', text: chatInput.trim(), time: new Date().toISOString() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setChatInput('');

    // Generate intelligent mentor response only for BUILT agents
    setTimeout(() => {
      const q = userMsg.text.toLowerCase();
      let reply = '';

      const currentProj = projects[0];

      if (q.includes('feasibility') || q.includes('score') || q.includes('viable')) {
        // ✅ BUILT — Feasibility Agent
        if (currentProj?.feasibilityReport) {
          const r = currentProj.feasibilityReport;
          reply = `Your project's feasibility score is ${r.overallScore}% — Verdict: "${r.verdict}". ` +
            `Technical: ${r.metrics?.technical}%, Timeline: ${r.metrics?.timeline}%, ` +
            `Resources: ${r.metrics?.resource}%, Skill-Match: ${r.metrics?.skillMatch}%. ` +
            (r.strengths?.length ? `Top strength: ${r.strengths[0]}` : '');
        } else {
          reply = 'Run the AI Feasibility Check on your project card first to get a score!';
        }
      } else if (q.includes('scope') || q.includes('mvp') || q.includes('boundary') || q.includes('in scope') || q.includes('out of scope')) {
        // ✅ BUILT — Scope Agent
        if (currentProj?.scopeReport) {
          const s = currentProj.scopeReport;
          reply = `Scope Definition is ready! Problem: "${s.problemStatement?.slice(0, 120)}...". ` +
            `In Scope: ${s.inScope?.slice(0, 2).join('; ')}. ` +
            `Out of Scope: ${s.outOfScope?.slice(0, 1).join('; ')}. Click "View Scope Report" on your project card for the full breakdown.`;
        } else {
          reply = 'Run the AI Scope Agent on your project card to get a scope definition!';
        }
      } else if (q.includes('stack') || q.includes('technology') || q.includes('framework')) {
        // 🔲 NOT YET BUILT — Tech Stack Agent
        reply = '';
      } else if (q.includes('risk') || q.includes('problem') || q.includes('delay')) {
        // 🔲 NOT YET BUILT — Risk Agent
        reply = '';
      } else if (q.includes('milestone') || q.includes('timeline') || q.includes('deadline') || q.includes('plan')) {
        // 🔲 NOT YET BUILT — Milestone/Blueprint Agent
        reply = '';
      } else {
        reply = '';
      }

      if (reply) {
        setMessages(prev => [...prev, { role: 'ai', text: reply, time: new Date().toISOString() }]);
      }
    }, 700);
  };

  const scrollToChat = () => {
    document.getElementById('chatPanel')?.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('chatInput')?.focus();
  };

  if (!profile) return null;

  const initial = profile.firstName ? profile.firstName.charAt(0).toUpperCase() : 'S';

  return (
    <>
      <Navbar onOpenSubmitModal={() => openIdeaModal()} onOpenChat={scrollToChat} />
      <ChatbotPanel />
      <div className="page-bg-glow"></div>
      <div className="page-bg-glow-2"></div>

      <main className="dashboard-page">
        <div className="container-wide">

          {/* Welcome Bar */}
          <div className="welcome-bar animate-fade-up">
            <div className="welcome-info">
              <div 
                className="welcome-avatar" 
                onClick={() => avatarInputRef.current?.click()}
                title="Click to upload profile photo"
                style={{ cursor: 'pointer' }}
              >
                {avatar ? <img src={avatar} alt="Profile" /> : initial}
              </div>
              <input 
                type="file" 
                ref={avatarInputRef} 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleAvatarUpload} 
              />
              <div>
                <div className="welcome-name">{profile.firstName} {profile.lastName} 👋</div>
                <div className="welcome-sub">{profile.rollNo} · {profile.branch} · {profile.year}</div>
              </div>
            </div>
            <div className="welcome-actions">
              <Link to="/profile" className="btn btn-secondary btn-sm">✏️ Edit Profile</Link>
              <button className="btn btn-primary btn-sm" onClick={() => openIdeaModal()}>💡 Submit Idea</button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="stats-row animate-fade-up delay-1">
            <div className="stat-card">
              <div className="stat-card-label">Overall Progress</div>
              <div className="stat-card-value" style={{ color: 'var(--green)' }}>{stats.pct}%</div>
              <div className="stat-card-sub">of {stats.total} milestones</div>
              <div className="progress-bar-wrap" style={{ marginTop: '0.6rem' }}>
                <div className="progress-bar green" style={{ width: `${stats.pct}%` }}></div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-label">Submitted Projects</div>
              <div className="stat-card-value" style={{ fontSize: '1.4rem' }}>{projects.length}</div>
              <div className="stat-card-sub">{projects.length > 0 ? 'Active in System' : 'No projects yet'}</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-label">Latest Evaluation</div>
              <div className="stat-card-value" style={{ fontSize: '1.15rem', color: stats.feasibility !== '—' ? '#22c55e' : 'var(--text-muted)' }}>{stats.week}</div>
              <div className="stat-card-sub">{stats.weekLabel}</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-label">Feasibility Score</div>
              <div className="stat-card-value" style={{ color: 'var(--blue)' }}>{stats.feasibility}</div>
              <div className="stat-card-sub">CrewAI + Groq Agent</div>
            </div>
          </div>

          {/* Main Dash Grid */}
          <div className="dash-grid" style={{ marginTop: '1.25rem' }}>

            {/* Left Column: Projects */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div className="section-label" style={{ margin: 0 }}>Your Projects ({projects.length})</div>
                <button className="btn btn-secondary btn-sm" onClick={() => openIdeaModal()}>
                  + New Idea
                </button>
              </div>

              {/* Agent Pipeline Overview Bar */}
              {projects.length > 0 && (
                <div className="agent-pipeline-bar animate-fade-up" style={{ marginBottom: '1rem' }}>
                  {[
                    { icon: '📊', name: 'Feasibility', status: projects[0]?.feasibilityReport ? 'done' : 'active', txt: projects[0]?.feasibilityReport ? `${projects[0].feasibilityReport.overallScore}%` : 'Ready' },
                    { icon: '📐', name: 'Scope', status: projects[0]?.scopeReport ? 'done' : projects[0]?.feasibilityReport ? 'active' : 'pending', txt: projects[0]?.scopeReport ? 'Complete' : projects[0]?.feasibilityReport ? 'Ready' : 'Locked' },
                    { icon: '🛠️', name: 'Tech Stack', status: projects[0]?.techStackReport ? 'done' : (projects[0]?.feasibilityReport && projects[0]?.scopeReport) ? 'active' : 'pending', txt: projects[0]?.techStackReport ? 'Complete' : (projects[0]?.feasibilityReport && projects[0]?.scopeReport) ? 'Ready' : 'Locked' },
                    { icon: '⚠️', name: 'Risk', status: projects[0]?.riskReport ? 'done' : (projects[0]?.techStackReport) ? 'active' : 'pending', txt: projects[0]?.riskReport ? 'Complete' : projects[0]?.techStackReport ? 'Ready' : 'Locked' },
                    { icon: '🗺️', name: 'Blueprint', status: 'pending', txt: 'Coming Soon' },
                  ].map((step, i) => (
                    <div className="pipeline-step" key={i}>
                      <div className={`pipeline-dot ${step.status}`}>{step.icon}</div>
                      <div className="pipeline-info">
                        <div className="pipeline-name">{step.name}</div>
                        <div className="pipeline-status-txt">{step.txt}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {projects.length === 0 ? (
                <div className="empty-project animate-fade-up delay-2">
                  <div className="empty-project-icon">💡</div>
                  <h3 className="empty-project-title">No Project Submitted Yet</h3>
                  <p className="empty-project-desc">
                    Submit your project idea. Our CrewAI Feasibility Agent powered by Groq LLM will evaluate technical viability, timeline, resource availability, and document context.
                  </p>
                  <button className="btn btn-primary" onClick={() => openIdeaModal()}>
                    🚀 Submit Your Idea Now
                  </button>
                </div>
              ) : (
                projects.map((proj, pIdx) => (
                  <div className="project-card animate-fade-up delay-2" key={pIdx}>
                    <div className="project-card-top">
                      <div>
                        <div className="project-title">{proj.title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>
                          Submitted {fmtDate(proj.submittedAt)}
                          {' · '}
                          {(() => {
                            const d = proj.durationDays || 30;
                            const w = Math.floor(d / 7);
                            const rem = d % 7;
                            if (w === 0) return `${d} day${d !== 1 ? 's' : ''}`;
                            if (rem === 0) return `${w} week${w !== 1 ? 's' : ''}`;
                            return `${w}w ${rem}d`;
                          })()} · Team of {proj.teamSize || 1}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {proj.feasibility ? (
                          <span className="badge" style={{ background: 'rgba(34,197,94,0.15)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.3)' }}>
                            🎯 Feasibility: {proj.feasibility}% · {proj.feasibilityReport?.verdict || 'Feasible'}
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#f59e0b', border: '1px solid rgba(251,191,36,0.3)' }}>
                            ⏳ Pending AI Review
                          </span>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => openIdeaModal(pIdx)} title="Edit project">
                          ✏️
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={(e) => handleDeleteProject(pIdx, e)} title="Delete project" style={{ color: '#ef4444' }}>
                          🗑️
                        </button>
                      </div>
                    </div>

                    <p className="project-desc">{proj.desc}</p>

                    {/* Feature Tags */}
                    {proj.features && proj.features.length > 0 && (
                      <div className="feature-tags" style={{ marginBottom: '0.5rem' }}>
                        {proj.features.map((f, fi) => (
                          <span className="feature-tag" key={fi}>{f}</span>
                        ))}
                      </div>
                    )}

                    {/* Domain / team info row */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      {proj.domain && <span className="tech-tag">{proj.domain.toUpperCase()}</span>}
                      {proj.techIdeas && <span className="tech-tag">💡 {proj.techIdeas.slice(0, 40)}{proj.techIdeas.length > 40 ? '…' : ''}</span>}
                    </div>

                    {/* Uploaded files */}
                    {proj.uploadedFiles && proj.uploadedFiles.length > 0 && (
                      <div className="proj-uploads-row" style={{ marginTop: '0.5rem' }}>
                        {proj.uploadedFiles.map((f, fi) => (
                          <span className="proj-upload-badge" key={fi}>📎 {f.name}</span>
                        ))}
                      </div>
                    )}

                    {/* ══════════════════════════════════
                        AI AGENT PIPELINE PANEL
                        ══════════════════════════════════ */}
                    <div className="agent-panel">
                      <div className="agent-panel-title">
                        ⚡ AI Agent Pipeline
                      </div>
                      <div className="agent-grid">

                        {/* ── 1. FEASIBILITY AGENT ✅ Built ── */}
                        <div
                          className={`agent-card feasibility built ${analyzingProjectTitle === proj.title ? 'running' : ''}`}
                          onClick={() => {
                            if (analyzingProjectTitle === proj.title) return;
                            if (proj.feasibilityReport) {
                              setSelectedReport(proj.feasibilityReport);
                              setSelectedProject(proj);
                              setIsReportModalOpen(true);
                            } else {
                              handleCheckFeasibility(proj, pIdx);
                            }
                          }}
                        >
                          <div className="agent-card-top">
                            <div className="agent-icon blue">
                              {analyzingProjectTitle === proj.title ? <span className="agent-spin">⚙️</span> : '📊'}
                            </div>
                            <div className="agent-name">
                              Feasibility Agent
                              <div className="agent-subtext">Technical · Timeline · Skills</div>
                            </div>
                            <span className={`agent-status-pill ${analyzingProjectTitle === proj.title ? 'running' : proj.feasibilityReport ? 'done' : 'ready'}`}>
                              {analyzingProjectTitle === proj.title ? 'Running' : proj.feasibilityReport ? 'Done' : 'Ready'}
                            </span>
                          </div>

                          {proj.feasibilityReport && (
                            <>
                              <div className="agent-score-row">
                                <div className="agent-score-bar-wrap">
                                  <div
                                    className={`agent-score-bar ${proj.feasibilityReport.overallScore >= 80 ? 'green' : proj.feasibilityReport.overallScore >= 65 ? 'amber' : 'red'}`}
                                    style={{ width: `${proj.feasibilityReport.overallScore}%` }}
                                  />
                                </div>
                                <span className="agent-score-val">{proj.feasibilityReport.overallScore}%</span>
                              </div>
                              <div className="agent-verdict-text">
                                {proj.feasibilityReport.verdict}
                              </div>
                            </>
                          )}

                          <div className="agent-card-actions" onClick={e => e.stopPropagation()}>
                            {proj.feasibilityReport ? (
                              <>
                                <button className="agent-btn agent-btn-primary" onClick={() => { setSelectedReport(proj.feasibilityReport); setSelectedProject(proj); setIsReportModalOpen(true); }}>
                                  📋 View Report
                                </button>
                                <button className="agent-btn agent-btn-secondary" disabled={analyzingProjectTitle === proj.title} onClick={() => handleCheckFeasibility(proj, pIdx)}>
                                  {analyzingProjectTitle === proj.title ? <><span className="agent-spin">⟳</span> Running</> : '🔄 Re-run'}
                                </button>
                              </>
                            ) : (
                              <button className="agent-btn agent-btn-primary" disabled={analyzingProjectTitle === proj.title} onClick={() => handleCheckFeasibility(proj, pIdx)}>
                                {analyzingProjectTitle === proj.title ? <><span className="agent-spin">⟳</span> Analyzing…</> : '▶ Run Agent'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* ── 2. SCOPE AGENT ✅ Built ── */}
                        <div
                          className={`agent-card scope-def built ${scopingProjectTitle === proj.title ? 'running' : ''}`}
                          onClick={() => {
                            if (scopingProjectTitle === proj.title) return;
                            if (proj.scopeReport) {
                              setSelectedScopeReport(proj.scopeReport);
                              setSelectedProject(proj);
                              setIsScopeModalOpen(true);
                            } else {
                              handleRunScope(proj, pIdx);
                            }
                          }}
                        >
                          <div className="agent-card-top">
                            <div className="agent-icon indigo">
                              {scopingProjectTitle === proj.title ? <span className="agent-spin">⚙️</span> : '📐'}
                            </div>
                            <div className="agent-name">
                              Scope Agent
                              <div className="agent-subtext">Boundaries · MVP · Deliverables</div>
                            </div>
                            <span className={`agent-status-pill ${scopingProjectTitle === proj.title ? 'running' : proj.scopeReport ? 'done' : 'ready'}`}>
                              {scopingProjectTitle === proj.title ? 'Running' : proj.scopeReport ? 'Done' : 'Ready'}
                            </span>
                          </div>

                          {proj.scopeReport && (
                            <div className="agent-verdict-text">
                              {proj.scopeReport.problemStatement?.slice(0, 90)}{proj.scopeReport.problemStatement?.length > 90 ? '…' : ''}
                            </div>
                          )}

                          <div className="agent-card-actions" onClick={e => e.stopPropagation()}>
                            {proj.scopeReport ? (
                              <>
                                <button className="agent-btn agent-btn-indigo" onClick={() => { setSelectedScopeReport(proj.scopeReport); setSelectedProject(proj); setIsScopeModalOpen(true); }}>
                                  📋 View Report
                                </button>
                                <button className="agent-btn agent-btn-secondary" disabled={scopingProjectTitle === proj.title} onClick={() => handleRunScope(proj, pIdx)}>
                                  {scopingProjectTitle === proj.title ? <><span className="agent-spin">⟳</span> Running</> : '🔄 Re-run'}
                                </button>
                              </>
                            ) : (
                              <button className="agent-btn agent-btn-indigo" disabled={scopingProjectTitle === proj.title} onClick={() => handleRunScope(proj, pIdx)}>
                                {scopingProjectTitle === proj.title ? <><span className="agent-spin">⟳</span> Defining…</> : '▶ Run Agent'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* ── 3. TECH STACK AGENT ✅ Built (Agent 3 — chained) ── */}
                        <div
                          className={`agent-card tech-stack built ${techStackingProjectTitle === proj.title ? 'running' : ''}`}
                          onClick={() => {
                            if (techStackingProjectTitle === proj.title) return;
                            if (proj.techStackReport) {
                              setSelectedTechStackReport(proj.techStackReport);
                              setSelectedProject(proj);
                              setIsTechStackModalOpen(true);
                            } else {
                              handleRunTechStack(proj, pIdx);
                            }
                          }}
                        >
                          <div className="agent-card-top">
                            <div className="agent-icon amber">
                              {techStackingProjectTitle === proj.title ? <span className="agent-spin">⚙️</span> : '🛠️'}
                            </div>
                            <div className="agent-name">
                              Tech Stack Agent
                              <div className="agent-subtext">Framework · DB · APIs · Reasoning</div>
                            </div>
                            <span className={`agent-status-pill ${
                              techStackingProjectTitle === proj.title ? 'running' :
                              proj.techStackReport ? 'done' :
                              (!proj.feasibilityReport || !proj.scopeReport) ? 'locked' : 'ready'
                            }`}>
                              {techStackingProjectTitle === proj.title ? 'Running' :
                               proj.techStackReport ? 'Done' :
                               (!proj.feasibilityReport || !proj.scopeReport) ? '🔒 Locked' : 'Ready'}
                            </span>
                          </div>

                          {/* Chain indicator */}
                          <div style={{
                            fontSize: '0.68rem',
                            color: (proj.feasibilityReport && proj.scopeReport) ? 'rgba(245,158,11,0.7)' : 'rgba(255,255,255,0.25)',
                            marginBottom: '0.4rem',
                            display: 'flex', alignItems: 'center', gap: '0.3rem'
                          }}>
                            <span>🔗</span>
                            <span>
                              {proj.feasibilityReport ? '✅' : '⬜'} Feasibility →&nbsp;
                              {proj.scopeReport ? '✅' : '⬜'} Scope → Tech Stack
                            </span>
                          </div>

                          {proj.techStackReport && (
                            <div className="agent-verdict-text">
                              ⚡ {proj.techStackReport.recommendedStack?.frontend} + {proj.techStackReport.recommendedStack?.backend}
                            </div>
                          )}

                          <div className="agent-card-actions" onClick={e => e.stopPropagation()}>
                            {proj.techStackReport ? (
                              <>
                                <button className="agent-btn agent-btn-amber" onClick={() => { setSelectedTechStackReport(proj.techStackReport); setSelectedProject(proj); setIsTechStackModalOpen(true); }}>
                                  📋 View Report
                                </button>
                                <button className="agent-btn agent-btn-secondary" disabled={techStackingProjectTitle === proj.title} onClick={() => handleRunTechStack(proj, pIdx)}>
                                  {techStackingProjectTitle === proj.title ? <><span className="agent-spin">⟳</span> Running</> : '🔄 Re-run'}
                                </button>
                              </>
                            ) : (
                              <button
                                className="agent-btn agent-btn-amber"
                                disabled={techStackingProjectTitle === proj.title || !proj.feasibilityReport || !proj.scopeReport}
                                onClick={() => handleRunTechStack(proj, pIdx)}
                                title={!proj.feasibilityReport ? 'Run Feasibility Agent first' : !proj.scopeReport ? 'Run Scope Agent first' : ''}
                              >
                                {techStackingProjectTitle === proj.title
                                  ? <><span className="agent-spin">⟳</span> Analyzing…</>
                                  : (!proj.feasibilityReport || !proj.scopeReport)
                                    ? '🔒 Run prev. agents first'
                                    : '▶ Run Agent'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* ── 4. RISK AGENT ✅ Built (Agent 4 — chained) ── */}
                        <div
                          className={`agent-card risk built ${riskingProjectTitle === proj.title ? 'running' : ''}`}
                          onClick={() => {
                            if (riskingProjectTitle === proj.title) return;
                            if (proj.riskReport) {
                              setSelectedRiskReport(proj.riskReport);
                              setSelectedProject(proj);
                              setIsRiskModalOpen(true);
                            } else {
                              handleRunRisk(proj, pIdx);
                            }
                          }}
                        >
                          <div className="agent-card-top">
                            <div className="agent-icon rose">
                              {riskingProjectTitle === proj.title ? <span className="agent-spin">⚙️</span> : '⚠️'}
                            </div>
                            <div className="agent-name">
                              Risk Agent
                              <div className="agent-subtext">Blockers · Mitigations · Risk Register</div>
                            </div>
                            <span className={`agent-status-pill ${
                              riskingProjectTitle === proj.title ? 'running' :
                              proj.riskReport ? 'done' :
                              (!proj.feasibilityReport || !proj.scopeReport || !proj.techStackReport) ? 'locked' : 'ready'
                            }`}>
                              {riskingProjectTitle === proj.title ? 'Running' :
                               proj.riskReport ? 'Done' :
                               (!proj.feasibilityReport || !proj.scopeReport || !proj.techStackReport) ? '🔒 Locked' : 'Ready'}
                            </span>
                          </div>

                          {/* Chain indicator */}
                          <div style={{
                            fontSize: '0.68rem',
                            color: (proj.feasibilityReport && proj.scopeReport && proj.techStackReport) ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.25)',
                            marginBottom: '0.4rem',
                            display: 'flex', alignItems: 'center', gap: '0.3rem'
                          }}>
                            <span>🔗</span>
                            <span>
                              {proj.feasibilityReport ? '✅' : '⬜'} Feasibility →&nbsp;
                              {proj.scopeReport ? '✅' : '⬜'} Scope →&nbsp;
                              {proj.techStackReport ? '✅' : '⬜'} Tech Stack → Risk
                            </span>
                          </div>

                          {proj.riskReport && (
                            <div className="agent-verdict-text">
                              {proj.riskReport.overallRisk === 'High' ? '🔴' : proj.riskReport.overallRisk === 'Medium' ? '🟡' : '🟢'} {proj.riskReport.overallRisk} Risk · Score {proj.riskReport.riskScore}/100 · {proj.riskReport.risks?.length || 0} risks identified
                            </div>
                          )}

                          <div className="agent-card-actions" onClick={e => e.stopPropagation()}>
                            {proj.riskReport ? (
                              <>
                                <button className="agent-btn agent-btn-rose" onClick={() => { setSelectedRiskReport(proj.riskReport); setSelectedProject(proj); setIsRiskModalOpen(true); }}>
                                  📋 View Report
                                </button>
                                <button className="agent-btn agent-btn-secondary" disabled={riskingProjectTitle === proj.title} onClick={() => handleRunRisk(proj, pIdx)}>
                                  {riskingProjectTitle === proj.title ? <><span className="agent-spin">⟳</span> Running</> : '🔄 Re-run'}
                                </button>
                              </>
                            ) : (
                              <button
                                className="agent-btn agent-btn-rose"
                                disabled={riskingProjectTitle === proj.title || !proj.feasibilityReport || !proj.scopeReport || !proj.techStackReport}
                                onClick={() => handleRunRisk(proj, pIdx)}
                                title={!proj.feasibilityReport ? 'Run Feasibility Agent first' : !proj.scopeReport ? 'Run Scope Agent first' : !proj.techStackReport ? 'Run Tech Stack Agent first' : ''}
                              >
                                {riskingProjectTitle === proj.title
                                  ? <><span className="agent-spin">⟳</span> Analyzing…</>
                                  : (!proj.feasibilityReport || !proj.scopeReport || !proj.techStackReport)
                                    ? '🔒 Run prev. agents first'
                                    : '▶ Run Agent'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* ── 5. MILESTONE AGENT 🔲 Coming Soon ── */}
                        <div className="agent-card coming-soon">
                          <div className="agent-card-top">
                            <div className="agent-icon teal">🗺️</div>
                            <div className="agent-name">
                              Blueprint Agent
                              <div className="agent-subtext">Milestones · Sprint Plan</div>
                            </div>
                            <span className="agent-status-pill soon">Soon</span>
                          </div>
                          <div className="agent-lock">🔒 Not yet built</div>
                        </div>

                      </div>
                    </div>

                  </div>
                ))
              )}
            </div>

            {/* Right Column: Quick Actions & Chat */}
            <div>
              <div className="section-label">Quick Actions</div>
              <div className="quick-actions animate-fade-up delay-2">
                <button className="quick-action-btn" onClick={() => openIdeaModal()}>
                  <span className="quick-action-icon">💡</span>
                  <span>Submit / Update Project Idea</span>
                </button>
                <Link to="/profile" className="quick-action-btn">
                  <span className="quick-action-icon">👤</span>
                  <span>Update Profile &amp; Skills</span>
                </Link>
                <button className="quick-action-btn" onClick={scrollToChat}>
                  <span className="quick-action-icon">🤖</span>
                  <span>Consult AI Project Mentor</span>
                </button>
              </div>

              <div className="section-label">AI Mentor Chat</div>
              <div className="chat-panel animate-fade-up delay-3" id="chatPanel">
                <div className="chat-header">
                  <div className="chat-ai-avatar">🤖</div>
                  <div style={{ flex: 1 }}>
                    <div className="chat-ai-name">ProjectMentor AI</div>
                    <div className="chat-ai-sub">● Online · Conversational Guide</div>
                  </div>
                  <div className="chat-online"></div>
                </div>

                <div className="chat-messages">
                  {messages.map((m, i) => (
                    <div className={`chat-msg ${m.role}`} key={i}>
                      {m.text}
                      <div className="chat-msg-time">
                        {new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                  <div ref={chatMessagesEndRef} />
                </div>

                <form className="chat-input-row" onSubmit={sendChatMessage}>
                  <button 
                    type="button" 
                    className="btn btn-ghost" 
                    title="Real-time Voice Recording" 
                    onClick={startVoiceRecord}
                    style={{ 
                      padding: '0.45rem 0.6rem', 
                      fontSize: '1.1rem',
                      background: isListening ? 'var(--red-dim)' : 'transparent',
                      color: isListening ? 'var(--red)' : 'var(--text-muted)',
                      borderColor: isListening ? 'var(--red)' : 'var(--border)'
                    }}
                  >
                    🎤
                  </button>
                  <input 
                    className="chat-input" 
                    id="chatInput" 
                    type="text" 
                    placeholder={isListening ? '🎙️ Listening to your voice...' : 'Ask about feasibility, stack reasoning, scope...'} 
                    value={chatInput} 
                    onChange={e => setChatInput(e.target.value)} 
                  />
                  <button type="submit" className="btn btn-primary btn-sm">Send</button>
                </form>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Submit / Update Idea Modal */}
      <div 
        className={`modal-overlay ${isModalOpen ? 'open' : ''}`} 
        onClick={(e) => { if (e.target === e.currentTarget) closeIdeaModal(); }}
      >
        <div className="modal animate-fade-up submission-modal" style={{ maxWidth: '680px' }}>
          <button className="modal-close" onClick={closeIdeaModal}>×</button>
          <h2 className="modal-title">
            {editingIndex !== null ? '✏️ Update Project Idea' : '💡 Submit Your Project Idea'}
          </h2>
          <p className="modal-sub">
            Describe your idea in 2-3 lines. Upload supporting files, define key features, and set duration — our AI agents will build your full blueprint.
          </p>

          <form className="auth-form" onSubmit={submitIdea}>

            {/* ── Section 1: Basic Info ── */}
            <div className="submit-section-label">📋 Project Details</div>

            <div className="form-group">
              <label className="form-label">Project Title</label>
              <input 
                className="form-input" 
                type="text" 
                placeholder="e.g. Smart Attendance using Facial Recognition"
                value={ideaTitle} 
                onChange={e => setIdeaTitle(e.target.value)} 
              />
            </div>

            {/* Description with formatting toolbar */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Project Description <span style={{ color: 'var(--red)' }}>*</span></label>
                <div className="fmt-toolbar">
                  <button type="button" className="fmt-btn" title="Bold" onClick={() => applyFormat('bold')}><b>B</b></button>
                  <button type="button" className="fmt-btn" title="Bullet list" onClick={() => applyFormat('bullet')}>• List</button>
                  <button type="button" className="fmt-btn" title="Numbered list" onClick={() => applyFormat('numbered')}>1. Step</button>
                  <button type="button" className="fmt-btn" title="Inline code" onClick={() => applyFormat('code')}>&lt;/&gt;</button>
                </div>
              </div>
              <textarea 
                id="ideaDescTA"
                className="form-textarea" 
                rows="4" 
                maxLength="800"
                placeholder="Describe what you want to build, the core problem it addresses, and any initial thoughts on technologies..."
                value={ideaDesc} 
                onChange={e => setIdeaDesc(e.target.value)} 
                required 
              />
              <div className="char-counter">{ideaDesc.length}/800</div>
            </div>

            {/* Domain & Team */}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Project Domain / Track</label>
                <select 
                  className="form-select" 
                  value={ideaDomain} 
                  onChange={e => setIdeaDomain(e.target.value)}
                >
                  <option value="">Let AI decide from description</option>
                  <option value="aiml">🤖 AI / Machine Learning / Vision</option>
                  <option value="web">🌐 Full-Stack Web Development</option>
                  <option value="mobile">📱 Mobile App (Flutter / React Native)</option>
                  <option value="iot">🌱 IoT / Embedded Systems</option>
                  <option value="ds">📊 Data Science & Predictive Analytics</option>
                  <option value="cloud">☁️ Cloud Computing & DevOps</option>
                  <option value="cyber">🛡️ Cybersecurity & Network Defense</option>
                  <option value="blockchain">🔗 Blockchain & Decentralized Apps</option>
                  <option value="nlp">💬 NLP / LLMs / Conversational AI</option>
                  <option value="gamedev">🎮 Game Development</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Team Size</label>
                <select 
                  className="form-select" 
                  value={ideaTeamSize} 
                  onChange={e => setIdeaTeamSize(e.target.value)}
                >
                  <option value="1">👤 Solo (just me)</option>
                  <option value="2">👥 2 members</option>
                  <option value="3">👥 3 members</option>
                  <option value="4">👥 4 members</option>
                  <option value="5">👥 5 members</option>
                </select>
              </div>
            </div>

            {/* Duration with Weeks/Days Toggle Picker */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Project Duration <span style={{ color: 'var(--red)' }}>*</span></label>
                {/* Mode toggle pill */}
                <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: '20px', padding: '3px', border: '1px solid var(--border)', gap: '2px' }}>
                  {['weeks', 'days'].map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        // Convert value when switching modes
                        const cur = parseInt(ideaDuration) || 1;
                        if (mode === 'weeks' && durationMode === 'days') setIdeaDuration(Math.max(1, Math.round(cur / 7)).toString());
                        if (mode === 'days' && durationMode === 'weeks') setIdeaDuration((cur * 7).toString());
                        setDurationMode(mode);
                      }}
                      style={{
                        padding: '4px 14px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                        background: durationMode === mode ? 'var(--primary)' : 'transparent',
                        color: durationMode === mode ? '#fff' : 'var(--text-muted)',
                        transition: 'all 0.2s'
                      }}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider + number input row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="range"
                  min={durationMode === 'weeks' ? '1' : '1'}
                  max={durationMode === 'weeks' ? '52' : '365'}
                  value={ideaDuration}
                  onChange={e => setIdeaDuration(e.target.value)}
                  style={{ flex: 1, accentColor: 'var(--primary)', height: '6px', cursor: 'pointer' }}
                />
                <div style={{ position: 'relative', minWidth: '90px' }}>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    max={durationMode === 'weeks' ? '52' : '365'}
                    value={ideaDuration}
                    onChange={e => setIdeaDuration(e.target.value)}
                    required
                    style={{ textAlign: 'center', paddingRight: '2.8rem' }}
                  />
                  <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                    {durationMode === 'weeks' ? 'wk' : 'd'}
                  </span>
                </div>
              </div>

              {/* Quick preset chips */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.55rem' }}>
                {(durationMode === 'weeks'
                  ? [{ label: '2 wk', val: '2' }, { label: '4 wk', val: '4' }, { label: '6 wk', val: '6' }, { label: '8 wk', val: '8' }, { label: '12 wk', val: '12' }]
                  : [{ label: '7 d', val: '7' }, { label: '14 d', val: '14' }, { label: '30 d', val: '30' }, { label: '60 d', val: '60' }, { label: '90 d', val: '90' }]
                ).map(({ label, val }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setIdeaDuration(val)}
                    style={{
                      padding: '3px 10px', borderRadius: '12px', border: `1px solid ${ideaDuration === val ? 'var(--primary)' : 'var(--border)'}`,
                      background: ideaDuration === val ? 'var(--primary-dim, rgba(99,102,241,.15))' : 'transparent',
                      color: ideaDuration === val ? 'var(--primary)' : 'var(--text-muted)',
                      fontSize: '0.74rem', cursor: 'pointer', fontWeight: ideaDuration === val ? 700 : 400, transition: 'all 0.15s'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Live human-readable summary + AI milestone hint */}
              {(() => {
                const raw = parseInt(ideaDuration) || 0;
                if (raw <= 0) return null;
                const totalDays = durationMode === 'weeks' ? raw * 7 : raw;
                const weeks = Math.floor(totalDays / 7);
                const remDays = totalDays % 7;
                const readable = weeks > 0
                  ? `${weeks} week${weeks !== 1 ? 's' : ''}${remDays > 0 ? ` ${remDays} day${remDays !== 1 ? 's' : ''}` : ''}`
                  : `${totalDays} day${totalDays !== 1 ? 's' : ''}`;
                return (
                  <div className="duration-breakdown">
                    <span>🗓️ <strong>{readable}</strong> total · AI will generate <strong>{Math.max(1, weeks)}</strong> milestone phase{weeks !== 1 ? 's' : ''}</span>
                    {totalDays < 14 && <span className="dur-warn">⚠️ Very short — consider at least 2 weeks for a viable submission</span>}
                    {totalDays > 120 && <span className="dur-info">ℹ️ Long-form — AI will generate up to 10 milestone phases</span>}
                  </div>
                );
              })()}
            </div>

            {/* ── Section 2: Additional Info ── */}
            <div className="submit-section-label" style={{ marginTop: '0.5rem' }}>🔧 Technical Details (Optional)</div>

            <div className="form-group">
              <label className="form-label">Tech Ideas / Preferred Stack</label>
              <input 
                className="form-input" 
                type="text"
                placeholder="e.g. React, FastAPI, MongoDB, TensorFlow — your initial tech thoughts"
                value={ideaTechIdeas}
                onChange={e => setIdeaTechIdeas(e.target.value)}
              />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-faint)', marginTop: '0.3rem' }}>The AI will validate and recommend alternatives if needed.</div>
            </div>

            <div className="form-group">
              <label className="form-label">Reference / Inspiration Link</label>
              <input 
                className="form-input" 
                type="url"
                placeholder="https://github.com/... or https://arxiv.org/..."
                value={ideaRefLink}
                onChange={e => setIdeaRefLink(e.target.value)}
              />
            </div>

            {/* Key Features Tag Builder */}
            <div className="form-group">
              <label className="form-label">Key Features / User Stories</label>
              <div className="feature-tag-input-row">
                <input 
                  className="form-input"
                  type="text"
                  placeholder="Type a feature and press Enter or Add..."
                  value={featureInput}
                  onChange={e => setFeatureInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={addFeature} style={{ whiteSpace: 'nowrap' }}>
                  + Add
                </button>
              </div>
              {ideaFeatures.length > 0 && (
                <div className="feature-tags">
                  {ideaFeatures.map((f, i) => (
                    <span className="feature-tag" key={i}>
                      {f}
                      <button type="button" className="feature-tag-remove" onClick={() => removeFeature(f)}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section 3: File Upload ── */}
            <div className="submit-section-label" style={{ marginTop: '0.5rem' }}>📁 Supporting Documents</div>

            <div 
              className={`file-drop-zone ${isDragging ? 'dragging' : ''}`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="file-drop-icon">📂</div>
              <div className="file-drop-title">Drop files here or <span className="file-drop-link">browse</span></div>
              <div className="file-drop-sub">PDF · DOCX · PNG · JPG · ZIP · TXT — max {MAX_FILE_MB}MB each</div>
              <input 
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.zip,.txt"
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />
            </div>

            {uploadedFiles.length > 0 && (
              <div className="uploaded-files-list">
                {uploadedFiles.map((f, i) => (
                  <div className="uploaded-file-item" key={i}>
                    <span className="uf-icon">{getFileIcon(f)}</span>
                    <div className="uf-info">
                      <div className="uf-name">{f.name}</div>
                      <div className="uf-size">{fmtFileSize(f.size)}</div>
                    </div>
                    {f.dataUrl && (
                      <img src={f.dataUrl} alt={f.name} className="uf-preview" />
                    )}
                    <button type="button" className="uf-remove" onClick={() => removeFile(f.name)} title="Remove file">×</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={closeIdeaModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1.5 }} disabled={isSubmitting}>
                {isSubmitting ? '⏳ Submitting...' : '🚀 Submit Idea'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Real AI Feasibility Report Modal */}
      <FeasibilityReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        report={selectedReport}
        project={selectedProject}
      />

      {/* Real AI Scope Definition Report Modal */}
      <ScopeReportModal
        isOpen={isScopeModalOpen}
        onClose={() => setIsScopeModalOpen(false)}
        report={selectedScopeReport}
        project={selectedProject}
      />

      {/* AI Tech Stack Recommendation Modal (Agent 3 — chained) */}
      {isTechStackModalOpen && (
        <TechStackReportModal
          report={selectedTechStackReport}
          project={selectedProject}
          onClose={() => setIsTechStackModalOpen(false)}
        />
      )}

      {/* AI Risk Assessment Modal (Agent 4 — chained from Agents 1, 2, 3) */}
      {isRiskModalOpen && (
        <RiskReportModal
          report={selectedRiskReport}
          project={selectedProject}
          onClose={() => setIsRiskModalOpen(false)}
        />
      )}
    </>
  );
}
