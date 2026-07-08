from io import StringIO
 
from django.core.management import call_command
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APIClient
 
from apps.catalog.models import Category
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 1. TESTS DU MODÈLE
# ═══════════════════════════════════════════════════════════════════════════
 
class CategoryModelTests(TestCase):
 
    def test_root_has_level_0(self):
        root = Category.objects.create(name="Root", slug="root")
        self.assertEqual(root.level, 0)
 
    def test_child_level_is_parent_level_plus_1(self):
        root = Category.objects.create(name="Root", slug="root")
        child = Category.objects.create(name="Child", slug="child", parent=root)
        self.assertEqual(child.level, 1)
 
    def test_deep_nesting_computes_correct_levels(self):
        n0 = Category.objects.create(name="N0", slug="n0")
        n1 = Category.objects.create(name="N1", slug="n1", parent=n0)
        n2 = Category.objects.create(name="N2", slug="n2", parent=n1)
        n3 = Category.objects.create(name="N3", slug="n3", parent=n2)
        self.assertEqual([n0.level, n1.level, n2.level, n3.level], [0, 1, 2, 3])
 
    def test_full_path_shows_ancestry(self):
        electronics = Category.objects.create(name="Electronics", slug="electronics")
        phones = Category.objects.create(name="Phones", slug="phones", parent=electronics)
        ios = Category.objects.create(name="iOS", slug="ios", parent=phones)
        self.assertEqual(ios.full_path, "Electronics > Phones > iOS")
 
    def test_effective_requires_approval_inherits_from_ancestors(self):
        parent = Category.objects.create(
            name="Security", slug="security",
            requires_admin_approval=True,
        )
        child = Category.objects.create(
            name="Biometric", slug="biometric",
            parent=parent, requires_admin_approval=False,
        )
        self.assertTrue(child.effective_requires_approval)
 
    def test_effective_requires_approval_false_when_no_ancestor_flagged(self):
        parent = Category.objects.create(name="Audio", slug="audio")
        child = Category.objects.create(name="Casques", slug="casques", parent=parent)
        self.assertFalse(child.effective_requires_approval)
 
    def test_cycle_detection_raises_validation_error(self):
        """Une catégorie ne peut pas devenir descendante d'elle-même."""
        a = Category.objects.create(name="A", slug="a")
        b = Category.objects.create(name="B", slug="b", parent=a)
        # Tentative : rendre A enfant de B → cycle
        a.parent = b
        with self.assertRaises(ValidationError):
            a.save()
 
    def test_get_descendants_ids_returns_full_subtree(self):
        root = Category.objects.create(name="Root", slug="root-descendants")
        c1 = Category.objects.create(name="C1", slug="c1", parent=root)
        c2 = Category.objects.create(name="C2", slug="c2", parent=root)
        c11 = Category.objects.create(name="C11", slug="c11", parent=c1)
        ids = root.get_descendants_ids()
        self.assertEqual(ids, {c1.id, c2.id, c11.id})
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 2. TESTS DE LA COMMAND DE SEED
# ═══════════════════════════════════════════════════════════════════════════
 
class SeedElectronicsTaxonomyTests(TestCase):
 
    def _run(self, *args):
        """Lance la command en capturant la sortie."""
        out = StringIO()
        call_command("seed_electronics_taxonomy", *args, stdout=out)
        return out.getvalue()
 
    def test_seed_creates_root_electronics(self):
        self._run()
        self.assertTrue(Category.objects.filter(slug="electronics").exists())
 
    def test_seed_creates_expected_top_level_categories(self):
        self._run()
        expected = [
            "electronics-phones",
            "electronics-computers",
            "electronics-components",
            "electronics-peripherals",
            "electronics-displays",
            "electronics-tablets",
            "electronics-network",
            "electronics-storage",
            "electronics-audio",
            "electronics-cameras",
            "electronics-gaming",
            "electronics-wearables",
            "electronics-smart-home",
            "electronics-power",
            "electronics-security",
        ]
        for slug in expected:
            self.assertTrue(
                Category.objects.filter(slug=slug).exists(),
                f"Catégorie manquante : {slug}",
            )
 
    def test_seed_marks_restricted_categories(self):
        """Les catégories Rule 5 doivent avoir requires_admin_approval=True."""
        self._run()
        restricted = [
            "electronics-phones-signal-boosters",
            "electronics-cameras-drones",
            "electronics-cameras-surveillance",
            "electronics-power-industrial-batteries",
            "electronics-smart-home-locks",
            "electronics-security",  # branche entière
        ]
        for slug in restricted:
            cat = Category.objects.filter(slug=slug).first()
            self.assertIsNotNone(cat, f"Catégorie manquante : {slug}")
            self.assertTrue(
                cat.requires_admin_approval,
                f"{slug} doit avoir requires_admin_approval=True",
            )
 
    def test_seed_is_idempotent(self):
        """Deux exécutions consécutives donnent le même résultat."""
        self._run()
        count_after_first = Category.objects.count()
        self._run()
        count_after_second = Category.objects.count()
        self.assertEqual(count_after_first, count_after_second)
 
    def test_seed_updates_editorial_fields_on_second_run(self):
        """Modifier un name manuellement puis relancer restaure la valeur canonique."""
        self._run()
        cat = Category.objects.get(slug="electronics-phones")
        cat.name = "Nom modifié à la main"
        cat.save()
        self._run()
        cat.refresh_from_db()
        self.assertEqual(cat.name, "Téléphonie & Télécommunications")
 
    def test_dry_run_does_not_write(self):
        count_before = Category.objects.count()
        output = self._run("--dry-run")
        self.assertEqual(Category.objects.count(), count_before)
        self.assertIn("DRY RUN", output)
 
    def test_seed_correctly_nests_smartphones_under_phones(self):
        self._run()
        ios = Category.objects.get(slug="electronics-phones-smartphones-ios")
        self.assertEqual(ios.parent.slug, "electronics-phones")
        self.assertEqual(ios.parent.parent.slug, "electronics")
        self.assertEqual(ios.level, 2)
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 3. TESTS DES ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════
 
