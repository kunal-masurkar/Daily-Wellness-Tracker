const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

/**
 * Universal fetch wrapper enforcing session cookies and consistent JSON handling
 */
async function request(endpoint, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    },
    // CRITICAL: Send session cookie on every request
    credentials: 'include'
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    let data = null;
    
    try {
      data = await response.json();
    } catch (e) {
      // Handle empty response bodies
    }

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: data?.error || `Request failed with status ${response.status}`
      };
    }

    return {
      success: true,
      status: response.status,
      data
    };
  } catch (networkError) {
    console.error('API request error:', networkError);
    return {
      success: false,
      status: 0,
      error: 'Unable to connect to server. Please check your connection.'
    };
  }
}

export const api = {
  // Auth endpoints
  me: () => request('/auth/me', { method: 'GET' }),
  signup: (email, password) => request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Checkin endpoints
  getTodayCheckin: (dateStr) => request(`/checkin/today?date=${dateStr}`, { method: 'GET' }),
  getLast7DaysTrend: (dateStr) => request(`/checkin/last7days?date=${dateStr}`, { method: 'GET' }),
  saveCheckin: (payload) => request('/checkin', { method: 'POST', body: JSON.stringify(payload) })
};
