# VD-09 — Argent et versements : suivi des 12 sous-tâches

Branche `vendeur/VD-09`. Domaines possédés : `argent`, `versements`. Écrans repris (statut « repris » dans `routes.ts`) :
les sept. Aucun écran retiré : chacun sert au vendeur (argent, délai, gel, gains, comptabilité, versements, numéro).

Sous-tâches (METHODE.md §3) : 1 balisage du prototype et t() · 2 source démo, montants par src/calculs · 3 règles du
registre, états vide / chargement / erreur / hors ligne · 4 vraies saisies et issues · 5 enrichissement · 6 Préparation
et anonymat · 7 liens vers les autres interfaces · 8 animations et sons · 9 photos et illustrations · 10 clair / sombre,
FR / EN, texte grand, 360–430 px · 11 test de gestes et test boutons · 12 vérification.

| Écran | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Mon argent (`argent`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Se libère (`se_libere`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Gelé (`gele`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Mes gains (`gains`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Documents (`documents`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Versements (`versements`) | x | x | x | x | x | x | x | x | x | x | x | x |
| Numéro de versement (`numero_versement`) | x | x | x | x | x | x | x | x | x | x | x | x |

## Règles appliquées (registre-vendeur.json, enonce_final)

ARG-01 à ARG-07, VD09-R01 à R37, LIB-01 à LIB-03, GEL-01 à GEL-03, GAI-01 à GAI-03, DOC-01 à DOC-04, VER-01 à VER-05,
NUM-01 à NUM-07, VD02-A01 à A07, VD02-T04, GEN-04, REFVD-R59 à R100 (argent, versements, numéro), REFVD-R297, VD07-R04,
VD07-R16 (gel), OFF-01 / Q-93 (hors ligne), DP-52 (œil), DP-55 (« BelivaY ne perd jamais » : aucune commission à l'écran
hors Documents), DP-57 (états de l'argent, gel passé au montant dû, référence BLV-VS par `referenceDeVersement`, machine
VERSEMENT), Q-11, Q-13, Q-19, Q-58 à Q-60, Q-64, Q-94.

Calculs utilisés (src/calculs, fusion `espace-vendeur` du 6 oct.) : `etatDeLArgent`, `resume`, `dateDeVersement`
(argent-vendeur.ts) ; `dateDeLiberation`, `vendrediDeVersement`, `heureLimite`, `montantDu` (avec `gel`),
`progressionPourCent`, `essaisApresRefus`, `suspendu`, `finDeRevue`, `referenceDeVersement` (versements.ts) ; `VERSEMENT`
(etats.ts) ; `calculerCommission`, `decouverteActive`, `familleDe` (commission.ts) ; `pourCentAffiche` (argent.ts).

## Ajouts (enrichissement, au-delà du prototype)

1. Œil des montants sur chaque écran d'argent (masque sur place, choix gardé, comme le portefeuille du client, DP-52).
2. Contrôle de la somme « En circulation » avant affichage, alerte au suivi et relecture (VD09-R03).
3. Hors connexion : bandeau « Montants de 09 h 48 », téléchargements et codes qui attendent le réseau et le disent.
4. Tirer pour actualiser (Résumé, Se libère, Gelé, Gains, Versements).
5. Résumé : ligne « Gagné avec BelivaY » vers Mes gains, ligne « Numéro de versement », phrases vides (« Rien de gelé »…).
6. Se libère : compte à rebours vivant, relecture automatique à l'heure de la libération (son), « Voir la commande »,
   délai carte, timeline du « Comment ça marche » avec l'étape en cours, délais lus dans les paramètres.
7. Gelé : compte à rebours par carte, délai dépassé expliqué, filtre Litiges / Retours, vérification anti-fraude prise
   en charge (sans échéance), lien « Voir ce qui est gelé » depuis Se libère.
8. Mes gains : graphique mois par mois (toucher une barre = choisir le mois), flèches mois précédent / suivant, adresse
   `?mois=`, recherche (référence ou produit), tri (récentes / montant), chaque vente ouvre son reçu, meilleure journée,
   relevé du mois en CSV, reprise négative datée prise en charge.
9. Documents : vrais fichiers (CSV « ; » UTF-8, PDF A4) pour relevés, factures des commissions, contrat (grille « part
   que vous gardez » calculée par catégorie), historique des versements ; lien « Déclarer mon RCCM et mon NIU » ;
   lien vers les plans quand il n'y a pas de facture d'abonnement.
10. Versements : copier la référence (prochain et passés), chaque versement s'ouvre (commandes couvertes, numéro crédité,
    « Pas reçu ? »), « Déjà signalé au support », export CSV de la période, statut reporté pendant la revue du numéro,
    refus selon les trois motifs (`?refus=1&motif=plein|tiers|prefixe`, `?refus=suspendu`).
11. Numéro de versement : préfixe contrôlé en direct (bon opérateur, mauvais opérateur nommé, préfixe inconnu), 6 chiffres
    formatés, clavier du prototype ET clavier du téléphone, deux codes avec erreurs par code, essais restants, blocage
    avec heure de reprise, codes expirés, renvoi après délai par code, « Modifier le numéro », reprise de l'étape 2 après
    rechargement, revue avec jours restants et gerbe de succès, versements reportés visibles dans Versements et Résumé.

## Écrans retirés

Aucun.

## Questions

- Préfixes MTN / Orange : Q-94 demande un paramètre du registre par pays ; il n'existe pas encore (voir INTEGRATION.md).
- Le paquet n'écrit pas le libellé quand la fermeture du retour vient des 7 jours (pas de confirmation) : l'écran garde
  « Confirmée … » du prototype ; le serveur pourrait dire laquelle des deux a fermé le retour.
