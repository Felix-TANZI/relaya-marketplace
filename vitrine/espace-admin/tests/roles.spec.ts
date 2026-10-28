// Rôles de la console (ADM-01 § 11, A-VALIDER A-01) : « ?role=<code> » connecte l'agent de démonstration de ce rôle ;
// chaque rôle ne voit dans la barre latérale QUE ses pages (config/droits.ts), une adresse directe vers une page fermée
// dit « Réservé à d'autres rôles » (la source répond 403 de toute façon), et la pastille rôle · périmètre est dans
// l'en-tête. Le double contrôle se montre en changeant de personne.
import { expect, test } from '@playwright/test'
import { FR, ROLES, adresse, figerHorloge, ouvrir, type Role } from './commun'

const AGENT: Record<Role, string> = {
  superviseur: 'Franck Penga', finance: 'Nadège Eyenga', support: 'Clarisse Mvondo', mediation: 'Mireille Ngo Bassong',
  operations: 'Yannick Owona', verification: 'Armand Kouam', audit: 'Béatrice Essomba', terrain: 'Stéphane Tchoua',
}
const LIBELLE: Record<Role, string> = {
  superviseur: 'Direction', finance: 'Finance', support: 'Support client', mediation: 'Médiation', operations: 'Opérations et logistique',
  verification: 'Vérification et modération', audit: 'Conformité et audit', terrain: 'Agent terrain',
}
// Une page que le rôle voit, une qu'il ne voit pas (matrice ADM-01 ajustée par A-01).
const CAS: Record<Role, { voit: string[]; pas: string[] }> = {
  superviseur: { voit: ['file', 'versements', 'roles', 'pays', 'sante'], pas: [] },
  finance: { voit: ['file', 'escrow', 'versements', 'rapprochement', 'commissions'], pas: ['litige', 'kyc', 'roles'] },
  support: { voit: ['file', 'litige', 'support', 'clients', 'vendeurs'], pas: ['versements', 'rapprochement', 'roles'] },
  mediation: { voit: ['litige', 'sanctions', 'paliers', 'fraude'], pas: ['versements', 'kyc', 'parametrage'] },
  operations: { voit: ['paquets', 'zones', 'carte', 'relais', 'panne', 'kyc'], pas: ['remboursements', 'versements', 'fraude', 'moderation'] },
  verification: { voit: ['kyc', 'moderation', 'catalogue', 'avis', 'comptes'], pas: ['litige', 'versements', 'escrow'] },
  audit: { voit: ['journal', 'fraude', 'rapports', 'export'], pas: ['carte', 'sante', 'pays'] },
  terrain: { voit: ['comptes', 'kyc', 'catalogue', 'relais'], pas: ['file', 'litige', 'escrow', 'fraude'] },
}

test.use({ viewport: { width: 1440, height: 900 } })

/** Lien de la barre latérale vers une route (la File d'action est la racine « /admin »). */
const lien = (r: string) => (r === 'file' ? 'aside.sl a.nav-it:is([href="/admin"],[href="/admin/"])' : `aside.sl a.nav-it[href="/admin/${r}"]`)

for (const role of ROLES)
  test(`${role} : ses pages seulement, pastille rôle · périmètre, 403 ailleurs`, async ({ page }) => {
    await figerHorloge(page)
    await ouvrir(page, adresse('profil'), { ...FR, role })
    await expect(page.locator('aside.sl .sd-user')).toContainText(AGENT[role])
    await expect(page.locator('header.tb .e-role')).toContainText(LIBELLE[role])
    for (const r of CAS[role].voit) await expect(page.locator(lien(r)).filter({ hasText: /\w/ }), r).toHaveCount(1)
    for (const r of CAS[role].pas) await expect(page.locator(lien(r)).filter({ hasText: /\w/ }), r).toHaveCount(0)
    const ferme = CAS[role].pas.find((r) => r !== 'file')
    if (ferme) {
      await page.goto(adresse(ferme))
      await expect(page.getByRole('heading', { name: 'Réservé à d’autres rôles' })).toBeVisible()
    }
  })

test('Opérations : le périmètre Z1, Z2, Z3, Z6 est affiché (ADM-ROL-03)', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('paquets'), { ...FR, role: 'operations' })
  await expect(page.locator('header.tb .e-role')).toContainText('Z1, Z2, Z3, Z6')
  await expect(page.locator('main')).toContainText('Votre périmètre : Z1, Z2, Z3, Z6')
})

test('agent terrain : l’accueil le mène à sa tournée (Comptes et agents terrain)', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, './', { ...FR, role: 'terrain' })
  await expect(page).toHaveURL(/\/admin\/comptes/)
})

test('Agir en tant que : Franck (Direction et Médiation) change de rôle, la barre latérale suit', async ({ page }) => {
  await figerHorloge(page)
  await ouvrir(page, adresse('profil'), FR)
  await expect(page.locator('aside.sl a.nav-it[href="/admin/pays"]')).toHaveCount(1)
  await page.getByRole('button', { name: 'Agir en tant que Médiation' }).click()
  await expect(page.locator('header.tb .e-role')).toContainText('Médiation')
  await expect(page.locator('aside.sl a.nav-it[href="/admin/pays"]')).toHaveCount(0)
})
