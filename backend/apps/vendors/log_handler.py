# ─────────────────────────────────────────────────────────────────────────────
# backend/apps/vendors/log_handler.py
# Handler Django qui écrit les logs en base de données (SystemLog)
# ─────────────────────────────────────────────────────────────────────────────

import logging
import traceback


# Mapping logger name → service
LOGGER_SERVICE_MAP = {
    'django.request':         'api',
    'django.security':        'auth',
    'apps.accounts':          'auth',
    'apps.vendors':           'vendors',
    'apps.orders':            'orders',
    'apps.catalog':           'catalog',
    'apps.payments':          'payments',
    'apps.shipping':          'email',
    'django':                 'system',
}


def _resolve_service(logger_name: str) -> str:
    """Résout le service depuis le nom du logger."""
    for prefix, service in LOGGER_SERVICE_MAP.items():
        if logger_name.startswith(prefix):
            return service
    return 'system'


class DatabaseLogHandler(logging.Handler):
    """
    Handler de logging Django qui persiste les logs en DB.
    Ne gère que WARNING et au-dessus par défaut (évite de polluer la DB).
    
    Configuration dans settings/base.py :
    
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'handlers': {
            'database': {
                'level': 'WARNING',
                'class': 'apps.vendors.log_handler.DatabaseLogHandler',
            },
            'console': {
                'level': 'DEBUG',
                'class': 'logging.StreamHandler',
                'formatter': 'verbose',
            },
        },
        'formatters': {
            'verbose': {
                'format': '{levelname} {asctime} {module} {message}',
                'style': '{',
            },
        },
        'root': {
            'handlers': ['console', 'database'],
            'level': 'WARNING',
        },
        'loggers': {
            'django': {
                'handlers': ['console', 'database'],
                'level': 'WARNING',
                'propagate': False,
            },
            'apps': {
                'handlers': ['console', 'database'],
                'level': 'INFO',
                'propagate': False,
            },
        },
    }
    """

    def emit(self, record: logging.LogRecord) -> None:
        # Éviter les imports circulaires — import tardif
        try:
            from apps.vendors.models import SystemLog
        except Exception:
            return

        # Ignorer les logs DEBUG (trop verbeux pour la DB)
        if record.levelno < logging.WARNING:
            return

        try:
            # Traceback
            exc_text = ''
            if record.exc_info:
                exc_text = ''.join(traceback.format_exception(*record.exc_info))

            SystemLog.objects.create(
                level      = record.levelname,
                service    = _resolve_service(record.name),
                message    = record.getMessage()[:2000],  # Tronquer si trop long
                logger     = record.name[:200],
                pathname   = record.pathname[:500] if record.pathname else '',
                lineno     = record.lineno,
                exc_text   = exc_text[:5000],
                extra      = getattr(record, 'extra', {}),
                created_at = None,  # auto_now_add
            )
        except Exception:
            # Ne jamais crasher à cause du logging
            self.handleError(record)