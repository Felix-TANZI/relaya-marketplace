// Cartes du départ (DP-66, DP-67), partagées par « Demander à quitter » (Moi) et l'état du compte au rattachement fermé
// (LIV-P32, accessible même accès fermé) :
// - « Mon kit » : constat de l'entreprise (au plus tard DEPART-KIT-CONSTAT-H après la fin du préavis) ; incomplet :
//   éléments manquants, retenue plafonnée à KIT-VALEUR-F sur le dernier relevé, « Contester » (motif) : BelivaY décide,
//   le montant est mis de côté d'ici là ; sans constat dans le délai, BelivaY clôture « kit non contesté », sans retenue ;
// - « Mon dernier versement » : estimé à ce jour pendant le préavis, figé à la clôture ; missions validées, montants
//   retenus (litiges ouverts, au plus le montant contesté ; kit), versé en Mobile Money le vendredi qui suit la clôture,
//   « versement fait » ; deux SMS seulement (clôture, versement fait), même accès fermé.
import { useState } from 'react'
import { F } from '@client/i18n/format'
import { PARAMETRES } from '../../calculs/registre'
import { Btn, Hint, Kv, Li, Note, Sec } from '../../composants/proto'
import { signal } from '../../composants/signaux'
import type { Depart } from '../../donnees/domaines/moi'
import { useEnLigne } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useOrigine } from '../LIV-08/commun'

const francs = (n: number) => F(n) + ' F'

