// GÉNÉRÉ par outils/transcription.mjs depuis le prototype (Camera · Appareil photo de preuve) : ne pas modifier à la main.
// L'écran repris s'écrit à côté (src/pages/PR-04/Camera.tsx) en partant de ce balisage : structure du prototype
// intacte, contenu enrichi des données et des règles, pages ajoutées pour le surplus (METHODE.md).
import { Link } from 'react-router-dom'
import { Icone } from '../../../composants/Icone'
import { PageProvisoire } from '../../../composants/PageProvisoire'
import { chemin } from '../../../config/pages'
import { usePreferences } from '../../../preferences'

/** Appareil photo de preuve (prototype : Camera · {"cm":"qr"}) — ?etat=defaut */
export function EtatDefaut() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-qbrz47">
        <div className="p-0ftriw" />
        <div className="p-ino8of">
          <Link to={chemin("reception")} aria-label={t("Fermer")} className="p-src5ei">
            <Icone nom="r-fermer" taille={20} className="p-i3112e" />
          </Link>
          <div className="p-9nc58m">
            <button type="button" className="p-0os0tj">
              {t("QR")}
            </button>
            <button type="button" className="p-8r88o0">
              {t("Photo")}
            </button>
          </div>
          <button type="button" aria-label={t("Lampe")} className="p-rxqb0j">
            <Icone nom="r-oeil" taille={20} className="p-i3112e" />
          </button>
        </div>
        <div className="p-9ulogy">
          <span className="p-yq2hxg" />
          <span className="p-un9ob5" />
          <span className="p-eu8j8o" />
          <span className="p-w5w4if" />
          <div className="p-ddbdz3" />
        </div>
        <div className="p-ofabty">
          <div className="p-nlvkht">
            {t("Visez le QR du colis ou du client")}
          </div>
          <div className="p-bfhcyb">
            {t("Le scan se fait tout seul. Étiquette de colis, code de retrait du client ou étiquette de retour : le même scanner reconnaît le type. Le lot du livreur se reçoit avec son code de dépôt.")}
          </div>
        </div>
        <div className="p-dax1hi">
          <button type="button" className="p-nrbwx0">
            {t("Saisir le code à la main")}
          </button>
        </div>
      </div>
    </>
  )
}

/** Photo de remise (prototype : Camera · {"cm":"photo"}) — ?etat=photo */
export function EtatPhoto() {
  const { t } = usePreferences()
  return (
    <>
      <div className="p-qbrz47">
        <div className="p-0ftriw" />
        <div className="p-ino8of">
          <Link to={chemin("reception")} aria-label={t("Fermer")} className="p-src5ei">
            <Icone nom="r-fermer" taille={20} className="p-i3112e" />
          </Link>
          <div className="p-9nc58m">
            <button type="button" className="p-8r88o0">
              {t("QR")}
            </button>
            <button type="button" className="p-0os0tj">
              {t("Photo")}
            </button>
          </div>
          <button type="button" aria-label={t("Lampe")} className="p-rxqb0j">
            <Icone nom="r-oeil" taille={20} className="p-i3112e" />
          </button>
        </div>
        <div className="p-16kuuv" />
        <div className="p-d6195a">
          <span className="p-axlehq">
            {t("Photo de remise · colis entier, étiquette visible")}
          </span>
        </div>
        <div className="p-6760bi">
          {t("L’étape reste bloquée tant que la photo n’est pas prise. Envoi automatique, même hors connexion.")}
        </div>
        <div className="p-f2knp8">
          <div className="p-geztyr" />
          <button type="button" aria-label={t("Prendre la photo")} className="p-z2h8bl">
            <span className="p-kq3wz3" />
          </button>
          <span className="p-5ylbgv">
            {"1 / 1"}
          </span>
        </div>
      </div>
    </>
  )
}

const ETATS = [
  { id: "defaut", libelle: "Appareil photo de preuve", Rendu: EtatDefaut },
  { id: "photo", libelle: "Photo de remise", Rendu: EtatPhoto },
]

export default function CameraProvisoire() {
  return <PageProvisoire route="camera" etats={ETATS} />
}
