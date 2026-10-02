export const Store = {
  set(key, val) { localStorage.setItem(`aip_${key}`, JSON.stringify(val)); },
  get(key)      { try { return JSON.parse(localStorage.getItem(`aip_${key}`)); } catch { return null; } },
  remove(key)   { localStorage.removeItem(`aip_${key}`); },
  clear()       { Object.keys(localStorage).filter(k => k.startsWith('aip_')).forEach(k => localStorage.removeItem(k)); },
  
  // User-scoped project store helpers to prevent data leaking between accounts
  getUserProjects(email) {
    if (!email) return [];
    const cleanEmail = email.trim().toLowerCase();
    return this.get(`projects_${cleanEmail}`) || [];
  },
  setUserProjects(email, projects) {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    this.set(`projects_${cleanEmail}`, projects);
  },
  removeUserProjects(email) {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    this.remove(`projects_${cleanEmail}`);
  }
};

export function requireAuth(role = null) {
  const user = Store.get('currentUser');
  if (!user || !user.loggedIn) {
    return false;
  }
  if (role && user.role !== role) {
    return user.role;
  }
  return user;
}

export function logout() {
  Store.remove('currentUser');
  Store.remove('profile');
  Store.remove('studentId');
  Store.remove('avatarDataUrl');
  // Remove legacy shared project keys so they cannot leak into other logins
  Store.remove('projects');
  Store.remove('project');
  window.location.href = '/login';
}

export function fmtDate(d = new Date()) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtRelative(isoString) {
  if (!isoString) return '—';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return fmtDate(new Date(isoString));
}
