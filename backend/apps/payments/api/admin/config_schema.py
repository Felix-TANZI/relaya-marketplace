# backend/apps/payments/api/admin/config_schema.py
# Le schema des formulaires, deduit des modeles.
#
# ─────────────────────────────────────────────────────────────────────────────
# LE SCHEMA SE DEDUIT, IL NE SE RECOPIE PAS
#
# Les neuf modeles portent 123 champs editables. Les redecrire a la main
# dans le frontend garantirait la derive : un champ ajoute cote Django
# resterait invisible, un choix modifie afficherait une valeur morte.
#
# On lit donc les modeles Django et on en deduit le formulaire — type,
# choix, valeur par defaut, obligatoire ou non.
#
# ─────────────────────────────────────────────────────────────────────────────
# CE QUI RESTE ECRIT A LA MAIN
#
# Uniquement ce qu'un modele ne peut pas savoir : la PHRASE qui explique la
# consequence d'un reglage. « required_approvals » se deduit ; « celui qui
# demande ne peut jamais approuver » non.
#
# C'est cette phrase qui distingue un formulaire utilisable d'un tableau de
# colonnes.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations

from decimal import Decimal

from django.db import models

#: Les champs geres par le versionnage, jamais saisis a la main.
CHAMPS_TECHNIQUES = {
    "id", "config_key", "version", "is_active", "valid_from", "valid_to",
    "valid_until", "created_by", "created_at", "updated_at",
    "superseded_by", "notes",
}

