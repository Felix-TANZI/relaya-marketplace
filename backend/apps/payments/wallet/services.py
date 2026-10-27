# backend/apps/payments/wallet/services.py
# Le Wallet du client — feuille de route D16 ; spec v2.1 :
#
#   R03.1  r_wallet_ouvert faux au lancement (verification juridique, monnaie electronique CEMAC)
#   R03.2  ferme : aucune recharge, aucun paiement, aucun remboursement par le Wallet
#   R03.3  recharge gratuite pour le client (BelivaY paie les frais CamPay), paiement par le Wallet sans frais
#   R03.4  retrait >= r_retrait_wallet_min ; frais = ceil(montant x r_retrait_wallet), payes par le client ;
#          seulement vers le numero Mobile Money qui a recharge
#   R03.5  paiement de plus de r_wallet_code_des : code a 4 chiffres ; solde jamais au-dela de r_wallet_plafond
#          (securite avant main 2 : r_wallet_code_essais codes faux bloquent r_wallet_code_blocage_h heures ;
#          reinitialisation par un code envoye au numero verifie)
#   R03.6  un geste commercial ne se retire jamais ; une commande payee par le Wallet est remboursee sur le Wallet
#
# Ecritures au grand livre (compte 2050, dette envers les clients) :
#   recharge      DEBIT tresorerie PSP (net) + DEBIT 5010 frais CamPay   CREDIT 2050
#   paiement      DEBIT 2050                                             CREDIT 2010 sequestre + produits
#   remboursement DEBIT 2010                                             CREDIT 2050
#   geste         DEBIT 5030 gestes commerciaux                          CREDIT 2050
#   retrait       DEBIT 2050                                             CREDIT tresorerie PSP + CREDIT 4030 frais

from __future__ import annotations

import logging
import math
import re
import uuid
from datetime import timedelta

from django.db import transaction as db_transaction
from django.utils import timezone

from apps.payments.ledger import chart_of_accounts as coa
from apps.payments.ledger.models import LedgerTransaction
from apps.payments.ledger.posting import credit, debit, post
from apps.regles import services as regles

from .models import GestePortefeuille, MouvementPortefeuille, Portefeuille

logger = logging.getLogger("apps.payments.wallet")

PRESTATAIRE = "WALLET"          # provider_code d'une tentative payee par le Wallet
CLE_RECHARGE = "wallet-topup-"  # prefixe de la cle d'idempotence d'une recharge


class WalletError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code, self.message = code, message


def ouvert() -> bool:
    return bool(regles.reglage("r_wallet_ouvert"))


def _exiger_ouvert() -> None:
    if not ouvert():  # R03.2
        raise WalletError("wallet_ferme", "Le Wallet n'est pas encore ouvert.")


def portefeuille_de(user, *, verrou: bool = False) -> Portefeuille:
    p, _ = Portefeuille.objects.get_or_create(client=user)
    return Portefeuille.objects.select_for_update().get(pk=p.pk) if verrou else p


def _mouvement(p: Portefeuille, sorte, reference, retirable=0, geste=0, **extra) -> MouvementPortefeuille:
    p.solde_retirable_xaf += retirable
    p.solde_geste_xaf += geste
    if p.solde_retirable_xaf < 0 or p.solde_geste_xaf < 0:
        raise WalletError("solde_insuffisant", "Solde du Wallet insuffisant.")
    p.save(update_fields=["solde_retirable_xaf", "solde_geste_xaf", "updated_at"])
    return MouvementPortefeuille.objects.create(portefeuille=p, sorte=sorte, reference=reference,
                                                part_retirable_xaf=retirable, part_geste_xaf=geste, **extra)


def recharges_en_attente(user) -> int:
    """Les recharges lancées mais pas encore confirmées : une fois payées, elles entreront dans le solde."""
    from django.db.models import Q, Sum

    from apps.payments.intents.models import PaymentIntent

    S = PaymentIntent.Status
    return int(PaymentIntent.objects.filter(buyer=user, idempotency_key__startswith=CLE_RECHARGE).filter(
        Q(status=S.PROCESSING) | Q(status__in=[S.DRAFT, S.REQUIRES_ACTION], expires_at__gt=timezone.now()))
        .aggregate(t=Sum("amount_xaf"))["t"] or 0)


