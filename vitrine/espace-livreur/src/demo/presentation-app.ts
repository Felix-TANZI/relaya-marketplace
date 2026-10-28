// Mode présentation (src/demo/presentation.tsx, identique dans les cinq applications) : ce que joue le LIVREUR.
// La journée de Serge A. est celle sans autre paquet (scenario.ts : « aucun_paquet » pendant une présentation), si
// bien que le paquet de la commande témoin est le premier de sa tournée. Par les mêmes fonctions que ses écrans :
//   4  il démarre le paquet affecté par Yafé Express et arrive chez Boutique B (« Votre livreur est là ») ;
//   5  contrôle C1 (six cases, photo), étiquette de son rouleau, emballage et scellé (photo), code de remise du
//      vendeur (recalculé comme le serveur) : « parcel.collected », la garde passe à l'entreprise ;
//   6  il arrive au Relais Bastos Carrefour avec son code de dépôt (le relais l'a vu en approche) ;
//   8  le lot validé par Rose M. (photo, PIN), il confirme la remise : la garde passe au relais.
import type { ActeurPresentation } from './presentation'
import { PHOTO_DEMO, attendre, origineGeste, paquetTemoin } from './presentation'
import { maintenant } from './horloge'
import { demoPaquets, etatPaquets } from './paquets'
import { demoRamassage } from './ramassage'
import { demoRemises } from './remises'
import { arretDe, demoTournee, etatTournee } from './tournee'

const o = () => origineGeste(maintenant())
const paquet = async () => {
  let id = ''
  await attendre(async () => !!(id = paquetTemoin() ?? '') && !!(await demoPaquets.paquet(id)), 'le paquet de la commande témoin n’est pas affecté à Serge A.')
  return id
}
async function arriver(arretId: string) {
  if (arretDe(arretId)?.phase === 'sur_place' || ['fait', 'echec', 'dissocie'].includes(arretDe(arretId)?.etat ?? '')) return
  await attendre(() => etatTournee.lire().enCours === arretId, 'l’arrêt ' + arretId + ' n’est pas le suivant de la tournée')
  const r = await demoTournee.arriver(arretId, o(), true)
  if (!r.ok) throw new Error('arrivée refusée : ' + r.raison)
}

async function demarrer() {
  const id = await paquet()
  const p = await demoPaquets.paquet(id)
  if (p && (p.etat === 'affecte' || p.etat === 'modifie')) {
    if (p.changements) await demoPaquets.marquerRelu(id, p.version)
    const r = await demoPaquets.demarrer(id, o())
    if (!r.ok && r.raison !== 'deja_demarre') throw new Error('départ refusé : ' + r.raison)
  }
  await arriver(id + '#0')
}

async function ramasser() {
  const id = await paquet()
  const arret = id + '#0'
  if (arretDe(arret)?.etat === 'fait') return
  await arriver(arret)
  const r = await demoRamassage.ramassage(arret)
  if (!r) throw new Error('le ramassage chez Boutique B est introuvable')
  for (const c of r.colis.filter((x) => x.etat !== 'refuse' && x.etat !== 'retire')) {
    if (c.etat === 'attendu') {
      const k = await demoRamassage.controler(c.colisId, { cases: [true, true, true, true, true, true], boiteScellee: false, photo1: PHOTO_DEMO, classeDepassee: null, serieIllisible: false }, o())
      if (!k.ok) throw new Error('contrôle refusé : ' + k.raison)
    }
    let numero = c.etiquette
    for (let n = r.plageEtiquettes.de; !numero && n <= r.plageEtiquettes.a; n++) {
      const l = await demoRamassage.lierEtiquette(c.colisId, String(n).padStart(4, '0'), o())
      if (l.ok) numero = l.numero
      else if (l.raison !== 'deja_liee') throw new Error('étiquette refusée : ' + l.raison)
    }
    if (!numero) throw new Error('plus d’étiquette libre dans le rouleau')
    if (c.etat !== 'emballe' && c.etat !== 'remis') {
      const e = await demoRamassage.emballer(c.colisId, { format: c.formatConseille, motifFormat: null, scelle: [true, true, true], photo2: PHOTO_DEMO }, o())
      if (!e.ok) throw new Error('emballage refusé : ' + e.raison)
    }
  }
  const v = await demoRamassage.validerCode(arret, r.codeDemo ?? '', o())
  if (!v.ok) throw new Error('code de remise refusé : ' + v.raison)
}

async function confirmerAuRelais() {
  const id = await paquet()
  const arret = id + '#1'
  if (arretDe(arret)?.etat === 'fait') return
  await arriver(arret)
  // Le lot validé par Rose M. arrive par le pont (photo du lot, PIN) : la confirmation l'attend.
  await attendre(async () => !(await demoRemises.depotRelais(arret))?.attendValidation && !!(await demoRemises.depotRelais(arret))?.scanneA, 'le relais n’a pas encore validé le lot')
  const r = await demoRemises.confirmerDepot(arret, o())
  if (!r.ok) throw new Error('confirmation refusée : ' + r.raison)
}

export const ACTEUR: ActeurPresentation = {
  async executer(n) {
    if (n === 4) await demarrer()
    else if (n === 5) await ramasser()
    else if (n === 6) await arriver((await paquet()) + '#1')
    else if (n === 8) await confirmerAuRelais()
  },
  synchroniser() {
    etatPaquets.lire()
  },
  ecran(n, faite) {
    const id = paquetTemoin()
    if (n <= 2 || !id) return '/'
    if (n === 3) return '/paquet?id=' + id
    if (n === 6) return faite ? '/depot-relais' : '/tournee'
    if (n === 7) return '/depot-relais'
    if (n === 8) return faite ? '/tournee' : '/depot-relais'
    return n === 9 ? '/' : '/tournee'
  },
}
