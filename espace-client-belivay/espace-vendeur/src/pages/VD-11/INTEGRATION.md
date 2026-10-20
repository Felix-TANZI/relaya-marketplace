# VD-11 — changements demandés hors du groupe (vague d'intégration)

Fichiers communs que l'agent VD-11 n'a pas touchés (METHODE.md §2). Chaque point dit le fichier, le changement exact
et pourquoi.

## 1. `src/demo/session.ts` — état « en pause » de la boutique (Q-39)

`etatBoutique()` (src/demo/boutique.ts) renvoie maintenant `{ fermeeAujourdhui, enPause, fermeA, horaires }`.
Dans `lireSession()`, remplacer :

```ts
etat: b.fermeeAujourdhui ? 'fermee_aujourdhui' : 'ouverte',
```

par :

```ts
etat: b.enPause ? 'en_pause' : b.fermeeAujourdhui ? 'fermee_aujourdhui' : 'ouverte',
```

Aujourd'hui une pause s'affiche « Fermée aujourd'hui » (fermeeAujourdhui vaut vrai pendant la pause) : rien de faux,
mais la pastille « En pause » du Menu (VD-11) ne s'allume qu'avec ce changement.

## 2. `src/composants/coque.tsx` — pastille d'en-tête « En pause » (Q-39)

Dans `usePastilles()`, avant le cas « Fermée aujourd'hui » :

```ts
if (b.etat === 'en_pause') ouverture = { ton: 'ink', point: true, texte: t('En pause') }
```

(La clé « En pause » est déjà traduite dans `src/i18n/VD-11.en.json`.)

## 3. `src/demo/session.ts` — membre retiré de l'équipe (EQU-04, VD11-R22)

`demoEquipe.retirer()` retire le membre de l'état du domaine « equipe » ; la session de démonstration lit encore
`MEMBRES` (jeu d'essai) pour `?role=prep`. À la vague 3 (API), le serveur révoque la session ; en démonstration,
`roleCourant()` peut vérifier que le membre « préparation » est encore dans `etat equipe` (export à ajouter :
`membresActifs()` dans src/demo/equipe.ts) et sinon ouvrir la connexion.

## 4. `src/api/source-api.ts` — routes attendues des domaines VD-11 (Q-92)

```ts
boutique: 'GET · PUT /shop · PUT /shop/hours · POST /shop/closed-today · POST /shop/pause · POST · PATCH · DELETE /shop/closures · PUT /shop/location · GET /reviews · POST /reviews/{id}/private-reply',
compte: 'GET · PUT /me · POST /me/email · POST /me/phone · PUT /me/password · GET · DELETE /devices · GET /account/status · POST /me/export · POST · DELETE /account/closure · POST /auth/otp',
equipe: 'GET · POST · DELETE /shop/members · POST /shop/members/{id}/resend',
messages: 'GET /threads · POST /threads/{id}/messages · POST /threads/{id}/read · POST /threads/support · GET /quick-replies',
notifications: 'GET /notifications · POST /notifications/{id}/read · POST /notifications/read-all · GET · PUT /notifications/settings',
aide: 'GET /help · GET /help/forbidden-products · GET /help/contacts · GET /help/tip',
```

## 5. Version du Menu (Q-79 : « numéro de version lu dans la construction »)

Le Menu lit `import.meta.env.VITE_VERSION_VENDEUR` (repli « 2.0 »). Dans `vite.config.ts`, ajouter :

```ts
define: { 'import.meta.env.VITE_VERSION_VENDEUR': JSON.stringify(process.env.npm_package_version === '0.0.0' ? '2.0' : process.env.npm_package_version) },
```

ou poser `VITE_VERSION_VENDEUR` dans l'environnement de construction ; et passer `version` de package.json à 2.0.0.

## 6. `tests/identique.spec.ts` — écrans repris VD-11 (DP-54)

Les écrans repris du groupe sortent de la comparaison au pixel de l'écran entier (DP-54 : « un écran repris en
sort ») ; l'EN-TÊTE reste comparé (vert pour les onze routes du groupe, en clair, sombre et anglais).
À déclarer en vague d'intégration : exclure de `ENTIERS` les états des routes VD-11 reprises.

## 7. `npm run inventaire` — pages.json

Statut « repris » posé dans `src/pages/VD-11/routes.ts` ; pages.json à régénérer en vague d'intégration.

## 8. `src/preferences.tsx` — économie de données activée par défaut (VD11-R30, VD11-R31)

« Économie de données … activée par défaut » : remplacer le défaut `'non'` de `blv_v_eco` par `'oui'`
(`lit('blv_v_eco', ['oui', 'non'] as const, 'oui')`). Effet VD-11 : la carte d'Emplacement s'affiche à la demande.

## 9. `src/composants/coque.tsx` — titre d'en-tête déjà traduit

`Ecran` passe `p.titre` à `t()` pour `document.title` ; un écran qui donne un titre déjà mis en forme
(« Client de BLV-00008 » → « Customer of BLV-00008 ») déclenche un avertissement « traduction manquante » en
anglais (sans effet visible). Proposition : `document.title = … + (p.titre ?? t(PAGE_DE[p.route]?.titre ?? ''))`.

## 10. Liens entrants à brancher par les autres groupes (aucun fichier touché)

- VD-06 (remise bloquée, « Écrire au support ») : `source.messages.ecrireAuSupport(texte, ref)` puis
  `chemin('messages', { fil })` — VD06-R07, Q-49.
- VD-10 (sanction notifiée) : le domaine notifications porte `contester` (« contester?d=… ») ; l'écran l'affiche.
- VD-04 (Accueil) : « Fermer aujourd'hui » dure maintenant jusqu'à la prochaine ouverture réelle (Q-39) ; la carte
  rouge de l'accueil peut lire `source.boutique.boutique().fermeeJusqua` au lieu de « demain 08 h » écrit.

## Vague d'intégration (6 oct.) — état de chaque point

- [x] 1. Session : `en_pause` (et `suspendue`).
- [x] 2. Pastille « En pause » dans `usePastilles`.
- [x] 3. Membre retiré : `membresActifs()` ; sa session se ferme (connexion).
- [x] 4. INTEGRATION-API.md §1.
- [x] 5. `VITE_VERSION_VENDEUR` lu dans package.json (2.0.0, affiché « 2.0 »).
- [x] 6. Écrans de VD-11 : en-tête seul.
- [x] 7. pages.json à jour.
- [x] 8. Économie de données activée par défaut.
- [x] 9. `document.title` ne retraduit plus un titre déjà traduit.
- [x] 10. VD-06 → `messages?fil=support&ref=` ; VD-10 → `contester` dans les notifications ; VD-04 → `fermeeJusqua` sur la carte « Boutique fermée ».
