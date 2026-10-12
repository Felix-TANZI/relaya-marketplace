// Retours en cours (VD-07) : repris du prototype (route('retours')), branché sur la source (domaine retours).
// - La phrase qui distingue le retour du litige ; filtres À décider · En route · Clos avec leur nombre (VD07-R22) ;
//   une carte par retour : référence et état, article, motif et phrase du client, trois lignes (arrivée, inspectez
//   avant, gelé jusqu'à l'inspection) ; le reste replié dans « Voir le détail » (RET-07).
// - Bouton selon l'état : « Préparer l'inspection » (en route) · « Inspecter maintenant » avec le compte à rebours
//   de 48 h (reçu) · « Remplacer ou rembourser » (défaut confirmé) · « Le remplacement est prêt » (à expédier sous
//   72 h ouvrées) ; non conforme : BelivaY décide (DP-57 L-4) ; retard : remboursé automatiquement (VD07-R25, R31).
// - « Comment ça marche » : les sept règles (paramètres du registre), puis le colis non retiré, en ton neutre.
// - Ajouts : « J'ai reçu le retour » (l'heure réelle de la remise lance les 48 h, Q-72), historique du retour,
//   liens vers la commande et son journal, tirer pour actualiser, hors connexion (liste gardée avec l'heure).
// - Accès Préparation : aucun montant ; il reçoit et inspecte ; le choix remplacer ou rembourser revient au propriétaire.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTirerPourActualiser } from '@client/composants/Animations'
import { jouer } from '@client/composants/Sons'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { ReglesLitiges } from '../../donnees/domaines/litiges'
import type { EtatRetour, Retour } from '../../donnees/domaines/retours'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { duree, echeance, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles, useSession } from '../../session'
import { Bouton, Chargement, ErreurLecture, Fil, HorsLigne, Replier, Vide } from './commun'
import { arriveeEnMots, LIEN_44, dateCourte, useEnLigne, useMiseAJour } from './outils'
import { lignesDuRetour } from './fil'

const FILTRES: { id: EtatRetour; libelle: string }[] = [
  { id: 'a_decider', libelle: 'À décider ' },
  { id: 'en_route', libelle: 'En route ' },
  { id: 'clos', libelle: 'Clos ' },
]

/** Pastille d'état d'une carte de retour. */
function pastille(r: Retour): { ton: string; icone: string; texte: string } {
  switch (r.suite.type) {
    case 'en_route':
      return { ton: 'amber', icone: 'truck', texte: 'En route' }
    case 'a_inspecter':
      return { ton: 'red', icone: 'search', texte: 'À inspecter' }
    case 'a_choisir':
      return { ton: 'or', icone: 'repeat', texte: 'À choisir' }
    case 'mediation':
      return { ton: 'ink', icone: 'scale', texte: 'En médiation' }
    case 'remplacement':
      return r.suite.pretA ? { ton: 'green', icone: 'package-check', texte: 'Remplacement prêt' } : { ton: 'amber', icone: 'package', texte: 'À expédier' }
    case 'rembourse':
      return { ton: 'green', icone: 'circle-check', texte: r.suite.auto ? 'Remboursé automatiquement' : 'Remboursé' }
  }
}

