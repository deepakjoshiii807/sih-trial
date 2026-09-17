"""
Firebase ID-token authentication for Django REST Framework.

The React app authenticates with Firebase Authentication (email/password and
Google) and sends the resulting **Firebase ID token** as
`Authorization: Bearer <id token>`. This module verifies that token with the
Firebase Admin SDK and maps it onto the existing Django `User` row, so all the
existing role-scoped endpoints keep working unchanged.

Nothing here issues tokens — Django is no longer an identity provider, it only
*consumes* Firebase sessions.

Server configuration (all optional individually, but at least one credential
source or FIREBASE_PROJECT_ID is required):

  FIREBASE_SERVICE_ACCOUNT_JSON   service-account JSON, inline (recommended)
  FIREBASE_SERVICE_ACCOUNT_FILE   path to a service-account JSON file
  FIREBASE_PROJECT_ID             project id for credential-free verification
  GOOGLE_APPLICATION_CREDENTIALS  standard ADC file path (used when none of the
                                  above are set; also covers GCP metadata auth)

`FIREBASE_PROJECT_ID` is never inferred from the incoming token: if it were,
tokens minted by any other Firebase project would validate against themselves.
"""
from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional, Tuple

from django.db import transaction
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from .models import Role, User
from .profiles import ensure_role_profile

_firebase_app = None
_init_error: Optional[str] = None


