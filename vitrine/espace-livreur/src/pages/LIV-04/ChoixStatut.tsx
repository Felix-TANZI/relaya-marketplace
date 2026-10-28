// Feuille « Mon statut » (LIV-P05, livA_statusSheet du prototype), le seul endroit où le statut se change
// (LIV-04-R15). Trois boutons radio, couleur doublée d'un point et d'un mot :
// - Disponible : une touche, l'entreprise le voit en moins de 5 s ;
// - En pause : motif et durée facultatifs, « Passer en pause · jusqu'à <heure> » ; aucun nouveau paquet, la garde
//   continue (LIV-JOU-03) ;
// - Hors service : refusé tant qu'un colis est sous la garde du livreur, avec le nombre réel (LIV-P05R-01) : « Reprendre
//   la tournée » ou « Rester disponible ».
// Pendant un préavis de départ (DP-67), « hors service » ne coûte aucun point de Trust Score : c'est dit ici.
// Sans réseau : le changement est mis en file avec son heure ; l'entreprise voit encore le dernier statut connu
// (LIV-04-R21). Disponible depuis plus de 10 h : rappel de pause, jamais un blocage (LIV-P05R-03).
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Pourquoi } from '../../composants/enrichis'
import { Icone } from '../../composants/Icone'
import { Btn, Chips, Hint, HorsConnexion, Li, Note, Pill } from '../../composants/proto'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import type { Disponibilite } from '../../donnees/communs'
import type { EtatDisponibilite } from '../../donnees/domaines/disponibilite'
import { enAttente, geste, origine, useEnLigne, useFile } from '../../donnees/fileHorsLigne'
import { duree, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useMaintenant } from './commun'

export const STATUTS: { id: Disponibilite; mot: string; point: string; explication: string }[] = [
  { id: 'disponible', mot: 'Disponible', point: 'g', explication: 'Vous recevez des paquets' },
  { id: 'en_pause', mot: 'En pause', point: 'a', explication: 'Vous terminez vos paquets, vous n’en recevez plus' },
  { id: 'hors_service', mot: 'Hors service', point: 'x', explication: 'Fin de journée · vous consultez l’historique, vous vous formez' },
]

/** Statut en attente d'envoi (hors connexion) : « en_pause|Repas|30 ». */
export function statutEnFile(objet: string): { statut: Disponibilite; motif: string | null; minutes: number | null } {
  const [statut, motif, minutes] = objet.split('|')
  return { statut: statut as Disponibilite, motif: motif || null, minutes: minutes ? Number(minutes) : null }
}

/** Bouton radio du prototype (C.radio), en vrai bouton. */
export function Radio({ on, t, s, onClick, off }: { on: boolean; t: ReactNode; s?: ReactNode; onClick: () => void; off?: boolean }) {
  return (
    <button type="button" role="radio" aria-checked={on} className={'radio l4-radio-b' + (on ? ' on' : '')} onClick={onClick} disabled={off}>
      <span className="rd" />
      <span className="grow">
        <span className="rt" style={{ display: 'block' }}>
          {t}
        </span>
        {s && (
          <span className="rs" style={{ display: 'block' }}>
            {s}
          </span>
        )}
      </span>
    </button>
  )
}

