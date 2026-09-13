import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    LoginRequest,
    Token,
    UserCreate,
    UserUpdate,
    UserRegister,
    UserResponse,
)
from app.services import auth_service

logger = logging.getLogger("nexus_ner.auth")

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])

security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Validate Bearer token and retrieve the active authenticated user."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = auth_service.decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token identity",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = auth_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user account not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


def require_roles(*allowed_roles: str):
    """Factory creating an RBAC dependency that permits only specified roles."""
    normalized_allowed = {r.upper().strip() for r in allowed_roles}

    def role_dependency(current_user: User = Depends(get_current_user)) -> User:
        user_role = (current_user.role or "").upper().strip()
        if user_role not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role '{current_user.role}'. Required: {sorted(list(normalized_allowed))}",
            )
        return current_user

    return role_dependency


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate via username/email + password and receive a signed JWT."""
    user = auth_service.authenticate_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    token = auth_service.create_access_token({
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
    })

    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    """
    Public registration endpoint for standard users.
    Assigns safe default role 'PUBLIC'.
    Defends against privilege escalation: requests attempting to self-assign
    operational roles (ADMIN, CONTROL_OPERATOR, FIELD_OFFICER, DRIVER) are rejected.
    """
    if payload.role is not None:
        requested_role = payload.role.strip().upper()
        if requested_role in {"ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER", "DRIVER"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Self-assignment of operational role '{payload.role}' is forbidden",
            )
        if requested_role != "PUBLIC":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role '{payload.role}'. Allowed for public registration: ['PUBLIC']",
            )

    clean_username = payload.username.strip()
    clean_email = payload.email.strip().lower()

    existing_user = auth_service.get_user_by_username_or_email(db, clean_username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{clean_username}' already registered",
        )

    existing_email = auth_service.get_user_by_username_or_email(db, clean_email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{clean_email}' already registered",
        )

    new_user = User(
        username=clean_username,
        email=clean_email,
        password_hash=auth_service.hash_password(payload.password),
        role="PUBLIC",
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    logger.info("Registered new public user '%s' (ID #%d)", new_user.username, new_user.id)
    return UserResponse.model_validate(new_user)


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieve the profile metadata of the currently authenticated user."""
    return UserResponse.model_validate(current_user)


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_new_user(
    user_in: UserCreate,
    current_user: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db)
):
    """Admin-only endpoint to register a new user with a specific role."""
    existing = auth_service.get_user_by_username_or_email(db, user_in.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{user_in.username}' already registered",
        )

    existing_email = auth_service.get_user_by_username_or_email(db, user_in.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{user_in.email}' already registered",
        )

    try:
        new_user = auth_service.create_user(db, user_in)
        return UserResponse.model_validate(new_user)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_existing_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db)
):
    """Admin-only endpoint to modify role, status, or password of an existing user."""
    target_user = auth_service.get_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User ID #{user_id} not found",
        )

    try:
        updated = auth_service.update_user(db, target_user, user_update)
        return UserResponse.model_validate(updated)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))


@router.get("/users", response_model=List[UserResponse])
def list_all_users(
    offset: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db)
):
    """Admin-only endpoint to list all user accounts."""
    users = auth_service.list_users(db, offset=offset, limit=limit)
    return [UserResponse.model_validate(u) for u in users]


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user_by_id_endpoint(
    user_id: int,
    current_user: User = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db)
):
    """Admin-only endpoint to inspect a specific user account."""
    target_user = auth_service.get_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User ID #{user_id} not found",
        )
    return UserResponse.model_validate(target_user)
