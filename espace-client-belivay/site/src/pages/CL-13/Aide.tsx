// Écran « Aide et support » (CL-13, 15.2 ; DP-12), balisage et logique du prototype du 1er octobre (cl13aide),
// repris à la main et rendu logique (DP-53) :
// - le support est ouvert ou fermé selon l'heure (7 h – 21 h, à Yaoundé) : hors des heures, la note de nuit et
//   les délais du lendemain (« ?st=horsheures » le montre en démonstration) ;
// - le dossier en cours, le nombre de conversations et de messages non lus, le nombre de questions par thème
//   viennent des données ; la recherche ouvre les questions fréquentes ;
// - WhatsApp (« ?st=wa ») : ce qui s'y fait et ne s'y fait pas ; le numéro officiel (+237 689 002 812) vient du
//   serveur, sinon de config/coordonnees.ts ; « Coordonnées officielles » : téléphone, e-mail, adresse, réseaux.
// - DP-54 : « Mes litiges », les horaires et délais à connaître (DP-12, DP-35), et la rubrique Diaspora (compte
//   ouvert depuis l'étranger, commande pour un proche, plafonds PLAFONDS_DIASPORA).
// Le corps de l'écran sert aussi à « Demander un rappel » (Rappel.tsx), qui pose sa feuille dessus.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { Module } from '../../composants/Module'
import { Contacts, Reseaux } from '../../composants/Reseaux'
import { useCoordonnees } from '../../composants/contenus'
import { chemin } from '../../config/pages'
import { heureSeule } from '../../i18n/dates'
import { PLAFONDS_DIASPORA, source, type DonneesAide, type ThemeFaq } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { questionsVisibles } from './Faq'
import { Bloc, EcranCompte } from './Larges'
import { useDes } from '../../composants/ecran'

// Page d'information sur la diaspora (qui peut ouvrir un compte, ce qu'il faut, ce que voit le proche).
const INFOS_DIASPORA = chemin('diaspora-infos')

export interface Aides {
  aide: DonneesAide
  faq: ThemeFaq[]
}

export function useAide(): Aides | null {
  const [d, setD] = useState<Aides | null>(null)
  useEffect(() => {
    let vivant = true
    Promise.all([source.aide(), source.faq()]).then(([aide, faq]) => vivant && setD({ aide, faq }))
    return () => {
      vivant = false
    }
  }, [])
  return d
}

function Ligne(p: { vers: string; icone: string; or?: boolean; titre: string; sous: string; droite?: ReactNode }) {
  const { t } = usePreferences()
  return (
    <Link to={p.vers} className="li">
      <span className={'ic ' + (p.or ? 'or' : '')}>
        <Icone nom={p.icone} taille={20} />
      </span>
      <span className="grow">
        <span className="lt" style={{ display: 'block' }}>
          {t(p.titre)}
        </span>
        <span className="ls" style={{ display: 'block' }}>
          {t(p.sous)}
        </span>
      </span>
      {p.droite}
      <span className="chev">
        <Icone nom="chevron-right" taille={18} />
      </span>
    </Link>
  )
}

