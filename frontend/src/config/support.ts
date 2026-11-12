// frontend/src/config/support.ts
// Numéro WhatsApp du support BelivaY. DEV-SRV-01, règle R5 : « aucune adresse écrite dans le code, tout passe par la
// configuration ». Il se règle à la construction (VITE_SUPPORT_WHATSAPP, chiffres seuls, indicatif compris :
// 2376XXXXXXXX) ; il était recopié dans six écrans, et la page Contact affichait un faux numéro.

export const SUPPORT_WHATSAPP = (import.meta.env.VITE_SUPPORT_WHATSAPP ?? '').replace(/\D/g, '');

/** Lien wa.me vers le support (avec un message prérempli) ; la page Contact tant que le numéro n'est pas configuré. */
export function lienSupportWhatsApp(message?: string): string {
  if (!SUPPORT_WHATSAPP) return '/contact';
  return `https://wa.me/${SUPPORT_WHATSAPP}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

/** « +237 689 00 28 12 » pour l'affichage ; vide tant que le numéro n'est pas configuré. */
export function numeroSupportAffiche(): string {
  const m = /^237(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(SUPPORT_WHATSAPP);
  return m ? `+237 ${m[1]}${m[2]} ${m[3]} ${m[4]} ${m[5]}` : SUPPORT_WHATSAPP ? `+${SUPPORT_WHATSAPP}` : '';
}
