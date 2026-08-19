from django.db.models import Sum
from rest_framework import serializers

from .models import ApiUsageEvent, ExternalService


class ExternalServiceSerializer(serializers.ModelSerializer):
    current_month_units = serializers.SerializerMethodField()
    current_month_cost_xaf = serializers.SerializerMethodField()
    can_call = serializers.SerializerMethodField()
    budget_exceeded = serializers.SerializerMethodField()

    class Meta:
        model = ExternalService
        fields = [
            "id",
            "key",
            "name",
            "provider",
            "service_type",
            "is_enabled",
            "unit_cost_xaf",
            "monthly_budget_xaf",
            "hard_disable_on_budget",
            "notes",
            "current_month_units",
            "current_month_cost_xaf",
            "budget_exceeded",
            "can_call",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "key", "created_at", "updated_at"]

    def _month_usage(self, obj):
        cached = getattr(obj, "_month_usage_cache", None)
        if cached is None:
            cached = obj.current_month_usage()
            obj._month_usage_cache = cached
        return cached

    def get_current_month_units(self, obj):
        return self._month_usage(obj).get("units") or 0

    def get_current_month_cost_xaf(self, obj):
        return self._month_usage(obj).get("cost") or 0

    def get_budget_exceeded(self, obj):
        return obj.is_budget_exceeded()

    def get_can_call(self, obj):
        return obj.can_call()


class ApiUsageEventSerializer(serializers.ModelSerializer):
    service_key = serializers.CharField(source="service.key", read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True)

    class Meta:
        model = ApiUsageEvent
        fields = [
            "id",
            "service",
            "service_key",
            "service_name",
            "endpoint",
            "method",
            "units",
            "estimated_cost_xaf",
            "status_code",
            "success",
            "meta",
            "created_at",
        ]
        read_only_fields = fields


class ApiUsageSummarySerializer(serializers.Serializer):
    service_id = serializers.IntegerField()
    service_key = serializers.CharField()
    service_name = serializers.CharField()
    provider = serializers.CharField()
    service_type = serializers.CharField()
    is_enabled = serializers.BooleanField()
    units = serializers.IntegerField()
    estimated_cost_xaf = serializers.DecimalField(max_digits=12, decimal_places=4)
    monthly_budget_xaf = serializers.IntegerField()
    budget_exceeded = serializers.BooleanField()


def build_usage_summary(start=None, end=None):
    services = ExternalService.objects.all().order_by("service_type", "name")
    rows = []
    for service in services:
        events = service.usage_events.all()
        if start:
            events = events.filter(created_at__gte=start)
        if end:
            events = events.filter(created_at__lte=end)
        usage = events.aggregate(units=Sum("units"), cost=Sum("estimated_cost_xaf"))
        cost = usage.get("cost") or 0
        rows.append(
            {
                "service_id": service.id,
                "service_key": service.key,
                "service_name": service.name,
                "provider": service.provider,
                "service_type": service.service_type,
                "is_enabled": service.is_enabled,
                "units": usage.get("units") or 0,
                "estimated_cost_xaf": cost,
                "monthly_budget_xaf": service.monthly_budget_xaf,
                "budget_exceeded": bool(service.monthly_budget_xaf and cost >= service.monthly_budget_xaf),
            }
        )
    return rows
