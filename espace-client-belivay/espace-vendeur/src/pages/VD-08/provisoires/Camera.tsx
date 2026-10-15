// Page provisoire « Caméra » (VD-08) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (3 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Camera() {
  const { t } = usePreferences()
  switch (useEtat("camera")) {
    case "camera?mode=scan":
    default:
      return (
        <Ecran route="camera" parEtat avant={
          <>
          <div className="cam">
            <Dessin id="66438b76c5b7" />
          </div>
          <div style={{ "position": "absolute", "inset": "0", "zIndex": "6" }}>
            <div style={{ "position": "absolute", "left": "50%", "top": "300px", "transform": "translateX(-50%)", "width": "270px", "height": "170px", "borderRadius": "22px", "boxShadow": "0 0 0 2000px rgba(0,0,0,.45)", "border": "3px solid var(--gold-l)" }}></div>
            <div style={{ "position": "absolute", "left": "70px", "right": "70px", "top": "384px", "height": "2px", "background": "var(--or)", "boxShadow": "0 0 12px 2px var(--or)" }}></div>
            <div style={{ "position": "absolute", "left": "24px", "right": "24px", "top": "596px", "textAlign": "center", "color": "#fff", "background": "rgba(0,0,0,.55)", "borderRadius": "16px", "padding": "10px 14px" }}>
              <div className="b8 t17">
                {t("Visez le code-barres de la boîte")}
              </div>
              <div className="t13 mt4" style={{ "color": "rgba(255,255,255,.85)" }}>
                {t("Le produit et sa catégorie se remplissent seuls")}
              </div>
            </div>
          </div>
          <div style={{ "position": "absolute", "top": "58px", "left": "14px", "right": "14px", "display": "flex", "alignItems": "center", "justifyContent": "space-between", "zIndex": "8" }}>
            <Link to="/offre1" className="ibtn" style={{ "width": "44px", "height": "44px", "background": "rgba(0,0,0,.45)", "color": "#fff", "borderRadius": "50%" }} aria-label="Fermer">
              <Icone nom="x" taille={22} />
            </Link>
            <span className="pill" style={{ "background": "rgba(0,0,0,.5)", "color": "#fff", "border": "1px solid rgba(255,255,255,.2)", "height": "32px", "fontSize": "13px" }}>
              {t("Scanner le code-barres")}
            </span>
            <button type="button" className="ibtn" style={{ "width": "44px", "height": "44px", "background": "rgba(0,0,0,.45)", "color": "#fff", "borderRadius": "50%" }} aria-label="Lampe">
              <Icone nom="flashlight" taille={20} />
            </button>
          </div>
          <div style={{ "position": "absolute", "left": "0", "right": "0", "bottom": "44px", "display": "flex", "alignItems": "center", "justifyContent": "space-around", "zIndex": "8" }}>
            <Link to="/offre1" className="pill" style={{ "background": "rgba(0,0,0,.5)", "color": "#fff", "border": "1px solid rgba(255,255,255,.2)", "height": "44px", "padding": "0 16px", "fontSize": "13.5px" }}>
              <Icone nom="mic" taille={15} />
              {t("Dicter")}
            </Link>
            <span style={{ "width": "74px", "height": "74px", "borderRadius": "50%", "border": "4px solid #fff", "display": "flex", "alignItems": "center", "justifyContent": "center", "color": "#fff" }}>
              <Icone nom="scan-barcode" taille={30} />
            </span>
            <Link to="/offre1" className="pill" style={{ "background": "rgba(0,0,0,.5)", "color": "#fff", "border": "1px solid rgba(255,255,255,.2)", "height": "44px", "padding": "0 16px", "fontSize": "13.5px" }}>
              <Icone nom="search" taille={15} />
              {t("Taper")}
            </Link>
          </div>
          </>
        }>

        </Ecran>
      )
    case "camera?mode=photo":
      return (
        <Ecran route="camera" parEtat avant={
          <>
          <div className="cam">
            <Dessin id="d07eeb6ff990" />
          </div>
          <div style={{ "position": "absolute", "inset": "0", "zIndex": "6" }}>
            <div style={{ "position": "absolute", "left": "44px", "right": "44px", "top": "190px", "height": "440px", "borderRadius": "26px", "border": "2px dashed rgba(255,255,255,.75)" }}></div>
            <div style={{ "position": "absolute", "left": "0", "right": "0", "top": "140px", "textAlign": "center" }}>
              <span className="pill" style={{ "background": "rgba(0,0,0,.5)", "color": "#fff", "border": "1px solid rgba(255,255,255,.2)", "height": "32px", "fontSize": "13px" }}>
                <Icone nom="camera" taille={14} />
                {t("Photo 4 sur 8 · 3 au minimum")}
              </span>
            </div>
            <div style={{ "position": "absolute", "left": "24px", "right": "24px", "top": "642px", "textAlign": "center", "color": "#fff", "background": "rgba(0,0,0,.55)", "borderRadius": "16px", "padding": "10px 14px" }}>
              <div className="t14 b8">
                {t("09\u00A0h\u00A046 · Mvog-Ada")}
              </div>
              <div className="t12 mt4" style={{ "color": "rgba(255,255,255,.85)" }}>
                {t("L’heure et le lieu restent dans la photo")}
              </div>
            </div>
          </div>
          <div style={{ "position": "absolute", "top": "58px", "left": "14px", "right": "14px", "display": "flex", "alignItems": "center", "justifyContent": "space-between", "zIndex": "8" }}>
            <Link to="/offre2" className="ibtn" style={{ "width": "44px", "height": "44px", "background": "rgba(0,0,0,.45)", "color": "#fff", "borderRadius": "50%" }} aria-label="Fermer">
              <Icone nom="x" taille={22} />
            </Link>
            <span className="pill" style={{ "background": "rgba(0,0,0,.5)", "color": "#fff", "border": "1px solid rgba(255,255,255,.2)", "height": "32px", "fontSize": "13px" }}>
              {t("Photo réelle de l’article")}
            </span>
            <button type="button" className="ibtn" style={{ "width": "44px", "height": "44px", "background": "rgba(0,0,0,.45)", "color": "#fff", "borderRadius": "50%" }} aria-label="Lampe">
              <Icone nom="flashlight" taille={20} />
            </button>
          </div>
          <div style={{ "position": "absolute", "left": "0", "right": "0", "bottom": "44px", "display": "flex", "alignItems": "center", "justifyContent": "space-around", "zIndex": "8" }}>
            <Link to="/offre2" aria-label="Voir les photos prises" style={{ "width": "48px", "height": "48px", "borderRadius": "12px", "overflow": "hidden", "border": "2px solid #fff" }}>
              <Dessin id="31d53847e649" />
            </Link>
            <span style={{ "width": "76px", "height": "76px", "borderRadius": "50%", "border": "4px solid #fff", "padding": "4px" }}>
              <span style={{ "display": "block", "width": "100%", "height": "100%", "borderRadius": "50%", "background": "#fff" }}></span>
            </span>
            <Link to="/offre2" className="pill" style={{ "background": "rgba(0,0,0,.5)", "color": "#fff", "border": "1px solid rgba(255,255,255,.2)", "height": "44px", "padding": "0 16px", "fontSize": "13.5px" }}>
              <Icone nom="check" taille={15} />
              {t("Terminé · 3")}
            </Link>
          </div>
          </>
        }>

        </Ecran>
      )
  }
}
