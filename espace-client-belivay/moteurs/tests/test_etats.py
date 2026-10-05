"""Machines à états (CL-02) : un test par transition, dans les deux sens (permise quand sa garde est remplie,
refusée quand une condition exigée manque ou qu'une condition interdite est vraie), et des contrôles de structure."""

import pytest

from belivay_moteurs.etats import (
    COMMANDE,
    ESCROW,
    LITIGE,
    MACHINES,
    RANG_DE_LA_JAUGE,
    REMPLACEMENT,
    RETOUR,
    SOUS_COMMANDE,
    TENTATIVE_PAIEMENT,
    Transition,
    TransitionRefusee,
)

TOUTES = [(m, t) for m in MACHINES for t in m.transitions]


def ident(x):
    m, t = x
    return f"{m.nom}:{t.de}--{t.evenement}->{t.vers}"


@pytest.mark.parametrize("machine_transition", TOUTES, ids=[ident(x) for x in TOUTES])
def test_chaque_transition_permise_quand_sa_garde_est_remplie(machine_transition):
    m, t = machine_transition
    contexte = {k: True for k in t.exige}
    assert m.appliquer(t.de, t.evenement, contexte) == t


GARDEES = [(m, t, k, "exige") for m, t in TOUTES for k in t.exige] + [
    (m, t, k, "interdit") for m, t in TOUTES for k in t.interdit
]


@pytest.mark.parametrize("cas", GARDEES, ids=[f"{ident((m, t))}:{sens}:{k}" for m, t, k, sens in GARDEES])
def test_chaque_garde_refuse_quand_elle_n_est_pas_remplie(cas):
    m, t, cle, sens = cas
    contexte = {k: True for k in t.exige}
    if sens == "exige":
        contexte[cle] = False
    else:
        contexte[cle] = True
    try:
        obtenue = m.appliquer(t.de, t.evenement, contexte)
    except TransitionRefusee:
        return
    # Une autre transition du même événement peut prendre le relais (rupture : vendeur suivant ou annulation),
    # jamais celle dont la garde n'est pas remplie.
    assert obtenue != t


@pytest.mark.parametrize("machine", MACHINES, ids=[m.nom for m in MACHINES])
def test_evenement_inconnu_refuse(machine):
    for etat in machine.etats:
        with pytest.raises(TransitionRefusee):
            machine.appliquer(etat, "evenement.inconnu", {})


@pytest.mark.parametrize("machine", MACHINES, ids=[m.nom for m in MACHINES])
def test_structure(machine):
    departs = {t.de for t in machine.transitions}
    # Les états finaux n'ont aucune transition sortante ; tout état non final en a au moins une.
    assert not (machine.etats_finaux & departs)
    assert machine.etats - machine.etats_finaux - {"—"} <= departs
    # Tout état est atteignable depuis « — ».
    atteints, pile = {"—"}, ["—"]
    while pile:
        e = pile.pop()
        for t in machine.possibles(e):
            if t.vers not in atteints:
                atteints.add(t.vers)
                pile.append(t.vers)
    assert atteints == machine.etats
    # Pas deux transitions identiques (même départ, même événement, même garde).
    cles = [(t.de, t.evenement, t.exige, t.interdit) for t in machine.transitions]
    assert len(cles) == len(set(cles))


def test_nombre_de_transitions():
    assert [len(m.transitions) for m in MACHINES] == [10, 19, 7, 7, 11, 7, 7]


def test_parcours_d_une_commande_payee_jusqu_au_retrait():
    e = "—"
    for evenement, ctx in [
        ("cart.updated", {}),
        ("checkout", {"numero_verifie": True, "prix_controles": True, "stock_reservable": True}),
        ("payment.succeeded", {"montant_egal_serveur": True, "cle_tentative_en_cours": True}),
    ]:
        e = COMMANDE.appliquer(e, evenement, ctx).vers
    assert e == "payee"
    sc = "—"
    for evenement, ctx in [
        ("order.paid", {}),
        ("seller.confirmed", {}),
        ("suborder.ready", {}),
        ("parcel.collected", {"deux_photos": True, "scelle": True, "code_de_remise": True}),
        ("parcel.received", {"code_de_depot": True}),
        ("parcel.handed", {"code_valide": True, "photo": True, "montant_du_paye": True, "nombre_de_colis": True}),
    ]:
        sc = SOUS_COMMANDE.appliquer(sc, evenement, ctx).vers
        assert RANG_DE_LA_JAUGE.get(sc) is not None
    assert sc == "remise" and RANG_DE_LA_JAUGE[sc] == 4


def test_annulation_impossible_apres_la_collecte():
    with pytest.raises(TransitionRefusee):
        SOUS_COMMANDE.appliquer("collectee", "suborder.cancel", {})
    for etat in ("payee", "confirmee", "prete"):
        assert SOUS_COMMANDE.appliquer(etat, "suborder.cancel", {}).vers == "annulee"


def test_rupture_de_stock_dp_01():
    assert SOUS_COMMANDE.appliquer("payee", "stock.out", {"vendeur_suivant_disponible": True}).vers == "payee"
    assert SOUS_COMMANDE.appliquer("confirmee", "stock.out", {}).vers == "annulee"


def test_paiement_non_abouti_rend_le_panier():
    for evenement in ("payment.failed", "payment.expired", "payment.cancelled"):
        assert COMMANDE.appliquer("en_attente_paiement", evenement, {}).vers == "panier"


def test_tentative_de_paiement_et_escrow():
    assert (
        TENTATIVE_PAIEMENT.appliquer("verifying", "aggregator.confirmed", {"webhook_signe_valide": True}).vers
        == "succeeded"
    )
    with pytest.raises(TransitionRefusee):
        TENTATIVE_PAIEMENT.appliquer("verifying", "aggregator.confirmed", {})  # webhook non signé : jamais payé
    assert ESCROW.appliquer("escrow_bloque", "dispute.opened").vers == "suspendu"
    assert ESCROW.appliquer("suspendu", "dispute.rejected").vers == "escrow_liberable"


def test_litige_sous_le_seuil_et_recours():
    assert (
        LITIGE.appliquer("—", "dispute.auto_refunded", {"sous_seuil_automatique": True}).vers
        == "rembourse_automatiquement"
    )
    with pytest.raises(TransitionRefusee):
        LITIGE.appliquer("—", "dispute.opened", {"sous_seuil_automatique": True})
    with pytest.raises(TransitionRefusee):
        LITIGE.appliquer("—", "dispute.opened", {"dossier_deja_ouvert": True})  # un seul dossier ouvert par colis
    assert LITIGE.appliquer("decide", "appeal.filed", {"recours_possible": True}).vers == "en_examen"


def test_retour_toujours_par_le_relais_dp_10():
    assert "sans_retour" not in RETOUR.etats
    assert RETOUR.appliquer("recu", "inspection.expired").vers == "clos"


def test_remplacement():
    assert REMPLACEMENT.appliquer("attente", "replacement.late").vers == "rembourse"
    with pytest.raises(TransitionRefusee):
        REMPLACEMENT.appliquer("attente", "seller.out_of_stock", {})


def test_transition_sans_garde_permise_partout():
    assert Transition("a", "e", "b").permise({})
    assert not Transition("a", "e", "b", ("x",)).permise({})
    assert not Transition("a", "e", "b", (), ("y",)).permise({"y": True})
