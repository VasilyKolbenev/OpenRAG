"""
Tests for JWT auth — create, verify, expired, invalid.
"""

from datetime import datetime, timedelta
from unittest.mock import patch

import jwt
import pytest
from fastapi import HTTPException

from app.dependencies import AuthService, get_current_user


JWT_SECRET = "test-secret-key-for-jwt"
JWT_ALGORITHM = "HS256"


def _patch_settings():
    """Patch settings for JWT tests."""
    return patch(
        "app.dependencies.settings",
        **{
            "jwt_secret": JWT_SECRET,
            "jwt_algorithm": JWT_ALGORITHM,
            "jwt_expire_hours": 24,
        },
    )


class TestAuthServiceCreate:
    """JWT token creation."""

    def test_create_token_returns_string(self):
        with _patch_settings():
            token = AuthService.create_token("user-1")
            assert isinstance(token, str)
            assert len(token) > 0

    def test_create_token_contains_user_id(self):
        with _patch_settings():
            token = AuthService.create_token("user-42", role="admin")
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            assert payload["sub"] == "user-42"
            assert payload["role"] == "admin"
            assert "exp" in payload
            assert "jti" in payload


class TestAuthServiceVerify:
    """JWT token verification."""

    def test_verify_valid_token(self):
        with _patch_settings():
            token = AuthService.create_token("user-1")
            payload = AuthService.verify_token(token)
            assert payload["sub"] == "user-1"

    def test_verify_expired_token_raises(self):
        expired_payload = {
            "sub": "user-1",
            "role": "user",
            "iat": datetime.utcnow() - timedelta(hours=48),
            "exp": datetime.utcnow() - timedelta(hours=24),
            "jti": "test",
        }
        token = jwt.encode(expired_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        with _patch_settings():
            with pytest.raises(HTTPException) as exc_info:
                AuthService.verify_token(token)
            assert exc_info.value.status_code == 401
            assert "expired" in exc_info.value.detail.lower()

    def test_verify_invalid_token_raises(self):
        with _patch_settings():
            with pytest.raises(HTTPException) as exc_info:
                AuthService.verify_token("totally.invalid.token")
            assert exc_info.value.status_code == 401


class TestGetCurrentUser:
    """get_current_user dependency."""

    async def test_returns_none_without_header(self):
        result = await get_current_user(authorization=None)
        assert result is None

    async def test_returns_none_with_invalid_scheme(self):
        result = await get_current_user(authorization="Basic abc123")
        assert result is None

    async def test_returns_payload_with_valid_token(self):
        with _patch_settings():
            token = AuthService.create_token("user-1")
            result = await get_current_user(authorization=f"Bearer {token}")
            assert result["sub"] == "user-1"


class TestLoginEndpoint:
    """POST /auth/login -> exchange admin password for JWT."""

    @pytest.mark.asyncio
    async def test_login_returns_token_with_correct_password(self, client):
        with patch(
            "app.api.v1.auth.settings",
            **{
                "admin_password": "demo-strong-password",
                "jwt_expire_hours": 24,
            },
        ), patch(
            "app.dependencies.settings",
            **{
                "jwt_secret": JWT_SECRET,
                "jwt_algorithm": JWT_ALGORITHM,
                "jwt_expire_hours": 24,
            },
        ):
            response = await client.post(
                "/auth/login",
                json={"password": "demo-strong-password"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["token_type"] == "bearer"
            assert data["expires_in_hours"] == 24
            assert isinstance(data["access_token"], str) and data["access_token"]

    @pytest.mark.asyncio
    async def test_login_rejects_wrong_password(self, client):
        with patch(
            "app.api.v1.auth.settings",
            **{"admin_password": "demo-strong-password"},
        ):
            response = await client.post(
                "/auth/login",
                json={"password": "wrong-password"},
            )
            assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_disabled_when_admin_password_unset(self, client):
        with patch("app.api.v1.auth.settings", **{"admin_password": ""}):
            response = await client.post(
                "/auth/login",
                json={"password": "anything"},
            )
            assert response.status_code == 503
