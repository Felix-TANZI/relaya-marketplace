// Contenu du site client (page ajoutée) : les moments de l'accueil (la Rentrée, les Fêtes…) — actif ou non, période
// « MM-JJ » — et les catégories mises en avant (ordre du carrousel). La Direction règle tout ; le Marketing (Service
// client, en part) seulement les catégories. Publié, le site client le lit par le pont (contenu_publie), par-dessus son
// contenu livré ; chaque publication est motivée et journalisée. Photos de l'accueil (bannières, moments, catégories) :
// ajoutées ou remplacées une à une (pages/SURVEILLER/Photo.tsx), publiées par le pont (photo_remplacee).
import { useState } from 'react'
import { Ecran } from '../../composants/coque'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Icone } from '../../composants/Icone'
import { Choix, Pill, Px, Tg, useSurtitre } from '../../composants/prototype'
import type { ContenuSite as Vue } from '../../donnees/domaines/pilotage'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useDroit, useRole } from '../../session'
import { CartePhoto } from '../SURVEILLER/Photo'
import { EtatLecture, useDate } from '../ADM-12/commun-s6'
import '../EQUIPE/equipe.css'

export default function ContenuSite() {
  const surtitre = useSurtitre()
  const l = useLecture(() => source.pilotage.contenuSite(), [])
  return (
    <Ecran route="contenu-site" kicker={surtitre}>
      <Px>
        <EtatLecture l={l} quoi="le contenu du site">
          {(v) => (
            <>
              <Edition key={v.version} v={v} />
              <PhotosAccueil v={v} />
            </>
          )}
        </EtatLecture>
      </Px>
    </Ecran>
  )
}

function Edition({ v }: { v: Vue }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  const droit = useDroit('contenu-site')
  const lecture = droit.acces === 'lecture'
  const [moments, setMoments] = useState(v.moments.map((m) => ({ id: m.id, actif: m.actif, du: m.du, au: m.au })))
  const [cats, setCats] = useState(v.categories.filter((c) => c.enAvant).map((c) => c.id))
  const [publier, setPublier] = useState(false)
  const modifs = moments.filter((m, i) => m.actif !== v.moments[i].actif || m.du !== v.moments[i].du || m.au !== v.moments[i].au).length + (cats.join() !== v.categories.filter((c) => c.enAvant).map((c) => c.id).join() ? 1 : 0)
  const maj = (i: number, x: Partial<(typeof moments)[number]>) => setMoments(moments.map((m, j) => (j === i ? { ...m, ...x } : m)))
  const RAISONS: Record<string, string> = { dates: 'Dates au format MM-JJ (« 12-01 »).', moments_reserves: 'Les moments de l’accueil se règlent par la Direction ; le Marketing met en avant les catégories.' }
  return (
    <>
      {!lecture && (
        <div className="btns mt8">
          <button type="button" className="btn primary" disabled={!modifs} onClick={() => setPublier(true)}>
            <Icone nom="send" taille={18} />
            <span>{tf('Publier {n} modification(s)', { n: modifs })}</span>
          </button>
        </div>
      )}
      <p className="t13 c3 mt10">{v.publieLe ? tf('Version {n} · publiée {d} par {p}', { n: v.version, d: date(v.publieLe), p: v.par ?? '—' }) : t('Contenu livré avec le site · aucune publication')}</p>
      <div className="card mt16">
        <h2 className="card-t">{tf('{n} moments de l’accueil', { n: moments.length })}</h2>
        <ul className="eq-lignes">
          {v.moments.map((m, i) => (
            <li key={m.id}>
              <span className="grow">
                <b>{m.titre}</b>
                <span className="t13 c3">{m.accroche}</span>
              </span>
              {m.enCours && (
                <Pill ton="green" sm dot>
                  {t('À l’accueil')}
                </Pill>
              )}
              <label className="fld" style={{ width: 92 }}>
                <span className="vh">{tf('Début de {m}', { m: m.titre })}</span>
                <span className="inp">
                  <input aria-label={tf('Début de {m}', { m: m.titre })} value={moments[i].du} disabled={lecture || !v.peutMoments} onChange={(e) => maj(i, { du: e.target.value })} />
                </span>
              </label>
              <label className="fld" style={{ width: 92 }}>
                <span className="vh">{tf('Fin de {m}', { m: m.titre })}</span>
                <span className="inp">
                  <input aria-label={tf('Fin de {m}', { m: m.titre })} value={moments[i].au} disabled={lecture || !v.peutMoments} onChange={(e) => maj(i, { au: e.target.value })} />
                </span>
              </label>
              <Tg on={moments[i].actif} changer={lecture || !v.peutMoments ? undefined : (x) => maj(i, { actif: x })} libelle={tf('{m} actif', { m: m.titre })} lock={lecture || !v.peutMoments} />
            </li>
          ))}
        </ul>
      </div>
      <div className="card mt16">
        <h2 className="card-t">{tf('{n} catégorie(s) mise(s) en avant', { n: cats.length })}</h2>
        <div className="chips" role="group" aria-label={t('Catégories mises en avant')}>
          {v.categories.map((c) => {
            const on = cats.includes(c.id)
            return (
              <button key={c.id} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on} disabled={lecture} onClick={() => setCats(on ? cats.filter((x) => x !== c.id) : [...cats, c.id])}>
                {on && <span className="n">{cats.indexOf(c.id) + 1}</span>}
                {c.titre}
              </button>
            )
          })}
        </div>
      </div>
      <DecisionMotivee
        ouverte={publier}
        fermer={() => setPublier(false)}
        titre={t('Publier le contenu du site')}
        resume={tf('{n} moment(s) actif(s) · {c} catégorie(s) en avant : visible à l’accueil du site client.', { n: moments.filter((m) => m.actif).length, c: cats.length })}
        libelle="Publier"
        icone="send"
        envoyer={async (motif) => {
          const r = await source.pilotage.publierContenu({ moments, categories: cats }, motif)
          return r.ok ? null : r.raison === 'motif_court' ? r : t(RAISONS[r.raison])
        }}
      />
    </>
  )
}

