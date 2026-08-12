# backend/apps/payments/management/commands/payments_live_test.py
# Test de paiement REEL, avec de l'argent qui bouge vraiment.
#
#   python manage.py payments_live_test --start --msisdn 237XXXXXXXXX
#   python manage.py payments_live_test --check BLV-PAY-2026-0000001
#   python manage.py payments_live_test --cleanup BLV-PAY-2026-0000001
#
# ─────────────────────────────────────────────────────────────────────────────
# POURQUOI UNE COMMANDE SEPAREE DE payments_smoke_test
#
# Deux raisons, chacune suffisante.
#
#   1. L'EPREUVE DE FUMEE ANNULE SA TRANSACTION. Avec un prestataire reel,
#      la demande partirait vraiment mais aucune trace n'existerait en base :
#      de l'argent encaisse sans contrepartie comptable.
#
#   2. UN PAIEMENT REEL EXIGE UNE ACTION HUMAINE. L'acheteur doit composer
#      son code sur son telephone. Interroger le prestataire trois fois en
#      deux secondes ne donnerait que PENDING.
#
# D'ou le decoupage en trois etapes : on emet, l'humain compose son code,
# on verifie. Les donnees sont CONSERVEES entre les etapes — c'est tout
# l'interet.
# ─────────────────────────────────────────────────────────────────────────────
#
# CE QUE CETTE COMMANDE NE FAIT PAS
#   Elle ne teste PAS le webhook. En bac a sable, CamPay notifie l'URL
#   configuree — si ton serveur n'est pas joignable depuis Internet, aucun
#   webhook n'arrivera. Ce n'est pas grave : le prestataire fait foi
#   (principe P6), et `--check` l'interroge directement.

import sys
import uuid
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction


class LiveTestError(Exception):
    """Une etape a echoue."""


