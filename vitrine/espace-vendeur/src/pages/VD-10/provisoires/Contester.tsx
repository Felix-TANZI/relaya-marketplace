// Page provisoire « Contester une décision » (VD-10) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import { Link } from 'react-router-dom'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Contester() {
  const { t } = usePreferences()
  switch (useEtat("contester")) {
    default:
      return (
        <Ecran route="contester" parEtat>
          <div className="pg">
            <h1 className="pg-t">
              {t("Contester une décision")}
            </h1>
            <p className="pg-s">
              {t("Dites pourquoi vous n’êtes pas d’accord. Un humain vous répond sous 72\u00A0h ouvrées.")}
            </p>
          </div>
          <div className="card">
            <div className="kick" style={{ "fontSize": "12px" }}>
              {t("La décision")}
            </div>
            <div className="row mt8" style={{ "alignItems": "flex-start" }}>
              <span className="li" style={{ "padding": "0", "border": "0", "minHeight": "0" }}>
                <span className="ic red">
                  <Icone nom="shield-alert" taille={20} />
                </span>
              </span>
              <div className="grow">
                <div className="b8 t15">
                  {t("Suspension · niveau 3")}
                </div>
                <div className="t13 c3 mt4">
                  {t("Samedi 10 octobre à 10\u00A0h\u00A012")}
                </div>
                <div className="t13 c2 mt4">
                  {t("Motif\u00A0: «\u00A0Trois commandes non préparées en 30\u00A0jours\u00A0»")}
                </div>
              </div>
            </div>
          </div>
          <div className="fld">
            <label>
              {t("Votre explication ")}
              <span className="req">
                {t("*")}
              </span>
            </label>
            <div className="inp area focus">
              {t("Les commandes du mardi 6 et du jeudi 8 octobre n’ont pas été ramassées\u00A0: le livreur n’est pas passé, ma boutique était ouverte. Voir les photos de la boutique ouverte à 14\u00A0h\u00A030.")}
            </div>
            <div className="cnt">
              {t("186 caractères")}
            </div>
          </div>
          <div className="fld">
            <label>
              {t("Vos preuves")}
            </label>
            <div className="photos" style={{ "marginTop": "0" }}>
              <div className="photo">
                <Dessin id="870ad42e6aba" />
                <span className="ts" style={{ "fontSize": "12px" }}>
                  {t("6 oct.")}
                  <br />
                  {t("14\u00A0h\u00A031")}
                </span>
              </div>
              <div className="photo">
                <Dessin id="870ad42e6aba" />
                <span className="ts" style={{ "fontSize": "12px" }}>
                  {t("8 oct.")}
                  <br />
                  {t("14\u00A0h\u00A028")}
                </span>
              </div>
              <div className="addph" style={{ "fontSize": "13px" }}>
                <Icone nom="paperclip" taille={22} />
                <span>
                  {t("Ajouter")}
                </span>
              </div>
            </div>
          </div>
          <div className="mt16">
            <div className="hint-l">
              <Icone nom="info" taille={15} style={{ "flexShrink": "0", "marginTop": "1px" }} />
              <span>
                {t("Une seule contestation par décision\u00A0: relisez avant d’envoyer.")}
              </span>
            </div>
          </div>
          <div className="mt12">
            <Link to="/suspendu" className="btn primary">
              <Icone nom="send" taille={18} />
              <span>
                {t("Envoyer ma contestation")}
              </span>
            </Link>
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
                {t("Un humain relit votre explication et vos preuves. Il répond avec un motif écrit.")}
              </p>
              <p>
                {t("La réponse reste dans votre historique, que la décision soit maintenue ou annulée.")}
              </p>
            </div>
          </details>
        </Ecran>
      )
  }
}
