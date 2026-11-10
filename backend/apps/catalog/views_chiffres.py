# backend/apps/catalog/views_chiffres.py
# DEV-SRV-01, T09 : « aucun écran réel n'affiche de donnée d'exemple ». L'accueil client affichait « 15 240 produits,
# 3 200 vendeurs, 50K+ clients, 4,8/5 » écrits dans le code. Ces chiffres-ci sont comptés dans la base réelle :
#   produits  = ceux que la vitrine montre (même filtre que ProductViewSet : validés, hors catégories masquées) ;
#   boutiques = les boutiques approuvées.
# Rien sur les clients ni la satisfaction : ce ne sont pas des chiffres à publier tant qu'ils n'ont pas de source.

from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@extend_schema(
    tags=["Catalog"], summary="Public figures for the home page (counted in the database)",
    operation_id="catalogue_chiffres_publics",
    responses=inline_serializer("ChiffresPublics", {"produits": serializers.IntegerField(),
                                                    "boutiques": serializers.IntegerField()}),
)
@api_view(["GET"])
@permission_classes([AllowAny])
def chiffres_publics(request):
    from apps.vendors.models import VendorProfile

    from .models import Category, ModerationStatus, Product

    produits = (Product.objects.filter(moderation_status=ModerationStatus.APPROVED)
                .exclude(category_id__in=Category.hidden_subtree_ids()).count())
    boutiques = VendorProfile.objects.filter(status=VendorProfile.Status.APPROVED).count()
    return Response({"produits": produits, "boutiques": boutiques})
