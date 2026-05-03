# backend/apps/vendors/chart_views.py
# Endpoints analytiques du dashboard vendeur.
# Contient : full_stats (8 KPIs + alertes stock + performance),
#            heatmap (24h + 7j), chart_data (ventes par période).

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum, Count, Avg
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .models import VendorProfile
from apps.orders.models import OrderItem, Order
from apps.catalog.models import Product, ProductReview


def _get_active_vendor(request):
    """Retourne le VendorProfile si actif, sinon une Response d'erreur."""
    try:
        vp = VendorProfile.objects.get(user=request.user)
    except VendorProfile.DoesNotExist:
        return None, Response({'detail': 'Profil vendeur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    if not vp.is_active_vendor:
        return None, Response({'detail': 'Compte vendeur non approuvé.'}, status=status.HTTP_403_FORBIDDEN)
    return vp, None


# ─────────────────────────────────────────────
# ENDPOINT 1 : STATISTIQUES COMPLÈTES
# GET /api/vendors/full-stats/
# ─────────────────────────────────────────────

@extend_schema(tags=["Vendors"], summary="Get vendor full dashboard stats")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_full_stats(request):
    """
    Retourne tous les KPIs + métriques de performance du dashboard vendeur.
    """
    _, err = _get_active_vendor(request)
    if err:
        return err

    now = timezone.now()
    month_start     = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_month_end  = month_start - timedelta(seconds=1)
    prev_month_start = prev_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # ── Items vendeur sur commandes payées ──
    paid_items = OrderItem.objects.filter(
        product__vendor=request.user,
        order__payment_status='PAID',
    )

    # ── Revenus ──
    total_revenue   = float(paid_items.aggregate(t=Sum('line_total_xaf'))['t'] or 0)
    monthly_revenue = float(paid_items.filter(order__created_at__gte=month_start).aggregate(t=Sum('line_total_xaf'))['t'] or 0)
    prev_revenue    = float(paid_items.filter(order__created_at__gte=prev_month_start, order__created_at__lte=prev_month_end).aggregate(t=Sum('line_total_xaf'))['t'] or 0)
    revenue_trend   = round(((monthly_revenue - prev_revenue) / prev_revenue) * 100, 1) if prev_revenue > 0 else None

    # ── Commandes ──
    total_orders    = paid_items.values('order').distinct().count()
    monthly_orders  = paid_items.filter(order__created_at__gte=month_start).values('order').distinct().count()
    prev_orders     = paid_items.filter(order__created_at__gte=prev_month_start, order__created_at__lte=prev_month_end).values('order').distinct().count()
    orders_trend    = round(((monthly_orders - prev_orders) / prev_orders) * 100, 1) if prev_orders > 0 else None

    # Commandes en attente (payées mais fulfillment PENDING)
    pending_orders_count = Order.objects.filter(
        items__product__vendor=request.user,
        payment_status='PAID',
        fulfillment_status='PENDING',
    ).distinct().count()

    # ── Produits ──
    products = Product.objects.filter(vendor=request.user).select_related('inventory')
    total_products  = products.count()
    active_products = products.filter(is_active=True).count()

    # Stock faible (≤ 3 unités)
    low_stock_items = []
    for p in products.filter(is_active=True):
        try:
            qty = p.inventory.quantity
        except Exception:
            qty = 0
        if qty <= 3:
            low_stock_items.append({
                'id':             p.id,
                'title':          p.title,
                'stock_quantity': qty,
            })

    # ── Clients uniques ──
    unique_customers = paid_items.values('order__user').distinct().count()

    # ── Unités vendues (total qty) ──
    total_sales_count = paid_items.aggregate(total_qty=Sum('qty'))['total_qty'] or 0

    # ── Panier moyen ──
    avg_order_value = round(total_revenue / total_orders, 0) if total_orders > 0 else 0

    # ── Taux de retour (remboursements / payées) ──
    refunded_orders = Order.objects.filter(
        items__product__vendor=request.user,
        payment_status='REFUNDED',
    ).distinct().count()
    return_rate = round((refunded_orders / total_orders) * 100, 1) if total_orders > 0 else 0

    # ── Taux de fulfillment (livrées / payées) ──
    delivered_orders = Order.objects.filter(
        items__product__vendor=request.user,
        payment_status='PAID',
        fulfillment_status='DELIVERED',
    ).distinct().count()
    fulfillment_rate = round((delivered_orders / total_orders) * 100, 1) if total_orders > 0 else 0

    # ── Note boutique (avis approuvés) ──
    rating_data  = ProductReview.objects.filter(product__vendor=request.user, is_approved=True).aggregate(avg=Avg('rating'), count=Count('id'))
    shop_rating  = round(float(rating_data['avg']), 1) if rating_data['avg'] else None
    reviews_count = rating_data['count'] or 0

    # ── Top 5 produits par revenus ──
    top_products_qs = (
        paid_items.values('product__id', 'product__title')
        .annotate(revenue=Sum('line_total_xaf'), sales_count=Count('id'))
        .order_by('-revenue')[:5]
    )
    top_products = []
    for item in top_products_qs:
        image_url = None
        try:
            p = Product.objects.get(id=item['product__id'])
            img = p.images.filter(is_primary=True).first() or p.images.first()
            if img and img.image:
                image_url = request.build_absolute_uri(img.image.url)
        except Exception:
            pass
        top_products.append({
            'id':          item['product__id'],
            'title':       item['product__title'],
            'revenue':     float(item['revenue'] or 0),
            'sales_count': item['sales_count'],
            'image_url':   image_url,
        })

    return Response({
        # Revenus
        'total_revenue':        total_revenue,
        'monthly_revenue':      monthly_revenue,
        'revenue_trend':        revenue_trend,
        # Commandes
        'total_orders':         total_orders,
        'monthly_orders':       monthly_orders,
        'orders_trend':         orders_trend,
        'pending_orders_count': pending_orders_count,
        # Produits
        'total_products':       total_products,
        'active_products':      active_products,
        'low_stock_products':   len(low_stock_items),
        'low_stock_items':      low_stock_items,
        # Clients
        'unique_customers':     unique_customers,
        'total_sales_count':    int(total_sales_count),
        # Métriques
        'avg_order_value':      avg_order_value,
        'return_rate':          return_rate,
        'fulfillment_rate':     fulfillment_rate,
        # Note
        'shop_rating':          shop_rating,
        'reviews_count':        reviews_count,
        # Top produits
        'top_products':         top_products,
    })


# ─────────────────────────────────────────────
# ENDPOINT 2 : HEATMAP (24h + 7 jours)
# GET /api/vendors/heatmap/
# ─────────────────────────────────────────────

@extend_schema(tags=["Vendors"], summary="Get vendor sales heatmap (24h + 7 days)")
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_heatmap(request):
    """Intensité des ventes par heure (0-23) et par jour de la semaine sur 30 jours."""
    _, err = _get_active_vendor(request)
    if err:
        return err

    now   = timezone.now()
    start = now - timedelta(days=30)

    base = OrderItem.objects.filter(
        product__vendor=request.user,
        order__payment_status='PAID',
        order__created_at__gte=start,
    ).select_related('order')

    # ── 24h ──
    hours_raw = {}
    for item in base:
        h = item.order.created_at.hour
        if h not in hours_raw:
            hours_raw[h] = {'orders': 0, 'revenue': 0.0}
        hours_raw[h]['orders']  += 1
        hours_raw[h]['revenue'] += float(item.line_total_xaf or 0)

    max_hr = max((v['revenue'] for v in hours_raw.values()), default=1) or 1
    hours  = [
        {
            'hour':      h,
            'orders':    hours_raw.get(h, {}).get('orders', 0),
            'revenue':   hours_raw.get(h, {}).get('revenue', 0.0),
            'intensity': round(hours_raw.get(h, {}).get('revenue', 0.0) / max_hr, 3),
        }
        for h in range(24)
    ]

    # ── 7 jours ──
    LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    days_raw = {}
    for item in base:
        d = item.order.created_at.weekday()
        if d not in days_raw:
            days_raw[d] = {'orders': 0, 'revenue': 0.0}
        days_raw[d]['orders']  += 1
        days_raw[d]['revenue'] += float(item.line_total_xaf or 0)

    max_day = max((v['revenue'] for v in days_raw.values()), default=1) or 1
    days    = [
        {
            'day':       LABELS[d],
            'orders':    days_raw.get(d, {}).get('orders', 0),
            'revenue':   days_raw.get(d, {}).get('revenue', 0.0),
            'intensity': round(days_raw.get(d, {}).get('revenue', 0.0) / max_day, 3),
        }
        for d in range(7)
    ]

    return Response({'hours': hours, 'days': days})


# ─────────────────────────────────────────────
# ENDPOINT 3 : GRAPHIQUE VENTES (7d / 30d / 12m)
# GET /api/vendors/chart/?period=7d
# ─────────────────────────────────────────────

@extend_schema(
    tags=["Vendors"],
    summary="Get vendor sales chart data",
    parameters=[
        OpenApiParameter(name='period', description='7d | 30d | 12m', required=False, type=str, default='7d'),
    ],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_chart_data(request):
    """Ventes réelles groupées par jour (7d/30d) ou par mois (12m)."""
    _, err = _get_active_vendor(request)
    if err:
        return err

    period = request.query_params.get('period', '7d')
    now    = timezone.now()

    base = OrderItem.objects.filter(
        product__vendor=request.user,
        order__payment_status='PAID',
    )

    result = []

    if period in ('7d', '30d'):
        days = 7 if period == '7d' else 30
        for i in range(days - 1, -1, -1):
            day = (now - timedelta(days=i)).date()
            day_items = base.filter(order__created_at__date=day)
            revenue   = float(day_items.aggregate(t=Sum('line_total_xaf'))['t'] or 0)
            orders    = day_items.values('order').distinct().count()
            label     = (now - timedelta(days=i)).strftime('%a') if period == '7d' else (now - timedelta(days=i)).strftime('%d/%m')
            result.append({'label': label, 'value': revenue, 'orders': orders})

    elif period == '12m':
        for i in range(11, -1, -1):
            month_offset = now.month - i
            year         = now.year + (month_offset - 1) // 12
            month        = ((month_offset - 1) % 12) + 1
            m_start      = now.replace(year=year, month=month, day=1, hour=0, minute=0, second=0, microsecond=0)
            next_month   = month % 12 + 1
            next_year    = year + (1 if month == 12 else 0)
            m_end        = m_start.replace(year=next_year, month=next_month)
            m_items      = base.filter(order__created_at__gte=m_start, order__created_at__lt=m_end)
            revenue      = float(m_items.aggregate(t=Sum('line_total_xaf'))['t'] or 0)
            orders       = m_items.values('order').distinct().count()
            result.append({'label': m_start.strftime('%b'), 'value': revenue, 'orders': orders})

    else:
        return Response({'detail': 'Période invalide. Valeurs : 7d, 30d, 12m.'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({'period': period, 'data': result})