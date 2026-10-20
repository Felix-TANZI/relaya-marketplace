# backend/tests/test_d19_identite_vendeur.py
# Tache D19 — « Ouvrir "Devenir vendeur" et verifier la piece d'identite ».
#
# Un test par exigence du document :
#   « Creer la boutique depuis le compte client, sans piece. »
#   « Refuser la publication cote serveur tant que la piece n'est pas
#     verifiee. »
#   « Recevoir la CNI recto et verso et le selfie video, les stocker en acces
#     restreint, donner un motif de refus par piece. »
#   « Repondre en 48 h ouvrees au plus. »
#   « Exiger les documents complets avant le premier versement. »
#
# Le mot important est COTE SERVEUR : masquer le bouton de publication ne
# protege de rien, un appel direct a l'API publierait quand meme. Les tests
# appellent donc les endpoints, jamais seulement les fonctions.

from datetime import datetime, timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

from apps.accounts.models import ComplianceDocument
from apps.vendors.kyc import (
    CNI_RECTO,
    CNI_VERSO,
    PIECES_EXIGEES,
    SELFIE_VIDEO,
    echeance_examen,
    identite_verifiee,
)
from apps.vendors.models import VendorProfile

pytestmark = pytest.mark.django_db

APPLY = "/api/vendors/apply/"
PIECES = "/api/auth/compliance-documents/"
RETRAIT = "/api/vendors/withdrawals/create/"


def _publier(offer_id=999999):
    return f"/api/vendors/offers/{offer_id}/publish"


@pytest.fixture
def vendeur(django_user_model):
    user = django_user_model.objects.create_user(
        username="vendeur_d19", email="vendeur.d19@example.com", password="Kyc-2026",
    )
    VendorProfile.objects.create(
        user=user, business_name="Boutique D19", business_description="Test",
        phone="+237650000001", address="Mvan", city="YAOUNDE", status="APPROVED",
    )
    return user


def _deposer(user, piece, statut=ComplianceDocument.Status.APPROVED):
    return ComplianceDocument.objects.create(
        user=user, owner_role=ComplianceDocument.OwnerRole.VENDOR,
        document_type=piece, file=SimpleUploadedFile(f"{piece}.jpg", b"image"),
        status=statut,
    )


def _toutes_validees(user):
    for piece in PIECES_EXIGEES:
        _deposer(user, piece)


# ── « Creer la boutique depuis le compte client, sans piece » ────────────────

def test_une_boutique_se_cree_sans_piece_d_identite(api_client, django_user_model):
    client = django_user_model.objects.create_user(
        username="client_devient_vendeur", email="client.dv@example.com",
        password="Kyc-2026",
    )
    api_client.force_authenticate(client)

    reponse = api_client.post(APPLY, {
        "business_name": "Ma boutique", "business_description": "Vente",
        "phone": "+237650000002", "address": "Mvog-Mbi", "city": "YAOUNDE",
    }, format="json")

    assert reponse.status_code == 201
    assert VendorProfile.objects.filter(user=client).exists()


# ── « Refuser la publication tant que la piece n'est pas verifiee » ──────────

def test_publier_est_refuse_sans_aucune_piece(api_client, vendeur):
    api_client.force_authenticate(vendeur)

    reponse = api_client.post(_publier(), {}, format="json")

    assert reponse.data["ok"] is False
    assert reponse.data["raison"] == "identite_non_verifiee"
    # Le vendeur doit savoir quoi fournir, pas seulement qu'on refuse.
    assert len(reponse.data["detail"]["manquantes"]) == 3


def test_une_piece_en_attente_ne_vaut_pas_accord(api_client, vendeur):
    """C'est tout l'objet du controle : depose n'est pas verifie."""
    for piece in PIECES_EXIGEES:
        _deposer(vendeur, piece, ComplianceDocument.Status.PENDING)
    api_client.force_authenticate(vendeur)

    reponse = api_client.post(_publier(), {}, format="json")

    assert reponse.data["raison"] == "identite_non_verifiee"
    assert len(reponse.data["detail"]["en_attente"]) == 3


