# backend/apps/payments/webhooks/__init__.py
# Reception des webhooks prestataires.
#
# RAPPEL : un webhook est un SIGNAL, pas une donnee. La signature CamPay ne
# lie pas le contenu a la transaction — c'est la re-interrogation qui
# authentifie (principe P6).