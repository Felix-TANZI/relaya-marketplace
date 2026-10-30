// Argent et performance du relais (PR-09) : montants calculés par le socle (garde, solde du vendredi) à partir des
// données d'activité, cohérence du relevé, dette (ARL-05), numéro de versement (MOM-01 à MOM-07), Trust Score (TRU-01,
// PAL-01, ARL-15) et avis (AVI).
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Origine } from '../donnees/communs'
import { REFERENCE } from './horloge'

let n = 0
const o = (heure = Date.now()): Origine => ({ cle: `pr09-${++n}`, heure, position: null })

describe('PR-09 · argent', async () => {
  beforeAll(() => void vi.setSystemTime(REFERENCE))
  vi.setSystemTime(REFERENCE)
  const { sourceDemo: s } = await import('./source-demo')
  const A = await import('./argent')
  const { SEMAINE_AVANT, VERSEMENTS_PASSES } = await import('./jeu-essai')
  beforeEach(() => A.choisirSituation(null))

  it('les trois derniers versements du jeu d’essai sont retrouvés par le calcul (garde, gains, solde du vendredi)', async () => {
    const v = await s.argent.versements()
    for (const p of VERSEMENTS_PASSES) expect(v.find((x) => x.reference === p.reference)?.total, p.reference).toBe(p.total)
  })

  it('la répartition par rang de la semaine en cours retrouve SEMAINE_AVANT (jours de garde, espèces)', async () => {
    const { caisse } = await import('../calculs/dette')
    const t = A.totauxDe({ du: '2026-10-09', rangs: A.SEMAINE_AVANT_RANGS, colis: SEMAINE_AVANT.colis, renvoyes: 0, retours: { S: 0, M: 0, L: 0 }, recus: 0 })
    const c = caisse(t.gardes)
    expect(c.partRelais).toBe(SEMAINE_AVANT.partRelaisEspeces)
    expect(c.especes).toBe(SEMAINE_AVANT.especes)
    expect(c.j1Belivay / 100).toBe(SEMAINE_AVANT.joursOffertsBelivay)
  })

  it('relevé : somme des lignes = net versé ; gagné = lignes positives ; part BelivaY = espèces − part du relais', async () => {
    for (const v of await s.argent.versements()) {
      const somme = v.lignes.reduce((x, l) => x + l.montant, 0)
      expect(Math.max(somme, 0), v.id).toBe(v.total)
      expect(v.lignes.filter((l) => l.montant > 0).reduce((x, l) => x + l.montant, 0)).toBe(v.gagne)
      const especes = -v.lignes.filter((l) => l.type.startsWith('especes_')).reduce((x, l) => x + l.montant, 0)
      expect(especes, v.id).toBe(v.especes)
      expect(v.lignes.find((l) => l.type === 'retenue_fiscale')?.montant === 0).toBe(true)
    }
    const a = await s.argent.argent()
    expect(a.prochain.provisoire).toBe(true) // avant l'arrêté du jeudi minuit
    expect(a.prochain.reference).toBeNull()
    expect(a.prochain.date).toBe(Date.UTC(2026, 9, 16, 11, 0)) // vendredi 16 octobre, 12 h à Yaoundé
    expect(a.recusDuMois.total).toBe(12_226 + 12_969) // 1 % Mobile Money déduit (R43)
  })

  it('« Versement non reçu » : une réclamation, réponse avant le lundi midi suivant', async () => {
    const id = 'V-2026-10-02'
    const r = await s.argent.signalerNonRecu(id, o())
    expect(r).toMatchObject({ ok: true, reponseAvant: Date.UTC(2026, 9, 19, 11, 0) })
    expect(await s.argent.signalerNonRecu(id, o())).toMatchObject({ ok: false, raison: 'deja_signale' })
    expect((await s.argent.versement(id))?.reclamation).not.toBeNull()
  })

  it('refus répétés : 3 nouveaux essais à 24 h puis « suspendu »', async () => {
    A.choisirSituation('refuse')
    const v = (await s.argent.versements()).find((x) => x.reference === 'BLV-VP-0141')!
    expect(v).toMatchObject({ etat: 'suspendu', motifRefus: 'numero_tiers', motifSuspension: 'refus_repetes' })
    expect(v.essais).toHaveLength(4)
    const x = A.apresRefus(0, 'compte_plein', 2, 30 * 3600_000)
    expect(x).toMatchObject({ etat: 'refuse', prochainEssai: 48 * 3600_000 })
  })

  it('dette : semaine négative reportée, puis deux semaines : espèces à reverser, échéance dépassée, encaissement suspendu', async () => {
    A.choisirSituation('dette')
    let a = await s.argent.argent()
    const der = (await s.argent.versements()).find((x) => x.reference === 'BLV-VP-0141')!
    expect(der.total).toBe(0)
    expect(der.report).toBeGreaterThan(0)
    expect(a.prochain.lignes.find((l) => l.type === 'report')?.montant).toBe(-der.report)
    A.choisirSituation('reverser')
    a = await s.argent.argent()
    expect(a.dette).toMatchObject({ aReverser: true, semaines: 2, encaissementSuspendu: true, reference: 'BLV-DR-0141' })
    expect(a.dette.echeance).toBe(Date.UTC(2026, 9, 9, 11, 0) + 48 * 3600_000)
    expect(a.prochain.lignes.find((l) => l.type === 'report')?.montant).toBe(-a.dette.montant) // BelivaY ne perd jamais
    expect(await s.argent.reverserDette(o())).toMatchObject({ ok: true, reference: 'BLV-DR-0141' })
    a = await s.argent.argent()
    expect(a.dette).toMatchObject({ aReverser: false, encaissementSuspendu: false })
    expect(a.prochain.lignes.find((l) => l.type === 'report')).toBeUndefined()
  })

  it('numéro de versement : préfixe, deux codes, vérification par une personne, versement suspendu puis reporté, annulation', async () => {
    expect(await s.argent.changerNumero('MTN', '691 24 83 50', o())).toMatchObject({ ok: false, raison: 'prefixe_operateur' })
    expect(await s.argent.changerNumero('MTN', '621 24 83 50', o())).toMatchObject({ ok: false, raison: 'prefixe_inconnu' })
    expect(await s.argent.changerNumero('MTN', '6 77 40 21 18', o())).toMatchObject({ ok: true, codesEnvoyes: 2 })
    expect(await s.argent.confirmerNumero(['000000', '000000'], o())).toMatchObject({ ok: false, raison: 'code_faux' })
    const r = await s.argent.confirmerNumero(['481920', '481 920'], o())
    expect(r).toMatchObject({ ok: true, premierVersementLe: Date.UTC(2026, 9, 23, 11, 0) })
    const a = await s.argent.argent()
    expect(a.numero.masque).toBe('MTN ···· 8350') // jamais effectif tout de suite
    expect(a.changement).toMatchObject({ etape: 'en_verification', nouveau: { masque: 'MTN ···· 2118' }, alerteEnvoyeeA: 'MTN ···· 8350' })
    expect(a.prochain).toMatchObject({ etat: 'suspendu', motifSuspension: 'verification_numero', reporteAu: Date.UTC(2026, 9, 23, 11, 0) })
    expect(await s.argent.changerNumero('Orange', '699 31 84 42', o())).toMatchObject({ ok: false, raison: 'verification_en_cours' })
    expect(await s.argent.annulerChangement(o())).toMatchObject({ ok: true })
    expect((await s.argent.argent()).prochain.etat).toBe('prevu')
  })

  it('rapports : total = somme des colonnes ; colonne en cours = gagné de la semaine du relevé ; délais = sorties', async () => {
    const a = await s.argent.argent()
    for (const p of ['mois', 'trimestre', 'ouverture'] as const) {
      const r = await s.argent.rapport(p)
      expect(r.gagne).toBe(r.colonnes.reduce((x, c) => x + c.gagne, 0))
      expect(r.delais.reduce((x, y) => x + y, 0)).toBeGreaterThan(0)
    }
    const m = await s.argent.rapport('mois')
    expect(m.colonnes[m.colonnes.length - 1]).toMatchObject({ enCours: true, gagne: a.prochain.gagne })
    const pdf = await s.argent.releve('mois', 'pdf')
    expect(pdf.contenu.startsWith('%PDF-1.4')).toBe(true)
    expect(pdf.contenu).not.toMatch(/fiscal/i) // RAP-03
    expect([...pdf.contenu].every((c) => c.charCodeAt(0) < 256)).toBe(true)
    expect((await s.argent.releve('mois', 'csv')).contenu.split('\n')[0]).toContain('net_verse')
  })
})