def _plafond(p: Portefeuille, montant: int) -> None:
    # R03.5, sécurité avant main 2 : le solde, plus les recharges encore en attente, plus celle-ci.
    if p.solde_xaf + recharges_en_attente(p.client) + montant > regles.reglage("r_wallet_plafond"):
        raise WalletError("wallet_plafond",
                          f"Le solde du Wallet ne peut pas dépasser {regles.reglage('r_wallet_plafond')} F.")


# ── Code a 4 chiffres (R03.5) ────────────────────────────────────────────────────────────────────────────

def controler_code(user, code: str, *, motif: str = "") -> None:
    """Verifie le code et compte les erreurs dans sa propre transaction : l'erreur levee ensuite ne l'annule pas.
    Quatre chiffres se trouvent en quelques milliers d'essais ; seul le serveur peut compter."""
    erreur = None
    with db_transaction.atomic():
        p = portefeuille_de(user, verrou=True)
        maintenant = timezone.now()
        if p.code_bloque_jusqua and p.code_bloque_jusqua > maintenant:
            erreur = WalletError("code_bloque", "Trop de codes faux : le code du Wallet est bloqué jusqu'au "
                                 f"{timezone.localtime(p.code_bloque_jusqua):%d/%m à %H:%M}. "
                                 "Vous pouvez le réinitialiser par un code reçu par SMS.")
        elif p.code_valide(code):
            if p.code_echecs or p.code_bloque_jusqua:
                p.code_echecs, p.code_bloque_jusqua = 0, None
                p.save(update_fields=["code_echecs", "code_bloque_jusqua", "updated_at"])
        elif not code:
            erreur = WalletError("code_requis", motif or "Le code du Wallet est demandé.")
        else:
            p.code_echecs += 1
            restants = regles.reglage("r_wallet_code_essais") - p.code_echecs
            if restants <= 0:
                p.code_echecs = 0
                p.code_bloque_jusqua = maintenant + timedelta(hours=regles.reglage("r_wallet_code_blocage_h"))
                erreur = WalletError("code_bloque", "Code faux. Le code du Wallet est bloqué "
                                     f"{regles.reglage('r_wallet_code_blocage_h')} h ; "
                                     "vous pouvez le réinitialiser par un code reçu par SMS.")
            else:
                erreur = WalletError("code_faux", f"Code faux. Encore {restants} essai(s).")
            p.save(update_fields=["code_echecs", "code_bloque_jusqua", "updated_at"])
    if erreur is not None:
        raise erreur


def definir_code(user, code: str, ancien: str = "") -> None:
    if not re.fullmatch(r"\d{4}", code or ""):
        raise WalletError("code_format", "Le code du Wallet compte 4 chiffres.")
    if portefeuille_de(user).code_hash:
        controler_code(user, ancien, motif="L'ancien code est demandé.")
    p = portefeuille_de(user, verrou=True)
    p.definir_code(code)
    p.save(update_fields=["code_hash", "updated_at"])


def demander_reinitialisation(user) -> dict:
    """Code oublie ou bloque : un code part au numero verifie du compte, jamais a un numero saisi."""
    from apps.payments.bridge import codes

    numero = codes.numero_verifie(user)
    if not numero:
        raise WalletError("numero_non_verifie", "Vérifiez d'abord votre numéro pour réinitialiser le code du Wallet.")
    return codes.envoyer_code(user, numero)


def reinitialiser_code(user, *, code_sms: str, nouveau: str) -> dict:
    """Le code recu par SMS remplace l'ancien code du Wallet et leve le blocage."""
    from apps.payments.bridge import codes

    if not re.fullmatch(r"\d{4}", nouveau or ""):
        raise WalletError("code_format", "Le code du Wallet compte 4 chiffres.")
    numero = codes.numero_verifie(user)
    if not numero:
        raise WalletError("numero_non_verifie", "Vérifiez d'abord votre numéro pour réinitialiser le code du Wallet.")
    resultat = codes.verifier_code(user, numero, str(code_sms or "").strip())
    if not resultat.get("ok"):
        return resultat
    with db_transaction.atomic():
        p = portefeuille_de(user, verrou=True)
        p.definir_code(nouveau)
        p.code_echecs, p.code_bloque_jusqua = 0, None
        p.save(update_fields=["code_hash", "code_echecs", "code_bloque_jusqua", "updated_at"])
    return resultat


