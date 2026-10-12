// Stock et inventaire (AJ-A, DP-58 ; interface réelle « Mes produits » simplifiée) : tous mes produits et variantes
// (Q-35 : un stock par variante), compteurs qui filtrent (produits, en vente, en rupture, stock faible), alerte de
// seuil et ruptures en tête, stock modifiable en un geste (− / + / saisie), réapprovisionnement (quantité reçue,
// conseil pour tenir 14 jours au rythme des ventes), seuil d'alerte (propriétaire), historique des mouvements
// (ventes, retours, corrections, réceptions, auteur signé : VD02-DR03), recherche, export CSV.
// - Accès Préparation autorisé (VD02-DR03, ACC-27) : mêmes gestes sur le stock, aucun prix ni valeur (DP-55, ACC-26).
// - Hors connexion : le stock part en file avec son heure d'origine (VD02-H02, OFF-02).
// - Adresses : ?f=rupture|faible|vente (filtre), ?p=<offre> (produit mis en avant, depuis l'accueil), ?vue=mouvements.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { F } from '@client/i18n/format'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { mettreEnFile } from '../../donnees/fileHorsLigne'
import { useLecture } from '../../donnees/useLecture'
import { echeance } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useDroit, useHorloge, useMontantsVisibles, useSession } from '../../session'
import { Bouton, Chargement, Erreur, Feuille, Indice, Selecteur, telecharger, useEnLigne, useToast, type Coque } from './commun'
import { EcranAJ } from './coque'
import { sourceAJA } from './donnees/source'
import type { LigneStock, Mouvement, TypeMouvement } from './donnees/types'

const C: Coque = { route: 'stock', titre: 'Stock et inventaire', onglet: 'produits' }
type Filtre = 'tous' | 'vente' | 'rupture' | 'faible'

const TYPES: Record<TypeMouvement, { nom: string; icone: string }> = {
  vente: { nom: 'Vente', icone: 'shopping-bag' },
  retour: { nom: 'Retour', icone: 'undo-2' },
  reappro: { nom: 'Réception', icone: 'package-open' },
  correction: { nom: 'Correction', icone: 'pencil' },
  rupture: { nom: 'Rupture', icone: 'package-x' },
  annulation: { nom: 'Annulation', icone: 'circle-x' },
}

const nrm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** − / saisie / + : chaque toucher enregistre (une correction signée) ; la saisie part à « Entrée » ou en quittant. */
function Pas({ l, changer }: { l: LigneStock; changer: (n: number) => void }) {
  const { t, tf } = usePreferences()
  const [v, setV] = useState(String(l.stock))
  useEffect(() => setV(String(l.stock)), [l.stock])
  const valider = () => {
    const n = Number(v)
    if (!/^\d{1,5}$/.test(v)) return setV(String(l.stock))
    if (n !== l.stock) changer(n)
  }
  return (
    <div className={'aja-pas' + (l.alerte === 'rupture' ? ' red' : l.alerte === 'sous_seuil' ? ' amber' : '')}>
      <button type="button" className="ibtn" aria-label={tf('Un de moins · {p}', { p: `${l.titre} ${t(l.variante)}` })} disabled={l.stock === 0} onClick={() => changer(l.stock - 1)}>
        <Icone nom="minus" taille={20} />
      </button>
      <span className="inp">
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={tf('Stock · {p}', { p: `${l.titre} ${t(l.variante)}` })}
          value={v}
          onChange={(e) => setV(e.target.value.replace(/\D/g, '').slice(0, 5))}
          onBlur={valider}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), (e.target as HTMLInputElement).blur())}
        />
      </span>
      <button type="button" className="ibtn" aria-label={tf('Un de plus · {p}', { p: `${l.titre} ${t(l.variante)}` })} onClick={() => changer(l.stock + 1)}>
        <Icone nom="plus" taille={20} />
      </button>
    </div>
  )
}

