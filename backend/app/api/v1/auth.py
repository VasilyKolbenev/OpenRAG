"""
Authentication endpoints — password -> JWT exchange for self-hosted deployments.

The flow is intentionally minimal:
1. Operator sets OPENRAG_ADMIN_PASSWORD in the environment.
2. Caller sends POST /auth/login with that password.
3. Backend returns a short-lived JWT signed with JWT_SECRET.
4. Caller uses the JWT in Authorization: Bearer <token>.

For enterprise deployments this endpoint can be replaced or fronted by an
external IdP (any IdP that issues JWTs signed with JWT_SECRET will work).
"""

import hmac

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.dependencies import AuthService

router = APIRouter(tags=["auth"])


class LoginRequest(BaseModel):
    password: str = Field(..., min_length=1, max_length=512)
    user_id: str = Field(default="admin", min_length=1, max_length=128)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_hours: int


@router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest) -> LoginResponse:
    """Exchange the admin password for a signed JWT."""
    if not settings.admin_password:
        # In dev mode without a password configured, login is disabled.
        # Callers can hit protected endpoints without auth in dev.
        raise HTTPException(
            status_code=503,
            detail=(
                "Auth flow is not configured. "
                "Set OPENRAG_ADMIN_PASSWORD to enable password -> JWT exchange."
            ),
        )

    # Constant-time comparison to avoid timing leaks.
    if not hmac.compare_digest(request.password, settings.admin_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = AuthService.create_token(
        user_id=request.user_id,
        role="admin",
    )
    return LoginResponse(
        access_token=token,
        expires_in_hours=settings.jwt_expire_hours,
    )
