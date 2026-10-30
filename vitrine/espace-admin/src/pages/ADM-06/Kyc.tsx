// ADM-P09 · Revue KYC (prototype route('kyc') : en-tête, 4 indicateurs, onglets À revoir · Complément demandé ·
// Approuvées · Rejetées, filtres par acteur et tri fixe, file à gauche et dossier à droite — visionneuse des pièces,
// résultats automatiques, déduplication interne, barre de décision — puis « Règles appliquées sur cet écran »).
// Une seule file pour tous les acteurs (vendeurs, relais, entreprises, livreurs ; clients sur alerte), triée par
// échéance puis ancienneté (jamais modifiable). Chaque pièce s'ouvre par lien court journalisé, sous filigrane
// (PieceIdentite) ; « Approuver » reste inactif tant qu'une pièce n'est pas ouverte ; rejet avec raison et motif en
// clair par pièce ; complément demandé (échéance suspendue). Faux document : veto et dossier de sanction (ADM-P12).
// Conflit d'intérêts (A-33) : Tonton PG (Franck Penga) ne se décide pas sous le compte de Franck.
import { LienPoste } from '../../composants/poste/LienPoste'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { PieceIdentite } from '../../composants/PieceIdentite'
import { Choix, Note, Panel, Pill, Props } from '../../composants/prototype'
import { useFonctionsS } from '../ADM-03/kit'
import { chemin } from '../../config/pages'
import type { DossierKyc, EspaceActeur, NaturePiece, PieceKyc, RaisonRejet } from '../../donnees/domaines/acteurs'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge, usePeut } from '../../session'
import { P3, approuvable, doublonAutorise, heuresOuvreesRestantes } from './calculs/regles'
import { Ai, BandeauErreur, BandeauOk, Cases, Chargement, Controles, Historique, Item, Kick, NoteConflit, NoteLecture, Partage, Puce, Quand, Radios, Regles, Seen, Tete, useErreur, Av } from './commun'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { CartePhoto } from '../SURVEILLER/Photo'

export const NATURE: Record<NaturePiece, string> = {
  cni_recto: 'CNI · recto',
  cni_verso: 'CNI · verso',
  selfie_video: 'Selfie vidéo (preuve de vie)',
  permis: 'Permis de conduire',
  carte_grise: 'Carte grise',
  rccm: 'Registre du commerce (RCCM)',
  niu: 'Numéro d’identifiant unique (NIU)',
  mint: 'Autorisation de transport (MINT)',
  assurance: 'Attestation d’assurance',
  local: 'Photos du local',
}
const ESPACE: Record<EspaceActeur, [string, string]> = { vendeur: ['Vendeur', 'store'], relais: ['Point relais', 'package-check'], entreprise: ['Entreprise', 'truck'], livreur: ['Livreur', 'bike'], client: ['Client', 'user'] }
const ETAT_PIECE: Record<PieceKyc['etat'], [string, 'green' | 'amber' | 'red' | 'ink']> = { a_revoir: ['À revoir', 'amber'], auto_ok: ['Vérifiée automatiquement', 'green'], approuvee: ['Approuvée', 'green'], rejetee: ['Rejetée', 'red'], complement: ['Complément demandé', 'amber'] }
const ONGLETS = [
  { id: 'a_revoir', t: 'À revoir', icone: 'inbox' },
  { id: 'complement', t: 'Complément demandé', icone: 'file-clock' },
  { id: 'approuve', t: 'Approuvées', icone: 'badge-check' },
  { id: 'rejete', t: 'Rejetées', icone: 'circle-x' },
] as const
type Onglet = (typeof ONGLETS)[number]['id']
const RAISONS: { v: RaisonRejet; t: string; s?: string }[] = [
  { v: 'non_conforme', t: 'Ne correspond pas à la personne ou au compte', s: 'L’acteur reprend la pièce' },
  { v: 'illisible', t: 'Pièce floue ou illisible' },
  { v: 'expiree', t: 'Pièce expirée' },
  { v: 'incoherente', t: 'Pièce incohérente avec le compte (catégorie, véhicule, nom)' },
  { v: 'faux_document', t: 'Faux document', s: 'Veto : score plafonné, exclusion et liste noire proposées à quatre yeux' },
]

