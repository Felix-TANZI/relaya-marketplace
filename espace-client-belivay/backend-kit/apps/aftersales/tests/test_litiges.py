from datetime import timedelta
from unittest import mock

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone

from apps.aftersales import services
from apps.aftersales.models import Litige, PreuveLitige, Remplacement, Retour
from apps.client_core.tests.outils import client_connecte, creer_boutique, creer_client, creer_produit
from apps.messaging.models import Conversation
from apps.pickup.models import SousCommande

from .fabriques import PNG, PNG_DATA_URL, commande_retiree

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _medias(tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path


@pytest.fixture
def carine():
    return creer_client()


@pytest.fixture
def api(carine):
    return client_connecte(carine)


def ouvrir(api, o, colis=1, souhait="rembourse", cle="cle-litige-0001", **extra):
    corps = {
        "ref": f"BLV-{o.pk}",
        "colis": colis,
        "pb": "abime",
        "description": "Semelle fendue",
        "souhait": souhait,
        "photos": [],
        **extra,
    }
    return api.post("/api/disputes", corps, format="json", HTTP_IDEMPOTENCY_KEY=cle)


# ── Ouvrir ──────────────────────────────────────────────────────────────────────────────────────────────


def test_ouvrir_un_litige_bloque_le_montant_du_colis_et_ouvre_le_dossier(api, carine):
    o, colis, *_ = commande_retiree(carine, prix=(18_500, 14_500))
    r = ouvrir(api, o, colis=2, photos=[PNG_DATA_URL])
    assert r.status_code == 200, r.content
    lit = r.json()
    assert lit["ref"] == f"BLV-{o.pk}" and lit["colis"] == 2
    assert lit["montant"] == 14_500
    assert lit["etat"] == "attente"  # palier « À instruire » par défaut : aucun remboursement automatique
    assert lit["echeance"] - lit["ouvertLe"] == 48 * 3600 * 1000  # LIT-VENDEUR-H
    assert lit["preuves"][0]["titre"] == "Ta photo 1" and lit["preuves"][0]["photo"]
    assert lit["origine"] == "appli" and lit["relais"] == "Relais Mvog-Ada"
    colis[1].refresh_from_db()
    assert colis[1].etat == "en_litige"
    assert Litige.objects.get().etat == "attente_vendeur"
    conv = Conversation.objects.get(cle=lit["id"])
    assert conv.type == "dossier" and conv.entete["bloque"] == 14_500


def test_ouvrir_exige_une_cle_d_idempotence_et_rejoue_la_reponse(api, carine):
    o, *_ = commande_retiree(carine)
    corps = {"ref": f"BLV-{o.pk}", "colis": 1, "pb": "abime", "description": "", "souhait": "rembourse", "photos": []}
    assert api.post("/api/disputes", corps, format="json").status_code == 400
    a = ouvrir(api, o)
    b = ouvrir(api, o)
    assert b.status_code == 200 and b.json()["id"] == a.json()["id"] and b["Idempotent-Replayed"] == "true"


def test_un_seul_dossier_par_colis(api, carine):
    o, *_ = commande_retiree(carine)
    premier = ouvrir(api, o).json()
    r = ouvrir(api, o, cle="cle-litige-0002")
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "deja" and r.json()["error"]["data"]["id"] == premier["id"]


def test_colis_accepte_aussi_sa_reference(api, carine):
    o, *_ = commande_retiree(carine)
    assert ouvrir(api, o, colis=f"{o.pk}-1").status_code == 200


@override_settings(BELIVAY_PALIER_IFA_PAR_DEFAUT="Standard")
def test_remboursement_automatique_sous_le_seuil_du_palier(api, carine):
    o, colis, *_ = commande_retiree(carine, prix=(3_000,))
    with mock.patch("apps.aftersales.signaux.litige_rembourse.send") as envoi:
        with pytest.MonkeyPatch.context() as m:
            m.setattr("django.db.transaction.on_commit", lambda f, **k: f())
            lit = ouvrir(api, o).json()
    assert lit["etat"] == "rembourse" and lit["origine"] == "auto"
    assert "3 000 F" in lit["decision"]["motif"]
    assert envoi.call_args.kwargs["montant"] == 3_000
    colis[0].refresh_from_db()
    assert colis[0].etat == "remise"  # sans dossier ni retour
    assert not Conversation.objects.filter(type="dossier").exists()


@override_settings(BELIVAY_PALIER_IFA_PAR_DEFAUT="Standard")
def test_au_dessus_du_seuil_le_dossier_s_ouvre(api, carine):
    o, *_ = commande_retiree(carine, prix=(3_001,))
    assert ouvrir(api, o).json()["etat"] == "attente"


def test_apres_la_fenetre_seul_le_vice_cache_reste_couvert(api, carine):
    o, *_ = commande_retiree(carine, retiree_il_y_a=timedelta(days=30))
    assert ouvrir(api, o).status_code == 200  # RET-VICE : 100 jours
    o2, *_ = commande_retiree(carine, retiree_il_y_a=timedelta(days=101))
    r = ouvrir(api, o2, cle="cle-litige-0002")
    assert r.status_code == 422 and r.json()["error"]["code"] == "fenetre_fermee"


def test_colis_pas_encore_remis_refuse(api, carine):
    o, *_ = commande_retiree(carine, etat="prete")
    r = ouvrir(api, o)
    assert r.status_code == 409 and r.json()["error"]["code"] == "state_changed"


def test_constat_au_comptoir_sur_un_colis_arrive(api, carine):
    o, colis, *_ = commande_retiree(carine, etat="arrivee_relais")
    lit = ouvrir(api, o, origine="comptoir", souhait="remplace").json()
    assert lit["origine"] == "comptoir" and lit["etat"] == "attente"
    colis[0].refresh_from_db()
    assert colis[0].etat == "en_litige"


def test_commande_d_un_autre_client_404(api):
    autre = creer_client()
    o, *_ = commande_retiree(autre)
    assert ouvrir(api, o).status_code == 404


def test_photo_qui_n_est_pas_une_image_400(api, carine):
    o, *_ = commande_retiree(carine)
    r = ouvrir(api, o, photos=["data:image/png;base64,SGVsbG8gdG91dCBsZSBtb25kZQ=="])
    assert r.status_code == 400 and r.json()["error"]["code"] == "photo_invalide"
    assert not Litige.objects.exists()


# ── Lire ────────────────────────────────────────────────────────────────────────────────────────────────


def test_mes_litiges_et_un_litige(api, carine):
    o, *_ = commande_retiree(carine, prix=(5_000, 6_000))
    a = ouvrir(api, o, colis=1).json()
    ouvrir(api, o, colis=2, cle="cle-litige-0002")
    r = api.get("/api/me/disputes?limit=1").json()
    assert len(r["litiges"]) == 1 and r["next_cursor"] and r["maintenant"]
    suite = api.get(f"/api/me/disputes?limit=1&cursor={r['next_cursor']}").json()
    assert suite["litiges"][0]["id"] == a["id"] and suite["next_cursor"] is None
    d = api.get(f"/api/disputes/{a['id']}").json()
    assert d["litige"]["id"] == a["id"]
    assert client_connecte(creer_client()).get(f"/api/disputes/{a['id']}").status_code == 404


def test_preuve_multipart_horodatee_par_le_serveur(api, carine):
    o, *_ = commande_retiree(carine)
    lit = ouvrir(api, o).json()
    r = api.post(
        f"/api/disputes/{lit['id']}/photos", {"photo": SimpleUploadedFile("x.png", PNG, content_type="image/png")}, format="multipart"
    )
    assert r.status_code == 204
    p = PreuveLitige.objects.get()
    assert p.titre == "Ta photo 1" and p.sous.startswith("versée au dossier le ")
    faux = SimpleUploadedFile("x.png", b"pas une image du tout", content_type="image/png")
    assert api.post(f"/api/disputes/{lit['id']}/photos", {"photo": faux}, format="multipart").status_code == 400


# ── Arrangement, recours, retrait ───────────────────────────────────────────────────────────────────────


def _litige(api, carine, **kw):
    o, colis, *_ = commande_retiree(carine, **kw)
    return Litige.objects.get(pk=services.numero_litige(ouvrir(api, o).json()["id"])), colis


def test_arrangement_accepte_rembourse_et_clot(api, carine):
    lit, _ = _litige(api, carine)
    assert api.post(f"/api/disputes/{lit.ref}/arrangement", {"accepte": True}, format="json").status_code == 409
    services.reponse_du_vendeur(lit, "arrangement", montant=8_000, texte="Je rembourse 8 000 F, le client garde la paire de sandales.")
    assert api.get(f"/api/disputes/{lit.ref}").json()["litige"]["etat"] == "arrangement"
    assert api.post(f"/api/disputes/{lit.ref}/arrangement", {"accepte": True}, format="json").status_code == 204
    d = api.get(f"/api/disputes/{lit.ref}").json()["litige"]
    assert d["etat"] == "rembourse" and d["arrangement"]["montant"] == 8_000
    lit.refresh_from_db()
    assert lit.rembourse == 8_000 and lit.clos_le is not None


def test_arrangement_refuse_passe_en_examen(api, carine):
    lit, _ = _litige(api, carine)
    services.reponse_du_vendeur(lit, "arrangement", montant=5_000, texte="Je propose 5 000 F de geste commercial pour la gêne.")
    assert api.post(f"/api/disputes/{lit.ref}/arrangement", {"accepte": False}, format="json").status_code == 204
    assert api.get(f"/api/disputes/{lit.ref}").json()["litige"]["etat"] == "examen"


def test_arrangement_hors_delai(api, carine):
    lit, _ = _litige(api, carine)
    services.reponse_du_vendeur(lit, "arrangement", montant=5_000, texte="Je propose 5 000 F de geste commercial pour la gêne.")
    plus_tard = timezone.now() + timedelta(days=6)  # LIT-ARRANG-REPONSE-J : 5 jours
    with mock.patch("apps.aftersales.services._maintenant", return_value=plus_tard):
        r = api.post(f"/api/disputes/{lit.ref}/arrangement", {"accepte": True}, format="json")
    assert r.status_code == 422 and r.json()["error"]["code"] == "fenetre_fermee"


def test_recours_une_fois_sous_48_h(api, carine):
    lit, _ = _litige(api, carine)
    services.reponse_du_vendeur(lit, "conteste", texte="Le colis était intact au départ.")
    services.decider(lit, "refuse", "Les photos ne montrent pas de défaut.")
    assert api.get(f"/api/disputes/{lit.ref}").json()["litige"]["etat"] == "refuse"
    assert api.post(f"/api/disputes/{lit.ref}/appeal", {"motif": "Regardez la 2e photo"}, format="json").status_code == 204
    d = api.get(f"/api/disputes/{lit.ref}").json()["litige"]
    assert d["etat"] == "examen" and d["decision"]["conteste"] is True
    services.decider(lit, "refuse", "Confirmé par une autre personne.")
    r = api.post(f"/api/disputes/{lit.ref}/appeal", {"motif": "encore"}, format="json")
    assert r.status_code == 409


def test_recours_trop_tard(api, carine):
    lit, _ = _litige(api, carine)
    services.reponse_du_vendeur(lit, "silence")
    services.decider(lit, "refuse", "Motif écrit.")
    with mock.patch("apps.aftersales.services._maintenant", return_value=timezone.now() + timedelta(hours=49)):
        assert api.post(f"/api/disputes/{lit.ref}/appeal", {"motif": ""}, format="json").status_code == 409


def test_retirer_rend_le_colis_et_permet_un_nouveau_dossier(api, carine):
    lit, colis = _litige(api, carine)
    assert api.post(f"/api/disputes/{lit.ref}/withdraw").status_code == 204
    colis[0].refresh_from_db()
    assert colis[0].etat == "remise"
    assert api.get(f"/api/disputes/{lit.ref}").json()["litige"]["etat"] == "retire"
    assert Conversation.objects.get(cle=lit.ref).resolue
    assert api.post(f"/api/disputes/{lit.ref}/withdraw").status_code == 409
    o_ref = f"BLV-{lit.order_id}"
    r = api.post(
        "/api/disputes",
        {"ref": o_ref, "colis": 1, "pb": "abime", "description": "", "souhait": "rembourse", "photos": []},
        format="json",
        HTTP_IDEMPOTENCY_KEY="cle-litige-0009",
    )
    assert r.status_code == 200


# ── Retour ──────────────────────────────────────────────────────────────────────────────────────────────


def test_depot_du_retour(api, carine):
    lit, colis = _litige(api, carine)
    assert api.post(f"/api/returns/{lit.ref}/deposit").status_code == 404
    services.reponse_du_vendeur(lit, "accepte", texte="Retour accepté.")
    colis[0].refresh_from_db()
    assert colis[0].etat == "retour_en_cours"
    d = api.get(f"/api/disputes/{lit.ref}").json()["litige"]
    assert d["etat"] == "accepte" and d["retour"]["etape"] == "depot"
    assert api.post(f"/api/returns/{lit.ref}/deposit").status_code == 204
    d = api.get(f"/api/disputes/{lit.ref}").json()["litige"]
    assert d["retour"]["etape"] == "depose" and "depose" in d["retour"]["dates"]
    assert api.post(f"/api/returns/{lit.ref}/deposit").status_code == 409
    for ev in ("return.collected", "return.received", "return.inspected", "return.closed"):
        services.avancer_retour(lit, ev, en_tort="client")
    r = Retour.objects.get(litige=lit)
    assert r.rembourse == 23_000 - 500  # RET-TRAJET retenu : le client est en tort
    assert api.get(f"/api/disputes/{lit.ref}").json()["litige"]["etat"] == "rembourse"


# ── Remplacement ────────────────────────────────────────────────────────────────────────────────────────


def _remplacement(api, carine):
    from apps.catalog.models import MasterProduct

    o, colis, produits, _ = commande_retiree(carine, prix=(37_000,))
    maitre = MasterProduct.objects.create(title="Mixeur")
    produits[0].master = maitre
    produits[0].save()
    autre = creer_produit(creer_boutique(nom="Boutique F"), prix=37_500, master=maitre)
    lit = Litige.objects.get(pk=services.numero_litige(ouvrir(api, o, souhait="remplace").json()["id"]))
    services.reponse_du_vendeur(lit, "accepte", texte="Je remplace.")
    return o, lit, autre


def test_remplacement_chez_un_autre_vendeur(api, carine):
    o, lit, autre = _remplacement(api, carine)
    assert api.post(f"/api/orders/BLV-{o.pk}/replacement", {"autre_vendeur": True}, format="json").status_code == 409
    r = services.proposer_autre_vendeur(lit, {autre.vendor.vendor_profile.pk: 80})
    assert r.etat == "autre_vendeur" and r.autre_boutique == "Boutique F" and r.ecart == 500
    d = api.get(f"/api/disputes/{lit.ref}").json()["litige"]
    assert d["remplacement"]["etape"] == "autre" and d["remplacement"]["autre"] == {"boutique": "Boutique F", "trust": 80, "ecart": 500}
    assert api.post(f"/api/orders/BLV-{o.pk}/replacement", {"autre_vendeur": True}, format="json").status_code == 204
    assert Remplacement.objects.get().autre_accepte_le is not None


def test_vendeur_au_trust_score_trop_bas_ecarte(api, carine):
    _, lit, autre = _remplacement(api, carine)
    assert services.proposer_autre_vendeur(lit, {autre.vendor.vendor_profile.pk: 60}) is None  # REMPL-TRUST-MIN


def test_remplacement_refuse_rembourse(api, carine):
    o, lit, autre = _remplacement(api, carine)
    services.proposer_autre_vendeur(lit, {autre.vendor.vendor_profile.pk: 90})
    assert api.post(f"/api/orders/{lit.ref}/replacement", {"autre_vendeur": False}, format="json").status_code == 204
    d = api.get(f"/api/disputes/{lit.ref}").json()["litige"]
    assert d["etat"] == "rembourse" and "remplacement" not in d
    assert (
        client_connecte(creer_client()).post(f"/api/orders/BLV-{o.pk}/replacement", {"autre_vendeur": False}, format="json").status_code
        == 404
    )


# ── Commande vue pour un litige ─────────────────────────────────────────────────────────────────────────


def test_commande_pour_un_litige(api, carine):
    o, *_ = commande_retiree(carine, prix=(18_500, 14_500))
    r = api.get(f"/api/orders/BLV-{o.pk}?for=dispute")
    assert r.status_code == 200
    c = r.json()
    assert c["fenetre"] == "ouverte" and c["finCachee"] == ""
    assert [x["montant"] for x in c["colis"]] == [18_500, 14_500]
    assert c["colis"][0]["detail"].startswith("retiré le ")
    assert c["payePar"] == "MTN MoMo 6 77 ·· ·· 41"
    assert api.get(f"/api/orders/BLV-{o.pk}").status_code == 400
    assert client_connecte(creer_client()).get(f"/api/orders/BLV-{o.pk}?for=dispute").status_code == 404


def test_commande_apres_la_fenetre_seul_le_defaut_cache(api, carine):
    o, *_ = commande_retiree(carine, retiree_il_y_a=timedelta(days=10))
    c = api.get(f"/api/orders/{o.pk}?for=dispute").json()
    assert c["fenetre"] == "cachee" and c["finCachee"]


# ── Services exposés ────────────────────────────────────────────────────────────────────────────────────


def test_services_exposes(api, carine):
    lit, _ = _litige(api, carine)
    assert services.litiges_en_cours(carine) == 1
    assert services.jours_suspendus(lit.order_id) == {timezone.localdate(lit.ouvert_le, services.YAOUNDE)}
    assert services.dossier_en_cours(carine)["id"] == lit.ref
    services.retirer(carine, lit.ref)
    assert services.litiges_en_cours(carine) == 0
    assert services.dossier_en_cours(carine) is None


def test_photo_de_la_conversation_versee_au_dossier(api, carine):
    lit, _ = _litige(api, carine)
    r = api.post(f"/api/me/threads/{lit.ref}/messages", {"photo": PNG_DATA_URL}, format="json")
    assert r.status_code == 200
    p = PreuveLitige.objects.get(litige=lit)
    assert p.source == "conversation" and p.photo.name.startswith("messagerie/")
    assert SousCommande.objects.get(order_id=lit.order_id).etat == "en_litige"
