# backend/apps/vendeur_session/ouverture.py
# Ouverture d'une boutique en trois étapes (OUV-01 à 05, KYC-01 à 09, VD03-R06 à R14 ; REFCL-R090 ; DP-57 S-2) :
#   1. ouvrir : nom interne, catégorie, statut, numéro (un numéro = un compte), point de la boutique → zone exploitée
#      calculée par le serveur (hors zone : refus) ; code SMS au numéro → le compte vendeur existe (jetons) ;
#   2. pièces : recto, verso, selfie (fichiers privés), numéro de versement Mobile Money vérifié par code (MTN/Orange) ;
#      envoi pour vérification : réponse automatique sous 15 min, humaine sous 48 h ouvrées ; 3 refus = refusée ;
#   3. contrat : cinq lignes LUES dans les paramètres, exemple « Vous gardez » calculé par le moteur ; RCCM et NIU si
#      immatriculé ; la signature pose Boutique.signature_le (début du palier de lancement).
# La boutique (VendorProfile de relaya par le pont, vendeur_core.Boutique, Membre propriétaire) est créée quand la
# vérification est ACCORDÉE : repondre_verification(ref, accord, motif) — la réponse du prestataire de vérification.
# Arrivée depuis l'espace client (« Devenir vendeur ») : le compte client connecté, son numéro déjà vérifié.
import base64
import binascii
import re
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.db import IntegrityError, transaction

from apps.client_core import parametres as reg
from apps.client_core import pont
from apps.client_core.chiffrement import chiffrer, dechiffrer, empreinte
from apps.client_core.erreurs import conflit, introuvable
from apps.client_core.masquage import operateur
from apps.client_core.temps import YAOUNDE, ms
from apps.vendeur_core import horloge, parametres
from apps.vendeur_core import services as socle
from apps.vendeur_core.models import Boutique, Membre

from . import codes
from . import services as acces
from .models import DefiVendeur, DossierOuverture

Etape = DossierOuverture.Etape

# Vérification des pièces (réponse automatique, réponse humaine en heures ouvrées, refus avant « Vérification
# refusée ») : VD-KYC-DELAIS (parametres.kyc_delais, VD03-R08, DP-57 S-2) ; préavis de résiliation du contrat :
# VD-RESILIATION-PREAVIS (parametres.resiliation_preavis, VD03-R12).
# PARAMÈTRE À AJOUTER AU REGISTRE : VD-CONTRAT-VERSION (version du contrat vendeur en vigueur)
VERSION_CONTRAT = "2026-10"
# PARAMÈTRE À AJOUTER AU REGISTRE : VD-ZONE-RAYON-M (distance au centre d'une zone exploitée pour y être rattaché)
RAYON_ZONE_M = 3000
# PARAMÈTRE À AJOUTER AU REGISTRE : KYC-IMAGE-MAX (taille d'une photo de pièce)
IMAGE_MAX_OCTETS = 10 * 1024 * 1024
# Article de référence de l'exemple « Vous gardez » du contrat (VD03-R12) : ITEL AC52 à 20 000 F, Électronique, Bronze.
EXEMPLE = {"titre": "ITEL AC52", "prix": 20000, "categorie": "Électronique"}

# Centres approchés des quartiers de Yaoundé (WGS 84), les mêmes que le site (site/src/donnees/geo.ts) : une zone
# exploitée (ZONES-EXPLOITEES, « Z1 Bastos ») se situe par le centre de son quartier.
CENTRES = {
    "Mvog-Ada": ("3.8634", "11.526"),
    "Essos": ("3.873", "11.537"),
    "Mvan": ("3.833", "11.523"),
    "Bastos": ("3.896", "11.509"),
    "Mokolo": ("3.873", "11.5"),
    "Melen": ("3.865", "11.493"),
    "Biyem-Assi": ("3.835", "11.486"),
    "Emana": ("3.92", "11.513"),
    "Nlongkak": ("3.885", "11.517"),
    "Ngoa-Ekellé": ("3.859", "11.499"),
    "Omnisport": ("3.883", "11.545"),
    "Etoudi": ("3.918", "11.527"),
}

