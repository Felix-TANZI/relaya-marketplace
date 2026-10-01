# backend/apps/whatsapp_assistant/management/commands/whatsapp_status.py
# Photographie de l'assistant : ce qui est configuré chez nous, ce que Meta
# en dit, et ce qu'il reste à faire pour ouvrir au public.
#
#   python manage.py whatsapp_status

import requests
from django.core.management.base import BaseCommand

from apps.whatsapp_assistant.conf import get_config
from apps.whatsapp_assistant.message_templates import definitions

GRAPH = "https://graph.facebook.com"
TIMEOUT = 20


class Command(BaseCommand):
    help = "Affiche l'état de l'assistant WhatsApp : configuration, compte Meta, modèles."

    def handle(self, *args, **options):
        config = get_config()
        self._configuration(config)

        if not config.access_token:
            self.stdout.write(self.style.ERROR(
                "\nSans WHATSAPP_ACCESS_TOKEN, impossible d'interroger Meta."
            ))
            return

        self._jeton(config)
        self._numero(config)
        self._compte(config)
        self._modeles(config)
        self._verdict(config)

    # ── Chez nous ──────────────────────────────────────────────────────────

    def _configuration(self, config):
        self.stdout.write(self.style.MIGRATE_HEADING("Configuration locale"))
        lignes = [
            ("Assistant actif", "oui" if config.enabled else "NON — le webhook répond 404"),
            ("Nom affiché", config.assistant_name),
            ("Jeton d'accès", self._present(config.access_token)),
            ("Clé secrète de l'app", self._present(config.app_secret)),
            ("Jeton de vérification", self._present(config.verify_token)),
            ("Identifiant du numéro", self._present(config.phone_number_id)),
            ("Identifiant du compte", self._present(config.business_account_id)),
            ("Source du catalogue", config.catalog_source),
            ("Site des liens", config.site_url),
        ]
        for nom, valeur in lignes:
            self.stdout.write(f"  {nom:<24} {valeur}")

        envois = [
            ("clients", config.customer_notifications),
            ("vendeurs", config.vendor_notifications),
            ("livreurs", config.courier_notifications),
            ("points relais", config.relay_notifications),
        ]
        actifs = ", ".join(nom for nom, actif in envois if actif) or "aucun"
        self.stdout.write(f"  {'Envois automatiques':<24} {actifs}")

        deroutes = [
            (nom, valeur) for nom, valeur in (
                ("clients", config.customer_notify_override),
                ("vendeurs", config.vendor_notify_override),
                ("livreurs", config.courier_notify_override),
                ("points relais", config.relay_notify_override),
            ) if valeur
        ]
        for nom, valeur in deroutes:
            self.stdout.write(self.style.WARNING(
                f"  ⚠ Messages {nom} déroutés vers +{valeur} — à vider avant la production."
            ))

    # ── Chez Meta ──────────────────────────────────────────────────────────

    def _jeton(self, config):
        self.stdout.write(self.style.MIGRATE_HEADING("\nJeton d'accès"))
        data = self._appel("debug_token", params={
            "input_token": config.access_token, "access_token": config.access_token,
        }, racine=True).get("data", {})
        if not data:
            self.stdout.write(self.style.ERROR("  Meta n'a pas reconnu ce jeton."))
            return
        expire = data.get("expires_at")
        self.stdout.write(f"  {'Type':<24} {data.get('type', '?')}")
        self.stdout.write(f"  {'Valide':<24} {'oui' if data.get('is_valid') else 'NON'}")
        if expire in (0, None):
            self.stdout.write(f"  {'Expiration':<24} jamais")
        else:
            from datetime import datetime

            self.stdout.write(self.style.WARNING(
                f"  {'Expiration':<24} {datetime.fromtimestamp(expire)} — "
                "un jeton d'utilisateur système est nécessaire en production."
            ))

    def _numero(self, config):
        self.stdout.write(self.style.MIGRATE_HEADING("\nNuméro"))
        if not config.phone_number_id:
            self.stdout.write(self.style.ERROR("  Aucun identifiant de numéro configuré."))
            return
        numero = self._appel(config.phone_number_id, params={
            "fields": "display_phone_number,verified_name,quality_rating,"
                      "code_verification_status,platform_type,status",
        })
        if "error" in numero:
            self.stdout.write(self.style.ERROR(f"  {numero['error'].get('message', '')[:90]}"))
            return
        affiche = numero.get("display_phone_number", "?")
        nom = numero.get("verified_name", "?")
        self.stdout.write(f"  {'Numéro':<24} {affiche}")
        self.stdout.write(f"  {'Nom vérifié':<24} {nom}")
        self.stdout.write(f"  {'Qualité':<24} {numero.get('quality_rating', '?')}")
        self.stdout.write(f"  {'État':<24} {numero.get('status', '?')}")
        if nom.lower() == "test number" or affiche.startswith("+1 555"):
            self.stdout.write(self.style.WARNING(
                "  ⚠ C'est le numéro d'essai de Meta : il n'écrit qu'à 5 destinataires\n"
                "    déclarés, et ne porte pas l'identité de BelivaY."
            ))

    def _compte(self, config):
        self.stdout.write(self.style.MIGRATE_HEADING("\nCompte WhatsApp Business"))
        if not config.business_account_id:
            self.stdout.write(self.style.ERROR(
                "  Aucun identifiant de compte : les modèles sont impossibles à gérer."
            ))
            return
        compte = self._appel(config.business_account_id, params={
            "fields": "id,name,account_review_status,business_verification_status",
        })
        if "error" in compte:
            self.stdout.write(self.style.ERROR(f"  {compte['error'].get('message', '')[:90]}"))
            return
        self.stdout.write(f"  {'Nom':<24} {compte.get('name', '?')}")
        self.stdout.write(f"  {'Examen du compte':<24} {compte.get('account_review_status', '?')}")

        verification = compte.get("business_verification_status", "?")
        style = self.style.SUCCESS if verification == "verified" else self.style.WARNING
        self.stdout.write(style(f"  {'Entreprise vérifiée':<24} {verification}"))

        proprietaire = self._appel(config.business_account_id,
                                   params={"fields": "owner_business_info"}).get("owner_business_info")
        if proprietaire:
            self.stdout.write(f"  {'Portefeuille':<24} {proprietaire.get('name')} "
                              f"({proprietaire.get('id')})")
            if verification != "verified":
                self.stdout.write(
                    "\n  Lancer la vérification :\n"
                    f"    https://business.facebook.com/settings/security"
                    f"?business_id={proprietaire.get('id')}"
                )

    def _modeles(self, config):
        self.stdout.write(self.style.MIGRATE_HEADING("\nModèles de message"))
        if not config.business_account_id:
            return
        reponse = self._appel(f"{config.business_account_id}/message_templates", params={
            "fields": "name,language,status,rejected_reason", "limit": 100,
        })
        connus = {(m.get("name"), m.get("language")): m for m in reponse.get("data", [])}
        attendus = definitions(config.courier_app_url, config.vendor_app_url,
                               config.relay_app_url, config.site_url)
        approuves = 0
        for modele in attendus:
            cle = (modele["name"], modele["language"])
            actuel = connus.get(cle)
            etat = actuel.get("status", "?") if actuel else "ABSENT"
            approuves += etat == "APPROVED"
            marque = {"APPROVED": "OK", "PENDING": "..", "REJECTED": "KO"}.get(etat, "  ")
            self.stdout.write(f"  [{marque}] {cle[0]} ({cle[1]}) : {etat}")
            motif = (actuel or {}).get("rejected_reason")
            if motif and motif != "NONE":
                self.stdout.write(self.style.WARNING(f"        motif : {motif}"))
        self.stdout.write(f"\n  {approuves} approuvé(s) sur {len(attendus)}")

    # ── Verdict ────────────────────────────────────────────────────────────

    def _verdict(self, config):
        self.stdout.write(self.style.MIGRATE_HEADING("\nCe qu'il reste à faire"))
        restant = []
        if not config.enabled:
            restant.append("Mettre WHATSAPP_ASSISTANT_ENABLED à 1.")
        if not config.business_account_id:
            restant.append("Renseigner WHATSAPP_BUSINESS_ACCOUNT_ID.")
        for nom, valeur in (("clients", config.customer_notify_override),
                            ("vendeurs", config.vendor_notify_override),
                            ("livreurs", config.courier_notify_override),
                            ("points relais", config.relay_notify_override)):
            if valeur:
                restant.append(f"Vider le déroutage des messages {nom}.")

        if restant:
            for ligne in restant:
                self.stdout.write(f"  • {ligne}")
        else:
            self.stdout.write("  Rien du côté de la configuration locale.")
        self.stdout.write(
            "\n  La marche à suivre complète : "
            "backend/apps/whatsapp_assistant/DEPLOIEMENT.md"
        )

    # ── Outils ─────────────────────────────────────────────────────────────

    def _appel(self, chemin, params=None, racine=False) -> dict:
        config = get_config()
        base = GRAPH if racine else f"{GRAPH}/{config.graph_api_version}"
        try:
            reponse = requests.get(
                f"{base}/{chemin}",
                headers={"Authorization": f"Bearer {config.access_token}"},
                params=params or {}, timeout=TIMEOUT,
            )
            return reponse.json()
        except requests.RequestException as erreur:
            return {"error": {"message": f"Meta injoignable : {erreur}"}}

    @staticmethod
    def _present(valeur: str) -> str:
        return f"renseigné ({len(valeur)} caractères)" if valeur else "MANQUANT"
