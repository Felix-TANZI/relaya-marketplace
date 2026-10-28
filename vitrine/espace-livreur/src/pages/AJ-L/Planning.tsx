// Page ajoutée « Mon planning » (AJ-L, motif M21), ouverte depuis Aujourd'hui, le statut, Moi et le Menu. DP-66 : le
// planning appartient à l'entreprise ; le livreur le VOIT et peut seulement PRÉVENIR D'UNE ABSENCE.
// - les créneaux du jour (arrêts de la tournée et leur heure annoncée) ;
// - deux semaines (`?semaine=2` : la suivante) : horaire prévu par l'entreprise, en lecture ; un jour couvert par une
//   absence prévenue le dit ;
// - « Prévenir d'une absence » (feuille `?sheet=absence`) : du … au … (inclus), motif de la liste (maladie, deuil ou
//   famille, panne de moto, démarches, autre) et texte facultatif (120 caractères, compteur) ; une DEMANDE que
//   l'entreprise voit (tâche et planning), jamais une modification du planning ; « vue » quand l'entreprise l'a vue.
//   DP-67 (règles affichées, jugées sur le téléphone comme au serveur : calculs/absence.ts) : prévue au moins
//   PLANNING-PREVENIR-H avant le premier créneau ; imprévu le jour même, sans pénalité avant le premier créneau ;
//   ABSENCE-MAX-J jours au plus (« voyez avec votre entreprise ») ; sans réseau, la demande entre dans la file hors
//   connexion, datée de maintenant, et part au retour du réseau ;
// - mes absences prévenues : retirées tant qu'elles n'ont pas commencé ; celles en attente d'envoi sont listées.
// Rien d'autre ne se décide ici (plus d'annonce de disponibilité : DP-66). Le statut du moment (disponible, en pause,
// hors service) reste le choix du livreur, dans « Mon statut ».
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { juger, textePropre } from '../../calculs/absence'
import { debutDuJour, jourDe } from '../../calculs/temps'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Btn, Hint, Li, Note, Pill, Sec, Seg } from '../../composants/proto'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { enAttente, geste, useEnLigne, useFile } from '../../donnees/fileHorsLigne'
import type { Absence, MotifAbsence, Planning as PlanningDonnees } from '../../donnees/domaines/disponibilite'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { LivcSh } from '../LIV-10/livc'
import { Chargement, ErreurLecture } from '../LIV-04/commun'
import { useOrigine } from '../LIV-08/commun'
import './ajl.css'

const midi = (j: string) => debutDuJour(j) + 12 * 3600_000
const TYPES: Record<string, string> = { ramassage: 'Ramassage', relais: 'Dépôt au relais', domicile: 'Remise à domicile', collecte: 'Collecte', retour: 'Retour vendeur' }
/** Motifs d'une absence (liste courte du moteur absence.py), d'un toucher. */
const MOTIFS: Record<MotifAbsence, string> = { maladie: 'Maladie', deuil_famille: 'Deuil ou famille', panne_moto: 'Panne de moto', demarches: 'Démarches', autre: 'Autre' }
const ORDRE: MotifAbsence[] = ['maladie', 'deuil_famille', 'panne_moto', 'demarches', 'autre']
const ERREURS: Record<string, string> = {
  date_passee: 'Cette date est déjà passée : choisissez aujourd’hui ou un jour à venir.',
  dates_inversees: 'Le dernier jour vient avant le premier : vérifiez les dates.',
  motif: 'Choisissez un motif dans la liste.',
  trop_longue: 'Plus de {n} jours : voyez avec votre entreprise.',
  delai: 'Trop tard pour une absence prévue (au moins {h} h avant votre premier créneau). Le jour même, seuls la maladie, un deuil ou la famille et une panne de moto sont acceptés. Sinon, voyez avec votre entreprise.',
  chevauche: 'Une absence est déjà prévenue sur un de ces jours.',
}
/** Début du premier créneau d'un jour du planning (minuit un jour de repos). */
const premierCreneau = (d: PlanningDonnees, j: string) => {
  const x = d.jours.find((y) => y.jour === j)?.horaire
  const [hh, mm] = (x?.de ?? '00:00').split(':').map(Number)
  return debutDuJour(j) + (hh * 60 + mm) * 60_000
}

