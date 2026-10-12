# backend/apps/vendors/price_duplicate_checks.py
#
# VD-PRIX-ANORMAL et VD-DOUBLON (espace vendeur autonome, 12 oct.).
#
# Tous les seuils viennent de PlatformSettings (reglables depuis l'admin,
# jamais codes en dur) : voir apps.orders.models.PlatformSettings,
# section "Anomalie de prix" / "Doublons".
#
# Principe VD-PRIX-ANORMAL : on compare au prix median des AUTRES offres de
# la MEME fiche produit (pas de la categorie entiere - une mediane de
# "Telephones" ne veut rien dire, les prix vont de 30 000 a 800 000 F). S'il
# n'y a pas assez d'offres comparables, on compare au propre prix precedent
# du vendeur (variation brutale). Le seuil bas est le plus surveille : la
# meilleure offre est celle au cout total livre le plus bas, donc un prix
# anormalement bas (erreur, arnaque, contrefacon) passerait devant tous les
# autres vendeurs s'il n'etait pas filtre.
#
# Principe VD-DOUBLON : deux cas. (1) Le MEME vendeur publie deux fois le
# meme produit (occuper plus de place) -> bloque, c'est univoque. (2) Un
# AUTRE vendeur recree une fiche qui existe deja au lieu d'y ajouter son
# offre -> on rattache silencieusement a la fiche existante (le contrat
# TypeScript du CEO a deja un champ `Publication.rattache` prevu pour
# exactement ce cas, FCH-02) plutot que de bloquer. Un "doublon probable"
# (titres semblables, pas de preuve certaine) n'est jamais bloquant : juste
# signale a un admin.

import difflib
import re
import statistics
import unicodedata


# ─────────────────────────────────────────────────────────────────────────
# Normalisation / similarite de titres (stdlib uniquement, pas de nouvelle
# dependance : difflib suffit pour un ratio de similarite fiable).
# ─────────────────────────────────────────────────────────────────────────

def normalize_title(value):
    value = unicodedata.normalize('NFKD', value or '')
    value = value.encode('ascii', 'ignore').decode('ascii').lower()
    value = re.sub(r'[^a-z0-9]+', ' ', value).strip()
    return value


def title_similarity_pct(a, b):
    """0-100. Compare les titres normalises (minuscules, sans accents, unites espacees)."""
    na, nb = normalize_title(a), normalize_title(b)
    if not na or not nb:
        return 0.0
    return difflib.SequenceMatcher(None, na, nb).ratio() * 100


# ─────────────────────────────────────────────────────────────────────────
# Empreinte d'image (dHash 64 bits, Pillow uniquement — deja une dependance
# du projet via ImageField, pas de nouvelle lib). Permet de reperer une
# photo quasi-identique sans comparer les octets bruts.
# ─────────────────────────────────────────────────────────────────────────

def compute_dhash(image_bytes):
    """Renvoie un entier 64 bits, ou None si l'image est illisible."""
    try:
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(image_bytes)).convert('L').resize((9, 8), Image.LANCZOS)
        pixels = list(img.getdata())
        bits = 0
        for row in range(8):
            for col in range(8):
                bits <<= 1
                if pixels[row * 9 + col] > pixels[row * 9 + col + 1]:
                    bits |= 1
        return bits
    except Exception:
        return None


def hamming_distance(a, b):
    return bin(a ^ b).count('1')


# ─────────────────────────────────────────────────────────────────────────
# VD-PRIX-ANORMAL
# ─────────────────────────────────────────────────────────────────────────

