# backend/apps/orders/serializers.py
# Serializers pour la gestion des commandes et des articles de commande.

from rest_framework import serializers
from django.db import transaction

from apps.catalog.models import Product, Inventory
from .models import Order, OrderItem


class OrderItemCreateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    qty = serializers.IntegerField(min_value=1)


class OrderCreateSerializer(serializers.Serializer):
    city = serializers.ChoiceField(choices=[("YAOUNDE", "YAOUNDE"), ("DOUALA", "DOUALA")])
    address = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=20)
    note = serializers.CharField(required=False, allow_blank=True)

    items = OrderItemCreateSerializer(many=True)

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")

        # Calculate totals + stock checks
        subtotal = 0
        order_items = []

        for it in items_data:
            product = Product.objects.select_for_update().get(id=it["product_id"])
            qty = int(it["qty"])

            inv = Inventory.objects.select_for_update().get(product=product)
            if inv.quantity < qty:
                raise serializers.ValidationError(
                    {"items": f"Stock insuffisant pour '{product.title}'. Stock={inv.quantity}, demandé={qty}"}
                )

            line_total = product.price_xaf * qty
            subtotal += line_total
            order_items.append((product, qty, line_total))

        delivery_fee = 0  # v1: free (we'll add later)
        total = subtotal + delivery_fee

        # Récupérer le user depuis le contexte
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None

        order = Order.objects.create(
            user=user,
            customer_phone=validated_data["phone"],
            city=validated_data["city"],
            address=validated_data["address"],
            note=validated_data.get("note", ""),
            subtotal_xaf=subtotal,
            delivery_fee_xaf=delivery_fee,
            total_xaf=total,
            status=Order.Status.PENDING_PAYMENT,
        )

        # Create items and decrement stock
        for product, qty, line_total in order_items:
            OrderItem.objects.create(
                order=order,
                product=product,
                title_snapshot=product.title,
                price_xaf_snapshot=product.price_xaf,
                qty=qty,
                line_total_xaf=line_total,
            )
            inv = Inventory.objects.select_for_update().get(product=product)
            inv.quantity -= qty
            inv.save(update_fields=["quantity", "updated_at"])

        return order


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "product", "title_snapshot", "price_xaf_snapshot", "qty", "line_total_xaf"]


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "city",
            "address",
            "note",
            "customer_phone",
            "subtotal_xaf",
            "delivery_fee_xaf",
            "total_xaf",
            "created_at",
            "items",
        ]
