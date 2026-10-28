// Mêmes exemples que moteurs/tests/test_relais.py : le portage TypeScript (parametres-moteurs, reception, remise, renvoi,
// dette, trust) doit dire exactement ce que dit moteurs/belivay_moteurs/relais.py. Relais Bastos Carrefour, semaine du
// lundi 5 octobre 2026 (tous les jours ouverts) ; BLV-52018 au relais Mvog-Ada fermé le dimanche.
import { describe, expect, it } from 'vitest'
import { occupation } from './capacite'
import { caisse, DETTE_NULLE, encaissementSuspendu, gardeReglee, partBelivay, partRelais, releveHebdomadaire, traceReleve, type GardeReglee, type SemaineDuRelais } from './dette'
import { ParametreIllisible } from './erreurs'
import { groupe, horaires } from './garde'
import { lireMoteursRelais, lireTrustRelais, PARAMETRES_MOTEURS } from './parametres-moteurs'
import { PARAMETRES, REGISTRE } from './registre'
import { colisDuLot, controleReception, essaiDeCode, placesManquantes, proposeAuClient } from './reception'
import { conditionsDeRemise, essaiPin, gardeAEncaisser, type DemandeDeRemise } from './remise'
import { renvoiAuVendeur } from './renvoi'
import { HEURE, yaounde } from './temps'
import { alerteAEnvoyer, alerteDeSeuil, anciennete, contestation, critereTrust, evolutionPalier, satisfaction, trustRelais, type AvisClient, type EvenementTrust } from './trust'

const P = PARAMETRES_MOTEURS
const T = P.trust
const LUNDI = yaounde(2026, 10, 12, 9, 0)
const TOUS_LES_JOURS = horaires(8 * 60, 19 * 60)
const MVOG_ADA = horaires(8 * 60, 19 * 60, [6])
const G_300 = groupe('BLV-60412', '2026-10-05', 18_500, 19_400, false, TOUS_LES_JOURS)
const JEUDI_8 = '2026-10-08'
const MINUTE = 60_000

describe('paramètres des moteurs (lire_relais)', () => {
  it('lit le registre officiel', () => {
    expect([P.gainColis, P.places, P.saturationPct]).toEqual([{ S: 200, M: 250, L: 400 }, { S: 1, M: 2, L: 5 }, 90])
    expect([P.codeEssais, P.codeBlocageHeures, P.porteurPieceDes, P.lotPhotosMin, P.reservePhotosMin, P.refusPhotosMin]).toEqual([3, 24, 100_000, 1, 1, 2])
    expect([P.pinEssais, P.pinRemiseEssais, P.pinBlocageMinutes, P.horsLigneRemises]).toEqual([5, 3, 15, 10])
    expect([P.detteMax, P.detteSemaines, P.detteDelaiHeures, P.retenueFiscalePourCent]).toEqual([20_000, 2, 48, 0])
    expect(T.poids).toEqual({ Ponctualité: 25, 'Sécurité du stockage': 25, Satisfaction: 20, Litiges: 15, Ancienneté: 15 })
    expect([T.demiVieJours, T.hysteresisPoints, T.baisseMax, T.gelJours, T.neutre, T.k]).toEqual([90, 5, 8, 30, 50, 10])
    expect([T.gravites, T.avisPositifEtoiles, T.wilsonZ]).toEqual([{ g1: 1, g2: 2, g3: 4 }, 4, 1.96])
    expect([T.anciennetePoints, T.ancienneteMois, T.ancienneteRemises, T.seuils, T.tenueJours, T.alertePoints, T.alerteFrequenceJours, T.contestationHeures]).toEqual([50, 12, 500, { Confirmé: 70, Premium: 85 }, 14, 3, 7, 72])
    expect(P.places).toEqual(PARAMETRES.relais.places)
  })
  it.each([
    ['CODE-BLOCAGE-H', '12', /même blocage/],
    ['PR-SATURATION', '0', /pourcentage/],
    ['PR-PIN-REMISE-ESSAIS', '6', /avant le blocage/],
    ['RELAIS-PLACES', 'S 1 · M 2', /forme attendue/],
    ['PR-TRUST-POIDS', 'Ponctualité 30 · Sécurité du stockage 25 · Satisfaction 20 · Litiges 15 · Ancienneté 15', /font 100/],
    ['PR-PAL-TENUE-J', '21 jours', /une seule hystérésis/],
    ['PR-PAL-MARGE', '4 points sous le seuil pendant 14 jours, descente validée par une personne', /hystérésis/],
    ['PR-TS-VARIATION-NUIT', '10', /baisse maximale/],
    ['PR-TS-GEL-J', 'après 60 jours', /délai de gel/],
    ['PR-PAL-PREMIUM', '65', /PR-PAL-CONFIRME < PR-PAL-PREMIUM/],
  ])('registre incohérent (%s) : arrêt', (code, valeur, message) => expect(() => lireMoteursRelais({ ...REGISTRE, [code]: valeur })).toThrow(message))
  it.each([
    [['g1 = 1, g2 = 2, g3 = 4', 'g1 = 2, g2 = 1, g3 = 4'], /gravités croissantes/],
    [['ancienneté 50 × min(1 ; mois ÷ 12) + 50', 'ancienneté 40 × min(1 ; mois ÷ 12) + 60'], /deux moitiés/],
  ])('calcul du Trust incohérent : arrêt', ([de, vers], message) => {
    expect(() => lireTrustRelais({ ...REGISTRE, 'PR-TRUST-CALCUL': REGISTRE['PR-TRUST-CALCUL'].replace(de, vers) })).toThrow(ParametreIllisible)
    expect(() => lireTrustRelais({ ...REGISTRE, 'PR-TRUST-CALCUL': REGISTRE['PR-TRUST-CALCUL'].replace(de, vers) })).toThrow(message)
  })
})

