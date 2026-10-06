"""Comptoir, code de retrait, annulation, changement de relais, carte depuis l'étranger et délais affichés,
sur le jeu d'essai de CL-02.

Recalculs dus aux décisions du porteur :
- BLV-52107 (3 colis) a coûté 197 580 F (196 780 F avant DP-18) ; annuler la boutique B rembourse 84 780 F
  (84 380 F), puis la boutique A 90 800 F (90 400 F) ; A d'abord : 90 680 F (90 280 F) ;
- changement de relais de BLV-52018 (2 colis arrivés, jeudi) : 2 × 400 F de transfert (DP-37, par colis) +
  300 F de garde (DP-08) = 1 100 F (800 F avant) ;
- carte, panier de référence : la commande B + C fait 121 900 F (121 500 F), 124 338 F avec les frais de
  service, soit 189,55 € (123 930 F, 188,93 € avant) ; le Camon 30 reste au panier.
"""

from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest

from belivay_moteurs.annulation import (
    AnnulationImpossible,
    ColisDeCommande,
    EtatColis,
    annuler,
    changer_de_relais,
)
from belivay_moteurs.carte import PARITE_EURO, en_euros, frais_de_service, payer_par_carte
from belivay_moteurs.comptoir import (
    CompteClient,
    Motif,
    apres_refus,
    biometrie_requise,
    code_faux,
    eligibilite,
    montant_du_au_retrait,
    partage,
    plafond,
    renvoi_possible,
)
from belivay_moteurs.delais import compte_a_rebours, pret_dans, reponse_sous, temps_restant
from belivay_moteurs.erreurs import ErreurMoteur
from belivay_moteurs.frais import Article, Classe, Mode, Panier, SousCommande, calculer
from belivay_moteurs.registre import charger_registre, lire_livraison, lire_paiement

REGISTRE = charger_registre()
PL = lire_livraison(REGISTRE)
PP = lire_paiement(REGISTRE)
NB = " "

CAMON30 = Article("Tecno Camon 30", 150_699, 1, Classe.S)
ENSEMBLE = Article("Ensemble wax", 32_000, 1, Classe.S)
SAC = Article("Sac cuir", 52_000, 1, Classe.S)
MIXEUR = Article("Mixeur-blender", 37_000, 1, Classe.S)
PAGNE = Article("Pagne wax", 18_500, 1, Classe.S)
ROBE = Article("Robe wax", 24_000, 1, Classe.S)
TV43 = Article("Téléviseur LED 43″", 189_000, 1, Classe.XL)
GALAXY = Article("Samsung Galaxy A15", 89_900, 1, Classe.S)
CHEMISES = Article("Chemise bazin brodée · L", 21_000, 4, Classe.S)
MARMITE = Article("Marmite en fonte 8 L", 22_000, 1, Classe.S)
VENTILO = Article("Ventilateur sur pied", 24_500, 1, Classe.L)


def relais(*sous_commandes):
    return Panier(Mode.RELAIS, sous_commandes)


def sc(boutique, zone, *articles):
    return SousCommande(boutique, zone, articles)


REFERENCE = relais(sc("A", "Mvog-Ada", CAMON30), sc("B", "Mvog-Ada", ENSEMBLE, SAC), sc("C", "Mvan", MIXEUR))
CARINE = CompteClient(commandes_retirees=4, commandes_sans_incident=4, refus_au_comptoir=0, ifa_negatif=False)
NOUVEAU = CompteClient(0, 0, 0, False)
FIDELE = CompteClient(6, 5, 0, False)


# ── Comptoir ────────────────────────────────────────────────────────────────────────────────────────────


def test_parametres_paiement():
    assert (PP.comptoir_nouveau, PP.comptoir_standard, PP.comptoir_fidele, PP.commandes_fidele) == (
        15_000,
        50_000,
        100_000,
        5,
    )
    assert (PP.refus_avant_avance, PP.carte_max, PP.carte_frais_pour_cent) == (2, 150_000, Decimal(2))
    assert (PP.code_bio, PP.code_renvois_24h, PP.code_essais, PP.code_blocage_heures) == (50_000, 3, 3, 24)
    assert PP.transfert == {"S": 400, "M": 400, "L": 600}


def test_plafonds_du_compte():
    assert (plafond(NOUVEAU, PP), plafond(CARINE, PP), plafond(FIDELE, PP)) == (15_000, 50_000, 100_000)


