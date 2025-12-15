/**
 * Token Management Utilities
 * Handles token expiration, validation, and refresh timing
 */

const TOKEN_EXPIRY_KEY = 'msal_token_expiry';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Parse JWT token to extract expiration time
 */
export const parseTokenExpiry = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return payload.exp * 1000; // Convert to milliseconds
  } catch (error) {
    console.error('Failed to parse token expiry:', error);
    return null;
  }
};

/**
 * Check if token needs refresh (within 5 minutes of expiry)
 */
export const shouldRefreshToken = () => {
  const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiryTime) return false;

  const timeUntilExpiry = parseInt(expiryTime) - Date.now();
  return timeUntilExpiry < TOKEN_REFRESH_THRESHOLD && timeUntilExpiry > 0;
};

/**
 * Check if token is expired
 */
export const isTokenExpired = () => {
  const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiryTime) return true;

  return Date.now() >= parseInt(expiryTime);
};

/**
 * Store token expiry time
 */
export const storeTokenExpiry = (token) => {
  const expiryTime = parseTokenExpiry(token);
  if (expiryTime) {
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  }
};

/**
 * Clear token expiry
 */
export const clearTokenExpiry = () => {
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
};

/**
 * Get time until token expiry (in milliseconds)
 */
export const getTimeUntilExpiry = () => {
  const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiryTime) return 0;

  return Math.max(0, parseInt(expiryTime) - Date.now());
};

/**
 * Format time until expiry as human-readable string
 */
export const formatTimeUntilExpiry = () => {
  const timeMs = getTimeUntilExpiry();
  const minutes = Math.floor(timeMs / 60000);
  const seconds = Math.floor((timeMs % 60000) / 1000);

  if (minutes > 60) {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};
