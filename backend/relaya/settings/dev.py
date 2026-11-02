from .base import *

DEBUG = True
# Développement seulement : garde les empreintes déjà calculées en local (en production, aucun défaut : A4).
PAYMENTS_FINGERPRINT_SALT = os.getenv("PAYMENTS_FINGERPRINT_SALT", "belivay-momo")
