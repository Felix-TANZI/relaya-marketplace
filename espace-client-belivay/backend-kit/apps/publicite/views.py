# backend/apps/publicite/views.py
# Publicité (DP-59). Vendeur, sous /api/vendors/ads/… (propriétaire seulement : argent, 403 owner_only pour l'accès
# Préparation) ; client, sous /api/sponsored/… (publiques : annonces à mêler aux résultats, emplacements de
# l'accueil, clic). Le chemin /api/sponsored (et non /api/ads) évite les listes des bloqueurs de publicité, qui
# casseraient la recherche. Logique : services.py.
from datetime import date

from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response

from apps.client_core.erreurs import introuvable
from apps.client_core.idempotence import idempotent
from apps.client_core.vues import VuePublique
from apps.vendeur_core.acces import VueProprietaire

from . import espace, services

TAG_V = ["Espace vendeur · publicité"]
TAG_C = ["Annonces sponsorisées"]
EMPLACEMENTS = ["a_la_une", "carrousel"]


def _lire(classe, request):
    e = classe(data=request.data)
    e.is_valid(raise_exception=True)
    return e.validated_data


# ── Vendeur ───────────────────────────────────────────────────────────────────────────────────────────


class ApercuVue(VueProprietaire):
    @extend_schema(tags=TAG_V, summary="Solde, recharges en attente, campagnes et statistiques, offres annonçables, tarifs")
    def get(self, request):
        return Response(services.apercu(self.boutique))


class RechargeEntree(serializers.Serializer):
    montant = serializers.IntegerField(min_value=1)


class RechargerVue(VueProprietaire):
    @extend_schema(
        tags=TAG_V, summary="Recharger le solde publicitaire : demande Mobile Money (créditée à la confirmation)", request=RechargeEntree
    )
    @idempotent()
    def post(self, request):
        return Response(services.recharger(self.boutique, _lire(RechargeEntree, request)["montant"]))


class ClicEntree(serializers.Serializer):
    offre = serializers.CharField(max_length=20)
    enchere = serializers.IntegerField(min_value=0)
    budgetQuotidien = serializers.IntegerField(min_value=0)  # noqa: N815


class CampagnesVue(VueProprietaire):
    @extend_schema(tags=TAG_V, summary="Mes campagnes, vues par l'espace vendeur (Campagne[] : état, coût du clic, heures, statistiques)")
    def get(self, request):
        return Response(espace.campagnes(self.boutique))

    @extend_schema(tags=TAG_V, summary="Produit sponsorisé : enchère au clic (prix plancher) et budget du jour", request=ClicEntree)
    @idempotent()
    def post(self, request):
        v = _lire(ClicEntree, request)
        return Response(services.creer_clic(self.boutique, v["offre"], v["enchere"], v["budgetQuotidien"]))


class CampagneVue(VueProprietaire):
    @extend_schema(tags=TAG_V, summary="Une campagne et ses statistiques (impressions, clics, clics facturés, ventes, dépense)")
    def get(self, request, id):
        return Response(services.campagne_json(services.campagne(self.boutique, id)))


class PauseEntree(serializers.Serializer):
    pause = serializers.BooleanField()


class PauseVue(VueProprietaire):
    @extend_schema(tags=TAG_V, summary="Mettre en pause ou relancer une campagne au clic", request=PauseEntree)
    def post(self, request, id):
        return Response(services.mettre_en_pause(self.boutique, id, _lire(PauseEntree, request)["pause"]))


class ArreterVue(VueProprietaire):
    @extend_schema(tags=TAG_V, summary="Arrêter une campagne : heures non diffusées rendues au solde")
    @idempotent()
    def post(self, request, id):
        return Response(services.arreter(self.boutique, id))


class EmplacementsVue(VueProprietaire):
    @extend_schema(tags=TAG_V, summary="Places d'une semaine (?emplacement=a_la_une|carrousel&semaine=AAAA-MM-JJ)")
    def get(self, request):
        emplacement = request.query_params.get("emplacement") or "a_la_une"
        if emplacement not in EMPLACEMENTS:
            raise serializers.ValidationError({"emplacement": EMPLACEMENTS})
        try:
            semaine = date.fromisoformat(request.query_params.get("semaine") or "")
        except ValueError:
            semaine = services.horloge.maintenant().astimezone(services.YAOUNDE).date()
        return Response(services.emplacements(emplacement, semaine))


