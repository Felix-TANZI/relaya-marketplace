// La convention de partenariat (page ajoutée à PR-03 ; ouverte sans session depuis l'inscription, étape 5 : « J'ai lu
// la convention » suppose de pouvoir la lire ; depuis Activation : « Convention de partenariat », à relire et
// télécharger). Résumé fidèle de la convention v1.0 et de ses annexes (PR-CT01 à CT03), mis à jour par la v6 (garde en
// espèces, DP-63/65), DP-66/67 (le relais demande, BelivaY décide) et les arbitrages ARL ; montants et délais lus au
// registre. « Télécharger » imprime la page (enregistrer en PDF) ; le PDF signé et horodaté vient du serveur.
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { ACCES, RELAIS_P } from './parametres'
import { JOURS_SEMAINE, montant } from './textes'
import './pr03.css'

export default function Convention() {
  const { t, tf } = usePreferences()
  const session = useSession()
  const r = session.relais
  const actif = !!r && r.statut !== 'candidat' && r.statut !== 'en_configuration' && r.statut !== 'clos'
  const g = RELAIS_P.garde
  const jour = t(JOURS_SEMAINE[RELAIS_P.versement.jourSemaine])
  const Article = ({ titre, children }: { titre: string; children: React.ReactNode }) => (
    <section className="p-yi6rkz pr3-article">
      <h3>{titre}</h3>
      {children}
    </section>
  )
  return (
    <Ecran route="convention" barre={actif}>
      <div className="p-0hxmj8 r-pile pr3">
        <div>
          <h1 className="p-bvhkrl">{t('Convention de partenariat point relais')}</h1>
          <div className="p-t2u0o2">{t('Version 1.0 et ses annexes, mises à jour pour le lancement. Ce résumé dit l’essentiel ; la convention signée fait foi.')}</div>
        </div>
        <button type="button" className="p-ncx7qc pr3-pas-imprime" onClick={() => window.print()}>
          <Icone nom="r-telecharger" taille={18} className="p-7dsggt" />
          {t('Télécharger ou imprimer')}
        </button>
        <Article titre={t('1. Qui fait quoi')}>
          <p>{t('Le relais est un commerce indépendant : aucun lien de subordination avec BelivaY, ni pour le gérant ni pour ses employés. Il reçoit, garde, remet, constate et fait partir les colis ; il constate, BelivaY décide.')}</p>
          <p>{tf('Au lancement, un seul relais par zone ({n}) ; un second relais dans une zone est une décision de BelivaY, selon le remplissage.', { n: ACCES.relaisParZone })}</p>
        </Article>
        <Article titre={t('2. Ce que vous gagnez')}>
          <ul>
            <li>{tf('Par colis remis ou retour déposé : {s} (petit), {m} (moyen), {l} (grand).', { s: montant(RELAIS_P.gainColis.S), m: montant(RELAIS_P.gainColis.M), l: montant(RELAIS_P.gainColis.L) })}</li>
            <li>{g.j1PayeParBelivay ? tf('Garde : {f} par jour et par colis gardé, le 1er jour compris (payé par BelivaY).', { f: montant(g.gainRelaisJour) }) : tf('Garde : {f} par jour facturé.', { f: montant(g.gainRelaisJour) })}</li>
            <li>{tf('Versement chaque {jour}, sans frais et sans minimum, sur le seul numéro de versement vérifié au nom du gérant.', { jour })}</li>
            <li>{t('Accès gratuit : aucune caution, aucun dépôt, aucun frais d’entrée.')}</li>
          </ul>
          <div className="pr3-defile" tabIndex={0} role="region" aria-label={t('Grille de garde, par jour au relais')}>
          <table className="pr3-grille">
            <caption className="pr3-sr">{t('Grille de garde, par jour au relais')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('Jour')}</th>
                {g.grille.map((_, i) => (
                  <th scope="col" key={i}>
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{t('Client')}</th>
                {g.grille.map((v, i) => (
                  <td key={i}>{v}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">{t('Relais')}</th>
                {g.grille.map((_, i) => (
                  <td key={i}>{i === 0 && !g.j1PayeParBelivay ? 0 : g.gainRelaisJour}</td>
                ))}
              </tr>
            </tbody>
          </table>
          </div>
          <p>{t('Montants en F CFA, par colis. Au-delà du 7e jour, le colis repart au vendeur ; les jours de fermeture, de constat ou de litige ne comptent pas dans la garde.')}</p>
        </Article>
        <Article titre={t('3. La garde en espèces')}>
          <p>{t('Le client paie la garde en espèces, au retrait, au montant calculé par l’application. Vous confirmez l’encaissement dans l’application : la remise reste bloquée tant que ce n’est pas fait. Vous gardez votre part ; le reste revient à BelivaY, déduit du versement du vendredi. Une commande à payer au comptoir se paie en Mobile Money sur le téléphone du client, jamais en espèces.')}</p>
        </Article>
        <Article titre={t('4. Les preuves')}>
          <ul>
            <li>{t('Une photo à chaque changement de main (réception, remise, départ, retour, constat), prise avec l’application, jamais depuis la galerie ; sans photo, l’étape reste bloquée.')}</li>
            <li>{t('Chaque geste est signé de votre code PIN personnel ; il ne se prête jamais.')}</li>
            <li>{tf('Les preuves sont gardées {j} jours et ne se modifient jamais ; vous pouvez les consulter et les exporter.', { j: RELAIS_P.preuvesConservationJours })}</li>
          </ul>
        </Article>
        <Article titre={t('5. Ce qui est interdit')}>
          <ul>
            <li>{t('Encaisser autre chose que la garde calculée par l’application, demander un paiement hors de l’application, accepter un pourboire pour un colis.')}</li>
            <li>{t('Remettre un colis sans code de retrait valide, sans encaissement ou paiement confirmé, sans photo, ou à une autre personne que le porteur nommé d’un colis de valeur.')}</li>
            <li>{t('Demander, noter ou redonner un code de retrait ; demander un code secret Mobile Money.')}</li>
            <li>{t('Accepter un lot sans code de dépôt ou un colis au scellé cassé, mouillé ou ouvert ; ouvrir un colis ou le garder hors du local déclaré.')}</li>
            <li>{t('Trancher un litige, promettre un remboursement, contacter un client, un vendeur ou un livreur hors de l’application.')}</li>
            <li>{t('Fermer sans déclarer, ou afficher des horaires qui ne sont pas tenus ; utiliser le matériel BelivaY pour une autre activité.')}</li>
          </ul>
        </Article>
        <Article titre={t('6. Sanctions et contestation')}>
          <p>{tf('Quatre niveaux : avertissement, visibilité réduite, suspension, exclusion pour fraude. Les niveaux 2 à 4 sont proposés par le calcul et décidés par une personne, avec un motif écrit. Chaque décision se conteste une fois ; réponse sous {h} h ouvrées.', { h: ACCES.contestationHeures })}</p>
        </Article>
        <Article titre={t('7. Durée et fin')}>
          <p>{tf('Durée indéterminée. La fin se demande avec un préavis de {j} jours ; les {n} derniers jours, plus aucun nouveau colis. Les colis restants sont remis ou transférés, le matériel BelivaY est rendu, le dernier versement part le {jour} qui suit la clôture. Toute évolution de la convention ou des montants est annoncée à l’avance, acceptée dans l’application, jamais rétroactive.', { j: RELAIS_P.finPreavisJours, n: RELAIS_P.finSansColisJours, jour })}</p>
        </Article>
        <Article titre={t('8. Vos données')}>
          <p>{t('Vos pièces ne sont jamais montrées ; les clients voient votre prénom et l’initiale de votre nom, la photo de la façade, jamais votre numéro. Vous consultez, corrigez et exportez vos données (loi n° 2024/017).')}</p>
        </Article>
      </div>
    </Ecran>
  )
}
