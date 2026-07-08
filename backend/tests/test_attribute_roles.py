from io import StringIO
 
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db.utils import IntegrityError
from django.test import TestCase
from rest_framework.test import APIClient
 
from apps.catalog.models import (
    Category, ProductAttribute, MasterProduct,
    AttributeRole, AttributeValueType,
)
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 1. MODÈLE ProductAttribute
# ═══════════════════════════════════════════════════════════════════════════
 
class ProductAttributeRoleTests(TestCase):
 
    def setUp(self):
        self.category = Category.objects.create(name="Test Cat", slug="test-cat-attr")
 
    def test_default_role_is_spec(self):
        attr = ProductAttribute.objects.create(
            slug="test-attr", name="Test", category=self.category,
        )
        self.assertEqual(attr.role, AttributeRole.SPEC)
 
    def test_default_values_type_is_select(self):
        attr = ProductAttribute.objects.create(
            slug="test-attr-vt", name="Test", category=self.category,
        )
        self.assertEqual(attr.values_type, AttributeValueType.SELECT)
 
    def test_universal_attribute_without_category(self):
        """is_universal=True + category=None doit être accepté."""
        attr = ProductAttribute.objects.create(
            slug="universal-attr", name="Poids",
            is_universal=True, category=None,
        )
        self.assertTrue(attr.is_universal)
        self.assertIsNone(attr.category)
 
    def test_universal_with_category_violates_constraint(self):
        """is_universal=True + category renseignée doit être rejeté."""
        with self.assertRaises((ValidationError, IntegrityError)):
            attr = ProductAttribute(
                slug="conflict-attr", name="Conflit",
                is_universal=True, category=self.category,
            )
            # save() doit lever
            attr.save()
 
    def test_non_universal_without_category_violates_constraint(self):
        """is_universal=False + category=None doit être rejeté."""
        with self.assertRaises((ValidationError, IntegrityError)):
            attr = ProductAttribute(
                slug="orphan-attr", name="Orphelin",
                is_universal=False, category=None,
            )
            attr.save()
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 2. VALIDATION variant_axes sur MasterProduct
# ═══════════════════════════════════════════════════════════════════════════
 
class MasterProductVariantAxesTests(TestCase):
 
    def setUp(self):
        self.category = Category.objects.create(name="Smartphones", slug="cat-smartphones-va")
        # Attribut AXE valide
        self.axe_color = ProductAttribute.objects.create(
            slug="va-color", name="Couleur", role=AttributeRole.AXE,
            values_type=AttributeValueType.COLORDICT,
            category=self.category, is_universal=False,
        )
        # Attribut SPEC (ne peut pas être un axe)
        self.spec_display = ProductAttribute.objects.create(
            slug="va-display", name="Écran", role=AttributeRole.SPEC,
            category=self.category, is_universal=False,
        )
        # Attribut d'une AUTRE catégorie
        self.other_cat = Category.objects.create(name="Audio", slug="cat-audio-va")
        self.foreign_axe = ProductAttribute.objects.create(
            slug="va-foreign", name="ForeignAxe", role=AttributeRole.AXE,
            category=self.other_cat, is_universal=False,
        )
 
    def test_empty_variant_axes_is_valid(self):
        mp = MasterProduct(
            title="Atomic Product", category=self.category, variant_axes=[],
        )
        mp.clean()   # Ne doit pas lever
 
    def test_valid_axis_from_same_category(self):
        mp = MasterProduct(
            title="Smartphone", category=self.category,
            variant_axes=["va-color"],
        )
        mp.clean()   # Ne doit pas lever
 
    def test_unknown_slug_rejected(self):
        mp = MasterProduct(
            title="Bad", category=self.category, variant_axes=["nonexistent"],
        )
        with self.assertRaises(ValidationError):
            mp.clean()
 
    def test_spec_attribute_cannot_be_axis(self):
        """Un attribut avec role=SPEC ne peut PAS être déclaré comme axe."""
        mp = MasterProduct(
            title="Bad", category=self.category, variant_axes=["va-display"],
        )
        with self.assertRaises(ValidationError):
            mp.clean()
 
    def test_axis_from_foreign_category_rejected(self):
        """Un axe qui n'est ni universel ni dans la lignée catégorie est rejeté."""
        mp = MasterProduct(
            title="Bad", category=self.category, variant_axes=["va-foreign"],
        )
        with self.assertRaises(ValidationError):
            mp.clean()
 
    def test_universal_axis_accepted_across_categories(self):
        """Un attribut universel avec role=AXE est accepté partout."""
        ProductAttribute.objects.create(
            slug="va-universal-color", name="Universal Color",
            role=AttributeRole.AXE, values_type=AttributeValueType.COLORDICT,
            is_universal=True, category=None,
        )
        mp = MasterProduct(
            title="Any", category=self.category,
            variant_axes=["va-universal-color"],
        )
        mp.clean()   # Ne doit pas lever
 
    def test_non_list_variant_axes_rejected(self):
        mp = MasterProduct(
            title="Bad", category=self.category, variant_axes="not-a-list",
        )
        with self.assertRaises(ValidationError):
            mp.clean()
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 3. COMMAND seed_electronics_attributes
# ═══════════════════════════════════════════════════════════════════════════
 
