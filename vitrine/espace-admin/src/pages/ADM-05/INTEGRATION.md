# S2 — besoins dans les fichiers communs (vague d'intégration)

1. **Paramètres** : déplacer `pages/ADM-05/parametres-s2.json` dans `src/config/parametres-proposes.ts` (et au registre :
   `VD-TAUX-*`, `VD-TAUX-MIN`, `AUTO-REMB-*`, `RAPPRO-ECART-CARTE-H`, `FIN-MIN-PERCEPTION`, `VERSEMENT-CONTROLE-FIN-H`,
   `WALLET-CODE-SEUIL`) ; corriger au registre `WALLET-PLAFOND` (500 000 F), `WALLET-RETRAIT-FRAIS` (3 %),
   `REMB-DESTINATION` (moyen d'origine), `VD-COM-MODELE` (V02). — **fait** (intégration : les codes S2 sont au registre
   officiel, `parametres-s2.json` supprimé ; les valeurs déjà au registre n'ont pas été changées — écarts notés dans
   A-VALIDER § 4 — et `WALLET-PLAFOND-V6` / `WALLET-RETRAIT-FRAIS-V6` sont retirés : l'écran lit `WALLET-PLAFOND` et
   `WALLET-RETRAIT-FRAIS`, 1 % et 100 F au moins).
2. **Calculs** : déplacer `pages/ADM-05/regles.ts` (+ test) dans `src/calculs/argent.ts` (lecture du registre, commission V02,
   versements, garde, remboursements, Wallet). — **fait** (intégration : `src/calculs/argent.ts` et `argent.test.ts`,
   imports des écrans ADM-05, ADM-10 et de `demo/argent.ts` mis à jour).
3. **Compteurs et File d'action** (`demo/compteurs.ts`, `demo/files.ts`) : lire les remboursements de `demo/argent.ts`
   (`demoArgent.remboursements()` : états déduits des décisions) au lieu de `REMBOURSEMENTS` du jeu d'essai ; ajouter les
   cartes Finance (`argentDemo.lire().cartes`), les lots à contrôler (`versement.controle`), les dettes de relais. — **fait** (intégration : `files.ts` et `compteurs.ts` lisent `remboursementsVus()` et `lotsDuCycle()` (`demo/argent.ts`) : cartes « Finance » pour les lots à contrôler, les dettes de relais reportées et les cartes ouvertes par la Finance).)
4. **Pont** (`demo/pont.ts`) : événements à typer et publier (`par: 'admin'`) : `remboursement_execute` (client : SMS et
   reçu), `versement_credite` (vendeur 1 % retenu, relais après espèces, entreprise sans frais), `grille_annoncee`
   (vendeur : 30 jours avant), `reprise_vendeur`. — **fait** (intégration : les quatre types sont dans `pont.ts` ; `remboursement_execute` est publié (exécution directe et après contre-signature). `versement_credite`, `grille_annoncee`, `reprise_vendeur` sont typés mais pas publiés : la démo n'a pas de geste d'envoi des lots, d'annonce de grille ni de reprise ; à publier quand ces gestes existeront).)
5. **Pages ajoutées** en vraies routes (une ligne de matrice chacune dans `config/droits.ts`, une entrée de navigation) :
   `wallet` (Direction, Finance, Support et Médiation en lecture, Audit lecture), `remb-auto`, `frais-paiement` ; elles
   sont aujourd'hui servies par `escrow?vue=wallet`, `remboursements?vue=auto`, `rapprochement?vue=frais`. — **fait** (intégration : routes `wallet`, `remb-auto`, `frais-paiement` dans `ADM-05/routes.ts`, lignes de matrice, entrées de navigation (groupe Argent) ; `source.argent.wallet()` exige la page `wallet` ; les `?vue=` sont retirés, tests mis à jour).)
6. **Versements · Support** : l'écran « hors périmètre » du prototype (fiche commande, transmettre à la Finance) ne
   s'affiche pas, la coque montre « Réservé » ; proposer un contenu de refus propre à la route. — **fait** (intégration : `Reserve` (Garde.tsx) porte un refus propre à la route et au rôle : Versements · Support renvoie à la fiche de la commande et à la Finance).)
7. `demo/lectures.ts` : `demoArgent` en est sorti (branché depuis `demo/argent.ts` dans `source-demo.ts`). — **fait** (intégration : constaté).)
