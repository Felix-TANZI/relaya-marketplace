// ENT-P06 · Fiche d'un livreur. Héros (livreur partenaire de l'entreprise, statut, Trust Score et palier,
// certification ; rouge si suspendu), quatre chiffres, onglets dans l'adresse (Profil, Activité, Score, Preuves,
// Messages). Profil : véhicule, zones et capacité, pièces (statut et date, jamais l'image ni le selfie : ENT-P06R-03),
// contact par numéro masqué via le portail (DP-61 : appel ouvert pendant la mission seulement), tarif par mission
// affiché (facultatif, entre eux : ENT-P06R-02), note interne (ENT-P06R-04), journal de la fiche {auteur, champ,
// avant, après}. Gestes : modifier véhicule, zones, capacité (notifié au livreur, journalisé ; en tournée, pour les
// paquets suivants : ENT-P06R-01), prévenir, suspendre, lever sa propre suspension (jamais celle de BelivaY :
// ENT-P05R-03), retirer (après les missions en cours : ENT-P05R-01), approuver (pièces vérifiées et certification
// réussie : ENT-RG-R74), joindre des éléments à une contestation de score (ENT-RG-R65). Sans identifiant : la flotte.
// DP-66, DP-67 : « Départ demandé » (motif, préavis et paquets jusqu'à la veille du dernier jour, conditions, constat du
// kit, dernier versement, clôture confirmée, même avant la fin du préavis) et « Absences prévenues »
// (marquées vues) ; la photo du livreur ne change que par une nouvelle vérification demandée ici (page des pièces).
// Onglet « Emploi » (EQUIPE/Emploi.tsx) : l'entreprise employeur — contrat et essai, discipline, horaires et zones,
// congés, fin de contrat, attestation, historique. Suspendre, lever, retirer : propriétaire et gérant (employeur).
import { JOUR } from '../../calculs/temps'
import type { LignePdf } from '../../donnees/exports'
import { PositionDirecte } from './Position'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { jouer } from '@client/composants/Sons'
import { F } from '@client/i18n/format'
import { Icone } from '../../composants/Icone'
import { NOM_PALIER } from '../../config/libelles'
import { chemin } from '../../config/pages'
import type { FicheLivreur } from '../../donnees/domaines/livreurs'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { PARAMETRES } from '../../calculs/registre'
import { PARAMETRES_FLOTTE, palierLivreur } from '../../calculs/flotte'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles, usePeut, useSession } from '../../session'
import { Chargement, ErreurLecture, ICONE_VEHICULE, NOM_CLASSE, NOM_VEHICULE, telMasque, useDates, useFeuilleParams, useOnglet } from '../ENT-03/outils'
import { Anneau, Barre, BarresH, Champ, Choix, Etape, exporterPdf, Hint, Kpi, Kv, Li, Note, Panel, Pill, Plus, Rangee, Table, Vide } from '../../composants/prototype'
import { NOM_ALERTE, NOM_STATUT } from './Flotte'
import { NOM_PIECE, STATUT_PIECE } from './Pieces'
import { BlocAbsences, BlocDepart, FeuilleCloture } from './Depart'
import { Ecran, useAppareil } from '../../composants/coque'
import { OngletEmploi } from '../EQUIPE/Emploi'

const P = PARAMETRES_FLOTTE
const ONGLETS = ['profil', 'emploi', 'activite', 'score', 'preuves', 'messages'] as const
type Onglet = (typeof ONGLETS)[number]
const NOM_MAILLON: Record<string, string> = { C1: 'Ramassage (C1)', C2: 'Transport (C2)', C3: 'Dépôt (C3)', C4: 'Remise (C4)', transport: 'Transport' }

/** Le livreur peut-il être approuvé ? (pièces vérifiées, charte, quiz au seuil) */
const pret = (l: FicheLivreur) => l.statut === 'en_activation' && !!l.charteLe && l.pieces.every((p) => p.statut === 'valide') && (l.certification?.quiz ?? 0) >= P.quizMin

function FormModifier({ l, fermer }: { l: FicheLivreur; fermer: () => void }) {
  const { t, tf } = usePreferences()
  const vehicules = useLecture(() => source.vehicules.liste())
  const zones = useLecture(() => source.zones.zones())
  const [vehiculeId, setVehiculeId] = useState(l.vehiculeId ?? '')
  const [zs, setZs] = useState<string[]>(l.zones)
  const [capacite, setCapacite] = useState(String(l.capacite ?? ''))
  const [erreur, setErreur] = useState<string | null>(null)
  const n = Number(capacite)
  const possibles = (vehicules.donnees ?? []).filter((v) => v.id === l.vehiculeId || !v.livreurId)
  const valide = zs.length > 0 && Number.isInteger(n) && n >= 1
  const envoyer = async () => {
    const r = await source.livreurs.modifier(l.id, { vehiculeId: vehiculeId || null, zones: zs, capacite: n })
    if (!r.ok) {
      setErreur(t(r.raison === 'zones' ? 'Choisissez au moins une de vos zones déclarées.' : r.raison === 'capacite' ? 'Capacité : un nombre entier de colis, au moins 1.' : 'Ce véhicule n’existe plus.'))
      jouer('erreur')
      return
    }
    jouer('interrupteur')
    fermer()
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (valide) void envoyer()
      }}
    >
      <h2 className="card-t">{tf('Modifier la fiche de {nom}', { nom: l.nom })}</h2>
      <p className="card-s">{l.statut === 'en_mission' ? t('En tournée : la modification vaudra pour ses prochains paquets ; la mission en cours n’est pas touchée.') : t('Le livreur est prévenu de chaque modification, qui est inscrite au journal de la fiche.')}</p>
      <Champ t={t('Véhicule')}>
        <select value={vehiculeId} onChange={(e) => setVehiculeId(e.target.value)}>
          <option value="">{t('Aucun véhicule')}</option>
          {possibles.map((v) => (
            <option key={v.id} value={v.id}>{`${t(NOM_VEHICULE[v.type])} · ${v.plaque}${v.proposable ? '' : ' — ' + t('non proposé à l’affectation')}`}</option>
          ))}
        </select>
      </Champ>
      <Champ t={t('Zones')} groupe>
        <div className="entA-chk">
          {(zones.donnees ?? []).map((z) => (
            <label key={z.code}>
              <input type="checkbox" checked={zs.includes(z.code)} onChange={(e) => setZs((x) => (e.target.checked ? [...x, z.code] : x.filter((c) => c !== z.code)))} />
              {`${z.code} · ${z.nom}`}
            </label>
          ))}
        </div>
      </Champ>
      <Champ t={t('Capacité par jour (colis)')}>
        <input type="number" inputMode="numeric" min={1} value={capacite} onChange={(e) => setCapacite(e.target.value)} aria-invalid={!(n >= 1)} />
      </Champ>
      {erreur && (
        <p className="err mt10" role="alert">
          {erreur}
        </p>
      )}
      <div className="btns mt16">
        <button type="submit" className="btn primary" disabled={!valide}>
          <Icone nom="check" taille={18} />
          <span>{t('Enregistrer et prévenir le livreur')}</span>
        </button>
        <button type="button" className="btn ghost" onClick={fermer}>
          {t('Annuler')}
        </button>
      </div>
    </form>
  )
}

/** Motif écrit (suspendre, retirer, joindre des éléments). */
function FormMotif({ titre, texte, bouton, danger, envoyer, fermer }: { titre: string; texte: string; bouton: string; danger?: boolean; envoyer: (motif: string) => Promise<boolean>; fermer: () => void }) {
  const { t } = usePreferences()
  const [motif, setMotif] = useState('')
  const [encours, setEncours] = useState(false)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!motif.trim() || encours) return
        setEncours(true)
        const ok = await envoyer(motif)
        setEncours(false)
        jouer(ok ? 'interrupteur' : 'erreur')
        if (ok) fermer()
      }}
    >
      <h2 className="card-t">{titre}</h2>
      <p className="card-s">{texte}</p>
      <Champ t={t('Motif écrit')}>
        <textarea rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} />
      </Champ>
      <div className="btns mt16">
        <button type="submit" className={'btn ' + (danger ? 'danger' : 'primary')} disabled={!motif.trim() || encours}>
          {bouton}
        </button>
        <button type="button" className="btn ghost" onClick={fermer}>
          {t('Annuler')}
        </button>
      </div>
    </form>
  )
}

