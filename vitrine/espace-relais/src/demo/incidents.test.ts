// Règles PR-07 sur la démonstration (mardi 13 octobre 2026, 14 h 05) : constats (ARL-17, photos, PIN, garde
// suspendue, délais DP-35), retours (LIT-05, scellé, photos, hors capacité), contestation (une fois, gérant), fermetures
// (FER-01 à FER-07, ARL-20) et historique (aucun montant ni export pour l'employé, HIS-03).
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { HEURE } from '../calculs/temps'
import type { Origine } from '../donnees/communs'
import { REFERENCE } from './horloge'

let n = 0
const o = (): Origine => ({ cle: `pr07-${++n}`, heure: Date.now(), position: null })
const PIN = '240913'

describe('PR-07 · incidents, fermetures, historique', async () => {
  beforeAll(() => void vi.setSystemTime(REFERENCE))
  vi.setSystemTime(REFERENCE)
  const { sourceDemo: s } = await import('./source-demo')
  const { tousLesColis } = await import('./colis')
  const { etatSession } = await import('./session')
  const { REGLES: R } = await import('../calculs/regles-incidents')
  const enGerant = () => etatSession.ecrire((x) => void (x.membreId = 'm-rose'))
  const enEmploye = () => etatSession.ecrire((x) => void (x.membreId = 'm-paul'))

  it('dossiers du jeu : étape et échéance calculées depuis la réception (DP-35)', async () => {
    const l = await s.incidents.dossiers()
    const cs = l.find((d) => d.id === 'CS-2207')!
    expect(cs.etape).toBe('reponse_vendeur')
    expect(cs.echeance).toBe(cs.recuServeurA! + R.vendeurH * HEURE)
    expect(cs.gardeSuspendue).toBe(true)
    expect(l.find((d) => d.litige === 'LT-0874')?.etape).toBe('clos')
    expect(l.find((d) => d.litige === 'LT-0874')?.filFerme).toBe(true)
  })

  it('constat : motif, photos et PIN exigés ; colis remis refusé ; garde suspendue après envoi', async () => {
    const photos = Array.from({ length: R.photosConstat }, (_, k) => 'ph' + k)
    expect((await s.incidents.colisPourConstat('BLV-00049-1'))?.raison).toBe('remis')
    expect((await s.incidents.colisPourConstat('blv-00042-1'))?.constatable).toBe(true)
    expect(await s.incidents.ouvrirConstat({ colis: 'BLV-00042-1', motif: 'abime', photos: photos.slice(1), note: null, devantLeClient: true, pin: PIN }, o())).toEqual({ ok: false, raison: 'photo_manquante' })
    expect(await s.incidents.ouvrirConstat({ colis: 'BLV-00042-1', motif: 'manquant', photos, note: null, devantLeClient: true, pin: PIN }, o())).toEqual({ ok: false, raison: 'motif_requis' })
    expect(await s.incidents.ouvrirConstat({ colis: 'BLV-00049-1', motif: 'abime', photos, note: null, devantLeClient: true, pin: PIN }, o())).toEqual({ ok: false, raison: 'non_constatable' })
    expect(await s.incidents.ouvrirConstat({ colis: 'BLV-00042-1', motif: 'abime', photos, note: null, devantLeClient: true, pin: '000000' }, o())).toEqual({ ok: false, raison: 'pin_faux' })
    const x = o()
    const r = await s.incidents.ouvrirConstat({ colis: 'BLV-00042-1', motif: 'abime', photos, note: 'coin écrasé', devantLeClient: true, pin: PIN }, x)
    expect(r.ok).toBe(true)
    // Rejeu de la même clé (file hors connexion) : aucun second dossier.
    expect(await s.incidents.ouvrirConstat({ colis: 'BLV-00042-1', motif: 'abime', photos, note: 'coin écrasé', devantLeClient: true, pin: PIN }, x)).toEqual(r)
    const c = tousLesColis().find((y) => y.id === 'BLV-00042-1')!
    expect(c.etat).toBe('en_constat')
    expect(c.garde?.suspendue).toBe(true)
    expect(c.preuves.some((p) => p.nature === 'deballage')).toBe(true)
    const d = (await s.incidents.dossiers()).filter((y) => y.colis === 'BLV-00042-1')
    expect(d).toHaveLength(1)
    expect(d[0].etape).toBe('reponse_vendeur')
  })

  it('retour : non validé refusé ; scellé, photos et PIN ; hors capacité', async () => {
    expect(await s.incidents.verifierRetour('RT-0421')).toEqual({ ok: false, raison: 'non_valide' })
    expect(await s.incidents.verifierRetour('RT-0415')).toEqual({ ok: false, raison: 'deja_depose' })
    const v = await s.incidents.verifierRetour('rt-0418')
    expect(v.ok).toBe(true)
    const avant = (await s.session.session()).relais!.placesOccupees
    expect(await s.incidents.deposerRetour({ reference: 'RT-0418', scelle: 'intact', photos: ['a'], pin: PIN }, o())).toEqual({ ok: false, raison: 'photo_manquante' })
    const r = await s.incidents.deposerRetour({ reference: 'RT-0418', scelle: 'intact', photos: Array(R.photosRetour).fill('p'), pin: PIN }, o())
    expect(r.ok).toBe(true)
    expect(tousLesColis().find((c) => c.retour?.reference === 'RT-0418')?.etat).toBe('retour_depose')
    expect((await s.session.session()).relais!.placesOccupees).toBe(avant) // CAP-08 : jamais compté dans les places
  })

  it('contestation : gérant seulement, une fois ; retenue cachée à l’employé', async () => {
    enEmploye()
    expect((await s.incidents.dossier('LT-0902'))?.decision?.retenue).toBeNull()
    expect(await s.incidents.contester('CS-2194', 'photo prise', o())).toEqual({ ok: false, raison: 'droit_refuse' })
    enGerant()
    expect((await s.incidents.dossier('LT-0902'))?.decision?.retenue).toBeGreaterThan(0)
    expect(await s.incidents.contester('CS-2194', '', o())).toEqual({ ok: false, raison: 'vide' })
    expect(await s.incidents.contester('CS-2194', 'La photo de remise existe.', o())).toEqual({ ok: true })
    expect(await s.incidents.contester('CS-2194', 'encore', o())).toEqual({ ok: false, raison: 'deja_contestee' })
    expect(await s.incidents.contester('CS-2161', 'non', o())).toEqual({ ok: false, raison: 'non_contestable' })
  })

  it('fermetures : préavis du congé, droits de l’employé, durée et conséquence (ARL-20)', async () => {
    enGerant()
    const auj = '2026-10-13'
    expect((await s.fermeture.apercu({ type: 'programmee', motif: 'conge', du: '2026-10-14', au: '2026-10-14' })).refus).toBe('preavis_insuffisant')
    expect((await s.fermeture.apercu({ type: 'imprevue_jour', motif: 'conge', du: auj, au: auj })).refus).toBe('motif_interdit')
    const court = await s.fermeture.apercu({ type: 'imprevue_jour', motif: 'maladie', du: auj, au: auj })
    expect(court).toMatchObject({ duree: 'moins_24h', transfert: false, refus: null })
    expect(court.justificatifAvant).toBe(Date.now() + R.justifMaladieH * HEURE)
    const long = await s.fermeture.apercu({ type: 'programmee', motif: 'conge', du: '2026-10-26', au: '2026-10-31' })
    expect(long).toMatchObject({ duree: 'plus_de_trois_jours', transfert: true, masque: true, sansNouveauxColisDes: '2026-10-25', refus: null })
    expect((await s.fermeture.apercu({ type: 'programmee', motif: 'conge', du: '2026-10-24', au: '2026-10-24' })).refus).toBe('chevauchement')
    enEmploye()
    expect((await s.fermeture.declarer({ type: 'programmee', motif: 'maladie', du: '2026-10-20', au: '2026-10-21' }, o())).ok).toBe(false)
    expect(await s.fermeture.declarer({ type: 'imprevue_jour', motif: 'maladie', du: auj, au: auj }, o())).toEqual({ ok: false, raison: 'droit_refuse' }) // Paul n'a pas le droit du jour
    enGerant()
    const d = await s.fermeture.declarer({ type: 'imprevue_jour', motif: 'maladie', du: auj, au: auj }, o())
    expect(d.ok).toBe(true)
    expect((await s.session.session()).relais?.ouvertMaintenant).toBe(false)
    if (d.ok) expect((await s.fermeture.rouvrir(d.id, o())).ok).toBe(true)
    expect((await s.session.session()).relais?.ouvertMaintenant).toBe(true)
  })

  it('historique : compteurs de la période ; aucun montant ni export pour l’employé', async () => {
    enGerant()
    const g = await s.historique.historique({ periode: 'aujourdhui' })
    expect(g.compteurs.remis).toBe(g.operations.filter((x) => x.type === 'remise').length)
    expect(g.operations.some((x) => x.gainRelais !== null)).toBe(true)
    expect((await s.historique.exporter({ periode: 'semaine' })).ok).toBe(true)
    expect((await s.historique.historique({ periode: 'aujourdhui', recherche: 'BLV-00049-1' })).colisExact).toBe('BLV-00049-1')
    enEmploye()
    const e = await s.historique.historique({ periode: 'mois' })
    expect(e.operations.every((x) => x.gainRelais === null && x.especes === null)).toBe(true)
    expect(await s.historique.exporter({ periode: 'mois' })).toEqual({ ok: false, raison: 'droit_refuse' })
    enGerant()
  })
})
