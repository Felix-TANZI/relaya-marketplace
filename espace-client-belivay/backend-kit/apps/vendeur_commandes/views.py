# backend/apps/vendeur_commandes/views.py
# Routes des commandes du vendeur, sous /api/vendors/ (noms du paquet, api-vendeur.json : route_relaya), sans barre
# finale. Réponses : types de espace-vendeur/src/donnees/domaines/{commandes,preparation,remise}.ts. Un refus attendu
# par l'écran (Resultat) est un 200 { ok: false, raison } ; « T | null » introuvable = 404. Logique : services.py.
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response

from apps.client_core.erreurs import refus
from apps.client_core.idempotence import idempotent
from apps.client_core.temps import depuis_ms
from apps.vendeur_core.acces import VueVendeur

from . import services

TAG_COMMANDES = ["Espace vendeur · commandes"]
TAG_PREPARATION = ["Espace vendeur · preparation"]
TAG_REMISE = ["Espace vendeur · remise"]


# ── Commandes ─────────────────────────────────────────────────────────────────────────────────────────


class CommandesVue(VueVendeur):
    @extend_schema(tags=TAG_COMMANDES, summary="Commandes d'un filtre et compteurs de la même lecture (CMD-02)")
    def get(self, request):
        filtre = request.query_params.get("state", "prep")
        if filtre not in ("prep", "cours", "fin", "pb"):
            raise refus("invalid", "Filtre inconnu (prep, cours, fin, pb).")
        return Response(services.vue_commandes(self.boutique, self.proprietaire, filtre))


class CommandeVue(VueVendeur):
    @extend_schema(tags=TAG_COMMANDES, summary="Une commande (sans montant pour l'accès Préparation)")
    def get(self, request, ref):
        return Response(services.detail(self.boutique, self.proprietaire, ref))


class JournalVue(VueVendeur):
    @extend_schema(tags=TAG_COMMANDES, summary="Journal signé de la commande, du plus récent au plus ancien (JRN-02)")
    def get(self, request, ref):
        return Response(services.journal(self.boutique, ref))


# ── Préparation ───────────────────────────────────────────────────────────────────────────────────────


class PretEntree(serializers.Serializer):
    a = serializers.IntegerField(required=False, allow_null=True, help_text="heure d'origine (ms) d'une action hors connexion")


class PretVue(VueVendeur):
    @extend_schema(tags=TAG_PREPARATION, summary="« C'est prêt » (seule confirmation, PRE-01)", request=PretEntree)
    @idempotent(requise=False)
    def post(self, request, ref):
        e = PretEntree(data=request.data)
        e.is_valid(raise_exception=True)
        return Response(services.cest_pret(self.boutique, self.membre, ref, e.validated_data.get("a")))


class RuptureEntree(serializers.Serializer):
    stockAZero = serializers.BooleanField(required=False, default=False)  # noqa: N815 - nom du contrat


class RuptureVue(VueVendeur):
    @extend_schema(tags=TAG_PREPARATION, summary="Rupture : vendeur suivant, sinon remboursement (DP-01)", request=RuptureEntree)
    @idempotent(requise=False)
    def post(self, request, ref):
        e = RuptureEntree(data=request.data)
        e.is_valid(raise_exception=True)
        return Response(services.signaler_rupture(self.boutique, self.membre, ref, e.validated_data["stockAZero"]))


class DelaiEntree(serializers.Serializer):
    choix = serializers.ChoiceField(choices=["+1h", "+2h", "demain"])


class DelaiVue(VueVendeur):
    @extend_schema(tags=TAG_PREPARATION, summary="Plus de temps : les trois choix et leur effet sur le ramassage")
    def get(self, request, ref):
        return Response(services.sans_internes(services.options_delai(self.boutique, ref)))

    @extend_schema(tags=TAG_PREPARATION, summary="Plus de temps (une fois, jamais au-delà de l'échéance absolue)", request=DelaiEntree)
    def post(self, request, ref):
        e = DelaiEntree(data=request.data)
        e.is_valid(raise_exception=True)
        return Response(services.demander_delai(self.boutique, self.membre, ref, e.validated_data["choix"]))


