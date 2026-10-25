# Vitrine BelivaY sur belivay.com (« main 1 »)

> **À faire d'abord par un développeur** : poser les deux workflows livrés dans `vitrine/ci-a-appliquer/` (voir son `LISEZMOI.md`). GitHub ne permet pas à l'outil qui a préparé cette branche de modifier `.github/workflows/`.

**Branche** `feat/vitrine-belivay-main1` → **`dev`**. Ensuite, c'est vous qui passez `dev` vers `main` : le
déploiement de production ne part que de `main` (`.github/workflows/deploy.yml`).

## Quoi

belivay.com sert les **six espaces web BelivaY** à la place de l'ancien site client (`frontend/`, service
`frontend-client`). Ce sont les mêmes que sur Vercel (pg-beliva-y.vercel.app) :

| Adresse | Espace |
|---|---|
| `/` | client (boutique) |
| `/vendeur/` | vendeur |
| `/entreprise/` | entreprise de livraison |
| `/livreur/` | livreur |
| `/relais/` | point relais |
| `/admin/` | console (`noindex`) |

- **Produits, commandes, argent, livraisons : en démonstration.** Ce sont des données d'exemple (bandeau
  « démonstration » affiché). Elles seront remplacées par le vrai serveur (« main 2 »).
- **Comptes réels.** On peut créer un vrai compte et s'y reconnecter, dans les six espaces. Le compte de démonstration
  de chaque espace marche toujours.
- **Le back-end Django ne change pas.** On n'y touche pas, pas plus qu'aux applications mobiles, au jeu `frontend/` ni
  aux jobs de CI `backend` et `frontend`. Le kit Django de l'équipe produit n'est **pas** intégré.

## Pourquoi

- L'ancien site montrait de faux chiffres :
  - « 3 400 produits » ;
  - des ventes flash à compte à rebours ;
  - une catégorie « Produits demo ».
- La vitrine est le site validé par le porteur. Ici, ce qui est démonstration est **annoncé** comme tel.
- belivay.com reste sur votre serveur : même domaine, même nginx, même certificat, même procédure de déploiement.

## Comment

```
                       nginx (443, inchangé pour les 5 sous-domaines)
belivay.com ─┬─ /                       → vitrine           (fichiers des six espaces, aucun secret)
             ├─ /api/auth/*?espace=…     → vitrine-comptes   (comptes réels → base Neon)
             ├─ /api/admin/comptes*?espace=…  → vitrine-comptes
             ├─ /api/… (tout le reste)   → backend Django    (comme avant : mobile, santé, paiements…)
             └─ /django-admin/ /static/ /media/ /sitemap-*.xml → comme avant
```

- **`vitrine/`** contient les sources des six applications (`site/`, `espace-*/`). Ce sont les fichiers suivis par git du
  dépôt PG-BelivaY, sans modification :
  - branche `l/final-ligne`, commit `c3fae00fe0c9c1d290db49f8b2efbf41f88d2358` (voir `vitrine/SOURCE.txt`) ;
  - plus sept fichiers JSON de données que leur construction lit (`vitrine/logique-metier/…`, `routes-console.json`).
- **`vitrine/Dockerfile`** construit les six espaces **exactement comme Vercel** :
  - commande `site/outils/construire-tout.sh` ;
  - variables `VITE_DEMO=1`, `VITE_SOURCE=hybride`, `SITE_URL=https://belivay.com` ;
  - une application à la fois, pour garder la mémoire basse.

  Il produit deux images, une par cible :
  - `web` : les fichiers construits ;
  - `comptes` : le serveur des comptes. Cette cible ne construit pas les applications.
