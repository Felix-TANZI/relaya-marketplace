# Applications mobiles BelivaY (DEV-SRV-01, T12)

> « Les versions destinées à Google Play et à l'App Store pointent vers `api.belivay.com` ; aucune ne pointe vers `api-demo`. Terminé quand l'application installée affiche les boutiques réelles. »

## Les six applications

| Appli | Identifiant | Projet Android | Projet iOS |
|---|---|---|---|
| `client` | `com.belivay.client` | `frontend/android-client` | `frontend/ios` |
| `seller` | `com.belivay.seller` | `frontend/android-seller` | — |
| `courier` | `com.belivay.courier` | `frontend/android` | — |
| `admin` | `com.belivay.admin` | `frontend/android-admin` | — |
| `delivery-org` | `com.belivay.deliveryorg` | `frontend/android-delivery-org` | — |
| `relay-point` | `com.belivay.relaypoint` | `frontend/android-relay-point` | — |

## Le point essentiel : l'adresse du serveur est figée à la construction

Les écrans sont embarqués dans l'APK ou l'IPA. L'adresse du serveur y est inscrite au moment de la construction, à partir de `VITE_API_URL`. Une appli déjà installée ne peut donc pas changer de serveur : **il faut la reconstruire et la republier.**

| Appli destinée à | `VITE_API_URL` |
|---|---|
| Google Play et App Store (site réel) | `https://api.belivay.com` |
| Démonstration aux vendeurs, **jamais publiée** | `https://api-demo.belivay.com` |

L'adresse doit être complète, en `https` : une appli n'a pas de domaine propre, donc `/api` ne mènerait nulle part. Le serveur autorise déjà l'origine des applis (`https://localhost`, `capacitor://localhost`).

## Construire

### Android (sur un poste avec Node et Android Studio)

```sh
VITE_API_URL=https://api.belivay.com ops/applis/construire-appli.sh seller android
```

Le script :

1. construit les écrans de l'appli vers cette adresse ;
2. prépare le projet Android (`npx cap sync`) ;
3. remet la configuration par défaut.

Il refuse une adresse vide, relative ou en `http` simple, et prévient si l'adresse est celle de la démonstration.

Ensuite, dans Android Studio, ouvrir le projet de l'appli (tableau ci-dessus), puis **Build > Generate Signed Bundle / APK**. La clé de signature (`app/key.properties`) n'est pas dans le dépôt et ne doit jamais y entrer.

### iOS (appli client)

GitHub → **Actions** → **Build iOS (.ipa) - BelivaY Client** → **Run workflow**.

La construction lit l'adresse dans la variable de dépôt **`MOBILE_API_URL`** (Settings → Secrets and variables → Actions → Variables). Elle **refuse de démarrer** si cette variable est vide ou n'est pas une adresse `https://`.

Variables du dépôt à renseigner :

| Nom | Valeur |
|---|---|
| `MOBILE_API_URL` | `https://api.belivay.com` |
| `VITE_SITE_URL` | `https://shop.belivay.com`, puis `https://belivay.com` le 14/12 (liens partagés et QR) |
| `VITE_SUPPORT_WHATSAPP` | numéro WhatsApp du support, en chiffres, indicatif compris (facultatif : sinon celui des sites) |

## Vérifier avant de publier

1. L'adresse est bien dans les écrans construits : `grep -rl "api.belivay.com" frontend/dist-<appli>/assets`. Il doit y avoir au moins un fichier.
2. Rien ne vise la démonstration : `grep -rl "api-demo" frontend/dist-<appli>/assets`. Il ne doit y avoir aucun fichier.
3. Installer l'appli sur un téléphone, ouvrir le catalogue : **ce sont les boutiques réelles** qui s'affichent. C'est la capture de fin de T12.
4. Incrémenter le numéro de version avant chaque envoi au store (`versionCode` / `versionName` dans `android-*/app/build.gradle`).

## Distribution

Les APK et IPA ne vont **jamais** dans le dépôt : `frontend/apks/`, `*.apk`, `*.aab` et `*.ipa` sont ignorés par git. Les six APK qui y étaient jusqu'au 2026-11-09 (environ 450 Mo, construits le 20/10 vers l'ancienne adresse) ont été retirés du suivi. Ils restent cependant dans l'historique git.

## Non modifié, volontairement

Les identifiants OAuth Google (`GoogleAuthButton.tsx`, `build-ios.yml`, `Info.plist`) sont des identifiants **publics** du projet Google. Ce ne sont ni des adresses ni des secrets, et ils sont les mêmes pour la démonstration et le site réel. Ils sont liés au schéma d'URL inscrit dans `Info.plist` : les déplacer risquerait de casser la connexion Google sur iPhone.
