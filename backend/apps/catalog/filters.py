# backend/apps/catalog/filters.py
# Filtres avancés pour les produits et catégories

import django_filters
from .models import Product, Category


class ProductFilter(django_filters.FilterSet):
    """
    Filtres pour les produits :
    - Recherche par titre/description (déjà géré par SearchFilter dans views.py)
    - Filtrage par catégorie
    - Filtrage par prix (min/max)
    - Filtrage par disponibilité (en stock)
    - Filtrage par statut (actif/inactif)
    """
    
    # Filtre par catégorie (exact match ou slug)
    category = django_filters.ModelChoiceFilter(queryset=Category.objects.all())
    category_slug = django_filters.CharFilter(field_name='category__slug', lookup_expr='iexact')
    
    # Filtre par prix (range)
    price_min = django_filters.NumberFilter(field_name='price_xaf', lookup_expr='gte')
    price_max = django_filters.NumberFilter(field_name='price_xaf', lookup_expr='lte')
    
    # Filtre par disponibilité en stock
    in_stock = django_filters.BooleanFilter(method='filter_in_stock')
    
    # Filtre par statut actif
    is_active = django_filters.BooleanFilter()
    
    class Meta:
        model = Product
        fields = {
            'title': ['icontains'],
            'category': ['exact'],
            'is_active': ['exact'],
        }
    
    def filter_in_stock(self, queryset, name, value):
        """
        Filtre personnalisé pour vérifier si un produit est en stock
        (utilise le modèle Inventory lié)
        """
        if value:
            # Produits avec stock > 0
            return queryset.filter(inventory__quantity__gt=0)
        else:
            # Produits avec stock = 0
            return queryset.filter(inventory__quantity=0)


class CategoryFilter(django_filters.FilterSet):
    """
    Filtres pour les catégories :
    - Recherche par nom
    - Filtrage par statut actif
    - Filtrage par parent (catégories de niveau 1 ou sous-catégories)
    """
    
    name = django_filters.CharFilter(lookup_expr='icontains')
    is_active = django_filters.BooleanFilter()
    has_parent = django_filters.BooleanFilter(method='filter_has_parent')
    
    class Meta:
        model = Category
        fields = ['name', 'is_active', 'parent']
    
    def filter_has_parent(self, queryset, name, value):
        """
        Filtre personnalisé pour distinguer catégories principales et sous-catégories
        """
        if value:
            # Sous-catégories (ont un parent)
            return queryset.filter(parent__isnull=False)
        else:
            # Catégories principales (pas de parent)
            return queryset.filter(parent__isnull=True)