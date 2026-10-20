// Écran « Signaler un problème » (CL-11), forme d'origine du prototype rendue réelle (DP-54) : le parcours en quatre étapes
// (colis, problème, preuves, souhait), lu dans la commande (?ref=…) :
// - plusieurs colis : on choisit lequel ; la fenêtre de retour (7 jours) ou le seul défaut caché (100 jours) ;
// - preuves : vraies photos (appareil photo ou galerie, 4 au plus, heure de réception), obligatoires sauf
//   « Jamais reçu » et « Autre chose » (une phrase suffit) ; description ; « Continuer » dans la barre du bas ;
// - souhait : remboursement (sur le Portefeuille, ou la carte qui a payé ; DP-06), remplacement, simple signal ;
// - l'envoi ouvre le dossier (paiement bloqué, 48 h pour le vendeur) et mène à sa confirmation ;
// - un brouillon (problème, description, photos) est gardé 24 h sur l'appareil (LIT-BROUILLON-H, DP-35) ;
// - l'argent va où le veut la règle (useRemboursement) ; délais : vendeur 48 h, BelivaY 24 h après, recours 48 h.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { reduirePhoto, TYPES_PHOTO } from '../../donnees/photo'
import { source, type CommandeLitige, type ProblemeLitige } from '../../donnees/source'
import { F } from '../../i18n/format'
import { heureSeule } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { DECISION_H, RECOURS_H, useRemboursement } from './Commun'

// Brouillon du signalement, gardé 24 h sur cet appareil (DP-35) : si le réseau coupe ou si le client s'en va.
const CLE_BROUILLON = 'blv_brouillon_litige'
const BROUILLON_MS = 24 * 3600 * 1000
type Brouillon = { ref: string; colis: number; pb: ProblemeLitige; texte: string; photos: { src: string; le: number }[]; le: number }
function lireBrouillon(ref: string): Brouillon | null {
  try {
    const b = JSON.parse(localStorage.getItem(CLE_BROUILLON) ?? 'null') as Brouillon | null
    return b && b.ref === ref && Date.now() - b.le < BROUILLON_MS ? b : null
  } catch {
    return null
  }
}
function ecrireBrouillon(b: Brouillon | null) {
  try {
    if (!b) localStorage.removeItem(CLE_BROUILLON)
    else
      try {
        localStorage.setItem(CLE_BROUILLON, JSON.stringify(b))
      } catch {
        localStorage.setItem(CLE_BROUILLON, JSON.stringify({ ...b, photos: [] })) // trop lourd : le texte au moins
      }
  } catch {
    /* stockage indisponible : pas de brouillon */
  }
}

const PROBLEMES: { pb: ProblemeLitige; titre: string; ton: string; icone: string; aide: string }[] = [
  { pb: 'jamais', titre: 'Jamais reçu', ton: 'red', icone: 'package', aide: 'Le relais ou le livreur dit l’avoir remis, mais tu ne l’as pas.' },
  { pb: 'abime', titre: 'Abîmé', ton: 'amber', icone: 'triangle-alert', aide: 'Cassé, fendu, taché, emballage écrasé.' },
  { pb: 'pas-commande', titre: 'Pas ce que j’ai commandé', ton: 'info', icone: 'arrow-left-right', aide: 'Autre modèle, autre taille, autre couleur, contrefaçon.' },
  { pb: 'manque', titre: 'Il manque quelque chose', ton: 'violet', icone: 'box', aide: 'Un accessoire, une pièce, un article du lot.' },
  { pb: 'autre', titre: 'Autre chose', ton: '', icone: 'circle-help', aide: 'Un défaut qui apparaît à l’usage, par exemple.' },
]

