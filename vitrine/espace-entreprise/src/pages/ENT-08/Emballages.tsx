// ENT-P21 · Emballages, repris sur le prototype (route('emballages')) : tête datée, bandeaux (seuil, écart du mois),
// onglets Stock / Remises aux livreurs / Commandes ; Stock = cartes par format (anneau du reste attendu), écart de
// l'inventaire, consommation et contrôle, étiquettes et ruban, point de stockage et kit conseillé, dernier bon de
// remise, interdit. Domaine src/donnees/domaines/emballages.ts ; règles src/calculs/ent08.ts : reste attendu = remis −
// étiquettes consommées − abîmés déclarés ; vert au-dessus du seuil de réassort, ambre au seuil (bandeau et commande
// proposée ; « Commander » actif seulement au seuil). Remises avec leur plage d'étiquettes, en attente jusqu'à la
// confirmation dans l'application livreur ; plages perdues invalidées ; écarts justifiés (au-delà du seuil mensuel :
// facturés au coût d'achat sur le versement, jamais au livreur). Gestes : propriétaire et répartiteur ; le comptable lit.
// Enrichi (M8, M9, M16) : commande, remise et justification gardées hors connexion (geste) ; commande envoyée après 5 s
// sauf « Annuler » ; plafond par commande (ENT-EMB-COMMANDE-MAX) écrit dans la feuille ; seuil bas signalé par un son
// une fois par format et par visite ; actions fréquentes dans la zone du pouce au téléphone.
import { useEffect, useState, type ReactNode } from 'react'
import { sonner } from '../../composants/marque-sonore'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { CommandeEmballage, EtatEmballages, PlageEtiquettes, RefusEmballage, RemiseEmballage, StockEmballage } from '../../donnees/domaines/emballages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { FORMATS, OUTILS, auSeuil, resteAttendu, type FormatEmballage } from '../../calculs/ent08'
import { PARAMETRES } from '../../calculs/registre'
import { geste, useFile } from '../../donnees/fileHorsLigne'
import { usePreferences } from '../../preferences'
import { useHorloge, usePeut } from '../../session'
import { Anneau as AnneauCommun, Banniere, BarrePouce, Choix, type Colonne, Hint, Kv, Li, Limite, Note, Panel, Px, Qui, St, Table, Tete, useAnnuler, useLarge, Vide } from '../../composants/prototype'
import { Chargement, ErreurLecture, useAnnonce, useDates, useOnglet } from '../ENT-07/commun'
import './ent08.css'
import { Ecran } from '../../composants/coque'

const ONGLETS = ['stock', 'remises', 'commandes'] as const
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
// Formats des emballages (registre de l'entreprise, règle des formats ENT-EMB : S, M, L pochettes ; C1, C2 cartons).
const DIM: Record<FormatEmballage, string> = { S: 'pochette 20 × 30 cm', M: 'pochette 25 × 35 cm', L: 'pochette 35 × 45 cm', C1: 'carton 30 × 20 × 15 cm', C2: 'carton 40 × 30 × 25 cm' }
const pct = (s: StockEmballage) => (s.remis ? Math.round((100 * resteAttendu(s)) / s.remis) : 0)
const taille = (p: { du: number; au: number }) => p.au - p.du + 1
/** Plafond d'une commande : x fois le stock avancé du format (registre ENT-EMB-COMMANDE-MAX). */
const plafond = (s: StockEmballage) => s.remis * PARAMETRES.saisies.emballageCommandeMax
type Differer = (cle: string, texte: string, faire: () => Promise<void> | void) => void
type EnAttente = { format: FormatEmballage; n: number; livraison: CommandeEmballage['livraison']; file: boolean }
const kitTexte = (items: { format: FormatEmballage; n: number }[]) => items.map((i) => `${i.n} ${i.format}`).join(' · ')
const Id = ({ children }: { children: ReactNode }) => <span className="mono no-tr">{children}</span>

/** C.ring du prototype : l'anneau commun (texte lisible à toute taille), sa valeur au centre. */
const Anneau = ({ pct: p, ton, taille = 62 }: { pct: number; ton: 'acc' | 'amber'; taille?: number }) => <AnneauCommun v={p} couleur={ton === 'amber' ? 'var(--amber)' : 'var(--acc)'} taille={taille} libelle={`${p}%`} />