def test_une_seule_piece_rejetee_bloque_et_dit_laquelle(api_client, vendeur):
    _deposer(vendeur, CNI_RECTO)
    _deposer(vendeur, SELFIE_VIDEO)
    _deposer(vendeur, CNI_VERSO, ComplianceDocument.Status.REJECTED)
    api_client.force_authenticate(vendeur)

    reponse = api_client.post(_publier(), {}, format="json")

    assert reponse.data["raison"] == "identite_non_verifiee"
    assert reponse.data["detail"]["refusees"] == ["CNI (verso)"]


def test_les_trois_pieces_validees_ouvrent_la_publication(api_client, vendeur):
    """
    Le verrou passe AVANT la recherche de l'offre : une fois l'identite
    verifiee, on atteint le 404 de l'offre inexistante. C'est la preuve que
    le verrou ne bloque plus — et qu'il etait bien en premier.
    """
    _toutes_validees(vendeur)
    api_client.force_authenticate(vendeur)

    reponse = api_client.post(_publier(), {}, format="json")

    assert reponse.status_code == 404


def test_l_administrateur_ne_peut_pas_publier_pour_un_vendeur_non_verifie(
    api_client, vendeur, django_user_model,
):
    """Verrouiller le bouton du vendeur ne suffit pas : l'admin publie aussi."""
    from apps.catalog.models import Category, ModerationStatus, Product

    categorie = Category.objects.create(name="Tel", slug="tel-d19")
    produit = Product.objects.create(
        title="Offre", category=categorie, vendor=vendeur, price_xaf=10000,
        moderation_status=ModerationStatus.PENDING,
    )
    admin = django_user_model.objects.create_user(
        username="admin_d19", email="admin.d19@example.com", password="Kyc-2026",
        is_staff=True, is_superuser=True,
    )
    api_client.force_authenticate(admin)

    reponse = api_client.post(f"/api/vendors/admin/products/{produit.id}/approve/", {}, format="json")

    assert reponse.status_code == 409
    produit.refresh_from_db()
    assert produit.moderation_status == ModerationStatus.PENDING


# ── « Recevoir la CNI recto et verso et le selfie video » ────────────────────

def test_un_vendeur_depose_ses_pieces_par_le_meme_guichet(api_client, vendeur):
    api_client.force_authenticate(vendeur)

    reponse = api_client.post(PIECES, {
        "document_type": CNI_RECTO,
        "file": SimpleUploadedFile("cni.jpg", b"image", content_type="image/jpeg"),
    }, format="multipart")

    assert reponse.status_code == 201
    assert reponse.data["owner_role"] == ComplianceDocument.OwnerRole.VENDOR


def test_le_selfie_video_est_accepte(api_client, vendeur):
    """Les formats d'origine n'acceptaient que des images et des PDF."""
    api_client.force_authenticate(vendeur)

    reponse = api_client.post(PIECES, {
        "document_type": SELFIE_VIDEO,
        "file": SimpleUploadedFile("selfie.mp4", b"video", content_type="video/mp4"),
    }, format="multipart")

    assert reponse.status_code == 201


def test_une_video_depasse_la_limite_des_images(api_client, vendeur):
    """12 Mo : refuse en image, accepte en video."""
    api_client.force_authenticate(vendeur)
    gros = b"x" * (12 * 1024 * 1024)

    image = api_client.post(PIECES, {
        "document_type": CNI_RECTO,
        "file": SimpleUploadedFile("cni.jpg", gros, content_type="image/jpeg"),
    }, format="multipart")
    video = api_client.post(PIECES, {
        "document_type": SELFIE_VIDEO,
        "file": SimpleUploadedFile("selfie.mp4", gros, content_type="video/mp4"),
    }, format="multipart")

    assert image.status_code == 400
    assert video.status_code == 201


def test_redeposer_une_piece_la_remet_en_attente_et_efface_le_motif(api_client, vendeur):
    """Un motif de refus qui survivrait au nouveau depot induirait en erreur."""
    piece = _deposer(vendeur, CNI_RECTO, ComplianceDocument.Status.REJECTED)
    piece.review_note = "Photo illisible"
    piece.save(update_fields=["review_note"])
    api_client.force_authenticate(vendeur)

    api_client.post(PIECES, {
        "document_type": CNI_RECTO,
        "file": SimpleUploadedFile("cni2.jpg", b"mieux", content_type="image/jpeg"),
    }, format="multipart")

    piece.refresh_from_db()
    assert piece.status == ComplianceDocument.Status.PENDING
    assert piece.review_note == ""