def _service_account_credential():
    """A Certificate from the inline JSON or the file path, else None."""
    from firebase_admin import credentials

    inline = (os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON") or "").strip()
    if inline:
        try:
            return credentials.Certificate(json.loads(inline))
        except (ValueError, TypeError) as exc:
            raise RuntimeError(
                "FIREBASE_SERVICE_ACCOUNT_JSON is not valid service-account JSON."
            ) from exc
    path = (os.environ.get("FIREBASE_SERVICE_ACCOUNT_FILE") or "").strip()
    if path:
        return credentials.Certificate(path)
    return None


def _project_id_only_credential():
    """
    A credential that carries no key.

    Verifying an ID token checks the signature against Google's public keys, so
    it never needs a signing credential — only the project id. This lets a
    deployment work with just FIREBASE_PROJECT_ID (the Admin SDK otherwise
    insists on Application Default Credentials at startup).
    """
    from firebase_admin import credentials
    import google.auth.credentials as google_credentials

    class ProjectIdOnlyCredential(credentials.Base):
        def get_credential(self):
            return google_credentials.AnonymousCredentials()

    return ProjectIdOnlyCredential()


def get_firebase_app():
    """
    Initialise the Admin SDK once per process.

    Returns None when Firebase cannot be configured; `firebase_config_error()`
    then explains why (the message never contains secrets).
    """
    global _firebase_app, _init_error

    if _firebase_app is not None or _init_error is not None:
        return _firebase_app

    project_id = (os.environ.get("FIREBASE_PROJECT_ID") or "").strip() or None

    try:
        import firebase_admin
        from firebase_admin import credentials  # noqa: F401  (import check)
    except ImportError:
        _init_error = "firebase-admin is not installed (pip install -r requirements.txt)."
        return None

    try:
        if firebase_admin._apps:  # already initialised elsewhere (e.g. tests)
            _firebase_app = firebase_admin.get_app()
            return _firebase_app

        credential = _service_account_credential()
        if credential is None and project_id:
            # No key configured — verification only needs the project id.
            credential = _project_id_only_credential()
        if credential is None:
            # Fall back to Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS
            # or the GCP metadata server) so GCP-hosted deployments work with no key file.
            _firebase_app = firebase_admin.initialize_app()
        else:
            _firebase_app = firebase_admin.initialize_app(
                credential, {"projectId": project_id} if project_id else None
            )
    except Exception as exc:  # noqa: BLE001 - any failure means "not configured"
        _init_error = (
            f"{exc} — set FIREBASE_SERVICE_ACCOUNT_JSON (recommended) or "
            "FIREBASE_PROJECT_ID in the backend environment."
        )
        _firebase_app = None

    return _firebase_app


def firebase_config_error() -> Optional[str]:
    """Human-readable reason Firebase is unavailable, or None when it is ready."""
    get_firebase_app()
    return _init_error


def verify_id_token(token: str) -> Dict[str, Any]:
    """Verify a Firebase ID token, raising AuthenticationFailed on any problem."""
    app = get_firebase_app()
    if app is None:
        raise AuthenticationFailed(
            "Firebase Authentication is not configured on the server: "
            f"{_init_error or 'missing credentials'}"
        )

    from firebase_admin import auth as firebase_auth

    try:
        return firebase_auth.verify_id_token(token, app=app, check_revoked=False)
    except firebase_auth.ExpiredIdTokenError as exc:
        raise AuthenticationFailed("Your session expired. Please sign in again.") from exc
    except firebase_auth.RevokedIdTokenError as exc:
        raise AuthenticationFailed("Your session was revoked. Please sign in again.") from exc
    except firebase_auth.InvalidIdTokenError as exc:
        raise AuthenticationFailed("Invalid authentication token.") from exc
    except Exception as exc:  # noqa: BLE001 - network/JSON/key failures
        raise AuthenticationFailed("Could not verify your authentication token.") from exc


def sync_user_from_claims(
    claims: Dict[str, Any],
    *,
    role: Optional[str] = None,
    name: str = "",
    phone: str = "",
) -> User:
    """
    Map a verified Firebase token onto a Django user (idempotent).

    Matching order: firebase_uid → email (then link the uid). A new row is
    created with an unusable password when neither matches, because Firebase —
    not Django — holds the credential.
    """
    uid = str(claims.get("uid") or claims.get("user_id") or claims.get("sub") or "")
    if not uid:
        raise AuthenticationFailed("Authentication token has no subject claim.")

    email = (claims.get("email") or "").strip().lower()
    display = (name or claims.get("name") or "").strip()

    with transaction.atomic():
        user = User.objects.filter(firebase_uid=uid).first()

        if user is None and email:
            user = User.objects.filter(email__iexact=email).first()
            if user is not None and not user.firebase_uid:
                user.firebase_uid = uid
                user.save(update_fields=["firebase_uid"])

        if user is None:
            first, _, last = display.partition(" ")
            user = User(
                email=email or f"{uid}@firebase.local",
                firebase_uid=uid,
                first_name=first,
                last_name=last.strip(),
                phone=phone or "",
                role=role or Role.STUDENT,
                is_verified=bool(claims.get("email_verified")),
            )
            user.set_unusable_password()
            user.save()
            ensure_role_profile(user)
            return user

        changed = []
        if role and user.role != role:
            user.role = role
            changed.append("role")
        if phone and user.phone != phone:
            user.phone = phone
            changed.append("phone")
        if display and not (user.first_name or user.last_name):
            first, _, last = display.partition(" ")
            user.first_name, user.last_name = first, last.strip()
            changed += ["first_name", "last_name"]
        if claims.get("email_verified") and not user.is_verified:
            user.is_verified = True
            changed.append("is_verified")
        if changed:
            user.save(update_fields=changed)

    ensure_role_profile(user)
    return user


class FirebaseAuthentication(BaseAuthentication):
    """DRF authentication backed by a Firebase ID token."""

    keyword = b"bearer"

    def authenticate(self, request) -> Optional[Tuple[User, str]]:
        header = get_authorization_header(request).split()
        if not header or header[0].lower() != self.keyword:
            # No bearer token — let Session/legacy JWT authentication try.
            return None
        if len(header) == 1:
            raise AuthenticationFailed("Invalid Authorization header: no token provided.")
        if len(header) > 2:
            raise AuthenticationFailed("Invalid Authorization header: token contains spaces.")

        token = header[1].decode("ascii", "ignore")
        claims = verify_id_token(token)
        user = sync_user_from_claims(claims)
        if not user.is_active:
            raise AuthenticationFailed("This account is inactive.")
        return (user, token)

    def authenticate_header(self, request) -> str:
        """Returned with 401s so clients know the scheme to use."""
        return "Bearer"
