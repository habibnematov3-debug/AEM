import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from django.conf import settings


GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo'
GOOGLE_ISSUERS = {'accounts.google.com', 'https://accounts.google.com'}


class GoogleTokenVerificationError(Exception):
    pass


def _is_truthy(value):
    return value in {True, 'true', 'True', '1', 1}


def verify_google_id_token(credential):
    allowed_client_ids = tuple(
        client_id
        for client_id in getattr(settings, 'AEM_GOOGLE_CLIENT_IDS', ())
        if client_id
    )
    if not allowed_client_ids:
        raise GoogleTokenVerificationError('Google sign-in is not configured.')

    normalized_credential = str(credential or '').strip()
    if not normalized_credential:
        raise GoogleTokenVerificationError('A Google credential is required.')

    query = urlencode({'id_token': normalized_credential})
    request_url = f'{GOOGLE_TOKENINFO_URL}?{query}'

    try:
        with urlopen(request_url, timeout=8) as response:
            payload = json.loads(response.read().decode('utf-8'))
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        raise GoogleTokenVerificationError('Google sign-in could not be verified.') from exc

    audience = str(payload.get('aud', '')).strip()
    issuer = str(payload.get('iss', '')).strip()
    subject = str(payload.get('sub', '')).strip()
    email = str(payload.get('email', '')).strip().lower()
    email_verified = _is_truthy(payload.get('email_verified'))

    if audience not in allowed_client_ids:
        raise GoogleTokenVerificationError('This Google account is not authorized for the app.')
    if issuer not in GOOGLE_ISSUERS:
        raise GoogleTokenVerificationError('Google sign-in returned an invalid issuer.')
    if not subject:
        raise GoogleTokenVerificationError('Google sign-in did not return a valid account id.')
    if not email or not email_verified:
        raise GoogleTokenVerificationError('Your Google account must have a verified email address.')

    return {
        'sub': subject,
        'email': email,
        'full_name': str(payload.get('name') or payload.get('given_name') or email).strip()[:150] or email,
        'profile_image_url': str(payload.get('picture') or '').strip() or None,
    }
