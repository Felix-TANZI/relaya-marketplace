# LIV-06 · besoins hors du groupe (reprise sur le prototype)

1. **Kit `prototype-ecarts.css` — accessibilité** : `.stepper .st` (11,5 px), `.pill.sm` (11,5 px), `.mini .mk` (11,5 px),
   `.lr-fmt .f small/em/i` (10 à 11 px) sont sous les 12 px exigés par `tests/accessibilite.spec.ts` ; en sombre, le
   chiffre blanc de `.stepper .st.cur b` et de `.lr-ss.cur .n` sur `--braise-1` (#FF8A3D) n'a que 2,35 : 1 ; `.hero.acc`
   en sombre (#34D399) et `.hero.orange` en clair ne portent pas un texte blanc lisible. La tournée (LIV-05) a les mêmes
   écarts. LIV-06 les corrige localement dans `liv06.css` (et emploie `.hero.green` / `.hero.amber`) : à remonter dans
   le kit, puis retirer ces lignes de `liv06.css`.
2. **Kit — balisage en boutons** : le prototype dessine `.seg a`, `.keypad span`, `.lr-chk`, `.lr-shot`, `.lr-fmt .f`
   comme des liens ou des blocs ; l'application en fait des boutons (`role=radio|checkbox`). Les règles d'appoint sont
   dans `liv06.css` (`.seg button`, `.keypad button`, `button.lr-chk`, …) : utiles aussi à LIV-07 (code du relais,
   retour vendeur) si elles montent dans le kit.
3. **`CodeSix` (kit)** garde l'ancien balisage `lv-code`/`lv-pave` ; le code de remise emploie désormais `C.otp` et
   `C.keypad` du prototype (composants locaux de `CodeRemise.tsx`). `taperCode` des tests lit les deux pavés.
4. **Route `arrivee`** : l'onglet a été retiré de `routes.ts` (écran sans dock du prototype, barre d'action collée en bas).

## Kits unifiés (12 oct. 2026)
Les remarques ci-dessus sur `composants/livraison/prototype.css`, `prototype-ecarts.css`, `proto.tsx`, `CodeSix` et les
feuilles de groupe sont réglées : voir LIV-05/INTEGRATION.md, « Kits unifiés ».

## Colis touchables (13 oct. 2026, retour du porteur « des pages de vérification ne s'ouvrent pas »)
Les pastilles des colis (livRam_pk) et les articles « À ramasser ici » avaient l'air touchables sans rien ouvrir. Ils
ouvrent désormais le colis : sur place, son étape de preuve en cours (contrôle, audit ou emballage) ; sinon (colis
emballé, remis, refusé, ou pas encore arrivé), sa fiche de contrôle en feuille avec son état. La pastille du colis de
l'écran ouvert reste une simple marque. Vérifié par tests/effets.spec.ts (effet réel de chaque élément, à chaque
étape du ramassage).
