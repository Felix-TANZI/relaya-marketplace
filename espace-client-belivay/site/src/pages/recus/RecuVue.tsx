// Vue de réception d'un envoi (DP-54, consigne du porteur du 5 oct.) : `/recu?id=`. Ce qu'un proche a envoyé au
// client connecté, et ce qu'il peut en faire, sans rien ressaisir (ses moyens de paiement, son relais, son prénom) :
// - à offrir (liste d'envies : mariage avec sa cagnotte « voyage de noces », anniversaire, naissance, baby shower,
//   crémaillère, diplôme, fête) : l'événement (date, hôtes, lieu de remise), les articles, « Offrir », qui paie la
//   livraison (donnees/echanges.ts), le paiement ;
// - à payer (panier, lien de paiement, liste de rentrée, panier d'un proche pour un compte diaspora) : les
//   articles, la livraison, le total, payer ou refuser avec un mot ;
// - à rejoindre (cagnotte, cotisation) : ce qui est réuni, le montant (dès 1 000 F), discret, un mot, payer ;
// - à accepter (colis offert, lien famille, abonnement offert, panier famille) : ce qu'il paiera au retrait AVANT
//   d'accepter (règle 6), accepter ou refuser (sans frais avant l'expédition) ;
// - à retirer pour quelqu'un (retrait confié) : accepter, puis le code, le relais, « J'ai retiré » ;
// - parrainages et partages : accepter, voir la fiche.
// Après l'action : coche, confettis et son (.blv-succes), la commande et son suivi ; remercier, ou voir le merci.
// Vu de l'envoyeur (ses envois) : où en est l'envoi (dans l'application, ou le lien à partager), les réponses, le
// merci à envoyer. Écran propre au site (absent du prototype).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { useDes } from '../../composants/ecran'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { jouer } from '../../composants/Sons'
import { chemin } from '../../config/pages'
import { repartition, totalDiaspora, type PaieFrais } from '../../donnees/echanges'
import { GROUPE_ENVOI, PARTICIPATION_MIN, source, type ActionRecu, type DetailRecu as Detail, type EnvoiRecu } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateLongue, jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { QuiPaieLivraison, joursAvant } from '../CL-14/Echanges'
import { Pastille } from '../diaspora/Commun'
import { BoiteRecus } from './Recus'
import { NOMS_OCCASION, PayerAvecMonCompte, RAISONS, TYPE_ICONE, TYPE_NOM, etatEnvoi, hotesDe, nomEnvoi } from './Commun'

export function RecuVue() {
  const [params] = useSearchParams()
  const id = params.get('id') ?? ''
  const tabL = useDes('tab-l')
  // Dès 1024 px : la boîte en maître-détail (l'envoi choisi à droite) ; sur téléphone : l'envoi seul.
  if (tabL) return <BoiteRecus route="recu" />
  return (
    <Ecran route="recu" gabarit="compte">
      <DetailRecu key={id} id={id} />
    </Ecran>
  )
}

const somme = (x: EnvoiRecu) => x.lignes.reduce((n, l) => n + l.prix * l.qte, 0)

