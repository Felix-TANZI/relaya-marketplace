// Écran « Mes proches » (DP-54) : le lien famille entre un compte diaspora et un compte au Cameroun.
// - Compte diaspora : relier un proche par son code famille (son accord, immédiat) ou l'inviter par son numéro
//   (il accepte dans son application) ; pour chaque proche : son prénom et le quartier de son relais, jamais son
//   numéro ni son adresse ; commander pour lui ; ses commandes envoyées ; retirer le lien ; plafonds du mois.
// - Compte au Cameroun : son code famille (24 h, à usage unique), les demandes reçues (accepter en choisissant le
//   relais partagé, ou refuser), ses proches à l'étranger (prénom et pays) et ce qu'ils ont envoyé (déjà payé :
//   rien à payer, le code arrive par SMS) ; retirer.
// Retirer un lien se confirme ; les commandes déjà payées continuent. Le suivi d'une commande envoyée (vu du payeur)
// est sur « Commander pour » (?suivi=…), sans code ni relais précis. Tout savoir : /diaspora-infos.
// DP-54, connecter facilement : lien d'invitation partageable (QR, WhatsApp, SMS, copier) dans les deux sens. Un
// compte diaspora crée son lien (?invitation=…) que le proche au Cameroun ouvre et accepte ; un compte au Cameroun
// partage son code famille en lien (?code=…, déjà rempli chez le proche à l'étranger) pour inviter un parent.
// Côté Cameroun, pour chaque proche relié : le relais où il retire et, s'il le veut, la livraison chez lui (son
// adresse reste dans son compte ; le proche à l'étranger voit seulement « chez {prénom} »).
// Écran propre au site (absent du prototype).
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { espacer } from '../../donnees/numeros'
import { PLAFONDS_DIASPORA, source, type CompteDiaspora, type LienFamille, type Relais } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, dateLongue } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { jouer } from '../../composants/Sons'
import { useMajSession } from '../../session'
import { Partage, Rangee, destination } from './Commun'

