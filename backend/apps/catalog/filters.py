# backend/apps/catalog/filters.py
# Filtres pour la gestion des produits dans le catalogue.

import django_filters
from .models import Product


class ProductFilter(django_filters.FilterSet):
    price_min = django_filters.NumberFilter(field_name='price_xaf', lookup_expr='gte')
    price_max = django_filters.NumberFilter(field_name='price_xaf', lookup_expr='lte')
    category = django_filters.NumberFilter(field_name='category__id')

    class Meta:
        model = Product
        fields = ['category', 'price_min', 'price_max']