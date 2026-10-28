// Écran « Comparer » (VAGUE-AMELIORATIONS.md n° 5 ; règles : donnees/comparateur.ts) : deux ou trois produits d'une même
// catégorie côte à côte ; la meilleure valeur mise en avant (et pourquoi) ; « Seulement les différences » ; la
// meilleure valeur de chaque ligne chiffrée marquée ; retirer un produit, l'ajouter au panier.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fraisRetrait, useCatalogue } from '../../composants/Catalogue'
import { useComparaison } from '../../composants/Comparer'
import { Ecran } from '../../composants/coque'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { ECART_NOTE, categorieComparee, ecrireComparaison, lignesComparees, meilleureValeur } from '../../donnees/comparateur'
import { PARAMETRES } from '../../donnees/frais'
import { source, type Produit } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { useMajSession } from '../../session'

// Prix livré au relais (prix + retrait, formule du panier) ; un colis trop volumineux part à domicile (dès 1 500 F).
const prixLivre = (p: Produit) => p.prix + (fraisRetrait(p) ?? PARAMETRES.domicileMin)

export function Comparer() {
  const { t, tf } = usePreferences()
  const majSession = useMajSession()
  const [c] = useCatalogue()
  const ids = useComparaison()
  const [diff, setDiff] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  if (!c) return null
  const produits = ids.map((id) => c.tous.find((x) => x.p === id)).filter((x): x is Produit => !!x)
  const meilleur = meilleureValeur(produits, prixLivre)
  const lignes = lignesComparees(produits, prixLivre, F).filter((l) => !diff || !l.egales)
  const ajouter = async (p: Produit) => {
    await source.ajouterProduit(p.p, {}, 1)
    setMessage(tf('« {p} » ajouté au panier.', { p: t(p.titre) }))
    majSession(await source.session())
  }
  const colonnes = { gridTemplateColumns: `repeat(${Math.max(produits.length, 1)}, minmax(0, 1fr))` }
  if (produits.length < 2)
    return (
      <Ecran route="comparer" largeur="moyen">
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="scale" taille={26} />
            </div>
            <h3>{t('Choisis au moins deux produits')}</h3>
            <p>{t('Dans une liste ou des résultats, touche « Comparer » sur deux ou trois produits d’une même catégorie.')}</p>
            <div className="btns">
              <Link to={chemin('categories')} className="btn primary">
                <span>{t('Parcourir les catégories')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  return (
    <Ecran route="comparer" largeur="moyen">
      <p className="cmp-cat">{tf('{n} produits · {c}', { n: produits.length, c: t(categorieComparee(produits[0])) })}</p>
      {message && (
        <div className="note green">
          <Icone nom="circle-check" taille={18} />
          <div>{message}</div>
        </div>
      )}
      <div className="cmp-tete" style={colonnes}>
        {produits.map((p) => (
          <div key={p.p} className={'cmp-col' + (p.p === meilleur ? ' best' : '')} data-meilleure={p.p === meilleur ? '1' : undefined}>
            {p.p === meilleur ? <span className="cmp-badge">{t('Meilleure valeur')}</span> : <span className="cmp-badge vide" aria-hidden="true" />}
            <Link to={chemin('fiche', { p: p.p })} className="cmp-img" aria-label={t(p.titre)}>
              <Dessin id={p.dessins[0] ?? ''} image={p.images?.[0]} alt={p.titre} tailles="160px" />
            </Link>
            <Link to={chemin('fiche', { p: p.p })} className="cmp-t">
              {t(p.titre)}
            </Link>
            <span className="cmp-p">{F(p.prix)}&nbsp;F</span>
            <button type="button" className="btn soft sm" disabled={p.stock <= 0} onClick={() => ajouter(p)} aria-label={tf('Ajouter au panier : {p}', { p: t(p.titre) })}>
              <span>{t(p.stock > 0 ? 'Au panier' : 'Épuisé')}</span>
            </button>
            <button type="button" className="cmp-x" aria-label={tf('Retirer de la comparaison : {p}', { p: t(p.titre) })} onClick={() => ecrireComparaison(ids.filter((x) => x !== p.p))}>
              {t('Retirer')}
            </button>
          </div>
        ))}
      </div>
      {meilleur && (
        <p className="cmp-pourquoi">
          <Icone nom="sparkles" taille={15} /> {tf('Meilleure valeur : le moins cher livré au relais parmi les mieux notés (à {e} étoile près), en stock.', { e: String(ECART_NOTE).replace('.', ',') })}
        </p>
      )}
      <button type="button" className={'cmp-diff' + (diff ? ' on' : '')} role="switch" aria-checked={diff} onClick={() => setDiff(!diff)}>
        <i aria-hidden="true" />
        {t('Seulement les différences')}
      </button>
      <div className="cmp-tab">
        {lignes.map((l) => (
          <div key={l.cle} className="cmp-l" data-ligne={l.libelle}>
            <div className="cmp-k">{t(l.libelle)}</div>
            <div className="cmp-vs" style={colonnes}>
              {l.valeurs.map((v, i) => (
                <span key={i} className={l.meilleurs.includes(i) ? 'b' : undefined}>
                  {t(v)}
                </span>
              ))}
            </div>
          </div>
        ))}
        {!lignes.length && <p className="t13 c3">{t('Aucune différence : ces produits se valent sur tout ce qui est comparé.')}</p>}
      </div>
    </Ecran>
  )
}