# ── « les stocker en acces restreint » ──────────────────────────────────────
#
# C'est le point le plus sensible de D19. Les fichiers vivent dans le dossier
# media, que nginx exposait ENTIEREMENT : une CNI ou un selfie video etait
# lisible par toute personne connaissant l'URL. nginx refuse desormais
# /media/compliance/, et ce chemin-ci verifie qui demande.

def test_l_url_rendue_ne_pointe_pas_sur_le_dossier_media(api_client, vendeur):
    piece = _deposer(vendeur, CNI_RECTO)
    api_client.force_authenticate(vendeur)

    url = api_client.get(PIECES).data[0]["file_url"]

    assert "/media/" not in url
    assert f"/api/auth/compliance-documents/{piece.id}/file/" in url


def test_le_deposant_telecharge_sa_propre_piece(api_client, vendeur):
    piece = _deposer(vendeur, CNI_RECTO)
    api_client.force_authenticate(vendeur)

    reponse = api_client.get(f"{PIECES}{piece.id}/file/")

    assert reponse.status_code == 200


def test_un_autre_vendeur_ne_voit_rien_et_ignore_que_la_piece_existe(
    api_client, vendeur, django_user_model,
):
    """404 et non 403 : « interdit » confirmerait que la piece existe."""
    piece = _deposer(vendeur, CNI_RECTO)
    curieux = django_user_model.objects.create_user(
        username="curieux", email="curieux@example.com", password="Kyc-2026",
    )
    api_client.force_authenticate(curieux)

    reponse = api_client.get(f"{PIECES}{piece.id}/file/")

    assert reponse.status_code == 404


def test_un_visiteur_sans_compte_n_accede_pas(api_client, vendeur):
    piece = _deposer(vendeur, CNI_RECTO)

    reponse = api_client.get(f"{PIECES}{piece.id}/file/")

    assert reponse.status_code in (401, 403)


def test_l_administration_peut_examiner_la_piece(api_client, vendeur, django_user_model):
    """Sans quoi personne ne pourrait valider une CNI."""
    piece = _deposer(vendeur, CNI_RECTO)
    agent = django_user_model.objects.create_user(
        username="agent_kyc", email="agent.kyc@example.com", password="Kyc-2026",
        is_staff=True,
    )
    api_client.force_authenticate(agent)

    reponse = api_client.get(f"{PIECES}{piece.id}/file/")

    assert reponse.status_code == 200


# ── « Repondre en 48 h ouvrees au plus » ────────────────────────────────────

def test_l_echeance_ne_court_pas_le_week_end():
    """
    Depot le vendredi a midi : 48 h ouvrees tombent le mardi, pas le dimanche.
    """
    vendredi_midi = timezone.make_aware(datetime(2026, 10, 16, 12, 0))
    assert vendredi_midi.weekday() == 4

    echeance = echeance_examen(vendredi_midi)

    assert echeance.weekday() == 1          # mardi
    assert echeance - vendredi_midi > timedelta(hours=48)


def test_l_echeance_est_rendue_au_deposant(api_client, vendeur):
    _deposer(vendeur, CNI_RECTO, ComplianceDocument.Status.PENDING)
    api_client.force_authenticate(vendeur)

    reponse = api_client.get(PIECES)

    assert "reponse_attendue_avant" in reponse.data[0]


# ── « Exiger les documents complets avant le premier versement » ────────────

def test_le_versement_est_refuse_tant_que_les_pieces_manquent(api_client, vendeur):
    api_client.force_authenticate(vendeur)

    reponse = api_client.post(RETRAIT, {"amount_xaf": 5000}, format="json")

    assert reponse.status_code == 403
    assert "piece_identite" in reponse.data


# ── La regle elle-meme ──────────────────────────────────────────────────────

def test_la_verification_exige_les_trois_pieces(vendeur):
    _deposer(vendeur, CNI_RECTO)
    _deposer(vendeur, CNI_VERSO)
    assert identite_verifiee(vendeur) is False

    _deposer(vendeur, SELFIE_VIDEO)
    assert identite_verifiee(vendeur) is True
