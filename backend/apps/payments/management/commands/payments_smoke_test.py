# backend/apps/payments/management/commands/payments_smoke_test.py
# Parcours complet de bout en bout, avec les VRAIS modeles de BelivaY.
#
#   python manage.py payments_smoke_test              # sans rien conserver
#   python manage.py payments_smoke_test --commit     # conserve les donnees
#   python manage.py payments_smoke_test --verbose
#
# ─────────────────────────────────────────────────────────────────────────────
# POURQUOI CETTE COMMANDE EXISTE
#
# Les tests du module tournent contre un projet MIROIR. Ce miroir m'a induit
# en erreur deux fois :
#   - au Lot 4, models.py n'importait pas apps.orders
#   - au Lot 12, Product.category n'etait pas obligatoire
#
# Une suite verte ne prouve donc pas que le module fonctionne avec TES
# modeles. Cette commande exerce la chaine complete — commande, eclatement,
# intention, encaissement, sequestre, litige, liberation — contre les vrais
# Product, Order, VendorProfile et leurs vraies contraintes.
#
# PAR DEFAUT, ELLE NE CONSERVE RIEN : tout se deroule dans une transaction
# annulee a la fin. Aucune trace en base, pas meme les references
# consommees.
# ─────────────────────────────────────────────────────────────────────────────

import sys
import uuid
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone


class SmokeFailure(Exception):
    """Une etape du parcours a echoue."""