type Famille = 'banniere' | 'moment' | 'categorie'
function PhotosAccueil({ v }: { v: Vue }) {
  const { t, tf } = usePreferences()
  const role = useRole()
  const droit = useDroit('contenu-site')
  const [famille, setFamille] = useState<Famille>('banniere')
  const l = useLecture(() => source.pilotage.photos(), [])
  const photos = l.donnees ?? []
  const de = (c: Famille, id: string) => photos.find((p) => p.cible === c && p.id === id)
  const n = (c: Famille) => photos.filter((p) => p.cible === c).length
  const peut = famille === 'categorie' ? droit.acces === 'oui' || droit.acces === 'part' : role === 'superviseur'
  const elements = famille === 'moment' ? v.moments.map((m) => ({ id: m.id, titre: m.titre })) : v.categories
  return (
    <div className="card mt16">
      <h2 className="card-t">{tf('Photos de l’accueil · {n} remplacée(s)', { n: photos.filter((p) => p.cible !== 'produit' && p.cible !== 'piece').length })}</h2>
      <p className="t13 c3">{t('Bannière du carrousel, moment ou catégorie : la photo choisie est réduite sur l’appareil, publiée avec son motif, et le site client l’affiche aussitôt.')}</p>
      <Choix
        forme="chips"
        className="mt10"
        aria={t('Photos de l’accueil')}
        actif={famille}
        choisir={setFamille}
        items={[
          { id: 'banniere' as const, t: t('Bannières'), n: n('banniere') || null },
          { id: 'moment' as const, t: t('Moments'), n: n('moment') || null },
          { id: 'categorie' as const, t: t('Catégories'), n: n('categorie') || null },
        ]}
      />
      {!peut && <p className="t13 c3 mt8">{famille === 'categorie' ? t('Lecture seule.') : t('Les photos des bannières et des moments se règlent par la Direction.')}</p>}
      <div className="sv-photos">
        {elements.map((x) => (
          <CartePhoto
            key={famille + x.id}
            cible={famille}
            id={x.id}
            titre={x.titre}
            libelle={tf(famille === 'banniere' ? 'Bannière {x}' : famille === 'moment' ? 'Moment {x}' : 'Catégorie {x}', { x: x.titre })}
            actuelle={de(famille, x.id)}
            peut={peut}
            bandeau={famille !== 'categorie'}
            apres={l.relire}
          />
        ))}
      </div>
    </div>
  )
}
