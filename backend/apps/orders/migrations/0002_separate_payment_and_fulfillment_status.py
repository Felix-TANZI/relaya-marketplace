# backend/apps/orders/migrations/0002_separate_payment_and_fulfillment_status.py
# Migration pour séparer le statut de paiement du statut de livraison

from django.db import migrations, models


def migrate_existing_orders(apps, schema_editor):
    """
    Migrer les données existantes :
    - PENDING_PAYMENT → payment_status=PENDING, fulfillment_status=PENDING
    - PAID → payment_status=PAID, fulfillment_status=PENDING
    - CANCELLED → payment_status=PENDING, fulfillment_status=CANCELLED
    """
    Order = apps.get_model('orders', 'Order')
    
    for order in Order.objects.all():
        old_status = order.status
        
        if old_status == 'PENDING_PAYMENT':
            order.payment_status = 'PENDING'
            order.fulfillment_status = 'PENDING'
        elif old_status == 'PAID':
            order.payment_status = 'PAID'
            order.fulfillment_status = 'PENDING'
        elif old_status == 'CANCELLED':
            order.payment_status = 'PENDING'
            order.fulfillment_status = 'CANCELLED'
        
        order.save()


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0001_initial'),
    ]

    operations = [
        # Ajouter les nouveaux champs
        migrations.AddField(
            model_name='order',
            name='payment_status',
            field=models.CharField(
                choices=[
                    ('PENDING', 'En attente de paiement'),
                    ('PAID', 'Payé'),
                    ('FAILED', 'Échec du paiement'),
                    ('REFUNDED', 'Remboursé')
                ],
                default='PENDING',
                max_length=30,
                verbose_name='Statut de paiement'
            ),
        ),
        migrations.AddField(
            model_name='order',
            name='fulfillment_status',
            field=models.CharField(
                choices=[
                    ('PENDING', 'En attente'),
                    ('PROCESSING', 'En préparation'),
                    ('SHIPPED', 'Expédié'),
                    ('DELIVERED', 'Livré'),
                    ('CANCELLED', 'Annulé')
                ],
                default='PENDING',
                max_length=30,
                verbose_name='Statut de livraison'
            ),
        ),
        
        # Migrer les données existantes
        migrations.RunPython(migrate_existing_orders, reverse_code=migrations.RunPython.noop),
        
        # Supprimer l'ancien champ status
        migrations.RemoveField(
            model_name='order',
            name='status',
        ),
        
        # Mettre à jour les options Meta
        migrations.AlterModelOptions(
            name='order',
            options={
                'ordering': ['-created_at'],
                'verbose_name': 'Commande',
                'verbose_name_plural': 'Commandes'
            },
        ),
        migrations.AlterModelOptions(
            name='orderitem',
            options={
                'verbose_name': 'Article de commande',
                'verbose_name_plural': 'Articles de commande'
            },
        ),
    ]