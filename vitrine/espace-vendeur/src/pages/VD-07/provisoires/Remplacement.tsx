// Page provisoire « Proposer un remplacement » (VD-07) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (2 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Remplacement() {
  const { t } = usePreferences()
  switch (useEtat("remplacement")) {
    default:
      return (
        <Ecran route="remplacement" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Remplacer ou rembourser")}
            </h1>
            <p className="pg-s">
              {t("Retour BLV-00004 · défaut confirmé. Choisissez ce que vous proposez au client.")}
            </p>
          </div>
          <Link to="/remplacement" className="radio on">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Proposer un remplacement")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Le client reçoit un ITEL AC52 noir neuf, s’il accepte.")}
              </span>
            </span>
          </Link>
          <Link to="/remplacement?c=rembourser" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Rembourser le client")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Vous ne gardez rien sur cette vente. L’article défectueux vous reste.")}
              </span>
            </span>
          </Link>
          <div className="card">
            <div className="art" style={{ "marginTop": "0" }}>
              <span className="thumb" style={{ "width": "52px", "height": "52px", "borderRadius": "13px" }}>
                <Dessin id="6bbbbc836376" />
              </span>
              <div className="grow">
                <div className="an" style={{ "fontSize": "16px" }}>
                  {t("ITEL AC52 · noir · neuf")}
                </div>
                <div className="mt6">
                  <span className="pill green sm">
                    {t("En stock\u00A0: 3")}
                  </span>
                </div>
              </div>
            </div>
            <div className="hr"></div>
            <div>
              <div className="kv">
                <span className="k">
                  {t("Expédition")}
                </span>
                <span className="v ">
                  {t("Sous 72\u00A0h ouvrées après l’accord")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Ramassage")}
                </span>
                <span className="v ">
                  {t("Chez vous, au créneau du livreur")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Passé ce délai")}
                </span>
                <span className="v ">
                  {t("Remboursement automatique")}
                </span>
              </div>
            </div>
            <div className="keep">
              <span className="kl">
                {t("Vous gardez")}
              </span>
              <span className="kv2">
                {t("17\u00A0840\u00A0F")}
              </span>
            </div>
            <div className="hint">
              {t("Gelés jusqu’à la remise du remplacement, puis libérés et versés le vendredi, comme d’habitude.")}
            </div>
          </div>
          <div className="card">
            <div className="kick">
              {t("Dans les deux cas, défaut confirmé")}
            </div>
            <div className="mt4">
              <div>
                <div className="kv">
                  <span className="k">
                    {t("Trajet retour")}
                  </span>
                  <span className="v ">
                    {t("500\u00A0F à votre charge")}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">
                    {t("Trust Score")}
                  </span>
                  <span className="v ">
                    <span className="cr">
                      {t("Échec grave sur la Qualité")}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt16">
            <Link to="/retours" className="btn primary">
              <Icone nom="repeat" taille={18} />
              <span>
                {t("Proposer le remplacement")}
              </span>
            </Link>
          </div>
          <p className="scrim-note">
            {t("Si le client refuse, il est remboursé et l’article défectueux vous reste.")}
          </p>
        </Ecran>
      )
    case "remplacement?c=rembourser":
      return (
        <Ecran route="remplacement" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Remplacer ou rembourser")}
            </h1>
            <p className="pg-s">
              {t("Retour BLV-00004 · défaut confirmé. Choisissez ce que vous proposez au client.")}
            </p>
          </div>
          <Link to="/remplacement" className="radio">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Proposer un remplacement")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Le client reçoit un ITEL AC52 noir neuf, s’il accepte.")}
              </span>
            </span>
          </Link>
          <Link to="/remplacement?c=rembourser" className="radio on">
            <span className="rd"></span>
            <span className="grow">
              <span className="rt" style={{ "display": "block" }}>
                {t("Rembourser le client")}
              </span>
              <span className="rs" style={{ "display": "block" }}>
                {t("Vous ne gardez rien sur cette vente. L’article défectueux vous reste.")}
              </span>
            </span>
          </Link>
          <div className="card">
            <div className="kick">
              {t("Dans les deux cas, défaut confirmé")}
            </div>
            <div className="mt4">
              <div>
                <div className="kv">
                  <span className="k">
                    {t("Trajet retour")}
                  </span>
                  <span className="v ">
                    {t("500\u00A0F à votre charge")}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">
                    {t("Trust Score")}
                  </span>
                  <span className="v ">
                    <span className="cr">
                      {t("Échec grave sur la Qualité")}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt16">
            <Link to="/retours" className="btn primary">
              <Icone nom="undo-2" taille={18} />
              <span>
                {t("Rembourser le client")}
              </span>
            </Link>
          </div>
        </Ecran>
      )
  }
}
