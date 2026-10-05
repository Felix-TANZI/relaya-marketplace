// Écran « Retirer un article » (CL-07) : généré par outils/ecran.mjs depuis le prototype du 1er octobre, un rendu par
// état (2 adresses). En-tête, barre du bas et marges suivent l'état (Ecran parEtat).
// Les données sont encore écrites dans le rendu (démonstration) ; elles passeront par la source, sous la
// garde des tests au pixel (tests/identique.spec.ts).
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Aside, Colonne, Gabarit } from '../../composants/Gabarits'
import { chemin } from '../../config/pages'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { useEtat } from '../../config/etats'
import { source } from '../../donnees/source'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { ActionPartagerPanier } from './Panier'

// Gestes réels de l'écran (DP-54) : chaque bouton agit sur le vrai panier (source), puis ouvre le panier à jour.
function useGestes() {
  const naviguer = useNavigate()
  const session = useSession()
  const ligne = async (p: string) => (await source.panier()).lignes.find((l) => l.p === p)
  const geste = (f: () => Promise<unknown>) => (e: MouseEvent) => {
    e.preventDefault()
    f().then(() => naviguer(chemin('panier')))
  }
  return {
    retirer: (p: string) => geste(async () => { const l = await ligne(p); if (l) await source.retirerLigne(l.id) }),
    sauver: (p: string) => geste(async () => { const l = await ligne(p); if (l) await source.mettreEnFavori(l.id) }),
    remettre: (p: string) => geste(async () => { const f = (await source.panier()).favoris.find((x) => x.p === p); if (f) await source.favoriAuPanier(f.id) }),
    ajouter: (p: string) => geste(() => source.ajouterProduit(p, {}, 1)),
    // « Plus » : une unité de plus dans le vrai panier.
    plus: (p: string) => geste(async () => { const l = await ligne(p); if (l) await source.changerQuantite(l.id, l.qte + 1) }),
    // « Changer d'offre » : le même produit chez le vendeur de la zone du relais (ramassage au tarif réduit).
    changerOffre: (p: string) => geste(async () => {
      const l = await ligne(p)
      const o = l?.offres?.find((x) => x.zone === 'Mvog-Ada')
      if (l && o) await source.choisirVendeur(l.id, o.boutique)
    }),
    // « Garder l'article » : la feuille se ferme, rien ne change.
    garder: geste(async () => {}),
    // « Passer commande » : comme le panier (connexion, numéro vérifié, puis moyen de paiement).
    commander: (e: MouseEvent) => {
      e.preventDefault()
      if (!session.connecte) return naviguer(chemin('connexion', { next: '/panier' }))
      source.panier().then((d) => naviguer(d.numeroVerifie ? chemin('paiement-moyen') : chemin('numero', { from: 'panier' })))
    },
    // La corbeille de l'article déjà en question : la feuille est ouverte, on va à son bouton « Retirer quand même ».
    confirmer: (e: MouseEvent) => {
      e.preventDefault()
      document.querySelector<HTMLElement>('.sheet .btn.danger')?.focus()
    },
  }
}

// Le « Plus » dessiné en <span> (écran relevé au pixel) s'active aussi au clavier, comme un bouton.
const activer = (e: KeyboardEvent<HTMLElement>) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    e.currentTarget.click()
  }
}