# Horaires et passages du livreur par défaut d'une boutique ouverte (lun–ven 08:00–18:00, sam 08:00–14:00 ;
# livreur lun–ven 14:00–16:00, sam 11:00–13:00), modifiables ensuite (VD-11).
HORAIRES_DEFAUT = [{"jour": j, "ouvert": j < 6, "de": "08:00", "a": "14:00" if j == 5 else "18:00"} for j in range(7)]
PASSAGES_DEFAUT = [{"jours": [0, 1, 2, 3, 4], "de": "14:00", "a": "16:00"}, {"jours": [5], "de": "11:00", "a": "13:00"}]

RCCM = re.compile(r"^[A-Z]{2}-[A-Z]{3}-\d{2,4}-[A-Z]-\d{3,6}$", re.IGNORECASE)
NIU = re.compile(r"^[A-Z]\d{12}[A-Z]$", re.IGNORECASE)


def _param(code: str, defaut: int) -> int:
    return reg.entier(code) if code in reg.registre() else defaut


# ── Lectures ──────────────────────────────────────────────────────────────────────────────────────────


def categories() -> list[str]:
    return list(parametres.commission().familles.keys())


def zone_du_point(lat, lon) -> dict | None:
    """Zone exploitée la plus proche du point (centre de son quartier, à RAYON_ZONE_M au plus) ; None : hors zone."""
    from belivay_moteurs.geo import Position, distance_m

    try:
        p = Position(Decimal(str(lat)), Decimal(str(lon)))
    except (ValueError, ArithmeticError):
        return None
    mieux = None
    for z in reg.geo().zones:
        c = CENTRES.get(z.nom)
        if c is None:
            continue
        d = distance_m(p, Position(Decimal(c[0]), Decimal(c[1])))
        if mieux is None or d < mieux[1]:
            mieux = (z, d)
    if mieux is None or mieux[1] > _param("VD-ZONE-RAYON-M", RAYON_ZONE_M):
        return None
    return {"code": mieux[0].code, "quartiers": mieux[0].nom}


def _pour_cent(d: Decimal) -> str:
    return format(d.normalize(), "f").replace(".", ",")


def contrat_en_vigueur() -> dict:
    """Les cinq lignes du contrat (VD03-R12), lues dans les paramètres ; exemple calculé par le moteur de commission."""
    p = parametres.commission()
    pal = parametres.paliers()
    taux = [t.taux_pour_cent for tranches in p.bareme.values() for t in tranches]
    avec = socle.garde_par_vente(None, EXEMPLE["categorie"], EXEMPLE["prix"], palier="Bronze", decouverte_active=True)
    sans = socle.garde_par_vente(None, EXEMPLE["categorie"], EXEMPLE["prix"], palier="Bronze", decouverte_active=False)
    return {
        "version": VERSION_CONTRAT,
        "gardeMinPourCent": _pour_cent(Decimal(100) - max(taux)),
        "gardeMaxPourCent": _pour_cent(Decimal(100) - min(taux)),
        "minimumParCommande": p.plancher_commande,
        "plafondDemarrage": pal.plafond_demarrage,
        "commandesDemarrage": pal.demarrage_commandes,
        "preavisJours": parametres.resiliation_preavis(),
        "exemple": {"titre": EXEMPLE["titre"], "prix": EXEMPLE["prix"], "garde": avec, "gainDecouverte": avec - sans},
        "decouverte": {"mois": p.decouverte_mois, "commandes": p.decouverte_commandes},
        "lancement": {
            "mois": pal.lancement_mois,
            "argent": pal.lancement_produits.get("Argent", 0),
            "or": pal.lancement_produits.get("Or", 0),
            "platine": pal.lancement_produits.get("Platine", 0),
        },
        "immatricule": False,
        "rccm": "",
        "niu": "",
        "signeA": None,
    }


