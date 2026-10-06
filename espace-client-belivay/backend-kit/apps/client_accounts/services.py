# backend/apps/client_accounts/services.py
# Logique du compte client. Les autres applications du kit l'appellent par import paresseux :
#
#   profil(user)               → ProfilClient (créé au besoin) : relais_habituel_id, numero_verifie_le, type_compte, devise…
#   numero_verifie(user)       → « 677123441 » ou None (numéro vérifié du compte, en clair, pour un SMS)
#   adresse(user, id), adresse_principale(user) → Adresse ou None (attributs nom, quartier, libelle, lat, lon)
#   ifa_negatif(user)          → False (relaya n'a pas de palier IFA acheteur : décision D11 du kit)
#   client(user)               → Client du site (ResultatCode.client)
#   fermer_autres_sessions(user, request), fermer_toutes_sessions(user) — CAP-15, CAP-17
#   noter_recherche(user, texte), noter_vu(user, product_id) — historique (RECH-HIST), effaçable (DP-54)
#   etat_business(user)        → « aucune » | « envoyee » | « verifiee » | « refusee » (compte Business)
#
# Les compteurs qui viennent d'autres applications du kit (litiges, messages, portefeuille, factures, moyens,
# cagnotte, avis à donner) sont lus par `appeler` : application absente ou fonction pas encore écrite → valeur
# neutre. Les commandes, relais, boutiques et favoris de relaya sont lus par le pont (apps.client_core.pont).

import importlib
import logging
import secrets

from django.apps import apps as registre_apps
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from apps.client_core import parametres, pont
from apps.client_core.chiffrement import chiffrer, empreinte
from apps.client_core.erreurs import conflit, refus
from apps.client_core.masquage import masquer_email, masquer_numero, numero_local, operateur
from apps.client_core.temps import ms

from . import regles
from .models import (
    Adresse,
    AlerteFavori,
    BoutiqueClient,
    ChangementNumero,
    ConsentementLegal,
    DemandeBusiness,
    IdentiteLiee,
    ProduitVu,
    ProfilClient,
    Recherche,
    VersionLegale,
)

logger = logging.getLogger("apps.client_accounts")

# PARAMÈTRE À AJOUTER AU REGISTRE : DONNEES-GARDE-ANS (pièces comptables gardées après suppression : 10 ans, OHADA ;
# source-demo.ts suppression().gardeAns)
GARDE_LEGALE_ANS = 10

ETATS_TERMINES = ("remise", "renvoyee_vendeur", "annulee")
ETATS_LITIGE = ("en_litige", "retour_en_cours")


def appeler(module: str, fonction: str, *args, defaut=None, **kwargs):
    """Fonction d'une autre application du kit si elle est installée et écrite, sinon `defaut`."""
    try:
        f = getattr(importlib.import_module(module), fonction)
    except (ImportError, AttributeError):
        return defaut
    return f(*args, **kwargs)


def _modele_relaya(cle: str, defaut: str):
    """Modèle de relaya hors du pont du socle (favori, notification, session) : settings.BELIVAY_MODELES ou défaut."""
    try:
        return registre_apps.get_model(getattr(settings, "BELIVAY_MODELES", {}).get(cle, defaut))
    except (LookupError, ValueError):
        return None


# ── Profil et numéro ────────────────────────────────────────────────────────────────────────────────────


def profil(user) -> ProfilClient:
    return ProfilClient.objects.get_or_create(user=user)[0]


def numero_verifie(user) -> str | None:
    p = ProfilClient.objects.filter(user=user).first()
    return p.numero if p is not None and p.numero_verifie else None


def numero_pris(numero: str, sauf=None) -> bool:
    """CIN-35 : ce numéro est-il déjà vérifié sur un autre compte ?"""
    qs = ProfilClient.objects.filter(numero_empreinte=empreinte(numero_local(numero)), numero_verifie_le__isnull=False)
    if sauf is not None:
        qs = qs.exclude(user=sauf)
    return qs.exists()


def enregistrer_numero(user, numero: str) -> ProfilClient:
    """Le numéro devient celui du compte, vérifié maintenant ; 409 utilise si un autre compte l'a pris entre-temps."""
    n = numero_local(numero)
    p = profil(user)
    p.numero_chiffre = chiffrer(n)
    p.numero_empreinte = empreinte(n)
    p.numero_masque = masquer_numero(n)
    p.operateur = operateur(n) or ""
    p.numero_verifie_le = timezone.now()
    try:
        with transaction.atomic():
            p.save()
    except IntegrityError:
        raise conflit("utilise", "Ce numéro est déjà vérifié sur un autre compte.") from None
    return p


