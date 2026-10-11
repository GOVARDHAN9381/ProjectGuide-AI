import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  FolderKanban,
  Milestone,
  TrendingUp,
  CalendarClock,
  Bot,
  FileText,
  LogOut,
  GraduationCap,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { Store, logout } from '../utils/store';

const NAV_SECTIONS = [
  {
    title: 'WORKSPACE',
    items: [
      { id: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard'      },
      { id: 'submit_idea', icon: Sparkles,        label: 'Submit Idea', badge: 'AI' },
      { id: 'project',     icon: FolderKanban,     label: 'My Projects'    },
    ]
  },
  {
    title: 'EXECUTION & ROADMAP',
    items: [
      { id: 'milestones',  icon: Milestone,       label: 'Milestones & Risk' },
      { id: 'progress',    icon: TrendingUp,      label: 'Progress Tracker'  },
      { id: 'timeline',    icon: CalendarClock,   label: 'Sprint Timeline'   },
    ]
  },
  {
    title: 'AI ENGINE & EXPORTS',
    items: [
      { id: 'mentor',      icon: Bot,             label: 'AI Mentor Chat'    },
      { id: 'reports',     icon: FileText,        label: 'Documentation'     },
    ]
  }
];

export default function Sidebar({ activeTab, onTabChange }) {
  const navigate = useNavigate();
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [avatar, setAvatar]   = useState(null);

  useEffect(() => {
    setUser(Store.get('currentUser'));
    setProfile(Store.get('profile'));
    setAvatar(Store.get('avatarDataUrl'));
  }, []);

  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ''}`.trim()
    : user?.name || 'Student';
  const isFaculty = user?.role === 'faculty';
  const roleLabel = isFaculty ? 'Faculty Advisor' : 'Student Researcher';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <style>{`
        .sidebar {
          width: 240px;
          min-height: 100vh;
          background: rgba(10, 14, 25, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0; top: 0;
          z-index: 100;
          overflow-y: auto;
          box-shadow: 4px 0 32px rgba(0, 0, 0, 0.45);
        }

        .sidebar::-webkit-scrollbar { width: 4px; }
        .sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }

        .sidebar-logo {
          padding: 1.25rem 1.4rem 1rem;
          display: flex;
          align-items: center;
          gap: 11px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          margin-bottom: 0.6rem;
        }

        .sidebar-logo-icon {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          box-shadow: 0 0 16px rgba(99, 102, 241, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.2);
          flex-shrink: 0;
        }

        .sidebar-logo-text-wrap {
          display: flex;
          flex-direction: column;
        }

        .sidebar-logo-text {
          font-size: 0.98rem; font-weight: 800;
          color: #f8fafc; letter-spacing: -0.025em;
          line-height: 1.2;
        }
        .sidebar-logo-text span {
          background: linear-gradient(135deg, #38bdf8, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sidebar-version-badge {
          font-size: 0.62rem;
          font-weight: 600;
          color: #64748b;
          letter-spacing: 0.04em;
        }

        .sidebar-section {
          margin-bottom: 0.75rem;
        }

        .sidebar-section-label {
          font-size: 0.65rem; font-weight: 700;
          color: #64748b;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          padding: 0.5rem 1.4rem 0.25rem;
        }

        .sidebar-nav {
          padding: 0 0.65rem;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 0.62rem 0.85rem;
          border-radius: 10px;
          font-size: 0.83rem;
          font-weight: 500;
          color: #94a3b8;
          cursor: pointer;
          border: 1px solid transparent;
          background: transparent;
          width: 100%;
          text-align: left;
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }

        .sidebar-item:hover {
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.04);
          transform: translateX(2px);
        }

        .sidebar-item.active {
          color: #fff;
          background: linear-gradient(90deg, rgba(99, 102, 241, 0.22) 0%, rgba(139, 92, 246, 0.1) 100%);
          border-color: rgba(99, 102, 241, 0.35);
          font-weight: 600;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 2px 10px rgba(99, 102, 241, 0.15);
        }

        .sidebar-item.active::before {
          content: '';
          position: absolute;
          left: 0; top: 15%; bottom: 15%;
          width: 3px;
          border-radius: 0 4px 4px 0;
          background: linear-gradient(180deg, #6366f1, #38bdf8);
        }

        .sidebar-item.active .sidebar-item-icon {
          color: #818cf8;
        }

        .sidebar-item-icon {
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: color 0.18s;
        }

        .sidebar-item-badge {
          margin-left: auto;
          font-size: 0.62rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 99px;
          background: rgba(99, 102, 241, 0.25);
          color: #a5b4fc;
          border: 1px solid rgba(99, 102, 241, 0.4);
        }

        /* User profile area */
        .sidebar-user-container {
          margin-top: auto;
          padding: 0.85rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(7, 10, 18, 0.8);
        }

        .sidebar-user-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.2s;
        }

        .sidebar-user-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(99, 102, 241, 0.3);
        }

        .sidebar-user-avatar {
          width: 34px; height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.85rem; font-weight: 800; color: #fff;
          overflow: hidden; flex-shrink: 0;
          border: 1.5px solid rgba(255, 255, 255, 0.2);
          position: relative;
        }
        .sidebar-user-avatar img { width: 100%; height: 100%; object-fit: cover; }

        .sidebar-presence-dot {
          position: absolute;
          bottom: -1px; right: -1px;
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #10b981;
          border: 2px solid #080c15;
        }

        .sidebar-user-info {
          flex: 1;
          overflow: hidden;
        }

        .sidebar-user-name {
          font-size: 0.8rem; font-weight: 700;
          color: #f1f5f9;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          line-height: 1.25;
        }

        .sidebar-user-role {
          font-size: 0.66rem;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 1px;
        }

        .sidebar-logout-btn {
          background: transparent;
          border: 1px solid transparent;
          color: #64748b;
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          margin-left: auto;
        }

        .sidebar-logout-btn:hover {
          color: #f43f5e;
          background: rgba(244, 63, 94, 0.12);
          border-color: rgba(244, 63, 94, 0.25);
        }

        /* Responsive */
        .sidebar-content {
          margin-left: 240px;
          min-height: 100vh;
        }

        @media (max-width: 900px) {
          .sidebar { width: 64px; }
          .sidebar-item-label, .sidebar-section-label, .sidebar-logo-text-wrap, .sidebar-user-info, .sidebar-item-badge { display: none; }
          .sidebar-logo { padding: 1.1rem 0.8rem; justify-content: center; }
          .sidebar-content { margin-left: 64px; }
          .sidebar-user-card { padding: 4px; justify-content: center; }
          .sidebar-logout-btn { display: none; }
        }
      `}</style>

      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <GraduationCap size={20} />
          </div>
          <div className="sidebar-logo-text-wrap">
            <div className="sidebar-logo-text">
              ProjectGuide<span>-AI</span>
            </div>
            <span className="sidebar-version-badge">Academic Engine v2.4</span>
          </div>
        </div>

        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={sIdx} className="sidebar-section">
            <div className="sidebar-section-label">{section.title}</div>
            <nav className="sidebar-nav">
              {section.items.map(item => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    className={`sidebar-item${isActive ? ' active' : ''}`}
                    onClick={() => onTabChange(item.id)}
                    title={item.label}
                  >
                    <span className="sidebar-item-icon">
                      <IconComponent size={17} />
                    </span>
                    <span className="sidebar-item-label">{item.label}</span>
                    {item.badge && (
                      <span className="sidebar-item-badge">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}

        <div className="sidebar-user-container">
          <div className="sidebar-user-card">
            <div 
              className="sidebar-user-avatar"
              onClick={() => navigate('/profile')}
              style={{ cursor: 'pointer' }}
              title="View profile settings"
            >
              {avatar ? <img src={avatar} alt={displayName} /> : initial}
              <span className="sidebar-presence-dot"></span>
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name" title={displayName}>{displayName}</div>
              <div className="sidebar-user-role">
                <span style={{ color: isFaculty ? '#c084fc' : '#38bdf8' }}>●</span>
                <span>{roleLabel}</span>
              </div>
            </div>
            <button 
              className="sidebar-logout-btn" 
              onClick={logout} 
              title="Sign Out of Session"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
