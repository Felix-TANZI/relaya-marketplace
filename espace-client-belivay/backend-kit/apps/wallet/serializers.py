# backend/apps/wallet/serializers.py
# Corps des requêtes (openapi.yaml, requestBody). Les réponses sont construites par services.py (types de source.ts).

from rest_framework import serializers


class MontantMoyen(serializers.Serializer):
    montant = serializers.IntegerField(min_value=1)
    moyen = serializers.CharField(max_length=80)


class Numero(serializers.Serializer):
    numero = serializers.CharField(max_length=30)


class Code(serializers.Serializer):
    code = serializers.CharField(max_length=12)


class ParDefaut(serializers.Serializer):
    par_defaut = serializers.BooleanField()


class NouvelleCarte(serializers.Serializer):
    jeton = serializers.CharField(max_length=255, help_text="jeton rendu par le champ sécurisé du prestataire (jamais le numéro)")
    titulaire = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