def ifa_negatif(user) -> bool:
    """Palier IFA négatif d'un acheteur : relaya n'en a pas encore (CORRESPONDANCE § 11.3, décision D11)."""
    return False


def relais_habituel(user):
    p = ProfilClient.objects.filter(user=user).first()
    return pont.relais(p.relais_habituel_id) if p is not None and p.relais_habituel_id else None


# ── Client (ResultatCode.client) ────────────────────────────────────────────────────────────────────────


def methode_connexion(user, request=None) -> str:
    """google | apple | email : la méthode de cette connexion si le jeton la porte, sinon la plus probable."""
    payload = getattr(getattr(request, "auth", None), "payload", None) or {}
    if payload.get("methode") in ("google", "apple", "email"):
        return payload["methode"]
    if user.has_usable_password():
        return "email"
    lien = IdentiteLiee.objects.filter(user=user).order_by("-liee_le").first()
    return lien.fournisseur if lien is not None else "email"


def portrait(user, taille: int) -> dict:
    """Portrait par défaut : initiales sur un disque (le site affiche la photo choisie à la place, DP-52)."""
    initiales = ((user.first_name or user.username or "?")[:1] + (user.last_name or "")[:1]).upper()
    r = taille // 2
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{taille}" height="{taille}" viewBox="0 0 {taille} {taille}">'
        f'<circle cx="{r}" cy="{r}" r="{r}" fill="#E8EEF7"/>'
        f'<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" '
        f'font-size="{taille * 0.4:.0f}" fill="#24406B">{initiales}</text></svg>'
    )
    return {"svg": svg}


def client(user, request=None) -> dict:
    p = profil(user)
    nom_complet = " ".join(x for x in (user.first_name, user.last_name) if x)
    return {
        "prenom": user.first_name or "",
        "nom": user.last_name or "",
        "nomComplet": nom_complet,
        "numeroMasque": p.numero_masque if p.numero_verifie else "",
        "operateur": p.operateur if p.numero_verifie else "",
        "email": user.email or "",
        "emailMasque": masquer_email(user.email or ""),
        "connexion": methode_connexion(user, request),
        "portrait": {"36": portrait(user, 36), "48": portrait(user, 48)},
        "photo": p.photo or None,
    }


# ── Sessions (CAP-15, CAP-17) ───────────────────────────────────────────────────────────────────────────


def _blacklister(jtis=None, user=None) -> int:
    try:
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
    except (ImportError, RuntimeError):  # application token_blacklist absente
        return 0
    qs = OutstandingToken.objects.all()
    if user is not None:
        qs = qs.filter(user=user)
    if jtis is not None:
        qs = qs.filter(jti__in=list(jtis))
    n = 0
    for t in qs.exclude(blacklistedtoken__isnull=False):
        BlacklistedToken.objects.get_or_create(token=t)
        n += 1
    return n


def fermer_autres_sessions(user, request=None) -> int:
    """Ferme les sessions des autres appareils (comme POST /api/auth/sessions/revoke-all/ de relaya) ; garde celle-ci.

    relaya suit les sessions dans accounts.UserSession (jti par appareil). Sans ce modèle (projet d'essai), on ne
    sait pas distinguer la session courante des autres : rien n'est fermé et un avertissement est journalisé."""
    UserSession = _modele_relaya("session", "accounts.UserSession")
    if UserSession is None:
        logger.warning("Sessions non suivies (accounts.UserSession absent) : autres sessions de %s non fermées", user.pk)
        return 0
    courant = str((getattr(getattr(request, "auth", None), "payload", None) or {}).get("jti", ""))
    sessions = UserSession.objects.filter(user=user, is_active=True).exclude(jti=courant)
    jtis = list(sessions.values_list("jti", flat=True))
    _blacklister(jtis=jtis)
    return sessions.update(is_active=False)


def fermer_toutes_sessions(user) -> int:
    """Toutes les sessions (nouveau mot de passe par lien, suppression du compte) : jetons de rafraîchissement
    mis en liste noire, sessions relaya désactivées, abonnements push révoqués (CAP-17)."""
    n = _blacklister(user=user)
    UserSession = _modele_relaya("session", "accounts.UserSession")
    if UserSession is not None:
        UserSession.objects.filter(user=user, is_active=True).update(is_active=False)
    appeler("apps.notifications_client.services", "revoquer_appareils", user)
    return n


# ── Adresses (CCO-10, CCO-11, DP-09) ────────────────────────────────────────────────────────────────────


def zones() -> list[tuple[str, str]]:
    return [(z.code, z.nom) for z in parametres.geo().zones]


def adresse(user, adresse_id) -> Adresse | None:
    try:
        pk = int(adresse_id)
    except (TypeError, ValueError):
        return None
    return Adresse.objects.filter(user=user, pk=pk).first()


