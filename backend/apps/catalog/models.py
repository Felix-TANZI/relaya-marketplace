# backend/apps/catalog/models.py
# Modèles du catalogue produits BelivaY.

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from django.db import transaction
from apps.common.models import SoftDeleteModel


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True



class ModerationStatus(models.TextChoices):
    PENDING  = 'PENDING',  'En attente'
    APPROVED = 'APPROVED', 'Validé'
    REJECTED = 'REJECTED', 'Rejeté'


class ProductCondition(models.Model):
    """
    État d'une offre (neuf, comme neuf, bon état…).
    Liste entièrement gérée par l'admin : il peut en ajouter/désactiver à volonté.
    """
    name          = models.CharField(max_length=60, unique=True, verbose_name="État")
    display_order = models.PositiveIntegerField(default=0, verbose_name="Ordre d'affichage")
    is_active     = models.BooleanField(default=True, verbose_name="Actif")

    class Meta:
        ordering            = ['display_order', 'name']
        verbose_name        = "État de produit"
        verbose_name_plural = "États de produit"

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────────────────────────────────────
# CATÉGORIE
# ─────────────────────────────────────────────────────────────────────────────


class Brand(models.Model):
    """
    Registre centralisé des marques (Rule 4 du document).
 
    Une marque est UNIVERSELLE : elle n'appartient pas à une catégorie.
    Samsung existe en Smartphones, Wearables, Écrans. Nike existe en Mode.
    L'unicité est portée par le `slug` (dérivé du name).
 
    Deux statuts :
      - is_verified=True  : marque officielle validée par l'admin BelivaY.
                            Apparaît en tête des suggestions vendeur.
      - is_verified=False : marque soumise par un vendeur, en attente de
                            validation admin. Peut être fusionnée avec une
                            marque existante ou supprimée.
    """
 
    name = models.CharField(
        max_length=120,
        unique=True,
        verbose_name="Nom de la marque",
        help_text="Nom officiel de la marque (ex : Samsung, Apple, Tecno).",
    )
    slug = models.SlugField(
        max_length=140,
        unique=True,
        verbose_name="Slug",
    )
    logo = models.ImageField(
        upload_to="brands/%Y/%m/",
        blank=True,
        null=True,
        verbose_name="Logo",
        help_text="Logo officiel de la marque (PNG transparent recommandé, 200x200 min).",
    )
    description = models.TextField(
        blank=True,
        default="",
        verbose_name="Description",
        help_text="Présentation courte de la marque, affichée sur la page marque.",
    )
    country_of_origin = models.CharField(
        max_length=60,
        blank=True,
        default="",
        verbose_name="Pays d'origine",
        help_text="Ex : Corée du Sud, USA, Chine, Hong Kong. Utile pour la transparence.",
    )
    website = models.URLField(
        blank=True,
        default="",
        verbose_name="Site officiel",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active",
        help_text="Décocher pour cacher la marque des suggestions sans la supprimer.",
    )
    is_verified = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Marque vérifiée",
        help_text=(
            "Marque officielle validée par l'admin BelivaY. "
            "Les marques non vérifiées apparaissent avec un badge et "
            "peuvent être fusionnées avec une marque officielle."
        ),
    )
    admin_note = models.TextField(
        blank=True,
        default="",
        verbose_name="Note admin",
        help_text="Note interne (ex : 'à fusionner avec Samsung', 'faux positif').",
    )
 
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
 
    class Meta:
        ordering = ["-is_verified", "name"]   # Verified d'abord, puis alpha
        verbose_name = "Marque"
        verbose_name_plural = "Marques"
        indexes = [
            models.Index(fields=["is_active", "is_verified"]),
            models.Index(fields=["name"]),
        ]
 
    def __str__(self):
        badge = " ✓" if self.is_verified else ""
        return f"{self.name}{badge}"
 
    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name) or "marque"
            self.slug = base
            counter = 1
            while Brand.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{base}-{counter}"
                counter += 1
        super().save(*args, **kwargs)



class ColorFamily(models.TextChoices):
    """
    Familles de valeurs du dictionnaire.
    - COLOR : couleurs vraies (Noir, Bleu, Rouge...)
    - FINISH : finitions et matériaux (Mat, Brillant, Titane, Aluminium...)
    """
    COLOR = "COLOR", "Couleur"
    FINISH = "FINISH", "Finition"
 
 
