// Écran « Mon panier » (CL-07), présentation d'origine (photo du porteur) et logique réelle (DP-54) :
// - une section par boutique (un colis) : article, paramètres (couleur, capacité, taille ; indisponible barré)
//   à changer sur place, stock, quantité, retirer (annulable), mettre en favori (boutons, ou ligne glissée à gauche
//   ou à droite : composants/Glisser.tsx) ; ajouts de la même boutique ; le vendeur est celui de l'offre attribuée
//   (meilleure offre D8, v1.4) : le client ne le choisit plus ;
// - frais selon BV-DEV v2.0 (DP-69 ; src/donnees/achat.ts, src/calculs) : livraison offerte sur le panier entier
//   (R07), panier minimum (R84 : « Passer commande » bloqué, le colis nommé par un produit, jamais par le vendeur) ;
// - relais ou domicile choisi ici, une seule fois (repris au paiement, jamais reproposé) ; barre du bas réduite à
//   l'essentiel : total, livraison, « Passer commande » ; le détail (frais de paiement, heure estimée) est replié ;
//   alertes de stock et de baisse de prix ; accessoires compatibles (donnees/accessoires.ts) ;
//   « Pour plus tard » (l'article sort du total, gardé sous le panier) ; partage du panier à un proche (lien de
//   paiement, CL-12/Diaspora pour plus d'options) ;
// - « Passer commande » : connexion, numéro vérifié, puis le paiement (au relais : maintenant ou au comptoir) ;
// - « Pour qui ? » : le panier payé pour un proche, au relais du proche ; qui paie la livraison (CL-14/Echanges).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Aside, Colonne, Gabarit } from '../../composants/Gabarits'
import { AlerteBaissePrix } from '../../composants/AlerteBaissePrix'
import { Dessin } from '../../composants/Dessin'
import { Feuille } from '../../composants/Feuille'
import { Glisser } from '../../composants/Glisser'
import { useLieu } from '../../composants/PourQui'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { calculerAchat, NOM_FORMAT, formatColis } from '../../donnees/achat'
import { Module } from '../../composants/Module'
import { couvertureMax, seuilOffert, walletOuvert } from '../../calculs'
import { source, type DonneesPanier, type LienFamille, type LignePanier, type PanierPartage } from '../../donnees/source'
import type { AccessoireCompatible } from '../../donnees/accessoires'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useCompteDiaspora, useMajSession, useSession } from '../../session'
import { MentionDemo } from '../../composants/BandeauDemo'
import { PourQuiPanier } from '../CL-14/Echanges'

// En-tête : « Partager le panier » ouvre la page qui prépare le message et l'envoie à celui qui paie (Diaspora).
export function ActionPartagerPanier() {
  const { t } = usePreferences()
  return (
    <Link className="cl07-sq" to={chemin('diaspora')} aria-label={t('Partager le panier')}>
      <Icone nom="share-2" taille={20} />
    </Link>
  )
}

const COULEURS = ['var(--or)', 'var(--or-m)', 'var(--ink-2)', 'var(--green)', 'var(--info, #4c7bd9)']

