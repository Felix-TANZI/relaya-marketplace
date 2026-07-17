from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db.utils import IntegrityError
from django.test import TestCase
from rest_framework.test import APIClient
 
from apps.catalog.models import (
    Category, MasterProduct, Product, ProductVariant,
    ProductAttribute, ProductCondition,
    AttributeRole, AttributeValueType,
)
 
User = get_user_model()
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 1. MODÈLE ProductVariant
# ═══════════════════════════════════════════════════════════════════════════
 
class ProductVariantModelTests(TestCase):
 
    def setUp(self):
        self.cat = Category.objects.create(name="Cat V", slug="cat-variant-test")
        # Attributs AXE
        self.axe_color = ProductAttribute.objects.create(
            slug="v-color", name="Couleur",
            role=AttributeRole.AXE, values_type=AttributeValueType.COLORDICT,
            category=self.cat, is_universal=False,
        )
        self.axe_storage = ProductAttribute.objects.create(
            slug="v-storage", name="Stockage",
            role=AttributeRole.AXE, values_type=AttributeValueType.SELECT,
            values=["128", "256", "512"], unit="GB",
            category=self.cat, is_universal=False,
        )
        # Master avec 2 axes
        self.master = MasterProduct.objects.create(
            title="Test MP", slug="test-mp-variant",
            category=self.cat,
            variant_axes=["v-color", "v-storage"],
        )
 
    def test_compute_axis_key_sorted_and_deterministic(self):
        """Deux ordres différents produisent le même axis_key."""
        k1 = ProductVariant.compute_axis_key({"v-color": "noir", "v-storage": "256"})
        k2 = ProductVariant.compute_axis_key({"v-storage": "256", "v-color": "noir"})
        self.assertEqual(k1, k2)
        self.assertEqual(k1, "v-color=noir|v-storage=256")
 
    def test_compute_axis_key_empty_dict(self):
        self.assertEqual(ProductVariant.compute_axis_key({}), "")
 
    def test_create_variant_sets_axis_key(self):
        v = ProductVariant.objects.create(
            master=self.master,
            axis_values={"v-color": "titane", "v-storage": "512"},
        )
        self.assertEqual(v.axis_key, "v-color=titane|v-storage=512")
 
    def test_sku_auto_generated_after_save(self):
        v = ProductVariant.objects.create(
            master=self.master,
            axis_values={"v-color": "noir", "v-storage": "128"},
        )
        self.assertTrue(v.sku.startswith("BLV-V-"))
        self.assertIn(f"{self.master.id:06d}", v.sku)
 
    def test_uniqueness_constraint_on_master_axiskey(self):
        """Impossible de créer 2 variants avec les mêmes (master, axis_values)."""
        ProductVariant.objects.create(
            master=self.master,
            axis_values={"v-color": "noir", "v-storage": "128"},
        )
        with self.assertRaises((IntegrityError, ValidationError)):
            ProductVariant.objects.create(
                master=self.master,
                axis_values={"v-color": "noir", "v-storage": "128"},
            )
 
    def test_uniqueness_allows_different_axis_values(self):
        """Deux Variants du même master avec axis_values différents = OK."""
        ProductVariant.objects.create(
            master=self.master,
            axis_values={"v-color": "noir", "v-storage": "128"},
        )
        ProductVariant.objects.create(
            master=self.master,
            axis_values={"v-color": "noir", "v-storage": "256"},
        )
        self.assertEqual(self.master.variants.count(), 2)
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 2. VALIDATION MÉTIER
# ═══════════════════════════════════════════════════════════════════════════
 
