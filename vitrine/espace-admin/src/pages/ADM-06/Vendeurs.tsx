// ADM-P10 · Vendeurs (prototype route('vendeurs') : une seule page, Liste · Carte des boutiques · Fiche).
// Liste : 4 indicateurs, sélecteur et rappel « le client ne voit jamais la boutique », tableau trié par litiges puis
// commandes (étiquettes Made in Cameroon, Descente proposée, Palier de lancement et Plafond de démarrage, Sanction
// proposée), Répartition par palier et « À suivre aujourd'hui ». Carte : boutiques sur le fond OSM, par zone.
// Fiche : identité (téléphone masqué, affiché sur motif journalisé), KYC, contrat, abonnement, employés, palier et
// historique, offres, commissions appliquées commande par commande, litiges, versements, sanctions, journal.
// La console ne publie jamais une offre à la place du vendeur et ne touche jamais un prix (ADM-P10R-04).
// Gestes : afficher le téléphone (motif), proposer une sanction (Support, Médiation, Direction) ; Opérations : sa zone.
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { MentionOsm, TuilesOsm, cadrer, useFondOsm } from '../../composants/CarteOsm'
import { CoucheMarqueurs, LegendeCarte, type PointMarqueur } from '@client/composants/carte/Marqueurs'
import { ZONES_GEO } from '../ADM-09/CarteReseau'
import { PARAMETRES } from '../../calculs/registre'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { BoutonAppel } from '../../composants/BoutonAppel'
import { Masque } from '../../composants/Masque'
import { Perimetre } from '../../composants/Perimetre'
import { Banniere, BarresH, Choix, Kpi, Li, Panel, Pill, Props, Recherche, St, Table, correspond } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { FicheVendeur, VendeurCourt } from '../../donnees/domaines/acteurs'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge, useRole } from '../../session'
import { P3, type Niveau } from './calculs/regles'
import { Av, BandeauErreur, BandeauOk, Chargement, CourbeScore, Ev, Historique, Mini, NoteConflit, Quand, Radios, Regles, Score, Tier, nomPalier, useErreur } from './commun'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Plie, useFonctionsS } from '../ADM-03/kit'
import { AccesActeur } from '../SURVEILLER/AccesActeur'

const STATUT: Record<VendeurCourt['statut'], [string, 'green' | 'amber' | 'red']> = { ouvert: ['Ouvert', 'green'], ferme: ['Fermé aujourd’hui', 'amber'], suspendu: ['Suspendu', 'red'], en_revue: ['En revue (KYC)', 'amber'] }
// Noms des zones : le fichier des zones qui fait foi (logique-metier/livraison/zones-yaounde.geo.json).
const ZONE: Record<string, string> = Object.fromEntries(ZONES_GEO.map((z) => [z.code, z.nom]))
// Zones exploitées (ZONES-EXPLOITEES) : pastille de couleur ; les autres zones sont « vente seulement ».
const EXPLOITEES: string[] = PARAMETRES.zonesExploitees.map((z) => z.code)
type Vue = 'liste' | 'carte' | 'fiche'
const PROPOSENT = ['superviseur', 'support', 'mediation']

