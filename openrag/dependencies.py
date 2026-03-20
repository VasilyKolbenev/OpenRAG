"""
FastAPI dependencies — auth, services, database sessions.
"""

import hashlib
from datetime import datetime, timedelta
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Header

from openrag.config import settings


class AuthService:
    """JWT authentication service."""

    @staticmethod
    def create_token(
        user_id: str,
        role: str = "user",
        tenant_id: Optional[str] = None,
    ) -> str:
        """Create a JWT access token."""
        import uuid

        payload = {
            "sub": user_id,
            "role": role,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(hours=settings.jwt_expire_hours),
            "jti": str(uuid.uuid4()),
        }
        if tenant_id:
            payload["tenant_id"] = tenant_id
        return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    @staticmethod
    def verify_token(token: str) -> dict:
        """Verify and decode a JWT token."""
        try:
            return jwt.decode(
                token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
            )
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")


async def get_api_key_or_jwt(
    x_api_key: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None),
) -> Optional[dict]:
    """Check X-API-Key first, then fall back to JWT. Returns None in dev mode."""
    if x_api_key:
        hashed = hashlib.sha256(x_api_key.encode()).hexdigest()
        if settings.api_key_master and hashed == hashlib.sha256(settings.api_key_master.encode()).hexdigest():
            return {"sub": "api_key", "type": "api_key"}
        raise HTTPException(status_code=401, detail="Invalid API key")
    if authorization:
        return await get_current_user(authorization)
    if not settings.is_production:
        return None
    raise HTTPException(status_code=401, detail="Authentication required")


async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> Optional[dict]:
    """Extract current user from Authorization header. Optional auth."""
    if not authorization:
        return None

    if not authorization.startswith("Bearer "):
        return None

    token = authorization[7:]
    return AuthService.verify_token(token)


async def require_auth(
    user: Optional[dict] = Depends(get_current_user),
) -> dict:
    """Require authenticated user."""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


async def require_auth_in_production(
    user: Optional[dict] = Depends(get_current_user),
) -> Optional[dict]:
    """Require auth in production, optional in development.

    Self-hosted deployments often run without auth. This dependency
    enforces auth only when ENVIRONMENT=production.
    """
    if settings.is_production and user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user
