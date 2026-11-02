import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
from app.main import create_app

INITIAL = 'InitialTestingPassword!2026'
PASSWORD = 'ChangedTestingPassword!2026'


def sign_in(client, email='admin@dentdocs.local', password=PASSWORD, temporary=None):
    response = client.post('/api/auth/login', json={'email': email, 'password': temporary or password}, headers={'X-Requested-With': 'DentDocs'})
    if response.status_code == 401 and email == 'admin@dentdocs.local' and temporary is None:
        response = client.post('/api/auth/login', json={'email': email, 'password': INITIAL}, headers={'X-Requested-With': 'DentDocs'})
        temporary = INITIAL
    assert response.status_code == 200, response.text
    auth = response.json()
    client.headers['X-CSRF-Token'] = auth['csrfToken']
    if auth['user']['mustChangePassword']:
        response = client.post('/api/auth/change-password', json={'currentPassword': temporary or password, 'newPassword': password})
        assert response.status_code == 200, response.text
        auth = response.json()
        client.headers['X-CSRF-Token'] = auth['csrfToken']
    if not auth['privacyAcknowledged']:
        assert client.post('/api/privacy-acknowledgements', json={'noticeVersion': auth['noticeVersion']}).status_code == 200
    return client.get('/api/auth/me').json()


@pytest.fixture
def setup(tmp_path, monkeypatch):
    monkeypatch.setenv('DENTDOCS_MODE', 'mock')
    monkeypatch.setenv('COOKIE_SECURE', 'false')
    monkeypatch.setenv('BOOTSTRAP_ADMIN_PASSWORD', INITIAL)
    return dict(database_url=f'sqlite:///{tmp_path / "test.db"}', file_root=tmp_path / 'files', encryption_key=Fernet.generate_key())


@pytest.fixture
def client(setup):
    with TestClient(create_app(**setup)) as client:
        sign_in(client)
        yield client


def staff(client, role):
    result = client.post('/api/admin/users', json={'email': f'{role}@test.local', 'name': f'Test {role}', 'title': 'Fictional staff', 'role': role})
    assert result.status_code == 201, result.text
    return result.json()
