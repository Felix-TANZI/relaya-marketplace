# backend/apps/cart/serializers.py
# Corps des requêtes du panier et du paiement (champs de site/src/api/routes.ts, openapi.yaml).
from rest_framework import serializers

MODES = ["relais", "domicile"]
MOYENS = ["mtn", "orange", "autre", "wallet", "carte", "apple", "google"]


class ModeSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=MODES)


class AjoutSerializer(serializers.Serializer):
    """POST /api/cart/lines : un produit, un favori, une ligne retirée à remettre, ou une offre flash."""

    produit = serializers.CharField(required=False)
    variante = serializers.CharField(required=False, allow_blank=True, default="")
    options = serializers.DictField(child=serializers.CharField(), required=False)
    qte = serializers.IntegerField(required=False, min_value=1, max_value=99, default=1)
    boutique = serializers.CharField(required=False, allow_blank=True)
    favori = serializers.CharField(required=False)
    ligne = serializers.CharField(required=False)
    position = serializers.IntegerField(required=False, min_value=0)
    flash = serializers.BooleanField(required=False, default=False)

    def validate(self, d):
        if not any(d.get(k) for k in ("produit", "favori", "ligne")):
            raise serializers.ValidationError("produit, favori ou ligne attendu.")
        return d


class ModifLigneSerializer(serializers.Serializer):
    qte = serializers.IntegerField(required=False, min_value=1, max_value=99)
    variante = serializers.CharField(required=False, allow_blank=True)
    nom = serializers.CharField(required=False)
    valeur = serializers.CharField(required=False)


class OffreSerializer(serializers.Serializer):
    boutique = serializers.CharField()


class PartageSerializer(serializers.Serializer):
    lignes = serializers.ListField(child=serializers.CharField(), required=False)


class PaiementPartageSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=16)
    prenom = serializers.CharField(max_length=60)
    email = serializers.EmailField()
    carte = serializers.CharField(max_length=200, help_text="jeton du prestataire (le numéro ne vient jamais au serveur)")
    devise = serializers.ChoiceField(choices=["EUR", "USD"])


class CommandeSerializer(serializers.Serializer):
    """POST /api/checkout : ce que le site a affiché ; le serveur recalcule et compare (CAL-11)."""

    mode = serializers.ChoiceField(choices=MODES)
    moyen = serializers.ChoiceField(choices=MOYENS)
    comptoir = serializers.BooleanField(default=False)
    numero = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    livraison = serializers.IntegerField(min_value=0)
    frais = serializers.IntegerField(min_value=0, default=0)
    prime = serializers.IntegerField(min_value=0, required=False, default=0)


class RelanceSerializer(serializers.Serializer):
    numero = serializers.CharField(required=False, allow_null=True, allow_blank=True)
