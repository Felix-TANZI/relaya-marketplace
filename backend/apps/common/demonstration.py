"""
Garde-fou des jeux de donnees de demonstration — tache D31.

« Ne montrer aucune donnee inventee. [...] Relais : aucun relais de
demonstration (par exemple "Relais Mvog-Ada") ; seulement des relais reels, ou
une mention generale. Un visiteur qui repere un faux chiffre ne croit plus le
reste. »

CE QUE L'API FAIT DEJA, ET QU'IL N'A PAS FALLU CORRIGER
    Les cinq autres puces de D31 etaient deja tenues, verifiees une par une :
    une note sans avis renvoie `None` et non 0 ; une distance sans position de
    l'acheteur renvoie `None` ; une campagne flash doit etre approuvee, dans sa
    fenetre et avoir du stock pour sortir ; aucun champ « Sponsorise » n'est
    servi ; les compteurs viennent de vrais `count()`.

CE QUI MANQUAIT
    Douze commandes `seed_*_demo` peuplent la base de boutiques, de relais,
    d'avis et de commandes fictifs. Rien n'empechait de les lancer sur le
    serveur public : il suffisait d'une faute de frappe dans un nom de serveur
    pour que « Relais Mvog-Ada » apparaisse aux visiteurs.

    Le remede n'est pas de supprimer ces jeux — ils servent a juger les ecrans,
    et le serveur de test de D23 en aura besoin. C'est de les fermer par
    defaut, comme les comptes de demonstration de D27 : il faut poser
    explicitement DONNEES_DEMO_AUTORISEES=1, ce que la production ne fera
    jamais.
"""

from django.conf import settings
from django.core.management.base import CommandError

# Tout artefact de demonstration porte « demo » dans son identifiant. Ces
# prefixes servent a les RETROUVER dans une base dont on ne sait plus ce
# qu'elle contient — voir la commande `donnees_demo`.
MARQUEURS_UTILISATEUR = (
    "demo_",          # demo_taty, demo_vendor_techstore, demo_comptoir_client...
    "maps_",          # maps_client_demo, maps_relay_demo...
    "avis_demo_",
    "acheteur_demo",
    "livreur_demo",
    "org_demo",
    "relais_demo",
    "vendeur_demo",
    "admin_demo",
)

MESSAGE_REFUS = (
    "Jeux de demonstration fermes (tache D31).\n"
    "\n"
    "    Cette commande peuple la base de boutiques, de relais, d'avis et de\n"
    "    commandes fictifs. Sur le site public, un visiteur qui repere un faux\n"
    "    chiffre ne croit plus le reste.\n"
    "\n"
    "    Pour l'autoriser sur un serveur de developpement ou de test :\n"
    "\n"
    "        DONNEES_DEMO_AUTORISEES=1\n"
    "\n"
    "    La production ne pose jamais cette variable."
)


def demonstration_autorisee() -> bool:
    return bool(getattr(settings, "DONNEES_DEMO_AUTORISEES", False))


def exiger_demonstration_autorisee() -> None:
    """
    A appeler en PREMIERE instruction de `handle()`, avant toute ecriture.

    Leve `CommandError` : Django l'affiche proprement et sort en code 1, sans
    trace d'exception — c'est une decision, pas un incident.
    """
    if not demonstration_autorisee():
        raise CommandError(MESSAGE_REFUS)


def comptes_de_demonstration():
    """
    Les comptes de demonstration presents dans la base courante.

    Sert a verifier qu'un serveur est propre, et a mesurer ce qu'il reste a
    nettoyer sur un serveur qui ne l'est pas.
    """
    from django.contrib.auth.models import User
    from django.db.models import Q

    condition = Q()
    for marqueur in MARQUEURS_UTILISATEUR:
        condition |= Q(username__startswith=marqueur)
    # `demo` ailleurs que comme prefixe : vendeur_demo, maps_client_demo...
    condition |= Q(username__contains="_demo")
    return User.objects.filter(condition).order_by("username")
