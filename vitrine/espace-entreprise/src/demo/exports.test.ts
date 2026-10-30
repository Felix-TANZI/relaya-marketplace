// Fichiers rendus par la démonstration (relevés ENT-P19, rapports ENT-P25) : un PDF est un vrai PDF (en-tête %PDF,
// fin %%EOF, aucun CSV renommé), un CSV a son BOM et le séparateur « ; » ; un relevé provisoire n'est pas exporté.
// Vérifié ici plutôt que dans le navigateur : la démonstration n'a ni période arrêtée ni 30 missions, l'écran garde
// donc ces exports fermés (le refus, lui, est testé de bout en bout dans tests/ENT-07 et ENT-08).
import { describe, expect, it } from 'vitest'
import { pdfBinaire } from '../donnees/exports'
import { calculer, csvRapport, lignesPdf } from './rapports'
import { demoReleves, fichierReleve, relevesA } from './releves'

describe('exports de la démonstration', () => {
  it('relevé : vrai PDF et CSV ; refus tant que la période est provisoire', async () => {
    const x = { ...relevesA(Date.now()).semaine[0], statut: 'definitif' as const }
    const mentions = { emetteur: { denomination: 'BELIVAY SARL', forme: 'SARL', capital: '1', siege: 'Yaoundé', rccm: 'R', niu: 'N' }, destinataire: { denomination: 'Yafé Express SARL', niu: 'M', quartier: 'Mokolo' }, modeFacturation: 'televersee', retenueSource: 'à confirmer' }
    const pdf = fichierReleve(x, mentions as never, 'pdf')
    const csv = fichierReleve(x, mentions as never, 'csv')
    expect(pdf.contenu.slice(0, 5)).toBe('%PDF-')
    expect(pdf.type).toBe('application/pdf')
    expect(pdf.contenu.includes('jour;genre')).toBe(false)
    expect(csv.contenu.slice(1, 28)).toBe('jour;genre;reference;detail')
    const refus = await demoReleves.fichier(relevesA(Date.now()).semaine[0].id, 'pdf')
    expect(refus).toMatchObject({ ok: false, raison: 'provisoire' })
  })

  it('rapport : vrai PDF (en-tête et fin) et CSV « ; »', () => {
    const r = calculer({ du: '2026-10-12', au: '2026-10-13' })
    const pdf = pdfBinaire(lignesPdf(r, 'Rapport d’activité'))
    expect(pdf.startsWith('%PDF-1.4')).toBe(true)
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true)
    expect(csvRapport(r)).toContain('section;libelle;colis')
  })
})
