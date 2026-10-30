// Onglet « Emploi » de la fiche du livreur (DP-66, DP-67 : l'entreprise est son employeur). Fonctions d'abord, en
// sections repliables, chacune avec son résumé d'une ligne : Contrat et essai (dossier d'embauche, essai confirmé,
// prolongé une fois ou rompu), Discipline (avertissements écrits numérotés, suspension datée, réintégration),
// Horaires et zones, Congés et absences, Fin de contrat (préavis du registre, puis le chemin du départ), Attestation
// (PDF), Historique (chaque décision horodatée, avec son auteur et son motif). Chaque décision importante : motif écrit
// obligatoire, récapitulatif à confirmer, journal ; le livreur en est prévenu. Droits : décisions au propriétaire et au
// gérant ; horaires et zones aussi au répartiteur ; attestation aussi au comptable (qui lit la retenue de kit possible).
// Limite affichée sobrement : ce que fixe BelivaY (commissions, Trust Score, plafond du kit) ne se règle pas ici.
import './equipe.css'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { jouer } from '@client/composants/Sons'
import { F } from '@client/i18n/format'
import { PARAMETRES_FLOTTE } from '../../calculs/flotte'
import { Icone } from '../../composants/Icone'
import { Champ, Interdit, Kv, Pill, Rangee, telechargerFichier, type Ton } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { CreneauTravail, EtatPieceDossier, PieceDossierId, RefusEquipe } from '../../donnees/domaines/equipe'
import type { AbsenceLivreur } from '../../donnees/domaines/livreurs'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge, usePeut } from '../../session'
import { Chargement, ErreurLecture, useDates, useFeuilleParams } from '../ENT-03/outils'
import { NOM_MOTIF_ABSENCE } from '../ENT-04/Depart'

const P = PARAMETRES_FLOTTE
export const NOM_JOUR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const NOM_PIECE_DOSSIER: Record<PieceDossierId, string> = { contrat: 'Contrat de travail signé', cni: 'Carte nationale d’identité', permis: 'Permis de conduire', assurance: 'Assurance du véhicule', carte_grise: 'Carte grise', casier: 'Casier judiciaire' }
const ETAT_PIECE: Record<EtatPieceDossier, [string, Ton]> = { valide: ['À jour', 'green'], a_controler: ['À contrôler', 'amber'], manquante: ['Manquante', 'red'], expiree: ['Expirée', 'red'], non_exigee: ['Non exigé', 'ink'] }
export const REFUS: Record<RefusEquipe, string> = {
  motif: 'Écrivez le motif : il est envoyé au livreur et inscrit au journal.',
  statut: 'Ce geste n’est plus possible pour ce livreur (statut changé) : rechargez la fiche.',
  deja_prolonge: 'La période d’essai a déjà été prolongée une fois.',
  creneaux: 'Horaires invalides : un créneau par jour au plus, l’heure de fin après l’heure de début.',
  zones: 'Choisissez au moins une de vos zones déclarées.',
  dates: 'Dates invalides : la fin après le début, et pas dans le passé.',
  deja: 'Un départ est déjà en cours pour ce livreur.',
  inconnu: 'Introuvable : rechargez la fiche.',
  chevauchement: 'Ce congé chevauche un congé déjà accordé.',
}

/** Section repliable : titre et résumé d'une ligne toujours visibles, le contenu à la demande. */
function Section({ id, icone, titre, resume, ton, ouvert, children }: { id: string; icone: string; titre: string; resume: ReactNode; ton?: 'alerte'; ouvert?: boolean; children: ReactNode }) {
  return (
    <details className="drt eq-sec" id={'emploi-' + id} open={ouvert}>
      <summary>
        <span className={'eq-ic' + (ton ? ' ' + ton : '')}>
          <Icone nom={icone} taille={18} />
        </span>
        <span className="eq-tt">
          <b>{titre}</b>
          <span className="t13 c3">{resume}</span>
        </span>
        <Icone nom="chevron-down" taille={18} />
      </summary>
      <div className="drt-c">{children}</div>
    </details>
  )
}

type Genre = 'avertir' | 'suspendre' | 'reintegrer' | 'essai-confirme' | 'essai-prolonge' | 'essai-rompu' | 'fin' | 'fin-annuler' | 'conge' | 'horaires' | 'zones'

/**
 * Décision motivée en deux temps : le formulaire (motif écrit, et la date s'il en faut une), puis le récapitulatif à
 * confirmer. `envoyer` rend null si le geste est fait, sinon le texte du refus.
 */
