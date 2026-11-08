# DEV-SRV-01, T01 / T02 : données de démonstration à part, données de référence seules sur une base neuve, et
# comptage des tables (la capture de T02). Règle R4 : « Aucune donnée fictive dans la base réelle, aucun chargement
# automatique au déploiement. »

from io import StringIO
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from django.urls import reverse

from apps.catalog.models import Category, Product
from apps.common.demonstration import comptes_de_demonstration
from apps.payments.config.models import ProviderConfig
from apps.vendors.models import SubscriptionPlan, VendorProfile

RACINE = Path(settings.BASE_DIR).parent


def lancer(*args, **options):
    sortie = StringIO()
    call_command(*args, stdout=sortie, stderr=StringIO(), **options)
    return sortie.getvalue()


class AucunChargementAuDeploiementTests(TestCase):
    def test_une_base_migree_ne_contient_aucune_donnee_de_demonstration(self):
        self.assertFalse(comptes_de_demonstration().exists())
        lancer("compter_tables")  # code 0 : rien à compter

    def test_le_deploiement_n_appelle_aucun_jeu_de_donnees(self):
        # Les fichiers de la racine n'existent pas dans le conteneur de développement (seul backend/ y est monté) ;
        # la CI, elle, a tout le dépôt.
        fichiers = [Path(settings.BASE_DIR) / "Dockerfile.prod"] + [
            RACINE / nom for nom in ("docker-compose.prod.yml", "deploy.sh", "backup.sh") if (RACINE / nom).exists()]
        for fichier in fichiers:
            texte = fichier.read_text(encoding="utf-8")
            for interdit in ("seed_", "loaddata", "charger_demonstration", "charger_reference", "_demo"):
                self.assertNotIn(interdit, texte, f"{fichier.name} lance « {interdit} » au déploiement")


class JeuxSansVerrouTests(TestCase):
    def test_seed_catalog_refuse_sans_autorisation(self):
        with self.assertRaises(CommandError):
            lancer("seed_catalog")
        self.assertFalse(Product.all_objects.exists())

    def test_import_client_mock_products_refuse_sans_autorisation(self):
        with self.assertRaises(CommandError):
            lancer("import_client_mock_products", shop="N'importe laquelle")

    def test_le_detecteur_voit_les_comptes_preuve_et_demo_finance(self):
        User.objects.create_user("preuve_client")
        User.objects.create_user("demo-finance-buyer-1")

        self.assertEqual(set(comptes_de_demonstration().values_list("username", flat=True)),
                         {"preuve_client", "demo-finance-buyer-1"})


class ChargerReferenceTests(TestCase):
    def test_charge_la_reference_sans_aucune_activite_et_coupe_le_paiement_factice(self):
        lancer("charger_reference")

        self.assertTrue(Category.objects.filter(parent__isnull=True).exists())
        self.assertFalse(ProviderConfig.current().filter(provider_code="MOCK").exists())
        self.assertFalse(User.objects.exists())
        self.assertFalse(VendorProfile.objects.exists())
        self.assertFalse(Product.all_objects.exists())
        lancer("compter_tables")

    def test_relancer_ne_double_rien(self):
        lancer("charger_reference")
        categories = Category.objects.count()

        lancer("charger_reference")

        self.assertEqual(Category.objects.count(), categories)

    @override_settings(DONNEES_DEMO_AUTORISEES=True)
    def test_serveur_de_demonstration_garde_le_paiement_factice(self):
        lancer("charger_reference")

        self.assertTrue(ProviderConfig.current().filter(provider_code="MOCK").exists())


class PlansVendeurTests(TestCase):
    """T02-5 / T05 : les prix des plans vivent en base (admin), plus dans l'écran vendeur."""

    def test_cree_la_grille_des_plans(self):
        lancer("charger_plans_vendeur")

        prix = {p.code: (p.price_monthly_xaf, p.price_annual_xaf) for p in SubscriptionPlan.objects.all()}
        self.assertEqual(prix, {"FREE": (0, 0), "STARTER": (2500, 25000), "PRO": (7500, 75000)})

    def test_un_prix_regle_dans_l_admin_n_est_jamais_ecrase(self):
        SubscriptionPlan.objects.create(code="PRO", name="Pro", price_monthly_xaf=9000, price_annual_xaf=90000)

        lancer("charger_plans_vendeur")

        self.assertEqual(SubscriptionPlan.objects.get(code="PRO").price_monthly_xaf, 9000)


class ReglagesPublicsTests(TestCase):
    """T02-5 / T05 : les écrans lisent les réglages qu'ils affichent, au lieu de les recopier."""

    def test_rend_la_liste_fermee_avec_les_valeurs_en_vigueur(self):
        from apps.regles.models import Reglage

        Reglage.objects.filter(nom="r_prix_min_publiable").update(valeur=1500)

        reponse = self.client.get(reverse("regles-reglages-publics"))

        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(set(reponse.json()),
                         {"r_prix_min_publiable", "r_com_min", "r_plafond_nouveau", "r_nouveau_seuil", "r_retour"})
        self.assertEqual(reponse.json()["r_prix_min_publiable"], 1500)


class CompterTablesTests(TestCase):
    def test_une_boutique_suffit_a_signaler_une_base_non_vide(self):
        user = User.objects.create_user("vendeur_reel")
        VendorProfile.objects.create(user=user, business_name="Réelle", business_description="-",
                                     phone="+237690001001", address="Mvan", city="Yaoundé")

        with self.assertRaises(SystemExit) as sortie:
            lancer("compter_tables")
        self.assertEqual(sortie.exception.code, 1)

    def test_les_comptes_d_administration_ne_comptent_pas(self):
        User.objects.create_user("direction", is_staff=True, is_superuser=True)

        sortie = lancer("compter_tables")

        self.assertIn("Base vide", sortie)


class ChargerDemonstrationTests(TestCase):
    def test_refuse_sur_le_site_reel_avant_toute_ecriture(self):
        with self.assertRaises(CommandError):
            lancer("charger_demonstration")
        self.assertFalse(Category.objects.exists())

    @override_settings(DONNEES_DEMO_AUTORISEES=True)
    def test_remplit_une_base_de_demonstration_de_bout_en_bout(self):
        lancer("charger_demonstration")

        comptes = set(comptes_de_demonstration().values_list("username", flat=True))
        self.assertIn("vendeur_demo", comptes)
        self.assertIn("relais_demo", comptes)
        self.assertTrue(any(c.startswith("preuve_") for c in comptes))
        self.assertTrue(any(c.startswith("demo-finance-") for c in comptes))
        with self.assertRaises(SystemExit):
            lancer("compter_tables")
