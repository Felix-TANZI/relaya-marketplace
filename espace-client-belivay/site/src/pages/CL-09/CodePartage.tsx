// Écran « Envoyer à quelqu'un » (CL-09), forme d'origine du prototype rendue réelle (DP-54) : la feuille posée sur
// le code de retrait (masqué : ton code n'est jamais partagé) ; la personne (prénom, numéro contrôlé) reçoit son
// propre code par SMS, avec le message qu'elle lit ; son nom s'affiche sur l'écran du gérant (pièce d'identité dès
// 100 000 F) ; un montant dû se paie depuis ton téléphone au retrait ; on peut retirer la délégation.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { chiffres, erreurNumero, espacer, masquer } from '../../donnees/numeros'
import { source, type CommandeClient } from '../../donnees/source'
import { F } from '../../i18n/format'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { CommandeIntrouvable } from '../CL-08/Confirmee'
import { Code6, echeancier, ouvertureDuJour, useRelais } from './Commun'

const PIECE_DES = 100000 // pièce d'identité au comptoir dès ce montant

export function CodePartage() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const ref = params.get('ref') ?? 'BLV-52018'
  const [d, setD] = useState<{ commande: CommandeClient; maintenant: number } | null | undefined>(undefined)
  const [prenom, setPrenom] = useState('')
  const [numero, setNumero] = useState('')
  const [vu, setVu] = useState(false)
  const relais = useRelais(d?.commande.lieu)
  const charger = () => source.commandeClient(ref).then(setD)
  useEffect(() => {
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])
  if (d === undefined) return null
  if (!d) return <CommandeIntrouvable route="code-partage" />
  const c = d.commande
  const n = c.colis.filter((x) => !x.annule).length
  const gerant = relais ? t(relais.gerant) : t('le gérant')
  const errPrenom = prenom.trim().length < 2 ? 'Écris son prénom.' : null
  const errNum = erreurNumero(numero)
  const confier = async () => {
    setVu(true)
    if (errPrenom || errNum) return
    await source.deleguerRetrait(c.ref, prenom.trim(), masquer(chiffres(numero)))
    charger()
  }
  const garde = c.garde
  const ech = garde ? echeancier(c, d.maintenant, relais?.ferme ?? null) : null
  const ouverture = relais ? ouvertureDuJour(relais, d.maintenant) : null

  const feuille = (
    <>
      <div className="veil" onClick={() => naviguer(chemin('code', { ref: c.ref }))}></div>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t('Envoyer à quelqu’un')}>
        <div className="grab"></div>
        {c.delegue ? (
          <>
            <b className="t17 b8">{tf('{p} peut retirer ta commande', { p: c.delegue.prenom })}</b>
            <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
              {c.code && (c.etat === 'retirable' || c.etat === 'comptoir')
                ? tf('Son code est parti par SMS au {n}.', { n: c.delegue.numero })
                : tf('Son code partira par SMS au {n} dès l’arrivée de tes colis au relais.', { n: c.delegue.numero })}{' '}
              {c.total >= PIECE_DES ? t('Au comptoir, il montre ce code et sa pièce d’identité.') : t('Au comptoir, il montre ce code : aucune pièce n’est demandée.')}
            </p>
            {relais && (
              <div className="hint-l">
                <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
                <span>
                  {tf('Dis-lui : {l}, {h}, fermé le {f}.', { l: t(c.lieu), h: t(relais.horaires), f: t(relais.ferme) })}
                  {ech ? ' ' + tf('À retirer avant {d} au soir, sinon les colis repartent chez le vendeur.', { d: jourSeul(ech.dernier.le, langue) }) : ''}
                </span>
              </div>
            )}
            <div className="hint-l">
              <Icone nom="smartphone" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{t('S’il y a un montant dû, la demande de paiement arrive sur ton téléphone au moment du retrait.')}</span>
            </div>
            <div className="btns">
              <button type="button" className="btn secondary" onClick={() => source.deleguerRetrait(c.ref, '', null).then(charger)}>
                <Icone nom="x" taille={18} />
                <span>{t('Retirer la délégation')}</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <b className="t17 b8">{t('Envoyer à quelqu’un')}</b>
            <p className="t13 c3" style={{ margin: '6px 0 0', lineHeight: '1.45' }}>
              {tf('La personne qui a ce code retire tes {n} colis sans autre justificatif. Ne l’envoie qu’à quelqu’un de confiance. Elle reçoit son propre code par SMS : ne donne jamais le tien.', { n })}
            </p>
            <div className="cl09-msg">
              {t('Code de retrait BelivaY : ')}
              <b className="nofmt">{'••• •••'}</b>
              {ouverture
                ? tf('. {n} colis au {l} ({g}), {o}. Le code vaut le colis.', { n, l: t(c.lieu), g: gerant, o: tf(ouverture.texte, ouverture.v).toLowerCase() })
                : tf('. {n} colis au {l}. Le code vaut le colis.', { n, l: t(c.lieu) })}
            </div>
            <div className="fld">
              <label htmlFor="cp-prenom">{t('Son prénom')}</label>
              <div className={'inp' + (vu && errPrenom ? ' err' : '')}>
                <Icone nom="user-round" taille={18} style={{ color: 'var(--ink-3)', flexShrink: '0' }} />
                <input id="cp-prenom" className="grow" value={prenom} maxLength={30} placeholder={t('Nom et prénom')} onChange={(e) => setPrenom(e.target.value)} />
              </div>
              <div className="hint">
                {c.total >= PIECE_DES
                  ? tf('Son nom s’affiche sur l’écran de {g}. Obligatoire dès 100 000 F : la personne montre sa pièce d’identité.', { g: gerant })
                  : tf('Son nom s’affiche sur l’écran de {g}.', { g: gerant })}
              </div>
            </div>
            <div className="fld">
              <label htmlFor="cp-num">{t('Son numéro')}</label>
              <div className={'inp' + (vu && errNum ? ' err' : '')}>
                <b className="t15">+237</b>
                <input id="cp-num" className="grow" type="tel" inputMode="tel" placeholder="6XX XX XX XX" value={numero} onChange={(e) => setNumero(espacer(e.target.value))} />
              </div>
              {vu && (errPrenom || errNum) && (
                <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
                  {t(errPrenom ?? errNum ?? '')}
                </div>
              )}
            </div>
            <div className="hint-l">
              <Icone nom="smartphone" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{t('S’il y a un montant dû, la demande de paiement arrive sur ton téléphone au moment du retrait.')}</span>
            </div>
            <div className="btns">
              <button type="button" className="btn primary" onClick={confier}>
                <Icone nom="share" taille={18} />
                <span>{t('Envoyer son code par SMS')}</span>
              </button>
            </div>
            <div className="t12 c3 center mt8">{t('Le SMS part de BelivaY : gratuit. Tu peux annuler à tout moment.')}</div>
            {relais && ech && <div className="t12 c3 center mt4">{tf('À retirer avant {d} au soir · {h}', { d: jourSeul(ech.dernier.le, langue), h: t(relais.horaires) })}</div>}
          </>
        )}
        <div className="links">
          <Link to={chemin('commande', { ref: c.ref })}>{t('Revenir à la commande')}</Link>
        </div>
      </div>
    </>
  )

  return (
    <Ecran route="code-partage" sousTitre={c.ref} fixes={feuille}>
      <div className="cl09">
        {c.code && (
          <div className="hero night center">
            <div className="hk">{tf('À montrer à {g}', { g: gerant })}</div>
            <Code6 code={c.code} masque />
            <div className="hs mt10">{tf(n > 1 ? '{n} colis · un seul code · {l}' : '{n} colis · {l}', { n, l: t(c.lieu) })}</div>
          </div>
        )}
        {garde && garde.du > 0 && ech && (
          <div className="card">
            <div className="cl09-due">
              <span className="grow">
                <span className="kick">{t('Montant dû')}</span>
                <span className="price big">
                  {F(garde.du)}
                  <small>{t(' F')}</small>
                </span>
              </span>
              <Link to={chemin('comptoir-payer', { ref: c.ref })} className="btn soft sm">
                <span>{tf('Payer {m} F', { m: F(garde.du) })}</span>
              </Link>
            </div>
            <div className="t13 c3 mt6">
              {[
                tf('{m} F demain', { m: F(garde.demain) }),
                ech.suivant ? tf('{m} F de plus {d}', { m: F(ech.suivant.frais), d: jourSeul(ech.suivant.le, langue) }) : null,
                tf('retrait avant {d} au soir', { d: jourSeul(ech.dernier.le, langue) }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
            <Link to={chemin('garde', { ref: c.ref })} className="cl09-link mt4">
              {t('Détail des frais de garde')}
              <Icone nom="chevron-right" taille={15} />
            </Link>
          </div>
        )}
      </div>
    </Ecran>
  )
}
