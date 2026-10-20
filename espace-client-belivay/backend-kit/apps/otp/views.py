# backend/apps/otp/views.py
# Codes à usage unique et mot de passe oublié (CL-03, CL-13 ; CIN-31 à CIN-43, CAP-14 à CAP-16, DP-52, DP-53).
#
#   POST /api/auth/otp/send        envoyerCode, envoyerCodeDiaspora → 202 EnvoiCode
#        purpose = objet du code (apps.otp.models.CodeOtp.Objet ; alias du site : email_sms, change_old, change_new,
#        verify) ; destination par défaut : le numéro vérifié du compte. Sans compte : « diaspora » seulement.
#        « diaspora-renforce » (commande pour un proche, vérification renforcée) : compte diaspora connecté, le code
#        part par SMS à son numéro étranger vérifié (jamais à une destination donnée par le site).
#        Parcours en deux codes : le second code (email-adresse, numero-nouveau quand le compte a déjà un numéro)
#        n'est envoyé que si le premier a été vérifié depuis moins d'OTP-DUREE ; un e-mail ou un numéro déjà pris
#        est refusé avant l'envoi (409 pris / utilise, 422 meme).
#   POST /api/auth/otp/verify      verifierPremierNumero {numero, code} | verifierCodeEmail {purpose: email_sms, code}
#        | verifierCodeNumeroAncien {purpose: change_old, code} → ResultatCode ; 409 utilise (CIN-35).
#        | verifierCodeDiaspora {purpose: diaspora, destination, code} (sans compte ; le code n'est pas consommé :
#        l'inscription le recontrôle) → {ok: true} ; 422 code.
#   POST /api/auth/password/forgot {email} → toujours 202 (CAP-16 : on ne dit pas si l'adresse a un compte) ; lien à
#        usage unique de MDP-LIEN minutes envoyé par e-mail.
#   POST /api/auth/password/reset  {jeton, mot_de_passe} → 200 {ok: true, email masqué} ; MDP-LONG vérifié (422 regle),
#        lien consommé, toutes les sessions fermées (le site le dit : « tes autres appareils sont déconnectés ») ;
#        lien déjà utilisé, remplacé ou expiré : 410 expire ; lien inconnu : 404 invalide (nouveauMotDePasse du site).
#
# Débit limité par la portée « otp » de REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] (relaya : 10/min).

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from drf_spectacular.utils import extend_schema
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from apps.client_core import parametres
from apps.client_core.erreurs import ErreurClient, conflit, refus
from apps.client_core.masquage import masquer_email
from apps.client_core.vues import VuePublique

from . import services
from .models import CodeOtp
from .serializers import EnvoiSerializer, NouveauMotDePasseSerializer, OubliSerializer, VerificationSerializer

TAG = ["Espace client · Codes et mot de passe"]
Objet = CodeOtp.Objet

ALIAS = {
    "email_sms": Objet.EMAIL_SMS,
    "email_adresse": Objet.EMAIL_ADRESSE,
    "change_old": Objet.NUMERO_ANCIEN,
    "change_new": Objet.NUMERO_NOUVEAU,
    # Premier numéro : le site envoie « numero-nouveau » (CL-03, Numero.tsx) ; « verify » en est un synonyme.
    "verify": Objet.NUMERO_NOUVEAU,
}
# Objets envoyés par d'autres routes (cadeau : /wishlists/{code}/gifts/otp).
AILLEURS = {Objet.CADEAU}
VERS_LE_NUMERO_DU_COMPTE = {Objet.PROFIL, Objet.EMAIL_SMS, Objet.NUMERO_ANCIEN, Objet.SUPPRESSION}


def objet_de(purpose: str | None) -> str | None:
    p = (purpose or "").strip().lower()
    if not p:
        return None
    p = ALIAS.get(p, p.replace("_", "-"))
    return p if p in Objet.values else None


def resultat(r: dict, client: dict | None = None) -> dict:
    """ResultatCode du site, à partir du résultat de services.verifier."""
    if r.get("ok"):
        return {"ok": True, "client": client}
    if "bloqueJusqua" in r:
        return {"ok": False, "bloqueJusqua": r["bloqueJusqua"]}
    return {"ok": False, "essaisRestants": r.get("essaisRestants", 0)}


def _comptes():
    from apps.client_accounts import services as comptes

    return comptes


