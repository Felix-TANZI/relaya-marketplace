// ENT-P02 · Tableau de bord, sur la structure du prototype (entA_dashActive) : en-tête « date · heure », « Bonjour
// {prénom} », sous-titre, action « Paquets disponibles » ; bandeau unique, le plus grave (erreur, pluie forte :
// ENT-03-R10) ; puis « À faire maintenant » (trié par échéance, compte à rebours en direct, la plus urgente bordée
// d'orange, ENT-03-R11) à côté de « Palier et Trust Score » et de la phase pilote ; « Indicateurs » (une seule fois,
// jamais « 0 / 0 », ENT-P02R-02 ; « à verser vendredi » pour la propriétaire et la comptable seulement, ENT-P02R-03) ;
// « Vos zones aujourd'hui » (carte et barres de capacité) et « Flotte maintenant ».
// Variantes du prototype : compte en configuration → guide de démarrage (ENT-ACT-01) ; suspendu → héros de suspension,
// missions à terminer, recours (ENT-03-R14) ; rien à faire → indicateurs en tête ; comptable → argent de la semaine.
import { Link } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Anneau, BarresH, Courbe, Kpi, Kv, Note, Panel, Pill, Rangee, Sec, type Ton, useRestant, Verrou } from '../../composants/prototype'
import { NOM_PALIER } from '../../config/libelles'
import { chemin } from '../../config/pages'
import type { Livreur } from '../../donnees/domaines/livreurs'
import type { Tache } from '../../donnees/domaines/tableau'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { PARAMETRES, REGISTRE } from '../../calculs/registre'
import { PARAMETRES_FLOTTE } from '../../calculs/flotte'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles, useRole, useSession } from '../../session'
import { CarteZones } from '../ENT-04/CarteZones'
import { GuideDemarrage } from './Guide'
import { Chargement, ErreurLecture, useDates, useFeuilleParams } from './outils'

const P = PARAMETRES_FLOTTE
/** Tâches montrées d'emblée dans « À faire maintenant » (les autres sont repliées dessous). */
const VISIBLES = 6
const ICONE: Record<Tache['genre'], string> = { paquet_a_accepter: 'boxes', paquet_non_affecte: 'user-cog', incident: 'triangle-alert', litige: 'scale', piece_expire: 'car', piece_a_controler: 'id-card', depart: 'log-out', depart_echu: 'log-out', absence: 'calendar-x', kit_a_constater: 'package-x', versement_a_faire: 'smartphone' }
const BOUTON: Record<Tache['genre'], string> = { paquet_a_accepter: 'Voir', paquet_non_affecte: 'Affecter', incident: 'Décider', litige: 'Répondre', piece_expire: 'Mettre à jour', piece_a_controler: 'Contrôler', depart: 'Traiter', depart_echu: 'Traiter', absence: 'Voir', kit_a_constater: 'Constater', versement_a_faire: 'Verser' }

/** Écart de score au dixième, virgule française (« 8,8 », « −2 »). */
const dixieme = (n: number) => (Math.round(n * 10) / 10).toLocaleString('fr-FR').replace('-', '−')