class BonVue(VueVendeur):
    @extend_schema(tags=TAG_PREPARATION, summary="Bon de préparation (aucune donnée du client, jamais le code)")
    def get(self, request, ref):
        return Response(services.bon(self.boutique, self.proprietaire, ref))


class BonOuvertVue(VueVendeur):
    @extend_schema(
        tags=TAG_PREPARATION, summary="Bon ouvert : au journal une fois par membre et par jour", request=None, responses={204: None}
    )
    def post(self, request, ref):
        services.ouvrir_bon(self.boutique, self.membre, ref)
        return Response(status=204)


class CocheEntree(serializers.Serializer):
    i = serializers.IntegerField()
    fait = serializers.BooleanField()


class CocheVue(VueVendeur):
    @extend_schema(tags=TAG_PREPARATION, summary="Cocher une des quatre vérifications du bon", request=CocheEntree)
    def post(self, request, ref):
        e = CocheEntree(data=request.data)
        e.is_valid(raise_exception=True)
        return Response(
            services.cocher(self.boutique, self.membre, self.proprietaire, ref, e.validated_data["i"], e.validated_data["fait"])
        )


class ReferenceEntree(serializers.Serializer):
    lu = serializers.CharField(max_length=80, allow_blank=True)


class ReferenceVue(VueVendeur):
    @extend_schema(tags=TAG_PREPARATION, summary="Référence scannée ou tapée (SKU) : coche « bon modèle »", request=ReferenceEntree)
    def post(self, request, ref):
        e = ReferenceEntree(data=request.data)
        e.is_valid(raise_exception=True)
        return Response(services.verifier_reference(self.boutique, self.membre, self.proprietaire, ref, e.validated_data["lu"]))


# ── Remise ────────────────────────────────────────────────────────────────────────────────────────────


class RemiseVue(VueVendeur):
    @extend_schema(tags=TAG_REMISE, summary="Remise d'une commande (sans le code)")
    def get(self, request, ref):
        return Response(services.remise(self.boutique, self.proprietaire, ref))


class RemisesVue(VueVendeur):
    @extend_schema(tags=TAG_REMISE, summary="Remises : toutes, ou à remettre (?state=a_remettre)")
    def get(self, request):
        return Response(services.remises(self.boutique, self.proprietaire, request.query_params.get("state") == "a_remettre"))


class CodeVue(VueVendeur):
    @extend_schema(tags=TAG_REMISE, summary="Code de remise, au toucher seulement (journalisé : handover_code.viewed)")
    def get(self, request, ref):
        return Response(services.afficher_code(self.boutique, self.membre, ref))


class NouveauCodeVue(VueVendeur):
    @extend_schema(tags=TAG_REMISE, summary="Nouveau code après un blocage (annule l'ancien, DP-56)", request=None)
    @idempotent(requise=False)
    def post(self, request, ref):
        return Response(services.renouveler_code(self.boutique, self.membre, ref))


class RecuVue(VueVendeur):
    @extend_schema(tags=TAG_REMISE, summary="Reçu vendeur (propriétaire seulement)")
    def get(self, request, ref):
        return Response(services.recu(self.boutique, self.proprietaire, ref))


class RecusVue(VueVendeur):
    @extend_schema(tags=TAG_REMISE, summary="Tous les reçus, le plus récent d'abord (propriétaire seulement)")
    def get(self, request):
        return Response(services.recus(self.boutique, self.proprietaire))


class RamassagesVue(VueVendeur):
    @extend_schema(
        tags=TAG_REMISE, summary="Passages du livreur d'une période (?from=&to= en ms) : remises du créneau, de l'échéance ou de la remise"
    )
    def get(self, request):
        de, a = request.query_params.get("from"), request.query_params.get("to")
        bornes = (depuis_ms(int(de)), depuis_ms(int(a))) if str(de).isdigit() and str(a).isdigit() else (None, None)
        return Response(services.ramassages(self.boutique, self.proprietaire, *bornes))


class ColisNonPretVue(VueVendeur):
    @extend_schema(tags=TAG_REMISE, summary="Colis pas prêt au passage du livreur {raison} : ramassage au créneau suivant (P-6)")
    def post(self, request, ref):
        return Response(services.colis_non_pret(self.boutique, self.membre, ref, str(request.data.get("raison") or "")))
