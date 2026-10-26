# backend/apps/payments/bridge/gestes.py
# Spec v2.1, R25.1 : un geste commercial NE DOIT JAMAIS depasser commission_b de la commande. Le pont lit la commission
# figee a la commande (CommissionSousCommande) : seul endroit du module financier autorise a lire les commandes (P1).


def commission_de_la_commande(order_id: int) -> int:
    from django.db.models import Sum

    from apps.orders.models import CommissionSousCommande

    return int(CommissionSousCommande.objects.filter(order_id=order_id).aggregate(t=Sum("commission_b"))["t"] or 0)


def commande_du_client(order_id: int, user) -> bool:
    from apps.orders.models import Order

    return Order.objects.filter(pk=order_id, user=user).exists()
