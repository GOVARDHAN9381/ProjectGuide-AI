import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
    const handleScroll = () => setScrolled(window.scrollY > 30);
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
    { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { to: '/profile',   icon: '👤', label: 'Profile'   },
  ];

  const facultyLinks = [
    { to: '/faculty-dashboard', icon: '🏠', label: 'Dashboard' },
  ];

  const navLinks = isFaculty ? facultyLinks : studentLinks;

  return (
    <>
      <style>{`
        .nb-root {
          position: sticky; top: 0; z-index: 1000;
          background: rgba(10,13,24,0.92);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
          transition: box-shadow 0.3s;
        }
        .nb-root.scrolled { box-shadow: 0 4px 24px rgba(0,0,0,0.5); }
        .nb-inner {
          max-width: 1280px; margin: 0 auto;
          padding: 0 1.25rem;
          height: 58px;
          display: flex; align-items: center; gap: 1.25rem;
        }

        /* Logo */
        .nb-logo {
          display: flex; align-items: center; gap: 9px;
          text-decoration: none; flex-shrink: 0;
        }
        .nb-logo-icon {
          width: 34px; height: 34px; border-radius: 10px;
          background: linear-gradient(135deg,#3b82f6,#6366f1);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem; box-shadow: 0 0 14px rgba(99,102,241,0.4);
        }
        .nb-logo-text {
          font-size: 1rem; font-weight: 800; color: #f1f5f9; letter-spacing: -0.3px;
        }
        .nb-logo-text span { color: #60a5fa; }

        /* Nav links */
        .nb-links {
          display: flex; align-items: center; gap: 2px; list-style: none;
          margin: 0; padding: 0; flex: 1;
        }
        .nb-links a {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 13px; border-radius: 8px;
          font-size: 0.84rem; font-weight: 600;
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          transition: color 0.18s, background 0.18s;
          position: relative;
        }
        .nb-links a:hover { color: #f1f5f9; background: rgba(255,255,255,0.06); }
        .nb-links a.active {
          color: #60a5fa;
          background: rgba(99,102,241,0.12);
        }
        .nb-links a.active::after {
          content: ''; position: absolute; bottom: -1px; left: 20%; right: 20%;
          height: 2px; border-radius: 99px;
          background: linear-gradient(90deg,#3b82f6,#6366f1);
        }

        /* Right section */
        .nb-right { display: flex; align-items: center; gap: 8px; margin-left: auto; }

        /* Chat button */
        .nb-chat-btn {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2));
          border: 1px solid rgba(99,102,241,0.35);
          color: #a5b4fc; font-size: 1.1rem;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s; position: relative;
        }
        .nb-chat-btn:hover {
          background: linear-gradient(135deg,rgba(99,102,241,0.35),rgba(139,92,246,0.35));
          border-color: rgba(99,102,241,0.6);
          transform: scale(1.05);
        }
        .nb-chat-pulse {
          position: absolute; top: -2px; right: -2px;
          width: 9px; height: 9px; border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 6px #4ade80;
          animation: chatPulse 2s infinite;
        }
        @keyframes chatPulse {
          0%,100%{transform:scale(1);opacity:1}
          50%{transform:scale(1.4);opacity:0.6}
        }

        /* Avatar */
        .nb-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: linear-gradient(135deg,#3b82f6,#6366f1);
          border: 2px solid rgba(99,102,241,0.5);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.85rem; font-weight: 800; color: #fff;
          text-decoration: none; overflow: hidden; flex-shrink: 0;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .nb-avatar:hover { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.2); }
        .nb-avatar img { width: 100%; height: 100%; object-fit: cover; }

        /* Sign out */
        .nb-signout {
          padding: 5px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 600;
          color: rgba(255,255,255,0.4); cursor: pointer;
          background: transparent; border: 1px solid rgba(255,255,255,0.1);
          transition: all 0.18s;
        }
        .nb-signout:hover { color: #f87171; border-color: rgba(248,113,113,0.4); background: rgba(248,113,113,0.06); }

        /* Hamburger */
        .nb-hamburger {
          display: none; flex-direction: column; gap: 5px;
          cursor: pointer; padding: 6px; background: transparent; border: none;
        }
        .nb-hamburger span {
          display: block; width: 22px; height: 2px; border-radius: 2px;
          background: rgba(255,255,255,0.6); transition: all 0.25s;
        }
        .nb-hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .nb-hamburger.open span:nth-child(2) { opacity: 0; }
        .nb-hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        /* Mobile drawer */
        .nb-mobile {
          display: none; position: fixed; top: 58px; left: 0; right: 0; bottom: 0;
          background: rgba(10,13,24,0.97); backdrop-filter: blur(20px);
          flex-direction: column; padding: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.07); z-index: 999;
          animation: mobileIn 0.22s ease;
        }
        .nb-mobile.open { display: flex; }
        @keyframes mobileIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .nb-mobile-link {
          display: flex; align-items: center; gap: 12px;
          padding: 0.9rem 1rem; border-radius: 12px;
          font-size: 1rem; font-weight: 600; color: rgba(255,255,255,0.65);
          text-decoration: none; transition: all 0.18s;
        }
        .nb-mobile-link:hover, .nb-mobile-link.active {
          color: #f1f5f9; background: rgba(99,102,241,0.12);
        }
        .nb-mobile-link.active { color: #60a5fa; }
        .nb-mobile-icon { font-size: 1.2rem; width: 28px; text-align: center; }
        .nb-mobile-divider { height: 1px; background: rgba(255,255,255,0.07); margin: 0.5rem 0; }

        @media (max-width: 768px) {
          .nb-links { display: none; }
          .nb-hamburger { display: flex; }
          .nb-signout { display: none; }
        }
      `}</style>

      <nav className={`nb-root${scrolled ? ' scrolled' : ''}`} id="navbar">
        <div className="nb-inner">
          <Link to={homePath} className="nb-logo" onClick={() => setMenuOpen(false)}>
            <div className="nb-logo-icon">🎓</div>
            <div className="nb-logo-text">ProjectGuide<span>-AI</span></div>
          </Link>

          {/* Desktop links */}
          <ul className="nb-links">
            {navLinks.map(({ to, icon, label }) => (
              <li key={to}>
                <Link to={to} className={location.pathname === to ? 'active' : ''}>
                  <span>{icon}</span>{label}
                </Link>
              </li>
            ))}
            {!isFaculty && onOpenSubmitModal && (
              <li>
                <a href="#submit" onClick={e => { e.preventDefault(); onOpenSubmitModal(); }}>
                  <span>💡</span>Submit Idea
                </a>
              </li>
            )}
          </ul>

          {/* Right section */}
          <div className="nb-right">

            {/* Avatar */}
            <Link
              to={isFaculty ? '/faculty-dashboard' : '/profile'}
              className="nb-avatar"
              title={displayName}
            >
              {avatar ? <img src={avatar} alt={displayName} /> : initial}
            </Link>

            {/* Sign out */}
            <button className="nb-signout" onClick={logout}>Sign Out</button>

            {/* Hamburger */}
            <button
              ref={menuRef}
              className={`nb-hamburger${menuOpen ? ' open' : ''}`}
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Toggle menu"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div className={`nb-mobile${menuOpen ? ' open' : ''}`}>
        {navLinks.map(({ to, icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`nb-mobile-link${location.pathname === to ? ' active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            <span className="nb-mobile-icon">{icon}</span>{label}
          </Link>
        ))}
        {!isFaculty && onOpenSubmitModal && (
          <a href="#submit" className="nb-mobile-link" onClick={e => { e.preventDefault(); setMenuOpen(false); onOpenSubmitModal(); }}>
            <span className="nb-mobile-icon">💡</span>Submit Idea
          </a>
        )}
        <div className="nb-mobile-divider" />
        <div className="nb-mobile-divider" />
        <a href="#signout" className="nb-mobile-link" style={{ color: '#f87171' }} onClick={e => { e.preventDefault(); logout(); }}>
          <span className="nb-mobile-icon">🚪</span>Sign Out
        </a>
      </div>
    </>
  );
}
