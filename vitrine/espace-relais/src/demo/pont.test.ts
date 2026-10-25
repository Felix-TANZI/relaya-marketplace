// Le pont de démonstration (src/demo/pont.ts) : le même fichier, octet pour octet, dans les cinq applications ; le relais
// qu'il décrit (RELAIS_DEMO, lu par le livreur et l'entreprise) est celui du jeu d'essai du relais ; aucun événement relais
// ne porte une identité ou un code (PR-RC-11, PR-RC-20).
import { describe, expect, it, vi } from 'vitest'
import { REFERENCE } from './horloge'
import { CODES_DEPOT, COLLECTES, HORAIRES, LOTS, RELAIS, ROSE } from './jeu-essai'
import { ACTEURS_DEMO, DESTINATAIRES, HEURE_DEMO, RELAIS_DEMO, anonyme, arretDuLot, codeDemo, codeRetraitDemo, colisDe, commandeDuColis, fermetureRelais, gerantVu, lotDeLArret, paquetDuJour } from './pont'
// Texte brut des fichiers (UTF-8), lu à la construction du test.
import pontRelais from './pont.ts?raw'
import pontLivreur from '../../../espace-livreur/src/demo/pont.ts?raw'
import pontEntreprise from '../../../espace-entreprise/src/demo/pont.ts?raw'
import appRelais from './pont-app.ts?raw'
import appLivreur from '../../../espace-livreur/src/demo/pont-app.ts?raw'
import appEntreprise from '../../../espace-entreprise/src/demo/pont-app.ts?raw'
import pontClient from '../../../site/src/demo/pont.ts?raw'
import pontVendeur from '../../../espace-vendeur/src/demo/pont.ts?raw'
import appClient from '../../../site/src/demo/pont-app.ts?raw'
import appVendeur from '../../../espace-vendeur/src/demo/pont-app.ts?raw'
import pontAdmin from '../../../espace-admin/src/demo/pont.ts?raw'
import appAdmin from '../../../espace-admin/src/demo/pont-app.ts?raw'
// Le mode présentation (src/demo/presentation.tsx) : le même fichier dans les cinq applications, lui aussi.
import presRelais from './presentation.tsx?raw'
import presClient from '../../../site/src/demo/presentation.tsx?raw'
import presVendeur from '../../../espace-vendeur/src/demo/presentation.tsx?raw'
import presEntreprise from '../../../espace-entreprise/src/demo/presentation.tsx?raw'
import presLivreur from '../../../espace-livreur/src/demo/presentation.tsx?raw'
// Jeux d'essai des cinq applications (texte : chacune a ses alias et ses dépendances).
import essaiLivreur from '../../../espace-livreur/src/demo/jeu-essai.ts?raw'
import essaiEntreprise from '../../../espace-entreprise/src/demo/jeu-essai.ts?raw'
import essaiVendeur from '../../../espace-vendeur/src/demo/jeu-essai.ts?raw'
import magasinClient from '../../../site/src/demo/magasin.ts?raw'
import boutiquesClient from '../../../site/src/demo/source-demo.ts?raw'
import horlogeLivreur from '../../../espace-livreur/src/demo/horloge.ts?raw'
import horlogeEntreprise from '../../../espace-entreprise/src/demo/horloge.ts?raw'
import lieuxEntreprise from '../../../espace-entreprise/src/demo/paquets.ts?raw'

