import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatbotPanel from '../components/ChatbotPanel';
import FeasibilityReportModal from '../components/FeasibilityReportModal';
import ScopeReportModal from '../components/ScopeReportModal';
import TechStackReportModal from '../components/TechStackReportModal';
import TrackingReportModal from '../components/TrackingReportModal';
import TimelinePlannerTab from '../components/TimelinePlannerTab';
import RiskHeatmapMatrix from '../components/RiskHeatmapMatrix';
import SprintTimelineView from '../components/SprintTimelineView';
import { Store, fmtDate, logout } from '../utils/store';

import { showToast } from '../utils/toast';
import {
  submitIdeaToBackend,
  fetchFeasibilityReport,
  fetchScopeReport,
  fetchTechStackReport,
  fetchTrackingReport,
  toggleMilestoneStatus,
  fetchRiskAssessment,
  submitCheckIn,
  fetchCheckIns,
  generateDocument,
  getUserProfile,
  fetchUserIdeas,
  updateIdeaInBackend,
  deleteIdeaInBackend,
  // New module APIs
  sendMentorMessage,
  fetchMentorHistory,
  clearMentorHistory,
  submitProgressUpdate,
  fetchProgressUpdates,
  fetchPlanHistory,
  fetchCurrentPlan,
  triggerPlanAdjust,
  generateSynopsis,
  generateMethodology,
  generateProgressReport,
  fetchProjectDocuments,
} from '../utils/api';

/* ────────────────────────────────────────────────
   SUB-COMPONENTS (tabs rendered inside the shell)
   ──────────────────────────────────────────────── */

/** Compact header bar replacing the old Navbar */
function TopBar({ title, subtitle, actions }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '1rem 2rem', borderBottom: '1px solid var(--border)',
      background: 'rgba(15, 17, 21, 0.85)', backdropFilter: 'blur(16px)',
      position: 'sticky', top: 0, zIndex: 50,
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      <div>
        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        {actions}
      </div>
    </div>
  );
}

/* ── Skeleton Loader ── */
function Skeleton({ w = '100%', h = 16, r = 6, mb = 0 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,rgba(255,255,255,0.05) 25%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.05) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite', marginBottom: mb,
    }} />
  );
}

