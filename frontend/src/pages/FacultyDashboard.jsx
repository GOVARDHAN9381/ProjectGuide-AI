import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ChatbotPanel from '../components/ChatbotPanel';
import FeasibilityReportModal from '../components/FeasibilityReportModal';
import { Store, fmtRelative } from '../utils/store';
import { showToast } from '../utils/toast';
import { SKILLS, LEVEL_LABELS } from '../utils/constants';
import { fetchFeasibilityReport, fetchUserIdeas } from '../utils/api';

const STUDENTS_MOCK = [
  {
    id: 1,
    name: 'Arjun Sharma',
    roll: '21CS101',
    branch: 'CSE',
    year: '3rd Year',
    email: 'arjun.sharma@college.edu.in',
    project: { 
      title: 'Smart Attendance System', 
      domain: 'aiml', 
      techStack: ['Python','OpenCV','Flask','React'], 
      feasibility: 92, 
      milestonesDone: 3, 
      desc: 'A facial recognition based attendance system with real-time analytics.' 
    },
    skills: { python: 4, ml: 3, webdev: 3, cv: 4 },
    status: 'active',
    lastActive: '2026-08-28T10:30:00Z',
  },
  {
    id: 2,
    name: 'Priya Mehta',
    roll: '21CS102',
    branch: 'CSE',
    year: '3rd Year',
    email: 'priya.mehta@college.edu.in',
    projects: [
      { 
        title: 'E-Commerce Recommendation Engine', 
        domain: 'web', 
        techStack: ['React','Node.js','MongoDB','TensorFlow.js'], 
        feasibility: 85, 
        milestonesDone: 2, 
        desc: 'Product recommendation engine using collaborative filtering.' 
      },
      { 
        title: 'AI Diet Planner', 
        domain: 'aiml', 
        techStack: ['Python','Flask','React'], 
        feasibility: 78, 
        milestonesDone: 0, 
        desc: 'Diet planner app generating personalized nutrition schedules.' 
      }
    ],
    skills: { webdev: 5, python: 3, ds: 3, ml: 2 },
    status: 'review',
    lastActive: '2026-08-28T09:00:00Z',
  },
  {
    id: 3,
    name: 'Rahul Patel',
    roll: '21IT103',
    branch: 'IT',
    year: '3rd Year',
    email: 'rahul.patel@college.edu.in',
    project: { 
      title: 'IoT Smart Home Dashboard', 
      domain: 'iot', 
      techStack: ['Arduino','MQTT','Node.js','React'], 
      feasibility: 88, 
      milestonesDone: 5, 
      desc: 'Centralized dashboard for smart home IoT devices with automation rules.' 
    },
    skills: { iot: 4, webdev: 3, python: 3 },
    status: 'active',
    lastActive: '2026-08-27T08:00:00Z',
  },
  {
    id: 4,
    name: 'Sneha Reddy',
    roll: '21DS104',
    branch: 'Data Science',
    year: '3rd Year',
    email: 'sneha.reddy@college.edu.in',
    project: { 
      title: 'Stock Price Prediction Model', 
      domain: 'ds', 
      techStack: ['Python','LSTM','Pandas','Streamlit'], 
      feasibility: 79, 
      milestonesDone: 1, 
      desc: 'Time-series forecasting model for stock market using LSTM networks.' 
    },
    skills: { python: 4, ds: 5, ml: 4 },
    status: 'review',
    lastActive: '2026-08-27T16:45:00Z',
  },
  {
    id: 5,
    name: 'Karthik Iyer',
    roll: '21CS105',
    branch: 'CSE',
    year: '3rd Year',
    email: 'karthik.iyer@college.edu.in',
    project: null,
    skills: { python: 2, webdev: 3 },
    status: 'pending',
    lastActive: '2026-08-25T09:00:00Z',
  },
  {
    id: 6,
    name: 'Anjali Singh',
    roll: '21CS106',
    branch: 'CSE',
    year: '3rd Year',
    email: 'anjali.singh@college.edu.in',
    project: { 
      title: 'Mental Health Chatbot', 
      domain: 'aiml', 
      techStack: ['Python','LangChain','OpenAI API','React'], 
      feasibility: 91, 
      milestonesDone: 6, 
      desc: 'Empathetic AI chatbot for student mental health support using LLMs.' 
    },
    skills: { python: 4, nlp: 5, webdev: 3 },
    status: 'submitted',
    lastActive: '2026-08-28T11:00:00Z',
  },
  {
    id: 7,
    name: 'Dev Malhotra',
    roll: '21EC107',
    branch: 'ECE',
    year: '3rd Year',
    email: 'dev.malhotra@college.edu.in',
    project: { 
      title: 'Blockchain Voting System', 
      domain: 'blockchain', 
      techStack: ['Solidity','Ethereum','React','MetaMask'], 
      feasibility: 83, 
      milestonesDone: 2, 
      desc: 'Decentralized, tamper-proof voting system for college elections.' 
    },
    skills: { python: 3, webdev: 3 },
    status: 'active',
    lastActive: '2026-08-26T17:00:00Z',
  },
  {
    id: 8,
    name: 'Meera Nair',
    roll: '21CS108',
    branch: 'CSE',
    year: '3rd Year',
    email: 'meera.nair@college.edu.in',
    project: null,
    skills: {},
    status: 'pending',
    lastActive: '2026-08-24T10:00:00Z',
  }
];

