/**
 * Quikooo Admin Console - Authentication Manager
 * Handles JWT storage, authorization headers, and session lifecycle.
 */

export const AUTH_STORAGE_KEY = 'quikooo_admin_auth';

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return null;
}

/**
 * Retrieve current authentication state from localStorage
 */
export function getStoredAuth() {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Returns JWT token string or null
 */
export function getToken() {
  const auth = getStoredAuth();
  return auth?.token || null;
}

/**
 * Returns currently logged-in user profile or null
 */
export function getUser() {
  const auth = getStoredAuth();
  return auth?.user || null;
}

/**
 * Boolean check for active login session
 */
export function isAuthenticated() {
  return Boolean(getToken());
}

/**
 * Stores token and user profile into localStorage and notifies listeners
 */
export function setStoredAuth(data) {
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('[Auth] Failed to set localStorage:', err);
    }
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('quikooo:auth-changed', { detail: data }));
  }
}

/**
 * Clears authentication token and profile from localStorage
 */
export function logout() {
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(AUTH_STORAGE_KEY);
    } catch {}
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('quikooo:auth-changed', { detail: null }));
  }
}

/**
 * Generates headers dictionary with Authorization: Bearer <token> attached
 */
export function authHeaders(customHeaders = {}) {
  const token = getToken();
  const headers = customHeaders instanceof Headers
    ? Object.fromEntries(customHeaders.entries())
    : { ...customHeaders };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Sends POST /api/v1/auth/login and stores { token, user } in localStorage
 * Supports both login(emailOrMobile, password) and login({ email, mobile, password })
 */
export async function login(identifierOrParams, passwordArg) {
  let identifier;
  let password;

  if (typeof identifierOrParams === 'object' && identifierOrParams !== null) {
    identifier = identifierOrParams.email || identifierOrParams.mobile || identifierOrParams.phone || identifierOrParams.identifier;
    password = identifierOrParams.password;
  } else {
    identifier = identifierOrParams;
    password = passwordArg;
  }

  if (!identifier || !password) {
    throw new Error('Email or mobile number and password are required');
  }

  const payload = {
    email: identifier,
    mobile: identifier,
    phone: identifier,
    identifier,
    password,
  };

  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.message || `Login failed (HTTP ${res.status})`);
  }

  const json = await res.json();
  const data = json.data || json;

  const authData = {
    token: data.token,
    user: data.user,
  };

  if (!authData.token) {
    throw new Error('Authentication response did not contain a valid token');
  }

  setStoredAuth(authData);
  return authData;
}
