from io import StringIO
 
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient
 
from apps.catalog.models import Brand, Category, MasterProduct
 
 
User = get_user_model()
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 1. MODÈLE
# ═══════════════════════════════════════════════════════════════════════════
 
class BrandModelTests(TestCase):
 
    def test_slug_auto_generated_from_name(self):
        b = Brand.objects.create(name="Samsung")
        self.assertEqual(b.slug, "samsung")
 
    def test_slug_auto_appends_counter_when_name_collides(self):
        """
        Deux marques avec des noms différents mais produisant le même slug :
        le second doit avoir un suffixe -1, -2 automatique.
        """
        Brand.objects.create(name="Test-Brand")
        b2 = Brand.objects.create(name="Test Brand")   # slugify → même base
        # Les deux ont "test-brand" comme base, la 2e doit être disambiguée
        self.assertNotEqual(b2.slug, "test-brand")
        self.assertTrue(b2.slug.startswith("test-brand"))

    def test_forcing_duplicate_slug_raises_integrity_error(self):
        """
        Si l'utilisateur force manuellement un slug qui entre en collision,
        la contrainte DB doit lever IntegrityError. On ne modifie pas
        silencieusement les données de l'utilisateur.
        """
        from django.db.utils import IntegrityError
        Brand.objects.create(name="First Brand", slug="collision-slug")
        b2 = Brand(name="Second Brand")
        b2.slug = "collision-slug"     # collision forcée
        with self.assertRaises(IntegrityError):
            b2.save()
 
    def test_name_uniqueness_at_db_level(self):
        Brand.objects.create(name="Apple")
        from django.db.utils import IntegrityError
        with self.assertRaises(IntegrityError):
            Brand.objects.create(name="Apple")
 
    def test_verified_brands_come_first_in_ordering(self):
        Brand.objects.create(name="Zebra", is_verified=False)
        Brand.objects.create(name="Alpha", is_verified=True)
        first = Brand.objects.first()
        self.assertEqual(first.name, "Alpha")
 
    def test_str_shows_verified_badge(self):
        b = Brand.objects.create(name="Samsung", is_verified=True)
        self.assertIn("✓", str(b))
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 2. COMMAND DE SEED
# ═══════════════════════════════════════════════════════════════════════════
 
class SeedBrandsTests(TestCase):
 
    def _run(self, *args):
        out = StringIO()
        call_command("seed_brands", *args, stdout=out)
        return out.getvalue()
 
    def test_seed_creates_expected_brands(self):
        self._run()
        for expected in ["Samsung", "Apple", "Tecno", "Itel", "HP", "Anker"]:
            self.assertTrue(
                Brand.objects.filter(name=expected).exists(),
                f"Marque manquante après seed : {expected}",
            )
 
    def test_all_seeded_brands_are_verified(self):
        self._run()
        # Vérifier qu'aucune marque du seed n'est laissée non-verified
        unverified = Brand.objects.filter(is_verified=False).count()
        self.assertEqual(unverified, 0)
 
    def test_seed_is_idempotent(self):
        self._run()
        count_1 = Brand.objects.count()
        self._run()
        count_2 = Brand.objects.count()
        self.assertEqual(count_1, count_2)
 
    def test_dry_run_does_not_write(self):
        before = Brand.objects.count()
        output = self._run("--dry-run")
        self.assertEqual(Brand.objects.count(), before)
        self.assertIn("DRY RUN", output)
 
    def test_seed_does_not_touch_existing_by_default(self):
        # Créer une marque manuellement avec des données modifiées
        Brand.objects.create(
            name="Samsung",
            country_of_origin="Modifié à la main",
            is_verified=False,
            description="Ma description perso",
        )
        self._run()
        b = Brand.objects.get(name="Samsung")
        # Sans --update-existing, le seed ne touche pas
        self.assertEqual(b.country_of_origin, "Modifié à la main")
        self.assertFalse(b.is_verified)
 
    def test_update_existing_overrides_verified(self):
        Brand.objects.create(
            name="Samsung",
            is_verified=False,
        )
        self._run("--update-existing")
        b = Brand.objects.get(name="Samsung")
        self.assertTrue(b.is_verified)
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 3. ENDPOINT AUTOCOMPLETE
# ═══════════════════════════════════════════════════════════════════════════
 
class BrandAutocompleteEndpointTests(TestCase):
 
    def setUp(self):
        self.client = APIClient()
        Brand.objects.create(name="Samsung", is_verified=True)
        Brand.objects.create(name="SanDisk", is_verified=True)
        Brand.objects.create(name="Sandbox Toys", is_verified=False)
        Brand.objects.create(name="Apple", is_verified=True)
 
    def test_autocomplete_returns_matches(self):
        resp = self.client.get("/api/catalog/brands/autocomplete/?q=san")
        self.assertEqual(resp.status_code, 200)
        names = [r["name"] for r in resp.json()]
        # SanDisk et Sandbox Toys matchent
        self.assertIn("SanDisk", names)
        self.assertIn("Sandbox Toys", names)
        # Samsung ne matche pas (pas de "san")
        # (test défensif : icontains est case-insensitive)
 
    def test_autocomplete_case_insensitive(self):
        resp = self.client.get("/api/catalog/brands/autocomplete/?q=SAM")
        names = [r["name"] for r in resp.json()]
        self.assertIn("Samsung", names)
 
    def test_autocomplete_verified_only(self):
        resp = self.client.get("/api/catalog/brands/autocomplete/?q=san&verified_only=true")
        names = [r["name"] for r in resp.json()]
        self.assertIn("SanDisk", names)
        self.assertNotIn("Sandbox Toys", names)
 
    def test_autocomplete_verified_come_first(self):
        # Les verified doivent apparaître avant les non-verified
        resp = self.client.get("/api/catalog/brands/autocomplete/?q=san")
        results = resp.json()
        verified_positions = [i for i, r in enumerate(results) if r["is_verified"]]
        unverified_positions = [i for i, r in enumerate(results) if not r["is_verified"]]
        if verified_positions and unverified_positions:
            self.assertLess(max(verified_positions), min(unverified_positions))
 
    def test_autocomplete_respects_limit(self):
        # Créer beaucoup de marques matchant "a"
        for i in range(30):
            Brand.objects.create(name=f"AAAtest{i}", is_verified=True)
        resp = self.client.get("/api/catalog/brands/autocomplete/?q=aaa&limit=5")
        self.assertEqual(len(resp.json()), 5)
 
    def test_autocomplete_no_query_returns_all_verified_first(self):
        """Sans q, on retourne les premières marques triées (limit par défaut)."""
        resp = self.client.get("/api/catalog/brands/autocomplete/")
        self.assertEqual(resp.status_code, 200)
        # Le premier résultat doit être verified (Alpha ordering commence par A)
        results = resp.json()
        if results:
            self.assertTrue(results[0]["is_verified"])
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 4. ENDPOINT LIST + DETAIL
# ═══════════════════════════════════════════════════════════════════════════
 
