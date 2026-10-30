// Activité de l'équipe (AJ-E, motif M22 ; DED-17) : qui a fait quoi, quand — prise et affectation des paquets,
// flotte, réponses aux litiges, équipe et réglages. Lu dans le journal signé (source.compte.activite), ajout seul :
// rien ne s'y modifie ni ne s'efface. Filtres par genre et par personne (« ?g=paquets&p=Serge Mbarga »), recherche,
// regroupement par jour, export CSV de ce qui est affiché. Aucun montant : lisible par chaque rôle.
import './aje.css'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Choix, exporterCsv, Hint, Pill, Vide } from '../../composants/prototype'
import { sansAccents } from '../../composants/recherche'
import { NOM_ROLE } from '../../config/libelles'
import { chemin } from '../../config/pages'
import type { LigneActivite } from '../../donnees/domaines/compte'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useRouteOuverte } from '../../session'
import { Chargement, ErreurLecture, useDates } from '../ENT-03/outils'

type Genre = LigneActivite['genre'] | 'tout'
const GENRES: { id: Genre; titre: string; icone: string }[] = [
  { id: 'tout', titre: 'Tout', icone: 'list' },
  { id: 'paquets', titre: 'Paquets', icone: 'boxes' },
  { id: 'flotte', titre: 'Flotte', icone: 'users' },
  { id: 'litiges', titre: 'Litiges', icone: 'scale' },
  { id: 'equipe', titre: 'Équipe et compte', icone: 'building-2' },
]

export default function Activite() {
  const { t, tf } = usePreferences()
  const [params, setParams] = useSearchParams()
  const ouverte = useRouteOuverte()
  const { heure, jour } = useDates()
  const lecture = useLecture(() => source.compte.activite(), [])
  const [q, setQ] = useState('')
  const genre = (GENRES.find((g) => g.id === params.get('g'))?.id ?? 'tout') as Genre
  const qui = params.get('p')
  const poser = (k: string, v: string | null) => {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v)
    else p.delete(k)
    setParams(p, { replace: true })
  }
  const lignes = lecture.donnees ?? []
  const personnes = [...new Set(lignes.map((l) => l.par))]
  const n = sansAccents(q.trim())
  const visibles = useMemo(
    () => lignes.filter((l) => (genre === 'tout' || l.genre === genre) && (!qui || l.par === qui) && (!n || sansAccents(`${t(l.quoi)} ${l.quoi} ${l.objet ?? ''} ${l.par}`).includes(n))),
    [lignes, genre, qui, n, t],
  )
  const jours = new Map<string, LigneActivite[]>()
  for (const l of visibles) {
    const j = jour(l.le)
    jours.set(j, [...(jours.get(j) ?? []), l])
  }
  const exporter = () =>
    exporterCsv('activite-equipe.csv', [t('Date'), t('Heure'), t('Personne'), t('Rôle'), t('Geste'), t('Objet')], visibles.map((l) => [jour(l.le), heure(l.le), l.par, l.role ? t(NOM_ROLE[l.role]) : '', t(l.quoi), l.objet ?? '']))
  return (
    <Ecran
      route="activite"
      actions={
        <button type="button" className="btn secondary" onClick={exporter} disabled={!visibles.length}>
          <Icone nom="download" taille={18} />
          <span>{t('Exporter (CSV)')}</span>
        </button>
      }
    >
      <Choix forme="chips" aria={t('Genre de geste')} actif={genre} choisir={(g) => poser('g', g === 'tout' ? null : g)} items={GENRES.map((g) => ({ id: g.id, t: t(g.titre), icone: g.icone, n: g.id === 'tout' ? lignes.length : lignes.filter((l) => l.genre === g.id).length }))} />
      <div className="g g2 mt12">
        <label className="fld fld-l" style={{ marginTop: 0 }}>
          <span className="fld-t">{t('Chercher un geste ou un objet')}</span>
          <span className="inp">
            <Icone nom="search" taille={17} />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('PQ-…, LT-…, réponse, livreur…')} />
          </span>
        </label>
        <label className="fld fld-l" style={{ marginTop: 0 }}>
          <span className="fld-t">{t('Personne')}</span>
          <span className="inp">
            <select value={qui ?? ''} onChange={(e) => poser('p', e.target.value || null)}>
              <option value="">{t('Toute l’équipe')}</option>
              {personnes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </span>
        </label>
      </div>
      {lecture.erreur && <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />}
      {!lecture.donnees && !lecture.erreur && <Chargement lignes={3} />}
      {lecture.donnees &&
        (visibles.length === 0 ? (
          <Vide icone="history" t={lignes.length ? t('Aucun geste ne correspond') : t('Aucun geste pour l’instant')} s={lignes.length ? t('Changez le filtre ou la recherche.') : t('Chaque prise de paquet, affectation, réponse ou réglage de l’équipe s’inscrira ici.')} />
        ) : (
          [...jours].map(([j, ls]) => (
            <section key={j} aria-label={j}>
              <div className="sec">
                <h2>{j}</h2>
                <Pill sm>{tf('{n} geste(s)', { n: ls.length })}</Pill>
              </div>
              <div className="card">
                <ul className="e-journal">
                  {ls.map((l) => (
                    <li key={l.id}>
                      <span className="h">{heure(l.le)}</span>
                      <span className="grow">
                        <span className="q" style={{ display: 'block' }}>
                          {t(l.quoi)}
                          {l.objet && (
                            <>
                              {' · '}
                              {l.lien && ouverte(l.lien.route) ? <Link to={chemin(l.lien.route, l.lien.id ? { id: l.lien.id } : undefined)}>{l.objet}</Link> : l.objet}
                            </>
                          )}
                        </span>
                        <span className="p" style={{ display: 'block' }}>{l.role ? `${l.par} · ${t(NOM_ROLE[l.role])}` : l.par}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))
        ))}
      <Hint icone="shield-check">{t('Le journal est signé : chaque ligne est chaînée à la précédente et relue par BelivaY ; une ligne ne s’efface jamais.')}</Hint>
    </Ecran>
  )
}
