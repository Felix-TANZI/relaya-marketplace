// Répondre au litige (VD-07, route « litige?ref=…&pos=conteste|accepte|arrangement ») : repris du prototype, branché
// sur la source (domaine litiges).
// - Surtitre « Il reste … » (compte à rebours vivant), échéance en mots et conséquence du silence (DP-35 : BelivaY
//   décide en partant de ce que dit le client, jamais d'arbitrage automatique) ; « Ce que dit le client » (motif,
//   attente, ses mots, gelé, photos repliées) ; trois postures (REP-01) ; un seul bouton plein (VD07-R12).
// - Je conteste : « Ce que vous constatez » obligatoire, « Vos preuves » ouvert ; arrangement : Remplacement ou
//   Remise partielle puis 40 caractères au moins (compteur rouge ou vert, envoi désactivé) ; j'accepte : ce qui se
//   passe (R68 : remboursé après inspection, 48 h au plus ; Q-27 : vous payez seulement le trajet retour et la livraison).
// - Vraies issues : envoi confirmé dans une feuille (la réponse ne se modifie plus, REP-02), puis « Décision et
//   suites » ; refus de la source mis en mots ; échéance passée : lecture seule ; hors connexion : bandeau, envoi
//   désactivé, texte gardé (REP-04, brouillon 24 h, LIT-BROUILLON-H).
// - Ajouts : brouillon gardé automatiquement, phrases utiles, photos ajoutées au dossier (appareil photo) et
//   retirables avant l'envoi, historique du dossier, liens vers la commande, son journal et ses messages.
// - Accès Préparation (DP-56 Q-17) : aucun montant ; il ajoute des preuves ; la réponse revient au propriétaire.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { Chiffres } from '@client/composants/Chrono'
import { Feuille } from '@client/composants/Feuille'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Arrangement, Litige as TLitige, Posture, RefusReponse, ReglesLitiges } from '../../donnees/domaines/litiges'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { duree, echeance } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useDroit, useHorloge, useMontantsVisibles, useSession } from '../../session'
import { Bouton, DansApp, Chargement, ErreurLecture, Fil, Frise, HorsLigne, Photos, Replier, Vide } from './commun'
import { LIEN_44, dateCourte, useEnLigne } from './outils'
import { lignesDuFil } from './fil'

const POSTURES: { id: Posture; titre: string; sous: string }[] = [
  { id: 'accepte', titre: 'J’accepte', sous: 'Le litige est clos aujourd’hui. Le client est remboursé quand l’article vous revient et que vous l’avez inspecté, 48 h au plus.' },
  { id: 'conteste', titre: 'Je conteste', sous: 'Vous montrez vos preuves. La médiation BelivaY décide.' },
  { id: 'arrangement', titre: 'Je propose un arrangement', sous: 'Un remplacement ou une remise partielle.' },
]
const ATTENTE: Record<TLitige['attente'], string> = { remboursement: 'il attend un remboursement', remplacement: 'il attend un remplacement', signal: 'il signale seulement' }
const REFUS: Record<RefusReponse, string> = {
  trop_court: 'Votre proposition est trop courte.',
  constat_vide: 'Écrivez ce que vous constatez.',
  deja_repondu: 'Une réponse a déjà été envoyée pour ce litige.',
  delai_depasse: 'Le délai est passé : BelivaY décide en partant de ce que dit le client.',
  reserve_proprietaire: 'La réponse est réservée au propriétaire de la boutique.',
  introuvable: 'Ce litige n’est plus à répondre.',
}
// Phrases utiles (faits, pas le client) : un toucher les ajoute au constat.
const PHRASES = [
  'Le livreur a contrôlé l’article devant moi au ramassage ; ses photos sont au dossier.',
  'Le colis est parti scellé ; le scellé est visible sur la photo du ramassage.',
  'L’article correspond à la fiche : modèle, capacité et couleur.',
]

