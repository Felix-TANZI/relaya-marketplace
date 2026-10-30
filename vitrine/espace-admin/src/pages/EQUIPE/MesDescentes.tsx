// Mes descentes (logique-metier/ACCES-CONSOLE.md § 9) : l'agent terrain, au téléphone, voit SES descentes seulement
// (la source refuse celles d'un autre) ; pour chacune : itinéraire (lieu, repère, carte), « Je pars », « Je suis sur
// place », la liste de contrôle du type, les photos, le compte rendu et le résultat. Sans réseau, le compte rendu est
// gardé sur le téléphone (brouillon) et part au retour du réseau (file hors connexion, donnees/fileHorsLigne.ts).
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Note, Pill, Px, Vide } from '../../composants/prototype'
import { PARAMETRES } from '../../calculs/registre'
import { chemin } from '../../config/pages'
import type { Descente, RapportDescente } from '../../donnees/domaines/equipe'
import { enLigneMaintenant, geste } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useFonctions } from '../AJ-A/fonctions-page'
import { EtatLecture, useDate } from '../ADM-12/commun-s6'
import { RESULTAT, STATUT_DESCENTE, TYPES_DESCENTE, lienCible } from './Descentes'
import { useIssue } from './commun'

const CLE = (id: string) => `blv_a_descente_${id}`
function lireBrouillon(id: string): Partial<RapportDescente> {
  try {
    return JSON.parse(localStorage.getItem(CLE(id)) ?? '{}') as Partial<RapportDescente>
  } catch {
    return {}
  }
}
function garderBrouillon(id: string, r: Partial<RapportDescente>) {
  try {
    localStorage.setItem(CLE(id), JSON.stringify(r))
  } catch {
    /* stockage refusé : le brouillon vaut pour la visite */
  }
}

export default function MesDescentes() {
  const { t } = usePreferences()
  const [params, setParams] = useSearchParams()
  const id = params.get('id')
  const l = useLecture(() => source.equipe.mesDescentes(), [])
  const d = l.donnees ?? []
  const aFaire = d.filter((x) => x.statut !== 'terminee')
  const fonctions = useFonctions([
    { verbe: 'Faire', n: aFaire.length, unite: ['descente', 'descentes'], icone: 'footprints', onClick: () => aFaire[0] && setParams({ id: aFaire[0].id }) },
    { verbe: 'Relire', n: d.length - aFaire.length, unite: ['compte rendu', 'comptes rendus'], icone: 'clipboard-check', onClick: () => setParams({}) },
  ])
  return (
    <Ecran route="mes-descentes" fonctions={id ? undefined : fonctions} retour={id ? chemin('mes-descentes') : undefined}>
      <Px>
        <EtatLecture l={l} quoi="vos descentes">
          {(liste) => {
            const choisie = id ? liste.find((x) => x.id === id) : null
            if (id && choisie) return <Detail d={choisie} fermer={() => setParams({})} />
            if (!liste.length) return <Vide icone="footprints" t={t('Aucune descente prévue')} />
            return (
              <div className="dt-liste">
                {liste.map((x) => (
                  <Ligne key={x.id} d={x} ouvrir={() => setParams({ id: x.id })} />
                ))}
              </div>
            )
          }}
        </EtatLecture>
      </Px>
    </Ecran>
  )
}

function Ligne({ d, ouvrir }: { d: Descente; ouvrir: () => void }) {
  const { t } = usePreferences()
  const date = useDate()
  const [lib, ic] = TYPES_DESCENTE[d.type]
  return (
    <article className="card dt-carte" aria-label={`${d.id} · ${t(lib)}`}>
      <div className="dt-l1">
        <span className="row" style={{ gap: 10, alignItems: 'center', minWidth: 0 }}>
          <Icone nom={ic} taille={20} />
          <b>{d.lieu}</b>
        </span>
        <Pill ton={STATUT_DESCENTE[d.statut][1]} sm dot>
          {t(STATUT_DESCENTE[d.statut][0])}
        </Pill>
      </div>
      <div className="dt-meta">
        <span>{t(lib)}</span>
        <span>
          <Icone nom="calendar" taille={14} />
          {date(d.prevueLe)}
        </span>
        <span>
          <Icone nom="map-pin" taille={14} />
          {d.zone}
        </span>
      </div>
      <button type="button" className={'btn ' + (d.statut === 'terminee' ? 'secondary' : 'primary')} onClick={ouvrir}>
        <Icone nom={d.statut === 'terminee' ? 'clipboard-check' : 'footprints'} taille={18} />
        <span>{d.statut === 'terminee' ? t('Relire') : t('Ouvrir')}</span>
      </button>
    </article>
  )
}

