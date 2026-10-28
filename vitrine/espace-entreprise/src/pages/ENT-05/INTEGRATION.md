# ENT-05 et ENT-06 — changements demandés pour la vague d'intégration

Fichiers communs ou d'autres groupes que ENT-05 / ENT-06 n'ont PAS modifiés (sauf `src/demo/lectures.ts`, point 2) ;
changement exact à faire.

1. **Règles de calcul → `src/calculs/`** : déplacer `src/pages/ENT-05/regles.ts` (lecture typée des paramètres des
   paquets, de l'affectation, des missions et des preuves ; `creneau`, `marge`, `tonMarge`, `trancheTournee`,
   `plafondRelais`, `porte`) et son test dans `src/calculs/livraison.ts`, puis dans `moteurs/` (Python) pour le serveur.
   La rémunération d'un paquet (`remunerer`, `src/demo/prix.ts`) est un calcul serveur : à porter au moteur.
2. **`src/demo/lectures.ts`** : les démonstrations prix, carte, colis et preuves sont sorties dans leur fichier
   (`src/demo/{prix,carte,colis,preuves}.ts`) ; `lectures.ts` les réexporte (source-demo.ts inchangé). Fusion : garder
   les réexports, supprimer les anciennes définitions si une autre branche les a encore.
3. **Coque (`src/composants/coque.tsx`, BarreTitre)** — consigne du porteur : sur une PAGE SECONDAIRE, à droite du
   titre, le panier BelivaY (« ibtn cart », `marque-belivay.png`, lien vers le tableau de bord), comme l'en-tête
   secondaire du prototype (subHeader) et du vendeur ; le téléphone l'a déjà (EnTeteEnfant). En attendant, les écrans
   ENT-05/06 le posent eux-mêmes par `ActionsPage` (`ENT-05/commun.tsx`, classe `lv-panier`, dès 768 px) : à retirer
   quand la coque le fait.
4. **Barre du bas (coque)** : Paquets et Missions sont fermés au comptable (ENT-02-R64, R66) ; la barre du bas devrait
   les remplacer pour ce rôle (aujourd'hui : page « Réservé à d'autres rôles »).
