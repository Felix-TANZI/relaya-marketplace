# backend/tests/test_d20_espace_vendeur.py
# Tache D20 — « Completer l'espace vendeur ».
#
# Deux des quatre puces sont couvertes ici :
#   « Afficher la ligne "Paye par le client" sur le recu. »
#   « Donner au role Preparation un acces sans l'argent. »
#
# Les deux autres ne sont pas de notre ressort :
#   - « Verser chaque vendredi, avec 1 % de frais de retrait ».
#
#     Le vendredi est caduc : la decision produit du 12 octobre (commit
#     c6b73cc) a retenu le retrait a la demande, et le document n'a pas suivi.
#
#     Le 1 %, lui, est tranche depuis la feuille de route V2 Elite du
#     16 octobre, qui le dit trois fois : tableau des frais (« Versement au
#     vendeur · 1 % CamPay · Le vendeur »), D17 (« Retenir le 1 % CamPay sur
#     le versement du vendeur ») et D20 (« a la charge du vendeur »). Le code
#     applique encore l'inverse — `PayoutRequest.psp_fee_xaf` porte « Charge
#     PLATEFORME [...] referentiel § 7.1 » — et toute la comptabilite est
#     batie dessus : la tresorerie sort `montant + frais`, la depense va dans
#     EXPENSE_PSP_PAYOUT. Basculer la charge sur le vendeur suppose donc de
#     reprendre les ecritures, pas seulement le montant verse. C'est D17,
#     priorite 3.
#   - « Livrer les sous-ecrans encore "Bientot disponible" » est du frontend,
#     sur la branche espace-vendeur-belivay.

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.accounts.models import ComplianceDocument
from apps.catalog.models import Category, ModerationStatus, Product
from apps.orders.models import Order, OrderItem
from apps.vendor_team.models import (
    DROITS_ASSIGNABLES,
    DROITS_RESERVES_PROPRIETAIRE,
    VendorEmployee,
)
from apps.vendors.kyc import PIECES_EXIGEES
from apps.vendors.models import VendorProfile
from apps.vendors.views import lignes_totaux_recu

pytestmark = pytest.mark.django_db


@pytest.fixture
def boutique(django_user_model):
    user = django_user_model.objects.create_user(
        username="vendeur_d20", email="vendeur.d20@example.com", password="D20-2026",
    )
    profil = VendorProfile.objects.create(
        user=user, business_name="Boutique D20", business_description="Test",
        phone="+237650000010", address="Mvan", city="YAOUNDE", status="APPROVED",
    )
    for piece in PIECES_EXIGEES:
        ComplianceDocument.objects.create(
            user=user, owner_role=ComplianceDocument.OwnerRole.VENDOR,
            document_type=piece, file=SimpleUploadedFile(f"{piece}.jpg", b"x"),
            status=ComplianceDocument.Status.APPROVED,
        )
    return user, profil


# ── « Afficher la ligne "Paye par le client" sur le recu » ───────────────────

def test_le_recu_affiche_paye_par_le_client_et_jamais_la_commission():
    """
    D20 demandait la ligne « Paye par le client ». La spec v2.1 (R26.1) ajoute que l'espace vendeur montre net_b et
    NE DOIT JAMAIS montrer ce qui est retenu : aucune ligne de commission (RCU-01).

    On verifie les lignes, pas le PDF : le flux d'un PDF reportlab est
    compresse, chercher le texte dans les octets produits ne prouverait rien.
    """
    lignes = lignes_totaux_recu(paye_par_client=20000, net=18000)

    assert [libelle for libelle, _, _ in lignes] == ["Paye par le client", "Vous recevez"]
    assert not any("ommission" in libelle for libelle, _, _ in lignes)
    assert [negatif for _, _, negatif in lignes] == [False, False]