class SeedElectronicsAttributesTests(TestCase):
 
    def _run(self, *args):
        out = StringIO()
        call_command("seed_electronics_attributes", *args, stdout=out)
        return out.getvalue()
 
    def setUp(self):
        # Prérequis : la taxonomie Electronics doit exister
        call_command("seed_electronics_taxonomy", stdout=StringIO())
 
    def test_seed_creates_universal_attributes(self):
        self._run()
        # Le seed doit avoir créé les attributs universels
        universals = ProductAttribute.objects.filter(is_universal=True)
        self.assertGreater(universals.count(), 10)
        # Sanity check : Bluetooth doit être universel
        self.assertTrue(
            ProductAttribute.objects.filter(slug="bluetooth", is_universal=True).exists()
        )
 
    def test_seed_creates_category_specific_axes(self):
        self._run()
        # Les axes smartphones Android
        for slug in ["phone-storage", "phone-color", "phone-ram"]:
            self.assertTrue(
                ProductAttribute.objects.filter(
                    slug=slug, role=AttributeRole.AXE,
                ).exists(),
                f"Axe manquant : {slug}",
            )
 
    def test_seed_creates_specs_not_axes(self):
        self._run()
        # Bluetooth est SPEC (pas un axe)
        bt = ProductAttribute.objects.get(slug="bluetooth")
        self.assertEqual(bt.role, AttributeRole.SPEC)
 
    def test_seed_creates_offer_attributes(self):
        self._run()
        # Condition et Import Source sont OFFRE
        cond = ProductAttribute.objects.get(slug="condition")
        self.assertEqual(cond.role, AttributeRole.OFFRE)
        self.assertTrue(cond.is_universal)
 
    def test_seed_uses_colordict_for_color(self):
        self._run()
        color = ProductAttribute.objects.get(slug="phone-color")
        self.assertEqual(color.values_type, AttributeValueType.COLORDICT)
 
    def test_seed_uses_brand_type_for_brand(self):
        self._run()
        brand = ProductAttribute.objects.get(slug="brand")
        self.assertEqual(brand.values_type, AttributeValueType.BRAND)
 
    def test_seed_is_idempotent(self):
        self._run()
        count_1 = ProductAttribute.objects.count()
        self._run()
        count_2 = ProductAttribute.objects.count()
        self.assertEqual(count_1, count_2)
 
    def test_dry_run_does_not_write(self):
        before = ProductAttribute.objects.count()
        self._run("--dry-run")
        self.assertEqual(ProductAttribute.objects.count(), before)
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 4. ENDPOINT /api/catalog/attributes/
# ═══════════════════════════════════════════════════════════════════════════
 
