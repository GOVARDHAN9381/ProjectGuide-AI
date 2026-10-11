import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Layers,
  Compass,
  Rocket
} from 'lucide-react';
import { Store } from '../utils/store';
import { submitOnboarding, updateUserProfile } from '../utils/api';
import { showToast } from '../utils/toast';

const SKILLS_LIST = [
  'Python','JavaScript','Java','C++','React','Node.js',
  'MongoDB','SQL','Machine Learning','Deep Learning',
  'IoT','Android','Flutter','Django','FastAPI','Docker',
  'Git','Firebase','REST APIs','Data Structures',
];

const DOMAINS = [
  { icon:'🌐', label:'Web Development' },
  { icon:'🤖', label:'Artificial Intelligence' },
  { icon:'📱', label:'Mobile Apps' },
  { icon:'🔌', label:'IoT / Embedded' },
  { icon:'☁️', label:'Cloud Computing' },
  { icon:'🔒', label:'Cybersecurity' },
  { icon:'📊', label:'Data Science' },
  { icon:'🎮', label:'Game Development' },
  { icon:'⛓️', label:'Blockchain' },
  { icon:'🤝', label:'Open Source' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const user = Store.get('currentUser') || {};

  const [step, setStep]       = useState(1);
  const [role, setRole]       = useState('student');
  const [rollNo, setRollNo]   = useState('');
  const [branch, setBranch]   = useState('');
  const [year, setYear]       = useState('');
  const [skills, setSkills]   = useState({});  // { skill: level 1-5 }
  const [domains, setDomains] = useState([]);  // selected domain labels
  const [saving, setSaving]   = useState(false);

  const toggleSkill = (skill) => {
    setSkills(prev => {
      if (prev[skill]) { const n = {...prev}; delete n[skill]; return n; }
      return { ...prev, [skill]: 3 };  // default level 3
    });
  };

  const toggleDomain = (label) => {
    setDomains(prev =>
      prev.includes(label) ? prev.filter(d => d !== label) : [...prev, label]
    );
  };

  const handleFinish = async () => {
    if (Object.keys(skills).length === 0) {
      showToast('Please select at least one skill', '⚠️'); return;
    }
    if (domains.length === 0) {
      showToast('Please select at least one interest domain', '⚠️'); return;
    }
    setSaving(true);

    const nameParts = (user.name || 'User').split(' ');
    const payload = {
      firstName: nameParts[0] || '',
      lastName:  nameParts.slice(1).join(' ') || '',
      email:     user.email || '',
      rollNo:    rollNo || (role === 'faculty' ? 'FAC001' : '21CS101'),
      branch:    branch || 'Computer Science & Engineering',
      year:      year || '3rd Year',
      skills,
      domains,
      teamSize:  '3',
      aboutMe:   '',
    };

    try {
      const result = await submitOnboarding(payload);
      Store.set('profile', { ...payload, student_id: result.student_id, hasCompletedProfile: true });
      Store.set('currentUser', { ...user, ...payload, role, hasCompletedProfile: true, loggedIn: true });

      try {
        await updateUserProfile({
          email: payload.email,
          name: `${payload.firstName} ${payload.lastName}`.trim(),
          skills: payload.skills,
          domains: payload.domains,
          aboutMe: payload.aboutMe,
          teamSize: payload.teamSize,
          branch: payload.branch,
          year: payload.year,
          rollNo: payload.rollNo
        });
      } catch (syncErr) {
        console.warn('User profile sync warning:', syncErr);
      }

      showToast('Profile saved! Welcome 🎉', '✅');
      setTimeout(() => navigate(role === 'faculty' ? '/faculty-dashboard' : '/dashboard'), 600);
    } catch (err) {
      console.error('Onboarding save error:', err);
      showToast('Saved locally — proceed to dashboard', '⚠️');
      Store.set('profile', { ...payload, hasCompletedProfile: true });
      Store.set('currentUser', { ...user, ...payload, role, hasCompletedProfile: true, loggedIn: true });
      setTimeout(() => navigate(role === 'faculty' ? '/faculty-dashboard' : '/dashboard'), 600);
    } finally {
      setSaving(false);
    }
  };

  const progressPct = (step / 3) * 100;

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1.5rem', position: 'relative', overflow: 'hidden'
    }}>
      <div className="page-bg-glow"></div>
      <div className="page-bg-glow-2"></div>

      <style>{`
        .ob-card {
          width: 100%; max-width: 620px;
          background: rgba(14, 19, 32, 0.88);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px; overflow: hidden;
          box-shadow: 0 24px 72px -12px rgba(0, 0, 0, 0.75), 0 0 50px rgba(99, 102, 241, 0.12);
          animation: obSlide 0.35s cubic-bezier(.16,1,.3,1);
          position: relative; z-index: 1;
        }
        @keyframes obSlide { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }

        /* Progress bar */
        .ob-progress { height: 4px; background: rgba(255,255,255,0.06); }
        .ob-progress-fill {
          height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6, #38bdf8);
          transition: width 0.4s ease; border-radius: 0 99px 99px 0;
          box-shadow: 0 0 10px rgba(99,102,241,0.5);
        }

        /* Header */
        .ob-header {
          padding: 1.8rem 2rem 1.2rem;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .ob-step-label {
          font-size: 0.68rem; font-weight: 700; color: #818cf8;
          text-transform: uppercase; letter-spacing: 0.09em; margin-bottom: 5px;
        }
        .ob-title {
          font-size: 1.35rem; font-weight: 800; color: #f8fafc;
          letter-spacing: -0.025em;
        }
        .ob-sub { font-size: 0.82rem; color: #94a3b8; margin-top: 4px; line-height: 1.45; }

        /* Body */
        .ob-body { padding: 1.8rem 2rem; display: flex; flex-direction: column; gap: 1.25rem; }

        /* Role pills */
        .ob-roles { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .ob-role {
          padding: 1rem 1.1rem; border-radius: 14px; cursor: pointer;
          border: 1.5px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
          text-align: center; transition: all 0.2s cubic-bezier(.16,1,.3,1);
          display: flex; flex-direction: column; align-items: center; gap: 6px;
        }
        .ob-role:hover {
          border-color: rgba(99,102,241,0.4);
          background: rgba(99,102,241,0.07);
          transform: translateY(-2px);
        }
        .ob-role.selected {
          border-color: #6366f1;
          background: linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.12) 100%);
          box-shadow: 0 4px 18px rgba(99,102,241,0.25);
        }
        .ob-role-icon {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.06); color: #818cf8;
        }
        .ob-role.selected .ob-role-icon {
          background: #6366f1; color: #fff;
          box-shadow: 0 0 12px rgba(99,102,241,0.5);
        }
        .ob-role-name { font-size: 0.86rem; font-weight: 700; color: #f8fafc; }

        /* Form input */
        .ob-label {
          font-size: 0.72rem; font-weight: 700; color: #64748b;
          margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: 0.07em;
        }
        .ob-input {
          width: 100%; background: rgba(10, 15, 27, 0.75);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
          padding: 0.72rem 1rem; color: #f8fafc; font-size: 0.88rem;
          outline: none; font-family: inherit; box-sizing: border-box;
          transition: all 0.2s;
        }
        .ob-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.2), 0 0 16px rgba(99,102,241,0.15);
        }

        /* Skills grid */
        .ob-skills { display: flex; flex-wrap: wrap; gap: 8px; }
        .ob-skill {
          padding: 7px 14px; border-radius: 999px; font-size: 0.8rem; font-weight: 600;
          border: 1px solid rgba(255,255,255,0.09); background: rgba(255,255,255,0.03);
          color: #94a3b8; cursor: pointer; transition: all 0.18s;
          display: inline-flex; align-items: center; gap: 5px;
        }
        .ob-skill:hover {
          border-color: rgba(99,102,241,0.4); color: #f8fafc;
          background: rgba(99,102,241,0.08);
        }
        .ob-skill.selected {
          border-color: #6366f1;
          background: linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.15) 100%);
          color: #c7d2fe;
          box-shadow: 0 2px 10px rgba(99,102,241,0.2);
        }

        /* Domains grid */
        .ob-domains { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px,1fr)); gap: 10px; }
        .ob-domain {
          padding: 0.75rem 0.95rem; border-radius: 12px; cursor: pointer;
          border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.025);
          display: flex; align-items: center; gap: 9px;
          font-size: 0.82rem; font-weight: 600; color: #94a3b8;
          transition: all 0.2s cubic-bezier(.16,1,.3,1);
        }
        .ob-domain:hover {
          border-color: rgba(99,102,241,0.4);
          background: rgba(99,102,241,0.08);
          color: #f8fafc;
          transform: translateY(-1.5px);
        }
        .ob-domain.selected {
          border-color: #6366f1;
          background: linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.12) 100%);
          color: #fff;
          box-shadow: 0 4px 16px rgba(99,102,241,0.2);
        }

        /* Footer */
        .ob-footer {
          padding: 1.2rem 2rem 1.6rem;
          border-top: 1px solid rgba(255,255,255,0.07);
          display: flex; justify-content: space-between; align-items: center;
        }
        .ob-back {
          padding: 0.6rem 1.3rem; border-radius: 10px; font-size: 0.84rem; font-weight: 600;
          border: 1px solid rgba(255,255,255,0.1); background: transparent;
          color: #94a3b8; cursor: pointer; transition: all 0.18s;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .ob-back:hover { background: rgba(255,255,255,0.06); color: #f8fafc; }
        .ob-next {
          padding: 0.65rem 1.8rem; border-radius: 12px; font-size: 0.88rem; font-weight: 700;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border: 1px solid rgba(255,255,255,0.15);
          color: #fff; cursor: pointer; box-shadow: 0 4px 18px rgba(99,102,241,0.4);
          transition: all 0.2s cubic-bezier(.16,1,.3,1); display: inline-flex; align-items: center; gap: 7px;
        }
        .ob-next:hover {
          background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
          transform: translateY(-1.5px); box-shadow: 0 6px 24px rgba(99,102,241,0.55);
        }
        .ob-next:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* Step dots */
        .ob-dots { display: flex; gap: 6px; }
        .ob-dot { width: 8px; height: 8px; border-radius: 50%; transition: all 0.25s; }
        .ob-dot.active { background: #6366f1; width: 24px; border-radius: 6px; box-shadow: 0 0 10px rgba(99,102,241,0.5); }
        .ob-dot.done { background: #10b981; }
        .ob-dot.upcoming { background: rgba(255,255,255,0.12); }
      `}</style>

      <div className="ob-card">
        {/* Progress */}
        <div className="ob-progress">
          <div className="ob-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        {/* Header */}
        <div className="ob-header">
          <div className="ob-step-label">Step {step} of 3 • Profile Setup</div>
          <div className="ob-title">
            {step === 1 && 'Basic Researcher Profile'}
            {step === 2 && 'Skillsets & Technical Capabilities'}
            {step === 3 && 'Project Domains & Specializations'}
          </div>
          <div className="ob-sub">
            {step === 1 && 'Personalizes AI milestone roadmaps and feasibility scoring algorithms.'}
            {step === 2 && 'Select frameworks and tools you know. AI generates customized recommendations.'}
            {step === 3 && 'Choose your engineering areas to calibrate project discovery suggestions.'}
          </div>
        </div>

        {/* Body */}
        <div className="ob-body">

          {/* STEP 1 — Basic info */}
          {step === 1 && (
            <>
              <div>
                <label className="ob-label">Academic Role</label>
                <div className="ob-roles">
                  {[
                    { val: 'student', icon: <GraduationCap size={18} />, name: 'Student Researcher' },
                    { val: 'faculty', icon: <Briefcase size={18} />,     name: 'Faculty Advisor' },
                  ].map(r => (
                    <div key={r.val} className={`ob-role${role === r.val ? ' selected' : ''}`} onClick={() => setRole(r.val)}>
                      <div className="ob-role-icon">{r.icon}</div>
                      <div className="ob-role-name">{r.name}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="ob-label">{role === 'faculty' ? 'Faculty ID / Employee Code' : 'University Roll Number'}</label>
                <input className="ob-input" placeholder={role === 'faculty' ? 'e.g. FAC001' : 'e.g. 21CS101'} value={rollNo} onChange={e => setRollNo(e.target.value)} />
              </div>
              <div>
                <label className="ob-label">Branch / Department</label>
                <input className="ob-input" placeholder="e.g. Computer Science & Engineering" value={branch} onChange={e => setBranch(e.target.value)} />
              </div>
              <div>
                <label className="ob-label">{role === 'faculty' ? 'Academic Designation' : 'Year of Study'}</label>
                <input className="ob-input" placeholder={role === 'faculty' ? 'e.g. Assistant Professor' : 'e.g. 3rd Year (B.Tech)'} value={year} onChange={e => setYear(e.target.value)} />
              </div>
            </>
          )}

          {/* STEP 2 — Skills */}
          {step === 2 && (
            <>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                <span style={{ color: '#818cf8', fontWeight: 700 }}>{Object.keys(skills).length}</span> skills selected • Click to toggle
              </p>
              <div className="ob-skills">
                {SKILLS_LIST.map(s => (
                  <button key={s} className={`ob-skill${skills[s] ? ' selected' : ''}`} onClick={() => toggleSkill(s)}>
                    {skills[s] && <Check size={13} style={{ strokeWidth: 3 }} />}
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP 3 — Interests */}
          {step === 3 && (
            <>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                <span style={{ color: '#818cf8', fontWeight: 700 }}>{domains.length}</span> domains chosen • Select all that apply
              </p>
              <div className="ob-domains">
                {DOMAINS.map(d => (
                  <div key={d.label} className={`ob-domain${domains.includes(d.label) ? ' selected' : ''}`} onClick={() => toggleDomain(d.label)}>
                    <span>{d.icon}</span>
                    <span>{d.label}</span>
                    {domains.includes(d.label) && <Check size={13} style={{ marginLeft: 'auto', color: '#38bdf8' }} />}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="ob-footer">
          <div className="ob-dots">
            {[1, 2, 3].map(s => (
              <div key={s} className={`ob-dot ${s === step ? 'active' : s < step ? 'done' : 'upcoming'}`} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {step > 1 && (
              <button className="ob-back" onClick={() => setStep(s => s - 1)}>
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
            )}
            {step < 3 ? (
              <button className="ob-next" onClick={() => setStep(s => s + 1)}>
                <span>Continue</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <button className="ob-next" disabled={saving} onClick={handleFinish}>
                {saving ? (
                  <span>Saving Profile...</span>
                ) : (
                  <>
                    <span>Enter Workspace</span>
                    <Rocket size={15} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
