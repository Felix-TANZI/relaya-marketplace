# backend/apps/vendeur_catalogue/services.py
# Logique du catalogue du vendeur (VD-08) : mes produits (domaine « produits ») et la nouvelle offre en 4 étapes
# (domaine « offres »), au format des types du site (espace-vendeur/src/donnees/domaines/{produits,offres}.ts).
#
# Règles (comportement de référence : espace-vendeur/src/demo/{produits,offres}.ts) :
#   - « Vous gardez » : vendeur_core.services.garde_par_vente (moteur de commission), jamais recalculé ici ;
#   - prix minimum publiable, plages de la commission minimale, publication : belivay_moteurs.commission ;
#   - plafond de démarrage (PRX-09) : belivay_moteurs.demarrage, avec les commandes livrées sans incident ;
#   - prix conseillé (DP-56, Q-36) : médiane des offres en vente de la même fiche − 100 F, jamais sous le centile de VD-CONSEIL-PRIX,
#     le prix minimum publiable ni le plancher privé, jamais au-dessus du prix tapé ;
#   - « premier dans une zone » : prix livré (belivay_moteurs.catalogue.prix_livre) sous la meilleure offre concurrente ;
#   - une offre publiée porte un Product de relaya : vendeur_core.services.publier_produit (stock, prix, actif) ;
#   - accès Préparation : aucun montant (None), aucune publication ni prix (403 owner_only dans les vues).
# ANONYMAT (GEN-01) : rien du client n'est lu ici, sauf des compteurs de commandes.
import base64
import binascii
import io
import math
import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction

from apps.client_core.masquage import nettoyer_message
from apps.client_core.temps import YAOUNDE, ms
from apps.vendeur_core import horloge, parametres, services
from apps.vendeur_core.models import Boutique, CommandeVendeur, FicheCatalogue, Offre

from .models import DemandeFiche, PhotoOffre, PublicationOffre, RechercheCatalogue

E = Offre.Etat


# ── Réglages (registre ; valeurs à ajouter au registre en vigueur, INTEGRATION.md VD-08 § 8) ──────────────


# Lus au registre par vendeur_core.parametres (lectures strictes, DP-57) : VD-ETATS-PRODUIT, VD-PREPARATION-DELAIS,
# VD-COLIS, VD-PHOTOS, VD-FICHE-DELAI, VD-MODERATION, VD-RAPPEL-PRIX, VD-PRIX-AUTO, VD-DOUBLON, VD-DEMANDE,
# VD-CONSEIL-PRIX.
STATISTIQUE_MOINS_CHERS = (9, 10)  # PARAMÈTRE À AJOUTER AU REGISTRE : VD-STAT-MOINS-CHERS (« 9 commandes sur 10 »)
DESCRIPTION_MIN, DESCRIPTION_MAX = 20, 2000  # PARAMÈTRE À AJOUTER AU REGISTRE : DESCRIPTION_MIN / DESCRIPTION_MAX
LIEU_KM = Decimal(3)  # PARAMÈTRE À AJOUTER AU REGISTRE : PHOTO_LIEU_KM (photo prise à la boutique)
STOCK_MAX, SEUIL_MAX, PRIX_MAX = 99999, 9999, 100_000_000


def etats_produit() -> list[str]:
    """États d'un article (VD-ETATS-PRODUIT) ; le premier est l'état par défaut."""
    return list(parametres.etats_produit())


def delais_h() -> list[int]:
    """Délais de préparation au choix (VD-PREPARATION-DELAIS)."""
    return list(parametres.preparation_delais().choix_heures)


def gabarits_colis() -> list[dict]:
    """Classes de colis, de la plus petite à la plus grande (VD-COLIS)."""
    return [{"classe": g.classe, "kg": g.kg, "cm": g.cm} for g in parametres.colis().gabarits]


def qualite_jpeg() -> float:
    """Qualité JPEG des photos allégées (VD-PHOTOS), de 0 à 1."""
    return parametres.photos().qualite_jpeg_pour_cent / 100


def reglages_bruts() -> dict:
    ph, fd, co = parametres.photos(), parametres.fiche_delai(), parametres.colis()
    return {
        "photosMin": ph.minimum,
        "photosMax": ph.maximum,
        "photoMinPx": ph.cote_min_px,
        "cote": ph.compression_cote_px,
        "ficheDelaiH": fd.heures,
        "fichePrioDelaiH": fd.prioritaire_heures,
        "fichePrioPrix": fd.prioritaire_prix,
        "moderationH": parametres.moderation(),
        "seuilKg": co.seuil_kg,
        "seuilCm": co.seuil_cm,
        "diviseur": co.diviseur,
        "delaiDefautH": parametres.preparation_delais().defaut_heures,
        "rappelJours": parametres.rappel_prix(),
        "prixAutoPct": parametres.prix_auto(),
    }


@dataclass
class Lecteur:
    """Qui lit : la boutique, le rôle (Préparation : aucun montant), la requête (adresses absolues des photos)."""

    boutique: Boutique
    proprietaire: bool = True
    request: object = None
    membre: object = None  # qui signe les gestes (mouvements de stock, VD02-DR03)

    def montant(self, x):
        return x if self.proprietaire else None


# ── Outils ───────────────────────────────────────────────────────────────────────────────────────────


