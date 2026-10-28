# VD-06 — changements demandés hors du groupe (vague d'intégration)

1. **Écran entier identique (`tests/identique.spec.ts`)** : les états `commande_prete*`, `commande_remise*`, `recu*`,
   `erreurs*` sont enrichis et suivent les données (le code est toujours masqué à l'ouverture : REM-01 interdit
   `?code=1` ; BLV-00008 n'est pas encore prête au départ du jeu d'essai ; les puces du reçu sont les vrais reçus). Les
   sortir de la comparaison « écran entier » (garder l'en-tête, vert) ou les déclarer dans une liste d'écrans enrichis.
2. **Domaine `preparation` (VD-05)** : `cestPret(ref, origine?: Instant)` — l'heure d'origine d'un « C'est prêt » fait
   hors connexion (rejoué depuis la file de l'accueil) doit être gardée (origin_time, VD04-R14) ; aujourd'hui la
   démonstration note l'heure de l'envoi.
3. **Messagerie (VD-11)** : ouvrir le fil « Support BelivaY » avec `messages?fil=support&ref=BLV-…` (VD06-R07, Q-49) ;
   la référence de la commande pré-remplie.
4. **Journal (VD-05)** : traduire en anglais les entrées écrites par la remise (« Code de remise affiché », « Remis à
   {livreur} (code saisi par le livreur) · responsabilité passée à {société} », « Code faux saisi par le livreur (n/3) »,
   « Nouveau code de remise demandé (l'ancien est annulé) », « Annulée par le client avant le ramassage · stock rendu »,
   « {livreur} n'est pas passé : délai suspendu jusqu'au créneau suivant ») — ou passer le journal en codes d'action.
5. **Registre en vigueur** (`logique-metier/parametres-en-vigueur.json`) : ajouter `OFFLINE_ACTION_TTL_H` = 72 h
   (Décidé, OFF-04) ; il est aujourd'hui une constante commentée de `src/demo/remise.ts` (`FILE_HEURES`), servie aux
   écrans par la source.
6. **Connecteur API (vague 3)** : `remise.toutes()`, `aRemettre()`, `afficherCode()` (GET handover-code),
   `nouveauCode()` (route à ajouter : POST /orders/{id}/handover-code/renew, DP-56), `recus()` (GET /orders?receipt=1 ou
   /documents?type=receipt) ; `saisieLivreur` et `simuler` n'existent qu'en démonstration.
7. **Styles** : `src/pages/VD-04/vd04.css` porte les animations de la remise (chiffres du code, sablier, photo
   agrandie) et `.vx-chips{overflow-x:auto}` ; à déplacer dans `src/styles/vendeur.css` si un autre groupe en a besoin.
8. **Dictionnaire** : `src/i18n/VD-06.en.json` ajoute « Tous », « Le livreur », « le livreur », « Apple Pay »,
   « Google Pay »… ; vérifier qu'aucun autre groupe n'a ajouté la même clé (test squelette « dictionnaires »).

## Vague d'intégration (6 oct.) — état de chaque point

- [x] 1. Écrans de la remise : en-tête seul dans identique.spec.ts.
- [x] 2. Heure d'origine d'un « C'est prêt » rejoué gardée (`cestPret(ref, a.origine)`).
- [x] 3. `messages?fil=support&ref=BLV-…` ouvre le support avec la référence préremplie.
- [x] 4. Entrées du journal écrites par la remise en modèles traduits (`{p}`).
- [x] 5. `VD-FILE-HORS-LIGNE` (72 h) au registre ; `FILE_HEURES` le lit.
- [x] 6. Connecteur : INTEGRATION-API.md (dont `POST /orders/{id}/handover-code/renew`).
- [ ] 7. Styles de la remise : non applicable — aucun autre groupe n'en a besoin ; ils restent dans `vd04.css`.
- [x] 8. Dictionnaires sans doublon (60 clés réunies dans `commun.en.json`).