def adresse_par_libelle(user, libelle) -> Adresse | None:
    """L'adresse dont l'écran montre le libellé « Nom · Quartier » (changerLieu du site), ou son identifiant."""
    a = adresse(user, libelle)
    if a is not None:
        return a
    nom, _, quartier = str(libelle or "").partition(" · ")
    if not nom.strip() or not quartier.strip():
        return None
    return Adresse.objects.filter(user=user, nom=nom.strip(), quartier=quartier.strip()).order_by("-principale", "id").first()


def adresse_principale(user) -> Adresse | None:
    return Adresse.objects.filter(user=user).order_by("-principale", "cree_le", "id").first()


def adresse_en_dict(a: Adresse) -> dict:
    servies = {nom for _, nom in zones()}
    d = {
        "id": str(a.pk),
        "nom": a.nom,
        "quartier": a.quartier,
        "zoneServie": a.quartier in servies,
        "reperes": a.reperes,
        "position": a.position,
        "creneau": a.creneau or None,
        "photo": a.photo or None,
        "principale": a.principale,
    }
    if a.coords is not None:
        d["coords"] = a.coords
    if a.instructions:
        d["instructions"] = a.instructions
    if a.destinataire:
        d["destinataire"] = a.destinataire
    return d


def enregistrer_adresse(user, donnees: dict, adresse_id=None) -> Adresse:
    """Crée ou modifie une adresse ; 422 zone_non_servie {ville} hors des zones exploitées (le relais continue)."""
    from belivay_moteurs.geo import zone_exploitee

    trouvee = regles.zone_du_quartier(donnees["quartier"], zones())
    if trouvee is None or zone_exploitee(trouvee[0], parametres.geo()) is None:
        ville = regles.ville_de(donnees["quartier"])
        raise refus("zone_non_servie", f"BelivaY ne livre pas encore à {ville}. Le retrait au relais reste possible.", {"ville": ville})
    with transaction.atomic():
        if adresse_id is not None:
            a = Adresse.objects.select_for_update().filter(user=user, pk=adresse_id).first()
            if a is None:
                from apps.client_core.erreurs import introuvable

                raise introuvable()
        else:
            a = Adresse(user=user, principale=not Adresse.objects.filter(user=user).exists())
        a.nom = donnees["nom"].strip()
        a.quartier = trouvee[1]
        a.reperes_chiffre = chiffrer(donnees["reperes"].strip())
        a.instructions_chiffre = chiffrer(donnees["instructions"].strip()) if (donnees.get("instructions") or "").strip() else None
        a.destinataire_chiffre = chiffrer(donnees["destinataire"].strip()) if (donnees.get("destinataire") or "").strip() else None
        c = donnees.get("coords")
        a.coords_chiffre = chiffrer(f"{c['lat']};{c['lon']};{c.get('precision', 0)}") if c else None
        a.position = bool(donnees.get("position"))
        a.creneau = donnees.get("creneau") or None
        a.photo = donnees.get("photo") or None
        a.save()
    return a


def adresse_par_defaut(user, a: Adresse) -> Adresse:
    with transaction.atomic():
        Adresse.objects.filter(user=user).exclude(pk=a.pk).update(principale=False)
        a.principale = True
        a.save(update_fields=["principale", "modifie_le"])
    return a


def supprimer_adresse(user, a: Adresse) -> None:
    """Supprimée, l'adresse principale passe à la suivante (s'il en reste une)."""
    with transaction.atomic():
        etait_principale = a.principale
        a.delete()
        if etait_principale:
            suivante = Adresse.objects.filter(user=user).order_by("cree_le", "id").first()
            if suivante is not None:
                suivante.principale = True
                suivante.save(update_fields=["principale", "modifie_le"])


def donnees_adresses(user) -> dict:
    r = relais_habituel(user)
    return {
        "adresses": [adresse_en_dict(a) for a in Adresse.objects.filter(user=user)],
        "zonesServies": [nom for _, nom in zones()],
        "relais": r.nom if r is not None else "",
        "domicile": {"prix": parametres.entier("LIV-DOM-BASE"), "offertDes": parametres.livraison().seuil_domicile},
    }


# ── Historique (DP-54, RECH-HIST) ───────────────────────────────────────────────────────────────────────


def noter_recherche(user, texte: str) -> None:
    texte = (texte or "").strip()[:120]
    if not texte or not getattr(user, "is_authenticated", False):
        return
    Recherche.objects.filter(user=user, texte__iexact=texte).delete()
    Recherche.objects.create(user=user, texte=texte)
    garder = parametres.entier("RECH-HIST")
    anciennes = list(Recherche.objects.filter(user=user).values_list("pk", flat=True)[garder:])
    Recherche.objects.filter(pk__in=anciennes).delete()