class BrandListAndDetailTests(TestCase):
 
    def setUp(self):
        self.client = APIClient()
        self.samsung = Brand.objects.create(name="Samsung", is_verified=True)
        Brand.objects.create(name="Pending Brand", is_verified=False)
        Brand.objects.create(name="Inactive Brand", is_active=False, is_verified=True)
 
    def test_list_default_hides_unverified(self):
        resp = self.client.get("/api/catalog/brands/")
        names = [r["name"] for r in resp.json()]
        self.assertIn("Samsung", names)
        self.assertNotIn("Pending Brand", names)
        self.assertNotIn("Inactive Brand", names)
 
    def test_list_include_unverified(self):
        resp = self.client.get("/api/catalog/brands/?verified_only=false")
        names = [r["name"] for r in resp.json()]
        self.assertIn("Pending Brand", names)
 
    def test_detail_returns_brand(self):
        resp = self.client.get(f"/api/catalog/brands/{self.samsung.slug}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["name"], "Samsung")
 
    def test_detail_returns_404_for_inactive(self):
        resp = self.client.get("/api/catalog/brands/inactive-brand/")
        self.assertEqual(resp.status_code, 404)
 
    def test_detail_returns_404_for_unknown(self):
        resp = self.client.get("/api/catalog/brands/nonexistent/")
        self.assertEqual(resp.status_code, 404)
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 5. ENDPOINT PROPOSE (vendeur)
# ═══════════════════════════════════════════════════════════════════════════
 
class BrandProposeEndpointTests(TestCase):
 
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user("vendor", password="x")
        self.client.force_authenticate(user=self.user)
 
    def test_propose_creates_unverified_brand(self):
        resp = self.client.post("/api/catalog/brands/propose/", {"name": "NewBrand"}, format="json")
        self.assertEqual(resp.status_code, 201)
        b = Brand.objects.get(name="NewBrand")
        self.assertFalse(b.is_verified)
        self.assertTrue(b.is_active)
 
    def test_propose_requires_authentication(self):
        self.client.force_authenticate(user=None)
        resp = self.client.post("/api/catalog/brands/propose/", {"name": "X"}, format="json")
        self.assertIn(resp.status_code, [401, 403])
 
    def test_propose_rejects_duplicate_case_insensitive(self):
        Brand.objects.create(name="Samsung", is_verified=True)
        resp = self.client.post("/api/catalog/brands/propose/", {"name": "SAMSUNG"}, format="json")
        self.assertEqual(resp.status_code, 409)
        self.assertIn("existing_brand", resp.json())
 
    def test_propose_rejects_empty_name(self):
        resp = self.client.post("/api/catalog/brands/propose/", {"name": ""}, format="json")
        self.assertEqual(resp.status_code, 400)
 
    def test_propose_rejects_too_short(self):
        resp = self.client.post("/api/catalog/brands/propose/", {"name": "A"}, format="json")
        self.assertEqual(resp.status_code, 400)
 
    def test_propose_stores_admin_note_with_username(self):
        self.client.post("/api/catalog/brands/propose/", {"name": "TestNote"}, format="json")
        b = Brand.objects.get(name="TestNote")
        self.assertIn("vendor", b.admin_note)
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 6. INTÉGRATION MASTERPRODUCT ↔ BRAND
# ═══════════════════════════════════════════════════════════════════════════
 
class MasterProductBrandFkTests(TestCase):
 
    def setUp(self):
        self.category = Category.objects.create(name="Test", slug="test-mp-brand")
        self.brand = Brand.objects.create(name="TestBrand", is_verified=True)
 
    def test_masterproduct_can_link_to_brand(self):
        mp = MasterProduct.objects.create(
            title="Test MP",
            category=self.category,
            brand_fk=self.brand,
        )
        self.assertEqual(mp.brand_fk.name, "TestBrand")
 
    def test_brand_fk_is_nullable(self):
        """Rétrocompat : les fiches sans brand_fk (Mode, Beauté...) restent valides."""
        mp = MasterProduct.objects.create(
            title="Test MP sans brand",
            category=self.category,
        )
        self.assertIsNone(mp.brand_fk)
 
    def test_brand_delete_protected_when_used(self):
        """Une marque utilisée ne peut pas être supprimée directement (PROTECT)."""
        MasterProduct.objects.create(
            title="MP", category=self.category, brand_fk=self.brand,
        )
        from django.db.models import ProtectedError
        with self.assertRaises(ProtectedError):
            self.brand.delete()