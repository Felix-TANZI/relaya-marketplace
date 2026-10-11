// Page provisoire « Saisie assistée » (VD-03) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function SaisieAssistee() {
  const { t } = usePreferences()
  switch (useEtat("saisie_assistee")) {
    default:
      return (
        <Ecran route="saisie_assistee" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("6 produits saisis pour vous")}
            </h1>
            <p className="pg-s">
              {t("Par Aïssatou B., agent BelivaY de la zone Z4, chez vous le 20 sept. Rien n’est publié sans votre accord.")}
            </p>
          </div>
          <div className="divider-t">
            {t("Prêts · 4")}
          </div>
          <div className="card" style={{ "paddingTop": "12px" }}>
            <span className="pill green">
              <Icone nom="check" taille={13} />
              {t("4 contrôles sur 4 réussis")}
            </span>
            <div className="mt4">
              <div className="li">
                <span className="thumb" style={{ "width": "44px", "height": "44px", "borderRadius": "11px" }}>
                  <Dessin id="e19e0067bfb4" />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Écouteurs filaires · jack 3,5\u00A0mm")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("2\u00A0500\u00A0F · stock 15")}
                  </span>
                </span>
                <button type="button" className="ibtn" aria-label="Modifier" style={{ "width": "44px", "height": "44px", "color": "var(--ink-3)" }}>
                  <Icone nom="pencil" taille={18} />
                </button>
              </div>
              <div className="li">
                <span className="thumb" style={{ "width": "44px", "height": "44px", "borderRadius": "11px" }}>
                  <Dessin id="cc69e52511a8" />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Chargeur 10 W · micro-USB")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("1\u00A0500\u00A0F · stock 12")}
                  </span>
                </span>
                <button type="button" className="ibtn" aria-label="Modifier" style={{ "width": "44px", "height": "44px", "color": "var(--ink-3)" }}>
                  <Icone nom="pencil" taille={18} />
                </button>
              </div>
              <div className="li">
                <span className="thumb" style={{ "width": "44px", "height": "44px", "borderRadius": "11px" }}>
                  <Dessin id="7ee030bf450d" />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Coque ITEL A70 · transparente")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("1\u00A0500\u00A0F · stock 18")}
                  </span>
                </span>
                <button type="button" className="ibtn" aria-label="Modifier" style={{ "width": "44px", "height": "44px", "color": "var(--ink-3)" }}>
                  <Icone nom="pencil" taille={18} />
                </button>
              </div>
              <div className="li">
                <span className="thumb" style={{ "width": "44px", "height": "44px", "borderRadius": "11px" }}>
                  <Dessin id="e19e0067bfb4" />
                </span>
                <span className="grow">
                  <span className="lt" style={{ "display": "block" }}>
                    {t("Écouteurs Bluetooth · boîtier")}
                  </span>
                  <span className="ls" style={{ "display": "block" }}>
                    {t("6\u00A0000\u00A0F · stock 6")}
                  </span>
                </span>
                <button type="button" className="ibtn" aria-label="Modifier" style={{ "width": "44px", "height": "44px", "color": "var(--ink-3)" }}>
                  <Icone nom="pencil" taille={18} />
                </button>
              </div>
            </div>
            <div className="mt8">
              <Link to="/produits" className="btn primary">
                <Icone nom="check" taille={18} />
                <span>
                  {t("Valider les 4 produits prêts")}
                </span>
              </Link>
            </div>
          </div>
          <div className="divider-t">
            {t("À vérifier · 1")}
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="69a52217ca4e" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "15.5px" }}>
                  {t("Chargeur rapide 18 W · USB-C")}
                </div>
                <div className="av">
                  {t("2\u00A0500\u00A0F · stock 10 · 3 photos")}
                </div>
              </div>
            </div>
            <div className="meta">
              <span className="pill amber">
                <Icone nom="triangle-alert" taille={12} />
                {t("Prix")}
              </span>
              <span className="pill green">
                <Icone nom="check" taille={12} />
                {t("Photo, doublon, description")}
              </span>
            </div>
            <div className="note amber">
              <Icone nom="triangle-alert" taille={18} />
              <div>
                {t("Prix 38\u00A0% sous le marché (3\u00A0500 – 4\u00A0500\u00A0F). Vérifiez avant de valider.")}
              </div>
            </div>
            <div className="btns">
              <button type="button" className="btn soft">
                <Icone nom="check" taille={18} />
                <span>
                  {t("Valider")}
                </span>
              </button>
              <button type="button" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="pencil" taille={18} />
                <span>
                  {t("Modifier")}
                </span>
              </button>
            </div>
          </div>
          <div className="divider-t">
            {t("Doublon · 1")}
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0" }}>
              <span className="thumb" style={{ "width": "56px", "height": "56px", "borderRadius": "14px" }}>
                <Dessin id="9c7844db694a" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "15.5px" }}>
                  {t("Coque ITEL AC52 · silicone")}
                </div>
                <div className="av">
                  {t("2\u00A0000\u00A0F · stock 20 · 3 photos")}
                </div>
              </div>
            </div>
            <div className="meta">
              <span className="pill green">
                <Icone nom="check" taille={12} />
                {t("Photo")}
              </span>
              <span className="pill ink">
                <Icone nom="link" taille={13} />
                {t("Rattachée à la fiche existante")}
              </span>
            </div>
            <div className="btns">
              <button type="button" className="btn soft">
                <Icone nom="check" taille={18} />
                <span>
                  {t("Valider")}
                </span>
              </button>
              <button type="button" style={{ "height": "44px" }} className="btn secondary">
                <Icone nom="pencil" taille={18} />
                <span>
                  {t("Modifier")}
                </span>
              </button>
            </div>
          </div>
          <details className="more">
            <summary>
              <Icone nom="info" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Comment ça marche")}
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <p>
                {t("Un agent BelivaY de votre zone photographie vos produits chez vous. Il note le prix et le stock.")}
              </p>
              <p>
                {t("Avant publication, quatre contrôles\u00A0: photo, doublon, prix anormal, description copiée.")}
              </p>
              <p>
                {t("Vous validez ou modifiez chaque produit. Rien n’est publié sans vous, et les produits restent les vôtres.")}
              </p>
              <p>
                {t("Gratuit pour les premières boutiques, puis 5\u00A0000\u00A0F la session.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
  }
}