class ColorDictionary(models.Model):
    """
    Dictionnaire normalisé des couleurs et finitions (Rule 3 du document).
 
    Registre FERMÉ : seul l'admin peut ajouter une entrée. Les vendeurs
    choisissent obligatoirement une valeur du dictionnaire — pas de texte
    libre. Sinon on retrouve le chaos "Bleu / bleu marine / Bleu foncé /
    Navy" qui casse les filtres et l'agrégation Buy Box au niveau Variant.
 
    Contient à la fois les COLOR (Noir, Rouge...) et les FINISH (Mat,
    Brillant, Titane...) parce que la logique de traitement est identique
    et évite de dupliquer la mécanique i18n et admin.
    """
 
    # ─── Identification ────────────────────────────────────────────────
    family = models.CharField(
        max_length=8,
        choices=ColorFamily.choices,
        default=ColorFamily.COLOR,
        db_index=True,
        verbose_name="Famille",
        help_text="COLOR pour une couleur vraie, FINISH pour une finition/matériau.",
    )
    name = models.CharField(
        max_length=60,
        verbose_name="Nom (français)",
        help_text="Nom affiché en français. Ex : Noir, Titane, Mat.",
    )
    name_en = models.CharField(
        max_length=60,
        blank=True,
        default="",
        verbose_name="Nom (anglais)",
        help_text="Nom affiché en anglais. Ex : Black, Titanium, Matte.",
    )
    slug = models.SlugField(
        max_length=80,
        unique=True,
        verbose_name="Slug (identifiant technique)",
        help_text="Identifiant stable, dérivé du nom français. Ne pas modifier après création.",
    )
 
    # ─── Représentation visuelle ───────────────────────────────────────
    hex_code = models.CharField(
        max_length=7,
        blank=True,
        default="",
        verbose_name="Code hexadécimal",
        help_text=(
            "Format #RRGGBB. Utilisé pour rendre une pastille couleur "
            "côté frontend. Laisser vide pour les finitions non-colorées."
        ),
    )
    pattern_url = models.URLField(
        blank=True,
        default="",
        verbose_name="URL image motif",
        help_text=(
            "Optionnel — pour les finitions à texture visuelle (Cuir, Bois, "
            "Marbre...) ou couleurs multi-tons. URL absolue d'une image "
            "carrée, 100x100 recommandé."
        ),
    )
 
    # ─── Classification & filtrage ────────────────────────────────────
    is_neutral = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Neutre",
        help_text=(
            "Marque les couleurs neutres (Noir, Blanc, Gris, Argent, Or). "
            "Utile pour les filtres 'Couleurs neutres uniquement' des "
            "acheteurs recherchant un smartphone sobre."
        ),
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active",
        help_text=(
            "Décocher pour masquer une couleur des choix vendeur sans "
            "supprimer les valeurs existantes qui la référencent."
        ),
    )
    display_order = models.PositiveSmallIntegerField(
        default=100,
        verbose_name="Ordre d'affichage",
        help_text=(
            "Ordre dans les listes frontend. Convention : "
            "0-99 = couleurs neutres, 100-199 = couleurs primaires, "
            "200+ = couleurs secondaires et finitions."
        ),
    )
 
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
 
    class Meta:
        ordering = ["family", "display_order", "name"]
        verbose_name = "Entrée du dictionnaire couleurs/finitions"
        verbose_name_plural = "Dictionnaire couleurs & finitions"
        constraints = [
            # Un nom (français) doit être unique DANS SA FAMILLE
            # (on peut avoir COLOR "Noir" ET FINISH "Noir mat" — c'est OK,
            #  mais deux COLOR "Noir" c'est interdit)
            models.UniqueConstraint(
                fields=["family", "name"],
                name="colordict_family_name_unique",
            ),
        ]
        indexes = [
            models.Index(fields=["family", "is_active", "display_order"]),
            models.Index(fields=["is_neutral"]),
        ]
 
    def __str__(self):
        family_prefix = "🎨" if self.family == ColorFamily.COLOR else "✨"
        return f"{family_prefix} {self.name}"
 
    def clean(self):
        """
        Validation métier :
          - hex_code doit être au format #RRGGBB s'il est renseigné
          - Une entrée COLOR devrait avoir un hex_code (pas obligatoire mais recommandé)
        """
        from django.core.exceptions import ValidationError
        import re
 
        if self.hex_code:
            if not re.match(r"^#[0-9A-Fa-f]{6}$", self.hex_code):
                raise ValidationError({
                    "hex_code": "Format invalide. Attendu : #RRGGBB (ex : #FF0000).",
                })
            # Normaliser en majuscules pour cohérence
            self.hex_code = self.hex_code.upper()
 
    def save(self, *args, **kwargs):
        # Auto-slug basé sur name (français) + family pour éviter les collisions
        # inter-familles (ex : "Noir" COLOR vs "Noir" FINISH utilisent des slugs
        # différents grâce au préfixe de famille).
        if not self.slug:
            base = f"{self.family.lower()}-{slugify(self.name)}" or "entry"
            self.slug = base
            counter = 1
            while ColorDictionary.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{base}-{counter}"
                counter += 1
 
        # Force la validation à chaque save (protège contre bypass admin)
        self.full_clean(exclude=None if not self.pk else ["family", "name"])
        super().save(*args, **kwargs)

 

