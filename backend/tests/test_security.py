import time
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update, delete
from sqlalchemy.orm import Session
from sqlalchemy.exc import DatabaseError

from app.main import create_app
from app.database import User, LoginSession, Audit, Acknowledgement
from conftest import sign_in, staff, INITIAL, PASSWORD


def test_no_anonymous_access_or_persona_headers(setup):
    with TestClient(create_app(**setup)) as guest:
        for method, path in [('GET', '/api/bootstrap'), ('GET', '/api/documents/doc-001'), ('GET', '/api/documents/doc-001/file'), ('POST', '/api/documents/search'), ('POST', '/api/files'), ('GET', '/api/admin/users')]:
            response = guest.request(method, path, headers={'X-Demo-Role': 'admin'}, json={} if method == 'POST' else None)
            assert response.status_code == 401, (path, response.text)
        assert guest.post('/api/demo/session-events', json={'action': 'PRIVACY_ACK'}).status_code == 404


def test_temporary_password_and_notice_are_server_gates(setup):
    with TestClient(create_app(**setup)) as user:
        response = user.post('/api/auth/login', json={'email': 'admin@dentdocs.local', 'password': INITIAL}, headers={'X-Requested-With': 'DentDocs'})
        auth = response.json()
        cookie = response.headers['set-cookie'].lower()
        assert 'httponly' in cookie and 'samesite=strict' in cookie
        user.headers['X-CSRF-Token'] = auth['csrfToken']
        assert user.get('/api/bootstrap').status_code == 403
        assert user.post('/api/privacy-acknowledgements', json={'noticeVersion': auth['noticeVersion']}).status_code == 422
        changed = user.post('/api/auth/change-password', json={'currentPassword': INITIAL, 'newPassword': PASSWORD})
        assert changed.status_code == 200
        assert changed.json()['csrfToken'] != auth['csrfToken']
        user.headers['X-CSRF-Token'] = changed.json()['csrfToken']
        assert user.get('/api/bootstrap').status_code == 403
        assert user.post('/api/privacy-acknowledgements', json={'noticeVersion': auth['noticeVersion']}).status_code == 200
        assert user.get('/api/bootstrap').status_code == 200
        with Session(user.app.state.engine) as db:
            saved = db.scalar(select(User))
            assert saved.password_hash.startswith('$argon2id$') and PASSWORD not in saved.password_hash
            ack = db.scalar(select(Acknowledgement))
            assert ack.user_id == saved.id and ack.timestamp


def test_csrf_and_origin(client):
    assert client.post('/api/auth/activity', headers={'X-CSRF-Token': ''}).status_code == 403
    assert client.post('/api/auth/activity', headers={'Origin': 'https://untrusted.invalid'}).status_code == 403
    assert client.post('/api/auth/login', json={'email': 'admin@dentdocs.local', 'password': PASSWORD}).status_code == 403


def test_front_desk_response_and_all_access_paths(client, setup):
    credentials = staff(client, 'front_desk')
    clinical = next(d for d in client.get('/api/bootstrap').json()['documents'] if d['type'] == 'Treatment Plan')
    with TestClient(create_app(**setup)) as front:
        sign_in(front, credentials['user']['email'], temporary=credentials['temporaryPassword'])
        data = front.get('/api/bootstrap').json()
        assert all(d['type'] in {'Billing/Receipt', 'Appointment Record'} for d in data['documents'])
        assert all(not p['medicalAlerts'] and not p['fdiTreatedTeeth'] and not p['dob'] for p in data['patients'])
        assert data['auditLogs'] == [] and 'users' not in data
        for suffix in ['', '/file']:
            assert front.get(f'/api/documents/{clinical["id"]}' + suffix, headers={'X-Demo-Role': 'admin'}).status_code == 403
        assert front.post(f'/api/documents/{clinical["id"]}/print').status_code == 403
        assert front.get('/api/admin/users').status_code == 403
        assert front.post('/api/admin/users/unknown/reset-password').status_code == 403
        assert front.post('/api/documents/search', json={'query': clinical['title']}).json() == []


