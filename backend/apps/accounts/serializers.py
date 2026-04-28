# backend/apps/accounts/serializers.py
# Serializers pour la gestion des utilisateurs et de l'authentification.
# Utilise le modèle User intégré de Django.

from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from apps.catalog.models import Product
from apps.catalog.serializers import ProductSerializer
from .models import CourierProfile, UserProfile, UserFavorite, UserNotification


class CourierProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourierProfile
        fields = [
            "id",
            "phone",
            "city",
            "zones",
            "vehicle_type",
            "id_card",
            "is_active",
            "is_approved",
            "is_online",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_active", "is_approved", "is_online", "created_at", "updated_at"]


class CourierApplicationSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)
    city = serializers.CharField(max_length=80)
    zones = serializers.ListField(
        child=serializers.CharField(max_length=60),
        allow_empty=False,
    )
    vehicle_type = serializers.ChoiceField(choices=CourierProfile.VehicleType.choices)
    id_card = serializers.CharField(max_length=120)

    def create(self, validated_data):
        user = self.context["request"].user
        courier, _ = CourierProfile.objects.update_or_create(
            user=user,
            defaults={
                **validated_data,
                "is_active": True,
                "is_online": False,
            },
        )
        return courier

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.is_online = False
        instance.save()
        return instance


class UserSerializer(serializers.ModelSerializer):
    is_vendor = serializers.SerializerMethodField()
    is_courier = serializers.SerializerMethodField()
    courier_status = serializers.SerializerMethodField()
    courier_profile = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    newsletter_subscribed = serializers.SerializerMethodField()
    sms_notifications = serializers.SerializerMethodField()
    loyalty_points = serializers.SerializerMethodField()
    loyalty_tier = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "date_joined",
            "is_staff",
            "is_superuser",
            "is_vendor",
            "is_courier",
            "courier_status",
            "courier_profile",
            "phone",
            "avatar_url",
            "newsletter_subscribed",
            "sms_notifications",
            "loyalty_points",
            "loyalty_tier",
        ]
        read_only_fields = fields
    
    def get_is_vendor(self, obj):
        """Vérifier si l'utilisateur a un profil vendeur actif"""
        return hasattr(obj, 'vendor_profile') and obj.vendor_profile.status == 'approved'

    def get_is_courier(self, obj):
        courier = getattr(obj, "courier_profile", None)
        return bool(courier and courier.is_approved and courier.is_active)

    def get_courier_status(self, obj):
        courier = getattr(obj, "courier_profile", None)
        if not courier:
            return "not_applied"
        if courier.is_approved and courier.is_active:
            return "approved"
        return "pending"

    def get_courier_profile(self, obj):
        courier = getattr(obj, "courier_profile", None)
        if not courier:
            return None
        return CourierProfileSerializer(courier).data

    def _get_profile(self, obj):
        return getattr(obj, 'profile', None)

    def get_phone(self, obj):
        profile = self._get_profile(obj)
        return profile.phone if profile else None

    def get_avatar_url(self, obj):
        profile = self._get_profile(obj)
        if profile and profile.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(profile.avatar.url)
            return profile.avatar.url
        return None

    def get_newsletter_subscribed(self, obj):
        profile = self._get_profile(obj)
        return profile.newsletter_subscribed if profile else True

    def get_sms_notifications(self, obj):
        profile = self._get_profile(obj)
        return profile.sms_notifications if profile else True

    def get_loyalty_points(self, obj):
        return obj.orders.count() * 100

    def get_loyalty_tier(self, obj):
        points = self.get_loyalty_points(obj)
        if points >= 1000:
            return "Gold"
        if points >= 500:
            return "Silver"
        return "Bronze"


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "password2", "first_name", "last_name"]

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Les mots de passe ne correspondent pas."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer pour le profil utilisateur (lecture et modification)
    """
    is_vendor = serializers.SerializerMethodField()
    is_courier = serializers.SerializerMethodField()
    courier_status = serializers.SerializerMethodField()
    courier_profile = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    newsletter_subscribed = serializers.SerializerMethodField()
    sms_notifications = serializers.SerializerMethodField()
    loyalty_points = serializers.SerializerMethodField()
    loyalty_tier = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'date_joined',
            'is_vendor',
            'is_courier',
            'courier_status',
            'courier_profile',
            'phone',
            'avatar_url',
            'newsletter_subscribed',
            'sms_notifications',
            'loyalty_points',
            'loyalty_tier',
        ]
        read_only_fields = ['id', 'username', 'date_joined', 'is_vendor', 'avatar_url', 'loyalty_points', 'loyalty_tier']
    
    def get_is_vendor(self, obj):
        """Vérifier si l'utilisateur a un profil vendeur actif"""
        return hasattr(obj, 'vendor_profile') and obj.vendor_profile.status == 'approved'

    def get_is_courier(self, obj):
        courier = getattr(obj, "courier_profile", None)
        return bool(courier and courier.is_approved and courier.is_active)

    def get_courier_status(self, obj):
        courier = getattr(obj, "courier_profile", None)
        if not courier:
            return "not_applied"
        if courier.is_approved and courier.is_active:
            return "approved"
        return "pending"

    def get_courier_profile(self, obj):
        courier = getattr(obj, "courier_profile", None)
        if not courier:
            return None
        return CourierProfileSerializer(courier).data

    def _get_profile(self, obj):
        return getattr(obj, 'profile', None)

    def get_phone(self, obj):
        profile = self._get_profile(obj)
        return profile.phone if profile else None

    def get_avatar_url(self, obj):
        profile = self._get_profile(obj)
        if profile and profile.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(profile.avatar.url)
            return profile.avatar.url
        return None

    def get_newsletter_subscribed(self, obj):
        profile = self._get_profile(obj)
        return profile.newsletter_subscribed if profile else True

    def get_sms_notifications(self, obj):
        profile = self._get_profile(obj)
        return profile.sms_notifications if profile else True

    def get_loyalty_points(self, obj):
        return obj.orders.count() * 100

    def get_loyalty_tier(self, obj):
        points = self.get_loyalty_points(obj)
        if points >= 1000:
            return "Gold"
        if points >= 500:
            return "Silver"
        return "Bronze"


class UserProfileUpdateSerializer(serializers.Serializer):
    """
    Serializer pour la mise à jour du profil
    """
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    bio = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    newsletter_subscribed = serializers.BooleanField(required=False)
    sms_notifications = serializers.BooleanField(required=False)
        
    def validate_email(self, value):
        """Vérifier que l'email n'est pas déjà utilisé par un autre utilisateur"""
        user = self.context['request'].user
        if User.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value

    def update(self, instance, validated_data):
        profile, _ = UserProfile.objects.get_or_create(user=instance)

        for field in ['email', 'first_name', 'last_name']:
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.save()

        for field in ['phone', 'bio', 'newsletter_subscribed', 'sms_notifications']:
            if field in validated_data:
                setattr(profile, field, validated_data[field])
        profile.save()

        return instance


class AvatarUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['avatar']


class FavoriteSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = UserFavorite
        fields = ['id', 'product', 'product_id', 'created_at']
        read_only_fields = ['id', 'product', 'created_at']

    def validate_product_id(self, value):
        if not Product.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Produit introuvable.")
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        favorite, _ = UserFavorite.objects.get_or_create(
            user=user,
            product_id=validated_data['product_id'],
        )
        return favorite


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserNotification
        fields = [
            'id',
            'title',
            'message',
            'notification_type',
            'action_url',
            'is_read',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields
