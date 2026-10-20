// Solde publicitaire (AJ-P, DP-59) : recharger par Mobile Money (demande envoyée sur le téléphone, confirmée dans le
// menu de l'opérateur avec le code secret ; rien n'est crédité avant), historique (recharges, dépenses, heures non
// diffusées remboursées) filtré, facture publicitaire de chaque mouvement, export. Jamais retenu sur les versements.
// Adresse : ?recharger=1 ouvre la recharge.
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { F } from '@client/i18n/format'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { MouvementPub, Recharge, ReglesPub } from '../../donnees/domaines/publicite'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { echeance } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { Bouton, Chargement, EcranAJP, Erreur, Feuille, Selecteur, telecharger, useCompteur, useEnLigne, useF, useToast } from './commun'

const ROUTE = 'publicite_solde'
type Filtre = 'tout' | 'recharge' | 'depense' | 'remboursement'

function FeuilleRecharge({ regles, numero, fermer, fait }: { regles: ReglesPub; numero: string; fermer: () => void; fait: (m: number) => void }) {
  const { t, tf } = usePreferences()
  const f = useF()
  const enLigne = useEnLigne()
  const [txt, setTxt] = useState('10000')
  const [demande, setDemande] = useState<Recharge | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const m = Number(txt)
  const min = regles.rechargeMin
  const invalide = !Number.isInteger(m) || m < min // la source refuse de même (recharger, VD-PUB-SOLDE)
  const envoyer = async () => {
    setOccupe(true)
    setErreur(null)
    const r = await source.publicite.recharger(m)
    setOccupe(false)
    if (r.ok) {
      jouer('code')
      setDemande(r.demande)
    } else setErreur(tf('{a} F au moins.', { a: F(min) }))
  }
  const verifier = async () => {
    if (!demande) return
    setOccupe(true)
    const r = await source.publicite.recharge(demande.id)
    setOccupe(false)
    if (r?.statut === 'confirme') {
      jouer('paiement')
      fait(r.montant)
    } else {
      setDemande(null)
      jouer('erreur')
      setErreur(t('Paiement non confirmé. Rien n’a été crédité.'))
    }
  }
  return (
    <Feuille ouverte fermer={fermer} titre={t('Recharger le solde')}>
      <h2 className="pg-t" style={{ fontSize: '19px' }}>
        {t(demande ? 'Confirmez sur votre téléphone' : 'Recharger le solde publicitaire')}
      </h2>
      {demande ? (
        <>
          <div className="note or">
            <Icone nom="smartphone" taille={18} />
            <div>
              <b>{tf('Demande de {m} F envoyée sur votre téléphone ({n}).', { m: F(demande.montant), n: numero })}</b>
            </div>
          </div>
          <div className="note">
            <Icone nom="key-round" taille={18} />
            <div>{t('Tapez votre code secret dans le menu de votre opérateur pour confirmer. BelivaY ne vous demande jamais ce code.')}</div>
          </div>
        </>
      ) : (
        <>
          <p className="pg-s">{tf('Payé par Mobile Money ({n}). Le solde ne sert qu’à la publicité ; rien n’est pris sur vos versements.', { n: numero })}</p>
          <div className="fld">
            <label htmlFor="ajp-recharge">{t('Montant (F)')}</label>
            <div className={'inp' + (invalide && txt ? ' err' : '')}>
              <input id="ajp-recharge" className="ajp-champ" inputMode="numeric" value={txt} onChange={(e) => setTxt(e.target.value.replace(/\D/g, '').slice(0, 7))} />
              <span className="t14 b7 c3">F</span>
            </div>
          </div>
          <div className="ajp-montants">
            {[5000, 10000, 25000, 50000].filter((x) => x >= min).map((x) => (
              <button key={x} type="button" className={'chip' + (m === x ? ' on' : '')} onClick={() => setTxt(String(x))}>
                {f(x)}
              </button>
            ))}
          </div>
          {invalide && <p className="t13 cr mt6">{tf('{a} F au moins.', { a: F(min) })}</p>}
        </>
      )}
      {erreur && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={16} />
          <div>{erreur}</div>
        </div>
      )}
      <div className="mt14">
        {demande ? (
          <Bouton classe="primary" icone="circle-check" inactif={occupe || !enLigne} onClick={() => void verifier()}>
            {t('J’ai confirmé sur mon téléphone')}
          </Bouton>
        ) : (
          <Bouton classe="primary" icone="smartphone" inactif={invalide || occupe || !enLigne} onClick={() => void envoyer()}>
            {tf('Payer {m} F', { m: F(m || 0) })}
          </Bouton>
        )}
        {!enLigne && <p className="t13 cr mt6">{t('Pas de connexion : réessayez dans un moment.')}</p>}
      </div>
      <div className="mt8">
        <Bouton
          classe="ghost"
          onClick={async () => {
            if (demande) {
              await source.publicite.annulerRecharge(demande.id)
              setDemande(null)
            } else fermer()
          }}
        >
          {t(demande ? 'Annuler la demande' : 'Annuler')}
        </Bouton>
      </div>
    </Feuille>
  )
}