class CategoryTreeEndpointTests(TestCase):
 
    def setUp(self):
        self.client = APIClient()
        # Petit arbre pour les tests
        self.root = Category.objects.create(name="Electronics", slug="electronics", icon_name="Cpu")
        self.phones = Category.objects.create(name="Phones", slug="phones", parent=self.root, icon_name="Smartphone")
        self.ios = Category.objects.create(name="iOS", slug="phones-ios", parent=self.phones)
        self.android = Category.objects.create(name="Android", slug="phones-android", parent=self.phones)
        self.legacy = Category.objects.create(
            name="Ancienne cat", slug="old-cat", is_deprecated=True,
        )
 
    def test_tree_endpoint_returns_only_roots(self):
        resp = self.client.get("/api/catalog/categories/tree/")
        self.assertEqual(resp.status_code, 200)
        slugs = [r["slug"] for r in resp.json()]
        self.assertIn("electronics", slugs)
        # La deprecated est exclue par défaut
        self.assertNotIn("old-cat", slugs)
 
    def test_tree_endpoint_includes_children_recursively(self):
        resp = self.client.get("/api/catalog/categories/tree/")
        electronics = next(r for r in resp.json() if r["slug"] == "electronics")
        self.assertEqual(len(electronics["children"]), 1)
        phones = electronics["children"][0]
        self.assertEqual(phones["slug"], "phones")
        self.assertEqual(len(phones["children"]), 2)
 
    def test_tree_include_deprecated_flag(self):
        resp = self.client.get("/api/catalog/categories/tree/?include_deprecated=true")
        slugs = [r["slug"] for r in resp.json()]
        self.assertIn("old-cat", slugs)
 
    def test_tree_root_slug_returns_subtree_only(self):
        resp = self.client.get("/api/catalog/categories/tree/?root_slug=phones")
        data = resp.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["slug"], "phones")
 
    def test_tree_root_slug_not_found_returns_404(self):
        resp = self.client.get("/api/catalog/categories/tree/?root_slug=nonexistent")
        self.assertEqual(resp.status_code, 404)
 
 
class CategoryFlatEndpointTests(TestCase):
 
    def setUp(self):
        self.client = APIClient()
        self.root = Category.objects.create(name="Root", slug="flat-root")
        self.parent = Category.objects.create(name="Parent", slug="flat-parent", parent=self.root)
        self.leaf1 = Category.objects.create(name="Leaf1", slug="flat-leaf1", parent=self.parent)
        self.leaf2 = Category.objects.create(name="Leaf2", slug="flat-leaf2", parent=self.parent)
 
    def test_flat_returns_full_path(self):
        resp = self.client.get("/api/catalog/categories/flat/")
        self.assertEqual(resp.status_code, 200)
        leaf1 = next(r for r in resp.json() if r["slug"] == "flat-leaf1")
        self.assertEqual(leaf1["full_path"], "Root > Parent > Leaf1")
 
    def test_flat_leaves_only_excludes_intermediate(self):
        resp = self.client.get("/api/catalog/categories/flat/?leaves_only=true")
        slugs = [r["slug"] for r in resp.json()]
        self.assertNotIn("flat-root", slugs)
        self.assertNotIn("flat-parent", slugs)
        self.assertIn("flat-leaf1", slugs)
        self.assertIn("flat-leaf2", slugs)
 
    def test_flat_parent_slug_filters_descendants(self):
        resp = self.client.get(f"/api/catalog/categories/flat/?parent_slug=flat-parent")
        slugs = [r["slug"] for r in resp.json()]
        self.assertIn("flat-leaf1", slugs)
        self.assertIn("flat-leaf2", slugs)
        self.assertNotIn("flat-root", slugs)