def test_panier_de_reference_refuse_au_comptoir():
    e = eligibilite(REFERENCE, calculer(REFERENCE, PL), CARINE, PP)
    assert (e.propose, e.motif) == (False, Motif.PLAFOND_STANDARD)
    assert e.ligne == f"Paiement au comptoir non proposé : panier au-delà de 50{NB}000{NB}F."


@pytest.mark.parametrize(
    "article, maintenant, au_retrait",
    [(ROBE, 900, 24_000), (PAGNE, 900, 18_500)],  # « 900 F de livraison maintenant, 18 500 F au retrait » (CPN-37)
)
def test_comptoir_propose(article, maintenant, au_retrait):
    panier = relais(sc("B", "Mvog-Ada", article))
    f = calculer(panier, PL)
    assert eligibilite(panier, f, CARINE, PP).propose
    p = partage(f)
    assert (p.maintenant, p.au_retrait) == (maintenant, au_retrait)


@pytest.mark.parametrize(
    "panier, compte, options, motif, ligne",
    [
        (
            Panier(Mode.DOMICILE, (SousCommande("A", "z", (TV43,), Decimal(3)),)),
            CARINE,
            {},
            Motif.GROS_COLIS_DOMICILE,
            "gros colis livré à domicile.",
        ),
        (
            relais(sc("B", "z", PAGNE)),
            NOUVEAU,
            {},
            Motif.NOUVEAU_COMPTE,
            f"panier au-delà de 15{NB}000{NB}F pour un nouveau compte.",
        ),
        (
            relais(sc("B", "z", GALAXY), sc("C", "y", MARMITE)),
            FIDELE,
            {},
            Motif.PLAFOND_FIDELE,
            f"panier au-delà de 100{NB}000{NB}F.",
        ),
        (
            relais(sc("B", "z", ROBE)),
            CARINE,
            {"vendeur_refuse": True},
            Motif.VENDEUR,
            "un vendeur de ce panier ne le propose pas.",
        ),
        (relais(sc("B", "z", ROBE)), CompteClient(4, 4, 0, True), {}, Motif.COMPTE, "pas disponible pour ton compte."),
        (relais(sc("B", "z", ROBE)), CompteClient(4, 4, 2, False), {}, Motif.COMPTE, "pas disponible pour ton compte."),
        (Panier(Mode.DOMICILE, (sc("B", "z", ROBE),)), CARINE, {}, Motif.DOMICILE, None),
        (relais(sc("B", "z", ROBE)), CARINE, {"depuis_l_etranger": True}, Motif.ETRANGER, None),
        (relais(sc("B", "z", ROBE)), CARINE, {"express": True}, Motif.EXPRESS, None),
        # Ordre de priorité : le plafond passe avant le refus du vendeur (CPN-36).
        (REFERENCE, CARINE, {"vendeur_refuse": True}, Motif.PLAFOND_STANDARD, f"panier au-delà de 50{NB}000{NB}F."),
    ],
)
def test_motifs_de_refus(panier, compte, options, motif, ligne):
    e = eligibilite(panier, calculer(panier, PL), compte, PP, **options)
    assert not e.propose and e.motif is motif
    assert e.ligne == (f"Paiement au comptoir non proposé : {ligne}" if ligne else None)


def test_fidele_jusqu_a_100_000():
    panier = relais(sc("B", "z", GALAXY))
    assert eligibilite(panier, calculer(panier, PL), FIDELE, PP).propose


def test_montant_du_au_retrait():
    assert montant_du_au_retrait(24_000, 0) == 24_000  # BLV-51940, 1er jour
    assert montant_du_au_retrait(0, 300) == 300  # BLV-52018 payée, garde du jeudi (DP-08)


def test_deux_refus_imposent_le_paiement_d_avance():
    un, oblige = apres_refus(CARINE, PP)
    assert (un.refus_au_comptoir, oblige) == (1, False)
    deux, oblige = apres_refus(un, PP)
    assert (deux.refus_au_comptoir, oblige) == (2, True)


def test_code_de_retrait():
    assert not biometrie_requise(34_180, PP)  # BLV-52018 : au toucher
    assert biometrie_requise(197_580, PP) and biometrie_requise(50_000, PP)  # BLV-52107 : empreinte ou visage
    assert renvoi_possible(2, PP) and not renvoi_possible(3, PP)
    e = code_faux(0, PP)
    assert (e.bloque, e.essais_restants) == (False, 2)
    e = code_faux(2, PP)
    assert (e.bloque, e.blocage_heures, e.nouveau_code_sur_demande) == (True, 24, True)


