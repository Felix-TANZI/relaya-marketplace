# DEV-SRV-01, T07-4/5 : l'agent de terrain inscrit un vendeur depuis admin.belivay.com (apps.vendors.agent_terrain).
# Décisions du porteur (2026-11-06) : compte EN ATTENTE jusqu'à la validation de la pièce ; accès par mot de passe
# provisoire remis sur place, à changer à la première connexion.

from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import Group, User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import AccesProvisoire, ComplianceDocument
from apps.catalog.models import Category, Product
from apps.common.models import AuditLog
from apps.shipping.models import Zone
from apps.shipping.zones import synchroniser_zones
from apps.vendors.models import InscriptionParAgent, VendorLocation, VendorProfile

URL = reverse("vendors:agent-vendeurs")


def agent(nom="agent_bastos"):
    user = User.objects.create_user(nom, password="x", is_staff=True)
    user.groups.add(Group.objects.get_or_create(name="agents-terrain")[0])
    return user


class AgentTerrainTests(TestCase):
    def setUp(self):
        synchroniser_zones()
        self.agent = agent()
        self.api = APIClient()
        self.api.force_authenticate(self.agent)

    def inscrire(self, **champs):
        donnees = {"boutique": "Chez Mama Ngono", "telephone": "699112233", "quartier": "Bastos",
                   "gerant": "Mama Ngono", "latitude": "3.8889", "longitude": "11.5133",
                   "reperes": "En face de la boulangerie, portail bleu", **champs}
        return self.api.post(URL, donnees, format="json")

    # ── Inscription ──────────────────────────────────────────────────────────────────────────────────────────────

    def test_inscription_cree_un_compte_en_attente_avec_son_quartier(self):
        reponse = self.inscrire()

        self.assertEqual(reponse.status_code, 201, reponse.content)
        profil = VendorProfile.objects.get(business_name="Chez Mama Ngono")
        self.assertEqual(profil.status, "PENDING")  # décision du porteur : en attente de la conformité
        self.assertEqual(profil.phone, "+237699112233")
        self.assertEqual(profil.city, "Yaoundé I")  # commune du quartier, lue dans t_quartiers
        emplacement = profil.locations.get()
        self.assertEqual((emplacement.quartier, emplacement.is_main), ("Bastos", True))
        self.assertTrue(profil.has_required_location)
        self.assertEqual(InscriptionParAgent.objects.get(vendor=profil).agent, self.agent)
        self.assertTrue(AuditLog.objects.filter(actor=self.agent, changes__geste="creation").exists())

    def test_le_quartier_donne_sa_zone_au_vendeur(self):
        # Correction en chemin : la règle « zone = quartier de l'emplacement principal » ne tournait jamais.
        self.inscrire()

        profil = VendorProfile.objects.get(business_name="Chez Mama Ngono")
        self.assertEqual(profil.zone, Zone.objects.get(code="Z1"))

    def test_le_mot_de_passe_provisoire_ouvre_le_compte_par_le_numero_et_doit_etre_change(self):
        mot_de_passe = self.inscrire().json()["mot_de_passe_provisoire"]

        reponse = APIClient().post(reverse("auth-login"), {"username": "699112233", "password": mot_de_passe},
                                   format="json")

        self.assertEqual(reponse.status_code, 200, reponse.content)
        self.assertIs(reponse.json()["doit_changer_mot_de_passe"], True)

    def test_mot_de_passe_provisoire_expire_refuse(self):
        mot_de_passe = self.inscrire().json()["mot_de_passe_provisoire"]
        AccesProvisoire.objects.update(expire_le=timezone.now() - timedelta(minutes=1))

        reponse = APIClient().post(reverse("auth-login"), {"username": "699112233", "password": mot_de_passe},
                                   format="json")

        self.assertEqual(reponse.status_code, 401)
        self.assertIn("expiré", str(reponse.json()))

    def test_changer_son_mot_de_passe_met_fin_a_l_acces_provisoire(self):
        self.inscrire()
        vendeur = VendorProfile.objects.get(business_name="Chez Mama Ngono").user

        vendeur.set_password("MonVraiMotDePasse2026")
        vendeur.save()

        self.assertFalse(AccesProvisoire.objects.filter(user=vendeur).exists())

    def test_me_signale_le_mot_de_passe_a_changer_jusqu_au_changement(self):
        mot_de_passe = self.inscrire().json()["mot_de_passe_provisoire"]
        vendeur = APIClient()
        vendeur.force_authenticate(VendorProfile.objects.get(business_name="Chez Mama Ngono").user)
        self.assertIs(vendeur.get(reverse("auth-me")).json()["doit_changer_mot_de_passe"], True)

        reponse = vendeur.post(reverse("auth-change-password"), {
            "old_password": mot_de_passe, "new_password": "Ngono-Boutique-2026", "new_password2": "Ngono-Boutique-2026",
        }, format="json")

        self.assertEqual(reponse.status_code, 200, reponse.content)
        self.assertIs(vendeur.get(reverse("auth-me")).json()["doit_changer_mot_de_passe"], False)
        connexion = APIClient().post(reverse("auth-login"),
                                     {"username": "699112233", "password": "Ngono-Boutique-2026"}, format="json")
        self.assertNotIn("doit_changer_mot_de_passe", connexion.json())

    def test_numero_deja_utilise_par_un_compte_refuse_sans_toucher_au_compte(self):
        client = User.objects.create_user("client_existant", password="secret-du-client")
        VendorProfile.objects.create(user=client, business_name="Autre", business_description="-",
                                     phone="+237699112233", address="Mvan", city="Yaoundé")

        reponse = self.inscrire(boutique="Nouvelle boutique")

        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(reponse.json()["raison"], "compte_existant")
        client.refresh_from_db()
        self.assertTrue(client.check_password("secret-du-client"))

    def test_quartier_inconnu_refuse_et_ne_laisse_aucun_compte(self):
        avant = User.objects.count()

        reponse = self.inscrire(quartier="Quartier imaginaire")

        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(reponse.json()["raison"], "quartier")
        self.assertEqual(User.objects.count(), avant)

    def test_nom_de_boutique_pris_ne_laisse_aucun_compte(self):
        self.inscrire()
        avant = User.objects.count()

        reponse = self.inscrire(telephone="677445566")

        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(reponse.json()["raison"], "nom_pris")
        self.assertEqual(User.objects.count(), avant)

    # ── Droits et périmètre ──────────────────────────────────────────────────────────────────────────────────────

    def test_reserve_au_groupe_agents_terrain(self):
        autre = APIClient()
        autre.force_authenticate(User.objects.create_user("support", password="x", is_staff=True))

        self.assertEqual(autre.post(URL, {}, format="json").status_code, 403)

    def test_un_agent_ne_voit_que_ses_inscriptions(self):
        vendeur_id = self.inscrire().json()["id"]
        collegue = APIClient()
        collegue.force_authenticate(agent("agent_essos"))

        self.assertEqual(collegue.get(URL).json(), [])
        self.assertEqual(collegue.get(reverse("vendors:agent-vendeur", args=[vendeur_id])).status_code, 404)
        self.assertEqual(len(self.api.get(URL).json()), 1)

    # ── Pièce d'identité ─────────────────────────────────────────────────────────────────────────────────────────

    def test_photo_de_la_piece_deposee_en_attente_de_la_conformite(self):
        vendeur_id = self.inscrire().json()["id"]

        reponse = self.api.post(reverse("vendors:agent-vendeur-piece", args=[vendeur_id]),
                                {"piece": "recto", "fichier": SimpleUploadedFile("cni.jpg", b"jpeg", "image/jpeg")},
                                format="multipart")

        self.assertEqual(reponse.status_code, 201, reponse.content)
        document = ComplianceDocument.objects.get(user__vendor_profile__id=vendeur_id)
        self.assertEqual((document.document_type, document.status), ("CNI_RECTO", "PENDING"))
        self.assertEqual(reponse.json()["pieces"]["recto"], "PENDING")

    def test_piece_inconnue_refusee(self):
        vendeur_id = self.inscrire().json()["id"]

        reponse = self.api.post(reverse("vendors:agent-vendeur-piece", args=[vendeur_id]),
                                {"piece": "passeport", "fichier": SimpleUploadedFile("p.jpg", b"x", "image/jpeg")},
                                format="multipart")

        self.assertEqual(reponse.status_code, 400)

    # ── Catalogue ────────────────────────────────────────────────────────────────────────────────────────────────

    def test_produit_saisi_pour_le_vendeur_en_attente_de_moderation(self):
        vendeur_id = self.inscrire().json()["id"]
        categorie = Category.objects.create(name="Pagnes", slug="pagnes")

        reponse = self.api.post(reverse("vendors:agent-vendeur-produit", args=[vendeur_id]),
                                {"title": "Pagne wax 6 yards", "description": "Coton", "price_xaf": 12000,
                                 "category": categorie.id, "stock_quantity": 4}, format="json")

        self.assertEqual(reponse.status_code, 201, reponse.content)
        produit = Product.objects.get(title="Pagne wax 6 yards")
        self.assertEqual(produit.vendor, VendorProfile.objects.get(pk=vendeur_id).user)
        self.assertEqual(produit.moderation_status, "PENDING")
        self.assertEqual(produit.inventory.quantity, 4)

    # ── Nouvel accès ─────────────────────────────────────────────────────────────────────────────────────────────

    def test_nouvel_acces_tant_que_le_vendeur_n_a_pas_choisi_son_mot_de_passe(self):
        vendeur_id = self.inscrire().json()["id"]
        url = reverse("vendors:agent-vendeur-acces", args=[vendeur_id])

        self.assertEqual(self.api.post(url).status_code, 200)

        vendeur = VendorProfile.objects.get(pk=vendeur_id).user
        vendeur.set_password("MonVraiMotDePasse2026")
        vendeur.save()
        reponse = self.api.post(url)
        self.assertEqual(reponse.status_code, 409)
        vendeur.refresh_from_db()
        self.assertTrue(vendeur.check_password("MonVraiMotDePasse2026"))

    # ── R2 indisponible ──────────────────────────────────────────────────────────────────────────────────────────

    def test_piece_refusee_par_r2_message_clair(self):
        vendeur_id = self.inscrire().json()["id"]
        from apps.common.storage import StockageIndisponible

        with patch("apps.common.storage.PiecesConfidentiellesStorage._save", side_effect=StockageIndisponible("x")):
            reponse = self.api.post(reverse("vendors:agent-vendeur-piece", args=[vendeur_id]),
                                    {"piece": "recto", "fichier": SimpleUploadedFile("c.jpg", b"x", "image/jpeg")},
                                    format="multipart")

        self.assertEqual(reponse.status_code, 400)
        self.assertIn("Réessayez", reponse.json()["detail"])


class EmplacementZoneTests(TestCase):
    """Correction en chemin (DEV-SRV-01) : VendorLocation avait deux save(), la seconde masquait la première."""

    def test_emplacement_principal_donne_la_zone_de_son_quartier(self):
        synchroniser_zones()
        user = User.objects.create_user("v_zone", password="x")
        profil = VendorProfile.objects.create(user=user, business_name="Zone", business_description="-",
                                              phone="+237690000901", address="Essos", city="Yaoundé")

        VendorLocation.objects.create(vendor=profil, name="Essos", address="Essos", phone="+237690000901",
                                      representative_name="R", representative_phone="+237690000901",
                                      quartier="Essos", is_main=True)

        profil.refresh_from_db()
        self.assertEqual(profil.zone, Zone.objects.get(code="Z9"))
