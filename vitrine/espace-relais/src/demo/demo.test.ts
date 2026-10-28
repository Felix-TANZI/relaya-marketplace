// Cohérence du jeu d'essai du relais (mardi 13 octobre 2026, 14 h 05) : badges = vrais comptes, places occupées = somme
// des places, caisse = somme des encaissements, garde calculée, et un retrait complet de bout en bout.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { Origine } from '../donnees/communs'
import { REFERENCE } from './horloge'

let n = 0
const o = (): Origine => ({ cle: `essai-${++n}`, heure: Date.now(), position: null })

describe('jeu d’essai du point relais', async () => {
  beforeAll(() => void vi.setSystemTime(REFERENCE))
  vi.setSystemTime(REFERENCE)
  const { sourceDemo: s } = await import('./source-demo')
  const { codeDemo, tousLesColis } = await import('./colis')

  it('en-tête et badges : vrais comptes du modèle central', async () => {
    const x = await s.session.session()
    expect(x.membre?.prenom).toBe('Rose')
    expect(x.relais).toMatchObject({ nom: 'Relais Bastos Carrefour', ouvertMaintenant: true, fermeA: '19:00', placesOccupees: 35, placesDeclarees: 60, sature: false, trust: 78, palier: 'Confirmé' })
    expect(x.badges).toMatchObject({ reception: 10, stock: 23, departs: 4 })
  })

  it('garde : J1 offert, tranches de 24 h depuis l’arrivée (R37), dernier jour, à renvoyer', async () => {
    const st = await s.stock.stock('tous')
    const c = (id: string) => st.colis.find((x) => x.id === id)!
    expect(c('BLV-00006-1').garde).toMatchObject({ rang: 1, gratuit: true, du: 0 })
    expect(c('BLV-00036-1').garde).toMatchObject({ j1: '2026-10-11', rang: 3, du: 200 }) // arrivé samedi 10 à 18 h 50 : 67 h plus tard, jour 3
    expect(c('BLV-00041-1').garde).toMatchObject({ rang: 5, du: 500 })
    expect(c('BLV-00044-1').etat).toBe('dernier_jour')
    expect(c('BLV-00044-1').garde?.du).toBe(2_000)
    expect(c('BLV-00003-1').etat).toBe('a_renvoyer')
    expect(c('BLV-00043-1')).toMatchObject({ etat: 'en_constat' })
    expect(c('BLV-00048-1').garde?.j1).toBeNull() // groupe incomplet : pas de garde
    expect(st.compteurs).toMatchObject({ dernier_jour: 2, a_faire_partir: 4, constats: 1, groupage: 1, retours: 2 })
  })

  it('caisse du jour = somme des espèces de garde encaissées au premier retrait de chaque groupe', async () => {
    const a = await s.argent.argent()
    expect(a.caisse.total).toBe(5_300) // R36, R37 : la garde de chaque colis à l'heure de l'encaissement (BLV-00051 : deux colis)
    expect(a.caisse.total).toBe(a.caisse.encaissements.reduce((x, e) => x + e.montant, 0))
    expect(a.prochain.date).toBe(Date.UTC(2026, 9, 16, 11, 0)) // vendredi 16 octobre, 12 h à Yaoundé
  })

  it('retrait de bout en bout : code, espèces, contrôle, photo, PIN ; ni code ni nom complet exposés', async () => {
    const v = await s.retrait.verifierCode({ methode: 'code', valeur: codeDemo('BLV-00041-1') }, null, o())
    expect(v.ok).toBe(true)
    if (!v.ok) return
    expect(v.remise.client.prenomInitiale).toBe('Estelle M.')
    expect(v.remise.garde.du).toBe(500)
    const id = v.remise.id
    expect(await s.retrait.poserPreuve(id, { photo: 'ph', porteur: 'client', nomPorteur: null, pieceVerifiee: false }, o())).toEqual({ ok: true })
    expect(await s.retrait.remettre(id, '240913', o())).toEqual({ ok: false, raison: 'encaissement_non_confirme' })
    expect(await s.retrait.confirmerEncaissement(id, 1_000, o())).toEqual({ ok: true, monnaie: 500 })
    await s.retrait.nePasOuvrir(id, o())
    expect((await s.retrait.remettre(id, '240913', o())).ok).toBe(true)
    expect(tousLesColis().find((c) => c.id === 'BLV-00041-1')?.etat).toBe('remis')
    expect((await s.argent.argent()).caisse.total).toBe(5_800)
    const json = JSON.stringify(await s.stock.stock('tous'))
    expect(json).not.toContain(codeDemo('BLV-00006-1'))
    expect(json).not.toMatch(/"(client|telephone|adresse|valeur)"/)
  })

  it('réception : code de dépôt, résultats, photo du lot, PIN ; emplacements attribués', async () => {
    const r = await s.reception.verifierCodeDepot('418306', o())
    expect(r).toEqual({ ok: true, lot: 'PQ-Z1-261013-003' })
    for (const id of ['BLV-00008-1', 'BLV-00009-1', 'BLV-00011-1']) expect((await s.reception.resultat('PQ-Z1-261013-003', id, { resultat: 'ok', scelle: 'intact', photos: [], note: null, motif: null }, o())).ok).toBe(true)
    expect((await s.reception.resultat('PQ-Z1-261013-003', 'BLV-00014-1', { resultat: 'reserve', scelle: 'intact', photos: [], note: 'coin', motif: null }, o())).ok).toBe(false)
    expect((await s.reception.resultat('PQ-Z1-261013-003', 'BLV-00014-1', { resultat: 'reserve', scelle: 'intact', photos: ['p'], note: 'coin', motif: null }, o())).ok).toBe(true)
    const val = await s.reception.validerLot('PQ-Z1-261013-003', 'ph-lot', '240913', o())
    expect(val.ok && Object.values(val.emplacements).every((e) => e !== null)).toBe(true)
    expect((await s.session.session()).relais?.placesOccupees).toBe(35 - 2 + 6) // BLV-00041-1 remis, lot de 6 places
  })

  it('confidentialité (PR-RC-09, DRO-03) : aucune part du relais ni paiement de BelivaY ne part vers l’employé', async () => {
    const { etatSession } = await import('./session')
    const gerant = JSON.stringify(await s.stock.stock('tous'))
    expect(gerant).toMatch(/"partRelais":\d/)
    etatSession.ecrire((x) => void (x.membreId = 'm-paul'))
    try {
      const lectures = [await s.stock.stock('tous'), await s.stock.vue(), await s.stock.ficheComplete('BLV-00041-1'), await s.aujourdhui.aujourdhui(), await s.historique.historique({ periode: 'mois' }), await s.departs.departs()]
      const json = JSON.stringify(lectures)
      expect(json).not.toMatch(/"(partRelais|payeParBelivay|gainRelais|especes|caisseDuJour|remuneration)":(?!null)/)
      expect(tousLesColis().filter((c) => c.garde).every((c) => c.garde!.partRelais === null && c.garde!.payeParBelivay === null)).toBe(true)
    } finally {
      etatSession.ecrire((x) => void (x.membreId = 'm-rose'))
    }
  })
})
