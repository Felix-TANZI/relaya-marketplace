// Écran « Lien court » (CL-10), forme d'origine du prototype rendue réelle (DP-54) : la page web ouverte depuis le
// SMS de retrait (?ref=…), sans l'application : commande, QR et code de retrait, montant dû aujourd'hui et demain,
// relais (gérant, horaires, jour de fermeture), itinéraire ; le lien est personnel et s'arrête dès le retrait
// (« Colis retiré · ce lien ne sert plus », avec la fin du délai pour signaler un problème).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import img_be926f70d2b8_png from '../../assets/prototype/be926f70d2b8.png'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type CommandeClient } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { echeancier, Groupe, jeton, ouvertureDuJour, Qr, RENVOI_GARDE, useRelais } from '../CL-09/Commun'
import { lienItineraire } from '../../connecteurs/cartes'

export function LienCourt() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? 'BLV-52018'
  const [c, setC] = useState<CommandeClient | null | undefined>(undefined)
  const [maintenant, setMaintenant] = useState(Date.now())
  const colonnes = useDes('tab-l')
  const relais = useRelais(c?.lieu)
  useEffect(() => {
    source.commandeClient(ref).then((x) => (setC(x?.commande ?? null), x && setMaintenant(x.maintenant)))
  }, [ref])
  if (c === undefined) return null
  const valable = !!c && c.etat === 'retirable' && !!c.code
  const fini = !c || c.etat === 'retiree' || c.etat === 'annulee' || c.etat === 'litige'
  const n = c ? c.colis.filter((x) => !x.annule).length : 0
  const url = (
    <div className="cl10-url">
      <Icone nom="lock" taille={14} />
      <span>{'belivay.com/r/' + jeton(ref)}</span>
    </div>
  )
  if (!valable)
    return (
      <Ecran route="lien-court">
        <div className="cl10-br" style={{ marginTop: '14px' }}>
          {url}
          <div className="cl10-web">
            <img className="lg" src={img_be926f70d2b8_png} alt="BelivaY" />
            <div className="center mt20">
              <div className={'ic-sq ' + (c?.etat === 'retiree' ? 'green' : 'or')} style={{ margin: '0 auto' }}>
                <Icone nom={c?.etat === 'retiree' ? 'package-check' : fini ? 'link' : 'hourglass'} taille={22} />
              </div>
              <h2 className="t17 b8 mt12" style={{ marginBottom: '0' }}>
                {t(!c ? 'Lien inconnu' : c.etat === 'retiree' ? (n > 1 ? 'Colis retirés' : 'Colis retiré') : c.etat === 'annulee' ? 'Commande annulée' : c.etat === 'litige' ? 'Colis gardé au relais' : 'Pas encore retirable')}
              </h2>
              {c && (
                <p className="t14 c2 mt6" style={{ lineHeight: '1.5' }}>
                  {c.retireeLe
                    ? tf('{ref} · retiré le {d} au {l}.', { ref: c.ref, d: dateA(c.retireeLe, langue), l: t(c.lieu) })
                    : c.annulee
                      ? tf('{ref} · annulée le {d}.', { ref: c.ref, d: dateA(c.annulee.le, langue) })
                      : c.etat === 'comptoir'
                        ? tf('{ref} · le code s’affiche dans l’application après le paiement au comptoir.', { ref: c.ref })
                        : tf('{ref} · {l}.', { ref: c.ref, l: t(c.lieu) })}
                </p>
              )}
            </div>
            <div className="note ink">
              <Icone nom="lock" taille={18} />
              <div>{t(fini ? 'Ce lien ne sert plus : le code de retrait n’est plus valable.' : 'Le code s’affiche ici dès que tes colis peuvent être retirés.')}</div>
            </div>
            {c?.retourJusqua && (
              <div className="note or">
                <Icone nom="circle-help" taille={18} />
                <div>{tf('Un problème ? Tu as jusqu’au {d} pour le signaler depuis ton compte BelivaY.', { d: dateA(c.retourJusqua, langue) })}</div>
              </div>
            )}
            {c && (
              <div className="btns mt14">
                <Link to={chemin('commande', { ref: c.ref })} className="btn secondary">
                  <span>{t('Voir ma commande dans l’application')}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </Ecran>
    )
  const k = c!
  const code = k.code!
  return (
    <Ecran route="lien-court" largeur={colonnes ? 'moyen' : undefined}>
      <div className="cl10-br" style={{ marginTop: '14px' }}>
        {url}
        <div className="cl10-web">
          {/* Grands écrans (§ 5.9) : le code à gauche, le relais et les actions à droite. */}
          <Groupe si={colonnes} classe="cl10-web-g">
          <img className="lg" src={img_be926f70d2b8_png} alt="BelivaY" />
          <div className="kick mt16">{tf('Retrait · {ref}', { ref: k.ref })}</div>
          <h2 className="t19 b8" style={{ margin: '4px 0 0', lineHeight: '1.25' }}>
            {tf(n > 1 ? 'Tes {n} colis t’attendent au {l}' : 'Ton colis t’attend au {l}', { n, l: t(k.lieu) })}
          </h2>
          <div className="cl10-qr">
            <Qr texte={k.ref + ':' + code} />
          </div>
          <div className="center t13 c3 b7 mt12">{t('Code de retrait')}</div>
          <div className="cl10-dig" aria-label={code.split('').join(' ')}>
            {code.split('').map((x, i) => (
              <span key={i} className="nofmt">
                {x}
              </span>
            ))}
          </div>
          {k.garde && (
            <div className="cl10-due">
              <div className="cl10-k">
                <Icone nom="hourglass" taille={15} />
                <span className="grow">{t('Montant dû aujourd’hui')}</span>
              </div>
              <div className="am">
                <b>{k.garde.du ? F(k.garde.du) + ' F' : t('Gratuit')}</b>
                <span>{tf('{m} F demain', { m: F(k.garde.demain) })}</span>
              </div>
              <p>{t('À payer en Mobile Money au comptoir, sur ton téléphone.')}</p>
              {(() => {
                const e = echeancier(k, maintenant, relais?.ferme ?? null)
                return <p>{tf('Retire avant {d} au soir, sinon tes colis repartent chez le vendeur (+ {r} F de renvoi).', { d: jourSeul(e.dernier.le, langue), r: F(RENVOI_GARDE) })}</p>
              })()}
            </div>
          )}
          </Groupe>
          <Groupe si={colonnes} classe="cl10-web-d">
          <div className="cl10-photo mt14">
            <Dessin id="318e6abdcbb9" />
          </div>
          <div className="cl10-k mt14">
            <Icone nom="map-pin" taille={15} />
            <span className="grow">{t('Ton relais de retrait')}</span>
          </div>
          <div className="cl10-rel mt8">
            <span className="portrait" style={{ width: '44px', height: '44px' }}>
              <Dessin id="ea693eb4e364" />
            </span>
            <div className="grow">
              <b className="t15 b8" style={{ display: 'block' }}>
                {t(k.lieu)}
              </b>
              {relais && <span className="t13 c3">{tf('{g} · {h} · fermé le {f}', { g: t(relais.gerant), h: t(relais.horaires), f: t(relais.ferme) })}</span>}
              {relais && (
                <span className="t13 c3" style={{ display: 'block' }}>
                  {(() => {
                    const o = ouvertureDuJour(relais, maintenant)
                    return tf(o.texte, o.v)
                  })()}
                </span>
              )}
            </div>
          </div>
          <p className="t13 c2 mt10">
            {k.colis.reduce((s, x) => s + (x.annule ? 0 : x.prix * x.qte), 0) >= 100000
              ? t('Au comptoir : ce code, plus le nom et la pièce d’identité de la personne qui retire (commande de 100 000 F ou plus).')
              : t('Au comptoir : ce code suffit, aucune pièce d’identité n’est demandée. Quelqu’un peut venir à ta place avec ce lien.')}
          </p>
          <div className="btns mt14">
            <a className="btn secondary" href={lienItineraire(k.lieu + ', Yaoundé')} target="_blank" rel="noreferrer">
              <Icone nom="navigation" taille={18} />
              <span>{t('Itinéraire')}</span>
            </a>
          </div>
          <div className="btns">
            <Link to={chemin('code', { ref: k.ref })} className="btn primary">
              <span>{t('Ouvrir dans l’application')}</span>
            </Link>
          </div>
          <div className="hint-l">
            <Icone nom="lock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Ce lien est personnel : il donne tes colis à qui le montre. Il s’arrête dès le retrait.')}</span>
          </div>
          <div className="links">
            <Link to={chemin('aide')}>{t('Besoin d’aide ?')}</Link>
          </div>
          </Groupe>
        </div>
      </div>
    </Ecran>
  )
}
