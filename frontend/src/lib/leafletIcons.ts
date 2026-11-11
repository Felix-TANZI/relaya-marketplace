// frontend/src/lib/leafletIcons.ts
// Icônes par défaut des marqueurs Leaflet, servies avec le site (images du paquet leaflet, empaquetées par Vite).
// DEV-SRV-01, R5 / T10 : quatre écrans les chargeaient depuis cdnjs.cloudflare.com ou unpkg.com, une adresse écrite
// dans le code et un appel vers un site tiers à chaque carte. Importer ce module suffit.

import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });
