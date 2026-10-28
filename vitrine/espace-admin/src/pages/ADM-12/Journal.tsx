// ADM-P31 · Journal d'audit (ADM-12 § 45). Structure du prototype : bandeau « Journal en ajout seul », indicateurs,
// tableau (recherche, auteur, rôle, action, période ; ligne → tiroir « Non modifiable » → objet), « Demandes d'accès
// aux données », « Conservation » ; en plus, dans les mêmes panneaux : reconstitution d'un objet à une date et exports
// signés à quatre yeux. Ouvrir le journal ajoute une ligne « journal.consulter » (ADM-P31R-02). Direction et Audit
// voient tout le journal ; les autres rôles, leur part (A-11). Aucune ligne ne se modifie ni ne s'efface.
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { csvSigne } from '../../composants/ExportSigne'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Icone } from '../../composants/Icone'
import { Perimetre } from '../../composants/Perimetre'
import { AucunResultat, Choix, Frise, Kpi, Kv, Li, Panel, Pill, Props, Puces, Px, Recherche, St, Table, useSurtitre } from '../../composants/prototype'
import { NOM_ROLE } from '../../config/libelles'
import { chemin } from '../../config/pages'
import { ROLES, type Role } from '../../donnees/communs'
import type { DemandeDonnees, FiltreJournal, LigneJournal, Reconstitution, TableauJournal } from '../../donnees/domaines/gouvernance'
import { telecharger } from '../../donnees/exports'
import { source } from '../../donnees/source'
import { useLecture, type Lecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge, usePeut, useRole, useRouteOuverte, useSession } from '../../session'
import { EtatLecture, NOM_ESPACE, useDate, useRaison } from './commun-s6'
import { useFonctions } from '../AJ-A/fonctions-page'
import { Ecarts } from '../../composants/poste/Ecarts'

type Ligne = TableauJournal['lignes'][number]

/** Page où vit l'objet d'une ligne (identifiants BLV-, LT-, KYC-, RB-, PQ-, FR-, QY-, DA-, ST-, MT-). */
export function lienObjet(objet: string): string | null {
  const m = /\b(BLV-\d+|LT-\d+|KYC-\d+|RB-\d+|PQ-[\w-]+|FR-\d+-\d+|QY-\d+|DA-\d+|ST-\d+|MT-\d+|EX-\d+)/.exec(objet)
  if (!m) return null
  const id = m[1]
  const [p] = id.split('-')
  const route: Record<string, [string, string]> = { BLV: ['commandes', 'ref'], LT: ['litige', 'id'], KYC: ['kyc', 'id'], RB: ['remboursements', 'id'], PQ: ['paquets', 'id'], FR: ['fraude', 'alerte'], QY: ['quatreyeux', 'id'], DA: ['conservation', 'demande'], ST: ['comptes', 'fiche'], MT: ['sante', 'maintenance'], EX: ['journal', 'q'] }
  const r = route[p]
  return r ? chemin(r[0], { [r[1]]: id }) : null
}

