# backend/apps/wallet/admin.py
# Lecture pour le support ; les numéros et jetons restent chiffrés (seules les formes masquées s'affichent).

from django.contrib import admin

from .models import CarteEnregistree, EtatPortefeuille, Mouvement, MoyenPaiement, Recharge, Retrait


@admin.register(MoyenPaiement)
class MoyenPaiementAdmin(admin.ModelAdmin):
    list_display = ("client", "operateur", "numero_masque", "verifie_le", "par_defaut")
    exclude = ("numero_chiffre",)


@admin.register(CarteEnregistree)
class CarteEnregistreeAdmin(admin.ModelAdmin):
    list_display = ("client", "marque", "derniers", "expire", "par_defaut")
    exclude = ("jeton_chiffre",)


@admin.register(EtatPortefeuille)
class EtatPortefeuilleAdmin(admin.ModelAdmin):
    list_display = ("client", "rembourse", "modifie_le")


@admin.register(Recharge)
class RechargeAdmin(admin.ModelAdmin):
    list_display = ("reference", "client", "montant", "restant", "etat", "confirmee_le")
    list_filter = ("etat",)
    exclude = ("numero_chiffre",)


@admin.register(Retrait)
class RetraitAdmin(admin.ModelAdmin):
    list_display = ("reference", "client", "montant", "frais", "etat", "le")
    list_filter = ("etat",)
    exclude = ("numero_chiffre",)


@admin.register(Mouvement)
class MouvementAdmin(admin.ModelAdmin):
    list_display = ("client", "type", "montant", "libelle", "le")
    list_filter = ("type",)