# ── Annulation ──────────────────────────────────────────────────────────────────────────────────────────

BLV_52107 = relais(sc("A", "Mvog-Ada", GALAXY), sc("B", "Mvog-Ada", CHEMISES), sc("C", "Mvan", MARMITE))


def test_blv_52107_paye_avec_dp_18():
    f = calculer(BLV_52107, PL)
    assert (f.total, f.offert) == (197_580, 900)


def test_annuler_b_puis_a():
    off = calculer(BLV_52107, PL).offert
    b = annuler(BLV_52107, "B", PL, off, collectee=False)
    assert (b.prix, b.livraison, b.montant) == (84_000, 780, 84_780)
    a = annuler(b.reste, "A", PL, off, collectee=False)
    assert (a.livraison, a.montant) == (900, 90_800)
    c = annuler(a.reste, "C", PL, off, collectee=False)
    assert c.montant == 22_000 and c.reste is None
    # Tout annulé : le client récupère exactement ce qu'il a payé.
    assert b.montant + a.montant + c.montant == calculer(BLV_52107, PL).total


def test_annuler_a_d_abord():
    off = calculer(BLV_52107, PL).offert
    assert annuler(BLV_52107, "A", PL, off, collectee=False).montant == 90_680


def test_livraison_offerte_conservee_sous_le_seuil():
    # Sous 30 000 F, rien n'était offert : la différence de frais revient au client.
    commande = relais(sc("A", "z", Article("x", 12_000, 1, Classe.S)), sc("B", "z", Article("y", 10_000, 1, Classe.S)))
    r = annuler(commande, "B", PL, offert=0, collectee=False)
    assert (r.livraison, r.montant) == (780, 10_780)


def test_annulation_impossible():
    with pytest.raises(AnnulationImpossible, match="CAN-09"):
        annuler(BLV_52107, "B", PL, 900, collectee=True)
    with pytest.raises(AnnulationImpossible):
        annuler(BLV_52107, "Z", PL, 900, collectee=False)


# ── Changement de relais ────────────────────────────────────────────────────────────────────────────────


def test_changement_de_relais_blv_52018():
    pagne, sandales = (
        sc("Pagne", "Mvog-Ada", PAGNE),
        sc("Sandales", "Mvog-Ada", Article("Sandales", 14_900, 1, Classe.S)),
    )
    c = changer_de_relais(
        (ColisDeCommande(pagne, EtatColis.ARRIVE), ColisDeCommande(sandales, EtatColis.ARRIVE)), PP, 300
    )
    assert (c.transfert, c.garde_due, c.montant_du) == (800, 300, 1_100)
    assert not c.deux_codes


def test_changement_gratuit_et_commande_en_partie_collectee():
    a, b = sc("A", "z", GALAXY), sc("B", "z", CHEMISES)
    c = changer_de_relais((ColisDeCommande(a, EtatColis.NON_COLLECTE), ColisDeCommande(b, EtatColis.EN_TOURNEE)), PP)
    assert (c.changent_gratuitement, c.restent_au_relais_d_origine, c.montant_du, c.deux_codes) == (
        ("A",),
        ("B",),
        0,
        True,
    )
    seul = changer_de_relais((ColisDeCommande(a, EtatColis.NON_COLLECTE),), PP, 500)
    assert (seul.montant_du, seul.garde_due) == (0, 0)


def test_transfert_d_un_colis_l():
    c = changer_de_relais((ColisDeCommande(sc("V", "z", VENTILO), EtatColis.ARRIVE),), PP)
    assert c.transfert == 600


def test_colis_xl_jamais_en_relais():
    with pytest.raises(ErreurMoteur):
        changer_de_relais((ColisDeCommande(sc("T", "z", TV43), EtatColis.ARRIVE),), PP)


# ── Carte depuis l'étranger ─────────────────────────────────────────────────────────────────────────────


def test_frais_de_service_et_euros():
    assert [frais_de_service(m, PP) for m in (11_900, 19_400, 272_579, 273_379)] == [238, 388, 5_452, 5_468]
    assert (en_euros(12_138), en_euros(19_788)) == (Decimal("18.50"), Decimal("30.17"))
    assert PARITE_EURO == Decimal("655.957")


