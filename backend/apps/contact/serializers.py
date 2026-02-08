# backend/apps/contact/serializers.py
# Serializers pour l'API de contact

from rest_framework import serializers
from .models import ContactMessage


class ContactMessageSerializer(serializers.ModelSerializer):
    """
    Serializer pour créer un message de contact
    """
    
    class Meta:
        model = ContactMessage
        fields = ['id', 'name', 'email', 'phone', 'subject', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def validate_message(self, value):
        """Validation du message"""
        if len(value.strip()) < 10:
            raise serializers.ValidationError(
                "Le message doit contenir au moins 10 caractères."
            )
        return value.strip()
    
    def validate_subject(self, value):
        """Validation du sujet"""
        if len(value.strip()) < 3:
            raise serializers.ValidationError(
                "Le sujet doit contenir au moins 3 caractères."
            )
        return value.strip()


class ContactMessageDetailSerializer(serializers.ModelSerializer):
    """
    Serializer détaillé pour l'admin
    """
    assigned_to_name = serializers.CharField(
        source='assigned_to.get_full_name', 
        read_only=True,
        allow_null=True
    )
    
    class Meta:
        model = ContactMessage
        fields = [
            'id', 'name', 'email', 'phone', 'subject', 'message',
            'status', 'ip_address', 'admin_notes', 'assigned_to',
            'assigned_to_name', 'created_at', 'updated_at', 'resolved_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'ip_address']