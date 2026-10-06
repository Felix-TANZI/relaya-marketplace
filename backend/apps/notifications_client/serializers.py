# backend/apps/notifications_client/serializers.py
from rest_framework import serializers


class CalmeSerializer(serializers.Serializer):
    actif = serializers.BooleanField()
    debut = serializers.IntegerField(min_value=0, max_value=23)
    fin = serializers.IntegerField(min_value=0, max_value=23)


class ReglageSerializer(serializers.Serializer):
    """Une seule des formes : {cle, actif} | {canal} | {calme} | {flash}."""

    cle = serializers.CharField(max_length=20, required=False)
    actif = serializers.BooleanField(required=False)
    canal = serializers.ChoiceField(choices=["sms", "whatsapp"], required=False)
    calme = CalmeSerializer(required=False)
    flash = serializers.BooleanField(required=False)

    def validate(self, data):
        formes = [("cle" in data), ("canal" in data), ("calme" in data), ("flash" in data)]
        if sum(formes) != 1:
            raise serializers.ValidationError("Un seul réglage à la fois : cle, canal, calme ou flash.")
        if "cle" in data and "actif" not in data:
            raise serializers.ValidationError({"actif": "Requis avec cle."})
        return data


class ConsentementSerializer(serializers.Serializer):
    canal = serializers.ChoiceField(choices=["sms", "whatsapp"])


class CleSerializer(serializers.Serializer):
    p256dh = serializers.CharField(max_length=255)
    auth = serializers.CharField(max_length=255)


class AbonnementSerializer(serializers.Serializer):
    endpoint = serializers.CharField(max_length=4000)
    expirationTime = serializers.IntegerField(required=False, allow_null=True)
    keys = CleSerializer(required=False)


class AppareilSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=["webpush", "fcm"])
    abonnement = AbonnementSerializer()

    def validate(self, data):
        if data["type"] == "webpush" and "keys" not in data["abonnement"]:
            raise serializers.ValidationError({"abonnement": "Les clés p256dh et auth sont requises pour Web Push."})
        return data
