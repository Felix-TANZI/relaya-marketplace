# backend/apps/pickup/tests/test_evenements.py
# Événements des vendeurs, livreurs et relais (apps.pickup.evenements) : machine SOUS_COMMANDE, accusé fort au dernier
# colis arrivé, code de retrait affiché au client, remise au comptoir avec le code, refus d'un événement impossible.
import pytest

from apps.pickup import evenements, services
from apps.pickup.models import GroupeRemise, SousCommande
from belivay_moteurs.etats import TransitionRefusee

from .test_commande_retrait import commande, isoler  # noqa: F401 - fixtures partagées

pytestmark = pytest.mark.django_db

PARCOURS = ("seller.confirmed", "suborder.ready", "parcel.collected", "parcel.received")


def test_du_vendeur_au_comptoir(commande):  # noqa: F811
    oid, user = commande["order_id"], commande["user"]
    assert services.vue_commande_client(oid, user)["code"] is None
    evenements.avancer(oid, "seller.confirmed")
    evenements.avancer(oid, "suborder.ready")
    evenements.avancer(oid, "parcel.collected")
    assert services.vue_commande_client(oid, user)["etat"] == "route"
    # Un seul colis arrivé : pas encore d'accusé fort ni de code.
    evenements.avancer(oid, "parcel.received", n=1)
    assert GroupeRemise.objects.get(order_id=oid).accuse_fort_le is None
    assert services.vue_commande_client(oid, user)["code"] is None
    evenements.avancer(oid, "parcel.received", n=2)
    g = GroupeRemise.objects.get(order_id=oid)
    assert g.accuse_fort_le is not None
    vue = services.vue_commande_client(oid, user)
    assert vue["etat"] == "retirable" and len(vue["code"]) == 6 and vue["arriveeLe"]
    # Code faux : refusé, essais comptés ; bon code : colis remis, garde arrêtée, fenêtre de retour ouverte.
    faux = "000000" if vue["code"] != "000000" else "111111"
    assert evenements.remettre_au_client(oid, faux)["ok"] is False
    r = evenements.remettre_au_client(oid, vue["code"])
    assert r == {"ok": True, "colis": 2, "ref": commande["ref"]}
    vue = services.vue_commande_client(oid, user)
    assert vue["etat"] == "retiree" and vue["retireeLe"] and vue["retourJusqua"] > vue["retireeLe"]
    assert set(SousCommande.objects.filter(order_id=oid).values_list("etat", flat=True)) == {"remise"}
    assert GroupeRemise.objects.get(order_id=oid).retire_le is not None
    # Plus rien à remettre.
    assert evenements.remettre_au_client(oid, vue["code"] or "123456") == {"ok": False, "raison": "aucun_colis"}


def test_evenement_impossible_et_inconnu(commande):  # noqa: F811
    oid = commande["order_id"]
    with pytest.raises(TransitionRefusee):
        evenements.avancer(oid, "parcel.received")  # pas encore collecté
    with pytest.raises(ValueError):
        evenements.avancer(oid, "parcel.lost")
    # Remise avant l'arrivée : le bon code ne suffit pas.
    g = GroupeRemise.objects.get(order_id=oid)
    assert evenements.remettre_au_client(oid, services.code_de(g)) == {"ok": False, "raison": "pas_arrive"}


def test_arrivee_annoncee_sans_le_code(commande, monkeypatch):  # noqa: F811
    envoyees = []
    monkeypatch.setattr("apps.notifications_client.services.notifier", lambda *a, **k: envoyees.append((a, k)) or True)
    for e in PARCOURS:
        evenements.avancer(commande["order_id"], e)
    assert len(envoyees) == 1
    (user, titre, texte, lien), k = envoyees[0]
    code = services.code_de(GroupeRemise.objects.get(order_id=commande["order_id"]))
    assert user == commande["user"] and code not in titre + texte and k["type"] == "retrait" and commande["ref"] in lien
