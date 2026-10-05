# backend/apps/aftersales/signaux.py
# Signaux de l'après-vente, pour les applications qui font bouger l'argent ou préviennent les vendeurs. Le kit ne paie
# rien lui-même : l'escrow, le portefeuille et les prestataires (payments de relaya, apps.wallet) s'y branchent.
#
#   litige_ouvert(litige)                         prévenir le vendeur (LIT-VENDEUR-H), suspendre libération et garde
#   litige_rembourse(litige, montant, motif)      rendre `montant` au client (REMB-DESTINATION), payé par BelivaY
#                                                 si remboursement automatique (CCY-23)
#   autre_vendeur_accepte(remplacement)           commander l'article chez l'autre vendeur, écart payé par BelivaY

from django.dispatch import Signal

litige_ouvert = Signal()
litige_rembourse = Signal()
autre_vendeur_accepte = Signal()
