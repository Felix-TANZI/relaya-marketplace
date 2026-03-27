# backend/apps/accounts/serializers.py
# Serializers pour la gestion des utilisateurs et de l'authentification.
# Utilise le modèle User intégré de Django.

from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from apps.catalog.models import Product
from apps.catalog.serializers import ProductSerializer
from .models import UserProfile, UserFavorite, UserNotification


class UserSerializer(serializers.ModelSerializer):
    is_vendor = serializers.SerializerMethodField()
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
            "is_vendor",
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