# ── Recharge (R03.3) ─────────────────────────────────────────────────────────────────────────────────────

@db_transaction.atomic
def preparer_recharge(user, *, montant: int, msisdn: str, operator: str, cle: str = ""):
    """L'intention de recharge : tout le montant va au Wallet, les frais CamPay sont a la charge de BelivaY."""
    from apps.payments.application.collect import _config_snapshot
    from apps.payments.domain.money import Money
    from apps.payments.intents.models import PaymentIntent

    _exiger_ouvert()
    montant = int(montant)
    if montant <= 0:
        raise WalletError("montant", "Montant de recharge invalide.")
    cle = f"{CLE_RECHARGE}{cle or uuid.uuid4()}"
    existante = PaymentIntent.objects.filter(idempotency_key=cle, buyer=user).first()
    if existante is not None:
        return existante
    _plafond(portefeuille_de(user, verrou=True), montant)  # verrou : deux recharges simultanées attendent leur tour
    intent = PaymentIntent(
        idempotency_key=cle, buyer=user, amount_xaf=montant, currency="XAF",
        distribution_plan={"total_distributed": montant, "currency": "XAF", "platform_revenue": 0,
                           "unresolved_rules": [], "needs_reallocation": False, "psp_cost": 0, "holds": [],
                           "wallet": montant},
        correlation_id=str(uuid.uuid4()), expires_at=timezone.now() + timedelta(minutes=30),
    )
    intent.set_payer(msisdn, operator)
    intent.config_snapshot = _config_snapshot(Money(montant), operator)
    intent.save()
    return intent


def crediter_recharge(intent) -> MouvementPortefeuille:
    """Appelee par confirm_payment, dans sa transaction, apres l'ecriture CREDIT 2050."""
    p = portefeuille_de(intent.buyer, verrou=True)
    reference = f"recharge-{intent.reference}"
    deja = MouvementPortefeuille.objects.filter(reference=reference).first()
    if deja is not None:
        return deja
    if p.solde_xaf + intent.amount_xaf > regles.reglage("r_wallet_plafond"):
        # L'argent est encaisse : on le credite, et l'equipe tranche (jamais de perte pour le client).
        logger.error("Recharge %s : le solde depasse r_wallet_plafond (R03.5).", intent.reference)
    return _mouvement(p, MouvementPortefeuille.Sorte.RECHARGE, reference, retirable=intent.amount_xaf,
                      intent_reference=intent.reference, libelle="Recharge par Mobile Money")


# ── Paiement d'une commande (R02.5, R03.3, R03.5) ────────────────────────────────────────────────────────

def payer(intent, *, user, code: str = ""):
    """Paie l'intention d'une commande avec le Wallet, sans frais ; les gestes servent en premier.
    Le code (R03.5) est controle avant la transaction du paiement, pour que ses erreurs restent comptees."""
    _exiger_ouvert()
    if intent.amount_xaf > regles.reglage("r_wallet_code_des"):  # R03.5
        controler_code(user, code, motif=f"Au-delà de {regles.reglage('r_wallet_code_des')} F, "
                                         "le code du Wallet est demandé.")
    return _payer(intent, user=user)