def _element(d: DossierOuverture, cle: str) -> dict:
    e = (d.elements or {}).get(cle) or {}
    return {"etat": e.get("etat", "a_faire"), "a": e.get("a"), "motif": e.get("motif")}


def _poser(d: DossierOuverture, cle: str, etat: str, motif: str | None = None) -> None:
    el = dict(d.elements or {})
    el[cle] = {"etat": etat, "a": horloge.maintenant_ms(), "motif": motif}
    d.elements = el


def _telephone(d: DossierOuverture) -> str:
    return dechiffrer(d.telephone_chiffre) if d.telephone_chiffre else ""


def dossier_json(d: DossierOuverture) -> dict:
    """DossierOuverture du site. Jamais une pièce : seulement son état."""
    n = _telephone(d)
    v = dechiffrer(d.versement_chiffre) if d.versement_chiffre else ""
    return {
        "ref": d.ref,
        "depuisClient": d.depuis_client,
        "etape": d.etape,
        "boutique": {
            "nom": d.nom,
            "categorie": d.categorie,
            "statut": d.statut,
            "telephone": codes.masquer(n) if n else "",
            "zone": {"code": d.zone_code, "quartiers": d.zone_quartiers} if d.zone_code else None,
            "point": {"lat": float(d.lat), "lon": float(d.lon), "precision": d.precision}
            if d.lat is not None and d.lon is not None
            else None,
        },
        "numeroVerifie": d.numero_verifie_le is not None,
        "pieces": {k: _element(d, k) for k in ("recto", "verso", "selfie")},
        "versement": {**_element(d, "versement"), "operateur": d.versement_operateur or None, "masque": f"···· {v[-4:]}" if v else None},
        "envoyeA": ms(d.envoye_a) if d.envoye_a else None,
        "reponseAvant": ms(d.reponse_avant) if d.reponse_avant else None,
        "refus": d.refus,
        "refusMax": parametres.kyc_delais().refus_max,
        "brouillons": d.brouillons,
        "enLigne": d.en_ligne,
        "contrat": {
            **contrat_en_vigueur(),
            "version": d.contrat_version or VERSION_CONTRAT,
            "immatricule": d.immatricule,
            "rccm": d.rccm,
            "niu": d.niu,
            "signeA": ms(d.signe_a) if d.signe_a else None,
        },
        "delais": {
            "autoMinutes": parametres.kyc_delais().auto_minutes,
            "humainHeures": parametres.kyc_delais().humain_heures_ouvrees,
        },
    }


def dossier_courant(user, appareil: str) -> DossierOuverture | None:
    """Le dossier du compte connecté ; avant le code (pas encore de compte), celui que cet appareil a commencé."""
    if user is not None and user.is_authenticated:
        d = DossierOuverture.objects.filter(user=user).first()
        if d is not None:
            return d
    if appareil:
        return DossierOuverture.objects.filter(user__isnull=True, appareil=appareil).first()
    return None


def dossier_de(user, appareil: str, ref: str) -> DossierOuverture:
    """Le dossier `ref` (ou « current ») du demandeur ; 404 sinon."""
    d = dossier_courant(user, appareil)
    if d is None or (ref not in ("current", "") and d.ref.upper() != str(ref).upper()):
        raise introuvable("Aucune ouverture en cours.")
    return d


def prochaine_ref() -> str:
    annee = horloge.aujourd_hui().year
    prefixe = f"VD-{annee}-"
    nums = [
        int(r[len(prefixe) :])
        for r in DossierOuverture.objects.filter(ref__startswith=prefixe).values_list("ref", flat=True)
        if r[len(prefixe) :].isdigit()
    ]
    return f"{prefixe}{(max(nums) + 1) if nums else 1:04d}"


