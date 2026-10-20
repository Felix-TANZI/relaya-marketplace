# backend/apps/subscriptions/serializers.py
# Corps des requêtes (openapi.yaml, requestBody). Les réponses sont construites par services.py (types de source.ts).

from rest_framework import serializers


class Souscription(serializers.Serializer):
    palier = serializers.CharField(max_length=10)
    formule = serializers.CharField(max_length=5)
    moyen = serializers.CharField(max_length=80, help_text="« compte », « m12 », « c3 » ou le libellé affiché")


class Moyen(serializers.Serializer):
    moyen = serializers.CharField(max_length=80)


class Cadeau(serializers.Serializer):
    numero = serializers.CharField(max_length=30)
    prenom = serializers.CharField(max_length=80)
    palier = serializers.CharField(max_length=10)
    mois = serializers.IntegerField()
    message = serializers.CharField(max_length=300, allow_blank=True)
    carte = serializers.CharField(max_length=255, help_text="carte enregistrée (« c3 ») ou jeton du champ sécurisé du prestataire")
