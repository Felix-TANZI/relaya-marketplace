# Comptes réels sur le site Vercel

Sur le site hébergé par Vercel, les gens peuvent créer un **vrai compte** et s'y reconnecter plus tard, dans les six
espaces (client, vendeur, entreprise, livreur, point relais, console). **Seuls les comptes sont réels** : les
produits, les commandes, l'argent et tout le reste restent la démonstration. Le compte de démonstration de chaque
espace marche toujours (mot de passe d'essai `Belivay2026`).

Tant que la base n'est pas créée, rien ne casse : les écrans disent « Les comptes réels ne sont pas encore ouverts »
et le compte de démonstration reste utilisable.

---

## 1. Créer la base (une fois, 5 minutes)

1. Ouvrir [vercel.com](https://vercel.com), équipe **beliva-y**, projet du site (celui dont la racine est `site/`).
2. Onglet **Storage** → **Create Database** → choisir **Neon** (Serverless Postgres) → **Continue**.
3. Région : la plus proche des utilisateurs (Europe, par exemple Frankfurt). Plan : **Free** suffit pour commencer.
4. Nom : `belivay-comptes` → **Create**.
5. Écran suivant **Connect Project** : choisir le projet du site, cocher les environnements **Production** et
   **Preview** (et **Development** si vous utilisez `vercel dev`) → **Connect**.
6. Vercel ajoute seul les variables `DATABASE_URL`, `POSTGRES_URL` (et d'autres `PG…`). Rien à copier à la main.
7. **Redéployer** : onglet **Deployments** → dernier déploiement → **⋯** → **Redeploy**. Les variables ne valent que
   pour les déploiements faits après leur ajout.

Les tables se créent seules au premier appel (migrations idempotentes). Aucune commande n'est nécessaire.

## 2. Vérifier

- **Settings → Environment Variables** : `DATABASE_URL` (ou `POSTGRES_URL`) est présent pour Production.
- Ouvrir `https://<votre-site>/api/auth/etat` : la page doit afficher `{"base":true,…}`.
  - `"base":false` : la base n'est pas liée à ce déploiement (refaire l'étape 1.5 puis redéployer).
- Créer un compte sur `/connexion-email?st=inscription`, se déconnecter (Compte → Se déconnecter), se reconnecter.

## 3. Le compte propriétaire de la console (`/admin/`)

Le premier compte de la console n'est jamais créé par un formulaire public.

1. **Settings → Environment Variables** → ajouter :
   - `ADMIN_BOOTSTRAP_EMAIL` = votre adresse (ex. `belivaycm@gmail.com`) ;
   - `ADMIN_BOOTSTRAP_CODE` = une phrase secrète d'au moins 12 caractères, connue de vous seul ;
   - `TOTP_CLE` = une longue phrase aléatoire d'au moins 32 caractères (elle chiffre les secrets du second facteur ;
     ne la changez plus ensuite, sinon chacun devra se réenrôler). **Sans elle, la console ne s'ouvre pas.**
2. Redéployer.
3. Premier mot de passe : envoyer une fois (depuis la console du navigateur ouverte sur le site, ou un futur écran
   « premier accès ») :
   ```js
   fetch('/api/auth/console/premier-acces?espace=console', { method: 'POST', headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email: 'votre adresse', code: 'votre phrase secrète', mot_de_passe: 'votre mot de passe' }) })
   ```
   La réponse ne donne **pas** de session : elle donne un défi d'enrôlement du **second facteur** (obligatoire pour
   toute la console). L'écran montre un QR à scanner avec une application d'authentification (Google Authenticator,
   Microsoft Authenticator, 1Password…), puis demande le code à 6 chiffres : la session s'ouvre et **dix codes de
   secours** s'affichent une seule fois (à garder hors ligne ; chacun ne sert qu'une fois). Ensuite, chaque connexion à
   la console demande le mot de passe puis le code de l'application (ou un code de secours).
   Cette porte se ferme dès que le propriétaire a un mot de passe. Variante sans code : avec les e-mails branchés
   (section 4), « mot de passe oublié » sur `/admin/` avec cette adresse envoie le lien du premier mot de passe.
4. Vous pouvez ensuite retirer `ADMIN_BOOTSTRAP_CODE`.
5. Les autres membres de la console sont **invités** par le propriétaire (`POST /api/auth/invitations?espace=console`
   avec `email` et `role` : superviseur, finance, support, mediation, operations, verification, audit, terrain, rh) ; le
   lien d'invitation (72 h, une fois) leur sert à créer leur accès.

