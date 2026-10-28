# AJ-B — pages ajoutées (DP-58) : intégration

Six pages, téléphone et tablette d'abord, en-tête de page secondaire du prototype (retour · titre · marque), barre
du bas, famille visuelle du prototype (carte nuit, cartes, lignes, pastilles, `.seg`) et animations du client
(pastille des sélecteurs, cascade, `blv-succes`, sons ; coupées en mouvement réduit). FR / EN (`src/i18n/AJ-B.en.json`).

| Route | Page | Où on l'ouvre |
|---|---|---|
| `profil` | Mon profil (la personne, distincte de Ma boutique) | avatar de l'en-tête (menu du profil : la carte du membre et « Mon profil »), Menu › Mon compte, Paramètres |
| `recherche` | Rechercher partout (`?q=`) | Menu (lien sous « Chercher dans le menu », ou « Chercher « … » partout »), menu de l'avatar |
| `ramassages` | Calendrier des passages du livreur (`?j=auj|dem|sem`) | Menu › À traiter, Rechercher (raccourci) |
| `apprendre` | Centre de formation (`?fiche=photos|prix|colis|litiges|palier`) | Menu › Messages et aide, Mon profil, Ramassages, Rechercher |
| `activite` | Activité de la boutique (journal de toutes les commandes) | Menu › Ma boutique |
| `ajustements` | Mes ajustements (vue réelle seller.belivay.com, 17.jpg) | Mon argent (VD-09), Menu › Mon argent |

## 1. Règles appliquées

- **Mon profil** : DP-52 (photo rognée, nom, e-mail et téléphone avec codes), PAR-01 / VD11-R09 (nom du titulaire par
  le support ; l'employé change son nom avec un code), REFVD-R297, SEC-01 (appareils : ville, jamais l'IP), Q-18 (rôle
  Préparation : ce qu'il permet, ce qu'il ne permet pas), DP-13 (FR / EN). Vue réelle 18.jpg reprise en plus simple :
  identifiant non modifiable, prénom, nom, e-mail, téléphone, **présentation (bio) facultative** (160 signes, sans
  numéro, e-mail ni lien — GEN-08 —, vue par l'équipe et l'agent de zone, jamais par les clients).
