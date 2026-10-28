// Données de démonstration à volume de trafic normal (retour du porteur, 12 oct.) : une flotte réaliste aux statuts
// variés, des dizaines de paquets sur la journée dans les quatre zones, des incidents, des litiges et des règlements
// sur plusieurs semaines — et tout se tient (un litige ancien pointe sur sa prestation, un versement passé est la
// somme de sa semaine, un paquet en cours a un livreur de la flotte).
import { describe, expect, it } from 'vitest'
import { REFERENCE } from './horloge'
import { demoIncidents } from './incidents'
import { litigesDemo } from './litiges'
import { demoLivreurs } from './livreurs'
import { paquetHistorique, paquetsDemo, trouverPaquet } from './paquets'
import { SERGE_HISTORIQUE, prestations } from './prestations'
import { relevesA } from './releves'
import { versementsPasses } from './reglements'

describe('trafic normal de la démonstration', () => {
  it('flotte de 15 à 25 livreurs aux statuts variés, pièces à contrôler', async () => {
    const ls = await demoLivreurs.liste()
    expect(ls.length).toBeGreaterThanOrEqual(15)
    expect(ls.length).toBeLessThanOrEqual(25)
    const statuts = new Set(ls.map((l) => l.statut))
    for (const s of ['en_activation', 'en_mission', 'en_ligne', 'actif', 'suspendu']) expect(statuts, s).toContain(s)
    expect(ls.filter((l) => l.statut === 'en_activation').length).toBeGreaterThanOrEqual(3)
    expect(ls.filter((l) => l.statut === 'en_mission').length).toBeGreaterThanOrEqual(6)
    const file = await demoLivreurs.controles()
    for (const r of ['a_controler', 'refusee', 'manquante', 'expiree', 'expire_bientot']) expect(file.map((x) => x.raison), r).toContain(r)
  })

  it('des dizaines de paquets sur la journée, dans les quatre zones, à chaque étape', () => {
    const ps = paquetsDemo.lire().paquets
    const ids = new Set(ps.map((p) => p.id))
    expect(ids.size, 'identifiants uniques').toBe(ps.length)
    const aujourdhui = ps.filter((p) => p.id.includes('-261013-'))
    expect(aujourdhui.length).toBeGreaterThanOrEqual(40)
    expect(new Set(aujourdhui.map((p) => p.zone))).toEqual(new Set(['Z1', 'Z3', 'Z2', 'Z6']))
    for (const s of ['publie', 'accepte', 'affecte', 'en_cours', 'incident', 'depose', 'clos']) expect(aujourdhui.map((p) => p.statut), s).toContain(s)
    expect(new Set(ps.flatMap((p) => p.colis.map((c) => c.etiquette))).size, 'étiquettes uniques').toBe(ps.reduce((n, p) => n + p.colis.length, 0))
  })

  it('incidents à décider et décidés', async () => {
    const is = await demoIncidents.liste()
    expect(is.length).toBeGreaterThanOrEqual(8)
    expect(is.some((i) => i.statut === 'a_valider')).toBe(true)
    const ps = new Set(paquetsDemo.lire().paquets.map((p) => p.id))
    for (const i of is) expect(ps.has(i.paquetId), i.id).toBe(true)
  })

  it('litiges et règlements sur plusieurs semaines, cohérents', () => {
    const ls = litigesDemo.lire().litiges
    expect(ls.length).toBeGreaterThanOrEqual(10)
    const pr = prestations()
    expect(pr.length).toBeGreaterThan(300)
    for (const l of ls) expect(pr.some((p) => p.paquetId === l.paquetId), l.id).toBe(true)
    // Chaque prestation mène à son paquet (règlements, relevés, score) : jamais une page vide.
    for (const p of pr) expect(trouverPaquet(p.paquetId) ?? paquetHistorique(p.paquetId), p.paquetId).toBeTruthy()
    const vs = versementsPasses(REFERENCE)
    expect(vs.length).toBeGreaterThanOrEqual(3)
    expect(vs.every((v) => v.montant > 0 && v.statut === 'verse')).toBe(true)
    const r = relevesA(REFERENCE)
    expect(r.semaine.length).toBe(vs.length + 1)
    expect(r.semaine.slice(1).every((x) => x.statut === 'definitif')).toBe(true)
    // Un versement passé = le net de son relevé de semaine.
    expect(r.semaine.slice(1).map((x) => x.net)).toEqual(vs.map((v) => v.montant))
  })

  it('Serge A. : mêmes missions passées que dans l’espace livreur (pont de démonstration)', async () => {
    const { PAQUETS } = await import('../../../espace-livreur/src/demo/historique')
    const cote = PAQUETS.filter((p) => p.jour < '2026-10-13' && p.nature !== 'retour').map((p) => [p.id, p.heure, p.nature, p.zone.slice(0, 2), Object.entries(p.classes).flatMap(([c, n]) => Array<string>(n ?? 0).fill(c)).join('')])
    expect(SERGE_HISTORIQUE).toEqual(cote)
    const miennes = prestations().filter((p) => p.livreur.id === 'l-serge').map((p) => p.paquetId)
    for (const [id] of SERGE_HISTORIQUE) expect(miennes, id).toContain(id)
  })
})
