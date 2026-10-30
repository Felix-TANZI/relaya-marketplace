// Règles des décisions encadrées (DECISIONS-ENCADREES.md) : liste de contrôle par type, lecture des preuves (qui est en
// tort, qui est disculpé), issues bloquées avec leur raison, contrôle d'une demande dans l'ordre du serveur, lots.
import { describe, expect, it } from 'vitest'
import type { DemandePoste } from '../donnees/domaines/decisions'
import { controlesLitige, issuesLitige, issuesPourAgent, lireLitige, verifierDemande, verifierLot, echantillon, type ContexteDemande, type ContexteLitige, type FaitsLitige } from './decisions'
import { PARAMETRES } from './registre'

const BASE: FaitsLitige = { mode: 'domicile', photoRamassage: true, contenuRamassage: null, emballage: true, scelle: null, photoRemise: true, codeRemise: true, distanceRemiseM: 9, heuresCoherentes: true, appels: 2, photosClient: 0, clientJoignable: true, reponseVendeur: null, retardH: null, causeRetard: null }
const etats = (f: FaitsLitige, t: Parameters<typeof controlesLitige>[0]) => Object.fromEntries(controlesLitige(t, f).map((c) => [c.id, c.etat]))
const CTX: ContexteLitige = { type: 'non_recu', montant: 23500, paye: 23970, fraisMomo: 470, commission: 1880, entreprise: 'Yafé Express', relais: null, paiement: 'Orange Money ···· 88', recours: false }
const D: DemandePoste = { issue: 'debouter', motif: 'Preuves concordantes', note: 'Photo devant la porte, code validé et position à 9 m : la remise est prouvée.', message: '' }
const AGENT = { id: 'a-clarisse', plafond: 100000, geste: 2000, tranche: true }
const contexte = (o: Partial<ContexteDemande> = {}): ContexteDemande => {
  const l = lireLitige('non_recu', etats(BASE, 'non_recu'), BASE)
  return { decide: false, enAttente: false, pasAvant: null, maintenant: 1000, auteur: null, lies: [], transmisPar: null, agent: AGENT, issues: issuesLitige(CTX, l, 5000), ambigu: l.ambigu, paye: CTX.paye, motifs: ['Preuves concordantes', 'Accord trouvé au téléphone'], ...o }
}

describe('liste de contrôle et lecture des preuves', () => {
  it('non reçu, remise prouvée : tout est ✓, le livreur est disculpé, débouter est suggéré', () => {
    const c = controlesLitige('non_recu', BASE)
    expect(c.map((x) => x.id)).toEqual(['photo_ramassage', 'photo_remise', 'code_remise', 'position_remise', 'heures', 'appels'])
    expect(c.every((x) => x.etat === 'ok')).toBe(true)
    const l = lireLitige('non_recu', etats(BASE, 'non_recu'), BASE)
    expect(l.suggestion.issue).toBe('debouter')
    expect(l.disculpes.entreprise).toMatch(/photo, code validé et position/)
  })
  it('non reçu, ni photo ni code, 1,8 km : le client a raison, l’entreprise paie, débouter est bloqué', () => {
    const f: FaitsLitige = { ...BASE, photoRemise: false, codeRemise: false, distanceRemiseM: 1800, appels: 0 }
    const c = controlesLitige('non_recu', f)
    expect(c.find((x) => x.id === 'position_remise')!.etat).toBe('ko')
    expect(c.find((x) => x.id === 'appels')!.pourquoi).toMatch(/0 appel compté sur 2/)
    const l = lireLitige('non_recu', etats(f, 'non_recu'), f)
    expect(l.suggestion).toMatchObject({ issue: 'rembourser_transporteur', payeur: 'entreprise' })
    const i = issuesLitige(CTX, l, 5000)
    expect(i.find((x) => x.id === 'debouter')).toMatchObject({ etat: 'bloquee', raison: expect.stringMatching(/^Les preuves donnent raison au client/) })
  })
  it('abîmé avec réserve du relais : l’entreprise paie, le relais est disculpé ; un doute laisse la décision au niveau supérieur', () => {
    const f: FaitsLitige = { ...BASE, mode: 'relais', scelle: 'reserve', photosClient: 1 }
    const l = lireLitige('abime', etats(f, 'abime'), f)
    expect(l.suggestion.issue).toBe('rembourser_transporteur')
    expect(issuesLitige({ ...CTX, type: 'abime', relais: 'Relais Mokolo' }, l, 5000).find((x) => x.id === 'rembourser_relais')!.etat).toBe('bloquee')
    const g: FaitsLitige = { ...BASE, mode: 'relais', scelle: 'intact', contenuRamassage: 'illisible', photosClient: 2 }
    const m = lireLitige('manquant', etats(g, 'manquant'), g)
    expect(m.ambigu).toBe(true)
    expect(m.suggestion.issue).toBeNull()
  })
  it('une issue hors de la liste du type est bloquée avec sa raison', () => {
    const l = lireLitige('retard', etats({ ...BASE, retardH: 20, causeRetard: 'entreprise' }, 'retard'), { ...BASE, retardH: 20, causeRetard: 'entreprise' })
    const i = issuesLitige({ ...CTX, type: 'retard' }, l, 2000)
    expect(i.find((x) => x.id === 'remplacer')).toMatchObject({ etat: 'bloquee', raison: 'Hors des issues de la règle pour un litige « Retard ».' })
    expect(i.find((x) => x.id === 'geste')!.fourchette).toEqual({ min: 100, max: 1880, pas: 100 })
  })
})

