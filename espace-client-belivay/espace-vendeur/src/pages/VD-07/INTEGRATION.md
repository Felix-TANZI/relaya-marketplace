# VD-07 — changements demandés hors du groupe (vague d'intégration)

Fichiers communs ou d'autres groupes que VD-07 n'a pas touchés. Chaque point dit le changement exact.

## 1. Calculs (`src/calculs/`)
1. **Paramètres des litiges et retours** : déplacer `lireReglesLitiges()` de `src/demo/litiges.ts` vers
   `src/calculs/registre.ts` (comme `lire_litiges` de `moteurs/belivay_moteurs/registre.py`) et l'ajouter à
   `PARAMETRES` (`litiges`) ; codes lus : LIT-VENDEUR-H, LIT-DECISION-H, LIT-RECOURS-H, LIT-ARRANG-MIN,
   LIT-ARRANG-REPONSE-J, LIT-BROUILLON-H, LIT-AUTO-STD, LIT-AUTO-ELEVE, RET-TRAJET, RET-REMPL-DELAI, RET-VICE,
   RET-DEFAUT-H, RET-FENETRE, RET-INSPECT-H. La démonstration importera alors depuis `src/calculs`.
2. **Portage de `moteurs/belivay_moteurs/litiges.py` dans `src/calculs/litiges.ts`** (avec les exemples du moteur
   en tests Vitest) : `echeances`, `recours_possible`, `fin_du_gel`, `fin_reponse_arrangement`, `fin_inspection`,
   `echeance_remplacement` (aujourd'hui `echeanceOuvree` dans `src/demo/litiges.ts`), `rembourser_retour`,
   `du_du_vendeur`. Puis `src/demo/litiges.ts` et `src/demo/retours.ts` les appellent.
3. **Part de livraison d'un colis** (`frais_de_livraison`, `moteurs/belivay_moteurs/annulation.py`) : non portée ;
   les écrans disent « vous payez le trajet retour (500 F) et la livraison du colis » sans le montant de la
   livraison. Ajouter le calcul et un champ `livraisonRetour: Francs | null` à `Litige` et à `Retour.couts`.

## 2. Accueil (VD-04, `src/pages/VD-04/Accueil.tsx`, `src/demo/accueil.ts`, domaine `accueil`)
1. Carte litige : « Sans réponse, la décision est prise en faveur du client. » → « Sans réponse, BelivaY décide en
   partant de ce que dit le client. » (DP-35, ACC-05, LIT-02) — `src/i18n/VD-07.en.json` porte déjà l'anglais.
2. Carte litige : titre et vignette écrits (« iPhone 15 Pro Max », `flagship`) → l'article du litige
   (`ElementAFaire` litige : ajouter `article: ArticleVendu`, lu dans `litigesOuverts()[i].article`).
3. Carte retour : « Vous aurez 48 h pour l'inspecter » → `REGLES.inspectionH` (paramètre RET-INSPECT-H) ; le
   bouton « Voir le retour » peut mener à `chemin('retours', { f: 'en_route' })`.
4. `litigesOuverts()` / `retoursOuverts()` gardent leur forme ; `Retour.motif` vaut désormais la catégorie en mots
   (« défaut caché ») et `phraseClient` porte la phrase du client.

## 3. Commandes et argent (VD-05, VD-09 : `src/demo/commandes.ts`, `src/demo/argent.ts`)
1. CMD-07 : un litige clos (« J'accepte », ou décision sans recours) reste à l'étape `litige` du magasin
   `commandes` : il doit quitter « Problèmes » quand `litiges.detail(ref).etat === 'clos'` (et un retour quand
   `retours.detail(ref).etat === 'clos'`).
2. Argent gelé (`argentGele`) : calculé sur l'étape des commandes ; il doit exclure les litiges acceptés et les
   retours remboursés, et garder gelée la somme d'un litige gagné pendant le délai de recours (Q-26, `fin_du_gel`).
   `litiges.compteurs().gele` donne déjà le bon total des litiges en cours.
3. Remplacement (REFCL-R080) : un remplacement proposé devrait créer une sous-commande « à préparer » (même
   parcours que toute commande : C'est prêt, remise au livreur). En attendant, « Le remplacement est prêt » sur la
   carte du retour (`retours.remplacementPret`) en tient lieu.

## 4. Messagerie et notifications (VD-11)
1. « Relire les messages de la commande » mène à `messages?ref=BLV-…` : la messagerie doit ouvrir (ou créer) le
   fil de cette commande (REP-03) ; le fil d'un litige se ferme à la clôture du dossier (Q-70).
2. Notifications à produire (VD11-R44, R46, VD07-R18, R24, R31) : litige ouvert + rappels 24 h et 6 h avant
   l'échéance (SMS + notification, lien `litige?ref=`), décision (`litige_envoye?ref=`), retour signalé, retour
   arrivé (`inspection?ref=`), remboursement automatique (inspection ou remplacement en retard), colis non retiré
   (« BLV-… n'a pas été retiré : il vous revient, sans frais ni effet sur votre Trust Score », lien vers le
   produit pour le remettre en stock).

## 5. Contestation (VD-10)
La route `#contester` de VD-10 traite les sanctions. Le recours d'un **litige** perdu (une fois, sous 48 h,
DP-56 Q-26) se fait dans une feuille de « Décision et suites » (`source.litiges.contester`). Si l'on préfère un
seul écran de contestation, VD-10 peut accepter `contester?litige=BLV-…` et appeler `source.litiges.contester`.

## 6. Source API (vague 3, `src/api/source-api.ts`)
`ROUTES_ATTENDUES` à compléter :
- litiges : `GET /disputes?state= · GET /disputes/{id} · POST /disputes/{id}/answer · POST|DELETE
  /disputes/{id}/evidence · POST /disputes/{id}/appeal · GET /config` (brouillon : sur l'appareil) ;
- retours : `GET /returns?state= · GET /returns/{id} · POST /returns/{id}/received · POST|DELETE
  /returns/{id}/photos · POST /returns/{id}/inspection · POST /returns/{id}/replacement · POST
  /returns/{id}/replacement/ready`.

## 7. Inventaire
`npm run inventaire` : les six routes de VD-07 passent à « repris » dans `src/genere/pages.json`.

## 8. Démonstration
`?role=prep` est un scénario d'adresse : il se perd en passant d'un écran à l'autre (les tests rouvrent l'adresse
avec `role=prep`). Rien à changer si la session porte le rôle en production.

## Vague d'intégration (6 oct.) — état de chaque point

- [x] 1.1 Règles lues par `PARAMETRES.litiges` (`lireLitiges` du registre, comme le moteur) ; LIT-ARRANG-MIN et LIT-BROUILLON-H restent lus par la démonstration.
- [x] 1.2 Calculs des litiges (portés par l'agent des calculs) appelés par la démonstration : `echeanceRemplacement`, `finInspection`, `finDuGel`, `recoursPossible`.
- [ ] 1.3 Part de livraison d'un colis : champ `livraisonRetour` ajouté (Litige, Retour.couts) ; la valeur vient du serveur (GEN-01) — INTEGRATION-API.md §2.
- [x] 2.1 Phrase DP-35 sur la carte litige de l'accueil. - [x] 2.2 Article réel du litige. - [x] 2.3 `RET-INSPECT-H` et « Voir le retour » → `retours?f=en_route`. - [x] 2.4 Informatif.
- [x] 3.1 Un litige ou un retour clos quitte « Problèmes » (`etatEffectif`). - [x] 3.2 Argent gelé sans les dossiers clos, gelé pendant le recours. - [x] 3.3 Remplacement → sous-commande « à préparer » (`creerSousCommande`).
- [x] 4.1 `messages?ref=` ouvre ou crée la conversation ; elle se ferme à la clôture du dossier. - [x] 4.2 Notifications : rappels 24 h / 6 h, décision, retour arrivé, remboursement automatique ; « colis non retiré » : aucun cas dans le jeu d'essai, produit par le serveur (INTEGRATION-API.md §2).
- [ ] 5. Un seul écran de contestation : non retenu — la feuille de « Décision et suites » reste, et `contester?ref=` (VD-10) appelle aussi `source.litiges.contester`.
- [x] 6. INTEGRATION-API.md §1. - [x] 7. pages.json. - [x] 8. `?role=prep` conservé de lien en lien.
