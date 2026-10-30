// ADM-P16 · Clients et IFA (prototype route('clients') : répartition IFA, clients actifs, rétrogradations proposées,
// clients bannis (toujours 0) ; recherche et résultats avec palier ; fiche : identité minimale (données masquées,
// affichage journalisé), compteurs, palier IFA et ses raisons, plafonds et avantages, « ce que voit le client »,
// proposition (croisement vendeurs, anti-contournement, effets), historique ; règles ADM-P16R-01 à 08).
// Le client est un acteur à protéger et, s'il le faut, à plafonner — jamais à bannir. L'IFA est interne : le client
// ne le voit jamais. Rétrogradation : jamais avant IFA-MIN-CMD commandes, jamais sans croisement, jamais automatique.
// Finance : lecture des remboursements seulement ; la carte bancaire et la diaspora restent cachées (DP-63).
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { BoutonAppel } from '../../composants/BoutonAppel'
import { Masque } from '../../composants/Masque'
import { BarresH, Li, Note, Panel, Pill, Props, Recherche, Table, correspond } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { ClientCourt } from '../../donnees/domaines/acteurs'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useDroit, useHorloge, useRole, useRouteOuverte } from '../../session'
import { P3, plafondRetrait, retrogradationPossible, seuilRemboursementAuto, type PalierIfa } from '../ADM-06/calculs/regles'
import { Ai, Av, BandeauErreur, BandeauOk, Chargement, Chk, Controles, Historique, Ifa, Item, Kick, Mini, NoteLecture, Partage, Puce, Quand, Radios, Regles, Score, Seen, Tete, nomIfa, useErreur, useRefus } from '../ADM-06/commun'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { useFonctionsS } from '../ADM-03/kit'
import { AccesActeur } from '../SURVEILLER/AccesActeur'
import { TexteTraduisible } from '@client/traduction/Traduisible'

const PALIERS: PalierIfa[] = ['eleve', 'standard', 'a_instruire', 'plafonne']