// Le corps de l'aide (cl13aide du prototype) ; « tard » : hors des heures du support.
export function CorpsAide({ d, tard }: { d: Aides; tard: boolean }) {
  const { t, tf, langue } = usePreferences()
  const { interrupteurs, connecte, typeCompte } = useSession()
  // Compte diaspora (DP-54) : sa rubrique en tête (aide et questions), sans « ouvrir un compte » ni litiges à lui.
  const diaspora = connecte && typeCompte === 'diaspora'
  const { aide } = d
  const faq = diaspora ? [...d.faq].sort((a, b) => (b.cle === 'diaspora' ? 1 : 0) - (a.cle === 'diaspora' ? 1 : 0)) : d.faq
  const conv = aide.conversations
  const portefeuille = interrupteurs['FF-WALLET']
  const nombre = (th: ThemeFaq) => questionsVisibles(th, interrupteurs as Record<string, boolean>).length
  const large = useDes('tab-l')
  const coord = useCoordonnees()
  // « Parler à quelqu’un » : dans le flux sur téléphone ; dès 1024 px, carte « Nous joindre » à droite (déplacée).
  const joindre = (
    <>
        <div className="sec">
          <h2>{t('Parler à quelqu’un')}</h2>
          {tard ? (
            <span className="pill ink">
              <Icone nom="clock" taille={13} />
              {t('Fermé · rouvre à 7 h')}
            </span>
          ) : (
            <span className="pill green">
              <i className="d"></i>
              {t('Ouvert · 7 h – 21 h')}
            </span>
          )}
        </div>
        <div className="card tight">
          <Ligne
            vers={chemin('fil', { id: 'support', st: 'nouveau' })}
            icone="messages-square"
            or
            titre="Écrire au support"
            sous={tard ? 'Écris maintenant : réponse avant 9 h demain, gardée par écrit.' : 'Réponse sous 2 h, gardée par écrit.'}
          />
          <Ligne vers={chemin('aide', { st: 'wa' })} icone="message-circle" titre="WhatsApp" sous={tard ? 'Une personne te répond dès 7 h demain.' : 'Une personne te répond. Pour une question, jamais pour une commande.'} />
          <Ligne vers={chemin('rappel')} icone="phone-call" titre="Demander un rappel" sous={tard ? 'Choisis un créneau pour demain. Ton numéro reste caché.' : 'Appel masqué : ton numéro reste caché.'} />
          {connecte && (
          <Ligne
            vers={chemin('messagerie', { from: 'aide' })}
            icone="inbox"
            titre="Mes conversations"
            sous={
              conv.nombre === 0
                ? t('Aucune conversation')
                : tf(conv.nombre > 1 ? '{n} conversations' : '{n} conversation', { n: conv.nombre }) +
                  (conv.nonLus ? ' · ' + tf(conv.nonLus > 1 ? '{n} non lues' : '{n} non lue', { n: conv.nonLus }) : '')
            }
            droite={conv.nonLus > 0 ? <span className="badge-num">{conv.nonLus}</span> : undefined}
          />
          )}
        </div>
        <details className="more">
          <summary>
            <Icone nom="clock" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Horaires et délais à connaître')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            {(
              [
                ['Support (messages, WhatsApp, rappel)', '7 h – 21 h, 7 j/7'],
                ['Première réponse écrite', 'sous 2 h'],
                ['Signaler un problème', '7 jours après le retrait'],
                ['Défaut caché', '100 jours après le retrait'],
                ['Réponse du vendeur à un litige', '48 h'],
                ['Décision de BelivaY', '24 h au plus après'],
                ['Recours contre une décision', 'une fois, sous 48 h'],
                portefeuille ? ['Remboursement', 'au portefeuille, dès la décision'] : ['Remboursement Mobile Money', 'dans l’heure après la décision'],
                ['Remboursement d’un paiement par carte', 'sur la même carte'],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="kv">
                <span className="k">{t(k)}</span>
                <span className="v ">{t(v)}</span>
              </div>
            ))}
          </div>
        </details>
        <div className="sec">
          <h2>{t('Coordonnées officielles')}</h2>
        </div>
        <div className="card rs-carte">
          <p className="rs-accroche">{t(coord.accroche)}</p>
          <Contacts />
          <div className="rs-suivre">
            <b>{t('Nous suivre')}</b>
            <Reseaux />
          </div>
        </div>
    </>
  )
  const blocDiaspora = (
    <>
      <div className="sec">
        <h2>{t(diaspora ? 'Ton compte diaspora' : 'Tu vis à l’étranger ?')}</h2>
        <span className="pill ink">
          <Icone nom="globe" taille={13} />
          {t('Diaspora')}
        </span>
      </div>
      <div className="card tight">
        {diaspora ? <Ligne vers={chemin('espace-diaspora')} icone="globe" or titre="Espace diaspora" sous="Proches, paniers à payer, commandes envoyées, devise" /> : <Ligne vers={chemin('inscription-diaspora')} icone="plane" or titre="Ouvrir un compte diaspora" sous="Ton e-mail et ton numéro étranger, vérifié par SMS." />}
        <Ligne vers={chemin('proches')} icone="users" titre="Commander pour un proche" sous="Avec son accord, 5 proches au plus. Son adresse ne t’est jamais montrée." />
        <Ligne
          vers={chemin('faq', { t: 'diaspora' })}
          icone="credit-card"
          titre="Payer depuis l’étranger"
          sous={tf('Carte 3-D Secure à ton nom · {p} F par paiement, {m} F par mois', { p: F(PLAFONDS_DIASPORA.paiement), m: F(PLAFONDS_DIASPORA.mois) })}
        />
        <Ligne vers={INFOS_DIASPORA} icone="info" titre="Tout savoir sur la diaspora" sous="Qui peut ouvrir un compte, ce qu’il faut, ce que voit ton proche." />
      </div>
    </>
  )
  return (
    <Bloc classe="c13-aide">
    <Bloc classe="c13-k">
      <p className="cl13-intro">{t('Une réponse tout de suite, ou une personne de 7 h à 21 h.')}</p>
      {tard && (
        <div className="note ink">
          <Icone nom="moon" taille={18} />
          <div>
            {aide.support.ouvert
              ? // « ?st=horsheures » en pleine journée : la nuit du prototype (22 h 40).
                t('Il est 22\u00A0h\u00A040\u00A0: les personnes du support répondent de 7\u00A0h à 21\u00A0h. Les réponses ci-dessous restent là, et ton message part tout de suite.')
              : tf('Il est {h}\u00A0: les personnes du support répondent de 7\u00A0h à 21\u00A0h. Les réponses ci-dessous restent là, et ton message part tout de suite.', {
                  h: heureSeule(aide.support.instant, langue).replace(/^0/, ''),
                })}
          </div>
        </div>
      )}
      <Link to={chemin('faq', { q: '' })} className="inp ph mt12" style={{ display: 'flex' }}>
        <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
        <span className="grow">{t('Code, garde, remboursement…')}</span>
      </Link>
      {diaspora && blocDiaspora}
      <div className="sec">
        <h2>{t('Un problème sur une commande ?')}</h2>
      </div>
      <div className="card tight">
        {/* Un visiteur n'a ni dossier ni conversation : rien de personnel sans compte. */}
        {connecte && aide.dossier && <Ligne vers={chemin('litige-suivi', { id: aide.dossier.id })} icone="scale" or titre={aide.dossier.libelle} sous={aide.dossier.sous} />}
        <Ligne vers={chemin('commandes')} icone="package" titre={diaspora ? 'Les commandes de mes proches' : 'Une autre commande'} sous={diaspora ? 'Leurs étapes et la preuve de retrait, sans code ni adresse.' : 'Ouvre-la et touche « Signaler un problème ».'} />
        {diaspora ? <Ligne vers={chemin('diaspora-infos')} icone="info" titre="Un problème sur un colis de ton proche" sous="Ton proche le signale au retrait ou dans les 7 jours ; un remboursement revient sur ta carte." /> : <Ligne vers={chemin('litiges')} icone="list" titre="Mes litiges" sous="Tes dossiers, ouverts et réglés, et leurs décisions." />}
      </div>
      <div className="sec">
        <h2>{t('Questions fréquentes')}</h2>
        <Link to={chemin('faq', { t: faq[0]?.cle ?? 'paiement' })} className="a">
          {t('Toutes')}
          <Icone nom="chevron-right" taille={16} />
        </Link>
      </div>
      <div className="cl13-grid">
        {faq.map((th) => (
          <Link key={th.cle} to={chemin('faq', { t: th.cle })} className="cl13-th">
            <span className="ic-sq or">
              <Icone nom={th.icone} taille={19} />
            </span>
            <b>{t(th.titre)}</b>
            <span>{tf(nombre(th) > 1 ? '{n} questions' : '{n} question', { n: nombre(th) })}</span>
          </Link>
        ))}
      </div>
      {!large && joindre}
      {!diaspora && blocDiaspora}
      <Module ff={['FF-IA', 'FF-EX06']}>
        <details className="more">
          <summary>
            <Icone nom="lock" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{t('Après le lancement · 2 services')}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            <Module ff="FF-IA">
              <Ligne
                vers={chemin('assistant')}
                icone="sparkles"
                titre="Assistant BelivaY"
                sous="Il propose, tu décides"
                droite={
                  <span className="pill ink sm">
                    <Icone nom="lock" taille={13} />
                    {t('Bientôt')}
                  </span>
                }
              />
            </Module>
            <Module ff="FF-EX06">
              <Ligne
                vers={chemin('wa')}
                icone="message-circle"
                titre="Commander sur WhatsApp"
                sous="Proposition, « OUI », paiement normal"
                droite={
                  <span className="pill ink sm">
                    <Icone nom="lock" taille={13} />
                    {t('Bientôt')}
                  </span>
                }
              />
            </Module>
          </div>
        </details>
      </Module>
      <div className="sec">
        <h2>{t('État des services')}</h2>
        <span className={'pill ' + (aide.services.every((x) => x.ok) ? 'green' : 'amber')}>
          <i className="d"></i>
          {t(aide.services.every((x) => x.ok) ? 'Tout fonctionne' : 'Perturbation en cours')}
        </span>
      </div>
      <div className="card tight">
        {aide.services.map((x) => (
          <div key={x.nom} className="li">
            <span className={'ic ' + (x.ok ? 'green' : 'amber')}>
              <Icone nom={x.ok ? 'circle-check' : 'circle-alert'} taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(x.nom)}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t(x.detail)}
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="card vedette">
        <div className="row">
          <span className="ic-sq red">
            <Icone nom="shield-alert" taille={20} />
          </span>
          <span className="grow">
            <b className="t15 b8" style={{ display: 'block' }}>
              {t('Quelqu’un t’a demandé ton code\u00A0?')}
            </b>
            <span className="t13 c3">{t('Code secret Mobile Money, code de retrait, mot de passe : ne le donne pas. Signale-le, on bloque tout de suite.')}</span>
          </span>
        </div>
        <div className="btns">
          <Link to={chemin('fil', { id: 'support', st: 'nouveau', sujet: 'Arnaque' })} className="btn secondary">
            <Icone nom="flag" taille={18} />
            <span>{t('Signaler une arnaque')}</span>
          </Link>
        </div>
      </div>
      <div className="note red">
        <Icone nom="shield-alert" taille={18} />
        <div>
          <b>{t('BelivaY ne te demande jamais ton code secret Mobile Money')}</b>
          {t(', ni par appel, ni par SMS, ni sur WhatsApp.')}
        </div>
      </div>
      <p className="scrim-note">{t('Tu veux vendre sur BelivaY ? L’espace vendeur est une application à part : « Ouvre ta boutique en deux minutes ».')}</p>
    </Bloc>
    {large && (
      <aside className="c13-k c13-joindre" aria-label={t('Nous joindre')}>
        {joindre}
      </aside>
    )}
    </Bloc>
  )
}

