# backend/apps/vendeur_boutique/views.py
# Routes des domaines « boutique », « compte », « equipe », « messages », « notifications » et « aide » de l'espace
# vendeur, sous /api/vendors/ (Q-51 ; noms du paquet, logique-metier/vendeur/api-vendeur.json). Réponses : exactement
# les types de espace-vendeur/src/donnees/domaines/*.ts ; refus attendus par l'écran : 200 { ok: false, raison }.
# Accès Préparation (DP-55, Q-18) : « Fermer aujourd'hui » et rouvrir le jour même, avis (lecture), profil, messages,
# notifications (sans l'argent), aide (sans l'argent) ; le reste : 403 owner_only.
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response

from apps.client_core.erreurs import ErreurClient, introuvable
from apps.client_core.idempotence import idempotent
from apps.vendeur_core.acces import VueProprietaire, VueVendeur, proprietaire_seulement

from . import ajouts as aj
from . import lieux as li
from . import services as s


def _corps(request) -> dict:
    return request.data if hasattr(request.data, "get") else {}


def _texte(request, cle: str, defaut: str = "") -> str:
    v = _corps(request).get(cle, defaut)
    return v if isinstance(v, str) else defaut


def _requis(request, *cles: str) -> list:
    d = _corps(request)
    manquants = [c for c in cles if d.get(c) in (None, "")]
    if manquants:
        raise ErreurClient(
            status.HTTP_400_BAD_REQUEST, "invalid", "Certaines informations manquent.", {"fields": {c: ["Obligatoire."] for c in manquants}}
        )
    return [d.get(c) for c in cles]


def _appareil(request) -> str:
    return request.headers.get("X-Device-Id", "").strip()[:80]


def vide() -> Response:
    return Response(status=status.HTTP_204_NO_CONTENT)


B = "Espace vendeur · boutique"
C = "Espace vendeur · compte"
E = "Espace vendeur · équipe"
M = "Espace vendeur · messages"
N = "Espace vendeur · notifications"
A = "Espace vendeur · aide"


# ═══ BOUTIQUE ═══════════════════════════════════════════════════════════════════════════════════════════


class BoutiqueVue(VueVendeur):
    @extend_schema(tags=[B], summary="Ma boutique (identité interne, horaires, fermetures, emplacement, vitrine)")
    def get(self, request):
        return Response(s.boutique_json(self.boutique))


class FermerAujourdhuiVue(VueVendeur):
    @extend_schema(tags=[B], summary="Fermer aujourd'hui / rouvrir (Préparation : rouvrir le jour même seulement)")
    def post(self, request):
        fermee = _corps(request).get("fermee")
        if not isinstance(fermee, bool):
            raise ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", "fermee : vrai ou faux.")
        return Response(s.fermer_aujourdhui(self.boutique, self.membre, fermee))


class HorairesVue(VueProprietaire):
    @extend_schema(tags=[B], summary="Changer les horaires (refus « ordre »)")
    def put(self, request):
        (horaires,) = _requis(request, "horaires")
        if not isinstance(horaires, list) or not all(isinstance(h, dict) for h in horaires):
            raise ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", "Horaires illisibles.")
        return Response(s.changer_horaires(self.boutique, horaires))


class PauseVue(VueProprietaire):
    @extend_schema(tags=[B], summary="Mettre la boutique en pause (30 jours au plus)")
    def post(self, request):
        return Response(s.mettre_en_pause(self.boutique, _corps(request).get("jours")))


class ReprendreVue(VueProprietaire):
    @extend_schema(tags=[B], summary="Reprendre après une pause")
    def post(self, request):
        return Response(s.reprendre(self.boutique))


class FermeturesVue(VueProprietaire):
    @extend_schema(tags=[B], summary="Programmer une fermeture (48 h à l'avance, sans chevauchement)")
    @idempotent()
    def post(self, request):
        d = _corps(request)
        return Response(s.programmer_fermeture(self.boutique, d.get("du"), d.get("au"), _texte(request, "motif")))


