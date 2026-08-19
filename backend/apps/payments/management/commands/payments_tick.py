# backend/apps/payments/management/commands/payments_tick.py
# Point d'entree unique des taches planifiees du module financier.
#
#   python manage.py payments_tick --list
#   python manage.py payments_tick --group fast
#   python manage.py payments_tick --only escrow_release
#   python manage.py payments_tick --health
#   python manage.py payments_tick --crontab
#
# ─────────────────────────────────────────────────────────────────────────────
# UTILISABLE IMMEDIATEMENT, SANS CELERY
#
# Cette commande execute les memes fonctions que celles que Celery portera
# plus tard. Elle permet de planifier le module financier avec le cron du
# VPS des aujourd'hui, sans nouveau conteneur ni modification du point
# d'entree Django.
#
# `--crontab` genere les lignes de crontab pretes a coller.
# ─────────────────────────────────────────────────────────────────────────────
#
# ISOLATION : l'echec d'une tache n'interrompt jamais les suivantes. Une
# erreur sur la construction des lots ne doit pas empecher la detection des
# paiements bloques.

import sys

from django.core.management.base import BaseCommand

from apps.payments.tasks.base import REGISTRY, run_task
from apps.payments.tasks.jobs import GROUPS, SCHEDULE
from apps.payments.tasks.models import TaskRun