// Grands écrans (§ 5.10) : sous la barre, le nom de chaque étape (colis, problème, preuves, souhait).
const ETAPES_LITIGE = ['Colis', 'Problème', 'Preuves', 'Souhait']
function Progression({ n, libelles }: { n: number; libelles?: boolean }) {
  const { t } = usePreferences()
  return (
    <div className="cl11-prog">
      <div className="steps">
        {[1, 2, 3, 4].map((i) => (
          <i key={i} className={i < n ? 'on' : i === n ? 'cur' : ''}></i>
        ))}
      </div>
      {libelles && (
        <ol className="cl11-prog-l">
          {ETAPES_LITIGE.map((x, i) => (
            <li key={x} className={i + 1 < n ? 'on' : i + 1 === n ? 'cur' : ''} aria-current={i + 1 === n ? 'step' : undefined}>
              {t(x)}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export function Litige() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const ref = params.get('ref') ?? 'BLV-51702'
  const [c, setC] = useState<CommandeLitige | null | undefined>(undefined)
  const [photos, setPhotos] = useState<{ src: string; le: number }[]>([])
  const [texte, setTexte] = useState('')
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const fichier = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const remb = useRemboursement(c?.payePar ?? null)
  // Dès 1024 : plus de barre fixée en bas ; « Continuer » en fin d'étape, à droite, et « Retour » à gauche.
  const large = useDes('tab-l')
  const [brouillon, setBrouillon] = useState<Brouillon | null>(() => lireBrouillon(ref))
  const repris = useRef(false)
  const pColis = Number(params.get('colis') || 0)
  const pPb = params.get('pb') as ProblemeLitige | null
  const pEtape3 = !!pPb && params.get('etape') !== '4'
  useEffect(() => {
    source.commandeLitige(ref).then(setC)
  }, [ref])
  // Reprise du brouillon en arrivant aux preuves du même colis et du même problème.
  useEffect(() => {
    if (repris.current || !brouillon || !pEtape3 || brouillon.colis !== pColis || brouillon.pb !== pPb) return
    repris.current = true
    setTexte((x) => x || brouillon.texte)
    setPhotos((x) => (x.length ? x : brouillon.photos))
  }, [brouillon, pEtape3, pColis, pPb])
  // Sauvegarde à chaque changement des preuves.
  useEffect(() => {
    if (!pEtape3 || !pPb || !pColis || (!texte.trim() && !photos.length)) return
    const b = { ref, colis: pColis, pb: pPb, texte, photos, le: Date.now() }
    ecrireBrouillon(b)
    setBrouillon(b)
  }, [ref, pEtape3, pPb, pColis, texte, photos])
  if (c === undefined) return null
  if (c === null)
    return (
      <Ecran route="litige">
        <div className="card">
          <div className="empty">
            <h3>{t('Commande introuvable')}</h3>
            <p>{t('Ouvre la commande concernée et touche « Signaler un problème ».')}</p>
            <div className="btns">
              <Link to={chemin('commandes')} className="btn primary">
                <span>{t('Voir mes commandes')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )

  const plusieurs = c.colis.length > 1
  const colisN = Number(params.get('colis') || (plusieurs ? 0 : 1))
  const colis = c.colis.find((x) => x.n === colisN)
  const pb = params.get('pb') as ProblemeLitige | null
  const etape = !colis ? 1 : !pb ? 2 : params.get('etape') === '4' ? 4 : 3
  const lien = (p: Record<string, string>) => chemin('litige', { ref, ...(colis ? { colis: String(colis.n) } : {}), ...p })
  const aller = (p: Record<string, string>) => naviguer(lien(p))
  const photoExigee = pb !== 'jamais' && pb !== 'autre'

  const ajouterPhotos = async (fs: FileList | null) => {
    if (!fs) return
    try {
      const nouvelles = await Promise.all([...fs].slice(0, 4 - photos.length).map(reduirePhoto))
      const le = Date.now()
      setPhotos((x) => [...x, ...nouvelles.map((src) => ({ src, le }))].slice(0, 4))
      setErreurPhoto(null)
    } catch {
      setErreurPhoto('Cette image ne passe pas : choisis une photo JPG, PNG ou WebP de moins de 10 Mo.')
    }
  }
  const envoyer = async (souhait: 'rembourse' | 'remplace' | 'signal') => {
    if (envoi || !colis || !pb) return
    setEnvoi(true)
    ecrireBrouillon(null)
    const l = await source.ouvrirLitige({ ref, colis: colis.n, pb, description: texte, souhait, photos: photos.map((x) => x.src) })
    naviguer(chemin('litige-confirme', { id: l.id }), { replace: true })
  }

  const pour = colis && (
    <div className="cl11-for">
      <span className="thumb" style={{ width: '28px', height: '28px', borderRadius: '8px' }}>
        <Dessin id={colis.dessin} />
      </span>
      <span>{tf('Colis {n} · {p}', { n: colis.n, p: t(colis.produit) })}</span>
    </div>
  )

  const bloque = etape === 3 && ((photoExigee && !photos.length) || (pb === 'autre' && texte.trim().length < 10))
  const barre =
    etape === 3 && pb && !large ? (
      <div className="cl11-bar glass">
        <button type="button" className={'btn primary' + (bloque ? ' off' : '')} aria-disabled={bloque} onClick={() => (bloque ? undefined : aller({ pb, etape: '4' }))}>
          <span>{t('Continuer')}</span>
        </button>
        {photoExigee && !photos.length && <div className="cl11-bar-n">{t('Ajoute au moins une photo pour continuer.')}</div>}
        {pb === 'autre' && texte.trim().length < 10 && <div className="cl11-bar-n">{t('Écris au moins une phrase pour continuer.')}</div>}
      </div>
    ) : undefined

  return (
    <Ecran route="litige" sousTitre={tf('{ref} · étape {n} sur 4', { ref, n: etape })} fixes={barre}>
      <Progression n={etape} libelles={large} />
      {etape < 3 && brouillon && (
        <div className="note ink">
          <Icone nom="pencil" taille={18} />
          <div>
            <b>{t('Tu avais commencé un signalement.')}</b>{' '}
            {tf('Colis {n} · {p}.', { n: brouillon.colis, p: t(PROBLEMES.find((x) => x.pb === brouillon.pb)?.titre ?? '') })}{' '}
            <Link to={chemin('litige', { ref, colis: String(brouillon.colis), pb: brouillon.pb, etape: '3' })}>{t('Le reprendre')}</Link>
          </div>
        </div>
      )}
      {etape === 1 && (
        <>
          <h1 className="pg-t">{t('Quel colis pose problème ?')}</h1>
          <p className="pg-s">{t('Un dossier par colis. Seul le colis choisi est concerné : les autres suivent leur cours.')}</p>
          <div className="cl11-list">
            {c.colis.map((x) => (
              <Link key={x.n} to={chemin('litige', { ref, colis: String(x.n) })} className="cl11-it">
                <span className="cl11-th">
                  <span className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }}>
                    <Dessin id={x.dessin} />
                  </span>
                </span>
                <span className="grow">
                  <b>{tf('Colis {n}', { n: x.n })}</b>
                  <span>{tf('{p} · {d}', { p: t(x.produit), d: t(x.detail) })}</span>
                </span>
                <Icone nom="chevron-right" taille={18} style={{ flexShrink: '0' }} />
              </Link>
            ))}
          </div>
        </>
      )}
      {etape === 2 && (
        <>
          {pour}
          {c.fenetre === 'cachee' && (
            <div className="note amber">
              <Icone nom="calendar-clock" taille={18} />
              <div>
                {tf('Retiré il y a plus de 7 jours : la fenêtre de retour est fermée. Jusqu’au {d}, un ', { d: c.finCachee })}
                <b>{t('défaut caché')}</b>
                {t(' reste couvert.')}
              </div>
            </div>
          )}
          {c.fenetre === 'ouverte' && (
            <div className="hint-l">
              <Icone nom="calendar-clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{t('Tu as 7 jours après le retrait pour signaler un problème. Un défaut qui apparaît plus tard, à l’usage, reste couvert 100 jours.')}</span>
            </div>
          )}
          <h1 className="pg-t">{t('Quel est le problème ?')}</h1>
          <div className="cl11-list">
            {PROBLEMES.filter((x) => x.pb !== 'autre').map((x) => (
              <Link key={x.pb} to={lien({ pb: x.pb, etape: '3' })} className="cl11-it">
                <span className={'cl11-ti ' + x.ton}>
                  <Icone nom={x.icone} taille={20} />
                </span>
                <span className="grow">
                  <b>{t(x.titre)}</b>
                  <span style={{ display: 'block' }} className="t13 c3">
                    {t(x.aide)}
                  </span>
                </span>
                <Icone nom="chevron-right" taille={18} style={{ flexShrink: '0' }} />
              </Link>
            ))}
          </div>
          <Link to={lien({ pb: 'autre', etape: '3' })} className="cl11-other">
            {t('Autre chose')}
          </Link>
        </>
      )}
      {etape === 3 && pb && (
        <>
          {pour}
          <div className="card info cl11-say">
            {t(
              pb === 'jamais'
                ? 'Tu n’as rien reçu\u00A0: pas besoin de photo. Ajoute-en une seulement si elle peut aider.'
                : 'Prends une photo de l’article et de son emballage. C’est ce qui permet de trancher en ta faveur.',
            )}
          </div>
          <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (ajouterPhotos(e.target.files), (e.target.value = ''))} />
          <input ref={fichier} type="file" accept={TYPES_PHOTO.join(',')} multiple hidden onChange={(e) => (ajouterPhotos(e.target.files), (e.target.value = ''))} />
          {photos.length === 0 ? (
            <div className="cl11-pics">
              <a href="#" className="cl11-dash on" onClick={(e) => (e.preventDefault(), camera.current?.click())}>
                <Icone nom="camera" taille={24} />
                <b>{t(pb === 'jamais' ? 'Ajouter une photo' : 'Prendre une photo')}</b>
              </a>
              <a href="#" className="cl11-dash" onClick={(e) => (e.preventDefault(), fichier.current?.click())}>
                <Icone nom="image" taille={22} />
                <span>{t('Article et emballage')}</span>
                <span>{t('Depuis la galerie')}</span>
              </a>
            </div>
          ) : (
            <>
              <div className="cl11-pics">
                {photos.map((p, i) => (
                  <div key={i} className="cl11-pic">
                    <div className="photo sq">
                      <img src={p.src} alt={tf('Ta photo {n}', { n: i + 1 })} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <span>
                      <b>{tf('Photo {n}', { n: i + 1 })}</b>
                      {tf(' · Reçue à {h}', { h: heureSeule(p.le, langue) })}
                    </span>
                    <a href="#" style={{ color: 'var(--red)' }} onClick={(e) => (e.preventDefault(), setPhotos((x) => x.filter((_, j) => j !== i)))}>
                      {t('Retirer')}
                    </a>
                  </div>
                ))}
              </div>
              {photos.length < 4 && (
                <div className="cl11-pics one">
                  <a href="#" className="cl11-dash on wide" onClick={(e) => (e.preventDefault(), camera.current?.click())}>
                    <Icone nom="camera" taille={24} />
                    <b>{t('Ajouter une photo')}</b>
                  </a>
                  <a href="#" className="cl11-dash wide" onClick={(e) => (e.preventDefault(), fichier.current?.click())}>
                    <Icone nom="image" taille={22} />
                    <span>{t('Depuis la galerie')}</span>
                  </a>
                </div>
              )}
            </>
          )}
          <div className="hint-l">
            <Icone nom="camera" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>
              {erreurPhoto ? t(erreurPhoto) : <>{t('L’appareil photo s’ouvre ici. La photo va directement dans ton dossier, datée par BelivaY.')} {t('Jusqu’à 4 photos.')}</>}
            </span>
          </div>
          {pb === 'jamais' && (
            <div className="hint-l">
              <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{t('BelivaY vérifie aussi la remise\u00A0: code, heure, gérant ou livreur.')}</span>
            </div>
          )}
          <div className="cl11-k" style={{ marginTop: '18px' }}>
            {t(pb === 'autre' ? 'Décris ce qui s’est passé' : 'Décris ce qui s’est passé (facultatif)')}
          </div>
          <div className={'fld'}>
            <div className={'inp area' + (texte ? '' : ' ph')}>
              <textarea rows={3} maxLength={500} value={texte} placeholder={t('Par exemple\u00A0: le carton était écrasé.')} onChange={(e) => setTexte(e.target.value)} aria-label={t('Décris ce qui s’est passé')} />
            </div>
          </div>
          <div className="hint-l">
            <Icone nom="pencil" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Ton brouillon est gardé 24 h sur ce téléphone : si le réseau coupe, tu reprends où tu en étais.')}</span>
          </div>
          {large && (
            <>
              <div className="cl11-fin">
                <Link to={lien({})} className="btn secondary">
                  <Icone nom="chevron-left" taille={18} />
                  <span>{t('Retour')}</span>
                </Link>
                <button type="button" className={'btn primary' + (bloque ? ' off' : '')} aria-disabled={bloque} onClick={() => (bloque ? undefined : aller({ pb, etape: '4' }))}>
                  <span>{t('Continuer')}</span>
                </button>
              </div>
              {photoExigee && !photos.length && <div className="cl11-bar-n cl11-fin-n">{t('Ajoute au moins une photo pour continuer.')}</div>}
              {pb === 'autre' && texte.trim().length < 10 && <div className="cl11-bar-n cl11-fin-n">{t('Écris au moins une phrase pour continuer.')}</div>}
            </>
          )}
        </>
      )}
      {etape === 4 && colis && (
        <>
          {pour}
          <h1 className="pg-t">{t('Que veux-tu ?')}</h1>
          <div className="cl11-list">
            <a href="#" className="cl11-it" onClick={(e) => (e.preventDefault(), envoyer('rembourse'))}>
              <span className="grow">
                <b>{t('Être remboursé')}</b>
                <span style={{ display: 'block' }} className="t13 c3">
                  {tf('{m} F {ou}, {quand}, si ta demande est retenue.', { m: F(colis.montant), ou: remb.ou, quand: remb.quand })}
                </span>
              </span>
              <Icone nom="chevron-right" taille={18} style={{ flexShrink: '0' }} />
            </a>
            {pb !== 'jamais' && (
              <a href="#" className="cl11-it" onClick={(e) => (e.preventDefault(), envoyer('remplace'))}>
                <span className="grow">
                  <b>{t('Être remplacé')}</b>
                  <span style={{ display: 'block' }} className="t13 c3">
                    {t('Le vendeur renvoie le même article. Livraison offerte.')}
                  </span>
                </span>
                <Icone nom="chevron-right" taille={18} style={{ flexShrink: '0' }} />
              </a>
            )}
            <a href="#" className="cl11-it" onClick={(e) => (e.preventDefault(), envoyer('signal'))}>
              <span className="grow">
                <b>{t('Je veux juste signaler')}</b>
                <span style={{ display: 'block' }} className="t13 c3">
                  {t('Aucune demande. Ton signal nous aide à écarter les mauvais produits.')}
                </span>
              </span>
              <Icone nom="chevron-right" taille={18} style={{ flexShrink: '0' }} />
            </a>
          </div>
          <div className="hint-l">
            <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>
              {t('Remboursé ou remplacé : le vendeur aura 48 h pour répondre et ton paiement reste bloqué pendant ce temps. Un simple signal ne change rien à ta commande.')}
            </span>
          </div>
          <details className="more">
            <summary>
              <Icone nom="scale" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
              <span className="grow">{t('Ce qui se passe ensuite')}</span>
              <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
            </summary>
            <div className="more-b">
              <p>{t('Le vendeur a 48 h pour répondre : il accepte, il conteste avec des preuves, ou il propose un arrangement.')}</p>
              <p>{tf('S’il conteste ou ne répond pas, BelivaY décide au plus {h} h après, avec un motif écrit.', { h: DECISION_H })}</p>
              <p>{tf('Une décision contre toi se conteste une fois, sous {h} h : une autre personne reprend le dossier, ton argent reste bloqué.', { h: RECOURS_H })}</p>
              <p>{t('Si le vendeur ou le transporteur est en tort, la livraison de ce colis t’est aussi remboursée.')}</p>
              {remb.ensuite && <p>{remb.ensuite}</p>}
            </div>
          </details>
        </>
      )}
      <div className="links">
        <Link to={chemin('legal-doc', { d: 'retours' })}>{t('Règles des retours et des litiges')}</Link>
        <Link to={chemin('aide')}>{t('Besoin d’aide ?')}</Link>
      </div>
    </Ecran>
  )
}