## 4. Envoyer les e-mails (facultatif) : Resend

Sans clé, **aucun e-mail ne part** et rien n'est simulé : « mot de passe oublié » dit de contacter le support, et
l'invitant reçoit le lien d'invitation à transmettre lui-même (WhatsApp, SMS).

1. Créer un compte sur [resend.com](https://resend.com), ajouter et vérifier le domaine d'envoi (ex. `belivay.com`).
2. Créer une clé d'API (**API Keys** → **Create**), droit « Sending access ».
3. Vercel → Environment Variables : `RESEND_API_KEY` = la clé ; `EMAIL_EXPEDITEUR` = `BelivaY <comptes@belivay.com>`.
4. Redéployer. `/api/auth/etat` affiche alors `"email":true`.

## 5. Qui crée quel compte

| Espace | Comment le compte naît | Statut à la création |
|---|---|---|
| Client, diaspora | Inscription libre (e-mail + mot de passe, conditions acceptées et datées) | actif |
| Vendeur | Inscription | **en attente de validation** |
| Entreprise de livraison | Candidature (nom de l'entreprise, etc.) | **en attente** |
| Point relais | Candidature (nom du relais, etc.) | **en attente** |
| Livreur | Invitation par son entreprise (validée), lien à usage unique ; il choisit son PIN | actif |
| Membre d'un point relais | Invitation par le gérant (relais validé) ; il choisit son PIN | actif |
| Console | Propriétaire : section 3 ; membres : invitation | actif |

Livreur et point relais se connectent par leur **numéro (ou e-mail) et leur PIN** : aucun SMS ne part encore (le
fournisseur viendra plus tard) ; le PIN est haché comme un mot de passe, 5 PIN faux bloquent 15 minutes. PIN oublié :
le responsable ou le support (le lien « mot de passe oublié » par e-mail marche aussi quand Resend est branché).

Règles : mot de passe de 8 caractères au moins, dont une lettre et un chiffre (livreur et relais : un code de 6
chiffres non trivial est aussi accepté) ; le mot de passe de la démonstration est refusé pour un compte réel.

## 6. Voir, valider, supprimer des comptes

- **Neon** (Vercel → Storage → `belivay-comptes` → **Open in Neon** → **SQL Editor**) :
  ```sql
  SELECT id, espace, email, role, statut, cree_le FROM comptes ORDER BY cree_le DESC;
  UPDATE comptes SET statut = 'actif' WHERE id = '…';      -- valider un vendeur, une entreprise, un relais
  UPDATE comptes SET statut = 'refuse' WHERE id = '…';     -- refuser (ses sessions ne valent plus)
  DELETE FROM comptes WHERE id = '…';                      -- suppression réelle (sessions et jetons compris)
  ```
- **Console, connecté comme propriétaire** : `GET /api/admin/comptes?espace=console` (filtres `filtre_espace`,
  `statut`), `POST /api/admin/comptes/<id>/statut?espace=console` `{"statut":"actif"}`,
  `DELETE /api/admin/comptes/<id>?espace=console`.
- **Terminal** (dans `site/`, après `vercel env pull .env.local`) : `npm run db:comptes` (liste),
  `npm run db:comptes -- valider <id>`, `npm run db:comptes -- supprimer <id>`,
  `npm run db:comptes -- lien <adresse du propriétaire>` (lien de premier mot de passe sans e-mail).
- Chaque personne peut **supprimer son compte** elle-même (mot de passe demandé) : la ligne est effacée de la base.

## 7. Sécurité (ce que fait le serveur)

- Mots de passe hachés par scrypt (sel unique, N = 2^15), comparaison à temps constant ; jamais en clair, ni dans la
  base ni dans les journaux.
- Session : cookie `__Host-blv_s_<espace>` `HttpOnly; Secure; SameSite=Lax`, une par appareil, 12 h (ou 30 jours avec
  « Se souvenir de moi »), révocable (`/api/auth/sessions`) ; changer ou réinitialiser le mot de passe ferme les autres.
- Écritures acceptées seulement depuis le même site (en-tête Origin) ; corps JSON validé strictement.
- Limites en base : 5 mots de passe faux par compte → 15 min de blocage ; limites par adresse IP sur la connexion,
  l'inscription, le mot de passe oublié.
- Les réponses de connexion et de mot de passe oublié ne disent jamais si une adresse a un compte. (L'inscription
  d'une adresse déjà prise répond « impossible de créer un compte avec cette adresse », limitée par IP.)
- Lien de mot de passe oublié : 30 min, une seule fois ; lien d'invitation : 72 h, une seule fois.
- Console : second facteur TOTP obligatoire (RFC 6238, fenêtre ±30 s, un code ne sert qu'une fois), secret chiffré au
  repos (AES-256-GCM, clé `TOTP_CLE`), 10 codes de secours à usage unique (seule leur empreinte est gardée), 5 codes
  faux → 15 min ; le mot de passe seul ne donne jamais de session. Nouveaux codes de secours :
  `POST /api/auth/2fa/codes-secours?espace=console` (mot de passe demandé).

## 8. Données personnelles

- **Minimisation** : le serveur ne garde que l'e-mail, le téléphone (si donné), le prénom, le nom, la photo (si donnée,
  150 Ko au plus), le rôle, le statut, la candidature, le consentement (version et date) et les appareils connectés
  (résumé « Chrome · Android », jamais l'en-tête complet ni l'adresse IP). Les adresses IP et e-mails des limites de
  tentatives ne sont gardés que sous forme d'empreinte (HMAC) et effacés à la fin de la fenêtre.
- **Chiffré ou haché** : mots de passe et PIN (scrypt), jetons de session et de lien (empreinte SHA-256), secret du second
  facteur (AES-256-GCM, `TOTP_CLE`), codes de secours (empreinte). Neon chiffre aussi le disque et les sauvegardes.
- **Journaux** : jamais de corps de requête, d'e-mail, de numéro ni de mot de passe ; seulement la route et un code
  d'erreur (journal de Vercel et table `journal_serveur`, gardée 30 jours).
- **Droit d'accès / portabilité** : chacun télécharge ses données (`GET /api/auth/export`, `comptesReels.telechargerMesDonnees`).
  Demande reçue par le support : `npm run db:comptes -- exporter <id>`.
- **Effacement** : suppression réelle (section 6) ; elle part aussi des sauvegardes au bout de leur durée de rétention.

## 9. Exploitation

### Surveiller
- **Vercel → projet → Logs** (filtre `[comptes]`) : chaque erreur serveur y apparaît avec sa route et son code.
- **Journal** (propriétaire de la console) : `GET /api/admin/comptes/journal?espace=console` (200 dernières erreurs).
- **Santé** : `GET /api/auth/etat` doit répondre `{"base":true,…}`. Une alerte simple : un moniteur gratuit (UptimeRobot,
  Better Stack) qui appelle cette adresse toutes les 5 minutes et vous écrit si elle ne répond plus ou si `base` passe à
  `false`.
- **Neon → Monitoring** : connexions, stockage, temps de calcul (le plan gratuit a des quotas).

### Sauvegarder et restaurer
- **Restauration à un instant (PITR)** : Neon garde l'historique de la base pendant la durée de rétention de votre offre
  (Neon → projet → **Settings → Storage / History retention** : quelques heures en gratuit, jusqu'à 30 jours sur les
  offres payantes ; à vérifier et à monter dès que les comptes ont de la valeur).
- **Restaurer** : Neon → **Restore** (ou **Branches → Create branch** à un instant passé), vérifier la branche, puis
  restaurer la branche principale ou faire pointer `DATABASE_URL` vers la branche restaurée et redéployer.
- **Copie hors de Neon** (recommandé chaque semaine, et avant toute migration) : depuis un poste avec PostgreSQL,
  `pg_dump "$DATABASE_URL" --format=custom --file=comptes-AAAA-MM-JJ.dump`, rangée chiffrée (coffre, disque chiffré),
  jamais dans le dépôt. Restauration : `pg_restore --clean --if-exists --dbname "$URL_CIBLE" comptes-AAAA-MM-JJ.dump`.
- **Tester une restauration** une fois par trimestre sur une branche Neon (comptes présents, connexion possible).

### Migrations
- Versionnées (`site/serveur/base.js`, `MIGRATIONS`), chacune dans une transaction et sous verrou ; appliquées seules au
  premier appel, ou `npm run db:migrer`. `npm run db:comptes -- versions` montre l'état.
- **Avant** une nouvelle version : sauvegarde (ci-dessus), essai sur une branche Neon (`DATABASE_URL` de la branche).
- **Revenir** : `npm run db:comptes -- retour <version> --oui` (destructif pour ce que la version avait ajouté : faire la
  sauvegarde d'abord).

### Faire tourner les secrets (au moins une fois par an, et tout de suite après un départ ou un doute)
- **Mot de passe de la base** : Neon → **Roles → Reset password**, puis Vercel → `DATABASE_URL` / `POSTGRES_URL` mis à
  jour (Vercel Storage le fait pour une base liée) → redéployer.
- **`TOTP_CLE`** : garder l'ancienne en `TOTP_CLE_ANCIENNE`, choisir la nouvelle en `TOTP_CLE` (dans `.env.local`), lancer
  `npm run db:comptes -- tourner-totp`, puis mettre la nouvelle sur Vercel et redéployer ; supprimer ensuite l'ancienne.
- **`SECRET_COMPTES`** (facultatif) : la changer remet seulement les compteurs de tentatives à zéro.
- **`RESEND_API_KEY`** : nouvelle clé dans Resend, mise à jour sur Vercel, ancienne révoquée.
- **`ADMIN_BOOTSTRAP_CODE`** : à retirer dès le premier accès fait.
- Aucune de ces valeurs n'est dans le code ni dans le dépôt : seulement dans Vercel (et `.env.local`, ignoré par git).

### En cas d'incident
1. **Contenir** : fermer toutes les sessions — Neon SQL `DELETE FROM sessions;` (tout le monde se reconnecte) ; un compte
   précis : `UPDATE comptes SET statut = 'suspendu' WHERE id = '…';`.
2. **Couper si besoin** : retirer `DATABASE_URL` du projet Vercel et redéployer : les écrans disent que les comptes réels
   sont fermés, la démonstration continue.
3. **Changer les secrets** (ci-dessus), en commençant par celui qui est en cause.
4. **Comprendre** : journal de Vercel et `journal_serveur` (heures, routes, codes), Neon (historique, branche à l'instant
   d'avant pour comparer).
5. **Prévenir** : les personnes concernées et, si des données personnelles ont fuité, l'autorité de protection des
   données compétente dans les délais prévus par la loi applicable (Cameroun : loi de 2024 sur la protection des données
   personnelles) ; garder une trace écrite de l'incident et des mesures prises.
6. **Restaurer** si des données ont été altérées (PITR ou copie).

## 10. Ce qui reste en démonstration

Produits, catalogue, panier, commandes, paiements, portefeuille, livraisons, relais, messages, notifications, chiffres
des tableaux de bord, codes SMS de la démonstration (aucun SMS ne part : les comptes réels n'en ont pas besoin), connexion
Google et Apple. Un compte réel ouvre la démonstration
sous son nom (un client neuf voit un compte vide ; un vendeur, une entreprise, un relais voient la démonstration en
attendant leur validation).

Encore à faire côté écrans (branche des écrans de connexion), sur `comptesReels` (`site/src/comptes-reels/client.ts`) :
formulaires d'inscription vendeur / entreprise / relais, activation de l'invitation livreur (`?invitation=`, PIN),
écran du lien `?reinitialiser=` hors espace client et vendeur, QR d'enrôlement et codes de secours de la console
(`enrolementEnCours()`, `codesSecoursAMontrer()`, événement `blv:deuxieme-facteur` de
`espace-admin/src/donnees/session-hybride.ts`), saisie d'un code de secours (le champ actuel n'accepte que 6
chiffres), étape « code SMS » retirée du mot de passe vendeur quand `nouveau.sansCode` est vrai.

## Pour les développeurs

- Serveur : `site/serveur/` (routeur, règles, comptes, base) ; fonction unique `site/api/comptes.js`, réécriture
  `/api/:chemin*` dans `vercel.json`.
- Applications : `VITE_SOURCE=hybride` (build Vercel) ; `src/comptes-reels/` (client et aides), sources hybrides
  `site/src/donnees/source-hybride.ts` et `espace-*/src/donnees/session-hybride.ts`. `VITE_SOURCE=demo` (défaut
  local) ne change pas.
- Tests : `npm run test:comptes` (Postgres en mémoire, PGlite) ; `npm run test:comptes:e2e` (Playwright contre
  `npm run comptes:local`, serveur équivalent à Vercel).