export function DetailRecu({ id }: { id: string }) {
  const { t, tf, langue } = usePreferences()
  const [d, setD] = useState<Detail | null | undefined>(undefined)
  const [v, setV] = useState(0)
  const [choisi, setChoisi] = useState<string | null>(null) // article à offrir
  const [qui, setQui] = useState<PaieFrais>('payeur')
  const [participer, setParticiper] = useState(false)
  const [montant, setMontant] = useState(0)
  const [discret, setDiscret] = useState(false)
  const [mot, setMot] = useState('')
  const [refus, setRefus] = useState<string | null>(null)
  const [fait, setFait] = useState<{ texte: string; ref: string | null } | null>(null)
  const [merci, setMerci] = useState('')
  const [merciEnvoye, setMerciEnvoye] = useState(false)
  const [copie, setCopie] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const succes = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (id) source.recu(id).then(setD)
    else setD(null)
  }, [id, v])
  // Le succès (coche, confettis) est montré là où il est, en haut de l'envoi.
  useEffect(() => {
    if (fait) succes.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [fait])
  if (d === undefined) return null
  if (d === null)
    return (
      <div className="card mt12">
        <div className="empty">
          <div className="ei">
            <Icone nom="inbox" taille={26} />
          </div>
          <h3>{t('Cet envoi n’est plus là')}</h3>
          <p>{t('Il a peut-être été retiré par celui qui l’a envoyé. Tes autres envois reçus t’attendent.')}</p>
          <div className="btns">
            <Link to={chemin('recus')} className="btn primary">
              <span>{t('Mes reçus')}</span>
            </Link>
          </div>
        </div>
      </div>
    )
  const x = d.envoi
  const m = d.moyens
  const recu = d.sens === 'recu'
  const [etat, couleur] = etatEnvoi(x, d.sens)
  const ouvert = recu && x.etat === 'a_traiter'
  const peutOffrir = recu && (x.etat === 'a_traiter' || x.etat === 'fait')
  const autre = recu ? x.de : x.pour
  const recharger = () => setV((n) => n + 1)
  // Exécute l'envoi ; rend un message d'erreur, ou null (succès : coche, confettis, son).
  const agir = async (a: ActionRecu, texte: string): Promise<string | null> => {
    const r = await source.executerRecu(x.id, a)
    if (!r.ok) {
      jouer('erreur')
      return RAISONS[r.raison] ?? 'Une erreur est survenue.'
    }
    jouer(r.paye ? 'paiement' : 'notification')
    setFait({ texte, ref: r.ref })
    setChoisi(null)
    setParticiper(false)
    setRefus(null)
    recharger()
    return null
  }

  // ——— Morceaux ———
  const lignes = (avecOffrir: boolean) => (
    <div className="card tight">
      {x.lignes.map((l, i) => (
        <div key={(l.p ?? '') + i} className="li" style={{ alignItems: 'flex-start' }}>
          <span className="thumb" style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }}>
            {l.dessin ? <Dessin id={l.dessin} /> : <Icone nom="package" taille={20} />}
          </span>
          <span className="grow" style={{ minWidth: 0 }}>
            <span className="lt" style={{ display: 'block' }}>
              {t(l.titre)}
              {l.qte > 1 ? ' × ' + l.qte : ''}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {F(l.prix * l.qte)} F{avecOffrir && l.livraison ? ' · ' + tf('livraison {f} F', { f: F(l.livraison) }) : ''}
            </span>
            {avecOffrir && l.offertPar && (
              <span className="pill sm green mt4">
                <Icone nom="circle-check" taille={13} />
                {tf('Offert par {p}', { p: l.offertPar })}
              </span>
            )}
          </span>
          {avecOffrir && !l.offertPar && peutOffrir && l.p && (
            <button type="button" className={'chip' + (choisi === l.p ? ' on' : '')} aria-pressed={choisi === l.p} onClick={() => (setChoisi(choisi === l.p ? null : l.p), setParticiper(false), setErreur(null))}>
              {t('Offrir')}
            </button>
          )}
        </div>
      ))}
    </div>
  )
  const barre = (reuni: number, objectif: number) => (
    <>
      <div className="row mt8" style={{ justifyContent: 'space-between', gap: 8 }}>
        <b className="t15">{F(reuni)}&nbsp;F</b>
        <span className="t13 c3">{tf('sur {o} F', { o: F(objectif) })}</span>
      </div>
      <div className="bar mt6" role="progressbar" aria-valuemin={0} aria-valuemax={objectif} aria-valuenow={reuni} aria-label={t('Ce qui est réuni')}>
        <i style={{ width: `${Math.min(100, Math.round((reuni / Math.max(1, objectif)) * 100))}%` }}></i>
      </div>
      <div className="t13 b7 cor mt6">{reuni >= objectif ? t('Objectif atteint : merci à tous !') : tf('Il manque {m} F', { m: F(objectif - reuni) })}</div>
    </>
  )
  const champMot = (pour: string) => (
    <div className="fld">
      <label htmlFor="rc-mot">{tf('Un mot pour {p} (facultatif)', { p: pour })}</label>
      <div className="inp">
        <input id="rc-mot" className="grow" value={mot} maxLength={120} onChange={(e) => setMot(e.target.value)} />
      </div>
    </div>
  )
  const refuser = (titre: string, aide: string) =>
    refus === null ? (
      <div className="btns">
        <button type="button" className="btn secondary" onClick={() => setRefus('')}>
          <span>{t(titre)}</span>
        </button>
      </div>
    ) : (
      <div className="card">
        <p className="t13 c3">{t(aide)}</p>
        <div className="fld">
          <label htmlFor="rc-refus">{tf('Ta réponse à {p} (facultatif)', { p: autre })}</label>
          <div className="inp">
            <input id="rc-refus" className="grow" value={refus} maxLength={120} placeholder={t('Ex. : pas ce mois-ci, désolé')} onChange={(e) => setRefus(e.target.value)} />
          </div>
        </div>
        <div className="btns">
          <button type="button" className="btn primary" onClick={() => agir({ action: 'refuser', mot: refus }, tf('Réponse envoyée à {p}.', { p: autre }))}>
            <span>{t('Confirmer le refus')}</span>
          </button>
          <button type="button" className="btn secondary" onClick={() => setRefus(null)}>
            <span>{t('Retour')}</span>
          </button>
        </div>
      </div>
    )
  const accepter = (titre: string, texte: string, a: ActionRecu = { action: 'accepter' }) => (
    <div className="btns">
      <button
        type="button"
        className="btn primary"
        onClick={async () => {
          const e = await agir(a, texte)
          setErreur(e)
        }}
      >
        <Icone nom="circle-check" taille={18} />
        <span>{t(titre)}</span>
      </button>
    </div>
  )
  // Participation (cagnotte, cotisation) : montants proposés, compléter, autre montant, discret, un mot, payer.
  const participation = (reuni: number, objectif: number, pour: string) => {
    const manque = Math.max(0, objectif - reuni)
    const plancher = Math.min(PARTICIPATION_MIN, manque)
    const valide = montant >= plancher && montant <= manque && montant > 0
    return (
      <div className="card or">
        <div className="sec">
          <h2>{t('Ta participation')}</h2>
        </div>
        <div className="chips">
          {[2000, 5000, 10000, 25000]
            .filter((n) => n < manque)
            .map((n) => (
              <button key={n} type="button" className={'chip' + (montant === n ? ' on' : '')} aria-pressed={montant === n} onClick={() => setMontant(n)}>
                {F(n)} F
              </button>
            ))}
          <button type="button" className={'chip' + (montant === manque ? ' on' : '')} aria-pressed={montant === manque} onClick={() => setMontant(manque)}>
            {t('Compléter')}
          </button>
        </div>
        <div className="fld">
          <label htmlFor="rc-montant">{t('Autre montant (F)')}</label>
          <div className="inp">
            <input id="rc-montant" className="grow" inputMode="numeric" value={montant || ''} onChange={(e) => setMontant(Number(e.target.value.replace(/\D/g, '')) || 0)} />
          </div>
          <div className="hint">{tf('Dès {a} F, au plus ce qui manque ({m} F).', { a: F(plancher), m: F(manque) })}</div>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <span className="grow">
            <b className="t14" style={{ display: 'block' }}>
              {t('Participer discrètement')}
            </b>
            <span className="t13 c3">{t('Ton nom n’apparaît pas aux autres.')}</span>
          </span>
          <button type="button" className={'tg' + (discret ? ' on' : '')} role="switch" aria-checked={discret} aria-label={t('Participer discrètement')} onClick={() => setDiscret(!discret)}></button>
        </div>
        {champMot(pour)}
        {valide ? (
          <PayerAvecMonCompte montant={montant} moyens={m} texte="Participer · {m} F" payer={(moyen) => agir({ action: 'participer', montant, moyen, discret, mot }, tf('Merci ! Ta participation de {m} F est enregistrée. Elle reste bloquée chez BelivaY jusqu’au cadeau.', { m: F(montant) }))} />
        ) : (
          <p className="t13 c3">{t('Choisis un montant pour continuer.')}</p>
        )}
      </div>
    )
  }

  // ——— Corps selon le type ———
  let corps: ReactNode = null
  const groupe = GROUPE_ENVOI[x.type]
  if (!recu) corps = null
  else if (x.type === 'liste') {
    const l = choisi ? x.lignes.find((y) => y.p === choisi) : null
    const r = l ? repartition({ articles: l.prix, frais: l.livraison, qui: m.diaspora ? 'payeur' : qui }) : null
    corps = (
      <>
        <div className="sec">
          <h2>{t('La liste')}</h2>
          <span className="t13 c3">{tf('{o} offert(s) sur {n}', { o: x.lignes.filter((y) => y.offertPar).length, n: x.lignes.length })}</span>
        </div>
        {lignes(true)}
        {l && r && peutOffrir && (
          <div className="card or">
            <b className="t15" style={{ display: 'block' }}>
              {tf('Offrir : {a}', { a: t(l.titre) })}
            </b>
            <QuiPaieLivraison articles={l.prix} frais={l.livraison} qui={qui} choisir={setQui} prenom={hotesDe(x)} payeurDiaspora={m.diaspora} />
            {champMot(hotesDe(x))}
            <PayerAvecMonCompte
              montant={r.payeurMaintenant}
              moyens={m}
              texte="Offrir · payer {m} F"
              payer={(moyen) => agir({ action: 'offrir', p: l.p!, moyen, qui: m.diaspora ? 'payeur' : qui, mot }, tf('C’est offert ! {p} est prévenu et te remerciera. Le cadeau part au {r}.', { p: hotesDe(x), r: t(x.lieu ?? 'relais') }))}
            />
          </div>
        )}
        {x.cagnotte && (
          <>
            <div className="sec">
              <h2>{t(x.cagnotte.titre)}</h2>
            </div>
            <div className="card">
              <div className="row" style={{ gap: 10 }}>
                <span className="ic or">
                  <Icone nom="piggy-bank" taille={20} />
                </span>
                <span className="grow t13 c3">{tf('La cagnotte de {p} : chacun met ce qu’il veut, dès 1 000 F. Versée à {p} le jour J.', { p: hotesDe(x) })}</span>
              </div>
              {barre(x.cagnotte.reuni, x.cagnotte.objectif)}
              {peutOffrir && x.cagnotte.reuni < x.cagnotte.objectif && !participer && (
                <div className="btns">
                  <button type="button" className="btn secondary" onClick={() => (setParticiper(true), setChoisi(null), setMontant(0))}>
                    <span>{t('Participer à la cagnotte')}</span>
                  </button>
                </div>
              )}
            </div>
            {participer && participation(x.cagnotte.reuni, x.cagnotte.objectif, hotesDe(x))}
          </>
        )}
        {x.code && (
          <div className="links">
            <Link to={chemin('liste-publique', { l: x.code })}>{t('Voir la page de la liste')}</Link>
          </div>
        )}
      </>
    )
  } else if (x.type === 'cagnotte' || x.type === 'cotisation') {
    const objectif = x.objectif ?? 0
    corps = (
      <>
        {x.lignes.length > 0 && lignes(false)}
        <div className="card">
          {x.type === 'cotisation' && <p className="t13 c3">{tf('Cotisation organisée par {p}. Le cadeau sera remis au {r}.', { p: x.de, r: t(x.lieu ?? 'relais') })}</p>}
          {x.type === 'cagnotte' && <p className="t13 c3">{tf('La cagnotte de {p} : chacun met ce qu’il veut, dès 1 000 F. Versée à {p} le jour J.', { p: hotesDe(x) })}</p>}
          {barre(x.reuni, objectif)}
        </div>
        {ouvert && x.reuni < objectif && participation(x.reuni, objectif, x.type === 'cagnotte' ? hotesDe(x) : x.de)}
        {x.type === 'cagnotte' && x.code && (
          <div className="links">
            <Link to={chemin('liste-publique', { l: x.code })}>{t('Voir la liste de mariage')}</Link>
          </div>
        )}
      </>
    )
  } else if (groupe === 'payer') {
    const articles = somme(x)
    const diasporaTot = totalDiaspora({ articles, fraisRelais: x.frais, fraisDomicile: x.frais, livraison: 'relais', supplementPar: 'payeur' })
    const q: PaieFrais = m.diaspora ? 'payeur' : (x.qui ?? qui)
    const r = repartition({ articles, frais: x.frais, qui: q })
    const aPayer = m.diaspora ? diasporaTot.total - diasporaTot.service : r.payeurMaintenant
    corps = (
      <>
        {lignes(false)}
        <div className="card tight">
          <div className="kv">
            <span className="k">{t('Articles')}</span>
            <span className="v">{F(articles)}&nbsp;F</span>
          </div>
          <div className="kv">
            <span className="k">{x.lieu ? tf('Livraison au {r}', { r: t(x.lieu) }) : t('Livraison au relais')}</span>
            <span className="v">{x.frais ? F(x.frais) + ' F' : t('offerte')}</span>
          </div>
        </div>
        {ouvert && !m.diaspora && x.qui === null && x.frais > 0 && <QuiPaieLivraison articles={articles} frais={x.frais} qui={qui} choisir={setQui} prenom={x.de} />}
        {ouvert && (
          <>
            {champMot(x.de)}
            <PayerAvecMonCompte montant={aPayer} moyens={m} texte="Payer {m} F" payer={(moyen) => agir({ action: 'payer', moyen, qui: q, mot }, tf('Payé ! {p} reçoit son code de retrait quand le colis arrive au relais.', { p: x.de }))} />
            {refuser('Refuser', 'Rien n’est débité. Ton proche est prévenu, son panier reste dans son application.')}
          </>
        )}
      </>
    )
  } else if (x.type === 'colis') {
    const articles = somme(x)
    const auRetrait = x.qui === 'destinataire' ? x.frais : 0
    corps = (
      <>
        {lignes(false)}
        <div className="card tight">
          <div className="kv">
            <span className="k">{tf('Payé par {p}', { p: x.de })}</span>
            <span className="v">{F(articles)}&nbsp;F</span>
          </div>
          <div className="kv">
            <span className="k">{t('Tu paies au retrait')}</span>
            <span className="v">
              <b>{auRetrait ? F(auRetrait) + ' F' : t('rien')}</b>
            </span>
          </div>
          <div className="kv">
            <span className="k">{t('Relais')}</span>
            <span className="v">{t(x.lieu ?? m.relais ?? '')}</span>
          </div>
        </div>
        <div className="hint-l">
          <Icone nom="eye" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{auRetrait ? tf('La livraison ({m} F) se paie au retrait, en Mobile Money. Tu peux refuser sans frais tant que le vendeur n’a pas expédié : {p} est remboursé en entier.', { m: F(auRetrait), p: x.de }) : tf('Rien à payer : ton code de retrait arrive quand le colis est prêt. Tu peux refuser sans frais tant que le vendeur n’a pas expédié.', {})}</span>
        </div>
        {ouvert && (
          <>
            {accepter('Accepter le colis', tf('Colis accepté. Ton code de retrait arrive quand il est prêt au {r}.', { r: t(x.lieu ?? 'relais') }))}
            {refuser('Refuser le colis', 'Avant l’expédition, le refus est sans frais : le payeur est remboursé en entier.')}
          </>
        )}
      </>
    )
  } else if (x.type === 'lien-famille') {
    corps = (
      <>
        <div className="card">
          <p className="t14">{tf('{p}{c} pourra payer tes paniers et t’envoyer des colis. Il voit ton prénom et le quartier de ton relais, jamais ton numéro ni ton adresse.', { p: x.de, c: x.depuis ? ' (' + t(x.depuis) + ')' : '' })}</p>
          <div className="kv mt8">
            <span className="k">{t('Ton relais pour ses colis')}</span>
            <span className="v">{t(m.relais ?? 'à choisir')}</span>
          </div>
        </div>
        {ouvert && (
          <>
            {accepter('Accepter et relier', tf('{p} est relié à ton compte.', { p: x.de }), { action: 'accepter', relais: m.relais ?? undefined })}
            {refuser('Refuser', 'Aucun lien n’est créé. Tu pourras le relier plus tard avec son code.')}
          </>
        )}
        <div className="links">
          <Link to={chemin('proches')}>{t('Mes proches')}</Link>
        </div>
      </>
    )
  } else if (x.type === 'abonnement' || x.type === 'panier-famille' || x.type === 'parrainage' || x.type === 'partage') {
    corps = (
      <>
        {x.detail && (
          <div className="card">
            <p className="t14">{t(x.detail)}</p>
          </div>
        )}
        {x.lignes.length > 0 && lignes(false)}
        {x.type === 'panier-famille' && (
          <div className="hint-l">
            <Icone nom="map-pin" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{tf('{p} paie tout. Tu retires au {r} avec ton code, chaque mois.', { p: x.de, r: t(x.lieu ?? m.relais ?? 'relais') })}</span>
          </div>
        )}
        {x.type === 'partage' && x.lignes[0]?.p && (
          <div className="links">
            <Link to={chemin('fiche', { p: x.lignes[0].p })}>{t('Voir le produit')}</Link>
          </div>
        )}
        {ouvert && (
          <>
            {x.type === 'abonnement' && accepter('Activer mon abonnement offert', tf('Abonnement activé : offert par {p}, sans prélèvement ensuite.', { p: x.de }))}
            {x.type === 'panier-famille' && accepter('Accepter le panier', tf('Panier accepté : {p} est prévenu.', { p: x.de }))}
            {x.type === 'parrainage' && accepter('Accepter l’invitation', tf('{p} est ton parrain : vous êtes récompensés à ton premier retrait.', { p: x.de }))}
            {x.type === 'partage' && accepter('Merci, c’est vu', tf('{p} sait que tu as vu son partage.', { p: x.de }))}
            {x.type !== 'partage' && refuser('Refuser', 'Rien ne change sur ton compte. Ton proche est prévenu.')}
          </>
        )}
      </>
    )
  } else if (x.type === 'code-retrait') {
    corps = (
      <>
        {lignes(false)}
        <div className="card tight">
          <div className="kv">
            <span className="k">{t('Relais')}</span>
            <span className="v">{t(x.lieu ?? '')}</span>
          </div>
          {x.jusqua && (
            <div className="kv">
              <span className="k">{t('À retirer avant')}</span>
              <span className="v">{jourSeul(x.jusqua, langue)}</span>
            </div>
          )}
        </div>
        {x.etat === 'accepte' && x.code && (
          <div className="card vedette" style={{ textAlign: 'center' }}>
            <div className="t13 c3">{t('Code de retrait')}</div>
            <div className="b8" style={{ fontSize: 30, letterSpacing: '0.12em' }}>
              {x.code}
            </div>
            <p className="t13 c3">{tf('Donne ce code au comptoir avec ta pièce d’identité. Le colis est au nom de {p}.', { p: x.de })}</p>
          </div>
        )}
        {ouvert && (
          <>
            {accepter('Accepter de le retirer', tf('C’est noté : le code est à toi. {p} est prévenu.', { p: x.de }))}
            {refuser('Je ne peux pas', 'Ton proche est prévenu et peut confier le retrait à quelqu’un d’autre.')}
          </>
        )}
        {recu && x.etat === 'accepte' && (
          <>
            {accepter('J’ai retiré le colis', tf('Retrait noté. {p} est prévenu.', { p: x.de }), { action: 'retirer' })}
            {refuser('Je ne peux plus', 'Le code n’est plus à toi ; ton proche est prévenu.')}
          </>
        )}
      </>
    )
  }

  // ——— Vu de l'envoyeur ———
  const lienPublic = x.type === 'liste' && x.code ? chemin('liste-publique', { l: x.code }) : x.type === 'cotisation' && x.code ? chemin('cotisation-participer', { c: x.code }) : null
  const reponses = (
    <>
      <div className="sec">
        <h2>{t(recu ? 'Ce qui a été fait' : 'Les réponses')}</h2>
      </div>
      {x.actions.length ? (
        <div className="card tight">
          {x.actions.map((a, i) => {
            const art = a.p ? x.lignes.find((l) => l.p === a.p)?.titre : null
            const quoi =
              a.quoi === 'offert'
                ? tf('{p} a offert {a}', { p: a.par, a: t(art ?? '') })
                : a.quoi === 'paye'
                  ? tf('{p} a payé', { p: a.par })
                  : a.quoi === 'participe'
                    ? tf('{p} a participé', { p: a.par })
                    : a.quoi === 'refuse'
                      ? tf('{p} a répondu non', { p: a.par })
                      : a.quoi === 'retire'
                        ? tf('{p} a retiré le colis', { p: a.par })
                        : a.quoi === 'vu'
                          ? tf('{p} a vu ton partage', { p: a.par })
                          : tf('{p} a accepté', { p: a.par })
            return (
              <div key={i} className="li">
                <span className={'ic' + (a.quoi === 'refuse' ? '' : ' or')}>
                  <Icone nom={a.quoi === 'refuse' ? 'circle-x' : 'circle-check'} taille={20} />
                </span>
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="lt" style={{ display: 'block' }}>
                    {quoi}
                  </span>
                  <span className="ls" style={{ display: 'block' }}>
                    {[a.montant ? F(a.montant) + ' F' : null, a.ref, dateLongue(a.le, langue), a.mot ? '« ' + a.mot + ' »' : null].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {a.ref && (recu ? a.par === m.prenom : false) && (
                  <Link className="chip" to={chemin('commande', { ref: a.ref })}>
                    {t('Suivre')}
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="t13 c3">{tf('Pas encore de réponse de {p}.', { p: autre })}</p>
      )}
    </>
  )
  // Le bénéficiaire remercie qui a payé : l'envoyeur remercie ceux qui ont agi ; le destinataire d'un cadeau
  // (colis, abonnement, panier famille…) remercie l'envoyeur.
  const peutRemercier = !x.merci && !merciEnvoye && (recu ? ['colis', 'abonnement', 'panier-famille', 'lien-famille', 'parrainage', 'code-retrait'].includes(x.type) && x.etat !== 'a_traiter' && x.etat !== 'refuse' && x.etat !== 'expire' : x.actions.some((a) => a.montant > 0 || a.quoi === 'accepte'))
  const remercie = recu ? x.de : (x.actions.find((a) => a.quoi !== 'refuse')?.par ?? x.pour)
  const blocMerci = merciEnvoye ? (
    <div className="note green blv-succes" role="status">
      <Icone nom="circle-check" taille={18} />
      <div>{tf('Merci envoyé à {p}.', { p: remercie })}</div>
    </div>
  ) : x.merci ? (
    <div className="note green">
      <Icone nom="heart" taille={18} />
      <div>{x.merci.de === m.prenom ? tf('Ton merci à {p} : « {m} »', { p: remercie, m: x.merci.texte }) : tf('Merci de {p} : « {m} »', { p: x.merci.de, m: x.merci.texte })}</div>
    </div>
  ) : peutRemercier ? (
    <div className="card">
      <div className="fld">
        <label htmlFor="rc-merci">{tf('Ton mot pour {p}', { p: remercie })}</label>
        <div className="inp">
          <input id="rc-merci" className="grow" value={merci} maxLength={280} placeholder={t('Merci, ça me touche beaucoup !')} onChange={(e) => setMerci(e.target.value)} />
        </div>
      </div>
      <div className="btns">
        <button
          type="button"
          className={'btn secondary' + (merci.trim() ? '' : ' off')}
          aria-disabled={!merci.trim() || undefined}
          onClick={async () => {
            if (!merci.trim()) return
            const r = await source.remercierRecu(x.id, merci)
            if (r.ok) {
              jouer('message')
              setMerciEnvoye(true)
              recharger()
            }
          }}
        >
          <Icone nom="heart" taille={18} />
          <span>{tf('Remercier {p}', { p: remercie })}</span>
        </button>
      </div>
    </div>
  ) : null

  const evenement = (x.type === 'liste' || x.type === 'cagnotte') && (x.date || x.hotes.length > 1 || x.lieu)
  const occ = NOMS_OCCASION.find(([k]) => k === x.occasion)
  return (
    <div className="blv-recu">
      <div className="card vedette mt12 row" style={{ gap: 12 }}>
        <Pastille prenom={autre} />
        <span className="grow" style={{ minWidth: 0 }}>
          <b className="t15" style={{ display: 'block' }}>
            {nomEnvoi(x, d.sens, t, tf)}
          </b>
          <span className="t12 c3">{tf(recu ? 'Reçu le {d} · {t}' : 'Envoyé le {d} · {t}', { d: dateLongue(x.le, langue), t: t(x.titre) })}</span>
        </span>
        <span className={'pill sm ' + couleur}>{tf(etat, { p: x.pour })}</span>
      </div>
      {fait && (
        <div ref={succes} className="note green blv-succes" role="status">
          <Icone nom="circle-check" taille={18} />
          <div>
            {fait.texte}
            {fait.ref && (
              <>
                {' '}
                <Link to={chemin('commande', { ref: fait.ref })}>{tf('Suivre {r}', { r: fait.ref })}</Link>
              </>
            )}
          </div>
        </div>
      )}
      {erreur && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={18} />
          <div>{t(erreur)}</div>
        </div>
      )}
      {x.etat === 'expire' && (
        <div className="note amber">
          <Icone nom="clock" taille={18} />
          <div>{t('Cet envoi a expiré : il ne peut plus être exécuté. Rien n’a été débité.')}</div>
        </div>
      )}
      {x.mot && (
        <div className="note ink">
          <Icone nom="message-circle" taille={18} />
          <div>
            {recu ? tf('{p} : ', { p: x.de }) : t('Ton mot : ')}« {x.mot} »
          </div>
        </div>
      )}
      {evenement && (
        <div className="card tight">
          {occ && (
            <div className="kv">
              <span className="k">{t('Occasion')}</span>
              <span className="v">
                <Icone nom={occ[2]} taille={14} /> {t(occ[1])}
              </span>
            </div>
          )}
          {x.hotes.length > 1 && (
            <div className="kv">
              <span className="k">{t(x.occasion === 'mariage' || x.occasion === 'dot' ? 'Les mariés' : 'Les hôtes')}</span>
              <span className="v">{x.hotes.join(' & ')}</span>
            </div>
          )}
          {x.date && (
            <div className="kv">
              <span className="k">{t('Le jour J')}</span>
              <span className="v">
                {jourSeul(x.date, langue)}
                {x.date > d.maintenant ? ' · ' + tf('dans {n} j', { n: joursAvant(x.date, d.maintenant) }) : ''}
              </span>
            </div>
          )}
          {x.lieu && (
            <div className="kv">
              <span className="k">{t('Cadeaux remis au')}</span>
              <span className="v">{t(x.lieu)}</span>
            </div>
          )}
          {x.jusqua && x.etat === 'a_traiter' && (
            <div className="kv">
              <span className="k">{t('Ouvert jusqu’au')}</span>
              <span className="v">{jourSeul(x.jusqua, langue)}</span>
            </div>
          )}
        </div>
      )}
      {!recu && (
        <div className={'note ' + (x.dansLApplication ? 'green' : 'amber')}>
          <Icone nom={x.dansLApplication ? 'inbox' : 'link'} taille={18} />
          <div>
            {x.dansLApplication ? tf('Dans l’application de {p} : il le retrouve dans ses Reçus, avec une notification.', { p: x.pour }) : tf('{p} n’a pas de compte BelivaY : partage-lui le lien, il peut tout faire sans compte.', { p: x.pour })}
            {!x.dansLApplication && lienPublic && (
              <>
                {' '}
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    void navigator.clipboard?.writeText(location.origin + lienPublic)
                    setCopie(true)
                  }}
                >
                  <Icone nom="copy" taille={14} />
                  {t(copie ? 'Lien copié' : 'Copier le lien')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {!recu && x.lignes.length > 0 && lignes(x.type === 'liste')}
      {corps}
      {(!recu || x.actions.length > 0) && reponses}
      {blocMerci}
      <div className="links">
        <Link to={chemin('recus', recu ? {} : { vue: 'envoyes' })}>{t(recu ? 'Tous mes reçus' : 'Tous mes envois')}</Link>
        {' · '}
        <span className="c3">
          <Icone nom={TYPE_ICONE[x.type]} taille={13} /> {t(TYPE_NOM[x.type])}
        </span>
      </div>
    </div>
  )
}
