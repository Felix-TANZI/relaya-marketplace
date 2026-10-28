// Sanctions et contrôle (VD-10, fig. 4) : repris du prototype (route('sanctions')), branché sur GET /account/status et
// GET /account/decisions (domaine trust). Des règles écrites d'avance ; une personne valide toute sanction lourde.
// - Carte d'état (VD10-R24) : aucune sanction (vert) ; avertissement (ambre : motif, date, gestes pour remonter) ;
//   visibilité réduite (fin dans 14 jours) ; suspension (mène à « Compte suspendu ») ; descente proposée.
// - Contrôle au ramassage (SAN-03) : la fréquence qui s'applique d'abord, puis le seuil qui la réduit ; le reste
//   replié dans « Pourquoi … ? » ; ajout : jauge vers le seuil qui réduit le contrôle.
// - Quatre niveaux (SAN-06) avec leurs durées lues dans les paramètres (VD-SAN-*, VD-PROBATOIRE : L-1).
// - Historique des décisions (SAN-05, VD10-R25) : contestation et réponse sous chaque décision, « Contester » seulement
//   sur une décision pas encore contestée ; vide ; indisponible (« Réessayer »).
// - Aucun montant : identique pour l'accès Préparation.
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Decision, StatutCompte } from '../../donnees/domaines/trust'
import { source } from '../../donnees/source'
import { useLecture, type Lecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useLocation } from 'react-router-dom'
import { Attente, Bouton, dateEtHeure, HorsLigne, Plus, useEnLigne } from './commun'

export const NOM_DECISION: Record<Decision['type'], string> = {
  avertissement: 'Avertissement',
  visibilite_reduite: 'Visibilité réduite',
  suspension: 'Suspension',
  exclusion: 'Exclusion',
  descente: 'Descente de palier',
}

/** « Suspension · niveau 3 », « Descente de palier vers Bronze ». */
export function useTitreDecision() {
  const { t, tf } = usePreferences()
  return (d: Decision) => (d.niveau ? tf('{type} · niveau {n}', { type: t(NOM_DECISION[d.type]), n: d.niveau }) : d.palierVise ? tf('Descente de palier vers {palier}', { palier: t(d.palierVise) }) : t(NOM_DECISION[d.type]))
}

