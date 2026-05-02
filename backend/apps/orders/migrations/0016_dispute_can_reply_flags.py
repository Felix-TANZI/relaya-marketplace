from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0015_repair_missing_delivery_method_column'),
    ]

    operations = [
        migrations.AddField(
            model_name='dispute',
            name='vendor_can_reply',
            field=models.BooleanField(
                default=False,
                help_text='Si True, le vendeur peut envoyer des messages dans ce litige.',
                verbose_name='Vendeur autorisé à répondre',
            ),
        ),
        migrations.AddField(
            model_name='dispute',
            name='courier_can_reply',
            field=models.BooleanField(
                default=False,
                help_text='Si True, le livreur peut envoyer des messages dans ce litige.',
                verbose_name='Livreur autorisé à répondre',
            ),
        ),
    ]
