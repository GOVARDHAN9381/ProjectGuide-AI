import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ChatbotPanel from '../components/ChatbotPanel';
import { Store } from '../utils/store';
import { showToast } from '../utils/toast';
import { SKILLS, LEVEL_LABELS, DOMAINS } from '../utils/constants';
import { submitOnboarding, updateUserProfile } from '../utils/api';

export default function Profile() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    rollNo: '',
    branch: '',
    year: '3rd Year'
  });
  const [skills, setSkills] = useState({});
  const [otherSkills, setOtherSkills] = useState('');
  const [domains, setDomains] = useState([]);
  const [otherDomains, setOtherDomains] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [teamSize, setTeamSize] = useState('3');
  const [avatar, setAvatar] = useState(null);
  const [errors, setErrors] = useState({});

  const fileInputRef = useRef(null);

  useEffect(() => {
    const user = Store.get('currentUser');
    if (!user || !user.loggedIn) {
      navigate('/login');
      return;
    }
    const saved = Store.get('profile') || {};
    const parts = (saved.name || user.name || '').split(' ');
    setProfile({
      firstName: saved.firstName || parts[0] || '',
      lastName: saved.lastName || parts.slice(1).join(' ') || '',
      email: saved.email || user.email || '',
      rollNo: saved.rollNo || user.rollNo || '',
      branch: saved.branch || 'Computer Science & Engineering',
      year: saved.year || '3rd Year'
    });
    if (saved.skills) setSkills(saved.skills);
    if (saved.otherSkills) setOtherSkills(saved.otherSkills);
    if (saved.domains && saved.domains.length > 0) setDomains(saved.domains);
    else setDomains(['aiml', 'web']);
    if (saved.otherDomains) setOtherDomains(saved.otherDomains);
    if (saved.aboutMe) setAboutMe(saved.aboutMe);
    if (saved.teamSize) setTeamSize(saved.teamSize);

    const storedAvatar = Store.get('avatarDataUrl') || saved.avatar || user.avatar;
    if (storedAvatar) setAvatar(storedAvatar);
  }, [navigate]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2MB', '⚠️');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setAvatar(evt.target.result);
      Store.set('avatarDataUrl', evt.target.result);
      showToast('Profile photo updated!', '📸');
    };
    reader.readAsDataURL(file);
  };

  const handleNextStep1 = () => {
    const newErrors = {};
    if (!profile.firstName.trim()) newErrors.firstName = true;
    if (!profile.lastName.trim()) newErrors.lastName = true;
    if (!profile.email.trim()) newErrors.email = true;
    if (!profile.rollNo.trim()) newErrors.rollNo = true;
    if (!profile.branch) newErrors.branch = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Please fill all required fields.', '⚠️');
      return;
    }
    setErrors({});
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextStep2 = () => {
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextStep3 = () => {
    if (domains.length === 0 && !otherDomains.trim()) {
      showToast('Please select at least one domain.', '⚠️');
      return;
    }
    setStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    const hasSkills = Object.keys(skills).length > 0;
    const finalProfile = {
      ...profile,
      name: `${profile.firstName.trim()} ${profile.lastName.trim()}`,
      skills,
      otherSkills: otherSkills.trim(),
      domains,
      otherDomains: otherDomains.trim(),
      aboutMe: aboutMe.trim(),
      teamSize,
      avatar,
      hasCompletedProfile: hasSkills
    };

    Store.set('profile', finalProfile);

    // Also update currentUser with profile completion flag and latest skills/domains
    const curUser = Store.get('currentUser') || {};
    Store.set('currentUser', {
      ...curUser,
      name: finalProfile.name,
      email: finalProfile.email,
      rollNo: finalProfile.rollNo,
      skills,
      domains,
      hasCompletedProfile: hasSkills
    });

    // Send onboarding data to the backend
    try {
      const result = await submitOnboarding({
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        email: profile.email,
        rollNo: profile.rollNo,
        branch: profile.branch,
        year: profile.year,
        skills,
        otherSkills: otherSkills.trim(),
        domains,
        otherDomains: otherDomains.trim(),
        aboutMe: aboutMe.trim(),
        teamSize
      });
      if (result && result.student_id) {
        Store.set('studentId', result.student_id);
      }
    } catch (err) {
      console.warn('Onboarding API call error:', err);
    }

    // Sync to auth user profile so user record permanently retains skills and completion status
    try {
      await updateUserProfile({
        email: profile.email,
        name: finalProfile.name,
        skills,
        domains,
        aboutMe: aboutMe.trim(),
        teamSize,
        branch: profile.branch,
        year: profile.year,
        rollNo: profile.rollNo
      });
    } catch (err) {
      console.warn('User profile sync error:', err);
    }

    showToast('Profile & skills saved successfully!', '🎉');
    setTimeout(() => {
      navigate('/dashboard');
    }, 600);
  };

  const toggleDomain = (id) => {
    if (domains.includes(id)) {
      setDomains(domains.filter(d => d !== id));
    } else {
      setDomains([...domains, id]);
    }
  };

  const setSkillRating = (id, rating) => {
    setSkills(prev => ({
      ...prev,
      [id]: prev[id] === rating ? 0 : rating
    }));
  };

  const initial = profile.firstName ? profile.firstName.charAt(0).toUpperCase() : 'S';

  return (
    <>
      <Navbar />
      <ChatbotPanel />
      <div className="page-bg-glow"></div>
      <div className="page-bg-glow-2"></div>

      <main className="profile-page">
        <div className="container" style={{ maxWidth: '720px' }}>
          
          {/* Header */}
          <div className="profile-header animate-fade-up">
            <div className="section-badge" style={{ marginBottom: '.75rem' }}>👤 Student Profile</div>
            <h1>Set Up Your <span style={{ color: 'var(--blue)' }}>Profile</span></h1>
            <p>Your AI mentor uses this to personalize project roadmaps and feasibility checks.</p>
          </div>

          {/* Step Bar */}
          <div className="step-bar animate-fade-up delay-1">
            <div className={`step-item ${step >= 1 ? 'active' : ''}`} onClick={() => setStep(1)} style={{ cursor: 'pointer' }}>
              <div className="step-circle">{step > 1 ? '✓' : '1'}</div>
              <div className="step-label">Basic Info</div>
            </div>
            <div className={`step-item ${step >= 2 ? 'active' : ''}`} onClick={() => step > 1 && setStep(2)} style={{ cursor: step > 1 ? 'pointer' : 'default' }}>
              <div className="step-circle">{step > 2 ? '✓' : '2'}</div>
              <div className="step-label">Skills</div>
            </div>
            <div className={`step-item ${step >= 3 ? 'active' : ''}`} onClick={() => step > 2 && setStep(3)} style={{ cursor: step > 2 ? 'pointer' : 'default' }}>
              <div className="step-circle">{step > 3 ? '✓' : '3'}</div>
              <div className="step-label">Interests</div>
            </div>
            <div className={`step-item ${step >= 4 ? 'active' : ''}`} onClick={() => step > 3 && setStep(4)} style={{ cursor: step > 3 ? 'pointer' : 'default' }}>
              <div className="step-circle">4</div>
              <div className="step-label">Review</div>
            </div>
          </div>

          {/* Form Card */}
          <div className="form-card animate-fade-up delay-2">
            
            {/* STEP 1: Basic Info */}
            {step === 1 && (
              <div>
                <h2 className="step-title">🙋 Tell us about yourself</h2>
                <p className="step-desc">This helps faculty and the AI identify your project in the system.</p>

                {/* Avatar upload */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Profile Photo <span style={{ color: 'var(--text-faint)' }}>(optional)</span></label>
                  <div className="avatar-upload" onClick={() => fileInputRef.current?.click()}>
                    <div className="avatar-preview">
                      {avatar ? <img src={avatar} alt="Profile" /> : initial}
                    </div>
                    <div className="avatar-upload-text">
                      <strong>Click to upload photo</strong>
                      JPG, PNG up to 2 MB
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={handleAvatarChange} 
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">First Name <span style={{ color: 'var(--red)' }}>*</span></label>
                    <input 
                      className="form-input" 
                      type="text" 
                      placeholder="e.g. Arjun"
                      value={profile.firstName} 
                      onChange={e => setProfile({ ...profile, firstName: e.target.value })} 
                    />
                    {errors.firstName && <span className="form-error">Please enter your first name.</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name <span style={{ color: 'var(--red)' }}>*</span></label>
                    <input 
                      className="form-input" 
                      type="text" 
                      placeholder="e.g. Sharma"
                      value={profile.lastName} 
                      onChange={e => setProfile({ ...profile, lastName: e.target.value })} 
                    />
                    {errors.lastName && <span className="form-error">Please enter your last name.</span>}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Institute Email <span style={{ color: 'var(--red)' }}>*</span></label>
                  <input 
                    className="form-input" 
                    type="email" 
                    placeholder="student@college.edu.in"
                    value={profile.email} 
                    onChange={e => setProfile({ ...profile, email: e.target.value })} 
                  />
                  {errors.email && <span className="form-error">Please enter a valid email.</span>}
                </div>

                <div className="grid-2" style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Roll Number <span style={{ color: 'var(--red)' }}>*</span></label>
                    <input 
                      className="form-input" 
                      type="text" 
                      placeholder="e.g. 21CS101"
                      value={profile.rollNo} 
                      onChange={e => setProfile({ ...profile, rollNo: e.target.value })} 
                    />
                    {errors.rollNo && <span className="form-error">Please enter your roll number.</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Branch / Department <span style={{ color: 'var(--red)' }}>*</span></label>
                    <select 
                      className="form-select" 
                      value={profile.branch} 
                      onChange={e => setProfile({ ...profile, branch: e.target.value })}
                    >
                      <option value="">Select branch</option>
                      <option>Computer Science & Engineering</option>
                      <option>Information Technology</option>
                      <option>Electronics & Communication</option>
                      <option>Electrical Engineering</option>
                      <option>Mechanical Engineering</option>
                      <option>Data Science & AI</option>
                      <option>Other</option>
                    </select>
                    {errors.branch && <span className="form-error">Please select your branch.</span>}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Year of Study <span style={{ color: 'var(--red)' }}>*</span></label>
                  <div className="year-pills">
                    {['1st Year', '2nd Year', '3rd Year', '4th Year', 'MCA / MTech'].map(yr => (
                      <label key={yr} className={`year-pill ${profile.year === yr ? 'selected' : ''}`} onClick={() => setProfile({ ...profile, year: yr })}>
                        <input type="radio" name="year" value={yr} checked={profile.year === yr} onChange={() => {}} /> 
                        {yr === 'MCA / MTech' ? 'PG' : yr}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-nav">
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-faint)' }}>Step 1 of 4</span>
                  <button className="btn btn-primary" onClick={handleNextStep1}>Next: Skills →</button>
                </div>
              </div>
            )}

            {/* STEP 2: Skills */}
            {step === 2 && (
              <div>
                <h2 className="step-title">⚡ Rate Your Skills</h2>
                <p className="step-desc">Our AI uses this to assess project feasibility and match you with the right technology stack.</p>

                <div className="alert alert-info" style={{ marginBottom: '1.5rem', fontSize: '0.84rem' }}>
                  ℹ️ Click on the stars (1–5) to rate your proficiency in each technology.
                </div>

                <div className="skills-grid">
                  {SKILLS.map(skill => {
                    const rating = skills[skill.id] || 0;
                    return (
                      <div className="skill-row" key={skill.id}>
                        <div className="skill-name">
                          <span>{skill.icon}</span> {skill.name}
                        </div>
                        <div className="skill-stars">
                          {[1, 2, 3, 4, 5].map(n => (
                            <button 
                              type="button"
                              key={n}
                              className={`star-btn ${rating >= n ? 'lit' : ''}`}
                              onClick={() => setSkillRating(skill.id, n)}
                              title={`Level ${n}: ${LEVEL_LABELS[n]}`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <div className="skill-level">{LEVEL_LABELS[rating] || '—'}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                  <label className="form-label">Other Skills <span style={{ color: 'var(--text-faint)' }}>(comma separated)</span></label>
                  <input 
                    className="form-input" 
                    type="text" 
                    placeholder="e.g. Rust, Figma, Go, GraphQL"
                    value={otherSkills} 
                    onChange={e => setOtherSkills(e.target.value)} 
                  />
                </div>

                <div className="form-nav">
                  <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-faint)' }}>Step 2 of 4</span>
                  <button className="btn btn-primary" onClick={handleNextStep2}>Next: Interests →</button>
                </div>
              </div>
            )}

            {/* STEP 3: Interests & Domains */}
            {step === 3 && (
              <div>
                <h2 className="step-title">🎯 Choose Your Interests</h2>
                <p className="step-desc">Select all domains that interest you. The AI will suggest and assess project ideas from these areas.</p>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Project Domains <span style={{ color: 'var(--red)' }}>*</span></label>
                  <div className="domain-group">
                    {DOMAINS.map(d => {
                      const isSelected = domains.includes(d.id);
                      return (
                        <div 
                          key={d.id} 
                          className={`domain-tag ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleDomain(d.id)}
                        >
                          <div className="domain-tag-icon">{d.icon}</div>
                          <div className="domain-tag-name">{d.name}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Other Domains <span style={{ color: 'var(--text-faint)' }}>(comma separated)</span></label>
                  <input 
                    className="form-input" 
                    type="text" 
                    placeholder="e.g. Quantum Computing, Bioinformatics, Fintech"
                    value={otherDomains} 
                    onChange={e => setOtherDomains(e.target.value)} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">About Me / Project Goals <span style={{ color: 'var(--text-faint)' }}>(optional)</span></label>
                  <textarea 
                    className="form-textarea" 
                    rows="4" 
                    maxLength="400"
                    placeholder="What excites you most about your project? Any specific tools or challenges you want to tackle..."
                    value={aboutMe} 
                    onChange={e => setAboutMe(e.target.value)} 
                  />
                  <div className="char-counter">{aboutMe.length}/400</div>
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Preferred Team Size</label>
                  <select 
                    className="form-select" 
                    value={teamSize} 
                    onChange={e => setTeamSize(e.target.value)}
                  >
                    <option value="1">Solo (just me)</option>
                    <option value="2">2 members</option>
                    <option value="3">3 members</option>
                    <option value="4">4 members</option>
                    <option value="5">5 members</option>
                  </select>
                </div>

                <div className="form-nav">
                  <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-faint)' }}>Step 3 of 4</span>
                  <button className="btn btn-primary" onClick={handleNextStep3}>Review Profile →</button>
                </div>
              </div>
            )}

            {/* STEP 4: Review & Confirm */}
            {step === 4 && (
              <div>
                <h2 className="step-title" style={{ textAlign: 'center' }}>✅ Review Your Profile</h2>
                <p className="step-desc" style={{ textAlign: 'center' }}>Everything look good? Save to update your profile and activate your AI mentor.</p>

                <div className="summary-card">
                  <div className="summary-avatar">
                    {avatar ? <img src={avatar} alt="Profile" /> : initial}
                  </div>
                  <div className="summary-name">{profile.firstName} {profile.lastName}</div>
                  <div className="summary-meta">{profile.rollNo} · {profile.branch} · {profile.year}</div>

                  <div className="divider"></div>

                  <div className="summary-section">
                    <div className="summary-section-title">📧 Contact</div>
                    <div style={{ fontSize: '.88rem', color: 'var(--text-muted)' }}>{profile.email}</div>
                  </div>

                  <div className="summary-section">
                    <div className="summary-section-title">⚡ Skills &amp; Proficiency</div>
                    <div className="summary-skills">
                      {Object.keys(skills).filter(k => skills[k] > 0).map(k => {
                        const sk = SKILLS.find(s => s.id === k);
                        if (!sk) return null;
                        const rating = skills[k];
                        const pct = (rating / 5) * 100;
                        return (
                          <div className="summary-skill-row" key={k}>
                            <span style={{ minWidth: '130px', fontWeight: 500 }}>{sk.icon} {sk.name}</span>
                            <div className="summary-skill-bar-wrap">
                              <div className="summary-skill-bar" style={{ width: `${pct}%` }}></div>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '75px', textAlign: 'right' }}>
                              {LEVEL_LABELS[rating]}
                            </span>
                          </div>
                        );
                      })}
                      {otherSkills && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          <strong>Additional:</strong> {otherSkills}
                        </div>
                      )}
                      {Object.keys(skills).filter(k => skills[k] > 0).length === 0 && !otherSkills && (
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-faint)' }}>No skills rated yet.</div>
                      )}
                    </div>
                  </div>

                  <div className="summary-section">
                    <div className="summary-section-title">🎯 Interested Domains</div>
                    <div className="tag-group">
                      {domains.map(dId => {
                        const d = DOMAINS.find(x => x.id === dId);
                        return d ? <span className="tag" key={dId}>{d.icon} {d.name}</span> : null;
                      })}
                      {otherDomains && <span className="tag">{otherDomains}</span>}
                    </div>
                  </div>

                  {aboutMe && (
                    <div className="summary-section">
                      <div className="summary-section-title">💬 About &amp; Goals</div>
                      <div style={{ fontSize: '.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{aboutMe}</div>
                    </div>
                  )}
                </div>

                <div className="form-nav">
                  <button className="btn btn-ghost" onClick={() => setStep(3)}>← Edit</button>
                  <button className="btn btn-primary btn-lg" onClick={handleSave}>
                    🚀 Save &amp; Continue
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </>
  );
}