class AttributesListEndpointTests(TestCase):
 
    def setUp(self):
        self.client = APIClient()
        self.cat = Category.objects.create(name="AttrCat", slug="attr-cat-endpoint")
        self.sub = Category.objects.create(name="AttrSub", slug="attr-sub-endpoint", parent=self.cat)
 
        # Universel
        ProductAttribute.objects.create(
            slug="attr-endpoint-weight", name="Poids",
            role=AttributeRole.SPEC, values_type=AttributeValueType.NUMBER,
            is_universal=True, category=None, unit="g",
        )
        # Sur la catégorie parent
        ProductAttribute.objects.create(
            slug="attr-endpoint-parent-axis", name="AxisParent",
            role=AttributeRole.AXE, category=self.cat, is_universal=False,
        )
        # Sur la sous-catégorie
        ProductAttribute.objects.create(
            slug="attr-endpoint-sub-spec", name="SpecSub",
            role=AttributeRole.SPEC, category=self.sub, is_universal=False,
        )
 
    def test_default_returns_universals_only(self):
        resp = self.client.get("/api/catalog/attributes/")
        slugs = [a["slug"] for a in resp.json()]
        self.assertIn("attr-endpoint-weight", slugs)
        self.assertNotIn("attr-endpoint-parent-axis", slugs)
 
    def test_by_category_includes_universals_and_lineage(self):
        resp = self.client.get(f"/api/catalog/attributes/?category={self.sub.slug}")
        slugs = [a["slug"] for a in resp.json()]
        # Doit inclure : universel + parent + sub-catégorie
        self.assertIn("attr-endpoint-weight", slugs)          # universel
        self.assertIn("attr-endpoint-parent-axis", slugs)     # ancêtre
        self.assertIn("attr-endpoint-sub-spec", slugs)        # catégorie
 
    def test_role_filter_axe(self):
        resp = self.client.get(f"/api/catalog/attributes/?category={self.sub.slug}&role=AXE")
        slugs = [a["slug"] for a in resp.json()]
        self.assertIn("attr-endpoint-parent-axis", slugs)
        self.assertNotIn("attr-endpoint-weight", slugs)      # SPEC
        self.assertNotIn("attr-endpoint-sub-spec", slugs)    # SPEC
 
    def test_invalid_role_returns_400(self):
        resp = self.client.get("/api/catalog/attributes/?role=INVALID")
        self.assertEqual(resp.status_code, 400)
 
    def test_unknown_category_returns_404(self):
        resp = self.client.get("/api/catalog/attributes/?category=does-not-exist")
        self.assertEqual(resp.status_code, 404)
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 5. ENDPOINT /api/catalog/master-products/<slug>/axes/
# ═══════════════════════════════════════════════════════════════════════════
 
class MasterProductAxesEndpointTests(TestCase):
 
    def setUp(self):
        self.client = APIClient()
        self.cat = Category.objects.create(name="MPCat", slug="mp-cat-axes")
        self.axe_color = ProductAttribute.objects.create(
            slug="mp-axes-color", name="Couleur",
            role=AttributeRole.AXE, values_type=AttributeValueType.COLORDICT,
            category=self.cat, is_universal=False,
        )
        self.axe_storage = ProductAttribute.objects.create(
            slug="mp-axes-storage", name="Stockage",
            role=AttributeRole.AXE, values_type=AttributeValueType.SELECT,
            values=["128", "256", "512"], unit="GB",
            category=self.cat, is_universal=False,
        )
        self.master = MasterProduct.objects.create(
            title="Test MP Axes", slug="test-mp-axes",
            category=self.cat,
            variant_axes=["mp-axes-color", "mp-axes-storage"],
        )
 
    def test_axes_endpoint_returns_resolved_axes(self):
        resp = self.client.get(f"/api/catalog/master-products/{self.master.slug}/axes/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["variant_axes_resolved"]), 2)
        self.assertEqual(data["variant_axes_resolved"][0]["slug"], "mp-axes-color")
        self.assertEqual(data["variant_axes_resolved"][0]["values_type"], "COLORDICT")
 
    def test_axes_endpoint_preserves_declared_order(self):
        # Change l'ordre déclaré
        self.master.variant_axes = ["mp-axes-storage", "mp-axes-color"]
        self.master.save()
 
        resp = self.client.get(f"/api/catalog/master-products/{self.master.slug}/axes/")
        data = resp.json()
        # L'ordre du JSON doit refléter l'ordre déclaré
        slugs = [a["slug"] for a in data["variant_axes_resolved"]]
        self.assertEqual(slugs, ["mp-axes-storage", "mp-axes-color"])
 
    def test_unknown_master_returns_404(self):
        resp = self.client.get("/api/catalog/master-products/does-not-exist/axes/")
        self.assertEqual(resp.status_code, 404)