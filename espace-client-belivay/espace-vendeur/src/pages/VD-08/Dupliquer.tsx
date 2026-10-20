// Dupliquer un produit (VD-08) — reprise du prototype (route('dupliquer')), branchée sur la source. « ?p= » : l'offre
// source (les quatre entrées la passent, VD08-R31) ; « ?v= » : une variante déjà choisie ; sans « p », le choix de
// l'offre source (« Partir d'un de mes produits »).
// - Ne demande que la variante et ses photos réelles (DUP-03) : stock et prix se saisissent une fois, à l'étape 3, avec
//   le prix conseillé. Les variantes déjà créées ne sont pas proposées, elles sont citées avec leur état (DUP-04).
// - Variante connue de la fiche ⇒ encadré vert « … existe déjà au catalogue : votre offre y sera rattachée » (DUP-02) ;
//   « Autre… » hors de la fiche ⇒ la demande de fiche s'ouvre, pré-remplie (la recherche a été faite, NOF-01).
// - Photos réelles « Jamais copiées : elles montrent l'article vendu » ; moins de 3 : le brouillon se crée quand même, la
//   publication attendra (PHO-01). « Voir le détail » : ce qui est repris (DUP-01). Un doublon crée un brouillon,
//   jamais une offre publiée. Accès Préparation : réservé.
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useMontantsVisibles } from '../../session'
import { Bouton, Chargement, ImagePhoto, Reserve, VignetteProduit, useMontant } from './commun'

