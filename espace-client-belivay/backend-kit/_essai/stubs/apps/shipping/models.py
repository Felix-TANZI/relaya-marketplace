# Bouchon de relaya-marketplace (apps/shipping/models.py, commit 9546ffe) : seuls les champs lus par le kit,
# avec leurs vrais noms. Sert uniquement au projet d'essai.
from django.db import models


class Zone(models.Model):
    name = models.CharField(max_length=120, unique=True)
    city = models.CharField(max_length=80)
    is_active = models.BooleanField(default=True)