@db_transaction.atomic
def _payer(intent, *, user):
    from apps.payments.application.collect import confirm_payment
    from apps.payments.intents.models import PaymentAttempt, PaymentIntent

    _exiger_ouvert()
    intent = PaymentIntent.objects.select_for_update().get(pk=intent.pk, buyer=user)
    if intent.status == PaymentIntent.Status.SUCCEEDED:
        return intent
    if intent.idempotency_key.startswith(CLE_RECHARGE):
        raise WalletError("intention", "Une recharge ne se paie pas avec le Wallet.")
    if intent.is_final or intent.is_expired:
        raise WalletError("intention", "Ce paiement n'est plus ouvert.")
    p = portefeuille_de(user, verrou=True)
    montant = intent.amount_xaf
    if p.solde_xaf < montant:
        raise WalletError("solde_insuffisant", "Solde du Wallet insuffisant.")
    geste = min(p.solde_geste_xaf, montant)
    _mouvement(p, MouvementPortefeuille.Sorte.PAIEMENT, f"paiement-{intent.reference}",
               retirable=-(montant - geste), geste=-geste, intent_reference=intent.reference,
               libelle="Paiement d'une commande")
    intent.provider_code = PRESTATAIRE
    if intent.status == PaymentIntent.Status.DRAFT:
        intent.transition_to(PaymentIntent.Status.REQUIRES_ACTION, save=False)
    intent.save(update_fields=["provider_code", "status", "updated_at"])
    tentative = PaymentAttempt.objects.create(
        intent=intent, external_reference=f"{intent.reference}-W", provider_code=PRESTATAIRE, amount_xaf=montant,
        payer_msisdn_masked=intent.payer_msisdn_masked, payer_operator=intent.payer_operator,
        request_payload={"amount_xaf": montant, "wallet": True})
    confirm_payment(tentative)
    intent.refresh_from_db()
    return intent


def rembourser(refund) -> None:
    """R03.6 : une commande payee par le Wallet est remboursee sur le Wallet, dans la part d'ou l'argent venait."""
    intent = refund.intent
    p = portefeuille_de(intent.buyer, verrou=True)
    paiement = MouvementPortefeuille.objects.filter(reference=f"paiement-{intent.reference}").first()
    payes = -paiement.montant_xaf if paiement else 0
    part_geste = math.floor(refund.amount_xaf * -paiement.part_geste_xaf / payes) if payes else 0
    _mouvement(p, MouvementPortefeuille.Sorte.REMBOURSEMENT, f"remboursement-{refund.reference}",
               retirable=refund.amount_xaf - part_geste, geste=part_geste, intent_reference=intent.reference,
               libelle="Remboursement sur le Wallet")
    from apps.payments.settlements.services import lignes_de_remboursement

    post(kind=LedgerTransaction.Kind.REFUND,
         lines=[*lignes_de_remboursement(refund),
                credit(coa.WALLET_LIABILITY, refund.amount_xaf, label="Credit du Wallet")],
         description=f"Remboursement {refund.reference} sur le Wallet ({intent.reference}) — R03.6",
         source_type="Refund", source_ref=refund.reference, correlation_id=intent.correlation_id,
         created_by_label="wallet.services.rembourser")


# ── Geste commercial (R03.6) : demande, puis approbation par un autre membre de l'equipe ─────────────────

def _plafond_geste(order_id, montant: int, sauf=None) -> None:
    """R25.1 : les gestes d'une commande (en attente ou credites) ne depassent jamais sa commission_b."""
    from django.db.models import Sum

    from apps.payments.bridge.gestes import commission_de_la_commande

    deja = (GestePortefeuille.objects.filter(order_id=order_id).exclude(statut=GestePortefeuille.Statut.REFUSE)
            .exclude(pk=getattr(sauf, "pk", None)).aggregate(t=Sum("montant_xaf"))["t"] or 0)
    plafond = commission_de_la_commande(order_id)
    if deja + int(montant) > plafond:
        raise WalletError("geste_plafond", f"Un geste ne peut pas dépasser la commission de la commande "
                                           f"({plafond} F, dont {deja} F déjà accordés) — R25.1.")


def demander_geste(user, *, montant: int, motif: str, demande_par, order_id=None) -> GestePortefeuille:
    from apps.payments.bridge.gestes import commande_du_client

    _exiger_ouvert()
    if int(montant) <= 0 or not (motif or "").strip():
        raise WalletError("geste", "Montant et motif obligatoires.")
    if not order_id or not commande_du_client(order_id, user):
        raise WalletError("geste_commande", "Un geste se rattache à une commande de ce client (R25.1).")
    _plafond_geste(order_id, montant)
    return GestePortefeuille.objects.create(client=user, order_id=order_id, montant_xaf=int(montant),
                                            motif=motif.strip()[:200], demande_par=demande_par)


