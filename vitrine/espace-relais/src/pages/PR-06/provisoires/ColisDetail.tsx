// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (ColisDetail · Fiche colis) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-06/ColisDetail.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'
import { ENTREPRISE } from '../../../demo/jeu-essai'

/** Détail d’un colis (prototype : ColisDetail) — ?etat=defaut */
export function EtatDefaut() {
  const { t, tf } = usePreferences()
  return (
    <>
      <div className="p-0hxmj8 r-pile">
        <div className="p-26n637">
          <div className="p-yq5y59">
            <div>
              <div className="p-ch33fq">
                {t("COLIS")}
              </div>
              <div className="p-p11vwd">
                {t("BLV-40231")}
              </div>
              <div className="p-yz5dyd">
                {t("Moyen · 2 places · commande de 1 colis")}
              </div>
            </div>
            <div className="p-okq0fj">
              <div className="p-60x9ee">
                {t("RANGÉ EN")}
              </div>
              <div className="p-efknlh">
                {t("B-04")}
              </div>
            </div>
          </div>
          <div className="p-8dmjde">
            <span className="p-pbttlb">
              {t("4e jour")}
            </span>
            <span className="p-pbttlb">
              {t("Garde : 400 F dus")}
            </span>
            <span className="p-pbttlb">
              {t("Client prévenu 3 fois")}
            </span>
          </div>
        </div>
        <div className="p-zmtdxo">
          <Link to={chemin("retrait")} className="p-ylaz0b">
            <Icone nom="r-cle" taille={21} className="p-672m16" />
            <span className="p-j35u7m">
              {t("Remettre")}
            </span>
          </Link>
          <Link to={chemin("litiges")} className="p-ylaz0b">
            <Icone nom="r-balance" taille={21} className="p-lhsznn" />
            <span className="p-j35u7m">
              {t("Signaler")}
            </span>
          </Link>
          <Link to={chemin("colis")} className="p-ylaz0b">
            <Icone nom="r-lieu" taille={21} className="p-672m16" />
            <span className="p-j35u7m">
              {t("Déplacer")}
            </span>
          </Link>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Parcours du colis")}
            </h2>
          </div>
          <div className="p-fkc6m2">
            <div className="p-py0ju2">
              <span className="p-4swkiu" />
              <span className="p-oxoo73" />
            </div>
            <div className="p-8fadah">
              <div className="p-lt8hj6">
                {t("Contrôlé, emballé, scellé")}
              </div>
              <div className="p-46lk2m">
                {t("18 sept. 16:10 · par le livreur, devant le vendeur · 2 photos")}
              </div>
            </div>
          </div>
          <div className="p-fkc6m2">
            <div className="p-py0ju2">
              <span className="p-4swkiu" />
              <span className="p-oxoo73" />
            </div>
            <div className="p-8fadah">
              <div className="p-lt8hj6">
                {t("Pris en charge")}
              </div>
              <div className="p-46lk2m">
                {tf("18 sept. 16:12 · {e} · code de remise validé", { e: ENTREPRISE })}
              </div>
            </div>
          </div>
          <div className="p-fkc6m2">
            <div className="p-py0ju2">
              <span className="p-x8mx13" />
              <span className="p-oxoo73" />
            </div>
            <div className="p-8fadah">
              <div className="p-lt8hj6">
                {t("Reçu au relais")}
              </div>
              <div className="p-46lk2m">
                {t("19 sept. 11:05 · code de dépôt · scellé intact · rangé en B-04")}
              </div>
            </div>
          </div>
          <div className="p-fkc6m2">
            <div className="p-py0ju2">
              <span className="p-x8mx13" />
              <span className="p-oxoo73" />
            </div>
            <div className="p-8fadah">
              <div className="p-lt8hj6">
                {t("Client prévenu")}
              </div>
              <div className="p-46lk2m">
                {t("19 sept. 11:05 · avis d’arrivée vu à 11:20 · code envoyé à part")}
              </div>
            </div>
          </div>
          <div className="p-fkc6m2">
            <div className="p-py0ju2">
              <span className="p-y3lvkl" />
              <span className="p-oxoo73" />
            </div>
            <div className="p-8fadah">
              <div className="p-lt8hj6">
                {t("Rappels de fin des 1er et 3e jours")}
              </div>
              <div className="p-46lk2m">
                {t("19 et 22 sept. au soir · montant dû, palier suivant, date limite")}
              </div>
            </div>
          </div>
          <div className="p-fkc6m2">
            <div className="p-py0ju2">
              <span className="p-hrs8gz" />
            </div>
            <div className="p-2z0wdo">
              <div className="p-lt8hj6">
                {t("Garde payante")}
              </div>
              <div className="p-46lk2m">
                {t("depuis le 21 sept. · 400 F à régler au retrait")}
              </div>
            </div>
          </div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">
              {t("Garde")}
            </h2>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Arrivé le")}
            </span>
            <span className="p-2vq92h">
              {t("19 sept. · 11:05")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Gratuit jusqu’au")}
            </span>
            <span className="p-2vq92h">
              {t("19 sept. au soir")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Non facturé")}
            </span>
            <span className="p-2vq92h">
              {t("dim. 20 · relais fermé")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Aujourd’hui · 4e jour")}
            </span>
            <span className="p-2vq92h">
              {t("400 F")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Dernier jour")}
            </span>
            <span className="p-2vq92h">
              {t("sam. 26 sept. · 1 400 F")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Renvoi si non retiré")}
            </span>
            <span className="p-lgzow2">
              {t("lun. 28 sept. · + 500 F")}
            </span>
          </div>
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Grille appliquée")}
            </span>
            <span className="p-2vq92h">
              {t("celle du jour de la commande")}
            </span>
          </div>
          <div className="p-92xvtp" />
          <div className="p-mqmvkk">
            <span className="p-ytl255">
              {t("Vous toucherez")}
            </span>
            <span className="p-imse89">
              {t("250 F + 100 F / jour facturé")}
            </span>
          </div>
        </div>
        <div className="p-gh7puf">
          <Icone nom="r-cadenas" taille={18} className="p-672m16" />
          <div>
            {t("Aucune donnée du client ni du vendeur ici : c’est voulu. Pour toute question sur ce colis, passez par la Messagerie.")}
          </div>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Détail d’un colis", Rendu: EtatDefaut },
]

export default function ColisDetailProvisoire() {
  return <PageProvisoire route="colis" etats={ETATS} />
}
