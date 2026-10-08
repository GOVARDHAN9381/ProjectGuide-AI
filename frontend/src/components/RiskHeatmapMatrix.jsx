import React, { useState } from 'react';

/**
 * RiskHeatmapMatrix Component
 * 
 * Provides:
 * 1. An interactive 3x3 Risk Heatmap Matrix (Probability vs Impact)
 * 2. Visual risk markers with click-to-inspect
 * 3. Dynamic Residual / Mitigated Risk Score calculation
 * 4. Interactive Risk Lifecycle controls (Open, In Progress, Mitigated, Resolved)
 * 5. Student mitigation notes and actions
 * 6. Academic Viva / Guide report export
 */
export default function RiskHeatmapMatrix({
  project,
  riskReport,
  onUpdateRiskReport,
  onExportReport
}) {
  const [selectedRiskId, setSelectedRiskId] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  if (!riskReport || !riskReport.risks) return null;

  const risks = riskReport.risks || [];
  const milestones = project?.trackingReport?.milestones || [];
  const completedMilestonesCount = milestones.filter(m => m.completed).length;
  const milestoneProgressPct = milestones.length > 0 
    ? Math.round((completedMilestonesCount / milestones.length) * 100) 
    : 0;

  // Impact and Probability coordinates
  const impactLevels = ['Low', 'Medium', 'High'];
  const probLevels = ['High', 'Medium', 'Low']; // Top to bottom

  // Cell colors based on severity quadrant
  const getCellSeverityColor = (prob, imp) => {
    if (prob === 'High' && imp === 'High') return { bg: 'rgba(239, 68, 68, 0.22)', border: 'rgba(239, 68, 68, 0.45)', label: 'CRITICAL', color: '#f87171' };
    if ((prob === 'High' && imp === 'Medium') || (prob === 'Medium' && imp === 'High')) return { bg: 'rgba(249, 115, 22, 0.18)', border: 'rgba(249, 115, 22, 0.4)', label: 'HIGH', color: '#fb923c' };
    if ((prob === 'High' && imp === 'Low') || (prob === 'Medium' && imp === 'Medium') || (prob === 'Low' && imp === 'High')) return { bg: 'rgba(234, 179, 8, 0.14)', border: 'rgba(234, 179, 8, 0.35)', label: 'MEDIUM', color: '#fde047' };
    return { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)', label: 'LOW', color: '#4ade80' };
  };

  // Group risks into cells
  const getRisksInCell = (prob, imp) => {
    return risks.filter(r => {
      const p = (r.probability || 'Medium').toLowerCase();
      const i = (r.impact || 'Medium').toLowerCase();
      return p === prob.toLowerCase() && i === imp.toLowerCase();
    });
  };

  // Calculate Mitigated / Residual Risk Score
  const baseScore = riskReport.overall_risk_score || 55;
  const mitigatedRisksCount = risks.filter(r => r.status === 'mitigated' || r.status === 'resolved').length;
  const inProgressRisksCount = risks.filter(r => r.status === 'in_progress').length;
  
  // Each mitigated risk reduces risk score, plus milestone progress reduces residual risk
  const riskReductionFactor = Math.min(
    65,
    (mitigatedRisksCount * 14) + (inProgressRisksCount * 6) + Math.round(milestoneProgressPct * 0.25)
  );
  const residualScore = Math.max(12, baseScore - riskReductionFactor);

  const getResidualBadge = (score) => {
    if (score >= 75) return { label: 'CRITICAL', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
    if (score >= 50) return { label: 'HIGH', color: '#f97316', bg: 'rgba(249,115,22,0.15)' };
    if (score >= 30) return { label: 'MEDIUM', color: '#eab308', bg: 'rgba(234,179,8,0.15)' };
    return { label: 'LOW / CONTROLLED', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' };
  };

  const residualBadge = getResidualBadge(residualScore);

  // Status Change Handler
  const handleStatusChange = (riskId, newStatus) => {
    const updatedRisks = risks.map(r => {
      if (r.id === riskId) {
        return { ...r, status: newStatus };
      }
      return r;
    });

    const updatedReport = {
      ...riskReport,
      risks: updatedRisks,
      residual_risk_score: residualScore,
      last_updated: new Date().toISOString()
    };

    if (onUpdateRiskReport) {
      onUpdateRiskReport(updatedReport);
    }
  };

  // Save student mitigation note
  const handleSaveNote = (riskId) => {
    const updatedRisks = risks.map(r => {
      if (r.id === riskId) {
        return { ...r, student_notes: noteText };
      }
      return r;
    });

    const updatedReport = {
      ...riskReport,
      risks: updatedRisks,
      last_updated: new Date().toISOString()
    };

    if (onUpdateRiskReport) {
      onUpdateRiskReport(updatedReport);
    }
    setEditingNoteId(null);
    setNoteText('');
  };

  const categories = ['ALL', ...Array.from(new Set(risks.map(r => r.category || 'General')))];
  const filteredRisks = filterCategory === 'ALL' 
    ? risks 
    : risks.filter(r => (r.category || 'General') === filterCategory);

  const selectedRisk = risks.find(r => r.id === selectedRiskId) || filteredRisks[0] || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ── Top Header: Risk Evolution & De-risking Meter ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.9) 100%)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16,
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: '1.3rem' }}>🎯</span>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
              Academic Risk Heatmap &amp; De-risking Velocity
            </div>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'rgba(99,102,241,0.2)',
              color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.35)'
            }}>
              IEEE / ABET Matrix
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)' }}>
            Track how milestone completions and active mitigations reduce project failure exposure.
          </div>
        </div>

        {/* Dynamic Risk Shift Gauge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.35)', padding: '0.6rem 1.1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>Initial Risk</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171' }}>{baseScore}</div>
          </div>
          <div style={{ fontSize: '1.2rem', color: '#94a3b8' }}>➔</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>Residual Risk</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: residualBadge.color }}>{residualScore}</div>
          </div>
          <div style={{ height: 28, width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: 6,
              background: residualBadge.bg,
              color: residualBadge.color,
              border: `1px solid ${residualBadge.color}40`,
              textAlign: 'center'
            }}>
              {residualBadge.label}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#4ade80', marginTop: 2, textAlign: 'center' }}>
              ▼ -{baseScore - residualScore} pts de-risked
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Layout: Heatmap Grid (Left) + Detail & Action Panel (Right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.15fr) minmax(320px, 1fr)', gap: '1.25rem' }}>
        
        {/* ── LEFT: 3x3 Heatmap Matrix ── */}
        <div style={{
          background: 'rgba(15,23,42,0.65)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📊</span>
              <span>Probability vs. Impact Matrix (3×3)</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
              Click marker to inspect
            </div>
          </div>

          {/* Matrix Container */}
          <div style={{ display: 'flex', flex: 1, position: 'relative', marginTop: '0.5rem' }}>
            
            {/* Y-Axis Label */}
            <div style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              textAlign: 'center',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.12em',
              paddingRight: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              PROBABILITY ➔
            </div>

            {/* Matrix Rows & Cells */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 6 }}>
              {probLevels.map(prob => (
                <div key={prob} style={{ display: 'flex', flex: 1, gap: 6, minHeight: 92 }}>
                  {/* Row Header */}
                  <div style={{
                    width: 58,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: 6
                  }}>
                    {prob}
                  </div>

                  {/* 3 Columns (Low, Medium, High Impact) */}
                  {impactLevels.map(imp => {
                    const cellStyle = getCellSeverityColor(prob, imp);
                    const cellRisks = getRisksInCell(prob, imp);
                    return (
                      <div
                        key={imp}
                        style={{
                          flex: 1,
                          background: cellStyle.bg,
                          border: `1px solid ${cellStyle.border}`,
                          borderRadius: 10,
                          padding: '0.45rem',
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative',
                          transition: 'all 0.15s ease',
                          minHeight: 85
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 4
                        }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: cellStyle.color, opacity: 0.85 }}>
                            {cellStyle.label}
                          </span>
                          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>
                            {cellRisks.length > 0 ? `${cellRisks.length}` : ''}
                          </span>
                        </div>

                        {/* Plotted Risk Badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 'auto' }}>
                          {cellRisks.map(r => {
                            const isSelected = selectedRisk?.id === r.id;
                            const isMitigated = r.status === 'mitigated' || r.status === 'resolved';
                            return (
                              <button
                                key={r.id}
                                onClick={() => setSelectedRiskId(r.id)}
                                title={`${r.id}: ${r.title} (${r.status || 'open'})`}
                                style={{
                                  background: isSelected 
                                    ? '#ffffff' 
                                    : isMitigated 
                                      ? 'rgba(34,197,94,0.3)' 
                                      : 'rgba(15,23,42,0.85)',
                                  color: isSelected 
                                    ? '#0f172a' 
                                    : isMitigated 
                                      ? '#86efac' 
                                      : '#f8fafc',
                                  border: isSelected 
                                    ? '2px solid #818cf8' 
                                    : `1px solid ${cellStyle.color}60`,
                                  borderRadius: 6,
                                  padding: '2px 6px',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  boxShadow: isSelected ? '0 0 12px rgba(129,140,248,0.7)' : 'none',
                                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <span>{isMitigated ? '✓' : '⚠️'}</span>
                                <span>{r.id || 'R'}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* X-Axis Column Headers */}
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <div style={{ width: 58 }} />
                {impactLevels.map(imp => (
                  <div key={imp} style={{ flex: 1, textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
                    {imp} Impact
                  </div>
                ))}
              </div>

              {/* X-Axis Label */}
              <div style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', marginTop: 2 }}>
                IMPACT SEVERITY ➔
              </div>
            </div>
          </div>

          {/* Matrix Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.9rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.68rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#ef4444' }} /> Critical (70-100)
            </span>
            <span style={{ fontSize: '0.68rem', color: '#fb923c', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#f97316' }} /> High (50-69)
            </span>
            <span style={{ fontSize: '0.68rem', color: '#fde047', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#eab308' }} /> Medium (30-49)
            </span>
            <span style={{ fontSize: '0.68rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#22c55e' }} /> Low (1-29)
            </span>
          </div>
        </div>

        {/* ── RIGHT: Active Risk Deep-Dive & Action Console ── */}
        <div style={{
          background: 'rgba(15,23,42,0.65)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {selectedRisk ? (
            <div>
              {/* Risk Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{
                      padding: '2px 7px',
                      borderRadius: 4,
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      background: 'rgba(99,102,241,0.2)',
                      color: '#a5b4fc',
                      border: '1px solid rgba(99,102,241,0.3)'
                    }}>
                      {selectedRisk.id}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 600 }}>
                      {selectedRisk.category || 'Technical'}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
                    {selectedRisk.title}
                  </h3>
                </div>

                {/* Severity pill */}
                <div style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: selectedRisk.severity_score >= 70 ? 'rgba(239,68,68,0.2)' : selectedRisk.severity_score >= 45 ? 'rgba(249,115,22,0.2)' : 'rgba(34,197,94,0.2)',
                  color: selectedRisk.severity_score >= 70 ? '#f87171' : selectedRisk.severity_score >= 45 ? '#fb923c' : '#4ade80',
                  border: `1px solid ${selectedRisk.severity_score >= 70 ? '#ef4444' : selectedRisk.severity_score >= 45 ? '#f97316' : '#22c55e'}50`,
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textAlign: 'right'
                }}>
                  Severity {selectedRisk.severity_score}/100
                </div>
              </div>

              {/* Impact & Probability summary bar */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', padding: '0.4rem 0.6rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Impact</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f1f5f9' }}>{selectedRisk.impact}</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', padding: '0.4rem 0.6rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Probability</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f1f5f9' }}>{selectedRisk.probability}</div>
                </div>
                <div style={{ flex: 1.2, background: 'rgba(255,255,255,0.04)', padding: '0.4rem 0.6rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Status</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: selectedRisk.status === 'mitigated' ? '#4ade80' : '#f59e0b' }}>
                    {(selectedRisk.status || 'open').toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: '0.85rem', background: 'rgba(0,0,0,0.25)', padding: '0.65rem 0.8rem', borderRadius: 8 }}>
                {selectedRisk.description}
              </div>

              {/* AI Recommended Mitigation */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(16,185,129,0.04) 100%)',
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: 10,
                padding: '0.75rem 0.9rem',
                marginBottom: '0.85rem'
              }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#86efac', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>🛡️</span>
                  <span>AI Recommended Mitigation Strategy:</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#dcfce7', lineHeight: 1.45 }}>
                  {selectedRisk.mitigation}
                </div>
              </div>

              {/* Student Action & Status Controls */}
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Update Risk Mitigation Lifecycle:
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {[
                    { id: 'open', label: '🔴 Open', color: '#ef4444' },
                    { id: 'in_progress', label: '🟡 In Progress', color: '#f59e0b' },
                    { id: 'mitigated', label: '🟢 Mitigated', color: '#22c55e' },
                    { id: 'resolved', label: '✓ Closed / Resolved', color: '#38bdf8' }
                  ].map(st => (
                    <button
                      key={st.id}
                      onClick={() => handleStatusChange(selectedRisk.id, st.id)}
                      style={{
                        background: (selectedRisk.status || 'open') === st.id ? `${st.color}25` : 'rgba(255,255,255,0.04)',
                        color: (selectedRisk.status || 'open') === st.id ? st.color : 'rgba(255,255,255,0.6)',
                        border: `1px solid ${(selectedRisk.status || 'open') === st.id ? st.color : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 6,
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {/* Student Custom Execution Note */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.65rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
                      📝 Student Mitigation Log / Guide Note:
                    </span>
                    {editingNoteId !== selectedRisk.id && (
                      <button
                        onClick={() => { setEditingNoteId(selectedRisk.id); setNoteText(selectedRisk.student_notes || ''); }}
                        style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {selectedRisk.student_notes ? '✏️ Edit' : '+ Add Note'}
                      </button>
                    )}
                  </div>
                  
                  {editingNoteId === selectedRisk.id ? (
                    <div>
                      <textarea
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        placeholder="Log what action your team took (e.g., 'Implemented mock backend for integration tests on Oct 4')..."
                        rows={2}
                        style={{
                          width: '100%',
                          background: '#0f172a',
                          border: '1px solid rgba(99,102,241,0.5)',
                          borderRadius: 6,
                          color: '#fff',
                          fontSize: '0.75rem',
                          padding: '0.4rem',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                      />
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
                        <button
                          onClick={() => setEditingNoteId(null)}
                          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: '0.68rem', padding: '3px 8px', borderRadius: 4, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveNote(selectedRisk.id)}
                          style={{ background: '#4f46e5', border: 'none', color: '#fff', fontSize: '0.68rem', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
                        >
                          Save Log
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.74rem', color: selectedRisk.student_notes ? '#cbd5e1' : 'rgba(255,255,255,0.35)', fontStyle: selectedRisk.student_notes ? 'normal' : 'italic' }}>
                      {selectedRisk.student_notes || 'No custom student mitigation log recorded yet.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.35)' }}>
              Select a risk from the matrix to view detailed breakdown.
            </div>
          )}

          {/* Academic Report Quick Export */}
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
              Ready for Guide Viva / Synopsis Review
            </span>
            <button
              onClick={() => onExportReport && onExportReport(residualScore, mitigatedRisksCount)}
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.2) 100%)',
                border: '1px solid rgba(99,102,241,0.4)',
                color: '#c7d2fe',
                borderRadius: 8,
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
            >
              <span>📄</span>
              <span>Export Academic Risk Chapter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
