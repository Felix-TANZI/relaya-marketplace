// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Rapports · Rapports) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-09/Rapports.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { usePreferences } from '../../../preferences'

/** Rapports (prototype : Rapports · {"rp":"m"}) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-lvzt0c">
          <button type="button" className="p-h01hlk">
            {t("Ce mois")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Trimestre")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Depuis l’ouverture")}
          </button>
        </div>
        <div className="p-vrv3pc">
          <div className="p-ch33fq">
            {t("GAGNÉ EN SEPTEMBRE")}
          </div>
          <div className="p-2je1sf">
            {"45 000"}
            {' '}
            <span className="p-9tekrm">
              {t("FCFA")}
            </span>
          </div>
          <div className="p-zf2e7o">
            <div className="p-4vlkma">
              <div className="p-j3kuze">
                {t("13,7 k")}
              </div>
              <div className="p-px4991" />
              <div className="p-60x9ee">
                {"1–6"}
              </div>
            </div>
            <div className="p-4vlkma">
              <div className="p-j3kuze">
                {t("11,3 k")}
              </div>
              <div className="p-sw5dr7" />
              <div className="p-60x9ee">
                {"7–13"}
              </div>
            </div>
            <div className="p-4vlkma">
              <div className="p-j3kuze">
                {t("8,4 k")}
              </div>
              <div className="p-278l3z" />
              <div className="p-60x9ee">
                {"14–20"}
              </div>
            </div>
            <div className="p-4vlkma">
              <div className="p-j3kuze">
                {t("11,6 k")}
              </div>
              <div className="p-bz89nb" />
              <div className="p-60x9ee">
                {"21–25"}
              </div>
            </div>
          </div>
          <div className="p-x64uqm">
            {t("Dernière colonne : semaine en cours, versement prévu vendredi 25.")}
          </div>
        </div>
        <div className="p-0cipe3">
          <div className="p-2knnop">
            <div className="p-yscrc8">
              {t("COLIS REÇUS")}
            </div>
            <div className="p-2ry3a6">
              {"214"}
            </div>
            <div className="p-g7lwlw">
              {t("en septembre")}
            </div>
          </div>
          <div className="p-2knnop">
            <div className="p-yscrc8">
              {t("COLIS REMIS")}
            </div>
            <div className="p-2ry3a6">
              {"186"}
            </div>
            <div className="p-g7lwlw">
              {t("+ 6 retours déposés")}
            </div>
          </div>
          <div className="p-2knnop">
            <div className="p-yscrc8">
              {t("À TEMPS")}
            </div>
            <div className="p-pp8y7j">
              {"87 %"}
            </div>
            <div className="p-g7lwlw">
              {t("retirés en 7 jours")}
            </div>
          </div>
          <div className="p-2knnop">
            <div className="p-yscrc8">
              {t("RENVOYÉS")}
            </div>
            <div className="p-28dswb">
              {"13 %"}
            </div>
            <div className="p-g7lwlw">
              {t("non retirés en 7 jours")}
            </div>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Délai de retrait")}
            </h2>
          </div>
          <div className="p-ywubik">
            <div className="p-a8upqt" />
            <div className="p-hsb2xc" />
            <div className="p-c1nro7" />
            <div className="p-p30qo8" />
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Le 1er jour · offert")}
            </span>
            <span className="p-enqpyq">
              {"45 %"}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("2e ou 3e jour · 100 F par jour")}
            </span>
            <span className="p-z3tnde">
              {"26 %"}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Du 4e au 7e jour · 200 à 400 F")}
            </span>
            <span className="p-imse89">
              {"16 %"}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Renvoyés")}
            </span>
            <span className="p-lgzow2">
              {"13 %"}
            </span>
          </div>
          <div className="p-81u2s6">
            {t("Plus un colis part tôt, plus votre place tourne. Chaque jour facturé vous rapporte 100 F.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Télécharger")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-document" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Relevé mensuel · PDF")}
              </div>
              <div className="p-dfa05r">
                {t("Versements, colis et garde, pour votre comptabilité")}
              </div>
            </div>
            <Icone nom="r-telecharger" taille={20} className="p-672m16" />
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-graphique" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Relevé d’activité · CSV")}
              </div>
              <div className="p-dfa05r">
                {t("Chaque réception, remise et retour")}
              </div>
            </div>
            <Icone nom="r-telecharger" taille={20} className="p-672m16" />
          </div>
        </div>
      </div>
    </>
  )
}

/** Trimestre (prototype : Rapports · {"rp":"t"}) — ?etat=t */
export function EtatT() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-lvzt0c">
          <button type="button" className="p-bq7aiq">
            {t("Ce mois")}
          </button>
          <button type="button" className="p-h01hlk">
            {t("Trimestre")}
          </button>
          <button type="button" className="p-bq7aiq">
            {t("Depuis l’ouverture")}
          </button>
        </div>
        <div className="p-vrv3pc">
          <div className="p-ch33fq">
            {t("GAGNÉ CE TRIMESTRE")}
          </div>
          <div className="p-2je1sf">
            {"82 700"}
            {' '}
            <span className="p-9tekrm">
              {t("FCFA")}
            </span>
          </div>
          <div className="p-zf2e7o">
            <div className="p-4vlkma">
              <div className="p-j3kuze">
                {t("6,2 k")}
              </div>
              <div className="p-21woi4" />
              <div className="p-60x9ee">
                {t("juillet")}
              </div>
            </div>
            <div className="p-4vlkma">
              <div className="p-j3kuze">
                {t("31,5 k")}
              </div>
              <div className="p-3raon7" />
              <div className="p-60x9ee">
                {t("août")}
              </div>
            </div>
            <div className="p-4vlkma">
              <div className="p-j3kuze">
                {t("45,0 k")}
              </div>
              <div className="p-px4991" />
              <div className="p-60x9ee">
                {t("sept.")}
              </div>
            </div>
          </div>
          <div className="p-x64uqm">
            {t("Ouvert le 16 juillet : juillet est un demi-mois.")}
          </div>
        </div>
        <div className="p-0cipe3">
          <div className="p-2knnop">
            <div className="p-yscrc8">
              {t("COLIS REÇUS")}
            </div>
            <div className="p-2ry3a6">
              {"214"}
            </div>
            <div className="p-g7lwlw">
              {t("en septembre")}
            </div>
          </div>
          <div className="p-2knnop">
            <div className="p-yscrc8">
              {t("COLIS REMIS")}
            </div>
            <div className="p-2ry3a6">
              {"186"}
            </div>
            <div className="p-g7lwlw">
              {t("+ 6 retours déposés")}
            </div>
          </div>
          <div className="p-2knnop">
            <div className="p-yscrc8">
              {t("À TEMPS")}
            </div>
            <div className="p-pp8y7j">
              {"87 %"}
            </div>
            <div className="p-g7lwlw">
              {t("retirés en 7 jours")}
            </div>
          </div>
          <div className="p-2knnop">
            <div className="p-yscrc8">
              {t("RENVOYÉS")}
            </div>
            <div className="p-28dswb">
              {"13 %"}
            </div>
            <div className="p-g7lwlw">
              {t("non retirés en 7 jours")}
            </div>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Délai de retrait")}
            </h2>
          </div>
          <div className="p-ywubik">
            <div className="p-a8upqt" />
            <div className="p-hsb2xc" />
            <div className="p-c1nro7" />
            <div className="p-p30qo8" />
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Le 1er jour · offert")}
            </span>
            <span className="p-enqpyq">
              {"45 %"}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("2e ou 3e jour · 100 F par jour")}
            </span>
            <span className="p-z3tnde">
              {"26 %"}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Du 4e au 7e jour · 200 à 400 F")}
            </span>
            <span className="p-imse89">
              {"16 %"}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Renvoyés")}
            </span>
            <span className="p-lgzow2">
              {"13 %"}
            </span>
          </div>
          <div className="p-81u2s6">
            {t("Plus un colis part tôt, plus votre place tourne. Chaque jour facturé vous rapporte 100 F.")}
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Télécharger")}
            </h2>
          </div>
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-document" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Relevé mensuel · PDF")}
              </div>
              <div className="p-dfa05r">
                {t("Versements, colis et garde, pour votre comptabilité")}
              </div>
            </div>
            <Icone nom="r-telecharger" taille={20} className="p-672m16" />
          </div>
          <div className="p-92xvtp" />
          <div className="p-o24hsm">
            <div className="p-toppw8">
              <Icone nom="r-graphique" taille={20} className="p-672m16" />
            </div>
            <div className="p-rnqj8n">
              <div className="p-ife3a2">
                {t("Relevé d’activité · CSV")}
              </div>
              <div className="p-dfa05r">
                {t("Chaque réception, remise et retour")}
              </div>
            </div>
            <Icone nom="r-telecharger" taille={20} className="p-672m16" />
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Rapports", Rendu: EtatDefaut },
  { id: "t", libelle: "Trimestre", Rendu: EtatT },
]

export default function RapportsProvisoire() {
  return <PageProvisoire route="rapports" etats={ETATS} />
}