def test_assistant_cannot_edit_plans_verify_or_archive(client, setup):
    credentials = staff(client, 'assistant')
    plan = next(d for d in client.get('/api/bootstrap').json()['documents'] if d['type'] == 'Treatment Plan')
    with TestClient(create_app(**setup)) as assistant:
        sign_in(assistant, credentials['user']['email'], temporary=credentials['temporaryPassword'])
        url = f'/api/documents/{plan["id"]}'
        assert assistant.get(url).status_code == 200
        assert assistant.patch(url, json={'expectedRevision': plan['revision'], 'updates': {'tags': ['blocked']}}).status_code == 403
        assert assistant.post(url + '/versions', json={'expectedRevision': plan['revision'], 'note': 'Blocked'}).status_code == 403
        assert assistant.post(url + '/completeness-resolution', json={'expectedRevision': plan['revision'], 'note': 'Blocked'}).status_code == 403
        assert assistant.post(url + '/archive', json={'expectedRevision': plan['revision']}).status_code == 403


def test_disable_role_and_reset_revoke_sessions(client, setup):
    credentials = staff(client, 'dentist')
    identity = credentials['user']
    with TestClient(create_app(**setup)) as dentist:
        sign_in(dentist, identity['email'], temporary=credentials['temporaryPassword'])
        current = next(u for u in client.get('/api/admin/users').json() if u['id'] == identity['id'])
        changed = client.patch(f'/api/admin/users/{identity["id"]}', json={'expectedRevision': current['revision'], 'role': 'front_desk'})
        assert changed.status_code == 200
        assert dentist.get('/api/bootstrap').status_code == 401
        sign_in(dentist, identity['email'])
        reset = client.post(f'/api/admin/users/{identity["id"]}/reset-password')
        assert reset.status_code == 200
        assert dentist.get('/api/bootstrap').status_code == 401
        sign_in(dentist, identity['email'], temporary=reset.json()['temporaryPassword'])
        current = next(u for u in client.get('/api/admin/users').json() if u['id'] == identity['id'])
        assert client.patch(f'/api/admin/users/{identity["id"]}', json={'expectedRevision': current['revision'], 'enabled': False}).status_code == 200
        assert dentist.get('/api/bootstrap').status_code == 401


def test_last_administrator_is_protected(client):
    admin = client.get('/api/auth/me').json()['user']
    for change in ({'enabled': False}, {'role': 'dentist'}):
        assert client.patch(f'/api/admin/users/{admin["id"]}', json={'expectedRevision': admin['revision'], **change}).status_code == 409


def test_server_timeout_and_poll_does_not_extend(client):
    with Session(client.app.state.engine) as db:
        active = db.scalar(select(LoginSession).where(LoginSession.revoked == False))
        before = active.last_seen
    assert client.get('/api/auth/me').status_code == 200
    with Session(client.app.state.engine) as db:
        active = db.get(LoginSession, active.token_hash)
        assert active.last_seen == before
        active.last_seen = time.time() - 601
        db.commit()
    assert client.get('/api/bootstrap').status_code == 401
    assert client.get('/api/bootstrap').status_code == 401
    with Session(client.app.state.engine) as db:
        assert len([a for a in db.scalars(select(Audit)) if a.data['action'] == 'SESSION_TIMEOUT']) == 1


def test_view_download_print_and_immutable_audits(client):
    from test_api import create
    doc = create(client)
    url = f'/api/documents/{doc["id"]}'
    assert client.get(url).status_code == 200
    assert client.get(url + '/file').status_code == 200
    assert client.post(url + '/print').status_code == 200
    actions = {a['action'] for a in client.get('/api/bootstrap').json()['auditLogs'] if a['targetId'] == doc['id']}
    assert {'UPLOAD', 'VIEW_DOCUMENT', 'DOWNLOAD', 'PRINT_REQUEST'} <= actions
    with Session(client.app.state.engine) as db:
        with pytest.raises(DatabaseError):
            db.execute(delete(Audit))
        db.rollback()
        with pytest.raises(DatabaseError):
            db.execute(update(Audit).values(data={}))


def test_logout_invalidates_cookie(client):
    assert client.post('/api/auth/logout').status_code == 200
    assert client.get('/api/bootstrap').status_code == 401


def test_login_throttling(setup):
    with TestClient(create_app(**setup)) as guest:
        for _ in range(5):
            assert guest.post('/api/auth/login', headers={'X-Requested-With': 'DentDocs'}, json={'email': 'nobody@test.local', 'password': 'wrong'}).status_code == 401
        assert guest.post('/api/auth/login', headers={'X-Requested-With': 'DentDocs'}, json={'email': 'nobody@test.local', 'password': 'wrong'}).status_code == 429
