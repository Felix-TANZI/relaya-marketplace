// Écran « Questions fréquentes » (CL-13, 15.2), balisage et logique du prototype du 1er octobre (route faq,
// CL13_FAQ), repris à la main et rendu logique (DP-53) :
// - six thèmes (?t=…), une question ouverte (?a=n), les réponses lues dans les données ;
// - la recherche (?q=…) se tape vraiment : d'abord les questions qui contiennent le mot, à défaut les réponses ;
//   accents et apostrophes ignorés ; « n réponses », ou « Aucune réponse » et le support ;
// - « Pas trouvé ta réponse ? » ouvre une demande au support sur le sujet du thème (réponse sous 2 h, de 7 h à
//   21 h, 7 j/7 ; DP-12), et mène aux autres façons de joindre BelivaY (aide : WhatsApp, rappel) ;
// - une question liée à un module (portefeuille) ne s'affiche que dans l'état de son interrupteur (DP-17, DP-50).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type ThemeFaq } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Bloc, EcranCompte } from './Larges'
import { useDes } from '../../composants/ecran'

// Les questions d'un thème qui valent avec les interrupteurs du moment.
export const questionsVisibles = (th: ThemeFaq, ff: Record<string, boolean>) => th.questions.filter((x) => !x.module || !!ff[x.module.ff] === x.module.ouvert)

// Sujet de la demande au support ouverte depuis un thème (sujets de Fil.tsx).
const SUJET_DU_THEME: Record<string, string> = {
  paiement: 'Paiement',
  retrait: 'Retrait et code',
  garde: 'Frais de garde',
  livraison: 'Livraison et relais',
  litige: 'Retours',
  retour: 'Retours',
  compte: 'Compte',
  diaspora: 'Diaspora',
}

// Comparaison sans accents ni apostrophes, comme cl13n du prototype.
const norme = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')

function Question({ q, ouverte, theme }: { q: ThemeFaq['questions'][number]; ouverte: boolean; theme?: string }) {
  const { t } = usePreferences()
  return (
    <details className="more" open={ouverte || undefined}>
      <summary>
        <Icone nom="circle-help" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
        <span className="grow">{t(q.q)}</span>
        <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
      </summary>
      <div className="more-b">
        {theme && (
          <p className="t12 b8 cor" style={{ margin: '0 0 4px' }}>
            {t(theme)}
          </p>
        )}
        <p>{t(q.r)}</p>
        {q.lien && (
          <div className="links" style={{ justifyContent: 'flex-start', marginTop: '4px' }}>
            <Link to={q.lien.vers}>
              {t(q.lien.texte)}
              <Icone nom="chevron-right" taille={15} />
            </Link>
          </div>
        )}
      </div>
    </details>
  )
}

