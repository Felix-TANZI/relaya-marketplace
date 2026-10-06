// Écran « Retourner un article » (CL-11), forme d'origine du prototype rendue réelle (DP-54 ; DP-10 : tout retour
// passe par le relais). Onglets « Au comptoir » / « Retourner un article ».
// ?id= : le retour d'un dossier accepté, selon son étape réelle : dépôt au relais (le client le confirme ; déjà au
// relais après un constat au comptoir), collecte du livreur, inspection du vendeur (48 h, sinon remboursement
// automatique), dossier clos (remboursé, notification) ; l'argent reste bloqué jusque-là.
// ?ref= sans retour : la fenêtre de retour de la commande et ses colis retirés ; fenêtre passée : seul le défaut
// caché reste couvert (100 jours). Un retour commence toujours par un signalement. Règles du porteur : défaut
// caché découvert après 48 h = litige normal jusqu'à 7 jours, puis couvert 100 jours (DP-27, DP-35) ; pas de
// retour sans motif ; trajet retour 500 F à la charge de la partie en tort ; l'argent va où le veut la règle.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import img_0718fddbf299_png from '../../assets/prototype/0718fddbf299.png'
import { Ecran } from '../../composants/coque'
import { useColonnes } from '../CL-09/Commun'
import { Aside, Colonne, Zone } from '../../composants/Gabarits'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type CommandeClient, type Litige, type Relais } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA, heureSeule, jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { ORDRE_RETOUR, TRAJET_RETOUR, useRemboursement } from './Commun'

const H = 3600 * 1000
const JOUR = 24 * H

function Onglets({ ref_ }: { ref_: string | null }) {
  const { t } = usePreferences()
  return (
    <div className="seg cl11-tabs">
      <Link to={ref_ ? chemin('comptoir', { ref: ref_ }) : chemin('comptoir')}>{t('Au comptoir')}</Link>
      <a href="#" className="on" aria-current="page" onClick={(e) => e.preventDefault()}>
        {t('Retourner un article')}
      </a>
    </div>
  )
}

function Regles({ payePar }: { payePar: string | null }) {
  const { t, tf } = usePreferences()
  const remb = useRemboursement(payePar)
  return (
    <>
      <details className="more">
        <summary>
          <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
          <span className="grow">{t('Comment ça marche')}</span>
          <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
        </summary>
        <div className="more-b">
          <p>
            {t('On retourne un article ')}
            <b>{t('non conforme, abîmé, contrefait')}</b>
            {t(', ou avec un ')}
            <b>{t('défaut caché')}</b>
            {t('. Pas de retour pour un changement d’avis.')}
          </p>
          <p>{t('Tu as 7 jours après le retrait pour signaler. « Tout est en ordre » au comptoir ferme ce délai plus tôt, sauf pour un défaut caché : il reste couvert 100 jours après le retrait.')}</p>
          <p>{tf('Le trajet retour ({m} F) est une course normale du livreur, payée par la partie en tort : le vendeur, le transporteur ou toi. Problème validé : tu ne paies rien.', { m: F(TRAJET_RETOUR) })}</p>
          <p>{tf('Tu es remboursée quand le vendeur a reçu et inspecté l’article (48 h au plus) : {ou}, {quand}.', { ou: remb.ou, quand: remb.quand })}</p>
          {remb.ensuite && <p>{remb.ensuite}</p>}
        </div>
      </details>
      <Link to={chemin('legal-doc', { d: 'retours' })} className="cl11-other">
        {t('Règles des retours et des litiges')}
      </Link>
    </>
  )
}

function Article({ dessin, titre, sous }: { dessin: string; titre: string; sous: ReactNode }) {
  return (
    <div className="cl11-pc">
      <span className="thumb" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
        <Dessin id={dessin} />
      </span>
      <span className="grow">
        <b className="t14 b8" style={{ display: 'block' }}>
          {titre}
        </b>
        <span className="t13 c3" style={{ display: 'block', marginTop: '2px' }}>
          {sous}
        </span>
      </span>
    </div>
  )
}

