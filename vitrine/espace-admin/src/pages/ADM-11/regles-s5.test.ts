// Règles S5 : lecture du registre officiel, simulation des cas types, ventes
// flash, contenu interdit, SMS, délais du support et de la panne.
import { describe, expect, it } from 'vitest'
import { HEURE, MINUTE, yaounde } from '../../calculs/temps'
import { REGLES_S5, budgets, contenuInterdit, controlerFlash, dateEffetMin, echeanceSupport, ecrireValeur, estCritique, etatFlash, formeValeur, margeCasType, partiesSms, peutClore, plafondAchat, remiseReelle, remplir, simuler, surLePas } from './regles-s5'

const R = REGLES_S5
const T0 = yaounde(2026, 10, 13, 14, 5)

describe('paramètres S5', () => {
  it('lit le registre', () => {
    expect(R.prixRelais).toBe(900)
    expect(R.tourneeYafé).toEqual([600, 450, 350])
    expect(R.validiteH).toEqual([6, 4, 1])
    expect(R.promoHeures).toEqual([9, 20])
    expect(R.supportHeures).toEqual([7, 21])
    expect(R.codeRenvois24h).toBe(3)
    expect(R.diffusionSeuil).toBe(1000)
  })
})

describe('paramétrage (ADM-P24)', () => {
  it('forme, pas et écriture', () => {
    const f = formeValeur('900 F', null)
    expect(f).toMatchObject({ genre: 'montant', n: 900, pas: 50 })
    expect(surLePas(f, 820)).toBe(false)
    expect(ecrireValeur(f, 150000)).toBe('150 000 F')
    expect(formeValeur('1', '%')).toMatchObject({ genre: 'pourcent', pas: 0.5 })
    expect(formeValeur('6 au plus', null).genre).toBe('texte')
    expect(formeValeur('72', 'heures')).toMatchObject({ genre: 'entier', n: 72 })
  })
  it('critiques', () => {
    expect(estCritique('VD-COM-MIN')).toBe(true)
    expect(estCritique('GARDE-J2-3')).toBe(true)
    expect(estCritique('SUP-DELAI')).toBe(false)
  })
  it('plafond et marge d’un cas type (exemple du paquet)', () => {
    expect(plafondAchat(900, 200, 10)).toBe(630)
    expect(plafondAchat(800, 200, 10)).toBe(540)
    expect(margeCasType(900, 200, 600, 10)).toBe(20)
    expect(margeCasType(800, 200, 600, 10)).toBe(-80)
  })
  it('simulation : 800 F au relais bloque (marge négative, grille au-dessus du plafond) ; 950 F passe', () => {
    const base = { code: 'LIV-RELAIS-BASE', forme: formeValeur('900 F', null), dateEffet: dateEffetMin(T0, R.preavisJ), motif: 'x'.repeat(R.motifMin), reference: 'DP-68', statut: 'Décidé', maintenant: T0 }
    const bas = simuler({ ...base, apres: 800 })
    expect(bas.negatifs).toBe(4)
    expect(bas.grilleAuDessus).toBe(true)
    expect(bas.bloquee).toBe(true)
    expect(simuler({ ...base, apres: 950 }).bloquee).toBe(false)
    expect(simuler({ ...base, apres: 950, reference: '' }).controles.find((c) => c.id === 'reference')!.ok).toBe(false)
    expect(simuler({ ...base, apres: 950, dateEffet: T0 + HEURE }).controles.find((c) => c.id === 'preavis')!.ok).toBe(false)
  })
})

