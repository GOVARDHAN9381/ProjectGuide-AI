import { showToast } from '../utils/toast';

/* ── Section heading ── */
function Heading({ icon, title, color = '#94a3b8', sub }) {
  return (
    <div style={{ marginBottom: '0.7rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color }}>
        <span>{icon}</span>{title}
      </div>
      {sub && <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#475569', fontStyle: 'italic' }}>{sub}</p>}
    </div>
  );
}

/* ── Colored item row ── */
function Item({ text, icon, iconColor }) {
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'flex-start',
      padding: '0.6rem 0.85rem', borderRadius: 9,
      background: `${iconColor}0d`, border: `1px solid ${iconColor}28`,
      fontSize: '0.83rem', color: '#cbd5e1', lineHeight: 1.55,
    }}>
      <span style={{ color: iconColor, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

export default function ScopeReportModal({ isOpen, onClose, report, project, onProceedToTechStack }) {
  if (!isOpen || !report) return null;

  const {
    problemStatement = '',
    objectives = [],
    inScope = [],
    outOfScope = [],
    targetUsers = '',
    keyDeliverables = [],
    assumptions = [],
    constraints = [],
    aiGenerated = false,
    feasibilityAlignment = '',
  } = report;

  // Agent chaining: feasibility report can come from report, or directly from project
  const activeFeasReport = report.feasibilityReport || project?.feasibilityReport || project?.feasibility_report || null;

  const title  = project?.title || 'Academic Project';
  const domain = (project?.domain || 'web').toUpperCase();

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `SCOPE DEFINITION — ${title}\nProblem: ${problemStatement}\nIn Scope: ${inScope.join('; ')}\nOut of Scope: ${outOfScope.join('; ')}\nTargetUsers: ${targetUsers}\nDeliverables: ${keyDeliverables.join('; ')}\nObjectives: ${objectives.join('; ')}`
    );
    showToast('Scope report copied!', '📋');
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
      <style>{`@keyframes scopeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{
        width: '100%', maxWidth: 740, maxHeight: '90vh',
        background: '#0f1521',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 18,
        boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'scopeUp 0.28s cubic-bezier(.22,1,.36,1)',
      }}>

        {/* ══ HEADER BANNER ══ */}
        {/* Purple top accent bar */}
        <div style={{ height: 5, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />

        <div style={{
          background: 'linear-gradient(135deg,rgba(99,102,241,0.18) 0%,rgba(139,92,246,0.12) 60%,rgba(15,21,33,0) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '1.25rem 1.5rem',
        }}>
          {/* Badges + close */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.9rem' }}>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <span style={{
                fontSize:'0.67rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em',
                color:'#c4b5fd', background:'rgba(139,92,246,0.2)',
                border:'1px solid rgba(139,92,246,0.38)', padding:'2px 10px', borderRadius:999,
              }}>{aiGenerated ? '🧠 CrewAI Scope Agent' : '⚡ Heuristic Scope'}</span>
              <span style={{
                fontSize:'0.67rem', fontWeight:700, color:'rgba(255,255,255,0.4)',
                background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)',
                padding:'2px 10px', borderRadius:999,
              }}>{domain}</span>
              {activeFeasReport && (
                <span style={{
                  fontSize:'0.67rem', fontWeight:700, color:'#60a5fa',
                  background:'rgba(59,130,246,0.15)', border:'1px solid rgba(59,130,246,0.3)',
                  padding:'2px 10px', borderRadius:999,
                }}>🔗 Chained with Agent 1</span>
              )}
            </div>
            <button onClick={onClose} style={{
              width:30, height:30, borderRadius:'50%',
              background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)',
              color:'rgba(255,255,255,0.5)', fontSize:'0.9rem', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>✕</button>
          </div>

          {/* Title */}
          <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.35)', marginBottom:3 }}>📐 Scope Definition Report</div>
          <h2 style={{ margin:'0 0 0.85rem', fontSize:'1.25rem', fontWeight:800, color:'#f1f5f9', lineHeight:1.3 }}>
            {title}
          </h2>

          {/* Quick stat counters */}
          <div style={{ display:'flex', gap:'1.25rem', flexWrap:'wrap' }}>
            {[
              { label:'In Scope',     val:inScope.length,         color:'#4ade80' },
              { label:'Out of Scope', val:outOfScope.length,      color:'#f87171' },
              { label:'Objectives',   val:objectives.length,      color:'#a5b4fc' },
              { label:'Deliverables', val:keyDeliverables.length, color:'#38bdf8' },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize:'1.3rem', fontWeight:900, color:s.color, lineHeight:1 }}>{s.val}</div>
                <div style={{ fontSize:'0.63rem', color:'rgba(255,255,255,0.3)', marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>


        {/* ══ SCROLLABLE BODY ══ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* ══ FEASIBILITY CONTEXT BANNER (chained from Agent 1) ══ */}
          {activeFeasReport ? (
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.25) 0%, rgba(15, 23, 42, 0.5) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              borderRadius: 14,
              padding: '1rem 1.15rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid rgba(59, 130, 246, 0.2)', paddingBottom: '0.6rem', marginBottom: '0.75rem',
              }}>
                <div style={{
                  fontSize: '0.74rem', color: '#93c5fd', fontWeight: 800,
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                  display: 'flex', alignItems: 'center', gap: '0.45rem',
                }}>
                  <span>🔗</span> Agent 1 Output — Feasibility Assessment
                </div>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                  background: (activeFeasReport.overallScore || 0) >= 75 ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)',
                  color: (activeFeasReport.overallScore || 0) >= 75 ? '#4ade80' : '#fbbf24',
                  border: `1px solid ${(activeFeasReport.overallScore || 0) >= 75 ? 'rgba(34,197,94,0.4)' : 'rgba(245,158,11,0.4)'}`,
                }}>
                  {activeFeasReport.verdict || 'Evaluated'}
                </span>
              </div>

              {/* Metrics Grid */}
              <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{
                  background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.85rem', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                  <div style={{
                    fontSize: '1.5rem', fontWeight: 900, lineHeight: 1,
                    color: (activeFeasReport.overallScore || 0) >= 80 ? '#4ade80' : (activeFeasReport.overallScore || 0) >= 65 ? '#fbbf24' : '#f87171',
                  }}>
                    {activeFeasReport.overallScore ?? '—'}%
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.2 }}>
                    Feasibility<br/>Score
                  </div>
                </div>

                {['technical', 'timeline', 'resource', 'skillMatch'].map(k => (
                  <div key={k} style={{
                    textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.45rem 0.75rem',
                    borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', minWidth: 64,
                  }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0' }}>
                      {activeFeasReport.metrics?.[k] ?? '—'}%
                    </div>
                    <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize', marginTop: 1 }}>
                      {k === 'skillMatch' ? 'Skills' : k}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottlenecks / Risks handled */}
              {activeFeasReport.bottlenecks?.length > 0 && (
                <div style={{
                  marginTop: '0.5rem', padding: '0.55rem 0.75rem', borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                  fontSize: '0.74rem', color: '#fca5a5', lineHeight: 1.45,
                }}>
                  <strong style={{ color: '#f87171' }}>⚠️ Identified Bottlenecks:</strong>{' '}
                  {activeFeasReport.bottlenecks.join(' · ')}
                </div>
              )}

              {/* How Scope addressed Feasibility */}
              {feasibilityAlignment && (
                <div style={{
                  marginTop: '0.5rem', padding: '0.55rem 0.75rem', borderRadius: 8,
                  background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)',
                  fontSize: '0.75rem', color: '#bfdbfe', lineHeight: 1.5,
                }}>
                  <strong style={{ color: '#60a5fa' }}>💡 Scope Alignment with Feasibility:</strong>{' '}
                  {feasibilityAlignment}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              background: 'rgba(245, 158, 11, 0.06)',
              border: '1px dashed rgba(245, 158, 11, 0.3)',
              borderRadius: 10,
              padding: '0.75rem 1rem',
              fontSize: '0.77rem',
              color: '#fcd34d',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>ℹ️</span>
              <div>
                <strong>Agent 1 (Feasibility Check) Not Run:</strong> Run the Feasibility Agent first on your project card to automatically pass technical constraints and bottlenecks into this Scope Definition!
              </div>
            </div>
          )}

          {/* Beginner tip */}
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 10, padding: '0.75rem 1rem',
          }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>💡</span>
            <p style={{ margin: 0, fontSize: '0.79rem', color: '#94a3b8', lineHeight: 1.6 }}>
              <strong style={{ color: '#e2e8f0' }}>What is Scope Definition?</strong>{' '}
              It draws a clear boundary around your project — exactly <strong style={{ color: '#e2e8f0' }}>what you will build</strong>, what you won't, and who it's for. Without this, projects grow out of control (scope creep) and miss deadlines.
            </p>
          </div>

          {/* ── Problem Statement ── */}
          {problemStatement && (
            <div>
              <Heading icon="🎯" title="Problem Statement" color="#a5b4fc" sub="The core problem your project solves — every decision connects back to this" />
              <div style={{
                background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 12, padding: '1rem 1.1rem',
                fontSize: '0.875rem', color: '#e2e8f0', lineHeight: 1.75,
              }}>
                {problemStatement}
              </div>
            </div>
          )}

          {/* ── Objectives ── */}
          {objectives.length > 0 && (
            <div>
              <Heading icon="🏆" title="Project Objectives" color="#a5b4fc" sub="Specific goals — your success checklist" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {objectives.map((o, i) => (
                  <Item key={i} text={o} icon={`${i + 1}`} iconColor="#a5b4fc" />
                ))}
              </div>
            </div>
          )}

          {/* ── In Scope / Out of Scope ── */}
          {(inScope.length > 0 || outOfScope.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: '0.85rem' }}>

              {/* In Scope */}
              <div style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14, padding: '1rem' }}>
                <Heading icon="✅" title="In Scope" color="#4ade80" sub="Features you WILL build" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {inScope.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                      <span style={{ color: '#4ade80', fontWeight: 800, flexShrink: 0 }}>✓</span>{s}
                    </div>
                  ))}
                </div>
              </div>

              {/* Out of Scope */}
              <div style={{ background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 14, padding: '1rem' }}>
                <Heading icon="🚫" title="Out of Scope" color="#f87171" sub="Defer to Phase 2 — avoid scope creep" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {outOfScope.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                      <span style={{ color: '#f87171', fontWeight: 800, flexShrink: 0 }}>✗</span>{s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Target Users ── */}
          {targetUsers && (
            <div>
              <Heading icon="👥" title="Target Users" color="#fbbf24" sub="Who will use this — drives all design and feature decisions" />
              <div style={{
                background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)',
                borderRadius: 12, padding: '0.9rem 1.1rem',
                fontSize: '0.875rem', color: '#e2e8f0', lineHeight: 1.65,
              }}>
                {targetUsers}
              </div>
            </div>
          )}

          {/* ── Key Deliverables ── */}
          {keyDeliverables.length > 0 && (
            <div>
              <Heading icon="📦" title="Key Deliverables" color="#38bdf8" sub="Tangible outputs you hand over at the end of the project" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {keyDeliverables.map((d, i) => (
                  <Item key={i} text={d} icon="→" iconColor="#38bdf8" />
                ))}
              </div>
            </div>
          )}

          {/* ── Assumptions + Constraints ── */}
          {(assumptions.length > 0 || constraints.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: '0.85rem' }}>

              {assumptions.length > 0 && (
                <div>
                  <Heading icon="💭" title="Assumptions" color="#c4b5fd" sub="Things AI assumes are true (internet, tools, stable team)" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {assumptions.map((a, i) => <Item key={i} text={a} icon="~" iconColor="#c4b5fd" />)}
                  </div>
                </div>
              )}

              {constraints.length > 0 && (
                <div>
                  <Heading icon="⛓️" title="Constraints" color="#fb923c" sub="Hard limits you cannot change — deadline, budget, team size" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {constraints.map((c, i) => <Item key={i} text={c} icon="!" iconColor="#fb923c" />)}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ══ FOOTER ══ */}
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
          <div style={{ display: 'flex', gap: 8 }}>
            {onProceedToTechStack && project && (
              <button
                onClick={() => onProceedToTechStack(project)}
                style={{
                  padding: '0.42rem 1.1rem', borderRadius: 8,
                  background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                  border: 'none', color: '#fff', fontSize: '0.82rem',
                  fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
                }}
              >
                <span>🛠️ Tech Stack (Agent 3)</span>
                <span>➔</span>
              </button>
            )}
            <button onClick={onClose} style={{
              padding: '0.42rem 1.2rem', borderRadius: 8,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)', color: '#cbd5e1', fontSize: '0.84rem',
              fontWeight: 600, cursor: 'pointer',
            }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
