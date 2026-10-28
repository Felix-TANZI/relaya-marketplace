// ENT-P03 · Contrat et documents : « une fiche, des pièces, un contrat, une grille » (ENT-03-R18). Héros du dossier
// (Approuvée seulement quand toutes les pièces requises sont vérifiées : ENT-DOC-01 ; sinon À compléter, En
// vérification, Pièce rejetée), chaîne d'activation en six étapes avec qui a activé (ENT-RG-R16, ENT-ACT-03), « fixé
// par BelivaY » (palier, plafond, grille, caution 0 F : ENT-PAR-02). Onglets dans l'adresse : Pièces (tri ENT-03-R19,
// motif du rejet, renvoi seulement d'une pièce rejetée, à envoyer ou à renouveler ; aperçu lisible obligatoire,
// PDF ≤ taille_max_piece Mo : ENT-03-R20), Fiche (nom, RCCM, NIU repassent en vérification : ENT-P03R-02), Contrat
// (versions, signataires, lecture, signature par la propriétaire), Grille (lecture seule, révision demandée à
// BelivaY). Propriétaire en écriture ; répartiteur et comptable en lecture ; pièce d'identité du gérant visible de la
// propriétaire seulement (ENT-P03R-03).
import type { LignePdf } from '../../donnees/exports'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { jouer } from '@client/composants/Sons'
import { F } from '@client/i18n/format'
import { Icone } from '../../composants/Icone'
import { NOM_PALIER } from '../../config/libelles'
import { chemin } from '../../config/pages'
import type { ChampFiche, EtapeActivation, FicheEntreprise, Piece, StatutPiece, VersionContrat } from '../../donnees/domaines/contrat'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { PARAMETRES } from '../../calculs/registre'
import { NOM_LIGNE } from '../ENT-05/commun'
import { PARAMETRES_FLOTTE } from '../../calculs/flotte'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles, usePeut, useSession } from '../../session'
import { ChoixFichier, type Fichier } from './ChoixFichier'
import { Chargement, ErreurLecture, useDates, useFeuilleParams, useOnglet } from './outils'
import { Barre, Champ, Choix, Etape, exporterPdf, Hint, Kv, Note, Panel, Pill, Rangee, Table, type Ton, Verrou } from '../../composants/prototype'
import { Ecran } from '../../composants/coque'

const P = PARAMETRES_FLOTTE
const ONGLETS = ['pieces', 'fiche', 'contrat', 'grille'] as const
type Onglet = (typeof ONGLETS)[number]
export const STATUT: Record<StatutPiece, [string, string]> = { refusee: ['Rejetée', 'rouge'], manquante: ['À envoyer', 'alerte'], en_revue: ['En vérification', 'ambre'], expire_bientot: ['À renouveler', 'ambre'], expiree: ['Expirée', 'rouge'], valide: ['Vérifiée', 'ok'], non_exigee: ['Non exigée', ''] }
const ORDRE: StatutPiece[] = ['refusee', 'expiree', 'manquante', 'en_revue', 'expire_bientot', 'valide', 'non_exigee']
const RENVOYABLE: StatutPiece[] = ['refusee', 'manquante', 'expire_bientot', 'expiree']
export const NOM_ETAPE: Record<EtapeActivation['id'], string> = { conformite: 'Conformité validée', zones: 'Zones déclarées', flotte: 'Flotte activée', grille: 'Grille signée', reglement: 'Moyen de règlement vérifié', activation: 'Activation par BelivaY' }
const NOM_VERSION: Record<VersionContrat['genre'], string> = { contrat: 'Contrat de partenariat', lettre_engagement: 'Lettre d’engagement de la phase pilote', grille: 'Grille tarifaire' }
const CHAMPS: [ChampFiche, string][] = [
  ['nomLegal', 'Nom légal'],
  ['rccm', 'RCCM'],
  ['niu', 'NIU'],
  ['responsable', 'Responsable'],
  ['adresse', 'Adresse opérationnelle'],
  ['agence', 'Agence'],
  ['stockageNuit', 'Point de stockage de nuit'],
  ['telephone', 'Téléphone'],
]

/** Héros du dossier : jamais « Approuvée » avec une pièce requise manquante ou non vérifiée (ENT-RG-R50, R51). */
export function dossier(pieces: Piece[]): { titre: string; ton: string; icone: string } {
  const requises = pieces.filter((p) => p.requise !== false)
  if (requises.some((p) => p.statut === 'refusee')) return { titre: 'Pièce rejetée', ton: 'rouge', icone: 'file-warning' }
  if (requises.some((p) => p.statut === 'manquante' || p.statut === 'expiree')) return { titre: 'À compléter', ton: 'ambre', icone: 'file-plus-2' }
  if (requises.some((p) => p.statut === 'en_revue')) return { titre: 'En vérification', ton: 'ambre', icone: 'file-clock' }
  return { titre: 'Approuvée', ton: 'ok', icone: 'badge-check' }
}