- **Rechercher** : anonymat (rien du client n'est cherché), versements seulement pour le propriétaire (Q-18) ; une
  référence exacte passe en tête ; recherches récentes = commodité de l'appareil (localStorage, effaçables).
- **Ramassages** : heures de passage de la boutique, jours fermés (horaires, « Fermer aujourd'hui », fermetures, pause
  Q-39), créneau donné par le serveur (REM-02, P-6), créneau manqué (E9) avec délai suspendu (DP-57 P-7), support
  2 h, 7 h–21 h (Q-47, lu dans `aide.contacts`), liens Remettre (VD-06) / Préparer (VD-05).
- **Apprendre** : contenus sans aucun montant écrit ; règles citées : P-1 (contrôles automatiques), Q-36 (prix
  conseillé), prix minimum (DP-55), BON-01 (4 vérifications), REM-01/03/06, DP-56 Q-26 (recours 48 h), A-5/A-6
  (paliers), DP-14/P-3 (mérite, jamais payé). L'accès Préparation n'a pas le lien « Ajouter un produit ».
- **Mes ajustements** — conflit tranché en faveur du paquet : **GAI-01 / REFVD-R74** interdit d'afficher « commission
  retenue » ou « prélevé » (le vendeur voit ce qu'il garde ; le détail de la commission reste dans le contrat et la
  facture du mois). La vue réelle listait « Commission sur BLV-… » : ici chaque vente montre son prix et « vous
  gardez », les **reprises** (GAI-03) sont les seules lignes négatives, avec leur motif ; lien vers les factures
  (Documents) ; export comptable CSV (le mois, ou tout depuis la signature). Montants lus dans `argent.gains`, jamais
  calculés ; réservé au propriétaire (403 owner_only).
- **Activité** : JRN-01 / JRN-02 (journal signé, lecture seule), EQU-03 ; agrégat de `commandes.journal(ref)`.

## 2. Page ajoutée en plus (consigne 5) : pourquoi « Activité de la boutique »

En parcourant le Menu : le journal signé n'existe que commande par commande (VD-05). Une boutique qui donne un accès
Préparation (jusqu'à 3 employés, EQU) n'a aucun endroit pour voir **la journée de son équipe** (qui a remis quel colis,
qui a demandé « Plus de temps », qui a changé un stock) — besoin évident d'un propriétaire, et preuve en cas de
contestation. Les autres manques évidents (stock, promotions, questions des clients, livraison) sont faits par AJ-A.
« Mes ajustements » a été ajoutée à la demande du porteur (vue réelle) : elle n'existait pas dans VD-09 (Gains montre
le mois, pas d'export comptable toutes périodes ni de vue « reprises »).

## 3. Fichiers hors du dossier AJ-B (ajouts minimes, à relire en intégration)

| Fichier | Changement |
|---|---|
| `src/pages/VD-11/Menu.tsx` | bloc délimité « DÉBUT · entrées AJ-B … FIN » : 5 entrées rangées dans les groupes existants (l'ordre des groupes ne change pas), lien « Rechercher partout » sous la recherche du Menu |
| `src/composants/MenuProfil.tsx` | la carte du membre mène à Mon profil ; lignes « Mon profil » et « Rechercher partout » |
| `src/pages/VD-11/Parametres.tsx` | photo, nom, e-mail, téléphone **déplacés** dans Mon profil (pas de doublon) : la carte d'identité garde l'affichage et un bouton « Mon profil » |
| `src/pages/VD-09/Argent.tsx` | ligne « Mes ajustements » dans le bloc des liens |
| `tests/VD-11.gestes.spec.ts` | le test e-mail passe par « Mon profil » ; l'accès Préparation voit le lien « Mon profil » |
| `tests/gestes.spec.ts`, `tests/commun.ts` | `AJOUTEES` (routes déclarées par un routes.ts mais absentes de pages.json) acceptées par les tests du Menu et du menu du profil ; menu du profil : deux entrées de plus |

## 4. Vague d'intégration

1. **Coque des pages** : `pages.ts` déclare l'état (en-tête enfant, retour) et la fiche d'inventaire de chaque route
   à l'exécution (ces pages n'existent pas dans le prototype). À reporter dans `outils/inventaire.mjs`
   (`pages.json`, `etats.json`, groupe AJ-B, statut « repris »), puis supprimer `pages.ts` et son import dans
   `routes.ts`. `FAMILLES` (larges.tsx) : `ramassages` → commandes, `ajustements` → argent.
2. **Domaine** : `donnees-ajb.ts` (progression « Apprendre » par membre, présentation) utilise le magasin de la démo
   (`blv_v_demo_ajb`). À déplacer en `src/donnees/domaines/apprendre.ts` + `src/demo/apprendre.ts`, et ajouter `bio`
   à `Profil` (`compte`) ; API prévue : `GET/PUT /learning/progress`, champ `bio` de `PUT /me`.
3. Fiches « Apprendre » (`fiches.ts`) : contenu à gérer dans la console comme l'aide (VD11-R63).
4. Ramassages lit `remise.toutes()` ; un `GET /pickups?from=&to=` côté serveur éviterait de tout relire.
5. Grands écrans (≥ 1024 px) : à reprendre avec les captures ordinateur du porteur (DP-58).

## 5. Vérification

`npx tsc -b`, `npm run build` ; `tests/AJ-B.gestes.spec.ts` (10 tests : profil et codes, présentation filtrée,
Préparation, recherche et récents, ramassages et « C'est prêt », anglais, apprendre et progression, activité,
ajustements et export) ; tests touchés relancés (Menu, menu du profil, Paramètres, squelette : dictionnaires,
anonymat, routes). Captures 390 et 768 px : `captures/`.

## 6. Vague d'intégration (6 oct.) — état de chaque point

- [x] 1. Coque : `pages.ts` supprimé ; titre et retour déclarés dans `routes.ts`, écrits par `npm run inventaire`
  dans `pages.json` (marquées `ajoutee`) et `etats.json`. Navigation : Ramassages (Ventes), Activité de la boutique
  (Boutique) ; `ajustements` allume Mon argent, `profil` Paramètres.
- [ ] 2. Domaine « Apprendre » : reste dans `donnees-ajb.ts` (magasin de démonstration) ; routes : `INTEGRATION-API.md` § 7.
- [ ] 3. Fiches « Apprendre » dans la console : côté console.
- [x] 4. `GET /pickups?from=&to=` : `INTEGRATION-API.md` § 7.
- [x] 5. Grands écrans : vue ordinateur commune (`DISPOSITION-ECRANS.md`).