class Category(SoftDeleteModel):
    """
    Catégorie du catalogue BelivaY.
 
    Hiérarchie : arbre auto-référencé via `parent`. La racine a parent=None.
    Le champ `level` est calculé automatiquement et permet des filtres rapides
    (ex : "toutes les catégories de niveau 2 sous Electronics").
 
    Règles métier :
      - Une catégorie deprecated reste utilisable par les fiches existantes
        mais n'apparaît PLUS dans les formulaires de création vendeur.
      - requires_admin_approval force la modération renforcée pour toute
        MasterProduct/Offer créée dans cette catégorie (Rule 5 du document).
    """
 
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=180, unique=True)
    is_active = models.BooleanField(default=True, db_index=True)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="children",
    )
 
    # ─── Nouveaux champs  ─────────────────────────────────────
    display_order = models.PositiveIntegerField(
        default=0,
        verbose_name="Ordre d'affichage",
        help_text="Ordre dans les listes frontend (0 = premier).",
    )
    icon_name = models.CharField(
        max_length=60,
        blank=True,
        default="",
        verbose_name="Nom d'icône Lucide",
        help_text=(
            "Nom exact d'un composant lucide-react. "
            "Ex : Smartphone, Monitor, Headphones, Gamepad2. "
            "Vide = pas d'icône."
        ),
    )
    description = models.CharField(
        max_length=280,
        blank=True,
        default="",
        verbose_name="Description courte",
        help_text="Une phrase affichée en dessous du titre catégorie.",
    )
    requires_admin_approval = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Modération renforcée",
        help_text=(
            "Si activé, toute fiche/offre créée dans cette catégorie "
            "(et ses sous-catégories) exige une validation admin renforcée "
            "avant publication. Utilisé pour drones, biométrie, batteries "
            "industrielles, amplificateurs de signal (Rule 5)."
        ),
    )
    is_deprecated = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Catégorie obsolète",
        help_text=(
            "Catégorie legacy conservée pour la rétrocompatibilité. "
            "N'apparaît plus dans les nouveaux formulaires vendeur mais "
            "reste liée aux fiches existantes jusqu'à leur re-catégorisation."
        ),
    )
    level = models.PositiveSmallIntegerField(
        default=0,
        db_index=True,
        editable=False,
        verbose_name="Profondeur",
        help_text="Calculé automatiquement. 0 = racine.",
    )
    # ─────────────────────────────────────────────────────────────────
 
    # Slug unique — pas de contrainte "unique per parent" pour rester
    # compatible avec le schéma actuel (slug globalement unique).
    # Convention : les slugs de la nouvelle hiérarchie Electronics sont
    # préfixés (ex : "electronics-phones-smartphones-ios") pour éviter
    # tout conflit avec les catégories legacy plates.
 
    class Meta(SoftDeleteModel.Meta):
        ordering = ["level", "display_order", "name"]
        verbose_name = "Catégorie"
        verbose_name_plural = "Catégories"
        indexes = [
            models.Index(fields=["parent", "display_order"]),
            models.Index(fields=["is_active", "is_deprecated"]),
        ]
 
    def __str__(self):
        return self.full_path
 
    # ─── Propriétés utilitaires ────────────────────────────────────────
 
    @property
    def full_path(self) -> str:
        """
        Chemin complet lisible : "Electronics > Téléphonie > Smartphones iOS".
        Utilisé dans l'admin et pour le fil d'Ariane frontend.
        """
        parts = [self.name]
        node = self.parent
        # Garde-fou anti-boucle infinie (arbre corrompu)
        depth = 0
        while node is not None and depth < 20:
            parts.append(node.name)
            node = node.parent
            depth += 1
        return " > ".join(reversed(parts))
 
    @property
    def effective_requires_approval(self) -> bool:
        """
        Vrai si CETTE catégorie OU un de ses ancêtres exige une modération
        renforcée. Utilisé lors de la création d'une MasterProduct/Offer :
        pas besoin de cocher chaque sous-catégorie, l'héritage suffit.
        """
        if self.requires_admin_approval:
            return True
        node = self.parent
        depth = 0
        while node is not None and depth < 20:
            if node.requires_admin_approval:
                return True
            node = node.parent
            depth += 1
        return False
 
    def get_ancestors(self):
        """Liste des ancêtres du plus proche au plus lointain."""
        ancestors = []
        node = self.parent
        depth = 0
        while node is not None and depth < 20:
            ancestors.append(node)
            node = node.parent
            depth += 1
        return ancestors
 
    def get_descendants_ids(self):
        """
        Retourne tous les IDs de sous-catégories (récursif).
        Utile pour filtrer les produits d'une branche entière.
        Optimisation possible en Postgres avec un CTE récursif.
        """
        ids = set()
        stack = list(self.children.filter(deleted_at__isnull=True))
        while stack:
            node = stack.pop()
            if node.id in ids:
                continue
            ids.add(node.id)
            stack.extend(node.children.filter(deleted_at__isnull=True))
        return ids
 
    # ─── Save : calcul auto du level + garde-fous ──────────────────────
 
    def save(self, *args, **kwargs):
        # Calcul automatique du level
        if self.parent_id is None:
            self.level = 0
        else:
            # On évite un round-trip DB inutile si le parent est en mémoire
            parent = self.parent if self.parent else Category.objects.get(pk=self.parent_id)
            self.level = (parent.level or 0) + 1
 
        # Garde-fou : cycles interdits (une catégorie ne peut être son propre ancêtre)
        if self.pk and self.parent_id:
            ancestor = self.parent
            depth = 0
            while ancestor is not None and depth < 20:
                if ancestor.pk == self.pk:
                    from django.core.exceptions import ValidationError
                    raise ValidationError(
                        f"Cycle détecté : la catégorie '{self.name}' ne peut "
                        f"pas être descendante d'elle-même."
                    )
                ancestor = ancestor.parent
                depth += 1
 
        super().save(*args, **kwargs)
 
        # Si le level a changé, propager aux descendants
        # (cas rare : déplacement de branche par l'admin)
        if self.pk:
            for child in self.children.filter(deleted_at__isnull=True):
                if child.level != self.level + 1:
                    child.save(update_fields=["level"])
    