export default function Vendeurs() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const maintenant = useHorloge()
  const id = params.get('id')
  const vue: Vue = id ? 'fiche' : params.get('vue') === 'carte' ? 'carte' : 'liste'
  const lecture = useLecture(() => source.acteurs.vendeurs(), [])
  const erreur = useErreur(lecture.erreur)
  const l = lecture.donnees ?? []
  const lien = (v: Vue, i?: string) => chemin('vendeurs', v === 'fiche' ? { id: i ?? l[0]?.id } : v === 'carte' ? { vue: 'carte' } : undefined)
  const fiche = l.find((v) => v.id === id)
  const avec = (e: VendeurCourt['etiquettes'][number]) => l.filter((v) => v.etiquettes.includes(e)).length
  const fonctions = useFonctionsS('vendeurs', [
    { verbe: 'Revoir', n: avec('descente_proposee'), unite: ['palier', 'paliers'], icone: 'trophy', route: 'paliers' },
    { verbe: 'Décider', n: avec('sanction_proposee'), unite: ['sanction', 'sanctions'], icone: 'gavel', route: 'sanctions' },
    { verbe: 'Valider', n: l.filter((v) => v.statut === 'en_revue').length, unite: ['identité', 'identités'], icone: 'id-card', route: 'kyc' },
    { verbe: 'Localiser', n: l.length, unite: ['boutique', 'boutiques'], icone: 'map', route: 'vendeurs', params: { vue: 'carte' } },
  ])
  return (
    <Ecran
      route="vendeurs"
      titre={fiche ? fiche.nom : undefined}
      kicker={<Quand le={maintenant} />}
      fonctions={vue !== 'fiche' && lecture.donnees ? fonctions : undefined}
      actions={
        <>
          {fiche && vue === 'fiche' && <BoutonAppel nom={fiche.nom} qui="Vendeur" motif={t('Explication ou intervention auprès du vendeur')} objet={fiche.id} />}
          <Link className="btn secondary" to={chemin('commissions')}>
            <Icone nom="percent" taille={18} />
            <span>{t('Commissions et abonnements')}</span>
          </Link>
          <Link className="btn primary" to={chemin('paliers')}>
            <Icone nom="gauge" taille={18} />
            <span>{t('Paliers à valider')}</span>
          </Link>
        </>
      }
    >
      <Perimetre route="vendeurs" />
      {erreur && <BandeauErreur quoi="La liste des vendeurs" relire={lecture.relire} />}
      {vue !== 'fiche' && <Entete l={l} />}
      <div className="row mt16 admk-vseg" style={{ gap: 10, flexWrap: 'wrap' }}>
        <Choix
          forme="seg"
          aria={t('Vue')}
          actif={vue}
          className="grow"
          items={[
            { id: 'liste' as const, t: t('Liste'), icone: 'list', to: lien('liste') },
            { id: 'carte' as const, t: t('Carte des boutiques'), icone: 'map', to: lien('carte') },
            { id: 'fiche' as const, t: t('Fiche'), icone: 'id-card', to: lien('fiche', id ?? undefined) },
          ]}
        />
      </div>
      {!lecture.donnees && !erreur ? <Chargement /> : vue === 'liste' ? <Liste l={l} /> : vue === 'carte' ? <Carte l={l} /> : <Fiche id={id ?? l[0]?.id ?? ''} />}
      {vue !== 'fiche' && <Cote l={l} />}
      <Regles
        liste={[
          ['ADM-P10R-01', 'Nom, adresse et téléphone du vendeur ne sont réunis qu’ici, selon le rôle ; jamais montrés au client.'],
          ['ADM-P10R-02', 'Palier de lancement pendant 2 mois (produits actifs), puis le Trust Score.'],
          ['ADM-P10R-03', tf('Plafond de démarrage : {m} F par commande jusqu’à {n} commandes livrées sans incident.', { m: F(P3.plafondDemarrage), n: P3.plafondDemarrageCommandes })],
          ['ADM-P10R-04', 'La console ne publie jamais une offre à la place du vendeur.'],
          ['ADM-P25R-08', 'Le vendeur voit ce qu’il garde ; la console montre aussi ce qui est retenu.'],
          ['ADM-ROL-03', 'Opérations : seulement les vendeurs de sa zone.'],
        ]}
      />
    </Ecran>
  )
}