class FermetureVue(VueProprietaire):
    @extend_schema(tags=[B], summary="Écourter une fermeture programmée")
    def patch(self, request, id):
        return Response(s.ecourter_fermeture(self.boutique, id, _corps(request).get("au")))

    @extend_schema(tags=[B], summary="Annuler une fermeture programmée")
    def delete(self, request, id):
        return Response(s.annuler_fermeture(self.boutique, id))


class EmplacementVue(VueProprietaire):
    @extend_schema(tags=[B], summary="Replacer le point (au-delà de 200 m : nouvelle vérification)")
    def put(self, request):
        lat, lon = _requis(request, "lat", "lon")
        return Response(s.replacer(self.boutique, lat, lon))


class RepereVue(VueProprietaire):
    @extend_schema(tags=[B], summary="Changer le repère")
    def put(self, request):
        return Response(s.changer_repere(self.boutique, _texte(request, "repere")))


class VitrineVue(VueProprietaire):
    @extend_schema(tags=[B], summary="Modifier la vitrine interne (jamais montrée au client)")
    def patch(self, request):
        d = _corps(request)
        champs = {}
        for cle in ("photo", "logo", "description"):
            if cle in d:
                v = d.get(cle)
                if v is not None and not isinstance(v, str):
                    raise ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", f"{cle} : texte attendu.")
                champs[cle] = v
        return Response(s.modifier_vitrine(self.boutique, champs))


class AvisVue(VueVendeur):
    @extend_schema(tags=[B], summary="Avis des clients sur la boutique (achat vérifié, sans le client)")
    def get(self, request):
        return Response(s.avis(self.boutique))


class ReponseAvisVue(VueVendeur):
    @extend_schema(tags=[B], summary="Réponse privée à un avis, passée par le support (30 jours)")
    @proprietaire_seulement
    @idempotent()
    def post(self, request, id):
        return Response(s.repondre_avis(self.boutique, self.membre, id, _texte(request, "texte")))


# ═══ COMPTE ══════════════════════════════════════════════════════════════════════════════════════════════


class ProfilVue(VueVendeur):
    @extend_schema(tags=[C], summary="Profil du membre connecté")
    def get(self, request):
        return Response(s.profil_json(self.membre))

    @extend_schema(tags=[C], summary="Modifier le profil (photo rognée, nom de l'employé) avec le code SMS")
    def patch(self, request):
        d = _corps(request)
        if set(d.keys()) == {"bio"} and not request.FILES:  # présentation seule (AJ-B) : sans code
            return Response(s.changer_bio(self.membre, d.get("bio")))
        champs = {k: d.get(k) for k in ("prenom", "nom") if k in d}
        for image in ("photo", "couverture"):
            if image in request.FILES:
                champs[image] = request.FILES[image]
            elif image in d:
                champs[image] = d.get(image)
        r = s.modifier_profil(self.membre, champs, d.get("code"))
        if r.get("ok") and "bio" in d:
            r = s.changer_bio(self.membre, d.get("bio"))
        return Response(r)


class CodeVue(VueVendeur):
    @extend_schema(tags=[C], summary="Code SMS au téléphone personnel (second facteur)")
    def post(self, request):
        return Response(s.demander_code(self.membre, _texte(request, "motif")))


class CodeEmailVue(VueVendeur):
    @extend_schema(tags=[C], summary="Nouvel e-mail : code envoyé à la nouvelle adresse")
    def post(self, request):
        return Response(s.demander_code_email(self.membre, _texte(request, "email")))


class ConfirmerEmailVue(VueVendeur):
    @extend_schema(tags=[C], summary="Nouvel e-mail : confirmer avec le code SMS et le code de l'e-mail")
    def post(self, request):
        d = _corps(request)
        return Response(s.confirmer_email(self.membre, d.get("codeSms"), d.get("codeEmail")))


