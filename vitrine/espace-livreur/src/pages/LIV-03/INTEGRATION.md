# LIV-03 Accès — à faire en vague d'intégration (fichiers communs ou d'autres groupes)

1. **Paramètres au registre** (`logique-metier/parametres-en-vigueur.json`, `src/calculs/registre.ts`) : en attendant,
   la démonstration les lit dans `src/genere/parametres-manquants.json` par `regle()` / `nombre()` de
   `src/demo/session.ts` (même lecture stricte que le registre). Codes utilisés : PIN-LONGUEUR, OTP-LONGUEUR, PIN-ESSAIS,
   PIN-BLOCAGE-MIN, sms_essais_code, SESSION-H, INACTIVITE-PREUVE-MIN, KYC-AUTO-MIN, KYC-REVUE-H, PHOTO-MAX-KO,
   PIECE-ALERTE-J, CERT-QUIZ-N, quiz_questions_duree, CERT-SEUIL, CERT-DELAI-ESSAI-H, CERT-ESSAIS-JOUR,
   CERT-VALIDITE-MOIS, CERT-ALERTE-J, CERTIF-MODULES-DUREE, LIV-RECOURS-J, motif_min_caracteres, score_gele_suspension,
   periode_probatoire_retour, historique_consultable_jours. (OTP-RENVOI est déjà au registre.) Délai de réponse à un
   recours (48 h, DP-62 / QUESTIONS L-04) : pas de code, écrit dans la démonstration ; à créer (ex. LIV-RECOURS-REPONSE-H).
2. **États du compte** (`src/donnees/communs.ts`, `EtatCompte`) : la coque n'en connaît que six ; le domaine `acces`
   en porte sept (LIV-03-R37 : restreint, rattachement suspendu, retiré) et les ramène par `VERS_COQUE`. Ajouter
   `restreint`, `rattachement_suspendu`, `retire` à `EtatCompte` et à `ETATS_COMPTE` de la coque (pastille ambre pour
   restreint), puis supprimer `VERS_COQUE`.
3. **Ouverture du compte non actif** (App.tsx) : LIV-01-R013 veut l'écran `compte` à toute ouverture pour un compte non
   actif ou restreint ; la connexion y mène déjà (suite « compte »), mais une adresse ouverte directement ne le fait
   pas. Proposition : dans App, `etatCompte ∉ {actif}` → toute route hors {connexion, compte, tournee, historique,
   certification, moi, aide, messages} redirige vers `compte`.
4. **En-tête des pages secondaires** (`src/composants/coque.tsx`, `EnTeteEnfant`) : consigne du porteur — « ‹ » retour
   à gauche, nom de la page, et à DROITE le logo panier BelivaY (petite icône, classe « ibtn cart », lien vers
   l'accueil), comme la fonction `subHeader` du prototype et l'espace vendeur. Aujourd'hui le bouton d'incident y est
   seul à droite : garder l'incident (LIV-UIX-03) et ajouter le panier.
5. **Menu du profil** : « Se déconnecter » (MenuProfil) verrouille la session (PIN redemandé), il ne délie pas le
   téléphone ; LIV-03-R16 demandait de retirer « Se déconnecter » du tiroir : à remplacer par « Verrouiller ».
6. **Pièces** : le domaine `acces` (LIV-03) porte les 8 pièces KYC et leurs dates (CNI 11/03/2030, permis 02/08/2029,
   assurance 14/03/2027, LIV-04-R13) ; `moi` (LIV-10) a ses propres pièces avec d'autres dates (assurance au
   05/10/2026 : alerte J−30 contraire à LIV-04-R13). `moi.profil().pieces` devrait lire `acces.activation().pieces`.
7. **Tournée verrouillée** (LIV-05) : tant que le compte est en activation, l'onglet Tournée affiche un cadenas,
   « Vous ne pouvez pas encore recevoir de missions » et ce qui manque, chaque ligne vers l'activation (LIV-P02R-03).
8. **Inactivité sur une preuve** (LIV-06, LIV-07) : après `regles.inactivitePreuveMin` minutes sans geste pendant une
   étape de preuve, rouvrir `connexion?next=<étape>` (LIV-P01R-01) ; la règle est servie par `ecranConnexion().regles`.
9. **Situations de démonstration** : `src/demo/scenario.ts` (nouveau fichier de démonstration) — `?demo=premiere`,
   `activation`, `restreint`, `suspendu`, `retire`, `rattachement_ferme`, `rattachement_suspendu`, `aucun_paquet`.
   Les domaines des autres groupes (tournée, messages…) ne les lisent pas encore.

## Reprise sur le prototype (branche l/p-liv-1) — besoins communs
10. **Barre d'action du bas** : `bottom-cta` du prototype absent de prototype.css ; le groupe a la sienne (`BasFixe`,
    `.l3-cta` dans liv03.css, au-dessus de la barre du bas quand elle est là). À rendre commune (proto.tsx + style).
11. **proto.tsx** : `Ton` sans `solid-acc` (pastille de lieu des cartes de module) ; `Li` avec `onClick` met
    `border: 0` en ligne et perd la séparation du prototype (corrigé ici par `.l3-li`) ; pas de `C.radio`, `C.stop`,
    `C.tg`, `C.otp`, `C.keypad`, `C.fld` en composant (écrits en balisage dans les écrans).
12. **`.hero.acc` et `--acc-grad`** : le dégradé clair (#34D399) ne tient pas le contraste AA avec le texte blanc ;
    corrigé ici par `.l3-acc` (vert foncé) ; à régler dans ecarts-prototype.css pour tous les groupes.
13. **En-tête racine** : les pastilles (« Aucun colis sur vous », « Trust — ») débordent à droite à 390 px (le
    prototype dit « Aucun colis »).
14. **États propres à un état de l'écran** : la route fixe l'en-tête et la barre ; « compte activé » du prototype est
    sans barre (dockless) avec le bouton « Passer disponible » — ici la barre reste (l'activation garde la barre).
