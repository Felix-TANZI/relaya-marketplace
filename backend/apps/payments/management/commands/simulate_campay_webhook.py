# backend/apps/payments/management/commands/simulate_campay_webhook.py
# Simule la reception d'un webhook CamPay, en local.
#
#   python manage.py simulate_campay_webhook --reference <ref-campay>
#   python manage.py simulate_campay_webhook --reference <ref> --status FAILED
#   python manage.py simulate_campay_webhook --reference <ref> --method POST
#
# COUCHE 3 de la strategie de test : valide le RECEPTEUR sans tunnel ni
# acces entrant. CamPay ne pouvant pas atteindre localhost, cette commande
# construit une requete identique a celle qu'il enverrait et la remet
# directement au recepteur.
#
# ELLE NE CONTOURNE AUCUNE COUCHE DE DEFENSE. La re-interrogation est bien
# effectuee : si la reference n'existe pas chez le prestataire, le traitement
# echoue exactement comme il le ferait en production.
#
# C'est meme la demonstration la plus parlante du principe P6 : on peut
# annoncer SUCCESSFUL dans le message, si le prestataire dit autre chose,
# c'est lui qui gagne.

from django.core.management.base import BaseCommand
from django.test import RequestFactory

from apps.payments.webhooks.receiver import handle


class Command(BaseCommand):
    help = "Simule un webhook CamPay (test local, sans tunnel)."

    def add_arguments(self, parser):
        parser.add_argument("--reference", type=str, required=True,
                            help="Reference CamPay de la transaction.")
        parser.add_argument("--status", type=str, default="SUCCESSFUL",
                            choices=["SUCCESSFUL", "FAILED", "PENDING"],
                            help="Statut ANNONCE par le message. Ne decide de rien.")
        parser.add_argument("--external-reference", type=str, default="")
        parser.add_argument("--amount", type=str, default="0")
        parser.add_argument("--operator", type=str, default="MTN")
        parser.add_argument("--endpoint", type=str, default="collect",
                            choices=["collect", "withdraw"])
        parser.add_argument("--signature", type=str, default="",
                            help="JWT a placer dans le champ signature.")
        parser.add_argument("--method", type=str, default="GET",
                            choices=["GET", "POST"])
        parser.add_argument("--ip", type=str, default="127.0.0.1")

    def handle(self, *args, **options):
        champs = {
            "reference": options["reference"],
            "status": options["status"],
            "amount": options["amount"],
            "currency": "XAF",
            "operator": options["operator"],
            "code": "",
            "operator_reference": "",
            "endpoint": options["endpoint"],
            "signature": options["signature"],
            "external_reference": options["external_reference"] or "None",
            "external_user": "None",
            "reason": "None",
        }

        fabrique = RequestFactory()
        if options["method"] == "GET":
            requete = fabrique.get(
                "/api/payments/webhooks/campay/", data=champs,
                REMOTE_ADDR=options["ip"],
            )
        else:
            requete = fabrique.post(
                "/api/payments/webhooks/campay/", data=champs,
                content_type="application/json", REMOTE_ADDR=options["ip"],
            )

        self.stdout.write(self.style.HTTP_INFO(
            f"Webhook {options['method']} simule — reference {options['reference']}, "
            f"statut ANNONCE {options['status']}\n"
        ))

        evenement = handle(requete, provider_code="CAMPAY")

        couleur = {
            "PROCESSED": self.style.SUCCESS,
            "VERIFIED": self.style.SUCCESS,
            "IGNORED": self.style.WARNING,
        }.get(evenement.status, self.style.ERROR)

        self.stdout.write(couleur(f"Traitement : {evenement.status}"))
        self.stdout.write(f"  Evenement       : {evenement.id}")
        self.stdout.write(f"  Signature       : {evenement.signature_state}")
        self.stdout.write(f"    {evenement.signature_reason}")
        self.stdout.write(f"  Statut ANNONCE  : {evenement.reported_status}")
        self.stdout.write(
            f"  Statut VERIFIE  : {evenement.verified_status or '(non verifie)'}"
        )
        if evenement.processing_note:
            self.stdout.write(f"  Note            : {evenement.processing_note}")
        if evenement.processing_error:
            self.stdout.write(self.style.ERROR(
                f"  Erreur          : {evenement.processing_error}"
            ))

        self.stdout.write(self.style.HTTP_INFO(
            "\nLe statut ANNONCE n'a servi a rien. Seule la re-interrogation "
            "du prestataire decide (principe P6)."
        ))