class CodesNumeroVue(VueVendeur):
    @extend_schema(tags=[C], summary="Nouveau téléphone : codes à l'ancien et au nouveau numéro")
    def post(self, request):
        return Response(s.demander_codes_numero(self.membre, _texte(request, "numero")))


class NumeroVue(VueVendeur):
    @extend_schema(tags=[C], summary="Nouveau téléphone : confirmer avec les deux codes")
    def put(self, request):
        d = _corps(request)
        return Response(s.confirmer_numero(self.membre, d.get("codeAncien"), d.get("codeNouveau")))


class MotDePasseVue(VueVendeur):
    @extend_schema(tags=[C], summary="Changer le mot de passe (code SMS)")
    def put(self, request):
        d = _corps(request)
        return Response(s.changer_mot_de_passe(self.membre, _texte(request, "ancien"), _texte(request, "nouveau"), d.get("code"), request))


class SecuriteVue(VueVendeur):
    @extend_schema(tags=[C], summary="Sécurité : Face ID, téléphone masqué, export, clôture")
    def get(self, request):
        return Response(s.securite(self.membre))


class FaceIdVue(VueVendeur):
    @extend_schema(tags=[C], summary="Face ID sur cet appareil")
    def put(self, request):
        return Response(s.regler_face_id(self.membre, bool(_corps(request).get("actif"))))


class AppareilsVue(VueVendeur):
    @extend_schema(tags=[C], summary="Appareils connectés (ville, jamais l'adresse IP)")
    def get(self, request):
        return Response(s.appareils(self.membre, _appareil(request)))


class AppareilVue(VueVendeur):
    @extend_schema(tags=[C], summary="Déconnecter un appareil")
    def delete(self, request, id):
        return Response(s.deconnecter(self.membre, _appareil(request), id))


class AutresAppareilsVue(VueVendeur):
    @extend_schema(tags=[C], summary="Déconnecter tous les autres appareils")
    def post(self, request):
        return Response(s.deconnecter(self.membre, _appareil(request)))


class StatutVue(VueProprietaire):
    @extend_schema(tags=[C], summary="Statut du compte et grille « part que vous gardez »")
    def get(self, request):
        return Response(s.statut(self.boutique))


class ExportVue(VueVendeur):
    @extend_schema(tags=[C], summary="Mes données : export par e-mail sous 48 h (code SMS)")
    @idempotent()
    def post(self, request):
        return Response(s.exporter(self.membre, _corps(request).get("code")))


class ClotureVue(VueProprietaire):
    @extend_schema(tags=[C], summary="Clôturer le compte (code SMS, 30 jours de préavis)")
    @idempotent()
    def post(self, request):
        d = _corps(request)
        return Response(s.cloturer(self.membre, d.get("code"), _texte(request, "motif")))

    @extend_schema(tags=[C], summary="Annuler la clôture")
    def delete(self, request):
        return Response(s.annuler_cloture(self.membre))


class CorrectionsVue(VueVendeur):
    @extend_schema(tags=[C], summary="Demande de modification au support (titulaire, identifiant)")
    @idempotent()
    def post(self, request):
        (quoi,) = _requis(request, "quoi")
        return Response(s.demander_modification(self.boutique, self.membre, str(quoi), _texte(request, "ref") or None))


# ═══ ÉQUIPE (propriétaire seulement) ═════════════════════════════════════════════════════════════════════


class EquipeVue(VueProprietaire):
    @extend_schema(tags=[E], summary="Mon équipe : propriétaire et 3 accès Préparation au plus")
    def get(self, request):
        return Response(s.equipe(self.boutique))

    @extend_schema(tags=[E], summary="Préparer l'ajout d'un membre : code SMS au propriétaire")
    @idempotent()
    def post(self, request):
        droits = _corps(request).get("droits")
        return Response(
            s.inviter(
                self.boutique,
                self.membre,
                _texte(request, "prenomNom"),
                _texte(request, "telephone"),
                droits if isinstance(droits, list) else None,
            )
        )


