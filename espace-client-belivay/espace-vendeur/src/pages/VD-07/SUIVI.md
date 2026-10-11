# VD-07 — Litiges et retours : suivi des 12 sous-tâches

Sous-tâches (TACHES-VENDEUR.md, C) : 1 balisage du prototype et t() · 2 source démo, montants par src/calculs ·
3 règles du registre, états vide/chargement/erreur/hors ligne · 4 vraies saisies et issues · 5 enrichissement ·
6 rôle Préparation et anonymat · 7 liens · 8 animations et sons · 9 photos · 10 clair/sombre, FR/EN, 360–430 px ·
11 test de gestes et test boutons · 12 vérification.

| Écran | Route | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Litiges reçus | `litiges` | x | x | x | x | x | x | x | x | x | x | x | x |
| Répondre (trois postures) | `litige` | x | x | x | x | x | x | x | x | x | x | x | x |
| Décision et suites | `litige_envoye` | x | x | x | x | x | x | x | x | x | x | x | x |
| Retours en cours | `retours` | x | x | x | x | x | x | x | x | x | x | x | x |
| Inspection à la réception | `inspection` | x | x | x | x | x | x | x | x | x | x | x | x |
| Remplacer ou rembourser | `remplacement` | x | x | x | x | x | x | x | x | x | x | x | x |

Écrans retirés : aucun (les six ont une utilité réelle). `pages.json` : statut « repris » déclaré dans `routes.ts`
(régénération en vague d'intégration, INTEGRATION.md § 7).

## Règles appliquées (registre-vendeur.json et décisions)
- DP-35 : plus aucune phrase « la décision est prise en faveur du client » ; « Sans réponse, BelivaY décide en
  partant de ce que dit le client » ; décision humaine au plus tard 24 h après l'échéance (LIT-DECISION-H) ; aucun
  arbitrage ni remboursement automatique à l'échéance d'un litige (à l'échéance, le dossier passe en médiation).
- DP-56 Q-26 : recours une fois, sous 48 h, examiné par une autre personne, argent gelé jusque-là (gagné :
  libération = max(date prévue, fin du gel), Q-60) ; mention du tribunal retirée ; client silencieux 5 jours :
  retour en examen. Q-27 : vendeur en tort = trajet retour + livraison (« J'accepte » le dit). Q-17 : l'accès
  Préparation ajoute des preuves, la réponse revient au propriétaire. Q-30 : le choix « Être remplacé » vaut accord.
- DP-57 L-2 : « J'accepte » : remboursé au dépôt au relais, sans nouvelle inspection ; L-4 : retour non conforme,
  BelivaY décide 24 h après les preuves ; L-3 (retour refusé : le client paie le trajet) dans les textes.
- DP-27 (vice caché 100 jours), DP-10 (dépôt au relais, ramassage pour les volumineux), RET-01 à RET-08, INP-01 à
  INP-03, RMP-01 à RMP-03, REP-01 à REP-06, LIT-01 à LIT-05, DCS-01 à DCS-04, VD07-R01 à R31.
- Délais et montants : registre de paramètres (aucun écrit dans un écran) ; montants gardés figés (`gardeFige`,
  src/calculs) ; versement du vendredi par `src/calculs/versements`.

## Ajouts (au-delà du prototype)
Litiges reçus : recherche (référence, article, motif), filtres en vrais boutons, cartes « en médiation » et
« clos » avec leur suite, liens vers la commande et son journal, rappels 24 h/6 h expliqués, tirer pour
actualiser, hors connexion (liste gardée avec l'heure), vide et filtre vide, chargement et erreur (Réessayer).
Répondre : compte à rebours à la seconde, mots du client, brouillon gardé 24 h (rechargé), phrases utiles pour le
constat, vraies photos (appareil photo, allégées, horodatées, signées) ajoutées au dossier et retirables avant
l'envoi, feuille de confirmation (réponse définitive), refus de la source en mots, échéance passée en lecture
seule, historique du dossier (fil chronologique), liens commande, journal, messages.
Décision et suites : votre réponse relue, preuves au dossier, historique, recours dans une feuille (40 caractères
au moins, une fois, dans le délai), « Contestation utilisée le … », dernier état connu hors connexion.
Retours : « J'ai reçu le retour » (l'heure réelle de la remise lance les 48 h, Q-72), « Inspecter maintenant »
avec le compte à rebours, pastilles d'état, historique du retour, « Le remplacement est prêt », retards
remboursés automatiquement, vide et filtre vide qui mène au filtre rempli.
Inspection : cases et verdict gardés à chaque geste (hors connexion : envoi en attente, parti au retour du
réseau), photos réelles, résumé après envoi, lecture seule après le délai.
Remplacement : stock réel de l'offre (une unité réservée), « Plus en stock » et lien Réapprovisionner, livraison
du colis à la charge du vendeur, où la retenue est prise, état après le choix.

## Animations et sons (famille du client)
Pastille qui glisse dans le sélecteur des retours (`.seg`), choix en liste qui s'allume (`.radio.on`, `.chip.on`),
cascade des cartes, chiffres qui défilent (comptes à rebours, compteurs), feuilles qui glissent, coche et gerbe sur
« Litige gagné » (`.blv-succes`), secousse d'un champ en erreur ; sons `message` (réponse, recours), `retrait`
(réception, inspection, choix), `copie` (photo), `erreur`. Tout est coupé en mouvement réduit et sous navigateur
piloté (`@client/composants/Animations`).

## Tests
`tests/VD-07.gestes.spec.ts` (17 gestes) ; `tests/boutons.spec.ts` sur les six routes et les 19 états du prototype
(aucun élément sans effet) ; `tests/squelette.spec.ts` (six routes, 360/430 px, clair/sombre, FR/EN, dictionnaires,
anonymat, routes) ; `tests/identique.spec.ts` (en-têtes au pixel, clair et sombre) ; `tests/VD-04.gestes.spec.ts`
(l'accueil lit les litiges et retours) : tout vert.

## Questions et écarts notés
1. Contestation d'un litige : faite dans une feuille de « Décision et suites » plutôt qu'en ouvrant `#contester`
   (VD-10, sanctions) — voir INTEGRATION.md § 5.
2. Prototype : « Gagner libère la somme aussitôt » et « L'argent reste libéré pendant ce temps » contredisent le gel
   du recours (Q-26) : textes corrigés. VD11-CA-EQU-1 (« Préparation peut répondre aux litiges ») contredit Q-17 :
   Q-17 appliquée.
3. Remplacement : proposer réserve une unité du stock de l'offre ; l'expédition elle-même devrait devenir une
   commande à préparer (INTEGRATION.md § 3).
