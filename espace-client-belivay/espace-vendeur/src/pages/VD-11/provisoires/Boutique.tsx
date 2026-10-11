// Page provisoire « Ma boutique » (VD-11) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Boutique() {
  const { t } = usePreferences()
  switch (useEtat("boutique")) {
    default:
      return (
        <Ecran route="boutique" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Ma boutique")}
            </h1>
            <p className="pg-s">
              {t("Le nom de votre boutique reste entre vous et BelivaY.")}
            </p>
          </div>
          <div className="hero night">
            <div className="hk">
              {t("Ce que voit le client")}
            </div>
            <div className="card" style={{ "marginTop": "12px", "background": "var(--card)", "color": "var(--ink)", "boxShadow": "inset 0 0 0 1px var(--line-2)" }}>
              <div className="row">
                <span className="medal bronze">
                  {t("B")}
                </span>
                <div className="grow">
                  <div className="b8 t15">
                    {t("Vendeur certifié Bronze")}
                  </div>
                  <div className="t13" style={{ "color": "#6F6358" }}>
                    {t("Trust Score 63")}
                  </div>
                </div>
                <Icone nom="badge-check" taille={22} style={{ "color": "#1F7A4D" }} />
              </div>
            </div>
            <div className="hs" style={{ "marginTop": "12px" }}>
              {t("Rien d’autre\u00A0: ni nom, ni photo, ni adresse, ni téléphone, ni lien, ni QR de boutique.")}
            </div>
            <div className="hs">
              {t("Trust Score\u00A0: votre note de confiance, sur 100.")}
            </div>
          </div>
          <details className="more">
            <summary>
              <Icone nom="eye-off" taille={18} style={{ "color": "var(--or-txt)", "flexShrink": "0" }} />
              <span className="grow">
                {t("Comment ça marche")}
              </span>
              <Icone nom="chevron-down" taille={18} style={{ "color": "var(--ink-4)", "flexShrink": "0" }} />
            </summary>
            <div className="more-b">
              <p>
                <b>
                  {t("Le client ne voit jamais")}
                </b>
                {t(" le nom de la boutique, une page boutique, une photo, l’adresse, le téléphone, le WhatsApp, un lien ou un QR.")}
              </p>
              <p>
                <b>
                  {t("Vous ne voyez jamais")}
                </b>
                {t(" le nom, le numéro, l’adresse ni le quartier du client, son mode de livraison, son relais, les autres vendeurs, le total payé. Seule exception\u00A0: la mention «\u00A0payable au retrait\u00A0».")}
              </p>
              <p>
                <b>
                  {t("Entre vous deux")}
                </b>
                {t(", aucun contact direct\u00A0: une messagerie rattachée à la commande, anonyme et filtrée.")}
              </p>
            </div>
          </details>
          <div className="card tight">
            <Link to="/horaires" className="li">
              <span className="ic ">
                <Icone nom="clock" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Horaires et fermetures")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Lun – ven 08\u00A0h – 18\u00A0h · sam 08\u00A0h – 14\u00A0h")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/avis" className="li">
              <span className="ic ">
                <Icone nom="star" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Avis")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("4,0 · 2 avis vérifiés")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/equipe" className="li">
              <span className="ic ">
                <Icone nom="users" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Mon équipe")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("2 personnes · 1 accès employé sur 3")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
            <Link to="/emplacement" className="li">
              <span className="ic ">
                <Icone nom="map-pin" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ "display": "block" }}>
                  {t("Emplacement")}
                </span>
                <span className="ls" style={{ "display": "block" }}>
                  {t("Z4 · Mvog-Mbi / Mvog-Ada · vérifié")}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>
          <div className="card">
            <h3>
              {t("Votre identité chez BelivaY")}
            </h3>
            <div className="mt8">
              <div className="kv">
                <span className="k">
                  {t("Nom de la boutique")}
                </span>
                <span className="v ">
                  {t("Tonton PG")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Titulaire")}
                </span>
                <span className="v ">
                  {t("Franck Penga ")}
                  <Icone nom="lock" taille={13} style={{ "verticalAlign": "-1px", "color": "var(--ink-3)" }} />
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Identifiant")}
                </span>
                <span className="v ">
                  {t("@Penga12")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Statut")}
                </span>
                <span className="v ">
                  {t("Particulier · sans RCCM")}
                </span>
              </div>
              <div className="kv">
                <span className="k">
                  {t("Compte")}
                </span>
                <span className="v ">
                  {t("Créé le 7 mai · approuvé le 9 mai")}
                </span>
              </div>
            </div>
            <div className="hint-l">
              <Icone nom="lock" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("L’identifiant ne change jamais. Le titulaire suit votre pièce d’identité\u00A0: le changer demande une vérification.")}
              </span>
            </div>
            <div className="mt12">
              <Link to="/messages" className="btn secondary">
                <Icone nom="pencil" taille={18} />
                <span>
                  {t("Demander une modification")}
                </span>
              </Link>
            </div>
          </div>
        </Ecran>
      )
  }
}
