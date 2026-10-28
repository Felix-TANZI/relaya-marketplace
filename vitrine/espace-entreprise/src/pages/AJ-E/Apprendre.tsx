// Apprendre (AJ-E, motif M14 ; comme Apprendre du vendeur, AJ-B) : fiches courtes sur les délais, les preuves, les
// litiges, le score, le domicile et les incidents. Liste, puis une fiche ouverte par l'adresse (« ?fiche=delais »,
// lien profond depuis l'État du compte, le Score ou le tableau de bord). Chaque nombre vient du registre (fiches.ts) ;
// chaque fiche finit par le geste qui l'applique, ouvert seulement si le rôle y a accès (ENT-RG-R25). Lu sur
// l'appareil : une fiche ouverte est marquée « lue ».
import './aje.css'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Li, Note, Panel, Pill, Vide } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import { usePreferences } from '../../preferences'
import { useRouteOuverte } from '../../session'
import { FICHES } from './fiches'

const CLE = 'blv_e_fiches_lues'
const lues = (): string[] => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(CLE) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export default function Apprendre() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const ouverte = useRouteOuverte()
  const [vues, setVues] = useState(lues)
  const id = params.get('fiche')
  const f = id ? FICHES.find((x) => x.id === id) : null
  useEffect(() => {
    if (!f) return
    setVues((v) => {
      if (v.includes(f.id)) return v
      const n = [...v, f.id]
      try {
        localStorage.setItem(CLE, JSON.stringify(n))
      } catch {
        /* stockage indisponible : la fiche est lue pour la visite */
      }
      return n
    })
  }, [f])
  if (id && !f)
    return (
      <Ecran route="apprendre">
        <Vide icone="search-x" t={t('Cette fiche n’existe pas')} s={t('Elle a peut-être été renommée. Toutes les fiches sont dans Apprendre.')} action={<Link className="btn primary" to={chemin('apprendre')}>{t('Toutes les fiches')}</Link>} />
      </Ecran>
    )
  if (f)
    return (
      <Ecran route="apprendre" titre={t(f.titre)} kicker={tf('Fiche · {n} min', { n: f.minutes })} sous={t(f.resume)} retour={chemin('apprendre')}>
        <Panel titre={t('En pratique')} icone={f.icone} className="e-fiche mt14">
          <ol>
            {f.etapes.map((e) => (
              <li key={e.titre}>
                <b>{t(e.titre)}</b> — {e.valeurs ? tf(e.texte, e.valeurs) : t(e.texte)}
              </li>
            ))}
          </ol>
        </Panel>
        <Note ton="acc" icone="lightbulb" className="mt14">
          <b>{t('À retenir')} : </b>
          {f.valeursRetenir ? tf(f.retenir, f.valeursRetenir) : t(f.retenir)}
        </Note>
        <div className="btns mt16">
          {ouverte(f.agir.route) && (
            <Link className="btn primary" to={chemin(f.agir.route)}>
              <span>{t(f.agir.libelle)}</span>
              <Icone nom="chevron-right" taille={18} />
            </Link>
          )}
          <Link className="btn ghost" to={chemin('apprendre')}>
            {t('Toutes les fiches')}
          </Link>
        </div>
        <p className="t12 c3 mt14">{t('Les délais et les seuils de cette fiche sont ceux en vigueur aujourd’hui ; s’ils changent, la fiche change avec eux.')}</p>
      </Ecran>
    )
  const restantes = FICHES.filter((x) => !vues.includes(x.id)).length
  return (
    <Ecran route="apprendre">
      <div className="row mt10">
        <span className="grow t13 c3">{restantes ? tf('{n} fiche(s) à lire', { n: restantes }) : t('Toutes les fiches sont lues.')}</span>
        <Pill sm ton={restantes ? 'acc' : 'green'} dot>
          {tf('{l} / {n} lues', { l: FICHES.length - restantes, n: FICHES.length })}
        </Pill>
      </div>
      <div className="card tight mt10">
        {FICHES.map((x) => (
          <Li
            key={x.id}
            icone={x.icone}
            ton={vues.includes(x.id) ? 'ink' : 'acc'}
            t={t(x.titre)}
            s={`${t(x.resume)} · ${tf('{n} min', { n: x.minutes })}`}
            to={chemin('apprendre', { fiche: x.id })}
            droite={vues.includes(x.id) ? <Pill sm ton="green" icone="check">{t('Lue')}</Pill> : undefined}
          />
        ))}
      </div>
      <p className="t12 c3 mt14">{t('Une question qui n’est pas ici ? Écrivez au support depuis les Messages.')}</p>
    </Ecran>
  )
}
