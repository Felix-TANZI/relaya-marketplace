"""
Remplit une base de DÉMONSTRATION — DEV-SRV-01, T01 :
« Rassembler toutes les données fictives actuelles dans un script exécuté à la main, le remettre à JUNIOR pour la
vitrine, et supprimer tout chargement automatique de données au déploiement. »

    DONNEES_DEMO_AUTORISEES=1 python manage.py charger_demonstration

Uniquement sur la base de la vitrine (api-demo), jamais sur le site réel (règle R4) : sans DONNEES_DEMO_AUTORISEES=1,
la commande refuse avant toute écriture, comme chacun des jeux qu'elle enchaîne (tâche D31).

Ordre : les données de référence d'abord (charger_reference, idempotente), puis les jeux de démonstration existants.
Aucun n'est lancé au déploiement : ni Dockerfile, ni docker-compose, ni deploy.sh, ni migration n'en appelle
(test apps/common/test_donnees.py). `seed_relay_fresh_demo` (qui VIDE un relais) et `import_client_mock_products`
(qui demande une boutique cible) restent à lancer à part.
"""

from django.core.management import call_command
from django.core.management.base import BaseCommand

from apps.common.demonstration import exiger_demonstration_autorisee

#: (commande, ce qu'elle crée) — les relais et le vendeur de démonstration d'abord, leurs scénarios ensuite.
JEUX = (
    ("seed_seller_demo", "vendeur de démonstration et son catalogue"),
    ("seed_recommendation_demo", "boutiques et produits des recommandations"),
    ("seed_catalog", "catalogue d'exemple"),
    ("seed_relay_demo", "point relais, acheteur et livreur de démonstration"),
    ("seed_relay_counter_demo", "constats et retours au relais"),
    ("seed_relay_history_demo", "historique du relais"),
    ("seed_relay_notifications_demo", "notifications du relais"),
    ("seed_relay_outbound_demo", "colis à faire partir du relais"),
    ("seed_relay_reports_demo", "règlements hebdomadaires du relais"),
    ("seed_evidence_demo", "litige avec preuves"),
    ("seed_maps_workflow_demo", "livraison suivie sur la carte"),
    ("payments_seed_demo", "commandes, paiements et versements sur 30 jours"),
)


class Command(BaseCommand):
    help = "Données de référence + tous les jeux de démonstration, pour la vitrine (DEV-SRV-01, T01)."

    def handle(self, *args, **options):
        exiger_demonstration_autorisee()
        call_command("charger_reference", stdout=self.stdout, stderr=self.stderr)
        for commande, libelle in JEUX:
            self.stdout.write(self.style.HTTP_INFO(f"\n── Démonstration : {libelle} ({commande})"))
            call_command(commande, stdout=self.stdout, stderr=self.stderr)
        self.stdout.write(self.style.SUCCESS(
            "\nBase de démonstration prête. `python manage.py donnees_demo` liste les comptes créés."))
