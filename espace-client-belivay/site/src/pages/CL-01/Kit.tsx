// Écran « Composants » (CL-01), repris pour l'usage réel (DP-54) : le kit des composants du site, vivant : les
// boutons répondent (le dernier touché s'affiche), la quantité se règle, la feuille du bas s'ouvre et se ferme ;
// aucun état écrit d'avance.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { Ecran } from "../../composants/coque";
import { Dessin } from "../../composants/Dessin";
import { Icone } from "../../composants/Icone";
import { Styles } from "../../composants/Styles";
import { usePreferences } from "../../preferences";
import { Bloc } from "../CL-13/Larges";

export function Kit() {
  const { t, tf } = usePreferences();
  const [feuille, setFeuille] = useState(false);
  const [qte, setQte] = useState(1);
  const [touche, setTouche] = useState<string | null>(null);
  // Onglets et puces : le choix s'allume sur place.
  const [onglet, setOnglet] = useState<"cours" | "terminees">("cours");
  const [puce, setPuce] = useState("Tout voir");
  const choisir = (f: () => void) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    f();
  };
  const toucher = (e: MouseEvent<HTMLButtonElement>) =>
    setTouche(e.currentTarget.textContent?.trim() ?? "");
  return (
    <Ecran
      route="kit"
      largeur="moyen"
      fixes={
        feuille && (
          <>
            <div className="veil" onClick={() => setFeuille(false)}></div>
            <div className="sheet">
              <div className="grab"></div>
              <b className="t17 b8" style={{ display: "block" }}>
                {t("Montant dû · BLV-52018")}
              </b>
              <p
                className="t13 c3"
                style={{ margin: "6px 0 0", lineHeight: "1.45" }}
              >
                {t(
                  "Garde de tes 2 colis au Relais Mvog-Ada\u00A0: 400\u00A0F aujourd’hui, 600\u00A0F demain. Tu paies en Mobile Money, sur ton téléphone.",
                )}
              </p>
              <div className="btns mt16">
                <Link
                  to="/comptoir-payer?ref=BLV-52018"
                  className="btn primary"
                >
                  <Icone nom="smartphone" taille={18} />
                  <span>{t("Payer 400\u00A0F")}</span>
                </Link>
              </div>
              <div className="btns">
                <a
                  href="#"
                  className="btn ghost"
                  onClick={(e) => (e.preventDefault(), setFeuille(false))}
                >
                  <span>{t("Plus tard")}</span>
                </a>
              </div>
            </div>
          </>
        )
      }
    >
      <Styles id="93ec4c1d2c" />
      <div className="pg">
        <div className="pg-k">{t("CL-01 · design system")}</div>
        <h1 className="pg-t">{t("Charte client")}</h1>
        <p className="pg-s">
          {t(
            "Mandarine et nuit, gris neutres, aucun bleu. Une action principale par écran.",
          )}
        </p>
      </div>
      <div className="reass">
        <Icone nom="shield-check" taille={15} />
        {t("Paiement sécurisé via MoMo · Escrow BelivaY")}
      </div>
      <Bloc classe="kit-g">
      <Bloc classe="kit-b">
      <div className="sec bar cl00-sb">
        <h2>{t("Cartes produit")}</h2>
        <Link to="/liste?cat=tel" className="a">
          {t("Tout voir")}
          <Icone nom="chevron-right" taille={16} />
        </Link>
      </div>
      <div className="pgrid">
        <Link to="/fiche?p=camon30" className="pcard">
          <span className="pc-img">
            <Dessin id="8bf046203afd" />
            <span className="pc-tag">{t("Garantie 12\u00A0mois")}</span>
            <span className="pc-heart" aria-label="Favori">
              <Icone nom="heart" taille={17} />
            </span>
            <span className="pc-add" aria-label="Ajouter au panier">
              <Icone nom="plus" taille={18} trait={2.4} />
            </span>
          </span>
          <span className="pc-b">
            <span className="pc-t">{t("Tecno Camon 30")}</span>
            <span className="pc-p">
              <span className="price">
                <small className="fr">{t("à partir de ")}</small>
                {t("139\u00A0000")}
                <small>{t(" F")}</small>
              </span>
            </span>
            <span className="pc-d">
              <span className="dl free">
                <Icone nom="check" taille={13} trait={2.6} />
                {t("Retrait offert")}
              </span>
            </span>
            <span className="pc-m">
              <span>
                <Icone nom="map-pin" taille={13} />
                {t("1,2\u00A0km")}
              </span>
              <span className="stars">
                <Icone
                  nom="star"
                  taille={14}
                  style={{ fill: "currentColor" }}
                />
                <b>{t("4,6")}</b>
                <span>{t("(128)")}</span>
              </span>
            </span>
          </span>
        </Link>
        <Link to="/fiche?p=huile5l" className="pcard">
          <span className="pc-img">
            <Dessin id="6fbbd05006d1" />
            <span className="pc-heart" aria-label="Favori">
              <Icone nom="heart" taille={17} />
            </span>
            <span className="pc-add" aria-label="Ajouter au panier">
              <Icone nom="plus" taille={18} trait={2.4} />
            </span>
          </span>
          <span className="pc-b">
            <span className="pc-t">{t("Huile d’arachide 5 L")}</span>
            <span className="pc-p">
              <span className="price">
                {t("9\u00A0800")}
                <small>{t(" F")}</small>
              </span>
            </span>
            <span className="pc-d">
              <span className="dl">{t("+ 900\u00A0F de retrait")}</span>
              <span className="dl sup">{t("+ 200\u00A0F colis M")}</span>
            </span>
            <span className="pc-m">
              <span>
                <Icone nom="map-pin" taille={13} />
                {t("1,7\u00A0km")}
              </span>
              <span className="stars">
                <Icone
                  nom="star"
                  taille={14}
                  style={{ fill: "currentColor" }}
                />
                <b>{t("4,6")}</b>
                <span>{t("(64)")}</span>
              </span>
            </span>
          </span>
        </Link>
      </div>
      </Bloc>
      <Bloc classe="kit-b">
      <div className="sec bar cl00-sb">
        <h2>{t("Produits populaires")}</h2>
      </div>
      <div className="cl00-cta">
        <div className="pgrid">
          <Link to="/fiche?p=montre" className="pcard">
            <span className="pc-img">
              <Dessin id="e5c0e2fb6ad6" />
              <span className="pc-off">{t("−8\u00A0%")}</span>
              <span className="pc-heart" aria-label="Favori">
                <Icone nom="heart" taille={17} />
              </span>
            </span>
            <span className="pc-b">
              <span className="pc-t">{t("Montre acier bracelet cuir")}</span>
              <span className="pc-p">
                <span className="price">
                  {t("27\u00A0500")}
                  <small>{t(" F")}</small>
                </span>{" "}
                <s className="was">{t("29\u00A0900\u00A0F")}</s>{" "}
                <span className="off">{t("−8\u00A0%")}</span>
              </span>
              <span className="pc-d">
                <span className="dl">{t("+ 900\u00A0F de retrait")}</span>
              </span>
              <span className="pc-m">
                <span>
                  <Icone nom="map-pin" taille={13} />
                  {t("2,2\u00A0km")}
                </span>
                <span className="stars">
                  <Icone
                    nom="star"
                    taille={14}
                    style={{ fill: "currentColor" }}
                  />
                  <b>{t("4,3")}</b>
                  <span>{t("(29)")}</span>
                </span>
              </span>
            </span>
            <span className="pc-cta">
              <Icone nom="plus" taille={15} trait={2.6} />
              {t("Panier")}
            </span>
          </Link>
          <Link to="/fiche?p=galaxya15" className="pcard">
            <span className="pc-img">
              <Dessin id="20344e766a88" />
              <span className="pc-off">{t("−10\u00A0%")}</span>
              <span className="pc-heart" aria-label="Favori">
                <Icone nom="heart" taille={17} />
              </span>
            </span>
            <span className="pc-b">
              <span className="pc-t">{t("Samsung Galaxy A15 · 128 Go")}</span>
              <span className="pc-p">
                <span className="price">
                  {t("89\u00A0900")}
                  <small>{t(" F")}</small>
                </span>{" "}
                <s className="was">{t("99\u00A0900\u00A0F")}</s>{" "}
                <span className="off">{t("−10\u00A0%")}</span>
              </span>
              <span className="pc-d">
                <span className="dl free">
                  <Icone nom="check" taille={13} trait={2.6} />
                  {t("Retrait offert")}
                </span>
              </span>
              <span className="pc-m">
                <span>
                  <Icone nom="map-pin" taille={13} />
                  {t("2,4\u00A0km")}
                </span>
                <span className="stars">
                  <Icone
                    nom="star"
                    taille={14}
                    style={{ fill: "currentColor" }}
                  />
                  <b>{t("4,5")}</b>
                  <span>{t("(93)")}</span>
                </span>
              </span>
            </span>
            <span className="pc-cta">
              <Icone nom="plus" taille={15} trait={2.6} />
              {t("Panier")}
            </span>
          </Link>
        </div>
      </div>
      </Bloc>
      <Bloc classe="kit-b">
      <div className="sec bar cl00-sb">
        <h2>{t("Prix livré et ligne de retrait")}</h2>
      </div>
      <div className="card ">
        <span className="price big">
          {t("150\u00A0699")}
          <small>{t(" F")}</small>
        </span>
        <div className="mt8">
          <div className="kv">
            <span className="k">{t("Colis S · 18\u00A0500\u00A0F")}</span>
            <span className="v ">
              <span className="dl">{t("+ 900\u00A0F de retrait")}</span>
            </span>
          </div>
          <div className="kv">
            <span className="k">{t("Colis S · 37\u00A0000\u00A0F")}</span>
            <span className="v ">
              <span className="dl free">
                <Icone nom="check" taille={13} trait={2.6} />
                {t("Retrait offert")}
              </span>
            </span>
          </div>
          <div className="kv">
            <span className="k">{t("Colis M · 9\u00A0800\u00A0F")}</span>
            <span className="v ">
              <span className="dl">{t("+ 900\u00A0F de retrait")}</span>
              <span className="dl sup">{t("+ 200\u00A0F colis M")}</span>
            </span>
          </div>
          <div className="kv">
            <span className="k">{t("Colis L · 24\u00A0500\u00A0F")}</span>
            <span className="v ">
              <span className="dl">{t("+ 900\u00A0F de retrait")}</span>
              <span className="dl sup">{t("+ 300\u00A0F colis L")}</span>
            </span>
          </div>
          <div className="kv">
            <span className="k">{t("Colis XL · 189\u00A0000\u00A0F")}</span>
            <span className="v ">
              <span className="dl home">
                <Icone nom="truck" taille={13} />
                {t("Livraison à domicile")}
              </span>
            </span>
          </div>
        </div>
      </div>
      </Bloc>
      <Bloc classe="kit-b">
      <div className="sec bar cl00-sb">
        <h2>{t("Onglets et puces")}</h2>
      </div>
      <div className="seg">
        <Link to="/kit" className={onglet === "cours" ? "on" : ""} aria-pressed={onglet === "cours"} onClick={choisir(() => setOnglet("cours"))}>
          {t("En cours ")}
          <span className="n">{t("4")}</span>
        </Link>
        <Link to="/kit" className={onglet === "terminees" ? "on" : ""} aria-pressed={onglet === "terminees"} onClick={choisir(() => setOnglet("terminees"))}>
          {t("Terminées ")}
          <span className="n">{t("4")}</span>
        </Link>
      </div>
      <div className="chips">
        {["Tout voir", "Téléphones & tablettes", "Mode femme"].map((x) => (
          <Link key={x} to="/kit" className={"chip" + (puce === x ? " on" : "")} aria-pressed={puce === x} onClick={choisir(() => setPuce(x))}>
            {t(x)}
          </Link>
        ))}
      </div>
      </Bloc>
      <Bloc classe="kit-b">
      <div className="sec bar cl00-sb">
        <h2>{t("Étapes")}</h2>
      </div>
      <div className="steps">
        <i className="on"></i>
        <i className="cur"></i>
        <i className=""></i>
        <i className=""></i>
      </div>
      <div className="hint-l">
        <Icone
          nom="info"
          taille={15}
          style={{ flexShrink: "0", marginTop: "1px" }}
        />
        <span>
          {t(
            "Étape 2 sur 4\u00A0: faite en vert, en cours en orange, à venir en gris.",
          )}
        </span>
      </div>
      </Bloc>
      <Bloc classe="kit-b">
      <div className="sec bar cl00-sb">
        <h2>{t("Cartes teintées")}</h2>
      </div>
      <div className="card or">
        <b className="t15 b8 cor">{t("Retirable maintenant")}</b>
        <div className="t13 c2 mt4">
          {t("2 colis au Relais Mvog-Ada · un seul code")}
        </div>
      </div>
      <div className="card green">
        <b className="t15 b8 cg">{t("Payée · 34\u00A0180\u00A0F")}</b>
        <div className="t13 c2 mt4">
          {t("MTN MoMo 6 77 ·· ·· 41 · sam. 19 sept.")}
        </div>
      </div>
      <div className="card red">
        <b className="t15 b8 cr">{t("Paiement non abouti")}</b>
        <div className="t13 c2 mt4">{t("Aucun montant n’a été débité.")}</div>
      </div>
      <div className="card info">
        <b className="t15 b8">{t("Relais Mvog-Ada")}</b>
        <div className="t13 c2 mt4">
          {t("Mme Ngo Bassong · ouvert jusqu’à 19\u00A0h")}
        </div>
      </div>
      </Bloc>
      <Bloc classe="kit-b">
      <div className="sec bar cl00-sb">
        <h2>{t("Ligne de panier")}</h2>
      </div>
      <div className="card ">
        <div className="cl">
          <span
            className="thumb"
            style={{ width: "64px", height: "64px", borderRadius: "16px" }}
          >
            <Dessin id="c8ed74acd931" />
          </span>
          <div className="grow">
            <div className="cn">{t("Tecno Camon 30")}</div>
            <div className="cv">{t("Gris titane · 256 Go")}</div>
            <div
              className="row mt8"
              style={{ justifyContent: "space-between" }}
            >
              <span className="qty">
                <button
                  type="button"
                  aria-label="Moins"
                  // À 1, la corbeille retire l'article (le kit l'annonce, comme le dernier bouton touché).
                  onClick={() => (qte > 1 ? setQte(qte - 1) : setTouche(t("Retirer l’article")))}
                >
                  <Icone nom="trash-2" taille={16} />
                </button>
                <b>{qte}</b>
                <button
                  type="button"
                  aria-label="Plus"
                  onClick={() => setQte(Math.min(10, qte + 1))}
                >
                  <Icone nom="plus" taille={16} />
                </button>
              </span>
              <span className="price">
                {t("150\u00A0699")}
                <small>{t(" F")}</small>
              </span>
            </div>
          </div>
        </div>
      </div>
      </Bloc>
      <Bloc classe="kit-b">
      <div className="sec bar cl00-sb">
        <h2>{t("Carte de commande")}</h2>
      </div>
      <div className="card ">
        <div className="oc">
          <span
            className="thumb"
            style={{ width: "64px", height: "64px", borderRadius: "16px" }}
          >
            <Dessin id="bf4e892644c3" />
          </span>
          <div className="grow">
            <div className="ost acc">{t("Retirable maintenant")}</div>
            <div className="od">
              {t("2 colis au Relais Mvog-Ada · dû 400\u00A0F aujourd’hui")}
            </div>
            <div className="gauge">
              <i className="on"></i>
              <i className="on"></i>
              <i className="on cur"></i>
              <i className=""></i>
            </div>
            <div className="gauge-l">
              <span className="">{t("Préparation")}</span>
              <span className="">{t("Récupéré")}</span>
              <span className="on">{t("Arrivé au relais")}</span>
              <span className="">{t("Retiré")}</span>
            </div>
            <div className="onum">{t("BLV-52018")}</div>
          </div>
        </div>
        <div className="btns">
          <Link to="/code?ref=BLV-52018" className="btn primary">
            <Icone nom="qr-code" taille={18} />
            <span>{t("Afficher mon code")}</span>
          </Link>
        </div>
      </div>
      </Bloc>
      <Bloc classe="kit-b">
      <div className="sec bar cl00-sb">
        <h2>{t("Vendeur anonyme")}</h2>
      </div>
      <div className="row" style={{ flexWrap: "wrap", gap: "6px" }}>
        <span className="tier orm">
          <Icone nom="badge-check" taille={14} />
          {t("Vendeur certifié Or · Trust Score 91")}
        </span>
        <span className="tier argent">
          <Icone nom="badge-check" taille={14} />
          {t("Argent · 78")}
        </span>
        <span className="tier bronze">
          <Icone nom="badge-check" taille={14} />
          {t("Bronze · 64")}
        </span>
      </div>
      </Bloc>
      <Bloc classe="kit-b">
      <div className="sec bar cl00-sb">
        <h2>{t("Pastilles et encadrés")}</h2>
      </div>
      <div className="row" style={{ flexWrap: "wrap", gap: "6px" }}>
        <span className="pill or">
          <i className="d"></i>
          {t("Retirable")}
        </span>
        <span className="pill ink">
          <i className="d"></i>
          {t("En litige")}
        </span>
        <span className="pill green">
          <Icone nom="check" taille={13} />
          {t("Payée")}
        </span>
        <span className="pill amber">
          <Icone nom="clock" taille={13} />
          {t("Paiement en attente")}
        </span>
      </div>
      <div className="note green">
        <Icone nom="shield-check" taille={18} />
        <div>
          <b>{t("Ton argent est bloqué")}</b>
          {t(" jusqu’à ton retrait\u00A0: le vendeur n’est payé qu’après.")}
        </div>
      </div>
      <div className="note or">
        <Icone nom="clock" taille={18} />
        <div>
          {t("Gratuit aujourd’hui, ")}
          <b>{t("100\u00A0F par jour dès demain")}</b>
          {t(".")}
        </div>
      </div>
      </Bloc>
      <Bloc classe="kit-b">
      <div className="sec bar cl00-sb">
        <h2>{t("Champ, aide et détails repliables")}</h2>
      </div>
      <div className="fld">
        <label>{t("Numéro Mobile Money")}</label>
        <div className="inp ok">
          <Icone
            nom="smartphone"
            taille={18}
            style={{ color: "var(--ink-3)", flexShrink: "0" }}
          />
          <span className="grow">{t("6 77 ·· ·· 41")}</span>
          <span className="suf">{t("MTN")}</span>
        </div>
        <div className="hint">
          {t(
            "Numéro vérifié\u00A0: tu valides chaque paiement sur ton téléphone.",
          )}
        </div>
      </div>
      <details className="more">
        <summary>
          <Icone
            nom="info"
            taille={18}
            style={{ color: "var(--or-txt)", flexShrink: "0" }}
          />
          <span className="grow">{t("Comment ça marche")}</span>
          <Icone
            nom="chevron-down"
            taille={18}
            style={{ color: "var(--ink-4)", flexShrink: "0" }}
          />
        </summary>
        <div className="more-b">
          <p>
            {t(
              "Ton argent reste bloqué jusqu’à ton retrait. Le vendeur n’est payé qu’après.",
            )}
          </p>
        </div>
      </details>
      </Bloc>
      <Bloc classe="kit-b">
      <div className="sec bar cl00-sb">
        <h2>{t("Hors ligne et état vide")}</h2>
      </div>
      <div className="offline-banner">
        <Icone nom="wifi-off" taille={18} />
        <span>
          {t(
            "Hors ligne · accueil enregistré à 10\u00A0h\u00A012. Ton code de retrait reste lisible.",
          )}
        </span>
      </div>
      <div className="card ">
        <div className="empty">
          <div className="ei">
            <Icone nom="package" taille={26} />
          </div>
          <h3>{t("Pas encore de commande")}</h3>
          <p>{t("Tes commandes apparaissent ici dès qu’elles sont payées.")}</p>
          <Link to="/categories" className="btn secondary">
            <Icone nom="layout-grid" taille={18} />
            <span>{t("Découvrir les produits")}</span>
          </Link>
        </div>
      </div>
      </Bloc>
      <Bloc classe="kit-b">
      <div className="sec bar cl00-sb">
        <h2>{t("Carte clé")}</h2>
      </div>
      <div className="hero night">
        <div className="hk">{t("Code de retrait")}</div>
        <div className="code6">
          <span>{t("6")}</span>
          <span>{t("0")}</span>
          <span>{t("4")}</span>
          <span>{t("3")}</span>
          <span>{t("1")}</span>
          <span>{t("8")}</span>
        </div>
        <div className="hs center mt8">
          {t("À montrer à Mme Ngo Bassong au Relais Mvog-Ada")}
        </div>
      </div>
      </Bloc>
      <Bloc classe="kit-b">
      <div className="sec bar cl00-sb">
        <h2>{t("Boutons")}</h2>
      </div>
      {touche && (
        <p className="t13 c3" role="status">
          {tf("Bouton « {b} » touché.", { b: touche })}
        </p>
      )}
      <div className="btns">
        <button type="button" className="btn primary" onClick={toucher}>
          <span>{t("Action principale")}</span>
        </button>
      </div>
      <div className="btns">
        <button type="button" className="btn secondary" onClick={toucher}>
          <span>{t("Secondaire")}</span>
        </button>
        <button type="button" className="btn soft" onClick={toucher}>
          <span>{t("Douce")}</span>
        </button>
      </div>
      <div className="btns">
        <button type="button" className="btn green" onClick={toucher}>
          <Icone nom="check" taille={18} />
          <span>{t("Tout est en ordre")}</span>
        </button>
        <button type="button" className="btn danger" onClick={toucher}>
          <Icone nom="triangle-alert" taille={18} />
          <span>{t("Un problème")}</span>
        </button>
      </div>
      <div className="btns">
        <a
          href="#"
          className="btn ghost"
          onClick={(e) => (e.preventDefault(), setFeuille(true))}
        >
          <Icone nom="panel-bottom" taille={18} />
          <span>{t("Voir une feuille du bas")}</span>
        </a>
      </div>
      </Bloc>
      </Bloc>
    </Ecran>
  );
}
