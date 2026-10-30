// PR-06 · Stock, fiche colis et départs : règles de la démonstration (le « serveur ») sur le jeu d'essai du mardi
// 13 octobre 2026, 14 h 05. Onglets (STK-02), garde jour par jour (FIC-06, ARL-08), anonymat (FIC-01), part du relais
// cachée à l'employé (PR-RC-09), sortie au livreur (DEP-02, DEP-03, D15), inventaire.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { Origine } from '../donnees/communs'
import { REFERENCE } from './horloge'

let n = 0
const o = (): Origine => ({ cle: `pr06-${++n}`, heure: Date.now(), position: null })

describe('PR-06 · stock, fiche, départs', async () => {
  beforeAll(() => void vi.setSystemTime(REFERENCE))
  vi.setSystemTime(REFERENCE)
  const { sourceDemo: s } = await import('./source-demo')
  const { tousLesColis, codeDemo } = await import('./colis')
  const { etatSession } = await import('./session')
  const { PARAMETRES } = await import('../calculs/registre')

  it('chaque colis du stock est dans un seul onglet ; compteurs = lignes ; plan et occupation cohérents', async () => {
    const v = await s.stock.vue()
    const ids = v.lignes.map((l) => l.colis.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(Object.values(v.compteurs).reduce((a, b) => a + b, 0)).toBe(v.lignes.length)
    const de = (id: string) => v.lignes.find((l) => l.colis.id === id)!
    expect(de('BLV-00003-1')).toMatchObject({ categorie: 'urgents', etiquette: 'a_renvoyer', depart: { collecte: 'A4' } })
    expect(de('BLV-00044-1')).toMatchObject({ categorie: 'urgents', etiquette: 'dernier_jour' })
    expect(de('BLV-00041-1')).toMatchObject({ categorie: 'payants', etiquette: 'payant' })
    expect(de('BLV-00006-1')).toMatchObject({ categorie: 'gratuits', etiquette: 'gratuit' })
    expect(de('BLV-00048-1')).toMatchObject({ categorie: 'gratuits', etiquette: 'incomplet' })
    expect(de('BLV-00047-1')).toMatchObject({ categorie: 'groupage' })
    expect(de('BLV-00043-1')).toMatchObject({ categorie: 'hors_garde', etiquette: 'constat' })
    expect(de('BLV-00004-2')).toMatchObject({ categorie: 'hors_garde', etiquette: 'retour' })
    // Urgents : à renvoyer avant dernier jour.
    const urg = (await s.stock.vue({ categorie: 'urgents' })).lignes.map((l) => l.etiquette)
    expect(urg.indexOf('a_renvoyer')).toBeLessThan(urg.indexOf('dernier_jour'))
    // Occupation : places des colis présents, retours exclus (CAL-21) ; plan = somme des cases.
    const parClasse = Object.values(v.occupation.parClasse).reduce((a, b) => a + b.places, 0)
    expect(parClasse).toBe(v.occupation.occupees)
    expect(v.totalColis).toBe(v.lignes.filter((l) => l.etiquette !== 'retour').length)
    expect(v.plan.every((k) => k.colis.length === 0 || k.etiquette !== null)).toBe(true)
    // Grille v6 lue dans le registre : J1 0 F, J2-J4 100 F, J5 200 F, J6 500 F, J7 1 000 F ; 2 000 F sur 7 jours.
    expect(v.grille.totalSeptJours).toBe(PARAMETRES.relais.garde.grille.reduce((a, b) => a + b, 0))
    expect(v.grille.paliers.map((p) => [p.de, p.a])).toEqual([
      [1, 1],
      [2, 4],
      [5, 5],
      [6, 6],
      [7, 7],
    ])
  })

  it('recherche par référence, emplacement, classe ; puces code bloqué et comptoir', async () => {
    expect((await s.stock.vue({ q: 'blv 00041' })).lignes.map((l) => l.colis.id)).toEqual(['BLV-00041-1'])
    expect((await s.stock.vue({ q: 'a01' })).lignes.every((l) => l.colis.emplacement === 'A-01')).toBe(true)
    expect((await s.stock.vue({ q: 'RT-0412' })).lignes.map((l) => l.colis.id)).toEqual(['BLV-00004-2'])
    expect((await s.stock.vue({ classe: 'L' })).lignes.every((l) => l.colis.classe === 'L')).toBe(true)
    const comptoir = await s.stock.vue({ auComptoir: true })
    expect(comptoir.lignes.length).toBe(comptoir.speciaux.auComptoir)
    expect(comptoir.lignes.every((l) => l.colis.paiement.mode === 'au_comptoir')).toBe(true)
  })

  it('fiche : tranches de 24 h depuis l’arrivée du samedi 18 h 50 (R37) ; dernier jour, renvoi le lendemain', async () => {
    const f = (await s.stock.ficheComplete('BLV-00036-1'))!
    expect(f.garde?.jours[0]).toMatchObject({ rang: 1, jour: '2026-10-10', tarif: 0 })
    expect(f.garde?.jours.find((j) => j.quand === 'aujourdhui')).toMatchObject({ rang: 3, cumul: 200 })
    expect(f.garde?.dernierJour).toBe('2026-10-17') // samedi 17, 18 h 50 : fin des 7 jours
    expect(f.garde?.renvoi?.jour).toBe('2026-10-18')
    expect(f.remettable).toEqual({ ok: true })
    // Client prévenu = avis d'arrivée + rappels datés envoyés (NTF-09).
    expect(f.clientPrevenu).toBe(f.parcours.filter((p) => p.type === 'rappel').length + 1)
    expect(f.remuneration).not.toBeNull()
  })

  it('fiche : non remettable avec son motif ; groupe incomplet ; constat sans renvoi daté', async () => {
    expect((await s.stock.ficheComplete('BLV-00047-1'))!.remettable).toEqual({ ok: false, motif: 'groupage' })
    expect((await s.stock.ficheComplete('BLV-00003-1'))!.remettable).toEqual({ ok: false, motif: 'a_renvoyer' })
    expect((await s.stock.ficheComplete('BLV-00048-1'))!.remettable).toEqual({ ok: false, motif: 'incomplet' })
    const c = (await s.stock.ficheComplete('BLV-00043-1'))!
    expect(c.remettable).toEqual({ ok: false, motif: 'constat' })
    expect(c.garde?.suspendue).toBe(true)
    expect(c.garde?.renvoi).toBeNull()
    expect(c.parcours.some((p) => p.type === 'constat')).toBe(true)
    expect(await s.stock.ficheComplete('BLV-99999-9')).toBeNull()
  })

  it('anonymat : ni client, ni valeur, ni code dans la vue et la fiche (FIC-01, GEN-01)', async () => {
    const json = JSON.stringify([await s.stock.vue(), await s.stock.ficheComplete('BLV-00034-1'), await s.departs.departs()])
    expect(json).not.toMatch(/"(client|telephone|adresse|valeur|paye)":/)
    expect(json).not.toContain(codeDemo('BLV-00034-1'))
    expect(json).not.toContain('Patrice')
  })

  it('employé : part du relais à null (PR-RC-09), garde due visible', async () => {
    etatSession.ecrire((x) => void (x.membreId = 'm-paul'))
    const f = (await s.stock.ficheComplete('BLV-00041-1'))!
    expect(f.remuneration).toBeNull()
    expect(f.garde?.jours.every((j) => j.partRelais === null)).toBe(true)
    expect(f.colis.garde?.du).toBeGreaterThan(0)
    expect((await s.stock.vue()).grille.gainJour).toBeNull()
    etatSession.ecrire((x) => void (x.membreId = 'm-rose'))
  })

  it('déplacer : seulement une case compatible avec de la place ; journalisé (FIC-02)', async () => {
    const f = (await s.stock.ficheComplete('BLV-00041-1'))!
    expect(f.casesLibres.every((k) => k.code.startsWith('B'))).toBe(true)
    expect(await s.stock.deplacer('BLV-00041-1', 'A-02', o())).toEqual({ ok: false, raison: 'etagere_interdite' })
    const cible = f.casesLibres[0].code
    expect(await s.stock.deplacer('BLV-00041-1', cible, o())).toEqual({ ok: true })
    const g = (await s.stock.ficheComplete('BLV-00041-1'))!
    expect(g.colis.emplacement).toBe(cible)
    expect(g.journal.at(-1)).toMatchObject({ action: 'deplace' })
  })

  it('sortie : scan ou absent pour chaque colis prévu, photo et PIN, puis confirmation du livreur (DEP-02, DEP-03)', async () => {
    const d = await s.departs.departs()
    const a4 = d.collectes.find((c) => c.id === 'A4')!
    expect(a4.colis.sort()).toEqual(['BLV-00003-1', 'BLV-00004-2'])
    expect(d.lignes.find((l) => l.colis.id === 'BLV-00003-1')).toMatchObject({ motif: 'renvoi', destination: 'Tech Bastos', enRetard: false })
    expect(d.passages.find((p) => p.collecte === 'A4')).toMatchObject({ depose: 4, reprend: 2 })
    expect(d.partis.map((p) => p.collecte)).toEqual(['R1'])
    expect(await s.departs.scanner('A4', 'BLV-00046-1', o())).toEqual({ ok: false, raison: 'pas_dans_la_collecte' })
    expect(await s.departs.scanner('A4', 'BLV-00003-1', o())).toEqual({ ok: true })
    expect(await s.departs.valider('A4', 'ph-sortie', '240913', o())).toEqual({ ok: false, raison: 'colis_non_traites' })
    expect(await s.departs.marquerAbsent('A4', 'BLV-00004-2', 'introuvable', o())).toEqual({ ok: true })
    expect(await s.departs.valider('A4', '', '240913', o())).toEqual({ ok: false, raison: 'photo_manquante' })
    expect(await s.departs.valider('A4', 'ph-sortie', '000000', o())).toEqual({ ok: false, raison: 'pin_requis' })
    const avant = (await s.session.session()).relais!.placesOccupees
    const v = o()
    expect(await s.departs.valider('A4', 'ph-sortie', '240913', v)).toEqual({ ok: true, partis: 1 })
    expect(await s.departs.valider('A4', 'ph-sortie', '240913', v)).toEqual({ ok: true, partis: 1 }) // rejoué : même effet
    // Pas encore confirmé par le livreur : le colis reste au stock (DEP-03).
    expect(tousLesColis().find((c) => c.id === 'BLV-00003-1')?.etat).toBe('a_renvoyer')
    vi.setSystemTime(REFERENCE + 5000)
    const apres = await s.departs.departs()
    const k = apres.collectes.find((c) => c.id === 'A4')!
    expect(k.termineeA).not.toBeNull()
    expect(k.confirmes).toEqual(['BLV-00003-1'])
    expect(tousLesColis().find((c) => c.id === 'BLV-00003-1')).toMatchObject({ etat: 'parti', emplacement: null })
    expect((await s.session.session()).relais!.placesOccupees).toBe(avant - k.placesLiberees)
    expect(k.placesLiberees).toBe(PARAMETRES.relais.places.M)
    // Le colis absent reste à faire partir, en tête de liste.
    expect(apres.lignes.some((l) => l.colis.id === 'BLV-00004-2')).toBe(true)
    expect(apres.partis[0].collecte).toBe('A4')
    vi.setSystemTime(REFERENCE)
  })

  it('inventaire : pointage, colis trouvé ailleurs, manquants signalés à la clôture (PIN)', async () => {
    expect(await s.stock.pointer('BLV-00006-1', null, o())).toEqual({ ok: false, raison: 'aucun_inventaire' })
    const c = await s.stock.commencerInventaire(o())
    expect(c.ok).toBe(true)
    expect(await s.stock.commencerInventaire(o())).toEqual({ ok: false, raison: 'inventaire_en_cours' })
    const inv = (await s.stock.inventaire())!
    expect(await s.stock.pointer('BLV-00006-1', null, o())).toEqual({ ok: true, ecart: 'aucun' })
    expect(await s.stock.pointer('BLV-00006-1', null, o())).toEqual({ ok: false, raison: 'deja_pointe' })
    expect(await s.stock.pointer('BLV-00006-2', 'A-03', o())).toEqual({ ok: true, ecart: 'deplace' })
    expect(await s.stock.pointer('BLV-00049-1', null, o())).toEqual({ ok: false, raison: 'pas_au_relais' })
    expect(await s.stock.terminerInventaire('111111', o())).toEqual({ ok: false, raison: 'pin_requis' })
    const t = await s.stock.terminerInventaire('240913', o())
    expect(t.ok && t.bilan.pointes).toBe(2)
    expect(t.ok && t.bilan.deplaces).toBe(1)
    expect(t.ok && t.bilan.manquants.length).toBe(inv.attendus.length - 2)
    expect((await s.stock.ficheComplete('BLV-00006-2'))!.colis.emplacement).toBe('A-03')
  })
})
