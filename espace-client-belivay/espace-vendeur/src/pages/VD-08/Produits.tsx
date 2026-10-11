// Mes produits (VD-08, onglet 3) : repris du prototype (route('produits'), prodCard), branché sur la source.
// - Ligne de synthèse calculée sur les données (PRD-01 : la somme par état égale la synthèse), tri du serveur : ce qui
//   demande attention d'abord (PRD-02, Q-90 : vendeur moins cher, litige, refus → stock sous le seuil → vérification →
//   brouillon → reste), jamais de A à Z.
// - Chaque carte (PRD-03 à PRD-07) : photo, nom et variante, liseré et pastille d'état, bande chiffrée (prix, gardé par
//   vente, stock rouge sous le seuil), 0 à 2 bandes d'attention qui ouvrent l'écran qui règle le problème (la bande de
//   vérification n'a pas d'action), « Ce mois : n ventes · X F gardés » (ventes gelées exclues, PRD-04), « Dupliquer »
//   au pied (lien qui n'ouvre pas la carte).
// - Ajouts : recherche, filtres par état avec leurs nombres, tri (urgent, stock le plus bas, le plus vendu), stock
//   rapide (feuille : − / + / saisie, accès Préparation compris), brouillons à reprendre ou à supprimer (avec
//   « Annuler »), menu ⋮ Importer / Exporter (CSV), états vide, erreur, hors connexion (dernière liste connue).
// - Accès Préparation : aucun montant, ni « Ajouter un produit », ni « Dupliquer », ni « Ajuster » (prix réservés).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Feuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { EtatOffre, ListeProduits, Produit } from '../../donnees/domaines/produits'
import { source } from '../../donnees/source'
import { mettreEnFile } from '../../donnees/fileHorsLigne'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useMontantsVisibles, useSession } from '../../session'
import { Bouton, Erreur, Chargement, FeuilleStock, HorsConnexion, VignetteProduit, dateHeure, useEnLigne, useManques, useMontant, useToast } from './commun'

type Filtre = 'tous' | 'attention' | EtatOffre
type Tri = 'urgent' | 'stock' | 'ventes'
const FILTRES: { id: Filtre; nom: string }[] = [
  { id: 'tous', nom: 'Tous' },
  { id: 'attention', nom: 'À regarder' },
  { id: 'en_vente', nom: 'En vente' },
  { id: 'en_verification', nom: 'En vérification' },
  { id: 'brouillon', nom: 'Brouillons' },
  { id: 'en_pause', nom: 'En pause' },
  { id: 'refusee', nom: 'Refusées' },
]
const LISERE: Record<EtatOffre, string> = { en_vente: 'green', en_verification: 'amber', brouillon: 'ink', en_pause: 'ink', refusee: 'red' }
const nrm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
const aRegarder = (p: Produit) => p.attention.length > 0 || p.etat === 'refusee' || p.etat === 'brouillon'

function Pastille({ etat }: { etat: EtatOffre }) {
  const { t } = usePreferences()
  if (etat === 'en_vente')
    return (
      <span className="pill green sm">
        <i className="d"></i>
        {t('En vente')}
      </span>
    )
  if (etat === 'en_verification')
    return (
      <span className="pill amber sm">
        <Icone nom="hourglass" taille={13} />
        {t('En vérification')}
      </span>
    )
  if (etat === 'refusee')
    return (
      <span className="pill red sm">
        <Icone nom="circle-x" taille={13} />
        {t('Refusée')}
      </span>
    )
  return (
    <span className="pill ink sm">
      <Icone nom={etat === 'en_pause' ? 'pause' : 'pencil'} taille={13} />
      {t(etat === 'en_pause' ? 'En pause' : 'Brouillon')}
    </span>
  )
}