@db_transaction.atomic
def decider_geste(geste: GestePortefeuille, *, par, accepte: bool) -> GestePortefeuille:
    geste = GestePortefeuille.objects.select_for_update().get(pk=geste.pk)
    if geste.statut != GestePortefeuille.Statut.EN_ATTENTE:
        raise WalletError("geste_decide", "Ce geste est déjà décidé.")
    if par.pk == geste.demande_par_id:
        raise WalletError("separation", "Le demandeur ne peut pas approuver son propre geste.")
    geste.decide_par, geste.decide_le = par, timezone.now()
    if not accepte:
        geste.statut = GestePortefeuille.Statut.REFUSE
        geste.save(update_fields=["statut", "decide_par", "decide_le"])
        return geste
    _exiger_ouvert()
    if geste.order_id:
        _plafond_geste(geste.order_id, geste.montant_xaf, sauf=geste)  # R25.1, revu au moment de crediter
    p = portefeuille_de(geste.client, verrou=True)
    _plafond(p, geste.montant_xaf)
    _mouvement(p, MouvementPortefeuille.Sorte.GESTE, f"geste-{geste.pk}", geste=geste.montant_xaf,
               libelle=geste.motif)
    post(kind=LedgerTransaction.Kind.ADJUSTMENT,
         lines=[debit(coa.EXPENSE_COMMERCIAL_GESTURE, geste.montant_xaf, label=f"Geste commercial #{geste.pk}"),
                credit(coa.WALLET_LIABILITY, geste.montant_xaf, label="Credit du Wallet")],
         description=f"Geste commercial #{geste.pk} : {geste.motif} — R03.6",
         source_type="GestePortefeuille", source_ref=str(geste.pk), created_by_label="wallet.services.decider_geste")
    geste.statut = GestePortefeuille.Statut.CREDITE
    geste.save(update_fields=["statut", "decide_par", "decide_le"])
    return geste


# ── Retrait (R03.4) ──────────────────────────────────────────────────────────────────────────────────────

def frais_retrait(montant: int) -> int:
    return math.ceil(int(montant) * regles.reglage("r_retrait_wallet"))


def numeros_de_recharge(user) -> list:
    """Les numeros qui ont recharge ce Wallet, du plus recent au plus ancien (seules destinations d'un retrait)."""
    from apps.payments.intents.models import PaymentIntent

    vus, numeros = set(), []
    for intent in PaymentIntent.objects.filter(buyer=user, idempotency_key__startswith=CLE_RECHARGE,
                                               status=PaymentIntent.Status.SUCCEEDED).order_by("-confirmed_at"):
        if intent.payer_msisdn_fingerprint not in vus:
            vus.add(intent.payer_msisdn_fingerprint)
            numeros.append(intent)
    return numeros


def devis_retrait(user, montant: int) -> dict:
    """Montre avant validation : frais et somme recue (R03.4, feuille de route D16)."""
    montant = int(montant)
    frais = frais_retrait(montant)
    p = portefeuille_de(user)
    return {"montant": montant, "frais": frais, "recu": montant - frais, "retirable": p.solde_retirable_xaf,
            "minimum": regles.reglage("r_retrait_wallet_min"),
            "numeros": [i.payer_msisdn_masked for i in numeros_de_recharge(user)]}


