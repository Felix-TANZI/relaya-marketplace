// Page ajoutée « Qualité des acteurs » (S3, ajout partenaire) : le Trust Score de TOUS les acteurs au même endroit —
// vendeurs, entreprises de livraison, livreurs, points relais — avec classement, tendance sur 30 jours, alertes de
// baisse (VD-CTRL-RENFORCE : perte de N points en une semaine, ou score sous le seuil d'alerte), lien vers la fiche de
// l'acteur dans la console et vers ses sanctions. Lecture seule : la décision reste en Paliers et en Sanctions.
// Opérations : leurs zones ; export CSV signé pour les rôles qui exportent.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { ExportSigne } from '../../composants/ExportSigne'
import { Icone } from '../../composants/Icone'
import { Perimetre } from '../../composants/Perimetre'
import { Choix, Courbe, Kpi, Li, Panel, Pill, Recherche, Table, correspond } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { ActeurQualite } from '../../donnees/domaines/acteurs'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { useFonctions } from './fonctions-page'
import { usePreferences } from '../../preferences'
import { useHorloge, useRouteOuverte } from '../../session'
import { P3, alerteBaisse, seuilDe, tendance, type EspaceTrust } from '../ADM-06/calculs/regles'
import { Av, BandeauErreur, Chargement, Quand, Regles, Score, Tier, useErreur } from '../ADM-06/commun'

const ESPACE: Record<EspaceTrust, [string, string]> = { vendeur: ['Vendeur', 'store'], entreprise: ['Entreprise', 'truck'], livreur: ['Livreur', 'bike'], relais: ['Point relais', 'package-check'] }
type Tri = 'score' | 'tendance' | 'alerte'

