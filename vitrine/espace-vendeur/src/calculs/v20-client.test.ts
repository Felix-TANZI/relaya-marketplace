// BV-DEV v2.0 (DP-69) : les calculs de l'écran du client (site/src/calculs) rejouent les tests chiffrés de
// BV-DEV-07_Donnees.json, au franc près, comme les moteurs (moteurs/tests/test_v20.py).
import { describe, expect, it } from 'vitest'
import { commissionApresRemboursement, commissionSousCommande, comptoir, estRefus, fraisLivraison, paiement, plafondComptoir, promesse, JOURS, moyensProposes, type BoutiqueFrais, type Destination, type Format, type Mode } from '@client/calculs'
import REF from '../../../logique-metier/reference/BV-DEV-v2.0/A_envoyer_aux_developpeurs/BV-DEV-07_Donnees.json'

interface T { id: string; cas: string; mode?: Mode; destination: Destination; boutiques: (Omit<BoutiqueFrais, 'colis'> & { colis: Format[] })[]; sous_totaux: number[]; attendu: Record<string, unknown> }
const D = REF as unknown as { tests: { commission: { id: string; cas: string; lignes: { prix: number; quantite: number; univers: string; made_in_cameroon: boolean }[]; palier: string; decouverte: boolean; couverture: number; attendu: Record<string, unknown> }[]; livraison: T[]; comptoir: T[]; promesse: { jour: string; heure: number; mode: Mode; delai_h: number; texte: string }[] } }
const MOTIF = { 'xl-relais': 'XL : jamais au relais (R10)', 'hors-gabarit': 'hors gabarit : sur devis, 8 000 F au moins, domicile seulement (R10)' }

describe('livraison (R04 à R10, R84)', () => {
  for (const t of D.tests.livraison)
    it(`${t.id} ${t.cas}`, () => {
      const f = fraisLivraison(t.mode!, t.destination, t.boutiques, t.sous_totaux)
      if (estRefus(f)) {
        const m = f.refus === 'minimum' ? (f.minimum.boutique === null ? `Encore ${f.minimum.manque} F pour commander` : `Ajoute ${f.minimum.manque} F chez la boutique ${f.minimum.boutique + 1}`) : MOTIF[f.refus]
        return expect(m).toBe(t.attendu.refuse)
      }
      expect({ ...f, ...paiement(f) }).toEqual(t.attendu)
    })
})

describe('comptoir (R42)', () => {
  for (const t of D.tests.comptoir)
    it(`${t.id} ${t.cas}`, () => {
      const f = fraisLivraison('relais', t.destination, t.boutiques, t.sous_totaux)
      if (estRefus(f)) throw new Error('refus')
      const nouveau = t.cas.includes('nouveau compte')
      const c = comptoir(f, plafondComptoir({ commandesLivrees: nouveau ? 0 : 1, sansIncident: nouveau ? 0 : 1, refus: 0 }))
      expect(c.propose).toBe(true)
      expect({ ...f, avance: c.avance, campay_avance: c.fraisAvance, au_comptoir: c.auComptoir, campay_comptoir: c.fraisComptoir }).toEqual(t.attendu)
    })
  it('plafonds, refus, domicile', () => {
    const f = fraisLivraison('relais', { zone: 'Z6', niveau: 'centre' }, [{ zone: 'Z6', colis: ['P'], km: 0, detour: 0, niveau: 'centre' }], [16000])
    if (estRefus(f)) throw new Error('refus')
    expect(plafondComptoir({ commandesLivrees: 6, sansIncident: 5, refus: 0 })).toBe(100000)
    expect(comptoir(f, 15000).motif).toBe('plafond')
    expect(comptoir(f, 50000, 2).motif).toBe('avance-obligatoire')
    expect(comptoir({ ...f, mode: 'domicile' }, 50000).motif).toBe('domicile')
  })
})

describe('heure promise (R45 à R47)', () => {
  for (const t of D.tests.promesse)
    it(`${t.jour} ${t.heure} ${t.mode}`, () => expect(promesse(JOURS.indexOf(t.jour), t.heure, t.mode, t.delai_h)).toBe(t.texte.replace("'", '’')))
})

it('Wallet fermé au lancement (R03) : MTN et Orange seulement', () => expect(moyensProposes()).toEqual(['mtn', 'orange']))

describe('zones et adresses (BV-DEV-04, R10, R12, R83, R90)', async () => {
  const { chercher, niveauLieu, distanceKm, horsGabarit, livraisonDes } = await import('@client/calculs')
  const Q = (REF as unknown as { quartiers: { quartier: string; zone: string; niveau: string }[] }).quartiers
  it('la règle du § 3 redonne le niveau des 117 quartiers', () => {
    expect(Q).toHaveLength(117)
    for (const q of Q) expect(niveauLieu(q.zone, q.quartier)).toBe(q.niveau)
  })
  it('recherche sans accents ni tirets ; hors zone', () => {
    expect(chercher('ngoa ekelle')?.zone).toBe('Z2')
    expect(chercher('Emana')?.niveau).toBe('periurbain')
    expect(chercher('Soa')).toBeNull()
  })
  it('distance, hors gabarit, « Livraison dès »', () => {
    expect(distanceKm(10.4, null)).toBe(10)
    expect(distanceKm(null, 5)).toBe(7)
    expect(horsGabarit(5000, 20000)).toEqual([8000, 0, 8000])
    expect(horsGabarit(12001, 300000)).toEqual([13202, 1500, 11702])
    expect(livraisonDes(chercher('Bastos')!, 'P', null)).toBe(900)
    expect(livraisonDes(chercher('Bastos')!, 'C1', chercher('Emana'), 8)).toBe(3150)
  })
})

describe('commission du vendeur (R13 à R22)', () => {
  for (const t of D.tests.commission)
    it(`${t.id} ${t.cas}`, () => {
      const c = commissionSousCommande(t.lignes.map((l) => ({ prix: l.prix, quantite: l.quantite, univers: l.univers, madeInCameroon: l.made_in_cameroon })), t.palier, { decouverte: t.decouverte, couverture: t.couverture })
      const a = t.attendu
      expect([c.sousTotal, c.bareme, c.commission, c.motif, c.tva, c.net, c.fraisVersement, c.recu]).toEqual([a.sous_total, a.bareme, a.commission, a.motif, a.tva, a.net, a.frais_versement, a.recu])
    })
  it('R20 : deux articles à 1 000 F, un rendu : 350 F', () => expect(commissionApresRemboursement(commissionSousCommande([{ prix: 1000, quantite: 2, univers: 'SUP' }], 'Bronze'), 1000)).toBe(350))
})
