"""Password, opaque-session, CSRF, authorization and append-only audit primitives."""
import hashlib
import os
import secrets
import time
from datetime import datetime, timezone
from uuid import uuid4

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from .database import User, LoginSession, LoginThrottle, Acknowledgement

NOTICE_VERSION = '2026-11-02-v1'
ROLES = {'admin', 'dentist', 'assistant', 'front_desk'}
ADMINISTRATIVE = {'Billing/Receipt', 'Appointment Record'}
hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)
DUMMY_HASH = hasher.hash(secrets.token_urlsafe(32))


def stamp():
    return datetime.now(timezone.utc).isoformat()


def hash_token(value):
    return hashlib.sha256(value.encode()).hexdigest()


def check_password(password):
    if not 12 <= len(password) <= 128:
        raise HTTPException(422, 'Use a password between 12 and 128 characters')


def verify_password(encoded, password):
    try:
        return hasher.verify(encoded, password)
    except (VerificationError, InvalidHashError):
        return False


def user_data(user):
    return dict(id=user.id, name=user.name, role=user.role, title=user.title, email=user.email,
                avatarInitials=''.join(p[0] for p in user.name.split()[:2]).upper(),
                enabled=user.enabled, mustChangePassword=user.must_change, revision=user.revision)


def acknowledged(db, user_id):
    return db.scalar(select(Acknowledgement.id).where(Acknowledgement.user_id == user_id, Acknowledgement.notice_version == NOTICE_VERSION)) is not None


def can_read(user, doc):
    return (user['role'] == 'admin' or not doc.get('archived')) and (user['role'] != 'front_desk' or doc['type'] in ADMINISTRATIVE)


def authorize(user, doc, write=False, verify=False):
    if not can_read(user, doc):
        raise HTTPException(403, 'Your account cannot access this document')
    if write and user['role'] == 'assistant' and doc['type'] == 'Treatment Plan':
        raise HTTPException(403, 'Treatment plans can be changed only by a dentist or administrator')
    if verify and user['role'] not in {'admin', 'dentist'}:
        raise HTTPException(403, 'A dentist or administrator must verify completeness')


def initialize_admin(db):
    if db.scalar(select(User.id).limit(1)):
        return
    password = os.environ.get('BOOTSTRAP_ADMIN_PASSWORD', '')
    check_password(password)
    db.add(User(id=str(uuid4()), email=os.getenv('BOOTSTRAP_ADMIN_EMAIL', 'admin@dentdocs.local').lower(), name='Clinic Administrator', title='Administrator', role='admin', password_hash=hasher.hash(password), enabled=True, must_change=True))
    db.commit()


class LoginBody(BaseModel):
    model_config = ConfigDict(extra='forbid')
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=1, max_length=128)


class PasswordBody(BaseModel):
    model_config = ConfigDict(extra='forbid')
    currentPassword: str = Field(max_length=128)
    newPassword: str = Field(min_length=12, max_length=128)


class NewUser(BaseModel):
    model_config = ConfigDict(extra='forbid')
    email: str = Field(min_length=3, max_length=200)
    name: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=120)
    role: str


