# VD-05 — Commandes et préparation : suivi (vague 2)

Écrans : `commandes`, `commande`, `rupture`, `delai`, `bon`, `journal` — tous **repris** (`routes.ts`).
Domaines possédés : `commandes`, `preparation` (types dans `src/donnees/domaines/`, démonstration dans `src/demo/`).

## Les 12 sous-tâches, écran par écran

| Écran | 1 balisage, t() | 2 source | 3 règles, états | 4 saisies, issues | 5 ajouts | 6 rôle, anonymat | 7 liens | 8 animations, sons | 9 images | 10 thèmes, langues, largeurs | 11 tests | 12 vérification |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Commandes reçues | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Commande à préparer | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Rupture | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Besoin de plus de temps | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Bon de préparation | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Journal de la commande | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |

Détail par sous-tâche (commun aux six écrans) :
1. Balisage de `route('…')` du prototype gardé (classes, styles, un nœud de texte par nœud), en-têtes de la coque
   intouchables (`tests/identique` : en-tête au pixel, clair, sombre, anglais — 18 tests verts) ; titres d'en-tête
   qui portent la référence (« Commande BLV-00009 », « Rupture · BLV-00009 »…) ; tous les textes par `t()` / `tf()`,
   anglais dans `src/i18n/VD-05.en.json` (aucune clé en double, test squelette vert).
2. `useLecture(() => source.commandes.… / source.preparation.…)` ; aucun import de `src/demo/` dans un écran ;
   montants gardés et gelés calculés par `src/calculs` dans la démonstration (`gardeFige`), jamais écrits.
3. Règles appliquées : CMD-01…10, VD05-R01…R15, VD02-C01…C08, PRE-01…06, RUP-01…04, DEL-01…04, BON-01/02,
   JRN-01/02, OFF-01, ACC-27, ARG-07, DP-01, DP-55, DP-56 (Q-17, Q-38, Q-53), DP-57 (P-6), REFVD-R127…R155,
   REFCL-R043. États : chargement (squelette), erreur réseau (« Pas de connexion » + Réessayer), commande
   introuvable, vides par filtre, hors connexion (liste gardée et son heure, gestes réseau grisés, « C'est prêt » en
   file 72 h avec son heure d'origine), somme ≠ total (rechargement, jamais un chiffre faux), commande plus à préparer.
4. Gestes réels : « C'est prêt » (liste et commande), cases cochées et signées, scan / saisie de la référence
   (refus avec la référence attendue), interrupteur du stock, rupture avec 5 s pour annuler, choix de nouvelle heure
   (grisés au-delà de l'échéance absolue), impression, PDF réel, export CSV, copies (résumé, journal), filtres et
   recherche. Aucun bouton mort (`tests/boutons`, 34 adresses dont les états du prototype : verts), aucun lien « # ».
5. Ajouts : voir la liste ci-dessous.
6. Accès Préparation : aucun montant (prix, gardé, gelé, moyen de paiement), ni facture, ni reçu (une commande
   terminée ouvre la commande) ; « Ajouter des preuves » au lieu de « Répondre » (Q-17) ; anonymat : rien du client,
   le message du client est « le client », bon et PDF sans donnée du client ni code de remise.
7. Liens : remise et code (`commande_prete`), reçu (`recu`), litige (`litige?ref=`), retours, conversation du client
   (`messages?fil=`), documents (factures), aide ; le scénario `?role=prep` est gardé d'un écran à l'autre.
8. Animations de la famille du client : cascade des cartes, pastille glissante des filtres `.seg`, choix en liste
   `.radio`, minuteur qui défile chiffre à chiffre (`Chiffres`), coche et gerbe sur un avis de succès
   (`.blv-succes`), feuilles du bas (`Feuille`), tirer pour actualiser ; sons : prêt (`retrait`), case et interrupteur,
   bonne référence (`code`), refus (`erreur`), fin du minuteur (`fin`), avis (`notification`), copie. Tout est coupé en
   mouvement réduit et sous navigateur piloté (`mouvementLibre()` du client).
9. Illustrations du prototype par `Vignette` (remplaçables par une vraie photo : adresse ou `data:`), portrait du
   livreur remplaçable (`livreur.photo`), logo BelivaY du bon.
10. Clair et sombre, FR et EN (heures « 12:42 pm », montants « 17,840 F »), 360 à 430 px sans débordement
    (squelette vert) ; défauts du prototype corrigés : 4 (rupture / délai de BLV-00009 aux heures de BLV-00009, en
    anglais aussi), 5 (« Demander jusqu'à demain 08 h » traduit) ; montants affichés par erreur à l'accès Préparation
    dans le prototype (`#commandes?role=prep`) retirés.
11. `tests/VD-05.gestes.spec.ts` (27 tests), `src/pages/VD-05/calendrier.test.ts` (9 tests), `tests/boutons` sur les 6
    routes et leurs états, `tests/squelette` filtré sur les 6 routes, `tests/identique` (en-têtes) ; statut « repris ».
12. Trois relectures : règles (registre filtré sur les 6 écrans : 104 règles), tests verts, relecture du code.

## Ajouts (enrichissement)

- **Commandes reçues** : recherche (référence, article, variante, référence de boîte) ; sous-filtres de « Terminées »
  (Se libère · À verser · Versées · Annulées, avec leur nombre) ; commandes prêtes en attente du livreur dans « En
  cours » (« Remettre au livreur ») ; annulées gardées avec leur motif (Q-73) ; « Dépassement dans … » et « Délai
  dépassé » ; livreur et jour de passage ; menu ⋮ en feuille (export CSV sans donnée du client et sans montant pour
  l'accès Préparation, copie du résumé, factures, aide) ; tirer pour actualiser ; avis après un geste ; hors connexion.
- **Commande** : préparation article par article (4 cases partagées avec le bon, qui a coché), scan de la référence,
  message du client (non lus, réponse), état et suite de toute commande (prête, chez le livreur, livrée, litige,
  retour, annulée), alerte de dépassement, reprise du décompte boutique fermée, durée ouvrée réelle (« 6 h ouvrées
  (prolongée une fois) » après + 2 h), reçu, minuteur animé et son de fin.
- **Rupture** : délai de 5 s pour annuler l'envoi, deux essais du vendeur suivant expliqués (DP-01), effet plus lourd
  annoncé après l'échéance, interrupteur qui dit ce qui se passe s'il est coupé, commande déjà en rupture ou plus à
  préparer.
- **Plus de temps** : heures d'ouverture (+ 1 h, + 2 h ouvrées ; jour d'ouverture suivant), effet sur le livreur
  calculé (P-6 : créneau suivant écrit avant l'envoi), échéance absolue en 24 heures d'ouverture (Q-38), choix gardé
  dans l'adresse, refus expliqués, état « déjà demandé ».
- **Bon** : cases réelles, scan, choix A4 / ticket 80 mm (feuille d'impression dédiée), vrai PDF (partage ou
  enregistrement), ouverture signée au journal.
- **Journal** : histoire complète des commandes (paiement, file, retrait, litige, retour, confirmation, libération,
  versement), séparateurs par jour, filtre par auteur, copie comme preuve, avant → après (stock, heures).

## Écrans retirés

Aucun : les six écrans ont une utilité réelle.

## Questions

- Montant gardé d'un iPhone 15 Pro Max (350 000 F) : le calcul commun donne 339 640 F gelés (découverte comprise,
  Q-57) ; REFVD-R68 écrit 335 324 F. Voir INTEGRATION.md, point 7.
