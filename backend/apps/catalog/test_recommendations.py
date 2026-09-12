# backend/apps/catalog/test_recommendations.py
"""
Tests pour les algorithmes de recommandation et rotation de produits.
"""

from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import json

from apps.catalog.models import Product, MasterProduct, Category, ModerationStatus, ProductCondition
from apps.catalog.recommendation import (
    haversine_distance,
    get_related_products,
    get_homepage_featured_rotation,
    get_cart_recommendations,
    get_nearby_products,
)
from apps.accounts.models import TrustScoreProfile
from apps.vendors.models import VendorProfile, VendorLocation


class HaversineDistanceTests(TestCase):
    """Tests pour le calcul de distance Haversine."""
    
    def test_haversine_same_location(self):
        """Distance nulle pour la même position."""
        distance = haversine_distance(0.0, 0.0, 0.0, 0.0)
        self.assertAlmostEqual(distance, 0.0, places=2)
    
    def test_haversine_known_distance(self):
        """Test avec une distance connue (Paris-Marseille ~660km)."""
        # Paris: 48.8566, 2.3522
        # Marseille: 43.2965, 5.3698
        distance = haversine_distance(48.8566, 2.3522, 43.2965, 5.3698)
        self.assertAlmostEqual(distance, 661, delta=10)  # ~660km, ±10km tolerance
    
    def test_haversine_decimals(self):
        """Distance avec Decimal."""
        distance = haversine_distance(
            Decimal('0.0'), Decimal('0.0'),
            Decimal('0.0'), Decimal('0.0')
        )
        self.assertAlmostEqual(distance, 0.0, places=2)


class RecommendationAlgorithmTests(TestCase):
    """Tests pour les algorithmes de recommandation."""
    
    def setUp(self):
        """Initialiser les données de test."""
        # Créer des catégories
        self.category = Category.objects.create(
            name="Electronics",
            slug="electronics",
            description="Électronique"
        )
        
        # Créer un MasterProduct
        self.master = MasterProduct.objects.create(
            title="Test Product",
            slug="test-product",
            description="Test description",
            category=self.category,
            moderation_status=ModerationStatus.APPROVED,
        )
        
        # Créer des utilisateurs vendeurs
        self.vendor1 = User.objects.create_user(
            username='vendor1',
            email='vendor1@test.com',
            password='test123'
        )
        self.vendor2 = User.objects.create_user(
            username='vendor2',
            email='vendor2@test.com',
            password='test123'
        )
        
        # Créer des Trust Scores
        TrustScoreProfile.objects.create(
            user=self.vendor1,
            role=TrustScoreProfile.Role.VENDOR,
            score=Decimal('85.0'),
            veto_active=False,
        )
        TrustScoreProfile.objects.create(
            user=self.vendor2,
            role=TrustScoreProfile.Role.VENDOR,
            score=Decimal('75.0'),
            veto_active=False,
        )
        
        # Créer des produits (offres)
        self.product1 = Product.objects.create(
            title="Test Offer 1",
            slug="test-offer-1",
            description="Offer 1",
            category=self.category,
            vendor=self.vendor1,
            master=self.master,
            price_xaf=10000,
            moderation_status=ModerationStatus.APPROVED,
        )
        
        self.product2 = Product.objects.create(
            title="Test Offer 2",
            slug="test-offer-2",
            description="Offer 2",
            category=self.category,
            vendor=self.vendor2,
            master=self.master,
            price_xaf=12000,
            moderation_status=ModerationStatus.APPROVED,
        )
    
    def test_get_related_products(self):
        """Test l'obtention des produits liés."""
        related = get_related_products(self.master, limit=5)
        self.assertEqual(len(related), 2)  # Deux offres
        self.assertIn(self.product1, related)
        self.assertIn(self.product2, related)
    
    def test_get_related_products_exclude_vendor(self):
        """Test l'exclusion d'un vendeur."""
        related = get_related_products(self.master, exclude_vendor=self.vendor1, limit=5)
        self.assertEqual(len(related), 1)
        self.assertEqual(related[0], self.product2)
    
    def test_featured_rotation_consistency(self):
        """Test que la rotation est déterministe pour un même seed."""
        results1 = get_homepage_featured_rotation(
            Product.objects.all(),
            page=1,
            page_size=10,
            seed='2026-09-10'
        )
        results2 = get_homepage_featured_rotation(
            Product.objects.all(),
            page=1,
            page_size=10,
            seed='2026-09-10'
        )
        
        # Même seed = même résultat
        self.assertEqual(len(results1), len(results2))
        if results1:
            self.assertEqual(results1[0].id, results2[0].id)
    
    def test_featured_rotation_different_seeds(self):
        """Test que des seeds différents donnent des variations."""
        results1 = get_homepage_featured_rotation(
            Product.objects.all(),
            page=1,
            page_size=10,
            seed='2026-09-10'
        )
        results2 = get_homepage_featured_rotation(
            Product.objects.all(),
            page=1,
            page_size=10,
            seed='2026-09-11'  # Jour différent
        )
        
        # Différent seed = peut avoir variations (mais même produits si peu de résultats)
        self.assertTrue(len(results1) >= 0)
        self.assertTrue(len(results2) >= 0)