type Donnees = { compte: CompteDiaspora | null; liens: LienFamille[]; code: { code: string; jusqua: number } | null; depensesMois: number; maintenant: number }
export function Proches() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const [d, setD] = useState<Donnees | null>(null)
  const [relais, setRelais] = useState<Relais[]>([])
  const [mode, setMode] = useState<'code' | 'numero' | 'lien'>('code')
  const [code, setCode] = useState((params.get('code') ?? '').toUpperCase())
  const [invitation, setInvitation] = useState((params.get('invitation') ?? '').toUpperCase())
  const [relaisInvitation, setRelaisInvitation] = useState('')
  const [partage, setPartage] = useState<{ type: 'famille' | 'invitation'; code: string; jusqua: number } | null>(null)
  const [aDomicile, setADomicile] = useState(false) // une adresse de livraison existe dans le compte
  const [reglage, setReglage] = useState<Record<string, { relais: string; domicile: boolean; prefere: 'relais' | 'domicile' }>>({})
  const [aPayer, setAPayer] = useState(0)
  const [prenom, setPrenom] = useState('')
  const [numero, setNumero] = useState('')
  const [choixRelais, setChoixRelais] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)
  const [copie, setCopie] = useState(false)
  const [aRetirer, setARetirer] = useState<string | null>(null)
  const tabL = useDes('tab-l')
  const majSession = useMajSession()
  // Compte diaspora : un proche relié ou retiré change le proche actif (« Pour qui ? ») de la session.
  const charger = () => source.liensFamille().then(async (x) => (setD(x), x.compte && majSession(await source.session())))
  useEffect(() => {
    charger()
    source.relaisListe().then((r) => setRelais(r.relais.filter((x) => !x.plein)))
    source.adresses().then((a) => setADomicile(a.adresses.length > 0)).catch(() => setADomicile(false))
    source.demandesProches().then((r) => setAPayer(r.demandes.filter((x) => x.sens === 'recue' && x.etat === 'attente').length))
  }, [])
  if (!d) return null
  const diaspora = !!d.compte
  const actifs = d.liens.filter((l) => l.etat === 'actif')
  const invites = d.liens.filter((l) => l.etat === 'invite')
  const anciens = d.liens.filter((l) => l.etat === 'retire' || l.etat === 'refuse')
  const retirer = async (l: LienFamille) => (await source.retirerLien(l.id), setARetirer(null), setMessage({ ok: true, texte: tf(l.etat === 'invite' ? 'L’invitation de {p} est annulée.' : 'Le lien avec {p} est retiré. Les commandes déjà payées continuent jusqu’au retrait.', { p: l.prenom }) }), charger())
  const etape = (c: LienFamille['commandes'][number]) =>
    c.rembourse ? tf('Remboursée sur ta carte · {m} F', { m: F(c.rembourse) }) : c.retireLe ? t('Retirée · preuve de retrait') : c.pretLe && c.pretLe <= d.maintenant ? t('Au relais · code envoyé par SMS') : t('Payée · en préparation')

  // Côté Cameroun : où ce proche fait livrer ses commandes (son relais ; chez moi si je l'accepte). L'adresse reste
  // dans mon compte : lui ne voit que « chez {prénom} ».
  const livraison = (l: LienFamille) => {
    const r = reglage[l.id] ?? { relais: l.relais ?? relais[0]?.nom ?? '', domicile: !!l.domicile, prefere: l.prefere ?? 'relais' }
    const maj = (x: Partial<typeof r>) => setReglage({ ...reglage, [l.id]: { ...r, ...x } })
    return (
      <div style={{ width: '100%' }}>
        <div className="fld">
          <label htmlFor={'pl-' + l.id}>{tf('Mon relais pour les commandes de {p}', { p: l.prenom })}</label>
          <div className="inp">
            <select id={'pl-' + l.id} value={r.relais} onChange={(e) => maj({ relais: e.target.value })} style={{ width: '100%', border: 0, background: 'transparent', font: 'inherit', color: 'inherit' }}>
              {relais.map((x) => (
                <option key={x.nom} value={x.nom}>
                  {t(x.nom)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {aDomicile ? (
          <label className="row t13" style={{ gap: 8, padding: '6px 0' }}>
            <input type="checkbox" checked={r.domicile} onChange={(e) => maj({ domicile: e.target.checked, prefere: e.target.checked ? r.prefere : 'relais' })} />
            <span className="grow">{tf('{p} peut aussi me faire livrer chez moi (il ne voit jamais mon adresse)', { p: l.prenom })}</span>
          </label>
        ) : (
          <p className="t12 c3">
            {t('Pour être livré chez toi, ajoute d’abord ton adresse.')} <Link to={chemin('adresses')}>{t('Mes adresses')}</Link>
          </p>
        )}
        {reglage[l.id] && (
          <button
            type="button"
            className="btn secondary"
            onClick={async () => {
              await source.reglerLivraisonLien(l.id, r)
              const { [l.id]: _, ...reste } = reglage
              void _
              setReglage(reste)
              setMessage({ ok: true, texte: tf('Livraison pour {p} enregistrée.', { p: l.prenom }) })
              charger()
            }}
          >
            <span>{t('Enregistrer ma livraison')}</span>
          </button>
        )}
      </div>
    )
  }

  const ligne = (l: LienFamille, actions: React.ReactNode) => (
    <div key={l.id} className="card">
      <div className="row" style={{ gap: 12 }}>
        <span className="ic-sq or" style={{ borderRadius: '50%', width: 44, height: 44, fontWeight: 800 }}>
          {l.prenom.slice(0, 1)}
        </span>
        <span className="grow">
          <b className="t15" style={{ display: 'block' }}>
            {l.prenom}
          </b>
          <span className="t12 c3">
            {diaspora
              ? l.relais
                ? destination(l, 'relais', t, tf) + (l.domicile ? ' · ' + t('livraison à domicile possible') : '')
                : t('Invitation envoyée · en attente de son accord')
              : tf('{p} · paie depuis l’étranger', { p: t(l.pays ?? '') })}
          </span>
        </span>
        <span className={'pill ' + (l.etat === 'actif' ? 'green' : 'amber')}>{t(l.etat === 'actif' ? 'Relié' : 'En attente')}</span>
      </div>
      {l.commandes.length > 0 && (
        <div className="mt8">
          <div className="t12 c3">{t(diaspora ? 'Commandes envoyées' : 'Commandes reçues · déjà payées, rien à payer')}</div>
          {l.commandes.slice(0, 3).map((c) => (
            <div key={c.ref} className="kv">
              <span className="k">
                {diaspora ? <Link to={chemin('commander-pour', { suivi: c.ref })}>{c.ref}</Link> : <Link to={chemin('commande', { ref: c.ref })}>{c.ref}</Link>} · {dateLongue(c.le, langue)}
                {diaspora && (
                  <span className="t12 c3" style={{ display: 'block' }}>
                    {etape(c)}
                  </span>
                )}
              </span>
              <span className="v">{F(c.montant)} F</span>
            </div>
          ))}
        </div>
      )}
      {actions}
    </div>
  )

  // Dès 1024 px (§ 5.14) : « Relier un proche » (ou, au Cameroun, « Mon code famille ») passe dans un aside de
  // 360 px à droite des proches. Déplacé, jamais dupliqué.
  const lier = (
    <>
      {!diaspora && (
        <div className="card">
          <h3 className="cl11-k">{t('Mon code famille')}</h3>
          {d.code ? (
            <>
              <Partage code={d.code.code} type="famille" date={dateA(d.code.jusqua, langue)} />
              <div className="btns">
                <button type="button" className="btn secondary" onClick={() => (navigator.clipboard?.writeText(d.code!.code).catch(() => {}), setCopie(true), jouer('copie'))}>
                  <span>{t(copie ? 'Code copié' : 'Copier le code')}</span>
                </button>
              </div>
              <p className="t12 c3">{t('Ton parent n’a pas encore de compte ? Le lien l’amène à l’inscription depuis l’étranger, puis le relie à toi avec ce code.')}</p>
            </>
          ) : (
            <>
              <p className="t13 c2">{t('Donne ce code à ton proche : en le saisissant, il relie son compte au tien. Sans code ni accord de ta part, aucun lien n’est possible.')}</p>
              <div className="btns">
                <button type="button" className="btn primary" onClick={async () => (await source.creerCodeFamille(), charger())}>
                  <span>{t('Créer mon code famille')}</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {diaspora && (
        <div className="card">
          <h3 className="cl11-k">{t('Relier un proche au Cameroun')}</h3>
          <div className="seg dia-seg">
            {(['code', 'numero', 'lien'] as const).map((m) => (
              <a key={m} href="#" role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={(e) => (e.preventDefault(), setMode(m))}>
                {t(m === 'code' ? 'Avec son code famille' : m === 'numero' ? 'L’inviter par son numéro' : 'Lien ou QR')}
              </a>
            ))}
          </div>
          {mode === 'lien' ? (
            partage ? (
              <Partage code={partage.code} type="invitation" date={dateA(partage.jusqua, langue)} />
            ) : (
              <>
                <p className="t13 c2">{t('Un lien à envoyer par WhatsApp ou SMS, ou un QR à lui montrer : il l’ouvre, choisit son relais et accepte. Tu ne vois jamais son numéro.')}</p>
                <div className="btns">
                  <button type="button" className="btn primary" onClick={async () => setPartage(await source.lienInvitation())}>
                    <span>{t('Créer mon lien d’invitation')}</span>
                  </button>
                </div>
              </>
            )
          ) : mode === 'code' ? (
            <>
              <div className="fld">
                <label htmlFor="pr-code">{t('Code famille')}</label>
                <div className="inp">
                  <input id="pr-code" placeholder="FAM-XXXX" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
                </div>
                <div className="hint">{t('Ton proche le crée dans son application BelivaY (Compte › Mes proches).')}</div>
              </div>
              <div className="btns">
                <button
                  type="button"
                  className={'btn primary' + (code.trim().length >= 8 ? '' : ' off')}
                  onClick={async () => {
                    const r = await source.lierParCode(code)
                    setMessage(r.ok ? { ok: true, texte: tf('{p} est relié à ton compte.', { p: r.lien.prenom }) } : { ok: false, texte: t(r.raison === 'code' ? 'Code inconnu ou expiré : demande-lui un nouveau code.' : r.raison === 'max' ? '5 proches au plus.' : 'Ce proche est déjà relié.') })
                    if (r.ok) setCode('')
                    charger()
                  }}
                >
                  <span>{t('Relier')}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="fld">
                <label htmlFor="pr-prenom">{t('Son prénom')}</label>
                <div className="inp">
                  <input id="pr-prenom" value={prenom} maxLength={30} onChange={(e) => setPrenom(e.target.value)} />
                </div>
              </div>
              <div className="fld">
                <label htmlFor="pr-num">{t('Son numéro au Cameroun')}</label>
                <div className="inp">
                  <b className="t15">+237</b>
                  <input id="pr-num" type="tel" inputMode="tel" placeholder="6XX XX XX XX" value={numero} onChange={(e) => setNumero(espacer(e.target.value))} />
                </div>
                <div className="hint">{t('Il reçoit une invitation et décide ; son numéro ne t’est jamais montré ensuite.')}</div>
              </div>
              <div className="btns">
                <button
                  type="button"
                  className={'btn primary' + (prenom.trim().length >= 2 ? '' : ' off')}
                  onClick={async () => {
                    if (prenom.trim().length < 2) return
                    const r = await source.inviterProche(prenom, numero)
                    setMessage(r.ok ? { ok: true, texte: tf('Invitation envoyée à {p}. Le lien s’active quand il accepte.', { p: r.lien.prenom }) } : { ok: false, texte: t(r.raison === 'numero' ? 'Un numéro camerounais à 9 chiffres, qui commence par 6.' : r.raison === 'max' ? '5 proches au plus.' : 'Ce proche est déjà relié ou invité.') })
                    if (r.ok) (setPrenom(''), setNumero(''))
                    charger()
                  }}
                >
                  <span>{t('Envoyer l’invitation')}</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
  return (
    <Ecran route="proches" gabarit="compte">
      <Rangee classe="d13-avec-aside">
        <Rangee classe="d13-col">
          {diaspora ? (
            <div className="card vedette mt12">
              <div className="row" style={{ gap: 10 }}>
                <Icone nom="globe" taille={22} />
                <span className="grow">
                  <b className="t15" style={{ display: 'block' }}>
                    {tf('Compte diaspora · {v}, {p}', { v: d.compte!.ville, p: t(d.compte!.pays) })}
                  </b>
                  <span className="t12 c3">{tf('Ce mois-ci : {m} F sur {p} F · {n} proches au plus', { m: F(d.depensesMois), p: F(PLAFONDS_DIASPORA.mois), n: PLAFONDS_DIASPORA.liens })}</span>
                </span>
              </div>
              <div className="kv mt8">
                <span className="k">{t('Encore possible ce mois-ci')}</span>
                <span className="v">{tf('{m} F', { m: F(Math.max(0, PLAFONDS_DIASPORA.mois - d.depensesMois)) })}</span>
              </div>
              <div className="kv">
                <span className="k">{t('Par paiement')}</span>
                <span className="v">{tf('{m} F au plus', { m: F(PLAFONDS_DIASPORA.paiement) })}</span>
              </div>
              <div className="kv">
                <span className="k">{t('Proches reliés ou invités')}</span>
                <span className="v">{tf('{n} sur {p}', { n: actifs.length + invites.length, p: PLAFONDS_DIASPORA.liens })}</span>
              </div>
            </div>
          ) : (
            <p className="cl13-intro">
              {t('Un proche à l’étranger peut commander pour toi. Il ne voit que ton prénom et le quartier de ton relais : jamais ton numéro, ton adresse ni tes autres commandes.')} <Link to={chemin('diaspora-infos')}>{t('Comment ça marche')}</Link>
            </p>
          )}
          {message && (
            <div className={'note ' + (message.ok ? 'green' : 'red')} role="status">
              <Icone nom={message.ok ? 'circle-check' : 'circle-alert'} taille={18} />
              <div>{message.texte}</div>
            </div>
          )}

          {diaspora && (
            <div className="card tight">
              <Link to={chemin('paniers-proches')} className="li">
                <span className="ic">
                  <Icone nom="inbox" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {t('À payer pour mes proches')}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {aPayer ? tf('{n} panier(s) envoyé(s) par tes proches', { n: aPayer }) : t('Les paniers que tes proches t’envoient')}
                  </span>
                </span>
                {aPayer > 0 && <span className="pill amber">{aPayer}</span>}
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
              <Link to={chemin('espace-diaspora')} className="li">
                <span className="ic">
                  <Icone nom="globe" taille={20} />
                </span>
                <span className="grow">
                  <span className="lt" style={{ display: 'block' }}>
                    {t('Espace diaspora')}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {t('Proches, paniers à payer, commandes envoyées, devise')}
                  </span>
                </span>
                <span className="chev">
                  <Icone nom="chevron-right" taille={18} />
                </span>
              </Link>
            </div>
          )}

          {/* Compte au Cameroun : invitation reçue d'un proche à l'étranger (lien ou code), demandes reçues et code famille */}
          {!diaspora && (
            <details className="more" open={!!params.get('invitation')}>
              <summary>
                <Icone nom="plane" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
                <span className="grow">{t('Un proche à l’étranger t’a envoyé une invitation ?')}</span>
                <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
              </summary>
              <div className="more-b">
                <div className="fld">
                  <label htmlFor="pr-inv">{t('Code d’invitation')}</label>
                  <div className="inp">
                    <input id="pr-inv" placeholder="INV-XXXX" value={invitation} onChange={(e) => setInvitation(e.target.value.toUpperCase())} />
                  </div>
                  <div className="hint">{t('Il est dans le lien reçu par WhatsApp ou SMS ; en ouvrant le lien, il est déjà rempli.')}</div>
                </div>
                <div className="fld">
                  <label htmlFor="pr-inv-relais">{t('Relais où tu retireras ses commandes')}</label>
                  <div className="inp">
                    <select id="pr-inv-relais" value={relaisInvitation || relais[0]?.nom || ''} onChange={(e) => setRelaisInvitation(e.target.value)} style={{ width: '100%', border: 0, background: 'transparent', font: 'inherit', color: 'inherit' }}>
                      {relais.map((r) => (
                        <option key={r.nom} value={r.nom}>
                          {t(r.nom)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="btns">
                  <button
                    type="button"
                    className={'btn primary' + (invitation.trim().length >= 8 ? '' : ' off')}
                    onClick={async () => {
                      if (invitation.trim().length < 8) return
                      const r = await source.accepterInvitation(invitation, relaisInvitation || relais[0]?.nom || '')
                      setMessage(r.ok ? { ok: true, texte: tf('{p} est relié à ton compte : il peut payer tes paniers et te faire livrer.', { p: r.lien.prenom }) } : { ok: false, texte: t(r.raison === 'code' ? 'Code d’invitation inconnu ou expiré : demande-lui un nouveau lien.' : r.raison === 'max' ? '5 proches au plus.' : r.raison === 'type' ? 'Ce code s’ouvre depuis un compte au Cameroun.' : 'Ce proche est déjà relié.') })
                      if (r.ok) (setInvitation(''), jouer('notification'))
                      charger()
                    }}
                  >
                    <span>{t('Utiliser ce code')}</span>
                  </button>
                </div>
              </div>
            </details>
          )}
          {!diaspora && invites.length > 0 && <h3 className="cl11-k">{t('Demandes reçues')}</h3>}
          {!diaspora &&
            invites.map((l) =>
              ligne(
                l,
                <>
                  <p className="t13 c2">{tf('{p} veut pouvoir t’envoyer des commandes. Si tu acceptes, il verra seulement ton prénom et le quartier du relais choisi.', { p: l.prenom })}</p>
                  <div className="fld">
                    <label htmlFor={'pr-' + l.id}>{t('Relais où tu retireras')}</label>
                    <div className="inp">
                      <select id={'pr-' + l.id} value={choixRelais[l.id] ?? relais[0]?.nom ?? ''} onChange={(e) => setChoixRelais({ ...choixRelais, [l.id]: e.target.value })} style={{ width: '100%', border: 0, background: 'transparent', font: 'inherit', color: 'inherit' }}>
                        {relais.map((r) => (
                          <option key={r.nom} value={r.nom}>
                            {t(r.nom)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="btns">
                    <button type="button" className="btn primary" onClick={async () => (await source.repondreLien(l.id, true, choixRelais[l.id] ?? relais[0]?.nom), setMessage({ ok: true, texte: tf('{p} peut maintenant commander pour toi.', { p: l.prenom }) }), charger())}>
                      <span>{t('Accepter')}</span>
                    </button>
                    <button type="button" className="btn secondary" onClick={async () => (await source.repondreLien(l.id, false), setMessage({ ok: true, texte: tf('Demande de {p} refusée.', { p: l.prenom }) }), charger())}>
                      <span>{t('Refuser')}</span>
                    </button>
                  </div>
                </>,
              ),
            )}
          {!tabL && lier}

          {(diaspora ? [...actifs, ...invites] : actifs).length > 0 && <h3 className="cl11-k">{t(diaspora ? 'Mes proches au Cameroun' : 'Mes proches à l’étranger')}</h3>}
          <Rangee classe="d13-grille">
            {(diaspora ? [...actifs, ...invites] : actifs).map((l) =>
              ligne(
                l,
                // Le réglage de livraison (pleine largeur) passe au-dessus des boutons, à toutes les largeurs.
                <div className="btns" style={!diaspora && l.etat === 'actif' ? { flexWrap: 'wrap' } : undefined}>
                  {!diaspora && l.etat === 'actif' && livraison(l)}
                  {!diaspora && l.etat === 'actif' && (
                    <Link to={chemin('diaspora')} className="btn primary">
                      <Icone nom="send" taille={18} />
                      <span>{tf('Envoyer mon panier à {p}', { p: l.prenom })}</span>
                    </Link>
                  )}
                  {diaspora && l.etat === 'actif' && (
                    <Link to={chemin('commander-pour', { lien: l.id })} className="btn primary">
                      <Icone nom="shopping-cart" taille={18} />
                      <span>{tf('Commander pour {p}', { p: l.prenom })}</span>
                    </Link>
                  )}
                  {aRetirer !== l.id && (
                    <button type="button" className="btn secondary" onClick={() => setARetirer(l.id)}>
                      <span>{t(l.etat === 'invite' ? 'Annuler l’invitation' : 'Retirer le lien')}</span>
                    </button>
                  )}
                  {aRetirer === l.id && (
                    <>
                      <div className="note amber">
                        <Icone nom="triangle-alert" taille={18} />
                        <div>{tf(l.etat === 'invite' ? 'Annuler l’invitation de {p} ?' : diaspora ? 'Retirer le lien avec {p} ? Tu ne pourras plus commander pour lui ; les commandes déjà payées continuent jusqu’au retrait.' : 'Retirer le lien avec {p} ? Il ne pourra plus commander pour toi ; les commandes déjà payées continuent jusqu’au retrait.', { p: l.prenom })}</div>
                      </div>
                      <button type="button" className="btn primary" onClick={() => retirer(l)}>
                        <span>{t(l.etat === 'invite' ? 'Oui, annuler' : 'Oui, retirer le lien')}</span>
                      </button>
                      <button type="button" className="btn secondary" onClick={() => setARetirer(null)}>
                        <span>{t('Garder le lien')}</span>
                      </button>
                    </>
                  )}
                </div>,
              ),
            )}
          </Rangee>
          {diaspora && !actifs.length && (
            <div className="note ink">
              <Icone nom="info" taille={18} />
              <div>{t(invites.length ? 'Tu pourras commander dès qu’un proche aura accepté ton invitation.' : 'Pour commander, relie d’abord un proche : son code famille, ou une invitation qu’il accepte.')}</div>
            </div>
          )}
          {!d.liens.length && diaspora && <p className="t13 c3">{t('Aucun proche relié pour l’instant.')}</p>}
          {anciens.length > 0 && (
            <>
              <p className="t12 c3">{tf('{n} lien(s) retiré(s) ou refusé(s) : plus aucune commande possible par ce lien.', { n: anciens.length })}</p>
              <div className="card tight">
                {anciens.map((l) => (
                  <div key={l.id} className="kv">
                    <span className="k">{l.pays ? tf('{p} · {c}', { p: l.prenom, c: t(l.pays) }) : l.prenom}</span>
                    <span className="v">{t(l.etat === 'refuse' ? 'Refusé' : 'Retiré')}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="card">
            <h3 className="cl11-k">{t('Un lien sûr et légal')}</h3>
            {[
              'Le lien ne naît qu’avec l’accord du proche : son code famille ou son acceptation.',
              'Celui qui paie voit le prénom et le quartier du relais ; jamais le numéro, l’adresse ni les autres commandes.',
              'Paiement par carte au nom de celui qui paie, 3-D Secure ; 150 000 F au plus par paiement et 500 000 F par mois. Des marchandises seulement, jamais d’argent liquide.',
              'Le code de retrait va au proche, la preuve de retrait à celui qui paie ; un remboursement revient sur sa carte.',
              'Chacun retire le lien quand il veut, sans justification.',
            ].map((x) => (
              <div key={x} className="hint-l">
                <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
                <span>{t(x)}</span>
              </div>
            ))}
            <div className="links">
              <Link to={chemin('diaspora-infos')}>{t('Qui peut, comment, et la loi : tout savoir')}</Link>
            </div>
          </div>
        </Rangee>
        {tabL && (
          <Rangee classe="d13-aside" etiquette={diaspora ? 'Relier un proche au Cameroun' : 'Mon code famille'}>
            {lier}
          </Rangee>
        )}
      </Rangee>
    </Ecran>
  )
}
