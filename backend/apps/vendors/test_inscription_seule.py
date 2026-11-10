# DEV-SRV-01, T07-1 : le vendeur s'inscrit seul — nom de la boutique, numéro vérifié par code SMS, quartier.
# Le code est lu dans le SMS intercepté, comme le vendeur le lirait sur son téléphone.

import re
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.shipping.models import Zone
from apps.shipping.zones import synchroniser_zones
from apps.vendors import kyc
from apps.vendors.models import VendorProfile

URL_CODE = reverse("vendors:inscription-code")
URL = reverse("vendors:inscription")
MOT_DE_PASSE = "Boutique-Bastos-2026"


class FauxSms:
    def __init__(self):
        self.envoyes = []

    def envoyer(self, destination, texte, canal="sms"):
        self.envoyes.append((destination, texte))

    def dernier_code(self):
        return re.search(r"\b(\d{4,8})\b", self.envoyes[-1][1]).group(1)


class InscriptionSeuleTests(TestCase):
    def setUp(self):
        cache.clear()  # limite de débit par adresse IP
        synchroniser_zones()
        self.api = APIClient()
        self.sms = FauxSms()
        brancher = patch("apps.otp.services.sms", return_value=self.sms)
        brancher.start()
        self.addCleanup(brancher.stop)

    def code(self, telephone="677001122"):
        return self.api.post(URL_CODE, {"telephone": telephone}, format="json")

    def inscrire(self, code=None, **champs):
        donnees = {"telephone": "677001122", "code": code if code is not None else self.sms.dernier_code(),
                   "nom": "Chez Tantine Bastos", "quartier": "Bastos", "mot_de_passe": MOT_DE_PASSE, **champs}
        return self.api.post(URL, donnees, format="json")

    def test_parcours_complet_compte_en_attente_dans_son_quartier(self):
        envoi = self.code()
        self.assertEqual(envoi.status_code, 200, envoi.content)
        self.assertTrue(self.sms.envoyes[-1][0].endswith("677001122"))
        self.assertNotIn("677001122", envoi.json()["destination"])  # numéro masqué

        reponse = self.inscrire()

        self.assertEqual(reponse.status_code, 201, reponse.content)
        profil = VendorProfile.objects.get(business_name="Chez Tantine Bastos")
        self.assertEqual((profil.status, profil.phone), ("PENDING", "+237677001122"))
        self.assertEqual(profil.locations.get(is_main=True).quartier, "Bastos")
        self.assertEqual(profil.zone, Zone.objects.get(code="Z1"))
        # T07-2 : rien n'est publiable avant la pièce d'identité et le numéro Mobile Money.
        self.assertFalse(kyc.peut_publier(profil.user))

    def test_le_vendeur_se_connecte_avec_son_numero_et_son_mot_de_passe(self):
        self.code()
        self.inscrire()

        reponse = APIClient().post(reverse("auth-login"), {"username": "677001122", "password": MOT_DE_PASSE},
                                   format="json")

        self.assertEqual(reponse.status_code, 200, reponse.content)
        self.assertFalse(reponse.json().get("doit_changer_mot_de_passe"))

    def test_code_faux_refuse_sans_creer_de_compte(self):
        self.code()

        reponse = self.inscrire(code="000000" if self.sms.dernier_code() != "000000" else "111111")

        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(reponse.json()["raison"], "code")
        self.assertFalse(User.objects.filter(vendor_profile__isnull=False).exists())

    def test_sans_code_demande_rien_ne_se_cree(self):
        reponse = self.inscrire(code="123456")

        self.assertEqual(reponse.json()["raison"], "expire")
        self.assertFalse(VendorProfile.objects.exists())

    def test_le_code_sert_une_seule_fois(self):
        self.code()
        code = self.sms.dernier_code()
        self.inscrire(code=code)

        VendorProfile.objects.all().delete()
        User.objects.all().delete()
        reponse = self.inscrire(code=code)

        self.assertEqual(reponse.json()["raison"], "expire")

    def test_nom_pris_le_meme_code_reste_valable_pour_corriger(self):
        proprietaire = User.objects.create_user("autre", password="x")
        VendorProfile.objects.create(user=proprietaire, business_name="Chez Tantine Bastos", phone="+237699000001")
        self.code()
        code = self.sms.dernier_code()

        refuse = self.inscrire(code=code)
        accepte = self.inscrire(code=code, nom="Chez Tantine Bastos 2")

        self.assertEqual(refuse.json()["raison"], "nom_pris")
        self.assertEqual(accepte.status_code, 201, accepte.content)

    def test_quartier_inconnu_refuse(self):
        self.code()

        reponse = self.inscrire(quartier="Atlantide")

        self.assertEqual(reponse.json()["raison"], "quartier")
        self.assertFalse(VendorProfile.objects.exists())

    def test_mot_de_passe_trop_faible_refuse(self):
        self.code()

        reponse = self.inscrire(mot_de_passe="123")

        self.assertEqual(reponse.json().get("raison"), "mot_de_passe", reponse.content)

    def test_numero_deja_inscrit_n_envoie_aucun_code(self):
        from apps.accounts.models import UserProfile

        client = User.objects.create_user("client_bastos", password="x")
        UserProfile.objects.update_or_create(user=client, defaults={"phone": "+237677001122"})

        reponse = self.code()

        self.assertEqual(reponse.json()["raison"], "compte_existant")
        self.assertEqual(self.sms.envoyes, [])

    def test_numero_invalide_refuse(self):
        self.assertEqual(self.code("12345").json()["raison"], "numero")

    def test_renvoi_trop_rapide_refuse(self):
        self.code()

        reponse = self.code()

        self.assertEqual(reponse.status_code, 429)
        self.assertEqual(reponse.json()["raison"], "limite")
        self.assertEqual(len(self.sms.envoyes), 1)

    # ── Client déjà inscrit qui ouvre sa boutique depuis son compte (D19) ──────────────────────────────────────────

    def connecter_client(self, telephone="+237677001122"):
        from apps.accounts.models import UserProfile

        client = User.objects.create_user("client_bastos", password="Client-2026-x")
        UserProfile.objects.update_or_create(user=client, defaults={"phone": telephone})
        self.api.force_authenticate(client)
        return client

    def test_client_connecte_ouvre_sa_boutique_avec_son_numero_sans_nouveau_compte(self):
        client = self.connecter_client()
        self.assertEqual(self.code().status_code, 200)

        reponse = self.inscrire(mot_de_passe="")

        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertEqual(VendorProfile.objects.get().user, client)
        self.assertEqual(User.objects.count(), 1)
        client.refresh_from_db()
        self.assertTrue(client.check_password("Client-2026-x"))  # son mot de passe ne change pas

    def test_client_connecte_ne_prend_pas_le_numero_d_un_autre_compte(self):
        from apps.accounts.models import UserProfile

        autre = User.objects.create_user("autre_client", password="x")
        UserProfile.objects.update_or_create(user=autre, defaults={"phone": "+237677001122"})
        self.connecter_client(telephone="+237699887766")

        self.assertEqual(self.code().json()["raison"], "compte_existant")

    def test_une_seule_boutique_par_compte(self):
        client = self.connecter_client()
        VendorProfile.objects.create(user=client, business_name="Déjà là", phone="+237677001122")

        self.assertEqual(self.code().json()["raison"], "deux_comptes")
