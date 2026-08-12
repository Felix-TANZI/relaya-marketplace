# backend/apps/payments/escrow/__init__.py
# Sequestres multi-acteurs.
#
# Cle a QUATRE dimensions : (paiement x commande? x beneficiaire x composant).
# C'est elle qui permet de geler un colis sans geler les autres, et de payer
# un transporteur pendant qu'un vendeur est en litige.