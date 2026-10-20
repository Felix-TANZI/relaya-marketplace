# backend/apps/client_accounts/views.py
# Routes du compte client : /api/me/* (CL-03, CL-13), /api/legal/{doc}.
#
# Règles tenues ici (le détail est dans services.py) :
#   - profil, e-mail, numéro et suppression : confirmés par un code (DP-52, CIN-39 à CIN-43, 9.5) envoyé par
#     POST /api/auth/otp/send ; un parcours en deux codes exige le premier code vérifié depuis moins de
#     2 × OTP-DUREE (fenêtre d'envoi du second code + validité de celui-ci) ;
#   - un e-mail = un compte (CIN-16 : 409 pris), un numéro vérifié = un compte (CIN-35 : 409 utilise) ;
#   - changement de numéro : codes de retrait renouvelés, autres sessions fermées (CAP-15) ;
#   - suppression : refusée tant qu'une commande, un litige ou un solde reste (409 compte_en_cours) ; le compte est
#     pseudonymisé, les données légales restent (factures, paiements, consentements) ;
#   - adresses : quartier dans une zone exploitée (422 zone_non_servie {ville}) ; chiffrées au repos (CAP-21) ;
#   - devise : comptes diaspora seulement (403 hors, DP-54) ;
#   - conditions : consentement horodaté (CAP-23).
# Filtrage au queryset : l'adresse ou le favori d'un autre client n'est jamais chargé (404).

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response

from apps.client_core import pont
from apps.client_core.erreurs import ErreurClient, conflit, interdit, introuvable, refus
from apps.client_core.masquage import numero_local
from apps.client_core.vues import VueClient, VuePublique
from apps.otp import services as otp
from apps.otp.models import CodeOtp
from apps.otp.views import resultat

from . import serializers as s
from . import services
from .models import AlerteFavori

Objet = CodeOtp.Objet
T_COMPTE = ["Espace client · Compte"]
T_PROFIL = ["Espace client · Profil, numéro et codes"]
T_SECU = ["Espace client · Sécurité et confidentialité"]
T_RELAIS = ["Espace client · Relais, adresses, intérêts"]
T_LEGAL = ["Espace client · Légal"]
T_BOUTIQUE = ["Espace client · Devenir vendeur"]


def _lire(serializer_cls, request, partial=False):
    ser = serializer_cls(data=request.data, partial=partial)
    ser.is_valid(raise_exception=True)
    return ser.validated_data


def _destination_code(user) -> str:
    """Le code de profil ou de suppression part au numéro vérifié, à défaut à l'e-mail du compte."""
    return services.numero_verifie(user) or user.email


# ── /api/me ─────────────────────────────────────────────────────────────────────────────────────────────


class Moi(VueClient):
    @extend_schema(tags=T_COMPTE, summary="Mon compte : compteurs, portefeuille, palier, relais, adresse, moyens")
    def get(self, request):
        return Response(services.donnees_compte(request.user))

    @extend_schema(tags=T_PROFIL, summary="Changer prénom, nom et photo avec le code reçu (DP-52)")
    def patch(self, request):
        d = _lire(s.ProfilSerializer, request)
        user = request.user
        r = otp.verifier(objet=Objet.PROFIL, code=d["code"], destination=_destination_code(user), utilisateur=user)
        if not r.get("ok"):
            return Response(resultat(r))
        with transaction.atomic():
            user.first_name, user.last_name = d["prenom"].strip(), d["nom"].strip()
            user.save(update_fields=["first_name", "last_name"])
            p = services.profil(user)
            p.photo = d.get("photo") or None
            p.save(update_fields=["photo", "modifie_le"])
        return Response(resultat(r, services.client(user, request)))

    @extend_schema(tags=T_SECU, summary="Supprimer mon compte avec le code reçu (9.5)")
    def delete(self, request):
        d = _lire(s.CodeSerializer, request)
        user = request.user
        possible, etat = services.suppression_possible(user)
        if not possible:
            raise conflit("compte_en_cours", "Termine d'abord tes commandes et litiges, et vide ton portefeuille.", etat)
        r = otp.verifier(objet=Objet.SUPPRESSION, code=d["code"], destination=_destination_code(user), utilisateur=user)
        if not r.get("ok"):
            return Response(resultat(r))
        avant = services.client(user, request)
        services.supprimer_compte(user)
        return Response(resultat(r, avant), status=status.HTTP_202_ACCEPTED)