5. **Tableau de bord (ENT-03, `src/demo/tableau.ts`)** : compter les colis sous garde par `demoColis.compteurs()` (la
   file reste lisible par tous les rôles, valeur déclarée retirée au comptable) ; tâche d'incident :
   `params: { id: i.id }` (l'écran Incidents ouvre `?id=`), tâche « non affecté » : `affectation?id=`.
6. **Notifications (ENT-08, `src/demo/notifications.ts`)** : les identifiants du jeu d'essai ont changé — NT-1 →
   `paquet?id=PQ-Z1-261013-004` (« Bastos · 1 colis M ») ; NT-2 → `incidents?id=IN-121` (« Boutique fermée · Hugo M. »).
7. **Livreurs (ENT-04)** : le statut « en mission » devrait se lire dans les paquets (`idLivreur`, `src/demo/paquets.ts`) :
   Junior, Hugo et Paul sont en mission, Inès affectée, Brice libre. La fiche `livreur?id=` est ciblée par l'affectation.
8. **Messages (ENT-08)** : « Demander une révision » (ENT-P09) crée un fil « Révision de grille » et ouvre
   `messages?fil=<id>` : l'écran Messages doit lire ce paramètre.
9. **Registre** : `PLAFOND-RELAIS-M` vaut 590 F alors que DP-62 (RNF-01, remise relais M à 450 F) ramène le plafond M
   à 630 F. Les écrans lisent le registre : la tranche 1-4 (600 F) apparaît « écrêtée » pour un M. À trancher dans le
   registre ; aucun chiffre n'est écrit dans le code.
10. **Jetons (`src/styles/jetons.css`)** : le QR d'un colis se dessine avec `--card` / `--ink` (inversé en sombre) ;
    ajouter `--qr-fond` (blanc) et `--qr-encre` (noir) pour un QR toujours lisible.
11. **Carte** : fond schématique en SVG (`ENT-06/Carte.tsx`), mêmes données que MapLibre sur OpenStreetMap (DP-49) :
    à remplacer par la carte réelle quand la bibliothèque entre dans `package.json`.
12. **API (vague 3)** : `/api/company/price-grid`, `/sla`, `/packages`, `/packages/{id}/{accept,ignore,return,assign,
    reassign,transfer,eligible-couriers}`, `/missions?tab=`, `/fleet/positions`, `/calls`, `/incidents`,
    `/incidents/{id}/decision`, `/parcels?queue=`, `/proofs`, `/proofs/{id}/{flag,complement}`, `/proofs/export`,
    `/me/alerts`, `/threads {topic: grid_revision}` — formes dans `src/donnees/domaines/*.ts`.
13. **`src/genere/pages.json`** : régénéré (`npm run inventaire`, huit routes « repris »).

## Reprise sur le prototype HTML (paquets, détail, affectation)

14. **Coque, en-tête de page** : le bandeau « À affecter avant » de l'affectation est posé par l'écran au-dessus de la
    tête datée (comme `page({ banner })` du prototype) ; si la coque prend un jour un emplacement de bandeau, l'y déplacer.
15. **Recherche et filtres dans `dt-tools`** : `contenu.css` ne définit pas `.srch` (champ de recherche d'un tableau) et
    masque les `.flt` non actifs au téléphone ; ENT-05 pose `.px .dt-tools .srch` et `label.flt > select` dans
    `livraison.css`. À remonter dans `outils/contenu-prototype.mjs` si d'autres écrans en ont besoin.
16. **Carte d'un paquet** : `CartePaquet` (Paquet.tsx) dessine un fond schématique à partir de `source.carte.fond()` ;
    avant l'acceptation, les boutiques sont placées au quartier de leur zone. À remplacer par MapLibre (DP-49) avec la
    carte de la flotte ; l'API devrait renvoyer la position des arrêts acceptés (`/packages/{id}` : `lat`, `lng`).
17. **Données manquantes pour coller au prototype** : heure de fermeture du relais de dépôt, auteur de l'affectation
    (lu dans le journal), kit déclaré complet d'un livreur (seul le manque est envoyé), certification détaillée
    (note du quiz) : à ajouter aux domaines `paquets` et `affectation` si l'écran doit les montrer.
18. **Inventaire** : aucune route ajoutée par cette reprise ; `npm run inventaire` n'est pas nécessaire pour ENT-05.

## Kit du contenu du prototype (ENT-05 à ENT-08) — à reprendre par la coque

19. **Fichiers** : `outils/contenu-prototype.mjs` → `src/styles/contenu.css` (styles des blocs du prototype sous
    `.px`, couleurs = jetons DP-64, « nuit » = carte claire au dégradé vert, cibles de 44 px, `.srch` et `.glass` du
    contenu compris) ; `src/composants/prototype.tsx` (`Px`, `Tete`, `Panel`, `Kpi`, `Li`, `Kv`, `Table`, `Choix`…).
    Tous nouveaux : aucun fichier commun modifié. Si l'agent de la coque a fait un équivalent pour ENT-00/03/04, garder
    un seul jeu (fusionner les deux sorties, même portée `.px`).
20. **`Ecran`** (coque.tsx) : accepter `surtitre` (jour · heure du prototype) et `sousTitre`, posés AU-DESSUS et
    au-dessous du h1 dans `e-titre` / `BarreTitre`. Aujourd'hui `Tete` les pose dans le contenu : sur une page racine
    au téléphone (paquets, missions), le surtitre vient donc sous le titre de la coque au lieu d'au-dessus.
21. **Actions au téléphone** : les écrans repris passent `actions` à `Ecran` seulement dès 768 px (`useLarge`) et les
    posent eux-mêmes dans la tête du contenu au téléphone, après le surtitre et le sous-titre, comme `page()` du
    prototype ; la coque peut garder son emplacement `e-titre-act` pour les autres écrans.
22. **Emplacement de bandeau** au-dessus de la tête de page (`page({ banner })`) : bandeaux d'alerte de missions,
    incidents, affectation, règlements, emballages (aujourd'hui posés par l'écran dans `Px`).
23. **Barre latérale (ordinateur)** : elle s'arrête à la hauteur de ses entrées sur une page longue (captures
    missions, prix et délais) ; le prototype la tire sur toute la hauteur.
24. **Menu** : l'entrée « Mon profil » mène encore à `parametres#profil` ; Paramètres n'a plus de bloc profil (comme le
    prototype) → la pointer vers la page Profil.

## Enrichissements P09 à P12 (lot l/e-ent-2)

25. **Domaines** : `prix.alertesDelais` / `prix.reglerAlertesDelais` (GET · PUT `/api/company/sla/alerts`, à créer
    côté serveur ; bornes du registre `seuil_anneau_rouge` ≤ N ≤ `ENT-T-ACCEPT` ou délai de ramassage ; journal des
    paramètres) ; `Eligible.missionsDuJour` et `Eligible.certifieJusqua` (`/eligible-couriers`, champs à ajouter).
    CONNECTEURS-ENTREPRISE.md mis à jour à la main (outil `connecteurs.mjs` : tsx absent) : relancer l'outil à la fusion.
26. **Registre** : aucune « charge maximale par livreur » ; la règle appliquée est « une mission à la fois » (écarté
    « en mission »). Si une limite chiffrée est voulue, l'ajouter au registre ; l'écran l'écrira dans la même `Limite`.

### Pour le kit et la coque

27. **File hors connexion** (`fileHorsLigne.ts`, `FileEnAttente`) : `geste(libelle, faire, objet, raisons)` accepte
    désormais une table « code de refus → phrase » ; sans elle, l'avis dit « refusé par le serveur (code …) ». La coque
    devrait montrer le NOMBRE de gestes en attente dans `BandeauHorsLigne` et poser `FileEnAttente` une seule fois
    (aujourd'hui posé par chaque écran ENT-05 à 08).
28. **Contraste du héros** : styles/contenu.css (l. 893) pose tous les `.hero` sur fond clair (dégradé sauge), mais
    styles/ecarts.css (l. 77 et 120) garde `.hero.orange .ht` et `.hero.acc .ht` en `--sur-e` (blanc) : titre invisible
    (1,00:1). Corrigé localement dans livraison.css (`.px .hero.entb-hero .ht`) ; à corriger dans ecarts.css pour tous.
29. **Prettier** : aucun fichier de configuration dans le dépôt ; `npx prettier --write` reformate tout (largeur 80).
    Ajouter un `.prettierrc` (largeur 200 environ, sans point-virgule, guillemets simples) ou ne pas le lancer.
30. **Socle des enrichissements** (`composants/enrichi.tsx` + `enrichi.css`, `donnees/fileHorsLigne.ts`,
    `donnees/exports.ts`) : Rebours, useAnnuler, Recherche / Puces / Tri / Compte / AucunResultat, Exports, Limite,
    Interdit, BarrePouce, FileEnAttente. À verser au kit commun lors de l'unification ; `.srch` et `label.flt` du kit
    font 36-38 px hors `.dt-tools` (sous 44 px) et n'ont pas de boîte hors tableau : corrigés localement par groupe.
    Icônes manquantes au jeu (`zoom-out`, `maximize-2`, `minimize-2`, `save`, `play`, `briefcase`, `bell-plus`) :
    remplacées ; les ajouter à outils/prototype.mjs si le kit les veut.