function CarteStock({ l, enAvant, montants, changer, reappro, historique, seuil }: { l: LigneStock; enAvant: boolean; montants: boolean; changer: (n: number) => void; reappro: () => void; historique: () => void; seuil: () => void }) {
  const peutStock = useDroit('produits.stock') // droits de l'accès employé
  const { t, tf } = usePreferences()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (enAvant) ref.current?.scrollIntoView?.({ block: 'center' })
  }, [enAvant])
  const pastille =
    l.alerte === 'rupture' ? (
      <span className="pill red sm">{t('En rupture')}</span>
    ) : l.alerte === 'sous_seuil' ? (
      <span className="pill amber sm">{t('Stock faible')}</span>
    ) : l.etat === 'en_vente' ? (
      <span className="pill green sm">{t('En vente')}</span>
    ) : (
      <span className="pill ink sm">{t(l.etat === 'en_verification' ? 'En vérification' : l.etat === 'en_pause' ? 'En pause' : 'Refusée')}</span>
    )
  return (
    <div ref={ref} className="card" data-offre={l.offreId} style={enAvant ? { boxShadow: '0 0 0 2px var(--or), var(--shadow-card)' } : undefined}>
      <div className="row" style={{ gap: '12px', alignItems: 'flex-start' }}>
        <Vignette nom={l.dessin} taille={52} />
        <div className="grow" style={{ minWidth: 0 }}>
          <Link to={chemin('offre_detail', { p: l.offreId })} className="b8 t15" style={{ display: 'flex', alignItems: 'center', minHeight: '24px', color: 'var(--ink)' }}>
            {`${l.titre} · ${t(l.variante)}`}
          </Link>
          <div className="meta" style={{ marginTop: '6px' }}>
            {pastille}
            {montants && l.prix !== null && <span className="t13 b7 c2">{t(`${F(l.prix)} F`)}</span>}
          </div>
        </div>
      </div>
      <div className="row" style={{ marginTop: '12px', gap: '10px', flexWrap: 'wrap' }}>
        {peutStock ? <Pas l={l} changer={changer} /> : <span className="b8 t17">{l.stock}</span>}
        <div className="grow t12 c3" style={{ lineHeight: '1.45', minWidth: '130px' }}>
          <div>{tf('Seuil d’alerte : {s}', { s: l.seuil })}</div>
          {l.reserve > 0 && <div>{tf(l.reserve > 1 ? '{n} réservés par des commandes à préparer' : '{n} réservé par une commande à préparer', { n: l.reserve })}</div>}
          <div>{l.ventes30j ? tf(l.ventes30j > 1 ? '{n} vendus en 30 jours' : '{n} vendu en 30 jours', { n: l.ventes30j }) + (l.joursRestants !== null && l.stock > 0 ? tf(' · environ {j} j de stock', { j: l.joursRestants }) : '') : t('Aucune vente en 30 jours')}</div>
        </div>
      </div>
      {l.alerte && l.conseilReappro > 0 && (
        <div className="note or" style={{ marginTop: '10px' }}>
          <Icone nom="package-open" taille={16} />
          <div>{tf('Conseil : recevoir {n} de plus pour tenir deux semaines.', { n: l.conseilReappro })}</div>
        </div>
      )}
      <div className="aja-actions">
        {peutStock && (
          <button type="button" className="chip" onClick={reappro}>
            <Icone nom="package-open" taille={15} />
            {t('Réapprovisionner')}
          </button>
        )}
        <button type="button" className="chip" onClick={historique}>
          <Icone nom="history" taille={15} />
          {t('Historique')}
        </button>
        {montants && (
          <button type="button" className="chip" onClick={seuil}>
            <Icone nom="bell" taille={15} />
            {t('Seuil')}
          </button>
        )}
      </div>
    </div>
  )
}

function LigneMouvement({ m, maintenant, avecProduit }: { m: Mouvement; maintenant: number; avecProduit: boolean }) {
  const { t, tf, langue } = usePreferences()
  const ty = TYPES[m.type]
  const qui = m.auteur ? tf('par {nom}', { nom: m.auteur }) : m.ref ? tf('commande {ref}', { ref: m.ref }) : t('depuis un autre écran')
  return (
    <div className="aja-mv">
      <span className="ic" style={{ width: '36px', height: '36px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sand-2)', color: 'var(--ink-2)', flexShrink: 0 }}>
        <Icone nom={ty.icone} taille={18} />
      </span>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="t14 b7">{avecProduit ? `${t(ty.nom)} · ${m.titre} ${t(m.variante)}` : t(ty.nom)}</div>
        <div className="t12 c3" style={{ lineHeight: '1.4' }}>
          {`${echeance(m.a, maintenant, langue)} · ${qui} · ${tf('{de} → {a}', { de: m.avant, a: m.apres })}`}
        </div>
        {m.note && <div className="t12 c2 mt4">{m.note}</div>}
      </div>
      <span className={'d ' + (m.delta > 0 ? 'plus' : 'moins')}>{m.delta > 0 ? `+${m.delta}` : `−${-m.delta}`}</span>
    </div>
  )
}

