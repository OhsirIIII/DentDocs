"""Read-only HTTPS transport checks, with an explicitly trusted CA and no bypass.

This checks one host's fictional-data staging endpoint. It does not install trust,
sign in, certify browser behavior or test another workstation/firewall.
"""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
from html.parser import HTMLParser
import ipaddress
import json
from pathlib import Path
import socket
import ssl
from urllib.parse import urljoin, urlsplit

import httpx
from cryptography import x509


def origin(value, scheme='https'):
    parts = urlsplit(value)
    if (parts.scheme != scheme or not parts.hostname or parts.username or parts.password
            or parts.path not in ('', '/') or parts.query or parts.fragment):
        raise ValueError(f'Use a {scheme} origin without credentials, a path, query or fragment')
    parts.port  # Validate the port before making any connection.
    return value.rstrip('/')


def same_https_origin(base, location):
    expected = urlsplit(origin(base))
    target = urlsplit(urljoin(base + '/', location))
    if (not location or target.scheme != 'https' or target.username or target.password
            or target.hostname != expected.hostname
            or (target.port or 443) != (expected.port or 443)):
        raise ValueError('Redirect or asset leaves the verified HTTPS origin')
    return target.geturl()


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        key = 'src' if tag in {'script', 'img'} else 'href' if tag == 'link' else None
        if key and attrs.get(key):
            self.urls.append(attrs[key])


@contextmanager
def resolve_host(hostname, address=None):
    """Optional per-process DNS mapping; TLS still verifies the original hostname."""
    if address is None:
        yield
        return
    address = str(ipaddress.ip_address(address))
    original = socket.getaddrinfo

    def lookup(host, *args, **kwargs):
        name = host.decode('ascii') if isinstance(host, bytes) else host
        return original(address if name == hostname else host, *args, **kwargs)

    socket.getaddrinfo = lookup
    try:
        yield
    finally:
        socket.getaddrinfo = original


def verify(url, ca, http_url=None, connect_ip=None):
    url = origin(url)
    with resolve_host(urlsplit(url).hostname, connect_ip):
        report = verify_connection(url, ca, http_url)
    if connect_ip:
        report['clientDnsOverride'] = str(ipaddress.ip_address(connect_ip))
    return report


def verify_connection(url, ca, http_url=None):
    url = origin(url)
    context = ssl.create_default_context(cafile=str(ca))
    parts = urlsplit(url)
    with socket.create_connection((parts.hostname, parts.port or 443), timeout=10) as sock:
        with context.wrap_socket(sock, server_hostname=parts.hostname) as connection:
            certificate = x509.load_der_x509_certificate(connection.getpeercert(binary_form=True))
            protocol = connection.version()
    now = datetime.now(timezone.utc)
    assert certificate.not_valid_before_utc <= now < certificate.not_valid_after_utc
    assert protocol in {'TLSv1.2', 'TLSv1.3'}
    report = {'tlsVerified': True, 'protocol': protocol,
              'certificateNotAfter': certificate.not_valid_after_utc.isoformat(),
              'certificateHostnameVerified': True, 'certificateVerificationBypassed': False}
    with httpx.Client(verify=context, trust_env=False, follow_redirects=False, timeout=15) as client:
        health = client.get(url + '/api/health')
        health.raise_for_status()
        assert health.json()['mode'] == 'mock'
        assert client.get(url + '/api/bootstrap').status_code == 401
        redirected = client.get(url + '/api/health/?transport=1')
        assert redirected.status_code in {301, 302, 307, 308}
        location = same_https_origin(url, redirected.headers.get('location', ''))
        assert urlsplit(location).path == '/api/health' and urlsplit(location).query == 'transport=1'
        assert client.get(location).status_code == 200
        page = client.get(url + '/')
        page.raise_for_status()
        assert "frame-ancestors 'none'" in page.headers['content-security-policy']
        assert page.headers['x-content-type-options'] == 'nosniff'
        assert page.headers['referrer-policy'] == 'no-referrer'
        assert 'no-store' in page.headers['cache-control']
        assets = Assets()
        assets.feed(page.text)
        assert assets.urls, 'No page assets were found'
        for asset in assets.urls:
            address = same_https_origin(url, asset)
            client.get(address).raise_for_status()
        report.update(mockModeVerified=True, anonymousAccessDenied=True,
                      apiRedirectPreservesHttpsOrigin=True, staticAssetsVerified=len(assets.urls),
                      noInsecureStaticAssetReferences=True, browserHeadersVerified=True)
        if http_url:
            http_url = origin(http_url, 'http')
            response = client.get(http_url + '/api/health?transport=1')
            assert response.status_code in {301, 302, 307, 308}
            location = same_https_origin(url, response.headers.get('location', ''))
            assert urlsplit(location).path == '/api/health' and urlsplit(location).query == 'transport=1'
            report['httpRedirectVerified'] = client.get(location).status_code == 200
            assert report['httpRedirectVerified']
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', required=True)
    parser.add_argument('--ca', required=True)
    parser.add_argument('--http-url')
    parser.add_argument('--connect-ip', help='Map only the URL hostname to this IP in this test process; TLS hostname verification stays enabled')
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    report = verify(args.url, Path(args.ca), args.http_url, args.connect_ip)
    Path(args.output).write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print('PASS: verified TLS/hostname, HTTPS-preserving redirects, assets, headers and anonymous-access boundary')


if __name__ == '__main__':
    main()
