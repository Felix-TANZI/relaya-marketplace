// Écran « Moyens de paiement » (CL-13 ; CCO-14, CCO-15, CIN-43), balisage du prototype du 1er octobre, repris à
// la main et rendu logique (DP-53) :
// - la liste vient des données : opérateur, numéro masqué, rôle (numéro du compte, ou pour payer seulement),
//   « par défaut » sur le bon numéro ;
// - toucher un numéro ouvre ses actions : payer par défaut avec lui, le retirer (après confirmation) ; le numéro
//   du compte ne se retire pas, il se change (« Changer de numéro ») ;
// - « Ajouter un numéro Mobile Money » : vrai champ, opérateur reconnu au préfixe, refus s'il n'est ni MTN ni
//   Orange ou s'il est déjà là, puis un code par SMS à ce numéro ; le bon code l'ajoute.
// Pour le client (DP-54) : ce que veut dire « par défaut », remboursements au Portefeuille (DP-06), frais et
// plafonds de chaque moyen (DP-06, DP-23, comptoir), règles de sécurité (code secret, demandes à refuser).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Dessin } from '../../composants/Dessin'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { CasesCode, CodeDemo, MessageCode, useSaisieCode } from '../../composants/SaisieCode'
import { Bouton } from '../../composants/socle'
import { chemin } from '../../config/pages'
import { chiffres, erreurNumero, espacer, nomMoMo, operateur } from '../../donnees/numeros'
import { source, type EnvoiCode, type MoyenPaiement } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useMoyensAutres } from './MoyensAutres'
import { Bloc, EcranCompte } from './Larges'
import { useDes } from '../../composants/ecran'

// Code du nouveau numéro, dans la feuille d'ajout.
function CodeAjout(p: { numero: string; envoi: EnvoiCode; ajoute: () => void; changer: () => void }) {
  const { t } = usePreferences()
  const s = useSaisieCode({
    envoi: p.envoi,
    valider: (code) => source.confirmerMoyen(p.numero, code),
    renvoyer: () => source.envoyerCode('moyen', p.numero),
    reussi: p.ajoute,
  })
  return (
    <>
      <h3 className="t17 b8" style={{ margin: '0' }}>
        {t('Entre le code reçu par SMS')}
      </h3>
      <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
        {t('Envoyé à ') + s.envoi.destination + '. '}
        <a
          href={chemin('moyens-paiement', { st: 'ajout' })}
          className="cl03-link"
          onClick={(e) => (e.preventDefault(), p.changer())}
          style={{ minHeight: 0, display: 'inline' }}
        >
          {t('Modifier')}
        </a>
      </p>
      <CasesCode s={s} />
      <MessageCode s={s} />
      <div className="btns">
        <Bouton icone="check" inactif={!s.pret} onClick={s.valider}>
          {t('Ajouter ce numéro')}
        </Bouton>
      </div>
      <CodeDemo s={s} />
    </>
  )
}

function Ligne({ m, onClick }: { m: MoyenPaiement; onClick: () => void }) {
  const { t } = usePreferences()
  return (
    <div
      className="cl13-pm"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      style={{ padding: '8px 0', cursor: 'pointer' }}
      aria-label={t(nomMoMo(m.operateur)) + ' ' + m.numeroMasque}
    >
      <span className={'cl13-op ' + (m.operateur === 'MTN' ? 'mtn' : 'orange')}>{t(m.operateur)}</span>
      <span className="num">
        <b style={{ display: 'block', color: 'var(--ink)' }}>
          {t(nomMoMo(m.operateur) + ' · ')}
          <span className="nw">{t(m.numeroMasque)}</span>
        </b>
        <span className="sub" style={{ display: 'block', marginTop: '2px' }}>
          {t(m.duCompte ? 'Numéro du compte · proposé à chaque paiement' : 'Pour payer seulement · les messages vont au numéro du compte')}
        </span>
      </span>
      {m.parDefaut && <span className="def">{t('par défaut')}</span>}
    </div>
  )
}

