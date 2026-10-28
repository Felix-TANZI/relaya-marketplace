// Mode présentation (src/demo/presentation.tsx, identique dans les cinq applications) : ce que joue le RELAIS.
// Par les mêmes fonctions que les écrans de Rose M. (code et empreintes, moteur du contrôle, PIN du membre) :
//   7  le code de dépôt de Serge A. vérifié (recalculé comme le serveur, jamais lu au journal), le colis du lot reçu
//      « scellé intact », le lot validé (photo du lot, PIN) : Serge peut confirmer ;
//   9  Carine présente son code de retrait (celui qu'elle lit dans son application), elle confirme « Tout est en
//      ordre » dans son application, photo de remise, PIN : « handover.completed », « Retirée » partout.
import type { ActeurPresentation } from './presentation'
import { PHOTO_DEMO, attendre, origineGeste, paquetTemoin, refTemoin } from './presentation'
import { codeDemo, codeRetraitDemo } from './pont'
import { maintenant } from './horloge'
import { PIN_DEMO } from './jeu-essai'
import { demoReception, etatReception } from './reception'
import { demoRetrait } from './retrait'

const o = () => origineGeste(maintenant())

async function recevoir() {
  let lot = ''
  await attendre(() => !!(lot = paquetTemoin() ?? '') && !!etatReception.lire().lots[lot], 'le lot de Serge A. n’est pas annoncé au relais')
  if (etatReception.lire().lots[lot].valideA) return
  const v = await demoReception.verifierCodeDepot(codeDemo(lot, 'depot'), o())
  if (!v.ok && v.raison !== 'deja_valide') throw new Error('code de dépôt refusé : ' + v.raison)
  const l = await demoReception.lot(lot)
  for (const c of l?.colisDuLot.filter((x) => x.etat === 'attendu') ?? []) {
    const r = await demoReception.resultat(lot, c.id, { resultat: 'ok', scelle: 'intact', photos: [], note: null, motif: null }, o())
    if (!r.ok) throw new Error('réception du colis refusée : ' + r.raison)
  }
  const r = await demoReception.validerLot(lot, PHOTO_DEMO, PIN_DEMO, o())
  if (!r.ok) throw new Error('validation du lot refusée : ' + r.raison)
}

async function remettre() {
  const ref = refTemoin()
  if (!ref) throw new Error('aucune commande témoin')
  const lot = paquetTemoin() ?? ''
  // La confirmation de Serge arrive par le pont : le code de Carine est alors envoyé, le colis remettable.
  await attendre(() => !!etatReception.lire().lots[lot]?.prevenus, 'Serge A. n’a pas encore confirmé la remise du lot')
  const v = await demoRetrait.verifierCode({ methode: 'code', valeur: codeRetraitDemo(ref) }, null, o())
  if (!v.ok) {
    if (v.raison === 'deja_remis') return
    throw new Error('code de retrait refusé : ' + v.raison)
  }
  const id = v.remise.id
  const c = await demoRetrait.inviterControle(id, o())
  if (!c.ok) throw new Error('contrôle refusé : ' + c.raison)
  await attendre(async () => (await demoRetrait.remise(id))?.controle === 'en_ordre', 'Carine n’a pas confirmé « Tout est en ordre »')
  const p = await demoRetrait.poserPreuve(id, { photo: PHOTO_DEMO, porteur: 'client', nomPorteur: null, pieceVerifiee: true }, o())
  if (!p.ok) throw new Error('preuve refusée : ' + p.raison)
  const r = await demoRetrait.remettre(id, PIN_DEMO, o())
  if (!r.ok) throw new Error('remise refusée : ' + r.raison)
}

export const ACTEUR: ActeurPresentation = {
  async executer(n) {
    if (n === 7) await recevoir()
    else if (n === 9) await remettre()
  },
  synchroniser() {
    etatReception.lire()
  },
  ecran(n, faite) {
    const lot = paquetTemoin()
    if (n <= 5 || !lot) return '/'
    if (n <= 8) return '/reception?lot=' + lot
    return faite ? '/historique' : '/retrait'
  },
}