describe('codes et réception', () => {
  it('code de dépôt : 3 essais puis blocage 24 h', () => {
    const e1 = essaiDeCode(false, 0, LUNDI, P)
    const e2 = essaiDeCode(false, e1.essaisFaux, LUNDI, P)
    const e3 = essaiDeCode(false, e2.essaisFaux, LUNDI, P)
    expect([e1.essaisRestants, e2.essaisRestants, e3.essaisRestants]).toEqual([2, 1, 0])
    expect([e1.bloqueJusquAu, e3.bloqueJusquAu]).toEqual([null, LUNDI + 24 * HEURE])
    const pendant = essaiDeCode(true, 3, LUNDI + 23 * HEURE, P, e3.bloqueJusquAu)
    expect([pendant.accepte, pendant.essaisFaux, pendant.bloqueJusquAu]).toEqual([false, 3, e3.bloqueJusquAu])
    const apres = essaiDeCode(false, 3, LUNDI + 24 * HEURE, P, e3.bloqueJusquAu)
    expect([apres.accepte, apres.essaisFaux, apres.essaisRestants]).toEqual([false, 1, 2])
    expect(essaiDeCode(true, 2, LUNDI, P)).toEqual({ accepte: true, essaisFaux: 0, essaisRestants: 3, bloqueJusquAu: null })
    expect(() => essaiDeCode(true, -1, LUNDI, P)).toThrow(/négatif/)
  })

  it('sans code, rien n’est contrôlé', () => {
    const colis = [colisDuLot('BLV-40301', 'ok')]
    expect(controleReception(false, colis, 1, P).blocages.map((b) => b.code)).toEqual(['code_depot_requis'])
    expect(controleReception(true, colis, 1, P, { codeBloque: true }).blocages.map((b) => b.code)).toEqual(['code_depot_bloque'])
    const r = controleReception(true, colis, 1, P, { dejaRecu: true })
    expect([r.blocages.map((b) => b.code), r.recus, r.valide]).toEqual([['lot_deja_recu'], [], false])
  })

  it('lot M-4127 valide', () => {
    const colis = [...[1, 2, 3, 4, 5].map((k) => colisDuLot(`BLV-4030${k}`, 'ok')), colisDuLot('BLV-40306', 'réserve', { photos: 1 })]
    const r = controleReception(true, colis, 1, P)
    expect([r.valide, r.blocages]).toEqual([true, []])
    expect(r.recus).toEqual([1, 2, 3, 4, 5, 6].map((k) => `BLV-4030${k}`))
    expect([r.repartent, r.absents, r.aAccepterParLivreur]).toEqual([[], [], ['BLV-40306']])
  })

  it('blocages dans l’ordre', () => {
    const colis = [
      colisDuLot('A', null),
      colisDuLot('B', 'réserve'),
      colisDuLot('C', 'refusé', { photos: 1 }),
      colisDuLot('D', 'ok', { pourCeRelais: false }),
      colisDuLot('E', 'en_trop'),
      colisDuLot('F', 'ok', { annonce: false }),
      colisDuLot('B', 'ok'),
      colisDuLot('G', 'absent'),
      colisDuLot('H', 'en_trop', { annonce: false }),
      colisDuLot('I', 'refusé', { photos: 2, pourCeRelais: false }),
    ]
    const r = controleReception(true, colis, 0, P)
    expect(r.blocages.map((b) => [b.code, b.colis])).toEqual([
      ['colis_en_double', 'B'],
      ['resultat_manquant', 'A'],
      ['colis_en_trop', 'F'],
      ['resultat_incoherent', 'E'],
      ['pas_pour_ce_relais', 'D'],
      ['photo_reserve', 'B'],
      ['photos_refus', 'C'],
      ['photo_du_lot', null],
    ])
    expect(r.blocages.at(-1)!.regle).toBe('ARL-11, v6 D15')
    expect([r.recus, r.repartent, r.absents, r.aAccepterParLivreur]).toEqual([['B'], ['C', 'D', 'E', 'F', 'H', 'I'], ['G'], ['B', 'C', 'I']])
    expect(() => controleReception(true, [colisDuLot('A', 'ok')], -1, P)).toThrow()
  })

  it('places manquantes et choix du client', () => {
    const p = PARAMETRES.relais
    const o = occupation(Array.from({ length: 28 }, () => ({ classe: 'S' as const, retour: false })), 40, p)
    expect([placesManquantes(['L', 'L', 'L'], o, P), placesManquantes(['S', 'M'], o, P)]).toEqual([3, 0])
    expect(() => placesManquantes(['XL'], o, P)).toThrow(/XL/)
    const libre = occupation(Array.from({ length: 10 }, () => ({ classe: 'S' as const, retour: false })), 40, p)
    const plein = occupation(Array.from({ length: 36 }, () => ({ classe: 'S' as const, retour: false })), 40, p)
    expect([proposeAuClient(libre, 'M'), proposeAuClient(plein, 'S')]).toEqual([true, false])
    expect([proposeAuClient(libre, 'L', { accepteEncombrants: false }), proposeAuClient(libre, 'S', { accepteEncombrants: false }), proposeAuClient(libre, 'S', { ouvert: false })]).toEqual([false, true, false])
  })
})

