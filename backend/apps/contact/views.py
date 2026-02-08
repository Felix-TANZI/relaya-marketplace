# backend/apps/contact/views.py
# Vues API pour le système de contact

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse

from .models import ContactMessage
from .serializers import ContactMessageSerializer
from .utils import send_contact_emails


def get_client_ip(request):
    """Récupérer l'IP du client"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


@extend_schema(
    tags=["Contact"],
    summary="Envoyer un message de contact",
    description="Permet à un utilisateur d'envoyer un message de contact. Un email est envoyé au support et une confirmation est envoyée à l'expéditeur.",
    request=ContactMessageSerializer,
    responses={
        201: OpenApiResponse(
            description="Message envoyé avec succès",
            response={
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "message": {"type": "string"},
                    "data": {"type": "object"}
                }
            }
        ),
        400: OpenApiResponse(description="Données invalides"),
        500: OpenApiResponse(description="Erreur serveur")
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
def contact_message_create(request):
    """
    Créer un message de contact et envoyer les emails
    """
    serializer = ContactMessageSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            {
                "success": False,
                "message": "Données invalides",
                "errors": serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Sauvegarder avec métadonnées
    contact_message = serializer.save(
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
    )
    
    # Envoyer les emails (support + confirmation)
    try:
        send_contact_emails(contact_message)
        email_sent = True
    except Exception as e:
        print(f"Erreur envoi email: {e}")
        email_sent = False
    
    return Response(
        {
            "success": True,
            "message": "Message envoyé avec succès. Nous vous répondrons dans les 24h.",
            "email_sent": email_sent,
            "data": ContactMessageSerializer(contact_message).data
        },
        status=status.HTTP_201_CREATED
    )