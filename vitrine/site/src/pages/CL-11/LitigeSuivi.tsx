// Écran « Suivi du litige » (CL-11), forme d'origine du prototype rendue réelle (DP-54) : tout le dossier (?id=…)
// lu dans les données, sous la forme de l'état réel du dossier : en attente du vendeur (délai qui se décompte),
// contesté, sans réponse (examen en priorité), en examen, arrangement proposé, accepté, remboursé, remplacé,
// refusé (motif écrit), signal, retiré. Pour chacun : argent bloqué, où en est le litige, colis, problème et
// souhait, preuves (et en ajouter), suite (retour au relais, remplacement), motif écrit (le contester une fois,
// sous 48 h, l'argent restant bloqué, DP-35), retirer son signalement tant que le vendeur n'a pas répondu, écrire dans le dossier.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne, Gabarit } from '../../composants/Gabarits'
import { useDes } from '../../composants/ecran'
import { useMenuCoque } from '../../composants/donneesCoque'
import { Dessin } from '../../composants/Dessin'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { Bouton } from '../../composants/socle'
import { chemin } from '../../config/pages'
import { reduirePhoto, TYPES_PHOTO } from '../../donnees/photo'
import { source, type Litige } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { contestable as peutContester, DECISION_H, decisionAvant as dateDecision, enCours, finRecours, heuresRestantes, RECOURS_H, useRemboursement } from './Commun'

const SOUHAIT: Record<Litige['souhait'], string> = { rembourse: 'Un remboursement', remplace: 'Un remplacement', signal: 'Un simple signal' }

