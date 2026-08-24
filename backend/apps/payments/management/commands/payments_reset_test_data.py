# backend/apps/payments/management/commands/payments_reset_test_data.py
# Efface les donnees de test du module financier.
#
#   python manage.py payments_reset_test_data --dry-run     # inventaire
#   python manage.py payments_reset_test_data --keep BLV-PAY-2026-0000050
#   python manage.py payments_reset_test_data --all         # tout effacer
#
# ─────────────────────────────────────────────────────────────────────────────
# POURQUOI CETTE COMMANDE EXISTE
#
# `payments_seed_demo --purge` supprime les commandes et les comptes de
# demonstration, mais LAISSE les ecritures comptables : elles sont immuables
# par conception.
#
# Consequence : le registre continue d'afficher des dettes fictives — 187 850
# XAF dus a des vendeurs qui n'existent plus. Un tableau de bord devient
# illisible, et l'invariant de solvabilite compare des chiffres qui ne
# correspondent a rien.
#
# Cette commande va plus loin : elle remet le module financier a zero, en
# conservant uniquement les paiements que l'on designe.
#
# ─────────────────────────────────────────────────────────────────────────────
# CE QU'ELLE NE FAIT PAS
#
# Elle ne s'utilise PAS en production. Effacer un registre comptable
# supprime la trace d'operations reelles — c'est exactement ce que
# l'immuabilite protege.
#
# Elle refuse donc de tourner si DEBUG est desactive, sauf mention
# explicite. Cette barriere est deliberement penible a franchir.
# ─────────────────────────────────────────────────────────────────────────────

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection, transaction


