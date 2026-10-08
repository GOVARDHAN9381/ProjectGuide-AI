import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Store, logout } from '../utils/store';

const NAV_ITEMS = [
  { id: 'dashboard',   icon: '⊞', label: 'Dashboard'     },
  { id: 'submit_idea', icon: '💡', label: 'Submit Idea'   },
  { id: 'project',     icon: '📁', label: 'My Projects'    },
  { id: 'milestones',  icon: '🗺️', label: 'Milestones & Risk' },
  { id: 'progress',   icon: '◎', label: 'Progress'       },
  { id: 'timeline',   icon: '⏳', label: 'AI Timeline'    },
  { id: 'mentor',     icon: '🤖', label: 'AI Mentor'     },
  { id: 'reports',    icon: '📋', label: 'Documentation' },
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
  const role = user?.role === 'faculty' ? 'Faculty' : 'Student';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <style>{`
        .sidebar {
          width: 210px;
          min-height: 100vh;
          background: #0b0f19;
          border-right: 1px solid rgba(255,255,255,0.08);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0; top: 0;
          z-index: 100;
          overflow-y: auto;
          box-shadow: 4px 0 24px rgba(0,0,0,0.4);
        }
        .sidebar-logo {
          padding: 1.1rem 1.25rem 0.8rem;
          display: flex;
          align-items: center;
          gap: 9px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          margin-bottom: 0.5rem;
        }
        .sidebar-logo-icon {
          width: 30px; height: 30px;
          background: linear-gradient(135deg,#3b82f6,#6366f1);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.9rem;
          box-shadow: 0 0 12px rgba(99,102,241,0.4);
        }
        .sidebar-logo-text {
          font-size: 0.88rem; font-weight: 800;
          color: #f1f5f9; letter-spacing: -0.3px;
        }
        .sidebar-logo-text span { color: #60a5fa; }

        .sidebar-section-label {
          font-size: 0.65rem; font-weight: 700;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.6rem 1.25rem 0.25rem;
        }

        .sidebar-nav {
          flex: 1;
          padding: 0 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0.55rem 0.85rem;
          border-radius: 8px;
          font-size: 0.83rem;
          font-weight: 500;
          color: rgba(255,255,255,0.6);
          cursor: pointer;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
          transition: all 0.18s;
        }
        .sidebar-item:hover {
          color: #f1f5f9;
          background: rgba(255,255,255,0.06);
        }
        .sidebar-item.active {
          color: #60a5fa;
          background: rgba(99,102,241,0.14);
          font-weight: 600;
        }
        .sidebar-item.active .sidebar-item-icon {
          color: #60a5fa;
        }
        .sidebar-item-icon {
          font-size: 0.9rem;
          width: 18px;
          text-align: center;
          flex-shrink: 0;
        }

        .sidebar-user {
          padding: 0.85rem 1rem;
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: auto;
          background: #080b13;
        }
        .sidebar-user-avatar {
          width: 30px; height: 30px;
          border-radius: 50%;
          background: linear-gradient(135deg,#3b82f6,#6366f1);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 800; color: #fff;
          overflow: hidden; flex-shrink: 0;
        }
        .sidebar-user-avatar img { width:100%; height:100%; object-fit:cover; }
        .sidebar-user-name {
          font-size: 0.78rem; font-weight: 600;
          color: #f1f5f9; flex: 1;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .sidebar-user-role {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.4);
        }
        .sidebar-logout {
          background: transparent; border: none;
          color: rgba(255,255,255,0.4); font-size: 0.75rem;
          cursor: pointer; padding: 2px 4px;
          transition: color 0.2s;
          margin-left: auto;
        }
        .sidebar-logout:hover { color: #f87171; }

        /* Content area offset */
        .sidebar-content {
          margin-left: 210px;
          min-height: 100vh;
        }

        @media (max-width: 900px) {
          .sidebar { width: 56px; }
          .sidebar-item-label { display: none; }
          .sidebar-logo-text { display: none; }
          .sidebar-section-label { display: none; }
          .sidebar-user-name, .sidebar-user-role { display: none; }
          .sidebar-content { margin-left: 56px; }
        }
      `}</style>

      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🎓</div>
          <div className="sidebar-logo-text">
            Project<span>Guide</span>
          </div>
        </div>

        <div className="sidebar-section-label">MAIN</div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`sidebar-item${activeTab === item.id ? ' active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span className="sidebar-item-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {avatar ? <img src={avatar} alt={displayName} /> : initial}
          </div>
          <div>
            <div className="sidebar-user-name">{displayName}</div>
            <div className="sidebar-user-role">{role}</div>
          </div>
          <button className="sidebar-logout" onClick={logout} title="Sign out">⏻</button>
        </div>
      </aside>
    </>
  );
}

