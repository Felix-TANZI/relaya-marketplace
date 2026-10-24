# backend/apps/vendeur_session/views.py
# Routes du domaine « session » de l'espace vendeur (VD-03, VD-04), sous /api/vendors/. Réponses au format du site
# (espace-vendeur/src/donnees/domaines/session.ts) ; un refus attendu par l'écran est un 200 { ok: false, raison }.
# Connexion : jamais d'erreur technique pour de mauvais identifiants (VD03-R03) ; la réussite rend aussi
# `jetons: {access, refresh}` (simplejwt, les mêmes que l'espace client), écrits sur l'appareil par le site.
# Appareil : champ `appareil` du corps (ou de l'adresse pour un GET), sinon en-tête X-Device-Id.
from drf_spectacular.utils import extend_schema
from rest_framework.response import Response

from apps.client_core.erreurs import introuvable
from apps.client_core.idempotence import idempotent
from apps.client_core.vues import VueClient, VuePublique
from apps.vendeur_core.acces import VueVendeur, proprietaire_seulement

from . import ouverture, saisie, services
from .services import appareil_de

TAG = ["Espace vendeur · session"]


def _ua(request) -> str:
    return request.headers.get("User-Agent", "")


def _ip(request) -> str | None:
    return (request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get("REMOTE_ADDR")) or None


def _oui(x, defaut=True) -> bool:
    return defaut if x is None else x in (True, "true", "1", 1, "on")


def _ou_404(x):
    if x is None:
        raise introuvable()
    return Response(x)


# ── Session ───────────────────────────────────────────────────────────────────────────────────────────


class Session(VuePublique):
    @extend_schema(tags=TAG, summary="Session du vendeur : membre, boutique, pastilles et badges")
    def get(self, request):
        return Response(services.session_de(request.user))


# ── Connexion ─────────────────────────────────────────────────────────────────────────────────────────


class Connexion(VuePublique):
    @extend_schema(tags=TAG, summary="Connexion par identifiant, e-mail ou numéro et mot de passe")
    def post(self, request):
        d = request.data
        return Response(
            services.connecter(
                str(d.get("identifiant") or ""),
                str(d.get("motDePasse") or ""),
                appareil=appareil_de(request),
                ua=_ua(request),
                se_souvenir=_oui(d.get("seSouvenir")),
            )
        )


class DeuxFacteurs(VuePublique):
    @extend_schema(tags=TAG, summary="Second facteur en cours sur cet appareil")
    def get(self, request):
        return _ou_404(services.defi_en_cours(appareil_de(request)))

    @extend_schema(tags=TAG, summary="Code du second facteur (appareil inconnu)")
    def post(self, request):
        d = request.data
        return Response(
            services.valider_deuxieme_facteur(
                appareil_de(request), str(d.get("code") or ""), str(d.get("challenge_id") or ""), _ua(request)
            )
        )


class DeuxFacteursRenvoi(VuePublique):
    @extend_schema(tags=TAG, summary="Nouvel envoi du code du second facteur")
    def post(self, request):
        return Response(services.renvoyer_deuxieme_facteur(appareil_de(request)))


class CodeNumero(VuePublique):
    @extend_schema(tags=TAG, summary="Code de connexion par numéro en cours sur cet appareil")
    def get(self, request):
        return _ou_404(services.envoi_numero(appareil_de(request)))

    @extend_schema(tags=TAG, summary="Connexion par numéro : envoi du code (WhatsApp ou SMS)")
    def post(self, request):
        d = request.data
        return Response(
            services.demander_code_numero(
                str(d.get("telephone") or ""),
                str(d.get("canal") or "sms"),
                appareil=appareil_de(request),
                ua=_ua(request),
                se_souvenir=_oui(d.get("seSouvenir")),
            )
        )


class CodeNumeroRenvoi(VuePublique):
    @extend_schema(tags=TAG, summary="Connexion par numéro : nouvel envoi du code")
    def post(self, request):
        return Response(services.renvoyer_code_numero(appareil_de(request), str(request.data.get("canal") or "")))


class VerifierNumero(VuePublique):
    @extend_schema(tags=TAG, summary="Connexion par numéro : code tapé")
    def post(self, request):
        return Response(services.valider_code_numero(appareil_de(request), str(request.data.get("code") or ""), _ua(request)))


class MotDePasseOublie(VuePublique):
    @extend_schema(tags=TAG, summary="Mot de passe oublié : lien de 15 minutes (ne dit jamais si le compte existe)")
    def post(self, request):
        return Response(services.demander_lien(str(request.data.get("identifiant") or "")))


class LienMotDePasse(VuePublique):
    @extend_schema(tags=TAG, summary="Ouvrir le lien reçu : code SMS au titulaire")
    def post(self, request):
        return Response(services.ouvrir_lien(str(request.data.get("jeton") or "")))


class ChoisirMotDePasse(VuePublique):
    @extend_schema(tags=TAG, summary="Nouveau mot de passe (code SMS + mot de passe fort)")
    def post(self, request):
        d = request.data
        return Response(services.choisir_mot_de_passe(str(d.get("jeton") or ""), str(d.get("code") or ""), str(d.get("motDePasse") or "")))


class Deconnexion(VuePublique):
    @extend_schema(tags=TAG, summary="Déconnexion (jeton de rafraîchissement mis en liste noire)")
    def post(self, request):
        return Response(services.deconnecter(str(request.data.get("refresh") or "")))


class OublierAppareil(VueClient):
    @extend_schema(tags=TAG, summary="Ne plus reconnaître cet appareil")
    def post(self, request):
        services.oublier_appareil(request.user, appareil_de(request))
        return Response({"ok": True})