def test_carte_panier_au_seuil():
    p = payer_par_carte(relais(sc("B", "z", PAGNE)), PL, PP)
    (t,) = p.transactions
    assert (t.frais.total, t.service, t.total, t.euros) == (19_400, 388, 19_788, Decimal("30.17"))
    assert p.reste_au_panier == ()


def test_carte_panier_de_reference_decoupe():
    p = payer_par_carte(REFERENCE, PL, PP)
    (t,) = p.transactions
    assert sorted(s.boutique for s in t.commande.sous_commandes) == ["B", "C"]
    assert (t.frais.total, t.service, t.total, t.euros) == (121_900, 2_438, 124_338, Decimal("189.55"))
    assert p.reste_au_panier == (CAMON30,)  # 150 699 + 3 014 = 153 713 F > 150 000 F


def test_carte_boutique_trop_chere_decoupee_par_article():
    boutique = sc("A", "z", Article("Frigo", 100_000, 1, Classe.S), Article("Congélateur", 80_000, 1, Classe.S))
    p = payer_par_carte(relais(boutique), PL, PP)
    assert [t.total for t in p.transactions] == [102_000, 81_600]
    assert all(t.total <= PP.carte_max for t in p.transactions)


def test_carte_articles_regroupes_dans_une_boutique_decoupee():
    boutique = sc(
        "A",
        "z",
        Article("Gros", 140_000, 1, Classe.S),
        Article("Petit", 5_000, 1, Classe.S),
        Article("Trop", 160_000, 1, Classe.S),
    )
    p = payer_par_carte(relais(boutique), PL, PP)
    # 140 000 + 5 000 F = 145 000 F, + 2 900 F de frais = 147 900 F : les deux tiennent ensemble.
    assert [len(t.commande.sous_commandes[0].articles) for t in p.transactions] == [2]
    assert p.transactions[0].total == 147_900
    assert [a.produit for a in p.reste_au_panier] == ["Trop"]
    assert p.total == sum(t.total for t in p.transactions)


# ── Délais affichés ─────────────────────────────────────────────────────────────────────────────────────

YAOUNDE = ZoneInfo("Africa/Douala")


def h(jour, heure, minute=0):
    return datetime(2026, 9, jour, heure, minute, tzinfo=YAOUNDE)


def test_compte_a_rebours():
    d = compte_a_rebours(h(24, 15), h(24, 10, 15))
    assert (d.date_ferme, d.heures, d.minutes) == (None, 4, 45)
    assert compte_a_rebours(h(24, 9), h(22, 10, 15)).date_ferme == h(24, 9)  # BLV-51940 validée mardi


def test_pret_dans():
    assert pret_dans((), h(24, 10, 15)).retirable_maintenant
    assert pret_dans((h(24, 15),), h(24, 10, 15)).pret_dans_heures == 5  # 4 h 45 → 5 h
    assert pret_dans((h(24, 15), h(24, 17)), h(24, 10, 15)).pret_dans_heures == 7
    assert pret_dans((h(24, 14, 44),), h(24, 10, 15)).pret_dans_heures == 4  # 4 h 29 → 4 h
    assert pret_dans((h(25, 11),), h(24, 10, 15)).date_ferme == h(25, 11)


def test_temps_restant_et_reponse_sous():
    assert temps_restant(h(24, 10, 27), h(24, 10, 15)) == (12, 0)
    assert temps_restant(h(24, 10, 27), h(24, 10, 30)) == (0, 0)
    assert reponse_sous(h(23, 17, 15), h(24, 10, 15), 48) == 31  # LIT-3042
    assert reponse_sous(h(23, 17, 15), h(26, 10, 15), 48) == 0


def test_heures_sans_fuseau_refusees():
    with pytest.raises(ValueError, match="Africa/Douala"):
        compte_a_rebours(datetime(2026, 9, 24, 15), datetime(2026, 9, 24, 10))  # noqa: DTZ001


def test_devises_du_payeur_a_l_etranger():
    from belivay_moteurs.carte import Devise, MoyenCarte, en_devise

    # Prototype (30 sept.) : 12 138 F → 18,50 € ; au taux de démonstration 1 $ = 578,50 F → 20,98 $.
    assert en_devise(12_138, Devise.EUR) == Decimal("18.50")
    assert en_devise(12_138, Devise.USD, Decimal("578.50")) == Decimal("20.98")
    assert en_devise(19_788, Devise.USD, Decimal("578.50")) == Decimal("34.21")
    with pytest.raises(ValueError, match="taux du jour"):
        en_devise(12_138, Devise.USD)
    assert {m.value for m in MoyenCarte} == {"carte", "Apple Pay", "Google Pay"}


