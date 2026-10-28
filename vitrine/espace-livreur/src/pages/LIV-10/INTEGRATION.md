# LIV-10 (messages, notifications, moi, aide et SOS, réglages) — à faire en vague d'intégration

Voir aussi `../LIV-08/INTEGRATION.md`.

1. **Taille du texte libre** : Réglages propose un curseur sur toute l'échelle `ECHELLES` (85 à 140 %) et trois
   préréglages. `preferences.tsx` (commun) ne relit au démarrage qu'une valeur de `ECHELLES` : pour un réglage au pour
   cent près, accepter tout entier entre 85 et 140 dans `lit('blv_l_echelle', …)`.
2. **Mode une main** (CONF-LIV-UNE-MAIN) et **application de navigation** (CONF-LIV-NAV) : préférences d'appareil à
   ajouter dans `preferences.tsx` ; non exposées tant qu'elles n'existent pas.
3. **Support WhatsApp** : SUP-WA vaut « à publier » (DP-40) ; le bouton apparaît dès qu'un numéro est au registre.
4. Les fils de messages, les notifications et le SOS doivent être servis au portail entreprise (fil entreprise
   identique, accusé « lu à », SOS en temps réel) et à la console (journal des appels sans contenu, dossier Sécurité).
5. `etatMessages` (fils, lus par la session pour le badge) et `etatNotifications` gardent leur forme de tableau ; les
   contenus des fils sont dans `messages_contenu`, le journal des appels dans `messages_appels`.
