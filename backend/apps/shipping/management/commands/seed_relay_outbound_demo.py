# -*- coding: utf-8 -*-
"""
Jeu de démonstration pour l'écran « À faire partir » du portail point relais.

─────────────────────────────────────────────────────────────────────────────
POURQUOI UNE COMMANDE PLUTÔT QUE DES DONNÉES EN DUR DANS LE FRONT

L'écran lit trois sources : les colis du relais, les tournées qui le
desservent, et les sorties déjà enregistrées. Brancher un faux tableau dans
le composant aurait montré la maquette sans rien prouver — le jour du
branchement réel, chaque écart entre la forme attendue et la forme servie
serait réapparu d'un coup.

Ici, les lignes traversent les vrais modèles et la vraie API. Ce que l'écran
affiche est donc ce qu'il affichera en production, aux valeurs près.

─────────────────────────────────────────────────────────────────────────────
CE QUE LA COMMANDE COUVRE

Les trois onglets, d'un seul passage :

  « À remettre »  trois colis en attente de sortie, un par motif réellement
                  représentable : renvoi (garde dépassée), retour, refus.
  « Collectes »   trois passages à venir, dont un non revendiqué, pour voir
                  aussi le cas « entreprise à désigner ».
  « Partis »      deux départs de la semaine, à deux heures distinctes, pour
                  vérifier le regroupement par passage.

Idempotente : relancer la commande remet le scénario à plat sans empiler de
doublons.
"""
from datetime import time, timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import DeliveryOrganizationProfile, RelayPointProfile
from apps.orders.models import Order
from apps.shipping.models import RelayParcel, Shipment, Tournee, Zone

# Marqueur porté par tout ce que la commande crée : il permet de tout
# reprendre au passage suivant sans toucher aux données réelles du relais.
MARQUEUR = "[demo-sortie]"


