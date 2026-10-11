# Changement du numéro de versement : deux codes (nouveau numéro, téléphone personnel), essais, revue de 7 jours,
# versements reportés au vendredi qui suit la revue, numéro actuel à la fin ; reprise d'un versement suspendu.
import re
from datetime import timedelta

import pytest
from django.core.cache import cache
from django.test import override_settings

from apps.client_core.chiffrement import dechiffrer
from apps.otp.prestataires import SmsConsole
from apps.vendeur_argent import numero, services
from apps.vendeur_argent.models import ChangementNumero, Versement
from apps.vendeur_core import horloge
from apps.vendeur_core.horloge import CLE
from apps.vendeur_core.tests.outils import proprietaire

from .outils import aller, boutique_et_commande, cle, lundi_prochain, retirer

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("propre")]


@pytest.fixture
def propre():
    cache.delete(CLE)
    SmsConsole.ENVOYES.clear()
    with override_settings(BELIVAY_ESSAI_ROUTES=True):
        yield
    cache.delete(CLE)


def code_envoye_a(n: str) -> str:
    sms = [x for x in SmsConsole.ENVOYES if x["numero"].endswith(n[-9:])]
    return re.search(r"\d{6}", sms[-1]["texte"]).group(0)


def post(api, route, corps):
    return api.post(route, corps, format="json", HTTP_IDEMPOTENCY_KEY=cle()).json()


def test_lecture_du_numero():
    b, o, cc, c = boutique_et_commande()
    api = proprietaire(b)
    aller(lundi_prochain())
    r = api.get("/api/vendors/payout-number").json()
    assert r["actuel"] == {"operateur": "MTN", "masque": "···· 4217", "verifieLe": "2026-05-09", "titulaire": "Franck Penga"}
    assert r["enRevue"] is None and r["attente"] is None and r["indicatif"] == "+237" and r["longueur"] == 9
    assert (
        r["telephonePersonnel"] == "6•• •• •• 17"
        and r["revueJours"] == 7
        and r["code"] == {"longueur": 6, "renvoiSecondes": 60, "dureeMinutes": 10}
    )
    mtn = next(x for x in r["operateurs"] if x["nom"] == "MTN")
    assert "67" in mtn["prefixes"] and "654" in mtn["prefixes"] and mtn["libelle"] == "MTN Mobile Money"


def test_refus_avant_l_envoi_des_codes():
    b, o, cc, c = boutique_et_commande()
    api = proprietaire(b)
    route = "/api/vendors/payout-number/codes"
    assert post(api, route, {"operateur": "MTN", "numero": "6771"}) == {"ok": False, "raison": "longueur"}
    assert post(api, route, {"operateur": "MTN", "numero": "622123456"}) == {"ok": False, "raison": "prefixe"}
    assert post(api, route, {"operateur": "MTN", "numero": "699123456"}) == {"ok": False, "raison": "operateur", "detail": "Orange"}
    assert post(api, route, {"operateur": "MTN", "numero": "+237 677 12 42 17"}) == {"ok": False, "raison": "meme_numero"}
    assert api.post(route, {"operateur": "Free"}, format="json", HTTP_IDEMPOTENCY_KEY=cle()).status_code == 400
    b.membres.filter(role="proprietaire").update(telephone="")
    assert post(api, route, {"operateur": "MTN", "numero": "677000111"})["ok"] is False


