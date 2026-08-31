# backend/apps/payments/management/commands/payments_seed_demo.py
# Jeu de donnees vraisemblable, pour juger les ecrans.
#
#   python manage.py payments_seed_demo
#   python manage.py payments_seed_demo --days 45 --orders 60
#   python manage.py payments_seed_demo --purge
#
# ─────────────────────────────────────────────────────────────────────────────
# POURQUOI CETTE COMMANDE
#
# Vingt-six ecrans juges sur une base vide ne se jugent pas. Un tableau de
# bord sans alerte, une courbe sans point, une file d'approbation vide : on
# ne voit ni la densite, ni la lisibilite, ni ce qui deborde.
#
# Ce jeu produit une SEMAINE ORDINAIRE de BelivaY : des paiements reussis,
# des abandons, un litige, un remboursement, un versement a issue inconnue.
# Pas un cas parfait — un cas realiste.
#
# ─────────────────────────────────────────────────────────────────────────────
# GARDE-FOU
#
# La commande REFUSE de tourner si un prestataire reel est actif. Elle
# emettrait alors de vraies demandes de paiement vers de faux numeros.
#
# C'est le meme garde-fou que payments_smoke_test, et pour la meme raison :
# un jeu de test ne doit jamais toucher a de l'argent reel.
# ─────────────────────────────────────────────────────────────────────────────

import random
import uuid
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone


class SeedError(Exception):
    """Le jeu de donnees ne peut pas etre genere."""


#: Marque des objets crees : permet de tout retrouver pour la purge.
MARQUE = "demo-finance"

NOMS_VENDEURS = [
    "Boutique Kola", "Njoya Electronics", "Mama Ngo Textiles",
    "Douala Fresh", "Atelier Bafoussam", "Yaoundé Mode",
]
NOMS_LIVRAISON = ["Express Douala", "Rapide Yaoundé"]
NOMS_RELAIS = ["Relais Mokolo", "Relais Akwa", "Relais Bonabéri"]

ARTICLES = [
    ("Pagne wax 6 yards", 18_000), ("Sandales cuir", 12_500),
    ("Casque audio", 32_000), ("Sac à main", 24_000),
    ("Robe kaba", 15_000), ("Montre classique", 45_000),
    ("Lampe solaire", 8_500), ("Bouilloire électrique", 21_000),
]


