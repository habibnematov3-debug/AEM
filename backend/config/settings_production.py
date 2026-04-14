"""
Production Django settings for AEM backend.
"""
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


def get_str_env(name, default):
    value = os.getenv(name)
    return value if value is not None else default


# Load environment variables
load_env_file(BASE_DIR / '.env')

# Security settings
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')
DEBUG = False  # Always False in production

# Host configuration
ALLOWED_HOSTS = get_list_env('DJANGO_ALLOWED_HOSTS', [
    'api.eventajou.uz',
    'eventajou.uz', 
    'www.eventajou.uz'
])

# Render external hostname
RENDER_EXTERNAL_HOSTNAME = os.getenv('RENDER_EXTERNAL_HOSTNAME')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

# Proxy support for production
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Database
DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL)
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('AEM_DB_NAME', 'aem_db'),
            'USER': os.getenv('AEM_DB_USER', 'postgres'),
            'PASSWORD': os.getenv('AEM_DB_PASSWORD'),
            'HOST': os.getenv('AEM_DB_HOST', 'localhost'),
            'PORT': os.getenv('AEM_DB_PORT', '5432'),
        }
    }

# Time zone
TIME_ZONE = os.getenv('AEM_TIME_ZONE', 'Asia/Tashkent')
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# CORS settings
CORS_ALLOWED_ORIGINS = get_list_env(
    'AEM_CORS_ALLOWED_ORIGINS',
    [
        'https://eventajou.uz',
        'https://www.eventajou.uz',
    ]
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^https://.*\.vercel\.app$',
]

# CSRF settings
CSRF_TRUSTED_ORIGINS = get_list_env(
    'AEM_CSRF_TRUSTED_ORIGINS',
    [
        'https://eventajou.uz',
        'https://www.eventajou.uz',
    ]
)
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'None'

# Session settings
SESSION_ENGINE = 'django.contrib.sessions.backends.signed_cookies'
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'None'
SESSION_COOKIE_AGE = 1209600  # 2 weeks

# Email settings
EMAIL_ENABLED = get_bool_env('AEM_EMAIL_ENABLED', False)
if EMAIL_ENABLED:
    EMAIL_HOST = os.getenv('AEM_EMAIL_HOST', 'smtp.gmail.com')
    EMAIL_PORT = int(os.getenv('AEM_EMAIL_PORT', '587'))
    EMAIL_HOST_USER = os.getenv('AEM_EMAIL_HOST_USER')
    EMAIL_HOST_PASSWORD = os.getenv('AEM_EMAIL_HOST_PASSWORD')
    EMAIL_USE_TLS = get_bool_env('AEM_EMAIL_USE_TLS', True)
    EMAIL_USE_SSL = get_bool_env('AEM_EMAIL_USE_SSL', False)
    EMAIL_TIMEOUT = int(os.getenv('AEM_EMAIL_TIMEOUT', '10'))
    DEFAULT_FROM_EMAIL = os.getenv('AEM_DEFAULT_FROM_EMAIL')

# Google OAuth
GOOGLE_CLIENT_IDS = get_list_env('AEM_GOOGLE_CLIENT_IDS', [])

# Owner emails
OWNER_EMAILS = get_list_env('AEM_OWNER_EMAILS', [])

# Installed apps
INSTALLED_APPS = [
    'corsheaders',
    'rest_framework',
    'channels',
    'accounts',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

# Middleware
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Root URLconf
ROOT_URLCONF = 'config.urls'

# Templates
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

# ASGI/WSGI
ASGI_APPLICATION = 'config.asgi.application'
WSGI_APPLICATION = 'config.wsgi.application'

# Security settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
X_FRAME_OPTIONS = 'DENY'

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'config': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Channel layers for WebSocket support
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [{'host': os.getenv('REDIS_URL', 'redis://localhost:6379/1')}],
        },
    },
}
