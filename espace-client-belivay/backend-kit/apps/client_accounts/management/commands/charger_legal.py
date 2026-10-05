# backend/apps/client_accounts/management/commands/charger_legal.py
# Charge une version des textes légaux (CL-13) dans VersionLegale.
#
#     python manage.py charger_legal --version-legale 1.0 --publiee 2026-08-01
#     python manage.py charger_legal --version-legale 2.0 --publiee 2026-10-01 --changement "Retours : …" --changement "…"
#     python manage.py charger_legal --fichier ../site/src/demo/legal.ts --version-legale 1.0 --publiee 2026-08-01
#
# Fichier par défaut : apps/client_accounts/donnees/legal.json, copie de site/src/demo/legal.ts (textes du
# prototype du 1er octobre, FR et EN). Un fichier .ts du site est lu directement : son tableau LEGAL est un littéral
# (clés sans guillemets, chaînes JSON), converti en JSON sans rien évaluer. Version déjà chargée : remplacée
# (--remplacer) ou refusée.

import json
import re
from datetime import datetime
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.client_core.temps import YAOUNDE

DEFAUT = Path(__file__).resolve().parents[2] / "donnees" / "legal.json"


def documents_depuis_ts(texte: str) -> list[dict]:
    """Le tableau `export const LEGAL: DocumentLegal[] = [...]` d'un fichier du site, en JSON."""
    debut = texte.find("[", texte.index("=", texte.index("export const LEGAL")))
    if debut < 0:
        raise ValueError("tableau LEGAL introuvable")
    corps = texte[debut:].strip()
    corps = re.sub(r"^(\s*)([A-Za-z_]\w*):", r'\1"\2":', corps, flags=re.MULTILINE)
    corps = re.sub(r",(\s*[\]}])", r"\1", corps)  # virgules finales permises en TypeScript
    return json.loads(corps)


def lire_documents(chemin: Path) -> list[dict]:
    texte = chemin.read_text(encoding="utf-8")
    documents = documents_depuis_ts(texte) if chemin.suffix == ".ts" else json.loads(texte)
    for d in documents:
        if not {"cle", "icone", "aAccepter", "fr", "en"} <= set(d):
            raise ValueError(f"document incomplet : {d.get('cle')!r}")
    return documents


class Command(BaseCommand):
    help = "Charge une version des textes légaux (CL-13) depuis un fichier JSON ou le legal.ts du site."

    def add_arguments(self, parser):
        parser.add_argument("--fichier", default=str(DEFAUT))
        parser.add_argument("--version-legale", required=True, help="« 1.0 » (--version est pris par Django)")
        parser.add_argument("--publiee", required=True, help="AAAA-MM-JJ (minuit, heure de Yaoundé)")
        parser.add_argument("--changement", action="append", default=[], help="un point « ce qui change » (répétable)")
        parser.add_argument("--remplacer", action="store_true")

    def handle(self, *args, **o):
        from apps.client_accounts.models import VersionLegale

        try:
            documents = lire_documents(Path(o["fichier"]))
            publiee = datetime.strptime(o["publiee"], "%Y-%m-%d").replace(tzinfo=YAOUNDE)
        except (OSError, ValueError) as exc:
            raise CommandError(str(exc)) from exc
        existe = VersionLegale.objects.filter(version=o["version_legale"]).first()
        if existe is not None and not o["remplacer"]:
            raise CommandError(f"La version {o['version_legale']} est déjà chargée (--remplacer pour la remplacer).")
        VersionLegale.objects.update_or_create(
            version=o["version_legale"], defaults={"publiee_le": publiee, "documents": documents, "changements": o["changement"]}
        )
        self.stdout.write(
            self.style.SUCCESS(f"Textes légaux {o['version_legale']} : {len(documents)} documents, publiés le {o['publiee']}.")
        )