function CarteEtat({ s, depuis }: { s: StatutCompte; depuis: string }) {
  const { t, tf, langue } = usePreferences()
  const titre = useTitreDecision()
  const d = s.enCours
  if (!d)
    return (
      <div className="card" style={{ border: '1.5px solid var(--green-line)', background: 'var(--green-soft)' }}>
        <div className="row">
          <Icone nom="shield-check" taille={24} style={{ color: 'var(--green)', flexShrink: '0' }} />
          <div className="grow">
            <div className="b8 t15 cg">{t('Aucune sanction, aucun avertissement')}</div>
            <div className="t13 c2 mt4">{t('Vous serez alerté avant chaque seuil.')}</div>
          </div>
        </div>
      </div>
    )
  const rouge = d.type === 'suspension' || d.type === 'exclusion'
  const ton = rouge ? 'red' : 'amber'
  return (
    <div className="card" style={{ border: `1.5px solid var(--${ton}-line)`, background: `var(--${ton}-soft)` }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <Icone nom={rouge ? 'shield-x' : 'shield-alert'} taille={24} style={{ color: `var(--${ton})`, flexShrink: '0' }} />
        <div className="grow">
          <div className={'b8 t15 ' + (rouge ? 'cr' : 'ca')}>{titre(d)}</div>
          <div className="t13 c2 mt4">{tf('Motif : « {motif} »', { motif: t(d.motif) })}</div>
          <div className="t13 c3 mt4">{tf('Décidée {quand}', { quand: dateEtHeure(d.decideeA, langue) })}</div>
          {s.finEffet && <div className="t13 c3 mt4">{tf(d.type === 'suspension' ? 'Jusqu’à la décision, au plus tard {quand}' : 'Jusqu’au {quand}', { quand: dateEtHeure(s.finEffet, langue) })}</div>}
          {d.type === 'avertissement' && <div className="t13 c2 mt8" style={{ lineHeight: '1.45' }}>{t('Pour remonter : préparez chaque commande avant son échéance et répondez aux litiges à temps.')}</div>}
          {d.type === 'visibilite_reduite' && <div className="t13 c2 mt8" style={{ lineHeight: '1.45' }}>{t('Vos offres passent après celles des autres vendeurs. Vos commandes en cours continuent.')}</div>}
        </div>
      </div>
      {d.type === 'suspension' && (
        <div className="mt12">
          <Bouton classe="secondary" icone="shield-alert" vers={chemin('suspendu')} style={{ height: '44px' }}>
            {t('Voir mon compte suspendu')}
          </Bouton>
        </div>
      )}
      {!d.contestation && d.type !== 'suspension' && (
        <div className="mt12">
          <Bouton classe="secondary" icone="gavel" vers={chemin('contester', { d: d.id, depuis })} style={{ height: '44px' }}>
            {t('Contester')}
          </Bouton>
        </div>
      )}
    </div>
  )
}

function Controle({ s }: { s: StatutCompte }) {
  const { t, tf } = usePreferences()
  const c = s.controle
  const frequence = c.sur === 1 ? t('Toutes vos commandes') : tf('1 commande sur {n}', { n: c.sur })
  const pourquoi =
    c.raison === 'premieres'
      ? tf('Vos {n} premières commandes sont toutes contrôlées. Vous en êtes à {r}.', { n: c.premieres, r: c.ramassees })
      : c.raison === 'renforce'
        ? tf('Votre score est sous {s}, ou a perdu {p} points en une semaine : toutes vos commandes sont contrôlées jusqu’à ce qu’il remonte.', { s: c.renforceSous, p: c.renforceBaisse })
        : c.raison === 'probatoire' && c.probatoire
          ? tf('Après une suspension, {n} commandes sont contrôlées : {c} déjà faites.', { n: c.probatoire.total, c: c.probatoire.controlees })
          : c.raison === 'sous_seuil'
            ? tf('Votre Trust Score est sous {s}. Vos {n} premières commandes ont toutes été contrôlées. Si votre score passe sous {r} ou perd {p} points en une semaine, toutes le sont de nouveau.', { s: c.seuilReduction ?? '', n: c.premieres, r: c.renforceSous, p: c.renforceBaisse })
            : tf('Votre Trust Score est au-dessus du seuil. Si votre score passe sous {r} ou perd {p} points en une semaine, toutes vos commandes sont de nouveau contrôlées.', { r: c.renforceSous, p: c.renforceBaisse })
  return (
    <div className="card">
      <h3>{t('Contrôle au ramassage')}</h3>
      <p className="t13 c3" style={{ margin: '6px 0 6px', lineHeight: '1.45' }}>
        {t('Le livreur ouvre et vérifie l’article devant vous.')}
      </p>
      <div className="kv">
        <span className="k">{t('Pour vous aujourd’hui')}</span>
        <span className="v ">
          <span className="cor">{frequence}</span>
        </span>
      </div>
      {c.seuilReduction !== null && c.surApres !== null && (
        <div className="kv">
          <span className="k">{c.raison === 'sous_seuil' ? tf('À partir de {s} de Trust Score', { s: c.seuilReduction }) : c.raison === 'premieres' ? tf('Après {n} commandes', { n: c.premieres }) : tf('Au-dessus de {s} de Trust Score', { s: c.seuilReduction })}</span>
          <span className="v ">{tf('1 sur {n}', { n: c.surApres })}</span>
        </div>
      )}
      <Plus plat icone="circle-help" titre={c.sur === 1 ? t('Pourquoi toutes ?') : tf('Pourquoi 1 sur {n} ?', { n: c.sur })}>
        <p>{pourquoi}</p>
        <p>{t('Le contrôle protège vos clients et vous : un article vérifié au ramassage ne peut pas être dit différent ensuite.')}</p>
      </Plus>
    </div>
  )
}

function Historique({ lecture, depuis }: { lecture: Lecture<Decision[]>; depuis: string }) {
  const { t, tf, langue } = usePreferences()
  const titre = useTitreDecision()
  return (
    <div className="card">
      <h3>{t('Historique des décisions')}</h3>
      {lecture.erreur ? (
        <>
          <p className="t13 c2 mt8" style={{ lineHeight: '1.45' }}>
            {t('Historique indisponible pour l’instant. Réessayez dans un moment.')}
          </p>
          <div className="mt8">
            <Bouton classe="secondary sm" icone="refresh-cw" onClick={lecture.relire} style={{ height: '44px' }}>
              {t('Réessayer')}
            </Bouton>
          </div>
        </>
      ) : lecture.donnees === null ? (
        <i className="vd10-skel cl13-skel" style={{ height: '64px' }}></i>
      ) : lecture.donnees.length === 0 ? (
        <div className="row mt10" style={{ alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0', background: 'var(--sand-2)', color: 'var(--ink-2)' }}>
            <Icone nom="file-clock" taille={20} />
          </span>
          <div className="grow">
            <div className="b8 t14">{t('Aucune décision pour l’instant.')}</div>
            <div className="t13 c3 mt4" style={{ lineHeight: '1.45' }}>
              {t('Chaque décision, votre contestation et la réponse restent ici, avec leur motif.')}
            </div>
          </div>
        </div>
      ) : (
        lecture.donnees.map((d) => (
          <div key={d.id} style={{ padding: '12px 0', borderTop: '1px solid var(--line)' }}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <span className={'ic ' + (d.niveau && d.niveau >= 3 ? 'red' : 'amber')} style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0', background: `var(--${d.niveau && d.niveau >= 3 ? 'red' : 'amber'}-soft)`, color: `var(--${d.niveau && d.niveau >= 3 ? 'red' : 'amber'})` }}>
                <Icone nom={d.type === 'descente' ? 'arrow-down-right' : 'shield-alert'} taille={18} />
              </span>
              <div className="grow">
                <div className="b8 t14">{titre(d)}</div>
                <div className="t12 c3 mt4">{dateEtHeure(d.decideeA, langue)}</div>
                <div className="t13 c2 mt4">{tf('Motif : « {motif} »', { motif: t(d.motif) })}</div>
                <div className="t12 c3 mt4">{d.valideePar ? tf('Validée par {qui}', { qui: t(d.valideePar) }) : t('Automatique (niveau 1)')}</div>
              </div>
            </div>
            {d.contestation ? (
              <div style={{ margin: '10px 0 0 48px', paddingLeft: '10px', borderLeft: '2px solid var(--line-2)' }}>
                <div className="t13 b7">{tf('Votre contestation · envoyée {quand}', { quand: dateEtHeure(d.contestation.envoyeeA, langue) })}</div>
                <div className="t13 c2 mt4" style={{ lineHeight: '1.45' }}>{`« ${d.contestation.texte} »`}</div>
                {d.contestation.reponse ? (
                  <div className={'t13 b8 mt6 ' + (d.contestation.reponse.issue === 'annulee' ? 'cg' : 'ca')}>{tf('Réponse : {issue} · « {motif} »', { issue: t(d.contestation.reponse.issue === 'annulee' ? 'annulée' : 'maintenue'), motif: t(d.contestation.reponse.motif) })}</div>
                ) : (
                  <div className="t13 c3 mt6">{tf('Réponse avant {quand}', { quand: dateEtHeure(d.contestation.reponseAvant, langue) })}</div>
                )}
              </div>
            ) : (
              <div className="mt8" style={{ marginLeft: '48px' }}>
                <Bouton classe="secondary sm" icone="gavel" vers={chemin('contester', { d: d.id, depuis })} style={{ height: '44px' }}>
                  {t('Contester')}
                </Bouton>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

function Contenu({ s, decisions }: { s: StatutCompte; decisions: Lecture<Decision[]> }) {
  const { t, tf } = usePreferences()
  const enLigne = useEnLigne()
  const { search } = useLocation()
  const depuis = 'sanctions' + search
  const r = s.regles
  const aContester = (decisions.donnees ?? []).some((d) => !d.contestation)
  return (
    <Ecran route="sanctions">
      <div className="pg">
        <h1 className="pg-t">{t('Sanctions et contrôle')}</h1>
      </div>
      {!enLigne && <HorsLigne />}
      <CarteEtat s={s} depuis={depuis} />
      <Controle s={s} />
      <div className="card">
        <h3>{t('Les quatre niveaux de sanction')}</h3>
        <div className="mt4">
          {[
            ['1', 'amber', 'Avertissement', t('Un message avec le motif et les gestes pour remonter')],
            ['2', 'or', 'Visibilité réduite', tf('Vos offres passent après celles des autres vendeurs, pendant {n} jours', { n: r.visibiliteJours })],
            ['3', 'red', 'Suspension', tf('Plus de nouvelles commandes ; score gelé sous {s}. Jusqu’à la décision, {n} jours au plus', { s: r.suspensionSous, n: r.suspensionMaxJours })],
            ['4', 'red', 'Exclusion', t('Pour fraude, contrefaçon ou faux document. Appareil, pièce d’identité et Mobile Money bloqués')],
          ].map(([n, ton, titre, texte]) => (
            <div key={n} className="li" style={{ minHeight: '0', padding: '12px 0' }}>
              <span className={'ic ' + ton} style={{ borderRadius: '50%' }}>
                <b className="t15">{n}</b>
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t(titre)}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {texte}
                </span>
              </span>
            </div>
          ))}
        </div>
        <Plus plat titre={t('Comment ça marche')}>
          <p>{t('Le niveau 1 est automatique. Les niveaux 2 à 4 sont proposés par le système, puis validés par un humain, avec un motif écrit.')}</p>
          <p>{tf('Une suspension est proposée sous {s} de Trust Score, ou après {n} commandes non préparées en {j} jours.', { s: r.suspensionSous, n: r.nonPreparations, j: r.nonPreparationsJours })}</p>
          <p>{tf('Vous pouvez contester une fois. Après une suspension, vous revenez par une période probatoire : {n} commandes contrôlées au ramassage.', { n: r.probatoireCommandes })}</p>
          <p>{t('Chaque sanction arrive en notification, avec son motif, sa date et le bouton « Contester ».')}</p>
        </Plus>
        <div className="mt12">
          {aContester ? (
            <Bouton classe="secondary" icone="gavel" vers={chemin('contester', { depuis })} style={{ height: '44px' }}>
              {t('Contester une décision')}
            </Bouton>
          ) : (
            <Bouton classe="secondary" icone="gavel" desactive raison={t('Aucune décision à contester.')} style={{ height: '44px' }}>
              {t('Contester une décision')}
            </Bouton>
          )}
          {!aContester && <p className="t12 c3 mt6">{t('Aucune décision à contester.')}</p>}
        </div>
      </div>
      <Historique lecture={decisions} depuis={depuis} />
    </Ecran>
  )
}

export default function Sanctions() {
  const { search } = useLocation()
  const statut = useLecture(() => source.trust.statut(), [search])
  const decisions = useLecture(() => source.trust.decisions(), [search])
  return <Attente route="sanctions" lecture={statut}>{(s) => <Contenu s={s} decisions={decisions} />}</Attente>
}