def test_changement_de_numero_deux_codes_revue_de_7_jours_puis_numero_actuel():
    b, o, cc, c = boutique_et_commande()
    api = proprietaire(b)
    lundi = lundi_prochain()
    retirer(c, lundi, tout_en_ordre=lundi)  # libérée jeudi, devait partir vendredi
    aller(lundi + timedelta(hours=1))
    r = post(api, "/api/vendors/payout-number/codes", {"operateur": "Orange", "numero": "699554218"})
    assert r == {"ok": True, "destination": "699 •• •• 18", "renvoiSecondes": 60}
    assert len(SmsConsole.ENVOYES) == 2
    # Même numéro redemandé tout de suite : rien n'est renvoyé.
    assert post(api, "/api/vendors/payout-number/codes", {"operateur": "Orange", "numero": "699554218"})["renvoiSecondes"] <= 60
    assert api.get("/api/vendors/payout-number").json()["attente"]["numeroMasque"] == "699 •• •• 18"
    assert post(api, "/api/vendors/payout-number/codes/resend", {"quel": "nouveau"}) == {"ok": False, "raison": "trop_tot"}
    nouveau, personnel = code_envoye_a("699554218"), code_envoye_a("677124217")

    faux = api.put(
        "/api/vendors/payout-number", {"codeNouveau": "000000", "codePersonnel": personnel}, format="json", HTTP_IDEMPOTENCY_KEY=cle()
    ).json()
    assert faux["ok"] is False and faux["raison"] == "code_nouveau" and faux["essaisRestants"] == 4
    faux = api.put(
        "/api/vendors/payout-number", {"codeNouveau": nouveau, "codePersonnel": "000000"}, format="json", HTTP_IDEMPOTENCY_KEY=cle()
    ).json()
    assert faux["raison"] == "code_personnel"
    ok = api.put(
        "/api/vendors/payout-number", {"codeNouveau": nouveau, "codePersonnel": personnel}, format="json", HTTP_IDEMPOTENCY_KEY=cle()
    ).json()
    ch = ChangementNumero.objects.get(boutique=b, valide_le__isnull=False)
    assert ok["ok"] is True and ok["revueJusqua"] == services.ms(ch.revue_jusqua) and ch.revue_jusqua - ch.valide_le == timedelta(days=7)

    r = api.get("/api/vendors/payout-number").json()
    assert (
        r["actuel"]["masque"] == "···· 4217"
        and r["enRevue"]["masque"] == "···· 4218"
        and r["enRevue"]["ancien"] == {"operateur": "MTN", "masque": "···· 4217"}
    )
    assert r["enRevue"]["premierVersement"] == ok["premierVersement"] and r["enRevue"]["enAttente"]["montant"] == c.garde
    assert api.get("/api/vendors/money/summary").json()["numero"]["enRevue"] is True

    # Pendant la revue, rien ne part : le versement attend le vendredi qui suit la revue.
    aller(lundi + timedelta(days=4, hours=2))  # vendredi midi
    p = api.get("/api/vendors/payouts/next").json()
    assert (
        p["statut"] == "reporte" and p["reporteAu"] == ok["premierVersement"] and p["numero"] == "Orange ···· 4218" and p["enRevueJusqua"]
    )
    assert not Versement.objects.filter(boutique=b).exists()

    # Fin de la revue : le nouveau numéro devient actuel ; vendredi suivant, versé vers lui.
    aller(ch.revue_jusqua + timedelta(minutes=1))
    services.executer_versements(b)
    b.refresh_from_db()
    assert b.numero_operateur == "Orange" and dechiffrer(b.numero_chiffre) == "699554218"
    assert api.get("/api/vendors/payout-number").json()["actuel"]["masque"] == "···· 4218"
    from datetime import date, datetime, time

    from apps.client_core.temps import YAOUNDE

    vendredi = date.fromisoformat(ok["premierVersement"])
    aller(datetime.combine(vendredi, time(13), YAOUNDE))
    services.executer_versements(b)
    [v] = Versement.objects.filter(boutique=b)
    assert v.vendredi == vendredi and v.numero_masque == "Orange ···· 4218" and v.statut == "credite"


def test_renvoi_annulation_et_codes_expires():
    b, o, cc, c = boutique_et_commande()
    api = proprietaire(b)
    aller(lundi_prochain())
    assert post(api, "/api/vendors/payout-number/codes/resend", {"quel": "personnel"}) == {"ok": False, "raison": "expire"}
    ko = api.put("/api/vendors/payout-number", {"codeNouveau": "1", "codePersonnel": "2"}, format="json", HTTP_IDEMPOTENCY_KEY=cle()).json()
    assert ko == {"ok": False, "raison": "expire"}
    post(api, "/api/vendors/payout-number/codes", {"operateur": "MTN", "numero": "651000111"})
    from django.utils import timezone

    from apps.otp.models import CodeOtp

    CodeOtp.objects.update(cree_le=timezone.now() - timedelta(minutes=2))
    aller(horloge.maintenant() + timedelta(seconds=61))
    assert post(api, "/api/vendors/payout-number/codes/resend", {"quel": "personnel"}) == {"ok": True, "renvoiSecondes": 60}
    CodeOtp.objects.update(cree_le=timezone.now() - timedelta(minutes=2))
    aller(horloge.maintenant() + timedelta(seconds=61))
    assert post(api, "/api/vendors/payout-number/codes/resend", {"quel": "nouveau"})["ok"] is True
    CodeOtp.objects.update(cree_le=timezone.now() - timedelta(minutes=2))
    aller(horloge.maintenant() + timedelta(seconds=61))
    assert post(api, "/api/vendors/payout-number/codes/resend", {"quel": "nouveau"})["ok"] is True
    # Trois envois par heure au plus (OTP-RENVOI) : le quatrième est refusé.
    CodeOtp.objects.update(cree_le=timezone.now() - timedelta(minutes=2))
    aller(horloge.maintenant() + timedelta(seconds=61))
    assert post(api, "/api/vendors/payout-number/codes/resend", {"quel": "nouveau"}) == {"ok": False, "raison": "trop_tot"}
    # Codes expirés : la vérification le dit.
    CodeOtp.objects.update(expire_le=timezone.now() - timedelta(minutes=1))
    ko = api.put("/api/vendors/payout-number", {"codeNouveau": "1", "codePersonnel": "2"}, format="json", HTTP_IDEMPOTENCY_KEY=cle()).json()
    assert ko == {"ok": False, "raison": "expire"}
    assert api.delete("/api/vendors/payout-number/codes").status_code == 204
    assert numero.en_attente(b) is None
    aller(horloge.maintenant() + timedelta(minutes=20))
    assert post(api, "/api/vendors/payout-number/codes/resend", {"quel": "nouveau"}) == {"ok": False, "raison": "expire"}