function Entete({ l }: { l: VendeurCourt[] }) {
  const { t, tf } = usePreferences()
  const n = (s: VendeurCourt['statut']) => l.filter((v) => v.statut === s).length
  const p = (x: string) => l.filter((v) => v.palier === x).length
  const susp = l.find((v) => v.statut === 'suspendu')
  return (
    <div className="s3-g4">
      <Kpi k={t('Vendeurs actifs')} v={l.length - n('suspendu')} u={tf('· {n} zone(s)', { n: new Set(l.map((v) => v.zone)).size })} s={tf('{o} ouvert(s) maintenant · {r} en revue (KYC)', { o: n('ouvert'), r: n('en_revue') })} icone="store" ton="night" />
      <Kpi k={t('Fermés aujourd’hui')} v={n('ferme')} s={t('Réouverture annoncée ; offres basculées vers le vendeur suivant')} icone="door-closed" iton="amber" />
      <Kpi k={t('Suspendus')} v={n('suspendu')} s={susp ? `${susp.nom} · ${susp.precision ?? ''}` : t('Aucun')} icone="ban" iton="red" />
      <Kpi k={t('Paliers')} v={`${p('bronze')} / ${p('argent')} / ${p('or')}`} s={tf('Bronze / Argent / Or · Platine : {p} · {d} descente(s) à valider', { p: p('platine'), d: l.filter((v) => v.etiquettes.includes('descente_proposee')).length })} icone="award" iton="or" />
    </div>
  )
}

function Etiquettes({ v }: { v: VendeurCourt }) {
  const { t, tf } = usePreferences()
  if (!v.etiquettes.length && !v.plafondDemarrage) return null
  return (
    <span className="row wrap mt4" style={{ gap: 4, display: 'flex' }}>
      {v.etiquettes.includes('made_in_cameroon') && (
        <Pill ton="green" sm>
          {t('Made in Cameroon')}
        </Pill>
      )}
      {v.etiquettes.includes('descente_proposee') && (
        <Pill ton="amber" sm icone="trending-down">
          {t('Descente proposée')}
        </Pill>
      )}
      {v.etiquettes.includes('lancement') && (
        <Pill ton="acc" sm>
          {t('Palier de lancement')}
        </Pill>
      )}
      {v.plafondDemarrage && (
        <Pill ton="blue" sm icone="shield">
          {tf('Plafond de démarrage · {f} / {n}', { f: v.plafondDemarrage.faites, n: v.plafondDemarrage.sur })}
        </Pill>
      )}
      {v.etiquettes.includes('sanction_proposee') && (
        <Pill ton="or" sm icone="gavel">
          {t('Sanction proposée')}
        </Pill>
      )}
      {v.etiquettes.includes('conflit') && (
        <Pill ton="ink" sm icone="user-x">
          {t('Vous tenez ce compte')}
        </Pill>
      )}
    </span>
  )
}