function FormDecision(p: { titre: string; texte: ReactNode; bouton: string; danger?: boolean; motifFacultatif?: boolean; date?: { libelle: string; facultative: boolean }; dates?: boolean; envoyer: (motif: string, extra: { date: string; du: string; au: string }) => Promise<string | null>; fermer: () => void }) {
  const { t, tf } = usePreferences()
  const [motif, setMotif] = useState('')
  const [date, setDate] = useState('')
  const [du, setDu] = useState('')
  const [au, setAu] = useState('')
  const [etape, setEtape] = useState<'saisie' | 'confirmer'>('saisie')
  const [erreur, setErreur] = useState<string | null>(null)
  const [encours, setEncours] = useState(false)
  const pret = (p.motifFacultatif || motif.trim().length > 0) && (!p.date || p.date.facultative || !!date) && (!p.dates || (!!du && !!au))
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!pret || encours) return
        if (etape === 'saisie') return setEtape('confirmer')
        setEncours(true)
        const refus = await p.envoyer(motif.trim(), { date, du, au })
        setEncours(false)
        jouer(refus ? 'erreur' : 'interrupteur')
        if (refus) {
          setErreur(refus)
          setEtape('saisie')
        } else p.fermer()
      }}
    >
      <h2 className="card-t">{p.titre}</h2>
      <p className="card-s">{p.texte}</p>
      {etape === 'saisie' ? (
        <>
          {p.dates && (
            <div className="eq-2">
              <Champ t={t('Du')}>
                <input type="date" value={du} onChange={(e) => setDu(e.target.value)} required />
              </Champ>
              <Champ t={t('Au (inclus)')}>
                <input type="date" value={au} min={du || undefined} onChange={(e) => setAu(e.target.value)} required />
              </Champ>
            </div>
          )}
          {p.date && (
            <Champ t={p.date.libelle}>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required={!p.date.facultative} />
            </Champ>
          )}
          <Champ t={p.motifFacultatif ? t('Motif écrit (facultatif)') : t('Motif écrit')}>
            <textarea rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={500} />
          </Champ>
        </>
      ) : (
        <div className="eq-recap" role="status">
          <div className="t13 b8">{t('Vérifiez avant de confirmer')}</div>
          {p.dates && <Kv k={t('Dates')} v={du === au ? du : tf('du {d} au {f}', { d: du, f: au })} />}
          {p.date && <Kv k={p.date.libelle} v={date || t('aucune : jusqu’à la réintégration')} />}
          <Kv k={t('Motif écrit')} v={motif.trim() || '—'} />
          <p className="t12 c3 mt6">{t('Le livreur est prévenu ; la décision est inscrite au journal avec votre nom et l’heure.')}</p>
        </div>
      )}
      {erreur && (
        <p className="err mt10" role="alert">
          {erreur}
        </p>
      )}
      <div className="btns mt16">
        <button type="submit" className={'btn ' + (p.danger && etape === 'confirmer' ? 'danger' : 'primary')} disabled={!pret || encours}>
          {etape === 'saisie' ? t('Continuer') : tf('Confirmer : {action}', { action: p.bouton })}
        </button>
        <button type="button" className="btn ghost" onClick={() => (etape === 'confirmer' ? setEtape('saisie') : p.fermer())}>
          {etape === 'confirmer' ? t('Modifier') : t('Annuler')}
        </button>
      </div>
    </form>
  )
}

/** Horaires de la semaine : un créneau par jour (case « travaillé », heure de début et de fin). */
function FormHoraires({ initial, envoyer, fermer }: { initial: CreneauTravail[]; envoyer: (c: CreneauTravail[]) => Promise<string | null>; fermer: () => void }) {
  const { t } = usePreferences()
  const [jours, setJours] = useState(() => NOM_JOUR.map((_, jour) => initial.find((c) => c.jour === jour) ?? null))
  const [erreur, setErreur] = useState<string | null>(null)
  const changer = (jour: number, c: CreneauTravail | null) => setJours((x) => x.map((y, i) => (i === jour ? c : y)))
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        const r = await envoyer(jours.filter((x): x is CreneauTravail => !!x))
        jouer(r ? 'erreur' : 'interrupteur')
        if (r) setErreur(r)
        else fermer()
      }}
    >
      <h2 className="card-t">{t('Horaires de travail')}</h2>
      <p className="card-s">{t('Le livreur voit ses créneaux dans son application ; il prévient d’une absence, il ne les change pas.')}</p>
      <div className="eq-semaine">
        {NOM_JOUR.map((nom, jour) => {
          const c = jours[jour]
          return (
            <div key={jour} className="eq-jour">
              <label className="eq-j">
                <input type="checkbox" checked={!!c} onChange={(e) => changer(jour, e.target.checked ? { jour, de: '07:30', a: '18:00' } : null)} />
                {t(nom)}
              </label>
              {c ? (
                <span className="eq-h">
                  <input type="time" aria-label={`${t(nom)} · ${t('début')}`} value={c.de} onChange={(e) => changer(jour, { ...c, de: e.target.value })} />
                  <span aria-hidden="true">→</span>
                  <input type="time" aria-label={`${t(nom)} · ${t('fin')}`} value={c.a} onChange={(e) => changer(jour, { ...c, a: e.target.value })} />
                </span>
              ) : (
                <span className="t13 c3">{t('Repos')}</span>
              )}
            </div>
          )
        })}
      </div>
      {erreur && (
        <p className="err mt10" role="alert">
          {erreur}
        </p>
      )}
      <div className="btns mt16">
        <button type="submit" className="btn primary">
          <Icone nom="check" taille={18} />
          <span>{t('Enregistrer et prévenir le livreur')}</span>
        </button>
        <button type="button" className="btn ghost" onClick={fermer}>
          {t('Annuler')}
        </button>
      </div>
    </form>
  )
}

