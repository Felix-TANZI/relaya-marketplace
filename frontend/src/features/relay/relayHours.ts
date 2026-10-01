// frontend/src/features/relay/relayHours.ts
//
// =============================================================================
//  LES HORAIRES DU POINT RELAIS, JOUR PAR JOUR
//
//  ─────────────────────────────────────────────────────────────────────────
//  POURQUOI UN FORMAT, ET PAS UN MODELE
//
//  Le serveur ne stocke qu'une chaine libre : `RelayPointProfile.opening_hours`,
//  160 caracteres, aucune structure. Un samedi qui ferme plus tot n'y tenait
//  pas autrement qu'en prose — et personne ne peut planifier une tournee sur
//  de la prose.
//
//  On ecrit donc une forme canonique DANS cette chaine :
//
//      Lun 8h-19h; Mar 8h-19h; ... ; Sam 9h-17h; Dim fermé
//
//  Elle reste lisible par un humain (l'admin Django l'affiche telle quelle),
//  tient largement dans les 160 caracteres, et se relit sans ambiguite.
//
//  ─────────────────────────────────────────────────────────────────────────
//  LES ANCIENNES VALEURS
//
//  Les relais deja inscrits ont des chaines libres — « Lun-Sam 8h-19h »,
//  « 08:00 - 19:00 ». On en extrait les deux premieres heures et on les
//  applique du lundi au samedi, dimanche ferme. C'est faux pour les cas
//  tordus, mais c'est reparable en trois touches par le gerant, alors qu'une
//  semaine vide l'aurait laisse sans horaires du tout.
// =============================================================================

/** Un jour de la semaine, tel que l'ecran le manipule. */
export interface DaySchedule {
  open: boolean;
  /** Heure d'ouverture, en heures pleines. */
  from: number;
  /** Heure de fermeture, en heures pleines. */
  to: number;
}

/**
 * La coupure de midi.
 *
 * Elle tient dans la meme chaine, en fin de ligne : `...; Pause 13h-14h`.
 * Elle n'est pas un detail de confort — un livreur envoye pendant la pause
 * trouve porte close, et c'est le relais qui perd le point de ponctualite.
 */
export interface LunchBreak {
  on: boolean;
  from: number;
  to: number;
}

/** Lundi en premier : c'est l'ordre de la semaine de travail, pas celui de `Date`. */
export const DAY_LABELS = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."] as const;

/** Formes courtes utilisees dans la chaine stockee. */
const DAY_KEYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

/** Bornes de la reglette : avant 6 h et apres 22 h, aucun relais n'ouvre. */
export const DAY_START = 6;
export const DAY_END = 22;

const DEFAUT: DaySchedule[] = [
  ...Array.from({ length: 6 }, () => ({ open: true, from: 8, to: 19 })),
  { open: false, from: 8, to: 19 },
];

function borne(valeur: number, repli: number) {
  if (!Number.isFinite(valeur)) return repli;
  return Math.min(DAY_END, Math.max(DAY_START, Math.round(valeur)));
}

/**
 * Lit la chaine du serveur.
 *
 * Trois cas, dans cet ordre : la forme canonique, une chaine libre dont on
 * sauve les deux premieres heures, et le vide qui retombe sur 8 h-19 h du
 * lundi au samedi.
 */
export function parseOpeningHours(raw: string): DaySchedule[] {
  const texte = (raw || "").trim();
  if (!texte) return DEFAUT.map((jour) => ({ ...jour }));

  const jours = DEFAUT.map((jour) => ({ ...jour }));
  let reconnus = 0;

  DAY_KEYS.forEach((cle, index) => {
    const ferme = new RegExp(`${cle}[a-zé.]*\\s*(?:ferm|clos)`, "i");
    if (ferme.test(texte)) {
      jours[index] = { ...jours[index], open: false };
      reconnus += 1;
      return;
    }
    const plage = new RegExp(`${cle}[a-zé.]*\\s*(\\d{1,2})\\s*[h:]\\s*\\d{0,2}\\s*[-–à]\\s*(\\d{1,2})`, "i");
    const trouve = plage.exec(texte);
    if (trouve) {
      const from = borne(Number(trouve[1]), 8);
      const to = borne(Number(trouve[2]), 19);
      jours[index] = { open: true, from, to: Math.max(from + 1, to) };
      reconnus += 1;
    }
  });

  if (reconnus > 0) return jours;

  // Chaine libre : on recupere la premiere plage horaire qui s'y trouve.
  const libre = /(\d{1,2})\s*[h:]\s*\d{0,2}\s*[-–à]\s*(\d{1,2})/i.exec(texte);
  if (!libre) return jours;
  const from = borne(Number(libre[1]), 8);
  const to = Math.max(from + 1, borne(Number(libre[2]), 19));
  return jours.map((jour) => ({ ...jour, from, to }));
}

/** Lit la coupure de midi. Absente de la chaine, elle est simplement desactivee. */
export function parseLunchBreak(raw: string): LunchBreak {
  const trouve = /pause\s*(\d{1,2})\s*[h:]\s*\d{0,2}\s*[-–à]\s*(\d{1,2})/i.exec(raw || "");
  if (!trouve) return { on: false, from: 13, to: 14 };
  const from = borne(Number(trouve[1]), 13);
  const to = Math.max(from + 1, borne(Number(trouve[2]), 14));
  return { on: true, from, to };
}

/** Reecrit la semaine — et la pause — dans la chaine du serveur. */
export function formatOpeningHours(jours: DaySchedule[], pause?: LunchBreak): string {
  const semaine = jours
    .map((jour, index) => (jour.open ? `${DAY_KEYS[index]} ${jour.from}h-${jour.to}h` : `${DAY_KEYS[index]} fermé`))
    .join("; ");
  return pause?.on ? `${semaine}; Pause ${pause.from}h-${pause.to}h` : semaine;
}

/** Index du jour courant, lundi = 0. */
export function todayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

/**
 * Heure de fermeture d'aujourd'hui, pour le bandeau et les echeances.
 *
 * Vide quand le relais est ferme : annoncer « Ouvert · 19 h » un dimanche
 * ferme serait pire que de ne rien annoncer.
 */
export function todayClosing(jours: DaySchedule[]): string {
  const jour = jours[todayIndex()];
  return jour && jour.open ? `${jour.to} h` : "";
}
