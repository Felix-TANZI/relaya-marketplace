# backend/apps/payments/ledger/chart_of_accounts.py
# Plan comptable BelivaY.
#
# Ce fichier est la DEFINITION de reference. La table LedgerAccount en est la
# materialisation, creee par la commande seed_chart_of_accounts.
#
# ─────────────────────────────────────────────────────────────────────────────
# DEUX FAMILLES DE COMPTES PSP — point d'architecture important
#
#   FAMILLE A (derivable) : reconstructible depuis NOS PROPRES evenements.
#       PSP_RESERVED, PSP_IN_TRANSIT.
#       On sait ce qu'on a approuve et ce qu'on a emis. Fiable sans dependance.
#
#   FAMILLE B (dependante du prestataire) : n'existe que si CamPay expose
#       reellement l'information.
#       PSP_AVAILABLE_MTN, PSP_AVAILABLE_ORANGE, PSP_PENDING_SETTLEMENT.
#
#   Si CamPay n'expose qu'un solde global (a confirmer au Jalon A), le MODE
#   DEGRADE s'applique : un unique PSP_AVAILABLE fait foi, et la ventilation
#   par operateur devient une ESTIMATION explicitement non opposable.
#
#   Un plan comptable elegant mais irreconciliable est pire qu'un plan
#   grossier mais fidele.
# ─────────────────────────────────────────────────────────────────────────────

# Types de compte
ASSET = "ASSET"
LIABILITY = "LIABILITY"
REVENUE = "REVENUE"
EXPENSE = "EXPENSE"
SUSPENSE = "SUSPENSE"

# Sens normal
DEBIT = "DEBIT"
CREDIT = "CREDIT"

# Familles PSP
FAMILY_NONE = "NONE"
FAMILY_DERIVABLE = "DERIVABLE"
FAMILY_PROVIDER = "PROVIDER"


def _a(code, name, type_, normal_side, **kw):
    return {
        "code": code,
        "name": name,
        "account_type": type_,
        "normal_side": normal_side,
        "psp_family": kw.get("psp_family", FAMILY_NONE),
        "operator": kw.get("operator", ""),
        "is_auxiliary": kw.get("is_auxiliary", False),
        "is_reserved": kw.get("is_reserved", False),
        "description": kw.get("description", ""),
    }


CHART = [
    # ── ACTIF — tresorerie ───────────────────────────────────────────────────
    _a("1010", "Solde disponible PSP (global)", ASSET, DEBIT,
       psp_family=FAMILY_PROVIDER,
       description="Mode degrade : utilise si le prestataire n'expose pas de solde par operateur."),
    _a("1011", "Solde disponible PSP — MTN", ASSET, DEBIT,
       psp_family=FAMILY_PROVIDER, operator="MTN",
       description="Conditionne au Jalon A. ER301 de CamPay porte sur le solde du porteur specifique."),
    _a("1012", "Solde disponible PSP — Orange", ASSET, DEBIT,
       psp_family=FAMILY_PROVIDER, operator="ORANGE",
       description="Conditionne au Jalon A."),
    _a("1015", "Encaisse PSP en attente de mise a disposition", ASSET, DEBIT,
       psp_family=FAMILY_PROVIDER,
       description="Encaisse mais pas encore disponible. Conditionne au Jalon A."),
    _a("1016", "Fonds PSP reserves", ASSET, DEBIT,
       psp_family=FAMILY_DERIVABLE,
       description="Somme des versements approuves ou en cours. Derivable en interne."),
    _a("1090", "Fonds PSP en transit", ASSET, DEBIT,
       psp_family=FAMILY_DERIVABLE,
       description="Versements emis a issue inconnue (etat UNKNOWN). Derivable en interne."),
    _a("1020", "Banque BelivaY", ASSET, DEBIT),
    _a("1030", "Creances partenaires", ASSET, DEBIT, is_auxiliary=True,
       description="Ce qu'un partenaire doit a BelivaY (penalites, corrections)."),

    # ── PASSIF ───────────────────────────────────────────────────────────────
    _a("2010", "Dette de sequestre", LIABILITY, CREDIT,
       description="Fonds detenus pour le compte de tiers. NE TRANSITE JAMAIS par un compte de produit."),
    _a("2020", "Dette envers vendeurs", LIABILITY, CREDIT, is_auxiliary=True),
    _a("2021", "Dette envers livreurs independants", LIABILITY, CREDIT,
       is_auxiliary=True, is_reserved=True,
       description="Reserve Phase 2. Aucun mouvement en Phase 1."),
    _a("2022", "Dette envers entreprises de livraison", LIABILITY, CREDIT, is_auxiliary=True),
    _a("2023", "Dette envers points relais", LIABILITY, CREDIT, is_auxiliary=True),
    _a("2030", "Remboursements a verser", LIABILITY, CREDIT, is_auxiliary=True),
    _a("2040", "Ajustements a verser", LIABILITY, CREDIT, is_auxiliary=True,
       description="Compensations et bonus dus a un partenaire."),

    # ── ATTENTE ──────────────────────────────────────────────────────────────
    _a("3010", "Compte d'attente", SUSPENSE, DEBIT,
       description="Ecarts de reconciliation non resolus. Son solde doit tendre vers zero ; "
                   "un solde durablement non nul est en soi une alerte."),

    # ── PRODUITS — chiffre d'affaires BelivaY, base fiscale ──────────────────
    _a("4010", "Commissions sur ventes", REVENUE, CREDIT),
    _a("4015", "Part plateforme sur transport", REVENUE, CREDIT),
    _a("4020", "Abonnements vendeurs", REVENUE, CREDIT, is_reserved=True,
       description="Reserve. Les abonnements sont hors perimetre du lancement."),

    # ── CHARGES ──────────────────────────────────────────────────────────────
    _a("5010", "Frais PSP sur encaissement", EXPENSE, DEBIT,
       description="Charge plateforme. A ne JAMAIS confondre avec un produit."),
    _a("5011", "Frais PSP sur versement", EXPENSE, DEBIT,
       description="Charge plateforme. Aucun frais n'est retenu au partenaire : "
                   "il recoit l'integralite de son net."),
    _a("5020", "Pertes et abandons de creance", EXPENSE, DEBIT),
]