- **`vitrine/serveur/vitrine.mjs`** lit et applique **`site/vercel.json`**. belivay.com et Vercel suivent donc les mêmes
  règles :
  - redirections (`/vendeur` → `/vendeur/`) ;
  - une application monopage par espace ;
  - en-têtes de sécurité (CSP, HSTS, X-Frame-Options, Permissions-Policy, COOP…) ;
  - `X-Robots-Tag: noindex` sur `/admin/` ;
  - cache : 1 an pour les fichiers à empreinte, `no-cache` pour les service workers.

  En plus de ce que fait Vercel :
  - un fichier de construction manquant renvoie 404 (au lieu de la page d'accueil) ;
  - brotli et gzip sont calculés d'avance ;
  - ETag et réponses 304 ;
  - plages d'octets (lecture audio et vidéo).
- **Le routage de `/api/` vers les comptes passe par un `map` dans `nginx/nginx.conf`.**
  - Les appels des comptes de la vitrine sont **seulement** ceux qui portent `?espace=` avec l'une de ces valeurs :
    `client|vendeur|entreprise|livreur|relais|console`.
  - Django n'emploie jamais ce paramètre. Toute autre requête `/api/` va donc au back-end, comme avant, y compris
    `/api/auth/health/` (test de santé de `deploy.sh`) et les applications mobiles.

### Choix : un service des comptes dans le docker-compose, sur la base Neon existante

Nous avons choisi le service `vitrine-comptes`, branché sur la base Neon déjà utilisée par le site Vercel. Nous n'avons
**pas** gardé les comptes sur l'API Vercel. Raisons :

1. **Garder les comptes sur Vercel ne fonctionnerait pas sans changer le code.**
   - Les applications appellent `/api` sur **leur propre origine**.
   - La session est un cookie `__Host-…; SameSite=Lax`.
   - Le serveur refuse toute écriture venue d'une autre origine (en-tête `Origin`).
   - Depuis belivay.com, des appels vers vercel.app seraient donc des appels d'un autre site : cookie non envoyé,
     écritures refusées.
2. **La même base Neon de part et d'autre.** Un compte créé sur pg-beliva-y.vercel.app marche sur belivay.com, et
   l'inverse. On garde aussi les sauvegardes et la restauration à un instant de Neon. Le pilote de la vitrine est le
   client HTTP de Neon : il ne parlerait pas au Postgres local, et il n'a pas à le faire.
3. **Moindre privilège.**
   - Seul `vitrine-comptes` reçoit les secrets des comptes : pas d'`env_file`, rien du back-end.
   - `vitrine` ne reçoit aucun secret.
   - Les deux conteneurs sont en lecture seule (`read_only`) et tournent sans droits root (utilisateur `node`).

Le serveur doit pouvoir joindre Neon en HTTPS sortant (port 443).

## Fichiers modifiés hors de `vitrine/`

| Fichier | Changement |
|---|---|
| `docker-compose.prod.yml` | Services `vitrine` et `vitrine-comptes` ajoutés. `frontend-client` passe dans le profil `ancien-front` : il reste défini mais ne démarre plus. nginx dépend des deux nouveaux services. |
| `nginx/nginx.conf` | Bloc belivay.com / www : `/` va à la vitrine ; `/api/` passe par le `map`. Amont `frontend_client` retiré : nginx refuse de démarrer si un amont est introuvable. |
| `deploy.sh` | Construit `vitrine` et `vitrine-comptes` au lieu de `frontend-client`. Le test de santé vérifie aussi `/vendeur/` et `/api/auth/etat?espace=client`. Le retour arrière automatique est gardé pour les autres services au premier déploiement de la vitrine. L'ancien conteneur `frontend-client` est arrêté une fois le déploiement sain. |
| `.github/workflows/deploy.yml` | Sept variables `COMPTES_*` ajoutées à `.env.prod`. |
| `.github/workflows/ci.yml` | Nouveau job **Vitrine** (détail plus bas). Les jobs `backend` et `frontend` sont inchangés. |
| `.gitignore` | Exception pour les dossiers `src/assets/` de la vitrine (même exception qu'`espace-client-belivay/site/src/assets/`). |

Le job **Vitrine** de la CI enchaîne :
1. les tests du serveur des comptes ;
2. la construction des six espaces ;
3. `vitrine/serveur/verifier.mjs` sur le serveur local ;
4. la construction des deux images Docker, lancées en lecture seule ;
5. `vitrine/serveur/verifier.mjs` une seconde fois, sur les conteneurs.

Les cinq sous-domaines restent tels quels, sur l'ancien front : seller, courier, admin, relay-point, delivery-org. Voir
« Points d'attention ».

## Déployer

Les variables vont dans l'environnement GitHub **« Belivay Prod »** (Settings → Environments). Tant qu'elles sont
vides, les comptes réels sont fermés et la démonstration reste ouverte : rien ne casse.

| Nom (GitHub) | Type | Valeur |
|---|---|---|
| `COMPTES_DATABASE_URL` | secret | L'adresse de la base Neon `belivay-comptes`, **la même** que `DATABASE_URL` du projet Vercel. Pour la trouver : Vercel → Storage → `belivay-comptes` → `.env.local`, ou Neon → Connect. |
| `COMPTES_TOTP_CLE` | secret | **La même** que `TOTP_CLE` sur Vercel. Sinon, les seconds facteurs de la console ne se déchiffrent plus. Sans elle, la console ne s'ouvre pas. |
| `COMPTES_SECRET` | secret, facultatif | La même que `SECRET_COMPTES` sur Vercel, s'il y en a une. |
| `COMPTES_ADMIN_BOOTSTRAP_EMAIL` | variable | L'adresse du propriétaire de la console. |
| `COMPTES_ADMIN_BOOTSTRAP_CODE` | secret, temporaire | La phrase du premier accès. À retirer dès que ce premier accès est fait (`vitrine/site/COMPTES-REELS.md` § 3). |
| `COMPTES_RESEND_API_KEY` | secret, facultatif | La clé Resend. Sans elle, aucun e-mail ne part. |
| `COMPTES_EMAIL_EXPEDITEUR` | variable, facultatif | `BelivaY <comptes@belivay.com>` |

- Évitez le caractère `$` dans ces valeurs : docker compose l'interprète dans `.env.prod`. Pour une nouvelle clé :
  `openssl rand -hex 32`.
- Les tables existent déjà dans Neon (créées par le site Vercel). Sinon, elles se créent seules au premier appel.

**Étapes**
1. Relire et fusionner cette branche dans `dev`. Vérifier que la CI est verte, job **Vitrine** compris.
2. Poser les variables ci-dessus.
3. Passer `dev` vers `main`. Le CD (`deploy.yml`) se lance après la CI verte. On peut aussi le lancer à la main
   (« Run workflow »).
   - `deploy.sh` construit les images une par une ; la vitrine prend quelques minutes.
   - Il bascule, puis teste le back-end **et** la vitrine.
4. Une fois sur le serveur, rien d'autre à faire : `frontend-client` est arrêté automatiquement.

**Vérifier après le déploiement (5 minutes)**
- Les six adresses s'ouvrent : `https://belivay.com/`, `/vendeur/`, `/entreprise/`, `/livreur/`, `/relais/`,
  `/admin/`. Une adresse inventée affiche « Ce lien ne mène à aucune page ».
- `curl -sI https://belivay.com/admin/ | grep -i x-robots` doit afficher `noindex, nofollow`.
- `curl -s 'https://belivay.com/api/auth/etat?espace=client'` doit afficher `{"base":true,…}`. `false` veut dire que
  `COMPTES_DATABASE_URL` est absente.
- `curl -s https://belivay.com/api/auth/health/` doit répondre comme avant (Django).
- Les applications mobiles se connectent comme avant.
- Créer un compte client, se déconnecter, se reconnecter. Le même compte doit marcher sur pg-beliva-y.vercel.app.

## Revenir en arrière

**Méthode normale** :
1. `git revert` du commit de fusion sur `main`.
2. Le CD redéploie l'ancien front (`frontend-client`) avec l'ancien `nginx.conf`.

La base Django n'est pas concernée : cette PR n'a aucune migration. La base des comptes, sur Neon, n'est pas touchée
non plus.

**Urgence, sur le serveur** (dans `TARGET_PATH`) :
```sh
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"
git checkout <commit d'avant> -- nginx/nginx.conf      # l'amont frontend_client revient
$COMPOSE --profile ancien-front up -d frontend-client  # l'image précédente existe encore
$COMPOSE restart nginx
$COMPOSE stop vitrine vitrine-comptes
```
Ensuite, faire le `git revert` ci-dessus, pour que le prochain déploiement ne remette pas la vitrine.

Après le premier déploiement de la vitrine, le retour arrière automatique de `deploy.sh` vaut aussi pour `vitrine` et
`vitrine-comptes` : leurs images `previous` existent.

## Mettre à jour la vitrine

L'équipe produit livre un nouveau commit. Pour l'importer :
```sh
sh vitrine/outils/importer.sh /chemin/vers/PG-BelivaY <commit>
```
Le script remplace `vitrine/site`, `vitrine/espace-*` et les fichiers de données. Il note ensuite le commit dans
`vitrine/SOURCE.txt`.

Ensuite :
- relire le diff ;
- vérifier en local :
  ```sh
  cd vitrine
  for d in site espace-*; do (cd $d && npm ci); done
  VITE_DEMO=1 VITE_SOURCE=hybride SITE_URL=https://belivay.com SANS_INSTALLATION=1 sh site/outils/construire-tout.sh
  node serveur/compresser.mjs site/dist
  node serveur/verifier.mjs
  ```
- faire une PR.

## Vérifié avant la PR

Docker n'est pas installé sur le poste de préparation. Nous avons fait les vérifications Node équivalentes :

- **Construction des six espaces** : `npm ci` dans chacune des six applications, puis `construire-tout.sh` avec les
  variables de l'image. Résultat : 4 min 24 s, 82 Mo, `robots.txt` et `sitemap.xml` sur belivay.com.
- **Tests du serveur des comptes** : 31 sur 31.
- **`serveur/verifier.mjs`** : 60 vérifications sur 60 en mode `tout`, et 57 sur 57 avec les deux modes séparés.
  Elles portent sur :
  - les pages des six espaces, les redirections et les réécritures profondes ;
  - les en-têtes de sécurité, le `noindex` de `/admin/`, le cache, les service workers ;
  - la compression, les réponses 304, les plages d'octets, les chemins interdits ;
  - les comptes : inscription, cookie `__Host-` en HTTPS, refus depuis une autre origine, `X-Forwarded-Host` ignoré,
    corps de plus de 1 Mo refusé.
- **Même disposition de fichiers que l'image**, recopiée à la main : seules les dépendances de production
  (`npm ci --omit=dev`), sans les tests ni PGlite. Les deux modes répondent ; le pilote Neon se charge.
- **`nginx/nginx.conf`** : la syntaxe est vérifiée avec crossplane, l'analyseur de NGINX. L'expression du `map` est
  testée sur 12 cas : comptes, santé, catalogue, paramètres piégés.
- **`deploy.sh`** : `bash -n` passe. Les fichiers YAML de CI et de CD se lisent sans erreur.
- **Aucun fichier de `backend/`, de `frontend/` ni de `docker-compose.yml`** n'est modifié : les jobs de CI existants
  ont les mêmes entrées.
- **Construction et lancement des images Docker** : c'est le job **Vitrine** de la CI qui les fait, à l'ouverture de
  la PR.

## Points d'attention

- **Les cinq sous-domaines restent sur l'ancien front** (seller, courier, admin, relay-point, delivery-org), avec leur
  `/api/` et `/django-admin/`. Ainsi, rien ne casse pour l'équipe qui s'en sert. Si vous le souhaitez, une redirection
  (302) de chacun vers `https://belivay.com/<espace>/` se fait en une ligne par sous-domaine. Dans ce cas, garder
  `/api/`, `/django-admin/`, `/static/` et `/media/`.
- **HSTS** : la vitrine envoie `max-age=63072000; includeSubDomains`, comme Vercel. Tout sous-domaine de belivay.com
  devra être servi en HTTPS. C'est déjà le cas des six actuels.
- **Les sitemaps Django** (`/sitemap-products.xml`, `/sitemap-categories.xml`) restent servis tels quels. Le
  `robots.txt` de la vitrine ne les annonce pas : il annonce `/sitemap.xml`, les pages publiques de la vitrine.
- **Le dossier `espace-client-belivay/`** (ancienne copie du site, jamais déployée) n'est pas touché. Il pourra être
  retiré plus tard.
- **Mémoire** : la construction de la vitrine se fait dans une seule image, application après application, comme le
  veut `deploy.sh`.

## Ce qui reste pour « main 2 » (le vrai serveur, plus tard)

Le vrai back-end ira sur un second serveur. Les applications de la vitrine savent déjà parler à une API :
`VITE_SOURCE=api` et `VITE_API_URL`.

Le passage se fera ainsi :
1. **Brancher l'API réelle**, espace par espace : catalogue, commandes, paiements, portefeuille, livraisons, relais,
   messages. Il faut construire avec `VITE_SOURCE=api` et `VITE_API_URL=https://<serveur main 2>/api`, puis ajouter ce
   domaine à `connect-src` dans `site/vercel.json` (CSP).
2. **Faire migrer les comptes réels** de Neon vers le serveur « main 2 », ou garder Neon, au choix. Les règles de
   sécurité sont décrites dans `vitrine/site/COMPTES-REELS.md` : scrypt, sessions, second facteur de la console,
   limites.
3. **Retirer les données de démonstration**, puis `VITE_DEMO`. Le bandeau « démonstration » disparaît alors.
4. **Retirer de la prod l'ancien front**, la règle `map` des comptes et `frontend-client`, une fois que plus rien ne
   s'en sert.

Guides de l'équipe produit, dans le dépôt PG-BelivaY : `MISE-EN-LIGNE.md`, `PASSAGE-AU-REEL.md`.
Dans cette branche : `vitrine/site/COMPTES-REELS.md`.
