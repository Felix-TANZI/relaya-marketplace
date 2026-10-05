// Écran « Mon panier » (CL-07), présentation d'origine (photo du porteur) et logique réelle (DP-54) :
// - une section par boutique (un colis) : article, paramètres (couleur, capacité, taille ; indisponible barré)
//   à changer sur place, stock, quantité, retirer (annulable), mettre en favori (boutons, ou ligne glissée à gauche
//   ou à droite : composants/Glisser.tsx) ; « Autres vendeurs » du même
//   produit (le plus proche, le mieux noté, le moins cher) à choisir ; ajouts de la même boutique ;
// - vendeur d'une autre zone : « Voir ce vendeur » quand un vendeur de la zone du relais coûte moins ;
// - frais calculés comme le moteur (src/donnees/frais.ts), livraison offerte et récapitulatif ;
// - le relais ou le domicile se choisit en passant commande, pas ici ; « Payer au comptoir du relais » quand le
//   panier y a droit ; « Passer commande » : connexion, numéro vérifié, puis l'achat ;
// - « Pour qui ? » : le panier payé pour un proche, au relais du proche ; qui paie la livraison (CL-14/Echanges).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Aside, Colonne, Gabarit } from '../../composants/Gabarits'
import { Dessin } from '../../composants/Dessin'
import { Glisser } from '../../composants/Glisser'
import { useLieu } from '../../composants/PourQui'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { calculer, type SousCommandeFrais } from '../../donnees/frais'
import { source, type DonneesPanier, type LienFamille, type LignePanier } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useCompteDiaspora, useMajSession, useSession } from '../../session'
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
type Etiquette = 'Le plus proche' | 'Mieux noté' | 'Moins cher'

// Autres vendeurs, avec leur étiquette (photo du porteur).
function etiquettes(offres: NonNullable<LignePanier['offres']>): Map<string, Etiquette> {
  const m = new Map<string, Etiquette>()
  if (!offres.length) return m
  const par = <K extends 'km' | 'score' | 'prix'>(k: K, sens: 1 | -1) => [...offres].sort((a, b) => sens * (a[k] - b[k]))[0].boutique
  m.set(par('km', 1), 'Le plus proche')
  if (!m.has(par('score', -1))) m.set(par('score', -1), 'Mieux noté')
  if (!m.has(par('prix', 1))) m.set(par('prix', 1), 'Moins cher')
  return m
}