def retirer(user, *, montant: int, numero_masque: str = "", cle: str = ""):
    """
    Le client retire `montant` de la part retirable ; il recoit montant - frais sur un numero qui a recharge.
    Meme chemin et memes garde-fous qu'un versement : jamais de reessai, une issue inconnue reste a reconcilier.
    """
    from apps.payments.settlements.models import PayoutRequest
    from apps.payments.settlements.services import verser_a_un_client

    _exiger_ouvert()
    montant = int(montant)
    if montant < regles.reglage("r_retrait_wallet_min"):
        raise WalletError("retrait_min", f"Le retrait minimum est de {regles.reglage('r_retrait_wallet_min')} F.")
    reference = f"retrait-{cle or uuid.uuid4()}"
    deja = MouvementPortefeuille.objects.filter(reference=reference).first()
    if deja is not None:
        return deja
    numeros = numeros_de_recharge(user)
    source = next((i for i in numeros if not numero_masque or i.payer_msisdn_masked == numero_masque), None)
    if source is None:
        raise WalletError("numero", "Le retrait part seulement vers un numéro qui a rechargé ce Wallet.")
    frais = frais_retrait(montant)
    # Sécurité avant main 2 : le Wallet est débité et validé en base AVANT l'envoi ; l'envoi part hors transaction ;
    # la conclusion (référence, ou part rendue si l'opérateur refuse) suit dans une nouvelle transaction.
    with db_transaction.atomic():
        p = portefeuille_de(user, verrou=True)
        if p.solde_retirable_xaf < montant:  # R03.6 : jamais les gestes
            raise WalletError("solde_insuffisant", "Montant supérieur à la part retirable du Wallet.")
        mouvement = _mouvement(p, MouvementPortefeuille.Sorte.RETRAIT, reference, retirable=-montant,
                               frais_xaf=frais, libelle="Retrait vers Mobile Money")

    versement, etat = verser_a_un_client(
        user=user, msisdn=source.payer_msisdn, operator=source.payer_operator or "",
        masque=source.payer_msisdn_masked, montant=montant - frais, reference=reference,
        justification=f"Retrait du Wallet {reference} vers {source.payer_msisdn_masked} — R03.4",
        debits=[debit(coa.WALLET_LIABILITY, montant, label=f"Retrait {reference}")],
        autres_credits=[credit(coa.REVENUE_WALLET_WITHDRAWAL_FEE, frais, label="Frais de retrait (R03.4)")]
        if frais else [])
    with db_transaction.atomic():
        mouvement.payout_reference = versement.reference
        mouvement.save(update_fields=["payout_reference"])
        if etat == PayoutRequest.Status.FAILED:
            # Rien n'est parti : la part retirable est rendue, aucune ecriture au grand livre.
            p = portefeuille_de(user, verrou=True)
            return _mouvement(p, MouvementPortefeuille.Sorte.RETRAIT_ANNULE, f"{reference}-annule",
                              retirable=montant, payout_reference=versement.reference,
                              libelle=(versement.error_message or "Retrait refusé par l'opérateur")[:200])
    # UNKNOWN : la part reste debitee du Wallet, le compte 2050 attend la reconciliation (voir suivi()).
    return mouvement


# ── Suivi pour l'administration (feuille de route D16) ───────────────────────────────────────────────────

def suivi() -> dict:
    """Somme des Wallets contre le solde du compte 2050 ; les retraits a issue inconnue restent dus au grand livre."""
    from django.db.models import Sum

    from apps.payments.ledger.balances import balance
    from apps.payments.settlements.models import PayoutRequest

    totaux = Portefeuille.objects.aggregate(r=Sum("solde_retirable_xaf"), g=Sum("solde_geste_xaf"))
    inconnus = list(MouvementPortefeuille.objects.filter(
        sorte=MouvementPortefeuille.Sorte.RETRAIT,
        payout_reference__in=PayoutRequest.objects.filter(status=PayoutRequest.Status.UNKNOWN)
        .values_list("reference", flat=True)))
    en_suspens = sum(-m.montant_xaf for m in inconnus)
    detail = (totaux["r"] or 0) + (totaux["g"] or 0)
    grand_livre = int(balance(coa.WALLET_LIABILITY))
    return {"ouvert": ouvert(), "retirable_xaf": totaux["r"] or 0, "geste_xaf": totaux["g"] or 0,
            "wallets": Portefeuille.objects.count(), "retraits_inconnus_xaf": en_suspens,
            "grand_livre_2050_xaf": grand_livre, "ecart_xaf": grand_livre - detail - en_suspens,
            "gestes_en_attente": GestePortefeuille.objects.filter(statut=GestePortefeuille.Statut.EN_ATTENTE).count()}