describe('conditions de remise', () => {
  const remise = (o: Partial<DemandeDeRemise> = {}): DemandeDeRemise => ({ colis: 'BLV-60412-1', groupe: G_300, jour: JEUDI_8, codeJuste: true, ...o })
  const codes = (o: Partial<DemandeDeRemise>) => conditionsDeRemise(remise(o), P).blocages.map((b) => b.code)

  it('tout est en ordre : 300 F dus, 500 F reçus, 200 F de monnaie', () => {
    const c = conditionsDeRemise(remise({ encaissementConfirme: true, montantRecu: 500, photo: true, pinOk: true }), P)
    expect([c.possible, c.gardeAEncaisser, c.monnaieARendre, c.pieceExigee, c.annulee, c.compteHorsLigne]).toEqual([true, 300, 200, false, false, false])
  })
  it('rien n’est fait', () => expect(codes({ codeJuste: false })).toEqual(['code_requis', 'encaissement_garde', 'photo_de_remise', 'pin_requis']))
  it('garde du groupe encaissée une fois (ARL-02)', () => {
    expect(gardeAEncaisser(G_300, JEUDI_8, false, P)).toBe(300)
    const c = conditionsDeRemise(remise({ gardeDejaEncaissee: true, photo: true, pinOk: true }), P)
    expect([c.possible, c.gardeAEncaisser]).toEqual([true, 0])
  })
  it('montant reçu insuffisant', () => {
    const c = conditionsDeRemise(remise({ encaissementConfirme: true, montantRecu: 200, photo: true, pinOk: true }), P)
    expect([c.blocages.map((b) => b.code), c.monnaieARendre]).toEqual([['montant_recu_insuffisant'], 0])
  })
  it('constat et code bloqué', () => expect(codes({ constatEnCours: true, codeBloque: true, gardeDejaEncaissee: true }).slice(0, 2)).toEqual(['constat_en_cours', 'code_bloque']))
  it('paiement au comptoir, jamais hors ligne', () => {
    expect(codes({ resteAPayer: 15_000, gardeDejaEncaissee: true, photo: true, pinOk: true })).toEqual(['paiement_comptoir'])
    expect(conditionsDeRemise(remise({ resteAPayer: 15_000, paiementConfirme: true, gardeDejaEncaissee: true, photo: true, pinOk: true }), P).possible).toBe(true)
    const hl = codes({ resteAPayer: 15_000, paiementConfirme: true, horsLigne: true, gardeDejaEncaissee: true })
    expect([hl[0], hl.includes('paiement_comptoir')]).toEqual(['paiement_hors_ligne', false])
  })
  it('hors ligne : seule la garde, sous PR-HL-REMISES', () => {
    const ok = { encaissementConfirme: true, photo: true, pinOk: true, horsLigne: true }
    const dixieme = conditionsDeRemise(remise({ remisesHorsLigneDuJour: 9, ...ok }), P)
    expect([dixieme.possible, dixieme.compteHorsLigne]).toEqual([true, true])
    expect(codes({ remisesHorsLigneDuJour: 10, ...ok })).toEqual(['plafond_hors_ligne'])
    const j1 = conditionsDeRemise(remise({ jour: '2026-10-05', remisesHorsLigneDuJour: 10, ...ok }), P)
    expect([j1.possible, j1.gardeAEncaisser, j1.compteHorsLigne]).toEqual([true, 0, false])
  })
  it('3 PIN faux annulent la remise (ARL-42)', () => {
    const c = conditionsDeRemise(remise({ encaissementConfirme: true, photo: true, pinFaux: 3 }), P)
    expect([c.blocages.map((b) => b.code), c.annulee, c.blocages[0].regle]).toEqual([['remise_annulee'], true, 'ARL-42, PR-RC-31'])
  })
  it('pièce du porteur (CODE-PORTEUR)', () => {
    const gros = groupe('BLV-61000', '2026-10-05', 120_000, 121_000, false, TOUS_LES_JOURS)
    const c = conditionsDeRemise(remise({ groupe: gros, gardeDejaEncaissee: true, photo: true, pinOk: true }), P)
    expect([c.blocages.map((b) => b.code), c.pieceExigee]).toEqual([['piece_a_verifier'], true])
    const tiers = conditionsDeRemise(remise({ porteurDesigne: true, pieceVerifiee: true, gardeDejaEncaissee: true }), P)
    expect([tiers.pieceExigee, tiers.blocages.some((b) => b.code === 'piece_a_verifier')]).toEqual([true, false])
    expect(() => conditionsDeRemise(remise({ resteAPayer: -1 }), P)).toThrow()
    expect(() => conditionsDeRemise(remise({ montantRecu: -1 }), P)).toThrow()
  })
  it('PIN pendant une remise : 3 faux annulent, au 5e de suite bloqué 15 min', () => {
    expect(essaiPin(false, 2, 2, LUNDI, P)).toEqual({ accepte: false, fauxDansLaRemise: 3, fauxConsecutifs: 3, remiseAnnulee: true, bloqueJusquAu: null })
    const cinquieme = essaiPin(false, 1, 4, LUNDI, P)
    expect([cinquieme.remiseAnnulee, cinquieme.bloqueJusquAu]).toEqual([false, LUNDI + 15 * MINUTE])
    const pendant = essaiPin(true, 3, 5, LUNDI + 10 * MINUTE, P, cinquieme.bloqueJusquAu)
    expect([pendant.accepte, pendant.remiseAnnulee, pendant.fauxConsecutifs]).toEqual([false, true, 5])
    const apres = essaiPin(false, 0, 5, LUNDI + 15 * MINUTE, P, cinquieme.bloqueJusquAu)
    expect([apres.fauxConsecutifs, apres.bloqueJusquAu]).toEqual([1, null])
    const juste = essaiPin(true, 1, 1, LUNDI, P)
    expect([juste.accepte, juste.fauxDansLaRemise, juste.fauxConsecutifs]).toEqual([true, 1, 0])
    expect(() => essaiPin(true, -1, 0, LUNDI, P)).toThrow()
  })
})

