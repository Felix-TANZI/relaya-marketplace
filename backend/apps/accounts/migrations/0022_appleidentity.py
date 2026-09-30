# Generated for Sign in with Apple token revocation (account deletion)

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0021_apprelease'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AppleIdentity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('subject', models.CharField(db_index=True, max_length=255, verbose_name='Identifiant Apple (sub)')),
                ('client_id', models.CharField(max_length=255, verbose_name='Client ID Apple (aud)')),
                ('refresh_token_encrypted', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='apple_identity', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Identité Apple',
                'verbose_name_plural': 'Identités Apple',
            },
        ),
    ]
