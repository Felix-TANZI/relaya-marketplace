// ENT-P27 · État du compte (tous les rôles), sur la structure du prototype (etat-compte) : configuration → chaîne
// d'activation (guide) ; pilote ou actif → héros du pilote et ce que l'état permet ; autres états → héros coloré.
// Sept états décidés par BelivaY (ENT-03-R27), lus, jamais changés ici :
// héros coloré (nuit : pilote, actif, résilié ; ambre : restreint, préavis ; rouge : suspendu) avec
// motif, niveau, dates, chiffres et actions ; conséquences ; frise des sept états avec cadenas « Décidé par BelivaY » ;
// ce que chaque état permet ; journal immuable du compte. Calculs (ENT-03-R29) : jours restants du pilote, fin du
// préavis à 23 h 59, fin de la lecture seule (lecture_apres_resiliation). Recours une fois quand l'état le permet
// (propriétaire ; ENT-03-R32 : jamais de suspension sans motif, niveau et recours). Démonstration seulement : un
// panneau pose l'état comme la console le ferait, et un jour de pluie forte.
import { PARAMETRES, REGISTRE } from '../../calculs/registre'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { env } from '@client/config/env'
import { Feuille } from '@client/composants/Feuille'
import { jouer } from '@client/composants/Sons'
import { Icone } from '../../composants/Icone'
import { NOM_ETAT } from '../../config/libelles'
import { chemin } from '../../config/pages'
import { ETATS_COMPTE, type EtatCompte } from '../../donnees/domaines/compte'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge, usePeut } from '../../session'
import { Chargement, ErreurLecture, useDates, useFeuilleParams } from './outils'
import { Barre, Champ, Hint, Kv, Note, Panel, Pill, Plus, Rangee, Table, Verrou } from '../../composants/prototype'
import { F } from '@client/i18n/format'
import { GuideDemarrage } from './Guide'

const PALIERS = PARAMETRES.paliers
import { Ecran } from '../../composants/coque'

// Ce que chaque état permet (ENT-03-R27, ENT-03-R30, ENT-P27R-01 à 03) : paquets publiés, missions en cours, versements, portail.
const PERMET: Record<EtatCompte, [string, string, string, string]> = {
  configuration: ['Aucun', 'Aucune', 'Aucun', 'Guide de démarrage'],
  pilote: ['Oui, dans vos zones', 'Oui', 'Chaque vendredi', 'Complet'],
  actif: ['Oui, dans vos zones', 'Oui', 'Chaque vendredi', 'Complet'],
  restreint: ['Zones, capacité ou plafond réduits', 'Oui', 'Chaque vendredi', 'Complet'],
  suspendu: ['Aucun', 'Terminées ou déposées', 'Chaque vendredi, missions faites', 'Missions à terminer, lecture'],
  preavis: ['Oui, jusqu’au dernier jour', 'Honorées', 'Chaque vendredi, dernier après la fin', 'Complet'],
  resilie: ['Aucun', 'Aucune', 'Dernier versement qui solde tout', 'Lecture seule : relevés, règlements, preuves, contrat'],
}
const CONSEQUENCES: Record<EtatCompte, string[]> = {
  configuration: ['Aucun paquet ne vous est publié tant que la chaîne d’activation n’est pas complète.', 'Le guide de démarrage du tableau de bord dit ce qui manque.'],
  pilote: ['Toutes les règles s’appliquent pendant le pilote ; délais et tarifs sont mesurés chaque jour.', 'Le bilan conjoint écrit fixe la grille définitive, toujours sous les plafonds.'],
  actif: ['Vous recevez les paquets de vos zones selon votre palier et votre score.', 'Vos versements partent chaque vendredi, sans demande ni frais.'],
  restreint: ['Ce qui est réduit est indiqué ci-dessus ; le reste continue normalement.', 'La restriction se lève quand le motif disparaît ; ce n’est pas une amende.'],
  suspendu: ['Plus aucun paquet ne vous est publié ; les paquets acceptés non commencés sont republiés sans pénalité.', 'Les colis déjà sous votre garde se terminent ou se déposent au relais.', 'Vos livreurs voient « Rattachement suspendu » ; les missions faites restent payées le vendredi.'],
  preavis: ['Les paquets restent accessibles jusqu’au dernier jour ; les missions sont honorées.', 'Après la fin : dernier versement, emballages restitués ou facturés, lecture seule.'],
  resilie: ['Vos livreurs gardent leur historique et leur Trust Score et peuvent rejoindre une autre entreprise.', 'Les données des clients sont effacées ; relevés et preuves restent lisibles pendant la durée prévue.'],
}