function FormPiece({ p, fermer }: { p: Piece; fermer: () => void }) {
  const { t, tf } = usePreferences()
  const { dateHeure } = useDates()
  const [f, setF] = useState<Fichier | null>(null)
  const [envoye, setEnvoye] = useState<Piece | null>(null)
  const [refus, setRefus] = useState<string | null>(null)
  const envoyer = async () => {
    if (!f?.lisible) return
    const r = await source.contrat.envoyerPiece(p.type, { nom: f.nom, taille: f.taille, type: f.type, lisible: f.lisible })
    if (!r.ok) {
      setRefus(t(r.raison === 'taille' ? 'Fichier trop lourd.' : r.raison === 'format' ? 'Format refusé : une photo ou un PDF.' : r.raison === 'illisible' ? 'L’aperçu n’est pas lisible.' : 'Cette pièce ne peut pas être envoyée maintenant.'))
      jouer('erreur')
      return
    }
    jouer('envoi')
    setEnvoye(r.piece)
  }
  if (envoye)
    return (
      <div className="blv-succes" role="status">
        <h2 className="card-t">{t('Pièce envoyée')}</h2>
        <p className="mt10">{tf('« {piece} » est en vérification : vérification automatique en moins de {m} min quand c’est possible, sinon revue humaine avant le {d}.', { piece: p.libelle, m: P.verifAutoMin, d: envoye.revueAvant ? dateHeure(envoye.revueAvant) : '—' })}</p>
        <button type="button" className="btn primary mt16" onClick={fermer}>
          {t('Fermer')}
        </button>
      </div>
    )
  return (
    <div>
      <h2 className="card-t">{tf('Envoyer : {piece}', { piece: p.libelle })}</h2>
      <p className="card-s">{p.prouve}</p>
      {p.motif && (
        <Note ton="red" icone="circle-x" className="mt10">

          {p.motif}

        </Note>
      )}
      <div className="mt14">
        <ChoixFichier accepte="image/*,application/pdf" fichier={f} choisir={setF} libelle={t('Choisir le fichier')} />
      </div>
      {refus && (
        <p className="err mt10" role="alert">
          {refus}
        </p>
      )}
      <div className="btns mt16">
        <button type="button" className="btn primary" disabled={!f?.lisible} onClick={() => void envoyer()}>
          <Icone nom="upload" taille={18} />
          <span>{t('Envoyer la pièce')}</span>
        </button>
        <button type="button" className="btn ghost" onClick={fermer}>
          {t('Annuler')}
        </button>
      </div>
    </div>
  )
}

function FormFiche({ fiche, fermer }: { fiche: FicheEntreprise; fermer: () => void }) {
  const { t } = usePreferences()
  const [v, setV] = useState<Record<ChampFiche, string>>(() => Object.fromEntries(CHAMPS.map(([k]) => [k, fiche[k]])) as Record<ChampFiche, string>)
  const [refus, setRefus] = useState<string | null>(null)
  const legaux = (['nomLegal', 'rccm', 'niu'] as ChampFiche[]).filter((k) => v[k].trim() !== fiche[k])
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        const changes = Object.fromEntries(CHAMPS.filter(([k]) => v[k].trim() !== fiche[k]).map(([k]) => [k, v[k]]))
        const r = await source.contrat.modifierFiche(changes)
        if (!r.ok) {
          setRefus(t(r.raison === 'telephone' ? 'Téléphone au format +237, 9 chiffres commençant par 6.' : 'Aucun champ ne peut rester vide.'))
          jouer('erreur')
          return
        }
        jouer('interrupteur')
        fermer()
      }}
    >
      <h2 className="card-t">{t('Modifier la fiche')}</h2>
      {CHAMPS.map(([k, l]) => (
        <Champ key={k} t={t(l)}>
          <input value={v[k]} onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))} />
        </Champ>
      ))}
      {legaux.length > 0 && (
        <Note ton="amber" icone="info" className="mt10">

          {t('Le nom légal, le RCCM ou le NIU modifiés repassent en vérification ; vos missions continuent si le reste est valide.')}

        </Note>
      )}
      {refus && (
        <p className="err mt10" role="alert">
          {refus}
        </p>
      )}
      <div className="btns mt16">
        <button type="submit" className="btn primary">
          {t('Enregistrer')}
        </button>
        <button type="button" className="btn ghost" onClick={fermer}>
          {t('Annuler')}
        </button>
      </div>
    </form>
  )
}