def plus_heures_ouvrees(depuis, heures: int):
    """Heures ouvrées BelivaY : toutes les heures sauf le dimanche (DP-15, DP-56 Q-53), comme la démonstration."""
    t, reste = depuis, heures
    while reste > 0:
        t += timedelta(hours=1)
        if t.astimezone(YAOUNDE).weekday() != 6:
            reste -= 1
    return t


# ── Étape 1 : ouvrir ──────────────────────────────────────────────────────────────────────────────────


def _numero_pris(n: str, user, appareil: str) -> bool:
    """Un numéro = un compte (OUV-03) : déjà membre d'une boutique, déjà vérifié dans un autre dossier, ou numéro vérifié
    d'un AUTRE compte client que le compte connecté."""
    soi = user if user is not None and user.is_authenticated else None
    m = acces._membre_par_numero(n)
    if m is not None and m.user != soi:
        return True
    autres = DossierOuverture.objects.filter(telephone_empreinte=empreinte(n), numero_verifie_le__isnull=False).exclude(etape=Etape.REFUSEE)
    if soi is not None:
        autres = autres.exclude(user=soi)
    if autres.exists():
        return True
    if soi is not None:
        from apps.client_accounts.models import ProfilClient

        return ProfilClient.objects.filter(numero_empreinte=empreinte(n), numero_verifie_le__isnull=False).exclude(user=soi).exists()
    return False


def demarrer(champs: dict, user, appareil: str) -> dict:
    """POST /shops : refus du site (nom, categorie, numero, point, hors_zone, deux_comptes) ou code envoyé."""
    nom = re.sub(r"\s+", " ", str(champs.get("nom") or "")).strip()
    if not 2 <= len(nom) <= 40:
        return {"ok": False, "raison": "nom"}
    categorie = str(champs.get("categorie") or "")
    if categorie not in categories():
        return {"ok": False, "raison": "categorie"}
    n = codes.numero_valide(str(champs.get("telephone") or ""))
    if n is None:
        return {"ok": False, "raison": "numero"}
    point = champs.get("point")
    if not isinstance(point, dict) or point.get("lat") is None or point.get("lon") is None:
        return {"ok": False, "raison": "point"}
    zone = zone_du_point(point["lat"], point["lon"])
    if zone is None:
        return {"ok": False, "raison": "hors_zone"}
    if _numero_pris(n, user, appareil):
        return {"ok": False, "raison": "deux_comptes"}
    connecte = user if user is not None and user.is_authenticated else None
    if connecte is None and not appareil:
        raise codes.appareil_absent()
    d = dossier_courant(user, appareil)
    if d is not None and d.etape not in (Etape.OUVRIR, Etape.REFUSEE):
        raise conflit("dossier_en_cours", "Une ouverture est déjà en cours sur ce compte.", {"ref": d.ref})
    if d is None or d.etape == Etape.REFUSEE:
        d = DossierOuverture(ref=prochaine_ref(), cree_le=horloge.maintenant())
    statut = "entreprise" if champs.get("statut") == "entreprise" else "particulier"
    d.user, d.appareil, d.nom, d.categorie, d.statut = connecte, appareil, nom, categorie, statut
    d.telephone_chiffre, d.telephone_empreinte = chiffrer(n), empreinte(n)
    d.zone_code, d.zone_quartiers = zone["code"], zone["quartiers"]
    d.lat, d.lon = Decimal(str(point["lat"])).quantize(Decimal("0.000001")), Decimal(str(point["lon"])).quantize(Decimal("0.000001"))
    d.precision = max(0, int(point.get("precision") or 0))
    d.immatricule = statut == "entreprise"
    for _ in range(5):
        try:
            with transaction.atomic():
                d.save()
            break
        except IntegrityError:  # deux ouvertures au même instant : nouvelle référence
            d.ref = prochaine_ref()
    defi, refus = codes.creer(DefiVendeur.Objet.OUVERTURE, n, appareil=appareil, user=connecte, dossier=d)
    if defi is None:
        from apps.client_core.erreurs import ErreurClient

        raise ErreurClient(429, "trop_d_envois", "Trop de codes demandés. Réessaie dans une heure.", {"jusqua": refus["jusqua"]})
    return {"ok": True, "envoi": codes.envoi(defi)}


