const PROFILE_KEY = 'wnam-guest-profile-v1';

function validProfile(value) {
  return value && typeof value.id === 'string' && typeof value.name === 'string'
    && value.name.length > 0 && value.name.length <= 48 && /^\d{4}$/.test(value.tag);
}

export function readCachedProfile() {
  try {
    const profile = JSON.parse(localStorage.getItem(PROFILE_KEY));
    return validProfile(profile) ? profile : null;
  } catch { return null; }
}

export function cacheProfile(profile) {
  try {
    if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(PROFILE_KEY);
  } catch { /* The server cookie still remembers the guest in this browser. */ }
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(path, {
      credentials: 'same-origin', cache: 'no-store', ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      const error = new Error(data?.error || 'The leaderboard is unavailable. Please try again.');
      error.status = response.status;
      throw error;
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError' || error instanceof TypeError) {
      throw new Error('Couldn’t connect to the leaderboard. Please try again.');
    }
    throw error;
  } finally { clearTimeout(timeout); }
}

export async function getGuestProfile() {
  const { profile } = await request('/api/profile');
  if (profile !== null && !validProfile(profile)) throw new Error('Couldn’t load your nickname. Please try again.');
  return profile;
}

export async function createGuestProfile(name) {
  const { profile } = await request('/api/profile', { method: 'POST', body: JSON.stringify({ name }) });
  if (!validProfile(profile)) throw new Error('Couldn’t create your nickname. Please try again.');
  return profile;
}

export const fetchLeaderboard = () => request('/api/leaderboard');
export const sendProgress = (score) => request('/api/progress', { method: 'PUT', body: JSON.stringify(score) });