describe('pont commun', () => {
  it('identique dans les six applications : client, vendeur, entreprise, livreur, relais, console', () => {
    expect(pontRelais.length).toBeGreaterThan(1000)
    for (const copie of [pontClient, pontVendeur, pontEntreprise, pontLivreur, pontAdmin]) expect(copie).toBe(pontRelais)
    expect(appAdmin).toContain(`APP: Destinataire = 'admin'`)
    expect(appClient).toContain(`APP: AppPont = 'client'`)
    expect(appVendeur).toContain(`APP: AppPont = 'vendeur'`)
    expect(appEntreprise).toContain(`APP: AppPont = 'entreprise'`)
    expect(appLivreur).toContain(`APP: AppPont = 'livreur'`)
    expect(appRelais).toContain(`APP: AppPont = 'relais'`)
  })

  it('mode présentation identique dans les cinq applications ; neuf étapes, chacune jouée par une application', () => {
    expect(presRelais.length).toBeGreaterThan(1000)
    for (const copie of [presClient, presVendeur, presEntreprise, presLivreur]) expect(copie).toBe(presRelais)
    const acteurs = [...presRelais.matchAll(/\{ n: (\d), app: '(\w+)'/g)].map((m) => [Number(m[1]), m[2]])
    expect(acteurs).toEqual([[1, 'client'], [2, 'vendeur'], [3, 'entreprise'], [4, 'livreur'], [5, 'livreur'], [6, 'livreur'], [7, 'relais'], [8, 'livreur'], [9, 'relais']])
  })

  it('jeu d’essai commun : même jour, mêmes personnes, mêmes références dans les cinq applications', () => {
    // Même jour et même heure : mardi 13 octobre 2026, 14 h 05 à Yaoundé.
    expect(REFERENCE).toBe(HEURE_DEMO)
    for (const h of [horlogeLivreur, horlogeEntreprise]) expect(h).toContain('yaounde(2026, 10, 13, 14, 5)')
    // Carine Mballa (client), Boutique B = Tonton PG (vendeur, Mvog-Ada ; point de ramassage de Nlongkak, Z1),
    // Yafé Express, Serge Atangana, Relais Bastos Carrefour et sa gérante Rose Mbarga.
    expect(magasinClient).toMatch(/prenom: 'Carine',\s+nom: 'Mballa'/)
    expect(boutiquesClient).toContain(`'${ACTEURS_DEMO.vendeur.vitrine}': { zone: 'Mvog-Ada'`)
    expect(essaiVendeur).toContain(`nom: '${ACTEURS_DEMO.vendeur.boutique}'`)
    expect(essaiVendeur).toContain('Mvog-Ada')
    expect(lieuxEntreprise).toContain(`lieu('${ACTEURS_DEMO.vendeur.lieu}', 'boutique', '${ACTEURS_DEMO.vendeur.point}', '${ACTEURS_DEMO.vendeur.zone}', '${ACTEURS_DEMO.vendeur.quartier}'`)
    expect(essaiEntreprise).toContain(`id: '${ACTEURS_DEMO.entreprise.id}', nom: '${ACTEURS_DEMO.entreprise.nom}'`)
    expect(essaiEntreprise).toContain(`{ id: '${ACTEURS_DEMO.livreur.id}', nom: '${ACTEURS_DEMO.livreur.vu}'`)
    expect(essaiLivreur).toMatch(/prenom: 'Serge',\s+nom: 'Atangana'/)
    expect(essaiLivreur).toContain(`entreprise: '${ACTEURS_DEMO.entreprise.nom}'`)
    expect(ACTEURS_DEMO.relais).toEqual({ id: RELAIS.id, nom: RELAIS.nom, court: 'Relais Bastos', gerante: `${ROSE.prenom} ${ROSE.nom[0]}.` })
    expect(boutiquesClient).toContain(`{ nom: '${ACTEURS_DEMO.relais.court}', quartier: 'Bastos', gerant: '${ACTEURS_DEMO.relais.gerante}'`)
    expect(ROSE.nom).toBe('Mbarga')
  })

  it('table de correspondance des identifiants et codes de démonstration', () => {
    expect(colisDe('BLV-52108')).toBe('BLV-52108-1')
    expect(commandeDuColis('BLV-52108-2')).toBe('BLV-52108')
    expect(paquetDuJour('Z1', 20)).toBe('PQ-Z1-261013-020')
    // Le code de retrait suit la formule du client (site/src/demo/source-demo.ts) ; les codes de dépôt du jeu d'essai.
    expect(codeRetraitDemo('BLV-52108')).toBe(String(100000 + ((52108 * 7919) % 900000)))
    expect(codeDemo('PQ-Z1-261013-003', 'depot')).toBe(CODES_DEPOT['PQ-Z1-261013-003'])
    const c = codeDemo('PQ-Z1-261013-020', 'depot')
    expect(c).toMatch(/^\d{6}$/)
    expect(codeDemo('PQ-Z1-261013-020', 'depot')).toBe(c)
    expect(codeDemo('BLV-52108-1', 'remise')).not.toBe(codeDemo('BLV-52108-1', 'reception'))
  })

  it('le relais vu par le livreur et l’entreprise est celui du jeu d’essai du relais', () => {
    expect(RELAIS_DEMO).toMatchObject({ id: RELAIS.id, nom: RELAIS.nom, zone: RELAIS.zone, quartier: RELAIS.quartier, repere: RELAIS.repere, placesDeclarees: RELAIS.placesDeclarees })
    expect(RELAIS_DEMO.horaires).toEqual(HORAIRES)
    expect(RELAIS_DEMO.codesDepot).toEqual(CODES_DEPOT)
    expect(RELAIS_DEMO.lots).toEqual(Object.fromEntries(LOTS.map((l) => [l.id, l.arret])))
    expect(RELAIS_DEMO.collectes).toEqual(Object.fromEntries(COLLECTES.map((c) => [c.id, c.lot])))
    expect(RELAIS_DEMO.gerant).toEqual({ prenom: ROSE.prenom, initiale: ROSE.nom[0] })
    expect(gerantVu()).toBe('Rose M.')
    expect(lotDeLArret('A3')).toBe('PQ-Z1-261013-003')
    expect(arretDuLot('PQ-Z1-261013-011')).toBe('V6')
    // Mardi 13 octobre : ferme à 19 h ; dimanche 18 : fermé.
    expect(fermetureRelais(REFERENCE)).toBe(Date.UTC(2026, 9, 13, 18, 0))
    expect(fermetureRelais(REFERENCE + 5 * 86_400_000)).toBeNull()
  })

  it('places libres au départ de la démonstration = celles que calcule le relais à 14 h 05', async () => {
    vi.setSystemTime(REFERENCE)
    const { sourceDemo } = await import('./source-demo')
    const s = await sourceDemo.session.session()
    expect(s.relais?.placesDeclarees).toBe(RELAIS_DEMO.placesDeclarees)
    expect(RELAIS_DEMO.placesDeclarees - (s.relais?.placesOccupees ?? 0)).toBe(RELAIS_DEMO.placesLibresAuDebut)
  })

  it('charge utile anonyme : ni identité, ni téléphone, ni code en clair', () => {
    expect(anonyme({ type: 'relay.drop.item_result', lot: 'PQ-Z1-261013-003', colis: 'BLV-00009-1', resultat: 'reserve', motif: 'Angle enfoncé', photos: 1 })).toBe(true)
    expect(anonyme({ type: 'relay.drop_code.verified', lot: 'PQ-Z1-261013-003', code: '418306' } as never)).toBe(false)
    expect(anonyme({ type: 'parcel.pickup_code', colis: '418306', paye: true })).toBe(false)
    expect(anonyme({ type: 'handover.completed', colis: 'BLV-00041-1', client: 'Estelle M.' } as never)).toBe(false)
    // Chaque type a ses destinataires ; l'administrateur voit tout.
    for (const d of Object.values(DESTINATAIRES)) expect(d).toContain('admin')
  })
})