export default function Clients() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const maintenant = useHorloge()
  const lecture = useLecture(() => source.acteurs.clients(), [])
  const erreur = useErreur(lecture.erreur)
  const [q, setQ] = useState('')
  const [fait, setFait] = useState<string | null>(null)
  const l = lecture.donnees ?? []
  const liste = l.filter((c) => correspond(q, c.masque, c.id, c.resume, c.zone))
  const id = params.get('id') ?? liste[0]?.id ?? null
  const ouverte = useRouteOuverte()
  const pret = !!lecture.donnees
  const prop = l.find((c) => c.aProposition)
  const fonctions = useFonctionsS('clients', [
    { verbe: 'Revoir', n: l.filter((c) => c.aProposition).length, unite: ['IFA proposé', 'IFA proposés'], icone: 'trending-down', route: 'clients', params: prop ? { id: prop.id } : undefined, geste: true },
    { verbe: 'Rembourser', n: null, unite: ['', ''], icone: 'undo-2', route: 'remboursements' },
  ])
  return (
    <Ecran
      route="clients"
      kicker={<Quand le={maintenant} />}
      fonctions={pret ? fonctions : undefined}
      actions={
        <>
          {id && l.find((c) => c.id === id) && <BoutonAppel nom={l.find((c) => c.id === id)!.masque} qui="Client" motif={t('Explication ou déblocage pour le client')} objet={id} />}
          {id && ouverte('vue-client') && (
            <Link className="btn secondary" to={chemin('vue-client', { id })}>
              <Icone nom="eye" taille={18} />
              <span>{t('Voir comme le client')}</span>
            </Link>
          )}
          <Link className="btn secondary" to={chemin('remboursements')}>
            <Icone nom="undo-2" taille={18} />
            <span>{t('Remboursements')}</span>
          </Link>
        </>
      }
    >
      {erreur && <BandeauErreur quoi="La fiche client" relire={lecture.relire} />}
      {fait && <BandeauOk>{fait}</BandeauOk>}
      <div className="mt4">
        <Panel titre={t('Répartition IFA')} icone="chart-pie">
          <BarresH lignes={PALIERS.map((p) => ({ l: t(nomIfa(p)), v: l.filter((c) => c.palier === p).length, max: Math.max(1, l.length), r: String(l.filter((c) => c.palier === p).length), ton: p === 'plafonne' ? 'red' : p === 'eleve' ? 'green' : 'acc' }))} largeurLibelle={90} largeurValeur={30} />
        </Panel>
      </div>
      {!lecture.donnees && !erreur ? (
        <Chargement />
      ) : (
        <Partage
          file={
            <>
              <Recherche q={q} setQ={setQ} placeholder={t('Client, numéro, commande…')} aria={t('Rechercher un client')} />
              <Kick className="mt12">{tf('Résultats · {n} compte(s)', { n: liste.length })}</Kick>
              {liste.map((c) => (
                <ItemClient key={c.id} c={c} on={c.id === id} />
              ))}
              {!liste.length && <p className="card-s">{t('Aucun client ne correspond.')}</p>}
            </>
          }
          puces={liste.map((c) => (
            <Puce key={c.id} to={chemin('clients', { id: c.id })} on={c.id === id}>
              {c.masque}
            </Puce>
          ))}
        >
          {id && <Fiche key={id} id={id} fini={(m) => (setFait(m), lecture.relire())} />}
        </Partage>
      )}
      <Regles
        liste={[
          ['ADM-P16R-01', 'Quatre paliers IFA : Élevé, Standard, À instruire, Plafonné.'],
          ['ADM-P16R-02', tf('Rien de négatif avant {n} commandes ; croisement avec les vendeurs ; jamais automatique ; recours.', { n: P3.ifaMinCmd })],
          ['ADM-P16R-03', 'Le délai de traitement d’un client n’est jamais dégradé.'],
          ['ADM-P16R-04', 'Anti-contournement : seuil absolu, plafond de remboursements, compteur permanent, identité élargie.'],
          ['ADM-P16R-05', 'Jamais banni : plafonné ; un litige gagné ne laisse aucune trace.'],
          ['ADM-P16R-06', tf('{n} refus de paiement au retrait : prépaiement obligatoire et définitif.', { n: P3.payRefus })],
          ['ADM-P16R-07', tf('Paiement au retrait : {a} F pour un nouveau compte, {b} F, puis {c} F après {n} commandes sans incident.', { a: F(P3.payNouveau), b: F(P3.payStandard), c: F(P3.payFidele), n: P3.ifaMinCmd })],
          ['ADM-P16R-08', 'Un tiers payeur de la diaspora est exempté des limites de fréquence par numéro (module caché au lancement).'],
        ]}
      />
    </Ecran>
  )
}

function ItemClient({ c, on }: { c: ClientCourt; on: boolean }) {
  const { t } = usePreferences()
  return <Item to={chemin('clients', { id: c.id })} on={on} av={<Av nom={c.masque} />} t={c.masque} pill={<Ifa palier={c.palier} pill />} s={c.resume} d={c.aProposition ? <><Icone nom="trending-down" taille={13} /> {t('Carte Score')}</> : <>{t('Client depuis le')} <Quand le={c.depuis} /></>} />
}

