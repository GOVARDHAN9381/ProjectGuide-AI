import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      showToast('Could not save profile. Try again.', '❌');
      setSaving(false);
    }
  };

  const progressPct = (step / 3) * 100;

  return (
    <div style={{
      minHeight: '100vh', background: '#08090f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', fontFamily: 'Inter, sans-serif',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        .ob-card {
          width: 100%; max-width: 580px;
          background: #0d1117; border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px; overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.7);
          animation: obSlide 0.3s cubic-bezier(.22,1,.36,1);
        }
        @keyframes obSlide { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

        /* Progress bar */
        .ob-progress { height: 4px; background: rgba(255,255,255,0.06); }
        .ob-progress-fill {
          height: 100%; background: linear-gradient(90deg,#3b82f6,#6366f1,#8b5cf6);
          transition: width 0.4s ease; border-radius: 0 99px 99px 0;
        }

        /* Header */
        .ob-header {
          padding: 1.5rem 1.75rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .ob-step-label { font-size: 0.68rem; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
        .ob-title { font-size: 1.3rem; font-weight: 800; color: #f1f5f9; }
        .ob-sub { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin-top: 3px; }

        /* Body */
        .ob-body { padding: 1.5rem 1.75rem; display: flex; flex-direction: column; gap: 1.1rem; }

        /* Role pills */
        .ob-roles { display: flex; gap: 10px; }
        .ob-role {
          flex: 1; padding: 0.85rem 1rem; border-radius: 12px; cursor: pointer;
          border: 2px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
          text-align: center; transition: all 0.18s;
        }
        .ob-role:hover { border-color: rgba(99,102,241,0.4); background: rgba(99,102,241,0.07); }
        .ob-role.selected { border-color: #6366f1; background: rgba(99,102,241,0.15); }
        .ob-role-icon { font-size: 1.6rem; margin-bottom: 4px; }
        .ob-role-name { font-size: 0.84rem; font-weight: 700; color: #e2e8f0; }

        /* Form input */
        .ob-label { font-size: 0.78rem; font-weight: 700; color: rgba(255,255,255,0.6); margin-bottom: 5px; display: block; text-transform: uppercase; letter-spacing: 0.05em; }
        .ob-input {
          width: 100%; background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
          padding: 0.65rem 0.9rem; color: #f1f5f9; font-size: 0.88rem;
          outline: none; font-family: inherit; box-sizing: border-box;
          transition: border-color 0.18s;
        }
        .ob-input:focus { border-color: rgba(99,102,241,0.5); }

        /* Skills grid */
        .ob-skills { display: flex; flex-wrap: wrap; gap: 8px; }
        .ob-skill {
          padding: 6px 13px; border-radius: 999px; font-size: 0.8rem; font-weight: 600;
          border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.55); cursor: pointer; transition: all 0.18s;
        }
        .ob-skill:hover { border-color: rgba(99,102,241,0.4); color: #a5b4fc; }
        .ob-skill.selected { border-color: #6366f1; background: rgba(99,102,241,0.18); color: #a5b4fc; }

        /* Domains grid */
        .ob-domains { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px,1fr)); gap: 8px; }
        .ob-domain {
          padding: 0.65rem 0.85rem; border-radius: 12px; cursor: pointer;
          border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03);
          display: flex; align-items: center; gap: 8px;
          font-size: 0.81rem; font-weight: 600; color: rgba(255,255,255,0.55);
          transition: all 0.18s;
        }
        .ob-domain:hover { border-color: rgba(139,92,246,0.4); background: rgba(139,92,246,0.07); color: #c4b5fd; }
        .ob-domain.selected { border-color: #8b5cf6; background: rgba(139,92,246,0.18); color: #c4b5fd; }

        /* Footer */
        .ob-footer {
          padding: 1rem 1.75rem 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.07);
          display: flex; justify-content: space-between; align-items: center;
        }
        .ob-back {
          padding: 0.55rem 1.2rem; border-radius: 10px; font-size: 0.84rem; font-weight: 600;
          border: 1px solid rgba(255,255,255,0.1); background: transparent;
          color: rgba(255,255,255,0.5); cursor: pointer; transition: all 0.18s;
        }
        .ob-back:hover { background: rgba(255,255,255,0.07); color: #f1f5f9; }
        .ob-next {
          padding: 0.55rem 1.6rem; border-radius: 10px; font-size: 0.88rem; font-weight: 700;
          background: linear-gradient(135deg,#3b82f6,#6366f1); border: none;
          color: #fff; cursor: pointer; box-shadow: 0 4px 14px rgba(99,102,241,0.35);
          transition: all 0.2s; display: flex; align-items: center; gap: 6px;
        }
        .ob-next:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,0.5); }
        .ob-next:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* Step dots */
        .ob-dots { display: flex; gap: 6px; }
        .ob-dot { width: 8px; height: 8px; border-radius: 50%; transition: all 0.25s; }
        .ob-dot.active { background: #6366f1; width: 22px; border-radius: 4px; }
        .ob-dot.done { background: #4ade80; }
        .ob-dot.upcoming { background: rgba(255,255,255,0.15); }
      `}</style>

      <div className="ob-card">
        {/* Progress */}
        <div className="ob-progress">
          <div className="ob-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        {/* Header */}
        <div className="ob-header">
          <div className="ob-step-label">Step {step} of 3</div>
          <div className="ob-title">
            {step === 1 && '👋 Tell us about yourself'}
            {step === 2 && '🛠️ Select your skills'}
            {step === 3 && '🎯 What are you interested in?'}
          </div>
          <div className="ob-sub">
            {step === 1 && 'We use this to personalise your AI mentoring experience'}
            {step === 2 && 'Pick the technologies you already know (even a little counts!)'}
            {step === 3 && 'Choose domains you want to work on — this guides project suggestions'}
          </div>
        </div>

        {/* Body */}
        <div className="ob-body">

          {/* STEP 1 — Basic info */}
          {step === 1 && (
            <>
              <div>
                <label className="ob-label">I am a</label>
                <div className="ob-roles">
                  {[
                    { val: 'student', icon: '👨‍🎓', name: 'Student' },
                    { val: 'faculty', icon: '👨‍🏫', name: 'Faculty' },
                  ].map(r => (
                    <div key={r.val} className={`ob-role${role === r.val ? ' selected' : ''}`} onClick={() => setRole(r.val)}>
                      <div className="ob-role-icon">{r.icon}</div>
                      <div className="ob-role-name">{r.name}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="ob-label">{role === 'faculty' ? 'Faculty ID' : 'Roll Number'}</label>
                <input className="ob-input" placeholder={role === 'faculty' ? 'e.g. FAC001' : 'e.g. 21CS101'} value={rollNo} onChange={e => setRollNo(e.target.value)} />
              </div>
              <div>
                <label className="ob-label">Branch / Department</label>
                <input className="ob-input" placeholder="e.g. Computer Science & Engineering" value={branch} onChange={e => setBranch(e.target.value)} />
              </div>
              <div>
                <label className="ob-label">{role === 'faculty' ? 'Designation' : 'Year of Study'}</label>
                <input className="ob-input" placeholder={role === 'faculty' ? 'e.g. Assistant Professor' : 'e.g. 3rd Year'} value={year} onChange={e => setYear(e.target.value)} />
              </div>
            </>
          )}

          {/* STEP 2 — Skills */}
          {step === 2 && (
            <>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                {Object.keys(skills).length} selected · Click to toggle
              </p>
              <div className="ob-skills">
                {SKILLS_LIST.map(s => (
                  <button key={s} className={`ob-skill${skills[s] ? ' selected' : ''}`} onClick={() => toggleSkill(s)}>
                    {skills[s] ? '✓ ' : ''}{s}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP 3 — Interests */}
          {step === 3 && (
            <>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                {domains.length} selected · Pick as many as you like
              </p>
              <div className="ob-domains">
                {DOMAINS.map(d => (
                  <div key={d.label} className={`ob-domain${domains.includes(d.label) ? ' selected' : ''}`} onClick={() => toggleDomain(d.label)}>
                    <span>{d.icon}</span>{d.label}
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

          <div style={{ display: 'flex', gap: 8 }}>
            {step > 1 && (
              <button className="ob-back" onClick={() => setStep(s => s - 1)}>← Back</button>
            )}
            {step < 3 ? (
              <button className="ob-next" onClick={() => setStep(s => s + 1)}>
                Continue →
              </button>
            ) : (
              <button className="ob-next" disabled={saving} onClick={handleFinish}>
                {saving ? '⏳ Saving…' : '🚀 Go to Dashboard'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