# ─────────────────────────────────────────────────────────────────────────────
# FICHE PRODUIT MAÎTRE (MasterProduct)
# ─────────────────────────────────────────────────────────────────────────────

class MasterProduct(SoftDeleteModel):
    """
    Fiche produit canonique, indépendante du vendeur.

    Une MasterProduct regroupe plusieurs offres (Product) du MÊME produit
    vendues par des vendeurs différents. Ex : la fiche "iPhone 15 128 Go"
    peut avoir 3 offres (Alice, Bruno, Carine) à des prix différents.
    """

    title       = models.CharField(max_length=200, verbose_name="Titre de la fiche")
    slug        = models.SlugField(max_length=220, unique=True)
    description = models.TextField(blank=True)
    brand       = models.CharField(max_length=120, blank=True, verbose_name="Marque")
    brand_fk = models.ForeignKey(
        "catalog.Brand",   # ← forward reference, fonctionne même si Brand
                           #   est défini après MasterProduct dans le fichier
        on_delete=models.PROTECT,   # Empêche de supprimer une marque utilisée
        related_name="master_products",
        null=True,
        blank=True,
        verbose_name="Marque (registre)",
        help_text=(
            "Marque référencée depuis le registre centralisé. "
            "Remplace progressivement le champ texte `brand`."
        ),
    )

    variant_axes = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Axes de variante",
        help_text=(
            "Liste des slugs d'attributs (avec role=AXE) autorisés pour "
            "créer des Variants de cette fiche. Ex : [\"color\", \"storage\"] "
            "pour un iPhone. Vide = fiche mono-variant (composant atomique)."
        ),
    )

    category    = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="master_products",
        verbose_name="Catégorie",
    )
    moderation_status = models.CharField(
        max_length=10, choices=ModerationStatus.choices,
        default=ModerationStatus.PENDING, db_index=True,
        verbose_name="Statut de modération",
    )
    moderated_at = models.DateTimeField(null=True, blank=True)
    moderated_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='moderated_masterproducts',
    )

    class Meta:
        ordering            = ["-created_at"]
        verbose_name        = "Fiche produit maître"
        verbose_name_plural = "Fiches produits maîtres"

    def __str__(self):
        return self.title

    @property
    def buy_box_offer(self):
        """
        Offre par défaut (PROVISOIRE) : la moins chère parmi les offres
        actives ET approuvées. L'algorithme équitable viendra en Semaine 9.
        """
        return (
            self.offers
            .filter(is_active=True, moderation_status=ModerationStatus.APPROVED)
            .order_by("price_xaf")
            .first()
        )
    
    # ─── Méthode de validation à ajouter dans MasterProduct ────────────
 
    def clean(self):
        """
        Valide variant_axes :
          - Doit être une liste de strings
          - Chaque slug doit référencer un ProductAttribute existant
          - Chaque attribut doit avoir role=AXE
          - Chaque attribut doit être universel OU appartenir à la catégorie
            de ce master (ou à un ancêtre de cette catégorie)
        """
        from django.core.exceptions import ValidationError
        super().clean() if hasattr(super(), 'clean') else None
 
        if not isinstance(self.variant_axes, list):
            raise ValidationError({
                "variant_axes": "Doit être une liste JSON."
            })
 
        if not self.variant_axes:
            return  # Vide = OK (produit atomique)
 
        # Vérifier chaque slug
        errors = []
        for slug in self.variant_axes:
            if not isinstance(slug, str):
                errors.append(f"Chaque axe doit être une chaîne, reçu : {type(slug).__name__}")
                continue
 
            attr = ProductAttribute.objects.filter(slug=slug).first()
            if attr is None:
                errors.append(f"Axe '{slug}' introuvable dans ProductAttribute.")
                continue
 
            if attr.role != AttributeRole.AXE:
                errors.append(
                    f"Attribut '{slug}' a le rôle '{attr.role}' — "
                    f"seuls les attributs avec role=AXE peuvent être des axes."
                )
                continue
 
            # Vérifier la portée : universel OU dans la branche catégorie
            if not attr.is_universal:
                if attr.category_id != self.category_id:
                    # Peut aussi être un ancêtre de la catégorie
                    ancestor_ids = [a.id for a in self.category.get_ancestors()]
                    if attr.category_id not in ancestor_ids:
                        errors.append(
                            f"Attribut '{slug}' appartient à la catégorie "
                            f"'{attr.category.name}' qui n'est ni la catégorie "
                            f"du master ni un ancêtre."
                        )
 
        if errors:
            raise ValidationError({"variant_axes": errors})

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title) or "fiche"
            self.slug = base
            counter = 1
            while MasterProduct.all_objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{base}-{counter}"
                counter += 1
        super().save(*args, **kwargs)


