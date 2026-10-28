# AJ-E — pages ajoutées de l'espace entreprise

Pages hors prototype (ENRICHISSEMENTS.md, partie 2), liées depuis le Menu (« Outils »), le Profil, la Flotte et la
barre du haut ; chacune lit la source, suit les rôles (ENT-RG-R25) et vit dans le kit commun (`.px`).

- `Recherche.tsx` (`recherche?q=`) : chercher partout (index `composants/recherche.ts` : paquets, missions, colis,
  livreurs, incidents, litiges, véhicules, zones, pages ; filtré par rôle), récentes sur l'appareil, raccourcis.
- `Securite.tsx` (`securite`) : mon accès (limites du registre), appareils connectés (déconnexion un par un), équipe et
  dernières connexions (accès internes au plus), rôles : qui peut faire quoi et pourquoi (`config/droits.ts`, vérifié
  par `config/droits.test.ts` contre les rôles des routes).
- `Planning.tsx` (`planning?j=aujourdhui|demain|semaine`) : créneaux par livreur, charge face à la capacité, absences,
  missions à affecter (→ Affectation).
- `Apprendre.tsx` + `fiches.ts` (`apprendre?fiche=`) : six fiches, chaque nombre lu dans le registre ; lues marquées.
- `Activite.tsx` (`activite?g=&p=`) : journal signé de l'équipe (`source.compte.activite`), filtres, recherche, export
  CSV.
- Tests : `tests/AJ-E.gestes.spec.ts` (avec la coque et les enrichissements d'ENT-00/03/04).