def check_price_anomaly(product, new_price_xaf, platform_settings):
    """
    Renvoie None (rien a signaler) ou un dict :
      {'niveau': 'signale'|'bloque'|'confirmation', 'motif': 'ecart_mediane'|'variation_brutale', ...}
    Le niveau le plus severe gagne si plusieurs regles se declenchent.
    """
    from apps.catalog.models import Product, ModerationStatus

    resultats = []

    if product.master_id:
        autres_prix = list(
            Product.objects.filter(
                master_id=product.master_id, is_active=True,
                moderation_status=ModerationStatus.APPROVED,
            ).exclude(pk=product.pk).exclude(price_xaf=0)
            .values_list('price_xaf', flat=True)
        )
        if len(autres_prix) >= platform_settings.price_anomaly_min_offers:
            mediane = statistics.median(autres_prix)
            if mediane:
                ratio_pct = new_price_xaf / mediane * 100
                low_block = float(platform_settings.price_anomaly_low_block_pct)
                high_block = float(platform_settings.price_anomaly_high_block_pct)
                low_flag = float(platform_settings.price_anomaly_low_flag_pct)
                high_flag = float(platform_settings.price_anomaly_high_flag_pct)
                if ratio_pct < low_block or ratio_pct > high_block:
                    resultats.append({
                        'niveau': 'bloque', 'motif': 'ecart_mediane',
                        'mediane': int(mediane), 'ratioPct': round(ratio_pct, 1),
                        'nbAutres': len(autres_prix),
                        'sens': 'bas' if ratio_pct < 100 else 'haut',
                    })
                elif ratio_pct < low_flag or ratio_pct > high_flag:
                    resultats.append({
                        'niveau': 'signale', 'motif': 'ecart_mediane',
                        'mediane': int(mediane), 'ratioPct': round(ratio_pct, 1),
                        'nbAutres': len(autres_prix),
                        'sens': 'bas' if ratio_pct < 100 else 'haut',
                    })

    ancien_prix = product.price_xaf
    if ancien_prix and ancien_prix > 0 and ancien_prix != new_price_xaf:
        variation_pct = abs(new_price_xaf - ancien_prix) / ancien_prix * 100
        if variation_pct > float(platform_settings.price_own_variation_block_pct):
            resultats.append({
                'niveau': 'confirmation', 'motif': 'variation_brutale',
                'ancienPrix': ancien_prix, 'nouveauPrix': new_price_xaf,
                'variationPct': round(variation_pct, 1),
            })

    if not resultats:
        return None
    ordre = {'bloque': 3, 'confirmation': 2, 'signale': 1}
    return max(resultats, key=lambda r: ordre[r['niveau']])


def apply_price_flag(product, check_result):
    """Pose/leve le signalement 'file de controle' sur le produit (niveau 'signale' seulement —
    'bloque'/'confirmation' ne sauvegardent rien tant que le vendeur n'a pas confirme)."""
    from django.utils import timezone
    # 'signale' part en file immediatement (pas de confirmation prealable).
    # 'bloque' n'arrive ici qu'APRES confirmation du vendeur — l'admin doit
    # quand meme contreler ensuite (spec : "quasi toujours un zero en trop
    # ou en moins"). 'confirmation' (variation brutale sur son propre prix)
    # ne va jamais en file : le vendeur a deja confirme que c'etait voulu.
    if check_result and check_result['niveau'] in ('signale', 'bloque'):
        sens = check_result.get('sens', 'bas')
        product.price_flag_reason = 'ecart_mediane_bas' if sens == 'bas' else 'ecart_mediane_haut'
        product.price_flag_at = timezone.now()
        product.save(update_fields=['price_flag_reason', 'price_flag_at', 'updated_at'])


# ─────────────────────────────────────────────────────────────────────────
# VD-DOUBLON
# ─────────────────────────────────────────────────────────────────────────

def _main_image_bytes(obj):
    """obj : Product ou MasterProduct. Renvoie les octets de la photo principale, ou None."""
    try:
        images = obj.images.filter(is_primary=True).first() or obj.images.first()
        if images and images.image:
            images.image.open('rb')
            return images.image.read()
    except Exception:
        return None
    return None