describe('ventes flash (ADM-P26)', () => {
  const f = { prix30: 20000, joursPratique: 30, prixFlash: 17000, debut: T0 + HEURE, fin: T0 + 3 * HEURE, stockReserve: 5, stockOffre: 8, zone: 'Z1', remiseCumuleePct: 0 }
  it('contrôles', () => {
    expect(remiseReelle(20000, 17000)).toBe(15)
    expect(controlerFlash(f, T0).every((c) => c.ok)).toBe(true)
    expect(controlerFlash({ ...f, prixFlash: 19000 }, T0).find((c) => c.id === 'remise')!.ok).toBe(false)
    expect(controlerFlash({ ...f, prixFlash: 14000 }, T0).find((c) => c.id === 'generosite')!.ok).toBe(false)
    expect(controlerFlash({ ...f, fin: f.debut + 49 * HEURE }, T0).find((c) => c.id === 'duree')!.ok).toBe(false)
    expect(controlerFlash({ ...f, joursPratique: 3 }, T0).find((c) => c.id === 'prix_barre')!.ok).toBe(false)
  })
  it('état à l’heure du serveur, arrêt automatique à stock nul', () => {
    const g = { programmee: true, debut: T0, fin: T0 + 2 * HEURE, stockReserve: 2, ventes: [T0 + 10 * MINUTE, T0 + 20 * MINUTE], arreteeLe: null, annuleeLe: null }
    expect(etatFlash(g, T0 - MINUTE).etat).toBe('programmee')
    expect(etatFlash(g, T0 + 15 * MINUTE)).toMatchObject({ etat: 'en_cours', vendus: 1 })
    expect(etatFlash(g, T0 + 30 * MINUTE)).toMatchObject({ etat: 'epuisee', finReelle: T0 + 20 * MINUTE })
    expect(etatFlash({ ...g, ventes: [] }, T0 + 3 * HEURE).etat).toBe('terminee')
    expect(etatFlash({ ...g, arreteeLe: T0 + 5 * MINUTE }, T0 + HEURE).etat).toBe('arretee')
  })
  it('budgets', () => {
    const b = budgets({ revenus: 100000, volume: 1000000, premiereAnnee: true, livraisonOfferte: 30000, gestes: 10000, remisesBelivay: 0, fidelite: 0 })
    expect(b).toMatchObject({ croissanceMax: 40000, croissanceConsomme: 40000, arretCroissance: true, fideliteMax: 35000 })
  })
})

describe('messages (ADM-P27, modèles)', () => {
  it('jamais de numéro ni de code', () => {
    expect(contenuInterdit('BelivaY : votre colis {ref} est au {relais}.')).toBeNull()
    expect(contenuInterdit('Ton code de retrait : {code}.')).toBe('code_hors_modele')
    expect(contenuInterdit('Ton code de retrait : {code}.', { codePermis: true })).toBeNull()
    expect(contenuInterdit('Appelle le 677 12 42 17')).toBe('numero')
    expect(contenuInterdit('Appelle le +237 6 99 31')).toBe('numero')
    expect(contenuInterdit('Ton code est 482913')).toBe('code')
    expect(contenuInterdit('Commande BLV-00008 : 1 000 F remboursés le 13 oct. 2026 à 14 h')).toBeNull()
    expect(contenuInterdit('{inconnu}')).toBe('variable_inconnue')
  })
  it('aperçu et parties de SMS', () => {
    expect(remplir('Colis {ref}, code {code}', { ref: 'BLV-1' })).toBe('Colis BLV-1, code ●●●●●●')
    expect(partiesSms('a'.repeat(160)).parties).toBe(1)
    expect(partiesSms('a'.repeat(161)).parties).toBe(2)
    expect(partiesSms('ê').unicode).toBe(true)
  })
})

describe('panne et support', () => {
  it('clôture seulement registre ressaisi et rapport écrit', () => {
    const rap = { cause: 'c'.repeat(R.motifMin), effets: 'e'.repeat(R.motifMin), change: 'x'.repeat(R.motifMin) }
    expect(peutClore({ retabliLe: null, rapport: rap, remises: [] }, T0)).toBe('non_retabli')
    expect(peutClore({ retabliLe: T0, rapport: rap, remises: [{ ressaisieLe: null }] }, T0)).toBe('registre')
    expect(peutClore({ retabliLe: T0, rapport: null, remises: [] }, T0)).toBe('rapport')
    expect(peutClore({ retabliLe: T0, rapport: rap, remises: [{ ressaisieLe: T0 - MINUTE }] }, T0)).toBe('ok')
  })
  it('première réponse : 2 h dans les heures d’ouverture', () => {
    expect(echeanceSupport(yaounde(2026, 10, 13, 10, 0))).toBe(yaounde(2026, 10, 13, 12, 0))
    expect(echeanceSupport(yaounde(2026, 10, 13, 20, 30))).toBe(yaounde(2026, 10, 14, 8, 30))
    expect(echeanceSupport(yaounde(2026, 10, 13, 23, 0))).toBe(yaounde(2026, 10, 14, 9, 0))
  })
})
