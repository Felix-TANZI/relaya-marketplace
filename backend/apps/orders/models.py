# backend/apps/orders/models.py
# Modèles pour la gestion des commandes et des articles de commande.
# Architecture professionnelle : séparation entre statut de paiement et statut de livraison

from django.db import models
from django.contrib.auth.models import User
from apps.catalog.models import Product


class TimeStampedModel(models.Model):
    """Modèle abstrait pour ajouter automatiquement les timestamps"""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Order(TimeStampedModel):
    """
    Modèle de commande avec séparation claire entre :
    - payment_status : état du paiement (PENDING, PAID, FAILED, REFUNDED)
    - fulfillment_status : état de la livraison (PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
    """
    
    # Statuts de paiement
    class PaymentStatus(models.TextChoices):
        PENDING = "PENDING", "En attente de paiement"
        PAID = "PAID", "Payé"
        FAILED = "FAILED", "Échec du paiement"
        REFUNDED = "REFUNDED", "Remboursé"
    
    # Statuts de livraison (fulfillment)
    class FulfillmentStatus(models.TextChoices):
        PENDING = "PENDING", "En attente"
        PROCESSING = "PROCESSING", "En préparation"
        SHIPPED = "SHIPPED", "Expédié"
        DELIVERED = "DELIVERED", "Livré"
        CANCELLED = "CANCELLED", "Annulé"

    # Relation utilisateur
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name="orders", 
        null=True, 
        blank=True
    )

    # Informations client (guest-friendly pour v1)
    customer_email = models.EmailField(blank=True, null=True)
    customer_phone = models.CharField(max_length=20)

    # Informations de livraison
    city = models.CharField(max_length=20)  # YAOUNDE / DOUALA
    address = models.CharField(max_length=255)
    note = models.TextField(blank=True, null=True)

    # Statuts séparés (approche professionnelle)
    payment_status = models.CharField(
        max_length=30,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        verbose_name="Statut de paiement"
    )
    
    fulfillment_status = models.CharField(
        max_length=30,
        choices=FulfillmentStatus.choices,
        default=FulfillmentStatus.PENDING,
        verbose_name="Statut de livraison"
    )

    # Montants
    subtotal_xaf = models.PositiveIntegerField(default=0)
    delivery_fee_xaf = models.PositiveIntegerField(default=0)
    total_xaf = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Commande"
        verbose_name_plural = "Commandes"

    def __str__(self):
        return f"Commande #{self.id} - Paiement: {self.payment_status} - Livraison: {self.fulfillment_status}"
    
    @property
    def is_paid(self):
        """Vérifie si la commande est payée"""
        return self.payment_status == self.PaymentStatus.PAID
    
    @property
    def can_be_fulfilled(self):
        """Vérifie si la commande peut être traitée (doit être payée)"""
        return self.is_paid and self.fulfillment_status != self.FulfillmentStatus.CANCELLED


class OrderItem(TimeStampedModel):
    """Article d'une commande avec snapshot des informations produit"""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    
    # Snapshot des informations au moment de la commande
    title_snapshot = models.CharField(max_length=200)
    price_xaf_snapshot = models.PositiveIntegerField()
    qty = models.PositiveIntegerField()
    line_total_xaf = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Article de commande"
        verbose_name_plural = "Articles de commande"

    def __str__(self):
        return f"Commande #{self.order_id} - {self.title_snapshot} x{self.qty}"
    

class OrderHistory(models.Model):
    """
    Historique des modifications de commande (audit log)
    Trace qui a modifié quoi et quand
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='history')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=100)  # Ex: "Statut changé", "Remboursement créé"
    field_name = models.CharField(max_length=100, blank=True)  # Champ modifié
    old_value = models.TextField(blank=True)
    new_value = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Historique Commande"
        verbose_name_plural = "Historiques Commandes"
    
    def __str__(self):
        return f"Order #{self.order.id} - {self.action} - {self.timestamp}"
    

class Dispute(models.Model):
    """
    Litige sur une commande
    """
    REASON_CHOICES = [
        ('NOT_RECEIVED', 'Commande non reçue'),
        ('DAMAGED', 'Article endommagé'),
        ('WRONG_ITEM', 'Mauvais article'),
        ('NOT_AS_DESCRIBED', 'Non conforme à la description'),
        ('REFUND_REQUEST', 'Demande de remboursement'),
        ('OTHER', 'Autre'),
    ]
    
    STATUS_CHOICES = [
        ('OPEN', 'Ouvert'),
        ('IN_PROGRESS', 'En cours'),
        ('RESOLVED', 'Résolu'),
        ('CLOSED', 'Fermé'),
    ]
    
    RESOLUTION_CHOICES = [
        ('REFUND', 'Remboursement'),
        ('EXCHANGE', 'Échange'),
        ('PARTIAL_REFUND', 'Remboursement partiel'),
        ('REJECTED', 'Rejeté'),
        ('OTHER', 'Autre'),
    ]
    
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='disputes')
    opened_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='opened_disputes')
    
    reason = models.CharField(max_length=50, choices=REASON_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    
    description = models.TextField()
    
    # Résolution
    resolution = models.CharField(max_length=50, choices=RESOLUTION_CHOICES, blank=True, null=True)
    resolution_note = models.TextField(blank=True, null=True)
    resolved_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='resolved_disputes'
    )
    resolved_at = models.DateTimeField(blank=True, null=True)
    
    # Montant du remboursement (si applicable)
    refund_amount_xaf = models.IntegerField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Litige"
        verbose_name_plural = "Litiges"
    
    def __str__(self):
        return f"Litige #{self.id} - Commande #{self.order.id}"


class DisputeMessage(models.Model):
    """
    Message dans un litige
    """
    dispute = models.ForeignKey(Dispute, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    is_internal = models.BooleanField(default=False)  # Note interne admin
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name = "Message Litige"
        verbose_name_plural = "Messages Litiges"
    
    def __str__(self):
        return f"Message de {self.sender.username} - Litige #{self.dispute.id}"


class DisputeEvidence(models.Model):
    """
    Preuve/Document joint à un litige
    """
    dispute = models.ForeignKey(Dispute, on_delete=models.CASCADE, related_name='evidences')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    file = models.FileField(upload_to='disputes/%Y/%m/')
    description = models.CharField(max_length=255, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name = "Preuve Litige"
        verbose_name_plural = "Preuves Litiges"
    
    def __str__(self):
        return f"Preuve - Litige #{self.dispute.id}"    