# backend/apps/vendors/agent_terrain.py
# DEV-SRV-01, T07-4/5 — inscription d'un vendeur par un agent de terrain, depuis admin.belivay.com :
# « l'agent crée le compte au nom du vendeur, photographie sa pièce d'identité sur place et saisit son catalogue.
# Le vendeur reçoit ensuite son accès à seller.belivay.com. »
#
# Rien n'est réécrit à côté du cœur : la boutique s'ouvre par la règle unique (apps.vendors.ouverture, EN ATTENTE),
# la pièce se dépose par le stockage unique des pièces (apps.accounts.compliance, sur R2), et le verrou d'identité
# (apps.vendors.kyc) décide seul de la publication et du versement. Décisions du porteur (2026-11-06) : compte en
# attente jusqu'à la validation de la pièce par la conformité ; accès par mot de passe provisoire remis sur place.

from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import Q

from apps.accounts import acces_provisoire
from apps.accounts.compliance import deposer_piece
from apps.accounts.models import AccesProvisoire, ComplianceDocument, PayoutAccount
from apps.common.models import AuditLog
from apps.common.phone import normalize_cameroon_phone
from apps.shipping import zones
from apps.vendors import kyc
from apps.vendors.models import InscriptionParAgent, VendorLocation, VendorProfile
from apps.vendors.ouverture import Refus, ouvrir_boutique


def journaliser(agent, objet, action: str, details: dict, ip=None):
    AuditLog.objects.create(
        action=AuditLog.Action.CREATE if action == "creation" else AuditLog.Action.UPDATE,
        content_type=ContentType.objects.get_for_model(objet), object_id=str(objet.pk),
        object_repr=str(objet)[:255], actor=agent, changes={"ecran": "agent_terrain", "geste": action, **details},
        ip_address=ip or None,
    )


def ligne_quartier(nom: str) -> dict:
    """Le quartier de t_quartiers (nom exact, sinon une appellation qui ne désigne qu'un seul quartier, R76.2)."""
    ligne = zones.quartier((nom or "").strip())
    if ligne is None:
        trouves = zones.chercher_quartiers(nom)
        ligne = trouves[0] if len(trouves) == 1 else None
    if ligne is None:
        raise Refus("quartier", "Quartier inconnu : choisissez-le dans la liste des quartiers de Yaoundé.")
    return ligne


def compte_existant(numero: dict) -> bool:
    valeurs = {numero["national"], numero["e164"], f"237{numero['national']}"}
    return User.objects.filter(
        Q(profile__phone__in=valeurs) | Q(vendor_profile__phone__in=valeurs) | Q(courier_profile__phone__in=valeurs)
        | Q(relay_point_profile__phone__in=valeurs) | Q(delivery_organization_profile__phone__in=valeurs)
    ).exists()


def _identifiant_libre(national: str) -> str:
    base = f"v{national}"
    identifiant, n = base, 1
    while User.objects.filter(username=identifiant).exists():
        n += 1
        identifiant = f"{base}-{n}"
    return identifiant


def inscrire_vendeur(agent, *, nom: str, telephone: str, quartier: str, gerant: str = "", latitude=None,
                     longitude=None, reperes: str = "", ip=None) -> tuple[VendorProfile, str]:
    """Crée le compte et la boutique EN ATTENTE ; rend (profil, mot de passe provisoire). Lève Refus sinon."""
    numero = normalize_cameroon_phone(telephone or "")
    if not numero["is_valid"]:
        raise Refus("numero", "Numéro de téléphone camerounais invalide.")
    # Un numéro qui a déjà un compte (client, vendeur, livreur…) : l'agent ne pose jamais de mot de passe sur un
    # compte existant. La personne ouvre sa boutique depuis son propre compte.
    if compte_existant(numero):
        raise Refus("compte_existant", "Ce numéro a déjà un compte BelivaY : le vendeur ouvre sa boutique depuis son "
                                       "compte (menu « Ouvrir ma boutique »).")
    ligne = ligne_quartier(quartier)
    gerant = (gerant or "").strip()
    reperes = (reperes or "").strip()

    with transaction.atomic():
        user = User.objects.create_user(username=_identifiant_libre(numero["national"]), first_name=gerant[:150])
        user.set_unusable_password()
        user.save(update_fields=["password"])
        profil = ouvrir_boutique(user, nom=nom, telephone=numero["e164"], adresse=ligne["quartier"],
                                 ville=ligne["commune"])
        VendorLocation.objects.create(
            vendor=profil, name=profil.business_name[:200], address=ligne["quartier"], description=reperes,
            phone=numero["e164"], representative_name=(gerant or profil.business_name)[:200],
            representative_phone=numero["e164"], latitude=latitude, longitude=longitude,
            quartier=ligne["quartier"], is_main=True,
        )
        InscriptionParAgent.objects.create(vendor=profil, agent=agent)
        mot_de_passe = acces_provisoire.donner(user, agent)
        journaliser(agent, profil, "creation", {"quartier": ligne["quartier"], "statut": profil.status}, ip)
    return profil, mot_de_passe


