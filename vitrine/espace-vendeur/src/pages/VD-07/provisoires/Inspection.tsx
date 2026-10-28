// Page provisoire « Inspection à la réception » (VD-07) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (3 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Inspection() {
  const { t } = usePreferences()
  switch (useEtat("inspection")) {
    case "inspection?d=conforme":
    default:
      return (
        <Ecran route="inspection" parEtat>
          <div className="pg">
            <div className="pg-k">
              <Icone nom="timer" taille={14} style={{ "verticalAlign": "-2px" }} />
              {t(" Inspectez avant vendredi 16 oct. à ")}
              <span className="nu">
                {t("16\u00A0h")}
              </span>
            </div>
            <h1 className="pg-t">
              {t("Inspection · BLV-00004")}
            </h1>
            <p className="pg-s">
              {t("Passé ce délai, le client est remboursé automatiquement.")}
            </p>
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0" }}>
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="6bbbbc836376" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av" style={{ "fontSize": "13px" }}>
                  {t("Défaut caché · «\u00A0L’écran reste noir après une journée\u00A0»")}
                </div>
              </div>
            </div>
            <div className="mt8">
              <div>
                <div className="kv">
                  <span className="k">
                    {t("Reçu")}
                  </span>
                  <span className="v ">
                    {t("mer. 14 oct., entre 14\u00A0h et 16\u00A0h")}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="divider-t">
            {t("1 · Constatez")}
          </div>
          <div className="card" style={{ "marginTop": "0", "paddingTop": "6px", "paddingBottom": "6px" }}>
            <div className="check">
              <span className="cb on">
                <Icone nom="check" taille={14} trait={3} />
              </span>
              <span className="grow">
                {t("Scellé du retour intact")}
              </span>
            </div>
            <div className="check">
              <span className="cb on">
                <Icone nom="check" taille={14} trait={3} />
              </span>
              <span className="grow">
                {t("C’est bien l’article vendu (numéro de série)")}
              </span>
            </div>
          </div>
          <div className="divider-t">
            {t("2 · Photographiez")}
          </div>
          <div className="card" style={{ "marginTop": "0" }}>
            <div className="photos" style={{ "marginTop": "0" }}>
              <div className="photo">
                <Dessin id="97f264a1205c" />
                <span className="ts">
                  {t("Reçu · 14 oct. 15\u00A0h\u00A002")}
                </span>
              </div>
              <div className="photo">
                <Dessin id="5ad4d4dd2824" />
                <span className="ts">
                  {t("Écran noir · 15\u00A0h\u00A004")}
                </span>
              </div>
              <div className="addph">
                <Icone nom="camera" taille={22} />
                <span>
                  {t("Ajouter")}
                </span>
              </div>
            </div>
            <div className="hint-l">
              <Icone nom="camera" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Deux photos au moins. L’heure et le lieu de la prise sont conservés.")}
              </span>
            </div>
          </div>
          <div className="divider-t">
            {t("3 · Le défaut décrit est-il là\u00A0?")}
          </div>
          <Link to="/inspection?d=conforme" className="radio on">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Oui\u00A0: conforme au motif")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Vous remplacez ou remboursez. Trajet retour de 500\u00A0F à votre charge.")}
              </span>
            </span>
          </Link>
          <Link to="/inspection?d=non" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Non\u00A0: non conforme")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Vos photos partent en médiation. Si vous avez raison, le client paie le trajet.")}
              </span>
            </span>
          </Link>
          <div className="mt16">
            <Link to="/remplacement" className="btn primary">
              <Icone nom="arrow-right" taille={18} />
              <span>
                {t("Continuer\u00A0: remplacer ou rembourser")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
    case "inspection?d=non":
      return (
        <Ecran route="inspection" parEtat>
          <div className="pg">
            <div className="pg-k">
              <Icone nom="timer" taille={14} style={{ "verticalAlign": "-2px" }} />
              {t(" Inspectez avant vendredi 16 oct. à ")}
              <span className="nu">
                {t("16\u00A0h")}
              </span>
            </div>
            <h1 className="pg-t">
              {t("Inspection · BLV-00004")}
            </h1>
            <p className="pg-s">
              {t("Passé ce délai, le client est remboursé automatiquement.")}
            </p>
          </div>
          <div className="card">
            <div className="art" style={{ "marginTop": "0" }}>
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="6bbbbc836376" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("ITEL AC52 · noir")}
                </div>
                <div className="av" style={{ "fontSize": "13px" }}>
                  {t("Défaut caché · «\u00A0L’écran reste noir après une journée\u00A0»")}
                </div>
              </div>
            </div>
            <div className="mt8">
              <div>
                <div className="kv">
                  <span className="k">
                    {t("Reçu")}
                  </span>
                  <span className="v ">
                    {t("mer. 14 oct., entre 14\u00A0h et 16\u00A0h")}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="divider-t">
            {t("1 · Constatez")}
          </div>
          <div className="card" style={{ "marginTop": "0", "paddingTop": "6px", "paddingBottom": "6px" }}>
            <div className="check">
              <span className="cb on">
                <Icone nom="check" taille={14} trait={3} />
              </span>
              <span className="grow">
                {t("Scellé du retour intact")}
              </span>
            </div>
            <div className="check">
              <span className="cb on">
                <Icone nom="check" taille={14} trait={3} />
              </span>
              <span className="grow">
                {t("C’est bien l’article vendu (numéro de série)")}
              </span>
            </div>
          </div>
          <div className="divider-t">
            {t("2 · Photographiez")}
          </div>
          <div className="card" style={{ "marginTop": "0" }}>
            <div className="photos" style={{ "marginTop": "0" }}>
              <div className="photo">
                <Dessin id="97f264a1205c" />
                <span className="ts">
                  {t("Reçu · 14 oct. 15\u00A0h\u00A002")}
                </span>
              </div>
              <div className="photo">
                <Dessin id="5ad4d4dd2824" />
                <span className="ts">
                  {t("Écran noir · 15\u00A0h\u00A004")}
                </span>
              </div>
              <div className="addph">
                <Icone nom="camera" taille={22} />
                <span>
                  {t("Ajouter")}
                </span>
              </div>
            </div>
            <div className="hint-l">
              <Icone nom="camera" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Deux photos au moins. L’heure et le lieu de la prise sont conservés.")}
              </span>
            </div>
          </div>
          <div className="divider-t">
            {t("3 · Le défaut décrit est-il là\u00A0?")}
          </div>
          <Link to="/inspection?d=conforme" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Oui\u00A0: conforme au motif")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Vous remplacez ou remboursez. Trajet retour de 500\u00A0F à votre charge.")}
              </span>
            </span>
          </Link>
          <Link to="/inspection?d=non" className="radio on">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Non\u00A0: non conforme")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Vos photos partent en médiation. Si vous avez raison, le client paie le trajet.")}
              </span>
            </span>
          </Link>
          <div className="mt16">
            <Link to="/litige" className="btn primary">
              <Icone nom="arrow-right" taille={18} />
              <span>
                {t("Envoyer mes preuves en médiation")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
  }
}