def _defi(d: DossierOuverture, objet: str) -> DefiVendeur | None:
    return codes.en_cours(objet, dossier=d)


def envoi_ouverture(user, appareil: str) -> dict | None:
    d = dossier_courant(user, appareil)
    if d is None or d.etape != Etape.OUVRIR:
        return None
    defi = _defi(d, DefiVendeur.Objet.OUVERTURE)
    return codes.envoi(defi) if defi else None


def renvoyer_code_ouverture(user, appareil: str) -> dict:
    d = dossier_courant(user, appareil)
    defi = _defi(d, DefiVendeur.Objet.OUVERTURE) if d is not None and d.etape == Etape.OUVRIR else None
    if defi is None:
        return {"ok": False, "raison": "trop_tot", "secondes": codes._regles()[1]}
    return codes.renvoyer(defi)


def _versement_auto(d: DossierOuverture, n: str) -> None:
    """Numéro Mobile Money (MTN ou Orange) déjà vérifié par code : il sert aussi au versement."""
    op = operateur(n)
    if op in ("MTN", "Orange"):
        d.versement_chiffre, d.versement_operateur = chiffrer(n), op
        _poser(d, "versement", "verifie")


def _compte_pour(n: str, user):
    """Compte du vendeur : le compte connecté ; sinon le compte client de ce numéro (un numéro = un compte) ; sinon
    un nouveau compte, sans mot de passe (connexion par numéro et code, ou mot de passe choisi plus tard)."""
    from apps.client_accounts import services as comptes
    from apps.client_accounts.models import ProfilClient

    if user is not None and user.is_authenticated:
        compte = user
    else:
        p = ProfilClient.objects.filter(numero_empreinte=empreinte(n), numero_verifie_le__isnull=False).select_related("user").first()
        if p is not None:
            compte = p.user
        else:
            User = get_user_model()
            compte = User.objects.filter(username=f"vendeur-{n}").first()
            if compte is None:
                compte = User(username=f"vendeur-{n}")
                compte.set_unusable_password()
                compte.save()
    if not comptes.profil(compte).numero_verifie:
        try:
            comptes.enregistrer_numero(compte, n)
        except Exception:  # numéro pris entre-temps par un autre compte client : le compte vendeur reste valable
            pass
    return compte


def valider_code_ouverture(user, appareil: str, code: str, ua: str = "") -> dict:
    """Code bon : le compte vendeur existe (jetons rendus), étape 2 ; le numéro vérifié sert au versement s'il est
    Mobile Money."""
    d = dossier_courant(user, appareil)
    defi = _defi(d, DefiVendeur.Objet.OUVERTURE) if d is not None and d.etape == Etape.OUVRIR else None
    r = codes.verifier(defi, code)
    if not r["ok"]:
        return r
    n = _telephone(d)
    with transaction.atomic():
        compte = _compte_pour(n, user)
        d.user = compte
        d.numero_verifie_le = horloge.maintenant()
        d.etape = Etape.PIECES
        _versement_auto(d, n)
        d.save()
    return {"ok": True, **{k: v for k, v in acces.ouvrir(compte, appareil, ua, True).items() if k in ("jetons", "seSouvenir")}}


# ── Étape 2 : pièces et numéro de versement ───────────────────────────────────────────────────────────


SIGNATURES = ((b"\xff\xd8\xff", "jpg"), (b"\x89PNG\r\n\x1a\n", "png"), (b"GIF8", "gif"))


