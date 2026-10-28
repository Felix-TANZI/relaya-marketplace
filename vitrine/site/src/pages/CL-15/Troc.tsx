// Écran « Reprise » (CL-15 ; EX-04), forme d'origine du prototype rendue réelle (DP-54) : ton ancien téléphone + de
// l'argent = un neuf : le neuf choisi (?p=…, un téléphone du catalogue, prix livré), le modèle de l'ancien, son état
// déclaré (s'allume, écran, batterie, coque), compte Google et code retirés (sinon pas de reprise) ; l'estimation
// suit. Tes reprises en cours en tête.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { calculer, type Classe } from '../../donnees/frais'
import { source, type Produit, type Troc as TrocDonnee } from '../../donnees/source'
import { MODELES_REPRISE, type EtatDeclare } from '../../donnees/troc'
import { F } from '../../i18n/format'
import { dateA } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { pageTroc, useTrocs } from './Commun'

export const prixLivreNeuf = (pr: Produit) => calculer('relais', [{ boutique: pr.vendeur.boutique, zone: pr.vendeur.zone, articles: [{ prix: pr.prix, quantite: 1, classe: pr.classe as Classe }] }]).total

// Les cinq étapes de la reprise (estimation, offre, dépôt, inspection, paiement) : n = l'étape en cours.
export function EtapesTroc({ n }: { n: number }) {
  return (
    <div className="steps">
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} className={i < n ? 'on' : i === n ? 'cur' : ''}></i>
      ))}
    </div>
  )
}
export function FfTroc() {
  const { t } = usePreferences()
  if (INTERRUPTEURS_DU_LANCEMENT['FF-EX04']) return null
  return (
    <div className="cl15-ff">
      <span className="cl15-pill">
        <Icone nom="lock" taille={13} />
        {t('Après le lancement · interrupteur fermé')}
      </span>
      <span className="cl15-ex">{t('EX-04')}</span>
    </div>
  )
}