class ConfirmerInvitationVue(VueProprietaire):
    @extend_schema(tags=[E], summary="Confirmer l'ajout avec le code SMS (compte du membre créé au besoin)")
    @idempotent()
    def post(self, request, invitation):
        return Response(s.confirmer_invitation(self.boutique, self.membre, invitation, _corps(request).get("code")))


class MembreVue(VueProprietaire):
    @extend_schema(tags=[E], summary="Retirer un membre (code SMS) : sessions coupées tout de suite")
    def delete(self, request, id):
        return Response(s.retirer(self.boutique, self.membre, id, _corps(request).get("code")))


class RenvoyerInvitationVue(VueProprietaire):
    @extend_schema(tags=[E], summary="Renvoyer le SMS d'installation")
    def post(self, request, id):
        return Response(s.renvoyer_invitation(self.boutique, self.membre, id))


class CodeRetraitVue(VueProprietaire):
    @extend_schema(tags=[E], summary="Code SMS au propriétaire avant un retrait")
    def post(self, request, id):
        return Response(s.demander_code_retrait(self.membre))


class AnnulerInvitationVue(VueProprietaire):
    @extend_schema(tags=[E], summary="Annuler une invitation pas encore acceptée (sans code)")
    def delete(self, request, id):
        return Response(s.annuler_invitation(self.boutique, self.membre, id))


class CodeMembreVue(VueProprietaire):
    @extend_schema(tags=[E], summary="Code SMS au propriétaire : retrait, droits ou réactivation")
    def post(self, request, id):
        return Response(s.demander_code_membre(self.membre, _texte(request, "motif")))


class DroitsMembreVue(VueProprietaire):
    @extend_schema(tags=[E], summary="Changer les droits d'un employé (code SMS ; interdits retirés d'office)")
    def put(self, request, id):
        d = _corps(request)
        return Response(s.changer_droits(self.boutique, self.membre, id, d.get("droits"), d.get("code")))


class SuspendreMembreVue(VueProprietaire):
    @extend_schema(tags=[E], summary="Suspendre un employé : sessions coupées tout de suite, compte gardé")
    def post(self, request, id):
        return Response(s.suspendre(self.boutique, self.membre, id))


class ReactiverMembreVue(VueProprietaire):
    @extend_schema(tags=[E], summary="Réactiver un employé suspendu (code SMS)")
    def post(self, request, id):
        return Response(s.reactiver(self.boutique, self.membre, id, _corps(request).get("code")))


class JournalMembreVue(VueProprietaire):
    @extend_schema(tags=[E], summary="Actions signées d'un membre, la plus récente d'abord (EQU-03)")
    def get(self, request, id):
        m = s._membre(self.boutique, id)
        return Response(s.journal_membre(m) if m else [])


# ═══ MESSAGES ════════════════════════════════════════════════════════════════════════════════════════════


class FilsVue(VueVendeur):
    @extend_schema(tags=[M], summary="Conversations (anonymes, une par commande) et Support BelivaY")
    def get(self, request):
        return Response(s.fils(self.boutique))

    @extend_schema(
        tags=[M], summary="La conversation d'une commande, créée au besoin (ouvrirFil, REP-03) : {order_id} → {fil} ; 404 → null"
    )
    def post(self, request):
        r = s.ouvrir_fil(self.boutique, str(request.data.get("order_id") or ""))
        if r is None:
            raise introuvable("Commande introuvable.")
        return Response(r)


class FilVue(VueVendeur):
    @extend_schema(tags=[M], summary="Une conversation et ses messages ; 404 si inconnue")
    def get(self, request, id):
        f = s.fil(self.boutique, id)
        if f is None:
            raise introuvable("Conversation introuvable.")
        return Response(f)


class EnvoyerVue(VueVendeur):
    @extend_schema(tags=[M], summary="Répondre (filtré, signé) ; 409 ferme")
    @idempotent()
    def post(self, request, id):
        m = s.envoyer(self.boutique, self.membre, id, _texte(request, "texte"))
        if m is None:
            raise introuvable("Conversation introuvable.")
        return Response(m)