export default function Emballages() {
  const { t, tf } = usePreferences()
  const large = useLarge()
  const lecture = useLecture(() => source.emballages.etat(), [])
  const [onglet] = useOnglet(ONGLETS, 'stock')
  const remise = useFeuille('remise')
  const commande = useFeuille('commande')
  const ecart = useFeuille('ecart')
  const plages = useFeuille('plages')
  const peut = usePeut(['proprietaire', 'repartiteur'])
  const { annoncer, vue } = useAnnonce()
  const annuler = useAnnuler()
  const refus = useRefus()
  const file = useFile()
  const [details, setDetails] = useState<Record<string, EnAttente>>({})
  const e = lecture.donnees
  const aSeuil = e?.stock.filter((s) => auSeuil(s)) ?? []
  // Commandes montrées faites (5 s pour annuler) et commandes gardées hors connexion.
  const enAttente: EnAttente[] = [
    ...Object.entries(details)
      .filter(([cle]) => annuler.enCours.has(cle))
      .map(([, x]) => x),
    ...file.gestes.flatMap((g) => g.appels.filter((a) => a.domaine === 'emballages' && a.methode === 'commander').map((a) => ({ ...(a.args[0] as Omit<EnAttente, 'file'>), file: true }))),
  ]
  const differer: Differer = (cle, texte, faire) => annuler.differer(cle, texte, faire)
  const commander = (x: Omit<EnAttente, 'file'>) => {
    const cle = `cmd-${x.format}-${Date.now()}`
    setDetails((d) => ({ ...d, [cle]: { ...x, file: false } }))
    differer(cle, tf('Commande de {n} {f} : envoi dans 5 s.', { n: x.n, f: x.format }), async () => {
      const r = await geste('Commander des emballages', (s) => s.emballages.commander(x), `${x.n} ${x.format}`)
      if (r.etat === 'en_file') annoncer(true, t('Hors connexion : commande gardée, envoyée au retour du réseau.'))
      else annoncer(r.r.ok, r.r.ok ? t('Commande envoyée à BelivaY.') : refus(r.r.raison))
    })
  }
  // Seuil bas : un son une fois par format et par visite (M9), en plus du bandeau.
  const formatsBas = aSeuil.map((s) => s.format).join(',')
  useEffect(() => {
    if (!formatsBas) return
    let deja: string[] = []
    try {
      deja = JSON.parse(sessionStorage.getItem('blv_e_seuil_signale') ?? '[]') as string[]
    } catch {
      /* rien */
    }
    const nouveaux = formatsBas.split(',').filter((f) => !deja.includes(f))
    if (!nouveaux.length) return
    sonner('incident')
    try {
      sessionStorage.setItem('blv_e_seuil_signale', JSON.stringify([...deja, ...nouveaux]))
    } catch {
      /* rien */
    }
  }, [formatsBas])
  const acts = peut ? (
    <>
      <button type="button" className={'btn sm ' + (aSeuil.length ? 'secondary' : 'primary')} onClick={remise.ouvrir}>
        <Icone nom="hand-helping" taille={16} />
        <span>{t('Enregistrer une remise')}</span>
      </button>
      <button type="button" className={'btn sm ' + (aSeuil.length ? 'primary' : 'secondary')} onClick={commande.ouvrir} disabled={!aSeuil.length} title={aSeuil.length ? undefined : t('Actif seulement au seuil de réassort')}>
        <Icone nom="shopping-bag" taille={16} />
        <span>{t('Commander')}</span>
      </button>
    </>
  ) : undefined
  return (
    <Ecran route="emballages" actions={large ? acts : undefined}>
      <Px>
        <Tete route="emballages" titre={t('Emballages')} />
        <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />
        {aSeuil.length > 0 && (
          <Banniere
            ton="amber"
            icone="package-minus"
            className="ec-bn"
            role="status"
            bouton={
              peut ? (
                <button type="button" className="btn primary sm" onClick={commande.ouvrir}>
                  <Icone nom="shopping-bag" taille={16} />
                  {t('Commander')}
                </button>
              ) : undefined
            }
          >
            <b>{tf('Seuil de {p} % atteint : {f}.', { p: OUTILS.reassortPct, f: aSeuil.map((s) => s.format).join(', ') })}</b>{' '}
            {aSeuil.map((s) => tf('{f} : {r} restants sur les {a} avancés ({q} %).', { f: s.format, r: resteAttendu(s), a: s.remis, q: pct(s) })).join(' ')}{' '}
            {t('Commandez maintenant : retrait au local BelivaY ou livraison avec une course de retour.')}
          </Banniere>
        )}
        {e && e.ecartMoisPct > OUTILS.ecartPct && (
          <Banniere
            ton="amber"
            icone="scale"
            className="ec-bn"
            role="status"
            bouton={
              peut ? (
                <button type="button" className="btn primary sm" onClick={ecart.ouvrir}>
                  <Icone nom="file-pen-line" taille={16} />
                  {t('Justifier')}
                </button>
              ) : undefined
            }
          >
            <b>{tf('Écart non justifié du mois : {p} % (seuil {s} %).', { p: e.ecartMoisPct, s: OUTILS.ecartPct })}</b> {t('Au-delà, l’écart est facturé au coût d’achat et retenu sur votre versement, jamais au livreur.')}
          </Banniere>
        )}
        {vue}
        {annuler.vue}
        {!e ? (
          !lecture.erreur && <Chargement />
        ) : (
          <>
            <Choix
              forme="tabs"
              aria={t('Emballages')}
              actif={onglet}
              items={[
                { id: 'stock', t: t('Stock'), icone: large ? 'package-open' : undefined, to: chemin('emballages') },
                { id: 'remises', t: t('Remises aux livreurs'), n: large ? e.remises.length || null : null, icone: large ? 'hand-helping' : undefined, to: chemin('emballages', { onglet: 'remises' }) },
                { id: 'commandes', t: t('Commandes'), n: large ? e.commandes.length + aSeuil.length || null : null, icone: large ? 'truck' : undefined, to: chemin('emballages', { onglet: 'commandes' }) },
              ]}
            />
            <div style={{ marginTop: 16 }}>
              {onglet === 'stock' && <OngletStock e={e} aSeuil={aSeuil} peut={peut} ouvrirEcart={ecart.ouvrir} ouvrirPlages={plages.ouvrir} enAttente={enAttente} />}
              {onglet === 'remises' && <OngletRemises e={e} peut={peut} ouvrirRemise={remise.ouvrir} />}
              {onglet === 'commandes' && <OngletCommandes e={e} aSeuil={aSeuil} peut={peut} ouvrirCommande={commande.ouvrir} enAttente={enAttente} />}
            </div>
          </>
        )}
        {peut && <BarrePouce>{acts}</BarrePouce>}
      </Px>
      {e && peut && (
        <>
          <FeuilleRemise ouverte={remise.ouverte} fermer={remise.fermer} stock={e.stock} plageLibre={e.plages.find((p) => p.statut === 'au_stockage') ?? null} annoncer={annoncer} />
          <FeuilleCommande ouverte={commande.ouverte} fermer={commande.fermer} formats={aSeuil} commander={commander} />
          <FeuilleEcart ouverte={ecart.ouverte} fermer={ecart.fermer} annoncer={annoncer} />
          <FeuillePlages ouverte={plages.ouverte} fermer={plages.fermer} plages={e.plages} annoncer={annoncer} />
        </>
      )}
    </Ecran>
  )
}

