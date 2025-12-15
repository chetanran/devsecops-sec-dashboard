import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PublicClientApplication, InteractionStatus } from '@azure/msal-browser';
import { MsalProvider, useMsal, useIsAuthenticated } from '@azure/msal-react';
import { msalConfig, loginRequest, apiRequest } from './authConfig';
import {
  storeTokenExpiry,
  clearTokenExpiry,
  shouldRefreshToken,
  isTokenExpired,
} from './utils/tokenUtils';
import { setAuthFunctions } from './utils/axiosInstance';

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL instance (handle redirect promise)
msalInstance.initialize().then(() => {
  msalInstance.handleRedirectPromise()
    .then((response) => {
      if (response) {
        console.log('[AUTH] Redirect authentication successful');
        // Store token expiry
        if (response.accessToken) {
          storeTokenExpiry(response.accessToken);
        }
      }
    })
    .catch((error) => {
      console.error('[AUTH] Redirect authentication failed:', error);
    });
});

// Auth context
const AuthContext = createContext(null);

// Auth provider component
function AuthProviderInner({ children }) {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [user, setUser] = useState(null);
  const [tokenRefreshInterval, setTokenRefreshInterval] = useState(null);

  // Update user state when accounts change
  useEffect(() => {
    if (accounts.length > 0) {
      setUser({
        name: accounts[0].name,
        username: accounts[0].username,
        email: accounts[0].username,
        id: accounts[0].localAccountId,
      });
    } else {
      setUser(null);
    }
  }, [accounts]);

  /**
   * Login with redirect (enterprise-friendly)
   */
  const login = useCallback(async () => {
    try {
      console.log('[AUTH] Initiating login redirect...');
      await instance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('[AUTH] Login failed:', error);
      throw error;
    }
  }, [instance]);

  /**
   * Logout with redirect
   */
  const logout = useCallback(async () => {
    try {
      console.log('[AUTH] Logging out...');
      clearTokenExpiry();

      // Clear refresh interval
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        setTokenRefreshInterval(null);
      }

      // Logout with redirect
      const logoutRequest = {
        account: accounts[0],
        postLogoutRedirectUri: msalConfig.auth.postLogoutRedirectUri,
      };

      await instance.logoutRedirect(logoutRequest);
    } catch (error) {
      console.error('[AUTH] Logout failed:', error);
      throw error;
    }
  }, [instance, accounts, tokenRefreshInterval]);

  /**
   * Get access token with automatic refresh
   * @param {boolean} forceRefresh - Force token refresh
   */
  const getAccessToken = useCallback(async (forceRefresh = false) => {
    console.log('[AUTH] Getting access token...', { forceRefresh });

    if (accounts.length === 0) {
      console.error('[AUTH] No authenticated user');
      throw new Error('No authenticated user');
    }

    // Check if token is expired
    if (!forceRefresh && isTokenExpired()) {
      console.warn('[AUTH] Token expired, forcing refresh');
      forceRefresh = true;
    }

    const request = {
      ...apiRequest,
      account: accounts[0],
      forceRefresh: forceRefresh || shouldRefreshToken(),
    };

    try {
      // Try silent token acquisition
      console.log('[AUTH] Attempting silent token acquisition...');
      const response = await instance.acquireTokenSilent(request);
      console.log('[AUTH] Silent token acquisition successful');

      // Store token expiry
      storeTokenExpiry(response.accessToken);

      return response.accessToken;
    } catch (error) {
      console.log('[AUTH] Silent token acquisition failed:', error.name, error.message);

      // If silent acquisition fails, try redirect
      if (error.name === 'InteractionRequiredAuthError' ||
          error.name === 'interaction_required') {
        console.log('[AUTH] Interaction required, redirecting to login...');
        await instance.acquireTokenRedirect(request);
        // This will redirect, so code after this won't execute
        throw new Error('Redirecting to login...');
      }

      console.error('[AUTH] Token acquisition failed:', error);
      throw error;
    }
  }, [instance, accounts]);

  /**
   * Handle authentication errors (e.g., expired session)
   */
  const handleAuthError = useCallback(() => {
    console.error('[AUTH] Authentication error, redirecting to login...');
    clearTokenExpiry();
    login();
  }, [login]);

  /**
   * Set up automatic token refresh
   */
  useEffect(() => {
    if (!isAuthenticated || !accounts.length) {
      return;
    }

    // Check token refresh every minute
    const interval = setInterval(async () => {
      if (shouldRefreshToken()) {
        console.log('[AUTH] Proactively refreshing token...');
        try {
          await getAccessToken(true);
          console.log('[AUTH] Token refreshed successfully');
        } catch (error) {
          console.error('[AUTH] Failed to refresh token:', error);
        }
      }
    }, 60 * 1000); // Check every minute

    setTokenRefreshInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isAuthenticated, accounts, getAccessToken]);

  /**
   * Set auth functions for axios interceptors
   */
  useEffect(() => {
    setAuthFunctions(getAccessToken, handleAuthError);
  }, [getAccessToken, handleAuthError]);

  /**
   * Handle cross-tab logout
   */
  useEffect(() => {
    const handleStorageChange = (e) => {
      // If another tab logs out, logout this tab too
      if (e.key === 'msal.interaction.status' && e.newValue === null) {
        console.log('[AUTH] Cross-tab logout detected');
        clearTokenExpiry();
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    getAccessToken,
    handleAuthError,
    inProgress: inProgress !== InteractionStatus.None,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Main provider that wraps with MsalProvider
export function AuthProvider({ children }) {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </MsalProvider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
