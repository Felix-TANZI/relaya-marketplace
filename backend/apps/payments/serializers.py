from rest_framework import serializers
from apps.orders.models import Order
from .models import PaymentTransaction


class PaymentInitSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    provider = serializers.ChoiceField(choices=["MTN_MOMO", "ORANGE_MONEY"])
    phone = serializers.CharField(max_length=20)

    def create(self, validated_data):
        order = Order.objects.get(id=validated_data["order_id"])

        tx = PaymentTransaction.objects.create(
            order=order,
            provider=validated_data["provider"],
            payer_phone=validated_data["phone"],
            amount_xaf=order.total_xaf,
            status=PaymentTransaction.Status.INITIATED,
            raw_payload={"mode": "mock_v1"},
        )
        return tx


class PaymentTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTransaction
        fields = ["id", "order", "provider", "status", "amount_xaf", "payer_phone", "created_at"]
