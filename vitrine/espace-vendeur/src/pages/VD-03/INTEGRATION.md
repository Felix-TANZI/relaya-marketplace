# VD-03 · Changements demandés hors du groupe (vague d'intégration)

Le groupe VD-03 n'a touché que ses fichiers (METHODE.md §2) : `src/pages/VD-03/**`, `src/donnees/domaines/session.ts`,
`src/demo/session.ts`, `src/i18n/VD-03.en.json`, `tests/VD-03.gestes.spec.ts`. Voici les changements à faire ailleurs.

## 1. `src/App.tsx` — retirer le pont provisoire de connexion

La connexion est reprise (`statut: 'repris'` dans `src/pages/VD-03/routes.ts`) : le pont ne s'applique déjà plus
(condition `route === 'connexion' && statut === 'provisoire'`). Il reste du code mort à retirer :

- supprimer la fonction `PontConnexion` et son commentaire (« Pont provisoire (à retirer quand VD-03 reprend la
  connexion) … ») ;
- dans le rendu de `<Route>`, remplacer

  ```tsx
  route === 'connexion' && statut === 'provisoire' ? (
    <PontConnexion>
      <Composant />
    </PontConnexion>
  ) : connecte || SANS_SESSION.has(route) ? (
  ```

  par

  ```tsx
  connecte || SANS_SESSION.has(route) ? (
  ```

  et retirer `statut` de la déstructuration `({ route, Composant })` ;
- imports devenus inutiles : `type MouseEvent`, `type ReactNode`, `useNavigate`, `source`.

`tests/VD-04.gestes.spec.ts` (groupe VD-04) : le commentaire « Connexion provisoire (pont de la démonstration,
App.tsx) » devient « Connexion (VD-03) : « Continuer avec Google » rouvre la session (appareil reconnu) ». Le test
passe tel quel (vérifié : 7/7).

## 2. `src/main.tsx` — garder l'invite d'installation dès le démarrage (INS-03)

L'événement `beforeinstallprompt` part souvent avant l'ouverture de l'écran Installer (chargé à la demande). À poser
avant le rendu :

```ts
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  ;(window as Window & { __blvInvite?: Event | null }).__blvInvite = e
})
```

L'écran Installer lit `window.__blvInvite` et écoute aussi l'événement tant qu'il est ouvert.

## 3. Application installable (VD03-R16) — `public/`, `index.html`

- `public/manifest.webmanifest` : `name` « BelivaY Vendeur », `short_name` « BelivaY Vendeur », `start_url`
  `/vendeur/lancement`, `scope` `/vendeur/`, `display` `standalone`, `background_color` et `theme_color` `#F7F3EE`,
  icônes 192 et 512 px tirées du chariot du logo (`src/assets/prototype/0718fddbf299.png`).
- `index.html` : `<link rel="manifest" href="/vendeur/manifest.webmanifest" />`.
- Service worker (hors connexion, VD-D02.A10, VD-D05.A17) : à écrire en vague 4 ; sans lui, Chrome ne propose pas
  l'invite d'installation.

## 4. Domaine `notifications` (VD-11) — blocage de connexion (CNX-03)

Au 5e mot de passe faux, « un message est envoyé au propriétaire ». La démonstration de `session` ne peut pas écrire
dans celle de `notifications`. Demande : exporter de `src/demo/notifications.ts` une fonction
`ajouterNotification(n: Omit<Notification, 'id' | 'lu'>)` ; `src/demo/session.ts` l'appellera dans `connecter()`
au blocage (type « sécurité », titre « Connexion bloquée 15 min », texte « 5 mots de passe faux depuis {appareil} »,
urgent, sans montant).

## 5. Sécurité (VD-11) — brancher sur le domaine `session`

- « Ne plus reconnaître cet appareil » : `source.session.oublierAppareil()` (la connexion suivante demande le code
  SMS, CNX-01).
- Interrupteur Face ID / empreinte : `source.session.biometrie()` et `source.session.reglerBiometrie(active)` (même
  état que l'écran `faceid` ; DP-57 S-1 : il n'ouvre que l'application, jamais à la place d'un code SMS).
- « Changer mon mot de passe » : `chemin('connexion', { s: 'oubli' })` (VD11-R33).

## 6. Produits (VD-08) — fiches de la saisie assistée et brouillons

- Les fiches validées dans la saisie assistée (`source.session.saisieAssistee().validees`) doivent apparaître dans
  Mes produits (« en vérification » quand `enVerification`, sinon en brouillon jusqu'à l'accord des pièces).
- Le nombre de brouillons du dossier d'ouverture (`DossierOuverture.brouillons`) suit aujourd'hui les fiches
  validées ; il devra suivre aussi les offres créées par Nouvelle offre (`offre1` … `offre4`) pendant l'ouverture.
  Demande : exporter de `src/demo/produits.ts` `brouillonsDeLOuverture(): number`, lu par `src/demo/session.ts`.

