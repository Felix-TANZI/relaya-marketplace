# Règles pures portées du site (site/src/demo/source-demo.ts, magasin.ts ; pages CL-11).
from datetime import UTC, date, datetime

from apps.aftersales import regles


def test_dates_comme_le_jeu_d_essai():
    # BLV-51702 : retiré le sam. 19 sept. à 11 h 32 (Yaoundé = UTC + 1)
    t = datetime(2026, 9, 19, 10, 32, tzinfo=UTC)
    assert regles.date_fr(t) == "sam. 19 sept. à 11 h 32"
    assert regles.retire_le(t, date(2026, 9, 19)) == "retiré aujourd’hui à 11 h 32"
    assert regles.retire_le(t, date(2026, 9, 25)) == "retiré le sam. 19 sept. à 11 h 32"
    assert regles.jour_fr(date(2026, 12, 6)) == "dim. 6 déc."  # fin du vice caché de BLV-51388
    assert regles.heure_fr(datetime(2026, 9, 23, 16, 0, tzinfo=UTC)) == "17 h"


def test_detail_colis_et_paye_par():
    assert regles.detail_colis(["Écouteurs", "Chargeur rapide 33 W"], "retiré le x") == "+ Chargeur rapide 33 W · retiré le x"
    assert regles.detail_colis(["Pagne"], "") == ""
    assert regles.paye_par("mtn", "6 77 ·· ·· 41") == "MTN MoMo 6 77 ·· ·· 41"
    assert regles.paye_par("orange", "6 55 ·· ·· 08") == "Orange Money 6 55 ·· ·· 08"
    assert regles.francs(15_800) == "15 800 F"


def test_etat_vu_par_le_site():
    e = regles.etat_site
    assert e("attente_vendeur", souhait="remplace") == "attente"  # LIT-3042
    assert e("attente_vendeur", souhait="signal") == "signal"
    assert e("attente_vendeur", souhait="rembourse", arrangement_en_attente=True) == "arrangement"
    assert e("en_examen", souhait="rembourse", reponse_vendeur="conteste") == "conteste"
    assert e("en_examen", souhait="rembourse", reponse_vendeur="silence") == "silence"
    assert e("en_examen", souhait="rembourse", reponse_vendeur="conteste", recours=True) == "examen"
    assert e("rembourse_automatiquement", souhait="rembourse") == "rembourse"  # LIT-2987
    assert e("decide", souhait="rembourse", issue="rembourse", retour_clos=False) == "accepte"  # LIT-3039
    assert e("decide", souhait="rembourse", issue="rembourse", retour_clos=True) == "rembourse"
    assert e("decide", souhait="remplace", issue="remplace", remplacement="autre_vendeur") == "accepte"  # LIT-3041
    assert e("decide", souhait="remplace", issue="remplace", remplacement="expedie") == "remplace"
    assert e("decide", souhait="rembourse", issue="refuse") == "refuse"
    assert e("en_examen", souhait="rembourse", retire=True) == "retire"


def test_etapes_du_remplacement():
    assert regles.etape_remplacement("attente", False) == "attente"
    assert regles.etape_remplacement("attente", True) == "retard"
    assert regles.etape_remplacement("autre_vendeur", False) == "autre"
    assert regles.etape_remplacement("rembourse", False) is None
