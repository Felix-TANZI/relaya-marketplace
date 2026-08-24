# backend/relaya/celery.py
# Point d'entree Celery : execute en arriere-plan les taches lentes
# (envoi d'emails, etc.) pour ne pas bloquer le cycle requete/reponse.

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "relaya.settings.dev")

app = Celery("relaya")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
