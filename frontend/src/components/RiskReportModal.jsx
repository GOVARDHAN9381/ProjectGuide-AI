import { useEffect, useRef } from 'react';

/**
 * RiskReportModal
 *
 * Displays the output of Agent 4 (Risk Assessment & Mitigation Agent).
 * Key sections:
 *  - Traffic-light overall risk rating (High / Medium / Low) with score gauge
 *  - Executive summary
 *  - Top 3 blockers with immediate action items
 *  - Full risk register table (colour-coded by risk level)
 *  - Reasoning chain (step-by-step derivation from Agents 1, 2, 3)
 */
export default function RiskReportModal({ report, project, onClose }) {
  const backdropRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  if (!report) return null;

  const risks       = report.risks       || [];
  const topBlockers = report.topBlockers || [];
  const reasoning   = report.reasoning   || [];
  const score       = report.riskScore   ?? 50;
  const level       = report.overallRisk || 'Medium';

  // Traffic-light colour scheme
  const riskColor = level === 'High'
    ? '#ef4444'
    : level === 'Medium'
    ? '#f59e0b'
    : '#10b981';

  const riskEmoji = level === 'High' ? '🔴' : level === 'Medium' ? '🟡' : '🟢';

  // Row colour based on combined likelihood + impact
  const rowColor = (likelihood, impact) => {
    const score = (
      (likelihood === 'High' ? 3 : likelihood === 'Medium' ? 2 : 1) +
      (impact === 'High' ? 3 : impact === 'Medium' ? 2 : 1)
    );
    if (score >= 5) return 'rgba(239,68,68,0.08)';
    if (score >= 3) return 'rgba(245,158,11,0.06)';
    return 'rgba(16,185,129,0.04)';
  };

  const pillColor = (val) =>
    val === 'High' ? { bg: 'rgba(239,68,68,0.18)', color: '#ef4444' }
    : val === 'Medium' ? { bg: 'rgba(245,158,11,0.18)', color: '#f59e0b' }
    : { bg: 'rgba(16,185,129,0.18)', color: '#10b981' };

  const categoryIcons = {
    Technical: '⚙️',
    Timeline: '⏱️',
    Resource: '💰',
    Scope: '📐',
    External: '🌐',
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div style={{
        background: 'linear-gradient(135deg, #0f1117 0%, #1a1d2e 100%)',
        border: `1px solid ${riskColor}30`,
        borderRadius: '1.25rem',
        width: '100%', maxWidth: '820px',
        maxHeight: '90vh', overflowY: 'auto',
        padding: '2rem',
        boxShadow: `0 0 60px ${riskColor}18, 0 24px 48px rgba(0,0,0,0.6)`,
        scrollbarWidth: 'thin',
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '1.6rem' }}>⚠️</span>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#fff', fontWeight: 700 }}>
                Risk Assessment & Mitigation
              </h2>
              {report.aiGenerated && (
                <span style={{
                  padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem',
                  background: `${riskColor}20`, color: riskColor,
                  border: `1px solid ${riskColor}40`, fontWeight: 600,
                }}>
                  ✨ AI Generated
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>
              {project?.title} · Agent 4 of 5 · Powered by CrewAI + Groq
            </div>
            <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: `${riskColor}cc`,
              display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🔗</span>
              <span>Chained from Feasibility + Scope + Tech Stack Reports</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', borderRadius: '0.5rem', padding: '0.4rem 0.8rem',
              cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0,
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* ── Overall Risk Badge + Gauge ── */}
        <div style={{
          display: 'flex', gap: '1rem', alignItems: 'stretch', marginBottom: '1.75rem', flexWrap: 'wrap',
        }}>
          {/* Badge */}
          <div style={{
            background: `${riskColor}12`,
            border: `2px solid ${riskColor}50`,
            borderRadius: '1rem',
            padding: '1.25rem 1.5rem',
            minWidth: '160px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '0.4rem',
          }}>
            <div style={{ fontSize: '2.2rem' }}>{riskEmoji}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: riskColor }}>{level}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Overall Risk
            </div>
          </div>

          {/* Score gauge */}
          <div style={{
            flex: 1, minWidth: '200px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1rem', padding: '1.1rem 1.25rem',
          }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.6rem' }}>
              Risk Score
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                flex: 1, height: '10px', borderRadius: '999px',
                background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${score}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${riskColor}88, ${riskColor})`,
                  borderRadius: '999px',
                  transition: 'width 0.6s ease',
                }} />
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: riskColor, minWidth: '42px' }}>
                {score}
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>
              Composite score (0 = minimal risk, 100 = critical risk)
            </div>
          </div>
        </div>

        {/* ── Executive Summary ── */}
        {report.summary && (
          <div style={{
            background: `${riskColor}08`,
            border: `1px solid ${riskColor}25`,
            borderRadius: '0.85rem',
            padding: '1rem 1.25rem',
            marginBottom: '1.75rem',
          }}>
            <div style={{ fontSize: '0.72rem', color: riskColor, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.45rem' }}>
              📋 Executive Summary
            </div>
            <div style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.82)', lineHeight: 1.65 }}>
              {report.summary}
            </div>
          </div>
        )}

        {/* ── Top Blockers ── */}
        {topBlockers.length > 0 && (
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{
              fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem',
            }}>
              ⚡ Top Blockers — Immediate Action Required
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {topBlockers.map((blocker, i) => (
                <div key={i} style={{
                  background: 'rgba(239,68,68,0.07)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '0.85rem',
                  padding: '0.9rem 1rem',
                }}>
                  <div style={{
                    fontSize: '0.7rem', color: '#ef4444', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem',
                  }}>
                    🚨 Blocker {i + 1}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600, marginBottom: '0.4rem', lineHeight: 1.4 }}>
                    {blocker.title}
                  </div>
                  <div style={{ fontSize: '0.77rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>→ </span>
                    {blocker.action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Risk Register ── */}
        {risks.length > 0 && (
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{
              fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem',
            }}>
              📋 Risk Register ({risks.length} risks identified)
            </div>
            <div style={{ borderRadius: '0.85rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '56px 1fr 90px 76px 76px 76px',
                background: 'rgba(255,255,255,0.05)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                padding: '0.55rem 0.85rem',
                gap: '0.5rem',
              }}>
                {['ID', 'Risk & Mitigation', 'Category', 'Likelihood', 'Impact', 'Owner'].map(h => (
                  <div key={h} style={{
                    fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)',
                    textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600,
                  }}>{h}</div>
                ))}
              </div>

              {/* Rows */}
              {risks.map((risk, i) => {
                const lp = pillColor(risk.likelihood);
                const ip = pillColor(risk.impact);
                return (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '56px 1fr 90px 76px 76px 76px',
                    background: rowColor(risk.likelihood, risk.impact),
                    borderBottom: i < risks.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    padding: '0.75rem 0.85rem',
                    gap: '0.5rem',
                    alignItems: 'start',
                  }}>
                    {/* ID */}
                    <div style={{ fontSize: '0.75rem', color: riskColor, fontWeight: 700, paddingTop: '0.1rem' }}>
                      {risk.id}
                    </div>
                    {/* Risk + Mitigation */}
                    <div>
                      <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600, marginBottom: '0.25rem' }}>
                        {risk.title}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: '0.35rem' }}>
                        {risk.description}
                      </div>
                      <div style={{
                        fontSize: '0.75rem', color: 'rgba(16,185,129,0.9)',
                        background: 'rgba(16,185,129,0.08)', borderRadius: '0.4rem',
                        padding: '0.3rem 0.5rem', lineHeight: 1.5,
                      }}>
                        <span style={{ fontWeight: 600 }}>✅ Mitigation: </span>
                        {risk.mitigation}
                      </div>
                    </div>
                    {/* Category */}
                    <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.6)', paddingTop: '0.1rem' }}>
                      {categoryIcons[risk.category] || '📌'} {risk.category}
                    </div>
                    {/* Likelihood */}
                    <div style={{ paddingTop: '0.1rem' }}>
                      <span style={{
                        padding: '0.15rem 0.45rem', borderRadius: '999px', fontSize: '0.7rem',
                        background: lp.bg, color: lp.color, fontWeight: 600,
                      }}>{risk.likelihood}</span>
                    </div>
                    {/* Impact */}
                    <div style={{ paddingTop: '0.1rem' }}>
                      <span style={{
                        padding: '0.15rem 0.45rem', borderRadius: '999px', fontSize: '0.7rem',
                        background: ip.bg, color: ip.color, fontWeight: 600,
                      }}>{risk.impact}</span>
                    </div>
                    {/* Owner */}
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', paddingTop: '0.1rem', lineHeight: 1.4 }}>
                      {risk.owner}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Reasoning Chain ── */}
        {reasoning.length > 0 && (
          <div>
            <div style={{
              fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem',
            }}>
              🧠 Step-by-Step Reasoning Chain
            </div>
            <div style={{
              background: `${riskColor}05`,
              border: `1px solid ${riskColor}20`,
              borderRadius: '0.85rem',
              padding: '1rem 1.25rem',
            }}>
              <div style={{ fontSize: '0.72rem', color: `${riskColor}aa`, marginBottom: '0.75rem', fontStyle: 'italic' }}>
                How risks were derived from the Feasibility, Scope, and Tech Stack reports:
              </div>
              <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {reasoning.map((step, i) => (
                  <li key={i} style={{
                    fontSize: '0.83rem',
                    color: 'rgba(255,255,255,0.8)',
                    lineHeight: 1.6,
                    paddingBottom: i < reasoning.length - 1 ? '0.65rem' : 0,
                    borderBottom: i < reasoning.length - 1 ? `1px solid ${riskColor}10` : 'none',
                    marginBottom: i < reasoning.length - 1 ? '0.65rem' : 0,
                  }}>
                    <span style={{ color: riskColor, fontWeight: 600 }}>Step {i + 1}: </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
