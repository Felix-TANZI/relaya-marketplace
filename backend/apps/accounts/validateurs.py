# backend/apps/accounts/validateurs.py
# Règle de mot de passe de toute la plateforme — décision du porteur (2026-11-11, DEV-SRV-01) : le projet ne déclarait
# aucun AUTH_PASSWORD_VALIDATORS, donc « 1 » était accepté partout (inscription, changement de mot de passe, premier
# mot de passe d'un vendeur inscrit par un agent). La règle existe déjà comme paramètre métier, MDP-LONG
# (« 8 caractères au moins, dont un chiffre »), appliqué jusqu'ici aux seuls comptes clients et au lien « mot de passe
# oublié » : ce validateur la lit au même endroit (apps.client_accounts.regles.mot_de_passe_ok), sans la recopier.
# Elle ne vaut que pour les nouveaux mots de passe : les comptes existants ne sont pas touchés.

from django.core.exceptions import ValidationError


def _regle() -> str | None:
    from apps.client_core import parametres

    return parametres.registre().get("MDP-LONG")


class RegleMotDePasse:
    """Applique MDP-LONG (registre des paramètres) à chaque mot de passe validé par Django."""

    def validate(self, password, user=None):
        from apps.client_accounts.regles import mot_de_passe_ok

        regle = _regle()
        if regle and not mot_de_passe_ok(password or "", regle):
            raise ValidationError(f"Le mot de passe doit avoir {regle}.", code="mdp_long")

    def get_help_text(self):
        regle = _regle()
        return f"Le mot de passe doit avoir {regle}." if regle else ""
