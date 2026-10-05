// Recherche (CL-05), forme d'origine du prototype rendue réelle (DP-54) : ce que partagent ses écrans.
// - l'en-tête de recherche : retour, champ (vrai champ à la saisie, sinon lien vers la saisie), effacer le texte,
//   recherche vocale (feuille « Je t'écoute… » : la reconnaissance vocale du téléphone quand elle existe),
//   « Rechercher », et le relais d'où partent les distances (ouvre le choix du relais) ;
// - l'accueil de la recherche : tes recherches (effaçables une à une ou toutes, avec confirmation), les recherches
//   populaires comptées dans le catalogue, les univers et leurs produits ;
// - le corps des résultats : la correction d'une faute, le nombre de produits, tri et « Retirable aujourd'hui »,
//   les filtres actifs, les lignes produit (marque, note, vendeur, retrait calculé, prêt aujourd'hui ou délai de la
//   boutique, colis trop volumineux, déjà sur le trajet du panier, stock bas, autres vendeurs et leur meilleur prix), chargées en défilant, les colis M, L et XL, « Tu cherchais autre chose ? » ;
// - « rien trouvé » : ce qui s'en approche, l'alerte (créer, annuler), la catégorie, les conseils pour mieux
//   chercher (et l'aide), les recherches populaires.
// L'accueil montre aussi les marques du catalogue, comptées.
import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CarteProduit, corriger, correspond, fermeture, filtrer, filtresDe, fraisRetrait, heureDe, km, norme, relaisFermeAujourdhui, retirableAujourdhui, UNIVERS, type Contexte, type Filtres } from '../../composants/Catalogue'
import { Dessin } from '../../composants/Dessin'
import { OrigineProche, useLieu } from '../../composants/PourQui'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { PARAMETRES } from '../../donnees/frais'
import { oublierRecherches, POPULAIRES, recentes, retenirRecherche } from '../../donnees/recherches'
import { source, type Produit } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useMajSession } from '../../session'
import { useDes } from '../../composants/ecran'
import { TriListe } from '../CL-04/VueListe'
import { useChargement, VoirPlus } from '../CL-04/Chargement'

const BOUTON = { border: 0, padding: 0, font: 'inherit', cursor: 'pointer' } as const
const ACTION = { width: '34px', height: '34px', color: 'var(--ink-2)' } as const
const quartier = (c: Contexte | null) => c?.relais?.quartier ?? 'Mvog-Ada'

type Reco = { start(): void; stop(): void; lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void; onerror: () => void; onend: () => void }

// Recherche vocale (feuille « Je t'écoute… ») : la reconnaissance vocale du navigateur quand elle existe. Partagée par
// l'en-tête de recherche du téléphone et le champ de l'en-tête de site (grands écrans, où la feuille est une modale).
export const vocaleDisponible = () => {
  const W = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
  return !!(W.SpeechRecognition ?? W.webkitSpeechRecognition)
}
export function useRechercheVocale(chercher: (v: string) => void) {
  const { t, langue } = usePreferences()
  const [voix, setVoix] = useState<'non' | 'ecoute' | 'indispo'>('non')
  const [dit, setDit] = useState('')
  const reco = useRef<Reco | null>(null)
  const ecouter = () => {
    setDit('')
    const W = window as unknown as { SpeechRecognition?: new () => Reco; webkitSpeechRecognition?: new () => Reco }
    const C = W.SpeechRecognition ?? W.webkitSpeechRecognition
    if (!C) return setVoix('indispo')
    const r = new C()
    r.lang = langue === 'en' ? 'en-GB' : 'fr-FR'
    r.interimResults = true
    r.onresult = (e) => {
      const x = Array.from(e.results).map((a) => a[0].transcript).join(' ')
      setDit(x)
      if (e.results[e.results.length - 1].isFinal) (setVoix('non'), chercher(x))
    }
    r.onerror = () => setVoix('indispo')
    r.onend = () => setVoix((v) => (v === 'ecoute' ? 'non' : v))
    reco.current = r
    setVoix('ecoute')
    r.start()
  }
  const annuler = () => {
    reco.current?.stop()
    reco.current = null
    setVoix('non')
  }
  const feuille = voix !== 'non' && (
    <>
      <div className="veil" onClick={annuler}></div>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t('Recherche vocale')}>
        <div className="grab"></div>
        <div className="cl05-voice">
          <div className="cl05-mic">
            <Icone nom="mic" taille={40} trait={2} />
          </div>
          {voix === 'ecoute' ? (
            <>
              <div className="cl05-wave">
                {[10, 18, 28, 16, 34, 24, 12, 30, 20, 36, 22, 14, 26, 18, 10].map((h, i) => (
                  <i key={i} style={{ height: h + 'px' }}></i>
                ))}
              </div>
              <h3>{t('Je t’écoute…')}</h3>
              {dit && (
                <a href="#" className="cl05-said" style={{ display: 'block' }} onClick={(e) => (e.preventDefault(), annuler(), chercher(dit))}>
                  «&nbsp;{dit}&nbsp;»
                </a>
              )}
              <p>{t('Parle en français ou en anglais. La recherche part dès que tu as fini.')}</p>
            </>
          ) : (
            <p>{t('La recherche vocale n’est pas disponible sur ce téléphone : écris ta recherche.')}</p>
          )}
          <div className="btns" style={{ marginTop: '18px' }}>
            <button type="button" className="btn secondary" onClick={annuler}>
              <span>{t(voix === 'ecoute' ? 'Annuler' : 'Fermer')}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
  return { ecouter, feuille }
}

