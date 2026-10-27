// Page provisoire « Lancement de l’app » (VD-03) : générée par outils/ecran.mjs depuis le prototype vendeur du 1er octobre,
// un rendu par état (1 adresses). Ne pas modifier : un écran repris vit à côté (METHODE.md).
import type { CSSProperties } from 'react'
import { Ecran } from '../../../composants/coque'
import { Dessin } from '../../../composants/Dessin'
import { Icone } from '../../../composants/Icone'
import { useEtat } from '../../../config/etats'
import { usePreferences } from '../../../preferences'

export default function Lancement() {
  const { t } = usePreferences()
  switch (useEtat("lancement")) {
    default:
      return (
        <Ecran route="lancement" parEtat fixes={
          <>
          <div className="blv-spl run" role="img" aria-label="BelivaY · Espace vendeur" style={{ "--nw": "166px" } as CSSProperties}>
            <div className="lu">
              <Dessin id="af28954ee65e" />
              <span className="nm">
                <span>
                  {t("BelivaY")}
                </span>
              </span>
            </div>
            <p className="spl-tg">
              <Icone nom="store" taille={15} />
              {t("Espace vendeur")}
            </p>
          </div>
          </>
        }>

        </Ecran>
      )
  }
}