export default function Kyc() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const maintenant = useHorloge()
  const peut = usePeut('kyc.decider')
  const lecture = useLecture(() => source.acteurs.kyc(), [])
  const erreur = useErreur(lecture.erreur)
  const onglet = (ONGLETS.some((o) => o.id === params.get('onglet')) ? params.get('onglet') : 'a_revoir') as Onglet
  const [filtre, setFiltre] = useState<'tous' | EspaceActeur>('tous')
  const [feuille, setFeuille] = useState<'approuver' | 'rejeter' | 'complement' | null>(null)
  const [fait, setFait] = useState<string | null>(null)
  const tous = useMemo(() => lecture.donnees ?? [], [lecture.donnees])
  // Tri fixe côté source et ici : échéance, puis ancienneté.
  const liste = tous.filter((d) => d.etat === onglet && (filtre === 'tous' || d.espace === filtre)).sort((a, b) => (a.echeance ?? Infinity) - (b.echeance ?? Infinity) || a.deposeLe - b.deposeLe)
  const choisi = tous.find((d) => d.id === params.get('id') && d.etat === onglet) ?? liste[0] ?? null
  const aller = (p: Record<string, string | null>) => {
    const n = new URLSearchParams(params)
    for (const [k, v] of Object.entries(p)) if (v === null) n.delete(k)
    else n.set(k, v)
    return chemin('kyc') + (n.toString() ? '?' + n.toString() : '')
  }
  const aRevoir = tous.filter((d) => d.etat === 'a_revoir')
  const piecesARevoir = aRevoir.reduce((n, d) => n + d.pieces.filter((p) => p.etat === 'a_revoir').length, 0)
  const compte = (e: EspaceActeur) => tous.filter((d) => d.etat === onglet && d.espace === e).length
  const naviguer = useNavigate()
  const premier = (f: (d: DossierKyc) => boolean, o: Onglet) => () => {
    const d = tous.find(f)
    naviguer(aller({ onglet: o, id: d?.id ?? null }), { replace: true })
  }
  const fonctions = useFonctionsS('kyc', [
    { verbe: 'Valider', n: aRevoir.length, unite: ['identité', 'identités'], icone: 'id-card', onClick: premier((d) => d.etat === 'a_revoir', 'a_revoir'), geste: true, si: peut, detail: piecesARevoir ? tf('{n} pièces à ouvrir', { n: piecesARevoir }) : undefined },
    { verbe: 'Trancher', n: aRevoir.filter((d) => d.doublon).length, unite: ['doublon', 'doublons'], icone: 'copy', onClick: premier((d) => d.etat === 'a_revoir' && !!d.doublon, 'a_revoir'), geste: true, si: peut, alerte: true },
    { verbe: 'Relancer', n: tous.filter((d) => d.etat === 'complement').length, unite: ['complément', 'compléments'], icone: 'file-clock', onClick: premier((d) => d.etat === 'complement', 'complement') },
    { verbe: 'Photographier', n: aRevoir.filter((d) => d.pieces.some((x) => x.nature === 'local' && x.etat === 'a_revoir')).length, unite: ['local', 'locaux'], icone: 'camera', onClick: premier((d) => d.pieces.some((x) => x.nature === 'local'), 'a_revoir') },
  ])

  return (
    <Ecran
      route="kyc"
      kicker={<Quand le={maintenant} />}
      fonctions={lecture.donnees ? fonctions : undefined}
      actions={
        <>
          <LienPoste genre="kyc" />
          <Link className="btn secondary" to={chemin('journal', { action: 'kyc.approuver' })}>
            <Icone nom="scroll-text" taille={18} />
            <span>{t('Journal des décisions KYC')}</span>
          </Link>
        </>
      }
    >
      {erreur && <BandeauErreur quoi="La file KYC" relire={lecture.relire} />}
      {fait && (
        <BandeauOk
          bouton={
            <Link className="btn secondary sm" to={chemin('journal')}>
              <Icone nom="scroll-text" taille={16} />
              <span>{t('Voir au journal')}</span>
            </Link>
          }
        >
          {fait}
        </BandeauOk>
      )}
      <Choix forme="tabs" aria={t('Dossiers KYC')} className="mt16" actif={onglet} items={ONGLETS.map((o) => ({ id: o.id, t: t(o.t), icone: o.icone, n: tous.filter((d) => d.etat === o.id).length, to: aller({ onglet: o.id, id: null }) }))} />
      <div className="row wrap mt12" style={{ gap: 6 }}>
        <Choix
          forme="chips"
          aria={t('Filtrer par acteur')}
          className="a-segs"
          actif={filtre}
          choisir={setFiltre}
          items={[{ id: 'tous' as const, t: t('Tous les acteurs'), icone: 'users', n: tous.filter((d) => d.etat === onglet).length }, ...(['vendeur', 'relais', 'entreprise', 'livreur', 'client'] as const).map((e) => ({ id: e, t: t(ESPACE[e][0]), n: compte(e) }))]}
        />
        <span className="grow"></span>
        <span className="lock t12 c3 b7">
          <Icone nom="arrow-down-narrow-wide" taille={15} /> {t('Tri : échéance, puis ancienneté')}
        </span>
      </div>
      {!lecture.donnees && !erreur ? (
        <Chargement />
      ) : (
        <Partage
          file={
            <>
              <Kick>{tf('{onglet} · {n} dossier(s)', { onglet: t(ONGLETS.find((o) => o.id === onglet)!.t), n: liste.length })}</Kick>
              {liste.map((d) => (
                <ItemKyc key={d.id} d={d} on={d.id === choisi?.id} to={aller({ id: d.id })} maintenant={maintenant} />
              ))}
              {!liste.length && <p className="card-s">{t('Aucun dossier dans cet onglet.')}</p>}
            </>
          }
          puces={liste.map((d) => (
            <Puce key={d.id} to={aller({ id: d.id })} on={d.id === choisi?.id}>
              {d.acteur}
            </Puce>
          ))}
        >
          {choisi ? (
            <Dossier d={choisi} peut={peut} maintenant={maintenant} ouvrir={setFeuille} />
          ) : (
            <div className="empty">
              <div className="ei">
                <Icone nom="inbox" taille={26} />
              </div>
              <h3>{t('Aucun dossier ici')}</h3>
              <p>{t('Les pièces déposées par les vendeurs, relais, entreprises et livreurs arrivent dans cette file dès que la vérification automatique a un doute.')}</p>
            </div>
          )}
        </Partage>
      )}
      <Regles
        liste={[
          ['ADM-P09R-01', 'Vérification automatique rapide ; un doute est tranché ici sous 48 heures ouvrées (dimanche exclu).'],
          ['ADM-P09R-02', 'OCR et déduplication interne (CNI, appareil, numéro) avant toute décision.'],
          ['ADM-P09R-03', 'Un appareil porte au plus 2 comptes vendeur et 1 compte livreur.'],
          ['ADM-P09R-04', 'Relais et entreprise : jamais activés sans KYC vérifié ; visite pour un relais et pour le palier Or.'],
          ['ADM-P09R-05', 'Un rejet a toujours un motif en clair, visible par l’acteur.'],
          ['ADM-SEC-04', 'Chaque ouverture d’une pièce d’identité est elle-même journalisée.'],
          ['ADM-CACHEE-24', 'Personne ne valide une action qui le concerne ; le Support ne tient ni la KYC ni la modération.'],
        ]}
      />
      {choisi && (
        <Feuilles
          key={choisi.id}
          d={choisi}
          feuille={feuille}
          fermer={() => setFeuille(null)}
          fait={(m) => {
            setFait(m)
            lecture.relire()
          }}
        />
      )}
    </Ecran>
  )
}