// En-tête de recherche (header.cl05-hd). « edition » : le champ se tape ici (saisie) ; sinon il mène à la saisie.
export function EnteteRecherche(p: { c: Contexte | null; q: string; retour?: string; edition?: { setQ: (v: string) => void; soumettre: () => void }; parametres?: Record<string, string> }) {
  const { t } = usePreferences()
  const lieuR = useLieu()
  const naviguer = useNavigate()
  const lieu = useLocation()
  const chercher = (v: string) => {
    if (!v.trim()) return
    retenirRecherche(v.trim())
    naviguer(chemin('recherche-resultats', { q: v.trim(), ...(p.parametres ?? {}) }))
  }
  // Loupe sans texte : le champ à remplir (focus dans la saisie, sinon la page de saisie).
  const soumettre = (e: FormEvent) => {
    e.preventDefault()
    if (!p.q.trim()) {
      if (p.edition) (e.currentTarget as HTMLFormElement).querySelector('input')?.focus()
      else naviguer(chemin('recherche-saisie', p.parametres))
      return
    }
    if (p.edition) p.edition.soumettre()
    else chercher(p.q)
  }
  const voix = useRechercheVocale(chercher)
  // Micro de l'en-tête des autres pages (?st=voix) : l'écoute s'ouvre à l'arrivée, puis le paramètre est retiré.
  const [params, setParams] = useSearchParams()
  const parVoix = params.get('st') === 'voix'
  useEffect(() => {
    if (!parVoix) return
    voix.ecouter()
    const n = new URLSearchParams(params)
    n.delete('st')
    setParams(n, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parVoix])
  const large = useDes('tab')
  const ici = lieu.pathname.replace(/^\//, '') + lieu.search
  const versRelais = chemin('relais-selecteur', { ...(p.q ? { q: p.q } : {}), retour: ici })
  const saisie = chemin('recherche-saisie', p.q ? { q: p.q, ...(p.parametres ?? {}) } : p.parametres)
  // Dès 768 px, le champ de l'en-tête de site est la recherche (§ 5.3) ; le relais d'origine des distances passe
  // dans la barre des résultats (RelaisOrigine). La feuille de la voix (?st=voix, micro) reste montrée : en modale.
  if (large) return <>{voix.feuille}</>
  return (
    <>
      <header className="hd cl05-hd">
        <div className="cl05-bar">
          <Link to={p.retour ?? chemin('accueil')} className="ibtn" aria-label={t('Revenir')}>
            <Icone nom="chevron-left" taille={24} trait={2.4} />
          </Link>
          <form className={'cl05-sb' + (p.edition ? ' focus' : '')} role="search" onSubmit={soumettre}>
            <span className="cl05-in go">
              <Icone nom="search" taille={20} />
            </span>
            {p.edition ? (
              <span className="cl05-t">
                <input
                  autoFocus
                  type="text"
                  role="searchbox"
                  enterKeyHint="search"
                  aria-label={t('Chercher un produit')}
                  placeholder={t('Rechercher un produit, une marque…')}
                  value={p.q}
                  onChange={(e) => p.edition!.setQ(e.target.value)}
                  style={{ flex: 1, minWidth: 0, border: 0, padding: 0, margin: 0, background: 'transparent', font: 'inherit', color: 'inherit', outline: 'none' }}
                />
              </span>
            ) : (
              <Link to={saisie} className="cl05-t">
                {p.q ? <span>{p.q}</span> : <span className="cl05-ph">{t('Rechercher un produit, une marque…')}</span>}
              </Link>
            )}
            {p.q &&
              (p.edition ? (
                <button type="button" className="cl05-in" aria-label={t('Effacer le texte')} style={{ ...BOUTON, background: 'transparent' }} onClick={() => p.edition!.setQ('')}>
                  <Icone nom="circle-x" taille={19} />
                </button>
              ) : (
                <Link to={chemin('recherche-saisie', p.parametres)} className="cl05-in" aria-label={t('Effacer le texte')}>
                  <Icone nom="circle-x" taille={19} />
                </Link>
              ))}
            <button type="button" className="cl05-in mic" aria-label={t('Recherche vocale')} style={{ ...BOUTON, background: 'transparent' }} onClick={voix.ecouter}>
              <Icone nom="mic" taille={19} />
            </button>
            <button type="submit" className="cl05-gob" aria-label={t('Rechercher')} style={BOUTON}>
              <Icone nom="search" taille={21} trait={2.4} />
            </button>
          </form>
        </div>
        {lieuR.diaspora ? <OrigineProche classe="cl05-rp" /> : <Link to={versRelais} className="cl05-rp">
          <Icone nom="map-pin" taille={16} />
          <span className="nw">
            {t('Retrait à ')}
            <b>{t(quartier(p.c))}</b>
          </span>
          <Icone nom="chevron-down" taille={15} />
          <span className="sm">{t('— les distances partent d’ici')}</span>
        </Link>}
      </header>
      {voix.feuille}
    </>
  )
}

// Grands écrans : la pastille du relais d'où partent les distances (celle de l'en-tête de recherche du téléphone).
export function RelaisOrigine({ c, q }: { c: Contexte | null; q?: string }) {
  const { t } = usePreferences()
  const lieu = useLocation()
  if (useLieu().diaspora) return <OrigineProche classe="cl05-rp l-rp" />
  const ici = lieu.pathname.replace(/^\//, '') + lieu.search
  return (
    <Link to={chemin('relais-selecteur', { ...(q ? { q } : {}), retour: ici })} className="cl05-rp l-rp">
      <Icone nom="map-pin" taille={16} />
      <span className="nw">
        {t('Retrait à ')}
        <b>{t(quartier(c))}</b>
      </span>
      <Icone nom="chevron-down" taille={15} />
      <span className="sm">{t('— les distances partent d’ici')}</span>
    </Link>
  )
}

// Message bref posé en bas de l'écran (cl05-toast), dans #app.
export function Toast({ texte }: { texte: string | null }) {
  const app = document.getElementById('app')
  if (!texte || !app) return null
  return createPortal(
    <div className="cl05-toast" role="status">
      <Icone nom="circle-check" taille={20} />
      <span>{texte}</span>
    </div>,
    app,
  )
}

// Accueil de la recherche : tes recherches, recherches populaires, univers.
export function AccueilRecherche({ c, colonnes }: { c: Contexte | null; colonnes?: boolean }) {
  // En page sur grand écran (dès 1024 px) : trois colonnes, tes recherches | populaires et marques | univers.
  const enColonnes = useDes('tab-l') && !!colonnes
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const [liste, setListe] = useState(recentes())
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const x = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(x)
  }, [toast])
  const aller = (q: string) => (retenirRecherche(q), naviguer(chemin('recherche-resultats', { q })))
  const tous = c?.tous ?? []
  const populaires = POPULAIRES.map((q) => ({ q, n: filtrer(tous, { q }).length })).filter((x) => x.n > 0)
  // Marques du catalogue (champ marque), les plus présentes d'abord.
  const marques = Object.entries(tous.reduce<Record<string, number>>((m, p) => (p.marque ? { ...m, [p.marque]: (m[p.marque] ?? 0) + 1 } : m), {}))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
  const contenu = (
    <>
      <Groupe actif={enColonnes}>
      {liste.length > 0 && (
        <>
          <div className="cl05-lab">
            <span>{t('Tes recherches')}</span>
            <a href="#" onClick={(e) => (e.preventDefault(), oublierRecherches(), setListe([]), setToast(t('Tes recherches sont effacées de ce téléphone.')))}>
              {t('Effacer')}
            </a>
          </div>
          {liste.map((q) => (
            <div key={q} className="cl05-h">
              <a href="#" className="cl05-hq" onClick={(e) => (e.preventDefault(), aller(q))}>
                <Icone nom="clock" taille={18} />
                <span className="grow">{q}</span>
              </a>
              <button type="button" className="ibtn" aria-label={tf('Supprimer « {q} »', { q })} onClick={() => (oublierRecherches(q), setListe(recentes()))}>
                <Icone nom="x" taille={17} />
              </button>
            </div>
          ))}
        </>
      )}
      </Groupe>
      <Groupe actif={enColonnes}>
      {populaires.length > 0 && (
        <>
          <div className="cl05-lab">
            <span>{t('Recherches populaires')}</span>
          </div>
          <p className="cl05-sub">{tf('Autour du {r} · produits trouvés par recherche', { r: t(c?.relais?.nom ?? 'Relais Mvog-Ada') })}</p>
          <div className="chips">
            {populaires.map((x) => (
              <a key={x.q} href="#" className="chip" onClick={(e) => (e.preventDefault(), aller(x.q))}>
                {t(x.q) + ' '}
                <span className="n">{x.n}</span>
              </a>
            ))}
          </div>
        </>
      )}
      {marques.length > 0 && (
        <>
          <div className="cl05-lab">
            <span>{t('Marques')}</span>
          </div>
          <div className="chips">
            {marques.map(([m, n]) => (
              <a key={m} href="#" className="chip" onClick={(e) => (e.preventDefault(), aller(m))}>
                {m + ' '}
                <span className="n">{n}</span>
              </a>
            ))}
          </div>
        </>
      )}
      </Groupe>
      <Groupe actif={enColonnes}>
      <div className="cl05-lab">
        <span>{t('Parcourir')}</span>
      </div>
      <div className="cl05-u3g">
        {UNIVERS.map((u) => {
          const n = tous.filter((p) => p.univers === u.id).length
          return (
            <Link key={u.id} to={chemin('liste', { cat: u.id })} className="cl05-u3">
              <span>{t(u.titre)}</span>
              <small>
                <span className="nw">
                  {n}
                  <span>{t(n > 1 ? ' produits' : ' produit')}</span>
                </span>
              </small>
            </Link>
          )
        })}
      </div>
      </Groupe>
      <Toast texte={toast} />
    </>
  )
  return enColonnes ? <div className="cl05-acc">{contenu}</div> : contenu
}

const Groupe = ({ actif, children }: { actif: boolean; children: ReactNode }) => (actif ? <div className="cl05-col">{children}</div> : <>{children}</>)

// Suggestions pour un début de recherche.
export function suggestionsDe(c: Contexte, q: string, cat?: string) {
  const dans = c.tous.filter((p) => !cat || p.univers === cat)
  const n = norme(q.trim())
  const rec = recentes()
  const vus = new Set<string>()
  // Recherches récentes, populaires, débuts de titres et marques (« oraimo »).
  const phrases = [...rec, ...POPULAIRES, ...dans.map((p) => p.titre.split(/[ ·]+/).slice(0, 2).join(' ').toLowerCase()), ...dans.flatMap((p) => (p.marque ? [p.marque.toLowerCase()] : []))]
    .filter((x) => {
      const k = norme(x)
      if (vus.has(k) || k === n || !(k.startsWith(n) || (n.length > 4 && k.startsWith(n.slice(0, -1))))) return false
      vus.add(k)
      return true
    })
    .map((x) => ({ x, recente: rec.includes(x), n: filtrer(dans, { q: x }).length }))
    .slice(0, 5)
  const cats = UNIVERS.filter((u) => !cat || u.id === cat)
    .flatMap((u) => u.subs.map((s) => ({ u, s, n: c.tous.filter((p) => p.univers === u.id && p.sousCategorie === s).length })))
    .filter((x) => norme(x.s).split(/\s+/).some((m) => m.startsWith(n)) || norme(x.s).includes(n))
    .slice(0, 3)
  const produits = dans.filter((p) => correspond(p, q)).slice(0, 4)
  return { phrases, cats, produits }
}


// Suggestions d'un début de recherche (dès deux lettres) : recherches complétées et leur nombre, sous-catégories,
// produits et leur prix. Partagées par la saisie de recherche et le panneau de l'en-tête de site (grands écrans).
export function Suggestions({ s, q, chercher }: { s: ReturnType<typeof suggestionsDe>; q: string; chercher: (v: string) => void }) {
  const { t, tf } = usePreferences()
  const lieuR = useLieu()
  // Ce qui est déjà tapé en clair, la suite proposée en gras.
  const typed = (x: string) => {
    const a = norme(x)
    const b = norme(q)
    let i = 0
    while (i < a.length && i < b.length && a[i] === b[i]) i++
    return i ? (
      <>
        <span>{x.slice(0, i)}</span>
        <b>{x.slice(i)}</b>
      </>
    ) : (
      <b>{x}</b>
    )
  }
  return (
    <>
      <div style={{ marginTop: '6px' }}>
        {s.phrases.map((x) => (
          <a key={x.x} href="#" className="cl05-s2" onClick={(e) => (e.preventDefault(), chercher(x.x))}>
            <Icone nom={x.recente ? 'clock' : 'search'} taille={17} />
            <span className="st">{typed(x.x)}</span>
            {x.n ? <span className="cl05-cb">{x.n}</span> : <span className="cl05-tg">{t('0 · on cherche')}</span>}
          </a>
        ))}
        {s.cats.map((x) => (
          <Link key={x.u.id + x.s} to={chemin('liste', { cat: x.u.id, sub: x.s })} className="cl05-s2" onClick={() => retenirRecherche(q)}>
            <Icone nom="layout-grid" taille={17} />
            <span className="st">
              <b>{t(x.s)}</b>
            </span>
            <span className="cl05-tg">{t(x.u.titre)}</span>
            <span className="cl05-cb">{x.n}</span>
          </Link>
        ))}
        {s.produits.map((p) => (
          <Link key={p.p} to={chemin('fiche', { p: p.p })} className="cl05-s2" onClick={() => retenirRecherche(q)}>
            <span style={{ width: '32px', height: '32px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: 'var(--prod-bg)' }}>{(p.dessins[0] || p.images?.[0]) && <Dessin id={p.dessins[0] ?? ''} image={p.images?.[0]} alt={p.titre} tailles="64px" />}</span>
            <span className="st">
              <b>{t(p.titre)}</b>
              <span className="t12 c3" style={{ display: 'block' }}>
                {[p.marque, p.stock > 0 ? lieuR.r('{k} de ton relais', { k: p.distance ?? '' }) : t('Épuisé')].filter(Boolean).join(' · ')}
              </span>
            </span>
            <span className="cl05-cb">{F(p.depuis ?? p.prix)}&nbsp;F</span>
          </Link>
        ))}
      </div>
      {s.phrases.some((x) => !x.n) && (
        <div className="hint-l">
          <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('« On cherche » : aucun produit pour l’instant, on démarche des vendeurs.')}</span>
        </div>
      )}
      {!s.phrases.length && !s.cats.length && !s.produits.length && <p className="cl05-sub mt12">{tf('Aucune suggestion pour « {q} ».', { q })}</p>}
    </>
  )
}

// Une ligne produit des résultats (cl05-row) : retrait calculé, colis trop volumineux, déjà sur le trajet du panier,
// stock ; cœur (favori) et « + » (panier).
export function LigneProduit({ p, c, auChange }: { p: Produit; c: Contexte; auChange: (texte: string) => void }) {
  const { t, tf } = usePreferences()
  const lieuR = useLieu()
  const majSession = useMajSession()
  const [fav, setFav] = useState(c.favoris.includes(p.p))
  const trajet = c.dansLePanier.includes(p.vendeur.boutique)
  const frais = fraisRetrait(p)
  const remise = p.prixBarre && p.prixBarre > p.prix ? Math.round((1 - p.prix / p.prixBarre) * 100) : 0
  // De quoi comparer sans ouvrir la fiche : marque, note, vendeur ; délai de préparation de la boutique et retrait
  // du jour (règle retirableAujourdhui) ; stock bas ; autres vendeurs du même produit et leur meilleur prix.
  const delai = c.boutiques[p.vendeur.boutique]?.delai
  const auj = retirableAujourdhui(p, c)
  const autresMin = p.autres.length ? Math.min(...p.autres.map((a) => a.prix)) : null
  const qui = [p.marque, p.note ? `★ ${p.note} (${p.avis})` : null, t(p.vendeur.boutique)].filter(Boolean).join(' · ')
  const coeur = async (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const f = await source.basculerFavori(p.p)
    setFav(f)
    auChange(tf(f ? '« {p} » ajouté aux favoris.' : '« {p} » retiré des favoris.', { p: t(p.titre) }))
    majSession(await source.session())
  }
  const ajouter = async (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await source.ajouterProduit(p.p, {}, 1)
    auChange(tf('« {p} » ajouté au panier.', { p: t(p.titre) }))
    majSession(await source.session())
  }
  return (
    <Link to={chemin('fiche', { p: p.p })} className={'cl05-row' + (p.stock > 0 ? '' : ' out')}>
      <span className="th">{(p.dessins[0] || p.images?.[0]) && <Dessin id={p.dessins[0] ?? ''} image={p.images?.[0]} alt={p.titre} tailles="64px" />}</span>
      <span className="bd">
        {trajet && frais !== null && <span className="mk">{t('Déjà sur le trajet de ton panier — sans ramassage en plus')}</span>}
        <span className="tt">{t(p.titre)}</span>
        <span className="xs">{qui}</span>
        <span className="pr">
          <span className="price">
            {p.depuis && <small className="fr">{t('à partir de ')}</small>}
            {F(p.depuis ?? p.prix)}
            <small>{t(' F')}</small>
          </span>
          {remise > 0 && (
            <>
              {' '}
              <s className="was">{F(p.prixBarre!)}&nbsp;F</s> <span className="off">−{remise}&nbsp;%</span>
            </>
          )}
        </span>
        {p.stock > 0 && !(trajet && frais !== null) && (
          <span className="dl2">
            {frais === null ? (
              <>
                <span className="dl home">
                  <Icone nom="truck" taille={13} />
                  {t('Livraison à domicile')}
                </span>
                <span className="xs">{t('Trop volumineux pour un relais')}</span>
              </>
            ) : frais === 0 ? (
              <span className="dl free">
                <Icone nom="check" taille={13} trait={2.6} />
                {t('Retrait offert')}
              </span>
            ) : (
              <span className="dl">{tf('+ {m} F de retrait', { m: F(frais) })}</span>
            )}
            {frais !== null && (auj ? <span className="xs" style={{ color: 'var(--green)' }}>{lieuR.r('Retirable aujourd’hui')}</span> : delai ? <span className="xs">{tf('Prêt en {d} chez le vendeur', { d: delai })}</span> : null)}
          </span>
        )}
        {(p.stock > 0 && p.stock <= 5) || autresMin !== null ? (
          <span className="xs">
            {p.stock > 0 && p.stock <= 5 && <span style={{ color: 'var(--red)' }}>{tf(p.stock > 1 ? 'Plus que {n} en stock' : 'Plus que {n} en stock (dernier)', { n: p.stock })}</span>}
            {p.stock > 0 && p.stock <= 5 && autresMin !== null && t(' · ')}
            {autresMin !== null && tf(p.autres.length > 1 ? '{n} autres vendeurs dès {m} F' : '1 autre vendeur à {m} F', { n: p.autres.length, m: F(autresMin) })}
          </span>
        ) : null}
        <span className={'ds' + (trajet && frais !== null ? ' gn' : '')} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="grow">
            <span>{t(p.distance ?? '')}</span> <span>{lieuR.r('de ton relais')}</span>
          </span>
          <span className="ibtn" role="button" tabIndex={0} aria-pressed={fav} aria-label={t(fav ? 'Retirer des favoris' : 'Ajouter aux favoris')} onClick={coeur} style={ACTION}>
            <Icone nom="heart" taille={18} style={fav ? { fill: 'currentColor', color: 'var(--or)' } : undefined} />
          </span>
          {p.stock > 0 && (
            <span className="ibtn" role="button" tabIndex={0} aria-label={tf('Ajouter au panier : {p}', { p: t(p.titre) })} onClick={ajouter} style={ACTION}>
              <Icone nom="plus" taille={18} trait={2.4} />
            </span>
          )}
        </span>
      </span>
      <span className={'cl05-sp' + (p.stock > 0 ? '' : ' out')}>{t(p.stock > 0 ? 'En stock' : 'Épuisé')}</span>
    </Link>
  )
}

// Recherche effective : la saisie, ou sa correction quand aucun produit n'a tous les mots.
export function rechercheDe(c: Contexte, q: string) {
  const corrige = q.trim() && !c.tous.some((p) => correspond(p, q)) ? corriger(c.tous, q) : null
  return corrige && filtrer(c.tous, { q: corrige }).length ? { q: corrige, corrigeDepuis: q } : { q, corrigeDepuis: null }
}

export function resultatsDe(c: Contexte, params: URLSearchParams, maj: Partial<Filtres> = {}) {
  const r = rechercheDe(c, params.get('q') ?? '')
  const f: Filtres = { ...filtresDe(params), promo: params.get('promo') === '1', q: r.q, ...maj }
  const auj = (p: Produit) => retirableAujourdhui(p, c)
  return { ...r, f, auj, liste: filtrer(c.tous, f, auj) }
}

const PAGE = 6
const CLE_VUE = 'blv-vue-resultats'
const lireVue = (): 'grille' | 'lignes' => {
  try {
    return localStorage.getItem(CLE_VUE) === 'lignes' ? 'lignes' : 'grille'
  } catch {
    return 'grille'
  }
}

// Corps des résultats (sans l'en-tête).
export function CorpsResultats({ c }: { c: Contexte }) {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const lieu = useLocation()
  const [message, setMessage] = useState<string | null>(null)
  const qSaisi = params.get('q') ?? ''
  const { q, corrigeDepuis, f, liste } = resultatsDe(c, params)
  // Chargement en défilant ; dès 768 px, « Voir plus » après 3 chargements (CL-04/Chargement.tsx).
  const { vus, suite, reste, enAttente, plus, large } = useChargement(liste.length, PAGE, params.toString())
  // Dès 1024 px : panneau des filtres en place (colonne gauche), tri en menu, résultats en grille de cartes, ou en
  // lignes au choix (gardé sur l'appareil).
  const enPlace = useDes('tab-l')
  const [vue, setVue] = useState<'grille' | 'lignes'>(lireVue)
  const changerVue = (v: 'grille' | 'lignes') => {
    setVue(v)
    try {
      localStorage.setItem(CLE_VUE, v)
    } catch {
      /* stockage indisponible : le choix vaut pour la visite */
    }
  }
  const enGrille = enPlace && vue === 'grille'
  const aller = (maj: Record<string, string | null>) => {
    const n = new URLSearchParams(params)
    Object.entries(maj).forEach(([k, v]) => (v === null ? n.delete(k) : n.set(k, v)))
    naviguer({ search: n.toString() }, { replace: true })
  }
  const actifs: [string, string][] = [
    ...(f.prixMin !== undefined ? ([['min', tf('dès {m} F', { m: F(f.prixMin) })]] as [string, string][]) : []),
    ...(f.prixMax !== undefined ? ([['max', tf('jusqu’à {m} F', { m: F(f.prixMax!) })]] as [string, string][]) : []),
    ...(f.km !== undefined ? ([['km', tf('à {k} km au plus', { k: f.km! })]] as [string, string][]) : []),
    ...(f.note !== undefined ? ([['note', tf('{n} ★ et plus', { n: f.note! })]] as [string, string][]) : []),
    ...(f.stock ? ([['stock', t('en stock')]] as [string, string][]) : []),
    ...(f.offert ? ([['offert', t('retrait offert')]] as [string, string][]) : []),
    ...(f.promo ? ([['promo', t('en promotion')]] as [string, string][]) : []),
    ...(f.relais ? ([['rel', t('retirable à mon relais')]] as [string, string][]) : []),
    ...(params.get('dom') === '1' ? ([['dom', t('livrable à domicile')]] as [string, string][]) : []),
    ...(f.sub ? ([['sub', t(f.sub)]] as [string, string][]) : []),
    ...(f.u ? ([['cat', t(UNIVERS.find((u) => u.id === f.u)?.titre ?? f.u)]] as [string, string][]) : []),
    ...(f.marque ? ([['marque', f.marque === 'Sans marque' ? t('Sans marque') : f.marque]] as [string, string][]) : []),
  ]
  const nbFiltres = actifs.length + (f.auj ? 1 : 0)
  const tri = f.tri ?? 'pertinence'
  const triChip = (k: string, x: string) => (
    <a key={k} href="#" className={'cl05-ch' + (tri === k ? ' on' : '')} aria-pressed={tri === k} onClick={(e) => (e.preventDefault(), aller({ tri: k === 'pertinence' ? null : k }))}>
      {t(x)}
    </a>
  )
  const relaisChange = (lieu.state as { relaisChange?: boolean } | null)?.relaisChange && c.relais
  const retirables = relaisChange ? liste.filter((p) => retirableAujourdhui(p, c)).length : 0
  const gros = liste.some((p) => p.classe !== 'S')
  const aujN = liste.filter((p) => retirableAujourdhui(p, c)).length
  // Catégorie la plus présente dans les résultats (« Voir la catégorie … »).
  const cats = liste.filter((p) => p.sousCategorie).map((p) => `${p.univers}|${p.sousCategorie}`)
  const cat = cats.sort((a, b) => cats.filter((x) => x === b).length - cats.filter((x) => x === a).length)[0]?.split('|')
  const uCat = cat ? UNIVERS.find((u) => u.id === cat[0]) : undefined
  const nCat = uCat ? c.tous.filter((p) => p.univers === uCat.id).length : 0
  if (!liste.length && !actifs.length && !f.auj) return <CorpsZero c={c} q={qSaisi} />
  return (
    <>
      {corrigeDepuis ? (
        <div className="cl05-fx">
          <div className="l1">
            {t('Résultats pour ')}
            <b>{q}</b>
          </div>
          <div className="l2">
            <span>{t('Corrigé depuis')}</span> <span>«&nbsp;{corrigeDepuis}&nbsp;»</span>
            {t(' · ')}
            <b>
              <span className="nw">
                {liste.length}
                <span>{t(liste.length > 1 ? ' produits' : ' produit')}</span>
              </span>
            </b>
          </div>
        </div>
      ) : (
        <p className="cl05-cnt2">
          <b>
            <span className="nw">
              {liste.length}
              <span>{t(liste.length > 1 ? ' produits' : ' produit')}</span>
            </span>
          </b>
          {q ? tf(' pour « {q} »', { q }) : ''}
          {!f.auj && aujN > 0 && tf(aujN > 1 ? ' · {n} retirables aujourd’hui' : ' · {n} retirable aujourd’hui', { n: aujN })}
        </p>
      )}
      <div className="cl05-chr" style={{ overflowX: 'auto' }}>
        {!enPlace && (
          <Link to={chemin('recherche-filtres', Object.fromEntries([...params.entries(), ['retour', 'recherche-resultats']]))} className={'cl05-ch' + (nbFiltres ? ' on' : '')}>
            <Icone nom="sliders-horizontal" taille={16} />
            {t('Filtres')}
            {nbFiltres > 0 && <span className="b">{nbFiltres}</span>}
          </Link>
        )}
        {enPlace && <TriListe tri={tri} choisir={(k) => aller({ tri: k === 'pertinence' ? null : k })} />}
        {!enPlace && triChip('pertinence', 'Pertinence')}
        {!enPlace && triChip('proche', 'Au plus proche')}
        <a href="#" className={'cl05-ch gr' + (f.auj ? ' on' : '')} aria-pressed={!!f.auj} onClick={(e) => (e.preventDefault(), aller({ auj: f.auj ? null : '1', f: null }))}>
          <Icone nom="clock" taille={16} />
          {t('Retirable aujourd’hui')}
        </a>
        {!enPlace && triChip(tri === 'prix' ? 'prix-desc' : 'prix', tri === 'prix' ? 'Prix décroissant' : 'Prix croissant')}
        {!enPlace && triChip('note', 'Mieux notés')}
        {large && <RelaisOrigine c={c} q={qSaisi} />}
        {enPlace && (
          <div className="l-vue" role="group" aria-label={t('Affichage des résultats')}>
            <button type="button" className={vue === 'lignes' ? 'on' : ''} aria-pressed={vue === 'lignes'} onClick={() => changerVue('lignes')}>
              <Icone nom="list" taille={16} />
              {t('Liste')}
            </button>
            <button type="button" className={vue === 'grille' ? 'on' : ''} aria-pressed={vue === 'grille'} onClick={() => changerVue('grille')}>
              <Icone nom="layout-grid" taille={16} />
              {t('Grille')}
            </button>
          </div>
        )}
      </div>
      {relaisChange && (
        <div className="note ink">
          <Icone nom="map-pin" taille={18} />
          <div>
            <b>{tf('Depuis le {r}', { r: t(c.relais!.nom) })}</b>
            {t(' : distances, prix livrés et « retirable aujourd’hui » recalculés. ')}
            <span className="nw">
              {retirables}
              <span>{t(retirables > 1 ? ' produits retirables' : ' produit retirable')}</span>
            </span>
            {relaisFermeAujourdhui(c.relais!, c.maintenant) ? t(' aujourd’hui : le relais est fermé.') : tf(' aujourd’hui, relais ouvert jusqu’à {h}.', { h: heureDe(fermeture(c.relais!.horaires)) })}
          </div>
        </div>
      )}
      {actifs.length > 0 && (
        <div className="chips mt12">
          {actifs.map(([k, x]) => (
            <a key={k} href="#" className="chip on" aria-label={tf('Retirer le filtre {f}', { f: x })} onClick={(e) => (e.preventDefault(), aller({ [k]: null, ...(k === 'rel' ? { f: null } : {}) }))}>
              {x} <Icone nom="x" taille={14} />
            </a>
          ))}
          <a href="#" className="chip" onClick={(e) => (e.preventDefault(), aller({ min: null, max: null, km: null, note: null, stock: null, offert: null, promo: null, rel: null, dom: null, cat: null, sub: null, marque: null, auj: null, f: null }))}>
            {t('Tout effacer')}
          </a>
        </div>
      )}
      {message && (
        <div className="note green" role="status">
          <Icone nom="circle-check" taille={18} />
          <div>
            {message} <Link to={chemin('panier')}>{t('Voir le panier')}</Link>
          </div>
        </div>
      )}
      {enGrille ? (
        <div className="pgrid l-res">
          {liste.slice(0, vus).map((p) => (
            <CarteProduit key={p.p} p={p} favori={c.favoris.includes(p.p)} auChange={setMessage} />
          ))}
        </div>
      ) : (
        liste.slice(0, vus).map((p) => <LigneProduit key={p.p} p={p} c={c} auChange={setMessage} />)
      )}
      {!liste.length && (
        <div className="cl05-blk">
          <h3>{t('Aucun produit avec ces filtres')}</h3>
          <div className="btns">
            <button type="button" className="btn primary" onClick={() => aller({ min: null, max: null, km: null, note: null, stock: null, offert: null, promo: null, rel: null, dom: null, cat: null, sub: null, marque: null, auj: null, f: null })}>
              <span>{t('Effacer les filtres')}</span>
            </button>
          </div>
        </div>
      )}
      {gros && !reste && (
        <details className="more">
          <summary>
            <Icone nom="package" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Colis M, L et XL')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            <p>{tf('Colis L : la remise au relais coûte {l} F, la livraison offerte en couvre {s} F.', { l: F(PARAMETRES.remiseRelais.L), s: F(PARAMETRES.remiseRelais.S) })}</p>
            <p>{t('Un colis XL ne passe jamais par un relais : il est livré chez toi.')}</p>
          </div>
        </details>
      )}
      {reste && enAttente ? (
        <VoirPlus vus={vus} total={liste.length} plus={plus} />
      ) : reste ? (
        <>
          <div className="cl05-skr" ref={suite}></div>
          <p className="cl05-more">
            <span>
              <b>{vus}</b>
              {t(' produits sur ')}
              <b>{liste.length}</b>
              {t(' · la suite se charge en défilant')}
            </span>
          </p>
        </>
      ) : (
        liste.length > 0 && (
          <div className="cl05-blk">
            <h3>{t('Tu cherchais autre chose ?')}</h3>
            <p>{t('Change un mot, une marque ou un usage, ou parcours la catégorie.')}</p>
            {uCat && cat && (
              <>
                <div className="btns">
                  <Link to={chemin('liste', { cat: uCat.id, sub: cat[1] })} className="btn secondary">
                    <span>{tf('Voir la catégorie {c}', { c: t(cat[1]) })}</span>
                  </Link>
                </div>
                <p className="cnt">
                  <span>{t(uCat.titre)}</span>
                  {t(' · ')}
                  <span className="nw">
                    {nCat}
                    <span>{t(nCat > 1 ? ' produits' : ' produit')}</span>
                  </span>
                </p>
              </>
            )}
            <div className="btns" style={{ marginTop: '6px' }}>
              <Link to={chemin('recherche-saisie', { q: qSaisi })} className="btn ghost">
                <Icone nom="pencil" taille={18} />
                <span>{t('Modifier ma recherche')}</span>
              </Link>
            </div>
          </div>
        )
      )}
    </>
  )
}

// Alertes « préviens-moi » : gardées sur l'appareil (le serveur enverra le push le jour où le produit arrive).
const CLE = 'blv_alertes_recherche'
const alertes = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(CLE) || '[]')
  } catch {
    return []
  }
}
const garderAlertes = (l: string[]) => {
  try {
    localStorage.setItem(CLE, JSON.stringify(l))
  } catch {
    // Stockage refusé : l'alerte vaut pour cette visite.
  }
}

