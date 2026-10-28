# backend/apps/vendors/vd07_constants.py
# VD-07 (litiges / retours vendeur) — delais et seuils metier.
#
# Regle suivie ici : AUCUN chiffre n'est invente. Une valeur n'est reprise que si elle est deja
# ecrite ailleurs dans le depot (code Django existant OU commentaires du contrat frontend deja
# livre dans espace-client-belivay/espace-vendeur/src/donnees/domaines/{litiges,retours}.ts et
# src/api/domaines/{litiges,retours}.ts). Chaque constante confirmee cite sa source exacte.
#
# Ce qui N'A ETE TROUVE NULLE PART dans le depot reste a None, avec un commentaire "A CONFIRMER" —
# notamment les 4 valeurs signalees explicitement par la demande (seuils petit litige 3000F/10000F,
# fenetre vice cache 100 jours, fenetre retour 7 jours). Elles sont evoquees en reunion d'equipe
# mais n'apparaissent dans AUCUN fichier du depot : ne pas les cabler sans validation du porteur.

# ── Litiges ───────────────────────────────────────────────────────────────────
# LIT-VENDEUR-H : deja utilise dans le code Django (backend/apps/orders/admin.py action
# "contacter le vendeur" -> vendor_reply_deadline = now + 48h ; aussi le help_text du champ
# Dispute.vendor_reply_deadline). Repris ici, pas invente.
# LIT_VENDEUR_H : réglage de la spec v2.1, voir REGLAGES en fin de fichier.

# LIT-DECISION-H : ecrit dans src/donnees/domaines/litiges.ts ("BelivaY decide ... au plus tard
# LIT-DECISION-H (24 h) apres l'echeance").
LIT_DECISION_H = 24

# LIT-RECOURS-H : ecrit dans src/donnees/domaines/litiges.ts ("un recours ... sous LIT-RECOURS-H
# (48 h) apres la decision").
LIT_RECOURS_H = 48

# LIT-ARRANG-MIN : ecrit dans src/api/domaines/litiges.ts ("arrangement de 40 caracteres au
# moins").
# LIT_ARRANGEMENT_MIN_CHARS : réglage de la spec v2.1, voir REGLAGES en fin de fichier.

# LIT-ARRANG-REPONSE-J : AUCUNE valeur trouvee dans le depot (ni backend ni frontend). A CONFIRMER.
LIT_ARRANGEMENT_REPONSE_J = None

# LIT-BROUILLON-H : ecrit dans src/donnees/domaines/litiges.ts ("garde sur l'appareil 24 h
# (LIT-BROUILLON-H ; REP-04 hors connexion)").
LIT_BROUILLON_H = 24

# LIT-AUTO-STD / LIT-AUTO-ELEVE : seuils d'arbitrage automatique "petit litige" evoques en
# reunion d'equipe (~3000F / ~10000F) mais ABSENTS du depot (backend et frontend). A CONFIRMER
# par le porteur avant tout cablage — ne pas deviner le montant.
LIT_AUTO_SEUIL_STANDARD = None
LIT_AUTO_SEUIL_ELEVE = None

# ── Retours ───────────────────────────────────────────────────────────────────
# RET-TRAJET : cout du trajet retour factue a la partie en tort (DP-56 Q-27). AUCUN montant
# trouve dans le depot. A CONFIRMER.
# RET_TRAJET : réglage de la spec v2.1, voir REGLAGES en fin de fichier.

# RET-REMPL-DELAI : ecrit dans src/donnees/domaines/retours.ts ("remplacer (expedie sous 72 h
# ouvrees, dimanche non compte, sinon remboursement automatique, VD07-R31)").
# RET_REMPLACEMENT_DELAI_H : réglage de la spec v2.1, voir REGLAGES en fin de fichier.

# RET-VICE : fenetre "vice cache" evoquee en reunion d'equipe (~100 jours) mais ABSENTE du
# depot. A CONFIRMER par le porteur — ne pas deviner le nombre de jours.
RET_VICE_J = None

