// frontend/src/config/site.ts
// Adresse du site public BelivaY (boutique client) : liens partagés, QR codes, parrainage, balises SEO.
// DEV-SRV-01, règle R5 : « aucune adresse écrite dans le code, tout passe par la configuration ». Elle se règle à la
// construction (VITE_SITE_URL, docker-compose.prod.yml) ; ce fichier est le seul à porter la valeur par défaut, celle
// du site public au lancement (belivay.com ouvre l'espace client le 14 décembre).

export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://belivay.com').replace(/\/+$/, '');
