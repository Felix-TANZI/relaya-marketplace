// Écran « Envoyer ma liste » (CL-14), forme d'origine du prototype rendue réelle (DP-54) : la feuille « Envoyer
// « … » » posée sur la liste (?id=…), dont le fond reprend les listes, l'état de la liste et ses articles au prix
// du jour. Dans la feuille : où vont les cadeaux (avec mon adresse, à mon relais ; sans adresse : celui qui offre
// choisit, au fil de l'eau seulement ; le relais d'un proche, avec son prénom, les relais pleins grisés ; sans
// relais habituel : le choisir d'abord), quand les colis partent (au fil de l'eau ou groupé à la date de remise,
// choisi à la création), le mode surprise, la validité du lien (30 jours), puis le partage depuis le téléphone
// (WhatsApp, SMS, copier, partage du téléphone). Liste déjà partagée : le même lien à renvoyer, ses réglages, ce
// que voient les proches, arrêter le partage. Une fois un cadeau payé, l'adresse et la remise ne changent plus.
// Prix au partage (CLE-39) : les prix sont relevés au partage ; l'écart avec le prix du jour est montré, au
// propriétaire comme aux proches, et celui qui offre paie le prix du jour (une hausse, il l'accepte avant).
// Échanges (DP-54) : aussi dans l'application des proches BelivaY (choisis, ou trouvés par leur numéro ; ceux qui
// l'ont déjà reçue sont cochés), et par QR code à scanner ; les liens profonds suivent jusqu'au cadeau.
// Pour tout le monde (DP-54) : « Mettre ma liste en statut » (image, QR code, lien court) ; livraison chez moi
// acceptée ou non (adresse jamais montrée) ; compte diaspora : la liste est livrée au Cameroun, au relais d'un proche
// relié (choisi d'un geste) ou à son propre relais quand il vient au pays.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { Fragment, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { chemin } from '../../config/pages'
import { source, type LienFamille, type ListeEnvies, type Produit, type Relais } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useCompteDiaspora, useMajSession } from '../../session'
import { EcartPartage, ecartPartage, offerts, useListes } from './Commun'
import { EnvoiProches } from './Echanges'

const km = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' km'