class MasterProductImage(models.Model):
    """Image PRO d'une fiche produit (mise en avant, vue acheteur)."""
    master     = models.ForeignKey(MasterProduct, on_delete=models.CASCADE, related_name='images')
    image      = models.ImageField(upload_to='masters/%Y/%m/')
    is_primary = models.BooleanField(default=False)
    order      = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering            = ['order', '-is_primary', '-created_at']
        verbose_name        = "Image fiche"
        verbose_name_plural = "Images fiche"

    def __str__(self):
        return f"Image fiche {self.id} — {self.master.title}"        



# ─────────────────────────────────────────────────────────────────────────────
# ATTRIBUTS PRODUIT (créés par l'admin, choisis par le vendeur)
# ─────────────────────────────────────────────────────────────────────────────


class AttributeRole(models.TextChoices):
    """
    Les 3 rôles d'attribut selon le BelivaY Product Representation Model (§3).
 
    Règle de décision (§3.1) :
      Q1. Un client choisit-il entre plusieurs valeurs pour décider quoi
          acheter ? → AXE
      Q2. Sinon, est-ce une caractéristique unique du modèle utile pour
          filtrer ? → SPEC
      Q3. Sinon, est-ce que la valeur change selon qui vend l'article ? → OFFRE
    """
    AXE = "AXE", "Axe (crée une variante)"
    SPEC = "SPEC", "Spécification (fixe du modèle, filtrable)"
    OFFRE = "OFFRE", "Offre (dépend du vendeur)"
 
 
class AttributeValueType(models.TextChoices):
    """
    Type technique des valeurs d'un attribut.
 
    Distinct du `role` (AXE/SPEC/OFFRE) et du `type` sémantique (SIZE/COLOR...).
    Détermine :
      - Comment le vendeur saisit la valeur (input HTML côté frontend)
      - D'où viennent les valeurs autorisées
      - Comment valider une valeur soumise
    """
    SELECT = "SELECT", "Liste fermée (values JSON)"
    NUMBER = "NUMBER", "Nombre (avec unit)"
    BOOL = "BOOL", "Oui/Non"
    TEXT = "TEXT", "Texte libre (à éviter — préférer SELECT)"
    COLORDICT = "COLORDICT", "Référence au dictionnaire couleurs"
    BRAND = "BRAND", "Référence au registre Brand"


class ProductAttribute(models.Model):
    """
    Attribut de produit défini par l'admin pour une catégorie donnée.
    Ex : pour la catégorie "Mode Femme" → attribut "Taille" avec valeurs ["XS","S","M","L","XL"]

    Règles :
      - Seul l'admin peut créer/modifier/supprimer des attributs.
      - Un vendeur voit les attributs de la catégorie qu'il sélectionne.
      - Le vendeur choisit uniquement parmi les valeurs définies ici.
    """

    class AttributeType(models.TextChoices):
        SIZE     = 'SIZE',     'Taille'
        COLOR    = 'COLOR',    'Couleur'
        MATERIAL = 'MATERIAL', 'Matière'
        OTHER    = 'OTHER',    'Autre'

    category = models.ForeignKey(
         Category,
         on_delete=models.CASCADE,
         related_name="attributes",
         null=True,
         blank=True,
         verbose_name="Catégorie",
         help_text=(
             "Catégorie à laquelle cet attribut s'applique. "
             "Laisser vide si is_universal=True."
         ),
    )
    name          = models.CharField(max_length=100, verbose_name="Nom de l'attribut")
    attribute_type = models.CharField(
        max_length=10, choices=AttributeType.choices, default=AttributeType.OTHER,
        verbose_name="Type",
    )
    slug = models.SlugField(
        max_length=100,
        unique=True,
        blank=True,   # blank=True temporairement pour permettre la data migration
                      # qui peuple les slugs des attributs existants
        verbose_name="Slug (identifiant technique)",
        help_text=(
            "Identifiant stable utilisé par MasterProduct.variant_axes "
            "pour référencer cet attribut. Auto-généré si vide (à partir "
            "du name). Doit être unique. Convention : préfixer par la "
            "catégorie pour les non-universels (ex : 'phone-color', "
            "'kb-switch') et laisser simple pour les universels "
            "(ex : 'bluetooth', 'weight')."
        ),
    )
 
    unit = models.CharField(
        max_length=20,
        blank=True,
        default="",
        verbose_name="Unité",
        help_text=(
            "Unité de mesure affichée à côté de la valeur. "
            "Ex : 'Go' pour un stockage, 'mAh' pour une batterie, "
            "'W' pour une puissance. Vide pour les attributs sans unité."
        ),
    )
    # Liste des valeurs possibles — ex: ["XS", "S", "M", "L", "XL"]
    values        = models.JSONField(
        default=list,
        verbose_name="Valeurs disponibles",
        help_text='Liste JSON. Ex: ["S", "M", "L"] ou ["Rouge", "Bleu"]',
    )
    role = models.CharField(
        max_length=5,
        choices=AttributeRole.choices,
        default=AttributeRole.SPEC,
        db_index=True,
        verbose_name="Rôle",
        help_text=(
            "AXE = crée une variante achetable (couleur/stockage d'un smartphone). "
            "SPEC = caractéristique fixe du modèle, filtrable. "
            "OFFRE = dépend du vendeur (état, garantie, import)."
        ),
    )
    is_universal = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Universel",
        help_text=(
            "Si activé, l'attribut s'applique à TOUTES les catégories "
            "(ex : Bluetooth, WiFi, Poids). Dans ce cas, le champ 'category' "
            "doit être laissé vide."
        ),
    )
    values_type = models.CharField(
        max_length=10,
        choices=AttributeValueType.choices,
        default=AttributeValueType.SELECT,
        verbose_name="Type de valeur",
        help_text=(
            "Détermine comment le vendeur saisit la valeur : "
            "SELECT (liste fermée), NUMBER, BOOL, TEXT, "
            "COLORDICT (piocher dans le dictionnaire couleurs), "
            "BRAND (piocher dans le registre marques)."
        ),
    )
    is_required   = models.BooleanField(default=False, verbose_name="Obligatoire")
    display_order = models.PositiveIntegerField(default=0, verbose_name="Ordre d'affichage")

    class Meta:
        ordering            = ['category', 'display_order', 'name']
        verbose_name        = "Attribut Produit"
        verbose_name_plural = "Attributs Produit"

        constraints = [
            # ... contraintes existantes préservées ...
 
            # NOUVELLE contrainte : is_universal ⇔ category IS NULL
            # Empêche les incohérences :
            #   - is_universal=True MAIS category renseignée
            #   - is_universal=False MAIS category vide
            models.CheckConstraint(
                check=(
                    models.Q(is_universal=True, category__isnull=True)
                    | models.Q(is_universal=False, category__isnull=False)
                ),
                name="attr_universal_xor_category",
            ),
        ]

    def __str__(self):
        category_label = self.category.name if self.category else "Universel"
        return f"{category_label} — {self.name}"
    
    def save(self, *args, **kwargs):
        """
        Auto-slug basé sur le name si non renseigné.
        Anti-collision : ajoute un suffixe -1, -2 en cas de doublon.
        """
        if not self.slug:
            base = slugify(self.name) or "attr"
            self.slug = base
            counter = 1
            while ProductAttribute.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{base}-{counter}"
                counter += 1
        super().save(*args, **kwargs)


