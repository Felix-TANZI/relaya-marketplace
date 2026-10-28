// Remplacer ou rembourser (VD-07, route « remplacement?ref=…&c=rembourser ») : repris du prototype, branché sur la
// source (domaines retours et litiges pour les délais).
// - « Retour BLV-… · défaut confirmé » ; deux choix ; remplacement : article neuf et son stock réel, expédition sous
//   72 h ouvrées (dimanche non compté), ramassage chez vous, passé ce délai remboursement automatique, « Vous
//   gardez » et le gel jusqu'à la remise (VD07-R29, R30) ; « Dans les deux cas, défaut confirmé » : trajet retour
//   et livraison à votre charge (Q-27), Trust Score « Échec grave sur la Qualité » (RMP-03).
// - Plus de stock : « Proposer un remplacement » grisé avec « Plus en stock », seul « Rembourser le client » reste
//   (VD07-R31), avec un lien pour réapprovisionner ; le choix « Être remplacé » du client vaut accord (DP-56 Q-30).
// - Gestes réels : le choix part à la source (une unité du stock réservée pour un remplacement), puis « Retours ».
// - Accès Préparation : ni montant ni choix (argent) : le choix revient au propriétaire.
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { RefusChoix, Retour } from '../../donnees/domaines/retours'
import type { ReglesLitiges } from '../../donnees/domaines/litiges'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles, useSession } from '../../session'
import { Bouton, Chargement, ErreurLecture, HorsLigne, Vide } from './commun'
import { LIEN_44, dateCourte, useEnLigne } from './outils'

const REFUS: Record<RefusChoix, string> = {
  stock: 'Plus en stock : remboursez le client, ou réapprovisionnez d’abord.',
  pas_conforme: 'Inspectez d’abord le retour : le choix suit un défaut confirmé.',
  deja_choisi: 'Le choix est déjà fait pour ce retour.',
  reserve_proprietaire: 'Le choix revient au propriétaire de la boutique.',
  introuvable: 'Ce retour n’est plus en cours.',
}

export default function Remplacement() {
  const { t } = usePreferences()
  const s = useSession()
  const [params] = useSearchParams()
  const liste = useLecture(() => source.retours.liste(), [s.membre?.role])
  const ref = params.get('ref') ?? liste.donnees?.find((r) => r.suite.type === 'a_choisir')?.ref ?? liste.donnees?.[0]?.ref ?? null
  const lecture = useLecture(() => (ref ? source.retours.detail(ref) : Promise.resolve(null)).then((r) => ({ ref, r })), [ref, s.membre?.role])
  const regles = useLecture(() => source.litiges.regles(), [])
  if (lecture.erreur || regles.erreur || liste.erreur)
    return (
      <Ecran route="remplacement">
        <ErreurLecture relire={() => (lecture.relire(), regles.relire(), liste.relire())} />
      </Ecran>
    )
  if (!regles.donnees || !lecture.donnees || lecture.donnees.ref !== ref || (!params.get('ref') && !liste.donnees))
    return (
      <Ecran route="remplacement">
        <Chargement />
      </Ecran>
    )
  const r = lecture.donnees.r
  return (
    <Ecran route="remplacement" retour={r ? chemin('inspection', { ref: r.ref }) : undefined}>
      {r ? (
        <Corps r={r} regles={regles.donnees} />
      ) : (
        <Vide icone="undo-2" titre="Aucun retour à traiter" action={<Bouton classe="primary" icone="arrow-left" vers={chemin('retours')}>{t('Voir les retours')}</Bouton>} />
      )}
    </Ecran>
  )
}

