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


ESCROW_DEFAULT_PAYLOAD = {
    "name": "Politique par défaut",
    "auto_confirm_hours": 96,
    "release_delay_hours": 72,
    "dispute_window_days": 4,
    "vendor_reply_hours": 72,
    "priority": 0,
}
ESCROW_JUSTIFICATION = (
    "Verrouille par Addendum Decisions v1.0 §3.1 (auto-confirmation 96h depuis "
    "la remise, liberation 72h depuis la confirmation) et §4.4 (fenetre de "
    "litige 4 jours, calee sur l'auto-confirmation). Aucune ligne EscrowPolicy "
    "n'existait en base : le systeme tournait sur les seuls defauts Python."
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
]


class Command(BaseCommand):
    help = (
        "Cree les ConfigChangeRequest (statut PENDING) pour verrouiller EscrowPolicy "
        "et les DistributionRule GOODS/TRANSPORT/RELAY_HANDLING. N'approuve rien : "
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

        _request("EscrowPolicy", "escrow-default", ESCROW_DEFAULT_PAYLOAD, ESCROW_JUSTIFICATION)
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
