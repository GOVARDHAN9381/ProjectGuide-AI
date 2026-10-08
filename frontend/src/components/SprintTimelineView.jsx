import React, { useState } from 'react';

/**
 * SprintTimelineView Component
 *
 * Provides:
 * 1. Horizontal visual Sprint Timeline & Mini-Gantt track
 * 2. Inline milestone phase cards with instant completion toggles
 * 3. Deliverable checklist with item status
 * 4. Deliverable Evidence submission (GitHub PR / commit / live demo URL)
 * 5. Milestone-to-Risk de-risking badge
 */
export default function SprintTimelineView({
  project,
  trackingReport,
  onToggleMilestone,
  onUpdateEvidence,
  onOpenFullModal,
  onRerunTracking,
  isRerunning
}) {
  const [expandedPhaseId, setExpandedPhaseId] = useState(null);
  const [evidenceInputs, setEvidenceInputs] = useState({});
  const [editingEvidenceId, setEditingEvidenceId] = useState(null);

  if (!trackingReport) return null;

  const milestones = trackingReport.milestones || [];
  const progress = trackingReport.overallProgress !== undefined 
    ? trackingReport.overallProgress 
    : 0;
  const metrics = trackingReport.trackingMetrics || {};
  const totalWeeks = metrics.estimatedCompletionWeeks || 4;
  const doneCount = milestones.filter(m => m.completed).length;

  const handleSaveEvidence = (milestoneId) => {
    const url = evidenceInputs[milestoneId];
    if (onUpdateEvidence) {
      onUpdateEvidence(milestoneId, url);
    }
    setEditingEvidenceId(null);
  };

  return (
    <div style={{
      background: 'rgba(15,23,42,0.65)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16,
      padding: '1.5rem',
      marginBottom: '1.5rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
    }}>
      {/* ── Header: Title & Quick Actions ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: '1.3rem' }}>🗺️</span>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
              Sprint Roadmap &amp; Execution Timeline
            </h3>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(16,185,129,0.15)',
              color: '#34d399',
              border: '1px solid rgba(16,185,129,0.35)'
            }}>
              {totalWeeks} Weeks Architecture
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
            Phase-by-phase execution tracking with deliverables and guide verification checkpoints.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button
            onClick={onOpenFullModal}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: 8,
              border: '1px solid rgba(99,102,241,0.35)',
              background: 'rgba(99,102,241,0.18)',
              color: '#a5b4fc',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 0.15s ease'
            }}
          >
            <span>📋</span>
            <span>View Full Roadmap</span>
          </button>

          <button
            onClick={onRerunTracking}
            disabled={isRerunning}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              color: '#e2e8f0',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: isRerunning ? 'not-allowed' : 'pointer'
            }}
          >
            {isRerunning ? '⟳ Syncing...' : '🔄 Re-run Tracking'}
          </button>
        </div>
      </div>

      {/* ── Sprint Mini-Gantt Track ── */}
      <div style={{
        background: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '1rem',
        marginBottom: '1.25rem'
      }}>
        {/* Pacing & Progress stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#34d399' }}>{progress}%</span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
              ({doneCount} of {milestones.length} phases completed)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>
              Pace: <strong style={{ color: '#38bdf8' }}>{metrics.pace || 'On Schedule'}</strong>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>
              Workload: <strong style={{ color: '#818cf8' }}>{metrics.weeklyWorkloadPerStudent || '10 hrs/wk'}</strong>
            </span>
          </div>
        </div>

        {/* Multi-segment Gantt bar */}
        <div style={{ display: 'flex', gap: 4, height: 10, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.08)', padding: 2 }}>
          {milestones.map((m, idx) => {
            const isDone = m.completed;
            const isCurrent = !isDone && (idx === 0 || milestones[idx - 1]?.completed);
            return (
              <div
                key={m.id || idx}
                title={`${m.phase}: ${m.title} (${isDone ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'})`}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  background: isDone 
                    ? 'linear-gradient(90deg, #10b981, #34d399)' 
                    : isCurrent 
                      ? 'linear-gradient(90deg, #6366f1, #818cf8)' 
                      : 'rgba(255,255,255,0.1)',
                  boxShadow: isDone 
                    ? '0 0 8px rgba(16,185,129,0.5)' 
                    : isCurrent 
                      ? '0 0 10px rgba(99,102,241,0.6)' 
                      : 'none',
                  transition: 'all 0.3s ease'
                }}
              />
            );
          })}
        </div>

        {/* Phase Week Marks */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>
          {milestones.map((m, idx) => (
            <span key={idx} style={{ textAlign: 'center', flex: 1 }}>
              {m.weekLabel || `Wk ${idx + 1}`}
            </span>
          ))}
        </div>
      </div>

      {/* ── Interactive Phase Cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {milestones.map((m, idx) => {
          const isExpanded = expandedPhaseId === m.id || (expandedPhaseId === null && idx === 0);
          const isDone = m.completed;
          const currentEvidence = m.evidenceUrl || evidenceInputs[m.id] || '';

          return (
            <div
              key={m.id || idx}
              style={{
                background: isDone 
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(15,23,42,0.8) 100%)' 
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isDone ? 'rgba(16,185,129,0.35)' : isExpanded ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 12,
                padding: '0.9rem 1.1rem',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Card Header Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  {/* Instant Checkbox */}
                  <input
                    type="checkbox"
                    checked={Boolean(isDone)}
                    onChange={() => onToggleMilestone && onToggleMilestone(m.id, !isDone)}
                    title={isDone ? 'Mark in progress' : 'Mark completed'}
                    style={{
                      width: 18,
                      height: 18,
                      accentColor: '#10b981',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  />

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: isDone ? '#34d399' : '#818cf8',
                        textTransform: 'uppercase'
                      }}>
                        {m.phase || `Phase ${idx + 1}`}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>
                        {m.weekLabel || 'Sprint Period'}
                      </span>
                      {m.estimatedEffortHours && (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4, color: 'rgba(255,255,255,0.5)' }}>
                          ⏱️ {m.estimatedEffortHours}h effort
                        </span>
                      )}
                      {m.evidenceUrl && (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '1px 6px', borderRadius: 4, border: '1px solid rgba(56,189,248,0.3)' }}>
                          🔗 Evidence Attached
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: isDone ? '#e2e8f0' : '#f8fafc',
                      textDecoration: isDone ? 'line-through' : 'none',
                      opacity: isDone ? 0.85 : 1,
                      marginTop: 2
                    }}>
                      {m.title}
                    </div>
                  </div>
                </div>

                {/* Expand / Collapse Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => setExpandedPhaseId(isExpanded ? '__none__' : m.id)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.7)',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    {isExpanded ? '▲ Hide Details' : '▼ View Details'}
                  </button>
                </div>
              </div>

              {/* Expanded Details Section */}
              {isExpanded && (
                <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', animation: 'fadeIn 0.2s ease' }}>
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                    {m.description}
                  </div>

                  {/* Deliverables List */}
                  {m.deliverables && m.deliverables.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 4 }}>
                        Key Deliverables:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {m.deliverables.map((d, di) => (
                          <div key={di} style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: '0.76rem', color: '#e2e8f0' }}>
                            <span style={{ color: isDone ? '#34d399' : '#818cf8' }}>{isDone ? '✓' : '•'}</span>
                            <span>{d}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Faculty Checkpoint Criteria */}
                  {m.acceptanceCriteria && m.acceptanceCriteria.length > 0 && (
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.6rem 0.8rem', borderRadius: 8, marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>🎯</span> Faculty Acceptance Criteria:
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#fef3c7' }}>
                        {m.acceptanceCriteria.join(' · ')}
                      </div>
                    </div>
                  )}

                  {/* Deliverable Evidence Submission Input */}
                  <div style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 8, padding: '0.65rem 0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>📎</span> Deliverable Proof / Evidence URL (GitHub PR / Live Demo):
                      </span>
                      {editingEvidenceId !== m.id && (
                        <button
                          onClick={() => {
                            setEditingEvidenceId(m.id);
                            setEvidenceInputs(prev => ({ ...prev, [m.id]: m.evidenceUrl || '' }));
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                          {m.evidenceUrl ? '✏️ Edit Link' : '+ Add Link'}
                        </button>
                      )}
                    </div>

                    {editingEvidenceId === m.id ? (
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <input
                          type="text"
                          value={evidenceInputs[m.id] !== undefined ? evidenceInputs[m.id] : (m.evidenceUrl || '')}
                          onChange={e => setEvidenceInputs(prev => ({ ...prev, [m.id]: e.target.value }))}
                          placeholder="e.g., https://github.com/myorg/project/pull/4 or https://demo.app"
                          style={{
                            flex: 1,
                            background: '#0f172a',
                            border: '1px solid rgba(56,189,248,0.4)',
                            borderRadius: 6,
                            color: '#fff',
                            fontSize: '0.75rem',
                            padding: '0.4rem 0.65rem',
                            fontFamily: 'inherit'
                          }}
                        />
                        <button
                          onClick={() => setEditingEvidenceId(null)}
                          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: '0.68rem', padding: '3px 8px', borderRadius: 4, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEvidence(m.id)}
                          style={{ background: '#0284c7', border: 'none', color: '#fff', fontSize: '0.68rem', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.74rem' }}>
                        {m.evidenceUrl ? (
                          <a
                            href={m.evidenceUrl.startsWith('http') ? m.evidenceUrl : `https://${m.evidenceUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#38bdf8', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <span>🔗</span> {m.evidenceUrl}
                          </a>
                        ) : (
                          <span style={{ color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                            No evidence URL submitted yet. Add GitHub PR, commit, or demo link for faculty verification.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
