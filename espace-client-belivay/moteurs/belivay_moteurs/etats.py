"""Machines à états de l'espace client (CL-02, « Machines à états » ; CL-08, CL-09, CL-11, CL-12 ;
décisions DP-01, DP-10, DP-28, DP-35).

Chaque machine est une table de transitions : état de départ, événement, état d'arrivée, garde et effets (ce que
le serveur doit faire, dans l'ordre). La garde est déclarée, pas programmée : les conditions exigées (vraies dans
le contexte) et les conditions interdites (fausses ou absentes). Une transition absente ou dont la garde n'est pas
remplie est refusée (au serveur : 409 state_changed). Le contexte est fourni par l'appelant, qui calcule chaque
condition avec les moteurs (comptoir, litiges, garde…) ; les machines ne vont jamais chercher de données.

Écarts voulus avec CL-02 : l'état « sans retour » du retour n'existe plus (DP-10 : toujours un dépôt au relais) ;
une rupture de stock essaie au plus deux vendeurs suivants avant d'annuler (DP-01) ; « Tout est en ordre » ne
vient que du client (DP-28).
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Any

from .erreurs import ErreurMoteur


class TransitionRefusee(ErreurMoteur):
    """Transition inconnue depuis cet état, ou garde fausse : 409 state_changed côté serveur."""


@dataclass(frozen=True)
class Transition:
    de: str
    evenement: str
    vers: str
    exige: tuple[str, ...] = ()  # conditions qui doivent être vraies dans le contexte
    interdit: tuple[str, ...] = ()  # conditions qui doivent être fausses ou absentes
    garde_texte: str = ""
    effets: tuple[str, ...] = ()
    libelle_client: str = ""

    def permise(self, contexte: Mapping[str, Any]) -> bool:
        return all(contexte.get(k) for k in self.exige) and not any(contexte.get(k) for k in self.interdit)


@dataclass(frozen=True)
class Machine:
    nom: str
    transitions: tuple[Transition, ...]
    etats_finaux: frozenset[str] = field(default_factory=frozenset)

    @property
    def etats(self) -> frozenset[str]:
        return frozenset({t.de for t in self.transitions} | {t.vers for t in self.transitions})

    def possibles(self, etat: str) -> tuple[Transition, ...]:
        return tuple(t for t in self.transitions if t.de == etat)

    def appliquer(self, etat: str, evenement: str, contexte: Mapping[str, Any] | None = None) -> Transition:
        """La transition à appliquer ; TransitionRefusee si l'événement n'est pas permis ou si la garde est fausse."""
        ctx = contexte or {}
        candidates = [t for t in self.transitions if t.de == etat and t.evenement == evenement]
        if not candidates:
            raise TransitionRefusee(f"{self.nom} : « {evenement} » impossible depuis « {etat} »")
        for t in candidates:
            if t.permise(ctx):
                return t
        raise TransitionRefusee(f"{self.nom} : « {evenement} » depuis « {etat} » refusé ({candidates[0].garde_texte})")


T = Transition

# ── La commande ─────────────────────────────────────────────────────────────────────────────────────────

COMMANDE = Machine(
    "commande",
    (
        T("—", "cart.updated", "panier", effets=("panier recalculé",), libelle_client="Mon panier"),
        T(
            "panier",
            "checkout",
            "en_attente_paiement",
            ("numero_verifie", "prix_controles", "stock_reservable"),
            (),
            "numéro vérifié ; prix contrôlés (Δ = 0 ou baisse, ou hausse confirmée) ; stock réservable",
            ("réservation", "tentative n° 1", "demande à l'agrégateur"),
            "Paiement en attente",
        ),
        T(
            "panier",
            "checkout.counter",
            "validee_comptoir",
            ("eligible_comptoir", "livraison_payee"),
            (),
            "éligible au comptoir (moteur comptoir) ; livraison payée d'avance",
            ("order.validated", "relais : montant dû au retrait"),
            "Validée",
        ),
        T(
            "en_attente_paiement",
            "payment.succeeded",
            "payee",
            ("montant_egal_serveur", "cle_tentative_en_cours"),
            (),
            "montant = M serveur ; clé de la tentative en cours",
            ("escrow écrit", "sous-commandes créées", "order.paid"),
            "Commande confirmée",
        ),
        *(
            T(
                "en_attente_paiement",
                evenement,
                "panier",
                effets=("réservations libérées", "payment.failed", "panier intact"),
                libelle_client="Paiement non abouti",
            )
            for evenement in ("payment.failed", "payment.expired", "payment.cancelled")  # échec, t ≥ t_exp, « Annuler »
        ),
        T(
            "validee_comptoir",
            "counter.paid",
            "payee",
            ("montant_du_paye",),
            (),
            "montant dû payé = articles + garde",
            ("escrow écrit", "code débloqué"),
            "Retirable maintenant",
        ),
        T(
            "payee",
            "suborders.finished",
            "terminee",
            ("fenetres_retour_fermees",),
            ("litige_ouvert",),
            "fenêtres de retour fermées, aucun litige ouvert",
            ("facture définitive",),
            "Terminées",
        ),
        T(
            "payee",
            "suborders.cancelled",
            "annulee",
            effets=("remboursements vers le moyen d'origine",),
            libelle_client="Annulée le …",
        ),
    ),
    frozenset({"terminee", "annulee"}),
)

# ── La sous-commande et le colis ────────────────────────────────────────────────────────────────────────

AVANT_COLLECTE = ("payee", "confirmee", "prete")

SOUS_COMMANDE = Machine(
    "sous-commande",
    (
        T("—", "order.paid", "payee", effets=("vendeur notifié",), libelle_client="Pas encore confirmée"),
        T(
            "payee",
            "seller.confirmed",
            "confirmee",
            effets=("délai de préparation démarre",),
            libelle_client="Préparation en cours",
        ),
        T(
            "confirmee",
            "suborder.ready",
            "prete",
            effets=("collecte ajoutée au paquet de la zone",),
            libelle_client="Prêt dans X h",
        ),
        T(
            "prete",
            "parcel.collected",
            "collectee",
            ("deux_photos", "scelle", "code_de_remise"),
            (),
            "2 photos, scellé, code de remise",
            ("annulation fermée",),
            "Récupéré par le livreur",
        ),
        T(
            "collectee",
            "parcel.received",
            "arrivee_relais",
            ("code_de_depot",),
            (),
            "code de dépôt du livreur",
            ("C2a ; au dernier colis du groupe : C2 + C3, J0 à l'accusé fort",),
            "Arrivé au relais",
        ),
        T(
            "collectee",
            "home.departed",
            "en_livraison_domicile",
            ("mode_domicile",),
            (),
            "mode domicile",
            ("prénom, photo et heure estimée du livreur",),
            "En route",
        ),
        T(
            "arrivee_relais",
            "parcel.handed",
            "remise",
            ("code_valide", "photo", "montant_du_paye", "nombre_de_colis"),
            (),
            "code validé, photo, montant dû payé, nombre de colis",
            ("fin de la garde", "fenêtre de retour ouverte"),
            "Retiré",
        ),
        T(
            "en_livraison_domicile",
            "parcel.handed",
            "remise",
            ("code_valide", "photo"),
            (),
            "code validé et photo",
            ("fenêtre de retour ouverte",),
            "Retiré",
        ),
        T(
            "remise",
            "dispute.opened",
            "en_litige",
            ("litige_recevable",),
            (),
            "fenêtre de retour ouverte, défaut caché ≤ 48 h, ou vice caché ≤ 100 jours (moteur litiges)",
            ("escrow retenu", "libération, C10 et garde suspendus"),
            "En litige",
        ),
        T(
            "arrivee_relais",
            "dispute.opened",
            "en_litige",
            ("constat_au_comptoir",),
            (),
            "« Un problème » au comptoir (constat du relais)",
            ("escrow retenu", "garde suspendue"),
            "En litige",
        ),
        T(
            "en_litige",
            "return.accepted",
            "retour_en_cours",
            ("decision_ou_accord",),
            (),
            "décision ou accord du vendeur",
            ("aucune garde",),
            "Retour en cours",
        ),
        T(
            "arrivee_relais",
            "storage.expired",
            "renvoyee_vendeur",
            ("premier_jour_ouvert_apres_7e",),
            ("litige", "groupage"),
            "premier jour ouvert après le 7e jour, sans litige ni groupage",
            ("retenue garde + renvoi", "solde remboursé (S5)"),
            "Renvoyé au vendeur",
        ),
        # Rupture : le serveur passe au vendeur suivant, au plus deux fois (DP-01) ; sans suivant, annulation.
        *(
            T(
                etat,
                "stock.out",
                etat,
                ("vendeur_suivant_disponible",),
                (),
                "vendeur suivant disponible, moins de 2 essais (DP-01)",
                ("bascule sur le vendeur suivant",),
                "Préparation en cours",
            )
            for etat in ("payee", "confirmee")
        ),
        *(
            T(
                etat,
                "suborder.cancel",
                "annulee",
                effets=("Remb = P_sc + max(0, F_avant − F_après)",),
                libelle_client="Annulée",
            )
            for etat in AVANT_COLLECTE
        ),
        *(
            T(
                etat,
                "stock.out",
                "annulee",
                (),
                ("vendeur_suivant_disponible",),
                "aucun vendeur suivant (DP-01)",
                ("remboursement",),
                "Annulée",
            )
            for etat in ("payee", "confirmee")
        ),
    ),
    # « remise » n'est pas finale : un litige peut s'ouvrir après le retrait ; « retour_en_cours » passe la main
    # à la machine du retour.
    frozenset({"renvoyee_vendeur", "annulee", "retour_en_cours"}),
)

#: Rang de la jauge du colis côté client (CL-02, « Les quatre états client du colis »).
RANG_DE_LA_JAUGE = {
    "payee": 0,
    "confirmee": 1,
    "prete": 1,
    "collectee": 2,
    "en_livraison_domicile": 2,
    "arrivee_relais": 3,
    "remise": 4,
}

# ── La tentative de paiement ────────────────────────────────────────────────────────────────────────────

TENTATIVE_PAIEMENT = Machine(
    "tentative de paiement",
    (
        T("—", "payment.requested", "pending", effets=("demande à l'agrégateur, clé = commande + n° de tentative",)),
        T("pending", "webhook.received", "verifying"),
        T("pending", "timer.expired", "verifying", effets=("le serveur interroge l'agrégateur avant de conclure",)),
        T(
            "pending",
            "attempt.replaced",
            "replaced",
            effets=("ancienne demande annulée chez l'agrégateur", "nouvelle clé"),
        ),
        T("pending", "customer.cancelled", "cancelled", effets=("demande annulée chez l'agrégateur",)),
        T(
            "verifying",
            "aggregator.confirmed",
            "succeeded",
            ("webhook_signe_valide",),
            (),
            "webhook signé valide, seule source de vérité",
            ("escrow écrit", "commande payée ou code débloqué"),
            "Commande confirmée · Paiement protégé",
        ),
        T(
            "verifying",
            "aggregator.refused",
            "failed",
            effets=("réservations libérées", "cause traduite pour le client"),
            libelle_client="Paiement non abouti",
        ),
    ),
    frozenset({"succeeded", "failed", "cancelled", "replaced"}),
)

# ── L'escrow ────────────────────────────────────────────────────────────────────────────────────────────

ESCROW = Machine(
    "escrow",
    (
        T(
            "—",
            "payment.succeeded",
            "escrow_bloque",
            effets=("montant bloqué = total payé, ventilé par sous-commande",),
            libelle_client="Ton argent reste bloqué jusqu'à ton retrait",
        ),
        T(
            "escrow_bloque",
            "dispute.opened",
            "suspendu",
            effets=("libération, C10 et garde suspendus",),
            libelle_client="Rien n'est versé au vendeur",
        ),
        T("suspendu", "dispute.rejected", "escrow_liberable", effets=("libération recalculée",)),
        T("suspendu", "refund.decided", "rembourse", effets=("vers le moyen d'origine",)),
        T(
            "escrow_bloque",
            "return.closed",
            "escrow_liberable",
            effets=("date de libération = fermeture + 3 j (Or, Platine 1 j ; carte 14 j)",),
            libelle_client="Le vendeur n'est pas encore payé",
        ),
        T("escrow_liberable", "payout.friday", "verse", effets=("vendeur payé le vendredi",)),
        T(
            "escrow_bloque",
            "refund.decided",
            "rembourse",
            effets=("toujours vers le moyen d'origine (même numéro MoMo, même carte), jamais réorienté",),
            libelle_client="Remboursé",
        ),
    ),
    frozenset({"verse", "rembourse"}),
)

# ── Le litige ───────────────────────────────────────────────────────────────────────────────────────────

LITIGE = Machine(
    "litige",
    (
        T(
            "—",
            "dispute.opened",
            "ouvert",
            (),
            ("dossier_deja_ouvert", "sous_seuil_automatique"),
            "un seul dossier ouvert par colis ; au-delà du seuil automatique du palier",
            ("escrow retenu", "libération, C10 et garde suspendus"),
            "Litige ouvert",
        ),
        T(
            "—",
            "dispute.auto_refunded",
            "rembourse_automatiquement",
            ("sous_seuil_automatique",),
            (),
            "montant ≤ seuil automatique du palier (moteur litiges)",
            ("remboursement payé par BelivaY", "vendeur payé, Trust Score intact"),
            "Remboursé",
        ),
        T(
            "ouvert",
            "seller.notified",
            "attente_vendeur",
            effets=("échéance = ouverture + 48 h",),
            libelle_client="Le vendeur a 48 h pour répondre",
        ),
        T(
            "attente_vendeur",
            "seller.accepted",
            "decide",
            effets=("remplacement ou remboursement selon le souhait",),
            libelle_client="Décision",
        ),
        T(
            "attente_vendeur",
            "seller.contested",
            "en_examen",
            ("arrangement_ou_contestation_valide",),
            (),
            "arrangement d'au moins 40 caractères (LIT-ARRANG-MIN)",
            ("arbitrage humain en console",),
            "En examen",
        ),
        T(
            "attente_vendeur",
            "arrangement.refused",
            "en_examen",
            effets=("arbitrage humain en console",),
            libelle_client="En examen",
        ),
        T(
            "attente_vendeur",
            "arrangement.expired",
            "en_examen",
            effets=("sans réponse du client sous 5 jours (DP-35)",),
            libelle_client="En examen",
        ),
        T(
            "attente_vendeur",
            "seller.silent",
            "en_examen",
            effets=("présomption client", "file prioritaire"),
            libelle_client="En examen",
        ),
        T(
            "attente_vendeur",
            "arrangement.accepted",
            "decide",
            effets=("remboursement partiel convenu",),
            libelle_client="Décision",
        ),
        T(
            "en_examen",
            "dispute.decided",
            "decide",
            ("motif_ecrit",),
            (),
            "motif écrit obligatoire ; validation humaine",
            ("remboursement, remplacement ou débouté", "scores et IFA"),
            "Décision",
        ),
        T(
            "decide",
            "appeal.filed",
            "en_examen",
            ("recours_possible",),
            (),
            "un recours, sous 48 h après la décision, examiné par une autre personne (DP-35)",
            ("argent toujours bloqué",),
            "En examen",
        ),
    ),
    frozenset({"rembourse_automatiquement"}),
)

# ── Le retour (DP-10 : toujours un dépôt au relais, plus d'état « sans retour ») ─────────────────────────

RETOUR = Machine(
    "retour",
    (
        T(
            "—",
            "return.accepted",
            "accepte",
            effets=("retour gratuit si le problème est validé", "argent bloqué"),
            libelle_client="À déposer",
        ),
        T(
            "accepte",
            "return.deposited",
            "retour_depose",
            effets=("aucune garde, hors capacité du relais",),
            libelle_client="Retour déposé",
        ),
        T(
            "retour_depose",
            "return.collected",
            "collecte",
            effets=("pris dans la tournée de la zone, sans course spéciale",),
            libelle_client="Récupéré par le livreur",
        ),
        T("collecte", "return.received", "recu", libelle_client="Le vendeur inspecte"),
        T("recu", "return.inspected", "retour_inspecte", effets=("inspection du vendeur sous 48 h",)),
        T("recu", "inspection.expired", "clos", effets=("remboursement automatique",), libelle_client="Remboursée"),
        T(
            "retour_inspecte",
            "return.closed",
            "clos",
            effets=("remboursement (moins le trajet si le client est en tort) ou remplacement",),
            libelle_client="Remboursée · X F",
        ),
    ),
    frozenset({"clos"}),
)

# ── Le remplacement ─────────────────────────────────────────────────────────────────────────────────────

REMPLACEMENT = Machine(
    "remplacement",
    (
        T(
            "—",
            "replacement.decided",
            "attente",
            effets=("échéance = RET-REMPL-DELAI (heures ouvrées, dimanche non compté)",),
            libelle_client="Le vendeur renvoie … avant le …",
        ),
        T(
            "attente",
            "replacement.collected",
            "expedie",
            effets=("nouveau colis au relais, nouveau code",),
            libelle_client="Nouvel article en route",
        ),
        T(
            "attente",
            "seller.out_of_stock",
            "autre_vendeur",
            ("autre_vendeur_conforme",),
            (),
            "autre vendeur au Trust Score ≥ REMPL-TRUST-MIN, prix livré ≤ + 5 %, écart payé par BelivaY",
            ("le client accepte ou se fait rembourser",),
            "Un autre vendeur l'a",
        ),
        T(
            "attente",
            "replacement.late",
            "rembourse",
            effets=("remboursement automatique",),
            libelle_client="Remboursement automatique",
        ),
        T(
            "autre_vendeur",
            "replacement.collected",
            "expedie",
            effets=("nouveau colis au relais, nouveau code",),
            libelle_client="Nouvel article en route",
        ),
        T(
            "autre_vendeur",
            "customer.refund_chosen",
            "rembourse",
            effets=("remboursement",),
            libelle_client="Remboursée",
        ),
        T(
            "expedie",
            "parcel.handed",
            "remis",
            effets=("litige clos", "paiement libéré pour le vendeur"),
            libelle_client="Ton nouvel article est à toi",
        ),
    ),
    frozenset({"remis", "rembourse"}),
)

MACHINES = (COMMANDE, SOUS_COMMANDE, TENTATIVE_PAIEMENT, ESCROW, LITIGE, RETOUR, REMPLACEMENT)
