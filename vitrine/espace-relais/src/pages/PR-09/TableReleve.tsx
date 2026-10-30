// Relevé d'une semaine de versement, ligne par ligne (balisage du tableau « Le détail de la semaine » du prototype :
// p-hpt8pg, en-tête p-arid2n, lignes p-npmc86, total p-ovpzya) : ce que le relais a GAGNÉ (colis remis par classe,
// retours déposés, jours de garde facturés, 1er jour payé par BelivaY, jours payés par BelivaY sur un
// renvoi), puis ce qui en est DÉDUIT (espèces de garde : la part du relais déjà en caisse et la part BelivaY, ARL-05 ;
// retenue fiscale à PR-RETENUE-FISCALE-PCT, ARL-34 ; report d'une semaine négative), et le NET versé. Chaque montant
// vient du relevé calculé par le serveur ; l'écran n'additionne rien qu'il n'affiche.
import { F } from '@client/i18n/format'
import type { LigneVersement, Versement } from '../../donnees/domaines/argent'
import { jourCourt, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { francs, libelleLigne } from './commun'
import { PR } from './parametres'

const GAINS: LigneVersement['type'][] = ['colis', 'retour', 'jour_garde', 'jour_offert_belivay', 'jour_paye_belivay', 'bonus_comptoir']

export function TableReleve({ v, titre }: { v: Versement; titre?: string }) {
  const { t, tf, langue } = usePreferences()
  const id = 'r9-releve-' + v.id
  const debut = new Date(v.semaine.du + 'T12:00:00Z').getTime()
  const fin = new Date(v.semaine.au + 'T12:00:00Z').getTime()
  const gains = v.lignes.filter((l) => GAINS.includes(l.type) && (l.type === 'colis' || l.type === 'jour_garde' || l.type === 'jour_offert_belivay' || l.montant !== 0))
  const deduits = v.lignes.filter((l) => !GAINS.includes(l.type) && (l.montant !== 0 || l.type === 'retenue_fiscale' || l.type === 'especes_part_belivay'))
  const ligne = (l: LigneVersement, k: number) => (
    <div className={'p-npmc86 r9-ligne' + (l.montant < 0 ? ' r9-deduit' : '')} role="row" key={l.type + (l.classe ?? '') + k}>
      <span role="cell">{t(libelleLigne(l))}</span>
      <span className="p-nw7nov" role="cell">
        {l.type === 'retenue_fiscale' || l.quantite === 0 ? '' : F(l.quantite)}
      </span>
      <span className="p-nw7nov" role="cell">
        {l.type === 'retenue_fiscale' ? `${l.quantite} %` : l.taux ? francs(l.taux) : ''}
      </span>
      <span className="p-06slq2" role="cell">
        {francs(l.montant)}
      </span>
    </div>
  )
  return (
    <div className="p-hpt8pg">
      <div className="p-unncbq">
        <h2 className="p-9j1bbu" id={id}>
          {titre ?? t('Le détail de la semaine')}
        </h2>
      </div>
      <div className="r9-periode">{tf('Du {du} au {au}', { du: jourCourt(debut, langue), au: jourLong(fin, langue) })}</div>
      <div className="r9-table" role="table" aria-labelledby={id}>
      <div className="p-arid2n r9-ligne" role="row">
        <span role="columnheader">{t('LIGNE')}</span>
        <span className="p-06slq2" role="columnheader">
          {t('QTÉ')}
        </span>
        <span className="p-06slq2" role="columnheader">
          {t('TARIF')}
        </span>
        <span className="p-06slq2" role="columnheader">
          {t('TOTAL')}
        </span>
      </div>
      {gains.map(ligne)}
      <div className="p-npmc86 r9-ligne r9-sous-total" role="row">
        <span role="cell">{t('Gagné cette semaine')}</span>
        <span role="cell" />
        <span role="cell" />
        <span className="p-06slq2" role="cell">
          {francs(v.gagne)}
        </span>
      </div>
      {deduits.map(ligne)}
      <div className="p-ovpzya" role="row">
        <span role="cell">{v.report > 0 ? t('Rien à verser') : v.etat === 'credite' ? t('Net versé') : t('Net à verser')}</span>
        <span className="p-exl0y8" role="cell">
          {francs(v.total)}
        </span>
      </div>
      </div>
      {v.report > 0 && (
        <div className="r9-report" role="note">
          {tf('Solde négatif de {m} : reporté sur le versement suivant.', { m: francs(v.report) })}
        </div>
      )}
      <div className="p-81u2s6">{t('C’est BelivaY qui vous paie, même quand la livraison est offerte au client.')}</div>
      <div className="p-81u2s6">{tf('Les espèces de garde se paient au comptoir : vous gardez {j} par jour facturé, le reste revient à BelivaY et se déduit ici. Le 1er jour, gratuit pour le client, vous est payé par BelivaY.', { j: francs(PR.garde.gainRelaisJour) })}</div>
    </div>
  )
}
