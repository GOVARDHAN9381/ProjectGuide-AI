import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  User,
  Sparkles,
  LogOut,
  Menu,
  X,
  Bot
} from 'lucide-react';
import { Store, logout } from '../utils/store';

export default function Navbar({ onOpenSubmitModal, onOpenChat }) {
  const location = useLocation();
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [user, setUser]           = useState(null);
  const [profile, setProfile]     = useState(null);
  const [avatar, setAvatar]       = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const currentUser  = Store.get('currentUser');
    const curProfile   = Store.get('profile');
    const customAvatar = Store.get('avatarDataUrl');
    setUser(currentUser);
    setProfile(curProfile);
    setAvatar(customAvatar || curProfile?.avatar || null);
  }, [location.pathname]);

  const isFaculty  = user?.role === 'faculty';
  const homePath   = isFaculty ? '/faculty-dashboard' : '/dashboard';
  const displayName = profile?.firstName || user?.name?.split(' ')[0] || (isFaculty ? 'Faculty' : 'Student');
  const initial    = displayName.charAt(0).toUpperCase();

  const studentLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/profile',   icon: User,            label: 'Profile & Skills' },
  ];

  const facultyLinks = [
    { to: '/faculty-dashboard', icon: LayoutDashboard, label: 'Advisor Dashboard' },
  ];

  const navLinks = isFaculty ? facultyLinks : studentLinks;

  return (
    <>
      <style>{`
        .nb-root {
          position: sticky; top: 0; z-index: 1000;
          background: rgba(9, 13, 23, 0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .nb-root.scrolled {
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.55);
          background: rgba(8, 12, 21, 0.95);
          border-bottom-color: rgba(99, 102, 241, 0.25);
        }
        .nb-inner {
          max-width: 1320px; margin: 0 auto;
          padding: 0 1.5rem;
          height: 64px;
          display: flex; align-items: center; gap: 1.5rem;
        }

        /* Logo */
        .nb-logo {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none; flex-shrink: 0;
        }
        .nb-logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%);
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          box-shadow: 0 0 16px rgba(99, 102, 241, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .nb-logo-text {
          font-size: 1.05rem; font-weight: 800; color: #f8fafc; letter-spacing: -0.025em;
        }
        .nb-logo-text span {
          background: linear-gradient(135deg, #38bdf8, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Nav links */
        .nb-links {
          display: flex; align-items: center; gap: 6px; list-style: none;
          margin: 0; padding: 0; flex: 1;
        }
        .nb-links a {
          display: flex; align-items: center; gap: 7px;
          padding: 7px 14px; border-radius: 9px;
          font-size: 0.84rem; font-weight: 600;
          color: #94a3b8;
          text-decoration: none;
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }
        .nb-links a:hover {
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.05);
        }
        .nb-links a.active {
          color: #fff;
          background: rgba(99, 102, 241, 0.16);
          border: 1px solid rgba(99, 102, 241, 0.3);
          box-shadow: 0 2px 10px rgba(99, 102, 241, 0.15);
        }

        /* Right section */
        .nb-right { display: flex; align-items: center; gap: 10px; margin-left: auto; }

        .nb-submit-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 8px;
          font-size: 0.8rem; font-weight: 700;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%);
          border: 1px solid rgba(99, 102, 241, 0.4);
          color: #c7d2fe;
          cursor: pointer;
          transition: all 0.2s;
        }
        .nb-submit-btn:hover {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.35) 0%, rgba(168, 85, 247, 0.35) 100%);
          border-color: rgba(99, 102, 241, 0.6);
          color: #fff;
          transform: translateY(-1px);
        }

        /* Avatar */
        .nb-avatar-wrap {
          display: flex; align-items: center; gap: 8px;
          text-decoration: none;
          padding: 4px 10px 4px 4px;
          border-radius: 99px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.2s;
        }
        .nb-avatar-wrap:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(99, 102, 241, 0.35);
        }
        .nb-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          border: 1.5px solid rgba(255, 255, 255, 0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.8rem; font-weight: 800; color: #fff;
          overflow: hidden; flex-shrink: 0;
        }
        .nb-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .nb-avatar-name {
          font-size: 0.78rem; font-weight: 700; color: #f1f5f9;
        }

        /* Sign out */
        .nb-signout {
          display: flex; align-items: center; gap: 5px;
          padding: 6px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 600;
          color: #94a3b8; cursor: pointer;
          background: transparent; border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.18s;
        }
        .nb-signout:hover {
          color: #f43f5e;
          border-color: rgba(244, 63, 94, 0.3);
          background: rgba(244, 63, 94, 0.1);
        }

        /* Hamburger */
        .nb-hamburger {
          display: none; align-items: center; justify-content: center;
          cursor: pointer; padding: 6px; background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px;
          color: #94a3b8;
        }
        .nb-hamburger:hover { color: #fff; border-color: rgba(255,255,255,0.2); }

        /* Mobile drawer */
        .nb-mobile {
          display: none; position: fixed; top: 64px; left: 0; right: 0; bottom: 0;
          background: rgba(9, 13, 23, 0.98); backdrop-filter: blur(24px);
          flex-direction: column; padding: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08); z-index: 999;
          animation: mobileIn 0.22s ease;
        }
        .nb-mobile.open { display: flex; }
        @keyframes mobileIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .nb-mobile-link {
          display: flex; align-items: center; gap: 12px;
          padding: 0.85rem 1rem; border-radius: 12px;
          font-size: 0.95rem; font-weight: 600; color: #94a3b8;
          text-decoration: none; transition: all 0.18s;
        }
        .nb-mobile-link:hover, .nb-mobile-link.active {
          color: #fff; background: rgba(99, 102, 241, 0.15);
        }
        .nb-mobile-divider { height: 1px; background: rgba(255, 255, 255, 0.08); margin: 0.75rem 0; }

        @media (max-width: 768px) {
          .nb-links { display: none; }
          .nb-hamburger { display: flex; }
          .nb-signout { display: none; }
          .nb-avatar-name { display: none; }
        }
      `}</style>

      <nav className={`nb-root${scrolled ? ' scrolled' : ''}`} id="navbar">
        <div className="nb-inner">
          <Link to={homePath} className="nb-logo" onClick={() => setMenuOpen(false)}>
            <div className="nb-logo-icon">
              <GraduationCap size={20} />
            </div>
            <div className="nb-logo-text">
              ProjectGuide<span>-AI</span>
            </div>
          </Link>

          {/* Desktop links */}
          <ul className="nb-links">
            {navLinks.map(({ to, icon: IconComponent, label }) => (
              <li key={to}>
                <Link to={to} className={location.pathname === to ? 'active' : ''}>
                  <IconComponent size={16} />
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Right section */}
          <div className="nb-right">
            {!isFaculty && onOpenSubmitModal && (
              <button className="nb-submit-btn" onClick={onOpenSubmitModal}>
                <Sparkles size={14} />
                <span>Submit Idea</span>
              </button>
            )}

            {/* Avatar & User Name */}
            <Link
              to={isFaculty ? '/faculty-dashboard' : '/profile'}
              className="nb-avatar-wrap"
              title={displayName}
            >
              <div className="nb-avatar">
                {avatar ? <img src={avatar} alt={displayName} /> : initial}
              </div>
              <span className="nb-avatar-name">{displayName}</span>
            </Link>

            {/* Sign out */}
            <button className="nb-signout" onClick={logout} title="Sign Out">
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>

            {/* Mobile Hamburger */}
            <button
              ref={menuRef}
              className="nb-hamburger"
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div className={`nb-mobile${menuOpen ? ' open' : ''}`}>
        {navLinks.map(({ to, icon: IconComponent, label }) => (
          <Link
            key={to}
            to={to}
            className={`nb-mobile-link${location.pathname === to ? ' active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            <IconComponent size={18} />
            <span>{label}</span>
          </Link>
        ))}
        {!isFaculty && onOpenSubmitModal && (
          <button 
            className="nb-mobile-link" 
            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
            onClick={() => { setMenuOpen(false); onOpenSubmitModal(); }}
          >
            <Sparkles size={18} />
            <span>Submit Idea</span>
          </button>
        )}
        <div className="nb-mobile-divider" />
        <button 
          className="nb-mobile-link" 
          style={{ color: '#f43f5e', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }} 
          onClick={logout}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );
}