function Ligne({ l, agir, retirer, compatibles }: { l: LignePanier; agir: (p: Promise<unknown>, texte?: string) => Promise<void>; retirer: (l: LignePanier) => void; compatibles: AccessoireCompatible[] }) {
  const { t, tf } = usePreferences()
  const enFavori = () => agir(source.mettreEnFavori(l.id), tf('« {p} » mis en favori : il sort du total.', { p: t(l.titre) }))
  const plusTard = () => agir(source.enregistrerPlusTard(l.id), tf('« {p} » enregistré pour plus tard : il sort du total, il t’attend sous le panier.', { p: t(l.titre) }))
  const [ouvert, setOuvert] = useState(false)
  return (
    <div className="blk">
      {/* Glisser la ligne (DP-54, consigne du porteur) : à gauche « Supprimer » (annulable), à droite « Mettre en
          favori » ; mêmes actions que les deux boutons de la ligne, qui restent. */}
      <Glisser
        classe="pan-gl"
        droite={{ libelle: t('Supprimer'), icone: 'trash-2', ton: 'rouge', son: 'favoriRetire', agir: () => retirer(l) }}
        gauche={{ libelle: t('Mettre en favori'), icone: 'heart', ton: 'marque', son: 'favori', agir: enFavori }}
      >
      <div className="cl07-ln">
        <Link to={chemin('fiche', { p: l.p })} className="im" aria-label={t(l.titre)}>
          <span className="thumb" style={{ width: '64px', height: '64px', borderRadius: '16px' }}>
            <Dessin id={l.dessin} image={l.image} alt={l.titre} tailles="64px" />
          </span>
        </Link>
        <div className="grow">
          <div className="row" style={{ alignItems: 'flex-start', gap: '4px' }}>
            <div className="grow">
              <Link to={chemin('fiche', { p: l.p })} className="cn">
                {t(l.titre)}
              </Link>
              {l.variante && <div className="cv">{t(l.variante)}</div>}
            </div>
            <span className="ic2">
              <a href="#" aria-label={t('Mettre en favori')} onClick={(e) => (e.preventDefault(), enFavori())}>
                <Icone nom="bookmark" taille={19} />
              </a>
              <a href="#" aria-label={t('Retirer l’article')} data-retirer={l.id}>
                <Icone nom="trash-2" taille={19} />
              </a>
            </span>
          </div>
          <div className="cl07-st">
            <span className="cl07-stp">
              <a href="#" className={'b' + (l.qte <= 1 ? ' dis' : '')} aria-label={t('Moins')} aria-disabled={l.qte <= 1 || undefined} onClick={(e) => (e.preventDefault(), l.qte > 1 && agir(source.changerQuantite(l.id, l.qte - 1)))}>
                <Icone nom="minus" taille={16} />
              </a>
              <b aria-live="polite">{l.qte}</b>
              <a href="#" className={'b' + (l.qte >= l.stock ? ' dis' : '')} aria-label={t('Plus')} aria-disabled={l.qte >= l.stock || undefined} onClick={(e) => (e.preventDefault(), l.qte < l.stock && agir(source.changerQuantite(l.id, l.qte + 1)))}>
                <Icone nom="plus" taille={16} />
              </a>
            </span>
            <span className="cl07-op">{F(l.prix * l.qte)} F</span>
          </div>
          <div className="pan-st">
            <span className={'pill sm ' + (l.stock > 3 ? 'green' : 'amber')}>{t(l.stock > 3 ? 'En stock' : 'Bientôt épuisé')}</span>
            <span className={'t12 ' + (l.stock <= 3 ? 'pan-alerte' : 'c3')}>{l.stock <= 3 ? (l.qte >= l.stock ? t('Tu prends les derniers') : tf('Plus que {n} en stock', { n: l.stock })) : tf('{n} disponibles', { n: l.stock })}</span>
            <i className="jauge" aria-hidden="true">
              <b style={{ width: Math.min(100, l.stock * 4) + '%' }} />
            </i>
          </div>
          {!!l.prixJour && <AlerteBaissePrix avant={l.prix} apres={l.prixJour} fin={tf('Tu paies {p} F au paiement.', { p: F(l.prixJour * l.qte) })} />}
          <div className="pan-act">
            {l.options && l.options.length > 0 && (
              <a href="#" aria-expanded={ouvert} onClick={(e) => (e.preventDefault(), setOuvert(!ouvert))}>
                <Icone nom="sliders-horizontal" taille={14} /> {t(ouvert ? 'Fermer' : 'Modifier')}
              </a>
            )}
            <a href="#" onClick={(e) => (e.preventDefault(), plusTard())} aria-label={tf('Enregistrer pour plus tard : {p}', { p: t(l.titre) })}>
              <Icone nom="clock" taille={14} /> {t('Pour plus tard')}
            </a>
          </div>
        </div>
      </div>
      </Glisser>
      {ouvert &&
        l.options?.map((o) => (
          <div key={o.nom} className="pan-opt">
            <div className="kick">{t(o.nom)}</div>
            <div className="chips">
              {o.valeurs.map((v) => {
                const indispo = o.indispo?.includes(v)
                return (
                  <a
                    key={v}
                    href="#"
                    className={'chip' + (o.choisi === v ? ' on' : '') + (indispo ? ' off' : '')}
                    aria-pressed={o.choisi === v}
                    aria-disabled={indispo || undefined}
                    title={indispo ? t('Épuisé') : undefined}
                    onClick={(e) => (e.preventDefault(), !indispo && agir(source.changerOption(l.id, o.nom, v)))}
                  >
                    {indispo ? <s>{t(v)}</s> : t(v)}
                  </a>
                )
              })}
            </div>
          </div>
        ))}
      {compatibles.length > 0 && (
        <div className="pan-acc">
          <div className="cl07-lab">{tf('Accessoires compatibles · {p}', { p: t(l.titre) })}</div>
          <div className="pan-acc-l">
            {compatibles.map((a) => (
              <div key={a.p} className="pan-acc-i">
                <Link to={chemin('fiche', { p: a.p })} className="ph" aria-label={t(a.titre)}>
                  <Dessin id={a.dessin} alt={a.titre} tailles="56px" />
                </Link>
                <div className="grow">
                  <Link to={chemin('fiche', { p: a.p })} className="t">
                    {t(a.titre)}
                  </Link>
                  <span className="p">
                    {F(a.prix)} F <small>{t(a.boutique === l.boutique ? '· même colis' : '· un colis de plus')}</small>
                  </span>
                </div>
                <button type="button" className="btn soft sm" aria-label={tf('Ajouter au panier : {p}', { p: t(a.titre) })} onClick={() => agir(source.ajouterProduit(a.p, {}, 1), tf('« {p} » ajouté au panier.', { p: t(a.titre) }))}>
                  <span>{t('+ Ajouter')}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// « Enregistré pour plus tard » : hors du total, au prix et au stock du jour ; baisse depuis l'enregistrement, stock bas
// ou épuisé ; remis au panier au prix du jour, ou retiré.
function PlusTard({ d, agir }: { d: DonneesPanier; agir: (p: Promise<unknown>, texte?: string) => Promise<void> }) {
  const { t, tf } = usePreferences()
  const l = d.plusTard ?? []
  if (!l.length) return null
  return (
    <section className="card pan-pt" aria-labelledby="pan-pt-t">
      <h2 className="cl07-lab" id="pan-pt-t">
        {tf('Enregistré pour plus tard ({n})', { n: l.length })}
      </h2>
      {l.map((x) => (
        <div key={x.id} className="pan-pt-i">
          <Link to={chemin('fiche', { p: x.p })} aria-label={t(x.titre)}>
            <span className="thumb" style={{ width: '52px', height: '52px', borderRadius: '13px' }}>
              <Dessin id={x.dessin} image={x.image} alt={x.titre} tailles="52px" />
            </span>
          </Link>
          <div className="grow">
            <Link to={chemin('fiche', { p: x.p })} className="cn">
              {t(x.titre + (x.variante ? ' · ' + x.variante : ''))}
            </Link>
            <div className="pz">
              <b>{F(x.prix)} F</b>
              {x.prixAvant && x.prixAvant > x.prix && (
                <>
                  {' '}
                  <s>{F(x.prixAvant)} F</s>
                </>
              )}
            </div>
            <AlerteBaissePrix avant={x.prixAvant} apres={x.prix} depuis="enregistrement" />
            {x.stock <= 3 && <div className="t12 pan-alerte">{x.stock <= 0 ? t('Épuisé : il revient au panier dès son retour en stock.') : tf('Plus que {n} en stock', { n: x.stock })}</div>}
          </div>
          <div className="pan-pt-b">
            <button type="button" className="btn secondary sm" disabled={x.stock <= 0} onClick={() => agir(source.remettreDuPlusTard(x.id), tf('« {p} » remis au panier, au prix du jour.', { p: t(x.titre) }))}>
              <span>{t('Remettre au panier')}</span>
            </button>
            <button type="button" className="btn ghost sm" aria-label={tf('Retirer de la liste : {p}', { p: t(x.titre) })} onClick={() => agir(source.retirerDuPlusTard(x.id), tf('« {p} » retiré de la liste.', { p: t(x.titre) }))}>
              <span>{t('Retirer')}</span>
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}

// Partager le panier à un proche : un lien de paiement (le proche voit les articles et le total, paie, tu retires
// avec ton code) ; Partager, WhatsApp ou copier. Plus d'options (choix des articles, paiement depuis l'étranger) :
// CL-12/Diaspora.
function PartageProche({ ouverte, fermer }: { ouverte: boolean; fermer: () => void }) {
  const { t, tf } = usePreferences()
  const [pp, setPp] = useState<PanierPartage | null>(null)
  const [copie, setCopie] = useState(false)
  const [vide, setVide] = useState(false)
  const lien = pp ? `${location.origin}${chemin('payeur', { id: pp.id })}` : ''
  const texte = pp ? tf('{p} t’envoie son panier BelivaY ({m} F) : {l}', { p: pp.prenom, m: F(pp.total), l: lien }) : ''
  const creer = async () => {
    const r = await source.partagerPanier()
    if (!r) return setVide(true)
    setPp(r)
  }
  const partager = () => {
    if (navigator.share) navigator.share({ title: 'BelivaY', text: texte, url: lien }).catch(() => {})
    else copier()
  }
  const copier = () => {
    navigator.clipboard?.writeText(texte).catch(() => {})
    setCopie(true)
  }
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Partager à un proche')}>
      <div className="pan-pp">
        <h2 className="cl03-sheet-t">{t('Partager ce panier à un proche')}</h2>
        <p className="t13 c3">{t('Il voit les articles et le total livré, il paie ; tu retires au relais avec ton code. Son paiement reste bloqué jusqu’à ton retrait.')}</p>
        {vide && <div className="note amber mt8">{t('Ton panier est vide : rien à partager.')}</div>}
        {pp ? (
          <>
            <div className="card flat mt12">
              <div className="t13 b8">{tf('Lien prêt · {m} F livrés', { m: F(pp.total) })}</div>
              <div className="t12 c3 pan-pp-l">{lien}</div>
            </div>
            <div className="btns mt12">
              <button type="button" className="btn primary" onClick={partager}>
                <Icone nom="share-2" taille={18} />
                <span>{t('Partager')}</span>
              </button>
              <a className="btn secondary" href={'https://wa.me/?text=' + encodeURIComponent(texte)} target="_blank" rel="noreferrer">
                <Icone nom="message-circle" taille={18} />
                <span>{t('WhatsApp')}</span>
              </a>
              <button type="button" className="btn ghost" onClick={copier}>
                <Icone nom="copy" taille={18} />
                <span>{t(copie ? 'Lien copié' : 'Copier le lien')}</span>
              </button>
            </div>
            <p className="t12 c3 mt8">
              <Link to={chemin('payeur', { id: pp.id })}>{t('Voir la page qu’il reçoit')}</Link>
            </p>
          </>
        ) : (
          <div className="btns mt12">
            <button type="button" className="btn primary" onClick={creer}>
              <Icone nom="link" taille={18} />
              <span>{t('Créer le lien du panier')}</span>
            </button>
          </div>
        )}
        <p className="t12 c3 mt8">
          <Link to={chemin('diaspora')}>{t('Plus d’options : choisir les articles, paiement depuis l’étranger')}</Link>
        </p>
      </div>
    </Feuille>
  )
}

export function Panier() {
  const { t, tf } = usePreferences()
  const session = useSession()
  const majSession = useMajSession()
  const naviguer = useNavigate()
  const [d, setD] = useState<DonneesPanier | null>(null)
  const [annuler, setAnnuler] = useState<{ ligne: LignePanier; index: number } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [partage, setPartage] = useState(false)
  // Compte diaspora (DP-54) : « Pour qui ? » est obligatoire ; ni comptoir, ni retrait pour lui-même.
  const diaspora = useCompteDiaspora()
  const [proches, setProches] = useState<LienFamille[]>([])
  // « Pour qui ? » : le proche actif du compte (mémorisé, le même sur tout le site).
  const lieu = useLieu()
  const choisirPourQui = async (id: string) => {
    const r = await source.choisirProche(id)
    if (r.ok) majSession(await source.session())
  }
  // Dès 1024 px (§ 5.6) : les colis à gauche, le récapitulatif collant à droite avec « Pour qui ? » et « Passer
  // commande » (la barre fixée en bas n'existe plus) ; les favoris sous les deux colonnes.
  const tabL = useDes('tab-l')
  useEffect(() => {
    if (diaspora) source.liensFamille().then((r) => setProches(r.liens.filter((l) => l.sens === 'diaspora' && l.etat === 'actif')))
  }, [diaspora])
  const charger = async () => {
    setD(await source.panier())
    majSession(await source.session())
  }
  useEffect(() => {
    source.panier().then(setD)
  }, [])
  if (!d) return null

  // Relais ou domicile, choisi ici (repris au paiement) ; un colis XL ne va qu'à domicile (R10). Compte diaspora :
  // le relais du proche (ou chez lui), choisi à l'étape suivante ; le panier compte au relais.
  const achat = calculerAchat(d, diaspora ? 'relais' : d.mode, Date.now())
  const { boutiques, xl, mode, frais: fr, paiement: pm, minimum } = achat
  const sousTotal = d.lignes.reduce((t, l) => t + l.prix * l.qte, 0)
  const livraison = fr?.client ?? 0
  const total = pm?.total_momo ?? sousTotal + livraison
  const bloque = minimum ? minimum.texte : achat.refus === 'hors-gabarit' ? 'Hors gabarit : livraison sur devis.' : null
  const choisirMode = async (m: 'relais' | 'domicile') => {
    if (m === mode || (m === 'relais' && xl)) return
    await source.choisirModePanier(m)
    await charger()
  }
  const nbArticles = d.lignes.reduce((n, l) => n + l.qte, 0)

  const agir = async (p: Promise<unknown>, texte?: string) => {
    await p
    if (texte) (setMessage(texte), setAnnuler(null))
    await charger()
  }
  const retirer = (l: LignePanier) => {
    setAnnuler({ ligne: l, index: d.lignes.indexOf(l) })
    setMessage(null)
    agir(source.retirerLigne(l.id))
  }
  const commander = () => {
    if (bloque) return
    if (!session.connecte) return naviguer(chemin('connexion', { next: '/panier' }))
    if (!d.numeroVerifie) return naviguer(chemin('numero', { from: 'panier' }))
    naviguer(chemin('paiement-moyen'))
  }

  const choisi = proches.find((l) => l.id === session.proche?.id) ?? (proches.length === 1 ? proches[0] : null)
  const actionsDiaspora = (
    <>
      {choisi ? (
        <Link to={chemin('commander-pour', { lien: choisi.id })} className="btn primary">
          <Icone nom="send" taille={18} />
          <span>{tf('Commander pour {p} · {m} F', { p: choisi.prenom, m: F(sousTotal + livraison) })}</span>
        </Link>
      ) : (
        <Link to={chemin(proches.length ? 'commander-pour' : 'proches')} className="btn primary">
          <Icone nom="users" taille={18} />
          <span>{t(proches.length ? 'Choisir pour qui' : 'Relier d’abord un proche')}</span>
        </Link>
      )}
      <div className="pr">{t('Compte diaspora : le colis part au relais de ton proche ou chez lui ; il reçoit son code, toi la preuve.')}</div>
    </>
  )
  // Barre du bas (consigne du porteur) : l'essentiel seulement, total frais de paiement compris (R02), une ligne de
  // livraison, « Passer commande » ; bloqué sous le panier minimum (R84), avec ce qu'il manque.
  const totalLivre = !diaspora && (
    <div className="pan-tl" data-total-livre>
      <span>
        {t('Total')} <b>{F(total)} F</b>
      </span>
      <small>{fr && fr.client === 0 ? t('Livraison offerte') : tf('dont livraison {l} F', { l: F(livraison) })}</small>
    </div>
  )
  const actions = diaspora ? actionsDiaspora : (
    <>
      {bloque && (
        <div className="cl07-why" role="status" data-minimum>
          {t(bloque)}
        </div>
      )}
      <button type="button" className={'btn primary' + (bloque ? ' off' : '')} aria-disabled={!!bloque || undefined} onClick={commander}>
        <Icone nom="truck" taille={18} />
        <span>{t('Passer commande')}</span>
      </button>
    </>
  )
  // Téléphone : le total livré au-dessus de « Passer commande » (à l'ordinateur, le récapitulatif est à côté).
  const barre = (
    <div className="cl07-bar">
      {totalLivre}
      {actions}
    </div>
  )
  const toast = annuler && (
    <div className="cl10-toast" role="status" style={tabL ? undefined : { bottom: 190 }}>
      <span>{tf('« {p} » retiré du panier.', { p: t(annuler.ligne.titre) })}</span>
      <button
        type="button"
        style={{ background: 'none', border: 0, color: 'inherit', font: 'inherit', fontWeight: 800, textDecoration: 'underline' }}
        onClick={() => agir(source.remettreLigne(annuler.ligne, annuler.index)).then(() => setAnnuler(null))}
      >
        {t('Annuler')}
      </button>
    </div>
  )

  if (!d.lignes.length)
    return (
      <Ecran route="panier" fixes={toast} action={<ActionPartagerPanier />} gabarit="centre">
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="shopping-cart" taille={26} />
            </div>
            <h3>{t('Ton panier est vide')}</h3>
            <p>{t('Ajoute un article depuis sa fiche : il est réservé pendant que tu paies, et ton argent reste bloqué jusqu’au retrait.')}</p>
            <div className="btns">
              <Link to={chemin('categories')} className="btn primary">
                <span>{t('Découvrir les produits')}</span>
              </Link>
            </div>
          </div>
        </div>
        <PlusTard d={d} agir={agir} />
        <Favoris d={d} agir={agir} />
      </Ecran>
    )

  const pourQuiHaut = (
    <>
    {diaspora ? (
      <div className="card">
        <h3 className="cl11-k">{t('Pour qui ?')}</h3>
        {proches.length ? (
          <div className="chips">
            {proches.map((l) => (
              <button key={l.id} type="button" role="radio" aria-checked={choisi?.id === l.id} className={'chip' + (choisi?.id === l.id ? ' on' : '')} onClick={() => choisirPourQui(l.id)}>
                {l.prenom}
              </button>
            ))}
          </div>
        ) : (
          <p className="t13 c3">
            {t('Aucun proche relié : relie d’abord un proche au Cameroun (son code famille ou ton lien d’invitation).')} <Link to={chemin('proches')}>{t('Mes proches')}</Link>
          </p>
        )}
        {choisi && <p className="t12 c3">{tf(choisi.domicile ? 'Relais de {q} ou chez {p} : tu choisis à l’étape suivante. Son adresse ne t’est jamais montrée.' : 'Relais de {q}, choisi par {p}. Son adresse ne t’est jamais montrée.', { q: t((choisi.relais ?? '').replace(/^Relais /, '')), p: choisi.prenom })}</p>}
      </div>
    ) : (
    <a href="#" className="cl07-info" onClick={(e) => (e.preventDefault(), setPartage(true))}>
      <Icone nom="share-2" taille={20} />
      <span className="grow">{t('Partager à un proche : il voit ce panier et peut le payer, ici ou depuis l’étranger.')}</span>
      <Icone nom="chevron-right" taille={18} />
    </a>
    )}
    </>
  )
  const choixMode = !diaspora && (
    <div className="card pan-mode" role="radiogroup" aria-label={t('Livraison')}>
      {/* Un colis XL ne va jamais au relais (R10) : l'option n'apparaît pas. */}
      {!xl && (
        <button type="button" role="radio" aria-checked={mode === 'relais'} className={mode === 'relais' ? 'on' : ''} onClick={() => choisirMode('relais')}>
          <Icone nom="store" taille={18} />
          <span>
            <b>{t('Au relais')}</b>
            <small>{tf('{r} · offerte dès {s} F d’achat', { r: t(d.relais), s: F(seuilOffert('relais')) })}</small>
          </span>
        </button>
      )}
      <button type="button" role="radio" aria-checked={mode === 'domicile'} className={mode === 'domicile' ? 'on' : ''} onClick={() => choisirMode('domicile')}>
        <Icone nom="truck" taille={18} />
        <span>
          <b>{t('À domicile')}</b>
          <small>{d.adresse ? tf('{a} · offerte jusqu’à {c} F dès {s} F d’achat', { a: t(d.adresse), c: F(couvertureMax('domicile')), s: F(seuilOffert('domicile')) }) : t('ton adresse, à l’étape suivante')}</small>
        </span>
      </button>
    </div>
  )
  const annonce = (
    <>
    {message && (
      <div className="note green">
        <Icone nom="circle-check" taille={18} />
        <div>{message}</div>
      </div>
    )}
    </>
  )
  const colis = (
    <>
    {boutiques.map((b, i) => {
      const info = d.boutiques[b] ?? { zone: 'Mvog-Ada', delai: '24 h', palier: 'Argent', suggestions: [] }
      const lignes = d.lignes.filter((l) => l.boutique === b)
      const autreZone = info.zone !== 'Mvog-Ada'
      return (
        <section key={b} className="card cl07-sc" style={{ '--c': COULEURS[i % COULEURS.length] } as CSSProperties}>
          <div className="sh">
            <i className="bl"></i>
            <div className="grow">
              <div className="nm">
                {t(b)}
                <Icone nom="check" taille={17} trait={2.6} />
              </div>
              <div className="zn">{t(autreZone ? `${info.zone} · zone différente · prêt sous ${info.delai}` : `${info.zone} · prêt sous ${info.delai}`)}</div>
              <div className="tr">{t(info.palier)}</div>
            </div>
            <span className="cl07-tag">{tf('Colis {n}', { n: i + 1 })}</span>
          </div>
          {lignes.map((l) => (
            <Ligne key={l.id} l={l} agir={agir} retirer={retirer} compatibles={d.compatibles?.[l.p] ?? []} />
          ))}
          {info.suggestions.length > 0 && (
            <div className="blk">
              <div className="cl07-lab">{t('Ajouter de cette boutique — sans ramassage en plus')}</div>
              <div className="cl07-mc">
                {info.suggestions.map((s) => (
                  <div key={s.p}>
                    <Link to={chemin('fiche', { p: s.p })} className="ph" aria-label={t(s.titre)}>
                      <Dessin id={s.dessin} />
                    </Link>
                    <span className="t">{t(s.titre)}</span>
                    <span className="p">{F(s.prix)} F</span>
                    <a href="#" className="btn soft" onClick={(e) => (e.preventDefault(), agir(source.ajouterAuPanier(b, s.p), tf('« {p} » ajouté au panier.', { p: t(s.titre) })))}>
                      <span>{t('+ Ajouter')}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* R84 : un colis sous le minimum par boutique, nommé par son produit (jamais par le vendeur). */}
          {minimum?.boutique === i && (
            <div className="blk pan-seuil" data-seuil={b}>
              <div className="t13 b7">{t(minimum.texte)}</div>
            </div>
          )}
          <div className="blk cl07-subt">
            <span className="k">
              {t('Sous-total boutique')}
              <small>
                {t(NOM_FORMAT[formatColis(lignes.map((l) => l.classe))])}
                {' · '}
                {tf('prêt sous {d}', { d: t(info.delai) })}
              </small>
            </span>
            <b>{F(lignes.reduce((s, l) => s + l.prix * l.qte, 0))} F</b>
          </div>
        </section>
      )
    })}
    </>
  )
  const parColis = (
    <>
    <div className="cl07-par">
      <Icone nom="package" taille={18} />
      <span>{diaspora ? tf('Les articles arrivent en {n} colis, que {p} retire avec un code par colis.', { n: boutiques.length, p: lieu.p }) : tf('Tes articles arrivent en {n} colis, chacun avec son code de retrait.', { n: boutiques.length })}</span>
    </div>
    </>
  )
  // R07 : seuil sur le panier entier ; « Livraison offerte » quand tout est couvert ; sinon « offerte jusqu'à » et le
  // reste ; jamais « gratuite ».
  const of = achat.offerte
  const livraisonOfferte = fr && (
    <>
    <div className="card or cl07-fd" data-offerte>
      <div className="ti">
        <Icone nom="lightbulb" taille={20} />
        <span>
          {of.toute
            ? t('Livraison offerte.')
            : fr.couverture > 0
              ? tf('Livraison offerte jusqu’à {c} F : il te reste {r} F à payer.', { c: F(of.jusqua), r: F(fr.client) })
              : tf('Encore {m} F d’articles et la livraison est offerte jusqu’à {c} F.', { m: F(of.manque), c: F(of.jusqua) })}
        </span>
      </div>
      <div className="bar" role="progressbar" aria-valuenow={Math.min(100, Math.floor((sousTotal / of.seuil) * 100))} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: Math.min(100, Math.floor((sousTotal / of.seuil) * 100)) + '%' }}></i>
      </div>
      <div className="lg">
        <span>{tf('{m} F d’articles', { m: F(sousTotal) })}</span>
        <b>{fr.couverture > 0 ? tf('seuil {s} F atteint', { s: F(of.seuil) }) : tf('seuil {s} F', { s: F(of.seuil) })}</b>
      </div>
    </div>
    </>
  )
  // Récapitulatif : l'essentiel, puis le détail replié (R12 : frais, total et heure estimée avant le paiement).
  const lignesDetail = fr
    ? ([
        [mode === 'relais' ? 'Livraison au relais' : fr.xl ? 'Livraison XL à domicile' : tf('Livraison à domicile, niveau {n}', { n: t(fr.niveau === 'centre' ? 'centre' : fr.niveau === 'peripherie' ? 'périphérie' : 'périurbain') }), fr.base],
        ['Kilomètres au-delà de 5 km', fr.km],
        ['Cartons', fr.sup_formats],
        ['Colis en plus', fr.colis_en_plus],
        [tf('Boutiques en plus ({n})', { n: fr.n_boutiques - 1 }), fr.boutiques],
      ] as [string, number][]).filter(([, v], i) => i === 0 || v > 0)
    : []
  const recap = (
    <>
    <div className="card cl07-rc">
      <div className="kk">{t('Récapitulatif')}</div>
      <div className="cl07-r">
        <span className="lb">{tf('Sous-total articles ({n})', { n: nbArticles })}</span>
        <span className="v">{F(sousTotal)} F</span>
      </div>
      <div className="cl07-r">
        <span className="lb">
          {t(mode === 'relais' ? 'Livraison au relais' : 'Livraison à domicile')}
          <small>{diaspora ? tf('au relais de {p}', { p: lieu.pq }) : mode === 'relais' ? t(d.relais) : t(d.adresse ?? 'ton adresse, à l’étape suivante')}</small>
        </span>
        <span className="v">
          {fr && fr.couverture > 0 ? (
            <>
              <s>{F(fr.brut)} F</s> {fr.client ? F(fr.client) + ' F' : <span className="fr">{t('offerte')}</span>}
            </>
          ) : (
            F(livraison) + ' F'
          )}
        </span>
      </div>
      {!diaspora && pm && (
        <div className="cl07-r">
          <span className="lb">{t('Frais de paiement')}</span>
          <span className="v">{F(pm.campay)} F</span>
        </div>
      )}
      <div className="cl07-tot">
        <span className="l">{t('Total à payer')}</span>
        <span className="price">
          {F(diaspora ? sousTotal + livraison : total)}
          <small>{t(' F')}</small>
        </span>
      </div>
      {!diaspora && walletOuvert() && (
        <Module ff="FF-WALLET">
          <div className="t12 c3" style={{ textAlign: 'right' }}>{tf('Avec le Wallet : {m} F, sans frais', { m: F(sousTotal + livraison) })}</div>
        </Module>
      )}
      {fr && fr.couverture > 0 && <div className="cl07-eco">{tf('tu économises {m} F de livraison', { m: F(fr.couverture) })}</div>}
      <details className="more mt8" data-detail>
        <summary>
          <Icone nom="receipt" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Détail')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          {lignesDetail.map(([k, v]) => (
            <div key={k} className="kv">
              <span className="k">{t(k)}</span>
              <span className="v">{F(v)}&nbsp;F</span>
            </div>
          ))}
          {fr && fr.couverture > 0 && (
            <div className="kv">
              <span className="k">{tf('Livraison offerte (articles dès {s} F)', { s: F(of.seuil) })}</span>
              <span className="v" style={{ color: 'var(--green)' }}>−{F(fr.couverture)}&nbsp;F</span>
            </div>
          )}
          {!diaspora && pm && (
            <div className="kv">
              <span className="k">{t('Frais de paiement, compris dans le total')}</span>
              <span className="v">{F(pm.campay)}&nbsp;F</span>
            </div>
          )}
          {achat.promesse && (
            <div className="kv" data-promesse>
              <span className="k">{t('Heure estimée')}</span>
              <span className="v">{t(achat.promesse)}</span>
            </div>
          )}
        </div>
      </details>
      <div className="cl07-pmx">
        <div className="cl07-lab">{t('Moyens acceptés')}</div>
        <div className="cl07-pm">
          {!diaspora && <span className="mtn">{t('MTN')}</span>}
          {!diaspora && <span className="org">{t('Orange')}</span>}
          {diaspora ? (
            <>
              <span className="vis">{t('VISA')}</span>
              <span className="mc">{t('Mastercard')}</span>
            </>
          ) : (
            <Module ff="FF-CARTE">
              <span className="vis">{t('VISA')}</span>
              <span className="mc">{t('Mastercard')}</span>
            </Module>
          )}
        </div>
        <div className="hn">{t(diaspora ? 'Compte diaspora : carte, Apple Pay ou Google Pay. 2 % de frais de service, affichés avant de payer.' : 'MTN Mobile Money ou Orange Money. Jamais d’espèces.')}</div>
        <MentionDemo texte="Démonstration : les articles et la commande sont des exemples. Rien n’est vendu ni débité." />
      </div>
    </div>
    </>
  )
  const pourQuiBas = (
    <>
    {/* Pour qui ? Qui paie la livraison ? (DP-54 ; règle donnees/echanges.ts) : le panier payé pour un proche. */}
    {/* Compte diaspora : son propre « Pour qui ? » ci-dessus (il paie toujours tout). */}
    {!diaspora && <PourQuiPanier articles={sousTotal} frais={livraison} relaisMoi={d.relais} />}
    </>
  )
  const favoris = (
    <>
    <Favoris d={d} agir={agir} />
    </>
  )
  const escrow = (
    <>
    <div className="note green">
      <Icone nom="shield-check" taille={18} />
      <div>
        <b>{t('Escrow BelivaY')}</b>
        <br />
        {diaspora ? tf('Le vendeur est payé quand {p} a son colis. Retrait au relais de {pq}, avec son propre code.', { p: lieu.p, pq: lieu.pq }) : tf('Le vendeur est payé quand tu es livré. Retrait au {r}.', { r: t(d.relais) })}
      </div>
    </div>
    </>
  )
  const liens = (
    <>
    <div className="links">
      <Link to={chemin('legal-doc', { d: 'cgv' })}>{t('Conditions de vente et de paiement')}</Link>
    </div>
    </>
  )

  const surClic = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest('[data-retirer]')
    if (!a) return
    e.preventDefault()
    const l = d.lignes.find((x) => x.id === a.getAttribute('data-retirer'))
    if (l) retirer(l)
  }

  // Téléphone et tablette portrait : une colonne, récapitulatif en bas, barre « Passer commande » fixée.
  if (!tabL)
    return (
      <Ecran route="panier" fixes={<>{barre}{toast}</>} action={<ActionPartagerPanier />} largeur="moyen">
        <div onClick={surClic}>
          {pourQuiHaut}
          {annonce}
          {choixMode}
          {colis}
          <PlusTard d={d} agir={agir} />
          {parColis}
          {livraisonOfferte}
          {recap}
          {pourQuiBas}
          {favoris}
          {escrow}
          {liens}
          <div style={{ height: 170 }} />
        </div>
        <PartageProche ouverte={partage} fermer={() => setPartage(false)} />
      </Ecran>
    )

  // Dès 1024 px : colis à gauche ; à droite, collant, « Pour qui ? », récapitulatif et « Passer commande ».
  // Les favoris, hors de la grille, sous les deux colonnes (l'aside collant s'arrête avant eux).
  return (
    <Ecran route="panier" fixes={toast} action={<ActionPartagerPanier />} largeur="moyen">
      <div onClick={surClic}>
        <Gabarit forme="colonnes" classe="pa-l">
          <Colonne>
            {!diaspora && pourQuiHaut}
            {annonce}
            {choixMode}
            {colis}
            <PlusTard d={d} agir={agir} />
            {parColis}
            {livraisonOfferte}
          </Colonne>
          <Aside titre="Récapitulatif" classe="pa-recap">
            {diaspora && pourQuiHaut}
            {recap}
            {pourQuiBas}
            <div className="cl07-act">{actions}</div>
            {escrow}
            {liens}
          </Aside>
        </Gabarit>
        <div className="pa-l-bas">{favoris}</div>
      </div>
      <PartageProche ouverte={partage} fermer={() => setPartage(false)} />
    </Ecran>
  )
}

function Favoris({ d, agir }: { d: DonneesPanier; agir: (p: Promise<unknown>, texte?: string) => Promise<void> }) {
  const { t, tf } = usePreferences()
  if (!d.favoris.length) return null
  return (
    <>
      <div className="cl07-svh">
        <h2>{t('Favoris')}</h2>
        <Link to={chemin('sauvegardes')}>{t('Tout voir')}</Link>
      </div>
      <div className="cl07-svc">
        {d.favoris.map((f) => (
          <div key={f.id} className="cl07-sv">
            <Link to={chemin('fiche', { p: f.p })} aria-label={t(f.titre)}>
              <span className="thumb" style={{ width: '52px', height: '52px', borderRadius: '13px' }}>
                <Dessin id={f.dessin} image={f.image} alt={f.titre} tailles="52px" />
              </span>
            </Link>
            <div className="grow">
              <Link to={chemin('fiche', { p: f.p })} className="cn">
                {t(f.titre + (f.variante ? ' · ' + f.variante : ''))}
              </Link>
              <div className="pz">
                <b>{F(f.prix)} F</b>
                {f.prixAvant && f.prixAvant > f.prix && (
                  <>
                    {' '}
                    <s>{F(f.prixAvant)} F</s>
                  </>
                )}
              </div>
              {f.alertes.prix && <AlerteBaissePrix avant={f.prixAvant} apres={f.prix} />}
            </div>
            <button
              type="button"
              className="btn secondary sm"
              disabled={f.stock === 'rupture'}
              aria-label={tf('Remettre au panier : {p}', { p: t(f.titre) })}
              onClick={() => agir(source.favoriAuPanier(f.id), tf('« {p} » ajouté au panier.', { p: t(f.titre) }))}
            >
              <span>{t(f.stock === 'rupture' ? 'Épuisé' : 'Remettre')}</span>
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