/** Carte d'un format (kpi ec8-fmt du prototype). */
function CarteFormat({ s }: { s: StockEmballage }) {
  const { t } = usePreferences()
  const bas = auSeuil(s)
  const reste = resteAttendu(s)
  return (
    <div className={'kpi ec8-fmt' + (bas ? ' low' : '')} data-format={s.format}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 6 }}>
        <span className="ec8-f">{s.format}</span>
        {bas ? <St t={t('Au seuil')} ton="amber" /> : <St t={t('Suffisant')} ton="green" />}
      </div>
      <div className="t12 c3 mt6">{t(DIM[s.format])}</div>
      <div className="row mt10" style={{ gap: 10 }}>
        <Anneau pct={pct(s)} ton={bas ? 'amber' : 'acc'} />
        <div>
          <div className="b8 t19 num">
            {reste}
            <span className="c3 t13"> / {s.remis}</span>
          </div>
          <div className="t12 c3">{t('restants sur le stock avancé')}</div>
        </div>
      </div>
      <div className="t12 c3 mt10">
        <b className="c2">{s.auStockage}</b> {t('au point de stockage')} · <b className="c2">{s.enKits}</b> {t('dans les kits')} · <b className="c2">{s.consommes}</b> {t('consommés')}
        {s.declaresAbimes > 0 && (
          <>
            {' '}
            · <b className="c2">{s.declaresAbimes}</b> {t('abîmés déclarés')}
          </>
        )}
      </div>
    </div>
  )
}

/** Panneau « Point de stockage et kit conseillé » (stock et remises). */
function PointStockage({ e }: { e: EtatEmballages }) {
  const { t } = usePreferences()
  const kit = OUTILS.kit.filter((k) => !k.auStockage)
  const reserve = OUTILS.kit.filter((k) => k.auStockage)
  return (
    <Panel titre={t('Point de stockage et kit conseillé')} icone="warehouse">
      <Li icone="warehouse" ton="acc" t={e.pointStockage} s={t('stockage surélevé et au sec · déclaré dans les paramètres')} to={chemin('parametres') + '#stockage'} />
      <Kv k={t('Kit journalier conseillé (moto)')} v={kitTexte(kit)} />
      {reserve.length > 0 && <Kv k={reserve.map((k) => k.format).join(', ')} v={t('reste au point de stockage, pris quand le paquet l’exige')} />}
      <Note ton="ink" icone="shield-check">
        {t('BelivaY reste propriétaire des emballages jusqu’à leur consommation ; ils ne servent qu’aux missions BelivaY.')}
      </Note>
    </Panel>
  )
}

