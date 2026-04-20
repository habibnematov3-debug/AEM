import os
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent


def load_env_file(path):
    if not path.exists():
        return

    for raw_line in path.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue

        key, value = line.split('=', 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def get_bool_env(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {'1', 'true', 'yes', 'on'}


def get_list_env(name, default):
    value = os.getenv(name)
    if not value:
        return default
    return [item.strip() for item in value.split(',') if item.strip()]


def merge_list_env(name, default):
    merged = list(default)
    for value in get_list_env(name, []):
        if value not in merged:
            merged.append(value)
    return merged


def get_str_env(name, default):
    value = os.getenv(name)
    return value if value is not None else default


load_env_file(BASE_DIR / '.env')


SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-aem-dev-key')
DEBUG = get_bool_env('DJANGO_DEBUG', True)
ALLOWED_HOSTS = get_list_env(
    'DJANGO_ALLOWED_HOSTS',
    ['127.0.0.1', 'localhost', 'testserver', 'api.eventajou.uz', 'eventajou.uz', 'www.eventajou.uz'],
)
RENDER_EXTERNAL_HOSTNAME = os.getenv('RENDER_EXTERNAL_HOSTNAME')

if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

# Proxy support for production
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')


INSTALLED_APPS = [
    'corsheaders',
    'rest_framework',
    'channels',
    'django.contrib.auth',
    'accounts',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.staticfiles',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'config.middleware.RequestDebugMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
            ],
        },
    },
]

ASGI_APPLICATION = 'config.asgi.application'
WSGI_APPLICATION = 'config.wsgi.application'


DATABASE_URL = os.getenv('DATABASE_URL')

if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            ssl_require=False,
        ),
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('AEM_DB_NAME', 'aem_db'),
            'USER': os.getenv('AEM_DB_USER', 'postgres'),
            'PASSWORD': os.getenv('AEM_DB_PASSWORD', 'postgres'),
            'HOST': os.getenv('AEM_DB_HOST', 'localhost'),
            'PORT': os.getenv('AEM_DB_PORT', '5432'),
        }
    }


AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


LANGUAGE_CODE = 'en-us'
TIME_ZONE = os.getenv('AEM_TIME_ZONE', 'Asia/Tashkent')
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


EMAIL_BACKEND = get_str_env(
    'AEM_EMAIL_BACKEND',
    'django.core.mail.backends.smtp.EmailBackend'
    if os.getenv('AEM_EMAIL_HOST')
    else 'django.core.mail.backends.console.EmailBackend',
)
EMAIL_HOST = get_str_env('AEM_EMAIL_HOST', '')
EMAIL_PORT = int(get_str_env('AEM_EMAIL_PORT', '587'))
EMAIL_HOST_USER = get_str_env('AEM_EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = get_str_env('AEM_EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = get_bool_env('AEM_EMAIL_USE_TLS', True)
EMAIL_USE_SSL = get_bool_env('AEM_EMAIL_USE_SSL', False)
EMAIL_TIMEOUT = int(get_str_env('AEM_EMAIL_TIMEOUT', '10'))
DEFAULT_FROM_EMAIL = get_str_env(
    'AEM_DEFAULT_FROM_EMAIL',
    EMAIL_HOST_USER or 'no-reply@aem.local',
)
AEM_EMAIL_ENABLED = get_bool_env('AEM_EMAIL_ENABLED', bool(EMAIL_HOST))


REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'UNAUTHENTICATED_USER': None,
    'UNAUTHENTICATED_TOKEN': None,
}

AEM_AUTH_TOKEN_MAX_AGE_SECONDS = int(get_str_env('AEM_AUTH_TOKEN_MAX_AGE_SECONDS', '1209600'))
AEM_GOOGLE_CLIENT_IDS = tuple(
    client_id.strip()
    for client_id in get_list_env('AEM_GOOGLE_CLIENT_IDS', [])
    if client_id.strip()
)
AEM_OWNER_EMAILS = tuple(
    email.strip().lower()
    for email in get_list_env('AEM_OWNER_EMAILS', [])
    if email.strip()
)

CORS_ALLOWED_ORIGINS = merge_list_env(
    'AEM_CORS_ALLOWED_ORIGINS',
    [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://eventajou.uz',
        'https://www.eventajou.uz',
    ],
)
CORS_ALLOWED_ORIGIN_REGEXES = get_list_env(
    'AEM_CORS_ALLOWED_ORIGIN_REGEXES',
    [
        r'^https://.*\.vercel\.app$',
        r'^http://localhost:\d+$',
        r'^http://127\.0\.0\.1:\d+$',
    ],
)
CORS_ALLOW_ALL_ORIGINS = get_bool_env('AEM_CORS_ALLOW_ALL_ORIGINS', False)
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = merge_list_env('AEM_CSRF_TRUSTED_ORIGINS', CORS_ALLOWED_ORIGINS)

SESSION_ENGINE = 'django.contrib.sessions.backends.signed_cookies'
SESSION_COOKIE_NAME = 'aem_sessionid'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = get_str_env(
    'AEM_SESSION_COOKIE_SAMESITE',
    'None' if os.getenv('RENDER') else 'Lax',
)
SESSION_COOKIE_SECURE = get_bool_env('AEM_SESSION_COOKIE_SECURE', bool(os.getenv('RENDER')))
CSRF_COOKIE_SAMESITE = get_str_env(
    'AEM_CSRF_COOKIE_SAMESITE',
    'None' if os.getenv('RENDER') else 'Lax',
)
CSRF_COOKIE_SECURE = get_bool_env('AEM_CSRF_COOKIE_SECURE', bool(os.getenv('RENDER')))

# Channel layers for WebSocket support
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer' if DEBUG else 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('127.0.0.1', 6379)] if not DEBUG else [],
        },
    },
}
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
