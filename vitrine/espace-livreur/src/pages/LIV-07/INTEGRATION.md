# LIV-07 Remises — besoins hors du groupe (reprise sur le prototype, oct. 2026)

1. **Kit (prototype-ecarts.css)** : remonter les écarts d'accessibilité de `liv07.css` (et `LIV-06/liv06.css`) :
   étapes `.stepper .st`, `.mini .mk`, `.pill.sm` à 12 px ; `.chips .chip` à 44 px de haut ; étape en cours lisible en
   sombre. Le prototype dessine ces éléments à 11,5 px et 38 px.
2. **Domaine `remises`** (données que le prototype montre et que la source ne sert pas encore) :
   - photos de la gérante pour une réserve ou un refus au relais (le prototype les affiche en `.photos.p2`) : la source
     ne donne que leur nombre ;
   - essais de paiement à domicile (frise du prototype) : retirés, le client paie toujours en ligne (porteur, 18 oct.) ;
   - vignette de la devanture du relais et photo de la gérante (carte `livRem_relay`) : remplacées par une icône et
     l'initiale du prénom, jamais une image inventée ;
   - capacité du relais pour la collecte (le prototype montre « Capacité ») : remplacée par « Confirmés n sur m ».
3. **Code à six chiffres** : `CodeSix` (kit, `.lv-pave`) reste utilisé à domicile et au retour ; le code de remise du
   ramassage (LIV-06) a son propre pavé `.keypad` du prototype. Unifier dans le kit.
4. **tests/accessibilite.spec.ts** attend encore « Dépôt complet · garde transférée » : le kicker du héros garde ce
   libellé (le prototype écrit « Dépôt complet »).

## Kits unifiés (12 oct. 2026)
Les remarques ci-dessus sur `composants/livraison/prototype.css`, `prototype-ecarts.css`, `proto.tsx`, `CodeSix` et les
feuilles de groupe sont réglées : voir LIV-05/INTEGRATION.md, « Kits unifiés ».