def test_codes_bloques_apres_trop_d_essais():
    b, o, cc, c = boutique_et_commande()
    api = proprietaire(b)
    aller(lundi_prochain())
    post(api, "/api/vendors/payout-number/codes", {"operateur": "MTN", "numero": "651000222"})
    r = None
    for _ in range(5):
        r = api.put(
            "/api/vendors/payout-number", {"codeNouveau": "000000", "codePersonnel": "000000"}, format="json", HTTP_IDEMPOTENCY_KEY=cle()
        ).json()
    assert r["raison"] == "bloque" and r["bloqueJusqua"] > 0


def test_trop_d_envois_avant_la_demande_de_codes():
    b, o, cc, c = boutique_et_commande()
    api = proprietaire(b)
    aller(lundi_prochain())
    post(api, "/api/vendors/payout-number/codes", {"operateur": "MTN", "numero": "651000333"})
    numero.annuler(b)
    r = post(api, "/api/vendors/payout-number/codes", {"operateur": "MTN", "numero": "651000333"})
    assert r["ok"] is False and r["raison"] == "trop_tot"


def test_prefixes_du_registre_en_vigueur():
    """VD-PREFIXES-CM : « MTN : 67, 68, 650 à 654 · Orange : 69, 655 à 659 » ; 68 entier chez MTN (NUM-02, Q-94)."""
    assert numero.operateur_de("681234567") == "MTN" and numero.operateur_de("689002812") == "MTN"
    assert numero.operateur_de("654000000") == "MTN" and numero.operateur_de("655000000") == "Orange"
    assert numero.operateur_de("699000000") == "Orange" and numero.operateur_de("660000000") is None


def test_registre_des_prefixes(monkeypatch):
    from apps.vendeur_core import parametres as vp

    reg = {**vp.registre(), "VD-PREFIXES-CM": "MTN : 67 · Orange : 69, 655 à 656"}
    monkeypatch.setattr(vp, "registre", lambda: reg)
    ops = numero.operateurs()
    assert ops[1] == {"nom": "Orange", "libelle": "Orange Money", "prefixes": ["69", "655", "656"]}
    assert numero.operateur_de("699000000") == "Orange" and numero.operateur_de("622000000") is None


def test_reprise_d_un_versement_suspendu_apres_nouveau_numero():
    b, o, cc, c = boutique_et_commande()
    api = proprietaire(b)
    lundi = lundi_prochain()
    retirer(c, lundi, tout_en_ordre=lundi)
    aller(lundi + timedelta(days=4) - timedelta(hours=9))
    [v] = services.executer_versements(b)
    for _ in range(4):
        services.refuser_versement(v.reference, "prefixe")
    v.refresh_from_db()
    assert v.statut == "suspendu"
    assert api.get("/api/vendors/payouts/next").json()["incident"]["suspendu"] is True
    post(api, "/api/vendors/payout-number/codes", {"operateur": "MTN", "numero": "651000444"})
    ok = api.put(
        "/api/vendors/payout-number",
        {"codeNouveau": code_envoye_a("651000444"), "codePersonnel": code_envoye_a("677124217")},
        format="json",
        HTTP_IDEMPOTENCY_KEY=cle(),
    ).json()
    assert ok["ok"] is True
    ch = ChangementNumero.objects.get(boutique=b, valide_le__isnull=False)
    aller(ch.revue_jusqua + timedelta(minutes=1))
    services.executer_versements(b)
    v.refresh_from_db()
    assert v.statut == "prevu" and v.vendredi.isoformat() == ok["premierVersement"]
    from datetime import date, datetime, time

    from apps.client_core.temps import YAOUNDE

    aller(datetime.combine(date.fromisoformat(ok["premierVersement"]), time(13), YAOUNDE))
    services.executer_versements(b)
    v.refresh_from_db()
    assert v.statut == "credite" and v.numero_masque == "MTN ···· 0444"
