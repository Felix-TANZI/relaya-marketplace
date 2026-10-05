// Écran « Abonnements » (CL-14), forme d'origine du prototype rendue réelle (DP-54) : la bannière Premium, l'accroche
// (livraison offerte dès 30 000 F, ou dès 10 000 F avec Prime), le choix mensuel ou annuel (annuel par défaut :
// 2 mois offerts), les paliers lus dans donnees/prime.ts — Prime mis en avant, puis Prime Duo, Plus et Business —,
// quand Prime devient rentable, les autres formules (Pass 7 jours, se faire offrir), ce qui n'est jamais restreint ;
// le détail (comparaison, ce que l'abonnement ne couvre pas) reste replié. Abonné : son palier en tête.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { Link, useSearchParams } from "react-router-dom";
import { Ecran } from "../../composants/coque";
import { Icone } from "../../composants/Icone";
import { Styles } from "../../composants/Styles";
import { chemin } from "../../config/pages";
import { BASE_RELAIS, ESSAI, PALIERS, PASS, palier } from "../../donnees/prime";
import { F } from "../../i18n/format";
import { usePreferences } from "../../preferences";
import { useDes } from "../../composants/ecran";
import { avantages, Bloc, nomPalier, usePrime } from "./Commun";

export function Abonnements() {
  const { t, tf } = usePreferences();
  const [params, setParams] = useSearchParams();
  const [d] = usePrime();
  // Dès 1024 px, les paliers sont en grille : chaque carte montre prix, avantages et bouton (§ 5.12).
  const grand = useDes("tab-l");
  const table = useDes("pc");
  if (!d) return null;
  const per = params.get("per") === "mois" ? "mois" : "an";
  const choix =
    (["prime", "duo", "plus", "business"] as const).find(
      (x) => x === params.get("palier"),
    ) ??
    (d.actif && d.abonnement && d.abonnement.palier !== "pass"
      ? d.abonnement.palier
      : "prime");
  const choisir = (id: string) =>
    setParams(
      { ...(per === "mois" ? { per: "mois" } : {}), palier: id },
      { replace: true },
    );
  const ab = d.actif ? d.abonnement : null;
  const prime = palier("prime")!;
  const prix = (id: string) => {
    const p = palier(id)!;
    return per === "an" ? p.an : p.mois;
  };
  const economie = (id: string) => {
    const p = palier(id)!;
    return p.mois * 12 - p.an;
  };
  const cta = (id: string, primaire: boolean) =>
    ab?.palier === id ? (
      <Link to={chemin("mon-abonnement")} className="btn secondary">
        <span>{t("Ton palier actuel · voir mon abonnement")}</span>
      </Link>
    ) : (
      <Link
        to={chemin("abonnement-souscrire", { palier: id, formule: per })}
        className={"btn " + (primaire ? "primary" : "secondary")}
      >
        <span>
          {per === "mois" && id === "prime" && !d.essaiUtilise
            ? tf("Essayer Prime · premier mois à {m} F", { m: F(ESSAI) })
            : tf(
                per === "an"
                  ? "Prendre {p} · {m} F / an"
                  : "Prendre {p} · {m} F / mois",
                { p: t(nomPalier(id)), m: F(prix(id)) },
              )}
        </span>
      </Link>
    );
  const SOUS: Record<string, string> = {
    prime: "Pour qui commande plusieurs fois par mois",
    duo: "Prime pour 2 comptes",
    plus: "Pour qui commande de temps en temps",
    business: "Revendeurs vérifiés · 3 comptes déclarés",
  };
  const carte = (id: "prime" | "duo" | "plus" | "business") => {
    const p = palier(id)!;
    const on = choix === id;
    const ouvert = on || grand;
    return (
      <div
        key={id}
        className={
          "card cl14-tier" +
          (on ? " or cl14-prime" : "") +
          (grand && id === "prime" ? " g5-avant" : "") +
          (id === "plus" && !on ? " flat" : "")
        }
      >
        {(on || id === "prime") && (
          <span className="cl14-tag">
            <Icone nom="check" taille={13} trait={3} />
            {t(
              on
                ? ab?.palier === id
                  ? "Ton palier"
                  : "Sélectionné"
                : "Le plus choisi",
            )}
          </span>
        )}
        <a
          href="#"
          role="radio"
          aria-checked={on}
          aria-label={tf("Choisir {p}", { p: t(p.nom) })}
          className="cl14-tc"
          style={{ color: "inherit" }}
          onClick={(e) => (e.preventDefault(), choisir(id))}
        >
          <div className="grow">
            <div
              className="cl14-tn"
              style={on ? { fontSize: "22px" } : undefined}
            >
              {t(id === "prime" ? "Prime ★" : p.nom)}
            </div>
            <div className="cl14-ts">{t(SOUS[id])}</div>
            {!ouvert && per === "an" && (
              <div className="cl14-sv">
                {tf("{m} F économisés sur l’année", { m: F(economie(id)) })}
              </div>
            )}
          </div>
          <div className="cl14-tp">
            <span className="price">
              {F(prix(id))}
              <small>{t(" F")}</small>
            </span>
            <span className="per">
              {t(per === "an" ? "par an" : "par mois")}
            </span>
          </div>
        </a>
        {ouvert && (
          <>
            <div className="cl14-sv">
              {per === "an"
                ? tf("au lieu de {a}\u00A0F\u00A0: {e}\u00A0F économisés", {
                    a: F(p.mois * 12),
                    e: F(economie(id)),
                  })
                : id === "prime" && !d.essaiUtilise
                  ? tf("Premier mois à {m}\u00A0F, puis {p}\u00A0F par mois", {
                      m: F(ESSAI),
                      p: F(p.mois),
                    })
                  : tf("Passe à l’annuel : {e}\u00A0F économisés", {
                      e: F(economie(id)),
                    })}
            </div>
            <ul className="cl14-bl">
              {[
                ...avantages(id, tf).slice(0, 4),
                tf("Support {s} · parrainage\u00A0: {n}\u00A0mois offert", {
                  s: t(p.support),
                  n: p.parrainage,
                }),
              ].map((a) => (
                <li key={a}>
                  <Icone nom="check" taille={16} trait={2.6} />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
            <div className="btns mt14">
              {id === "business" && ab?.palier !== id ? (
                <Link
                  to={chemin("abonnement-souscrire", {
                    palier: "business",
                    formule: per,
                  })}
                  className={"btn " + (on ? "primary" : "secondary")}
                >
                  <span>
                    {t("Je suis revendeur · envoyer mon justificatif")}
                  </span>
                </Link>
              ) : (
                cta(id, on)
              )}
            </div>
            <div className="cl14-fine">
              {t(
                per === "an"
                  ? "Résiliable en un tap\u00A0: l’année payée reste active jusqu’à son terme."
                  : "Résiliable en un tap. Chaque prélèvement est annoncé 3 jours avant.",
              )}
            </div>
          </>
        )}
      </div>
    );
  };
  const gain = 5 * BASE_RELAIS;
  return (
    <Ecran route="abonnements" largeur="moyen" avant={<Styles id="57f763a2e1" />}>
      <Styles id="02f3dac5cd" />
      <div className="pr-ban" role="img" aria-label={t("BelivaY Premium")}>
        <span className="tx">
          <span className="k">{t("BELIVAY PREMIUM")}</span>
          <b>{t("Tes colis en priorité")}</b>
          <small>
            {t("Retrait offert dès 10 000 F · jours de garde en plus")}
          </small>
        </span>
      </div>
      {ab && (
        <Link
          to={chemin("mon-abonnement")}
          className={"note " + (ab.echec ? "amber" : "green")}
          style={{ color: "inherit" }}
        >
          <Icone nom={ab.echec ? "clock" : "crown"} taille={18} />
          <div className="grow">
            <b>{tf("Ton abonnement : {p}", { p: t(nomPalier(ab.palier)) })}</b>{" "}
            ·{" "}
            {t(
              ab.echec
                ? "paiement refusé : payer pendant le délai de grâce"
                : ab.resilie
                  ? "résilié, actif jusqu’à la fin de la période"
                  : "actif",
            )}
          </div>
          <Icone nom="chevron-right" taille={16} />
        </Link>
      )}
      <div className="cl14-hl">
        <h1>
          {t("Livraison offerte dès 30 000 F.")}
          <span>{t("Ou dès 10 000 F avec Prime.")}</span>
        </h1>
        <p>{t("Le prix des produits reste le même pour tous.")}</p>
      </div>
      <div className="seg" role="radiogroup">
        <a
          href="#"
          role="radio"
          aria-checked={per === "mois"}
          className={per === "mois" ? "on" : ""}
          onClick={(e) => (
            e.preventDefault(),
            setParams({ per: "mois", palier: choix }, { replace: true })
          )}
        >
          {t("Mensuel")}
        </a>
        <a
          href="#"
          role="radio"
          aria-checked={per === "an"}
          className={per === "an" ? "on" : ""}
          onClick={(e) => (
            e.preventDefault(),
            setParams({ palier: choix }, { replace: true })
          )}
        >
          {t("Annuel · 2 mois offerts")}
        </a>
      </div>

      <Bloc classe="g5-paliers">
        {(["prime", "duo", "plus", "business"] as const).map(carte)}
      </Bloc>
      <div className="hint-l">
        <Icone
          nom="info"
          taille={15}
          style={{ flexShrink: "0", marginTop: "1px" }}
        />
        <span>
          {t(
            "* Illimité en usage normal : jusqu’à 30 commandes par mois (70 pour Business), écrit dans les conditions.",
          )}
        </span>
      </div>

      <Bloc classe="g5-ab-duo">
      <div className="card green">
        <div className="cl14-gk">{t("Quand Prime devient rentable")}</div>
        <div
          className="row mt6"
          style={{ alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}
        >
          <span className="cl14-gbig">{F(gain)}&nbsp;F</span>
          <span className="t13 b7 cg">
            {tf("économisés pour {m} F payés", { m: F(prime.mois) })}
          </span>
        </div>
        <div
          className="t13 mt8"
          style={{ color: "var(--ink-2)", lineHeight: "1.45" }}
        >
          {tf(
            "Dès 5 commandes par mois de 10 000 à 30 000 F retirées en relais : 5 × {b} F de livraison offerte, sans compter la cagnotte.",
            { b: F(BASE_RELAIS) },
          )}
        </div>
      </div>

      <Bloc classe="g5-ab-formules">
      <div className="sec">
        <h2>{t("Autres formules")}</h2>
      </div>
      <div className="card tight">
        <Link
          to={chemin("abonnement-souscrire", {
            palier: "pass",
            formule: "pass",
          })}
          className="li"
        >
          <span className="ic or">
            <Icone nom="clock" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: "block" }}>
              {tf("Pass 7 jours · {m} F", { m: F(PASS.prix) })}
            </span>
            <span className="ls" style={{ display: "block" }}>
              {tf(
                "Relais offert dès 10 000 F, {n} commandes au plus. Sans prélèvement.",
                { n: PASS.commandes },
              )}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
        <Link to={chemin("abonnement-offrir")} className="li">
          <span className="ic or">
            <Icone nom="gift" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: "block" }}>
              {t("Se faire offrir Prime")}
            </span>
            <span className="ls" style={{ display: "block" }}>
              {t("Un proche à l’étranger le paie par carte : 1 mois, 3 mois ou 1 an.")}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
        <Link
          to={chemin("abonnement-offrir", { palier: "plus", mois: "1" })}
          className="li"
        >
          <span className="ic or">
            <Icone nom="hand-heart" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: "block" }}>
              {tf("Offrir 1 mois de Plus · {m} F", {
                m: F(palier("plus")!.mois),
              })}
            </span>
            <span className="ls" style={{ display: "block" }}>
              {t("À un proche au Cameroun, payé une fois par carte, sans prélèvement ensuite.")}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
        {ab && (
          <Link to={chemin("parrainage")} className="li">
            <span className="ic or">
              <Icone nom="users" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: "block" }}>
                {t("Parrainer un proche")}
              </span>
              <span className="ls" style={{ display: "block" }}>
                {t(
                  "1 mois offert par proche dont la première commande est retirée.",
                )}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        )}
      </div>
      </Bloc>
      </Bloc>

      <div className="note ink">
        <Icone nom="shield-check" taille={18} />
        <div>
          <b>{t("Ce qui n’est jamais restreint au palier gratuit")}</b>
          {t(
            " : protection du paiement, délai des litiges, remboursement automatique sous seuil, tout le catalogue.",
          )}
        </div>
      </div>

      <details className="more" open={table || undefined} key={table ? "t" : "l"}>
        <summary>
          <Icone
            nom="table"
            taille={18}
            style={{ color: "var(--or-txt)", flexShrink: "0" }}
          />
          <span className="grow">{t("Comparer les paliers")}</span>
          <Icone
            nom="chevron-down"
            taille={18}
            style={{ color: "var(--ink-4)", flexShrink: "0" }}
          />
        </summary>
        <div className="more-b">
          {(() => {
          const lignes: [string, (id: string) => string][] = [
            [
              "Prix",
              (id: string) =>
                id === "gratuit"
                  ? "—"
                  : tf(per === "an" ? "{m} F / an" : "{m} F / mois", {
                      m: F(prix(id)),
                    }),
            ],
            [
              "Relais",
              (id: string) =>
                id === "gratuit"
                  ? t("offert dès 30 000 F")
                  : avantages(id, tf)[0],
            ],
            [
              "Domicile",
              (id: string) =>
                id === "gratuit"
                  ? t("offert dès 50 000 F")
                  : avantages(id, tf)[1],
            ],
            [
              "Cagnotte",
              (id: string) =>
                id !== "gratuit" && palier(id)!.cagnotte
                  ? `${palier(id)!.cagnotte * 100} %`
                  : "—",
            ],
          ];
          const colonnes = ["gratuit", ...PALIERS.map((p) => p.id)];
          if (table)
            return (
              <table className="g5-cmp">
                <thead>
                  <tr>
                    <td />
                    {colonnes.map((id) => (
                      <th key={id} scope="col" className={id === choix ? "on" : undefined}>
                        {t(id === "gratuit" ? "Gratuit" : nomPalier(id))}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lignes.map(([titre, val]) => (
                    <tr key={titre}>
                      <th scope="row">{t(titre)}</th>
                      {colonnes.map((id) => (
                        <td key={id} className={id === choix ? "on" : undefined}>{val(id)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          return lignes.map(([titre, val]) => (
            <div key={titre as string}>
              <div className="t13 b8 mt14" style={{ color: "var(--ink)" }}>
                {t(titre as string)}
              </div>
              {["gratuit", ...PALIERS.map((p) => p.id)].map((id) => (
                <div key={id} className="kv">
                  <span className="k">
                    {t(id === "gratuit" ? "Gratuit" : nomPalier(id))}
                  </span>
                  <span className="v ">
                    {(val as (x: string) => string)(id)}
                  </span>
                </div>
              ))}
            </div>
          ));
          })()}
        </div>
      </details>
      <details className="more">
        <summary>
          <Icone
            nom="info"
            taille={18}
            style={{ color: "var(--or-txt)", flexShrink: "0" }}
          />
          <span className="grow">
            {t("Ce que l’abonnement ne couvre jamais")}
          </span>
          <Icone
            nom="chevron-down"
            taille={18}
            style={{ color: "var(--ink-4)", flexShrink: "0" }}
          />
        </summary>
        <div className="more-b">
          <p>
            {t(
              "Il offre la livraison de base : premier ramassage et remise, au tarif d’un colis S. Jamais les ramassages supplémentaires, la remise des autres colis ni le supplément d’un colis XL.",
            )}
          </p>
          <p>
            {t(
              "Les quotas du mois ne se reportent pas. L’abonnement est lié à ton compte et à ton numéro MoMo. Chaque renouvellement est annoncé avant le prélèvement.",
            )}
          </p>
          <Link to={chemin("legal")} className="cor b7">
            {t("Lire les conditions de l’abonnement")}
          </Link>
        </div>
      </details>
    </Ecran>
  );
}
