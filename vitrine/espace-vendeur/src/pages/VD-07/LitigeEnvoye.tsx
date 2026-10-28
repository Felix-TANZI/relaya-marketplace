// Décision et suites (VD-07, route « litige_envoye?ref=… ») : repris du prototype, branché sur la source.
// - L'issue, la somme et sa destination en tête (DCS-01) : médiation en cours (nuit) · gagné (vert) · perdu (rouge) ·
//   clos après acceptation (nuit), jamais « Réponse envoyée » après « J'accepte » (VD07-R13).
// - Médiation : « BelivaY décide avant … » (échéance + 24 h, DP-35), frise à l'étape 3, ce qui peut arriver (textes,
//   VD07-R20) ; la mention du tribunal est retirée et le client silencieux 5 jours renvoie en examen (DP-56 Q-26).
// - Gagné : la somme est libérée après le délai de recours du client (gel du recours, Q-26), versée le vendredi
//   suivant (src/calculs/versements) ; perdu : le client est remboursé, effet sur le Trust Score (g1/g3), le vendeur
//   paie le trajet retour et la livraison (Q-27) ; « Contester la décision », une fois, sous 48 h (feuille).
// - Ajouts : votre réponse relue, preuves au dossier, historique du dossier, liens vers la commande et son journal ;
//   hors connexion : dernier état connu avec son heure, contestation désactivée (VD07-R21).
// - Accès Préparation : aucun montant, aucune contestation.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Feuille } from '@client/composants/Feuille'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Litige, RefusRecours, ReglesLitiges } from '../../donnees/domaines/litiges'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance, heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles, useSession } from '../../session'
import { Bouton, Chargement, DansApp, ErreurLecture, Fil, Frise, HorsLigne, Photos, Replier, Vide } from './commun'
import { LIEN_44, dateCourte, horodatage, jourEnMots, useEnLigne, useMiseAJour } from './outils'
import { lignesDuFil } from './fil'

const EFFET: Record<string, string> = { aucun: 'Aucun', g1: 'Échec léger sur le critère Litiges', g3: 'Échec grave sur le critère Litiges' }
const POSTURE: Record<string, string> = { accepte: 'J’accepte', conteste: 'Je conteste', arrangement: 'Je propose un arrangement' }
const REFUS: Record<RefusRecours, string> = {
  deja_contestee: 'Vous avez déjà contesté cette décision.',
  trop_court: 'Expliquez en quelques phrases pourquoi vous n’êtes pas d’accord.',
  delai_depasse: 'Le délai de recours est passé.',
  non_contestable: 'Cette décision ne se conteste pas.',
  reserve_proprietaire: 'La contestation est réservée au propriétaire de la boutique.',
}

