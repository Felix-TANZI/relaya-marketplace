# backend/apps/accounts/serializers.py
# Serializers pour la gestion des utilisateurs et de l'authentification.
# Utilise le modèle User intégré de Django.

from rest_framework import serializers
from django.contrib.auth.models import User
from django.db.models import Q
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from apps.catalog.models import Product
from apps.catalog.serializers import ProductSerializer
from .models import (
    AppRelease,
    CourierProfile,
    DeliveryOrganizationProfile,
    PayoutAccount,
    RelayPointProfile,
    RewardAccount,
    RewardTransaction,
    UserCart,
    UserProfile,
    UserFavorite,
    UserNotification,
)
from apps.common.phone import normalize_cameroon_phone
from apps.common.images import ImageOptimizationError, optimize_uploaded_image


def user_with_email_exists(email: str, exclude_user_id=None) -> bool:
    email = (email or "").strip()
    if not email:
        return False
    qs = User.objects.filter(email__iexact=email)
    if exclude_user_id:
        qs = qs.exclude(id=exclude_user_id)
    return qs.exists()


def users_with_phone(phone: str, exclude_user_id=None):
    normalized = normalize_cameroon_phone(phone)
    if not normalized["is_valid"]:
        return User.objects.none()
    variants = {
        normalized["national"],
        normalized["e164"],
        f"237{normalized['national']}",
    }
    qs = User.objects.filter(
        Q(profile__phone__in=variants)
        | Q(courier_profile__phone__in=variants)
        | Q(delivery_organization_profile__phone__in=variants)
        | Q(relay_point_profile__phone__in=variants)
        | Q(vendor_profile__phone__in=variants)
    ).distinct()
    if exclude_user_id:
        qs = qs.exclude(id=exclude_user_id)
    return qs


def resolve_login_identifier(identifier: str) -> str:
    """
    Convertit username/email/téléphone en username Django.

    SimpleJWT authentifie ensuite normalement avec username + password.
    Si un email ou numéro correspond à plusieurs comptes, on bloque pour éviter
    une connexion ambiguë.
    """
    identifier = (identifier or "").strip()
    if not identifier:
        return identifier

    if "@" in identifier:
        matches = User.objects.filter(email__iexact=identifier)
        if matches.count() == 1:
            return matches.first().username
        if matches.count() > 1:
            raise serializers.ValidationError({
                "username": "Plusieurs comptes utilisent cet email. Contactez le support BelivaY."
            })
        return identifier

    normalized = normalize_cameroon_phone(identifier)
    if normalized["is_valid"]:
        phone_values = {identifier, normalized["national"], normalized["e164"], f"237{normalized['national']}"}
        matches = User.objects.filter(
            Q(profile__phone__in=phone_values)
            | Q(courier_profile__phone__in=phone_values)
            | Q(delivery_organization_profile__phone__in=phone_values)
            | Q(relay_point_profile__phone__in=phone_values)
            | Q(vendor_profile__phone__in=phone_values)
        ).distinct()
        if matches.count() == 1:
            return matches.first().username
        if matches.count() > 1:
            raise serializers.ValidationError({
                "username": "Plusieurs comptes utilisent ce numero. Connectez-vous avec votre username."
            })
    return identifier


class BelivayTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        attrs = attrs.copy()
        attrs["username"] = resolve_login_identifier(attrs.get("username", ""))
        return super().validate(attrs)


