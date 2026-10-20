# backend/apps/vendeur_argent/views.py
# Routes de l'argent, des versements et de l'accueil du vendeur, sous /api/vendors/ (Q-51 ; api-vendeur.json).
# Argent et versements : propriétaire seulement (VueProprietaire : 403 owner_only pour l'accès Préparation).
# Chaque lecture d'argent passe d'abord par executer_versements (arrêté du jeudi, versement du vendredi : idempotent).
# Réponses : exactement les types de espace-vendeur/src/donnees/domaines/{argent,versements,accueil}.ts.
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.response import Response

from apps.client_core.erreurs import ErreurClient, introuvable
from apps.client_core.idempotence import idempotent
from apps.vendeur_core.acces import VueProprietaire, VueVendeur

from . import accueil, activite, numero, services
from .models import ActionEnFile

ARGENT = "Espace vendeur · argent"
VERSEMENTS = "Espace vendeur · versements"
ACCUEIL = "Espace vendeur · accueil"


def invalide(message: str, champs=None) -> ErreurClient:
    return ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", message, {"fields": champs} if champs else None)


def lire(serialiseur_cls, data) -> dict:
    s = serialiseur_cls(data=data)
    if not s.is_valid():
        raise invalide("Certaines informations ne sont pas valides.", s.errors)
    return s.validated_data


class VueArgent(VueProprietaire):
    """Propriétaire seulement ; versements exécutés avant la lecture (lecture sûre, comme synchroniser)."""

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        from apps.vendeur_core.services import synchroniser

        synchroniser(self.boutique)
        services.executer_versements(self.boutique)


# ── Argent ─────────────────────────────────────────────────────────────────────────────────────────────


class ResumeVue(VueArgent):
    @extend_schema(tags=[ARGENT], summary="Où est l'argent : à verser, se libère, en cours, gelé (ResumeArgent)")
    def get(self, request):
        return Response(services.resume(self.boutique))


class SeLibereVue(VueArgent):
    @extend_schema(tags=[ARGENT], summary="Se libère : une carte par commande (SeLibere)")
    def get(self, request):
        return Response(services.se_libere(self.boutique))


class GeleVue(VueArgent):
    @extend_schema(tags=[ARGENT], summary="Gelé : litiges, retours, vérifications (Gele)")
    def get(self, request):
        return Response(services.gele(self.boutique))


class GainsVue(VueArgent):
    @extend_schema(tags=[ARGENT], summary="Mes gains d'un mois (Gains) ; ?month=AAAA-MM")
    def get(self, request):
        mois = request.query_params.get("month") or services.mois_y(services.horloge.maintenant())
        if not services.MOIS.match(mois):
            raise invalide("Mois attendu au format AAAA-MM.", {"month": ["AAAA-MM"]})
        return Response(services.gains(self.boutique, mois))


class DocumentsVue(VueArgent):
    @extend_schema(tags=[ARGENT], summary="Relevés, reçus, factures, contrat (Documents)")
    def get(self, request):
        return Response(services.documents(self.boutique))


class ContenuDocumentVue(VueArgent):
    @extend_schema(tags=[ARGENT], summary="Contenu d'un document (ContenuDocument) ; ?type=releve|facture|contrat|versements&periode=")
    def get(self, request):
        type_ = request.query_params.get("type", "")
        periode = request.query_params.get("periode") or None
        if type_ in ("releve", "facture") and not (periode and services.MOIS.match(periode)):
            raise invalide("Période attendue au format AAAA-MM.", {"periode": ["AAAA-MM"]})
        if type_ == "versements" and periode not in ("3", "12", "tout"):
            raise invalide("Période attendue : 3, 12 ou tout.", {"periode": ["3|12|tout"]})
        if type_ not in ("releve", "facture", "contrat", "versements"):
            raise invalide("Type de document inconnu.", {"type": ["releve|facture|contrat|versements"]})
        return Response(services.contenu(self.boutique, type_, periode))


# ── Versements ─────────────────────────────────────────────────────────────────────────────────────────


class ProchainVue(VueArgent):
    @extend_schema(tags=[VERSEMENTS], summary="Prochain versement (Prochain) ; 404 s'il n'y en a pas")
    def get(self, request):
        p = services.prochain(self.boutique)
        if p is None:
            raise introuvable("Aucun versement prévu.")
        return Response(p)


class HistoriqueVue(VueArgent):
    @extend_schema(tags=[VERSEMENTS], summary="Historique des versements (Historique) ; ?period=3|12|tout")
    def get(self, request):
        periode = request.query_params.get("period", "3")
        if periode not in ("3", "12", "tout"):
            raise invalide("Période attendue : 3, 12 ou tout.", {"period": ["3|12|tout"]})
        return Response(services.historique(self.boutique, periode))


class IncidentVue(VueArgent):
    @extend_schema(tags=[VERSEMENTS], summary="Versement non reçu (VER-03) → {ok, reponseAvant} | inconnu | deja")
    @idempotent()
    def post(self, request, reference):
        return Response(services.signaler_non_recu(self.boutique, reference))


class _Codes(serializers.Serializer):
    operateur = serializers.ChoiceField(choices=["MTN", "Orange"])
    numero = serializers.CharField(max_length=30)


class _Renvoi(serializers.Serializer):
    quel = serializers.ChoiceField(choices=["nouveau", "personnel"])


class _Confirmation(serializers.Serializer):
    codeNouveau = serializers.CharField(max_length=12)
    codePersonnel = serializers.CharField(max_length=12)


