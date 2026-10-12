# VD-04 — Accueil et ses états : suivi des 12 sous-tâches

Sous-tâches (METHODE.md §3) : 1 balisage et t() · 2 source démo · 3 règles du registre et états · 4 vraies saisies et
issues · 5 enrichissement · 6 rôle Préparation et anonymat · 7 liens · 8 animations et sons · 9 photos · 10 clair /
sombre, FR / EN, 360–430 px, défauts corrigés · 11 test de gestes et boutons · 12 vérification.

| Écran | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Accueil (`accueil`, référence, enrichi) | x | x | x | x | x | x | x | x | x | x | x | x |
| Rien à faire (`accueil_calme`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Premier jour (`premier_jour`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Hors connexion (`horsligne`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Compte suspendu (`suspendu`) | x | x | x | x | x | x | x | x | x | x | x | x |

Statut « repris » dans `routes.ts`.

## Règles appliquées
GEN-07, ACC-10 à ACC-16, ACC-20, ACC-21, VD04-R06, R07, R10 à R15, OFF-01 à OFF-05, VD02-H02, H04, VD02-M05, KYC-05,
VD03-R09, SAI-03, SUS-01 à SUS-03, REFVD-R28 à R31, R44, R121 à R123, R341, REFPROD-R32 ; DP-55 (découverte en francs),
DP-56 (Q-40 saisie assistée, Q-49 fil support), DP-57 (I-3 fin du premier jour, L-1 probatoire 20 commandes),
Q-81, Q-86 (squelettes, erreurs), Q-93 (file hors connexion), Q-96 (demande de la zone).
- L'accueil laisse la place : à la suspension (GET /account/status), au premier jour tant qu'il n'est pas fini, et au
  corps « Rien à faire » quand sa file est vide (chiffres seulement alors : ACC-10).
- Tous les montants viennent de src/calculs dans la démonstration (gardé figé, libération, vendredi du versement,
  palier suivant, découverte) ; aucun pour l'accès Préparation.

## Ajouts (enrichissement)
1. Accueil : pastilles de compteurs qui filtrent la liste (toucher : ce type ; encore : tout).
2. Accueil : « En attente du livreur » — colis prêts, code de remise à portée de main, incident affiché (bloquée,
   livreur absent).
3. Accueil : tirer pour actualiser (comme Mes commandes du client).
4. Hors connexion partout sur mes écrans : bandeau avec l'heure des données ; « C'est prêt », « Fermer aujourd'hui »,
   « Masquer » mis en file avec heure et lieu d'origine ; rejoués tout seuls au retour du réseau ; pied réel qui mène à
   l'écran Hors connexion quand une action attend.
5. Hors connexion : toutes les commandes à préparer (pas une seule), les colis à remettre avec leur code, résumé par
   type, retirer une action, temps avant expiration, actions expirées (« refaites-la ») ou refusées (motif), bilan du
   dernier envoi, « Réessayer » qui dit quand le réseau manque toujours.
6. Rien à faire : libération du jour, composition du versement (déjà prêts + libérés ce soir), lien vers toutes les
   recherches de la zone, liens Gains et Versements.
7. Premier jour : « n sur 3 faits », détail de chaque geste fait, barre vers le palier suivant, fin du palier de
   lancement, offre de découverte avec commandes et date restantes, fin du premier jour annoncée (lien vers l'accueil).
8. Suspendu : contestation déjà envoyée (date, délai de réponse), écrire au support (fil « Support BelivaY »), nombre
   réel de commandes à préparer.
9. États de chargement (squelette qui scintille, sans chiffre) et d'erreur (réessayer ; réservé au propriétaire).
10. Animations : coche des gestes faits, barre qui se remplit, pastilles filtrantes ; sons au geste en file.

## Écrans retirés
Aucun : les quatre états servent (le vendeur y arrive par l'accueil quand les données le demandent ; leurs adresses
montrent l'état). `suspendu` montre un exemple en démonstration (la boutique n'est pas suspendue), comme le prototype.

## Tests
`tests/VD-04.gestes.spec.ts` (15 tests, dont les 7 de référence, verts) ; squelette filtré vert ; boutons
(`BOUTONS_ROUTES=accueil,accueil_calme,premier_jour,horsligne,suspendu`) vert ; en-tête identique : accueil, horsligne,
suspendu verts ; accueil_calme et premier_jour diffèrent par les données (voir INTEGRATION.md).

## Questions
- Q-81 dit de remplacer « Vérifier le numéro de versement » par « Régler vos horaires », déjà le geste 2 du prototype :
  le geste 3 est gardé, toujours coché (vérifié à l'ouverture), comme le veut ACC-16. À confirmer.
- « Commandes » du mois (tuile) : le prototype écrit 9 ; la donnée comptée est le nombre de commandes reçues depuis le
  1er du mois (8 dans le jeu d'essai). Base à écrire sous le chiffre si le porteur le souhaite (Q-83).