export function ListeEnvoyer() {
  const { t, tf, langue } = usePreferences()
  const majSession = useMajSession()
  const naviguer = useNavigate()
  const [params] = useSearchParams()
  const id = params.get('id') ?? 'favoris'
  const [d, recharger] = useListes()
  const [relais, setRelais] = useState<Relais[]>([])
  const [produits, setProduits] = useState<Produit[]>([])
  const [prenom, setPrenom] = useState<string | null>(null)
  const [choix, setChoix] = useState<'tiers' | null>(null)
  const [tousRelais, setTousRelais] = useState(false)
  const [copie, setCopie] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const diaspora = useCompteDiaspora()
  const [liens, setLiens] = useState<LienFamille[]>([])
  useEffect(() => {
    source.relaisListe().then((r) => setRelais([...r.relais].sort((a, b) => a.km - b.km)))
    source.produits().then(setProduits)
  }, [])
  // Compte diaspora : ses proches reliés (actifs, avec un relais) reçoivent ses cadeaux au Cameroun.
  useEffect(() => {
    if (diaspora) source.liensFamille().then((x) => setLiens(x.liens.filter((y) => y.etat === 'actif' && y.sens === 'diaspora' && y.relais)))
  }, [diaspora])
  if (!d) return null
  const l = d.listes.find((x) => x.id === id)
  if (!l) return null
  const fermer = chemin('liste-envies', { id: l.id })
  const verrou = offerts(l) > 0
  const groupe = l.mode === 'groupe'
  const sansRelais = !l.relais && l.destination === 'moi'
  const destination = choix ?? l.destination
  const nomTiers = prenom ?? l.tiers?.prenom ?? ''
  const urlDe = (code: string) => `${location.origin}${chemin('liste-publique', { l: code })}`
  const lien = l.partage ? urlDe(l.partage.code) : ''
  const texteDe = (nom: string, url: string) => tf('Ma liste « {n} » sur BelivaY : choisis un article et offre-le. {l}', { n: t(nom), l: url })
  const jusqua = l.partage?.jusqua ?? d.maintenant + 30 * 864e5
  const prod = (p: string) => produits.find((x) => x.p === p)
  const bloque = sansRelais || !l.articles.length || (destination === 'tiers' && !l.tiers)
  const pourquoi = sansRelais ? 'Choisis d’abord ton relais habituel.' : !l.articles.length ? 'Ajoute d’abord des articles à la liste.' : 'Écris d’abord son prénom, puis choisis son relais.'

  const regler = async (r: Parameters<typeof source.reglerListe>[1]) => {
    await source.reglerListe(l.id, r)
    if (r.destination) setChoix(null)
    recharger()
  }
  // Le lien existe dès le premier geste de partage ; il part ensuite du téléphone.
  const assurerLien = async () => {
    if (l.partage) return lien
    const x = await source.partagerListe(l.id)
    recharger()
    return urlDe(x.partage!.code)
  }
  // Le partage du téléphone, la fenêtre WhatsApp et le presse-papiers exigent un toucher direct : quand le lien
  // existe déjà, tout part sans attente ; au premier geste, le lien se crée d'abord, avec un repli (copie, adresse).
  const copierLien = (url: string) => (navigator.clipboard?.writeText(url).catch(() => {}), setCopie(true))
  const envoyer = async (par: 'whatsapp' | 'sms' | 'copier') => {
    if (bloque) return setMessage(pourquoi)
    const url = l.partage ? lien : await assurerLien()
    const texte = texteDe(l.nom, url)
    if (par === 'whatsapp') {
      const wa = 'https://wa.me/?text=' + encodeURIComponent(texte)
      // Sans « noopener » pour savoir si la fenêtre s'est ouverte (bloquée : on y va ici) ; l'opener est coupé ensuite.
      const w = window.open(wa, '_blank')
      if (w) w.opener = null
      else location.href = wa
    } else if (par === 'sms') location.href = 'sms:?&body=' + encodeURIComponent(texte)
    else copierLien(url)
  }
  const partager = async () => {
    if (bloque) return setMessage(pourquoi)
    const url = l.partage ? lien : await assurerLien()
    const nav = navigator as Navigator & { share?: Navigator['share'] }
    if (!nav.share) return copierLien(url)
    try {
      await nav.share({ title: 'BelivaY', text: tf('Ma liste « {n} » sur BelivaY : choisis un article et offre-le.', { n: t(l.nom) }), url })
    } catch (e) {
      // Partage annulé : le lien reste affiché ; refusé (geste trop ancien) : le lien est copié.
      if ((e as Error)?.name === 'NotAllowedError') copierLien(url)
    }
  }
  const retirer = async (p: string) => {
    const r = await source.retirerArticleListe(l.id, p)
    if (!r.ok) setMessage('Un article offert ne se retire jamais.')
    recharger()
  }
  const auPanier = async (p: string) => {
    await source.ajouterProduit(p, {}, 1)
    majSession(await source.session())
    naviguer(chemin('panier'))
  }

  const radio = (on: boolean, titre: string, sous: string, agir: () => void) => (
    <a href="#" role="radio" aria-checked={on} className={'radio' + (on ? ' on' : '')} onClick={(e) => (e.preventDefault(), agir())}>
      <span className="rd"></span>
      <span className="grow">
        <span className="rt" style={{ display: 'block' }}>
          {titre}
        </span>
        <span className="rs" style={{ display: 'block' }}>
          {sous}
        </span>
      </span>
    </a>
  )
  const ferme = (titre: string, sous: string) => (
    <div className="radio" aria-disabled="true" style={{ borderStyle: 'dashed', background: 'var(--sand-2)' }}>
      <span className="rd" style={{ borderColor: 'var(--sand-4)' }}></span>
      <span className="grow">
        <span className="rt c3" style={{ display: 'block' }}>
          {titre}
        </span>
        <span className="rs" style={{ display: 'block' }}>
          {sous}
        </span>
      </span>
      <Icone nom="lock" taille={16} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
    </div>
  )
  const adresse = l.destination === 'moi' ? (l.relais ? tf('Avec mon adresse · {r}', { r: t(l.relais) }) : t('Avec mon adresse')) : l.destination === 'offrant' ? t('Sans adresse · celui qui offre choisit') : l.tiers ? tf('{p} · {r}', { p: l.tiers.prenom, r: t(l.tiers.relais) }) : t('Adresse tierce désignée')
  const remise = groupe ? (l.remiseLe ? tf('groupée, le {d} au plus tard', { d: jourSeul(l.remiseLe, langue) }) : t('groupée')) : t('au fil de l’eau')

  const tiles = (
    <div className="cl14-tiles">
      <button type="button" className="cl14-tile" onClick={() => envoyer('whatsapp')}>
        <Icone nom="message-circle" taille={22} />
        {t('WhatsApp')}
      </button>
      <button type="button" className="cl14-tile" onClick={() => envoyer('sms')}>
        <Icone nom="message-square" taille={22} />
        {t('SMS')}
      </button>
      <button type="button" className="cl14-tile" onClick={() => envoyer('copier')}>
        <Icone nom="copy" taille={22} />
        {t(copie ? 'Lien copié' : 'Copier le lien')}
      </button>
    </div>
  )
  const surprise = (
    <div className="cl14-grp">
      <div className="row" style={{ gap: '12px', alignItems: 'flex-start' }}>
        <div className="grow">
          <div className="t15 b8">{t('Mode surprise')}</div>
          <div className="t13 c3 mt4" style={{ lineHeight: '1.4' }}>
            {t('Le destinataire reçoit « un colis t’attend », sans savoir quoi ni de qui.')}
          </div>
        </div>
        <button type="button" className={'tg' + (l.surprise ? ' on' : '')} role="switch" aria-checked={l.surprise} aria-label={t('Mode surprise')} onClick={() => regler({ surprise: !l.surprise })}></button>
      </div>
    </div>
  )

  const feuille = (
    <>
      <div className="veil" onClick={() => naviguer(fermer)}></div>
      <div className="sheet cl14-long" role="dialog" aria-modal="true" aria-label={tf('Envoyer « {n} »', { n: t(l.nom) })}>
        <div className="grab"></div>
        <div className="cl14-shh">
          <div className="cl14-sheet-h">{tf('Envoyer « {n} »', { n: t(l.nom) })}</div>
          <Link to={fermer} className="cl14-x" aria-label={t('Fermer')}>
            <Icone nom="x" taille={20} />
          </Link>
        </div>
        <div className="t13 c3 mt4" style={{ lineHeight: '1.45' }}>
          {t(l.partage ? 'Ta liste est déjà partagée : renvoie le même lien à d’autres proches.' : 'Tes proches choisissent un article et l’offrent.')}
        </div>
        {l.partage && l.articles.some((a) => !a.offert && ecartPartage(a) !== 0) && (
          <div className="hint-l">
            <Icone nom="refresh-cw" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('Des prix ont changé depuis ton partage du {d} : tes proches voient l’écart et paient le prix du jour.', { d: jourSeul(l.partage.le, langue) })}</span>
          </div>
        )}
        {l.partage && (
          <Link to={chemin('liste-publique', { l: l.partage.code })} className="cl14-link">
            <Icone nom="link" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow" style={{ wordBreak: 'break-all' }}>
              {lien.replace(/^https?:\/\//, '')}
            </span>
            <Icone nom="external-link" taille={16} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
          </Link>
        )}
        {message && (
          <div className="note amber">
            <Icone nom="circle-alert" taille={18} />
            <div>{t(message)}</div>
          </div>
        )}
        {verrou ? (
          <>
            <div className="cl14-grp">
              <div className="cl14-gl">{t('Réglages de la liste')}</div>
              <div className="kv">
                <span className="k">{t('Adresse')}</span>
                <span className="v ">{adresse}</span>
              </div>
              <div className="kv">
                <span className="k">{t('Remise des cadeaux')}</span>
                <span className="v ">{remise}</span>
              </div>
              <div className="kv">
                <span className="k">{t('Mode surprise')}</span>
                <span className="v ">{t(l.surprise ? 'activé' : 'désactivé')}</span>
              </div>
              <div className="kv">
                <span className="k">{t('Lien valable')}</span>
                <span className="v ">{l.partage ? tf('jusqu’au {d}', { d: jourSeul(l.partage.jusqua, langue) }) : t('30 jours, dès le partage')}</span>
              </div>
            </div>
            <div className="note ink">
              <Icone nom="lock" taille={18} />
              <div>{t('Des cadeaux sont déjà payés : l’adresse et la remise ne changent plus.')}</div>
            </div>
            {surprise}
          </>
        ) : (
          <>
            <div className="cl14-grp">
              <div className="cl14-gl">{t('Où vont les cadeaux')}</div>
              {diaspora && (
                <div className="hint-l blv-diaspora-liste">
                  <Icone nom="globe" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
                  <span>{t('Compte diaspora : les cadeaux sont livrés au Cameroun. Au relais d’un proche relié, qui les retire avec son code ; ou à ton relais, si tu viens au pays (tu les retires toi-même sur place).')}</span>
                </div>
              )}
              {diaspora && liens.length > 0 && (
                <div className="chips" role="radiogroup" aria-label={t('Livrer à un proche relié')}>
                  {liens.map((x) => (
                    <a key={x.id} href="#" role="radio" aria-checked={l.destination === 'tiers' && l.tiers?.prenom === x.prenom} className={'chip' + (l.destination === 'tiers' && l.tiers?.prenom === x.prenom ? ' on' : '')} onClick={(e) => (e.preventDefault(), regler({ destination: 'tiers', tiers: { prenom: x.prenom, relais: /^Relais /.test(x.relais!) ? x.relais! : 'Relais ' + x.relais }, domicile: !!x.domicile }))}>
                      <Icone nom="users" taille={14} />
                      {tf('{p} · {q}', { p: x.prenom, q: t(x.relais!.replace(/^Relais /, '')) })}
                    </a>
                  ))}
                </div>
              )}
              {l.relais || l.destination !== 'moi'
                ? radio(destination === 'moi', t(diaspora ? 'À moi, quand je viens au Cameroun' : 'Avec mon adresse'), l.relais && l.destination === 'moi' ? tf('Au {r}. Tes proches ne voient que le quartier.', { r: t(l.relais) }) : t('À ton relais habituel. Tes proches ne voient que le quartier.'), () => regler({ destination: 'moi' }))
                : ferme(t(diaspora ? 'À moi, quand je viens au Cameroun' : 'Avec mon adresse'), t(diaspora ? 'Choisis d’abord le relais où tu passeras au Cameroun.' : 'Choisis d’abord ton relais habituel.'))}
              {destination === 'moi' && !groupe && !diaspora && l.relais && (
                <div className="card flat mt8">
                  <div className="row" style={{ gap: 12 }}>
                    <span className="grow">
                      <b className="t14" style={{ display: 'block' }}>
                        {t('Livraison chez moi possible')}
                      </b>
                      <span className="t13 c3">{t('Celui qui offre peut aussi te faire livrer chez toi (plus cher que le relais). Ton adresse ne lui est jamais montrée : le livreur t’appelle.')}</span>
                    </span>
                    <button type="button" className={'tg' + (l.domicile ? ' on' : '')} role="switch" aria-checked={!!l.domicile} aria-label={t('Livraison chez moi possible')} onClick={() => regler({ domicile: !l.domicile })}></button>
                  </div>
                </div>
              )}
              {sansRelais && (
                <div className="btns">
                  <Link to={chemin('relais-choix', { retour: `liste-envoyer?id=${l.id}` })} className="btn ghost">
                    <Icone nom="map-pin" taille={18} />
                    <span>{t('Choisir mon relais')}</span>
                  </Link>
                </div>
              )}
              {groupe
                ? ferme(t('Sans adresse'), t('Impossible pour une liste groupée : tous les cadeaux doivent arriver au même relais.'))
                : radio(destination === 'offrant', t('Sans adresse'), t('Celui qui offre choisit où livrer : chez lui ou chez quelqu’un d’autre.'), () => regler({ destination: 'offrant' }))}
              {radio(destination === 'tiers', t('Adresse tierce désignée'), t('Le relais d’un proche que tu choisis.'), () => setChoix('tiers'))}
              {destination === 'tiers' && (
                <div className="mt10">
                  <div className="fld">
                    <label htmlFor="le-prenom">{t('Pour qui ?')}</label>
                    <div className="inp">
                      <Icone nom="user" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
                      <input id="le-prenom" className="grow" value={nomTiers} maxLength={30} onChange={(e) => setPrenom(e.target.value)} />
                    </div>
                    <div className="hint">{t(nomTiers.trim() ? 'Son prénom apparaît dans le message d’arrivée.' : 'Écris d’abord son prénom, puis choisis son relais.')}</div>
                  </div>
                  {(tousRelais ? relais : relais.slice(0, 4)).map((r) => (
                    <Fragment key={r.nom}>{r.plein && groupe ? ferme(tf('{r} · {k}', { r: t(r.nom), k: km(r.km) }), t('Plein aujourd’hui : il ne prend pas de nouvelle liste groupée.')) : radio(l.destination === 'tiers' && l.tiers?.relais === r.nom, tf('{r} · {k}', { r: t(r.nom), k: km(r.km) }), tf('Ouvert {h} · fermé le {f}', { h: t(r.horaires), f: t(r.ferme) }), () => (nomTiers.trim() ? regler({ destination: 'tiers', tiers: { prenom: nomTiers.trim(), relais: r.nom } }) : setMessage('Écris d’abord son prénom, puis choisis son relais.')))}</Fragment>
                  ))}
                  {relais.length > 4 && (
                    <div className="btns">
                      <button type="button" className="btn ghost" onClick={() => setTousRelais(!tousRelais)}>
                        <span>{t(tousRelais ? 'Moins de relais' : 'Plus de relais')}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="cl14-grp">
              <div className="cl14-gl">{t('Quand les colis partent')}</div>
              <div className="cl14-ro">
                <span className={groupe ? '' : 'on'}>{t('Au fil de l’eau')}</span>
                <span className={groupe ? 'on' : ''}>{t('Groupé')}</span>
              </div>
              <div className="hint-l">
                <Icone nom={groupe ? 'boxes' : 'package'} taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
                <span>{t(groupe ? 'Les colis attendent au relais et sont remis ensemble, avec un seul code. Aucun frais de garde pendant l’attente.' : 'Chaque cadeau part dès qu’il est payé, avec son propre code.')}</span>
              </div>
              {groupe ? (
                <>
                  <div className="cl14-gl mt14">{t('Date de remise')}</div>
                  <div className="fld">
                    <div className="inp">
                      <Icone nom="calendar" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
                      <span className="grow">{l.remiseLe ? jourSeul(l.remiseLe, langue) : t('Dès que tout est offert')}</span>
                    </div>
                    <div className="hint">{t('Fixée à la création. Les colis partent ce jour-là même si tout n’est pas offert, et au plus tard 21 jours après le premier cadeau payé.')}</div>
                  </div>
                </>
              ) : (
                <div className="hint-l">
                  <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
                  <span>{t('Choisi à la création de la liste.')}</span>
                </div>
              )}
            </div>
            {surprise}
            <div className="cl14-grp">
              <div className="cl14-gl">{t('Validité du lien')}</div>
              <div className="seg">
                {[7, 30, 90].map((j) => (
                  <a key={j} href="#" className={j === 30 ? 'on' : ''} aria-pressed={j === 30} aria-disabled={j !== 30} style={j === 30 ? undefined : { opacity: 0.5 }} onClick={(e) => (e.preventDefault(), j !== 30 && setMessage('Un lien de liste vaut 30 jours ; repartage-le ensuite.'))}>
                    {tf('{n} jours', { n: j })}
                  </a>
                ))}
              </div>
              <div className="hint-l">
                <Icone nom="calendar" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
                <span>{tf('Valable jusqu’au {d} inclus ; ensuite, le lien affiche « Cette liste n’est plus partagée ».', { d: jourSeul(jusqua, langue) })}</span>
              </div>
            </div>
          </>
        )}
        {tiles}
        {!bloque && l.articles.some((a) => !a.offert) && (
          <div className="btns">
            <Link to={chemin('liste-statut', { id: l.id })} className="btn soft">
              <Icone nom="image" taille={18} />
              <span>{t('Mettre ma liste en statut')}</span>
            </Link>
          </div>
        )}
        {!l.favoris && <EnvoiProches objet={{ type: 'liste', id: l.id }} lien={lien} avant={async () => (bloque ? (setMessage(pourquoi), false) : (await assurerLien(), true))} />}
        {l.partage ? (
          <div className="links">
            <Link to={chemin('liste-publique', { l: l.partage.code })}>{t('Voir ce que reçoivent tes proches')}</Link>
            <a href="#" onClick={async (e) => (e.preventDefault(), await source.arreterPartage(l.id), setCopie(false), recharger())}>
              {t('Arrêter le partage')}
            </a>
          </div>
        ) : (
          <div className="btns">
            <button type="button" className={'btn primary' + (bloque ? ' off' : '')} onClick={partager}>
              <Icone nom="share-2" taille={18} />
              <span>{t('Partager le lien')}</span>
            </button>
          </div>
        )}
        <div className="hint-l">
          <Icone nom="send" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Par WhatsApp ou SMS, le lien part de ton téléphone. Dans l’application, tes proches ne reçoivent que ce que tu leur envoies : BelivaY ne les relance jamais de lui-même.')}</span>
        </div>
        {!verrou && (
          <div className="note ink">
            <Icone nom="lock" taille={18} />
            <div>{t('Celui qui reçoit le lien voit les articles, leurs prix et le quartier de ton relais. Jamais ton adresse, ton numéro, ni tes autres commandes.')}</div>
          </div>
        )}
      </div>
    </>
  )

  // Le fond : la liste telle qu'elle est (onglets des listes, état du partage, articles au prix du jour).
  const nOfferts = offerts(l)
  const etat = (x: ListeEnvies) => (x.partage ? (x.mode === 'groupe' ? (x.remiseLe ? tf('Mode groupé · remise le {d}', { d: jourSeul(x.remiseLe, langue) }) : t('Mode groupé')) : t('Au fil de l’eau')) : t('Pas encore partagée'))
  return (
    <Ecran route="liste-envoyer" gabarit="compte" fixes={feuille}>
      <Styles id="02f3dac5cd" />
      {!INTERRUPTEURS_DU_LANCEMENT['FF-LISTE-ENVIES'] && (
        <div className="cl14-top">
          <span className="cl14-ff">
            <Icone nom="lock" taille={13} />
            {t('Après le lancement · interrupteur fermé')}
          </span>
          <span className="cl14-ffc">{t('FF-LISTE-ENVIES')}</span>
        </div>
      )}
      <div className="chips">
        <Link to={chemin('listes')} className="chip">
          {t('Toutes')}{' '}
          <span className="n">{d.listes.length}</span>
        </Link>
        {d.listes.map((x) => (
          <Link key={x.id} to={chemin('liste-envies', { id: x.id })} className={'chip' + (x.id === l.id ? ' on' : '')}>
            {t(x.nom)}{' '}
            <span className="n">{x.articles.length}</span>
          </Link>
        ))}
      </div>
      <div className="card">
        <div className="cl14-lh">
          {l.partage ? (
            <span className="pill or sm">
              <Icone nom="link" taille={13} />
              {t('Partagée')}
            </span>
          ) : (
            <span className="pill ink sm">
              <Icone nom={l.favoris ? 'heart' : 'gift'} taille={13} />
              {t(l.favoris ? 'Liste par défaut' : 'Liste d’envies')}
            </span>
          )}
          <span className="grow">{etat(l)}</span>
        </div>
        {l.favoris && (
          <div className="t13 c2 mt8" style={{ lineHeight: '1.45' }}>
            {t('La même que tes Sauvegardés du panier : un cœur sur une fiche l’ajoute ici. Baisse de prix et retour en stock : un push gratuit, sur la variante exacte.')}
          </div>
        )}
        {l.partage && l.articles.length > 0 && (
          <>
            <div className="cl14-num mt10">
              {tf('{n} sur {t}', { n: nOfferts, t: l.articles.length })}
              <small>{t('articles offerts')}</small>
            </div>
            <div className="cl14-q" style={{ gridTemplateColumns: `repeat(${l.articles.length},1fr)` }}>
              {l.articles.map((a) => (
                <i key={a.p} className={a.offert ? 'on' : ''}></i>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="sec">
        <h2>{t('Les articles')}</h2>
      </div>
      {l.articles.map((a) => {
        const pr = prod(a.p)
        const barre = pr?.prixBarre && pr.prixBarre > a.prix ? pr.prixBarre : null
        return (
          <div key={a.p} className="card cl14-it">
            {a.offert ? (
              <span className="cl14-bin dim" aria-label={t('Article offert : il ne se retire pas')}>
                <Icone nom="lock" taille={18} />
              </span>
            ) : (
              <button type="button" className="cl14-bin" aria-label={t('Retirer de la liste')} onClick={() => retirer(a.p)}>
                <Icone nom="trash-2" taille={19} />
              </button>
            )}
            <div className="row" style={{ alignItems: 'flex-start', gap: '12px' }}>
              <span>
                <span className="thumb" style={{ width: '72px', height: '72px', borderRadius: '18px' }}>
                  <Dessin id={a.dessin} />
                </span>
              </span>
              <div className="grow">
                <div className="cn">{t(a.titre)}</div>
                {pr?.variante && <div className="cv">{t(pr.variante)}</div>}
                <div className="mt6 cl14-po">
                  <span className="price">
                    {F(a.prix)}
                    <small> F</small>
                  </span>
                  {barre && (
                    <>
                      {' '}
                      <s className="was">{F(barre)}&nbsp;F</s>{' '}
                      <span className="off">−{Math.round((1 - a.prix / barre) * 100)}&nbsp;%</span>
                    </>
                  )}
                </div>
                {!a.offert && <EcartPartage a={a} le={l.partage?.le ?? null} />}
                <div className="cl14-meta">
                  <span className="dl">{a.livraison ? tf('+ {m} F de retrait', { m: F(a.livraison) }) : t('Retrait offert')}</span>
                  {pr && (
                    <span>
                      <Icone nom="map-pin" taille={13} />
                      {km(pr.vendeur.km)}
                    </span>
                  )}
                  {!a.offert && <span>{t(pr && pr.stock <= 0 ? 'Épuisé' : 'Disponible')}</span>}
                </div>
                {a.offert && (
                  <div className="cl14-ok">
                    <Icone nom="gift" taille={15} />
                    {l.surprise ? t('Offert') : tf('Offert par {p}', { p: a.offert.par })}
                  </div>
                )}
              </div>
            </div>
            {!a.offert && (
              <div className="btns mt12">
                {l.favoris ? (
                  <button type="button" className="btn soft" onClick={() => auPanier(a.p)}>
                    <Icone nom="shopping-cart" taille={18} />
                    <span>{t('Ajouter au panier')}</span>
                  </button>
                ) : (
                  <Link to={chemin('fiche', { p: a.p })} className="btn soft">
                    <span>{t('Voir l’article')}</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        )
      })}
      <div className="hint-l">
        <Icone nom="refresh-cw" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t(l.partage ? 'Les prix se mettent à jour à chaque visite : jamais un prix figé. Le prix du partage reste affiché à côté : celui qui offre paie le prix du jour et accepte une hausse avant de payer.' : 'Les prix se mettent à jour à chaque visite : jamais un prix figé.')}</span>
      </div>
      <div className="cl14-spc" aria-hidden="true" style={{ height: '440px' }}></div>
    </Ecran>
  )
}
