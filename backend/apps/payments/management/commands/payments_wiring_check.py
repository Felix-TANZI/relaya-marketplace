# backend/apps/payments/management/commands/payments_wiring_check.py
# Verifie que le module financier est correctement BRANCHE a l'application.
#
#   python manage.py payments_wiring_check
#
# Repond a une question que les tests ne posent pas : le code est correct,
# mais est-il APPELE ? Un module parfaitement teste et jamais invoque ne
# protege rien.

import inspect

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Verifie le branchement du module financier a l'application."

    def handle(self, *args, **options):
        controles = [
            self._checkout,
            self._confirmation,
            self._annulation,
            self._litige,
            self._livraison,
            self._transporteur,
            self._routes_api,
            self._webhook,
            self._resolution_partenaires,
            self._donnees,
        ]
        resultats = [controle() for controle in controles]

        self.stdout.write("")
        manquants = [r for r in resultats if r[0] == "KO"]
        if manquants:
            self.stdout.write(self.style.ERROR(
                f"{len(manquants)} branchement(s) manquant(s).\n"
                "Le module financier ne sera pas sollicite tant qu'ils ne "
                "sont pas en place — voir PATCHES-APPLICATION.md."
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                "Tous les branchements sont en place."
            ))

    # ── Utilitaires ──────────────────────────────────────────────────────────

    def _dire(self, etat: str, libelle: str, detail: str = ""):
        style = {
            "OK": self.style.SUCCESS,
            "KO": self.style.ERROR,
            "--": self.style.WARNING,
        }[etat]
        self.stdout.write(style(f"  [{etat}] {libelle}"))
        if detail:
            self.stdout.write(f"       {detail}")
        return (etat, libelle)

    @staticmethod
    def _source(objet) -> str:
        try:
            return inspect.getsource(objet)
        except (OSError, TypeError):
            return ""

    # ── Controles ────────────────────────────────────────────────────────────

    def _checkout(self):
        try:
            from apps.orders.views import OrderCreateView
        except ImportError:
            return self._dire("--", "OrderCreateView introuvable")

        source = self._source(OrderCreateView)
        if "bridge.checkout" in source or "_split_checkout" in source:
            return self._dire("OK", "Eclatement du panier branche au checkout")
        return self._dire(
            "KO", "Eclatement du panier NON branche",
            "Sans lui, un panier multi-vendeurs reste une seule commande et "
            "aucune intention n'est creee.",
        )

    def _confirmation(self):
        try:
            from apps.orders.views import ConfirmReceiptView
        except ImportError:
            return self._dire("--", "ConfirmReceiptView introuvable")

        source = self._source(ConfirmReceiptView)
        if "buyer_confirmed_receipt" in source:
            return self._dire("OK", "Confirmation de reception branchee")
        return self._dire(
            "KO", "Confirmation de reception NON branchee",
            "Le sequestre ne se liberera que par auto-confirmation, apres "
            "le delai complet.",
        )

    def _annulation(self):
        try:
            from apps.orders.views import CancelOrderView
        except ImportError:
            return self._dire("--", "CancelOrderView introuvable")

        source = self._source(CancelOrderView)
        if "order_cancelled" in source:
            return self._dire("OK", "Annulation de commande branchee")
        return self._dire(
            "KO", "Annulation de commande NON branchee",
            "Un sequestre restera actif sur une commande annulee.",
        )

    def _litige(self):
        try:
            from apps.orders import views as vues
        except ImportError:
            return self._dire("--", "apps.orders.views introuvable")

        source = self._source(vues)
        if "dispute_opened" in source:
            return self._dire("OK", "Ouverture de litige branchee")
        return self._dire(
            "KO", "Ouverture de litige NON branchee",
            "Un litige ne gelera pas le sequestre : le vendeur pourrait etre "
            "paye malgre la contestation.",
        )

    def _livraison(self):
        """
        Sans cet evenement, le sequestre TRANSPORT ne se libere JAMAIS : sa
        politique ne prevoit aucune auto-confirmation, contrairement a la
        marchandise.
        """
        try:
            from apps.shipping.models import Shipment  # noqa: F401
        except ImportError:
            return self._dire("--", "apps.shipping introuvable")

        from apps.payments.bridge import signals

        source = self._source(signals)
        if "delivery_proof_validated" in source:
            return self._dire(
                "OK", "Preuve de livraison branchee (signal)",
                "Le sequestre transport se libere a la livraison.")
        return self._dire(
            "KO", "Preuve de livraison NON branchee",
            "Le sequestre TRANSPORT ne se liberera jamais : aucune "
            "auto-confirmation n'existe pour ce composant.")

    def _transporteur(self):
        """
        Sans cet evenement, la part transport reste comptabilisee en
        PRODUIT alors qu'elle appartient au transporteur.
        """
        from apps.payments.bridge import signals

        source = self._source(signals)
        if "carrier_assigned" in source:
            return self._dire(
                "OK", "Assignation du transporteur branchee (signal)",
                "La part transport est reallouee a l'assignation.")
        return self._dire(
            "KO", "Assignation du transporteur NON branchee",
            "La part transport restera comptabilisee en produit : chiffre "
            "d'affaires surestime, dette envers le transporteur absente.")

    def _resolution_partenaires(self):
        """
        Chaque type de partenaire doit etre resoluble vers son compte
        financier. Un accesseur errone produit un None SILENCIEUX — c'est
        exactement le bug qui a touche `delivery_organization`.
        """
        from django.contrib.auth.models import User

        from apps.payments.bridge.actors import has_partner_profile

        problemes = []
        controles = [
            ("vendeur", "apps.vendors.models", "VendorProfile", "user"),
            ("entreprise de livraison", "apps.accounts.models",
             "DeliveryOrganizationProfile", "user"),
            ("point relais", "apps.accounts.models", "RelayPointProfile", "user"),
        ]

        for libelle, module, classe, champ in controles:
            try:
                mod = __import__(module, fromlist=[classe])
                modele = getattr(mod, classe)
            except (ImportError, AttributeError):
                continue

            profil = modele.objects.exclude(**{champ: None}).select_related(
                champ).first()
            if profil is None:
                continue

            utilisateur = getattr(profil, champ, None)
            if utilisateur is None:
                continue
            if not has_partner_profile(utilisateur):
                problemes.append(
                    f"{libelle} : {utilisateur.username} n'est pas reconnu")

        if problemes:
            return self._dire(
                "KO", "Resolution des partenaires INCOMPLETE",
                " · ".join(problemes) + "\n       Un accesseur errone "
                "produit un None silencieux, sans erreur.")
        return self._dire("OK", "Resolution des partenaires verifiee")

    def _routes_api(self):
        from django.urls import NoReverseMatch, reverse
        try:
            reverse("payments_api:partner-due")
            return self._dire("OK", "Routes de l'API financiere accessibles")
        except NoReverseMatch:
            return self._dire(
                "KO", "Routes de l'API financiere NON incluses",
                'Ajouter dans relaya/urls.py : path("api/payments/v2/", '
                'include("apps.payments.api.urls"))',
            )

    def _webhook(self):
        from django.urls import NoReverseMatch, reverse
        try:
            reverse("payments_webhooks:campay")
            return self._dire("OK", "Endpoint webhook accessible")
        except NoReverseMatch:
            return self._dire(
                "KO", "Endpoint webhook NON inclus",
                "Aucune notification de paiement ne sera recue.",
            )

    def _donnees(self):
        from apps.payments.bridge.intent_orders import PaymentIntentOrder
        from apps.payments.escrow.models import EscrowHold
        from apps.payments.intents.models import PaymentIntent

        intentions = PaymentIntent.objects.count()
        liens = PaymentIntentOrder.objects.count()
        sequestres = EscrowHold.objects.count()

        self.stdout.write("")
        self.stdout.write(self.style.HTTP_INFO("  Donnees observees"))
        self.stdout.write(f"       intentions de paiement : {intentions}")
        self.stdout.write(f"       commandes rattachees   : {liens}")
        self.stdout.write(f"       sequestres             : {sequestres}")

        if intentions == 0:
            self.stdout.write(
                "       Aucune intention : soit le branchement est absent, "
                "soit\n       aucun checkout n'a eu lieu depuis son "
                "installation."
            )
            return ("--", "Aucune donnee")

        from apps.payments.bridge.events_out import compare_all
        comparaison = compare_all()
        if comparaison["diverged"]:
            self.stdout.write(self.style.ERROR(
                f"       {comparaison['diverged']} commande(s) "
                "DESYNCHRONISEE(S) — le sequestre fait foi."
            ))
            return ("KO", "Divergences detectees")

        self.stdout.write(self.style.SUCCESS(
            f"       {comparaison['checked']} commande(s) verifiee(s), "
            "aucune divergence."
        ))
        return ("OK", "Donnees coherentes")