def noter_vu(user, product_id) -> None:
    if getattr(user, "is_authenticated", False):
        ProduitVu.objects.update_or_create(user=user, product_id=int(product_id))


def effacer_historique(user, quoi: str) -> None:
    if quoi in ("recherches", "tout"):
        Recherche.objects.filter(user=user).delete()
    if quoi in ("vus", "tout"):
        ProduitVu.objects.filter(user=user).delete()


def donnees_confidentialite(user) -> dict:
    p = profil(user)
    return {
        "personnalisation": p.personnalisation,
        "partenaires": False,  # aucune donnée vendue ni partagée pour de la publicité (toujours non)
        "nomRetrait": p.nom_retrait or None,
        "historique": {"recherches": Recherche.objects.filter(user=user).count(), "vus": ProduitVu.objects.filter(user=user).count()},
    }


# ── Commandes, comptoir, compteurs ──────────────────────────────────────────────────────────────────────


def _sous_commandes(user):
    try:
        from apps.pickup.models import MontantsCommande, SousCommande
    except ImportError:
        return None
    commandes = MontantsCommande.objects.filter(client=user).values_list("order_id", flat=True)
    return SousCommande.objects.filter(order_id__in=commandes)


def compte_comptoir(user):
    """CompteClient du moteur comptoir.py : commandes retirées, sans incident, refus au comptoir."""
    from belivay_moteurs.comptoir import CompteClient

    sc = _sous_commandes(user)
    if sc is None:
        return CompteClient(0, 0, 0, ifa_negatif(user))
    from apps.pickup.models import CompteComptoir

    retirees = set(sc.filter(remise_le__isnull=False).values_list("order_id", flat=True))
    avec_incident = set(sc.filter(order_id__in=retirees, etat__in=ETATS_LITIGE).values_list("order_id", flat=True))
    refus_comptoir = CompteComptoir.objects.filter(client=user).values_list("refus", flat=True).first() or 0
    return CompteClient(len(retirees), len(retirees - avec_incident), refus_comptoir, ifa_negatif(user))


def palier(user) -> dict:
    """Avantages actifs (CCO-04, CAL-13) : remboursement immédiat (LIT-AUTO-STD), plafond du comptoir et suivant."""
    from belivay_moteurs.comptoir import PalierComptoir, palier_comptoir, plafond

    p = parametres.paiement()
    compte = compte_comptoir(user)
    niveau = palier_comptoir(compte, p)
    d = {
        "remboursementImmediat": parametres.litiges().auto_standard,
        "comptoir": plafond(compte, p),
        "suivant": None if niveau == PalierComptoir.FIDELE else {"comptoir": p.comptoir_fidele, "commandes": p.commandes_fidele},
    }
    if niveau == PalierComptoir.NOUVEAU:
        d["prochain"] = p.comptoir_standard
    return d


def _libelle_colis(etat: str) -> str:
    return {
        "payee": "Payée · en attente du vendeur",
        "confirmee": "En préparation",
        "prete": "Prête chez le vendeur",
        "collectee": "En route vers le relais",
        "arrivee_relais": "Retirable maintenant",
        "en_livraison_domicile": "En livraison",
        "en_litige": "En litige",
        "retour_en_cours": "Retour en cours",
    }.get(etat, "En cours")


def commandes_en_cours(user) -> list[dict]:
    """CommandeEnCours du site : une ligne par commande pas terminée (litige compris)."""
    sc = _sous_commandes(user)
    if sc is None:
        return []
    lignes: dict[int, dict] = {}
    for s in sc.exclude(etat__in=ETATS_TERMINES).order_by("order_id", "n"):
        litige = s.etat in ETATS_LITIGE
        ligne = lignes.setdefault(
            s.order_id, {"ref": pont.ref_commande(s.order_id), "libelle": _libelle_colis(s.etat), "dessin": "", "litige": False}
        )
        if litige and not ligne["litige"]:
            ligne["litige"], ligne["libelle"] = True, _libelle_colis(s.etat)
    return list(lignes.values())


def _favoris(user):
    Favori = _modele_relaya("favori", "accounts.UserFavorite")
    return Favori.objects.filter(user=user) if Favori is not None else None


def favori_du_client(user, favorite_id):
    qs = _favoris(user)
    try:
        return qs.filter(pk=int(favorite_id)).first() if qs is not None else None
    except (TypeError, ValueError):
        return None


def _nombre(valeur) -> int:
    try:
        return int(valeur or 0)
    except (TypeError, ValueError):
        return 0


