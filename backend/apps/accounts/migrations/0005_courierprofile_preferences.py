from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_merge_20260423_0235"),
    ]

    operations = [
        migrations.AddField(
            model_name="courierprofile",
            name="camera_permission_granted",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="courierprofile",
            name="gps_permission_granted",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="courierprofile",
            name="preferred_language",
            field=models.CharField(blank=True, default="fr", max_length=8),
        ),
    ]