function Liste({ l }: { l: VendeurCourt[] }) {
  const { t, tf } = usePreferences()
  const [q, setQ] = useState('')
  const [statut, setStatut] = useState<'tous' | VendeurCourt['statut']>('tous')
  const rows = l.filter((v) => (statut === 'tous' || v.statut === statut) && correspond(q, v.nom, v.quartier, v.categorie, v.zone))
  return (
    <div className="mt16">
      <Table
        cle={(v) => v.id}
        rows={rows}
        ligneCls={(v) => (v.statut === 'suspendu' ? 'bad' : v.statut === 'ferme' ? 'warn' : undefined)}
        legende={t('Vendeurs du réseau')}
        outils={
          <>
            <Recherche q={q} setQ={setQ} placeholder={t('Boutique, quartier, catégorie…')} aria={t('Rechercher un vendeur')} />
            <Choix forme="chips" className="a-segs" aria={t('Statut')} actif={statut} choisir={setStatut} items={[{ id: 'tous' as const, t: t('Tous'), n: l.length }, ...(['ouvert', 'ferme', 'suspendu', 'en_revue'] as const).map((s) => ({ id: s, t: t(STATUT[s][0]), n: l.filter((v) => v.statut === s).length }))]} />
            <span className="sp"></span>
            <span className="lock t12 c3 b7">
              <Icone nom="arrow-down-narrow-wide" taille={15} /> {t('Tri : litiges ouverts, puis commandes')}
            </span>
          </>
        }
        vide={<p className="card-s" style={{ padding: 16 }}>{t('Aucun vendeur ne correspond à ces filtres.')}</p>}
        pied={
          <>
            <span>{tf('{n} vendeur(s) affiché(s) sur {t} · produits actifs, commandes sur 30 jours, litiges ouverts', { n: rows.length, t: l.length })}</span>
          </>
        }
        cols={[
          {
            k: 'b',
            t: t('Boutique'),
            main: true,
            rendu: (v) => (
              <Link className="row" style={{ gap: 10 }} to={chemin('vendeurs', { id: v.id })}>
                <Av nom={v.nom} taille={38} />
                <span className="grow">
                  <b className="t14" style={{ display: 'block' }}>
                    {v.nom}
                  </b>
                  <span className="t12 c3">
                    {v.categorie} · {v.quartier}
                  </span>
                  <Etiquettes v={v} />
                </span>
              </Link>
            ),
          },
          { k: 'z', t: t('Zone'), rendu: (v) => <Pill sm ton={EXPLOITEES.includes(v.zone) ? 'acc' : 'ink'}>{`${v.zone} ${ZONE[v.zone] ?? ''}`}</Pill> },
          { k: 'p', t: t('Palier'), rendu: (v) => <Tier palier={v.palier} /> },
          { k: 't', t: t('Trust Score'), rendu: (v) => <Score v={v.trustScore} seuil={v.seuil} taille={36} /> },
          { k: 'o', t: t('Produits'), cls: 'r', rendu: (v) => <b>{v.produits}</b> },
          { k: 'c', t: t('Commandes'), cls: 'r', rendu: (v) => F(v.commandes30) },
          { k: 'l', t: t('Litiges'), cls: 'r', rendu: (v) => (v.litiges ? <b className="cor">{v.litiges}</b> : '0') },
          {
            k: 's',
            t: t('Statut'),
            rendu: (v) => (
              <>
                <St t={t(STATUT[v.statut][0])} ton={STATUT[v.statut][1]} />
                {v.precision && <div className="t12 c3 mt4">{v.precision}</div>}
              </>
            ),
          },
        ]}
      />
    </div>
  )
}

function Cote({ l }: { l: VendeurCourt[] }) {
  const { t } = usePreferences()
  const p = (x: string) => l.filter((v) => v.palier === x).length
  return (
    <div className="s3-g2">
      <Panel titre={t('Répartition par palier')} icone="award">
        <BarresH
          lignes={(['bronze', 'argent', 'or', 'platine'] as const).map((x) => ({ l: t(nomPalier(x)), v: p(x), max: Math.max(1, l.length), r: String(p(x)) }))}
        />
        <div className="t12 c3 mt10">{t('Pendant les 2 mois qui suivent la signature, le palier suit le nombre de produits actifs (Argent ≥ 15, Or ≥ 40, Platine ≥ 80) ; ensuite, le Trust Score.')}</div>
      </Panel>
      <Panel titre={t('À suivre aujourd’hui')} icone="eye">
        {l.filter((v) => v.etiquettes.includes('descente_proposee')).map((v) => <Li key={v.id + 'd'} icone="trending-down" ton="amber" t={`${v.nom} · ${t('descente proposée')}`} s={t('Croisement à examiner avant la décision')} to={chemin('paliers')} />)}
        {l.filter((v) => v.etiquettes.includes('sanction_proposee')).map((v) => <Li key={v.id + 's'} icone="gavel" ton="or" t={`${v.nom} · ${t('sanction proposée')}`} s={t('Proposée par le système, décision humaine')} to={chemin('sanctions')} />)}
        {l.filter((v) => v.statut === 'en_revue').map((v) => <Li key={v.id + 'k'} icone="id-card" ton="acc" t={`${v.nom} · ${t('pièce à compléter')}`} s={t('Versements en attente du KYC validé')} to={chemin('kyc', { onglet: 'complement' })} />)}
        <Li icone="badge-check" ton="acc" t={t('Offres en modération')} s={t('Écart de prix, prix barré, produit interdit')} to={chemin('moderation')} />
      </Panel>
    </div>
  )
}