const MILESTONE_TITLES = [
  'Requirements & Scope Analysis',
  'Architecture & DB Design',
  'Environment & Boilerplate',
  'Core Logic & API Build',
  'Frontend Integration',
  'Testing & Quality Assurance',
  'Deployment & Cloud Setup',
  'Final Report & Viva Prep'
];

const STATUS_LABELS = { 
  active: 'Active', 
  review: 'Pending Review', 
  pending: 'Not Started', 
  submitted: 'Submitted' 
};

const STATUS_CSS = { 
  active: 'status-active', 
  review: 'status-review', 
  pending: 'status-pending', 
  submitted: 'status-submitted' 
};

const AVATAR_COLORS = ['#3b82f6','#8b5cf6','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#f97316'];

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState(STUDENTS_MOCK);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    const currentUser = Store.get('currentUser');
    if (!currentUser || currentUser.role !== 'faculty') {
      navigate('/login');
      return;
    }
    setUser(currentUser);

    // Load all submitted project ideas across the cohort from backend
    fetchUserIdeas().then(allIdeas => {
      if (Array.isArray(allIdeas) && allIdeas.length > 0) {
        // Group submitted ideas by student email
        const ideasByEmail = {};
        allIdeas.forEach(idea => {
          const email = (idea.student_email || '').toLowerCase();
          if (email) {
            if (!ideasByEmail[email]) ideasByEmail[email] = [];
            ideasByEmail[email].push({
              title: idea.title,
              domain: idea.domain,
              techStack: idea.tech_ideas ? idea.tech_ideas.split(',').map(t => t.trim()) : [],
              feasibility: idea.feasibility || (idea.feasibilityReport ? idea.feasibilityReport.overallScore : null),
              feasibilityReport: idea.feasibilityReport || idea.feasibility_report,
              scopeReport: idea.scopeReport || idea.scope_report,
              techStackReport: idea.techStackReport || idea.tech_stack_report,
              riskReport: idea.riskReport || idea.risk_report,
              desc: idea.desc,
              submittedAt: idea.created_at || idea.submittedAt
            });
          }
        });

        setStudents(prev => prev.map(s => {
          const studentEmail = (s.email || '').toLowerCase();
          if (ideasByEmail[studentEmail]) {
            const studentProjs = ideasByEmail[studentEmail];
            return {
              ...s,
              projects: studentProjs,
              project: studentProjs[0],
              status: 'active'
            };
          }
          return s;
        }));
      }
    }).catch(err => console.log('Faculty ideas fetch:', err));
  }, [navigate]);

  const filteredStudents = students.filter(s => {
    const projs = s.projects || (s.project ? [s.project] : []);
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchQuery = !searchQuery.trim() ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.roll.toLowerCase().includes(searchQuery.toLowerCase()) ||
      projs.some(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchStatus && matchQuery;
  });

  const openDrawer = (student) => {
    setSelectedStudent(student);
    setFeedback(Store.get(`feedback_${student.id}`) || '');
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedStudent(null), 300);
  };

  const saveFeedback = () => {
    if (selectedStudent) {
      Store.set(`feedback_${selectedStudent.id}`, feedback);
      showToast('Feedback recorded for student!', '💾');
    }
  };

  const approveStudent = (studentId) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: 'active' } : s));
    showToast('Project blueprint approved!', '✅');
    if (selectedStudent && selectedStudent.id === studentId) {
      setSelectedStudent(prev => ({ ...prev, status: 'active' }));
    }
  };

  const handleBroadcast = (e) => {
    e.preventDefault();
    if (!announcement.trim()) {
      showToast('Please enter an announcement message.', '⚠️');
      return;
    }
    setAnnouncement('');
    showToast('Announcement broadcasted to all students!', '📢');
  };

  const exportReport = () => {
    const headers = "ID,Name,Roll,Branch,Status,Main Project,Feasibility,Milestones Done\n";
    const rows = students.map(s => {
      const p = (s.projects && s.projects[0]) || s.project;
      const pTitle = p ? `"${p.title.replace(/"/g, '""')}"` : 'None';
      const feas = p ? p.feasibility : 0;
      const ms = p ? p.milestonesDone : 0;
      return `${s.id},"${s.name}",${s.roll},${s.branch},${s.status},${pTitle},${feas}%,${ms}/8`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Faculty_Project_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    showToast('Cohort project report exported!', '📊');
  };

  if (!user) return null;

  const totalCount = students.length;
  const activeCount = students.filter(s => s.status === 'active').length;
  const pendingCount = students.filter(s => s.status === 'review').length;
  const submittedCount = students.filter(s => s.status === 'submitted').length;
  const notStartedCount = students.filter(s => s.status === 'pending').length;

  const progArr = students.filter(s => s.project || (s.projects && s.projects.length)).map(s => {
    const p = (s.projects && s.projects[0]) || s.project;
    return ((p.milestonesDone || 0) / 8) * 100;
  });
  const avgProg = progArr.length ? Math.round(progArr.reduce((a, b) => a + b, 0) / progArr.length) : 0;

  return (
    <>
      <Navbar />
      <ChatbotPanel />
      <div className="page-bg-glow"></div>
      <div className="page-bg-glow-2"></div>

      <main className="dashboard-page">
        <div className="container-wide">

          {/* Faculty Header */}
          <div className="faculty-header animate-fade-up">
            <div className="faculty-info">
              <div className="faculty-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="faculty-name">Welcome, {user.name} 👨‍🏫</div>
                <div className="faculty-role">Project Guide &amp; Faculty Reviewer · Department of CSE</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={exportReport}>
                📊 Export Report
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setFilterStatus('review')}>
                🔔 Pending Reviews ({pendingCount})
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="stats-row animate-fade-up delay-1">
            <div 
              className="stat-card" 
              onClick={() => setFilterStatus('all')} 
              style={{ cursor: 'pointer', borderColor: filterStatus === 'all' ? 'var(--blue)' : 'var(--border)' }}
            >
              <div className="stat-card-label">Total Students</div>
              <div className="stat-card-value">{totalCount}</div>
              <div className="stat-card-sub">enrolled this semester</div>
            </div>

            <div 
              className="stat-card" 
              onClick={() => setFilterStatus('active')} 
              style={{ cursor: 'pointer', borderColor: filterStatus === 'active' ? 'var(--blue)' : 'var(--border)' }}
            >
              <div className="stat-card-label">Active Projects</div>
              <div className="stat-card-value" style={{ color: 'var(--green)' }}>{activeCount}</div>
              <div className="stat-card-sub">in progress</div>
            </div>

            <div 
              className="stat-card" 
              onClick={() => setFilterStatus('review')} 
              style={{ cursor: 'pointer', borderColor: filterStatus === 'review' ? 'var(--blue)' : 'var(--border)' }}
            >
              <div className="stat-card-label">Pending Review</div>
              <div className="stat-card-value" style={{ color: 'var(--yellow)' }}>{pendingCount}</div>
              <div className="stat-card-sub">need your attention</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-label">Avg. Progress</div>
              <div className="stat-card-value" style={{ color: 'var(--blue)' }}>{avgProg}%</div>
              <div className="stat-card-sub">across all projects</div>
              <div className="progress-bar-wrap" style={{ marginTop: '0.5rem' }}>
                <div className="progress-bar blue" style={{ width: `${avgProg}%` }}></div>
              </div>
            </div>
          </div>

          {/* Main Layout */}
          <div className="faculty-grid">

            {/* Left Column: Student Table */}
            <div>
              <div className="section-label">Student Projects</div>
              <div className="table-card animate-fade-up delay-2">
                <div className="table-toolbar">
                  <div className="table-toolbar-title">
                    {filterStatus === 'all' ? 'All Students' : filterStatus === 'review' ? 'Pending Review' : `${STATUS_LABELS[filterStatus]} Students`} ({filteredStudents.length})
                  </div>

                  <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <input 
                      type="text" 
                      className="table-search" 
                      placeholder="🔍 Search students..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                    <select 
                      className="form-select" 
                      style={{ width: '150px', padding: '0.45rem 0.85rem', fontSize: '0.84rem' }}
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="review">Pending Review</option>
                      <option value="active">Active</option>
                      <option value="submitted">Submitted</option>
                      <option value="pending">Not Started</option>
                    </select>
                  </div>
                </div>

                <div className="student-row header">
                  <div>Student</div>
                  <div>Project</div>
                  <div>Progress</div>
                  <div>Status</div>
                  <div style={{ textAlign: 'right' }}>Actions</div>
                </div>

                {filteredStudents.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.88rem' }}>
                    No matching student records found.
                  </div>
                ) : (
                  filteredStudents.map((s, i) => {
                    const projs = s.projects || (s.project ? [s.project] : []);
                    const mainP = projs[0];
                    const done = mainP ? (mainP.milestonesDone || 0) : 0;
                    const total = mainP ? ((mainP.milestones || []).length || 8) : 8;
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    const barColor = pct >= 60 ? 'green' : pct >= 30 ? 'yellow' : 'blue';
                    const color = AVATAR_COLORS[i % AVATAR_COLORS.length];

                    return (
                      <div className="student-row" key={s.id}>
                        <div className="student-name-cell">
                          <div className="s-avatar" style={{ background: color }}>
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <div className="s-name">{s.name}</div>
                            <div className="s-roll">{s.roll} · {s.branch}</div>
                          </div>
                        </div>

                        <div className="s-project">
                          {mainP ? (
                            <>
                              <div style={{ fontWeight: 600, color: 'var(--text)' }}>{mainP.title}</div>
                              {projs.length > 1 && (
                                <span className="badge badge-yellow" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', marginTop: '2px' }}>
                                  +{projs.length - 1} more project
                                </span>
                              )}
                            </>
                          ) : (
                            <span style={{ color: 'var(--text-faint)' }}>No project submitted</span>
                          )}
                        </div>

                        <div className="s-progress-wrap">
                          <div className="progress-bar-wrap">
                            <div className={`progress-bar ${barColor}`} style={{ width: `${pct}%` }}></div>
                          </div>
                          <div className="s-progress-label">
                            <span>{done}/{total} milestones</span>
                            <span>{pct}%</span>
                          </div>
                        </div>

                        <div>
                          <span className={`status-badge ${STATUS_CSS[s.status]}`}>
                            {STATUS_LABELS[s.status]}
                          </span>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: '3px' }}>
                            Active: {fmtRelative(s.lastActive)}
                          </div>
                        </div>

                        <div className="row-actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => openDrawer(s)}>
                            View
                          </button>
                          {s.status === 'review' && (
                            <button className="btn btn-primary btn-sm" onClick={() => approveStudent(s.id)} title="Approve Blueprint">
                              ✓
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Faculty Actions & Activity */}
            <div>
              <div className="section-label">Faculty Actions</div>
              <div className="sidebar-card animate-fade-up delay-2">
                <div className="sidebar-card-title">📢 Broadcast Announcement</div>
                <form onSubmit={handleBroadcast}>
                  <textarea 
                    className="feedback-area" 
                    placeholder="Write a message to all students..."
                    value={announcement}
                    onChange={e => setAnnouncement(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm btn-full" style={{ marginTop: '0.65rem' }}>
                    Send Announcement
                  </button>
                </form>
              </div>

              <div className="section-label">Recent Activity</div>
              <div className="sidebar-card animate-fade-up delay-3">
                <div className="sidebar-card-title">🔔 Activity Feed</div>
                <div className="activity-item">
                  <div className="activity-dot blue"></div>
                  <div>
                    <strong>Priya Mehta</strong> submitted idea <span style={{ color: 'var(--text-muted)' }}>"AI Diet Planner"</span>
                    <div className="activity-time">2 hours ago</div>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-dot green"></div>
                  <div>
                    <strong>Rahul Patel</strong> completed milestone <span style={{ color: 'var(--text-muted)' }}>"IoT Smart Home Dashboard"</span>
                    <div className="activity-time">5 hours ago</div>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-dot blue"></div>
                  <div>
                    <strong>Sneha Reddy</strong> submitted milestone for review
                    <div className="activity-time">Yesterday</div>
                  </div>
                </div>
              </div>

              <div className="section-label" style={{ marginTop: '1rem' }}>Submission Status</div>
              <div className="sidebar-card animate-fade-up delay-3">
                <div className="sidebar-card-title">📌 Project Status Overview</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.83rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)' }}></span>
                      Active In-Progress
                    </span>
                    <strong>{activeCount}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--yellow)' }}></span>
                      Pending Review
                    </span>
                    <strong>{pendingCount}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--blue)' }}></span>
                      Submitted
                    </span>
                    <strong>{submittedCount}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--surface3)' }}></span>
                      Not Started
                    </span>
                    <strong>{notStartedCount}</strong>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </main>

      {/* Slide-in Detail Drawer */}
      <div 
        className={`drawer-overlay ${isDrawerOpen ? 'open' : ''}`} 
        onClick={(e) => { if (e.target === e.currentTarget) closeDrawer(); }}
      >
        <div className="drawer">
          <button className="drawer-close" onClick={closeDrawer}>×</button>

          {selectedStudent && (() => {
            const s = selectedStudent;
            const projs = s.projects || (s.project ? [s.project] : []);

            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
                  <div 
                    className="faculty-avatar" 
                    style={{ width: '48px', height: '48px', fontSize: '1.2rem', background: AVATAR_COLORS[s.id % AVATAR_COLORS.length] }}
                  >
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <div className="drawer-title">{s.name}</div>
                    <div className="drawer-sub">{s.roll} · {s.branch} · {s.year}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    style={{ flex: 1 }}
                    onClick={() => showToast(`Meeting invite sent to ${s.name}`, '📅')}
                  >
                    📅 Schedule
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    style={{ flex: 1 }}
                    onClick={() => showToast(`Direct chat opened with ${s.name}`, '✉️')}
                  >
                    ✉️ Message
                  </button>
                </div>

                <div className="divider"></div>

                {/* Projects Section */}
                <div className="drawer-section">
                  <div className="drawer-section-title">Submitted Project(s)</div>
                  {projs.length > 0 ? (
                    projs.map((p, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          background: 'var(--surface2)', 
                          border: '1px solid var(--border)', 
                          borderRadius: 'var(--radius)', 
                          padding: '1rem', 
                          marginBottom: '1rem' 
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.3rem' }}>
                          {idx + 1}. {p.title}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                          {p.desc}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                          {(p.techStack || []).map(t => (
                            <span className="tech-tag" key={t}>{t}</span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="badge badge-green">Feasibility: {p.feasibility || 85}%</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>
                            {p.milestonesDone || 0}/8 milestones
                          </span>
                        </div>

                        <div className="divider" style={{ margin: '0.75rem 0' }}></div>

                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                          Milestone Progress
                        </div>
                        {MILESTONE_TITLES.slice(0, (p.milestonesDone || 0) + 2).map((title, mIdx) => {
                          const done = mIdx < (p.milestonesDone || 0);
                          const current = mIdx === (p.milestonesDone || 0);
                          const dotClass = done ? 'done' : current ? 'current' : 'pending';
                          return (
                            <div className="mini-ms" key={mIdx}>
                              <div className={`mini-ms-dot ${dotClass}`}></div>
                              <div style={{ flex: 1, color: done ? 'var(--text)' : 'var(--text-muted)' }}>{title}</div>
                              <div style={{ fontSize: '0.72rem', color: done ? 'var(--green)' : current ? 'var(--blue)' : 'var(--text-faint)' }}>
                                {done ? 'Done' : current ? 'Current' : 'Upcoming'}
                              </div>
                            </div>
                          );
                        })}

                        <button 
                          type="button"
                          className="btn btn-primary btn-sm btn-full"
                          style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          disabled={isEvaluating}
                          onClick={async () => {
                            if (p.feasibilityReport) {
                              setSelectedReport(p.feasibilityReport);
                              setSelectedProject(p);
                              setIsReportModalOpen(true);
                            } else {
                              setIsEvaluating(true);
                              try {
                                const report = await fetchFeasibilityReport({
                                  title: p.title || 'Student Project',
                                  desc: p.desc || '',
                                  domain: (p.domain || 'web').toLowerCase(),
                                  teamSize: String(p.teamSize || 3),
                                  durationDays: parseInt(p.durationDays) || 30,
                                  techIdeas: (p.techStack || []).join(', '),
                                  studentSkills: s?.skills || {},
                                  uploadedFiles: []
                                });
                                p.feasibilityReport = report;
                                setSelectedReport(report);
                                setSelectedProject(p);
                                setIsReportModalOpen(true);
                              } catch (err) {
                                console.error('Failed to fetch feasibility report:', err);
                                showToast('AI Feasibility report generation failed', '❌');
                              } finally {
                                setIsEvaluating(false);
                              }
                            }
                          }}
                        >
                          {isEvaluating ? '⏳ CrewAI Agent Evaluating...' : '📊 View AI Feasibility Report'}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-faint)' }}>No project submitted yet.</div>
                  )}
                </div>

                {/* Skills Section */}
                <div className="drawer-section">
                  <div className="drawer-section-title">Student Skills</div>
                  {Object.keys(s.skills || {}).length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                      {Object.entries(s.skills).map(([k, v]) => {
                        const skDef = SKILLS.find(x => x.id === k);
                        return (
                          <div 
                            key={k} 
                            style={{ 
                              background: 'var(--surface2)', 
                              padding: '0.4rem 0.65rem', 
                              borderRadius: '6px', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              fontSize: '0.78rem' 
                            }}
                          >
                            <span>{skDef ? skDef.icon : '⚡'} {skDef ? skDef.name : k}</span>
                            <span style={{ color: 'var(--text-faint)', fontWeight: 600 }}>{LEVEL_LABELS[v] || v}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-faint)' }}>No self-assessed skills recorded.</div>
                  )}
                </div>

                {/* Faculty Feedback Section */}
                <div className="drawer-section">
                  <div className="drawer-section-title">Faculty Feedback &amp; Decision</div>
                  <textarea 
                    className="feedback-area" 
                    placeholder="Provide constructive feedback, suggestions for the architecture, or required revisions..."
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                    <button className="btn btn-primary btn-sm btn-full" onClick={saveFeedback}>
                      💾 Save Feedback
                    </button>
                    {s.status === 'review' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => approveStudent(s.id)}>
                        ✓ Approve
                      </button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Faculty AI Feasibility Report Modal */}
      <FeasibilityReportModal 
        isOpen={isReportModalOpen}
        report={selectedReport}
        project={selectedProject}
        onClose={() => setIsReportModalOpen(false)}
      />
    </>
  );
}
