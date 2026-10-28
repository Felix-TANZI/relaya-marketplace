# backend/apps/common/droits.py
# Droits par partie sur les écrans de gestion (sécurité avant main 2) : au lieu de IsAdminUser, qui ouvre tout à tout
# membre du personnel, chaque écran s'ouvre aux seules personnes de sa partie. Les groupes Django sont créés par les
# migrations accounts 0032 et 0033 ; on y rattache les personnes dans l'admin.
#
# L'argent garde ses propres rôles (payments.api.admin.permissions : « finance » ; DP-42 : comptable puis porteur).
# Un superutilisateur ouvre ces écrans de gestion (sinon personne ne pourrait rattacher les premières personnes) ;
# il n'a en revanche aucun rôle implicite pour valider de l'argent.

from rest_framework.permissions import BasePermission

PARTIES = {
    "support": "gestion-support",          # fils du support
    "fraude": "gestion-fraude",            # signaux de fraude
    "logistique": "gestion-logistique",    # livreurs, relais, colis
    "conformite": "gestion-conformite",    # pièces des vendeurs (KYC)
    "litiges": "gestion-litiges",          # litiges, retours et remboursements automatiques (R71)
    "catalogue": "gestion-catalogue",      # catégories, marques, attributs, fiches, modération, avis, promotions
    "vendeurs": "gestion-vendeurs",        # comptes vendeurs, abonnements, modifications, certifications
    "clients": "gestion-clients",          # comptes clients, fidélité, envois groupés
    "commandes": "gestion-commandes",      # suivi et correction des commandes
    "finance": "finance",                  # le groupe financier existant (payments) : retraits, statistiques
    "pilotage": "gestion-pilotage",        # tableau de bord, analyses, journaux, réglages, services externes
}


def a_la_partie(user, partie: str) -> bool:
    if not user or not user.is_authenticated or not user.is_active:
        return False
    return user.is_superuser or user.groups.filter(name=PARTIES[partie]).exists()


def Partie(partie: str) -> type[BasePermission]:
    """Permission DRF : réservée aux personnes de cette partie."""
    if partie not in PARTIES:
        raise KeyError(partie)

    class _Partie(BasePermission):
        message = f"Écran réservé à l'équipe « {partie} ». Demandez votre rattachement au groupe {PARTIES[partie]}."

        def has_permission(self, request, view):
            return a_la_partie(request.user, partie)

    _Partie.__name__ = f"Partie_{partie}"
    return _Partie