export default function Planning() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const l = useLecture(() => source.disponibilite.planning(), [])
  const tournee = useLecture(() => source.tournee.courante(), [])
  const feuille = useFeuille('absence')
  const file = useFile()
  const [info, setInfo] = useState<string | null>(null)
  if (l.erreur) return <Ecran route="planning" proto><ErreurLecture relire={l.relire} /></Ecran>
  if (!l.donnees) return <Ecran route="planning" proto><Chargement lignes={4} /></Ecran>
  const d = l.donnees
  const suivante = params.get('semaine') === '2'
  const jours = d.jours.slice(suivante ? 7 : 0, suivante ? 14 : 7)
  const arrets = tournee.donnees?.arrets.filter((a) => a.etat !== 'dissocie') ?? []
  const periode = (a: Absence) => (a.du === a.au ? jourLong(midi(a.du), langue) : tf('du {de} au {a}', { de: jourLong(midi(a.du), langue), a: jourLong(midi(a.au), langue) }))
  return (
    <Ecran
      route="planning"
      proto
      fixes={
        <FeuilleAbsence
          ouverte={feuille.ouverte}
          fermer={feuille.fermer}
          planning={d}
          fait={(a, enFile, h) => {
            setInfo(enFile ? tf('Absence enregistrée {p} : elle part à {entreprise} au retour du réseau, datée de {h}.', { p: a, entreprise: d.entreprise, h }) : tf('Absence prévenue {p} : {entreprise} la voit dans son planning.', { p: a, entreprise: d.entreprise }))
            l.relire()
          }}
        />
      }
    >
      <div className="pg">
        <h1 className="pg-t">{t('Mon planning')}</h1>
        <p className="pg-s">{tf('Horaires prévus par {entreprise} · en lecture', { entreprise: d.entreprise })}</p>
      </div>
      {info && (
        <Note ton="acc" icone="calendar-check" role="status">
          {info}
        </Note>
      )}
      <Sec titre={t('Créneaux du jour')} droite={arrets.length ? (arrets.length === 1 ? t('1 arrêt') : tf('{n} arrêts', { n: arrets.length })) : undefined} />
      {arrets.length ? (
        <div className="card tight">
          {arrets.map((a) => (
            <Li key={a.id} icone={a.etat === 'fait' ? 'circle-check' : a.etat === 'echec' ? 'circle-x' : 'clock'} ton={a.etat === 'fait' ? 'green' : a.etat === 'echec' ? 'red' : a.etat === 'en_cours' ? 'acc' : 'ink'} t={`${a.ordre}. ${a.nom}`} s={[t(TYPES[a.type] ?? ''), a.quartier, tf('avant {h}', { h: heure(a.avant, langue) })].join(' · ')} droite={a.etat === 'en_cours' ? <Pill ton="acc" sm>{t('En cours')}</Pill> : undefined} vers={chemin('tournee')} />
          ))}
        </div>
      ) : (
        <Hint icone="calendar">{t('Aucun créneau pour l’instant : votre entreprise affecte les paquets au fil de la journée.')}</Hint>
      )}
      <Sec titre={t('Horaires prévus')} />
      <Seg
        label={t('Semaine')}
        items={[
          { t: t('Cette semaine'), on: !suivante, vers: chemin('planning') },
          { t: t('Semaine prochaine'), on: suivante, vers: chemin('planning', { semaine: 2 }) },
        ]}
      />
      <div className="card tight mt10">
        {jours.map((j) => (
          <Li
            key={j.jour}
            icone={j.absence ? 'calendar-x' : j.horaire ? 'calendar-days' : 'moon'}
            ton={j.absence ? 'amber' : j.horaire ? 'acc' : 'ink'}
            t={jourLong(midi(j.jour), langue)}
            s={j.horaire ? tf('{de} → {a}', { de: j.horaire.de.replace(':', ' h '), a: j.horaire.a.replace(':', ' h ') }) : t('Repos prévu')}
            droite={j.absence ? <Pill ton="amber" sm>{t('Absence prévenue')}</Pill> : undefined}
          />
        ))}
      </div>
      <Hint icone="building-2">{tf('C’est {entreprise} qui fixe vos horaires et vous affecte les paquets. Un changement se demande par message.', { entreprise: d.entreprise })}</Hint>
      <div className="btns" style={{ marginTop: 12 }}>
        <Btn kind="primary" icone="calendar-x" onClick={feuille.ouvrir}>
          {t('Prévenir d’une absence')}
        </Btn>
      </div>
      <Sec titre={t('Mes absences prévenues')} droite={d.absences.length ? String(d.absences.length) : undefined} />
      {enAttente(file, 'absence').length > 0 && (
        <Note ton="amber" icone="wifi-off" role="status">
          {enAttente(file, 'absence').length === 1 ? t('1 absence en attente d’envoi : elle part au retour du réseau, datée de sa saisie.') : tf('{n} absences en attente d’envoi : elles partent au retour du réseau, datées de leur saisie.', { n: enAttente(file, 'absence').length })}
        </Note>
      )}
      {d.absences.length ? (
        <div className="card tight">
          {d.absences.map((a) => (
            <LigneAbsence key={a.id} a={a} periode={periode(a)} relire={l.relire} />
          ))}
        </div>
      ) : (
        <Hint icone="calendar-check">{t('Aucune absence prévenue.')}</Hint>
      )}
      <div className="card tight" style={{ marginTop: 12 }}>
        <Li icone="circle-pause" ton="acc" t={t('Mon statut du moment')} s={t('Disponible, en pause, hors service')} vers={chemin('statut')} />
        <Li icone="message-circle" ton="acc" t={tf('Écrire à {entreprise}', { entreprise: d.entreprise })} s={t('Pour un changement d’horaire')} vers={chemin('messages', { fil: 'F1' })} />
      </div>
    </Ecran>
  )
}

