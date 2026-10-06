# backend/apps/client_accounts/serializers.py
# Corps des routes /api/me/* du compte (openapi.yaml, routes.json).

from rest_framework import serializers


class CodeSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=12)


class ProfilSerializer(CodeSerializer):
    prenom = serializers.CharField(max_length=40)
    nom = serializers.CharField(max_length=60, allow_blank=True)
    photo = serializers.CharField(allow_blank=True, allow_null=True, required=False)


class EmailSerializer(serializers.Serializer):
    email = serializers.EmailField()


class EmailCodeSerializer(EmailSerializer, CodeSerializer):
    pass


class NumeroSerializer(serializers.Serializer):
    numero = serializers.RegexField(r"^[\d\s+().-]{8,20}$", max_length=20)


class NumeroCodeSerializer(NumeroSerializer, CodeSerializer):
    pass


class SecuriteSerializer(serializers.Serializer):
    alerte_connexion = serializers.BooleanField()


class IdentiteSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=["google", "apple"])
    jeton = serializers.CharField(max_length=8000)


class ConfidentialiteSerializer(serializers.Serializer):
    personnalisation = serializers.BooleanField(required=False)
    nom_retrait = serializers.CharField(max_length=60, required=False, allow_blank=True, allow_null=True)


class CoordsSerializer(serializers.Serializer):
    lat = serializers.DecimalField(max_digits=9, decimal_places=6, min_value=-90, max_value=90, coerce_to_string=False)
    lon = serializers.DecimalField(max_digits=9, decimal_places=6, min_value=-180, max_value=180, coerce_to_string=False)
    precision = serializers.DecimalField(max_digits=9, decimal_places=1, min_value=0, required=False, default=0, coerce_to_string=False)

    def to_internal_value(self, data):
        # Le GPS du téléphone donne souvent plus de 6 décimales : arrondi au micro-degré (≈ 11 cm).
        if isinstance(data, dict):
            data = {k: (round(float(v), 6) if k in ("lat", "lon") and isinstance(v, int | float) else v) for k, v in data.items()}
            if isinstance(data.get("precision"), float):
                data["precision"] = round(data["precision"], 1)
        return super().to_internal_value(data)


class NouvelleAdresseSerializer(serializers.Serializer):
    id = serializers.CharField(required=False, allow_blank=True)
    nom = serializers.CharField(max_length=60)
    quartier = serializers.CharField(max_length=120)
    reperes = serializers.CharField(max_length=300)
    position = serializers.BooleanField(default=False)
    coords = CoordsSerializer(required=False, allow_null=True)
    instructions = serializers.CharField(max_length=300, required=False, allow_blank=True)
    destinataire = serializers.CharField(max_length=80, required=False, allow_blank=True)
    creneau = serializers.ChoiceField(choices=["matin", "apres-midi", "soir"], required=False, allow_null=True)
    photo = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class EnveloppeAdresseSerializer(serializers.Serializer):
    a = NouvelleAdresseSerializer()


class RelaisSerializer(serializers.Serializer):
    relais = serializers.CharField(max_length=160)


class InteretsSerializer(serializers.Serializer):
    univers = serializers.ListField(child=serializers.CharField(max_length=60), max_length=50)


class AccepterSerializer(serializers.Serializer):
    doc = serializers.CharField(max_length=40)
    version = serializers.CharField(max_length=20)


class BoutiqueSerializer(serializers.Serializer):
    nom = serializers.CharField(max_length=120, allow_blank=True)
    categorie = serializers.CharField(max_length=60)
    type = serializers.ChoiceField(choices=["particulier", "entreprise"])


class BusinessSerializer(serializers.Serializer):
    piece = serializers.CharField(max_length=2000)


class DeviseSerializer(serializers.Serializer):
    devise = serializers.ChoiceField(choices=["XAF", "EUR", "USD"])


class AlertesSerializer(serializers.Serializer):
    prix = serializers.BooleanField(required=False)
    stock = serializers.BooleanField(required=False)


class AlerteFavoriSerializer(serializers.Serializer):
    alertes = AlertesSerializer()
