"""
Charge les données de RÉFÉRENCE d'une base neuve, et rien d'autre — DEV-SRV-01, T02-4 :
« Charger uniquement les données de référence : les 12 zones de Yaoundé, les catégories et la taxonomie, les grilles
tarifaires, les paramètres, puis créer les comptes d'administration BelivaY. »

    python manage.py migrate
    python manage.py charger_reference

Ce que font déjà les migrations (rien à relancer) : les 157 réglages r_ et les 23 tables t_ (dont t_zones,
t_quartiers, t_grille_reference), les groupes de droits, les états de produit, les services externes. Les 12 zones
(shipping.Zone) sont synchronisées après chaque migrate ; on le refait ici pour en être sûr.

Ce que fait cette commande, dans l'ordre, sans créer aucun compte, boutique, produit ni commande :
catégories et taxonomie, attributs, marques, couleurs, plan comptable, configuration financière, groupe finance,
paramètres métier, questions fréquentes. Chaque étape est idempotente : relancer ne double rien.

Le prestataire de paiement factice (MOCK) que crée la configuration financière est DÉSACTIVÉ ici, sauf sur un serveur
de démonstration (DONNEES_DEMO_AUTORISEES=1) : sur le site réel, un paiement factice validerait une commande sans
argent. CamPay reste désactivé, en mode test, jusqu'à son activation par l'administration (R7, T21).

Les comptes d'administration ne sont PAS créés ici (un mot de passe n'a rien à faire dans une commande) : la commande
rappelle la marche à suivre à la fin. Les textes légaux non plus : leur publication (version, date) est une décision
de la direction (`charger_legal --version-legale … --publiee …`).
"""

from django.core.management import call_command
from django.core.management.base import BaseCommand

from apps.common.demonstration import demonstration_autorisee

#: (commande, ce qu'elle charge) — l'ordre compte : les attributs et les marques supposent les catégories.
ETAPES = (
    ("seed_electronics_taxonomy", "catégories Électronique"),
    ("seed_electronics_attributes", "attributs des catégories Électronique"),
    ("seed_extended_taxonomy", "les 12 autres univers de catégories"),
    ("seed_brands", "registre des marques"),
    ("seed_color_dictionary", "dictionnaire des couleurs"),
    ("seed_chart_of_accounts", "plan comptable"),
    ("seed_financial_config", "configuration financière (véhicules, frais, séquestre, versements)"),
    ("payments_finance_group", "groupe et droits « finance »"),
    ("charger_parametres", "paramètres métier en vigueur"),
    ("charger_faq", "questions fréquentes"),
)


class Command(BaseCommand):
    help = "Charge uniquement les données de référence d'une base neuve (DEV-SRV-01, T02)."

    def handle(self, *args, **options):
        from apps.shipping.zones import synchroniser_zones

        self.stdout.write(f"Zones de Yaoundé : {synchroniser_zones()} synchronisée(s).")
        for commande, libelle in ETAPES:
            self.stdout.write(self.style.HTTP_INFO(f"\n── {libelle} ({commande})"))
            call_command(commande, stdout=self.stdout, stderr=self.stderr)

        self._prestataire_factice()
        self.stdout.write(self.style.SUCCESS("\nDonnées de référence chargées."))
        self.stdout.write(
            "\nReste à faire à la main :\n"
            "  1. Comptes d'administration : `python manage.py createsuperuser` (direction), puis les autres comptes\n"
            "     depuis l'admin, rattachés à leurs groupes (gestion-*, finance, agents-terrain…).\n"
            "  2. Textes légaux : `python manage.py charger_legal --version-legale 1.0 --publiee AAAA-MM-JJ`.\n"
            "  3. Vérifier que la base est vide de toute activité : `python manage.py compter_tables`.\n"
        )

    def _prestataire_factice(self):
        from apps.payments.config.models import ProviderConfig
        from apps.payments.config.resolver import invalidate_cache

        if demonstration_autorisee():
            self.stdout.write("Serveur de démonstration : le prestataire factice MOCK reste actif.")
            return
        # Une configuration financière ne se modifie pas : on clôture sa version (VersionedConfig.close).
        versions = list(ProviderConfig.current().filter(provider_code="MOCK"))
        for version in versions:
            version.close()
        if versions:
            invalidate_cache()
            self.stdout.write(self.style.WARNING(
                "Prestataire factice MOCK clôturé (site réel : aucun paiement sans argent)."))
