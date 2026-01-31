# backend/apps/vendors/serializers.py
# Serializers pour l'espace vendeur

from rest_framework import serializers
from .models import VendorProfile
from django.contrib.auth.models import User


class VendorProfileSerializer(serializers.ModelSerializer):
    """Serializer pour le profil vendeur"""
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = VendorProfile
        fields = [
            'id', 'username', 'email', 'business_name', 'business_description',
            'phone', 'address', 'city', 'id_document', 'status',
            'created_at', 'updated_at', 'approved_at'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at', 'approved_at']


class VendorApplicationSerializer(serializers.ModelSerializer):
    """Serializer pour la demande de devenir vendeur"""
    
    class Meta:
        model = VendorProfile
        fields = [
            'business_name', 'business_description', 'phone',
            'address', 'city', 'id_document'
        ]
    
    def validate(self, data):
        """Vérifier que l'utilisateur n'est pas déjà vendeur"""
        user = self.context['request'].user
        if VendorProfile.objects.filter(user=user).exists():
            raise serializers.ValidationError("Vous avez déjà une demande vendeur.")
        return data
    
    def create(self, validated_data):
        """Créer le profil vendeur"""
        user = self.context['request'].user
        return VendorProfile.objects.create(user=user, **validated_data)


class VendorStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques du vendeur"""
    total_products = serializers.IntegerField()
    active_products = serializers.IntegerField()
    total_orders = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=10, decimal_places=2)