const BLV_52018 = groupe('BLV-52018', '2026-09-21', 33_400, 34_180, false, MVOG_ADA)

describe('renvoi à 7 jours', () => {
  it('le dimanche fermé ne compte pas, renvoi le mar. 29 ; 2 000 F déduits ; 700 F au relais (R37, R38, R39)', () => {
    const r = renvoiAuVendeur(BLV_52018, P)!
    expect([r.jour, r.joursFermes, r.garde, r.deduitDuRemboursement, r.rembourse]).toEqual(['2026-09-29', ['2026-09-27'], 2_000, 2_000, 32_180])
    expect([r.joursPayesAuRelais, r.gainRelais, r.compteCommeRefus]).toEqual([7, 700, false])
    expect(r.trace.at(-1)).toContain('R37')
  })
  it('tous les jours ouverts, à payer au comptoir (ARL-09)', () => {
    const g = groupe('BLV-60500', '2026-10-05', 24_000, 900, false, TOUS_LES_JOURS, { auComptoir: true })
    const r = renvoiAuVendeur(g, P)!
    expect([r.jour, r.joursFermes, r.garde, r.deduitDuRemboursement, r.rembourse]).toEqual(['2026-10-12', [], 2_000, 900, 0])
    expect([r.joursPayesAuRelais, r.gainRelais, r.compteCommeRefus]).toEqual([7, 700, true])
    expect(renvoiAuVendeur({ ...g, j0: null }, P)).toBeNull()
  })
})

