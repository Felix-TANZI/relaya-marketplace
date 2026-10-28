# backend/apps/vendeur_core/faits.py
# Ce que le client et BelivaY ont fait sur une commande du vendeur, lu dans les applications du kit client (pickup :
# colis remis au client, « Tout est en ordre » ; aftersales : litige, retour, remplacement, décision, recours). Une seule
# lecture, partagée par l'argent (états, libération), l'accueil, les commandes et les litiges du vendeur.
# ANONYMAT : rien d'autre que des dates et des états ; ni le client, ni son relais.
from dataclasses import dataclass
from datetime import datetime

from .models import CommandeVendeur


@dataclass(frozen=True)
class Faits:
    retrait: datetime | None  # colis remis au client (pickup.SousCommande.remise_le) : ouvre la fenêtre de retour
    tout_en_ordre: datetime | None  # « Tout est en ordre » (pickup.MontantsCommande.tout_en_ordre_le)
    etat_colis: str  # pickup.SousCommande.etat (payee, confirmee, prete, collectee, arrivee_relais, remise…)
    litige_id: int | None  # aftersales.Litige du colis (le plus récent), s'il y en a un
    gel: str | None  # « litige » | « retour » | « recours » | None (versements.MotifGel)
    fin_du_gel: datetime | None  # litige clos (gagné ou sans suite) : la libération reprend (Q-60)
    perdu: bool  # litige décidé contre le vendeur et clos (remboursé) : la somme est reprise


def faits(c: CommandeVendeur, maintenant: datetime | None = None) -> Faits:
    from apps.aftersales.models import Litige
    from apps.pickup.models import MontantsCommande, SousCommande

    from . import horloge

    t = maintenant or horloge.maintenant()
    sc = SousCommande.objects.filter(order_id=c.order_id, n=c.n).first()
    m = MontantsCommande.objects.filter(order_id=c.order_id).first()
    lit = Litige.objects.filter(order_id=c.order_id, colis=c.n, retire_le__isnull=True).order_by("-ouvert_le").first()
    gel, fin, perdu = None, None, False
    if lit is not None:
        from apps.aftersales.models import Retour

        if lit.clos_le is None:
            gel = "retour" if Retour.objects.filter(litige=lit).exists() else "litige"
        else:
            perdu = lit.issue in (Litige.Issue.REMBOURSE, Litige.Issue.REMPLACE) and lit.rembourse > 0
            if not perdu and lit.decision_le is not None and lit.recours_le is None:
                from belivay_moteurs.litiges import recours_possible

                from . import parametres

                if recours_possible(lit.decision_le, t, False, parametres.litiges()):
                    gel = "recours"
            fin = lit.clos_le
    return Faits(
        retrait=sc.remise_le if sc else None,
        tout_en_ordre=m.tout_en_ordre_le if m else None,
        etat_colis=sc.etat if sc else "",
        litige_id=lit.pk if lit else None,
        gel=gel,
        fin_du_gel=fin,
        perdu=perdu,
    )