# ── Corrections de l'audit : carte ──────────────────────────────────────────────────────────────────────


def test_carte_ligne_de_plusieurs_unites_decoupee():
    # 3 × 60 000 F dépassent le plafond ; deux unités tiennent ensemble (120 000 + 2 400 = 122 400 F).
    p = payer_par_carte(relais(sc("A", "z", Article("Tablette", 60_000, 3, Classe.S))), PL, PP)
    assert [(t.commande.sous_commandes[0].articles[0].quantite, t.total) for t in p.transactions] == [
        (2, 122_400),
        (1, 61_200),
    ]
    trop = payer_par_carte(relais(sc("A", "z", Article("Moto", 160_000, 2, Classe.S))), PL, PP)
    assert trop.transactions == () and trop.reste_au_panier == (Article("Moto", 160_000, 2, Classe.S),)


def test_carte_en_dollars():
    from belivay_moteurs.carte import Devise

    p = payer_par_carte(relais(sc("B", "z", PAGNE)), PL, PP, Devise.USD, Decimal("578.50"))
    (t,) = p.transactions
    assert (t.total, t.devise, t.montant_devise, t.euros) == (19_788, Devise.USD, Decimal("34.21"), Decimal("30.17"))
    (e,) = payer_par_carte(relais(sc("B", "z", PAGNE)), PL, PP).transactions
    assert (e.devise, e.montant_devise) == (Devise.EUR, Decimal("30.17"))
    with pytest.raises(ValueError, match="taux du jour"):
        payer_par_carte(relais(sc("B", "z", PAGNE)), PL, PP, Devise.USD)


def test_frais_de_service_a_l_annulation_cet_24():
    from belivay_moteurs.carte import AnnulePar, PartDuService, part_du_service

    # BLV-52124 : annulée par le bénéficiaire, 11 900 F rendus et les 238 F restent acquis ; par le vendeur, tout.
    assert part_du_service(238, 0, 11_900, True, AnnulePar.CLIENT, PP) == PartDuService(0, 238)
    assert part_du_service(238, 0, 11_900, True, AnnulePar.VENDEUR, PP) == PartDuService(238, 0)
    # Annulation partielle par BelivaY : 2 % du montant rendu, puis le reste avec la dernière boutique.
    premier = part_du_service(2_438, 0, 37_400, False, AnnulePar.BELIVAY, PP)
    dernier = part_du_service(2_438, premier.rendue, 84_500, True, "vendeur", PP)
    assert (premier.rendue, dernier.rendue, premier.rendue + dernier.rendue) == (748, 1_690, 2_438)
    assert part_du_service(100, 90, 5_000, False, AnnulePar.VENDEUR, PP).rendue == 10  # jamais plus que le reste
    for deja in (101, -1):
        with pytest.raises(ValueError):
            part_du_service(100, deja, 5_000, True, AnnulePar.VENDEUR, PP)


def test_frais_de_service_acquis_puis_rendus():
    from belivay_moteurs.carte import AnnulePar, part_du_service

    # 400 F de frais sur A et B (10 000 F chacune) : le client annule A, sa part reste acquise ; le vendeur
    # annule ensuite B : seule la part de B est rendue (CET-24).
    a = part_du_service(400, 0, 10_000, False, AnnulePar.CLIENT, PP)
    b = part_du_service(400, a.rendue + a.acquise, 10_000, True, AnnulePar.VENDEUR, PP)
    assert (a.acquise, b.rendue, a.acquise + b.rendue) == (200, 200, 400)


def test_devise_en_texte():
    from belivay_moteurs.carte import Devise, en_devise, transaction

    assert en_devise(12_138, "EUR") == Decimal("18.50")
    # Un taux du dollar donné par erreur ne change pas un paiement en euros.
    t = transaction(relais(sc("B", "z", PAGNE)), PL, PP, "EUR", Decimal("578.50"))
    assert (t.devise, t.montant_devise) == (Devise.EUR, Decimal("30.17"))
    assert (
        payer_par_carte(relais(sc("B", "z", PAGNE)), PL, PP, "USD", Decimal("578.50")).transactions[0].devise
        is Devise.USD
    )


