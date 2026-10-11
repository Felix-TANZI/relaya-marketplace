# backend/apps/vendeur_session/saisie.py
# Saisie assistée par l'agent de zone (SAI-01 à 04, VD03-R15 ; DP-56 Q-34, Q-40) : l'agent photographie et saisit les
# produits ; le propriétaire relit, corrige le prix ou le stock, et valide. Quatre contrôles automatiques par fiche :
#   photo       — au moins le minimum de photos d'une offre (VD-PHOTOS) ;
#   doublon     — une fiche maître du catalogue porte déjà ce titre : la fiche y est rattachée ;
#   prix        — prix anormal (VD-PRIX-ANORMAL) : sous x % ou au-delà de n fois la médiane des offres en vente du même rayon (à défaut,
#                 le prix habituel relevé par l'agent) ; relecture humaine, jamais de blocage automatique (Q-40) ;
#   description — une description est écrite.
# Validée, une fiche devient une VRAIE offre (vendeur_core.Offre « en vérification »). L'accès Préparation ne voit
# aucun montant : ni fiches (prix), ni tarif de session.
from statistics import median

from django.db import transaction

from apps.client_core.erreurs import introuvable
from apps.client_core.temps import ms
from apps.vendeur_core import horloge, parametres
from apps.vendeur_core.models import Boutique, FicheCatalogue, Offre

from .models import DossierOuverture, FicheAgent, VisiteAgent
from .ouverture import plus_heures_ouvrees

# Registre (vendeur_core.parametres) : sessions gratuites et tarif d'une session suivante (VD-SAISIE-ASSISTEE) ; prix
# anormal (VD-PRIX-ANORMAL, DP-56 Q-40) ; photos d'une offre (VD-PHOTOS) ; délai de vérification d'une offre
# (VD-MODERATION, compté ici en heures ouvrées).
STOCK_MAX = 9999


def mediane(f: FicheAgent) -> int | None:
    prix = (
        list(Offre.objects.filter(etat=Offre.Etat.EN_VENTE, fiche__rayon=f.rayon, prix__isnull=False).values_list("prix", flat=True))
        if f.rayon
        else []
    )
    return int(median(prix)) if prix else f.mediane_relevee


def prix_anormal(prix: int, med: int | None) -> bool:
    if med is None:
        return False
    s = parametres.prix_anormal()
    return prix * 100 < med * s.bas_pour_cent or prix > med * s.haut_fois


def fiche_json(f: FicheAgent) -> dict:
    med = mediane(f)
    return {
        "id": str(f.pk),
        "titre": f.titre,
        "dessin": f.dessin,
        "prix": f.prix,
        "stock": f.stock,
        "photos": f.photos,
        "controles": {
            "photo": "ok" if f.photos >= parametres.photos().minimum else "echec",
            "doublon": "echec" if f.fiche_id else "ok",
            "prix": "echec" if prix_anormal(f.prix, med) else "ok",
            "description": "ok" if f.description.strip() else "echec",
        },
        "rattachee": f.fiche_id is not None,
        "mediane": med,
        "modifieeA": ms(f.modifiee_a) if f.modifiee_a else None,
    }


def saisie(b: Boutique, proprietaire: bool) -> dict:
    """SaisieAssistee : la dernière visite de l'agent (fiches à valider, fiches validées)."""
    v = VisiteAgent.objects.filter(boutique=b).first()
    fiches = list(v.fiches.select_related("offre").all()) if v else []
    validees = sorted((f for f in fiches if f.validee_a), key=lambda f: f.validee_a, reverse=True)
    sa, pa = parametres.saisie_assistee(), parametres.prix_anormal()
    return {
        "agent": {"prenom": v.agent if v else "", "zone": v.zone if v else b.zone},
        "le": (v.le if v else horloge.aujourd_hui()).isoformat(),
        "gratuite": bool(v.gratuite) if v else True,
        "premieresBoutiques": sa.premieres_boutiques,
        "prixSession": sa.prix_session if proprietaire else None,
        "fiches": [fiche_json(f) for f in fiches if not f.validee_a] if proprietaire else [],
        "validees": [
            {
                "id": str(f.pk),
                "titre": f.titre,
                "enVerification": bool(f.offre and f.offre.etat == Offre.Etat.EN_VERIFICATION),
                "a": ms(f.validee_a),
            }
            for f in validees
        ],
        "seuilPrix": {"basPourCent": pa.bas_pour_cent, "hautFois": pa.haut_fois},
    }


def _fiches(b: Boutique):
    return FicheAgent.objects.filter(visite__boutique=b, validee_a__isnull=True)


def valider(b: Boutique, ids: list) -> int:
    """Les fiches choisies deviennent des offres « en vérification » ; une ouverture en cours compte ses brouillons."""
    t = horloge.maintenant()
    n = 0
    with transaction.atomic():
        for f in _fiches(b).filter(pk__in=[int(i) for i in ids if str(i).isdigit()]).select_for_update():
            o = Offre.objects.create(
                boutique=b,
                fiche=f.fiche,
                titre_demande="" if f.fiche_id else f.titre,
                etat=Offre.Etat.EN_VERIFICATION,
                prix=f.prix,
                stock=f.stock,
                envoyee_a=t,
                verification_avant=plus_heures_ouvrees(t, parametres.moderation()),
                historique=[{"a": ms(t), "quoi": "Saisie par l'agent de zone, validée par le propriétaire"}],
            )
            f.validee_a, f.offre = t, o
            f.save(update_fields=["validee_a", "offre"])
            n += 1
        d = DossierOuverture.objects.filter(boutique=b).exclude(etape=DossierOuverture.Etape.SIGNEE).first()
        if n and d is not None:
            d.brouillons += n
            d.save(update_fields=["brouillons"])
    return n


def modifier(b: Boutique, fiche_id: str, prix, stock) -> dict | None:
    """None si tout va bien ; sinon le refus du site (prix, stock)."""
    f = _fiches(b).filter(pk=int(fiche_id) if str(fiche_id).isdigit() else 0).first()
    if f is None:
        raise introuvable("Fiche inconnue.")
    if not isinstance(prix, int) or isinstance(prix, bool) or prix < parametres.commission().prix_min:
        return {"ok": False, "raison": "prix"}
    if not isinstance(stock, int) or isinstance(stock, bool) or not 0 <= stock <= STOCK_MAX:
        return {"ok": False, "raison": "stock"}
    f.prix, f.stock, f.modifiee_a = prix, stock, horloge.maintenant()
    f.save(update_fields=["prix", "stock", "modifiee_a"])
    return None


def rattacher(f: FicheAgent) -> None:
    """Contrôle du doublon à la saisie : une fiche maître porte déjà ce titre."""
    f.fiche = FicheCatalogue.objects.filter(titre__iexact=f.titre.strip(), publiee=True).first()