function Profil({ l, peut, modifier }: { l: FicheLivreur; peut: boolean; modifier: () => void }) {
  const { t, tf } = usePreferences()
  const { date, dateHeure } = useDates()
  const maintenant = useHorloge()
  const proprio = usePeut(['proprietaire'])
  const montants = useMontantsVisibles()
  const s = useSession()
  const vehicules = useLecture(() => source.vehicules.liste())
  const v = vehicules.donnees?.find((x) => x.id === l.vehiculeId)
  const [note, setNote] = useState(l.note ?? '')
  const [tarif, setTarif] = useState(l.tarifMission === null || l.tarifMission === undefined ? '' : String(l.tarifMission))
  const [enregistre, setEnregistre] = useState<string | null>(null)
  const prenom = l.nom.split(' ')[0]
  return (
    <div className="g g21">
      <div className="col" style={{ gap: 16 }}>
        <Panel
          titre={t('Véhicule, zones et capacité')}
          icone="bike"
          droite={
            peut && l.statut !== 'suspendu' ? (
              <button type="button" className="a lien-b" style={{ textDecoration: 'none' }} onClick={modifier}>
                {t('Modifier')}
                <Icone nom="chevron-right" taille={16} />
              </button>
            ) : undefined
          }
        >
          <div className="row" style={{ gap: 16, marginBottom: 6 }}>
            <span className="entA-veh">
              <span className="vi" style={{ width: 72, height: 46 }}>
                <Icone nom={ICONE_VEHICULE[v?.type ?? l.vehicule]} taille={30} />
              </span>
            </span>
            <div className="grow">
              <div className="b8 t17">
                {v ? (
                  <>
                    {t(NOM_VEHICULE[v.type])} · <span className="mono">{v.plaque}</span>
                  </>
                ) : (
                  t('Aucun véhicule')
                )}
              </div>
              {v && <div className="t13 c3">{tf('Classes transportables : {c}', { c: v.classes.map((c) => t(NOM_CLASSE[c])).join(', ') })}</div>}
            </div>
          </div>
          <Kv k={t('Capacité')} v={tf('{n} colis par jour', { n: l.capacite ?? 0 })} />
          <Kv k={t('Zones')} v={l.zones.map((z, i) => (i === 0 && l.zones.length > 1 ? tf('{z} (principale)', { z }) : z)).join(' · ') || '—'} />
          <Kv k={t('Statut')} v={t(NOM_STATUT[l.statut])} />
          {v && <Kv k={t('Assurance')} v={v.assuranceJusqua ? (v.statut === 'expire' ? tf('expirée le {d}', { d: date(v.assuranceJusqua, true) }) : tf('jusqu’au {d}', { d: date(v.assuranceJusqua, true) })) : '—'} />}
          <Kv k={t('Activé le')} v={l.activeLe ? `${date(l.activeLe, true)}${l.certification?.quiz != null ? ' · ' + tf('certification {q}/{n}', { q: l.certification.quiz, n: P.quizSur }) : ''}` : '—'} />
          {v && !v.proposable && (
            <Note ton="amber" icone="shield-alert">
              {t('Ce véhicule n’est plus proposé à l’affectation.')} <Link to={chemin('vehicules', { id: v.id })}>{t('Voir le véhicule')}</Link>
            </Note>
          )}
          <div className="t12 c3 mt8">
            <Icone nom="bell" taille={13} /> {t('Chaque changement de véhicule, de zones ou de capacité est notifié au livreur et journalisé avec son auteur.')}
          </div>
        </Panel>
        <Panel titre={t('Pièces')} icone="id-card" a={peut ? { t: l.pieces.some((p) => p.statut === 'en_revue') ? t('Contrôler les pièces') : t('Voir les pièces'), to: chemin('pieces', { id: l.id }) } : undefined}>
          {l.pieces.map((p) => {
            const bientot = p.expireLe !== null && p.expireLe - maintenant <= P.alertePieceLivreurJours * 86_400_000
            const st = p.statut !== 'valide' ? p.statut : bientot ? 'bientot' : 'valide'
            return (
              <Rangee
                key={p.type}
                icone={p.type === 'selfie' ? 'scan-face' : p.type === 'permis' ? 'id-card-lanyard' : 'id-card'}
                ton={st === 'valide' ? 'green' : st === 'en_revue' || st === 'bientot' || (st === 'reverification' && !p.reverification?.bloque) ? 'amber' : 'red'}
                chaud={st !== 'valide'}
                boutons={(st === 'bientot' || (p.type === 'selfie' && st === 'valide')) && peut}
                titre={t(NOM_PIECE[p.type] ?? p.type)}
                sous={p.reverification ? (p.reverification.bloque ? tf('nouvelle photo pas validée dans le délai ({d}) : plus de nouvelle mission', { d: date(p.reverification.jusqua) }) : tf('nouvelle photo à envoyer avant le {d}', { d: date(p.reverification.jusqua) })) : p.expireLe ? (p.expireLe > maintenant && p.expireLe - maintenant < 60 * JOUR ? tf('expire le {d} · dans {n} jour(s)', { d: date(p.expireLe, true), n: Math.ceil((p.expireLe - maintenant) / JOUR) }) : tf('expire le {d}', { d: date(p.expireLe, true) })) : t('sans date d’expiration')}
                droite={
                  st === 'bientot' ? (
                    <>
                      <Pill ton="amber" dot sm>
                        {t('À renouveler')}
                      </Pill>
                      {peut && (
                        <button type="button" className="btn sm primary" onClick={() => void source.livreurs.relancerPiece(l.id, p.type).then(() => jouer('envoi'))}>
                          <Icone nom="send" taille={18} />
                          <span>{tf('Prévenir {nom}', { nom: prenom })}</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <Pill ton={STATUT_PIECE[p.statut][1]} dot={p.statut !== 'valide'} icone={p.statut === 'valide' ? 'check' : undefined} sm>
                        {t(STATUT_PIECE[p.statut][0])}
                      </Pill>
                      {peut && p.type === 'selfie' && p.statut === 'valide' && (
                        <Link className="btn sm secondary" to={chemin('pieces', { id: l.id, sheet: 'photo' })}>
                          <Icone nom="scan-face" taille={16} />
                          <span>{t('Demander une nouvelle photo')}</span>
                        </Link>
                      )}
                    </>
                  )
                }
              />
            )
          })}
          <Plus libelle={t('Renvoi et consultation des pièces')} icone="lock" plat>
            <div className="entA-note-lock">
              <Icone nom="lock" taille={16} />
              {tf('Le livreur renvoie une pièce depuis son application quand elle est refusée, demandée par {nom}, expirée ou bientôt expirée ; sa photo est son identité vérifiée : elle ne change que par une nouvelle vérification demandée par {nom}. {nom} ouvre chaque pièce par un lien de quelques minutes, en filigrane ; chaque consultation est journalisée.', { nom: s.entreprise?.nom ?? '' })}
            </div>
          </Plus>
        </Panel>
        <Panel titre={t('Journal de la fiche')} icone="history">
          {(l.journal ?? []).length === 0 ? (
            <div className="t13 c3">{t('Aucune modification depuis l’activation.')}</div>
          ) : (
            <div className="tl">
              {l.journal!.slice(0, 8).map((j, i) => (
                <div key={i} className="ti done">
                  <div className="tt">{tf('{champ} : {avant} → {apres}', { champ: j.champ, avant: j.avant || '—', apres: j.apres })}</div>
                  <div className="td">{`${dateHeure(j.le)} · ${j.auteur}`}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
      <div className="col" style={{ gap: 16 }}>
        <Panel titre={t('Contact')} icone="phone">
          <Kv k={t('Téléphone')} v={telMasque(l.telephone)} />
          <Kv k={t('Type de compte')} v={t('Livreur partenaire')} />
          <Kv k={t('Rattachement')} v={l.activeLe ? tf('{e}, depuis le {d}', { e: s.entreprise?.nom ?? '', d: date(l.activeLe, true) }) : (s.entreprise?.nom ?? '')} />
          <div className="t12 c3 mt8">{t('Numéro masqué : l’appel passe par le portail, ouvert pendant une mission seulement, et il est journalisé sans contenu.')}</div>
          <div className="btns">
            {l.statut === 'en_mission' ? (
              <Link className="btn secondary" to={chemin('missions', { livreur: l.id })}>
                <Icone nom="phone" taille={18} />
                <span>{t('Appeler')}</span>
              </Link>
            ) : (
              <button type="button" className="btn secondary" aria-disabled="true" disabled title={t('L’appel s’ouvre pendant une mission seulement.')}>
                <Icone nom="phone-off" taille={18} />
                <span>{t('Appel hors mission fermé')}</span>
              </button>
            )}
            <Link className="btn secondary" to={chemin('livreur', { id: l.id, t: 'messages' })}>
              <Icone nom="message-circle" taille={18} />
              <span>{t('Message')}</span>
            </Link>
          </div>
        </Panel>
        {montants && (
          <Panel titre={t('Tarif par mission affiché au livreur')} icone="banknote">
            <div className="t13 c2 lh">{tf('Facultatif. Barème interne, visible par {nom} dans « Mon activité et mes gains ». Information entre vous : BelivaY ne le contrôle pas et ne le paie pas.', { nom: prenom })}</div>
            {proprio ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const m = tarif.trim() === '' ? null : Number(tarif)
                  const r = await source.livreurs.tarif(l.id, m)
                  jouer(r.ok ? 'interrupteur' : 'erreur')
                  if (r.ok) setEnregistre('tarif')
                }}
              >
                <div className="fld">
                  <label>
                    {t('Montant par mission (F), vide pour ne rien afficher')}
                    <span className="inp">
                      <input type="number" inputMode="numeric" min={0} value={tarif} onChange={(e) => setTarif(e.target.value)} />
                      <span className="suf">F</span>
                    </span>
                  </label>
                </div>
                <div className="btns">
                  <button type="submit" className="btn secondary">
                    {t('Enregistrer le tarif')}
                  </button>
                  {enregistre === 'tarif' && (
                    <Pill ton="green" sm>
                      {t('Enregistré')}
                    </Pill>
                  )}
                </div>
              </form>
            ) : (
              <div className="mt8 b8">{l.tarifMission === null || l.tarifMission === undefined ? t('Aucun tarif affiché') : `${F(l.tarifMission)} F`}</div>
            )}
          </Panel>
        )}
        {peut && (
          <Panel titre={t('Note interne')} icone="notebook-pen">
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const r = await source.livreurs.noter(l.id, note)
                jouer(r.ok ? 'interrupteur' : 'erreur')
                if (r.ok) setEnregistre('note')
              }}
            >
              <div className="fld" style={{ marginTop: 0 }}>
                <label>
                  <span className="vh">{t('Note interne')}</span>
                  <span className="inp area">
                    <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Ex. : préfère les tournées du matin')} />
                  </span>
                </label>
              </div>
              <div className="btns">
                <button type="submit" className="btn secondary">
                  {t('Enregistrer la note')}
                </button>
                {enregistre === 'note' && (
                  <Pill ton="green" sm>
                    {t('Enregistrée')}
                  </Pill>
                )}
              </div>
            </form>
            <Plus libelle={t('Qui voit cette note ?')} icone="lock" plat>
              <div className="entA-note-lock">
                <Icone nom="lock" taille={15} />
                {t('Visible de votre entreprise seulement, jamais du livreur ; chiffrée, consultée par BelivaY uniquement en litige ou sur réquisition, et alors journalisée.')}
              </div>
            </Plus>
          </Panel>
        )}
        <Hint icone="map-pin">{tf('Positions collectées pendant les missions seulement, conservées {n} jours comme preuves. Aucune position hors mission.', { n: P.conservationPreuvesJours })}</Hint>
      </div>
    </div>
  )
}

function Activite({ l }: { l: FicheLivreur }) {
  const { t, tf } = usePreferences()
  const { jourCivil, heure, date } = useDates()
  const a = l.activite
  if (!a || (!a.paquets.length && !a.jours.some((j) => j.missions)))
    return (
      <Panel>
        <Vide icone="activity" t={t('Aucune activité encore')} s={t('Les missions de ce livreur chez vous apparaîtront ici dès son premier paquet.')} />
      </Panel>
    )
  const max = Math.max(1, ...a.jours.map((j) => j.missions))
  const total = a.jours.reduce((n, j) => n + j.missions, 0)
  // Relevé du livreur (M6) : ses paquets chez l'entreprise, sans montant, en PDF d'une page.
  const releve = () => {
    const lignes: LignePdf[] = [
      { texte: tf('Relevé d’activité · {nom}', { nom: l.nom }), taille: 16 },
      { texte: tf('{p} paquet(s) · {c} colis livrés · délai tenu {d}', { p: a.paquets.length, c: a.colisLivres, d: a.remis ? `${Math.round((a.dansLeDelai / a.remis) * 100)} %` : '—' }), espace: 8 },
      ...a.paquets.map((p) => ({ texte: `${date(p.le)} ${heure(p.le)} · ${p.id} · ${p.zone} · ${tf('{n} colis', { n: p.colis })} · ${t(p.dansLeDelai === null ? 'en cours' : p.dansLeDelai ? 'dans la promesse' : 'en retard')}`, taille: 10, espace: 4 })),
    ]
    exporterPdf(`releve-${l.id}.pdf`, lignes)
  }
  const enCours = a.paquets.filter((p) => p.dansLeDelai === null).length
  return (
    <>
      <div className="g g4">
        <Kpi icone="boxes" k={t('Paquets')} v={a.paquets.length} s={enCours ? tf('{n} en cours', { n: enCours }) : t('tous clos')} />
        <Kpi icone="package-check" k={t('Colis livrés')} v={a.colisLivres} s={t('chez votre entreprise')} />
        <Kpi icone="timer" iton="green" k={t('Délai tenu')} v={a.remis ? Math.round((a.dansLeDelai / a.remis) * 100) : '—'} u={a.remis ? '%' : undefined} s={a.remis ? tf('{d} sur {r} dans la promesse', { d: a.dansLeDelai, r: a.remis }) : t('aucun paquet clos')} />
        <Kpi icone="route" k={t('Missions · 7 jours')} v={total} s={t('ramassages, dépôts et remises')} />
      </div>
      <div className="g g21">
        <Panel titre={t('Missions des 7 derniers jours')} icone="chart-column">
          <BarresH lignes={a.jours.map((j) => ({ l: jourCivil(j.jour), v: j.missions, max, r: String(j.missions), label: `${jourCivil(j.jour)} : ${j.missions}` }))} />
          <div className="t12 c3 mt6">{t('Une mission = un ramassage, un dépôt ou une remise.')}</div>
        </Panel>
        <Panel titre={t('Derniers paquets')} icone="calendar-days">
          <div className="tl">
            {a.paquets.slice(0, 5).map((p) => (
              <div key={p.id} className={'ti ' + (p.dansLeDelai === null ? 'cur' : p.dansLeDelai ? 'done' : 'bad')}>
                <div className="tt">{`${p.id} · ${t(p.dansLeDelai === null ? 'en cours' : p.dansLeDelai ? 'dans la promesse' : 'en retard')}`}</div>
                <div className="td">{tf('{z} · {n} colis · {d} à {h}', { z: p.zone, n: p.colis, d: date(p.le), h: heure(p.le) })}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div style={{ marginTop: 16 }}>
        <Table
          legende={tf('Missions de {nom}', { nom: l.nom })}
          outils={
            <>
              <span className="b8 t14">{tf('Missions de {nom}', { nom: l.nom })}</span>
              <span className="sp"></span>
              <button type="button" className="btn sm ghost" onClick={releve}>
                <Icone nom="file-down" taille={16} />
                <span>{t('Relevé en PDF')}</span>
              </button>
            </>
          }
          cle={(p) => p.id}
          rows={a.paquets}
          cols={[
            { k: 'id', t: t('Paquet'), main: true, rendu: (p) => <b className="mono">{p.id}</b> },
            { k: 'z', t: t('Zone'), rendu: (p) => p.zone },
            { k: 'c', t: t('Colis'), rendu: (p) => p.colis },
            { k: 'h', t: t('Heure'), rendu: (p) => `${date(p.le)} · ${heure(p.le)}` },
            {
              k: 'd',
              t: t('Délai'),
              rendu: (p) => (
                <Pill ton={p.dansLeDelai === null ? 'ink' : p.dansLeDelai ? 'green' : 'amber'} dot sm>
                  {t(p.dansLeDelai === null ? 'En cours' : p.dansLeDelai ? 'Dans la promesse' : 'En retard')}
                </Pill>
              ),
            },
          ]}
        />
      </div>
    </>
  )
}

function Score({ l, joindre, peut }: { l: FicheLivreur; joindre: (id: string) => void; peut: boolean }) {
  const { t, tf } = usePreferences()
  const { date } = useDates()
  if (l.trustScore === null || !l.criteres)
    return (
      <Panel>
        <Vide icone="gauge" t={t('Pas encore de Trust Score')} s={tf('Chaque livreur part au neutre ; sa note se forme avec ses missions. Paliers : Confirmé dès {c}, Or dès {o}.', { c: P.paliersLivreur.Confirme, o: P.paliersLivreur.Or })} />
      </Panel>
    )
  const palier = palierLivreur(l.trustScore)
  const pts = (c: { poids: number; note: number }) => (c.poids * c.note) / 100
  const total = l.criteres.reduce((n, c) => n + pts(c), 0)
  const faible = [...l.criteres].sort((x, y) => x.note - y.note)[0]
  const virgule = (n: number, d = 1) => n.toFixed(d).replace('.', ',')
  const contestes = (l.evenements ?? []).filter((e) => e.contestation)
  return (
    <>
      <div className="g g21">
        <Panel titre={t('Trust Score et ses cinq critères')} icone="gauge">
          <div className="row" style={{ gap: 18, marginBottom: 10 }}>
            <Anneau v={l.trustScore} taille={96} aria={tf('Trust Score {n} sur 100', { n: l.trustScore })} />
            <div className="grow">
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <Pill ton="acc" sm>
                  {tf('Palier personnel : {p}', { p: t(NOM_PALIER[palier]) })}
                </Pill>
                {palier !== 'Or' && <Pill sm>{tf('Seuil {n}', { n: palier === 'Nouveau' ? P.paliersLivreur.Confirme : P.paliersLivreur.Or })}</Pill>}
              </div>
              <div className="t13 c3 mt6 lh">{t('Trust = somme des points des cinq critères (poids × note du critère ÷ 100). Chaque critère est noté sur 100 ; calculé par BelivaY.')}</div>
            </div>
          </div>
          {l.criteres.map((c) => (
            <div key={c.critere} className="entA-crit">
              <span>
                <b>{t(c.critere)}</b> <span className="w">{`· ${c.poids} %`}</span>
              </span>
              <Barre pct={c.note} ton="acc" />
              <span className="v">{`${c.note} / 100`}</span>
              <span className="p">{tf('{n} pts', { n: virgule(pts(c), 2).replace(/,?0+$/, '') || '0' })}</span>
            </div>
          ))}
          <div className="entA-crit" style={{ borderTop: '1.5px solid var(--line-2)' }}>
            <span>
              <b>{t('Total')}</b>
            </span>
            <span></span>
            <span></span>
            <span className="p" style={{ fontSize: 16 }}>{`${virgule(total, 2)} → ${l.trustScore}`}</span>
          </div>
          {faible && (
            <Note ton="acc" icone="lightbulb">
              {t('Critère le plus faible :')} <b>{`${t(faible.critere)} (${faible.note} / 100)`}</b>.
            </Note>
          )}
        </Panel>
        <div className="col" style={{ gap: 16 }}>
          <Panel titre={t('Événements récents')} icone="history">
            <div className="tl">
              {(l.evenements ?? []).map((e) => (
                <div key={e.id} className={'ti ' + (e.contestation ? 'cur' : e.effet < 0 ? 'bad' : 'done')}>
                  <div className="tt">{`${e.libelle} · ${e.effet > 0 ? '+' + e.effet : e.effet}`}</div>
                  <div className="td">{`${t(e.critere)} · ${date(e.le)}`}</div>
                  {e.contestation && (
                    <div className="td">
                      <b>{t('Contesté par le livreur')}</b> {`« ${e.contestation.texte} »`}
                      {e.contestation.elements && (
                        <>
                          <br />
                          <b>{t('Vos éléments')}</b> {`« ${e.contestation.elements} »`}
                        </>
                      )}
                    </div>
                  )}
                  {e.contestation && !e.contestation.elements && peut && (
                    <button type="button" className="btn sm secondary mt8" onClick={() => joindre(e.id)}>
                      {t('Joindre des éléments')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Panel>
          <Panel titre={t('Contestations')} icone="gavel">
            <div className="t13 c2 lh">
              {contestes.length ? <b>{tf('{n} contestation(s) en cours', { n: contestes.length })}</b> : t('Aucune contestation en cours.')} {tf('Un livreur conteste un événement une fois, sous {n} jours ; l’effet est suspendu jusqu’à la décision de BelivaY et votre entreprise peut joindre ses éléments.', { n: P.contestationJours })}
            </div>
          </Panel>
        </div>
      </div>
      <div className="g g2">
        <Panel titre={t('Paliers personnels')} icone="award">
          <Kv k={t('Nouveau')} v={t('au départ, score neutre')} />
          <Kv k={t('Confirmé')} v={tf('{n} et plus, tenu {j} jours', { n: P.paliersLivreur.Confirme, j: PARAMETRES.paliers.tenueJours })} />
          <Kv k={t('Or')} v={tf('{n} et plus, tenu {j} jours', { n: P.paliersLivreur.Or, j: PARAMETRES.paliers.tenueJours })} />
          <div className="t12 c3 mt8 lh">{t('La descente de palier est validée par un humain avec motif écrit ; la baisse est plafonnée à chaque calcul. Un litige en cours ne pénalise personne.')}</div>
        </Panel>
        <Panel titre={t('Mêmes définitions partout')} icone="chart-column">
          <div className="t13 c2 lh">{t('Délai tenu, missions et incidents se calculent comme dans la console et le Trust Score : votre entreprise lit les mêmes chiffres que BelivaY.')}</div>
          <div className="mt8">
            <Link className="entA-link" to={chemin('score')}>
              {t('Score qualité')}
              <Icone nom="chevron-right" taille={14} />
            </Link>
          </div>
        </Panel>
      </div>
    </>
  )
}

function Preuves({ l }: { l: FicheLivreur }) {
  const { t, tf } = usePreferences()
  const { dateHeure } = useDates()
  const ids = (l.activite?.paquets ?? []).map((p) => p.id)
  const preuves = useLecture(async () => (await Promise.all(ids.map((id) => source.preuves.dossier(id)))).flatMap((d) => d?.maillons.flatMap((m) => m.preuves) ?? []))
  const lst = preuves.donnees ?? []
  if (preuves.erreur) return <ErreurLecture erreur={preuves.erreur} relire={preuves.relire} />
  if (!preuves.donnees) return <Chargement />
  const enFile = lst.filter((p) => p.statut !== 'synchronisee').length
  return (
    <>
      {lst.length === 0 ? (
        <Panel>
          <Vide icone="camera" t={t('Aucune preuve encore')} s={t('Les preuves de ses missions chez vous apparaîtront ici.')} />
        </Panel>
      ) : (
        <Table
          legende={tf('Registre des preuves de {nom}', { nom: l.nom })}
          outils={
            <>
              <span className="b8 t14">{tf('Registre des preuves de {nom}', { nom: l.nom })}</span>
              <span className="sp"></span>
              <span className="lock">
                <Icone nom="lock" taille={14} />
                {tf('Conservées {n} jours', { n: P.conservationPreuvesJours })}
              </span>
            </>
          }
          pied={
            <>
              <span>{enFile ? tf('{n} preuve(s) en attente d’envoi', { n: enFile }) : t('Aucune preuve en attente d’envoi')}</span>
              <span>{t('Une preuve absente reporte la responsabilité sur celui qui devait la produire')}</span>
            </>
          }
          cle={(p) => p.id}
          rows={lst}
          cols={[
            { k: 'h', t: t('Heure'), main: true, rendu: (p) => <b>{p.le ? dateHeure(p.le) : '—'}</b> },
            {
              k: 'p',
              t: t('Paquet'),
              rendu: (p) => (
                <Link className="mono" to={chemin('preuves', { paquet: p.paquetId })}>
                  {p.paquetId}
                </Link>
              ),
            },
            { k: 'm', t: t('Maillon'), rendu: (p) => t(NOM_MAILLON[p.maillon] ?? p.maillon) },
            { k: 'v', t: t('Preuve'), rendu: (p) => t(p.genre.startsWith('photo') ? 'Photo' : p.genre === 'scan_depot' ? 'QR scanné' : p.genre === 'code' ? 'Code' : p.genre === 'confirmation' ? 'Confirmation' : 'Position') },
            {
              k: 's',
              t: t('Serveur'),
              rendu: (p) => (
                <Pill ton={p.statut === 'synchronisee' ? 'green' : p.statut === 'rejetee' || p.statut === 'expiree' ? 'red' : 'amber'} dot sm>
                  {t(p.statut === 'synchronisee' ? 'Synchronisée' : p.statut === 'en_file' ? 'En file' : p.statut === 'rejetee' ? 'Rejetée' : p.statut === 'attendue' ? 'Attendue' : 'Expirée')}
                </Pill>
              ),
            },
          ]}
        />
      )}
      <Hint icone="shield-check">{t('Toutes les photos sont prises dans l’application livreur BelivaY, horodatées par le serveur ; hors ligne, elles gardent l’heure et la position d’origine. Aucune preuve ne passe par WhatsApp.')}</Hint>
    </>
  )
}

function Messages({ l }: { l: FicheLivreur }) {
  const { t, tf } = usePreferences()
  const { dateHeure } = useDates()
  const fils = useLecture(() => source.messages.fils('livreurs'))
  const fil = (fils.donnees ?? []).find((f) => f.titre === l.nom)
  return (
    <div className="g g21">
      <Panel titre={tf('Fil avec {nom}', { nom: l.nom })} icone="message-circle" droite={<Pill sm>{t('Messagerie interne')}</Pill>}>
        {fil ? (
          <Link className="entA-msg" to={chemin('messages', { fil: fil.id })} style={{ display: 'block', color: 'inherit' }}>
            <div className="m">{dateHeure(fil.le)}</div>
            {fil.dernier}
            {fil.nonLus > 0 && (
              <>
                {' '}
                <span className="badge-num acc">{fil.nonLus}</span>
              </>
            )}
          </Link>
        ) : (
          <div className="t13 c3">{t('Aucun message échangé pour l’instant.')}</div>
        )}
        <div className="hr"></div>
        <Link className="btn primary" to={chemin('messages', fil ? { fil: fil.id } : { livreur: l.id })}>
          <Icone nom="send" taille={18} />
          <span>{tf('Écrire à {nom}', { nom: l.nom.split(' ')[0] })}</span>
        </Link>
      </Panel>
      <div className="col" style={{ gap: 16 }}>
        <Panel titre={t('Règles du fil')} icone="shield-check">
          <Rangee icone="eye-off" ton="acc" titre={t('Numéros masqués')} sous={t('Numéros, e-mails et identifiants sociaux masqués automatiquement dans les messages')} />
          <Rangee icone="link" ton="acc" titre={t('Rattaché aux missions')} sous={t('Chaque message peut citer un paquet ; le fil est journalisé')} />
          <Rangee icone="ban" ton="acc" titre={t('Jamais d’argent')} sous={t('Aucune demande d’argent ni de code secret Mobile Money')} />
        </Panel>
        <Panel titre={tf('Notifications envoyées à {nom}', { nom: l.nom.split(' ')[0] })} icone="bell">
          {(l.notifications ?? []).length === 0 ? (
            <div className="t13 c3">{t('Aucune notification envoyée depuis cette fiche.')}</div>
          ) : (
            <div className="tl">
              {l.notifications!.map((n, i) => (
                <div key={i} className="ti done">
                  <div className="tt">{n.texte}</div>
                  <div className="td">{dateHeure(n.le)}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

export default function Livreur() {
  const [params] = useSearchParams()
  const id = params.get('id')
  return id ? <FicheDuLivreur id={id} /> : <ChoixDuLivreur />
}

/** Fiche ouverte sans livreur (lien ancien, adresse tapée) : la flotte en raccourci, chaque nom ouvre sa fiche. */
function ChoixDuLivreur() {
  const { t } = usePreferences()
  const liste = useLecture(() => source.livreurs.liste(), [])
  return (
    <Ecran route="livreur">
      {liste.erreur && !liste.donnees ? (
        <ErreurLecture erreur={liste.erreur} relire={liste.relire} />
      ) : !liste.donnees ? (
        <Chargement lignes={4} />
      ) : (
        <div className="card tight">
          {liste.donnees.map((l) => (
            <Li
              key={l.id}
              gauche={<span className="e-av-l">{l.initiales}</span>}
              t={l.nom}
              s={t(NOM_STATUT[l.statut])}
              to={chemin('livreur', { id: l.id })}
            />
          ))}
        </div>
      )}
    </Ecran>
  )
}

/** Livreur qui n'est plus rattaché : parti (départ clôturé, DP-67), un lien ouvre son départ dans la file « Départs »
 * (tâche « versement_a_faire » du tableau de bord, qui mène à sa fiche) ; sinon, retiré ou lien ancien. */
function PlusRattache({ id, peut }: { id: string; peut: boolean }) {
  const { t, tf } = usePreferences()
  const departs = useLecture(() => (peut ? source.livreurs.departs() : Promise.resolve([])), [peut])
  const clos = (departs.donnees ?? []).find((d) => d.livreur.id === id && d.etat === 'close')
  return (
    <Ecran route="livreur">
      <Panel>
        <Vide
          icone="user-x"
          t={clos ? tf('{nom} est parti : départ clôturé', { nom: clos.livreur.nom }) : t('Ce livreur n’est plus rattaché')}
          s={clos ? t('Son accès est fermé. Son départ, son kit et son dernier versement restent dans la file « Départs ».') : t('Il a été retiré de votre flotte ou le lien est ancien. Il garde son historique ; vous gardez ses missions faites chez vous.')}
          action={
            clos ? (
              <Link className="btn primary" to={chemin('flotte', { statut: 'departs', sheet: 'depart', depart: clos.id })}>
                {t('Voir son départ')}
              </Link>
            ) : (
              <Link className="btn primary" to={chemin('flotte')}>
                {t('Voir la flotte')}
              </Link>
            )
          }
        />
      </Panel>
    </Ecran>
  )
}

function FicheDuLivreur({ id }: { id: string }) {
  const { t, tf } = usePreferences()
  const { date, heure, jour } = useDates()
  const maintenant = useHorloge()
  const s = useSession()
  const peut = usePeut(['proprietaire', 'repartiteur'])
  // Décisions d'employeur (suspendre, lever, retirer) : propriétaire et gérant (DP-66).
  const decide = usePeut(['proprietaire', 'gerant'])
  const mobile = useAppareil() === 'mobile'
  const fiche = useLecture(() => source.livreurs.fiche(id).then((f) => ({ f })), [id])
  const [onglet, choisir] = useOnglet<Onglet>(ONGLETS, 'profil')
  const modifier = useFeuilleParams('modifier')
  const suspendre = useFeuilleParams('suspendre')
  const retirer = useFeuilleParams('retirer')
  const joindre = useFeuilleParams('joindre', ['e'])
  const cloture = useFeuilleParams('cloturer')
  const [message, setMessage] = useState<string | null>(null)
  // Annuler une suspension faite par erreur (M16) : 10 secondes, le temps de se reprendre ; c'est une levée journalisée.
  const [annulable, setAnnulable] = useState(false)
  useEffect(() => {
    if (!annulable) return
    const id = setTimeout(() => setAnnulable(false), 10_000)
    return () => clearTimeout(id)
  }, [annulable])
  const l = fiche.donnees?.f
  if (fiche.erreur && !fiche.donnees)
    return (
      <Ecran route="livreur">
        <ErreurLecture erreur={fiche.erreur} relire={fiche.relire} />
      </Ecran>
    )
  if (fiche.donnees === null)
    return (
      <Ecran route="livreur">
        <Chargement lignes={4} />
      </Ecran>
    )
  if (!l) return <PlusRattache id={id} peut={peut} />
  const suspenduBelivay = l.suspension?.par === 'belivay'
  const a = l.activite
  const nomEntreprise = s.entreprise?.nom ?? ''
  const prenom = l.nom.split(' ')[0]
  const lever = async () => {
    const r = await source.livreurs.lever(l.id)
    jouer(r.ok ? 'interrupteur' : 'erreur')
    if (!r.ok) setMessage(t(r.raison === 'belivay' ? 'Cette suspension a été décidée par BelivaY : vous ne pouvez pas la lever.' : 'Ce livreur n’est pas suspendu.'))
  }
  const approuver = async () => {
    const r = await source.livreurs.approuver(l.id)
    jouer(r.ok ? 'valide' : 'erreur')
    setMessage(r.ok ? t('Approuvé : BelivaY a activé son accès.') : t('Pas encore prêt : pièces vérifiées et certification réussie d’abord.'))
  }
  const evt = l.evenements?.find((e) => e.id === joindre.param('e'))
  const piecesOk = l.pieces.every((p) => p.statut === 'valide')
  const certifOk = (l.certification?.quiz ?? 0) >= P.quizMin
  const mini: [string, string][] =
    l.statut === 'en_activation'
      ? [
          [t('Pièces'), piecesOk ? t('Vérifiées') : l.pieces.some((p) => p.statut === 'refusee') ? t('Refusée') : t('En vérification')],
          [t('Certification'), tf('{f} sur {n}', { f: l.certification?.modulesFaits ?? 0, n: l.certification?.modules ?? 0 })],
          [t('Approbation'), pret(l) ? t('À faire') : t('En attente')],
          [t('Zone prévue'), l.zones.join(' · ') || '—'],
        ]
      : l.statut === 'suspendu' && l.suspension
        ? [
            [t('Niveau'), suspenduBelivay ? String(l.suspension.niveau ?? '—') : t('Entreprise')],
            [t('Depuis'), `${date(l.suspension.depuis)} · ${heure(l.suspension.depuis)}`],
            [t('Fin'), l.suspension.jusqua ? date(l.suspension.jusqua) : t('à la levée')],
            [t('Recours'), suspenduBelivay ? t('Une fois') : '—'],
          ]
        : [
            [t('Trust Score'), l.trustScore === null ? '—' : String(l.trustScore)],
            [t('Paquets'), String(a?.paquets.length ?? 0)],
            [t('Délai tenu'), a && a.remis ? `${Math.round((a.dansLeDelai / a.remis) * 100)} %` : '—'],
            [t('Colis livrés'), String(a?.colisLivres ?? 0)],
          ]
  const pastille =
    l.statut === 'suspendu'
      ? suspenduBelivay
        ? t('Suspendu par BelivaY')
        : t('Suspendu par votre entreprise')
      : t(NOM_STATUT[l.statut])
  return (
    <Ecran
      route="livreur"
      titre={l.nom}
      entete={false}
      fixes={
        <>
          <Feuille ouverte={modifier.ouverte && peut} fermer={modifier.fermer} titre={t('Modifier')}>
            <FormModifier l={l} fermer={modifier.fermer} />
          </Feuille>
          <Feuille ouverte={suspendre.ouverte && decide} fermer={suspendre.fermer} titre={t('Suspendre')}>
            <FormMotif titre={tf('Suspendre {nom}', { nom: l.nom })} texte={t('Il ne reçoit plus de paquet ; ses missions en cours se terminent. Le motif lui est envoyé et inscrit au journal.')} bouton={t('Suspendre')} danger envoyer={async (m) => {
                const ok = (await source.livreurs.suspendre(l.id, m)).ok
                if (ok) setAnnulable(true)
                return ok
              }} fermer={suspendre.fermer} />
          </Feuille>
          <Feuille ouverte={retirer.ouverte && decide} fermer={retirer.fermer} titre={t('Retirer')}>
            <FormMotif
              titre={tf('Retirer {nom} de la flotte', { nom: l.nom })}
              texte={l.statut === 'en_mission' ? t('Il est en tournée : le retrait prendra effet après ses missions en cours, colis sous sa garde remis avec preuve. Il garde son historique et peut rejoindre une autre entreprise.') : t('Le rattachement se ferme maintenant. Il garde son historique et peut rejoindre une autre entreprise.')}
              bouton={t('Retirer')}
              danger
              envoyer={async (m) => (await source.livreurs.retirer(l.id, m)).ok}
              fermer={retirer.fermer}
            />
          </Feuille>
          {l.depart && <FeuilleCloture d={l.depart} ouverte={cloture.ouverte && peut && l.depart.manquantes.length === 0} fermer={cloture.fermer} />}
          <Feuille ouverte={joindre.ouverte && !!evt && peut} fermer={joindre.fermer} titre={t('Joindre des éléments')}>
            {evt && <FormMotif titre={t('Joindre vos éléments à la contestation')} texte={`« ${evt.libelle} »`} bouton={t('Joindre')} envoyer={async (m) => (await source.livreurs.joindreElements(l.id, evt.id, m)).ok} fermer={joindre.fermer} />}
          </Feuille>
        </>
      }
    >
      {fiche.erreur && <ErreurLecture erreur={fiche.erreur} relire={fiche.relire} lu={maintenant} />}
      {annulable && l.statut === 'suspendu' && !suspenduBelivay && (
        <div className="dk-banner amber" role="status">
          <Icone nom="ban" taille={20} />
          <div className="grow">{tf('{nom} est suspendu : il est prévenu et ne reçoit plus de paquet.', { nom: l.nom })}</div>
          <button type="button" className="btn sm secondary" onClick={() => (setAnnulable(false), void lever())}>
            <Icone nom="undo-2" taille={16} />
            <span>{t('Annuler')}</span>
          </button>
        </div>
      )}
      {message && (
        <div className="dk-banner acc" role="status">
          <Icone nom="info" taille={20} />
          <div className="grow">{message}</div>
        </div>
      )}
      {l.retraitDemande && (
        <div className="dk-banner amber" role="status">
          <Icone nom="user-x" taille={20} />
          <div className="grow">{t('Retrait décidé par votre entreprise : il prendra effet après ses missions en cours.')}</div>
        </div>
      )}
      {(l.alertes ?? []).length > 0 && l.statut !== 'suspendu' && (
        <div className="dk-banner amber" role="status">
          <Icone nom="triangle-alert" taille={20} />
          <div className="grow">
            <b>{(l.alertes ?? []).map((x) => t(NOM_ALERTE[x] ?? x)).join(' · ')}</b> {t('Sans mise à jour, le livreur ne reçoit plus de nouveau paquet ; ses colis en cours se terminent.')}
          </div>
          {peut && (
            <button type="button" className="btn primary" onClick={() => void source.livreurs.prevenir(l.id, (l.alertes ?? []).includes('certification') ? 'certification' : (l.alertes ?? []).some((x) => x.startsWith('vehicule')) ? 'vehicule' : 'piece').then(() => (jouer('envoi'), setMessage(tf('{nom} est prévenu.', { nom: prenom }))))}>
              <Icone nom="send" taille={18} />
              <span>{tf('Prévenir {nom}', { nom: prenom })}</span>
            </button>
          )}
        </div>
      )}
      <div className="row" style={{ marginBottom: 12, justifyContent: 'space-between' }}>
        <Link className="entA-link" to={chemin('flotte')}>
          <Icone nom="chevron-left" taille={16} />
          {t('Livreurs')}
        </Link>
        <span className="t12 c3">{`${jour(maintenant)} · ${heure(maintenant)}`}</span>
      </div>
      <div className={'hero ' + (l.statut === 'suspendu' ? 'red' : 'night')} style={{ marginTop: 0 }}>
        <div className="entA-hero">
          <span className="av" aria-hidden="true">
            {l.initiales}
          </span>
          <div className="grow">
            <div className="hk">{tf('Livreur partenaire · {entreprise}', { entreprise: nomEntreprise })}</div>
            {mobile ? <h2 className="nm" style={{ margin: 0 }}>{l.nom}</h2> : <h1 className="nm">{l.nom}</h1>}
            <div className="pl">
              <Pill ton="dk" dot>
                {pastille}
              </Pill>
              {l.depart && (
                <Pill ton="dk" icone="log-out">
                  {l.depart.echu ? t('Préavis de départ échu') : l.depart.initiative === 'entreprise' ? tf('Fin de contrat · préavis jusqu’au {d}', { d: date(l.depart.preavisJusqua) }) : tf('Départ demandé · préavis jusqu’au {d}', { d: date(l.depart.preavisJusqua) })}
                </Pill>
              )}
              {l.statut === 'en_activation' ? (
                <Pill ton="dk">{t('Livreur partenaire')}</Pill>
              ) : (
                <>
                  {l.trustScore !== null && (
                    <Pill ton="dk" icone="gauge">
                      {tf('Trust {n} · {p}', { n: l.trustScore, p: t(NOM_PALIER[palierLivreur(l.trustScore)]) })}
                    </Pill>
                  )}
                  {l.certifieJusqua && (
                    <Pill ton="dk" icone="badge-check">
                      {l.certification?.quiz != null ? tf('Certifié {q}/{n} · jusqu’au {d}', { q: l.certification.quiz, n: P.quizSur, d: date(l.certifieJusqua, true) }) : tf('Certifié jusqu’au {d}', { d: date(l.certifieJusqua, true) })}
                    </Pill>
                  )}
                </>
              )}
            </div>
          </div>
          {peut && (
            <div className="acts">
              <Link className="btn white" to={chemin('livreur', { id: l.id, t: 'messages' })}>
                <Icone nom="send" taille={18} />
                <span>{t('Envoyer un message')}</span>
              </Link>
              {l.statut !== 'en_activation' && l.statut !== 'suspendu' && (
                <button type="button" className="btn dark" onClick={() => modifier.ouvrir()}>
                  <Icone nom="pencil" taille={18} />
                  <span>{t('Modifier')}</span>
                </button>
              )}
            </div>
          )}
        </div>
        <div className="entA-mini4">
          {mini.map(([k, v]) => (
            <div key={k} className="m4">
              <div className="l">{k}</div>
              <div className="v">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {l.depart && <BlocDepart d={l.depart} peut={peut} prenom={prenom} cloturer={() => cloture.ouvrir()} />}
      {(l.absences ?? []).length > 0 && <BlocAbsences absences={l.absences!} peut={peut} />}

      {l.statut === 'suspendu' && l.suspension && (
        <div className="g g3">
          <Panel titre={t('Suspension')} icone="ban">
            <Kv k={t('Décidée par')} v={suspenduBelivay ? t('BelivaY, après examen humain') : t('Votre entreprise')} />
            {suspenduBelivay && <Kv k={t('Niveau')} v={String(l.suspension.niveau ?? '—')} />}
            <Kv k={t('Motif')} v={l.suspension.motif} />
            <Kv k={t('Depuis')} v={`${date(l.suspension.depuis)} · ${heure(l.suspension.depuis)}`} />
            <Kv k={t('Date de fin')} v={l.suspension.jusqua ? date(l.suspension.jusqua) : t('à la levée')} />
          </Panel>
          <Panel titre={t('Ce que vous pouvez faire')} icone="info">
            <div className="t13 c2 lh">{suspenduBelivay ? tf('Joindre vos éléments au recours de {nom} : il conteste lui-même depuis son application, une fois. {e} ne peut pas lever la suspension ; aucun nouveau paquet ne lui est affecté d’ici là.', { nom: prenom, e: nomEntreprise }) : t('Vous avez suspendu ce livreur : vous pouvez lever la suspension à tout moment.')}</div>
            {peut && (
              <div className="btns">
                {suspenduBelivay ? (
                  <Link className="btn primary" to={chemin('messages', { livreur: l.id, sujet: 'recours' })}>
                    <Icone nom="send" taille={18} />
                    <span>{t('Joindre vos éléments au recours')}</span>
                  </Link>
                ) : (
                  decide && (
                    <Link className="btn primary" to={chemin('livreur', { id: l.id, t: 'emploi', sheet: 'emploi', d: 'reintegrer' })}>
                      <Icone nom="circle-check" taille={18} />
                      <span>{t('Lever la suspension')}</span>
                    </Link>
                  )
                )}
              </div>
            )}
          </Panel>
          <Panel titre={t('Échelle des mesures sur l’accès')} icone="scale">
            <Kv k={tf('Niveau {n}', { n: 1 })} v={t('Avertissement écrit')} />
            <Kv k={tf('Niveau {n}', { n: 2 })} v={t('Accès restreint, recertification')} />
            <Kv k={tf('Niveau {n}', { n: 3 })} v={t('Suspension')} />
            <Kv k={tf('Niveau {n}', { n: 4 })} v={t('Retrait définitif')} />
            <div className="t12 c3 mt8">{t('Niveaux 2 à 4 : proposés par le système, validés par un humain avec motif écrit ; recours une fois ; l’entreprise est informée à chaque niveau.')}</div>
          </Panel>
        </div>
      )}

      {l.statut === 'en_activation' ? (
        <>
          <div className="g g21">
            <Panel titre={t('Ce qui manque avant l’activation')} icone="list-checks">
              <Etape n={1} st="done" titre={t('Invitation envoyée par SMS')} />
              <Etape n={2} st={l.charteLe ? 'done' : 'cur'} titre={t('Première connexion, code PIN et charte')} sous={l.charteLe ? tf('Acceptées le {d}', { d: date(l.charteLe) }) : t('En attente du livreur')} />
              <Etape
                n={3}
                st={piecesOk ? 'done' : l.pieces.some((p) => p.statut === 'refusee') ? 'bad' : 'wait'}
                titre={tf('Pièces de {nom} : {v} sur {n} vérifiées', { nom: prenom, v: l.pieces.filter((p) => p.statut === 'valide').length, n: l.pieces.length })}
                sous={l.pieces.some((p) => p.statut === 'en_revue') ? t('À contrôler par votre entreprise : ouvrez chaque pièce, validez-la ou refusez-la avec un motif.') : l.pieces.some((p) => p.statut === 'refusee' || p.statut === 'manquante') ? t('En attente du livreur : pièce refusée à renvoyer ou pas encore envoyée.') : undefined}
                droite={
                  !piecesOk &&
                  (peut ? (
                    <Link className="btn sm primary" to={chemin('pieces', { id: l.id })}>
                      <Icone nom="eye" taille={16} />
                      <span>{l.pieces.some((p) => p.statut === 'en_revue') ? t('Contrôler') : t('Voir')}</span>
                    </Link>
                  ) : (
                    <Pill ton="amber" dot sm>
                      {t('En vérification')}
                    </Pill>
                  ))
                }
              />
              <Etape
                n={4}
                st={certifOk ? 'done' : piecesOk ? 'cur' : ''}
                titre={tf('Certification BelivaY : {f} modules sur {n}', { f: l.certification?.modulesFaits ?? 0, n: l.certification?.modules ?? 0 })}
                sous={tf('Puis le quiz : {q} bonnes réponses sur {s} au moins.', { q: P.quizMin, s: P.quizSur })}
              />
              <Etape
                n={5}
                st={pret(l) ? 'cur' : ''}
                titre={t('Votre approbation')}
                sous={t('Le bouton s’active quand pièces et certification sont validées.')}
                droite={
                  peut && (
                    <button type="button" className="btn sm primary" disabled={!pret(l)} onClick={() => void approuver()}>
                      <Icone nom="user-round-check" taille={18} />
                      <span>{t('Approuver')}</span>
                    </button>
                  )
                }
              />
              <Etape n={6} titre={t('Activation par BelivaY')} sous={tf('{nom} apparaît alors « disponible » dans votre flotte.', { nom: prenom })} />
            </Panel>
            <div className="col" style={{ gap: 16 }}>
              <Panel titre={tf('Pièces de {nom}', { nom: prenom })} icone="id-card" a={peut ? { t: t('Contrôler les pièces'), to: chemin('pieces', { id: l.id }) } : undefined}>
                {l.pieces.map((p) => (
                  <Rangee
                    key={p.type}
                    icone={p.statut === 'valide' ? 'file-check' : 'file-clock'}
                    ton={p.statut === 'valide' ? 'green' : p.statut === 'en_revue' ? 'amber' : 'red'}
                    chaud={p.statut !== 'valide'}
                    titre={t(NOM_PIECE[p.type] ?? p.type)}
                    droite={
                      <Pill ton={STATUT_PIECE[p.statut][1]} dot={p.statut !== 'valide'} icone={p.statut === 'valide' ? 'check' : undefined} sm>
                        {t(STATUT_PIECE[p.statut][0])}
                      </Pill>
                    }
                  />
                ))}
                <div className="entA-note-lock">
                  <Icone nom="lock" taille={16} />
                  {tf('Vous ouvrez chaque pièce par un lien de quelques minutes, en filigrane ; vous ne pouvez envoyer aucune pièce à la place de {nom}.', { nom: prenom })}
                </div>
              </Panel>
              <Panel titre={t('Profil prévu')} icone="user-round">
                <Kv k={t('Véhicule')} v={`${t(NOM_VEHICULE[l.vehicule])}${l.plaque ? ' · ' + l.plaque : ''}`} />
                <Kv k={t('Zones')} v={l.zones.join(' · ') || '—'} />
                <Kv k={t('Capacité')} v={tf('{n} colis', { n: l.capacite ?? 0 })} />
                <Kv k={t('Téléphone')} v={telMasque(l.telephone)} />
                <div className="mt8">
                  <Link className="entA-link" to={chemin('ajout')}>
                    {t('Suivi des invitations')}
                    <Icone nom="chevron-right" taille={14} />
                  </Link>
                </div>
              </Panel>
            </div>
          </div>
          <div className="g g2">
            <Panel titre={tf('Certification BelivaY · {n} modules et un quiz', { n: l.certification?.modules ?? 0 })} icone="graduation-cap">
              <div className="row" style={{ gap: 12 }}>
                <Barre pct={(100 * (l.certification?.modulesFaits ?? 0)) / Math.max(1, l.certification?.modules ?? 1)} ton="acc" />
                <b className="nw">{tf('{f} sur {n}', { f: l.certification?.modulesFaits ?? 0, n: l.certification?.modules ?? 0 })}</b>
              </div>
              <div className="check">
                <span className={'cbx' + (certifOk ? ' on' : '')}>{certifOk && <Icone nom="check" taille={14} trait={3} />}</span>
                <span className="grow">{tf('Quiz final : {s} questions, {q} bonnes réponses au moins', { s: P.quizSur, q: P.quizMin })}</span>
              </div>
            </Panel>
            <Panel titre={t('Pendant l’activation')} icone="info">
              <Rangee icone="ban" ton="ink" titre={t('Aucune mission')} sous={tf('{nom} n’est pas proposé à l’affectation et ne compte pas dans les livreurs actifs.', { nom: prenom })} />
              <Rangee icone="map-pinned" ton="ink" titre={tf('Zones {z}', { z: l.zones.join(', ') })} sous={t('Il ne rend pas une zone active tant qu’il n’est pas activé.')} />
              <Rangee icone="hourglass" ton="ink" titre={t('Trust Score')} sous={t('Il démarrera au neutre : aucun paquet ne lui sera refusé à cause de son score de départ.')} />
            </Panel>
          </div>
        </>
      ) : (
        <>
          <div style={{ marginTop: 16 }}>
            <Choix
              forme="tabs"
              aria={t('Sections de la fiche')}
              actif={onglet}
              choisir={choisir}
              items={[
                { id: 'profil', t: t('Profil'), icone: 'user-round' },
                { id: 'emploi', t: t('Emploi'), icone: 'briefcase' },
                { id: 'activite', t: t('Activité'), icone: 'activity' },
                { id: 'score', t: t('Score'), icone: 'gauge', n: l.evenements?.filter((e) => e.contestation && !e.contestation.elements).length },
                { id: 'preuves', t: t('Preuves'), icone: 'camera' },
                { id: 'messages', t: t('Messages'), icone: 'message-circle' },
              ]}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            {onglet === 'profil' && l.statut === 'en_mission' && peut && <PositionDirecte livreurId={l.id} />}
            {onglet === 'profil' && <Profil l={l} peut={peut} modifier={() => modifier.ouvrir()} />}
            {onglet === 'emploi' && <OngletEmploi id={l.id} prenom={prenom} absences={l.absences ?? []} />}
            {onglet === 'activite' && <Activite l={l} />}
            {onglet === 'score' && <Score l={l} peut={peut} joindre={(e) => joindre.ouvrir({ e })} />}
            {onglet === 'preuves' && <Preuves l={l} />}
            {onglet === 'messages' && <Messages l={l} />}
          </div>
          {decide && l.statut !== 'retire' && (
            <Panel titre={t('Rattachement')} icone="user-cog" style={{ marginTop: 16 }}>
              <div className="t13 c2 lh">{tf('{e} approuve, suspend ou retire ses livreurs ; un retrait prend effet après les missions en cours.', { e: nomEntreprise })}</div>
              <div className="btns mt6">
                <Link className="btn sm ghost" to={chemin('livreur', { id: l.id, t: 'emploi' })}>
                  <Icone nom="briefcase" taille={16} />
                  <span>{t('Avertissement, essai, congés, fin de contrat : onglet Emploi')}</span>
                </Link>
              </div>
              <div className="btns">
                {l.statut !== 'suspendu' && (
                  <button type="button" className="btn secondary" onClick={() => suspendre.ouvrir()}>
                    <Icone nom="pause" taille={18} />
                    <span>{t('Suspendre')}</span>
                  </button>
                )}
                {!l.retraitDemande && (
                  <button type="button" className="btn danger" onClick={() => retirer.ouvrir()}>
                    <Icone nom="user-x" taille={18} />
                    <span>{t('Retirer de la flotte')}</span>
                  </button>
                )}
                {(l.alertes ?? []).includes('certification') && (
                  <button type="button" className="btn secondary" onClick={() => void source.livreurs.prevenir(l.id, 'certification').then(() => jouer('envoi'))}>
                    {t('Rappeler la certification')}
                  </button>
                )}
              </div>
            </Panel>
          )}
        </>
      )}
    </Ecran>
  )
}
