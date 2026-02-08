# backend/apps/contact/utils.py
# Utilitaires pour l'envoi d'emails de contact

from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from apps.orders.models import PlatformSettings


def send_contact_emails(contact_message):
    """
    Envoyer les emails de contact :
    1. Email au support
    2. Email de confirmation au client
    """
    
    # Récupérer l'email du support depuis les settings de la plateforme
    try:
        platform_settings = PlatformSettings.get_settings()
        support_email = platform_settings.support_email
    except:
        support_email = settings.SUPPORT_EMAIL
    
    
    #  EMAIL AU SUPPORT
    
    
    support_subject = f"[Relaya Contact] {contact_message.subject}"
    
    support_context = {
        'contact': contact_message,
        'support_email': support_email,
    }
    
    support_html = render_to_string('contact/email_to_support.html', support_context)
    support_text = render_to_string('contact/email_to_support.txt', support_context)
    
    support_mail = EmailMultiAlternatives(
        subject=support_subject,
        body=support_text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[support_email],
        reply_to=[contact_message.email]
    )
    support_mail.attach_alternative(support_html, "text/html")
    support_mail.send()
    
    
    #  EMAIL DE CONFIRMATION AU CLIENT
    
    
    confirmation_subject = "Votre message a été reçu - Relaya"
    
    confirmation_context = {
        'name': contact_message.name,
        'subject': contact_message.subject,
        'support_email': support_email,
    }
    
    confirmation_html = render_to_string('contact/email_confirmation.html', confirmation_context)
    confirmation_text = render_to_string('contact/email_confirmation.txt', confirmation_context)
    
    confirmation_mail = EmailMultiAlternatives(
        subject=confirmation_subject,
        body=confirmation_text,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[contact_message.email]
    )
    confirmation_mail.attach_alternative(confirmation_html, "text/html")
    confirmation_mail.send()