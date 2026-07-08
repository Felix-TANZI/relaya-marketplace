from io import StringIO
 
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db.utils import IntegrityError
from django.test import TestCase
from rest_framework.test import APIClient
 
from apps.catalog.models import ColorDictionary, ColorFamily
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 1. MODÈLE
# ═══════════════════════════════════════════════════════════════════════════
 
class ColorDictionaryModelTests(TestCase):
 
    def test_slug_auto_generated_with_family_prefix(self):
        c = ColorDictionary.objects.create(
            family=ColorFamily.COLOR, name="Noir", hex_code="#000000",
        )
        # Le slug doit être préfixé par la famille pour éviter collisions
        # inter-familles (COLOR Noir vs FINISH Noir)
        self.assertTrue(c.slug.startswith("color-"))
 
    def test_same_name_different_families_allowed(self):
        """
        La contrainte unique porte sur (family, name), donc on peut avoir
        COLOR 'Noir' ET FINISH 'Noir' sans conflit.
        """
        ColorDictionary.objects.create(
            family=ColorFamily.COLOR, name="Noir", hex_code="#000000",
        )
        # Pas d'exception attendue
        finish = ColorDictionary.objects.create(
            family=ColorFamily.FINISH, name="Noir",
        )
        self.assertEqual(ColorDictionary.objects.filter(name="Noir").count(), 2)
 
    def test_same_name_same_family_forbidden(self):
        """
        La contrainte unique (family, name) doit empêcher les doublons.
        L'erreur peut être :
          - ValidationError si le save() du modèle valide via full_clean()
            (préférable : erreur plus tôt, message métier propre)
          - IntegrityError si Postgres bloque au niveau contrainte DB
            (fallback : si full_clean n'attrape pas)
        """
        from django.db.utils import IntegrityError
        from django.core.exceptions import ValidationError

        ColorDictionary.objects.create(
            family=ColorFamily.COLOR, name="Rouge", hex_code="#DC2626",
        )
        with self.assertRaises((ValidationError, IntegrityError)):
            ColorDictionary.objects.create(
                family=ColorFamily.COLOR, name="Rouge", hex_code="#FF0000",
            )
 
    def test_hex_code_validation_rejects_bad_format(self):
        c = ColorDictionary(
            family=ColorFamily.COLOR, name="Test", hex_code="rouge",
        )
        with self.assertRaises(ValidationError):
            c.full_clean()
 
    def test_hex_code_normalized_to_uppercase(self):
        c = ColorDictionary.objects.create(
            family=ColorFamily.COLOR, name="Test", hex_code="#dc2626",
        )
        c.refresh_from_db()
        self.assertEqual(c.hex_code, "#DC2626")
 
    def test_empty_hex_code_allowed_for_finishes(self):
        # Certaines finitions n'ont pas de hex (Mat, Brillant, Verre...)
        c = ColorDictionary.objects.create(
            family=ColorFamily.FINISH, name="Mat", hex_code="",
        )
        self.assertEqual(c.hex_code, "")
 
    def test_ordering_family_then_display_order(self):
        ColorDictionary.objects.create(family=ColorFamily.FINISH, name="Zzz", display_order=1)
        ColorDictionary.objects.create(family=ColorFamily.COLOR, name="Blanc", display_order=20)
        ColorDictionary.objects.create(family=ColorFamily.COLOR, name="Noir", display_order=10)
 
        results = list(ColorDictionary.objects.all())
        # COLOR d'abord (ordre alphabétique de family : COLOR < FINISH)
        self.assertEqual(results[0].family, "COLOR")
        # Puis tri par display_order dans la famille
        self.assertEqual(results[0].name, "Noir")   # display_order=10
        self.assertEqual(results[1].name, "Blanc")  # display_order=20
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 2. COMMAND DE SEED
# ═══════════════════════════════════════════════════════════════════════════
 
