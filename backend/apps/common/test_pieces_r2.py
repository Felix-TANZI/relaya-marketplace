# DEV-SRV-01, règle R8 : « Pièces d'identité et documents sur Cloudflare R2, jamais sur un disque de serveur ».
# Chaque test regarde le disque (MEDIA_ROOT jetable) après coup : c'est lui que R8 protège.

from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import Mock, patch

from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile, TemporaryUploadedFile
from django.core.management import call_command
from django.test import SimpleTestCase, TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import ComplianceDocument
from apps.vendors.models import VendorProfile

from .checks import pieces_sur_r2
from .storage import PiecesConfidentiellesStorage, StockageIndisponible


def fichiers_sur_le_disque(racine):
    return sorted(str(p.relative_to(racine)) for p in Path(racine).rglob("*") if p.is_file())


class FauxR2:
    """R2 en mémoire : ce qui y est écrit n'existe nulle part sur le disque."""

    def __init__(self, en_panne=False):
        self.objets, self.en_panne, self.contenus_recus = {}, en_panne, []

    def save(self, name, content):
        if self.en_panne:
            raise ConnectionError("R2 indisponible")
        self.contenus_recus.append(content)
        content.seek(0)
        self.objets[name] = content.read()
        return name

    _save = save

    def exists(self, name):
        return name in self.objets

    def open(self, name, mode="rb"):
        return ContentFile(self.objets[name], name=name)

    def size(self, name):
        return len(self.objets[name])

    def delete(self, name):
        self.objets.pop(name, None)

    def url(self, name):
        return f"https://r2.example/{name}?signature=x"


class DisqueJetable:
    def setUp(self):
        super().setUp()
        self.disque = TemporaryDirectory()
        self.addCleanup(self.disque.cleanup)
        reglage = override_settings(MEDIA_ROOT=self.disque.name)
        reglage.enable()
        self.addCleanup(reglage.disable)

    def brancher_r2(self, r2):
        for cible, valeur in (("apps.common.storage.settings.R2_STORAGE_ENABLED", r2 is not None),
                              ("apps.common.storage.S3Storage", Mock(return_value=r2))):
            remplacement = patch(cible, valeur)
            remplacement.start()
            self.addCleanup(remplacement.stop)


class PiecesConfidentiellesStorageTests(DisqueJetable, SimpleTestCase):
    def test_avec_r2_la_piece_va_sur_r2_et_rien_sur_le_disque(self):
        r2 = FauxR2()
        self.brancher_r2(r2)

        nom = PiecesConfidentiellesStorage().save("compliance/cni.png", ContentFile(b"cni"))

        self.assertEqual(r2.objets[nom], b"cni")
        self.assertEqual(fichiers_sur_le_disque(self.disque.name), [])

    def test_r2_en_panne_refuse_sans_repli_sur_le_disque(self):
        self.brancher_r2(FauxR2(en_panne=True))

        with self.assertRaises(StockageIndisponible):
            PiecesConfidentiellesStorage().save("compliance/cni.png", ContentFile(b"cni"))
        self.assertEqual(fichiers_sur_le_disque(self.disque.name), [])

    @override_settings(BELIVAY_PRODUCTION=True)
    def test_production_sans_r2_refuse_au_lieu_d_ecrire_sur_le_disque(self):
        self.brancher_r2(None)

        with self.assertRaises(StockageIndisponible):
            PiecesConfidentiellesStorage().save("compliance/cni.png", ContentFile(b"cni"))
        self.assertEqual(fichiers_sur_le_disque(self.disque.name), [])

    def test_poste_de_dev_sans_r2_ecrit_sur_le_disque(self):
        self.brancher_r2(None)

        nom = PiecesConfidentiellesStorage().save("compliance/cni.png", ContentFile(b"cni"))

        self.assertEqual(Path(self.disque.name, nom).read_bytes(), b"cni")

    def test_piece_d_avant_r8_reste_lisible_depuis_le_disque(self):
        self.brancher_r2(FauxR2())
        stockage = PiecesConfidentiellesStorage()
        stockage.local.save("compliance/ancienne.png", ContentFile(b"ancienne"))

        with stockage.open("compliance/ancienne.png") as fichier:
            self.assertEqual(fichier.read(), b"ancienne")

    def test_suppression_efface_r2_et_la_copie_disque(self):
        r2 = FauxR2()
        self.brancher_r2(r2)
        stockage = PiecesConfidentiellesStorage()
        r2.save("compliance/cni.png", ContentFile(b"r2"))
        stockage.local.save("compliance/cni.png", ContentFile(b"disque"))

        stockage.delete("compliance/cni.png")

        self.assertFalse(r2.exists("compliance/cni.png"))
        self.assertEqual(fichiers_sur_le_disque(self.disque.name), [])