function LigneAbsence({ a, periode, relire }: { a: Absence; periode: string; relire: () => void }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const o = useOrigine()
  const en = useEnLigne()
  const commencee = a.du <= jourDe(s.maintenant)
  const retirer = async () => {
    const r = await source.disponibilite.annulerAbsence(a.id, o())
    signal(r.ok ? 'succes' : 'erreur')
    relire()
  }
  return (
    <div className="li">
      <span className="ic amber" aria-hidden="true">
        <Icone nom="calendar-x" taille={20} />
      </span>
      <span className="grow">
        <span className="lt" style={{ display: 'block' }}>
          {periode}
        </span>
        <span className="ls" style={{ display: 'block' }}>
          {t(MOTIFS[a.motif] ?? a.motif)}
          {a.texte ? ' · ' + a.texte : ''} · {a.vueLe ? tf('vue par votre entreprise le {d}', { d: jourLong(a.vueLe, langue) }) : t('pas encore vue par votre entreprise')}
        </span>
        {a.apresDebut && (
          <span className="ls" style={{ display: 'block' }}>
            {t('Prévenue après le début du créneau : acceptée, votre entreprise le voit.')}
          </span>
        )}
      </span>
      {!commencee && (
        <Btn kind="ghost" cls="sm" icone="undo-2" off={!en} onClick={() => void retirer()} aria={tf('Retirer l’absence {p}', { p: periode })}>
          {t('Retirer')}
        </Btn>
      )}
    </div>
  )
}

