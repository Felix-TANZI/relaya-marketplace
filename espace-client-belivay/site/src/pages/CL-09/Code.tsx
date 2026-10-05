// Écran « Code de retrait » (CL-09), forme d'origine du prototype rendue réelle (DP-54) : le code de la commande
// (?ref=…) à montrer au gérant (QR et 6 chiffres), caché jusqu'au toucher ; déverrouillage du téléphone avant de
// l'afficher pour une commande de 50 000 F et plus (CODE-BIO) ; code pas encore créé (colis en route) ; code
// bloqué après 3 codes faux ; nouveau code après un changement de relais ou de numéro ; au comptoir : le code
// s'affiche après le paiement ; montant dû (garde) et ses paliers ; hors ligne : code lisible, paiement impossible ;
// relais du jour ; « Je suis au comptoir » ; envoyer à quelqu'un ; recevoir le code par SMS (3 fois par 24 h).
// Jamais montré sur l'écran verrouillé.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne, Gabarit, Zone } from '../../composants/Gabarits'
import { useDes } from '../../composants/ecran'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { jouer } from '../../composants/Sons'
import { chemin } from '../../config/pages'
import { source, type CommandeClient } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, jourSeul, quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { CommandeIntrouvable } from '../CL-08/Confirmee'
import { Code6, distance, echeancier, minutesAPied, ouvertureDuJour, Qr, useEnLigne, useRelais } from './Commun'

const SMS_MAX = 3 // envois du code par SMS par 24 h

// Code bloqué après 3 codes faux au comptoir (jusqu'à l'heure donnée) : champ attendu du serveur.
type AvecBlocage = CommandeClient & { codeBloqueJusqua?: number | null }

