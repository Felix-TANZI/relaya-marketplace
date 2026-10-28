# LIV-04 Journée — à faire en vague d'intégration (fichiers communs ou d'autres groupes)

1. **Paramètres au registre** : lus en attendant dans `src/genere/parametres-manquants.json` (`regle()` / `nombre()` de
   `src/demo/session.ts`) : PAUSE-RAPPEL-H, motifs_de_pause, durées_pause, délai_affichage_portail, batterie_alerte,
   batterie_économie, DUREE-RAMASSAGE-MIN, DUREE-DEPOT-COLIS-MIN, MARGE-FERMETURE-RELAIS-MIN, PLAFOND-NOUVEAU,
   seuils_kit_bas, KIT-ABIME-SEUIL, LIV-EMB-FORMATS, CERT-ALERTE-J, PIECE-ALERTE-J. SLA-ZONE-H vient déjà du registre.
2. **File hors connexion** (`src/donnees/domaines/horsligne.ts`, LIV-08) : `TypeAction` n'a pas `depart`, `kit`,
   `paquet_rendu`. Hors connexion, le départ d'un paquet, la déclaration du kit et « je ne peux pas » sont donc
   appliqués sur le téléphone (avec l'heure d'origine) sans entrer dans la file commune : ajouter ces trois types,
   puis passer ces gestes par `geste()` (LIV-04-R30, LIV-02-R119).
3. **Journée clôturée** (`journee`, LIV-08) : l'accueil a un état « Journée clôturée » (`Journee.cloturee`) ; la
   démonstration ne peut pas le lire (état non exporté de `demo/journee.ts`). Exposer `cloturee` (ou l'heure de
   clôture) dans le domaine `journee`.
4. **Kit et étiquettes** (LIV-06, emballage P13) : `source.kit.lierEtiquette(format, etiquette, paquetId, origine)`
   décompte le stock et refuse une étiquette hors plage, déjà liée ou d'un rouleau perdu ; à appeler à la liaison.
   `declarerRendu` / `declarerMotifEcart` sont prêts pour la clôture (LIV-P23, LIV-08-R50).
5. **Incident pré-rempli** (LIV-08, P21) : liens `incident?famille=livreur&type=panne|sante|securite&paquet=…` et
   `incident?type=emballage_manquant&paquet=…` ; à lire par l'écran d'incident.
6. **Jeu d'essai** (`src/demo/tournee.ts`, LIV-05) : PQ-0412 mêle dépôt au relais, remise à domicile et collecte ;
   LIV-PAQ-02 veut une course à domicile en paquet séparé. Numéros du jeu d'essai au format court (PQ-0412) au lieu de
   PQ + zone + AAMMJJ + rang (LIV-RG-R63). La tournée ne lit pas encore la situation `?demo=aucun_paquet`.
7. **En-tête des pages secondaires** : voir LIV-03/INTEGRATION.md § 4 (logo panier à droite). `paquet` n'a plus de
   barre du bas (ses actions sont fixées en bas d'écran, comme le paquet du prototype).

## Accueil allégé (13 oct. 2026, retours du porteur)
- **Paquets du jour** : les trois prochains en tête ; les autres et les terminés sont repliés derrière une ligne
  « N autres paquets · dont M terminés » (une touche déplie). À volume normal (9 paquets), la liste entière poussait
  les tuiles, les alertes et la clôture hors de l'écran. Rien n'est retiré : tout reste dans le DOM et à une touche.
- **« Mon planning » retiré de l'accueil** : il est déjà au Menu (config/navigation.ts) et n'est pas un geste de la
  journée en cours ; le garder ici doublait l'entrée. La clôture et « Je ne peux pas faire ce paquet » restent.
- Jeu d'essai : 9 paquets (src/demo/paquets.ts), mêmes numéros côté entreprise (espace-entreprise/src/demo/paquets.ts).
