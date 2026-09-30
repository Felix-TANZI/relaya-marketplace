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
