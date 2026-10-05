// Écran « Cadeau offert » (CL-14), forme d'origine du prototype rendue réelle (DP-54) : la page web de celui qui
// offre (?l=code&p=produit&ref=commande&de=prénom), avec son en-tête propre (paiement protégé, langue, adresse du
// lien). « C'est offert » : le paiement (heure, montant, moyen, lus dans la commande), la suite (préparé, livré au
// relais, remis seul ou avec les autres cadeaux), l'argent bloqué jusqu'au retrait et remboursé à lui, jamais au
// destinataire, l'e-mail de suivi. Une fois le cadeau retiré (état réel de la commande) : l'e-mail « … a retiré ton
// cadeau » et les étapes faites. Sans paiement : « Aucun cadeau à confirmer ici ». Le reçu (référence, article au
// prix payé, livraison, frais, total, moyen) et, si le prix a bougé depuis le partage, l'écart payé (CLE-39).
// Échanges (DP-54) : la coche et les confettis du cadeau payé ; qui paie la livraison (et la garantie du payeur) ;
// le merci reçu du destinataire ; suivre le cadeau (commande) et la liste.
// Depuis n'importe où (DP-54) : le suivi vient de source.suiviCadeau, public pour qui a offert, même sans compte
// (étapes, preuve de remise au relais ou chez le destinataire, merci), jamais l'adresse ni le code ; un cadeau payé
// par carte depuis l'étranger, sans compte : proposition (facultative) d'ouvrir un compte diaspora, prénom, e-mail
// et pays repris.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import img_be926f70d2b8_png from '../../assets/prototype/be926f70d2b8.png'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Aside, Colonne, Zone } from '../../composants/Gabarits'
import { PiedWeb } from '../../composants/PiedWeb'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { INTERRUPTEURS_DU_LANCEMENT } from '../../config/interrupteurs'
import { NAVIGATION, chemin } from '../../config/pages'
import { source, type CommandeClient, type CommandePassee, type ListePublique, type Merci, type SuiviCadeau } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, jourSeul, quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'

// En-tête de la page web d'une liste partagée : paiement protégé, logo, langue, adresse du lien.
function EnTeteWeb({ code }: { code: string }) {
  const { t, langue, setLangue } = usePreferences()
  return (
    <header className="hd glass cl14-web">
      <div className="hd-strip">
        <Icone nom="shield-check" taille={14} />
        <span>{t('Paiement protégé : le vendeur est payé après le retrait')}</span>
      </div>
      <div className="hd-sub">
        <img src={img_be926f70d2b8_png} alt="BelivaY" />
        <span className="hd-sp"></span>
        <button type="button" className="lang" aria-label={t('Langue')} onClick={() => setLangue(langue === 'en' ? 'fr' : 'en')}>
          {langue === 'en' ? 'EN' : 'FR'}
        </button>
      </div>
      <div className="cl14-url">
        <Icone nom="lock" taille={12} />
        {location.host + chemin('liste-publique', { l: code })}
      </div>
    </header>
  )
}

const masquerEmail = (e: string) => {
  const [n, dom] = e.split('@')
  return dom ? `${n.slice(0, 1)}•••••@${dom}` : e
}