class ProductVariantValidationTests(TestCase):
 
    def setUp(self):
        self.cat = Category.objects.create(name="Cat V2", slug="cat-variant-val")
        self.axe_color = ProductAttribute.objects.create(
            slug="v2-color", name="Couleur",
            role=AttributeRole.AXE, values_type=AttributeValueType.SELECT,
            category=self.cat,
        )
        self.master_with_axes = MasterProduct.objects.create(
            title="With axes", slug="with-axes-val",
            category=self.cat, variant_axes=["v2-color"],
        )
        self.mono_master = MasterProduct.objects.create(
            title="Mono", slug="mono-val",
            category=self.cat, variant_axes=[],
        )
 
    def test_missing_declared_axis_rejected(self):
        """Master déclare 'v2-color' mais Variant ne l'a pas → rejet."""
        v = ProductVariant(master=self.master_with_axes, axis_values={})
        with self.assertRaises(ValidationError):
            v.clean()
 
    def test_extra_axis_not_in_master_rejected(self):
        """Variant a un axe que le master n'a pas déclaré → rejet."""
        v = ProductVariant(
            master=self.master_with_axes,
            axis_values={"v2-color": "noir", "extra-axis": "value"},
        )
        with self.assertRaises(ValidationError):
            v.clean()
 
    def test_mono_master_requires_empty_axis_values(self):
        """Master sans axes ne peut recevoir que axis_values={}."""
        v = ProductVariant(master=self.mono_master, axis_values={"v2-color": "noir"})
        with self.assertRaises(ValidationError):
            v.clean()
 
    def test_mono_master_accepts_empty_axis_values(self):
        v = ProductVariant(master=self.mono_master, axis_values={})
        v.clean()   # Ne doit pas lever
 
    def test_empty_string_value_rejected(self):
        v = ProductVariant(
            master=self.master_with_axes,
            axis_values={"v2-color": "  "},
        )
        with self.assertRaises(ValidationError):
            v.clean()
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 3. INTÉGRATION PRODUCT ↔ VARIANT
# ═══════════════════════════════════════════════════════════════════════════
 
class ProductVariantIntegrationTests(TestCase):
 
    def setUp(self):
        self.vendor = User.objects.create_user("vendor-v", password="x")
        self.cat = Category.objects.create(name="Cat", slug="cat-prod-var")
        self.master = MasterProduct.objects.create(
            title="Master", slug="master-prod-var", category=self.cat,
        )
        self.variant = ProductVariant.objects.create(
            master=self.master, axis_values={},
        )
 
    def test_product_can_link_to_variant(self):
        p = Product.objects.create(
            title="Offer", slug="offer-1", category=self.cat,
            price_xaf=100000, vendor=self.vendor,
            master=self.master, variant=self.variant,
        )
        self.assertEqual(p.variant, self.variant)
 
    def test_product_variant_nullable_retrocompat(self):
        """Product peut être créé sans variant (verticales non-Electronics)."""
        p = Product.objects.create(
            title="Legacy Offer", slug="offer-legacy",
            category=self.cat, price_xaf=50000, vendor=self.vendor,
            master=self.master,   # master OK mais pas de variant
        )
        self.assertIsNone(p.variant)
 
    def test_variant_offers_related_name(self):
        Product.objects.create(
            title="O1", slug="o1", category=self.cat, price_xaf=1000,
            vendor=self.vendor, master=self.master, variant=self.variant,
        )
        Product.objects.create(
            title="O2", slug="o2", category=self.cat, price_xaf=1000,
            vendor=self.vendor, master=self.master, variant=self.variant,
        )
        self.assertEqual(self.variant.offers.count(), 2)
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 4. BUY BOX AU NIVEAU VARIANT
# ═══════════════════════════════════════════════════════════════════════════
 
class VariantBuyBoxTests(TestCase):
 
    def setUp(self):
        self.vendor1 = User.objects.create_user("v1-bb", password="x")
        self.vendor2 = User.objects.create_user("v2-bb", password="x")
        self.cat = Category.objects.create(name="BB", slug="cat-bb")
        self.master = MasterProduct.objects.create(
            title="BB Master", slug="bb-master",
            category=self.cat, moderation_status="APPROVED",
        )
        self.variant = ProductVariant.objects.create(
            master=self.master, axis_values={},
            moderation_status="APPROVED",
        )
        # Offre A à 100k, Offre B à 90k (moins chère)
        self.offer_a = Product.objects.create(
            title="Offer A", slug="off-a-bb", category=self.cat,
            price_xaf=100000, vendor=self.vendor1,
            master=self.master, variant=self.variant,
            moderation_status="APPROVED", is_active=True,
        )
        self.offer_b = Product.objects.create(
            title="Offer B", slug="off-b-bb", category=self.cat,
            price_xaf=90000, vendor=self.vendor2,
            master=self.master, variant=self.variant,
            moderation_status="APPROVED", is_active=True,
        )
 
    def test_variant_buy_box_returns_cheapest(self):
        self.assertEqual(self.variant.buy_box_offer, self.offer_b)
 
    def test_variant_buy_box_ignores_pending(self):
        # Une nouvelle offre PENDING moins chère ne prend pas la Buy Box
        Product.objects.create(
            title="Offer Pending", slug="off-p-bb", category=self.cat,
            price_xaf=50000, vendor=self.vendor1,
            master=self.master, variant=self.variant,
            moderation_status="PENDING", is_active=True,
        )
        self.assertEqual(self.variant.buy_box_offer, self.offer_b)
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 5. ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════
 