class LireVue(VueVendeur):
    @extend_schema(tags=[M], summary="Marquer la conversation comme lue")
    def post(self, request, id):
        if not s.lire(self.boutique, id):
            raise introuvable("Conversation introuvable.")
        return vide()


class SupportVue(VueVendeur):
    @extend_schema(tags=[M], summary="La conversation Support BelivaY")
    def get(self, request):
        return Response(s.fil(self.boutique, s.SUPPORT))

    @extend_schema(tags=[M], summary="Écrire au Support BelivaY (avec la référence d'une commande)")
    @idempotent()
    def post(self, request):
        r = s.ecrire_au_support(self.boutique, self.membre, _texte(request, "texte"), _texte(request, "ref") or None)
        return Response({"fil": r["fil"]})


class ReponsesRapidesVue(VueVendeur):
    @extend_schema(tags=[M], summary="Réponses rapides par type de conversation")
    def get(self, request):
        return Response(s.REPONSES_RAPIDES.get(request.query_params.get("type", "commande"), []))


# ═══ NOTIFICATIONS ═══════════════════════════════════════════════════════════════════════════════════════


class NotificationsVue(VueVendeur):
    @extend_schema(tags=[N], summary="Centre de notifications (tout | urgent | argent)")
    def get(self, request):
        filtre = request.query_params.get("filter", "tout")
        if filtre not in ("tout", "urgent", "argent"):
            filtre = "tout"
        return Response(s.notifications(self.boutique, self.membre, filtre))


class CompteursVue(VueVendeur):
    @extend_schema(tags=[N], summary="Compteurs des filtres et non lues")
    def get(self, request):
        return Response(s.compteurs(self.boutique, self.membre))


class NonLuesVue(VueVendeur):
    @extend_schema(tags=[N], summary="Nombre de notifications non lues")
    def get(self, request):
        return Response({"nonLues": s.notifications_non_lues(self.membre)})


class LueVue(VueVendeur):
    @extend_schema(tags=[N], summary="Marquer lue (ou non lue)")
    def post(self, request, id):
        lue = _corps(request).get("lue", True)
        if not s.marquer_lue(self.boutique, self.membre, id, lue is not False):
            raise introuvable("Notification introuvable.")
        return vide()


class ToutLuVue(VueVendeur):
    @extend_schema(tags=[N], summary="Tout marquer comme lu")
    def post(self, request):
        s.tout_marquer_lu(self.boutique, self.membre)
        return vide()


class ReglagesVue(VueVendeur):
    @extend_schema(tags=[N], summary="Réglages push du membre")
    def get(self, request):
        return Response(s.reglages(self.membre))

    @extend_schema(tags=[N], summary="Changer les réglages push")
    def put(self, request):
        return Response(s.regler(self.membre, dict(_corps(request))))


# ═══ AIDE ════════════════════════════════════════════════════════════════════════════════════════════════


class QuestionsVue(VueVendeur):
    @extend_schema(tags=[A], summary="Questions fréquentes (sans l'argent pour l'accès Préparation)")
    def get(self, request):
        return Response(s.questions(self.boutique, self.proprietaire, request.query_params.get("q", "")))


class InterditsVue(VueVendeur):
    @extend_schema(tags=[A], summary="Produits interdits")
    def get(self, request):
        return Response(s.produits_interdits())


class ContactsVue(VueVendeur):
    @extend_schema(tags=[A], summary="Coordonnées officielles de BelivaY et du support")
    def get(self, request):
        return Response(s.contacts())


class ConseilVue(VueVendeur):
    @extend_schema(tags=[A], summary="Conseil de la semaine")
    def get(self, request):
        return Response(s.conseil())


# ═══ EMPLACEMENTS ET DEMANDES DE MODIFICATION (sécurité de la boutique, lieux.py) ═══════════════════════════