export default function Litige() {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const maintenant = useHorloge(1000)
  const enLigne = useEnLigne()
  const naviguer = useNavigate()
  const [params, setParams] = useSearchParams()
  const liste = useLecture(() => source.litiges.liste(), [s.membre?.role])
  const ref = params.get('ref') ?? liste.donnees?.find((l) => l.etat === 'a_repondre')?.ref ?? liste.donnees?.[0]?.ref ?? null
  // { l } : null pendant le chargement ; l null : litige introuvable.
  const lecture = useLecture(() => (ref ? source.litiges.detail(ref) : Promise.resolve(null)).then((l) => ({ ref, l })), [ref, s.membre?.role])
  const regles = useLecture(() => source.litiges.regles(), [])
  const peutPreuves = useDroit('litiges.preuves') // droits de l'accès employé
  const r = regles.donnees
  const titre = ref ? tf('Litige · {ref}', { ref }) : undefined
  if (lecture.erreur || regles.erreur || liste.erreur)
    return (
      <Ecran route="litige" titre={titre}>
        <ErreurLecture erreur={lecture.erreur ?? liste.erreur} relire={() => (lecture.relire(), regles.relire(), liste.relire())} />
      </Ecran>
    )
  if (!r || !lecture.donnees || lecture.donnees.ref !== ref || (!params.get('ref') && !liste.donnees))
    return (
      <Ecran route="litige" titre={titre}>
        <Chargement />
      </Ecran>
    )
  const l = lecture.donnees.l
  if (!l)
    return (
      <Ecran route="litige" titre={titre}>
        <Vide icone="scale" titre="Litige introuvable" texte="Ce litige n’existe pas ou n’est plus ouvert." action={<Bouton classe="primary" icone="arrow-left" vers={chemin('litiges')}>{t('Retour aux litiges')}</Bouton>} />
      </Ecran>
    )
  const proprio = s.membre?.role !== 'preparation'
  const passe = maintenant > l.echeance
  return (
    <Ecran route="litige" titre={titre}>
      <div className="pg">
        {!passe && !l.reponse && (
          <div className="pg-k" style={{ color: 'var(--red)' }}>
            <Icone nom="hourglass" taille={14} style={{ verticalAlign: '-2px' }} />
            {t(' Il reste ')}
            <span className="nu" role="timer" aria-live="off">
              <Chiffres texte={t(duree(l.echeance - maintenant, langue))} />
            </span>
          </div>
        )}
        <h1 className="pg-t">{t('Répondre au litige')}</h1>
        {!l.reponse && (
          <p className="pg-s">
            {t(passe ? 'Le délai était fixé à ' : 'Répondez avant ')}
            <b className="c2">{t(echeance(l.echeance, maintenant, langue))}</b>
            {t('. Sans réponse, BelivaY décide en partant de ce que dit le client.')}
          </p>
        )}
      </div>
      <CeQueDitLeClient l={l} />
      {l.reponse ? (
        <DejaRepondu l={l} />
      ) : passe ? (
        <div>
          <div className="note red" role="status">
            <Icone nom="hourglass" taille={18} />
            <div>
              <b>{t('Le délai est passé.')}</b>
              <br />
              {tf('BelivaY décide en partant de ce que dit le client, au plus tard {d}. Une personne vérifie et écrit pourquoi.', { d: echeance(l.decisionAvant, maintenant, langue) })}
            </div>
          </div>
          <div className="mt16">
            <Bouton classe="primary" icone="arrow-left" vers={chemin('litiges')}>
              {t('Retour aux litiges')}
            </Bouton>
          </div>
        </div>
      ) : proprio ? (
        <Formulaire l={l} r={r} maintenant={maintenant} enLigne={enLigne} pos={(POSTURES.find((p) => p.id === params.get('pos'))?.id ?? l.brouillon?.posture ?? 'conteste') as Posture} choisir={(p) => setParams((x) => (x.set('ref', l.ref), x.set('pos', p), x), { replace: true })} envoye={(p) => naviguer(chemin('litige_envoye', p === 'accepte' ? { ref: l.ref, issue: 'accepte' } : { ref: l.ref }))} />
      ) : peutPreuves ? (
        <Preparation l={l} />
      ) : (
        <div className="hint-l">
          <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Réservé : votre accès permet de lire ce litige, pas d’y ajouter des preuves.')}</span>
        </div>
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
      <Replier icone="info" titre={t('Comment ça marche')}>
        <div style={{ margin: '0 0 14px' }}>
          <Frise courante={l.reponse || passe ? 3 : 2} />
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
      </Replier>
    </Ecran>
  )
}

function CeQueDitLeClient({ l }: { l: TLitige }) {
  const { t, tf, langue } = usePreferences()
  const montants = useMontantsVisibles()
  return (
    <div className="card ord red">
      <div className="kick">{t('Ce que dit le client')}</div>
      <div className="art">
        <Vignette nom={l.article.dessin} taille={52} />
        <div className="grow">
          <div className="an">{tf('« {motif} »', { motif: t(l.motif) })}</div>
          <div className="av" style={{ fontSize: '13px' }}>
            {`${t(l.article.titre)} · ${t(ATTENTE[l.attente])}`}
          </div>
        </div>
      </div>
      <p className="t13 c2" style={{ margin: '10px 0 0', lineHeight: '1.45' }}>
        {tf('Ses mots : « {texte} »', { texte: t(l.ceQueDitLeClient) })}
      </p>
      {montants && l.gele !== null && (
        <div className="mt8">
          <div>
            <div className="kv">
              <span className="k">{t('Gelé jusqu’à la décision')}</span>
              <span className="v ">
                <span className="cr b8">{t(`${F(l.gele)} F`)}</span>
              </span>
            </div>
          </div>
        </div>
      )}
      <Replier icone="image" titre={t('Voir les photos du client')} plat>
        <div className="t13 c3">{tf(l.origine === 'comptoir' ? 'Litige ouvert au comptoir du relais {d}.' : 'Litige ouvert {d}.', { d: dateCourte(l.ouvertA, langue) })}</div>
        <Photos pieces={l.photosClient} classe="split2 mt8" />
      </Replier>
    </div>
  )
}

function Preuves({ l, ouvert }: { l: TLitige; ouvert: boolean }) {
  const { t, tf } = usePreferences()
  const versees = l.preuves.filter((p) => p.ajouteePar === null).length
  return (
    <Replier icone="camera" titre={tf(versees > 1 ? 'Vos preuves · {n} photos déjà au dossier' : 'Vos preuves · {n} photo déjà au dossier', { n: l.preuves.length })} ouvert={ouvert}>
      <div className="t13 c3">{t('Versées automatiquement, vous pouvez en ajouter :')}</div>
      <Photos
        pieces={l.preuves}
        ajouter={async (photo) => {
          const res = await source.litiges.ajouterPreuve(l.ref, photo)
          if (!res.ok) throw new Error('lecture')
        }}
        retirer={(id) => void source.litiges.retirerPreuve(l.ref, id)}
      />
      <div className="hint-l">
        <Icone nom="ban" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Une capture WhatsApp n’est pas une preuve : le fil de la messagerie BelivaY l’est.')}</span>
      </div>
      <Link to={chemin('messages', { ref: l.ref })} className="row t14 b7 cor" style={{ gap: '4px', minHeight: '44px' }}>
        {t('Relire les messages de la commande')}
        <Icone nom="chevron-right" taille={16} />
      </Link>
    </Replier>
  )
}

function Formulaire(p: { l: TLitige; r: ReglesLitiges; maintenant: number; enLigne: boolean; pos: Posture; choisir: (p: Posture) => void; envoye: (p: Posture) => void }) {
  const { l, r, enLigne, pos } = p
  const { t, tf, langue } = usePreferences()
  const montants = useMontantsVisibles()
  const [constat, setConstat] = useState(l.brouillon?.posture === 'conteste' ? l.brouillon.texte : '')
  const [proposition, setProposition] = useState(l.brouillon?.posture === 'arrangement' ? l.brouillon.texte : '')
  const [arrangement, setArrangement] = useState<Arrangement>(l.brouillon?.arrangement ?? (l.attente === 'remplacement' ? 'remplacement' : 'remise'))
  const [touche, setTouche] = useState(false)
  const [confirmer, setConfirmer] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [refus, setRefus] = useState<string | null>(null)
  const [garde, setGarde] = useState<number | null>(l.brouillon?.gardeA ?? null)
  const champ = useRef<HTMLTextAreaElement>(null)
  const texte = pos === 'conteste' ? constat : pos === 'arrangement' ? proposition : ''
  // Brouillon gardé sur l'appareil (24 h), une seconde après la dernière frappe.
  useEffect(() => {
    if (pos === 'accepte' || !texte.trim()) return
    const id = setTimeout(() => {
      void source.litiges.garderBrouillon(l.ref, { posture: pos, arrangement, texte }).then(() => setGarde(Date.now()))
    }, 1000)
    return () => clearTimeout(id)
  }, [texte, pos, arrangement, l.ref])
  const n = proposition.trim().length
  const valide = pos === 'accepte' || (pos === 'conteste' ? constat.trim().length > 0 : n >= r.arrangementMin)
  const envoyer = async () => {
    setEnvoi(true)
    setRefus(null)
    const res = await source.litiges.repondre(l.ref, pos, texte, pos === 'arrangement' ? arrangement : null)
    setEnvoi(false)
    if (res.ok) {
      jouer('envoi')
      setConfirmer(false)
      p.envoye(pos)
    } else {
      jouer('erreur')
      setConfirmer(false)
      setRefus(REFUS[res.raison])
    }
  }
  const ajouterPhrase = (phrase: string) => {
    const x = t(phrase)
    setConstat((c) => (c.trim() ? c.trim() + ' ' + x : x))
    champ.current?.focus()
  }
  return (
    <>
      <div className="divider-t">{t('Ce que vous décidez')}</div>
      <div role="radiogroup" aria-label={t('Ce que vous décidez')}>
        {POSTURES.map((x) => (
          <button key={x.id} type="button" role="radio" aria-checked={pos === x.id} className={'radio' + (pos === x.id ? ' on' : '')} onClick={() => p.choisir(x.id)} style={{ width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit' }}>
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ display: 'block' }}>
                {t(x.titre)}
              </span>
              <span className="rs" style={{ display: 'block' }}>
                {t(x.sous)}
              </span>
            </span>
          </button>
        ))}
      </div>
      <div className="mt4">
        {pos === 'conteste' && (
          <>
            <div className="fld">
              <label htmlFor="vd07-constat">
                {t('Ce que vous constatez ')}
                <span className="req">{t('*')}</span>
              </label>
              <div className={'inp area' + (touche && !constat.trim() ? ' err' : ' focus')}>
                <textarea id="vd07-constat" ref={champ} rows={4} value={constat} onChange={(e) => setConstat(e.target.value)} onBlur={() => setTouche(true)} aria-invalid={touche && !constat.trim()} placeholder={t('Le livreur a contrôlé l’article devant moi au ramassage…')} />
              </div>
              <div className="hint" style={touche && !constat.trim() ? { color: 'var(--red)' } : undefined}>
                {t(touche && !constat.trim() ? 'Écrivez ce que vous constatez : le champ est obligatoire.' : 'Décrivez les faits, pas le client.')}
              </div>
            </div>
            <div className="chips" aria-label={t('Phrases utiles')}>
              {PHRASES.map((x, i) => (
                <button key={x} type="button" className="chip" onClick={() => ajouterPhrase(x)} style={{ font: 'inherit', fontSize: '13px', fontWeight: '700' }}>
                  <Icone nom="plus" taille={14} />
                  {t(['Contrôle au ramassage', 'Colis scellé', 'Conforme à la fiche'][i])}
                </button>
              ))}
            </div>
            <Preuves l={l} ouvert />
          </>
        )}
        {pos === 'arrangement' && (
          <>
            <div className="chips" role="radiogroup" aria-label={t('Votre arrangement')}>
              {(['remplacement', 'remise'] as const).map((a) => (
                <button key={a} type="button" role="radio" aria-checked={arrangement === a} className={'chip' + (arrangement === a ? ' on' : '')} onClick={() => setArrangement(a)}>
                  <Icone nom={a === 'remplacement' ? 'repeat' : 'hand-coins'} taille={15} />
                  {t(a === 'remplacement' ? 'Remplacement' : 'Remise partielle')}
                </button>
              ))}
            </div>
            <div className="fld">
              <label htmlFor="vd07-proposition">
                {t('Votre proposition ')}
                <span className="req">{t('*')}</span>
              </label>
              <div className={'inp area' + (touche && n < r.arrangementMin ? ' err' : ' focus')}>
                <textarea
                  id="vd07-proposition"
                  rows={4}
                  value={proposition}
                  onChange={(e) => setProposition(e.target.value)}
                  onBlur={() => setTouche(true)}
                  placeholder={t(arrangement === 'remplacement' ? 'Je propose un remplacement par un article neuf identique, expédié sous 72 h ouvrées.' : 'Je propose une remise de … F sur cette commande, et vous gardez l’article.')}
                />
              </div>
              <div className={'cnt' + (n >= r.arrangementMin ? ' ok' : '')} style={n < r.arrangementMin ? { color: 'var(--red)' } : undefined} aria-live="polite">
                {tf(n >= r.arrangementMin ? '{n} caractères · {min} au moins ✓' : '{n} caractères · {min} au moins', { n, min: r.arrangementMin })}
              </div>
            </div>
            {arrangement === 'remplacement' ? (
              <div className="note amber">
                <Icone nom="clock" taille={18} />
                <div>
                  {t('Un remplacement accepté part sous ')}
                  <b>{tf('{h} h ouvrées', { h: r.remplacementH })}</b>
                  {t('. Passé ce délai, le client est remboursé automatiquement.')}
                </div>
              </div>
            ) : (
              <div className="note amber">
                <Icone nom="clock" taille={18} />
                <div>{tf('Le client a {j} jours pour répondre. Sans réponse, BelivaY examine le dossier.', { j: r.arrangementReponseJ })}</div>
              </div>
            )}
            <Preuves l={l} ouvert={false} />
          </>
        )}
        {pos === 'accepte' && (
          <div className="note amber">
            <Icone nom="undo-2" taille={18} />
            <div>
              <b>{t('Ce qui se passe si vous acceptez')}</b>
              <br />
              {t('Le client est remboursé dès qu’il dépose l’article au relais.')}
              <br />
              {montants && l.trajetRetour !== null ? tf('Vous ne gardez rien sur cette vente ; vous payez seulement le trajet retour ({t} F) et la livraison du colis.', { t: F(l.trajetRetour) }) : t('Vous ne gardez rien sur cette vente ; vous payez seulement le trajet retour et la livraison du colis.')}
              <br />
              {t('L’article vous revient par le relais.')}
            </div>
          </div>
        )}
      </div>
      {!enLigne && <HorsLigne texte="Répondre à un litige demande le réseau" sous="Votre texte est gardé sur ce téléphone." />}
      {refus && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{t(refus)}</div>
        </div>
      )}
      <div className="mt16">
        <Bouton classe="primary" icone="send" desactive={!valide || !enLigne || envoi} onClick={() => (valide ? setConfirmer(true) : setTouche(true))}>
          {t('Envoyer ma réponse')}
        </Bouton>
      </div>
      <p className="scrim-note">
        {t('Une fois envoyée, votre réponse ne se modifie plus.')}
        <br />
        {pos === 'accepte' ? t('Le litige est clos aussitôt.') : tf('BelivaY décide au plus tard {d}.', { d: echeance(l.decisionAvant, p.maintenant, langue) })}
      </p>
      {garde && pos !== 'accepte' && texte.trim() && (
        <div className="hint-l" style={{ justifyContent: 'center' }}>
          <Icone nom="circle-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Brouillon gardé sur ce téléphone pendant 24 h.')}</span>
        </div>
      )}
      <DansApp>
      <Feuille ouverte={confirmer} fermer={() => setConfirmer(false)} titre={t('Envoyer votre réponse ?')}>
        <div>
          <h3 className="t17 b8" style={{ margin: '0 0 8px' }}>{t('Envoyer votre réponse ?')}</h3>
          <p className="t14 c2" style={{ lineHeight: '1.5', margin: '0' }}>
            <b>{t(POSTURES.find((x) => x.id === pos)!.titre)}</b>
            {pos !== 'accepte' && texte.trim() && (
              <>
                <br />
                {tf('« {texte} »', { texte: texte.trim() })}
              </>
            )}
          </p>
          <p className="t13 c3" style={{ lineHeight: '1.45' }}>
            {t(pos === 'accepte' ? 'Le litige est clos aussitôt et le client est remboursé. Vous ne pourrez plus changer d’avis.' : 'Votre réponse ne se modifie plus. Relisez-la avant de l’envoyer.')}
          </p>
          <div className="mt12">
            <Bouton classe="primary" icone="send" desactive={envoi || !enLigne} onClick={() => void envoyer()}>
              {t(envoi ? 'Envoi…' : 'Envoyer')}
            </Bouton>
          </div>
          <div className="mt8">
            <Bouton classe="secondary" onClick={() => setConfirmer(false)}>
              {t('Relire')}
            </Bouton>
          </div>
        </div>
      </Feuille>
      </DansApp>
    </>
  )
}

function DejaRepondu({ l }: { l: TLitige }) {
  const { t, tf, langue } = usePreferences()
  return (
    <>
      <div className="note green" role="status">
        <Icone nom="circle-check" taille={18} />
        <div>
          <b>{t('Réponse envoyée')}</b>
          <br />
          {tf('Par {nom}, {d}. Elle ne se modifie plus.', { nom: l.reponse!.par, d: dateCourte(l.reponse!.envoyeeA, langue) })}
        </div>
      </div>
      <div className="mt16">
        <Bouton classe="primary" icone="gavel" vers={chemin('litige_envoye', { ref: l.ref })}>
          {t('Voir la décision et les suites')}
        </Bouton>
      </div>
    </>
  )
}

function Preparation({ l }: { l: TLitige }) {
  const { t, tf } = usePreferences()
  const s = useSession()
  return (
    <>
      <div className="note ink">
        <Icone nom="lock" taille={18} />
        <div>{tf('La réponse au litige revient à {nom}, propriétaire. Vos photos s’ajoutent au dossier et l’aident à répondre.', { nom: s.proprietaire ? `${s.proprietaire.prenom} ${s.proprietaire.nom}` : t('le propriétaire') })}</div>
      </div>
      <Preuves l={l} ouvert />
    </>
  )
}
