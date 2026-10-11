// Litiges reçus (VD-07) : repris du prototype (route('litiges')), branché sur la source (domaine litiges).
// - Argent gelé en tête, en rouge, sans date de versement (LIT-01), total renvoyé par la source (somme des montants
//   gardés figés, src/calculs) ; la conséquence du silence écrite une fois (LIT-02, DP-35 : « BelivaY décide en
//   partant de ce que dit le client », jamais d'arbitrage automatique).
// - Filtres À répondre · En médiation · Clos avec leur nombre (VD07-R01) ; un seul bouton plein : « Répondre » du
//   plus urgent (LIT-04) ; « Comment ça marche » et « Éviter les litiges » fermés (LIT-05).
// - Ajouts : recherche (référence, article, motif), comptes à rebours vivants, rappels, liens vers la commande et
//   son journal, dossier en médiation ou clos (« Voir la décision »), tirer pour actualiser, hors connexion (liste
//   gardée avec l'heure de mise à jour, l'envoi d'une réponse attend le réseau).
// - Accès Préparation : aucun montant ; il ouvre le dossier pour y ajouter des preuves (DP-56 Q-17).
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTirerPourActualiser } from '@client/composants/Animations'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { EtatLitige, Litige } from '../../donnees/domaines/litiges'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { duree, echeance, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useDroit, useHorloge, useMontantsVisibles, useSession } from '../../session'
import { Bouton, Chargement, ErreurLecture, Frise, HorsLigne, Replier, Vide } from './commun'
import { LIEN_44, useEnLigne, useMiseAJour } from './outils'

const FILTRES: { id: EtatLitige; libelle: string }[] = [
  { id: 'a_repondre', libelle: 'À répondre ' },
  { id: 'en_mediation', libelle: 'En médiation ' },
  { id: 'clos', libelle: 'Clos ' },
]
const ISSUE: Record<Litige['issue'], string> = { attente: 'En médiation', gagne: 'Gagné', perdu: 'Perdu', accepte: 'Accepté · clos' }

