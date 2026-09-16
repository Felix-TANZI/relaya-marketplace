# backend/apps/whatsapp_assistant/message_templates.py
# Modèles de message soumis à Meta (catégorie « Utilitaire »). WhatsApp
# n'autorise que des modèles validés pour écrire le premier : c'est le cas du
# message au livreur. Soumission et suivi : python manage.py whatsapp_templates.
#
# Règles Meta respectées : le texte ne commence ni ne finit par une variable,
# boutons de 25 caractères au plus, sans émoji ; l'URL du bouton est fixe.

MISSION = "belivay_nouvelle_mission"
TOUR_RECAP = "belivay_recap_tournee"
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
}


def definitions(app_url: str) -> list[dict]:
    """Modèles au format de l'API Meta (POST /<WABA_ID>/message_templates)."""
    payloads = []
    for name, languages in TEMPLATES.items():
        for language, spec in languages.items():
            buttons = [{"type": "QUICK_REPLY", "text": text} for text in spec["quick_replies"]]
            buttons.append({"type": "URL", "text": spec["url_button"], "url": app_url})
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
