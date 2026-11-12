// frontend/src/i18n/__tests__/c06.test.ts
// DEV-SRV-01 v1.8, C06 : les phrases construites avec des variables s'affichent dans les deux langues,
// avec le bon pluriel (le français met 0 et 1 au singulier, comme le « n > 1 » d'origine).
import { afterAll, describe, expect, it } from 'vitest';
import i18n from '@/i18n';

const langueDeDepart = i18n.language;
afterAll(() => i18n.changeLanguage(langueDeDepart));

describe('C06 : phrases à variables', () => {
  it('accorde le pluriel en français', async () => {
    await i18n.changeLanguage('fr');
    expect(i18n.t('c06.relais.etapes_avant_ouverture', { count: 1 })).toBe("Encore 1 étape avant d'ouvrir");
    expect(i18n.t('c06.relais.etapes_avant_ouverture', { count: 3 })).toBe("Encore 3 étapes avant d'ouvrir");
    expect(i18n.t('c06.relais.operations_en_attente', { count: 2 })).toBe('2 opérations attendent encore de partir.');
  });

  it('accorde le pluriel en anglais', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('c06.relais.etapes_avant_ouverture', { count: 1 })).toBe('1 more step before opening');
    expect(i18n.t('c06.relais.etapes_avant_ouverture', { count: 3 })).toBe('3 more steps before opening');
    expect(i18n.t('c06.relais.colis_remis', { count: 4 })).toBe('4 parcels handed over');
  });

  it('remplit les variables, et le Wallet existe dans les deux langues', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('c06.wallet.devis', { frais: '100 F', recu: '4 900 F' })).toBe('Fees: 100 F · you receive 4 900 F');
    expect(i18n.t('c06.admin.valide_par', { qui: 'Awa', date: '12/11' })).toBe('Approved by Awa on 12/11');
    await i18n.changeLanguage('fr');
    expect(i18n.t('c06.wallet.titre')).toBe('Mon Wallet');
    expect(i18n.t('c06.wallet.recharger_titre')).not.toMatch(/gratuit/i);
  });
});