function Corps({ r, regles }: { r: Retour; regles: ReglesLitiges }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const montants = useMontantsVisibles()
  const maintenant = useHorloge()
  const enLigne = useEnLigne()
  const naviguer = useNavigate()
  const [params, setParams] = useSearchParams()
  const [refus, setRefus] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const sansStock = r.remplacement.stock < 1
  const choix: 'remplacer' | 'rembourser' = params.get('c') === 'rembourser' || sansStock ? 'rembourser' : 'remplacer'
  const choisir = (c: 'remplacer' | 'rembourser') => setParams((p) => (p.set('ref', r.ref), c === 'rembourser' ? p.set('c', 'rembourser') : p.delete('c'), p), { replace: true })
  const proprio = s.membre?.role !== 'preparation'
  const suite = r.suite
  const envoyer = async () => {
    setEnvoi(true)
    setRefus(null)
    const res = await source.retours.proposer(r.ref, choix)
    setEnvoi(false)
    if (res.ok) {
      jouer('valide')
      naviguer(chemin('retours', { f: choix === 'remplacer' ? 'a_decider' : 'clos' }))
    } else {
      jouer('erreur')
      setRefus(REFUS[res.raison])
    }
  }
  const entete = (
    <div className="pg">
      <h1 className="pg-t">{t('Remplacer ou rembourser')}</h1>
      <p className="pg-s">{tf('Retour {ref} · défaut confirmé. Choisissez ce que vous proposez au client.', { ref: r.ref })}</p>
    </div>
  )
  // Pas (ou plus) à choisir : où en est le retour.
  if (suite.type !== 'a_choisir')
    return (
      <>
        {entete}
        <div className="note ink" role="status">
          <Icone nom="info" taille={18} />
          <div>
            {suite.type === 'remplacement'
              ? suite.pretA
                ? t('Remplacement prêt : le livreur le ramasse à votre créneau habituel.')
                : tf('Remplacement proposé : expédiez-le avant {d}.', { d: echeance(suite.expedierAvant, maintenant, langue) })
              : suite.type === 'rembourse'
                ? tf(suite.auto ? 'Client remboursé automatiquement le {d}.' : 'Client remboursé le {d}.', { d: dateCourte(suite.le, langue) })
                : suite.type === 'mediation'
                  ? tf('Non conforme : vos photos sont en médiation, BelivaY décide avant {d}.', { d: echeance(suite.decisionAvant, maintenant, langue) })
                  : t('Inspectez d’abord le retour : le choix suit un défaut confirmé.')}
          </div>
        </div>
        <div className="mt16">
          {suite.type === 'a_inspecter' || suite.type === 'en_route' ? (
            <Bouton classe="primary" icone="search" vers={chemin('inspection', { ref: r.ref })}>
              {t('Inspecter le retour')}
            </Bouton>
          ) : (
            <Bouton classe="primary" icone="arrow-left" vers={chemin('retours')}>
              {t('Voir les retours')}
            </Bouton>
          )}
        </div>
      </>
    )
  if (!proprio)
    return (
      <>
        {entete}
        <div className="note ink">
          <Icone nom="lock" taille={18} />
          <div>{tf('Le défaut est confirmé. Le choix remplacer ou rembourser revient à {nom}, propriétaire.', { nom: s.proprietaire ? `${s.proprietaire.prenom} ${s.proprietaire.nom}` : t('le propriétaire') })}</div>
        </div>
        <div className="mt16">
          <Bouton classe="primary" icone="arrow-left" vers={chemin('retours')}>
            {t('Voir les retours')}
          </Bouton>
        </div>
      </>
    )
  const radio = (c: 'remplacer' | 'rembourser', titre: string, sous: string, off = false) => (
    <button type="button" role="radio" aria-checked={choix === c} aria-disabled={off || undefined} className={'radio' + (choix === c ? ' on' : '') + (off ? ' off' : '')} onClick={() => !off && choisir(c)} style={{ width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit', ...(off ? { opacity: '.55', cursor: 'not-allowed' } : {}) }}>
      <span className="rd"></span>
      <span className="grow">
        <span className="rt" style={{ display: 'block' }}>
          {t(titre)}
        </span>
        <span className="rs" style={{ display: 'block' }}>
          {sous}
        </span>
      </span>
    </button>
  )
  return (
    <>
      {entete}
      <div role="radiogroup" aria-label={t('Ce que vous proposez au client')}>
        {radio('remplacer', 'Proposer un remplacement', sansStock ? t('Plus en stock') : tf('Le client reçoit un {titre} {variante} neuf, s’il accepte.', { titre: t(r.remplacement.titre), variante: t(r.remplacement.variante) }), sansStock)}
        {radio('rembourser', 'Rembourser le client', t('Vous ne gardez rien sur cette vente. L’article défectueux vous reste.'))}
      </div>
      {sansStock && (
        <div className="hint-l">
          <Icone nom="package-x" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>
            {t('Plus en stock : seul le remboursement reste possible. ')}
            <Link to={chemin('offre_detail', { p: r.remplacement.offreId })}>{t('Réapprovisionner')}</Link>
          </span>
        </div>
      )}
      {choix === 'remplacer' && (
        <div className="card">
          <div className="art" style={{ marginTop: '0' }}>
            <Vignette nom={r.remplacement.dessin} taille={52} />
            <div className="grow">
              <div className="an" style={{ fontSize: '16px' }}>
                {`${t(r.remplacement.titre)} · ${t(r.remplacement.variante)} · ${t('neuf')}`}
              </div>
              <div className="mt6">
                <span className="pill green sm">{tf('En stock : {n}', { n: r.remplacement.stock })}</span>
              </div>
            </div>
          </div>
          <div className="hr"></div>
          <div>
            <div className="kv">
              <span className="k">{t('Expédition')}</span>
              <span className="v ">{tf('Sous {h} h ouvrées après l’accord', { h: regles.remplacementH })}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Ramassage')}</span>
              <span className="v ">{t('Chez vous, au créneau du livreur')}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Passé ce délai')}</span>
              <span className="v ">{t('Remboursement automatique')}</span>
            </div>
          </div>
          {montants && r.couts && (
            <>
              <div className="keep">
                <span className="kl">{t('Vous gardez')}</span>
                <span className="kv2">{t(`${F(r.couts.garde)} F`)}</span>
              </div>
              <div className="hint">{t('Gelés jusqu’à la remise du remplacement, puis libérés et versés le vendredi, comme d’habitude.')}</div>
            </>
          )}
        </div>
      )}
      <div className="card">
        <div className="kick">{t('Dans les deux cas, défaut confirmé')}</div>
        <div className="mt4">
          <div>
            <div className="kv">
              <span className="k">{t('Trajet retour')}</span>
              <span className="v ">{montants && r.couts ? tf('{t} F à votre charge', { t: F(r.couts.trajet) }) : t('À votre charge')}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Livraison du colis')}</span>
              <span className="v ">{t('Remboursée au client, à votre charge')}</span>
            </div>
            <div className="kv">
              <span className="k">{t('Trust Score')}</span>
              <span className="v ">
                <span className="cr">{t('Échec grave sur la Qualité')}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="hint">{t('Pris sur la somme gelée de la commande ; le reste, sur vos versements suivants.')}</div>
      </div>
      {!enLigne && <HorsLigne texte="Ce choix demande le réseau" sous="Reconnectez-vous pour l’envoyer." />}
      {refus && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{t(refus)}</div>
        </div>
      )}
      <div className="mt16">
        <Bouton classe="primary" icone={choix === 'remplacer' ? 'repeat' : 'undo-2'} desactive={envoi || !enLigne} onClick={() => void envoyer()}>
          {t(choix === 'remplacer' ? 'Proposer le remplacement' : 'Rembourser le client')}
        </Bouton>
      </div>
      {choix === 'remplacer' && <p className="scrim-note">{t('Si le client refuse, il est remboursé et l’article défectueux vous reste.')}</p>}
      <div className="links" style={{ alignItems: 'center', gap: '2px' }}>
        <Link to={chemin('inspection', { ref: r.ref })} style={LIEN_44}>
          {t('Revoir l’inspection')}
        </Link>
        <span aria-hidden="true" style={{ opacity: '.5' }}>
          {t('·')}
        </span>
        <Link to={chemin('commande', { ref: r.ref })} style={LIEN_44}>
          {t('Voir la commande')}
        </Link>
      </div>
    </>
  )
}
