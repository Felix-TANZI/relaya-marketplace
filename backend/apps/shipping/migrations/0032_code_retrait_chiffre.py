# Sécurité avant main 2, DP-02 : le code de retrait (relais -> client) n'est plus gardé en clair. Chaque code existant
# est chiffré et reçoit son empreinte HMAC AVANT la suppression de la colonne en clair ; les tentatives déjà tracées
# gardent l'empreinte du code saisi au lieu du code lui-même.

import django.db.models.deletion
from django.db import migrations, models


def chiffrer_les_codes(apps, schema_editor):
    from apps.client_core.chiffrement import chiffrer, empreinte

    RelayParcel = apps.get_model("shipping", "RelayParcel")
    for colis in RelayParcel.objects.exclude(pickup_code="").only("id", "pickup_code"):
        code = colis.pickup_code.strip().upper()
        RelayParcel.objects.filter(pk=colis.pk).update(pickup_code_chiffre=chiffrer(code),
                                                       pickup_code_empreinte=empreinte(f"retrait:{code}"))
    RelayPickupAttempt = apps.get_model("shipping", "RelayPickupAttempt")
    for essai in RelayPickupAttempt.objects.only("id", "code"):
        code = (essai.code or "").strip().upper()
        RelayPickupAttempt.objects.filter(pk=essai.pk).update(code=empreinte(f"retrait:{code}") if code else "")


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0031_codes_un_seul_systeme'),
        ('shipping', '0031_prestations_entreprises'),
    ]

    operations = [
        migrations.AddField(
            model_name='relayparcel',
            name='pickup_code_chiffre',
            field=models.BinaryField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='relayparcel',
            name='pickup_code_empreinte',
            field=models.CharField(blank=True, db_index=True, default='', editable=False, max_length=64),
        ),
        migrations.AlterField(
            model_name='relaypickupattempt',
            name='code',
            field=models.CharField(help_text='empreinte HMAC du code saisi (DP-02), jamais le code', max_length=64),
        ),
        migrations.RunPython(chiffrer_les_codes, migrations.RunPython.noop),
        migrations.RemoveIndex(
            model_name='relaypickupattempt',
            name='shipping_re_relay_p_4745d6_idx',
        ),
        migrations.RemoveField(
            model_name='relayparcel',
            name='pickup_code',
        ),
        migrations.AddField(
            model_name='relaypickupattempt',
            name='shipment',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='+', to='shipping.shipment'),
        ),
        migrations.AddIndex(
            model_name='relaypickupattempt',
            index=models.Index(fields=['relay_point', 'success', '-created_at'], name='shipping_re_relay_p_55c1b6_idx'),
        ),
    ]
