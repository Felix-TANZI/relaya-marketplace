# backend/apps/payments/management/commands/payments_preflight.py
# Controle avant mise en production.
#
#   python manage.py payments_preflight
#   python manage.py payments_preflight --strict     # sortie 1 si alerte
#
# ─────────────────────────────────────────────────────────────────────────────
# CE QUE CETTE COMMANDE EMPECHE
#
# Un module financier peut etre parfaitement teste et parfaitement branche,
# et rester dangereux en production a cause de reglages :
#
#   - une cle de chiffrement de developpement, laissee en place
#   - un montant minimum abaisse pour un test de bac a sable
#   - DEBUG a True, qui expose les traces et les variables d'environnement
#   - un jeton LIVE absent alors que le mode est LIVE
#   - des declencheurs de base de donnees non installes
#
# Aucun de ces defauts ne fait echouer un test. Tous se paient en production.
#
# CETTE COMMANDE NE CORRIGE RIEN. Elle constate, explique la consequence, et
# donne la correction. Corriger automatiquement un reglage de production
# serait pire que le probleme.
# ─────────────────────────────────────────────────────────────────────────────
#
# CODES DE SORTIE
#   0  pret pour la production
#   1  alertes (avec --strict)
#   2  BLOQUANT — ne pas deployer

import sys

from django.conf import settings
from django.core.management.base import BaseCommand

BLOQUANT = "BLOQUANT"
ALERTE = "ALERTE"
ATTENTION = "ATTENTION"
OK = "OK"

ORDRE = {BLOQUANT: 0, ALERTE: 1, ATTENTION: 2, OK: 3}


