// Écran « Accueil » (CL-04) : généré par outils/ecran.mjs depuis le prototype du 1er octobre, un rendu par
// état (8 adresses). En-tête, barre du bas et marges suivent l'état (Ecran parEtat).
// Les données sont encore écrites dans le rendu (démonstration) ; elles passeront par la source, sous la
// garde des tests au pixel (tests/identique.spec.ts).
import { Link } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Module } from '../../composants/Module'
import { CompteARebours } from '../../composants/CompteARebours'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { useEtat } from '../../config/etats'
import { usePreferences } from '../../preferences'
import { PourMesProches } from '../../composants/PourMesProches'
import { useLieu } from '../../composants/PourQui'
import { useCompteDiaspora } from '../../session'
import { CibleDes, ColonneDroiteAccueil, Deplace, TeteAccueil } from './AccueilLarge'
import { ALaUneAccueil, CarrouselAccueil, CategoriesAccueil, FlashAccueil, MomentAccueil, RangeeSponsorisee, VitrineAccueil } from './AccueilContenus'
import { useContenuAccueil } from '../../composants/contenus'
import { FluxPourVous } from './PourVous'
import { useCoeursFavoris } from '../../composants/CoeursFavoris'

export function Accueil() {
  const { t } = usePreferences()
  // Compte diaspora (DP-54) : la carte « Pour mes proches » sous l'en-tête ; pas de colis à lui au relais.
  const diaspora = useCompteDiaspora()
  // Compte diaspora : « Près du relais de Odile » (son proche actif) au lieu de « Près de ton relais ».
  const lieu = useLieu()
  // Contenus remplaçables (carrousel, catégories, textes flash, bandeau de confiance) : donnees/contenus.ts.
  const contenu = useContenuAccueil()
  // Cœurs « Ajouter aux favoris » sur toutes les cartes de l'accueil, sans ouvrir le produit.
  useCoeursFavoris()
  switch (useEtat("accueil")) {
    case "accueil":
    default:
      return (
        <Ecran route="accueil" pied={false} parEtat gabarit="catalogue" droite={<ColonneDroiteAccueil />} avant={
          <>
            <Styles id="57f763a2e1" />
            <Styles id="1c3d953197" />
          </>
        } fixes={
          <>
            {!diaspora && (
            <Deplace vers={{ tab: 'acc-tete', pc: 'acc-colis' }}>
            <div className="h0-float">
              <Link to="/commandes" className="fi" aria-label="Mes commandes">
                <Icone nom="package" taille={22} />
              </Link>
              <Link to="/commandes" className="ft">
                <b>
                  {t("3 colis t’attendent au relais")}
                </b>
                <small>
                  <span>
                    {t("Mvog-Ada")}
                  </span>
                  {t(" · ")}
                  <span>
                    {t("Ouvert jusqu’à 19\u00A0h")}
                  </span>
                </small>
              </Link>
              <Link to="/code?ref=BLV-52018" className="fc">
                <Icone nom="qr-code" taille={16} />
                {t("Mon code")}
              </Link>
            </div>
            </Deplace>
            )}
            <a href="#" className="h0-up" data-act="top" aria-label="Revenir en haut">
              <Icone nom="arrow-up" taille={20} />
            </a>
          </>
        }>
        <TeteAccueil />
        <MomentAccueil />
        <CarrouselAccueil />
        <CategoriesAccueil />
        <Deplace vers={{ pc: 'acc-flash' }}>
        <Module ff="FF-FLASH">
        <section className="h0-panel h0-flash">
          <div className="cir">
            <Link to="/ventes-flash" className="lbl">
              <b>
                <Icone nom="zap" taille={16} style={{ "fill": "currentColor" }} />
                {t(contenu.flash.titre)}
              </b>
              <CompteARebours secondes={35100} />
              <span className="nt">
                {t(contenu.flash.sousTitre)}
              </span>
              <span className="all">
                {t("Tout voir")}
                <Icone nom="arrow-right" taille={13} />
              </span>
            </Link>
            <FlashAccueil>
            <Link to="/ventes-flash?offre=cartable">
              <span className="ph">
                <span>
                  <Dessin id="bfb8686109b5" />
                </span>
                <i>
                  {t("−13\u00A0%")}
                </i>
              </span>
              <b>
                {t("Tablette enfant Amazon Fire HD 10 Kids")}
              </b>
              <em>
                {t("105\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/ventes-flash?offre=portebebe">
              <span className="ph">
                <span>
                  <Dessin id="ada19db4961b" />
                </span>
                <i>
                  {t("−12\u00A0%")}
                </i>
              </span>
              <b>
                {t("Poussette Cybex Priam")}
              </b>
              <em>
                {t("686\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/ventes-flash?offre=chargeur33">
              <span className="ph">
                <span>
                  <Dessin id="dc530be6c1cd" />
                </span>
                <i>
                  {t("−15\u00A0%")}
                </i>
              </span>
              <b>
                {t("Chargeur Apple MagSafe 25 W")}
              </b>
              <em>
                {t("29\u00A0600\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=baskets">
              <span className="ph">
                <span>
                  <Dessin id="032cafed79c8" />
                </span>
                <i>
                  {t("−14\u00A0%")}
                </i>
              </span>
              <b>
                {t("Nike Air Max Dn")}
              </b>
              <em>
                {t("120\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=galaxya15">
              <span className="ph">
                <span>
                  <Dessin id="96013188e842" />
                </span>
                <i>
                  {t("−10\u00A0%")}
                </i>
              </span>
              <b>
                {t("Samsung Galaxy S25 Ultra")}
              </b>
              <em>
                {t("890\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=montre">
              <span className="ph">
                <span>
                  <Dessin id="465a7de86fd7" />
                </span>
                <i>
                  {t("−8\u00A0%")}
                </i>
              </span>
              <b>
                {t("Montre Garmin Fenix 8")}
              </b>
              <em>
                {t("690\u00A0000\u00A0F")}
              </em>
            </Link>
            </FlashAccueil>
          </div>
        </section>
        </Module>
        </Deplace>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="star" taille={18} />
            </span>
            <h2>
              {t("À la une")}
            </h2>
            <span className="h0t">
              {lieu.r("Près de ton relais")}
            </span>
            <span className="sp"></span>
            <Link to="/liste?tri=proche&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <ALaUneAccueil>
            <Link to="/fiche?p=pagne" className="h0-c plain">
              <span className="im">
                <Dessin id="adff434c44d0" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Pagne Vlisco Super Wax 6 yards · motif soleil")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,5\u00A0km")}
                </span>
                <span className="p">
                  {t("42\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=chargeur33" className="h0-c plain">
              <span className="im">
                <Dessin id="d86ad7218c7b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Chargeur Apple MagSafe 25 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,6\u00A0km")}
                </span>
                <span className="p">
                  {t("35\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ensemblewax" className="h0-c plain">
              <span className="im">
                <Dessin id="133b889e63e7" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ensemble Vlisco Super Wax 3 pièces")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("75\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=saccuir" className="h0-c plain">
              <span className="im">
                <Dessin id="63612bb6f86f" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sac Michael Kors Jet Set")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("185\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ecouteurs" className="h0-c plain">
              <span className="im">
                <Dessin id="8bfb5146603e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("AirPods 4 réduction de bruit")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=itelac52" className="h0-c plain">
              <span className="im">
                <Dessin id="1a984b0b264a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy Watch7")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("210\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=sandales" className="h0-c plain">
              <span className="im">
                <Dessin id="46807d04a705" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Nike Air Force 1 ’07")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("85\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=karite" className="h0-c plain">
              <span className="im">
                <Dessin id="4d520c8a165b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sèche-cheveux Dyson Supersonic")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,0\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </ALaUneAccueil>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="eye" taille={18} />
            </span>
            <h2>
              {t("Récemment consultés")}
            </h2>
            <span className="sp"></span>
          </div>
          <div className="h0-row">
            <Link to="/fiche?p=sandales" className="h0-c">
              <span className="im">
                <Dessin id="46807d04a705" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Nike Air Force 1 ’07")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("85\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (73)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=robewax" className="h0-c">
              <span className="im">
                <Dessin id="0e10b70ce5b2" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Robe longue en wax, coupe moderne")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,4\u00A0km")}
                </span>
                <span className="p">
                  {t("55\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (58)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ensemblewax" className="h0-c">
              <span className="im">
                <Dessin id="133b889e63e7" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ensemble Vlisco Super Wax 3 pièces")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("75\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (64)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=montre" className="h0-c">
              <span className="im">
                <Dessin id="e5c0e2fb6ad6" />
                <span className="off">
                  {t("−8\u00A0%")}
                </span>
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr on" aria-label="Favori">
                  <Icone nom="heart" taille={15} style={{ "fill": "currentColor" }} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Montre Garmin Fenix 8")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,2\u00A0km")}
                </span>
                <span className="p">
                  {t("690\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                  <s>
                    {t("750\u00A0000\u00A0F")}
                  </s>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (29)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=saccuir" className="h0-c">
              <span className="im">
                <Dessin id="63612bb6f86f" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sac Michael Kors Jet Set")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("185\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (41)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
          </div>
        </section>
        <Link to="/promotions" className="h0-ban promo">
          <span className="wm" aria-hidden="true">
            {t("PROMO FLASH")}
          </span>
          <span className="bi">
            <Icone nom="flame" taille={24} />
          </span>
          <span className="grow">
            <b>
              {t("6 promos jusqu’à −15\u00A0%")}
            </b>
            <small>
              <Icone nom="clock" taille={13} />
              {t(" Fin dans ")}
              <CompteARebours secondes={35100} />
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        <Deplace vers={{ tab: 'acc-tri' }}>
        <div className="h0-sort">
          {t("Trier\u00A0:")}
          <Link to="/liste?from=accueil">
            {t("Pertinence")}
            <Icone nom="chevron-down" taille={15} />
          </Link>
        </div>
        </Deplace>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="flame" taille={18} />
            </span>
            <h2>
              {t("Produits populaires")}
            </h2>
            <span className="sp"></span>
            <CibleDes des="tab" nom="acc-tri" classe="acc-tri" />
            <Link to="/liste?from=accueil" className="va">
              {t("Voir plus")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-g3">
            <RangeeSponsorisee cat={null}>
            <Link to="/fiche?p=karite" className="h0-c">
              <span className="im">
                <Dessin id="4d520c8a165b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sèche-cheveux Dyson Supersonic")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,0\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (301)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=chargeur33" className="h0-c">
              <span className="im">
                <Dessin id="d86ad7218c7b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Chargeur Apple MagSafe 25 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,6\u00A0km")}
                </span>
                <span className="p">
                  {t("35\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (175)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ecouteurs" className="h0-c">
              <span className="im">
                <Dessin id="8bfb5146603e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("AirPods 4 réduction de bruit")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (211)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=pagne" className="h0-c">
              <span className="im">
                <Dessin id="adff434c44d0" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Pagne Vlisco Super Wax 6 yards · motif soleil")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,5\u00A0km")}
                </span>
                <span className="p">
                  {t("42\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (152)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=coco" className="h0-c">
              <span className="im">
                <Dessin id="25ee2829127a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Brosse à dents Oral-B iO Series 9")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,3\u00A0km")}
                </span>
                <span className="p">
                  {t("150\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (118)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=camon30" className="h0-c">
              <span className="im">
                <Dessin id="8bf046203afd" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPhone 16 Pro Max")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  <small>
                    {t("dès ")}
                  </small>
                  {t("950\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (128)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <Module ff="FF-ABONNEMENT">
        <Link to="/abonnements" className="h0-ban prem">
          <span className="wm" aria-hidden="true">
            {t("PREMIUM")}
          </span>
          <span className="bi">
            <Icone nom="gem" taille={22} />
          </span>
          <span className="grow">
            <b>
              {t("BelivaY Premium ")}
              <i>
                {t("SPONSO")}
              </i>
            </b>
            <small>
              {t("Retrait offert dès 10\u00A0000\u00A0F · jours de garde en plus")}
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        </Module>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="sparkles" taille={18} />
            </span>
            <h2>
              {t("Nouveaux Arrivages")}
            </h2>
            <span className="sp"></span>
            <Link to="/liste?from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <Link to="/liste?from=accueil" className="h0-newb" aria-label="Nouveautés">
            <span>
              <b>
                {t("Tout juste arrivés")}
              </b>
              <small>
                {lieu.r("Les derniers produits publiés, retirables à ton relais")}
              </small>
            </span>
          </Link>
          <div className="h0-row">
            <VitrineAccueil rangee="nouveautes">
            <Link to="/fiche?p=tapisyoga" className="h0-c">
              <span className="im">
                <Dessin id="bc2a56f65d01" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Casque Meta Quest 3")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("4,1\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,2")}
                  </b>
                  {t(" (18)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=tablette8" className="h0-c">
              <span className="im">
                <Dessin id="6d95c1664bef" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPad Pro M4 11″")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  {t("820\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (21)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=portebebe" className="h0-c">
              <span className="im">
                <Dessin id="2b87fb3289d9" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Poussette Cybex Priam")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,9\u00A0km")}
                </span>
                <span className="p">
                  {t("780\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (27)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=marmite" className="h0-c">
              <span className="im">
                <Dessin id="86c6d76d224e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Airfryer Philips XXL")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,7\u00A0km")}
                </span>
                <span className="p">
                  {t("145\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (22)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=montre" className="h0-c">
              <span className="im">
                <Dessin id="e5c0e2fb6ad6" />
                <span className="off">
                  {t("−8\u00A0%")}
                </span>
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr on" aria-label="Favori">
                  <Icone nom="heart" taille={15} style={{ "fill": "currentColor" }} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Montre Garmin Fenix 8")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,2\u00A0km")}
                </span>
                <span className="p">
                  {t("690\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                  <s>
                    {t("750\u00A0000\u00A0F")}
                  </s>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (29)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </VitrineAccueil>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="shirt" taille={18} />
            </span>
            <h2>
              {t("Mode femme")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=femme&sub=Pagnes%20%26%20wax&from=accueil">
                {t("Pagnes & wax")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=femme&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'femme'}>
            <Link to="/fiche?p=pagne" className="h0-c">
              <span className="im">
                <Dessin id="adff434c44d0" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Pagne Vlisco Super Wax 6 yards · motif soleil")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,5\u00A0km")}
                </span>
                <span className="p">
                  {t("42\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (152)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ensemblewax" className="h0-c">
              <span className="im">
                <Dessin id="133b889e63e7" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ensemble Vlisco Super Wax 3 pièces")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("75\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (64)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=robewax" className="h0-c">
              <span className="im">
                <Dessin id="0e10b70ce5b2" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Robe longue en wax, coupe moderne")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,4\u00A0km")}
                </span>
                <span className="p">
                  {t("55\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (58)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=saccuir" className="h0-c">
              <span className="im">
                <Dessin id="63612bb6f86f" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sac Michael Kors Jet Set")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("185\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (41)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <Link to="/selection" className="h0-ban sel">
          <span className="wm" aria-hidden="true">
            {t("CURATED")}
          </span>
          <span className="bi">
            <Icone nom="star" taille={22} style={{ "fill": "currentColor" }} />
          </span>
          <span className="grow">
            <b>
              {t("Sélection Premium ")}
              <i>
                {t("CURATED")}
              </i>
            </b>
            <small>
              {t("Sélection Premium · Produits triés sur le volet")}
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="headphones" taille={18} />
            </span>
            <h2>
              {t("Électronique")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=elec&sub=Audio&from=accueil">
                {t("Audio")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=elec&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'elec'}>
            <Link to="/fiche?p=ecouteurs" className="h0-c">
              <span className="im">
                <Dessin id="8bfb5146603e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("AirPods 4 réduction de bruit")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (211)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=batterie" className="h0-c">
              <span className="im">
                <Dessin id="c746cb3b6c6e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Anker Prime 20\u00A0000 mAh 200 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,9\u00A0km")}
                </span>
                <span className="p">
                  {t("70\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (66)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=tv43" className="h0-c">
              <span className="im">
                <Dessin id="330d95174f5e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Neo QLED 4K 55″")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("5,2\u00A0km")}
                </span>
                <span className="p">
                  {t("750\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (31)")}
                </span>
                <span className="dl">
                  <Icone nom="truck" taille={12} style={{ "verticalAlign": "-2px" }} />
                  {t(" À domicile")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="smartphone" taille={18} />
            </span>
            <h2>
              {t("Téléphones & tablettes")}
            </h2>
            <span className="sp"></span>
            <Link to="/liste?cat=tel&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'tel'}>
            <Link to="/fiche?p=chargeur33" className="h0-c">
              <span className="im">
                <Dessin id="d86ad7218c7b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Chargeur Apple MagSafe 25 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,6\u00A0km")}
                </span>
                <span className="p">
                  {t("35\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (175)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=camon30" className="h0-c">
              <span className="im">
                <Dessin id="8bf046203afd" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPhone 16 Pro Max")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  <small>
                    {t("dès ")}
                  </small>
                  {t("950\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (128)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=tablette8" className="h0-c">
              <span className="im">
                <Dessin id="6d95c1664bef" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPad Pro M4 11″")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  {t("820\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (21)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=galaxya15" className="h0-c">
              <span className="im">
                <Dessin id="20344e766a88" />
                <span className="off">
                  {t("−10\u00A0%")}
                </span>
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy S25 Ultra")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,4\u00A0km")}
                </span>
                <span className="p">
                  {t("890\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                  <s>
                    {t("989\u00A0000\u00A0F")}
                  </s>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (93)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=itelac52" className="h0-c">
              <span className="im">
                <Dessin id="1a984b0b264a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy Watch7")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("210\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,2")}
                  </b>
                  {t(" (57)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="sparkles" taille={18} />
            </span>
            <h2>
              {t("Beauté & santé")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=beaute&sub=Cheveux&from=accueil">
                {t("Cheveux")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=beaute&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'beaute'}>
            <Link to="/fiche?p=karite" className="h0-c">
              <span className="im">
                <Dessin id="4d520c8a165b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sèche-cheveux Dyson Supersonic")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,0\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (301)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=coco" className="h0-c">
              <span className="im">
                <Dessin id="25ee2829127a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Brosse à dents Oral-B iO Series 9")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,3\u00A0km")}
                </span>
                <span className="p">
                  {t("150\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (118)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=cremevisage" className="h0-c">
              <span className="im">
                <Dessin id="9ae7c3ae964a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sérum The Ordinary Niacinamide 30 ml")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,0\u00A0km")}
                </span>
                <span className="p">
                  {t("12\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (46)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="sofa" taille={18} />
            </span>
            <h2>
              {t("Maison & cuisine")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=maison&sub=Cuisine&from=accueil">
                {t("Cuisine")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=maison&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'maison'}>
            <Link to="/fiche?p=mixeur" className="h0-c">
              <span className="im">
                <Dessin id="6cd10aa8c291" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ninja Blender professionnel 1 200 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("4,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (84)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ventilo" className="h0-c">
              <span className="im">
                <Dessin id="02cc832346b3" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Dyson Purifier Cool TP10")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("3,1\u00A0km")}
                </span>
                <span className="p">
                  {t("450\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,1")}
                  </b>
                  {t(" (48)")}
                </span>
                <span className="dl">
                  {t("+ 1\u00A0100\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=fer" className="h0-c">
              <span className="im">
                <Dessin id="2563d7011b1e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Défroisseur vapeur Philips 3000")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,6\u00A0km")}
                </span>
                <span className="p">
                  {t("65\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,0")}
                  </b>
                  {t(" (39)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=marmite" className="h0-c">
              <span className="im">
                <Dessin id="86c6d76d224e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Airfryer Philips XXL")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,7\u00A0km")}
                </span>
                <span className="p">
                  {t("145\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (22)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <Link to="/diaspora" className="h0-ban dia">
          <span className="wm" aria-hidden="true">
            {t("DIASPORA")}
          </span>
          <span className="bi">
            <Icone nom="globe" taille={22} />
          </span>
          <span className="grow">
            <b>
              {t("Un proche paie pour toi ")}
              <i>
                {t("DIASPORA")}
              </i>
            </b>
            <small>
              {t("Envoie ton panier\u00A0: il paie depuis l’étranger, tu retires au relais.")}
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="shopping-basket" taille={18} />
            </span>
            <h2>
              {t("Supermarché")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=marche&sub=%C3%89picerie&from=accueil">
                {t("Épicerie")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=marche&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'marche'}>
            <Link to="/fiche?p=riz" className="h0-c">
              <span className="im">
                <Dessin id="8a529ed55590" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Riz parfumé Royal Umbrella 25\u00A0kg")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,7\u00A0km")}
                </span>
                <span className="p">
                  {t("22\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (87)")}
                </span>
                <span className="dl">
                  {t("+ 1\u00A0100\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=huile5l" className="h0-c">
              <span className="im">
                <Dessin id="6fbbd05006d1" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Huile d’arachide Lesieur 5 L")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,7\u00A0km")}
                </span>
                <span className="p">
                  {t("12\u00A0500")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (64)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=cafe" className="h0-c">
              <span className="im">
                <Dessin id="23c68d9299ea" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Capsules Nespresso Vertuo, coffret 50")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("5,9\u00A0km")}
                </span>
                <span className="p">
                  {t("28\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (52)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        {diaspora && <PourMesProches />}
        <FluxPourVous />
        </Ecran>
      )
    case "accueil?st=horsligne":
      return (
        <Ecran route="accueil" pied={false} parEtat gabarit="catalogue" droite={<ColonneDroiteAccueil />} avant={
          <>
            <Styles id="57f763a2e1" />
            <Styles id="1c3d953197" />
          </>
        } fixes={
          <>
            <Deplace vers={{ tab: 'acc-tete', pc: 'acc-colis' }}>
            <div className="h0-float">
              <Link to="/commandes" className="fi" aria-label="Mes commandes">
                <Icone nom="package" taille={22} />
              </Link>
              <Link to="/commandes" className="ft">
                <b>
                  {t("3 colis t’attendent au relais")}
                </b>
                <small>
                  <span>
                    {t("Mvog-Ada")}
                  </span>
                  {t(" · ")}
                  <span>
                    {t("Ouvert jusqu’à 19\u00A0h")}
                  </span>
                </small>
              </Link>
              <Link to="/code?ref=BLV-52018" className="fc">
                <Icone nom="qr-code" taille={16} />
                {t("Mon code")}
              </Link>
            </div>
            </Deplace>
            <a href="#" className="h0-up" data-act="top" aria-label="Revenir en haut">
              <Icone nom="arrow-up" taille={20} />
            </a>
          </>
        }>
        <Link to="/reseau?st=cache" style={{ "display": "block" }}>
          <div className="offline-banner">
            <Icone nom="wifi-off" taille={18} />
            <span>
              {t("Hors ligne · accueil enregistré à 10\u00A0h\u00A012. Ton code de retrait reste lisible. ")}
              <u>
                {t("En savoir plus")}
              </u>
            </span>
          </div>
        </Link>
        <TeteAccueil />
        <MomentAccueil />
        <CarrouselAccueil />
        <CategoriesAccueil />
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="eye" taille={18} />
            </span>
            <h2>
              {t("Récemment consultés")}
            </h2>
            <span className="sp"></span>
          </div>
          <div className="h0-row">
            <Link to="/fiche?p=sandales" className="h0-c plain">
              <span className="im">
                <Dessin id="46807d04a705" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Nike Air Force 1 ’07")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("85\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=robewax" className="h0-c plain">
              <span className="im">
                <Dessin id="0e10b70ce5b2" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Robe longue en wax, coupe moderne")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,4\u00A0km")}
                </span>
                <span className="p">
                  {t("55\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ensemblewax" className="h0-c plain">
              <span className="im">
                <Dessin id="133b889e63e7" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ensemble Vlisco Super Wax 3 pièces")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("75\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=montre" className="h0-c plain">
              <span className="im">
                <Dessin id="e5c0e2fb6ad6" />
                <span className="off">
                  {t("−8\u00A0%")}
                </span>
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr on" aria-label="Favori">
                  <Icone nom="heart" taille={15} style={{ "fill": "currentColor" }} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Montre Garmin Fenix 8")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,2\u00A0km")}
                </span>
                <span className="p">
                  {t("690\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                  <s>
                    {t("750\u00A0000\u00A0F")}
                  </s>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=saccuir" className="h0-c plain">
              <span className="im">
                <Dessin id="63612bb6f86f" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sac Michael Kors Jet Set")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("185\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
          </div>
        </section>
        <div className="card mt16">
          <div className="empty">
            <div className="ei">
              <Icone nom="wifi-off" taille={26} />
            </div>
            <h3>
              {t("Le reste de l’accueil revient avec le réseau")}
            </h3>
            <p>
              {t("Tes commandes, ton code et le reçu restent lisibles hors ligne.")}
            </p>
            <div className="btns" style={{ "justifyContent": "center" }}>
              <button type="button" className="btn secondary auto">
                <Icone nom="rotate-cw-sm" taille={18} />
                <span>
                  {t("Réessayer")}
                </span>
              </button>
            </div>
          </div>
        </div>
        </Ecran>
      )
    case "accueil?st=ferme":
      return (
        <Ecran route="accueil" pied={false} parEtat gabarit="catalogue" droite={<ColonneDroiteAccueil />} avant={
          <>
            <Styles id="57f763a2e1" />
            <Styles id="1c3d953197" />
          </>
        } fixes={
          <>
            <Deplace vers={{ tab: 'acc-tete', pc: 'acc-colis' }}>
            <div className="h0-float">
              <Link to="/commandes" className="fi" aria-label="Mes commandes">
                <Icone nom="package" taille={22} />
              </Link>
              <Link to="/commandes" className="ft">
                <b>
                  {t("2 colis t’attendent au relais")}
                </b>
                <small>
                  {t("Rouvre demain à 8\u00A0h")}
                </small>
              </Link>
              <Link to="/code?ref=BLV-52018" className="fc">
                <Icone nom="qr-code" taille={16} />
                {t("Mon code")}
              </Link>
            </div>
            </Deplace>
            <a href="#" className="h0-up" data-act="top" aria-label="Revenir en haut">
              <Icone nom="arrow-up" taille={20} />
            </a>
          </>
        }>
        <TeteAccueil />
        <MomentAccueil />
        <CarrouselAccueil />
        <CategoriesAccueil />
        <Deplace vers={{ pc: 'acc-flash' }}>
        <Module ff="FF-FLASH">
        <section className="h0-panel h0-flash">
          <div className="cir">
            <Link to="/ventes-flash" className="lbl">
              <b>
                <Icone nom="zap" taille={16} style={{ "fill": "currentColor" }} />
                {t(contenu.flash.titre)}
              </b>
              <CompteARebours secondes={35100} />
              <span className="nt">
                {t(contenu.flash.sousTitre)}
              </span>
              <span className="all">
                {t("Tout voir")}
                <Icone nom="arrow-right" taille={13} />
              </span>
            </Link>
            <FlashAccueil>
            <Link to="/ventes-flash?offre=cartable">
              <span className="ph">
                <span>
                  <Dessin id="bfb8686109b5" />
                </span>
                <i>
                  {t("−13\u00A0%")}
                </i>
              </span>
              <b>
                {t("Tablette enfant Amazon Fire HD 10 Kids")}
              </b>
              <em>
                {t("105\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/ventes-flash?offre=portebebe">
              <span className="ph">
                <span>
                  <Dessin id="ada19db4961b" />
                </span>
                <i>
                  {t("−12\u00A0%")}
                </i>
              </span>
              <b>
                {t("Poussette Cybex Priam")}
              </b>
              <em>
                {t("686\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/ventes-flash?offre=chargeur33">
              <span className="ph">
                <span>
                  <Dessin id="dc530be6c1cd" />
                </span>
                <i>
                  {t("−15\u00A0%")}
                </i>
              </span>
              <b>
                {t("Chargeur Apple MagSafe 25 W")}
              </b>
              <em>
                {t("29\u00A0600\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=baskets">
              <span className="ph">
                <span>
                  <Dessin id="032cafed79c8" />
                </span>
                <i>
                  {t("−14\u00A0%")}
                </i>
              </span>
              <b>
                {t("Nike Air Max Dn")}
              </b>
              <em>
                {t("120\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=galaxya15">
              <span className="ph">
                <span>
                  <Dessin id="96013188e842" />
                </span>
                <i>
                  {t("−10\u00A0%")}
                </i>
              </span>
              <b>
                {t("Samsung Galaxy S25 Ultra")}
              </b>
              <em>
                {t("890\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=montre">
              <span className="ph">
                <span>
                  <Dessin id="465a7de86fd7" />
                </span>
                <i>
                  {t("−8\u00A0%")}
                </i>
              </span>
              <b>
                {t("Montre Garmin Fenix 8")}
              </b>
              <em>
                {t("690\u00A0000\u00A0F")}
              </em>
            </Link>
            </FlashAccueil>
          </div>
        </section>
        </Module>
        </Deplace>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="star" taille={18} />
            </span>
            <h2>
              {t("À la une")}
            </h2>
            <span className="h0t">
              {lieu.r("Près de ton relais")}
            </span>
            <span className="sp"></span>
            <Link to="/liste?tri=proche&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <ALaUneAccueil>
            <Link to="/fiche?p=pagne" className="h0-c plain">
              <span className="im">
                <Dessin id="adff434c44d0" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Pagne Vlisco Super Wax 6 yards · motif soleil")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,5\u00A0km")}
                </span>
                <span className="p">
                  {t("42\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=chargeur33" className="h0-c plain">
              <span className="im">
                <Dessin id="d86ad7218c7b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Chargeur Apple MagSafe 25 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,6\u00A0km")}
                </span>
                <span className="p">
                  {t("35\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ensemblewax" className="h0-c plain">
              <span className="im">
                <Dessin id="133b889e63e7" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ensemble Vlisco Super Wax 3 pièces")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("75\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=saccuir" className="h0-c plain">
              <span className="im">
                <Dessin id="63612bb6f86f" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sac Michael Kors Jet Set")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("185\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ecouteurs" className="h0-c plain">
              <span className="im">
                <Dessin id="8bfb5146603e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("AirPods 4 réduction de bruit")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=itelac52" className="h0-c plain">
              <span className="im">
                <Dessin id="1a984b0b264a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy Watch7")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("210\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=sandales" className="h0-c plain">
              <span className="im">
                <Dessin id="46807d04a705" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Nike Air Force 1 ’07")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("85\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=karite" className="h0-c plain">
              <span className="im">
                <Dessin id="4d520c8a165b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sèche-cheveux Dyson Supersonic")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,0\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </ALaUneAccueil>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="eye" taille={18} />
            </span>
            <h2>
              {t("Récemment consultés")}
            </h2>
            <span className="sp"></span>
          </div>
          <div className="h0-row">
            <Link to="/fiche?p=sandales" className="h0-c">
              <span className="im">
                <Dessin id="46807d04a705" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Nike Air Force 1 ’07")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("85\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (73)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=robewax" className="h0-c">
              <span className="im">
                <Dessin id="0e10b70ce5b2" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Robe longue en wax, coupe moderne")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,4\u00A0km")}
                </span>
                <span className="p">
                  {t("55\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (58)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ensemblewax" className="h0-c">
              <span className="im">
                <Dessin id="133b889e63e7" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ensemble Vlisco Super Wax 3 pièces")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("75\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (64)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=montre" className="h0-c">
              <span className="im">
                <Dessin id="e5c0e2fb6ad6" />
                <span className="off">
                  {t("−8\u00A0%")}
                </span>
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr on" aria-label="Favori">
                  <Icone nom="heart" taille={15} style={{ "fill": "currentColor" }} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Montre Garmin Fenix 8")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,2\u00A0km")}
                </span>
                <span className="p">
                  {t("690\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                  <s>
                    {t("750\u00A0000\u00A0F")}
                  </s>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (29)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=saccuir" className="h0-c">
              <span className="im">
                <Dessin id="63612bb6f86f" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sac Michael Kors Jet Set")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("185\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (41)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
          </div>
        </section>
        <Link to="/promotions" className="h0-ban promo">
          <span className="wm" aria-hidden="true">
            {t("PROMO FLASH")}
          </span>
          <span className="bi">
            <Icone nom="flame" taille={24} />
          </span>
          <span className="grow">
            <b>
              {t("6 promos jusqu’à −15\u00A0%")}
            </b>
            <small>
              <Icone nom="clock" taille={13} />
              {t(" Fin dans ")}
              <CompteARebours secondes={35100} />
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        <Deplace vers={{ tab: 'acc-tri' }}>
        <div className="h0-sort">
          {t("Trier\u00A0:")}
          <Link to="/liste?from=accueil">
            {t("Pertinence")}
            <Icone nom="chevron-down" taille={15} />
          </Link>
        </div>
        </Deplace>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="flame" taille={18} />
            </span>
            <h2>
              {t("Produits populaires")}
            </h2>
            <span className="sp"></span>
            <CibleDes des="tab" nom="acc-tri" classe="acc-tri" />
            <Link to="/liste?from=accueil" className="va">
              {t("Voir plus")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-g3">
            <RangeeSponsorisee cat={null}>
            <Link to="/fiche?p=karite" className="h0-c">
              <span className="im">
                <Dessin id="4d520c8a165b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sèche-cheveux Dyson Supersonic")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,0\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (301)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=chargeur33" className="h0-c">
              <span className="im">
                <Dessin id="d86ad7218c7b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Chargeur Apple MagSafe 25 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,6\u00A0km")}
                </span>
                <span className="p">
                  {t("35\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (175)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ecouteurs" className="h0-c">
              <span className="im">
                <Dessin id="8bfb5146603e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("AirPods 4 réduction de bruit")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (211)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=pagne" className="h0-c">
              <span className="im">
                <Dessin id="adff434c44d0" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Pagne Vlisco Super Wax 6 yards · motif soleil")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,5\u00A0km")}
                </span>
                <span className="p">
                  {t("42\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (152)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=coco" className="h0-c">
              <span className="im">
                <Dessin id="25ee2829127a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Brosse à dents Oral-B iO Series 9")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,3\u00A0km")}
                </span>
                <span className="p">
                  {t("150\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (118)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=camon30" className="h0-c">
              <span className="im">
                <Dessin id="8bf046203afd" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPhone 16 Pro Max")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  <small>
                    {t("dès ")}
                  </small>
                  {t("950\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (128)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <Module ff="FF-ABONNEMENT">
        <Link to="/abonnements" className="h0-ban prem">
          <span className="wm" aria-hidden="true">
            {t("PREMIUM")}
          </span>
          <span className="bi">
            <Icone nom="gem" taille={22} />
          </span>
          <span className="grow">
            <b>
              {t("BelivaY Premium ")}
              <i>
                {t("SPONSO")}
              </i>
            </b>
            <small>
              {t("Retrait offert dès 10\u00A0000\u00A0F · jours de garde en plus")}
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        </Module>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="sparkles" taille={18} />
            </span>
            <h2>
              {t("Nouveaux Arrivages")}
            </h2>
            <span className="sp"></span>
            <Link to="/liste?from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <Link to="/liste?from=accueil" className="h0-newb" aria-label="Nouveautés">
            <span>
              <b>
                {t("Tout juste arrivés")}
              </b>
              <small>
                {lieu.r("Les derniers produits publiés, retirables à ton relais")}
              </small>
            </span>
          </Link>
          <div className="h0-row">
            <VitrineAccueil rangee="nouveautes">
            <Link to="/fiche?p=tapisyoga" className="h0-c">
              <span className="im">
                <Dessin id="bc2a56f65d01" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Casque Meta Quest 3")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("4,1\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,2")}
                  </b>
                  {t(" (18)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=tablette8" className="h0-c">
              <span className="im">
                <Dessin id="6d95c1664bef" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPad Pro M4 11″")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  {t("820\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (21)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=portebebe" className="h0-c">
              <span className="im">
                <Dessin id="2b87fb3289d9" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Poussette Cybex Priam")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,9\u00A0km")}
                </span>
                <span className="p">
                  {t("780\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (27)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=marmite" className="h0-c">
              <span className="im">
                <Dessin id="86c6d76d224e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Airfryer Philips XXL")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,7\u00A0km")}
                </span>
                <span className="p">
                  {t("145\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (22)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=montre" className="h0-c">
              <span className="im">
                <Dessin id="e5c0e2fb6ad6" />
                <span className="off">
                  {t("−8\u00A0%")}
                </span>
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr on" aria-label="Favori">
                  <Icone nom="heart" taille={15} style={{ "fill": "currentColor" }} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Montre Garmin Fenix 8")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,2\u00A0km")}
                </span>
                <span className="p">
                  {t("690\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                  <s>
                    {t("750\u00A0000\u00A0F")}
                  </s>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (29)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </VitrineAccueil>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="shirt" taille={18} />
            </span>
            <h2>
              {t("Mode femme")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=femme&sub=Pagnes%20%26%20wax&from=accueil">
                {t("Pagnes & wax")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=femme&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'femme'}>
            <Link to="/fiche?p=pagne" className="h0-c">
              <span className="im">
                <Dessin id="adff434c44d0" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Pagne Vlisco Super Wax 6 yards · motif soleil")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,5\u00A0km")}
                </span>
                <span className="p">
                  {t("42\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (152)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ensemblewax" className="h0-c">
              <span className="im">
                <Dessin id="133b889e63e7" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ensemble Vlisco Super Wax 3 pièces")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("75\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (64)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=robewax" className="h0-c">
              <span className="im">
                <Dessin id="0e10b70ce5b2" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Robe longue en wax, coupe moderne")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,4\u00A0km")}
                </span>
                <span className="p">
                  {t("55\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (58)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=saccuir" className="h0-c">
              <span className="im">
                <Dessin id="63612bb6f86f" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sac Michael Kors Jet Set")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("185\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (41)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <Link to="/selection" className="h0-ban sel">
          <span className="wm" aria-hidden="true">
            {t("CURATED")}
          </span>
          <span className="bi">
            <Icone nom="star" taille={22} style={{ "fill": "currentColor" }} />
          </span>
          <span className="grow">
            <b>
              {t("Sélection Premium ")}
              <i>
                {t("CURATED")}
              </i>
            </b>
            <small>
              {t("Sélection Premium · Produits triés sur le volet")}
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="headphones" taille={18} />
            </span>
            <h2>
              {t("Électronique")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=elec&sub=Audio&from=accueil">
                {t("Audio")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=elec&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'elec'}>
            <Link to="/fiche?p=ecouteurs" className="h0-c">
              <span className="im">
                <Dessin id="8bfb5146603e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("AirPods 4 réduction de bruit")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (211)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=batterie" className="h0-c">
              <span className="im">
                <Dessin id="c746cb3b6c6e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Anker Prime 20\u00A0000 mAh 200 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,9\u00A0km")}
                </span>
                <span className="p">
                  {t("70\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (66)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=tv43" className="h0-c">
              <span className="im">
                <Dessin id="330d95174f5e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Neo QLED 4K 55″")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("5,2\u00A0km")}
                </span>
                <span className="p">
                  {t("750\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (31)")}
                </span>
                <span className="dl">
                  <Icone nom="truck" taille={12} style={{ "verticalAlign": "-2px" }} />
                  {t(" À domicile")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="smartphone" taille={18} />
            </span>
            <h2>
              {t("Téléphones & tablettes")}
            </h2>
            <span className="sp"></span>
            <Link to="/liste?cat=tel&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'tel'}>
            <Link to="/fiche?p=chargeur33" className="h0-c">
              <span className="im">
                <Dessin id="d86ad7218c7b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Chargeur Apple MagSafe 25 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,6\u00A0km")}
                </span>
                <span className="p">
                  {t("35\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (175)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=camon30" className="h0-c">
              <span className="im">
                <Dessin id="8bf046203afd" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPhone 16 Pro Max")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  <small>
                    {t("dès ")}
                  </small>
                  {t("950\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (128)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=tablette8" className="h0-c">
              <span className="im">
                <Dessin id="6d95c1664bef" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPad Pro M4 11″")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  {t("820\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (21)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=galaxya15" className="h0-c">
              <span className="im">
                <Dessin id="20344e766a88" />
                <span className="off">
                  {t("−10\u00A0%")}
                </span>
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy S25 Ultra")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,4\u00A0km")}
                </span>
                <span className="p">
                  {t("890\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                  <s>
                    {t("989\u00A0000\u00A0F")}
                  </s>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (93)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=itelac52" className="h0-c">
              <span className="im">
                <Dessin id="1a984b0b264a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy Watch7")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("210\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,2")}
                  </b>
                  {t(" (57)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="sparkles" taille={18} />
            </span>
            <h2>
              {t("Beauté & santé")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=beaute&sub=Cheveux&from=accueil">
                {t("Cheveux")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=beaute&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'beaute'}>
            <Link to="/fiche?p=karite" className="h0-c">
              <span className="im">
                <Dessin id="4d520c8a165b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sèche-cheveux Dyson Supersonic")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,0\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (301)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=coco" className="h0-c">
              <span className="im">
                <Dessin id="25ee2829127a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Brosse à dents Oral-B iO Series 9")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,3\u00A0km")}
                </span>
                <span className="p">
                  {t("150\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (118)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=cremevisage" className="h0-c">
              <span className="im">
                <Dessin id="9ae7c3ae964a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sérum The Ordinary Niacinamide 30 ml")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,0\u00A0km")}
                </span>
                <span className="p">
                  {t("12\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (46)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="sofa" taille={18} />
            </span>
            <h2>
              {t("Maison & cuisine")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=maison&sub=Cuisine&from=accueil">
                {t("Cuisine")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=maison&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'maison'}>
            <Link to="/fiche?p=mixeur" className="h0-c">
              <span className="im">
                <Dessin id="6cd10aa8c291" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ninja Blender professionnel 1 200 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("4,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (84)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ventilo" className="h0-c">
              <span className="im">
                <Dessin id="02cc832346b3" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Dyson Purifier Cool TP10")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("3,1\u00A0km")}
                </span>
                <span className="p">
                  {t("450\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,1")}
                  </b>
                  {t(" (48)")}
                </span>
                <span className="dl">
                  {t("+ 1\u00A0100\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=fer" className="h0-c">
              <span className="im">
                <Dessin id="2563d7011b1e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Défroisseur vapeur Philips 3000")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,6\u00A0km")}
                </span>
                <span className="p">
                  {t("65\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,0")}
                  </b>
                  {t(" (39)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=marmite" className="h0-c">
              <span className="im">
                <Dessin id="86c6d76d224e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Airfryer Philips XXL")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,7\u00A0km")}
                </span>
                <span className="p">
                  {t("145\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (22)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <Link to="/diaspora" className="h0-ban dia">
          <span className="wm" aria-hidden="true">
            {t("DIASPORA")}
          </span>
          <span className="bi">
            <Icone nom="globe" taille={22} />
          </span>
          <span className="grow">
            <b>
              {t("Un proche paie pour toi ")}
              <i>
                {t("DIASPORA")}
              </i>
            </b>
            <small>
              {t("Envoie ton panier\u00A0: il paie depuis l’étranger, tu retires au relais.")}
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="shopping-basket" taille={18} />
            </span>
            <h2>
              {t("Supermarché")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=marche&sub=%C3%89picerie&from=accueil">
                {t("Épicerie")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=marche&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'marche'}>
            <Link to="/fiche?p=riz" className="h0-c">
              <span className="im">
                <Dessin id="8a529ed55590" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Riz parfumé Royal Umbrella 25\u00A0kg")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,7\u00A0km")}
                </span>
                <span className="p">
                  {t("22\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (87)")}
                </span>
                <span className="dl">
                  {t("+ 1\u00A0100\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=huile5l" className="h0-c">
              <span className="im">
                <Dessin id="6fbbd05006d1" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Huile d’arachide Lesieur 5 L")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,7\u00A0km")}
                </span>
                <span className="p">
                  {t("12\u00A0500")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (64)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=cafe" className="h0-c">
              <span className="im">
                <Dessin id="23c68d9299ea" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Capsules Nespresso Vertuo, coffret 50")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("5,9\u00A0km")}
                </span>
                <span className="p">
                  {t("28\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (52)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <FluxPourVous />
        </Ecran>
      )
    case "accueil?profil=nouveau":
      return (
        <Ecran route="accueil" pied={false} parEtat gabarit="catalogue" droite={<ColonneDroiteAccueil />} avant={
          <>
            <Styles id="57f763a2e1" />
            <Styles id="1c3d953197" />
          </>
        } fixes={
          <>
            <a href="#" className="h0-up low" data-act="top" aria-label="Revenir en haut">
              <Icone nom="arrow-up" taille={20} />
            </a>
          </>
        }>
        <TeteAccueil />
        <MomentAccueil />
        <CarrouselAccueil />
        <CategoriesAccueil />
        <Deplace vers={{ pc: 'acc-flash' }}>
        <Module ff="FF-FLASH">
        <section className="h0-panel h0-flash">
          <div className="cir">
            <Link to="/ventes-flash" className="lbl">
              <b>
                <Icone nom="zap" taille={16} style={{ "fill": "currentColor" }} />
                {t(contenu.flash.titre)}
              </b>
              <CompteARebours secondes={35100} />
              <span className="nt">
                {t(contenu.flash.sousTitre)}
              </span>
              <span className="all">
                {t("Tout voir")}
                <Icone nom="arrow-right" taille={13} />
              </span>
            </Link>
            <FlashAccueil>
            <Link to="/ventes-flash?offre=cartable">
              <span className="ph">
                <span>
                  <Dessin id="bfb8686109b5" />
                </span>
                <i>
                  {t("−13\u00A0%")}
                </i>
              </span>
              <b>
                {t("Tablette enfant Amazon Fire HD 10 Kids")}
              </b>
              <em>
                {t("105\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/ventes-flash?offre=portebebe">
              <span className="ph">
                <span>
                  <Dessin id="ada19db4961b" />
                </span>
                <i>
                  {t("−12\u00A0%")}
                </i>
              </span>
              <b>
                {t("Poussette Cybex Priam")}
              </b>
              <em>
                {t("686\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/ventes-flash?offre=chargeur33">
              <span className="ph">
                <span>
                  <Dessin id="dc530be6c1cd" />
                </span>
                <i>
                  {t("−15\u00A0%")}
                </i>
              </span>
              <b>
                {t("Chargeur Apple MagSafe 25 W")}
              </b>
              <em>
                {t("29\u00A0600\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=baskets">
              <span className="ph">
                <span>
                  <Dessin id="032cafed79c8" />
                </span>
                <i>
                  {t("−14\u00A0%")}
                </i>
              </span>
              <b>
                {t("Nike Air Max Dn")}
              </b>
              <em>
                {t("120\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=galaxya15">
              <span className="ph">
                <span>
                  <Dessin id="96013188e842" />
                </span>
                <i>
                  {t("−10\u00A0%")}
                </i>
              </span>
              <b>
                {t("Samsung Galaxy S25 Ultra")}
              </b>
              <em>
                {t("890\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=montre">
              <span className="ph">
                <span>
                  <Dessin id="465a7de86fd7" />
                </span>
                <i>
                  {t("−8\u00A0%")}
                </i>
              </span>
              <b>
                {t("Montre Garmin Fenix 8")}
              </b>
              <em>
                {t("690\u00A0000\u00A0F")}
              </em>
            </Link>
            </FlashAccueil>
          </div>
        </section>
        </Module>
        </Deplace>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="star" taille={18} />
            </span>
            <h2>
              {t("À la une")}
            </h2>
            <span className="h0t">
              {lieu.r("Près de ton relais")}
            </span>
            <span className="sp"></span>
            <Link to="/liste?tri=proche&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <ALaUneAccueil>
            <Link to="/fiche?p=pagne" className="h0-c plain">
              <span className="im">
                <Dessin id="adff434c44d0" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Pagne Vlisco Super Wax 6 yards · motif soleil")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,5\u00A0km")}
                </span>
                <span className="p">
                  {t("42\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=chargeur33" className="h0-c plain">
              <span className="im">
                <Dessin id="d86ad7218c7b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Chargeur Apple MagSafe 25 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,6\u00A0km")}
                </span>
                <span className="p">
                  {t("35\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ensemblewax" className="h0-c plain">
              <span className="im">
                <Dessin id="133b889e63e7" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ensemble Vlisco Super Wax 3 pièces")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("75\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=saccuir" className="h0-c plain">
              <span className="im">
                <Dessin id="63612bb6f86f" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sac Michael Kors Jet Set")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("185\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ecouteurs" className="h0-c plain">
              <span className="im">
                <Dessin id="8bfb5146603e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("AirPods 4 réduction de bruit")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=itelac52" className="h0-c plain">
              <span className="im">
                <Dessin id="1a984b0b264a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy Watch7")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("210\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=sandales" className="h0-c plain">
              <span className="im">
                <Dessin id="46807d04a705" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Nike Air Force 1 ’07")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("85\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=karite" className="h0-c plain">
              <span className="im">
                <Dessin id="4d520c8a165b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sèche-cheveux Dyson Supersonic")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,0\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </ALaUneAccueil>
          </div>
        </section>
        <Link to="/promotions" className="h0-ban promo">
          <span className="wm" aria-hidden="true">
            {t("PROMO FLASH")}
          </span>
          <span className="bi">
            <Icone nom="flame" taille={24} />
          </span>
          <span className="grow">
            <b>
              {t("6 promos jusqu’à −15\u00A0%")}
            </b>
            <small>
              <Icone nom="clock" taille={13} />
              {t(" Fin dans ")}
              <CompteARebours secondes={35100} />
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        <Deplace vers={{ tab: 'acc-tri' }}>
        <div className="h0-sort">
          {t("Trier\u00A0:")}
          <Link to="/liste?from=accueil">
            {t("Pertinence")}
            <Icone nom="chevron-down" taille={15} />
          </Link>
        </div>
        </Deplace>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="flame" taille={18} />
            </span>
            <h2>
              {t("Produits populaires")}
            </h2>
            <span className="sp"></span>
            <CibleDes des="tab" nom="acc-tri" classe="acc-tri" />
            <Link to="/liste?from=accueil" className="va">
              {t("Voir plus")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-g3">
            <RangeeSponsorisee cat={null}>
            <Link to="/fiche?p=karite" className="h0-c">
              <span className="im">
                <Dessin id="4d520c8a165b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sèche-cheveux Dyson Supersonic")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,0\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (301)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=chargeur33" className="h0-c">
              <span className="im">
                <Dessin id="d86ad7218c7b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Chargeur Apple MagSafe 25 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,6\u00A0km")}
                </span>
                <span className="p">
                  {t("35\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (175)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ecouteurs" className="h0-c">
              <span className="im">
                <Dessin id="8bfb5146603e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("AirPods 4 réduction de bruit")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (211)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=pagne" className="h0-c">
              <span className="im">
                <Dessin id="adff434c44d0" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Pagne Vlisco Super Wax 6 yards · motif soleil")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,5\u00A0km")}
                </span>
                <span className="p">
                  {t("42\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (152)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=coco" className="h0-c">
              <span className="im">
                <Dessin id="25ee2829127a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Brosse à dents Oral-B iO Series 9")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,3\u00A0km")}
                </span>
                <span className="p">
                  {t("150\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (118)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=camon30" className="h0-c">
              <span className="im">
                <Dessin id="8bf046203afd" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPhone 16 Pro Max")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  <small>
                    {t("dès ")}
                  </small>
                  {t("950\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (128)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <Module ff="FF-ABONNEMENT">
        <Link to="/abonnements" className="h0-ban prem">
          <span className="wm" aria-hidden="true">
            {t("PREMIUM")}
          </span>
          <span className="bi">
            <Icone nom="gem" taille={22} />
          </span>
          <span className="grow">
            <b>
              {t("BelivaY Premium ")}
              <i>
                {t("SPONSO")}
              </i>
            </b>
            <small>
              {t("Retrait offert dès 10\u00A0000\u00A0F · jours de garde en plus")}
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        </Module>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="sparkles" taille={18} />
            </span>
            <h2>
              {t("Nouveaux Arrivages")}
            </h2>
            <span className="sp"></span>
            <Link to="/liste?from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <Link to="/liste?from=accueil" className="h0-newb" aria-label="Nouveautés">
            <span>
              <b>
                {t("Tout juste arrivés")}
              </b>
              <small>
                {lieu.r("Les derniers produits publiés, retirables à ton relais")}
              </small>
            </span>
          </Link>
          <div className="h0-row">
            <VitrineAccueil rangee="nouveautes">
            <Link to="/fiche?p=tapisyoga" className="h0-c">
              <span className="im">
                <Dessin id="bc2a56f65d01" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Casque Meta Quest 3")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("4,1\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,2")}
                  </b>
                  {t(" (18)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=tablette8" className="h0-c">
              <span className="im">
                <Dessin id="6d95c1664bef" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPad Pro M4 11″")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  {t("820\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (21)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=portebebe" className="h0-c">
              <span className="im">
                <Dessin id="2b87fb3289d9" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Poussette Cybex Priam")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,9\u00A0km")}
                </span>
                <span className="p">
                  {t("780\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (27)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=marmite" className="h0-c">
              <span className="im">
                <Dessin id="86c6d76d224e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Airfryer Philips XXL")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,7\u00A0km")}
                </span>
                <span className="p">
                  {t("145\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (22)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=montre" className="h0-c">
              <span className="im">
                <Dessin id="e5c0e2fb6ad6" />
                <span className="off">
                  {t("−8\u00A0%")}
                </span>
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Montre Garmin Fenix 8")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,2\u00A0km")}
                </span>
                <span className="p">
                  {t("690\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                  <s>
                    {t("750\u00A0000\u00A0F")}
                  </s>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (29)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </VitrineAccueil>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="shirt" taille={18} />
            </span>
            <h2>
              {t("Mode femme")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=femme&sub=Pagnes%20%26%20wax&from=accueil">
                {t("Pagnes & wax")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=femme&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'femme'}>
            <Link to="/fiche?p=pagne" className="h0-c">
              <span className="im">
                <Dessin id="adff434c44d0" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Pagne Vlisco Super Wax 6 yards · motif soleil")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,5\u00A0km")}
                </span>
                <span className="p">
                  {t("42\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (152)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ensemblewax" className="h0-c">
              <span className="im">
                <Dessin id="133b889e63e7" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ensemble Vlisco Super Wax 3 pièces")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("75\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (64)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=robewax" className="h0-c">
              <span className="im">
                <Dessin id="0e10b70ce5b2" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Robe longue en wax, coupe moderne")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,4\u00A0km")}
                </span>
                <span className="p">
                  {t("55\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (58)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=saccuir" className="h0-c">
              <span className="im">
                <Dessin id="63612bb6f86f" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sac Michael Kors Jet Set")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("185\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (41)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <Link to="/selection" className="h0-ban sel">
          <span className="wm" aria-hidden="true">
            {t("CURATED")}
          </span>
          <span className="bi">
            <Icone nom="star" taille={22} style={{ "fill": "currentColor" }} />
          </span>
          <span className="grow">
            <b>
              {t("Sélection Premium ")}
              <i>
                {t("CURATED")}
              </i>
            </b>
            <small>
              {t("Sélection Premium · Produits triés sur le volet")}
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="headphones" taille={18} />
            </span>
            <h2>
              {t("Électronique")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=elec&sub=Audio&from=accueil">
                {t("Audio")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=elec&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'elec'}>
            <Link to="/fiche?p=ecouteurs" className="h0-c">
              <span className="im">
                <Dessin id="8bfb5146603e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("AirPods 4 réduction de bruit")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (211)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=batterie" className="h0-c">
              <span className="im">
                <Dessin id="c746cb3b6c6e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Anker Prime 20\u00A0000 mAh 200 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,9\u00A0km")}
                </span>
                <span className="p">
                  {t("70\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (66)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=tv43" className="h0-c">
              <span className="im">
                <Dessin id="330d95174f5e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Neo QLED 4K 55″")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("5,2\u00A0km")}
                </span>
                <span className="p">
                  {t("750\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (31)")}
                </span>
                <span className="dl">
                  <Icone nom="truck" taille={12} style={{ "verticalAlign": "-2px" }} />
                  {t(" À domicile")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="smartphone" taille={18} />
            </span>
            <h2>
              {t("Téléphones & tablettes")}
            </h2>
            <span className="sp"></span>
            <Link to="/liste?cat=tel&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'tel'}>
            <Link to="/fiche?p=chargeur33" className="h0-c">
              <span className="im">
                <Dessin id="d86ad7218c7b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Chargeur Apple MagSafe 25 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,6\u00A0km")}
                </span>
                <span className="p">
                  {t("35\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (175)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=camon30" className="h0-c">
              <span className="im">
                <Dessin id="8bf046203afd" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPhone 16 Pro Max")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  <small>
                    {t("dès ")}
                  </small>
                  {t("950\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (128)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=tablette8" className="h0-c">
              <span className="im">
                <Dessin id="6d95c1664bef" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPad Pro M4 11″")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  {t("820\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (21)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=galaxya15" className="h0-c">
              <span className="im">
                <Dessin id="20344e766a88" />
                <span className="off">
                  {t("−10\u00A0%")}
                </span>
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy S25 Ultra")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,4\u00A0km")}
                </span>
                <span className="p">
                  {t("890\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                  <s>
                    {t("989\u00A0000\u00A0F")}
                  </s>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (93)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=itelac52" className="h0-c">
              <span className="im">
                <Dessin id="1a984b0b264a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy Watch7")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("210\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,2")}
                  </b>
                  {t(" (57)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="sparkles" taille={18} />
            </span>
            <h2>
              {t("Beauté & santé")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=beaute&sub=Cheveux&from=accueil">
                {t("Cheveux")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=beaute&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'beaute'}>
            <Link to="/fiche?p=karite" className="h0-c">
              <span className="im">
                <Dessin id="4d520c8a165b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sèche-cheveux Dyson Supersonic")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,0\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (301)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=coco" className="h0-c">
              <span className="im">
                <Dessin id="25ee2829127a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Brosse à dents Oral-B iO Series 9")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,3\u00A0km")}
                </span>
                <span className="p">
                  {t("150\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (118)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=cremevisage" className="h0-c">
              <span className="im">
                <Dessin id="9ae7c3ae964a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sérum The Ordinary Niacinamide 30 ml")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,0\u00A0km")}
                </span>
                <span className="p">
                  {t("12\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (46)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="sofa" taille={18} />
            </span>
            <h2>
              {t("Maison & cuisine")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=maison&sub=Cuisine&from=accueil">
                {t("Cuisine")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=maison&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'maison'}>
            <Link to="/fiche?p=mixeur" className="h0-c">
              <span className="im">
                <Dessin id="6cd10aa8c291" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ninja Blender professionnel 1 200 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("4,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (84)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ventilo" className="h0-c">
              <span className="im">
                <Dessin id="02cc832346b3" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Dyson Purifier Cool TP10")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("3,1\u00A0km")}
                </span>
                <span className="p">
                  {t("450\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,1")}
                  </b>
                  {t(" (48)")}
                </span>
                <span className="dl">
                  {t("+ 1\u00A0100\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=fer" className="h0-c">
              <span className="im">
                <Dessin id="2563d7011b1e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Défroisseur vapeur Philips 3000")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,6\u00A0km")}
                </span>
                <span className="p">
                  {t("65\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,0")}
                  </b>
                  {t(" (39)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=marmite" className="h0-c">
              <span className="im">
                <Dessin id="86c6d76d224e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Airfryer Philips XXL")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,7\u00A0km")}
                </span>
                <span className="p">
                  {t("145\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (22)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <Link to="/diaspora" className="h0-ban dia">
          <span className="wm" aria-hidden="true">
            {t("DIASPORA")}
          </span>
          <span className="bi">
            <Icone nom="globe" taille={22} />
          </span>
          <span className="grow">
            <b>
              {t("Un proche paie pour toi ")}
              <i>
                {t("DIASPORA")}
              </i>
            </b>
            <small>
              {t("Envoie ton panier\u00A0: il paie depuis l’étranger, tu retires au relais.")}
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="shopping-basket" taille={18} />
            </span>
            <h2>
              {t("Supermarché")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=marche&sub=%C3%89picerie&from=accueil">
                {t("Épicerie")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=marche&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'marche'}>
            <Link to="/fiche?p=riz" className="h0-c">
              <span className="im">
                <Dessin id="8a529ed55590" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Riz parfumé Royal Umbrella 25\u00A0kg")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,7\u00A0km")}
                </span>
                <span className="p">
                  {t("22\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (87)")}
                </span>
                <span className="dl">
                  {t("+ 1\u00A0100\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=huile5l" className="h0-c">
              <span className="im">
                <Dessin id="6fbbd05006d1" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Huile d’arachide Lesieur 5 L")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,7\u00A0km")}
                </span>
                <span className="p">
                  {t("12\u00A0500")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (64)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=cafe" className="h0-c">
              <span className="im">
                <Dessin id="23c68d9299ea" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Capsules Nespresso Vertuo, coffret 50")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("5,9\u00A0km")}
                </span>
                <span className="p">
                  {t("28\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (52)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <FluxPourVous />
        </Ecran>
      )
    case "accueil?profil=navigateur":
      return (
        <Ecran route="accueil" pied={false} parEtat gabarit="catalogue" droite={<ColonneDroiteAccueil />} avant={
          <>
            <Styles id="57f763a2e1" />
            <Styles id="1c3d953197" />
          </>
        } fixes={
          <>
            <a href="#" className="h0-up low" data-act="top" aria-label="Revenir en haut">
              <Icone nom="arrow-up" taille={20} />
            </a>
          </>
        }>
        <TeteAccueil />
        <MomentAccueil />
        <CarrouselAccueil />
        <CategoriesAccueil />
        <Deplace vers={{ pc: 'acc-flash' }}>
        <Module ff="FF-FLASH">
        <section className="h0-panel h0-flash">
          <div className="cir">
            <Link to="/ventes-flash" className="lbl">
              <b>
                <Icone nom="zap" taille={16} style={{ "fill": "currentColor" }} />
                {t(contenu.flash.titre)}
              </b>
              <CompteARebours secondes={35100} />
              <span className="nt">
                {t(contenu.flash.sousTitre)}
              </span>
              <span className="all">
                {t("Tout voir")}
                <Icone nom="arrow-right" taille={13} />
              </span>
            </Link>
            <FlashAccueil>
            <Link to="/ventes-flash?offre=cartable">
              <span className="ph">
                <span>
                  <Dessin id="bfb8686109b5" />
                </span>
                <i>
                  {t("−13\u00A0%")}
                </i>
              </span>
              <b>
                {t("Tablette enfant Amazon Fire HD 10 Kids")}
              </b>
              <em>
                {t("105\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/ventes-flash?offre=portebebe">
              <span className="ph">
                <span>
                  <Dessin id="ada19db4961b" />
                </span>
                <i>
                  {t("−12\u00A0%")}
                </i>
              </span>
              <b>
                {t("Poussette Cybex Priam")}
              </b>
              <em>
                {t("686\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/ventes-flash?offre=chargeur33">
              <span className="ph">
                <span>
                  <Dessin id="dc530be6c1cd" />
                </span>
                <i>
                  {t("−15\u00A0%")}
                </i>
              </span>
              <b>
                {t("Chargeur Apple MagSafe 25 W")}
              </b>
              <em>
                {t("29\u00A0600\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=baskets">
              <span className="ph">
                <span>
                  <Dessin id="032cafed79c8" />
                </span>
                <i>
                  {t("−14\u00A0%")}
                </i>
              </span>
              <b>
                {t("Nike Air Max Dn")}
              </b>
              <em>
                {t("120\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=galaxya15">
              <span className="ph">
                <span>
                  <Dessin id="96013188e842" />
                </span>
                <i>
                  {t("−10\u00A0%")}
                </i>
              </span>
              <b>
                {t("Samsung Galaxy S25 Ultra")}
              </b>
              <em>
                {t("890\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=montre">
              <span className="ph">
                <span>
                  <Dessin id="465a7de86fd7" />
                </span>
                <i>
                  {t("−8\u00A0%")}
                </i>
              </span>
              <b>
                {t("Montre Garmin Fenix 8")}
              </b>
              <em>
                {t("690\u00A0000\u00A0F")}
              </em>
            </Link>
            </FlashAccueil>
          </div>
        </section>
        </Module>
        </Deplace>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="star" taille={18} />
            </span>
            <h2>
              {t("À la une")}
            </h2>
            <span className="h0t">
              {lieu.r("Près de ton relais")}
            </span>
            <span className="sp"></span>
            <Link to="/liste?tri=proche&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <ALaUneAccueil>
            <Link to="/fiche?p=pagne" className="h0-c plain">
              <span className="im">
                <Dessin id="adff434c44d0" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Pagne Vlisco Super Wax 6 yards · motif soleil")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,5\u00A0km")}
                </span>
                <span className="p">
                  {t("42\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=chargeur33" className="h0-c plain">
              <span className="im">
                <Dessin id="d86ad7218c7b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Chargeur Apple MagSafe 25 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,6\u00A0km")}
                </span>
                <span className="p">
                  {t("35\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ensemblewax" className="h0-c plain">
              <span className="im">
                <Dessin id="133b889e63e7" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ensemble Vlisco Super Wax 3 pièces")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("75\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=saccuir" className="h0-c plain">
              <span className="im">
                <Dessin id="63612bb6f86f" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sac Michael Kors Jet Set")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("185\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ecouteurs" className="h0-c plain">
              <span className="im">
                <Dessin id="8bfb5146603e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("AirPods 4 réduction de bruit")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=itelac52" className="h0-c plain">
              <span className="im">
                <Dessin id="1a984b0b264a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy Watch7")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("210\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=sandales" className="h0-c plain">
              <span className="im">
                <Dessin id="46807d04a705" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Nike Air Force 1 ’07")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("85\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=karite" className="h0-c plain">
              <span className="im">
                <Dessin id="4d520c8a165b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sèche-cheveux Dyson Supersonic")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,0\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </ALaUneAccueil>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="eye" taille={18} />
            </span>
            <h2>
              {t("Récemment consultés")}
            </h2>
            <span className="sp"></span>
          </div>
          <div className="h0-row">
            <Link to="/fiche?p=chargeur33" className="h0-c">
              <span className="im">
                <Dessin id="d86ad7218c7b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Chargeur Apple MagSafe 25 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,6\u00A0km")}
                </span>
                <span className="p">
                  {t("35\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (175)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=camon30" className="h0-c">
              <span className="im">
                <Dessin id="8bf046203afd" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPhone 16 Pro Max")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  <small>
                    {t("dès ")}
                  </small>
                  {t("950\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (128)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=galaxya15" className="h0-c">
              <span className="im">
                <Dessin id="20344e766a88" />
                <span className="off">
                  {t("−10\u00A0%")}
                </span>
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy S25 Ultra")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,4\u00A0km")}
                </span>
                <span className="p">
                  {t("890\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                  <s>
                    {t("989\u00A0000\u00A0F")}
                  </s>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (93)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=itelac52" className="h0-c">
              <span className="im">
                <Dessin id="1a984b0b264a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy Watch7")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("210\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,2")}
                  </b>
                  {t(" (57)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=tablette8" className="h0-c">
              <span className="im">
                <Dessin id="6d95c1664bef" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPad Pro M4 11″")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  {t("820\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (21)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=karite" className="h0-c">
              <span className="im">
                <Dessin id="4d520c8a165b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sèche-cheveux Dyson Supersonic")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,0\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (301)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
          </div>
        </section>
        <Link to="/promotions" className="h0-ban promo">
          <span className="wm" aria-hidden="true">
            {t("PROMO FLASH")}
          </span>
          <span className="bi">
            <Icone nom="flame" taille={24} />
          </span>
          <span className="grow">
            <b>
              {t("6 promos jusqu’à −15\u00A0%")}
            </b>
            <small>
              <Icone nom="clock" taille={13} />
              {t(" Fin dans ")}
              <CompteARebours secondes={35100} />
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        <Deplace vers={{ tab: 'acc-tri' }}>
        <div className="h0-sort">
          {t("Trier\u00A0:")}
          <Link to="/liste?from=accueil">
            {t("Pertinence")}
            <Icone nom="chevron-down" taille={15} />
          </Link>
        </div>
        </Deplace>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="flame" taille={18} />
            </span>
            <h2>
              {t("Produits populaires")}
            </h2>
            <span className="sp"></span>
            <CibleDes des="tab" nom="acc-tri" classe="acc-tri" />
            <Link to="/liste?from=accueil" className="va">
              {t("Voir plus")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-g3">
            <RangeeSponsorisee cat={null}>
            <Link to="/fiche?p=karite" className="h0-c">
              <span className="im">
                <Dessin id="4d520c8a165b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sèche-cheveux Dyson Supersonic")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,0\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (301)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=chargeur33" className="h0-c">
              <span className="im">
                <Dessin id="d86ad7218c7b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Chargeur Apple MagSafe 25 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,6\u00A0km")}
                </span>
                <span className="p">
                  {t("35\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (175)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ecouteurs" className="h0-c">
              <span className="im">
                <Dessin id="8bfb5146603e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("AirPods 4 réduction de bruit")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (211)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=pagne" className="h0-c">
              <span className="im">
                <Dessin id="adff434c44d0" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Pagne Vlisco Super Wax 6 yards · motif soleil")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,5\u00A0km")}
                </span>
                <span className="p">
                  {t("42\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (152)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=coco" className="h0-c">
              <span className="im">
                <Dessin id="25ee2829127a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Brosse à dents Oral-B iO Series 9")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,3\u00A0km")}
                </span>
                <span className="p">
                  {t("150\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (118)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=camon30" className="h0-c">
              <span className="im">
                <Dessin id="8bf046203afd" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPhone 16 Pro Max")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  <small>
                    {t("dès ")}
                  </small>
                  {t("950\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (128)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <Module ff="FF-ABONNEMENT">
        <Link to="/abonnements" className="h0-ban prem">
          <span className="wm" aria-hidden="true">
            {t("PREMIUM")}
          </span>
          <span className="bi">
            <Icone nom="gem" taille={22} />
          </span>
          <span className="grow">
            <b>
              {t("BelivaY Premium ")}
              <i>
                {t("SPONSO")}
              </i>
            </b>
            <small>
              {t("Retrait offert dès 10\u00A0000\u00A0F · jours de garde en plus")}
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        </Module>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="sparkles" taille={18} />
            </span>
            <h2>
              {t("Nouveaux Arrivages")}
            </h2>
            <span className="sp"></span>
            <Link to="/liste?from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <Link to="/liste?from=accueil" className="h0-newb" aria-label="Nouveautés">
            <span>
              <b>
                {t("Tout juste arrivés")}
              </b>
              <small>
                {lieu.r("Les derniers produits publiés, retirables à ton relais")}
              </small>
            </span>
          </Link>
          <div className="h0-row">
            <VitrineAccueil rangee="nouveautes">
            <Link to="/fiche?p=tapisyoga" className="h0-c">
              <span className="im">
                <Dessin id="bc2a56f65d01" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Casque Meta Quest 3")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("4,1\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,2")}
                  </b>
                  {t(" (18)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=tablette8" className="h0-c">
              <span className="im">
                <Dessin id="6d95c1664bef" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPad Pro M4 11″")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  {t("820\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (21)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=portebebe" className="h0-c">
              <span className="im">
                <Dessin id="2b87fb3289d9" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Poussette Cybex Priam")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,9\u00A0km")}
                </span>
                <span className="p">
                  {t("780\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (27)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=marmite" className="h0-c">
              <span className="im">
                <Dessin id="86c6d76d224e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Airfryer Philips XXL")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,7\u00A0km")}
                </span>
                <span className="p">
                  {t("145\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (22)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=montre" className="h0-c">
              <span className="im">
                <Dessin id="e5c0e2fb6ad6" />
                <span className="off">
                  {t("−8\u00A0%")}
                </span>
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Montre Garmin Fenix 8")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,2\u00A0km")}
                </span>
                <span className="p">
                  {t("690\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                  <s>
                    {t("750\u00A0000\u00A0F")}
                  </s>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (29)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </VitrineAccueil>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="shirt" taille={18} />
            </span>
            <h2>
              {t("Mode femme")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=femme&sub=Pagnes%20%26%20wax&from=accueil">
                {t("Pagnes & wax")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=femme&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'femme'}>
            <Link to="/fiche?p=pagne" className="h0-c">
              <span className="im">
                <Dessin id="adff434c44d0" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Pagne Vlisco Super Wax 6 yards · motif soleil")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,5\u00A0km")}
                </span>
                <span className="p">
                  {t("42\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (152)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ensemblewax" className="h0-c">
              <span className="im">
                <Dessin id="133b889e63e7" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ensemble Vlisco Super Wax 3 pièces")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("75\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (64)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=robewax" className="h0-c">
              <span className="im">
                <Dessin id="0e10b70ce5b2" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Robe longue en wax, coupe moderne")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,4\u00A0km")}
                </span>
                <span className="p">
                  {t("55\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (58)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=saccuir" className="h0-c">
              <span className="im">
                <Dessin id="63612bb6f86f" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sac Michael Kors Jet Set")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("185\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (41)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <Link to="/selection" className="h0-ban sel">
          <span className="wm" aria-hidden="true">
            {t("CURATED")}
          </span>
          <span className="bi">
            <Icone nom="star" taille={22} style={{ "fill": "currentColor" }} />
          </span>
          <span className="grow">
            <b>
              {t("Sélection Premium ")}
              <i>
                {t("CURATED")}
              </i>
            </b>
            <small>
              {t("Sélection Premium · Produits triés sur le volet")}
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="headphones" taille={18} />
            </span>
            <h2>
              {t("Électronique")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=elec&sub=Audio&from=accueil">
                {t("Audio")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=elec&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'elec'}>
            <Link to="/fiche?p=ecouteurs" className="h0-c">
              <span className="im">
                <Dessin id="8bfb5146603e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("AirPods 4 réduction de bruit")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (211)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=batterie" className="h0-c">
              <span className="im">
                <Dessin id="c746cb3b6c6e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Anker Prime 20\u00A0000 mAh 200 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,9\u00A0km")}
                </span>
                <span className="p">
                  {t("70\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (66)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=tv43" className="h0-c">
              <span className="im">
                <Dessin id="330d95174f5e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Neo QLED 4K 55″")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("5,2\u00A0km")}
                </span>
                <span className="p">
                  {t("750\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (31)")}
                </span>
                <span className="dl">
                  <Icone nom="truck" taille={12} style={{ "verticalAlign": "-2px" }} />
                  {t(" À domicile")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="smartphone" taille={18} />
            </span>
            <h2>
              {t("Téléphones & tablettes")}
            </h2>
            <span className="sp"></span>
            <Link to="/liste?cat=tel&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'tel'}>
            <Link to="/fiche?p=chargeur33" className="h0-c">
              <span className="im">
                <Dessin id="d86ad7218c7b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Chargeur Apple MagSafe 25 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,6\u00A0km")}
                </span>
                <span className="p">
                  {t("35\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (175)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=camon30" className="h0-c">
              <span className="im">
                <Dessin id="8bf046203afd" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPhone 16 Pro Max")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  <small>
                    {t("dès ")}
                  </small>
                  {t("950\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (128)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=tablette8" className="h0-c">
              <span className="im">
                <Dessin id="6d95c1664bef" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPad Pro M4 11″")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  {t("820\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (21)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=galaxya15" className="h0-c">
              <span className="im">
                <Dessin id="20344e766a88" />
                <span className="off">
                  {t("−10\u00A0%")}
                </span>
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy S25 Ultra")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,4\u00A0km")}
                </span>
                <span className="p">
                  {t("890\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                  <s>
                    {t("989\u00A0000\u00A0F")}
                  </s>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (93)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=itelac52" className="h0-c">
              <span className="im">
                <Dessin id="1a984b0b264a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy Watch7")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("210\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,2")}
                  </b>
                  {t(" (57)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="sparkles" taille={18} />
            </span>
            <h2>
              {t("Beauté & santé")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=beaute&sub=Cheveux&from=accueil">
                {t("Cheveux")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=beaute&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'beaute'}>
            <Link to="/fiche?p=karite" className="h0-c">
              <span className="im">
                <Dessin id="4d520c8a165b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sèche-cheveux Dyson Supersonic")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,0\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (301)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=coco" className="h0-c">
              <span className="im">
                <Dessin id="25ee2829127a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Brosse à dents Oral-B iO Series 9")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,3\u00A0km")}
                </span>
                <span className="p">
                  {t("150\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (118)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=cremevisage" className="h0-c">
              <span className="im">
                <Dessin id="9ae7c3ae964a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sérum The Ordinary Niacinamide 30 ml")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,0\u00A0km")}
                </span>
                <span className="p">
                  {t("12\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (46)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="sofa" taille={18} />
            </span>
            <h2>
              {t("Maison & cuisine")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=maison&sub=Cuisine&from=accueil">
                {t("Cuisine")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=maison&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'maison'}>
            <Link to="/fiche?p=mixeur" className="h0-c">
              <span className="im">
                <Dessin id="6cd10aa8c291" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ninja Blender professionnel 1 200 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("4,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (84)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ventilo" className="h0-c">
              <span className="im">
                <Dessin id="02cc832346b3" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr on" aria-label="Favori">
                  <Icone nom="heart" taille={15} style={{ "fill": "currentColor" }} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Dyson Purifier Cool TP10")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("3,1\u00A0km")}
                </span>
                <span className="p">
                  {t("450\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,1")}
                  </b>
                  {t(" (48)")}
                </span>
                <span className="dl">
                  {t("+ 1\u00A0100\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=fer" className="h0-c">
              <span className="im">
                <Dessin id="2563d7011b1e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Défroisseur vapeur Philips 3000")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,6\u00A0km")}
                </span>
                <span className="p">
                  {t("65\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,0")}
                  </b>
                  {t(" (39)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=marmite" className="h0-c">
              <span className="im">
                <Dessin id="86c6d76d224e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Airfryer Philips XXL")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,7\u00A0km")}
                </span>
                <span className="p">
                  {t("145\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (22)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <Link to="/diaspora" className="h0-ban dia">
          <span className="wm" aria-hidden="true">
            {t("DIASPORA")}
          </span>
          <span className="bi">
            <Icone nom="globe" taille={22} />
          </span>
          <span className="grow">
            <b>
              {t("Un proche paie pour toi ")}
              <i>
                {t("DIASPORA")}
              </i>
            </b>
            <small>
              {t("Envoie ton panier\u00A0: il paie depuis l’étranger, tu retires au relais.")}
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="shopping-basket" taille={18} />
            </span>
            <h2>
              {t("Supermarché")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=marche&sub=%C3%89picerie&from=accueil">
                {t("Épicerie")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=marche&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'marche'}>
            <Link to="/fiche?p=riz" className="h0-c">
              <span className="im">
                <Dessin id="8a529ed55590" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Riz parfumé Royal Umbrella 25\u00A0kg")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,7\u00A0km")}
                </span>
                <span className="p">
                  {t("22\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (87)")}
                </span>
                <span className="dl">
                  {t("+ 1\u00A0100\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=huile5l" className="h0-c">
              <span className="im">
                <Dessin id="6fbbd05006d1" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Huile d’arachide Lesieur 5 L")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,7\u00A0km")}
                </span>
                <span className="p">
                  {t("12\u00A0500")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (64)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=cafe" className="h0-c">
              <span className="im">
                <Dessin id="23c68d9299ea" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Capsules Nespresso Vertuo, coffret 50")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("5,9\u00A0km")}
                </span>
                <span className="p">
                  {t("28\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (52)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <FluxPourVous />
        </Ecran>
      )
    case "accueil?profil=visiteur":
      return (
        <Ecran route="accueil" pied={false} parEtat gabarit="catalogue" droite={<ColonneDroiteAccueil />} avant={
          <>
            <Styles id="57f763a2e1" />
            <Styles id="1c3d953197" />
          </>
        } fixes={
          <>
            <a href="#" className="h0-up low" data-act="top" aria-label="Revenir en haut">
              <Icone nom="arrow-up" taille={20} />
            </a>
          </>
        }>
        <TeteAccueil />
        <MomentAccueil />
        <CarrouselAccueil />
        <CategoriesAccueil />
        <div className="h0-note">
          <Link to="/connexion" className="cl04-line">
            <span className="ic-sq or">
              <Icone nom="user-round" taille={20} />
            </span>
            <span className="grow">
              <b>
                {t("Tu navigues sans compte")}
              </b>
              <span>
                {t("Ton panier est gardé\u00A0; la connexion n’est demandée qu’au paiement.")}
              </span>
            </span>
            <Icone nom="chevron-right" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
          </Link>
        </div>
        <Deplace vers={{ pc: 'acc-flash' }}>
        <Module ff="FF-FLASH">
        <section className="h0-panel h0-flash">
          <div className="cir">
            <Link to="/ventes-flash" className="lbl">
              <b>
                <Icone nom="zap" taille={16} style={{ "fill": "currentColor" }} />
                {t(contenu.flash.titre)}
              </b>
              <CompteARebours secondes={35100} />
              <span className="nt">
                {t(contenu.flash.sousTitre)}
              </span>
              <span className="all">
                {t("Tout voir")}
                <Icone nom="arrow-right" taille={13} />
              </span>
            </Link>
            <FlashAccueil>
            <Link to="/ventes-flash?offre=cartable">
              <span className="ph">
                <span>
                  <Dessin id="bfb8686109b5" />
                </span>
                <i>
                  {t("−13\u00A0%")}
                </i>
              </span>
              <b>
                {t("Tablette enfant Amazon Fire HD 10 Kids")}
              </b>
              <em>
                {t("105\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/ventes-flash?offre=portebebe">
              <span className="ph">
                <span>
                  <Dessin id="ada19db4961b" />
                </span>
                <i>
                  {t("−12\u00A0%")}
                </i>
              </span>
              <b>
                {t("Poussette Cybex Priam")}
              </b>
              <em>
                {t("686\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/ventes-flash?offre=chargeur33">
              <span className="ph">
                <span>
                  <Dessin id="dc530be6c1cd" />
                </span>
                <i>
                  {t("−15\u00A0%")}
                </i>
              </span>
              <b>
                {t("Chargeur Apple MagSafe 25 W")}
              </b>
              <em>
                {t("29\u00A0600\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=baskets">
              <span className="ph">
                <span>
                  <Dessin id="032cafed79c8" />
                </span>
                <i>
                  {t("−14\u00A0%")}
                </i>
              </span>
              <b>
                {t("Nike Air Max Dn")}
              </b>
              <em>
                {t("120\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=galaxya15">
              <span className="ph">
                <span>
                  <Dessin id="96013188e842" />
                </span>
                <i>
                  {t("−10\u00A0%")}
                </i>
              </span>
              <b>
                {t("Samsung Galaxy S25 Ultra")}
              </b>
              <em>
                {t("890\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=montre">
              <span className="ph">
                <span>
                  <Dessin id="465a7de86fd7" />
                </span>
                <i>
                  {t("−8\u00A0%")}
                </i>
              </span>
              <b>
                {t("Montre Garmin Fenix 8")}
              </b>
              <em>
                {t("690\u00A0000\u00A0F")}
              </em>
            </Link>
            </FlashAccueil>
          </div>
        </section>
        </Module>
        </Deplace>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="star" taille={18} />
            </span>
            <h2>
              {t("À la une")}
            </h2>
            <span className="h0t">
              {lieu.r("Près de ton relais")}
            </span>
            <span className="sp"></span>
            <Link to="/liste?tri=proche&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <ALaUneAccueil>
            <Link to="/fiche?p=pagne" className="h0-c plain">
              <span className="im">
                <Dessin id="adff434c44d0" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Pagne Vlisco Super Wax 6 yards · motif soleil")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,5\u00A0km")}
                </span>
                <span className="p">
                  {t("42\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=chargeur33" className="h0-c plain">
              <span className="im">
                <Dessin id="d86ad7218c7b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Chargeur Apple MagSafe 25 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,6\u00A0km")}
                </span>
                <span className="p">
                  {t("35\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ensemblewax" className="h0-c plain">
              <span className="im">
                <Dessin id="133b889e63e7" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ensemble Vlisco Super Wax 3 pièces")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("75\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=saccuir" className="h0-c plain">
              <span className="im">
                <Dessin id="63612bb6f86f" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sac Michael Kors Jet Set")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("185\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ecouteurs" className="h0-c plain">
              <span className="im">
                <Dessin id="8bfb5146603e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("AirPods 4 réduction de bruit")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=itelac52" className="h0-c plain">
              <span className="im">
                <Dessin id="1a984b0b264a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy Watch7")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("210\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=sandales" className="h0-c plain">
              <span className="im">
                <Dessin id="46807d04a705" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Nike Air Force 1 ’07")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("85\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=karite" className="h0-c plain">
              <span className="im">
                <Dessin id="4d520c8a165b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sèche-cheveux Dyson Supersonic")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,0\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </ALaUneAccueil>
          </div>
        </section>
        <Link to="/promotions" className="h0-ban promo">
          <span className="wm" aria-hidden="true">
            {t("PROMO FLASH")}
          </span>
          <span className="bi">
            <Icone nom="flame" taille={24} />
          </span>
          <span className="grow">
            <b>
              {t("6 promos jusqu’à −15\u00A0%")}
            </b>
            <small>
              <Icone nom="clock" taille={13} />
              {t(" Fin dans ")}
              <CompteARebours secondes={35100} />
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        <Deplace vers={{ tab: 'acc-tri' }}>
        <div className="h0-sort">
          {t("Trier\u00A0:")}
          <Link to="/liste?from=accueil">
            {t("Pertinence")}
            <Icone nom="chevron-down" taille={15} />
          </Link>
        </div>
        </Deplace>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="flame" taille={18} />
            </span>
            <h2>
              {t("Produits populaires")}
            </h2>
            <span className="sp"></span>
            <CibleDes des="tab" nom="acc-tri" classe="acc-tri" />
            <Link to="/liste?from=accueil" className="va">
              {t("Voir plus")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-g3">
            <RangeeSponsorisee cat={null}>
            <Link to="/fiche?p=karite" className="h0-c">
              <span className="im">
                <Dessin id="4d520c8a165b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sèche-cheveux Dyson Supersonic")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,0\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (301)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=chargeur33" className="h0-c">
              <span className="im">
                <Dessin id="d86ad7218c7b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Chargeur Apple MagSafe 25 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,6\u00A0km")}
                </span>
                <span className="p">
                  {t("35\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (175)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ecouteurs" className="h0-c">
              <span className="im">
                <Dessin id="8bfb5146603e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("AirPods 4 réduction de bruit")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (211)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=pagne" className="h0-c">
              <span className="im">
                <Dessin id="adff434c44d0" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Pagne Vlisco Super Wax 6 yards · motif soleil")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,5\u00A0km")}
                </span>
                <span className="p">
                  {t("42\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (152)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=coco" className="h0-c">
              <span className="im">
                <Dessin id="25ee2829127a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Brosse à dents Oral-B iO Series 9")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,3\u00A0km")}
                </span>
                <span className="p">
                  {t("150\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (118)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=camon30" className="h0-c">
              <span className="im">
                <Dessin id="8bf046203afd" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPhone 16 Pro Max")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  <small>
                    {t("dès ")}
                  </small>
                  {t("950\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (128)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <Module ff="FF-ABONNEMENT">
        <Link to="/abonnements" className="h0-ban prem">
          <span className="wm" aria-hidden="true">
            {t("PREMIUM")}
          </span>
          <span className="bi">
            <Icone nom="gem" taille={22} />
          </span>
          <span className="grow">
            <b>
              {t("BelivaY Premium ")}
              <i>
                {t("SPONSO")}
              </i>
            </b>
            <small>
              {t("Retrait offert dès 10\u00A0000\u00A0F · jours de garde en plus")}
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        </Module>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="sparkles" taille={18} />
            </span>
            <h2>
              {t("Nouveaux Arrivages")}
            </h2>
            <span className="sp"></span>
            <Link to="/liste?from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <Link to="/liste?from=accueil" className="h0-newb" aria-label="Nouveautés">
            <span>
              <b>
                {t("Tout juste arrivés")}
              </b>
              <small>
                {lieu.r("Les derniers produits publiés, retirables à ton relais")}
              </small>
            </span>
          </Link>
          <div className="h0-row">
            <VitrineAccueil rangee="nouveautes">
            <Link to="/fiche?p=tapisyoga" className="h0-c">
              <span className="im">
                <Dessin id="bc2a56f65d01" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Casque Meta Quest 3")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("4,1\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,2")}
                  </b>
                  {t(" (18)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=tablette8" className="h0-c">
              <span className="im">
                <Dessin id="6d95c1664bef" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPad Pro M4 11″")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  {t("820\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (21)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=portebebe" className="h0-c">
              <span className="im">
                <Dessin id="2b87fb3289d9" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Poussette Cybex Priam")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,9\u00A0km")}
                </span>
                <span className="p">
                  {t("780\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (27)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=marmite" className="h0-c">
              <span className="im">
                <Dessin id="86c6d76d224e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Airfryer Philips XXL")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,7\u00A0km")}
                </span>
                <span className="p">
                  {t("145\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (22)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=montre" className="h0-c">
              <span className="im">
                <Dessin id="e5c0e2fb6ad6" />
                <span className="off">
                  {t("−8\u00A0%")}
                </span>
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Montre Garmin Fenix 8")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,2\u00A0km")}
                </span>
                <span className="p">
                  {t("690\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                  <s>
                    {t("750\u00A0000\u00A0F")}
                  </s>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (29)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </VitrineAccueil>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="shirt" taille={18} />
            </span>
            <h2>
              {t("Mode femme")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=femme&sub=Pagnes%20%26%20wax&from=accueil">
                {t("Pagnes & wax")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=femme&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'femme'}>
            <Link to="/fiche?p=pagne" className="h0-c">
              <span className="im">
                <Dessin id="adff434c44d0" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Pagne Vlisco Super Wax 6 yards · motif soleil")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,5\u00A0km")}
                </span>
                <span className="p">
                  {t("42\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (152)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ensemblewax" className="h0-c">
              <span className="im">
                <Dessin id="133b889e63e7" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ensemble Vlisco Super Wax 3 pièces")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("75\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (64)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=robewax" className="h0-c">
              <span className="im">
                <Dessin id="0e10b70ce5b2" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Robe longue en wax, coupe moderne")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,4\u00A0km")}
                </span>
                <span className="p">
                  {t("55\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (58)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=saccuir" className="h0-c">
              <span className="im">
                <Dessin id="63612bb6f86f" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sac Michael Kors Jet Set")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("185\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (41)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <Link to="/selection" className="h0-ban sel">
          <span className="wm" aria-hidden="true">
            {t("CURATED")}
          </span>
          <span className="bi">
            <Icone nom="star" taille={22} style={{ "fill": "currentColor" }} />
          </span>
          <span className="grow">
            <b>
              {t("Sélection Premium ")}
              <i>
                {t("CURATED")}
              </i>
            </b>
            <small>
              {t("Sélection Premium · Produits triés sur le volet")}
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="headphones" taille={18} />
            </span>
            <h2>
              {t("Électronique")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=elec&sub=Audio&from=accueil">
                {t("Audio")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=elec&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'elec'}>
            <Link to="/fiche?p=ecouteurs" className="h0-c">
              <span className="im">
                <Dessin id="8bfb5146603e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("AirPods 4 réduction de bruit")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (211)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=batterie" className="h0-c">
              <span className="im">
                <Dessin id="c746cb3b6c6e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Anker Prime 20\u00A0000 mAh 200 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,9\u00A0km")}
                </span>
                <span className="p">
                  {t("70\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (66)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=tv43" className="h0-c">
              <span className="im">
                <Dessin id="330d95174f5e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Neo QLED 4K 55″")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("5,2\u00A0km")}
                </span>
                <span className="p">
                  {t("750\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (31)")}
                </span>
                <span className="dl">
                  <Icone nom="truck" taille={12} style={{ "verticalAlign": "-2px" }} />
                  {t(" À domicile")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="smartphone" taille={18} />
            </span>
            <h2>
              {t("Téléphones & tablettes")}
            </h2>
            <span className="sp"></span>
            <Link to="/liste?cat=tel&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'tel'}>
            <Link to="/fiche?p=chargeur33" className="h0-c">
              <span className="im">
                <Dessin id="d86ad7218c7b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Chargeur Apple MagSafe 25 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,6\u00A0km")}
                </span>
                <span className="p">
                  {t("35\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (175)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=camon30" className="h0-c">
              <span className="im">
                <Dessin id="8bf046203afd" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPhone 16 Pro Max")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  <small>
                    {t("dès ")}
                  </small>
                  {t("950\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (128)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=tablette8" className="h0-c">
              <span className="im">
                <Dessin id="6d95c1664bef" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPad Pro M4 11″")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  {t("820\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (21)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=galaxya15" className="h0-c">
              <span className="im">
                <Dessin id="20344e766a88" />
                <span className="off">
                  {t("−10\u00A0%")}
                </span>
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy S25 Ultra")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,4\u00A0km")}
                </span>
                <span className="p">
                  {t("890\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                  <s>
                    {t("989\u00A0000\u00A0F")}
                  </s>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (93)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=itelac52" className="h0-c">
              <span className="im">
                <Dessin id="1a984b0b264a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy Watch7")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("210\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,2")}
                  </b>
                  {t(" (57)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="sparkles" taille={18} />
            </span>
            <h2>
              {t("Beauté & santé")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=beaute&sub=Cheveux&from=accueil">
                {t("Cheveux")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=beaute&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'beaute'}>
            <Link to="/fiche?p=karite" className="h0-c">
              <span className="im">
                <Dessin id="4d520c8a165b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sèche-cheveux Dyson Supersonic")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,0\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (301)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=coco" className="h0-c">
              <span className="im">
                <Dessin id="25ee2829127a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Brosse à dents Oral-B iO Series 9")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,3\u00A0km")}
                </span>
                <span className="p">
                  {t("150\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (118)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=cremevisage" className="h0-c">
              <span className="im">
                <Dessin id="9ae7c3ae964a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sérum The Ordinary Niacinamide 30 ml")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,0\u00A0km")}
                </span>
                <span className="p">
                  {t("12\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (46)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="sofa" taille={18} />
            </span>
            <h2>
              {t("Maison & cuisine")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=maison&sub=Cuisine&from=accueil">
                {t("Cuisine")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=maison&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'maison'}>
            <Link to="/fiche?p=mixeur" className="h0-c">
              <span className="im">
                <Dessin id="6cd10aa8c291" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ninja Blender professionnel 1 200 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("4,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (84)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ventilo" className="h0-c">
              <span className="im">
                <Dessin id="02cc832346b3" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Dyson Purifier Cool TP10")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("3,1\u00A0km")}
                </span>
                <span className="p">
                  {t("450\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,1")}
                  </b>
                  {t(" (48)")}
                </span>
                <span className="dl">
                  {t("+ 1\u00A0100\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=fer" className="h0-c">
              <span className="im">
                <Dessin id="2563d7011b1e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Défroisseur vapeur Philips 3000")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,6\u00A0km")}
                </span>
                <span className="p">
                  {t("65\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,0")}
                  </b>
                  {t(" (39)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=marmite" className="h0-c">
              <span className="im">
                <Dessin id="86c6d76d224e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Airfryer Philips XXL")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,7\u00A0km")}
                </span>
                <span className="p">
                  {t("145\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (22)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <Link to="/diaspora" className="h0-ban dia">
          <span className="wm" aria-hidden="true">
            {t("DIASPORA")}
          </span>
          <span className="bi">
            <Icone nom="globe" taille={22} />
          </span>
          <span className="grow">
            <b>
              {t("Un proche paie pour toi ")}
              <i>
                {t("DIASPORA")}
              </i>
            </b>
            <small>
              {t("Envoie ton panier\u00A0: il paie depuis l’étranger, tu retires au relais.")}
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="shopping-basket" taille={18} />
            </span>
            <h2>
              {t("Supermarché")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=marche&sub=%C3%89picerie&from=accueil">
                {t("Épicerie")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=marche&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'marche'}>
            <Link to="/fiche?p=riz" className="h0-c">
              <span className="im">
                <Dessin id="8a529ed55590" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Riz parfumé Royal Umbrella 25\u00A0kg")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,7\u00A0km")}
                </span>
                <span className="p">
                  {t("22\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (87)")}
                </span>
                <span className="dl">
                  {t("+ 1\u00A0100\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=huile5l" className="h0-c">
              <span className="im">
                <Dessin id="6fbbd05006d1" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Huile d’arachide Lesieur 5 L")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,7\u00A0km")}
                </span>
                <span className="p">
                  {t("12\u00A0500")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (64)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=cafe" className="h0-c">
              <span className="im">
                <Dessin id="23c68d9299ea" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Capsules Nespresso Vertuo, coffret 50")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("5,9\u00A0km")}
                </span>
                <span className="p">
                  {t("28\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (52)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <FluxPourVous />
        </Ecran>
      )
    case "accueil?st=lent":
      return (
        <Ecran route="accueil" pied={false} parEtat gabarit="catalogue" droite={<ColonneDroiteAccueil />} avant={
          <>
            <Styles id="57f763a2e1" />
            <Styles id="1c3d953197" />
          </>
        } fixes={
          <>
            <Deplace vers={{ tab: 'acc-tete', pc: 'acc-colis' }}>
            <div className="h0-float">
              <Link to="/commandes" className="fi" aria-label="Mes commandes">
                <Icone nom="package" taille={22} />
              </Link>
              <Link to="/commandes" className="ft">
                <b>
                  {t("3 colis t’attendent au relais")}
                </b>
                <small>
                  <span>
                    {t("Mvog-Ada")}
                  </span>
                  {t(" · ")}
                  <span>
                    {t("Ouvert jusqu’à 19\u00A0h")}
                  </span>
                </small>
              </Link>
              <Link to="/code?ref=BLV-52018" className="fc">
                <Icone nom="qr-code" taille={16} />
                {t("Mon code")}
              </Link>
            </div>
            </Deplace>
            <a href="#" className="h0-up" data-act="top" aria-label="Revenir en haut">
              <Icone nom="arrow-up" taille={20} />
            </a>
          </>
        }>
        <Link to="/reseau?st=eco" className="cl04-slow">
          <Icone nom="signal" taille={18} />
          <span>
            {t("Connexion lente\u00A0: les rangées se chargent au fil du défilement, avec des images réduites. ")}
            <u>
              {t("Réglages")}
            </u>
          </span>
        </Link>
        <TeteAccueil />
        <MomentAccueil />
        <CarrouselAccueil />
        <CategoriesAccueil />
        <Deplace vers={{ pc: 'acc-flash' }}>
        <Module ff="FF-FLASH">
        <section className="h0-panel h0-flash">
          <div className="cir">
            <Link to="/ventes-flash" className="lbl">
              <b>
                <Icone nom="zap" taille={16} style={{ "fill": "currentColor" }} />
                {t(contenu.flash.titre)}
              </b>
              <CompteARebours secondes={35100} />
              <span className="nt">
                {t(contenu.flash.sousTitre)}
              </span>
              <span className="all">
                {t("Tout voir")}
                <Icone nom="arrow-right" taille={13} />
              </span>
            </Link>
            <FlashAccueil>
            <Link to="/ventes-flash?offre=cartable">
              <span className="ph">
                <span>
                  <Dessin id="bfb8686109b5" />
                </span>
                <i>
                  {t("−13\u00A0%")}
                </i>
              </span>
              <b>
                {t("Tablette enfant Amazon Fire HD 10 Kids")}
              </b>
              <em>
                {t("105\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/ventes-flash?offre=portebebe">
              <span className="ph">
                <span>
                  <Dessin id="ada19db4961b" />
                </span>
                <i>
                  {t("−12\u00A0%")}
                </i>
              </span>
              <b>
                {t("Poussette Cybex Priam")}
              </b>
              <em>
                {t("686\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/ventes-flash?offre=chargeur33">
              <span className="ph">
                <span>
                  <Dessin id="dc530be6c1cd" />
                </span>
                <i>
                  {t("−15\u00A0%")}
                </i>
              </span>
              <b>
                {t("Chargeur Apple MagSafe 25 W")}
              </b>
              <em>
                {t("29\u00A0600\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=baskets">
              <span className="ph">
                <span>
                  <Dessin id="032cafed79c8" />
                </span>
                <i>
                  {t("−14\u00A0%")}
                </i>
              </span>
              <b>
                {t("Nike Air Max Dn")}
              </b>
              <em>
                {t("120\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=galaxya15">
              <span className="ph">
                <span>
                  <Dessin id="96013188e842" />
                </span>
                <i>
                  {t("−10\u00A0%")}
                </i>
              </span>
              <b>
                {t("Samsung Galaxy S25 Ultra")}
              </b>
              <em>
                {t("890\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=montre">
              <span className="ph">
                <span>
                  <Dessin id="465a7de86fd7" />
                </span>
                <i>
                  {t("−8\u00A0%")}
                </i>
              </span>
              <b>
                {t("Montre Garmin Fenix 8")}
              </b>
              <em>
                {t("690\u00A0000\u00A0F")}
              </em>
            </Link>
            </FlashAccueil>
          </div>
        </section>
        </Module>
        </Deplace>
        <section className="cl04-panel">
          <div className="sec bar cl04-ph">
            <div className="grow">
              <h2>
                {lieu.r("À la une · près de ton relais")}
              </h2>
              <p>
                {t("Chargement…")}
              </p>
            </div>
          </div>
          <div className="hrow">
            <span className="cl04-sk" style={{ "flex": "0 0 150px" }}>
              <i className="im"></i>
              <i style={{ "height": "12px", "margin": "12px 11px 0", "width": "80%" }}></i>
              <i style={{ "height": "12px", "margin": "8px 11px 0", "width": "55%" }}></i>
              <i style={{ "height": "16px", "margin": "10px 11px 14px", "width": "45%" }}></i>
            </span>
            <span className="cl04-sk" style={{ "flex": "0 0 150px" }}>
              <i className="im"></i>
              <i style={{ "height": "12px", "margin": "12px 11px 0", "width": "80%" }}></i>
              <i style={{ "height": "12px", "margin": "8px 11px 0", "width": "55%" }}></i>
              <i style={{ "height": "16px", "margin": "10px 11px 14px", "width": "45%" }}></i>
            </span>
            <span className="cl04-sk" style={{ "flex": "0 0 150px" }}>
              <i className="im"></i>
              <i style={{ "height": "12px", "margin": "12px 11px 0", "width": "80%" }}></i>
              <i style={{ "height": "12px", "margin": "8px 11px 0", "width": "55%" }}></i>
              <i style={{ "height": "16px", "margin": "10px 11px 14px", "width": "45%" }}></i>
            </span>
          </div>
        </section>
        <section className="cl04-panel">
          <div className="sec bar cl04-ph">
            <div className="grow">
              <h2>
                {t("Récemment consultés")}
              </h2>
              <p>
                {t("Chargement…")}
              </p>
            </div>
          </div>
          <div className="hrow">
            <span className="cl04-sk" style={{ "flex": "0 0 150px" }}>
              <i className="im"></i>
              <i style={{ "height": "12px", "margin": "12px 11px 0", "width": "80%" }}></i>
              <i style={{ "height": "12px", "margin": "8px 11px 0", "width": "55%" }}></i>
              <i style={{ "height": "16px", "margin": "10px 11px 14px", "width": "45%" }}></i>
            </span>
            <span className="cl04-sk" style={{ "flex": "0 0 150px" }}>
              <i className="im"></i>
              <i style={{ "height": "12px", "margin": "12px 11px 0", "width": "80%" }}></i>
              <i style={{ "height": "12px", "margin": "8px 11px 0", "width": "55%" }}></i>
              <i style={{ "height": "16px", "margin": "10px 11px 14px", "width": "45%" }}></i>
            </span>
            <span className="cl04-sk" style={{ "flex": "0 0 150px" }}>
              <i className="im"></i>
              <i style={{ "height": "12px", "margin": "12px 11px 0", "width": "80%" }}></i>
              <i style={{ "height": "12px", "margin": "8px 11px 0", "width": "55%" }}></i>
              <i style={{ "height": "16px", "margin": "10px 11px 14px", "width": "45%" }}></i>
            </span>
          </div>
        </section>
        </Ecran>
      )
    case "accueil?pop=profil":
      return (
        <Ecran route="accueil" pied={false} parEtat gabarit="catalogue" droite={<ColonneDroiteAccueil />} avant={
          <>
            <Styles id="57f763a2e1" />
            <Styles id="1c3d953197" />
          </>
        } fixes={
          <>
            <Deplace vers={{ tab: 'acc-tete', pc: 'acc-colis' }}>
            <div className="h0-float">
              <Link to="/commandes" className="fi" aria-label="Mes commandes">
                <Icone nom="package" taille={22} />
              </Link>
              <Link to="/commandes" className="ft">
                <b>
                  {t("3 colis t’attendent au relais")}
                </b>
                <small>
                  <span>
                    {t("Mvog-Ada")}
                  </span>
                  {t(" · ")}
                  <span>
                    {t("Ouvert jusqu’à 19\u00A0h")}
                  </span>
                </small>
              </Link>
              <Link to="/code?ref=BLV-52018" className="fc">
                <Icone nom="qr-code" taille={16} />
                {t("Mon code")}
              </Link>
            </div>
            </Deplace>
            <a href="#" className="h0-up" data-act="top" aria-label="Revenir en haut">
              <Icone nom="arrow-up" taille={20} />
            </a>
          </>
        }>
        <TeteAccueil />
        <MomentAccueil />
        <CarrouselAccueil />
        <CategoriesAccueil />
        <Deplace vers={{ pc: 'acc-flash' }}>
        <Module ff="FF-FLASH">
        <section className="h0-panel h0-flash">
          <div className="cir">
            <Link to="/ventes-flash" className="lbl">
              <b>
                <Icone nom="zap" taille={16} style={{ "fill": "currentColor" }} />
                {t(contenu.flash.titre)}
              </b>
              <CompteARebours secondes={35100} />
              <span className="nt">
                {t(contenu.flash.sousTitre)}
              </span>
              <span className="all">
                {t("Tout voir")}
                <Icone nom="arrow-right" taille={13} />
              </span>
            </Link>
            <FlashAccueil>
            <Link to="/ventes-flash?offre=cartable">
              <span className="ph">
                <span>
                  <Dessin id="bfb8686109b5" />
                </span>
                <i>
                  {t("−13\u00A0%")}
                </i>
              </span>
              <b>
                {t("Tablette enfant Amazon Fire HD 10 Kids")}
              </b>
              <em>
                {t("105\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/ventes-flash?offre=portebebe">
              <span className="ph">
                <span>
                  <Dessin id="ada19db4961b" />
                </span>
                <i>
                  {t("−12\u00A0%")}
                </i>
              </span>
              <b>
                {t("Poussette Cybex Priam")}
              </b>
              <em>
                {t("686\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/ventes-flash?offre=chargeur33">
              <span className="ph">
                <span>
                  <Dessin id="dc530be6c1cd" />
                </span>
                <i>
                  {t("−15\u00A0%")}
                </i>
              </span>
              <b>
                {t("Chargeur Apple MagSafe 25 W")}
              </b>
              <em>
                {t("29\u00A0600\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=baskets">
              <span className="ph">
                <span>
                  <Dessin id="032cafed79c8" />
                </span>
                <i>
                  {t("−14\u00A0%")}
                </i>
              </span>
              <b>
                {t("Nike Air Max Dn")}
              </b>
              <em>
                {t("120\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=galaxya15">
              <span className="ph">
                <span>
                  <Dessin id="96013188e842" />
                </span>
                <i>
                  {t("−10\u00A0%")}
                </i>
              </span>
              <b>
                {t("Samsung Galaxy S25 Ultra")}
              </b>
              <em>
                {t("890\u00A0000\u00A0F")}
              </em>
            </Link>
            <Link to="/fiche?p=montre">
              <span className="ph">
                <span>
                  <Dessin id="465a7de86fd7" />
                </span>
                <i>
                  {t("−8\u00A0%")}
                </i>
              </span>
              <b>
                {t("Montre Garmin Fenix 8")}
              </b>
              <em>
                {t("690\u00A0000\u00A0F")}
              </em>
            </Link>
            </FlashAccueil>
          </div>
        </section>
        </Module>
        </Deplace>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="star" taille={18} />
            </span>
            <h2>
              {t("À la une")}
            </h2>
            <span className="h0t">
              {lieu.r("Près de ton relais")}
            </span>
            <span className="sp"></span>
            <Link to="/liste?tri=proche&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <ALaUneAccueil>
            <Link to="/fiche?p=pagne" className="h0-c plain">
              <span className="im">
                <Dessin id="adff434c44d0" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Pagne Vlisco Super Wax 6 yards · motif soleil")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,5\u00A0km")}
                </span>
                <span className="p">
                  {t("42\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=chargeur33" className="h0-c plain">
              <span className="im">
                <Dessin id="d86ad7218c7b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Chargeur Apple MagSafe 25 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,6\u00A0km")}
                </span>
                <span className="p">
                  {t("35\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ensemblewax" className="h0-c plain">
              <span className="im">
                <Dessin id="133b889e63e7" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ensemble Vlisco Super Wax 3 pièces")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("75\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=saccuir" className="h0-c plain">
              <span className="im">
                <Dessin id="63612bb6f86f" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sac Michael Kors Jet Set")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("185\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ecouteurs" className="h0-c plain">
              <span className="im">
                <Dessin id="8bfb5146603e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("AirPods 4 réduction de bruit")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=itelac52" className="h0-c plain">
              <span className="im">
                <Dessin id="1a984b0b264a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy Watch7")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("210\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=sandales" className="h0-c plain">
              <span className="im">
                <Dessin id="46807d04a705" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Nike Air Force 1 ’07")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("85\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=karite" className="h0-c plain">
              <span className="im">
                <Dessin id="4d520c8a165b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sèche-cheveux Dyson Supersonic")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,0\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </ALaUneAccueil>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="eye" taille={18} />
            </span>
            <h2>
              {t("Récemment consultés")}
            </h2>
            <span className="sp"></span>
          </div>
          <div className="h0-row">
            <Link to="/fiche?p=sandales" className="h0-c">
              <span className="im">
                <Dessin id="46807d04a705" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Nike Air Force 1 ’07")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("85\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (73)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=robewax" className="h0-c">
              <span className="im">
                <Dessin id="0e10b70ce5b2" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Robe longue en wax, coupe moderne")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,4\u00A0km")}
                </span>
                <span className="p">
                  {t("55\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (58)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ensemblewax" className="h0-c">
              <span className="im">
                <Dessin id="133b889e63e7" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ensemble Vlisco Super Wax 3 pièces")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("75\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (64)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=montre" className="h0-c">
              <span className="im">
                <Dessin id="e5c0e2fb6ad6" />
                <span className="off">
                  {t("−8\u00A0%")}
                </span>
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr on" aria-label="Favori">
                  <Icone nom="heart" taille={15} style={{ "fill": "currentColor" }} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Montre Garmin Fenix 8")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,2\u00A0km")}
                </span>
                <span className="p">
                  {t("690\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                  <s>
                    {t("750\u00A0000\u00A0F")}
                  </s>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (29)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=saccuir" className="h0-c">
              <span className="im">
                <Dessin id="63612bb6f86f" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sac Michael Kors Jet Set")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("185\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (41)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
          </div>
        </section>
        <Link to="/promotions" className="h0-ban promo">
          <span className="wm" aria-hidden="true">
            {t("PROMO FLASH")}
          </span>
          <span className="bi">
            <Icone nom="flame" taille={24} />
          </span>
          <span className="grow">
            <b>
              {t("6 promos jusqu’à −15\u00A0%")}
            </b>
            <small>
              <Icone nom="clock" taille={13} />
              {t(" Fin dans ")}
              <CompteARebours secondes={35100} />
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        <Deplace vers={{ tab: 'acc-tri' }}>
        <div className="h0-sort">
          {t("Trier\u00A0:")}
          <Link to="/liste?from=accueil">
            {t("Pertinence")}
            <Icone nom="chevron-down" taille={15} />
          </Link>
        </div>
        </Deplace>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="flame" taille={18} />
            </span>
            <h2>
              {t("Produits populaires")}
            </h2>
            <span className="sp"></span>
            <CibleDes des="tab" nom="acc-tri" classe="acc-tri" />
            <Link to="/liste?from=accueil" className="va">
              {t("Voir plus")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-g3">
            <RangeeSponsorisee cat={null}>
            <Link to="/fiche?p=karite" className="h0-c">
              <span className="im">
                <Dessin id="4d520c8a165b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sèche-cheveux Dyson Supersonic")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,0\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (301)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=chargeur33" className="h0-c">
              <span className="im">
                <Dessin id="d86ad7218c7b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Chargeur Apple MagSafe 25 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,6\u00A0km")}
                </span>
                <span className="p">
                  {t("35\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (175)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ecouteurs" className="h0-c">
              <span className="im">
                <Dessin id="8bfb5146603e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("AirPods 4 réduction de bruit")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (211)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=pagne" className="h0-c">
              <span className="im">
                <Dessin id="adff434c44d0" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Pagne Vlisco Super Wax 6 yards · motif soleil")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,5\u00A0km")}
                </span>
                <span className="p">
                  {t("42\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (152)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=coco" className="h0-c">
              <span className="im">
                <Dessin id="25ee2829127a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Brosse à dents Oral-B iO Series 9")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,3\u00A0km")}
                </span>
                <span className="p">
                  {t("150\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (118)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=camon30" className="h0-c">
              <span className="im">
                <Dessin id="8bf046203afd" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPhone 16 Pro Max")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  <small>
                    {t("dès ")}
                  </small>
                  {t("950\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (128)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <Module ff="FF-ABONNEMENT">
        <Link to="/abonnements" className="h0-ban prem">
          <span className="wm" aria-hidden="true">
            {t("PREMIUM")}
          </span>
          <span className="bi">
            <Icone nom="gem" taille={22} />
          </span>
          <span className="grow">
            <b>
              {t("BelivaY Premium ")}
              <i>
                {t("SPONSO")}
              </i>
            </b>
            <small>
              {t("Retrait offert dès 10\u00A0000\u00A0F · jours de garde en plus")}
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        </Module>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="sparkles" taille={18} />
            </span>
            <h2>
              {t("Nouveaux Arrivages")}
            </h2>
            <span className="sp"></span>
            <Link to="/liste?from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <Link to="/liste?from=accueil" className="h0-newb" aria-label="Nouveautés">
            <span>
              <b>
                {t("Tout juste arrivés")}
              </b>
              <small>
                {lieu.r("Les derniers produits publiés, retirables à ton relais")}
              </small>
            </span>
          </Link>
          <div className="h0-row">
            <VitrineAccueil rangee="nouveautes">
            <Link to="/fiche?p=tapisyoga" className="h0-c">
              <span className="im">
                <Dessin id="bc2a56f65d01" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Casque Meta Quest 3")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("4,1\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,2")}
                  </b>
                  {t(" (18)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=tablette8" className="h0-c">
              <span className="im">
                <Dessin id="6d95c1664bef" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPad Pro M4 11″")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  {t("820\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (21)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=portebebe" className="h0-c">
              <span className="im">
                <Dessin id="2b87fb3289d9" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Poussette Cybex Priam")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,9\u00A0km")}
                </span>
                <span className="p">
                  {t("780\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (27)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=marmite" className="h0-c">
              <span className="im">
                <Dessin id="86c6d76d224e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Airfryer Philips XXL")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,7\u00A0km")}
                </span>
                <span className="p">
                  {t("145\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (22)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=montre" className="h0-c">
              <span className="im">
                <Dessin id="e5c0e2fb6ad6" />
                <span className="off">
                  {t("−8\u00A0%")}
                </span>
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr on" aria-label="Favori">
                  <Icone nom="heart" taille={15} style={{ "fill": "currentColor" }} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Montre Garmin Fenix 8")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,2\u00A0km")}
                </span>
                <span className="p">
                  {t("690\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                  <s>
                    {t("750\u00A0000\u00A0F")}
                  </s>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (29)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </VitrineAccueil>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="shirt" taille={18} />
            </span>
            <h2>
              {t("Mode femme")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=femme&sub=Pagnes%20%26%20wax&from=accueil">
                {t("Pagnes & wax")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=femme&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'femme'}>
            <Link to="/fiche?p=pagne" className="h0-c">
              <span className="im">
                <Dessin id="adff434c44d0" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Pagne Vlisco Super Wax 6 yards · motif soleil")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,5\u00A0km")}
                </span>
                <span className="p">
                  {t("42\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (152)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ensemblewax" className="h0-c">
              <span className="im">
                <Dessin id="133b889e63e7" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ensemble Vlisco Super Wax 3 pièces")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("75\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (64)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=robewax" className="h0-c">
              <span className="im">
                <Dessin id="0e10b70ce5b2" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Robe longue en wax, coupe moderne")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,4\u00A0km")}
                </span>
                <span className="p">
                  {t("55\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (58)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=saccuir" className="h0-c">
              <span className="im">
                <Dessin id="63612bb6f86f" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sac Michael Kors Jet Set")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,7\u00A0km")}
                </span>
                <span className="p">
                  {t("185\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (41)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <Link to="/selection" className="h0-ban sel">
          <span className="wm" aria-hidden="true">
            {t("CURATED")}
          </span>
          <span className="bi">
            <Icone nom="star" taille={22} style={{ "fill": "currentColor" }} />
          </span>
          <span className="grow">
            <b>
              {t("Sélection Premium ")}
              <i>
                {t("CURATED")}
              </i>
            </b>
            <small>
              {t("Sélection Premium · Produits triés sur le volet")}
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="headphones" taille={18} />
            </span>
            <h2>
              {t("Électronique")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=elec&sub=Audio&from=accueil">
                {t("Audio")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=elec&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'elec'}>
            <Link to="/fiche?p=ecouteurs" className="h0-c">
              <span className="im">
                <Dessin id="8bfb5146603e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("AirPods 4 réduction de bruit")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (211)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=batterie" className="h0-c">
              <span className="im">
                <Dessin id="c746cb3b6c6e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Anker Prime 20\u00A0000 mAh 200 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,9\u00A0km")}
                </span>
                <span className="p">
                  {t("70\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (66)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=tv43" className="h0-c">
              <span className="im">
                <Dessin id="330d95174f5e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Neo QLED 4K 55″")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("5,2\u00A0km")}
                </span>
                <span className="p">
                  {t("750\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (31)")}
                </span>
                <span className="dl">
                  <Icone nom="truck" taille={12} style={{ "verticalAlign": "-2px" }} />
                  {t(" À domicile")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="smartphone" taille={18} />
            </span>
            <h2>
              {t("Téléphones & tablettes")}
            </h2>
            <span className="sp"></span>
            <Link to="/liste?cat=tel&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'tel'}>
            <Link to="/fiche?p=chargeur33" className="h0-c">
              <span className="im">
                <Dessin id="d86ad7218c7b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Chargeur Apple MagSafe 25 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,6\u00A0km")}
                </span>
                <span className="p">
                  {t("35\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (175)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=camon30" className="h0-c">
              <span className="im">
                <Dessin id="8bf046203afd" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPhone 16 Pro Max")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  <small>
                    {t("dès ")}
                  </small>
                  {t("950\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (128)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=tablette8" className="h0-c">
              <span className="im">
                <Dessin id="6d95c1664bef" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("iPad Pro M4 11″")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,2\u00A0km")}
                </span>
                <span className="p">
                  {t("820\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (21)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=galaxya15" className="h0-c">
              <span className="im">
                <Dessin id="20344e766a88" />
                <span className="off">
                  {t("−10\u00A0%")}
                </span>
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy S25 Ultra")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,4\u00A0km")}
                </span>
                <span className="p">
                  {t("890\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                  <s>
                    {t("989\u00A0000\u00A0F")}
                  </s>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (93)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=itelac52" className="h0-c">
              <span className="im">
                <Dessin id="1a984b0b264a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Samsung Galaxy Watch7")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("0,9\u00A0km")}
                </span>
                <span className="p">
                  {t("210\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,2")}
                  </b>
                  {t(" (57)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="sparkles" taille={18} />
            </span>
            <h2>
              {t("Beauté & santé")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=beaute&sub=Cheveux&from=accueil">
                {t("Cheveux")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=beaute&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'beaute'}>
            <Link to="/fiche?p=karite" className="h0-c">
              <span className="im">
                <Dessin id="4d520c8a165b" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sèche-cheveux Dyson Supersonic")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,0\u00A0km")}
                </span>
                <span className="p">
                  {t("420\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,8")}
                  </b>
                  {t(" (301)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=coco" className="h0-c">
              <span className="im">
                <Dessin id="25ee2829127a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Brosse à dents Oral-B iO Series 9")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,3\u00A0km")}
                </span>
                <span className="p">
                  {t("150\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (118)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=cremevisage" className="h0-c">
              <span className="im">
                <Dessin id="9ae7c3ae964a" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Sérum The Ordinary Niacinamide 30 ml")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,0\u00A0km")}
                </span>
                <span className="p">
                  {t("12\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,4")}
                  </b>
                  {t(" (46)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="sofa" taille={18} />
            </span>
            <h2>
              {t("Maison & cuisine")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=maison&sub=Cuisine&from=accueil">
                {t("Cuisine")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=maison&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'maison'}>
            <Link to="/fiche?p=mixeur" className="h0-c">
              <span className="im">
                <Dessin id="6cd10aa8c291" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Ninja Blender professionnel 1 200 W")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("4,8\u00A0km")}
                </span>
                <span className="p">
                  {t("120\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,3")}
                  </b>
                  {t(" (84)")}
                </span>
                <span className="dl free">
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=ventilo" className="h0-c">
              <span className="im">
                <Dessin id="02cc832346b3" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Dyson Purifier Cool TP10")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("3,1\u00A0km")}
                </span>
                <span className="p">
                  {t("450\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,1")}
                  </b>
                  {t(" (48)")}
                </span>
                <span className="dl">
                  {t("+ 1\u00A0100\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=fer" className="h0-c">
              <span className="im">
                <Dessin id="2563d7011b1e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Défroisseur vapeur Philips 3000")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,6\u00A0km")}
                </span>
                <span className="p">
                  {t("65\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,0")}
                  </b>
                  {t(" (39)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=marmite" className="h0-c">
              <span className="im">
                <Dessin id="86c6d76d224e" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Airfryer Philips XXL")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("2,7\u00A0km")}
                </span>
                <span className="p">
                  {t("145\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (22)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <Link to="/diaspora" className="h0-ban dia">
          <span className="wm" aria-hidden="true">
            {t("DIASPORA")}
          </span>
          <span className="bi">
            <Icone nom="globe" taille={22} />
          </span>
          <span className="grow">
            <b>
              {t("Un proche paie pour toi ")}
              <i>
                {t("DIASPORA")}
              </i>
            </b>
            <small>
              {t("Envoie ton panier\u00A0: il paie depuis l’étranger, tu retires au relais.")}
            </small>
          </span>
          <Icone nom="chevron-right" taille={20} />
        </Link>
        <section className="h0-panel">
          <div className="h0-hd">
            <span className="hi">
              <Icone nom="shopping-basket" taille={18} />
            </span>
            <h2>
              {t("Supermarché")}
            </h2>
            <span className="h0t">
              <Link to="/liste?cat=marche&sub=%C3%89picerie&from=accueil">
                {t("Épicerie")}
              </Link>
            </span>
            <span className="sp"></span>
            <Link to="/liste?cat=marche&from=accueil" className="va">
              {t("Tout voir")}
              <Icone nom="arrow-right" taille={14} />
            </Link>
          </div>
          <div className="h0-row">
            <RangeeSponsorisee cat={'marche'}>
            <Link to="/fiche?p=riz" className="h0-c">
              <span className="im">
                <Dessin id="8a529ed55590" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Riz parfumé Royal Umbrella 25\u00A0kg")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,7\u00A0km")}
                </span>
                <span className="p">
                  {t("22\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,5")}
                  </b>
                  {t(" (87)")}
                </span>
                <span className="dl">
                  {t("+ 1\u00A0100\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=huile5l" className="h0-c">
              <span className="im">
                <Dessin id="6fbbd05006d1" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Huile d’arachide Lesieur 5 L")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("1,7\u00A0km")}
                </span>
                <span className="p">
                  {t("12\u00A0500")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,6")}
                  </b>
                  {t(" (64)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            <Link to="/fiche?p=cafe" className="h0-c">
              <span className="im">
                <Dessin id="23c68d9299ea" />
                <span className="ck" aria-label="Vendeur vérifié">
                  <Icone nom="check" taille={12} trait={3.2} />
                </span>
                <span className="hr" aria-label="Favori">
                  <Icone nom="heart" taille={15} />
                </span>
              </span>
              <span className="bd">
                <span className="t">
                  {t("Capsules Nespresso Vertuo, coffret 50")}
                </span>
                <span className="m">
                  <Icone nom="map-pin" taille={12} />
                  {t("5,9\u00A0km")}
                </span>
                <span className="p">
                  {t("28\u00A0000")}
                  <small>
                    {t(" F")}
                  </small>
                </span>
                <span className="r">
                  <Icone nom="star" taille={12} style={{ "fill": "currentColor" }} />
                  <b>
                    {t("4,7")}
                  </b>
                  {t(" (52)")}
                </span>
                <span className="dl">
                  {t("+ 900\u00A0F retrait")}
                </span>
              </span>
              <span className="add">
                <Icone nom="plus" taille={14} trait={2.8} />
                {t("Panier")}
              </span>
            </Link>
            </RangeeSponsorisee>
          </div>
        </section>
        <FluxPourVous />
        </Ecran>
      )
  }
}
