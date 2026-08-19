// frontend/src/features/payments/shared/dates.ts
// Dates financieres, en francais.
//
// Isole des composants : `react-refresh/only-export-components` interdit
// d'exporter autre chose qu'un composant depuis un fichier `.tsx`.

const FORMAT_LONG = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long',
});

const FORMAT_COURT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'short',
});

const FORMAT_JOUR = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'long', year: 'numeric',
});

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** « vendredi 15 août » */
export function formatLongDate(value: string | null | undefined): string {
  const date = parse(value);
  return date ? FORMAT_LONG.format(date) : '';
}

/** « 8 août » */
export function formatShortDate(value: string | null | undefined): string {
  const date = parse(value);
  return date ? FORMAT_COURT.format(date) : '';
}

/** « 15 août 2026 » */
export function formatDay(value: string | null | undefined): string {
  const date = parse(value);
  return date ? FORMAT_JOUR.format(date) : '';
}

/**
 * « dans 4 jours », « demain », « aujourd'hui », « il y a 2 jours ».
 *
 * Une date est une information ; un compte a rebours est un ENGAGEMENT.
 * C'est ce qui rend la promesse de BelivaY concrete.
 */
export function relativeDays(value: string | null | undefined): string {
  const date = parse(value);
  if (!date) return '';

  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const cible = new Date(date);
  cible.setHours(0, 0, 0, 0);

  const jours = Math.round(
    (cible.getTime() - aujourdhui.getTime()) / 86_400_000,
  );

  if (jours === 0) return "aujourd'hui";
  if (jours === 1) return 'demain';
  if (jours === -1) return 'hier';
  if (jours > 1) return `dans ${jours} jours`;
  return `il y a ${Math.abs(jours)} jours`;
}

/** « 4 au 10 août » — deux bornes, un seul mois quand c'est possible. */
export function formatPeriod(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  const debut = parse(start);
  const fin = parse(end);
  if (!debut || !fin) return '';

  const memeMois = debut.getMonth() === fin.getMonth()
    && debut.getFullYear() === fin.getFullYear();

  return memeMois
    ? `${debut.getDate()} au ${FORMAT_COURT.format(fin)}`
    : `${FORMAT_COURT.format(debut)} au ${FORMAT_COURT.format(fin)}`;
}