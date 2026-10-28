# backend/apps/payments/management/commands/request_locked_financial_config.py
#
# Cree les demandes de changement (maker) pour verrouiller en base la
# configuration financiere deja decidee dans les documents produit, mais
# jamais reellement seedee : 0 ligne EscrowPolicy, 0 ligne DistributionRule
# existaient avant cette commande.
#
# NE FAIT QU'UNE CHOSE : creer des ConfigChangeRequest en attente (PENDING).
# N'approuve rien, n'active rien. La regle des quatre yeux s'applique : le
# demandeur (--username) ne peut pas etre celui qui approuve. L'approbation
# se fait ensuite dans /admin/ (ConfigChangeRequest -> action "Approuver et
# appliquer"), par un DEUXIEME compte.

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from apps.payments.config.change_control import ChangeControlError, request_change
from apps.payments.config.models import ConfigChangeRequest


def _escrow_default_payload() -> dict:
    """Spec v2.1, R23 (feuille de route D17) : l'auto-confirmation se fixe au RETRAIT (retrait + r_retour_j, posé par
    bridge.signals.ouvrir_le_droit_de_retour), pas au paiement : 0 ici ; libération + r_lib_j_standard, ramené à
    r_lib_j_rapide au retrait pour Or et Platine ; fenêtre de litige r_retour_j (R67.1)."""
    from apps.regles import services as regles

    return {
        "name": "Politique par défaut",
        "auto_confirm_hours": 0,
        "release_delay_hours": 24 * regles.reglage("r_lib_j_standard"),
        "dispute_window_days": regles.reglage("r_retour_j"),
        "vendor_reply_hours": regles.reglage("r_litige_reponse_h"),
        "priority": 0,
    }
ESCROW_JUSTIFICATION = (
    "Spec v2.1, R23 et R67.1 (feuille de route D17) : fermeture du droit de retour "
    "au retrait + r_retour_j (ou confirmation du client), puis liberation + "
    "r_lib_j_standard (Bronze, Argent) ou r_lib_j_rapide (Or, Platine). Double "
    "validation exigee avant la production."
)

DISTRIBUTION_RULES = [
    {
        "target_key": "dist-goods-vendor",
        "payload": {
            "name": "Marchandise au vendeur",
            "component": "GOODS",
            "payee_type": "VENDOR",
            "basis": "REMAINDER",
            "value": "0",
            "priority": 10,
        },
        "justification": (
            "Sans cette regle, aucune commande ne peut liberer son escrow vers "
            "le vendeur — le moteur de repartition refuse (IncompleteDistribution) "
            "tant qu'un composant GOODS n'a pas de regle."
        ),
    },
    {
        "target_key": "dist-transport-carrier",
        "payload": {
            "name": "Transport à l'entreprise de livraison",
            "component": "TRANSPORT",
            "payee_type": "DELIVERY_COMPANY",
            "basis": "PERCENT_OF_COMPONENT",
            "value": "70.0000",
            "priority": 20,
        },
        "justification": (
            "Part a arbitrer contractuellement (valeur provisoire reprise du "
            "chantier initial) — necessaire pour qu'un livreur/une entreprise de "
            "livraison touche reellement une part des frais de transport. "
            "Aujourd'hui, aucun mecanisme ne verse d'argent reel a un livreur : "
            "0 ligne DistributionRule n'existait en base."
        ),
    },
    {
        "target_key": "dist-transport-platform",
        "payload": {
            "name": "Part plateforme sur le transport",
            "component": "TRANSPORT",
            "payee_type": "PLATFORM",
            "basis": "REMAINDER",
            "value": "0",
            "priority": 10,
        },
        "justification": "Solde du composant TRANSPORT apres la part transporteur (70%).",
    },
    {
        "target_key": "dist-relay-point",
        "payload": {
            "name": "Remise au point relais",
            "component": "RELAY_HANDLING",
            "payee_type": "RELAY_POINT",
            "basis": "REMAINDER",
            "value": "0",
            "priority": 10,
        },
        "justification": (
            "Sans cette regle, aucune commande via relais ne peut liberer son "
            "composant RELAY_HANDLING — meme raison que dist-goods-vendor."
        ),
    },
    {
        "target_key": "dist-payment-fee-platform",
        "payload": {
            "name": "Frais Mobile Money payes par le client",
            "component": "PAYMENT_FEE",
            "payee_type": "PLATFORM",
            "basis": "REMAINDER",
            "value": "0",
            "priority": 10,
        },
        "justification": (
            "Spec v2.1, R02.2 et R02.3 : le client paie les frais Mobile Money en plus de base_paiement ; "
            "sans cette regle, toute commande qui en porte est refusee par la repartition "
            "(IncompleteDistribution). A approuver AVANT d'ouvrir les achats."
        ),
    },
]


class Command(BaseCommand):
    help = (
        "Cree les ConfigChangeRequest (statut PENDING) pour verrouiller EscrowPolicy "
        "et les DistributionRule GOODS/TRANSPORT/RELAY_HANDLING/PAYMENT_FEE. N'approuve rien : "
        "un second compte doit approuver dans /admin/."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--username", required=True,
            help="Compte demandeur (maker). Doit être différent de celui qui approuvera.",
        )

    def handle(self, *args, **options):
        try:
            requester = User.objects.get(username=options["username"])
        except User.DoesNotExist:
            raise CommandError(f"Utilisateur '{options['username']}' introuvable.")

        created = []
        skipped = []

        def _request(target_model, target_key, payload, justification):
            deja_en_attente = ConfigChangeRequest.objects.filter(
                target_model=target_model,
                target_key=target_key,
                status=ConfigChangeRequest.Status.PENDING,
            ).exists()
            if deja_en_attente:
                skipped.append((target_key, "Une demande PENDING existe déjà pour cette clé."))
                return
            try:
                demande = request_change(
                    target_model=target_model,
                    target_key=target_key,
                    payload=payload,
                    justification=justification,
                    requested_by=requester,
                    action=ConfigChangeRequest.Action.CREATE,
                )
                created.append(demande)
            except ChangeControlError as exc:
                skipped.append((target_key, str(exc)))

        _request("EscrowPolicy", "escrow-default", _escrow_default_payload(), ESCROW_JUSTIFICATION)
        for rule in DISTRIBUTION_RULES:
            _request("DistributionRule", rule["target_key"], rule["payload"], rule["justification"])

        for demande in created:
            self.stdout.write(self.style.SUCCESS(
                f"Créée : {demande.reference} — {demande.target_model}/{demande.target_key} (PENDING)"
            ))
        for target_key, reason in skipped:
            self.stdout.write(self.style.WARNING(f"Ignorée ({target_key}) : {reason}"))

        if created:
            self.stdout.write(self.style.SUCCESS(
                f"\n{len(created)} demande(s) en attente. Un DEUXIÈME compte doit "
                "les approuver dans /admin/ (ConfigChangeRequest → cocher → "
                "\"Approuver et appliquer\")."
            ))