class Command(BaseCommand):
    help = "Verifie que le module financier est pret pour la production."

    def add_arguments(self, parser):
        parser.add_argument("--strict", action="store_true",
                            help="Code de sortie 1 des la premiere alerte.")
        parser.add_argument("--show-ok", action="store_true",
                            help="Affiche aussi les controles reussis.")

    def handle(self, *args, **options):
        self.constats = []

        for controle in (
            self._secrets,
            self._django,
            self._prestataire,
            self._configuration_financiere,
            self._registre,
            self._ordonnanceur,
            self._risque,
            self._reconciliation,
        ):
            try:
                controle()
            except Exception as exc:
                self._dire(ALERTE, f"Controle interrompu : {controle.__name__}",
                           f"{type(exc).__name__} : {exc}",
                           "Ce controle n'a pas pu s'executer. Le verifier "
                           "manuellement.")

        self._rapport()

        bloquants = [c for c in self.constats if c["gravite"] == BLOQUANT]
        alertes = [c for c in self.constats if c["gravite"] == ALERTE]

        if bloquants:
            sys.exit(2)
        if alertes and options["strict"]:
            sys.exit(1)
        sys.exit(0)

    # ── Constat ──────────────────────────────────────────────────────────────

    def _dire(self, gravite, titre, detail="", correction=""):
        self.constats.append({
            "gravite": gravite, "titre": titre,
            "detail": detail, "correction": correction,
        })

    def _ok(self, titre, detail=""):
        self._dire(OK, titre, detail)

    # ── 1. Secrets ───────────────────────────────────────────────────────────

    def _secrets(self):
        cle = getattr(settings, "PAYMENTS_ENCRYPTION_KEY", "") or ""
        if not cle:
            self._dire(
                BLOQUANT, "PAYMENTS_ENCRYPTION_KEY absente",
                "Les numeros Mobile Money sont stockes chiffres. Sans cette "
                "cle, aucun versement n'est possible.",
                "Generer : python -c \"from cryptography.fernet import "
                "Fernet; print(Fernet.generate_key().decode())\"",
            )
        elif len(cle) < 40:
            self._dire(
                BLOQUANT, "PAYMENTS_ENCRYPTION_KEY trop courte",
                f"{len(cle)} caracteres. Une cle Fernet en fait 44.",
                "Regenerer une cle Fernet valide.",
            )
        else:
            self._ok("Cle de chiffrement presente")

        sel = getattr(settings, "PAYMENTS_FINGERPRINT_SALT", "") or ""
        if not sel:
            self._dire(
                BLOQUANT, "PAYMENTS_FINGERPRINT_SALT absent",
                "L'empreinte des numeros detecte les mules financieres. "
                "Sans sel, elle est calculable par un tiers.",
                "Definir une chaine aleatoire d'au moins 32 caracteres.",
            )
        elif len(sel) < 16:
            self._dire(
                ALERTE, "PAYMENTS_FINGERPRINT_SALT trop court",
                f"{len(sel)} caracteres.",
                "Utiliser au moins 32 caracteres aleatoires.",
            )
        else:
            self._ok("Sel d'empreinte present")

        webhook = getattr(settings, "CAMPAY_WEBHOOK_KEY", "") or ""
        if not webhook:
            self._dire(
                ALERTE, "CAMPAY_WEBHOOK_KEY absente",
                "Les webhooks seront rejetes. Le polling prendra le relais, "
                "mais avec du retard.",
                "Recuperer la cle dans le tableau de bord CamPay.",
            )
        else:
            self._ok("Cle de webhook presente")

        secret = getattr(settings, "SECRET_KEY", "") or ""
        suspects = ("django-insecure", "changeme", "secret", "dev")
        if any(motif in secret.lower() for motif in suspects):
            self._dire(
                BLOQUANT, "SECRET_KEY de developpement",
                "Elle signe les sessions et les jetons. Une valeur devinable "
                "permet de forger une session administrateur.",
                "Generer une cle aleatoire de 50 caracteres.",
            )
        else:
            self._ok("SECRET_KEY personnalisee")

    # ── 2. Django ────────────────────────────────────────────────────────────

    def _django(self):
        if getattr(settings, "DEBUG", False):
            self._dire(
                BLOQUANT, "DEBUG est actif",
                "Une exception exposerait les traces, les requetes SQL et "
                "les variables d'environnement — dont les cles.",
                "Mettre DEBUG=False dans les reglages de production.",
            )
        else:
            self._ok("DEBUG desactive")

        hotes = getattr(settings, "ALLOWED_HOSTS", [])
        if "*" in hotes:
            self._dire(
                ALERTE, "ALLOWED_HOSTS accepte tout",
                "Expose aux attaques par en-tete Host.",
                "Lister explicitement belivay.com et ses sous-domaines.",
            )
        elif not hotes:
            self._dire(ALERTE, "ALLOWED_HOSTS vide", "",
                       "Lister les domaines autorises.")
        else:
            self._ok(f"ALLOWED_HOSTS restreint ({len(hotes)} entree(s))")

        limites = (getattr(settings, "REST_FRAMEWORK", {})
                   .get("DEFAULT_THROTTLE_RATES", {}))
        if "payments_webhook" not in limites:
            self._dire(
                ATTENTION, "Aucune limite de debit sur les webhooks",
                "Un flot de webhooks forges saturerait la base.",
                'Ajouter REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]'
                '["payments_webhook"] = "120/min"',
            )
        else:
            self._ok(f"Limite webhook : {limites['payments_webhook']}")

    # ── 3. Prestataire ───────────────────────────────────────────────────────

    def _prestataire(self):
        from apps.payments.config.models import ProviderConfig

        actifs = list(ProviderConfig.current().filter(is_enabled=True))
        if not actifs:
            self._dire(
                BLOQUANT, "Aucun prestataire actif",
                "Aucun encaissement n'est possible.",
                "Activer CamPay dans l'administration.",
            )
            return

        codes = [c.provider_code for c in actifs]
        if "MOCK" in codes:
            self._dire(
                BLOQUANT, "Le prestataire factice MOCK est ACTIF",
                "Les paiements seraient simules : les acheteurs seraient "
                "debites de rien, et les commandes marquees payees.",
                "Desactiver MOCK et activer CamPay.",
            )
        else:
            self._ok(f"Prestataire actif : {', '.join(codes)}")

        for config in actifs:
            if config.provider_code == "MOCK":
                continue

            if config.mode == "SANDBOX":
                self._dire(
                    ALERTE, f"{config.provider_code} en mode SANDBOX",
                    "Aucun argent reel ne circulera.",
                    "Passer mode=LIVE et renseigner CAMPAY_TOKEN_LIVE.",
                )
            else:
                jeton = getattr(settings, "CAMPAY_TOKEN_LIVE", "") or ""
                if not jeton:
                    self._dire(
                        BLOQUANT,
                        f"{config.provider_code} en LIVE sans jeton LIVE",
                        "Tous les appels echoueront.",
                        "Definir CAMPAY_TOKEN_LIVE.",
                    )
                else:
                    self._ok(f"{config.provider_code} en mode LIVE, jeton present")

            # Le reglage qui se glisse depuis un test de bac a sable.
            if config.min_amount_xaf < 100:
                self._dire(
                    ALERTE,
                    f"Montant minimum a {config.min_amount_xaf} FCFA",
                    "Souvent abaisse pour un test de bac a sable, puis "
                    "oublie. Un encaissement de 1 FCFA couterait plus en "
                    "frais qu'il ne rapporte.",
                    "Remettre min_amount_xaf a 100 au minimum.",
                )
            else:
                self._ok(f"Montant minimum : {config.min_amount_xaf} FCFA")

            if config.is_payout_enabled:
                self._dire(
                    ATTENTION, "Les versements sont ACTIFS",
                    "De l'argent pourra sortir automatiquement.",
                    "Verifier que les politiques d'approbation sont en place.",
                )

    # ── 4. Configuration financiere ──────────────────────────────────────────

    def _configuration_financiere(self):
        from apps.payments.config.models import (
            DistributionRule, EscrowPolicy, PayoutPolicy,
        )

        regles = list(DistributionRule.current())
        if not regles:
            self._dire(
                BLOQUANT, "Aucune regle de repartition",
                "Aucun paiement ne pourra etre calcule.",
                "Lancer : python manage.py seed_financial_config",
            )
            return

        # ─────────────────────────────────────────────────────────────────
        # LE REPLI N'EST NECESSAIRE QUE POUR LES BENEFICIAIRES INCERTAINS
        #
        # Un VENDEUR est toujours connu au checkout : un produit a un
        # vendeur. Exiger un repli PLATFORM sur GOODS reviendrait a dire
        # « si aucun vendeur, la plateforme garde l'argent de la
        # marchandise » — ce qui serait un detournement silencieux.
        #
        # Une marchandise sans vendeur DOIT faire echouer le plan. C'est ce
        # que verifie test_un_vendeur_absent_echoue_toujours.
        #
        # Seuls le TRANSPORTEUR et le POINT RELAIS peuvent legitimement etre
        # inconnus au moment du calcul : ils sont assignes plus tard.
        # ─────────────────────────────────────────────────────────────────
        INCERTAINS = {"DELIVERY_COMPANY", "RELAY_POINT"}

        composants = {r.component for r in regles}
        for composant in sorted(composants):
            cibles = {r.payee_type for r in regles if r.component == composant}
            incertaines = cibles & INCERTAINS
            if not incertaines:
                self._ok(
                    f"Composant {composant} : beneficiaires toujours connus",
                    f"cible(s) : {', '.join(sorted(cibles))}",
                )
                continue

            reste = [r for r in regles
                     if r.component == composant
                     and r.basis == "REMAINDER"
                     and r.payee_type == "PLATFORM"]
            if not reste:
                # Le motif est propre a chaque type : dire « le
                # transporteur » pour un point relais brouille le
                # diagnostic au lieu de l'eclairer.
                MOTIFS = {
                    "DELIVERY_COMPANY":
                        "le transporteur est assigne APRES le checkout",
                    "RELAY_POINT":
                        "le point relais est choisi APRES le checkout",
                }
                raisons = " et ".join(
                    MOTIFS.get(t, f"{t} peut etre inconnu")
                    for t in sorted(incertaines)
                )
                self._dire(
                    BLOQUANT,
                    f"Composant {composant} sans regle de repli",
                    f"Une regle cible {', '.join(sorted(incertaines))} : "
                    f"{raisons}. Sans repli, le plan echoue et TOUT le "
                    "paiement est refuse — pas seulement cette part.",
                    f"Ajouter une regle REMAINDER vers PLATFORM sur "
                    f"{composant}, ou desactiver la regle "
                    f"{composant}/{sorted(incertaines)[0]} si ce composant "
                    "n'est pas encore utilise.",
                )
            else:
                self._ok(
                    f"Composant {composant} : repli PLATFORM present",
                    f"necessaire car une regle cible "
                    f"{', '.join(sorted(incertaines))}",
                )

        if not EscrowPolicy.current().exists():
            self._dire(
                BLOQUANT, "Aucune politique de sequestre",
                "Les sequestres ne pourront pas etre materialises.",
                "Lancer : python manage.py seed_financial_config",
            )
        else:
            self._ok(f"{EscrowPolicy.current().count()} politique(s) de sequestre")

        if not PayoutPolicy.current().exists():
            self._dire(
                ALERTE, "Aucune politique de versement",
                "Les regles d'approbation et le plafond de retenue "
                "prendraient leurs valeurs de repli.",
                "Creer une PayoutPolicy dans l'administration.",
            )
        else:
            politique = PayoutPolicy.current().order_by("-priority").first()
            self._ok(
                "Politique de versement presente",
                f"retenue max {politique.max_offset_percent} %, "
                f"hors cycle "
                f"{'autorise' if politique.allow_exceptional_settlement else 'interdit'}",
            )

    # ── 5. Registre ──────────────────────────────────────────────────────────

    def _registre(self):
        from apps.payments.ledger.balances import trial_balance_total
        from apps.payments.ledger.invariants import run_all
        from apps.payments.ledger.models import LedgerAccount

        comptes = LedgerAccount.objects.count()
        if comptes == 0:
            self._dire(
                BLOQUANT, "Plan comptable vide",
                "Aucune ecriture ne pourra etre passee.",
                "Lancer : python manage.py seed_chart_of_accounts",
            )
            return
        self._ok(f"Plan comptable : {comptes} comptes")

        ecart = trial_balance_total()
        if ecart != 0:
            self._dire(
                BLOQUANT, "Balance generale desequilibree",
                f"Ecart de {ecart} XAF. Le registre est corrompu.",
                "Ne pas deployer. Identifier l'ecriture fautive.",
            )
        else:
            self._ok("Balance generale equilibree")

        rapport = run_all(limit=500)
        bloquants = [v for v in rapport["violations"] if v.blocking]
        if bloquants:
            self._dire(
                BLOQUANT, "Invariant comptable bloquant viole",
                ", ".join(f"{v.code} : {v.detail[:80]}" for v in bloquants),
                "Ne pas deployer. Lancer : python manage.py "
                "verify_ledger_integrity",
            )
        elif rapport["violations"]:
            self._dire(
                ATTENTION, "Invariants non bloquants signales",
                ", ".join(v.code for v in rapport["violations"]),
                "A surveiller.",
            )
        else:
            self._ok("Invariants comptables respectes")

        self._declencheurs()

    def _declencheurs(self):
        """
        Les declencheurs PostgreSQL sont la DERNIERE defense du registre :
        ils bloquent une modification par SQL direct, meme depuis un shell
        de base de donnees.
        """
        from django.db import connection

        try:
            with connection.cursor() as curseur:
                curseur.execute("""
                    SELECT COUNT(*) FROM pg_trigger t
                    JOIN pg_class c ON c.oid = t.tgrelid
                    WHERE c.relname LIKE 'payments_ledger%'
                      AND NOT t.tgisinternal
                """)
                nombre = curseur.fetchone()[0]
        except Exception as exc:
            self._dire(ATTENTION, "Declencheurs non verifiables",
                       str(exc)[:120], "Verifier manuellement en psql.")
            return

        if nombre == 0:
            self._dire(
                BLOQUANT, "Aucun declencheur de protection du registre",
                "Une modification par SQL direct ne serait pas bloquee. "
                "C'est la derniere defense contre l'alteration d'ecritures.",
                "Verifier que la migration 0004_ledger_db_guards est "
                "appliquee.",
            )
        else:
            self._ok(f"{nombre} declencheur(s) de protection actif(s)")

    # ── 6. Ordonnanceur ──────────────────────────────────────────────────────

    def _ordonnanceur(self):
        from apps.payments.tasks.models import TaskRun

        sante = TaskRun.health(max_age_minutes=180)
        jamais = [s["task_name"] for s in sante if s["last_success_at"] is None]
        critiques = [s["task_name"] for s in sante
                     if s["alert"] and s["critical"]]

        if len(jamais) == len(sante):
            self._dire(
                BLOQUANT, "Aucune tache planifiee n'a jamais tourne",
                "Sans ordonnanceur : les paiements bloques restent "
                "invisibles pour toujours, les sequestres ne "
                "s'auto-confirment pas, et AUCUN VENDEUR N'EST PAYE.",
                "Planifier : python manage.py payments_tick --crontab",
            )
        elif critiques:
            self._dire(
                ALERTE, f"{len(critiques)} tache(s) critique(s) muette(s)",
                ", ".join(critiques),
                "Verifier le crontab et le journal des executions.",
            )
        else:
            self._ok("Ordonnanceur actif")

    # ── 7. Risque ────────────────────────────────────────────────────────────

    def _risque(self):
        from apps.payments.risk.services import current_policy

        politique = current_policy()
        if politique is None:
            self._dire(
                ATTENTION, "Aucune politique de risque",
                "La detection utilisera ses valeurs de repli, volontairement "
                "permissives.",
                "Creer une RiskPolicy dans l'administration.",
            )
            return

        if politique.auto_block_enabled:
            self._dire(
                ATTENTION, "Le blocage automatique est ACTIF",
                f"Un score au-dela de {politique.block_score_threshold} "
                "refusera le paiement.",
                "S'assurer que le calibrage a ete verifie sur des donnees "
                "reelles.",
            )
        else:
            self._ok(
                "Politique de risque presente",
                "Blocage automatique desactive — un score eleve alerte "
                "sans refuser.",
            )

    # ── 8. Reconciliation ────────────────────────────────────────────────────

    def _reconciliation(self):
        from apps.payments.reconciliation.services import (
            open_discrepancies_summary,
        )
        from apps.payments.settlements.models import PayoutRequest

        ecarts = open_discrepancies_summary()
        if ecarts["critical_open"]:
            self._dire(
                ALERTE, f"{ecarts['critical_open']} ecart(s) critique(s) ouvert(s)",
                f"{ecarts['total_gap_xaf']} XAF au total.",
                "Traiter avant le deploiement.",
            )
        elif ecarts["open_total"]:
            self._dire(
                ATTENTION, f"{ecarts['open_total']} ecart(s) ouvert(s)",
                "Aucun n'est critique.", "A traiter sans urgence.",
            )
        else:
            self._ok("Aucun ecart de reconciliation ouvert")

        inconnus = PayoutRequest.objects.filter(
            status=PayoutRequest.Status.UNKNOWN).count()
        if inconnus:
            self._dire(
                ALERTE, f"{inconnus} versement(s) a issue INCONNUE",
                "De l'argent est en transit sans issue connue.",
                "NE JAMAIS RETENTER. Lancer : python manage.py "
                "payments_tick --only resolve_unknown_payouts",
            )
        else:
            self._ok("Aucun versement a issue inconnue")

    # ── Rapport ──────────────────────────────────────────────────────────────

    def _rapport(self):
        self.stdout.write(self.style.HTTP_INFO(
            "\n╔════════════════════════════════════════════════════════════╗\n"
            "║  BelivaY — controle avant production                       ║\n"
            "╚════════════════════════════════════════════════════════════╝"))

        self.constats.sort(key=lambda c: ORDRE[c["gravite"]])
        styles = {
            BLOQUANT: self.style.ERROR,
            ALERTE: self.style.ERROR,
            ATTENTION: self.style.WARNING,
            OK: self.style.SUCCESS,
        }

        montre_ok = "--show-ok" in sys.argv
        for constat in self.constats:
            if constat["gravite"] == OK and not montre_ok:
                continue
            style = styles[constat["gravite"]]
            self.stdout.write(style(
                f"\n  [{constat['gravite']}] {constat['titre']}"))
            if constat["detail"]:
                for ligne in _envelopper(constat["detail"], 66):
                    self.stdout.write(f"      {ligne}")
            if constat["correction"]:
                for ligne in _envelopper(constat["correction"], 66):
                    self.stdout.write(f"      -> {ligne}")

        compte = {g: sum(1 for c in self.constats if c["gravite"] == g)
                  for g in (BLOQUANT, ALERTE, ATTENTION, OK)}

        self.stdout.write(self.style.HTTP_INFO(
            f"\n── Bilan ──\n"
            f"  {compte[OK]} controle(s) reussi(s) · "
            f"{compte[ATTENTION]} attention · "
            f"{compte[ALERTE]} alerte(s) · "
            f"{compte[BLOQUANT]} bloquant(s)"))

        if compte[BLOQUANT]:
            self.stdout.write(self.style.ERROR(
                f"\n  NE PAS DEPLOYER. {compte[BLOQUANT]} point(s) bloquant(s) "
                "a corriger."))
        elif compte[ALERTE]:
            self.stdout.write(self.style.WARNING(
                "\n  Deploiement possible, mais des alertes subsistent.\n"
                "  Les lire une par une avant de decider."))
        else:
            self.stdout.write(self.style.SUCCESS(
                "\n  Pret pour la production."))
            if not montre_ok:
                self.stdout.write(
                    "  Relancer avec --show-ok pour voir le detail.")


def _envelopper(texte: str, largeur: int) -> list:
    mots, lignes, courante = texte.split(), [], ""
    for mot in mots:
        if len(courante) + len(mot) + 1 > largeur:
            lignes.append(courante)
            courante = mot
        else:
            courante = f"{courante} {mot}".strip()
    if courante:
        lignes.append(courante)
    return lignes