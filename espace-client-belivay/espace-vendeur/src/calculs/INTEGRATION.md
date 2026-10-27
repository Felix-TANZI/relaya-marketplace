# Calculs vendeur : ce qui reste à brancher (vague d'intégration)

Les calculs de `src/calculs/` suivent maintenant les moteurs à jour (commits 3e8512a, 8ca3b39 : DP-55, DP-56, DP-57).
Les fichiers ci-dessous n'ont pas été touchés (hors du périmètre des calculs) ; voici ce qu'ils doivent prendre.

## Changements d'interface des calculs

- `PARAMETRES.liberation` (et `lireLiberation`) n'existe plus : `PARAMETRES.litiges` (`lireLitiges`) porte les codes
  LIT-*, RET-*, LIB-* et `litiges.versements` (une seule règle de libération, audit V3 ; s'arrête si LIB-* et VD-LIB-*
  ne concordent pas). Aucun écran ni domaine ne l'utilisait.
- `PlanVendeur` et `PLANS` viennent de `plans.ts` (plus de `commission.ts`). Aucun import extérieur.
- `remiseDePlan`, `simulerPlans`, `restitutionDeRemise` acceptent des `VenteDuMois` ({ resultat, rembourse }) et une
  `Facturation` ('mensuelle' | 'annuelle' | 'essai'). `RemisePlan` porte en plus `tvaRendue`, `tvaDuPlan`, `plafond`,
  `facturation`. Les appels existants (`simulerPlans(ventes, pc)`) restent valides.
- `verifierPublication(prix, famille, mic, p, { sansIncident, pp })` refuse en plus PRX-09 (plafond de démarrage).
- `Gain.gel` (MotifGel) : `montantDu` n'ajoute plus une somme gelée.
- Nouveaux modules : `plans.ts`, `argent-vendeur.ts`, `sanctions.ts`, `etats.ts` (machine VERSEMENT) ; `litiges.ts`
  complété (échéances, recours, gel pendant le recours, voie de retour, dû du vendeur en tort, inspection,
  remplacement).

## Domaines et démonstration à mettre à jour

| Fichier | À faire | Règle |
|---|---|---|
| `src/demo/argent.ts` | Remplacer les sommes faites à la main par `resume(gains, maintenant())` et `etatDeLArgent` ; passer `gel` dans chaque `Gain` (litige, retour, recours, vérification anti-fraude) pour que `montantDu` et `dateDeVersement` excluent l'argent gelé ; exposer `verifications` (frozen.checks) dans `ResumeArgent`. | VD09-R04, ARG-01, LIB-02, GEL-01, Q-64 |
| `src/donnees/domaines/argent.ts` | Ajouter `verifications: { amount, count }` au résumé ; le libellé « Vérification en cours » et l'échéance du motif (`echeanceMotifAntifraude`). | GEL-02, Q-64 |
| `src/demo/versements.ts`, domaine `versements` | Références par `referenceDeVersement(n)` (pas de « BLV-VS-4092 » écrit) ; statut d'un versement par la machine `VERSEMENT` (prevu, reporte, envoye, refuse, suspendu, credite) ; reprise : `appliquerReprise` puis `suiviReprise` (ventes bloquées, recouvrement proposé). | VER-02, VER-04, Q-11, Q-13, Q-19, A-8 |
| `src/demo/plans.ts`, domaine `plans` | Simulateur avec `facturation` (mois / année / essai) ; essai : `finEssai`, `rappelEssai`, `planApresEssai` ; paiement échoué : `finDeGrace`, `planApresEchec` ; afficher `tvaDuPlan` et `tvaRendue` (0 F au lancement) ; remise restituée sur remboursement (`restitutionDeRemise`). | PLN-01, PLN-02, PLN-05, A-2, A-3, C5, REFVD-R54 |
| `src/demo/offres.ts`, domaine `offres` | Phrase du champ prix par `messageCommissionMinimale` (plage exacte : « De 700 F à 4 239 F et de 5 000 F à 5 181 F… »), jamais « Sous X F » par `seuilCommissionMinimale` seul ; publication par `verifierPublication(…, { sansIncident, pp })` et `plafondDeDemarrage` (start_cap) : prix au-dessus du plafond refusé, brouillon gardé. | Q-55, A-4, PRX-09, A-7 |
| `src/demo/accueil.ts`, `src/demo/notifications.ts`, domaines `accueil`, `paliers` | Carte « près d'un seuil » et notification par `alerteDeSeuil` + `alerteAEnvoyer` (le texte « Plus que 2 points » de n7 doit venir du calcul) ; descente au seuil du palier, pas « seuil − 5 ». | ACC-25, SAN-02, A-5 |
| `src/demo/trust.ts`, domaine `trust` (sanctions) | Niveaux (`NIVEAUX`, `validationHumaine`), fin de visibilité réduite et de suspension, `suspensionProposee`, période probatoire (`probationFinie`), contrôle au ramassage (`frequenceDeControle`, `controleRenforce`). | SAN-01 à SAN-06, CTRL-RAMASSAGE, L-1 |
| `src/demo/retours.ts`, domaines `litiges`, `retours` | Gel jusqu'à `finDuGel` (délai de recours ou réponse), puis `liberationApresLitige` ; vendeur en tort : `rembourserRetour(prix, 'vendeur', p, livraisonDuColis)` puis `duDuVendeur(r, gele, p)`, le reste reporté comme une reprise ; `echeances`, `recoursPossible`, `finInspection`, `echeanceRemplacement`, `voieDeRetour`. | DCS-03, Q-26, Q-27, RET-04, L-4, DP-35 |