def _lire_image(image) -> tuple[bytes, str] | None:
    """(octets, extension) d'une image en data: URL ou en fichier envoyé ; None si illisible."""
    if hasattr(image, "read"):
        data = image.read(IMAGE_MAX_OCTETS + 1)
    else:
        m = re.match(r"^data:image/[\w.+-]+;base64,(.+)$", str(image or ""), re.S)
        if not m:
            return None
        try:
            data = base64.b64decode(m.group(1), validate=False)
        except (binascii.Error, ValueError):
            return None
    if not data or len(data) > IMAGE_MAX_OCTETS:
        return None
    for sig, ext in SIGNATURES:
        if data.startswith(sig):
            return data, ext
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return data, "webp"
    if data[4:12] in (b"ftypheic", b"ftypheix", b"ftypmif1"):
        return data, "heic"
    return None


def envoyer_piece(d: DossierOuverture, piece: str, image) -> dict:
    if piece not in ("recto", "verso", "selfie"):
        return {"ok": False, "raison": "illisible"}
    lue = _lire_image(image)
    if lue is None:
        return {"ok": False, "raison": "visage" if piece == "selfie" else "illisible"}
    if d.etape == Etape.PIECES:
        champ = getattr(d, piece)
        if champ:
            champ.delete(save=False)
        champ.save(f"{piece}.{lue[1]}", ContentFile(lue[0]), save=False)
        _poser(d, piece, "recu")
        d.save()
    return {"ok": True, "dossier": dossier_json(d)}


def demander_code_versement(d: DossierOuverture, telephone: str) -> dict:
    n = codes.numero_valide(telephone)
    if n is None:
        return {"ok": False, "raison": "numero"}
    if operateur(n) not in ("MTN", "Orange"):
        return {"ok": False, "raison": "operateur"}
    d.versement_attente_chiffre = chiffrer(n)
    d.save(update_fields=["versement_attente_chiffre"])
    defi, refus = codes.creer(DefiVendeur.Objet.VERSEMENT, n, user=d.user, dossier=d)
    if defi is None:
        from apps.client_core.erreurs import ErreurClient

        raise ErreurClient(429, "trop_d_envois", "Trop de codes demandés. Réessaie dans une heure.", {"jusqua": refus["jusqua"]})
    return {"ok": True, "envoi": codes.envoi(defi)}


def valider_code_versement(d: DossierOuverture, code: str) -> dict:
    defi = _defi(d, DefiVendeur.Objet.VERSEMENT)
    r = codes.verifier(defi, code)
    if not r["ok"]:
        return r
    n = codes.numero_de(defi)
    d.versement_chiffre, d.versement_operateur, d.versement_attente_chiffre = chiffrer(n), operateur(n) or "", None
    _poser(d, "versement", "verifie")
    d.save()
    return r


def _pieces_recues(d: DossierOuverture) -> bool:
    return (
        all(_element(d, k)["etat"] in ("recu", "verifie") for k in ("recto", "verso", "selfie"))
        and _element(d, "versement")["etat"] == "verifie"
    )


def envoyer_pour_verification(d: DossierOuverture) -> dict:
    if d.etape != Etape.PIECES or not _pieces_recues(d):
        return {"ok": False, "raison": "incomplet"}
    t = horloge.maintenant()
    d.etape, d.envoye_a = Etape.ATTENTE, t
    d.reponse_avant = plus_heures_ouvrees(t, parametres.kyc_delais().humain_heures_ouvrees)
    d.save()
    return {"ok": True, "dossier": dossier_json(d)}


# ── Réponse du prestataire de vérification ────────────────────────────────────────────────────────────


def _identifiant_libre(nom: str) -> str:
    import unicodedata

    base = "".join(c for c in unicodedata.normalize("NFD", nom) if unicodedata.category(c) != "Mn")
    base = "".join(m.capitalize() for m in re.findall(r"[A-Za-z0-9]+", base))[:30] or "Boutique"
    ident, i = f"@{base}", 1
    while Boutique.objects.filter(identifiant__iexact=ident).exists():
        i += 1
        ident = f"@{base}{i}"
    return ident