function Fiche({ id, fini }: { id: string; fini: (m: string) => void }) {
  const { t, tf } = usePreferences()
  const role = useRole()
  const droit = useDroit('clients')
  const refus = useRefus()
  const lecture = useLecture(() => source.acteurs.client(id), [id])
  const erreur = useErreur(lecture.erreur)
  const [feuille, setFeuille] = useState<'valider' | 'refuser' | 'recours' | null>(null)
  const [recours, setRecours] = useState<'recours_maintenir' | 'recours_relever'>('recours_relever')
  const c = lecture.donnees
  if (erreur) return <BandeauErreur quoi="La fiche client" relire={lecture.relire} />
  if (!c) return <Chargement />
  const finance = role === 'finance'
  const decide = droit.acces === 'oui'
  const plafond = plafondRetrait({ commandesSansIncident: c.compteurs.commandesSansIncident, refusRetrait: c.compteurs.refusRetrait, palier: c.palier })
  const auto = seuilRemboursementAuto(c.palier)
  const possible = c.proposition ? retrogradationPossible({ commandes: c.commandes, croisementCharge: c.proposition.croisementCharge }) : null
  return (
    <>
      <AccesActeur espace="client" id={c.id} nom={c.masque} zone={c.zone} />
      <Panel>
        <Tete
          av={<Av nom={c.masque} taille={56} />}
          nom={c.masque}
          sous={<>{t('Client depuis le')} <Quand le={c.depuis} /> · {tf('{z} · {n} commande(s)', { z: c.zone, n: c.commandes })}</>}
          pills={
            <>
              <Pill sm ton="blue">
                {t('Client')}
              </Pill>
              {!finance && <Ifa palier={c.palier} />}
              {c.proposition && (
                <>
                  <Icone nom="arrow-right" taille={16} />
                  <Ifa palier={c.proposition.vers} />
                </>
              )}
              <Pill sm icone="eye-off">
                {t('Jamais visible par le client')}
              </Pill>
            </>
          }
        />
      </Panel>
      {finance ? (
        <NoteLecture texte="Finance : lecture des remboursements seulement ; l’IFA et ses raisons sont réservés au Support et à la Direction." />
      ) : (
        <div className="admk-idgrid mt16" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <Mini k={t('Commandes')} v={c.commandes} s={tf('{n} sans incident', { n: c.compteurs.commandesSansIncident })} />
          <Mini k={t('Litiges perdus')} v={c.compteurs.litigesPerdus} s={tf('{g} gagné(s) · aucune trace dans l’IFA', { g: c.compteurs.litigesGagnes })} />
          <Mini k={t('Remboursements non instruits')} v={c.compteurs.rembNonInstruits} s={c.compteurs.rembMontant ? `${F(c.compteurs.rembMontant)} F · ${t('payés par BelivaY')}` : t('aucun')} />
          <Mini k={t('Refus au retrait')} v={c.compteurs.refusRetrait} s={tf('{n} refus = prépaiement définitif', { n: P3.payRefus })} />
        </div>
      )}
      <div className="s3-g2">
        <Panel titre={t('Identité minimale et moyens de paiement')} icone="id-card">
          <Props
            paires={[
              [t('Client'), c.masque],
              [t('Téléphone'), <Masque key="m" donnee="Téléphone du client" masque={c.telephone} demasquer={(m) => source.acteurs.demasquerClient(c.id, m)} />],
              [t('Numéro Mobile Money'), c.momo],
              [t('Relais habituel'), c.relaisHabituel],
            ]}
          />
          <div className="t12 c3 mt10">{t('Afficher un numéro en clair crée une ligne de journal ; il se masque de lui-même après quelques minutes.')}</div>
        </Panel>
        {finance ? (
          <Panel titre={t('Remboursements')} icone="undo-2" a={{ t: t('Remboursements'), to: chemin('remboursements') }}>
            {c.remboursements.map((r) => (
              <Li key={r.id} icone="undo-2" ton="acc" t={`${r.id} · ${F(r.montant)} F`} s={r.etat} to={chemin('remboursements', { id: r.id })} />
            ))}
            {!c.remboursements.length && <p className="card-s">{t('Aucun remboursement.')}</p>}
          </Panel>
        ) : (
          <Panel titre={t('Palier IFA et ses raisons')} icone="gauge">
            <div className="row" style={{ gap: 14 }}>
              <Score v={PALIERS.length - PALIERS.indexOf(c.palier)} seuil={null} taille={70} />
              <div className="t13 c2">
                <b>{t(nomIfa(c.palier))}</b> · {t('Le palier suit les litiges perdus, les litiges retirés après demande de preuve, les remboursements non instruits et les annulations ; les litiges gagnés ne laissent aucune trace.')}
              </div>
            </div>
            <div className="mt12">
              <BarresH lignes={c.composantes.map((x) => ({ l: t(x.libelle) + (x.faible ? ` (${t('poids faible')})` : ''), v: x.v, max: x.max, r: `${x.v}`, ton: x.v >= x.max ? 'red' : 'acc' }))} largeurLibelle={190} largeurValeur={30} />
            </div>
            <div className="t12 c3 mt8">{t('Seuils d’affichage : IFA-NABS et IFA-NAUTO sont calibrés après trois mois de données réelles ; aucune décision automatique d’ici là.')}</div>
          </Panel>
        )}
      </div>
      {!finance && (
        <div className="s3-g2">
          <Panel titre={t('Plafonds et avantages appliqués')} icone="shield-check">
            <Chk ton={auto ? 'ok' : 'ko'} icone="undo-2">
              {auto ? tf('Remboursement automatique sans enquête jusqu’à {m} F', { m: F(auto) }) : t('Aucun remboursement sans enquête : chaque demande est instruite')}
            </Chk>
            <Chk ton={plafond ? 'ok' : 'ko'} icone="hand-coins">
              {plafond ? tf('Paiement au retrait : panier jusqu’à {m} F', { m: F(plafond) }) : t('Paiement au retrait : prépaiement obligatoire')}
            </Chk>
            <Chk ton="info" icone="ban">
              {t('Jamais pour la diaspora, les gros colis ni l’express')}
            </Chk>
            <Chk ton="ok" icone="timer">
              {t('Délai de traitement de ses dossiers jamais dégradé, quel que soit le palier')}
            </Chk>
            <Note ton="ink" icone="eye-off" className="mt10">
              {plafond ? tf('Ce que voit le client : « paiement au retrait jusqu’à {m} F », jamais son palier ni sa note.', { m: F(plafond) }) : t('Ce que voit le client : « paiement d’avance requis », jamais son palier ni sa note.')}
            </Note>
          </Panel>
          <Panel titre={t('Historique')} icone="history">
            <Historique l={c.historique} />
          </Panel>
        </div>
      )}
      {c.proposition && !finance && (
        <>
          <Panel titre={t('Croisement avec le score des vendeurs concernés')} icone="git-compare-arrows" className="mt16">
            <Table
              cle={(x) => x.vendeur}
              rows={c.proposition.croisement}
              legende={t('Croisement avec les vendeurs')}
              cols={[
                { k: 'v', t: t('Vendeur'), main: true, rendu: (x) => <b>{x.vendeur}</b> },
                { k: 't', t: t('Trust'), rendu: (x) => <Score v={x.trust} seuil={null} taille={30} /> },
                { k: 'i', t: t('Issue pour le client'), rendu: (x) => <Pill sm ton={x.issue === 'perdu' ? 'red' : x.issue === 'retire' ? 'amber' : 'ink'}>{t(x.issue === 'perdu' ? 'Perdu' : x.issue === 'retire' ? 'Retiré après preuve' : 'Gagné · sans trace')}</Pill> },
                { k: 'a', t: t('Autres litiges perdus par ce vendeur · 30 j'), cls: 'r', rendu: (x) => x.autres },
              ]}
            />
          </Panel>
          <div className="s3-g2">
            <Panel titre={t('Anti-contournement')} icone="shield-alert">
              <Controles l={c.proposition.antiContournement} />
            </Panel>
            <Panel titre={t('Si la rétrogradation est validée')} icone="info">
              <Chk ton="info" icone="search">
                {t('Chaque remboursement est instruit (preuves demandées) ; plus de remboursement automatique')}
              </Chk>
              <Chk ton="info" icone="hand-coins">
                {t('Paiement au retrait : non éligible')}
              </Chk>
              <Chk ton="ok" icone="timer">
                {t('Délai de traitement inchangé')}
              </Chk>
              <Chk ton="ok" icone="scale">
                {t('Recours possible ; le client voit seulement ses avantages')}
              </Chk>
            </Panel>
          </div>
          <div className="panel mt16" style={{ boxShadow: 'var(--shadow-card), inset 3px 0 0 var(--or)' }}>
            <Ai texte={c.proposition.texte} confiance={c.proposition.confiance} />
            <Seen k={t('Rien n’est automatique')} className="mt10">
              {tf('Pas avant {n} commandes · jamais sans croisement avec le score des vendeurs · jamais sans validation humaine et motif · recours possible.', { n: P3.ifaMinCmd })}
            </Seen>
            {decide ? (
              <div className="admk-dec mt14">
                <button type="button" className="btn primary" aria-disabled={possible !== 'ok'} title={possible !== 'ok' && possible ? refus(possible) : undefined} onClick={() => possible === 'ok' && setFeuille('valider')}>
                  <Icone nom="check" taille={18} />
                  <span>{t('Valider la rétrogradation')}</span>
                </button>
                <button type="button" className="btn secondary" onClick={() => setFeuille('refuser')}>
                  <Icone nom="x" taille={18} />
                  <span>{t('Refuser')}</span>
                </button>
                <span className="sp"></span>
                <span className="lock t12 c3 b7">
                  <Icone nom="users" taille={14} /> {possible !== 'ok' && possible ? refus(possible) : t('Jamais de bannissement : un client est plafonné')}
                </span>
              </div>
            ) : (
              <NoteLecture texte="Lecture seule : le Support et la Direction décident de l’IFA." />
            )}
          </div>
        </>
      )}
      {c.recours && !finance && (
        <Panel titre={t('Recours')} icone="scale" className="mt16">
          <Seen k={t('Recours du client')}>
            « <TexteTraduisible texte={c.recours.texte} /> » · <Quand le={c.recours.le} />
          </Seen>
          <div className="t12 c3 mt10">{t('Examiné avec le même croisement : litiges perdus, vendeurs concernés, identité élargie. Le palier ne remonte jamais seul.')}</div>
          {decide && (
            <div className="admk-dec mt12">
              <button type="button" className="btn secondary" onClick={() => setFeuille('recours')}>
                <Icone nom="scale" taille={18} />
                <span>{t('Traiter le recours')}</span>
              </button>
            </div>
          )}
        </Panel>
      )}
      <DecisionMotivee ouverte={feuille === 'valider'} fermer={() => setFeuille(null)} titre={t('Valider la rétrogradation')} resume={c.proposition ? tf('{a} → {b}', { a: t(nomIfa(c.palier)), b: t(nomIfa(c.proposition.vers)) }) : ''} libelle="Valider la rétrogradation" etiquetteMotif="Motif interne · le client voit seulement ses avantages" envoyer={(m) => source.acteurs.deciderIfa(c.id, { action: 'valider', motif: m })} apres={() => fini(t('Rétrogradation validée ; le client voit ses nouveaux avantages, jamais son palier.'))} />
      <DecisionMotivee ouverte={feuille === 'refuser'} fermer={() => setFeuille(null)} titre={t('Refuser la rétrogradation')} resume={t('Le palier reste inchangé ; la proposition est close et journalisée.')} libelle="Refuser" icone="x" envoyer={(m) => source.acteurs.deciderIfa(c.id, { action: 'refuser', motif: m })} apres={() => fini(t('Rétrogradation refusée.'))} />
      <DecisionMotivee ouverte={feuille === 'recours'} fermer={() => setFeuille(null)} titre={t('Traiter le recours')} resume={t('Décision motivée et journalisée, envoyée au client avec ses avantages.')} libelle="Enregistrer" icone="scale" envoyer={(m) => source.acteurs.deciderIfa(c.id, { action: recours, motif: m })} apres={() => fini(t('Recours traité.'))}>
        <Radios nom="Décision" valeur={recours} choisir={setRecours} options={[{ v: 'recours_relever', t: 'Relever au palier « À instruire »', s: 'Le paiement au retrait reste fermé ; les remboursements sont instruits' }, { v: 'recours_maintenir', t: 'Maintenir le palier' }]} />
      </DecisionMotivee>
    </>
  )
}

