// Page ajoutée (S6) · Conservation des données (loi n° 2024/017) : chaque donnée, sa durée (registre), ce qui arrive à
// l'échéance (effacer, pseudonymiser, expirer, lecture seule, jamais), le gel en litige (un litige ouvert suspend
// l'effacement) et la tâche qui l'applique (kit : apps/console/conservation.py POLITIQUE) ; le journal signé n'est
// jamais effacé. Demandes d'accès, de rectification et d'export : réponse dans le délai du registre, export des seules
// lignes de l'acteur, sans données de tiers, journalisé. Direction ; Audit en lecture.
import { useState } from 'react'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { csvSigne } from '../../composants/ExportSigne'
import { Icone } from '../../composants/Icone'
import { Kpi, Li, Note, Panel, Pill, Px, St, Table, useSurtitre, type Ton } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { PolitiqueDonnee } from '../../donnees/domaines/systeme'
import { telecharger } from '../../donnees/exports'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { useFonctions } from '../AJ-A/fonctions-page'
import { usePreferences } from '../../preferences'
import { useDroit, useHorloge } from '../../session'
import { EtatLecture, NOM_ESPACE, useDate, useRaison } from '../ADM-12/commun-s6'

const ACTION: Record<PolitiqueDonnee['action'], [string, Ton]> = { effacer: ['Effacer', 'red'], pseudonymiser: ['Pseudonymiser', 'amber'], expirer: ['Expirer', 'amber'], lecture_seule: ['Lecture seule', 'blue'], jamais: ['Jamais effacé', 'green'] }