class LieuxVue(VueVendeur):
    @extend_schema(tags=[B], summary="Lieux de la boutique (principal d'abord) et centres BelivaY ; lecture permise à l'employé")
    def get(self, request):
        return Response(li.lieux(self.boutique))

    @extend_schema(tags=[B], summary="Ajouter un lieu (point GPS « À vérifier », ou centre BelivaY vérifié d'office)")
    @proprietaire_seulement
    @idempotent()
    def post(self, request):
        return Response(li.ajouter(self.boutique, _corps(request)))


class LieuVue(VueProprietaire):
    @extend_schema(tags=[B], summary="Modifier nom, adresse, repère, horaires (sans nouvelle vérification)")
    def patch(self, request, id):
        d = _corps(request)
        return Response(li.modifier(self.boutique, id, {k: d.get(k) for k in ("nom", "adresse", "repere", "horaires") if k in d}))

    @extend_schema(tags=[B], summary="Retirer un lieu (jamais le principal)")
    def delete(self, request, id):
        return Response(li.retirer(self.boutique, id))


class PointLieuVue(VueProprietaire):
    @extend_schema(tags=[B], summary="Replacer le point d'un lieu (au-delà de 200 m : « À vérifier », l'ancien sert)")
    def put(self, request, id):
        lat, lon = _requis(request, "lat", "lon")
        return Response(li.replacer(self.boutique, id, lat, lon))


class CodePrincipalVue(VueProprietaire):
    @extend_schema(tags=[B], summary="Code SMS au propriétaire avant de changer le lieu principal")
    def post(self, request):
        return Response(li.demander_code_principal(self.membre))


class PrincipalVue(VueProprietaire):
    @extend_schema(tags=[B], summary="Rendre principal un lieu vérifié (code SMS) : origine du ramassage et zone")
    def post(self, request, id):
        return Response(li.rendre_principal(self.boutique, self.membre, id, _corps(request).get("code")))


class CentresVue(VueVendeur):
    @extend_schema(tags=[B], summary="Centres BelivaY : relais et centres des zones exploitées")
    def get(self, request):
        return Response(li.centres())


class DemandesVue(VueProprietaire):
    @extend_schema(tags=[B], summary="Demandes de modification (nom, officiel, titulaire, autre), la plus récente d'abord")
    def get(self, request):
        return Response(li.demandes(self.boutique))

    @extend_schema(tags=[B], summary="Demander une modification (code SMS, pièces) : décidée par la console sous 72 h ouvrées")
    @idempotent()
    def post(self, request):
        d = _corps(request)
        return Response(li.demander(self.boutique, self.membre, d, d.get("code")))


class CodeDemandeVue(VueProprietaire):
    @extend_schema(tags=[B], summary="Code SMS au propriétaire avant une demande de modification")
    def post(self, request):
        return Response(li.demander_code(self.membre))


class DemandeVue(VueProprietaire):
    @extend_schema(tags=[B], summary="Annuler une demande en attente")
    def delete(self, request, id):
        return Response(li.annuler(self.boutique, id))


# ═══ QUESTIONS DES CLIENTS (AJ-A) ET APPRENDRE (AJ-B), ajouts.py ═════════════════════════════════════════

Q = "Espace vendeur · questions"


class QuestionsClientsVue(VueVendeur):
    @extend_schema(tags=[Q], summary="Questions des clients sur les offres (client anonyme) ; sans réponse d'abord")
    def get(self, request):
        return Response(aj.liste(self.boutique))


class FiltrerQuestionVue(VueVendeur):
    @extend_schema(tags=[Q], summary="Ce que le client verrait (coordonnées retirées, même filtre que la messagerie)")
    def post(self, request):
        return Response(aj.filtrer(_texte(request, "texte")))


class RepondreQuestionVue(VueVendeur):
    @extend_schema(tags=[Q], summary="Réponse publique (propriétaire, Q-17) : refus court, long, coordonnees, deja, reserve")
    @idempotent()
    def post(self, request, id):
        return Response(aj.repondre(self.boutique, self.membre, id, _texte(request, "texte")))