# ─────────────────────────────────────────────────────────────────────────────
# PRODUIT
# ─────────────────────────────────────────────────────────────────────────────

class Product(SoftDeleteModel):
    """
    Produit mis en vente sur BelivaY.

    Logique prix :
      - price_xaf         : prix de vente final (ce que paie l'acheteur)
      - compare_at_price  : prix barré (ancien prix avant promo) — affiché rayé
      - discount_percent  : calculé automatiquement si compare_at_price est défini
      - promo_end_date    : date de fin de promotion — le frontend affiche un countdown

    Logique stock :
      - stock_threshold   : seuil alerte personnel du vendeur (nullable)
        Si null → on utilise PlatformSettings.default_stock_threshold

    Logique SKU :
      - sku auto-généré à la sauvegarde : BLV-{3 premières lettres catégorie}-{id:05d}
      - Le vendeur peut le modifier manuellement
    """

    title             = models.CharField(max_length=200)
    slug              = models.SlugField(max_length=220, unique=True)
    description       = models.TextField(blank=True)
    short_description = models.CharField(
        max_length=300, blank=True,
        help_text="Description courte pour la page produit et les aperçus.",
    )

    # ── Prix ────────────────────────────────────────────────────────────────
    price_xaf        = models.PositiveIntegerField(help_text="Prix de vente en FCFA (XAF)")
    compare_at_price = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Prix barré (avant promotion). Si renseigné, affiché rayé. Doit être > price_xaf.",
        verbose_name="Prix barré (FCFA)",
    )
    promo_end_date   = models.DateField(
        null=True, blank=True,
        help_text="Date de fin de promotion. Le frontend affiche un timer countdown.",
        verbose_name="Fin de promotion",
    )
    # Conservé pour rétrocompatibilité — remplacé progressivement par compare_at_price
    discount         = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Réduction en % (0-100). Utiliser compare_at_price de préférence.",
    )

    # ── Stock & Identification ───────────────────────────────────────────────
    sku             = models.CharField(
        max_length=60, blank=True, default='',
        verbose_name="SKU / Référence",
        help_text="Auto-généré : BLV-{CAT}-{id}. Modifiable manuellement.",
    )
    stock_threshold = models.PositiveIntegerField(
        null=True, blank=True,
        verbose_name="Seuil alerte stock",
        help_text=(
            "Quantité en dessous de laquelle une alerte stock s'affiche pour ce produit. "
            "Si vide → on utilise le seuil global de PlatformSettings."
        ),
    )

    # ── Relations ────────────────────────────────────────────────────────────
    is_active = models.BooleanField(default=True)
    category  = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
    )
    vendor    = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='products',
        null=True, blank=True,
        verbose_name="Vendeur",
    )
    master = models.ForeignKey(
        "MasterProduct",
        on_delete=models.SET_NULL,
        related_name="offers",
        null=True, blank=True,
        verbose_name="Fiche produit maître",
    )
    moderation_status = models.CharField(
        max_length=10, choices=ModerationStatus.choices,
        default=ModerationStatus.PENDING, db_index=True,
        verbose_name="Statut de modération",
    )
    moderated_at = models.DateTimeField(null=True, blank=True)
    moderated_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='moderated_products',
    )
    moderation_reason = models.TextField(blank=True, default='', verbose_name="Motif de modération")

    condition = models.ForeignKey(
        "ProductCondition", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="products", verbose_name="État",
    )
    seller_note = models.TextField(blank=True, default='', verbose_name="Note du vendeur")

    class Meta:
        ordering            = ["-created_at"]
        verbose_name        = "Produit"
        verbose_name_plural = "Produits"

    def __str__(self):
        return self.title

    @property
    def discount_percent(self) -> int:
        """
        Pourcentage de réduction calculé.
        Priorité : compare_at_price > discount (legacy).
        """
        if self.compare_at_price and self.compare_at_price > self.price_xaf:
            return round((1 - self.price_xaf / self.compare_at_price) * 100)
        return self.discount

    @property
    def is_on_promotion(self) -> bool:
        """True si le produit est en promotion active."""
        if self.compare_at_price and self.compare_at_price > self.price_xaf:
            if self.promo_end_date:
                from django.utils import timezone
                return self.promo_end_date >= timezone.now().date()
            return True
        return self.discount > 0

    def get_effective_stock_threshold(self) -> int:
        """
        Retourne le seuil d'alerte stock effectif :
        - Seuil personnel du vendeur si défini
        - Sinon seuil global depuis PlatformSettings
        """
        if self.stock_threshold is not None:
            return self.stock_threshold
        try:
            from apps.orders.models import PlatformSettings
            return PlatformSettings.get_settings().default_stock_threshold
        except Exception:
            return 5  # Fallback sécurisé

    def generate_sku(self) -> str:
        """Génère le SKU automatique : BLV-{3 lettres catégorie}-{id:05d}."""
        cat_code = (self.category.name[:3].upper() if self.category else 'GEN')
        return f"BLV-{cat_code}-{self.pk:05d}"

    def save(self, *args, **kwargs):
        # Slug auto depuis le titre
        if not self.slug:
            self.slug = slugify(self.title)
            original = self.slug
            counter  = 1
            # all_objects : on tient compte AUSSI des produits soft-deleted
            # pour ne jamais réutiliser un slug encore présent en base (unique).
            while Product.all_objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{original}-{counter}"
                counter += 1

        super().save(*args, **kwargs)

        # SKU auto après première sauvegarde (pour avoir le pk)
        if not self.sku:
            self.sku = self.generate_sku()
            Product.all_objects.filter(pk=self.pk).update(sku=self.sku)


