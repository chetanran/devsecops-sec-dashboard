/**
 * MSAL (Microsoft Authentication Library) Configuration
 * Configured for REDIRECT flow (enterprise-friendly)
 *
 * This file configures Azure AD authentication for the DevSecOps Dashboard.
 * Environment variables are loaded from .env file in the frontend directory.
 */

export const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_AZURE_TENANT_ID}`,
    redirectUri: process.env.REACT_APP_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: true, // Preserve route before redirect
  },
  cache: {
    cacheLocation: 'localStorage', // Changed from sessionStorage for persistence
    storeAuthStateInCookie: true,  // Better redirect handling (IE11/Edge/Safari)
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case 0: // Error
            console.error(message);
            break;
          case 1: // Warning
            console.warn(message);
            break;
          case 2: // Info
            console.info(message);
            break;
          case 3: // Verbose
            console.debug(message);
            break;
          default:
            break;
        }
      },
      logLevel: process.env.NODE_ENV === 'development' ? 3 : 1, // Verbose in dev, Warning in prod
    },
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
    asyncPopups: false,
  },
};

/**
 * Scopes for login requests
 */
export const loginRequest = {
  scopes: [
    `api://${process.env.REACT_APP_AZURE_CLIENT_ID}/access_as_user`,
    'User.Read',
  ],
  prompt: 'select_account', // Always show account selector
};

/**
 * API request scopes (for silent token acquisition)
 */
export const apiRequest = {
  scopes: [`api://${process.env.REACT_APP_AZURE_CLIENT_ID}/access_as_user`],
  forceRefresh: false, // Can be overridden per request
};
