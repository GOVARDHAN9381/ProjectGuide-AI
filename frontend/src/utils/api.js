export const API_BASE = (
  import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? window.location.origin
    : 'http://127.0.0.1:8000')
).replace(/\/+$/, '');

async function postJSON(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API error ${res.status}: ${errText}`);
  }
  return res.json();
}

export function submitOnboarding(payload) {
  return postJSON('/onboarding', payload);
}

export function registerUser(payload) {
  return postJSON('/api/auth/register', payload);
}

export function loginUser(payload) {
  return postJSON('/api/auth/login', payload);
}

export function updateUserProfile(payload) {
  return postJSON('/api/auth/update-profile', payload);
}

export async function getUserProfile(email) {
  const res = await fetch(`${API_BASE}/api/auth/user?email=${encodeURIComponent(email)}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return res.json();
}

export function submitIdeaToBackend(payload) {
  return postJSON('/submit-idea', payload);
}

export async function fetchFeasibilityReport(payload) {
  return postJSON('/api/feasibility-check', payload);
}

export async function fetchScopeReport(payload) {
  return postJSON('/api/scope-definition', payload);
}

// Agent 3: Tech Stack — requires feasibilityReport + scopeReport in payload (chaining)
export async function fetchTechStackReport(payload) {
  return postJSON('/api/tech-stack', payload);
}

export async function fetchUserIdeas(email) {
  const url = email ? `${API_BASE}/api/ideas?email=${encodeURIComponent(email)}` : `${API_BASE}/api/ideas`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return res.json();
}

export async function updateIdeaInBackend(ideaId, updates) {
  const res = await fetch(`${API_BASE}/api/ideas/${encodeURIComponent(ideaId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return res.json();
}

export async function deleteIdeaInBackend(ideaId) {
  const res = await fetch(`${API_BASE}/api/ideas/${encodeURIComponent(ideaId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return res.json();
}

export async function postChat(message, history = []) {
  return postJSON('/api/chat', { message, history });
}

// ─── Milestone 3 APIs ─────────────────────────────────────────────────────────

export async function fetchRiskAssessment(payload) {
  return postJSON('/api/risk-assessment', payload);
}

// Legacy check-in (backward compatible)
export async function submitCheckIn(payload) {
  return postJSON('/api/checkin', payload);
}

export async function fetchCheckIns(email, ideaId = null) {
  const url = ideaId
    ? `${API_BASE}/api/checkins/${encodeURIComponent(email)}/${encodeURIComponent(ideaId)}`
    : `${API_BASE}/api/checkins/${encodeURIComponent(email)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateDocument(payload) {
  return postJSON('/api/generate-doc', payload);
}

// Agent 4: Tracking — chains upstream Feasibility, Scope, and Tech Stack reports
export async function fetchTrackingReport(payload) {
  return postJSON('/api/tracking', payload);
}

export async function toggleMilestoneStatus(payload) {
  return postJSON('/api/tracking/toggle-milestone', payload);
}

export async function fetchProjectTracking(ideaId) {
  const res = await fetch(`${API_BASE}/api/tracking/${encodeURIComponent(ideaId)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Mentor Chat (project-aware) ──────────────────────────────────────────────

export async function sendMentorMessage(payload) {
  // payload: { student_email, project_id, message, history }
  return postJSON('/mentor/chat', payload);
}

export async function fetchMentorHistory(studentEmail, projectId) {
  const res = await fetch(
    `${API_BASE}/mentor/history/${encodeURIComponent(studentEmail)}/${encodeURIComponent(projectId)}`
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function clearMentorHistory(studentEmail, projectId) {
  const res = await fetch(
    `${API_BASE}/mentor/history/${encodeURIComponent(studentEmail)}/${encodeURIComponent(projectId)}`,
    { method: 'DELETE' }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Progress Tracking (new MongoDB-backed) ───────────────────────────────────

export async function submitProgressUpdate(payload) {
  // payload: { student_email, project_id, project_title, progress_pct, completed_tasks,
  //            pending_tasks, blockers, mood, comments, idea_data, scope_report }
  return postJSON('/progress/update', payload);
}

export async function fetchProgressUpdates(projectId) {
  const res = await fetch(`${API_BASE}/progress/${encodeURIComponent(projectId)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function triggerPlanAdjust(payload) {
  // payload: { student_email, project_id, project_title, idea_data, scope_report, tracking_report }
  return postJSON('/plan/adjust', payload);
}

export async function fetchPlanHistory(projectId) {
  const res = await fetch(`${API_BASE}/plan/${encodeURIComponent(projectId)}/history`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchCurrentPlan(projectId) {
  const res = await fetch(`${API_BASE}/plan/${encodeURIComponent(projectId)}/current`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Document Generation (new MongoDB-backed endpoints) ───────────────────────

export async function generateSynopsis(payload) {
  // payload: { project_id, student_email, ... }
  return postJSON('/documents/synopsis', payload);
}

export async function generateMethodology(payload) {
  return postJSON('/documents/methodology', payload);
}

export async function generateProgressReport(payload) {
  return postJSON('/documents/progress-report', payload);
}

export async function fetchProjectDocuments(projectId) {
  const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(projectId)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Faculty Dashboard APIs ───────────────────────────────────────────────────

export async function fetchFacultyCohort() {
  const res = await fetch(`${API_BASE}/faculty/cohort`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchFacultyActivity(limit = 20) {
  const res = await fetch(`${API_BASE}/faculty/activity?limit=${limit}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchFacultyAnalytics() {
  const res = await fetch(`${API_BASE}/faculty/analytics`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function submitFacultyReview(payload) {
  // payload: { project_id, faculty_name, faculty_email, feedback, status }
  return postJSON('/faculty/review', payload);
}

export async function submitMilestoneSignoff(payload) {
  // payload: { idea_id, milestone_id, faculty_name, notes }
  return postJSON('/faculty/milestone/signoff', payload);
}

export async function broadcastAnnouncement(payload) {
  // payload: { author_name, author_email, title, message }
  return postJSON('/faculty/broadcast', payload);
}

export async function fetchFacultyAnnouncements(limit = 10) {
  const res = await fetch(`${API_BASE}/faculty/announcements?limit=${limit}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function getFacultyExportUrl() {
  return `${API_BASE}/faculty/export`;
}

export async function fetchMentorSummary(projectId) {
  const res = await fetch(`${API_BASE}/faculty/mentor-summary/${encodeURIComponent(projectId)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}