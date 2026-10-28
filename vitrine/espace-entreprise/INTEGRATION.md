# Espace entreprise — briques communes changées (lot l/e-ent-1, 12 oct. 2026)

À lire par les lots qui travaillent sur ENT-05 à ENT-08 : le kit et le thème sont communs. Aucun de vos écrans n'a été
modifié ; ce qui suit change ce qu'ils reçoivent.

## 1. Un seul kit du prototype
- **Briques** : `src/composants/prototype.tsx` est le seul kit. `src/composants/proto.tsx` est retiré ; ses briques y sont
  passées (`Rangee`, `Etape`, `Verrou`, `BarresH`, `Courbe`, `Anneau`), avec quelques ajouts **compatibles** :
  `Champ` (C.fld autour d'un vrai champ : le premier enfant va dans `.inp`, `groupe` pour des cases, `bloc` pour un
  choix de fichier), `Av` (avatar à initiales seul), `Vide` accepte `action`, `Li` accepte `chevron={false}`,
  `Panel` accepte `niveau={3}`, `Sec` accepte `id`, `Pill` accepte `ton="dk"`. Rien de ce que vous appelez n'a changé
  de nom ni de sens.
- **Styles** : `src/styles/contenu.css` (`outils/contenu-prototype.mjs`) est la seule feuille du contenu. La coque pose
  désormais `.px` sur `<main>` et sur ses `fixes` : `<Px>` reste utilisable mais n'est plus nécessaire.
  `src/styles/prototype.css` (`outils/styles.mjs`) ne garde que la **coque** du prototype (en-têtes, barre du bas,
  console, connexion, boutons, pastilles de la coque) : les règles du contenu qu'il dupliquait en global sont retirées.
  Si un bloc de votre écran vivait **hors** de `.px` (portail vers `body`), il n'a plus que `contenu.css` sous `.px` :
  enveloppez-le dans `<Px>`.
- **Pastilles bronze et or** : jetons `--or-*` et `--amber-*` (lisibles en clair et en sombre), plus aucune couleur
  écrite.
- **Classes `.ea-*`** : retirées. `ENT-03/ent.css` ne garde que la carte des zones (`.e-carte`, `.e-legende`), le
  fichier choisi (`.e-fichier`), les cases `.entA-chk` et la connexion. `ENT-08/Parametres.tsx` importe encore
  `../ENT-03/ent.css` : l'import est désormais inutile (CarteZones importe sa feuille lui-même), il peut être retiré.

## 2. Thème sombre ardoise
`src/styles/jetons.css` : fonds `#0E1113`, cartes `#16191C`, filets `#262B2F`/`#343B40`, vert sapin en accent seulement
(`--e #3FA393`, `--e-txt #6FCBBB`, `--sur-e #0A0F0E`), barre latérale neutre (`--nuit-*`), verre neutre. Mêmes noms de
jetons. `ecarts.css` (16) : bouton secondaire, blanc et « nuit » du prototype jamais fondus dans leur fond, en clair
comme en sombre.

## 3. Coque
- Barre du bas du téléphone : **trois onglets** (Tableau, Paquets, Missions) ; « ☰ » ouvre le Menu (consigne du
  porteur). `ongletDe()` rend `null` pour le Menu et ses pages.
- `Ecran` : au téléphone, `actions` va dans la **zone du pouce** (barre fixe au-dessus de la barre du bas). Vos écrans
  qui passent `actions={large ? acts : undefined}` ne changent pas.
- Barre du haut : recherche à suggestions (⌘K, Ctrl+K, « / »), fil d'Ariane dont le groupe mène au Menu
  (`/menu#g-…`), cloche à panneau (`?pop=cloche`) ; raccourcis « g » + lettre et « ? » (`?pop=raccourcis`).
