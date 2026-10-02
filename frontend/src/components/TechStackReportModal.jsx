import { useEffect, useRef } from 'react';

/**
 * TechStackReportModal
 *
 * Displays the output of Agent 3 (Tech Stack Recommendation Agent).
 * The key feature is the Reasoning Chain section — a step-by-step
 * explanation of HOW each technology was chosen, derived from the
 * upstream Feasibility and Scope reports (agent chaining).
 */
export default function TechStackReportModal({ report, project, onClose }) {
  const backdropRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  if (!report) return null;

  const stack = report.recommendedStack || {};
  const reasoning = report.reasoning || [];
  const alternatives = report.alternatives || [];
  const resources = report.learningResources || [];

  const layers = [
    { key: 'frontend',  label: 'Frontend',   icon: '🖥️',  color: '#3b82f6' },
    { key: 'backend',   label: 'Backend',    icon: '⚙️',  color: '#8b5cf6' },
    { key: 'database',  label: 'Database',   icon: '🗄️',  color: '#10b981' },
    { key: 'apis',      label: 'APIs / Services', icon: '🔌', color: '#f59e0b' },
    { key: 'devops',    label: 'DevOps / CI', icon: '🚀',  color: '#ef4444' },
    { key: 'testing',   label: 'Testing',    icon: '🧪',  color: '#6366f1' },
  ];

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div style={{
        background: 'linear-gradient(135deg, #0f1117 0%, #1a1d2e 100%)',
        border: '1px solid rgba(245,158,11,0.25)',
        borderRadius: '1.25rem',
        width: '100%', maxWidth: '760px',
        maxHeight: '90vh', overflowY: 'auto',
        padding: '2rem',
        boxShadow: '0 0 60px rgba(245,158,11,0.12), 0 24px 48px rgba(0,0,0,0.6)',
        scrollbarWidth: 'thin',
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '1.6rem' }}>🛠️</span>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#fff', fontWeight: 700 }}>
                Tech Stack Recommendation
              </h2>
              {report.aiGenerated && (
                <span style={{
                  padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem',
                  background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                  border: '1px solid rgba(245,158,11,0.3)', fontWeight: 600,
                }}>
                  ✨ AI Generated
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>
              {project?.title} · Agent 3 of 5 · Powered by CrewAI + Groq
            </div>
            <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: 'rgba(245,158,11,0.7)',
              display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🔗</span>
              <span>Chained from Feasibility Report + Scope Report</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', borderRadius: '0.5rem', padding: '0.4rem 0.8rem',
              cursor: 'pointer', fontSize: '0.85rem',
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* ── Recommended Stack Grid ── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{
            fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem',
          }}>
            Recommended Technology Stack
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '0.75rem',
          }}>
            {layers.map(({ key, label, icon, color }) => (
              <div key={key} style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${color}30`,
                borderRadius: '0.75rem',
                padding: '0.85rem 1rem',
              }}>
                <div style={{ fontSize: '0.7rem', color: color, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>
                  {icon} {label}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.45 }}>
                  {stack[key] || 'TBD'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Reasoning Chain (the key feature!) ── */}
        {reasoning.length > 0 && (
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{
              fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem',
            }}>
              🧠 Step-by-Step Reasoning Chain
            </div>
            <div style={{
              background: 'rgba(245,158,11,0.04)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: '0.85rem',
              padding: '1rem 1.25rem',
            }}>
              <div style={{ fontSize: '0.72rem', color: 'rgba(245,158,11,0.7)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                How this stack was derived from the Feasibility and Scope reports:
              </div>
              <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {reasoning.map((step, i) => (
                  <li key={i} style={{
                    fontSize: '0.83rem',
                    color: 'rgba(255,255,255,0.8)',
                    lineHeight: 1.6,
                    paddingBottom: i < reasoning.length - 1 ? '0.65rem' : 0,
                    borderBottom: i < reasoning.length - 1 ? '1px solid rgba(245,158,11,0.08)' : 'none',
                    marginBottom: i < reasoning.length - 1 ? '0.65rem' : 0,
                  }}>
                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>Step {i + 1}: </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* ── Overall Justification ── */}
        {report.justification && (
          <div style={{
            background: 'rgba(16,185,129,0.05)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem',
            marginBottom: '1.75rem',
          }}>
            <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem' }}>
              💬 Overall Justification
            </div>
            <div style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.65 }}>
              {report.justification}
            </div>
          </div>
        )}

        {/* ── Alternatives Table ── */}
        {alternatives.length > 0 && (
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{
              fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem',
            }}>
              🔀 Alternative Choices & Trade-offs
            </div>
            <div style={{ borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {['Layer', 'Alternative', 'Trade-off'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '0.6rem 1rem',
                        fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)',
                        textTransform: 'uppercase', letterSpacing: '0.07em',
                        fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alternatives.map((alt, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '0.6rem 1rem', fontSize: '0.8rem',
                        color: '#f59e0b', fontWeight: 600 }}>
                        {alt.layer}
                      </td>
                      <td style={{ padding: '0.6rem 1rem', fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.8)' }}>
                        {alt.alternative}
                      </td>
                      <td style={{ padding: '0.6rem 1rem', fontSize: '0.78rem',
                        color: 'rgba(255,255,255,0.5)' }}>
                        {alt.tradeoff}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Learning Resources ── */}
        {resources.length > 0 && (
          <div>
            <div style={{
              fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem',
            }}>
              📚 Learning Resources
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {resources.map((r, i) => {
                // Try to extract URL if resource contains one
                const urlMatch = r.match(/https?:\/\/[^\s]+/);
                const url = urlMatch ? urlMatch[0] : null;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    fontSize: '0.81rem', color: 'rgba(255,255,255,0.7)',
                  }}>
                    <span style={{ color: '#3b82f6', flexShrink: 0 }}>→</span>
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#60a5fa', textDecoration: 'none' }}
                        onMouseOver={e => e.target.style.textDecoration = 'underline'}
                        onMouseOut={e => e.target.style.textDecoration = 'none'}
                      >
                        {r}
                      </a>
                    ) : (
                      <span>{r}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