describe('caisse et dette du vendredi', () => {
  const vendredi = yaounde(2026, 10, 9, 11, 0)
  const gr = (groupe: string, especes: number, joursFactures: number, tarifJour: number, j1Belivay: number): GardeReglee => ({ groupe, especes, joursFactures, tarifJour, j1Belivay, annulee: false })

  it('garde réglée et caisse', () => {
    const a = gardeReglee(G_300, JEUDI_8, P)
    expect([a.especes, a.joursFactures, partRelais(a), partBelivay(a), a.j1Belivay]).toEqual([300, 3, 300, 0, 100])
    const sept = gardeReglee(G_300, '2026-10-11', P)
    expect([sept.especes, partRelais(sept), partBelivay(sept)]).toEqual([2_000, 600, 1_400])
    const petit = gardeReglee(groupe('BLV-60600', '2026-10-05', 150, 1_050, false, TOUS_LES_JOURS), '2026-10-11', P)
    expect([petit.especes, partRelais(petit), partBelivay(petit)]).toEqual([150, 600, -450])
    const annulee = gardeReglee(G_300, JEUDI_8, P, true)
    expect(caisse([a, sept, sept, annulee])).toEqual({ especes: 2_300, partRelais: 900, partBelivay: 1_400, j1Belivay: 200, contreEcritures: 1 })
  })

  it('dette de PR-RC-03 puis reversement exigé', () => {
    const s: SemaineDuRelais = { relais: 'REL-BASTOS', arrete: '2026-10-08', remises: { S: 6 }, gardes: [gr('A', 2_000, 6, 100, 0), gr('B', 1_000, 4, 100, 0)] }
    const r1 = releveHebdomadaire(s, DETTE_NULLE, vendredi, P)
    expect(r1.lignes.map((x) => [x.code, x.quantite, x.tarif, x.montant])).toEqual([
      ['colis_S', 6, 200, 1_200],
      ['garde_jours', 10, 100, 1_000],
      ['especes', 2, 0, -3_000],
      ['retenue_fiscale', 1, 0, 0],
    ])
    expect([r1.gains, r1.net, r1.aVerser, r1.dette, r1.reversementExige, r1.cle]).toEqual([2_200, -800, 0, { montant: 800, semaines: 1, echeance: null }, false, 'REL-BASTOS·2026-10-08'])
    const v2 = vendredi + 7 * 24 * HEURE
    const r2 = releveHebdomadaire({ ...s, arrete: '2026-10-15' }, r1.dette, v2, P)
    expect([r2.lignes.at(-1)!.code, r2.lignes.at(-1)!.montant]).toEqual(['report', -800])
    expect([r2.net, r2.dette.montant, r2.dette.semaines, r2.reversementExige, r2.dette.echeance]).toEqual([-1_600, 1_600, 2, true, v2 + 48 * HEURE])
    expect([encaissementSuspendu(r2.dette, v2 + 47 * HEURE), encaissementSuspendu(r2.dette, v2 + 48 * HEURE)]).toEqual([false, true])
    const r3 = releveHebdomadaire({ ...s, arrete: '2026-10-22' }, r2.dette, v2 + 7 * 24 * HEURE, P)
    expect([r3.dette.echeance, r3.dette.semaines]).toEqual([r2.dette.echeance, 3])
    expect(encaissementSuspendu(DETTE_NULLE, v2)).toBe(false)
  })

  it('dette au-delà du plafond, puis retour à zéro', () => {
    const r = releveHebdomadaire({ relais: 'REL-BASTOS', arrete: '2026-10-08', gardes: [gr('A', 25_000, 6, 100, 0)] }, DETTE_NULLE, vendredi, P)
    expect([r.net, r.dette.semaines, r.dette.echeance]).toEqual([-24_400, 1, vendredi + 48 * HEURE])
    const r2 = releveHebdomadaire({ relais: 'REL-BASTOS', arrete: '2026-10-15', remises: { S: 200, L: 10 }, niu: true }, r.dette, vendredi + 7 * 24 * HEURE, P)
    // R43 : 1 % CamPay retenu sur le versement de 19 600 F, au franc supérieur : 196 F.
    expect([r2.net, r2.aVerser, r2.dette]).toEqual([40_000 + 4_000 - 24_400 - 196, 19_404, DETTE_NULLE])
    expect(r2.lignes.some((x) => x.code === 'retenue_fiscale')).toBe(false)
  })

  it('relevé complet et idempotent', () => {
    const gros = groupe('BLV-60700', '2026-10-05', 200_000, 200_900, true, TOUS_LES_JOURS)
    const gardes = [gardeReglee(G_300, JEUDI_8, P), gardeReglee(gros, '2026-10-11', P)]
    const renvoi = renvoiAuVendeur(BLV_52018, P)!
    const s: SemaineDuRelais = { relais: 'REL-BASTOS', arrete: '2026-10-08', remises: { S: 36, M: 4, L: 1 }, retours: { M: 1 }, gardes: [...gardes, ...gardes], renvois: [renvoi, renvoi], comptoir: 2 }
    const r = releveHebdomadaire(s, DETTE_NULLE, vendredi, P)
    expect(r.lignes.map((x) => [x.code, x.quantite, x.tarif, x.montant])).toEqual([
      ['colis_S', 36, 200, 7_200],
      ['colis_M', 4, 250, 1_000],
      ['colis_L', 1, 400, 400],
      ['retour_M', 1, 250, 250],
      ['garde_jours', 9, 100, 900],
      ['garde_j1', 2, 100, 200],
      ['garde_renvois', 7, 100, 700],
      ['comptoir', 2, 50, 100], // R41
      ['especes', 2, 0, -2_300],
      ['retenue_fiscale', 1, 0, 0],
      ['frais_versement', 1, 0, -85], // R43 : 1 % de 8 450 F, au franc supérieur
    ])
    expect([r.gains, r.net, r.aVerser, r.dette]).toEqual([10_750, 8_365, 8_365, DETTE_NULLE])
    expect(releveHebdomadaire(s, DETTE_NULLE, vendredi, P)).toEqual(r)
    expect(traceReleve(r)[0]).toBe('Colis remis · petit : 36 × 200 F = 7 200 F')
    expect(traceReleve(r).at(-1)).toBe('Net : 8 365 F ; versé : 8 365 F ; dette : 0 F')
    expect(() => releveHebdomadaire({ ...s, remises: { XL: 1 } }, DETTE_NULLE, vendredi, P)).toThrow(/XL/)
  })

  it('deux tarifs de garde et retenue fiscale de 2 %', () => {
    const s: SemaineDuRelais = { relais: 'REL-BASTOS', arrete: '2026-10-08', gardes: [gr('A', 300, 3, 100, 100), gr('G', 4_100, 7, 300, 0), gr('Z', 0, 0, 100, 0)] }
    const r = releveHebdomadaire(s, DETTE_NULLE, vendredi, { ...P, retenueFiscalePourCent: 2 })
    expect(r.lignes.map((x) => [x.code, x.quantite, x.tarif, x.montant])).toEqual([
      ['garde_jours', 3, 100, 300],
      ['garde_jours', 7, 300, 2_100],
      ['garde_j1', 1, 100, 100],
      ['especes', 2, 0, -4_400],
      ['retenue_fiscale', 1, 0, -50],
    ])
  })
})

