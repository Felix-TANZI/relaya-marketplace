# -*- coding: utf-8 -*-
"""
Jeu de démonstration pour l'écran « Constats et retours » du point relais.

─────────────────────────────────────────────────────────────────────────────
CE QUE LA COMMANDE POSE

  « Dépôt de retour »  un retour approuvé, en mode dépôt au relais, avec son
                       article : de quoi scanner une étiquette et voir la
                       fiche se remplir pour de vrai.
  « Dossiers »         un litige ouvert — vendeur relancé, délai qui court,
                       pièce demandée au relais — et un litige clos ce mois,
                       résolu sans mise en cause du gérant.

Les lignes traversent les vrais modèles et la vraie API : ce que l'écran
affiche est ce qu'il affichera en production, aux valeurs près.

Idempotente : relancer la commande remet le scénario à plat.
"""
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import RelayPointProfile
from apps.catalog.models import Category, Product
from apps.orders.models import Dispute, DisputeEvidenceRequest, Order, OrderItem, Return
from apps.shipping.models import RelayParcel, Shipment

# Marqueur porté par les commandes créées ici : il permet de tout reprendre
# au passage suivant sans toucher aux données réelles du relais.
MARQUEUR = "[demo-comptoir]"


class Command(BaseCommand):
    help = "Peuple l'ecran « Constats et retours » du point relais."

    def add_arguments(self, parser):
        parser.add_argument("--relay", default=None, help="Nom d'utilisateur du point relais.")

    @transaction.atomic
    def handle(self, *args, **options):
        relay_point = self._relay_point(options.get("relay"))
        self.stdout.write(f"Point relais : {relay_point.name} ({relay_point.user.username})")

        self._purger(relay_point)

        client = self._utilisateur("demo_comptoir_client")
        vendeur = self._utilisateur("demo_comptoir_vendeur")
        support = self._utilisateur("demo_comptoir_support")
        maintenant = timezone.now()

        categorie, _ = Category.objects.get_or_create(
            slug="demo-comptoir", defaults={"name": "Demonstration comptoir"},
        )

        # ── Onglet « Depot de retour » ──────────────────────────────────────
        commande_retour, article_retour = self._dossier(
            client, vendeur, relay_point, categorie,
            titre="Chemise lin ecru - taille L",
            slug="demo-chemise-lin-ecru",
            prix=14500,
            taille="SMALL",
        )
        depot = Return.objects.create(
            order=commande_retour,
            order_item=article_retour,
            requested_by=client,
            vendor=vendeur,
            reason=Return.Reason.NOT_AS_DESCRIBED,
            description="La couleur ne correspond pas a la photo de l'annonce.",
            # APPROVED + RELAY_DROPOFF : les deux conditions que le comptoir
            # verifie. Sans elles, la fiche s'affiche « non deposable ».
            status=Return.Status.APPROVED,
            transport_mode=Return.TransportMode.RELAY_DROPOFF,
        )

        # ── Onglet « Dossiers » : un litige en cours ────────────────────────
        commande_ouvert, article_ouvert = self._dossier(
            client, vendeur, relay_point, categorie,
            titre="Enceinte bluetooth 20 W",
            slug="demo-enceinte-bluetooth",
            prix=23000,
            taille="STANDARD",
        )
        litige = Dispute.objects.create(
            order=commande_ouvert,
            order_item=article_ouvert,
            product=article_ouvert.product,
            vendor=vendeur,
            opened_by=client,
            reason="NOT_AS_DESCRIBED",
            status="OPEN",
            description="Le modele recu n'est pas celui commande.",
            vendor_contacted=True,
            vendor_can_reply=True,
            # Le delai vendeur est un VRAI champ : c'est lui qui alimente
            # l'etape « Vendeur 48 h » de la barre d'avancement.
            vendor_reply_deadline=maintenant + timedelta(hours=38),
        )
        DisputeEvidenceRequest.objects.create(
            dispute=litige,
            recipient_role=DisputeEvidenceRequest.RecipientRole.RELAY_POINT,
            requested_from=relay_point.user,
            requested_by=support,
            evidence_types=["PHOTO"],
            instructions="BelivaY demande une photo de l'etiquette. Ajoutez-la depuis la Messagerie.",
            due_at=maintenant + timedelta(hours=38),
            status=DisputeEvidenceRequest.Status.PENDING,
        )

        # ── Onglet « Dossiers » : un litige clos ce mois ────────────────────
        commande_clos, article_clos = self._dossier(
            client, vendeur, relay_point, categorie,
            titre="Lampe de bureau articulee",
            slug="demo-lampe-bureau",
            prix=8900,
            taille="SMALL",
        )
        Dispute.objects.create(
            order=commande_clos,
            order_item=article_clos,
            product=article_clos.product,
            vendor=vendeur,
            opened_by=client,
            reason="DAMAGED",
            status="RESOLVED",
            description="Abat-jour fendu a l'ouverture.",
            vendor_contacted=True,
            vendor_replied=True,
            vendor_replied_at=maintenant - timedelta(days=6),
            resolution="EXCHANGE",
            resolution_note="Remplacement accepte par le vendeur. Le point relais n'est pas mis en cause.",
            resolved_by=support,
            resolved_at=maintenant - timedelta(days=5),
        )

        self.stdout.write(self.style.SUCCESS(
            f"Scenario pose : retour RT-{depot.id} deposable, "
            f"1 dossier ouvert (LIT-{litige.id:05d}), 1 dossier clos ce mois."
        ))
        self.stdout.write(f"Reference a saisir au comptoir : RT-{depot.id}")

    # ── Fabriques ───────────────────────────────────────────────────────────

    def _relay_point(self, username):
        qs = RelayPointProfile.objects.filter(
            status=RelayPointProfile.Status.APPROVED, is_active=True,
        )
        if username:
            relay_point = qs.filter(user__username=username).first()
            if not relay_point:
                raise CommandError(f"Aucun point relais approuve pour « {username} ».")
            return relay_point
        if qs.count() != 1:
            raise CommandError(
                f"{qs.count()} points relais approuves : precisez lequel avec --relay <utilisateur>."
            )
        return qs.first()

    def _purger(self, relay_point):
        """
        Reprend le scenario precedent, POUR CE RELAIS SEULEMENT.

        Le marqueur seul ne suffit pas : sur une base a plusieurs relais, il
        ferait disparaitre la demonstration des autres. On exige donc en plus
        que la commande ait un colis chez nous.
        """
        commandes = Order.objects.filter(
            address__startswith=MARQUEUR,
            shipments__relay_parcel__relay_point=relay_point,
        ).distinct()
        nombre = commandes.count()
        # Les litiges, retours et colis tombent en cascade avec la commande.
        commandes.delete()
        if nombre:
            self.stdout.write(f"Scenario precedent retire ({nombre} commandes).")

    def _utilisateur(self, username):
        user, cree = User.objects.get_or_create(username=username)
        if cree:
            user.set_password("DemoComptoir2026!")
            user.save(update_fields=["password"])
        return user

    def _dossier(self, client, vendeur, relay_point, categorie, *, titre, slug, prix, taille):
        """
        Une commande complete : produit, ligne, colis, et son RelayParcel.

        Le `RelayParcel` n'est pas decoratif : la liste des litiges du relais
        filtre sur `order__shipments__relay_parcel__relay_point`. Sans lui, le
        dossier existe mais reste invisible au comptoir.
        """
        produit, _ = Product.objects.get_or_create(
            slug=slug,
            defaults={"title": titre, "price_xaf": prix, "category": categorie, "vendor": vendeur},
        )
        order = Order.objects.create(
            user=client,
            customer_email="demo.comptoir@belivay.test",
            customer_phone="+237650950001",
            city="YAOUNDE",
            address=f"{MARQUEUR} Mvan, Yaounde",
            subtotal_xaf=prix,
            delivery_fee_xaf=1500,
            total_xaf=prix + 1500,
        )
        item = OrderItem.objects.create(
            order=order,
            product=produit,
            title_snapshot=titre,
            price_xaf_snapshot=prix,
            qty=1,
            line_total_xaf=prix,
        )
        shipment = Shipment.objects.create(
            order=order,
            vendor=vendeur,
            status=Shipment.Status.DELIVERED,
            parcel_size=taille,
        )
        # STORED, et non PICKED_UP : passer un colis en « retire » declenche
        # `_remunerer_relais`, qui ecrit au grand livre et exige tout le plan
        # comptable. Un jeu de demonstration ne doit pas poser d'ecritures
        # comptables pour afficher un ecran. Le filtre des litiges se
        # contente du lien colis -> relais, quel que soit le statut.
        RelayParcel.objects.create(
            shipment=shipment,
            relay_point=relay_point,
            status=RelayParcel.Status.STORED,
            received_at=timezone.now() - timedelta(days=8),
        )
        return order, item