function LigneTache({ tache, maintenant, urgente }: { tache: Tache; maintenant: number; urgente: boolean }) {
  const { t, tf } = usePreferences()
  const { duree, date } = useDates()
  // Compte à rebours en direct (M17, useRestant du kit) : à la seconde dans la dernière heure.
  const proche = Math.abs(tache.echeance - maintenant) < 3_600_000
  const direct = useHorloge(proche ? 1_000 : 30_000)
  const reste = tache.genre === 'piece_expire' ? tache.echeance - maintenant : tache.echeance - direct
  const minutes = reste / 60_000
  const restant = useRestant()
  const d = reste > 0 && reste < 3_600_000 ? restant(reste) : duree(Math.abs(reste))
  const demande = tache.genre === 'depart' || tache.genre === 'depart_echu' || tache.genre === 'absence'
  const ton = tache.genre === 'depart_echu' || ((tache.genre === 'kit_a_constater' || tache.genre === 'versement_a_faire') && reste < 0) ? 'red' : tache.genre === 'kit_a_constater' ? (minutes < 24 * 60 ? 'red' : 'amber') : tache.genre === 'versement_a_faire' ? 'amber' : demande || tache.genre === 'piece_a_controler' ? 'amber' : reste < 0 ? 'red' : tache.genre === 'piece_expire' ? 'amber' : tache.genre === 'paquet_a_accepter' ? (minutes < P.echeanceRougeMin ? 'red' : 'amber') : minutes < 60 ? 'amber' : 'ink'
  const echeance =
    tache.genre === 'kit_a_constater'
      ? reste < 0
        ? t('délai du constat passé')
        : tf('{d} pour constater', { d })
      : tache.genre === 'versement_a_faire'
        ? reste < 0
          ? tf('à verser depuis le {d}', { d: date(tache.echeance) })
          : t('à verser aujourd’hui')
        : tache.genre === 'depart_echu'
      ? tf('préavis échu le {d}', { d: date(tache.echeance) })
      : tache.genre === 'depart'
        ? tf('préavis jusqu’au {d}', { d: date(tache.echeance) })
        : tache.genre === 'absence'
          ? reste < 0
            ? t('absent aujourd’hui')
            : tf('à partir du {d}', { d: date(tache.echeance) })
          : tache.genre === 'piece_expire'
      ? reste < 0
        ? t('expirée')
        : tf('expire le {d}', { d: date(tache.echeance) })
      : reste < 0
        ? tache.genre === 'piece_a_controler'
          ? tf('envoyée il y a {d}', { d: duree(-reste) })
          : tf('dépassée de {d}', { d: duree(-reste) })
        : tache.genre === 'paquet_a_accepter'
          ? tf('{d} pour accepter', { d })
          : tf('{d} restantes', { d })
  const alerte = tache.genre === 'paquet_a_accepter' || tache.genre === 'paquet_non_affecte'
  return (
    <Rangee
      icone={tache.genre === 'piece_expire' && tache.route === 'pieces' ? 'id-card' : ICONE[tache.genre]}
      ton={alerte ? 'or' : tache.genre === 'incident' ? 'red' : 'amber'}
      chaud={urgente}
      boutons
      titre={tache.titre}
      sous={tache.detail}
      droite={
        <>
          <Pill ton={ton} sm icone="timer">
            {echeance}
          </Pill>
          <Link className={'btn sm ' + (urgente ? 'primary' : 'secondary')} to={chemin(tache.route, tache.params)}>
            <span>{t(tache.genre === 'piece_expire' && tache.route === 'pieces' ? 'Relancer' : BOUTON[tache.genre])}</span>
          </Link>
        </>
      }
    />
  )
}