function Carte({ l, plein, maintenant }: { l: Litige; plein: boolean; maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  const montants = useMontantsVisibles()
  const s = useSession()
  const peutPreuves = useDroit('litiges.preuves')
  const aRepondre = l.etat === 'a_repondre'
  const ton = aRepondre ? 'red' : l.issue === 'gagne' ? 'green' : l.issue === 'perdu' ? 'red' : 'ink'
  return (
    <div className={'card ord ' + ton}>
      <div className="otop">
        <span className="oref">{tf('LITIGE · {ref}', { ref: l.ref })}</span>
        {aRepondre ? (
          <span className="cd red">
            <Icone nom="hourglass" taille={14} />
            {tf('il reste {d}', { d: duree(l.echeance - maintenant, langue) })}
          </span>
        ) : (
          <span className={'pill sm ' + (l.issue === 'gagne' ? 'green' : l.issue === 'perdu' ? 'red' : 'ink')}>{t(ISSUE[l.issue])}</span>
        )}
      </div>
      <div className="art">
        <Vignette nom={l.article.dessin} taille={52} />
        <div className="grow">
          <div className="an" style={{ fontSize: '16px' }}>
            {t(l.article.titre)}
          </div>
          <div className="av" style={{ fontSize: '13px' }}>
            {tf('Le client dit : « {motif} »', { motif: t(l.motif) })}
          </div>
        </div>
      </div>
      <div className="mt8">
        <div>
          {aRepondre ? (
            <div className="kv">
              <span className="k">{t('Répondez avant')}</span>
              <span className="v ">{t(echeance(l.echeance, maintenant, langue))}</span>
            </div>
          ) : l.etat === 'en_mediation' ? (
            <div className="kv">
              <span className="k">{t('BelivaY décide avant')}</span>
              <span className="v ">{t(echeance(l.decisionAvant, maintenant, langue))}</span>
            </div>
          ) : null}
          {montants && l.gele !== null && l.etat !== 'clos' && (
            <div className="kv">
              <span className="k">{t('Gelé jusqu’à la décision')}</span>
              <span className="v ">
                <span className="cr">{t(`${F(l.gele)} F`)}</span>
              </span>
            </div>
          )}
          {l.reponse && (
            <div className="kv">
              <span className="k">{t('Votre réponse')}</span>
              <span className="v ">{t(l.reponse.posture === 'accepte' ? 'J’accepte' : l.reponse.posture === 'conteste' ? 'Je conteste' : 'Arrangement proposé')}</span>
            </div>
          )}
        </div>
      </div>
      <div className="mt8">
        {aRepondre ? (
          <Bouton classe={plein ? 'primary' : 'soft'} icone="scale" vers={chemin('litige', { ref: l.ref })}>
            {t(s.membre?.role !== 'preparation' ? 'Répondre' : peutPreuves ? 'Ajouter des preuves' : 'Voir le litige')}
          </Bouton>
        ) : (
          <Bouton classe="soft" icone="gavel" vers={chemin('litige_envoye', { ref: l.ref })}>
            {t(l.etat === 'clos' ? 'Voir la décision' : 'Voir où en est le litige')}
          </Bouton>
        )}
      </div>
      <div className="links" style={{ margin: '2px 0 -10px', alignItems: 'center', gap: '2px' }}>
        <Link to={chemin('commande', { ref: l.ref })} style={LIEN_44}>
          {t('Voir la commande')}
        </Link>
        <span aria-hidden="true" style={{ opacity: '.5' }}>
          {t('·')}
        </span>
        <Link to={chemin('journal', { ref: l.ref })} style={LIEN_44}>
          {t('Journal')}
        </Link>
      </div>
    </div>
  )
}

export default function Litiges() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const montants = useMontantsVisibles()
  const maintenant = useHorloge()
  const enLigne = useEnLigne()
  const [params, setParams] = useSearchParams()
  const [cherche, setCherche] = useState('')
  const regles = useLecture(() => source.litiges.regles(), [])
  const liste = useLecture(() => source.litiges.liste(), [s.membre?.role])
  const compteurs = useLecture(() => source.litiges.compteurs(), [s.membre?.role])
  useTirerPourActualiser(() => {
    liste.relire()
    compteurs.relire()
  })
  const misAJour = useMiseAJour(liste.donnees, maintenant)
  const filtre = (FILTRES.find((f) => f.id === params.get('f'))?.id ?? 'a_repondre') as EtatLitige
  const choisir = (f: EtatLitige) => setParams((p) => (f === 'a_repondre' ? p.delete('f') : p.set('f', f), p), { replace: true })
  const r = regles.donnees
  const c = compteurs.donnees
  const erreur = liste.erreur ?? compteurs.erreur ?? regles.erreur
  if (erreur && !liste.donnees)
    return (
      <Ecran route="litiges">
        <ErreurLecture
          erreur={erreur}
          relire={() => {
            liste.relire()
            compteurs.relire()
            regles.relire()
          }}
        />
      </Ecran>
    )
  const q = cherche.trim().toLowerCase()
  const tous = liste.donnees ?? []
  const vus = tous.filter((l) => l.etat === filtre).filter((l) => !q || [l.ref, l.article.titre, l.motif, t(l.motif)].some((x) => x.toLowerCase().includes(q)))
  const plusUrgent = tous.find((l) => l.etat === 'a_repondre')?.ref
  const enCours = (c?.a_repondre ?? 0) + (c?.en_mediation ?? 0)
  return (
    <Ecran route="litiges">
      <div className="pg">
        <h1 className="pg-t">{t('Litiges reçus')}</h1>
        <p className="pg-s">{t('Un client signale un problème. Vous répondez, puis un médiateur BelivaY neutre décide.')}</p>
      </div>
      {!enLigne && <HorsLigne texte="Hors connexion : la liste gardée sur ce téléphone" sous={misAJour ? tf('Mise à jour à {h}. « Répondre » s’ouvre ; l’envoi attend le réseau.', { h: heure(misAJour, langue) }) : undefined} />}
      {!c || !r || !liste.donnees ? (
        <Chargement />
      ) : (
        <>
          {montants && c.gele !== null ? (
            <div className="hero night">
              <div className="otop">
                <span className="hk">{t('Argent gelé')}</span>
                <span className="pill dk sm">{tf(enCours > 1 ? '{n} litiges' : '{n} litige', { n: enCours })}</span>
              </div>
              <div className="big" style={{ color: '#FF9C8F' }}>
                {t(F(c.gele))}
                <small style={{ color: '#fff' }}>{t('FCFA')}</small>
              </div>
              <div className="hs">
                {t('Sans date de versement pendant les litiges.')}
                <br />
                {tf('Gagné : libéré après le délai de recours du client ({h} h).', { h: r.recoursH })}
              </div>
              <div className="hline"></div>
              <Silence h={r.reponseH} />
            </div>
          ) : (
            <div className="card" style={{ background: 'var(--sand-2)' }}>
              <Silence h={r.reponseH} clair />
            </div>
          )}
          <div className="chips" role="tablist" aria-label={t('Filtrer les litiges')}>
            {FILTRES.map((f) => (
              <button key={f.id} type="button" role="tab" aria-selected={filtre === f.id} className={'chip' + (filtre === f.id ? ' on' : '')} onClick={() => choisir(f.id)}>
                {t(f.libelle)}
                <span className="n">{t(String(c[f.id]))}</span>
              </button>
            ))}
          </div>
          {tous.length > 1 && (
            <div className="inp mt12" style={{ height: '44px' }}>
              <Icone nom="search" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
              <input
                type="search"
                value={cherche}
                onChange={(e) => setCherche(e.target.value)}
                placeholder={t('Référence, article ou motif')}
                aria-label={t('Chercher un litige')}
                style={{ flex: '1', minWidth: '0', border: '0', background: 'transparent', font: 'inherit', color: 'inherit', outline: 'none' }}
              />
            </div>
          )}
          {vus.map((l) => (
            <Carte key={l.ref} l={l} plein={l.ref === plusUrgent} maintenant={maintenant} />
          ))}
          {vus.length === 0 &&
            (q ? (
              <Vide icone="search" titre="Aucun litige ne correspond" texte="Essayez la référence (BLV-…) ou le nom de l’article." action={<Bouton classe="secondary" onClick={() => setCherche('')}>{t('Effacer la recherche')}</Bouton>} />
            ) : filtre === 'a_repondre' ? (
              <Vide
                icone="scale"
                titre="Aucun litige à répondre"
                texte="Gagner un litige libère la somme, versée le vendredi suivant."
                action={
                  <Bouton classe="secondary" icone="shopping-bag" vers={chemin('commandes')}>
                    {t('Voir mes commandes')}
                  </Bouton>
                }
              />
            ) : (
              <Vide
                icone="list-checks"
                titre="Aucun litige ici"
                action={
                  <Bouton classe="secondary" icone="scale" onClick={() => choisir('a_repondre')}>
                    {t('Voir les litiges à répondre')}
                  </Bouton>
                }
              />
            ))}
          <Replier icone="info" titre={t('Comment ça marche')}>
            <div style={{ margin: '0 0 14px' }}>
              <Frise courante={1} />
            </div>
            <p>
              <b>{t('Délai.')}</b>
              {tf(' Vous avez {h} h pour répondre. Sans réponse, BelivaY décide en partant de ce que dit le client.', { h: r.reponseH })}
            </p>
            <p>
              <b>{t('Médiation.')}</b>
              {tf(' Une personne de la médiation BelivaY décide au plus tard {d} h après votre échéance, avec un motif écrit. Jamais de décision automatique.', { d: r.decisionH })}
            </p>
            <p>
              <b>{t('Contestation.')}</b>
              {tf(' Chacun peut contester une fois, sous {h} h après la décision : une autre personne réexamine le dossier. L’argent reste gelé jusqu’à sa réponse.', { h: r.recoursH })}
            </p>
            <p>
              <b>{t('Trust Score.')}</b>
              {t(' Un litige en cours n’a aucun effet ; seul un litige perdu compte.')}
            </p>
            <p>
              <b>{t('Preuves.')}</b>
              {t(' Les photos du contrôle au ramassage et de la remise sont déjà au dossier. Une capture WhatsApp n’est pas une preuve.')}
            </p>
            <p>
              <b>{t('Votre argent.')}</b>
              {montants
                ? tf(' Gagné : libéré après le délai de recours, versé le vendredi suivant. Perdu : le client est remboursé ; vous payez seulement le trajet retour ({t} F) et la livraison.', { t: F(r.trajet) })
                : t(' Gagné : la vente vous reste. Perdu : le client est remboursé.')}
            </p>
            {montants && (
              <p>
                <b>{t('Petit montant.')}</b>
                {tf(' Jusqu’à {s} F ({e} F pour un client très fiable), BelivaY rembourse lui-même : vous êtes payé, votre score ne bouge pas.', { s: F(r.seuilStandard), e: F(r.seuilEleve) })}
              </p>
            )}
            <p>
              <b>{t('Rappels.')}</b>
              {t(' Un SMS et une notification vous préviennent 24 h et 6 h avant l’échéance.')}
            </p>
          </Replier>
          <Replier icone="lightbulb" titre={t('Éviter les litiges')}>
            <p>{t('Décrivez l’article exactement : modèle, capacité, couleur, état.')}</p>
            <p>{t('Au ramassage, montrez au livreur le modèle et la capacité : ses photos vous protègent.')}</p>
            <p>{t('Répondez aux questions du client dans la messagerie BelivaY.')}</p>
          </Replier>
          {!montants && s.proprietaire && (
            <div className="hint-l">
              <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{tf('Les montants et la réponse aux litiges sont réservés à {nom}, propriétaire. Vous pouvez ajouter des preuves.', { nom: `${s.proprietaire.prenom} ${s.proprietaire.nom}` })}</span>
            </div>
          )}
        </>
      )}
    </Ecran>
  )
}

function Silence({ h, clair }: { h: number; clair?: boolean }) {
  const { t, tf } = usePreferences()
  return (
    <div className="row" style={{ alignItems: 'flex-start', gap: '10px' }}>
      <Icone nom="clock" taille={18} style={{ color: clair ? 'var(--or-txt)' : 'var(--gold-l)', flexShrink: '0', marginTop: '2px' }} />
      <div className="t14" style={{ lineHeight: '1.45' }}>
        <b>{tf('Vous avez {h} h pour répondre.', { h })}</b>
        {t(' Sans réponse, BelivaY décide en partant de ce que dit le client.')}
      </div>
    </div>
  )
}
