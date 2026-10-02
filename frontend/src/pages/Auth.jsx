import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
        const hasSkills = Boolean(current.hasCompletedProfile || (profile.skills && Object.keys(profile.skills).length > 0));
        if (!hasSkills) {
          navigate('/profile');
        } else {
          navigate('/dashboard');
        }
      }
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please fill all required fields.', '⚠️');
      return;
    }
    if (password.length < 6) {
      setPasswordError(true);
      showToast('Password must be at least 6 characters.', '⚠️');
      return;
    }
    setPasswordError(false);
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
            // Already registered & gave skills/interests -> directly go to Dashboard!
            navigate('/dashboard');
          } else {
            // Student has not completed profile yet
            navigate('/profile');
          }
        }, 600);

      } catch (err) {
        setLoading(false);
        const rawMsg = err.message || '';
        let displayMsg = 'Sign in failed. Please check your credentials.';

        if (rawMsg.includes('404') || rawMsg.toLowerCase().includes('not found') || rawMsg.toLowerCase().includes('account not found')) {
          displayMsg = "Account not found. Please click 'Create Account' to register first.";
        } else if (rawMsg.includes('401') || rawMsg.toLowerCase().includes('incorrect password')) {
          displayMsg = "Incorrect password. Please try again.";
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
        }, 600);

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

  const fillDemoStudent = () => {
    setEmail('arjun.sharma@college.edu.in');
    setPassword('password123');
    setRole('student');
    setMode('login');
    setAuthError('');
    showToast('Loaded Student demo credentials', '👨‍🎓');
  };

  const fillDemoFaculty = () => {
    setEmail('prof.verma@college.edu.in');
    setPassword('faculty123');
    setRole('faculty');
    setMode('login');
    setAuthError('');
    showToast('Loaded Faculty demo credentials', '👨‍🏫');
  };

  const isReg = mode === 'register';

  return (
    <>
      <div className="page-bg-glow"></div>
      <div className="page-bg-glow-2"></div>

      <main className="auth-page">
        <div className="auth-split animate-fade-up">
          
          {/* Left Panel */}
          <div className="auth-left">
            <div className="auth-brand">
              <div className="auth-brand-icon">🎓</div>
              <span>ProjectGuide<span style={{ color: '#60a5fa' }}>-AI</span></span>
            </div>

            <div className="auth-left-body">
              <h1 className="auth-left-title">
                Your AI-Powered<br />Project Guide
              </h1>
              <p className="auth-left-desc">
                Submit your rough idea, get an instant blueprint, and follow a guided milestone roadmap.
              </p>
              <ul className="auth-feature-list">
                <li>Instant feasibility check &amp; scope analysis</li>
                <li>AI-recommended tech stack for your skills</li>
                <li>Milestone roadmap generated based on your timeline</li>
                <li>Conversational mentor — voice &amp; text support</li>
                <li>Faculty review &amp; live progress tracking</li>
              </ul>
            </div>

            <div className="auth-left-footer">
              © 2026 ProjectGuide-AI — Infosys Project
            </div>
          </div>

          {/* Right Panel */}
          <div className="auth-right">
            <div className="auth-form-header">
              <h2 className="auth-form-title">{isReg ? 'Create Account' : 'Welcome Back'}</h2>
              <p className="auth-form-sub">
                {isReg ? 'Set up your account to start AI project mentoring' : 'Sign in to your account to continue'}
              </p>
            </div>

            <div className="auth-tabs">
              <button 
                type="button"
                className={`auth-tab ${!isReg ? 'active' : ''}`} 
                onClick={() => { setMode('login'); setAuthError(''); }}
              >
                Sign In
              </button>
              <button 
                type="button"
                className={`auth-tab ${isReg ? 'active' : ''}`} 
                onClick={() => { setMode('register'); setAuthError(''); }}
              >
                Create Account
              </button>
            </div>

            <div className="role-pills">
              <label className={`role-pill ${role === 'student' ? 'selected' : ''}`}>
                <input 
                  type="radio" 
                  name="userRole" 
                  value="student" 
                  checked={role === 'student'} 
                  onChange={() => { setRole('student'); setAuthError(''); }} 
                />
                👨‍🎓 Student
              </label>
              <label className={`role-pill ${role === 'faculty' ? 'selected' : ''}`}>
                <input 
                  type="radio" 
                  name="userRole" 
                  value="faculty" 
                  checked={role === 'faculty'} 
                  onChange={() => { setRole('faculty'); setAuthError(''); }} 
                />
                👨‍🏫 Faculty
              </label>
            </div>

            {authError && (
              <div className="auth-alert-box">
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <span>{authError}</span>
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
              
              {isReg && (
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    className="form-input" 
                    type="text" 
                    placeholder="e.g. Arjun Sharma"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setAuthError(''); }}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Institute Email</label>
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

              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  className="form-input" 
                  type="password" 
                  placeholder="••••••••" 
                  required 
                  autoComplete={isReg ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setAuthError(''); }}
                />
                {passwordError && (
                  <span className="form-error">Password must be at least 6 characters.</span>
                )}
              </div>

              {isReg && (
                <div className="form-group">
                  <label className="form-label">Roll Number / Faculty ID</label>
                  <input 
                    className="form-input" 
                    type="text" 
                    placeholder={role === 'faculty' ? 'e.g. FAC001' : 'e.g. 21CS101'}
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                  />
                </div>
              )}

              {!isReg && (
                <div className="form-extra">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked style={{ accentColor: 'var(--blue)' }} /> Remember me
                  </label>
                  <a href="#forgot" onClick={(e) => { e.preventDefault(); showToast('Password reset link sent to your email!', '📧'); }}>
                    Forgot password?
                  </a>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                style={{ marginTop: '0.25rem' }}
                disabled={loading}
              >
                {loading ? '⏳ Authenticating...' : (isReg ? '✨ Create Account & Proceed' : 'Sign In')}
              </button>
            </form>

            <div className="demo-hint">
              💡 <strong>Quick Demo:</strong>{' '}
              <span onClick={fillDemoStudent}>Student Login</span> or{' '}
              <span onClick={fillDemoFaculty}>Faculty Login</span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
