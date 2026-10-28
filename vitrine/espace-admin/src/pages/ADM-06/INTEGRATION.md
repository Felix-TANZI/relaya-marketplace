# S3 (ADM-06, ADM-07, page ajoutée `qualite`) — besoins dans les fichiers communs

À appliquer à la vague d'intégration (aucun de ces fichiers n'a été touché par S3, sauf l'extraction de domaine prévue
par METHODE § 2 : `src/demo/lectures.ts` perd les blocs `demoActeurs` / `demoCatalogue`, `src/demo/source-demo.ts`
les importe de `src/demo/acteurs.ts` et `src/demo/catalogue.ts`).

1. **Droit de la page ajoutée** — `src/config/droits.ts`, bloc « Pages ajoutées » :
   `qualite: ['oui', 'aucun', 'lecture', 'oui', ['zone', 'Sa zone'], 'lecture', 'lecture', 'aucun'],`
   (Direction et Médiation : tout ; Support, Vérification, Audit : lecture ; Opérations : leurs zones ; Finance et
   agent terrain : rien, A-10). Tant que la ligne manque, la page répond « Réservé » à tous et le test
   `ADM-07.gestes › Qualité des acteurs` se met de côté (skip). — **fait** (intégration : ligne `qualite` présente dans la matrice).)
2. **Navigation** — `src/config/navigation.ts`, groupe « Acteurs et confiance », juste après `paliers` :
   `{ route: 'qualite', titre: 'Qualité des acteurs', icone: 'activity' },` — **fait** (intégration : entrée présente dans la navigation, après `paliers`).)
3. **Compteurs et File d'action** — `src/demo/compteurs.ts` et `src/demo/files.ts` lisent encore les tableaux figés du
   jeu d'essai (KYC, PALIERS_A_VALIDER, OFFRES_A_MODERER) : après une décision, le compteur ne bouge pas. Lire à la place
   `kycARevoir()`, `paliersAValider()`, `sanctionsAOuvrir()` (`src/demo/acteurs.ts`) et `offresAModerer()`
   (`src/demo/catalogue.ts`) ; carte de la File pour les sanctions proposées et les recours (rôles superviseur,
   mediation), et compteur `sanctions` dans `Badges` (navigation : badge sur « Sanctions et recours »). — **fait** (intégration : `kycARevoir()`, `paliersAValider()`, `sanctionsAOuvrir()`, `offresAModerer()` lus par `files.ts` et `compteurs.ts` ; famille de carte « sanction » (superviseur, mediation) ; compteur `sanctions` et badge sur « Sanctions et recours »).)
4. **Pont** — `src/demo/pont.ts` (et la copie des autres espaces) : typer dans `EvenementPont` les événements publiés
   par S3 (`src/demo/acteurs.ts`, type `EvenementS3`) : `kyc_decide`, `palier_decide`, `sanction_decidee`,
   `ifa_decide`, `fiche_decidee`, `offre_moderee`, `avis_modere` (noms de CONNEXIONS.md). Ils partent déjà dans
   `blv_pont` avec `app: 'admin'` ; les espaces vendeur, relais, entreprise, livreur et client doivent les lire
   (`evenementsDe('admin')`). Déjà typés et publiés : `piece_demandee` (selfie à reprendre d'un livreur),
   `livreur_suspendu` (sanction de niveau 3 d'un livreur). — **fait** (intégration : `EvenementS3` retiré de `acteurs.ts`, ses sept types sont dans `EvenementPont` ; `publierS3` ne convertit plus. L'entreprise et le livreur lisent `piece_demandee`, `livreur_suspendu` ; le vendeur, le relais et le client n'ont pas de pont de démonstration : A-VALIDER § 6).)
5. **Une seule feuille de décision** — `src/composants/DecisionMotivee.tsx` : accepter une prop `envoyer(motif)` (la
   méthode du domaine qui décide et refuse : conflit d'intérêts, pièces non vues, auteur du recours…) et des `children`
   (raison, pièces, événements cités). S3 utilise d'ici là `FeuilleDecision` (`src/pages/ADM-06/commun.tsx`), même
   gabarit, même motif minimal, même avertissement des quatre yeux. — **fait** (intégration : `DecisionMotivee` accepte `envoyer(motif)`, `refus`, `children`, `vu`, `bloque`, `motif`, `danger`, `icone`, `avertissement` ; `FeuilleDecision` est retirée, les huit écrans S3 utilisent `DecisionMotivee` ; table des refus commune `composants/refus.ts`).)
6. **Pièces d'identité** — `src/composants/PieceIdentite.tsx` `NATURE` : ajouter `cni_recto`, `cni_verso`,
   `selfie_video`, `niu`, `mint`, `assurance`, `carte_grise` (S3 passe aujourd'hui le libellé traduit). — **fait** (intégration : `NATURE` de `PieceIdentite` couvre `cni_recto`, `cni_verso`, `selfie_video`, `niu`, `mint`, `assurance`, `carte_grise`… ; Kyc passe le code, plus le libellé).)
7. **Registre** — S3 lit le registre officiel puis `logique-metier/admin/parametres-admin.json` pour les codes absents
   de l'officiel (`src/pages/ADM-06/calculs/regles.ts`, `registreS3`) : `KYC-SEUIL-VISAGE`, `ADM-APPAREIL-COMPTES`,
   `TS-HYST-J`, `TS-HYST-ECART`, `TS-BAISSE-MAX`, `TS-VETO-PLAFOND`, `TS-GEL-INACTIF-J`, `MEDIATEUR-DELAI`,
   `MOD-ECART-MAX`, `PRIX-BARRE-JOURS`, `CAT-FUSION-TETE`, `CAT-FUSION-RETOUR`, `AVIS-REPONSE-J`. À verser au registre
   officiel (`logique-metier/outils/construire.py`) ; et alléger `parametres-admin.json` à la construction comme le
   registre officiel (`vite.config.ts`, `allegerJson` : code, valeur, unité), le bloc `regles` pèse 143 Ko. — **fait**
   (intégration : ces codes sont au registre officiel par `logique-metier/parametres.json` ; `MEDIATEUR-DELAI` est lu
   sous `LIT-MEDIATEUR-J`, même valeur ; `registreS3` retiré, `lireS3` lit `REGISTRE` ; `parametres-admin.json` n'est
   plus importé par l'appli, rien à alléger).
8. **Données masquées** — `logique-metier/visibilite-anonymat.json` : lignes « Téléphone du vendeur » et « Téléphone du
   client » (colonne Console : démasquage motivé), employées par `Masque` sur la fiche vendeur et la fiche client. — **fait** (intégration : ligne « Numéro de téléphone du vendeur » ajoutée à `visibilite-anonymat.json` (console : masqué par défaut, démasquage motivé) ; la ligne du client précise le démasquage ; la fiche vendeur emploie ce libellé. À reporter dans la source du tableau si `outils/organiser.py` le régénère).)
