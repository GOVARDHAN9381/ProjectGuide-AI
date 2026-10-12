import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Rocket, Bell, BarChart3, CheckCircle2, RefreshCw,
  FileSpreadsheet, Search, Filter, Megaphone, ChevronRight,
  Eye, Check, MessageSquare, Download, AlertCircle, Clock,
  Sparkles, Activity, TrendingUp, ShieldAlert,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import ChatbotPanel from '../components/ChatbotPanel';
import FeasibilityReportModal from '../components/FeasibilityReportModal';
import ScopeReportModal from '../components/ScopeReportModal';
import TechStackReportModal from '../components/TechStackReportModal';
import TrackingReportModal from '../components/TrackingReportModal';
import { Store, fmtRelative, fmtDate } from '../utils/store';
import { showToast } from '../utils/toast';
import { SKILLS, LEVEL_LABELS } from '../utils/constants';
import {
  fetchFacultyCohort, fetchFacultyActivity, fetchFacultyAnalytics,
  submitFacultyReview, submitMilestoneSignoff, broadcastAnnouncement,
  fetchFacultyAnnouncements, getFacultyExportUrl, fetchHealthMonitor,
} from '../utils/api';

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const AVATAR_COLORS = [
  '#3b82f6','#8b5cf6','#22c55e','#f59e0b','#ef4444',
  '#06b6d4','#ec4899','#f97316','#a855f7','#14b8a6',
];

const DOMAIN_META = {
  web:          { label: 'Web',           icon: '🌐', color: '#3b82f6' },
  aiml:         { label: 'AI/ML',         icon: '🤖', color: '#8b5cf6' },
  mobile:       { label: 'Mobile',        icon: '📱', color: '#22c55e' },
  iot:          { label: 'IoT',           icon: '🔌', color: '#f59e0b' },
  blockchain:   { label: 'Blockchain',    icon: '⛓️', color: '#06b6d4' },
  data:         { label: 'Data Science',  icon: '📊', color: '#ec4899' },
  ds:           { label: 'Data Science',  icon: '📊', color: '#ec4899' },
  cybersecurity:{ label: 'Cybersecurity', icon: '🛡️', color: '#ef4444' },
  cloud:        { label: 'Cloud',         icon: '☁️', color: '#0ea5e9' },
};

const STATUS_LABELS = {
  active:          'Active',
  review:          'Pending Review',
  pending_review:  'Pending Review',
  pending:         'Not Started',
  submitted:       'Submitted',
  approved:        'Approved',
  pending_revision:'Needs Revision',
};

