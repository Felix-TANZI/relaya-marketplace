# backend/apps/regles/models.py
# Les réglages r_… et les tables t_… de la spécification v2.1, en base pour que l'admin les modifie
# (LISEZMOI : « aucune valeur en dur : lire chaque r_… dans les réglages de l'admin »).
#
#   Reglage       un r_… : sa valeur (nombre, ou date pour r_date_ouverture_achats), son unité et sa valeur exacte
#                 (fraction, meta.lecture : les taux sont convertis en fractions avant tout calcul).
#   TableReglee   une t_… : ses lignes, de la même forme que dans BV-DEV-07.
#
# Les 157 réglages et 23 tables sont créés par la migration 0002 avec les valeurs de lancement ; on ne les crée ni ne
# les supprime ensuite, on change leur valeur. Chaque changement écrit une ligne dans le journal d'audit (AuditLog) :
# qui, quand, avant, après.

import datetime
from fractions import Fraction

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db import models, transaction

from .reference import donnees_reference

# Tables dont les clés sont des données (un quartier et ses autres noms), et non des colonnes fixes.
TABLES_A_CLES_LIBRES = {"t_alias"}


def _est_nombre(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def valeur_exacte(v) -> str:
    """« exact » d'un réglage : la fraction écrite dans BV-DEV-07 (0.02 → « 1/50 »), vide pour un entier ou une date."""
    if isinstance(v, float):
        return str(Fraction(str(v)))
    return ""


def verifier_valeur(nom: str, unite: str, valeur):
    """Forme attendue d'un réglage d'après sa valeur de lancement et son unité (meta.lecture de BV-DEV-07)."""
    if unite == "date":
        if valeur is None:  # null : achats non ouverts
            return
        try:
            datetime.date.fromisoformat(valeur)
        except (TypeError, ValueError):
            raise ValidationError(f"{nom} : une date AAAA-MM-JJ, ou null.")
        return
    if not _est_nombre(valeur):
        raise ValidationError(f"{nom} : un nombre est attendu ({unite}).")
    if unite == "bool" and valeur not in (0, 1):
        raise ValidationError(f"{nom} : 1 (vrai) ou 0 (faux).")
    if unite == "F" and not isinstance(valeur, int):
        raise ValidationError(f"{nom} : un montant en francs entiers.")
    if unite == "part" and not 0 <= valeur <= 1:
        raise ValidationError(f"{nom} : une part entre 0 et 1 (0.02 = 2 %).")
    if unite == "heure" and not 0 <= valeur <= 24:
        raise ValidationError(f"{nom} : une heure entre 0 et 24 (13.5 = 13 h 30).")


def _forme(x):
    """Forme d'une valeur de table : les colonnes d'une ligne, le type d'une valeur simple."""
    if isinstance(x, dict):
        return ("ligne", frozenset(x))
    if isinstance(x, list):
        return ("liste",)
    if _est_nombre(x):
        return ("nombre",)
    return (type(x).__name__,)


def verifier_table(nom: str, lignes, reference):
    """Une table garde la forme de BV-DEV-07 : mêmes colonnes pour chaque ligne, mêmes clés pour un dictionnaire."""
    if type(lignes) is not type(reference):
        raise ValidationError(f"{nom} : forme attendue {type(reference).__name__}.")
    if isinstance(reference, list):
        if not lignes:
            raise ValidationError(f"{nom} : la table ne peut pas être vide.")
        formes = {_forme(x) for x in reference}
        for i, x in enumerate(lignes, 1):
            # null est permis là où une colonne l'a déjà (« sans borne » ou « sans objet »)
            if _forme(x) not in formes:
                raise ValidationError(f"{nom}, ligne {i} : colonnes ou type différents de la table d'origine.")
        return
    if nom not in TABLES_A_CLES_LIBRES and set(lignes) != set(reference):
        raise ValidationError(f"{nom} : clés attendues {sorted(reference)}.")
    formes = {_forme(x) for x in reference.values()}
    for cle, x in lignes.items():
        if _forme(x) not in formes:
            raise ValidationError(f"{nom}, « {cle} » : type différent de la table d'origine.")


class _Journalise(models.Model):
    modifie_le = models.DateTimeField(auto_now=True)
    modifie_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")

    CHAMP = ""  # le champ dont chaque changement est journalisé

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        from apps.common.models import AuditLog

        self.full_clean()
        existait = self.pk is not None
        avant = type(self).objects.filter(pk=self.pk).values_list(self.CHAMP, flat=True).first() if existait else None
        with transaction.atomic():
            super().save(*args, **kwargs)
            apres = getattr(self, self.CHAMP)
            if not existait or avant != apres:
                AuditLog.objects.create(
                    action=AuditLog.Action.UPDATE if existait else AuditLog.Action.CREATE,
                    content_type=ContentType.objects.get_for_model(type(self)),
                    object_id=str(self.pk),
                    object_repr=self.nom,
                    actor=self.modifie_par,
                    changes={"nom": self.nom, "avant": avant, "apres": apres},
                )


class Reglage(_Journalise):
    nom = models.CharField(max_length=60, unique=True, editable=False, help_text="r_…, nom du dictionnaire BV-DEV-07")
    valeur = models.JSONField(null=True, blank=True, help_text="Nombre (taux en décimal : 0.02 = 2 %), 0/1 pour un oui/non, AAAA-MM-JJ ou null pour une date.")
    exact = models.CharField(max_length=40, blank=True, default="", editable=False, help_text="Fraction exacte utilisée pour les calculs")
    unite = models.CharField(max_length=20, editable=False)
    libelle = models.CharField(max_length=255, editable=False)
    regles = models.CharField(max_length=120, blank=True, default="", editable=False, help_text="Règles qui l'emploient")

    CHAMP = "valeur"

    class Meta:
        ordering = ["nom"]
        verbose_name = "Réglage"
        verbose_name_plural = "Réglages (r_…)"

    def __str__(self):
        return f"{self.nom} = {self.valeur} {self.unite}"

    def clean(self):
        verifier_valeur(self.nom, self.unite, self.valeur)
        self.exact = valeur_exacte(self.valeur)


class TableReglee(_Journalise):
    nom = models.CharField(max_length=60, unique=True, editable=False, help_text="t_…, nom du dictionnaire BV-DEV-07")
    lignes = models.JSONField(help_text="Mêmes colonnes que la table d'origine. Une valeur « r_… » renvoie au réglage du même nom.")

    CHAMP = "lignes"

    class Meta:
        ordering = ["nom"]
        verbose_name = "Table"
        verbose_name_plural = "Tables (t_…)"

    def __str__(self):
        return self.nom

    def clean(self):
        reference = donnees_reference()["tables"].get(self.nom)
        if reference is None:
            raise ValidationError(f"{self.nom} : table inconnue de BV-DEV-07.")
        verifier_table(self.nom, self.lignes, reference)