class ReserverEntree(serializers.Serializer):
    emplacement = serializers.ChoiceField(choices=EMPLACEMENTS)
    offre = serializers.CharField(max_length=20)
    mode = serializers.ChoiceField(choices=["fixe", "enchere"])
    semaine = serializers.DateField()
    enchere = serializers.IntegerField(min_value=0, required=False, allow_null=True, default=None)
    titre = serializers.CharField(max_length=80, required=False, allow_blank=True, default="")
    sousTitre = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")  # noqa: N815


class ReserverVue(VueProprietaire):
    @extend_schema(
        tags=TAG_V,
        summary="Réserver une place À la une ou du carrousel : tarif fixe (débité) ou enchère de la semaine",
        request=ReserverEntree,
    )
    @idempotent()
    def post(self, request):
        v = _lire(ReserverEntree, request)
        return Response(
            services.reserver_emplacement(
                self.boutique, v["emplacement"], v["offre"], v["mode"], v["semaine"], v["enchere"], v["titre"], v["sousTitre"]
            )
        )


class BoostEntree(serializers.Serializer):
    offre = serializers.CharField(max_length=20)
    duree = serializers.ChoiceField(choices=["24h", "7j"])


class BoostVue(VueProprietaire):
    @extend_schema(tags=TAG_V, summary="Boost 24 h ou 7 jours : forfait débité du solde", request=BoostEntree)
    @idempotent()
    def post(self, request):
        v = _lire(BoostEntree, request)
        return Response(services.booster(self.boutique, v["offre"], v["duree"]))


class FlashEntree(serializers.Serializer):
    offre = serializers.CharField(max_length=20)
    prixFlash = serializers.IntegerField(min_value=1)  # noqa: N815
    debut = serializers.IntegerField(min_value=0, help_text="ms depuis 1970")
    fin = serializers.IntegerField(min_value=0)
    stock = serializers.IntegerField(min_value=1)


class FlashVue(VueProprietaire):
    @extend_schema(
        tags=TAG_V,
        summary="Proposer une offre à la sélection flash (remise minimale, commission majorée pendant la vente)",
        request=FlashEntree,
    )
    @idempotent()
    def post(self, request):
        from datetime import UTC, datetime

        v = _lire(FlashEntree, request)
        debut, fin = (datetime.fromtimestamp(v[k] / 1000, tz=UTC) for k in ("debut", "fin"))
        return Response(services.proposer_flash(self.boutique, v["offre"], v["prixFlash"], debut, fin, v["stock"]), status=201)


class FactureVue(VueProprietaire):
    @extend_schema(tags=TAG_V, summary="Facture publicitaire d'un mois (AAAA-MM)")
    def get(self, request, mois):
        return Response(services.facture(self.boutique, mois))


# ── Espace vendeur (AJ-P) : types de espace-vendeur/src/donnees/domaines/publicite.ts, refus en { ok: false, raison } ──


class TableauVue(VueProprietaire):
    @extend_schema(tags=TAG_V, summary="Tableau de bord : solde, dépenses du jour et de la semaine, statistiques, sélections flash, règles")
    def get(self, request):
        return Response(espace.tableau(self.boutique))


class ProduitsVue(VueProprietaire):
    @extend_schema(tags=TAG_V, summary="Offres annonçables et raisons d'inéligibilité (pas_en_vente, rupture, score, litige)")
    def get(self, request):
        return Response(espace.produits(self.boutique))


class MouvementsVue(VueProprietaire):
    @extend_schema(tags=TAG_V, summary="Mouvements du solde publicitaire (recharges, dépenses, heures rendues) et facture du mois")
    def get(self, request):
        return Response(espace.mouvements(self.boutique))


class DemandeEntree(serializers.Serializer):
    emplacement = serializers.ChoiceField(choices=espace.EMPLACEMENTS)
    offreId = serializers.CharField(max_length=20)  # noqa: N815
    enchere = serializers.IntegerField(min_value=0, required=False)
    budgetJour = serializers.IntegerField(min_value=0, required=False)  # noqa: N815
    mode = serializers.ChoiceField(choices=["fixe", "enchere"], required=False)
    semaines = serializers.IntegerField(min_value=0, required=False)
    debut = serializers.IntegerField(min_value=0, required=False, help_text="ms depuis 1970")
    remisePourCent = serializers.IntegerField(min_value=0, max_value=99, required=False)  # noqa: N815


class EstimerVue(VueProprietaire):
    @extend_schema(
        tags=TAG_V,
        summary="Estimation d'une campagne (même calcul que la confirmation) : refus, à payer, places, vente flash",
        request=DemandeEntree,
    )
    def post(self, request):
        return Response(espace.estimer(self.boutique, _lire(DemandeEntree, request)))


