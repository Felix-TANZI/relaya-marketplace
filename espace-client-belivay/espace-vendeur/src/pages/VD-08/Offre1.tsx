// Nouveau produit (VD-08, route « offre1 ») — une seule page, comme l'interface réelle du vendeur (seller.belivay.com,
// DP-58) : on garde la logique du paquet (chercher d'abord, NOF-01) en plus simple.
// - Panneau « Produit » : recherche obligatoire (texte, code-barres, photo, dictée) et liste du catalogue BelivaY (photo,
//   nom, catégorie, prix du marché, nombre de vendeurs, « Vous gardez X % à Y F », « Je vends ce produit » : offre
//   rattachée à la fiche en un geste, NOF-02) ; mes produits qui correspondent (« Vous le vendez déjà » : modifier le
//   stock, ajouter une variante). « Mon produit n'est pas dans la liste — créer un nouveau produit » est visible dès
//   l'ouverture, actif seulement après une recherche (3 caractères ou un scan) ; le nom cherché pré-remplit le produit,
//   la catégorie et la marque sont proposées, la description est une proposition relue par BelivaY (Q-34) ; un doublon
//   du catalogue est signalé (« Je vends celui-ci », FCH-02). Sur une fiche du catalogue, la fiche n'est jamais refaite.
// - Panneau « Prix et stock » : prix de vente et « vous gardez » en direct (service de commission, PRX-08 ; refus sous
//   le prix minimum publiable DP-55 et au-dessus du plafond de démarrage PRX-09), prix conseillé (DP-56 Q-36), prix
//   barré et fin de promotion (OFR-05 : 10 % au moins, prix réellement pratiqué, vérifié par BelivaY), stock et seuil
//   d'alerte, état (six états, PRX-05), note du vendeur (sans coordonnées, GEN-01).
// - Photos réelles (PHO-01 : 3 à 8, caméra ou galerie, ordre, photo principale) ; autres réglages (délai, paiement au
//   retrait, Made in Cameroon, colis, vérification prioritaire) ; aperçu client ; « Publier · vérification sous 48 h »
//   ou « Garder en brouillon ». Brouillon gardé à chaque saisie (« ?b= »). Tablette : deux colonnes. Préparation : réservé.
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Feuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { FicheCatalogue, Reglages } from '../../donnees/domaines/offres'
import type { PhotoReelle, Produit, VarianteDeFiche } from '../../donnees/domaines/produits'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles } from '../../session'
import { ApercuClient, Bouton, Chargement, FeuilleStock, HorsConnexion, ImagePhoto, Interrupteur, Reserve, VignetteProduit, dateHeure, jourMois, useApresFrappe, useDelai, useDictee, useEnLigne, useMontant, useToast } from './commun'
import { choisirDansLaGalerie } from './photos'
import './nouveau.css'

const SELECT = { flex: 1, minWidth: 0, border: 0, background: 'transparent', font: 'inherit', color: 'inherit', outline: 'none', height: '100%', appearance: 'none' } as const
const entier = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : null)
const decimal = (s: string) => {
  const v = Number(s.replace(',', '.'))
  return s.trim() && Number.isFinite(v) && v > 0 ? v : null
}
const JOUR = 86_400_000
/** « 2026-10-12 » (jour de Yaoundé) ↔ fin de ce jour (23 h 59 à Yaoundé). */
const versJour = (ms: number) => new Date(ms + 3_600_000).toISOString().slice(0, 10)
const finDuJour = (j: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(j)
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 22, 59) : null
}
const COORD = /(\+?\d[\d\s.-]{7,}\d)|(@)|(https?:|www\.)|(whatsapp)/i

// ── Panneaux ─────────────────────────────────────────────────────────────────────────────────────────────────────

function Panneau({ icone, titre, sous, inactif, children, id }: { icone: string; titre: string; sous?: string; inactif?: string; children?: ReactNode; id?: string }) {
  return (
    <section className={'np-panneau' + (inactif ? ' off' : '')} id={id} aria-label={titre}>
      <div className="np-tete">
        <span className="np-ic">
          <Icone nom={icone} taille={18} />
        </span>
        <span className="grow">
          <span className="b8 t15" style={{ display: 'block' }}>
            {titre}
          </span>
          {sous && <span className="t12 c3">{sous}</span>}
        </span>
        {inactif && <Icone nom="lock" taille={16} style={{ color: 'var(--ink-4)' }} />}
      </div>
      <div className="np-corps">{inactif ? <p className="t13 c3" style={{ margin: 0, lineHeight: 1.45 }}>{inactif}</p> : children}</div>
    </section>
  )
}

