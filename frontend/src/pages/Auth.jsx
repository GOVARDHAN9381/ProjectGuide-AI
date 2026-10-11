import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Mail,
  Lock,
  User,
  Hash,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Cpu,
  GitBranch,
  Compass,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  Zap,
  Info,
  AlertCircle
} from 'lucide-react';
import { Store } from '../utils/store';
import { showToast } from '../utils/toast';
import { loginUser, registerUser } from '../utils/api';

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [role, setRole] = useState('student'); // 'student' or 'faculty'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const current = Store.get('currentUser');
    if (current && current.loggedIn) {
      if (current.role === 'faculty') {
        navigate('/faculty-dashboard');
      } else {
        const profile = Store.get('profile') || {};
        const hasSkills = Boolean(
          current.hasCompletedProfile ||
          (profile.skills && Object.keys(profile.skills).length > 0)
        );
        if (!hasSkills) {
          navigate('/profile');
        } else {
          navigate('/dashboard');
        }
      }
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      showToast('Please fill in all required fields.', '⚠️');
      setAuthError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setPasswordError(true);
      showToast('Password must be at least 6 characters.', '⚠️');
      setAuthError('Password must be at least 6 characters.');
      return;
    }
    setPasswordError(false);
    setAuthError('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    if (mode === 'login') {
      try {
        const resp = await loginUser({ email: cleanEmail, password, role });
        const user = resp.user || {};
        const hasCompleted = Boolean(
          resp.hasCompletedProfile ||
          user.hasCompletedProfile ||
          (user.skills && Object.keys(user.skills).length > 0)
        );

        const authUser = {
          ...user,
          email: cleanEmail,
          role: user.role || role,
          hasCompletedProfile: hasCompleted,
          loggedIn: true,
          authTime: new Date().toISOString()
        };
        Store.set('currentUser', authUser);

        // Load profile with actual saved user skills & domains from backend
        const parts = (user.name || '').split(' ');
        const profileData = {
          name: user.name || '',
          firstName: parts[0] || '',
          lastName: parts.slice(1).join(' ') || '',
          email: cleanEmail,
          rollNo: user.rollNo || (authUser.role === 'faculty' ? 'FAC001' : '21CS101'),
          branch: user.branch || (authUser.role === 'faculty' ? 'CSE' : 'Computer Science & Engineering'),
          year: user.year || (authUser.role === 'faculty' ? 'Faculty' : '3rd Year'),
          skills: user.skills || {},
          domains: user.domains || [],
          aboutMe: user.aboutMe || '',
          teamSize: user.teamSize || '3',
          hasCompletedProfile: hasCompleted
        };
        Store.set('profile', profileData);

        showToast(`Welcome back, ${user.name || 'User'}!`, '🎉');
        setLoading(false);

        setTimeout(() => {
          if (authUser.role === 'faculty') {
            navigate('/faculty-dashboard');
          } else if (hasCompleted) {
            navigate('/dashboard');
          } else {
            navigate('/profile');
          }
        }, 500);

      } catch (err) {
        setLoading(false);
        const rawMsg = err.message || '';
        let displayMsg = 'Sign in failed. Please check your credentials.';

        if (rawMsg.includes('404') || rawMsg.toLowerCase().includes('not found') || rawMsg.toLowerCase().includes('account not found')) {
          displayMsg = "Account not found. Please click 'Create Account' to register first.";
        } else if (rawMsg.includes('401') || rawMsg.toLowerCase().includes('incorrect password')) {
          displayMsg = "Incorrect password. Please verify and try again.";
        } else {
          try {
            const jsonPart = rawMsg.slice(rawMsg.indexOf('{'));
            const parsed = JSON.parse(jsonPart);
            if (parsed.detail) displayMsg = parsed.detail;
          } catch {
            if (rawMsg) displayMsg = rawMsg.replace(/^API error \d+:\s*/, '');
          }
        }
        setAuthError(displayMsg);
        showToast(displayMsg, '❌');
      }
    } else {
      // Register mode
      if (!fullName.trim()) {
        showToast('Please enter your full name.', '⚠️');
        setAuthError('Please enter your full name.');
        setLoading(false);
        return;
      }
      try {
        const computedRoll = rollNo.trim() || (role === 'faculty' ? 'FAC001' : '21CS101');
        const computedBranch = role === 'faculty' ? 'CSE' : 'Computer Science & Engineering';
        const computedYear = role === 'faculty' ? 'Faculty' : '3rd Year';

        const resp = await registerUser({
          email: cleanEmail,
          password,
          name: fullName.trim(),
          role,
          rollNo: computedRoll,
          branch: computedBranch,
          year: computedYear
        });

        const user = resp.user || {};
        const isFaculty = role === 'faculty';
        const authUser = {
          ...user,
          email: cleanEmail,
          role,
          hasCompletedProfile: isFaculty,
          loggedIn: true,
          authTime: new Date().toISOString()
        };
        Store.set('currentUser', authUser);

        const parts = fullName.trim().split(' ');
        const profileData = {
          name: fullName.trim(),
          firstName: parts[0] || '',
          lastName: parts.slice(1).join(' ') || '',
          email: cleanEmail,
          rollNo: computedRoll,
          branch: computedBranch,
          year: computedYear,
          skills: {},
          domains: [],
          hasCompletedProfile: isFaculty
        };
        Store.set('profile', profileData);

        showToast(`Account created! Welcome, ${fullName.trim()}!`, '🎉');
        setLoading(false);

        setTimeout(() => {
          if (isFaculty) {
            navigate('/faculty-dashboard');
          } else {
            navigate('/profile');
          }
        }, 500);

      } catch (err) {
        setLoading(false);
        const rawMsg = err.message || '';
        let displayMsg = 'Registration failed. Please try again.';

        if (rawMsg.includes('already exists')) {
          displayMsg = 'An account with this email already exists. Please Sign In.';
          setMode('login');
        } else {
          try {
            const jsonPart = rawMsg.slice(rawMsg.indexOf('{'));
            const parsed = JSON.parse(jsonPart);
            if (parsed.detail) displayMsg = parsed.detail;
          } catch {
            if (rawMsg) displayMsg = rawMsg.replace(/^API error \d+:\s*/, '');
          }
        }
        setAuthError(displayMsg);
        showToast(displayMsg, '⚠️');
      }
    }
  };

  const handleQuickDemo = (demoRole) => {
    if (demoRole === 'student') {
      setEmail('arjun.sharma@college.edu.in');
      setPassword('password123');
      setRole('student');
      setMode('login');
      setAuthError('');
      showToast('Loaded Demo Student profile (Arjun Sharma)', '👨‍🎓');
    } else {
      setEmail('prof.verma@college.edu.in');
      setPassword('faculty123');
      setRole('faculty');
      setMode('login');
      setAuthError('');
      showToast('Loaded Demo Faculty profile (Prof. Verma)', '👨‍🏫');
    }
  };

  const isReg = mode === 'register';

  return (
    <>
      <div className="page-bg-glow"></div>
      <div className="page-bg-glow-2"></div>

      <main className="auth-page">
        <div className="auth-split animate-fade-up">
          
          {/* Left Hero Panel */}
          <div className="auth-left">
            <div className="auth-brand">
              <div className="auth-brand-icon">
                <Sparkles size={20} color="#fff" />
              </div>
              <span className="auth-brand-title">
                ProjectGuide<span className="brand-dot">-AI</span>
              </span>
            </div>

            <div className="auth-left-body">
              <div className="auth-badge-pill">
                <span className="badge-pulse"></span>
                <span>Autonomous Academic Intelligence Engine</span>
              </div>

              <h1 className="auth-left-title">
                Supercharge Your Final Year Project with AI.
              </h1>
              
              <p className="auth-left-desc">
                From initial idea validation to milestone tracking and viva defense documentation — mentored continuously by domain AI.
              </p>

              <div className="auth-feature-cards">
                <div className="auth-feature-item">
                  <div className="auth-feature-icon">
                    <Cpu size={16} />
                  </div>
                  <div>
                    <div className="auth-feature-name">Instant Feasibility Scoring</div>
                    <div className="auth-feature-sub">Deep tech viability, scope check &amp; API validation in seconds.</div>
                  </div>
                </div>

                <div className="auth-feature-item">
                  <div className="auth-feature-icon">
                    <GitBranch size={16} />
                  </div>
                  <div>
                    <div className="auth-feature-name">Automated Sprint Roadmap</div>
                    <div className="auth-feature-sub">Milestones calibrated to your college submission calendar.</div>
                  </div>
                </div>

                <div className="auth-feature-item">
                  <div className="auth-feature-icon">
                    <Compass size={16} />
                  </div>
                  <div>
                    <div className="auth-feature-name">24/7 Contextual AI Mentor</div>
                    <div className="auth-feature-sub">Interactive code guidance, architectural patterns &amp; risk matrix.</div>
                  </div>
                </div>

                <div className="auth-feature-item">
                  <div className="auth-feature-icon">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <div className="auth-feature-name">Faculty Review &amp; Signoff</div>
                    <div className="auth-feature-sub">Seamless audit trails, automated IEEE synopsis &amp; defense reports.</div>
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="auth-stats-bar">
                <div className="auth-stat-col">
                  <div className="auth-stat-num">98.5%</div>
                  <div className="auth-stat-lbl">Viva Pass Rate</div>
                </div>
                <div className="auth-stat-div"></div>
                <div className="auth-stat-col">
                  <div className="auth-stat-num">12+</div>
                  <div className="auth-stat-lbl">Engg Domains</div>
                </div>
                <div className="auth-stat-div"></div>
                <div className="auth-stat-col">
                  <div className="auth-stat-num">24/7</div>
                  <div className="auth-stat-lbl">Active Mentoring</div>
                </div>
              </div>
            </div>

            <div className="auth-left-footer">
              <span className="footer-dot"></span>
              <span>ProjectGuide-AI Academic Suite • Infosys Project</span>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="auth-right">
            <div className="auth-form-header">
              <h2 className="auth-form-title">
                {isReg ? 'Create Researcher Account' : 'Welcome to Workspace'}
              </h2>
              <p className="auth-form-sub">
                {isReg 
                  ? 'Set up your credentials to begin guided AI project lifecycle'
                  : 'Enter your credentials to access your dashboard and project plan'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="auth-segmented-switch">
              <button 
                type="button"
                className={`auth-segment-btn ${!isReg ? 'active' : ''}`} 
                onClick={() => { setMode('login'); setAuthError(''); }}
              >
                Sign In
              </button>
              <button 
                type="button"
                className={`auth-segment-btn ${isReg ? 'active' : ''}`} 
                onClick={() => { setMode('register'); setAuthError(''); }}
              >
                Create Account
              </button>
            </div>

            {/* Role Selection Cards */}
            <div className="role-selector-label">SELECT YOUR PLATFORM ROLE</div>
            <div className="role-cards-grid">
              <div 
                className={`role-select-card ${role === 'student' ? 'selected' : ''}`}
                onClick={() => { setRole('student'); setAuthError(''); }}
              >
                <div className="role-card-header">
                  <div className="role-card-icon student">
                    <GraduationCap size={18} />
                  </div>
                  {role === 'student' && <CheckCircle2 size={16} className="role-check-icon" />}
                </div>
                <div className="role-card-title">Student Researcher</div>
                <div className="role-card-desc">Submit ideas, generate sprint plans &amp; chat with AI</div>
              </div>

              <div 
                className={`role-select-card ${role === 'faculty' ? 'selected' : ''}`}
                onClick={() => { setRole('faculty'); setAuthError(''); }}
              >
                <div className="role-card-header">
                  <div className="role-card-icon faculty">
                    <Briefcase size={18} />
                  </div>
                  {role === 'faculty' && <CheckCircle2 size={16} className="role-check-icon" />}
                </div>
                <div className="role-card-title">Faculty Advisor</div>
                <div className="role-card-desc">Review batch cohorts, sign off milestones &amp; grade vivas</div>
              </div>
            </div>

            {authError && (
              <div className="auth-alert-banner">
                <AlertCircle size={18} className="alert-icon" />
                <span>{authError}</span>
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
              
              {isReg && (
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div className="input-with-icon">
                    <User size={16} className="input-icon" />
                    <input 
                      className="form-input" 
                      type="text" 
                      placeholder="e.g. Arjun Sharma"
                      value={fullName}
                      required={isReg}
                      onChange={(e) => { setFullName(e.target.value); setAuthError(''); }}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Institute Email Address</label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon" />
                  <input 
                    className="form-input" 
                    type="email" 
                    placeholder="student@college.edu.in" 
                    required 
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setAuthError(''); }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input 
                    className="form-input has-toggle" 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    required 
                    autoComplete={isReg ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setAuthError(''); }}
                  />
                  <button 
                    type="button" 
                    className="pwd-toggle-btn"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordError && (
                  <span className="form-error">Password must contain at least 6 characters.</span>
                )}
              </div>

              {isReg && (
                <div className="form-group">
                  <label className="form-label">
                    {role === 'faculty' ? 'Faculty ID / Employee Code' : 'University Roll Number'}
                  </label>
                  <div className="input-with-icon">
                    <Hash size={16} className="input-icon" />
                    <input 
                      className="form-input" 
                      type="text" 
                      placeholder={role === 'faculty' ? 'e.g. FAC-2026' : 'e.g. 21CS101'}
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {!isReg && (
                <div className="form-extra">
                  <label className="remember-checkbox">
                    <input type="checkbox" defaultChecked />
                    <span>Remember my session</span>
                  </label>
                  <a 
                    href="#forgot" 
                    className="forgot-link"
                    onClick={(e) => { 
                      e.preventDefault(); 
                      showToast('Password reset link sent to registered email!', '📧'); 
                    }}
                  >
                    Forgot password?
                  </a>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-full btn-lg auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="auth-btn-loading">
                    <span className="btn-spinner"></span>
                    <span>Validating credentials...</span>
                  </span>
                ) : (
                  <>
                    <span>{isReg ? 'Create Account & Begin' : 'Sign In to Workspace'}</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Access Bar */}
            <div className="auth-demo-section">
              <div className="demo-header">
                <span className="demo-line"></span>
                <span className="demo-title">QUICK DEMO ACCESS (1-CLICK FILL)</span>
                <span className="demo-line"></span>
              </div>
              <div className="demo-cards-row">
                <button
                  type="button"
                  className="demo-card-btn student"
                  onClick={() => handleQuickDemo('student')}
                >
                  <div className="demo-card-avatar">👨‍🎓</div>
                  <div className="demo-card-info">
                    <div className="demo-card-name">Student Account</div>
                    <div className="demo-card-sub">Arjun Sharma • B.Tech CSE</div>
                  </div>
                  <Zap size={14} className="demo-card-zap" />
                </button>

                <button
                  type="button"
                  className="demo-card-btn faculty"
                  onClick={() => handleQuickDemo('faculty')}
                >
                  <div className="demo-card-avatar">👨‍🏫</div>
                  <div className="demo-card-info">
                    <div className="demo-card-name">Faculty Account</div>
                    <div className="demo-card-sub">Prof. Verma • Project Guide</div>
                  </div>
                  <Zap size={14} className="demo-card-zap" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>
    </>
  );
}
