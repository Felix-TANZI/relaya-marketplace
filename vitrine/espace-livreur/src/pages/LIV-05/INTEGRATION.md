# Intégration — groupes LIV-05, LIV-06, LIV-07 (tournée, ramassage, remises) et LIV-P33 (Appel)

Changements communs à faire à la vague d'intégration (fichiers que ces groupes n'ont pas le droit de toucher).

## Coque et composants communs
1. **Marque BelivaY (panier) à droite de l'en-tête des pages secondaires** (consigne du porteur, patron vendeur
   `ibtn hd-mark` + `marque-belivay.png`, lien vers l'accueil) : à poser dans `EnTeteEnfant` de
   `src/composants/coque.tsx`. En attendant, `LogoEntete` (`LIV-05/partage/contexte.tsx`) l'insère par portail dans
   `.l-hd-sub` ; à retirer des écrans quand la coque le fera.
2. Remonter dans `src/composants/` le kit partagé de `src/pages/LIV-05/partage/` (utilisé par LIV-06 et LIV-07) :
   `Camera` (appareil photo de l'application, netteté, compression, galerie barrée), `CodeSix`, `CarteZone`
   (OpenStreetMap), `Avancement`, `useAgir`, `usePositionMission`, `livraison.css` (préfixe `lv-`).
3. Menu du profil (`config/navigation.ts`) : ajouter « Appel » (route `appel`, LIV-P33) au groupe de la tournée.

## Tests et inventaire
4. `tests/squelette.spec.ts` attend 32 écrans : LIV-P33 (Appel, DP-61) porte le paquet à **33**.

## Données et registre
5. **Paramètres à verser au registre** (`logique-metier/parametres-en-vigueur.json`, puis `src/calculs/registre.ts`) :
   ils sont lus aujourd'hui dans `logique-metier/livreur/parametres-livreur.json` (valeur finale) par la démonstration
   (`src/demo/tournee.ts`, `reglesDemo`) et servis aux écrans par `source.tournee.regles()` : CODE-LONGUEUR,
   TOURNEE-AMBRE-MIN, TOURNEE-ROUGE-MIN, ATTENTE-VENDEUR-MIN, ARRIVEE-ECART-M, VALIDATION-ECART-M, REFUS-NOTE-MIN,
   DEPOT-CONFIRM-MIN, ABSENT-ATTENTE-MIN, ABSENT-APPELS,
   ABSENT-INTERVALLE-MIN, POSITION-CLIENT-EFFACEE-MIN, LIV-COLLECTE-ALERTE-H, ROUTE-COUPEE-H, AUDIT-C4-MIN,
   CONTROLE-C1-S, PHOTO-MAX-KO, PLAFOND-NOUVEAU, RELAIS-PLACES. **Paramètre nouveau** : PHOTO-NETTETE-SEUIL (variance
   du laplacien sous laquelle une photo est refusée, LIV-06-R09 sans valeur ; démonstration : 12).
6. `src/donnees/domaines/horsligne.ts` : la file ne porte que type/objet/origine. Il faut la **charge** du geste (code,
   identifiants de photos, motif…) pour un vrai rejeu par `POST /api/courier/sync/batch`, et des types d'action
   propres (`controle`, `audit`, `emballage`, `photo`, `collecte`, `retour`, `appel`, `route`) : aujourd'hui ces gestes
   empruntent `etiquette`, `depot`, `incident`. En attendant, `useAgir` met le geste en file ET l'applique à la copie
   locale (la démonstration), comme le ferait la base locale du paquet téléchargé.
7. La démonstration de ces groupes écrit aussi dans des états d'autres domaines, comme le ferait le serveur :
   `session.colisSousGarde` (garde) et `kit` (étiquettes, pochettes, cartons décomptés à chaque étiquette liée).
   La forme de `tournee` garde `paquetId` et `arrets[].{id,type,nom,avant,etat}` lus par `aujourdhui` et `session`.
8. Tuiles de carte : `CarteZone` lit `https://tile.openstreetmap.org` ; en production, le serveur de tuiles de BelivaY
   (DP-49 : pas de charge sur tile.openstreetmap.org) — URL à poser dans la configuration.

## Liens vers les autres interfaces (événements, CONNEXIONS.md)
- Arrivée → vendeur « Votre livreur est là » avec la photo ; code de remise validé → vendeur « Remis à … », client
  « En route » (annulation fermée), relais : arrivée annoncée ; refus → vendeur (motif + photo), console (dossier si
  contrefaçon ou produit interdit) ; dépôt confirmé → relais (garde, emplacements), client (code de retrait au dernier
  colis) ; domicile → client (confirmation ; payé en ligne) ; échec → relais de la zone ajouté ; appels → journal sans
  contenu pour l'administrateur. Le journal signé des gestes est tenu par `journaliser()` (`src/demo/tournee.ts`).

## Reprise sur le prototype HTML (BRIEF-PROTOTYPE.md, 11 oct. 2026) — LIV-05 à LIV-08
Les écrans de la tournée, du ramassage, des remises et des incidents reprennent la structure exacte du prototype
(mêmes blocs, même ordre, mêmes classes) dans `<Lvp>` ; le kit est dans `src/composants/livraison/` (utilisé
seulement par ces groupes) : `prototype.css` (GÉNÉRÉ par `styles-prototype.mjs` : règles du prototype employées par
leurs états, portées sous `.lvp`, polices en rem), `prototype-ecarts.css` (jetons manquants, action verte DP-64, barre
d'action dans la page), `proto.tsx` (bibliothèque C du prototype en JSX). À faire côté coque / communs :
8. **Tournée terminée** : le prototype passe à l'en-tête secondaire « Tournée » (retour vers Aujourd'hui) ; `Ecran`
   ne permet pas de changer d'en-tête selon l'état (prop `entete` à ajouter dans `src/composants/coque.tsx`).
9. Si la coque adopte un jour la feuille complète du prototype (`prototype.css` global, comme le vendeur), retirer la
   portée `.lvp` en relançant `styles-prototype.mjs` sans préfixe et garder `prototype-ecarts.css`.
10. Menu du profil (`config/navigation.ts`, groupe Tournée) : « Cartes hors connexion » → `navigation?vue=cartes`
    (état « cartes » du prototype, rendu par l'écran Navigation).
11. Jetons du prototype absents de `src/styles/livreur.css` (`--shadow-card`, `--green-line`, `--blue-line`,
    `--violet*`, `--n1..n3`, `--gold-l`, `--fs-*`, `--r-m`, `--input-*`, `--map-*`) : définis sous `.lvp` dans
    `prototype-ecarts.css` ; à remonter dans `livreur.css` si d'autres groupes en ont besoin.

## Kits unifiés (après la fusion avec le lot 1, 12 oct. 2026)
Un seul kit du prototype pour toute l'application : `src/styles/prototype.css` (généré, `outils/styles.mjs`),
`src/styles/ecarts-prototype.css` (écarts décidés, dont les sections 7 à 10 venues des écrans LIV-05 à LIV-08 :
jetons, accessibilité 12 px / 44 px / contrastes, boutons du balisage), `src/composants/proto.tsx` (composants C.*).
Le kit portée `.lvp` (`composants/livraison/prototype.css`, `prototype-ecarts.css`, `proto.tsx`,
`styles-prototype.mjs`) et `liv06.css` / `liv07.css` sont supprimés ; `.lvp` reste seulement le conteneur des
règles propres à un groupe (liv08.css). Une seule barre d'action : `BarreAction` (`.bottom-cta`, place réservée
mesurée, dans le flux en mode une main désactivé) — `BasFixe` (LIV-03) et la barre du paquet (LIV-04) l'emploient.
Un seul clavier de code : `Cases` + `Pave` (+ `SaisieCode`) dans `proto.tsx` (PIN, code SMS, code de remise, de
livraison, de réception) ; `CodeSix` est supprimé. Les points 2 et 8-11 ci-dessus sur l'ancien kit sont réglés.

## Enrichissements LIV-05 à LIV-08 et Appel (phase d'enrichissement, 12 oct. 2026)
- Socle partagé : `src/composants/livraison/enrichi.tsx` (+ `enrichi.css`, jetons existants seulement) — `Rebours`
  (compte à rebours en direct), `useDiffere`/`AvisAnnuler` (« Annuler » 5 s dans la barre du bas ; quitter l'écran
  envoie le geste), `AideEtape` (aide par étape → page `aide`), `Recherche`, `VignettePreuve` (preuve en grand),
  `exporterPdf` (site/src/donnees/pdf.ts). Textes anglais : `src/i18n/LIV-enrichi.en.json`.
- Gestes différés de 5 s : refus d'un colis, message masqué, échec à domicile (sauf lieu dangereux : immédiat),
  colis manquant à la collecte, retour impossible. Les codes (remise, livraison, réception) restent immédiats.
- Écart au tableau P11-P13 : pas de recadrage des photos de preuve (heure, position et empreinte incrustées : une
  preuve recadrée pourrait cacher un dommage) ; à la place, la preuve s'ouvre en grand et se reprend.
- Pour l'agent coque/thème : `usePositionMission` renvoie aussi l'heure de la position (`pos.a`) ; l'arrêt en cours
  se glisse avec `Glisser` du client (styles `.gl*` repris dans enrichi.css, couleurs `--acc-btn`). Aucun jeton modifié.

## Cartes (13 oct. 2026)
- Tuiles OpenStreetMap réelles (mention visible) ; repli schématique, annoncé sur la carte, seulement sans réseau ou
  sous navigateur piloté (tests : aucune requête sortante), ou si les tuiles échouent.
- **Champ ajouté au contrat** : `Tournee.zones?: { nom, contour: PointCarte[] }[]` (GET /rounds/current), contour de
  chaque zone servi avec le paquet hors connexion ; absent, la carte ne trace pas de zone. Servi par le kit
  (livreur_tournee.lectures : polygone de chaque zone de la tournée, livraison_core.zones), le même que la démonstration :
  logique-metier/livraison/zones-yaounde.geo.json (carte adoptée le 23 oct. 2026, DP-70 ; méthode : logique-metier/livraison/ZONES.md).
- Repères au même endroit (relais servi dans les deux sens, vendeur revu pour un retour) réunis en « 3·4 » ; ils se
  séparent en rapprochant la carte. La vignette de la tournée est cadrée sur l'arrêt en cours et les deux suivants.