export default function Etat() {
  const { t, tf } = usePreferences()
  const { date, dateHeure, heure, jours } = useDates()
  const maintenant = useHorloge()
  const proprio = usePeut(['proprietaire'])
  const naviguer = useNavigate()
  const compte = useLecture(() => source.compte.etat())
  const guide = useLecture(() => source.contrat.activation())
  const recours = useFeuilleParams('recours')
  const [texte, setTexte] = useState('')
  const [refus, setRefus] = useState<string | null>(null)
  const e = compte.donnees
  if (!e)
    return (
      <Ecran route="etat">
        {compte.erreur ? <ErreurLecture erreur={compte.erreur} relire={compte.relire} /> : <Chargement lignes={3} />}
      </Ecran>
    )
  const envoyerRecours = async () => {
    const r = await source.compte.faireRecours(texte)
    if (!r.ok) {
      setRefus(t(r.raison === 'deja_utilise' ? 'Le recours a déjà été utilisé.' : r.raison === 'non_permis' ? 'Cet état ne permet pas de recours.' : 'Expliquez pourquoi la décision vous semble fausse.'))
      jouer('erreur')
      return
    }
    jouer('envoi')
    recours.fermer()
  }
  const scenario = async (s: { etat?: EtatCompte; pluie?: boolean }) => {
    await source.compte.scenario(s)
    naviguer(chemin('etat'), { replace: true })
  }
  const chiffres: [string, string][] = []
  if (e.pilote) chiffres.push([`${e.pilote.jour} / ${e.pilote.duree}`, t('jour du pilote')], [String(e.pilote.duree - e.pilote.jour), t('jours restants')])
  if (e.bilanLe) chiffres.push([date(e.bilanLe), t('bilan conjoint écrit')])
  if (e.preavis) chiffres.push([`${e.preavis.jour} / ${e.preavis.duree}`, t('jour du préavis')], [dateHeure(e.preavis.fin), t('fin du partenariat')], [date(e.preavis.dernierVersement), t('dernier versement')])
  if (e.lectureJusqua) chiffres.push([date(e.lectureJusqua, true), t('lecture seule jusqu’au')])
  if (e.aTerminer) chiffres.push([String(e.aTerminer.colis), tf('colis à déposer au {relais} avant {h}', { relais: e.aTerminer.relais, h: heure(e.aTerminer.avant) })])
  if (e.jusqua && !e.pilote && !e.preavis) chiffres.push([date(e.jusqua), t('fin prévue')])

  const ETATS_BANDE: [EtatCompte, string, string][] = [
    ['configuration', 'Chaîne d’activation incomplète', 'settings'],
    ['pilote', 'Bilan conjoint en fin de pilote', 'flag'],
    ['actif', 'Contrat définitif, tout ouvert', 'circle-check'],
    ['restreint', 'Zones, capacité ou plafond réduits', 'circle-pause'],
    ['suspendu', 'Aucun nouveau paquet', 'ban'],
    ['preavis', 'Paquets accessibles jusqu’à la fin', 'hourglass'],
    ['resilie', 'Lecture seule', 'lock'],
  ]
  const bande = (
    <Panel titre={t('Les états du compte')} icone="info" droite={<Verrou>{t('Décidé par BelivaY')}</Verrou>} style={{ marginTop: 16 }}>
      <div className="entA-states" role="list" aria-label={t('Les sept états du compte')}>
        {ETATS_BANDE.map(([x, sous, ic]) => (
          <div key={x} role="listitem" className={x === e.etat ? 'on' : ''} aria-current={x === e.etat ? 'true' : undefined}>
            <Icone nom={ic} taille={18} />
            <b>{t(NOM_ETAT[x])}</b>
            {t(sous)}
          </div>
        ))}
      </div>
    </Panel>
  )
  const tableau = (
    <details className="drt" style={{ marginTop: 16 }}>
      <summary>
        <span className="drt-res">
          <span className="ok">
            <Icone nom="list-checks" taille={14} />
            {tf('Ce que chaque état permet · {n} états comparés', { n: ETATS_COMPTE.length })}
          </span>
        </span>
        <span className="drt-voir">{t('Détail')}</span>
        <Icone nom="chevron-down" taille={18} />
      </summary>
      <div className="drt-c">
      <Table
        legende={t('Ce que chaque état permet')}
        outils={
          <>
            <span className="b8 t14">{t('Ce que chaque état permet')}</span>
            <span className="sp"></span>
            <Verrou>{t('Décidé par BelivaY, jamais par l’entreprise')}</Verrou>
          </>
        }
        pied={
          <>
            <span>{t('Aucune sanction n’est une amende : BelivaY agit sur l’accès, la priorité, le plafond et le contrat.')}</span>
            <span>{t('Chaque état affiche son motif et ses conséquences')}</span>
          </>
        }
        cle={(x) => x}
        ligneCls={(x) => (x === e.etat ? 'sel' : '')}
        rows={[...ETATS_COMPTE]}
        cols={[
          {
            k: 'e',
            t: t('État'),
            main: true,
            rendu: (x) => (
              <>
                <b>{t(NOM_ETAT[x])}</b>
                {x === e.etat && (
                  <>
                    {' '}
                    <Pill ton="acc" sm>
                      {t('Votre état')}
                    </Pill>
                  </>
                )}
              </>
            ),
          },
          ...(['Paquets publiés', 'Missions en cours', 'Versements', 'Portail'] as const).map((l, k) => ({ k: 'c' + k, t: t(l), rendu: (x: EtatCompte) => <div className="entA-c">{t(PERMET[x][k])}</div> })),
        ]}
      />
      </div>
    </details>
  )
  const journal = (
    <Panel titre={t('Journal du compte')} icone="history" style={{ marginTop: 16 }}>
      <div className="tl">
        {e.journal.map((j, k) => (
          <div key={k} className="ti done">
            <div className="tt">{`${t(NOM_ETAT[j.etat])} · ${j.motif}`}</div>
            <div className="td">{`${dateHeure(j.le)} · ${j.par}`}</div>
          </div>
        ))}
        {e.etat === 'pilote' && e.bilanLe && (
          <div className="ti cur">
            <div className="tt">{t('Bilan conjoint et contrat définitif')}</div>
            <div className="td">{date(e.bilanLe, true)}</div>
          </div>
        )}
      </div>
      <Hint icone="lock">{t('Immuable : chaque changement d’état porte son motif, son auteur et sa date.')}</Hint>
    </Panel>
  )
  const boutonRecours =
    e.recours.permis &&
    (e.recours.utilise ? (
      <Link className="btn dark" to={chemin('messages', { sujet: 'recours' })}>
        <Icone nom="gavel" taille={18} />
        <span>{e.recours.envoyeLe ? tf('Recours envoyé le {d} · suivre', { d: date(e.recours.envoyeLe) }) : t('Recours envoyé · suivre')}</span>
      </Link>
    ) : proprio ? (
      <button type="button" className="btn dark" onClick={() => recours.ouvrir()}>
        <Icone nom="gavel" taille={18} />
        <span>{t('Faire un recours (une fois)')}</span>
      </button>
    ) : null)
  const conseq = (
    <Panel titre={t('Ce que cela change')} icone="list-checks">
      {CONSEQUENCES[e.etat].map((c) => (
        <Rangee key={c} icone="check" ton="ink" titre={t(c)} />
      ))}
      {e.aTerminer && (
        <Rangee
          icone="warehouse"
          ton="or"
          boutons
          titre={tf('À terminer : {n} colis sous votre garde', { n: e.aTerminer.colis })}
          sous={tf('À déposer au {relais} avant {h}.', { relais: e.aTerminer.relais, h: heure(e.aTerminer.avant) })}
          droite={
            <Link className="btn sm primary" to={chemin('missions')}>
              {t('Voir')}
            </Link>
          }
        />
      )}
      <Hint>{e.effets.publication ? tf('Paquets publiés dans : {z}.', { z: e.effets.zones.join(', ') }) : t('Aucun paquet ne vous est publié.')}</Hint>
    </Panel>
  )
  const echelle = (
    <Panel titre={t('Recours et échelle des mesures')} icone="scale">
      <Kv k={tf('Niveau {n}', { n: 1 })} v={t('Avertissement écrit')} />
      <Kv k={tf('Niveau {n}', { n: 2 })} v={t('Restriction : zones, capacité, plafond, priorité')} />
      <Kv k={tf('Niveau {n}', { n: 3 })} v={t('Suspension, retour probatoire')} />
      <Kv k={tf('Niveau {n}', { n: 4 })} v={t('Résiliation')} />
      <Note ton="ink" icone="info">
        {t('Les niveaux 2 à 4 sont proposés par le système et validés par un humain avec motif écrit ; recours une fois. Une suspension pour pièce expirée est automatique et se lève seule à la vérification.')}
      </Note>
      <Hint icone="gavel">
        {e.recours.permis
          ? e.recours.utilise
            ? t('Votre recours a été envoyé : il est examiné par une autre personne que celle qui a décidé.')
            : proprio
              ? t('Vous pouvez faire un recours une fois contre cette décision : le bouton est en tête de page.')
              : t('Le recours se fait une fois, par le propriétaire.')
          : t('Un recours est ouvert quand une décision vous restreint ou vous suspend avec un motif.')}
      </Hint>
    </Panel>
  )
  const mini = chiffres.length > 0 && (
    <div className="entA-mini4">
      {chiffres.slice(0, 4).map(([v, l]) => (
        <div key={l} className="m4">
          <div className="l">{l}</div>
          <div className="v" style={{ fontSize: 16 }}>
            {v}
          </div>
        </div>
      ))}
    </div>
  )
  const SOUS: Record<EtatCompte, string> = {
    configuration: 'Le compte n’opère pas encore : voici la chaîne d’activation, ce qui manque et la prochaine étape.',
    pilote: 'Phase pilote : tout est ouvert, les chiffres de chaque jour préparent le bilan conjoint.',
    actif: 'Le compte est actif : tout est ouvert selon votre palier et votre score.',
    restreint: 'Une partie du compte est réduite. Le reste fonctionne normalement.',
    suspendu: 'Motif, niveau, durée et recours : tout ce qu’il faut pour reprendre.',
    preavis: 'Le compte fonctionne jusqu’au dernier jour du préavis.',
    resilie: 'Accès en lecture aux relevés et aux preuves pendant la durée prévue.',
  }
  const HERO: Record<EtatCompte, string> = { configuration: 'orange', pilote: 'night', actif: 'night', restreint: 'amber', suspendu: 'red', preavis: 'amber', resilie: 'night' }
  const demonstration = env.source !== 'api' && (
    <details className="more" style={{ marginTop: 16 }}>
      <summary>
        <Icone nom="info" taille={18} style={{ color: 'var(--acc-txt)', flexShrink: 0 }} />
        <span className="grow">{t('Démonstration : poser un état')}</span>
        <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
      </summary>
      <div className="more-b">
        <p>{t('En production, seule la console BelivaY change l’état du compte. Ici, voyez l’espace dans chaque état.')}</p>
        <div className="entA-chk mt10">
          {ETATS_COMPTE.map((x) => (
            <label key={x}>
              <input type="radio" name="etat-demo" checked={e.etat === x} onChange={() => void scenario({ etat: x })} />
              {t(NOM_ETAT[x])}
            </label>
          ))}
        </div>
        <div className="entA-chk mt10">
          <label>
            <input type="checkbox" checked={!!e.pluie} onChange={(ev) => void scenario({ pluie: ev.target.checked })} />
            {t('Jour de pluie forte')}
          </label>
        </div>
      </div>
    </details>
  )

  return (
    <Ecran
      route="etat"
      sous={t(SOUS[e.etat])}
      fixes={
        <Feuille ouverte={recours.ouverte && proprio && e.recours.permis && !e.recours.utilise} fermer={recours.fermer} titre={t('Faire un recours')}>
          <form
            onSubmit={(ev) => {
              ev.preventDefault()
              if (texte.trim()) void envoyerRecours()
            }}
          >
            <h2 className="card-t">{t('Faire un recours')}</h2>
            <p className="card-s">{t('Une seule fois pour cette décision. Le recours part à la console BelivaY, qui répond par écrit dans vos messages ; la décision reste appliquée pendant l’examen.')}</p>
            <Champ t={t('Pourquoi la décision vous semble fausse')}>
              <textarea rows={4} value={texte} onChange={(ev) => setTexte(ev.target.value)} />
            </Champ>
            {refus && (
              <p className="err mt10" role="alert">
                {refus}
              </p>
            )}
            <div className="btns mt16">
              <button type="submit" className="btn primary" disabled={!texte.trim()}>
                <Icone nom="send" taille={18} />
                <span>{t('Envoyer le recours')}</span>
              </button>
              <button type="button" className="btn ghost" onClick={recours.fermer}>
                {t('Annuler')}
              </button>
            </div>
          </form>
        </Feuille>
      }
    >
      {compte.erreur && <ErreurLecture erreur={compte.erreur} relire={compte.relire} lu={maintenant} />}
      {e.etat === 'configuration' && guide.donnees ? (
        <GuideDemarrage guide={guide.donnees} titre={t('Chaîne d’activation')} />
      ) : e.etat === 'pilote' || e.etat === 'actif' ? (
        <>
          <div className="g g21" style={{ alignItems: 'start' }}>
            <div className="hero night" style={{ marginTop: 0 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="hk">{e.etat === 'pilote' ? t('Phase pilote · lettre d’engagement') : t('Compte actif')}</span>
                {e.pilote && (
                  <Pill ton="dk" sm>
                    {tf('Jour {j} sur {n}', { j: e.pilote.jour, n: e.pilote.duree })}
                  </Pill>
                )}
              </div>
              <div className="ht">{e.bilanLe ? tf('Bilan conjoint écrit le {d}', { d: date(e.bilanLe) }) : t('Contrat définitif en vigueur')}</div>
              <div className="hs">{e.motif ?? t('Délais et tarifs mesurés chaque jour ; la grille définitive est fixée au bilan, toujours sous les plafonds, puis le contrat définitif est signé.')}</div>
              {e.pilote && (
                <div className="entA-cal" role="img" aria-label={tf('Jour {j} sur {n}', { j: e.pilote.jour, n: e.pilote.duree })}>
                  {Array.from({ length: e.pilote.duree }, (_, k) => (
                    <i key={k} className={k + 1 < e.pilote!.jour ? 'on' : k + 1 === e.pilote!.jour ? 'cur' : ''}></i>
                  ))}
                </div>
              )}
              <div className="btns">
                <Link className="btn dark sm" to={chemin('rapports')}>
                  <Icone nom="chart-column" taille={18} />
                  <span>{t('Rapport de pilote')}</span>
                </Link>
                <Link className="btn dark sm" to={chemin('contrat', { t: 'contrat' })}>
                  <Icone nom="file-signature" taille={18} />
                  <span>{t('Lettre d’engagement')}</span>
                </Link>
              </div>
            </div>
            <Panel titre={t('Ce que votre état permet')} icone="circle-check">
              <Rangee icone="boxes" ton="acc" titre={tf('Paquets de vos {n} zones', { n: e.effets.zones.length })} sous={tf('{z} · capacité déclarée décomptée à chaque acceptation', { z: e.effets.zones.join(', ') })} />
              <Rangee icone="shield-check" ton="acc" titre={e.effets.plafond === null ? t('Sans plafond par colis') : tf('Colis de {m} F au plus', { m: F(e.effets.plafond) })} sous={t('Palier et plafond fixés par BelivaY')} />
              <Rangee icone="banknote" ton="green" titre={t('Règlement chaque vendredi')} sous={t('Sans demande ni frais, au nom de l’entreprise')} />
              <Plus libelle={t('Pourquoi ces limites ?')} plat>
                <p className="t13">
                  <b>{t('Plafond par colis')}</b> — {tf('Il suit votre palier : Confirmé dès {c} points de Trust Score, Or dès {o}, chaque seuil tenu {j} jours. Un colis plus cher que le plafond ne vous est jamais proposé.', { c: PALIERS.seuils.Confirme, o: PALIERS.seuils.Or, j: PALIERS.tenueJours })}{' '}
                  <Link to={chemin('apprendre', { fiche: 'score' })}>{t('Comment monter')}</Link>
                </p>
                <p className="t13 mt8">
                  <b>{t('Capacité')}</b> — {t('Chaque paquet accepté décompte la capacité déclarée de sa zone ; capacité atteinte, l’acceptation est refusée dans cette zone jusqu’au jour suivant.')}{' '}
                  <Link to={chemin('zones')}>{t('Zones et capacité')}</Link>
                </p>
                <p className="t13 mt8">
                  <b>{t('Vendredi')}</b> — {tf('Les missions validées avant l’arrêté ({a}) sont réglées le vendredi qui suit.', { a: String(REGISTRE['ENT-VER-ARRETE']?.valeur ?? '') })}
                </p>
              </Plus>
            </Panel>
          </div>
          {e.pilote && (
            <div className="g g3">
              <Panel titre={t('Mesuré chaque jour')} icone="chart-column">
                <div className="t13 c2 lh">{t('Délai d’acceptation, ramassage, livraison dans la promesse, tarifs réels par type de paquet : les mêmes définitions que la console et le Trust Score.')}</div>
                <div className="mt8">
                  <Link className="entA-link" to={chemin('rapports')}>
                    {t('Rapport de pilote')}
                    <Icone nom="chevron-right" taille={14} />
                  </Link>
                </div>
              </Panel>
              <Panel titre={t('À la fin du pilote')} icone="handshake">
                <div className="t13 c2 lh">{t('Bilan conjoint écrit, grille définitive toujours sous les plafonds, puis contrat définitif : le compte passe « Actif ».')}</div>
              </Panel>
              <Panel titre={t('Jours restants')} icone="calendar-days">
                <div className="entA-sum">
                  <b>{e.pilote.duree - e.pilote.jour}</b>
                  <span className="t13 c3">{t('jours après aujourd’hui')}</span>
                </div>
                <div className="mt8">
                  <Barre pct={(100 * e.pilote.jour) / e.pilote.duree} ton="acc" />
                </div>
                {e.bilanLe && <div className="t12 c3 mt6">{tf('Bilan le {d}, dans {n} jours', { d: date(e.bilanLe, true), n: Math.max(0, jours(e.bilanLe, maintenant)) })}</div>}
              </Panel>
            </div>
          )}
        </>
      ) : (
        <>
          <div className={'hero ' + HERO[e.etat]} style={{ marginTop: 14 }}>
            <div className="hk">{e.etat === 'restreint' && e.restriction ? `${t(NOM_ETAT[e.etat])} · ${e.restriction}` : t(NOM_ETAT[e.etat])}</div>
            <div className="ht">{e.etat === 'preavis' && e.preavis ? tf('Fin du partenariat le {d}', { d: dateHeure(e.preavis.fin) }) : e.motif ?? t(NOM_ETAT[e.etat])}</div>
            <div className="hs">
              {[e.niveau, tf('Depuis le {d}', { d: date(e.depuis) }), e.decidePar].filter(Boolean).join(' · ')}
              {' · '}
              {t('Décidé par BelivaY')}
            </div>
            {e.etat === 'preavis' && e.preavis && (
              <div className="mt12">
                <Barre pct={(100 * e.preavis.jour) / e.preavis.duree} ton="acc" />
              </div>
            )}
            {mini}
            <div className="btns" style={{ maxWidth: 520 }}>
              {e.etat === 'suspendu' && (
                <Link className="btn white" to={chemin('contrat', { t: 'pieces' })}>
                  <Icone nom="upload" taille={18} />
                  <span>{t('Envoyer la nouvelle autorisation')}</span>
                </Link>
              )}
              {e.etat === 'restreint' && (
                <Link className="btn white" to={chemin('zones')}>
                  <Icone nom="map-pinned" taille={18} />
                  <span>{t('Voir les zones')}</span>
                </Link>
              )}
              {e.etat === 'preavis' && (
                <Link className="btn white" to={chemin('messages', { sujet: 'preavis' })}>
                  <Icone nom="message-circle" taille={18} />
                  <span>{t('Changer d’avis')}</span>
                </Link>
              )}
              {e.etat === 'resilie' && (
                <Link className="btn white" to={chemin('releves')}>
                  <Icone nom="download" taille={18} />
                  <span>{t('Télécharger les relevés')}</span>
                </Link>
              )}
              {boutonRecours}
            </div>
          </div>
          <div className="g g2">
            {conseq}
            {echelle}
          </div>
        </>
      )}
      {bande}
      {tableau}
      {journal}
      {demonstration}
    </Ecran>
  )
}
