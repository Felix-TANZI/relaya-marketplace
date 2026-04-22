# backend/apps/accounts/middleware.py
# Correction par rapport à la version précédente :
# Le middleware déduplique maintenant les sessions par EMPREINTE APPAREIL
# (user + device_name + ip_address) au lieu de créer une nouvelle entrée
# pour chaque JTI. Résultat : un seul enregistrement par appareil réel.

import logging
import re

logger = logging.getLogger(__name__)


def parse_user_agent(ua: str) -> tuple[str, str, str]:
    """Détecte navigateur, OS et type d'appareil depuis le User-Agent."""
    ua = ua or ''

    # Navigateur
    if 'Edg/' in ua or 'Edge/' in ua:
        browser = 'Edge'
    elif 'OPR/' in ua or 'Opera/' in ua:
        browser = 'Opera'
    elif 'Chrome/' in ua and 'Chromium' not in ua:
        browser = 'Chrome'
    elif 'Firefox/' in ua:
        browser = 'Firefox'
    elif 'Safari/' in ua and 'Chrome' not in ua:
        browser = 'Safari'
    else:
        browser = 'Navigateur inconnu'

    # Système d'exploitation
    if 'Windows NT' in ua:
        match = re.search(r'Windows NT (\d+\.\d+)', ua)
        nt_map = {'10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7'}
        nt = match.group(1) if match else ''
        os_name = f"Windows {nt_map.get(nt, nt)}"
    elif 'Android' in ua:
        match = re.search(r'Android (\d+)', ua)
        os_name = f"Android {match.group(1)}" if match else 'Android'
    elif 'iPhone' in ua or 'iPad' in ua:
        match = re.search(r'OS (\d+)_(\d+)', ua)
        os_name = f"iOS {match.group(1)}.{match.group(2)}" if match else 'iOS'
    elif 'Macintosh' in ua or 'Mac OS X' in ua:
        os_name = 'macOS'
    elif 'Linux' in ua:
        os_name = 'Linux'
    else:
        os_name = 'Système inconnu'

    # Type d'appareil
    if 'iPhone' in ua or ('Android' in ua and 'Mobile' in ua) or 'Mobi' in ua:
        device_name = f"Mobile — {browser} / {os_name}"
    elif 'iPad' in ua or 'Tablet' in ua:
        device_name = f"Tablette — {browser} / {os_name}"
    else:
        device_name = f"Ordinateur — {browser} / {os_name}"

    return device_name, browser, os_name


def get_client_ip(request) -> str:
    """Récupère l'IP réelle (derrière proxy/nginx)."""
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


class SessionTrackingMiddleware:
    """
    Crée ou met à jour un UserSession pour chaque requête JWT authentifiée.

    Logique de déduplication :
    - On cherche une session active pour (user, device_name, ip_address).
    - Si elle existe → on met à jour son JTI et last_activity (auto via auto_now).
    - Si elle n'existe pas → on en crée une nouvelle.
    - On ne crée JAMAIS deux entrées pour le même appareil réel.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Seulement pour les requêtes avec un JWT valide
        if (
            hasattr(request, 'user')
            and request.user.is_authenticated
            and hasattr(request, 'auth')
            and request.auth is not None
            and hasattr(request.auth, 'payload')
        ):
            try:
                jti = str(request.auth.payload.get('jti', ''))
                if not jti:
                    return response

                from apps.accounts.models import UserSession
                ua_string   = request.META.get('HTTP_USER_AGENT', '')
                device_name, browser, os_name = parse_user_agent(ua_string)
                ip          = get_client_ip(request) or None

                # Chercher une session existante pour cet appareil exact
                existing = UserSession.objects.filter(
                    user=request.user,
                    device_name=device_name,
                    ip_address=ip,
                    is_active=True,
                ).order_by('-last_activity').first()

                if existing:
                    # Mettre à jour le JTI (nouveau token après refresh)
                    # et last_activity (auto_now le fait automatiquement au save)
                    if existing.jti != jti:
                        existing.jti = jti
                        existing.save(update_fields=['jti', 'last_activity'])
                    # Sinon on ne fait rien — last_activity se met à jour au save
                    # et on ne veut pas sauvegarder à chaque requête (perf)
                else:
                    # Nouvel appareil → nouvelle session
                    UserSession.objects.create(
                        user=request.user,
                        jti=jti,
                        device_name=device_name,
                        browser=browser,
                        os_name=os_name,
                        ip_address=ip,
                        is_active=True,
                    )

            except Exception as exc:
                logger.debug('SessionTracking skipped: %s', exc)

        return response