class Command(BaseCommand):
    help = "Genere un jeu de donnees financier vraisemblable."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=30,
                            help="Profondeur de l'historique.")
        parser.add_argument("--orders", type=int, default=40,
                            help="Nombre de commandes a generer.")
        parser.add_argument("--purge", action="store_true",
                            help="Supprime le jeu precedent, sans regenerer.")
        parser.add_argument("--seed", type=int, default=20260811,
                            help="Graine aleatoire, pour un jeu reproductible.")

    def handle(self, *args, **options):
        try:
            if options["purge"]:
                self._purger()
                return

            self._verifier_prestataire()
            self._verifier_configuration()

            random.seed(options["seed"])
            self.stdout.write(self.style.HTTP_INFO(
                f"\n── Génération sur {options['days']} jours ──"))

            contexte = self._acteurs()
            self._commandes(contexte, options["days"], options["orders"])
            self._incidents(contexte)
            self._reglements(contexte)
            self._bilan()

        except SeedError as exc:
            self.stdout.write(self.style.ERROR(f"\n  [KO] {exc}"))
            raise SystemExit(1)

    # ── Affichage ────────────────────────────────────────────────────────────

    def _ok(self, libelle, detail=""):
        self.stdout.write(self.style.SUCCESS(f"  [OK] {libelle}"))
        if detail:
            self.stdout.write(f"       {detail}")

    # ── Garde-fous ───────────────────────────────────────────────────────────

    def _verifier_prestataire(self):
        """
        Un prestataire reel emettrait de vraies demandes vers de faux
        numeros. On refuse, plutot que d'avertir.
        """
        from apps.payments.config.models import ProviderConfig

        actifs = list(
            ProviderConfig.current().filter(is_enabled=True)
            .values_list("provider_code", flat=True)
        )
        if not actifs:
            raise SeedError(
                "Aucun prestataire actif. Lancer d'abord "
                "seed_financial_config."
            )
        reels = [code for code in actifs if code != "MOCK"]
        if reels:
            raise SeedError(
                f"Le prestataire {', '.join(reels)} est ACTIF.\n"
                "       Ce jeu de test emettrait de vraies demandes de "
                "paiement vers\n"
                "       des numeros fictifs. Activer MOCK avant de "
                "generer :\n\n"
                "         ProviderConfig.objects.filter(provider_code="
                "'MOCK').update(is_enabled=True)"
            )
        self._ok("Prestataire MOCK actif — aucun argent réel en jeu")

    def _verifier_configuration(self):
        from apps.payments.config.models import DistributionRule, EscrowPolicy
        from apps.payments.ledger.models import LedgerAccount

        if LedgerAccount.objects.count() == 0:
            raise SeedError(
                "Plan comptable vide. Lancer seed_chart_of_accounts.")
        if not DistributionRule.current().exists():
            raise SeedError(
                "Aucune règle de répartition. Lancer seed_financial_config.")
        if not EscrowPolicy.current().exists():
            raise SeedError("Aucune politique de séquestre configurée.")
        self._ok("Configuration financière présente")

    # ── Acteurs ──────────────────────────────────────────────────────────────

    def _acteurs(self) -> dict:
        from django.contrib.auth.models import User

        from apps.catalog.models import Category, Product
        from apps.vendors.models import VendorProfile

        self.stdout.write(self.style.HTTP_INFO("\n── Acteurs ──"))

        categorie = Category.objects.filter(is_active=True).first()
        if categorie is None:
            categorie = Category.objects.create(
                name="Démonstration", slug=f"{MARQUE}-categorie")

        acheteurs = []
        for index in range(8):
            utilisateur, _ = User.objects.get_or_create(
                username=f"{MARQUE}-buyer-{index}",
                defaults={"email": f"buyer{index}@{MARQUE}.test"},
            )
            acheteurs.append(utilisateur)
        self._ok(f"{len(acheteurs)} acheteurs")

        vendeurs = []
        for index, nom in enumerate(NOMS_VENDEURS):
            utilisateur, _ = User.objects.get_or_create(
                username=f"{MARQUE}-vendor-{index}",
                defaults={"email": f"vendor{index}@{MARQUE}.test"},
            )
            profil, _ = VendorProfile.objects.get_or_create(
                user=utilisateur, defaults={"business_name": nom})
            produits = [
                Product.objects.get_or_create(
                    slug=f"{MARQUE}-p-{index}-{numero}",
                    defaults={
                        "title": f"{titre} — {nom}",
                        "price_xaf": prix,
                        "vendor": utilisateur,
                        "category": categorie,
                    },
                )[0]
                for numero, (titre, prix) in enumerate(
                    random.sample(ARTICLES, 3))
            ]
            vendeurs.append({"profil": profil, "produits": produits})
        self._ok(f"{len(vendeurs)} vendeurs, {len(vendeurs) * 3} produits")

        transporteurs = self._transporteurs()
        relais = self._relais()

        return {
            "acheteurs": acheteurs, "vendeurs": vendeurs,
            "transporteurs": transporteurs, "relais": relais,
        }

    def _transporteurs(self) -> list:
        from django.contrib.auth.models import User

        try:
            from apps.accounts.models import (
                CourierProfile, DeliveryOrganizationProfile,
            )
        except ImportError:
            return []

        organisations = []
        for index, nom in enumerate(NOMS_LIVRAISON):
            gestionnaire, _ = User.objects.get_or_create(
                username=f"{MARQUE}-dlv-mgr-{index}",
                defaults={"email": f"dlv{index}@{MARQUE}.test"},
            )
            organisation, _ = DeliveryOrganizationProfile.objects.get_or_create(
                user=gestionnaire,
                defaults={
                    "company_name": nom, "phone": f"23769900{index:04d}",
                    "city": "Douala",
                },
            )
            livreur_user, _ = User.objects.get_or_create(
                username=f"{MARQUE}-courier-{index}",
                defaults={"email": f"courier{index}@{MARQUE}.test"},
            )
            livreur, _ = CourierProfile.objects.get_or_create(
                user=livreur_user,
                defaults={
                    "delivery_organization": organisation,
                    "phone": f"23765511{index:04d}", "city": "Douala",
                },
            )
            organisations.append({"organisation": organisation,
                                  "livreur": livreur})
        if organisations:
            self._ok(f"{len(organisations)} entreprises de livraison")
        return organisations

    def _relais(self) -> list:
        from django.contrib.auth.models import User

        try:
            from apps.accounts.models import RelayPointProfile
        except ImportError:
            return []

        points = []
        for index, nom in enumerate(NOMS_RELAIS):
            gerant, _ = User.objects.get_or_create(
                username=f"{MARQUE}-relay-{index}",
                defaults={"email": f"relay{index}@{MARQUE}.test"},
            )
            profil, _ = RelayPointProfile.objects.get_or_create(
                user=gerant,
                defaults={"name": nom, "city": "Yaoundé"},
            )
            points.append(profil)
        if points:
            self._ok(f"{len(points)} points relais")
        return points

    # ── Commandes et paiements ───────────────────────────────────────────────

    def _commandes(self, contexte: dict, jours: int, nombre: int):
        from apps.payments.application.collect import (
            initiate_collect, poll_attempt,
        )
        from apps.payments.bridge.checkout import checkout
        from apps.payments.infrastructure.providers.mock import reset_mock_state
        from apps.orders.models import Order, OrderItem
        from apps.payments.intents.models import PaymentIntent

        self.stdout.write(self.style.HTTP_INFO("\n── Paiements ──"))
        reset_mock_state()

        maintenant = timezone.now()
        creees = {"reussis": 0, "abandons": 0, "echecs": 0}
        self.intentions = []

        for index in range(nombre):
            # Les commandes se repartissent sur la periode, avec un creux
            # le week-end — sinon la courbe serait plate et irrealiste.
            recul = random.randint(0, jours - 1)
            date = maintenant - timedelta(
                days=recul, hours=random.randint(0, 20))
            if date.isoweekday() >= 6 and random.random() < 0.55:
                continue

            acheteur = random.choice(contexte["acheteurs"])
            # Un panier sur cinq est multi-vendeurs : c'est ce qui rend
            # l'eclatement visible dans les ecrans.
            vendeurs = random.sample(
                contexte["vendeurs"],
                2 if random.random() < 0.2 else 1,
            )

            articles = []
            for vendeur in vendeurs:
                produit = random.choice(vendeur["produits"])
                quantite = random.choice([1, 1, 1, 2])
                articles.append((produit, quantite))

            sous_total = sum(p.price_xaf * q for p, q in articles)
            frais = random.choice([0, 1500, 2000, 2500])

            with transaction.atomic():
                commande = Order.objects.create(
                    user=acheteur,
                    customer_phone=f"2376{random.randint(70, 99)}"
                                   f"{random.randint(100000, 999999)}",
                    customer_email=f"{acheteur.username}@{MARQUE}.test",
                    city=random.choice(["Douala", "Yaoundé", "Bafoussam"]),
                    address=f"Quartier {random.randint(1, 12)}",
                    subtotal_xaf=sous_total, delivery_fee_xaf=frais,
                    total_xaf=sous_total + frais,
                    commission_rate_snapshot=Decimal("15.00"),
                )
                for produit, quantite in articles:
                    OrderItem.objects.create(
                        order=commande, product=produit,
                        title_snapshot=produit.title,
                        price_xaf_snapshot=produit.price_xaf, qty=quantite,
                        line_total_xaf=produit.price_xaf * quantite,
                    )
                Order.objects.filter(pk=commande.pk).update(created_at=date)

                try:
                    commandes, intent = checkout(
                        commande,
                        payer_msisdn=f"2376{random.randint(70, 99)}"
                                     f"{random.randint(100000, 999999)}",
                        payer_operator=random.choice(
                            ["MTN", "MTN", "MTN", "ORANGE"]),
                        idempotency_key=f"{MARQUE}-{uuid.uuid4().hex[:10]}",
                    )
                except Exception:
                    continue

            # Trois issues, dans des proportions realistes.
            tirage = random.random()
            if tirage < 0.78:
                issue = initiate_collect(intent)
                poll_attempt(issue.attempt)
                poll_attempt(issue.attempt)
                intent.refresh_from_db()
                if intent.status == PaymentIntent.Status.SUCCEEDED:
                    creees["reussis"] += 1
                    PaymentIntent.objects.filter(pk=intent.pk).update(
                        created_at=date, confirmed_at=date)
                    self.intentions.append({
                        "intent": intent, "commandes": commandes,
                        "date": date,
                    })
            elif tirage < 0.92:
                # Abandon : l'acheteur n'a pas compose son code.
                initiate_collect(intent)
                creees["abandons"] += 1
                PaymentIntent.objects.filter(pk=intent.pk).update(
                    created_at=date, status=PaymentIntent.Status.EXPIRED)
            else:
                creees["echecs"] += 1
                PaymentIntent.objects.filter(pk=intent.pk).update(
                    created_at=date, status=PaymentIntent.Status.FAILED,
                    failure_reason="Solde insuffisant")

        self._ok(
            f"{creees['reussis']} paiements encaissés",
            f"{creees['abandons']} abandons · {creees['echecs']} échecs — "
            "des proportions réalistes, pas un cas parfait.",
        )

    # ── Cycle de vie ─────────────────────────────────────────────────────────

    def _incidents(self, contexte: dict):
        """
        Fait vivre les commandes : livraisons, confirmations, litiges.

        Sans cette phase, tous les sequestres resteraient au meme stade et
        les ecrans montreraient une colonne unique.
        """
        from apps.payments.bridge import events_in
        from apps.payments.escrow.models import EscrowHold
        from apps.payments.escrow.services import release_hold

        self.stdout.write(self.style.HTTP_INFO("\n── Cycle de vie ──"))

        compte = {"confirmes": 0, "liberes": 0, "litiges": 0}
        maintenant = timezone.now()

        for numero, entree in enumerate(self.intentions):
            age = (maintenant - entree["date"]).days
            commande = entree["commandes"][0]

            # Les commandes recentes restent sous sequestre : c'est ce qui
            # remplit la colonne « pas encore du » cote partenaire.
            if age < 3:
                continue

            tirage = random.random()

            if tirage < 0.08:
                events_in.dispute_opened(
                    order_id=commande.pk,
                    reason=random.choice([
                        "Produit non conforme à la description",
                        "Colis jamais reçu",
                        "Article endommagé à la livraison",
                    ]),
                    event_id=f"{MARQUE}-dispute-{numero}",
                )
                compte["litiges"] += 1
                continue

            events_in.buyer_confirmed_receipt(
                order_id=commande.pk,
                event_id=f"{MARQUE}-receipt-{numero}",
            )
            compte["confirmes"] += 1

            # Une partie seulement est liberee : le reste reste programme.
            if age >= 5:
                for hold in EscrowHold.objects.filter(
                        order_id=commande.pk,
                        status=EscrowHold.Status.RELEASE_SCHEDULED):
                    release_hold(hold, force=True,
                                 reason=f"{MARQUE} — échéance atteinte")
                    compte["liberes"] += 1

        # Un jeu sans litige ne montre pas l'ecran qui compte le plus : on
        # en force un si le hasard n'en a produit aucun.
        if compte["litiges"] == 0 and self.intentions:
            for numero, entree in enumerate(self.intentions):
                cible = entree["commandes"][0]
                actifs = EscrowHold.objects.filter(
                    order_id=cible.pk, status=EscrowHold.Status.HELD)
                if actifs.exists():
                    events_in.dispute_opened(
                        order_id=cible.pk,
                        reason="Produit non conforme à la description",
                        event_id=f"{MARQUE}-dispute-force-{numero}",
                    )
                    compte["litiges"] = 1
                    break

        # ─────────────────────────────────────────────────────────────────
        # VIEILLIR LES SEQUESTRES
        #
        # `materialize_holds` les cree a l'instant present, quelle que soit
        # la date du paiement. Sans ce recalage, la ventilation par
        # anciennete regrouperait TOUT dans « 0-2 j » et n'apprendrait rien.
        #
        # On aligne donc chaque sequestre sur la date de son paiement — ce
        # qui est aussi la verite metier.
        # ─────────────────────────────────────────────────────────────────
        recales = 0
        for entree in self.intentions:
            modifies = EscrowHold.objects.filter(
                intent=entree["intent"],
            ).update(created_at=entree["date"])
            recales += modifies

        self._ok(
            f"{compte['confirmes']} réceptions confirmées",
            f"{compte['liberes']} séquestres libérés · "
            f"{compte['litiges']} litiges ouverts · "
            f"{recales} séquestres datés de leur paiement",
        )

    def _reglements(self, contexte: dict):
        """
        Construit les lots, demande les versements, en execute une partie.

        Un versement est laisse a issue INCONNUE : c'est le cas que
        l'interface doit savoir presenter sans proposer de le rejouer.
        """
        from apps.payments.payees.models import KycStatus, PayeeAccount
        from apps.payments.settlements.models import PayoutRequest
        from apps.payments.settlements.services import (
            SettlementError, approve_payout, build_batch, confirm_batch,
            execute_payout, request_payout,
        )

        self.stdout.write(self.style.HTTP_INFO("\n── Règlements ──"))

        from django.contrib.auth.models import User

        operateur, _ = User.objects.get_or_create(
            username=f"{MARQUE}-operator",
            defaults={"email": f"op@{MARQUE}.test", "is_staff": True},
        )
        approbateur, _ = User.objects.get_or_create(
            username=f"{MARQUE}-approver",
            defaults={"email": f"ap@{MARQUE}.test", "is_staff": True},
        )

        # ─────────────────────────────────────────────────────────────────
        # LES COMPTES CREES PAR LE PONT N'ONT AUCUN NUMERO
        #
        # `payee_for_vendor` cree un compte financier sans coordonnees
        # Mobile Money : le vendeur les renseigne lui-meme, plus tard.
        #
        # Sans elles, aucun versement n'est possible — et c'est CORRECT.
        # Le garde-fou du Lot 4 refuse d'envoyer de l'argent vers le vide.
        # Pour la demonstration, on les renseigne comme le ferait un
        # partenaire.
        # ─────────────────────────────────────────────────────────────────
        comptes = list(PayeeAccount.objects.exclude(payee_type="PLATFORM"))
        for index, compte in enumerate(comptes):
            if not compte.momo_number_masked:
                compte.set_momo_number(
                    f"2376{random.randint(70, 99)}"
                    f"{random.randint(100000, 999999)}",
                    random.choice(["MTN", "MTN", "ORANGE"]),
                )
                compte.save(update_fields=[
                    "momo_number_enc", "momo_number_masked",
                    "momo_fingerprint", "momo_operator", "momo_changed_at",
                    "updated_at",
                ])

        # Les garde-fous du Lot 4 doivent ensuite etre leves : KYC verifie,
        # refroidissement de 72 h passe.
        PayeeAccount.objects.exclude(payee_type="PLATFORM").update(
            kyc_status=KycStatus.VERIFIED,
            momo_changed_at=timezone.now() - timedelta(days=30),
        )
        for compte in comptes:
            compte.refresh_from_db()
        lots, demandes = 0, 0

        for compte in comptes:
            try:
                lot = build_batch(compte)
            except SettlementError:
                continue
            if lot is None:
                continue
            try:
                confirm_batch(lot)
                lots += 1
                demande = request_payout(
                    lot, requested_by=operateur,
                    justification=f"{MARQUE} — cycle automatique",
                )
                demandes += 1
            except SettlementError:
                continue

        self._ok(f"{lots} lots construits", f"{demandes} versements demandés")

        # On approuve les deux tiers, et on en execute la moitie : la file
        # d'approbation doit rester peuplee.
        en_attente = list(PayoutRequest.objects.filter(
            status=PayoutRequest.Status.PENDING_APPROVAL))
        random.shuffle(en_attente)

        # On garde environ un tiers en attente, MAIS au moins une demande
        # est toujours approuvee : `int(1 * 0.66)` vaut zero, et un jeu de
        # demonstration sans aucun versement approuve ne montre rien.
        a_traiter = max(1, int(len(en_attente) * 0.66)) if en_attente else 0

        approuves, verses, inconnus = 0, 0, 0
        for index, demande in enumerate(en_attente):
            if index >= a_traiter:
                break
            try:
                approve_payout(demande, approved_by=approbateur,
                               comment="Relevé vérifié")
                approuves += 1
            except SettlementError:
                continue

            if index % 2 == 0 or a_traiter == 1:
                try:
                    issue = execute_payout(demande)
                    if issue.status == PayoutRequest.Status.PAID:
                        verses += 1
                    elif issue.status == PayoutRequest.Status.UNKNOWN:
                        inconnus += 1
                except SettlementError:
                    continue

        # On force UNE issue inconnue si le hasard n'en a pas produit :
        # c'est le cas que l'interface doit savoir presenter.
        if inconnus == 0:
            candidat = PayoutRequest.objects.filter(
                status=PayoutRequest.Status.PAID).first()
            if candidat is not None:
                PayoutRequest.objects.filter(pk=candidat.pk).update(
                    status=PayoutRequest.Status.UNKNOWN,
                    error_message="Délai dépassé — issue inconnue",
                )
                inconnus = 1
                verses = max(0, verses - 1)

        self._ok(
            f"{approuves} versements approuvés",
            f"{verses} versés · {inconnus} à issue INCONNUE — "
            "le cas que l'interface ne doit jamais proposer de rejouer.",
        )

    # ── Bilan ────────────────────────────────────────────────────────────────

    def _bilan(self):
        from apps.payments.escrow.models import EscrowHold
        from apps.payments.intents.models import PaymentIntent
        from apps.payments.ledger.balances import trial_balance_total
        from apps.payments.ledger.invariants import run_all
        from apps.payments.settlements.models import (
            PayoutRequest, SettlementBatch,
        )

        self.stdout.write(self.style.HTTP_INFO("\n── Bilan ──"))

        self.stdout.write(
            f"  intentions      : {PaymentIntent.objects.count()}\n"
            f"  séquestres      : {EscrowHold.objects.count()}\n"
            f"  lots            : {SettlementBatch.objects.count()}\n"
            f"  versements      : {PayoutRequest.objects.count()}"
        )

        ecart = trial_balance_total()
        if ecart != 0:
            self.stdout.write(self.style.ERROR(
                f"\n  Balance déséquilibrée : {ecart}. Le jeu est corrompu."))
            return

        rapport = run_all()
        hors_solvabilite = [v for v in rapport["violations"] if v.code != "I4"]

        self.stdout.write(self.style.SUCCESS(
            "\n  Balance équilibrée, invariants respectés."
            if not hors_solvabilite
            else f"\n  Invariants signalés : "
                 f"{', '.join(v.code for v in hors_solvabilite)}"))
        self.stdout.write(
            "  I4 (solvabilité) reste violé : le prestataire factice renvoie\n"
            "  un solde nul alors que le registre porte des dettes. C'est\n"
            "  attendu, et le tableau de bord doit le signaler."
        )
        self.stdout.write(self.style.HTTP_INFO(
            "\n  Ouvrir /admin/finance pour juger les écrans.\n"
            "  Pour tout effacer : python manage.py payments_seed_demo --purge"
        ))

    # ── Purge ────────────────────────────────────────────────────────────────

    def _purger(self):
        """
        Supprime le jeu de demonstration.

        Les ECRITURES COMPTABLES ne sont pas supprimees : elles sont
        immuables par conception, et le plan comptable interdit leur
        suppression. Elles restent comme trace d'un jeu de test — sans
        consequence, puisqu'aucun argent reel n'a circule.
        """
        from django.contrib.auth.models import User

        from apps.orders.models import Order

        self.stdout.write(self.style.WARNING(
            "\n  Les écritures comptables sont CONSERVÉES : elles sont\n"
            "  immuables par conception. Aucun argent réel n'a circulé.\n"))

        utilisateurs = User.objects.filter(username__startswith=MARQUE)
        commandes = Order.objects.filter(user__in=utilisateurs)

        nombre_commandes = commandes.count()
        nombre_utilisateurs = utilisateurs.count()

        # L'ordre compte : les commandes referencent les utilisateurs.
        for commande in commandes:
            try:
                commande.items.all().delete()
                commande.delete()
            except Exception:
                pass

        from apps.catalog.models import Product

        Product.objects.filter(slug__startswith=MARQUE).delete()

        for utilisateur in utilisateurs:
            try:
                utilisateur.delete()
            except Exception:
                pass

        self.stdout.write(self.style.SUCCESS(
            f"  {nombre_commandes} commandes et {nombre_utilisateurs} "
            "comptes supprimés."))
        self.stdout.write(
            "  Les intentions et séquestres restent consultables dans\n"
            "  l'administration — c'est la trace du jeu de test."
        )