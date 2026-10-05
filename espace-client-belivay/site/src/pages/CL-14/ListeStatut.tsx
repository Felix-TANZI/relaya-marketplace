// Écran « Mettre ma liste en statut » (CL-14, page propre au site ; DP-54, demande du porteur : « tout le monde peut
// mettre sa wishlist en statut et se faire offrir des cadeaux »). Pour une liste (?id=…) :
// - l'image de statut verticale 1080 × 1920 (composants/ImageStatut.ts) dessinée sur un <canvas> : logo BelivaY,
//   titre, occasion et date, 3 ou 4 articles choisis (dessin et prix du jour), QR code et lien court de la liste ;
//   aperçu à l'écran ;
// - « Partager mon statut » : le partage du téléphone avec le fichier image et le lien (navigator.share) quand il
//   sait partager un fichier ; toujours aussi : enregistrer l'image, copier le lien, WhatsApp et SMS directs ;
// - un texte de statut prêt à coller, et comment publier sur WhatsApp, Facebook, Instagram et TikTok ;
// - mode surprise respecté : l'image ne montre que ce qui reste à offrir, jamais qui a offert ni combien.
// Le lien de la liste (30 jours) est créé au premier geste, comme dans « Envoyer ma liste » ; chaque mise en statut
// est notée (source.partagerStatutListe) et fait son petit son.
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { dessinerStatut, enFichier } from '../../composants/ImageStatut'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source, type CanalStatut, type ListeEnvies } from '../../donnees/source'
import { FCFA } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { BandeauInterrupteur, iconeListe } from './Listes'
import { offerts, useListes } from './Commun'

// Occasion devinée d'après le nom (l'occasion n'est pas enregistrée à part), comme l'icône de la liste.
function occasion(l: ListeEnvies): string | null {
  const n = l.nom.toLowerCase()
  if (/anniv|birthday/.test(n)) return 'Anniversaire'
  if (/mariage|wedding/.test(n)) return 'Mariage'
  if (/dot|dowry/.test(n)) return 'Dot'
  if (/rentr|école|school/.test(n)) return 'Rentrée'
  if (/naissance|bébé|baby|birth/.test(n)) return 'Naissance'
  if (/crémaill|maison|house/.test(n)) return 'Crémaillère'
  return null
}
export const lienCourtListe = (code: string) => `${location.host}/l/${code}`
export const lienListe = (code: string) => `${location.origin}/l/${code}`

