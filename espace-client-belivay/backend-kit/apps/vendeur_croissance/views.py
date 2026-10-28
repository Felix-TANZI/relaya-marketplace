# backend/apps/vendeur_croissance/views.py
# Routes de la croissance du vendeur (VD-10), sous /api/vendors/ : trust (score, statut, décisions, contestation),
# paliers (GET /tiers), plans (offres, état, simulateur, essai et souscription, paiements, arrêt, visibilité au mérite,
# vente flash, services, chiffres, demande de la zone). Réponses : types de espace-vendeur/src/donnees/domaines/
# {trust,paliers,plans}.ts. Plans, paiements, visibilité, services et chiffres : propriétaire seulement (403
# owner_only, VD-D12.A03) ; GET /tiers : l'accès Préparation reçoit les montants à null. Logique : services.py.
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response

from apps.client_core.erreurs import introuvable
from apps.client_core.idempotence import idempotent
from apps.vendeur_core.acces import VueProprietaire, VueVendeur

from . import promotions, services

TAG_TRUST = ["Espace vendeur · trust"]
TAG_PALIERS = ["Espace vendeur · paliers"]
TAG_PLANS = ["Espace vendeur · plans"]


# ── trust ─────────────────────────────────────────────────────────────────────────────────────────────


class ScoreVue(VueVendeur):
    @extend_schema(tags=TAG_TRUST, summary="Trust Score : critères, journal des événements, barème, 30 nuits (Score)")
    def get(self, request):
        return Response(services.score(self.boutique))


class StatutVue(VueVendeur):
    @extend_schema(tags=TAG_TRUST, summary="État du compte : sanction ou descente en cours, contrôle au ramassage (StatutCompte)")
    def get(self, request):
        return Response(services.statut_compte(self.boutique))


class DecisionsVue(VueVendeur):
    @extend_schema(tags=TAG_TRUST, summary="Historique des décisions, la plus récente en tête (Decision[])")
    def get(self, request):
        return Response(services.decisions(self.boutique))


class DecisionVue(VueVendeur):
    @extend_schema(tags=TAG_TRUST, summary="Une décision (Decision) ; 404 inconnue")
    def get(self, request, id):
        d = services.decision(self.boutique, id)
        if d is None:
            raise introuvable("Décision introuvable.")
        return Response(services.decision_json(d))


class ContestationEntree(serializers.Serializer):
    decision = serializers.CharField(max_length=40)
    texte = serializers.CharField(max_length=5000, allow_blank=True)
    preuves = serializers.ListField(child=serializers.CharField(max_length=500), required=False, default=list, max_length=10)


class ContesterVue(VueVendeur):
    @extend_schema(
        tags=TAG_TRUST,
        summary="Contester une décision : une fois, 40 à 1 000 caractères, réponse sous 72 h ouvrées",
        request=ContestationEntree,
    )
    @idempotent()
    def post(self, request):
        e = ContestationEntree(data=request.data)
        e.is_valid(raise_exception=True)
        v = e.validated_data
        return Response(services.contester(self.boutique, self.membre, v["decision"], v["texte"], v["preuves"]))


# ── paliers ───────────────────────────────────────────────────────────────────────────────────────────


class PaliersVue(VueVendeur):
    @extend_schema(tags=TAG_PALIERS, summary="Mon palier : conditions, projection, montée, descente, gardé par palier (MonPalier)")
    def get(self, request):
        return Response(services.mon_palier(self.boutique, self.proprietaire))


# ── plans ─────────────────────────────────────────────────────────────────────────────────────────────


class PlansVue(VueProprietaire):
    @extend_schema(tags=TAG_PLANS, summary="Plans Free, Boost, Pro (OffrePlan[])")
    def get(self, request):
        return Response(services.offres_plans(self.boutique))


class EtatPlanVue(VueProprietaire):
    @extend_schema(tags=TAG_PLANS, summary="Plan en cours : essai, période, prochain paiement, grâce, découverte (EtatPlan)")
    def get(self, request):
        return Response(services.etat_plan(self.boutique))


class SimulerVue(VueProprietaire):
    @extend_schema(tags=TAG_PLANS, summary="Simulateur : gardé du mois avec chaque plan (Simulation)")
    def get(self, request):
        ventes = request.query_params.get("sales")
        facturation = request.query_params.get("billing") or "mensuelle"
        if facturation not in ("mensuelle", "annuelle"):
            raise serializers.ValidationError({"billing": ["mensuelle | annuelle"]})
        if ventes not in (None, "") and not str(ventes).isdigit():
            raise serializers.ValidationError({"sales": ["Montant en francs entiers."]})
        return Response(services.simulation(self.boutique, int(ventes) if ventes not in (None, "") else None, facturation))


class SouscrireEntree(serializers.Serializer):
    plan = serializers.ChoiceField(choices=["Boost", "Pro"])
    facturation = serializers.ChoiceField(choices=["mensuelle", "annuelle"], required=False, default="mensuelle")
    trial = serializers.BooleanField(required=False, default=False)


class SouscrireVue(VueProprietaire):
    @extend_schema(tags=TAG_PLANS, summary="Essai (0 F aujourd'hui) ou demande de paiement Mobile Money d'un plan", request=SouscrireEntree)
    @idempotent()
    def post(self, request):
        e = SouscrireEntree(data=request.data)
        e.is_valid(raise_exception=True)
        v = e.validated_data
        if v["trial"]:
            return Response(services.essayer(self.boutique, v["plan"]))
        return Response(services.souscrire(self.boutique, self.membre, v["plan"], v["facturation"]))