class CourierProfileSerializer(serializers.ModelSerializer):
    delivery_organization_name = serializers.CharField(
        source="delivery_organization.company_name",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = CourierProfile
        fields = [
            "id",
            "delivery_organization",
            "delivery_organization_name",
            "phone",
            "city",
            "zones",
            "vehicle_type",
            "max_active_shipments",
            "id_card",
            "preferred_language",
            "gps_permission_granted",
            "camera_permission_granted",
            "is_active",
            "is_approved",
            "is_online",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "delivery_organization_name", "is_active", "is_approved", "is_online", "created_at", "updated_at"]


class DeliveryOrganizationProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryOrganizationProfile
        fields = [
            "id",
            "company_name",
            "manager_name",
            "phone",
            "city",
            "zones",
            "allowed_vehicle_types",
            "max_active_shipments",
            "transport_insurance_verified",
            "address",
            "contract_reference",
            "status",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class RelayPointProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = RelayPointProfile
        fields = [
            "id",
            "name",
            "manager_name",
            "phone",
            "city",
            "zones",
            "address",
            "relay_code",
            "opening_hours",
            "storage_capacity",
            "status",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PhoneValidationSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=30)

    def validate_phone(self, value):
        normalized = normalize_cameroon_phone(value)
        if not normalized["is_valid"]:
            raise serializers.ValidationError("Numero camerounais invalide ou operateur non reconnu.")
        return value

    def to_representation(self, instance):
        phone = instance.get("phone") if isinstance(instance, dict) else self.validated_data["phone"]
        return normalize_cameroon_phone(phone)


class PayoutAccountSerializer(serializers.ModelSerializer):
    masked_phone = serializers.SerializerMethodField()

    class Meta:
        model = PayoutAccount
        fields = [
            "id",
            "owner_role",
            "label",
            "phone_e164",
            "national_number",
            "operator",
            "status",
            "is_primary",
            "masked_phone",
            "verified_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "phone_e164",
            "national_number",
            "operator",
            "status",
            "verified_at",
            "created_at",
            "updated_at",
        ]

    def get_masked_phone(self, obj):
        if not obj.national_number:
            return ""
        return f"+237 {obj.national_number[:3]} *** {obj.national_number[-3:]}"


class PayoutAccountCreateSerializer(serializers.Serializer):
    owner_role = serializers.ChoiceField(choices=PayoutAccount.OwnerRole.choices)
    phone = serializers.CharField(max_length=30)
    label = serializers.CharField(max_length=120, required=False, allow_blank=True)
    is_primary = serializers.BooleanField(required=False, default=True)

    def validate(self, data):
        normalized = normalize_cameroon_phone(data["phone"])
        if not normalized["is_valid"] or not normalized["is_mobile"]:
            raise serializers.ValidationError({"phone": "Utilisez un numero mobile camerounais valide."})

        user = self.context["request"].user
        role = data["owner_role"]
        role_profile_map = {
            PayoutAccount.OwnerRole.VENDOR: "vendor_profile",
            PayoutAccount.OwnerRole.COURIER: "courier_profile",
            PayoutAccount.OwnerRole.DELIVERY_ORGANIZATION: "delivery_organization_profile",
            PayoutAccount.OwnerRole.RELAY_POINT: "relay_point_profile",
        }
        if not hasattr(user, role_profile_map[role]):
            raise serializers.ValidationError({
                "owner_role": "Ce compte utilisateur n'a pas ce role operationnel."
            })
        data["normalized_phone"] = normalized
        return data

    def create(self, validated_data):
        import random

        user = self.context["request"].user
        normalized = validated_data["normalized_phone"]
        is_primary = validated_data.get("is_primary", True)
        if is_primary:
            PayoutAccount.objects.filter(
                user=user,
                owner_role=validated_data["owner_role"],
                is_primary=True,
            ).update(is_primary=False)

        account, _ = PayoutAccount.objects.update_or_create(
            user=user,
            owner_role=validated_data["owner_role"],
            phone_e164=normalized["e164"],
            defaults={
                "label": validated_data.get("label", ""),
                "national_number": normalized["national"],
                "operator": normalized["operator"],
                "status": PayoutAccount.Status.PENDING_VERIFICATION,
                "is_primary": is_primary,
                "verified_at": None,
            },
        )
        code = f"{random.randint(0, 999999):06d}"
        account.set_verification_code(code)
        account.save()
        account.dev_code = code
        return account


class PayoutAccountVerifySerializer(serializers.Serializer):
    code = serializers.CharField(min_length=4, max_length=8)


class CartItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    # MasterProduct id (distinct de l'id de l'offre ci-dessus) : necessaire
    # pour les recommandations panier, qui raisonnent en MasterProduct.
    master_id = serializers.IntegerField(required=False, allow_null=True)
    name = serializers.CharField(max_length=255)
    price = serializers.IntegerField(min_value=0)
    quantity = serializers.IntegerField(min_value=1)
    image = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    isDemo = serializers.BooleanField(required=False, default=False)
    color = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    storage = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class UserCartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True)

    class Meta:
        model = UserCart
        fields = ["items", "updated_at"]
        read_only_fields = ["updated_at"]

    def update(self, instance, validated_data):
        instance.items = validated_data.get("items", [])
        instance.save(update_fields=["items", "updated_at"])
        return instance


class CourierApplicationSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)
    city = serializers.CharField(max_length=80)
    zones = serializers.ListField(
        child=serializers.CharField(max_length=60),
        allow_empty=False,
    )
    vehicle_type = serializers.ChoiceField(choices=CourierProfile.VehicleType.choices)
    id_card = serializers.CharField(max_length=120)

    def validate(self, data):
        # Bannissement niveau 4 (V5.5 §8) : une CNI ou un numéro Mobile
        # Money bloqué ne doit pas pouvoir revenir sous un nouveau compte.
        from .models import PartnerBlacklist

        if PartnerBlacklist.is_blacklisted(PartnerBlacklist.IdentifierType.CNI, data.get('id_card', '')):
            raise serializers.ValidationError("Cette pièce d'identité ne peut pas être utilisée pour créer un compte partenaire.")
        if PartnerBlacklist.is_blacklisted(PartnerBlacklist.IdentifierType.MOMO, data.get('phone', '')):
            raise serializers.ValidationError("Ce numéro Mobile Money ne peut pas être utilisé pour créer un compte partenaire.")
        return data

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
    is_delivery_organization = serializers.SerializerMethodField()
    is_relay_point = serializers.SerializerMethodField()
    courier_status = serializers.SerializerMethodField()
    courier_profile = serializers.SerializerMethodField()
    delivery_organization_profile = serializers.SerializerMethodField()
    relay_point_profile = serializers.SerializerMethodField()
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
            "is_delivery_organization",
            "is_relay_point",
            "courier_status",
            "courier_profile",
            "delivery_organization_profile",
            "relay_point_profile",
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
        return hasattr(obj, 'vendor_profile') and str(obj.vendor_profile.status).upper() == 'APPROVED'

    def get_is_courier(self, obj):
        courier = getattr(obj, "courier_profile", None)
        return bool(courier and courier.is_approved and courier.is_active)

    def get_is_delivery_organization(self, obj):
        profile = getattr(obj, "delivery_organization_profile", None)
        return bool(profile and profile.is_active and profile.status == DeliveryOrganizationProfile.Status.APPROVED)

    def get_is_relay_point(self, obj):
        profile = getattr(obj, "relay_point_profile", None)
        return bool(profile and profile.is_active and profile.status == RelayPointProfile.Status.APPROVED)

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

    def get_delivery_organization_profile(self, obj):
        profile = getattr(obj, "delivery_organization_profile", None)
        if not profile:
            return None
        return DeliveryOrganizationProfileSerializer(profile).data

    def get_relay_point_profile(self, obj):
        profile = getattr(obj, "relay_point_profile", None)
        if not profile:
            return None
        return RelayPointProfileSerializer(profile).data

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
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=30)

    class Meta:
        model = User
        fields = ["username", "email", "phone", "password", "password2", "first_name", "last_name"]

    def validate_username(self, value):
        value = value.strip()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur existe deja. Choisissez-en un autre.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if value and user_with_email_exists(value):
            raise serializers.ValidationError("Cette adresse email existe deja. Connectez-vous ou utilisez-en une autre.")
        return value

    def validate_phone(self, value):
        if not value.strip():
            return ""
        normalized = normalize_cameroon_phone(value)
        if not normalized["is_valid"] or not normalized["is_mobile"]:
            raise serializers.ValidationError("Saisissez un numero mobile camerounais valide.")
        if users_with_phone(normalized["e164"]).exists():
            raise serializers.ValidationError("Ce numero de telephone existe deja. Connectez-vous ou utilisez-en un autre.")
        return normalized["e164"]

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Les mots de passe ne correspondent pas."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        phone = validated_data.pop("phone", "")
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )
        UserProfile.objects.update_or_create(user=user, defaults={"phone": phone or None})
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

    def validate_avatar(self, avatar):
        try:
            return optimize_uploaded_image(
                avatar,
                max_input_bytes=10 * 1024 * 1024,
                max_dimension=512,
                quality=78,
                filename_prefix="avatar",
            )
        except ImageOptimizationError as error:
            raise serializers.ValidationError(str(error)) from error

    def update(self, instance, validated_data):
        old_avatar = instance.avatar.name if instance.avatar else None
        instance = super().update(instance, validated_data)
        if old_avatar and instance.avatar.name != old_avatar:
            instance.avatar.storage.delete(old_avatar)
        return instance


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


class RewardTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RewardTransaction
        fields = ["id", "delta", "source", "reason", "reference", "created_at"]
        read_only_fields = fields


class RewardAccountSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    tier_display = serializers.CharField(source="get_tier_display", read_only=True)
    transactions = RewardTransactionSerializer(many=True, read_only=True)
    show_monetary_value = serializers.SerializerMethodField()

    class Meta:
        model = RewardAccount
        fields = [
            "id",
            "role",
            "role_display",
            "points_balance",
            "lifetime_points",
            "trust_score",
            "tier",
            "tier_display",
            "show_monetary_value",
            "last_recalculated_at",
            "transactions",
        ]
        read_only_fields = fields

    def get_show_monetary_value(self, obj):
        return obj.role != RewardAccount.Role.COURIER


class AppReleaseSerializer(serializers.ModelSerializer):
    portal_display = serializers.CharField(source="get_portal_display", read_only=True)

    class Meta:
        model = AppRelease
        fields = ["portal", "portal_display", "version", "apk_url", "release_notes", "updated_at"]
        read_only_fields = fields