export function Troc() {
  const { t } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [d] = useTrocs()
  const [telephones, setTelephones] = useState<Produit[]>([])
  const [p, setP] = useState(params.get('p') ?? 'camon30')
  const [modele, setModele] = useState('camon20')
  const [choixNeuf, setChoixNeuf] = useState(false)
  const [sauvegarde, setSauvegarde] = useState(false)
  const [e, setE] = useState<EtatDeclare>({ allume: true, ecran: 'intact', batterie: true, coque: 'bon', compteRetire: false, codeRetire: false })
  useEffect(() => {
    source.produits().then((ps) => setTelephones(ps.filter((x) => x.sousCategorie === 'Smartphones' || x.univers === 'tel').filter((x) => x.prix >= 50000)))
  }, [])
  if (!d) return null
  const neuf = telephones.find((x) => x.p === p) ?? null
  const chips = <K extends keyof EtatDeclare>(k: K, options: [EtatDeclare[K], string][], label: string) => (
    <>
      <div className="cl15-k mt14">{t(label)}</div>
      <div className="chips" role="radiogroup" aria-label={t(label)}>
        {options.map(([v, x]) => (
          <a key={String(v)} href="#" role="radio" aria-checked={e[k] === v} aria-label={`${t(label)} : ${t(x)}`} className={'chip' + (e[k] === v ? ' on' : '')} onClick={(ev) => (ev.preventDefault(), setE({ ...e, [k]: v }))}>
            {t(x)}
          </a>
        ))}
      </div>
    </>
  )
  const coche = (on: boolean, basculer: () => void, nom: string, contenu: ReactNode) => (
    <a href="#" role="checkbox" aria-checked={on} aria-label={t(nom)} className="check" style={{ color: 'inherit' }} onClick={(ev) => (ev.preventDefault(), basculer())}>
      <span className={'cb' + (on ? ' on' : '')}>{on && <Icone nom="check" taille={14} trait={3} />}</span>
      <span className="grow">{contenu}</span>
    </a>
  )
  const pret = e.compteRetire && e.codeRetire
  return (
    <Ecran gabarit="colonnes" route="troc">
      <Colonne>
      <Styles id="ddcb0e469a" />
      <EtapesTroc n={0} />
      <FfTroc />
      {d.liste
        .filter((x) => !['annule', 'paye', 'rendu'].includes(x.etat))
        .map((x) => (
          <Link key={x.id} to={chemin(pageTroc(x), { id: x.id })} className="cl15-inf" style={{ color: 'inherit' }}>
            <Icone nom="repeat" taille={17} />
            <span className="grow">
              <b>
                {t(x.modeleNom)} → {t(x.titre)}
              </b>
              {' · '}
              {t(x.contestation ? 'Contestation en cours : réponse sous 48 h' : x.etat === 'depot' ? 'À déposer au relais' : x.etat === 'contre' ? 'Contre-offre : à toi de répondre' : x.etat === 'refuse' ? 'Reprise refusée : à toi de choisir' : x.etat === 'confirme' ? 'Valeur confirmée : à payer' : 'Inspection en cours')}
              {x.motif && (x.etat === 'contre' || x.etat === 'refuse') && <> · {t(TITRES_MOTIF[x.motif.type]?.[0] ?? '')}</>}
            </span>
            <Icone nom="chevron-right" taille={17} />
          </Link>
        ))}
      <div className="pg">
        <div className="pg-k">{t('Reprise')}</div>
        <h1 className="pg-t">{t('Ton ancien téléphone + de l’argent = un neuf')}</h1>
        <p className="pg-s">{t('Un reconditionneur partenaire estime et paie la reprise. BelivaY n’achète rien.')}</p>
      </div>
      {neuf && (
        <div className="card or">
          <a href="#" className="row" style={{ color: 'inherit' }} aria-expanded={choixNeuf} aria-label={t('Le neuf que tu veux')} onClick={(ev) => (ev.preventDefault(), setChoixNeuf(!choixNeuf))}>
            <span className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }}>
              <Dessin id={neuf.dessins[0] ?? ''} />
            </span>
            <div className="grow">
              <div className="t15 b8" style={{ lineHeight: '1.3' }}>
                {t(neuf.titre)}
              </div>
              <div className="t13 c3 mt4">{t('Le neuf que tu veux · retrait offert')}</div>
            </div>
            <span className="price">
              {F(prixLivreNeuf(neuf))}
              <small>{t(' F')}</small>
            </span>
          </a>
        </div>
      )}
      {choixNeuf && (
        <div className="card tight" role="radiogroup" aria-label={t('Le neuf que tu veux')}>
          {telephones.map((x) => (
            <a key={x.p} href="#" role="radio" aria-checked={x.p === p} className="li" onClick={(ev) => (ev.preventDefault(), setP(x.p), setChoixNeuf(false))}>
              <span className="thumb" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
                <Dessin id={x.dessins[0] ?? ''} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t(x.titre)}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {F(prixLivreNeuf(x))} F
                </span>
              </span>
              <Icone nom={x.p === p ? 'circle-check' : 'circle'} taille={20} style={x.p === p ? { color: 'var(--or)' } : { color: 'var(--ink-4)' }} />
            </a>
          ))}
        </div>
      )}
      <div className="sec">
        <h2>{t('Ton ancien téléphone')}</h2>
      </div>
      <div className="fld">
        <label htmlFor="tr-modele">{t('Modèle')}</label>
        <div className="inp" style={{ position: 'relative' }}>
          <Icone nom="smartphone" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
          <span className="grow">{t(MODELES_REPRISE.find((m) => m.id === modele)?.nom ?? modele)}</span>
          <span className="suf">{t('Changer')}</span>
          <select id="tr-modele" value={modele} onChange={(ev) => setModele(ev.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', cursor: 'pointer' }}>
            {MODELES_REPRISE.map((m) => (
              <option key={m.id} value={m.id}>
                {t(m.nom)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="card ">
        {chips('allume', [[true, 'Oui'], [false, 'Non']], 'Il s’allume et fonctionne ?')}
        {chips('ecran', [['intact', 'Intact'], ['rayures', 'Rayures légères'], ['fissure', 'Fissuré']], 'L’écran')}
        {chips('batterie', [[true, 'Oui'], [false, 'Non']], 'La batterie tient la journée ?')}
        {chips('coque', [['bon', 'Bon état'], ['abimee', 'Abîmée']], 'La coque')}
      </div>
      </Colonne>
      <Aside titre="Avant le dépôt">
      <div className="sec">
        <h2>{t('Avant le dépôt')}</h2>
      </div>
      <div className="card ">
        {coche(e.compteRetire, () => setE({ ...e, compteRetire: !e.compteRetire }), 'Compte Google retiré du téléphone', (
          <>
            <b>{t('Compte Google retiré')}</b>
            {t(' du téléphone')}
          </>
        ))}
        {coche(e.codeRetire, () => setE({ ...e, codeRetire: !e.codeRetire }), 'Code de verrouillage retiré', <b>{t('Code de verrouillage retiré')}</b>)}
        {coche(sauvegarde, () => setSauvegarde(!sauvegarde), 'Données sauvegardées ailleurs (conseillé)', t('Données sauvegardées ailleurs (conseillé)'))}
      </div>
      <div className="cl15-inf">
        <Icone nom="info" taille={17} />
        <span>{t('Sans compte ni code retirés, le reconditionneur ne peut pas reprendre le téléphone.')}</span>
      </div>
      <div className="btns">
        <button type="button" className={'btn primary' + (pret ? '' : ' off')} onClick={() => pret && naviguer(chemin('troc-offre', { p, modele, e: [e.allume ? 1 : 0, e.ecran, e.batterie ? 1 : 0, e.coque].join('.') }))}>
          <span>{t('Estimer ma reprise')}</span>
        </button>
      </div>
      </Aside>
    </Ecran>
  )
}

// Le motif d'une contre-offre ou d'un refus (état constaté, pièce manquante, prix du marché, compte encore lié,
// IMEI signalé), avec les photos du constat quand le reconditionneur en a pris ; touche une photo pour l'agrandir.
const TITRES_MOTIF: Record<NonNullable<TrocDonnee['motif']>['type'], [string, string]> = {
  etat: ['État constaté différent de l’état déclaré', 'scan-line'],
  piece: ['Pièce manquante', 'circle-alert'],
  marche: ['Prix du marché en baisse', 'trending-down'],
  compte: ['Compte encore lié au téléphone', 'lock'],
  imei: ['IMEI signalé', 'shield-alert'],
}
const PhotoConstat = ({ src }: { src: string }) => (/^(data:|https?:|\/)/.test(src) ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Dessin id={src} />)
export function MotifTroc({ tr }: { tr: TrocDonnee }) {
  const { t, tf } = usePreferences()
  const [grande, setGrande] = useState<number | null>(null)
  const m = tr.motif
  if (!m) return null
  const [titre, ic] = TITRES_MOTIF[m.type] ?? TITRES_MOTIF.etat
  return (
    <>
      <div className="sec">
        <h2>{t('Le motif')}</h2>
      </div>
      <div className="card tight">
        <div className="li">
          <span className={'ic ' + (m.type === 'imei' || m.type === 'compte' ? 'red' : 'amber')}>
            <Icone nom={ic} taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t(titre)}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t(m.texte)}
            </span>
          </span>
        </div>
        {m.photos.length > 0 && (
          <div className="blk" style={{ padding: '4px 14px 12px' }}>
            <div className="cl15-k">{tf(m.photos.length > 1 ? '{n} photos du constat' : '{n} photo du constat', { n: m.photos.length })}</div>
            <div className="cl15-strip">
              {m.photos.map((ph, i) => (
                <button key={i} type="button" className="thumb" aria-label={tf('Agrandir la photo : {l}', { l: t(ph.legende) })} aria-pressed={grande === i} onClick={() => setGrande(grande === i ? null : i)} style={{ width: '64px', height: '64px', borderRadius: '12px', padding: 0, border: grande === i ? '2px solid var(--or)' : undefined, cursor: 'pointer', overflow: 'hidden' }}>
                  <PhotoConstat src={ph.src} />
                </button>
              ))}
            </div>
            {grande !== null && m.photos[grande] && (
              <figure style={{ margin: '10px 0 0' }}>
                <span className="thumb" style={{ width: '100%', height: '220px', borderRadius: '14px', overflow: 'hidden', display: 'block' }}>
                  <PhotoConstat src={m.photos[grande].src} />
                </span>
                <figcaption className="t13 c3 mt4">{t(m.photos[grande].legende)}</figcaption>
              </figure>
            )}
          </div>
        )}
        {!m.photos.length && (
          <div className="li">
            <span className="ic">
              <Icone nom="image-off" taille={20} />
            </span>
            <span className="grow">
              <span className="ls" style={{ display: 'block' }}>
                {t('Pas de photo du constat : tu peux contester, l’équipe BelivaY les demande au reconditionneur.')}
              </span>
            </span>
          </div>
        )}
      </div>
    </>
  )
}

// Contester le constat (contre-offre ou refus) : une fois, avec ses raisons ; l'équipe BelivaY revoit les photos
// avec le reconditionneur et répond sous 48 h ; le téléphone reste chez lui et rien n'est payé en attendant ;
// accepter ou récupérer son téléphone reste possible à tout moment.
export function ContesterTroc({ tr, fait }: { tr: TrocDonnee; fait: () => void }) {
  const { t, tf, langue } = usePreferences()
  const [ouvert, setOuvert] = useState(false)
  const [texte, setTexte] = useState('')
  const [vu, setVu] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  if (tr.contestation)
    return (
      <div className="note ink" role="status">
        <Icone nom="flag" taille={16} />
        <span>
          <b>{tf('Contestation envoyée le {d}.', { d: dateA(tr.contestation.le, langue) })}</b>{' '}
          {tf('Réponse de l’équipe BelivaY au plus tard le {d}. Ton téléphone reste chez le reconditionneur ; tu peux encore accepter ou le récupérer.', { d: dateA(tr.contestation.reponseAvant, langue) })}
        </span>
      </div>
    )
  const erreur = texte.trim().length < 10 ? 'Explique en quelques mots ce que tu contestes (10 caractères au moins).' : ''
  if (!ouvert)
    return (
      <div className="btns">
        <button type="button" className="btn ghost" onClick={() => setOuvert(true)}>
          <span>{t(tr.etat === 'refuse' ? 'Contester le refus' : 'Contester le constat')}</span>
        </button>
      </div>
    )
  return (
    <>
      <div className="fld mt12">
        <label htmlFor="tr-contester">{t('Ce que tu contestes')}</label>
        <div className={'inp area' + (vu && erreur ? ' err' : '')}>
          <textarea id="tr-contester" rows={3} maxLength={500} value={texte} placeholder={t('Par exemple : l’écran n’était pas fissuré quand je l’ai déposé, le gérant l’a vu.')} onChange={(e) => setTexte(e.target.value)} />
        </div>
        <div className="hint" style={vu && erreur ? { color: 'var(--red)' } : undefined} role={vu && erreur ? 'alert' : undefined}>
          {vu && erreur ? t(erreur) : `${texte.length}/500`}
        </div>
      </div>
      <div className="btns">
        <button
          type="button"
          className={'btn secondary' + (envoi ? ' off' : '')}
          onClick={async () => {
            setVu(true)
            if (erreur || envoi) return
            setEnvoi(true)
            await source.contesterTroc(tr.id, texte)
            setEnvoi(false)
            fait()
          }}
        >
          <span>{t('Envoyer ma contestation')}</span>
        </button>
      </div>
      <div className="hint-l">
        <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('L’équipe BelivaY revoit les photos avec le reconditionneur et te répond sous 48 h. Rien n’est payé en attendant.')}</span>
      </div>
    </>
  )
}
