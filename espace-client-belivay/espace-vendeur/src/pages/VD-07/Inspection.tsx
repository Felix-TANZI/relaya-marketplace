// Inspection à la réception (VD-07, route « inspection?ref=…&d=conforme|non ») : repris du prototype, branché sur
// la source (domaine retours).
// - Surtitre avec l'échéance (réception réelle + 48 h, Q-72), conséquence du silence dite une fois : « Passé ce
//   délai, le client est remboursé automatiquement » (VD07-R25, R27) ; carte de l'article (motif, phrase, « Reçu »).
// - 1 · Constatez : deux cases ; 2 · Photographiez : vraies photos (appareil photo), heure gardée, deux au moins
//   (INP-01) ; 3 · « Le défaut décrit est-il là ? » : la réponse est le verdict (INP-03) ; le bouton plein suit la
//   réponse : « Continuer : remplacer ou rembourser » ou « Envoyer mes preuves en médiation » (VD07-R27, R28).
// - Non conforme : preuves en médiation, BelivaY décide au plus tard 24 h après (DP-57 L-4) ; conforme : coût du
//   défaut (trajet retour et livraison à votre charge, Q-27).
// - États : en route (préparer, « J'ai reçu le retour ») ; moins de deux photos ; délai dépassé : lecture seule
//   « Remboursé automatiquement le … » ; déjà inspecté : résumé et suite ; hors connexion : cases et photos gardées
//   sur le téléphone avec leur heure, l'envoi part au retour du réseau.
// - Accès Préparation : inspecte (travail de la boutique), sans montant.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Controles, RefusInspection, Retour, Verdict } from '../../donnees/domaines/retours'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useDroit, useHorloge, useMontantsVisibles, useSession } from '../../session'
import { Bouton, Chargement, ErreurLecture, HorsLigne, Photos, Vide } from './commun'
import { arriveeEnMots, LIEN_44, dateCourte, useEnLigne } from './outils'

const REFUS: Record<RefusInspection, string> = {
  photos: 'Ajoutez au moins deux photos',
  controles: 'Cochez les deux constats avant d’envoyer.',
  verdict: 'Répondez à la question 3.',
  delai_depasse: 'Le délai est passé : le client a été remboursé automatiquement.',
  deja_inspecte: 'Ce retour est déjà inspecté.',
  pas_recu: 'Le retour n’est pas encore reçu : confirmez sa réception d’abord.',
  introuvable: 'Ce retour n’est plus en cours.',
}

export default function Inspection() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const [params] = useSearchParams()
  const liste = useLecture(() => source.retours.liste(), [s.membre?.role])
  const ref = params.get('ref') ?? liste.donnees?.find((r) => r.etat !== 'clos')?.ref ?? liste.donnees?.[0]?.ref ?? null
  const lecture = useLecture(() => (ref ? source.retours.detail(ref) : Promise.resolve(null)).then((r) => ({ ref, r })), [ref, s.membre?.role])
  const regles = useLecture(() => source.litiges.regles(), [])
  const titre = ref ? tf('Inspection · {ref}', { ref }) : undefined
  // Droits de l'accès employé : sans « inspecter les retours », l'écran dit « Réservé » (la source refuse de toute façon).
  const peutInspecter = useDroit('retours.inspecter')
  if (!peutInspecter)
    return (
      <Ecran route="inspection">
        <Vide icone="lock" titre="Réservé" texte="Votre accès ne comprend pas l’inspection des retours." action={<Bouton classe="primary" icone="arrow-left" vers={chemin('retours')}>{t('Voir les retours')}</Bouton>} />
      </Ecran>
    )
  if (lecture.erreur || regles.erreur || liste.erreur)
    return (
      <Ecran route="inspection">
        <ErreurLecture relire={() => (lecture.relire(), regles.relire(), liste.relire())} />
      </Ecran>
    )
  if (!regles.donnees || !lecture.donnees || lecture.donnees.ref !== ref || (!params.get('ref') && !liste.donnees))
    return (
      <Ecran route="inspection">
        <Chargement />
      </Ecran>
    )
  const r = lecture.donnees.r
  if (!r)
    return (
      <Ecran route="inspection">
        <Vide icone="undo-2" titre="Aucun retour à inspecter" texte="Un retour s’inspecte à sa réception." action={<Bouton classe="primary" icone="arrow-left" vers={chemin('retours')}>{t('Voir les retours')}</Bouton>} />
      </Ecran>
    )
  return (
    <Ecran route="inspection">
      <Corps r={r} titre={titre!} trajet={regles.donnees.trajet} decisionH={regles.donnees.decisionH} inspectionH={regles.donnees.inspectionH} />
    </Ecran>
  )
}