function ItemKyc({ d, on, to, maintenant }: { d: DossierKyc; on: boolean; to: string; maintenant: number }) {
  const { t, tf } = usePreferences()
  const doute = d.pieces.find((p) => p.etat === 'a_revoir' || p.etat === 'complement' || p.etat === 'rejetee')
  const reste = d.echeance ? heuresOuvreesRestantes(maintenant, d.echeance) : null
  return (
    <Item
      to={to}
      on={on}
      late={reste !== null && reste < 0}
      av={<Av icone={ESPACE[d.espace][1]} />}
      t={d.acteur}
      pill={<Pill sm>{t(ESPACE[d.espace][0])}</Pill>}
      s={d.organisation}
      x={doute ? `${t(NATURE[doute.nature])} : ${doute.doute ?? doute.motif ?? ''}` : d.decision?.quoi}
      xTon={d.etat === 'approuve' ? 'green' : d.etat === 'rejete' ? 'red' : 'amber'}
      d={d.echeance ? <>{t('Échéance')} <Quand le={d.echeance} /></> : d.etat === 'complement' ? t('Échéance suspendue') : d.decision ? <Quand le={d.decision.le} /> : null}
      r={reste === null ? null : reste < 0 ? tf('dépassée de {n} h', { n: -reste }) : tf('reste {n} h ouvrées', { n: reste })}
    />
  )
}