def portefeuille(user) -> dict:
    return {
        "solde": _nombre(appeler("apps.wallet.services", "solde", user, defaut=0)),
        "cagnotteEnAttente": _nombre(appeler("apps.subscriptions.services", "cagnotte_en_attente", user, defaut=0)),
    }


def donnees_compte(user) -> dict:
    p = profil(user)
    r = relais_habituel(user)
    principale = adresse_principale(user)
    favoris = _favoris(user)
    acces = ""
    if r is not None and r.position and principale is not None and principale.lat is not None:
        km = appeler("apps.cart.services", "distance_km", (principale.lat, principale.lon), r.position)
        acces = f"{str(km).replace('.', ',')} km" if km is not None else ""
    b = boutique(user)
    return {
        "numeroVerifie": p.numero_verifie,
        "compteurs": {
            "commandes": pont.modele("commande").objects.filter(user=user).count(),
            "litiges": _nombre(appeler("apps.aftersales.services", "litiges_en_cours", user, defaut=0)),
            "messagesNonLus": _nombre(appeler("apps.messaging.services", "non_lus", user, defaut=0)),
            "sauvegardes": favoris.count() if favoris is not None else 0,
            "factures": _nombre(appeler("apps.wallet.services", "nombre_factures", user, defaut=0)),
        },
        "portefeuille": portefeuille(user),
        "palier": palier(user),
        "relais": {"nom": r.nom, "gerant": r.gerant, "horaires": r.horaires, "acces": acces} if r is not None else None,
        "adressePrincipale": {"nom": principale.nom, "reperes": regles.reperes_courts(principale.quartier, principale.reperes)}
        if principale is not None
        else None,
        "moyens": [
            {"operateur": m.get("operateur", ""), "parDefaut": bool(m.get("parDefaut"))}
            for m in appeler("apps.wallet.services", "moyens", user, defaut=[]) or []
        ],
        "avisADonner": list(appeler("apps.aftersales.services", "avis_a_donner", user, defaut=[]) or []),
        "boutique": {"nom": b["nom"], "piece": b["piece"]} if b is not None else None,
    }


def _notifications_nouvelles(user) -> int:
    Notification = _modele_relaya("notification", "accounts.UserNotification")
    if Notification is None:
        return 0
    return Notification.objects.filter(user=user, is_read=False).count()


def donnees_menu(user) -> dict:
    sc = _sous_commandes(user)
    a_retirer = sc.filter(etat="arrivee_relais").count() if sc is not None else 0
    en_preparation = (
        sc.filter(etat__in=("payee", "confirmee", "prete", "collectee", "en_livraison_domicile")).count() if sc is not None else 0
    )
    litiges = _nombre(appeler("apps.aftersales.services", "litiges_en_cours", user, defaut=0))
    ouverture, fermeture = parametres.nombres("SUP-HORAIRES")[:2]
    promotions = appeler("apps.cart.services", "resume_promotions", defaut=None) or {"nombre": 0, "remiseMax": 0}
    return {
        "promotions": {"nombre": _nombre(promotions.get("nombre")), "remiseMax": _nombre(promotions.get("remiseMax"))},
        "seuilPremium": parametres.entier("ABO-SEUIL-RELAIS"),
        "univers": list(appeler("apps.cart.services", "univers", defaut=[]) or []),
        "portefeuille": portefeuille(user),
        "commandes": {"aRetirer": a_retirer, "enPreparation": en_preparation, "badge": a_retirer + en_preparation},
        # favoris suivis : avec une alerte de prix ou de retour en stock
        "sauvegardesSuivis": AlerteFavori.objects.filter(user=user).filter(Q(prix=True) | Q(stock=True)).count(),
        "litiges": {"enCours": litiges, "badge": litiges},
        "messagesNonLus": _nombre(appeler("apps.messaging.services", "non_lus", user, defaut=0)),
        "notificationsNouvelles": _notifications_nouvelles(user),
        "support": {"ouverture": ouverture, "fermeture": fermeture},
    }


# ── Suppression du compte (9.5, DP-06, DP-54) ───────────────────────────────────────────────────────────


def donnees_suppression(user) -> dict:
    p = profil(user)
    b = boutique(user)
    favoris = _favoris(user)
    return {
        "enCours": commandes_en_cours(user),
        "solde": portefeuille(user)["solde"],
        "numero": p.numero_masque if p.numero_verifie else "",
        "perdu": {
            "cagnotte": portefeuille(user)["cagnotteEnAttente"],
            "boutique": b["nom"] if b is not None else None,
            "abonnement": bool(appeler("apps.subscriptions.services", "abonnement_actif", user, defaut=False)),
            "proches": _nombre(appeler("apps.diaspora.services", "proches_actifs", user, defaut=0)),
            "favoris": favoris.count() if favoris is not None else 0,
        },
        "gardeAns": GARDE_LEGALE_ANS,
    }


