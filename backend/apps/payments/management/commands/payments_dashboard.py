# backend/apps/payments/management/commands/payments_dashboard.py
# Synthese financiere de la plateforme, en terminal.
#
#   python manage.py payments_dashboard
#   python manage.py payments_dashboard --offline     # sans appel prestataire
#   python manage.py payments_dashboard --signals     # les alertes seules
#   python manage.py payments_dashboard --json        # pour la supervision
#
# ─────────────────────────────────────────────────────────────────────────────
# LA QUESTION DU MATIN
#
#   « Est-ce que tout va bien ? »
#
# Trente ecrans d'administration repondent a trente questions precises.
# Aucun ne repond a celle-la. Cette commande la traite en dix lignes, et
# indique OU REGARDER quand quelque chose cloche.
#
# LECTURE SEULE : elle ne modifie rien, ne declenche rien, ne cree rien.
# ─────────────────────────────────────────────────────────────────────────────
#
# CODE DE SORTIE — pour la supervision
#   0  tout va bien, ou simple attention
#   1  alerte
#   2  critique — intervention immediate

import json
import sys

from django.core.management.base import BaseCommand

from apps.payments.reporting.dashboard import (
    ALERTE, ATTENTION, CRITIQUE, NORMAL, build,
)


def fcfa(montant) -> str:
    if montant is None:
        return "—"
    valeur = int(montant)
    signe = "-" if valeur < 0 else ""
    return f"{signe}{abs(valeur):,}".replace(",", " ")


