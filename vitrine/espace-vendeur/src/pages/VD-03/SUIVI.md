# VD-03 · Accès et ouverture de la boutique — suivi

Sous-tâches (TACHES-VENDEUR.md, C) : 1 balisage et t() · 2 source démo · 3 règles et états · 4 saisies et issues ·
5 enrichissement · 6 Préparation et anonymat · 7 liens · 8 animations et sons · 9 photos · 10 thèmes, langues,
360–430 px · 11 test de gestes et boutons · 12 vérification.

| Écran | Route(s) | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Connexion (+ e-mail, numéro, code, 2FA, oubli, nouveau mot de passe, plus mon numéro) | `connexion?s=…` | x | x | x | x | x | x | x | x | x | x | x | x |
| Ouvrir ma boutique · étape 1 | `ouvrir` | x | x | x | x | x | x | x | x | x | x | x | x |
| Code de l'ouverture | `otp` | x | x | x | x | x | x | x | x | x | x | x | x |
| Publier et être payé · étapes 2 et 3 | `kyc` | x | x | x | x | x | x | x | x | x | x | x | x |
| Saisie assistée | `saisie_assistee` | x | x | x | x | x | x | x | x | x | x | x | x |
| Installer l'application | `installer` | x | x | x | x | x | x | x | x | x | x | x | x |
| Lancement | `lancement` | x | x | x | x | x | x | x | x | x | x | x | x |
| Face ID ou empreinte | `faceid` | x | x | x | x | x | x | x | x | x | x | x | x |
| Arrivée depuis l'espace client | `bienvenue_client` | x | x | x | x | x | x | x | x | x | x | x | x |

Aucun écran retiré : `otp` reste l'écran de code de l'ouverture (étape 1), `lancement` devient l'adresse d'ouverture
de l'application installée (animation, puis accueil ou connexion).

## Domaine `session` (types et démonstration)

