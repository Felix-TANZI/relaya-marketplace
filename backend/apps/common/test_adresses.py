# DEV-SRV-01, T05 / T11 : le site réel répond sur seller., admin., relay., driver., delivery., shop. et
# api.belivay.com ; les portails appellent api.belivay.com. Règle R5 : « Aucune adresse ni clé écrite dans le code :
# tout passe par la configuration. »

import json
import os
import subprocess
import sys
from pathlib import Path

from django.conf import settings
from django.contrib.auth.models import User
from django.test import SimpleTestCase, TestCase, override_settings

from apps.vendors.models import VendorProfile


def reglages_avec(variables: dict) -> dict:
    """Charge relaya.settings.base dans un processus neuf, avec ces variables d'environnement."""
    code = ("import json, relaya.settings.base as b; "
            "print(json.dumps({'cors': b.CORS_ALLOWED_ORIGINS, 'csrf': b.CSRF_TRUSTED_ORIGINS}))")
    environnement = {**os.environ, **variables}
    sortie = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, check=True,
                            cwd=Path(settings.BASE_DIR), env=environnement)
    return json.loads(sortie.stdout.strip().splitlines()[-1])


class OriginesParLaConfigurationTests(SimpleTestCase):
    def test_cors_lit_enfin_cors_allowed_origins(self):
        valeurs = reglages_avec({"CORS_ALLOWED_ORIGINS": "https://seller.belivay.com, https://admin.belivay.com/"})

        self.assertIn("https://seller.belivay.com", valeurs["cors"])
        self.assertIn("https://admin.belivay.com", valeurs["cors"])

    def test_csrf_accepte_les_origines_de_la_configuration_en_plus_de_belivay(self):
        valeurs = reglages_avec({"CSRF_TRUSTED_ORIGINS": "https://api.belivay.com"})

        self.assertIn("https://api.belivay.com", valeurs["csrf"])
        self.assertIn("https://belivay.com", valeurs["csrf"])

    def test_sans_variable_rien_n_est_ajoute(self):
        valeurs = reglages_avec({"CORS_ALLOWED_ORIGINS": "", "CSRF_TRUSTED_ORIGINS": ""})

        self.assertNotIn("", valeurs["cors"])
        self.assertEqual(valeurs["csrf"], ["https://belivay.com", "https://www.belivay.com"])


class AdressesPubliquesTests(TestCase):
    @override_settings(PUBLIC_SITE_URL="https://shop.belivay.com")
    def test_l_adresse_publique_d_une_boutique_suit_le_site_configure(self):
        user = User.objects.create_user("boutique_adresse")
        profil = VendorProfile.objects.create(user=user, business_name="Adresse", business_description="-",
                                              phone="+237690002001", address="Mvan", city="Yaoundé")
        profil.shop_slug = "adresse"

        self.assertEqual(profil.public_url, "https://shop.belivay.com?ref=adresse")

    def test_les_liens_whatsapp_des_portails_prennent_les_nouveaux_noms(self):
        from unittest.mock import patch

        from apps.whatsapp_assistant.conf import get_config

        noms = ("WHATSAPP_COURIER_APP_URL", "WHATSAPP_RELAY_APP_URL", "WHATSAPP_VENDOR_APP_URL")
        # Une valeur vide vaut absence (conf._setting) : ni Django ni l'environnement du poste ne fournissent l'adresse.
        with self.settings(**{nom: "" for nom in noms}), patch.dict(os.environ, {nom: "" for nom in noms}):
            config = get_config()

        self.assertTrue(config.courier_app_url.startswith("https://driver.belivay.com"))
        self.assertTrue(config.relay_app_url.startswith("https://relay.belivay.com"))
        self.assertTrue(config.vendor_app_url.startswith("https://seller.belivay.com"))
