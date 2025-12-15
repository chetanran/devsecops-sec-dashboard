# Azure AD Authentication Setup Guide

## Overview
This dashboard now requires Azure AD authentication for all API endpoints (except the root health check).

## Implementation Details

### Backend (FastAPI)
- **JWT Verification**: `backend/auth.py` validates tokens using Azure AD signing keys
- **JWKS Caching**: Signing keys cached for 1 hour to reduce API calls
- **Protected Routes**: All API endpoints use `Depends(get_current_user)`
- **Environment Variables**: Azure Tenant ID and Client ID in `.env`

### Frontend (React)
- **MSAL Integration**: `@azure/msal-browser` and `@azure/msal-react` packages
- **Auth Context**: `AuthProvider.js` wraps app with authentication state
- **Login UI**: Sign-in screen shown when not authenticated
- **Token Management**: Automatic token refresh with silent acquisition
- **Session Storage**: Tokens stored in sessionStorage (not localStorage)

## Azure Portal Setup

### 1. Create App Registration
1. Go to Azure Portal > Azure Active Directory > App Registrations
2. Click "New registration"
3. Name: "DevSecOps Dashboard"
4. Redirect URI: `http://localhost:3000` (for local dev)
5. Click "Register"

### 2. Configure API Permissions
1. Go to "API permissions"
2. Add permission > Microsoft Graph > Delegated > User.Read
3. Grant admin consent if required

### 3. Expose an API
1. Go to "Expose an API"
2. Add scope: `access_as_user`
3. Set consent: Admins and users
4. Add description

### 4. Get Credentials
- Copy **Application (client) ID**
- Copy **Directory (tenant) ID**

## Configuration

### Backend `.env`
```
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here
```

### Frontend `.env`
```
REACT_APP_AZURE_TENANT_ID=your-tenant-id-here
REACT_APP_AZURE_CLIENT_ID=your-client-id-here
REACT_APP_REDIRECT_URI=http://localhost:3000
```

## Running the Application

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Azure AD credentials
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your Azure AD credentials
npm start
```

## Authentication Flow

1. User navigates to http://localhost:3000
2. Sees "Sign in with Microsoft" button
3. Clicks button, MSAL opens Azure AD popup
4. User authenticates with Azure AD credentials
5. Token acquired and stored in sessionStorage
6. All API calls automatically include `Authorization: Bearer <token>` header
7. Backend verifies token on each request
8. User can click "Sign Out" to clear session

## Security Features

- **Token Verification**: Backend validates signature, issuer, audience, expiration
- **Session Storage**: Tokens cleared when browser tab closes
- **Automatic Refresh**: Silent token renewal when expired
- **401 Handling**: Frontend detects expired sessions and prompts re-login
- **Generic Errors**: No sensitive information in error messages

## Access Control

Currently, all authenticated Azure AD users have full access to:
- View all findings
- Upload scan results
- Update finding status and notes
- Clear all findings

Future: Role-based access control (RBAC) using Azure AD groups/roles

## Troubleshooting

### "Token verification failed"
- Check Tenant ID and Client ID match in both backend and frontend
- Verify Azure AD app registration is configured correctly
- Check JWKS endpoint is accessible

### "Session expired" popup
- Token has expired, user needs to sign in again
- Check token lifetimes in Azure AD app configuration

### CORS errors
- Backend CORS allows `http://localhost:3000` by default
- For production, update allowed origins in `main.py`

### Redirect URI mismatch
- Ensure redirect URI in frontend `.env` matches Azure AD app registration
- Check for http vs https mismatch
