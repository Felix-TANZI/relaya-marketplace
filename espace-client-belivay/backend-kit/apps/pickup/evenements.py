# backend/apps/pickup/evenements.py
# Événements des vendeurs, livreurs et relais → sous-commandes (colis) et groupes de remise (REPRISE § 2.6).
#
# À appeler depuis les applications de relaya qui reçoivent ces gestes (vendor : commande confirmée, prête ; livreur :
# collecte, dépôt au relais, départ vers le domicile ; relais : remise au client avec le code). Chaque événement passe
# par la machine SOUS_COMMANDE des moteurs (belivay_moteurs.etats) : un événement impossible depuis l'état du colis
# lève TransitionRefusee (409 state_changed dans les vues du kit).
#
#   avancer(order_id, "seller.confirmed" | "suborder.ready" | "parcel.collected" | "parcel.received" | "home.departed",
#           n=None)                    → colis passés à l'état suivant (n : un seul colis de la commande)
#   remettre_au_client(order_id, code) → {ok, colis} ou le refus de essayer_code (code faux, blocage CAL-18)
#
# Effets portés ici : dates du colis (collectee_le, arrivee_le, remise_le), accusé fort du groupe au dernier colis
# arrivé (J0 de la garde, CAL-19), fin de la garde au retrait (retire_le), notification « colis arrivé » au client.
from django.db import transaction
from django.utils import timezone

from apps.client_core import pont
from belivay_moteurs.etats import SOUS_COMMANDE

from .models import GroupeRemise, MontantsCommande, SousCommande
from .services import essayer_code

# Gardes des transitions : ce que l'application du livreur ou du relais a déjà contrôlé avant d'envoyer l'événement.
CONTEXTES = {
    "seller.confirmed": {},
    "suborder.ready": {},
    "parcel.collected": {"deux_photos": True, "scelle": True, "code_de_remise": True},
    "parcel.received": {"code_de_depot": True},
    "home.departed": {"mode_domicile": True},
}
DATES = {"parcel.collected": "collectee_le", "parcel.received": "arrivee_le"}


def _actifs(order_id: int, n: int | None):
    qs = SousCommande.objects.select_for_update().filter(order_id=order_id).exclude(etat=SousCommande.Etat.ANNULEE)
    return qs.filter(n=n) if n is not None else qs


def avancer(order_id: int, evenement: str, n: int | None = None) -> list[SousCommande]:
    """Applique `evenement` aux colis de la commande (ou au colis n) ; rend les colis changés."""
    if evenement not in CONTEXTES:
        raise ValueError(f"événement inconnu : {evenement}")
    maintenant = timezone.now()
    changes = []
    with transaction.atomic():
        for sc in _actifs(order_id, n):
            t = SOUS_COMMANDE.appliquer(sc.etat, evenement, CONTEXTES[evenement])
            sc.etat = t.vers
            champs = ["etat"]
            if evenement in DATES:
                setattr(sc, DATES[evenement], maintenant)
                champs.append(DATES[evenement])
            sc.save(update_fields=champs)
            changes.append(sc)
        if evenement == "parcel.received":
            _accuse_fort(order_id, maintenant)
    if evenement == "parcel.received" and changes:
        _annoncer_arrivee(order_id)
    return changes


def _accuse_fort(order_id: int, moment) -> None:
    """Au dernier colis arrivé d'un groupe : accusé fort (J0 de la garde, CAL-19) ; une seule fois."""
    for g in GroupeRemise.objects.select_for_update().filter(order_id=order_id, accuse_fort_le__isnull=True, retire_le__isnull=True):
        colis = SousCommande.objects.filter(order_id=order_id).exclude(etat=SousCommande.Etat.ANNULEE)
        if colis.exists() and not colis.filter(arrivee_le__isnull=True).exists():
            g.accuse_fort_le = moment
            g.save(update_fields=["accuse_fort_le"])


def _annoncer_arrivee(order_id: int) -> None:
    m = MontantsCommande.objects.filter(order_id=order_id).select_related("client").first()
    if (
        m is None
        or SousCommande.objects.filter(order_id=order_id, arrivee_le__isnull=True).exclude(etat=SousCommande.Etat.ANNULEE).exists()
    ):
        return
    from apps.notifications_client.services import notifier

    # CAP-19 : jamais le code dans une notification ; le client l'ouvre dans l'application.
    notifier(m.client, "Ton colis est arrivé", f"Commande {m.ref} : prête au retrait.", f"/commande?ref={m.ref}", type="retrait")


def remettre_au_client(order_id: int, code: str) -> dict:
    """Remise au comptoir : le code saisi par le relais (essayer_code : trois faux ⇒ blocage) ; les colis arrivés
    passent à « remise », la fenêtre de retour s'ouvre, la garde s'arrête."""
    g = GroupeRemise.objects.filter(order_id=order_id, retire_le__isnull=True).first()
    if g is None:
        return {"ok": False, "raison": "aucun_colis"}
    r = essayer_code(g, code)
    if not r.get("ok"):
        return r
    maintenant = timezone.now()
    with transaction.atomic():
        colis = [
            sc for sc in _actifs(order_id, None) if sc.etat in (SousCommande.Etat.ARRIVEE_RELAIS, SousCommande.Etat.EN_LIVRAISON_DOMICILE)
        ]
        if not colis:
            return {"ok": False, "raison": "pas_arrive"}
        contexte = {"code_valide": True, "photo": True, "montant_du_paye": True, "nombre_de_colis": True}
        for sc in colis:
            sc.etat = SOUS_COMMANDE.appliquer(sc.etat, "parcel.handed", contexte).vers
            sc.remise_le = maintenant
            sc.save(update_fields=["etat", "remise_le"])
        g.retire_le = maintenant
        g.save(update_fields=["retire_le"])
    return {"ok": True, "colis": len(colis), "ref": pont.ref_commande(order_id)}