export function Faq() {
  const { t } = usePreferences()
  const { interrupteurs } = useSession()
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const q = params.get('q')
  const [brut, setFaq] = useState<ThemeFaq[] | null>(null)
  const faq = brut && brut.map((th) => ({ ...th, questions: questionsVisibles(th, interrupteurs as Record<string, boolean>) }))
  const champ = useRef<HTMLSpanElement>(null)
  const large = useDes('tab-l')
  useEffect(() => {
    source.faq().then(setFaq)
  }, [])
  // Ouverte depuis l'aide (« ?q= »), la recherche prend la main : le curseur est dans le champ.
  useEffect(() => {
    if (q !== null && brut && champ.current && document.activeElement !== champ.current) {
      if (champ.current.textContent !== q) champ.current.textContent = q
      if (q === '') champ.current.focus()
    }
  }, [q, brut])
  if (!faq) return null
  const theme = faq.find((x) => x.cle === params.get('t')) ?? faq[0]
  const a = Number(params.get('a') || 0)
  const chercher = (v: string) => naviguer(chemin('faq', { q: v }), { replace: true })

  let liste
  let aucune = false // recherche sans résultat : pas de carte « Pas trouvé ta réponse ? » (déjà proposé)
  if (q !== null) {
    const n = norme(q.trim())
    let resultats: [ThemeFaq['questions'][number], string][] = []
    if (n) faq.forEach((th) => th.questions.forEach((x) => norme(x.q).includes(n) && resultats.push([x, th.titre])))
    if (n && !resultats.length) faq.forEach((th) => th.questions.forEach((x) => norme(x.r).includes(n) && resultats.push([x, th.titre])))
    resultats = resultats.slice(0, 20)
    aucune = !!n && !resultats.length
    liste = !n ? (
      <div className="hint-l">
        <Icone nom="search" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Écris un mot : code, garde, remboursement, relais, diaspora…')}</span>
      </div>
    ) : resultats.length ? (
      <>
        <div className="sec">
          <h2>
            <span>{t(String(resultats.length))}</span> <span>{t(resultats.length > 1 ? 'réponses' : 'réponse')}</span>
          </h2>
        </div>
        {resultats.map(([x, th], i) => (
          <Question key={x.q} q={x} ouverte={i === 0} theme={th} />
        ))}
      </>
    ) : (
      <div className="card ">
        <div className="empty">
          <div className="ei">
            <Icone nom="search" taille={26} />
          </div>
          <h3>{t('Aucune réponse')}</h3>
          <p>{t('Essaie un autre mot, ou pose ta question au support : réponse sous 2 h, de 7 h à 21 h.')}</p>
          <div className="btns">
            <Link to={chemin('fil', { id: 'support', st: 'nouveau' })} className="btn primary">
              <Icone nom="messages-square" taille={18} />
              <span>{t('Écrire au support')}</span>
            </Link>
          </div>
        </div>
      </div>
    )
  } else
    liste = (
      <>
        {!large && (
        <div className="chips">
          {faq.map((th) => (
            <Link key={th.cle} to={chemin('faq', { t: th.cle })} className={'chip' + (th.cle === theme.cle ? ' on' : '')} replace>
              {t(th.titre)}
            </Link>
          ))}
        </div>
        )}
        {theme.questions.map((x, i) => (
          <Question key={theme.cle + i} q={x} ouverte={i + 1 === a} />
        ))}
      </>
    )
  // En-tête, marges et barre : ceux de l'écran du prototype (le même pour la recherche et les thèmes).
  return (
    <EcranCompte route="faq" parEtat etat={q !== null ? 'faq?q=code' : 'faq'}>
      <Bloc classe="c13-faq">
      {/* Dès 1024 px, les thèmes passent en liste verticale à gauche, avec leur nombre de questions (déplacés). */}
      {large && (
        <nav className="c13-themes" aria-label={t('Thèmes')}>
          <ul>
            {faq.map((th) => (
              <li key={th.cle}>
                <Link to={chemin('faq', { t: th.cle })} className={q === null && th.cle === theme.cle ? 'on' : undefined} aria-current={q === null && th.cle === theme.cle ? 'page' : undefined} replace>
                  <span className="grow">{t(th.titre)}</span>
                  <span className="mc-n">{th.questions.length}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <Bloc classe="c13-k c13-rep">
      <div className={'inp mt12' + (q ? ' focus' : ' ph')}>
        <Icone nom="search" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
        <span
          ref={champ}
          className="grow"
          role="searchbox"
          aria-label={t('Chercher dans les questions fréquentes')}
          contentEditable="plaintext-only"
          suppressContentEditableWarning
          data-ph={t('Code, garde, remboursement…')}
          onInput={(e) => chercher((e.currentTarget.textContent ?? '').slice(0, 60))}
          onFocus={() => q === null && chercher('')}
        />
      </div>
      {liste}
      {!aucune && (
        <div className="card mt16">
          <div className="row">
            <span className="ic-sq or">
              <Icone nom="messages-square" taille={22} />
            </span>
            <span className="grow">
              <b className="t15 b8" style={{ display: 'block' }}>
                {t('Pas trouvé ta réponse ?')}
              </b>
              <span className="t13 c3">{t('Écris au support : réponse sous 2 h, de 7 h à 21 h, 7 jours sur 7.')}</span>
            </span>
            <Link to={chemin('fil', q === null ? { id: 'support', st: 'nouveau', sujet: SUJET_DU_THEME[theme.cle] ?? 'Autre' } : { id: 'support', st: 'nouveau' })} className="btn soft sm">
              <span>{t('Écrire')}</span>
            </Link>
          </div>
          <div className="links" style={{ justifyContent: 'flex-start', marginTop: '6px' }}>
            <Link to={chemin('aide')}>
              {t('WhatsApp, rappel et autres contacts')}
              <Icone nom="chevron-right" taille={15} />
            </Link>
          </div>
        </div>
      )}
      </Bloc>
      </Bloc>
    </EcranCompte>
  )
}