## 7. Accueil · Premier jour (VD-04)

« Signer le contrat » mène à `premier_jour` (VD03-R11). L'écran pourra lire `source.session.ouverture()` (nom de la
boutique, produits en ligne, numéro de versement) pour la boutique qui vient d'ouvrir.

## 8. Espace client (`site/`, plus tard : rien n'y a été touché)

- `site/src/pages/CL-13/DevenirVendeur.tsx` : « Ouvrir mon espace vendeur » doit mener à `/vendeur/bienvenue_client`
  (aujourd'hui `devenir-vendeur?st=ouvrir`). Même domaine, même session : la démonstration du vendeur lit le compte
  client gardé sur l'appareil (`localStorage` « blv_demo_etat » : profil et boutique).
- « Vérifier ma pièce maintenant » / « Renvoyer la photo de ma pièce » : `/vendeur/kyc`.

## 9. Inventaire et comparaison au pixel

- `npm run inventaire` : les 9 routes du groupe passent à « repris » dans `src/genere/pages.json`.
- `tests/identique.spec.ts` : les écrans repris de VD-03 sortent de la comparaison au pixel (DP-54) ; l'en-tête enfant
  « Devenir vendeur » et la carte SellerPromise de la connexion sont restés ceux du prototype.

## 10. Paramètres en vigueur (`logique-metier/parametres-en-vigueur.json`)

Valeurs de console tenues pour l'instant par la démonstration (`src/demo/session.ts`, `PARAMETRES_ACCES`, `KYC`,
`SAISIE`) : `PWD_RESET_LINK_TTL_MIN` (15 min), `KYC_AUTO_MAX_MIN` (15), `KYC_HUMAN_MAX_H_OUVREES` (48),
`RESILIATION_PREAVIS_J` (30), `SAI_FREE_FIRST_SHOPS` (10), `SAI_SESSION_PRICE_F` (5 000 F), seuils du prix anormal
(DP-56 Q-40 : 50 %, × 3), refus de pièces avant décision humaine (DP-57 S-2 : 3). À verser au registre pour qu'elles
soient lues comme `OTP-*` et `MDP-*` (déjà lus dans `REGISTRE`).

## Vague d'intégration (6 oct.) — état de chaque point

- [x] 1. `App.tsx` : pont provisoire retiré (et ses imports) ; commentaire du test VD-04 mis à jour.
- [x] 2. `main.tsx` : `beforeinstallprompt` gardé dans `window.__blvInvite` dès le démarrage.
- [x] 3. `public/manifest.webmanifest` (« BelivaY Vendeur », `/vendeur/lancement`, portée `/vendeur/`, #F7F3EE, icônes 192 / 512 / masquable du chariot), `index.html` (manifest, apple-touch-icon), service worker `public/sw.js` (coque gardée, push), enregistré en production.
- [x] 4. `ajouterNotification()` exporté par `src/demo/notifications.ts` ; la session l'appelle au blocage (type `securite`, « Connexion bloquée {n} min », urgent, sans montant).
- [x] 5. Sécurité : « Oublier » l'appareil (`oublierAppareil`), Face ID partagé avec l'écran faceid (`lireBiometrie`, `reglerBiometrie`), « Mot de passe actuel oublié ? » vers `connexion?s=oubli`.
- [x] 6. Fiches validées de la saisie assistée dans Mes produits (`ajouterFichesSaisie`) ; `brouillonsDeLOuverture(ref)` et `publierBrouillonsDeLOuverture(ref)` (produits) lus par la session ; les offres de Nouvelle offre créées pendant l'ouverture s'y rattachent.
- [ ] 7. Premier jour lisant `source.session.ouverture()` : non fait — le jeu d'essai n'a pas d'ouverture fraîche ; l'écran lit `GET /seller/onboarding` (accueil.premierJour), qui portera ces données en vague 3.
- [x] 8. Espace client : « Ouvrir mon espace vendeur », bannière « Ma boutique », « Espace vendeur » → `/vendeur/bienvenue_client` (ou `/vendeur/` pièce vérifiée) ; « Vérifier ma pièce » / « Renvoyer la photo » → `/vendeur/kyc`.
- [x] 9. `npm run inventaire` (69 repris) ; identique : en-tête seul pour les écrans repris.
- [x] 10. Valeurs versées au registre par DP-57 : `VD-MDP-LIEN`, `VD-KYC-DELAIS` (15 min, 48 h ouvrées, 3 refus), `VD-RESILIATION-PREAVIS`, `VD-SAISIE-ASSISTEE`, `VD-PRIX-ANORMAL` ; lues par `lireConsole`.