class Command(BaseCommand):
    help = "Execute les taches planifiees du module financier."

    def add_arguments(self, parser):
        parser.add_argument("--list", action="store_true",
                            help="Liste les taches disponibles.")
        parser.add_argument("--group", type=str, default=None,
                            help=f"Groupe : {', '.join(GROUPS)}")
        parser.add_argument("--only", type=str, default=None,
                            help="Une seule tache, par son nom.")
        parser.add_argument("--health", action="store_true",
                            help="Etat de sante des taches.")
        parser.add_argument("--crontab", action="store_true",
                            help="Genere les lignes de crontab.")
        parser.add_argument("--strict", action="store_true",
                            help="Code de sortie 1 si une tache echoue.")

    def handle(self, *args, **options):
        if options["list"]:
            return self._lister()
        if options["health"]:
            return self._sante()
        if options["crontab"]:
            return self._crontab()

        if options["only"]:
            if options["only"] not in REGISTRY:
                self.stdout.write(self.style.ERROR(
                    f"Tache inconnue : {options['only']}\n"
                    f"Disponibles : {', '.join(sorted(REGISTRY))}"
                ))
                sys.exit(1)
            taches = [options["only"]]
        elif options["group"]:
            if options["group"] not in GROUPS:
                self.stdout.write(self.style.ERROR(
                    f"Groupe inconnu : {options['group']}\n"
                    f"Disponibles : {', '.join(GROUPS)}"
                ))
                sys.exit(1)
            taches = [
                e["task"] for e in SCHEDULE if e["group"] == options["group"]
            ]
        else:
            taches = [e["task"] for e in SCHEDULE]

        echecs = 0
        for nom in taches:
            resultat = run_task(nom)

            if resultat.get("error"):
                echecs += 1
                self.stdout.write(self.style.ERROR(f"  [KO ] {nom}"))
                self.stdout.write(f"         {resultat['error'][:160]}")
                continue

            if resultat.get("skipped"):
                self.stdout.write(self.style.WARNING(
                    f"  [--- ] {nom} — deja en cours ailleurs"
                ))
                continue

            self.stdout.write(self.style.SUCCESS(f"  [OK ] {nom}"))
            detail = self._resume(resultat)
            if detail:
                self.stdout.write(f"         {detail}")

            if resultat.get("must_freeze_payouts"):
                self.stdout.write(self.style.ERROR(
                    "         INVARIANT COMPTABLE VIOLE — "
                    "gel des versements requis."
                ))
            if resultat.get("exceptional_alert"):
                self.stdout.write(self.style.ERROR(
                    "         ALERTE : part de reglements hors cycle trop "
                    "elevee. Exposition reglementaire."
                ))
            if resultat.get("inconnus"):
                self.stdout.write(self.style.ERROR(
                    f"         {resultat['inconnus']} versement(s) a issue "
                    "INCONNUE. Ne jamais retenter sans reconciliation."
                ))

        if echecs:
            self.stdout.write(self.style.ERROR(f"\n{echecs} tache(s) en echec."))
            if options["strict"]:
                sys.exit(1)

    # ── Affichages ───────────────────────────────────────────────────────────

    @staticmethod
    def _resume(resultat: dict) -> str:
        interessants = [
            (cle, valeur) for cle, valeur in resultat.items()
            if isinstance(valeur, (int, bool)) and valeur and cle != "ok"
        ]
        return " · ".join(f"{cle}={valeur}" for cle, valeur in interessants[:6])

    def _lister(self):
        self.stdout.write(self.style.HTTP_INFO("── Taches disponibles ──\n"))
        for groupe, libelle in GROUPS.items():
            self.stdout.write(self.style.HTTP_INFO(f"{groupe} — {libelle}"))
            for entree in SCHEDULE:
                if entree["group"] != groupe:
                    continue
                info = REGISTRY.get(entree["task"], {})
                marque = " [CRITIQUE]" if info.get("critical") else ""
                self.stdout.write(
                    f"  {entree['task']:26} toutes les "
                    f"{entree['every_minutes']:>4} min{marque}"
                )
                if info.get("description"):
                    for ligne in _envelopper(info["description"], 66):
                        self.stdout.write(f"      {ligne}")
            self.stdout.write("")

    def _sante(self):
        sante = TaskRun.health(max_age_minutes=120)
        self.stdout.write(self.style.HTTP_INFO("── Sante des taches ──\n"))
        for item in sante:
            if item["alert"]:
                style, marque = self.style.ERROR, "ALERTE "
            elif item["stale"]:
                style, marque = self.style.WARNING, "retard "
            else:
                style, marque = self.style.SUCCESS, "a jour "
            dernier = (
                item["last_success_at"].strftime("%Y-%m-%d %H:%M")
                if item["last_success_at"] else "jamais executee"
            )
            critique = " [CRITIQUE]" if item["critical"] else ""
            self.stdout.write(style(
                f"  [{marque}] {item['task_name']:26} {dernier}{critique}"
            ))

        alertes = [s for s in sante if s["alert"]]
        if alertes:
            self.stdout.write(self.style.ERROR(
                f"\n{len(alertes)} tache(s) CRITIQUE(S) muette(s).\n"
                "Sans elles, des paiements restent invisibles et des vendeurs "
                "ne sont jamais payes."
            ))

    def _crontab(self):
        self.stdout.write(self.style.HTTP_INFO(
            "── Lignes de crontab ──\n"
            "# A coller dans le crontab du VPS.\n"
            "# Adapter le chemin du projet et le nom du conteneur.\n"
        ))
        chemin = "/var/www/belivay"
        base = (
            f"cd {chemin} && docker compose -f docker-compose.prod.yml "
            "exec -T backend python manage.py payments_tick"
        )
        cadences = {
            "fast": "* * * * *",
            "regular": "*/15 * * * *",
            "payout": "*/10 * * * *",
            "settlement": "30 2 * * *",
            "daily": "0 3 * * *",
        }
        for groupe, cadence in cadences.items():
            self.stdout.write(f"# {GROUPS[groupe]}")
            self.stdout.write(
                f"{cadence} {base} --group {groupe} "
                f">> /var/log/belivay-payments.log 2>&1\n"
            )
        self.stdout.write(self.style.WARNING(
            "Le verrou distribue empeche tout chevauchement : une execution "
            "qui deborde\nsur la suivante fait simplement ignorer la seconde."
        ))


def _envelopper(texte: str, largeur: int) -> list[str]:
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