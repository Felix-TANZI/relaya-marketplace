# Espace vendeur — méthode de reprise d'un écran (vague 2)

Ce document dit comment un agent reprend un groupe d'écrans `VD-xx` **en parallèle des autres, sans les gêner**.
L'écran de référence est l'**Accueil** (`src/pages/VD-04/Accueil.tsx`, `tests/VD-04.gestes.spec.ts`) : le
recopier comme patron.

Lire d'abord : `logique-metier/vendeur/PLAN-VENDEUR.md` (règles de fond), `logique-metier/vendeur/TACHES-VENDEUR.md`
(section A : toutes les consignes du porteur ; section C : les 12 sous-tâches ci-dessous, à cocher écran par écran),
`logique-metier/vendeur/analyse/07-prototype-pages-captures.md` (inventaire des 73 routes),
`logique-metier/vendeur/prototype/RAPPORT.md` (10 défauts du prototype).

## 1. Règles de fond (PLAN-VENDEUR.md, TACHES-VENDEUR.md A)

1. **Source unique** : le paquet « 3 — Espace vendeur » du 1er octobre, extrait dans `logique-metier/vendeur/` ; les
   décisions du porteur (DP-01 à DP-57, `logique-metier/decisions-porteur.md`) l'emportent.
2. **« BelivaY ne perd jamais »** (DP-55) ; commission VD-02 ; **aucun montant écrit dans le code** : les montants
   viennent de la source (démonstration : calculés par `src/calculs/`, portage des moteurs Python). Les chiffres du
   jeu d'essai sont des données ; seules les règles comptent.
3. **Prototype = squelette** (DP-54) : en-têtes à design (logo, carte de tête, pastilles) **intouchables** ; le
   contenu s'enrichit, rien d'utile n'est retiré ; un écran sans utilité (démonstration) est retiré.
4. **Pages logiques** (DP-53) : vraies saisies, vraies issues, compteurs et montants qui suivent les gestes, aucun
   bouton mort, **aucun lien « # »**, aucun état écrit d'avance.
5. **Anonymat** (GEN-01) : le vendeur ne voit jamais l'identité, le numéro, le quartier, le relais ni le total payé du
   client. Aucun type de `src/donnees/domaines/` ne porte ces champs (`tests/squelette.spec.ts` le vérifie).
6. **Rôle Préparation** : aucun montant visible, rien à acheter. `useMontantsVisibles()` avant tout montant ; les
   domaines d'argent refusent l'accès (`ReserveAuProprietaire`, comme le 403 `owner_only` du serveur).
7. **FR / EN** partout (`t()`, `tf()`), pas de pidgin (DP-13, Q-44) ; clair et sombre ; texte grand.
8. **Même famille que le client** (TACHES A) : fonctions ressemblantes, mêmes composants d'animation (pastille des
   sélecteurs, choix en liste, minuteurs, bulle de verre liquide, gerbes, sons, entrées rapides et nettes), coupés
   avec « mouvement réduit » et sous navigateur piloté (`mouvementLibre()` du client) ; profil complet (photo
   rognée, nom, e-mail, numéro avec codes, DP-52 : domaine `compte`).
9. **Connecté au client** : même domaine (`/vendeur/`), même contrat d'API, même registre de paramètres.
10. Ne jamais pousser ni fusionner sans le signal du porteur. Commits en français, un par écran ou par sujet.

## 2. Ce que chaque agent a le droit de toucher

| Fichier | Qui |
|---|---|
| `src/pages/VD-xx/**` (ses écrans, son `routes.ts`, ses composants propres) | l'agent du groupe VD-xx **seulement** |
| `src/donnees/domaines/<domaine>.ts` (types et interface du domaine) | l'agent qui possède ce domaine (tableau ci-dessous) |
| `src/demo/<domaine>.ts` (démonstration du domaine) | idem |
| `src/i18n/VD-xx.en.json` (textes anglais ajoutés) ; `src/i18n/VD-xx.fr.json` (corrections du texte français) | l'agent du groupe |
| `tests/VD-xx.*.spec.ts` (gestes de ses écrans) | l'agent du groupe |

Domaines par groupe (un domaine utilisé par deux groupes appartient au premier ; l'autre le **lit** et demande un
ajout dans son compte rendu) :

