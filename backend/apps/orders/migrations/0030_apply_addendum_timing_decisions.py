# Data migration — applique les chiffres verrouilles par
# BelivaY_Addendum_Decisions_DEV.pdf v1.0 (§3.1, §4.4) au singleton
# PlatformSettings deja existant en base (le changement du default Django
# seul ne met pas a jour une ligne deja creee).

from django.db import migrations


def apply_addendum_decisions(apps, schema_editor):
    PlatformSettings = apps.get_model("orders", "PlatformSettings")
    settings, _ = PlatformSettings.objects.get_or_create(id=1)
    settings.escrow_auto_confirm_h = 96  # 4 jours apres la remise
    settings.escrow_release_h = 72       # J+3 apres cloture du droit de retour
    settings.litige_window_days = 4      # 4 jours apres la remise, cale sur l'auto-confirmation
    settings.save(update_fields=["escrow_auto_confirm_h", "escrow_release_h", "litige_window_days"])


def revert(apps, schema_editor):
    PlatformSettings = apps.get_model("orders", "PlatformSettings")
    settings = PlatformSettings.objects.filter(id=1).first()
    if settings:
        settings.escrow_auto_confirm_h = 48
        settings.escrow_release_h = 24
        settings.litige_window_days = 7
        settings.save(update_fields=["escrow_auto_confirm_h", "escrow_release_h", "litige_window_days"])


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0029_order_zone"),
    ]

    operations = [
        migrations.RunPython(apply_addendum_decisions, revert),
    ]