export default function Solde() {
  const { t, tf, langue } = usePreferences()
  const f = useF()
  const maintenant = useHorloge()
  const [params, setParams] = useSearchParams()
  const { dire, toast } = useToast()
  const [filtre, setFiltre] = useState<Filtre>('tout')
  const lecture = useLecture(() => Promise.all([source.publicite.tableau(), source.publicite.mouvements()]), [])
  const solde = useCompteur(lecture.donnees?.[0].solde ?? 0)
  const liste = useMemo(() => (lecture.donnees?.[1] ?? []).filter((m) => filtre === 'tout' || m.type === filtre), [lecture.donnees, filtre])
  if (lecture.erreur) return <Erreur route={ROUTE} erreur={lecture.erreur} relire={lecture.relire} />
  if (!lecture.donnees) return <Chargement route={ROUTE} />
  const [tb, mouvements] = lecture.donnees
  const ouverte = params.get('recharger') === '1'
  const fermer = () => setParams({}, { replace: true })
  const numero = `${tb.regles.numero.operateur} ${tb.regles.numero.masque}`
  const facture = (m: MouvementPub) =>
    telecharger(
      `${m.facture}.txt`,
      [
        t('Facture publicitaire'),
        `${t('Numéro')} : ${m.facture}`,
        `${t('Date')} : ${echeance(m.le, maintenant, langue)}`,
        `${t('Objet')} : ${t(m.libelle)}`,
        `${t('Montant')} : ${F(Math.abs(m.montant))} F`,
        `${t('TVA')} : 0 F`,
        t(m.type === 'recharge' ? 'Payé par Mobile Money.' : m.type === 'remboursement' ? 'Rendu au solde publicitaire (heures non diffusées).' : 'Pris sur le solde publicitaire.'),
      ].join('\n'),
    )
  const exporter = () =>
    telecharger(
      'solde-publicitaire.csv',
      ['date;type;libelle;montant;facture', ...mouvements.map((m) => [new Date(m.le).toISOString(), m.type, `"${m.libelle.replace(/"/g, '""')}"`, m.montant, m.facture ?? ''].join(';'))].join('\n'),
      'text/csv',
    )
  const totaux = {
    recharge: mouvements.filter((m) => m.type === 'recharge').reduce((s, m) => s + m.montant, 0),
    depense: -mouvements.filter((m) => m.type === 'depense').reduce((s, m) => s + m.montant, 0),
    remboursement: mouvements.filter((m) => m.type === 'remboursement').reduce((s, m) => s + m.montant, 0),
  }
  return (
    <EcranAJP route={ROUTE} fixes={toast}>
      <div className="pg" style={{ paddingTop: '14px' }}>
        <h1 className="pg-t">{t('Solde publicitaire')}</h1>
        <p className="pg-s">{t('Rechargé par Mobile Money, il paie vos campagnes. Jamais retenu sur vos versements.')}</p>
      </div>
      <div className="ajp-solde">
        <div className="k">{t('Disponible')}</div>
        <div className="v" data-solde={tb.solde}>
          {f(Math.round(solde))}
        </div>
        <div className="s">{tf('Dont clics du jour réservés : {m} F.', { m: F(Math.max(0, mouvements.reduce((s, m) => s + m.montant, 0) - tb.solde)) })}</div>
        <div className="ajp-act">
          <Bouton classe="primary" icone="smartphone" onClick={() => setParams({ recharger: '1' }, { replace: true })}>
            {t('Recharger')}
          </Bouton>
          <Bouton classe="secondary" icone="megaphone" vers={chemin('publicite')}>
            {t('Mes campagnes')}
          </Bouton>
        </div>
      </div>
      <div className="ajp-tuiles trois">
        <div className="ajp-tuile">
          <div className="tk">{t('Rechargé')}</div>
          <div className="tv">{f(totaux.recharge)}</div>
        </div>
        <div className="ajp-tuile">
          <div className="tk">{t('Dépensé')}</div>
          <div className="tv">{f(totaux.depense)}</div>
        </div>
        <div className="ajp-tuile">
          <div className="tk">{t('Remboursé')}</div>
          <div className="tv cg">{f(totaux.remboursement)}</div>
          <div className="ts">{t('heures non diffusées')}</div>
        </div>
      </div>
      <Selecteur
        etiquette="Filtrer l’historique"
        valeur={filtre}
        changer={setFiltre}
        choix={[
          ['tout', 'Tout'],
          ['recharge', 'Recharges'],
          ['depense', 'Dépenses'],
          ['remboursement', 'Remboursements'],
        ]}
      />
      <div className="card" style={{ marginTop: '12px' }}>
        {liste.length === 0 ? (
          <div className="empty">
            <h3>{t('Rien pour ce filtre')}</h3>
          </div>
        ) : (
          liste.map((m) => (
            <div className="ajp-mv" key={m.id} data-mouvement={m.type}>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="t13 b7">{t(m.libelle)}</div>
                <div className="t12 c3">{`${echeance(m.le, maintenant, langue)}${m.facture ? ' · ' + m.facture : ''}`}</div>
              </div>
              <span className={'m' + (m.montant > 0 ? ' plus' : '')}>{`${m.montant > 0 ? '+' : '−'}${f(Math.abs(m.montant))}`}</span>
              {m.facture && (
                <button type="button" className="ibtn" aria-label={tf('Télécharger la facture {n}', { n: m.facture })} onClick={() => facture(m)}>
                  <Icone nom="download" taille={18} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
      <div className="mt12">
        <Bouton classe="secondary" icone="file-text" onClick={exporter}>
          {t('Exporter l’historique')}
        </Bouton>
      </div>
      {ouverte && (
        <FeuilleRecharge
          regles={tb.regles}
          numero={numero}
          fermer={fermer}
          fait={(m) => {
            fermer()
            lecture.relire()
            dire(tf('Solde rechargé de {m} F. La facture est dans l’historique.', { m: F(m) }))
          }}
        />
      )}
    </EcranAJP>
  )
}