- `useRouteOuverte()` rend une fonction stable (dépendance d'effet sûre).

## 4. Dictionnaires
Les clés partagées par plusieurs groupes (« BelivaY n’affecte jamais un livreur », « Qui voit quoi », « Disponible »,
« Total », « Délai tenu », « Type : tous », « Zone : toutes ») sont dans `commun.en.json`, une seule fois.

## 5. Source
`source.compte.activite()` (journal signé de l'équipe, page Activité) : connecteur `GET /api/company/activity`, branché
sur le kit (`backend-kit/apps/entreprise_session/activite.py`) et décrit au contrat `backend-kit/openapi.yaml`. De même
pour les alertes avant échéance (`/sla/alerts`), le rapport programmé (`/reports/schedule`) et l'espace des intégrations
(`/integrations/space|keys|webhooks|sandbox/call`).

## 6. Après la fusion de livraison (enrichissements ENT-05 à 08)
- **Kit unique** : les briques d'`enrichi.tsx` (FileEnAttente, Rebours, useRestant, useAnnuler, Recherche, Tri, Puces,
  AucunResultat, Compte, Exports, exporterCsv/Pdf, Limite, Interdit, BarrePouce…) sont dans `composants/prototype.tsx`,
  leur feuille dans `styles/enrichi.css` (chargée par le kit) ; `composants/enrichi.tsx` est retiré et vos imports
  pointent sur `composants/prototype`. Un seul module d'exports : `donnees/exports.ts` (le mien est retiré) ; un seul
  compte à rebours : `Rebours` / `useRestant` (mon `Chrono` est retiré).
- **File hors connexion** : `FileEnAttente` est posée **une seule fois par la coque** (sous le bandeau hors connexion,
  qui dit désormais le nombre de gestes en attente) ; elle est retirée de vos écrans.
- **Héros** : les règles `.hero.orange` / `.hero.acc` de `ecarts.css` (texte blanc) sont retirées : tous les héros du
  kit sont clairs, texte à l'encre. Votre correctif local (`.px .hero.entb-hero .ht`) devient inutile.
- **Recherche et filtres** : `.srch` (boîte, champ, focus) et `label.flt` (sélecteur) font 44 px partout sous `.px`,
  hors des barres de tableau aussi ; au téléphone, un `label.flt` qui porte un vrai choix reste visible.
- **Icônes** ajoutées au jeu (`outils/prototype.mjs`) : zoom-out, maximize-2, minimize-2, save, play, briefcase,
  bell-plus.
- **« / »** : la recherche de liste de la page (Recherche du kit, `aria-keyshortcuts="/"`) le garde ; sinon il ouvre la
  recherche partout. ⌘K / Ctrl+K cherche toujours partout.

## 7. Retours du porteur du 12 oct. (lot l/f-ent)
- **Transitions** : plus d'écran vide ni d'éclair entre deux pages, en clair comme en sombre. `index.html` pose le thème
  et le fond (`#F5F6F4` / `#0E1113`) avant le premier rendu ; `App.tsx` ne démonte plus l'arbre à chaque adresse
  (`GardeErreurs cle={pathname}` oublie la panne sans démonter) : la page ouverte reste à l'écran pendant que la
  suivante se charge (navigation en transition) ; `main.tsx` précharge l'écran d'un lien survolé, touché ou atteint au
  clavier, puis tous les écrans au repos, et charge l'anglais avant le premier affichage. Test : `tests/transitions.spec.ts`.
- **Contrôle des pièces par l'entreprise** (consigne du porteur, remplace ENT-P06R-03 « statut et date seulement ») :
  page ajoutée `pieces` (ENT-04/Pieces.tsx) — file de la flotte, pièces d'un livreur (`?id=`), visionneuse en
  filigrane (lien de 5 min, `LIEN_PIECE_MIN`, valeur proposée à inscrire au registre), valider (date d'expiration lue sur
  la pièce) ou refuser (motif écrit envoyé au livreur), relancer ; véhicule (assurance, carte grise, plaque) et
  certification du livreur au même endroit. Entrée « Pièces des livreurs » au menu (badge `pieces`), tâche
  `piece_a_controler` au tableau de bord, bandeau sur la flotte, liens depuis la fiche et l'ajout. Kit :
  `entreprise_flotte/pieces.py` (queue, view, file signé, review, remind), migration `livraison_core` 0002.
- **Trafic normal** : pilote au jour 23 (début le 21 sept.), 22 livreurs aux statuts variés (`jeu-essai.ts`,
  `livreurs.ts` : PROFILS), une cinquantaine de paquets de plus aujourd'hui et hier (`paquets.ts` : `trafic()`), trois
  semaines de prestations tirées à graine fixe (`prestations.ts`), trois vendredis versés et leurs relevés définitifs,
  dix litiges dont huit anciens décidés, incidents en plus. Test de cohérence : `src/demo/trafic.test.ts`.
- **Blocs** : tous les blocs d'information des écrans viennent du prototype (vérifié dans le HTML du paquet 5 :
  « Approuver, suspendre, retirer », « Un livreur, une entreprise », « Numéro refusé », etc.) : gardés (BRIEF-PROTOTYPE).
  Chaque élément cliquable mène quelque part : `tests/boutons.spec.ts` exige désormais un effet RÉEL (adresse, feuille,
  état, contenu, fichier, requête, défilement, focus) ; un changement de classe ou de style seul est un échec.