/** Feuille « Prévenir d'une absence » : premier jour, dernier jour (inclus), motif de la liste, texte facultatif. */
function FeuilleAbsence({ ouverte, fermer, planning, fait }: { ouverte: boolean; fermer: () => void; planning: PlanningDonnees; fait: (periode: string, enFile: boolean, h: string) => void }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const o = useOrigine()
  const en = useEnLigne()
  const entreprise = planning.entreprise
  const r = planning.regles
  const aujourdhui = jourDe(s.maintenant)
  const [du, setDu] = useState(aujourdhui)
  const [au, setAu] = useState('')
  const [motif, setMotif] = useState<MotifAbsence | null>(null)
  const [texte, setTexte] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const remettre = () => (setDu(aujourdhui), setAu(''), setMotif(null), setTexte(''), setErreur(null))
  const quitter = () => (remettre(), fermer())
  const message = (raison: string) => tf(ERREURS[raison] ?? 'L’absence n’a pas pu être prévenue.', { n: r.maxJours, h: r.prevenirH })
  const envoyer = async () => {
    if (!motif) return
    const fin = au || du
    const x = o()
    // Jugée tout de suite, comme le serveur la jugera (même hors connexion) : délai, durée, motif.
    const j = juger(motif, du, fin, x.heure, premierCreneau(planning, du), r.prevenirH, r.maxJours)
    if (!j.ok) {
      signal('erreur')
      return setErreur(message(j.raison))
    }
    setEnvoi(true)
    let refus: string | null = null
    const g = await geste(en, 'absence', du, x, async (src) => {
      const y = await src.disponibilite.prevenirAbsence({ du, au: fin, motif, texte: textePropre(texte) || null }, x)
      if (!y.ok) refus = y.raison
    })
    setEnvoi(false)
    if (refus) {
      signal('erreur')
      return setErreur(message(refus))
    }
    signal(g.etat === 'fait' ? 'succes' : 'toucher')
    const periode = du === fin ? jourLong(midi(du), langue) : tf('du {de} au {a}', { de: jourLong(midi(du), langue), a: jourLong(midi(fin), langue) })
    remettre()
    fermer()
    fait(periode, g.etat === 'en_file', heure(x.heure, langue))
  }
  return (
    <Feuille ouverte={ouverte} fermer={quitter} titre={t('Prévenir d’une absence')} classe="livc-sheet">
      <LivcSh titre={t('Prévenir d’une absence')} sous={tf('{entreprise} est prévenue et s’organise', { entreprise })} icone="calendar-x" ton="amber" fermer={quitter} />
      <div className="lc-champ mt14">
        <label htmlFor="ajl-abs-du">{t('Premier jour')}</label>
        <input id="ajl-abs-du" type="date" min={aujourdhui} value={du} onChange={(e) => (setDu(e.target.value), setErreur(null))} />
      </div>
      <div className="lc-champ">
        <label htmlFor="ajl-abs-au">{t('Dernier jour (si plusieurs jours)')}</label>
        <input id="ajl-abs-au" type="date" min={du || aujourdhui} value={au} onChange={(e) => (setAu(e.target.value), setErreur(null))} />
      </div>
      <div className="lc-champ">
        <span className="lc-lib" id="ajl-abs-motif-l">
          {t('Motif')}
        </span>
        <div role="radiogroup" aria-labelledby="ajl-abs-motif-l">
          {ORDRE.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={motif === m} className={'radio' + (motif === m ? ' on' : '')} onClick={() => (setMotif(m), setErreur(null))}>
              <span className="rd" />
              <span className="grow">
                <span className="rt" style={{ display: 'block' }}>
                  {t(MOTIFS[m])}
                </span>
                {r.imprevus.includes(m) && (
                  <span className="rs" style={{ display: 'block' }}>
                    {t('Possible le jour même')}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="lc-champ">
        <label htmlFor="ajl-abs-texte">{t('Un mot pour votre entreprise (facultatif)')}</label>
        <input id="ajl-abs-texte" type="text" maxLength={r.texteMax} value={texte} onChange={(e) => (setTexte(e.target.value), setErreur(null))} aria-describedby="ajl-abs-compte" />
        <span className="lc-compteur" id="ajl-abs-compte">
          {tf('{n} / {max} caractères', { n: texte.length, max: r.texteMax })}
        </span>
      </div>
      {erreur && (
        <Note ton="red" icone="circle-alert" role="alert">
          {erreur}
        </Note>
      )}
      {!en && (
        <Note ton="amber" icone="wifi-off">
          {t('Sans réseau : votre demande part au retour du réseau, datée de maintenant.')}
        </Note>
      )}
      <Hint icone="clock">{tf('Absence prévue : au moins {h} h avant votre premier créneau. Maladie, deuil ou famille, panne de moto : possible le jour même, sans pénalité si vous prévenez avant votre premier créneau. {n} jours au plus par demande.', { h: r.prevenirH, n: r.maxJours })}</Hint>
      <Hint icone="info">{t('C’est une information pour votre entreprise : elle ne change pas votre planning à votre place. En cas d’urgence le jour même, appelez-la aussi.')}</Hint>
      <div className="btns" style={{ marginTop: 12 }}>
        <Btn kind="primary" icone="send" off={envoi || !du || !motif} onClick={() => void envoyer()}>
          {t('Prévenir mon entreprise')}
        </Btn>
        <Btn kind="ghost" onClick={quitter}>
          {t('Annuler')}
        </Btn>
      </div>
    </Feuille>
  )
}
