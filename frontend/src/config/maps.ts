export const mapProvider = import.meta.env.VITE_MAP_PROVIDER || 'openstreetmap';

export const mapTileUrl =
  import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const mapAttribution =
  import.meta.env.VITE_MAP_ATTRIBUTION || '© OpenStreetMap contributors';

export const geocodingApiUrl =
  (import.meta.env.VITE_GEOCODING_API_URL || 'https://nominatim.openstreetmap.org').replace(/\/$/, '');

export const mapUserAgentNote = 'BelivaY map display uses browser requests; keep OSM attribution visible.';