export default function Conservation() {
  const { t, tf } = usePreferences()
  const surtitre = useSurtitre()
  const date = useDate()
  const raison = useRaison()
  const n = useHorloge()
  const [params] = useSearchParams()
  const gestes = useDroit('conservation').acces === 'oui'
  const l = useLecture(() => source.systeme.conservation(), [])
  const demandes = useLecture(() => source.gouvernance.demandesDonnees(), [])
  const [repondre, setRepondre] = useState<string | null>(null)
  const surligne = params.get('demande')
  const ouvertes = (demandes.donnees ?? []).filter((x) => x.etat === 'ouverte')
  const fonctions = useFonctions([
    { verbe: 'Répondre', n: ouvertes.length, unite: ['demande d’accès', 'demandes d’accès'], icone: 'file-lock', onClick: () => ouvertes[0] && setRepondre(ouvertes[0].id), droit: 'conservation', geste: true, alerte: true },
    { verbe: 'Garder', n: (l.donnees?.geles ?? []).length, unite: ['preuve en litige', 'preuves en litige'], icone: 'scale', route: 'litige' },
    { verbe: 'Contrôler', n: null, unite: ['effacement', 'effacements'], icone: 'clock', route: 'taches' },
  ])
  return (
    <Ecran
      route="conservation"
      kicker={surtitre}
      fonctions={fonctions}
      actions={
        <Link className="btn secondary" to={chemin('taches')}>
          <Icone nom="clock" taille={18} />
          <span>{t('Tâches planifiées')}</span>
        </Link>
      }
    >
      <Px>
        <EtatLecture l={l} quoi="la politique de conservation">
          {(d) => (
            <>
              <div className="g g4">
                <Kpi k={t('Données suivies')} v={d.politique.length} s={t('durées lues au registre')} icone="archive" />
                <Kpi k={t('Dernier passage')} v={d.derniere ? date(d.derniere.le).split(' · ')[1] : '—'} s={d.derniere ? tf('{e} effacées · {p} pseudonymisées', { e: d.derniere.effaces, p: d.derniere.pseudonymises }) : t('aucun passage réussi')} icone="trash-2" />
                <Kpi k={t('Gardées en litige')} v={d.geles.length} s={t('effacement suspendu')} icone="snowflake" iton="amber" />
                <Kpi k={t('Demandes ouvertes')} v={d.demandesOuvertes} s={tf('réponse sous {n} jours', { n: d.accesDonneesJ })} icone="file-lock" ton="night" />
              </div>
              <div style={{ marginTop: 16 }}>
                <Table
                  cle={(x) => x.donnee}
                  rows={d.politique}
                  cols={[
                    { k: 'd', t: t('Donnée'), main: true, rendu: (x) => (<><b>{t(x.donnee)}</b>{x.code && <div className="t2 mono">{x.code}</div>}</>) },
                    { k: 'v', t: t('Durée'), rendu: (x) => (x.action === 'jamais' ? t('Toujours') : x.valeur ?? t('24 heures')) },
                    { k: 'a', t: t('À l’échéance'), rendu: (x) => <St t={t(ACTION[x.action][0])} ton={ACTION[x.action][1]} /> },
                    { k: 'g', t: t('Gel en litige'), rendu: (x) => (x.gelEnLitige ? <Pill ton="amber" sm icone="snowflake">{t('Oui')}</Pill> : <span className="c4">—</span>) },
                    { k: 'o', t: t('Appliqué par'), hideM: true, rendu: (x) => <span className="mono t12">{x.ou}</span> },
                  ]}
                  pied={<span>{t('Le journal signé ne contient ni numéro ni code : il se garde en entier, en ajout seul.')}</span>}
                />
              </div>
              <div className="g g2">
                <Panel titre={t('Gardé à cause d’un litige ouvert')} icone="snowflake">
                  {d.geles.length ? d.geles.map((g) => <Li key={g.litige} icone="scale" ton="amber" t={`${g.objet} · ${g.litige}`} s={`${t(g.donnees)}${g.zone ? ' · ' + g.zone : ''}`} to={chemin('litige', { id: g.litige })} />) : <p className="t13 c3">{t('Aucun litige ouvert : rien n’est gardé au-delà de sa durée.')}</p>}
                </Panel>
                <Panel titre={t('Demandes de données')} icone="file-lock" id="demandes">
                  <EtatLecture l={demandes} quoi="les demandes de données">
                    {(ds) => (
                      <>
                        {ds.map((x) => (
                          <Li
                            key={x.id}
                            icone="user-round"
                            ton={x.etat === 'ouverte' ? (x.echeance - n < 7 * 86_400_000 ? 'red' : 'acc') : 'green'}
                            className={surligne === x.id ? 'on' : undefined}
                            t={`${x.id} · ${x.acteur} · ${t(NOM_ESPACE[x.espace])}`}
                            s={x.etat === 'ouverte' ? tf('{type} · reçue {r} · échéance {e}', { type: t({ acces: 'Accès', rectification: 'Rectification', export: 'Export' }[x.type]), r: date(x.recueLe), e: date(x.echeance) }) : tf('Répondue {d} · {n} lignes, sans données de tiers', { d: date(x.reponduLe ?? 0), n: x.lignes ?? 0 })}
                            droite={x.etat === 'ouverte' && gestes ? <button type="button" className="btn sm primary" onClick={() => setRepondre(x.id)}>{t('Répondre')}</button> : <St t={t(x.etat === 'ouverte' ? 'Ouverte' : 'Répondue')} ton={x.etat === 'ouverte' ? 'amber' : 'green'} />}
                          />
                        ))}
                        <p className="t12 c3 mt8">{t('Les demandes arrivent par le support ou, pour un livreur parti, hors application ; elles s’enregistrent depuis le journal d’audit.')} <Link to={chemin('journal')}>{t('Journal d’audit')}</Link></p>
                      </>
                    )}
                  </EtatLecture>
                </Panel>
              </div>
              <Note ton="green" icone="lock">{t('Le journal d’audit n’est jamais effacé ni modifié, par personne : c’est la preuve de tout ce qui précède.')}</Note>
              <DecisionMotivee
                ouverte={!!repondre}
                fermer={() => setRepondre(null)}
                titre={tf('Répondre à la demande {id}', { id: repondre ?? '' })}
                resume={t('Le fichier contient les seules lignes qui concernent l’acteur, sans nom d’agent, adresse ni appareil ; il est signé (empreinte) et la réponse est journalisée.')}
                libelle="Préparer l’export"
                icone="download"
                envoyer={async (m) => {
                  const r = await source.gouvernance.repondreDemande(repondre!, m)
                  if (!r.ok) return raison(r.raison, { deja_repondue: 'Cette demande a déjà sa réponse.', inconnu: 'Demande introuvable.' })
                  const s = await csvSigne(r.entetes, r.lignes, `BELIVAY SARL · ${repondre}`)
                  telecharger(new Blob([s.contenu], { type: 'text/csv;charset=utf-8' }), r.nom)
                  return null
                }}
              />
            </>
          )}
        </EtatLecture>
      </Px>
    </Ecran>
  )
}
