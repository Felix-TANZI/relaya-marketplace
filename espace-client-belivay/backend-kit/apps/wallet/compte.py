# backend/apps/wallet/compte.py
# Ce que l'argent lit du compte du client, en un seul endroit :
#
#   numero_du_compte(user)  — le numéro vérifié du compte (premier moyen de paiement, il ne se retire pas, CCO-14).
#                             Source : apps.client_accounts.services.numero_verifie(user) quand l'application du compte
#                             l'expose ; sinon le profil de relaya (accounts.UserProfile.phone).
#   numero_change_le(user)  — dernier changement de numéro (CIN-39 à CIN-43) : retraits bloqués WALLET-NUMERO-ATTENTE.
#                             Source : services.numero_change (appelé par client_accounts) et, en secours, le dernier
#                             code « numero-nouveau » consommé (apps.otp).
#   client(user)            — l'objet Client du site rendu par ResultatCode (confirmerMoyen) :
#                             apps.client_accounts.services.client(user) si elle existe, sinon une forme minimale.
#
# Ces accroches évitent qu'une application du kit importe le détail d'une autre ; à l'intégration, vérifier que les
# noms ci-dessus existent dans client_accounts (REPRISE-BACKEND.md).

from apps.client_core.masquage import masquer_email, masquer_numero, numero_local, operateur


def _accroche(nom: str):
    try:
        from apps.client_accounts import services as comptes
    except ImportError:
        return None
    f = getattr(comptes, nom, None)
    return f if callable(f) else None


def numero_du_compte(user) -> str:
    """Numéro local à 9 chiffres, ou « » si le compte n'en a pas."""
    f = _accroche("numero_verifie")
    if f is not None:
        return numero_local(f(user) or "")
    profil = getattr(user, "profile", None)
    return numero_local(getattr(profil, "phone", "") or "")


def numero_change_le(user):
    from apps.otp.models import CodeOtp

    from .models import EtatPortefeuille

    code = (
        CodeOtp.objects.filter(utilisateur=user, objet=CodeOtp.Objet.NUMERO_NOUVEAU, utilise_le__isnull=False)
        .order_by("-utilise_le")
        .first()
    )
    dates = [
        code.utilise_le if code is not None else None,
        EtatPortefeuille.objects.filter(client=user).values_list("numero_change_le", flat=True).first(),
    ]
    dates = [d for d in dates if d is not None]
    return max(dates) if dates else None


def client(user) -> dict:
    f = _accroche("client")
    if f is not None:
        return f(user)
    num = numero_du_compte(user)
    email = getattr(user, "email", "") or ""
    prenom, nom = user.first_name or "", user.last_name or ""
    return {
        "prenom": prenom,
        "nom": nom,
        "nomComplet": f"{prenom} {nom}".strip(),
        "numeroMasque": masquer_numero(num) if num else "",
        "operateur": operateur(num) or "" if num else "",
        "email": email,
        "emailMasque": masquer_email(email),
        "connexion": "email",
        "portrait": {},
        "photo": None,
    }
