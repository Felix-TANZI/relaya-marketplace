# ENT-06 — changements pour la vague d'intégration

Tout est regroupé dans `../ENT-05/INTEGRATION.md` (même agent, briques communes dans `../ENT-05/commun.tsx`,
`regles.ts` et `livraison.css`).

## Reprise sur le prototype (missions, incidents, colis, preuves)

Les quatre écrans suivent route('missions' | 'incidents' | 'colis' | 'preuves') du prototype, sous `<Px>` (kit
`composants/prototype.tsx`). Aucune route ajoutée. Retouches propres au groupe dans `missions.css` (préfixe `.px`,
jetons seulement). Rien n'a été changé dans `../ENT-05/commun.tsx` ni dans `livraison.css`.

À reporter dans le kit partagé (`outils/contenu-prototype.mjs` → `styles/contenu.css`) :

- `.px .photo .ts` : fond `var(--voile)` (sombre, 45 %) avec texte `var(--ink)` : illisible. Corrigé localement dans
  `missions.css` (fond `var(--card)`).
- `.srch` (recherche des outils de tableau) et `.glass` (fond de la légende `map-leg`) absents de `contenu.css` :
  définis localement dans `missions.css`.
- `.px .panel > .ph:has(h2 + *) > h2 { min-width: 200px }` et `.px .li > .grow { flex: 1 1 170px }` font passer le
  lien « Flotte » et les pastilles à la ligne dans les colonnes étroites (g21 / g12) : neutralisé localement par la
  classe `lv-etroit`.

## Enrichissements (lot l/e-ent-2)

- P13 : relance par `geste()` (file hors connexion) ; plein écran de la carte (API du navigateur, sinon cadre fixe,
  Échap) ; heure de la dernière position reçue + « Actualiser » ; export CSV de la journée (aucune position) ;
  `Rebours` sur les heures limites ; `BarrePouce` (À affecter, Incidents).
- P14 : recherche / puces / tri dans l'adresse (?q= ?f= ?tri=) ; `Rebours` du délai de réponse ; son + annonce à
  l'arrivée d'un incident ; décision et transfert par `geste()` ; « Annuler » 5 s sur la décision (envoi immédiat à
  moins de 15 s de l'échéance) ; `Limite` du délai de réponse.
- P15 : QR et numéro masqués jusqu'au toucher (re-masqués après 30 s) ; export CSV ; scan (`Scan.tsx`,
  BarcodeDetector + caméra, sinon saisie) qui ouvre la bonne file ; zéro résultat ; relance par `geste()`.
- P16 : `Visionneuse.tsx` (zoom, molette, pincer, déplacement, heure téléphone/serveur et lieu incrustés) ; filtre
  « Preuves manquantes » ; PDF réel (%PDF) et CSV, tous deux journalisés ; signaler / compléter par `geste()` +
  « Annuler », relance par `geste()`. Photo.tsx n'a pas de file propre (elle montre la file du TÉLÉPHONE du livreur) :
  les gestes photo de l'entreprise (complément) passent par `geste()` ; des fichiers photo ne peuvent pas attendre le
  réseau (localStorage) : hors connexion, le complément avec photos est refusé clairement.

### Pour le kit et la coque

- Icônes absentes de `genere/icones.json` : `zoom-out`, `maximize-2`, `minimize-2` (remplacées par `minus`, `scan`,
  `x`).
- `enrichi.css` : ajout `.chip.on .e-puce-n{opacity:1}` (le compteur d'une puce active passait sous 4.5:1 en sombre).
- `.srch` et `label.flt` du kit font 38 / 36 px : sous 44 px hors des barres de tableau (corrigé localement
  `.lv-outils`).
- Carte de la flotte et carte d'un incident : fond OpenStreetMap commun (`src/composants/CarteOsm.tsx`, Web Mercator),
  mention en haut à droite (la légende tient le bas), zones plus transparentes sur le fond OSM ; repli : le plan
  quadrillé d'avant (hors ligne, tuile en échec, navigateur piloté). Test : `tests/carte-osm.spec.ts`.