export function Retour() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const id = params.get('id')
  const ref = params.get('ref')
  const [l, setL] = useState<Litige | null | undefined>(undefined)
  const [c, setC] = useState<{ commande: CommandeClient; maintenant: number } | null>(null)
  const [payePar, setPayePar] = useState<string | null>(null)
  const [relais, setRelais] = useState<Relais[]>([])
  const [envoi, setEnvoi] = useState(false)
  const [version, setVersion] = useState(0)
  const remb = useRemboursement(payePar)
  const lg = useColonnes()
  useEffect(() => {
    source.relaisListe().then((d) => setRelais(d.relais))
  }, [])
  useEffect(() => {
    source.litiges().then((d) => {
      const x = d.litiges.find((y) => y.retour && (id ? y.id === id : !ref || y.ref === ref)) ?? null
      setL(x)
      if (x) source.commandeLitige(x.ref).then((cl) => setPayePar(cl?.payePar ?? null))
    })
    if (ref) source.commandeClient(ref).then(setC)
  }, [id, ref, version])
  if (l === undefined) return null

  // Sans retour en cours : la fenêtre de retour de la commande (?ref=), ou l'invitation à signaler.
  if (!l) {
    const cmd = c?.commande
    const maintenant = c?.maintenant ?? 0
    const passe = !!cmd?.retourJusqua && maintenant > cmd.retourJusqua
    const finCachee = cmd?.retireeLe ? cmd.retireeLe + 100 * JOUR : null
    if (cmd && passe)
      return (
        <Ecran route="retour">
          <Onglets ref_={cmd.ref} />
          <div className="card cl11-lead">
            <h2 className="cl11-h">{t('Le délai de retour est passé')}</h2>
            <div className="cl11-sep"></div>
            <Article
              dessin={cmd.colis[0]?.dessin ?? ''}
              titre={t(cmd.colis[0]?.produit ?? '')}
              sous={tf('{n} colis · {ref}', { n: cmd.colis.length, ref: cmd.ref })}
            />
            <div className="cl11-sep"></div>
            {cmd.retireeLe && (
              <div className="kv" style={{ paddingTop: '0' }}>
                <span className="k">{t('Retiré le')}</span>
                <span className="v">{jourSeul(cmd.retireeLe, langue)}</span>
              </div>
            )}
            <div className="kv">
              <span className="k">{t('Retour possible jusqu’au')}</span>
              <span className="v">{tf('{d} · fermé', { d: jourSeul(cmd.retourJusqua!, langue) })}</span>
            </div>
          </div>
          <div className="note amber">
            <Icone nom="calendar-x" taille={18} />
            <div>
              <b>{t('Le retour n’est plus possible.')}</b>
              {finCachee
                ? tf(' Un défaut caché reste couvert 100 jours, jusqu’au {d} : BelivaY l’examine comme un litige.', { d: jourSeul(finCachee, langue) })
                : t(' Un défaut caché reste couvert 100 jours : BelivaY l’examine comme un litige.')}
            </div>
          </div>
          <div className="btns">
            <Link to={chemin('litige', { ref: cmd.ref })} className="btn primary">
              <Icone nom="circle-alert" taille={18} />
              <span>{t('Signaler un défaut caché')}</span>
            </Link>
          </div>
          <Regles payePar={payePar} />
        </Ecran>
      )
    return (
      <Ecran route="retour">
        <Onglets ref_={ref} />
        <div className="card cl11-lead">
          <h2 className="cl11-h">{t('Aucun retour en cours')}</h2>
          <p className="cl11-p">{t('Un retour commence toujours par un signalement : dis-nous ce qui ne va pas, BelivaY organise le reste.')}</p>
          {cmd && (
            <>
              <div className="cl11-sep"></div>
              <div className="kv" style={{ paddingTop: '0' }}>
                <span className="k">{t('Retour possible jusqu’au')}</span>
                <span className="v">{cmd.retourJusqua ? jourSeul(cmd.retourJusqua, langue) : t('après le retrait')}</span>
              </div>
              {cmd.retireeLe && (
                <div className="kv">
                  <span className="k">{t('Défaut caché couvert jusqu’au')}</span>
                  <span className="v">{jourSeul(cmd.retireeLe + 100 * JOUR, langue)}</span>
                </div>
              )}
            </>
          )}
        </div>
        {cmd && (
          <div className="card">
            <h3 className="cl11-k">{t(cmd.retireeLe ? 'Tes colis retirés' : 'Les colis de la commande')}</h3>
            {cmd.colis.map((x, i) => (
              <div key={x.n}>
                {i > 0 && <div className="cl11-sep"></div>}
                <Article
                  dessin={x.dessin}
                  titre={t(x.produit)}
                  sous={
                    cmd.retireeLe
                      ? tf('Colis {n} · {m} F · retiré le {d}', { n: x.n, m: F(x.prix * x.qte), d: dateA(cmd.retireeLe, langue) })
                      : tf('Colis {n} · {m} F', { n: x.n, m: F(x.prix * x.qte) })
                  }
                />
              </div>
            ))}
          </div>
        )}
        {cmd?.retourJusqua && (
          <div className="note ink cl11-money">
            <Icone nom="lock" taille={18} />
            <div>
              <b>{tf('Jusqu’au {d}, rien n’est versé aux vendeurs.', { d: jourSeul(cmd.retourJusqua, langue) })}</b>
              {t(' « Tout est en ordre » au comptoir les paie plus tôt.')}
            </div>
          </div>
        )}
        <div className="btns">
          <Link to={ref ? chemin('litige', { ref }) : chemin('commandes', { onglet: 'terminees' })} className="btn primary">
            <Icone nom="circle-alert" taille={18} />
            <span>{t(ref ? 'Signaler un problème' : 'Choisir une commande')}</span>
          </Link>
        </div>
        <Regles payePar={payePar} />
      </Ecran>
    )
  }

  const r = l.retour!
  const n = ORDRE_RETOUR.indexOf(r.etape)
  const lieu = relais.find((x) => x.nom === l.relais)
  const quartier = lieu?.quartier ?? null
  const dejaAuRelais = l.origine === 'comptoir'
  const moyen = remb.ou
  const article = <Article dessin={l.dessin} titre={t(l.produit)} sous={tf('Colis {n} · {ref} · dossier {id}', { n: l.colis, ref: l.ref, id: l.id })} />
  const deposer = async () => {
    if (envoi) return
    setEnvoi(true)
    await source.deposerRetour(l.id)
    setEnvoi(false)
    setVersion((v) => v + 1)
  }
  const date = (k: (typeof ORDRE_RETOUR)[number]) => r.dates[k]
  const etapes = [
    {
      titre: 'Tu déposes le colis au relais',
      sous:
        n > 0 && date('depose')
          ? tf('Retour déposé · {d}', { d: dateA(date('depose')!, langue) })
          : dejaAuRelais
            ? tf('Déjà au relais · gardé depuis le {d}', { d: dateA(l.ouvertLe, langue) })
            : lieu
              ? tf('{g} le scanne · {r}, {h}', { g: lieu.gerant, r: t(l.relais), h: lieu.horaires })
              : t('Le gérant le scanne et le photographie'),
    },
    {
      titre: 'Le livreur le récupère',
      sous: n > 1 && date('collecte') ? tf('Récupéré · {d}', { d: dateA(date('collecte')!, langue) }) : quartier ? tf('dans sa tournée de {q}', { q: quartier }) : t('dans sa tournée, sans course spéciale'),
    },
    {
      titre: 'Le vendeur le reçoit et l’inspecte',
      sous:
        n > 2 && date('inspection')
          ? tf(n > 3 ? 'Reçu le {d} · inspecté' : 'Reçu le {d} · en cours', { d: dateA(date('inspection')!, langue) })
          : t(n === 2 ? 'sous 48 h après réception' : 'sous 48 h'),
    },
    { titre: 'Dossier clos', sous: n > 3 && date('clos') ? dateA(date('clos')!, langue) : r.etape === 'depot' ? tf('remboursement {moyen}', { moyen }) : '' },
  ]
  const fait = dejaAuRelais && r.etape === 'depot' ? 1 : n
  const suivi = (
    <div className="card">
      <h3 className="cl11-k">{t(r.etape === 'depot' ? 'Ce qui se passe ensuite' : 'Où en est ton retour')}</h3>
      <div className="tl cl11-tl">
        {etapes.map((e, i) => (
          <div key={e.titre} className={'ti ' + (i < fait || r.etape === 'clos' ? 'done' : i === fait ? 'cur' : '')}>
            <div className="tt">{t(e.titre)}</div>
            {e.sous && <div className="td">{e.sous}</div>}
          </div>
        ))}
      </div>
    </div>
  )
  const gratuit = (
    <div className="card info cl11-box">
      <b>{t('Retour gratuit si le problème est validé')}</b>
      <p>{tf('Le trajet retour ({m} F) est payé par la partie en tort : BelivaY décide après avoir vu les preuves.', { m: F(TRAJET_RETOUR) })}</p>
    </div>
  )
  const bloque = (
    <div className="note ink cl11-money">
      <Icone nom="lock" taille={18} />
      <div>
        <b>{tf('Tes {m} F restent bloqués jusqu’à la clôture.', { m: F(l.montant) })}</b>
      </div>
    </div>
  )
  const dossier = (
    <div className="btns">
      <Link to={chemin('litige-suivi', { id: l.id })} className="btn secondary">
        <span>{tf('Voir le dossier {id}', { id: l.id })}</span>
      </Link>
    </div>
  )

  if (r.etape === 'clos')
    return (
      <Ecran route="retour" sousTitre={l.id} gabarit="colonnes" largeur={lg.largeur}>
        <Zone nom="haut">
        <Onglets ref_={l.ref} />
        </Zone>
        <Colonne>
        <div className="hero green">
          <div className="hk">{t('Dossier clos')}</div>
          <div className="cl11-ht">{t('Remboursée')}</div>
          <div className="big" style={{ fontSize: '34px' }}>
            {F(l.montant)}&nbsp;F
          </div>
          <div className="hs">{tf('Envoyés {ou}.', { ou: remb.ou })}</div>
        </div>
        <div className="card green cl11-box">
          <b>{t('Ce retour ne te coûte rien')}</b>
          <p>{l.decision ? t(l.decision.motif) : t('Aucun frais de garde sur un colis en retour.')}</p>
        </div>
        <div className="card">{article}</div>
        {suivi}
        </Colonne>
        <Aside titre={t('Ton remboursement')}>
        {date('clos') && (
          <div className="lock cl11-lock">
            <div className="t12 b7" style={{ opacity: '.8' }}>
              {t('Notification reçue')}
            </div>
            <div className="push">
              <span className="pi">
                <img src={img_0718fddbf299_png} alt="" />
              </span>
              <div className="grow">
                <div className="row" style={{ gap: '6px' }}>
                  <span className="pt grow">{tf('Remboursement · {id}', { id: l.id })}</span>
                  <span className="pw">{heureSeule(date('clos')!, langue)}</span>
                </div>
                <div className="pb">{tf('{m} F envoyés {moyen}. Dossier clos.', { m: F(l.montant), moyen })}</div>
              </div>
            </div>
          </div>
        )}
        <div className="btns">
          <Link to={chemin('litiges')} className="btn secondary">
            <span>{t('Voir mes litiges')}</span>
          </Link>
        </div>
        </Aside>
        <Zone nom="bas">
        <Regles payePar={payePar} />
        </Zone>
      </Ecran>
    )

  if (r.etape === 'inspection')
    return (
      <Ecran route="retour" sousTitre={l.id} gabarit="colonnes" largeur={lg.largeur}>
        <Zone nom="haut">
        <Onglets ref_={l.ref} />
        </Zone>
        <Colonne>
        <div className="hero night">
          <div className="hk">{t('Le vendeur inspecte ton retour')}</div>
          <div className="cl11-ht">{tf('Avant le {d}', { d: dateA(r.avant, langue) })}</div>
          <div className="hs">{t('Sans réponse du vendeur à cette heure-là, tu es remboursée automatiquement.')}</div>
        </div>
        <div className="card">{article}</div>
        {suivi}
        </Colonne>
        <Aside titre={t('Ton argent')}>
        {gratuit}
        {bloque}
        {dossier}
        </Aside>
        <Zone nom="bas">
        <Regles payePar={payePar} />
        </Zone>
      </Ecran>
    )

  const lead =
    r.etape === 'depot'
      ? dejaAuRelais
        ? { h: 'Rien à déposer', p: t('Ton article est déjà au relais depuis le constat.') }
        : { h: 'Tu n’as rien à organiser', p: tf('Rapporte le colis au {r}. Le livreur le reprend dans sa tournée.', { r: t(l.relais) }) }
      : r.etape === 'depose'
        ? { h: 'C’est déposé', p: t('La suite se fait sans toi.') }
        : { h: 'Ton colis est en route vers le vendeur', p: quartier ? tf('Pris dans la tournée de {q}, sans course spéciale.', { q: quartier }) : t('Pris dans la tournée, sans course spéciale.') }

  return (
    <Ecran route="retour" sousTitre={l.id} gabarit="colonnes" largeur={lg.largeur}>
      {/* Grands écrans (§ 5.10) : les étapes à gauche, l'argent, le relais et l'action à droite. */}
      <Zone nom="haut">
      <Onglets ref_={l.ref} />
      </Zone>
      <Colonne>
      <div className="card cl11-lead">
        <h2 className="cl11-h">{t(lead.h)}</h2>
        <p className="cl11-p">{lead.p}</p>
        <div className="cl11-sep"></div>
        {article}
        {r.etape === 'depot' && !dejaAuRelais && (
          <>
            <div className="cl11-sep"></div>
            <div className="kv" style={{ paddingTop: '0' }}>
              <span className="k">{t('À déposer avant le')}</span>
              <span className="v">{dateA(r.avant, langue)}</span>
            </div>
          </>
        )}
      </div>
      {suivi}
      {(r.etape === 'depose' || r.etape === 'collecte') && (
        <div className="card">
          <h3 className="cl11-k">{t(r.etape === 'depose' ? 'Retour déposé' : 'Récupéré par le livreur')}</h3>
          <div className="cl11-pics">
            <div className="cl11-pic">
              <div className="photo">
                <Dessin id={l.dessin} />
              </div>
              <span>
                <b>{t(r.etape === 'depose' ? 'Photo du dépôt' : 'Photo de collecte')}</b>
                {r.etape === 'depose' ? (lieu ? tf(' · {g}', { g: lieu.gerant }) : t(' · le gérant')) : t(' · prise par le livreur')}
              </span>
            </div>
            {r.etape === 'depose' && (
              <div className="card flat" style={{ marginTop: '0', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
                <span className="pill green sm">
                  <Icone nom="check" taille={13} />
                  {t('Aucun frais de garde')}
                </span>
                <span className="t13 c2" style={{ lineHeight: '1.4' }}>
                  {t('Un colis en retour ne coûte rien au relais.')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      </Colonne>
      <Aside titre={t('Ton argent')}>
      {gratuit}
      {bloque}
      {r.etape === 'depot' && !dejaAuRelais && (
        <>
          <div className="btns">
            <button type="button" className={'btn primary' + (envoi ? ' off' : '')} onClick={deposer}>
              <Icone nom="package-check" taille={18} />
              <span>{t('J’ai déposé le colis au relais')}</span>
            </button>
          </div>
          <div className="hint-l">
            <Icone nom="package" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Rapporte-le dans son carton, avec tout ce qu’il contenait. Un colis en retour ne coûte rien au relais.')}</span>
          </div>
        </>
      )}
      {r.etape === 'depose' && (
        <div className="note green">
          <Icone nom="circle-check" taille={18} />
          <div>{t('Dépôt enregistré. Le gérant confirme en scannant le colis ; tu reçois une notification à chaque étape.')}</div>
        </div>
      )}
      {dossier}
      </Aside>
      <Zone nom="bas">
      <Regles payePar={payePar} />
      </Zone>
    </Ecran>
  )
}
