import { useState, useEffect } from 'react';
import { API_BASE } from '../utils/api';

export default function TimelinePlannerTab({ userProjects = [] }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Form state
  const [projectName, setProjectName] = useState('');
  const [deadline, setDeadline] = useState(30);
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [completedTasks, setCompletedTasks] = useState('');

  // Auto-fill form from selected user project if available
  useEffect(() => {
    if (userProjects && userProjects.length > 0) {
      setProjectName(userProjects[0].title || '');
      if (userProjects[0].durationDays) {
        setDeadline(userProjects[0].durationDays);
      }
    }
  }, [userProjects]);

  // Fetch saved timelines
  const fetchTimelines = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${API_BASE}/api/timeline/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !selectedProject) {
          setSelectedProject(data[0]);
        }
      }
    } catch (e) {
      console.log('Error fetching timelines:', e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchTimelines();
  }, []);

  const handleGenerateTimeline = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/timeline/create-timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: projectName,
          deadline: parseInt(deadline, 10),
          hours_per_day: parseFloat(hoursPerDay),
          completed_tasks: completedTasks.trim() || 'None',
        }),
      });

      if (res.ok) {
        const newTimeline = await res.json();
        setSelectedProject(newTimeline);
        fetchTimelines();
      } else {
        alert('Failed to generate timeline. Please check backend logs.');
      }
    } catch (err) {
      console.error('Error generating timeline:', err);
      alert('Error connecting to timeline generator backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleProgressChange = async (taskIndex, newProgress) => {
    if (!selectedProject || !selectedProject._id) return;

    const updatedTasks = [...(selectedProject.tasks || [])];
    if (updatedTasks[taskIndex]) {
      updatedTasks[taskIndex].progress = newProgress;
      updatedTasks[taskIndex].status = newProgress === 100 ? 'Completed' : (newProgress > 0 ? 'In Progress' : 'Not Started');
      setSelectedProject({ ...selectedProject, tasks: updatedTasks });
    }

    try {
      await fetch(`${API_BASE}/api/timeline/update-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject._id,
          task_index: taskIndex,
          progress: newProgress,
        }),
      });
    } catch (e) {
      console.error('Error updating progress:', e);
    }
  };

  return (
    <div style={{ padding: '1.5rem 2rem', color: '#f1f5f9' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem' }}>
        
        {/* Left column: Generator Form & Saved Projects */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Create Timeline Form */}
          <div style={{
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: '1.25rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚡</span> AI Timeline Generator
            </div>

            <form onSubmit={handleGenerateTimeline} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 4 }}>
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Student Mentor"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 4 }}>
                    Deadline (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 4 }}>
                    Hours / Day
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="16"
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 4 }}>
                  Completed Tasks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Requirements analysis, DB design"
                  value={completedTasks}
                  onChange={(e) => setCompletedTasks(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 6,
                  padding: '0.65rem 1rem',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                  transition: 'all 0.2s'
                }}
              >
                {loading ? '⏳ Generating AI Timeline...' : '🚀 Generate Timeline'}
              </button>
            </form>
          </div>

          {/* Saved Timelines List */}
          <div style={{
            background: 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: '1.25rem',
          }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📁 Saved Timelines</span>
              <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 99, color: 'rgba(255,255,255,0.6)' }}>
                {projects.length}
              </span>
            </div>

            {fetching ? (
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '1rem' }}>
                Loading saved timelines...
              </div>
            ) : projects.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '1rem' }}>
                No timelines generated yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 280, overflowY: 'auto' }}>
                {projects.map((proj) => {
                  const isSelected = selectedProject && selectedProject._id === proj._id;
                  return (
                    <div
                      key={proj._id || proj.project_name}
                      onClick={() => setSelectedProject(proj)}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: 8,
                        background: isSelected ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isSelected ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.18s',
                      }}
                    >
                      <div style={{ fontSize: '0.83rem', fontWeight: 700, color: isSelected ? '#60a5fa' : '#f1f5f9' }}>
                        {proj.project_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Deadline: {proj.deadline_days} days</span>
                        <span style={{ color: proj.deadline_status === 'Within Deadline' ? '#4ade80' : '#f87171' }}>
                          {proj.deadline_status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Selected Timeline View */}
        <div>
          {selectedProject ? (
            <div style={{
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              padding: '1.5rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f1f5f9' }}>
                    {selectedProject.project_name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                    Allocated Hours: {selectedProject.hours_per_day} hrs/day | Estimated Duration: {selectedProject.total_task_days} days
                  </div>
                </div>

                <div style={{
                  padding: '0.4rem 0.9rem',
                  borderRadius: 99,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: selectedProject.deadline_status === 'Within Deadline' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                  border: `1px solid ${selectedProject.deadline_status === 'Within Deadline' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
                  color: selectedProject.deadline_status === 'Within Deadline' ? '#4ade80' : '#f87171',
                }}>
                  {selectedProject.deadline_status === 'Within Deadline' ? '✅ Within Deadline' : '⚠️ At Risk'} ({selectedProject.total_task_days}/{selectedProject.deadline_days} days)
                </div>
              </div>

              {/* Tasks List */}
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '1rem' }}>
                📋 Project Tasks ({selectedProject.tasks?.length || 0})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {(selectedProject.tasks || []).map((t, idx) => {
                  const priorityColor = t.priority === 'High' ? '#f87171' : (t.priority === 'Medium' ? '#fbbf24' : '#60a5fa');
                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 10,
                        padding: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 4, color: 'rgba(255,255,255,0.6)' }}>
                            #{idx + 1}
                          </span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>
                            {t.name}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: priorityColor, background: `${priorityColor}15`, padding: '2px 8px', borderRadius: 6, border: `1px solid ${priorityColor}30` }}>
                            {t.priority} Priority
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 6 }}>
                            ⏱️ {t.duration_days} d
                          </span>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.85rem', lineHeight: 1.4 }}>
                        {t.description}
                      </div>

                      {t.depends_on && t.depends_on.length > 0 && (
                        <div style={{ fontSize: '0.72rem', color: '#93c5fd', marginBottom: '0.75rem' }}>
                          🔗 Dependencies: {t.depends_on.join(', ')}
                        </div>
                      )}

                      {/* Progress Bar & Slider */}
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginBottom: 6 }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Task Progress</span>
                          <span style={{ fontWeight: 700, color: t.progress === 100 ? '#4ade80' : '#60a5fa' }}>
                            {t.progress || 0}% ({t.status || 'Not Started'})
                          </span>
                        </div>

                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="10"
                          value={t.progress || 0}
                          onChange={(e) => handleProgressChange(idx, parseInt(e.target.value, 10))}
                          style={{
                            width: '100%',
                            accentColor: t.progress === 100 ? '#4ade80' : '#3b82f6',
                            cursor: 'pointer',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              padding: '4rem 2rem',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.4)',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>
                AI Timeline & Schedule Visualizer
              </div>
              <div style={{ fontSize: '0.83rem', maxWidth: 400, margin: '0 auto' }}>
                Fill in your project details on the left and click "Generate Timeline" to produce a customized AI project schedule.
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