function Carte({ l }: { l: VendeurCourt[] }) {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const fond = useFondOsm()
  const c = cadrer({ lat0: 3.82, lat1: 3.9, lng0: 11.465, lng1: 11.54 }, 800)
  const zones = [...new Set(l.map((v) => v.zone))].sort()
  return (
    <div className="s3-g2" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)' }}>
      <div className="s3-carte">
        <svg viewBox={`0 0 ${c.l} ${c.h}`} role="group" aria-label={t('Carte des boutiques')}>
          <rect width={c.l} height={c.h} fill="var(--sand-2)" />
          {fond.etat === 'osm' && <TuilesOsm cadre={c} echouer={fond.echouer} />}
          <CoucheMarqueurs
            points={l.map((v): PointMarqueur => {
              const [x, y] = c.point(v.position[0], v.position[1])
              return { id: v.id, acteur: 'boutique', x, y, nom: tf('{nom}, {statut} : ouvrir la fiche', { nom: v.nom, statut: t(STATUT[v.statut][0]) }), etiquette: v.nom, statut: v.statut === 'suspendu' ? 'alerte' : v.statut === 'ferme' ? 'inactif' : v.statut === 'en_revue' ? 'attention' : undefined, classe: 'pt', lien: true, surChoix: () => naviguer(chemin('vendeurs', { id: v.id })) }
            })}
          />
        </svg>
        <MentionOsm etat={fond.etat} demander={fond.demander} />
        <div style={{ padding: '0 12px 10px' }}>
          <LegendeCarte acteurs={['boutique']} libelles={{ boutique: 'Boutique ouverte' }} statuts={[['inactif', 'Fermée aujourd’hui'], ['attention', 'En revue (KYC)'], ['alerte', 'Suspendue']]} />
        </div>
      </div>
      <Panel titre={t('Par zone')} icone="map">
        {zones.map((z) => {
          const d = l.filter((v) => v.zone === z)
          return <Li key={z} icone="map-pinned" ton="acc" t={`${z} ${ZONE[z] ?? ''}`} s={tf('{o} ouvert(s) · {f} fermé(s) ou suspendu(s)', { o: d.filter((v) => v.statut === 'ouvert').length, f: d.filter((v) => v.statut !== 'ouvert').length })} droite={<b className="t14">{d.length}</b>} />
        })}
        <div className="t12 c3 mt10">{t('Position des boutiques : point posé par le vendeur à l’étape « Ouvrir », vérifié par l’agent terrain.')}</div>
      </Panel>
    </div>
  )
}