class Command(BaseCommand):
    help = "Efface les donnees de test du module financier."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run", action="store_true",
            help="Inventorie sans rien supprimer.")
        parser.add_argument(
            "--keep", action="append", default=[], metavar="REFERENCE",
            help="Reference d'intention a CONSERVER. Repetable.")
        parser.add_argument(
            "--keep-order", action="append", default=[], type=int,
            metavar="ID", help="Commande a conserver. Repetable.")
        parser.add_argument(
            "--all", action="store_true",
            help="Efface tout, y compris les paiements reels.")
        parser.add_argument(
            "--i-know-this-is-production", action="store_true",
            help="Franchit la barriere de production. A n'utiliser jamais.")

    # ── Affichage ────────────────────────────────────────────────────────────

    def _titre(self, texte):
        self.stdout.write(self.style.HTTP_INFO(f"\n── {texte} ──"))

    def _ok(self, texte):
        self.stdout.write(self.style.SUCCESS(f"  {texte}"))

    def _info(self, texte):
        self.stdout.write(f"  {texte}")

    # ── Point d'entree ───────────────────────────────────────────────────────

    def handle(self, *args, **options):
        if not settings.DEBUG and not options["i_know_this_is_production"]:
            self.stdout.write(self.style.ERROR(
                "\n  REFUS : DEBUG est desactive.\n\n"
                "  Cette commande efface des ecritures comptables. En\n"
                "  production, elle supprimerait la trace d'operations\n"
                "  reelles — ce que l'immuabilite du registre existe\n"
                "  precisement pour empecher.\n\n"
                "  Si vous savez ce que vous faites, ajoutez\n"
                "  --i-know-this-is-production.\n"))
            raise SystemExit(2)

        conserver = self._resoudre_conservees(options)
        inventaire = self._inventorier(conserver)

        if options["dry_run"]:
            self.stdout.write(self.style.WARNING(
                "\n  Inventaire seul — rien n'a ete supprime.\n"
                "  Relancer sans --dry-run pour appliquer.\n"))
            return

        self._effacer(conserver)
        self._verifier()

    # ── Ce qu'on garde ───────────────────────────────────────────────────────

    def _resoudre_conservees(self, options) -> set:
        """
        Les references d'intention a conserver.

        On accepte aussi des numeros de commande : c'est ce qu'un
        utilisateur a sous les yeux, une reference d'intention non.
        """
        from apps.payments.intents.models import PaymentIntent

        if options["all"]:
            return set()

        gardees = set(options["keep"])

        for order_id in options["keep_order"]:
            for intent in PaymentIntent.objects.all():
                if order_id in list(
                    intent.order_links.values_list("order_id", flat=True)
                ):
                    gardees.add(intent.reference)

        # Sans instruction, on garde tout ce qui a ete REELLEMENT encaisse.
        # C'est le comportement le plus sur : effacer un paiement abouti
        # par defaut serait un piege.
        if not gardees and not options["all"]:
            gardees = set(
                PaymentIntent.objects
                .filter(status=PaymentIntent.Status.SUCCEEDED)
                .values_list("reference", flat=True)
            )
            if gardees:
                self.stdout.write(self.style.WARNING(
                    f"\n  Aucune référence précisée : les "
                    f"{len(gardees)} paiement(s) ENCAISSÉ(S) sont conservés "
                    "par défaut.\n  Utiliser --all pour tout effacer."))

        return gardees

    # ── Inventaire ───────────────────────────────────────────────────────────

    def _inventorier(self, conserver: set) -> dict:
        from apps.payments.escrow.models import EscrowHold
        from apps.payments.intents.models import PaymentIntent
        from apps.payments.ledger.models import LedgerTransaction
        from apps.payments.settlements.models import (
            Adjustment, PayoutRequest, Refund, SettlementBatch,
        )

        self._titre("Inventaire")

        total = PaymentIntent.objects.count()
        a_effacer = PaymentIntent.objects.exclude(
            reference__in=conserver).count()

        self._info(f"intentions        : {total} — {a_effacer} à effacer")
        self._info(f"séquestres        : {EscrowHold.objects.count()}")
        self._info(f"lots de règlement : {SettlementBatch.objects.count()}")
        self._info(f"versements        : {PayoutRequest.objects.count()}")
        self._info(f"remboursements    : {Refund.objects.count()}")
        self._info(f"ajustements       : {Adjustment.objects.count()}")
        self._info(f"écritures         : {LedgerTransaction.objects.count()}")

        if conserver:
            self._titre("Conservés")
            for reference in sorted(conserver):
                intent = PaymentIntent.objects.filter(
                    reference=reference).first()
                if intent is None:
                    self.stdout.write(self.style.ERROR(
                        f"  {reference} — INTROUVABLE"))
                    continue
                commandes = list(
                    intent.order_links.values_list("order_id", flat=True))
                self._ok(
                    f"{reference} · {intent.status} · "
                    f"{intent.amount_xaf} FCFA · commandes {commandes}")

        return {"total": total, "a_effacer": a_effacer}

    # ── Effacement ───────────────────────────────────────────────────────────

    def _effacer(self, conserver: set):
        """
        ─────────────────────────────────────────────────────────────────────
        L'ORDRE COMPTE, ET LES CONTRAINTES AUSSI

        Le registre est protege par des declencheurs qui interdisent la
        suppression d'une ecriture. On les desactive le temps de
        l'operation — ce qui n'est acceptable QUE parce que cette commande
        refuse de tourner en production.

        `session_replication_role = replica` suspend les declencheurs pour
        la session courante uniquement. Le retablissement est immediat.
        ─────────────────────────────────────────────────────────────────────
        """
        from apps.payments.intents.models import PaymentIntent

        self._titre("Effacement")

        references = set(
            PaymentIntent.objects.exclude(reference__in=conserver)
            .values_list("reference", flat=True)
        )
        if not references and conserver:
            self._ok("Rien à effacer.")
            return

        with transaction.atomic():
            with connection.cursor() as curseur:
                curseur.execute("SET session_replication_role = 'replica';")
                try:
                    self._effacer_lignes(curseur, conserver)
                finally:
                    # Retabli meme en cas d'echec : laisser les declencheurs
                    # desactives serait bien pire que l'echec lui-meme.
                    curseur.execute("SET session_replication_role = 'origin';")

        self._ok(f"{len(references)} intention(s) effacée(s).")

    def _effacer_lignes(self, curseur, conserver: set):
        from apps.payments.intents.models import PaymentIntent

        gardees = list(conserver)

        # Les identifiants a conserver, dans chaque table.
        if gardees:
            intents_gardes = list(
                PaymentIntent.objects.filter(reference__in=gardees)
                .values_list("id", flat=True)
            )
        else:
            intents_gardes = []

        garde_sql = ""
        params = []
        if intents_gardes:
            marques = ",".join(["%s"] * len(intents_gardes))
            garde_sql = f" AND intent_id NOT IN ({marques})"
            params = intents_gardes

        # ── Ordre : du plus dependant au moins dependant ──────────────────
        etapes = [
            ("payments_payoutapproval", None),
            ("payments_payoutrequest", None),
            ("payments_settlementbatch_covered_holds", None),
            ("payments_settlementbatch_applied_adjustments", None),
            ("payments_settlementbatch", None),
            ("payments_adjustment", None),
            ("payments_refund_source_holds", None),
            ("payments_refund", f"WHERE TRUE{garde_sql}"),
            ("payments_escrowevent", None),
            ("payments_escrowhold", f"WHERE TRUE{garde_sql}"),
            ("payments_paymentintentorder", f"WHERE TRUE{garde_sql}"),
            ("payments_paymentattempt", f"WHERE TRUE{garde_sql}"),
        ]

        for table, condition in etapes:
            try:
                if condition:
                    curseur.execute(f"DELETE FROM {table} {condition};", params)
                else:
                    curseur.execute(f"DELETE FROM {table};")
                self._info(f"{table} : {curseur.rowcount} ligne(s)")
            except Exception as exc:
                self.stdout.write(self.style.WARNING(
                    f"  {table} : ignorée ({type(exc).__name__})"))

        # Les intentions
        if intents_gardes:
            marques = ",".join(["%s"] * len(intents_gardes))
            curseur.execute(
                f"DELETE FROM payments_paymentintent WHERE id NOT IN ({marques});",
                intents_gardes)
        else:
            curseur.execute("DELETE FROM payments_paymentintent;")
        self._info(f"payments_paymentintent : {curseur.rowcount} ligne(s)")

        # ── Le registre ────────────────────────────────────────────────────
        # On efface TOUT le registre puis on le reconstruit a partir des
        # paiements conserves. Effacer selectivement laisserait des
        # ecritures orphelines et une balance desequilibree.
        curseur.execute("DELETE FROM payments_ledgerentry;")
        self._info(f"payments_ledgerentry : {curseur.rowcount} ligne(s)")
        curseur.execute("DELETE FROM payments_ledgertransaction;")
        self._info(f"payments_ledgertransaction : {curseur.rowcount} ligne(s)")

        # Les executions de reconciliation et de taches, sans valeur ici.
        for table in ("payments_discrepancy", "payments_reconciliationrun",
                      "payments_risksignal", "payments_riskassessment",
                      "payments_trustscore", "payments_taskrun"):
            try:
                curseur.execute(f"DELETE FROM {table};")
                self._info(f"{table} : {curseur.rowcount} ligne(s)")
            except Exception:
                pass

    # ── Verification ─────────────────────────────────────────────────────────

    def _verifier(self):
        """
        Le registre est vide : la balance est nulle et les invariants
        passent trivialement. C'est normal, et il faut le dire.
        """
        from apps.payments.escrow.models import EscrowHold
        from apps.payments.intents.models import PaymentIntent
        from apps.payments.ledger.balances import trial_balance_total
        from apps.payments.ledger.invariants import run_all

        self._titre("Après effacement")

        self._info(f"intentions restantes : {PaymentIntent.objects.count()}")
        self._info(f"séquestres restants  : {EscrowHold.objects.count()}")

        ecart = trial_balance_total()
        rapport = run_all()

        if ecart == 0 and rapport["ok"]:
            self._ok("Balance équilibrée, invariants respectés.")
        else:
            self.stdout.write(self.style.ERROR(
                f"  Balance : {ecart} · violations : "
                f"{[v.code for v in rapport['violations']]}"))

        self.stdout.write(self.style.WARNING(
            "\n  Le registre comptable a été VIDÉ.\n"
            "\n  Les paiements conservés existent toujours comme intentions,\n"
            "  mais leurs écritures ont disparu : le tableau de bord\n"
            "  affichera zéro. C'est le prix d'un repartir-propre.\n"
            "\n  Pour reconstituer un séquestre sur un paiement conservé,\n"
            "  refaire un encaissement réel plutôt que de rejouer des\n"
            "  écritures — le registre ne se réécrit pas.\n"))