#: Index par code
BY_CODE = {compte["code"]: compte for compte in CHART}

#: Comptes de produits — aucun flux de sequestre ne doit les atteindre (principe P8)
REVENUE_CODES = frozenset(c["code"] for c in CHART if c["account_type"] == REVENUE)

#: Comptes de tresorerie PSP
PSP_CODES = frozenset(c["code"] for c in CHART if c["psp_family"] != FAMILY_NONE)
PSP_DERIVABLE_CODES = frozenset(
    c["code"] for c in CHART if c["psp_family"] == FAMILY_DERIVABLE
)
PSP_PROVIDER_CODES = frozenset(
    c["code"] for c in CHART if c["psp_family"] == FAMILY_PROVIDER
)

#: Comptes de dette envers des tiers — entrent dans le calcul de solvabilite
THIRD_PARTY_LIABILITY_CODES = frozenset(
    {"2010", "2020", "2021", "2022", "2023", "2030", "2040"}
)

#: Comptes reserves — declares mais sans mouvement en Phase 1
RESERVED_CODES = frozenset(c["code"] for c in CHART if c["is_reserved"])

# Raccourcis lisibles, pour eviter les codes en dur dans le code applicatif
ESCROW_LIABILITY = "2010"
PAYABLE_VENDOR = "2020"
PAYABLE_DELIVERY_COMPANY = "2022"
PAYABLE_RELAY_POINT = "2023"
REFUND_PAYABLE = "2030"
PAYABLE_ADJUSTMENT = "2040"
RECEIVABLE_PARTNER = "1030"
SUSPENSE_ACCOUNT = "3010"
REVENUE_COMMISSION = "4010"
REVENUE_TRANSPORT_SHARE = "4015"
EXPENSE_PSP_COLLECT = "5010"
EXPENSE_PSP_PAYOUT = "5011"
EXPENSE_WRITEOFF = "5020"
PSP_AVAILABLE = "1010"
PSP_AVAILABLE_MTN = "1011"
PSP_AVAILABLE_ORANGE = "1012"
PSP_PENDING = "1015"
PSP_RESERVED = "1016"
PSP_IN_TRANSIT = "1090"
BANK_BELIVAY = "1020"

#: Compte de tresorerie a debiter selon l'operateur, en mode nominal
PSP_BY_OPERATOR = {
    "MTN": PSP_AVAILABLE_MTN,
    "ORANGE": PSP_AVAILABLE_ORANGE,
}


def psp_account_for(operator: str, degraded: bool = False) -> str:
    """
    Compte de tresorerie a mouvementer pour un operateur donne.

    En mode degrade (le prestataire n'expose pas de solde par operateur),
    tout converge vers le compte global.
    """
    if degraded:
        return PSP_AVAILABLE
    return PSP_BY_OPERATOR.get((operator or "").upper(), PSP_AVAILABLE)