export default function Contrat() {
  const { t, tf } = usePreferences()
  const { date, dateHeure, jours } = useDates()
  const maintenant = useHorloge()
  const s = useSession()
  const proprio = usePeut(['proprietaire'])
  const montants = useMontantsVisibles()
  const contrat = useLecture(() => source.contrat.contrat())
  const fiche = useLecture(() => source.contrat.fiche())
  const chaine = useLecture(() => source.contrat.activation())
  const compte = useLecture(() => source.compte.etat())
  const [onglet, choisir] = useOnglet<Onglet>(ONGLETS, 'pieces')
  const grille = useLecture(() => (onglet === 'grille' ? source.prix.grille() : Promise.resolve(null)), [onglet])
  const envoi = useFeuilleParams('envoyer', ['piece'])
  const lire = useFeuilleParams('lire', ['v'])
  const modifier = useFeuilleParams('fiche')
  const revision = useFeuilleParams('revision')
  const [texteRevision, setTexteRevision] = useState('')
  const [revisionEnvoyee, setRevisionEnvoyee] = useState(false)
  const [revisionCourte, setRevisionCourte] = useState(false)
  const c = contrat.donnees
  const relire = () => [contrat, fiche, chaine].forEach((x) => x.relire())
  if (!c)
    return (
      <Ecran route="contrat">
        {contrat.erreur ? <ErreurLecture erreur={contrat.erreur} relire={relire} /> : <Chargement lignes={4} />}
      </Ecran>
    )
  const pieces = [...c.pieces].sort((a, b) => ORDRE.indexOf(a.statut) - ORDRE.indexOf(b.statut))
  const d = dossier(c.pieces)
  const requises = c.pieces.filter((p) => p.requise !== false)
  const verifiees = requises.filter((p) => p.statut === 'valide' || p.statut === 'expire_bientot').length
  const pEnvoi = c.pieces.find((p) => p.type === envoi.param('piece'))
  const vLire = c.versions.find((v) => v.id === lire.param('v'))
  const etapes = chaine.donnees ?? []
  const bloquante = etapes.find((e) => e.bloquant)

  const ICONE_PIECE: Record<string, string> = { rccm: 'building-2', niu: 'receipt-text', identite_gerant: 'id-card', autorisation_transport: 'file-check', assurance: 'car', assurance_marchandises: 'shield', reglement: 'wallet', agence: 'warehouse' }
  const TON_PIECE: Record<StatutPiece, string> = { valide: 'green', expire_bientot: 'amber', en_revue: 'amber', manquante: 'or', refusee: 'red', expiree: 'red', non_exigee: 'ink' }
  const PILL_PIECE: Record<StatutPiece, Ton> = { valide: 'green', expire_bientot: 'amber', en_revue: 'amber', manquante: 'or', refusee: 'red', expiree: 'red', non_exigee: 'ink' }
  const premiere = pieces.find((p) => RENVOYABLE.includes(p.statut) && !p.route)
  const aSigner = c.versions.filter((v) => v.statut === 'a_signer').length
  // PDF d'une version (M6) : en-tête, parties, clauses, signature ; fabriqué sur l'appareil à partir de ce qui est lu.
  const pdfVersion = (v: VersionContrat) => {
    const m = PARAMETRES.saisies.mentions
    const titre = `${t(NOM_VERSION[v.genre])} · ${v.version}`
    const lignes: LignePdf[] = [
      { texte: titre, taille: 16 },
      { texte: `${m.denomination} · ${m.forme} · RCCM ${m.rccm} · NIU ${m.niu}`, taille: 8, espace: 8 },
      { texte: t('BELIVAY SARL et votre entreprise'), taille: 11, espace: 18 },
      ...(v.clauses ?? []).map((cl, i) => ({ texte: `${i + 1}. ${t(cl)}`, taille: 10, espace: 8 })),
      { texte: v.statut === 'signe' && v.signeLe ? tf('Signé le {d} par {s}.', { d: dateHeure(v.signeLe), s: v.signataires.join(', ') }) : t('Pas encore signé.'), taille: 10, espace: 18 },
    ]
    exporterPdf(`belivay-${v.genre}-${v.version}.pdf`, lignes)
  }
  const nom = s.entreprise?.nom ?? ''
  const plafond = s.entreprise?.plafond === null ? t('sans plafond') : `${F(s.entreprise?.plafond ?? 0)} F`
  const heros =
    d.titre === 'Approuvée' ? (
      <div className="hero night" style={{ marginTop: 14 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="hk">{tf('Dossier de conformité · {nom}', { nom })}</div>
            <div className="ht">{t('Approuvée : toutes les pièces exigées sont vérifiées')}</div>
            <div className="hs">{pieces.some((p) => p.statut === 'expire_bientot') ? tf('Pièce à renouveler : {p}.', { p: pieces.filter((p) => p.statut === 'expire_bientot').map((p) => p.libelle).join(', ') }) : t('Aucune pièce à renouveler pour l’instant.')}</div>
          </div>
          <Pill ton="dk" icone="badge-check">
            {t('Conformité approuvée')}
          </Pill>
        </div>
        <div className="entA-mini4">
          {(
            [
              ['Pièces vérifiées', `${verifiees} / ${requises.length}`],
              ['À renouveler', String(pieces.filter((p) => p.statut === 'expire_bientot').length)],
              ['Palier', s.entreprise ? t(NOM_PALIER[s.entreprise.palier]) : '—'],
              ['Plafond par colis', plafond],
            ] as const
          ).map(([l, v]) => (
            <div key={l} className="m4">
              <div className="l">{t(l)}</div>
              <div className="v">{v}</div>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div className={'hero ' + (d.titre === 'Pièce rejetée' ? 'red' : d.titre === 'À compléter' ? 'orange' : 'night')} style={{ marginTop: 14 }}>
        <div className="hk">{t(d.titre)}</div>
        <div className="ht">{d.titre === 'En vérification' ? tf('{n} pièce(s) en vérification', { n: requises.filter((p) => p.statut === 'en_revue').length }) : d.titre === 'Pièce rejetée' ? tf('{p} : à renvoyer', { p: pieces.find((p) => p.statut === 'refusee')?.libelle ?? '' }) : tf('{n} pièce(s) à envoyer', { n: requises.filter((p) => p.statut === 'manquante' || p.statut === 'expiree').length })}</div>
        <div className="hs">{bloquante?.bloquant ?? (d.titre === 'En vérification' ? tf('Vérification automatique en moins de {m} min quand c’est possible, revue humaine sinon. Vous êtes prévenu à chaque décision.', { m: P.verifAutoMin }) : t('Le statut « Approuvée » n’apparaît que lorsque toutes les pièces exigées sont vérifiées : la liste commence par ce qui manque.'))}</div>
        {d.titre === 'En vérification' ? (
          <div className="mt12">
            <Barre pct={(100 * verifiees) / Math.max(1, requises.length)} ton="acc" />
          </div>
        ) : (
          proprio &&
          premiere && (
            <div className="btns" style={{ maxWidth: 420 }}>
              <button type="button" className="btn white" onClick={() => envoi.ouvrir({ piece: premiere.type })}>
                <Icone nom="upload" taille={18} />
                <span>{t(premiere.statut === 'manquante' ? 'Envoyer la première pièce' : 'Renvoyer la pièce')}</span>
              </button>
            </div>
          )
        )}
      </div>
    )

  const lignesPieces = pieces.map((p) => {
    const reste = p.expireLe ? jours(p.expireLe, maintenant) : null
    const date1 = p.verifieeLe ? tf('Vérifiée le {d}', { d: date(p.verifieeLe) }) : p.envoyeeLe ? tf('Envoyée le {d}', { d: dateHeure(p.envoyeeLe) }) : p.statut === 'non_exigee' ? t('Non exigée') : t('Pas encore envoyée')
    const date2 = p.expireLe ? (reste !== null && reste < 0 ? tf('Expirée le {d}', { d: date(p.expireLe, true) }) : tf('Expire le {d}', { d: date(p.expireLe, true) })) : p.statut === 'en_revue' && p.revueAvant ? tf('Réponse au plus tard le {d}', { d: dateHeure(p.revueAvant) }) : p.requise === false ? '' : t('Sans expiration')
    return (
      <Rangee
        key={p.type}
        icone={ICONE_PIECE[p.type] ?? 'file-check'}
        ton={TON_PIECE[p.statut]}
        chaud={p.statut === 'manquante' || p.statut === 'refusee'}
        boutons
        titre={p.libelle}
        sous={
          <>
            {p.prouve}
            {p.motif && (
              <>
                <br />
                <b style={{ color: 'var(--red)' }}>{tf('Motif : {m}', { m: p.motif })}</b>
              </>
            )}
          </>
        }
        droite={
          <>
            <span className="right" style={{ display: 'inline-block', minWidth: 150, textAlign: 'right' }}>
              <span className="t12 b7 c2" style={{ display: 'block' }}>
                {date1}
              </span>
              {date2 && (
                <span className="t12 c3" style={{ display: 'block' }}>
                  {date2}
                </span>
              )}
            </span>
            <Pill ton={PILL_PIECE[p.statut]} dot={p.statut !== 'valide' && p.statut !== 'non_exigee'} icone={p.statut === 'valide' ? 'check' : undefined} sm>
              {t(STATUT[p.statut][0])}
            </Pill>
            {p.route ? (
              <Link className="btn sm secondary" to={chemin(p.route)}>
                {t('Voir')}
              </Link>
            ) : proprio && RENVOYABLE.includes(p.statut) ? (
              <button type="button" className="btn sm primary" onClick={() => envoi.ouvrir({ piece: p.type })}>
                <Icone nom="upload" taille={18} />
                <span>{t(p.statut === 'manquante' ? 'Envoyer' : 'Renvoyer')}</span>
              </button>
            ) : p.reserveeProprietaire && !proprio ? (
              <Verrou>{t('Propriétaire seulement')}</Verrou>
            ) : null}
          </>
        }
      />
    )
  })

  const cote = (
    <div className="col" style={{ gap: 16 }}>
      <Panel titre={t('Chaîne d’activation')} icone="list-checks">
        {etapes.map((e, i) => (
          <Etape
            key={e.id}
            n={i + 1}
            st={e.fait ? 'done' : e.bloquant ? 'bad' : 'wait'}
            titre={e.id === 'activation' && e.fait && e.le ? tf('Activé le {d}', { d: date(e.le) }) : t(NOM_ETAPE[e.id])}
            sous={e.id === 'activation' && e.par ? tf('Validé par {par} (BelivaY) · journalisé', { par: e.par }) : e.id === 'flotte' && e.fait ? tf('{n} livreur(s) prêt(s)', { n: e.detail }) : t(e.detail)}
          />
        ))}
      </Panel>
      <Panel titre={t('Fixé par BelivaY')} icone="lock">
        <Kv k={t('Palier')} v={s.entreprise ? t(NOM_PALIER[s.entreprise.palier]) : '—'} />
        <Kv k={t('Plafond par colis')} v={plafond} />
        <Kv k={t('Grille')} v={t('lecture seule')} />
        <Kv k={t('Caution, frais d’entrée')} v="0 F" />
        <div className="mt8">
          <Verrou>{t('Lecture seule : une demande passe par un message')}</Verrou>
        </div>
      </Panel>
    </div>
  )

  return (
    <Ecran
      route="contrat"
      actions={
        proprio &&
        premiere && (
          <button type="button" className="btn primary" onClick={() => envoi.ouvrir({ piece: premiere.type })}>
            <Icone nom="upload" taille={18} />
            <span>{t('Envoyer une pièce')}</span>
          </button>
        )
      }
      fixes={
        <>
          <Feuille ouverte={envoi.ouverte && !!pEnvoi && proprio} fermer={envoi.fermer} titre={t('Envoyer une pièce')}>
            {pEnvoi && <FormPiece p={pEnvoi} fermer={envoi.fermer} />}
          </Feuille>
          <Feuille ouverte={lire.ouverte && !!vLire} fermer={lire.fermer} titre={vLire ? t(NOM_VERSION[vLire.genre]) : ''} forme="large">
            {vLire && (
              <div>
                <p className="kick">{`${t(NOM_VERSION[vLire.genre])} · ${vLire.version}`}</p>
                <h2 className="card-t mt10">{t('BELIVAY SARL et votre entreprise')}</h2>
                <p className="card-s">{tf('{d}, RCCM {r}, et l’entreprise partenaire ; signature électronique horodatée.', { d: PARAMETRES.saisies.mentions.denomination, r: PARAMETRES.saisies.mentions.rccm })}</p>
                <ol className="mt14" style={{ paddingLeft: 18, display: 'grid', gap: 8 }}>
                  {(vLire.clauses ?? []).map((cl) => (
                    <li key={cl}>{t(cl)}</li>
                  ))}
                </ol>
                {vLire.genre === 'grille' && <p className="mt10">{t('Grille annexée en lecture seule : voir l’onglet Grille.')}</p>}
                <p className="aide mt14">{vLire.statut === 'signe' && vLire.signeLe ? tf('Signé le {d} par {s}.', { d: dateHeure(vLire.signeLe), s: vLire.signataires.join(', ') }) : t('Pas encore signé.')}</p>
                <div className="btns mt14">
                  <button type="button" className="btn secondary" onClick={() => pdfVersion(vLire)}>
                    <Icone nom="file-down" taille={18} />
                    <span>{t('Télécharger le PDF')}</span>
                  </button>
                  <button type="button" className="btn ghost" onClick={() => window.print()}>
                    <Icone nom="printer" taille={18} />
                    <span>{t('Imprimer')}</span>
                  </button>
                </div>
                {vLire.statut === 'a_signer' && proprio && (
                  <button
                    type="button"
                    className="btn primary mt14"
                    onClick={async () => {
                      const r = await source.contrat.accepter(vLire.id)
                      jouer(r.ok ? 'valide' : 'erreur')
                      if (r.ok) lire.fermer()
                    }}
                  >
                    <Icone nom="signature" taille={18} />
                    <span>{t('J’ai lu et je signe')}</span>
                  </button>
                )}
              </div>
            )}
          </Feuille>
          <Feuille ouverte={modifier.ouverte && !!fiche.donnees && proprio} fermer={modifier.fermer} titre={t('Modifier la fiche')}>
            {fiche.donnees && <FormFiche fiche={fiche.donnees} fermer={modifier.fermer} />}
          </Feuille>
          <Feuille ouverte={revision.ouverte && proprio} fermer={revision.fermer} titre={t('Demander une révision')}>
            {revisionEnvoyee ? (
              <div className="blv-succes" role="status">
                <h2 className="card-t">{t('Demande envoyée à BelivaY')}</h2>
                <p className="mt10">{t('La grille reste celle en vigueur ; toute nouvelle grille vous est annoncée avant de s’appliquer et doit être acceptée ici.')}</p>
                <div className="btns mt16">
                  <Link className="btn primary" to={chemin('messages', { sujet: 'grille' })}>
                    {t('Suivre dans les messages')}
                  </Link>
                  <button type="button" className="btn ghost" onClick={revision.fermer}>
                    {t('Fermer')}
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const r = await source.prix.demanderRevision(texteRevision)
                  jouer(r.ok ? 'envoi' : 'erreur')
                  setRevisionCourte(!r.ok)
                  if (r.ok) setRevisionEnvoyee(true)
                }}
              >
                <h2 className="card-t">{t('Demander une révision de la grille')}</h2>
                <p className="card-s">{t('La grille est fixée par BelivaY sous les plafonds ; dites quelle ligne et pourquoi (chiffres du pilote, distance, volume).')}</p>
                <Champ t={t('Votre demande')}>
                  <textarea rows={4} value={texteRevision} onChange={(e) => setTexteRevision(e.target.value)} />
                </Champ>
                {revisionCourte && (
                  <p className="err" role="alert">
                    {tf('Écrivez au moins {n} caractères pour que BelivaY comprenne la demande.', { n: PARAMETRES.saisies.revisionTexteMin })}
                  </p>
                )}
                <div className="btns mt16">
                  <button type="submit" className="btn primary" disabled={!texteRevision.trim()}>
                    {t('Envoyer la demande')}
                  </button>
                  <button type="button" className="btn ghost" onClick={revision.fermer}>
                    {t('Annuler')}
                  </button>
                </div>
              </form>
            )}
          </Feuille>
        </>
      }
    >
      {contrat.erreur && <ErreurLecture erreur={contrat.erreur} relire={relire} lu={maintenant} />}
      {heros}
      <Choix
        forme="tabs"
        aria={t('Sections du dossier')}
        actif={onglet}
        choisir={choisir}
        items={[
          { id: 'pieces', t: t('Pièces'), icone: 'file-check', n: c.pieces.length },
          { id: 'fiche', t: t('Fiche'), icone: 'building-2' },
          { id: 'contrat', t: t('Contrat'), icone: 'file-signature', n: aSigner || null },
          { id: 'grille', t: t('Grille'), icone: 'receipt-text' },
        ]}
      />
      <div style={{ marginTop: 16 }}>
        {onglet === 'pieces' && (
          <>
            <div className="g g21">
              <Panel titre={t('Pièces du dossier')} icone="file-check" droite={<Pill sm>{tf('{n} pièces · {r} exigées', { n: c.pieces.length, r: requises.length })}</Pill>}>
                {lignesPieces}
                {!proprio && <Hint>{t('Seule la propriétaire envoie les pièces ; vous les consultez.')}</Hint>}
              </Panel>
              {cote}
            </div>
            <Hint icone="upload">{tf('Envoi en photo ou en PDF de {n} Mo au plus, avec aperçu lisible obligatoire. Vérification automatique en moins de {m} minutes quand c’est possible, revue humaine sinon. Alerte {j} jours avant chaque expiration.', { n: PARAMETRES.acces.tailleMaxPieceMo, m: P.verifAutoMin, j: P.alertePieceJours })}</Hint>
          </>
        )}

        {onglet === 'fiche' &&
          (!fiche.donnees ? (
            <Chargement />
          ) : (
            <>
              <div className="g g21">
                <Panel titre={t('Fiche de l’entreprise')} icone="building-2">
                  <div className="entA-kv2">
                    {CHAMPS.map(([k, l]) => (
                      <Kv
                        key={k}
                        k={t(l)}
                        v={
                          <>
                            {fiche.donnees![k]}
                            {fiche.donnees!.enVerification.includes(k as 'nomLegal') && (
                              <>
                                {' '}
                                <Pill ton="amber" sm>
                                  {t('En vérification')}
                                </Pill>
                              </>
                            )}
                          </>
                        }
                      />
                    ))}
                    <Kv k={t('Référence du contrat')} v={fiche.donnees.referenceContrat} />
                  </div>
                  {proprio && (
                    <div className="btns" style={{ maxWidth: 420 }}>
                      <button type="button" className="btn primary" onClick={() => modifier.ouvrir()}>
                        <Icone nom="pencil" taille={18} />
                        <span>{t('Modifier la fiche')}</span>
                      </button>
                    </div>
                  )}
                  <Note ton="amber" icone="refresh-cw">
                    {t('Modifier le nom, le RCCM ou le NIU renvoie la fiche en vérification. Les missions continuent si le reste du dossier est valide.')}
                  </Note>
                </Panel>
                <div className="col" style={{ gap: 16 }}>
                  <Panel titre={t('Employeur de vos livreurs')} icone="handshake">
                    <div className="t13 c2 lh">{tf('{nom} reste l’employeur de ses livreurs : immatriculation CNPS, contrats de travail ou de prestation, assurances et obligations sociales sont à sa charge. BelivaY n’a aucun lien de subordination avec eux ; la certification est une condition d’accès, comme un badge.', { nom })}</div>
                  </Panel>
                  <Panel titre={t('Qui voit quoi')} icone="eye">
                    <Kv k={t('Fiche, contrat, grille')} v={t('tous les rôles, en lecture')} />
                    <Kv k={t('Modifier')} v={t('la propriétaire seulement')} />
                    <Kv k={t('Pièces d’identité')} v={t('la propriétaire et BelivaY')} />
                  </Panel>
                </div>
              </div>
              <div className="g g2">
                <Panel titre={t('Accès internes')} icone="users">
                  <div className="t13 c2 lh">{tf('Chaque personne a son accès nominatif : propriétaire, répartiteur ou comptable, {n} au plus.', { n: PARAMETRES.acces.accesInternesMax })}</div>
                  <div className="mt8">
                    <Link className="entA-link" to={chemin('parametres') + '#utilisateurs'}>
                      {t('Gérer dans Paramètres')}
                      <Icone nom="chevron-right" taille={14} />
                    </Link>
                  </div>
                </Panel>
                <Panel titre={t('Visite de l’agence')} icone="warehouse">
                  <Kv k={t('Point de stockage')} v={fiche.donnees.stockageNuit} />
                  <Kv k={t('Visite BelivaY')} v={t('possible à tout moment')} />
                  <Kv k={t('Avant le palier Or')} v={t('obligatoire')} />
                  <div className="t12 c3 mt8">{t('Les colis ne passent jamais la nuit ailleurs qu’au point de stockage déclaré ou au relais.')}</div>
                </Panel>
              </div>
            </>
          ))}

        {onglet === 'contrat' && (
          <div className="g g21">
            <div className="col" style={{ gap: 16 }}>
              <Panel titre={t('Documents signés')} icone="file-signature">
                {c.versions.map((v) => (
                  <Rangee
                    key={v.id}
                    icone={v.genre === 'grille' ? 'receipt-text' : 'file-signature'}
                    ton={v.statut === 'a_signer' ? 'or' : 'acc'}
                    chaud={v.statut === 'a_signer'}
                    boutons
                    titre={`${t(NOM_VERSION[v.genre])} · ${v.version}`}
                    sous={v.statut === 'signe' && v.signeLe ? tf('Signé le {d} · {s}', { d: date(v.signeLe, true), s: v.signataires.join(', ') }) : v.statut === 'a_signer' ? t('À signer par la propriétaire') : t('Remplacé par une version plus récente')}
                    droite={
                      <>
                        <Pill ton={v.statut === 'signe' ? 'green' : v.statut === 'a_signer' ? 'or' : 'ink'} dot sm>
                          {t(v.statut === 'signe' ? 'En vigueur' : v.statut === 'a_signer' ? 'À signer' : 'Remplacé')}
                        </Pill>
                        <button type="button" className={'btn sm ' + (v.statut === 'a_signer' && proprio ? 'primary' : 'secondary')} onClick={() => lire.ouvrir({ v: v.id })}>
                          <Icone nom={v.statut === 'a_signer' && proprio ? 'file-signature' : 'book-open'} taille={18} />
                          <span>{t(v.statut === 'a_signer' && proprio ? 'Lire et signer' : 'Lire')}</span>
                        </button>
                      </>
                    }
                  />
                ))}
                {compte.donnees?.bilanLe && (
                  <Rangee icone="handshake" ton="ink" titre={t('Contrat de partenariat définitif')} sous={tf('Signé après le bilan conjoint de fin de pilote, le {d}, sur les chiffres réels, toujours sous les plafonds.', { d: date(compte.donnees.bilanLe, true) })} droite={<Pill sm>{t('Après le pilote')}</Pill>} />
                )}
              </Panel>
              <Table
                legende={t('Historique des versions')}
                outils={
                  <>
                    <span className="b8 t14">{t('Historique des versions')}</span>
                    <span className="sp"></span>
                    <Verrou>{t('Journal immuable')}</Verrou>
                  </>
                }
                cle={(v) => v.id}
                rows={c.versions}
                cols={[
                  { k: 'v', t: t('Version'), main: true, rendu: (v) => <b>{`${t(NOM_VERSION[v.genre])} ${v.version}`}</b> },
                  { k: 'd', t: t('Date'), rendu: (v) => (v.signeLe ? date(v.signeLe, true) : '—') },
                  { k: 'q', t: t('Qui'), rendu: (v) => v.signataires.join(' · ') || '—' },
                  {
                    k: 'e',
                    t: t('État'),
                    rendu: (v) => (
                      <Pill ton={v.statut === 'signe' ? 'green' : v.statut === 'a_signer' ? 'or' : 'ink'} dot sm>
                        {t(v.statut === 'signe' ? 'Signée' : v.statut === 'a_signer' ? 'À signer' : 'Remplacée')}
                      </Pill>
                    ),
                  },
                ]}
              />
            </div>
            <div className="col" style={{ gap: 16 }}>
              <Panel titre={t('Clauses appliquées par le portail')} icone="scale">
                {(c.versions.find((v) => v.statut === 'signe' && v.clauses?.length)?.clauses ?? []).map((cl) => (
                  <div key={cl} className="kv">
                    <span className="t12 c2" style={{ fontWeight: 600 }}>
                      {t(cl)}
                    </span>
                  </div>
                ))}
              </Panel>
              <Note ton="acc" icone="info">
                {t('Une nouvelle version doit être acceptée ici ; sans acceptation, l’ancienne s’applique jusqu’à la fin du préavis, puis l’accès aux nouveaux paquets est suspendu.')}
              </Note>
            </div>
          </div>
        )}

        {onglet === 'grille' &&
          (grille.erreur ? (
            <ErreurLecture erreur={grille.erreur} relire={grille.relire} />
          ) : !grille.donnees ? (
            <Chargement />
          ) : (
            <>
              <Table
                legende={t('Grille fixée par BelivaY')}
                outils={
                  <>
                    <span className="b8 t14">{tf('Grille {v}', { v: grille.donnees.version })}</span>
                    <Pill ton="green" dot sm>
                      {tf('En vigueur depuis le {d}', { d: date(grille.donnees.enVigueurDepuis) })}
                    </Pill>
                    <span className="sp"></span>
                    <Verrou>{t('Fixé par BelivaY')}</Verrou>
                  </>
                }
                pied={
                  <>
                    <span>{t('La grille en vigueur à l’acceptation d’un paquet est celle qui le paie, même si elle change avant la remise.')}</span>
                    <span>{t('Facturation par format d’emballage, jamais au poids')}</span>
                  </>
                }
                cle={(l) => l.code}
                ligneCls={(l) => (l.controle === 'au_dessus' ? 'warn' : l.paquetType ? 'sel' : '')}
                rows={grille.donnees.lignes}
                cols={[
                  { k: 'p', t: t('Prestation'), main: true, rendu: (l) => <b>{t(NOM_LIGNE[l.code])}</b> },
                  { k: 'c', t: t('Condition'), rendu: (l) => (l.paquetType ? t('Paquet type') : '—') },
                  ...(montants
                    ? [
                        { k: 't', t: tf('Tarif {nom}', { nom }), cls: 'r', rendu: (l: (typeof grille.donnees.lignes)[number]) => <b>{`${F(l.prix)} F`}</b> },
                        { k: 'm', t: t('Plafond BelivaY'), cls: 'r', rendu: (l: (typeof grille.donnees.lignes)[number]) => l.plafonds.map((x) => `${x.classe ? x.classe + ' ' : ''}${F(x.montant)} F`).join(' · ') || '—' },
                      ]
                    : []),
                  {
                    k: 'k',
                    t: t('Contrôle'),
                    rendu: (l) => (
                      <Pill ton={l.controle === 'ok' ? 'green' : l.controle === 'ecrete' ? 'amber' : 'amber'} dot={l.controle !== 'ok'} icone={l.controle === 'ok' ? 'check' : undefined} sm>
                        {t(l.controle === 'ok' ? 'Sous le plafond' : l.controle === 'ecrete' ? 'Payé au plafond' : 'En attente de validation')}
                      </Pill>
                    ),
                  },
                ]}
              />
              {!montants && <Hint icone="eye-off">{t('Les montants sont réservés à la propriétaire et à la comptable.')}</Hint>}
              <div className="g g3">
                <Panel titre={t('Paquet type')} icone="boxes">
                  <div className="t13 c3 mt4">{tf('{n} colis {c}', { n: grille.donnees.paquetType.colis, c: grille.donnees.paquetType.classe })}</div>
                  {montants && (
                    <div className="entA-sum mt8">
                      <b style={{ color: 'var(--e-txt)' }}>{`${F(grille.donnees.paquetType.total)} F`}</b>
                      <span className="t13 c3">{grille.donnees.paquetType.lignes.map((x) => `${x.quantite} × ${F(x.montant / Math.max(1, x.quantite))} F`).join(' + ')}</span>
                    </div>
                  )}
                  <div className="t12 c3 mt6">{t('La grille en vigueur à l’acceptation paie le paquet, même si elle change avant la remise.')}</div>
                </Panel>
                <Panel titre={t('Plafonds d’achat')} icone="shield-check">
                  {montants ? (
                    grille.donnees.lignes
                      .filter((l) => l.plafonds.length > 0)
                      .slice(0, 4)
                      .map((l) => <Kv key={l.code} k={t(NOM_LIGNE[l.code])} v={l.plafonds.map((x) => `${x.classe ? x.classe + ' ' : ''}${F(x.montant)} F`).join(' · ')} />)
                  ) : (
                    <div className="t13 c3">{t('Les montants sont réservés à la propriétaire et à la comptable.')}</div>
                  )}
                </Panel>
                <Panel titre={t('Révision')} icone="pencil">
                  <div className="t13 c2 lh">{t('La grille n’est jamais modifiable par l’entreprise. Une révision se demande par message ; toute nouvelle grille est annoncée avant d’entrer en vigueur et doit être acceptée ici.')}</div>
                  {proprio && (
                    <div className="btns">
                      <button type="button" className="btn secondary" onClick={() => revision.ouvrir()}>
                        <Icone nom="message-circle" taille={18} />
                        <span>{t('Demander une révision')}</span>
                      </button>
                    </div>
                  )}
                  <div className="mt8">
                    <Link className="entA-link" to={chemin('sla')}>
                      {t('Délais et détail des prix')}
                      <Icone nom="chevron-right" taille={14} />
                    </Link>
                  </div>
                </Panel>
              </div>
            </>
          ))}
      </div>
    </Ecran>
  )
}