class VariantPublicEndpointsTests(TestCase):
 
    def setUp(self):
        self.client = APIClient()
        self.cat = Category.objects.create(name="EP", slug="cat-ep-var")
        self.master = MasterProduct.objects.create(
            title="EP Master", slug="ep-master-v", category=self.cat,
        )
        self.v_approved = ProductVariant.objects.create(
            master=self.master, axis_values={},
            moderation_status="APPROVED",
        )
        # Un master avec axes pour un deuxième variant
        self.master.variant_axes = []   # reste vide, on ajoute juste 1 variant
        self.master.save()
 
    def test_master_variants_endpoint_default_shows_approved_only(self):
        resp = self.client.get(f"/api/catalog/master-products/{self.master.slug}/variants/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()), 1)
 
    def test_master_variants_endpoint_404_unknown_master(self):
        resp = self.client.get("/api/catalog/master-products/nonexistent/variants/")
        self.assertEqual(resp.status_code, 404)
 
    def test_variant_detail_by_sku(self):
        resp = self.client.get(f"/api/catalog/variants/{self.v_approved.sku}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["sku"], self.v_approved.sku)
 
 
class VariantFindOrCreateTests(TestCase):
 
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user("v-foc", password="x")
        self.client.force_authenticate(user=self.user)
        self.cat = Category.objects.create(name="FOC", slug="cat-foc-var")
        self.axe = ProductAttribute.objects.create(
            slug="foc-color", name="Couleur",
            role=AttributeRole.AXE, values_type=AttributeValueType.SELECT,
            category=self.cat,
        )
        self.master = MasterProduct.objects.create(
            title="FOC Master", slug="foc-master-v",
            category=self.cat, variant_axes=["foc-color"],
        )
 
    def test_find_or_create_creates_new_variant_first_time(self):
        resp = self.client.post(
            "/api/catalog/vendor/variants/find-or-create/",
            {"master": self.master.id, "axis_values": {"foc-color": "noir"}},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(ProductVariant.objects.filter(master=self.master).count(), 1)
 
    def test_find_or_create_returns_existing_second_time(self):
        # Premier appel : create
        r1 = self.client.post(
            "/api/catalog/vendor/variants/find-or-create/",
            {"master": self.master.id, "axis_values": {"foc-color": "noir"}},
            format="json",
        )
        first_id = r1.json()["id"]
 
        # Deuxième appel avec les mêmes axis_values : find
        r2 = self.client.post(
            "/api/catalog/vendor/variants/find-or-create/",
            {"master": self.master.id, "axis_values": {"foc-color": "noir"}},
            format="json",
        )
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.json()["id"], first_id)
        # Pas de doublon
        self.assertEqual(ProductVariant.objects.filter(master=self.master).count(), 1)
 
    def test_find_or_create_created_variant_is_approved(self):
        resp = self.client.post(
            "/api/catalog/vendor/variants/find-or-create/",
            {"master": self.master.id, "axis_values": {"foc-color": "noir"}},
            format="json",
        )
        self.assertEqual(resp.json()["moderation_status"], "APPROVED")
 
    def test_find_or_create_requires_authentication(self):
        self.client.force_authenticate(user=None)
        resp = self.client.post(
            "/api/catalog/vendor/variants/find-or-create/",
            {"master": self.master.id, "axis_values": {"foc-color": "noir"}},
            format="json",
        )
        self.assertIn(resp.status_code, [401, 403])