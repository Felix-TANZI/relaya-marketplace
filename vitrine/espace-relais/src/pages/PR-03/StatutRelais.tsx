// Statut du relais (PR-03 § 5 ; s'ouvre depuis la pastille d'état de l'en-tête, STA-04). Le gérant VOIT pourquoi
// son relais n'est pas « Ouvert » et ce qui se passe pour ses colis ; il DEMANDE (contester une fois, demander la fin
// et l'annuler), BelivaY DÉCIDE (DP-66 et DP-67 appliquées au relais ; PR-RC-10, PR-RC-28).
// Trois onglets (la bascule du prototype) : le statut actuel, les décisions de BelivaY (STA-05 : décision, motif et
// historique restent visibles), la fin du partenariat (ARL-26 : préavis PR-FIN-PREAVIS-J, PR-FIN-SANS-COLIS-J
// derniers jours sans nouveaux colis, demande annulable tant qu'elle n'est pas prononcée).
// - en configuration : étapes faites et restantes, chaque restante ouvre son écran (STA-02) ;
// - suspendu (niveau 3 sur 4, validé par une personne avec un motif écrit, STA-03) : plus de nouveaux colis, stock
//   transféré, remises en cours possibles, contestation une fois (PR-CONTEST-H), versements maintenus, Trust Score
//   gelé sous PR-TS-GEL-SOUS, période probatoire au retour ;
// - fermé temporairement : fermeture déclarée (PR-07), réouverture, ce que deviennent les colis (ARL-20, DP-42) ;
// - ouvert, clos : ce que cela veut dire.
// L'employé voit le statut ; contester et demander la fin sont réservés au gérant (DROITS_GESTE).
// Structure du prototype (StatutRelais, états defaut, sus, fer) : titre et sous-titre, bascule en 3, carte d'état
// (nuit, rouge ou ambre), liste des étapes, encart sur la pastille de l'en-tête.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { usePeut } from '../../config/droits'
import type { Decision, MotifFin, StatutDetail } from '../../donnees/domaines/acces'
import type { Fermeture } from '../../donnees/domaines/fermeture'
import { origine, useEnLigne } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { ETAPES, useEtatEtape } from './Activation'
import { Chargement, ErreurLecture, Note, useMaintenant } from './commun'
import { ACCES, RELAIS_P } from './parametres'
import { JOURS_SEMAINE } from './textes'
import './pr03.css'

type Onglet = 'statut' | 'decisions' | 'fin'

export const NIVEAUX: Record<Decision['niveau'], string> = { 1: 'Avertissement', 2: 'Visibilité réduite', 3: 'Suspension', 4: 'Exclusion' }