function OngletStock({ e, aSeuil, peut, ouvrirEcart, ouvrirPlages, enAttente }: { e: EtatEmballages; aSeuil: StockEmballage[]; peut: boolean; ouvrirEcart: () => void; ouvrirPlages: () => void; enAttente: EnAttente[] }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  const large = useLarge()
  const remises = e.plages.filter((p) => p.statut === 'remise')
  const auStockage = e.plages.filter((p) => p.statut === 'au_stockage')
  const perdues = e.plages.filter((p) => p.statut === 'perdue')
  const nRemises = remises.reduce((a, p) => a + taille(p), 0)
  const liees = e.plages.reduce((a, p) => a + p.liees, 0)
  const liesRemises = remises.reduce((a, p) => a + p.liees, 0)
  const total = e.plages.reduce((a, p) => a + taille(p), 0)
  const du = e.plages.length ? Math.min(...e.plages.map((p) => p.du)) : null
  const au = e.plages.length ? Math.max(...e.plages.map((p) => p.au)) : null
  const nStockage = auStockage.reduce((a, p) => a + taille(p), 0)
  const jour = t(JOURS[OUTILS.jourInventaire])
  const consommees = e.plages.filter((p) => p.livreur)
  const colsConso: Colonne<PlageEtiquettes>[] = [
    {
      k: 'e',
      t: t('Étiquettes'),
      main: true,
      rendu: (p) => (
        <>
          <Id>
            BV 24 {p.du} → {p.au}
          </Id>
          <div className="t2">{tf('{n} étiquettes', { n: taille(p) })}</div>
        </>
      ),
    },
    { k: 'l', t: t('Livreur'), rendu: (p) => p.livreur?.nom ?? '—' },
    { k: 'u', t: t('Liées'), cls: 'r', rendu: (p) => <b className="num">{p.liees}</b> },
    { k: 's', t: t('État'), rendu: (p) => (p.statut === 'perdue' ? <St t={t('Perdue')} ton="red" /> : <St t={t('Chez le livreur')} ton="green" />) },
  ]
  return (
    <>
      <div className={'g ' + (large ? 'g5' : 'ec8-fm')}>
        {e.stock.map((s) => (
          <CarteFormat key={s.format} s={s} />
        ))}
      </div>
      {e.ecarts.length > 0 && (
        <Panel titre={tf('Écart de la semaine · inventaire du {j}', { j: jour })} icone="scale" style={{ marginTop: 16 }}>
          <div className="ec-tb">
            <Table
              cols={[
                {
                  k: 'f',
                  t: t('Format'),
                  main: true,
                  rendu: (x) => (
                    <>
                      <b>{x.format}</b>
                      {x.motif && <div className="t2">{t(x.motif)}</div>}
                    </>
                  ),
                },
                { k: 'd', t: t('Doit rester'), cls: 'r', rendu: (x) => x.attendu },
                { k: 'n', t: t('Compté'), cls: 'r', rendu: (x) => x.compte },
                { k: 'e', t: t('Écart'), cls: 'r', rendu: (x) => (x.compte - x.attendu ? <b className="ca">{x.compte - x.attendu}</b> : '0') },
                { k: 'j', t: t('Justifié'), cls: 'r', rendu: (x) => x.justifie },
              ]}
              rows={e.ecarts}
              cle={(x) => x.format + x.attendu + x.compte + (x.motif ?? '')}
              ligneCls={(x) => (x.attendu - x.compte > x.justifie ? 'warn' : undefined)}
              legende={t('Écart de la semaine')}
              pied={
                <>
                  <span>{t('Emballages avancés − étiquettes consommées − abîmés déclarés = ce qui doit rester')}</span>
                  <span>{t('Calcul automatique chaque semaine')}</span>
                </>
              }
            />
          </div>
          <div className="mt10">
            <Kv k={t('Non justifié ce mois')} v={tf('{p} % du stock avancé', { p: e.ecartMoisPct })} />
            <Kv k={tf('Au-delà de {p} % sur un mois', { p: OUTILS.ecartPct })} v={t('facturé au coût d’achat, retenu sur le versement, jamais au livreur')} />
            <Kv k={t('Stockage conforme')} v={t('surélevé et au sec : un emballage abîmé déclaré avec sa photo n’est pas facturé')} />
          </div>
          {peut && (
            <div className="row mt10" style={{ gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="btn secondary sm" onClick={ouvrirEcart}>
                <Icone nom="file-pen-line" taille={16} />
                {t('Justifier un écart')}
              </button>
            </div>
          )}
        </Panel>
      )}
      <div className="g g21">
        <Panel titre={t('Consommation · le stock baisse à chaque étiquette liée')} icone="chart-column">
          <div className="ec-tb">
            <Table cols={colsConso} rows={consommees} cle={(p) => p.id} legende={t('Consommation des étiquettes')} vide={<Vide icone="tag" t={t('Aucune étiquette remise')} s={t('Les plages remises aux livreurs et leurs étiquettes liées apparaîtront ici.')} />} />
          </div>
          {auStockage.length > 0 && <Hint icone="clock">{tf('Libres au point de stockage : {p}.', { p: auStockage.map((p) => `BV 24 ${p.du} → ${p.au}`).join(', ') })}</Hint>}
          <div className="ec7-grp" style={{ marginTop: 16 }}>
            {t('Contrôle : avancé − consommé − abîmé = ce qui doit rester')}
          </div>
          {e.stock.map((s) => (
            <Kv
              key={s.format}
              k={tf('Format {f}', { f: s.format })}
              v={
                <>
                  {s.declaresAbimes > 0
                    ? tf('avancés {a} − consommés {c} − abîmés {b} =', { a: s.remis, c: s.consommes, b: s.declaresAbimes })
                    : tf('avancés {a} − consommés {c} =', { a: s.remis, c: s.consommes })}{' '}
                  <b>{tf('{n} doivent rester', { n: resteAttendu(s) })}</b>
                </>
              }
            />
          ))}
          <Kv
            k={t('Étiquettes')}
            v={
              <>
                {tf('remises {r} − liées {l} =', { r: nRemises, l: liesRemises })} <b>{tf('{n} chez les livreurs', { n: nRemises - liesRemises })}</b>
              </>
            }
          />
          <Hint icone="scale">{tf('L’écart éventuel est calculé chaque semaine, à l’inventaire du {j}.', { j: jour })}</Hint>
          {peut && e.ecarts.length === 0 && (
            <button type="button" className="btn secondary sm mt10" onClick={ouvrirEcart}>
              <Icone nom="file-pen-line" taille={16} />
              {t('Justifier un écart')}
            </button>
          )}
        </Panel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <Panel titre={t('Étiquettes et ruban')} icone="tag">
            {du !== null && au !== null && (
              <Kv
                k={t('Rouleau avancé')}
                v={
                  <>
                    <Id>
                      BV 24 {du} → BV 24 {au}
                    </Id>{' '}
                    · {tf('{n} étiquettes', { n: total })}
                  </>
                }
              />
            )}
            <Kv k={t('Remises aux livreurs')} v={tf('{n} étiquettes en {p} plages', { n: nRemises, p: remises.length })} />
            <Kv k={t('Liées à une commande')} v={String(liees)} />
            <Kv
              k={t('Au point de stockage')}
              v={
                <>
                  {nStockage}
                  {auStockage.map((p) => (
                    <span key={p.id}>
                      {' · '}
                      <Id>
                        BV 24 {p.du} → {p.au}
                      </Id>
                    </span>
                  ))}
                </>
              }
            />
            {perdues.length > 0 && <Kv k={t('Plages perdues')} v={tf('{n} étiquettes invalidées', { n: perdues.reduce((a, p) => a + taille(p), 0) })} />}
            {peut && (
              <div className="row mt10" style={{ gap: 10, flexWrap: 'wrap' }}>
                <button type="button" className="btn secondary sm" onClick={ouvrirPlages}>
                  <Icone nom="tag" taille={16} />
                  {t('Déclarer une plage perdue')}
                </button>
                <span className="lock">
                  <Icone nom="info" taille={14} /> {t('une plage déclarée perdue est invalidée aussitôt')}
                </span>
              </div>
            )}
          </Panel>
          <PointStockage e={e} />
        </div>
      </div>
      <Panel titre={t('Dernier bon de remise')} icone="truck" style={{ marginTop: 16 }}>
        {e.dernierBon ? (
          <Li icone="file-signature" ton="acc" t={tf('Stock avancé par BelivaY {q}', { q: d.quand(e.dernierBon.le, maintenant) })} s={tf('{k} · signé dans le portail par {p}', { k: kitTexte(e.dernierBon.items), p: e.dernierBon.par })} droite={<St t={t('Signé')} ton="green" />} />
        ) : (
          <Vide icone="file-signature" t={t('Aucun bon de remise')} s={t('Le stock avancé par BelivaY arrive avec un bon de remise signé dans le portail.')} />
        )}
        <CommandesProposees aSeuil={aSeuil} commandes={e.commandes} enAttente={enAttente} />
      </Panel>
      <Note ton="red" icone="ban">
        <b>{t('Interdit')}</b> : {t('utiliser les emballages BelivaY pour un autre client ; revendre des emballages. Un emballage ne sert qu’à une mission BelivaY.')}
      </Note>
    </>
  )
}

/** Commandes en cours et commandes proposées au seuil (lignes « truck » du prototype). */
function CommandesProposees({ aSeuil, commandes, enAttente }: { aSeuil: StockEmballage[]; commandes: CommandeEmballage[]; enAttente: EnAttente[] }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  const enCours = commandes.filter((c) => c.statut !== 'recue')
  const proposees = aSeuil.filter((s) => !enCours.some((c) => c.format === s.format) && !enAttente.some((c) => c.format === s.format))
  return (
    <>
      {enAttente.map((c, i) => (
        <Li
          key={'att' + i}
          icone={c.file ? 'cloud-upload' : 'send'}
          ton="or"
          t={tf('Commande de {n} {f}', { n: c.n, f: c.format })}
          s={c.file ? t('Gardée sur cet appareil : envoyée au retour du réseau') : t('Envoi dans quelques secondes : « Annuler » est encore possible')}
          droite={<St t={t(c.file ? 'Hors connexion' : 'En attente')} ton="amber" />}
        />
      ))}
      {enCours.map((c) => (
        <Li
          key={c.id}
          icone="truck"
          ton="or"
          t={tf('Commande de {n} {f}', { n: c.n, f: c.format })}
          s={`${d.quand(c.le, maintenant)} · ${t(c.livraison === 'retrait' ? 'Retrait au local BelivaY' : 'Livraison par une course de retour')}`}
          droite={<St t={t(c.statut === 'envoyee' ? 'Envoyée' : 'En préparation')} ton="amber" />}
        />
      ))}
      {proposees.map((s) => (
        <Li
          key={s.format}
          icone="truck"
          ton="or"
          t={tf('Commande proposée au seuil : {n} {f}', { n: Math.max(0, s.remis - resteAttendu(s)), f: s.format })}
          s={tf('pour revenir au stock avancé de {a} · retrait au local BelivaY ou course de retour', { a: s.remis })}
          droite={<St t={t('À envoyer')} ton="amber" />}
        />
      ))}
    </>
  )
}

function OngletRemises({ e, peut, ouvrirRemise }: { e: EtatEmballages; peut: boolean; ouvrirRemise: () => void }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  const lieesDe = (r: RemiseEmballage) => (r.plage ? (e.plages.find((p) => p.du === r.plage!.du && p.au === r.plage!.au)?.liees ?? 0) : null)
  const cols: Colonne<RemiseEmballage>[] = [
    { k: 'w', t: t('Livreur'), main: true, rendu: (r) => <Qui nom={r.livreur.nom} sous={t('Livreur partenaire')} /> },
    { k: 'h', t: t('Heure'), rendu: (r) => d.quand(r.le, maintenant) },
    { k: 'k', t: t('Remis'), rendu: (r) => kitTexte(r.items) },
    {
      k: 'p',
      t: t('Plage d’étiquettes'),
      rendu: (r) =>
        r.plage ? (
          <>
            <Id>
              BV 24 {r.plage.du} → {r.plage.au}
            </Id>
            <div className="t2">{tf('{n} étiquettes', { n: taille(r.plage) })}</div>
          </>
        ) : (
          <span className="c3">{t('plage inchangée')}</span>
        ),
    },
    { k: 'c', t: t('Confirmation du livreur'), rendu: (r) => <span data-remise={r.id}>{r.statut === 'confirmee' ? <St t={t('Confirmée par le livreur')} ton="green" /> : <St t={t('En attente du livreur')} ton="amber" />}</span> },
    {
      k: 'u',
      t: t('Étiquettes liées'),
      cls: 'r',
      rendu: (r) => {
        const n = lieesDe(r)
        return n === null ? '—' : n ? <b>{n}</b> : '0'
      },
    },
  ]
  const totaux = FORMATS.map((f) => ({ format: f, n: e.remises.reduce((a, r) => a + (r.items.find((i) => i.format === f)?.n ?? 0), 0) })).filter((x) => x.n > 0)
  const etiquettes = e.remises.reduce((a, r) => a + (r.plage ? taille(r.plage) : 0), 0)
  const plagesRemises = e.plages.filter((p) => p.statut === 'remise')
  const remisesN = plagesRemises.reduce((a, p) => a + taille(p), 0)
  const lieesN = plagesRemises.reduce((a, p) => a + p.liees, 0)
  return (
    <>
      <div className="ec-tb">
        <Table
          cols={cols}
          rows={e.remises}
          cle={(r) => r.id}
          legende={t('Remises aux livreurs')}
          vide={<Vide icone="hand-helping" t={t('Aucune remise')} s={t('Enregistrez chaque kit remis à un livreur avec sa plage d’étiquettes.')} />}
          outils={
            <>
              <span className="b8 t14">{t('Remises aux livreurs')}</span>
              <span className="sp"></span>
              {peut && (
                <button type="button" className="btn primary sm" onClick={ouvrirRemise}>
                  <Icone nom="plus" taille={16} />
                  {t('Enregistrer une remise')}
                </button>
              )}
            </>
          }
          pied={
            e.remises.length ? (
              <>
                <span>{tf('Total remis : {k} · {n} étiquettes', { k: kitTexte(totaux), n: etiquettes })}</span>
                <span>{tf('{n} en attente du livreur', { n: e.remises.filter((r) => r.statut === 'en_attente').length })}</span>
              </>
            ) : undefined
          }
        />
      </div>
      <div className="g g2">
        <Panel titre={t('Contrôle des kits')} icone="scale">
          {e.stock.map((s) => (
            <Kv key={s.format} k={tf('Format {f}', { f: s.format })} v={<b>{tf('{n} dans les kits', { n: s.enKits })}</b>} />
          ))}
          <Kv
            k={t('Étiquettes')}
            v={
              <>
                {tf('remises {r} − liées {l} =', { r: remisesN, l: lieesN })} <b>{tf('{n} chez les livreurs', { n: remisesN - lieesN })}</b>
              </>
            }
          />
          <Hint icone="smartphone">{t('Chaque remise porte sa plage d’étiquettes et n’est comptée qu’après la confirmation du livreur dans son application.')}</Hint>
        </Panel>
        <PointStockage e={e} />
      </div>
    </>
  )
}

function OngletCommandes({ e, aSeuil, peut, ouvrirCommande, enAttente }: { e: EtatEmballages; aSeuil: StockEmballage[]; peut: boolean; ouvrirCommande: () => void; enAttente: EnAttente[] }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  return (
    <Panel
      titre={t('Commandes')}
      icone="truck"
      droite={
        peut && aSeuil.length > 0 ? (
          <button type="button" className="btn primary sm" style={{ marginLeft: 'auto' }} onClick={ouvrirCommande}>
            <Icone nom="shopping-bag" taille={16} />
            {t('Commander')}
          </button>
        ) : undefined
      }
    >
      {e.commandes.length === 0 && aSeuil.length === 0 && enAttente.length === 0 ? (
        <Vide icone="shopping-bag" t={t('Aucune commande')} s={tf('Une commande s’ouvre quand un format atteint {p} % de son stock avancé.', { p: OUTILS.reassortPct })} />
      ) : (
        <>
          <CommandesProposees aSeuil={aSeuil} commandes={e.commandes} enAttente={enAttente} />
          {e.commandes
            .filter((c) => c.statut === 'recue')
            .map((c) => (
              <Li key={c.id} icone="package-check" ton="acc" t={tf('Commande de {n} {f}', { n: c.n, f: c.format })} s={`${d.quand(c.le, maintenant)} · ${t(c.livraison === 'retrait' ? 'Retrait au local BelivaY' : 'Livraison par une course de retour')}`} droite={<St t={t('Reçue')} ton="green" />} />
            ))}
        </>
      )}
      <div className="mt10">
        {e.stock.map((s) => (
          <Limite key={s.format} icone="gauge" titre={tf('Format {f}', { f: s.format })} texte={tf('commande possible à {p} % restants ou moins · {m} au plus par commande', { p: OUTILS.reassortPct, m: plafond(s) })} />
        ))}
      </div>
      <Hint icone="info">{t('Les emballages sont avancés par BelivaY, jamais vendus : une commande ne demande aucun paiement.')}</Hint>
    </Panel>
  )
}

function useRefus() {
  const { t } = usePreferences()
  const R: Record<RefusEmballage, string> = {
    quantite: t('Quantité impossible : vérifiez le stock au point de stockage et le livreur choisi.'),
    plage: t('Plage d’étiquettes invalide : elle doit être au stockage, du plus petit au plus grand numéro.'),
    chevauchement: t('Cette plage chevauche une plage déjà remise.'),
    au_dessus_du_seuil: t('Ce format est au-dessus du seuil de réassort : pas de commande.'),
    motif: t('Indiquez le motif.'),
    photo: t('Une photo est obligatoire.'),
  }
  return (r: RefusEmballage) => R[r]
}

/** Déclarer une plage perdue (bouton du panneau « Étiquettes et ruban ») : la plage est invalidée aussitôt. */
function FeuillePlages({ ouverte, fermer, plages, annoncer }: { ouverte: boolean; fermer: () => void; plages: PlageEtiquettes[]; annoncer: (ok: boolean, t: string) => void }) {
  const { t } = usePreferences()
  const refus = useRefus()
  const [confirmer, setConfirmer] = useState<string | null>(null)
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Déclarer une plage perdue')}>
      <h2 className="card-t">{t('Déclarer une plage perdue')}</h2>
      <p className="e7-note mt10">{t('Une plage déclarée perdue est invalidée aussitôt : toute liaison d’une de ses étiquettes est refusée.')}</p>
      <ul className="lignes mt10">
        {plages.map((p) => (
          <li key={p.id} className="ligne" data-plage={p.id}>
            <span className="grow">
              <span className="lt e8-mono">{`BV 24 ${p.du} – ${p.au}`}</span>
              <span className="ls">{p.statut === 'perdue' ? t('Plage perdue : invalidée, toute liaison est refusée') : p.livreur ? `${p.livreur.nom} · ${p.liees} / ${taille(p)}` : `${t('Au stockage')} · ${taille(p)}`}</span>
            </span>
            {p.statut === 'perdue' ? (
              <span className="pill rouge">{t('Perdue')}</span>
            ) : confirmer === p.id ? (
              <span className="btns">
                <button
                  type="button"
                  className="btn sm danger"
                  onClick={async () => {
                    const r = await source.emballages.declarerPlagePerdue(p.id)
                    setConfirmer(null)
                    annoncer(r.ok, r.ok ? t('Plage invalidée.') : refus(r.raison))
                  }}
                >
                  {t('Confirmer')}
                </button>
                <button type="button" className="btn sm ghost" onClick={() => setConfirmer(null)}>
                  {t('Annuler')}
                </button>
              </span>
            ) : (
              <button type="button" className="btn sm ghost" onClick={() => setConfirmer(p.id)}>
                {t('Déclarer perdue')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </Feuille>
  )
}

function FeuilleEcart({ ouverte, fermer, annoncer }: { ouverte: boolean; fermer: () => void; annoncer: (ok: boolean, t: string) => void }) {
  const { t, tf } = usePreferences()
  const refus = useRefus()
  const [format, setFormat] = useState<FormatEmballage>('M')
  const [n, setN] = useState('1')
  const [motif, setMotif] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Justifier un écart')}>
      <h2 className="card-t">{t('Justifier un écart')}</h2>
      <p className="e7-note mt10">{tf('Inventaire chaque {j}, avant la clôture. Écart non justifié au-delà de {p} % sur un mois : facturé au coût d’achat, jamais au livreur.', { j: t(JOURS[OUTILS.jourInventaire]), p: OUTILS.ecartPct })}</p>
      <div className="seg mt10" role="radiogroup" aria-label={t('Format')}>
        {FORMATS.map((f) => (
          <button key={f} type="button" role="radio" aria-checked={format === f} className={format === f ? 'on' : ''} onClick={() => setFormat(f)}>
            {f}
          </button>
        ))}
      </div>
      <label className="champ">
        <span>{t('Pochettes abîmées ou manquantes')}</span>
        <input inputMode="numeric" value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, ''))} />
      </label>
      <label className="champ">
        <span>{t('Motif')}</span>
        <input value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={200} />
      </label>
      <label className="champ">
        <span>{t('Photo (obligatoire)')}</span>
        <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0]?.name ?? null)} />
      </label>
      {erreur && <p className="note red mt10" role="alert">{erreur}</p>}
      <button
        type="button"
        className="btn primary bloc mt16"
        onClick={async () => {
          if (!motif.trim()) return setErreur(refus('motif'))
          if (!photo) return setErreur(refus('photo'))
          const x = await geste('Justifier un écart', (s) => s.emballages.justifier({ format, n: Number(n), motif, photo }), `${n} ${format}`)
          if (x.etat === 'fait' && !x.r.ok) return setErreur(refus(x.r.raison))
          fermer()
          setMotif('')
          setPhoto(null)
          setErreur(null)
          annoncer(true, x.etat === 'en_file' ? t('Hors connexion : justification gardée, envoyée au retour du réseau.') : t('Écart justifié et déclaré.'))
        }}
      >
        {t('Déclarer')}
      </button>
    </Feuille>
  )
}