def _invalide(message: str):
    return ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", message)


class EnvoyerCode(VuePublique):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp"

    @extend_schema(tags=TAG, summary="Envoyer un code à 6 chiffres (SMS, WhatsApp ou e-mail)")
    def post(self, request):
        s = EnvoiSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        objet = objet_de(s.validated_data["purpose"])
        canal = s.validated_data["canal"]
        destination = (s.validated_data.get("destination") or "").strip()
        if objet is None or objet in AILLEURS:
            raise _invalide("Objet de code inconnu.")
        user = request.user if request.user and request.user.is_authenticated else None

        if objet == Objet.DIASPORA_RENFORCE:
            # Vérification renforcée d'une commande pour un proche (diaspora.services.commander_pour la contrôle).
            if user is None:
                raise exceptions.NotAuthenticated()
            from apps.client_core.chiffrement import dechiffrer
            from apps.diaspora.services import compte as compte_diaspora

            c = compte_diaspora(user)
            if c is None:
                raise ErreurClient(status.HTTP_403_FORBIDDEN, "type", "Ce code est réservé aux comptes diaspora.")
            destination, canal = dechiffrer(c.numero_chiffre), "sms"
        elif objet == Objet.DIASPORA:
            if not destination:
                raise _invalide("Destination manquante.")
            if canal == "whatsapp":
                raise _invalide("Le code d'inscription part par SMS ou par e-mail.")
        else:
            if user is None:
                raise exceptions.NotAuthenticated()
            destination = self._destination(user, objet, destination)

        if canal == "email" and "@" not in destination:
            raise _invalide("Ce code part par SMS ou WhatsApp.")
        envoi = services.envoyer(objet=objet, destination=destination, utilisateur=user, canal=canal)
        if canal == "whatsapp":
            envoi["destination"] += " · WhatsApp"
        return Response(envoi, status=status.HTTP_202_ACCEPTED)

    def _destination(self, user, objet: str, destination: str) -> str:
        comptes = _comptes()
        numero = comptes.numero_verifie(user)
        if objet in VERS_LE_NUMERO_DU_COMPTE:
            if numero:
                return numero
            # Profil et suppression sans numéro vérifié : le code part à l'adresse e-mail du compte.
            if objet in (Objet.PROFIL, Objet.SUPPRESSION) and user.email:
                return user.email
            raise refus("numero_non_verifie", "Vérifie d'abord ton numéro.")
        if not destination:
            raise _invalide("Destination manquante.")
        if objet == Objet.EMAIL_ADRESSE:
            email = destination.lower()
            if email == (user.email or "").lower():
                raise refus("meme", "C'est déjà l'adresse de ton compte.")
            if get_user_model().objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
                raise conflit("pris", "Cette adresse a déjà un compte BelivaY.")
            if not services.etape_validee(objet=Objet.EMAIL_SMS, utilisateur=user, apres=comptes.profil(user).email_modifie_le):
                raise conflit("state_changed", "Entre d'abord le code reçu par SMS.")
        elif objet == Objet.NUMERO_NOUVEAU:
            from apps.client_core.masquage import numero_local

            if numero and numero_local(destination) == numero:
                raise refus("meme", "C'est déjà le numéro de ton compte.")
            if comptes.numero_pris(destination, sauf=user):
                raise conflit("utilise", "Ce numéro est déjà vérifié sur un autre compte.")
            if numero:
                dernier = comptes.dernier_changement(user)
                if not services.etape_validee(objet=Objet.NUMERO_ANCIEN, utilisateur=user, apres=dernier.le if dernier else None):
                    raise conflit("state_changed", "Entre d'abord le code reçu sur ton numéro actuel.")
        return destination


