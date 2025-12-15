"""
Azure AD JWT Authentication Module

Handles JWT token verification using Azure AD signing keys (JWKS).
Implements token caching and validation for API authorization.
"""

import os
import time
import logging
import requests
from typing import Dict, Optional
from functools import lru_cache
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# Security scheme for Bearer token
security = HTTPBearer()

# Configuration from environment
AZURE_TENANT_ID = os.getenv("AZURE_TENANT_ID")
AZURE_CLIENT_ID = os.getenv("AZURE_CLIENT_ID")

# Azure AD endpoints
JWKS_URL = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/discovery/v2.0/keys"
# Support both v1.0 and v2.0 token issuers
ISSUER_V1 = f"https://sts.windows.net/{AZURE_TENANT_ID}/"
ISSUER_V2 = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/v2.0"
AUDIENCE = f"api://{AZURE_CLIENT_ID}"

# Cache for signing keys (1 hour TTL)
_signing_keys_cache = {"keys": None, "expires_at": 0}
CACHE_TTL = 3600  # 1 hour in seconds


def get_signing_keys() -> Dict:
    """
    Fetch Azure AD signing keys from JWKS endpoint.
    Results are cached for 1 hour to reduce API calls.

    Returns:
        Dict: JWKS response containing signing keys

    Raises:
        HTTPException: If unable to fetch signing keys
    """
    current_time = time.time()

    # Return cached keys if still valid
    if _signing_keys_cache["keys"] and current_time < _signing_keys_cache["expires_at"]:
        logger.debug("Using cached signing keys")
        return _signing_keys_cache["keys"]

    # Fetch new keys
    try:
        logger.info("Fetching new signing keys from Azure AD")
        response = requests.get(JWKS_URL, timeout=10)
        response.raise_for_status()
        keys = response.json()

        # Update cache
        _signing_keys_cache["keys"] = keys
        _signing_keys_cache["expires_at"] = current_time + CACHE_TTL
        logger.info("Successfully fetched and cached signing keys")

        return keys
    except requests.RequestException as e:
        logger.error(f"Failed to fetch signing keys: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail="Service unavailable - unable to fetch signing keys"
        )


def verify_token(token: str) -> Dict:
    """
    Verify and decode Azure AD JWT token.

    Validates:
    - Token signature using Azure AD signing keys
    - Issuer matches Azure AD tenant
    - Audience matches application ID
    - Token is not expired

    Args:
        token: JWT token string from Authorization header

    Returns:
        Dict: Decoded token payload with user claims

    Raises:
        HTTPException: If token is invalid or verification fails
    """
    if not AZURE_TENANT_ID or not AZURE_CLIENT_ID:
        logger.error("Azure AD configuration missing")
        raise HTTPException(
            status_code=500,
            detail="Server configuration error - Azure AD not configured"
        )

    try:
        # Get signing keys
        jwks = get_signing_keys()

        # Get unverified header to find the key ID
        unverified_header = jwt.get_unverified_header(token)
        key_id = unverified_header.get("kid")

        if not key_id:
            logger.warning("Token missing key ID (kid)")
            raise HTTPException(
                status_code=401,
                detail="Invalid token format"
            )

        # Find the signing key
        signing_key = None
        for key in jwks.get("keys", []):
            if key.get("kid") == key_id:
                signing_key = key
                break

        if not signing_key:
            logger.warning(f"Signing key not found for kid: {key_id}, refreshing cache")
            # Key not found - might be expired, try refreshing cache
            _signing_keys_cache["keys"] = None
            _signing_keys_cache["expires_at"] = 0
            jwks = get_signing_keys()

            for key in jwks.get("keys", []):
                if key.get("kid") == key_id:
                    signing_key = key
                    break

            if not signing_key:
                logger.error(f"Signing key still not found after refresh: {key_id}")
                raise HTTPException(
                    status_code=401,
                    detail="Invalid token signature"
                )

        # First decode without verification to inspect claims
        unverified_payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            options={"verify_signature": False, "verify_exp": False, "verify_aud": False}
        )

        # Determine which issuer format is being used
        token_issuer = unverified_payload.get('iss')
        if token_issuer == ISSUER_V1:
            expected_issuer = ISSUER_V1
        elif token_issuer == ISSUER_V2:
            expected_issuer = ISSUER_V2
        else:
            logger.warning(f"Unknown issuer format: {token_issuer}")
            raise HTTPException(
                status_code=401,
                detail="Invalid token issuer"
            )

        # Log token info in development only
        if os.getenv('ENVIRONMENT') == 'development':
            logger.debug(f"Token issuer: {token_issuer}")
            logger.debug(f"Token audience: {unverified_payload.get('aud')}")
            logger.debug(f"Expected audience: {AUDIENCE}")

        # Verify and decode token with the correct issuer
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            audience=AUDIENCE,
            issuer=expected_issuer,
            options={"verify_signature": True, "verify_exp": True}
        )

        logger.info(f"Token verified successfully for user: {payload.get('preferred_username', 'unknown')}")
        return payload

    except JWTError as e:
        logger.warning(f"JWT validation failed: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
    except Exception as e:
        logger.error(f"Unexpected error during token verification: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail="Authentication failed"
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> Dict:
    """
    FastAPI dependency to extract and verify current user from JWT token.

    Use this dependency on protected routes:
        @app.get("/api/findings", dependencies=[Depends(get_current_user)])

    Or to access user info:
        @app.get("/api/findings")
        def get_findings(user: Dict = Depends(get_current_user)):
            user_id = user.get("oid")  # Azure AD user object ID
            username = user.get("preferred_username")  # User email
            name = user.get("name")  # User display name

    Args:
        credentials: HTTP Bearer token from Authorization header

    Returns:
        Dict: Decoded token payload containing user information

    Raises:
        HTTPException: 401 if token is missing or invalid
    """
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

    token = credentials.credentials
    payload = verify_token(token)

    return payload