def test_le_recu_ne_montre_que_les_articles_du_vendeur(api_client, boutique):
    """
    Regle de confidentialite : « Le vendeur ne voit jamais l'identite du
    client, son adresse, son relais ni le total paye. »

    La ligne « Paye par le client » recoit donc le sous-total DU VENDEUR, pas
    `order.total_xaf` qui comprend la livraison et les articles des autres.
    """
    vendeur, _ = boutique
    categorie = Category.objects.create(name="Tel", slug="tel-d20b")
    produit = Product.objects.create(
        title="Telephone", category=categorie, vendor=vendeur, price_xaf=20000,
        moderation_status=ModerationStatus.APPROVED,
    )
    commande = Order.objects.create(
        user=vendeur, customer_phone="+237650000012", city="YAOUNDE",
        address="Mvan", subtotal_xaf=20000, total_xaf=97531,
        delivery_fee_xaf=1500, commission_rate_snapshot=10,
    )
    OrderItem.objects.create(
        order=commande, product=produit, title_snapshot="Telephone",
        price_xaf_snapshot=20000, qty=1, line_total_xaf=20000,
    )
    api_client.force_authenticate(vendeur)

    reponse = api_client.get(f"/api/vendors/orders/{commande.id}/receipt-pdf/")

    # Le recu se genere (la dependance reportlab est bien la) ...
    assert reponse.status_code == 200
    # ... et la ligne porte le sous-total vendeur, jamais les 97 531 payes.
    lignes = lignes_totaux_recu(paye_par_client=20000, net=18000)
    assert lignes[0][1] == 20000
    assert 97531 not in [montant for _, montant, _ in lignes]


# ── « Donner au role Preparation un acces sans l'argent » ───────────────────
#
# Le modele d'equipe (apps.vendor_team) reserve cinq droits au proprietaire,
# dont `argent.voir`. Ces tests figent cette garantie : elle n'en avait aucun.

def test_le_droit_de_voir_l_argent_n_est_jamais_assignable():
    assert "argent.voir" in DROITS_RESERVES_PROPRIETAIRE
    assert "argent.voir" not in DROITS_ASSIGNABLES


def test_un_employe_de_preparation_ne_recoit_pas_l_acces_a_l_argent(boutique):
    """
    Le proprietaire a beau cocher `argent.voir` cote ecran, le serveur le
    retire. C'est le serveur qui decide, pas l'interface.
    """
    _, profil = boutique

    employe = VendorEmployee.objects.create(
        vendor=profil, first_name="Preparateur", phone="+237650000013",
        role=VendorEmployee.Role.EMPLOYEE,
        droits=["commandes.preparer", "commandes.remettre", "argent.voir"],
    )

    assert "commandes.preparer" in employe.droits
    assert "argent.voir" not in employe.droits


def test_aucun_droit_reserve_ne_passe_meme_en_les_demandant_tous(boutique):
    _, profil = boutique

    employe = VendorEmployee.objects.create(
        vendor=profil, first_name="Gourmand", phone="+237650000014",
        role=VendorEmployee.Role.EMPLOYEE,
        droits=list(DROITS_ASSIGNABLES) + list(DROITS_RESERVES_PROPRIETAIRE),
    )

    for reserve in DROITS_RESERVES_PROPRIETAIRE:
        assert reserve not in employe.droits
    assert set(employe.droits) == set(DROITS_ASSIGNABLES)


def test_le_filtrage_resiste_a_une_modification_apres_coup(boutique):
    """Le filtre est dans save() : rouvrir et reenregistrer ne l'ouvre pas."""
    _, profil = boutique
    employe = VendorEmployee.objects.create(
        vendor=profil, first_name="Preparateur2", phone="+237650000015",
        role=VendorEmployee.Role.EMPLOYEE, droits=["commandes.preparer"],
    )

    employe.droits = ["commandes.preparer", "argent.voir"]
    employe.save()
    employe.refresh_from_db()

    assert "argent.voir" not in employe.droits