# ── Corrections de l'audit : annulation et changement de relais ─────────────────────────────────────────

AU_COMPTOIR = relais(sc("A", "z", Article("x", 12_000, 1, Classe.S)), sc("B", "z", Article("y", 10_000, 1, Classe.S)))


def test_annulation_d_une_commande_au_comptoir_rend_seulement_l_avance():
    # Avance : 500 + 380 + 2 × 400 = 1 680 F ; les articles se paieraient au retrait.
    b = annuler(AU_COMPTOIR, "B", PL, 0, collectee=False, au_comptoir=True)
    assert (b.prix, b.livraison, b.montant) == (0, 780, 780)
    a = annuler(b.reste, "A", PL, 0, collectee=False, au_comptoir=True, encaisse=1_680, deja_rembourse=780)
    assert (a.prix, a.montant) == (0, 900) and b.montant + a.montant == 1_680


def test_annulation_jamais_au_dela_de_l_encaisse():
    r = annuler(AU_COMPTOIR, "A", PL, 0, collectee=False, encaisse=23_680, deja_rembourse=23_000)
    assert (r.montant, r.trace[-1].startswith("Plafonné")) == (680, True)
    with pytest.raises(ValueError):
        annuler(AU_COMPTOIR, "A", PL, 0, collectee=False, encaisse=1_000, deja_rembourse=1_001)
    with pytest.raises(ValueError):
        annuler(AU_COMPTOIR, "A", PL, 0, collectee=False, deja_rembourse=-1)


def test_relais_ferme_changement_gratuit_dp_42():
    pagne = sc("Pagne", "Mvog-Ada", PAGNE)
    c = changer_de_relais((ColisDeCommande(pagne, EtatColis.ARRIVE),), PP, 300, relais_ferme=True)
    assert (c.transferes, c.transfert, c.garde_due, c.montant_du, c.transfert_automatique_sous_heures) == (
        ("Pagne",),
        0,
        0,
        0,
        24,
    )
    assert "DP-42" in c.trace[0]
    assert (
        changer_de_relais((ColisDeCommande(pagne, EtatColis.ARRIVE),), PP, 300).transfert_automatique_sous_heures
        is None
    )


def test_colis_en_tournee_proposer_d_attendre_crl_07():
    a, b, v = sc("A", "z", GALAXY), sc("B", "z", CHEMISES), sc("V", "z", VENTILO)
    c = changer_de_relais(
        (
            ColisDeCommande(a, EtatColis.NON_COLLECTE),
            ColisDeCommande(b, EtatColis.EN_TOURNEE),
            ColisDeCommande(v, EtatColis.EN_TOURNEE),
        ),
        PP,
    )
    assert (c.attendre_possible, c.transfert_si_attente, c.montant_du) == (True, 1_000, 0)
    assert "CRL-07" in c.trace[-1]
    with pytest.raises(ErreurMoteur):
        changer_de_relais((ColisDeCommande(sc("T", "z", TV43), EtatColis.EN_TOURNEE),), PP)


# ── Corrections de l'audit : comptoir ───────────────────────────────────────────────────────────────────


def test_palier_du_comptoir_meme_si_deux_plafonds_sont_egaux():
    from dataclasses import replace

    from belivay_moteurs.comptoir import PalierComptoir, palier_comptoir

    assert [palier_comptoir(c, PP) for c in (NOUVEAU, CARINE, FIDELE)] == [
        PalierComptoir.NOUVEAU,
        PalierComptoir.STANDARD,
        PalierComptoir.FIDELE,
    ]
    egaux = replace(PP, comptoir_standard=15_000)
    panier = relais(sc("B", "z", PAGNE))
    e = eligibilite(panier, calculer(panier, PL), CARINE, egaux)
    assert (e.motif, e.palier) == (Motif.PLAFOND_STANDARD, PalierComptoir.STANDARD)


def test_comptoir_sans_avance_quand_la_livraison_est_offerte():
    panier = relais(sc("B", "z", Article("Robe", 40_000, 1, Classe.S)))
    p = partage(calculer(panier, PL))
    assert (p.maintenant, p.au_retrait, p.sans_avance) == (0, 40_000, True)
    assert not partage(calculer(relais(sc("B", "z", PAGNE)), PL)).sans_avance


