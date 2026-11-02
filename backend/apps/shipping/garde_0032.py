# backend/apps/shipping/garde_0032.py
# Revue du 1/11 (P1) : garde-fou de la migration 0032_code_retrait_chiffre (DP-02).
#
# Dockerfile.prod lance « migrate » à chaque démarrage. La migration 0032 est irréversible : elle chiffre les codes de
# retrait puis supprime la colonne en clair. En production, elle refuse donc de s'appliquer tant que
# BELIVAY_MIGRATION_0032_VALIDEE ne porte pas :
#   - la date du compte rendu « OK » de l'essai sur la copie (AAAA-MM-JJ) — en production ;
#   - « essai-copie » — sur la copie seulement, pendant l'essai lui-même (décision du porteur du 2/11).
# Même sur une base vide (décision du porteur du 2/11 : aucune exception). Hors production (développement, tests,
# CI), rien n'est exigé. Procédure : PROCEDURE_MIGRATION_0032.md.

from datetime import date

from django.conf import settings

ESSAI = "essai-copie"


class Migration0032NonValidee(RuntimeError):
    pass


def verifier(apps=None, schema_editor=None) -> str:
    """Lève Migration0032NonValidee si la migration ne doit pas partir ; sinon renvoie « production », « essai » ou
    « hors production »."""
    if not getattr(settings, "BELIVAY_PRODUCTION", False):
        return "hors production"
    valeur = (getattr(settings, "BELIVAY_MIGRATION_0032_VALIDEE", "") or "").strip()
    if valeur == ESSAI:
        print("\n  ESSAI de la migration 0032 sur une copie (BELIVAY_MIGRATION_0032_VALIDEE=essai-copie) : "
              "jamais en production. Suite : verifier_codes_retrait --codes …")
        return "essai"
    try:
        date.fromisoformat(valeur)
        return "production"
    except ValueError:
        raise Migration0032NonValidee(
            "Migration shipping 0032 (DP-02) refusée : elle est irréversible (codes de retrait chiffrés, colonne en "
            "clair supprimée). Faites d'abord l'essai sur une copie de la production, puis posez "
            "BELIVAY_MIGRATION_0032_VALIDEE=<date du compte rendu OK, AAAA-MM-JJ> dans .env.prod. "
            f"Valeur actuelle : « {valeur or 'absente'} ». Voir PROCEDURE_MIGRATION_0032.md."
        ) from None