export function LitigeSuivi() {
  const { t } = usePreferences()
  const [params] = useSearchParams()
  const id = params.get('id') ?? 'LIT-3042'
  const corps = useCorpsLitige(id)
  const colonnes = useDes('tab-l')
  if (corps === undefined) return null
  if (!corps)
    return (
      <Ecran route="litige-suivi">
        <div className="card">
          <div className="empty">
            <h3>{t('Dossier introuvable')}</h3>
            <div className="btns">
              <Link to={chemin('litiges')} className="btn primary">
                <span>{t('Mes litiges')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  return (
    <Ecran route="litige-suivi" sousTitre={corps.l.id + ' · ' + corps.l.ref} fixes={corps.fixes} largeur={colonnes ? 'moyen' : undefined}>
      {colonnes ? <DispositionLitige m={corps.morceaux} /> : corps.morceaux.telephone}
    </Ecran>
  )
}

// Grands écrans (DISPOSITION-ECRANS.md § 5.10) : à gauche l'état du dossier, le problème et le souhait, les preuves
// (et « Ajouter »), la chronologie et « Écrire dans le dossier » ; à droite, collant, l'argent bloqué, la suite
// (arrangement, retour, remplacement), le motif écrit et « Contester », « Retirer mon signalement ». Aussi employé
// dans le détail de Mes litiges (maître-détail).
export function DispositionLitige({ m }: { m: MorceauxLitige }) {
  const { t } = usePreferences()
  return (
    <Gabarit forme="colonnes" classe="cl11-cols">
      <Colonne>
        {m.hero}
        {m.message}
        {m.produit}
        {m.preuves}
        {m.chronologie}
        {m.comment}
        {m.ecrire}
      </Colonne>
      <Aside titre={t('Ton argent et la suite')}>
        {m.argent}
        {m.bref}
        {m.remboursement}
        {m.arrangement}
        {m.remplacement}
        {m.retour}
        {m.motif}
        {m.refuse}
        {m.contacts}
        {m.retirer}
        {m.liens}
      </Aside>
    </Gabarit>
  )
}

export type MorceauxLitige = Record<'bref' | 'contacts' | 'hero' | 'message' | 'arrangement' | 'remplacement' | 'retour' | 'motif' | 'refuse' | 'argent' | 'remboursement' | 'chronologie' | 'produit' | 'preuves' | 'comment' | 'ecrire' | 'retirer' | 'liens' | 'telephone', ReactNode>

// Le dossier « id » et ses blocs : « telephone » les donne dans l'ordre d'origine, les autres un à un pour les grands
// écrans. undefined : chargement ; null : introuvable.
export function useCorpsLitige(id: string): { l: Litige; morceaux: MorceauxLitige; fixes: ReactNode } | null | undefined {
  const { t, tf, langue } = usePreferences()
  const [d, setD] = useState<{ litige: Litige; maintenant: number } | null | undefined>(undefined)
  const [payePar, setPayePar] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [retrait, setRetrait] = useState(false)
  const [contester, setContester] = useState(false)
  const [motif, setMotif] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const fichier = useRef<HTMLInputElement>(null)
  const remb = useRemboursement(payePar)
  const menu = useMenuCoque(useDes('tab-l')) // heures du support, pour le bloc « Contacts » des grands écrans
  useEffect(() => {
    // Maître-détail de Mes litiges : un autre dossier choisi repart de zéro.
    setMessage(null)
    setRetrait(false)
    setContester(false)
    source.litige(id).then((x) => {
      setD(x)
      if (x) source.commandeLitige(x.litige.ref).then((c) => setPayePar(c?.payePar ?? null))
    })
  }, [id, version])
  if (d === undefined) return undefined
  if (!d) return null
  const recharger = () => setVersion((v) => v + 1)
  const l = d.litige
  const h = heuresRestantes(l, d.maintenant)
  const bloque = enCours(l) && l.souhait !== 'signal'
  const comptoir = l.origine === 'comptoir'
  const decisionAvant = dateDecision(l)
  const decisionAVenir = decisionAvant > d.maintenant
  const recours = !!l.decision?.conteste && enCours(l)
  const contestable = peutContester(l, d.maintenant)
  const montantRembourse = l.arrangement && l.etat === 'rembourse' ? l.arrangement.montant : l.montant

  // En-tête de l'état réel du dossier.
  const hero = (() => {
    switch (l.etat) {
      case 'attente':
        return (
          <div className="hero night">
            <div className="hk">
              {t('Le vendeur a ')}
              <span className="nu">{t('48 h')}</span>
              {t(' pour répondre')}
            </div>
            <div className="big">{tf('{h} h', { h })}</div>
            <div className="hs">
              {t('Réponse attendue avant le ')}
              <b>{dateA(l.echeance, langue)}</b>
              {t('.')}
            </div>
          </div>
        )
      case 'conteste':
      case 'silence':
      case 'examen':
        return (
          <div className="hero night">
            <div className="hk">{t(recours ? 'Ton recours' : l.etat === 'silence' ? 'En examen · en priorité' : 'En examen')}</div>
            <div className="cl11-ht">{t(recours ? 'Une autre personne reprend ton dossier' : l.etat === 'conteste' ? 'Le vendeur conteste' : l.etat === 'silence' ? 'Le vendeur n’a pas répondu' : 'BelivaY compare les preuves')}</div>
            {recours ? (
              <div className="hs">{t('Elle n’a pas pris la première décision. Ton argent reste bloqué jusqu’à sa réponse, avec un motif écrit.')}</div>
            ) : decisionAVenir ? (
              <div className="hs">
                {t(
                  l.etat === 'conteste'
                    ? 'BelivaY compare toutes les preuves et décide avant le '
                    : l.etat === 'silence'
                      ? 'La règle joue en ta faveur. Une personne de BelivaY vérifie quand même et décide avant le '
                      : 'Décision attendue avant le ',
                )}
                <b>{dateA(decisionAvant, langue)}</b>
                {t('.')}
              </div>
            ) : (
              <div className="hs">{t('La décision arrive très vite, avec son motif écrit. Tu es prévenue par notification.')}</div>
            )}
          </div>
        )
      case 'arrangement':
        return (
          <div className="hero orange">
            <div className="hk">{t('À toi de répondre')}</div>
            <div className="cl11-ht">{t('Le vendeur te propose un arrangement')}</div>
            <div className="hs">{t('Tu acceptes ou tu refuses. Si tu refuses, BelivaY examine ton dossier.')}</div>
          </div>
        )
      case 'accepte':
        return (
          <div className="hero green">
            <div className="hk">{t('Le vendeur a accepté')}</div>
            <div className="cl11-ht">{t(l.souhait === 'remplace' ? 'Ton article va être remplacé' : 'Tu es remboursée')}</div>
            <div className="hs">
              {l.souhait === 'remplace' && l.remplacement ? (
                <>
                  {t('Le vendeur renvoie un article neuf avant le ')}
                  <b>{dateA(l.remplacement.avant, langue)}</b>
                  {t('. Livraison offerte.')}
                </>
              ) : (
                tf('{m} F versés {ou}, {quand}.', { m: F(l.montant), ou: remb.ou, quand: remb.quand })
              )}
            </div>
          </div>
        )
      case 'rembourse':
        return (
          <div className="hero green">
            <div className="hk">{t(l.origine === 'auto' ? 'Réglé tout de suite, sans enquête' : l.arrangement ? 'Arrangement accepté' : 'Décision de BelivaY')}</div>
            <div className="cl11-ht">{t('Remboursement accordé')}</div>
            <div className="big" style={{ fontSize: '34px' }}>
              {F(montantRembourse)}&nbsp;F
            </div>
            <div className="hs">
              {l.retour && l.retour.etape !== 'clos'
                ? tf('Versés {ou} quand le vendeur a reçu et inspecté l’article (48\u00A0h au plus).', { ou: remb.ou })
                : tf('Versés {ou}.', { ou: remb.ou })}
            </div>
          </div>
        )
      case 'remplace':
        return (
          <div className="hero green">
            <div className="hk">{t('Décision de BelivaY')}</div>
            <div className="cl11-ht">{t('Remplacement accordé')}</div>
            <div className="hs">
              {l.remplacement ? (
                <>
                  {t('Le vendeur renvoie un article neuf avant le ')}
                  <b>{dateA(l.remplacement.avant, langue)}</b>
                  {t('. Sinon, tu es remboursée automatiquement.')}
                </>
              ) : (
                t('Le vendeur renvoie le même article, livraison offerte.')
              )}
            </div>
          </div>
        )
      case 'refuse':
        return (
          <div className="hero red">
            <div className="hk">{t('Décision de BelivaY')}</div>
            <div className="cl11-ht">{t('Demande non retenue')}</div>
            <div className="hs">{t('BelivaY a comparé toutes les preuves. Voici pourquoi.')}</div>
          </div>
        )
      case 'signal':
      case 'retire':
        return (
          <div className="hero night">
            <div className="hk">{t(l.etat === 'signal' ? 'Signal reçu' : 'Signalement retiré')}</div>
            <div className="hs">{t(l.etat === 'signal' ? 'Merci : il nous aide à écarter les mauvais produits. Ta commande ne change pas.' : 'Le paiement suit son cours normal.')}</div>
          </div>
        )
    }
  })()

  // Où en est le litige : quatre étapes, avec ce qui s'est réellement passé.
  const tl = (() => {
    const recu = { tt: 'Reçu', td: dateA(l.ouvertLe, langue), c: 'done' }
    const vendeur = { tt: 'Le vendeur a 48 h pour répondre', td: t('il accepte, conteste ou propose un arrangement'), c: '' }
    const examen = { tt: 'En examen', td: t('seulement si besoin'), c: '' }
    const decision = { tt: 'Décision', td: t('avec son motif écrit'), c: '' }
    const le = l.decision ? ' · ' + dateA(l.decision.le, langue) : ''
    switch (l.etat) {
      case 'attente':
        vendeur.c = 'cur'
        break
      case 'arrangement':
        vendeur.c = 'cur'
        vendeur.td = t('Il propose un arrangement')
        examen.td = t('si tu refuses')
        break
      case 'conteste':
        vendeur.c = 'done'
        vendeur.td = t('Il conteste')
        examen.c = 'cur'
        examen.td = t('en cours')
        break
      case 'silence':
        vendeur.c = 'bad'
        vendeur.td = tf('Pas de réponse avant le {d}', { d: dateA(l.echeance, langue) })
        examen.c = 'cur'
        examen.td = t('en priorité')
        break
      case 'examen':
        vendeur.c = 'done'
        vendeur.td = t(l.arrangement ? 'Arrangement proposé' : 'Il conteste')
        examen.c = 'cur'
        examen.td = t(l.arrangement ? 'Tu as refusé' : 'en cours')
        break
      case 'accepte':
        vendeur.c = 'done'
        vendeur.td = t('Il accepte')
        examen.c = 'skip'
        examen.td = t('pas nécessaire')
        decision.c = 'done'
        decision.td = t(l.souhait === 'remplace' ? 'Remplacement, comme tu l’as demandé' : 'Remboursement, comme tu l’as demandé')
        break
      case 'rembourse':
      case 'remplace':
      case 'refuse':
        vendeur.c = 'done'
        vendeur.td = t(l.arrangement ? 'Il propose un arrangement' : 'il accepte, conteste ou propose un arrangement')
        examen.c = l.origine === 'auto' ? 'skip' : 'done'
        examen.td = t(l.origine === 'auto' ? 'pas nécessaire' : 'seulement si besoin')
        decision.c = 'done'
        decision.td = t(l.etat === 'rembourse' ? 'Remboursement' : l.etat === 'remplace' ? 'Remplacement' : 'Demande non retenue') + le
        break
      default:
        break
    }
    return [recu, vendeur, examen, decision]
  })()

  const fixes = (
    <>
      <Feuille ouverte={retrait} fermer={() => setRetrait(false)} titre={t('Retirer mon signalement')}>
        <h2 className="pg-t" style={{ fontSize: 19 }}>
          {t('Retirer ton signalement ?')}
        </h2>
        <p className="pg-s">{t('Le dossier se ferme et le paiement suit son cours normal. Tu ne pourras pas le rouvrir pour ce colis.')}</p>
        <div className="mt16">
          <Bouton genre="danger" onClick={() => source.retirerLitige(l.id).then(() => (setRetrait(false), setMessage(t('Signalement retiré.')), recharger()))}>
            {t('Retirer')}
          </Bouton>
        </div>
        <div className="mt10">
          <Bouton genre="ghost" onClick={() => setRetrait(false)}>
            {t('Garder mon dossier')}
          </Bouton>
        </div>
      </Feuille>
      <Feuille ouverte={contester} fermer={() => setContester(false)} titre={t('Contester la décision')}>
        <h2 className="pg-t" style={{ fontSize: 19 }}>
          {t('Contester la décision')}
        </h2>
        <p className="pg-s">
          {l.decision
            ? tf('Une seule fois, jusqu’au {d}. Une autre personne de BelivaY reprend tout le dossier ; ton argent reste bloqué jusqu’à sa décision.', { d: dateA(finRecours(l), langue) })
            : t('Une seule fois. Une autre personne de BelivaY reprend tout le dossier.')}
        </p>
        <div className="fld">
          <div className="inp area">
            <textarea rows={4} maxLength={600} value={motif} placeholder={t('Explique ce qui n’a pas été vu. Tu peux ajouter des photos au dossier.')} onChange={(e) => setMotif(e.target.value)} aria-label={t('Pourquoi tu contestes')} />
          </div>
        </div>
        <div className="mt16">
          <Bouton
            icone="send"
            inactif={motif.trim().length < 10}
            onClick={() =>
              motif.trim().length >= 10 && source.contesterDecision(l.id, motif.trim()).then(() => (setContester(false), setMessage(t('Contestation envoyée : ton dossier est réexaminé.')), recharger()))
            }
          >
            {t('Envoyer ma contestation')}
          </Bouton>
        </div>
      </Feuille>
    </>
  )

  const argent = bloque && (
    <div className="note ink cl11-money">
      <Icone nom="lock" taille={18} />
      {l.souhait === 'remplace' && (l.etat === 'accepte' || l.etat === 'remplace') ? (
        <div>
          <b>{tf('Tes {m} F restent bloqués', { m: F(l.montant) })}</b>
          {t(' jusqu’à la remise du nouvel article.')}
        </div>
      ) : (
        <div>
          <b>{tf('{m} F bloqués', { m: F(l.montant) })}</b>
          {t(' · rien n’est versé au vendeur pendant le litige.')}
        </div>
      )}
    </div>
  )
  const preuves = (titre: string) => (
    <div className="card">
      <h3 className="cl11-k">{t(titre)}</h3>
      {l.preuves.length > 0 && (
        <div className="cl11-pics">
          {l.preuves.map((p, i) => (
            <div key={i} className="cl11-pic">
              <div className="photo">{p.photo ? <img src={p.photo} alt={t(p.titre)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Dessin id={p.dessin!} />}</div>
              <span>
                <b>{t(p.titre)}</b>
                {t(' · ' + p.sous)}
              </span>
            </div>
          ))}
        </div>
      )}
      {!l.preuves.length && <p className="t13 c3">{t('Aucune photo pour l’instant.')}</p>}
      {l.etat === 'examen' && l.arrangement && (
        <div className="mt12">
          <div className="cl11-row">
            <span className="ic-sq ">
              <Icone nom="message-square-text" taille={20} />
            </span>
            <span className="grow">
              <span className="t" style={{ display: 'block' }}>
                {t('La proposition du vendeur, que tu as refusée')}
              </span>
              <span className="s" style={{ display: 'block' }}>
                «&nbsp;{t(l.arrangement.texte)}&nbsp;»
              </span>
            </span>
          </div>
        </div>
      )}
      {enCours(l) && (
        <>
          <input
            ref={fichier}
            type="file"
            accept={TYPES_PHOTO.join(',')}
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              try {
                await source.ajouterPreuve(l.id, await reduirePhoto(f))
                setMessage(t('Photo ajoutée au dossier.'))
                recharger()
              } catch {
                setMessage(t('Cette image ne passe pas : choisis une photo JPG, PNG ou WebP de moins de 10 Mo.'))
              }
            }}
          />
          <div className="btns">
            <button type="button" className="btn ghost sm" style={{ width: 'auto' }} onClick={() => fichier.current?.click()}>
              <Icone nom="camera" taille={16} />
              <span>{t('Ajouter une photo')}</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
  const motifEcrit = l.decision && !enCours(l) && l.etat !== 'accepte' && (
    <div className="card">
      <h3 className="cl11-k">{t('Motif écrit par BelivaY')}</h3>
      <div className="cl11-q dec">«&nbsp;{t(l.decision.motif)}&nbsp;»</div>
      {contestable && (
        <div className="btns">
          <button type="button" className="btn secondary" onClick={() => setContester(true)}>
            <Icone nom="scale" taille={18} />
            <span>{t('Contester la décision')}</span>
          </button>
        </div>
      )}
      {l.decision.conteste && <p className="t13 c3">{t('Contestation envoyée : ton dossier est réexaminé.')}</p>}
    </div>
  )

  const bHero = (
    <>
      {hero}
    </>
  )
  const bMessage = (
    <>
      {message && (
        <div className="note green">
          <Icone nom="circle-check" taille={18} />
          <div>{message}</div>
        </div>
      )}
    </>
  )
  const bArrangement = (
    <>
      {l.etat === 'arrangement' && l.arrangement && (
        <>
          <div className="btns">
            <Link to={chemin('litige-arrangement', { id: l.id })} className="btn primary">
              <span>{t('Voir la proposition')}</span>
            </Link>
          </div>
          <div className="card">
            <div className="cl11-q">«&nbsp;{t(l.arrangement.texte)}&nbsp;»</div>
            <div className="kv">
              <span className="k">{t('Il te rembourse')}</span>
              <span className="v">{F(l.arrangement.montant)} F</span>
            </div>
            <div className="btns">
              <button type="button" className="btn secondary" onClick={() => source.repondreArrangement(l.id, true).then(() => (setMessage(tf('Arrangement accepté : le remboursement part {ou}.', { ou: remb.ou })), recharger()))}>
                <Icone nom="check" taille={18} />
                <span>{t('J’accepte')}</span>
              </button>
            </div>
            <div className="btns">
              <button type="button" className="btn ghost" onClick={() => source.repondreArrangement(l.id, false).then(() => (setMessage(t('Proposition refusée : BelivaY examine ton dossier.')), recharger()))}>
                <span>{t('Je refuse, BelivaY décide')}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
  const bRemplacement = (
    <>
      {l.remplacement && (
        <div className="btns">
          <Link to={chemin('remplacement', { id: l.id })} className="btn primary">
            <Icone nom="truck" taille={18} />
            <span>{t('Suivre le remplacement')}</span>
          </Link>
        </div>
      )}
    </>
  )
  const bRetour = (
    <>
      {l.retour && (
        <div className="btns">
          <Link to={chemin('retour', { id: l.id })} className={'btn ' + (l.retour.etape === 'depot' ? 'primary' : 'secondary')}>
            <Icone nom="rotate-ccw" taille={18} />
            <span>{t(l.retour.etape === 'depot' ? 'Rapporter l’article au relais' : 'Suivre le retour')}</span>
          </Link>
        </div>
      )}
    </>
  )
  const bMotif = (
    <>
      {motifEcrit}
    </>
  )
  const bRefuse = (
    <>
      {l.etat === 'refuse' && (
        <div className="card">
          <div className="cl11-row">
            <span className="ic-sq ">
              <Icone nom={contestable ? 'lock' : 'banknote'} taille={20} />
            </span>
            <span className="grow">
              <span className="t" style={{ display: 'block' }}>
                {contestable
                  ? tf('Tes {m} F restent bloqués jusqu’au {d}.', { m: F(l.montant), d: dateA(finRecours(l), langue) })
                  : tf('Ton paiement de {m} F est versé au vendeur.', { m: F(l.montant) })}
              </span>
              <span className="s" style={{ display: 'block' }}>
                {t(contestable ? 'Sans recours d’ici là, ils sont versés au vendeur et le litige est clos.' : 'Le litige est clos.')}
              </span>
            </span>
          </div>
          {comptoir && (
            <div className="cl11-row">
              <span className="ic-sq or">
                <Icone nom="map-pin" taille={20} />
              </span>
              <span className="grow">
                <span className="t" style={{ display: 'block' }}>
                  {tf('Ton article t’attend au {r}.', { r: t(l.relais) })}
                </span>
                <span className="s" style={{ display: 'block' }}>
                  {t('Le gérant te le rend au comptoir.')}
                </span>
              </span>
            </div>
          )}
        </div>
      )}
    </>
  )
  const bArgent = (
    <>
      {argent}
    </>
  )
  const bRemboursement = (
    <>
      {(l.etat === 'rembourse' || (l.etat === 'accepte' && l.souhait === 'rembourse')) && remb.ensuite && (
        <div className="hint-l">
          <Icone nom="wallet" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>
            {remb.ensuite} <Link to={chemin('wallet')}>{t('Voir mon Portefeuille')}</Link>
          </span>
        </div>
      )}
    </>
  )
  const bChronologie = (
    <>
      {l.souhait !== 'signal' && l.etat !== 'retire' && (
        <div className="card">
          <h3 className="cl11-k">{t('Où en est ton litige')}</h3>
          <div className="tl cl11-tl">
            {tl.map((e) => (
              <div key={e.tt} className={'ti ' + e.c}>
                <div className="tt">{t(e.tt)}</div>
                <div className="td">{e.td}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
  const bProduit = (
    <>
      <div className="card">
        <div className="cl11-pc">
          <span className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }}>
            <Dessin id={l.dessin} />
          </span>
          <span className="grow">
            <b className="t15 b8" style={{ display: 'block' }}>
              {t(l.produit)}
            </b>
            <span className="t13 c3" style={{ display: 'block', marginTop: '2px' }}>
              {tf('Colis {n} · {ref}', { n: l.colis, ref: l.ref })}
              {comptoir && t(' · constat au comptoir')}
            </span>
          </span>
        </div>
        <div className="cl11-sep"></div>
        <div className="kv" style={{ paddingTop: '0' }}>
          <span className="k">{t('Problème')}</span>
          <span className="v">{t(l.probleme)}</span>
        </div>
        <div className="kv">
          <span className="k">{t('Ton souhait')}</span>
          <span className="v">{t(SOUHAIT[l.souhait])}</span>
        </div>
        {l.pb !== 'jamais' && (
          <div className="kv">
            <span className="k">{t('Ton article')}</span>
            <span className="v">{tf('Gardé au {r}, sans frais', { r: t(l.relais) })}</span>
          </div>
        )}
        {l.description && <p className="t13 c3" style={{ margin: '8px 0 0', whiteSpace: 'pre-line' }}>{l.description}</p>}
      </div>
    </>
  )
  const bPreuves = (
    <>
      {l.etat !== 'arrangement' && l.etat !== 'accepte' && preuves(l.etat === 'examen' ? 'Ce que BelivaY met côte à côte' : 'Les preuves au dossier')}
    </>
  )
  const bComment = (
    <>
      <details className="more">
        <summary>
          <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Comment ça marche')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{t('Le vendeur a 48 h pour répondre : il accepte, il conteste avec des preuves, ou il propose un arrangement.')}</p>
          <p>{t('S’il ne répond pas, BelivaY décide, avec la règle en ta faveur. Une personne vérifie toujours et écrit pourquoi.')}</p>
          <p>{tf('BelivaY décide au plus {h} h après le délai du vendeur, avec un motif écrit.', { h: DECISION_H })}</p>
          <p>{tf('Une décision contre toi se conteste une fois, sous {h} h : une autre personne reprend le dossier, ton argent reste bloqué.', { h: RECOURS_H })}</p>
          <p>{t('Un arrangement proposé se répond sous 5 jours ; sans réponse, BelivaY examine ton dossier.')}</p>
          <p>{tf('Remboursement : {ou}, {quand}. Si le vendeur ou le transporteur est en tort, la livraison du colis est remboursée aussi.', { ou: remb.ou, quand: remb.quand })}</p>
          <p>{t('Les numéros et adresses écrits dans le dossier sont masqués automatiquement.')}</p>
          <p>
            <Link to={chemin('legal-doc', { d: 'retours' })}>{t('Règles des retours et des litiges')}</Link>
          </p>
        </div>
      </details>
    </>
  )
  const bEcrire = (
    <>
      <div className="btns">
        <Link to={chemin('fil', { id: l.id, from: 'litige' })} className="btn secondary">
          <Icone nom="message-square-text" taille={18} />
          <span>{t(l.etat === 'refuse' ? 'Poser une question sur la décision' : 'Écrire dans le dossier')}</span>
        </Link>
      </div>
    </>
  )
  const bRetirer = (
    <>
      {l.etat === 'attente' && (
        <div className="links">
          <a href="#" style={{ color: 'var(--red)' }} onClick={(e) => (e.preventDefault(), setRetrait(true))}>
            {t('Retirer mon signalement')}
          </a>
        </div>
      )}
    </>
  )
  const bLiens = (
    <>
      <div className="links">
        <Link to={chemin('litiges')}>{t('Mes litiges')}</Link>
        <Link to={chemin('aide')}>{t('Besoin d’aide ?')}</Link>
      </div>
    </>
  )
  // Grands écrans, colonne de droite : les échéances du dossier et qui contacter.
  const echeances: [string, string][] = [
    ...(l.etat === 'attente' ? [['Réponse du vendeur avant le', dateA(l.echeance, langue)] as [string, string]] : []),
    ...(enCours(l) && l.etat !== 'arrangement' && decisionAVenir && !recours ? [['Décision de BelivaY avant le', dateA(decisionAvant, langue)] as [string, string]] : []),
    ...(l.etat === 'arrangement' ? [['Réponse à l’arrangement', t('sous 5 jours')] as [string, string]] : []),
    ...(contestable ? [['Contestation possible jusqu’au', dateA(finRecours(l), langue)] as [string, string]] : []),
    ...(l.souhait === 'remplace' && l.remplacement && (l.etat === 'accepte' || l.etat === 'remplace') ? [['Article neuf envoyé avant le', dateA(l.remplacement.avant, langue)] as [string, string]] : []),
  ]
  const bBref = echeances.length > 0 && (
    <div className="card cl11-bref">
      <h3 className="cl11-k">{t('Les échéances')}</h3>
      {echeances.map(([k, v]) => (
        <div key={k} className="kv">
          <span className="k">{t(k)}</span>
          <span className="v">{v}</span>
        </div>
      ))}
    </div>
  )
  const bContacts = (
    <div className="card cl11-contacts">
      <h3 className="cl11-k">{t('Contacts')}</h3>
      <ul>
        <li>
          <Link to={chemin('fil', { id: l.id, from: 'litige' })}>
            <Icone nom="message-square-text" taille={18} />
            <span className="grow">
              <b>{t('Le vendeur et BelivaY')}</b>
              <small>{t('Écrire dans le dossier')}</small>
            </span>
            <Icone nom="chevron-right" taille={16} />
          </Link>
        </li>
        <li>
          <Link to={chemin('fil', { id: 'support', st: 'nouveau' })}>
            <Icone nom="headset" taille={18} />
            <span className="grow">
              <b>{t('Support BelivaY')}</b>
              <small>{menu ? tf('Support de {o} h à {f} h', { o: menu.support.ouverture, f: menu.support.fermeture }) : t('Écrire au support')}</small>
            </span>
            <Icone nom="chevron-right" taille={16} />
          </Link>
        </li>
        <li>
          <Link to={chemin('rappel')}>
            <Icone nom="phone-call" taille={18} />
            <span className="grow">
              <b>{t('Être rappelé')}</b>
              <small>{t('Un conseiller t’appelle')}</small>
            </span>
            <Icone nom="chevron-right" taille={16} />
          </Link>
        </li>
      </ul>
    </div>
  )
  return {
    l,
    fixes,
    morceaux: {
      bref: bBref,
      contacts: bContacts,
      hero: bHero,
      message: bMessage,
      arrangement: bArrangement,
      remplacement: bRemplacement,
      retour: bRetour,
      motif: bMotif,
      refuse: bRefuse,
      argent: bArgent,
      remboursement: bRemboursement,
      chronologie: bChronologie,
      produit: bProduit,
      preuves: bPreuves,
      comment: bComment,
      ecrire: bEcrire,
      retirer: bRetirer,
      liens: bLiens,
      telephone: (
        <>
          {bHero}
          {bMessage}
          {bArrangement}
          {bRemplacement}
          {bRetour}
          {bMotif}
          {bRefuse}
          {bArgent}
          {bRemboursement}
          {bChronologie}
          {bProduit}
          {bPreuves}
          {bComment}
          {bEcrire}
          {bRetirer}
          {bLiens}
        </>
      ),
    },
  }
}