class Command(BaseCommand):
    help = "Test de paiement REEL aupres du prestataire actif."

    def add_arguments(self, parser):
        parser.add_argument("--start", action="store_true",
                            help="Cree la commande et emet la demande.")
        parser.add_argument("--check", type=str, default="",
                            metavar="REFERENCE",
                            help="Interroge le prestataire sur une intention.")
        parser.add_argument("--cleanup", type=str, default="",
                            metavar="REFERENCE",
                            help="Supprime les donnees de test creees.")
        parser.add_argument("--msisdn", type=str, default="",
                            help="Numero qui PAIE. De l'argent en partira.")
        parser.add_argument("--operator", type=str, default="MTN",
                            choices=["MTN", "ORANGE"])
        parser.add_argument("--amount", type=int, default=100,
                            help="Montant en FCFA. Garder petit.")
        parser.add_argument("--yes", action="store_true",
                            help="Passe la demande de confirmation.")

    def handle(self, *args, **options):
        try:
            if options["start"]:
                self._demarrer(options)
            elif options["check"]:
                self._verifier(options["check"])
            elif options["cleanup"]:
                self._nettoyer(options["cleanup"])
            else:
                self.stdout.write(self.style.ERROR(
                    "Choisir --start, --check ou --cleanup.\n\n"
                    "  1. python manage.py payments_live_test --start "
                    "--msisdn 237XXXXXXXXX\n"
                    "  2. composer le code sur le telephone\n"
                    "  3. python manage.py payments_live_test --check "
                    "BLV-PAY-...\n"
                    "  4. python manage.py payments_live_test --cleanup "
                    "BLV-PAY-..."
                ))
                sys.exit(1)
        except LiveTestError as exc:
            self.stdout.write(self.style.ERROR(f"\n  [KO] {exc}"))
            sys.exit(1)

    # ── Affichage ────────────────────────────────────────────────────────────

    def _ok(self, libelle, detail=""):
        self.stdout.write(self.style.SUCCESS(f"  [OK] {libelle}"))
        if detail:
            self.stdout.write(f"       {detail}")

    # ── ETAPE 1 : emettre ────────────────────────────────────────────────────

    def _demarrer(self, options):
        numero = (options["msisdn"] or "").strip()
        if not numero:
            raise LiveTestError(
                "--msisdn est obligatoire. C'est le numero qui PAIERA.")
        if not numero.startswith("237") or len(numero) != 12:
            raise LiveTestError(
                f"Numero invalide : {numero}. Format attendu : "
                "237 suivi de 9 chiffres.")

        montant = options["amount"]
        prestataire = self._prestataire_actif()

        # Le bac a sable CamPay plafonne a 25 FCFA. La ProviderConfig, elle,
        # impose souvent un minimum de 100 : les deux contraintes s'excluent,
        # et l'erreur ne se lit que dans la reponse brute. On le dit avant.
        if "SANDBOX" in prestataire and montant > 25:
            self.stdout.write(self.style.WARNING(
                f"\n  ATTENTION : le bac a sable CamPay plafonne a 25 FCFA.\n"
                f"  Le montant demande ({montant} FCFA) sera refuse par ER201.\n"
                f"  Utiliser --amount 25 ou moins, et verifier que\n"
                f"  ProviderConfig.min_amount_xaf le permet."))

        self.stdout.write(self.style.WARNING(
            "\n╔══════════════════════════════════════════════════════════╗\n"
            "║  PAIEMENT REEL — DE L'ARGENT VA REELLEMENT BOUGER       ║\n"
            "╚══════════════════════════════════════════════════════════╝\n"))
        self.stdout.write(f"  Prestataire : {prestataire}")
        self.stdout.write(f"  Numero      : {numero} ({options['operator']})")
        self.stdout.write(f"  Montant     : {montant} FCFA")
        self.stdout.write(
            "\n  Les donnees creees sont CONSERVEES : commande, intention,\n"
            "  sequestres et ecritures comptables resteront en base.\n")

        if not options["yes"]:
            reponse = input("  Confirmer ? (tapez OUI) : ").strip()
            if reponse != "OUI":
                self.stdout.write("  Annule.")
                return

        with transaction.atomic():
            contexte = self._preparer(numero, options["operator"], montant)

        self.stdout.write(self.style.HTTP_INFO("\n── Emission ──"))
        from apps.payments.application.collect import CollectError, initiate_collect

        try:
            issue = initiate_collect(contexte["intent"])
        except CollectError as exc:
            raise LiveTestError(f"Emission refusee : {exc}")

        # ─────────────────────────────────────────────────────────────────
        # UN ECHEC EST UN ECHEC
        #
        # Ma premiere version affichait « [OK] Demande emise : FAILED » puis
        # invitait a composer son code. Un message d'echec presente comme un
        # succes fait perdre du temps a chercher au mauvais endroit.
        # ─────────────────────────────────────────────────────────────────
        tentative = issue.attempt
        if issue.status in ("FAILED", "REJECTED") or (
                tentative and tentative.status == "FAILED"):
            self.stdout.write(self.style.ERROR(
                f"\n  [KO] Demande REFUSEE par le prestataire : "
                f"{issue.status}"))
            if tentative:
                if tentative.error_code:
                    self.stdout.write(
                        f"       code       : {tentative.error_code}")
                if tentative.error_message:
                    self.stdout.write(
                        f"       message    : {tentative.error_message}")
                if tentative.response_payload:
                    self.stdout.write(
                        f"       reponse    : {tentative.response_payload}")

            self.stdout.write(self.style.WARNING(
                f"\n  Aucun argent n'a bouge. L'intention "
                f"{contexte['intent'].reference} reste\n"
                "  consultable dans l'administration.\n\n"
                "  Pour effacer les donnees de test :\n"
                f"     python manage.py payments_live_test --cleanup "
                f"{contexte['intent'].reference}"))
            sys.exit(1)

        self._ok(f"Demande emise : {issue.status}", issue.message)
        if tentative and tentative.provider_reference:
            self._ok("Reference prestataire", tentative.provider_reference)

        reference = contexte["intent"].reference
        self.stdout.write(self.style.SUCCESS(
            f"\n  Intention : {reference}\n"))
        self.stdout.write(
            "  ── A FAIRE MAINTENANT ──\n"
            f"  1. Composez votre code secret sur le {numero}\n"
            "  2. Puis lancez :\n\n"
            f"     python manage.py payments_live_test --check {reference}\n\n"
            "  Sans confirmation de votre part, la transaction restera en\n"
            "  attente. CamPay n'emet AUCUN webhook pour une transaction\n"
            "  bloquee en PENDING : seule l'interrogation la detecte.")

    def _prestataire_actif(self) -> str:
        from apps.payments.config.models import ProviderConfig

        config = ProviderConfig.current().filter(
            is_enabled=True).order_by("-priority").first()
        if config is None:
            raise LiveTestError(
                "Aucun prestataire actif. Lancer seed_financial_config.")
        if config.provider_code == "MOCK":
            raise LiveTestError(
                "Le prestataire actif est MOCK : aucun paiement reel ne sera "
                "emis.\n"
                "       Activer CamPay dans l'administration, ou utiliser "
                "payments_smoke_test\n"
                "       pour un test sans argent.")
        return f"{config.provider_code} ({config.mode})"

    def _preparer(self, numero: str, operateur: str, montant: int) -> dict:
        from django.contrib.auth.models import User

        from apps.catalog.models import Category, Product
        from apps.orders.models import Order, OrderItem
        from apps.payments.bridge.checkout import checkout
        from apps.vendors.models import VendorProfile

        self.stdout.write(self.style.HTTP_INFO("\n── Preparation ──"))
        marque = uuid.uuid4().hex[:8]

        acheteur = User.objects.create_user(
            f"live-buyer-{marque}", f"buyer-{marque}@live.test", "x")
        vendeur = User.objects.create_user(
            f"live-vendor-{marque}", f"vendor-{marque}@live.test", "x")
        VendorProfile.objects.create(
            user=vendeur, business_name=f"Boutique Live {marque}")

        categorie = Category.objects.filter(is_active=True).first()
        if categorie is None:
            categorie = Category.objects.create(
                name=f"Live {marque}", slug=f"live-{marque}")

        article = Product.objects.create(
            title=f"Test paiement reel {marque}", price_xaf=montant,
            vendor=vendeur, category=categorie)

        commande = Order.objects.create(
            user=acheteur, customer_phone=numero,
            customer_email=f"buyer-{marque}@live.test",
            city="Douala", address="Test paiement reel",
            subtotal_xaf=montant, delivery_fee_xaf=0, total_xaf=montant,
            commission_rate_snapshot=Decimal("15.00"))
        OrderItem.objects.create(
            order=commande, product=article, title_snapshot=article.title,
            price_xaf_snapshot=montant, qty=1, line_total_xaf=montant)

        self._ok(f"Commande #{commande.pk} creee",
                 f"marque de test : {marque}")

        commandes, intent = checkout(
            commande, payer_msisdn=numero, payer_operator=operateur,
            idempotency_key=f"live-{marque}")
        self._ok(f"Intention {intent.reference}",
                 f"{intent.amount_xaf} FCFA")

        return {"intent": intent, "commandes": commandes, "marque": marque}

    # ── ETAPE 2 : verifier ───────────────────────────────────────────────────

    def _verifier(self, reference: str):
        from apps.payments.application.collect import poll_attempt
        from apps.payments.escrow.models import EscrowHold
        from apps.payments.intents.models import PaymentIntent

        intent = PaymentIntent.objects.filter(reference=reference).first()
        if intent is None:
            raise LiveTestError(f"Intention {reference} introuvable.")

        self.stdout.write(self.style.HTTP_INFO(
            "\n── Interrogation du prestataire ──"))
        self.stdout.write(
            "  Le prestataire fait foi, jamais l'etat local (principe P6).\n")

        tentative = intent.attempts.exclude(
            provider_reference="").order_by("-created_at").first()
        if tentative is None:
            raise LiveTestError(
                "Aucune demande emise pour cette intention.")

        try:
            issue = poll_attempt(tentative)
        except Exception as exc:
            raise LiveTestError(f"Interrogation impossible : {exc}")

        self._ok(f"Statut : {issue.status}", issue.message)

        intent.refresh_from_db()
        if intent.status != PaymentIntent.Status.SUCCEEDED:
            self.stdout.write(self.style.WARNING(
                f"\n  L'intention est en {intent.status}.\n"
                "  Si vous n'avez pas encore compose votre code, faites-le "
                "puis relancez\n  cette commande. Une transaction expire "
                "generalement apres quelques minutes."))
            return

        self.stdout.write(self.style.HTTP_INFO("\n── Consequences ──"))

        sequestres = EscrowHold.objects.filter(intent=intent)
        self._ok(f"{sequestres.count()} sequestre(s) materialise(s)")
        for hold in sequestres:
            self.stdout.write(
                f"       {hold.reference}  {hold.component:16} "
                f"net {hold.net_amount_xaf} FCFA  [{hold.status}]")

        from apps.payments.bridge.intent_orders import orders_for_intent

        for commande in orders_for_intent(intent):
            commande.refresh_from_db()
            self.stdout.write(
                f"       commande #{commande.pk} : "
                f"payment={commande.payment_status} "
                f"escrow={commande.escrow_status}")

        self._verifier_coherence()

        self.stdout.write(self.style.SUCCESS(
            "\n  Paiement REEL encaisse et comptabilise de bout en bout."))
        self.stdout.write(
            f"\n  Pour effacer les donnees de test :\n"
            f"     python manage.py payments_live_test --cleanup {reference}")

    def _verifier_coherence(self):
        from apps.payments.ledger.balances import trial_balance_total
        from apps.payments.ledger.invariants import run_all

        ecart = trial_balance_total()
        if ecart != 0:
            raise LiveTestError(
                f"Balance generale desequilibree : {ecart}. "
                "Le registre est corrompu.")
        self._ok("Balance generale equilibree")

        rapport = run_all()
        bloquants = [v for v in rapport["violations"] if v.blocking]
        if bloquants:
            self.stdout.write(self.style.ERROR(
                "       Invariant(s) BLOQUANT(S) viole(s) : "
                + ", ".join(v.code for v in bloquants)))
        else:
            self._ok("Aucun invariant bloquant viole")

        if rapport["violations"]:
            self.stdout.write(
                "       Violations non bloquantes : "
                + ", ".join(v.code for v in rapport["violations"]))

    # ── ETAPE 3 : nettoyer ───────────────────────────────────────────────────

    def _nettoyer(self, reference: str):
        """
        Efface les donnees de test.

        Les ECRITURES COMPTABLES sont conservees : elles sont immuables par
        conception, et le plan comptable interdit leur suppression. Un
        paiement reel a bien eu lieu — l'effacer du registre serait une
        falsification.
        """
        from apps.payments.bridge.intent_orders import (
            PaymentIntentOrder, orders_for_intent,
        )
        from apps.payments.escrow.models import EscrowHold
        from apps.payments.intents.models import PaymentIntent

        intent = PaymentIntent.objects.filter(reference=reference).first()
        if intent is None:
            raise LiveTestError(f"Intention {reference} introuvable.")

        self.stdout.write(self.style.WARNING(
            "\n  Les ECRITURES COMPTABLES sont CONSERVEES.\n"
            "  Un paiement reel a eu lieu : l'effacer du registre serait une\n"
            "  falsification. Seules les donnees metier de test sont "
            "supprimees.\n"))

        commandes = list(orders_for_intent(intent))
        sequestres = EscrowHold.objects.filter(intent=intent).count()

        self.stdout.write(f"  Commandes    : {len(commandes)}")
        self.stdout.write(f"  Sequestres   : {sequestres} (conserves)")
        self.stdout.write(f"  Intention    : {intent.reference} (conservee)")

        for commande in commandes:
            for article in commande.items.all():
                produit = article.product
                article.delete()
                if produit and produit.title.startswith("Test paiement reel"):
                    try:
                        produit.delete()
                    except Exception:
                        pass

        PaymentIntentOrder.objects.filter(intent=intent).delete()
        for commande in commandes:
            try:
                commande.delete()
            except Exception as exc:
                self.stdout.write(self.style.WARNING(
                    f"  Commande #{commande.pk} non supprimee : {exc}"))

        self._ok("Donnees metier de test supprimees")
        self.stdout.write(
            "\n  L'intention, les sequestres et les ecritures restent "
            "consultables\n  dans l'administration — c'est la trace du "
            "paiement reel.")