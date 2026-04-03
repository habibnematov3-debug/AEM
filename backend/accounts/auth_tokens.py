from django.conf import settings
from django.core import signing


AUTH_TOKEN_SALT = 'accounts.auth-token'


class AuthTokenError(Exception):
    pass


def issue_auth_token(user):
    return signing.dumps({'user_id': user.id}, salt=AUTH_TOKEN_SALT, compress=True)


def read_auth_token(token):
    try:
        payload = signing.loads(
            token,
            salt=AUTH_TOKEN_SALT,
            max_age=settings.AEM_AUTH_TOKEN_MAX_AGE_SECONDS,
        )
    except signing.SignatureExpired as exc:
        raise AuthTokenError('Your sign-in token has expired. Please sign in again.') from exc
    except signing.BadSignature as exc:
        raise AuthTokenError('Your sign-in token is invalid. Please sign in again.') from exc

    user_id = payload.get('user_id')
    if not user_id:
        raise AuthTokenError('Your sign-in token is invalid. Please sign in again.')

    return int(user_id)
