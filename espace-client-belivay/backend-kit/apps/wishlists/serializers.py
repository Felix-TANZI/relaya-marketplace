# backend/apps/wishlists/serializers.py
# Corps des requêtes (openapi.yaml, requestBody) : noms de champs du contrat.

from rest_framework import serializers

PAIE_FRAIS = ("payeur", "destinataire")


OCCASIONS = ("anniversaire", "mariage", "dot", "naissance", "baby-shower", "cremaillere", "diplome", "fete", "rentree", "autre")


class CagnotteListe(serializers.Serializer):
    titre = serializers.CharField(max_length=80)
    objectif = serializers.IntegerField(min_value=1_000)


class CreerListe(serializers.Serializer):
    nom = serializers.CharField(max_length=120)
    mode = serializers.ChoiceField(choices=("fil", "groupe"))
    remiseLe = serializers.IntegerField(allow_null=True, required=False)
    surprise = serializers.BooleanField(default=False)
    occasion = serializers.ChoiceField(choices=OCCASIONS, required=False, allow_null=True)
    hotes = serializers.ListField(child=serializers.CharField(max_length=80), required=False, max_length=6)
    cagnotte = CagnotteListe(required=False, allow_null=True)


class ParticiperCagnotte(serializers.Serializer):
    prenom = serializers.CharField(max_length=80)
    montant = serializers.IntegerField(min_value=1)
    moyen = serializers.CharField(max_length=120)
    jeton = serializers.CharField(max_length=200, required=False, allow_blank=True, help_text="jeton du prestataire (carte)")
    mot = serializers.CharField(max_length=200, allow_blank=True, default="")
    discret = serializers.BooleanField(default=False)


class Tiers(serializers.Serializer):
    prenom = serializers.CharField(max_length=80)
    relais = serializers.CharField(max_length=160)


class ReglerListe(serializers.Serializer):
    destination = serializers.ChoiceField(choices=("moi", "offrant", "tiers"), required=False)
    tiers = Tiers(required=False, allow_null=True)
    surprise = serializers.BooleanField(required=False)
    domicile = serializers.BooleanField(required=False)


class Produit(serializers.Serializer):
    produit = serializers.CharField(max_length=40)


class Canal(serializers.Serializer):
    canal = serializers.ChoiceField(choices=("partage", "image", "whatsapp", "sms", "lien", "texte"))


class CarteCadeau(serializers.Serializer):
    bin = serializers.CharField(max_length=8, required=False, allow_blank=True)
    pays_carte = serializers.CharField(max_length=60, required=False, allow_blank=True)
    pays = serializers.CharField(max_length=60)
    code_email = serializers.CharField(max_length=12, required=False, allow_blank=True)


class Offrir(serializers.Serializer):
    produit = serializers.CharField(max_length=40)
    prenom = serializers.CharField(max_length=80)
    email = serializers.EmailField()
    moyen = serializers.CharField(max_length=120)
    jeton = serializers.CharField(max_length=200, required=False, allow_blank=True, help_text="jeton du prestataire (carte)")
    prix_vu = serializers.IntegerField(min_value=0)
    qui = serializers.ChoiceField(choices=PAIE_FRAIS, default="payeur")
    livraison = serializers.ChoiceField(choices=("relais", "domicile"), default="relais")
    devise = serializers.ChoiceField(choices=("XAF", "EUR", "USD"), required=False, allow_null=True)
    carte = CarteCadeau(required=False, allow_null=True)


class Email(serializers.Serializer):
    email = serializers.EmailField()


class Numero(serializers.Serializer):
    numero = serializers.CharField(max_length=30)


class EnvoyerAuxProches(serializers.Serializer):
    type = serializers.ChoiceField(choices=("liste", "cotisation"))
    id = serializers.CharField(max_length=40)
    proches = serializers.ListField(child=serializers.CharField(max_length=40), max_length=50)

    def to_internal_value(self, data):
        if hasattr(data, "get") and "proches" not in data and "proches[]" in data:
            data = {**data, "proches": data.getlist("proches[]") if hasattr(data, "getlist") else data["proches[]"]}
        return super().to_internal_value(data)


class Suivre(serializers.Serializer):
    suivre = serializers.BooleanField()
    rappel = serializers.IntegerField(allow_null=True, required=False)


class Merci(serializers.Serializer):
    ref = serializers.CharField(max_length=40)
    texte = serializers.CharField(max_length=500)


class Reponse(serializers.Serializer):
    accepte = serializers.BooleanField()


class EnvoyerPanier(serializers.Serializer):
    prenom = serializers.CharField(max_length=80)
    proche = serializers.CharField(max_length=40, required=False, allow_null=True, allow_blank=True)
    relais = serializers.CharField(max_length=160)
    qui_paie_livraison = serializers.ChoiceField(choices=PAIE_FRAIS)
    moyen = serializers.CharField(max_length=40)
    mot = serializers.CharField(max_length=200, allow_blank=True, default="")
