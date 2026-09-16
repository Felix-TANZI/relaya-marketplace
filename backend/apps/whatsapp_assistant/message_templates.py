# backend/apps/whatsapp_assistant/message_templates.py
# Modèles de message soumis à Meta (catégorie « Utilitaire »). WhatsApp
# n'autorise que des modèles validés pour écrire le premier : c'est le cas du
# message au livreur. Soumission et suivi : python manage.py whatsapp_templates.
#
# Règles Meta respectées : le texte ne commence ni ne finit par une variable,
# boutons de 25 caractères au plus, sans émoji ; l'URL du bouton est fixe.

MISSION = "belivay_nouvelle_mission"
TOUR_RECAP = "belivay_recap_tournee"
NEW_ORDER = "belivay_nouvelle_commande"
RELAY_PARCEL = "belivay_colis_relais"
ORDER_UPDATE = "belivay_suivi_commande"
LANGUAGES = ("fr", "en")

TEMPLATES = {
    # {{1}} colis BVY-… · {{2}} ramassage · {{3}} livraison
    # Boutons de réponse rapide : 0 = accepter, 1 = voir les adresses.
    MISSION: {
        "fr": {
            "body": (
                "🚚 *Nouvelle mission BelivaY*\n\n"
                "Colis *{{1}}*\n"
                "📦 Ramassage : {{2}}\n"
                "🏁 Livraison : {{3}}\n\n"
                "Acceptez-la ici ou dans l'application livreur. "
                "Touchez « Voir les adresses » pour l'itinéraire détaillé."
            ),
            "example": ["BVY-1024-2048", "Boutique Mama Ngo · Douala", "Bastos, Yaoundé"],
            "footer": "BelivaY · Livraison",
            "quick_replies": ["Accepter la mission", "Voir les adresses"],
            "url_button": "Ouvrir l'application",
        },
        "en": {
            "body": (
                "🚚 *New BelivaY delivery job*\n\n"
                "Parcel *{{1}}*\n"
                "📦 Pickup: {{2}}\n"
                "🏁 Drop-off: {{3}}\n\n"
                "Accept it here or in the courier app. "
                "Tap « See addresses » for the detailed route."
            ),
            "example": ["BVY-1024-2048", "Mama Ngo Shop · Douala", "Bastos, Yaoundé"],
            "footer": "BelivaY · Delivery",
            "quick_replies": ["Accept the job", "See addresses"],
            "url_button": "Open the app",
        },
    },
    # {{1}} tournée · {{2}} nombre de colis · {{3}} arrêts dans l'ordre
    # Bouton de réponse rapide : 0 = voir les arrêts.
    TOUR_RECAP: {
        "fr": {
            "body": (
                "🗺️ *Votre tournée BelivaY*\n\n"
                "{{1}} · *{{2}} colis*\n"
                "Arrêts : {{3}}\n\n"
                "Touchez « Voir les arrêts » pour les adresses dans l'ordre de passage."
            ),
            "example": ["Tournée Bastos, 16/09 matin", "3", "1. Boutique Mama Ngo › 2. Tech Store › 3. Relais Bastos"],
            "footer": "BelivaY · Livraison",
            "quick_replies": ["Voir les arrêts"],
            "url_button": "Ouvrir l'application",
        },
        "en": {
            "body": (
                "🗺️ *Your BelivaY round*\n\n"
                "{{1}} · *{{2}} parcels*\n"
                "Stops: {{3}}\n\n"
                "Tap « See the stops » for the addresses in route order."
            ),
            "example": ["Bastos round, 16/09 morning", "3", "1. Mama Ngo Shop › 2. Tech Store › 3. Bastos relay"],
            "footer": "BelivaY · Delivery",
            "quick_replies": ["See the stops"],
            "url_button": "Open the app",
        },
    },
    # {{1}} commande BVY-… · {{2}} articles à préparer · {{3}} délai
    # Boutons de réponse rapide : 0 = je confirme, 1 = voir la commande.
    NEW_ORDER: {
        "fr": {
            "body": (
                "🏪 *Nouvelle commande BelivaY*\n\n"
                "Commande *{{1}}*\n"
                "📦 À préparer : {{2}}\n"
                "🕓 Avant le : {{3}}\n\n"
                "Confirmez ici ou dans votre espace vendeur. "
                "Touchez « Voir la commande » pour le détail des articles."
            ),
            "example": ["BVY-1024", "2 articles", "17/09 vers 14h"],
            "footer": "BelivaY · Vendeur",
            "quick_replies": ["Je confirme", "Voir la commande"],
            "url_button": "Ouvrir mon espace",
        },
        "en": {
            "body": (
                "🏪 *New BelivaY order*\n\n"
                "Order *{{1}}*\n"
                "📦 To prepare: {{2}}\n"
                "🕓 Before: {{3}}\n\n"
                "Confirm here or in your seller space. "
                "Tap « See the order » for the item details."
            ),
            "example": ["BVY-1024", "2 items", "17/09 around 2pm"],
            "footer": "BelivaY · Seller",
            "quick_replies": ["I confirm", "See the order"],
            "url_button": "Open my space",
        },
    },
    # {{1}} colis BVY-… · {{2}} contenu · {{3}} nom du relais
    # Bouton de réponse rapide : 0 = voir le colis.
    RELAY_PARCEL: {
        "fr": {
            "body": (
                "🏪 *Un colis arrive chez vous*\n\n"
                "Colis *{{1}}*\n"
                "📦 Contenu : {{2}}\n"
                "📍 Destination : {{3}}\n\n"
                "Le livreur vient de le récupérer chez le vendeur. "
                "Touchez « Voir le colis » pour le réceptionner à son arrivée."
            ),
            "example": ["BVY-1024-2048", "2 articles", "Relais Bastos"],
            "footer": "BelivaY · Point relais",
            "quick_replies": ["Voir le colis"],
            "url_button": "Ouvrir mon espace",
        },
        "en": {
            "body": (
                "🏪 *A parcel is heading your way*\n\n"
                "Parcel *{{1}}*\n"
                "📦 Contents: {{2}}\n"
                "📍 Destination: {{3}}\n\n"
                "The courier has just collected it from the seller. "
                "Tap « See the parcel » to receive it on arrival."
            ),
            "example": ["BVY-1024-2048", "2 items", "Bastos relay"],
            "footer": "BelivaY · Relay point",
            "quick_replies": ["See the parcel"],
            "url_button": "Open my space",
        },
    },
    # {{1}} colis BVY-… · {{2}} etape en clair · {{3}} destination ou creneau
    # Bouton de réponse rapide : 0 = suivre ma commande.
    ORDER_UPDATE: {
        "fr": {
            "body": (
                "📦 *Votre commande BelivaY*\n\n"
                "Colis *{{1}}*\n"
                "🚚 {{2}}\n"
                "📍 {{3}}\n\n"
                "Touchez « Suivre ma commande » pour le détail, "
                "ou écrivez *ma commande* à tout moment."
            ),
            "example": ["BVY-1024-2048", "Parti de chez le vendeur", "Bastos, Yaoundé"],
            "footer": "BelivaY · Suivi de commande",
            "quick_replies": ["Suivre ma commande"],
            "url_button": "Ouvrir l'application",
        },
        "en": {
            "body": (
                "📦 *Your BelivaY order*\n\n"
                "Parcel *{{1}}*\n"
                "🚚 {{2}}\n"
                "📍 {{3}}\n\n"
                "Tap « Track my order » for the details, "
                "or type *my order* at any time."
            ),
            "example": ["BVY-1024-2048", "Left the seller", "Bastos, Yaoundé"],
            "footer": "BelivaY · Order tracking",
            "quick_replies": ["Track my order"],
            "url_button": "Open the app",
        },
    },
}


def definitions(app_url: str, vendor_url: str = "", relay_url: str = "",
                site_url: str = "") -> list[dict]:
    """Modèles au format de l'API Meta (POST /<WABA_ID>/message_templates)."""
    payloads = []
    for name, languages in TEMPLATES.items():
        # Le livreur va vers son application, le vendeur vers son espace.
        if name == NEW_ORDER:
            destination = vendor_url or app_url
        elif name == RELAY_PARCEL:
            destination = relay_url or app_url
        elif name == ORDER_UPDATE:
            destination = site_url or app_url
        else:
            destination = app_url
        for language, spec in languages.items():
            buttons = [{"type": "QUICK_REPLY", "text": text} for text in spec["quick_replies"]]
            buttons.append({"type": "URL", "text": spec["url_button"], "url": destination})
            payloads.append({
                "name": name,
                "language": language,
                "category": "UTILITY",
                "components": [
                    {"type": "BODY", "text": spec["body"], "example": {"body_text": [spec["example"]]}},
                    {"type": "FOOTER", "text": spec["footer"]},
                    {"type": "BUTTONS", "buttons": buttons},
                ],
            })
    return payloads