export function Code() {
  const { t, tf, langue } = usePreferences()
  const session = useSession()
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? 'BLV-52018'
  const [d, setD] = useState<{ commande: CommandeClient; maintenant: number } | null | undefined>(undefined)
  const [renouvele, setRenouvele] = useState(false)
  const [visible, setVisible] = useState(false)
  const [bio, setBio] = useState(false) // feuille de déverrouillage ouverte
  const [verif, setVerif] = useState(false)
  const [sms, setSms] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const enLigne = useEnLigne()
  const relais = useRelais(d?.commande.lieu)
  // Grands écrans (§ 5.8) : dès 1024, le code en grand à gauche, le relais, le montant dû et les actions à droite.
  const colonnes = useDes('tab-l')
  useEffect(() => {
    source.commandeClient(ref).then(setD)
    source.changementNumero().then((x) => setRenouvele(!!x?.renouvelees.includes(ref)))
  }, [ref])
  // Masqué dès que tu quittes l'écran (application en arrière-plan).
  useEffect(() => {
    const cacher = () => document.hidden && setVisible(false)
    document.addEventListener('visibilitychange', cacher)
    return () => document.removeEventListener('visibilitychange', cacher)
  }, [])
  useEffect(() => {
    if (!toast) return
    const x = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(x)
  }, [toast])
  // Le code apparaît (après le toucher ou le déverrouillage) : un scintillement léger (composants/Sons.ts).
  useEffect(() => {
    if (visible) jouer('code')
  }, [visible])
  if (d === undefined) return null
  if (!d) return <CommandeIntrouvable route="code" />
  const c = d.commande as AvecBlocage
  const maintenant = d.maintenant
  const gerant = relais ? t(relais.gerant) : t('le gérant')
  const n = c.colis.filter((x) => !x.annule).length
  const total = c.colis.reduce((s, x) => s + (x.annule ? 0 : x.prix * x.qte), 0)
  const numero = session.client?.numeroMasque ?? ''

  // Code plus disponible : commande retirée, annulée, ou colis gardé pendant un litige.
  if (c.etat === 'retiree' || c.etat === 'annulee' || c.etat === 'litige')
    return (
      <Ecran route="code" sousTitre={c.ref}>
        <div className="cl09">
          <div className="empty">
            <div className="ei">
              <Icone nom={c.etat === 'retiree' ? 'package-check' : c.etat === 'litige' ? 'scale' : 'circle-x'} taille={26} />
            </div>
            <h3>{t('Code plus disponible')}</h3>
            <p>
              {c.etat === 'retiree' && c.retireeLe
                ? tf(n > 1 ? 'Tes colis ont été retirés au {l} le {d}. Le code ne sert plus : il a disparu.' : 'Ton colis a été retiré au {l} le {d}. Le code ne sert plus : il a disparu.', { l: t(c.lieu), d: dateA(c.retireeLe, langue) })
                : c.etat === 'litige'
                  ? t('Le colis est gardé au relais pendant le litige : le code ne sert plus.')
                  : tf('Commande annulée le {d} : le code ne sert plus.', { d: dateA(c.annulee?.le ?? maintenant, langue) })}
            </p>
            <div className="btns">
              <Link to={chemin('commande', { ref: c.ref })} className="btn primary">
                <Icone nom="scroll-text" taille={18} />
                <span>{t('Voir ma commande')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )

  const relaisCarte = relais && (
    <div className="card tight">
      <div className="li">
        <span className="portrait" style={{ width: '40px', height: '40px' }}>
          <Dessin id="02814f9138ce" />
        </span>
        <span className="grow">
          <span className="lt" style={{ display: 'block' }}>
            {tf('{l} · {g}', { l: t(c.lieu), g: t(relais.gerant) })}
          </span>
          <span className="ls" style={{ display: 'block' }}>
            {(() => {
              const o = ouvertureDuJour(relais, maintenant)
              return tf(o.texte, o.v) + ' · ' + tf('{m} min à pied ({d})', { m: minutesAPied(relais.km), d: distance(relais.km) })
            })()}
          </span>
          <span className="ls" style={{ display: 'block' }}>
            {tf('Horaires : {h} · fermé le {f}', { h: t(relais.horaires), f: t(relais.ferme) })}
          </span>
        </span>
      </div>
    </div>
  )
  const garde = c.garde
  const ech = garde && relais ? echeancier(c, maintenant, relais.ferme) : garde ? echeancier(c, maintenant, null) : null
  const noteGratuite = garde && !garde.du && (
    <div className="note or">
      <Icone nom="clock" taille={18} />
      <div>
        {c.arriveeLe ? tf('Arrivée {d} : ', { d: quand(c.arriveeLe, maintenant, langue) }) : t('Arrivés aujourd’hui : ')}
        <b>{tf('gratuit aujourd’hui, {m} F par jour dès demain', { m: F(garde.demain) })}</b>
        {t('.')}
      </div>
    </div>
  )

  // Au comptoir : le code s'affiche après le paiement du montant dû.
  if (c.etat === 'comptoir' && (c.comptoir?.du ?? 0) > 0) {
    const du = (c.comptoir?.du ?? 0) + (garde?.du ?? 0)
    return (
      <Ecran route="code" sousTitre={c.ref}>
        <div className="cl09">
          <div className="hero night center">
            <div className="cl09-lock">
              <Icone nom="lock" taille={28} />
            </div>
            <div className="t17 b8 mt12">{t('Ton code s’affiche après le paiement')}</div>
            <div className="hk mt14">{t('Montant dû au comptoir')}</div>
            <div className="big">
              {F(du)}
              <small>{t('F')}</small>
            </div>
            <div className="hs">
              {tf('{p}. Tu paies en Mobile Money sur ton téléphone, devant {g} ; le code se débloque dès que le paiement est confirmé.', {
                p: c.colis.map((x) => t(x.produit)).join(', '),
                g: gerant,
              })}
            </div>
            <div className="btns mt14">
              <Link to={chemin('comptoir-payer', { ref: c.ref })} className="btn primary">
                <Icone nom="smartphone" taille={18} />
                <span>{tf('Payer au comptoir · {m} F', { m: F(du) })}</span>
              </Link>
            </div>
          </div>
          {noteGratuite}
          {relaisCarte}
          <div className="hint-l">
            <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('Aucune espèce : {g} n’encaisse rien et ne saisit aucun montant.', { g: gerant })}</span>
          </div>
        </div>
      </Ecran>
    )
  }

  // Colis en route, code pas encore créé.
  if (!c.code)
    return (
      <Ecran route="code" sousTitre={c.ref}>
        <div className="cl09">
          <div className="hero night center">
            <div className="cl09-lock">
              <Icone nom="hourglass" taille={28} />
            </div>
            <div className="t17 b8 mt12">{t('Ton code n’existe pas encore')}</div>
            <div className="hs">
              {c.pretLe
                ? tf('Il arrive avec le dernier des {n} colis, {d}. Un seul code pour tous.', { n, d: quand(c.pretLe, maintenant, langue) })
                : tf('Il arrive avec le dernier des {n} colis. Un seul code pour tous.', { n })}
            </div>
          </div>
          {c.codeBio && (
            <div className="note ink">
              <Icone nom="fingerprint" taille={18} />
              <div>
                {t('Commande de ')}
                <b>{F(total)}&nbsp;F</b>
                {t(' : au-delà de 50 000 F, tu déverrouilleras ton téléphone (empreinte, visage ou code) pour l’afficher.')}
              </div>
            </div>
          )}
          <div className="note ink">
            <Icone nom="message-square" taille={18} />
            <div>{t('On te prévient dès qu’il est prêt ; il arrive aussi par SMS, même sans données.')}</div>
          </div>
          <div className="btns">
            <Link to={chemin('suivi', { ref: c.ref })} className="btn primary">
              <Icone nom="navigation" taille={18} />
              <span>{t('Suivre ma commande')}</span>
            </Link>
          </div>
        </div>
      </Ecran>
    )

  // Code bloqué après 3 codes faux saisis au comptoir.
  if (c.codeBloqueJusqua && c.codeBloqueJusqua > maintenant)
    return (
      <Ecran route="code" sousTitre={c.ref}>
        <div className="cl09">
          <div className="hero red center">
            <div className="cl09-lock">
              <Icone nom="lock" taille={28} />
            </div>
            <div className="t17 b8 mt12">{t('Code bloqué pendant 24 h')}</div>
            <div className="hs">
              {tf('3 codes faux ont été saisis au {l}. Pour protéger tes {n} colis, ce code ne marche plus jusqu’au {d}.', { l: t(c.lieu), n, d: dateA(c.codeBloqueJusqua, langue) })}
            </div>
          </div>
          <div className="btns">
            <Link to={chemin('fil', { id: 'support', st: 'nouveau' })} className="btn primary">
              <Icone nom="refresh-cw" taille={18} />
              <span>{t('Demander un nouveau code')}</span>
            </Link>
          </div>
          <div className="note green">
            <Icone nom="shield-check" taille={18} />
            <div>{t('Tes colis restent au relais, en sécurité : personne ne peut les retirer sans ton nouveau code.')}</div>
          </div>
          <div className="card tight">
            <Link to={chemin('aide')} className="li">
              <span className="ic ">
                <Icone nom="headset" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Ce n’était pas toi ?')}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {t('Dis-le à l’aide BelivaY')}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          </div>
        </div>
      </Ecran>
    )

  const code = c.code
  const pret = c.etat === 'retirable' || c.etat === 'comptoir'
  const nouveau = renouvele || !!c.transfert
  const afficher = () => (c.codeBio ? setBio(true) : setVisible(true))
  const deverrouiller = async () => {
    setVerif(true)
    await new Promise((r) => setTimeout(r, 800))
    setVerif(false)
    setBio(false)
    setVisible(true)
  }
  const envoyerSms = () => {
    if (sms >= SMS_MAX || !enLigne) return
    const k = sms + 1
    setSms(k)
    setToast(tf('SMS envoyé au {n}. Il reste {r} renvois sur les 24 prochaines heures.', { n: numero, r: SMS_MAX - k }))
  }
  const feuilleBio = bio && (
    <>
      <div className="veil" onClick={() => setBio(false)}></div>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t('Confirme que c’est toi')}>
        <div className="grab"></div>
        <div className="cl09-bio">
          <div className="cl09-sys">{t('Déverrouillage du téléphone')}</div>
          <button type="button" className="ic" aria-label={t('Déverrouiller avec mon empreinte ou mon visage')} onClick={deverrouiller} style={{ border: 0, cursor: 'pointer' }}>
            <Icone nom={verif ? 'hourglass' : 'fingerprint'} taille={40} />
          </button>
          <h3>{t(verif ? 'Vérification…' : 'Confirme que c’est toi')}</h3>
          <p>
            {t('Commande de ')}
            <b>{F(total)}&nbsp;F</b>
            {t(' : au-delà de 50 000 F, ton empreinte, ton visage ou le code du téléphone protège ton code de retrait.')}
          </p>
          <div className="btns mt16">
            <button type="button" className={'btn secondary' + (verif ? ' off' : '')} onClick={deverrouiller}>
              <Icone nom="key-round" taille={18} />
              <span>{t('Utiliser le code du téléphone')}</span>
            </button>
          </div>
          <div className="links">
            <a
              href={chemin('code', { ref: c.ref })}
              onClick={(e) => {
                e.preventDefault()
                setBio(false)
              }}
            >
              {t('Annuler')}
            </a>
          </div>
        </div>
      </div>
    </>
  )
  const fixes = (
    <>
      {feuilleBio}
      {toast && (
        <div className="cl09-toast" role="status">
          <Icone nom="message-square" taille={18} />
          <span>{toast}</span>
        </div>
      )}
    </>
  )

  return (
    <Ecran route="code" sousTitre={c.ref} fixes={fixes} largeur={colonnes ? 'moyen' : undefined}>
      <div className="cl09">
        <Gabarit forme="colonnes" classe="c9-code-g" basDansGrille>
        <Colonne>
        {!enLigne && (
          <div className="offline-banner">
            <Icone nom="wifi-off" taille={18} />
            <span>{t('Hors ligne · code enregistré sur ton téléphone, lisible sans réseau')}</span>
          </div>
        )}
        {nouveau && (
          <div className="cl09-pill-w">
            <span className="pill green">
              <Icone nom="check" taille={13} />
              {t('Nouveau code')}
            </span>
          </div>
        )}
        <div className="hero night center">
          <div className="hk">{visible ? tf('À montrer à {g}', { g: gerant }) : tf('Code de retrait · {n} colis', { n })}</div>
          {visible && (
            <div className="qr cl09-qr">
              <Qr texte={c.ref + ':' + code} />
            </div>
          )}
          <Code6 code={code} masque={!visible} />
          <div className="hs mt10">{tf(n > 1 ? '{n} colis · un seul code · {l}' : '{n} colis · {l}', { n, l: t(c.lieu) })}</div>
          <div className="btns mt14">
            {visible ? (
              <button type="button" className="btn secondary" onClick={() => setVisible(false)}>
                <Icone nom="eye-off" taille={18} />
                <span>{t('Cacher le code')}</span>
              </button>
            ) : (
              <button type="button" className="btn primary" onClick={afficher}>
                <Icone nom={c.codeBio ? 'fingerprint' : 'eye'} taille={18} />
                <span>{t('Afficher le code')}</span>
              </button>
            )}
          </div>
        </div>
        {!pret && (
          <div className="note ink">
            <Icone nom="clock" taille={18} />
            <div>{t('Tes colis ne sont pas encore au relais : le code servira dès leur arrivée. On te prévient.')}</div>
          </div>
        )}
        {nouveau && (
          <div className="note ink">
            <Icone nom="ban" taille={18} />
            <div>{t('L’ancien code est refusé au comptoir. Un nouveau code est créé après un blocage, un changement de relais ou un changement de numéro.')}</div>
          </div>
        )}
        {c.comptoir && !c.comptoir.du && (
          <div className="note green">
            <Icone nom="circle-check" taille={18} />
            <div>{t('Paiement confirmé : ton code est débloqué.')}</div>
          </div>
        )}
        <div className="hint-l">
          <Icone nom="eye-off" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Masqué dès que tu quittes cet écran. Tu peux en faire une capture pour l’envoyer.')}</span>
        </div>
        {c.codeBio && !visible && <p className="t12 c3 center">{t('Commande de 50 000 F et plus : on vérifie que c’est bien toi.')}</p>}
        {colonnes && (
          <div className="hint-l">
            <Icone nom="monitor" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Montre le code depuis ton téléphone ou depuis cet écran : le QR se lit aussi à l’écran.')}</span>
          </div>
        )}
        </Colonne>
        <Aside titre={t('Retrait au relais')}>
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
              {enLigne ? (
                <Link to={chemin('comptoir-payer', { ref: c.ref })} className="btn soft sm">
                  <span>{tf('Payer {m} F', { m: F(garde.du) })}</span>
                </Link>
              ) : (
                <button type="button" className="btn soft sm cl09-off" disabled aria-disabled="true">
                  <span>{tf('Payer {m} F', { m: F(garde.du) })}</span>
                </button>
              )}
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
            {enLigne ? (
              <Link to={chemin('garde', { ref: c.ref })} className="cl09-link mt4">
                {t('Détail des frais de garde')}
                <Icone nom="chevron-right" taille={15} />
              </Link>
            ) : (
              <div className="t13 cr b7 mt8">{tf('Sans réseau, le paiement ne peut pas partir. {g} ne remet pas un colis avec un montant dû.', { g: gerant })}</div>
            )}
          </div>
        )}
        {noteGratuite}
        {relaisCarte}
        {c.etat === 'retirable' && (
          <div className="btns">
            <Link to={chemin('comptoir', { ref: c.ref })} className="btn primary">
              <Icone nom="store" taille={18} />
              <span>{t('Je suis au comptoir')}</span>
            </Link>
          </div>
        )}
        <div className="btns">
          <Link to={chemin('code-partage', { ref: c.ref })} className="btn secondary">
            <Icone nom={c.delegue ? 'user-check' : 'share'} taille={18} />
            <span>{c.delegue ? tf('Retrait confié à {p}', { p: c.delegue.prenom }) : t('Envoyer à quelqu’un')}</span>
          </Link>
        </div>
        <div className="card tight">
          <button type="button" className={'li' + (sms >= SMS_MAX || !enLigne ? ' off' : '')} onClick={envoyerSms} disabled={sms >= SMS_MAX || !enLigne} style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, font: 'inherit', color: 'inherit' }}>
            <span className="ic ">
              <Icone nom="message-square" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Recevoir le code par SMS')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {tf('Sans données ni application · {m} fois par 24 h · {k} sur {m} utilisé', { m: SMS_MAX, k: sms })}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </button>
          <Link to={chemin('sms', { ref: c.ref })} className="li">
            <span className="ic">
              <Icone nom="message-square-text" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Le code par SMS')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Utile sans internet : un lien court vers le QR')}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        </div>
        </Aside>
        <Zone nom="bas">
        {pret && (
          <details className="more">
            <summary>
              <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
              <span className="grow">{t('Au comptoir, en moins d’une minute')}</span>
              <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
            </summary>
            <div className="more-b">
              <p>
                <b>{t('1. Ton code')}</b>
                {tf(' : montre les 6 chiffres ou le QR à {g}. Le code vaut le colis : aucune pièce d’identité n’est demandée.', { g: gerant })}
                {total >= 100000 ? ' ' + tf('Commande de {m} F : la personne qui retire donne son nom et montre sa pièce d’identité.', { m: F(total) }) : ''}
              </p>
              <p>
                <b>{t('2. Le montant dû')}</b>
                {garde?.du || c.comptoir?.du ? tf(' : {m} F, payés en Mobile Money sur ton téléphone. Jamais en espèces.', { m: F((garde?.du ?? 0) + (c.comptoir?.du ?? 0)) }) : t(' : rien à payer aujourd’hui.')}
              </p>
              <p>
                <b>{tf('3. Tes {n} colis', { n })}</b>
                {t(' : le gérant les sort, les photographie et te les remet. Ouvre-les devant lui.')}
              </p>
              <p>
                <b>{t('4. Un problème ?')}</b>
                {t(' Dis-le tout de suite : un litige s’ouvre au comptoir, ton argent reste bloqué et le colis reste au relais.')}
              </p>
            </div>
          </details>
        )}
        <div className="card tight">
          <Link to={chemin('fil', { id: 'support', st: 'nouveau', sujet: 'Retrait et code', commande: c.ref })} className="li">
            <span className="ic">
              <Icone nom="headset" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Un souci avec ton code ou ton retrait ?')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Écris au support : BelivaY joint le gérant pour toi')}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        </div>
        <div className="note red">
          <Icone nom="shield-alert" taille={18} />
          <div>{t('Personne ne te demande ce code au téléphone. Ne le donne qu’au gérant, au comptoir.')}</div>
        </div>
        </Zone>
        </Gabarit>
      </div>
    </Ecran>
  )
}
