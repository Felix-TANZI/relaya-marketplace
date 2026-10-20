// frontend/src/features/vendors/v2/accueil/format.ts
// Petits formatteurs locaux (pas de lib de dates dans le projet) — ACC-18 :
// délai relatif en haut à droite, heure en clair dans le corps de la carte.

export function formatXaf(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} F`;
}

export function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** "Dans 2 h 54" / "En retard de 12 min" — arrondi à la minute (ACC-18). */
export function formatRelativeDeadline(iso: string): { label: string; overdue: boolean } {
  const diffMs = new Date(iso).getTime() - Date.now();
  const overdue = diffMs < 0;
  const abs = Math.abs(diffMs);
  const hours = Math.floor(abs / 3_600_000);
  const minutes = Math.round((abs % 3_600_000) / 60_000);
  const duration = hours > 0 ? `${hours} h ${minutes.toString().padStart(2, '0')}` : `${minutes} min`;
  return { label: overdue ? `En retard de ${duration}` : `Dans ${duration}`, overdue };
}

/** "BLV-00008" — même format que commandes/helpers.ts et litiges/helpers.ts, dupliqué ici pour rester dans accueil/. */
export function orderRef(id: number): string {
  return `BLV-${String(id).padStart(5, '0')}`;
}

/**
 * Prénom affiché dans la salutation ("Bonjour Franck"). VendorProfile n'expose
 * aucun champ prénom dédié (ACC-écart) : on tente de le tirer du premier
 * segment alphabétique du `username`, et on retombe sur le premier mot du nom
 * de boutique si le username ressemble à un identifiant technique (email,
 * chiffres…). Jamais un nom inventé — au pire, le nom de la boutique.
 */
export function deriveFirstName(profile: { username?: string | null; business_name: string }): string {
  const rawUsername = (profile.username || '').split('@')[0];
  const lettersOnly = rawUsername.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿ]+/g, ' ').trim();
  const firstToken = lettersOnly.split(/\s+/).find((tok) => tok.length >= 2) || '';
  const source = firstToken || profile.business_name.split(/\s+/)[0] || profile.business_name;
  return source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
}

/** "LUNDI 21 SEPTEMBRE" — date du jour, sans année (ACC-écart salutation). */
export function formatTodayLabel(locale: 'fr' | 'en'): string {
  return new Date()
    .toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();
}

/**
 * "demain à 05:30" / "mercredi 23 sept. à 06:02" — échéance absolue lisible
 * pour la phrase "Répondez avant …" (litiges) ou "Vous avez jusqu'à …" (retours).
 */
export function formatAbsoluteDeadline(iso: string, locale: 'fr' | 'en'): string {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const time = formatClockTime(iso);
  if (sameDay(d, now)) return locale === 'en' ? `today at ${time}` : `aujourd’hui à ${time}`;
  if (sameDay(d, tomorrow)) return locale === 'en' ? `tomorrow at ${time}` : `demain à ${time}`;
  const weekday = d.toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
  return locale === 'en' ? `${weekday} at ${time}` : `${weekday} à ${time}`;
}