// Ce qui s'approche d'une recherche sans résultat : les produits dont un mot commence comme un mot cherché.
function approchants(tous: Produit[], q: string): Produit[] {
  const racines = norme(q)
    .split(/\s+/)
    .filter((m) => m.length >= 5)
    .map((m) => m.slice(0, Math.min(5, m.length - 2)))
  if (!racines.length) return []
  return tous.filter((p) => norme([p.titre, p.marque, p.sousCategorie].filter(Boolean).join(' ')).split(/[^a-z0-9]+/).some((m) => racines.some((r) => m.startsWith(r)))).sort((a, b) => km(a) - km(b))
}

// « Rien trouvé » (corps).
export function CorpsZero({ c, q, entete }: { c: Contexte; q: string; entete?: ReactNode }) {
  const { t, tf } = usePreferences()
  const lieuR = useLieu()
  const [alerte, setAlerte] = useState(alertes().includes(q))
  const [message, setMessage] = useState<string | null>(null)
  const proches = approchants(c.tous, q)
  const sub = proches[0]?.sousCategorie
  const u = proches[0] ? UNIVERS.find((x) => x.id === proches[0].univers) : undefined
  const motProche = proches[0] ? norme(proches[0].titre).split(/\s+/)[0] : ''
  const basculer = () => {
    garderAlertes(alerte ? alertes().filter((x) => x !== q) : [...new Set([...alertes(), q])])
    setAlerte(!alerte)
  }
  // Dès 1024 px (§ 5.3) : le message et l'alerte en tête, centrés ; dessous, les conseils et les recherches
  // populaires en deux colonnes.
  const large = useDes('tab-l')
  const contenu = (
    <>
      {entete}
      <div className="cl05-blk">
        <h3>{t('Tu cherchais autre chose ?')}</h3>
        <p>
          <span>{t('Aucun résultat pour')}</span> <b>«&nbsp;{q}&nbsp;»</b>{' '}
          <span>{lieuR.r(proches.length ? 'livrable à ton relais. Voici ce qui s’en approche le plus.' : 'livrable à ton relais. Aucun vendeur ne le propose pour l’instant : vérifie l’orthographe, ou essaie un mot plus simple.')}</span>
        </p>
        {message && (
          <div className="note green" role="status">
            <Icone nom="circle-check" taille={18} />
            <div>
              {message} <Link to={chemin('panier')}>{t('Voir le panier')}</Link>
            </div>
          </div>
        )}
        {proches.slice(0, 2).map((p) => (
          <LigneProduit key={p.p} p={p} c={c} auChange={setMessage} />
        ))}
        {proches.length > 2 && (
          <Link to={chemin('recherche-resultats', { q: motProche })} className="cl05-a" style={{ justifyContent: 'center', marginTop: '4px' }}>
            {tf('Voir les {n} produits proches', { n: proches.length })}
            <Icone nom="chevron-right" taille={16} />
          </Link>
        )}
        {alerte && (
          <div className="note green">
            <Icone nom="bell-ring" taille={18} />
            <div>
              <b>{t('Alerte créée.')}</b>
              {tf(' Un seul push, gratuit, le jour où « {q} » est publié et livrable au {r} ; puis l’alerte se ferme.', { q, r: t(c.relais?.nom ?? 'Relais Mvog-Ada') })}
            </div>
          </div>
        )}
        <div className="btns">
          <button type="button" className={'btn ' + (alerte ? 'ghost' : 'primary')} onClick={basculer}>
            {!alerte && <Icone nom="bell" taille={18} />}
            <span>{t(alerte ? 'Annuler l’alerte' : 'Préviens-moi quand ça arrive')}</span>
          </button>
        </div>
        {!alerte && (
          <p className="fine" style={{ marginTop: '6px' }}>
            {lieuR.r('Un push gratuit, une seule fois, le jour où un produit correspondant est publié près de ton relais.')}
          </p>
        )}
        <div className="btns">
          {u && sub ? (
            <Link to={chemin('liste', { cat: u.id, sub })} className="btn secondary">
              <span>{tf('Voir la catégorie {c}', { c: t(sub) })}</span>
            </Link>
          ) : (
            <Link to={chemin('categories')} className="btn secondary">
              <span>{t('Parcourir les catégories')}</span>
            </Link>
          )}
        </div>
        <p className="fine">{t('On démarche un vendeur — on te prévient le jour de la mise en ligne.')}</p>
      </div>
      <details className="more">
        <summary>
          <Icone nom="lightbulb" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Conseils pour mieux chercher')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{t('Un ou deux mots suffisent : « chargeur tecno » plutôt qu’une phrase.')}</p>
          <p>{t('Essaie la marque (« oraimo », « itel ») ou l’usage (« ventilateur », « pagne »).')}</p>
          <p>{t('Les accents ne comptent pas, et une petite faute est corrigée.')}</p>
          <p>
            {t('Tu ne trouves toujours pas ? ')}
            <Link to={chemin('aide')}>{t('Demande à l’aide BelivaY')}</Link>
          </p>
        </div>
      </details>
      <Groupe actif={large}>
        <div className="cl05-lab">
          <span>{t('Essaie plutôt')}</span>
        </div>
        <div className="chips">
          {POPULAIRES.slice(0, 6).map((x) => (
            <Link key={x} to={chemin('recherche-resultats', { q: x })} className="chip">
              {t(x)}
            </Link>
          ))}
        </div>
      </Groupe>
    </>
  )
  return large ? <div className="cl05-zero">{contenu}</div> : contenu
}