class Biometrie(VueClient):
    @extend_schema(tags=TAG, summary="Face ID ou empreinte")
    def get(self, request):
        return Response(services.biometrie(request.user))

    @extend_schema(tags=TAG, summary="Activer ou couper Face ID ou l'empreinte")
    def put(self, request):
        return Response(services.regler_biometrie(request.user, _oui(request.data.get("active"), False)))


# ── Ouverture ─────────────────────────────────────────────────────────────────────────────────────────


class Categories(VuePublique):
    @extend_schema(tags=TAG, summary="Catégories de l'ouverture (familles du barème)")
    def get(self, request):
        return Response(ouverture.categories())


class ZoneDuPoint(VuePublique):
    @extend_schema(tags=TAG, summary="Zone exploitée du point de la boutique ; 404 hors zone")
    def get(self, request):
        return _ou_404(ouverture.zone_du_point(request.query_params.get("lat"), request.query_params.get("lon")))


class Ouverture(VuePublique):
    @extend_schema(tags=TAG, summary="Dossier d'ouverture en cours ; 404 sans dossier")
    def get(self, request):
        d = ouverture.dossier_courant(request.user, appareil_de(request))
        return _ou_404(ouverture.dossier_json(d) if d else None)


class Ouvrir(VuePublique):
    @extend_schema(tags=TAG, summary="Étape 1 : ouvrir la boutique (code SMS au numéro)")
    @idempotent()
    def post(self, request):
        return Response(ouverture.demarrer(request.data, request.user, appareil_de(request)))


class CodeOuverture(VuePublique):
    @extend_schema(tags=TAG, summary="Code de l'ouverture en cours ; 404 sans code")
    def get(self, request):
        return _ou_404(ouverture.envoi_ouverture(request.user, appareil_de(request)))


class VerifierOuverture(VuePublique):
    @extend_schema(tags=TAG, summary="Code de l'ouverture : le compte vendeur existe (jetons)")
    def post(self, request):
        return Response(
            ouverture.valider_code_ouverture(request.user, appareil_de(request), str(request.data.get("code") or ""), _ua(request))
        )


class RenvoiOuverture(VuePublique):
    @extend_schema(tags=TAG, summary="Nouvel envoi du code de l'ouverture")
    def post(self, request):
        return Response(ouverture.renvoyer_code_ouverture(request.user, appareil_de(request)))


class _Dossier(VueClient):
    def dossier(self, request, ref):
        return ouverture.dossier_de(request.user, appareil_de(request), ref)


class Kyc(_Dossier):
    @extend_schema(tags=TAG, summary="Étape 2 : pièce (recto, verso, selfie) en data: URL ou multipart")
    def post(self, request, ref):
        d = request.data
        return Response(ouverture.envoyer_piece(self.dossier(request, ref), str(d.get("piece") or ""), d.get("image")))


class NumeroVersement(_Dossier):
    @extend_schema(tags=TAG, summary="Étape 2 : numéro de versement (code SMS)")
    def post(self, request, ref):
        return Response(ouverture.demander_code_versement(self.dossier(request, ref), str(request.data.get("telephone") or "")))


class VerifierVersement(_Dossier):
    @extend_schema(tags=TAG, summary="Étape 2 : code du numéro de versement")
    def post(self, request, ref):
        return Response(ouverture.valider_code_versement(self.dossier(request, ref), str(request.data.get("code") or "")))


class EnvoyerVerification(_Dossier):
    @extend_schema(tags=TAG, summary="Étape 2 : envoyer le dossier pour vérification")
    @idempotent()
    def post(self, request, ref):
        return Response(ouverture.envoyer_pour_verification(self.dossier(request, ref)))


class SignerContrat(VueClient):
    @extend_schema(tags=TAG, summary="Étape 3 : signer le contrat (RCCM et NIU si immatriculé)")
    @idempotent()
    def post(self, request):
        d = ouverture.dossier_courant(request.user, appareil_de(request))
        return Response(ouverture.signer_contrat(d, request.data, _ip(request), _ua(request)))


class DepuisClient(VueClient):
    @extend_schema(tags=TAG, summary="Arrivée depuis l'espace client (« Devenir vendeur ») ; 404 sans demande")
    def get(self, request):
        return _ou_404(ouverture.arrivee_client(request.user))

    @extend_schema(tags=TAG, summary="Confirmer l'arrivée depuis l'espace client (point de la boutique)")
    @idempotent()
    def post(self, request):
        return Response(ouverture.confirmer_arrivee_client(request.user, request.data.get("point"), appareil_de(request), _ua(request)))


# ── Saisie assistée ───────────────────────────────────────────────────────────────────────────────────


class SaisieAssistee(VueVendeur):
    @extend_schema(tags=TAG, summary="Saisie assistée par l'agent de zone")
    def get(self, request):
        return Response(saisie.saisie(self.boutique, self.proprietaire))


class ValiderFiches(VueVendeur):
    @extend_schema(tags=TAG, summary="Valider les fiches choisies (offres en vérification)")
    @proprietaire_seulement
    @idempotent()
    def post(self, request):
        ids = request.data.get("ids") or []
        saisie.valider(self.boutique, ids if isinstance(ids, list) else [])
        return Response(saisie.saisie(self.boutique, True))


class ModifierFiche(VueVendeur):
    @extend_schema(tags=TAG, summary="Corriger le prix ou le stock d'une fiche")
    @proprietaire_seulement
    def put(self, request, pk):
        refus = saisie.modifier(self.boutique, pk, request.data.get("prix"), request.data.get("stock"))
        return Response(refus or {"ok": True, "saisie": saisie.saisie(self.boutique, True)})
