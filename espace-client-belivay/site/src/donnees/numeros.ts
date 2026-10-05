// Numéros camerounais (+237) : 9 chiffres commençant par 6 pour un mobile. L'opérateur se lit au préfixe
// (CCO-14) ; seuls MTN et Orange ont un Mobile Money accepté par BelivaY (CCO-14, CIN-30 : le numéro du compte
// sert au débit). Plan de numérotation public (préfixes de l'ART) ; le serveur fait foi et confirme l'opérateur
// à l'envoi du code.
export type OperateurMobile = 'MTN' | 'Orange' | 'Nexttel' | 'Camtel'

export const chiffres = (v: string) => v.replace(/\D/g, '').replace(/^237(?=\d{9}$)/, '')

export function operateur(numero: string): OperateurMobile | null {
  const n = chiffres(numero)
  if (!/^6\d{8}$/.test(n)) return null
  if (/^6(5[0-4]|7\d|8[0-4])/.test(n)) return 'MTN'
  if (/^6(5[5-9]|9\d|8[5-9])/.test(n)) return 'Orange'
  if (/^66/.test(n)) return 'Nexttel'
  if (/^62/.test(n)) return 'Camtel'
  return null
}

// « 6 55 21 47 08 » pendant la saisie ; « 6 55 ·· ·· 08 » une fois enregistré (CCO-06 : masqué au milieu).
export const espacer = (numero: string) => {
  const n = chiffres(numero).slice(0, 9)
  return [n.slice(0, 1), n.slice(1, 3), n.slice(3, 5), n.slice(5, 7), n.slice(7, 9)].filter(Boolean).join(' ')
}
export const masquer = (numero: string) => {
  const n = chiffres(numero)
  return `${n.slice(0, 1)} ${n.slice(1, 3)} ·· ·· ${n.slice(7, 9)}`
}

// Erreur de saisie d'un numéro Mobile Money (null si le numéro est bon).
export function erreurNumero(v: string): string | null {
  const n = chiffres(v)
  if (!n) return 'Écris ton numéro : 9 chiffres, il commence par 6.'
  if (!/^6\d{8}$/.test(n)) return 'Un numéro mobile du Cameroun a 9 chiffres et commence par 6.'
  const o = operateur(n)
  if (o !== 'MTN' && o !== 'Orange') return 'Ce numéro n’est ni MTN ni Orange : Mobile Money n’y est pas pris en charge.'
  return null
}

export const nomMoMo = (o: OperateurMobile | null) => (o === 'MTN' ? 'MTN MoMo' : o === 'Orange' ? 'Orange Money' : '')
