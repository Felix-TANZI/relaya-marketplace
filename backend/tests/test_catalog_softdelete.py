# backend/tests/test_catalog_softdelete.py
import pytest

from apps.catalog.models import Category, Product
from apps.common.models import AuditLog

pytestmark = pytest.mark.django_db


def _category(name="Électronique"):
    return Category.objects.create(name=name, slug=name.lower())


def test_category_soft_delete_cache_mais_conserve():
    cat = _category()
    pk = cat.pk
    cat.delete()  # suppression douce
    assert cat.deleted_at is not None
    assert not Category.objects.filter(pk=pk).exists()       # caché des vivants
    assert Category.all_objects.filter(pk=pk).exists()       # conservé en base
    assert AuditLog.objects.filter(
        action=AuditLog.Action.SOFT_DELETE, object_id=str(pk)
    ).exists()


def test_product_soft_delete_et_audit():
    cat = _category("Mode")
    p = Product.objects.create(title="Robe Wax", price_xaf=12000, category=cat)
    pk = p.pk
    assert AuditLog.objects.filter(action=AuditLog.Action.CREATE, object_id=str(pk)).exists()
    p.delete()
    assert not Product.objects.filter(pk=pk).exists()
    assert Product.all_objects.filter(pk=pk).exists()
    assert AuditLog.objects.filter(action=AuditLog.Action.SOFT_DELETE, object_id=str(pk)).exists()


def test_acces_fk_fonctionne_si_categorie_soft_deleted():
    cat = _category("Sport")
    p = Product.objects.create(title="Ballon", price_xaf=8000, category=cat)
    cat.delete()  # on supprime (en douceur) la catégorie
    p.refresh_from_db()
    # L'accès FK doit toujours résoudre (base_manager_name = all_objects)
    assert p.category_id == cat.pk
    assert p.category.pk == cat.pk  # ne lève pas DoesNotExist


def test_slug_non_reutilise_depuis_un_produit_soft_deleted():
    cat = _category("Maison")
    p1 = Product.objects.create(title="Lampe", price_xaf=5000, category=cat)
    slug1 = p1.slug
    p1.delete()  # soft
    p2 = Product.objects.create(title="Lampe", price_xaf=5000, category=cat)
    assert p2.slug != slug1  # pas de collision avec le slug du produit supprimé