// Feuille WhatsApp : ce qui s'y fait, ce qui ne s'y fait jamais.
function FeuilleWhatsApp({ lien, numero }: { lien: string; numero: string }) {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const regle = (ok: boolean, texte: string) => (
    <div className="check">
      <span className="cb" style={{ borderColor: ok ? 'var(--green-line)' : 'var(--red-line)', color: ok ? 'var(--green)' : 'var(--red)' }}>
        <Icone nom={ok ? 'check' : 'x'} taille={14} trait={3} />
      </span>
      <span className="grow">{t(texte)}</span>
    </div>
  )
  return (
    <Feuille ouverte fermer={() => naviguer(chemin('aide'), { replace: true })} titre={t('Parler sur WhatsApp')}>
      <div className="row">
        <span className="ic-sq green">
          <Icone nom="message-circle" taille={22} />
        </span>
        <span className="grow">
          <b className="t17 b8" style={{ display: 'block' }}>
            {t('Parler sur WhatsApp')}
          </b>
          <span className="t13 c3">{t('Une personne de BelivaY · 7 h – 21 h, 7 j/7 · gratuit')}</span>
        </span>
      </div>
      <div className="mt12">
        {regle(true, 'Poser une question, te faire guider')}
        {regle(false, 'Jamais de commande ni de paiement')}
        {regle(false, 'Jamais de photo de litige : elle se prend dans l’application, datée et gardée au dossier')}
        {regle(false, 'Jamais ton code secret ni ton code de retrait')}
      </div>
      <div className="btns mt12">
        <button
          type="button"
          className="btn primary"
          onClick={() => window.open(lien + '?text=' + encodeURIComponent(t('Bonjour BelivaY, j’ai une question.')), '_blank', 'noopener,noreferrer')}
        >
          <Icone nom="message-circle" taille={18} />
          <span>{t('Ouvrir WhatsApp')}</span>
        </button>
      </div>
      <p className="t13 c3 mt12">{tf('Numéro officiel BelivaY : {n}', { n: numero })}</p>
      <div className="btns">
        <Link to={chemin('fil', { id: 'support', st: 'nouveau' })} className="btn secondary">
          <span>{t('Plutôt écrire ici')}</span>
        </Link>
      </div>
    </Feuille>
  )
}

export function Aide() {
  const [params] = useSearchParams()
  const st = params.get('st')
  const d = useAide()
  const coord = useCoordonnees()
  if (!d) return null
  const tard = st === 'horsheures' || !d.aide.support.ouvert
  return (
    <EcranCompte route="aide" parEtat etat={st === 'wa' ? 'aide?st=wa' : tard ? 'aide?st=horsheures' : 'aide'} fixes={st === 'wa' ? <FeuilleWhatsApp lien={d.aide.whatsapp ?? coord.whatsapp} numero={coord.telephone} /> : null}>
      <CorpsAide d={d} tard={tard} />
    </EcranCompte>
  )
}