/** Bande d'attention (PRD-05) : 44 px au moins, icône, ce qui se passe, action à droite quand il y en a une. */
function Bande(p: { ton: 'red' | 'or' | 'amber' | 'ink'; icone: string; titre: string; sous?: string; action?: string; vers?: string; onClick?: () => void }) {
  const couleur = { red: 'var(--red)', or: 'var(--or-deep)', amber: 'var(--amber)', ink: 'var(--ink-2)' }[p.ton]
  const fond = { red: ['var(--red-soft)', 'var(--red-line)'], or: ['var(--or-soft)', 'var(--or-line)'], amber: ['var(--amber-soft)', 'var(--amber-line)'], ink: ['var(--sand-2)', 'var(--line-2)'] }[p.ton]
  const style = { minHeight: '44px', padding: '8px 12px', gap: '10px', borderRadius: '12px', background: fond[0], border: `1px solid ${fond[1]}` }
  const corps: ReactNode = (
    <>
      <Icone nom={p.icone} taille={18} style={{ color: couleur, flexShrink: '0' }} />
      <span className="grow t13" style={{ lineHeight: '1.35' }}>
        <b style={{ display: 'block', color: couleur }}>{p.titre}</b>
        {p.sous && (
          <span className="c2" style={{ display: 'block', fontSize: '12.5px', marginTop: '1px' }}>
            {p.sous}
          </span>
        )}
      </span>
      {p.action && (
        <span className="row t13 b8 nw" style={{ gap: '2px', color: couleur }}>
          {p.action}
          <Icone nom="chevron-right" taille={16} />
        </span>
      )}
    </>
  )
  if (p.vers)
    return (
      <Link to={p.vers} className="row mt8" style={style}>
        {corps}
      </Link>
    )
  if (p.onClick)
    return (
      <button type="button" className="row mt8" onClick={p.onClick} style={{ ...style, width: '100%', font: 'inherit', textAlign: 'left', cursor: 'pointer', color: 'inherit' }}>
        {corps}
      </button>
    )
  return (
    <div className="row mt8" style={style}>
      {corps}
    </div>
  )
}

