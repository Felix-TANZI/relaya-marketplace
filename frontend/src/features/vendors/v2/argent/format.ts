// frontend/src/features/vendors/v2/argent/format.ts
// Petits formatteurs locaux à "Mon argent" (VD-09) — même convention que les
// autres dossiers v2/* (accueil/format.ts, compte/shared/format.ts) : pas de
// lib de dates dans le projet, utilitaires dupliqués volontairement pour
// rester à l'intérieur du dossier.

export function formatXaf(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return `${Math.round(amount).toLocaleString('fr-FR')} F`;
}

/** "BLV-00008" — même format que accueil/format.ts, commandes/helpers.ts, litiges/helpers.ts. */
export function orderRef(id: number): string {
  return `BLV-${String(id).padStart(5, '0')}`;
}

/** "20 sept." — date courte utilisée pour "libéré le …" (Gains, VD-09 §fig.5). */
export function formatShortDate(iso: string, locale: 'fr' | 'en'): string {
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'short' });
}

/** "Septembre" / "September" — mois en cours, pour le bandeau nuit de Mes gains. */
export function formatCurrentMonthLabel(locale: 'fr' | 'en'): string {
  const label = new Date().toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', { month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "dans 2 jours" / "bientôt" si le délai exact n'est pas connu — releasing.days_left peut être null (VD-09 "se libère"). */
export function formatDaysLeft(daysLeft: number | null, locale: 'fr' | 'en'): string {
  if (daysLeft === null || Number.isNaN(daysLeft)) return locale === 'en' ? 'soon' : 'bientôt';
  const rounded = Math.max(0, Math.ceil(daysLeft));
  if (rounded <= 0) return locale === 'en' ? 'today' : "aujourd'hui";
  if (rounded === 1) return locale === 'en' ? 'in 1 day' : 'dans 1 jour';
  return locale === 'en' ? `in ${rounded} days` : `dans ${rounded} jours`;
}

export function isSameMonth(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}