## 8. Rôle du livreur (DP-66, DP-67, lot l/liv-simple)
- **Le livreur demande, l'entreprise décide.** Domaine `livreurs` : `departs()`, `constaterKit()`, `cloturerDepart()`,
  `versementFait()`, `absences()`, `absenceVue()`, `demanderPhoto()` ; `FicheLivreur.depart` et `.absences` (contrat :
  `src/donnees/domaines/livreurs.ts`, `src/api/routes/livreurs.ts`, `CONNECTEURS-ENTREPRISE.md`). Règles portées de
  `moteurs/belivay_moteurs/depart.py` et `absence.py` dans `src/calculs/depart.ts` (conditions avec `kit_constate`, fin
  du préavis, `affectationPermise` / `affectationJusqua` à l'heure de Yaoundé, `constatJusqua`, `constaterKit` et ses
  raisons, retenue plafonnée, `dernierVersement`, vendredi suivant, échéance et blocage de la nouvelle photo).
- **Paramètres** (registre, `PARAMETRES_FLOTTE`, jamais en dur) : `DEPART-PREAVIS-J` (`preavisDepartJours`),
  `DEPART-KIT-CONSTAT-H` (`kitConstatH`), `KIT-VALEUR-F` (`kit` : total et éléments ; les libellés sont les identifiants
  des éléments manquants ; forme inattendue ou somme fausse → `ParametreIllisible`), `DEPART-VISIBLE-J`
  (`departVisibleJours`), `ABSENCE-MAX-J`, `PLANNING-PREVENIR-H`, `PHOTO-REVERIF-J` (`photoReverifJours`).
- **DP-67** : pendant le préavis, paquets jusqu'à la veille du dernier jour (raison d'affectation `preavis` ensuite) ;
  clôture possible avant la fin, d'un commun accord ; constat du kit (restitué, ou incomplet : photo, éléments cochés,
  retenue = leur valeur ou moins, plafonnée ; refus `delai` après DEPART-KIT-CONSTAT-H, `conteste` une fois la retenue
  contestée) ; silence : clôture « kit non contesté » par l'administrateur, sans retenue ; dernier versement détaillé
  (estimé pendant le préavis, figé à la clôture ; `du`/`verse` null pour le répartiteur) et « Marquer le versement Mobile
  Money fait » (propriétaire, SMS au livreur) ; absences avec motif de liste, texte, `imprevu`, `apresDebut` ; nouvelle
  photo : statut `reverification`, échéance, raison d'affectation `photo` une fois le délai passé.
- **Écrans** : fiche du livreur (bloc « Départ demandé » : paquets jusqu'au…, conditions, « Kit rendu », « Dernier
  versement », clôture confirmée ; « Absences prévenues » ; livreur parti : lien vers son départ), flotte (file « Départs »
  : `flotte?statut=departs`, départs clos sur 90 jours, détail `sheet=depart&depart=<id>`), pièces (« Nouvelles photos »,
  échéance, blocage, aide « suspendre en cas de doute »), planning (motifs, repères), affectation (raisons `preavis` et
  `photo`, repère « paquets jusqu'au »), tableau de bord (tâches `depart`, `depart_echu`, `absence`, `kit_a_constater`,
  `versement_a_faire`). Le comptable lit, sans les gestes.
- **Démonstration** : `src/demo/departs.ts` (Josiane : en préavis, reçoit encore des paquets, tarif affiché ; Kevin :
  préavis échu ce midi, délai du constat qui court ; Arnaud : clos par BelivaY « kit non contesté », versement à faire ;
  Pauline : close il y a 40 jours, kit incomplet, versement fait ; Yannick : hors des 90 jours ; absences d'Aimé
  (imprévu), de Fabrice (après le début du créneau) et de Carine), `src/demo/livreurs.ts` (nouvelle photo de David,
  en retard pour Gilles). Le pont (`src/demo/pont-livreur.ts`) applique `depart_demande`, `depart_annule`, `absence`,
  `absence_annulee`, `piece_envoyee`, `kit_conteste` et publie `absence_vue`, `piece_demandee` (avec `jusqua`),
  `depart_kit`, `depart_clos` (avec `kitNonConteste`, `versement`), `versement_fait`.