class Command(BaseCommand):
    help = "Synthese financiere de la plateforme."

    def add_arguments(self, parser):
        parser.add_argument("--offline", action="store_true",
                            help="N'interroge pas le prestataire.")
        parser.add_argument("--signals", action="store_true",
                            help="Affiche uniquement les points d'attention.")
        parser.add_argument("--json", action="store_true",
                            help="Sortie machine, pour la supervision.")
        parser.add_argument("--days", type=int, default=7)

    def handle(self, *args, **options):
        donnees = build(
            interroger_prestataire=not options["offline"],
            jours=options["days"],
        )

        if options["json"]:
            self.stdout.write(json.dumps(donnees, indent=2, ensure_ascii=False,
                                         default=str))
        elif options["signals"]:
            self._signaux(donnees)
        else:
            self._complet(donnees)

        pire = donnees["worst"]
        sys.exit({CRITIQUE: 2, ALERTE: 1}.get(pire, 0))

    # ── Affichage ────────────────────────────────────────────────────────────

    def _titre(self, texte):
        self.stdout.write(self.style.HTTP_INFO(f"\n── {texte} ──"))

    def _ligne(self, libelle, valeur, suffixe="FCFA"):
        self.stdout.write(f"  {libelle:38} {valeur:>14} {suffixe}")

    def _signaux(self, donnees):
        signaux = donnees["signals"]
        if not signaux:
            self.stdout.write(self.style.SUCCESS(
                "  Aucun point d'attention."))
            return

        styles = {
            CRITIQUE: self.style.ERROR,
            ALERTE: self.style.ERROR,
            ATTENTION: self.style.WARNING,
            NORMAL: self.style.SUCCESS,
        }
        for signal in signaux:
            style = styles[signal["gravite"]]
            self.stdout.write(style(
                f"\n  [{signal['gravite']}] {signal['titre']}"))
            if signal["detail"]:
                self.stdout.write(f"      {signal['detail']}")
            if signal["action"]:
                # L'action est ce qui distingue une alerte utile d'une
                # alerte ignoree.
                for ligne in _envelopper(signal["action"], 66):
                    self.stdout.write(f"      -> {ligne}")

    def _complet(self, donnees):
        moment = donnees["generated_at"]
        self.stdout.write(self.style.HTTP_INFO(
            f"\n╔════════════════════════════════════════════════════════════╗\n"
            f"║  BelivaY — synthese financiere                             ║\n"
            f"║  {moment:%Y-%m-%d %H:%M}                                          ║\n"
            f"╚════════════════════════════════════════════════════════════╝"))

        # ── Points d'attention EN PREMIER ───────────────────────────────────
        # On lit les trois premieres lignes d'un tableau de bord, rarement
        # les quinze. Ce qui compte doit venir en tete.
        self._titre("Points d'attention")
        self._signaux(donnees)

        # ── Tresorerie ──────────────────────────────────────────────────────
        t = donnees["treasury"]
        self._titre("Tresorerie")
        if t["provider_total_xaf"] is not None:
            self._ligne("Solde reel chez le prestataire",
                        fcfa(t["provider_total_xaf"]))
            for operateur, montant in (t["provider_per_operator"] or {}).items():
                self._ligne(f"  dont {operateur}", fcfa(montant))
        elif t.get("provider_error"):
            self.stdout.write(self.style.WARNING(
                f"  Solde prestataire indisponible : {t['provider_error'][:60]}"))

        self._ligne("Tresorerie au registre", fcfa(t["ledger_treasury_xaf"]))
        if t["in_transit_xaf"]:
            self.stdout.write(self.style.WARNING(
                f"  {'dont EN TRANSIT (issue inconnue)':38} "
                f"{fcfa(t['in_transit_xaf']):>14} FCFA"))
        self.stdout.write("")
        self._ligne("Sous sequestre", fcfa(t["escrow_xaf"]))
        self._ligne("Dettes exigibles", fcfa(t["payables_xaf"]))
        self._ligne("Total du aux tiers",
                    fcfa(t["third_party_liabilities_xaf"]))

        if t["coverage_xaf"] is not None:
            style = (self.style.SUCCESS if t["coverage_xaf"] >= 0
                     else self.style.ERROR)
            self.stdout.write(style(
                f"  {'COUVERTURE':38} {fcfa(t['coverage_xaf']):>14} FCFA"))

        # ── Sequestres ──────────────────────────────────────────────────────
        e = donnees["escrow"]
        self._titre("Sequestres")
        if not e["by_status"]:
            self.stdout.write("  Aucun sequestre.")
        for statut, valeurs in sorted(e["by_status"].items()):
            self.stdout.write(
                f"  {statut:24} {valeurs['count']:>4} · "
                f"{fcfa(valeurs['total_xaf']):>12} FCFA")
        if e["due_for_auto_confirm"] or e["due_for_release"]:
            self.stdout.write(self.style.WARNING(
                f"  Echeances depassees : "
                f"{e['due_for_auto_confirm']} a auto-confirmer, "
                f"{e['due_for_release']} a liberer"))

        # ── Reglements ──────────────────────────────────────────────────────
        r = donnees["settlements"]
        self._titre("Reglements")
        for statut, valeurs in sorted(r["batches_by_status"].items()):
            self.stdout.write(
                f"  lot {statut:20} {valeurs['count']:>4} · "
                f"{fcfa(valeurs['total_xaf']):>12} FCFA")
        for statut, valeurs in sorted(r["payouts_by_status"].items()):
            style = (self.style.ERROR if statut == "UNKNOWN"
                     else lambda x: x)
            self.stdout.write(style(
                f"  versement {statut:14} {valeurs['count']:>4} · "
                f"{fcfa(valeurs['total_xaf']):>12} FCFA"))

        exceptionnel = r["exceptional"]
        if exceptionnel["total_batches"]:
            style = (self.style.ERROR if exceptionnel["alert"]
                     else self.style.SUCCESS)
            self.stdout.write(style(
                f"  Part hors cycle : "
                f"{exceptionnel['share_by_amount_percent']} % en montant "
                f"(seuil {exceptionnel['alert_threshold_percent']} %)"))

        # ── Integrite ───────────────────────────────────────────────────────
        i = donnees["integrity"]
        self._titre("Integrite")
        style = self.style.SUCCESS if i["trial_balance"] == 0 else self.style.ERROR
        self.stdout.write(style(
            f"  {'Balance generale':38} {fcfa(i['trial_balance']):>14}"))

        if i["invariants_ok"]:
            self.stdout.write(self.style.SUCCESS(
                "  Invariants comptables : tous respectes"))
        else:
            for violation in i["violations"]:
                marque = "BLOQUANT" if violation["blocking"] else "signale"
                style = (self.style.ERROR if violation["blocking"]
                         else self.style.WARNING)
                self.stdout.write(style(
                    f"  {violation['code']} [{marque}] {violation['name']}"))
                self.stdout.write(f"      {violation['detail'][:90]}")

        ecarts = i["discrepancies"]
        if ecarts["open_total"]:
            self.stdout.write(
                f"  Ecarts ouverts : {ecarts['open_total']} "
                f"({ecarts['critical_open']} critique(s)) · "
                f"{fcfa(ecarts['total_gap_xaf'])} FCFA")

        # ── Ordonnanceur ────────────────────────────────────────────────────
        o = donnees["scheduler"]
        self._titre("Ordonnanceur")
        for tache in o["tasks"]:
            if tache["alert"]:
                style, marque = self.style.ERROR, "ALERTE"
            elif tache["stale"]:
                style, marque = self.style.WARNING, "retard"
            else:
                style, marque = self.style.SUCCESS, "a jour"
            dernier = (tache["last_success_at"].strftime("%m-%d %H:%M")
                       if tache["last_success_at"] else "jamais")
            critique = " [CRITIQUE]" if tache["critical"] else ""
            self.stdout.write(style(
                f"  [{marque:6}] {tache['task_name']:26} {dernier}{critique}"))

        # ── Activite ────────────────────────────────────────────────────────
        a = donnees["activity"]
        self._titre(f"Activite sur {a['period_days']} jours")
        self._ligne("Encaisse", fcfa(a["collected_xaf"]))
        self.stdout.write(f"  {'Intentions creees':38} {a['intents_total']:>14}")
        if a["pending"]:
            self.stdout.write(self.style.WARNING(
                f"  {'dont en attente de confirmation':38} "
                f"{a['pending']:>14}"))

        # ── Verdict ─────────────────────────────────────────────────────────
        pire = donnees["worst"]
        self.stdout.write("")
        if pire == NORMAL:
            self.stdout.write(self.style.SUCCESS(
                "  Aucun point d'attention."))
        elif pire == ATTENTION:
            self.stdout.write(self.style.WARNING(
                "  Points d'attention sans urgence."))
        elif pire == ALERTE:
            self.stdout.write(self.style.ERROR(
                "  ALERTE — intervention requise."))
        else:
            self.stdout.write(self.style.ERROR(
                "  CRITIQUE — GELER LES VERSEMENTS et intervenir "
                "immediatement."))


def _envelopper(texte: str, largeur: int) -> list:
    mots, lignes, courante = texte.split(), [], ""
    for mot in mots:
        if len(courante) + len(mot) + 1 > largeur:
            lignes.append(courante)
            courante = mot
        else:
            courante = f"{courante} {mot}".strip()
    if courante:
        lignes.append(courante)
    return lignes