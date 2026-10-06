# backend/apps/client_core/schema.py
# Le contrat des routes du kit est backend-kit/openapi.yaml (généré depuis les types du site), pas le schéma que
# drf-spectacular déduit des vues : ces vues n'ont pas de sérialiseur de réponse et produiraient des erreurs
# « unable to guess serializer ». Ce crochet les retire de /api/schema/ ; à déclarer dans relaya :
#
#     SPECTACULAR_SETTINGS["PREPROCESSING_HOOKS"] = ["apps.client_core.schema.sans_routes_du_kit"]
#
# et servir openapi.yaml à côté (fichier statique, ou Swagger UI pointé dessus). Voir REPRISE-BACKEND.md.

APPS_DU_KIT = (
    "apps.client_core.",
    "apps.otp.",
    "apps.client_accounts.",
    "apps.notifications_client.",
    "apps.cart.",
    "apps.pickup.",
    "apps.aftersales.",
    "apps.messaging.",
    "apps.wallet.",
    "apps.subscriptions.",
    "apps.wishlists.",
    "apps.diaspora.",
    "apps.extras.",
)


def sans_routes_du_kit(endpoints, **kwargs):
    def du_kit(callback) -> bool:
        classe = getattr(callback, "cls", None) or getattr(callback, "view_class", None)
        return bool(classe) and classe.__module__.startswith(APPS_DU_KIT)

    return [e for e in endpoints if not du_kit(e[3])]
