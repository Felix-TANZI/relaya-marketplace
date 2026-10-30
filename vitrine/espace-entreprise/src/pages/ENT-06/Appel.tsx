// Appel masqué (DP-61, DED-14, ENT-ANO-02) : l'entreprise joint son livreur pendant la mission par appel dans
// l'application, par une ligne BelivaY (numéro masqué des deux côtés) ou par SMS masqué en repli ; jamais le vrai
// numéro. La ligne s'ouvre à l'affectation et se ferme à la clôture ; chaque appel est journalisé pour l'administrateur
// (horodatage, durée, sans contenu). L'appel dans l'application ne bloque pas l'espace : il passe dans le panneau
// flottant commun (composants/AppelEnCours.tsx), réductible en bulle, qui suit sur toutes les pages ; la feuille se
// ferme. La ligne masquée (numéro à composer) et le SMS de repli restent dans la feuille.
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { jouer } from '@client/composants/Sons'
import { lancerAppel } from '../../composants/AppelEnCours'
import { Icone } from '../../composants/Icone'
import { source } from '../../donnees/source'
import type { Appel } from '../../donnees/domaines/missions'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Retour, useDonnees, useHeure } from '../ENT-05/commun'

export function FeuilleAppel({ ouverte, fermer, missionId, livreur }: { ouverte: boolean; fermer(): void; missionId: string; livreur: string }) {
  const { t, tf } = usePreferences()
  const h = useHeure()
  const entreprise = useSession().entreprise?.nom ?? ''
  const [appel, setAppel] = useState<Appel | null>(null)
  const [fini, setFini] = useState(false)
  const [ferme, setFerme] = useState(false)
  const [s, setS] = useState(0)
  const journal = useDonnees(() => source.missions.appels(missionId), [missionId])
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  useEffect(() => {
    if (!appel || fini || appel.canal === 'sms_masque') return
    const id = setInterval(() => setS((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [appel, fini])
  const lancer = async (canal: Appel['canal']) => {
    setFerme(false)
    setFini(false)
    setS(0)
    const r = await source.missions.appeler(missionId, canal)
    if (!r.ok) return setFerme(true)
    jouer('envoi')
    if (canal === 'application') {
      const id = r.appel.id
      lancerAppel({
        nom: livreur,
        qui: 'Livreur',
        motif: tf('Mission {m}', { m: missionId }),
        canal: 'Appel dans l’application',
        raccrocher: () => source.missions.raccrocher(id),
        noter: (note) => source.missions.noterAppel(id, note),
      })
      // Toutes les feuilles se ferment (aussi celle de la mission d'où l'on appelait) : l'espace reste utilisable.
      const p = new URLSearchParams(params)
      p.delete('sheet')
      naviguer({ search: p.toString() }, { replace: true })
      return
    }
    setAppel(r.appel)
    if (canal === 'sms_masque') setFini(true)
  }
  const raccrocher = async () => {
    if (appel) await source.missions.raccrocher(appel.id)
    setFini(true)
  }
  const quitter = () => {
    if (appel && !fini) void raccrocher()
    setAppel(null)
    setFini(false)
    fermer()
  }
  return (
    <Feuille ouverte={ouverte} fermer={quitter} titre={tf('Joindre {n}', { n: livreur })}>
      <div className="grab"></div>
      <h2 className="lv-h2">
        <Icone nom="phone" taille={18} />
        {tf('Joindre {n}', { n: livreur })}
      </h2>
      {ferme && <Retour ton="rouge">{t('La ligne est fermée : elle n’est ouverte que de l’affectation à la clôture de la mission.')}</Retour>}
      {appel && appel.canal !== 'sms_masque' ? (
        <div className="lv-appel">
          <span className={'rond' + (fini ? '' : ' sonne')}>
            <Icone nom={fini ? 'phone-off' : 'phone'} taille={34} />
          </span>
          {appel.canal === 'numero_masque' && !fini ? (
            <>
              <p className="lv-s">{t('Composez la ligne BelivaY : elle relie votre téléphone à celui du livreur sans montrer aucun numéro.')}</p>
              <p className="num">{appel.ligne}</p>
            </>
          ) : (
            <p className="num">{fini ? t('Appel terminé') : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`}</p>
          )}
          <p className="lv-s">{fini ? tf('Durée {d} s, notée au journal de la mission (sans contenu).', { d: s }) : tf('Le livreur voit « BelivaY · {e} », jamais votre numéro.', { e: entreprise })}</p>
          {fini ? (
            <button type="button" className="btn ghost" onClick={quitter}>
              {t('Fermer')}
            </button>
          ) : (
            <button type="button" className="btn danger" onClick={raccrocher}>
              <Icone nom="phone-off" taille={18} />
              {t('Raccrocher')}
            </button>
          )}
        </div>
      ) : (
        <>
          {appel?.canal === 'sms_masque' && <Retour ton="ok">{t('SMS masqué envoyé : « Votre entreprise cherche à vous joindre, rappelez depuis l’application. »')}</Retour>}
          <div className="lv-col mt10">
            <button type="button" className="btn primary bloc" onClick={() => lancer('application')}>
              <Icone nom="phone" taille={18} />
              {t('Appeler dans l’application')}
            </button>
            <button type="button" className="btn secondary bloc" onClick={() => lancer('numero_masque')}>
              <Icone nom="shield" taille={18} />
              {t('Appeler par la ligne masquée BelivaY')}
            </button>
            <button type="button" className="btn ghost bloc" onClick={() => lancer('sms_masque')}>
              <Icone nom="message-square" taille={18} />
              {t('Repli : SMS masqué')}
            </button>
          </div>
          <p className="lv-note">
            <Icone nom="venetian-mask" taille={16} />
            <span>{t('Jamais le vrai numéro, ni le vôtre ni le sien. Chaque appel est noté pour BelivaY : qui, quand, combien de temps, jamais ce qui a été dit.')}</span>
          </p>
        </>
      )}
      {journal.donnees && journal.donnees.length > 0 && (
        <>
          <h3 className="sec">{t('Appels de la mission')}</h3>
          <ul className="lv-journal">
            {journal.donnees.map((a) => (
              <li key={a.id}>
                <time>{h(a.debut)}</time>
                <span>
                  {t(a.canal === 'application' ? 'Appel dans l’application' : a.canal === 'numero_masque' ? 'Ligne masquée' : 'SMS masqué')}
                  {a.dureeS !== null && a.canal !== 'sms_masque' && <span className="lv-s"> · {tf('{d} s', { d: a.dureeS })}</span>}
                  {a.note && <span className="lv-s lv-appel-note">{a.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Feuille>
  )
}