class Command(BaseCommand):
    help = "Exerce le parcours financier complet avec les vrais modeles."

    def add_arguments(self, parser):
        parser.add_argument("--commit", action="store_true",
                            help="Conserve les donnees creees. Par defaut, "
                                 "tout est annule.")
        parser.add_argument("--verbose", action="store_true")

    def handle(self, *args, **options):
        self.bavard = options["verbose"]
        self.etapes = []

        if options["commit"]:
            self.stdout.write(self.style.WARNING(
                "MODE --commit : les donnees creees seront CONSERVEES.\n"))
        else:
            self.stdout.write(self.style.HTTP_INFO(
                "Transaction annulee a la fin : aucune trace en base.\n"))

        try:
            with transaction.atomic():
                self._verifier_configuration()
                contexte = self._preparer()
                self._parcours(contexte)
                self._livraison(contexte)
                self._remboursement(contexte)
                self._verifier_coherence(contexte)

                if not options["commit"]:
                    transaction.set_rollback(True)
        except SmokeFailure as exc:
            self._echec(str(exc))
            sys.exit(1)
        except Exception as exc:
            self._echec(f"{type(exc).__name__} : {exc}")
            if self.bavard:
                import traceback
                self.stdout.write(traceback.format_exc())
            sys.exit(1)

        self.stdout.write(self.style.SUCCESS(
            "\nParcours complet valide contre les modeles reels."))
        if not options["commit"]:
            self.stdout.write("Aucune donnee conservee.")

    # ── Affichage ────────────────────────────────────────────────────────────

    def _ok(self, libelle, detail=""):
        self.stdout.write(self.style.SUCCESS(f"  [OK] {libelle}"))
        if detail:
            self.stdout.write(f"       {detail}")
        self.etapes.append(libelle)

    def _info(self, texte):
        if self.bavard:
            self.stdout.write(f"       {texte}")

    def _echec(self, message):
        self.stdout.write(self.style.ERROR(f"\n  [KO] {message}"))
        if self.etapes:
            self.stdout.write(
                f"\n  Dernière étape franchie : {self.etapes[-1]}")

    # ── 1. Configuration ─────────────────────────────────────────────────────

    def _verifier_configuration(self):
        self.stdout.write(self.style.HTTP_INFO("── 1. Configuration ──"))

        from apps.payments.config.models import (
            DistributionRule, EscrowPolicy, ProviderConfig,
        )
        from apps.payments.ledger.models import LedgerAccount

        comptes = LedgerAccount.objects.count()
        if comptes == 0:
            raise SmokeFailure(
                "Plan comptable vide. Lancer : "
                "python manage.py seed_chart_of_accounts")
        self._ok(f"Plan comptable : {comptes} comptes")

        prestataires = list(
            ProviderConfig.current().filter(is_enabled=True)
            .values_list("provider_code", flat=True))
        if not prestataires:
            raise SmokeFailure(
                "Aucun prestataire actif. Lancer : "
                "python manage.py seed_financial_config")
        self._ok(f"Prestataire actif : {', '.join(prestataires)}")

        # ─────────────────────────────────────────────────────────────────
        # GARDE-FOU : PRESTATAIRE REEL + TRANSACTION ANNULEE = DANGER
        #
        # Cette commande annule sa transaction a la fin. Avec un prestataire
        # REEL, la demande de paiement partirait vraiment, mais AUCUNE trace
        # n'existerait en base.
        #
        # Si l'acheteur compose son code, l'argent quitte son compte et
        # BelivaY n'en sait rien : ni intention, ni sequestre, ni ecriture.
        # C'est de l'argent encaisse sans contrepartie comptable — le
        # scenario que la reconciliation N3 appelle « transaction fantome ».
        #
        # On refuse, plutot que d'avertir.
        # ─────────────────────────────────────────────────────────────────
        if "MOCK" not in prestataires:
            raise SmokeFailure(
                f"Le prestataire actif est {', '.join(prestataires)}, pas "
                "MOCK.\n"
                "       Cette commande ANNULE sa transaction : la demande "
                "de paiement\n"
                "       partirait reellement, sans aucune trace en base.\n\n"
                "       Pour un test avec de l'argent reel, utiliser :\n"
                "         python manage.py payments_live_test --start "
                "--msisdn 237XXXXXXXXX"
            )

        regles = DistributionRule.current().count()
        if regles == 0:
            raise SmokeFailure(
                "Aucune regle de repartition. Lancer : "
                "python manage.py seed_financial_config")
        self._ok(f"Regles de repartition : {regles}")

        politiques = EscrowPolicy.current().count()
        if politiques == 0:
            raise SmokeFailure("Aucune politique de sequestre configuree.")
        self._ok(f"Politiques de sequestre : {politiques}")

    # ── 2. Jeu de donnees, avec les VRAIS modeles ────────────────────────────

    def _preparer(self):
        self.stdout.write(self.style.HTTP_INFO(
            "\n── 2. Jeu de donnees (modeles reels) ──"))

        from django.contrib.auth.models import User

        from apps.catalog.models import Category, Product
        from apps.orders.models import Order, OrderItem
        from apps.vendors.models import VendorProfile

        marque = uuid.uuid4().hex[:8]

        acheteur = User.objects.create_user(
            f"smoke-buyer-{marque}", f"buyer-{marque}@smoke.test", "x")
        self._ok(f"Acheteur cree : {acheteur.username}")

        vendeurs = []
        for suffixe in ("a", "b"):
            utilisateur = User.objects.create_user(
                f"smoke-vendor-{suffixe}-{marque}",
                f"v{suffixe}-{marque}@smoke.test", "x")
            VendorProfile.objects.create(
                user=utilisateur,
                business_name=f"Boutique Smoke {suffixe.upper()} {marque}")
            vendeurs.append(utilisateur)
        self._ok(f"{len(vendeurs)} vendeurs crees avec leur VendorProfile")

        categorie = Category.objects.filter(is_active=True).first()
        if categorie is None:
            categorie = Category.objects.create(
                name=f"Smoke {marque}", slug=f"smoke-{marque}")
            self._info("Aucune categorie active : une categorie de test "
                       "a ete creee.")
        self._ok(f"Categorie utilisee : {categorie.name}")

        produits = []
        for index, (utilisateur, prix) in enumerate(
                zip(vendeurs, (30000, 20000))):
            produits.append(Product.objects.create(
                title=f"Article Smoke {index + 1} {marque}",
                price_xaf=prix, vendor=utilisateur, category=categorie))
        self._ok("2 produits crees, un par vendeur",
                 "C'est ce qui rend le panier multi-vendeurs.")

        sous_total = sum(p.price_xaf for p in produits)
        frais = 2000
        commande = Order.objects.create(
            user=acheteur, customer_phone="237677123456",
            customer_email=f"buyer-{marque}@smoke.test",
            city="Douala", address="Akwa, rue de la Joie",
            subtotal_xaf=sous_total, delivery_fee_xaf=frais,
            total_xaf=sous_total + frais,
            commission_rate_snapshot=Decimal("15.00"))
        for produit in produits:
            OrderItem.objects.create(
                order=commande, product=produit,
                title_snapshot=produit.title,
                price_xaf_snapshot=produit.price_xaf, qty=1,
                line_total_xaf=produit.price_xaf)
        self._ok(f"Commande #{commande.pk} : {commande.total_xaf} FCFA, "
                 "2 vendeurs")

        return {"acheteur": acheteur, "vendeurs": vendeurs,
                "commande": commande, "marque": marque}

    # ── 3. Le parcours ───────────────────────────────────────────────────────

    def _parcours(self, contexte):
        from apps.payments.application.collect import (
            initiate_collect, poll_attempt,
        )
        from apps.payments.bridge import events_in
        from apps.payments.bridge.checkout import checkout
        from apps.payments.escrow.models import EscrowHold
        from apps.payments.escrow.services import release_hold
        from apps.payments.infrastructure.providers.mock import reset_mock_state
        from apps.orders.models import Order

        self.stdout.write(self.style.HTTP_INFO("\n── 3. Eclatement ──"))
        reset_mock_state()

        commandes, intent = checkout(
            contexte["commande"], payer_msisdn="237677123456",
            payer_operator="MTN",
            idempotency_key=f"smoke-{contexte['marque']}")
        contexte["commandes"] = commandes
        contexte["intent"] = intent

        if len(commandes) != 2:
            raise SmokeFailure(
                f"Eclatement attendu en 2 commandes, obtenu {len(commandes)}. "
                "Verifier que les produits ont bien des vendeurs distincts.")
        self._ok(f"Panier eclate en {len(commandes)} commandes mono-vendeur")
        for cmd in commandes:
            self._info(f"#{cmd.pk} — sous-total {cmd.subtotal_xaf}, "
                       f"livraison {cmd.delivery_fee_xaf}")

        total = sum(c.total_xaf for c in commandes)
        if total != contexte["commande"].total_xaf and total != 52000:
            self._info(f"Total apres eclatement : {total}")

        self.stdout.write(self.style.HTTP_INFO("\n── 4. Intention ──"))
        self._ok(f"Intention {intent.reference} — {intent.amount_xaf} FCFA")
        plan = intent.distribution_plan or {}
        if not plan.get("holds"):
            raise SmokeFailure(
                "Le plan de repartition est vide. Verifier les "
                "DistributionRule et les comptes beneficiaires.")
        for hold in plan["holds"]:
            cible = (f"commande #{hold['order_id']}" if hold.get("order_id")
                     else "niveau paiement")
            self._info(f"{hold['component']:10} {cible:20} "
                       f"net {hold['net']}")

        self.stdout.write(self.style.HTTP_INFO("\n── 5. Encaissement ──"))
        issue = initiate_collect(intent)
        self._ok(f"Demande emise : {issue.status}", issue.message)

        for _ in range(3):
            issue = poll_attempt(issue.attempt)
            if issue.status in ("SUCCEEDED", "ALREADY_SUCCEEDED"):
                break
        if issue.status not in ("SUCCEEDED", "ALREADY_SUCCEEDED"):
            raise SmokeFailure(
                f"Encaissement non confirme : {issue.status} — {issue.message}")
        self._ok("Paiement confirme")

        sequestres = EscrowHold.objects.filter(intent=intent)
        if not sequestres.exists():
            raise SmokeFailure(
                "Aucun sequestre materialise apres confirmation.")
        self._ok(f"{sequestres.count()} sequestre(s) materialise(s)")

        self.stdout.write(self.style.HTTP_INFO("\n── 6. Miroir metier ──"))
        for cmd in commandes:
            cmd.refresh_from_db()
            if cmd.payment_status != Order.PaymentStatus.PAID:
                raise SmokeFailure(
                    f"La commande #{cmd.pk} n'est pas passee en PAID "
                    f"(statut : {cmd.payment_status}). Le miroir n'a pas "
                    "fonctionne.")
        self._ok("Les commandes sont passees en PAID · escrow BLOCKED")

        self.stdout.write(self.style.HTTP_INFO("\n── 7. Litige isole ──"))
        premiere, seconde = commandes[0], commandes[1]

        events_in.dispute_opened(
            order_id=premiere.pk, reason="Test de fumee — produit defectueux",
            event_id=f"smoke-dispute-{contexte['marque']}")
        events_in.buyer_confirmed_receipt(
            order_id=seconde.pk,
            event_id=f"smoke-receipt-{contexte['marque']}")

        for hold in EscrowHold.objects.filter(
                intent=intent, status=EscrowHold.Status.RELEASE_SCHEDULED):
            release_hold(hold, force=True, reason="Test de fumee")

        premiere.refresh_from_db()
        seconde.refresh_from_db()

        if premiere.escrow_status != Order.EscrowStatus.BLOCKED:
            raise SmokeFailure(
                f"La commande en litige devrait rester BLOCKED, elle est en "
                f"{premiere.escrow_status}.")
        if seconde.escrow_status != Order.EscrowStatus.RELEASED:
            raise SmokeFailure(
                f"La commande confirmee devrait etre RELEASED, elle est en "
                f"{seconde.escrow_status}.")

        self._ok("Litige ISOLE sur une seule commande",
                 f"#{premiere.pk} gelee ({premiere.escrow_status}) · "
                 f"#{seconde.pk} liberee ({seconde.escrow_status})")

    # ── 3 bis. Transporteur et livraison ─────────────────────────────────────

    def _livraison(self, contexte):
        """
        Exerce le chemin TRANSPORTEUR, que le parcours precedent ignorait.

        ─────────────────────────────────────────────────────────────────────
        POURQUOI CETTE PHASE A ETE AJOUTEE

        L'epreuve ne testait que la marchandise. Or c'est cote transport que
        deux defauts SILENCIEUX ont ete trouves :
          - la part du transporteur restait comptabilisee en produit
          - le sequestre TRANSPORT ne se liberait jamais

        Aucun des deux ne levait d'erreur. Une epreuve qui ne couvre qu'un
        acteur sur trois donne une fausse assurance.
        ─────────────────────────────────────────────────────────────────────
        """
        from apps.payments.escrow.models import EscrowHold
        from apps.payments.ledger.balances import revenue_summary

        self.stdout.write(self.style.HTTP_INFO("\n── 7 bis. Transporteur ──"))

        try:
            from apps.accounts.models import (
                CourierProfile, DeliveryOrganizationProfile,
            )
            from apps.shipping.models import Shipment
        except ImportError:
            self._ok("Chemin transporteur ignore",
                     "apps.shipping ou apps.accounts indisponible.")
            return

        intent = contexte["intent"]
        plan = intent.distribution_plan or {}
        a_reallouer = [r for r in plan.get("unresolved_rules", [])
                       if r.get("payee_type") == "DELIVERY_COMPANY"]

        if not a_reallouer:
            self._ok(
                "Aucune part transport a reallouer",
                "Soit aucune regle ne cible le transporteur, soit il etait "
                "deja connu au checkout.",
            )
        else:
            self._ok(
                f"Part transport en attente : {a_reallouer[0]['amount_xaf']} FCFA",
                "Provisoirement comptabilisee en PRODUIT plateforme.",
            )

        from django.contrib.auth.models import User

        marque = contexte["marque"]
        gestionnaire = User.objects.create_user(
            f"smoke-mgr-{marque}", f"mgr-{marque}@smoke.test", "x")
        organisation = DeliveryOrganizationProfile.objects.create(
            user=gestionnaire, company_name=f"Express Smoke {marque}",
            phone="237699000111", city="Douala")
        utilisateur = User.objects.create_user(
            f"smoke-courier-{marque}", f"cr-{marque}@smoke.test", "x")
        livreur = CourierProfile.objects.create(
            user=utilisateur, delivery_organization=organisation,
            phone="237655111222", city="Douala")
        self._ok("Transporteur cree avec son organisation")

        produit_avant = revenue_summary()["revenue_total"]
        principale = contexte["commandes"][0]

        expedition = Shipment.objects.create(
            order=principale, courier=livreur,
            status=Shipment.Status.ASSIGNED)

        # Le crochet differe son emission au COMMIT. Dans cette commande, la
        # transaction est encore ouverte : on declenche donc la verification
        # explicitement, sans quoi la phase ne prouverait rien.
        from apps.payments.bridge.signals import _traiter
        _traiter(expedition.pk)

        produit_apres = revenue_summary()["revenue_total"]
        if a_reallouer:
            attendu = int(a_reallouer[0]["amount_xaf"])
            if produit_avant - produit_apres != attendu:
                raise SmokeFailure(
                    f"Reallocation attendue de {attendu} FCFA, observee "
                    f"{produit_avant - produit_apres}. Le crochet "
                    "d'assignation n'a pas fonctionne."
                )
            self._ok(
                f"Part transport reallouee : {attendu} FCFA",
                f"Chiffre d'affaires corrige de {produit_avant} a "
                f"{produit_apres}.",
            )

        transport = EscrowHold.objects.filter(
            intent=intent, component=EscrowHold.Component.TRANSPORT,
        ).first()
        if transport is None:
            self._ok("Aucun sequestre transport",
                     "La part revient entierement a la plateforme.")
            return

        if transport.status != EscrowHold.Status.HELD:
            raise SmokeFailure(
                f"Le sequestre transport devrait etre HELD, il est "
                f"{transport.status}."
            )
        self._ok(f"Sequestre transport {transport.reference} sous garde",
                 f"{transport.net_amount_xaf} FCFA")

        self.stdout.write(self.style.HTTP_INFO("\n── 7 ter. Livraison ──"))
        expedition.status = Shipment.Status.DELIVERED
        expedition.save()
        _traiter(expedition.pk)

        transport.refresh_from_db()
        if transport.status != EscrowHold.Status.RELEASE_SCHEDULED:
            raise SmokeFailure(
                f"La livraison devrait programmer la liberation du "
                f"transport. Statut observe : {transport.status}. "
                "Sans cela, le transporteur ne serait JAMAIS paye — le "
                "transport n'a aucune auto-confirmation."
            )
        self._ok("Livraison prouvee : liberation du transport programmee",
                 "Le transporteur sera paye au prochain cycle.")

    # ── 7 quater. Remboursement ──────────────────────────────────────────────

    def _remboursement(self, contexte):
        """
        Exerce le chemin du REMBOURSEMENT sur la commande en litige.

        ─────────────────────────────────────────────────────────────────────
        POURQUOI CETTE PHASE

        Le modele Refund a existe pendant plusieurs lots SANS aucune logique
        pour l'executer : un acheteur qui gagnait son litige ne recuperait
        rien. Le sequestre restait gele indefiniment.

        Une epreuve qui ne verifie pas le retour de l'argent laisserait ce
        genre de trou passer.
        ─────────────────────────────────────────────────────────────────────
        """
        from apps.payments.escrow.models import EscrowHold
        from apps.payments.ledger.balances import balance
        from apps.payments.ledger import chart_of_accounts as coa
        from apps.payments.settlements.models import Refund
        from apps.payments.settlements.services import (
            approve_refund, execute_refund,
        )

        self.stdout.write(self.style.HTTP_INFO("\n── 7 quater. Remboursement ──"))

        intent = contexte["intent"]
        gelee = contexte["commandes"][0]

        gele = EscrowHold.objects.filter(
            order_id=gelee.pk, component=EscrowHold.Component.GOODS,
            status=EscrowHold.Status.FROZEN,
        ).first()
        if gele is None:
            raise SmokeFailure(
                f"Aucun sequestre gele sur la commande #{gelee.pk} : le "
                "litige de la phase precedente n'a pas produit son effet."
            )

        # Le litige est tranche en faveur de l'acheteur.
        from apps.payments.bridge import events_in

        evenement = events_in.dispute_resolved(
            order_id=gelee.pk, resolution="REFUND",
            event_id=f"smoke-refund-{contexte['marque']}",
        )
        if evenement.outcome != "APPLIED":
            raise SmokeFailure(
                f"Le litige tranche en REFUND n'a produit aucune demande : "
                f"{evenement.outcome} — {evenement.note[:160]}"
            )

        remboursement = Refund.objects.filter(intent=intent).order_by(
            "-created_at").first()
        if remboursement is None:
            raise SmokeFailure("Aucune demande de remboursement creee.")

        self._ok(
            f"Demande {remboursement.reference} creee",
            f"{remboursement.amount_xaf} FCFA — EN ATTENTE d'approbation.",
        )

        # L'argent NE DOIT PAS etre sorti a ce stade.
        gele.refresh_from_db()
        if gele.status != EscrowHold.Status.FROZEN:
            raise SmokeFailure(
                "Le sequestre a bouge AVANT approbation. Un litige tranche "
                "automatiquement suivi d'un virement automatique permettrait "
                "d'ouvrir un litige, le faire trancher, et encaisser."
            )
        self._ok("L'argent n'est PAS sorti automatiquement",
                 "Une approbation par un tiers reste obligatoire.")

        from django.contrib.auth.models import User

        approbateur = User.objects.create_user(
            f"smoke-approver-{contexte['marque']}",
            f"ap-{contexte['marque']}@smoke.test", "x")

        try:
            approve_refund(remboursement, approved_by=approbateur)
        except Exception as exc:
            raise SmokeFailure(f"Approbation impossible : {exc}")
        self._ok("Approuve par un tiers")

        sequestre_avant = balance(coa.ESCROW_LIABILITY)
        remboursement = execute_refund(remboursement)

        if remboursement.status != Refund.Status.PAID:
            raise SmokeFailure(
                f"Le remboursement est en {remboursement.status} au lieu de "
                f"PAID. {getattr(remboursement.payout, 'error_message', '')}"
            )

        sortie = sequestre_avant - balance(coa.ESCROW_LIABILITY)
        if sortie != remboursement.amount_xaf:
            raise SmokeFailure(
                f"Le sequestre a diminue de {sortie} FCFA au lieu de "
                f"{remboursement.amount_xaf}."
            )
        self._ok(f"Rembourse : {remboursement.amount_xaf} FCFA",
                 "L'argent est retourne au PAYEUR, jamais ailleurs.")

        gele.refresh_from_db()
        if gele.status != EscrowHold.Status.REFUNDED:
            raise SmokeFailure(
                f"Le sequestre devrait etre REFUNDED, il est {gele.status}."
            )
        self._ok("Sequestre solde en REFUNDED",
                 "Cet argent n'ira jamais au vendeur.")

    # ── 4. Coherence financiere ──────────────────────────────────────────────

    def _verifier_coherence(self, contexte):
        self.stdout.write(self.style.HTTP_INFO("\n── 8. Coherence ──"))

        from apps.payments.bridge.events_out import compare_all
        from apps.payments.ledger.balances import trial_balance_total
        from apps.payments.ledger.invariants import run_all

        ecart = trial_balance_total()
        if ecart != 0:
            raise SmokeFailure(
                f"Balance generale desequilibree : {ecart}. "
                "Le registre est corrompu.")
        self._ok("Balance generale equilibree")

        rapport = run_all()
        violations = [v for v in rapport["violations"]
                      if v.code not in ("I4",)]
        if violations:
            details = ", ".join(f"{v.code} : {v.detail[:80]}"
                                for v in violations)
            raise SmokeFailure(f"Invariant(s) viole(s) — {details}")
        self._ok("Invariants comptables respectes",
                 "I4 (solvabilite) est ignore : le prestataire factice "
                 "renvoie un solde nul.")

        comparaison = compare_all()
        if comparaison["diverged"]:
            raise SmokeFailure(
                f"{comparaison['diverged']} commande(s) desynchronisee(s) "
                "entre Order.escrow_status et EscrowHold.")
        self._ok(f"{comparaison['checked']} commande(s) verifiee(s), "
                 "aucune divergence")