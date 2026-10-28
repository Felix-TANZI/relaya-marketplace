# S1 — besoins dans les fichiers communs (vague d'intégration)

1. `src/demo/compteurs.ts` : le compteur « litige » lit encore `LITIGES` du jeu d'essai ; le brancher sur
   `litigesOuverts()` de `src/demo/litiges.ts` (filtré par `voir(role)`) pour qu'un litige décidé disparaisse du badge. — **fait** (intégration : `compteurs.ts` lit `litigesOuverts()` filtré par `voir(role)` et par périmètre ; un litige décidé quitte le badge à la relecture de session).)
2. `src/demo/pont.ts` : types d'événements à ajouter pour relier la console aux autres espaces —
   `litige_decide` (client, vendeur : décision et motif ; entreprise : retenue si transporteur en cause),
   `commande_annulee` (client : remboursement au moyen d'origine ; vendeur : commande retirée). Aujourd'hui les suites
   sont écrites dans le dossier (« Suites envoyées aux espaces ») et au journal. — **fait** (intégration : `litige_decide` et `commande_annulee` typés dans `pont.ts` et publiés par `litiges.ts` (`appliquer`) et `commandes.ts` (`annulerVraiment`), une fois par dossier).)
3. `src/config/droits.ts` : ouvrir à la Médiation la décision sur une retenue de kit contestée (ADM-CACHEE-03), par
   exemple `livreurs : ['part', 'Retenues de kit contestées']`, sinon la carte de la File mène à une page fermée. — **fait** (intégration : `livreurs` : Médiation `['part', 'Retenues de kit contestées']`).)
4. `src/config/parametres-proposes.ts` (ou le registre officiel) : verser les codes lus aujourd'hui dans
   `logique-metier/admin/parametres-admin.json` (ADM-VERROU-MIN, QUEUE-SURCHARGE-DIRECTION, ADM-KYC-HUMAIN-H,
   LIT-MEDIATEUR-J, LIT-CLIENT-SILENCE-J, ADM-SESSION-INACTIF-MIN, ADM-BRIS-GLACE-H), puis `regles.ts` ne lira plus que
   le registre (le fichier du catalogue pèse 168 ko dans le paquet). — **fait** (intégration : ces sept codes et
   `ADM-2FA-CODES-FAUX` (3, ancienne constante `CODES_FAUX_MAX`) sont au registre officiel, A-VALIDER § 4 ; `regles.ts`
   lit par `src/calculs/registre.ts` seulement).
5. `src/composants/LigneJournal.tsx` (`Heure`) : le commentaire promet le jour quand ce n'est pas aujourd'hui, le code
   ne le fait pas ; S1 utilise `Quand` (`src/pages/ADM-03/kit.tsx`), à verser au socle. — **fait** (intégration : `Heure` affiche le jour quand ce n'est pas aujourd'hui (`useHorloge`) ; `Quand` en est l'alias, exporté par le socle et repris par `ADM-03/kit.tsx`).)
6. `src/composants/Masque.tsx` : accepter une liste de rôles par donnée (le téléphone du client : Support et Direction
   seulement, ADM-P04R-03) ; S1 le fait dans l'écran et la source en attendant. — **fait** (intégration : `Masque` accepte `roles` ; Commandes passe `['support', 'superviseur']` pour le téléphone du client).)
7. Effets à quatre yeux d'autres domaines : `effetQuatreYeux(prefixe, f)` (`src/demo/quatreyeux.ts`) est prêt ;
   S2 l'utilise pour `remboursement.executer` (QY-0007 n'a pas encore d'effet). — **fait** (intégration : rien à ajouter : S2 lit la décision QY-0007 dans `etatRemb` ; à la contre-signature, `remboursement_execute` part au pont).)
8. `src/demo/lectures.ts` : `demoCommandes`, `demoLitiges`, `demoDirect` en sont sortis ; `source-demo.ts` les importe
   de `commandes.ts`, `litiges.ts`, `direct.ts`. — **fait** (intégration : constaté : `source-demo.ts` importe les trois domaines de leurs fichiers).)
