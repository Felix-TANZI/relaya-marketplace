// frontend/src/i18n/variablesReglages.ts
// DEV-SRV-01 T05 : « aucun montant n'est écrit dans le code ». Les textes traduits qui citent une règle (R07 :
// « Livraison au relais offerte dès {{seuil_relais}} ») reçoivent sa valeur du serveur (/api/regles/reglages/) :
// changer le réglage dans l'administration change le texte, en français comme en anglais.

import i18n from './index';
import { chargerReglagesPublics } from '@/hooks/useReglagesPublics';

const montant = (valeur: number) => `${valeur.toLocaleString('fr-FR')} F`;

export function brancherReglagesDansLesTextes(): void {
  chargerReglagesPublics()
    .then((r) => {
      const interpolation = i18n.options.interpolation ?? {};
      interpolation.defaultVariables = {
        ...interpolation.defaultVariables,
        seuil_relais: montant(r.r_seuil_relais),
        relais_offert: montant(r.r_relais),
      };
      i18n.options.interpolation = interpolation;
      // Les écrans déjà affichés se redessinent avec les vrais montants (react-i18next écoute « languageChanged »).
      void i18n.changeLanguage(i18n.language);
    })
    .catch(() => undefined); // hors ligne : « … » reste affiché, aucun montant inventé
}