function Dossier({ d, peut, maintenant, ouvrir }: { d: DossierKyc; peut: boolean; maintenant: number; ouvrir: (f: 'approuver' | 'rejeter' | 'complement') => void }) {
  const { t, tf } = usePreferences()
  const consulter = usePeut('piece.consulter')
  const vues = d.pieces.filter((p) => p.vue).length
  const pret = approuvable(d.pieces)
  const reste = d.echeance ? heuresOuvreesRestantes(maintenant, d.echeance) : null
  const doublonOk = d.doublon ? doublonAutorise(d.doublon.similarite, d.doublon.rolesDeclares) : true
  return (
    <>
      <Panel>
        <Tete
          av={<Av icone={ESPACE[d.espace][1]} taille={56} />}
          nom={d.acteur}
          sous={<>{tf('{organisation} · titulaire {titulaire}', { organisation: d.organisation, titulaire: d.titulaire })} · {t('déposé')} <Quand le={d.deposeLe} /></>}
          pills={
            <>
              <Pill sm>{t(ESPACE[d.espace][0])}</Pill>
              <Pill sm dot ton={d.etat === 'approuve' ? 'green' : d.etat === 'rejete' ? 'red' : d.etat === 'complement' ? 'or' : 'amber'}>
                {t(ONGLETS.find((o) => o.id === d.etat)!.t)}
              </Pill>
            </>
          }
          droite={
            <>
              <div className="t12 c3 b7">{t('Échéance de revue')}</div>
              <div className="b8 t15">{d.echeance ? <Quand le={d.echeance} /> : d.etat === 'complement' ? t('suspendue') : '—'}</div>
              {reste !== null && <div className={'t12 b7 ' + (reste < 0 ? 'cr' : 'cor')}>{reste < 0 ? tf('dépassée de {n} h', { n: -reste }) : tf('reste {n} h ouvrées', { n: reste })}</div>}
            </>
          }
        />
        {d.conflit && <NoteConflit />}
        <div className="s3-pieces" aria-label={t('Visionneuse des pièces')}>
          {d.pieces.map((p) => (
            <div key={p.id}>
              <PieceIdentite dossier={d.id} piece={p.id} nature={p.nature} />
              <div className="s3-piece-st">
                <Pill sm ton={ETAT_PIECE[p.etat][1]}>
                  {t(ETAT_PIECE[p.etat][0])}
                </Pill>
                <span className={p.vue ? 's3-vue' : 's3-nonvue'}>
                  <Icone nom={p.vue ? 'eye' : 'eye-off'} taille={14} /> {t(p.vue ? 'Ouverte par vous' : 'Pas encore ouverte')}
                </span>
              </div>
              {(p.doute || p.motif) && <div className="t12 c2 mt4">{p.motif ?? p.doute}</div>}
            </div>
          ))}
        </div>
        {!consulter && <NoteLecture texte="Votre rôle ne consulte pas les pièces d’identité : seuls leur état et les résultats automatiques sont affichés." />}
      </Panel>
      {consulter && <PhotoDossier d={d} />}
      <div className="s3-g2">
        <Panel titre={t('Résultats automatiques')} icone="scan-face">
          {d.visage !== null && (
            <>
              <div className="t12 c3 b7">{t('Comparaison du selfie vidéo et de la photo de la CNI')}</div>
              <div className="admk-gauge" role="img" aria-label={tf('Visage {v}, seuil {s}', { v: d.visage.toFixed(2).replace('.', ','), s: P3.seuilVisage.toFixed(2).replace('.', ',') })}>
                <i className={d.visage >= P3.seuilVisage ? 'ok' : ''} style={{ width: `${d.visage * 100}%` }}></i>
                <b style={{ left: `${P3.seuilVisage * 100}%` }} data-l={tf('seuil {s}', { s: P3.seuilVisage.toFixed(2).replace('.', ',') })}></b>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="b8 t19">{d.visage.toFixed(2).replace('.', ',')}</span>
                <Pill sm dot ton={d.visage >= P3.seuilVisage ? 'green' : 'amber'}>
                  {t(d.visage >= P3.seuilVisage ? 'Même personne' : 'Doute : revue humaine')}
                </Pill>
              </div>
            </>
          )}
          <div className="mt12">
            <Controles l={d.controles} />
          </div>
        </Panel>
        <Panel titre={t('Déduplication interne')} icone="copy">
          <Controles l={d.dedup} />
          {d.doublon && (
            <Seen k={t('Le doublon trouvé')} className="mt10">
              {d.doublon.autreCompte} · {tf('visage {v}', { v: d.doublon.similarite.toFixed(2).replace('.', ',') })} · {t(d.doublon.rolesDeclares ? 'chaque rôle déclaré' : 'rôle non déclaré')}
              <div className="mt8">
                <Pill sm dot ton={doublonOk ? 'green' : 'red'}>
                  {t(doublonOk ? 'Doublon autorisé : même personne, rôles déclarés' : 'Prête-nom : refus et transmission à la fraude')}
                </Pill>
              </div>
            </Seen>
          )}
          <div className="t12 c3 mt10">{t('Pas d’API publique ANTIC : l’OCR et la déduplication interne sont faits pour chaque pièce, avant toute décision.')}</div>
        </Panel>
      </div>
      {d.etat === 'a_revoir' && (
        <div className="panel mt16" style={{ boxShadow: 'var(--shadow-card), inset 3px 0 0 var(--or)' }}>
          {d.proposition && <Ai titre="Proposition de l’assistant" texte={d.proposition.texte} confiance={d.proposition.confiance} />}
          {d.conflit ? (
            <NoteConflit />
          ) : peut ? (
            <>
              <div className="admk-dec mt14">
                <button type="button" className="btn primary" aria-disabled={!pret} data-raison={pret ? undefined : t('Ouvrez chaque pièce avant d’approuver.')} title={pret ? undefined : t('Ouvrez chaque pièce avant d’approuver.')} onClick={() => pret && ouvrir('approuver')}>
                  <Icone nom="check" taille={18} />
                  <span>{t('Approuver les pièces')}</span>
                </button>
                <button type="button" className="btn secondary" onClick={() => ouvrir('complement')}>
                  <Icone nom="file-plus-2" taille={18} />
                  <span>{t('Demander un complément')}</span>
                </button>
                <button type="button" className="btn danger" onClick={() => ouvrir('rejeter')}>
                  <Icone nom="x" taille={18} />
                  <span>{t('Rejeter avec motif')}</span>
                </button>
                <span className="sp"></span>
                <span className="lock t12 c3 b7">
                  <Icone nom="eye" taille={14} /> {tf('{v} pièce(s) ouverte(s) sur {n}', { v: vues, n: d.pieces.length })}
                </span>
              </div>
              <div className="t12 c3 mt10">{pret ? t('Chaque décision garde l’image vue, le résultat automatique et l’auteur.') : t('« Approuver » reste inactif tant qu’une pièce n’est pas ouverte.')}</div>
            </>
          ) : (
            <NoteLecture texte="Votre rôle lit la revue KYC sans décider : la Vérification et la Direction approuvent, rejettent ou demandent un complément (A-01)." />
          )}
        </div>
      )}
      {d.complement && (
        <Panel titre={t('Complément demandé')} icone="file-clock" className="mt16">
          <Seen k={tf('Motif transmis · {par}', { par: d.complement.par })}>
            « {d.complement.motif} » · <Quand le={d.complement.le} />
          </Seen>
          <Chk2 />
        </Panel>
      )}
      {d.decision && (
        <Panel titre={t('Décision')} icone="gavel" className="mt16">
          <Props paires={[[t('Décision'), d.decision.quoi], [t('Auteur'), d.decision.par], [t('Date'), <Quand key="q" le={d.decision.le} />], [t('Motif en clair'), d.decision.motif ?? '—']]} />
          {d.decision.quoi.includes('veto') && (
            <div className="btns mt12">
              <Link className="btn secondary" to={chemin('sanctions')}>
                <Icone nom="gavel" taille={18} />
                <span>{t('Ouvrir le dossier de sanction')}</span>
              </Link>
            </div>
          )}
        </Panel>
      )}
      <div className="s3-g2">
        <Panel titre={t('Historique de la pièce')} icone="history">
          <Historique l={d.historique} />
        </Panel>
        <Panel titre={t('Ce que voit chaque partie')} icone="eye-off">
          <Note ton="ink" icone="eye-off">
            {d.visiblePar}
          </Note>
          <div className="t12 c3 mt10">{t('Les pièces ne se téléchargent pas : visionneuse seulement, filigrane nominatif ; chaque ouverture est journalisée.')}</div>
        </Panel>
      </div>
    </>
  )
}

