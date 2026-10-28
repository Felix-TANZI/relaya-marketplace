# LIV-09 (historique, activité, Trust Score) — à faire en vague d'intégration

Voir aussi `../LIV-08/INTEGRATION.md` (éléments partagés, paramètres du registre, coque).

1. Un seul jeu de missions validées (`src/demo/historique.ts`, `PAQUETS` + arrêts faits du jour) nourrit
   l'historique, l'activité, l'Ancienneté du Trust Score et le bilan de clôture (LIV-09-R04). Le portail entreprise
   (ENT) doit lire les mêmes chiffres.
2. Le score Trust est calculé en démonstration (Σ poids × critère) et écrit dans `etatTrust.score`, que lit la
   session (pastille). Un moteur `src/calculs/trust.ts` (commun) devrait le reprendre, avec le lissage bayésien.
3. Affichage « tarif par mission » : réglé par l'entreprise (`etatActivite.affichage`, ENT-P06R-02) ; à brancher sur
   le portail entreprise.