#: L'aide qui explique la CONSEQUENCE d'un reglage, pas sa definition.
#: Un modele ne peut pas la deviner.
AIDES: dict[str, str] = {
    # ── Prestataire ──────────────────────────────────────────────────────
    "provider_code": "Qui encaisse et verse. MOCK simule sans argent réel.",
    "mode": "LIVE engage de l'argent réel. SANDBOX plafonne à 25 FCFA.",
    "is_enabled": "Un seul prestataire actif à la fois.",
    "is_payout_enabled": "Sans cela, aucun partenaire ne peut être payé.",
    "min_amount_xaf": "En dessous, l'encaissement coûte plus qu'il ne "
                      "rapporte. 100 minimum en production.",
    "max_amount_xaf": "Protège d'une faute de frappe. 0 = illimité.",
    "daily_collect_cap_xaf": "Plafond journalier d'encaissement. 0 = aucun.",
    "daily_payout_cap_xaf": "Plafond journalier de versement. 0 = aucun.",
    "collect_timeout_s": "Au-delà, la demande est considérée expirée.",
    "poll_interval_s": "Fréquence d'interrogation du prestataire.",
    "max_poll_duration_s": "Durée totale avant d'abandonner le sondage.",
    "circuit_breaker_threshold": "Échecs consécutifs avant de suspendre "
                                 "les appels.",
    "webhook_ip_allowlist": "Adresses autorisées à notifier. Vide = toutes.",
    "exposes_balance_per_operator": "Active l'invariant de liquidité par "
                                    "porteur (Jalon A).",
    "supported_operators": "MTN, ORANGE. Vide = tous.",

    # ── Frais ────────────────────────────────────────────────────────────
    "scope": "Sur quelle opération ces frais s'appliquent.",
    "bearer": "Qui les supporte. PLATFORM les porte en charge BelivaY — "
              "jamais retenus sur le partenaire.",
    "value": "Pourcentage ou montant fixe, selon la base choisie.",
    "min_fee_xaf": "Plancher appliqué au calcul. 0 = aucun.",
    "max_fee_xaf": "Plafond appliqué au calcul. 0 = aucun.",
    "rounding": "Comment arrondir. HALF_UP est la convention comptable.",

    # ── Repartition ──────────────────────────────────────────────────────
    "component": "Quelle part du paiement cette règle distribue.",
    "payee_type": "À qui elle revient.",
    "basis": "REMAINDER prend ce qui reste après les autres règles.",
    "priority": "Plus le nombre est bas, plus la règle s'applique tôt.",

    # ── Sequestre ────────────────────────────────────────────────────────
    "auto_confirm_hours": "Passé ce délai sans action de l'acheteur, la "
                          "commande est confirmée automatiquement. "
                          "0 pour le transport et le relais : un événement "
                          "les libère.",
    "release_delay_hours": "Délai après confirmation avant que l'argent "
                           "devienne exigible.",
    "dispute_window_days": "Fenêtre pendant laquelle l'acheteur peut "
                           "contester.",
    "vendor_reply_hours": "Délai laissé au vendeur pour répondre à un "
                          "litige.",

    # ── Cycles ───────────────────────────────────────────────────────────
    "frequency": "ON_THRESHOLD règle dès qu'un montant est atteint, sans "
                 "calendrier.",
    "anchor_day": "Jour de la semaine (1 = lundi) ou du mois.",
    "cutoff_hours": "Heures avant l'échéance où le lot est figé.",
    "minimum_amount_xaf": "En dessous, le règlement est reporté au cycle "
                          "suivant.",
    "carry_forward": "Reporte le reliquat plutôt que de le perdre.",

    # ── Versement ────────────────────────────────────────────────────────
    "min_payout_xaf": "En dessous, le versement coûte plus en frais qu'il "
                      "ne rapporte. 1000 recommandé en production.",
    "max_payout_xaf": "Protège d'une faute de frappe. 0 = illimité.",
    "required_approvals": "Celui qui demande ne peut jamais approuver.",
    "dual_approval_threshold_xaf": "Au-delà, deux personnes distinctes "
                                   "doivent valider.",
    "cooling_period_hours": "Délai entre l'approbation et l'exécution.",
    "momo_change_cooling_hours": "Après un changement de numéro, délai de "
                                 "sécurité avant tout versement.",
    "auto_execute_on_approval": "Émet le virement dès l'approbation, sans "
                                "second clic.",
    "require_kyc_verified": "Bloque le versement tant que les pièces ne "
                            "sont pas validées.",
    "max_pending_requests": "Demandes simultanées autorisées par "
                            "partenaire.",
    "allowed_weekdays": "Jours où les versements partent. Vide = tous.",
    "allow_exceptional_settlement": "Autorise un règlement hors cycle.",
    "exceptional_required_approvals": "Un règlement hors cycle exige "
                                      "davantage de validations.",

    # ── Risque ───────────────────────────────────────────────────────────
    "auto_block_enabled": "Bloque automatiquement au-delà du score. "
                          "Désactivé : un faux positif coûte plus cher "
                          "qu'une fraude marquée puis vérifiée.",
    "review_score_threshold": "Score à partir duquel une vérification est "
                              "demandée.",
    "block_score_threshold": "Score à partir duquel le paiement est "
                             "refusé, si le blocage est actif.",
    "shared_msisdn_payee_threshold": "Nombre de partenaires partageant un "
                                     "numéro avant alerte.",
    "velocity_intents_per_hour": "Paiements par heure avant alerte.",
    "amount_anomaly_multiplier": "Multiple du panier habituel qui déclenche "
                                 "une alerte.",
    "trust_initial_score": "Score de départ d'un nouveau partenaire.",

    # ── Remuneration relais ──────────────────────────────────────────────
    "payee_code": "Vide = tarif général. Renseigné = tarif négocié pour ce "
                  "point relais.",
    "parcel_size": "La catégorie de colis concernée.",
    "amount_xaf": "Montant versé par colis remis. C'est une charge BelivaY, "
                  "pas une part du paiement acheteur.",
    "is_accepted": "Décoché, ce relais refuse cette catégorie.",
    "contract_reference": "La référence du contrat qui autorise ce tarif.",

    # ── Classes de vehicule ──────────────────────────────────────────────
    "max_weight_kg": "Charge maximale transportable.",
    "max_volume_l": "Volume maximal transportable.",
    "sort_order": "Ordre d'affichage dans les listes.",
    "code": "Identifiant technique, utilisé par le code. Évitez de le "
            "changer une fois en service.",
    "label": "Le nom affiché aux partenaires.",

    # ── Le nom, commun a tous les modeles ────────────────────────────────
    "name": "Le nom affiché dans les écrans. Purement descriptif.",

    # ── Filtres — communs a plusieurs modeles ────────────────────────────
    # Un filtre vide s'applique a TOUT. C'est le piege classique : croire
    # qu'une regle est restreinte alors qu'elle est generale.
    "filter_provider": "Ne s'applique qu'à ce prestataire. Vide = tous.",
    "filter_operator": "Ne s'applique qu'à cet opérateur. Vide = tous.",
    "filter_payee_type": "Ne s'applique qu'à ce type de partenaire. "
                         "Vide = tous.",
    "filter_category": "Ne s'applique qu'à cette catégorie de produit. "
                       "Vide = toutes.",
    "filter_certification_tier": "Ne s'applique qu'à ce niveau de "
                                 "certification. Vide = tous.",
    "filter_city": "Ne s'applique qu'à cette ville. Vide = toutes.",
    "filter_delivery_mode": "Ne s'applique qu'à ce mode de livraison. "
                            "Vide = tous.",

    # ── Frais avances ────────────────────────────────────────────────────
    "tiers": "Barème par tranches, en JSON. Ignoré si la base n'est pas "
             "TIERED.",
    "split_config": "Répartition des frais entre plusieurs porteurs, en "
                    "JSON. Ignoré si le porteur n'est pas SPLIT.",
    "retry_policy": "Nombre et espacement des tentatives, en JSON.",

    # ── Cycles ───────────────────────────────────────────────────────────
    "default_payee_type": "Type de partenaire rattaché par défaut à ce "
                          "cycle.",

    # ── Versement — plafonds et regles exceptionnelles ───────────────────
    "daily_cap_xaf": "Total versé par jour à un même partenaire. "
                     "0 = aucun plafond.",
    "monthly_cap_xaf": "Total versé par mois à un même partenaire. "
                       "0 = aucun plafond.",
    "max_offset_percent": "Part maximale d'un règlement qu'une retenue peut "
                          "absorber. Protège un partenaire d'un règlement "
                          "entièrement mangé par ses pénalités.",
    "min_settlement_after_offset_xaf": "Montant qui doit rester après "
                                       "retenues. En dessous, la retenue "
                                       "est reportée.",
    "exceptional_max_amount_xaf": "Plafond d'un règlement hors cycle.",
    "exceptional_max_percent_of_due": "Part maximale du dû qu'un règlement "
                                      "hors cycle peut verser.",
    "exceptional_max_per_month": "Règlements hors cycle autorisés par mois "
                                 "et par partenaire.",
    "exceptional_alert_share_percent": "Au-delà de cette part de règlements "
                                       "hors cycle, une alerte est levée : "
                                       "l'exception devient la règle.",

    # ── Risque — seuils de detection ─────────────────────────────────────
    "shared_msisdn_buyer_threshold": "Acheteurs partageant un même numéro "
                                     "avant alerte.",
    "shared_msisdn_window_days": "Fenêtre d'observation du partage de "
                                 "numéro.",
    "velocity_failed_attempts": "Échecs consécutifs avant alerte. Signale "
                                "souvent un test de carte volée.",
    "amount_review_threshold_xaf": "Montant à partir duquel une "
                                   "vérification est systématique.",
    "momo_change_lookback_days": "Ancienneté d'un changement de numéro "
                                 "encore considéré comme récent.",

    # ── Risque — poids des signaux ───────────────────────────────────────
    # Ces poids s'additionnent pour former le score. Les regler sans voir
    # leur somme mene a un seuil de blocage inatteignable, ou atteint par
    # tout le monde.
    "weight_shared_msisdn": "Points ajoutés au score si un numéro est "
                            "partagé.",
    "weight_velocity": "Points ajoutés si le rythme de paiement est "
                       "anormal.",
    "weight_amount": "Points ajoutés si le montant sort de l'ordinaire.",
    "weight_new_payer": "Points ajoutés pour un payeur inconnu.",
    "weight_momo_change": "Points ajoutés après un changement de numéro "
                          "récent.",
    "weight_failed_burst": "Points ajoutés après une série d'échecs.",

    # ── Risque — score de confiance ──────────────────────────────────────
    "trust_dispute_penalty": "Points retirés par litige ouvert.",
    "trust_late_penalty": "Points retirés par retard de livraison.",
    "trust_success_bonus": "Points gagnés par commande menée à bien.",
    "trust_window_days": "Période sur laquelle le score est calculé. "
                         "Au-delà, les incidents anciens sont oubliés.",
    "trust_adjustment_review_xaf": "Montant d'ajustement à partir duquel "
                                   "une revue manuelle est demandée.",
}

