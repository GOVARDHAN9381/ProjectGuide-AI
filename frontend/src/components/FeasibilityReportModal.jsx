import { showToast } from '../utils/toast';

const COLOR = {
  high:   { text: '#4ade80', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)'   },
  mid:    { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)',   border: 'rgba(251,191,36,0.3)'   },
  low:    { text: '#f87171', bg: 'rgba(248,113,113,0.12)',  border: 'rgba(248,113,113,0.3)'  },
};

function scoreColor(v) {
  return v >= 75 ? COLOR.high : v >= 55 ? COLOR.mid : COLOR.low;
}


function MetricBar({ icon, label, value }) {
  const c = scoreColor(value);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>{icon}</span>{label}
        </span>
        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: c.text }}>{value}%</span>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${value}%`, borderRadius: 999,
          background: `linear-gradient(90deg, ${c.text}99, ${c.text})`,
          transition: 'width 0.8s ease',
        }} />
      </div>
    </div>
  );
}

export default function FeasibilityReportModal({ isOpen, onClose, report, project }) {
  if (!isOpen || !report) return null;

  const {
    overallScore = 0, verdict = '', metrics = {},
    strengths = [], bottlenecks = [],
    filesAnalyzed = [], aiGenerated = false,
  } = report;

  const title  = project?.title || 'Academic Project';
  const domain = (project?.domain || 'web').toUpperCase();
  const days   = project?.durationDays || 30;
  const team   = project?.teamSize || 3;
  const c      = scoreColor(overallScore);

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `FEASIBILITY REPORT — ${title}\nScore: ${overallScore}% | ${verdict}\nTechnical: ${metrics.technical||0}% | Timeline: ${metrics.timeline||0}% | Resource: ${metrics.resource||0}% | Skill-Match: ${metrics.skillMatch||0}%\nStrengths: ${strengths.join('; ')}\nBottlenecks: ${bottlenecks.join('; ')}`
    );
    showToast('Report copied!', '📋');
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: 680, maxHeight: '90vh',
        background: '#0f1521',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 18,
        boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'rptSlide 0.28s cubic-bezier(.22,1,.36,1)',
      }}>
        <style>{`@keyframes rptSlide{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* ══ SCORE HERO BANNER ══ */}
        {/* Thick coloured top accent bar */}
        <div style={{ height: 5, background: `linear-gradient(90deg, ${c.text}, ${c.text}55)` }} />

        <div style={{
          background: `linear-gradient(135deg, ${c.text}14 0%, rgba(15,21,33,0) 60%)`,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '1.25rem 1.5rem',
        }}>
          {/* Row 1 — badges + close */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.67rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                color: '#a5b4fc', background: 'rgba(99,102,241,0.2)',
                border: '1px solid rgba(99,102,241,0.35)', padding: '2px 10px', borderRadius: 999,
              }}>{aiGenerated ? '🤖 CrewAI + Groq LLM' : '⚡ Heuristic'}</span>
              <span style={{
                fontSize: '0.67rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '2px 10px', borderRadius: 999,
              }}>{domain}</span>
            </div>
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>

          {/* Row 2 — BIG score + project info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>

            {/* HUGE Score block */}
            <div style={{
              minWidth: 120, textAlign: 'center',
              background: c.bg, border: `2px solid ${c.text}`,
              borderRadius: 16, padding: '0.85rem 1.25rem',
              boxShadow: `0 0 28px ${c.text}30`,
            }}>
              <div style={{ fontSize: '2.8rem', fontWeight: 900, color: c.text, lineHeight: 1, letterSpacing: '-1px' }}>
                {overallScore}%
              </div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
                Feasibility Score
              </div>
            </div>

            {/* Title + verdict */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>
                📊 Feasibility Report · {days} days · Team of {team}
              </div>
              <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.3 }}>
                {title}
              </h2>
              {verdict && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 14px', borderRadius: 999,
                  background: c.bg, border: `1px solid ${c.border}`,
                  fontSize: '0.82rem', fontWeight: 700, color: c.text,
                }}>
                  {overallScore >= 80 ? '✅' : overallScore >= 65 ? '⚠️' : '🛑'} {verdict}
                </div>
              )}
            </div>
          </div>

          {/* Row 3 — mini metric pills */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {[
              { icon: '⚙️', label: 'Technical',  val: metrics.technical  || 0 },
              { icon: '⏱️', label: 'Timeline',   val: metrics.timeline   || 0 },
              { icon: '📦', label: 'Resource',   val: metrics.resource   || 0 },
              { icon: '🎯', label: 'Skill Match', val: metrics.skillMatch || 0 },
            ].map((m, i) => {
              const mc = scoreColor(m.val);
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                  fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)',
                }}>
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                  <span style={{ fontWeight: 800, color: mc.text }}>{m.val}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Beginner tip */}
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)',
            borderRadius: 10, padding: '0.75rem 1rem',
          }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>💡</span>
            <p style={{ margin: 0, fontSize: '0.79rem', color: '#94a3b8', lineHeight: 1.6 }}>
              <strong style={{ color: '#e2e8f0' }}>What is Feasibility?</strong>{' '}
              It measures how realistic your project is — can your team finish it within the deadline with available skills and tools?{' '}
              <strong style={{ color: '#e2e8f0' }}>Higher = more achievable.</strong> A low score means the scope may need trimming, not that the idea is bad.
            </p>
          </div>

          {/* ── Metrics Grid ── */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: 10 }}>
              ▸ Evaluation Dimensions
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px,1fr))', gap: '0.75rem' }}>
              {[
                { icon: '⚙️', label: 'Technical Complexity',   value: metrics.technical  || 0 },
                { icon: '⏱️', label: 'Timeline Sufficiency',   value: metrics.timeline   || 0 },
                { icon: '📦', label: 'Resource Availability',  value: metrics.resource   || 0 },
                { icon: '🎯', label: 'Student Skill Match',     value: metrics.skillMatch || 0 },
              ].map((m, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12, padding: '0.85rem 1rem',
                }}>
                  <MetricBar {...m} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Two column: Strengths + Bottlenecks ── */}
          {(strengths.length > 0 || bottlenecks.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: '0.85rem' }}>

              {strengths.length > 0 && (
                <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 12, padding: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4ade80', marginBottom: 4 }}>
                    ✨ Strengths
                  </div>
                  <p style={{ fontSize: '0.7rem', color: '#475569', fontStyle: 'italic', margin: '0 0 0.65rem' }}>Positive aspects increasing success chances</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {strengths.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                        <span style={{ color: '#4ade80', fontWeight: 800, flexShrink: 0 }}>✓</span>{s}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bottlenecks.length > 0 && (
                <div style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.18)', borderRadius: 12, padding: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fbbf24', marginBottom: 4 }}>
                    ⚠️ Bottlenecks
                  </div>
                  <p style={{ fontSize: '0.7rem', color: '#475569', fontStyle: 'italic', margin: '0 0 0.65rem' }}>Address these early to avoid delays</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {bottlenecks.map((b, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                        <span style={{ color: '#fbbf24', fontWeight: 800, flexShrink: 0 }}>!</span>{b}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Files analyzed */}
          {filesAnalyzed.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', fontSize: '0.75rem', color: '#475569' }}>
              <span>📎 Analyzed:</span>
              {filesAnalyzed.map((f, i) => (
                <span key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 6, color: '#64748b' }}>{f}</span>
              ))}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '0.85rem 1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '0.75rem', flexWrap: 'wrap',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <button onClick={handleCopy} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0.42rem 0.9rem', borderRadius: 8,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
          }}>
            📋 Copy Report
          </button>
          <button onClick={onClose} style={{
            padding: '0.42rem 1.4rem', borderRadius: 8,
            background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
            border: 'none', color: '#fff', fontSize: '0.84rem',
            fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