class PromotionCampaign(TimeStampedModel):
    """
    Promotion régulière ou Flash Deal.

    Une promotion régulière est une remise simple. Un Flash Deal est limité dans
    le temps et en stock, avec validation admin et règles d'éligibilité plus
    strictes.
    """

    class CampaignType(models.TextChoices):
        REGULAR = "REGULAR", "Promotion régulière"
        FLASH = "FLASH", "Flash Deal"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Brouillon"
        PENDING = "PENDING", "En attente"
        APPROVED = "APPROVED", "Approuvée"
        REJECTED = "REJECTED", "Rejetée"
        SUSPENDED = "SUSPENDED", "Suspendue"
        EXPIRED = "EXPIRED", "Expirée"

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="promotion_campaigns")
    campaign_type = models.CharField(max_length=12, choices=CampaignType.choices, default=CampaignType.REGULAR)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="requested_promotions")
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_promotions")
    title = models.CharField(max_length=160)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    reference_price_xaf = models.PositiveIntegerField()
    promo_price_xaf = models.PositiveIntegerField()
    stock_reserved = models.PositiveIntegerField(default=0)
    stock_claimed = models.PositiveIntegerField(default=0)
    placement_fee_xaf = models.PositiveIntegerField(default=0)
    commission_uplift_points = models.PositiveIntegerField(default=0)
    rejection_reason = models.TextField(blank=True, default="")
    admin_note = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-starts_at", "-created_at"]
        verbose_name = "Campagne promotionnelle"
        verbose_name_plural = "Campagnes promotionnelles"

    def __str__(self):
        return f"{self.get_campaign_type_display()} · {self.product.title}"

    @property
    def discount_percent(self) -> int:
        if self.reference_price_xaf <= self.promo_price_xaf:
            return 0
        return round((1 - self.promo_price_xaf / self.reference_price_xaf) * 100)

    @property
    def is_active_now(self) -> bool:
        from django.utils import timezone

        now = timezone.now()
        return (
            self.status == self.Status.APPROVED
            and self.starts_at <= now <= self.ends_at
            and (self.campaign_type != self.CampaignType.FLASH or self.remaining_stock > 0)
        )

    @property
    def remaining_stock(self) -> int:
        if self.campaign_type != self.CampaignType.FLASH:
            return 0
        return max(0, self.stock_reserved - self.stock_claimed)

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.reference_price_xaf <= self.promo_price_xaf:
            raise ValidationError({"promo_price_xaf": "Le prix promo doit être inférieur au prix de référence."})
        if self.ends_at <= self.starts_at:
            raise ValidationError({"ends_at": "La fin doit être après le début."})
        if self.campaign_type == self.CampaignType.FLASH:
            duration_hours = (self.ends_at - self.starts_at).total_seconds() / 3600
            if duration_hours < 2 or duration_hours > 48:
                raise ValidationError({"ends_at": "Un Flash Deal doit durer entre 2 h et 48 h."})
            if self.stock_reserved < 5:
                raise ValidationError({"stock_reserved": "Un Flash Deal demande au moins 5 unités réservées."})
            if not 15 <= self.discount_percent <= 70:
                raise ValidationError({"promo_price_xaf": "Un Flash Deal demande une remise entre 15 % et 70 %."})


