# LIV-08 (incident, synchronisation, clôture) — à faire en vague d'intégration

Les groupes LIV-08, LIV-09 et LIV-10 ont été repris ensemble (même agent) : `LIV-08/commun.tsx` et `commun.css`
(préfixe `lc-`) sont partagés par les trois.

## Fichiers communs à changer
1. **Coque, en-tête enfant** (`src/composants/coque.tsx`, consigne du porteur) : à droite de l'en-tête des pages
   secondaires, la marque panier BelivaY vers l'accueil, comme `espace-vendeur` (`<Link className="l-ibtn hd-mark"
   to={chemin(ACCUEIL)} aria-label="BelivaY · accueil"><img src={marque} …/></Link>`, `assets/marque-belivay.png`),
   en gardant le bouton d'incident (LIV-UIX-03). `EcranC` (commun.tsx) est le point d'appui : il ne fait rien de plus
   que `Ecran` en attendant.
2. **Registre** (`logique-metier/parametres-en-vigueur.json` puis `PARAMETRES.livreur`) : les écrans lisent par la
   source des codes encore absents du registre officiel, servis en démonstration depuis
   `logique-metier/livreur/parametres-livreur.json` (`parametre()` de `src/demo/horsligne.ts`, registre officiel
   d'abord) : LIV-FILE-EXPIRATION-H, LIV-PHOTO-POIDS-KO, LIV-WIFI-ATTENTE-MAX-H, LIV-INCIDENT-NOTE-MIN,
   LIV-INCIDENT-VALID-MIN, LIV-CLOTURE-PROPOSEE-H, LIV-HEURES-SERVICE, LIV-PREUVES-VISIBLES-J,
   history_offline_cache_days, LIT-REPONSE-ENT-H, LIV-TSC-POIDS, TSC-PALIERS-LIVREUR, LIV-TSC-NEUTRE,
   LIV-TSC-VETO-PLAFOND, LIV-TSC-CONTESTATION-J, LIV-TSC-HYSTERESIS-J, LIV-TSC-ANCIENNETE, LIV-PLAFOND-VALEUR,
   LIV-FIL-FERMETURE-H, APPEL-REPLI, LIV-PIECE-ALERTE-J, KYC-AUTO-MIN, KYC-REVUE-H, BADGE-VALIDITE, CERT-SEUIL,
   LIV-SOS-APPUI-S, LIV-SOS-POSITION-MIN, SOS-POSITION-S. Écart d'horloge signalé à 24 h (LIV-P22R-04) : sans code.
   Note de contestation Trust : LIV-INCIDENT-NOTE-MIN par défaut, un code propre serait plus juste.
3. **vite.config.ts** (`allegerJson`) : alléger aussi `parametres-livreur.json` (code et valeur finale seulement) ;
   aujourd'hui il entre entier dans le morceau de démonstration.
4. **Rejeu hors connexion** : `geste()` ne fait que mettre en file ; au retour du réseau, `demoHorsLigne.envoyerFile`
   applique les gestes par `REJOUEURS[type]` (incident, message, contestation, clôture, préférence). Les groupes
   LIV-04 à LIV-07 doivent enregistrer les leurs (arrivée, code_remise, dépôt…) pour que le geste hors connexion ait
   son effet côté « serveur ». Types ajoutés à `TypeAction` : message, contestation, stockage, preference.
5. **Écritures croisées de la démonstration** (le « serveur ») : incident validé → `etatTournee` (arrêt dissocié :
   `echec`, `enCours` suivant), transfert → `etatSession.colisSousGarde`, pause par `demoDisponibilite.changer` ;
   clôture → `demoDisponibilite.changer('hors_service')`, dépôt au stockage → `colisSousGarde = 0`. À garder
   compatibles si LIV-03/04/05 changent la forme de ces états.
6. **Kit par format** : la clôture tient son propre « reçu le matin » par format (S, M, L, C1, C2) ; le domaine `kit`
   (LIV-04) devrait l'exposer, avec les étiquettes liées par format (ramassage LIV-06).
7. **API de domaines changées** : `incidents.declarer(…)` remplace `signaler` ; `journee.controle()` garde
   `possible`/`blocages` (seule la garde bloque, LIV-08-R05) et ajoute contrôles, bilan, kit, chronologie ; le bouton
   « Un problème ici ? » de la tournée doit ouvrir `incident?arret=<id>`.

## Reprise sur le prototype HTML (11 oct. 2026) — besoins hors du groupe
8. **Kit commun** (`composants/livraison/prototype.css`, `prototype-ecarts.css`) : `.lvp .cr` (rouge) et `.lvp .inp:focus-within`
   manquent ; `.hero.acc` (dégradé `--acc-grad`) est trop clair sous un texte blanc (contraste 1,8 : 1) ; `.pill.sm`,
   `.livc-hm span`, `.livc-tag`, `.livc-q .qs`, `.stop .ss`, `.tl .td` sont sous 12 px ; le dégradé de `.livc-sosbar` est
   trop clair pour son texte de 12,5 px ; `.livc-x` fait 40 px (cible 44). Corrigés pour LIV-08 seulement, sous `.lvp.l8`
   (liv08.css) : à remonter dans le kit. `.stepper .st.cur` reste orange braise (DP-64 : vert ?).
9. **Incident, suivi** : le prototype montre la photo de la devanture et une vignette de carte (attente, validé) ; le domaine
   `incidents` ne donne que le nombre de photos et pas de position d'arrêt : ajouter l'adresse signée de la première
   preuve et la position de l'arrêt (CarteZone). Validé : « 5 colis attendus au lieu de 8 » (livc-big) demande les colis
   attendus avant / après dans `ajustement`. `ajustement.arrets[].nom` peut porter le prénom d'un client à domicile
   (démonstration « Solange ») : donner le type d'arrêt pour n'afficher que le quartier.
10. **Synchronisation** : la démonstration n'a pas d'état « panne annoncée », « écart avec le serveur » ni « élément expiré »
    atteignable (les rendus existent ; vérifiés en injectant un élément expiré) ; un scénario `?demo=` aiderait.
11. **Clôture, état clôturé** : l'écart de kit expliqué (« Kit : 1 écart expliqué ») n'est pas relu après la clôture
    (`journee.controle()` ne garde pas le comptage) : l'écran affiche « Kit compté » et renvoie au kit.

## Kits unifiés (12 oct. 2026)
Les remarques ci-dessus sur `composants/livraison/prototype.css`, `prototype-ecarts.css`, `proto.tsx`, `CodeSix` et les
feuilles de groupe sont réglées : voir LIV-05/INTEGRATION.md, « Kits unifiés ».