class SeedColorDictionaryTests(TestCase):
 
    def _run(self, *args):
        out = StringIO()
        call_command("seed_color_dictionary", *args, stdout=out)
        return out.getvalue()
 
    def test_seed_creates_expected_colors(self):
        self._run()
        for name in ["Noir", "Blanc", "Rouge", "Bleu", "Titane", "Champagne"]:
            self.assertTrue(
                ColorDictionary.objects.filter(family=ColorFamily.COLOR, name=name).exists(),
                f"Couleur manquante : {name}",
            )
 
    def test_seed_creates_expected_finishes(self):
        self._run()
        for name in ["Mat", "Brillant", "Aluminium", "Cuir", "Bois"]:
            self.assertTrue(
                ColorDictionary.objects.filter(family=ColorFamily.FINISH, name=name).exists(),
                f"Finition manquante : {name}",
            )
 
    def test_seed_marks_neutral_colors_correctly(self):
        self._run()
        # Ces couleurs doivent être marquées neutres
        for name in ["Noir", "Blanc", "Gris", "Argent", "Or", "Titane"]:
            c = ColorDictionary.objects.get(family=ColorFamily.COLOR, name=name)
            self.assertTrue(c.is_neutral, f"{name} devrait être neutre")
        # Et celles-ci pas
        for name in ["Rouge", "Bleu", "Vert"]:
            c = ColorDictionary.objects.get(family=ColorFamily.COLOR, name=name)
            self.assertFalse(c.is_neutral, f"{name} ne devrait pas être neutre")
 
    def test_seed_is_idempotent(self):
        self._run()
        count_1 = ColorDictionary.objects.count()
        self._run()
        count_2 = ColorDictionary.objects.count()
        self.assertEqual(count_1, count_2)
 
    def test_dry_run_does_not_write(self):
        before = ColorDictionary.objects.count()
        output = self._run("--dry-run")
        self.assertEqual(ColorDictionary.objects.count(), before)
        self.assertIn("DRY RUN", output)
 
    def test_all_colors_have_valid_hex(self):
        """Toutes les COLOR du seed doivent avoir un hex_code valide."""
        import re
        self._run()
        colors = ColorDictionary.objects.filter(family=ColorFamily.COLOR)
        for c in colors:
            self.assertTrue(
                re.match(r"^#[0-9A-F]{6}$", c.hex_code),
                f"hex invalide pour {c.name}: '{c.hex_code}'",
            )
 
 
# ═══════════════════════════════════════════════════════════════════════════
# 3. ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════
 
class ColorDictionaryEndpointTests(TestCase):
 
    def setUp(self):
        self.client = APIClient()
        # Petit dataset pour tests
        ColorDictionary.objects.create(
            family=ColorFamily.COLOR, name="Noir", hex_code="#000000",
            is_neutral=True, display_order=10,
        )
        ColorDictionary.objects.create(
            family=ColorFamily.COLOR, name="Rouge", hex_code="#DC2626",
            is_neutral=False, display_order=100,
        )
        ColorDictionary.objects.create(
            family=ColorFamily.FINISH, name="Mat", hex_code="",
            is_neutral=False, display_order=10,
        )
        ColorDictionary.objects.create(
            family=ColorFamily.COLOR, name="Inactif", hex_code="#123456",
            is_active=False,
        )
 
    def test_list_default_excludes_inactive(self):
        resp = self.client.get("/api/catalog/colors/")
        self.assertEqual(resp.status_code, 200)
        names = [c["name"] for c in resp.json()]
        self.assertIn("Noir", names)
        self.assertNotIn("Inactif", names)
 
    def test_list_filter_by_family_color(self):
        resp = self.client.get("/api/catalog/colors/?family=COLOR")
        families = [c["family"] for c in resp.json()]
        self.assertTrue(all(f == "COLOR" for f in families))
        # Mat (FINISH) doit être exclu
        names = [c["name"] for c in resp.json()]
        self.assertNotIn("Mat", names)
 
    def test_list_filter_by_family_finish(self):
        resp = self.client.get("/api/catalog/colors/?family=FINISH")
        names = [c["name"] for c in resp.json()]
        self.assertIn("Mat", names)
        self.assertNotIn("Noir", names)
 
    def test_list_filter_neutral_only(self):
        resp = self.client.get("/api/catalog/colors/?neutral_only=true")
        names = [c["name"] for c in resp.json()]
        self.assertIn("Noir", names)
        self.assertNotIn("Rouge", names)
 
    def test_list_invalid_family_returns_400(self):
        resp = self.client.get("/api/catalog/colors/?family=BOGUS")
        self.assertEqual(resp.status_code, 400)
 
    def test_list_include_inactive_shows_all(self):
        resp = self.client.get("/api/catalog/colors/?include_inactive=true")
        names = [c["name"] for c in resp.json()]
        self.assertIn("Inactif", names)
 
    def test_grouped_returns_two_keys(self):
        resp = self.client.get("/api/catalog/colors/grouped/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("COLOR", data)
        self.assertIn("FINISH", data)
 
    def test_grouped_correctly_splits_entries(self):
        resp = self.client.get("/api/catalog/colors/grouped/")
        data = resp.json()
        color_names = [c["name"] for c in data["COLOR"]]
        finish_names = [c["name"] for c in data["FINISH"]]
        self.assertIn("Noir", color_names)
        self.assertIn("Rouge", color_names)
        self.assertIn("Mat", finish_names)
        self.assertNotIn("Mat", color_names)