export default function Journal() {
  const { t, tf } = usePreferences()
  const surtitre = useSurtitre()
  const date = useDate()
  const role = useRole()
  const peutExporter = usePeut('exporter')
  const ouverteRoute = useRouteOuverte()
  const [params, setParams] = useSearchParams()
  const filtre: FiltreJournal = { q: params.get('q') ?? '', agentId: params.get('auteur') ?? undefined, role: (params.get('role_l') as Role) || undefined, action: params.get('action') ?? undefined, periode: (params.get('periode') as FiltreJournal['periode']) ?? 'tout' }
  const l = useLecture(() => source.gouvernance.tableauJournal(filtre), [params.toString()])
  const [ligne, setLigne] = useState<Ligne | null>(null)
  const [exportPortee, setExportPortee] = useState<'jour' | 'demande'>('jour')
  const [demandeChoisie, setDemandeChoisie] = useState('')
  const [decision, setDecision] = useState(false)
  // Ouvrir le journal est une consultation journalisée (une ligne par minute et par agent : la source en décide).
  const fait = useRef(false)
  useEffect(() => {
    if (fait.current) return
    fait.current = true
    void source.gouvernance.consulterJournal().catch(() => undefined)
  }, [])
  const poser = (k: string, v: string) => {
    const p = new URLSearchParams(params)
    if (v) p.set(k, v)
    else p.delete(k)
    setParams(p, { replace: true })
  }
  const demandes = useLecture(() => (['superviseur', 'audit', 'support'].includes(role) ? source.gouvernance.demandesDonnees() : Promise.resolve([])), [role])
  const exportsL = useLecture(() => source.gouvernance.exportsJournal(), [])
  const maintenant = useHorloge()
  const debut = maintenant - ((maintenant + 3600_000) % 86_400_000)
  const d0 = l.donnees
  const aller = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  const fonctions = useFonctions([
    { verbe: 'Contrôler', n: d0?.aujourdhui ?? 0, unite: ['ligne du jour', 'lignes du jour'], icone: 'scroll-text', onClick: () => poser('periode', 'jour') },
    { verbe: 'Vérifier', n: d0?.sensibles ?? 0, unite: ['donnée sensible consultée', 'données sensibles consultées'], icone: 'shield-alert', onClick: () => poser('q', 'demasquer'), alerte: (d0?.sensibles ?? 0) > 0 },
    { verbe: 'Reconstituer', n: null, unite: ['objet', 'objets'], icone: 'history', onClick: () => aller('reconstituer') },
    peutExporter && { verbe: 'Exporter', n: null, unite: ['journal', 'journaux'], icone: 'file-lock', onClick: () => aller('export') },
  ])
  return (
    <Ecran
      route="journal"
      kicker={surtitre}
      fonctions={fonctions}
    >
      <Px>
        <Pill ton="acc" icone="lock">{t('Journal en ajout seul · votre consultation est journalisée')}</Pill>
        <Perimetre route="journal" />
        <EtatLecture l={l} quoi="le journal d’audit">
          {(d) => (
            <>
              <div className="g g4">
                <Kpi k={t('Lignes aujourd’hui')} v={d.aujourdhui} s={tf('{n} dans {part}', { n: d.total, part: d.tout ? t('tout le journal') : t('votre part') })} icone="scroll-text" />
                <Kpi k={t('Consultations du journal')} v={d.consultations} s={t('aujourd’hui · elles-mêmes journalisées')} icone="eye" />
                <Kpi k={t('Données sensibles consultées')} v={d.sensibles} s={t('démasquages, pièces, numéros')} icone="shield-alert" iton="amber" />
                <Kpi k={t('Intégrité de la chaîne')} v={d.chaine.ok ? t('Intacte') : tf('Cassée à la ligne {n}', { n: d.chaine.casseeA ?? 0 })} s={tf('{n} empreintes vérifiées', { n: d.chaine.lignes })} icone="link" ton="night" />
              </div>
              <div style={{ marginTop: 16 }}>
                <Table
                  outils={
                    <>
                      <Recherche q={filtre.q ?? ''} setQ={(v) => poser('q', v)} placeholder={t('Auteur, objet, action, motif…')} aria={t('Rechercher dans le journal')} />
                      <Puces aria={t('Période')} actif={filtre.periode ?? 'tout'} choisir={(v) => poser('periode', v === 'tout' ? '' : v)} items={[{ id: 'jour', t: 'Aujourd’hui' }, { id: '7j', t: '7 jours' }, { id: 'tout', t: 'Tout' }]} />
                      {d.tout && (
                        <label className="flt">
                          <Icone nom="user" taille={15} />
                          <select value={filtre.agentId ?? ''} onChange={(e) => poser('auteur', e.target.value)} aria-label={t('Auteur')}>
                            <option value="">{t('Tous les auteurs')}</option>
                            {d.agents.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.nom}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <label className="flt">
                        <Icone nom="badge-check" taille={15} />
                        <select value={filtre.role ?? ''} onChange={(e) => poser('role_l', e.target.value)} aria-label={t('Rôle')}>
                          <option value="">{t('Tous les rôles')}</option>
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {t(NOM_ROLE[r])}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flt">
                        <Icone nom="zap" taille={15} />
                        <select value={filtre.action ?? ''} onChange={(e) => poser('action', e.target.value)} aria-label={t('Action')}>
                          <option value="">{t('Toutes les actions')}</option>
                          {d.actions.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </label>
                      <span className="sp" />
                      <span className="lock">
                        <Icone nom="lock" taille={15} />
                        {t('Ajout seul')}
                      </span>
                    </>
                  }
                  cle={(x) => String(x.n)}
                  rows={d.lignes}
                  vide={<AucunResultat effacer={() => setParams({}, { replace: true })} />}
                  cols={[
                    { k: 'h', t: t('Heure serveur'), rendu: (x) => (<><span className="mono b7 nw">{date(x.le).split(' · ')[1]}</span><div className="t2">{date(x.le).split(' · ')[0]}</div></>) },
                    { k: 'a', t: t('Auteur · rôle'), rendu: (x) => (<><b>{x.agent}</b><div className="t2">{t(NOM_ROLE[x.role])}</div></>) },
                    { k: 'act', t: t('Action'), main: true, rendu: (x) => (<><b>{x.action}</b>{x.detail.sensible && <div className="t2"><Pill ton="amber" sm icone="eye">{t('Donnée sensible')}</Pill></div>}</>) },
                    { k: 'o', t: t('Objet'), rendu: (x) => x.objet },
                    { k: 'm', t: t('Motif'), hideM: true, rendu: (x) => <span className="t13 c2">{x.motif ?? '—'}</span> },
                    { k: 'ba', t: t('Avant → après'), hideM: true, rendu: (x) => <span className="t13">{x.detail.avant || x.detail.apres ? `${x.detail.avant ?? '—'} → ${x.detail.apres ?? '—'}` : '—'}</span> },
                    { k: 'ip', t: t('Adresse · appareil'), hideM: true, rendu: (x) => (<span className="t12 c3">{x.detail.adresse}<div>{x.detail.appareil.split(' · ')[0]}</div></span>) },
                    { k: 'go', t: '', cls: 'r', rendu: (x) => (<button type="button" className="btn sm secondary" onClick={() => setLigne(x)} aria-label={tf('Ouvrir la ligne {n}', { n: x.n })}>{t('Ouvrir')}</button>) },
                  ]}
                  pied={
                    <>
                      <span>{tf('{n} lignes affichées · {total} dans {part}', { n: d.lignes.length, total: d.total, part: d.tout ? t('tout le journal') : t('votre part') })}</span>
                      <span>{t('Heure du serveur · Afrique/Douala (UTC+1)')}</span>
                    </>
                  }
                />
              </div>
              <div className="g g2">
                <Reconstituer debut={debut} />
                {peutExporter && (
                  <Panel titre={t('Exporter le journal (signé)')} icone="file-lock" id="export" droite={<Pill ton="acc" icone="users">{t('Quatre yeux')}</Pill>}>
                    <Choix forme="seg" aria={t('Portée de l’export')} actif={exportPortee} choisir={setExportPortee} items={[{ id: 'jour', t: t('Aujourd’hui') }, { id: 'demande', t: t('Demande d’accès') }]} />
                    {exportPortee === 'demande' && (
                      <label className="fld mt10">
                        <span className="fld-t">{t('Demande d’accès')}</span>
                        <span className="inp">
                          <select value={demandeChoisie} onChange={(e) => setDemandeChoisie(e.target.value)}>
                            <option value="">{t('Choisir une demande')}</option>
                            {(demandes.donnees ?? []).map((x) => (
                              <option key={x.id} value={x.id}>{`${x.id} · ${x.acteur}`}</option>
                            ))}
                          </select>
                        </span>
                      </label>
                    )}
                    <div className="mt10">
                      <details className="a-plie">
                        <summary>{t('Contenu du fichier')}</summary>
                        <div className="a-plie-c"><Props paires={[[t('Colonnes'), t('Horodatage, auteur, rôle, action, objet, motif, avant, après, adresse, appareil, empreinte')], [t('Format'), t('CSV, empreinte SHA-256 en dernière ligne')], [t('Second validateur'), t('Direction ou Finance, un autre compte : le fichier se télécharge après sa validation')]]} /></div>
                      </details>
                    </div>
                    <div className="adme-btns">
                      <button type="button" className="btn primary" disabled={exportPortee === 'demande' && !demandeChoisie} onClick={() => setDecision(true)}>
                        <Icone nom="send" taille={18} />
                        <span>{t('Demander la validation')}</span>
                      </button>
                    </div>
                    <EtatLecture l={exportsL} quoi="les exports">
                      {(ex) =>
                        ex.length ? (
                          <div className="mt12">
                            {ex.map((e) => (
                              <Li
                                key={e.id}
                                icone="file-spreadsheet"
                                ton={e.etat === 'contresignee' ? 'green' : 'acc'}
                                t={`${e.id} · ${tf('{n} lignes', { n: e.lignes })}`}
                                s={`${e.demandeur} · ${date(e.demandeLe)}${e.telechargeLe ? ' · ' + t('téléchargé') : ''}`}
                                droite={
                                  e.etat === 'contresignee' ? (
                                    <button
                                      type="button"
                                      className="btn sm primary"
                                      onClick={async () => {
                                        const r = await source.gouvernance.telechargerExport(e.id)
                                        if (!r.ok) return
                                        const s = await csvSigne(r.entetes, r.lignes, `BELIVAY SARL · ${e.id}`)
                                        telecharger(new Blob([s.contenu], { type: 'text/csv;charset=utf-8' }), r.nom)
                                      }}
                                    >
                                      {t('Télécharger')}
                                    </button>
                                  ) : (
                                    <St t={t(e.etat === 'refusee' ? 'Refusé ou expiré' : 'En attente du second validateur')} ton={e.etat === 'refusee' ? 'red' : 'amber'} />
                                  )
                                }
                              />
                            ))}
                          </div>
                        ) : null
                      }
                    </EtatLecture>
                  </Panel>
                )}
              </div>
              {(role === 'audit' || role === 'superviseur') && (
                <div className="mt14">
                  <Ecarts />
                </div>
              )}
              <div className="g g2">
                <Demandes l={demandes} />
                <Panel titre={t('Conservation')} icone="archive" a={ouverteRoute('conservation') ? { t: t('Durées et effacement'), to: chemin('conservation') } : undefined}>
                  <Kv k={t('Journal d’audit')} v={tf('{n} ans au moins', { n: d.conservationAns })} />
                  <Kv k={t('Argent : paiements, escrow, versements')} v={tf('{n} ans au moins', { n: d.conservationAns })} />
                  <Kv k={t('Modification ou suppression d’une ligne')} v={<span className="cr">{t('Impossible, pour tous')}</span>} />
                </Panel>
              </div>
              <DecisionMotivee
                ouverte={decision}
                fermer={() => setDecision(false)}
                titre={t('Exporter le journal (signé)')}
                action="journal.exporter"
                objet={exportPortee === 'jour' ? 'Journal d’audit · aujourd’hui' : demandeChoisie}
                resume={exportPortee === 'jour' ? t('Export des lignes du jour, en CSV signé ; le fichier se télécharge après la validation d’un autre compte.') : t('Export des seules lignes de l’acteur, sans données de tiers.')}
                quatreYeux
                rolesSecond={['superviseur', 'finance']}
                apres={(r) => r && void source.gouvernance.lierExport(r.id, exportPortee === 'jour' ? { genre: 'periode', du: debut, au: debut + 86_400_000 } : { genre: 'demande', demande: demandeChoisie })}
              />
              <Feuille ouverte={!!ligne} fermer={() => setLigne(null)} titre={t('Ligne du journal')} forme="tiroir">
                {ligne && <DetailLigne l={ligne} fermer={() => setLigne(null)} />}
              </Feuille>
            </>
          )}
        </EtatLecture>
      </Px>
    </Ecran>
  )
}

function DetailLigne({ l }: { l: Ligne; fermer: () => void }) {
  const { t } = usePreferences()
  const lien = lienObjet(l.objet)
  const ouverte = useRouteOuverte()
  const route = lien?.split('?')[0].replace(/^\//, '') ?? ''
  return (
    <div className="e-decision">
      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
        <span className="kick acc">{t('Ligne du journal')}</span>
        <Pill ton="ink" sm icone="lock">
          {t('Non modifiable')}
        </Pill>
      </div>
      <h2 className="card-t mt8">{l.action}</h2>
      <div className="mt12">
        <Props
          paires={[
            [t('Horodatage serveur'), <span className="mono" key="h">{new Date(l.le).toISOString().replace('T', ' ').replace('Z', ' UTC')}</span>],
            [t('Auteur'), l.agent],
            [t('Rôle'), t(NOM_ROLE[l.role])],
            [t('Action'), l.action],
            [t('Objet'), lien && ouverte(route) ? <Link key="o" to={lien}>{l.objet}</Link> : l.objet],
            [t('Motif'), l.motif ?? '—'],
            [t('Avant'), l.detail.avant ?? '—'],
            [t('Après'), l.detail.apres ?? '—'],
            [t('Zone'), l.zone ?? '—'],
            [t('Adresse'), l.detail.adresse],
            [t('Appareil'), l.detail.appareil],
            [t('Empreinte'), <span className="mono t12" key="e" title={l.empreinte}>{`${l.empreinte.slice(0, 8)}… ← ${l.precedente.slice(0, 8)}…`}</span>],
          ]}
        />
      </div>
    </div>
  )
}

function Reconstituer({ debut }: { debut: number }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  const [objet, setObjet] = useState('')
  const [heure, setHeure] = useState('23:59')
  const [r, setR] = useState<Reconstitution | null>(null)
  const lancer = async () => {
    const [h, m] = heure.split(':').map(Number)
    setR(await source.gouvernance.reconstituer(objet.trim(), debut + (h * 60 + m) * 60_000))
  }
  return (
    <Panel titre={t('Reconstituer l’objet à une date')} icone="history" id="reconstituer">
      <div className="g g2" style={{ marginTop: 0 }}>
        <label className="fld">
          <span className="fld-t">{t('Objet')}</span>
          <span className="inp">
            <input value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="FR-261013-01, KYC-0088…" />
          </span>
        </label>
        <label className="fld">
          <span className="fld-t">{t('Aujourd’hui, à')}</span>
          <span className="inp">
            <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} />
          </span>
        </label>
      </div>
      <div className="adme-btns">
        <button type="button" className="btn secondary" disabled={!objet.trim()} onClick={() => void lancer()}>
          <Icone nom="history" taille={18} />
          <span>{t('Reconstituer')}</span>
        </button>
      </div>
      {r && (
        <div className="mt12">
          <div className="adme-quote">
            <b>{tf('État reconstitué de {o} à {h} :', { o: r.objet, h: date(r.jusqua) })}</b> {r.etat ?? (r.lignes.length ? t('aucun changement d’état enregistré') : t('aucune ligne pour cet objet à cette date'))}
          </div>
          {!!r.lignes.length && <div className="mt12"><Frise items={r.lignes.map((x: LigneJournal, i) => ({ t: `${date(x.le)} — ${x.action}`, d: `${x.agent}${x.motif ? ' · ' + x.motif : ''}`, st: i === r.lignes.length - 1 ? 'cur' : 'done' }))} /></div>}
        </div>
      )}
    </Panel>
  )
}

function Demandes({ l }: { l: Lecture<DemandeDonnees[]> }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  const raison = useRaison()
  const role = useRole()
  const { agent } = useSession()
  const ouverte = useRouteOuverte()
  const [feuille, setFeuille] = useState(false)
  const [acteur, setActeur] = useState('')
  const [type, setType] = useState<'acces' | 'rectification' | 'export'>('acces')
  if (!['superviseur', 'audit', 'support'].includes(role))
    return (
      <Panel titre={t('Demandes d’accès aux données')} icone="file-lock">
      </Panel>
    )
  return (
    <Panel titre={t('Demandes d’accès aux données')} icone="file-lock" a={ouverte('conservation') ? { t: t('Répondre'), to: chemin('conservation') } : undefined}>
      <EtatLecture l={l} quoi="les demandes de données">
        {(d) => (
          <>
            {d.filter((x) => x.etat === 'ouverte').map((x) => (
              <Li key={x.id} icone="user-round" ton="acc" t={`${x.acteur} · ${t(NOM_ESPACE[x.espace])}`} s={tf('{id} · reçue {r} · échéance {e}', { id: x.id, r: date(x.recueLe), e: date(x.echeance) })} droite={<Pill ton="ink" sm>{t({ acces: 'Accès', rectification: 'Rectification', export: 'Export' }[x.type])}</Pill>} />
            ))}
            {!d.some((x) => x.etat === 'ouverte') && <p className="t13 c3">{t('Aucune demande ouverte.')}</p>}
            {(role === 'superviseur' || role === 'support') && (
              <div className="adme-btns">
                <button type="button" className="btn sm secondary" onClick={() => setFeuille(true)}>
                  <Icone nom="plus" taille={16} />
                  <span>{t('Enregistrer une demande')}</span>
                </button>
              </div>
            )}
            <DecisionMotivee
              ouverte={feuille}
              fermer={() => setFeuille(false)}
              titre={t('Enregistrer une demande de données')}
              resume={tf('Reçue par {qui} ; l’échéance de réponse est calculée par le serveur.', { qui: agent ? `${agent.prenom} ${agent.nom}` : '—' })}
              libelle="Enregistrer"
              envoyer={async (m) => {
                const r = await source.gouvernance.enregistrerDemande({ acteur, espace: /livreur/i.test(acteur) ? 'livreur' : /relais/i.test(acteur) ? 'relais' : 'client', type, motif: m })
                return r.ok ? null : raison(r.raison)
              }}
            >
              <label className="fld mt14">
                <span className="fld-t">{t('Acteur (masqué)')}</span>
                <span className="inp">
                  <input value={acteur} onChange={(e) => setActeur(e.target.value)} placeholder="Client ••• 4217" />
                </span>
              </label>
              <label className="fld mt10">
                <span className="fld-t">{t('Type de demande')}</span>
                <span className="inp">
                  <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                    <option value="acces">{t('Accès')}</option>
                    <option value="rectification">{t('Rectification')}</option>
                    <option value="export">{t('Export')}</option>
                  </select>
                </span>
              </label>
            </DecisionMotivee>
          </>
        )}
      </EtatLecture>
    </Panel>
  )
}
