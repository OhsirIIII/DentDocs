import importlib.util
from pathlib import Path

import pytest

spec = importlib.util.spec_from_file_location('verify_https', Path(__file__).parents[1] / 'verify-https.py')
verify_https = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify_https)


@pytest.mark.parametrize('location', [
    'http://localhost/api/health', 'https://localhost/api/health',
    'https://elsewhere.invalid:18443/api/health', '//elsewhere.invalid/api/health',
    'https://staff:password@localhost:18443/api/health', '',
])
def test_unsafe_or_port_losing_redirect_is_rejected(location):
    with pytest.raises(ValueError):
        verify_https.same_https_origin('https://localhost:18443', location)


@pytest.mark.parametrize('location', ['/api/health?check=1', 'https://localhost:18443/api/health?check=1'])
def test_relative_and_absolute_secure_redirects_keep_port_and_query(location):
    assert verify_https.same_https_origin('https://localhost:18443', location) == 'https://localhost:18443/api/health?check=1'


@pytest.mark.parametrize('url', ['http://localhost:18443', 'https://localhost/path', 'https://staff:password@localhost', 'https://localhost?secret=1'])
def test_origin_rejects_ambiguous_or_credential_bearing_input(url):
    with pytest.raises(ValueError):
        verify_https.origin(url)


def test_dns_override_is_scoped_and_restored_after_failure(monkeypatch):
    calls = []
    def original(host, port):
        calls.append((host, port))
        return []
    monkeypatch.setattr(verify_https.socket, 'getaddrinfo', original)
    with pytest.raises(RuntimeError):
        with verify_https.resolve_host('dentdocs', '127.0.0.1'):
            verify_https.socket.getaddrinfo('dentdocs', 18443)
            verify_https.socket.getaddrinfo('other.invalid', 443)
            raise RuntimeError('test failure')
    assert calls == [('127.0.0.1', 18443), ('other.invalid', 443)]
    assert verify_https.socket.getaddrinfo is original


def test_dns_override_rejects_a_hostname_instead_of_an_ip():
    with pytest.raises(ValueError):
        with verify_https.resolve_host('dentdocs', 'other.invalid'):
            pytest.fail('Invalid override was accepted')


@pytest.mark.parametrize('ca,expected', [(None, None), (Path('private-root.crt'), 'private-root.crt')])
def test_default_or_explicit_ca_always_uses_verified_context(monkeypatch, ca, expected):
    class StopBeforeConnecting(Exception):
        pass
    observed = []
    def context(**options):
        observed.append(options)
        raise StopBeforeConnecting()
    monkeypatch.setattr(verify_https.ssl, 'create_default_context', context)
    with pytest.raises(StopBeforeConnecting):
        verify_https.verify_connection('https://dentdocs.example', ca)
    assert observed == [{'cafile': expected}]
