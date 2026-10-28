import { describe, expect, it } from 'vitest'
import { TRANSITIONS, etatDuJour, transition } from './cycle'
import { PARAMETRES } from './registre'

const P = PARAMETRES.relais
const remise = { photos: 1, pinOk: true, controle: 'en_ordre' as const, gardeDue: 400, encaissementConfirme: true }

describe('cycle du colis au relais', () => {
  it('réception : réserve et refus exigent une photo ; le lot se valide avec photo et PIN', () => {
    expect(transition('attendu', 'resultat_ok', {}, P)).toEqual({ ok: true, vers: 'recu' })
    expect(transition('attendu', 'resultat_reserve', {}, P)).toEqual({ ok: false, raison: 'photo_manquante' })
    expect(transition('attendu', 'resultat_refus', { photos: 1 }, P)).toEqual({ ok: true, vers: 'refuse_reception' })
    expect(transition('recu', 'valider_lot', { photos: 1 }, P)).toEqual({ ok: false, raison: 'pin_requis' })
    expect(transition('recu_reserve', 'valider_lot', { photos: 1, pinOk: true }, P)).toEqual({ ok: true, vers: 'en_stock' })
    expect(transition('remis', 'valider_lot', { photos: 1, pinOk: true }, P)).toEqual({ ok: false, raison: 'transition_interdite' })
  })
  it('remise : bloquée sans encaissement des espèces, sans paiement Mobile Money, sans contrôle, sans photo', () => {
    expect(transition('en_stock', 'remettre', remise, P)).toEqual({ ok: true, vers: 'remis' })
    expect(transition('dernier_jour', 'remettre', remise, P)).toEqual({ ok: true, vers: 'remis' })
    expect(transition('en_stock', 'remettre', { ...remise, encaissementConfirme: false }, P)).toEqual({ ok: false, raison: 'encaissement_non_confirme' })
    expect(transition('en_stock', 'remettre', { ...remise, gardeDue: 0, encaissementConfirme: false }, P).ok).toBe(true)
    expect(transition('en_stock', 'remettre', { ...remise, payableAuRetrait: true }, P)).toEqual({ ok: false, raison: 'paiement_non_confirme' })
    expect(transition('en_stock', 'remettre', { ...remise, payableAuRetrait: true, enLigne: false }, P)).toEqual({ ok: false, raison: 'reseau_requis' })
    expect(transition('en_stock', 'remettre', { ...remise, controle: null }, P)).toEqual({ ok: false, raison: 'controle_requis' })
    expect(transition('en_stock', 'remettre', { ...remise, controle: 'probleme' }, P)).toEqual({ ok: false, raison: 'probleme_signale' })
    expect(transition('en_stock', 'remettre', { ...remise, photos: 0 }, P)).toEqual({ ok: false, raison: 'photo_manquante' })
    expect(transition('en_stock', 'remettre', { ...remise, pinOk: false }, P)).toEqual({ ok: false, raison: 'pin_requis' })
    expect(transition('en_stock', 'remettre', { ...remise, codeBloque: true }, P)).toEqual({ ok: false, raison: 'code_bloque' })
    expect(transition('en_stock', 'remettre', { ...remise, formationOk: false }, P)).toEqual({ ok: false, raison: 'formation_incomplete' })
    expect(transition('a_renvoyer', 'remettre', remise, P).ok).toBe(false)
    // ARL-03 : hors connexion, garde seule due : permis, dans la limite PR-HL-REMISES par jour.
    expect(transition('en_stock', 'remettre', { ...remise, enLigne: false, remisesHorsLigneDuJour: 2 }, P).ok).toBe(true)
    expect(transition('en_stock', 'remettre', { ...remise, enLigne: false, remisesHorsLigneDuJour: P.horsLigneRemisesParJour }, P)).toEqual({ ok: false, raison: 'plafond_hors_ligne' })
  })
  it('constat : PR-CONSTAT-PHOTOS-MIN photos ; retour déposé : scellé et PR-RETOUR-PHOTOS-MIN photos', () => {
    expect(transition('en_stock', 'un_probleme', { photos: 1, pinOk: true }, P)).toEqual({ ok: false, raison: 'photo_manquante' })
    expect(transition('en_stock', 'un_probleme', { photos: 2, pinOk: true }, P)).toEqual({ ok: true, vers: 'en_constat' })
    expect(transition(null, 'depot_retour', { photos: 2, pinOk: true }, P)).toEqual({ ok: false, raison: 'scelle_requis' })
    expect(transition(null, 'depot_retour', { photos: 2, pinOk: true, scelle: 'intact' }, P)).toEqual({ ok: true, vers: 'retour_depose' })
    expect(transition('en_constat', 'decision_faire_partir', {}, P)).toEqual({ ok: true, vers: 'a_faire_partir' })
  })
  it('sortie : seulement ce qui est à faire partir, avec photo et PIN', () => {
    for (const e of TRANSITIONS.sortie.de) expect(transition(e, 'sortie', { photos: 1, pinOk: true }, P)).toEqual({ ok: true, vers: 'parti' })
    expect(transition('en_stock', 'sortie', { photos: 1, pinOk: true }, P).ok).toBe(false)
    expect(transition('a_renvoyer', 'sortie', { pinOk: true }, P)).toEqual({ ok: false, raison: 'photo_manquante' })
  })
  it('les jours avancent seuls : J7 dernier jour, J8 à renvoyer', () => {
    expect(etatDuJour('en_stock', 6, false, false)).toBe('en_stock')
    expect(etatDuJour('en_stock', 7, true, false)).toBe('dernier_jour')
    expect(etatDuJour('dernier_jour', 8, false, true)).toBe('a_renvoyer')
    expect(etatDuJour('en_constat', 8, false, true)).toBe('en_constat')
  })
})