class CreerVue(VueProprietaire):
    @extend_schema(
        tags=TAG_V,
        summary="Créer une campagne (sponsorisé, À la une ou carrousel au tarif fixe ou à l'enchère hebdomadaire, Boost, candidature flash)",
        request=DemandeEntree,
    )
    @idempotent()
    def post(self, request):
        return Response(espace.creer(self.boutique, _lire(DemandeEntree, request)))


class ReprendreVue(VueProprietaire):
    @extend_schema(tags=TAG_V, summary="Relancer une campagne au clic en pause (seuil de qualité, solde)")
    def post(self, request, id):
        return Response(espace.reprendre(self.boutique, id))


class EnchereEntree(serializers.Serializer):
    enchere = serializers.IntegerField(min_value=0)
    budgetJour = serializers.IntegerField(min_value=0)  # noqa: N815


class EnchereVue(VueProprietaire):
    @extend_schema(tags=TAG_V, summary="Changer l'enchère au clic et le budget du jour", request=EnchereEntree)
    def post(self, request, id):
        v = _lire(EnchereEntree, request)
        return Response(espace.changer_enchere(self.boutique, id, v["enchere"], v["budgetJour"]))


class RechargeVue(VueProprietaire):
    @extend_schema(tags=TAG_V, summary="Une demande de recharge (en_attente, confirme, refuse)")
    def get(self, request, id):
        mv = espace.recharge(self.boutique, id)
        if mv is None:
            raise introuvable("Recharge introuvable.")
        return Response(espace.recharge_vue(mv))

    @extend_schema(tags=TAG_V, summary="Abandonner une demande de recharge en attente (rien n'a été crédité)", responses={204: None})
    def delete(self, request, id):
        espace.annuler_recharge(self.boutique, id)
        return Response(status=204)


# ── Client ────────────────────────────────────────────────────────────────────────────────────────────


class PlacementsVue(VuePublique):
    @extend_schema(
        tags=TAG_C, summary="Annonces sponsorisées à mêler aux résultats (?ou=recherche|categorie&q=&cat=), Boosts, règles de densité"
    )
    def get(self, request):
        ou = request.query_params.get("ou") or "recherche"
        if ou not in ("recherche", "categorie"):
            raise serializers.ValidationError({"ou": ["recherche | categorie"]})
        return Response(services.placements(ou, request.query_params.get("q") or None, request.query_params.get("cat") or None))


class AccueilVue(VuePublique):
    @extend_schema(tags=TAG_C, summary="Emplacements achetés de l'accueil (À la une, carrousel) et sélection flash en cours")
    def get(self, request):
        return Response(services.accueil())


class ClicEntreeClient(serializers.Serializer):
    annonce = serializers.CharField(max_length=400)


class CliquerVue(VuePublique):
    @extend_schema(
        tags=TAG_C,
        summary="Clic sur une annonce : facturé une fois par client et par jour",
        request=ClicEntreeClient,
        responses={204: None},
    )
    def post(self, request):
        services.limiter(request, "clic")
        services.cliquer(request, _lire(ClicEntreeClient, request)["annonce"])
        return Response(status=204)


class VuEntree(serializers.Serializer):
    annonce = serializers.CharField(max_length=400)
    emplacement = serializers.ChoiceField(choices=services.EMPLACEMENTS_VUS)
    visite = serializers.CharField(max_length=64)


class VoirVue(VuePublique):
    @extend_schema(
        tags=TAG_C,
        summary="Impression d'une annonce montrée à l'écran : une par client, campagne, emplacement et visite",
        request=VuEntree,
        responses={204: None},
    )
    def post(self, request):
        services.limiter(request, "vu")
        v = _lire(VuEntree, request)
        services.voir(request, v["annonce"], v["emplacement"], v["visite"])
        return Response(status=204)


class SignalerEntree(serializers.Serializer):
    annonce = serializers.CharField(max_length=400)
    motif = serializers.ChoiceField(choices=[m.value for m in services.Signalement.Motif])


class SignalerVue(VuePublique):
    @extend_schema(tags=TAG_C, summary="Signaler une annonce (relue par la console)", request=SignalerEntree, responses={204: None})
    def post(self, request):
        services.limiter(request, "signal")
        v = _lire(SignalerEntree, request)
        services.signaler(request, v["annonce"], v["motif"])
        return Response(status=204)
