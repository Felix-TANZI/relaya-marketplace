from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vendors', '0010_vendorprofile_closed_days'),
    ]

    operations = [
        migrations.AddField(
            model_name='vendorlocation',
            name='description',
            field=models.TextField(
                blank=True,
                help_text='Repères et indications permettant à BelivaY de retrouver la boutique.',
                verbose_name="Description d'accès",
            ),
        ),
    ]