export function ChoixStatut({ d, initial, fini, maintenantServeur }: { d: EtatDisponibilite; initial?: Disponibilite | null; fini: () => void; maintenantServeur: number }) {
  const { t, tf, langue } = usePreferences()
  const enLigne = useEnLigne()
  const file = useFile()
  const maintenant = useMaintenant(maintenantServeur, 15_000)
  const attente = enAttente(file, 'disponibilite')
  const enFile = attente.length ? statutEnFile(attente[attente.length - 1].objet) : null
  const actuel = enFile?.statut ?? d.statut
  const [choix, setChoix] = useState<Disponibilite>(initial ?? actuel)
  const [motif, setMotif] = useState<string | null>(null)
  const [minutes, setMinutes] = useState<number | null>(null)
  const [refus, setRefus] = useState<number | null>(initial === 'hors_service' && d.colisSousGarde > 0 ? d.colisSousGarde : null)
  const [msg, setMsg] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const colis = d.colisSousGarde

  const appliquer = async (statut: Disponibilite, pause?: { motif: string | null; minutes: number | null }) => {
    setMsg(null)
    if (statut === 'hors_service' && colis > 0) {
      setRefus(colis)
      return signal('alerte')
    }
    setOccupe(true)
    let refuse: { raison: string; nombre?: number } | null = null
    const o = origine(maintenant)
    const objet = [statut, pause?.motif ?? '', pause?.minutes ?? ''].join('|')
    const r = await geste(enLigne, 'disponibilite', objet, o, async (s) => {
      const x = await s.disponibilite.changer(statut, o, pause)
      if (!x.ok) refuse = x
    })
    setOccupe(false)
    if (refuse) {
      const x = refuse as { raison: string; nombre?: number }
      signal('erreur')
      if (x.raison === 'colis_sous_garde') return setRefus(x.nombre ?? colis)
      return setMsg(t('Votre compte ne peut pas recevoir de paquets : voyez l’état de votre compte.'))
    }
    signal(r.etat === 'fait' ? 'succes' : 'toucher')
    // Hors connexion, la feuille reste ouverte : elle dit que le changement est mis en file.
    if (r.etat === 'fait') fini()
  }

  const choisir = (s: Disponibilite) => {
    setChoix(s)
    setRefus(null)
    if (s === 'en_pause' && actuel !== 'en_pause') return signal('toucher')
    if (s !== actuel) void appliquer(s)
  }
  const fin = minutes ? maintenant + minutes * 60_000 : null
  const depuisH = (maintenant - d.depuis) / 3_600_000
  const precedent = STATUTS.find((x) => x.id === d.statut)!
  const pause = choix === 'en_pause' && actuel !== 'en_pause' && refus === null

  return (
    <div className="l4-statut">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="b8 t19 l4-feuille-t">{t('Mon statut')}</h2>
          <div className="t13 c3 mt4">{tf('{entreprise} le voit en temps réel dans son portail (moins de {s} s).', { entreprise: d.entreprise, s: d.regles.delaiPortailSecondes })}</div>
        </div>
        <Pill ton={colis ? 'or' : 'ink'} icone="package" sm>
          {colis === 0 ? t('Aucun colis') : colis === 1 ? t('1 colis sur vous') : tf('{n} colis sur vous', { n: colis })}
        </Pill>
      </div>
      {(!enLigne || enFile) && (
        <HorsConnexion>
          <b>{t('Hors connexion')}</b> ·{' '}
          {enFile
            ? tf('votre changement de statut part au retour du réseau. {entreprise} voit encore « {statut} » ({h}).', { entreprise: d.entreprise, statut: t(precedent.mot), h: heure(d.depuis, langue) })
            : t('votre changement de statut sera mis en file avec son heure et partira au retour du réseau.')}
        </HorsConnexion>
      )}

      <div role="radiogroup" aria-label={t('Mon statut')}>
        {STATUTS.map((s) => {
          const verrou = s.id === 'hors_service' && colis > 0
          return (
            <Radio
              key={s.id}
              on={choix === s.id}
              off={occupe}
              onClick={() => choisir(s.id)}
              t={
                <span className="row" style={{ gap: 8 }}>
                  {verrou ? <Icone nom="lock" taille={15} /> : <i className={'liva-dot ' + s.point} />}
                  {t(s.mot)}
                  {actuel === s.id && <span className="l4-actuel">{enFile ? t('mis en file') : t('actuel')}</span>}
                </span>
              }
              s={s.id === 'disponible' ? tf('Vous recevez des paquets · zones du jour : {z}', { z: d.zones.join(', ') }) : verrou ? t('Fin de journée · impossible tant que des colis sont sur vous') : s.id === 'hors_service' && d.preavisJusqua !== null ? t('Préavis en cours : aucun point de Trust Score perdu') : t(s.explication)}
            />
          )
        })}
      </div>

      {d.preavisJusqua !== null && refus === null && !pause && d.statut !== 'hors_service' && <Hint icone="moon-star">{t('Pendant le préavis, passer « hors service » ne vous coûte aucun point de Trust Score.')}</Hint>}

      {refus !== null ? (
        <>
          <Note ton="red" icone="package" role="alert">
            <b>{refus === 1 ? t('Vous avez 1 colis sur vous') : tf('Vous avez {n} colis sur vous', { n: refus })}</b> · {t('terminez la tournée avant de passer hors service : déposez-les, ou déclarez un incident validé.')}
          </Note>
          <Pourquoi>{t('Un colis sous votre garde doit arriver quelque part : déposez-le, ou signalez un incident pour que votre entreprise le fasse reprendre. Vous ne restez jamais bloqué : l’incident validé vous libère.')}</Pourquoi>
          <div className="btns liva-col mt14">
            <Btn kind="primary" icone="navigation" cls="xl" vers={chemin('tournee')}>
              {t('Reprendre la tournée')}
            </Btn>
            <Btn
              kind="secondary"
              onClick={() => {
                setRefus(null)
                setChoix(actuel)
                fini()
              }}
            >
              {t(actuel === 'disponible' ? 'Rester disponible' : 'Garder mon statut')}
            </Btn>
          </div>
        </>
      ) : pause ? (
        <>
          <div className="fld">
            <label id="l4-motif">{t('Motif (facultatif)')}</label>
          </div>
          <div role="group" aria-labelledby="l4-motif">
            <Chips items={d.regles.motifsPause.map((m) => ({ t: t(m), on: motif === m, onClick: () => setMotif(motif === m ? null : m) }))} />
          </div>
          <div className="fld">
            <label id="l4-duree">{t('Durée estimée')}</label>
          </div>
          <div role="group" aria-labelledby="l4-duree">
            <Chips items={d.regles.dureesPauseMin.map((m) => ({ t: m % 60 === 0 ? tf('{h} h', { h: m / 60 }) : tf('{m} min', { m }), on: minutes === m, onClick: () => setMinutes(minutes === m ? null : m) }))} />
          </div>
          <Note ton="amber" icone="circle-pause">
            {colis > 0 ? tf('Pendant la pause, vous terminez vos paquets : {n} colis sur vous. Aucun nouveau paquet ne vous est affecté.', { n: colis }) : t('Pendant la pause, aucun nouveau paquet ne vous est affecté. Le motif est transmis à votre entreprise.')}
          </Note>
          {!enLigne && <Hint icone="wifi-off">{t('Le statut « En pause » est mis en file avec l’heure de votre choix ; la tournée continue sans réseau.')}</Hint>}
          <div className="btns liva-col mt14">
            <Btn kind="primary" icone="circle-pause" cls="xl" off={occupe} onClick={() => void appliquer('en_pause', { motif, minutes })}>
              {!enLigne ? t('Passer en pause · mis en file') : fin ? tf('Passer en pause · jusqu’à {h}', { h: heure(fin, langue) }) : t('Passer en pause')}
            </Btn>
          </div>
        </>
      ) : d.statut === 'hors_service' ? (
        <>
          <Note ton="ink" icone="moon-star">
            <b>{tf('Hors service depuis {h}', { h: heure(d.depuis, langue) })}</b> · {tf('{entreprise} ne vous affecte plus de paquet. Votre position n’est plus enregistrée.', { entreprise: d.entreprise })}
            {d.preavisJusqua !== null && ' ' + t('Pendant le préavis, passer « hors service » ne vous coûte aucun point de Trust Score.')}
          </Note>
          <div className="card tight">
            <Li icone="history" ton="acc" t={t('Consulter l’historique')} s={t('Missions et preuves du jour')} vers={chemin('historique')} />
            <Li icone="calendar-days" ton="acc" t={t('Mon planning')} s={t('Vos horaires ; prévenir d’une absence')} vers={chemin('planning')} />
            <Li icone="graduation-cap" ton="acc" t={t('Se former')} s={t('Fiches de travail de l’aide')} vers={chemin('aide', { sujet: 'gestes' })} />
          </div>
        </>
      ) : d.statut === 'en_pause' ? (
        <Note ton="amber" icone="circle-pause">
          <b>{tf('En pause depuis {h}', { h: heure(d.depuis, langue) })}</b>
          {d.motifPause ? ' · ' + t(d.motifPause) : ''}
          {d.finPausePrevue ? ' · ' + tf('jusqu’à {h}', { h: heure(d.finPausePrevue, langue) }) : ''}. {t('Vous terminez vos paquets ; aucun nouveau ne vous est affecté.')}
        </Note>
      ) : depuisH >= d.regles.rappelPauseHeures ? (
        <Note ton="amber" icone="circle-pause">
          <b>{tf('Disponible depuis {h}', { h: heure(d.depuis, langue) })}</b>, {tf('soit {d} d’affilée : pensez à faire une pause. BelivaY ne vous bloque jamais pour ce motif.', { d: duree(maintenant - d.depuis, langue) })}
        </Note>
      ) : (
        <Note ton="acc" icone="clock">
          <b>{tf('Disponible depuis {h}', { h: heure(d.depuis, langue) })}</b>, {tf('soit {d} d’affilée. Un rappel de pause arrive après {n} heures ; BelivaY ne vous bloque jamais pour ce motif.', { d: duree(maintenant - d.depuis, langue), n: d.regles.rappelPauseHeures })}
        </Note>
      )}

      {msg && (
        <Note ton="red" icone="circle-alert" role="alert">
          {msg}{' '}
          <Link className="l4-lien" to={chemin('compte')}>
            {t('Voir l’état du compte')}
          </Link>
        </Note>
      )}
      {refus === null && !pause && d.statut !== 'hors_service' && <Hint icone="info">{tf('Votre disponibilité est une information pour {entreprise} ; elle ne vous engage pas envers BelivaY. Ne vous déclarez disponible qu’en état de conduire.', { entreprise: d.entreprise })}</Hint>}
      {refus === null && !pause && (
        <Link className="l4-lien l4-planning" to={chemin('planning')}>
          <Icone nom="calendar-days" taille={16} />
          {t('Les prochains jours : mon planning')}
        </Link>
      )}
    </div>
  )
}