/** Une fiche du catalogue dans la liste : un geste pour la vendre (NOF-02, NOF-05). */
function LigneCatalogue({ f, choisir, occupe }: { f: FicheCatalogue; choisir: (f: FicheCatalogue) => void; occupe: boolean }) {
  const { t, tf } = usePreferences()
  const montant = useMontant()
  const toutes = f.variantes.every((v) => f.dejaVendues.includes(v))
  return (
    <div className="np-ligne blv-cascade">
      <Vignette nom={f.dessin} taille={52} />
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="b8 t14">{f.titre}</div>
        <div className="t12 c3">{`${t(f.rayon)} · ${tf(f.vendeurs > 1 ? '{n} vendeurs' : '{n} vendeur', { n: f.vendeurs })}`}</div>
        {f.fourchette && <div className="t12 c2">{tf('Prix du marché : {min} – {max}', { min: montant(f.fourchette[0]).replace(/\s?F$/, ''), max: montant(f.fourchette[1]) })}</div>}
        {f.dejaVendues.length > 0 && <div className="t12 b7 cor">{tf('Déjà dans vos produits : {v}', { v: f.dejaVendues.map((v) => t(v)).join(', ') })}</div>}
        {f.part && <div className="t12 b7 cg">{tf('Vous gardez {p} % à {m}', { p: f.part.pourCent, m: montant(f.part.prixRef) })}</div>}
        <div className="row" style={{ gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
          {toutes ? (
            <span className="t12 c3">{t('Vous vendez toutes ses variantes')}</span>
          ) : (
            <button type="button" className="btn soft auto" style={{ minHeight: '44px' }} disabled={occupe} onClick={() => choisir(f)}>
              <Icone nom="check" taille={17} />
              <span>{t('Je vends ce produit')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const ETAT_OFFRE: Record<string, string> = { en_vente: 'En vente', en_verification: 'En vérification', en_pause: 'En pause', refusee: 'Refusée', brouillon: 'Brouillon' }

/** Un de mes produits qui correspond : on ne le crée pas une deuxième fois. */
function LigneMienne({ p, stock }: { p: Produit; stock: (p: Produit) => void }) {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const brouillon = p.etat === 'brouillon' || p.etat === 'refusee'
  return (
    <div className="np-ligne mienne blv-cascade">
      <VignetteProduit p={p} taille={44} />
      <div className="grow" style={{ minWidth: 0 }}>
        <Link to={brouillon ? chemin('offre1', { b: p.id }) : chemin('offre_detail', { p: p.id })} className="b8 t14" style={{ color: 'inherit', display: 'block' }}>
          {p.variante ? `${p.titre} · ${t(p.variante)}` : p.titre}
        </Link>
        <div className="t12 c3">{`${t(ETAT_OFFRE[p.etat])} · ${tf('stock {n}', { n: p.stock })}`}</div>
        <div style={{ display: 'flex', columnGap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {brouillon ? (
            <Link to={chemin('offre1', { b: p.id })} className="t13 b8 cor np-lien">
              {t('Reprendre le brouillon')}
            </Link>
          ) : (
            <>
              <button type="button" className="t13 b8 cor np-lien" onClick={() => stock(p)}>
                {t('Modifier le stock')}
              </button>
              {p.ficheId && (
                <button type="button" className="t13 b8 cor np-lien" onClick={() => naviguer(chemin('dupliquer', { p: p.id }))}>
                  {t('Ajouter une variante')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Recherche (panneau Produit tant qu'aucun produit n'est choisi) ────────────────────────────────────────────────

function Recherche({ b, r, stock }: { b: Produit | null; r: Reglages; stock: (p: Produit) => void }) {
  const { t, tf } = usePreferences()
  const enLigne = useEnLigne()
  const naviguer = useNavigate()
  const [params, setParams] = useSearchParams()
  const code = params.get('code')
  const [saisie, setSaisie] = useState(params.get('q') ?? '')
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const champ = useRef<HTMLInputElement>(null)
  const q = useApresFrappe(saisie.trim(), 300)
  const dictee = useDictee((x) => setSaisie(x))
  // La recherche est gardée dans l'adresse (retour depuis la caméra ou une fiche).
  useEffect(() => {
    const p = new URLSearchParams(params)
    if (q) p.set('q', q)
    else p.delete('q')
    if (p.toString() !== params.toString()) setParams(p, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])
  useEffect(() => {
    if (params.get('dicter') === '1') dictee.ecouter()
    else if (params.get('taper') === '1') champ.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const assez = q.length >= r.rechercheMin
  const lecture = useLecture(async () => (assez || code ? source.offres.rechercher(assez ? q : '', code) : null), [q, code, assez])
  const res = lecture.donnees
  const aJour = !!res && res.q === (assez ? q : '') && res.code === (code ?? null)
  const cherche = (assez || !!code) && aJour
  const liste = res ? (res.exacts.length ? res.exacts : res.proches) : []

  const choisir = async (f: FicheCatalogue) => {
    setOccupe(true)
    const x = b ? await source.offres.rattacher(b.id, f.id) : await source.offres.commencer(f.id)
    setOccupe(false)
    if (!x.ok) {
      jouer('erreur')
      return setErreur(t('Cette fiche n’est plus au catalogue : cherchez de nouveau.'))
    }
    jouer('interrupteur')
    naviguer(chemin('offre1', { b: x.brouillonId }), { replace: !!b })
  }
  const creer = async () => {
    if (!cherche) {
      jouer('erreur')
      champ.current?.focus()
      return
    }
    setOccupe(true)
    const x = await source.offres.creer({ nom: assez ? q : '', code })
    setOccupe(false)
    if (!x.ok) return setErreur(t('Cherchez d’abord : il existe peut-être déjà.'))
    jouer('interrupteur')
    naviguer(chemin('offre1', { b: x.brouillonId }))
  }
  const soumettre = (e: FormEvent) => {
    e.preventDefault()
    champ.current?.blur()
  }
  return (
    <>
      {dictee.feuille}
      <form role="search" onSubmit={soumettre} className="fld" style={{ marginTop: 0 }}>
        <label htmlFor="np-q">
          {t('Rechercher le produit ')}
          <span className="req">{t('*')}</span>
        </label>
        <div className="inp focus">
          <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
          <input size={1} id="np-q" ref={champ} type="text" enterKeyHint="search" value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder={t('Ex. : iPhone 15 Pro 128 Go')} autoComplete="off" />
          {saisie ? (
            <button type="button" className="np-outil" aria-label={t('Effacer')} onClick={() => (setSaisie(''), champ.current?.focus())}>
              <Icone nom="x" taille={16} />
            </button>
          ) : (
            <button type="button" className="np-outil" aria-label={t('Dicter le nom du produit')} onClick={dictee.ecouter}>
              <Icone nom="mic" taille={18} />
            </button>
          )}
          <Link to={chemin('camera', { mode: 'scan' })} className="np-outil" aria-label={t('Scanner le code-barres')} style={{ opacity: enLigne ? 1 : 0.5 }}>
            <Icone nom="scan-barcode" taille={18} />
          </Link>
          <Link to={chemin('camera', { mode: 'reco' })} className="np-outil" aria-label={t('Chercher avec une photo')}>
            <Icone nom="camera" taille={18} />
          </Link>
        </div>
        <div className="hint">{t('Vérifiez d’abord si le produit existe déjà avant d’en créer un nouveau.')}</div>
      </form>
      {code && (
        <div className="note amber" style={{ marginTop: '8px' }}>
          <Icone nom="scan-barcode" taille={18} />
          <div className="grow">{res && aJour && !res.exacts.length ? tf('Code-barres {c} inconnu du catalogue : tapez le nom écrit sur la boîte, ou créez le produit.', { c: code }) : tf('Code-barres {c} lu.', { c: code })}</div>
          <button
            type="button"
            className="np-lien t13 b8"
            onClick={() => {
              const p = new URLSearchParams(params)
              p.delete('code')
              setParams(p, { replace: true })
            }}
          >
            {t('Effacer')}
          </button>
        </div>
      )}
      {!enLigne && <HorsConnexion texte="Hors connexion : la recherche porte sur les fiches déjà vues. Le code-barres attend le réseau ; votre saisie est gardée." />}
      {erreur && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{erreur}</div>
        </div>
      )}
      {saisie.trim().length > 0 && saisie.trim().length < r.rechercheMin && !code && <div className="t12 c3 mt8">{tf(r.rechercheMin - saisie.trim().length > 1 ? 'Encore {n} caractères pour chercher.' : 'Encore {n} caractère pour chercher.', { n: r.rechercheMin - saisie.trim().length })}</div>}
      {cherche && res && (
        <div aria-live="polite">
          {res.mesProduits.length > 0 && (
            <>
              <div className="divider-t">{t('Vous le vendez déjà')}</div>
              <div className="np-liste">
                {res.mesProduits.map((p) => (
                  <LigneMienne key={p.id} p={p} stock={stock} />
                ))}
              </div>
            </>
          )}
          <div className="divider-t">{liste.length ? (res.exacts.length ? tf(res.exacts.length > 1 ? '{n} produits au catalogue' : '{n} produit au catalogue', { n: res.exacts.length }) : t('Pas de résultat exact · produits proches')) : t('Catalogue BelivaY')}</div>
          {liste.length > 0 && (
            <div className="np-liste">
              {liste.map((f) => (
                <LigneCatalogue key={f.id} f={f} choisir={(x) => void choisir(x)} occupe={occupe} />
              ))}
            </div>
          )}
          {!res.exacts.length && (
            <div className="np-vide" style={liste.length ? { marginTop: '12px' } : undefined}>
              <div className="b8 t14">{t(liste.length ? 'Aucun de ces produits ?' : 'Aucun produit de ce nom au catalogue')}</div>
              <div className="t13 c2 mt4">{res.cherche > 0 ? tf('« {q} » : cherché {n} fois près de chez vous, sans résultat. Créez-le : vous serez le premier à le vendre.', { q: res.q, n: res.cherche }) : t('Créez-le : BelivaY écrit sa fiche pendant la vérification.')}</div>
            </div>
          )}
        </div>
      )}
      {!b && (
        <div className="np-creer">
          <button type="button" className={'np-creer-b' + (cherche ? '' : ' off')} aria-disabled={!cherche || undefined} onClick={() => void creer()} disabled={occupe}>
            <Icone nom="plus" taille={18} />
            <span>{t('Mon produit n’est pas dans la liste — créer un nouveau produit')}</span>
          </button>
          <div className="t12 c3" style={{ textAlign: 'center' }}>
            {cherche ? (assez ? tf('Le nom « {q} » sera pré-rempli.', { q }) : t('Le code-barres sera gardé avec le produit.')) : t('Cherchez d’abord : il existe peut-être déjà.')}
          </div>
        </div>
      )}
    </>
  )
}

// ── Produit choisi (fiche du catalogue) ou produit nouveau ───────────────────────────────────────────────────────

interface Formulaire {
  titre: string
  marque: string
  categorie: string
  description: string
  variante: string
  prix: string
  prixBarre: string
  finPromo: string // AAAA-MM-JJ
  stock: string
  seuil: string
  etat: string
  note: string
  delaiH: number
  paiementAuRetrait: boolean
  madeInCameroon: boolean
  prioritaire: boolean
  poids: string
  dims: [string, string, string]
}
function versFormulaire(p: Produit): Formulaire {
  return {
    titre: p.titre,
    marque: p.marque,
    categorie: p.ficheId || p.nouveau ? p.categorie : '',
    description: p.nouveau?.description ?? '',
    variante: p.variante,
    prix: p.prix !== null ? String(p.prix) : '',
    prixBarre: p.prixBarre !== null ? String(p.prixBarre) : '',
    finPromo: p.finPromo ? versJour(p.finPromo) : '',
    stock: p.stock > 0 ? String(p.stock) : '',
    seuil: String(p.seuilAlerte),
    etat: p.etatArticle,
    note: p.noteVendeur,
    delaiH: p.delaiPreparationH,
    paiementAuRetrait: p.paiementAuRetrait,
    madeInCameroon: p.madeInCameroon,
    prioritaire: p.nouveau?.prioritaire ?? false,
    poids: p.poidsKg !== null ? String(p.poidsKg).replace('.', ',') : '',
    dims: p.dimensionsCm ? (p.dimensionsCm.map(String) as [string, string, string]) : ['', '', ''],
  }
}

function ProduitChoisi({ b, variantes, f, maj, r, changer }: { b: Produit; variantes: VarianteDeFiche[]; f: Formulaire; maj: (c: Partial<Formulaire>) => void; r: Reglages; changer: () => void }) {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const nouveau = !b.ficheId
  const nomD = useApresFrappe(f.titre, 500)
  const sug = useLecture(async () => (nouveau && nomD.trim().length >= r.nomMin ? source.offres.suggerer(nomD) : null), [nomD, nouveau])
  const s = sug.donnees
  // Catégorie et marque proposées d'après le nom, tant que le vendeur ne les a pas choisies lui-même.
  const auto = useRef({ categorie: true, marque: !f.marque })
  useEffect(() => {
    if (!s) return
    const c: Partial<Formulaire> = {}
    if (auto.current.categorie && s.categorie && s.categorie !== f.categorie) c.categorie = s.categorie
    if (auto.current.marque && s.marque && s.marque !== f.marque) c.marque = s.marque
    if (Object.keys(c).length) maj(c)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s])
  const rattacher = async (fiche: FicheCatalogue) => {
    const x = await source.offres.rattacher(b.id, fiche.id)
    if (!x.ok) return jouer('erreur')
    jouer('interrupteur')
    naviguer(chemin('offre1', { b: b.id, rattache: 1 }), { replace: true })
  }
  if (!nouveau)
    return (
      <>
        <div className="row" style={{ gap: '12px', alignItems: 'flex-start' }}>
          <Vignette nom={b.dessin} taille={56} />
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="b8 t15">{b.titre}</div>
            <div className="t12 c3">{t(b.rayon)}</div>
            <div className="row t12 cg b7 mt4" style={{ gap: '5px', alignItems: 'flex-start' }}>
              <Icone nom="badge-check" taille={14} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{t('Fiche BelivaY : titre, description et photos de référence déjà écrits')}</span>
            </div>
          </div>
        </div>
        {variantes.length > 1 && (
          <div className="fld">
            <label htmlFor="np-var">{t('Variante')}</label>
            <div className="inp">
              <select id="np-var" style={SELECT} value={f.variante} onChange={(e) => maj({ variante: e.target.value })}>
                {variantes.map((v) => (
                  <option key={v.variante} value={v.variante} disabled={!!v.offreId && v.offreId !== b.id}>
                    {v.offreId && v.offreId !== b.id ? tf('{v} · déjà dans vos produits', { v: t(v.variante) }) : t(v.variante)}
                  </option>
                ))}
              </select>
              <span className="suf">
                <Icone nom="chevron-down" taille={16} />
              </span>
            </div>
            <div className="hint">{t('Une offre par variante, chacune avec son stock et son prix. Une autre variante : « Dupliquer » après l’envoi.')}</div>
          </div>
        )}
        <button type="button" className="np-lien t13 b8 cor mt8" onClick={changer}>
          <Icone nom="repeat" taille={15} />
          {t('Changer de produit')}
        </button>
      </>
    )
  return (
    <>
      <div className="row t12 b7 cor" style={{ gap: '6px' }}>
        <Icone nom="sparkles" taille={14} />
        <span>{t('Nouveau produit : BelivaY écrit sa fiche pendant la vérification')}</span>
      </div>
      {s?.doublon && (
        <div className="note green blv-succes" style={{ marginTop: '10px' }}>
          <Icone nom="link" taille={18} />
          <div className="grow">
            <div>{tf('« {t} » est déjà au catalogue : vendez-le en un geste, vos photos et votre prix sont gardés.', { t: s.doublon.titre })}</div>
            <button type="button" className="btn soft auto mt8" style={{ minHeight: '40px' }} onClick={() => void rattacher(s.doublon!)}>
              <Icone nom="check" taille={16} />
              <span>{t('Je vends celui-ci')}</span>
            </button>
          </div>
        </div>
      )}
      <div className="fld">
        <label htmlFor="np-nom">
          {t('Nom du produit ')}
          <span className="req">{t('*')}</span>
        </label>
        <div className={'inp' + (f.titre.trim().length >= r.nomMin ? ' ok' : '')}>
          <input size={1} id="np-nom" value={f.titre} maxLength={100} onChange={(e) => maj({ titre: e.target.value })} placeholder={t('Ex. : Chargeur itel 18 W USB-C')} />
        </div>
      </div>
      <div className="split2">
        <div className="fld" style={{ minWidth: 0 }}>
          <label htmlFor="np-cat">
            {t('Catégorie ')}
            <span className="req">{t('*')}</span>
          </label>
          <div className="inp">
            <select id="np-cat" style={SELECT} value={f.categorie} onChange={(e) => ((auto.current.categorie = false), maj({ categorie: e.target.value }))}>
              <option value="">{t('— Choisir —')}</option>
              {r.categories.map((c) => (
                <option key={c.categorie} value={c.categorie}>
                  {t(c.rayon)}
                </option>
              ))}
            </select>
            <span className="suf">
              <Icone nom="chevron-down" taille={16} />
            </span>
          </div>
          {s?.categorie && s.categorie === f.categorie && <div className="hint cg">{t('Proposée d’après le nom')}</div>}
        </div>
        <div className="fld" style={{ minWidth: 0 }}>
          <label htmlFor="np-marque">{t('Marque')}</label>
          <div className="inp">
            <input size={1} id="np-marque" value={f.marque} maxLength={40} onChange={(e) => ((auto.current.marque = false), maj({ marque: e.target.value }))} placeholder={t('Ex. : itel')} />
          </div>
        </div>
      </div>
      <div className="fld">
        <label htmlFor="np-v">{t('Variante (facultatif)')}</label>
        <div className="inp">
          <input size={1} id="np-v" value={f.variante} maxLength={40} onChange={(e) => maj({ variante: e.target.value })} placeholder={t('Ex. : noir, taille 42, 128 Go')} />
        </div>
      </div>
      <div className="fld">
        <label htmlFor="np-desc">{t('Description (facultatif)')}</label>
        <div className={'inp' + (COORD.test(f.description) ? ' err' : '')} style={{ height: 'auto', padding: '10px 13px' }}>
          <textarea id="np-desc" rows={4} maxLength={2000} value={f.description} onChange={(e) => maj({ description: e.target.value })} placeholder={t('Ex. : matière, taille, contenu de la boîte, garantie.')} />
        </div>
        {!f.description.trim() && s?.description && (
          <button type="button" className="np-lien t13 b8 cor" onClick={() => maj({ description: s.description })}>
            <Icone nom="wand-sparkles" taille={15} />
            {t('Proposer une description à compléter')}
          </button>
        )}
        <div className={'hint' + (COORD.test(f.description) ? ' cr' : '')}>{t('Une proposition : BelivaY la relit et rédige la fiche. Sans numéro, lien ni adresse e-mail.')}</div>
      </div>
      <button type="button" className="np-lien t13 b8 cor" onClick={changer}>
        <Icone nom="search" taille={15} />
        {t('Chercher de nouveau dans le catalogue')}
      </button>
    </>
  )
}

// ── Photos réelles ───────────────────────────────────────────────────────────────────────────────────────────────

function Photos({ b, r, dire }: { b: Produit; r: Reglages; dire: (x: string) => void }) {
  const { t, tf, langue } = usePreferences()
  const [ouverte, setOuverte] = useState<number | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const n = b.photos.length
  const manque = Math.max(0, r.photosMin - n)
  const camera = chemin('camera', { mode: 'photo', pour: b.id, retour: `offre1?b=${b.id}` })
  const ordonner = async (de: number, vers: number) => {
    const ids = b.photos.map((p) => p.id)
    const [x] = ids.splice(de, 1)
    ids.splice(vers, 0, x)
    await source.offres.ordonnerPhotos(b.id, ids)
    jouer('interrupteur')
    setOuverte(null)
    dire(t(vers === 0 ? 'Photo principale changée' : 'Ordre des photos changé'))
  }
  const retirer = async (p: PhotoReelle) => {
    await source.offres.retirerPhoto(b.id, p.id)
    jouer('favoriRetire')
    setOuverte(null)
    dire(t('Photo retirée'))
  }
  const galerie = () =>
    choisirDansLaGalerie(
      r,
      async (prise) => {
        const x = await source.offres.ajouterPhoto(b.id, prise)
        if (!x.ok) {
          jouer('erreur')
          setErreur(t(x.raison === 'petite' ? 'Moins de 800 × 800 px : choisissez une photo plus grande.' : '8 photos au plus.'))
        } else {
          jouer('retrait')
          setErreur(null)
        }
      },
      (e) => (jouer('erreur'), setErreur(t(e))),
    )
  const p = ouverte !== null ? (b.photos[ouverte] ?? null) : null
  return (
    <>
      <div className="photos np-photos">
        {b.photos.map((x, i) => {
          const petite = x.largeur < r.photoMinPx || x.hauteur < r.photoMinPx
          return (
            <button key={x.id} type="button" className="photo" aria-label={tf(i === 0 ? 'Photo {n}, principale : options' : 'Photo {n} : options', { n: i + 1 })} onClick={() => setOuverte(i)} style={{ padding: 0, border: 0, cursor: 'pointer', ...(petite ? { outline: '2px solid var(--red)', outlineOffset: '-2px' } : {}) }}>
              <ImagePhoto p={x} />
              {i === 0 && <span className="np-principale">{t('Principale')}</span>}
              <span className="ts" style={{ fontSize: '12px', textAlign: 'center' }}>
                {heure(x.prise, langue)}
              </span>
            </button>
          )
        })}
        {n < r.photosMax && (
          <Link to={camera} className="addph">
            <Icone nom="camera" taille={22} />
            <span>{t('Prendre')}</span>
          </Link>
        )}
      </div>
      {manque ? (
        <div className="row mt10 t13 cr b7" style={{ gap: '8px' }}>
          <Icone nom="circle-alert" taille={17} style={{ flexShrink: '0' }} />
          <span>{tf(manque > 1 ? 'Encore {n} photos' : 'Encore {n} photo', { n: manque })}</span>
        </div>
      ) : (
        <div className="row mt10 t13 cg b7" style={{ gap: '8px' }}>
          <Icone nom="circle-check" taille={17} style={{ flexShrink: '0' }} />
          <span>{tf('{n} photos · touchez-en une pour la mettre en principale ou la déplacer', { n })}</span>
        </div>
      )}
      <button type="button" onClick={galerie} className="np-lien t13 b8 cor mt4">
        <Icone nom="images" taille={16} />
        {t('Choisir dans la galerie')}
      </button>
      {erreur && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{erreur}</div>
        </div>
      )}
      <div className="hint">{t('L’article que vous vendez, pas une image trouvée en ligne. 800 × 800 px au moins ; allégées sur le téléphone, heure et lieu de la prise gardés.')}</div>
      <Feuille ouverte={p !== null} fermer={() => setOuverte(null)} titre={t('Photo')}>
        {p && ouverte !== null && (
          <>
            <div style={{ aspectRatio: '1/1', borderRadius: '14px', overflow: 'hidden', background: 'var(--sand-2)', maxWidth: '300px', margin: '6px auto 0' }}>
              <ImagePhoto p={p} />
            </div>
            <p className="t12 c3 center">{p.lieu ? `${heure(p.prise, langue)} · ${p.lieu}` : heure(p.prise, langue)}</p>
            {ouverte > 0 && (
              <Bouton classe="primary" icone="star" onClick={() => void ordonner(ouverte, 0)}>
                {t('Mettre en photo principale')}
              </Bouton>
            )}
            <div className="split2 mt8">
              <Bouton classe="secondary" icone="arrow-left" inactif={ouverte === 0} onClick={() => void ordonner(ouverte, ouverte - 1)}>
                {t('Avant')}
              </Bouton>
              <Bouton classe="secondary" icone="arrow-right" inactif={ouverte === n - 1} onClick={() => void ordonner(ouverte, ouverte + 1)}>
                {t('Après')}
              </Bouton>
            </div>
            <div className="mt8">
              <Bouton classe="ghost" icone="trash-2" onClick={() => void retirer(p)}>
                {t('Retirer la photo')}
              </Bouton>
            </div>
          </>
        )}
      </Feuille>
    </>
  )
}

// ── Le brouillon : produit, photos, prix et stock, publier ───────────────────────────────────────────────────────

function Brouillon({ b, r, variantes }: { b: Produit; r: Reglages; variantes: VarianteDeFiche[] }) {
  const { t, tf, langue } = usePreferences()
  const montant = useMontant()
  const delai = useDelai()
  const enLigne = useEnLigne()
  const horloge = useHorloge()
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const { dire, toast } = useToast()
  const pct = (x: number) => (langue === 'en' ? String(x) : String(x).replace('.', ','))
  const [f, setF] = useState<Formulaire>(() => versFormulaire(b))
  const [chercher, setChercher] = useState(false)
  const [apercu, setApercu] = useState(false)
  const [tente, setTente] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [refus, setRefus] = useState<string | null>(null)
  const [stockDe, setStockDe] = useState<Produit | null>(null)
  // VD-PRIX-ANORMAL : un prix hors norme (vs médiane des autres offres) demande
  // une confirmation explicite avant publication — posé après le premier refus,
  // un second appui sur « Publier » renvoie confirmer: true.
  const [prixAConfirmer, setPrixAConfirmer] = useState(false)
  const maj = (c: Partial<Formulaire>) => {
    setF((x) => ({ ...x, ...c }))
    setRefus(null)
    setPrixAConfirmer(false)
  }
  const nouveau = !b.ficheId

  const prix = entier(f.prix)
  const prixBarre = entier(f.prixBarre)
  const stock = entier(f.stock)
  const seuil = entier(f.seuil)
  const fin = finDuJour(f.finPromo)
  const poids = decimal(f.poids)
  const dims = f.dims.map(decimal) as (number | null)[]
  const grand = Math.max(0, ...dims.map((x) => x ?? 0))
  const facture = Math.max(poids ?? 0, dims.every((x) => x !== null) ? (dims[0]! * dims[1]! * dims[2]!) / r.colis.diviseur : 0)
  const colisObligatoire = (poids ?? 0) > r.colis.seuilKg || grand > r.colis.seuilCm
  const classe = r.colis.classes.find((c) => facture <= c.kg && grand <= c.cm)?.classe ?? null
  const remise = prix !== null && prixBarre !== null && prixBarre > 0 ? Math.floor((100 * (prixBarre - prix)) / prixBarre) : null
  const finMax = horloge + r.promoJoursMax * JOUR
  const promoValide = prixBarre !== null && remise !== null && remise >= r.promoRemiseMin && fin !== null && fin > horloge && fin <= finMax

  const champs = (x: Formulaire) => {
    const pb = entier(x.prixBarre)
    const fp = finDuJour(x.finPromo)
    const d = x.dims.map(decimal)
    return {
      prix: entier(x.prix),
      stock: entier(x.stock) ?? 0,
      ...(entier(x.seuil) !== null && entier(x.seuil)! <= 9999 ? { seuilAlerte: entier(x.seuil)! } : {}),
      etatArticle: x.etat,
      ...(x.note.length <= r.noteMax && !COORD.test(x.note) ? { noteVendeur: x.note } : {}),
      prixBarre: pb,
      finPromo: pb !== null && fp !== null && fp > horloge ? fp : null,
      delaiPreparationH: x.delaiH,
      paiementAuRetrait: x.paiementAuRetrait,
      madeInCameroon: x.madeInCameroon,
      poidsKg: decimal(x.poids),
      dimensionsCm: d.every((y) => y !== null) ? (d as [number, number, number]) : null,
      variante: x.variante,
      ...(nouveau ? { titre: x.titre, marque: x.marque, categorie: x.categorie, ...(!COORD.test(x.description) ? { description: x.description } : {}), prioritaire: x.prioritaire } : {}),
    }
  }
  // Brouillon gardé à chaque saisie (hors connexion, il part au retour du réseau, Q-93).
  const fG = useApresFrappe(f, 400)
  const premier = useRef(true)
  useEffect(() => {
    if (premier.current) {
      premier.current = false
      return
    }
    void source.offres.modifier(b.id, champs(fG))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fG])

  // « Vous gardez » pendant la saisie : service de commission, 300 ms après la dernière frappe (PRX-08).
  const prixD = useApresFrappe(prix, 300)
  const calcul = useLecture(async () => {
    if (prixD === null || prixD < 1) return null
    const a = await source.offres.apercu(b.id, prixD, f.madeInCameroon)
    const c = a.refus === null && b.ficheId ? await source.offres.conseil(b.id, prixD) : null
    return { a, c, pour: prixD }
  }, [prixD, f.madeInCameroon, b.id, b.ficheId, b.categorie])
  const a = calcul.donnees?.a ?? null
  const c = calcul.donnees?.c ?? null
  const aJour = calcul.donnees?.pour === prix

  const fautes = {
    produit: nouveau && (f.titre.trim().length < r.nomMin || !f.categorie),
    description: nouveau && COORD.test(f.description),
    photos: b.photos.length < r.photosMin,
    prix: prix === null || (aJour && a !== null && a.refus !== null),
    promo: prixBarre !== null && !promoValide,
    stock: stock === null || stock < 1 || stock > 99999,
    seuil: seuil === null || seuil > 9999,
    etat: !f.etat,
    note: f.note.length > r.noteMax || COORD.test(f.note),
    colis: colisObligatoire && (poids === null || dims.some((x) => x === null)),
  }
  type Cle = keyof typeof fautes
  const err = (k: Cle) => tente && fautes[k]
  const inp = (k: Cle) => 'inp' + (err(k) ? ' err' : '')
  const MANQUES: Record<Cle, string> = { produit: 'le produit', description: 'la description', photos: 'les photos', prix: 'le prix', promo: 'la promotion', stock: 'le stock', seuil: 'le seuil', etat: 'l’état', note: 'la note', colis: 'le colis' }
  const ANCRES: Record<Cle, string> = { produit: 'np-produit', description: 'np-produit', photos: 'np-photos', prix: 'np-prix', promo: 'np-promo', stock: 'np-stock', seuil: 'np-stock', etat: 'np-etat', note: 'np-note', colis: 'np-colis' }
  const restants = (Object.keys(fautes) as Cle[]).filter((k) => fautes[k])
  const montrer = (id: string) => document.getElementById(id)?.scrollIntoView({ block: 'center', behavior: 'smooth' })

  const publier = async () => {
    setTente(true)
    if (restants.length) {
      jouer('erreur')
      return montrer(ANCRES[restants[0]])
    }
    setEnvoi(true)
    setRefus(null)
    // La saisie part d'abord (sans attendre le délai de frappe), puis la publication.
    const m = await source.offres.modifier(b.id, champs(f))
    if (!m.ok) {
      setEnvoi(false)
      jouer('erreur')
      return setRefus(t(m.raison === 'variante' ? 'Cette variante est déjà dans vos produits : choisissez-en une autre.' : 'Vérifiez les champs en rouge.'))
    }
    const rester = !!c && !c.dejaLeMoinsCher && prix !== null && prix > c.conseille
    const res = await source.offres.publier(b.id, { rester, horsLigne: !enLigne, confirmer: prixAConfirmer })
    setEnvoi(false)
    if (res.ok) {
      jouer('fin')
      setPrixAConfirmer(false)
      return naviguer(chemin('offre_publiee', { o: b.id }), { replace: true })
    }
    jouer('erreur')
    if (res.raison === 'prix_anormal') {
      setPrixAConfirmer(true)
      const det = res.detail as { motif?: string; mediane?: number; ancienPrix?: number; variationPct?: number; niveau?: string } | undefined
      const msg =
        det?.motif === 'variation_brutale'
          ? tf('Vous passez de {a} à {b}, c’est bien ça ? Appuyez à nouveau sur Publier pour confirmer.', { a: montant(det.ancienPrix ?? 0), b: montant(prix ?? 0) })
          : tf('Ce prix est très éloigné de celui des autres offres ({m} en moyenne). Appuyez à nouveau sur Publier pour confirmer.', { m: montant(det?.mediane ?? 0) })
      return setRefus(msg)
    }
    const textes: Record<string, [string, string]> = {
      photos: [tf(Number(res.detail) > 1 ? 'Encore {n} photos réelles avant de publier.' : 'Encore {n} photo réelle avant de publier.', { n: res.detail ?? '1' }), 'np-photos'],
      stock: [t('Indiquez votre stock avant de publier.'), 'np-stock'],
      prix: [t('Indiquez votre prix avant de publier.'), 'np-prix'],
      prix_minimum: [tf('Prix refusé : publiable dès {m}, sinon vous ne gardez rien.', { m: montant(Number(res.detail ?? r.prixMin)) }), 'np-prix'],
      plafond: [tf('Au-dessus de {m} par commande, la publication attend vos {n} premières commandes livrées sans incident. Le brouillon est gardé.', { m: montant(Number(res.detail ?? 0)), n: r.plafond?.requises ?? 10 }), 'np-prix'],
      promo: [tf('Promotion refusée : {p} % de remise au moins sous le prix barré, et une fin dans les {j} jours.', { p: r.promoRemiseMin, j: r.promoJoursMax }), 'np-promo'],
      doublon_vendeur: [t('Vous vendez déjà ce produit : modifiez le stock ou ajoutez une variante plutôt que de publier une nouvelle fiche.'), 'np-produit'],
      etat: [t('Choisissez l’état du produit.'), 'np-etat'],
      nom: [t('Écrivez le nom du produit.'), 'np-produit'],
      categorie: [t('Choisissez la catégorie.'), 'np-produit'],
      description: [t('Description : 20 caractères au moins, sans numéro, lien ni adresse e-mail.'), 'np-produit'],
      note: [t('Note : sans numéro, lien ni adresse e-mail.'), 'np-note'],
      fiche: [t('Choisissez d’abord le produit.'), 'np-produit'],
    }
    const [texte, ancre] = textes[res.raison] ?? [t('Cette offre est déjà envoyée.'), 'np-produit']
    setRefus(texte)
    montrer(ancre)
  }

  const enregistrerStock = async (p: Produit, n: number) => {
    const x = await source.produits.changerStock(p.id, n)
    if (!x.ok) return false
    jouer('interrupteur')
    setStockDe(null)
    dire(tf('Stock enregistré : {n}', { n }))
    return true
  }
  if (chercher)
    return (
      <Ecran route="offre1" titre={t('Nouveau produit')} retour={chemin('produits')} fixes={<>{toast}<FeuilleStock p={stockDe} fermer={() => setStockDe(null)} enregistrer={enregistrerStock} /></>}>
        <Tete />
        <Panneau icone="tag" titre={t('Produit')} sous={t('Vos photos et votre saisie sont gardées')}>
          <Recherche b={b} r={r} stock={setStockDe} />
          <button type="button" className="np-lien t13 b8 cor mt8" onClick={() => setChercher(false)}>
            <Icone nom="arrow-left" taille={15} />
            {tf('Garder « {t} »', { t: b.titre || t('mon produit') })}
          </button>
        </Panneau>
      </Ecran>
    )

  return (
    <Ecran
      route="offre1"
      titre={t('Nouveau produit')}
      retour={chemin('produits')}
     
      fixes={
        <>
          <ApercuClient ouverte={apercu} fermer={() => setApercu(false)} p={{ ...b, titre: nouveau ? f.titre : b.titre, variante: f.variante, prix, stock: stock ?? 0, etatArticle: f.etat || r.etats[0], paiementAuRetrait: f.paiementAuRetrait, prixBarre: promoValide ? prixBarre : null, finPromo: promoValide ? fin : null, noteVendeur: f.note }} />
          {toast}
        </>
      }
    >
      <Tete />
      {params.get('rattache') === '1' && (
        <div className="note green blv-succes">
          <Icone nom="link" taille={18} />
          <div>{t('Ce produit existe déjà : votre offre y est rattachée. Rien de ce que vous avez saisi n’est perdu.')}</div>
        </div>
      )}
      {b.etat === 'refusee' && (
        <div className="note red">
          <Icone nom="circle-x" taille={18} />
          <div>{b.motifRefus ? tf('Refusée : {m}. Corrigez, puis publiez de nouveau.', { m: t(b.motifRefus) }) : t('Refusée par la vérification : corrigez, puis publiez de nouveau.')}</div>
        </div>
      )}
      <div className="np-grille">
        <div className="np-col">
          <Panneau id="np-produit" icone="tag" titre={t('Produit')} sous={nouveau ? t('Nouveau au catalogue') : t('Au catalogue BelivaY')}>
            <ProduitChoisi b={b} variantes={variantes} f={f} maj={maj} r={r} changer={() => setChercher(true)} />
            {err('produit') && <div className="hint cr">{t('Écrivez le nom (3 caractères au moins) et choisissez la catégorie.')}</div>}
          </Panneau>
          <Panneau id="np-photos" icone="camera" titre={t('Photos réelles de votre article')} sous={tf('{min} au moins, {max} au plus · la première est la principale', { min: r.photosMin, max: r.photosMax })}>
            <Photos b={b} r={r} dire={dire} />
          </Panneau>
        </div>
        <div className="np-col">
          <Panneau icone="banknote" titre={t('Prix et stock')}>
            <div className="fld" id="np-prix" style={{ marginTop: 0 }}>
              <label htmlFor="np-p">
                {t('Prix de vente ')}
                <span className="req">{t('*')}</span>
              </label>
              <div className={inp('prix') + ' focus'}>
                <input size={1} id="np-p" inputMode="numeric" value={f.prix} onChange={(e) => maj({ prix: e.target.value.replace(/\D/g, '').slice(0, 9) })} placeholder={t('Ex. : 14 500')} />
                <span className="suf">{t('F')}</span>
              </div>
              {a && aJour && a.refus === 'minimum' ? (
                <div className="hint cr">{a.minimum > r.prixMin ? tf('Publiable dès {m} : en dessous, vous ne gardez rien.', { m: montant(a.minimum) }) : t('500 F minimum')}</div>
              ) : a && aJour && a.refus === 'plafond' && a.plafond ? (
                <div className="hint cr">{tf('Au-dessus de {m}, attendez {n} commandes livrées sans incident ({l} sur {n}) : le brouillon est gardé.', { m: montant(a.plafond.montant), n: a.plafond.requises, l: a.plafond.livrees })}</div>
              ) : err('prix') ? (
                <div className="hint cr">{t('Indiquez votre prix de vente')}</div>
              ) : (
                <div className="hint">{t('Prix final payé par l’acheteur, sans la livraison.')}</div>
              )}
            </div>
            {a && a.garde !== null && a.partPourCent !== null && (
              <div className="keep" aria-live="polite">
                <span className="kl">{tf('À {p}, vous gardez par vente', { p: montant(a.prix) })}</span>
                <span className="kv2">
                  <span style={{ display: 'block' }}>{montant(a.garde)}</span>
                  <span style={{ display: 'block', textAlign: 'right', fontSize: '12.5px', fontWeight: '700', letterSpacing: '0', marginTop: '1px' }}>{tf('soit {p} %', { p: pct(a.partPourCent) })}</span>
                </span>
              </div>
            )}
            {a && a.garde !== null && a.petitPrix && <div className="hint">{tf('Sous {s}, la commission prend {n} points de plus : affiché avant de publier.', { s: montant(a.seuilPetitPrix), n: a.points })}</div>}
            {c && aJour && a?.garde !== null && !c.dejaLeMoinsCher && (
              <div className="np-conseil blv-cascade">
                <Icone nom="trending-up" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0', marginTop: '2px' }} />
                <div className="grow t13" style={{ lineHeight: '1.45', minWidth: 0 }}>
                  <b>{tf('Prix conseillé : {p}', { p: montant(c.conseille) })}</b>
                  <div className="c2">{tf('Vous gardez {g} ; premier dans {n} zones sur {m}.', { g: montant(c.gardeConseille), n: c.zones.filter((z) => z.premierAuConseille).length, m: c.zones.length })}</div>
                  <div className="t12 c3">{tf('{n} offres de {min} à {max}. BelivaY ne conseille jamais un prix plus haut.', { n: c.marche.nombre, min: montant(c.marche.min).replace(/\s?F$/, ''), max: montant(c.marche.max) })}</div>
                </div>
                <button
                  type="button"
                  className="btn soft auto"
                  style={{ minHeight: '40px' }}
                  onClick={() => {
                    jouer('interrupteur')
                    maj({ prix: String(c.conseille) })
                  }}
                >
                  {t('Ajuster')}
                </button>
              </div>
            )}
            {c && aJour && c.dejaLeMoinsCher && (
              <div className="row t13 cg b7 mt8" style={{ gap: '6px' }}>
                <Icone nom="circle-check" taille={16} />
                <span>{t('Vous êtes déjà le prix le plus bas pour les clients.')}</span>
              </div>
            )}
            <div id="np-promo" className="split2">
              <div className="fld" style={{ minWidth: 0 }}>
                <label htmlFor="np-pb">{t('Prix barré (avant promo)')}</label>
                <div className={inp('promo')}>
                  <input size={1} id="np-pb" inputMode="numeric" value={f.prixBarre} onChange={(e) => maj({ prixBarre: e.target.value.replace(/\D/g, '').slice(0, 9) })} placeholder={t('Ex. : 22 000')} />
                  <span className="suf">{t('F')}</span>
                </div>
              </div>
              <div className="fld" style={{ minWidth: 0 }}>
                <label htmlFor="np-fin">{t('Fin de promotion')}</label>
                <div className={inp('promo')} style={prixBarre === null ? { opacity: 0.55 } : undefined}>
                  <input size={1} id="np-fin" type="date" value={f.finPromo} min={versJour(horloge + JOUR)} max={versJour(finMax)} disabled={prixBarre === null} onChange={(e) => maj({ finPromo: e.target.value })} />
                </div>
              </div>
            </div>
            <div className={'hint' + (err('promo') ? ' cr' : '')}>
              {prixBarre === null
                ? t('Laissez vide s’il n’y a pas de promotion.')
                : promoValide
                  ? tf('−{p} % jusqu’au {d} : un vrai compte à rebours sur la fiche. BelivaY vérifie que l’ancien prix a été pratiqué.', { p: remise!, d: jourMois(fin!, langue) })
                  : tf('{p} % de remise au moins et une fin dans les {j} jours. BelivaY vérifie que l’ancien prix a été pratiqué.', { p: r.promoRemiseMin, j: r.promoJoursMax })}
            </div>
            <div className="split2" id="np-stock">
              <div className="fld" style={{ minWidth: 0 }}>
                <label htmlFor="np-s">
                  {t('Stock disponible ')}
                  <span className="req">{t('*')}</span>
                </label>
                <div className={inp('stock')}>
                  <input size={1} id="np-s" inputMode="numeric" value={f.stock} onChange={(e) => maj({ stock: e.target.value.replace(/\D/g, '').slice(0, 5) })} placeholder={t('Ex. : 12')} />
                </div>
              </div>
              <div className="fld" style={{ minWidth: 0 }}>
                <label htmlFor="np-seuil">
                  {t('Seuil d’alerte ')}
                  <span className="req">{t('*')}</span>
                </label>
                <div className={inp('seuil')}>
                  <input size={1} id="np-seuil" inputMode="numeric" value={f.seuil} onChange={(e) => maj({ seuil: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder={t('Ex. : 3')} />
                </div>
              </div>
            </div>
            <div className={'hint' + (err('stock') ? ' cr' : '')}>{err('stock') ? t('Indiquez votre stock (1 au moins).') : t('Sous le seuil, une alerte s’affiche dans votre espace.')}</div>
            <div className="fld" id="np-etat">
              <label htmlFor="np-e">
                {t('État du produit ')}
                <span className="req">{t('*')}</span>
              </label>
              <div className={inp('etat')}>
                <select id="np-e" style={SELECT} value={f.etat} onChange={(e) => maj({ etat: e.target.value })}>
                  <option value="">{t('— Choisir —')}</option>
                  {r.etats.map((e) => (
                    <option key={e} value={e}>
                      {t(e)}
                    </option>
                  ))}
                </select>
                <span className="suf">
                  <Icone nom="chevron-down" taille={16} />
                </span>
              </div>
              <div className={'hint' + (err('etat') ? ' cr' : '')}>{t('Dans quel état est l’article que vous vendez ? L’état exact évite les retours.')}</div>
            </div>
            <div className="fld" id="np-note">
              <label htmlFor="np-n">{t('Note vendeur')}</label>
              <div className={inp('note')} style={{ height: 'auto', padding: '10px 13px' }}>
                <textarea id="np-n" rows={2} maxLength={r.noteMax} value={f.note} onChange={(e) => maj({ note: e.target.value })} placeholder={t('Information visible par l’acheteur sur votre offre.')} />
              </div>
              <div className={'hint' + (err('note') || COORD.test(f.note) ? ' cr' : '')}>{COORD.test(f.note) ? t('Sans numéro, lien ni adresse e-mail : l’échange passe par BelivaY.') : tf('Ex. : garantie 6 mois, facture remise. {n} caractères au plus.', { n: r.noteMax })}</div>
            </div>
          </Panneau>
          <details className="more" open={colisObligatoire || (tente && fautes.colis) || undefined}>
            <summary>
              <Icone nom="sliders-horizontal" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
              <span className="grow">
                <span style={{ display: 'block' }}>{t('Autres réglages · déjà remplis')}</span>
                <span className="t12 c3" style={{ display: 'block', fontWeight: '600', marginTop: '1px' }}>
                  {`${delai(f.delaiH)} · ${t(f.paiementAuRetrait ? 'paiement au retrait accepté' : 'paiement d’avance')} · ${tf('colis {c}', { c: classe ?? b.colis })}`}
                </span>
              </span>
              <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
            </summary>
            <div className="more-b">
              <div className="fld">
                <label htmlFor="np-delai">{t('Délai de préparation')}</label>
                <div className="inp">
                  <select id="np-delai" style={SELECT} value={f.delaiH} onChange={(e) => maj({ delaiH: Number(e.target.value) })}>
                    {r.delaisH.map((h) => (
                      <option key={h} value={h}>
                        {delai(h)}
                      </option>
                    ))}
                  </select>
                  <span className="suf">
                    <Icone nom="chevron-down" taille={16} />
                  </span>
                </div>
              </div>
              <div className="row" style={{ padding: '12px 0', borderTop: '1px solid var(--line)', marginTop: '10px' }}>
                <div className="grow">
                  <div className="b8 t14">{t('Paiement au retrait accepté')}</div>
                  <div className="t12 c3 mt4">{t('Rien n’est encaissé avant le retrait ; un refus ne vous coûte rien')}</div>
                </div>
                <Interrupteur on={f.paiementAuRetrait} libelle={t('Paiement au retrait accepté')} changer={(on) => maj({ paiementAuRetrait: on })} />
              </div>
              <div className="row" style={{ padding: '12px 0', borderTop: '1px solid var(--line)' }}>
                <div className="grow">
                  <div className="b8 t14">{t('Made in Cameroon')}</div>
                  <div className="t12 c3 mt4">{t('Sur certificat · vous gardez 2 points de plus')}</div>
                </div>
                <Interrupteur on={f.madeInCameroon} libelle={t('Made in Cameroon')} changer={(on) => maj({ madeInCameroon: on })} />
              </div>
              {nouveau && (
                <div className="row" style={{ padding: '12px 0', borderTop: '1px solid var(--line)' }}>
                  <div className="grow">
                    <div className="b8 t14">{r.fichePrioPrix !== null ? tf('Vérification prioritaire · {m}', { m: montant(r.fichePrioPrix) }) : t('Vérification prioritaire')}</div>
                    <div className="t12 c3 mt4">{tf('Fiche écrite et offre vérifiée sous {a} h au lieu de {b} h ; payée par USSD, remboursée si le produit existe déjà ou si le délai est dépassé.', { a: r.fichePrioDelaiH, b: r.moderationH })}</div>
                  </div>
                  <Interrupteur on={f.prioritaire} libelle={t('Vérification prioritaire')} changer={(on) => maj({ prioritaire: on })} />
                </div>
              )}
              <div className="row" id="np-colis" style={{ padding: '12px 0 0', borderTop: '1px solid var(--line)', alignItems: 'flex-start' }}>
                <Icone nom="package" taille={20} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
                <div className="grow">
                  <div className="b8 t14">{colisObligatoire ? tf('Colis {c} · poids facturé {k} kg', { c: classe ?? t('hors gabarit'), k: String(Math.round(facture * 10) / 10).replace('.', ',') }) : tf('Colis {c} · rien à déclarer', { c: poids !== null || dims.some((x) => x !== null) ? (classe ?? b.colis) : b.colis })}</div>
                  <div className="t12 c3 mt4">{t('Poids et dimensions deviennent obligatoires au-delà de 5 kg ou 50 cm.')}</div>
                </div>
              </div>
              <div className="split2">
                <div className="fld" style={{ minWidth: 0 }}>
                  <label htmlFor="np-poids">
                    {t('Poids (kg)')}
                    {colisObligatoire && <span className="req">{t(' *')}</span>}
                  </label>
                  <div className={'inp' + (tente && fautes.colis && poids === null ? ' err' : '')}>
                    <input size={1} id="np-poids" inputMode="decimal" value={f.poids} onChange={(e) => maj({ poids: e.target.value.replace(/[^\d,.]/g, '').slice(0, 6) })} placeholder={t('Ex. : 0,4')} />
                  </div>
                </div>
                <div className="fld" style={{ minWidth: 0 }}>
                  <label>
                    {t('Dimensions (cm)')}
                    {colisObligatoire && <span className="req">{t(' *')}</span>}
                  </label>
                  <div className="row" style={{ gap: '4px' }}>
                    {(['L', 'l', 'h'] as const).map((x, i) => (
                      <div key={x} className={'inp' + (tente && fautes.colis && dims[i] === null ? ' err' : '')} style={{ padding: '0 6px', minWidth: 0, flex: 1 }}>
                        <input
                          size={1}
                          inputMode="numeric"
                          aria-label={t(['Longueur (cm)', 'Largeur (cm)', 'Hauteur (cm)'][i])}
                          value={f.dims[i]}
                          onChange={(e) => {
                            const d = [...f.dims] as [string, string, string]
                            d[i] = e.target.value.replace(/[^\d,.]/g, '').slice(0, 5)
                            maj({ dims: d })
                          }}
                          placeholder={x}
                          style={{ textAlign: 'center' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </details>
          <div className="np-publier">
            {tente && restants.length > 0 && (
              <div className="note red" role="alert">
                <Icone nom="circle-alert" taille={18} />
                <div>{tf('Il manque : {l}.', { l: restants.map((k) => t(MANQUES[k])).join(', ') })}</div>
              </div>
            )}
            {refus && (
              <div className="note red" role="alert">
                <Icone nom="circle-alert" taille={18} />
                <div>{refus}</div>
              </div>
            )}
            {!enLigne && <HorsConnexion texte="Hors connexion, l’offre est gardée et part au retour du réseau." />}
            <Bouton classe="secondary" icone="eye" onClick={() => setApercu(true)}>
              {t('Ce que verra le client')}
            </Bouton>
            <div className="mt8">
              <Bouton classe="primary" icone="send" inactif={envoi} onClick={() => void publier()}>
                {tf('Publier · vérification sous {n} h', { n: nouveau && f.prioritaire ? r.fichePrioDelaiH : r.moderationH })}
              </Bouton>
            </div>
            <div className="mt8">
              <Bouton classe="ghost" icone="archive" vers={chemin('produits')} etat={{ message: t('Brouillon gardé dans Mes produits') }} style={{ height: '44px' }}>
                {t('Garder en brouillon')}
              </Bouton>
            </div>
            <p className="scrim-note" style={{ marginTop: '6px' }}>{nouveau ? t('BelivaY écrit la fiche à partir de vos photos et de votre description pendant la vérification, puis le produit passe en vente.') : t('Motif toujours écrit en cas de refus. Brouillon gardé à chaque saisie.')}</p>
          </div>
        </div>
      </div>
    </Ecran>
  )
}

/** Sous le titre de l'en-tête (« Nouveau produit », comme l'interface réelle) : la règle en une ligne. */
function Tete() {
  const { t } = usePreferences()
  return (
    <p className="pg-s np-intro">{t('Cherchez-le d’abord : s’il est déjà au catalogue, un geste suffit. Vérifié par BelivaY sous 48 h.')}</p>
  )
}

export default function Offre1() {
  const { t, tf, langue } = usePreferences()
  const montants = useMontantsVisibles()
  const [params] = useSearchParams()
  const bId = params.get('b')
  const { dire, toast } = useToast()
  const [stockDe, setStockDe] = useState<Produit | null>(null)
  const lecture = useLecture(async () => {
    if (!montants) return null
    const r = await source.offres.reglages()
    const b = bId ? await source.produits.detail(bId) : null
    const variantes = b?.ficheId ? await source.produits.variantes(b.ficheId) : []
    const liste = bId ? null : await source.produits.liste()
    return { r, b, variantes, brouillons: liste ? liste.produits.filter((p) => p.etat === 'brouillon') : [] }
  }, [bId, montants])
  if (!montants) return <Reserve route="offre1" />
  const d = lecture.donnees
  if (!d) return <Chargement route="offre1" />
  if (bId && d.b && (d.b.etat === 'brouillon' || d.b.etat === 'refusee')) return <Brouillon key={d.b.id + d.b.ficheId} b={d.b} r={d.r} variantes={d.variantes} />
  if (bId && d.b)
    return (
      <Ecran route="offre1" titre={t('Nouveau produit')} retour={chemin('produits')}>
        <div className="card" style={{ marginTop: '18px' }}>
          <div className="empty">
            <div className="ei">
              <Icone nom="send" taille={24} />
            </div>
            <h3>{t('Cette offre est déjà envoyée')}</h3>
            <p>{t('Suivez sa vérification dans Mes produits.')}</p>
          </div>
          <Bouton classe="secondary" icone="eye" vers={chemin('offre_detail', { p: d.b.id })}>
            {t('Voir l’offre')}
          </Bouton>
        </div>
      </Ecran>
    )
  const brouillon = d.brouillons[0]
  return (
    <Ecran
      route="offre1"
      titre={t('Nouveau produit')}
      retour={chemin('produits')}
     
      fixes={
        <>
          {toast}
          <FeuilleStock
            p={stockDe}
            fermer={() => setStockDe(null)}
            enregistrer={async (p, n) => {
              const x = await source.produits.changerStock(p.id, n)
              if (!x.ok) return false
              jouer('interrupteur')
              setStockDe(null)
              dire(tf('Stock enregistré : {n}', { n }))
              return true
            }}
          />
        </>
      }
    >
      <Tete />
      {brouillon && (
        <Link to={chemin('offre1', { b: brouillon.id })} className="card flat tight li blv-cascade" style={{ marginTop: '0' }}>
          <VignetteProduit p={brouillon} taille={40} />
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {brouillon.variante ? `${brouillon.titre} · ${t(brouillon.variante)}` : brouillon.titre}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {tf('Brouillon du {d}', { d: dateHeure(brouillon.majA, langue) })}
            </span>
          </span>
          <span className="t13 b8 cor nw">{t('Reprendre')}</span>
        </Link>
      )}
      <div className="np-grille">
        <div className="np-col">
          <Panneau icone="tag" titre={t('Produit')}>
            <Recherche b={null} r={d.r} stock={setStockDe} />
          </Panneau>
          <Panneau icone="camera" titre={t('Photos réelles de votre article')} inactif={t('Choisissez d’abord le produit ci-dessus.')} />
        </div>
        <div className="np-col">
          <Panneau icone="banknote" titre={t('Prix et stock')} inactif={t('Prix, prix barré et fin de promotion, stock, seuil d’alerte, état et note : dès que le produit est choisi, avec ce que vous gardez en direct.')} />
        </div>
      </div>
    </Ecran>
  )
}
