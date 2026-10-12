# backend/apps/common/purchases.py
# Verrou des achats pendant la phase vitrine — tache D2.
#
# SOURCE DE VERITE : l'interrupteur FF-ACHAT de client_core. Il se regle
# depuis l'administration (Interrupteurs de module), sans redeploiement ni
# redemarrage — le cache est invalide a l'enregistrement.
#
# On ne cree PAS un second mecanisme en variable d'environnement : il
# imposerait un redemarrage du conteneur, et deux systemes concurrents
# finiraient par diverger sans qu'on sache lequel fait foi.
#
# Ferme = 404, comme tout module ferme (CAP-13) : la route se comporte comme
# si elle n'existait pas. Le site, lui, sait que les achats sont fermes en
# lisant GET /api/config/flags au demarrage — il ne doit donc meme pas
# proposer le bouton. Le 404 n'est que le filet de securite cote serveur,
# pour l'appel direct qui contournerait l'interface.
#
# EXCEPTION : les comptes listes dans PURCHASES_TEST_USERNAMES passent meme
# achats fermes. La tache D23 impose de valider le parcours de bout en bout
# sur ce meme serveur, achats fermes au public. La permission `module()` de
# client_core n'offre aucune exception, d'ou cette variante.

from __future__ import annotations

from django.conf import settings
from rest_framework import exceptions

#: Code de l'interrupteur. Volontairement ABSENT de interrupteurs.json :
#: `ouvert()` renvoie `etat().get(code, False)`, donc un code non declare est
#: FERME. La consequence est voulue — toute base neuve (production, second
#: serveur de D23, poste de developpement) demarre achats fermes, sans aucun
#: geste a ne pas oublier. Pour ouvrir le jour du lancement : administration >
#: Interrupteurs de module > creer FF-ACHAT coche.
CODE_INTERRUPTEUR = "FF-ACHAT"


def purchases_open_for(user) -> bool:
    """Vrai si cet utilisateur a le droit d'acheter maintenant."""
    # Import differe : apps.common est charge tot, client_core plus tard.
    from apps.client_core.interrupteurs import ouvert

    if ouvert(CODE_INTERRUPTEUR):
        return True

    # AnonymousUser n'a pas de username exploitable : il ne passe jamais.
    username = getattr(user, "username", "") or ""
    if not username:
        return False

    return username in getattr(settings, "PURCHASES_TEST_USERNAMES", [])


def assert_purchases_open(user) -> None:
    """Leve NotFound (404) si l'achat n'est pas permis — convention CAP-13."""
    if not purchases_open_for(user):
        raise exceptions.NotFound()