function Detail({ d, fermer }: { d: Descente; fermer: () => void }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  const issue = useIssue()
  const b = lireBrouillon(d.id)
  const [controles, setControles] = useState<Record<string, boolean>>(b.controles ?? Object.fromEntries(d.controles.filter((c) => c.ok !== null).map((c) => [c.id, c.ok as boolean])))
  const [photos, setPhotos] = useState<string[]>(b.photos ?? [])
  const [cr, setCr] = useState(b.compteRendu ?? d.compteRendu)
  const [resultat, setResultat] = useState<RapportDescente['resultat']>(b.resultat ?? d.resultat)
  const [message, setMessage] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const fichier = useRef<HTMLInputElement>(null)
  const fini = d.statut === 'terminee'
  useEffect(() => {
    if (!fini) garderBrouillon(d.id, { controles, photos, compteRendu: cr, resultat })
  }, [d.id, fini, controles, photos, cr, resultat])
  const [lib] = TYPES_DESCENTE[d.type]
  const complet = d.controles.every((c) => typeof controles[c.id] === 'boolean') && !!resultat && cr.trim().length >= PARAMETRES.console.motifMin
  const avancer = async (s: 'en_route' | 'sur_place') => {
    const r = await geste(s === 'en_route' ? 'Départ vers une descente' : 'Arrivée sur place', (x) => x.equipe.avancer(d.id, s), d.id)
    if (r.etat === 'en_file') setMessage(t('Gardé sur le téléphone : envoyé au retour du réseau.'))
    else setErreur(issue(r.r))
  }
  const envoyer = async () => {
    const rapport: RapportDescente = { controles, photos, compteRendu: cr, resultat, horsReseau: !enLigneMaintenant() }
    const r = await geste('Compte rendu de descente', (x) => x.equipe.rapporter(d.id, rapport), d.id)
    if (r.etat === 'en_file') return setMessage(t('Compte rendu gardé sur le téléphone : il part au retour du réseau.'))
    const e = issue(r.r)
    setErreur(e)
    if (!e) {
      try {
        localStorage.removeItem(CLE(d.id))
      } catch {
        /* rien */
      }
      setMessage(t('Compte rendu envoyé.'))
    }
  }
  const carte = `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${d.lieu}, Yaoundé`)}`
  return (
    <>
      <div className="card">
        <div className="dt-l1">
          <b>{`${t(lib)} · ${d.lieu}`}</b>
          <Pill ton={STATUT_DESCENTE[d.statut][1]} sm dot>
            {t(STATUT_DESCENTE[d.statut][0])}
          </Pill>
        </div>
        <div className="dt-meta mt8">
          <span>
            <Icone nom="calendar" taille={14} />
            {date(d.prevueLe)}
          </span>
          <span>
            <Icone nom="map-pin" taille={14} />
            {`${d.zone} · ${d.repere}`}
          </span>
        </div>
        <div className="eq-gestes">
          {d.statut === 'planifiee' && (
            <button type="button" className="btn primary" onClick={() => void avancer('en_route')}>
              <Icone nom="navigation" taille={18} />
              <span>{t('Je pars')}</span>
            </button>
          )}
          {d.statut === 'en_route' && (
            <button type="button" className="btn primary" onClick={() => void avancer('sur_place')}>
              <Icone nom="map-pin" taille={18} />
              <span>{t('Je suis sur place')}</span>
            </button>
          )}
          <a className="btn sm secondary" href={carte} target="_blank" rel="noreferrer">
            <Icone nom="map" taille={16} />
            <span>{t('Itinéraire')}</span>
          </a>
          <Link className="btn sm ghost" to={lienCible(d.cible)}>
            {d.cible.libelle}
          </Link>
        </div>
      </div>

      <div className="card mt16">
        <h2 className="card-t">{tf('{n} contrôles', { n: d.controles.length })}</h2>
        {d.controles.map((c) => (
          <div key={c.id} className="dt-ctrl">
            <span>{t(c.libelle)}</span>
            <div className="seg" role="radiogroup" aria-label={t(c.libelle)}>
              {[true, false].map((v) => (
                <button key={String(v)} type="button" role="radio" aria-checked={controles[c.id] === v} className={controles[c.id] === v ? 'on' : ''} disabled={fini} onClick={() => setControles({ ...controles, [c.id]: v })}>
                  {t(v ? 'Oui' : 'Non')}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card mt16">
        <h2 className="card-t">{tf('{n} photo(s)', { n: photos.length + d.photos.length })}</h2>
        <div className="dt-photos">
          {[...d.photos.map((p) => p.nom), ...photos].map((p, i) => (
            <Pill key={p + i} ton="ink" sm icone="image">
              {p}
            </Pill>
          ))}
        </div>
        {!fini && (
          <>
            <input
              ref={fichier}
              className="dt-fichier"
              type="file"
              accept="image/*"
              capture="environment"
              aria-label={t('Prendre une photo')}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setPhotos([...photos, f.name || tf('Photo {n}', { n: photos.length + 1 })])
                e.target.value = ''
              }}
            />
            <button type="button" className="btn sm secondary mt10" onClick={() => fichier.current?.click()}>
              <Icone nom="camera" taille={16} />
              <span>{t('Prendre une photo')}</span>
            </button>
          </>
        )}
      </div>

      <div className="card mt16">
        <h2 className="card-t">{t('Compte rendu')}</h2>
        <textarea className="dt-zone mt10" value={cr} disabled={fini} onChange={(e) => setCr(e.target.value)} aria-label={t('Compte rendu')} />
        <div className="seg" role="radiogroup" aria-label={t('Résultat')}>
          {(Object.keys(RESULTAT) as (keyof typeof RESULTAT)[]).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={resultat === k} className={resultat === k ? 'on' : ''} disabled={fini} onClick={() => setResultat(k)}>
              {t(RESULTAT[k][0])}
            </button>
          ))}
        </div>
        {!enLigneMaintenant() && !fini && (
          <Note ton="amber" icone="wifi-off" className="mt12">
            {t('Hors réseau : tout est gardé sur le téléphone.')}
          </Note>
        )}
        {erreur && (
          <p className="e-erreur mt10" role="alert">
            {erreur}
          </p>
        )}
        {message && (
          <p className="t13 mt10" role="status">
            {message}
          </p>
        )}
        <div className="btns mt16">
          <button type="button" className="btn ghost" onClick={fermer}>
            {t('Mes descentes')}
          </button>
          {!fini && (
            <button type="button" className="btn primary" disabled={!complet} onClick={() => void envoyer()}>
              <Icone nom="send" taille={18} />
              <span>{t('Envoyer le compte rendu')}</span>
            </button>
          )}
        </div>
      </div>
    </>
  )
}