function Carte({ p, ouvrirStock, supprimer }: { p: Produit; ouvrirStock: (p: Produit) => void; supprimer: (p: Produit) => void }) {
  const { t, tf, langue } = usePreferences()
  const montants = useMontantsVisibles()
  const montant = useMontant()
  const stockBas = p.attention.includes('stock_bas')
  const manques = useManques()
  const vers = p.etat === 'brouillon' && montants ? chemin('offre1', { b: p.id }) : chemin('offre_detail', { p: p.id })
  const nom = p.variante ? `${p.titre} · ${t(p.variante)}` : p.titre
  const sous = p.dupliqueDe ? tf('{rayon} · {etat} · dupliqué du {v}', { rayon: t(p.rayon), etat: t(p.etatArticle).toLowerCase(), v: t(p.dupliqueDe) }) : tf('{rayon} · {etat} · colis {c}', { rayon: t(p.rayon), etat: t(p.etatArticle).toLowerCase(), c: p.colis })
  const bandes: ReactNode[] = []
  if (p.etat === 'refusee')
    bandes.push(
      <Bande key="r" ton="red" icone="circle-x" titre={t('Refusée par la vérification')} sous={p.motifRefus ? t(p.motifRefus) : undefined} action={montants ? t('Corriger') : undefined} vers={montants ? chemin('offre1', { b: p.id }) : undefined} />,
    )
  if (stockBas)
    bandes.push(
      <Bande key="s" ton="red" icone="package" titre={t(p.stock === 0 ? 'Rupture de stock' : 'Stock bas')} sous={p.stock === 0 ? t('Plus proposé aux clients tant que le stock est à 0') : tf('Seuil réglé à {n}', { n: p.seuilAlerte })} action={t('Réapprovisionner')} vers={montants ? chemin('offre3', { o: p.id, focus: 'stock' }) : undefined} onClick={montants ? undefined : () => ouvrirStock(p)} />,
    )
  if (p.concurrent && montants) bandes.push(<Bande key="c" ton="or" icone="trending-up" titre={tf('Un vendeur est passé à {p}', { p: montant(p.concurrent.prix) })} action={t('Ajuster')} vers={chemin('offre3', { o: p.id })} />)
  if (p.etat === 'en_verification' && p.verificationAvant)
    bandes.push(<Bande key="v" ton="amber" icone="calendar-clock" titre={tf('Réponse avant {d}', { d: dateHeure(p.verificationAvant, langue) })} sous={p.envoyeeA ? tf('Envoyée {d} · pas encore visible des clients', { d: dateHeure(p.envoyeeA, langue) }) : undefined} />)
  if (p.attention.includes('litiges'))
    bandes.push(
      <Bande
        key="l"
        ton="red"
        icone="scale"
        titre={tf(p.litigesCeMois > 1 ? 'Ce mois : {n} ventes en litige' : 'Ce mois : {n} vente en litige', { n: p.litigesCeMois })}
        sous={montants && p.geleCeMois !== null ? tf('{m} gelés, pas encore gardés', { m: montant(p.geleCeMois) }) : undefined}
        action={t('Voir')}
        vers={chemin('litiges')}
      />,
    )
  if (p.etat === 'brouillon')
    bandes.push(
      p.ficheDemandee ? (
        <Bande key="b" ton="amber" icone="file-pen" titre={tf('Fiche demandée · réponse avant {d}', { d: dateHeure(p.ficheDemandee.reponseAvant, langue) })} sous={t('BelivaY écrit la fiche ; votre offre attend ici.')} />
      ) : (
        <Bande key="b" ton="ink" icone="pencil" titre={t('Brouillon')} sous={manques(p)} action={montants ? t('Reprendre') : undefined} vers={montants ? vers : undefined} />
      ),
    )
  return (
    <div className={'card ord ' + LISERE[p.etat]}>
      <Link to={vers} className="art" style={{ marginTop: '0', alignItems: 'flex-start' }}>
        <VignetteProduit p={p} taille={56} />
        <span className="grow">
          <span className="an" style={{ display: 'block', fontSize: '16px' }}>
            {nom}
          </span>
          <span className="av" style={{ display: 'block' }}>
            {sous}
          </span>
          <span className="meta" style={{ marginTop: '6px' }}>
            <Pastille etat={p.etat} />
          </span>
        </span>
        <Icone nom="chevron-right" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0', marginTop: '2px' }} />
      </Link>
      <div className="row mt12" style={{ padding: '10px 12px', gap: '8px', borderRadius: '12px', background: 'var(--sand-2)', alignItems: 'flex-start' }}>
        {montants && (
          <>
            <div className="grow">
              <div className="t12 c3">{t('Prix')}</div>
              <div className="b8 t15 mt4 ">{p.prix !== null ? montant(p.prix) : t('À fixer')}</div>
            </div>
            <div className="grow">
              <div className="t12 cg b7">{t('Vous gardez')}</div>
              <div className="b8 t15 mt4 cg">{p.garde !== null ? montant(p.garde) : t('—')}</div>
            </div>
          </>
        )}
        <button type="button" className="grow right" onClick={() => ouvrirStock(p)} aria-label={tf('Changer le stock de {nom}', { nom })} style={{ border: 0, background: 'transparent', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', minHeight: '44px', textAlign: montants ? 'right' : 'left' }}>
          <div className="t12 c3">
            {t('Stock')}
            <Icone nom="pencil" taille={12} style={{ marginLeft: '4px', verticalAlign: '-1px' }} />
          </div>
          <div className={'b8 t15 mt4 ' + (stockBas ? 'cr' : '')}>{String(p.stock)}</div>
        </button>
      </div>
      {bandes.slice(0, 2)}
      <div className="row mt4" style={{ gap: '8px', marginBottom: '-8px' }}>
        <span className="grow t13 c3">
          {montants && p.ventesCeMois > 0 && p.gardeCeMois !== null && (
            <>
              {tf(p.ventesCeMois > 1 ? 'Ce mois : {n} ventes · ' : 'Ce mois : {n} vente · ', { n: p.ventesCeMois })}
              <b className="cg">{tf('{m} gardés', { m: montant(p.gardeCeMois) })}</b>
            </>
          )}
        </span>
        {montants && p.etat !== 'brouillon' && p.ficheId && (
          <Link to={chemin('dupliquer', { p: p.id })} className="row t13 b8 cor nw" style={{ gap: '5px', minHeight: '44px' }}>
            <Icone nom="copy" taille={15} />
            {t('Dupliquer')}
          </Link>
        )}
        {montants && p.etat === 'brouillon' && (
          <button type="button" onClick={() => supprimer(p)} className="row t13 b8 nw" style={{ gap: '5px', minHeight: '44px', border: 0, background: 'transparent', color: 'var(--red)', fontFamily: 'inherit', cursor: 'pointer', padding: 0 }}>
            <Icone nom="trash-2" taille={15} />
            {t('Supprimer')}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Produits() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const montants = useMontantsVisibles()
  const enLigne = useEnLigne()
  const [params, setParams] = useSearchParams()
  const lecture = useLecture(() => source.produits.liste(), [s.membre?.role])
  const derniere = useRef<ListeProduits | null>(null)
  if (lecture.donnees) derniere.current = lecture.donnees
  const { dire, toast } = useToast()
  const lieu = useLocation()
  const message = (lieu.state as { message?: string } | null)?.message
  useEffect(() => {
    if (message) dire(message)
  }, [message, dire])
  const [q, setQ] = useState('')
  const [stockDe, setStockDe] = useState<Produit | null>(null)
  const [menu, setMenu] = useState(false)
  const fichier = useRef<HTMLInputElement>(null)
  const filtre = (FILTRES.some((f) => f.id === params.get('f')) ? params.get('f') : 'tous') as Filtre
  const tri = (['urgent', 'stock', 'ventes'].includes(params.get('tri') ?? '') ? params.get('tri') : 'urgent') as Tri
  const regler = (cle: string, v: string, defaut: string) => {
    const p = new URLSearchParams(params)
    if (v === defaut) p.delete(cle)
    else p.set(cle, v)
    setParams(p, { replace: true })
  }
  const d = lecture.donnees ?? derniere.current
  const visibles = useMemo(() => {
    if (!d) return []
    const m = nrm(q.trim())
    const l = d.produits.filter((p) => (filtre === 'tous' ? true : filtre === 'attention' ? aRegarder(p) : p.etat === filtre) && (!m || nrm(`${p.titre} ${p.variante} ${p.rayon}`).includes(m)))
    if (tri === 'stock') return [...l].sort((a, b) => a.stock - a.seuilAlerte - (b.stock - b.seuilAlerte))
    if (tri === 'ventes') return [...l].sort((a, b) => b.ventesCeMois - a.ventesCeMois)
    return l
  }, [d, q, filtre, tri])
  if (!d) return lecture.erreur ? <Erreur route="produits" texte="Vos produits ne s’affichent pas" relire={lecture.relire} /> : <Chargement route="produits" />
  const c = d.compteurs
  const morceaux = [tf(c.total > 1 ? '{n} produits' : '{n} produit', { n: c.total }), tf('{n} en vente', { n: c.en_vente }), tf('{n} en vérification', { n: c.en_verification })]
  if (c.en_pause) morceaux.push(tf('{n} en pause', { n: c.en_pause }))
  if (c.brouillon) morceaux.push(tf(c.brouillon > 1 ? '{n} brouillons' : '{n} brouillon', { n: c.brouillon }))
  if (c.refusee) morceaux.push(tf(c.refusee > 1 ? '{n} refusées' : '{n} refusée', { n: c.refusee }))
  const nombre = (f: Filtre) => (f === 'tous' ? c.total : f === 'attention' ? d.produits.filter(aRegarder).length : c[f])
  const enregistrerStock = async (p: Produit, n: number) => {
    // Hors connexion, le stock part en file avec son heure (Q-93) et sera rejoué au retour du réseau.
    if (!navigator.onLine) {
      await mettreEnFile('stock', p.titre, { offreId: p.id, stock: n })
      setStockDe(null)
      dire(tf('Stock {n} gardé : il part au retour du réseau', { n }))
      return true
    }
    const r = await source.produits.changerStock(p.id, n)
    if (!r.ok) return false
    jouer('interrupteur')
    setStockDe(null)
    dire(tf('Stock enregistré : {n}', { n }))
    return true
  }
  const supprimer = async (p: Produit) => {
    const r = await source.produits.supprimer(p.id)
    if (!r.ok) return
    dire(t('Brouillon supprimé'), { libelle: t('Annuler'), faire: () => void source.produits.restaurer(p.id) })
  }
  const exporter = async () => {
    const csv = await source.produits.exporter()
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'mes-produits.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMenu(false)
    dire(t('Fichier « mes-produits.csv » enregistré'))
  }
  const importer = async (f: File | undefined) => {
    if (!f) return
    const r = await source.produits.importer(await f.text())
    setMenu(false)
    if (fichier.current) fichier.current.value = ''
    if (!r.ok) {
      jouer('erreur')
      return dire(t(r.raison === 'vide' ? 'Le fichier est vide.' : 'Fichier non reconnu : gardez les colonnes « identifiant » et « stock » de l’export.'))
    }
    dire(r.ignorees ? tf('{n} produits mis à jour, {i} lignes ignorées', { n: r.lignes, i: r.ignorees }) : tf('{n} produits mis à jour', { n: r.lignes }))
  }
  return (
    <Ecran
      route="produits"
      fixes={
        <>
          <FeuilleStock p={stockDe} fermer={() => setStockDe(null)} enregistrer={enregistrerStock} />
          <Feuille ouverte={menu} fermer={() => setMenu(false)} titre={t('Importer, exporter')}>
            <h2 className="pg-t" style={{ fontSize: '19px' }}>
              {t('Importer, exporter')}
            </h2>
            <p className="pg-s">{t('Un fichier tableur (CSV) : vos produits, leur stock et leur seuil.')}</p>
            <button type="button" className="li" onClick={() => void exporter()} style={{ width: '100%', border: 0, borderTop: '1px solid var(--line)', background: 'transparent', font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
              <Icone nom="download" taille={20} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Exporter mes produits')}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t('Identifiant, produit, variante, état, prix, stock et seuil')}
                </span>
              </span>
            </button>
            <button type="button" className="li" onClick={() => fichier.current?.click()} style={{ width: '100%', border: 0, borderTop: '1px solid var(--line)', background: 'transparent', font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
              <Icone nom="upload" taille={20} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Importer des stocks')}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t('Le fichier exporté, avec vos nouveaux stocks : les prix ne changent pas ici.')}
                </span>
              </span>
            </button>
            <input ref={fichier} type="file" accept=".csv,text/csv" hidden onChange={(e) => void importer(e.target.files?.[0])} />
          </Feuille>
          {toast}
        </>
      }
    >
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <div className="pg">
            <h1 className="pg-t">{t('Mes produits')}</h1>
            <p className="pg-s">{morceaux.join(' · ')}</p>
          </div>
        </div>
        <button type="button" className="ibtn" aria-label={t('Importer, exporter')} onClick={() => setMenu(true)} style={{ marginTop: '12px', width: '44px', height: '44px', background: 'var(--card)', boxShadow: 'var(--shadow-card)' }}>
          <Icone nom="ellipsis-vertical" taille={20} />
        </button>
      </div>
      {montants && (
        <div className="mt12">
          <Bouton classe="primary" icone="plus" vers={chemin('offre1')}>
            {t('Ajouter un produit')}
          </Bouton>
        </div>
      )}
      {!enLigne && <HorsConnexion texte={tf('Hors connexion · liste de {h}. « Ajouter un produit » reste possible : il part au retour du réseau.', { h: heure(d.luA, langue) })} />}
      {c.total === 0 ? (
        <div className="card" style={{ marginTop: '18px' }}>
          <div className="empty">
            <div className="ei">
              <Icone nom="package-open" taille={24} />
            </div>
            <h3>{t('Pas encore de produit')}</h3>
            <p>{t('Ajoutez votre premier produit : moins d’une minute s’il est déjà au catalogue.')}</p>
          </div>
          {/* Pas de second « Ajouter un produit » ici : celui du prototype, juste au-dessus, suffit (doublon retiré). */}
        </div>
      ) : (
        <>
          <div className="fld" style={{ marginTop: '14px' }}>
            <div className="inp">
              <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
              <input size={1} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Chercher dans mes produits')} aria-label={t('Chercher dans mes produits')} />
              {q && (
                <button type="button" className="suf" aria-label={t('Effacer')} onClick={() => setQ('')} style={{ border: 0, background: 'transparent', color: 'inherit', padding: '6px', cursor: 'pointer', minWidth: '32px', minHeight: '32px' }}>
                  <Icone nom="x" taille={16} />
                </button>
              )}
            </div>
          </div>
          <div className="chips scroll" role="tablist" aria-label={t('Filtrer par état')}>
            {FILTRES.filter((f) => f.id === 'tous' || f.id === 'attention' || nombre(f.id) > 0).map((f) => (
              <button key={f.id} type="button" role="tab" aria-selected={filtre === f.id} className={'chip' + (filtre === f.id ? ' on' : '')} onClick={() => regler('f', f.id, 'tous')}>
                {t(f.nom)}
                <span className="n">{String(nombre(f.id))}</span>
              </button>
            ))}
          </div>
          <div className="seg" role="radiogroup" aria-label={t('Trier')}>
            {(
              [
                ['urgent', 'Le plus urgent'],
                ['stock', 'Stock le plus bas'],
                ['ventes', 'Le plus vendu'],
              ] as const
            ).map(([id, nom]) => (
              <a key={id} role="radio" aria-checked={tri === id} tabIndex={0} className={tri === id ? 'on' : ''} onClick={() => regler('tri', id, 'urgent')} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), regler('tri', id, 'urgent'))}>
                {t(nom)}
              </a>
            ))}
          </div>
          <div className="divider-t">{t(tri === 'urgent' ? 'Le plus urgent en haut' : tri === 'stock' ? 'Le stock le plus bas en haut' : 'Le plus vendu ce mois en haut')}</div>
          {visibles.length === 0 ? (
            <div className="card">
              <div className="empty">
                <div className="ei">
                  <Icone nom="search-x" taille={24} />
                </div>
                <h3>{t('Aucun produit ne correspond')}</h3>
                <p>{t('Changez la recherche ou le filtre.')}</p>
              </div>
              <Bouton
                classe="secondary"
                icone="x"
                onClick={() => {
                  setQ('')
                  regler('f', 'tous', 'tous')
                }}
              >
                {t('Tout afficher')}
              </Bouton>
            </div>
          ) : (
            visibles.map((p) => <Carte key={p.id} p={p} ouvrirStock={setStockDe} supprimer={(x) => void supprimer(x)} />)
          )}
        </>
      )}
      {!montants && s.proprietaire && (
        <div className="hint-l">
          <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('Les prix, la publication et les copies sont réservés à {nom}, propriétaire. Vous pouvez changer le stock.', { nom: `${s.proprietaire.prenom} ${s.proprietaire.nom}` })}</span>
        </div>
      )}
    </Ecran>
  )
}
