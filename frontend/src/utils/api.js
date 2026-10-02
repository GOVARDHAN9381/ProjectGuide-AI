const API_BASE = 'http://127.0.0.1:8000';

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

// Agent 4: Risk Assessment — requires feasibilityReport + scopeReport + techStackReport (chaining)
export async function fetchRiskReport(payload) {
  return postJSON('/api/risk-assessment', payload);
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