const ONGLETS_FICHE = ['apercu', 'offres', 'litiges', 'versements', 'sanctions', 'journal'] as const
function Fiche({ id }: { id: string }) {
  const { t, tf } = usePreferences()
  const role = useRole()
  const lecture = useLecture(() => source.acteurs.vendeur(id), [id])
  const erreur = useErreur(lecture.erreur)
  const [onglet, setOnglet] = useState<(typeof ONGLETS_FICHE)[number]>('apercu')
  const [feuille, setFeuille] = useState(false)
  const [niveau, setNiveau] = useState<'1' | '2' | '3'>('1')
  const [fait, setFait] = useState<string | null>(null)
  const v = lecture.donnees
  if (erreur) return <BandeauErreur quoi="La fiche du vendeur" relire={lecture.relire} />
  if (!v) return lecture.donnees === null && !lecture.erreur ? <Chargement /> : null
  const peutProposer = PROPOSENT.includes(role) && !v.conflit
  return (
    <div className="mt16">
      {fait && (
        <BandeauOk
          bouton={
            <Link className="btn secondary sm" to={chemin('sanctions')}>
              <Icone nom="gavel" taille={16} />
              <span>{t('Suivre la sanction')}</span>
            </Link>
          }
        >
          {fait}
        </BandeauOk>
      )}
      {v.bandeau && (
        <Banniere
          ton={v.bandeau.ton}
          icone={v.bandeau.ton === 'red' ? 'ban' : 'door-closed'}
          bouton={
            v.bandeau.ton === 'red' ? (
              <Link className="btn secondary sm" to={chemin('sanctions')}>
                <Icone nom="gavel" taille={16} />
                <span>{t('Suivre la sanction')}</span>
              </Link>
            ) : undefined
          }
        >
          {v.bandeau.texte}
        </Banniere>
      )}
      <AccesActeur espace="vendeur" id={v.id} nom={v.nom} zone={v.zone} />
      <Panel>
        <div className="row admk-vhead" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Av nom={v.nom} taille={64} />
          <div className="grow" style={{ minWidth: 220 }}>
            <div className="row wrap" style={{ gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-.02em' }}>{v.nom}</h2>
              <Tier palier={v.palier} />
              <St t={t(STATUT[v.statut][0])} ton={STATUT[v.statut][1]} />
            </div>
            <div className="t13 c3 mt6">
              {v.categorie} · {v.quartier} ({v.zone}) · {t('titulaire')} <b className="c2">{v.titulaire}</b>
            </div>
            <Etiquettes v={v} />
            <div className="row wrap mt10" style={{ gap: 18, fontSize: '0.8125rem' }}>
              <span className="row" style={{ gap: 6 }}>
                <Icone nom="map-pin" taille={15} />
                {v.adresse}
              </span>
              <span className="row" style={{ gap: 6 }}>
                <Icone nom="phone" taille={15} />
                <Masque donnee="Numéro de téléphone du vendeur" masque={v.telephone} demasquer={(m) => source.acteurs.demasquerVendeur(v.id, m)} />
              </span>
              <span className="row" style={{ gap: 6 }}>
                <Icone nom="wallet" taille={15} />
                {v.momo}
              </span>
            </div>
          </div>
          <div className="admk-bigscore">
            <Score v={v.trustScore} seuil={v.seuil} taille={92} />
            <div className="d">
              <b>{tf('Trust Score {v}', { v: String(v.trustScore).replace('.', ',') })}</b>
              <br />
              {v.seuil !== null ? tf('seuil {p} : {s}', { p: t(nomPalier(v.palier === 'bronze' ? 'argent' : v.palier)), s: v.seuil }) : ''}
              <br />
              {tf('{d} sur 30 jours', { d: (v.historique.at(-1)! - v.historique[0] >= 0 ? '+' : '') + (Math.round((v.historique.at(-1)! - v.historique[0]) * 10) / 10).toString().replace('.', ',') })}
            </div>
          </div>
        </div>
        {v.conflit && <NoteConflit />}
        <Choix
          forme="tabs"
          aria={t('Fiche du vendeur')}
          className="mt14"
          actif={onglet}
          choisir={setOnglet}
          items={[
            { id: 'apercu', t: t('Aperçu'), icone: 'layout-dashboard' },
            { id: 'offres', t: t('Offres'), n: v.offres.length },
            { id: 'litiges', t: t('Litiges'), n: v.litigesListe.length },
            { id: 'versements', t: t('Versements') },
            { id: 'sanctions', t: t('Sanctions'), n: v.sanctions.length },
            { id: 'journal', t: t('Journal') },
          ]}
        />
      </Panel>
      {onglet === 'apercu' && (
        <>
          <div className="admk-idgrid mt16" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            <Mini k={t('KYC')} v={t(v.statut === 'en_revue' ? 'À compléter' : 'Vérifié')} s={v.kyc} />
            <Mini k={t('Contrat')} v={t('Signé')} s={v.contrat} />
            <Mini k={t('Abonnement')} v={v.abonnement.split(' · ')[0]} s={v.abonnement.split(' · ').slice(1).join(' · ') || t('aucune option')} />
            <Mini k={t('Accès employés')} v={v.employes.split(' · ')[0]} s={v.employes.split(' · ')[1] ?? t('accès nominatifs, désactivables')} />
          </div>
          <div className="s3-g2">
            <Panel titre={t('Palier et historique')} icone="gauge" a={{ t: t('Paliers à valider'), to: chemin('paliers') }}>
              <CourbeScore valeurs={v.historique} seuil={v.seuil} descente={null} aria={tf('Trust Score sur 30 jours, de {a} à {b}', { a: v.historique[0], b: v.historique.at(-1)! })} />
              <div className="mt8">
                {v.evenements.map((e) => (
                  <Ev key={e.id} e={e} />
                ))}
              </div>
              <div className="t12 c3 mt8">{tf('Baisse maximale de {n} points par recalcul (sauf veto). Aucune descente de palier sans validation humaine.', { n: P3.baisseMax })}</div>
            </Panel>
            <OffresPanel v={v} />
          </div>
          <Panel titre={t('Commissions appliquées, commande par commande')} icone="percent" className="mt16" a={{ t: t('Grilles'), to: chemin('commissions') }}>
            <Table
              cle={(c) => c.commande}
              rows={v.commissions}
              legende={t('Commissions appliquées')}
              cols={[
                { k: 'c', t: t('Commande'), main: true, rendu: (c) => <><b>{c.commande}</b><div className="t12 c3">{c.etat}</div></> },
                { k: 'a', t: t('Article'), rendu: (c) => c.article },
                { k: 'p', t: t('Prix payé'), cls: 'r', rendu: (c) => `${F(c.prix)} F` },
                { k: 'm', t: t('Commission'), cls: 'r', rendu: (c) => <b className="cor">{`${F(c.commission)} F`}</b> },
                { k: 'g', t: t('Vous gardez'), cls: 'r', rendu: (c) => <b>{`${F(c.garde)} F`}</b> },
                { k: 'v', t: t('Version'), rendu: (c) => <span className="t12 c3">{c.version}</span> },
              ]}
            />
            <div className="t12 c3 mt10">{t('La commission est figée au paiement (taux, palier, catégorie, offre de découverte). L’espace vendeur montre seulement « Vous gardez » ; la console montre les deux.')}</div>
          </Panel>
          <div className="s3-g2">
            <LitigesPanel v={v} />
            <Panel titre={t('Journal')} icone="scroll-text" a={{ t: t('Journal complet'), to: chemin('journal', { objet: v.nom }) }}>
              <Historique l={v.journal} />
            </Panel>
          </div>
          <Panel titre={t('Identité et accès')} icone="shield-check" className="mt16">
            <Props paires={[[t('Titulaire'), v.titulaire], [t('Adresse de la boutique'), v.adresse], [t('Téléphone'), v.telephone], [t('Numéro de versement'), v.momo], [t('Visible par'), t('Direction et Support ; Opérations pour leur zone ; Vérification en lecture')]]} />
            <div className="t12 c3 mt10">{t('Aucun nom ni numéro de vendeur n’est jamais communiqué à un client. Afficher un numéro en clair crée une ligne de journal.')}</div>
          </Panel>
        </>
      )}
      {onglet === 'offres' && <OffresPanel v={v} className="mt16" />}
      {onglet === 'litiges' && <LitigesPanel v={v} className="mt16" />}
      {onglet === 'versements' && (
        <Panel titre={t('Versements')} icone="banknote" className="mt16" a={{ t: t('Versements du vendredi'), to: chemin('versements') }}>
          {v.versements.map((x, i) => (
            <Li key={i} icone="banknote" ton="green" t={x.titre} s={x.sous} />
          ))}
        </Panel>
      )}
      {onglet === 'sanctions' && (
        <Panel titre={t('Sanctions')} icone="gavel" className="mt16" a={{ t: t('Sanctions et recours'), to: chemin('sanctions') }}>
          {v.sanctions.length ? v.sanctions.map((s) => <Li key={s.id} icone="gavel" ton={s.niveau >= 3 ? 'red' : 'or'} t={tf('{id} · niveau {n}', { id: s.id, n: s.niveau })} s={s.titre} to={chemin('sanctions', { id: s.id })} />) : <p className="card-s">{t('Aucune sanction au dossier.')}</p>}
        </Panel>
      )}
      {onglet === 'journal' && (
        <Panel titre={t('Journal')} icone="scroll-text" className="mt16">
          <Historique l={v.journal} />
        </Panel>
      )}
      {peutProposer && (
        <div className="btns mt16">
          <button type="button" className="btn secondary" onClick={() => setFeuille(true)}>
            <Icone nom="gavel" taille={18} />
            <span>{t('Proposer une sanction')}</span>
          </button>
        </div>
      )}
      <DecisionMotivee
        ouverte={feuille}
        fermer={() => setFeuille(false)}
        titre={tf('Proposer une sanction pour {nom}', { nom: v.nom })}
        resume={t('La proposition ouvre un dossier en Sanctions et recours : la Médiation ou la Direction décide, motif écrit, recours une fois.')}
        libelle="Proposer"
        icone="gavel"
        envoyer={async (m) => {
          const r = await source.acteurs.proposerSanction({ acteurId: v.id, acteur: v.nom, espace: 'vendeur', zone: v.zone, niveau: Number(niveau) as Niveau, motif: m, origine: tf('Proposée depuis la fiche vendeur · {role}', { role: role }) })
          return r.ok ? { ok: true } : r
        }}
        apres={() => {
          setFait(t('Sanction proposée : le dossier attend la décision de la Médiation.'))
          lecture.relire()
        }}
      >
        <Radios nom="Niveau proposé" valeur={niveau} choisir={setNiveau} options={[{ v: '1', t: 'Avertissement' }, { v: '2', t: 'Visibilité ou accès réduit' }, { v: '3', t: 'Suspension' }]} />
      </DecisionMotivee>
      <Plie titre={t('Vente hors de BelivaY')}>{t('Un vendeur peut vendre aussi hors de BelivaY : c’est autorisé. Seul le contournement d’une commande BelivaY (contact direct avec un client) est interdit.')}</Plie>
    </div>
  )
}

function OffresPanel({ v, className }: { v: FicheVendeur; className?: string }) {
  const { t } = usePreferences()
  const ETAT: Record<FicheVendeur['offres'][number]['etat'], [string, 'green' | 'ink' | 'amber' | 'red']> = { publiee: ['Publiée', 'green'], brouillon: ['Brouillon', 'ink'], moderation: ['En modération', 'amber'], depubliee: ['Dépubliée', 'red'] }
  return (
    <Panel titre={t('Offres')} icone="package" className={className} a={{ t: t('Modération des offres'), to: chemin('moderation') }}>
      {v.offres.map((o, i) => (
        <div key={i} className="row" style={{ gap: 12, padding: '8px 0', borderTop: i ? '1px solid var(--line)' : undefined }}>
          <div className="grow">
            <b className="t14">{o.titre}</b>
            <div className="t12 c3">
              {o.prix ? `${F(o.prix)} F · ` : ''}
              {o.note}
            </div>
          </div>
          <St t={t(ETAT[o.etat][0])} ton={ETAT[o.etat][1]} />
        </div>
      ))}
      <div className="t12 c3 mt8">{t('La console ne publie jamais une offre à la place du vendeur : la saisie assistée est validée par le vendeur sur son téléphone.')}</div>
    </Panel>
  )
}
function LitigesPanel({ v, className }: { v: FicheVendeur; className?: string }) {
  const { t } = usePreferences()
  return (
    <Panel titre={t('Litiges et versements')} icone="scale" className={className}>
      {v.litigesListe.map((x) => (
        <Li key={x.id} icone="scale" ton="red" t={x.titre} s={x.sous} to={chemin('litige', { id: x.id })} />
      ))}
      {!v.litigesListe.length && <p className="card-s">{t('Aucun litige ouvert.')}</p>}
      {v.versements.map((x, i) => (
        <Li key={i} icone="banknote" ton="green" t={x.titre} s={x.sous} to={chemin('versements')} />
      ))}
    </Panel>
  )
}
