// Activité de la boutique (AJ-B, DP-58, page ajoutée : INTEGRATION.md § 5) : « qui a fait quoi, et quand » sur TOUTES
// les commandes, en un seul fil. Le journal signé existe commande par commande (VD-05, JRN-01, JRN-02) ; une boutique
// à plusieurs (propriétaire + accès Préparation, EQU-03) a besoin de le lire d'un coup : la journée de l'équipe, une
// remise faite par l'employé, un « Plus de temps » demandé, un bon ouvert.
// - Lecture seule (JRN-02 : rien ne s'y modifie) ; séparateurs par jour ; filtres par auteur (Tous, chaque membre,
//   Système BelivaY) et par période (Aujourd'hui, 7 jours, Tout) ; chaque ligne ouvre sa commande et son journal.
// - Anonymat : le client n'est jamais nommé (les entrées du journal ne le portent pas) ; aucun montant ajouté ici.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { JOUR, jourDe } from '../../calculs/temps'
import type { EntreeJournal } from '../../donnees/domaines/commandes'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useSession } from '../../session'
import { BandeauHorsLigne, Chargement, ErreurLecture } from '../VD-11/communs'
import './ajb.css'

type Ligne = EntreeJournal & { ref: string }
const ROLES: Record<EntreeJournal['role'], string> = { proprietaire: 'propriétaire', preparation: 'accès préparation', systeme: 'Système BelivaY' }

export default function Activite() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const maintenant = useHorloge(60_000)
  const [qui, setQui] = useState<string>('tous')
  const [periode, setPeriode] = useState<'jour' | 'semaine' | 'tout'>('semaine')
  const lecture = useLecture(async () => {
    const listes = await Promise.all((['prep', 'cours', 'pb', 'fin'] as const).map((f) => source.commandes.liste(f)))
    const refs = [...new Set(listes.flat().map((c) => c.ref))]
    const journaux = await Promise.all(refs.map((ref) => source.commandes.journal(ref).then((j) => j.map<Ligne>((e) => ({ ...e, ref })))))
    return journaux.flat().sort((a, b) => b.a - a.a)
  }, [s.membre?.role])
  const tout = lecture.donnees ?? []
  const auteurs = useMemo(() => [...new Set(tout.filter((e) => e.role !== 'systeme').map((e) => e.auteur))], [tout])
  const depuis = periode === 'jour' ? jourDe(maintenant) : periode === 'semaine' ? jourDe(maintenant - 6 * JOUR) : ''
  const visibles = tout.filter((e) => (qui === 'tous' ? true : qui === 'systeme' ? e.role === 'systeme' : e.role !== 'systeme' && e.auteur === qui) && jourDe(e.a) >= depuis)
  const texte = (x: string, a?: number) => (a !== undefined ? t(x).replace('{h}', heure(a, langue)) : t(x))
  const action = (e: EntreeJournal) => (e.action.includes('{p}') ? t(e.action).replace('{p}', e.detail ?? '') : e.role !== 'systeme' && e.detail ? `${t(e.action)} · ${texte(e.detail, e.detailA)}` : t(e.action))
  const signature = (e: EntreeJournal) => (e.role === 'systeme' ? t('Système BelivaY') : `${e.auteur} · ${t(ROLES[e.role])}`)
  const parJour: [string, Ligne[]][] = []
  for (const e of visibles) {
    const j = jourDe(e.a)
    const g = parJour[parJour.length - 1]
    if (g && g[0] === j) g[1].push(e)
    else parJour.push([j, [e]])
  }
  const nomJour = (j: string, a: number) => (j === jourDe(maintenant) ? t('Aujourd’hui') : j === jourDe(maintenant - JOUR) ? t('Hier') : jourLong(a, langue))
  const equipe = auteurs.length

  return (
    <Ecran route="activite">
      <BandeauHorsLigne />
      <p className="t14 c2" style={{ margin: '14px 2px 0', lineHeight: 1.5 }}>
        {t('Qui a fait quoi, et quand, sur toutes les commandes. Personne ne peut modifier ni effacer ce journal.')}
      </p>
      <div className="seg mt12" role="radiogroup" aria-label={t('Période')} style={{ width: '100%' }}>
        {(
          [
            ['jour', 'Aujourd’hui'],
            ['semaine', '7 jours'],
            ['tout', 'Tout'],
          ] as const
        ).map(([v, l]) => (
          <a key={v} role="radio" tabIndex={0} aria-checked={periode === v} className={periode === v ? 'on' : ''} style={{ height: '44px' }} onClick={() => setPeriode(v)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setPeriode(v))}>
            {t(l)}
          </a>
        ))}
      </div>
      {equipe > 0 && (
        <div className="chips mt10" style={{ flexWrap: 'wrap' }} role="group" aria-label={t('Auteur')}>
          {['tous', ...auteurs, 'systeme'].map((a) => (
            <button key={a} type="button" className={'chip' + (qui === a ? ' on' : '')} aria-pressed={qui === a} style={{ minHeight: '44px' }} onClick={() => setQui(a)}>
              {a === 'tous' ? t('Tous') : a === 'systeme' ? t('Système BelivaY') : a}
            </button>
          ))}
        </div>
      )}
      {lecture.erreur && <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />}
      {!lecture.donnees && !lecture.erreur && <Chargement />}
      {lecture.donnees && visibles.length === 0 && (
        <div className="card ajb-vide">
          <Icone nom="history" taille={28} style={{ color: 'var(--ink-3)' }} />
          <div className="b8 t15 mt8">{t('Rien sur cette période')}</div>
          <p className="t13 c2" style={{ margin: '6px 0 0' }}>
            {t('Choisissez « Tout » pour remonter plus loin.')}
          </p>
        </div>
      )}
      {lecture.donnees && visibles.length > 0 && (
        <p className="t12 c3" role="status" style={{ margin: '12px 2px 0' }}>
          {tf(visibles.length > 1 ? '{n} actions' : '{n} action', { n: visibles.length })}
        </p>
      )}
      {parJour.map(([j, lignes]) => (
        <div key={j}>
          <div className="divider-t">{nomJour(j, lignes[0].a)}</div>
          <div className="card tight" style={{ marginTop: 0 }}>
            {lignes.map((e, i) => (
              <Link key={`${e.ref}-${e.a}-${i}`} to={chemin('journal', { ref: e.ref })} className="li ajb-act" style={{ alignItems: 'flex-start', minHeight: '56px' }}>
                <span className={'ajb-qui ' + e.role} aria-hidden="true">
                  {e.role === 'systeme' ? <Icone nom="bot" taille={16} /> : e.auteur.split(' ').map((m) => m[0]).join('').slice(0, 2)}
                </span>
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="lt" style={{ display: 'block' }}>
                    {action(e)}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {`${e.ref} · ${signature(e)}`}
                  </span>
                </span>
                <span className="t12 c3 nw" style={{ paddingTop: '2px' }}>
                  {heure(e.a, langue)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </Ecran>
  )
}
