# S5 — besoins dans les fichiers communs (vague d'intégration)

1. `src/demo/pont.ts` : ajouter à `EvenementPont` les types de `src/demo/pont-s5.ts` (parametre_annonce, interrupteur,
   flash, rabais_retire, incident, ressaisie_relancee, diffusion, support_reponse, geste, modele_publie, sms_renvoye)
   et retirer la conversion de `publierS5` ; les cinq autres espaces lisent `evenementsDe('admin')` (bandeau de panne,
   annonce de paramètre, réponse du support, vente flash). — **fait** (intégration : `pont-s5.ts` retiré ; ses types sont dans `EvenementPont` (l'incident de service devient `panne`, pour ne pas se confondre avec l'incident de livraison du livreur) ; `pilotage.ts` et `communication.ts` appellent `publier`. Les espaces sans pont (vendeur, relais, client) : A-VALIDER § 6).)
2. `src/config/parametres-proposes.ts` (ou registre officiel) : y porter `PARAMETRES_PAQUET_S5` de `regles-s5.ts`. —
   **fait** (intégration : les seize codes sont au registre officiel, `PARAMETRES_PAQUET_S5` et `registreS5` retirés).
3. `src/demo/compteurs.ts` : badge `support` = demandes non résolues de `communicationDemo` (aujourd'hui TICKETS) ;
   ajouter messagerie (critique non délivré), panne (incident actif), parametrage (propositions à contresigner). — **fait** (intégration : `support` = demandes non résolues ; badges `messagerie` (critique non délivré), `panne` (incident en cours, au périmètre), `parametrage` (propositions à contresigner, après réconciliation)).)
4. `src/composants/coque.tsx` : afficher le bandeau d'un incident actif (console = sixième application). — **fait** (intégration : `composants/BandeauPanne.tsx` posé par la coque ; la session porte `panne`).)
5. `src/config/droits.ts` : `interrupteurs` en lecture pour la Finance (second validateur d'une bascule ; aujourd'hui
   elle contresigne depuis Paramétrage › Quatre yeux). — **fait** (intégration : `interrupteurs` : Finance en lecture, note « Second validateur d’une bascule »).)
6. `src/demo/systeme.ts` (S6) : `basculer` direct (sans quatre yeux) à retirer ; les bascules passent par
   `source.pilotage.demanderBascule` qui tient FF-IA à jour dans `systemeDemo`. — **fait** (intégration : `basculer` retiré de `demo/systeme.ts` et du type `DomaineSysteme` ; test : l'Audit est refusé par `demanderBascule`, et la source n'a plus de `basculer`).)
7. `vite.config.ts` (allegerJson) : le statut et la catégorie du registre sont lus via `src/demo/pilotage-registre.json`
   (régénéré, vérifié par `src/demo/s5.test.ts`) ; à remplacer par l'API `GET /api/console/parametres`. — **fait**
   (intégration : `pilotage-registre.json` régénéré depuis le registre officiel, codes de la console compris ; le
   catalogue de Paramétrage ne lit plus que `REGISTRE`. L'API reste pour le serveur).
8. `src/demo/jeu-essai.ts` : `TICKETS` remplacé par les demandes de `src/demo/communication.ts` (garder les mêmes SP-). — **fait** (intégration : `TICKETS` (et KYC, OFFRES_A_MODERER, REMBOURSEMENTS, PALIERS_A_VALIDER, ALERTES_FRAUDE) retirés du jeu d'essai ; la File, les compteurs, la vue d'ensemble et la recherche lisent les domaines).)
9. Dictionnaires : `src/i18n/S5.en.json` (ADM-10 est partagé avec S2) ; à la fusion, retirer d'un des fichiers une clé
   commune éventuelle (« Annulée », « Programmer », « Heure »…) si S6 ou S2 l'a aussi. — **fait** (intégration : les 201 clés présentes dans plusieurs dictionnaires sont réunies dans `commun.en.json` (valeur la plus fréquente) ; `outils/textes.mjs` : toutes traduites).)