class DepotDePieceTests(DisqueJetable, TestCase):
    def setUp(self):
        super().setUp()
        self.vendeur = User.objects.create_user("vendeur_r8", password="x")
        VendorProfile.objects.create(user=self.vendeur, business_name="Boutique R8", business_description="-",
                                     phone="+237690000801", address="Mvan", city="Yaoundé")
        self.api = APIClient()
        self.api.force_authenticate(self.vendeur)

    def deposer(self, contenu=b"cni", nom="cni.png"):
        return self.api.post(reverse("compliance-documents"),
                             {"document_type": "CNI_RECTO", "file": SimpleUploadedFile(nom, contenu, "image/png")},
                             format="multipart")

    def test_photo_de_plus_de_2_5_mo_ne_passe_pas_par_un_fichier_temporaire(self):
        # Django écrit d'habitude tout envoi de plus de 2,5 Mo dans un fichier temporaire du serveur.
        r2 = FauxR2()
        self.brancher_r2(r2)

        reponse = self.deposer(contenu=b"x" * (3 * 1024 * 1024))

        self.assertEqual(reponse.status_code, 201, reponse.content)
        self.assertEqual(len(r2.objets), 1)
        self.assertFalse(any(isinstance(c, TemporaryUploadedFile) for c in r2.contenus_recus))
        self.assertEqual(fichiers_sur_le_disque(self.disque.name), [])

    def test_r2_en_panne_repond_clairement_et_ne_cree_pas_de_fiche(self):
        self.brancher_r2(FauxR2(en_panne=True))

        reponse = self.deposer()

        self.assertEqual(reponse.status_code, 400)
        self.assertIn("Réessayez", reponse.json()["file"][0])
        self.assertFalse(ComplianceDocument.objects.filter(user=self.vendeur).exists())
        self.assertEqual(fichiers_sur_le_disque(self.disque.name), [])

    def test_envoi_trop_gros_refuse_avant_lecture(self):
        self.brancher_r2(FauxR2())

        with patch("apps.common.storage.TELEVERSEMENT_MAX_OCTETS", 100):
            reponse = self.deposer(contenu=b"x" * 500)

        self.assertEqual(reponse.status_code, 413)
        self.assertFalse(ComplianceDocument.objects.filter(user=self.vendeur).exists())


class ControleDeDemarrageTests(SimpleTestCase):
    @override_settings(BELIVAY_PRODUCTION=True, R2_STORAGE_ENABLED=False)
    def test_production_sans_r2_avertit(self):
        self.assertEqual([m.id for m in pieces_sur_r2()], ["common.W008"])

    @override_settings(BELIVAY_PRODUCTION=True, R2_STORAGE_ENABLED=True)
    def test_production_avec_r2_ne_dit_rien(self):
        self.assertEqual(pieces_sur_r2(), [])


class MigrerPiecesVersR2Tests(DisqueJetable, TestCase):
    def setUp(self):
        super().setUp()
        self.r2 = FauxR2()
        self.brancher_r2(self.r2)
        reglage = override_settings(R2_STORAGE_ENABLED=True)
        reglage.enable()
        self.addCleanup(reglage.disable)
        vendeur = User.objects.create_user("vendeur_ancien", password="x")
        PiecesConfidentiellesStorage().local.save("compliance/2026/10/ancienne.png", ContentFile(b"ancienne"))
        ComplianceDocument.objects.bulk_create([ComplianceDocument(
            user=vendeur, owner_role=ComplianceDocument.OwnerRole.VENDOR, document_type="CNI_RECTO",
            file="compliance/2026/10/ancienne.png")])

    def test_simulation_ne_deplace_rien(self):
        with self.assertRaises(SystemExit):
            call_command("migrer_pieces_vers_r2", stdout=StringIO())

        self.assertEqual(self.r2.objets, {})
        self.assertEqual(fichiers_sur_le_disque(self.disque.name), ["compliance/2026/10/ancienne.png"])

    def test_appliquer_copie_sur_r2_puis_efface_le_disque(self):
        call_command("migrer_pieces_vers_r2", "--appliquer", stdout=StringIO())

        self.assertEqual(self.r2.objets, {"compliance/2026/10/ancienne.png": b"ancienne"})
        self.assertEqual(fichiers_sur_le_disque(self.disque.name), [])
        document = ComplianceDocument.objects.get()
        with document.file.open("rb") as fichier:
            self.assertEqual(fichier.read(), b"ancienne")