const STATUS_COLORS = {
  active:          { bg: 'rgba(22,163,74,0.12)',  color: '#16a34a', border: 'rgba(22,163,74,0.3)' },
  review:          { bg: 'rgba(234,179,8,0.12)',   color: '#ca8a04', border: 'rgba(234,179,8,0.3)' },
  pending_review:  { bg: 'rgba(234,179,8,0.12)',   color: '#ca8a04', border: 'rgba(234,179,8,0.3)' },
  pending:         { bg: 'rgba(148,163,184,0.1)',  color: '#64748b', border: 'rgba(148,163,184,0.2)' },
  submitted:       { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
  approved:        { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  pending_revision:{ bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
};

const HEALTH_META = {
  at_risk:   { label: 'At Risk',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  icon: '🚨' },
  attention: { label: 'Needs Attn', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: '⚠️' },
  on_track:  { label: 'On Track',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', icon: '✅' },
  excellent: { label: 'Excellent',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  icon: '🏆' },
};

function computeHealthKey(score) {
  return score >= 80 ? 'excellent' : score >= 60 ? 'on_track' : score >= 35 ? 'attention' : 'at_risk';
}

function computeHealthScore(pct, feas, milestonesDone, totalMilestones) {
  const msRatio = totalMilestones > 0 ? (milestonesDone / totalMilestones) * 100 : 0;
  return Math.round(pct * 0.45 + feas * 0.25 + msRatio * 0.30);
}

/* ─── Small shared UI helpers ────────────────────────────────────────────────── */

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 99,
      fontSize: '0.7rem', fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function AvatarCircle({ name, idx, size = 40 }) {
  const color = AVATAR_COLORS[(idx || 0) % AVATAR_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 800, color: '#fff', flexShrink: 0,
    }}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

function MiniProgressBar({ pct, color = '#3b82f6' }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 6, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${Math.min(100, pct || 0)}%`, height: '100%', borderRadius: 99, background: color, transition: 'width 0.5s' }} />
    </div>
  );
}

/** SVG half-circle health gauge */
function HealthGauge({ score = 0, size = 90 }) {
  const key = computeHealthKey(score);
  const meta = HEALTH_META[key];
  const r = size / 2 - 8;
  const arc = Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size / 2 + 14, flexShrink: 0 }}>
      <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 4}`}>
        <path d={`M 8,${size/2} A ${r},${r} 0 0 1 ${size-8},${size/2}`}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={7} strokeLinecap="round" />
        <path d={`M 8,${size/2} A ${r},${r} 0 0 1 ${size-8},${size/2}`}
          fill="none" stroke={meta.color} strokeWidth={7} strokeLinecap="round"
          strokeDasharray={arc} strokeDashoffset={arc - (score / 100) * arc}
          style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 4px ${meta.color}80)` }} />
      </svg>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center',
        fontSize: '1rem', fontWeight: 900, color: meta.color, lineHeight: 1 }}>
        {score}
        <div style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>/ 100</div>
      </div>
    </div>
  );
}

/** Compact color-coded health pill for table */
function HealthPill({ score }) {
  const meta = HEALTH_META[computeHealthKey(score)];
  return (
    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: meta.color,
      background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 6, padding: '2px 7px' }}>
      {meta.icon} {score}
    </span>
  );
}

function TabBtn({ id, label, icon, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
        background: active ? 'rgba(59,130,246,0.18)' : 'transparent',
        color: active ? '#60a5fa' : 'rgba(255,255,255,0.5)',
        fontSize: '0.82rem', fontWeight: active ? 700 : 500,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
        transition: 'all 0.15s',
        borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
      }}
    >
      {icon} {label}
    </button>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [activity, setActivity] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(false);

  // Filters & Search
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDomain, setFilterDomain] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('students');

  // Drawer / Modals
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [drawerTab, setDrawerTab] = useState('overview');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [reviewStatus, setReviewStatus] = useState('active');
  const [savingReview, setSavingReview] = useState(false);
  const [signingOff, setSigningOff] = useState(null);
  const [mentorSummary, setMentorSummary] = useState(null);
  const [mentorMeta, setMentorMeta] = useState(null); // { healthScore, riskLevel, blockers, pendingMilestones }
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Report modals
  const [feasModal, setFeasModal] = useState({ open: false, report: null, project: null });
  const [scopeModal, setScopeModal] = useState({ open: false, report: null });
  const [techModal, setTechModal] = useState({ open: false, report: null });
  const [trackingModal, setTrackingModal] = useState({ open: false, report: null, idea: null });

  // Broadcast
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cohort, ana] = await Promise.all([
        fetchFacultyCohort().catch(() => []),
        fetchFacultyAnalytics().catch(() => ({})),
      ]);
      setStudents(Array.isArray(cohort) ? cohort : []);
      setAnalytics(ana);
    } catch (e) {
      console.error('[FacultyDashboard] cohort load error:', e);
      showToast('Could not load student data from backend.', '⚠️');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const [act, ann] = await Promise.all([
        fetchFacultyActivity(20).catch(() => ({ events: [] })),
        fetchFacultyAnnouncements(5).catch(() => ({ announcements: [] })),
      ]);
      setActivity(act.events || []);
      setAnnouncements(ann.announcements || []);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const loadHealthData = useCallback(async () => {
    setHealthLoading(true);
    try {
      const data = await fetchHealthMonitor().catch(() => null);
      setHealthData(data);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentUser = Store.get('currentUser');
    if (!currentUser || currentUser.role !== 'faculty') {
      navigate('/login');
      return;
    }
    setUser(currentUser);
    loadData();
    loadActivity();
  }, [navigate, loadData, loadActivity]);

  // Lazy-load health monitor data on first tab switch
  useEffect(() => {
    if (activeTab === 'health' && !healthData && !healthLoading) loadHealthData();
  }, [activeTab, healthData, healthLoading, loadHealthData]);

  /* ── Derived stats ── */
  const totalCount    = students.length;
  const activeCount   = students.filter(s => s.status === 'active').length;
  const reviewCount   = students.filter(s => s.status === 'review' || s.status === 'pending_review').length;
  const submittedCount = students.filter(s => s.status === 'submitted' || s.status === 'approved').length;
  const pendingCount  = students.filter(s => s.status === 'pending' || !s.project).length;

  const allProjects = students.flatMap(s => s.projects || (s.project ? [s.project] : []));
  const avgFeas = allProjects.length
    ? Math.round(allProjects.reduce((a, p) => a + (p.feasibility || 0), 0) / allProjects.length)
    : (analytics.avgFeasibility || 0);

  /* ── Filtered students ── */
  const filtered = students.filter(s => {
    const projs = s.projects || (s.project ? [s.project] : []);
    const st = s.status === 'pending_review' ? 'review' : s.status;
    if (filterStatus !== 'all' && st !== filterStatus) return false;
    if (filterDomain !== 'all' && !projs.some(p => p.domain === filterDomain)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (s.name || '').toLowerCase().includes(q);
      const rollMatch = (s.roll || '').toLowerCase().includes(q);
      const projMatch = projs.some(p => (p.title || '').toLowerCase().includes(q));
      if (!nameMatch && !rollMatch && !projMatch) return false;
    }
    return true;
  });

  /* ── Drawer actions ── */
  const openDrawer = async (student) => {
    setSelectedStudent(student);
    setFeedback(student.project?.facultyFeedback || '');
    setReviewStatus(student.project?.facultyStatus || student.status || 'active');
    setDrawerTab('overview');
    setIsDrawerOpen(true);
    setMentorSummary(null);
    setMentorMeta(null);
    if (student.project?.id) {
      setLoadingSummary(true);
      try {
        const { fetchMentorSummary } = await import('../utils/api');
        const sum = await fetchMentorSummary(student.project.id);
        setMentorSummary(sum.summary);
        setMentorMeta({
          healthScore:       sum.healthScore,
          healthLabel:       sum.healthLabel,
          riskLevel:         sum.riskLevel,
          blockers:          sum.blockers || [],
          pendingMilestones: sum.pendingMilestones || [],
          aiGenerated:       sum.aiGenerated,
        });
      } catch(e) {
        setMentorSummary("Failed to load mentor summary.");
      } finally {
        setLoadingSummary(false);
      }
    }
  };


  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedStudent(null), 300);
  };

  const handleSaveReview = async () => {
    if (!selectedStudent?.project) return;
    setSavingReview(true);
    try {
      await submitFacultyReview({
        project_id: selectedStudent.project.id,
        faculty_name: user?.name || 'Prof. Verma',
        faculty_email: user?.email || '',
        feedback,
        status: reviewStatus,
      });
      // Update local state
      setStudents(prev => prev.map(s =>
        s.id === selectedStudent.id
          ? {
              ...s,
              status: reviewStatus,
              project: { ...(s.project || {}), facultyFeedback: feedback, facultyStatus: reviewStatus, status: reviewStatus },
              projects: (s.projects || []).map((p, i) => i === 0 ? { ...p, facultyFeedback: feedback, facultyStatus: reviewStatus, status: reviewStatus } : p),
            }
          : s
      ));
      setSelectedStudent(prev => ({
        ...prev,
        status: reviewStatus,
        project: { ...(prev.project || {}), facultyFeedback: feedback, facultyStatus: reviewStatus, status: reviewStatus },
      }));
      showToast('Review saved successfully!', '💾');
    } catch (e) {
      console.error(e);
      showToast('Failed to save review.', '❌');
    } finally {
      setSavingReview(false);
    }
  };

  const handleMilestoneSignoff = async (milestone, ideaId) => {
    setSigningOff(milestone.id);
    try {
      await submitMilestoneSignoff({
        idea_id: ideaId,
        milestone_id: milestone.id,
        faculty_name: user?.name || 'Prof. Verma',
        notes: '',
      });
      showToast(`Milestone "${milestone.title}" signed off! ✅`, '🏁');
      // Optimistically update local
      setSelectedStudent(prev => {
        if (!prev) return prev;
        const updateMs = (ms) => ms.map(m => m.id === milestone.id ? { ...m, facultySignoff: true } : m);
        return {
          ...prev,
          project: prev.project ? { ...prev.project, milestones: updateMs(prev.project.milestones || []) } : prev.project,
          projects: (prev.projects || []).map(p => ({ ...p, milestones: updateMs(p.milestones || []) })),
        };
      });
    } catch (e) {
      showToast('Sign-off failed.', '❌');
    } finally {
      setSigningOff(null);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) { showToast('Please enter a message.', '⚠️'); return; }
    setBroadcasting(true);
    try {
      await broadcastAnnouncement({
        author_name: user?.name || 'Prof. Verma',
        author_email: user?.email || '',
        title: broadcastTitle || 'Academic Project Update',
        message: broadcastMsg,
      });
      setAnnouncements(prev => [{
        author_name: user?.name || 'Prof. Verma',
        title: broadcastTitle || 'Academic Project Update',
        message: broadcastMsg,
        created_at: new Date().toISOString(),
      }, ...prev]);
      setBroadcastTitle('');
      setBroadcastMsg('');
      showToast('Announcement broadcasted to all students! 📢', '✅');
    } catch (e) {
      showToast('Broadcast failed. Saved locally.', '⚠️');
    } finally {
      setBroadcasting(false);
    }
  };

  const handleExport = () => {
    window.open(getFacultyExportUrl(), '_blank');
    showToast('Cohort report downloaded!', '📊');
  };

  /* ── Styles ── */
  const S = {
    page: { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "var(--font)" },
    container: { maxWidth: 1400, margin: '0 auto', padding: '1.5rem 2rem' },
    header: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem',
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
    facultyAvatar: {
      width: 52, height: 52, borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--blue), var(--purple))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.4rem', fontWeight: 900, color: '#fff', flexShrink: 0,
    },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '1.75rem' },
    statCard: {
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '1rem 1.25rem', cursor: 'pointer', transition: 'all 0.2s',
    },
    layout: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' },
    mainPanel: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' },
    sidePanel: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    sideCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem' },
    tabBar: { display: 'flex', padding: '0 1rem', borderBottom: '1px solid var(--border)', gap: 4 },
    tableHeader: {
      display: 'grid', gridTemplateColumns: '2fr 2fr 1.2fr 0.8fr 0.8fr 1fr',
      padding: '0.65rem 1.25rem', fontSize: '0.68rem', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)',
      borderBottom: '1px solid var(--border)',
    },
    row: {
      display: 'grid', gridTemplateColumns: '2fr 2fr 1.2fr 0.8fr 0.8fr 1fr',
      padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)',
      alignItems: 'center', transition: 'background 0.15s', cursor: 'pointer',
    },
    toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', flexWrap: 'wrap', gap: '0.75rem' },
    searchInput: {
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '0.5rem 0.85rem', color: 'var(--text)', fontSize: '0.82rem',
      outline: 'none', width: 200,
    },
    filterSelect: {
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '0.5rem 0.7rem', color: 'var(--text)', fontSize: '0.8rem',
      outline: 'none', cursor: 'pointer',
    },
    btn: {
      padding: '0.5rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer',
      fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.15s',
    },
    btnPrimary: { background: 'linear-gradient(135deg, var(--blue), var(--blue-dark))', color: '#fff' },
    btnSecondary: { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' },
    btnSuccess: { background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid var(--green)' },
    drawer: {
      position: 'fixed', top: 0, right: isDrawerOpen ? 0 : '-520px',
      width: 500, height: '100vh', background: 'var(--surface)',
      borderLeft: '1px solid var(--border)',
      boxShadow: '-24px 0 64px rgba(0,0,0,0.6)',
      transition: 'right 0.3s cubic-bezier(0.4,0,0.2,1)',
      zIndex: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column',
    },
    overlay: {
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      zIndex: 299, opacity: isDrawerOpen ? 1 : 0, pointerEvents: isDrawerOpen ? 'all' : 'none',
      transition: 'opacity 0.3s',
    },
    divider: { height: 1, background: 'var(--border)', margin: '1rem 0' },
    sectionLabel: { fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.65rem' },
  };

  if (!user) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { background: #060c1a; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .fac-row:hover { background: rgba(255,255,255,0.03) !important; }
        .health-row:hover { background: rgba(255,255,255,0.04) !important; }
        .stat-card-fac:hover { border-color: rgba(59,130,246,0.3) !important; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
        .fac-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        input::placeholder { color: rgba(255,255,255,0.3); }
        select option { background: #0d1628; }
      `}</style>

      <Navbar />
      <ChatbotPanel />

      <div style={S.page}>
        <div style={S.container}>

          {/* ── Header ── */}
          <div style={{ ...S.header, animation: 'fadeUp 0.4s ease' }}>
            <div style={S.headerLeft}>
              <div style={S.facultyAvatar}>{(user.name || 'F').charAt(0)}</div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f1f5f9' }}>
                  Welcome, {user.name} 👨‍🏫
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                  Project Guide & Faculty Reviewer · Department of CSE
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="fac-btn" onClick={loadData} style={{
                ...S.btn, ...S.btnSecondary, display: 'inline-flex', alignItems: 'center', gap: 6
              }}>
                <RefreshCw size={14} />
                <span>Refresh</span>
              </button>
              <button className="fac-btn" onClick={handleExport} style={{
                ...S.btn, ...S.btnSecondary, display: 'inline-flex', alignItems: 'center', gap: 6
              }}>
                <Download size={14} />
                <span>Export CSV</span>
              </button>
              <button className="fac-btn" onClick={() => { setFilterStatus('review'); setActiveTab('students'); }}
                style={{
                  ...S.btn, ...S.btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)'
                }}>
                <Bell size={14} />
                <span>Pending Reviews ({reviewCount})</span>
              </button>
              <button className="fac-btn" onClick={() => setActiveTab('health')}
                style={{ ...S.btn, background: 'linear-gradient(135deg,#ef4444,#b91c1c)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 16px rgba(239,68,68,0.3)' }}>
                <Activity size={14} /><span>Health Monitor</span>
              </button>
            </div>
          </div>

          {/* ── Stats Grid ── */}
          <div style={{ ...S.statsGrid, animation: 'fadeUp 0.45s ease' }}>
            {[
              { label: 'Total Students', value: totalCount, sub: 'enrolled this semester', color: '#f8fafc', icon: <Users size={18} />, filter: 'all' },
              { label: 'Active Projects', value: activeCount, sub: 'in progress', color: '#34d399', icon: <Rocket size={18} />, filter: 'active' },
              { label: 'Pending Review', value: reviewCount, sub: 'need your attention', color: '#fbbf24', icon: <Bell size={18} />, filter: 'review' },
              { label: 'Avg Feasibility', value: `${avgFeas}%`, sub: 'across all projects', color: '#38bdf8', icon: <BarChart3 size={18} />, pct: avgFeas, filter: null },
              { label: 'Submitted / Done', value: submittedCount, sub: 'project(s)', color: '#c084fc', icon: <CheckCircle2 size={18} />, filter: 'submitted' },
            ].map((sc, i) => (
              <div key={i} className="stat-card-fac" onClick={() => sc.filter && setFilterStatus(sc.filter)}
                style={{
                  ...S.statCard, animation: `fadeUp ${0.45 + i * 0.05}s ease`,
                  background: 'rgba(17, 24, 40, 0.75)',
                  backdropFilter: 'blur(16px)',
                  borderColor: (filterStatus === sc.filter) ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)',
                  boxShadow: '0 8px 24px -4px rgba(0,0,0,0.45)',
                  borderRadius: 16,
                  padding: '1.2rem',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{sc.label}</span>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: `${sc.color === '#f8fafc' ? '#6366f1' : sc.color}18`,
                    border: `1px solid ${sc.color === '#f8fafc' ? '#6366f1' : sc.color}35`,
                    color: sc.color === '#f8fafc' ? '#818cf8' : sc.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {sc.icon}
                  </div>
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: sc.color, lineHeight: 1, letterSpacing: '-0.02em' }}>{sc.value}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 6 }}>{sc.sub}</div>
                {sc.pct !== undefined && (
                  <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${sc.pct}%`, height: '100%', background: sc.color, borderRadius: 99, transition: 'width 0.6s' }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Main Layout ── */}
          <div style={{ ...S.layout, animation: 'fadeUp 0.5s ease' }}>

            {/* ── Left: Main Panel ── */}
            <div style={{ ...S.mainPanel, background: 'rgba(17, 24, 40, 0.75)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 18 }}>
              {/* Tab bar */}
              <div style={S.tabBar}>
                {[
                  { id: 'students', label: 'Students',       icon: <Users size={15} /> },
                  { id: 'health',   label: 'Health Monitor', icon: <Activity size={15} /> },
                  { id: 'analytics', label: 'Analytics',     icon: <BarChart3 size={15} /> },
                  { id: 'broadcast', label: 'Broadcast',     icon: <Megaphone size={15} /> },
                ].map(t => <TabBtn key={t.id} {...t} active={activeTab === t.id} onClick={setActiveTab} />)}
              </div>

              {/* ── TAB: Students ── */}
              {activeTab === 'students' && (
                <>
                  {/* Toolbar */}
                  <div style={S.toolbar}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>
                      {filterStatus === 'all' ? 'All Students' : STATUS_LABELS[filterStatus] || filterStatus} ({filtered.length})
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input
                        style={S.searchInput} placeholder="🔍 Search students or projects..."
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      />
                      <select style={S.filterSelect} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="review">Pending Review</option>
                        <option value="submitted">Submitted</option>
                        <option value="pending">Not Started</option>
                      </select>
                      <select style={S.filterSelect} value={filterDomain} onChange={e => setFilterDomain(e.target.value)}>
                        <option value="all">All Domains</option>
                        {Object.entries(DOMAIN_META).map(([k, v]) => (
                          <option key={k} value={k}>{v.icon} {v.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Table header */}
                  <div style={S.tableHeader}>
                    <div>Student</div>
                    <div>Project</div>
                    <div>Progress</div>
                    <div>Health</div>
                    <div>Status</div>
                    <div style={{ textAlign: 'right' }}>Actions</div>
                  </div>

                  {/* Loading */}
                  {loading && (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
                      <div style={{ fontSize: '0.85rem' }}>Loading student data from MongoDB…</div>
                    </div>
                  )}

                  {/* Empty */}
                  {!loading && filtered.length === 0 && (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔍</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>No students match your filters</div>
                      <div style={{ fontSize: '0.78rem', marginTop: 6 }}>Try adjusting the search or filter options</div>
                    </div>
                  )}

                  {/* Rows */}
                  {!loading && filtered.map((s, i) => {
                    const projs = s.projects || (s.project ? [s.project] : []);
                    const mainP = projs[0];
                    const done = mainP?.milestonesDone || 0;
                    const total = mainP?.totalMilestones || (mainP?.milestones?.length) || 4;
                    const pct = mainP?.overallProgress || (total > 0 ? Math.round((done / total) * 100) : 0);
                    const dm = DOMAIN_META[mainP?.domain] || DOMAIN_META.web;
                    const barColor = pct >= 70 ? '#22c55e' : pct >= 40 ? '#3b82f6' : '#f59e0b';
                    const feas = mainP?.feasibility || 0;
                    const healthScore = computeHealthScore(pct, feas, done, total);

                    return (
                      <div key={s.id || s.email}
                        className="fac-row"
                        onClick={() => openDrawer(s)}
                        style={S.row}
                      >
                        {/* Student */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <AvatarCircle name={s.name} idx={i} size={36} />
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>{s.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>
                              {s.roll || '—'} · {s.branch || 'CSE'}
                            </div>
                          </div>
                        </div>

                        {/* Project */}
                        <div>
                          {mainP ? (
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{mainP.title}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ fontSize: '0.7rem', color: dm.color, background: dm.color + '15', border: `1px solid ${dm.color}30`, padding: '1px 7px', borderRadius: 99 }}>
                                  {dm.icon} {dm.label}
                                </span>
                                {projs.length > 1 && (
                                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>+{projs.length - 1} more</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>No project submitted</span>
                          )}
                        </div>

                        {/* Progress */}
                        <div>
                          {mainP ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
                                <MiniProgressBar pct={pct} color={barColor} />
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: barColor, width: 34, flexShrink: 0 }}>{pct}%</span>
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>
                                {done}/{total} milestones · Feas: {mainP.feasibility || 0}%
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>—</span>
                          )}
                        </div>

                        {/* Health */}
                        <div>
                          {mainP
                            ? <HealthPill score={healthScore} />
                            : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>—</span>}
                        </div>

                        {/* Status */}
                        <div>
                          <StatusBadge status={s.status} />
                          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                            {fmtRelative(s.lastActive)}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }} onClick={e => e.stopPropagation()}>
                          <button className="fac-btn" onClick={() => openDrawer(s)}
                            style={{ ...S.btn, ...S.btnSecondary, padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}>
                            View
                          </button>
                          {(s.status === 'review' || s.status === 'pending_review') && (
                            <button className="fac-btn"
                              onClick={async () => {
                                if (!s.project?.id) { showToast('No project to approve.', '⚠️'); return; }
                                try {
                                  await submitFacultyReview({ project_id: s.project.id, faculty_name: user?.name || 'Faculty', feedback: 'Approved by faculty.', status: 'approved' });
                                  setStudents(prev => prev.map(x => x.id === s.id ? { ...x, status: 'approved' } : x));
                                  showToast('Project approved! ✅', '🎉');
                                } catch { showToast('Approval failed.', '❌'); }
                              }}
                              style={{ ...S.btn, ...S.btnSuccess, padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}>
                              ✓
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* ── TAB: Health Monitor ── */}
              {activeTab === 'health' && (() => {
                const hs = healthData;
                const cs = hs?.cohortSummary || {};
                const grouped = hs?.grouped || {};
                return (
                  <div style={{ padding: '1.5rem' }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f1f5f9', marginBottom: 3 }}>🏥 Cohort Health Monitor</div>
                        <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.4)' }}>AI-computed scores: progress · feasibility · milestones · risk signals</div>
                      </div>
                      <button className="fac-btn" onClick={loadHealthData}
                        style={{ ...S.btn, ...S.btnSecondary, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.76rem' }}>
                        <RefreshCw size={13} /> Refresh
                      </button>
                    </div>

                    {healthLoading && (
                      <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.3)' }}>
                        <div style={{ fontSize: '1.5rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}>Computing health scores…</div>
                      </div>
                    )}

                    {!healthLoading && !hs && (
                      <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.3)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📡</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>No health data available</div>
                        <div style={{ fontSize: '0.75rem', marginTop: 6 }}>MongoDB connection required for live scores</div>
                      </div>
                    )}

                    {!healthLoading && hs && (<>
                      {/* Cohort summary cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        {[
                          { label: 'Avg Health', value: cs.avgHealth || 0, suffix: '/100', color: cs.avgHealth >= 60 ? '#22c55e' : cs.avgHealth >= 35 ? '#f59e0b' : '#ef4444', icon: '🏥' },
                          { label: 'At Risk',     value: cs.atRiskCount || 0,    suffix: '', color: '#ef4444', icon: '🚨' },
                          { label: 'Needs Attn', value: cs.attentionCount || 0, suffix: '', color: '#f59e0b', icon: '⚠️' },
                          { label: 'Avg Progress', value: cs.avgProgress || 0, suffix: '%', color: '#3b82f6', icon: '📈' },
                        ].map((c, i) => (
                          <div key={i} style={{ background: `${c.color}08`, border: `1px solid ${c.color}22`, borderRadius: 12, padding: '0.85rem 1rem' }}>
                            <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{c.icon} {c.label}</div>
                            <div style={{ fontSize: '1.55rem', fontWeight: 900, color: c.color }}>{c.value}<span style={{ fontSize: '0.8rem', fontWeight: 600, color: `${c.color}80` }}>{c.suffix}</span></div>
                          </div>
                        ))}
                      </div>

                      {/* Priority groups */}
                      {[
                        { key: 'at_risk',   label: 'At Risk',         color: '#ef4444', icon: '🚨' },
                        { key: 'attention', label: 'Needs Attention', color: '#f59e0b', icon: '⚠️' },
                        { key: 'on_track',  label: 'On Track',        color: '#3b82f6', icon: '✅' },
                        { key: 'excellent', label: 'Excellent',       color: '#22c55e', icon: '🏆' },
                      ].map(({ key, label, color, icon }) => {
                        const group = grouped[key] || [];
                        if (!group.length) return null;
                        return (
                          <div key={key} style={{ marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                              <span>{icon}</span>
                              <span style={{ fontSize: '0.76rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label} ({group.length})</span>
                              <div style={{ flex: 1, height: 1, background: `${color}22` }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                              {group.map((p, i) => {
                                const dm = DOMAIN_META[p.domain] || { label: p.domain, icon: '📁', color: '#64748b' };
                                return (
                                  <div key={i} className="health-row" style={{
                                    background: `${color}05`, border: `1px solid ${color}1a`,
                                    borderRadius: 10, padding: '0.75rem 0.9rem',
                                    display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0.75rem', alignItems: 'center',
                                    transition: 'background 0.15s',
                                  }}>
                                    {/* Circular gauge */}
                                    <div style={{
                                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                                      background: `conic-gradient(${color} ${(p.healthScore || 0) * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      boxShadow: `0 0 10px ${color}30`,
                                    }}>
                                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0a1120',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.65rem', fontWeight: 900, color }}>
                                        {p.healthScore || 0}
                                      </div>
                                    </div>
                                    {/* Info */}
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                                        <span style={{ fontSize: '0.65rem', color: dm.color, background: dm.color+'15', border: `1px solid ${dm.color}30`, padding: '1px 5px', borderRadius: 99, flexShrink: 0 }}>{dm.icon}</span>
                                      </div>
                                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>👤 {p.studentName} · {p.progress}% progress · Feas: {p.feasibility}%</div>
                                      {/* Progress bar */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 4, overflow: 'hidden' }}>
                                          <div style={{ width: `${p.progress}%`, height: '100%', background: color, borderRadius: 99, boxShadow: `0 0 6px ${color}60` }} />
                                        </div>
                                        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{p.milestonesDone}/{p.totalMilestones} ms</span>
                                      </div>
                                      {p.blockers?.length > 0 && (
                                        <div style={{ marginTop: 4, fontSize: '0.67rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 4 }}>
                                          <AlertCircle size={10} color="#ef4444" /> {p.blockers[0]}
                                        </div>
                                      )}
                                    </div>
                                    {/* Risk badge */}
                                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                      {p.riskLevel && (
                                        <span style={{
                                          fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase', borderRadius: 5, padding: '2px 6px',
                                          color: p.riskLevel === 'high' || p.riskLevel === 'critical' ? '#ef4444' : p.riskLevel === 'medium' ? '#f59e0b' : '#22c55e',
                                          background: p.riskLevel === 'high' || p.riskLevel === 'critical' ? 'rgba(239,68,68,0.1)' : p.riskLevel === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                                          border: `1px solid ${p.riskLevel === 'high' || p.riskLevel === 'critical' ? 'rgba(239,68,68,0.3)' : p.riskLevel === 'medium' ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`,
                                        }}>{p.riskLevel} risk</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {hs.projects?.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)' }}>
                          No project data found. Students must submit their ideas and run AI agents first.
                        </div>
                      )}
                    </>)}
                  </div>
                );
              })()}

              {/* ── TAB: Analytics ── */}
              {activeTab === 'analytics' && (

                <div style={{ padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '1.25rem' }}>
                    📈 Cohort Analytics
                  </div>

                  {/* Domain distribution */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={S.sectionLabel}>Domain Distribution</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(
                        students.flatMap(s => s.projects || (s.project ? [s.project] : []))
                          .reduce((acc, p) => { const d = p.domain || 'web'; acc[d] = (acc[d] || 0) + 1; return acc; }, {})
                      ).sort(([, a], [, b]) => b - a).map(([domain, count]) => {
                        const dm = DOMAIN_META[domain] || { label: domain, icon: '📁', color: '#64748b' };
                        const pct = allProjects.length ? Math.round((count / allProjects.length) * 100) : 0;
                        return (
                          <div key={domain} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', width: 110, flexShrink: 0 }}>
                              {dm.icon} {dm.label}
                            </span>
                            <MiniProgressBar pct={pct} color={dm.color} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: dm.color, width: 36 }}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Feasibility distribution */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={S.sectionLabel}>Feasibility Score Breakdown</div>
                    {(() => {
                      const buckets = [
                        { label: 'High (80–100%)', min: 80, color: '#22c55e' },
                        { label: 'Medium (60–79%)', min: 60, color: '#3b82f6' },
                        { label: 'Low (0–59%)', min: 0, color: '#f59e0b' },
                      ];
                      return buckets.map(b => {
                        const count = allProjects.filter(p => {
                          const s = p.feasibility || 0;
                          return s >= b.min && (b.min === 80 ? true : s < (b.min === 60 ? 80 : 60));
                        }).length;
                        const pct = allProjects.length ? Math.round((count / allProjects.length) * 100) : 0;
                        return (
                          <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', width: 140, flexShrink: 0 }}>{b.label}</span>
                            <MiniProgressBar pct={pct} color={b.color} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: b.color, width: 36 }}>{count}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Summary numbers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { label: 'Total Projects', value: allProjects.length, color: '#f1f5f9' },
                      { label: 'Avg Feasibility', value: `${avgFeas}%`, color: '#3b82f6' },
                      { label: 'With AI Reports', value: allProjects.filter(p => p.analysis?.feasibility?.overallScore).length, color: '#8b5cf6' },
                    ].map((c, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '0.85rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: c.color }}>{c.value}</div>
                        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{c.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TAB: Broadcast ── */}
              {activeTab === 'broadcast' && (
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '1.25rem' }}>
                    📢 Broadcast Announcement to All Students
                  </div>
                  <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                    <div>
                      <div style={S.sectionLabel}>Announcement Title</div>
                      <input
                        style={{ ...S.searchInput, width: '100%', padding: '0.65rem 0.9rem' }}
                        placeholder="e.g. Mid-Semester Checkpoint Reminder"
                        value={broadcastTitle}
                        onChange={e => setBroadcastTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <div style={S.sectionLabel}>Message *</div>
                      <textarea
                        style={{ ...S.searchInput, width: '100%', minHeight: 120, resize: 'vertical', padding: '0.65rem 0.9rem', lineHeight: 1.6 }}
                        placeholder="Write your message to all students here..."
                        value={broadcastMsg}
                        onChange={e => setBroadcastMsg(e.target.value)}
                        required
                      />
                    </div>
                    <button className="fac-btn" type="submit" disabled={broadcasting}
                      style={{ ...S.btn, ...S.btnPrimary, opacity: broadcasting ? 0.6 : 1 }}>
                      {broadcasting ? '⟳ Sending...' : '📢 Send Announcement'}
                    </button>
                  </form>

                  {announcements.length > 0 && (
                    <>
                      <div style={S.sectionLabel}>Recent Announcements</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {announcements.map((a, i) => (
                          <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '0.85rem 1rem' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{a.title}</div>
                            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{a.message}</div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                              {a.author_name} · {fmtRelative(a.created_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Right: Side Panel ── */}
            <div style={S.sidePanel}>

              {/* Activity Feed */}
              <div style={S.sideCard}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.85rem' }}>🔔 Recent Activity</div>
                {activityLoading ? (
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '1rem' }}>Loading…</div>
                ) : activity.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '1rem' }}>No recent activity yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: 260, overflowY: 'auto' }}>
                    {activity.slice(0, 10).map((ev, i) => {
                      const colorMap = { blue: '#3b82f6', green: '#22c55e', purple: '#8b5cf6' };
                      const c = colorMap[ev.color] || '#64748b';
                      return (
                        <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, marginTop: 5, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                              <strong style={{ color: '#f1f5f9' }}>{ev.email?.split('@')[0]}</strong>{' '}
                              <span style={{ color: 'rgba(255,255,255,0.55)' }}>{ev.message}</span>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{fmtRelative(ev.timestamp)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status Overview */}
              <div style={S.sideCard}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.85rem' }}>📌 Status Overview</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {[
                    { label: 'Active In-Progress', count: activeCount, color: '#22c55e' },
                    { label: 'Pending Review', count: reviewCount, color: '#f59e0b' },
                    { label: 'Submitted/Approved', count: submittedCount, color: '#3b82f6' },
                    { label: 'Not Started', count: pendingCount, color: '#64748b' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                        {item.label}
                      </span>
                      <strong style={{ fontSize: '0.82rem', color: item.color }}>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Filters */}
              <div style={S.sideCard}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.85rem' }}>⚡ Quick Filters</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { label: '🏥 Health Monitor',    action: () => { setActiveTab('health'); loadHealthData(); } },
                    { label: '🔔 Pending Reviews',   action: () => { setFilterStatus('review'); setActiveTab('students'); } },
                    { label: '📊 Analytics View',    action: () => setActiveTab('analytics') },
                    { label: '📢 Broadcast Message', action: () => setActiveTab('broadcast') },
                    { label: '🔄 Refresh Data',      action: loadData },
                  ].map((qf, i) => (
                    <button key={i} className="fac-btn" onClick={qf.action}
                      style={{ ...S.btn, ...S.btnSecondary, textAlign: 'left', width: '100%', padding: '0.55rem 0.9rem', fontSize: '0.78rem' }}>
                      {qf.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── Drawer Overlay ── */}
      <div style={S.overlay} onClick={closeDrawer} />

      {/* ── Student Detail Drawer ── */}
      <div style={S.drawer}>
        {selectedStudent && (() => {
          const s = selectedStudent;
          const projs = s.projects || (s.project ? [s.project] : []);
          const mainP = projs[0];

          return (
            <div style={{ flex: 1 }}>
              {/* Drawer Header */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#0d1628', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <AvatarCircle name={s.name} idx={students.indexOf(s)} size={44} />
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9' }}>{s.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                      {s.roll || '—'} · {s.branch || 'CSE'} · {s.year || ''}
                    </div>
                  </div>
                </div>
                <button onClick={closeDrawer} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', color: '#94a3b8', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>

              {/* Drawer Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 0.75rem', gap: 2 }}>
                {[
                  { id: 'overview', label: 'Overview', icon: '📋' },
                  { id: 'milestones', label: 'Milestones', icon: '🏁' },
                  { id: 'reports', label: 'AI Reports', icon: '🤖' },
                  { id: 'feedback', label: 'Feedback', icon: '💬' },
                ].map(t => <TabBtn key={t.id} {...t} active={drawerTab === t.id} onClick={setDrawerTab} />)}
              </div>

              <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto' }}>

                {/* ── OVERVIEW ── */}
                {drawerTab === 'overview' && (
                  <div>
                    {/* Status + quick actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      <StatusBadge status={s.status} />
                      <button className="fac-btn" onClick={() => showToast(`Schedule invite sent to ${s.name}`, '📅')}
                        style={{ ...S.btn, ...S.btnSecondary, padding: '3px 10px', fontSize: '0.72rem' }}>📅 Schedule</button>
                      <button className="fac-btn" onClick={() => showToast(`Message opened for ${s.name}`, '✉️')}
                        style={{ ...S.btn, ...S.btnSecondary, padding: '3px 10px', fontSize: '0.72rem' }}>✉️ Message</button>
                    </div>

                    <div style={S.divider} />

                    {/* Enhanced Mentor Summary */}
                    {mainP && (
                      <div style={{ marginBottom: '1.25rem' }}>
                        {/* Summary card */}
                        <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.08))', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 13, padding: '1rem', marginBottom: (mentorMeta && !loadingSummary) ? '0.65rem' : 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <span style={{ fontSize: '1.05rem' }}>🤖</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#60a5fa' }}>AI Mentor Summary</span>
                            {mentorMeta?.aiGenerated && (
                              <span style={{ fontSize: '0.6rem', color: '#a78bfa', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 99, padding: '1px 7px', fontWeight: 700 }}>✨ AI</span>
                            )}
                          </div>
                          {loadingSummary ? (
                            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Analyzing project with AI…
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.8rem', color: '#e2e8f0', lineHeight: 1.65 }}>
                              {mentorSummary || 'No summary available.'}
                            </div>
                          )}
                        </div>

                        {/* Health gauge + metadata row */}
                        {!loadingSummary && mentorMeta && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.75rem', alignItems: 'start' }}>
                            {/* Gauge */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '0.75rem 0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                              <HealthGauge score={mentorMeta.healthScore || 0} size={84} />
                              <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>Health Score</div>
                            </div>
                            {/* Right metadata */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: 4 }}>
                              {mentorMeta.riskLevel && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                  <ShieldAlert size={12} color="#f59e0b" />
                                  <span style={{ fontSize: '0.71rem', color: 'rgba(255,255,255,0.45)' }}>Risk:</span>
                                  <span style={{ fontSize: '0.69rem', fontWeight: 800, textTransform: 'uppercase',
                                    color: mentorMeta.riskLevel === 'high' || mentorMeta.riskLevel === 'critical' ? '#ef4444' : mentorMeta.riskLevel === 'medium' ? '#f59e0b' : '#22c55e' }}>
                                    {mentorMeta.riskLevel}
                                  </span>
                                </div>
                              )}
                              {mentorMeta.blockers?.length > 0 && (
                                <div>
                                  <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Blockers</div>
                                  {mentorMeta.blockers.map((b, i) => (
                                    <div key={i} style={{ fontSize: '0.7rem', color: '#fca5a5', display: 'flex', gap: 5, marginBottom: 2 }}>
                                      <span style={{ color: '#ef4444', flexShrink: 0 }}>•</span>{b}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {mentorMeta.pendingMilestones?.length > 0 && (
                                <div>
                                  <div style={{ fontSize: '0.64rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Pending</div>
                                  {mentorMeta.pendingMilestones.map((m, i) => (
                                    <div key={i} style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', display: 'flex', gap: 5, marginBottom: 2 }}>
                                      <span style={{ color: '#f59e0b', flexShrink: 0 }}>⏳</span>{m}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}


                    {/* Projects */}

                    {projs.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                        <div style={{ fontSize: '0.85rem' }}>No project submitted yet.</div>
                      </div>
                    ) : projs.map((p, idx) => {
                      const dm = DOMAIN_META[p.domain] || DOMAIN_META.web;
                      const pct = p.overallProgress || (p.totalMilestones > 0 ? Math.round((p.milestonesDone / p.totalMilestones) * 100) : 0);
                      return (
                        <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '1rem', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f1f5f9' }}>{p.title}</div>
                              <span style={{ fontSize: '0.7rem', color: dm.color, background: dm.color + '15', border: `1px solid ${dm.color}30`, padding: '1px 8px', borderRadius: 99, display: 'inline-block', marginTop: 4 }}>
                                {dm.icon} {dm.label}
                              </span>
                            </div>
                            <StatusBadge status={p.status} />
                          </div>
                          {p.desc && <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 10 }}>{p.desc}</div>}
                          {/* Tech stack */}
                          {(p.techStack || []).length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                              {p.techStack.slice(0, 6).map(t => (
                                <span key={t} style={{ fontSize: '0.68rem', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', borderRadius: 6, padding: '2px 7px' }}>{t}</span>
                              ))}
                            </div>
                          )}
                          {/* Progress bar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <MiniProgressBar pct={pct} color={pct >= 70 ? '#22c55e' : pct >= 40 ? '#3b82f6' : '#f59e0b'} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f1f5f9', width: 36 }}>{pct}%</span>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>
                            {p.milestonesDone || 0}/{p.totalMilestones || (p.milestones?.length) || 0} milestones · Feas: {p.feasibility || 0}% · {p.teamSize || '?'} member(s) · {p.durationDays || '?'} days
                          </div>
                        </div>
                      );
                    })}

                    {/* Skills */}
                    {s.skills && Object.keys(s.skills).length > 0 && (
                      <>
                        <div style={S.divider} />
                        <div style={S.sectionLabel}>Student Skills</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {Object.entries(s.skills).map(([k, v]) => {
                            const skDef = SKILLS.find(x => x.id === k);
                            const pct = Math.min(100, (v / 5) * 100);
                            return (
                              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', width: 100, flexShrink: 0 }}>
                                  {skDef?.icon || '⚡'} {skDef?.name || k}
                                </span>
                                <MiniProgressBar pct={pct} color={pct >= 80 ? '#22c55e' : pct >= 50 ? '#3b82f6' : '#f59e0b'} />
                                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', width: 30 }}>{LEVEL_LABELS?.[v] || v}/5</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── MILESTONES ── */}
                {drawerTab === 'milestones' && (
                  <div>
                    {!mainP?.milestones?.length ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗺️</div>
                        <div>No tracking report generated yet.</div>
                        <div style={{ fontSize: '0.78rem', marginTop: 6 }}>Ask the student to run the Tracking Agent from their dashboard.</div>
                      </div>
                    ) : mainP.milestones.map((ms, i) => {
                      const isSigned = ms.facultySignoff;
                      const isDone = ms.completed;
                      return (
                        <div key={ms.id || i} style={{
                          background: 'rgba(255,255,255,0.03)', border: `1px solid ${isSigned ? 'rgba(22,163,74,0.3)' : isDone ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.07)'}`,
                          borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '0.65rem',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: '0.9rem' }}>
                                  {isSigned ? '✅' : isDone ? '🔵' : '⏳'}
                                </span>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9' }}>{ms.title}</span>
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                                {ms.phase} · {ms.weekLabel} · ~{ms.estimatedEffortHours}h
                              </div>
                              {ms.deliverables?.length > 0 && (
                                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
                                  {ms.deliverables.slice(0, 2).map((d, di) => (
                                    <div key={di}>• {d}</div>
                                  ))}
                                </div>
                              )}
                              {isSigned && ms.facultyNotes && (
                                <div style={{ fontSize: '0.68rem', color: '#4ade80', marginTop: 4, fontStyle: 'italic' }}>
                                  Faculty note: {ms.facultyNotes}
                                </div>
                              )}
                            </div>
                            {isDone && !isSigned && (
                              <button className="fac-btn"
                                disabled={signingOff === ms.id}
                                onClick={() => handleMilestoneSignoff(ms, mainP.id)}
                                style={{ ...S.btn, ...S.btnSuccess, padding: '0.3rem 0.65rem', fontSize: '0.7rem', flexShrink: 0 }}>
                                {signingOff === ms.id ? '⟳' : '✓ Sign Off'}
                              </button>
                            )}
                            {isSigned && (
                              <span style={{ fontSize: '0.68rem', color: '#4ade80', flexShrink: 0 }}>Faculty approved ✓</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── AI REPORTS ── */}
                {drawerTab === 'reports' && (
                  <div>
                    <div style={S.sectionLabel}>AI Agent Pipeline Reports</div>
                    {!mainP ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)' }}>No project data available.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {[
                          {
                            icon: '📊', name: 'Feasibility Report', agent: 'Agent 1',
                            done: !!(mainP.analysis?.feasibility?.overallScore),
                            score: mainP.analysis?.feasibility?.overallScore,
                            action: () => setFeasModal({ open: true, report: mainP.analysis?.feasibility, project: mainP }),
                          },
                          {
                            icon: '📐', name: 'Scope Definition', agent: 'Agent 2',
                            done: !!(mainP.analysis?.scope?.problemStatement),
                            action: () => setScopeModal({ open: true, report: mainP.analysis?.scope }),
                          },
                          {
                            icon: '🛠️', name: 'Technology Stack', agent: 'Agent 3',
                            done: !!(mainP.analysis?.technology?.recommendedStack),
                            action: () => setTechModal({ open: true, report: mainP.analysis?.technology }),
                          },
                          {
                            icon: '🗺️', name: 'Tracking & Milestones', agent: 'Agent 4',
                            done: !!(mainP.analysis?.tracking?.milestones?.length),
                            score: mainP.analysis?.tracking?.overallProgress,
                            action: () => setTrackingModal({ open: true, report: mainP.analysis?.tracking, idea: mainP }),
                          },
                        ].map((rep, i) => (
                          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${rep.done ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontSize: '1.2rem' }}>{rep.icon}</span>
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9' }}>{rep.name}</div>
                                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>{rep.agent} · {rep.done ? (rep.score != null ? `Score: ${rep.score}%` : 'Generated') : 'Not generated'}</div>
                              </div>
                            </div>
                            <button className="fac-btn" onClick={rep.action} disabled={!rep.done}
                              style={{ ...S.btn, ...(rep.done ? S.btnPrimary : S.btnSecondary), padding: '0.35rem 0.85rem', fontSize: '0.75rem', opacity: rep.done ? 1 : 0.4 }}>
                              {rep.done ? 'View' : 'N/A'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── FEEDBACK ── */}
                {drawerTab === 'feedback' && (
                  <div>
                    <div style={S.sectionLabel}>Faculty Decision</div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      {[
                        { val: 'active', label: '✅ Approve' },
                        { val: 'pending_revision', label: '🔄 Request Revision' },
                        { val: 'approved', label: '🏆 Final Approve' },
                      ].map(opt => (
                        <button key={opt.val} className="fac-btn"
                          onClick={() => setReviewStatus(opt.val)}
                          style={{
                            ...S.btn, padding: '0.45rem 0.85rem', fontSize: '0.78rem',
                            background: reviewStatus === opt.val ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${reviewStatus === opt.val ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.1)'}`,
                            color: reviewStatus === opt.val ? '#60a5fa' : 'rgba(255,255,255,0.55)',
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <div style={S.sectionLabel}>Feedback & Comments</div>
                    <textarea
                      style={{ ...S.searchInput, width: '100%', minHeight: 130, resize: 'vertical', padding: '0.65rem 0.9rem', lineHeight: 1.6, marginBottom: '0.85rem' }}
                      placeholder="Provide constructive feedback, architectural suggestions, or required revisions..."
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                    />
                    <button className="fac-btn" onClick={handleSaveReview} disabled={savingReview}
                      style={{ ...S.btn, ...S.btnPrimary, width: '100%', opacity: savingReview ? 0.6 : 1 }}>
                      {savingReview ? '⟳ Saving...' : '💾 Save Review'}
                    </button>

                    {mainP?.facultyFeedback && (
                      <div style={{ marginTop: '1rem', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '0.85rem' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#60a5fa', marginBottom: 4 }}>PREVIOUS FEEDBACK</div>
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{mainP.facultyFeedback}</div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Report Modals ── */}
      <FeasibilityReportModal
        isOpen={feasModal.open}
        report={feasModal.report}
        project={feasModal.project}
        onClose={() => setFeasModal({ open: false, report: null, project: null })}
      />
      <ScopeReportModal
        isOpen={scopeModal.open}
        report={scopeModal.report}
        project={null}
        onClose={() => setScopeModal({ open: false, report: null })}
      />
      {techModal.open && techModal.report && (
        <TechStackReportModal
          report={techModal.report}
          project={null}
          onClose={() => setTechModal({ open: false, report: null })}
        />
      )}
      {trackingModal.open && trackingModal.report && (
        <TrackingReportModal
          report={trackingModal.report}
          project={trackingModal.idea}
          onClose={() => setTrackingModal({ open: false, report: null, idea: null })}
        />
      )}
    </>
  );
}