export default function Tableau() {
  const { t, tf } = usePreferences()
  const { date, heure, jour } = useDates()
  const maintenant = useHorloge(1000)
  const s = useSession()
  const role = useRole()
  const montants = useMontantsVisibles()
  const comptable = role === 'comptable'
  const tableau = useLecture(() => source.tableau.tableau())
  const compte = useLecture(() => source.compte.etat())
  const carte = useLecture(() => source.zones.carte())
  const livreurs = useLecture<Livreur[] | null>(() => (comptable ? Promise.resolve(null) : source.livreurs.liste()), [comptable])
  const consignes = useFeuilleParams('consignes')
  const d = tableau.donnees
  const e = compte.donnees
  const relire = () => (tableau.relire(), compte.relire())
  const prenom = s.utilisateur?.prenom ?? ''
  const kicker = `${jour(maintenant)} · ${heure(maintenant)}`
  const action = comptable ? (
    <Link className="btn primary" to={chemin('reglements')}>
      <Icone nom="banknote" taille={18} />
      <span>{t('Voir les règlements')}</span>
    </Link>
  ) : (
    e?.effets.publication !== false && (
      <Link className="btn primary" to={chemin('paquets')} aria-label={s.badges.paquets ? tf('Paquets disponibles, {n} à accepter', { n: s.badges.paquets }) : undefined}>
        <Icone nom="boxes" taille={18} />
        <span>{t('Paquets disponibles')}</span>
        {s.badges.paquets > 0 && <span className="badge-num">{s.badges.paquets}</span>}
      </Link>
    )
  )
  if (!d || !e)
    return (
      <Ecran route="tableau" titre={tf('Bonjour {prenom}', { prenom })} kicker={kicker} actions={action}>
        {tableau.erreur || compte.erreur ? <ErreurLecture erreur={(tableau.erreur ?? compte.erreur)!} relire={relire} /> : <Chargement lignes={4} />}
      </Ecran>
    )

  // Bandeau unique, le plus grave : erreur (données gardées) > pluie forte. La suspension a son héros.
  const bandeau = tableau.erreur ? (
    <ErreurLecture erreur={tableau.erreur} relire={relire} lu={d.lu} />
  ) : e.pluie && e.etat !== 'suspendu' ? (
    <div className="dk-banner amber" role="status">
      <Icone nom="cloud-rain" taille={20} />
      <div className="grow">
        <b>{t('Pluie forte sur Yaoundé.')}</b> {tf('Délai saisonnier en vigueur dans vos zones : +{h} h sur la promesse, annoncé aux clients avant paiement. Sacs étanches obligatoires : un colis mouillé est un colis abîmé.', { h: P.pluieHeures })}
      </div>
      <button type="button" className="btn secondary" onClick={() => consignes.ouvrir()}>
        <Icone nom="umbrella" taille={18} />
        <span>{t('Consignes')}</span>
      </button>
    </div>
  ) : null

  const consignesFeuille = (
    <Feuille ouverte={consignes.ouverte} fermer={consignes.fermer} titre={t('Consignes de pluie forte')}>
      <h2 className="card-t">{t('Consignes de pluie forte')}</h2>
      <div className="mt14">
        {[t('Chaque colis voyage dans un sac étanche, fermé, étiquette visible.'), tf('Le délai saisonnier (+{h} h) est déjà annoncé aux clients : tenez-le.', { h: P.pluieHeures }), t('Photo de preuve à chaque changement de main, même sous abri.'), t('Un colis mouillé ou abîmé se déclare en incident avant la remise.'), t('La sécurité du livreur d’abord : arrêtez-vous en cas d’orage.')].map((c) => (
          <div key={c} className="check">
            <span className="cbx on">
              <Icone nom="check" taille={14} trait={3} />
            </span>
            <span className="grow">{c}</span>
          </div>
        ))}
      </div>
      <button type="button" className="btn primary mt16" onClick={consignes.fermer}>
        {t('Compris')}
      </button>
    </Feuille>
  )

  // Compte en configuration : le guide de démarrage remplace tout (prototype : « Bienvenue chez BelivaY »).
  if (e.etat === 'configuration' && d.guide)
    return (
      <Ecran
        route="tableau"
        titre={t('Bienvenue chez BelivaY')}
        kicker={kicker}
        actions={
          <Link className="btn secondary" to={chemin('messages', { sujet: 'compte' })}>
            <Icone nom="message-circle" taille={18} />
            <span>{t('Contacter BelivaY')}</span>
          </Link>
        }
      >
        {bandeau}
        <GuideDemarrage guide={d.guide} />
      </Ecran>
    )

  const aFaire = comptable ? [] : d.aFaire
  const pilote = d.pilote
  const ind = d.indicateurs
  const kpis = (
    <div className={'g ' + (montants && ind.aVerserVendredi !== null ? 'g5' : 'g4')}>
      <Kpi icone="map" k={t('Missions en cours')} v={ind.missionsEnCours || '—'} s={ind.missionsEnCours ? t('en route ou en ramassage') : t('Aucune mission en cours pour l’instant')} />
      <Kpi icone="package" k={t('Colis sous garde')} v={ind.colisSousGarde || '—'} u={ind.colisSousGarde ? t('colis') : undefined} s={ind.colisSousGarde ? t('sous votre responsabilité') : t('Aucun colis sous votre garde pour l’instant')} />
      <Kpi
        icone="timer"
        iton={ind.delaiTenu7j !== null && ind.delaiTenu7j < P.seuilDelaiTenu ? 'amber' : 'green'}
        k={tf('Délai tenu · {n} jours', { n: P.fenetreDelaiTenuJours })}
        v={d.delaiTenu ? ind.delaiTenu7j : '—'}
        u={d.delaiTenu ? '%' : undefined}
        s={d.delaiTenu ? tf('{a} paquets sur {b} livrés en moins de {h} h', { a: d.delaiTenu.dansLeDelai, b: d.delaiTenu.clos, h: PARAMETRES.delais.livraisonH }) : t('Aucun paquet clos encore')}
      />
      <Kpi icone="scale" iton={ind.litigesOuverts ? 'amber' : undefined} k={t('Litiges ouverts')} v={ind.litigesOuverts || '—'} s={ind.litigesOuverts ? t('réponse attendue : voir Litiges') : t('Aucun litige ouvert')} />
      {montants && ind.aVerserVendredi !== null && (
        <Kpi icone="banknote" ton="night" k={t('À verser vendredi')} v={ind.aVerserVendredi ? F(ind.aVerserVendredi) : '—'} u={ind.aVerserVendredi ? 'F' : undefined} s={ind.aVerserVendredi ? tf('missions validées · arrêté {a}', { a: REGISTRE['ENT-VER-ARRETE']?.valeur ?? '' }) : t('Aucune prestation validée pour l’instant')} />
      )}
    </div>
  )

  const trust = (
    <Panel className="vie-relief" titre={t('Palier et Trust Score')} icone="gauge" a={{ t: t('Score qualité'), to: chemin('score') }}>
      <div className="row">
        <Anneau v={d.palier.trustScore} taille={84} aria={tf('Trust Score {n} sur 100', { n: d.palier.trustScore })} />
        <div className="grow">
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Pill ton="acc" sm>
              {t(NOM_PALIER[d.palier.palier])}
            </Pill>
            <span className={'delta ' + (d.palier.tendance < 0 ? 'down' : 'up')}>
              <Icone nom={d.palier.tendance < 0 ? 'trending-down' : 'trending-up'} taille={14} />{' '}
              {d.palier.tendance === 0 ? t('stable') : d.palier.tendance > 0 ? tf('+{n} cette semaine', { n: dixieme(d.palier.tendance) }) : tf('{n} cette semaine', { n: dixieme(d.palier.tendance) })}
            </span>
          </div>
          <div className="t13 c3 mt6 lh">{d.palier.plafond === null ? t('Sans plafond par colis (assurance des marchandises obligatoire).') : tf('Plafond de {m} F par colis : un colis plus cher ne vous est jamais proposé.', { m: F(d.palier.plafond) })}</div>
        </div>
      </div>
      <div className="mt12">
        <Courbe valeurs={[d.palier.trustScore - d.palier.tendance, d.palier.trustScore]} l={300} h={36} />
      </div>
      {d.palier.prochain && (
        <Note ton="acc" icone="award">
          <b>{t(NOM_PALIER[d.palier.prochain])}</b>{' '}
          {tf('({p}) : score ≥ {s} tenu {j} jours.', {
            p: PARAMETRES.paliers.plafonds[d.palier.prochain] === null ? t('sans plafond') : `${F(PARAMETRES.paliers.plafonds[d.palier.prochain]!)} F`,
            s: d.palier.prochain === 'Or' ? PARAMETRES.paliers.seuils.Or : PARAMETRES.paliers.seuils.Confirme,
            j: PARAMETRES.paliers.tenueJours,
          })}
        </Note>
      )}
      <div className="mt8">
        <Verrou>{t('Palier et plafond fixés par BelivaY')}</Verrou>
      </div>
    </Panel>
  )

  const piloteHero = pilote ? (
    <div className="hero night" style={{ marginTop: 0 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="hk">{t('Phase pilote · lettre d’engagement')}</span>
        <Pill ton="dk" sm>
          {tf('Jour {j} sur {n}', { j: pilote.jour, n: pilote.duree })}
        </Pill>
      </div>
      <div className="ht">{tf('Bilan conjoint écrit le {d}', { d: date(pilote.bilanLe) })}</div>
      <div className="hs">{t('Délais et tarifs mesurés chaque jour ; la grille définitive est fixée au bilan, toujours sous les plafonds, puis le contrat définitif est signé.')}</div>
      <div className="entA-cal" role="img" aria-label={tf('Jour {j} sur {n}', { j: pilote.jour, n: pilote.duree })}>
        {Array.from({ length: pilote.duree }, (_, i) => (
          <i key={i} className={i + 1 < pilote.jour ? 'on' : i + 1 === pilote.jour ? 'cur' : ''}></i>
        ))}
      </div>
      <div className="btns">
        <Link className="btn dark sm" to={chemin('rapports')}>
          <Icone nom="chart-column" taille={18} />
          <span>{t('Rapport de pilote')}</span>
        </Link>
        <Link className="btn dark sm" to={chemin('etat')}>
          <Icone nom="info" taille={18} />
          <span>{t('État du compte')}</span>
        </Link>
      </div>
    </div>
  ) : null

  const aFairePanel = (
    <Panel titre={t('À faire maintenant')} icone="list-checks" droite={aFaire.length > 0 && <Pill sm icone="arrow-down-wide-narrow">{t('Trié par échéance')}</Pill>}>
      {aFaire.length === 0 ? (
        <div className="entA-note-lock" style={{ marginTop: 0 }}>
          <Icone nom="circle-check" taille={16} />
          {comptable ? t('Rien à traiter : aucun relevé en attente, aucune retenue à justifier.') : t('Rien à faire maintenant : les nouveaux paquets de vos zones apparaîtront ici avec leur compte à rebours.')}
        </div>
      ) : (
        <>
          <div className="e-afaire-l">
            {aFaire.slice(0, VISIBLES).map((x, i) => (
              <LigneTache key={x.id} tache={x} maintenant={maintenant} urgente={i === 0} />
            ))}
          </div>
          {/* Les plus urgentes d'abord ; la suite, repliée, n'écrase plus les indicateurs au téléphone. */}
          {aFaire.length > VISIBLES && (
            <details className="drt mt10">
              <summary>
                <span className="drt-res">
                  <span>{tf('{n} autres tâches, plus tard', { n: aFaire.length - VISIBLES })}</span>
                </span>
                <span className="drt-voir">{t('Voir')}</span>
                <Icone nom="chevron-down" taille={18} />
              </summary>
              <div className="e-afaire-l drt-c">
                {aFaire.slice(VISIBLES).map((x) => (
                  <LigneTache key={x.id} tache={x} maintenant={maintenant} urgente={false} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </Panel>
  )

  const zonesPanel = (
    <Panel titre={t('Vos zones aujourd’hui')} icone="map-pinned" a={{ t: t('Zones et capacité'), to: chemin('zones') }}>
      {d.zones.length === 0 ? (
        <Note ton="acc" icone="map-pinned">
          {t('Déclarez une zone et rattachez un livreur pour recevoir des paquets.')}
        </Note>
      ) : (
        <>
          <div className="entA-map">{carte.donnees ? <CarteZones zones={carte.donnees} titre={t('Vos zones sur la carte')} etiquettes="code" hauteurMax={260} /> : <Chargement lignes={1} />}</div>
          <div className="mt12">
            <BarresH largeurLibelle={118} largeurValeur={64} lignes={d.zones.map((z) => ({ l: `${z.code} ${z.nom}`, v: z.acceptes, max: z.capacite, r: `${z.acceptes} / ${z.capacite}`, ton: z.acceptes >= z.capacite ? 'red' : 'acc', label: tf('{a} colis acceptés sur {c}', { a: z.acceptes, c: z.capacite }) }))} />
          </div>
          <div className="t12 c3 mt6">{t('Colis acceptés aujourd’hui sur la capacité déclarée de chaque zone.')}</div>
        </>
      )}
    </Panel>
  )

  const STATUT: Record<Livreur['statut'], [string, Ton]> = { en_mission: ['Affecté', 'acc'], en_ligne: ['Disponible', 'green'], actif: ['Hors service', 'ink'], en_activation: ['En activation', 'amber'], suspendu: ['Suspendu', 'red'], retire: ['Retiré', 'ink'] }
  const flottePanel = (
    <Panel titre={t('Flotte maintenant')} icone="users" a={{ t: t('Livreurs'), to: chemin('flotte') }}>
      <div className="row" style={{ gap: 18, marginBottom: 6 }}>
        <div className="entA-sum">
          <b>{d.flotte.actifs}</b>
          <span className="t13 c3">{t('actifs')}</span>
        </div>
        <div className="entA-sum">
          <b>{d.flotte.enLigne}</b>
          <span className="t13 c3">{t('en ligne')}</span>
        </div>
        {d.flotte.enActivation > 0 && (
          <div className="entA-sum">
            <b>{d.flotte.enActivation}</b>
            <span className="t13 c3">{t('en activation')}</span>
          </div>
        )}
      </div>
      {(livreurs.donnees ?? [])
        .filter((l) => l.statut !== 'retire')
        .slice(0, 6)
        .map((l) => (
          <Rangee
            key={l.id}
            ton="ink"
            av={<span className="e-av-l">{l.initiales}</span>}
            titre={
              <Link to={chemin('livreur', { id: l.id })} className="e-lien-t">
                {l.nom}
              </Link>
            }
            sous={l.statut === 'en_activation' ? t('Pièces et certification en cours') : `${t(STATUT[l.statut][0])} · ${l.zones.join(', ')}`}
            droite={
              <Pill ton={STATUT[l.statut][1]} dot sm>
                {t(STATUT[l.statut][0])}
              </Pill>
            }
          />
        ))}
      {!comptable && d.flotte.actifs === 0 && (
        <div className="btns">
          <Link className="btn secondary" to={chemin('ajout')}>
            <Icone nom="user-plus" taille={18} />
            <span>{t('Ajouter un livreur')}</span>
          </Link>
        </div>
      )}
    </Panel>
  )

  // Compte suspendu (prototype : héros rouge, missions à terminer, recours).
  if (e.etat === 'suspendu')
    return (
      <Ecran route="tableau" kicker={kicker} fixes={consignesFeuille}>
        {bandeau}
        <div className="hero red" style={{ marginTop: 14 }}>
          <div className="hk">{t('Compte suspendu · aucun nouveau paquet')}</div>
          <div className="ht">{e.motif}</div>
          <div className="hs">{tf('Depuis le {d}. Ce n’est pas une sanction : levée dès la nouvelle pièce vérifiée ({h} h ouvrées au plus). Votre Trust Score n’est pas gelé.', { d: date(e.depuis), h: P.revueHumaineH })}</div>
          <div className="btns" style={{ maxWidth: 520 }}>
            <Link className="btn white" to={chemin('contrat', { t: 'pieces' })}>
              <Icone nom="upload" taille={18} />
              <span>{t('Envoyer la nouvelle autorisation')}</span>
            </Link>
            <Link className="btn dark" to={chemin('messages', { sujet: 'suspension' })}>
              <Icone nom="message-circle" taille={18} />
              <span>{t('Contacter BelivaY')}</span>
            </Link>
          </div>
        </div>
        <div className="g g21">
          <Panel titre={t('Missions à terminer')} icone="list-checks">
            {e.aTerminer && (
              <Rangee
                icone="warehouse"
                ton="or"
                boutons
                titre={tf('{n} colis sous votre garde', { n: e.aTerminer.colis })}
                sous={tf('À déposer au {relais} avant {h}.', { relais: e.aTerminer.relais, h: heure(e.aTerminer.avant) })}
                droite={
                  <Link className="btn sm primary" to={chemin('missions')}>
                    {t('Voir la mission')}
                  </Link>
                }
              />
            )}
            <Rangee icone="rotate-ccw" ton="ink" titre={t('Paquets acceptés non commencés : republiés')} sous={t('Ils sont proposés aux autres entreprises de la zone ; aucune pénalité en argent.')} />
            <Rangee icone="ban" ton="red" titre={t('Paquets publiés : plus visibles')} sous={t('Tant que la suspension dure, Paquets disponibles reste vide.')} />
          </Panel>
          <Panel titre={t('Recours')} icone="scale">
            <div className="t13 c2 lh">{t('Si la date d’expiration enregistrée est fausse, contestez la décision une fois, pièce à l’appui. Sinon, envoyez la nouvelle pièce : c’est le chemin le plus court.')}</div>
            <div className="btns">
              <Link className="btn secondary" to={chemin('etat')}>
                <Icone nom="gavel" taille={18} />
                <span>{t('Contester une fois')}</span>
              </Link>
            </div>
            <div className="hint-l">
              <Icone nom="banknote" taille={15} />
              <span>{t('Les versements dus restent payés le vendredi : la suspension ne retient rien.')}</span>
            </div>
          </Panel>
        </div>
        {kpis}
        <div className="g g2" style={{ alignItems: 'start' }}>
          {zonesPanel}
          {trust}
        </div>
      </Ecran>
    )

  // Comptable : rien à accepter ni à affecter ; l'argent de la semaine passe en tête.
  if (comptable)
    return (
      <Ecran route="tableau" titre={tf('Bonjour {prenom}', { prenom })} kicker={kicker} actions={action} fixes={consignesFeuille}>
        {bandeau}
        {kpis}
        <div className="g g21">
          <Panel titre={t('Argent de la semaine')} icone="wallet">
            <div className="entA-kv2">
              <Kv k={t('À verser vendredi')} v={ind.aVerserVendredi ? `${F(ind.aVerserVendredi)} F` : '—'} />
              <Kv k={t('Arrêté des prestations')} v={String(REGISTRE['ENT-VER-ARRETE']?.valeur ?? '')} />
              <Kv k={t('Frais de versement')} v={t('0 F · à la charge de BelivaY')} />
            </div>
            <div className="btns" style={{ maxWidth: 460 }}>
              <Link className="btn primary" to={chemin('reglements')}>
                <Icone nom="banknote" taille={18} />
                <span>{t('Voir les règlements')}</span>
              </Link>
              <Link className="btn secondary" to={chemin('releves')}>
                <Icone nom="file-text" taille={18} />
                <span>{t('Relevés et factures')}</span>
              </Link>
            </div>
          </Panel>
          <div className="col" style={{ gap: 16 }}>
            {aFairePanel}
            {trust}
          </div>
        </div>
        <Note ton="ink" icone="eye-off">
          {t('Vue de la comptable : pas de paquet à accepter, pas d’affectation, pas de réponse aux litiges. Code SMS exigé à chaque connexion.')}
        </Note>
      </Ecran>
    )

  // Ouverture = le travail (LECONS-PROTOTYPES.md) : quatre gros éléments « verbe + nombre » (accepter, affecter,
  // suivre, traiter), chacun ouvre l'écran où l'on agit ; le premier qui a du travail est mis en avant (héros vert).
  // Les compteurs sont ceux déjà connus (badges de la session, liste « À faire »).
  const nAffecter = aFaire.filter((x) => x.genre === 'paquet_non_affecte').length
  const unite = (n: number, un: string, plusieurs: string) => (n > 1 ? t(plusieurs) : t(un))
  const travaux = [
    { n: s.badges.paquets, v: t('Accepter'), u: unite(s.badges.paquets, 'paquet', 'paquets'), icone: 'boxes', to: chemin('paquets') },
    { n: nAffecter, v: t('Affecter'), u: unite(nAffecter, 'paquet', 'paquets'), icone: 'user-plus', to: chemin('affectation') },
    { n: s.badges.missions, v: t('Suivre'), u: unite(s.badges.missions, 'mission en cours', 'missions en cours'), icone: 'map', to: chemin('missions') },
    { n: s.badges.incidents, v: t('Traiter'), u: unite(s.badges.incidents, 'incident', 'incidents'), icone: 'triangle-alert', to: chemin('incidents') },
  ]
  const heros = travaux.findIndex((x) => x.n > 0)
  const quotidien = (
    <nav className="e-travail" aria-label={t('Le travail du jour')}>
      {travaux.map((x, i) => (
        <Link key={x.to} to={x.to} className={'e-act' + (i === heros ? ' e-act-heros' : x.n > 0 ? ' e-act-chaud' : ' e-act-calme')} aria-label={`${x.v} ${x.n} ${x.u}`}>
          <span className="e-act-h" aria-hidden="true">
            <span className="e-act-i">
              <Icone nom={x.icone} taille={20} />
            </span>
            <Icone nom="arrow-right" taille={20} />
          </span>
          <span className="e-act-v">{x.v}</span>
          <span className="e-act-n">
            <b>{x.n}</b> {x.u}
          </span>
        </Link>
      ))}
    </nav>
  )

  return (
    <Ecran route="tableau" titre={tf('Bonjour {prenom}', { prenom })} kicker={kicker} fixes={consignesFeuille}>
      {bandeau}
      {quotidien}
      <div className="g g21">
        {aFairePanel}
        {flottePanel}
      </div>
      <Sec t={t('Indicateurs')} />
      {kpis}
      <div className="g g2" style={{ alignItems: 'start' }}>
        <div className="col" style={{ gap: 16 }}>
          {trust}
          {piloteHero}
        </div>
        {zonesPanel}
      </div>
      {role === 'repartiteur' && (
        <Note ton="ink" icone="eye-off">
          {t('Vue du répartiteur : le montant à verser vendredi est réservé à la propriétaire et à la comptable ; la réponse aux litiges, à la propriétaire. Tout le reste est identique.')}
        </Note>
      )}
    </Ecran>
  )
}
