// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Versements · Versements) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-09/Versements.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import marque from '../../../assets/marque-belivay.png'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'

/** Versements du vendredi (prototype : Versements) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">
            {t("Vos versements")}
          </h1>
          <div className="p-t2u0o2">
            {t("Chaque vendredi avant 12 h, sans frais, sans rien demander.")}
          </div>
        </div>
        <div className="p-tgv863">
          <div className="p-yq5y59">
            <div>
              <div className="p-svzvpz">
                {t("PRÉVU · VENDREDI 25 SEPTEMBRE")}
              </div>
              <div className="p-rpadgd">
                {"11 600"}
                {' '}
                <span className="p-pa311l">
                  {t("FCFA")}
                </span>
              </div>
            </div>
            <img src={marque} alt="" className="p-9gespx" />
          </div>
          <div className="p-wcjyv8">
            <div>
              <div className="p-zp4ayv">
                {t("SERA VERSÉ SUR")}
              </div>
              <div className="p-jjsod9">
                {t("MTN ···· 8 350")}
              </div>
            </div>
            <div className="p-skhqwa">
              {t("MTN")}
            </div>
          </div>
        </div>
        <div className="p-hpt8pg">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Le détail de la semaine")}
            </h2>
          </div>
          <div className="p-arid2n">
            <span>
              {t("LIGNE")}
            </span>
            <span className="p-06slq2">
              {t("QTÉ")}
            </span>
            <span className="p-06slq2">
              {t("TARIF")}
            </span>
            <span className="p-06slq2">
              {t("TOTAL")}
            </span>
          </div>
          <div className="p-npmc86">
            <span>
              {t("Petits colis remis")}
            </span>
            <span className="p-nw7nov">
              {"36"}
            </span>
            <span className="p-nw7nov">
              {t("200 F")}
            </span>
            <span className="p-06slq2">
              {t("7 200 F")}
            </span>
          </div>
          <div className="p-npmc86">
            <span>
              {t("Colis moyens")}
            </span>
            <span className="p-nw7nov">
              {"4"}
            </span>
            <span className="p-nw7nov">
              {t("250 F")}
            </span>
            <span className="p-06slq2">
              {t("1 000 F")}
            </span>
          </div>
          <div className="p-npmc86">
            <span>
              {t("Encombrant")}
            </span>
            <span className="p-nw7nov">
              {"1"}
            </span>
            <span className="p-nw7nov">
              {t("400 F")}
            </span>
            <span className="p-06slq2">
              {t("400 F")}
            </span>
          </div>
          <div className="p-npmc86">
            <span>
              {t("Jours de garde")}
            </span>
            <span className="p-nw7nov">
              {"30"}
            </span>
            <span className="p-nw7nov">
              {t("100 F")}
            </span>
            <span className="p-06slq2">
              {t("3 000 F")}
            </span>
          </div>
          <div className="p-ovpzya">
            <span>
              {t("Total")}
            </span>
            <span className="p-exl0y8">
              {t("11 600 F")}
            </span>
          </div>
          <div className="p-81u2s6">
            {t("C’est BelivaY qui vous paie, même quand la livraison est offerte au client.")}
          </div>
        </div>
        <div className="p-zmtdxo">
          <div className="p-hdjamr">
            <div className="p-g52657">
              {t("ARRÊTÉ")}
            </div>
            <div className="p-arv0mm">
              {t("jeudi minuit")}
            </div>
          </div>
          <div className="p-hdjamr">
            <div className="p-g52657">
              {t("FRAIS")}
            </div>
            <div className="p-arv0mm">
              {t("aucun")}
            </div>
          </div>
          <div className="p-hdjamr">
            <div className="p-g52657">
              {t("MINIMUM")}
            </div>
            <div className="p-arv0mm">
              {t("aucun")}
            </div>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Reçus en septembre")}
            </h2>
            <span className="p-nax3x4">
              {t("33 400 F")}
            </span>
          </div>
          <div className="p-br69f5">
            <Icone nom="check" taille={18} className="p-q7qjlz" />
            <div className="p-lmo74g">
              <div className="p-dfc4i3">
                {t("Vendredi 18 · crédité")}
              </div>
              <div className="p-584cgi">
                {t("BLV-VP-2281")}
              </div>
            </div>
            <div className="p-lq04v6">
              {t("8 400 F")}
            </div>
          </div>
          <div className="p-br69f5">
            <Icone nom="check" taille={18} className="p-q7qjlz" />
            <div className="p-lmo74g">
              <div className="p-dfc4i3">
                {t("Vendredi 11 · crédité")}
              </div>
              <div className="p-584cgi">
                {t("BLV-VP-2204")}
              </div>
            </div>
            <div className="p-lq04v6">
              {t("11 300 F")}
            </div>
          </div>
          <div className="p-br69f5">
            <Icone nom="check" taille={18} className="p-q7qjlz" />
            <div className="p-lmo74g">
              <div className="p-dfc4i3">
                {t("Vendredi 4 · crédité")}
              </div>
              <div className="p-584cgi">
                {t("BLV-VP-2139")}
              </div>
            </div>
            <div className="p-lq04v6">
              {t("13 700 F")}
            </div>
          </div>
          <div className="p-81u2s6">
            {t("La référence est annoncée à l’arrêté du jeudi minuit et figure sur votre relevé MoMo : c’est votre preuve auprès de l’opérateur.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Un souci de versement ?")}
            </h2>
          </div>
          <Link to={chemin("messagerie")} className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-aide" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Versement non reçu")}
              </div>
              <div className="p-dfa05r">
                {t("Signalez-le avec la référence : réponse avant lundi midi")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
          <Link to={chemin("messagerie")} className="p-o24hsm">
            <div className="p-19z9iu">
              <Icone nom="r-alerte" taille={20} className="p-woejqv" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Versement refusé")}
              </div>
              <div className="p-dfa05r">
                {t("Numéro au nom d’un tiers, compte plein ou préfixe qui ne correspond pas : 3 nouveaux essais à 24 h d’intervalle, puis suspension et appel du support")}
              </div>
            </div>
            <Icone nom="r-chevron-droite" taille={18} className="p-2bmvtm" />
          </Link>
          <div className="p-81u2s6">
            {t("Un versement est prévu, envoyé, crédité, refusé ou suspendu : son état s’affiche ici et dans les notifications.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-o24hsm">
            <div className="p-tc472u">
              <Icone nom="r-telephone" taille={20} className="p-q7qjlz" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Numéro de versement")}
              </div>
              <div className="p-dfa05r">
                {t("MTN ···· 8 350 · vérifié par code le 12 juillet")}
              </div>
            </div>
            <span className="p-nax3x4">
              {t("Vérifié")}
            </span>
          </div>
          <div className="p-81u2s6">
            {t("Un nouveau numéro se confirme par deux codes SMS, puis une personne le vérifie : versements suspendus 7 jours, rien n’est perdu.")}
          </div>
          <Link to={chemin("changer-momo")} className="p-rbzobc">
            <Icone nom="r-telephone" taille={18} className="p-emic6i" />
            {t("Changer de numéro")}
          </Link>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Versements du vendredi", Rendu: EtatDefaut },
]

export default function VersementsProvisoire() {
  return <PageProvisoire route="versements" etats={ETATS} />
}