export function MoyensPaiement() {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const ajout = params.get('st') === 'ajout'
  const large = useDes('tab-l')
  const [moyens, setMoyens] = useState<MoyenPaiement[] | null>(null)
  const [version, setVersion] = useState(0)
  const recharger = () => setVersion((v) => v + 1)
  useEffect(() => {
    let vivant = true
    source.moyensPaiement().then((m) => vivant && setMoyens(m))
    return () => {
      vivant = false
    }
  }, [version])
  // Feuille d'ajout : numéro, puis code.
  const [saisi, setSaisi] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState<EnvoiCode | null>(null)
  const envoiEnCours = useRef(false)
  // Feuille d'un numéro : ses actions, puis la confirmation du retrait.
  const [choisi, setChoisi] = useState<MoyenPaiement | null>(null)
  const [retrait, setRetrait] = useState(false)
  const autres = useMoyensAutres()
  if (!moyens) return null

  const fermerAjout = () => {
    setSaisi('')
    setErreur(null)
    setEnvoi(null)
    naviguer(chemin('moyens-paiement'), { replace: true })
  }
  // Un seul envoi : ajouterMoyen contrôle le numéro et envoie le code ; un deuxième toucher pendant l'envoi ne
  // renvoie rien (le serveur répondrait 429 trop_tot).
  const recevoir = async () => {
    const local = erreurNumero(saisi)
    if (local) return setErreur(local)
    if (envoiEnCours.current) return
    envoiEnCours.current = true
    try {
      const r = await source.ajouterMoyen(chiffres(saisi))
      if (!r.ok) return setErreur('Ce numéro est déjà dans tes moyens de paiement.')
      setEnvoi(r.envoi)
    } finally {
      envoiEnCours.current = false
    }
  }
  const op = operateur(saisi)
  const fermerChoix = () => (setChoisi(null), setRetrait(false))

  const feuilleAjout = (
    <Feuille ouverte={ajout} fermer={fermerAjout} titre={t('Ajouter un numéro Mobile Money')}>
      {envoi ? (
        <CodeAjout
          numero={chiffres(saisi)}
          envoi={envoi}
          ajoute={() => (recharger(), fermerAjout())}
          changer={() => setEnvoi(null)}
        />
      ) : (
        <>
          <h3 className="t17 b8" style={{ margin: '0' }}>
            {t('Ajouter un numéro Mobile Money')}
          </h3>
          <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
            {t('MTN ou Orange : l’opérateur est reconnu tout seul.')}
          </p>
          <div className="fld">
            <label htmlFor="mp-numero">{t('Numéro')}</label>
            <div className={'inp' + (erreur ? ' err' : saisi ? '' : ' ph')}>
              <Dessin id="81b1dee44510" />
              <b className="t15">{t('+237')}</b>
              <input
                id="mp-numero"
                autoFocus
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder={t('6XX XX XX XX')}
                value={saisi}
                onChange={(e) => (setSaisi(espacer(e.target.value)), setErreur(null))}
                onKeyDown={(e) => e.key === 'Enter' && recevoir()}
              />
              {(op === 'MTN' || op === 'Orange') && (
                <span className="suf">
                  <span className="cl03-op">
                    <Icone nom="circle-check" taille={14} trait={2.2} />
                    {t(nomMoMo(op))}
                  </span>
                </span>
              )}
            </div>
            {erreur && (
              <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                {t(erreur)}
              </div>
            )}
          </div>
          <div className="note ink">
            <Icone nom="message-circle" taille={18} />
            <div>{t('On envoie un code par SMS à ce numéro pour vérifier qu’il est à toi.')}</div>
          </div>
          <div className="btns">
            <button type="button" className="btn primary" onClick={recevoir}>
              <Icone nom="send" taille={18} />
              <span>{t('Recevoir le code')}</span>
            </button>
          </div>
          <div className="links">
            <Link to={chemin('moyens-paiement')} replace>
              {t('Annuler')}
            </Link>
          </div>
        </>
      )}
    </Feuille>
  )

  const feuilleChoix = (
    <Feuille ouverte={!!choisi} fermer={fermerChoix} titre={t('Ce numéro')}>
      {choisi && !retrait && (
        <>
          <h3 className="t17 b8" style={{ margin: '0' }}>
            {t(nomMoMo(choisi.operateur) + ' · ') + choisi.numeroMasque}
          </h3>
          <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
            {t(choisi.duCompte ? 'Numéro du compte : messages, codes de retrait, comptoir.' : 'Pour payer seulement : les messages vont au numéro du compte.')}
          </p>
          <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
            {t(choisi.parDefaut ? 'Par défaut : il est proposé en premier à chaque paiement. Tu peux en choisir un autre au moment de payer.' : 'Par défaut, il serait proposé en premier à chaque paiement. Tu pourras toujours en choisir un autre au moment de payer.')}
          </p>
          <div className="mt16">
            {!choisi.parDefaut && (
              <Bouton icone="check" onClick={() => source.moyenParDefaut(choisi.id).then(() => (recharger(), fermerChoix()))}>
                {t('Payer par défaut avec ce numéro')}
              </Bouton>
            )}
          </div>
          <div className="mt10">
            {choisi.duCompte ? (
              <Bouton genre="secondary" icone="smartphone" vers={chemin('numero-changer')}>
                {t('Changer de numéro')}
              </Bouton>
            ) : (
              <Bouton genre="danger" icone="trash-2" onClick={() => setRetrait(true)}>
                {t('Retirer ce numéro')}
              </Bouton>
            )}
          </div>
          <div className="links">
            <a href={chemin('moyens-paiement')} onClick={(e) => (e.preventDefault(), fermerChoix())}>
              {t('Fermer')}
            </a>
          </div>
        </>
      )}
      {choisi && retrait && (
        <>
          <h3 className="t17 b8" style={{ margin: '0' }}>
            {t('Retirer le ') + choisi.numeroMasque + ' ?'}
          </h3>
          <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
            {t('Il ne sera plus proposé au paiement. Les commandes déjà payées avec lui ne changent pas ; leurs remboursements arrivent sur ton Portefeuille BelivaY.')}
          </p>
          <div className="mt16">
            <Bouton genre="danger" icone="trash-2" onClick={() => source.retirerMoyen(choisi.id).then(() => (recharger(), fermerChoix()))}>
              {t('Retirer')}
            </Bouton>
          </div>
          <div className="mt10">
            <Bouton genre="ghost" onClick={() => setRetrait(false)}>
              {t('Garder ce numéro')}
            </Bouton>
          </div>
        </>
      )}
    </Feuille>
  )

  const verifies = moyens.length === 1 ? 'Ce numéro est vérifié par un code SMS.' : moyens.length === 2 ? 'Les deux numéros sont vérifiés par un code SMS.' : 'Tous tes numéros sont vérifiés par un code SMS.'
  return (
    <EcranCompte route="moyens-paiement" parEtat etat={ajout ? 'moyens-paiement?st=ajout' : 'moyens-paiement'} fixes={<>{feuilleAjout}{feuilleChoix}{autres.feuilles}</>}>
      <p className="cl13-intro">{t('Tu valides chaque paiement sur ton téléphone, avec ton code secret. BelivaY ne le voit jamais.')}</p>
      <Bloc classe="c13-g2">
      <Bloc classe="c13-k">
      <div className="card vedette">
        <div className="cl13-kh">
          <span className="kick">{t('Mobile Money')}</span>
        </div>
        <div style={{ marginTop: '6px' }}>
          {[...moyens]
            .sort((a, b) => Number(b.duCompte) - Number(a.duCompte))
            .map((m) => (
              <Ligne key={m.id} m={m} onClick={() => setChoisi(m)} />
            ))}
        </div>
        {moyens.length > 0 && (
          <div className="hint-l">
            <Icone nom="check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t(verifies)}</span>
          </div>
        )}
      </div>
      {/* Dès 1024 px, l'ajout d'un numéro suit la carte Mobile Money (déplacé, pas dupliqué). */}
      {large && (
      <div className="btns mt16">
        <Link to={chemin('moyens-paiement', { st: 'ajout' })} className={'btn ' + (ajout ? 'secondary' : 'primary')}>
          <Icone nom="plus" taille={18} />
          <span>{t('Ajouter un numéro Mobile Money')}</span>
        </Link>
      </div>
      )}
      </Bloc>
      <Bloc classe="c13-k">
      {autres.corps}
      </Bloc>
      </Bloc>
      <div className="note green">
        <Icone nom="shield-check" taille={18} />
        <div>
          {/* DP-06, DP-23 : remboursement sur le Portefeuille, ou sur la carte qui a payé. */}
          <b>{t('Remboursement\u00A0: sur ton Portefeuille BelivaY, ou sur la carte qui a payé.')}</b>
          {t(' Jamais d’espèces, ni au relais ni au livreur.')}
        </div>
      </div>
      <details className="more">
        <summary>
          <Icone nom="receipt" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Frais et plafonds')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{t('Mobile Money : aucun frais BelivaY. Le plafond est celui de ton compte chez l’opérateur.')}</p>
          <p>{tf('Carte : frais de service de 2 %, affichés avant de payer ; {m} F au plus par paiement.', { m: F(150000) })}</p>
          {autres.plafondPortefeuille !== null && <p>{tf('Portefeuille : sans frais ; il garde {m} F au plus.', { m: F(autres.plafondPortefeuille) })}</p>}
          <p>{t('Au comptoir : la livraison se paie d’avance, le reste au retrait, jusqu’au plafond de ton compte. Jamais en espèces.')}</p>
        </div>
      </details>
      <details className="more">
        <summary>
          <Icone nom="lock" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Payer en sécurité')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{t('Ton code secret Mobile Money se tape seulement sur ton téléphone. BelivaY ne le demande jamais, ni par appel, ni par SMS, ni par WhatsApp.')}</p>
          <p>{t('Valide seulement une demande que tu viens de lancer sur BelivaY, avec le bon montant. Une demande que tu n’attends pas : refuse-la.')}</p>
          <p>{t('Chaque nouveau numéro est vérifié par un code SMS avant de servir. Une carte est confirmée par ta banque (3-D Secure) à chaque paiement.')}</p>
          <p>
            <Link to={chemin('aide')}>{t('Signaler un appel ou un message suspect')}</Link>
          </p>
        </div>
      </details>
      <details className="more">
        <summary>
          <Icone nom="credit-card" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Un proche à l’étranger peut payer pour toi')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>{t('Depuis ton panier, touche « Quelqu’un paie pour toi ? ». Il paie par carte Visa ou Mastercard, avec 3-D Secure.')}</p>
          <p>
            <Link to={chemin('payeur')}>{t('Voir comment ça marche')}</Link>
          </p>
          <p>
            {t('Frais de service de 2 %, affichés avant de payer ; 150 000 F au plus par paiement. Un remboursement revient sur sa carte. Il ne reçoit jamais ton code de retrait.')}
          </p>
        </div>
      </details>
      {!large && (
      <div className="btns mt16">
        <Link to={chemin('moyens-paiement', { st: 'ajout' })} className={'btn ' + (ajout ? 'secondary' : 'primary')}>
          <Icone nom="plus" taille={18} />
          <span>{t('Ajouter un numéro Mobile Money')}</span>
        </Link>
      </div>
      )}
    </EcranCompte>
  )
}
