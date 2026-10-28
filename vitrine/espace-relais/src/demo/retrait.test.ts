// Règles du retrait au comptoir (PR-05), sur la démonstration du « serveur » : code par colis (ARL-01), garde une fois
// par groupe (ARL-02), monnaie (ARL-04), « Tout est en ordre » par le client (DP-28), ne pas ouvrir (ARL-36), photo
// (D15), porteur (RET-06, RET-07), PIN faux pendant une remise (ARL-42, PR-RC-31), codes faux (DP-26), paiement au
// comptoir (v6 D14 : jamais d'espèces, code débloqué au paiement), refus sans motif (DP-24), rejeu (PR-RC-30).
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Origine } from '../donnees/communs'
import { REFERENCE } from './horloge'

let n = 0
const o = (): Origine => ({ cle: `r-${++n}-${Math.random()}`, heure: Date.now(), position: null })
const PIN = '240913'

describe('retrait au comptoir', async () => {
  vi.setSystemTime(REFERENCE)
  const { sourceDemo: s } = await import('./source-demo')
  const { codeDemo, unColis, etatColis } = await import('./colis')
  const { etatRetrait } = await import('./retrait')
  const { etatSession } = await import('./session')
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] })
    vi.setSystemTime(REFERENCE)
    for (const m of [etatColis, etatRetrait, etatSession]) m.reinitialiser()
  })
  const code = (id: string) => s.retrait.verifierCode({ methode: 'code', valeur: codeDemo(id) }, null, o())

  it('un code par colis : les autres colis du client sont montrés, chacun exige son code (ARL-01)', async () => {
    const v = await code('BLV-00007-1')
    expect(v.ok).toBe(true)
    if (!v.ok) return
    expect(v.remise.client.prenomInitiale).toBe('Hervé K.')
    expect(v.remise.autresColis.map((c) => c.id)).toEqual(['BLV-00007-2'])
    const w = await s.retrait.verifierCode({ methode: 'qr', valeur: 'BLV1.' + codeDemo('BLV-00007-2') }, v.remise.id, o())
    expect(w.ok && w.remise.colis.map((c) => c.id)).toEqual(['BLV-00007-1', 'BLV-00007-2'])
    expect(w.ok && w.remise.autresColis).toEqual([])
  })

  it('3 codes faux sur la remise d’un client : ses autres colis bloqués 24 h (DP-26)', async () => {
    const v = await code('BLV-00007-1')
    if (!v.ok) throw new Error()
    const faux = () => s.retrait.verifierCode({ methode: 'code', valeur: '000000' }, v.remise.id, o())
    expect(await faux()).toMatchObject({ ok: false, raison: 'code_faux', detail: JSON.stringify({ essaisRestants: 2 }) })
    expect(await faux()).toMatchObject({ raison: 'code_faux' })
    expect(await faux()).toMatchObject({ raison: 'bloque' })
    expect(unColis('BLV-00007-2')?.code.bloqueJusqua).toBe(REFERENCE + 24 * 3600_000)
    expect(await code('BLV-00007-2')).toMatchObject({ ok: false, raison: 'bloque' })
  })

  it('codes faux sans client identifié : comptés au guichet, puis « trop de codes »', async () => {
    const faux = () => s.retrait.verifierCode({ methode: 'code', valeur: '111111' }, null, o())
    await faux()
    await faux()
    expect(await faux()).toMatchObject({ raison: 'trop_de_codes' })
  })

  it('non remettable, déjà remis, étiquette, autre relais', async () => {
    expect(await code('BLV-00043-1')).toMatchObject({ ok: false, raison: 'non_remettable' })
    expect(await code('BLV-00049-1')).toMatchObject({ ok: false, raison: 'deja_remis' })
    expect(await s.retrait.verifierCode({ methode: 'qr', valeur: 'BLV-00006-1' }, null, o())).toMatchObject({ raison: 'etiquette' })
    expect(await s.retrait.verifierCode({ methode: 'qr', valeur: 'BLV-40412-1' }, null, o())).toMatchObject({ raison: 'pas_au_relais' })
  })

  it('garde en espèces : montant reçu insuffisant refusé, monnaie rendue ; remise bloquée sans encaissement (PR-RC-01)', async () => {
    const v = await code('BLV-00037-1')
    if (!v.ok) throw new Error()
    const id = v.remise.id
    expect(v.remise.garde.du).toBeGreaterThan(0)
    expect(v.remise.garde.du % 100).toBe(0)
    expect(await s.retrait.confirmerEncaissement(id, v.remise.garde.du - 100, o())).toMatchObject({ ok: false, raison: 'montant_insuffisant' })
    await s.retrait.nePasOuvrir(id, o())
    await s.retrait.poserPreuve(id, { photo: 'ph', porteur: 'client', nomPorteur: null, pieceVerifiee: false }, o())
    expect(await s.retrait.remettre(id, PIN, o())).toMatchObject({ ok: false, raison: 'encaissement_non_confirme' })
    expect(await s.retrait.confirmerEncaissement(id, 1_000, o())).toEqual({ ok: true, monnaie: 1_000 - v.remise.garde.du })
    const r = await s.retrait.remettre(id, PIN, o())
    expect(r.ok && r.remise.remiseA).toBeTruthy()
    expect(r.ok && r.remise.gain?.colis).toBeGreaterThan(0)
    expect(unColis('BLV-00037-1')?.etat).toBe('remis')
  })

  it('garde une seule fois par groupe : le second colis du groupe ne doit plus rien (ARL-02)', async () => {
    const v = await code('BLV-00006-1')
    if (!v.ok) throw new Error()
    expect(v.remise.garde.du).toBe(0) // 1er jour offert
    await s.retrait.confirmerEncaissement(v.remise.id, null, o())
    await s.retrait.nePasOuvrir(v.remise.id, o())
    await s.retrait.poserPreuve(v.remise.id, { photo: 'ph', porteur: 'client', nomPorteur: null, pieceVerifiee: false }, o())
    expect((await s.retrait.remettre(v.remise.id, PIN, o())).ok).toBe(true)
    const w = await code('BLV-00006-2')
    expect(w.ok && w.remise.garde.dejaReglee).toBe(true)
  })

  it('« Tout est en ordre » : seule l’application du client le confirme (DP-28)', async () => {
    const v = await code('BLV-00033-1')
    if (!v.ok) throw new Error()
    await s.retrait.inviterControle(v.remise.id, o())
    expect((await s.retrait.remise(v.remise.id))?.controle).toBe('attente_client')
    await vi.advanceTimersByTimeAsync(5_000)
    expect((await s.retrait.remise(v.remise.id))?.controle).toBe('en_ordre')
  })

  it('preuve : photo obligatoire ; une autre personne (R89) : nom ET numéro, ni pièce ni plafond de valeur', async () => {
    const v = await code('BLV-00033-1')
    if (!v.ok) throw new Error()
    expect(await s.retrait.poserPreuve(v.remise.id, { photo: '', porteur: 'client', nomPorteur: null, pieceVerifiee: false }, o())).toMatchObject({ raison: 'photo_manquante' })
    expect(await s.retrait.poserPreuve(v.remise.id, { photo: 'ph', porteur: 'tiers', nomPorteur: ' ', telephonePorteur: '677123456', pieceVerifiee: false }, o())).toMatchObject({ raison: 'porteur_requis' })
    expect(await s.retrait.poserPreuve(v.remise.id, { photo: 'ph', porteur: 'tiers', nomPorteur: 'Aïcha N.', telephonePorteur: '', pieceVerifiee: false }, o())).toMatchObject({ raison: 'porteur_requis' })
    expect(v.remise.pieceExigee).toBe(false)
    expect(v.remise.colisDeValeur).toBe(false)
    expect(await s.retrait.poserPreuve(v.remise.id, { photo: 'ph', porteur: 'tiers', nomPorteur: 'Aïcha N.', telephonePorteur: '677123456', pieceVerifiee: false }, o())).toEqual({ ok: true })
  })

  it('3 PIN faux pendant une remise : annulée, colis en stock, espèces rendues (ARL-42, PR-RC-31)', async () => {
    const v = await code('BLV-00037-1')
    if (!v.ok) throw new Error()
    const id = v.remise.id
    await s.retrait.confirmerEncaissement(id, null, o())
    await s.retrait.nePasOuvrir(id, o())
    await s.retrait.poserPreuve(id, { photo: 'ph', porteur: 'client', nomPorteur: null, pieceVerifiee: false }, o())
    expect(await s.retrait.remettre(id, '000000', o())).toMatchObject({ raison: 'pin_faux', detail: JSON.stringify({ essaisRestants: 2 }) })
    expect(await s.retrait.remettre(id, '000000', o())).toMatchObject({ raison: 'pin_faux' })
    expect(await s.retrait.remettre(id, '000000', o())).toMatchObject({ raison: 'remise_annulee' })
    const r = await s.retrait.remise(id)
    expect(r?.annulee).toMatchObject({ motif: 'pin', especesRendues: v.remise.garde.du })
    expect(unColis('BLV-00037-1')?.etat).toBe('en_stock')
    expect(unColis('BLV-00037-1')?.journal.some((e) => e.action === 'especes_rendues')).toBe(true)
    expect(await s.retrait.remettre(id, PIN, o())).toMatchObject({ raison: 'remise_annulee' })
  })

  it('paiement au comptoir : recherche par référence ou numéro (jamais renvoyé), Mobile Money, code débloqué', async () => {
    expect(await s.retrait.rechercher({ telephone: '+237 691 22 03 18' })).toMatchObject({ client: { prenomInitiale: 'Franck O.' } })
    const r = await s.retrait.rechercher({ reference: 'blv-00038' })
    if (!r) throw new Error()
    expect(JSON.stringify(r)).not.toContain('691220318')
    expect(r.paiement).toMatchObject({ montant: 18_000, etat: 'a_payer' })
    expect(r.colis[0].codeVerifie).toBe(false)
    expect(await code('BLV-00038-1')).toMatchObject({ ok: false }) // code jamais envoyé avant le paiement
    await s.retrait.demanderPaiement(r.id, o())
    expect((await s.retrait.remise(r.id))?.paiement?.etat).toBe('demande_envoyee')
    await vi.advanceTimersByTimeAsync(7_000)
    expect((await s.retrait.remise(r.id))?.paiement?.etat).toBe('confirme')
    const v = await s.retrait.verifierCode({ methode: 'code', valeur: codeDemo('BLV-00038-1') }, r.id, o())
    expect(v.ok && v.remise.colis[0].codeVerifie).toBe(true)
  })

  it('refus sans motif d’une commande payable au retrait : annulée (DP-24)', async () => {
    const r = await s.retrait.rechercher({ reference: 'BLV-00032' })
    if (!r) throw new Error()
    expect(await s.retrait.refusSansMotif(r.id, PIN, o())).toEqual({ ok: true })
    expect(unColis('BLV-00032-1')?.etat).toBe('refuse_comptoir')
  })

  it('rejouée avec la même clé : une seule remise (PR-RC-30)', async () => {
    const v = await code('BLV-00006-1')
    if (!v.ok) throw new Error()
    await s.retrait.nePasOuvrir(v.remise.id, o())
    await s.retrait.poserPreuve(v.remise.id, { photo: 'ph', porteur: 'client', nomPorteur: null, pieceVerifiee: false }, o())
    const cle = o()
    await s.retrait.remettre(v.remise.id, PIN, cle)
    await s.retrait.remettre(v.remise.id, PIN, cle)
    expect(unColis('BLV-00006-1')?.journal.filter((e) => e.action === 'remettre').length).toBe(1)
  })
})