def test_retenue_apres_refus_dp_24():
    from belivay_moteurs.comptoir import retenue_apres_refus

    r = retenue_apres_refus(900, 300)
    assert (r.retenue, r.rendu, r.non_reclame) == (300, 0, 0)
    r = retenue_apres_refus(900, 1_200)
    assert (r.retenue, r.non_reclame) == (900, 300)  # jamais au-delà de la livraison payée
    with pytest.raises(ValueError):
        retenue_apres_refus(-1, 0)


# ── Corrections de l'audit : délais ─────────────────────────────────────────────────────────────────────


def test_pret_dans_arrondi_a_24_h_donne_une_date_et_jamais_0_h():
    from datetime import UTC

    d = pret_dans((h(25, 9, 50),), h(24, 10, 15))  # 23 h 35 → 24 h : date ferme
    assert (d.pret_dans_heures, d.date_ferme) == (None, h(25, 9, 50))
    assert pret_dans((h(24, 10, 20),), h(24, 10, 15)).pret_dans_heures == 1  # 5 min : « Prêt dans 1 h »
    utc = pret_dans((datetime(2026, 9, 25, 12, tzinfo=UTC),), h(24, 10, 15)).date_ferme
    assert (utc.tzinfo, utc.hour) == (YAOUNDE, 13)
    rebours = compte_a_rebours(datetime(2026, 9, 26, 8, tzinfo=UTC), h(24, 10)).date_ferme
    assert (rebours.tzinfo, rebours.hour) == (YAOUNDE, 9)


def test_dissociation_dp_32():
    from belivay_moteurs.delais import dissociation
    from belivay_moteurs.registre import lire_garde

    pg = lire_garde(REGISTRE)
    arrivees = {"A": h(24, 10), "B": h(24, 12), "C": None}
    avant = dissociation(arrivees, h(25, 9), pg)
    assert (avant.dissocie, avant.retirables, avant.attendus, avant.le) == (False, (), ("C",), h(25, 10))
    apres = dissociation(arrivees, h(25, 12), pg)
    assert (apres.dissocie, apres.retirables) == (True, ("A", "B"))
    assert dissociation({"A": h(24, 10)}, h(26, 10), pg).le is None  # tout est arrivé
    assert dissociation({"A": None}, h(26, 10), pg).dissocie is False  # rien n'est arrivé
    with pytest.raises(ValueError):
        dissociation({"A": datetime(2026, 9, 24, 10), "B": None}, h(26, 10), pg)  # noqa: DTZ001


def test_deuxieme_annulation_sans_l_encaisse_d_origine_refusee():
    commande = relais(sc("A", "z", Article("x", 10_000, 1, Classe.S)), sc("B", "z", Article("y", 10_000, 1, Classe.S)))
    a = annuler(commande, "A", PL, 0, collectee=False)
    with pytest.raises(ValueError, match="encaissé"):
        annuler(a.reste, "B", PL, 0, collectee=False, deja_rembourse=a.montant)
    b = annuler(a.reste, "B", PL, 0, collectee=False, encaisse=calculer(commande, PL).total, deja_rembourse=a.montant)
    assert a.montant + b.montant == calculer(commande, PL).total


def test_relais_ferme_les_colis_en_tournee_changent_aussi():
    a, b = sc("A", "z", GALAXY), sc("B", "z", CHEMISES)
    c = changer_de_relais(
        (ColisDeCommande(a, EtatColis.EN_TOURNEE), ColisDeCommande(b, EtatColis.NON_COLLECTE)), PP, relais_ferme=True
    )
    assert (c.changent_gratuitement, c.restent_au_relais_d_origine, c.deux_codes) == (("A", "B"), (), False)
    assert (c.attendre_possible, c.transfert_si_attente, c.montant_du) == (False, 0, 0)


def test_dissociation_reste_acquise_quand_un_autre_colis_arrive():
    from belivay_moteurs.delais import dissociation
    from belivay_moteurs.registre import lire_garde

    pg = lire_garde(REGISTRE)
    d = dissociation({"A": h(24, 10), "B": None, "C": None}, h(25, 10), pg)
    assert (d.dissocie, d.retirables) == (True, ("A",))
    d = dissociation({"A": h(24, 10), "B": h(25, 16), "C": None}, h(25, 17), pg)
    assert (d.dissocie, d.retirables, d.attendus) == (True, ("A", "B"), ("C",))