export default function Qualite() {
  const { t, tf } = usePreferences()
  const maintenant = useHorloge()
  const ouverte = useRouteOuverte()
  const lecture = useLecture(() => source.acteurs.qualite(), [])
  const erreur = useErreur(lecture.erreur)
  const [espace, setEspace] = useState<'tous' | EspaceTrust>('tous')
  const [tri, setTri] = useState<Tri>('alerte')
  const [q, setQ] = useState('')
  const l = (lecture.donnees ?? []).map((a) => ({ ...a, tendance30: tendance(a.historique, 30), alerte: alerteBaisse(a.historique) }))
  type Ligne = (typeof l)[number]
  const rang = (a: Ligne) => (a.alerte === 'chute' ? 0 : a.alerte === 'sous_seuil' ? 1 : 2)
  const liste = l
    .filter((a) => (espace === 'tous' || a.espace === espace) && correspond(q, a.nom, a.organisation, a.zone))
    .sort((a, b) => (tri === 'score' ? (b.score ?? -1) - (a.score ?? -1) : tri === 'tendance' ? a.tendance30 - b.tendance30 : rang(a) - rang(b) || (a.score ?? 999) - (b.score ?? 999)))
  const alertes = l.filter((a) => a.alerte)
  const fonctions = useFonctions([
    { verbe: 'Revoir', n: alertes.length, unite: ['score en baisse', 'scores en baisse'], icone: 'trending-down', alerte: alertes.length > 0, onClick: () => setTri('alerte') },
    { verbe: 'Décider', n: null, unite: ['palier', 'paliers'], icone: 'trophy', route: 'paliers' },
    { verbe: 'Sanctionner', n: null, unite: ['acteur', 'acteurs'], icone: 'gavel', route: 'sanctions' },
  ])
  const lienFiche = (a: ActeurQualite) => (ouverte(a.route) ? chemin(a.route, a.params) : null)
  return (
    <Ecran
      route="qualite"
      kicker={<Quand le={maintenant} />}
      fonctions={fonctions}
      actions={
        <>
          <ExportSigne
            nom="qualite-acteurs.csv"
            objet="Qualité des acteurs"
            entetes={['acteur', 'espace', 'zone', 'trust_score', 'tendance_30j', 'alerte']}
            lignes={() => liste.map((a) => [a.nom, a.espace, a.zone, a.score, a.tendance30, a.alerte ?? ''])}
          />
          {ouverte('paliers') && (
            <Link className="btn secondary" to={chemin('paliers')}>
              <Icone nom="gauge" taille={18} />
              <span>{t('Paliers à valider')}</span>
            </Link>
          )}
        </>
      }
    >
      <Perimetre route="qualite" />
      {erreur && <BandeauErreur quoi="La qualité des acteurs" relire={lecture.relire} />}
      <div className="s3-g4">
        <Kpi k={t('Acteurs suivis')} v={l.length} s={(['vendeur', 'entreprise', 'livreur', 'relais'] as const).map((e) => `${l.filter((a) => a.espace === e).length} ${t(ESPACE[e][0]).toLowerCase()}`).join(' · ')} icone="activity" ton="night" />
        <Kpi k={t('Alertes de baisse')} v={l.filter((a) => a.alerte === 'chute').length} s={tf('Perte d’au moins {n} points en 7 jours', { n: P3.alerteBaissePoints })} icone="trending-down" iton="red" />
        <Kpi k={t('Sous le seuil d’alerte')} v={l.filter((a) => a.alerte === 'sous_seuil').length} s={tf('Score sous {n} : contrôle renforcé', { n: P3.alerteSous })} icone="triangle-alert" iton="amber" />
        <Kpi k={t('Vetos')} v={l.filter((a) => a.veto).length} s={tf('Score plafonné à {v} ; dossier de sanction', { v: P3.veto })} icone="shield-alert" iton="red" />
      </div>
      {alertes.length > 0 && (
        <Panel titre={t('Alertes de baisse')} icone="bell-ring" className="mt16">
          {alertes.map((a) => (
            <Li key={a.id} icone={a.alerte === 'chute' ? 'trending-down' : 'triangle-alert'} ton={a.alerte === 'chute' ? 'red' : 'amber'} t={`${a.nom} · ${t(ESPACE[a.espace][0])}`} s={a.alerte === 'chute' ? tf('{d} points en 7 jours · score {s}', { d: String(tendance(a.historique, 7)).replace('.', ','), s: String(a.score).replace('.', ',') }) : tf('Score {s}, sous {n}', { s: String(a.score).replace('.', ','), n: P3.alerteSous })} to={lienFiche(a) ?? undefined} />
          ))}
        </Panel>
      )}
      <div className="mt16">
        <Table
          cle={(a) => a.id}
          rows={liste}
          legende={t('Trust Score des acteurs')}
          ligneCls={(a) => (a.alerte === 'chute' ? 'bad' : a.alerte ? 'warn' : undefined)}
          outils={
            <>
              <Recherche q={q} setQ={setQ} placeholder={t('Acteur, organisation, zone…')} aria={t('Rechercher un acteur')} />
              <Choix forme="chips" aria={t('Espace')} actif={espace} choisir={setEspace} items={[{ id: 'tous' as const, t: t('Tous'), n: l.length }, ...(['vendeur', 'entreprise', 'livreur', 'relais'] as const).map((e) => ({ id: e, t: t(ESPACE[e][0]), n: l.filter((a) => a.espace === e).length }))]} />
              <Choix forme="seg" aria={t('Tri')} actif={tri} choisir={setTri} items={[{ id: 'alerte' as const, t: t('Alertes d’abord') }, { id: 'score' as const, t: t('Score') }, { id: 'tendance' as const, t: t('Tendance') }]} />
            </>
          }
          vide={<p className="card-s" style={{ padding: 16 }}>{t('Aucun acteur ne correspond.')}</p>}
          pied={<span>{tf('{n} acteur(s) · tendance = écart entre aujourd’hui et il y a 30 jours', { n: liste.length })}</span>}
          cols={[
            {
              k: 'a',
              t: t('Acteur'),
              main: true,
              rendu: (a) => {
                const f = lienFiche(a)
                const c = (
                  <span className="row" style={{ gap: 10 }}>
                    <Av nom={a.nom} icone={a.espace === 'vendeur' ? undefined : ESPACE[a.espace][1]} taille={34} />
                    <span>
                      <b className="t14" style={{ display: 'block' }}>
                        {a.nom}
                      </b>
                      <span className="t12 c3">{a.organisation ?? t(ESPACE[a.espace][0])}</span>
                    </span>
                  </span>
                )
                return f ? <Link to={f}>{c}</Link> : c
              },
            },
            { k: 'e', t: t('Espace'), rendu: (a) => <Pill sm>{t(ESPACE[a.espace][0])}</Pill> },
            { k: 'z', t: t('Zone'), rendu: (a) => a.zone },
            { k: 's', t: t('Trust Score'), rendu: (a) => <Score v={a.score} seuil={a.palier ? seuilDe(a.palier === 'bronze' ? 'argent' : a.palier === 'nouveau' ? 'confirme' : a.palier, a.espace) : null} taille={34} /> },
            { k: 'p', t: t('Palier'), rendu: (a) => (a.palier ? <Tier palier={a.palier} /> : <span className="t12 c3">{t(a.score === null ? 'départ neutre' : '—')}</span>) },
            {
              k: 't',
              t: t('Tendance 30 j'),
              rendu: (a) =>
                a.historique.length > 1 ? (
                  <span className="row" style={{ gap: 8 }}>
                    <Courbe valeurs={a.historique} l={70} h={24} couleur={a.tendance30 < 0 ? 'var(--red)' : 'var(--green)'} />
                    <span className={a.tendance30 < 0 ? 's3-tend-baisse' : 's3-tend-hausse'}>{(a.tendance30 >= 0 ? '+' : '') + String(a.tendance30).replace('.', ',')}</span>
                  </span>
                ) : (
                  '—'
                ),
            },
            { k: 'l', t: t('Alerte'), rendu: (a) => (a.alerte ? <Pill sm dot ton={a.alerte === 'chute' ? 'red' : 'amber'}>{t(a.alerte === 'chute' ? 'Baisse rapide' : 'Sous le seuil')}</Pill> : a.veto ? <Pill sm ton="red">VETO</Pill> : '—') },
            {
              k: 'x',
              t: t('Sanctions'),
              cls: 'r',
              rendu: (a) =>
                ouverte('sanctions') ? (
                  <Link to={chemin('sanctions', { acteur: a.id })} aria-label={tf('Sanctions de {nom}', { nom: a.nom })}>
                    {a.sanctionsOuvertes ? <b className="cor">{a.sanctionsOuvertes}</b> : '0'} <Icone nom="chevron-right" taille={14} />
                  </Link>
                ) : (
                  a.sanctionsOuvertes
                ),
            },
          ]}
        />
      </div>
      {!lecture.donnees && !erreur && <Chargement />}
      <Regles
        liste={[
          ['ADM-TSC-01', 'Départ au neutre (lissage bayésien) ; un événement pèse moins avec l’âge.'],
          ['ADM-TSC-04', tf('Baisse maximale de {n} points par recalcul ; critères gelés après {g} jours d’inactivité.', { n: P3.baisseMax, g: P3.gelInactifJ })],
          ['VD-CTRL-RENFORCE', tf('Contrôle renforcé si le score passe sous {s} ou perd {n} points en une semaine.', { s: P3.alerteSous, n: P3.alerteBaissePoints })],
          ['ADM-TSC-06', 'Aucune rétrogradation automatique : le système propose, un humain valide en Paliers.'],
          ['ADM-P12R-03', 'Une baisse ou une alerte ouvre une revue, jamais une sanction automatique.'],
        ]}
      />
    </Ecran>
  )
}