export default function LitigeEnvoye() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const maintenant = useHorloge()
  const enLigne = useEnLigne()
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? 'BLV-00005'
  const lecture = useLecture(() => source.litiges.detail(ref).then((l) => ({ ref, l })), [ref, s.membre?.role, params.get('issue')])
  const regles = useLecture(() => source.litiges.regles(), [])
  const misAJour = useMiseAJour(lecture.donnees, maintenant)
  const titre = tf('Décision · {ref}', { ref })
  if (lecture.erreur || regles.erreur)
    return (
      <Ecran route="litige_envoye" titre={titre}>
        <ErreurLecture relire={() => (lecture.relire(), regles.relire())} />
      </Ecran>
    )
  if (!lecture.donnees || lecture.donnees.ref !== ref || !regles.donnees)
    return (
      <Ecran route="litige_envoye" titre={titre}>
        <Chargement />
      </Ecran>
    )
  const l = lecture.donnees.l
  const r = regles.donnees
  if (!l)
    return (
      <Ecran route="litige_envoye" titre={titre}>
        <Vide icone="scale" titre="Litige introuvable" texte="Ce litige n’existe pas ou n’est plus ouvert." action={<Bouton classe="primary" icone="arrow-left" vers={chemin('litiges')}>{t('Retour aux litiges')}</Bouton>} />
      </Ecran>
    )
  return (
    <Ecran route="litige_envoye" titre={titre}>
      <div className="pg">
        <h1 className="pg-t">{t('Décision et suites')}</h1>
        <p className="pg-s">{`${t(l.article.titre)} · ${tf('« {motif} »', { motif: t(l.motif) })}`}</p>
      </div>
      {!enLigne && <HorsLigne texte="Hors connexion : dernier état connu" sous={misAJour ? tf('Mis à jour à {h}.', { h: heure(misAJour, langue) }) : undefined} />}
      <EnTete l={l} maintenant={maintenant} />
      {l.etat === 'a_repondre' && (
        <div className="card">
          <h3>{t('Vous n’avez pas encore répondu')}</h3>
          <div className="sub">{tf('Répondez avant {d}. Sans réponse, BelivaY décide en partant de ce que dit le client.', { d: echeance(l.echeance, maintenant, langue) })}</div>
          <div className="mt12">
            <Bouton classe="soft" icone="scale" vers={chemin('litige', { ref: l.ref })}>
              {t('Répondre')}
            </Bouton>
          </div>
        </div>
      )}
      {l.etat === 'en_mediation' && !l.decision && <EnMediation r={r} />}
      {l.decision && <Motif l={l} />}
      {l.decision?.issue === 'gagne' && l.recours.jusqua && maintenant <= l.recours.jusqua && (
        <div className="note ink">
          <Icone nom="gavel" taille={18} />
          <div>{tf('Le client peut contester une fois, jusqu’à {d} : une autre personne réexamine alors le dossier. L’argent reste gelé jusque-là.', { d: echeance(l.recours.jusqua, maintenant, langue) })}</div>
        </div>
      )}
      {l.decision?.issue === 'perdu' && <Recours l={l} r={r} enLigne={enLigne} maintenant={maintenant} />}
      {l.reponse && l.reponse.posture !== 'accepte' && (
        <div className="card">
          <div className="kick">{t('Votre réponse')}</div>
          <div className="b8 t15 mt8">{t(POSTURE[l.reponse.posture])}</div>
          {l.reponse.texte && <p className="t14 c2" style={{ lineHeight: '1.5', margin: '6px 0 0' }}>{tf('« {texte} »', { texte: t(l.reponse.texte) })}</p>}
          <div className="t12 c3 mt8">{tf('Envoyée par {nom}, {d}', { nom: l.reponse.par, d: dateCourte(l.reponse.envoyeeA, langue) })}</div>
        </div>
      )}
      {l.issue !== 'accepte' && (
        <Replier icone="camera" titre={tf('Preuves au dossier · {n} photos', { n: l.preuves.length + l.photosClient.length })}>
          <Photos pieces={[...l.photosClient, ...l.preuves]} />
        </Replier>
      )}
      <Replier icone="history" titre={t('Historique du dossier')}>
        <Fil lignes={lignesDuFil(l, maintenant, t, tf, langue)} />
      </Replier>
      <div className="links" style={{ alignItems: 'center', gap: '2px', flexWrap: 'wrap' }}>
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
      <div className="mt16">
        <Bouton classe="primary" icone="arrow-left" vers={chemin('litiges')}>
          {t('Retour aux litiges')}
        </Bouton>
      </div>
    </Ecran>
  )
}

