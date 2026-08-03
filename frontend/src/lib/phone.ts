// frontend/src/lib/phone.ts
// Utilitaires de validation / formatage des numéros de téléphone.
// Marketplace mono-pays : Cameroun (+237). Numéros mobiles = 9 chiffres commençant par 6.

export interface Country {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  dialCode: string; // ex: "+237"
  flag: string; // emoji drapeau
  nationalLength: number; // nombre de chiffres du numéro national
}

export const CAMEROON: Country = {
  code: "CM",
  name: "Cameroun",
  dialCode: "+237",
  flag: "🇨🇲",
  nationalLength: 9,
};

export const DEFAULT_COUNTRY = CAMEROON;

export interface Operator {
  name: string;
  // Plages sur les 3 premiers chiffres du numéro national (ex: 650 -> 654).
  ranges: Array<[number, number]>;
}

// Plan de numérotation mobile camerounais (numéros à 9 chiffres, préfixe "6").
// Sources : plans MTN / Orange / Nexttel (Viettel) / Camtel.
export const CAMEROON_OPERATORS: Operator[] = [
  { name: "MTN", ranges: [[650, 654], [670, 679], [680, 684]] },
  { name: "Orange", ranges: [[655, 659], [685, 689], [690, 699]] },
  { name: "Nexttel", ranges: [[660, 669]] },
  { name: "Camtel", ranges: [[620, 621]] },
];

/** Retire tout sauf les chiffres. */
export function digitsOnly(value: string): string {
  return (value || "").replace(/\D/g, "");
}

/**
 * Extrait le numéro national (9 chiffres) à partir d'une saisie libre pouvant
 * contenir l'indicatif ("+237", "237", espaces, etc.).
 */
export function toNationalNumber(value: string, country: Country = DEFAULT_COUNTRY): string {
  let digits = digitsOnly(value);
  const dial = country.dialCode.replace(/\D/g, ""); // "237"
  if (digits.startsWith(dial)) {
    digits = digits.slice(dial.length);
  }
  return digits.slice(0, country.nationalLength);
}

/** Détecte l'opérateur d'un numéro national camerounais, ou null. */
export function detectOperator(national: string): Operator | null {
  const digits = digitsOnly(national);
  if (digits.length < 3) return null;
  const prefix = parseInt(digits.slice(0, 3), 10);
  return (
    CAMEROON_OPERATORS.find((op) => op.ranges.some(([min, max]) => prefix >= min && prefix <= max)) ??
    null
  );
}

/**
 * Valide un numéro national camerounais.
 * - Mobile (commence par 6) : doit avoir 9 chiffres ET tomber dans une plage opérateur connue.
 * - Fixe (commence par 2) : accepté si 9 chiffres.
 */
export function isValidNationalNumber(national: string, country: Country = DEFAULT_COUNTRY): boolean {
  const digits = digitsOnly(national);
  if (digits.length !== country.nationalLength) return false;
  if (country.code !== "CM") return true; // autres pays : validation longueur seule
  if (digits.startsWith("6")) return detectOperator(digits) !== null;
  if (digits.startsWith("2")) return true; // ligne fixe
  return false;
}

/** Formatte un numéro national en groupes lisibles : "6XX XX XX XX". */
export function formatNational(national: string): string {
  const d = digitsOnly(national);
  if (d.length <= 3) return d;
  const parts = [d.slice(0, 3)];
  for (let i = 3; i < d.length; i += 2) {
    parts.push(d.slice(i, i + 2));
  }
  return parts.join(" ");
}

/** Renvoie la valeur E.164 ("+237XXXXXXXXX") si un numéro national est présent, sinon "". */
export function toE164(national: string, country: Country = DEFAULT_COUNTRY): string {
  const d = digitsOnly(national);
  return d ? `${country.dialCode}${d}` : "";
}
