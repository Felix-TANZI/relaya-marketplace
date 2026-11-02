# backend/apps/payments/bridge/codes.py
# Securite avant main 2 : le code du Wallet oublie ou bloque se reinitialise par un code envoye au numero verifie du
# client. Le pont appelle le moteur de codes unique (D6) et lit le numero verifie : seul endroit du module financier
# autorise a le faire (P1).


def numero_verifie(user) -> str | None:
    from apps.client_accounts.services import numero_verifie as lire

    return lire(user)


def envoyer_code(user, numero: str) -> dict:
    from apps.otp import services as codes
    from apps.otp.models import CodeOtp

    return codes.envoyer(objet=CodeOtp.Objet.WALLET_CODE, destination=numero, utilisateur=user,
                         exiger_utilisateur=True)


def verifier_code(user, numero: str, code: str) -> dict:
    from apps.otp import services as codes
    from apps.otp.models import CodeOtp

    return codes.verifier(objet=CodeOtp.Objet.WALLET_CODE, code=code, destination=numero, utilisateur=user,
                          exiger_utilisateur=True)