function FormZones({ initiales, envoyer, fermer }: { initiales: string[]; envoyer: (z: string[], motif: string) => Promise<string | null>; fermer: () => void }) {
  const { t } = usePreferences()
  const zones = useLecture(() => source.zones.zones())
  const [zs, setZs] = useState(initiales)
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        const r = await envoyer(zs, motif)
        jouer(r ? 'erreur' : 'interrupteur')
        if (r) setErreur(r)
        else fermer()
      }}
    >
      <h2 className="card-t">{t('Zones de travail')}</h2>
      <p className="card-s">{t('En tournée, le changement vaut pour ses prochains paquets.')}</p>
      <Champ t={t('Zones')} groupe>
        <div className="entA-chk">
          {(zones.donnees ?? [])
            .filter((z) => z.declaree)
            .map((z) => (
              <label key={z.code}>
                <input type="checkbox" checked={zs.includes(z.code)} onChange={(e) => setZs((x) => (e.target.checked ? [...x, z.code] : x.filter((c) => c !== z.code)))} />
                {`${z.code} · ${z.nom}`}
              </label>
            ))}
        </div>
      </Champ>
      <Champ t={t('Motif écrit (facultatif)')}>
        <textarea rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={300} />
      </Champ>
      {erreur && (
        <p className="err mt10" role="alert">
          {erreur}
        </p>
      )}
      <div className="btns mt16">
        <button type="submit" className="btn primary" disabled={!zs.length}>
          <Icone nom="check" taille={18} />
          <span>{t('Enregistrer et prévenir le livreur')}</span>
        </button>
        <button type="button" className="btn ghost" onClick={fermer}>
          {t('Annuler')}
        </button>
      </div>
    </form>
  )
}

/** Ligne « Fixé par BelivaY » : ce que l'employeur ne règle pas. */
export function FixeParBelivay({ montant }: { montant?: number | null }) {
  const { t, tf } = usePreferences()
  return (
    <p className="eq-fixe">
      <Icone nom="lock" taille={14} />
      <span>
        <b>{t('Fixé par BelivaY')}</b> · {montant != null ? tf('commissions, Trust Score et retenue de kit plafonnée à {m} F ; aucune donnée de client au-delà de la course.', { m: F(montant) }) : t('commissions, Trust Score et plafond de retenue du kit ; aucune donnée de client au-delà de la course.')}
      </span>
    </p>
  )
}

/** Télécharge l'attestation de travail (PDF rendu par la source, délivrance journalisée). */
export function useAttestation() {
  const { t } = usePreferences()
  const [refus, setRefus] = useState<string | null>(null)
  const telecharger = async (id: string) => {
    const r = await source.equipe.attestation(id)
    if (r.ok) {
      telechargerFichier(r)
      jouer('envoi')
      setRefus(null)
    } else {
      jouer('erreur')
      setRefus(t(REFUS[r.raison]))
    }
    return r.ok
  }
  return { telecharger, refus }
}

