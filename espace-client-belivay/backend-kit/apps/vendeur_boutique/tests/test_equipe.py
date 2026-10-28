# Domaine « equipe » : propriétaire + 3 accès Préparation, ajout et retrait avec le code SMS du propriétaire, compte du
# membre créé sans mot de passe, SMS d'installation, sessions coupées au retrait, historique signé ; Préparation : 403.
import pytest
from django.contrib.auth.models import User

from apps.otp.prestataires import SmsConsole
from apps.vendeur_boutique import services
from apps.vendeur_boutique.models import AppareilVendeur, HistoriqueEquipe
from apps.vendeur_core.models import CommandeVendeur, EntreeJournal, Membre
from apps.vendeur_core.tests.outils import (
    ajouter_preparation,
    commande_client,
    creer_boutique_vendeur,
    creer_offre,
    preparation,
    proprietaire,
)

from .outils import cle, code_sms

pytestmark = pytest.mark.django_db
V = "/api/vendors"
TEL = "677124217"


@pytest.fixture(autouse=True)
def _sms():
    SmsConsole.ENVOYES.clear()
    yield
    SmsConsole.ENVOYES.clear()


@pytest.fixture
def b():
    return creer_boutique_vendeur()


def _inviter(api, nom="Paul Mbarga", tel="6 91 23 45 67"):
    return api.post(f"{V}/shop/members", {"prenomNom": nom, "telephone": tel}, format="json", **cle()).json()


def test_reserve_au_proprietaire(b):
    ajouter_preparation(b)
    api = preparation(b)
    assert api.get(f"{V}/shop/members").status_code == 403
    assert (
        api.post(f"{V}/shop/members", {"prenomNom": "A B", "telephone": "690000000"}, format="json", **cle()).json()["error"]["code"]
        == "owner_only"
    )
    assert api.delete(f"{V}/shop/members/1", {"code": "1"}, format="json").status_code == 403


def test_ajouter_un_membre(b):
    api = proprietaire(b)
    d = api.get(f"{V}/shop/members").json()
    assert d["maxEmployes"] == 3 and d["employes"] == 0 and d["membres"][0]["role"] == "proprietaire" and d["membres"][0]["etat"] == "actif"
    assert _inviter(api, nom="Paul")["raison"] == "nom"
    assert _inviter(api, nom="Paul 2pac")["raison"] == "nom"
    assert _inviter(api, tel="12345")["raison"] == "telephone"
    assert _inviter(api, tel=TEL)["raison"] == "deja"
    d = _inviter(api)
    assert d["ok"] and d["invitation"].startswith("inv-") and d["masque"] == "6•• •• •• 17"
    code = code_sms(TEL)  # le code part au propriétaire (second facteur)
    url = f"{V}/shop/members/invitations/{d['invitation']}/confirm"
    assert api.post(url, {"code": "000000"}, format="json", **cle()).json()["raison"] == "code"
    assert api.post(f"{V}/shop/members/invitations/inv-999/confirm", {"code": code}, format="json", **cle()).json()["raison"] == "expire"
    d = api.post(url, {"code": code}, format="json", **cle()).json()
    assert (
        d["ok"] and d["membre"]["prenom"] == "Paul" and d["membre"]["etat"] == "invite" and d["membre"]["telephone"] == "+237 6 91 23 45 67"
    )
    u = User.objects.get(username="v691234567")
    assert not u.has_usable_password()
    assert "ajouté à l'équipe" in SmsConsole.ENVOYES[-1]["texte"] and SmsConsole.ENVOYES[-1]["numero"] == "691234567"
    assert api.post(url, {"code": code}, format="json", **cle()).json()["raison"] == "expire"
    e = api.get(f"{V}/shop/members").json()
    assert e["employes"] == 1 and e["historique"][0] == {
        "a": e["historique"][0]["a"],
        "action": "ajout",
        "par": "Franck",
        "membre": "Paul Mbarga",
        "detail": "preparation",
    }