def suppression_possible(user) -> tuple[bool, dict]:
    """Refusée tant qu'une commande ou un litige est en cours, ou que le portefeuille n'est pas vide (DP-06)."""
    en_cours = commandes_en_cours(user)
    litiges = _nombre(appeler("apps.aftersales.services", "litiges_en_cours", user, defaut=0))
    solde = portefeuille(user)["solde"]
    ok = not en_cours and litiges == 0 and solde == 0
    return ok, {"enCours": en_cours, "litiges": litiges, "solde": solde}


def supprimer_compte(user) -> None:
    """Pseudonymise le compte (jamais d'effacement des données légales) :
    - gardés : commandes et paiements (relaya), factures, consentements légaux (preuve), journal des paiements ;
    - effacés : nom, e-mail, numéro, photo, adresses, historique, identités liées, alertes, boutique non ouverte ;
    - fermés : sessions et abonnements push (CAP-17) ; le compte ne peut plus se connecter."""
    with transaction.atomic():
        p = profil(user)
        p.numero_chiffre, p.numero_empreinte, p.numero_masque, p.operateur, p.numero_verifie_le = None, None, "", "", None
        p.photo, p.nom_retrait, p.interets, p.relais_habituel_id = None, None, [], None
        p.supprime_le = timezone.now()
        p.save()
        Adresse.objects.filter(user=user).delete()
        Recherche.objects.filter(user=user).delete()
        ProduitVu.objects.filter(user=user).delete()
        IdentiteLiee.objects.filter(user=user).delete()
        AlerteFavori.objects.filter(user=user).delete()
        user.username = f"supprime-{user.pk}-{secrets.token_hex(4)}"
        user.email, user.first_name, user.last_name = "", "", ""
        user.set_unusable_password()
        user.is_active = False
        user.save()
    fermer_toutes_sessions(user)
    appeler("apps.notifications_client.services", "oublier", user)


# ── Légal (CL-13, CAP-23) ───────────────────────────────────────────────────────────────────────────────


def version_en_vigueur() -> VersionLegale | None:
    return VersionLegale.objects.filter(publiee_le__lte=timezone.now()).order_by("-publiee_le").first()


def donnees_legal(user=None, doc: str | None = None) -> dict | None:
    v = version_en_vigueur()
    if v is None:
        return None
    documents = v.documents
    if doc and doc not in ("tout", "all"):
        documents = [d for d in documents if d.get("cle") == doc]
        if not documents:
            return None
    acceptee, changement = None, None
    if user is not None and user.is_authenticated:
        dernier = ConsentementLegal.objects.filter(user=user).order_by("-le", "-id").first()
        p = profil(user)
        acceptee = ms(dernier.le) if dernier is not None else ms(p.cgu_acceptee_le)
        version_acceptee = dernier.version if dernier is not None else p.cgu_version
        if version_acceptee != v.version and v.changements:
            changement = {"version": v.version, "des": ms(v.publiee_le), "points": list(v.changements)}
    return {
        "version": v.version,
        "publiee": ms(v.publiee_le),
        "acceptee": acceptee,
        "pdf": v.pdf or None,
        "documents": documents,
        "changement": changement,
    }


def accepter_conditions(user, doc: str, version: str, request=None) -> None:
    """Consentement horodaté (CAP-23) ; « tout » : chaque document à accepter de la version."""
    v = VersionLegale.objects.filter(version=version).first()
    if v is None:
        raise refus("version_inconnue", "Cette version des conditions n'existe pas.")
    a_accepter = [d["cle"] for d in v.documents if d.get("aAccepter")]
    cles = a_accepter if doc in ("tout", "all") else [doc]
    if any(c not in {d.get("cle") for d in v.documents} for c in cles):
        raise refus("document_inconnu", "Ce document n'existe pas dans cette version.")
    ip = (request.META.get("REMOTE_ADDR") or None) if request is not None else None
    appareil = (request.headers.get("User-Agent", "") if request is not None else "")[:200]
    with transaction.atomic():
        for c in cles:
            ConsentementLegal.objects.create(user=user, doc=c, version=version, ip=ip, appareil=appareil)
        if "cgu" in cles:
            p = profil(user)
            p.cgu_version, p.cgu_acceptee_le = version, timezone.now()
            p.save(update_fields=["cgu_version", "cgu_acceptee_le", "modifie_le"])


# ── Boutique et compte Business (CL-13, 9.6) ────────────────────────────────────────────────────────────


