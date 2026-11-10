# backend/apps/vendors/inscription_seule.py
# DEV-SRV-01, T07-1 — le vendeur s'inscrit seul sur seller.belivay.com : « nom de la boutique, numéro de téléphone
# vérifié par code SMS, quartier ». Puis T07-2 : la pièce d'identité et le numéro Mobile Money sont demandés au premier
# produit (apps.vendors.kyc), et T07-3 : le dossier complet avant le premier versement.
#
# Rien n'est réécrit à côté du cœur : le code passe par le moteur unique (apps.otp), le compte et la boutique naissent
# par la même fonction que le parcours par agent (agent_terrain.creer_compte_vendeur → apps.vendors.ouverture,
# EN ATTENTE), et le quartier donne la zone de la même façon. « Si l'envoi de SMS n'est pas opérationnel, le parcours
# par agent ouvre seul ; l'inscription autonome suit dès que le SMS fonctionne » : ce parcours est prêt pour ce jour-là.

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction

from apps.client_core.erreurs import ErreurClient
from apps.common.phone import normalize_cameroon_phone
from apps.otp import services as codes
from apps.otp.models import CodeOtp
from apps.vendors.agent_terrain import (compte_existant, creer_compte_vendeur, ligne_quartier,
                                        ouvrir_dans_son_quartier)
from apps.vendors.models import VendorProfile
from apps.vendors.ouverture import Refus

OBJET = CodeOtp.Objet.VENDEUR_OUVERTURE
MOT_DE_PASSE_MIN = 8


def _connecte(user):
    return user if user is not None and user.is_authenticated else None


def _numero(telephone: str, user=None) -> dict:
    numero = normalize_cameroon_phone(telephone or "")
    if not numero["is_valid"] or not numero["is_mobile"]:
        raise Refus("numero", "Numéro de téléphone mobile camerounais invalide.")
    if user is not None and VendorProfile.objects.filter(user=user).exists():
        raise Refus("deux_comptes", "Vous avez déjà une boutique.")
    if compte_existant(numero, sauf=user):
        # Le numéro d'un autre compte, ou d'un compte existant alors que personne n'est connecté : la personne se
        # connecte et ouvre sa boutique depuis son compte. On ne crée jamais un second compte sur un même numéro.
        raise Refus("compte_existant", "Ce numéro a déjà un compte BelivaY : connectez-vous, puis ouvrez votre "
                                       "boutique depuis votre compte.")
    return numero


def demander_code(telephone: str, user=None) -> dict:
    """Envoie le code au numéro ; rend {destination masquée, valideMinutes, renvoiSecondes}. Lève Refus sinon."""
    user = _connecte(user)
    numero = _numero(telephone, user)
    try:
        return codes.envoyer(objet=OBJET, destination=numero["e164"], utilisateur=user)
    except ErreurClient as erreur:
        raise Refus("limite", erreur.message) from erreur


def inscrire(*, telephone: str, code: str, nom: str, quartier: str, mot_de_passe: str = "", latitude=None,
             longitude=None, reperes: str = "", user=None) -> VendorProfile:
    """
    Vérifie le code, puis crée la boutique EN ATTENTE : pour le compte connecté (client qui devient vendeur, D19),
    sinon dans un nouveau compte au mot de passe choisi. Lève Refus sinon.

    Le code n'est consommé qu'avec la création, dans la même transaction : si la boutique est refusée (nom déjà
    pris…), le vendeur corrige et réessaie avec le même code.
    """
    user = _connecte(user)
    numero = _numero(telephone, user)
    if not (nom or "").strip():
        raise Refus("nom", "Le nom de la boutique est requis.")
    ligne = ligne_quartier(quartier)
    if user is None:
        # Le projet ne déclare aucun AUTH_PASSWORD_VALIDATORS : la longueur minimale est donc posée ici.
        if len(mot_de_passe or "") < MOT_DE_PASSE_MIN:
            raise Refus("mot_de_passe", f"Le mot de passe doit faire au moins {MOT_DE_PASSE_MIN} caractères.")
        try:
            validate_password(mot_de_passe or "")
        except ValidationError as erreur:
            raise Refus("mot_de_passe", " ".join(erreur.messages)) from erreur

    verification = codes.verifier(objet=OBJET, code=code or "", destination=numero["e164"], consommer=False)
    if not verification.get("ok"):
        if verification.get("bloqueJusqua"):
            raise Refus("bloque", "Trop d'essais : demandez un nouveau code dans quelques minutes.")
        if verification.get("expire"):
            raise Refus("expire", "Code expiré : demandez-en un nouveau.")
        raise Refus("code", f"Code incorrect ({verification.get('essaisRestants', 0)} essai(s) restant(s)).")

    with transaction.atomic():
        if user is None:
            profil = creer_compte_vendeur(nom=nom, numero=numero, ligne=ligne, latitude=latitude,
                                          longitude=longitude, reperes=reperes, mot_de_passe=mot_de_passe)
        else:
            profil = ouvrir_dans_son_quartier(user, nom=nom, numero=numero, ligne=ligne, latitude=latitude,
                                              longitude=longitude, reperes=reperes)
        if not codes.verifier(objet=OBJET, code=code, destination=numero["e164"]).get("ok"):
            raise Refus("expire", "Code expiré : demandez-en un nouveau.")
    return profil