| Groupe | Écrans | Domaines possédés |
|---|---|---|
| VD-03 | connexion, ouvrir, otp, kyc, saisie_assistee, installer, lancement, faceid, bienvenue_client | `session` (connexion, 2FA) |
| VD-04 | accueil (repris), accueil_calme, premier_jour, horsligne, suspendu | `accueil` |
| VD-05 | commandes, commande, rupture, delai, bon, journal | `commandes`, `preparation` |
| VD-06 | commande_prete, commande_remise, recu, erreurs | `remise` |
| VD-07 | litiges, litige, litige_envoye, retours, inspection, remplacement | `litiges`, `retours` |
| VD-08 | produits, offre_detail, offre1, fiche, offre2, camera, offre3, offre4, offre_publiee, dupliquer | `produits`, `offres` |
| VD-09 | argent, se_libere, gele, gains, documents, versements, numero_versement | `argent`, `versements` |
| VD-10 | palier, score, paliers, sanctions, contester, plans_liste, plans, visibilite, services, chiffres, demande | `trust`, `paliers`, `plans` |
| VD-11 | menu, boutique, horaires, emplacement, equipe, parametres, securite, notifications, avis, messages, aide | `boutique`, `compte`, `equipe`, `messages`, `notifications`, `aide` |

**Fichiers communs — à ne modifier qu'en vague d'intégration** (signaler le besoin dans le compte rendu) :
`src/composants/*` (coque, en-têtes, barre du bas, menu du profil, Dessin, Icone), `src/config/*`,
`src/donnees/source.ts`, `src/donnees/communs.ts`, `src/donnees/useLecture.ts`, `src/demo/{jeu-essai,stockage,
horloge,source-demo}.ts`, `src/calculs/*`, `src/preferences.tsx`, `src/session.tsx`, `src/App.tsx`, `src/main.tsx`,
`src/styles/*`, `src/genere/*` (généré), `src/i18n/{dictionnaire,temps}.ts`, `src/i18n/commun.en.json`,
`tests/{commun,squelette,boutons,identique,gestes}.spec.ts`, `outils/*`, `vite.config.ts`, `package.json`.
**Rien dans `site/`** (l'espace client est terminé) : un fichier du client à changer se note pour plus tard.

## 3. Les 12 sous-tâches de chaque écran (TACHES-VENDEUR.md, C)

1. Extraire le balisage exact du prototype (en-tête intouchable), textes en t() FR/EN
2. Brancher sur la SourceVendeur démo (aucun chiffre écrit en dur ; montants via src/calculs)
3. Appliquer les règles du registre-vendeur.json de l'écran (et DP-55/56), états vide / chargement / erreur / hors ligne
4. Vraies saisies vérifiées, vraies issues ; aucun bouton mort, aucun lien « # »
5. Enrichir : fonctions manquantes dont le vendeur a besoin (comme côté client : filtres, recherche, partage, historique, aide contextuelle, raccourcis)
6. Rôle Préparation : aucun montant visible, aucun achat ; anonymat du client respecté
7. Liens vers le client et les autres interfaces (commande, litige, avis, question, relais, livreur)
8. Animations comme le client (entrée, pastilles, compteurs, feuilles, retours tactiles), sons, verre ; réduites si mouvement réduit
9. Photos et illustrations : réelles, remplaçables, sans marque ; images manquantes ajoutées
10. Clair / sombre, FR / EN, texte grand, 360–430 px sans débordement ; défauts du prototype corrigés
11. Test de gestes de l'écran + passage au test boutons ; statut « repris » dans pages.json
12. Vérification : conformité aux règles, tests verts, relecture

## 4. Reprendre un écran, pas à pas (patron : l'Accueil)

1. **Point de départ** : la page provisoire `src/pages/VD-xx/provisoires/<Écran>.tsx` (générée, un rendu par état
   du prototype ; ne jamais la modifier à la main). Pour relire un état précis :
   `node outils/ecran.mjs --releve '#commande?ref=BLV-00009'` (balisage en JSX avec `t()`, icônes nommées).
   Les fonctions du prototype (`qPrep`, `C.btn`…) se lisent dans le fichier HTML du paquet
   (`outils/proto.mjs` dit où il est).
2. **Créer l'écran repris** à côté : `src/pages/VD-xx/<Écran>.tsx`, `export default function`. Garder **les mêmes
   balises, classes et styles** que le prototype (la feuille du prototype s'applique telle quelle), **un nœud de texte
   par nœud du prototype** (un texte coupé autrement change le rendu : `{`${a} · ${b}`}`, pas `{a} · {b}`).
   Coque : `<Ecran route="…">` (en-tête et barre selon la route ; `titre=` / `retour=` quand ils portent une donnée).
3. **Données** : `useLecture(() => source.<domaine>.<méthode>(), [clés])` ; jamais d'import de `src/demo/` dans un
   écran. Ajouter les méthodes manquantes dans `src/donnees/domaines/<domaine>.ts` (type, anonyme) et
   `src/demo/<domaine>.ts` (état dans `magasin('<domaine>', …)`, montants par `src/calculs`). Un geste écrit dans la
   source ; l'écran relit tout seul (`blv:donnees`).
4. **Textes** : `t('texte français exact')` ; phrase avec données : `tf('Il reste {n} commandes', { n })`, et sa
   traduction dans `src/i18n/VD-xx.en.json` (`"Il reste {n} commandes": "{n} orders left"`). Heures, durées,
   échéances : `src/i18n/temps.ts` (`heure`, `duree`, `echeance`, `creneau`, `entre`, `jourLong`…). Montants :
   `t(`${F(n)} F`)` (un seul nœud ; en anglais « 17,840 F »). Palier : `nomPalier()` (« Argent » = « Silver »).
5. **États du prototype** : sans paramètre, l'écran suit les données. Les adresses d'état du prototype
   (`?closed=1`, `?alerte=1`, `?f=pb`, `?ref=…`) restent des **scénarios** pour la comparaison au pixel ; `?role=prep`
   passe par la session (démonstration). Écran repris dont la coque doit suivre un scénario : `<Ecran parEtat>`.
6. **Gestes réels** : un lien mène ailleurs (`<Link to={chemin('commande', { ref })}>`) ; un geste est un `<button>`
   (ou `<a role="button" tabIndex={0}>` quand le prototype dessine un lien texte) qui appelle la source. Sons :
   `jouer('retrait' | 'code' | 'erreur' | …)` de `@client/composants/Sons` ; animations : classes du client
   (`src` client `styles/animations.css`), `mouvementLibre()` avant toute animation en JavaScript.
7. **Brancher** : dans `src/pages/VD-xx/routes.ts`, faire pointer la route vers l'écran repris et passer son statut à
   `'repris'`. C'est le seul fichier de routage à toucher. (`pages.json` est régénéré en vague d'intégration :
   `npm run inventaire`.)
8. **Tester** : `tests/VD-xx.gestes.spec.ts` (gabarit dans `tests/gestes.spec.ts`) ; puis
   `BOUTONS_ROUTES=<routes> npx playwright test tests/boutons.spec.ts` (écran repris : aucun élément sans effet) ;
   `npx playwright test tests/identique.spec.ts -g <route>` (en-tête au pixel ; états du prototype au pixel, montants
   recalculés déclarés dans `CORRECTIONS` du test en vague d'intégration) ; `tests/squelette.spec.ts`.
9. **Vérifier** (trois fois, mémoire du porteur) : conformité aux règles et au registre, tests verts, relecture ; puis
   commit (message en français, terminé par la ligne Co-Authored-By).

## 5. Socle disponible

- **Calculs** (`src/calculs/`, tests `npm run calculs`) : `calculerCommission`, `seuilCommissionMinimale`,
  `prixMinimumPubliable`, `simulerPlans`, `remiseDePlan`, `decouverteActive` ; `dateDeLiberation`,
  `vendrediDeVersement`, `montantDu`, `progressionPourCent`, `essaisApresRefus`, `finDeRevue` ; `palierAtteint`,
  `evolution`, `palierDeLancement`, `paliersEffectifs` ; `quantiteAttribuable` ; `liberation` ; paramètres
  `PARAMETRES` lus dans `logique-metier/parametres-en-vigueur.json`.
- **Coque** (`src/composants/coque.tsx`) : `Ecran`, `EnTeteRacine`, `EnTeteEnfant`, `BarreDuBas`, `usePastilles`,
  `nomPalier` ; `MenuProfil` ; `PreferencesDuMenu` (à inclure dans le Menu repris, Q-45) ; `Vignette`,
  `PhotoDessinee`, `Dessin` ; `Icone`.
- **Session** (`src/session.tsx`) : `useSession`, `useRole`, `useMontantsVisibles`, `useHorloge` (heure du serveur
  qui avance, pour les comptes à rebours).
- **Client réutilisé** par `@client/*` : `api/client`, `api/erreurs`, `config/env`, `i18n/format` (`F`, `badge`),
  `composants/Sons` (`jouer`), `Animations` (`mouvementLibre`, `useTirerPourActualiser`), `BarreBas`, `Feuille`
  (`Feuille`, `useFeuille`), `SaisieCode`, `Rognage`, `Position`, `PayerMomo`, `CompteARebours`, `Chrono`,
  `RetourMemoire`, `connecteurs/suivi`. Leurs imports de préférences, icônes, routes et source sont redirigés vers
  ceux du vendeur (`vite.config.ts`, `REDIRECTIONS`).
- **Outils** (`outils/`) : `inventaire.mjs` (pages.json), `styles.mjs`, `prototype.mjs` (dictionnaire, icônes,
  illustrations), `etats.mjs` (relevé de chaque état), `ecran.mjs` (pages provisoires, `--releve`).

## 6. Lancer

```bash
export PATH=~/.local/node/bin:$PATH
cd espace-vendeur
npm ci
npm run dev                         # http://localhost:5174/vendeur/
npm run calculs                     # tests des calculs (Vitest)
npx playwright test                 # construit puis teste (aperçu sur le port 4175)
PW_REUTILISER=1 npx playwright test # contre un aperçu déjà lancé : npx vite preview --port 4175
npm run donnees                     # relit le prototype (après une mise à jour du paquet)
```
