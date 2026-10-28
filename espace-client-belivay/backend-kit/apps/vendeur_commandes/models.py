# backend/apps/vendeur_commandes/models.py
# Ce que les commandes du vendeur ajoutent au socle (apps.vendeur_core.models.CommandeVendeur) :
#
#   BasculeColis   — vendeur suivant d'un colis après une rupture (DP-01, VD05-R12) : les boutiques déjà sollicitées
#                    (noms tels que le moteur catalogue.vendeur_suivant les compare) et le nombre de tentatives.
#   CommandeCedee  — commande d'une boutique annulée pour rupture et confiée à une autre : le socle n'admet qu'une
#                    CommandeVendeur par colis (order_id, n) et par référence ; la commande cédée garde donc un numéro
#                    de colis et une référence techniques, et la référence d'origine (« BLV-52018 ») est rendue au
#                    vendeur ici (il la voit dans « Terminées », motif « rupture », Q-73).
# ANONYMAT : ni le client, ni la boutique qui reprend le colis ne sont montrés au vendeur qui l'a cédé.
from django.db import models

from apps.vendeur_core.models import CommandeVendeur


class BasculeColis(models.Model):
    order_id = models.PositiveBigIntegerField()
    n = models.PositiveSmallIntegerField()
    essayes = models.JSONField(default=list, help_text="boutiques déjà sollicitées pour ce colis (noms du moteur)")
    tentatives = models.PositiveSmallIntegerField(default=0, help_text="bascules faites (RUPTURE-TENTATIVES au plus)")
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["order_id", "n"], name="vendeur_commandes_une_bascule_par_colis")]
        verbose_name = "Vendeur suivant (rupture)"
        verbose_name_plural = "Vendeurs suivants (ruptures)"

    def __str__(self):
        return f"{self.order_id}-{self.n} · {self.tentatives} tentative(s)"


class CommandeCedee(models.Model):
    commande = models.OneToOneField(CommandeVendeur, on_delete=models.CASCADE, related_name="cedee")
    ref = models.CharField(max_length=30, help_text="référence d'origine, montrée au vendeur")
    n = models.PositiveSmallIntegerField(help_text="numéro du colis d'origine")
    a = models.DateTimeField()

    class Meta:
        verbose_name = "Commande cédée (rupture)"
        verbose_name_plural = "Commandes cédées (ruptures)"

    def __str__(self):
        return self.ref