function CarteArticle({ r }: { r: Retour }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge()
  return (
    <div className="card">
      <div className="art" style={{ marginTop: '0' }}>
        <Vignette nom={r.article.dessin} taille={52} />
        <div className="grow">
          <div className="an" style={{ fontSize: '16px' }}>
            {`${t(r.article.titre)} · ${t(r.article.variante)}`}
          </div>
          <div className="av" style={{ fontSize: '13px' }}>
            {tf('{motif} · « {phrase} »', { motif: t(r.motif.charAt(0).toUpperCase() + r.motif.slice(1)), phrase: t(r.phraseClient) })}
          </div>
        </div>
      </div>
      <div className="mt8">
        <div>
          <div className="kv">
            <span className="k">{t(r.recuA !== null ? 'Reçu' : 'Arrive chez vous')}</span>
            <span className="v ">{t(r.recuA !== null ? dateCourte(r.recuA, langue) : arriveeEnMots(r, maintenant, langue))}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Corps({ r, titre, trajet, decisionH, inspectionH }: { r: Retour; titre: string; trajet: number; decisionH: number; inspectionH: number }) {
  const { t, tf, langue } = usePreferences()
  const montants = useMontantsVisibles()
  const maintenant = useHorloge()
  const enLigne = useEnLigne()
  const naviguer = useNavigate()
  const [params, setParams] = useSearchParams()
  const b = r.brouillon
  const [controles, setControles] = useState<Controles>(b?.controles ?? { scelle: false, serie: false })
  const verdictAdresse = params.get('d') === 'non' ? 'non_conforme' : params.get('d') === 'conforme' ? 'conforme' : null
  const [verdict, setVerdict] = useState<Verdict | null>(verdictAdresse ?? b?.verdict ?? null)
  const [refus, setRefus] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [enAttente, setEnAttente] = useState(false)
  const premier = useRef(true)
  // Cases et réponse gardées sur le téléphone à chaque geste (hors connexion compris, VD07-R28).
  useEffect(() => {
    if (premier.current) {
      premier.current = false
      return
    }
    if (!r.inspection) void source.retours.garderBrouillon(r.ref, { controles, verdict })
  }, [controles, verdict, r.ref, r.inspection])
  const photos = b?.photos ?? []
  const pret = controles.scelle && controles.serie && photos.length >= 2 && verdict !== null && r.recuA !== null
  const envoyer = async () => {
    if (!verdict) return
    if (!enLigne) {
      setEnAttente(true)
      return
    }
    setEnvoi(true)
    setRefus(null)
    const res = await source.retours.inspecter(r.ref, verdict, controles)
    setEnvoi(false)
    if (res.ok) {
      jouer('retrait')
      naviguer(verdict === 'conforme' ? chemin('remplacement', { ref: r.ref }) : chemin('retours', { f: 'a_decider' }))
    } else {
      jouer('erreur')
      setRefus(REFUS[res.raison])
    }
  }
  // Envoi parti au retour du réseau.
  useEffect(() => {
    if (enLigne && enAttente) {
      setEnAttente(false)
      void envoyer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enLigne, enAttente])
  const choisir = (v: Verdict) => {
    setVerdict(v)
    setParams((p) => (p.set('ref', r.ref), p.set('d', v === 'conforme' ? 'conforme' : 'non'), p), { replace: true })
  }
  const s = r.suite
  // Délai dépassé : lecture seule (VD07-R25).
  if (s.type === 'rembourse' && s.auto && !r.inspection)
    return (
      <>
        <div className="pg">
          <h1 className="pg-t">{titre}</h1>
          <p className="pg-s">{tf('Remboursé automatiquement le {d} : l’inspection n’a pas été faite dans les 48 h.', { d: dateCourte(s.le, langue) })}</p>
        </div>
        <CarteArticle r={r} />
        <div className="mt16">
          <Bouton classe="primary" icone="arrow-left" vers={chemin('retours')}>
            {t('Voir les retours')}
          </Bouton>
        </div>
      </>
    )
  // Déjà inspecté : résumé et suite.
  if (r.inspection)
    return (
      <>
        <div className="pg">
          <h1 className="pg-t">{titre}</h1>
          <p className="pg-s">{tf('Inspecté le {d} par {nom}.', { d: dateCourte(r.inspection.a, langue), nom: r.inspection.par })}</p>
        </div>
        <CarteArticle r={r} />
        <div className={'note ' + (r.inspection.verdict === 'conforme' ? 'amber' : 'ink')}>
          <Icone nom={r.inspection.verdict === 'conforme' ? 'circle-check' : 'scale'} taille={18} />
          <div>
            <b>{t(r.inspection.verdict === 'conforme' ? 'Oui : conforme au motif' : 'Non : non conforme')}</b>
            <br />
            {s.type === 'mediation' ? tf('Vos photos sont en médiation. BelivaY décide avant {d}.', { d: echeance(s.decisionAvant, maintenant, langue) }) : t('Le défaut est confirmé.')}
          </div>
        </div>
        <div className="card" style={{ marginTop: '12px' }}>
          <Photos pieces={r.inspection.photos} classe="photos" legende={() => 'Inspection'} />
        </div>
        <div className="mt16">
          {s.type === 'a_choisir' ? (
            <Bouton classe="primary" icone="arrow-right" vers={chemin('remplacement', { ref: r.ref })}>
              {t('Continuer : remplacer ou rembourser')}
            </Bouton>
          ) : (
            <Bouton classe="primary" icone="arrow-left" vers={chemin('retours')}>
              {t('Voir les retours')}
            </Bouton>
          )}
        </div>
      </>
    )
  const caseCochee = (k: keyof Controles, texte: string) => (
    <button type="button" role="checkbox" aria-checked={controles[k]} className="check" onClick={() => setControles((c) => ({ ...c, [k]: !c[k] }))} style={{ width: '100%', textAlign: 'left', background: 'none', border: '0', font: 'inherit', color: 'inherit', cursor: 'pointer', borderTop: k === 'serie' ? '1px solid var(--line)' : '0' }}>
      <span className={'cb' + (controles[k] ? ' on' : '')}>{controles[k] && <Icone nom="check" taille={14} trait={3} />}</span>
      <span className="grow">{t(texte)}</span>
    </button>
  )
  return (
    <>
      <div className="pg">
        <div className="pg-k">
          <Icone nom="timer" taille={14} style={{ verticalAlign: '-2px' }} />
          {r.recuA !== null ? tf(' Inspectez avant {d}', { d: echeance(r.inspecterAvant!, maintenant, langue) }) : tf(' Arrive {d} · puis {h} h pour inspecter', { d: arriveeEnMots(r, maintenant, langue), h: inspectionH })}
        </div>
        <h1 className="pg-t">{titre}</h1>
        <p className="pg-s">{t('Passé ce délai, le client est remboursé automatiquement.')}</p>
      </div>
      <CarteArticle r={r} />
      {r.recuA === null && (
        <div className="note amber" role="status">
          <Icone nom="truck" taille={18} />
          <div>
            <b>{t('Le retour est en route.')}</b>
            <br />
            {tf('Préparez l’inspection : les {h} h partent de la remise du colis par le livreur.', { h: inspectionH })}
            <div className="mt8">
              <Bouton classe="secondary sm" icone="package-check" desactive={!enLigne} onClick={() => void source.retours.recevoir(r.ref).then((x) => x.ok && jouer('retrait'))}>
                {t('J’ai reçu le retour')}
              </Bouton>
            </div>
          </div>
        </div>
      )}
      <div className="divider-t">{t('1 · Constatez')}</div>
      <div className="card" style={{ marginTop: '0', paddingTop: '6px', paddingBottom: '6px' }}>
        {caseCochee('scelle', 'Scellé du retour intact')}
        {caseCochee('serie', 'C’est bien l’article vendu (numéro de série)')}
      </div>
      <div className="divider-t">{t('2 · Photographiez')}</div>
      <div className="card" style={{ marginTop: '0' }}>
        <Photos
          pieces={photos}
          classe="photos"
          legende={() => 'Inspection'}
          ajouter={async (photo) => {
            const res = await source.retours.ajouterPhoto(r.ref, photo)
            if (!res.ok) throw new Error('lecture')
          }}
          retirer={(id) => void source.retours.retirerPhoto(r.ref, id)}
        />
        <div className="hint-l" style={photos.length < 2 ? { color: 'var(--red)' } : undefined}>
          <Icone nom="camera" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t(photos.length < 2 ? 'Ajoutez au moins deux photos' : 'Deux photos au moins. L’heure et le lieu de la prise sont conservés.')}</span>
        </div>
      </div>
      <div className="divider-t">{t('3 · Le défaut décrit est-il là ?')}</div>
      <div role="radiogroup" aria-label={t('3 · Le défaut décrit est-il là ?')}>
        {(
          [
            ['conforme', 'Oui : conforme au motif', montants ? tf('Vous remplacez ou remboursez. Trajet retour ({t} F) et livraison du colis à votre charge.', { t: F(trajet) }) : t('Vous remplacez ou remboursez. Trajet retour et livraison du colis à votre charge.')],
            ['non_conforme', 'Non : non conforme', tf('Vos photos partent en médiation : BelivaY décide sous {h} h. Si vous avez raison, le client paie le trajet.', { h: decisionH })],
          ] as const
        ).map(([v, titreV, sous]) => (
          <button key={v} type="button" role="radio" aria-checked={verdict === v} className={'radio' + (verdict === v ? ' on' : '')} onClick={() => choisir(v)} style={{ width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit' }}>
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ display: 'block' }}>
                {t(titreV)}
              </span>
              <span className="rs" style={{ display: 'block' }}>
                {sous}
              </span>
            </span>
          </button>
        ))}
      </div>
      {!enLigne && <HorsLigne texte="Hors connexion : vos cases et vos photos sont gardées" sous={enAttente ? 'Envoi en attente : il part au retour du réseau.' : 'L’envoi partira au retour du réseau.'} />}
      {refus && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{t(refus)}</div>
        </div>
      )}
      <div className="mt16">
        <Bouton classe="primary" icone={verdict === 'non_conforme' ? 'send' : 'arrow-right'} desactive={!pret || envoi || enAttente} onClick={() => void envoyer()}>
          {t(verdict === 'non_conforme' ? 'Envoyer mes preuves en médiation' : 'Continuer : remplacer ou rembourser')}
        </Bouton>
      </div>
      {!pret && (
        <p className="scrim-note">
          {t(r.recuA === null ? 'L’envoi s’ouvre à la réception du retour.' : !controles.scelle || !controles.serie ? 'Cochez les deux constats, ajoutez deux photos et répondez à la question 3.' : photos.length < 2 ? 'Ajoutez au moins deux photos' : 'Répondez à la question 3.')}
        </p>
      )}
      <div className="links" style={{ alignItems: 'center', gap: '2px' }}>
        <Link to={chemin('commande', { ref: r.ref })} style={LIEN_44}>
          {t('Voir la commande')}
        </Link>
        <span aria-hidden="true" style={{ opacity: '.5' }}>
          {t('·')}
        </span>
        <Link to={chemin('retours')} style={LIEN_44}>
          {t('Tous les retours')}
        </Link>
      </div>
    </>
  )
}