La **part de livraison d'un colis** (F(commande) − F(commande sans ce colis), Off conservé) vient du moteur des frais
du client (`moteurs/belivay_moteurs/annulation.py`, `frais.py`), calculée au serveur : le vendeur ne voit pas la
commande entière (anonymat GEN-01). Le contrat d'API du retour doit donc porter ce montant (`livraisonDuColis`).

## Vague d'intégration (6 oct.) — état de chaque point

- [x] Changements d'interface : rien à brancher hors des calculs (aucun import extérieur ne les utilisait).
- [x] `src/demo/argent.ts`, domaine `argent` : fait par VD-09 (`resume`, `etatDeLArgent`, `gel` dans chaque `Gain`, `verifications`) ; l'intégration exclut en plus les dossiers clos (`etatEffectif`) et les sous-commandes de remplacement.
- [x] `src/demo/versements.ts` : fait par VD-09 (`referenceDeVersement`, machine `VERSEMENT`) ; préfixes lus au registre (`VD-PREFIXES-CM`).
- [ ] `src/demo/plans.ts` : fait en partie par VD-10 (facturation, `finEssai`, `rappelEssai`) ; reste `finDeGrace` / `planApresEchec` (le champ `paiementEchoue` existe, aucun scénario ne le produit), `tvaDuPlan` / `tvaRendue`, `restitutionDeRemise` : à brancher avec le paiement réel des plans (vague 3, INTEGRATION-API.md).
- [x] `src/demo/offres.ts` : même règle par VD-08 (`plagesCommissionMinimale` : plage exacte ; `plafondDeDemarrage` : start_cap) ; les valeurs de console passent au registre (`lireConsole`).
- [x] `src/demo/accueil.ts`, `src/demo/notifications.ts` : alerte par `alerteDeSeuil` + `alerteAEnvoyer` (n7 « Plus que N points » calculé).
- [ ] `src/demo/trust.ts` : fait en partie par VD-10 (`finSuspensionAuPlusTard`, `finVisibiliteReduite`, `frequenceDeControle`, `controleRenforce`) ; `NIVEAUX`, `validationHumaine`, `suspensionProposee`, `probationFinie` ne servent qu'aux décisions prises par le serveur (scénarios figés en démonstration) : vague 3.
- [x] `src/demo/retours.ts`, `src/demo/litiges.ts` : règles par `PARAMETRES.litiges`, `echeanceRemplacement`, `finInspection`, `finDuGel`, `recoursPossible`. `rembourserRetour` / `duDuVendeur` attendent `livraisonDuColis` (serveur) : champ `livraisonRetour` ajouté, valeur à servir (INTEGRATION-API.md §2).
- [x] Part de livraison d'un colis : calculée au serveur (GEN-01) ; demandée dans INTEGRATION-API.md.
