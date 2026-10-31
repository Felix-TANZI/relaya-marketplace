# Revue du 29 octobre 2026 — groupe E (avant le déploiement sur main 2). E2 : la preuve de l'essai de la migration
# shipping 0032 sur une copie de la production (commande verifier_codes_retrait).

import pytest
from django.core.management import CommandError, call_command

from apps.shipping.models import RelayParcel
from tests.test_livraison_publication import _colis_au_relais, _referentiel  # noqa: F401  (fixture)

pytestmark = pytest.mark.django_db


def _csv(tmp_path, lignes):
    f = tmp_path / "avant_0032.csv"
    f.write_text("id,code\n" + "".join(f"{pk},{code}\n" for pk, code in lignes), encoding="utf-8")
    return str(f)


def test_e2_un_code_d_avant_la_migration_est_toujours_accepte(tmp_path, capsys):
    parcel = _colis_au_relais("482913")
    call_command("verifier_codes_retrait", codes=_csv(tmp_path, [(parcel.pk, "482913")]))
    assert "OK : chaque code existant est toujours accepté" in capsys.readouterr().out


def test_e2_un_code_qui_ne_passe_plus_fait_echouer_l_essai(tmp_path):
    parcel = _colis_au_relais("482913")
    with pytest.raises(SystemExit) as fin:
        call_command("verifier_codes_retrait", codes=_csv(tmp_path, [(parcel.pk, "111111")]))
    assert fin.value.code == 1


def test_e2_une_empreinte_faite_avec_un_autre_sel_est_detectee(settings):
    parcel = _colis_au_relais("482913")
    RelayParcel.objects.filter(pk=parcel.pk).update(pickup_code_empreinte="0" * 64)   # sel changé après 0032
    with pytest.raises(SystemExit):
        call_command("verifier_codes_retrait")


def test_e2_refuse_de_tourner_sans_sel(settings):
    settings.PAYMENTS_FINGERPRINT_SALT = ""
    with pytest.raises(CommandError, match="PAYMENTS_FINGERPRINT_SALT"):
        call_command("verifier_codes_retrait")


# ── E3 : rattacher les équipes avant le déploiement ──────────────────────────────────────────────────────────

def test_e3_signale_le_personnel_sans_groupe_et_les_valideurs_manquants(capsys):
    from django.contrib.auth.models import User

    User.objects.create_user("agent_sans_groupe", password="p", is_staff=True)
    with pytest.raises(SystemExit):
        call_command("verifier_rattachements")
    sortie = capsys.readouterr().out
    assert "agent_sans_groupe" in sortie and "finance-comptable" in sortie and "direction" in sortie


def test_e3_tout_est_en_place(capsys):
    from django.contrib.auth.models import Group, User

    User.objects.filter(is_staff=True, is_superuser=False).update(is_staff=False)
    for nom, groupe in (("comptable_e3", "finance-comptable"), ("porteur_e3", "direction"),
                        ("agent_e3", "gestion-support")):
        User.objects.create_user(nom, password="p", is_staff=True).groups.add(
            Group.objects.get_or_create(name=groupe)[0])
    call_command("verifier_rattachements")
    assert "OK" in capsys.readouterr().out