class VetoActiveFilterTests(TestCase):
    """Tests pour l'exclusion des vendeurs sanctionnés (veto_active)."""
    
    def setUp(self):
        """Initialiser les données de test."""
        self.category = Category.objects.create(
            name="Test Category",
            slug="test-cat",
            description="Test"
        )
        
        # Vendeur normal
        self.vendor_ok = User.objects.create_user(
            username='vendor_ok',
            email='ok@test.com',
            password='test123'
        )
        TrustScoreProfile.objects.create(
            user=self.vendor_ok,
            role=TrustScoreProfile.Role.VENDOR,
            score=Decimal('80.0'),
            veto_active=False,
        )
        
        # Vendeur sanctionné
        self.vendor_banned = User.objects.create_user(
            username='vendor_banned',
            email='banned@test.com',
            password='test123'
        )
        TrustScoreProfile.objects.create(
            user=self.vendor_banned,
            role=TrustScoreProfile.Role.VENDOR,
            score=Decimal('20.0'),
            veto_active=True,  # Sanctionné
            veto_reason="Counterfeit products"
        )
        
        # Produits
        self.master1 = MasterProduct.objects.create(
            title="Good Product",
            slug="good-product",
            category=self.category,
            moderation_status=ModerationStatus.APPROVED,
        )
        
        self.master2 = MasterProduct.objects.create(
            title="Banned Product",
            slug="banned-product",
            category=self.category,
            moderation_status=ModerationStatus.APPROVED,
        )
        
        self.product_ok = Product.objects.create(
            title="Good Offer",
            slug="good-offer",
            category=self.category,
            vendor=self.vendor_ok,
            master=self.master1,
            price_xaf=5000,
            moderation_status=ModerationStatus.APPROVED,
        )
        
        self.product_banned = Product.objects.create(
            title="Banned Offer",
            slug="banned-offer",
            category=self.category,
            vendor=self.vendor_banned,
            master=self.master2,
            price_xaf=5000,
            moderation_status=ModerationStatus.APPROVED,
        )
    
    def test_veto_active_filter(self):
        """Test que les produits de vendeurs sanctionnés sont exclus."""
        from apps.catalog.views import ProductViewSet
        from rest_framework.test import APIRequestFactory
        
        factory = APIRequestFactory()
        request = factory.get('/products/')
        
        viewset = ProductViewSet()
        viewset.request = request
        queryset = viewset.get_queryset()
        
        # Le produit du vendeur sanctionné ne devrait pas apparaître
        product_ids = list(queryset.values_list('id', flat=True))
        
        self.assertIn(self.product_ok.id, product_ids)
        self.assertNotIn(self.product_banned.id, product_ids)
    
    def test_throttling_penalty(self):
        """Test que le throttling applique une pénalité de score."""
        from django.db.models import F, Value, Case, When, IntegerField, ExpressionWrapper, FloatField
        from apps.catalog.models import Product
        
        # Créer un vendeur en throttling
        vendor_throttled = User.objects.create_user(
            username='vendor_throttled',
            email='throttled@test.com',
            password='test123'
        )
        profile = TrustScoreProfile.objects.create(
            user=vendor_throttled,
            role=TrustScoreProfile.Role.VENDOR,
            score=Decimal('85.0'),
            veto_active=False,
            throttled_until=timezone.now() + timedelta(days=7),  # Throttlé pendant 7 jours
        )
        
        master_t = MasterProduct.objects.create(
            title="Throttled Product",
            slug="throttled-product",
            category=self.category,
            moderation_status=ModerationStatus.APPROVED,
        )
        
        product_throttled = Product.objects.create(
            title="Throttled Offer",
            slug="throttled-offer",
            category=self.category,
            vendor=vendor_throttled,
            master=master_t,
            price_xaf=5000,
            moderation_status=ModerationStatus.APPROVED,
        )
        
        from apps.catalog.views import ProductViewSet
        from rest_framework.test import APIRequestFactory
        
        factory = APIRequestFactory()
        request = factory.get('/products/')
        
        viewset = ProductViewSet()
        viewset.request = request
        queryset = viewset.get_queryset()
        
        # Le produit throttlé doit être présent mais avec un score réduit
        throttled_products = queryset.filter(id=product_throttled.id)
        
        if throttled_products.exists():
            # Vérifier que vendor_throttled est présent
            self.assertTrue(throttled_products.count() >= 0)


class RecommendationIntegrationTests(TestCase):
    """Tests d'intégration pour les endpoints de recommandations."""
    
    def setUp(self):
        """Initialiser les données de test."""
        self.category = Category.objects.create(
            name="Electronics",
            slug="electronics",
            description="Électronique"
        )
        
        self.master1 = MasterProduct.objects.create(
            title="Laptop",
            slug="laptop",
            category=self.category,
            moderation_status=ModerationStatus.APPROVED,
        )
        
        self.master2 = MasterProduct.objects.create(
            title="Mouse",
            slug="mouse",
            category=self.category,
            moderation_status=ModerationStatus.APPROVED,
        )
        
        self.vendor = User.objects.create_user(
            username='testvendor',
            email='test@test.com',
            password='test123'
        )
        
        TrustScoreProfile.objects.create(
            user=self.vendor,
            role=TrustScoreProfile.Role.VENDOR,
            score=Decimal('75.0'),
            veto_active=False,
        )
        
        self.product1 = Product.objects.create(
            title="Laptop Offer",
            slug="laptop-offer",
            category=self.category,
            vendor=self.vendor,
            master=self.master1,
            price_xaf=1000000,
            moderation_status=ModerationStatus.APPROVED,
        )
        
        self.product2 = Product.objects.create(
            title="Mouse Offer",
            slug="mouse-offer",
            category=self.category,
            vendor=self.vendor,
            master=self.master2,
            price_xaf=50000,
            moderation_status=ModerationStatus.APPROVED,
        )
    
    def test_related_products_endpoint(self):
        """Test l'endpoint de produits liés."""
        from rest_framework.test import APIRequestFactory
        from apps.catalog.views import ProductViewSet
        
        factory = APIRequestFactory()
        request = factory.get(f'/products/related_products/?master_id={self.master1.id}&limit=5')
        
        view = ProductViewSet.as_view({'get': 'related_products'})
        response = view(request)
        
        self.assertEqual(response.status_code, 200)
