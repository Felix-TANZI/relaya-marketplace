# backend/apps/otp/serializers.py
# Corps des routes /api/auth/otp/* et /api/auth/password/* (openapi.yaml, routes.json).

from rest_framework import serializers


class EnvoiSerializer(serializers.Serializer):
    purpose = serializers.CharField(max_length=30)
    destination = serializers.CharField(max_length=160, required=False, allow_blank=True)
    canal = serializers.ChoiceField(choices=["sms", "whatsapp", "email"], required=False, default="sms")


class VerificationSerializer(serializers.Serializer):
    numero = serializers.CharField(max_length=30, required=False, allow_blank=True)
    destination = serializers.CharField(max_length=160, required=False, allow_blank=True, help_text="purpose diaspora : numéro ou e-mail")
    code = serializers.CharField(max_length=12)
    purpose = serializers.CharField(max_length=30, required=False, allow_blank=True)


class OubliSerializer(serializers.Serializer):
    # DEV-SRV-01 T07-5 : l'e-mail, ou le numéro de téléphone (comptes sans e-mail : vendeurs, relais, livreurs).
    email = serializers.EmailField(required=False)
    identifiant = serializers.CharField(required=False, max_length=120)

    def validate(self, data):
        valeur = (data.get("identifiant") or data.get("email") or "").strip()
        if not valeur:
            raise serializers.ValidationError({"identifiant": "Indique ton e-mail ou ton numéro."})
        data["identifiant"] = valeur
        return data


class NouveauMotDePasseSerializer(serializers.Serializer):
    jeton = serializers.CharField(max_length=200)
    mot_de_passe = serializers.CharField(max_length=128, trim_whitespace=False)