def normaliser(s: str) -> str:
    s = unicodedata.normalize("NFD", (s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]+", " ", s)).strip()


def mots(s: str) -> list[str]:
    return [m for m in normaliser(s).split(" ") if m]


def similarite(a: str, b: str) -> float:
    """Similarité cosinus sur les mots des titres normalisés (Q-96)."""
    ca, cb = {}, {}
    for m in mots(a):
        ca[m] = ca.get(m, 0) + 1
    for m in mots(b):
        cb[m] = cb.get(m, 0) + 1
    pv = sum(v * cb.get(m, 0) for m, v in ca.items())
    na, nb = math.sqrt(sum(v * v for v in ca.values())), math.sqrt(sum(v * v for v in cb.values()))
    return pv / (na * nb) if na and nb else 0.0


def mediane(xs: list[int]) -> int:
    s = sorted(xs)
    m = len(s) // 2
    return s[m] if len(s) % 2 else round((s[m - 1] + s[m]) / 2)


def centile(xs: list[int], n: int) -> int:
    """n-ième centile, rang le plus proche."""
    s = sorted(xs)
    return s[max(0, math.ceil(n * len(s) / 100) - 1)]


def journal(o: Offre, quoi: str, **valeurs) -> None:
    """Historique de l'offre (Evenement du site : {a, quoi, valeurs?}), 30 lignes au plus, la plus récente d'abord."""
    e = {"a": horloge.maintenant_ms(), "quoi": quoi}
    if valeurs:
        e["valeurs"] = valeurs
    o.historique = [e, *(o.historique or [])][:30]


def offres_de(b: Boutique):
    return Offre.objects.filter(boutique=b, supprimee_le__isnull=True)


def offre_de(b: Boutique, id_, verrou: bool = False) -> Offre | None:
    try:
        pk = int(id_)
    except (TypeError, ValueError):
        return None
    qs = offres_de(b).select_related("fiche")
    if verrou:
        qs = qs.select_for_update()
    return qs.filter(pk=pk).first()


def synchroniser_produit(o: Offre) -> None:
    """Le Product de relaya suit l'offre (stock, prix, actif) dès qu'elle en a un, ou qu'elle est en vente."""
    if o.product_id or o.etat == E.EN_VENTE:
        services.publier_produit(o)


def categorie_de(o: Offre) -> str:
    if o.fiche_id:
        return o.fiche.categorie
    d = DemandeFiche.objects.filter(offre=o).first()
    return (d.categorie if d and d.categorie else "") or "Électronique"


def garde_ou_none(b: Boutique, categorie: str, prix: int | None, mic: bool = False) -> int | None:
    """Montant gardé par vente au palier et à l'offre du jour ; None si la vente serait refusée (DP-55)."""
    from belivay_moteurs.erreurs import OffreRefusee, VenteInvalide

    if prix is None:
        return None
    try:
        return services.garde_par_vente(b, categorie, int(prix), mic)
    except (OffreRefusee, VenteInvalide):
        return None


def part_de(garde: int, prix: int) -> float:
    """Part gardée à une décimale (PRX-08 : « soit 89,5 % »)."""
    return round(garde / prix * 1000) / 10


def famille(categorie: str):
    from belivay_moteurs.commission import famille_de
    from belivay_moteurs.erreurs import VenteInvalide

    p = parametres.commission()
    try:
        return famille_de(categorie, p)
    except VenteInvalide:
        return famille_de("Électronique", p)


def prix_minimum(categorie: str, mic: bool) -> int:
    from belivay_moteurs.commission import prix_minimum_publiable

    return prix_minimum_publiable(famille(categorie), mic, parametres.commission())


# ── Plafond de démarrage (PRX-09) ────────────────────────────────────────────────────────────────────


def livrees_sans_incident(b: Boutique) -> int:
    """Commandes de la boutique remises au client sans incident (litige perdu, rupture), au total (A-7)."""
    from apps.vendeur_core.faits import faits
    from belivay_moteurs.demarrage import Incident
    from belivay_moteurs.demarrage import livrees_sans_incident as compter

    livrees = []
    for c in CommandeVendeur.objects.filter(boutique=b, annulee_a__isnull=True):
        f = faits(c)
        if f.retrait is None:
            continue
        livrees.append([i for i, oui in ((Incident.LITIGE_PERDU, f.perdu), (Incident.RUPTURE, c.ruptures > 0)) if oui])
    return compter(livrees)


def plafond(b: Boutique) -> dict | None:
    """{montant, livrees, requises} tant que le plafond de démarrage s'applique ; None ensuite."""
    from belivay_moteurs.demarrage import plafond_de_demarrage

    cap = plafond_de_demarrage(livrees_sans_incident(b), parametres.paliers())
    return {"montant": cap.amount, "livrees": cap.delivered_ok, "requises": cap.needed} if cap.actif else None


def refus_de_prix(b: Boutique, categorie: str, mic: bool, prix: int) -> tuple[str, str] | None:
    """(raison, détail) si le prix ne se publie pas : prix minimum publiable, ou plafond de démarrage (moteur)."""
    from belivay_moteurs.commission import verifier_publication
    from belivay_moteurs.erreurs import OffreRefusee

    minimum = prix_minimum(categorie, mic)
    if prix < minimum:
        return "prix_minimum", str(minimum)
    try:
        verifier_publication(
            prix, famille(categorie), mic, parametres.commission(), sans_incident=livrees_sans_incident(b), pp=parametres.paliers()
        )
    except OffreRefusee:
        return "plafond", str(parametres.paliers().plafond_demarrage)
    return None


# ── Photos réelles ───────────────────────────────────────────────────────────────────────────────────

TYPES_PHOTO = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/avif": ".avif"}
TAILLE_PHOTO_MAX = 8 * 1024 * 1024


def _contenus():
    """Variantes et sortie des photos du client (apps.contenus) quand l'application est installée."""
    try:
        from apps.contenus import services as c

        return c
    except (ImportError, RuntimeError):  # pragma: no cover - kit sans apps.contenus
        return None


def photo_json(p: PhotoOffre, request=None) -> dict:
    """PhotoReelle du site, plus srcset (variantes WebP) : {id, image, srcset?, prise, lieu, largeur, hauteur, …}."""
    c = _contenus()
    sortie = c.photo(p, request) if c else None
    if sortie is None:  # pragma: no cover - sans apps.contenus
        sortie = {"url": p.url_externe or (p.fichier.url if p.fichier else "")}
    out = {
        "id": str(p.pk),
        "image": sortie["url"],
        "prise": ms(p.prise),
        "lieu": p.lieu or None,
        "largeur": p.largeur,
        "hauteur": p.hauteur,
        "octetsAvant": p.octets_avant,
        "octetsApres": p.octets_apres,
    }
    if sortie.get("srcset"):
        out["srcset"] = sortie["srcset"]
    return out


def lieu_de(b: Boutique, lat, lon) -> str:
    """Lieu de la prise en mots : le quartier de la boutique à moins de 3 km, sinon la position."""
    from belivay_moteurs.geo import Position, distance_km

    if lat is None or lon is None:
        return ""
    if (
        b.lat is not None
        and b.lon is not None
        and distance_km(Position(b.lat, b.lon), Position(Decimal(str(lat)), Decimal(str(lon)))) < LIEU_KM
    ):
        return (b.quartier.split(" / ")[-1] if b.quartier else "") or b.zone
    return f"{float(lat):.3f}, {float(lon):.3f}"


class PhotoInvalide(ValueError):
    pass


def _decoder(image: str) -> tuple[bytes, str]:
    m = re.fullmatch(r"data:([\w/+.-]+);base64,(.+)", (image or "").strip(), re.S)
    if not m:
        raise PhotoInvalide("image : data: URL ou adresse https attendue")
    if m.group(1) not in TYPES_PHOTO:
        raise PhotoInvalide("type")
    try:
        brut = base64.b64decode(m.group(2), validate=False)
    except (binascii.Error, ValueError):
        raise PhotoInvalide("image illisible") from None
    return brut, m.group(1)


def _taille_reelle(brut: bytes) -> tuple[int, int] | None:
    try:
        from PIL import Image

        with Image.open(io.BytesIO(brut)) as img:
            return img.size
    except Exception:  # image non décodée (format, Pillow absent) : la taille déclarée fait foi
        return None


def photos_de(b: Boutique, cible: str):
    """Photos d'une offre (identifiant) ou en attente d'un brouillon à venir ; None si la cible n'existe pas."""
    o = offre_de(b, cible) if str(cible).isdigit() else None
    if o is not None:
        return o, PhotoOffre.objects.filter(offre=o)
    if cible == "demande" or (cible.startswith("copie:") and offre_de(b, cible[6:]) is not None):
        return None, PhotoOffre.objects.filter(boutique=b, offre__isnull=True, cible=cible)
    raise LookupError(cible)


def ajouter_photo(b: Boutique, cible: str, donnees: dict, fichier=None, request=None) -> dict:
    """Ajoute une photo réelle (data: URL, adresse https, ou fichier multipart). Rend {ok, photo, nombre} ou
    {ok: false, raison: max | petite}. Lève LookupError (cible inconnue) ou PhotoInvalide (400)."""
    r = reglages_bruts()
    o, qs = photos_de(b, cible)
    largeur, hauteur = int(donnees.get("largeur") or 0), int(donnees.get("hauteur") or 0)
    brut, type_, url = None, None, ""
    if fichier is not None:
        type_ = getattr(fichier, "content_type", "") or ""
        if type_ not in TYPES_PHOTO:
            raise PhotoInvalide("type")
        brut = fichier.read()
    elif str(donnees.get("image", "")).startswith("https://"):
        url = donnees["image"]
    else:
        brut, type_ = _decoder(str(donnees.get("image", "")))
    if brut is not None:
        if len(brut) > TAILLE_PHOTO_MAX:
            raise PhotoInvalide("taille")
        reelle = _taille_reelle(brut)
        if reelle:
            largeur, hauteur = reelle
    if min(largeur, hauteur) < r["photoMinPx"]:
        return {"ok": False, "raison": "petite", "detail": str(r["photoMinPx"])}
    n = qs.count()
    if n >= r["photosMax"]:
        return {"ok": False, "raison": "max", "detail": str(r["photosMax"])}
    pos = donnees.get("position") or {}
    lat = pos.get("lat") if isinstance(pos, dict) else None
    lon = pos.get("lon") if isinstance(pos, dict) else None
    lat = lat if lat is not None else donnees.get("lat")
    lon = lon if lon is not None else donnees.get("lon")
    t = horloge.maintenant()
    prise = datetime.fromtimestamp(int(donnees["prise"]) / 1000, tz=YAOUNDE) if donnees.get("prise") else t

    def entier_ou_none(v):
        return int(v) if v not in (None, "", "null") else None

    p = PhotoOffre(
        boutique=b,
        offre=o,
        cible="" if o else cible,
        url_externe=url,
        largeur=largeur,
        hauteur=hauteur,
        prise=prise,
        lieu=lieu_de(b, lat, lon)[:80],
        lat=round(Decimal(str(lat)), 6) if lat is not None else None,
        lon=round(Decimal(str(lon)), 6) if lon is not None else None,
        octets_avant=entier_ou_none(donnees.get("octetsAvant")),
        octets_apres=entier_ou_none(donnees.get("octetsApres")) or (len(brut) if brut else None),
        cree_le=t,
        alt=(f"{o.titre} · {o.variante}" if o else "photo réelle")[:200],
    )
    if brut is not None:
        p.fichier.save(f"offre-{b.pk}-{o.pk if o else cible.replace(':', '-')}{TYPES_PHOTO[type_]}", ContentFile(brut), save=False)
        c = _contenus()
        if c is not None:
            c._variantes(p)  # mêmes variantes WebP que les photos du client (LARGEURS 320/640/960/1600)
    p.save()
    if o is not None:
        if o.etat != E.BROUILLON:
            journal(o, "Photo réelle ajoutée")
        o.save()
    return {"ok": True, "photo": photo_json(p, request), "nombre": n + 1}


def _effacer_fichiers(p: PhotoOffre) -> None:
    chemins = {ch for ch, _ in p.variantes or []}
    if p.fichier:
        chemins.add(p.fichier.name)
    for ch in chemins:
        default_storage.delete(ch)


def retirer_photo(b: Boutique, cible: str, photo_id) -> None:
    _, qs = photos_de(b, cible)
    p = qs.filter(pk=photo_id if str(photo_id).isdigit() else 0).first()
    if p is not None:
        _effacer_fichiers(p)
        p.delete()


def photos_demo(b: Boutique, o: Offre, dessin: str, n: int, prise: datetime, couleur: tuple[int, int, int]) -> int:
    """Photos de démonstration (dessinées par Pillow, sans fichier externe) d'une offre ; rend le nombre ajouté."""
    from PIL import Image, ImageDraw

    faites = 0
    for i in range(n - PhotoOffre.objects.filter(offre=o).count()):
        img = Image.new("RGB", (1600, 1600), (244, 241, 236))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle((520, 220, 1080, 1380), radius=90, fill=couleur)
        d.rounded_rectangle((570, 300, 1030, 1220), radius=30, fill=(30, 34, 40))
        d.ellipse((760, 1260, 840, 1340), fill=(220, 220, 220))
        d.text((80, 80), f"{dessin} · {o.variante} · {i + 1}", fill=(60, 60, 60))
        tampon = io.BytesIO()
        img.save(tampon, "JPEG", quality=parametres.photos().qualite_jpeg_pour_cent)
        brut = tampon.getvalue()
        donnees = {
            "image": "data:image/jpeg;base64," + base64.b64encode(brut).decode(),
            "prise": ms(prise + timedelta(minutes=i)),
            "position": {"lat": float(b.lat), "lon": float(b.lon)} if b.lat is not None else None,
            "octetsAvant": 6_300_000 + i * 40_000,
            "octetsApres": len(brut),
        }
        if ajouter_photo(b, str(o.pk), donnees)["ok"]:
            faites += 1
    return faites


# ── Ventes du mois, concurrents ──────────────────────────────────────────────────────────────────────


def stats_du_mois(b: Boutique) -> dict[str, dict]:
    """Par offre : ventes du mois non gelées (remises au client), gardé figé (D5), litiges et montant gelé (PRD-04)."""
    from apps.vendeur_core.faits import faits

    t = horloge.maintenant_yaounde()
    debut = t.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    out: dict[str, dict] = {}
    for c in CommandeVendeur.objects.filter(boutique=b, payee_a__gte=debut, annulee_a__isnull=True):
        f = faits(c)
        for lg in c.lignes:
            oid = str(lg.get("offreId") or "")
            if not oid:
                continue
            s = out.setdefault(oid, {"ventes": 0, "garde": 0, "litiges": 0, "gele": 0})
            part = round(c.garde * int(lg["prix"]) * int(lg.get("quantite", 1)) / c.prix) if c.prix else 0
            if f.gel in ("litige", "recours"):
                s["litiges"] += 1
                s["gele"] += part
            elif f.gel is None and not f.perdu and f.retrait is not None:
                s["ventes"] += int(lg.get("quantite", 1))
                s["garde"] += part
    return out


def meilleurs_concurrents(b: Boutique, fiches) -> dict[int, int]:
    """Fiche → prix le plus bas d'une offre EN VENTE d'une autre boutique."""
    out: dict[int, int] = {}
    qs = Offre.objects.filter(fiche_id__in=list(fiches), etat=E.EN_VENTE, supprimee_le__isnull=True, prix__isnull=False).exclude(boutique=b)
    for fid, prix in qs.values_list("fiche_id", "prix"):
        out[fid] = min(prix, out.get(fid, prix))
    return out


def prix_du_marche(o: Offre) -> list[int]:
    """Prix des offres en vente des AUTRES boutiques sur la même fiche."""
    if not o.fiche_id:
        return []
    return list(
        Offre.objects.filter(fiche_id=o.fiche_id, etat=E.EN_VENTE, supprimee_le__isnull=True, prix__isnull=False)
        .exclude(boutique=o.boutique)
        .values_list("prix", flat=True)
    )


def prix_conseille(o: Offre, prix_saisi: int) -> int:
    """DP-56, Q-36, VD08-R19 : médiane − 100 F, jamais sous le centile VD-CONSEIL-PRIX, le prix minimum publiable ni le plancher
    privé ; jamais au-dessus du prix tapé (PRX-01). Sans autre offre : le prix tapé."""
    marche = prix_du_marche(o)
    if not marche:
        return prix_saisi
    base = max(
        mediane(marche) - 100,
        centile(marche, parametres.conseil_prix().centile),
        prix_minimum(categorie_de(o), o.made_in_cameroon),
        o.plancher_prive or 0,
    )
    return min(prix_saisi, base)


def prix_livre(prix: int, colis: str) -> int:
    """Prix livré en relais (CAL-01, moteur de frais) ; le prix seul quand le colis ne va pas en relais."""
    from apps.client_core import parametres as p_client
    from belivay_moteurs.catalogue import prix_livre as calcul
    from belivay_moteurs.frais import Classe, Mode

    total = calcul(int(prix), Classe("HG" if colis == "XXL" else colis), Mode.RELAIS, p_client.livraison()).total
    return int(total) if total is not None else int(prix)


def zones() -> list[str]:
    from apps.client_core import parametres as p_client

    return [z.nom for z in p_client.geo().zones]


def premier_dans(o: Offre, prix: int) -> list[bool]:
    """Par zone exploitée : premier ⇔ prix livré < meilleure offre concurrente livrée (VD08-R04). Le ramassage ne
    dépend pas de la zone du client (moteur de frais) : la comparaison est la même dans chaque zone."""
    concurrents = Offre.objects.filter(fiche_id=o.fiche_id, etat=E.EN_VENTE, supprimee_le__isnull=True, prix__isnull=False).exclude(
        boutique=o.boutique
    )
    meilleur = min((prix_livre(c.prix, c.colis) for c in concurrents), default=None)
    premier = meilleur is None or prix_livre(prix, o.colis) < meilleur
    return [premier for _ in zones()]


# ── Vue « Produit » ──────────────────────────────────────────────────────────────────────────────────


def etape_brouillon(o: Offre, nb_photos: int) -> int | None:
    if o.etat != E.BROUILLON or not o.fiche_id:
        return None
    if nb_photos < reglages_bruts()["photosMin"]:
        return 2
    if o.stock < 1 or o.prix is None:
        return 3
    return 4


def produit(o: Offre, lec: Lecteur, stats: dict | None = None, concurrents: dict | None = None) -> dict:
    """Produit du site (GET /offers, GET /offers/{id}) ; montants None pour l'accès Préparation."""
    b = lec.boutique
    f = o.fiche
    demande = None if f else DemandeFiche.objects.filter(offre=o).first()
    categorie = f.categorie if f else ((demande.categorie if demande else "") or "Électronique")
    s = (stats if stats is not None else stats_du_mois(b)).get(str(o.pk), {"ventes": 0, "garde": 0, "litiges": 0, "gele": 0})
    if concurrents is None:
        concurrents = meilleurs_concurrents(b, [o.fiche_id] if o.fiche_id else [])
    t = horloge.maintenant()
    moins_cher = concurrents.get(o.fiche_id) if o.fiche_id else None
    concurrent = None
    if (
        o.etat == E.EN_VENTE
        and o.prix is not None
        and moins_cher is not None
        and moins_cher < o.prix
        and not (o.rester_jusqua and o.rester_jusqua > t)
    ):
        concurrent = {"prix": moins_cher, "conseille": prix_conseille(o, o.prix)}
    attention = []
    if o.etat == E.EN_VENTE and o.stock <= o.seuil_alerte:
        attention.append("stock_bas")
    if concurrent:
        attention.append("concurrent_moins_cher")
    if s["litiges"]:
        attention.append("litiges")
    photos = list(o.photos_reelles.all())
    dims = o.dimensions_cm if isinstance(o.dimensions_cm, list) and len(o.dimensions_cm) == 3 else None
    return {
        "id": str(o.pk),
        "ficheId": str(o.fiche_id) if o.fiche_id else None,
        "titre": o.titre,
        "variante": o.variante,
        "categorie": categorie,
        "rayon": (f.rayon if f else "") or categorie,
        "dessin": (f.dessin if f else "") or "itel",
        "etat": o.etat,
        "etatArticle": o.etat_article,
        "prix": lec.montant(o.prix),
        "garde": lec.montant(garde_ou_none(b, categorie, o.prix, o.made_in_cameroon)),
        "stock": o.stock,
        "seuilAlerte": o.seuil_alerte,
        "delaiPreparationH": o.delai_preparation_h,
        "colis": o.colis,
        "poidsKg": float(o.poids_kg) if o.poids_kg is not None else None,
        "dimensionsCm": dims,
        "paiementAuRetrait": o.paiement_au_retrait,
        "madeInCameroon": o.made_in_cameroon,
        "prixAuto": o.prix_auto,
        "plancherPrive": lec.montant(o.plancher_prive),
        "photos": [photo_json(p, lec.request) for p in photos],
        "envoyeeA": services.ms_ou_none(o.envoyee_a),
        "verificationAvant": services.ms_ou_none(o.verification_avant),
        "verifieeA": services.ms_ou_none(o.verifiee_a),
        "motifRefus": o.motif_refus or None,
        "ficheDemandee": o.fiche_demandee or None,
        "descriptionProposee": o.description_proposee or None,
        "dupliqueDe": o.duplique_de or None,
        "ventesCeMois": s["ventes"],
        "gardeCeMois": lec.montant(s["garde"]),
        "litigesCeMois": s["litiges"],
        "geleCeMois": lec.montant(s["gele"]),
        "attention": attention,
        "concurrent": lec.montant(concurrent),
        "etapeBrouillon": etape_brouillon(o, len(photos)),
        "historique": list(o.historique or []),
        **_promo(o, lec, categorie),
        "noteVendeur": o.note_vendeur,
        "manques": _manques(o, demande, len(photos)),
        "nouveau": {"description": demande.description, "prioritaire": demande.prioritaire} if demande and not o.fiche_id else None,
        "majA": ms(o.maj_le),
    }


def _manques(o: Offre, demande, nb_photos: int) -> list[str]:
    """Brouillon : ce qui reste à remplir (vide : prêt à publier)."""
    if o.etat != E.BROUILLON:
        return []
    m = []
    if not o.fiche_id and (demande is None or len(demande.recherche.strip()) < 3 or not demande.categorie):
        m.append("produit")
    if o.prix is None:
        m.append("prix")
    if o.stock < 1:
        m.append("stock")
    if not o.etat_article:
        m.append("etat")
    if nb_photos < reglages_bruts()["photosMin"]:
        m.append("photos")
    return m


def _promo(o: Offre, lec: Lecteur, categorie: str) -> dict:
    """Vente flash en cours (Promotions, une seule notion) : prix payé = prix remisé, prix barré = prix de référence ;
    sinon le prix barré saisi. Aucun prix pour un employé."""
    try:
        from apps.vendeur_croissance.promotions import en_cours

        v = en_cours(o)
    except ImportError:  # pragma: no cover - croissance absente
        v = None
    if v is not None:
        return {
            "prix": lec.montant(v.prix_promo),
            "garde": lec.montant(garde_ou_none(o.boutique, categorie, v.prix_promo, o.made_in_cameroon)),  # F9 : sur le prix payé
            "prixBarre": lec.montant(v.prix_reference),
            "finPromo": ms(v.fin),
        }
    return {"prixBarre": lec.montant(o.prix_barre), "finPromo": ms(o.fin_promo) if o.fin_promo else None}


def _rang(p: dict) -> int:
    """Ordre de la liste (PRD-02, Q-90) : attention (vendeur moins cher, litige, refus) → stock sous le seuil →
    vérification → brouillon → le reste."""
    a = p["attention"]
    if p["etat"] == E.REFUSEE or "concurrent_moins_cher" in a or "litiges" in a:
        return 0
    if "stock_bas" in a:
        return 1
    return {E.EN_VERIFICATION: 2, E.BROUILLON: 3}.get(p["etat"], 4)


def produits_tries(lec: Lecteur) -> list[dict]:
    b = lec.boutique
    offres = list(offres_de(b).select_related("fiche").prefetch_related("photos_reelles"))
    stats = stats_du_mois(b)
    conc = meilleurs_concurrents(b, {o.fiche_id for o in offres if o.fiche_id})
    ps = [produit(o, lec, stats, conc) for o in offres]
    ps.sort(key=lambda p: (_rang(p), -len(p["attention"]), -p["majA"]))
    return ps


def liste(lec: Lecteur) -> dict:
    ps = produits_tries(lec)
    compteurs = {"total": len(ps), **{e: 0 for e in E.values}}
    for p in ps:
        compteurs[p["etat"]] += 1
    return {"compteurs": compteurs, "produits": ps, "luA": horloge.maintenant_ms()}


def stock_bas(boutique: Boutique) -> list[dict]:
    """Pour l'accueil (VD-04) : offres en vente dont le stock est au seuil d'alerte ou dessous.
    [{offreId, titre, dessin, stock, seuil}] ; aucun montant."""
    out = []
    for o in offres_de(boutique).filter(etat=E.EN_VENTE).select_related("fiche").order_by("stock", "id"):
        if o.stock <= o.seuil_alerte:
            out.append(
                {
                    "offreId": str(o.pk),
                    "titre": o.titre,
                    "dessin": o.fiche.dessin if o.fiche_id else "",
                    "stock": o.stock,
                    "seuil": o.seuil_alerte,
                }
            )
    return out


def noter_mouvement(o: Offre, lec: Lecteur, avant: int, apres: int, type_: str | None = None, note: str = ""):
    """Mouvement de stock signé (VD02-DR03) : réception, correction ou rupture (stock à zéro)."""
    from apps.vendeur_core.services import signature

    from .models import MouvementStock

    if type_ is None:
        type_ = MouvementStock.Type.RUPTURE if apres == 0 else MouvementStock.Type.CORRECTION
    auteur, _role = signature(lec.membre)
    return MouvementStock.objects.create(
        offre=o, membre=lec.membre, auteur=auteur, type=type_, avant=avant, apres=apres, note=note[:120], a=horloge.maintenant()
    )


# ── Gestes sur mes produits ──────────────────────────────────────────────────────────────────────────


def _entier_valide(v, mini: int, maxi: int) -> bool:
    return isinstance(v, int) and not isinstance(v, bool) and mini <= v <= maxi


@transaction.atomic
def changer_stock(lec: Lecteur, id_, stock) -> dict:
    if not _entier_valide(stock, 0, STOCK_MAX):
        return {"ok": False, "raison": "stock"}
    o = offre_de(lec.boutique, id_, verrou=True)
    if o is None:
        return {"ok": False, "raison": "stock"}
    if o.stock != stock:
        journal(o, "Stock changé : {de} → {a}", de=o.stock, a=stock)
        noter_mouvement(o, lec, o.stock, stock)
        o.stock = stock
        o.save()
        synchroniser_produit(o)
    return {"ok": True, "produit": produit(o, lec)}


@transaction.atomic
def pause(lec: Lecteur, id_, en_pause: bool) -> dict | None:
    o = offre_de(lec.boutique, id_, verrou=True)
    if o is None:
        return None
    if o.etat in (E.EN_VENTE, E.EN_PAUSE):
        nouveau = E.EN_PAUSE if en_pause else E.EN_VENTE
        if nouveau != o.etat:
            o.etat = nouveau
            journal(o, "Mise en pause" if en_pause else "Remise en vente")
            o.save()
            synchroniser_produit(o)
    return produit(o, lec)


@transaction.atomic
def regler(lec: Lecteur, id_, champs: dict) -> dict:
    """Paiement au retrait, prix automatique et son plancher, seuil d'alerte (PUT /offers/{id})."""
    if not lec.proprietaire:
        return {"ok": False, "raison": "reserve"}
    o = offre_de(lec.boutique, id_, verrou=True)
    if o is None:
        return {"ok": False, "raison": "seuil"}
    seuil = champs.get("seuilAlerte")
    if "seuilAlerte" in champs and not _entier_valide(seuil, 0, SEUIL_MAX):
        return {"ok": False, "raison": "seuil"}
    prix_auto = champs.get("prixAuto", o.prix_auto)
    plancher = champs["plancherPrive"] if "plancherPrive" in champs else o.plancher_prive
    if prix_auto and (
        plancher is None
        or not _entier_valide(plancher, parametres.commission().prix_min, PRIX_MAX)
        or (o.prix is not None and plancher > o.prix)
    ):
        return {"ok": False, "raison": "plancher", "detail": str(o.prix if o.prix is not None else "")}
    if "paiementAuRetrait" in champs and bool(champs["paiementAuRetrait"]) != o.paiement_au_retrait:
        o.paiement_au_retrait = bool(champs["paiementAuRetrait"])
        journal(o, "Paiement au retrait accepté" if o.paiement_au_retrait else "Paiement au retrait coupé")
    if "prixAuto" in champs and bool(champs["prixAuto"]) != o.prix_auto:
        o.prix_auto = bool(champs["prixAuto"])
        if o.prix_auto:
            journal(o, "Prix automatique activé, jamais sous {p} F", p=plancher or 0)
        else:
            journal(o, "Prix automatique coupé")
    if "plancherPrive" in champs:
        o.plancher_prive = plancher
    if "seuilAlerte" in champs and seuil != o.seuil_alerte:
        journal(o, "Seuil d’alerte : {de} → {a}", de=o.seuil_alerte, a=seuil)
        o.seuil_alerte = seuil
    o.save()
    return {"ok": True, "produit": produit(o, lec)}


def _meme(a: str, b: str) -> bool:
    return normaliser(a) == normaliser(b)


@transaction.atomic
def dupliquer(lec: Lecteur, id_, variante: str) -> dict:
    """Brouillon d'une autre variante (DUP-01 à DUP-04) ; les photos prises pour la copie partent avec lui."""
    b = lec.boutique
    v = (variante or "").strip()
    s = offre_de(b, id_)
    if s is None or not v:
        return {"ok": False, "raison": "variante"}
    if any(_meme(x.variante, v) for x in offres_de(b).filter(fiche_id=s.fiche_id)):
        return {"ok": False, "raison": "existe"}
    connue = next((x for x in (s.fiche.variantes if s.fiche_id else []) if _meme(x, v)), None)
    if connue is None:
        return {"ok": False, "raison": "fiche"}
    o = Offre.objects.create(
        boutique=b,
        fiche=s.fiche,
        variante=connue,
        etat=E.BROUILLON,
        etat_article=s.etat_article,
        prix=None,
        stock=0,
        seuil_alerte=s.seuil_alerte,
        delai_preparation_h=s.delai_preparation_h,
        colis=s.colis,
        poids_kg=s.poids_kg,
        dimensions_cm=s.dimensions_cm,
        paiement_au_retrait=s.paiement_au_retrait,
        made_in_cameroon=s.made_in_cameroon,
        a_mettre_de_cote=list(s.a_mettre_de_cote or []),
        duplique_de=s.variante,
    )
    journal(o, "Brouillon créé depuis la variante {v}", v=s.variante)
    o.save()
    PhotoOffre.objects.filter(boutique=b, offre__isnull=True, cible=f"copie:{s.pk}").update(offre=o, cible="")
    return {"ok": True, "brouillonId": str(o.pk), "rattache": True}


def supprimer(lec: Lecteur, id_) -> dict:
    o = offre_de(lec.boutique, id_)
    if o is None or o.etat != E.BROUILLON:
        return {"ok": False, "raison": "etat"}
    o.supprimee_le = horloge.maintenant()
    o.save(update_fields=["supprimee_le", "maj_le"])
    return {"ok": True}


def restaurer(lec: Lecteur, id_) -> None:
    Offre.objects.filter(boutique=lec.boutique, pk=id_ if str(id_).isdigit() else 0, supprimee_le__isnull=False).update(supprimee_le=None)


def variantes(lec: Lecteur, fiche_id) -> list[dict]:
    f = FicheCatalogue.objects.filter(pk=fiche_id if str(fiche_id).isdigit() else 0).first()
    if f is None:
        return []
    offres = list(offres_de(lec.boutique).filter(fiche=f))
    out = []
    for v in f.variantes or []:
        o = next((x for x in offres if x.variante == v), None)
        out.append({"variante": v, "offreId": str(o.pk) if o else None, "etat": o.etat if o else None})
    return out


def _champ_csv(v) -> str:
    if v is None:
        return ""
    s = str(v)
    return f'"{s}"' if ";" in s else s


def exporter(lec: Lecteur) -> str:
    lignes = [
        ";".join(_champ_csv(x) for x in (p["id"], p["titre"], p["variante"], p["etat"], p["prix"], p["stock"], p["seuilAlerte"]))
        for p in produits_tries(lec)
    ]
    return "\n".join(["identifiant;produit;variante;etat;prix;stock;seuil", *lignes])


@transaction.atomic
def importer(lec: Lecteur, csv: str) -> dict:
    """Stock et seuil par identifiant (CSV « ; ») ; les lignes illisibles ou inconnues sont ignorées."""
    lignes = [x.strip() for x in re.split(r"\r?\n", csv or "") if x.strip()]
    if not lignes:
        return {"ok": False, "raison": "vide"}
    tete = [x.strip().lower() for x in lignes[0].split(";")]
    if "identifiant" not in tete or "stock" not in tete:
        return {"ok": False, "raison": "format"}
    i_id, i_stock = tete.index("identifiant"), tete.index("stock")
    i_seuil = tete.index("seuil") if "seuil" in tete else -1
    faites = ignorees = 0
    for ligne in lignes[1:]:
        c = [v.strip().strip('"') for v in ligne.split(";")]
        o = offre_de(lec.boutique, c[i_id]) if len(c) > i_id else None
        try:
            stock = int(c[i_stock])
            seuil = int(c[i_seuil]) if i_seuil >= 0 and len(c) > i_seuil and c[i_seuil] != "" else None
        except (ValueError, IndexError):
            o = None
        if o is None or not 0 <= stock <= STOCK_MAX or (seuil is not None and not 0 <= seuil <= SEUIL_MAX):
            ignorees += 1
            continue
        if o.stock != stock:
            journal(o, "Stock changé : {de} → {a}", de=o.stock, a=stock)
        o.stock = stock
        if seuil is not None:
            o.seuil_alerte = seuil
        o.save()
        synchroniser_produit(o)
        faites += 1
    return {"ok": True, "lignes": faites, "ignorees": ignorees}


# ── Nouvelle offre : réglages, catalogue ─────────────────────────────────────────────────────────────


def reglages(lec: Lecteur) -> dict:
    from apps.client_core.interrupteurs import ouvert

    r = reglages_bruts()
    pc, pv = parametres.commission(), parametres.versements()
    return {
        "etats": etats_produit(),
        "delaisH": delais_h(),
        "delaiDefautH": r["delaiDefautH"],
        "photosMin": r["photosMin"],
        "photosMax": r["photosMax"],
        "photoMinPx": r["photoMinPx"],
        "compression": {"cote": r["cote"], "qualite": qualite_jpeg()},
        "ficheDelaiH": r["ficheDelaiH"],
        "fichePrioDelaiH": r["fichePrioDelaiH"],
        "fichePrioPrix": lec.montant(r["fichePrioPrix"]),
        "moderationH": r["moderationH"],
        "colis": {"seuilKg": r["seuilKg"], "seuilCm": r["seuilCm"], "diviseur": r["diviseur"], "classes": gabarits_colis()},
        "flash": ouvert("FF-FLASH"),
        "rappelJours": r["rappelJours"],
        "prixAutoPct": r["prixAutoPct"],
        "prixMin": pc.prix_min,
        "rechercheMin": RECHERCHE_MIN,
        "promoRemiseMin": promo_remise_min(),
        "promoJoursMax": PROMO_JOURS_MAX,
        "noteMax": NOTE_VENDEUR_MAX,
        "categories": [{"categorie": c, "rayon": c} for c in pc.familles],
        "liberation": {"bronzeArgentJ": pv.lib_standard_jours, "orPlatineJ": pv.lib_or_jours, "confirmationJ": pv.fenetre_retour_jours},
        "versement": services.numero_court(lec.boutique) if lec.proprietaire else None,
        "plafond": plafond(lec.boutique),
        # Les 24 paramètres de l'espace vendeur créés par DP-57 (INTEGRATION-API § 4), tels qu'écrits au registre :
        # le site les relit avec ses lectures strictes (espace-vendeur/src/calculs/registre.ts, lireConsole).
        "parametres": parametres.parametres_console(),
    }


def fiche_json(f: FicheCatalogue, lec: Lecteur) -> dict:
    """FicheCatalogue du site : fourchette du marché, « Vous gardez X % à Y F » (NOF-05), variantes déjà vendues."""
    if f.prix_min and f.prix_max:
        fourchette = [f.prix_min, f.prix_max]
    else:
        prix = list(Offre.objects.filter(fiche=f, etat=E.EN_VENTE, prix__isnull=False).values_list("prix", flat=True))
        fourchette = [min(prix), max(prix)] if prix else None
    part = None
    if lec.proprietaire and fourchette:
        ref = math.ceil((fourchette[0] + fourchette[1]) / 2 / 500) * 500
        g = garde_ou_none(lec.boutique, f.categorie, ref)
        part = {"pourCent": round(100 * g / ref), "prixRef": ref} if g is not None else None
    return {
        "id": str(f.pk),
        "titre": f.titre,
        "marque": f.marque,
        "categorie": f.categorie,
        "rayon": f.rayon or f.categorie,
        "dessin": f.dessin,
        "variantes": list(f.variantes or []),
        "fourchette": fourchette,
        "part": part,
        "dejaVendues": list(offres_de(lec.boutique).filter(fiche=f).exclude(etat=E.BROUILLON).values_list("variante", flat=True)),
    }


RESULTATS_MAX = 20


def rechercher(lec: Lecteur, q: str, code: str | None = None) -> dict:
    """Exacts : tous les mots dans la fiche ; proches (sans exact) : un mot de plus de 2 lettres ; « cherché N fois
    près de chez vous » : recherches sans résultat de la zone, 30 jours glissants (Q-96)."""
    b = lec.boutique
    m = mots(q)
    fiches = list(FicheCatalogue.objects.filter(publiee=True).order_by("titre"))

    def texte(f):
        return normaliser(f"{f.titre} {f.marque} {' '.join(f.variantes or [])} {f.mots}")

    chiffres = re.sub(r"\D", "", code or "")
    par_code = next((f for f in fiches if chiffres and chiffres in [re.sub(r"\D", "", str(x)) for x in f.codes_barres or []]), None)
    if chiffres:  # code-barres lu : sa fiche, ou aucun résultat (DP-58)
        exacts = [par_code] if par_code else []
    else:
        exacts = [f for f in fiches if m and all(x in texte(f) for x in m)][:RESULTATS_MAX]
    proches = [] if chiffres or not m or exacts else [f for f in fiches if any(len(x) > 2 and x in texte(f) for x in m)][:RESULTATS_MAX]
    cherche = 0
    if m:
        qn = " ".join(m)
        t = horloge.maintenant()
        if not exacts:
            cherche = RechercheCatalogue.objects.filter(
                zone=b.zone, q=qn, exacts=0, a__gte=t - timedelta(days=parametres.demande().jours)
            ).count()
        RechercheCatalogue.objects.create(boutique=b, zone=b.zone, q=qn[:200], exacts=len(exacts), a=t)
    # Mes produits qui correspondent (DP-58) : la fiche du code lu, ou tous les mots dans le titre, la marque, la variante.
    if par_code is not None:
        miens = offres_de(b).filter(fiche=par_code)
    elif m and not chiffres:
        miens = [
            o
            for o in offres_de(b).select_related("fiche")
            if all(x in normaliser(f"{o.titre} {o.fiche.marque if o.fiche_id else ''} {o.variante}") for x in m)
        ]
    else:
        miens = []
    return {
        "q": q,
        "code": code or None,
        "exacts": [fiche_json(f, lec) for f in exacts],
        "proches": [fiche_json(f, lec) for f in proches],
        "mesProduits": [produit(o, lec) for o in list(miens)[:RESULTATS_MAX]],
        "cherche": cherche,
    }


def par_code_barres(lec: Lecteur, code: str) -> dict | None:
    c = re.sub(r"\D", "", code or "")
    if not c:
        return None
    for f in FicheCatalogue.objects.filter(publiee=True, codes_barres__icontains=c):
        if c in [re.sub(r"\D", "", str(x)) for x in f.codes_barres or []]:
            return fiche_json(f, lec)
    return None


def reconnaitre(lec: Lecteur, photo: dict) -> list[dict]:
    """Reconnaissance d'image (VD08-R09) : en attendant le prestataire, les fiches que la boutique vend déjà puis les
    plus vendues de sa zone (3 au plus). Le code-barres reste le moyen sûr (parCodeBarres)."""
    b = lec.boutique
    ids = list(offres_de(b).filter(fiche__isnull=False, fiche__publiee=True).order_by("-maj_le").values_list("fiche_id", flat=True))
    for fid in Offre.objects.filter(boutique__zone=b.zone, etat=E.EN_VENTE, fiche__publiee=True).values_list("fiche_id", flat=True):
        ids.append(fid)
    vus = list(dict.fromkeys(i for i in ids if i))[:3]
    fiches = {f.pk: f for f in FicheCatalogue.objects.filter(pk__in=vus)}
    return [fiche_json(fiches[i], lec) for i in vus]


# ── Brouillon ────────────────────────────────────────────────────────────────────────────────────────


@transaction.atomic
def commencer(lec: Lecteur, fiche_id, variante: str | None = None) -> dict:
    """« C'est celui-là » : un brouillon rattaché à la fiche, valeurs par défaut posées (REFVD-R254)."""
    if not lec.proprietaire:
        return {"ok": False, "raison": "reserve"}
    b = lec.boutique
    f = FicheCatalogue.objects.filter(pk=fiche_id if str(fiche_id).isdigit() else 0, publiee=True).first()
    if f is None:
        return {"ok": False, "raison": "fiche"}
    vs = list(f.variantes or [])
    prises = list(offres_de(b).filter(fiche=f).exclude(etat=E.BROUILLON).values_list("variante", flat=True))
    if variante and variante in vs and variante not in prises:
        v = variante
    else:
        v = next((x for x in vs if x not in prises), vs[0] if vs else "")
    deja = offres_de(b).filter(fiche=f, variante=v, etat=E.BROUILLON).first()
    if deja is not None:
        return {"ok": True, "brouillonId": str(deja.pk)}
    o = Offre(
        boutique=b,
        fiche=f,
        variante=v,
        etat=E.BROUILLON,
        etat_article=etats_produit()[0],
        prix=None,
        stock=0,
        seuil_alerte=5,
        # Défauts de la boutique (Livraison et colis, AJ-A) : délai, colis, paiement au retrait (OFR-02).
        delai_preparation_h=_defauts(b)["delaiH"],
        colis=_defauts(b)["colis"],
        paiement_au_retrait=_defauts(b)["paiementAuRetrait"],
    )
    journal(o, "Brouillon créé sur la fiche du catalogue")
    o.save()
    return {"ok": True, "brouillonId": str(o.pk)}


def brouillon(lec: Lecteur, id_=None) -> dict | None:
    b = lec.boutique
    if id_:
        o = offre_de(b, id_)
    else:
        o = offres_de(b).filter(etat=E.BROUILLON, fiche__isnull=False).select_related("fiche").order_by("-maj_le", "-id").first()
    return produit(o, lec) if o else None


def _defauts(b: Boutique) -> dict:
    from .ajouts import defauts

    return defauts(b)


def classe_colis(poids, dims, defaut: str) -> str:
    """Classe du colis (VD08-R22) : poids facturé = max(poids ; volume ÷ diviseur) et plus grande dimension."""
    if poids is None and dims is None:
        return defaut
    r = reglages_bruts()
    facture = max(float(poids or 0), (dims[0] * dims[1] * dims[2]) / r["diviseur"] if dims else 0)
    grand = max(dims) if dims else 0
    co = parametres.colis()
    c = next((g for g in co.gabarits if facture <= g.kg and grand <= g.cm), None)
    return c.classe if c else co.au_dela


def _nombre(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


@transaction.atomic
def modifier(lec: Lecteur, id_, c: dict) -> dict | None:
    """Brouillon, ou offre existante (« Modifier », « Réapprovisionner », « Corriger l'offre »). None : introuvable."""
    b = lec.boutique
    o = offre_de(b, id_, verrou=True)
    if o is None:
        return None
    if not lec.proprietaire and ("prix" in c or "plancherPrive" in c):
        return {"ok": False, "raison": "prix"}
    if "stock" in c and not _entier_valide(c["stock"], 0, STOCK_MAX):
        return {"ok": False, "raison": "stock"}
    if "seuilAlerte" in c and not _entier_valide(c["seuilAlerte"], 0, SEUIL_MAX):
        return {"ok": False, "raison": "seuil"}
    if c.get("prix") is not None and not _entier_valide(c["prix"], 1, PRIX_MAX):
        return {"ok": False, "raison": "prix"}
    if c.get("plancherPrive") is not None and not _entier_valide(c["plancherPrive"], parametres.commission().prix_min, PRIX_MAX):
        return {"ok": False, "raison": "plancher"}
    if c.get("poidsKg") is not None and not (_nombre(c["poidsKg"]) and 0 < c["poidsKg"] < 1000):
        return {"ok": False, "raison": "colis"}
    dims = c.get("dimensionsCm")
    if dims is not None and not (isinstance(dims, list) and len(dims) == 3 and all(_nombre(d) and 0 < d < 1000 for d in dims)):
        return {"ok": False, "raison": "colis"}
    if "variante" in c and c["variante"] != o.variante:
        prise = offres_de(b).filter(fiche_id=o.fiche_id, variante=c["variante"]).exclude(pk=o.pk).exists()
        if (o.fiche_id and c["variante"] not in (o.fiche.variantes or [])) or prise or not isinstance(c["variante"], str):
            return {"ok": False, "raison": "variante"}
    nouveau = None if o.fiche_id else DemandeFiche.objects.filter(offre=o, statut=DemandeFiche.Statut.BROUILLON).first()
    if any(k in c for k in ("titre", "marque", "categorie", "description", "prioritaire")):
        # Produit nouveau seulement (DP-58) : la fiche d'un produit du catalogue appartient à BelivaY (OFR-01).
        if nouveau is None:
            return {"ok": False, "raison": "nom"}
        refus = _champs_nouveau(nouveau, c)
        if refus:
            return {"ok": False, "raison": refus}
        if "titre" in c:
            o.titre_demande = nouveau.recherche
    if "noteVendeur" in c and (
        not isinstance(c["noteVendeur"], str) or len(c["noteVendeur"]) > NOTE_VENDEUR_MAX or _coordonnees(c["noteVendeur"])
    ):
        return {"ok": False, "raison": "note"}
    if c.get("prixBarre") is not None and not _entier_valide(c["prixBarre"], 1, PRIX_MAX):
        return {"ok": False, "raison": "promo"}
    if c.get("finPromo") is not None and not (_nombre(c["finPromo"]) and c["finPromo"] > horloge.maintenant_ms()):
        return {"ok": False, "raison": "promo"}
    if not lec.proprietaire and ("prixBarre" in c or "finPromo" in c):
        return {"ok": False, "raison": "prix"}
    publiee = o.etat not in (E.BROUILLON, E.REFUSEE)
    if publiee and c.get("prix") is not None and c["prix"] != o.prix:
        # Une offre déjà publiée ne passe ni sous le prix minimum publiable ni au-dessus du plafond de démarrage.
        if refus_de_prix(b, categorie_de(o), bool(c.get("madeInCameroon", o.made_in_cameroon)), c["prix"]):
            return {"ok": False, "raison": "prix"}
    if "stock" in c and c["stock"] != o.stock and o.etat != E.BROUILLON:
        journal(o, "Stock changé : {de} → {a}", de=o.stock, a=c["stock"])
        noter_mouvement(o, lec, o.stock, c["stock"])
    if c.get("prix") is not None and o.prix is not None and c["prix"] != o.prix and o.etat != E.BROUILLON:
        journal(o, "Prix changé : {de} F → {a} F", de=o.prix, a=c["prix"])
    simples = {
        "variante": "variante",
        "stock": "stock",
        "seuilAlerte": "seuil_alerte",
        "paiementAuRetrait": "paiement_au_retrait",
        "madeInCameroon": "made_in_cameroon",
        "prix": "prix",
        "plancherPrive": "plancher_prive",
    }
    for cle, champ in simples.items():
        if cle in c:
            setattr(o, champ, c[cle])
    if c.get("etatArticle") in etats_produit():
        o.etat_article = c["etatArticle"]
    if c.get("delaiPreparationH") in delais_h():
        o.delai_preparation_h = c["delaiPreparationH"]
    if "poidsKg" in c:
        o.poids_kg = Decimal(str(c["poidsKg"])).quantize(Decimal("0.01")) if c["poidsKg"] is not None else None
    if "dimensionsCm" in c:
        o.dimensions_cm = dims
    if "poidsKg" in c or "dimensionsCm" in c:
        o.colis = classe_colis(o.poids_kg, o.dimensions_cm, o.colis)
    if "noteVendeur" in c:
        o.note_vendeur = c["noteVendeur"].strip()
    if "prixBarre" in c:
        o.prix_barre = c["prixBarre"]
    if "finPromo" in c:
        o.fin_promo = datetime.fromtimestamp(c["finPromo"] / 1000, tz=YAOUNDE) if c["finPromo"] is not None else None
    o.save()
    synchroniser_produit(o)
    return {"ok": True, "produit": produit(o, lec)}


# ── Prix : aperçu, conseil, publication ──────────────────────────────────────────────────────────────


def apercu(lec: Lecteur, offre_id, prix: int, mic: bool | None = None) -> dict:
    """« À X F, vous gardez Y F, soit Z % » (PRX-08, VD08-R17, VD08-R21, PRX-03, PRX-09)."""
    from belivay_moteurs.commission import message_commission_minimale, plages_commission_minimale

    b = lec.boutique
    o = offre_de(b, offre_id) if offre_id else None
    categorie = categorie_de(o) if o else "Électronique"
    made_in = mic if mic is not None else bool(o and o.made_in_cameroon)
    p = parametres.commission()
    fam = famille(categorie)
    minimum = prix_minimum(categorie, made_in)
    cap = plafond(b)
    valide = minimum <= prix
    g = garde_ou_none(b, categorie, prix, made_in) if valide else None
    dec = services.decouverte(b)["active"]
    return {
        "prix": prix,
        "garde": g,
        "partPourCent": part_de(g, prix) if g is not None else None,
        "petitPrix": prix < p.seuil_petit_prix,
        "points": float(p.points_petit_prix),
        "minimum": minimum,
        "plagesMinimale": [list(x) for x in plages_commission_minimale(fam, b.palier, dec, made_in, p)],
        "messageMinimale": message_commission_minimale(fam, b.palier, dec, made_in, p),
        "commissionMinimale": p.plancher_commande,
        "seuilPetitPrix": p.seuil_petit_prix,
        "plafond": cap,
        "refus": "minimum" if not valide else ("plafond" if cap and prix > cap["montant"] else None),
    }


def conseil(lec: Lecteur, offre_id, prix: int) -> dict | None:
    """Prix conseillé (DP-56, Q-36) et ce qu'il change : zones où l'offre passe première, économie du client."""
    b = lec.boutique
    o = offre_de(b, offre_id)
    if o is None or not o.fiche_id or prix < 1:
        return None
    conseille = prix_conseille(o, prix)
    g = garde_ou_none(b, o.fiche.categorie, conseille, o.made_in_cameroon)
    if g is None:
        return None
    noms = zones()
    au_prix, au_conseil = premier_dans(o, prix), premier_dans(o, conseille)
    marche = prix_du_marche(o)
    concurrents = Offre.objects.filter(fiche_id=o.fiche_id, etat=E.EN_VENTE, supprimee_le__isnull=True, prix__isnull=False).exclude(
        boutique=b
    )
    meilleur = min((prix_livre(c.prix, c.colis) for c in concurrents), default=None)
    semaine = horloge.maintenant() - timedelta(days=7)
    ids = {str(i) for i in Offre.objects.filter(fiche_id=o.fiche_id).values_list("pk", flat=True)}
    clients = sum(1 for c in CommandeVendeur.objects.filter(payee_a__gte=semaine) if any(str(lg.get("offreId")) in ids for lg in c.lignes))
    return {
        "prixSaisi": prix,
        "conseille": conseille,
        "gardeConseille": g,
        "partConseille": part_de(g, conseille),
        "zones": [{"nom": n, "premier": a, "premierAuConseille": c} for n, a, c in zip(noms, au_prix, au_conseil, strict=True)],
        "marche": {"nombre": len(marche), "min": min(marche, default=prix), "max": max(marche, default=prix)},
        "economieClient": max(0, meilleur - prix_livre(conseille, o.colis)) if meilleur is not None else 0,
        "clientsSemaine": clients,
        "commandesAuxMoinsChers": list(STATISTIQUE_MOINS_CHERS),
        "dejaLeMoinsCher": all(au_prix) or prix <= conseille,
    }


def publication_json(o: Offre, lec: Lecteur, pub: PublicationOffre | None = None) -> dict:
    from apps.client_core.interrupteurs import ouvert

    pub = pub or PublicationOffre.objects.filter(offre=o).first()
    premiers = premier_dans(o, o.prix) if o.fiche_id and o.prix is not None else []
    n = sum(premiers)
    meilleur = bool(premiers) and n == len(premiers)
    reponse = (
        pub.reponse_avant if pub else (o.verification_avant or horloge.maintenant() + timedelta(hours=reglages_bruts()["moderationH"]))
    )
    return {
        "offreId": str(o.pk),
        "titre": o.titre,
        "variante": o.variante,
        "prix": lec.montant(o.prix),
        "reponseAvant": ms(reponse),
        "meilleurPrix": meilleur,
        "zonesPremier": n,
        "zones": len(premiers),
        "avantages": (["badge", *(["flash"] if ouvert("FF-FLASH") else []), "vitrine"] if meilleur else []),
        "enFile": bool(pub and pub.en_file),
        "nouveau": not o.fiche_id,
        "rattache": DemandeFiche.objects.filter(offre=o, statut=DemandeFiche.Statut.RATTACHEE).exists(),
    }


@transaction.atomic
def publier(lec: Lecteur, id_, rester: bool, hors_ligne: bool) -> dict | None:
    """Envoi en vérification (PRX-09, DP-55) : photos, stock, prix minimum publiable et plafond de démarrage du moteur."""
    b = lec.boutique
    o = offre_de(b, id_, verrou=True)
    if o is None:
        return None
    r = reglages_bruts()
    if o.etat not in (E.BROUILLON, E.REFUSEE):
        return {"ok": False, "raison": "etat"}
    nouveau = None if o.fiche_id else DemandeFiche.objects.filter(offre=o, statut=DemandeFiche.Statut.BROUILLON).first()
    if not o.fiche_id and nouveau is None:
        return {"ok": False, "raison": "fiche"}
    if nouveau is not None:  # produit nouveau (DP-58) : BelivaY écrit la fiche pendant la vérification
        if len(nouveau.recherche.strip()) < 3:
            return {"ok": False, "raison": "nom"}
        if nouveau.categorie not in parametres.commission().familles:
            return {"ok": False, "raison": "categorie"}
        texte = nouveau.description.strip()
        if len(texte) < DESCRIPTION_MIN or len(texte) > DESCRIPTION_MAX or _coordonnees(texte):
            return {"ok": False, "raison": "description"}
    if o.prix_barre is not None and o.prix is not None:
        # OFR-05 : remise réelle de FLASH-REMISE-MIN au moins, fin dans PROMO_JOURS_MAX jours au plus.
        remise = 100 * (o.prix_barre - o.prix) / o.prix_barre
        t0 = horloge.maintenant()
        if remise < promo_remise_min() or not o.fin_promo or o.fin_promo <= t0 or o.fin_promo > t0 + timedelta(days=PROMO_JOURS_MAX):
            return {"ok": False, "raison": "promo"}
    if o.note_vendeur and _coordonnees(o.note_vendeur):
        return {"ok": False, "raison": "note"}
    n = PhotoOffre.objects.filter(offre=o).count()
    if n < r["photosMin"]:
        return {"ok": False, "raison": "photos", "detail": str(r["photosMin"] - n)}
    if o.stock < 1:
        return {"ok": False, "raison": "stock"}
    if o.prix is None:
        return {"ok": False, "raison": "prix"}
    refus = refus_de_prix(b, o.fiche.categorie if o.fiche_id else nouveau.categorie, o.made_in_cameroon, o.prix)
    if refus:
        return {"ok": False, "raison": refus[0], "detail": refus[1]}
    t = horloge.maintenant()
    rattache = None
    if nouveau is not None:
        # Doublon (Q-96, FCH-02) : une fiche assez proche existe ⇒ l'offre y est rattachée à l'envoi.
        proches = sorted(
            ((similarite(nouveau.recherche, f.titre), f.pk, f) for f in FicheCatalogue.objects.filter(publiee=True)),
            key=lambda x: (-x[0], x[1]),
        )
        if proches and proches[0][0] >= parametres.doublon() / 100:
            rattache = proches[0][2]
            prises = set(offres_de(b).filter(fiche=rattache).exclude(pk=o.pk).values_list("variante", flat=True))
            o.fiche, o.titre_demande = rattache, ""
            o.variante = next((v for v in rattache.variantes or [] if v not in prises), (rattache.variantes or [""])[0])
            nouveau.statut, nouveau.rattachee_a, nouveau.envoyee_a = DemandeFiche.Statut.RATTACHEE, rattache, t
            nouveau.save()
            journal(o, "Ce produit existe déjà : offre rattachée à sa fiche")
            nouveau = None
    if nouveau is not None:
        delai = timedelta(hours=r["fichePrioDelaiH"] if nouveau.prioritaire else r["ficheDelaiH"])
        o.fiche_demandee = {"reponseAvant": ms(t + delai), "prioritaire": nouveau.prioritaire}
        nouveau.statut, nouveau.envoyee_a, nouveau.reponse_avant, nouveau.en_file = (
            DemandeFiche.Statut.ENVOYEE,
            t,
            t + delai,
            bool(hors_ligne),
        )
        nouveau.save()
    o.etat = E.EN_VERIFICATION
    o.envoyee_a = t
    o.verification_avant = t + timedelta(hours=r["moderationH"])
    o.motif_refus = ""
    o.etape_brouillon = None
    o.rester_jusqua = t + timedelta(days=r["rappelJours"]) if rester else None
    journal(o, "Offre gardée, envoyée au retour du réseau" if hors_ligne else "Offre envoyée en vérification")
    o.save()
    synchroniser_produit(o)
    pub, _ = PublicationOffre.objects.update_or_create(
        offre=o, defaults={"a": t, "reponse_avant": o.verification_avant, "en_file": bool(hors_ligne)}
    )
    return {"ok": True, **publication_json(o, lec, pub)}


@transaction.atomic
def changer_prix(lec: Lecteur, id_, prix, rester: bool) -> dict:
    """« Ajuster » / « Rester » sur une offre déjà en vente : le prix change, l'offre reste en vente."""
    b = lec.boutique
    o = offre_de(b, id_, verrou=True)
    if o is None or not o.fiche_id or not _entier_valide(prix, 1, PRIX_MAX):
        return {"ok": False, "raison": "prix"}
    refus = refus_de_prix(b, o.fiche.categorie, o.made_in_cameroon, prix)
    if refus:
        return {"ok": False, "raison": refus[0], "detail": refus[1]}
    if o.prix != prix:
        journal(o, "Prix changé : {de} F → {a} F", de=o.prix or 0, a=prix)
    o.prix = prix
    o.rester_jusqua = horloge.maintenant() + timedelta(days=reglages_bruts()["rappelJours"]) if rester else None
    if o.prix_auto and o.plancher_prive is not None and o.plancher_prive > prix:
        o.plancher_prive = prix
    o.save()
    synchroniser_produit(o)
    return {"ok": True, "produit": produit(o, lec)}


def publication(lec: Lecteur, id_=None) -> dict | None:
    if id_:
        o = offre_de(lec.boutique, id_)
        pub = PublicationOffre.objects.filter(offre=o).first() if o else None
    else:
        pub = (
            PublicationOffre.objects.filter(offre__boutique=lec.boutique, offre__supprimee_le__isnull=True)
            .select_related("offre__fiche")
            .order_by("-a", "-id")
            .first()
        )
        o = pub.offre if pub else None
    return publication_json(o, lec, pub) if o is not None and pub is not None else None


# ── Modération (console BelivaY) ─────────────────────────────────────────────────────────────────────


@transaction.atomic
def moderer(offre_id: int, accord: bool, motif: str = "") -> dict:
    """Décision de BelivaY sur une offre en vérification (route d'essai du coordinateur, console de modération).
    Accord : en vente, vérifiée maintenant, Product de relaya créé ou mis à jour (le client peut la commander),
    notification « offre vérifiée ». Refus : état « refusee » avec le motif, notification. Rend {offreId, etat,
    productId, motif}. LookupError si l'offre n'existe pas ; ValueError si elle n'est pas en vérification."""
    o = Offre.objects.select_for_update().select_related("fiche", "boutique").filter(pk=offre_id).first()
    if o is None:
        raise LookupError(offre_id)
    if o.etat != E.EN_VERIFICATION:
        raise ValueError(f"offre {offre_id} : {o.etat}, pas en vérification")
    t = horloge.maintenant()
    nom = f"{o.titre} · {o.variante}" if o.variante else o.titre
    if accord:
        o.etat, o.verifiee_a, o.motif_refus = E.EN_VENTE, t, ""
        journal(o, "Offre vérifiée par BelivaY : en vente")
        o.save()
        services.publier_produit(o)
        services.notifier(o.boutique, "offre", "Offre vérifiée", f"{nom} est en vente.", f"offre_detail?p={o.pk}")
    else:
        o.etat, o.motif_refus = E.REFUSEE, (motif or "Offre refusée par BelivaY").strip()
        journal(o, "Offre refusée : {motif}", motif=o.motif_refus)
        o.save()
        synchroniser_produit(o)
        services.notifier(o.boutique, "offre", "Offre à corriger", f"{nom} : {o.motif_refus}", f"offre_detail?p={o.pk}", urgent=True)
    return {"offreId": str(o.pk), "etat": o.etat, "productId": o.product_id, "motif": o.motif_refus or None}


# ── Demande de fiche, description proposée ───────────────────────────────────────────────────────────


NOTE_VENDEUR_MAX = 300  # PARAMÈTRE À AJOUTER AU REGISTRE : VD-NOTE-VENDEUR (note du vendeur sur l'offre)
PROMO_JOURS_MAX = 30  # PARAMÈTRE À AJOUTER AU REGISTRE : VD-PROMO-JOURS (fin d'un prix barré, proposé)
RECHERCHE_MIN = 3  # DP-58, NOF-01 : produit nouveau après une recherche de 3 caractères ou un code-barres


def promo_remise_min() -> int:
    """FLASH-REMISE-MIN (« 10 % ») : remise réelle minimale sous un prix barré (OFR-05)."""
    return int(re.match(r"(\d+)", parametres.valeur("FLASH-REMISE-MIN")).group(1))


def _champs_nouveau(d: DemandeFiche, c: dict) -> str | None:
    """Champs d'un produit nouveau (nom, marque, catégorie du barème, description, fiche prioritaire) : refus ou None."""
    if "titre" in c and (not isinstance(c["titre"], str) or not 3 <= len(c["titre"].strip()) <= 200):
        return "nom"
    if "categorie" in c and c["categorie"] not in parametres.commission().familles:
        return "categorie"
    texte = c.get("description")
    if "description" in c and (not isinstance(texte, str) or len(texte) > DESCRIPTION_MAX or (texte.strip() and _coordonnees(texte))):
        return "description"
    for cle, champ, maxi in (("titre", "recherche", 200), ("marque", "marque", 80), ("categorie", "categorie", 80)):
        if isinstance(c.get(cle), str):
            setattr(d, champ, c[cle].strip()[:maxi])
    if isinstance(texte, str):
        d.description = texte.strip()
    if "prioritaire" in c:
        d.prioritaire = bool(c["prioritaire"])
    d.save()
    return None


def _coordonnees(texte: str) -> bool:
    return bool(nettoyer_message(texte)[1])


@transaction.atomic
def proposer_description(lec: Lecteur, offre_id, texte: str) -> dict | None:
    """Correction de la fiche proposée par le vendeur, relue par BelivaY (Q-34) ; coordonnées refusées."""
    o = offre_de(lec.boutique, offre_id, verrou=True)
    if o is None:
        return None
    t = (texte or "").strip()
    if len(t) < DESCRIPTION_MIN:
        return {"ok": False, "raison": "court"}
    if len(t) > DESCRIPTION_MAX:
        return {"ok": False, "raison": "long"}
    if _coordonnees(t):
        return {"ok": False, "raison": "coordonnees"}
    maintenant = horloge.maintenant()
    reponse = ms(maintenant + timedelta(hours=reglages_bruts()["ficheDelaiH"]))
    o.description_proposee = {"texte": t, "envoyeeA": ms(maintenant), "reponseAvant": reponse}
    journal(o, "Description proposée à BelivaY")
    o.save()
    return {"ok": True, "reponseAvant": reponse}