class Menu(VueClient):
    @extend_schema(tags=T_COMPTE, summary="Menu : promotions, univers, compteurs, heures du support")
    def get(self, request):
        return Response(services.donnees_menu(request.user))


# ── E-mail (CIN-16, DP-52) ──────────────────────────────────────────────────────────────────────────────


def _controle_email(user, email: str) -> None:
    if email.lower() == (user.email or "").lower():
        raise refus("meme", "C'est déjà l'adresse de ton compte.")
    if get_user_model().objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
        raise conflit("pris", "Cette adresse a déjà un compte BelivaY.")


class EmailControle(VueClient):
    @extend_schema(tags=T_PROFIL, summary="Contrôler une nouvelle adresse e-mail avant l'envoi des codes")
    def post(self, request):
        email = _lire(s.EmailSerializer, request)["email"].strip()
        _controle_email(request.user, email)
        return Response({"ok": True})


class Email(VueClient):
    @extend_schema(tags=T_PROFIL, summary="Confirmer la nouvelle adresse e-mail avec le code reçu à cette adresse")
    def put(self, request):
        d = _lire(s.EmailCodeSerializer, request)
        user = request.user
        email = d["email"].strip().lower()
        p = services.profil(user)
        # Sans le premier code (SMS) vérifié récemment, rien ne change.
        if not otp.etape_validee(objet=Objet.EMAIL_SMS, utilisateur=user, apres=p.email_modifie_le, fenetres=2):
            return Response({"ok": False, "essaisRestants": 0})
        _controle_email(user, email)
        r = otp.verifier(objet=Objet.EMAIL_ADRESSE, code=d["code"], destination=email, utilisateur=user)
        if not r.get("ok"):
            return Response(resultat(r))
        with transaction.atomic():
            ancien = user.email or ""
            champs = ["email"]
            if ancien and user.username.lower() == ancien.lower():  # relaya : connexion par e-mail = username
                user.username = email
                champs.append("username")
            user.email = email
            user.save(update_fields=champs)
            p.email_modifie_le = timezone.now()
            p.save(update_fields=["email_modifie_le", "modifie_le"])
        return Response(resultat(r, services.client(user, request)))


# ── Numéro (CIN-35, CIN-39 à CIN-43, CAP-15) ────────────────────────────────────────────────────────────


def _controle_numero(user, numero: str) -> None:
    actuel = services.numero_verifie(user)
    if actuel and numero_local(numero) == actuel:
        raise refus("meme", "C'est déjà le numéro de ton compte.")
    if services.numero_pris(numero, sauf=user):
        raise conflit("utilise", "Ce numéro est déjà vérifié sur un autre compte.")


class NumeroControle(VueClient):
    @extend_schema(tags=T_PROFIL, summary="Contrôler un nouveau numéro (un numéro vérifié = un seul compte)")
    def post(self, request):
        _controle_numero(request.user, _lire(s.NumeroSerializer, request)["numero"])
        return Response({"ok": True})


class Numero(VueClient):
    @extend_schema(tags=T_PROFIL, summary="Confirmer le nouveau numéro avec le code reçu ; codes de retrait renouvelés")
    def put(self, request):
        d = _lire(s.NumeroCodeSerializer, request)
        user = request.user
        if not services.numero_verifie(user):
            return Response({"ok": False, "essaisRestants": 0})  # premier numéro : POST /api/auth/otp/verify
        dernier = services.dernier_changement(user)
        if not otp.etape_validee(objet=Objet.NUMERO_ANCIEN, utilisateur=user, apres=dernier.le if dernier else None, fenetres=2):
            return Response({"ok": False, "essaisRestants": 0})
        _controle_numero(user, d["numero"])
        r = otp.verifier(objet=Objet.NUMERO_NOUVEAU, code=d["code"], destination=d["numero"], utilisateur=user)
        if not r.get("ok"):
            return Response(resultat(r))
        services.changer_numero(user, d["numero"], request)
        return Response(resultat(r, services.client(user, request)))


class DernierChangementNumero(VueClient):
    @extend_schema(tags=T_PROFIL, summary="Dernier changement de numéro (écran final) ; 204 s'il n'y en a pas")
    def get(self, request):
        c = services.dernier_changement(request.user)
        if c is None:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(services.changement_en_dict(c))


