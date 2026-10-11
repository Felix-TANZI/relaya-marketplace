# VD-06 — Remise, reçu et erreurs : suivi des 12 sous-tâches

Sous-tâches (METHODE.md §3) : 1 balisage et t() · 2 source démo · 3 règles du registre et états · 4 vraies saisies et
issues · 5 enrichissement · 6 rôle Préparation et anonymat · 7 liens · 8 animations et sons · 9 photos · 10 clair /
sombre, FR / EN, 360–430 px, défauts corrigés · 11 test de gestes et boutons · 12 vérification.

| Écran | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Remise au livreur (`commande_prete`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Remis au livreur (`commande_remise`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Reçu vendeur (`recu`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Quand la remise bloque (`erreurs`) | x | x | x | x | x | x | x | x | x | x | x | x |

Statut « repris » dans `routes.ts` (pages.json se régénère en intégration : `npm run inventaire`).

## Règles appliquées
GEN-06, OFF-01, REM-01 à REM-09, VD06-R01 à R26, RCU-01 à RCU-04, ERR-01 à ERR-04, BOU-02, REFVD-R30/R50/R82/R114/
R136/R138/R140/R143/R144/R151 à R153 ; DP-55, DP-56 (Q-20 nouveau code, Q-49 fil support), DP-57 (P-7 échéance suspendue
pendant un blocage), Q-77, Q-87 (un libellé par moyen de paiement, PDF), Q-93 (hors connexion).
- Code demandé au toucher seulement (`afficherCode`, journalisé), jamais dans la lecture ; masqué à l'ouverture, en
  quittant l'écran, en arrière-plan, au changement de commande ; deux groupes de trois chiffres ; une seule action à la
  fois, aucun bouton plein orange ; passage seul à « Remis » quand le livreur a saisi le code (sondage 5 s tant que le
  code est affiché, et événement de la source).
- Paramètres lus du registre en vigueur : CODE-ESSAIS (3 ⇒ 24 h), TRANSP-PLAFOND (75 000 / 250 000 F) ; file hors
  connexion 72 h (OFFLINE_ACTION_TTL_H, absent du registre en vigueur : voir INTEGRATION.md).
- Montants : « Vous gardez » figé au paiement (`gardeFige`, src/calculs) ; aucun montant pour l'accès Préparation ;
  reçu réservé au propriétaire (ReserveAuProprietaire).

## Ajouts (enrichissement)
1. Commande pas encore prête : « C'est prêt » dans la carte clé (crée le code), en file hors connexion.
2. Compte à rebours « Arrive dans … » jusqu'au créneau du livreur ; jour du créneau en clair (aujourd'hui / demain).
3. Codes faux saisis : « n sur 3 » avant le blocage.
4. Remise bloquée : « Demander un nouveau code » (DP-56), note « l'ancien est annulé, il marchera dès le déblocage ».
5. Autres colis prêts pour le même passage du livreur (liens vers leur remise), sur Remise et sur Remis.
6. Liens Détail, Bon de préparation, Journal, « Quand la remise bloque » depuis la remise.
7. Cartes d'erreur réelles sur l'écran de remise (livreur absent, bloquée, annulée, délai dépassé avec « C'est prêt »
   sur place, pas de réseau, colis de valeur).
8. Remis : photos agrandies au toucher (feuille, heure et lieu de la prise), frise live (palier, délai de libération,
   numéro masqué), Journal.
9. Reçu : puces = vrais reçus de la boutique ; « Tous » ouvre la liste avec recherche (référence ou article) ; PDF
   partagé (feuille de partage) ou téléchargé ; « où en est cet argent » (libération, vendredi du versement) ; lien vers
   la commande ; payable au retrait non encaissé : pas de reçu (dit pourquoi).
10. Erreurs : « En ce moment » liste les incidents réels (et « pas de réseau » constaté), chaque puce écrit le cas sur la
    commande concernée ou, sinon, sur un exemple marqué ; « Pourquoi ? » replié.
11. Démonstration (source « demo » seulement, carte en pointillés) : application du livreur (six cases de `CasesCode`
    du client — SaisieCode), livreur absent, client qui annule. Absente avec la source « api ».
12. Sons (`code`, `retrait`, `erreur`, `notification`, `copie`) et vibration à l'affichage du code ; chiffres qui
    apparaissent un à un, sablier qui respire, coche dessinée et gerbe sur Remis (`.blv-succes`) — tout coupé en
    mouvement réduit et sous navigateur piloté.

## Écrans retirés
Aucun. Les puces de moyens de paiement du reçu (exemples du prototype) sont remplacées par les vrais reçus ; les puces
« prototype seulement » de l'écran Erreurs servent d'aide sur les cas, avec les incidents réels au-dessus.

## Tests
`tests/VD-06.gestes.spec.ts` (10 tests, verts) ; squelette filtré sur les 4 routes (clair FR 360/430, sombre EN) vert ;
boutons (`BOUTONS_ROUTES=commande_prete,commande_remise,recu,erreurs`) vert ; en-tête identique (3 rendus) vert.
Écran entier identique : non tenu (contenu enrichi et données réelles) — voir INTEGRATION.md.

## Questions
- « Remise au relais » par le vendeur : aucune règle du paquet (le dépôt au relais est fait par le livreur, code
  `code_remise_relais`, Q-77). Non ajouté ; la frise de Remis dit « Retiré par le client · au relais ou à domicile ».
- Reçu payé depuis l'étranger : le prototype écrit le montant payé en dollars / euros (« 35,26 $ ») ; c'est le total
  payé par le client (interdit au vendeur, GEN-01) : seul le type de carte est écrit.
- « MTN Mobile Money » : l'opérateur du client n'est pas dans les données ; « Mobile Money » est écrit.