# ─────────────────────────────────────────────────────────────────────────────
# VALEURS D'ATTRIBUTS PAR PRODUIT
# ─────────────────────────────────────────────────────────────────────────────

class ProductAttributeValue(models.Model):
    """
    Valeurs d'un attribut choisies par le vendeur pour un produit donné.
    Ex : produit "Robe Wax" → attribut "Taille" → selected_values = ["S", "M", "L"]

    Le vendeur choisit uniquement parmi ProductAttribute.values.
    """
    product         = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='attribute_values',
    )
    attribute       = models.ForeignKey(
        ProductAttribute,
        on_delete=models.CASCADE,
        related_name='product_values',
    )
    selected_values = models.JSONField(
        default=list,
        help_text="Valeurs sélectionnées parmi ProductAttribute.values.",
    )

    class Meta:
        unique_together     = ('product', 'attribute')
        verbose_name        = "Valeur Attribut Produit"
        verbose_name_plural = "Valeurs Attributs Produit"

    def __str__(self):
        return f"{self.product.title} — {self.attribute.name} : {self.selected_values}"


# ─────────────────────────────────────────────────────────────────────────────
# IMAGES, MEDIA, INVENTAIRE, AVIS
# ─────────────────────────────────────────────────────────────────────────────

class ProductImage(models.Model):
    product    = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='images', verbose_name="Produit",
    )
    image      = models.ImageField(upload_to='products/%Y/%m/', verbose_name="Image")
    is_primary = models.BooleanField(default=False, verbose_name="Image principale")
    order      = models.PositiveIntegerField(default=0, verbose_name="Ordre d'affichage")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = "Image Produit"
        verbose_name_plural = "Images Produits"
        ordering            = ['order', '-is_primary', '-created_at']

    def __str__(self):
        return f"Image {self.id} — {self.product.title}"

    def save(self, *args, **kwargs):
        """
        Sauvegarde de l'image avec gestion robuste du flag is_primary.

        Contrats garantis :
          - Une seule image par produit peut être is_primary=True.
          - Si c'est la première image du produit, elle devient automatiquement
            principale (sauf si is_primary=False explicitement passé).
          - Toutes les opérations BDD se font dans une seule transaction
            atomique pour éviter les états incohérents en cas d'uploads simultanés.

        IMPORTANT : self.product DOIT être assigné avant l'appel à save().
        Si product n'est pas encore en BDD ou non assigné, on lève une erreur
        explicite (au lieu de planter sur RelatedObjectDoesNotExist).
        """
        # Garde-fou : éviter le crash silencieux si product n'est pas attaché
        if not getattr(self, 'product_id', None):
            raise ValueError(
                "ProductImage.save() appelé sans produit associé. "
                "Toujours passer product=... lors de la création."
            )

        with transaction.atomic():
            # Cas 1 — Cette image est marquée principale : on retire le flag
            # de toutes les autres images du même produit.
            if self.is_primary:
                ProductImage.objects.filter(
                    product_id=self.product_id,
                ).exclude(pk=self.pk).update(is_primary=False)

            # Cas 2 — Cette image n'est pas marquée principale, mais c'est
            # la première image du produit : on la promeut automatiquement.
            elif not ProductImage.objects.filter(
                product_id=self.product_id,
            ).exclude(pk=self.pk).exists():
                self.is_primary = True

            super().save(*args, **kwargs)


class ProductMedia(TimeStampedModel):
    product    = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="media")
    url        = models.URLField(max_length=500)
    media_type = models.CharField(
        max_length=20, choices=[("image", "image"), ("video", "video")], default="image",
    )
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.product.title} — {self.media_type}"


class Inventory(TimeStampedModel):
    product  = models.OneToOneField(Product, on_delete=models.CASCADE, related_name="inventory")
    quantity = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.product.title} — stock={self.quantity}"


class ProductReview(models.Model):
    product  = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user     = models.ForeignKey(User, on_delete=models.CASCADE, related_name='product_reviews')
    order    = models.ForeignKey(
        'orders.Order', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='product_reviews',
    )
    rating   = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Note de 1 à 5 étoiles",
    )
    title    = models.CharField(max_length=200, blank=True)
    comment  = models.TextField(blank=True)
    is_verified_purchase = models.BooleanField(default=False)
    is_approved          = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table       = 'product_reviews'
        ordering       = ['-created_at']
        unique_together = [['product', 'user']]
        indexes        = [
            models.Index(fields=['product', '-created_at']),
            models.Index(fields=['product', 'is_approved']),
        ]

    def __str__(self):
        return f"{self.user.username} — {self.product.title} ({self.rating}★)"