class VerifierCode(VuePublique):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp"

    @extend_schema(tags=TAG, summary="Vérifier un code : premier numéro, changement d'e-mail ou de numéro")
    def post(self, request):
        s = VerificationSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        numero = (d.get("numero") or "").strip()
        objet = objet_de(d.get("purpose")) if d.get("purpose") else (Objet.NUMERO_NOUVEAU if numero else None)

        if objet == Objet.DIASPORA:  # verifierCodeDiaspora : sans compte ; le code reste valable pour l'inscription
            destination = (d.get("destination") or numero).strip()
            if not destination:
                raise _invalide("Destination manquante.")
            r = services.verifier(objet=objet, code=d["code"], destination=destination, consommer=False)
            if not r.get("ok"):
                raise refus("code", "Ce code n'est pas le bon.", {k: v for k, v in r.items() if k != "ok"})
            return Response({"ok": True})

        if not (request.user and request.user.is_authenticated):
            raise exceptions.NotAuthenticated()
        comptes = _comptes()
        user = request.user

        if objet == Objet.NUMERO_NOUVEAU:  # verifierPremierNumero (CIN-31, CIN-35)
            if not numero:
                raise _invalide("Numéro manquant.")
            if comptes.numero_pris(numero, sauf=user):
                raise conflit("utilise", "Ce numéro est déjà vérifié sur un autre compte.")
            if comptes.profil(user).numero_verifie:
                raise conflit("state_changed", "Ton numéro est déjà vérifié : change-le depuis ton profil.")
            r = services.verifier(objet=objet, code=d["code"], destination=numero, utilisateur=user)
            if r.get("ok"):
                comptes.enregistrer_numero(user, numero)
            return Response(resultat(r, comptes.client(user, request) if r.get("ok") else None))

        if objet in (Objet.EMAIL_SMS, Objet.NUMERO_ANCIEN):  # verifierCodeEmail, verifierCodeNumeroAncien
            dest = comptes.numero_verifie(user)
            if not dest:
                raise refus("numero_non_verifie", "Vérifie d'abord ton numéro.")
            r = services.verifier(objet=objet, code=d["code"], destination=dest, utilisateur=user)
            return Response(resultat(r, comptes.client(user, request) if r.get("ok") else None))

        raise _invalide("Objet de code inconnu.")


class OublierMotDePasse(VuePublique):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp"

    @extend_schema(tags=TAG, summary="Demander un lien de nouveau mot de passe (toujours 202)")
    def post(self, request):
        s = OubliSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        email = s.validated_data["email"].strip()
        minutes = parametres.entier("MDP-LIEN")
        user = get_user_model().objects.filter(email__iexact=email, is_active=True).first()
        if user is not None:
            jeton, minutes = services.creer_jeton_mdp(user)
            site = getattr(settings, "BELIVAY_SITE_URL", "https://belivay.com").rstrip("/")
            # Page du site qui lit le jeton : /mdp-nouveau (site/src/pages/CL-03/MdpNouveau.tsx).
            chemin = getattr(settings, "BELIVAY_LIEN_MDP", "/mdp-nouveau?jeton={jeton}").format(jeton=jeton)
            send_mail(
                "Ton nouveau mot de passe BelivaY",
                f"Bonjour {user.first_name or ''},\n\nPour choisir un nouveau mot de passe, ouvre ce lien (valable {minutes} minutes, "
                f"une seule fois) :\n{site}{chemin}\n\nSi tu n'as rien demandé, ignore ce message : ton mot de passe ne change pas.",
                None,
                [user.email],
            )
        return Response({"destination": masquer_email(email), "valideMinutes": minutes}, status=status.HTTP_202_ACCEPTED)


class NouveauMotDePasse(VuePublique):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp"

    @extend_schema(tags=TAG, summary="Choisir un nouveau mot de passe avec le lien reçu par e-mail")
    def post(self, request):
        from apps.client_accounts import regles

        s = NouveauMotDePasseSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        mdp = s.validated_data["mot_de_passe"]
        regle = parametres.registre().get("MDP-LONG")
        if regle is None:
            from belivay_moteurs.erreurs import ParametreAbsent

            raise ParametreAbsent("MDP-LONG")
        if not regles.mot_de_passe_ok(mdp, regle):
            raise refus("regle", f"Le mot de passe doit avoir {regle}.")
        user = services.consommer_jeton_mdp(s.validated_data["jeton"])
        if user is None:
            if services.jeton_mdp_connu(s.validated_data["jeton"]):
                raise ErreurClient(status.HTTP_410_GONE, "expire", "Ce lien n'est plus valable. Demande un nouveau lien.")
            raise ErreurClient(status.HTTP_404_NOT_FOUND, "invalide", "Ce lien n'est pas valable. Demande un nouveau lien.")
        user.set_password(mdp)
        user.save(update_fields=["password"])
        _comptes().fermer_toutes_sessions(user)
        return Response({"ok": True, "email": masquer_email(user.email)})