function Ligne({ l, agir, d, retirer }: { l: LignePanier; d: DonneesPanier; agir: (p: Promise<unknown>, texte?: string) => Promise<void>; retirer: (l: LignePanier) => void }) {
  const { t, tf } = usePreferences()
  const enFavori = () => agir(source.mettreEnFavori(l.id), tf('« {p} » mis en favori : il sort du total.', { p: t(l.titre) }))
  const [ouvert, setOuvert] = useState(false)
  const [vendeurs, setVendeurs] = useState(false)
  const offres = l.offres ?? []
  const tags = etiquettes(offres)
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
            <span className="t12 c3">{tf('{n} disponibles', { n: l.stock })}</span>
            <i className="jauge" aria-hidden="true">
              <b style={{ width: Math.min(100, l.stock * 4) + '%' }} />
            </i>
          </div>
          {(l.options?.length || offres.length > 0) && (
            <div className="pan-act">
              {l.options && l.options.length > 0 && (
                <a href="#" aria-expanded={ouvert} onClick={(e) => (e.preventDefault(), setOuvert(!ouvert))}>
                  <Icone nom="sliders-horizontal" taille={14} /> {t(ouvert ? 'Fermer' : 'Modifier')}
                </a>
              )}
              {offres.length > 0 && (
                <a href="#" aria-expanded={vendeurs} onClick={(e) => (e.preventDefault(), setVendeurs(!vendeurs))}>
                  <Icone nom="store" taille={14} /> {tf('Autres vendeurs ({n})', { n: offres.length })}
                </a>
              )}
            </div>
          )}
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
      {vendeurs && (
        <div className="defile pan-vd">
          {offres.map((o) => (
            <div key={o.boutique} className="mini card">
              {tags.get(o.boutique) && <span className="pill green sm">{t(tags.get(o.boutique)!)}</span>}
              <b className="t15" style={{ color: 'var(--or-txt)' }}>
                {F(o.prix)} F
              </b>
              <span className="t12 c3">
                <Icone nom="map-pin" taille={12} /> {t(o.zone)}
              </span>
              <span className="t12 b7">{tf('{k} km', { k: String(o.km).replace('.', ',') })}</span>
              <span className="t12 c3">{tf('Score {s} · {v} ventes', { s: o.score, v: o.ventes })}</span>
              <button type="button" className="btn secondary sm" onClick={() => agir(source.choisirVendeur(l.id, o.boutique), tf('Vendeur changé : {b} ({z}).', { b: t(o.boutique), z: t(o.zone) }))}>
                <span>{t('Choisir')}</span>
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Vendeur d'une autre zone : un vendeur de la zone du relais coûte moins (recalcul complet). */}
      {(() => {
        const zoneRelais = 'Mvog-Ada'
        if (d.boutiques[l.boutique]?.zone === zoneRelais) return null
        const proche = offres.find((o) => o.zone === zoneRelais)
        if (!proche) return null
        return (
          <div className="cl07-adv">
            {t('Ce vendeur est dans une autre zone : son ramassage est au plein tarif. ')}
            <b>{tf('Un vendeur similaire existe à {z}.', { z: zoneRelais })}</b>
            <br />
            <button type="button" className="btn soft" onClick={() => (setVendeurs(true), setOuvert(false))}>
              <Icone nom="repeat" taille={18} />
              <span>{t('Voir ce vendeur')}</span>
            </button>
          </div>
        )
      })()}
    </div>
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

  const boutiques = [...new Set(d.lignes.map((l) => l.boutique))]
  const sc: SousCommandeFrais[] = boutiques.map((b) => ({
    boutique: b,
    zone: d.boutiques[b]?.zone ?? 'Mvog-Ada',
    articles: d.lignes.filter((l) => l.boutique === b).map((l) => ({ prix: l.prix, quantite: l.qte, classe: l.classe })),
  }))
  // Le relais ou le domicile se choisit en passant commande ; le panier compte au relais habituel.
  const f = calculer('relais', sc)
  const nbArticles = d.lignes.reduce((n, l) => n + l.qte, 0)
  const comptoirPossible = f.sousTotal <= d.plafondComptoir
  const zones = new Map<string, string[]>()
  sc.forEach((s) => zones.set(s.zone, [...(zones.get(s.zone) ?? []), s.boutique]))

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
  const commander = (comptoir: boolean) => {
    if (!session.connecte) return naviguer(chemin('connexion', { next: '/panier' }))
    if (!d.numeroVerifie) return naviguer(chemin('numero', { from: 'panier' }))
    naviguer(chemin('paiement-moyen', comptoir ? { comptoir: '1' } : undefined))
  }

  const choisi = proches.find((l) => l.id === session.proche?.id) ?? (proches.length === 1 ? proches[0] : null)
  const actionsDiaspora = (
    <>
      {choisi ? (
        <Link to={chemin('commander-pour', { lien: choisi.id })} className="btn primary">
          <Icone nom="send" taille={18} />
          <span>{tf('Commander pour {p} · {m} F', { p: choisi.prenom, m: F(f.total) })}</span>
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
  const actions = diaspora ? actionsDiaspora : (
    <>
      <button type="button" className="btn primary" onClick={() => commander(false)}>
        <Icone nom="truck" taille={18} />
        <span>{tf('Passer commande · {m} F', { m: F(f.total) })}</span>
      </button>
      {comptoirPossible ? (
        <button type="button" className="btn secondary mt8" onClick={() => commander(true)}>
          <Icone nom="store" taille={18} />
          <span>{t('Payer au comptoir du relais')}</span>
        </button>
      ) : (
        <div className="cl07-why">{tf('Paiement au comptoir non proposé : panier au-delà de {m} F.', { m: F(d.plafondComptoir) })}</div>
      )}
      <div className="pr">{t('Ton argent reste bloqué jusqu’à ton retrait. Relais ou domicile : tu choisis à l’étape suivante.')}</div>
    </>
  )
  const barre = <div className="cl07-bar">{actions}</div>
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
    <Link to={chemin('diaspora')} className="cl07-info">
      <Icone nom="share-2" taille={20} />
      <span className="grow">{t('Quelqu’un paie pour toi ? Envoie-lui ce panier, il le règle depuis l’étranger.')}</span>
      <Icone nom="chevron-right" taille={18} />
    </Link>
    )}
    </>
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
      const info = d.boutiques[b]
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
            <Ligne key={l.id} l={l} d={d} agir={agir} retirer={retirer} />
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
          <div className="blk cl07-subt">
            <span className="k">
              {t('Sous-total boutique')}
              <small>{t('livraison calculée ci-dessous')}</small>
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
      <span>{diaspora ? tf('Les articles arrivent en {n} colis, que {p} retire ensemble avec un seul code.', { n: sc.length, p: lieu.p }) : tf('Tes articles arrivent en {n} colis, retirables ensemble avec un seul code.', { n: sc.length })}</span>
    </div>
    </>
  )
  const livraisonOfferte = (
    <>
    <div className="card or cl07-fd">
      <div className="ti">
        <Icone nom="lightbulb" taille={20} />
        <span>{f.offert ? tf('Livraison de base offerte — tu dépasses {s} F.', { s: F(f.seuil) }) : tf('Ajoute {m} F et débloque la livraison offerte.', { m: F(f.manque) })}</span>
      </div>
      {f.offert > 0 && f.total - f.sousTotal > 0 && <p>{tf('Il te reste {m} F de ramassages et de remises.', { m: F(f.total - f.sousTotal) })}</p>}
      <div className="bar" role="progressbar" aria-valuenow={f.progression} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: f.progression + '%' }}></i>
      </div>
      <div className="lg">
        <span>{tf('{m} F d’articles', { m: F(f.sousTotal) })}</span>
        <b>{f.offert ? tf('seuil {s} F atteint', { s: F(f.seuil) }) : tf('seuil {s} F', { s: F(f.seuil) })}</b>
      </div>
    </div>
    </>
  )
  const recap = (
    <>
    <div className="card cl07-rc">
      <div className="kk">{t('Récapitulatif')}</div>
      <div className="cl07-r">
        <span className="lb">{tf('Sous-total articles ({n})', { n: nbArticles })}</span>
        <span className="v">{F(f.sousTotal)} F</span>
      </div>
      {f.ramassages.map((r, i) => (
        <div key={r.boutique} className="cl07-r">
          <i className="cl07-dot" style={{ '--c': COULEURS[i % COULEURS.length] } as CSSProperties}></i>
          <span className="lb">
            {tf('Ramassage {b}', { b: t(r.boutique) })}
            {r.partage && <small className="g">{t('même zone · trajet partagé −24 %')}</small>}
            {!r.partage && i > 0 && <small className="a">{t('zone différente · plein tarif')}</small>}
          </span>
          <span className="v">
            {i === 0 && f.offert ? (
              <>
                <s>{F(r.montant)} F</s> <span className="fr">{t('offert')}</span>
              </>
            ) : (
              F(r.montant) + ' F'
            )}
          </span>
        </div>
      ))}
      {f.remises.map((r, i) => (
        <div key={'m' + r.boutique} className="cl07-r">
          <span className="lb">
            {diaspora ? tf('Remise au relais de {p} · colis {n}', { p: lieu.pq, n: i + 1 }) : tf('Remise au {r} · colis {n}', { r: t(d.relais), n: i + 1 })}
            {i === 0 && <small>{t('livraison de base offerte dès 30 000 F')}</small>}
          </span>
          <span className="v">
            {i === 0 && f.offert ? (
              <>
                <s>{F(r.montant)} F</s> <span className="fr">{t('offert')}</span>
              </>
            ) : (
              F(r.montant) + ' F'
            )}
          </span>
        </div>
      ))}
      <div className="cl07-tot">
        <span className="l">{t('Total à payer')}</span>
        <span className="price">
          {F(f.total)}
          <small>{t(' F')}</small>
        </span>
      </div>
      {f.offert > 0 && <div className="cl07-eco">{tf('tu économises {m} F de livraison', { m: F(f.offert) })}</div>}
      <div className="cl07-pmx">
        <div className="cl07-lab">{t('Moyens acceptés')}</div>
        <div className="cl07-pm">
          {!diaspora && <span className="mtn">{t('MTN')}</span>}
          {!diaspora && <span className="org">{t('Orange')}</span>}
          <span className="vis">{t('VISA')}</span>
          <span className="mc">{t('Mastercard')}</span>
        </div>
        <div className="hn">{t(diaspora ? 'Compte diaspora : carte, Apple Pay ou Google Pay. 2 % de frais de service, affichés avant de payer.' : 'Carte : 2 % de frais de service, affichés avant de payer.')}</div>
      </div>
    </div>
    </>
  )
  const pourQuiBas = (
    <>
    {/* Pour qui ? Qui paie la livraison ? (DP-54 ; règle donnees/echanges.ts) : le panier payé pour un proche. */}
    {/* Compte diaspora : son propre « Pour qui ? » ci-dessus (il paie toujours tout). */}
    {!diaspora && <PourQuiPanier articles={f.sousTotal} frais={f.total - f.sousTotal} relaisMoi={d.relais} />}
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
          {colis}
          {parColis}
          {livraisonOfferte}
          {recap}
          {pourQuiBas}
          {favoris}
          {escrow}
          {liens}
          <div style={{ height: 120 }} />
        </div>
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
            {colis}
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
                    {' · '}
                    <span>{tf('prix baissé de {m} F', { m: F(f.prixAvant - f.prix) })}</span>
                  </>
                )}
              </div>
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