def creer_boutique(d: DossierOuverture) -> Boutique:
    """La boutique de l'accord : VendorProfile de relaya (par le pont, APPROVED), Boutique du kit, Membre propriétaire."""
    if d.boutique_id:
        return d.boutique
    user = d.user
    jour = horloge.aujourd_hui()
    Vendeur = pont.modele("vendeur")
    noms = {f.name for f in Vendeur._meta.get_fields()}
    v = Vendeur.objects.filter(user=user).first()
    if v is None:
        valeurs = {"business_name": d.nom, "city": "Yaoundé", "status": "APPROVED"}
        v = Vendeur.objects.create(user=user, **{k: x for k, x in valeurs.items() if k in noms})
    else:
        v.business_name = d.nom
        champs = ["business_name"]
        if "status" in noms:
            v.status = "APPROVED"
            champs.append("status")
        v.save(update_fields=champs)
    n = _telephone(d)
    versement = dechiffrer(d.versement_chiffre) if d.versement_chiffre else ""
    titulaire = f"{user.first_name} {user.last_name}".strip()
    b = Boutique.objects.create(
        vendor_id=v.pk,
        proprietaire=user,
        nom=d.nom,
        identifiant=_identifiant_libre(d.nom),
        statut=d.statut,
        categorie=d.categorie,
        cree_le=jour,
        approuve_le=jour,
        zone=d.zone_code,
        quartier=d.zone_quartiers,
        lat=d.lat,
        lon=d.lon,
        point_pose_le=jour,
        horaires=HORAIRES_DEFAUT,
        passages=PASSAGES_DEFAUT,
        numero_operateur=d.versement_operateur,
        numero_chiffre=chiffrer(versement) if versement else None,
        numero_empreinte=empreinte(versement) if versement else "",
        numero_verifie_le=jour if versement else None,
        titulaire_versement=titulaire,
    )
    t = horloge.maintenant()
    Membre.objects.create(
        boutique=b,
        user=user,
        prenom=user.first_name or d.nom.split(" ")[0],
        nom=user.last_name,
        telephone=f"+237{n}",
        role=Membre.Role.PROPRIETAIRE,
        depuis=t,
        confirme_le=t,
    )
    try:  # la boutique ouverte depuis l'espace client : sa pièce est vérifiée
        from apps.client_accounts.models import BoutiqueClient

        BoutiqueClient.objects.filter(user=user).update(piece=BoutiqueClient.Piece.VERIFIEE, vendor_id=v.pk)
    except ImportError:  # pragma: no cover - espace client absent
        pass
    socle.notifier(b, "conseil", "Pièces vérifiées", "Votre identité est vérifiée. Signez le contrat pour ouvrir la boutique.", "contrat")
    d.boutique = b
    return b


def repondre_verification(ref: str, accord: bool, motif: str = "") -> dict:
    """La réponse du prestataire de vérification (à brancher sur une route d'essai) : accord → boutique créée, étape
    « contrat », brouillons en ligne (DP-57 P-1) ; refus → recto refusé avec son motif écrit (VD03-R14), 3 refus →
    « Vérification refusée » (DP-57 S-2). Rend le DossierOuverture."""
    with transaction.atomic():
        d = DossierOuverture.objects.select_for_update().filter(ref=str(ref).upper()).first()
        if d is None:
            raise introuvable("Dossier inconnu.")
        if d.etape != Etape.ATTENTE:
            return dossier_json(d)
        if accord:
            for k in ("recto", "verso", "selfie"):
                _poser(d, k, "verifie")
            creer_boutique(d)
            d.etape = Etape.CONTRAT
            d.en_ligne = d.brouillons
        else:
            d.refus += 1
            _poser(d, "recto", "refuse", (motif or "").strip() or "Un reflet cache le numéro de la carte.")
            d.etape = Etape.REFUSEE if d.refus >= parametres.kyc_delais().refus_max else Etape.PIECES
        d.reponse_avant = None
        d.save()
    return dossier_json(d)


# ── Étape 3 : contrat ─────────────────────────────────────────────────────────────────────────────────