describe('PR-09 · qualité', async () => {
  vi.setSystemTime(REFERENCE)
  const { sourceDemo: s } = await import('./source-demo')
  const Q = await import('./qualite')
  beforeEach(() => Q.choisirSituation(null))

  it('Trust Score : somme pondérée arrondie des critères = score ; palier Confirmé tenu ; pas d’alerte à 78', async () => {
    const t = await s.qualite.trust()
    expect(t.score).toBe(78)
    expect(Math.round(t.criteres.reduce((x, c) => x + (c.valeur * c.poids) / 100, 0))).toBe(t.score)
    expect(t.criteres.map((c) => c.poids)).toEqual([25, 25, 20, 15, 15])
    expect(t).toMatchObject({ palier: 'Confirmé', variationSemaine: 4, alerte: null })
    expect(t.tenue).toMatchObject({ seuil: 85, palierVise: 'Premium', jours: 0, requis: 14 })
  })

  it('alerte de seuil dans les deux sens (ARL-15) : 72, à 2 points du seuil de 70', async () => {
    Q.choisirSituation('alerte')
    const t = await s.qualite.trust()
    expect(t.score).toBe(72)
    expect(t.alerte).toEqual({ seuil: 70, sens: 'descente', ecart: 2 })
  })

  it('avis : 58 avis, note 4,6, satisfaction = borne de Wilson', async () => {
    const a = await s.qualite.avis()
    expect(a).toHaveLength(58)
    expect([5, 4, 3, 2, 1].map((e) => a.filter((x) => x.etoiles === e).length)).toEqual([41, 11, 4, 1, 1])
    expect(Math.round((a.reduce((x, y) => x + y.etoiles, 0) / a.length) * 10) / 10).toBe(4.6)
    expect((await s.qualite.trust()).criteres.find((c) => c.id === 'satisfaction')?.valeur).toBe(Q.wilson(a))
    const id = a.find((x) => !x.reponse)!.id
    expect(await s.qualite.repondreAvis(id, 'Merci !', o())).toMatchObject({ ok: true })
    expect(await s.qualite.repondreAvis(id, 'Encore', o())).toMatchObject({ ok: false, raison: 'deja_repondu' })
    expect(await s.qualite.signalerAvis(id, 'hors_sujet', o())).toMatchObject({ ok: true })
    expect(await s.qualite.signalerAvis(id, 'insulte', o())).toMatchObject({ ok: false, raison: 'deja_signale' })
  })

  it('contester une fois, dans le délai ; un dossier en cours ne se conteste pas (sans effet)', async () => {
    const r = await s.qualite.contester('EV-412', 'Photo prise, envoi resté en file.', o())
    expect(r.ok).toBe(true)
    expect(await s.qualite.contester('EV-412', 'Encore', o())).toMatchObject({ ok: false, raison: 'deja_contestee' })
    expect(await s.qualite.contester('EV-418', 'x', o())).toMatchObject({ ok: false, raison: 'non_contestable' })
    expect(await s.qualite.contester('D-61', 'x', o())).toMatchObject({ ok: false, raison: 'hors_delai' })
    // 72 h ouvrées, dimanche non compté : mardi 14 h 05 → vendredi 14 h 05 (aucun dimanche entre les deux).
    if (r.ok) expect(r.reponseAvant).toBe(REFERENCE + 72 * 3600_000)
    expect(Q.heuresOuvrees(Date.UTC(2026, 9, 16, 13, 0), 72)).toBe(Date.UTC(2026, 9, 20, 13, 0)) // ven. → mar. (dimanche sauté)
  })
})