class NumeroVue(VueArgent):
    @extend_schema(tags=[VERSEMENTS], summary="Numéro de versement (NumeroVersement)")
    def get(self, request):
        return Response(numero.lire(self.boutique))

    @extend_schema(tags=[VERSEMENTS], summary="Confirmer le nouveau numéro par les deux codes : revue de 7 jours")
    @idempotent()
    def put(self, request):
        d = lire(_Confirmation, request.data)
        return Response(numero.confirmer(self.boutique, request.user, d["codeNouveau"], d["codePersonnel"]))


class CodesVue(VueArgent):
    @extend_schema(tags=[VERSEMENTS], summary="Deux codes : au nouveau numéro et au téléphone personnel du propriétaire")
    @idempotent()
    def post(self, request):
        d = lire(_Codes, request.data)
        return Response(numero.demander_codes(self.boutique, request.user, d["operateur"], d["numero"]))

    @extend_schema(tags=[VERSEMENTS], summary="Annuler la saisie du nouveau numéro")
    def delete(self, request):
        numero.annuler(self.boutique)
        return Response(status=status.HTTP_204_NO_CONTENT)


class RenvoiVue(VueArgent):
    @extend_schema(tags=[VERSEMENTS], summary="Renvoyer un des deux codes")
    @idempotent()
    def post(self, request):
        d = lire(_Renvoi, request.data)
        return Response(numero.renvoyer(self.boutique, request.user, d["quel"]))


# ── Accueil ────────────────────────────────────────────────────────────────────────────────────────────


class AujourdhuiVue(VueVendeur):
    @extend_schema(tags=[ACCUEIL], summary="À faire aujourd'hui, la plus urgente d'abord (Aujourdhui)")
    def get(self, request):
        return Response(accueil.aujourdhui(self.boutique, self.proprietaire))


class MasquerAlerteVue(VueVendeur):
    @extend_schema(tags=[ACCUEIL], summary="Masquer l'alerte avant un seuil pour la semaine")
    def post(self, request):
        accueil.masquer_alerte(self.boutique)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CalmeVue(VueVendeur):
    @extend_schema(tags=[ACCUEIL], summary="Rien à faire : les chiffres (Calme ; argent null pour l'accès Préparation)")
    def get(self, request):
        services.executer_versements(self.boutique)
        return Response(accueil.calme(self.boutique, self.proprietaire))


class PremierJourVue(VueVendeur):
    @extend_schema(tags=[ACCUEIL], summary="Premier jour (PremierJour)")
    def get(self, request):
        return Response(accueil.premier_jour(self.boutique, self.proprietaire))


class SuspensionVue(VueVendeur):
    @extend_schema(
        tags=[ACCUEIL], summary="Suspension en cours (Suspension, lue dans vendeur_croissance) ; 404 sans suspension ; ?example=1"
    )
    def get(self, request):
        s = accueil.suspension(self.boutique, request.query_params.get("example") in ("1", "true"))
        if s is None:
            raise introuvable("Aucune suspension.")
        return Response(s)


class _Action(serializers.Serializer):
    type = serializers.ChoiceField(choices=ActionEnFile.Type.values)
    objet = serializers.CharField(max_length=200)
    detail = serializers.JSONField(required=False, allow_null=True)
    origine = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    lieu = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=120)


class _Reseau(serializers.Serializer):
    horsLigneDepuis = serializers.IntegerField(allow_null=True, min_value=0)


class FileVue(VueVendeur):
    @extend_schema(tags=[ACCUEIL], summary="File des actions gardées hors connexion (FileHorsLigne)")
    def get(self, request):
        return Response(accueil.file(self.boutique))

    @extend_schema(tags=[ACCUEIL], summary="Mettre un geste en file (ActionEnFile), avec son heure et son lieu d'origine")
    @idempotent()
    def post(self, request):
        d = lire(_Action, request.data)
        detail = d.get("detail")
        if detail is not None and not isinstance(detail, dict):
            raise invalide("detail : objet attendu.", {"detail": ["objet"]})
        return Response(
            accueil.mettre_en_file(self.boutique, self.membre, d["type"], d["objet"], detail, d.get("origine"), d.get("lieu")),
            status=status.HTTP_201_CREATED,
        )


class EnvoyerFileVue(VueVendeur):
    @extend_schema(tags=[ACCUEIL], summary="Rejouer la file dans l'ordre ; une action de plus de 72 h expire")
    @idempotent()
    def post(self, request):
        return Response(accueil.envoyer_file(self.boutique, self.membre))


class ReseauVue(VueVendeur):
    @extend_schema(tags=[ACCUEIL], summary="Passage hors connexion (heure des données) ou retour du réseau (null)")
    def put(self, request):
        d = lire(_Reseau, request.data)
        accueil.noter_reseau(self.boutique, d["horsLigneDepuis"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ActionVue(VueVendeur):
    @extend_schema(tags=[ACCUEIL], summary="Retirer une action de la file")
    def delete(self, request, ident):
        if not accueil.retirer(self.boutique, ident):
            raise introuvable("Action introuvable.")
        return Response(status=status.HTTP_204_NO_CONTENT)


class ActiviteVue(VueProprietaire):
    @extend_schema(tags=[ACCUEIL], summary="Votre activité : gardé par jour ou par mois (?period=7d|30d|12m), carte jour × heure, objectif")
    def get(self, request):
        return Response(activite.activite(self.boutique, request.query_params.get("period", "30d")))


class ObjectifVue(VueProprietaire):
    @extend_schema(tags=[ACCUEIL], summary="Objectif du mois (montant gardé visé) et ce qui est atteint")
    def get(self, request):
        return Response(activite.objectif(self.boutique))

    @extend_schema(tags=[ACCUEIL], summary="Fixer l'objectif du mois {amount}")
    def put(self, request):
        return Response(activite.regler_objectif(self.boutique, request.data.get("amount")))
