# -*- coding: utf-8 -*-
"""
Jeu de démonstration pour l'écran « Rapports » du point relais.

─────────────────────────────────────────────────────────────────────────────
POURQUOI CETTE COMMANDE EXISTE

L'écran lit l'argent des RÈGLEMENTS (`SettlementBatch`), et non d'un calcul
refait à partir de la grille tarifaire. C'est volontaire : le règlement est
ce que le gérant retrouve sur son relevé, et un calcul maison finirait par
en diverger.

Mais un règlement naît d'une chaîne complète — commande payée, séquestre
libéré, cycle arrêté — qu'un portail de démonstration ne déroule pas. Sur
une base de développement, la liste est donc vide, et l'écran affiche 0 F
sans qu'aucun code soit en cause.

Cette commande pose directement les lots hebdomadaires, pour que le
diagramme ait des colonnes.

─────────────────────────────────────────────────────────────────────────────
CE QU'ELLE NE FAIT PAS

Elle n'écrit RIEN au grand livre. Les lots posés ici n'ont ni séquestre
couvert, ni écriture comptable : ils servent à juger un écran, pas à
équilibrer des comptes. Ne pas l'utiliser sur une base qui porte de vrais
paiements — le garde-fou ci-dessous le refuse.

Idempotente.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import RelayPointProfile
from apps.payments.api.permissions import partner_payee_for_user
from apps.payments.settlements.models import SettlementBatch

# Préfixe des références posées ici : c'est par lui que la purge les retrouve.
PREFIXE = "DEMO-RLY-"

# Montants hebdomadaires, du plus ancien au plus récent. Volontairement
# irréguliers : une courbe trop lisse ne montre pas si l'écran tient les
# écarts.
SEMAINES = [13_700, 11_300, 8_400, 11_600]


class Command(BaseCommand):
    help = "Pose des reglements hebdomadaires pour l'ecran Rapports."

    def add_arguments(self, parser):
        parser.add_argument("--relay", default=None, help="Nom d'utilisateur du point relais.")
        parser.add_argument("--purge", action="store_true", help="Retire le scenario sans le reposer.")

    @transaction.atomic
    def handle(self, *args, **options):
        self._garde_fou()

        relay_point = self._relay_point(options.get("relay"))
        self.stdout.write(f"Point relais : {relay_point.name} ({relay_point.user.username})")

        # `PayeeAccount` ne pointe pas un utilisateur directement : il passe
        # par un lien generique. On reutilise donc le resolveur de l'API,
        # plutot que de redeviner la jointure ici.
        compte = partner_payee_for_user(relay_point.user)
        if compte is None:
            raise CommandError(
                "Ce point relais n'a pas de compte beneficiaire. "
                "Remettez-lui un colis pour que la remuneration le cree."
            )

        retires = SettlementBatch.objects.filter(
            payee=compte, reference__startswith=PREFIXE,
        ).delete()[0]
        if retires:
            self.stdout.write(f"Scenario precedent retire ({retires} lots).")
        if options["purge"]:
            return

        maintenant = timezone.localtime(timezone.now())

        # Les quatre semaines se terminent AUJOURD'HUI et remontent dans le
        # temps.
        #
        # Ancrer sur le 1er du mois paraissait plus naturel, mais le 2 du
        # mois il ne reste qu'une semaine : le diagramme n'aurait qu'une
        # colonne, et on ne pourrait pas juger l'ecran. En remontant depuis
        # aujourd'hui, les quatre colonnes existent toujours — « Ce mois »
        # n'en montre que la part qui tombe dans le mois, ce qui est exact.
        base = maintenant.replace(hour=0, minute=0, second=0, microsecond=0)
        premier_depart = base - timedelta(days=7 * (len(SEMAINES) - 1))

        poses = 0
        for rang, montant in enumerate(SEMAINES):
            depart = premier_depart + timedelta(days=rang * 7)
            # La derniere semaine s'arrete aujourd'hui : c'est la semaine en
            # cours, et pretendre qu'elle est close serait faux.
            fin = min(depart + timedelta(days=6), maintenant)

            SettlementBatch.objects.create(
                reference=f"{PREFIXE}{depart:%Y%m%d}",
                payee=compte,
                cycle_key="cycle-weekly-friday",
                period_start=depart,
                period_end=fin,
                gross_amount_xaf=montant,
                adjustments_xaf=0,
                net_amount_xaf=montant,
                currency="XAF",
                status=SettlementBatch.Status.PAID,
            )
            poses += 1

        total = sum(SEMAINES[:poses])
        self.stdout.write(self.style.SUCCESS(
            f"Scenario pose : {poses} reglements hebdomadaires, {total:,} XAF ce mois.".replace(",", " ")
        ))

    # ── Garde-fous ──────────────────────────────────────────────────────────

    def _garde_fou(self):
        """
        Refuse de tourner si de vrais lots existent deja.

        Meme esprit que `payments_seed_demo` : un jeu de test ne doit jamais
        se melanger a de l'argent reel. La presence d'un seul lot hors
        demonstration suffit a arreter la commande.
        """
        reels = SettlementBatch.objects.exclude(reference__startswith=PREFIXE).exists()
        if reels:
            raise CommandError(
                "Des reglements reels existent sur cette base : commande refusee. "
                "Elle est reservee aux bases de developpement."
            )

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
