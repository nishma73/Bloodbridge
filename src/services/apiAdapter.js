// ---------------------------------------------------------------------------
// REST API adapter for BloodBridge Express/MongoDB backend.
// Implements the unified service interface with JWT bearer tokens.
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const TOKEN_KEY = 'blood-bridge-jwt-token-v1';
const USER_KEY = 'blood-bridge-user-session-v1';

const authListeners = new Set();

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore storage errors */
  }
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore storage errors */
  }
}

function notifyAuthListeners(user) {
  authListeners.forEach((cb) => {
    try {
      cb(user);
    } catch (e) {
      console.error('[API Adapter] Error in auth listener callback:', e);
    }
  });
}

/**
 * Universal fetch wrapper adding Authorization headers and parsing JSON.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  let res;
  try {
    res = await fetch(url, config);
  } catch (err) {
    throw new Error(`Network connection error: Unable to reach BloodBridge server at ${url}. ${err.message}`);
  }

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const errorMsg =
      (data && data.message) ||
      (typeof data === 'string' && data) ||
      `Request failed with HTTP status ${res.status}`;

    // If unauthorized or expired token, clear local state
    if (res.status === 401 && getToken()) {
      setToken(null);
      setStoredUser(null);
      notifyAuthListeners(null);
    }

    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const apiAdapter = {
  kind: 'api',

  // ----- Authentication ----------------------------------------------------
  auth: {
    async register(payload) {
      const res = await request('/auth/register', {
        method: 'POST',
        body: payload,
      });

      const user = res.user || res;
      if (res.token) setToken(res.token);
      setStoredUser(user);
      notifyAuthListeners(user);
      return user;
    },

    async login(email, password) {
      const res = await request('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      const user = res.user || res;
      if (res.token) setToken(res.token);
      setStoredUser(user);
      notifyAuthListeners(user);
      return user;
    },

    async logout() {
      try {
        await request('/auth/logout', { method: 'POST' });
      } catch {
        /* proceed with client-side cleanup regardless */
      }
      setToken(null);
      setStoredUser(null);
      notifyAuthListeners(null);
      return true;
    },

    async getCurrentUser() {
      const token = getToken();
      if (!token) return null;

      try {
        const res = await request('/auth/me');
        const user = res.user || res;
        setStoredUser(user);
        return user;
      } catch (err) {
        // If token expired or invalid
        setToken(null);
        setStoredUser(null);
        return null;
      }
    },

    onAuthChange(cb) {
      authListeners.add(cb);
      // Immediately invoke with stored user to prevent jarring blank states
      const stored = getStoredUser();
      cb(stored);

      // Verify token in background if stored
      if (getToken()) {
        request('/auth/me')
          .then((res) => {
            const user = res.user || res;
            setStoredUser(user);
            cb(user);
          })
          .catch(() => {
            setToken(null);
            setStoredUser(null);
            cb(null);
          });
      }

      return () => authListeners.delete(cb);
    },
  },

  // ----- Profiles ----------------------------------------------------------
  profiles: {
    async get(uidValue) {
      const currentUser = getStoredUser();
      const isHospital = currentUser?.role === 'hospital';
      const endpoint = isHospital ? `/hospitals/profile/${uidValue}` : `/donors/profile/${uidValue}`;

      try {
        const res = await request(endpoint);
        return res.data || res;
      } catch {
        // Fallback check the other endpoint if role is uncertain
        const fallbackEndpoint = isHospital ? `/donors/profile/${uidValue}` : `/hospitals/profile/${uidValue}`;
        const res2 = await request(fallbackEndpoint);
        return res2.data || res2;
      }
    },

    async update(uidValue, patch) {
      const currentUser = getStoredUser();
      const isHospital = currentUser?.role === 'hospital' || patch.hospitalName;
      const endpoint = isHospital ? `/hospitals/profile/${uidValue}` : `/donors/profile/${uidValue}`;

      const res = await request(endpoint, {
        method: 'PUT',
        body: patch,
      });

      const updated = res.data || res;
      // Merge with stored user if updating own profile
      if (currentUser && currentUser.uid === uidValue) {
        const merged = { ...currentUser, ...updated };
        setStoredUser(merged);
        notifyAuthListeners(merged);
      }
      return updated;
    },

    async setAvailability(uidValue, available) {
      const res = await request('/donors/availability', {
        method: 'PATCH',
        body: { available },
      });
      const updated = res.data || res;

      const currentUser = getStoredUser();
      if (currentUser) {
        const merged = { ...currentUser, available };
        setStoredUser(merged);
        notifyAuthListeners(merged);
      }
      return updated;
    },

    async listDonors(filters = {}) {
      const params = new URLSearchParams();
      if (filters.bloodGroup) params.append('bloodGroup', filters.bloodGroup);
      if (filters.availableOnly) params.append('availableOnly', 'true');
      if (filters.verifiedOnly) params.append('verifiedOnly', 'true');
      if (filters.search) params.append('search', filters.search);
      if (filters.city) params.append('city', filters.city);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await request(`/donors${qs}`);
      return res.data || res;
    },
  },

  // ----- Blood Requests ----------------------------------------------------
  requests: {
    async create(data) {
      const res = await request('/requests', {
        method: 'POST',
        body: data,
      });
      return res.data || res;
    },

    async listForHospital(hospitalId) {
      const res = await request(`/requests/hospital/${hospitalId || ''}`);
      return res.data || res;
    },

    async listOpen() {
      const res = await request('/requests/open');
      return res.data || res;
    },

    async get(id) {
      const res = await request(`/requests/${id}`);
      return res.data || res;
    },

    async update(id, patch) {
      const res = await request(`/requests/${id}`, {
        method: 'PUT',
        body: patch,
      });
      return res.data || res;
    },

    async remove(id) {
      const res = await request(`/requests/${id}`, {
        method: 'DELETE',
      });
      return res.success !== false;
    },

    async getMatchingDonors(id, filters = {}) {
      const params = new URLSearchParams();
      if (filters.radiusKm) params.append('radiusKm', filters.radiusKm);
      if (filters.availableOnly) params.append('availableOnly', 'true');
      if (filters.verifiedOnly) params.append('verifiedOnly', 'true');
      if (filters.search) params.append('search', filters.search);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await request(`/requests/${id}/matching-donors${qs}`);
      return res;
    },
  },

  // ----- Donor Responses ---------------------------------------------------
  responses: {
    async sendToDonors(requestId, donorIds, message = '') {
      const res = await request('/responses/send', {
        method: 'POST',
        body: { requestId, donorIds, message },
      });
      return res.data || res;
    },

    async listForRequest(requestId) {
      const res = await request(`/responses/request/${requestId}`);
      return res.data || res;
    },

    async listForDonor(donorId) {
      const res = await request(`/responses/donor/${donorId || ''}`);
      return res.data || res;
    },

    async respond(responseId, status, message = '') {
      const res = await request(`/responses/${responseId}/respond`, {
        method: 'POST',
        body: { status, message },
      });
      return res.data || res;
    },

    async markCompleted(responseId) {
      const res = await request(`/responses/${responseId}/complete`, {
        method: 'POST',
      });
      return res.data || res;
    },
  },

  // ----- Notifications -----------------------------------------------------
  notifications: {
    async listForUser(userId) {
      const res = await request('/notifications');
      return res.data || res;
    },

    async markRead(id) {
      const res = await request(`/notifications/${id}/read`, {
        method: 'PATCH',
      });
      return res.success !== false;
    },

    async markAllRead(userId) {
      const res = await request('/notifications/read-all', {
        method: 'PATCH',
      });
      return res.success !== false;
    },
  },

  // ----- Administrator Management -----------------------------------------
  admin: {
    async getStats() {
      const res = await request('/admin/stats');
      return res.stats || res;
    },

    async listDonors() {
      const res = await request('/admin/donors');
      return res.donors || res.data || res;
    },

    async listHospitals() {
      const res = await request('/admin/hospitals');
      return res.hospitals || res.data || res;
    },

    async verifyHospital(id, verified, notes = '') {
      const res = await request(`/admin/hospitals/${id}/verify`, {
        method: 'PUT',
        body: { verified, notes },
      });
      return res.hospital || res;
    },

    async listRequests() {
      const res = await request('/admin/requests');
      return res.requests || res.data || res;
    },

    async updateUserStatus(id, { isActive, isReported }) {
      const res = await request(`/admin/users/${id}/status`, {
        method: 'PATCH',
        body: { isActive, isReported },
      });
      return res.user || res;
    },
  },

  /** Reset demo / session data */
  async reset() {
    setToken(null);
    setStoredUser(null);
    notifyAuthListeners(null);
    return true;
  },
};