export function OngletEmploi({ id, prenom, absences }: { id: string; prenom: string; absences: AbsenceLivreur[] }) {
  const { t, tf } = usePreferences()
  const { date, dateHeure, jourCivil } = useDates()
  const maintenant = useHorloge()
  const decide = usePeut(['proprietaire', 'gerant'])
  const organise = usePeut(['proprietaire', 'gerant', 'repartiteur'])
  const atteste = usePeut(['proprietaire', 'gerant', 'comptable'])
  const lecture = useLecture(() => source.equipe.dossier(id).then((d) => ({ d })), [id])
  const feuille = useFeuilleParams('emploi', ['d'])
  const genre = feuille.param('d') as Genre | null
  const attestation = useAttestation()
  const [fait, setFait] = useState<string | null>(null)
  const d = lecture.donnees?.d
  if (lecture.erreur && !lecture.donnees) return <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />
  if (!lecture.donnees) return <Chargement lignes={4} />
  if (!d) return null
  const ouvrir = (g: Genre) => feuille.ouvrir({ d: g })
  const refus = (r: { ok: boolean; raison?: RefusEquipe | string }) => (r.ok ? null : t(REFUS[r.raison as RefusEquipe] ?? REFUS.statut))
  const apres = (texte: string) => (r: { ok: boolean }) => (r.ok && setFait(texte), r)
  const essai = d.essai
  const s = d.suspension
  const complet = d.vue === 'complete'
  const suspenduBelivay = s?.par === 'belivay'
  const retire = d.livreur.statut === 'retire'
  const horaires = d.horaires.map((c) => `${t(NOM_JOUR[c.jour]).slice(0, 3)}. ${c.de}–${c.a}`).join(' · ')

  const feuilles: Record<Genre, { titre: string; corps: ReactNode }> = {
    avertir: {
      titre: t('Avertissement écrit'),
      corps: <FormDecision titre={tf('Avertissement écrit n° {n} à {nom}', { n: d.avertissements.length + 1, nom: d.livreur.nom })} texte={t('Un avertissement écrit est la première mesure : il reste au dossier et le livreur le reçoit dans son application.')} bouton={t('Envoyer l’avertissement')} envoyer={async (m) => refus(apres(t('Avertissement envoyé.'))(await source.equipe.avertir(id, m)))} fermer={feuille.fermer} />,
    },
    suspendre: {
      titre: t('Suspendre'),
      corps: (
        <FormDecision
          titre={tf('Suspendre {nom}', { nom: d.livreur.nom })}
          texte={t('Il ne reçoit plus de paquet ; ses missions en cours se terminent. Sans date de fin, la suspension dure jusqu’à sa réintégration.')}
          bouton={t('Suspendre')}
          danger
          date={{ libelle: t('Fin de la suspension (facultative)'), facultative: true }}
          envoyer={async (m, x) => {
            const jusqua = x.date ? new Date(x.date + 'T23:59:00+01:00').getTime() : null
            const r = await source.livreurs.suspendre(id, m, jusqua)
            return r.ok ? (setFait(t('Livreur suspendu ; il est prévenu.')), null) : t(r.raison === 'date' ? 'La date de fin doit être dans le futur.' : r.raison === 'motif' ? REFUS.motif : REFUS.statut)
          }}
          fermer={feuille.fermer}
        />
      ),
    },
    reintegrer: {
      titre: t('Réintégrer'),
      corps: (
        <FormDecision
          titre={tf('Réintégrer {nom}', { nom: d.livreur.nom })}
          texte={t('La suspension prend fin : il reçoit de nouveau des paquets.')}
          bouton={t('Réintégrer')}
          envoyer={async (m) => {
            const r = await source.livreurs.lever(id, m)
            return r.ok ? (setFait(t('Livreur réintégré ; il est prévenu.')), null) : t(r.raison === 'belivay' ? 'Cette suspension a été décidée par BelivaY : vous ne pouvez pas la lever.' : REFUS.statut)
          }}
          fermer={feuille.fermer}
        />
      ),
    },
    'essai-confirme': {
      titre: t('Confirmer l’essai'),
      corps: <FormDecision titre={tf('Confirmer la période d’essai de {nom}', { nom: d.livreur.nom })} texte={t('Le contrat continue sans période d’essai.')} bouton={t('Confirmer l’essai')} motifFacultatif envoyer={async (m) => refus(apres(t('Période d’essai confirmée.'))(await source.equipe.conclureEssai(id, 'confirme', m)))} fermer={feuille.fermer} />,
    },
    'essai-prolonge': {
      titre: t('Prolonger l’essai'),
      corps: essai && <FormDecision titre={tf('Prolonger la période d’essai de {nom}', { nom: d.livreur.nom })} texte={tf('Une seule fois, de la même durée ({n} jours) : jusqu’au {d}.', { n: essai.dureeJours, d: date(essai.jusqua + essai.dureeJours * 86_400_000, true) })} bouton={t('Prolonger l’essai')} envoyer={async (m) => refus(apres(t('Période d’essai prolongée.'))(await source.equipe.conclureEssai(id, 'prolonge', m)))} fermer={feuille.fermer} />,
    },
    'essai-rompu': {
      titre: t('Rompre l’essai'),
      corps: <FormDecision titre={tf('Rompre la période d’essai de {nom}', { nom: d.livreur.nom })} texte={t('Pendant l’essai, le contrat se rompt sans préavis : le rattachement se ferme après ses missions en cours ; il garde son historique.')} bouton={t('Rompre l’essai')} danger envoyer={async (m) => refus(await source.equipe.conclureEssai(id, 'rompu', m))} fermer={feuille.fermer} />,
    },
    fin: {
      titre: t('Mettre fin au contrat'),
      corps: (
        <FormDecision
          titre={tf('Mettre fin au contrat de {nom}', { nom: d.livreur.nom })}
          texte={tf('Préavis de {p} jours (registre) : il travaille normalement jusqu’à la veille du dernier jour ; puis le kit est constaté, le dernier relevé arrêté et le versement fait le vendredi suivant. Annulable pendant le préavis.', { p: P.preavisDepartJours })}
          bouton={t('Mettre fin au contrat')}
          danger
          envoyer={async (m) => refus(apres(t('Fin de contrat notifiée ; le préavis court.'))(await source.equipe.finContrat(id, m)))}
          fermer={feuille.fermer}
        />
      ),
    },
    'fin-annuler': {
      titre: t('Annuler la fin de contrat'),
      corps: <FormDecision titre={t('Annuler la fin de contrat')} texte={tf('{nom} reste dans l’équipe ; il en est prévenu.', { nom: prenom })} bouton={t('Annuler la fin de contrat')} envoyer={async (m) => refus(apres(t('Fin de contrat annulée.'))(await source.equipe.annulerFinContrat(id, m)))} fermer={feuille.fermer} />,
    },
    conge: {
      titre: t('Accorder un congé'),
      corps: (
        <FormDecision
          titre={tf('Accorder un congé à {nom}', { nom: d.livreur.nom })}
          texte={t('Aucun paquet ne lui est affecté ces jours-là ; il en est prévenu.')}
          bouton={t('Accorder le congé')}
          dates
          envoyer={async (m, x) => refus(apres(t('Congé accordé.'))(await source.equipe.accorderConge(id, { du: x.du, au: x.au, motif: m })))}
          fermer={feuille.fermer}
        />
      ),
    },
    horaires: { titre: t('Horaires de travail'), corps: <FormHoraires initial={d.horaires} envoyer={async (c) => refus(apres(t('Horaires enregistrés ; le livreur est prévenu.'))(await source.equipe.fixerHoraires(id, c)))} fermer={feuille.fermer} /> },
    zones: { titre: t('Zones de travail'), corps: <FormZones initiales={d.zones} envoyer={async (z, m) => refus(apres(t('Zones enregistrées ; le livreur est prévenu.'))(await source.equipe.fixerZones(id, z, m.trim() || null)))} fermer={feuille.fermer} /> },
  }
  const permis: Record<Genre, boolean> = { avertir: decide, suspendre: decide, reintegrer: decide, 'essai-confirme': decide, 'essai-prolonge': decide, 'essai-rompu': decide, fin: decide, 'fin-annuler': decide, conge: decide, horaires: organise, zones: organise }
  const ouverte = feuille.ouverte && !!genre && genre in feuilles && permis[genre] && !retire

  const essaiResume = !essai ? t('pas de période d’essai') : essai.issue === 'en_cours' ? tf('essai jusqu’au {d}', { d: date(essai.jusqua, true) }) + (essai.prolonge ? ' · ' + t('prolongé') : '') : essai.issue === 'confirme' ? t('essai confirmé') : t('essai rompu')
  const contratResume = `${d.contrat.type === 'cdd' ? t('CDD') : t('CDI')}${d.contrat.debut ? ' · ' + tf('depuis le {d}', { d: date(d.contrat.debut, true) }) : ''} · ${essaiResume}`
  const manquantes = d.pieces.filter((p) => p.etat === 'manquante' || p.etat === 'expiree').length
  const disciplineResume = [s ? (suspenduBelivay ? t('suspendu par BelivaY') : s.jusqua ? tf('suspendu jusqu’au {d}', { d: date(s.jusqua) }) : t('suspendu')) : null, complet ? tf('{n} avertissement(s) écrit(s)', { n: d.avertissements.length }) : null].filter(Boolean).join(' · ') || t('aucune mesure en cours')
  const conges = d.conges.length
  const dates = (du: string, au: string) => (du === au ? tf('le {d}', { d: jourCivil(du) }) : tf('du {d} au {f}', { d: jourCivil(du), f: jourCivil(au) }))

  return (
    <div className="eq-onglet">
      <Feuille ouverte={ouverte} fermer={feuille.fermer} titre={genre && genre in feuilles ? feuilles[genre].titre : ''}>
        {ouverte && genre && feuilles[genre].corps}
      </Feuille>
      {fait && (
        <div className="dk-banner acc" role="status">
          <Icone nom="circle-check" taille={20} />
          <div className="grow">{fait}</div>
        </div>
      )}
      {lecture.erreur && <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} lu={maintenant} />}

      <Section id="contrat" icone="file-signature" titre={t('Contrat et essai')} resume={contratResume} ton={manquantes || essai?.issue === 'en_cours' ? 'alerte' : undefined} ouvert={essai?.issue === 'en_cours'}>
        <Kv k={t('Poste')} v={t(d.poste)} />
        <Kv k={t('Contrat')} v={d.contrat.type === 'cdd' ? t('Contrat à durée déterminée') : t('Contrat à durée indéterminée')} />
        <Kv k={t('Début')} v={d.contrat.debut ? date(d.contrat.debut, true) : '—'} />
        {d.contrat.fin && <Kv k={t('Fin')} v={date(d.contrat.fin, true)} />}
        {essai && (
          <>
            <h3 className="t14 b8 mt14">{t('Période d’essai')}</h3>
            <Kv k={t('Durée au contrat')} v={tf('{n} jours, prolongeable une fois', { n: essai.dureeJours })} />
            <Kv
              k={t('État')}
              v={
                essai.issue === 'en_cours'
                  ? tf('en cours jusqu’au {d}', { d: date(essai.jusqua, true) }) + (essai.prolonge ? ' · ' + t('déjà prolongée') : '')
                  : essai.issue === 'confirme'
                    ? tf('confirmée le {d}', { d: date(essai.decideLe ?? essai.jusqua, true) })
                    : tf('rompue le {d}', { d: date(essai.decideLe ?? essai.jusqua, true) })
              }
            />
            {essai.issue === 'en_cours' && decide && !retire && (
              <div className="btns mt10">
                <button type="button" className="btn primary" onClick={() => ouvrir('essai-confirme')}>
                  <Icone nom="user-round-check" taille={18} />
                  <span>{t('Confirmer l’essai')}</span>
                </button>
                {!essai.prolonge && (
                  <button type="button" className="btn secondary" onClick={() => ouvrir('essai-prolonge')}>
                    <Icone nom="hourglass" taille={18} />
                    <span>{t('Prolonger une fois')}</span>
                  </button>
                )}
                <button type="button" className="btn ghost" onClick={() => ouvrir('essai-rompu')}>
                  <Icone nom="user-x" taille={18} />
                  <span>{t('Rompre l’essai')}</span>
                </button>
              </div>
            )}
          </>
        )}
        <h3 className="t14 b8 mt14">{t('Dossier d’embauche')}</h3>
        {d.pieces.map((p) => (
          <Rangee
            key={p.id}
            icone={p.id === 'contrat' ? 'file-signature' : p.id === 'casier' ? 'scale' : p.id === 'assurance' || p.id === 'carte_grise' ? 'bike' : 'id-card'}
            ton={ETAT_PIECE[p.etat][1]}
            titre={t(NOM_PIECE_DOSSIER[p.id])}
            sous={p.expireLe ? tf('jusqu’au {d}', { d: date(p.expireLe, true) }) : p.le ? tf('le {d}', { d: date(p.le, true) }) : undefined}
            droite={
              <>
                <Pill ton={ETAT_PIECE[p.etat][1]} sm dot={p.etat !== 'valide'}>
                  {t(ETAT_PIECE[p.etat][0])}
                </Pill>
                {p.ou === 'pieces' && organise && (
                  <Link className="btn sm ghost" to={chemin('pieces', { id })}>
                    {t('Voir')}
                  </Link>
                )}
              </>
            }
          />
        ))}
        {decide && !retire && (
          <div className="fld mt10">
            <label>
              {t('Casier judiciaire')}
              <select
                value={!d.casierExige ? 'non_exige' : d.pieces.find((p) => p.id === 'casier')?.etat === 'valide' ? 'recu' : 'a_demander'}
                onChange={async (e) => {
                  const r = await source.equipe.casier(id, e.target.value as 'recu' | 'a_demander' | 'non_exige')
                  jouer(r.ok ? 'interrupteur' : 'erreur')
                }}
              >
                <option value="recu">{t('Reçu (extrait de moins de trois mois)')}</option>
                <option value="a_demander">{t('À demander au livreur')}</option>
                <option value="non_exige">{t('Non exigé pour ce poste')}</option>
              </select>
            </label>
          </div>
        )}
        <p className="t12 c3 mt8">{t('L’extrait de casier n’est pas conservé ici : seule sa date de réception est notée.')}</p>
      </Section>

      <Section id="discipline" icone="gavel" titre={t('Discipline')} resume={disciplineResume} ton={s ? 'alerte' : undefined}>
        {s ? (
          <div className={'eq-etat ' + (suspenduBelivay ? 'red' : 'amber')}>
            <b>{suspenduBelivay ? t('Suspendu par BelivaY') : t('Suspendu par votre entreprise')}</b>
            <span>{`${tf('depuis le {d}', { d: dateHeure(s.depuis) })} · ${s.jusqua ? tf('jusqu’au {d}', { d: date(s.jusqua, true) }) : t('jusqu’à la réintégration')}`}</span>
            {(complet || suspenduBelivay) && <span>{s.motif}</span>}
          </div>
        ) : (
          <p className="t13 c2">{t('Aucune suspension en cours.')}</p>
        )}
        {complet && (
          <>
            <h3 className="t14 b8 mt14">{t('Avertissements écrits')}</h3>
            {d.avertissements.length === 0 ? (
              <p className="t13 c3">{t('Aucun avertissement.')}</p>
            ) : (
              <ol className="eq-avert">
                {[...d.avertissements].reverse().map((a) => (
                  <li key={a.id}>
                    <b>{tf('N° {n}', { n: a.rang })}</b> · {a.motif}
                    <span className="t12 c3">{`${dateHeure(a.le)} · ${a.par}`}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
        {decide && !retire ? (
          <div className="btns mt10">
            <button type="button" className="btn secondary" onClick={() => ouvrir('avertir')}>
              <Icone nom="file-warning" taille={18} />
              <span>{t('Avertissement écrit')}</span>
            </button>
            {!s && d.livreur.statut !== 'en_activation' && (
              <button type="button" className="btn secondary" onClick={() => ouvrir('suspendre')}>
                <Icone nom="pause" taille={18} />
                <span>{t('Suspendre')}</span>
              </button>
            )}
            {s && !suspenduBelivay && (
              <button type="button" className="btn primary" onClick={() => ouvrir('reintegrer')}>
                <Icone nom="play" taille={18} />
                <span>{t('Réintégrer')}</span>
              </button>
            )}
          </div>
        ) : (
          !decide && <Interdit roles={['proprietaire', 'gerant']} quoi="Avertir, suspendre ou réintégrer" />
        )}
        <p className="t12 c3 mt8">{t('Échelle : avertissement écrit, suspension, fin de contrat. Une suspension décidée par BelivaY ne se lève pas ici ; le livreur garde son recours auprès de BelivaY.')}</p>
      </Section>

      <Section id="horaires" icone="calendar-clock" titre={t('Horaires et zones')} resume={`${horaires} · ${d.zones.join(', ')}`}>
        <div className="eq-grille" role="list" aria-label={t('Horaires de travail')}>
          {NOM_JOUR.map((nom, jour) => {
            const c = d.horaires.find((x) => x.jour === jour)
            return (
              <div key={jour} role="listitem" className={'eq-case' + (c ? '' : ' repos')}>
                <span className="t12 b8">{t(nom)}</span>
                <span className="t13">{c ? `${c.de} – ${c.a}` : t('Repos')}</span>
              </div>
            )
          })}
        </div>
        <Kv k={t('Zones de travail')} v={d.zones.join(' · ') || '—'} />
        {organise && !retire ? (
          <div className="btns mt10">
            <button type="button" className="btn secondary" onClick={() => ouvrir('horaires')}>
              <Icone nom="calendar-clock" taille={18} />
              <span>{t('Modifier les horaires')}</span>
            </button>
            <button type="button" className="btn secondary" onClick={() => ouvrir('zones')}>
              <Icone nom="map-pinned" taille={18} />
              <span>{t('Modifier les zones')}</span>
            </button>
          </div>
        ) : (
          !organise && <Interdit roles={['proprietaire', 'gerant', 'repartiteur']} quoi="Horaires et zones de travail" />
        )}
      </Section>

      <Section id="conges" icone="calendar-x" titre={t('Congés et absences')} resume={tf('{c} congé(s) accordé(s) · {a} absence(s) prévenue(s)', { c: conges, a: absences.length })}>
        {d.conges.length === 0 && absences.length === 0 && <p className="t13 c3">{t('Aucun congé ni absence à venir.')}</p>}
        {d.conges.map((c) => (
          <Rangee
            key={c.id}
            icone="calendar-check"
            ton="green"
            titre={`${t('Congé accordé')} · ${dates(c.du, c.au)}`}
            sous={complet ? `${c.motif} · ${c.par}` : c.par}
            droite={
              decide && (
                <button type="button" className="btn sm ghost" onClick={async () => jouer((await source.equipe.annulerConge(id, c.id)).ok ? 'interrupteur' : 'erreur')}>
                  {t('Annuler')}
                </button>
              )
            }
          />
        ))}
        {absences.map((a) => (
          <Rangee key={a.id} icone="calendar-x" ton="amber" titre={`${t('Absence prévenue')} · ${dates(a.du, a.au)}`} sous={[t(NOM_MOTIF_ABSENCE[a.motif]), a.vueLe ? t('vue') : t('à voir')].join(' · ')} />
        ))}
        <div className="btns mt10">
          {decide && !retire && (
            <button type="button" className="btn secondary" onClick={() => ouvrir('conge')}>
              <Icone nom="calendar-check" taille={18} />
              <span>{t('Accorder un congé')}</span>
            </button>
          )}
          <Link className="btn ghost" to={chemin('planning')}>
            {t('Planning des livreurs')}
          </Link>
        </div>
      </Section>

      <Section id="fin" icone="log-out" titre={t('Fin de contrat')} resume={d.finContrat ? tf('préavis jusqu’au {d}', { d: date(d.finContrat.preavisJusqua, true) }) : d.departDemande ? t('départ demandé par le livreur') : retire ? t('contrat terminé') : t('aucune')} ton={d.finContrat ? 'alerte' : undefined}>
        {d.finContrat ? (
          <>
            <Kv k={t('Décidée le')} v={`${dateHeure(d.finContrat.decideLe)} · ${d.finContrat.par}`} />
            {complet && <Kv k={t('Motif écrit')} v={d.finContrat.motif} />}
            <Kv k={t('Fin du préavis')} v={date(d.finContrat.preavisJusqua, true)} />
            <p className="t13 c2 mt8">{t('Le départ suit son cours dans le bloc « Fin de contrat » en tête de la fiche : constat du kit, dernier versement, clôture.')}</p>
            {decide && maintenant < d.finContrat.preavisJusqua && (
              <div className="btns mt10">
                <button type="button" className="btn secondary" onClick={() => ouvrir('fin-annuler')}>
                  <Icone nom="undo-2" taille={18} />
                  <span>{t('Annuler la fin de contrat')}</span>
                </button>
              </div>
            )}
          </>
        ) : d.departDemande ? (
          <p className="t13 c2">{tf('{nom} a demandé à partir : sa demande se traite dans le bloc « Départ demandé » en tête de la fiche.', { nom: prenom })}</p>
        ) : retire ? (
          <p className="t13 c2">{t('Contrat terminé : l’attestation reste disponible.')}</p>
        ) : (
          <>
            <p className="t13 c2 lh">{tf('À l’initiative de l’employeur, avec un motif écrit et un préavis de {p} jours. Le kit est ensuite constaté ; une retenue n’est possible que pour un élément manquant, avec photo, et le livreur peut la contester.', { p: P.preavisDepartJours })}</p>
            {decide ? (
              <div className="btns mt10">
                <button type="button" className="btn danger" onClick={() => ouvrir('fin')}>
                  <Icone nom="log-out" taille={18} />
                  <span>{t('Mettre fin au contrat')}</span>
                </button>
              </div>
            ) : (
              <Interdit roles={['proprietaire', 'gerant']} quoi="Mettre fin à un contrat" />
            )}
          </>
        )}
        {d.retenueKitMax !== null && <Kv k={t('Retenue de kit, au plus')} v={`${F(d.retenueKitMax)} F`} />}
      </Section>

      <Section id="attestation" icone="file-badge" titre={t('Attestation de travail')} resume={t('PDF daté, sans rémunération ni motif')}>
        <p className="t13 c2 lh">{t('Atteste du poste, du contrat et des dates d’emploi. Chaque délivrance est inscrite au journal.')}</p>
        {atteste ? (
          <div className="btns mt10">
            <button type="button" className="btn secondary" disabled={!d.contrat.debut} onClick={() => void attestation.telecharger(id)}>
              <Icone nom="file-down" taille={18} />
              <span>{t('Télécharger l’attestation')}</span>
            </button>
          </div>
        ) : (
          <Interdit roles={['proprietaire', 'gerant', 'comptable']} quoi="Attestation de travail" />
        )}
        {attestation.refus && (
          <p className="err mt8" role="alert">
            {attestation.refus}
          </p>
        )}
      </Section>

      <Section id="historique" icone="history" titre={t('Historique')} resume={tf('{n} décision(s) inscrite(s)', { n: d.historique.length })}>
        {d.historique.length === 0 ? (
          <p className="t13 c3">{t('Aucune décision encore.')}</p>
        ) : (
          <div className="tl">
            {d.historique.map((h, i) => (
              <div key={i} className={'ti ' + (h.genre === 'avertissement' || h.genre === 'suspension' || h.genre === 'fin_contrat' ? 'bad' : 'done')}>
                <div className="tt">{h.motif ? `${h.quoi} · ${h.motif}` : h.quoi}</div>
                <div className="td">{`${dateHeure(h.le)} · ${h.par}`}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <FixeParBelivay montant={d.retenueKitMax} />
    </div>
  )
}