# RET-DEFAUT-H : AUCUNE valeur trouvee dans le depot (distinct de RET-02, voir plus bas). A
# CONFIRMER.
# RET_DEFAUT_H : réglage de la spec v2.1, voir REGLAGES en fin de fichier.

# RET-FENETRE : fenetre generale de retour evoquee en reunion d'equipe (~7 jours) mais ABSENTE
# du depot. A CONFIRMER par le porteur — ne pas deviner le nombre de jours.
# RET_FENETRE_J : réglage de la spec v2.1, voir REGLAGES en fin de fichier.

# RET-INSPECT-H : ecrit dans src/donnees/domaines/retours.ts ("inspection a la reception ...
# sous RET-INSPECT-H (48 h apres la remise reelle du retour, Q-72)").
# RET_INSPECTION_H : réglage de la spec v2.1, voir REGLAGES en fin de fichier.

# RET-02 : fenetre de signalement d'un defaut cache apres retrait, ecrite dans
# src/donnees/domaines/retours.ts ("defaut cache : 48 h apres le retrait, RET-02"). Distincte de
# RET-DEFAUT-H ci-dessus (non trouvee).
# RET_SIGNALEMENT_H : réglage de la spec v2.1, voir REGLAGES en fin de fichier.

# INP-01 : nombre minimum de photos exigees a l'inspection, evoque dans le commentaire de
# src/donnees/domaines/retours.ts sans un chiffre explicite ("au moins" des photos) — mais le
# commentaire d'integration (api/routes/retours.ts) ecrit "2 photos au moins (INP-01)".
RET_INSPECTION_MIN_PHOTOS = 2


def regles_litiges_payload() -> dict:
    """Construit le corps JSON de GET /disputes/rules (type ReglesLitiges du frontend).

    Les champs dont la valeur n'est pas confirmee (voir commentaires ci-dessus) sont renvoyes a
    None plutot qu'avec un chiffre invente — a documenter cote produit avant mise en prod."""
    return {
        "reponseH": __getattr__("LIT_VENDEUR_H"),
        "decisionH": LIT_DECISION_H,
        "recoursH": LIT_RECOURS_H,
        "arrangementMin": __getattr__("LIT_ARRANGEMENT_MIN_CHARS"),
        "arrangementReponseJ": LIT_ARRANGEMENT_REPONSE_J,
        "brouillonH": LIT_BROUILLON_H,
        "seuilStandard": LIT_AUTO_SEUIL_STANDARD,
        "seuilEleve": LIT_AUTO_SEUIL_ELEVE,
        "trajet": __getattr__("RET_TRAJET"),
        "remplacementH": __getattr__("RET_REMPLACEMENT_DELAI_H"),
        "viceJ": RET_VICE_J,
        "defautH": __getattr__("RET_DEFAUT_H"),
        "fenetreJ": __getattr__("RET_FENETRE_J"),
        "inspectionH": __getattr__("RET_INSPECTION_H"),
    }


# ── Spec v2.1 (feuille de route D18) : ces délais et montants sont désormais des réglages r_… ──────────────
# Lus à chaque accès (module __getattr__) : un changement dans l'admin des réglages s'applique tout de suite.
REGLAGES = {
    "LIT_VENDEUR_H": "r_litige_reponse_h",            # R70.1
    "LIT_ARRANGEMENT_MIN_CHARS": "r_arrangement_min_car",  # R70.1
    "RET_TRAJET": "r_retour",                          # R69.1
    "RET_REMPLACEMENT_DELAI_H": "r_remplacement_h",    # R70.2
    "RET_DEFAUT_H": "r_defaut_cache_h",                # R67.2
    "RET_SIGNALEMENT_H": "r_defaut_cache_h",           # R67.2
    "RET_FENETRE_J": "r_retour_j",                     # R67.1
    "RET_INSPECTION_H": "r_inspection_h",              # R68.1
}


def __getattr__(nom):
    if nom in REGLAGES:
        from apps.regles import services as regles

        return regles.reglage(REGLAGES[nom])
    raise AttributeError(nom)