describe('Trust Score et paliers', () => {
  const ev = (critere: EvenementTrust['critere'], gravite: EvenementTrust['gravite'], ageJours = 0, dossierEnCours = false): EvenementTrust => ({ critere, gravite, ageJours, dossierEnCours })
  const avis = (etoiles: number, n: number): AvisClient[] => Array.from({ length: n }, () => ({ etoiles, ageJours: 0 }))

  it('critère lissé vers le neutre', () => {
    expect(critereTrust([], 'Ponctualité', T)).toBe(50)
    const trois = [ev('Ponctualité', 'succès'), ev('Ponctualité', 'succès'), ev('Ponctualité', 'succès')]
    expect(critereTrust(trois, 'Ponctualité', T)).toBeCloseTo(800 / 13, 9)
    expect(critereTrust([...trois, ev('Ponctualité', 'g1')], 'Ponctualité', T)).toBeCloseTo(800 / 14, 9)
    expect(critereTrust([...trois, ev('Ponctualité', 'g3', 0, true), ev('Litiges', 'g3')], 'Ponctualité', T)).toBeCloseTo(800 / 13, 9)
    expect(critereTrust([ev('Ponctualité', 'g2', 90)], 'Ponctualité', T)).toBeCloseTo(500 / 11, 9)
    expect(() => critereTrust([ev('Litiges', 'g1', -1)], 'Litiges', T)).toThrow(/âge/)
  })
  it('satisfaction de Wilson', () => {
    expect(satisfaction([], T)).toBe(50)
    expect(satisfaction(avis(5, 58), T)).toBeCloseTo(93.79, 2)
    expect(satisfaction(avis(5, 1), T)).toBeCloseTo(20.65, 2)
    expect(satisfaction([...avis(5, 40), ...avis(4, 10), ...avis(2, 8)], T)).toBeCloseTo(75.07, 2)
    expect(() => satisfaction(avis(6, 1), T)).toThrow()
  })
  it('ancienneté', () => {
    expect([anciennete(3, 400, T), anciennete(24, 1_000, T)]).toEqual([52.5, 100])
    expect(() => anciennete(-1, 0, T)).toThrow()
  })
  it('trust du relais', () => {
    const neuf = trustRelais([], [], 0, 0, T)
    expect([neuf.calcule, neuf.score, neuf.affiche, neuf.gele, neuf.baisseLimitee, neuf.criteres.Ancienneté]).toEqual([42.5, 42.5, 43, false, false, 0])
    const limite = trustRelais([], [], 0, 0, T, { precedent: 60 })
    expect([limite.score, limite.affiche, limite.baisseLimitee]).toEqual([52, 52, true])
    const gele = trustRelais([], [], 0, 0, T, { precedent: 60, joursSansActivite: 30 })
    expect([gele.score, gele.gele]).toEqual([60, true])
    const hausse = trustRelais([], [], 12, 500, T, { precedent: 40 })
    expect([hausse.score, hausse.affiche]).toEqual([57.5, 58])
    expect(() => trustRelais([], [], 0, 0, T, { joursSansActivite: -1 })).toThrow()
  })
  it('évolution des paliers', () => {
    const jours = (...v: [number, number][]) => v.flatMap(([s, n]) => Array.from({ length: n }, () => s))
    expect(evolutionPalier('Starter', jours([60, 5], [72, 9]), T)).toEqual({ palier: 'Starter', descenteProposee: null, joursTenus: 9, seuilSuivant: 70 })
    expect(evolutionPalier('Starter', jours([72, 14]), T).palier).toBe('Confirmé')
    expect(evolutionPalier('Starter', jours([86, 14]), T)).toEqual({ palier: 'Premium', descenteProposee: null, joursTenus: 0, seuilSuivant: null })
    expect(evolutionPalier('Confirmé', jours([64, 14]), T)).toMatchObject({ palier: 'Confirmé', descenteProposee: 'Starter' })
    expect(evolutionPalier('Confirmé', jours([66, 14]), T).descenteProposee).toBeNull()
    expect(evolutionPalier('Premium', jours([79, 14]), T).descenteProposee).toBe('Confirmé')
    expect(evolutionPalier('Confirmé', jours([64, 13]), T).descenteProposee).toBeNull()
    expect(evolutionPalier('Starter', jours([10, 14]), T).descenteProposee).toBeNull()
  })
  it('alerte dans les deux sens (ARL-15, PAL-06)', () => {
    const a = alerteDeSeuil(72, T)
    expect(a).toEqual({ sens: 'descente', seuil: 70, palier: 'Confirmé', ecart: 2 })
    expect(alerteDeSeuil(72.5, T)!.ecart).toBe(2.5)
    expect([alerteDeSeuil(68, T)!.sens, alerteDeSeuil(83, T)!.seuil, alerteDeSeuil(86, T)!.sens, alerteDeSeuil(70, T)!.ecart]).toEqual(['montée', 85, 'descente', 0])
    expect([alerteDeSeuil(77, T), alerteDeSeuil(66, T)]).toEqual([null, null])
    expect([alerteAEnvoyer(a, null, '2026-10-12', T), alerteAEnvoyer(a, '2026-10-06', '2026-10-12', T), alerteAEnvoyer(a, '2026-10-05', '2026-10-12', T), alerteAEnvoyer(null, null, '2026-10-12', T)]).toEqual([true, false, true, false])
    const t = { ...T, seuils: { Confirmé: 70, Premium: 73 } }
    expect([alerteDeSeuil(71.5, t)!.sens, alerteDeSeuil(71.5, t)!.seuil, alerteDeSeuil(71, t)!.seuil]).toEqual(['montée', 73, 70])
  })
  it('contestation une fois, réponse sous 72 h ouvrées', () => {
    expect(contestation(false, LUNDI, T)).toEqual({ possible: true, motif: null, reponseAvant: yaounde(2026, 10, 15, 9, 0) })
    expect(contestation(false, yaounde(2026, 10, 17, 10, 0), T).reponseAvant).toBe(yaounde(2026, 10, 21, 10, 0))
    expect([contestation(true, LUNDI, T).motif, contestation(false, LUNDI, T, { decisionClose: true }).motif, contestation(false, LUNDI, T, { alerte: true }).motif]).toEqual(['deja_contestee', 'decision_close', 'rien_a_contester'])
  })
})
