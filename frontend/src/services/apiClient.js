/**
 * Centralized API Client for Fertilizer Shop Management
 * Handles authentication headers, environment-based base URL, JSON parsing,
 * network errors, and session expiration (401).
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const TOKEN_KEY = 'fts_token';
const USER_KEY = 'fts_user';

export const tokenStorage = {
  getToken: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken: (token) => {
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch (e) {
      console.warn('Unable to persist token to localStorage:', e);
    }
  },
  getUser: () => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => {
    try {
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    } catch (e) {
      console.warn('Unable to persist user to localStorage:', e);
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.warn('Unable to clear auth storage:', e);
    }
  },
};

/**
 * Standard API Request Function
 */
async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    params = null,
    body = null,
    headers = {},
    ...customOptions
  } = options;

  // Build full URL
  let url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  // Build headers with JWT authorization token
  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  const token = tokenStorage.getToken();
  if (token && !requestHeaders.Authorization) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  // Serialize JSON body if provided
  let requestBody = body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: requestBody,
      ...customOptions,
    });

    // Handle 401 Unauthorized session expiry
    if (response.status === 401) {
      // If unauthorized on login endpoint itself, allow the error to bubble up normally
      if (!url.includes('/auth/login')) {
        tokenStorage.clear();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('fts:unauthorized'));
        }
      }
    }

    // Try parsing JSON response
    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = { message: await response.text() };
    }

    if (!response.ok) {
      const errorMsg =
        responseData?.message ||
        responseData?.error ||
        `Request failed with status ${response.status} (${response.statusText})`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.statusText = response.statusText;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error) {
    // If it's already an error with status from response, rethrow
    if (error.status) throw error;

    // Network error (server offline, DNS failure, CORS block)
    const networkError = new Error(
      error.message || `Unable to connect to backend server at ${API_BASE_URL}`
    );
    networkError.isNetworkError = true;
    networkError.status = 0;
    throw networkError;
  }
}

export const apiClient = {
  get: (endpoint, params = null, options = {}) =>
    request(endpoint, { method: 'GET', params, ...options }),

  post: (endpoint, body = null, options = {}) =>
    request(endpoint, { method: 'POST', body, ...options }),

  patch: (endpoint, body = null, options = {}) =>
    request(endpoint, { method: 'PATCH', body, ...options }),

  put: (endpoint, body = null, options = {}) =>
    request(endpoint, { method: 'PUT', body, ...options }),

  delete: (endpoint, options = {}) =>
    request(endpoint, { method: 'DELETE', ...options }),

  getBaseUrl: () => API_BASE_URL,
};

export default apiClient;