/** « Mon kit » : constat, retenue et contestation. */
export function CarteKit({ depart, entreprise, relire }: { depart: Depart; entreprise: string; relire: () => void }) {
  const { t, tf, langue } = usePreferences()
  const o = useOrigine()
  const en = useEnLigne()
  const [ouvert, setOuvert] = useState(false)
  const [motif, setMotif] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const k = depart.kit
  const c = k.contestation
  const contester = async () => {
    setEnvoi(true)
    const r = await source.moi.contesterKit(motif.trim(), o())
    setEnvoi(false)
    if (!r.ok) {
      signal('erreur')
      return setErreur(r.raison === 'deja_contestee' ? 'Cette retenue est déjà contestée.' : r.raison === 'motif' ? 'Écrivez pourquoi vous la contestez.' : 'Aucune retenue à contester.')
    }
    signal('succes')
    setOuvert(false)
    setMotif('')
    relire()
  }
  return (
    <>
      <Sec titre={t('Mon kit')} />
      <div className="card tight">
        {depart.kitNonConteste ? (
          <Li icone="circle-check" ton="green" t={t('Kit non contesté')} s={tf('{entreprise} n’a rien constaté dans le délai : aucune retenue.', { entreprise })} />
        ) : k.constat === 'restitue' ? (
          <Li icone="circle-check" ton="green" t={t('Kit rendu complet')} s={tf('Constaté par {entreprise} : aucune retenue.', { entreprise })} />
        ) : k.constat === 'incomplet' ? (
          <Li icone="package-x" ton="red" t={tf('Kit incomplet : {m}', { m: k.manquants.join(', ') })} s={tf('Retenue de {m} sur votre dernier relevé (au plus {max}, la valeur du kit).', { m: francs(k.retenue), max: francs(PARAMETRES.livreur.kitValeur.total) })} />
        ) : (
          <Li icone="boxes" ton="amber" t={t('Kit à rendre à votre entreprise')} s={tf('{entreprise} constate son état au plus tard le {d} à {h}. Sans constat dans ce délai : « kit non contesté », aucune retenue.', { entreprise, d: jourLong(k.constatJusqua, langue), h: heure(k.constatJusqua, langue) })} />
        )}
      </div>
      {k.constat === 'incomplet' && !depart.kitNonConteste && k.retenue > 0 && (
        <>
          {c ? (
            <Note ton={c.decision === 'annulee' ? 'green' : c.decision === 'maintenue' ? 'ink' : 'amber'} icone="scale" role="status">
              {c.decision === 'annulee' ? (
                <>
                  <b>{tf('Retenue annulée par BelivaY le {d}.', { d: jourLong(c.decideLe ?? 0, langue) })}</b> {t('Rien n’est retenu sur votre kit.')}
                </>
              ) : c.decision === 'maintenue' ? (
                <>
                  <b>{tf('Retenue maintenue par BelivaY le {d}.', { d: jourLong(c.decideLe ?? 0, langue) })}</b> {t('Elle est déduite de votre dernier versement.')}
                </>
              ) : (
                <>
                  <b>{tf('Contestée le {d}.', { d: jourLong(c.le, langue) })}</b> {tf('BelivaY décide ; {m} sont mis de côté d’ici là.', { m: francs(k.retenue) })}
                </>
              )}
            </Note>
          ) : ouvert ? (
            <div className="card flat">
              <div className="lc-champ">
                <label htmlFor="l10-kit-motif">{t('Pourquoi contestez-vous ?')}</label>
                <textarea id="l10-kit-motif" maxLength={300} value={motif} onChange={(e) => (setMotif(e.target.value), setErreur(null))} placeholder={t('Par exemple : j’ai rendu les pochettes au chef d’équipe.')} />
              </div>
              {erreur && (
                <Note ton="red" icone="circle-alert" role="alert">
                  {t(erreur)}
                </Note>
              )}
              {!en && <Hint icone="wifi-off">{t('Il faut du réseau pour envoyer la contestation.')}</Hint>}
              <div className="btns" style={{ marginTop: 10 }}>
                <Btn kind="primary" icone="send" off={!en || envoi || !motif.trim()} onClick={() => void contester()}>
                  {t('Envoyer ma contestation')}
                </Btn>
                <Btn kind="ghost" onClick={() => (setOuvert(false), setErreur(null))}>
                  {t('Annuler')}
                </Btn>
              </div>
            </div>
          ) : (
            <>
              <Hint icone="scale">{tf('Pas d’accord ? Contestez : BelivaY décide, et les {m} sont mis de côté d’ici là.', { m: francs(k.retenue) })}</Hint>
              <div className="btns" style={{ marginTop: 8 }}>
                <Btn kind="secondary" icone="scale" onClick={() => setOuvert(true)}>
                  {t('Contester la retenue')}
                </Btn>
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}

/** « Mon dernier versement » : estimé pendant le préavis, figé à la clôture, fait. */
export function CarteVersement({ depart, entreprise }: { depart: Depart; entreprise: string }) {
  const { t, tf, langue } = usePreferences()
  const v = depart.versement
  const close = depart.etat === 'close'
  return (
    <>
      <Sec titre={close ? t('Mon dernier versement') : t('Mon dernier versement · estimé à ce jour')} />
      <div className="card">
        <Kv k={t('Missions validées')} v={String(v.missions)} />
        <Kv k={t('Montant dû')} v={v.du === null ? tf('selon votre accord avec {entreprise}', { entreprise }) : francs(v.du)} />
        {v.retenuLitiges > 0 && <Kv k={v.litiges === 1 ? t('Retenu · 1 litige ouvert') : tf('Retenu · {n} litiges ouverts', { n: v.litiges })} v={'− ' + francs(v.retenuLitiges)} />}
        {v.retenueKit > 0 && <Kv k={t('Retenue sur le kit')} v={'− ' + francs(v.retenueKit)} />}
        {v.kitDeCote > 0 && <Kv k={t('Kit contesté · mis de côté')} v={francs(v.kitDeCote)} />}
        <Kv k={t('Versé en Mobile Money')} v={v.verse === null ? '—' : francs(v.verse)} cls="b8" />
        <Kv k={t('Date')} v={depart.versementLe ? jourLong(depart.versementLe, langue) : t('le vendredi qui suit la clôture')} />
      </div>
      {v.faitLe ? (
        <Note ton="green" icone="circle-check" role="status">
          <b>{tf('Versement fait le {d}.', { d: jourLong(v.faitLe, langue) })}</b> {tf('Par {entreprise}, sur votre Mobile Money.', { entreprise })}
        </Note>
      ) : null}
      <Hint icone="wallet">{t('Toutes vos missions validées sont payées. Seuls les montants liés à un litige ouvert sont retenus, au plus le montant contesté, et versés dès le litige réglé.')}</Hint>
      <Hint icone="smartphone">{t('Deux SMS vous préviennent, même si votre accès est fermé : à la clôture, avec la date du versement, puis quand il est fait.')}</Hint>
    </>
  )
}