export function PanierRetrait() {
  const { t } = usePreferences()
  const g = useGestes()
  const tabL = useDes('tab-l')
  // Blocs de l'écran, rangés en une colonne (téléphone, tablette portrait) ou en colonnes (dès 1024 px).
  const barre = (
    <>
              <Link to={chemin("paiement-moyen")} className="btn secondary" onClick={g.commander}>
                <Icone nom="truck" taille={18} />
                <span>
                  {t("Passer commande · 273\u00A0379\u00A0F")}
                </span>
              </Link>
              <div className="pr">
                {t("Ton argent reste bloqué jusqu’à ton retrait. Colis prêts sous 6\u00A0h, retrait dès aujourd’hui 17\u00A0h.")}
              </div>
              <div className="cl07-why">
                {t("Paiement au comptoir non proposé\u00A0: panier au-delà de 50\u00A0000\u00A0F.")}
              </div>
                </>
  )
  const contenu = (
    <>
        <Link to={chemin("diaspora")} className="cl07-info">
          <Icone nom="share-2" taille={20} />
          <span className="grow">
            {t("Quelqu’un paie pour toi\u00A0? Envoie-lui ce panier, il le règle depuis l’étranger.")}
          </span>
          <Icone nom="chevron-right" taille={18} />
        </Link>
        <section className="card cl07-sc" style={{ "--c": "var(--or)" } as CSSProperties}>
          <div className="sh">
            <i className="bl"></i>
            <div className="grow">
              <div className="nm">
                {t("Boutique A")}
                <Icone nom="check" taille={17} trait={2.6} />
              </div>
              <div className="zn">
                {t("Mvog-Ada · prêt sous 4\u00A0h")}
              </div>
              <div className="tr">
                {t("Vendeur certifié Or · Trust Score 91")}
              </div>
            </div>
            <span className="cl07-tag">
              {t("Colis 1")}
            </span>
          </div>
          <div className="blk">
            <div className="cl07-ln">
              <Link to="/fiche?p=camon30" className="im" aria-label={t("Tecno Camon 30")}>
                <span className="thumb" style={{ "width": "64px", "height": "64px", "borderRadius": "16px" }}>
                  <Dessin id="c8ed74acd931" />
                </span>
              </Link>
              <div className="grow">
                <div className="row" style={{ "alignItems": "flex-start", "gap": "4px" }}>
                  <div className="grow">
                    <Link to="/fiche?p=camon30" className="cn">
                      {t("Tecno Camon 30")}
                    </Link>
                    <div className="cv">
                      {t("Gris titane · 256 Go")}
                    </div>
                  </div>
                  <span className="ic2">
                    <Link to="/panier" onClick={g.sauver("camon30")} aria-label={t("Sauvegarder pour plus tard")}>
                      <Icone nom="bookmark" taille={19} />
                    </Link>
                    <a href="#" aria-label={t("Retirer l’article")} onClick={g.confirmer}>
                      <Icone nom="trash-2" taille={19} />
                    </a>
                  </span>
                </div>
                <div className="cl07-st">
                  <span className="cl07-stp">
                    <span className="b dis" aria-label={t("Moins")} aria-disabled="true">
                      <Icone nom="minus" taille={16} />
                    </span>
                    <b>
                      {t("1")}
                    </b>
                    <span className="b" aria-label={t("Plus")} role="button" tabIndex={0} onClick={g.plus("camon30")} onKeyDown={activer}>
                      <Icone nom="plus" taille={16} />
                    </span>
                  </span>
                  <span className="cl07-op">
                    {t("150\u00A0699\u00A0F")}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="blk">
            <div className="cl07-lab">
              {t("Ajouter de cette boutique — sans ramassage en plus")}
            </div>
            <div className="cl07-mc">
              <div>
                <Link to="/fiche?p=tablette8" className="ph" aria-label={t("Tablette 8″ · 64 Go")}>
                  <Dessin id="6d95c1664bef" />
                </Link>
                <span className="t">
                  {t("Tablette 8″ · 64 Go")}
                </span>
                <span className="p">
                  {t("64\u00A0000\u00A0F")}
                </span>
                <Link to="/panier" onClick={g.ajouter("tablette8")} className="btn soft" aria-label={t("Ajouter Tablette 8″ · 64 Go")}>
                  <span>
                    {t("+ Ajouter")}
                  </span>
                </Link>
              </div>
              <div>
                <Link to="/fiche?p=galaxya15" className="ph" aria-label={t("Samsung Galaxy A15 · 128 Go")}>
                  <Dessin id="20344e766a88" />
                </Link>
                <span className="t">
                  {t("Samsung Galaxy A15 · 128 Go")}
                </span>
                <span className="p">
                  {t("89\u00A0900\u00A0F")}
                </span>
                <Link to="/panier" onClick={g.ajouter("galaxya15")} className="btn soft" aria-label={t("Ajouter Samsung Galaxy A15 · 128 Go")}>
                  <span>
                    {t("+ Ajouter")}
                  </span>
                </Link>
              </div>
            </div>
          </div>
          <div className="blk cl07-subt">
            <span className="k">
              {t("Sous-total boutique")}
              <small>
                {t("livraison calculée ci-dessous")}
              </small>
            </span>
            <b>
              {t("150\u00A0699\u00A0F")}
            </b>
          </div>
        </section>
        <section className="card cl07-sc" style={{ "--c": "var(--or-m)" } as CSSProperties}>
          <div className="sh">
            <i className="bl"></i>
            <div className="grow">
              <div className="nm">
                {t("Boutique B")}
                <Icone nom="check" taille={17} trait={2.6} />
              </div>
              <div className="zn">
                {t("Mvog-Ada · prêt sous 4\u00A0h")}
              </div>
              <div className="tr">
                {t("Vendeur certifié Argent · Trust Score 78")}
              </div>
            </div>
            <span className="cl07-tag">
              {t("Colis 2")}
            </span>
          </div>
          <div className="blk">
            <div className="cl07-ln">
              <Link to="/fiche?p=ensemblewax" className="im" aria-label={t("Ensemble wax 3 pièces")}>
                <span className="thumb" style={{ "width": "64px", "height": "64px", "borderRadius": "16px" }}>
                  <Dessin id="0875c550060b" />
                </span>
              </Link>
              <div className="grow">
                <div className="row" style={{ "alignItems": "flex-start", "gap": "4px" }}>
                  <div className="grow">
                    <Link to="/fiche?p=ensemblewax" className="cn">
                      {t("Ensemble wax 3 pièces")}
                    </Link>
                    <div className="cv">
                      {t("Taille M")}
                    </div>
                  </div>
                  <span className="ic2">
                    <Link to="/panier" onClick={g.sauver("ensemblewax")} aria-label={t("Sauvegarder pour plus tard")}>
                      <Icone nom="bookmark" taille={19} />
                    </Link>
                    <Link to="/panier" onClick={g.retirer("ensemblewax")} aria-label={t("Retirer l’article")}>
                      <Icone nom="trash-2" taille={19} />
                    </Link>
                  </span>
                </div>
                <div className="cl07-st">
                  <span className="cl07-stp">
                    <span className="b dis" aria-label={t("Moins")} aria-disabled="true">
                      <Icone nom="minus" taille={16} />
                    </span>
                    <b>
                      {t("1")}
                    </b>
                    <span className="b" aria-label={t("Plus")} role="button" tabIndex={0} onClick={g.plus("ensemblewax")} onKeyDown={activer}>
                      <Icone nom="plus" taille={16} />
                    </span>
                  </span>
                  <span className="cl07-op">
                    {t("32\u00A0000\u00A0F")}
                  </span>
                </div>
              </div>
            </div>
            <div className="cl07-ln">
              <Link to="/fiche?p=saccuir" className="im" aria-label={t("Sac cuir artisanal")}>
                <span className="thumb" style={{ "width": "64px", "height": "64px", "borderRadius": "16px" }}>
                  <Dessin id="30942470397d" />
                </span>
              </Link>
              <div className="grow">
                <div className="row" style={{ "alignItems": "flex-start", "gap": "4px" }}>
                  <div className="grow">
                    <Link to="/fiche?p=saccuir" className="cn">
                      {t("Sac cuir artisanal")}
                    </Link>
                    <div className="cv">
                      {t("Marron")}
                    </div>
                  </div>
                  <span className="ic2">
                    <Link to="/panier" onClick={g.sauver("saccuir")} aria-label={t("Sauvegarder pour plus tard")}>
                      <Icone nom="bookmark" taille={19} />
                    </Link>
                    <Link to="/panier" onClick={g.retirer("saccuir")} aria-label={t("Retirer l’article")}>
                      <Icone nom="trash-2" taille={19} />
                    </Link>
                  </span>
                </div>
                <div className="cl07-st">
                  <span className="cl07-stp">
                    <span className="b dis" aria-label={t("Moins")} aria-disabled="true">
                      <Icone nom="minus" taille={16} />
                    </span>
                    <b>
                      {t("1")}
                    </b>
                    <span className="b" aria-label={t("Plus")} role="button" tabIndex={0} onClick={g.plus("saccuir")} onKeyDown={activer}>
                      <Icone nom="plus" taille={16} />
                    </span>
                  </span>
                  <span className="cl07-op">
                    {t("52\u00A0000\u00A0F")}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="blk cl07-subt">
            <span className="k">
              {t("Sous-total boutique")}
              <small>
                {t("livraison calculée ci-dessous")}
              </small>
            </span>
            <b>
              {t("84\u00A0000\u00A0F")}
            </b>
          </div>
        </section>
        <section className="card cl07-sc" style={{ "--c": "var(--ink-2)" } as CSSProperties}>
          <div className="sh">
            <i className="bl"></i>
            <div className="grow">
              <div className="nm">
                {t("Boutique C")}
                <Icone nom="check" taille={17} trait={2.6} />
              </div>
              <div className="zn oz">
                {t("Mvan · zone différente · prêt sous 6\u00A0h")}
              </div>
              <div className="tr">
                {t("Vendeur certifié Bronze · Trust Score 64")}
              </div>
            </div>
            <span className="cl07-tag">
              {t("Colis 3")}
            </span>
          </div>
          <div className="blk">
            <div className="cl07-ln">
              <Link to="/fiche?p=mixeur" className="im" aria-label={t("Mixeur-blender 2 L · 600 W")}>
                <span className="thumb" style={{ "width": "64px", "height": "64px", "borderRadius": "16px" }}>
                  <Dessin id="1bf387ebd71e" />
                </span>
              </Link>
              <div className="grow">
                <div className="row" style={{ "alignItems": "flex-start", "gap": "4px" }}>
                  <div className="grow">
                    <Link to="/fiche?p=mixeur" className="cn">
                      {t("Mixeur-blender 2 L · 600 W")}
                    </Link>
                  </div>
                  <span className="ic2">
                    <Link to="/panier" onClick={g.sauver("mixeur")} aria-label={t("Sauvegarder pour plus tard")}>
                      <Icone nom="bookmark" taille={19} />
                    </Link>
                    <Link to="/panier" onClick={g.retirer("mixeur")} aria-label={t("Retirer l’article")}>
                      <Icone nom="trash-2" taille={19} />
                    </Link>
                  </span>
                </div>
                <div className="cl07-st">
                  <span className="cl07-stp">
                    <span className="b dis" aria-label={t("Moins")} aria-disabled="true">
                      <Icone nom="minus" taille={16} />
                    </span>
                    <b>
                      {t("1")}
                    </b>
                    <span className="b" aria-label={t("Plus")} role="button" tabIndex={0} onClick={g.plus("mixeur")} onKeyDown={activer}>
                      <Icone nom="plus" taille={16} />
                    </span>
                  </span>
                  <span className="cl07-op">
                    {t("37\u00A0000\u00A0F")}
                  </span>
                </div>
              </div>
            </div>
            <div className="cl07-adv">
              {t("Ce produit vient d’une autre zone\u00A0: son ramassage est au plein tarif. ")}
              <b>
                {t("Le même produit existe à Mvog-Ada — tu économiserais 900\u00A0F.")}
              </b>
              <br />
              <Link to="/panier" className="btn soft" onClick={g.changerOffre("mixeur")}>
                <Icone nom="repeat" taille={18} />
                <span>
                  {t("Changer d’offre")}
                </span>
              </Link>
            </div>
          </div>
          <div className="blk cl07-subt">
            <span className="k">
              {t("Sous-total boutique")}
              <small>
                {t("livraison calculée ci-dessous")}
              </small>
            </span>
            <b>
              {t("37\u00A0000\u00A0F")}
            </b>
          </div>
        </section>
        <div className="cl07-par">
          <Icone nom="package" taille={18} />
          <span>
            {t("Tes articles arrivent en 3 colis, retirables ensemble avec un seul code.")}
          </span>
        </div>
        <div className="card or cl07-fd">
          <div className="ti">
            <Icone nom="lightbulb" taille={20} />
            <span>
              {t("Livraison de base offerte — tu dépasses 30\u00A0000\u00A0F.")}
            </span>
          </div>
          <p>
            {t("Il te reste 880\u00A0F de ramassages. Regrouper la boutique C à Mvog-Ada les ferait tomber à 380\u00A0F.")}
          </p>
          <div className="bar" role="progressbar" aria-valuenow={100} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ "width": "100.0%" }}></i>
          </div>
          <div className="lg">
            <span>
              {t("271\u00A0699\u00A0F d’articles")}
            </span>
            <b>
              {t("seuil 30\u00A0000\u00A0F atteint")}
            </b>
          </div>
        </div>
    </>
  )
  const recap = (
    <>
        <div className="card cl07-rc">
          <div className="kk">
            {t("Récapitulatif")}
          </div>
          <div className="cl07-r">
            <span className="lb">
              {t("Sous-total articles (4)")}
            </span>
            <span className="v">
              {t("271\u00A0699\u00A0F")}
            </span>
          </div>
          <div className="cl07-r">
            <i className="cl07-dot" style={{ "--c": "var(--or)" } as CSSProperties}></i>
            <span className="lb">
              {t("Ramassage boutique A")}
            </span>
            <span className="v">
              <s>
                {t("500\u00A0F")}
              </s>
              <span className="fr">
                {t("offert")}
              </span>
            </span>
          </div>
          <div className="cl07-r">
            <i className="cl07-dot" style={{ "--c": "var(--or-m)" } as CSSProperties}></i>
            <span className="lb">
              {t("Ramassage boutique B")}
              <small className="g">
                {t("même zone · trajet partagé −24\u00A0%")}
              </small>
            </span>
            <span className="v">
              {t("380\u00A0F")}
            </span>
          </div>
          <div className="cl07-r">
            <i className="cl07-dot" style={{ "--c": "var(--ink-2)" } as CSSProperties}></i>
            <span className="lb">
              {t("Ramassage boutique C")}
              <small className="a">
                {t("zone différente · plein tarif")}
              </small>
            </span>
            <span className="v">
              {t("500\u00A0F")}
            </span>
          </div>
          <div className="cl07-r">
            <span className="lb">
              {t("Remise au Relais Mvog-Ada · colis 1")}
              <small>
                {t("livraison de base offerte dès 30\u00A0000\u00A0F")}
              </small>
            </span>
            <span className="v">
              <s>
                {t("400\u00A0F")}
              </s>
              <span className="fr">
                {t("offert")}
              </span>
            </span>
          </div>
          <div className="cl07-r">
            <span className="lb">
              {t("Remise au Relais Mvog-Ada · colis 2")}
            </span>
            <span className="v">
              {t("400\u00A0F")}
            </span>
          </div>
          <div className="cl07-r">
            <span className="lb">
              {t("Remise au Relais Mvog-Ada · colis 3")}
            </span>
            <span className="v">
              {t("400\u00A0F")}
            </span>
          </div>
          <div className="cl07-tot">
            <span className="l">
              {t("Total à payer")}
            </span>
            <span className="price">
              {t("273\u00A0379")}
              <small>
                {t(" F")}
              </small>
            </span>
          </div>
          <div className="cl07-eco">
            {t("tu économises 900\u00A0F de livraison")}
          </div>
          <div className="cl07-pmx">
            <div className="cl07-lab">
              {t("Moyens acceptés")}
            </div>
            <div className="cl07-pm">
              <span className="mtn">
                {t("MTN")}
              </span>
              <span className="org">
                {t("Orange")}
              </span>
              <span className="vis">
                {t("VISA")}
              </span>
              <span className="mc">
                {t("Mastercard")}
              </span>
            </div>
            <div className="hn">
              {t("Carte\u00A0: 2\u00A0% de frais de service, affichés avant de payer.")}
            </div>
          </div>
        </div>
    </>
  )
  const sauves = (
    <>
        <div className="cl07-svh">
          <h2>
            {t("Sauvegardés")}
          </h2>
          <span>
            {t("glisse un article vers la gauche pour l’y mettre")}
          </span>
        </div>
        <div className="cl07-svc">
          <div className="cl07-sv">
            <Link to="/fiche?p=montre" aria-label={t("Montre acier bracelet cuir")}>
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="465a7de86fd7" />
              </span>
            </Link>
            <div className="grow">
              <Link to="/fiche?p=montre" className="cn">
                {t("Montre acier bracelet cuir")}
              </Link>
              <div className="pz">
                <b>
                  {t("27\u00A0500\u00A0F")}
                </b>
                {" "}
                <s>
                  {t("29\u00A0900\u00A0F")}
                </s>
                {t(" · ")}
                <span>
                  {t("prix baissé de 2\u00A0400\u00A0F")}
                </span>
              </div>
            </div>
            <button type="button" className="btn secondary sm" aria-label={t("Remettre au panier : Montre acier bracelet cuir")} onClick={g.remettre("montre")}>
              <span>
                {t("Remettre")}
              </span>
            </button>
          </div>
          <div className="cl07-sv">
            <Link to="/fiche?p=baskets" aria-label={t("Baskets running")}>
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="032cafed79c8" />
              </span>
            </Link>
            <div className="grow">
              <Link to="/fiche?p=baskets" className="cn">
                {t("Baskets running · Pointure 42")}
              </Link>
              <div className="pz">
                <b>
                  {t("29\u00A0900\u00A0F")}
                </b>
                {t(" · ")}
                <span>
                  {t("de retour en stock")}
                </span>
              </div>
            </div>
            <button type="button" className="btn secondary sm" aria-label={t("Remettre au panier : Baskets running")} onClick={g.remettre("baskets")}>
              <span>
                {t("Remettre")}
              </span>
            </button>
          </div>
        </div>
        <div className="cl07-sva">
          <Link to="/sauvegardes" className="a cl07-a cor b7 t13" style={{ "display": "flex", "alignItems": "center" }}>
            {t("Tout voir · 2")}
            <Icone nom="chevron-right" taille={16} />
          </Link>
        </div>
    </>
  )
  const escrow = (
    <>
        <div className="card green cl07-esc">
          <Icone nom="shield-check" taille={22} />
          <div className="grow">
            <b>
              {t("Escrow BelivaY")}
            </b>
            <p>
              {t("Le vendeur n’est payé qu’après ton retrait au Relais Mvog-Ada.")}
            </p>
          </div>
        </div>
    </>
  )
  const legal = (
    <>
        <div className="cl07-leg">
          <Link to="/legal" className="cl07-tb">
            <Icone nom="scroll-text" taille={16} />
            <span>
              {t("Conditions de vente et de paiement")}
            </span>
          </Link>
        </div>
    </>
  )
  switch (useEtat("panier-retrait")) {
    case "panier-retrait":
    case "panier-retrait?p=camon30":
    default:
      return (
        <Ecran route="panier-retrait" parEtat action={<ActionPartagerPanier />} largeur="moyen" fixes={
          <>
            {!tabL && <div className="cl07-bar">{barre}</div>}
            <div className="veil"></div>
            <div className="sheet">
              <div className="grab"></div>
              <div className="cl07-rh">
                <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                  <Dessin id="c8ed74acd931" />
                </span>
                <div className="grow">
                  <h3 className="cl07-sht">
                    {t("Retirer le Tecno Camon 30\u00A0?")}
                  </h3>
                  <div className="cl07-shs" style={{ "marginTop": "2px" }}>
                    {t("Gris titane · 256 Go · Boutique A")}
                  </div>
                </div>
              </div>
              <div className="cl07-warn">
                <Icone nom="triangle-alert" taille={20} />
                <span>
                  {t("En retirant cet article, tu perds le trajet partagé avec la boutique A — le ramassage restant passe de 380 à 500\u00A0F.")}
                </span>
              </div>
              <div className="cl07-rt">
                <div className="cl07-r">
                  <span className="lb">
                    {t("Total actuel")}
                  </span>
                  <span className="v">
                    <s>
                      {t("273\u00A0379\u00A0F")}
                    </s>
                  </span>
                </div>
                <div className="cl07-tot">
                  <span className="l">
                    {t("Nouveau total")}
                  </span>
                  <span className="price">
                    {t("121\u00A0900")}
                    <small>
                      {t(" F")}
                    </small>
                  </span>
                </div>
              </div>
              <div className="btns" style={{ "marginTop": "16px" }}>
                <Link to="/panier" className="btn primary" onClick={g.garder}>
                  <span>
                    {t("Garder l’article")}
                  </span>
                </Link>
              </div>
              <div className="btns">
                <Link to="/panier" onClick={g.sauver("camon30")} className="btn secondary">
                  <Icone nom="bookmark" taille={18} />
                  <span>
                    {t("Sauvegarder pour plus tard")}
                  </span>
                </Link>
              </div>
              <div className="btns">
                <Link to="/panier" onClick={g.retirer("camon30")} className="btn danger">
                  <Icone nom="trash-2" taille={18} />
                  <span>
                    {t("Retirer quand même")}
                  </span>
                </Link>
              </div>
            </div>
          </>
        }>
        {!tabL ? (
          <>
            {contenu}
            {recap}
            {sauves}
            {escrow}
            {legal}
          </>
        ) : (
          // Dès 1024 px, comme le panier (lot 8) : colis à gauche ; à droite, collant, le récapitulatif et
          // « Passer commande » (la barre fixée du téléphone) ; les sauvegardés sous les deux colonnes.
          <>
            <Gabarit forme="colonnes" classe="pa-l">
              <Colonne>{contenu}</Colonne>
              <Aside titre="Récapitulatif" classe="pa-recap">
                {recap}
                <div className="cl07-act">{barre}</div>
                {escrow}
                {legal}
              </Aside>
            </Gabarit>
            <div className="pa-l-bas">{sauves}</div>
          </>
        )}
        </Ecran>
      )
  }
}
