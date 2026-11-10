// frontend/src/config/site.ts
// Adresse du site public BelivaY (boutique client) : liens partagés, QR codes, parrainage, balises SEO.
// DEV-SRV-01, règle R5 : « aucune adresse écrite dans le code, tout passe par la configuration ». Elle se règle à la
// construction (VITE_SITE_URL, docker-compose.*.yml) ; sans elle, le domaine courant. Plus aucune adresse écrite ici :
// belivay.com est la vitrine jusqu'au 14 décembre.

export const SITE_URL = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/+$/, '');
