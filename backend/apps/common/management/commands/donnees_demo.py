"""
Dit si la base courante contient des donnees de demonstration — tache D31.

Empecher d'en creer (le garde-fou de apps/common/demonstration.py) ne dit pas
si un serveur en contient deja. Avant d'ouvrir belivay.com au public, on veut
une reponse nette a « est-ce que ce serveur est propre ? ».

    python manage.py donnees_demo

Sortie : rien trouve -> code 0. Quelque chose trouve -> code 1, ce qui permet
de s'en servir dans un controle automatique de mise en ligne.
"""

from django.core.management.base import BaseCommand

from apps.common.demonstration import comptes_de_demonstration, demonstration_autorisee


class Command(BaseCommand):
    help = "Verifie qu'aucune donnee de demonstration ne traine dans la base."

    def handle(self, *args, **options):
        comptes = list(comptes_de_demonstration())

        etat = "OUVERTS" if demonstration_autorisee() else "fermes"
        self.stdout.write(f"Jeux de demonstration : {etat} "
                          f"(DONNEES_DEMO_AUTORISEES)")
        self.stdout.write("")

        if not comptes:
            self.stdout.write(self.style.SUCCESS(
                "Aucun compte de demonstration. La base est propre."
            ))
            return

        self.stdout.write(self.style.ERROR(
            f"{len(comptes)} compte(s) de demonstration trouve(s) :"
        ))
        for compte in comptes:
            # Ce que le compte traine derriere lui compte autant que lui : une
            # boutique de demonstration est visible du public, pas son compte.
            details = []
            for relation, libelle in (
                ("vendor_profile", "boutique"),
                ("products", "offre(s)"),
                ("orders", "commande(s)"),
            ):
                objet = getattr(compte, relation, None)
                if objet is None:
                    continue
                if hasattr(objet, "count"):
                    nombre = objet.count()
                    if nombre:
                        details.append(f"{nombre} {libelle}")
                else:
                    details.append(libelle)
            suffixe = f"  ({', '.join(details)})" if details else ""
            self.stdout.write(f"  - {compte.username}{suffixe}")

        self.stdout.write("")
        self.stdout.write(
            "Ces comptes et ce qu'ils portent sont visibles des visiteurs.\n"
            "A retirer avant d'ouvrir le site au public (D31)."
        )
        # Code de sortie 1 : utilisable comme controle avant mise en ligne.
        raise SystemExit(1)