export function ListeStatut() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const id = params.get('id') ?? 'favoris'
  const [d, recharger] = useListes()
  const [choisis, setChoisis] = useState<string[] | null>(null)
  const [pret, setPret] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [fait, setFait] = useState<CanalStatut | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  // Le fichier image, préparé dès que l'image est dessinée : le partage part ainsi du toucher même, sans attente
  // (sinon le téléphone refuse le partage, faute de geste direct).
  const pretFichier = useRef<File | null>(null)
  const prenom = useSession().client?.prenom ?? ''
  const l = d?.listes.find((x) => x.id === id) ?? null
  const surprise = !!l?.surprise
  // Sur l'image : ce qui reste à offrir (en mode surprise, rien d'autre) ; 4 au plus.
  const proposables = l ? l.articles.filter((a) => !a.offert) : []
  const retenus = l ? (choisis ?? proposables.slice(0, 4).map((a) => a.p)).filter((p) => proposables.some((a) => a.p === p)).slice(0, 4) : []
  const code = l?.partage?.code ?? null
  const occ = l ? occasion(l) : null
  const sousTitre = l ? [t(l.nom), occ && !l.nom.toLowerCase().includes(occ.toLowerCase()) ? t(occ) : null, l.remiseLe ? tf('le {d}', { d: jourSeul(l.remiseLe, langue) }) : null].filter(Boolean).join(' · ') : ''
  const progression = l && !surprise && !l.favoris && offerts(l) > 0 ? tf('{o} sur {n} déjà offerts', { o: offerts(l), n: l.articles.length }) : null
  const cle = l ? [l.id, code, retenus.join(','), langue, progression, prenom].join('|') : ''
  useEffect(() => {
    if (!l || !code || !canvas.current || !retenus.length) return
    let actif = true
    const c = canvas.current
    dessinerStatut(c, {
      kicker: t('Ma liste d’envies'),
      titre: l.favoris || !prenom ? t('Mes envies sur BelivaY') : tf('La liste de {p}', { p: prenom }),
      sousTitre,
      articles: retenus.map((p) => l.articles.find((a) => a.p === p)!).map((a) => ({ titre: t(a.titre), prix: FCFA(a.prix) + ' F', dessin: a.dessin })),
      progression,
      appel: t('Scanne ou ouvre le lien pour m’offrir un cadeau'),
      lienCourt: lienCourtListe(code),
      lien: lienListe(code),
      pied: t('Paiement protégé · Mobile Money, ou carte depuis l’étranger · sans compte'),
    }).then(async () => {
      if (!actif) return
      pretFichier.current = null
      setPret(true)
      const f = await enFichier(c, `belivay-liste-${code}.png`)
      if (actif) pretFichier.current = f
    })
    return () => {
      actif = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle])
  if (!d) return null
  if (!l)
    return (
      <Ecran route="liste-statut">
        <div className="empty">
          <div className="ei">
            <Icone nom="list-checks" taille={26} />
          </div>
          <h3>{t('Cette liste n’existe plus')}</h3>
          <div className="btns" style={{ justifyContent: 'center' }}>
            <Link to={chemin('listes')} className="btn secondary">
              <span>{t('Mes listes')}</span>
            </Link>
          </div>
        </div>
      </Ecran>
    )
  const sansRelais = !l.relais && l.destination === 'moi'
  const bloque = sansRelais ? 'Choisis d’abord où vont les cadeaux (ton relais, ou celui d’un proche).' : !l.articles.length ? 'Ajoute d’abord des articles à la liste.' : !proposables.length ? 'Tout est déjà offert : rien à mettre en statut.' : l.destination === 'tiers' && !l.tiers ? 'Écris d’abord le prénom de la personne et choisis son relais.' : null
  const url = code ? lienListe(code) : ''
  const texte = tf('Ma liste « {n} » est sur BelivaY{d} ! Choisis un cadeau et offre-le en Mobile Money, ou par carte depuis l’étranger, sans compte. Il arrive à mon relais, sans mon adresse : {l}', { n: t(l.nom), d: l.remiseLe ? tf(' pour le {d}', { d: jourSeul(l.remiseLe, langue) }) : '', l: url })
  const noter = async (c: CanalStatut) => (await source.partagerStatutListe(l.id, c), setFait(c), recharger())
  const creer = async () => {
    if (bloque) return setMessage(bloque)
    setMessage(null)
    await source.partagerListe(l.id)
    recharger()
  }
  const fichier = () => (pretFichier.current ? Promise.resolve(pretFichier.current) : canvas.current ? enFichier(canvas.current, `belivay-liste-${code}.png`) : Promise.resolve(null))
  const partager = async () => {
    const f = pretFichier.current
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
    try {
      if (f && nav.share && nav.canShare?.({ files: [f] })) {
        await nav.share({ files: [f], title: 'BelivaY', text: texte })
        return noter('partage')
      }
      if (nav.share) {
        await nav.share({ title: 'BelivaY', text: texte, url })
        return noter('partage')
      }
    } catch {
      return // partage annulé : rien n'est noté
    }
    setMessage('Ton téléphone ne sait pas partager l’image d’ici : enregistre-la, puis ajoute-la à ton statut.')
  }
  const enregistrer = async () => {
    const f = await fichier()
    if (!f) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(f)
    a.download = f.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    noter('image')
  }
  const copier = async (quoi: 'lien' | 'texte') => {
    await navigator.clipboard?.writeText(quoi === 'lien' ? url : texte).catch(() => {})
    noter(quoi)
  }
  const basculer = (p: string) => {
    const deja = retenus.includes(p)
    if (!deja && retenus.length >= 4) return setMessage('4 articles au plus sur l’image : retire d’abord un article.')
    setMessage(null)
    setChoisis(deja ? retenus.filter((x) => x !== p) : [...retenus, p])
  }
  const derniers = l.statuts ?? []
  return (
    <Ecran route="liste-statut" gabarit="colonnes">
      <Colonne classe="g5-apercu">
      <Styles id="02f3dac5cd" />
      <BandeauInterrupteur />
      <div className="pg">
        <div className="pg-k">{tf('Liste « {n} »', { n: t(l.nom) })}</div>
        <h1 className="pg-t">{t('Mettre ma liste en statut')}</h1>
        <p className="pg-s">{t('Une image prête pour ton statut WhatsApp, tes stories Facebook et Instagram ou TikTok : tes proches scannent le QR code ou ouvrent le lien, et t’offrent un cadeau d’où ils sont.')}</p>
      </div>
      {message && (
        <div className="note amber" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>
            {t(message)}
            {bloque && message === bloque && (
              <>
                {' '}
                <Link to={chemin('liste-envoyer', { id: l.id })}>{t('Régler la liste')}</Link>
              </>
            )}
          </div>
        </div>
      )}
      {fait && (
        <div className="note green blv-succes" role="status">
          <Icone nom="circle-check" taille={18} />
          <div>{t(fait === 'image' ? 'Image enregistrée : ajoute-la à ton statut depuis ta galerie.' : fait === 'lien' ? 'Lien copié : colle-le sur ton statut ou dans l’autocollant « Lien ».' : fait === 'texte' ? 'Texte copié : colle-le sous ton image.' : 'Statut partagé. Tes proches peuvent t’offrir un cadeau dès maintenant.')}</div>
        </div>
      )}
      {!code ? (
        <div className="card">
          <div className="row" style={{ gap: 12 }}>
            <span className="ic-sq or">
              <Icone nom={iconeListe(l)} taille={22} />
            </span>
            <div className="grow">
              <div className="t15 b8">{t('D’abord, le lien de ta liste')}</div>
              <div className="t13 c3 mt4">{t('Il est créé maintenant et vaut 30 jours ; le QR code de l’image y mène. Tes proches ne voient ni ton adresse ni ton numéro.')}</div>
            </div>
          </div>
          <div className="btns mt12">
            <button type="button" className={'btn primary' + (bloque ? ' off' : '')} onClick={creer}>
              <Icone nom="image" taille={18} />
              <span>{t('Créer mon image de statut')}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="card blv-statut">
            <canvas ref={canvas} role="img" aria-label={tf('Image de statut de la liste « {n} »', { n: t(l.nom) })} width={1080} height={1920}></canvas>
            {!pret && <div className="t13 c3 mt8" style={{ textAlign: 'center' }}>{t('Préparation de l’image…')}</div>}
            <div className="t12 c3 mt8" style={{ textAlign: 'center' }}>
              {tf('1080 × 1920 · lien {l} · valable jusqu’au {d}', { l: lienCourtListe(code), d: jourSeul(l.partage!.jusqua, langue) })}
            </div>
          </div>
        </>
      )}
      </Colonne>
      <Aside titre="Partager mon statut">
      {code && (
        <>
          <div className="btns">
            <button type="button" className={'btn primary' + (pret ? '' : ' off')} onClick={() => pret && partager()}>
              <Icone nom="share-2" taille={18} />
              <span>{t('Partager mon statut')}</span>
            </button>
          </div>
          <div className="cl14-tiles">
            <button type="button" className="cl14-tile" onClick={() => pret && enregistrer()}>
              <Icone nom="download" taille={22} />
              {t('Enregistrer l’image')}
            </button>
            <button type="button" className="cl14-tile" onClick={() => copier('lien')}>
              <Icone nom="copy" taille={22} />
              {t(fait === 'lien' ? 'Lien copié' : 'Copier le lien')}
            </button>
            <a className="cl14-tile" href={'https://wa.me/?text=' + encodeURIComponent(texte)} target="_blank" rel="noopener noreferrer" onClick={() => noter('whatsapp')}>
              <Icone nom="message-circle" taille={22} />
              {t('WhatsApp')}
            </a>
            <a className="cl14-tile" href={'sms:?&body=' + encodeURIComponent(texte)} onClick={() => noter('sms')}>
              <Icone nom="message-square" taille={22} />
              {t('SMS')}
            </a>
          </div>
          <div className="sec">
            <h2>{t('Sur l’image')}</h2>
          </div>
          <div className="t13 c3">{tf('{n} sur 4 au plus · touche un article pour l’ajouter ou le retirer.', { n: retenus.length })}</div>
          <div className="chips mt8" role="group" aria-label={t('Articles sur l’image')}>
            {proposables.map((a) => (
              <a key={a.p} href="#" role="checkbox" aria-checked={retenus.includes(a.p)} className={'chip' + (retenus.includes(a.p) ? ' on' : '')} onClick={(e) => (e.preventDefault(), basculer(a.p))}>
                <span className="thumb" style={{ width: '22px', height: '22px', borderRadius: '6px' }}>
                  <Dessin id={a.dessin} />
                </span>
                {t(a.titre)}
              </a>
            ))}
          </div>
          <div className="sec">
            <h2>{t('Le texte de ton statut')}</h2>
          </div>
          <div className="card flat">
            <div className="t12 c3 b7">{t('À coller sous l’image')}</div>
            <p className="t14 mt4 blv-texte-statut" style={{ lineHeight: '1.45', wordBreak: 'break-word', margin: 0 }}>
              {texte}
            </p>
            <div className="btns">
              <button type="button" className="btn ghost" onClick={() => copier('texte')}>
                <Icone nom="copy" taille={18} />
                <span>{t(fait === 'texte' ? 'Texte copié' : 'Copier le texte')}</span>
              </button>
            </div>
          </div>
          <details className="more">
            <summary>
              <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
              <span className="grow">{t('Comment publier, réseau par réseau')}</span>
              <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
            </summary>
            <div className="more-b">
              <div className="kv">
                <span className="k">{t('WhatsApp')}</span>
                <span className="v">{t('Statut → icône appareil photo → choisis l’image ; colle le texte en légende.')}</span>
              </div>
              <div className="kv">
                <span className="k">{t('Facebook et Instagram')}</span>
                <span className="v">{t('Story → ajoute l’image, puis l’autocollant « Lien » avec le lien copié.')}</span>
              </div>
              <div className="kv">
                <span className="k">{t('TikTok')}</span>
                <span className="v">{t('Publie l’image en photo ou en story ; mets le lien dans ta bio ou en commentaire. Le QR code marche aussi.')}</span>
              </div>
            </div>
          </details>
          {derniers.length > 0 && (
            <div className="hint-l">
              <Icone nom="sparkles" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{tf('Mise en statut {n} fois · la dernière le {d}', { n: derniers.length, d: jourSeul(derniers[derniers.length - 1].le, langue) })}</span>
            </div>
          )}
        </>
      )}
      {surprise ? (
        <div className="note ink">
          <Icone nom="eye-off" taille={18} />
          <div>{t('Mode surprise : l’image ne montre que ce qui reste à offrir. Ni ce qui est déjà offert, ni par qui.')}</div>
        </div>
      ) : (
        <div className="note ink">
          <Icone nom="lock" taille={18} />
          <div>{t('Sur l’image et la page de ta liste : ton prénom, tes articles et le quartier de ton relais. Jamais ton adresse, ton numéro ni qui a offert quoi.')}</div>
        </div>
      )}
      <div className="links">
        <Link to={chemin('liste-envoyer', { id: l.id })}>{t('Envoyer ma liste à des proches')}</Link>
        <Link to={chemin('liste-envies', { id: l.id })}>{t('Revenir à ma liste')}</Link>
      </div>
      </Aside>
    </Ecran>
  )
}
