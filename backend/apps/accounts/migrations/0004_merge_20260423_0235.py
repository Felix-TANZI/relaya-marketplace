# Generated manually to merge parallel accounts migration branches.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_courierprofile"),
        ("accounts", "0003_sessions_otp_2fa"),
    ]

    operations = []
