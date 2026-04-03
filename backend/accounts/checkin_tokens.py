from django.core import signing

CHECKIN_TOKEN_SALT = 'aem.event-checkin-v1'


def make_checkin_token(participation_id):
    return signing.dumps({'p': int(participation_id)}, salt=CHECKIN_TOKEN_SALT)


def parse_checkin_token(token):
    return signing.loads(token, salt=CHECKIN_TOKEN_SALT, max_age=60 * 60 * 24 * 365)