function Carte({ r, regles, maintenant, enLigne }: { r: Retour; regles: ReglesLitiges; maintenant: number; enLigne: boolean }) {
  const { t, tf, langue } = usePreferences()
  const montants = useMontantsVisibles()
  const s = useSession()
  const [refus, setRefus] = useState<string | null>(null)
  const p = pastille(r)
  const suite = r.suite
  const recevoir = async () => {
    const res = await source.retours.recevoir(r.ref)
    if (res.ok) jouer('retrait')
    else setRefus('Ce retour est déjà reçu.')
  }
  const pret = async () => {
    const res = await source.retours.remplacementPret(r.ref)
    if (res.ok) jouer('retrait')
  }
  return (
    <div className={'card ord ' + (suite.type === 'a_inspecter' ? 'red' : suite.type === 'rembourse' || (suite.type === 'remplacement' && suite.pretA) ? 'green' : 'ink')}>
      <div className="otop">
        <span className="oref">{tf('RETOUR · {ref}', { ref: r.ref })}</span>
        <span className={'pill sm ' + p.ton}>
          <Icone nom={p.icone} taille={13} />
          {t(p.texte)}
        </span>
      </div>
      <div className="art">
        <Vignette nom={r.article.dessin} taille={52} />
        <div className="grow">
          <div className="an" style={{ fontSize: '16px' }}>
            {`${t(r.article.titre)} · ${t(r.article.variante)}`}
          </div>
          <div className="av" style={{ fontSize: '13px' }}>
            {tf('Motif : {motif} · « {phrase} »', { motif: t(r.motif), phrase: t(r.phraseClient) })}
          </div>
        </div>
      </div>
      <div className="mt8">
        <div>
          {suite.type === 'en_route' ? (
            <div className="kv">
              <span className="k">{t('Arrive chez vous')}</span>
              <span className="v ">{t(arriveeEnMots(r, maintenant, langue))}</span>
            </div>
          ) : (
            r.recuA !== null && (
              <div className="kv">
                <span className="k">{t('Reçu')}</span>
                <span className="v ">{t(dateCourte(r.recuA, langue))}</span>
              </div>
            )
          )}
          {(suite.type === 'en_route' || suite.type === 'a_inspecter') && r.inspecterAvant && (
            <div className="kv">
              <span className="k">{t('Inspectez avant')}</span>
              <span className="v ">{t(echeance(r.inspecterAvant, maintenant, langue))}</span>
            </div>
          )}
          {suite.type === 'mediation' && (
            <div className="kv">
              <span className="k">{t('BelivaY décide avant')}</span>
              <span className="v ">{t(echeance(suite.decisionAvant, maintenant, langue))}</span>
            </div>
          )}
          {suite.type === 'remplacement' && !suite.pretA && (
            <div className="kv">
              <span className="k">{t('Expédiez avant')}</span>
              <span className="v ">{t(echeance(suite.expedierAvant, maintenant, langue))}</span>
            </div>
          )}
          {suite.type === 'rembourse' && (
            <div className="kv">
              <span className="k">{t(suite.auto ? 'Remboursé automatiquement le' : 'Client remboursé le')}</span>
              <span className="v ">{t(dateCourte(suite.le, langue))}</span>
            </div>
          )}
          {montants && r.gele !== null && (
            <div className="kv">
              <span className="k">{t(suite.type === 'remplacement' ? 'Gelé jusqu’à la remise du remplacement' : 'Gelé jusqu’à l’inspection')}</span>
              <span className="v ">
                <span className="cr b8">{t(`${F(r.gele)} F`)}</span>
              </span>
            </div>
          )}
        </div>
      </div>
      <Replier icone="info" titre={t('Voir le détail')} plat>
        <div>
          <div className="kv">
            <span className="k">{t('Retirée par le client')}</span>
            <span className="v ">{t(dateCourte(r.retireA, langue))}</span>
          </div>
          <div className="kv">
            <span className="k">{t(r.categorie === 'defaut_cache' ? 'Défaut signalé' : 'Retour signalé')}</span>
            <span className="v ">{t(dateCourte(r.signaleA, langue))}</span>
          </div>
          {r.categorie === 'defaut_cache' && (
            <div className="kv">
              <span className="k">{t('Délai')}</span>
              <span className="v ">{tf(r.signalement.recevable ? '{h} h après le retrait : recevable' : '{h} h après le retrait : hors délai', { h: r.signalement.heures })}</span>
            </div>
          )}
          <div className="kv">
            <span className="k">{t('Trajet retour')}</span>
            <span className="v ">{t(r.volumineux ? 'Ramassage chez le client (volumineux)' : 'Dépôt au relais')}</span>
          </div>
        </div>
        {r.categorie === 'defaut_cache' && (
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('Un défaut caché se signale dans les {h} h après le retrait.', { h: regles.defautH })}</span>
          </div>
        )}
        <div className="mt8">
          <Fil lignes={lignesDuRetour(r, maintenant, t, tf, langue)} />
        </div>
        <div className="links" style={{ alignItems: 'center', gap: '2px' }}>
          <Link to={chemin('commande', { ref: r.ref })} style={LIEN_44}>
            {t('Voir la commande')}
          </Link>
          <span aria-hidden="true" style={{ opacity: '.5' }}>
            {t('·')}
          </span>
          <Link to={chemin('journal', { ref: r.ref })} style={LIEN_44}>
            {t('Journal')}
          </Link>
        </div>
      </Replier>
      {refus && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{t(refus)}</div>
        </div>
      )}
      {suite.type === 'en_route' && (
        <>
          <div className="mt8">
            <Bouton classe="primary" icone="search" vers={chemin('inspection', { ref: r.ref })}>
              {t('Préparer l’inspection')}
            </Bouton>
          </div>
          <div className="mt8">
            <Bouton classe="secondary" icone="package-check" desactive={!enLigne} onClick={() => void recevoir()}>
              {t('J’ai reçu le retour')}
            </Bouton>
          </div>
        </>
      )}
      {suite.type === 'a_inspecter' && r.inspecterAvant && (
        <div className="mt8">
          <Bouton classe="primary" icone="search" vers={chemin('inspection', { ref: r.ref })}>
            {tf('Inspecter maintenant · {d}', { d: duree(r.inspecterAvant - maintenant, langue) })}
          </Bouton>
        </div>
      )}
      {suite.type === 'a_choisir' && (
        <div className="mt8">
          <Bouton classe="primary" icone="repeat" vers={chemin('remplacement', { ref: r.ref })}>
            {t(s.membre?.role === 'preparation' ? 'Voir le choix du propriétaire' : 'Remplacer ou rembourser')}
          </Bouton>
        </div>
      )}
      {suite.type === 'remplacement' && !suite.pretA && (
        <>
          <p className="t13 c2" style={{ margin: '10px 0 0', lineHeight: '1.45' }}>
            {t('Préparez l’article neuf : le livreur le ramasse chez vous, à votre créneau habituel. Passé le délai, le client est remboursé automatiquement.')}
          </p>
          <div className="mt8">
            <Bouton classe="primary" icone="package-check" onClick={() => void pret()}>
              {t('Le remplacement est prêt')}
            </Bouton>
          </div>
        </>
      )}
      {suite.type === 'mediation' && (
        <p className="t13 c2" style={{ margin: '10px 0 0', lineHeight: '1.45' }}>
          {t('Vos photos sont en médiation. Si vous avez raison, le client paie le trajet retour et vous êtes payé.')}
        </p>
      )}
    </div>
  )
}