class SignalerQuestionVue(VueVendeur):
    @extend_schema(tags=[Q], summary="Signaler une question (relue sous 48 h)")
    def post(self, request, id):
        return Response(aj.signaler(self.boutique, id, _texte(request, "motif")))


class ModelesVue(VueVendeur):
    @extend_schema(tags=[Q], summary="Modèles de réponse (les vôtres, puis ceux de BelivaY)")
    def get(self, request):
        return Response(aj.modeles(self.boutique))

    @extend_schema(tags=[Q], summary="Enregistrer un modèle (10 au plus)")
    def post(self, request):
        return Response(aj.enregistrer_modele(self.boutique, self.membre, _texte(request, "titre"), _texte(request, "texte")))


class ModeleVue(VueVendeur):
    @extend_schema(tags=[Q], summary="Supprimer un de vos modèles")
    def delete(self, request, id):
        aj.supprimer_modele(self.boutique, self.membre, id)
        return vide()


class ProgressionVue(VueVendeur):
    @extend_schema(tags=[A], summary="Apprendre : étapes faites par le membre connecté (« fiche:étape »)")
    def get(self, request):
        return Response(aj.progression(self.membre))


class ProgressionFicheVue(VueVendeur):
    @extend_schema(tags=[A], summary="Cocher ou décocher une étape {etape, fait}")
    def put(self, request, fiche):
        d = _corps(request)
        r = aj.cocher(self.membre, fiche, d.get("etape"), bool(d.get("fait")))
        if r is None:
            raise ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", "Étape inconnue.")
        return Response(r)

    @extend_schema(tags=[A], summary="Recommencer une fiche")
    def delete(self, request, fiche):
        return Response(aj.recommencer(self.membre, fiche))


# ═══ ÉCHANGES AVEC LES AUTRES INTERFACES (INTERFACES.md) ════════════════════════════════════════════════

EV = "Espace vendeur · échanges"


class EvenementsVue(VueVendeur):
    @extend_schema(tags=[EV], summary="Événements depuis un curseur (?depuis=) : rejouables sans doublon ; selon les droits")
    def get(self, request):
        from apps.vendeur_core import echanges

        return Response(echanges.lire(self.membre, request.query_params.get("depuis")))


class FluxEvenementsVue(VueVendeur):
    @extend_schema(tags=[EV], summary="Flux SSE des événements (text/event-stream) : un passage, puis le client se reconnecte")
    def get(self, request):
        import json

        from django.http import HttpResponse

        from apps.vendeur_core import echanges

        # Un seul passage par requête (le navigateur se reconnecte, EventSource « retry ») : rien ne garde un fil du
        # serveur ouvert ; Last-Event-ID reprend au dernier événement reçu.
        depuis = request.headers.get("Last-Event-ID") or request.query_params.get("depuis")
        lot = echanges.lire(self.membre, depuis)
        corps = "retry: 5000\n\n" + "".join(
            f"id: {e['id']}\nevent: {e['canal']}\ndata: {json.dumps(e, ensure_ascii=False)}\n\n" for e in lot["evenements"]
        )
        r = HttpResponse(corps, content_type="text/event-stream; charset=utf-8")
        r["Cache-Control"] = "no-store"
        return r


class RechercheVue(VueVendeur):
    @extend_schema(
        tags=[A], summary="Rechercher partout (?q=) : commandes, produits, litiges, versements (propriétaire) ; jamais le client"
    )
    def get(self, request):
        return Response(aj.rechercher(self.boutique, self.membre, str(request.query_params.get("q") or "")[:120]))


class ActiviteBoutiqueVue(VueVendeur):
    @extend_schema(tags=[B], summary="Activité de la boutique : journal signé des commandes et du stock (lecture seule)")
    def get(self, request):
        return Response(aj.activite(self.boutique))
