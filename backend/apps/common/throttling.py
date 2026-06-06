# backend/apps/common/throttling.py
# Throttle ciblé : ne limite QUE l'endpoint de connexion (anti-brute-force),
# sans impacter le reste de l'API. Inclus dans DEFAULT_THROTTLE_CLASSES, il
# renvoie None (aucune limite) pour toutes les autres routes.

from rest_framework.throttling import SimpleRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    scope = "login"

    def get_cache_key(self, request, view):
        if request.path.rstrip("/").endswith("/auth/login"):
            return self.cache_format % {
                "scope": self.scope,
                "ident": self.get_ident(request),
            }
        return None  # pas de limitation pour les autres routes