def boutique(user) -> dict | None:
    """Boutique ouverte depuis le compte ; à défaut, le profil vendeur relaya de l'utilisateur (ouvert ailleurs)."""
    b = BoutiqueClient.objects.filter(user=user).first()
    if b is not None:
        return {"nom": b.nom, "categorie": b.categorie, "type": b.type, "code": b.code, "piece": b.piece}
    v = pont.modele("vendeur").objects.filter(user=user).first()
    if v is None:
        return None
    statut = getattr(v, "status", "")
    piece = (
        "verifiee"
        if statut == "APPROVED"
        else "refusee"
        if statut == "REJECTED"
        else ("envoyee" if getattr(v, "id_document", "") else "aucune")
    )
    return {"nom": v.business_name, "categorie": "", "type": "particulier", "code": getattr(v, "shop_slug", "") or "", "piece": piece}


def _nom_pris(nom: str, user) -> bool:
    if BoutiqueClient.objects.filter(nom__iexact=nom).exclude(user=user).exists():
        return True
    return pont.modele("vendeur").objects.filter(business_name__iexact=nom).exclude(user=user).exists()


def _nouveau_code(prenom: str) -> str:
    lettres = regles.lettres_code(prenom)
    for _ in range(50):
        code = f"{lettres}-{secrets.randbelow(9000) + 1000}"
        if not BoutiqueClient.objects.filter(code=code).exists():
            return code
    raise conflit("state_changed", "Réessaie dans un instant.")  # pragma: no cover - 9 000 codes par préfixe


def ouvrir_boutique(user, nom: str, categorie: str, type_: str) -> dict:
    """ResultatBoutique : nom 3 à 40 caractères, unique (409 nom_pris), numéro vérifié exigé.

    La boutique est gardée dans le kit (code, catégorie, type, état de la pièce) et un vendors.VendorProfile EN
    ATTENTE est créé par le pont (comme POST /api/vendors/apply/ de relaya), avec les seuls champs connus ici ; la
    pièce d'identité se donne ensuite dans l'espace vendeur, avant de vendre."""
    propre, raison = regles.nom_boutique(nom)
    if not profil(user).numero_verifie:
        return {"ok": False, "raison": "numero"}
    if raison is not None:
        return {"ok": False, "raison": raison}
    if _nom_pris(propre, user):
        raise conflit("nom_pris", "Ce nom de boutique est déjà pris.")
    with transaction.atomic():
        b = BoutiqueClient.objects.filter(user=user).first() or BoutiqueClient(user=user, code=_nouveau_code(user.first_name))
        b.nom, b.categorie, b.type = propre, categorie.strip(), type_
        Vendeur = pont.modele("vendeur")
        v = Vendeur.objects.filter(user=user).first()
        if v is None:
            champs = {f.name for f in Vendeur._meta.get_fields()}
            valeurs = {
                "business_name": propre,
                "business_description": categorie.strip(),
                "phone": numero_verifie(user) or "",
                "address": "",
                "city": "Yaoundé",
                "status": "PENDING",
            }
            v = Vendeur.objects.create(user=user, **{k: x for k, x in valeurs.items() if k in champs})
        b.vendor_id = v.pk
        b.save()
    return {"ok": True, "boutique": {"nom": b.nom, "categorie": b.categorie, "type": b.type, "code": b.code, "piece": b.piece}}


def demander_business(user, piece: str) -> None:
    DemandeBusiness.objects.create(user=user, piece=piece)


def etat_business(user) -> str:
    d = DemandeBusiness.objects.filter(user=user).order_by("-le", "-id").first()
    return d.etat if d is not None else "aucune"


# Nom lu par apps.subscriptions (DonneesPrime.business).
etat_demande_business = etat_business


# ── Identités Google et Apple (CIN-46) ──────────────────────────────────────────────────────────────────


class JetonInvalide(ValueError):
    pass


class FournisseurIndisponible(RuntimeError):
    pass


