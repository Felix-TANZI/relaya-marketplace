# backend/apps/payments/management/commands/verify_ledger_integrity.py
# Verification des invariants du registre comptable.
#
#   python manage.py verify_ledger_integrity
#   python manage.py verify_ledger_integrity --limit 500
#   python manage.py verify_ledger_integrity --strict   (code de sortie 1 si violation)
#
# A executer quotidiennement une fois l'ordonnanceur en place (Lot 9).

import sys

from django.core.management.base import BaseCommand

from apps.payments.ledger.balances import (
    psp_treasury,
    revenue_summary,
    third_party_liabilities,
    trial_balance,
)
from apps.payments.ledger.invariants import NOT_APPLICABLE, OK, VIOLATED, run_all


class Command(BaseCommand):
    help = "Verifie les invariants comptables et la chaine d'integrite."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=None,
                            help="Limite le controle aux N dernieres transactions.")
        parser.add_argument("--strict", action="store_true",
                            help="Code de sortie 1 en cas de violation.")
        parser.add_argument("--degraded", action="store_true", default=None,
                            help="Force le mode degrade (prestataire sans solde par operateur).")

    def handle(self, *args, **options):
        degrade = options["degraded"]
        if degrade is None:
            degrade = self._detect_degraded()

        rapport = run_all(degraded=degrade, limit=options["limit"])

        self.stdout.write(self.style.HTTP_INFO("── Invariants comptables ──"))
        for resultat in rapport["results"]:
            if resultat.status == OK:
                style, marque = self.style.SUCCESS, "OK "
            elif resultat.status == NOT_APPLICABLE:
                style, marque = self.style.WARNING, "N/A"
            else:
                style, marque = self.style.ERROR, "KO "
            self.stdout.write(style(f"  [{marque}] {resultat.code} — {resultat.name}"))
            if resultat.detail:
                self.stdout.write(f"          {resultat.detail}")

        self.stdout.write(self.style.HTTP_INFO("\n── Tresorerie PSP ──"))
        tresorerie = psp_treasury(degraded=degrade)
        for cle, valeur in tresorerie.items():
            if cle == "available":
                continue
            self.stdout.write(f"  {cle:32} {valeur}")

        self.stdout.write(self.style.HTTP_INFO("\n── Dettes envers les tiers ──"))
        dettes = third_party_liabilities()
        for code, montant in dettes["detail"].items():
            if montant:
                self.stdout.write(f"  {code:32} {montant:>15,}".replace(",", " "))
        self.stdout.write(f"  {'TOTAL':32} {dettes['total']:>15,}".replace(",", " "))

        self.stdout.write(self.style.HTTP_INFO("\n── Resultat BelivaY ──"))
        resultat_fin = revenue_summary()
        self.stdout.write(f"  Chiffre d'affaires               {resultat_fin['revenue_total']}")
        self.stdout.write(f"  Charges                          {resultat_fin['expense_total']}")
        self.stdout.write(f"  Marge nette                      {resultat_fin['net_margin_xaf']}")

        self.stdout.write(self.style.HTTP_INFO("\n── Balance generale ──"))
        lignes = trial_balance()
        if not lignes:
            self.stdout.write("  (registre vide)")
        for ligne in lignes:
            self.stdout.write(
                f"  {ligne['code']:6} {ligne['name'][:38]:40} "
                f"D {ligne['debit_xaf']:>13,} C {ligne['credit_xaf']:>13,}".replace(",", " ")
            )

        if rapport["ok"]:
            self.stdout.write(self.style.SUCCESS("\nTous les invariants sont respectes."))
            return

        self.stdout.write(self.style.ERROR(
            f"\n{len(rapport['violations'])} violation(s) detectee(s)."
        ))
        if rapport["must_freeze_payouts"]:
            self.stdout.write(self.style.ERROR(
                "GEL DES VERSEMENTS REQUIS — au moins une violation bloquante."
            ))
        if options["strict"]:
            sys.exit(1)

    def _detect_degraded(self) -> bool:
        try:
            from apps.payments.config.resolver import active_provider
            prestataire = active_provider()
            if prestataire is None:
                return True
            return not prestataire.exposes_balance_per_operator
        except Exception:
            return True