def test_membre_lie_a_un_compte_client_existant(b):
    from apps.client_accounts.services import enregistrer_numero
    from apps.client_core.tests.outils import creer_client

    client = creer_client()
    enregistrer_numero(client, "691112233")
    api = proprietaire(b)
    d = _inviter(api, tel="691112233")
    d = api.post(f"{V}/shop/members/invitations/{d['invitation']}/confirm", {"code": code_sms(TEL)}, format="json", **cle()).json()
    assert Membre.objects.get(pk=d["membre"]["id"]).user == client


def test_equipe_pleine(b):
    for _ in range(3):
        ajouter_preparation(b)
    assert _inviter(proprietaire(b))["raison"] == "plein"


def test_invitation_expire_si_l_equipe_s_est_remplie(b):
    api = proprietaire(b)
    d = _inviter(api)
    for _ in range(3):
        ajouter_preparation(b)
    assert (
        api.post(f"{V}/shop/members/invitations/{d['invitation']}/confirm", {"code": code_sms(TEL)}, format="json", **cle()).json()[
            "raison"
        ]
        == "expire"
    )


def test_renvoyer_l_invitation(b):
    api = proprietaire(b)
    d = _inviter(api)
    m = api.post(f"{V}/shop/members/invitations/{d['invitation']}/confirm", {"code": code_sms(TEL)}, format="json", **cle()).json()[
        "membre"
    ]
    assert api.post(f"{V}/shop/members/{m['id']}/resend").json()["raison"] == "trop_tot"
    from apps.vendeur_boutique.models import InvitationMembre

    InvitationMembre.objects.update(sms_envoye_le=None)
    r = api.post(f"{V}/shop/members/{m['id']}/resend").json()
    assert r["ok"] and r["jusqua"] > m["depuis"]
    aicha = ajouter_preparation(b)
    assert api.post(f"{V}/shop/members/{aicha.pk}/resend").json()["raison"] == "trop_tot"


def test_retirer_un_membre_coupe_ses_sessions(b):
    aicha = ajouter_preparation(b)
    services.enregistrer_appareil(aicha, "tel-a", "Android · Chrome", "Yaoundé")
    api = proprietaire(b)
    proprio = Membre.objects.get(boutique=b, role="proprietaire")
    assert api.post(f"{V}/shop/members/{aicha.pk}/removal-code").json() == {"masque": "6•• •• •• 17"}
    code = code_sms(TEL)
    assert api.delete(f"{V}/shop/members/{proprio.pk}", {"code": code}, format="json").json()["raison"] == "proprietaire"
    assert api.delete(f"{V}/shop/members/x", {"code": code}, format="json").json()["raison"] == "proprietaire"
    assert api.delete(f"{V}/shop/members/{aicha.pk}", {"code": "000000"}, format="json").json()["raison"] == "code"
    d = api.delete(f"{V}/shop/members/{aicha.pk}", {"code": code}, format="json").json()
    assert d["ok"] and d["equipe"]["employes"] == 0 and d["equipe"]["historique"][0]["action"] == "retrait"
    aicha.refresh_from_db()
    assert aicha.actif is False and AppareilVendeur.objects.get(membre=aicha).revoque_le is not None
    # Retirée : plus d'accès à la boutique.
    assert preparation(b).get(f"{V}/shop").status_code in (200, 403)
    assert HistoriqueEquipe.objects.filter(boutique=b, action="retrait", membre="Aïcha N.").exists()


def test_derniere_action_signee(b):
    aicha = ajouter_preparation(b)
    commande_client(creer_offre(b))
    c = CommandeVendeur.objects.get(boutique=b)
    EntreeJournal.objects.create(commande=c, a=c.payee_a, auteur=aicha.signature, role="preparation", action="Prête")
    d = proprietaire(b).get(f"{V}/shop/members").json()
    m = next(x for x in d["membres"] if x["id"] == str(aicha.pk))
    assert m["derniereAction"]["texte"] == "Prête" and m["initiales"] == "AN"