def verifier_jeton_identite(fournisseur: str, jeton: str) -> dict:
    """{sujet, email} d'un jeton Google (ID token) ou Apple (identityToken), vérifié comme les connexions de relaya
    (apps.accounts.views : google-auth et _verify_apple_identity_token). JetonInvalide ; FournisseurIndisponible
    si la vérification n'est pas configurée sur ce serveur."""
    if fournisseur == "google":
        client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
        try:
            from google.auth.transport import requests as google_requests
            from google.oauth2 import id_token
        except ImportError:
            raise FournisseurIndisponible("google-auth absent") from None
        if not client_id:
            raise FournisseurIndisponible("GOOGLE_CLIENT_ID absent")
        try:
            claims = id_token.verify_oauth2_token(jeton, google_requests.Request(), None)
        except (ValueError, TypeError) as exc:
            raise JetonInvalide(str(exc)) from None
        if claims.get("aud") not in {client_id, *getattr(settings, "GOOGLE_EXTRA_CLIENT_IDS", [])}:
            raise JetonInvalide("audience Google non autorisée")
        if not claims.get("email_verified"):
            raise JetonInvalide("adresse Google non confirmée")
    else:
        try:
            from apps.accounts.views import _verify_apple_identity_token  # relaya-marketplace
        except ImportError:
            raise FournisseurIndisponible("vérification Apple de relaya absente") from None
        if not getattr(settings, "APPLE_CLIENT_IDS", None):
            raise FournisseurIndisponible("APPLE_CLIENT_IDS absent")
        try:
            claims = _verify_apple_identity_token(jeton)
        except Exception as exc:  # jwt.PyJWTError, ValueError : jeton refusé
            raise JetonInvalide(str(exc)) from None
    sujet = str(claims.get("sub", "")).strip()
    if not sujet:
        raise JetonInvalide("sujet absent")
    return {
        "sujet": sujet,
        "email": str(claims.get("email", "")).strip().lower(),
        "prenom": str(claims.get("given_name", "") or "").strip(),
        "nom": str(claims.get("family_name", "") or "").strip(),
    }


def lier_methode(user, fournisseur: str, jeton: str) -> dict:
    identite = verifier_jeton_identite(fournisseur, jeton)
    if IdentiteLiee.objects.filter(fournisseur=fournisseur, sujet=identite["sujet"]).exclude(user=user).exists():
        raise conflit("pris", "Ce compte est déjà lié à un autre compte BelivaY.")
    IdentiteLiee.objects.update_or_create(
        user=user, fournisseur=fournisseur, defaults={"sujet": identite["sujet"], "email_masque": masquer_email(identite["email"])}
    )
    return {"ok": True}


def delier_methode(user, methode: str) -> dict:
    """Retire une méthode de connexion ; 409 derniere s'il n'en resterait aucune."""
    liees = set(IdentiteLiee.objects.filter(user=user).values_list("fournisseur", flat=True))
    actives = liees | ({"email"} if user.has_usable_password() else set())
    if methode not in actives:
        return {"ok": True}
    if not actives - {methode}:
        raise conflit("derniere", "C'est ta dernière façon de te connecter : ajoute-en une autre avant.")
    if methode == "email":
        user.set_unusable_password()
        user.save(update_fields=["password"])
    else:
        IdentiteLiee.objects.filter(user=user, fournisseur=methode).delete()
    return {"ok": True}


# ── Changement de numéro (CIN-39 à CIN-43, CAP-15) ──────────────────────────────────────────────────────


def dernier_changement(user) -> ChangementNumero | None:
    return ChangementNumero.objects.filter(user=user).first()


def changer_numero(user, numero: str, request=None) -> ChangementNumero:
    """Le nouveau numéro devient celui du compte ; codes de retrait en cours renouvelés (CIN-40), autres sessions
    fermées (CAP-15) ; l'ancien numéro reste un moyen de paiement (CIN-43), si le portefeuille sait le garder."""
    p = profil(user)
    ancien, ancien_masque, ancien_op = p.numero, p.numero_masque, p.operateur
    with transaction.atomic():
        p = enregistrer_numero(user, numero)
        # CAP-15 : apps.pickup.services.regenerer_codes(user) → références des commandes renouvelées.
        renouvelees = appeler("apps.pickup.services", "regenerer_codes", user, defaut=None)
        if renouvelees is None:
            logger.warning("apps.pickup.services.regenerer_codes absent : codes de retrait de %s NON renouvelés (CAP-15)", user.pk)
            renouvelees = []
        c = ChangementNumero.objects.create(
            user=user,
            ancien_masque=ancien_masque,
            ancien_operateur=ancien_op,
            nouveau_masque=p.numero_masque,
            nouveau_operateur=p.operateur,
            renouvelees=list(renouvelees),
            relay_id=p.relais_habituel_id,
        )
    appeler("apps.wallet.services", "numero_change", user, ancien, numero_local(numero))
    fermer_autres_sessions(user, request)
    return c


def changement_en_dict(c: ChangementNumero) -> dict:
    r = pont.relais(c.relay_id) if c.relay_id else None
    return {
        "nouveau": c.nouveau_masque,
        "operateur": c.nouveau_operateur or "MTN",
        "ancien": c.ancien_masque,
        "ancienOperateur": c.ancien_operateur or "MTN",
        "renouvelees": list(c.renouvelees),
        "relais": r.nom if r is not None else "",
    }