function FeuilleRemise({ ouverte, fermer, stock, plageLibre, annoncer }: { ouverte: boolean; fermer: () => void; stock: StockEmballage[]; plageLibre: { du: number; au: number } | null; annoncer: (ok: boolean, t: string) => void }) {
  const { t, tf } = usePreferences()
  const refus = useRefus()
  const livreurs = useLecture(() => source.livreurs.liste(), [])
  const disponibles = (livreurs.donnees ?? []).filter((l) => l.statut !== 'en_activation' && l.statut !== 'suspendu' && l.statut !== 'retire')
  const [livreur, setLivreur] = useState('')
  const [qte, setQte] = useState<Record<string, string>>({})
  const [du, setDu] = useState('')
  const [au, setAu] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const items = FORMATS.map((f) => ({ format: f, n: Number(qte[f] || 0) })).filter((i) => i.n > 0)
  const envoyer = async () => {
    if (!livreur) return setErreur(t('Choisissez le livreur.'))
    const plage = du && au ? { du: Number(du), au: Number(au) } : null
    const x = await geste('Enregistrer une remise', (s) => s.emballages.remettre({ livreurId: livreur, items, plage }), disponibles.find((l) => l.id === livreur)?.nom)
    if (x.etat === 'fait' && !x.r.ok) return setErreur(refus(x.r.raison))
    setErreur(null)
    setQte({})
    setDu('')
    setAu('')
    fermer()
    annoncer(true, x.etat === 'en_file' ? t('Hors connexion : remise gardée, envoyée au retour du réseau.') : t('Remise enregistrée : en attente de la confirmation du livreur dans son application.'))
  }
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Enregistrer une remise')} forme="large">
      <h2 className="card-t">{t('Enregistrer une remise')}</h2>
      <label className="champ">
        <span>{t('Livreur')}</span>
        <select value={livreur} onChange={(e) => setLivreur(e.target.value)}>
          <option value="">{t('Choisir…')}</option>
          {disponibles.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nom}
            </option>
          ))}
        </select>
      </label>
      <div className="e8-qtes mt10">
        {stock.map((s) => (
          <label key={s.format} className="champ">
            <span>{tf('{f} · {n} au stockage', { f: s.format, n: s.auStockage })}</span>
            <input inputMode="numeric" value={qte[s.format] ?? ''} onChange={(e) => setQte({ ...qte, [s.format]: e.target.value.replace(/\D/g, '') })} placeholder="0" />
          </label>
        ))}
      </div>
      <p className="e7-note mt10">{tf('Kit conseillé : {k}.', { k: OUTILS.kit.filter((k) => !k.auStockage).map((k) => `${k.n} ${k.format}`).join(', ') })}</p>
      <div className="e8-qtes">
        <label className="champ">
          <span>{t('Étiquettes : du n°')}</span>
          <input inputMode="numeric" value={du} onChange={(e) => setDu(e.target.value.replace(/\D/g, ''))} placeholder={plageLibre ? String(plageLibre.du) : ''} />
        </label>
        <label className="champ">
          <span>{t('au n°')}</span>
          <input inputMode="numeric" value={au} onChange={(e) => setAu(e.target.value.replace(/\D/g, ''))} placeholder={plageLibre ? String(plageLibre.au) : ''} />
        </label>
      </div>
      {plageLibre && <p className="e7-note">{tf('Plage libre au stockage : {du} – {au}.', { du: plageLibre.du, au: plageLibre.au })}</p>}
      {erreur && <p className="note red mt10" role="alert">{erreur}</p>}
      <button type="button" className="btn primary bloc mt16" disabled={!items.length} onClick={() => void envoyer()}>
        {t('Enregistrer la remise')}
      </button>
    </Feuille>
  )
}