# ── Sécurité, identités, confidentialité ────────────────────────────────────────────────────────────────


class Securite(VueClient):
    @extend_schema(tags=T_SECU, summary="Alerte de connexion sur un nouvel appareil")
    def patch(self, request):
        p = services.profil(request.user)
        p.alerte_connexion = _lire(s.SecuriteSerializer, request)["alerte_connexion"]
        p.save(update_fields=["alerte_connexion", "modifie_le"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class Identites(VueClient):
    @extend_schema(tags=T_SECU, summary="Lier un compte Google ou Apple")
    def post(self, request):
        d = _lire(s.IdentiteSerializer, request)
        try:
            return Response(services.lier_methode(request.user, d["provider"], d["jeton"]))
        except services.JetonInvalide:
            raise refus("jeton_invalide", "Ce compte n'a pas pu être vérifié. Réessaie.") from None
        except services.FournisseurIndisponible:
            raise ErreurClient(
                status.HTTP_503_SERVICE_UNAVAILABLE, "fournisseur_indisponible", "Cette connexion n'est pas encore disponible."
            ) from None


class Identite(VueClient):
    @extend_schema(tags=T_SECU, summary="Retirer une méthode de connexion (409 derniere)")
    def delete(self, request, provider):
        if provider not in ("google", "apple", "email"):
            raise introuvable()
        return Response(services.delier_methode(request.user, provider))


class Confidentialite(VueClient):
    @extend_schema(tags=T_SECU, summary="Confidentialité : personnalisation, nom au retrait, historique")
    def get(self, request):
        return Response(services.donnees_confidentialite(request.user))

    @extend_schema(tags=T_SECU, summary="Régler la personnalisation ou le nom donné au retrait")
    def patch(self, request):
        d = _lire(s.ConfidentialiteSerializer, request)
        p = services.profil(request.user)
        if "personnalisation" in d:
            p.personnalisation = d["personnalisation"]
        if "nom_retrait" in d:
            p.nom_retrait = (d["nom_retrait"] or "").strip() or None
        p.save(update_fields=["personnalisation", "nom_retrait", "modifie_le"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class HistoriqueRecherches(VueClient):
    @extend_schema(tags=T_SECU, summary="Effacer l'historique des recherches")
    def delete(self, request):
        services.effacer_historique(request.user, "recherches")
        return Response(status=status.HTTP_204_NO_CONTENT)


class HistoriqueVus(VueClient):
    @extend_schema(tags=T_SECU, summary="Effacer les produits vus")
    def delete(self, request):
        services.effacer_historique(request.user, "vus")
        return Response(status=status.HTTP_204_NO_CONTENT)


class Suppression(VueClient):
    @extend_schema(tags=T_SECU, summary="Avant de supprimer : commandes en cours, solde, ce qui est perdu")
    def get(self, request):
        return Response(services.donnees_suppression(request.user))


# ── Adresses, relais, intérêts ──────────────────────────────────────────────────────────────────────────


class Adresses(VueClient):
    @extend_schema(tags=T_RELAIS, summary="Carnet d'adresses, zones servies, prix du domicile")
    def get(self, request):
        return Response(services.donnees_adresses(request.user))

    @extend_schema(tags=T_RELAIS, summary="Ajouter une adresse (422 zone_non_servie)")
    def post(self, request):
        a = services.enregistrer_adresse(request.user, _lire(s.EnveloppeAdresseSerializer, request)["a"])
        return Response({"ok": True, "adresse": services.adresse_en_dict(a)})


class AdresseDetail(VueClient):
    def _adresse(self, request, id):
        a = services.adresse(request.user, id)
        if a is None:
            raise introuvable()
        return a

    @extend_schema(tags=T_RELAIS, summary="Modifier une adresse, ou la rendre principale ({principale: true})")
    def put(self, request, id):
        a = self._adresse(request, id)
        if "a" not in request.data and request.data.get("principale") is True:
            a = services.adresse_par_defaut(request.user, a)
        else:
            a = services.enregistrer_adresse(request.user, _lire(s.EnveloppeAdresseSerializer, request)["a"], adresse_id=a.pk)
        return Response({"ok": True, "adresse": services.adresse_en_dict(a)})

    @extend_schema(tags=T_RELAIS, summary="Supprimer une adresse")
    def delete(self, request, id):
        services.supprimer_adresse(request.user, self._adresse(request, id))
        return Response(status=status.HTTP_204_NO_CONTENT)


class RelaisHabituel(VueClient):
    @extend_schema(tags=T_RELAIS, summary="Choisir son relais habituel (identifiant ou nom)")
    def put(self, request):
        r = pont.relais_par_nom(_lire(s.RelaisSerializer, request)["relais"])
        if r is None or not r.actif:
            raise introuvable("Ce relais n'existe pas ou n'est plus ouvert.")
        p = services.profil(request.user)
        p.relais_habituel_id = r.id
        p.save(update_fields=["relais_habituel_id", "modifie_le"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class Interets(VueClient):
    @extend_schema(tags=T_RELAIS, summary="Univers choisis à l'arrivée")
    def get(self, request):
        return Response(list(services.profil(request.user).interets or []))

    @extend_schema(tags=T_RELAIS, summary="Choisir ses univers (passent en premier dans les catégories)")
    def put(self, request):
        univers = list(dict.fromkeys(x.strip() for x in _lire(s.InteretsSerializer, request)["univers"] if x.strip()))
        p = services.profil(request.user)
        p.interets = univers
        p.save(update_fields=["interets", "modifie_le"])
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Légal (CL-13, CAP-23) ───────────────────────────────────────────────────────────────────────────────


class LegalPublic(VuePublique):
    @extend_schema(tags=T_LEGAL, summary="Textes légaux en vigueur (un document, ou « tout »)")
    def get(self, request, doc):
        d = services.donnees_legal(request.user, doc)
        if d is None:
            raise introuvable()
        return Response(d)


class LegalCompte(VueClient):
    @extend_schema(tags=T_LEGAL, summary="Textes légaux et version acceptée par le compte")
    def get(self, request):
        d = services.donnees_legal(request.user)
        if d is None:
            raise introuvable("Aucune version des conditions n'est publiée.")
        return Response(d)


class LegalAccepter(VueClient):
    @extend_schema(tags=T_LEGAL, summary="Accepter une version des conditions (consentement horodaté)")
    def post(self, request):
        d = _lire(s.AccepterSerializer, request)
        services.accepter_conditions(request.user, d["doc"], d["version"], request)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Boutique, Business, devise, favoris ─────────────────────────────────────────────────────────────────


class Boutique(VueClient):
    @extend_schema(tags=T_BOUTIQUE, summary="Boutique ouverte depuis le compte ; 204 s'il n'y en a pas")
    def get(self, request):
        b = services.boutique(request.user)
        return Response(b) if b is not None else Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(tags=T_BOUTIQUE, summary="Ouvrir sa boutique (409 nom_pris)")
    def post(self, request):
        d = _lire(s.BoutiqueSerializer, request)
        return Response(services.ouvrir_boutique(request.user, d["nom"], d["categorie"], d["type"]))


class Business(VueClient):
    @extend_schema(tags=T_BOUTIQUE, summary="Envoyer la pièce du compte Business")
    def post(self, request):
        services.demander_business(request.user, _lire(s.BusinessSerializer, request)["piece"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class Preferences(VueClient):
    @extend_schema(tags=["Espace client · Diaspora et proches"], summary="Devise d'affichage (comptes diaspora)")
    def patch(self, request):
        devise = _lire(s.DeviseSerializer, request)["devise"]
        p = services.profil(request.user)
        if p.type_compte != p.TypeCompte.DIASPORA:
            raise interdit("hors", "La devise se choisit sur un compte diaspora.")
        p.devise = devise
        p.save(update_fields=["devise", "modifie_le"])
        return Response({"ok": True})


class AlerteFavoriVue(VueClient):
    @extend_schema(tags=["Espace client · Favoris"], summary="Alertes prix et retour en stock d'un favori")
    def patch(self, request, id):
        alertes = _lire(s.AlerteFavoriSerializer, request)["alertes"]
        f = services.favori_du_client(request.user, id)
        if f is None:
            raise introuvable()
        a, _ = AlerteFavori.objects.get_or_create(user=request.user, favorite_id=f.pk)
        for k in ("prix", "stock"):
            if k in alertes:
                setattr(a, k, alertes[k])
        a.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
