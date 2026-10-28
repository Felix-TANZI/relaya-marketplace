// PR-08 Communication : règles du « serveur » de démonstration (notifications, messagerie, aide), au mardi 13 octobre
// 2026, 14 h 05. NTF-01 à NTF-09, MSG-01 à MSG-06, AID-03, AID-04, PR-RC-20, PR-RC-25, DP-61.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { Origine } from '../../donnees/communs'
import { REFERENCE } from '../../demo/horloge'
import { yaounde } from '../../calculs/temps'

let n = 0
const o = (heure = Date.now()): Origine => ({ cle: `pr08-${++n}`, heure, position: null })

describe('PR-08 · règles de la communication', async () => {
  beforeAll(() => void vi.setSystemTime(REFERENCE))
  vi.setSystemTime(REFERENCE)
  const { sourceDemo: s } = await import('../../demo/source-demo')
  const N = await import('../../demo/notifications')
  const M = await import('../../demo/messages')
  const { codeDemo } = await import('../../demo/colis')

  it('heures calmes 22 h – 7 h (PR-NTF-CALME) : versement envoyé à 23 h, push différé à 7 h, sans montant (PR-RC-20)', () => {
    const a23 = yaounde(2026, 10, 13, 23, 0)
    expect(N.dansHeuresCalmes(a23)).toBe(true)
    expect(N.dansHeuresCalmes(yaounde(2026, 10, 13, 6, 59))).toBe(true)
    expect(N.dansHeuresCalmes(yaounde(2026, 10, 13, 7, 0))).toBe(false)
    const p = N.etatDuPush('versements', false, a23, { push: true, approche: true, versements: true })
    expect(p).toEqual({ etat: 'differe', a: yaounde(2026, 10, 14, 7, 0) })
    // L'urgent traverse les heures calmes (NTF-07).
    expect(N.etatDuPush('critique', true, a23, { push: false, approche: false, versements: false }).etat).toBe('envoye')
    const r = N.rendre('relais.versement_envoye', { ref: 'BLV-VP-0142' })
    expect(r.texte.fr).toBe('Voir le détail · réf. BLV-VP-0142')
    expect(N.sansCodeNiMontant(r.titre.fr + r.texte.fr)).toBe(true)
    expect(N.sansCodeNiMontant('Versement envoyé · 8 400 F sur MTN')).toBe(false)
    expect(N.sansCodeNiMontant('Votre code 418306')).toBe(false)
  })

  it('interrupteurs (critère 2) : coupé, le push ne part plus ; critique et score jamais coupés (NTF-04, NTF-08)', () => {
    const t = yaounde(2026, 10, 13, 10, 0)
    const coupe = { push: false, approche: false, versements: false }
    expect(N.etatDuPush('operations', false, t, coupe).etat).toBe('coupe')
    expect(N.etatDuPush('approche', false, t, coupe).etat).toBe('coupe')
    expect(N.etatDuPush('versements', false, t, coupe).etat).toBe('coupe')
    expect(N.etatDuPush('critique', false, t, coupe).etat).toBe('envoye')
    expect(N.etatDuPush('score', false, t, coupe).etat).toBe('envoye')
  })

  it('centre : aucune notification ne porte un code ni un montant ; une par événement ; cloche = « À traiter » non lues', async () => {
    const c = await s.notifications.centre()
    expect(c.notifications.length).toBeGreaterThan(3)
    for (const x of c.notifications) for (const t of [x.titre.fr, x.titre.en, x.texte.fr, x.texte.en]) expect(N.sansCodeNiMontant(t), t).toBe(true)
    expect(new Set(c.notifications.map((x) => x.id)).size).toBe(c.notifications.length)
    expect(c.notifications.some((x) => x.modele === 'relais.photo_demandee' && !x.lue && x.aTraiter)).toBe(true)
    expect(c.notifications.some((x) => x.modele === 'relais.a_faire_partir' && x.aTraiter)).toBe(true)
    expect(c.notifications.some((x) => x.modele === 'relais.versement_envoye')).toBe(true)
    expect(N.nonLuesATraiter()).toBe(c.notifications.filter((x) => x.aTraiter && !x.lue).length)
    expect(c.resume).toMatchObject({ retraitsAttendus: expect.any(Number), placesLibres: expect.any(Number) })
    expect(c.reglages).toMatchObject({ heureResumeMin: '07:00', heuresCalmes: { de: '22:00', a: '07:00' }, approcheMin: 15 })
  })

  it('heure du résumé : jamais avant 7 h (NTF-01, critère 4), jamais après l’ouverture', async () => {
    expect(await s.notifications.regler({ heureResume: '06:30' }, o())).toEqual({ ok: false, raison: 'trop_tot' })
    expect(await s.notifications.regler({ heureResume: '09:00' }, o())).toEqual({ ok: false, raison: 'trop_tard' })
    const r = await s.notifications.regler({ heureResume: '07:30' }, o())
    expect(r.ok && r.reglages.heureResume).toBe('07:30')
  })

  it('lire et tout lire (NTF-05)', async () => {
    const c = await s.notifications.centre()
    const x = c.notifications.find((y) => !y.lue)!
    await s.notifications.lire(x.id)
    expect((await s.notifications.centre()).notifications.find((y) => y.id === x.id)!.lue).toBe(true)
    await s.notifications.toutLire()
    expect((await s.notifications.centre()).notifications.every((y) => y.lue)).toBe(true)
    expect(N.nonLuesATraiter()).toBe(0)
  })

  it('messagerie : masquage des numéros et e-mails, références intactes (MSG-01)', () => {
    expect(M.masquer('Appelez le 677 24 53 10 ou awa@mail.cm').texte).toBe('Appelez le [numéro masqué] ou [adresse masquée]')
    expect(M.masquer('Colis BLV-00043-1, lot PQ-Z1-261013-003').masque).toBe(false)
  })

  it('messagerie : photo demandée prise et envoyée depuis le fil (critère 1) ; fil logistique = réponses rapides seulement (critère 2)', async () => {
    const fils = await s.messages.fils()
    // Le fil du dossier est celui du dossier (domaine incidents, ARL-95) : la demande de BelivaY y est écrite.
    const dossier = fils.find((f) => f.type === 'dossier')!
    expect(dossier.id).toBe('T-CS-2207')
    expect(dossier.photoDemandee?.fr).toContain('photo de l’étiquette')
    expect(dossier.nonLus).toBe(1)
    const r = await s.messages.envoyer(dossier.id, '', ['ph-etiquette'], o())
    expect(r.ok).toBe(true)
    expect((await s.messages.fil(dossier.id))!.photoDemandee).toBeNull()
    expect((await s.incidents.dossier('CS-2207'))!.demande!.faiteA).not.toBeNull()
    const log = fils.find((f) => f.type === 'logistique')!
    expect(await s.messages.envoyer(log.id, 'Bonjour', [], o())).toEqual({ ok: false, raison: 'reponses_rapides_seulement' })
    expect((await s.messages.repondreVite(log.id, 0, o())).ok).toBe(true)
  })

  it('« Rappelez-moi » : un rappel à la fois, dans les heures du support (MSG-06)', async () => {
    const sup = (await s.messages.fils()).find((f) => f.type === 'support')!
    const i = sup.reponsesRapides.findIndex((x) => x.fr === 'Rappelez-moi')
    const r = await s.messages.repondreVite(sup.id, i, o())
    expect(r.ok).toBe(true)
    expect(await s.messages.repondreVite(sup.id, i, o())).toEqual({ ok: false, raison: 'deja_demande' })
    expect((await s.messages.support()).rappelAvant).not.toBeNull()
  })

  it('formulaire d’aide : crée un fil Support visible tout de suite (AID-03)', async () => {
    expect(await s.messages.ecrireAuSupport({ categorie: 'stock', reference: 'XYZ', texte: 'Question', pieces: [] }, o())).toEqual({ ok: false, raison: 'reference_invalide' })
    const r = await s.messages.ecrireAuSupport({ categorie: 'stock', reference: 'blv-00031-1', texte: 'Étiquette effacée, mon numéro 699 31 84 42', pieces: [] }, o())
    expect(r.ok).toBe(true)
    const f = (await s.messages.fils()).find((x) => r.ok && x.id === r.filId)!
    expect(f.titre.fr).toBe('Demande · Stock · BLV-00031-1')
    expect(f.messages[0].texte).toContain('[numéro masqué]')
  })

  it('appel masqué : support pendant ses heures, livreur seulement pendant sa mission (DP-61, PR-RC-25), journal sans contenu', async () => {
    const j = await s.messages.joignables()
    expect(j.find((x) => x.cible === 'support')!.ouvert).toBe(true)
    expect(j.find((x) => x.cible === 'livreur')!.ouvert).toBe(false) // lot de 15 h 15 pas encore en approche à 14 h 05
    expect(await s.messages.appeler('livreur', o())).toEqual({ ok: false, raison: 'ferme' })
    const a = await s.messages.appeler('support', o())
    expect(a.ok).toBe(true)
    if (!a.ok) return
    expect(await s.messages.appeler('support', o())).toEqual({ ok: false, raison: 'deja_en_cours' })
    const fin = await s.messages.raccrocher(a.appel.id, o(a.appel.debut + 95_000))
    expect(fin.ok && fin.appel.dureeS).toBe(95)
  })

  it('mode papier : colis sans montant seulement, code vérifié, saisie dans le délai (AID-04, OFF-06)', async () => {
    const r = await s.aide.registre()
    expect(r.panne?.reference).toBe('DIF-0312')
    const base = { panne: 'DIF-0312', heure: yaounde(2026, 10, 12, 17, 0), pieceVerifiee: true, signature: true, photo: 'ph-registre', pin: '240913' }
    expect(await s.aide.saisirLigne({ ...base, reference: 'BLV-00031-1', code: '000000' }, o())).toEqual({ ok: false, raison: 'code_faux' })
    // Garde due le 12 (4e jour) : jamais remis sur papier.
    expect(await s.aide.saisirLigne({ ...base, reference: 'BLV-00037-1', code: codeDemo('BLV-00037-1') }, o())).toEqual({ ok: false, raison: 'montant_du' })
    expect(await s.aide.saisirLigne({ ...base, heure: yaounde(2026, 10, 12, 18, 0), reference: 'BLV-00031-1', code: codeDemo('BLV-00031-1') }, o())).toEqual({ ok: false, raison: 'hors_panne' })
    const ok = await s.aide.saisirLigne({ ...base, reference: 'BLV-00031-1', code: codeDemo('BLV-00031-1') }, o())
    expect(ok.ok).toBe(true)
    const st = await s.stock.stock('tous')
    expect(st.colis.some((c) => c.id === 'BLV-00031-1')).toBe(false)
  })

  it('aide du gérant : 7 questions fréquentes, paiement et convention (l’employé ne les reçoit pas, ARL-06)', async () => {
    const a = await s.aide.aide()
    expect(a.questions.map((q) => q.id)).toContain('paiement')
    expect(a.convention.length).toBeGreaterThan(0)
    expect(a.questions).toHaveLength(7)
  })
})