describe('contrôle d’une demande (ordre du serveur)', () => {
  it('permise : rien ne bloque', () => expect(verifierDemande(contexte(), D)).toEqual({ ok: true }))
  it('déjà décidé, trop tôt, auteur, lié, transmis par soi : refusé avec la raison', () => {
    expect(verifierDemande(contexte({ decide: true }), D)).toMatchObject({ ok: false, raison: 'deja_decide' })
    expect(verifierDemande(contexte({ pasAvant: 2000 }), D)).toMatchObject({ ok: false, raison: 'trop_tot' })
    expect(verifierDemande(contexte({ auteur: 'a-clarisse' }), D)).toMatchObject({ ok: false, raison: 'auteur' })
    expect(verifierDemande(contexte({ lies: ['a-clarisse'] }), D)).toMatchObject({ ok: false, raison: 'lie' })
    expect(verifierDemande(contexte({ transmisPar: 'a-clarisse' }), D)).toMatchObject({ ok: false, raison: 'auteur' })
  })
  it('imputer une partie disculpée ou sortir de la règle : impossible', () => {
    expect(verifierDemande(contexte(), { ...D, issue: 'rembourser_transporteur' })).toMatchObject({ ok: false, raison: 'disculpe' })
    expect(verifierDemande(contexte(), { ...D, issue: 'remplacer' })).toMatchObject({ ok: false, raison: 'hors_regle' })
    expect(verifierDemande(contexte(), { ...D, issue: 'inventee' })).toMatchObject({ ok: false, raison: 'hors_regle' })
  })
  it('jamais plus que le payé ; geste sous la commission ; motif de la liste et note de longueur minimale', () => {
    expect(verifierDemande(contexte(), { ...D, issue: 'geste', montant: 30000 })).toMatchObject({ ok: false, raison: 'au_dela_paye' })
    expect(verifierDemande(contexte(), { ...D, issue: 'geste', montant: 1900 })).toMatchObject({ ok: false, raison: 'geste_commission' })
    expect(verifierDemande(contexte(), { ...D, motif: 'Autre' })).toMatchObject({ ok: false, raison: 'motif' })
    expect(verifierDemande(contexte(), { ...D, note: 'court' })).toMatchObject({ ok: false, raison: 'note_courte' })
  })
  it('au-delà du plafond du niveau, ou preuves contradictoires : transmettre', () => {
    const f: FaitsLitige = { ...BASE, photoRemise: false, codeRemise: false, distanceRemiseM: 1800 }
    const l = lireLitige('non_recu', etats(f, 'non_recu'), f)
    const c = contexte({ issues: issuesLitige({ ...CTX, montant: 41000, paye: 41820, fraisMomo: 820 }, l, 5000), paye: 41820, agent: { ...AGENT, plafond: PARAMETRES.acces.plafond.agent } })
    expect(verifierDemande(c, { ...D, issue: 'rembourser_transporteur' })).toMatchObject({ ok: false, raison: 'transmettre' })
    expect(issuesPourAgent(c.issues, c.agent, false).find((x) => x.id === 'rembourser_transporteur')!.etat).toBe('transmettre')
    expect(verifierDemande(contexte({ ambigu: true }), D)).toMatchObject({ ok: false, raison: 'transmettre' })
  })
})

describe('lots et échantillon', () => {
  const m = (id: string, o = {}) => ({ id, lot: 'litige:retard:geste:PN-0031', doutes: 0, montant: 1000, verdict: { ok: true } as const, ...o })
  it('identiques, sans doute, sous les plafonds : permis', () => expect(verifierLot([m('a'), m('b')], 25000)).toEqual({ ok: true }))
  it('hétérogène, douteux, trop grand ou trop cher : refusé', () => {
    expect(verifierLot([m('a'), m('b', { lot: 'autre' })], null)).toMatchObject({ raison: 'lot_heterogene' })
    expect(verifierLot([m('a'), m('b', { doutes: 1 })], null)).toMatchObject({ raison: 'lot_heterogene' })
    expect(verifierLot(Array.from({ length: PARAMETRES.decisions.lotMax + 1 }, (_, i) => m(String(i))), null)).toMatchObject({ raison: 'lot_taille' })
    expect(verifierLot([m('a'), m('b')], 1500)).toMatchObject({ raison: 'lot_plafond' })
  })
  it('échantillon déterministe pour une graine', () => {
    expect(echantillon([1, 2, 3, 4, 5, 6], 3, 42)).toEqual(echantillon([1, 2, 3, 4, 5, 6], 3, 42))
    expect(new Set(echantillon([1, 2, 3, 4, 5, 6], 3, 7)).size).toBe(3)
  })
})