export default function Retours() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const montants = useMontantsVisibles()
  const maintenant = useHorloge()
  const enLigne = useEnLigne()
  const [params, setParams] = useSearchParams()
  const liste = useLecture(() => source.retours.liste(), [s.membre?.role])
  const compteurs = useLecture(() => source.retours.compteurs(), [])
  const regles = useLecture(() => source.litiges.regles(), [])
  useTirerPourActualiser(() => {
    liste.relire()
    compteurs.relire()
  })
  const misAJour = useMiseAJour(liste.donnees, maintenant)
  const c = compteurs.donnees
  const r = regles.donnees
  const erreur = liste.erreur ?? compteurs.erreur ?? regles.erreur
  if (erreur && !liste.donnees)
    return (
      <Ecran route="retours">
        <ErreurLecture relire={() => (liste.relire(), compteurs.relire(), regles.relire())} />
      </Ecran>
    )
  // Filtre : celui de l'adresse, sinon le premier qui contient un retour (À décider, puis En route, puis Clos).
  const demande = FILTRES.find((f) => f.id === params.get('f'))?.id
  const filtre: EtatRetour = demande ?? (c ? (FILTRES.find((f) => c[f.id] > 0)?.id ?? 'a_decider') : 'a_decider')
  const choisir = (f: EtatRetour) => setParams((p) => (p.set('f', f), p), { replace: true })
  const tous = liste.donnees ?? []
  const vus = tous.filter((x) => x.etat === filtre)
  const autre = c ? FILTRES.find((f) => f.id !== filtre && c[f.id] > 0) : undefined
  return (
    <Ecran route="retours">
      <div className="pg">
        <h1 className="pg-t">{t('Retours en cours')}</h1>
        <p className="pg-s">{t('Un retour n’est pas un litige : le client renvoie l’article pour un motif précis. Vous l’inspectez à réception.')}</p>
      </div>
      {!enLigne && <HorsLigne texte="Hors connexion : la liste gardée sur ce téléphone" sous={misAJour ? tf('Mise à jour à {h}. L’inspection s’ouvre ; l’envoi attend le réseau.', { h: heure(misAJour, langue) }) : undefined} />}
      {!c || !r || !liste.donnees ? (
        <Chargement />
      ) : (
        <>
          <div className="seg" role="tablist" aria-label={t('Filtrer les retours')}>
            {FILTRES.map((f) => (
              <a
                key={f.id}
                role="tab"
                tabIndex={0}
                aria-selected={filtre === f.id}
                className={filtre === f.id ? 'on' : ''}
                onClick={() => choisir(f.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), choisir(f.id))}
                style={{ cursor: 'pointer' }}
              >
                {t(f.libelle)}
                <span className="n">{t(String(c[f.id]))}</span>
              </a>
            ))}
          </div>
          {vus.map((x) => (
            <Carte key={x.ref} r={x} regles={r} maintenant={maintenant} enLigne={enLigne} />
          ))}
          {vus.length === 0 &&
            (tous.length === 0 ? (
              <Vide
                icone="undo-2"
                titre="Aucun retour en cours"
                texte="Un retour arrive avec un motif précis : vous l’inspectez à réception."
                action={
                  <Bouton classe="secondary" icone="shopping-bag" vers={chemin('commandes')}>
                    {t('Voir mes commandes')}
                  </Bouton>
                }
              />
            ) : (
              <Vide
                icone="list-checks"
                titre="Aucun retour ici"
                action={
                  autre && (
                    <Bouton classe="secondary" icone="undo-2" onClick={() => choisir(autre.id)}>
                      {tf('Voir « {f} »', { f: t(autre.libelle.trim()) })}
                    </Bouton>
                  )
                }
              />
            ))}
          <Replier icone="info" titre={t('Comment ça marche')}>
            <div>
              {[
                ['list-checks', 'Jamais de retour sans motif', 'Non conforme, abîmé, contrefaçon, défaut caché.'],
                ['calendar-clock', tf('{j} jours après le retrait', { j: r.fenetreJ }), tf('Fermé plus tôt si le client confirme « Tout est en ordre ». Défaut caché : {h} h, même après confirmation.', { h: r.defautH })],
                ['search', 'Remboursé à l’inspection, jamais à la demande', tf('Vous avez {h} h après réception ; au-delà, le remboursement part seul.', { h: r.inspectionH })],
                ['truck', montants ? tf('Trajet retour : {t} F à la partie en tort', { t: F(r.trajet) }) : 'Trajet retour : à la partie en tort', 'Vous si le défaut est confirmé (avec la livraison du colis), le transporteur si c’est abîmé en route, le client s’il a tort.'],
                ['repeat', tf('Remplacement sous {h} h ouvrées', { h: r.remplacementH }), 'Dimanche non compté. Sinon, remboursement automatique.'],
                ['shield-alert', tf('Vice caché : jusqu’à {j} jours', { j: r.viceJ }), 'Un défaut grave découvert plus tard. Perdu après la libération : la somme est reprise, avec une ligne datée dans Mes gains.'],
                ['store', 'Dépôt au relais par défaut', 'Ramassage chez le client pour les volumineux. Aucun frais de stockage sur un colis en retour.'],
              ].map(([icone, titre, sous]) => (
                <div key={icone} className="li">
                  <span className="ic or">
                    <Icone nom={icone} taille={20} />
                  </span>
                  <span className="grow">
                    <span className="lt" style={{ display: 'block' }}>
                      {t(titre)}
                    </span>
                    <span className="ls" style={{ display: 'block' }}>
                      {t(sous)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <p style={{ margin: '12px 0 0', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
              <b>{t('Colis non retiré :')}</b>
              {t(' le relais le garde 7 jours, puis il vous revient sans frais et sans effet sur votre Trust Score. Remettez-le en stock à l’arrivée.')}
            </p>
          </Replier>
          {!montants && s.proprietaire && (
            <div className="hint-l">
              <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{tf('Les montants et le choix remplacer ou rembourser sont réservés à {nom}, propriétaire. Vous pouvez recevoir et inspecter.', { nom: `${s.proprietaire.prenom} ${s.proprietaire.nom}` })}</span>
            </div>
          )}
        </>
      )}
    </Ecran>
  )
}