export default function Stock() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const montants = useMontantsVisibles()
  const maintenant = useHorloge()
  const enLigne = useEnLigne()
  const [params, setParams] = useSearchParams()
  const { dire, toast } = useToast()
  const filtre = (['vente', 'rupture', 'faible'].includes(params.get('f') ?? '') ? params.get('f') : 'tous') as Filtre
  const vue = params.get('vue') === 'mouvements' ? 'mouvements' : 'inventaire'
  const enAvant = params.get('p')
  const [q, setQ] = useState('')
  const [typeMv, setTypeMv] = useState<TypeMouvement | 'tous'>('tous')
  const [feuille, setFeuille] = useState<{ type: 'reappro' | 'historique' | 'seuil'; l: LigneStock } | null>(null)
  const inv = useLecture(() => sourceAJA.stock.inventaire(), [s.membre?.role])
  const mvts = useLecture(() => sourceAJA.stock.mouvements(feuille?.type === 'historique' ? feuille.l.offreId : null), [feuille?.type === 'historique' ? feuille.l.offreId : null])
  const regler = (k: string, v: string | null) => {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v)
    else p.delete(k)
    setParams(p, { replace: true })
  }

  const lignes = useMemo(() => {
    const m = nrm(q.trim())
    return (inv.donnees?.lignes ?? []).filter(
      (l) =>
        (filtre === 'tous' || (filtre === 'vente' && l.etat === 'en_vente') || (filtre === 'rupture' && l.alerte === 'rupture') || (filtre === 'faible' && l.alerte === 'sous_seuil')) &&
        (!m || nrm(`${l.titre} ${l.variante} ${t(l.variante)}`).includes(m)),
    )
  }, [inv.donnees, filtre, q, t])

  if (inv.erreur) return <Erreur c={C} erreur={inv.erreur} relire={inv.relire} texteReserve="Le stock est réservé à {nom}, propriétaire." />
  if (!inv.donnees) return <Chargement c={C} />
  const d = inv.donnees
  const cpt = d.compteurs

  const changer = async (l: LigneStock, n: number, type: 'reappro' | 'correction' = 'correction', note: string | null = null) => {
    if (n < 0 || n > 99999) return false
    if (!enLigne) {
      await mettreEnFile('stock', l.titre, { offreId: l.offreId, stock: n })
      jouer('interrupteur')
      dire(tf('Stock {n} gardé : il part au retour du réseau', { n }))
      return true
    }
    const r = await sourceAJA.stock.ajuster(l.offreId, { nouveau: n, type, note })
    if (!r.ok) {
      jouer('erreur')
      dire(t(r.raison === 'note' ? 'La note fait 120 caractères au plus.' : 'Indiquez un stock entre 0 et 99 999.'))
      return false
    }
    jouer('interrupteur')
    dire(type === 'reappro' ? tf('Réception enregistrée : stock {n}', { n }) : tf('Stock enregistré : {n}', { n }))
    return true
  }

  const alertes = d.lignes.filter((l) => l.alerte)
  const tuile = (f: Filtre, icone: string, ton: string, n: number, nom: string, sous: string) => (
    <button type="button" className="aja-tuile" aria-pressed={filtre === f} onClick={() => regler('f', filtre === f || f === 'tous' ? null : f)}>
      <span className={'ic ' + ton}>
        <Icone nom={icone} taille={17} />
      </span>
      <div className="tv">{n}</div>
      <div className="tk">{t(nom)}</div>
      <div className="ts">{sous}</div>
    </button>
  )

  return (
    <EcranAJ route={C.route} titre={C.titre} onglet={C.onglet} fixes={toast}>
      <div className="pg" style={{ paddingTop: '14px' }}>
        <h1 className="pg-t">{t('Mon stock')}</h1>
        <p className="pg-s">
          {tf(cpt.produits > 1 ? '{n} produits · {u} unités' : '{n} produit · {u} unités', { n: cpt.produits, u: cpt.unites })}
          {montants && d.valeur !== null ? tf(' · {v} F au prix de vente', { v: F(d.valeur) }) : ''}
        </p>
      </div>

      <Selecteur
        etiquette="Vue du stock"
        valeur={vue}
        changer={(v) => regler('vue', v === 'inventaire' ? null : v)}
        choix={[
          ['inventaire', 'Inventaire'],
          ['mouvements', 'Mouvements'],
        ]}
      />

      {vue === 'inventaire' ? (
        <>
          <div className="aja-tuiles" role="group" aria-label={t('Filtrer le stock')}>
            {tuile('tous', 'boxes', '', cpt.produits, 'Produits', tf('{n} en vente', { n: cpt.enVente }))}
            {tuile('vente', 'circle-check', 'green', cpt.enVente, 'En vente', t('visibles des clients'))}
            {tuile('rupture', 'package-x', 'red', cpt.ruptures, 'En rupture', t('stock à 0'))}
            {tuile('faible', 'triangle-alert', 'amber', cpt.sousSeuil, 'Stock faible', t('au seuil ou dessous'))}
          </div>

          {alertes.length > 0 && (
            <div className={'aja-alerte' + (cpt.ruptures ? ' red' : '')} role="status">
              <div className="row t14 b8" style={{ gap: '8px' }}>
                <Icone nom="triangle-alert" taille={17} />
                <span>{cpt.ruptures && cpt.sousSeuil ? tf('{r} en rupture, {s} sous le seuil d’alerte', { r: cpt.ruptures, s: cpt.sousSeuil }) : cpt.ruptures ? tf(cpt.ruptures > 1 ? '{n} produits en rupture : plus aucune commande' : '{n} produit en rupture : plus aucune commande', { n: cpt.ruptures }) : tf(cpt.sousSeuil > 1 ? '{n} produits sous le seuil d’alerte' : '{n} produit sous le seuil d’alerte', { n: cpt.sousSeuil })}</span>
              </div>
              <div className="chips">
                {alertes.map((l) => (
                  <button key={l.offreId} type="button" className="chip" onClick={() => regler('p', l.offreId)}>
                    {`${l.titre} ${t(l.variante)} · ${l.stock}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="row" style={{ gap: '8px', marginTop: '14px' }}>
            <div className="inp grow">
              <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
              <input type="search" className="grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Chercher un produit')} aria-label={t('Chercher un produit ou une variante')} style={{ border: 0, background: 'none', outline: 'none', font: 'inherit', fontSize: '16px', color: 'var(--ink)', minWidth: 0, flex: 1, height: '100%' }} />
            </div>
            <button
              type="button"
              className="ibtn"
              aria-label={t('Exporter le stock (CSV)')}
              style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--card)', border: '1px solid var(--line-2)' }}
              onClick={async () => {
                telecharger('stock-belivay.csv', await sourceAJA.stock.exporter())
                dire(t('Fichier du stock téléchargé'))
              }}
            >
              <Icone nom="download" taille={20} />
            </button>
          </div>

          {lignes.length === 0 ? (
            <div className="card" style={{ marginTop: '12px' }}>
              <div className="empty">
                <div className="ei">
                  <Icone nom="package-search" taille={24} />
                </div>
                <h3>{t(d.lignes.length ? 'Aucun produit ici' : 'Pas encore de produit')}</h3>
                <p>{t(d.lignes.length ? 'Changez de filtre ou de recherche.' : 'Ajoutez votre premier produit : son stock se gère ici.')}</p>
              </div>
              {d.lignes.length ? (
                <Bouton classe="secondary" icone="x" onClick={() => (setQ(''), regler('f', null))}>
                  {t('Tout afficher')}
                </Bouton>
              ) : (
                <Bouton classe="primary" icone="plus" vers={chemin('offre1')}>
                  {t('Ajouter un produit')}
                </Bouton>
              )}
            </div>
          ) : (
            <div className="aja-liste deux">
              {lignes.map((l) => (
                <CarteStock
                  key={l.offreId}
                  l={l}
                  enAvant={enAvant === l.offreId}
                  montants={montants}
                  changer={(n) => void changer(l, n)}
                  reappro={() => setFeuille({ type: 'reappro', l })}
                  historique={() => setFeuille({ type: 'historique', l })}
                  seuil={() => setFeuille({ type: 'seuil', l })}
                />
              ))}
            </div>
          )}
          {!montants && <Indice icone="lock">{t('Accès Préparation : vous pouvez changer le stock ; les prix et le seuil d’alerte sont réservés au propriétaire.')}</Indice>}
          <Indice icone="info">{t('Chaque changement est signé de votre nom dans l’historique. Le stock réservé par une commande payée est déjà retiré.')}</Indice>
        </>
      ) : (
        <Mouvements typeMv={typeMv} setTypeMv={setTypeMv} maintenant={maintenant} />
      )}

      <FeuilleReappro f={feuille?.type === 'reappro' ? feuille.l : null} fermer={() => setFeuille(null)} enregistrer={async (l, n, note) => (await changer(l, l.stock + n, 'reappro', note)) && (setFeuille(null), true)} />
      <FeuilleSeuil
        f={feuille?.type === 'seuil' ? feuille.l : null}
        fermer={() => setFeuille(null)}
        enregistrer={async (l, n) => {
          const r = await sourceAJA.stock.regler(l.offreId, n)
          if (!r.ok) return false
          jouer('interrupteur')
          dire(tf('Seuil d’alerte réglé à {n}', { n }))
          setFeuille(null)
          return true
        }}
      />
      <Feuille ouverte={feuille?.type === 'historique'} fermer={() => setFeuille(null)} titre={t('Historique du stock')}>
        {feuille?.type === 'historique' && (
          <>
            <h2 className="pg-t" style={{ fontSize: '19px' }}>
              {t('Historique du stock')}
            </h2>
            <p className="pg-s">{`${feuille.l.titre} · ${t(feuille.l.variante)} · ${tf('stock {n}', { n: feuille.l.stock })}`}</p>
            <div className="card tight" style={{ marginTop: '12px' }}>
              {(mvts.donnees ?? []).length ? (mvts.donnees ?? []).map((m) => <LigneMouvement key={m.id} m={m} maintenant={maintenant} avecProduit={false} />) : <div className="t13 c3" style={{ padding: '12px 0' }}>{t('Aucun mouvement')}</div>}
            </div>
            <div className="mt12">
              <Bouton classe="secondary" icone="x" onClick={() => setFeuille(null)}>
                {t('Fermer')}
              </Bouton>
            </div>
          </>
        )}
      </Feuille>
    </EcranAJ>
  )
}

function Mouvements({ typeMv, setTypeMv, maintenant }: { typeMv: TypeMouvement | 'tous'; setTypeMv: (t: TypeMouvement | 'tous') => void; maintenant: number }) {
  const { t } = usePreferences()
  const l = useLecture(() => sourceAJA.stock.mouvements(null), [])
  const tous = l.donnees ?? []
  const visibles = tous.filter((m) => typeMv === 'tous' || m.type === typeMv)
  const presents = (Object.keys(TYPES) as TypeMouvement[]).filter((ty) => tous.some((m) => m.type === ty))
  return (
    <>
      <div className="chips scroll" role="tablist" aria-label={t('Filtrer les mouvements')}>
        {(['tous', ...presents] as const).map((ty) => (
          <button key={ty} type="button" role="tab" aria-selected={typeMv === ty} className={'chip' + (typeMv === ty ? ' on' : '')} onClick={() => setTypeMv(ty)}>
            {t(ty === 'tous' ? 'Tous' : TYPES[ty].nom)}
            <span className="n">{String(ty === 'tous' ? tous.length : tous.filter((m) => m.type === ty).length)}</span>
          </button>
        ))}
      </div>
      <div className="card tight" style={{ marginTop: '12px' }}>
        {!l.donnees ? (
          <div className="t13 c3" style={{ padding: '14px 0' }} aria-busy="true">
            {t('Chargement…')}
          </div>
        ) : visibles.length ? (
          visibles.map((m) => <LigneMouvement key={m.id} m={m} maintenant={maintenant} avecProduit />)
        ) : (
          <div className="t13 c3" style={{ padding: '14px 0' }}>
            {t('Aucun mouvement')}
          </div>
        )}
      </div>
      <Indice icone="history">{t('Ventes et retours viennent des commandes ; réceptions et corrections, de vos gestes, avec leur auteur.')}</Indice>
    </>
  )
}

function FeuilleReappro({ f, fermer, enregistrer }: { f: LigneStock | null; fermer: () => void; enregistrer: (l: LigneStock, n: number, note: string | null) => Promise<boolean | void> }) {
  const { t, tf } = usePreferences()
  const [v, setV] = useState('')
  const [note, setNote] = useState('')
  const [pour, setPour] = useState<string | null>(null)
  if (f && pour !== f.offreId) {
    setPour(f.offreId)
    setV(f.conseilReappro ? String(f.conseilReappro) : '')
    setNote('')
  }
  const n = Number(v)
  const valide = /^\d{1,5}$/.test(v) && n > 0 && (f?.stock ?? 0) + n <= 99999
  return (
    <Feuille ouverte={!!f} fermer={fermer} titre={t('Réapprovisionner')}>
      {f && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (valide) void enregistrer(f, n, note)
          }}
        >
          <h2 className="pg-t" style={{ fontSize: '19px' }}>
            {t('Réapprovisionner')}
          </h2>
          <p className="pg-s">{`${f.titre} · ${t(f.variante)} · ${tf('stock {n}', { n: f.stock })}`}</p>
          <div className="fld">
            <label htmlFor="aja-recu">{t('Quantité reçue')}</label>
            <div className="inp">
              <input id="aja-recu" inputMode="numeric" pattern="[0-9]*" value={v} placeholder={t('Ex. : 10')} onChange={(e) => setV(e.target.value.replace(/\D/g, '').slice(0, 5))} style={{ border: 0, background: 'none', outline: 'none', font: 'inherit', fontSize: '18px', fontWeight: 800, color: 'var(--ink)', flex: 1, minWidth: 0 }} />
            </div>
          </div>
          <div className="split3 mt12">
            {[5, 10, 20].map((x) => (
              <button key={x} type="button" className="chip" style={{ justifyContent: 'center' }} onClick={() => setV(String((valide ? n : 0) + x))}>
                {`+${x}`}
              </button>
            ))}
          </div>
          <div className="hint">{valide ? tf('Nouveau stock : {n}', { n: f.stock + n }) : f.conseilReappro ? tf('Conseil : {n}, pour tenir deux semaines au rythme des ventes.', { n: f.conseilReappro }) : t('Indiquez ce que vous avez reçu.')}</div>
          <div className="fld">
            <label htmlFor="aja-note">{t('Note (facultatif)')}</label>
            <div className="inp">
              <input id="aja-note" value={note} maxLength={120} placeholder={t('Ex. : carton du grossiste')} onChange={(e) => setNote(e.target.value)} style={{ border: 0, background: 'none', outline: 'none', font: 'inherit', fontSize: '16px', color: 'var(--ink)', flex: 1, minWidth: 0 }} />
            </div>
          </div>
          <div className="mt14">
            <Bouton classe="primary" icone="package-open" type="submit" inactif={!valide}>
              {t('Enregistrer la réception')}
            </Bouton>
          </div>
        </form>
      )}
    </Feuille>
  )
}

function FeuilleSeuil({ f, fermer, enregistrer }: { f: LigneStock | null; fermer: () => void; enregistrer: (l: LigneStock, n: number) => Promise<boolean> }) {
  const { t, tf } = usePreferences()
  const [v, setV] = useState('')
  const [err, setErr] = useState(false)
  const [pour, setPour] = useState<string | null>(null)
  if (f && pour !== f.offreId) {
    setPour(f.offreId)
    setV(String(f.seuil))
    setErr(false)
  }
  const valide = /^\d{1,4}$/.test(v)
  return (
    <Feuille ouverte={!!f} fermer={fermer} titre={t('Seuil d’alerte')}>
      {f && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!valide) return setErr(true)
            void enregistrer(f, Number(v)).then((ok) => !ok && setErr(true))
          }}
        >
          <h2 className="pg-t" style={{ fontSize: '19px' }}>
            {t('Seuil d’alerte')}
          </h2>
          <p className="pg-s">{`${f.titre} · ${t(f.variante)}`}</p>
          <div className="fld">
            <label htmlFor="aja-seuil">{t('Prévenez-moi quand le stock descend à')}</label>
            <div className={'inp' + (err ? ' err' : '')}>
              <input id="aja-seuil" inputMode="numeric" pattern="[0-9]*" value={v} onChange={(e) => (setV(e.target.value.replace(/\D/g, '').slice(0, 4)), setErr(false))} style={{ border: 0, background: 'none', outline: 'none', font: 'inherit', fontSize: '18px', fontWeight: 800, color: 'var(--ink)', flex: 1, minWidth: 0 }} />
            </div>
          </div>
          <div className={'hint' + (err ? ' cr' : '')}>{err ? t('Indiquez un seuil entre 0 et 9 999.') : tf('Une notification quand le stock descend à {n}, une fois par passage.', { n: valide ? Number(v) : f.seuil })}</div>
          <div className="mt14">
            <Bouton classe="primary" icone="check" type="submit" inactif={!valide}>
              {t('Enregistrer le seuil')}
            </Bouton>
          </div>
        </form>
      )}
    </Feuille>
  )
}
