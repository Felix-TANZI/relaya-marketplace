# backend/apps/core/middleware.py
# MIDDLEWARE : UserActivityMiddleware
# Ajouter dans MIDDLEWARE après AuthenticationMiddleware :
#   'apps.core.middleware.UserActivityMiddleware',
#
# Géolocalisation par IP — aucune permission utilisateur requise.
# Utilise ip-api.com (gratuit, sans clé API, max 45 req/min).
# En production : mettre en cache les résultats IP pour éviter les limites.

import json
import urllib.request
from django.core.cache import cache
from django.utils import timezone

ACTIVE_USERS_KEY = 'belivay_active_users'
USER_KEY_PREFIX  = 'belivay_user_'
GEO_IP_PREFIX    = 'belivay_geoip_'   # Cache résultats IP (TTL 24h)
TTL              = 300                 # 5 min — durée de session active

PAGE_MAP = [
    ('/api/vendors/admin/dashboard',  'Admin · Dashboard'),
    ('/api/vendors/admin/customers',  'Admin · Clients'),
    ('/api/vendors/admin/vendors',    'Admin · Vendeurs'),
    ('/api/vendors/admin/orders',     'Admin · Commandes'),
    ('/api/vendors/admin/disputes',   'Admin · Litiges'),
    ('/api/vendors/admin/products',   'Admin · Catalogue'),
    ('/api/vendors/admin/live',       'Admin · Live'),
    ('/api/vendors/admin/',           'Admin'),
    ('/api/vendors/orders',           'Espace vendeur · Commandes'),
    ('/api/vendors/products',         'Espace vendeur · Produits'),
    ('/api/vendors/payments',         'Espace vendeur · Paiements'),
    ('/api/vendors/disputes',         'Espace vendeur · Litiges'),
    ('/api/vendors/shop',             'Espace vendeur · Boutique'),
    ('/api/vendors/certifications',   'Espace vendeur · Certifications'),
    ('/api/vendors/',                 'Espace vendeur'),
    ('/api/catalog/products',         'Catalogue'),
    ('/api/catalog/categories',       'Catalogue · Catégories'),
    ('/api/catalog/',                 'Catalogue'),
    ('/api/orders/',                  'Mes commandes'),
    ('/api/cart/',                    'Panier'),
    ('/api/checkout/',                'Paiement'),
    ('/api/auth/login',               'Connexion'),
    ('/api/auth/register',            'Inscription'),
    ('/api/auth/',                    'Authentification'),
    ('/api/user/profile',             'Mon profil'),
    ('/api/notifications/',           'Notifications'),
    ('/api/',                         'Accueil'),
]


def api_path_to_page(path: str) -> str:
    for prefix, label in PAGE_MAP:
        if path.startswith(prefix):
            return label
    return 'Application'


def get_client_ip(request) -> str:
    """Récupère l'IP réelle du client (derrière nginx/proxy)."""
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        # X-Forwarded-For: client, proxy1, proxy2 — on veut le premier
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def geolocate_ip(ip: str) -> dict:
    """
    Géolocalise une IP via ip-api.com.
    Résultat mis en cache 24h pour éviter les requêtes répétées.
    Retourne {} si l'IP est privée/locale ou si le service est indisponible.
    """
    # IPs locales/privées → pas de géolocalisation
    if not ip or ip in ('127.0.0.1', '::1') or ip.startswith('192.168.') or ip.startswith('10.'):
        return {}

    cache_key = f'{GEO_IP_PREFIX}{ip.replace(".", "_")}'
    cached    = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        url = f'http://ip-api.com/json/{ip}?fields=status,lat,lon,city,regionName,country,query'
        req = urllib.request.Request(url, headers={'User-Agent': 'BelivaY/1.0'})
        with urllib.request.urlopen(req, timeout=2) as resp:
            data = json.loads(resp.read().decode())

        if data.get('status') == 'success':
            result = {
                'lat':    data.get('lat'),
                'lng':    data.get('lon'),
                'city':   data.get('city'),
                'region': data.get('regionName'),
            }
        else:
            result = {}

        # Mettre en cache 24h
        cache.set(cache_key, result, 86400)
        return result

    except Exception:
        # Service indisponible → silencieux
        cache.set(cache_key, {}, 300)  # Retry dans 5 min
        return {}


class UserActivityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        path = request.path
        if (path.startswith('/static/')
                or path.startswith('/media/')
                or path.startswith('/django-admin/')):
            return response
        if request.user.is_authenticated:
            try:
                self._record(request)
            except Exception:
                pass
        return response

    def _record(self, request):
        user = request.user
        path = request.path

        is_admin  = user.is_staff or user.is_superuser
        is_vendor = hasattr(user, 'vendor_profile')
        role = 'admin' if is_admin else ('vendor' if is_vendor else 'buyer')

        # ── Géolocalisation par IP (sans permission) ──────────────────────────
        ip     = get_client_ip(request)
        geo    = geolocate_ip(ip)
        lat    = geo.get('lat')
        lng    = geo.get('lng')
        ip_city= geo.get('city')

        # Ville depuis le profil en priorité (plus fiable), IP en fallback
        city = None
        if is_vendor:
            try:
                city = user.vendor_profile.city
            except Exception:
                pass
        if not city:
            try:
                if hasattr(user, 'profile') and getattr(user.profile, 'city', None):
                    city = user.profile.city
            except Exception:
                pass
        if not city:
            city = ip_city  # Fallback : ville depuis l'IP

        # ── Device ────────────────────────────────────────────────────────────
        ua = request.META.get('HTTP_USER_AGENT', '').lower()
        if any(x in ua for x in ('mobile', 'android', 'iphone')):
            device = 'mobile'
        elif any(x in ua for x in ('tablet', 'ipad')):
            device = 'tablet'
        else:
            device = 'desktop'

        page = api_path_to_page(path)

        data = {
            'user_id':   user.id,
            'username':  user.username,
            'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'role':      role,
            'city':      city,
            'lat':       lat,      # coordonnées issues de l'IP
            'lng':       lng,
            'accuracy':  5000,     # précision approximative IP (~5km)
            'has_gps':   lat is not None and lng is not None,
            'ip':        ip,
            'page':      page,
            'api_path':  path,
            'device':    device,
            'last_seen': timezone.now().isoformat(),
        }

        cache.set(f'{USER_KEY_PREFIX}{user.id}', json.dumps(data), TTL)

        active_ids = cache.get(ACTIVE_USERS_KEY, [])
        if isinstance(active_ids, str):
            try:
                active_ids = json.loads(active_ids)
            except Exception:
                active_ids = []
        if user.id not in active_ids:
            active_ids.append(user.id)
        cache.set(ACTIVE_USERS_KEY, active_ids, TTL + 60)