function FeuilleCommande({ ouverte, fermer, formats, commander }: { ouverte: boolean; fermer: () => void; formats: StockEmballage[]; commander: (x: Omit<EnAttente, 'file'>) => void }) {
  const { t, tf } = usePreferences()
  const [format, setFormat] = useState<FormatEmballage | null>(null)
  const choisi = formats.find((f) => f.format === format) ?? formats[0]
  const [n, setN] = useState('')
  const [livraison, setLivraison] = useState<CommandeEmballage['livraison']>('retrait')
  if (!choisi) return null
  const propose = Math.max(0, choisi.remis - resteAttendu(choisi))
  const max = plafond(choisi)
  const q = Number(n || propose)
  const trop = q > max
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Commander des emballages')}>
      <h2 className="card-t">{t('Commander des emballages')}</h2>
      <p className="e7-note mt10">{t('Quantité proposée pour revenir au stock avancé. Les emballages sont avancés, jamais vendus : aucun paiement.')}</p>
      <div className="seg mt10" role="radiogroup" aria-label={t('Format')}>
        {formats.map((f) => (
          <button key={f.format} type="button" role="radio" aria-checked={choisi.format === f.format} className={choisi.format === f.format ? 'on' : ''} onClick={() => setFormat(f.format)}>
            {f.format}
          </button>
        ))}
      </div>
      <label className="champ">
        <span>{t('Quantité')}</span>
        <input inputMode="numeric" value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, ''))} placeholder={String(propose)} />
      </label>
      <p className="e7-note">{tf('Restants {r} · stock avancé {a}', { r: resteAttendu(choisi), a: choisi.remis })}</p>
      <Limite
        titre={tf('Plafond : {m} {f} par commande', { m: max, f: choisi.format })}
        texte={tf('{x} fois le stock avancé', { x: PARAMETRES.saisies.emballageCommandeMax })}
        atteinte={trop ? t('Au-delà du plafond : réduisez la quantité ou écrivez au support.') : q < 1 ? t('Indiquez au moins 1 emballage.') : undefined}
      />
      <div className="seg mt14" role="radiogroup" aria-label={t('Réception')}>
        <button type="button" role="radio" aria-checked={livraison === 'retrait'} className={livraison === 'retrait' ? 'on' : ''} onClick={() => setLivraison('retrait')}>
          {t('Retrait au local')}
        </button>
        <button type="button" role="radio" aria-checked={livraison === 'course_retour'} className={livraison === 'course_retour' ? 'on' : ''} onClick={() => setLivraison('course_retour')}>
          {t('Course de retour')}
        </button>
      </div>
      <p className="e7-note mt10">{t('Sans réseau, la commande est gardée sur cet appareil et part au retour du réseau.')}</p>
      <div className="btns mt16">
        <button
          type="button"
          className="btn primary"
          disabled={trop || q < 1}
          onClick={() => {
            commander({ format: choisi.format, n: q, livraison })
            setN('')
            fermer()
          }}
        >
          <Icone nom="send" taille={18} />
          {t('Envoyer la commande')}
        </button>
        <button type="button" className="btn ghost" onClick={fermer}>
          {t('Annuler')}
        </button>
      </div>
    </Feuille>
  )
}
