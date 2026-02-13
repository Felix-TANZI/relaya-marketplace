# backend/apps/accounts/serializers.py
# Serializers pour la gestion des utilisateurs et de l'authentification.
# Utilise le modèle User intégré de Django.

from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password


class UserSerializer(serializers.ModelSerializer):
    is_vendor = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "date_joined", "is_vendor"]
        read_only_fields = ["id", "date_joined", "is_vendor"]
    
    def get_is_vendor(self, obj):
        """Vérifier si l'utilisateur a un profil vendeur actif"""
        return hasattr(obj, 'vendor_profile') and obj.vendor_profile.status == 'approved'


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
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined', 'is_vendor']
        read_only_fields = ['id', 'username', 'date_joined', 'is_vendor']
    
    def get_is_vendor(self, obj):
        """Vérifier si l'utilisateur a un profil vendeur actif"""
        return hasattr(obj, 'vendor_profile') and obj.vendor_profile.status == 'approved'


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer pour la mise à jour du profil
    """
    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name']
        
    def validate_email(self, value):
        """Vérifier que l'email n'est pas déjà utilisé par un autre utilisateur"""
        user = self.context['request'].user
        if User.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value