#: Les champs qu'on ne devrait modifier qu'en connaissance de cause.
SENSIBLES = {
    "mode", "is_enabled", "is_payout_enabled", "required_approvals",
    "auto_block_enabled", "auto_execute_on_approval", "require_kyc_verified",
    "min_payout_xaf", "min_amount_xaf",
}


def _type_frontend(champ) -> str:
    """Traduit un champ Django en type de saisie."""
    if getattr(champ, "choices", None):
        return "select"
    if isinstance(champ, models.BooleanField):
        return "boolean"
    if isinstance(champ, (models.IntegerField, models.PositiveIntegerField,
                          models.PositiveSmallIntegerField)):
        return "integer"
    if isinstance(champ, models.DecimalField):
        return "decimal"
    if isinstance(champ, models.JSONField):
        return "json"
    if isinstance(champ, models.TextField):
        return "text"
    return "string"


def _defaut(champ):
    """La valeur par defaut declaree, serialisable."""
    valeur = champ.get_default()
    if callable(valeur):
        try:
            valeur = valeur()
        except Exception:
            return None
    if isinstance(valeur, Decimal):
        return str(valeur)
    if valeur is models.NOT_PROVIDED:
        return None
    return valeur


def describe_model(modele) -> list[dict]:
    """
    Decrit les champs editables d'un modele de configuration.

    Retourne de quoi construire un formulaire sans rien coder en dur cote
    frontend : type, choix, defaut, aide, sensibilite.
    """
    champs = []
    for champ in modele._meta.get_fields():
        if not hasattr(champ, "attname"):
            continue
        if champ.name in CHAMPS_TECHNIQUES:
            continue
        if getattr(champ, "auto_created", False):
            continue

        champs.append({
            "name": champ.name,
            "label": str(getattr(champ, "verbose_name", champ.name)).strip()
            or champ.name.replace("_", " "),
            "type": _type_frontend(champ),
            "choices": [
                {"value": v, "label": str(l)}
                for v, l in (getattr(champ, "choices", None) or [])
            ],
            "default": _defaut(champ),
            # `blank` decrit la saisie ; `null` la base. C'est `blank` qui
            # dit si un formulaire peut laisser vide.
            "required": not getattr(champ, "blank", False),
            "help": AIDES.get(champ.name, ""),
            # Un reglage sensible merite une confirmation supplementaire.
            "sensitive": champ.name in SENSIBLES,
        })
    return champs