def _product_barcode(product):
    if product.variant_id and getattr(product.variant, 'barcode', None):
        return product.variant.barcode
    if product.variant_id and getattr(product.variant, 'sku', None):
        return product.variant.sku
    return None


def check_same_vendor_duplicate(product, platform_settings):
    """
    Cas (1) : le MEME vendeur publie-t-il deja un produit quasi-identique ?
    Renvoie un Product existant (le doublon) ou None.
    """
    from apps.catalog.models import Product

    autres = Product.objects.filter(
        vendor_id=product.vendor_id, is_active=True,
    ).exclude(pk=product.pk).select_related('variant', 'category')

    barcode = _product_barcode(product)
    if barcode:
        for autre in autres:
            if _product_barcode(autre) == barcode:
                return autre

    image_bytes = _main_image_bytes(product)
    if image_bytes:
        hash_produit = compute_dhash(image_bytes)
        if hash_produit is not None:
            seuil = platform_settings.duplicate_image_hash_max_distance
            for autre in autres.filter(category_id=product.category_id)[:100]:
                autre_bytes = _main_image_bytes(autre)
                if not autre_bytes:
                    continue
                hash_autre = compute_dhash(autre_bytes)
                if hash_autre is not None and hamming_distance(hash_produit, hash_autre) <= seuil:
                    return autre
    return None


def check_cross_vendor_duplicate_fiche(product, title, category, platform_settings):
    """
    Cas (2) : une fiche (MasterProduct) d'un AUTRE vendeur correspond-elle
    deja a ce produit ? Renvoie (niveau, MasterProduct|None) avec
    niveau in ('certain', 'probable', None).

    'certain' (code-barres ou photo) -> a rattacher automatiquement.
    'probable' (titre seulement) -> a signaler a un admin, jamais bloquant.
    """
    from apps.catalog.models import MasterProduct, ModerationStatus, ProductVariant
    from django.db.models import Q

    barcode = _product_barcode(product)
    if barcode:
        master_id = ProductVariant.objects.filter(
            Q(sku=barcode) | Q(barcode=barcode), is_active=True,
            moderation_status=ModerationStatus.APPROVED,
        ).exclude(master_id=product.master_id).values_list('master_id', flat=True).first()
        if master_id:
            master = MasterProduct.objects.filter(pk=master_id).first()
            if master:
                return 'certain', master

    if category:
        image_bytes = _main_image_bytes(product)
        if image_bytes:
            hash_produit = compute_dhash(image_bytes)
            if hash_produit is not None:
                seuil = platform_settings.duplicate_image_hash_max_distance
                candidats = MasterProduct.objects.filter(
                    category=category, moderation_status=ModerationStatus.APPROVED,
                ).exclude(pk=product.master_id).prefetch_related('images')[:150]
                for master in candidats:
                    master_bytes = _main_image_bytes(master)
                    if not master_bytes:
                        continue
                    hash_master = compute_dhash(master_bytes)
                    if hash_master is not None and hamming_distance(hash_produit, hash_master) <= seuil:
                        return 'certain', master

    if title and category:
        seuil_titre = float(platform_settings.duplicate_title_similarity_pct)
        meilleur, meilleur_score = None, 0.0
        brand = product.master.brand if product.master_id else ''
        qs = MasterProduct.objects.filter(
            category=category, moderation_status=ModerationStatus.APPROVED,
        ).exclude(pk=product.master_id)
        if brand:
            qs = qs.filter(brand__iexact=brand)
        for master in qs[:300]:
            score = title_similarity_pct(title, master.title)
            if score > meilleur_score:
                meilleur, meilleur_score = master, score
        if meilleur and meilleur_score >= seuil_titre:
            return 'probable', meilleur

    return None, None


def apply_duplicate_flag(product, master):
    from django.utils import timezone
    product.duplicate_flag_master = master
    product.duplicate_flag_at = timezone.now()
    product.save(update_fields=['duplicate_flag_master', 'duplicate_flag_at', 'updated_at'])