function Chk2() {
  const { t } = usePreferences()
  return <div className="t12 c3 mt10">{t('L’acteur voit la pièce à reprendre, ce motif et un bouton « Renvoyer » ; l’échéance repart à la réception.')}</div>
}

function Feuilles({ d, feuille, fermer, fait }: { d: DossierKyc; feuille: 'approuver' | 'rejeter' | 'complement' | null; fermer: () => void; fait: (m: string) => void }) {
  const { t, tf } = usePreferences()
  const [piece, setPiece] = useState(d.pieces.find((p) => p.etat === 'a_revoir')?.id ?? d.pieces[0]?.id ?? '')
  const [raison, setRaison] = useState<RaisonRejet>('non_conforme')
  const [pieces, setPieces] = useState<string[]>(d.pieces.filter((p) => p.etat === 'a_revoir').map((p) => p.id))
  const vu = (
    <div className="s3-g2" style={{ marginTop: 0 }}>
      <Seen k={tf('Ce que voit {acteur}', { acteur: d.acteur })}>{t('La pièce concernée, ce motif, et le bouton « Renvoyer » dans son espace.')}</Seen>
      <Seen k={t('Ce que voit l’organisation')}>{t('Le statut de vérification seulement ; jamais l’image ni le motif détaillé.')}</Seen>
    </div>
  )
  return (
    <>
      <DecisionMotivee
        ouverte={feuille === 'approuver'}
        fermer={fermer}
        titre={tf('Approuver les pièces de {acteur}', { acteur: d.acteur })}
        resume={tf('{n} pièce(s) ouverte(s) par vous. La décision garde l’image vue (empreinte), le résultat automatique et l’auteur ; l’acteur est activé pour ce qui dépendait de ces pièces.', { n: d.pieces.length })}
        libelle="Approuver"
        motif="facultatif"
        envoyer={() => source.acteurs.deciderKyc(d.id, { action: 'approuver' })}
        apres={() => fait(tf('Pièces approuvées · {acteur}. L’espace de l’acteur est prévenu.', { acteur: d.acteur }))}
      />
      <DecisionMotivee
        ouverte={feuille === 'rejeter'}
        fermer={fermer}
        titre={t('Rejeter une pièce avec motif')}
        resume={tf('{acteur} · la pièce seule est rejetée, pas le compte.', { acteur: d.acteur })}
        libelle="Rejeter la pièce"
        icone="x"
        danger
        etiquetteMotif="Motif en clair · visible par l’acteur"
        vu={vu}
        envoyer={(m) => source.acteurs.deciderKyc(d.id, { action: 'rejeter', piece, raison, motif: m })}
        apres={() => fait(raison === 'faux_document' ? t('Pièce rejetée : faux document. Dossier de sanction ouvert (exclusion et liste noire à quatre yeux).') : t('Pièce rejetée. Le motif en clair est envoyé à l’acteur.'))}
      >
        <Radios nom="Pièce rejetée" valeur={piece} choisir={setPiece} options={d.pieces.map((p) => ({ v: p.id, t: NATURE[p.nature] }))} />
        <Radios nom="Raison" valeur={raison} choisir={setRaison} options={RAISONS} />
        {raison === 'faux_document' && (
          <Note ton="red" icone="shield-alert" className="mt10">
            {t('Faux document : veto, dossier de sanction (ADM-P12) avec exclusion et liste noire proposées à quatre yeux. Les critères de détection ne sont jamais communiqués à l’acteur.')}
          </Note>
        )}
      </DecisionMotivee>
      <DecisionMotivee
        ouverte={feuille === 'complement'}
        fermer={fermer}
        titre={t('Demander un complément')}
        resume={tf('{acteur} · l’échéance est suspendue jusqu’à la nouvelle pièce.', { acteur: d.acteur })}
        libelle="Demander le complément"
        icone="file-plus-2"
        etiquetteMotif="Motif en clair · visible par l’acteur"
        vu={vu}
        bloque={pieces.length ? null : t('Cochez au moins une pièce.')}
        envoyer={(m) => source.acteurs.deciderKyc(d.id, { action: 'complement', pieces, motif: m })}
        apres={() => fait(t('Complément demandé : l’acteur reçoit le motif pièce par pièce.'))}
      >
        <Cases legende="Pièces à reprendre" items={d.pieces.map((p) => ({ id: p.id, t: t(NATURE[p.nature]) }))} cochees={pieces} changer={setPieces} />
      </DecisionMotivee>
    </>
  )
}

// Photo complémentaire d'un dossier (reçue par un autre canal, prise en visite) : ajoutée, remplacée ou retirée par qui
// décide la KYC, motif journalisé ; vue des seuls rôles qui consultent les pièces ; jamais publiée hors de la console.
function PhotoDossier({ d }: { d: DossierKyc }) {
  const { t } = usePreferences()
  const decide = usePeut('kyc.decider')
  const l = useLecture(() => source.pilotage.photos(), [d.id])
  return (
    <Panel titre={t('Photo complémentaire du dossier')} icone="image-plus" className="mt16">
      <div className="sv-photos" style={{ marginTop: 0 }}>
        <CartePhoto cible="piece" id={d.id} libelle={`${d.id} · ${d.acteur}`} titre={t('Photo complémentaire')} actuelle={l.donnees?.find((p) => p.cible === 'piece' && p.id === d.id)} peut={decide && !d.conflit} apres={l.relire} />
      </div>
    </Panel>
  )
}
