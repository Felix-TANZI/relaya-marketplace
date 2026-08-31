# backend/apps/payments/api/admin/filters.py
# Filtres communs aux listes financieres.
#
# Volontairement SIMPLES : recherche texte, statut, periode, montant. Un
# filtre riche mais lent est pire qu'un filtre pauvre — sur des tables
# financieres qui grossissent vite, chaque critere doit s'appuyer sur un
# index existant.

from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date


def appliquer_periode(queryset, params, champ: str = "created_at"):
    """Filtre `from` et `to` au format AAAA-MM-JJ."""
    debut = parse_date(params.get("from", "") or "")
    fin = parse_date(params.get("to", "") or "")
    if debut:
        queryset = queryset.filter(**{f"{champ}__date__gte": debut})
    if fin:
        queryset = queryset.filter(**{f"{champ}__date__lte": fin})
    return queryset


def appliquer_statut(queryset, params, champ: str = "status"):
    """Accepte plusieurs statuts separes par une virgule."""
    brut = (params.get("status") or "").strip()
    if not brut:
        return queryset
    valeurs = [v.strip().upper() for v in brut.split(",") if v.strip()]
    return queryset.filter(**{f"{champ}__in": valeurs}) if valeurs else queryset


def appliquer_montant(queryset, params, champ: str = "amount_xaf"):
    for cle, suffixe in (("min_amount", "gte"), ("max_amount", "lte")):
        valeur = (params.get(cle) or "").strip()
        if valeur.isdigit():
            queryset = queryset.filter(**{f"{champ}__{suffixe}": int(valeur)})
    return queryset


def appliquer_recherche(queryset, params, champs: list):
    terme = (params.get("q") or "").strip()
    if not terme or not champs:
        return queryset
    condition = Q()
    for champ in champs:
        condition |= Q(**{f"{champ}__icontains": terme})
    return queryset.filter(condition)


def appliquer_beneficiaire(queryset, params, champ: str = "payee__payee_code"):
    code = (params.get("payee") or "").strip()
    return queryset.filter(**{champ: code}) if code else queryset