export default function StatutRelais() {
  const { t } = usePreferences()
  const session = useSession()
  const lecture = useLecture(() => Promise.all([source.acces.statut(), source.acces.activation(), source.fermeture.fermetures()]), [])
  const [onglet, setOnglet] = useState<Onglet>('statut')
  const s = lecture.donnees?.[0]
  const statut = s?.statut ?? session.relais?.statut
  const actif = statut !== 'candidat' && statut !== 'en_configuration' && statut !== 'clos'
  const NOMS: Record<string, string> = { candidat: 'Candidat', en_configuration: 'En configuration', ouvert: 'Ouvert', ferme_temporaire: 'Fermé', suspendu: 'Suspendu', clos: 'Clos' }
  const onglets: [Onglet, string][] = [
    ['statut', t(NOMS[statut ?? 'ouvert'])],
    ['decisions', t('Décisions')],
    ['fin', t('Fin du partenariat')],
  ]
  return (
    <Ecran route="statut-relais" barre={actif}>
      <div className="p-0hxmj8 r-pile pr3">
        <div>
          <h1 className="p-bvhkrl">{t('Statut du relais')}</h1>
          <div className="p-t2u0o2">{t('Ce que vit le relais aujourd’hui, ce que BelivaY a décidé et ce que vous pouvez demander.')}</div>
        </div>
        <div className="p-lvzt0c" role="tablist" aria-label={t('Statut du relais')}>
          {onglets.map(([id, nom]) => (
            <button key={id} type="button" role="tab" id={'pr3-o-' + id} aria-selected={onglet === id} aria-controls={onglet === id ? 'pr3-p-' + id : undefined} className={onglet === id ? 'p-h01hlk' : 'p-bq7aiq'} onClick={() => setOnglet(id)}>
              {nom}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={'pr3-p-' + onglet} aria-labelledby={'pr3-o-' + onglet} className="pr3-panneau">
          {lecture.erreur ? (
            <ErreurLecture relire={lecture.relire} />
          ) : !lecture.donnees || !s ? (
            <Chargement />
          ) : onglet === 'statut' ? (
            <Statut s={s} a={lecture.donnees[1]} fermetures={lecture.donnees[2]} />
          ) : onglet === 'decisions' ? (
            <Decisions s={s} />
          ) : (
            <Fin s={s} relire={lecture.relire} />
          )}
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-boutique" taille={18} className="p-672m16" />
          <div>{t('Le statut s’affiche aussi dans la pastille de l’en-tête : « Ouvert » (vert), « En configuration », « Suspendu » (rouge) ou « Fermé jusqu’au … » (ambre).')}</div>
        </div>
      </div>
    </Ecran>
  )
}

// ---------- Onglet 1 : statut actuel ----------

function Statut({ s, a, fermetures }: { s: StatutDetail; a: Awaited<ReturnType<typeof source.acces.activation>>; fermetures: Fermeture[] }) {
  const { t, tf, langue } = usePreferences()
  const session = useSession()
  const etatEtape = useEtatEtape()
  const peut = usePeut('cloturerCompte')
  if (s.statut === 'candidat' || s.statut === 'en_configuration') {
    const faites = a.etapes.filter((e) => e.etat === 'validee').length
    const reste = a.etapes.length - faites
    return (
      <div className="pr3-pile">
        <div className="p-26n637">
          <div className="p-xmy0fy">{tf('EN CONFIGURATION · {x} / {n}', { x: faites, n: a.etapes.length })}</div>
          <div className="p-fdt7cn pr3-nuit">{reste === 1 ? t('Encore 1 étape avant d’ouvrir') : tf('Encore {n} étapes avant d’ouvrir', { n: reste })}</div>
          <div className="p-yz5dyd">{t('Tant que le relais n’est pas ouvert, aucun colis ne vous est envoyé et les clients ne vous voient pas.')}</div>
        </div>
        <div className="p-yi6rkz">
          {a.etapes.map((e, i) => {
            const x = ETAPES[e.etape]
            const fait = e.etat === 'validee'
            const ligne = (
              <>
                <div className={fait ? 'p-tc472u' : 'p-toppw8'}>
                  <Icone nom={fait ? 'check' : x.icone} taille={20} className={fait ? 'p-q7qjlz' : 'p-672m16'} />
                </div>
                <div className="p-rnqj8n">
                  <div className="p-ife3a2">{t(x.titre)}</div>
                  <div className="p-dfa05r">{etatEtape(e)}</div>
                </div>
                {fait ? <span className="p-nax3x4">{t('Fait')}</span> : x.route ? <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" /> : null}
              </>
            )
            return (
              <div key={e.etape}>
                {i > 0 && <div className="p-92xvtp" />}
                {!fait && x.route ? (
                  <Link to={chemin(x.route)} className="p-o24hsm">
                    {ligne}
                  </Link>
                ) : (
                  <div className="p-o24hsm">{ligne}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  if (s.statut === 'suspendu') {
    const d = s.decision
    return (
      <div className="pr3-pile">
        <div className="p-9a9wu0">
          <div className="p-wa6ccw">
            <div className="p-lqvhm1">
              <Icone nom="r-alerte" taille={24} className="p-woejqv" />
            </div>
            <h2 className="p-nlvkht">{t('Relais suspendu')}</h2>
          </div>
          <div className="p-5pu05p">
            {tf('Depuis le {date} · niveau 3 sur 4, validé par une personne de BelivaY.', { date: jourLong(s.depuis, langue) })} {s.motif && tf('Motif écrit : {motif}', { motif: s.motif })}{' '}
            {d?.jusquA ? tf('Retour prévu le {date}, après décision.', { date: jourLong(d.jusquA, langue) }) : null}{' '}
            {tf('Aucun nouveau colis ne vous est envoyé. Les colis encore en stock ({n}) partent vers le relais ouvert le plus proche ; les remises en cours restent possibles.', { n: s.colisEnStock })}
          </div>
          {d && (
            <Link to={chemin('decision', { id: d.id })} className="p-ncx7qc">
              {t('Voir la décision et le motif')}
            </Link>
          )}
          {d && peut && (d.contestation ? (
            <Note ton="accent">{tf('Contestation envoyée le {le} : réponse d’une personne avant le {avant}.', { le: jourLong(d.contestation.le, langue), avant: echeance(d.contestation.reponseAvant, session.maintenant, langue) })}</Note>
          ) : (
            <Link to={chemin('decision', { id: d.id, contester: 1 })} className="p-rbzobc">
              {t('Contester')}
            </Link>
          ))}
        </div>
        <div className="p-yi6rkz">
          <div className="p-mqmvkk">
            <span className="p-ytl255">{t('Contestation')}</span>
            <span className="p-2vq92h">{tf('une fois, réponse sous {h} h ouvrées', { h: ACCES.contestationHeures })}</span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">{t('Versements')}</span>
            <span className="p-2vq92h">{t('maintenus pour les opérations faites')}</span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">{t('Trust Score')}</span>
            <span className="p-lgzow2">{tf('gelé sous {n} pendant la suspension', { n: ACCES.gelSous })}</span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">{t('Au retour')}</span>
            <span className="p-2vq92h">{t('période probatoire')}</span>
          </div>
        </div>
      </div>
    )
  }
  if (s.statut === 'ferme_temporaire') {
    const f = fermetures.find((x) => x.statut === 'en_cours') ?? null
    const rouvre = f?.rouvreA ?? session.relais?.rouvreLe ?? null
    return (
      <div className="p-zdebuk">
        <div className="p-wa6ccw">
          <div className="p-o4jtkl">
            <Icone nom="r-fermeture" taille={24} className="p-lhsznn" />
          </div>
          <h2 className="p-nlvkht">{t('Fermé temporairement')}</h2>
        </div>
        <div className="p-5pu05p">
          {f && (f.du === f.au ? tf('Fermeture déclarée pour le {date}.', { date: jourLong(Date.parse(f.du + 'T12:00:00Z'), langue) }) : tf('Fermeture déclarée du {du} au {au}.', { du: jourLong(Date.parse(f.du + 'T12:00:00Z'), langue), au: jourLong(Date.parse(f.au + 'T12:00:00Z'), langue) }))}{' '}
          {rouvre && tf('Réouverture {quand}.', { quand: echeance(rouvre, session.maintenant, langue) })}{' '}
          {!f || f.duree === 'moins_24h'
            ? t('Moins de 24 h : vos colis restent au relais et les clients sont prévenus de la réouverture. Les jours fermés ne comptent pas dans la garde.')
            : tf('Au-delà de 24 h, chaque client choisit gratuitement un autre relais ; sans réponse sous {h} h, ses colis sont transférés au relais ouvert le plus proche et il reçoit un nouveau code. Les jours fermés ne sont jamais facturés.', { h: RELAIS_P.fermeTransfertH })}
        </div>
        <Link to={chemin('fermeture')} className="p-rbzobc">
          {t('Modifier ou rouvrir plus tôt')}
        </Link>
      </div>
    )
  }
  if (s.statut === 'clos') {
    return (
      <div className="p-9a9wu0">
        <div className="p-wa6ccw">
          <div className="p-lqvhm1">
            <Icone nom="r-cadenas" taille={24} className="p-woejqv" />
          </div>
          <h2 className="p-nlvkht">{t('Relais clos')}</h2>
        </div>
        <div className="p-5pu05p">{tf('Le partenariat est terminé depuis le {date}. Le dernier versement part le {jour} qui suit la clôture ; les preuves sont gardées {j} jours. Vos données se demandent à BelivaY.', { date: jourLong(s.depuis, langue), jour: t(JOURS_SEMAINE[RELAIS_P.versement.jourSemaine]), j: RELAIS_P.preuvesConservationJours })}</div>
        <Link to={chemin('aide')} className="p-rbzobc">
          {t('Écrire au support')}
        </Link>
      </div>
    )
  }
  const r = session.relais
  return (
    <div className="p-yi6rkz">
      <div className="p-wa6ccw">
        <div className="p-tc472u">
          <Icone nom="check" taille={22} className="p-q7qjlz" />
        </div>
        <h2 className="p-nlvkht">{t('Relais ouvert')}</h2>
      </div>
      <div className="p-5pu05p">
        {tf('Ouvert depuis le {date}. Seul un relais « Ouvert » reçoit des colis et apparaît au choix des clients.', { date: jourLong(a.ouvertLe ?? s.depuis, langue) })}{' '}
        {r?.sature ? t('Le seuil de places est atteint : BelivaY oriente les nouveaux clients vers un autre relais, les colis déjà en route arrivent.') : null}
      </div>
      <Link to={chemin('capacite')} className="p-o24hsm">
        <div className="p-toppw8">
          <Icone nom="r-horloge" taille={20} className="p-672m16" />
        </div>
        <div className="p-rnqj8n">
          <div className="p-ife3a2">{t('Capacité et horaires')}</div>
          <div className="p-dfa05r">{r ? tf('{n} / {total} places occupées', { n: r.placesOccupees, total: r.placesDeclarees }) : ''}</div>
        </div>
        <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
      </Link>
      <Link to={chemin('activation')} className="p-o24hsm">
        <div className="p-toppw8">
          <Icone nom="r-document" taille={20} className="p-672m16" />
        </div>
        <div className="p-rnqj8n">
          <div className="p-ife3a2">{t('Activation et partenariat')}</div>
          <div className="p-dfa05r">{t('Les 6 étapes, le certificat et la convention')}</div>
        </div>
        <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
      </Link>
    </div>
  )
}

// ---------- Onglet 2 : décisions ----------

function Decisions({ s }: { s: StatutDetail }) {
  const { t, tf, langue } = usePreferences()
  if (!s.decisions.length)
    return (
      <div className="p-yi6rkz">
        <div className="r-vide">
          <div className="r-vide-i">
            <Icone nom="r-balance" taille={28} />
          </div>
          <h2>{t('Aucune décision')}</h2>
          <p>{t('Votre relais n’a reçu ni avertissement ni sanction. Une sanction se décide en 4 niveaux : avertissement, visibilité réduite, suspension, exclusion pour fraude ; les niveaux 2 à 4 sont validés par une personne, avec un motif écrit, et se contestent une fois.')}</p>
        </div>
      </div>
    )
  return (
    <div className="p-yi6rkz">
      {s.decisions.map((d, i) => (
        <div key={d.id}>
          {i > 0 && <div className="p-92xvtp" />}
          <Link to={chemin('decision', { id: d.id })} className="p-o24hsm">
            <div className={d.niveau >= 3 ? 'p-lqvhm1 pr3-petit' : 'p-toppw8'}>
              <Icone nom="r-balance" taille={20} className={d.niveau >= 3 ? 'p-woejqv' : 'p-672m16'} />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">{tf('{niveau} · niveau {n} sur 4', { niveau: t(NIVEAUX[d.niveau]), n: d.niveau })}</div>
              <div className="p-dfa05r">
                {jourLong(d.le, langue)} · {d.contestation ? (d.contestation.etat === 'en_cours' ? t('contestation en cours') : d.contestation.etat === 'levee' ? t('levée après contestation') : t('maintenue après contestation')) : t('non contestée')}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
        </div>
      ))}
    </div>
  )
}

// ---------- Onglet 3 : fin du partenariat ----------

const MOTIFS: [MotifFin, string][] = [
  ['activite', 'Je change d’activité'],
  ['local', 'Le local ne convient plus'],
  ['sante', 'Santé ou famille'],
  ['remuneration', 'La rémunération ne me convient pas'],
  ['demenagement', 'Déménagement'],
  ['autre', 'Autre raison'],
]
const TEXTE_MAX = 120

function Fin({ s, relire }: { s: StatutDetail; relire: () => void }) {
  const { t, tf, langue } = usePreferences()
  const peut = usePeut('cloturerCompte')
  const enLigne = useEnLigne()
  const maintenant = useMaintenant()
  const [motif, setMotif] = useState<MotifFin | null>(null)
  const [texte, setTexte] = useState('')
  const [confirmer, setConfirmer] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const jour = t(JOURS_SEMAINE[RELAIS_P.versement.jourSemaine])
  const fin = s.finDemandee
  if (fin) {
    const annuler = async () => {
      const r = await source.acces.annulerFin(origine(maintenant()))
      signal(r.ok ? 'succes' : 'erreur')
      if (!r.ok) setMsg(r.raison === 'deja_prononcee' ? t('La fin est déjà prononcée par BelivaY.') : t('Aucune demande en cours.'))
      relire()
    }
    return (
      <div className="p-zdebuk">
        <div className="p-wa6ccw">
          <div className="p-o4jtkl">
            <Icone nom="calendar-clock" taille={24} className="p-lhsznn" />
          </div>
          <h2 className="p-nlvkht">{t('Fin du partenariat demandée')}</h2>
        </div>
        <div className="p-mqmvkk">
          <span className="p-ytl255">{t('Demandée le')}</span>
          <span className="p-2vq92h">{jourLong(fin.le, langue)}</span>
        </div>
        <div className="p-mqmvkk">
          <span className="p-ytl255">{t('Plus de nouveaux colis')}</span>
          <span className="p-2vq92h">{tf('dès le {date}', { date: jourLong(fin.sansNouveauxColisDes, langue) })}</span>
        </div>
        <div className="p-mqmvkk">
          <span className="p-ytl255">{t('Fin prononcée par BelivaY')}</span>
          <span className="p-2vq92h">{tf('le {date} au plus tôt', { date: jourLong(fin.effetLe, langue) })}</span>
        </div>
        <div className="p-5pu05p">
          {tf('Jusque-là, vous travaillez normalement. Les {n} derniers jours, le relais ne paraît plus au choix des clients. Les colis restants sont remis ou transférés ; la clôture vient quand le stock est vide et les espèces de garde réglées. Dernier versement le {jour} qui suit la clôture ; étiquettes, sacs et scellés BelivaY à restituer.', { n: RELAIS_P.finSansColisJours, jour })}
        </div>
        {msg && <Note ton="rouge">{msg}</Note>}
        {peut && fin.annulable && (
          <button type="button" className="p-rbzobc" disabled={!enLigne} onClick={() => void annuler()}>
            {t('Annuler ma demande')}
          </button>
        )}
        {!enLigne && <Note ton="ambre">{t('Hors connexion : cette demande part avec le réseau.')}</Note>}
      </div>
    )
  }
  if (!peut)
    return (
      <div className="p-yi6rkz">
        <Note ton="accent">{t('La fin du partenariat se demande par le gérant, signataire de la convention.')}</Note>
      </div>
    )
  const demander = async () => {
    if (!motif) return setMsg(t('Choisissez un motif.'))
    if (!confirmer) return setConfirmer(true)
    const libelle = MOTIFS.find((m) => m[0] === motif)![1]
    const r = await source.relais.demanderFin(texte.trim() ? `${libelle} : ${texte.trim()}` : libelle, origine(maintenant()))
    signal(r.ok ? 'succes' : 'erreur')
    if (!r.ok) setMsg(r.raison === 'deja_demandee' ? t('Une demande est déjà en cours.') : t('Demande refusée : réservée au gérant.'))
    setConfirmer(false)
    relire()
  }
  return (
    <div className="p-yi6rkz">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu">{t('Demander la fin du partenariat')}</h2>
      </div>
      <div className="p-ug5qrn">
        {tf('La convention se termine avec un préavis de {j} jours : vous demandez, BelivaY prononce la fin. Pendant le préavis vous travaillez normalement ; les {n} derniers jours, plus aucun nouveau colis. Dernier versement le {jour} qui suit la clôture, sans retenue autre que les espèces de garde dues.', { j: RELAIS_P.finPreavisJours, n: RELAIS_P.finSansColisJours, jour })}
      </div>
      <div className="p-yscrc8" id="pr3-motif">
        {t('MOTIF')}
      </div>
      <div className="p-8dmjde" role="radiogroup" aria-labelledby="pr3-motif">
        {MOTIFS.map(([id, nom]) => (
          <button key={id} type="button" role="radio" aria-checked={motif === id} className={(motif === id ? 'p-rpzy79' : 'p-6z26dm') + ' pr3-puce'} onClick={() => (setMotif(id), setMsg(null))}>
            {t(nom)}
          </button>
        ))}
      </div>
      <label className="p-ky12xr">
        {t('PRÉCISION (FACULTATIF)')}
        <textarea className="p-afs6hh" maxLength={TEXTE_MAX} value={texte} onChange={(e) => setTexte(e.target.value)} />
        <span className="pr3-compte">{`${texte.length} / ${TEXTE_MAX}`}</span>
      </label>
      {msg && <Note ton="rouge">{msg}</Note>}
      {confirmer && <Note ton="ambre">{tf('Confirmez : plus de nouveaux colis dans {n} jours avant la fin ; vous pourrez annuler tant que BelivaY ne l’a pas prononcée.', { n: RELAIS_P.finSansColisJours })}</Note>}
      {!enLigne && <Note ton="ambre">{t('Hors connexion : cette demande part avec le réseau.')}</Note>}
      <button type="button" className={confirmer ? 'p-ncx7qc' : 'p-rbzobc'} disabled={!enLigne} onClick={() => void demander()}>
        {confirmer ? t('Confirmer la demande') : t('Demander la fin du partenariat')}
      </button>
      {confirmer && (
        <button type="button" className="p-rbzobc" onClick={() => setConfirmer(false)}>
          {t('Garder le partenariat')}
        </button>
      )}
    </div>
  )
}
