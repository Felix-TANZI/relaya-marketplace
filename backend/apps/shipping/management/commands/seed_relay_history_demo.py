# -*- coding: utf-8 -*-
"""
Jeu de démonstration pour l'écran « Historique » du point relais.

─────────────────────────────────────────────────────────────────────────────
TROIS LIVRAISONS, SEPT FAITS

L'écran ne liste pas des colis : il liste des OPÉRATIONS. Un même colis reçu
puis remis a produit deux faits, à deux heures différentes, et c'est sur ces
deux moments que le gérant le retrouvera.

Trois livraisons suffisent donc à peupler une ligne de temps crédible :

  BV-a   reçu avant-hier, remis ce matin        -> réception + remise
  BV-b   reçu avant-hier, remis ce matin        -> réception + remise
  BV-c   reçu ce matin, encore en rayon         -> réception
  BV-d   non retiré, renvoyé au vendeur hier    -> réception + départ

Les retours déposés et les constats viennent de `seed_relay_counter_demo` :
les deux commandes se complètent sans se marcher dessus.

Idempotente, et limitée au relais visé.
"""
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import RelayPointProfile
from apps.orders.models import Order
from apps.shipping.models import RelayParcel, Shipment

MARQUEUR = "[demo-historique]"


class Command(BaseCommand):
    help = "Peuple l'ecran « Historique » du point relais avec trois livraisons."

    def add_arguments(self, parser):
        parser.add_argument("--relay", default=None, help="Nom d'utilisateur du point relais.")

    @transaction.atomic
    def handle(self, *args, **options):
        relay_point = self._relay_point(options.get("relay"))
        self.stdout.write(f"Point relais : {relay_point.name} ({relay_point.user.username})")

        self._purger(relay_point)

        client = self._utilisateur("demo_histo_client")
        maintenant = timezone.localtime(timezone.now())

        def a(jours, heures, minutes):
            """Un instant posé sur une date précise, pas un décalage flottant."""
            return (maintenant - timedelta(days=jours)).replace(
                hour=heures, minute=minutes, second=0, microsecond=0,
            )

        livraisons = [
            # (emplacement, taille, reception, remise, depart, tiers)
            ("B-04", "STANDARD", a(2, 15, 20), a(0, 9, 42), None, ""),
            ("A-11", "SMALL", a(2, 11, 5), a(0, 9, 10), None, "Nadege Mballa"),
            ("A-01", "LARGE", a(0, 8, 31), None, None, ""),
            ("C-02", "BULKY", a(9, 10, 15), None, a(1, 16, 2), ""),
        ]

        for slot, taille, recu, remis, parti, tiers in livraisons:
            self._colis(client, relay_point, slot, taille, recu, remis, parti, tiers)

        self.stdout.write(self.style.SUCCESS(
            "Scenario pose : 4 receptions, 2 remises, 1 depart — 7 faits sur la ligne de temps."
        ))

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
        """Ne reprend que ce que CETTE commande a pose, et pour CE relais."""
        commandes = Order.objects.filter(
            address__startswith=MARQUEUR,
            shipments__relay_parcel__relay_point=relay_point,
        ).distinct()
        nombre = commandes.count()
        commandes.delete()
        if nombre:
            self.stdout.write(f"Scenario precedent retire ({nombre} commandes).")

    def _utilisateur(self, username):
        user, cree = User.objects.get_or_create(username=username)
        if cree:
            user.set_password("DemoHisto2026!")
            user.save(update_fields=["password"])
        return user

    def _colis(self, client, relay_point, slot, taille, recu, remis, parti, tiers):
        order = Order.objects.create(
            user=client,
            customer_email="demo.histo@belivay.test",
            customer_phone="+237650960001",
            city="YAOUNDE",
            address=f"{MARQUEUR} Mvan, Yaounde",
            subtotal_xaf=11000,
            delivery_fee_xaf=1500,
            total_xaf=12500,
        )
        shipment = Shipment.objects.create(
            order=order,
            status=Shipment.Status.DELIVERED if remis else Shipment.Status.IN_TRANSIT,
            parcel_size=taille,
        )

        if remis:
            statut = RelayParcel.Status.PICKED_UP
        elif parti:
            statut = RelayParcel.Status.RETURNED_TO_VENDOR
        else:
            statut = RelayParcel.Status.STORED

        return RelayParcel.objects.create(
            shipment=shipment,
            relay_point=relay_point,
            status=statut,
            slot_code=slot,
            received_at=recu,
            picked_up_at=remis,
            returned_at=parti,
            # Le tiers autorise est nomme dans l'historique : c'est LUI qui a
            # emporte le colis, et c'est la premiere question en cas de
            # contestation.
            picked_up_by_name=tiers,
            proof_note="Tout est en ordre · photo" if remis and not tiers else "",
        )