function EnTete({ l, maintenant }: { l: Litige; maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  const montants = useMontantsVisibles()
  const fraisVendeur = montants && l.trajetRetour !== null ? tf('Vous ne gardez rien sur cette vente ; vous payez seulement le trajet retour ({t} F) et la livraison du colis.', { t: F(l.trajetRetour) }) : t('Vous ne gardez rien sur cette vente ; vous payez seulement le trajet retour et la livraison du colis.')
  if (l.issue === 'accepte')
    return (
      <div className="hero night">
        <div className="otop">
          <span className="hk">{t('Litige clos')}</span>
          <Icone nom="circle-check" taille={20} style={{ color: '#fff' }} />
        </div>
        <div className="b8 mt8" style={{ fontSize: '19px', color: '#fff' }}>
          {t('Vous avez accepté : le client est remboursé')}
        </div>
        <div className="hs">
          {t('Il est remboursé dès qu’il dépose l’article au relais.')}
          <br />
          {fraisVendeur}
          <br />
          {t('L’article vous revient par le relais.')}
        </div>
      </div>
    )
  if (l.decision?.issue === 'gagne')
    return (
      <div className="hero green">
        <div className="otop">
          <span className="hk" style={{ color: '#fff' }}>
            {t('Litige gagné')}
          </span>
          <span className="blv-succes" style={{ display: 'inline-flex', color: '#fff' }}>
            <Icone nom="badge-check" taille={20} />
          </span>
        </div>
        <div className="b8 mt8" style={{ fontSize: '19px', color: '#fff' }}>
          {t('Vous gardez toute la vente')}
        </div>
        {montants && l.gele !== null && (
          <div className="big" style={{ color: '#fff' }}>
            {t(F(l.gele))}
            <small>{t('FCFA')}</small>
          </div>
        )}
        <div className="hs">
          {l.decision.liberation && l.decision.versement
            ? tf('Libérés {lib}, versés {v} vers {vers}.', { lib: echeance(l.decision.liberation, maintenant, langue), v: jourEnMots(l.decision.versement, langue), vers: l.decision.versementVers ?? '' })
            : t('Aucun effet sur votre score.')}
        </div>
      </div>
    )
  if (l.decision?.issue === 'perdu')
    return (
      <div className="hero red">
        <div className="otop">
          <span className="hk" style={{ color: '#fff' }}>
            {t('Litige perdu')}
          </span>
          <Icone nom="circle-x" taille={20} style={{ color: '#fff' }} />
        </div>
        <div className="b8 mt8" style={{ fontSize: '19px', color: '#fff' }}>
          {t('Le client est remboursé')}
        </div>
        <div className="hs">
          {fraisVendeur}
          <br />
          {t('L’article vous revient par le relais.')}
        </div>
      </div>
    )
  // Médiation en cours (réponse envoyée, ou délai passé sans réponse : BelivaY examine en partant de ce que dit le client).
  return (
    <div className="hero night">
      <div className="otop">
        <span className="hk">{t(l.reponse ? 'Réponse envoyée' : l.etat === 'a_repondre' ? 'Réponse attendue' : 'Sans réponse de votre part')}</span>
        <Icone nom={l.reponse ? 'send' : 'hourglass'} taille={18} style={{ color: 'var(--gold-l)' }} />
      </div>
      <div className="b8 mt8" style={{ fontSize: '19px', color: '#fff' }}>
        {tf('BelivaY décide avant {d}', { d: echeance(l.decisionAvant, maintenant, langue) })}
      </div>
      <div className="hs">{t(l.reponse || l.etat === 'a_repondre' ? 'Vous êtes prévenu par notification et par SMS.' : 'La médiation part de ce que dit le client. Vous êtes prévenu par notification et par SMS.')}</div>
      {montants && l.gele !== null && (
        <>
          <div className="hline"></div>
          <div className="row">
            <span className="grow t14" style={{ color: '#fff' }}>
              {t('Gelé jusqu’à la décision')}
            </span>
            <span className="b8 t17" style={{ color: '#FF9C8F' }}>
              {t(`${F(l.gele)} F`)}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

function EnMediation({ r }: { r: ReglesLitiges }) {
  const { t, tf } = usePreferences()
  const montants = useMontantsVisibles()
  const ligne = (icone: string, ton: string, titre: string, sous: string) => (
    <div className="li">
      <span className={'ic ' + ton}>
        <Icone nom={icone} taille={20} />
      </span>
      <span className="grow">
        <span className="lt" style={{ display: 'block' }}>
          {titre}
        </span>
        <span className="ls" style={{ display: 'block' }}>
          {sous}
        </span>
      </span>
    </div>
  )
  return (
    <>
      <div className="card">
        <h3>{t('Où en est votre litige')}</h3>
        <Frise courante={3} />
        <div className="hr" style={{ margin: '16px 0 12px' }}></div>
        <div className="kick">{t('Ce qui peut arriver')}</div>
        <div className="mt4">
          {ligne('badge-check', 'green', t('Gagné : vous gardez toute la vente'), tf('Libérée après le délai de recours du client ({h} h), versée le vendredi suivant. Aucun effet sur votre score.', { h: r.recoursH }))}
          {ligne('circle-x', 'red', t('Perdu : le client est remboursé'), montants ? tf('Vous payez le trajet retour ({t} F) et la livraison. Trust Score : échec léger ou grave sur le critère Litiges.', { t: F(r.trajet) }) : t('Trust Score : échec léger ou grave sur le critère Litiges.'))}
          {ligne('gavel', 'or', t('Contestation, une fois'), tf('Sous {h} h après la décision : une autre personne réexamine le dossier, avec un motif écrit.', { h: r.recoursH }))}
        </div>
      </div>
      <Replier icone="info" titre={t('Comment ça marche')}>
        <div>
          <div className="kv">
            <span className="k">{tf('Client silencieux {j} jours', { j: r.arrangementReponseJ })}</span>
            <span className="v ">{t('Retour en examen')}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Remplacement accepté')}</span>
            <span className="v ">{tf('Sous {h} h ouvrées', { h: r.remplacementH })}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Vice caché')}</span>
            <span className="v ">{tf('Signalable jusqu’à {j} jours', { j: r.viceJ })}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Litige en cours')}</span>
            <span className="v ">{t('Aucun effet sur le score')}</span>
          </div>
        </div>
      </Replier>
    </>
  )
}

function Motif({ l }: { l: Litige }) {
  const { t, langue } = usePreferences()
  const d = l.decision!
  return (
    <div className="card">
      <div className="kick">{t('Motif écrit de la décision')}</div>
      <p className="t14 c2" style={{ lineHeight: '1.5', margin: '8px 0 0' }}>
        {t(d.motif)}
      </p>
      <div className="hr"></div>
      <div>
        <div className="kv">
          <span className="k">{t('Effet sur votre Trust Score')}</span>
          <span className="v ">
            <span className={d.effetScore === 'aucun' ? 'cg' : 'cr'}>{t(EFFET[d.effetScore])}</span>
          </span>
        </div>
        <div className="kv">
          <span className="k">{t('Décidé par')}</span>
          <span className="v ">{`${t(d.par)} · ${horodatage(d.a, langue)}`}</span>
        </div>
      </div>
    </div>
  )
}

function Recours({ l, r, enLigne, maintenant }: { l: Litige; r: ReglesLitiges; enLigne: boolean; maintenant: number }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const [ouverte, setOuverte] = useState(false)
  const [texte, setTexte] = useState('')
  const [refus, setRefus] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  if (l.recours.deposeA)
    return (
      <div className="card">
        <h3>{t('Contestation envoyée')}</h3>
        <div className="sub">{tf('Contestation utilisée le {d}. Une autre personne de BelivaY réexamine le dossier et vous répond avec un motif écrit. L’argent reste gelé jusqu’à sa réponse.', { d: dateCourte(l.recours.deposeA, langue) })}</div>
      </div>
    )
  if (!l.recours.possible)
    return (
      <div className="card">
        <h3>{t('Vous n’êtes pas d’accord ?')}</h3>
        <div className="sub">{s.membre?.role === 'preparation' ? t('La contestation est réservée au propriétaire de la boutique.') : t('Le délai de recours est passé : la décision est définitive.')}</div>
      </div>
    )
  const envoyer = async () => {
    setEnvoi(true)
    setRefus(null)
    const res = await source.litiges.contester(l.ref, texte)
    setEnvoi(false)
    if (res.ok) {
      jouer('envoi')
      setOuverte(false)
    } else {
      jouer('erreur')
      setRefus(REFUS[res.raison])
    }
  }
  const n = texte.trim().length
  return (
    <div className="card">
      <h3>{t('Vous n’êtes pas d’accord ?')}</h3>
      <div className="sub">{tf('Vous pouvez contester une fois, jusqu’à {d}. Une autre personne de BelivaY réexamine le dossier, avec un motif écrit. L’argent reste gelé jusqu’à sa réponse.', { d: echeance(l.recours.jusqua!, maintenant, langue) })}</div>
      <div className="mt12">
        <Bouton classe="soft" icone="gavel" desactive={!enLigne} onClick={() => setOuverte(true)}>
          {t('Contester la décision')}
        </Bouton>
      </div>
      <DansApp>
        <Feuille ouverte={ouverte} fermer={() => setOuverte(false)} titre={t('Contester la décision')}>
          <div>
            <h3 className="t17 b8" style={{ margin: '0 0 8px' }}>
              {t('Contester la décision')}
            </h3>
            <p className="t13 c3" style={{ lineHeight: '1.45', margin: '0' }}>
              {t('Une seule contestation par décision : relisez avant d’envoyer.')}
            </p>
            <div className="fld">
              <label htmlFor="vd07-recours">
                {t('Votre explication ')}
                <span className="req">{t('*')}</span>
              </label>
              <div className={'inp area' + (refus ? ' err' : ' focus')}>
                <textarea id="vd07-recours" rows={4} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder={t('Les photos du ramassage montrent la capacité sur la boîte…')} />
              </div>
              <div className={'cnt' + (n >= r.arrangementMin ? ' ok' : '')}>{tf(n >= r.arrangementMin ? '{n} caractères · {min} au moins ✓' : '{n} caractères · {min} au moins', { n, min: r.arrangementMin })}</div>
            </div>
            {refus && (
              <div className="note red" role="alert">
                <Icone nom="circle-alert" taille={18} />
                <div>{t(refus)}</div>
              </div>
            )}
            <div className="mt12">
              <Bouton classe="primary" icone="send" desactive={envoi || !enLigne || n < r.arrangementMin} onClick={() => void envoyer()}>
                {t(envoi ? 'Envoi…' : 'Envoyer ma contestation')}
              </Bouton>
            </div>
          </div>
        </Feuille>
      </DansApp>
    </div>
  )
}