Connexion (identifiant/e-mail et mot de passe, Google, Apple, numéro et code), second facteur d'un appareil inconnu,
mot de passe oublié (lien 15 min, code SMS, nouveau mot de passe), blocage après 5 essais, « Se souvenir de moi »
(session gardée ou fermée avec le navigateur), codes (6 chiffres, 10 min, 5 essais puis 15 min, renvoi après 60 s,
3 envois par heure : `OTP-*` lus dans le registre), dossier d'ouverture (étapes, zone déduite du point, deux
comptes au plus par numéro, pièces, numéro de versement, vérification, refus et refus définitif, contrat), arrivée
depuis le compte client (lu sur l'appareil), Face ID, saisie assistée (contrôle du prix anormal recalculé).

## Ajouts (enrichissement, même famille que le client)

1. Choix de la langue avant la connexion, en feuille (français, anglais ; DP-56 Q-44, plus de pidgin).
2. « Se souvenir de moi » réel : session gardée 30 jours ou fermée avec le navigateur (téléphone partagé).
3. Identifiant gardé sur l'appareil ; œil du mot de passe ; alerte « Majuscules activées ».
4. Essais restants et blocage daté (« Réessayez à 10 h 03 ») ; propriétaire prévenu.
5. Connexion par numéro : opérateur reconnu (MTN, Orange), canal WhatsApp ou SMS, « Recevoir par SMS » depuis le
   code ; le numéro d'Aïcha ouvre l'accès Préparation.
6. Code à 6 chiffres : clavier du prototype + vrai champ (collage, remplissage automatique, clavier de l'ordinateur),
   validation automatique au collage, essais restants, compte à rebours de renvoi, envois restants dans l'heure,
   secousse et vibration au code faux, son au bon code.
7. Second facteur : vrai appareil (navigateur détecté) et heure de la demande ; « ce téléphone devient reconnu ».
8. Mot de passe oublié complet : lien qui vaut 15 min (compte à rebours), renvoi après 60 s, réponse identique que le
   compte existe ou non, nouveau mot de passe avec règles vérifiées en direct, confirmation par code SMS, retour à
   la connexion avec l'identifiant rempli.
9. Support joignable sans être connecté (WhatsApp et e-mail officiels BelivaY, +237 689 002 812).
10. Lien « Installer l'app » et « Déjà client ? » sur l'accueil de la connexion ; « Vous êtes connecté » si déjà
    connecté.
11. Ouvrir : brouillon gardé sur l'appareil, compteur 40 caractères, catégories du barème (la part gardée en
    dépend), opérateur reconnu, carte où un toucher pose le point, « Me localiser » (GPS), zone affichée, lien
    OpenStreetMap, « Reprendre où j'en étais » si une ouverture est en cours, note si une boutique existe déjà.
12. KYC : chaque élément touchable (reprise d'un seul élément), photo prise par le téléphone et réduite avant
    l'envoi, numéro de versement changeable (feuille, code SMS, MTN ou Orange seulement), liste de ce qui manque,
    refus avec motif écrit et compteur de refus, refus définitif (contestation une fois, support), récapitulatif
    d'une boutique vérifiée, référence du dossier.
13. Contrat : lignes calculées depuis les paramètres en vigueur (76,5 à 98 % dérivés du barème, 700 F, 500 000 F,
    10 commandes), exemple et gain de la découverte calculés par `src/calculs` (17 840 F ; + 540 F), RCCM et NIU
    vérifiés (forme), version du contrat.
14. Saisie assistée : recherche, fiche modifiable en feuille (prix, stock) avec contrôle du prix en direct, raison
    écrite de chaque contrôle en échec, fiches validées et leur suite, état vide, liens « Ajouter un produit
    moi-même » et « Demander une nouvelle visite ».
15. Installer : onglet du téléphone choisi d'office, bouton natif seulement avec l'invite du navigateur, « déjà
    installée », adresse réelle, partager ou copier l'adresse.
16. Face ID : déjà activé (Continuer, Désactiver), lien Sécurité, proposé après la connexion seulement si le
    téléphone en a.
17. Arrivée client : compte client lu sur l'appareil (même session), état « aucune demande », reprise si déjà
    confirmée, corriger dans l'app client, ouvrir une autre boutique.
18. Hors connexion sur chaque formulaire (ce qui attend le réseau est dit, bouton inactif) ; chargement et erreur
    avec « Réessayer ».

## Défauts du prototype corrigés

- Bouton de langue « Français · English · Pidgin » : pidgin retiré (DP-13, Q-44).
- Face ID « confirme votre argent et le numéro de versement » : faux depuis DP-57 S-1 ; texte corrigé (il n'ouvre que
  l'application, les codes SMS restent).
- « Changez de numéro … puis par Face ID » (plus mon numéro) : remplacé par les deux codes SMS (DP-56 Q-19).
- Offre de découverte « 3 points de plus » : en francs (DP-55 Q-03).
- Liens « Contacter le support » vers l'aide qui exige une session : WhatsApp et e-mail quand on n'est pas connecté.
- Cases du code remplies d'avance et compte à rebours figé : cases vides, minuteur réel.
- Repère dessiné de la carte (point déjà posé) : remplacé par le vrai point posé.
- Prix du chargeur 18 W à « 38 % sous le marché » signalé anormal alors que la règle (DP-56 Q-40) dit « sous 50 % de
  la médiane » : donnée de démonstration ajustée (1 800 F pour 4 000 F), le message est calculé.

## Questions et décisions prises

- VD03-R01 demandait de supprimer « Se souvenir de moi » ; le prototype du 1er octobre le garde et DP-53 interdit de
  retirer un élément : gardé, avec un vrai sens (session longue par défaut, cochée ; décochée, la session se ferme
  avec le navigateur), compatible avec DP-57 S-3.
- La zone de la boutique est calculée par la démonstration au quartier servi le plus proche (3 km) ; le serveur la
  calculera (VD03-R06).
- Deux comptes au plus par numéro : la démonstration connaît 677 12 42 17 (1 compte) et 690 11 22 33 (2 comptes).

## Tests

- `tests/VD-03.gestes.spec.ts` : 17 gestes (connexion e-mail, blocage, second facteur, numéro et accès Préparation,
  numéro inconnu, mot de passe oublié, langue, page demandée après Google ; ouverture : champs, deux comptes, parcours
  complet jusqu'à Premier jour, numéro de versement ; arrivée client ; saisie assistée ; Préparation ; installer ;
  lancement).
- `tests/boutons.spec.ts` (BOUTONS_ROUTES = les 9 routes, BOUTONS_ETATS=1 : 24 adresses) : aucun élément sans effet.
- `tests/squelette.spec.ts` filtré sur les 9 routes : 360, 390 et 430 px, clair et sombre, français et anglais,
  dictionnaires sans doublon, anonymat, routes.
- `tests/VD-04.gestes.spec.ts` : vert sans le pont de connexion.

## Vague 4 · retrait de l'inutile

- Encadrés « Démonstration » (`Demo` de `commun.tsx` : identifiants et numéros à remplir, réponse du prestataire de
  vérification, photo d'exemple du KYC, code ou lien reçu) : gardés pour essayer la démonstration, mais **plus
  jamais affichés avec le serveur** (`VITE_SOURCE=api`) : ils n'y ont aucune utilité et montreraient un faux code.