class Command(BaseCommand):
    help = "Peuple l'ecran « A faire partir » du point relais avec un scenario complet."

    def add_arguments(self, parser):
        parser.add_argument(
            "--relay",
            default=None,
            help="Nom d'utilisateur du point relais. Par defaut, l'unique relais approuve.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        relay_point = self._relay_point(options.get("relay"))
        self.stdout.write(f"Point relais : {relay_point.name} ({relay_point.user.username})")

        self._purger(relay_point)

        zone = self._zone()
        wink = self._organisation("demo_wink", "Wink Express", "+237650900001")
        taty = self._organisation("demo_taty", "Taty's", "+237650900002")

        client = self._utilisateur("demo_sortie_client", "DemoSortie2026!")
        maintenant = timezone.now()
        aujourdhui = timezone.localdate()

        # ── Onglet « Collectes » ────────────────────────────────────────────
        # Trois passages : cet apres-midi, puis les deux creneaux de J+3. Le
        # dernier reste non revendique pour montrer le cas sans entreprise.
        passages = [
            (self._tournee(zone, aujourdhui, Tournee.Period.AFTERNOON, wink), 5),
            (self._tournee(zone, aujourdhui + timedelta(days=3), Tournee.Period.MORNING, taty), 8),
            (self._tournee(zone, aujourdhui + timedelta(days=3), Tournee.Period.AFTERNOON, None), 4),
        ]
        for tournee, attendus in passages:
            for _ in range(attendus):
                self._colis(client, relay_point, RelayParcel.Status.EXPECTED, tournee=tournee)

        # ── Onglet « A remettre » ───────────────────────────────────────────
        # Un colis par motif que le serveur sait reellement representer. Le
        # « transfert » de la maquette n'a pas d'equivalent : aucun champ ne
        # porte un relais de destination, il reste donc absent.
        self._colis(
            client, relay_point, RelayParcel.Status.RETURN_REQUESTED,
            # Garde depassee (recu il y a plus de GARDE_DEADLINE_DAYS = 7
            # jours) : c'est ce qui fait basculer le motif en « renvoi ».
            received_at=maintenant - timedelta(days=9), slot_code="A-01",
        )
        self._colis(
            client, relay_point, RelayParcel.Status.RETURN_REQUESTED,
            received_at=maintenant - timedelta(days=2), slot_code="R-01",
        )
        self._colis(
            client, relay_point, RelayParcel.Status.REFUSED,
            received_at=maintenant - timedelta(days=1), slot_code="A-11",
        )

        # ── Onglet « Partis » ───────────────────────────────────────────────
        # Deux passages distincts de la semaine. Les colis d'un meme passage
        # partagent l'heure : c'est ce qui les regroupe a l'ecran.
        depart_recent = maintenant - timedelta(days=2)
        for slot in ("A-04", "B-02"):
            self._colis(
                client, relay_point, RelayParcel.Status.RETURNED_TO_VENDOR,
                received_at=maintenant - timedelta(days=11),
                returned_at=depart_recent, slot_code=slot,
            )
        self._colis(
            client, relay_point, RelayParcel.Status.RETURNED_TO_VENDOR,
            received_at=maintenant - timedelta(days=12),
            returned_at=maintenant - timedelta(days=3), slot_code="A-07",
        )

        self.stdout.write(self.style.SUCCESS(
            "Scenario pose : 17 colis attendus sur 3 passages, 3 a remettre, 3 partis cette semaine."
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
        """
        Reprend le scenario precedent.

        On ne supprime que ce que la commande a cree — reconnaissable au
        marqueur dans l'adresse de la commande. Les colis reels du relais ne
        sont jamais touches.
        """
        colis = RelayParcel.objects.filter(
            relay_point=relay_point, shipment__order__address__startswith=MARQUEUR,
        )
        commandes = Order.objects.filter(id__in=[c.shipment.order_id for c in colis])
        nombre = colis.count()
        colis.delete()
        Shipment.objects.filter(order__in=commandes).delete()
        Tournee.objects.filter(zone__name=f"{MARQUEUR} Zone demo").delete()
        commandes.delete()
        if nombre:
            self.stdout.write(f"Scenario precedent retire ({nombre} colis).")

    def _utilisateur(self, username, password):
        user, cree = User.objects.get_or_create(username=username)
        if cree:
            user.set_password(password)
            user.save(update_fields=["password"])
        return user

    def _organisation(self, username, company_name, phone):
        user = self._utilisateur(username, "DemoSortie2026!")
        organisation, _ = DeliveryOrganizationProfile.objects.update_or_create(
            user=user,
            defaults={
                "company_name": company_name,
                "phone": phone,
                "city": "Yaounde",
                "zones": ["Demo sortie"],
                "status": DeliveryOrganizationProfile.Status.APPROVED,
            },
        )
        return organisation

    def _zone(self):
        zone, _ = Zone.objects.update_or_create(
            name=f"{MARQUEUR} Zone demo",
            defaults={
                "city": "Yaounde",
                "tier": Zone.Tier.STANDARD,
                # Creneaux explicites : sans eux l'ecran afficherait les bornes
                # par defaut (8 h - 13 h / 13 h - 18 h), ce qui marche aussi,
                # mais des horaires poses montrent que la zone les pilote.
                "morning_slot_start": time(8, 0),
                "morning_slot_end": time(12, 0),
                "afternoon_slot_start": time(14, 0),
                "afternoon_slot_end": time(18, 0),
            },
        )
        return zone

    def _tournee(self, zone, slot_date, period, organisation):
        return Tournee.objects.create(
            zone=zone,
            slot_date=slot_date,
            period=period,
            status=Tournee.Status.PUBLISHED if organisation else Tournee.Status.COMPOSED,
            claimed_by_organization=organisation,
            claimed_at=timezone.now() if organisation else None,
        )

    def _colis(self, client, relay_point, status, tournee=None, received_at=None,
               returned_at=None, slot_code=""):
        order = Order.objects.create(
            user=client,
            customer_email="demo.sortie@belivay.test",
            customer_phone="+237650900009",
            city="YAOUNDE",
            # Le marqueur vit ici : c'est le seul champ libre que la purge
            # peut interroger sans joindre quatre tables.
            address=f"{MARQUEUR} Mvan, Yaounde",
            subtotal_xaf=12000,
            delivery_fee_xaf=1500,
            total_xaf=13500,
        )
        shipment = Shipment.objects.create(
            order=order,
            status=Shipment.Status.IN_TRANSIT,
            tournee=tournee,
        )
        return RelayParcel.objects.create(
            shipment=shipment,
            relay_point=relay_point,
            status=status,
            slot_code=slot_code,
            received_at=received_at,
            returned_at=returned_at,
            pickup_code="",
        )