/* ── Stat Card ── */
function StatCard({ icon, label, value, sub, color = 'var(--blue)', pct }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '1.1rem 1.25rem',
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 4 }}>{sub}</div>}
      {pct !== undefined && (
        <div style={{ marginTop: '0.6rem', background: 'var(--surface2)', borderRadius: 99, height: 5, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: color, transition: 'width 0.6s' }} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TAB: DASHBOARD (overview)
   ═══════════════════════════════════════════════ */
function DashboardTab({ profile, projects, onOpenSubmitModal, onTabChange }) {
  const [selIdx, setSelIdx] = React.useState(0);
  const proj   = projects[selIdx] || projects[0];
  const feas   = proj?.feasibilityReport;
  const risk   = proj?.riskReport;
  const scope  = proj?.scopeReport;
  const track  = proj?.trackingReport;
  const latestCI = proj?.checkIns?.[proj.checkIns?.length - 1];

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const cardStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 14,
    padding: '1.1rem 1.25rem',
  };

  const labelStyle = {
    fontSize: '0.68rem', fontWeight: 700,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase', letterSpacing: '0.07em',
    marginBottom: 6,
  };

  const valueStyle = (color = '#f1f5f9') => ({
    fontSize: '1.65rem', fontWeight: 800, color, lineHeight: 1.1,
  });

  const subStyle = {
    fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: 4,
  };

  // Risk colour
  const riskColor = {
    Critical: '#ef4444', High: '#ef4444', Medium: '#f59e0b',
    Low: '#22c55e', None: '#22c55e',
  }[risk?.risk_level] || '#f59e0b';

  // Pipeline steps
  const pipeline = [
    { icon: '📊', name: 'Feasibility', done: !!feas, score: feas?.overallScore ? `${feas.overallScore}%` : null },
    { icon: '📐', name: 'Scope',        done: !!scope },
    { icon: '🛠️', name: 'Tech Stack',  done: !!proj?.techStackReport },
    { icon: '🗺️', name: 'Tracking',   done: !!track, score: track?.overallProgress ? `${track.overallProgress}%` : null },
    { icon: '⚠️', name: 'Risk',        done: !!risk },
    { icon: '📝', name: 'Reports',     done: !!(proj?.checkIns?.length) },
  ];
  const doneCount = pipeline.filter(s => s.done).length;
  const pipelinePct = Math.round((doneCount / pipeline.length) * 100);

  return (
    <div style={{ padding: '1.5rem 2rem' }}>

      {/* ── Welcome Header ── */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.3px' }}>
            {greeting}, {profile?.firstName || 'Student'} 👋
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.83rem', marginTop: 4 }}>
            {[profile?.rollNo, profile?.branch, profile?.year].filter(Boolean).join(' · ') || 'Complete your profile to see details'}
          </div>
        </div>
        {/* Project selector (only shown when multiple projects exist) */}
        {projects.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Viewing Project
            </div>
            <select
              value={selIdx}
              onChange={e => setSelIdx(+e.target.value)}
              style={{ background: '#ffffff', border: '1px solid #c7d2e0', borderRadius: 8, padding: '0.45rem 0.85rem', color: '#0f172a', fontSize: '0.83rem', cursor: 'pointer', maxWidth: 220 }}
            >
              {projects.map((p, i) => <option key={i} value={i}>{p.title?.slice(0, 35) || `Project ${i+1}`}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── No Project State ── */}
      {projects.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '3rem 2rem',
          background: 'rgba(79,70,229,0.06)', border: '1.5px dashed rgba(79,70,229,0.3)',
          borderRadius: 16, marginBottom: '1.5rem',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🚀</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>
            No project submitted yet
          </div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', marginBottom: '1.25rem' }}>
            Submit your rough idea — the AI pipeline will build a complete project blueprint automatically.
          </div>
          <button onClick={onOpenSubmitModal} style={{
            padding: '0.7rem 1.75rem', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff',
            fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
          }}>
            💡 Submit Your First Idea
          </button>
        </div>
      )}

      {/* ── Stat Cards ── */}
      {proj && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>

            {/* Feasibility Score */}
            <div style={cardStyle}>
              <div style={labelStyle}>📊 Feasibility Score</div>
              <div style={valueStyle(feas ? '#3b82f6' : 'rgba(255,255,255,0.3)')}>
                {feas ? `${feas.overallScore}%` : '—'}
              </div>
              <div style={subStyle}>{feas?.verdict || 'Run Feasibility Agent'}</div>
              {feas && (
                <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${feas.overallScore}%`, height: '100%', background: '#3b82f6', borderRadius: 99, transition: 'width 0.6s' }} />
                </div>
              )}
            </div>

            {/* Total Projects */}
            <div style={cardStyle}>
              <div style={labelStyle}>📁 Total Projects</div>
              <div style={valueStyle('#8b5cf6')}>{projects.length}</div>
              <div style={subStyle}>
                {projects.length === 1 ? '1 project active' : `${projects.length} projects submitted`}
              </div>
            </div>

            {/* Risk Level */}
            <div style={cardStyle}>
              <div style={labelStyle}>⚠️ Risk Level</div>
              <div style={valueStyle(risk ? riskColor : 'rgba(255,255,255,0.3)')}>
                {risk?.risk_level || '—'}
              </div>
              <div style={subStyle}>
                {risk?.top_blocker ? risk.top_blocker.slice(0, 35) + (risk.top_blocker.length > 35 ? '…' : '') : 'Run Risk Assessment Agent'}
              </div>
            </div>

            {/* Current Progress */}
            <div style={cardStyle}>
              <div style={labelStyle}>📈 Current Progress</div>
              <div style={valueStyle(latestCI ? '#22c55e' : 'rgba(255,255,255,0.3)')}>
                {latestCI ? `${latestCI.progress_pct}%` : '—'}
              </div>
              <div style={subStyle}>
                {latestCI ? `Week ${latestCI.week_number} check-in` : 'No check-in submitted yet'}
              </div>
              {latestCI && (
                <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${latestCI.progress_pct}%`, height: '100%', background: '#22c55e', borderRadius: 99, transition: 'width 0.6s' }} />
                </div>
              )}
            </div>
          </div>

          {/* ── AI Agent Pipeline Status ── */}
          <div style={{ ...cardStyle, marginBottom: '1.5rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  AI Agent Pipeline
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9', marginTop: 2 }}>
                  {proj.title?.slice(0, 50)}{proj.title?.length > 50 ? '…' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: '0.75rem', color: doneCount === pipeline.length ? '#22c55e' : 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  {doneCount}/{pipeline.length} completed
                </div>
                <div style={{ width: 80, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${pipelinePct}%`, height: '100%', background: doneCount === pipeline.length ? '#22c55e' : '#3b82f6', borderRadius: 99, transition: 'width 0.6s' }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {pipeline.map((step, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0.45rem 0.85rem',
                  background: step.done ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${step.done ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 99, fontSize: '0.75rem',
                  color: step.done ? '#4ade80' : 'rgba(255,255,255,0.4)',
                  fontWeight: 600,
                }}>
                  <span>{step.icon}</span>
                  <span>{step.name}</span>
                  {step.done && <span style={{ color: '#4ade80' }}>✓</span>}
                  {step.score && <span style={{ color: '#60a5fa', fontWeight: 700 }}>{step.score}</span>}
                  {!step.done && <span style={{ opacity: 0.4 }}>○</span>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Quick Actions ── */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
          Quick Actions
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '0.75rem' }}>
          {[
            { icon: '💡', label: 'Submit Idea',     desc: 'Start a new project',     action: onOpenSubmitModal,              color: '#4f46e5', bg: 'rgba(79,70,229,0.12)',  border: 'rgba(79,70,229,0.25)' },
            { icon: '🤖', label: 'AI Mentor Chat',  desc: 'Get personalised guidance', action: () => onTabChange('mentor'),  color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.25)' },
            { icon: '📈', label: 'Weekly Check-in', desc: 'Update your progress',     action: () => onTabChange('progress'), color: '#16a34a', bg: 'rgba(22,163,74,0.12)',  border: 'rgba(22,163,74,0.25)' },
            { icon: '📋', label: 'Generate Report', desc: 'Download documents',       action: () => onTabChange('reports'),  color: '#d97706', bg: 'rgba(217,119,6,0.12)',  border: 'rgba(217,119,6,0.25)' },
          ].map((qa, i) => (
            <button key={i} onClick={qa.action} style={{
              background: qa.bg, border: `1px solid ${qa.border}`,
              borderRadius: 12, padding: '1rem', cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.18s', color: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${qa.color}30`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ fontSize: '1.3rem', marginBottom: 8 }}>{qa.icon}</div>
              <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>{qa.label}</div>
              <div style={{ fontSize: '0.71rem', color: 'rgba(255,255,255,0.4)' }}>{qa.desc}</div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}


/* ═══════════════════════════════════════════════
   TAB: MENTOR CHAT (project-context-aware AI)
   ═══════════════════════════════════════════════ */
function MentorChatTab({ projects, profile }) {
  const [selectedProjIdx, setSelectedProjIdx] = useState(0);
  const [messages, setMessages] = useState([]);   // [{role:'user'|'assistant', content, ts}]
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef(null);

  const proj = projects[selectedProjIdx];

  /* Scroll to bottom on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* Load conversation history when project changes */
  useEffect(() => {
    if (!proj) return;
    const user = Store.get('currentUser');
    if (!user?.email) return;
    const projId = proj.idea_id || proj.id || '';
    if (!projId) return;
    setLoadingHistory(true);
    fetchMentorHistory(user.email, projId)
      .then(data => {
        const turns = (data.turns || []).flatMap(t => [
          { role: 'user', content: t.role_user, ts: t.timestamp },
          { role: 'assistant', content: t.role_assistant, ts: t.timestamp },
        ]);
        setMessages(turns);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingHistory(false));
  }, [selectedProjIdx, proj?.id]);

  const SUGGESTED = [
    "I couldn't finish the API development this week.",
    "What is my current milestone status?",
    "What are my top risks right now?",
    "Which technologies should I prioritize?",
    "Help me plan next week's tasks.",
    "Am I on track to finish on time?",
  ];

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || !proj) return;
    const user = Store.get('currentUser');
    if (!user?.email) { showToast('Please log in first', '❌'); return; }

    const projId = proj.idea_id || proj.id || '';
    const now = new Date().toISOString();
    const userMsg = { role: 'user', content: msg, ts: now };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      // Build history for context (last 10 turns)
      const historyForApi = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const res = await sendMentorMessage({
        student_email: user.email,
        project_id: projId,
        message: msg,
        history: historyForApi,
        project_context: {
          title: proj.title,
          desc: proj.desc,
          domain: proj.domain,
          teamSize: proj.teamSize || proj.team_size,
          durationDays: proj.durationDays || proj.duration_days,
          techIdeas: proj.techIdeas || proj.tech_ideas,
          features: proj.features || [],
          trackingReport: proj.trackingReport,
          riskReport: proj.riskReport,
          scopeReport: proj.scopeReport,
          techStackReport: proj.techStackReport,
          milestones: proj.trackingReport?.milestones || proj.milestones || [],
          overallProgress: proj.trackingReport?.overallProgress || proj.overallProgress || 0,
        },
      });
      const aiMsg = { role: 'assistant', content: res.reply || 'No response received.', ts: new Date().toISOString() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Connection error. Please check the backend is running and try again.',
        ts: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = async () => {
    const user = Store.get('currentUser');
    if (!user?.email || !proj) return;
    const projId = proj.idea_id || proj.id || '';
    try {
      await clearMentorHistory(user.email, projId);
      setMessages([]);
      showToast('Chat history cleared', '🧹');
    } catch (e) {
      console.error(e);
      setMessages([]);
      showToast('Chat history reset', '🧹');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  /* Simple markdown renderer */
  const renderMarkdown = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.12);padding:1px 5px;border-radius:3px;font-size:0.85em">$1</code>')
      .replace(/^- (.+)$/gm, '• $1')
      .replace(/\n/g, '<br/>');
  };

  const s = {
    root: { padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' },
    projectSel: { background: '#ffffff', border: '1px solid #c7d2e0', borderRadius: 8, padding: '0.5rem 0.85rem', color: '#0f172a', fontSize: '0.83rem', cursor: 'pointer' },
    chatBox: { flex: 1, overflowY: 'auto', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1.25rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', minHeight: 0 },
    userBubble: { alignSelf: 'flex-end', maxWidth: '72%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', borderRadius: '14px 14px 4px 14px', padding: '0.7rem 1rem', fontSize: '0.85rem', lineHeight: 1.6 },
    aiBubble: { alignSelf: 'flex-start', maxWidth: '80%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', borderRadius: '14px 14px 14px 4px', padding: '0.7rem 1rem', fontSize: '0.85rem', lineHeight: 1.7 },
    inputRow: { display: 'flex', gap: '0.6rem', alignItems: 'flex-end' },
    textarea: { flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '0.75rem 1rem', color: '#f1f5f9', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'none', outline: 'none', minHeight: 44, maxHeight: 120 },
    sendBtn: { padding: '0.7rem 1.2rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', flexShrink: 0, transition: 'opacity 0.2s' },
    chips: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' },
    chip: { fontSize: '0.73rem', padding: '4px 12px', borderRadius: 99, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', cursor: 'pointer', transition: 'all 0.15s' },
    ts: { fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', marginTop: 4, textAlign: 'right' },
    aiBadge: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.65rem', fontWeight: 700, color: '#a5b4fc', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' },
  };

  if (projects.length === 0) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>No Project Selected</div>
        <div style={{ fontSize: '0.85rem' }}>Submit a project idea first to start chatting with your AI mentor.</div>
      </div>
    );
  }

  const currentMilestoneTitle = proj?.trackingReport?.milestones?.find(m => !m.completed)?.title || proj?.trackingReport?.milestones?.[0]?.title || 'Core Implementation';
  const progressPercent = proj?.trackingReport?.overallProgress || proj?.overallProgress || 0;

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f1f5f9' }}>🤖 Conversational AI Mentor</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
            Dedicated academic mentoring grounded exclusively in your selected project
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {projects.length > 1 && (
            <select value={selectedProjIdx} onChange={e => setSelectedProjIdx(+e.target.value)} style={s.projectSel}>
              {projects.map((p, i) => <option key={i} value={i}>{p.title}</option>)}
            </select>
          )}
          {proj && (
            <>
              <button
                onClick={handleClearChat}
                title="Clear chat history for this project"
                style={{
                  fontSize: '0.74rem',
                  padding: '5px 12px',
                  borderRadius: 8,
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#fca5a5',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontWeight: 600,
                  transition: 'all 0.15s'
                }}
              >
                🧹 Clear Chat
              </button>
              <div style={{ fontSize: '0.75rem', padding: '4px 12px', borderRadius: 99, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                📁 {proj.title?.slice(0, 28)}{proj.title?.length > 28 ? '…' : ''}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Project Context Ribbon */}
      {proj && (
        <div style={{
          background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(59,130,246,0.04))',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 12, padding: '0.75rem 1.15rem', marginBottom: '0.85rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🎯</span>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f1f5f9' }}>
                {proj.title}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 1 }}>
                Domain: <strong style={{ color: '#a5b4fc', textTransform: 'uppercase' }}>{proj.domain || 'General'}</strong>
                {' · '}Current Milestone: <strong style={{ color: '#60a5fa' }}>{currentMilestoneTitle}</strong>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Progress</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#38bdf8' }}>
                {progressPercent}%
              </div>
            </div>
            <span style={{
              fontSize: '0.68rem', fontWeight: 700, padding: '4px 10px', borderRadius: 99,
              background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              🔒 Grounded in this project
            </span>
          </div>
        </div>
      )}

      {/* Suggested prompts */}
      <div style={s.chips}>
        {SUGGESTED.map((q, i) => (
          <span key={i} style={{
            ...s.chip,
            background: i === 0 ? 'rgba(99,102,241,0.22)' : s.chip.background,
            borderColor: i === 0 ? 'rgba(99,102,241,0.45)' : s.chip.border,
            fontWeight: i === 0 ? 700 : 500,
          }}
            onClick={() => handleSend(q)}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = i === 0 ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.12)'; }}>
            {i === 0 ? '⚡ ' : ''}{q}
          </span>
        ))}
      </div>

      {/* Messages */}
      <div style={s.chatBox}>
        {loadingHistory && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem', padding: '2rem' }}>
            Loading conversation history…
          </div>
        )}
        {!loadingHistory && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.35)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🤖</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 6 }}>Hello! I'm your AI Project Mentor</div>
            <div style={{ fontSize: '0.8rem', lineHeight: 1.6 }}>
              Ask me anything about <strong style={{ color: '#a5b4fc' }}>{proj?.title}</strong> — milestones,
              tasks, risks, technology choices, or weekly planning.
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'assistant' && <div style={s.aiBadge}>🤖 ProjectGuide-AI</div>}
            <div style={m.role === 'user' ? s.userBubble : s.aiBubble}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
            <div style={s.ts}>{m.ts ? new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
          </div>
        ))}
        {sending && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={s.aiBadge}>🤖 ProjectGuide-AI</div>
            <div style={{ ...s.aiBubble, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#a5b4fc', animation: 'pulse 1s ease-in-out infinite' }} />
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#a5b4fc', animation: 'pulse 1s ease-in-out 0.2s infinite' }} />
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#a5b4fc', animation: 'pulse 1s ease-in-out 0.4s infinite' }} />
              <span style={{ marginLeft: 4, fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>Thinking…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={s.inputRow}>
        <textarea
          style={s.textarea}
          placeholder={`Ask about ${proj?.title || 'your project'}…`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
        />
        <button
          onClick={() => handleSend()}
          disabled={sending || !input.trim()}
          style={{ ...s.sendBtn, opacity: (sending || !input.trim()) ? 0.5 : 1 }}
        >
          {sending ? '⟳' : '➤'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TAB: PROGRESS (Weekly update & Automatic Plan Adjustment)
   ═══════════════════════════════════════════════ */
function ProgressTab({ projects, profile }) {
  const [selectedProjIdx, setSelectedProjIdx] = useState(0);
  const [updates, setUpdates] = useState([]);
  const [planHistory, setPlanHistory] = useState([]);
  const [currentPlanDoc, setCurrentPlanDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [adjusting, setAdjusting] = useState(false);

  // Weekly Update Form State
  const [progressPct, setProgressPct] = useState(45);
  const [completedTasks, setCompletedTasks] = useState(['Project setup', 'Database schema']);
  const [newCompletedTask, setNewCompletedTask] = useState('');
  const [pendingTasks, setPendingTasks] = useState(['API Development & Backend Services', 'Frontend Integration']);
  const [newPendingTask, setNewPendingTask] = useState('');
  const [blockers, setBlockers] = useState('');
  const [mood, setMood] = useState('good');
  const [comments, setComments] = useState('');

  // Latest Submission / Plan Adjustment Result
  const [adjustmentResult, setAdjustmentResult] = useState(null);
  const [activePlanTab, setActivePlanTab] = useState('comparison'); // 'comparison' | 'history'

  const [showGuide, setShowGuide] = useState(true);

  const proj = projects[selectedProjIdx];
  const projId = proj?.idea_id || proj?.id || '';

  // Extract organized tasks from current project (milestones, deliverables, features)
  const { tasksByPhase, suggestedDeliverables } = useMemo(() => {
    if (!proj) return { tasksByPhase: {}, suggestedDeliverables: [] };
    const byPhase = {};
    const suggested = [];

    const milestones = proj.trackingReport?.milestones || [];
    milestones.forEach((m, idx) => {
      const phaseLabel = `${m.phase || `Phase ${idx + 1}`}: ${m.title}`;
      const phaseTasks = [];

      if (m.deliverables && Array.isArray(m.deliverables) && m.deliverables.length > 0) {
        m.deliverables.forEach(d => {
          phaseTasks.push(d);
          suggested.push(d);
        });
      } else if (m.title) {
        phaseTasks.push(m.title);
        suggested.push(m.title);
      }

      if (phaseTasks.length > 0) {
        byPhase[phaseLabel] = phaseTasks;
      }
    });

    if (proj.features && Array.isArray(proj.features) && proj.features.length > 0) {
      byPhase['Project Core Features'] = proj.features;
      proj.features.forEach(f => {
        if (!suggested.includes(f)) suggested.push(f);
      });
    }

    if (proj.scopeReport?.inScope && Array.isArray(proj.scopeReport.inScope) && proj.scopeReport.inScope.length > 0) {
      byPhase['In-Scope Deliverables'] = proj.scopeReport.inScope;
    }

    return {
      tasksByPhase: byPhase,
      suggestedDeliverables: suggested
    };
  }, [proj]);

  // Extract milestones from project or current plan
  const activePlanMilestones = currentPlanDoc?.current_plan?.updated_milestones || proj?.trackingReport?.milestones || [];
  const overallMilestoneProgress = currentPlanDoc?.current_plan?.overall_progress || proj?.trackingReport?.overallProgress || progressPct;
  const currentMilestone = activePlanMilestones.find(m => m.status === 'in_progress' || !m.completed) || activePlanMilestones[0] || { title: 'Core Development Milestone', week: 'Week 4' };

  /* Fetch updates and plan history when project changes */
  useEffect(() => {
    if (!projId) return;
    setLoading(true);
    Promise.all([
      fetchProgressUpdates(projId).catch(() => ({ updates: [] })),
      fetchPlanHistory(projId).catch(() => ({ history: [] })),
      fetchCurrentPlan(projId).catch(() => ({ plan: null })),
    ]).then(([puRes, phRes, cpRes]) => {
      const uList = puRes.updates || [];
      setUpdates(uList);
      setPlanHistory(phRes.history || []);
      if (cpRes.plan) setCurrentPlanDoc(cpRes.plan);

      // Pre-fill form from latest update if available
      if (uList.length > 0) {
        const last = uList[uList.length - 1];
        setProgressPct(Math.min(100, (last.progress_pct || 0) + 10));
        if (last.pending_tasks?.length) setPendingTasks(last.pending_tasks);
      }
    }).finally(() => setLoading(false));

    setAdjustmentResult(null);
  }, [selectedProjIdx, projId]);

  /* Task Helpers */
  const addCompletedTask = (task) => {
    const t = (task || newCompletedTask).trim();
    if (t && !completedTasks.includes(t)) {
      setCompletedTasks(prev => [...prev, t]);
      setNewCompletedTask('');
    }
  };

  const removeCompletedTask = (index) => {
    setCompletedTasks(prev => prev.filter((_, i) => i !== index));
  };

  const addPendingTask = (task) => {
    const t = (task || newPendingTask).trim();
    if (t && !pendingTasks.includes(t)) {
      setPendingTasks(prev => [...prev, t]);
      setNewPendingTask('');
    }
  };

  const removePendingTask = (index) => {
    setPendingTasks(prev => prev.filter((_, i) => i !== index));
  };

  /* Submit Weekly Progress Update */
  const handleSubmitProgress = async () => {
    if (!proj) return;
    const user = Store.get('currentUser');
    if (!user?.email) { showToast('Please log in first', '❌'); return; }

    setSubmitting(true);
    try {
      const payload = {
        student_email: user.email,
        project_id: projId,
        project_title: proj.title || 'Project',
        week_number: updates.length + 1,
        progress_pct: progressPct,
        completed_tasks: completedTasks,
        pending_tasks: pendingTasks,
        blockers: blockers || 'None reported',
        mood,
        comments,
        idea_data: {
          title: proj.title,
          desc: proj.desc,
          teamSize: proj.teamSize || proj.team_size,
          durationDays: proj.durationDays || proj.duration_days,
        },
        scope_report: proj.scopeReport || {},
      };

      const res = await submitProgressUpdate(payload);
      if (res.success) {
        setAdjustmentResult(res);
        setUpdates(prev => [...prev, {
          ...payload,
          submitted_at: new Date().toISOString(),
          adjustment: res.adjustment,
          plan_adjusted: res.plan_adjusted,
        }]);

        if (res.plan_adjusted) {
          showToast('⚠️ Progress delay detected! AI has generated an updated plan.', '⚠️');
          // Refresh plan history
          fetchPlanHistory(projId).then(ph => setPlanHistory(ph.history || []));
          fetchCurrentPlan(projId).then(cp => { if (cp.plan) setCurrentPlanDoc(cp.plan); });
        } else {
          showToast('Weekly progress update saved successfully! ✅', '🎉');
        }

        setBlockers('');
        setComments('');
      } else {
        showToast(`Submission failed: ${res.error || 'Unknown error'}`, '❌');
      }
    } catch (err) {
      console.error(err);
      showToast('Progress update submission failed. Is backend running?', '❌');
    } finally {
      setSubmitting(false);
    }
  };

  /* Manual Plan Adjustment Trigger */
  const handleManualAdjust = async () => {
    if (!proj) return;
    const user = Store.get('currentUser');
    setAdjusting(true);
    try {
      const res = await triggerPlanAdjust({
        student_email: user?.email || '',
        project_id: projId,
        project_title: proj.title || 'Project',
        idea_data: { title: proj.title, desc: proj.desc, durationDays: proj.durationDays || 30 },
        scope_report: proj.scopeReport || {},
        tracking_report: proj.trackingReport || {},
      });
      if (res.success) {
        setAdjustmentResult({
          plan_adjusted: true,
          student_notification: res.student_notification || 'Plan adjusted based on recent progress review.',
          previous_plan: res.previous_plan,
          updated_plan: res.updated_plan,
          affected_milestone: res.affected_milestone,
          recommended_action: res.recommended_action,
        });
        showToast('Plan adjustment re-evaluated by AI planning agent! 🔄', '✅');
        fetchPlanHistory(projId).then(ph => setPlanHistory(ph.history || []));
      } else {
        showToast(res.error || 'Plan adjustment check failed.', '❌');
      }
    } catch (err) {
      console.error(err);
      showToast('Adjustment trigger failed.', '❌');
    } finally {
      setAdjusting(false);
    }
  };

  const MOODS = [
    { val: 'great', emoji: '😄', label: 'Great' },
    { val: 'good', emoji: '🙂', label: 'Good' },
    { val: 'okay', emoji: '😐', label: 'Okay' },
    { val: 'struggling', emoji: '😓', label: 'Struggling' },
  ];

  if (projects.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.4)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>No projects yet</div>
        <div style={{ fontSize: '0.85rem', marginTop: 6 }}>Submit a project idea first to track progress and milestones</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      {/* ── Top Bar: Project Selector & Actions ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9' }}>
            📈 Progress Tracking & Automatic Plan Adjustment
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
            Submit weekly updates, detect timeline delays, and review auto-adjusted milestone plans
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {projects.length > 1 && (
            <select
              value={selectedProjIdx}
              onChange={e => setSelectedProjIdx(+e.target.value)}
              style={{
                background: '#ffffff', border: '1px solid #c7d2e0',
                borderRadius: 8, padding: '0.5rem 0.85rem', color: '#0f172a', fontSize: '0.83rem',
              }}
            >
              {projects.map((p, i) => <option key={i} value={i}>{p.title}</option>)}
            </select>
          )}
          <button
            onClick={handleManualAdjust}
            disabled={adjusting}
            style={{
              padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
              fontSize: '0.78rem', fontWeight: 700, cursor: adjusting ? 'not-allowed' : 'pointer',
            }}
          >
            {adjusting ? '⟳ Analyzing...' : '🔄 Run Plan Adjustment'}
          </button>
        </div>
      </div>

      {/* ── Explainer Guide Card ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(30,41,59,0.7) 100%)',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: 14,
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.2rem' }}>💡</span>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc' }}>
                How Weekly Progress Tracking &amp; AI Plan Adjustment Works
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                Keep your faculty guide informed and let AI auto-adjust your deadlines if your team encounters delays.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide(prev => !prev)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#c7d2fe',
              borderRadius: 6,
              padding: '3px 9px',
              fontSize: '0.72rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {showGuide ? 'Hide Guide ▲' : 'Show Guide ▼'}
          </button>
        </div>

        {showGuide && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#38bdf8', marginBottom: 2 }}>1. Set Overall %</div>
              <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
                Slide the progress bar to report how much of your total project is built.
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#4ade80', marginBottom: 2 }}>2. Pick Project Tasks</div>
              <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
                Use the new <strong>Quick-Pick dropdown</strong> or <strong>suggested chips</strong> below to select deliverables directly from this project!
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#fbbf24', marginBottom: 2 }}>3. Report Blockers</div>
              <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
                Note any library, API, or hardware bugs slowing your team down.
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#a78bfa', marginBottom: 2 }}>4. Automatic Recovery</div>
              <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
                If progress lags behind schedule, AI reschedules subsequent milestones to safeguard your submission deadline.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 1: Current Milestone Progress Display ── */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#60a5fa' }}>
              CURRENT MILESTONE STATUS
            </span>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f1f5f9', marginTop: 2 }}>
              🎯 {currentMilestone.title || 'Core Project Implementation'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99,
              background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)',
            }}>
              {currentMilestone.weekLabel || currentMilestone.week || 'Active Week'}
            </span>
            <span style={{
              fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99,
              background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)',
            }}>
              Overall: {overallMilestoneProgress}%
            </span>
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 10, overflow: 'hidden' }}>
            <div style={{
              width: `${overallMilestoneProgress}%`, height: '100%',
              background: 'linear-gradient(90deg,#3b82f6,#6366f1,#8b5cf6)',
              borderRadius: 99, transition: 'width 0.6s ease',
            }} />
          </div>
          <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#60a5fa', width: 44, textAlign: 'right' }}>
            {overallMilestoneProgress}%
          </span>
        </div>

        {/* Active Milestones Mini Pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {activePlanMilestones.map((m, idx) => {
            const isDone = m.completed || m.status === 'completed';
            const isCurrent = m.status === 'in_progress';
            return (
              <div key={idx} style={{
                fontSize: '0.72rem', padding: '4px 10px', borderRadius: 8,
                background: isDone ? 'rgba(34,197,94,0.1)' : isCurrent ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isDone ? 'rgba(34,197,94,0.3)' : isCurrent ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: isDone ? '#4ade80' : isCurrent ? '#93c5fd' : 'rgba(255,255,255,0.5)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span>{isDone ? '✓' : isCurrent ? '🔵' : '○'}</span>
                <span>{m.title?.slice(0, 24)}{m.title?.length > 24 ? '…' : ''}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Student Alert & "Previous Plan → Updated Plan" Comparison ── */}
      {adjustmentResult && (
        <div style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
          {/* Notification Banner */}
          <div style={{
            background: adjustmentResult.plan_adjusted
              ? 'linear-gradient(135deg,rgba(239,68,68,0.15),rgba(249,115,22,0.1))'
              : 'linear-gradient(135deg,rgba(34,197,94,0.15),rgba(59,130,246,0.1))',
            border: `1.5px solid ${adjustmentResult.plan_adjusted ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.35)'}`,
            borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{adjustmentResult.plan_adjusted ? '⚠️' : '✅'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: adjustmentResult.plan_adjusted ? '#fca5a5' : '#86efac' }}>
                  {adjustmentResult.student_notification}
                </div>
                {adjustmentResult.recommended_action && (
                  <div style={{ marginTop: 6, fontSize: '0.82rem', color: '#f1f5f9', background: 'rgba(0,0,0,0.25)', padding: '6px 12px', borderRadius: 8, display: 'inline-block' }}>
                    ⚡ <strong>Recommended Immediate Action:</strong> {adjustmentResult.recommended_action}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* "Previous Plan → Updated Plan" Comparison Card */}
          {adjustmentResult.plan_adjusted && (
            <div style={{
              background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14, padding: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f1f5f9' }}>
                    🔄 Plan Adjustment Analysis: Previous Plan → Updated Plan
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                    The Planning Agent has shifted delayed milestones and preserved original dependencies
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 99, background: 'rgba(239,68,68,0.2)', color: '#fca5a5', fontWeight: 700 }}>
                  Adjusted for: {adjustmentResult.affected_milestone || 'Current Milestone'}
                </span>
              </div>

              {/* Side-by-side: Previous Plan vs Updated Plan */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {/* Previous Plan */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '1rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
                    📋 Previous Plan (Original Schedule)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {((adjustmentResult.previous_plan || []).length > 0
                      ? adjustmentResult.previous_plan
                      : activePlanMilestones
                    ).map((m, idx) => (
                      <div key={idx} style={{
                        padding: '0.6rem 0.85rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>{m.title}</div>
                          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>{m.status || 'Scheduled'}</div>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 6 }}>
                          {m.week || m.weekLabel || `Week ${idx+1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Updated Plan */}
                <div style={{ background: 'rgba(99,102,241,0.04)', border: '1.5px solid rgba(99,102,241,0.3)', borderRadius: 10, padding: '1rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>✨ Updated Plan (AI-Adjusted)</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {(adjustmentResult.updated_plan || []).map((m, idx) => (
                      <div key={idx} style={{
                        padding: '0.6rem 0.85rem', borderRadius: 8, background: 'rgba(99,102,241,0.08)',
                        border: '1px solid rgba(99,102,241,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9' }}>{m.title}</div>
                          {m.change_note && (
                            <div style={{ fontSize: '0.68rem', color: m.change_note.includes('Shifted') ? '#fca5a5' : '#86efac', fontWeight: 600 }}>
                              → {m.change_note}
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#a5b4fc', background: 'rgba(99,102,241,0.25)', padding: '2px 8px', borderRadius: 6 }}>
                          {m.week}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Section 3: Dual Column Form & Progress History ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left: Weekly Update Submission Form */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: '1.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f1f5f9' }}>
              📝 Submit Weekly Progress Update
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
              Week {updates.length + 1}
            </span>
          </div>

          {/* 1. Progress Percentage Slider */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                CURRENT OVERALL PROGRESS (%)
              </label>
              <span style={{ fontSize: '1rem', fontWeight: 900, color: '#3b82f6' }}>{progressPct}%</span>
            </div>
            <input
              type="range" min={0} max={100} value={progressPct}
              onChange={e => setProgressPct(+e.target.value)}
              style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
              <span>0% (Started)</span><span>50% (Midway)</span><span>100% (Complete)</span>
            </div>
          </div>

          {/* 2. Completed Tasks Tag Input with Dropdown & Suggestions */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                ✓ COMPLETED TASKS THIS WEEK
              </label>
              <span style={{ fontSize: '0.68rem', color: '#4ade80', fontWeight: 600 }}>
                {completedTasks.length} recorded
              </span>
            </div>

            {/* Quick Pick Dropdown from Project Deliverables */}
            {Object.keys(tasksByPhase).length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <select
                  defaultValue=""
                  onChange={e => {
                    if (e.target.value) {
                      addCompletedTask(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid rgba(34,197,94,0.35)',
                    borderRadius: 8,
                    padding: '0.55rem 0.85rem',
                    color: '#f8fafc',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  <option value="" disabled>💡 Pick from {proj?.title || 'project'} roadmap deliverables...</option>
                  {Object.entries(tasksByPhase).map(([phase, tasks]) => (
                    <optgroup key={phase} label={`📁 ${phase}`}>
                      {tasks.map((task, ti) => {
                        const isAdded = completedTasks.includes(task);
                        return (
                          <option key={ti} value={task} disabled={isAdded}>
                            {isAdded ? `✓ ${task} (already added)` : task}
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            {/* Suggested Deliverable Chips */}
            {suggestedDeliverables.filter(d => !completedTasks.includes(d)).slice(0, 4).length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.4)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>⚡</span>
                  <span>Quick-add from pending milestones:</span>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {suggestedDeliverables.filter(d => !completedTasks.includes(d)).slice(0, 4).map((d, di) => (
                    <button
                      key={di}
                      type="button"
                      onClick={() => addCompletedTask(d)}
                      title={`Add: ${d}`}
                      style={{
                        background: 'rgba(34,197,94,0.1)',
                        border: '1px solid rgba(34,197,94,0.25)',
                        color: '#86efac',
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontWeight: 800 }}>+</span>
                      <span>{d.slice(0, 36)}{d.length > 36 ? '…' : ''}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Custom Task Input */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                value={newCompletedTask}
                onChange={e => setNewCompletedTask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCompletedTask(); }}}
                placeholder="Or type custom task and press Enter..."
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '0.55rem 0.85rem', color: '#f1f5f9', fontSize: '0.82rem',
                }}
              />
              <button
                type="button"
                onClick={() => addCompletedTask()}
                style={{
                  padding: '0.55rem 0.9rem', borderRadius: 8, border: 'none',
                  background: 'rgba(34,197,94,0.2)', color: '#4ade80', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                }}
              >
                + Add
              </button>
            </div>

            {/* Added Task Badges */}
            {completedTasks.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {completedTasks.map((t, idx) => (
                  <span key={idx} style={{
                    fontSize: '0.73rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                    color: '#86efac', padding: '3px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    <span>✓ {t}</span>
                    <button type="button" onClick={() => removeCompletedTask(idx)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 3. Pending Tasks Tag Input with Dropdown & Suggestions */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                ⏳ PENDING / UPCOMING TASKS
              </label>
              <span style={{ fontSize: '0.68rem', color: '#60a5fa', fontWeight: 600 }}>
                {pendingTasks.length} planned
              </span>
            </div>

            {/* Quick Pick Dropdown from Upcoming Deliverables */}
            {Object.keys(tasksByPhase).length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <select
                  defaultValue=""
                  onChange={e => {
                    if (e.target.value) {
                      addPendingTask(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid rgba(59,130,246,0.35)',
                    borderRadius: 8,
                    padding: '0.55rem 0.85rem',
                    color: '#f8fafc',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  <option value="" disabled>💡 Pick upcoming task from {proj?.title || 'project'} roadmap...</option>
                  {Object.entries(tasksByPhase).map(([phase, tasks]) => (
                    <optgroup key={phase} label={`📁 ${phase}`}>
                      {tasks.map((task, ti) => {
                        const isAdded = pendingTasks.includes(task);
                        return (
                          <option key={ti} value={task} disabled={isAdded}>
                            {isAdded ? `⏳ ${task} (already added)` : task}
                          </option>
                        );
                      })}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            {/* Suggested Deliverable Chips for Pending */}
            {suggestedDeliverables.filter(d => !pendingTasks.includes(d) && !completedTasks.includes(d)).slice(0, 4).length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.4)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>⚡</span>
                  <span>Quick-add planned upcoming tasks:</span>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {suggestedDeliverables.filter(d => !pendingTasks.includes(d) && !completedTasks.includes(d)).slice(0, 4).map((d, di) => (
                    <button
                      key={di}
                      type="button"
                      onClick={() => addPendingTask(d)}
                      title={`Add upcoming: ${d}`}
                      style={{
                        background: 'rgba(59,130,246,0.1)',
                        border: '1px solid rgba(59,130,246,0.25)',
                        color: '#93c5fd',
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontWeight: 800 }}>+</span>
                      <span>{d.slice(0, 36)}{d.length > 36 ? '…' : ''}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Custom Pending Task Input */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                value={newPendingTask}
                onChange={e => setNewPendingTask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPendingTask(); }}}
                placeholder="Or type custom upcoming task and press Enter..."
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '0.55rem 0.85rem', color: '#f1f5f9', fontSize: '0.82rem',
                }}
              />
              <button
                type="button"
                onClick={() => addPendingTask()}
                style={{
                  padding: '0.55rem 0.9rem', borderRadius: 8, border: 'none',
                  background: 'rgba(59,130,246,0.2)', color: '#60a5fa', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                }}
              >
                + Add
              </button>
            </div>

            {/* Added Pending Task Badges */}
            {pendingTasks.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {pendingTasks.map((t, idx) => (
                  <span key={idx} style={{
                    fontSize: '0.73rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
                    color: '#93c5fd', padding: '3px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    <span>⏳ {t}</span>
                    <button type="button" onClick={() => removePendingTask(idx)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 4. Problems / Blockers */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              ⚠️ PROBLEMS / BLOCKERS / DELAYS
            </label>
            <textarea
              value={blockers}
              onChange={e => setBlockers(e.target.value)}
              rows={2}
              placeholder="e.g. Couldn't finish API development this week due to schema migration issues..."
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '0.65rem', color: '#f1f5f9', fontSize: '0.82rem', resize: 'vertical', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* 5. Mood Selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              HOW IS THE TEAM FEELING?
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {MOODS.map(m => (
                <button
                  key={m.val}
                  type="button"
                  onClick={() => setMood(m.val)}
                  style={{
                    flex: 1, padding: '0.5rem', borderRadius: 8, cursor: 'pointer',
                    background: mood === m.val ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${mood === m.val ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                    color: mood === m.val ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                    transition: 'all 0.15s', textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '1.1rem' }}>{m.emoji}</div>
                  <div style={{ fontSize: '0.68rem', marginTop: 2, fontWeight: 600 }}>{m.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 6. Optional Comments */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              💬 OPTIONAL COMMENTS / NOTES FOR MENTOR
            </label>
            <textarea
              value={comments}
              onChange={e => setComments(e.target.value)}
              rows={2}
              placeholder="Any additional remarks for your academic mentor..."
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '0.65rem', color: '#f1f5f9', fontSize: '0.82rem', resize: 'vertical', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmitProgress}
            disabled={submitting}
            style={{
              width: '100%', padding: '0.85rem', borderRadius: 10, border: 'none',
              background: submitting ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#3b82f6,#6366f1)',
              color: '#fff', fontWeight: 800, fontSize: '0.88rem', cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)', transition: 'all 0.2s',
            }}
          >
            {submitting ? '⟳ Analyzing Progress & Evaluating Plan...' : '📤 Submit Weekly Update & Analyze Plan'}
          </button>
        </div>

        {/* Right: Progress Updates Log & Plan History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Tab switch between Updates Log and Plan Adjustments */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14, padding: '1.25rem', flex: 1,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f1f5f9' }}>
                📅 Progress & Plan Adjustment History
              </div>
              <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.05)', padding: 3, borderRadius: 8 }}>
                <button
                  onClick={() => setActivePlanTab('comparison')}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                    background: activePlanTab === 'comparison' ? '#3b82f6' : 'transparent', color: '#fff',
                  }}
                >
                  Updates Log
                </button>
                <button
                  onClick={() => setActivePlanTab('history')}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                    background: activePlanTab === 'history' ? '#6366f1' : 'transparent', color: '#fff',
                  }}
                >
                  Plan Changes ({planHistory.length})
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3].map(i => <Skeleton key={i} h={70} r={10} />)}
              </div>
            ) : activePlanTab === 'history' ? (
              /* Plan Adjustments Log */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 480, overflowY: 'auto' }}>
                {planHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: 'rgba(255,255,255,0.35)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔄</div>
                    <div style={{ fontSize: '0.82rem' }}>No automatic plan adjustments yet.</div>
                    <div style={{ fontSize: '0.72rem', marginTop: 4 }}>When delays occur, plan revisions are logged here.</div>
                  </div>
                ) : (
                  planHistory.map((ph, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(99,102,241,0.2)',
                      borderRadius: 10, padding: '0.85rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a5b4fc' }}>
                          Adjustment #{planHistory.length - idx}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>
                          {ph.created_at?.slice(0, 10)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#fca5a5', fontWeight: 600, marginBottom: 4 }}>
                        {ph.message || ph.reason || 'Timeline modified'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        Milestone Shifted: {ph.updated_plan?.affected_milestone || 'In-progress milestone'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Updates Log */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 480, overflowY: 'auto' }}>
                {updates.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: 'rgba(255,255,255,0.35)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
                    <div style={{ fontSize: '0.82rem' }}>No progress updates recorded yet.</div>
                    <div style={{ fontSize: '0.72rem', marginTop: 4 }}>Submit your Week 1 check-in using the form on the left.</div>
                  </div>
                ) : (
                  [...updates].reverse().map((u, idx) => {
                    const moodEmoji = { great: '😄', good: '🙂', okay: '😐', struggling: '😓' }[u.mood] || '🙂';
                    return (
                      <div key={idx} style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 10, padding: '0.85rem',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f1f5f9' }}>
                            Week {u.week_number}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>
                            {u.submitted_at?.slice(0, 10)}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                            <div style={{ width: `${u.progress_pct}%`, height: '100%', background: '#3b82f6', borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#60a5fa' }}>{u.progress_pct}%</span>
                          <span>{moodEmoji}</span>
                        </div>

                        {/* Tasks Summary */}
                        {u.completed_tasks?.length > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#86efac', marginBottom: 3 }}>
                            ✓ {u.completed_tasks.slice(0, 2).join(', ')}{u.completed_tasks.length > 2 ? '…' : ''}
                          </div>
                        )}
                        {u.blockers && u.blockers !== 'None reported' && (
                          <div style={{ fontSize: '0.72rem', color: '#fca5a5', marginTop: 2 }}>
                            ⚠️ {u.blockers}
                          </div>
                        )}
                        {u.plan_adjusted && (
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>
                            → Triggered Plan Adjustment
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════
   TAB: RISK ASSESSMENT (Agent 4)
   ═══════════════════════════════════════════════ */
function RiskTab({ projects, profile, onRiskReportUpdate }) {
  const [selectedProjIdx, setSelectedProjIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const proj = projects[selectedProjIdx];
  const risk = proj?.riskReport;

  const handleRunRisk = async () => {
    if (!proj) return;
    setRunning(true);
    try {
      const report = await fetchRiskAssessment({
        title: proj.title,
        desc: proj.desc || '',
        domain: proj.domain || 'web',
        teamSize: String(proj.teamSize || 3),
        durationDays: parseInt(proj.durationDays) || 30,
        techIdeas: proj.techIdeas || '',
        features: proj.features || [],
        studentSkills: profile?.skills || {},
        feasibilityReport: proj.feasibilityReport || null,
        scopeReport: proj.scopeReport || null,
        techStackReport: proj.techStackReport || null,
      });
      onRiskReportUpdate(selectedProjIdx, report);
      showToast('Risk assessment complete! ⚠️', '✅');
    } catch (err) {
      console.error(err);
      showToast('Risk agent failed. Is backend running?', '❌');
    } finally {
      setRunning(false);
    }
  };

  const impactColor = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' };
  const riskLevelColor = { Low: '#22c55e', Medium: '#f59e0b', High: '#f97316', Critical: '#ef4444' };

  const handleExportAcademicRiskReport = (residualScore, mitigatedCount) => {
    if (!proj || !risk) return;
    const title = proj.title || 'Academic Project';
    const text = [
      `================================================================`,
      `🎓 ACADEMIC PROJECT RISK ASSESSMENT & MITIGATION MATRIX`,
      `Project Title: ${title}`,
      `Generated by: ProjectGuide-AI Risk & Milestone Intelligence Agent`,
      `Initial Risk Score: ${risk.overall_risk_score || 55}/100 (${risk.risk_level || 'Medium'})`,
      `Current Residual Risk Score: ${residualScore}/100`,
      `Mitigated Risks: ${mitigatedCount} of ${(risk.risks || []).length}`,
      `Generated Date: ${new Date().toLocaleDateString()}`,
      `================================================================\n`,
      `1. TOP IDENTIFIED PROJECT BLOCKER:\n${risk.top_blocker || 'N/A'}\n`,
      `2. IMMEDIATE CRITICAL ACTIONS (NEXT 48 HOURS):\n` +
      (risk.immediate_actions || []).map((a, i) => `  [${i + 1}] ${a}`).join('\n') + '\n\n' +
      `3. 3x3 RISK SEVERITY & MITIGATION MATRIX (IEEE / ABET FORMAT):\n` +
      (risk.risks || []).map((r, i) => (
        `[${r.id || `R00${i+1}`}] ${r.title}\n` +
        `  - Category: ${r.category || 'General'} | Impact: ${r.impact} | Probability: ${r.probability} | Severity Score: ${r.severity_score}/100\n` +
        `  - Status: ${(r.status || 'open').toUpperCase()}\n` +
        `  - Failure Mode: ${r.description}\n` +
        `  - Recommended Mitigation Strategy: ${r.mitigation}\n` +
        (r.student_notes ? `  - Student Mitigation Log: ${r.student_notes}\n` : '')
      )).join('\n') + '\n' +
      `4. FACULTY GUIDE SIGN-OFF:\n` +
      `  Faculty Guide Name: __________________________\n` +
      `  Review Status: [ ] Approved   [ ] Revisions Requested\n` +
      `  Signature: __________________   Date: ${new Date().toLocaleDateString()}\n`
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_risk_assessment.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Academic Risk Report downloaded! 📄', '✅');
  };

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.4)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>No projects to assess</div>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            {projects.length > 1 && (
              <select value={selectedProjIdx} onChange={e => setSelectedProjIdx(+e.target.value)}
                style={{ background: '#ffffff', border: '1px solid #c7d2e0', borderRadius: 8, padding: '0.55rem 0.85rem', color: '#0f172a', fontSize: '0.83rem', fontWeight: 600 }}>
                {projects.map((p, i) => <option key={i} value={i}>{p.title}</option>)}
              </select>
            )}
            <button onClick={handleRunRisk} disabled={running} style={{
              padding: '0.6rem 1.25rem', borderRadius: 8, border: 'none',
              background: running ? 'rgba(239,68,68,0.3)' : 'linear-gradient(135deg,#ef4444,#f97316)',
              color: '#fff', fontWeight: 700, fontSize: '0.83rem', cursor: running ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              {running ? '⟳ Analyzing Risks...' : risk ? '🔄 Re-run Risk Agent' : '⚠️ Run Risk Assessment'}
            </button>
          </div>

          {!risk ? (
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.12)',
              borderRadius: 14, padding: '3rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>Risk Assessment Not Run Yet</div>
              <div style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.35)', marginBottom: '1.25rem' }}>
                The Risk Agent (Agent 4) will generate an interactive 3×3 Probability-Impact matrix with concrete failure mode mitigations.
              </div>
              <button onClick={handleRunRisk} disabled={running} style={{
                padding: '0.75rem 1.75rem', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff',
                fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
              }}>
                {running ? '⟳ Running Agent...' : '▶ Start Risk Assessment'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Interactive 3x3 Heatmap Matrix & Mitigation Console */}
              <RiskHeatmapMatrix
                project={proj}
                riskReport={risk}
                onUpdateRiskReport={(updated) => onRiskReportUpdate(selectedProjIdx, updated)}
                onExportReport={handleExportAcademicRiskReport}
              />

              {/* Immediate Actions Banner */}
              {risk.immediate_actions?.length > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(99,102,241,0.05) 100%)',
                  border: '1px solid rgba(59,130,246,0.25)',
                  borderRadius: 14,
                  padding: '1.1rem 1.25rem'
                }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#60a5fa', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>⚡</span> Critical 48-Hour Execution Actions:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                    {risk.immediate_actions.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.82rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.25)', padding: '0.65rem 0.8rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ color: '#38bdf8', fontWeight: 800, flexShrink: 0 }}>#{i + 1}</span>
                        <span>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TAB: REPORTS (document generation)
   ═══════════════════════════════════════════════ */
function ReportsTab({ projects, profile }) {
  const [selectedProjIdx, setSelectedProjIdx] = useState(0);
  const [generating, setGenerating] = useState(null);
  const [generatedDocs, setGeneratedDocs] = useState({});
  const [activeDoc, setActiveDoc] = useState(null);
  const [checkIns, setCheckIns] = useState([]);

  const proj = projects[selectedProjIdx];

  useEffect(() => {
    if (!proj) return;
    const user = Store.get('currentUser');
    if (!user?.email) return;
    fetchCheckIns(user.email, proj.idea_id || proj.id).then(d => setCheckIns(Array.isArray(d) ? d : [])).catch(() => setCheckIns([]));
  }, [selectedProjIdx]);

  const DOC_TYPES = [
    { id: 'synopsis', icon: '📄', label: 'Project Synopsis', desc: 'Formal overview with abstract, objectives, and scope', color: '#4f46e5' },
    { id: 'methodology', icon: '⚙️', label: 'Methodology Report', desc: 'Technical approach, phases, tools, and testing strategy', color: '#0891b2' },
    { id: 'progress_report', icon: '📊', label: 'Progress Report', desc: 'Current status with check-in history and risk summary', color: '#16a34a' },
  ];

  const handleGenerate = async (docType) => {
    if (!proj) return;
    setGenerating(docType);
    try {
      const user = Store.get('currentUser');
      const payload = {
        doc_type: docType,
        idea_data: { title: proj.title, desc: proj.desc, domain: proj.domain, teamSize: proj.teamSize, durationDays: proj.durationDays },
        student_info: profile || {},
        feasibility_report: proj.feasibilityReport || {},
        scope_report: proj.scopeReport || {},
        tech_stack_report: proj.techStackReport || {},
        risk_report: proj.riskReport || {},
        check_ins: checkIns,
      };
      const doc = await generateDocument(payload);
      if (doc.error) throw new Error(doc.error);
      setGeneratedDocs(prev => ({ ...prev, [`${selectedProjIdx}_${docType}`]: doc }));
      setActiveDoc(docType);
      showToast('Document generated! 📄', '✅');
    } catch (err) {
      console.error(err);
      showToast('Document generation failed. Backend running?', '❌');
    } finally {
      setGenerating(null);
    }
  };

  const renderDoc = (doc) => {
    if (!doc) return null;
    const dt = doc.doc_type;

    /* Reusable style helpers */
    const SectionHeader = ({ children, color = '#4f46e5' }) => (
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 20, paddingBottom: 6, borderBottom: `2px solid ${color}20` }}>
        {children}
      </div>
    );
    const Badge = ({ text, color = '#4f46e5' }) => (
      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: `${color}12`, color, border: `1px solid ${color}30` }}>{text}</span>
    );
    const BulletList = ({ items, color = '#4f46e5' }) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(items || []).map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, fontSize: '0.83rem', color: '#334155', lineHeight: 1.6 }}>
            <span style={{ color, flexShrink: 0 }}>▸</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    );

    if (dt === 'synopsis') {
      const s = doc.sections || {};
      return (
        <div>
          {/* Document Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '1.5rem', background: 'linear-gradient(135deg,#f8faff,#f0f4ff)', borderRadius: 12, border: '1px solid rgba(79,70,229,0.12)' }}>
            <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Academic Project Synopsis</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>{doc.title}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{doc.subtitle}</div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Badge text={`Domain: ${(proj?.domain || 'Web').toUpperCase()}`} color="#4f46e5" />
              <Badge text={`Team: ${proj?.teamSize || 3} members`} color="#0891b2" />
              <Badge text={`Duration: ${Math.round((proj?.durationDays || 30)/7)} weeks`} color="#16a34a" />
            </div>
          </div>
          {[
            { label: 'Abstract', content: s.abstract, color: '#4f46e5' },
            { label: 'Introduction', content: s.introduction, color: '#0891b2' },
            { label: 'Project Scope', content: s.scope, color: '#7c3aed' },
            { label: 'Methodology Overview', content: s.methodology_overview, color: '#d97706' },
            { label: 'Conclusion', content: s.conclusion, color: '#16a34a' },
          ].filter(x => x.content).map((sec, i) => (
            <div key={i}>
              <SectionHeader color={sec.color}>{sec.label}</SectionHeader>
              <p style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.8, textAlign: 'justify', marginBottom: 4 }}>{sec.content}</p>
            </div>
          ))}
          {s.objectives?.length > 0 && (<div><SectionHeader color="#4f46e5">Objectives</SectionHeader><BulletList items={s.objectives} color="#4f46e5" /></div>)}
          {s.expected_outcomes?.length > 0 && (<div><SectionHeader color="#16a34a">Expected Outcomes</SectionHeader><BulletList items={s.expected_outcomes} color="#16a34a" /></div>)}
        </div>
      );
    }

    if (dt === 'methodology') {
      return (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '1.25rem', background: 'linear-gradient(135deg,#f0fbff,#e6f7fc)', borderRadius: 12, border: '1px solid rgba(8,145,178,0.15)' }}>
            <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Methodology Report</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>{doc.title}</div>
            <Badge text={`Model: ${doc.development_model || 'Agile'}`} color="#0891b2" />
          </div>
          {(doc.phases || []).map((phase, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 10, padding: '1rem', marginBottom: '0.6rem', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>{phase.phase}</div>
                </div>
                <Badge text={phase.duration} color="#4f46e5" />
              </div>
              {phase.activities?.length > 0 && (<div style={{ marginLeft: 36, marginBottom: 8 }}><BulletList items={phase.activities} color="#64748b" /></div>)}
              {phase.deliverable && (
                <div style={{ marginLeft: 36, background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 6, padding: '5px 10px', fontSize: '0.76rem', color: '#16a34a', fontWeight: 600 }}>
                  📦 Deliverable: {phase.deliverable}
                </div>
              )}
            </div>
          ))}
          {doc.tools_and_technologies?.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <SectionHeader color="#0891b2">Tools & Technologies</SectionHeader>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {doc.tools_and_technologies.map((t, i) => (<span key={i} style={{ fontSize: '0.78rem', padding: '4px 12px', borderRadius: 99, background: 'rgba(8,145,178,0.08)', color: '#0891b2', border: '1px solid rgba(8,145,178,0.2)', fontWeight: 600 }}>{t}</span>))}
              </div>
            </div>
          )}
        </div>
      );
    }


    if (dt === 'progress_report') {
      const statusConfig = {
        on_track: { label: 'On Track', color: '#16a34a' },
        slightly_behind: { label: 'Slightly Behind', color: '#d97706' },
        at_risk: { label: 'At Risk', color: '#dc2626' },
        completed: { label: 'Completed', color: '#4f46e5' },
      };
      const sc = statusConfig[doc.status] || statusConfig.on_track;
      return (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '1.25rem', background: 'linear-gradient(135deg,#f0fdf4,#e8f8ef)', borderRadius: 12, border: '1px solid rgba(22,163,74,0.15)' }}>
            <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Progress Report</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>{doc.title}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 12 }}>Generated: {doc.generated_at?.slice(0, 10) || new Date().toLocaleDateString()}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#4f46e5' }}>{doc.overall_progress}%</div>
                <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>Overall Progress</div>
              </div>
              <div style={{ width: 1, background: '#e2e8f0' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>{doc.total_check_ins}</div>
                <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>Check-ins Done</div>
              </div>
              <div style={{ width: 1, background: '#e2e8f0' }} />
              <div style={{ textAlign: 'center', paddingTop: 6 }}>
                <Badge text={sc.label} color={sc.color} />
                <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600, marginTop: 6 }}>Status</div>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ background: '#e2e8f0', borderRadius: 99, height: 10, overflow: 'hidden', marginBottom: '1.25rem' }}>
            <div style={{ width: `${doc.overall_progress || 0}%`, height: '100%', background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', borderRadius: 99, transition: 'width 0.6s' }} />
          </div>
          {doc.executive_summary && (
            <div style={{ marginBottom: '1rem' }}>
              <SectionHeader color="#4f46e5">Executive Summary</SectionHeader>
              <p style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.8, background: '#f8fafc', padding: '0.85rem', borderRadius: 8, border: '1px solid rgba(15,23,42,0.06)' }}>{doc.executive_summary}</p>
            </div>
          )}
          {doc.weekly_progress?.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <SectionHeader color="#0891b2">Weekly Breakdown</SectionHeader>
              <div style={{ border: '1px solid rgba(15,23,42,0.08)', borderRadius: 10, overflow: 'hidden' }}>
                {doc.weekly_progress.map((w, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: i < doc.weekly_progress.length - 1 ? '1px solid #f1f5f9' : 'none', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, width: 54, flexShrink: 0 }}>Week {w.week}</span>
                    <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 99, height: 7, overflow: 'hidden' }}>
                      <div style={{ width: `${w.progress}%`, height: '100%', background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5', width: 38, textAlign: 'right', flexShrink: 0 }}>{w.progress}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    return <div style={{ color: '#64748b', fontSize: '0.83rem', textAlign: 'center', padding: '2rem' }}>Document rendered successfully.</div>;
  };

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b', background: '#fff', borderRadius: 16, border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>No projects yet</div>
          <div style={{ fontSize: '0.85rem', marginTop: 6 }}>Submit a project idea to start generating reports.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
          {/* Left: Document selector */}
          <div>
            {projects.length > 1 && (
              <div style={{ marginBottom: '1rem' }}>
                <select value={selectedProjIdx} onChange={e => setSelectedProjIdx(+e.target.value)}
                  style={{ background: '#fff', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 8, padding: '0.6rem 0.9rem', color: '#0f172a', fontSize: '0.83rem', width: '100%' }}>
                  {projects.map((p, i) => <option key={i} value={i}>{p.title}</option>)}
                </select>
              </div>
            )}

            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>Available Documents</div>

            {DOC_TYPES.map(dt => {
              const key = `${selectedProjIdx}_${dt.id}`;
              const hasDoc = !!generatedDocs[key];
              const isActive = activeDoc === dt.id;
              const isGenerating = generating === dt.id;

              return (
                <div key={dt.id} style={{
                  background: isActive ? `${dt.color}08` : '#fff',
                  border: `1px solid ${isActive ? `${dt.color}30` : 'rgba(15,23,42,0.08)'}`,
                  borderRadius: 12, padding: '1rem', marginBottom: '0.6rem', cursor: 'pointer',
                  transition: 'all 0.18s', boxShadow: isActive ? `0 4px 16px ${dt.color}15` : '0 1px 4px rgba(15,23,42,0.05)',
                }} onClick={() => hasDoc && setActiveDoc(dt.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: '1.2rem' }}>{dt.icon}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{dt.label}</span>
                        {hasDoc && <span style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 700 }}>✓ Ready</span>}
                      </div>
                      <div style={{ fontSize: '0.73rem', color: '#64748b', paddingLeft: 28 }}>{dt.desc}</div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleGenerate(dt.id); }}
                      disabled={isGenerating}
                      style={{
                        padding: '0.4rem 0.8rem', borderRadius: 7, border: 'none',
                        background: `${dt.color}15`,
                        color: dt.color, fontSize: '0.7rem', fontWeight: 700,
                        cursor: isGenerating ? 'not-allowed' : 'pointer', flexShrink: 0, marginLeft: 8,
                        opacity: isGenerating ? 0.6 : 1,
                      }}>
                      {isGenerating ? '⟳' : hasDoc ? '↻ Regen' : '▶ Generate'}
                    </button>
                  </div>
                </div>
              );
            })}

            {activeDoc && generatedDocs[`${selectedProjIdx}_${activeDoc}`] && (
              <div style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.15)', borderRadius: 10, padding: '0.75rem', fontSize: '0.72rem', color: '#16a34a' }}>
                💡 <strong>To save:</strong> Right-click → Print → Save as PDF
              </div>
            )}
          </div>

          {/* Right: Document viewer */}
          <div style={{
            background: '#fff', border: '1px solid rgba(15,23,42,0.08)',
            borderRadius: 16, padding: '1.75rem', maxHeight: 720, overflowY: 'auto',
            boxShadow: '0 4px 24px rgba(15,23,42,0.07)',
          }}>
            {!activeDoc || !generatedDocs[`${selectedProjIdx}_${activeDoc}`] ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#94a3b8' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📄</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>No Document Selected</div>
                <div style={{ fontSize: '0.83rem' }}>Select a document type on the left and click <strong>Generate</strong> to create it with AI</div>
              </div>
            ) : (
              renderDoc(generatedDocs[`${selectedProjIdx}_${activeDoc}`])
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TAB: ENHANCED REPORTS (MongoDB-backed, auto-context)
   ═══════════════════════════════════════════════ */
function EnhancedReportsTab({ projects, profile }) {
  const [selectedProjIdx, setSelectedProjIdx] = useState(0);
  const [generating, setGenerating] = useState(null);   // 'synopsis'|'methodology'|'progress_report'
  const [activeDocs, setActiveDocs] = useState({});     // { synopsis: {...}, methodology: {...}, progress_report: {...} }
  const [activeView, setActiveView] = useState(null);   // which doc is open
  const [savedDocs, setSavedDocs] = useState([]);       // docs from MongoDB
  const [planHistory, setPlanHistory] = useState([]);
  const [showPlanHistory, setShowPlanHistory] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const proj = projects[selectedProjIdx];

  /* Load saved documents and plan history when project changes */
  useEffect(() => {
    if (!proj) return;
    const projId = proj.idea_id || proj.id || '';
    if (!projId) return;
    setLoadingDocs(true);
    Promise.all([
      fetchProjectDocuments(projId).catch(() => ({ documents: [] })),
      fetchPlanHistory(projId).catch(() => ({ history: [] })),
    ]).then(([docsRes, planRes]) => {
      setSavedDocs(docsRes.documents || []);
      setPlanHistory(planRes.history || []);
      // Pre-populate activeDocs with saved versions
      const byType = {};
      (docsRes.documents || []).forEach(d => { byType[d.doc_type] = d.document; });
      setActiveDocs(byType);
    }).finally(() => setLoadingDocs(false));
  }, [selectedProjIdx, proj?.id]);

  const DOC_TYPES = [
    { id: 'synopsis', icon: '📄', label: 'Project Synopsis', desc: 'Formal overview: abstract, objectives, scope', color: '#4f46e5', fn: generateSynopsis },
    { id: 'methodology', icon: '⚙️', label: 'Methodology Report', desc: 'Technical phases, tools, testing strategy', color: '#0891b2', fn: generateMethodology },
    { id: 'progress_report', icon: '📊', label: 'Progress Report', desc: 'Weekly check-ins, milestone status, risks', color: '#16a34a', fn: generateProgressReport },
  ];

  const handleGenerate = async (dt) => {
    if (!proj) return;
    const user = Store.get('currentUser');
    setGenerating(dt.id);
    try {
      const projId = proj.idea_id || proj.id || '';
      const payload = {
        project_id: projId,
        student_email: user?.email || '',
        idea_data: {
          title: proj.title,
          desc: proj.desc,
          domain: proj.domain,
          teamSize: proj.teamSize || proj.team_size,
          durationDays: proj.durationDays || proj.duration_days,
          techIdeas: proj.techIdeas || proj.tech_ideas,
          features: proj.features || [],
          milestones: proj.trackingReport?.milestones || proj.milestones || [],
        },
        student_info: profile || {},
        feasibility_report: proj.feasibilityReport || {},
        scope_report: proj.scopeReport || {},
        tech_stack_report: proj.techStackReport || {},
        risk_report: proj.riskReport || {},
      };
      const res = await dt.fn(payload);
      if (res.error) throw new Error(res.error);
      const doc = res.document || res;
      setActiveDocs(prev => ({ ...prev, [dt.id]: doc }));
      setActiveView(dt.id);
      setSavedDocs(prev => {
        const filtered = prev.filter(d => d.doc_type !== dt.id);
        return [{ doc_type: dt.id, document: doc, generated_at: new Date().toISOString() }, ...filtered];
      });
      showToast(`${dt.label} generated! 📄`, '✅');
    } catch (err) {
      console.error(err);
      showToast(`Generation failed: ${err.message}`, '❌');
    } finally {
      setGenerating(null);
    }
  };

  /* Markdown-style document renderer */
  const renderDoc = (doc) => {
    if (!doc) return null;
    const dt = doc.doc_type;

    const SH = ({ children, color = '#4f46e5' }) => (
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 20, paddingBottom: 6, borderBottom: `2px solid ${color}20` }}>
        {children}
      </div>
    );
    const Badge = ({ text, color = '#4f46e5' }) => (
      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: `${color}12`, color, border: `1px solid ${color}30` }}>{text}</span>
    );
    const BL = ({ items, color = '#4f46e5' }) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(items || []).map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, fontSize: '0.83rem', color: '#334155', lineHeight: 1.6 }}>
            <span style={{ color, flexShrink: 0 }}>▸</span><span>{item}</span>
          </div>
        ))}
      </div>
    );

    if (dt === 'synopsis') {
      const s = doc.sections || {};
      return (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '1.5rem', background: 'linear-gradient(135deg,#f8faff,#f0f4ff)', borderRadius: 12, border: '1px solid rgba(79,70,229,0.12)' }}>
            <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Academic Project Synopsis</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>{doc.title}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{doc.subtitle}</div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Badge text={`Domain: ${(proj?.domain || 'Web').toUpperCase()}`} color="#4f46e5" />
              <Badge text={`Team: ${proj?.teamSize || 3} members`} color="#0891b2" />
              <Badge text={`Duration: ${Math.round((proj?.durationDays || 30)/7)} weeks`} color="#16a34a" />
            </div>
          </div>
          {[
            { label: 'Abstract', content: s.abstract, color: '#4f46e5' },
            { label: 'Introduction', content: s.introduction, color: '#0891b2' },
            { label: 'Project Scope', content: s.scope, color: '#7c3aed' },
            { label: 'Methodology Overview', content: s.methodology_overview, color: '#d97706' },
            { label: 'Conclusion', content: s.conclusion, color: '#16a34a' },
          ].filter(x => x.content).map((sec, i) => (
            <div key={i}><SH color={sec.color}>{sec.label}</SH><p style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.8, textAlign: 'justify' }}>{sec.content}</p></div>
          ))}
          {s.objectives?.length > 0 && <div><SH color="#4f46e5">Objectives</SH><BL items={s.objectives} color="#4f46e5" /></div>}
          {s.expected_outcomes?.length > 0 && <div><SH color="#16a34a">Expected Outcomes</SH><BL items={s.expected_outcomes} color="#16a34a" /></div>}
        </div>
      );
    }

    if (dt === 'methodology') {
      return (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '1.25rem', background: 'linear-gradient(135deg,#f0fbff,#e6f7fc)', borderRadius: 12, border: '1px solid rgba(8,145,178,0.15)' }}>
            <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#0891b2', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Methodology Report</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>{doc.title}</div>
            <Badge text={`Model: ${doc.development_model || 'Agile'}`} color="#0891b2" />
          </div>
          {(doc.phases || []).map((phase, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 10, padding: '1rem', marginBottom: '0.6rem', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>{phase.phase}</div>
                </div>
                <Badge text={phase.duration} color="#4f46e5" />
              </div>
              {phase.activities?.length > 0 && <div style={{ marginLeft: 36, marginBottom: 8 }}><BL items={phase.activities} color="#64748b" /></div>}
              {phase.deliverable && (
                <div style={{ marginLeft: 36, background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 6, padding: '5px 10px', fontSize: '0.76rem', color: '#16a34a', fontWeight: 600 }}>
                  📦 Deliverable: {phase.deliverable}
                </div>
              )}
            </div>
          ))}
          {doc.tools_and_technologies?.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <SH color="#0891b2">Tools & Technologies</SH>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {doc.tools_and_technologies.map((t, i) => <span key={i} style={{ fontSize: '0.78rem', padding: '4px 12px', borderRadius: 99, background: 'rgba(8,145,178,0.08)', color: '#0891b2', border: '1px solid rgba(8,145,178,0.2)', fontWeight: 600 }}>{t}</span>)}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (dt === 'progress_report') {
      return (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '1.25rem', background: 'linear-gradient(135deg,#f0fdf4,#e8f8ef)', borderRadius: 12, border: '1px solid rgba(22,163,74,0.15)' }}>
            <div style={{ fontSize: '0.63rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Progress Report</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>{doc.title}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#4f46e5' }}>{doc.overall_progress}%</div>
                <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>Overall Progress</div>
              </div>
              <div style={{ width: 1, background: '#e2e8f0' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>{doc.total_check_ins || 0}</div>
                <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>Check-ins Done</div>
              </div>
            </div>
          </div>
          {doc.executive_summary && <div><SH color="#16a34a">Executive Summary</SH><p style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.8 }}>{doc.executive_summary}</p></div>}
          {doc.weekly_progress?.length > 0 && (
            <div><SH color="#0891b2">Weekly Progress</SH>
              {doc.weekly_progress.map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, width: 50, flexShrink: 0, color: '#64748b' }}>Week {w.week}</span>
                  <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${w.progress}%`, height: '100%', background: w.progress >= 70 ? '#16a34a' : w.progress >= 40 ? '#f59e0b' : '#ef4444', borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', width: 36, textAlign: 'right' }}>{w.progress}%</span>
                  <span style={{ fontSize: '0.7rem' }}>{w.mood === 'great' ? '😄' : w.mood === 'good' ? '🙂' : w.mood === 'okay' ? '😐' : '😓'}</span>
                </div>
              ))}
            </div>
          )}
          {doc.top_risks?.length > 0 && <div><SH color="#dc2626">Identified Risks</SH><BL items={doc.top_risks} color="#dc2626" /></div>}
          {doc.next_steps?.length > 0 && <div><SH color="#4f46e5">Next Steps</SH><BL items={doc.next_steps} color="#4f46e5" /></div>}
        </div>
      );
    }

    return <div style={{ color: '#64748b', padding: '2rem', textAlign: 'center' }}>Document rendered.</div>;
  };

  if (projects.length === 0) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>No Projects Found</div>
        <div style={{ fontSize: '0.85rem', marginTop: 6 }}>Submit a project idea first to generate documents.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9' }}>📋 Document Generation</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>AI-generated academic documents using your actual project data</div>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          {projects.length > 1 && (
            <select value={selectedProjIdx} onChange={e => { setSelectedProjIdx(+e.target.value); setActiveView(null); }}
              style={{ background: '#ffffff', border: '1px solid #c7d2e0', borderRadius: 8, padding: '0.4rem 0.75rem', color: '#0f172a', fontSize: '0.82rem' }}>
              {projects.map((p, i) => <option key={i} value={i}>{p.title}</option>)}
            </select>
          )}
          {planHistory.length > 0 && (
            <button onClick={() => setShowPlanHistory(!showPlanHistory)}
              style={{ padding: '0.4rem 0.9rem', borderRadius: 8, border: '1px solid rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
              📜 Plan History ({planHistory.length})
            </button>
          )}
        </div>
      </div>

      {/* Plan History Panel */}
      {showPlanHistory && planHistory.length > 0 && (
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', marginBottom: '1rem' }}>📜 Plan Adjustment History</div>
          {planHistory.map((h, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '1rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>← Previous Plan</div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                    {h.original_plan_snapshot?.timeline_adjustment || h.reason || 'Original plan'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#4ade80', marginBottom: 6, textTransform: 'uppercase' }}>→ Updated Plan</div>
                  <div style={{ fontSize: '0.78rem', color: '#86efac', lineHeight: 1.5 }}>
                    {h.updated_plan?.timeline_adjustment || 'Plan adjusted'}
                  </div>
                  {h.updated_plan?.affected_milestone && (
                    <div style={{ fontSize: '0.72rem', color: '#fbbf24', marginTop: 4 }}>
                      ⚠️ Affected: {h.updated_plan.affected_milestone}
                    </div>
                  )}
                  {h.updated_plan?.recommended_action && (
                    <div style={{ fontSize: '0.72rem', color: '#60a5fa', marginTop: 4 }}>
                      ✅ Action: {h.updated_plan.recommended_action}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
                {h.created_at ? new Date(h.created_at).toLocaleString() : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
        {/* Left: document type list */}
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Document Types</div>
          {DOC_TYPES.map(dt => {
            const hasDoc = !!activeDocs[dt.id];
            const isGenerating = generating === dt.id;
            const savedVersion = savedDocs.find(d => d.doc_type === dt.id);
            return (
              <div key={dt.id}
                onClick={() => hasDoc && setActiveView(dt.id)}
                style={{
                  background: activeView === dt.id ? `${dt.color}12` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${activeView === dt.id ? dt.color + '40' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 12, padding: '1rem', marginBottom: '0.6rem', cursor: hasDoc ? 'pointer' : 'default',
                  transition: 'all 0.18s',
                }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{dt.icon}</span>
                    <div>
                      <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>{dt.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>{dt.desc}</div>
                      {savedVersion && (
                        <div style={{ fontSize: '0.63rem', color: dt.color, marginTop: 4 }}>
                          ✓ Saved {savedVersion.generated_at?.slice(0, 10) || ''}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleGenerate(dt); }}
                    disabled={isGenerating}
                    style={{
                      padding: '4px 10px', borderRadius: 7, border: `1px solid ${dt.color}40`,
                      background: `${dt.color}12`, color: dt.color, fontSize: '0.7rem', fontWeight: 700,
                      cursor: isGenerating ? 'not-allowed' : 'pointer', flexShrink: 0, marginLeft: 8,
                      opacity: isGenerating ? 0.6 : 1,
                    }}>
                    {isGenerating ? '⟳' : hasDoc ? '↻ Regen' : '▶ Generate'}
                  </button>
                </div>
              </div>
            );
          })}

          {planHistory.length === 0 && (
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginTop: '0.5rem' }}>
              💡 Submit a weekly progress update to trigger automatic plan adjustment tracking.
            </div>
          )}
        </div>

        {/* Right: document viewer */}
        <div style={{ background: '#fff', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 16, padding: '1.75rem', maxHeight: 720, overflowY: 'auto', boxShadow: '0 4px 24px rgba(15,23,42,0.07)' }}>
          {!activeView || !activeDocs[activeView] ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#94a3b8' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📄</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>No Document Selected</div>
              <div style={{ fontSize: '0.83rem' }}>Click <strong>Generate</strong> on any document type to create it with AI using your project data.</div>
            </div>
          ) : (
            renderDoc(activeDocs[activeView])
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN: StudentDashboard (sidebar layout)
   ═══════════════════════════════════════════════ */
export default function StudentDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  // Agent states
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [analyzingProjectTitle, setAnalyzingProjectTitle] = useState(null);

  const [selectedScopeReport, setSelectedScopeReport] = useState(null);
  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
  const [scopingProjectTitle, setScopingProjectTitle] = useState(null);

  const [selectedTechStackReport, setSelectedTechStackReport] = useState(null);
  const [isTechStackModalOpen, setIsTechStackModalOpen] = useState(false);
  const [techStackingProjectTitle, setTechStackingProjectTitle] = useState(null);

  const [selectedTrackingReport, setSelectedTrackingReport] = useState(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingProjectTitle, setTrackingProjectTitle] = useState(null);

  // Idea form state
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDesc, setIdeaDesc] = useState('');
  const [ideaDomain, setIdeaDomain] = useState('web');
  const [ideaDuration, setIdeaDuration] = useState('4');
  const [ideaTeamSize, setIdeaTeamSize] = useState('3');
  const [ideaTechIdeas, setIdeaTechIdeas] = useState('');
  const [ideaRefLink, setIdeaRefLink] = useState('');
  const [ideaFeatures, setIdeaFeatures] = useState([]);
  const [featureInput, setFeatureInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [durationMode, setDurationMode] = useState('weeks');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const [avatar, setAvatar] = useState(null);

  const updateStats = (projs = []) => {};

  const loadProjects = async (forcedEmail = null) => {
    const user = Store.get('currentUser');
    const email = (forcedEmail || user?.email || '').trim().toLowerCase();
    if (!email) return;

    let userProjs = Store.getUserProjects(email);
    setProjects(userProjs);

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
          feasibility: item.feasibility || item.feasibility_score || (item.feasibilityReport ? item.feasibilityReport.overallScore : null),
          feasibilityReport: item.feasibilityReport || item.feasibility_report || null,
          scopeReport: item.scopeReport || item.scope_report || null,
          techStackReport: item.techStackReport || null,
          trackingReport: item.trackingReport || null,
          status: item.status || 'pending_review',
          submittedAt: item.created_at || item.submittedAt || new Date().toISOString(),
        }));

        const latestLocal = Store.getUserProjects(email) || [];
        const combined = [...mapped];

        // Enrich with local reports and files if any
        for (let i = 0; i < combined.length; i++) {
          const rm = combined[i];
          const localMatch = latestLocal.find(lp => (lp.id && lp.id === rm.id) || lp.title === rm.title);
          if (localMatch) {
            combined[i] = {
              ...rm,
              rawFiles: localMatch.rawFiles || rm.uploadedFiles,
              feasibilityReport: rm.feasibilityReport || localMatch.feasibilityReport,
              scopeReport: rm.scopeReport || localMatch.scopeReport,
              techStackReport: rm.techStackReport || localMatch.techStackReport,
              trackingReport: rm.trackingReport || localMatch.trackingReport,
              riskReport: localMatch.riskReport || rm.riskReport,
              checkIns: localMatch.checkIns || rm.checkIns,
              feasibility: rm.feasibility || localMatch.feasibility,
            };
          }
        }

        // Keep local projects that haven't been synced to remote yet
        for (const lp of latestLocal) {
          if (!combined.some(c => (c.id && c.id === lp.id) || c.title === lp.title)) {
            combined.unshift(lp);
          }
        }

        setProjects(combined);
        Store.setUserProjects(email, combined);
      }
    } catch (err) {
      console.log('Backend fetch:', err);
    }
  };

  useEffect(() => {
    const user = Store.get('currentUser');
    if (!user || !user.loggedIn) { navigate('/login'); return; }
    let p = Store.get('profile');
    if (!p) {
      const parts = (user.name || '').split(' ');
      p = {
        name: user.name || 'Student',
        firstName: parts[0] || user.firstName || 'Student',
        lastName: parts.slice(1).join(' ') || user.lastName || '',
        email: user.email,
        rollNo: user.rollNo || '21CS101',
        branch: user.branch || 'Computer Science & Engineering',
        year: user.year || '3rd Year',
        skills: user.skills || {},
        domains: user.domains || ['web'],
        aboutMe: user.aboutMe || '',
        teamSize: user.teamSize || '3',
        hasCompletedProfile: true,
      };
      Store.set('profile', p);
    }
    setProfile(p);
    if (p.domains?.length > 0) setIdeaDomain(p.domains[0]);
    if (p.teamSize) setIdeaTeamSize(p.teamSize);

    const storedAvatar = Store.get('avatarDataUrl') || p?.avatar || user.avatar;
    if (storedAvatar) setAvatar(storedAvatar);
    loadProjects(user.email);
  }, [navigate]);

  /* ── Agent handlers (reused from original) ── */
  const handleCheckFeasibility = async (proj, pIndex = null) => {
    const user = Store.get('currentUser');
    const email = user?.email;
    setAnalyzingProjectTitle(proj.title);
    try {
      const filesRaw = proj.rawFiles || proj.uploadedFiles || [];
      const filesToSend = [];
      for (const f of filesRaw) {
        if (f.dataUrl) { const b64 = f.dataUrl.split(',')[1] || ''; filesToSend.push({ name: f.name, contentBase64: b64, contentType: f.type }); }
      }
      const report = await fetchFeasibilityReport({ title: proj.title || 'Academic Project', desc: proj.desc || '', domain: (proj.domain || 'web').toLowerCase(), teamSize: String(proj.teamSize || 3), durationDays: parseInt(proj.durationDays) || 30, techIdeas: proj.techIdeas || '', features: proj.features || [], studentSkills: profile?.skills || {}, uploadedFiles: filesToSend });
      let currentProjs = email ? Store.getUserProjects(email) : [...projects];
      let targetIdx = pIndex;
      if (targetIdx === null) targetIdx = currentProjs.findIndex(p => p.title === proj.title || (p.id && p.id === proj.id));
      const updatedProj = { ...proj, feasibility: report.overallScore, feasibilityReport: report, status: 'reviewed', submittedAt: proj.submittedAt || new Date().toISOString() };
      if (targetIdx !== -1 && targetIdx !== null && currentProjs[targetIdx]) currentProjs[targetIdx] = { ...currentProjs[targetIdx], ...updatedProj };
      else currentProjs.unshift(updatedProj);
      if (email) Store.setUserProjects(email, currentProjs);
      setProjects(currentProjs);
      const ideaId = updatedProj.id || updatedProj.idea_id;
      if (ideaId) updateIdeaInBackend(ideaId, { feasibility: report.overallScore, feasibilityReport: report, status: 'reviewed' }).catch(() => {});
      setSelectedReport(report); setSelectedProject(updatedProj); setIsReportModalOpen(true);
    } catch (err) { showToast('Feasibility agent failed. Backend running?', '❌'); }
    finally { setAnalyzingProjectTitle(null); }
  };

  const handleRunScope = async (proj, pIndex = null) => {
    const user = Store.get('currentUser');
    const email = user?.email;
    setScopingProjectTitle(proj.title);
    try {
      const filesRaw = proj.rawFiles || proj.uploadedFiles || [];
      const filesToSend = [];
      for (const f of filesRaw) { if (f.dataUrl) { const b64 = f.dataUrl.split(',')[1] || ''; filesToSend.push({ name: f.name, contentBase64: b64, contentType: f.type }); } }
      const feasReport = proj.feasibilityReport || null;
      const rawScopeReport = await fetchScopeReport({ idea_id: proj.id || proj.idea_id || '', student_email: email || '', title: proj.title || 'Academic Project', desc: proj.desc || '', domain: (proj.domain || 'web').toLowerCase(), teamSize: String(proj.teamSize || 3), durationDays: parseInt(proj.durationDays) || 30, techIdeas: proj.techIdeas || '', features: proj.features || [], studentSkills: profile?.skills || {}, uploadedFiles: filesToSend, feasibilityReport: feasReport });
      const chainedFeasReport = rawScopeReport.feasibilityReport || feasReport;
      const scopeReport = { ...rawScopeReport, feasibilityReport: chainedFeasReport };
      let currentProjs = email ? Store.getUserProjects(email) : [...projects];
      let targetIdx = pIndex;
      if (targetIdx === null) targetIdx = currentProjs.findIndex(p => p.title === proj.title || (p.id && p.id === proj.id));
      if (targetIdx !== -1 && targetIdx !== null && currentProjs[targetIdx]) currentProjs[targetIdx] = { ...currentProjs[targetIdx], scopeReport, feasibilityReport: currentProjs[targetIdx].feasibilityReport || chainedFeasReport, feasibility: currentProjs[targetIdx].feasibility || (chainedFeasReport ? chainedFeasReport.overallScore : null) };
      if (email) Store.setUserProjects(email, currentProjs);
      setProjects(currentProjs);
      const ideaId = proj.id || proj.idea_id;
      if (ideaId) { const payload = { scopeReport }; if (chainedFeasReport && !proj.feasibilityReport) { payload.feasibilityReport = chainedFeasReport; payload.feasibility = chainedFeasReport.overallScore; payload.status = 'reviewed'; } updateIdeaInBackend(ideaId, payload).catch(() => {}); }
      setSelectedScopeReport(scopeReport); setSelectedProject(proj); setIsScopeModalOpen(true);
    } catch (err) { showToast('Scope agent failed. Backend running?', '❌'); }
    finally { setScopingProjectTitle(null); }
  };

  const handleRunTechStack = async (proj, pIndex = null) => {
    if (!proj.feasibilityReport) { showToast('Run Feasibility Agent first (Agent 1 required)', '⚠️'); return; }
    if (!proj.scopeReport) { showToast('Run Scope Agent first (Agent 2 required)', '⚠️'); return; }
    const user = Store.get('currentUser');
    const email = user?.email;
    setTechStackingProjectTitle(proj.title);
    try {
      const chainedFeasReport = proj.scopeReport?.feasibilityReport || proj.feasibilityReport;
      const techStackReport = await fetchTechStackReport({ title: proj.title || 'Academic Project', desc: proj.desc || '', domain: (proj.domain || 'web').toLowerCase(), teamSize: String(proj.teamSize || 3), durationDays: parseInt(proj.durationDays) || 30, techIdeas: proj.techIdeas || '', features: proj.features || [], studentSkills: profile?.skills || {}, feasibilityReport: chainedFeasReport, scopeReport: proj.scopeReport });
      let currentProjs = email ? Store.getUserProjects(email) : [...projects];
      let targetIdx = pIndex;
      if (targetIdx === null) targetIdx = currentProjs.findIndex(p => p.title === proj.title || (p.id && p.id === proj.id));
      if (targetIdx !== -1 && targetIdx !== null && currentProjs[targetIdx]) currentProjs[targetIdx] = { ...currentProjs[targetIdx], techStackReport };
      if (email) Store.setUserProjects(email, currentProjs);
      setProjects(currentProjs);
      const ideaId = proj.id || proj.idea_id;
      if (ideaId) updateIdeaInBackend(ideaId, { techStackReport }).catch(() => {});
      setSelectedTechStackReport(techStackReport); setSelectedProject(proj); setIsTechStackModalOpen(true);
    } catch (err) { showToast('Tech Stack agent failed. Backend running?', '❌'); }
    finally { setTechStackingProjectTitle(null); }
  };

  const handleRunTracking = async (proj, pIndex = null) => {
    if (!proj.feasibilityReport) { showToast('Run Feasibility Agent first (Agent 1 required)', '⚠️'); return; }
    if (!proj.scopeReport) { showToast('Run Scope Agent first (Agent 2 required)', '⚠️'); return; }
    const user = Store.get('currentUser');
    const email = user?.email;
    setTrackingProjectTitle(proj.title);
    try {
      const trackingReport = await fetchTrackingReport({
        idea_id: proj.id || proj.idea_id || '',
        student_email: email,
        title: proj.title || 'Academic Project',
        desc: proj.desc || '',
        domain: (proj.domain || 'web').toLowerCase(),
        teamSize: String(proj.teamSize || 3),
        durationDays: parseInt(proj.durationDays) || 30,
        techIdeas: proj.techIdeas || '',
        features: proj.features || [],
        studentSkills: profile?.skills || {},
        feasibilityReport: proj.feasibilityReport || null,
        scopeReport: proj.scopeReport || null,
        techStackReport: proj.techStackReport || null,
      });

      let currentProjs = email ? Store.getUserProjects(email) : [...projects];
      let targetIdx = pIndex;
      if (targetIdx === null) targetIdx = currentProjs.findIndex(p => p.title === proj.title || (p.id && p.id === proj.id));
      if (targetIdx !== -1 && targetIdx !== null && currentProjs[targetIdx]) {
        currentProjs[targetIdx] = {
          ...currentProjs[targetIdx],
          trackingReport,
          milestonesDone: trackingReport.milestonesDone || 0,
          milestones: trackingReport.milestones || [],
        };
      }
      if (email) Store.setUserProjects(email, currentProjs);
      setProjects(currentProjs);

      const ideaId = proj.id || proj.idea_id;
      if (ideaId) {
        updateIdeaInBackend(ideaId, {
          trackingReport,
          milestonesDone: trackingReport.milestonesDone || 0,
          milestones: trackingReport.milestones || []
        }).catch(err => console.warn('Tracking sync failed:', err));
      }

      setSelectedTrackingReport(trackingReport);
      setSelectedProject(proj);
      setIsTrackingModalOpen(true);
      showToast('Milestone Roadmap generated successfully! 🗺️', '✅');
    } catch (err) {
      console.error('Tracking agent failed:', err);
      showToast('Tracking agent failed. Is the backend running?', '❌');
    } finally {
      setTrackingProjectTitle(null);
    }
  };

  const handleToggleMilestone = async (milestoneId, completed, targetProj = null) => {
    const proj = targetProj || selectedProject;
    if (!proj) return;
    try {
      const ideaId = proj.id || proj.idea_id || '';
      const res = await toggleMilestoneStatus({
        idea_id: ideaId,
        title: proj.title,
        milestone_id: milestoneId,
        completed,
      });

      const currentReport = proj.trackingReport || selectedTrackingReport;
      if (currentReport && currentReport.milestones) {
        const updatedMilestones = currentReport.milestones.map(m => {
          if (m.id === milestoneId) {
            return {
              ...m,
              completed,
              status: completed ? 'completed' : 'in_progress',
              completedAt: completed ? new Date().toISOString() : null
            };
          }
          return m;
        });

        const updatedDone = res.milestonesDone !== undefined ? res.milestonesDone : updatedMilestones.filter(m => m.completed).length;
        const updatedProgress = res.overallProgress !== undefined ? res.overallProgress : Math.round((updatedDone / (updatedMilestones.length || 1)) * 100);

        const updatedReport = {
          ...currentReport,
          milestones: updatedMilestones,
          milestonesDone: updatedDone,
          overallProgress: updatedProgress,
        };
        setSelectedTrackingReport(updatedReport);

        const user = Store.get('currentUser');
        const email = user?.email;
        let currentProjs = email ? Store.getUserProjects(email) : [...projects];
        const pIdx = currentProjs.findIndex(p => p.title === proj.title || (p.id && p.id === proj.id));
        if (pIdx !== -1) {
          currentProjs[pIdx] = {
            ...currentProjs[pIdx],
            trackingReport: updatedReport,
            milestonesDone: updatedDone,
            milestones: updatedMilestones,
          };
          if (email) Store.setUserProjects(email, currentProjs);
          setProjects(currentProjs);
        }
      }
      showToast(completed ? 'Milestone marked completed! 🎉' : 'Milestone reopened', '✅');
    } catch (err) {
      console.error('Failed to toggle milestone:', err);
      showToast('Failed to update milestone status', '❌');
    }
  };

  const handleUpdateMilestoneEvidence = (projIdx, milestoneId, evidenceUrl) => {
    const user = Store.get('currentUser');
    const email = user?.email;
    let currentProjs = email ? Store.getUserProjects(email) : [...projects];
    const targetProj = currentProjs[projIdx];
    if (!targetProj || !targetProj.trackingReport) return;

    const updatedMilestones = (targetProj.trackingReport.milestones || []).map(m => {
      if (m.id === milestoneId) {
        return { ...m, evidenceUrl };
      }
      return m;
    });

    const updatedReport = {
      ...targetProj.trackingReport,
      milestones: updatedMilestones,
    };

    targetProj.trackingReport = updatedReport;
    targetProj.milestones = updatedMilestones;
    currentProjs[projIdx] = targetProj;

    if (email) Store.setUserProjects(email, currentProjs);
    setProjects([...currentProjs]);

    const ideaId = targetProj.id || targetProj.idea_id;
    if (ideaId) {
      updateIdeaInBackend(ideaId, { trackingReport: updatedReport }).catch(() => {});
    }
    showToast('Evidence link attached successfully! 📎', '✅');
  };

  const handleRiskReportUpdate = (projIdx, report) => {
    const user = Store.get('currentUser');
    const email = user?.email;
    const updated = projects.map((p, i) => i === projIdx ? { ...p, riskReport: report } : p);
    setProjects(updated);
    if (email) Store.setUserProjects(email, updated);
    const ideaId = projects[projIdx]?.id || projects[projIdx]?.idea_id;
    if (ideaId) updateIdeaInBackend(ideaId, { riskReport: report }).catch(() => {});
  };

  /* ── Idea form helpers ── */
  const openIdeaModal = (index = null) => {
    if (index !== null && projects[index]) {
      const p = projects[index];
      setIdeaTitle(p.title || '');
      setIdeaDesc(p.desc || '');
      setIdeaDomain(p.domain || 'web');
      const rawDur = p.durationDays || 30;
      const dm = p.durationUnit || 'weeks';
      setIdeaDuration(dm === 'weeks' ? String(Math.round(rawDur / 7)) : String(rawDur));
      setIdeaTeamSize(p.teamSize || '3');
      setIdeaTechIdeas(p.techIdeas || '');
      setIdeaRefLink(p.refLink || '');
      setIdeaFeatures(p.features || []);
      setUploadedFiles(p.uploadedFiles || []);
      setDurationMode(dm);
      setEditingIndex(index);
    } else {
      setIdeaTitle('');
      setIdeaDesc('');
      setIdeaDomain('web');
      setIdeaDuration('4');
      setIdeaTeamSize('3');
      setIdeaTechIdeas('');
      setIdeaRefLink('');
      setIdeaFeatures([]);
      setUploadedFiles([]);
      setDurationMode('weeks');
      setEditingIndex(null);
    }
    setFeatureInput('');
    setIsModalOpen(true);
    setActiveTab('submit_idea');
  };

  const DOMAIN_FEATURE_SUGGESTIONS = {
    web: ['User Authentication & JWT', 'Interactive Responsive Dashboard', 'RESTful API Integration', 'MongoDB / SQL Database Models', 'Analytics & Reporting Charts', 'Role-Based Access Control'],
    aiml: ['Data Preprocessing & Augmentation Pipeline', 'Deep Learning / ML Model Training', 'Real-Time Inference API', 'Evaluation Metrics & Confusion Matrix', 'Model Explainability (SHAP/LIME)', 'Interactive Web Prediction UI'],
    mobile: ['Cross-Platform Mobile UI', 'Push Notifications & Alerts', 'Offline Data Storage & Sync', 'GPS Location & Map Services', 'Biometric Authentication', 'Media Capture & Upload'],
    data: ['Automated ETL Pipeline', 'Interactive Chart Visualizations', 'Statistical Analysis & Hypothesis Testing', 'Predictive Trend Forecasting', 'Automated Anomaly Detection', 'Dynamic Metric Dashboard'],
    iot: ['Sensor Data Telemetry Stream', 'MQTT / WebSocket Broker Connection', 'Microcontroller / Arduino Logic', 'Hardware Actuator Triggering', 'Edge Device Optimization', 'Real-Time Alert Notifications'],
    cybersecurity: ['Role-Based Access Control (RBAC)', 'Network Traffic Anomaly Detection', 'End-to-End Encryption', 'Audit Logging & Threat Traceability', 'Vulnerability Assessment Tool', 'Security Compliance Dashboard'],
    blockchain: ['Smart Contract Deployment (Solidity)', 'Web3 Wallet Auth (MetaMask)', 'Decentralized IPFS Storage', 'Gas Fee Optimization', 'Transaction Ledger & Verification', 'Automated Token Escrow'],
    cloud: ['Docker Containerization', 'Automated CI/CD Pipeline', 'Kubernetes Cluster Orchestration', 'Infrastructure as Code', 'Cloud Observability & Monitoring', 'Auto-Scaling Infrastructure'],
    other: ['User Management & Auth', 'Core Algorithmic Engine', 'Automated Processing Pipeline', 'Interactive Dashboard & Analytics', 'Export Reports (PDF/CSV)', 'Third-Party API Integration'],
  };

  const addFeature = () => { const f = featureInput.trim(); if (!f || ideaFeatures.includes(f)) return; setIdeaFeatures(prev => [...prev, f]); setFeatureInput(''); };
  const removeFeature = (f) => setIdeaFeatures(prev => prev.filter(x => x !== f));

  const toggleSuggestedFeature = (f) => {
    if (ideaFeatures.includes(f)) {
      setIdeaFeatures(prev => prev.filter(x => x !== f));
    } else {
      setIdeaFeatures(prev => [...prev, f]);
    }
  };

  const autoSuggestFeatures = () => {
    const domainKey = (ideaDomain || 'web').toLowerCase();
    const suggestions = DOMAIN_FEATURE_SUGGESTIONS[domainKey] || DOMAIN_FEATURE_SUGGESTIONS.web;
    const combined = Array.from(new Set([...ideaFeatures, ...suggestions.slice(0, 4)]));
    setIdeaFeatures(combined);
    showToast(`Added ${suggestions.slice(0, 4).length} smart feature suggestions for ${domainKey.toUpperCase()}! ✨`, '🎉');
  };

  const processFiles = (files) => {
    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) { showToast(`${file.name} exceeds 10MB`, '⚠️'); return; }
      const reader = new FileReader();
      reader.onload = (evt) => {
        setUploadedFiles(prev => {
          if (prev.some(f => f.name === file.name && f.size === file.size)) return prev;
          return [...prev, { name: file.name, size: file.size, type: file.type, dataUrl: evt.target.result, uploadedAt: new Date().toISOString() }];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const submitIdea = async (e) => {
    e.preventDefault();
    if (!ideaDesc.trim()) { showToast('Please enter a project description.', '⚠️'); return; }
    setIsSubmitting(true);
    const user = Store.get('currentUser');
    const email = (user?.email || '').trim().toLowerCase();
    const rawDur = parseInt(ideaDuration) || 4;
    const duration = durationMode === 'weeks' ? rawDur * 7 : rawDur;
    const proj = {
      title: ideaTitle.trim() || 'Academic Project',
      desc: ideaDesc.trim(),
      domain: ideaDomain || 'web',
      teamSize: ideaTeamSize || '3',
      durationDays: duration,
      durationUnit: durationMode,
      techIdeas: ideaTechIdeas.trim(),
      refLink: ideaRefLink.trim(),
      features: ideaFeatures,
      uploadedFiles: uploadedFiles.map(f => ({
        name: f.name,
        size: f.size || 0,
        type: f.type || 'text/plain',
        uploadedAt: f.uploadedAt || new Date().toISOString()
      })),
      status: 'pending_review',
      submittedAt: new Date().toISOString(),
      student_email: email,
    };

    try {
      const res = await submitIdeaToBackend({
        student_id: user?.id || user?._id || email || 'student',
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
      if (res?.idea_id) {
        proj.id = res.idea_id;
        proj.idea_id = res.idea_id;
      }
      showToast('Project idea submitted! Running Feasibility Agent... 🚀', '✅');
    } catch (err) {
      console.warn('Backend submission warning:', err);
      showToast('Project saved! Running AI analysis...', 'ℹ️');
    }

    let updatedProjects = email ? Store.getUserProjects(email) : [...projects];
    const targetIdx = editingIndex !== null ? editingIndex : 0;
    if (editingIndex !== null) {
      updatedProjects[editingIndex] = {
        ...updatedProjects[editingIndex],
        ...proj,
        submittedAt: updatedProjects[editingIndex].submittedAt || proj.submittedAt
      };
    } else {
      updatedProjects.unshift(proj);
    }
    if (email) Store.setUserProjects(email, updatedProjects);
    setProjects(updatedProjects);
    setIsSubmitting(false);
    setIsModalOpen(false);

    handleCheckFeasibility({ ...proj, rawFiles: uploadedFiles }, targetIdx);
  };

  const handleDeleteProject = async (pIdx, e) => {
    if (e) e.stopPropagation();
    const projToDelete = projects[pIdx];
    if (!projToDelete || !window.confirm(`Delete "${projToDelete.title}"?`)) return;
    const user = Store.get('currentUser');
    const email = (user?.email || '').trim().toLowerCase();
    const updated = projects.filter((_, idx) => idx !== pIdx);
    setProjects(updated);
    if (email) Store.setUserProjects(email, updated);
    const ideaId = projToDelete.id || projToDelete.idea_id;
    if (ideaId) deleteIdeaInBackend(ideaId).catch(() => {});
    showToast('Project deleted.', '🗑️');
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file || file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB', '⚠️'); return; }
    const reader = new FileReader();
    reader.onload = (evt) => { setAvatar(evt.target.result); Store.set('avatarDataUrl', evt.target.result); showToast('Photo updated!', '📸'); };
    reader.readAsDataURL(file);
  };

  if (!profile) return null;

  const tabTitles = {
    dashboard:   { title: 'Dashboard', subtitle: 'Your project overview and quick actions' },
    submit_idea: { title: '💡 Submit Project Idea', subtitle: 'Enter your rough project idea — AI agents will build the complete feasibility, architecture and timeline blueprint' },
    project:     { title: 'My Projects', subtitle: 'Manage your submitted project ideas' },
    milestones:  { title: 'Milestones & Risk', subtitle: 'Sprint roadmap, milestone tracking and risk assessment' },
    progress:    { title: 'Progress Tracker', subtitle: 'Weekly check-ins and AI plan adjustments' },
    timeline:    { title: 'AI Timeline Planner', subtitle: 'Interactive project task breakdown, schedule and risk analysis' },
    mentor:      { title: 'AI Mentor', subtitle: 'Conversational project guidance powered by Groq' },
    reports:     { title: 'Reports', subtitle: 'On-demand document generation and download' },
  };


  const currentTabInfo = tabTitles[activeTab] || tabTitles.dashboard;

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
        .page-content { animation: fadeIn 0.3s ease; }
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(10px);
          z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 1rem;
        }
        .modal-box {
          background: #0f172a; border: 1px solid rgba(255,255,255,0.12);
          border-radius: 18px; width: 100%; max-width: 640px; max-height: 90vh;
          overflow-y: auto; box-shadow: 0 24px 64px rgba(0,0,0,0.6);
          animation: fadeIn 0.25s ease; color: #f8fafc;
        }
        .modal-header {
          padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0;
          background: #0f172a; z-index: 1;
        }
        .modal-header-title { font-size: 1.05rem; font-weight: 700; color: #f8fafc; }
        .modal-header-sub { font-size: 0.73rem; color: #94a3b8; margin-top: 2px; }
        .modal-close-btn {
          width: 30px; height: 30px; border-radius: 50%; background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;
        }
        .modal-close-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
        .form-group { margin-bottom: 1rem; }
        .form-label { display: block; font-size: 0.75rem; font-weight: 600; color: #94a3b8; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.05em; }
        .form-input, .form-select, .form-textarea {
          width: 100%; background: #1e293b; border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px; padding: 0.65rem 0.85rem; color: #f8fafc; font-size: 0.85rem;
          font-family: inherit; transition: border-color 0.2s;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          outline: none; border-color: rgba(99,102,241,0.6);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .form-textarea { resize: vertical; min-height: 80px; }
        .btn-primary-form {
          width: 100%; padding: 0.85rem; border-radius: 10px; border: none;
          background: linear-gradient(135deg,#3b82f6,#6366f1); color: #fff;
          font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: opacity 0.2s;
        }
        .btn-primary-form:hover { opacity: 0.9; }
        .btn-primary-form:disabled { opacity: 0.5; cursor: not-allowed; }
        .feature-chip {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3);
          color: #818cf8; border-radius: 99px; padding: 3px 10px; font-size: 0.75rem;
        }
        .project-list-card {
          background: #fff; border: 1px solid rgba(15,23,42,0.09);
          border-radius: 14px; padding: 1.25rem; margin-bottom: 0.75rem; transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(15,23,42,0.07);
        }
        .project-list-card:hover { border-color: rgba(79,70,229,0.35); box-shadow: 0 6px 24px rgba(79,70,229,0.12); transform: translateY(-1px); }
        .agent-pipeline-pills { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
        .agent-pill {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.7rem; font-weight: 600; padding: 4px 11px; border-radius: 99px;
          border: 1px solid; cursor: pointer; transition: all 0.15s; user-select: none;
        }
        .agent-pill.done { background: rgba(22,163,74,0.1); color: #16a34a; border-color: rgba(22,163,74,0.3); }
        .agent-pill.running { background: rgba(79,70,229,0.1); color: #4f46e5; border-color: rgba(79,70,229,0.3); }
        .agent-pill.ready { background: #f1f5f9; color: #475569; border-color: rgba(15,23,42,0.12); }
        .agent-pill.ready:hover { background: rgba(79,70,229,0.08); color: #4f46e5; border-color: rgba(79,70,229,0.25); }
        .agent-pill.locked { background: #f8fafc; color: #94a3b8; border-color: rgba(15,23,42,0.08); cursor: not-allowed; }
        .agent-spin { display: inline-block; animation: spin 1s linear infinite; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .search-bar {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px; padding: 0.4rem 0.75rem; flex: 1; max-width: 220px;
        }
        .search-bar input { background: none; border: none; color: #f1f5f9; font-size: 0.82rem; outline: none; flex: 1; font-family: inherit; }
        .search-bar input::placeholder { color: rgba(255,255,255,0.4); }
      `}</style>

      {/* Agent Report Modals */}
      {isReportModalOpen && <FeasibilityReportModal isOpen={isReportModalOpen} report={selectedReport} project={selectedProject} onClose={() => setIsReportModalOpen(false)} />}
      {isScopeModalOpen && <ScopeReportModal isOpen={isScopeModalOpen} report={selectedScopeReport} project={selectedProject} onClose={() => setIsScopeModalOpen(false)} />}
      {isTechStackModalOpen && <TechStackReportModal report={selectedTechStackReport} project={selectedProject} onClose={() => setIsTechStackModalOpen(false)} />}
      {isTrackingModalOpen && <TrackingReportModal report={selectedTrackingReport} project={selectedProject} onClose={() => setIsTrackingModalOpen(false)} onToggleMilestone={handleToggleMilestone} />}

      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ChatbotPanel (floating) */}
      <ChatbotPanel activeProject={selectedProject || projects[0] || null} />

      {/* Main content area */}
      <div className="sidebar-content" style={{ background: '#0a0d18', minHeight: '100vh', color: '#f1f5f9' }}>

        {/* Top bar */}
        <TopBar
          title={currentTabInfo.title}
          subtitle={currentTabInfo.subtitle}
          actions={
            <>
              <button
                onClick={() => openIdeaModal()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0.45rem 0.95rem', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                  color: '#fff', fontWeight: 700, fontSize: '0.82rem',
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                  transition: 'all 0.15s'
                }}
              >
                <span>💡</span> Submit New Idea
              </button>

              <div className="search-bar">
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>🔍</span>
                <input placeholder="Search..." style={{ color: '#f1f5f9' }} />
              </div>
              {/* Notifications */}
              <div style={{ width: 34, height: 34, borderRadius: 50, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', cursor: 'pointer', position: 'relative' }}>
                🔔
                {projects.some(p => !p.feasibilityReport) && (
                  <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, background: '#3b82f6', borderRadius: '50%' }} />
                )}
              </div>

              {/* Avatar */}
              <div onClick={() => avatarInputRef.current?.click()} style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: '2px solid rgba(79,70,229,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: '#fff', cursor: 'pointer', overflow: 'hidden' }}>
                {avatar ? <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (profile?.firstName?.charAt(0) || 'S')}
              </div>
              <input type="file" ref={avatarInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            </>
          }
        />

        {/* Tab content */}
        <div className="page-content" key={activeTab}>
          {activeTab === 'dashboard' && (
            <DashboardTab
              profile={profile}
              projects={projects}
              onOpenSubmitModal={() => openIdeaModal()}
              onTabChange={setActiveTab}
            />
          )}

          {activeTab === 'submit_idea' && (
            <div style={{ padding: '1.5rem 2rem', maxWidth: 840, margin: '0 auto' }}>
              <div style={{
                background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 18, padding: '2rem', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.2rem' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>💡</div>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                      {editingIndex !== null ? '✏️ Edit Project Idea' : 'Submit Project Idea'}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 3 }}>
                      Fill in your rough project details — the AI agent pipeline will automatically evaluate feasibility, scope, and milestones.
                    </div>
                  </div>
                </div>

                <form onSubmit={submitIdea}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.1rem' }}>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Project Title *</label>
                      <input
                        className="form-input"
                        value={ideaTitle}
                        onChange={e => setIdeaTitle(e.target.value)}
                        placeholder="e.g. Smart Attendance & Anomaly Detection System"
                        required
                        style={{ fontSize: '0.92rem', padding: '0.75rem 1rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Project Description *</label>
                      <textarea
                        className="form-textarea"
                        rows={4}
                        value={ideaDesc}
                        onChange={e => setIdeaDesc(e.target.value)}
                        placeholder="Describe what your project aims to do, the problem it solves, and how it will work..."
                        required
                        style={{ fontSize: '0.9rem', padding: '0.75rem 1rem', minHeight: 100 }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Domain</label>
                      <select
                        className="form-select"
                        value={ideaDomain}
                        onChange={e => setIdeaDomain(e.target.value)}
                        style={{ fontSize: '0.88rem', padding: '0.7rem 0.9rem' }}
                      >
                        <option value="web">🌐 Web Development</option>
                        <option value="aiml">🤖 AI / Machine Learning</option>
                        <option value="mobile">📱 Mobile Applications</option>
                        <option value="data">📊 Data Science & Analytics</option>
                        <option value="iot">🔌 IoT & Embedded</option>
                        <option value="cybersecurity">🔒 Cybersecurity</option>
                        <option value="blockchain">⛓️ Blockchain</option>
                        <option value="cloud">☁️ Cloud & DevOps</option>
                        <option value="other">⚡ Other</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Team Size</label>
                      <select
                        className="form-select"
                        value={ideaTeamSize}
                        onChange={e => setIdeaTeamSize(e.target.value)}
                        style={{ fontSize: '0.88rem', padding: '0.7rem 0.9rem' }}
                      >
                        {['1','2','3','4','5','6'].map(s => <option key={s} value={s}>{s} member{s !== '1' ? 's' : ''}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Duration</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          className="form-input"
                          type="number"
                          min={1}
                          value={ideaDuration}
                          onChange={e => setIdeaDuration(e.target.value)}
                          style={{ flex: 1, fontSize: '0.88rem', padding: '0.7rem' }}
                        />
                        <select
                          className="form-select"
                          value={durationMode}
                          onChange={e => setDurationMode(e.target.value)}
                          style={{ width: 100, fontSize: '0.88rem', padding: '0.7rem' }}
                        >
                          <option value="weeks">Weeks</option>
                          <option value="days">Days</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Tech Ideas (Optional)</label>
                      <input
                        className="form-input"
                        value={ideaTechIdeas}
                        onChange={e => setIdeaTechIdeas(e.target.value)}
                        placeholder="React, Python, OpenCV, MongoDB..."
                        style={{ fontSize: '0.88rem', padding: '0.7rem 0.9rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: 0 }}>
                          Key Features (Optional)
                        </label>
                        <button
                          type="button"
                          onClick={autoSuggestFeatures}
                          style={{
                            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                            borderRadius: 6, color: '#a5b4fc', fontSize: '0.75rem', fontWeight: 600,
                            padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                          }}
                        >
                          ✨ Auto-Suggest for {(ideaDomain || 'web').toUpperCase()}
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <input
                          className="form-input"
                          value={featureInput}
                          onChange={e => setFeatureInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); }}}
                          placeholder="Type custom feature and press Enter (or click suggestions below)..."
                          style={{ flex: 1, fontSize: '0.88rem', padding: '0.7rem 0.9rem' }}
                        />
                        <button
                          type="button"
                          onClick={addFeature}
                          style={{
                            padding: '0.7rem 1.2rem', borderRadius: 8,
                            border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.15)',
                            color: '#818cf8', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          + Add
                        </button>
                      </div>

                      {/* Quick Domain Suggestions */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 5 }}>
                          💡 Quick Suggestions (Click to add/remove):
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {(DOMAIN_FEATURE_SUGGESTIONS[(ideaDomain || 'web').toLowerCase()] || DOMAIN_FEATURE_SUGGESTIONS.web).map((sugg, i) => {
                            const isSelected = ideaFeatures.includes(sugg);
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => toggleSuggestedFeature(sugg)}
                                style={{
                                  background: isSelected ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.05)',
                                  border: `1px solid ${isSelected ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                  color: isSelected ? '#86efac' : '#94a3b8',
                                  padding: '3px 9px', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s'
                                }}
                              >
                                <span>{isSelected ? '✓' : '+'}</span>
                                <span>{sugg}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Selected Features */}
                      {ideaFeatures.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ fontSize: '0.72rem', color: '#a5b4fc', alignSelf: 'center', fontWeight: 600 }}>Selected ({ideaFeatures.length}):</span>
                          {ideaFeatures.map((f, i) => (
                            <span key={i} className="feature-chip">
                              {f}
                              <button
                                type="button"
                                onClick={() => removeFeature(f)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a5b4fc', fontSize: '0.75rem', padding: 0 }}
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* File Upload */}
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Reference Documents (Optional)</label>
                      <div
                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={e => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files); }}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          border: `1.5px dashed ${isDragging ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.18)'}`,
                          borderRadius: 10, padding: '1.3rem', textAlign: 'center', cursor: 'pointer',
                          background: isDragging ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                          transition: 'all 0.2s', fontSize: '0.85rem', color: '#94a3b8'
                        }}
                      >
                        📎 Drag & drop project files here or browse (PDF, Word, Images — max 10MB)
                      </div>
                      <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple onChange={e => processFiles(e.target.files)} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.zip,.txt" />
                      {uploadedFiles.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          {uploadedFiles.map((f, i) => (
                            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', padding: '4px 9px', borderRadius: 6, color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)' }}>
                              📎 {f.name}
                              <button type="button" onClick={() => setUploadedFiles(prev => prev.filter(x => x.name !== f.name))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: '0.75rem', padding: 0 }}>✕</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{
                        flex: 1, padding: '0.9rem 1.5rem', borderRadius: 10, border: 'none',
                        background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff',
                        fontWeight: 800, fontSize: '0.95rem', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 18px rgba(99,102,241,0.4)', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                      }}
                    >
                      {isSubmitting ? '⟳ Submitting & Running AI Feasibility Agent...' : editingIndex !== null ? '💾 Update Project Idea' : '🚀 Submit & Run AI Analysis'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'project' && (
            <div style={{ padding: '1.5rem 2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Your Projects ({projects.length})</div>
                <button onClick={() => openIdeaModal()} style={{ padding: '0.55rem 1.1rem', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                  + New Idea
                </button>
              </div>

              {projects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed rgba(255,255,255,0.18)', borderRadius: 16, background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💡</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>No Project Submitted Yet</div>
                  <div style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.55)', marginBottom: '1.25rem' }}>Submit your project idea to get started with the AI agent pipeline.</div>
                  <button onClick={() => openIdeaModal()} style={{ padding: '0.7rem 1.5rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                    🚀 Submit Your Idea
                  </button>
                </div>
              ) : (
                projects.map((proj, pIdx) => (
                  <div key={pIdx} className="project-list-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>{proj.title}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Submitted {fmtDate(proj.submittedAt)} · {(() => { const d = proj.durationDays || 30; const w = Math.floor(d/7); return w > 0 ? `${w} week${w !== 1 ? 's' : ''}` : `${d} days`; })()} · Team of {proj.teamSize || 1}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {proj.feasibility && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: 'rgba(22,163,74,0.12)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)' }}>
                            {proj.feasibility}% Feasible
                          </span>
                        )}
                        <button onClick={() => openIdeaModal(pIdx)} style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(15,23,42,0.12)', background: '#f8fafc', color: '#475569', fontSize: '0.75rem', cursor: 'pointer' }}>✏️</button>
                        <button onClick={e => handleDeleteProject(pIdx, e)} style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer' }}>🗑️</button>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, marginBottom: 10 }}>
                      {proj.desc?.slice(0, 180)}{proj.desc?.length > 180 ? '…' : ''}
                    </div>

                    {/* Feature tags */}
                    {proj.features?.length > 0 && (
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                        {proj.features.map((f, fi) => <span key={fi} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: 'rgba(79,70,229,0.08)', color: '#4f46e5', border: '1px solid rgba(79,70,229,0.15)' }}>{f}</span>)}
                      </div>
                    )}

                    {/* Agent Pipeline Pills */}
                    <div className="agent-pipeline-pills">
                      <span className={`agent-pill ${analyzingProjectTitle === proj.title ? 'running' : proj.feasibilityReport ? 'done' : 'ready'}`}
                        onClick={() => {
                          if (proj.feasibilityReport) { setSelectedReport(proj.feasibilityReport); setSelectedProject(proj); setIsReportModalOpen(true); }
                          else handleCheckFeasibility(proj, pIdx);
                        }}>
                        {analyzingProjectTitle === proj.title ? <span className="agent-spin">⟳</span> : '📊'} Feasibility {proj.feasibilityReport ? `${proj.feasibilityReport.overallScore}%` : ''}
                      </span>
                      <span className={`agent-pill ${scopingProjectTitle === proj.title ? 'running' : proj.scopeReport ? 'done' : 'ready'}`}
                        onClick={() => {
                          if (proj.scopeReport) { setSelectedScopeReport(proj.scopeReport); setSelectedProject(proj); setIsScopeModalOpen(true); }
                          else handleRunScope(proj, pIdx);
                        }}>
                        {scopingProjectTitle === proj.title ? <span className="agent-spin">⟳</span> : '📐'} Scope {proj.scopeReport ? '✓' : ''}
                      </span>
                      <span className={`agent-pill ${techStackingProjectTitle === proj.title ? 'running' : proj.techStackReport ? 'done' : 'ready'}`}
                        onClick={() => {
                          if (proj.techStackReport) { setSelectedTechStackReport(proj.techStackReport); setSelectedProject(proj); setIsTechStackModalOpen(true); }
                          else handleRunTechStack(proj, pIdx);
                        }}>
                        {techStackingProjectTitle === proj.title ? <span className="agent-spin">⟳</span> : '🛠️'} Tech Stack {proj.techStackReport ? '✓' : ''}
                      </span>
                      <span className={`agent-pill ${trackingProjectTitle === proj.title ? 'running' : proj.trackingReport ? 'done' : (!proj.feasibilityReport || !proj.scopeReport) ? 'locked' : 'ready'}`}
                        onClick={() => {
                          if (proj.trackingReport) { setSelectedTrackingReport(proj.trackingReport); setSelectedProject(proj); setIsTrackingModalOpen(true); }
                          else handleRunTracking(proj, pIdx);
                        }}>
                        {trackingProjectTitle === proj.title ? <span className="agent-spin">⟳</span> : '🗺️'} Milestones {proj.trackingReport ? `${proj.trackingReport.overallProgress || 0}%` : ''}
                      </span>
                      <span className={`agent-pill ${proj.riskReport ? 'done' : 'ready'}`}
                        onClick={() => setActiveTab('milestones')}>
                        ⚠️ Risk {proj.riskReport ? '✓' : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'milestones' && (
            <div style={{ padding: '1.5rem 2rem' }}>
              {/* ── Section 1: Milestone Tracking (Agent 4) ── */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9' }}>🗺️ Milestone Tracking</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>AI-generated sprint roadmap — run from My Projects tab</div>
                  </div>
                </div>

                {projects.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 14, background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🗺️</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>No projects yet</div>
                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>Submit a project idea first, then run the Milestones agent.</div>
                  </div>
                ) : (
                  projects.map((proj, pIdx) => {
                    const tr = proj.trackingReport;
                    if (tr) {
                      return (
                        <SprintTimelineView
                          key={pIdx}
                          project={proj}
                          trackingReport={tr}
                          onToggleMilestone={(mId, completed) => handleToggleMilestone(mId, completed, proj)}
                          onUpdateEvidence={(mId, url) => handleUpdateMilestoneEvidence(pIdx, mId, url)}
                          onOpenFullModal={() => {
                            setSelectedTrackingReport(tr);
                            setSelectedProject(proj);
                            setIsTrackingModalOpen(true);
                          }}
                          onRerunTracking={() => handleRunTracking(proj, pIdx)}
                          isRerunning={trackingProjectTitle === proj.title}
                        />
                      );
                    }

                    return (
                      <div key={pIdx} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '1.25rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>{proj.title}</div>
                          <button
                            onClick={() => handleRunTracking(proj, pIdx)}
                            disabled={trackingProjectTitle === proj.title || !proj.feasibilityReport || !proj.scopeReport}
                            title={!proj.feasibilityReport ? 'Run Feasibility first' : !proj.scopeReport ? 'Run Scope first' : 'Generate milestone roadmap'}
                            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: (!proj.feasibilityReport || !proj.scopeReport) ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: (!proj.feasibilityReport || !proj.scopeReport) ? '#64748b' : '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: (!proj.feasibilityReport || !proj.scopeReport) ? 'not-allowed' : 'pointer' }}>
                            {trackingProjectTitle === proj.title ? '⟳ Generating...' : '▶ Generate Milestones'}
                          </button>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                          {!proj.feasibilityReport ? '⚠ Run Feasibility agent first' : !proj.scopeReport ? '⚠ Run Scope agent first' : 'No milestone plan generated yet. Click Generate Milestones to create your sprint roadmap.'}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '0.5rem 0 1.5rem' }} />

              {/* ── Section 2: Risk Assessment (separate agent) ── */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '0.25rem' }}>⚠️ Risk Assessment</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>AI-powered blocker analysis — independent from milestone tracking</div>
              </div>
              <RiskTab
                projects={projects}
                profile={profile}
                onRiskReportUpdate={handleRiskReportUpdate}
              />
            </div>
          )}

          {activeTab === 'progress' && (
            <ProgressTab projects={projects} profile={profile} />
          )}

          {activeTab === 'mentor' && (
            <MentorChatTab projects={projects} profile={profile} />
          )}

          {activeTab === 'reports' && (
            <EnhancedReportsTab projects={projects} profile={profile} />
          )}

          {activeTab === 'skills' && (
            <div style={{ padding: '1.5rem 2rem' }}>
              {/* Assessment completion header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                    {profile?.firstName?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>{profile?.firstName} {profile?.lastName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{profile?.rollNo} · Student</div>
                    <div style={{ fontSize: '0.72rem', color: '#60a5fa', marginTop: 2 }}>Medium confidence</div>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9' }}>Assessment Completion</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#3b82f6' }}>
                      {profile?.skills ? `${Math.round(Object.keys(profile.skills).length / 10 * 100)}%` : '0%'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(59,130,246,0.15)', borderRadius: 99, height: 8, overflow: 'hidden', marginBottom: 10 }}>
                    <div style={{ width: profile?.skills ? `${Math.round(Object.keys(profile.skills).length / 10 * 100)}%` : '0%', height: '100%', background: 'linear-gradient(90deg,#3b82f6,#6366f1)', borderRadius: 99, transition: 'width 0.5s' }} />
                  </div>
                  <Link to="/profile" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>
                    ✏️ Edit Assessment
                  </Link>
                </div>
              </div>

              {/* Skills by category */}
              {profile?.skills && Object.keys(profile.skills).length > 0 ? (
                <>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1.25rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9' }}>Overall Skill Summary</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                        {Object.keys(profile.skills).length} skills · Avg: {Math.round(Object.values(profile.skills).reduce((a, b) => a + b, 0) / Object.keys(profile.skills).length * 20)}%
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(profile.skills).map(([skill, val]) => {
                        const pct = Math.min(100, Math.round(val * 20));
                        return (
                          <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', width: 120, flexShrink: 0, textTransform: 'capitalize' }}>{skill}</div>
                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.07)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? '#22c55e' : pct >= 50 ? '#3b82f6' : '#f59e0b', borderRadius: 99, transition: 'width 0.5s' }} />
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: pct >= 80 ? '#4ade80' : pct >= 50 ? '#60a5fa' : '#fbbf24', width: 36, textAlign: 'right' }}>{pct}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.35)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
                  <div style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>No skills recorded. Complete your profile to see skill assessment.</div>
                  <Link to="/profile" style={{ padding: '0.65rem 1.5rem', borderRadius: 8, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>
                    Complete Profile
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '2rem', maxWidth: 480, width: '100%', textAlign: 'center', marginBottom: '1rem' }}>
                <div onClick={() => avatarInputRef.current?.click()} style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 900, color: '#fff', margin: '0 auto 1rem', cursor: 'pointer', overflow: 'hidden' }}>
                  {avatar ? <img src={avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (profile?.firstName?.charAt(0) || 'S')}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9' }}>{profile?.firstName} {profile?.lastName}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{profile?.rollNo} · {profile?.branch}</div>
                <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: 2 }}>{profile?.year}</div>
                <Link to="/profile" style={{ display: 'inline-block', marginTop: '1.25rem', padding: '0.6rem 1.5rem', borderRadius: 8, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', fontSize: '0.82rem', fontWeight: 600 }}>
                  ✏️ Edit Profile
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <TimelinePlannerTab userProjects={projects} />
          )}

        </div>
      </div>

      {/* ── Idea Submission Modal ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target.classList.contains('modal-overlay')) setIsModalOpen(false); }}>
          <div className="modal-box">
            <div className="modal-header">
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  {editingIndex !== null ? '✏️ Edit Project Idea' : '💡 Submit New Idea'}
                </div>
                <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: 2 }}>Fill in the details for the AI agent pipeline</div>
              </div>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={submitIdea} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Project Title</label>
                  <input className="form-input" value={ideaTitle} onChange={e => setIdeaTitle(e.target.value)} placeholder="e.g. Smart Attendance System" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Project Description *</label>
                  <textarea className="form-textarea" rows={4} value={ideaDesc} onChange={e => setIdeaDesc(e.target.value)} placeholder="Describe your project idea in detail..." required />
                </div>
                <div className="form-group">
                  <label className="form-label">Domain</label>
                  <select className="form-select" value={ideaDomain} onChange={e => setIdeaDomain(e.target.value)}>
                    {['web', 'mobile', 'aiml', 'data', 'iot', 'blockchain', 'cybersecurity', 'cloud', 'other'].map(d => (
                      <option key={d} value={d}>{d.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Team Size</label>
                  <select className="form-select" value={ideaTeamSize} onChange={e => setIdeaTeamSize(e.target.value)}>
                    {['1','2','3','4','5','6'].map(s => <option key={s} value={s}>{s} member{s !== '1' ? 's' : ''}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Duration</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input className="form-input" type="number" min={1} value={ideaDuration} onChange={e => setIdeaDuration(e.target.value)} style={{ flex: 1 }} />
                    <select className="form-select" value={durationMode} onChange={e => setDurationMode(e.target.value)} style={{ width: 90 }}>
                      <option value="weeks">Weeks</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Tech Ideas</label>
                  <input className="form-input" value={ideaTechIdeas} onChange={e => setIdeaTechIdeas(e.target.value)} placeholder="React, Python, etc." />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}>Key Features (Optional)</label>
                    <button
                      type="button"
                      onClick={autoSuggestFeatures}
                      style={{
                        background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: 6, color: '#a5b4fc', fontSize: '0.72rem', fontWeight: 600,
                        padding: '2px 7px', cursor: 'pointer'
                      }}
                    >
                      ✨ Auto-Suggest
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input className="form-input" value={featureInput} onChange={e => setFeatureInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); }}} placeholder="Type feature and press Enter (or pick below)..." style={{ flex: 1 }} />
                    <button type="button" onClick={addFeature} style={{ padding: '0.65rem 1rem', borderRadius: 8, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', fontSize: '0.82rem', cursor: 'pointer' }}>+ Add</button>
                  </div>
                  {/* Domain suggestions */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
                    {(DOMAIN_FEATURE_SUGGESTIONS[(ideaDomain || 'web').toLowerCase()] || DOMAIN_FEATURE_SUGGESTIONS.web).slice(0, 4).map((sugg, i) => {
                      const isSelected = ideaFeatures.includes(sugg);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleSuggestedFeature(sugg)}
                          style={{
                            background: isSelected ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${isSelected ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
                            color: isSelected ? '#86efac' : '#94a3b8',
                            padding: '2px 7px', borderRadius: 5, fontSize: '0.72rem', cursor: 'pointer'
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '}{sugg}
                        </button>
                      );
                    })}
                  </div>
                  {ideaFeatures.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {ideaFeatures.map((f, i) => (
                        <span key={i} className="feature-chip">
                          {f}
                          <button type="button" onClick={() => removeFeature(f)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a5b4fc', fontSize: '0.75rem', padding: 0, lineHeight: 1 }}>✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* File Upload */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Reference Documents</label>
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files); }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ border: `1.5px dashed ${isDragging ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.18)'}`, borderRadius: 10, padding: '1.25rem', textAlign: 'center', cursor: 'pointer', background: isDragging ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)', transition: 'all 0.2s', fontSize: '0.82rem', color: '#94a3b8' }}>
                    📎 Drag & drop or click to upload (PDF, Word, Images — max 10MB)
                  </div>
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple onChange={e => processFiles(e.target.files)} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.zip,.txt" />
                  {uploadedFiles.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {uploadedFiles.map((f, i) => (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', padding: '4px 9px', borderRadius: 6, color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)' }}>
                          📎 {f.name}
                          <button type="button" onClick={() => setUploadedFiles(prev => prev.filter(x => x.name !== f.name))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: '0.75rem', padding: 0 }}>✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" className="btn-primary-form" disabled={isSubmitting} style={{ marginTop: '0.5rem' }}>
                {isSubmitting ? '⟳ Submitting & Running Feasibility AI...' : editingIndex !== null ? '💾 Update Project' : '🚀 Submit & Run AI Analysis'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