def vendeur_de_l_agent(agent, vendor_id) -> VendorProfile | None:
    """L'agent ne travaille que sur les vendeurs qu'il a inscrits (un superutilisateur, sur tous)."""
    vendeurs = VendorProfile.objects.filter(inscription_par_agent__isnull=False)
    if not agent.is_superuser:
        vendeurs = vendeurs.filter(inscription_par_agent__agent=agent)
    return vendeurs.filter(pk=vendor_id).select_related("user").first()


#: Pièces que l'agent photographie sur place : celles du verrou d'identité (apps.vendors.kyc), rien d'autre.
PIECES = {"recto": "CNI_RECTO", "verso": "CNI_VERSO", "selfie": "SELFIE_VIDEO"}


def deposer_piece_pour(agent, profil: VendorProfile, piece: str, fichier, ip=None) -> ComplianceDocument:
    """Lève KeyError pour une pièce inconnue, FichierRefuse pour un fichier refusé (format, taille, R2)."""
    document, _cree = deposer_piece(profil.user, ComplianceDocument.OwnerRole.VENDOR, PIECES[piece], fichier)
    journaliser(agent, profil, "piece", {"piece": document.document_type}, ip)
    return document


def enregistrer_mobile_money(agent, profil: VendorProfile, telephone: str, ip=None) -> PayoutAccount:
    """
    T07-2 : « pièce d'identité et numéro Mobile Money au premier produit ». L'agent saisit le numéro du vendeur sur
    place. Il reste EN ATTENTE de vérification : aucun code n'est envoyé ici, le vendeur le demande depuis son espace,
    et rien ne lui est versé avant (seul un numéro vérifié atteint le module financier). Un numéro déjà vérifié
    identique n'est pas remis en attente.
    """
    from apps.accounts.serializers import enregistrer_numero_versement

    numero = normalize_cameroon_phone(telephone or "")
    if not numero["is_valid"] or not numero["is_mobile"]:
        raise Refus("numero", "Numéro Mobile Money camerounais invalide.")
    deja = PayoutAccount.objects.filter(user=profil.user, owner_role=PayoutAccount.OwnerRole.VENDOR,
                                        phone_e164=numero["e164"], status=PayoutAccount.Status.VERIFIED).first()
    if deja is not None:
        return deja
    compte = enregistrer_numero_versement(profil.user, PayoutAccount.OwnerRole.VENDOR, numero,
                                          label="Saisi par l'agent de terrain", envoyer_code=False)
    journaliser(agent, profil, "mobile_money", {"numero": _masque(compte)}, ip)
    return compte


def _masque(compte: PayoutAccount) -> str:
    n = compte.national_number or ""
    return f"+237 {n[:3]} *** {n[-3:]}" if n else ""


def nouvel_acces(agent, profil: VendorProfile, ip=None) -> str:
    """Nouveau mot de passe provisoire (vendeur qui a perdu le sien ou l'a laissé expirer). Jamais sur un compte dont
    le vendeur a déjà choisi son mot de passe : il passe alors par « mot de passe oublié »."""
    if not AccesProvisoire.objects.filter(user=profil.user).exists() and profil.user.has_usable_password():
        raise Refus("acces_deja_pris", "Le vendeur a déjà choisi son mot de passe : il utilise « mot de passe oublié ».")
    mot_de_passe = acces_provisoire.donner(profil.user, agent)
    journaliser(agent, profil, "nouvel_acces", {}, ip)
    return mot_de_passe


def fiche(profil: VendorProfile) -> dict:
    acces = AccesProvisoire.objects.filter(user=profil.user).first()
    emplacement = profil.locations.filter(is_main=True).first()
    momo = PayoutAccount.objects.filter(user=profil.user, owner_role=PayoutAccount.OwnerRole.VENDOR).exclude(
        status=PayoutAccount.Status.DISABLED).order_by("-is_primary", "-created_at").first()
    return {
        "id": profil.id,
        "boutique": profil.business_name,
        "telephone": profil.phone,
        "identifiant": profil.user.username,
        "quartier": emplacement.quartier if emplacement else "",
        "statut": profil.status,
        "identite": kyc.etat_verification(profil.user),
        "pieces": {cle: next((d.status for d in profil.user.compliance_documents.all()
                              if d.owner_role == ComplianceDocument.OwnerRole.VENDOR and d.document_type == type_),
                             None)
                   for cle, type_ in PIECES.items()},
        "mobile_money": {"numero": _masque(momo), "verifie": momo.status == PayoutAccount.Status.VERIFIED}
        if momo else None,
        "produits": profil.user.products.count(),
        "acces_provisoire_expire_le": acces.expire_le.isoformat() if acces else None,
        "inscrit_le": profil.inscription_par_agent.cree_le.isoformat(),
    }