export function ListeOffert() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const code = params.get('l') ?? 'k7Q2mX'
  const p = params.get('p') ?? ''
  const ref = params.get('ref')
  const de = params.get('de')
  const [l, setL] = useState<ListePublique | null | undefined>(undefined)
  const [cmd, setCmd] = useState<CommandePassee | null>(null)
  const [suivi, setSuivi] = useState<{ commande: CommandeClient; maintenant: number } | null>(null)
  const [merci, setMerci] = useState<Merci | null>(null)
  const [sc, setSc] = useState<SuiviCadeau | null>(null)
  const tabL = useDes('tab-l')
  const { connecte } = useSession()
  useEffect(() => {
    source.listePublique(code).then(setL)
  }, [code])
  useEffect(() => {
    if (!ref) return
    source.suiviCadeau(code, ref).then(setSc)
    source.commandePassee(ref).then(setCmd)
    source.commandeClient(ref).then(setSuivi)
    source.echanges().then((e) => setMerci(e.mercis.find((m) => m.ref === ref) ?? null))
  }, [ref])
  if (l === undefined) return null
  const navigation = { ...NAVIGATION['liste-offert'], entete: 'propre' as const }
  const avant = (
    <>
      <EnTeteWeb code={code} />
    </>
  )
  const bandeau = !INTERRUPTEURS_DU_LANCEMENT['FF-LISTE-ENVIES'] && (
    <div className="cl14-top">
      <span className="cl14-ff">
        <Icone nom="lock" taille={13} />
        {t('Après le lancement · interrupteur fermé')}
      </span>
      <span className="cl14-ffc">{t('FF-LISTE-ENVIES')}</span>
    </div>
  )
  const titre = l?.articles.find((x) => x.p === p)?.titre ?? ''
  if (!ref || !l)
    return (
      <Ecran route="liste-offert" navigation={navigation} avant={avant}>
        <Styles id="02f3dac5cd" />
        {bandeau}
        <div className="card mt12">
          <div className="empty">
            <h3>{t('Aucun cadeau à confirmer ici')}</h3>
            <p>{t('Cette page s’affiche après un paiement depuis une liste partagée.')}</p>
          </div>
        </div>
      </Ecran>
    )
  const maintenant = sc?.maintenant ?? suivi?.maintenant ?? Date.now()
  const c = suivi?.commande ?? null
  const retire = sc?.remisLe ?? c?.retireeLe ?? null
  const arrive = !!sc?.arriveLe || (!!c && (['retirable', 'comptoir', 'retiree'] as string[]).includes(c.etat))
  const groupe = l.mode === 'groupe'
  const chez = sc?.livraison === 'domicile' || cmd?.mode === 'domicile'
  const surCarte = cmd?.moyen === 'carte' || (!!sc && sc.devise !== 'XAF')
  const merciVu = merci ?? (sc?.merci ? { ref, de: sc.merci.de, pour: de ?? '', texte: sc.merci.texte, le: sc.merci.le } : null)
  const paye = cmd ? tf('{q} · {m} F avec {o}', { q: quand(cmd.le, maintenant, langue), m: F(cmd.montant), o: cmd.numero ?? '' }) : tf('Commande {ref}', { ref })
  const remise = groupe && l.remiseLe ? tf('le {d} au plus tard', { d: jourSeul(l.remiseLe, langue) }) : t('dès son arrivée au relais')
  const etapes = (
    <div className="tl">
      <div className="ti done">
        <div className="tt">{t('Payé')}</div>
        <div className="td">{retire && cmd ? tf('{q} · {m} F avec {o}', { q: dateA(cmd.le, langue), m: F(cmd.montant), o: cmd.numero ?? '' }) : paye}</div>
      </div>
      <div className={'ti ' + (arrive ? 'done' : 'cur')}>
        <div className="tt">{chez ? tf('Préparé, puis en route chez {p}', { p: l.prenom }) : tf('Préparé, puis livré au relais de {p}', { p: l.prenom })}</div>
        <div className="td">{sc?.arriveLe ? dateA(sc.arriveLe, langue) : t('Un e-mail à chaque étape')}</div>
      </div>
      <div className={'ti ' + (retire ? 'done' : arrive ? 'cur' : '')}>
        <div className="tt">{t(chez ? 'Remis en main propre' : groupe ? 'Remis avec ses autres cadeaux' : 'Retiré avec son code')}</div>
        <div className="td">{retire ? dateA(retire, langue) : chez ? t('le livreur appelle à l’arrivée') : remise}</div>
      </div>
    </div>
  )
  const lienListe = (
    <>
      {merciVu && (
        <div className="card or blv-merci">
          <div className="row" style={{ gap: 10 }}>
            <span className="ic-sq or">
              <Icone nom="heart" taille={20} />
            </span>
            <div className="grow">
              <div className="t13 b8">{tf('{p} te dit merci', { p: merciVu.de })}</div>
              <div className="t14 mt4">« {merciVu.texte} »</div>
            </div>
          </div>
        </div>
      )}
      <div className="btns mt16">
        <Link to={chemin('liste-publique', { l: code })} className="btn secondary">
          <span>{tf('Voir la liste de {p}', { p: l.prenom })}</span>
        </Link>
      </div>
      {connecte && suivi ? (
        <div className="links">
          <Link to={chemin('commande', { ref: suivi.commande.ref })}>{tf('Suivre le cadeau (commande {r})', { r: suivi.commande.ref })}</Link>
        </div>
      ) : (
        <div className="hint-l">
          <Icone nom="link" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Pas besoin de compte pour suivre ton cadeau : cette page et le lien de chaque e-mail montrent où il en est.')}</span>
        </div>
      )}
      {!connecte && surCarte && (
        <div className="card flat blv-diaspora">
          <div className="row" style={{ gap: 12 }}>
            <span className="ic-sq or">
              <Icone nom="globe" taille={22} />
            </span>
            <div className="grow">
              <div className="t15 b8">{t('Tu offres souvent depuis l’étranger ?')}</div>
              <div className="t13 c3 mt4">{t('Un compte diaspora, c’est facultatif : tes cadeaux et leur suivi au même endroit, tes proches reliés, leurs paniers à payer. Ton prénom, ton e-mail et ton pays sont déjà remplis.')}</div>
            </div>
          </div>
          <div className="btns mt12">
            <Link to={chemin('inscription-diaspora', { next: chemin('espace-diaspora') })} className="btn soft">
              <span>{t('Créer mon compte diaspora')}</span>
            </Link>
          </div>
        </div>
      )}
    </>
  )
  const surQuoi = t(surCarte ? 'sur ta carte' : 'sur ton Mobile Money')
  // Le reçu, lu dans la commande ; l'écart avec le prix montré au partage.
  const art = l.articles.find((x) => x.p === p)
  const prixPaye = cmd?.lignes[0]?.prix ?? null
  const ecart = prixPaye !== null && art?.prixPartage != null ? prixPaye - art.prixPartage : 0
  const recu = cmd && (
    <>
      <div className="sec">
        <h2>{t('Ton reçu')}</h2>
      </div>
      <div className="card ">
        <div className="kv">
          <span className="k">{t('Référence')}</span>
          <span className="v ">{cmd.ref}</span>
        </div>
        <div className="kv">
          <span className="k">{t(titre || 'Article')}</span>
          <span className="v ">{F(cmd.sousTotal)}&nbsp;F</span>
        </div>
        {ecart !== 0 && art?.prixPartage != null && (
          <div className="kv">
            <span className="k">{t('Prix au partage')}</span>
            <span className="v ">
              <s className="was">{F(art.prixPartage)}&nbsp;F</s> {tf(ecart > 0 ? '+{m} F' : '−{m} F', { m: F(Math.abs(ecart)) })}
            </span>
          </div>
        )}
        <div className="kv">
          <span className="k">{chez ? tf('Livraison chez {p}', { p: l.prenom }) : t('Livraison au relais')}</span>
          <span className="v ">{cmd.pour?.qui === 'destinataire' ? tf('{p} la paie au retrait ({m} F)', { p: l.prenom, m: F(cmd.pour.fraisRemise) }) : cmd.livraison ? F(cmd.livraison) + ' F' : t('offerte')}</span>
        </div>
        {cmd.frais > 0 && (
          <div className="kv">
            <span className="k">{t('Frais de service carte (2 %)')}</span>
            <span className="v ">{F(cmd.frais)}&nbsp;F</span>
          </div>
        )}
        <div className="total">
          <span className="tl2">{t('Payé')}</span>
          <span className="price">
            {F(cmd.montant)}
            <small> F</small>
          </span>
        </div>
        <div className="t12 c3 mt6">{tf('{q} · {o}', { q: dateA(cmd.le, langue), o: cmd.numero ?? '' })}</div>
        {cmd.pour?.qui === 'destinataire' && <div className="t12 c3 mt6">{tf('Ta garantie : si {p} refuse le colis après l’expédition ou ne le retire pas, au plus {g} F sont retenus sur ton remboursement.', { p: l.prenom, g: F(cmd.pour.garantie) })}</div>}
      </div>
    </>
  )

  // Le destinataire a retiré le cadeau : l'e-mail reçu et les étapes faites.
  if (retire)
    return (
      <Ecran route="liste-offert" navigation={navigation} avant={avant} gabarit="web">
        <Styles id="02f3dac5cd" />
        <Zone nom="haut">{bandeau}</Zone>
        <Colonne>
          <div className="card mt12">
            <div className="row" style={{ gap: '10px' }}>
              <span className="ic-sq or">
                <Icone nom="mail" taille={20} />
              </span>
              <div className="grow">
                <div className="t13 b8">{t('BelivaY')}</div>
                <div className="t12 c3">{tf('E-mail · {d}', { d: dateA(retire, langue) })}</div>
              </div>
            </div>
            <div className="t17 b8 mt12" style={{ lineHeight: '1.3' }}>
              {tf('{p} a retiré ton cadeau {q}.', { p: l.prenom, q: quand(retire, maintenant, langue) })}
            </div>
            <div className="t13 c3 mt6">{de ? tf('{a}, au relais de {q}. Merci {d} !', { a: t(titre), q: t(l.quartier), d: de }) : tf('{a}, au relais de {q}. Merci !', { a: t(titre), q: t(l.quartier) })}</div>
          </div>
          <div className="sec">
            <h2>{t('Ton cadeau')}</h2>
          </div>
          <div className="card ">
            {etapes}
            <div className="kv blv-preuve">
              <span className="k">{t('Preuve de remise')}</span>
              <span className="v ">{chez ? tf('remis à {p}, à {v}, le {d}', { p: l.prenom, v: t(sc?.lieu ?? 'Yaoundé'), d: dateA(retire, langue) }) : tf('retiré avec son code au relais de {q}, le {d}', { q: t(sc?.lieu ?? l.quartier), d: dateA(retire, langue) })}</span>
            </div>
          </div>
          {!tabL && recu}
          <div className="hint-l">
            <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('C’est {p} qui confirme ou signale un problème : {p} a le colis en main. Un remboursement éventuel revient {s}.', { p: l.prenom, s: surQuoi })}</span>
          </div>
          {lienListe}
        </Colonne>
        {tabL && recu && <Aside titre="Ton reçu">{recu}</Aside>}
        <Zone nom="bas">
          <PiedWeb />
        </Zone>
      </Ecran>
    )

  return (
    <Ecran route="liste-offert" navigation={navigation} avant={avant} gabarit="web">
      <Styles id="02f3dac5cd" />
      <Zone nom="haut">
        {bandeau}
        <div className="cl14-check blv-succes">
          <Icone nom="gift" taille={30} />
        </div>
        <div className="cl14-center">
          <div className="pg">
            <h1 className="pg-t">{de ? tf('C’est offert, {p} !', { p: de }) : t('C’est offert !')}</h1>
            <p className="pg-s">{tf('Tu offres {a} à {p}.', { a: t(titre), p: l.prenom })}</p>
          </div>
        </div>
      </Zone>
      <Colonne>
        <div className="card ">{etapes}</div>
        {!tabL && recu}
        <div className="note green">
          <Icone nom="shield-check" taille={18} />
          <div>{tf('Ton argent reste bloqué jusqu’au retrait. Si le cadeau n’arrive pas, tu es remboursé {s}, jamais {p}.', { s: surQuoi, p: l.prenom })}</div>
        </div>
        <div className="hint-l">
          <Icone nom="mail" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>
            {cmd?.payeur?.email
              ? tf('Tu es prévenu à chaque étape par e-mail ({e}). C’est {p} qui confirme ou signale un problème : {p} a le colis en main.', { e: masquerEmail(cmd.payeur.email), p: l.prenom })
              : tf('Tu es prévenu à chaque étape par e-mail. C’est {p} qui confirme ou signale un problème : {p} a le colis en main.', { p: l.prenom })}
          </span>
        </div>
        {lienListe}
      </Colonne>
      {tabL && recu && <Aside titre="Ton reçu">{recu}</Aside>}
      <Zone nom="bas">
        <PiedWeb />
      </Zone>
    </Ecran>
  )
}
