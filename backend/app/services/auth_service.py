import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, List

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.config import (
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    BOOTSTRAP_ADMIN_PASSWORD,
    BOOTSTRAP_OPERATOR_PASSWORD,
    BOOTSTRAP_FIELD_PASSWORD,
    BOOTSTRAP_DRIVER_PASSWORD,
)
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

logger = logging.getLogger("nexus_ner.auth")

ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16
)


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against an Argon2id hash."""
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, InvalidHashError):
        return False
    except Exception as err:
        logger.error("Unexpected error during password verification: %s", err)
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a signed JWT access token with user ID and role claims."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": int(expire.timestamp())})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT access token signature and expiration."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.debug("JWT token has expired")
        return None
    except jwt.InvalidTokenError as err:
        logger.debug("Invalid JWT token: %s", err)
        return None


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_username_or_email(db: Session, identifier: str) -> Optional[User]:
    clean_id = identifier.strip().lower()
    return db.query(User).filter(
        or_(
            User.username.ilike(clean_id),
            User.email.ilike(clean_id)
        )
    ).first()


def authenticate_user(db: Session, username_or_email: str, password: str) -> Optional[User]:
    """Verify credentials and return user if valid; otherwise None."""
    user = get_user_by_username_or_email(db, username_or_email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def create_user(db: Session, user_in: UserCreate) -> User:
    """Create a new persistent user with Argon2id hashed password."""
    normalized_role = user_in.role.upper().strip()
    valid_roles = {"ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER", "DRIVER"}
    if normalized_role not in valid_roles:
        raise ValueError(f"Invalid role '{normalized_role}'. Allowed: {sorted(list(valid_roles))}")

    db_user = User(
        username=user_in.username.strip(),
        email=user_in.email.strip().lower(),
        password_hash=hash_password(user_in.password),
        role=normalized_role,
        is_active=user_in.is_active
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    logger.info("Created user '%s' with role '%s' (ID #%d)", db_user.username, db_user.role, db_user.id)
    return db_user


def update_user(db: Session, db_user: User, user_update: UserUpdate) -> User:
    """Update user attributes and/or password."""
    if user_update.email is not None:
        db_user.email = user_update.email.strip().lower()
    if user_update.role is not None:
        norm_role = user_update.role.upper().strip()
        if norm_role not in {"ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER", "DRIVER"}:
            raise ValueError(f"Invalid role '{norm_role}'")
        db_user.role = norm_role
    if user_update.is_active is not None:
        db_user.is_active = user_update.is_active
    if user_update.password:
        db_user.password_hash = hash_password(user_update.password)

    db.commit()
    db.refresh(db_user)
    logger.info("Updated user ID #%d ('%s')", db_user.id, db_user.username)
    return db_user


def list_users(db: Session, offset: int = 0, limit: int = 100) -> List[User]:
    return db.query(User).order_by(User.id.asc()).offset(offset).limit(limit).all()


def seed_initial_users_if_empty(db: Session):
    """Seed initial development/demo accounts if users table is empty."""
    try:
        user_count = db.query(User).count()
        if user_count > 0:
            return

        bootstrap_accounts = [
            ("admin", "admin@nexusner.gov.in", BOOTSTRAP_ADMIN_PASSWORD, "ADMIN"),
            ("operator", "operator@nexusner.gov.in", BOOTSTRAP_OPERATOR_PASSWORD, "CONTROL_OPERATOR"),
            ("field_officer", "field@nexusner.gov.in", BOOTSTRAP_FIELD_PASSWORD, "FIELD_OFFICER"),
            ("driver", "driver@nexusner.gov.in", BOOTSTRAP_DRIVER_PASSWORD, "DRIVER"),
        ]

        for username, email, pwd, role in bootstrap_accounts:
            user = User(
                username=username,
                email=email,
                password_hash=hash_password(pwd),
                role=role,
                is_active=True
            )
            db.add(user)

        db.commit()
        logger.info("Seeded 4 default demonstration accounts (ADMIN, CONTROL_OPERATOR, FIELD_OFFICER, DRIVER)")
    except Exception as err:
        db.rollback()
        logger.warning("Could not seed initial users: %s", err)