def signer_contrat(d: DossierOuverture | None, o: dict, ip: str | None = None, ua: str = "") -> dict:
    if d is None or d.etape != Etape.CONTRAT:
        return {"ok": False, "raison": "etape"}
    immatricule = bool(o.get("immatricule"))
    rccm, niu = str(o.get("rccm") or "").strip().upper(), str(o.get("niu") or "").strip().upper()
    if immatricule:
        if not RCCM.match(rccm):
            return {"ok": False, "raison": "rccm"}
        if not NIU.match(niu):
            return {"ok": False, "raison": "niu"}
    t = horloge.maintenant()
    with transaction.atomic():
        d.immatricule, d.rccm, d.niu = immatricule, rccm if immatricule else "", niu if immatricule else ""
        d.signe_a, d.contrat_version, d.etape = t, VERSION_CONTRAT, Etape.SIGNEE
        d.signature_ip, d.signature_appareil = ip, (ua or "")[:160]
        d.save()
        b = d.boutique
        if b is not None:
            b.signature_le, b.contrat_version = horloge.aujourd_hui(), VERSION_CONTRAT
            b.rccm, b.niu = d.rccm, d.niu
            if immatricule:
                b.statut = Boutique.Statut.ENTREPRISE
            b.save(update_fields=["signature_le", "contrat_version", "rccm", "niu", "statut"])
    return {"ok": True, "dossier": dossier_json(d)}


# ── Arrivée depuis l'espace client (« Devenir vendeur ») ──────────────────────────────────────────────


def _demande_client(user):
    if user is None or not user.is_authenticated:
        return None, None
    from apps.client_accounts.models import BoutiqueClient
    from apps.client_accounts.services import numero_verifie

    b = BoutiqueClient.objects.filter(user=user).first()
    n = numero_verifie(user)
    return (b, n) if b is not None and n else (None, None)


def arrivee_client(user) -> dict | None:
    b, n = _demande_client(user)
    if b is None:
        return None
    d = DossierOuverture.objects.filter(user=user).first()
    op = operateur(n)
    return {
        "ref": d.ref if d else prochaine_ref(),
        "prenom": user.first_name,
        "boutique": {"nom": b.nom, "categorie": b.categorie, "statut": b.type},
        "telephone": codes.masquer(n),
        "operateur": op if op in ("MTN", "Orange") else None,
    }


def confirmer_arrivee_client(user, point, appareil: str, ua: str = "") -> dict:
    b, n = _demande_client(user)
    if b is None or not isinstance(point, dict) or point.get("lat") is None or point.get("lon") is None:
        return {"ok": False, "raison": "point"}
    zone = zone_du_point(point["lat"], point["lon"])
    if zone is None:
        return {"ok": False, "raison": "hors_zone"}
    d = DossierOuverture.objects.filter(user=user).first()
    if d is not None and d.etape not in (Etape.OUVRIR, Etape.REFUSEE):
        return {"ok": True, "dossier": dossier_json(d)}
    cats = categories()
    if d is None or d.etape == Etape.REFUSEE:
        d = DossierOuverture(ref=prochaine_ref(), cree_le=horloge.maintenant())
    d.user, d.depuis_client, d.etape, d.appareil = user, True, Etape.PIECES, appareil
    d.nom, d.statut = b.nom, b.type
    d.categorie = b.categorie if b.categorie in cats else cats[0]
    d.telephone_chiffre, d.telephone_empreinte, d.numero_verifie_le = chiffrer(n), empreinte(n), horloge.maintenant()
    d.zone_code, d.zone_quartiers = zone["code"], zone["quartiers"]
    d.lat, d.lon = Decimal(str(point["lat"])).quantize(Decimal("0.000001")), Decimal(str(point["lon"])).quantize(Decimal("0.000001"))
    d.precision = max(0, int(point.get("precision") or 0))
    d.immatricule = b.type == "entreprise"
    _versement_auto(d, n)
    d.save()
    acces.reconnaitre(user, appareil, ua)
    return {"ok": True, "dossier": dossier_json(d)}