class PaiementVue(VueProprietaire):
    @extend_schema(tags=TAG_PLANS, summary="Demande de paiement (DemandePaiement) ; 404 inconnue")
    def get(self, request, id):
        d = services.paiement(self.boutique, id)
        if d is None:
            raise introuvable("Demande de paiement introuvable.")
        return Response(services.paiement_json(d))

    @extend_schema(tags=TAG_PLANS, summary="Annuler une demande de paiement en attente", responses={204: None})
    def delete(self, request, id):
        services.annuler_paiement(self.boutique, id)
        return Response(status=204)


class ArretEntree(serializers.Serializer):
    arret = serializers.BooleanField()


class ArreterVue(VueProprietaire):
    @extend_schema(tags=TAG_PLANS, summary="Arrêter le plan à la fin de la période (ou reprendre) (EtatPlan)", request=ArretEntree)
    def post(self, request):
        e = ArretEntree(data=request.data)
        e.is_valid(raise_exception=True)
        return Response(services.arreter(self.boutique, e.validated_data["arret"]))


class VisibiliteVue(VueProprietaire):
    @extend_schema(tags=TAG_PLANS, summary="Se faire voir : récompenses au mérite, vente flash (Visibilite)")
    def get(self, request):
        return Response(services.visibilite(self.boutique))


class RecompenseVue(VueProprietaire):
    @extend_schema(tags=TAG_PLANS, summary="Utiliser une récompense au mérite (vitrine de quartier)", request=None)
    @idempotent()
    def post(self, request, id):
        return Response(services.utiliser_recompense(self.boutique, id))


class FlashEntree(serializers.Serializer):
    id = serializers.CharField(max_length=20)
    remisePourCent = serializers.FloatField()  # noqa: N815 - nom du contrat


class VenteFlashVue(VueProprietaire):
    @extend_schema(
        tags=TAG_PLANS, summary="Programmer la vente flash offerte (10 % au moins ; au-delà de 50 %, relue sous 24 h)", request=FlashEntree
    )
    @idempotent()
    def post(self, request):
        e = FlashEntree(data=request.data)
        e.is_valid(raise_exception=True)
        r = e.validated_data["remisePourCent"]
        return Response(services.programmer_vente_flash(self.boutique, e.validated_data["id"], int(r) if r.is_integer() else r))


class ServicesVue(VueProprietaire):
    @extend_schema(tags=TAG_PLANS, summary="Services qui lèvent les freins (Services)")
    def get(self, request):
        return Response(services.services_de(self.boutique))


class ServiceEntree(serializers.Serializer):
    service = serializers.ChoiceField(choices=list(services.SERVICES_IDS))


class DemanderServiceVue(VueProprietaire):
    @extend_schema(tags=TAG_PLANS, summary="Demander un service : demande de paiement Mobile Money", request=ServiceEntree)
    @idempotent()
    def post(self, request):
        e = ServiceEntree(data=request.data)
        e.is_valid(raise_exception=True)
        return Response(services.demander_service(self.boutique, self.membre, e.validated_data["service"]))


class StatsVue(VueProprietaire):
    @extend_schema(tags=TAG_PLANS, summary="Chiffres des 30 derniers jours (Stats)")
    def get(self, request):
        periode = request.query_params.get("period", "30d")
        if periode != "30d":
            raise serializers.ValidationError({"period": ["30d seulement (3 et 12 mois : à venir avec Boost)."]})
        return Response(services.stats(self.boutique))


class DemandeVue(VueVendeur):
    @extend_schema(tags=TAG_PLANS, summary="Demande de la zone : recherches sans résultat, freins (Demande)")
    def get(self, request):
        return Response(services.demande(self.boutique, self.proprietaire))


# ── Promotions (AJ-A + vente flash au mérite : une seule notion, promotions.py) ─────────────────────────────

TAG_PROMOS = ["Espace vendeur · promotions"]


def _projet(request) -> dict:
    d = request.data if hasattr(request.data, "get") else {}
    return {k: d.get(k) for k in ("offreId", "type", "valeur", "debut", "fin")}


class PromotionsVue(VueProprietaire):
    @extend_schema(tags=TAG_PROMOS, summary="Ventes flash de la boutique (origine vendeur ou mérite), la plus récente d'abord")
    def get(self, request):
        return Response(promotions.liste(self.boutique))

    @extend_schema(tags=TAG_PROMOS, summary="Programmer une vente flash (refus : ferme, remise_min, garde_negatif, chevauche…)")
    @idempotent()
    def post(self, request):
        return Response(promotions.creer(self.boutique, _projet(request)))


class ReglesPromotionsVue(VueProprietaire):
    @extend_schema(tags=TAG_PROMOS, summary="Règles du registre (FF-FLASH, FLASH-REMISE-MIN, FLASH-DUREE-MAX, VD-VISIBILITE)")
    def get(self, request):
        return Response(promotions.regles(self.boutique))


class OffresPromouvablesVue(VueProprietaire):
    @extend_schema(tags=TAG_PROMOS, summary="Offres et prix de référence (le plus bas sur 30 jours) ; bloquée : rupture, état, promotion")
    def get(self, request):
        return Response(promotions.offres(self.boutique))


class ApercuPromotionVue(VueProprietaire):
    @extend_schema(tags=TAG_PROMOS, summary="Aperçu : prix remisé, ce que vous gardez (moteur de commission), refus éventuel")
    def post(self, request):
        return Response(promotions.apercu(self.boutique, _projet(request)))


class ArreterPromotionVue(VueProprietaire):
    @extend_schema(tags=TAG_PROMOS, summary="Arrêter une vente flash programmée ou en cours ; 404 si inconnue")
    def post(self, request, id):
        r = promotions.arreter(self.boutique, id)
        if r is None:
            raise introuvable("Vente flash introuvable.")
        return Response(r)
