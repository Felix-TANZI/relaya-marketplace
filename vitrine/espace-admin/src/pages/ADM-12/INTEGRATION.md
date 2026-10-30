# S6 — besoins dans les fichiers communs (vague d'intégration)

1. `src/demo/journal.ts` : **seul changement fait dans un fichier commun** — `demoGouvernance` y est typé
   `Pick<DomaineGouvernance, 'journal' | 'verifierChaine' | 'ecrire' | 'agents'>` (le reste du domaine vit dans
   `src/demo/gouvernance.ts`, branché dans `source-demo.ts` par une ligne). Garder les deux à la fusion. — **fait** (intégration : gardé tel quel).)
2. `src/demo/journal.ts` : `chainer` pourrait porter `avant`, `apres`, `adresse`, `appareil` dans l'empreinte ; S6 les
   garde à côté de la ligne (`gouvDemo.details[empreinte]`) en attendant. — **fait** (intégration : `EntreeJournal` et `LigneJournal` portent `avant` et `apres`, inclus dans l'empreinte quand la ligne les a ; `noter` les passe à `journaliser`. L'adresse et l'appareil restent à côté (données de connexion du serveur, pas du geste)).)
3. `src/config/parametres-proposes.ts` : reporter les codes de `src/demo/registre-s6.ts` (PROPOSES_S6), puis lire
   `REGISTRE_S6` → `REGISTRE`. — **fait** (intégration : codes au registre officiel, `PROPOSES_S6` retiré,
   `REGISTRE_S6` = `REGISTRE` ; `ADM-BRIS-GLACE` et `ADM-SESSION-INACTIF` lus sous `ADM-BRIS-GLACE-H` et
   `ADM-SESSION-INACTIF-MIN` (S1) ; créneaux interdits lus de `maintenance_creneaux_interdits`).
4. `src/demo/compteurs.ts` : le compteur `fraude` lit `ALERTES_FRAUDE` (jeu d'essai) ; le brancher sur
   `alertesAInstruire()` de `src/demo/gouvernance.ts` (alertes calculées, état « nouvelle »). — **fait** (intégration : `compteurs.ts` lit `alertesAInstruire()`).)
5. `src/demo/files.ts` (S1) : cartes de la File d'action « fraude » (alertes nouvelles), « gel à revoir » (revue due),
   « demande de données à échéance < 7 j », « tâche en échec ». — **fait** (intégration : `files.ts` : alertes nouvelles, gels dont la revue est due sous 24 h, demandes de données à moins de 7 jours, tâches en échec (famille « systeme », Direction)).)
6. `src/config/droits.ts` : ajouter un geste `fraude.decider` (aujourd'hui `sanction.decider`, mêmes rôles) et
   `tache.lancer`, `maintenance.programmer`, `legal.publier` (Direction) ; la source S6 les contrôle par rôle. — **fait** (intégration : gestes `fraude.decider`, `tache.lancer`, `maintenance.programmer`, `legal.publier` dans `PERMISSIONS` ; la source S6 les exige ; `Fraude.tsx` lit `fraude.decider`).)
7. `src/demo/pont.ts` : événements à typer et publier — `versement_gele` / `versement_degele` (vendeur, motif sous 48 h),
   `maintenance_annoncee` / `maintenance_annulee` (six espaces), `texte_annonce` (nouvelle acceptation), `fiche_a_valider`
   (vendeur ou relais : lien de validation), `donnees_exportees` (acteur), `espace_ouvert`. — **fait** (intégration : types ajoutés et publiés : `versement_gele` (à la contre-signature du gel), `versement_degele`, `maintenance_annoncee` / `maintenance_annulee`, `texte_annonce`, `fiche_a_valider`, `donnees_exportees`, `espace_ouvert`).)
8. `src/composants/coque.tsx` : à 1280 px, le fil d'Ariane de la barre du haut chevauche le titre (« Acteurs et
   confiancFraude et anneaux »). — **fait** (intégration : `ecarts.css` : chevrons fixes, libellés abrégés par « … »).)
9. Groupe de navigation : « Fraude et anneaux » est rangé sous « Acteurs et confiance » ; le prototype le met sous
   Gouvernance (fil d'Ariane ADM-12). — **fait** (intégration : « Fraude et anneaux » rangé sous Gouvernance).)
10. S3 (`sanctions`) : lister les propositions venues de la fraude (ligne de journal `sanction.proposer`, objet FR-…). — **fait** (intégration : proposer une sanction depuis la fraude ouvre un dossier `SN-` dans Sanctions et recours (`creerSanction`, niveau 2, origine « Alerte de fraude FR-… »), un par compte vendeur de l'alerte).)