const ETAT: Record<string, string> = { en_vente: 'en vente', en_verification: 'en vérification', en_pause: 'en pause', refusee: 'refusée', brouillon: 'brouillon' }
const nrm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export default function Dupliquer() {
  const { t, tf, langue } = usePreferences()
  const montants = useMontantsVisibles()
  const montant = useMontant()
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const sourceId = params.get('p')
  const [choix, setChoix] = useState<string | null>(params.get('v'))
  const [autre, setAutre] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const lecture = useLecture(async () => {
    const l = await source.produits.liste()
    const s = sourceId ? (l.produits.find((p) => p.id === sourceId) ?? null) : null
    const variantes = s?.ficheId ? await source.produits.variantes(s.ficheId) : []
    const photos = s ? await source.offres.photos('copie:' + s.id) : []
    const r = await source.offres.reglages()
    return { l, s, variantes, photos, r }
  }, [sourceId, montants])
  if (!montants) return <Reserve route="dupliquer" />
  const d = lecture.donnees
  if (!d) return <Chargement route="dupliquer" />
  const s = d.s
  if (!s) {
    const sources = d.l.produits.filter((p) => p.ficheId && p.etat !== 'brouillon')
    return (
      <Ecran route="dupliquer" retour={chemin('offre1')}>
        <div className="pg">
          <h1 className="pg-t">{t('Dupliquer un produit')}</h1>
          <p className="pg-s">{t('Depuis quel produit ? Même article, autre couleur ou autre taille. Le reste est repris.')}</p>
        </div>
        {sources.length ? (
          <div className="card">
            {sources.map((p) => (
              <Link key={p.id} to={chemin('dupliquer', { p: p.id })} replace className="li">
                <VignetteProduit p={p} taille={44} />
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {p.variante ? `${p.titre} · ${t(p.variante)}` : p.titre}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {p.prix !== null ? `${montant(p.prix)} · ${t(ETAT[p.etat])}` : t(ETAT[p.etat])}
                  </span>
                </span>
                <Icone nom="chevron-right" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="card">
            <div className="empty">
              <div className="ei">
                <Icone nom="copy" taille={24} />
              </div>
              <h3>{t('Aucun produit à dupliquer')}</h3>
              <p>{t('Publiez d’abord une offre ; vous pourrez ensuite en créer les autres couleurs.')}</p>
            </div>
            <Bouton classe="primary" icone="plus" vers={chemin('offre1')}>
              {t('Nouvelle offre')}
            </Bouton>
          </div>
        )}
      </Ecran>
    )
  }
  const libres = d.variantes.filter((v) => !v.offreId).map((v) => v.variante)
  const creees = d.variantes.filter((v) => v.offreId)
  const choixEff = choix ?? libres[0] ?? null
  const vise = autre !== null ? autre.trim() : choixEff
  const connue = vise ? (d.variantes.find((v) => nrm(v.variante) === nrm(vise)) ?? null) : null
  const dejaCreee = !!connue?.offreId
  const horsFiche = !!vise && !connue
  const cible = 'copie:' + s.id
  const camera = chemin('camera', { mode: 'photo', pour: cible, retour: `dupliquer?p=${s.id}${vise ? '&v=' + encodeURIComponent(vise) : ''}` })
  const creer = async () => {
    setErreur(null)
    if (!vise) return setErreur(t('Choisissez la nouvelle variante.'))
    if (dejaCreee) return setErreur(t('Cette variante est déjà dans vos produits.'))
    if (horsFiche) return naviguer(chemin('offre1', { q: `${s.titre} ${vise}` }))
    setEnvoi(true)
    const r = await source.produits.dupliquer(s.id, connue!.variante)
    setEnvoi(false)
    if (!r.ok) {
      jouer('erreur')
      return setErreur(t(r.raison === 'existe' ? 'Cette variante est déjà dans vos produits.' : 'Variante inconnue de la fiche : demandez une fiche.'))
    }
    jouer('interrupteur')
    naviguer(chemin('offre1', { b: r.brouillonId }))
  }
  return (
    <Ecran route="dupliquer" retour={chemin('offre_detail', { p: s.id })}>
      <div className="pg">
        <h1 className="pg-t">{t('Dupliquer un produit')}</h1>
        <p className="pg-s">{t('Même article, autre couleur ou autre taille. Le reste est repris.')}</p>
      </div>
      <div className="card">
        <div className="art" style={{ marginTop: '0' }}>
          <VignetteProduit p={s} taille={56} />
          <div className="grow">
            <div className="an" style={{ fontSize: '16px' }}>
              {tf('Depuis : {nom}', { nom: s.variante ? `${s.titre} · ${t(s.variante)}` : s.titre })}
            </div>
            <div className="av">{s.prix !== null ? `${montant(s.prix)} · ${t(ETAT[s.etat])}` : t(ETAT[s.etat])}</div>
          </div>
          <Link to={chemin('dupliquer')} replace className="t13 b8 cor" style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
            {t('Changer')}
          </Link>
        </div>
      </div>
      <div className="divider-t">{t('La nouvelle variante')}</div>
      <div className="chips" role="radiogroup" aria-label={t('La nouvelle variante')}>
        {libres.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={autre === null && choixEff === v}
            className={'chip' + (autre === null && choixEff === v ? ' on' : '')}
            onClick={() => {
              setChoix(v)
              setAutre(null)
              setErreur(null)
            }}
          >
            {autre === null && choixEff === v && <Icone nom="check" taille={15} />}
            {t(v)}
          </button>
        ))}
        <button type="button" role="radio" aria-checked={autre !== null} className={'chip' + (autre !== null ? ' on' : '')} onClick={() => (setAutre(''), setErreur(null))}>
          <Icone nom="plus" taille={15} />
          {t('Autre…')}
        </button>
      </div>
      {autre !== null && (
        <div className="fld">
          <label htmlFor="vd08-autre">{t('Nom de la variante')}</label>
          <div className="inp">
            <input size={1} id="vd08-autre" autoFocus value={autre} maxLength={40} onChange={(e) => (setAutre(e.target.value), setErreur(null))} placeholder={t('Ex. : rouge, 128 Go, taille 42')} />
          </div>
        </div>
      )}
      {libres.length === 0 && autre === null && <div className="hint">{t('Toutes les variantes de la fiche sont déjà créées : « Autre… » pour en demander une.')}</div>}
      {creees.length > 0 && (
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('Déjà créées : {l}.', { l: creees.map((v) => `${t(v.variante)} (${t(ETAT[v.etat ?? 'brouillon'])})`).join(', ') })}</span>
        </div>
      )}
      {connue && !dejaCreee && (
        <div className="note green">
          <Icone nom="link" taille={18} />
          <div>{tf('Le {v} existe déjà au catalogue : votre offre y sera rattachée.', { v: t(connue.variante) })}</div>
        </div>
      )}
      {dejaCreee && (
        <div className="note amber">
          <Icone nom="circle-alert" taille={18} />
          <div>{t('Cette variante est déjà dans vos produits.')}</div>
        </div>
      )}
      {horsFiche && (
        <div className="note or">
          <Icone nom="file-pen" taille={18} />
          <div>{tf('« {v} » n’est pas au catalogue : BelivaY ajoutera sa fiche. La demande s’ouvre pré-remplie.', { v: vise! })}</div>
        </div>
      )}
      <div className="fld">
        <label>
          {vise && !horsFiche ? tf('Photos réelles du {v} ', { v: t(vise) }) : t('Photos réelles de la variante ')}
          <span className="req">{t('*')}</span>
        </label>
        <div className="photos" style={{ marginTop: '0' }}>
          {d.photos.length < d.r.photosMax && (
            <Link to={camera} className="addph">
              <Icone nom="camera" taille={22} />
              <span>{t('Prendre')}</span>
            </Link>
          )}
          {d.photos.map((p) => (
            <div key={p.id} className="photo">
              <ImagePhoto p={p} />
              <span className="ts">{heure(p.prise, langue)}</span>
              <button type="button" aria-label={t('Retirer la photo')} onClick={() => void source.offres.retirerPhoto(cible, p.id)} style={{ position: 'absolute', top: '3px', right: '3px', width: '28px', height: '28px', borderRadius: '50%', border: 0, background: 'rgba(0,0,0,.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Icone nom="x" taille={14} />
              </button>
            </div>
          ))}
          {Array.from({ length: Math.max(0, d.r.photosMin - d.photos.length - 1) }, (_, i) => (
            <div key={i} className="addph" style={{ opacity: '.55' }} aria-hidden="true">
              <Icone nom="image" taille={22} />
              <span>{String(d.photos.length + i + 2)}</span>
            </div>
          ))}
        </div>
        <div className="hint">{t('Jamais copiées : elles montrent l’article vendu.')}</div>
        {d.photos.length < d.r.photosMin && <div className="hint">{tf('Moins de {n} photos : le brouillon se crée quand même, la publication les attendra.', { n: d.r.photosMin })}</div>}
      </div>
      <details className="more">
        <summary>
          <Icone nom="copy" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">
            {t('Voir le détail')}
            <span className="t12 c3" style={{ display: 'block', fontWeight: '600', marginTop: '1px' }}>
              {tf('Ce qui est repris du {v}', { v: t(s.variante) })}
            </span>
          </span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <div>
            {['Fiche et photos de référence', 'Catégorie et gabarit du colis', 'Poids et dimensions', 'Délai de préparation et paiement au retrait'].map((x, i) => (
              <div key={x} className="row" style={{ gap: '10px', padding: '9px 0', borderTop: i ? '1px solid var(--line)' : undefined }}>
                <Icone nom="check" taille={17} trait={2.6} style={{ color: 'var(--green)', flexShrink: '0' }} />
                <span className="grow t14" style={{ color: 'var(--ink)' }}>
                  {t(x)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt8">{t('Restent à saisir : la variante, les photos réelles, puis le stock et le prix.')}</p>
          <p>{t('La copie passe toujours par la recherche : si la variante existe déjà, votre offre y est rattachée.')}</p>
        </div>
      </details>
      {erreur && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{erreur}</div>
        </div>
      )}
      <div className="mt16">
        <Bouton classe="primary" icone={horsFiche ? 'file-pen' : 'copy'} inactif={envoi || !vise || dejaCreee} onClick={() => void creer()}>
          {t(horsFiche ? 'Demander une fiche' : 'Créer le brouillon')}
        </Bouton>
      </div>
      <p className="scrim-note">{t('Ensuite : votre stock et votre prix, avec le prix conseillé.')}</p>
    </Ecran>
  )
}