class UserChange(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expectedRevision: int = Field(ge=1)
    enabled: bool | None = None
    role: str | None = None


def install_security(app, database, audit):
    router = APIRouter(prefix='/api')
    idle_seconds = 600
    absolute_seconds = 8 * 60 * 60
    secure_cookie = os.getenv('COOKIE_SECURE', 'true').lower() == 'true'

    def origin_guard(request):
        origin = request.headers.get('origin')
        allowed = os.getenv('APP_ORIGIN', 'http://127.0.0.1:8080').split(',')
        if origin and origin not in allowed:
            raise HTTPException(403, 'Untrusted request origin')

    def current(request: Request, db=Depends(database)):
        origin_guard(request)
        token = request.cookies.get('dentdocs_session', '')
        session = db.scalar(select(LoginSession).where(LoginSession.token_hash == hash_token(token)).with_for_update()) if token else None
        if session is None or session.revoked:
            raise HTTPException(401, 'Sign in to continue')
        user = db.get(User, session.user_id)
        if not user or not user.enabled:
            session.revoked = True
            db.commit()
            raise HTTPException(401, 'This account is disabled')
        moment = time.time()
        if moment - session.last_seen >= idle_seconds or moment - session.created_at >= absolute_seconds:
            session.revoked = True
            audit(db, user_data(user), 'SESSION_TIMEOUT', details='Server-enforced session expiry')
            db.commit()
            raise HTTPException(401, 'Your session expired. Sign in again.')
        if request.method not in {'GET', 'HEAD', 'OPTIONS'}:
            if not secrets.compare_digest(request.headers.get('X-CSRF-Token', ''), session.csrf):
                raise HTTPException(403, 'Request verification failed. Reload and try again.')
        if request.url.path != '/api/auth/me':
            session.last_seen = moment
        request.state.login_session = session
        request.state.identity = user_data(user)
        db.commit()
        return user_data(user)

    def actor(request: Request, user=Depends(current), db=Depends(database)):
        if user['mustChangePassword']:
            raise HTTPException(403, 'Change your temporary password before accessing records')
        if not acknowledged(db, user['id']):
            raise HTTPException(403, 'Acknowledge the current confidentiality notice before accessing records')
        return user

    def admin(user=Depends(actor)):
        if user['role'] != 'admin':
            raise HTTPException(403, 'Administrator access required')
        return user

    def revoke(db, user_id):
        db.execute(update(LoginSession).where(LoginSession.user_id == user_id).values(revoked=True))

    def issue(db, user, response):
        token = secrets.token_urlsafe(32)
        session = LoginSession(token_hash=hash_token(token), user_id=user.id, csrf=secrets.token_urlsafe(32), last_seen=time.time(), created_at=time.time())
        db.add(session)
        response.set_cookie('dentdocs_session', token, httponly=True, secure=secure_cookie, samesite='strict', path='/', max_age=absolute_seconds)
        return dict(user=user_data(user), csrfToken=session.csrf, privacyAcknowledged=acknowledged(db, user.id), noticeVersion=NOTICE_VERSION)

    @router.post('/auth/login')
    def login(body: LoginBody, request: Request, response: Response, db=Depends(database)):
        origin_guard(request)
        if request.headers.get('X-Requested-With') != 'DentDocs':
            raise HTTPException(403, 'Request verification required')
        email = body.email.strip().lower()
        key = hash_token(email)
        # PostgreSQL serializes failed attempts for an account, including unknown accounts.
        if db.bind.dialect.name == 'postgresql':
            from sqlalchemy import text
            db.execute(text('SELECT pg_advisory_xact_lock(:key)'), {'key': int(key[:15], 16)})
        throttle = db.get(LoginThrottle, key)
        if throttle and throttle.locked_until > time.time():
            raise HTTPException(429, 'Too many attempts. Try again in 15 minutes.')
        user = db.scalar(select(User).where(User.email == email))
        valid = verify_password(user.password_hash if user else DUMMY_HASH, body.password)
        if not user or not user.enabled or not valid:
            if throttle is None:
                throttle = LoginThrottle(key=key, failures=0, locked_until=0)
                db.add(throttle)
            throttle.failures = throttle.failures + 1 if throttle.locked_until == 0 else 1
            throttle.locked_until = time.time() + 900 if throttle.failures >= 5 else 0
            audit(db, user_data(user) if user else {'id': 'system', 'name': 'System', 'role': 'system'}, 'LOGIN_FAILED', details='Invalid credentials or disabled account')
            db.commit()
            raise HTTPException(401, 'Email or password is incorrect')
        if throttle:
            throttle.failures = 0
            throttle.locked_until = 0
        old = request.cookies.get('dentdocs_session')
        if old:
            previous = db.get(LoginSession, hash_token(old))
            if previous:
                previous.revoked = True
        result = issue(db, user, response)
        audit(db, user_data(user), 'USER_LOGIN')
        db.commit()
        return result

    @router.get('/auth/me')
    def me(request: Request, user=Depends(current), db=Depends(database)):
        return dict(user=user, csrfToken=request.state.login_session.csrf, privacyAcknowledged=acknowledged(db, user['id']), noticeVersion=NOTICE_VERSION)

    @router.post('/auth/logout')
    def logout(request: Request, response: Response, user=Depends(current), db=Depends(database)):
        request.state.login_session.revoked = True
        audit(db, user, 'USER_LOGOUT')
        db.commit()
        response.delete_cookie('dentdocs_session', path='/')
        return {'ok': True}

    @router.post('/auth/activity')
    def activity(user=Depends(current)):
        return {'ok': True}

    @router.post('/auth/change-password')
    def change_password(body: PasswordBody, response: Response, identity=Depends(current), db=Depends(database)):
        user = db.get(User, identity['id'])
        if not verify_password(user.password_hash, body.currentPassword):
            raise HTTPException(400, 'Current password is incorrect')
        check_password(body.newPassword)
        if body.newPassword == body.currentPassword:
            raise HTTPException(422, 'Choose a different password')
        user.password_hash = hasher.hash(body.newPassword)
        user.must_change = False
        user.revision += 1
        revoke(db, user.id)
        result = issue(db, user, response)
        audit(db, user_data(user), 'PASSWORD_CHANGE')
        db.commit()
        return result

    @router.post('/privacy-acknowledgements')
    def acknowledge(body: dict, user=Depends(current), db=Depends(database)):
        if user['mustChangePassword'] or body.get('noticeVersion') != NOTICE_VERSION:
            raise HTTPException(422, 'Change your password and review the current notice')
        if not acknowledged(db, user['id']):
            db.add(Acknowledgement(id=str(uuid4()), user_id=user['id'], notice_version=NOTICE_VERSION, timestamp=stamp()))
            audit(db, user, 'PRIVACY_ACK', details=NOTICE_VERSION)
            db.commit()
        return {'ok': True}

    @router.get('/admin/users')
    def users(_admin=Depends(admin), db=Depends(database)):
        return [user_data(u) for u in db.scalars(select(User).order_by(User.name))]

    @router.post('/admin/users', status_code=201)
    def create_user(body: NewUser, administrator=Depends(admin), db=Depends(database)):
        email = body.email.strip().lower()
        if body.role not in ROLES or '@' not in email or not body.name.strip() or not body.title.strip():
            raise HTTPException(422, 'Enter a name, email, title and valid role')
        if db.scalar(select(User.id).where(User.email == email)):
            raise HTTPException(409, 'An account with this email already exists')
        password = secrets.token_urlsafe(24)
        user = User(id=str(uuid4()), email=email, name=body.name.strip(), title=body.title.strip(), role=body.role, password_hash=hasher.hash(password), enabled=True, must_change=True)
        db.add(user)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            raise HTTPException(409, 'An account with this email already exists')
        audit(db, administrator, 'USER_CREATE', details=f'Account {user.id}; role {user.role}')
        db.commit()
        return {'user': user_data(user), 'temporaryPassword': password}

    @router.patch('/admin/users/{user_id}')
    def update_user(user_id: str, body: UserChange, administrator=Depends(admin), db=Depends(database)):
        # Lock every enabled administrator so concurrent changes cannot remove them all.
        admins = list(db.scalars(select(User).where(User.role == 'admin', User.enabled == True).order_by(User.id).with_for_update().execution_options(populate_existing=True)))
        user = db.scalar(select(User).where(User.id == user_id).with_for_update().execution_options(populate_existing=True))
        if not user:
            raise HTTPException(404, 'Account not found')
        if user.revision != body.expectedRevision:
            raise HTTPException(409, 'Account changed. Reload and try again.')
        if body.role is not None and body.role not in ROLES:
            raise HTTPException(422, 'Unknown role')
        if user.enabled and user.role == 'admin' and len(admins) <= 1 and (body.enabled is False or body.role not in (None, 'admin')):
            raise HTTPException(409, 'Keep at least one enabled administrator')
        if body.role is not None:
            user.role = body.role
        if body.enabled is not None:
            user.enabled = body.enabled
        user.revision += 1
        revoke(db, user.id)
        audit(db, administrator, 'USER_UPDATE', details=f'Account {user.id}; enabled {user.enabled}; role {user.role}; sessions revoked')
        db.commit()
        return user_data(user)

    @router.post('/admin/users/{user_id}/reset-password')
    def reset_password(user_id: str, administrator=Depends(admin), db=Depends(database)):
        user = db.scalar(select(User).where(User.id == user_id).with_for_update())
        if not user:
            raise HTTPException(404, 'Account not found')
        password = secrets.token_urlsafe(24)
        user.password_hash = hasher.hash(password)
        user.must_change = True
        user.revision += 1
        revoke(db, user.id)
        audit(db, administrator, 'PASSWORD_RESET', details=f'Account {user.id}; sessions revoked')
        db.commit()
        return {'temporaryPassword': password}

    app.include_router(router)
    return actor
