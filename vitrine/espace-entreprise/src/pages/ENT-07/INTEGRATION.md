# ENT-07 — changements hors du groupe et points pour la vague d'intégration

## Fichiers communs touchés (nécessaires)
- `src/demo/lectures.ts` : démonstrations de règlements, relevés, score, emballages, paramètres, rapports et
  intégrations retirées (chaque domaine a son fichier : `src/demo/<domaine>.ts`, comme le prévoit METHODE.md).
- `src/demo/source-demo.ts` : imports de ces domaines depuis leurs nouveaux fichiers.
- `src/demo/tableau.ts` (domaine d'ENT-03) : « à verser vendredi » lit `demoReglements.prochain().aVerser` (le champ
  `totalAuJour` n'existe plus) ; le Trust Score du tableau lit le moteur (`calculerScore`) au lieu de 50 écrit en dur
  (ENT-UIX-02 : le même chiffre partout).
- Nouveaux fichiers communs : `src/calculs/ent07.ts` (litiges DP-35, versements, Trust Score), `src/calculs/ent08.ts`
  (outils), `src/calculs/ent0708.test.ts`, `src/demo/prestations.ts` (prestations du pilote, lues par règlements,
  relevés, rapports et score).

## À reprendre par la coque commune
- Pages secondaires dès 768 px : la barre de titre (`BarreTitre`, `composants/coque.tsx`) n'a pas la marque panier
  BelivaY à droite (patron subHeader du prototype et du vendeur ; le téléphone l'a déjà dans `EnTeteEnfant`). En
  attendant, les écrans d'ENT-07, ENT-08 la posent eux-mêmes (`MarquePage`, `EcranGroupe` de `ENT-07/commun.tsx`) :
  à retirer quand la coque le fera.
- Consigne design (sobre, couleur en accent, léger dégradé vert sapin sur les sections importantes) : les héros
  `.carte-nuit` de mes écrans sont redéfinis dans `ENT-07/ent07.css` ; `.carte-nuit` de `styles/base.css` reste sombre
  pour les autres groupes — à harmoniser dans la base.

## Paramètres à ajouter au registre de l'entreprise (lus s'ils existent, sinon la décision s'applique)
- `LIT-DECISION-H` (24 h après l'échéance, DP-35), `LIT-ARRANG-REPONSE-J` (5 jours, DP-35).
- `ENT-SUPPORT-DP12` (première réponse sous 2 h, 7 h – 21 h, 7 j/7 : DP-62, O-11 ; remplace ENT-SUPPORT-DELAI).
- `CONF-ENT-RESUME` (19 h, DP-61) — déjà dans REGLES-CACHEES.md, absent de l'extraction.

## Liens vers les écrans d'autres groupes (paramètres attendus)
- `paquet?id=PQ-…`, `livreur?id=l-…`, `preuves?paquet=PQ-…` (ENT-05, ENT-04, ENT-06) ; `litiges?id=LT-…` ouvre le
  dossier ; `reglements?onglet=retenues` ; `messages?sheet=nouveau&sujet=litige|paquet|versement|releve|compte&ref=…`
  ouvre un nouveau fil du support prérempli ; `parametres#notifications|#stockage|#profil`.

## Session (ENT-03)
- `src/demo/parametres.ts` garde le mot de passe changé (`motsDePasse`) : `demoSession.connecter` devrait le lire au
  lieu de `MOT_DE_PASSE_DEMO` seul.
- Compteurs : les notifications ne sont pas filtrées par rôle (le compteur de la coque les compte toutes).

## Reprise sur le prototype HTML (litiges, règlements, relevés, score)
- Les quatre écrans utilisent le kit `composants/prototype.tsx` (Px, Tete, Panel, Table, Choix…) ; briques propres au
  groupe dans `ENT-07/px.tsx` (ErreurPx = C.loadErr, Gros, M4, Anneau = C.ring, Col = entC7_col).
  `ENT-07/commun.tsx` est inchangé (ENT-08 l'importe).
- À reprendre dans le kit commun (`styles/contenu.css`) : `.tabs>button` n'a ni retrait ni style de compteur `.n`
  (seuls les liens `.tabs a` en ont) ; posé en attendant dans `ent07.css` (`.px div.tabs>button`). Idem
  `button.radio`, `button.ec7-card`, `textarea` dans `.fld` (C.fld area) : réglés dans `ent07.css`.
- Écarts voulus au prototype : onglet « En médiation » = « En examen » (DP-35 : BelivaY examine, puis recours une
  fois) ; pas de photos dans les dossiers (le domaine litiges ne porte que des preuves décrites : maillon, genre,
  heure) ; « Décomposition du score » montre le barème du moteur (succès, échecs pondérés g1/g2/g3, veto) au lieu
  des cinq critères pondérés V5.4 (absents du registre et du domaine score) ; pas de carte dans l'onglet Zones ;
  historique des versements sans colonnes Prestations / Retenues par période (absentes du domaine).
- Registre : `lecture_apres_resiliation` (jours) est lu pour « consultables N jours après la fin du contrat ».

## Enrichissements (lot ENT, P17-P20)
- `composants/enrichi.tsx` (petite modification) : `Recherche` tient la saisie localement ; une recherche gardée dans
  l'adresse (?q=) se met à jour dans une transition du routeur et perdait des caractères à la frappe rapide (tous les
  groupes en profitent). Mes écrans écrivent l'adresse depuis `window.location.search` (pas la valeur du rendu, en retard).
- `src/demo/releves.ts` : le PDF du relevé est un vrai PDF (`pdfBinaire`, fonction pure `fichierReleve`), plus du CSV
  typé application/pdf. Le jeu d'essai n'a aucune période arrêtée (pilote jour 2) : le bouton PDF reste « à la clôture » ;
  le test vérifie le fichier par la fonction de la démo.
- Score : fiches « Comment monter » en feuille (`?sheet=monter&fiche=delai|manquements|propres|veto`), pas de page
  `apprendre` ; à rattacher à cette page commune si elle est créée (AJ-E).

### Pour le kit et la coque
- `.srch` n'a de boîte (bordure, fond, hauteur) que dans `.dt-tools` (contenu.css) : `Recherche` d'enrichi.tsx posée
  ailleurs sort nue ; je la style dans `ent07.css` (`.e7-outils .srch`). À poser une fois dans enrichi.css ou contenu.css.
- Le refus d'un geste en file affiche son code brut (« delai ») : `FileEnAttente` gagnerait une table code → phrase.
