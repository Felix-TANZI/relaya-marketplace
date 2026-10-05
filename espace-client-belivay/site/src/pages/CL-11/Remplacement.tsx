// Écran « Remplacement » (CL-11), forme d'origine du prototype rendue réelle (DP-54) : le remplacement accepté
// d'un dossier (?id=), selon l'étape réelle : le vendeur renvoie l'article neuf avant l'échéance, livraison
// offerte, sinon remboursement automatique (retard) ; en route, arrivé, remis (jauge des quatre étapes) ; s'il
// n'en a plus, un autre vendeur (Trust Score 75 au moins) peut servir, l'écart payé par BelivaY, ou le client se
// fait rembourser ; l'argent reste bloqué jusqu'à la remise ; l'ancien article repart du relais. Renvoi sous
// 72 h ouvrées, dimanche non compté (DP-15) ; un remboursement va où le veut la règle (useRemboursement).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { useColonnes } from '../CL-09/Commun'
import { Dessin } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type EtapeRemplacement, type Litige } from '../../donnees/source'
import { F } from '../../i18n/format'
import { dateA } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useRemboursement } from './Commun'

const SUIVI: { k: EtapeRemplacement; titre: string }[] = [
  { k: 'attente', titre: 'Préparation' },
  { k: 'expedie', titre: 'Récupéré' },
  { k: 'arrive', titre: 'Arrivé au relais' },
  { k: 'remis', titre: 'Retiré' },
]

export function Remplacement() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const id = params.get('id')
  const [l, setL] = useState<Litige | null | undefined>(undefined)
  const [payePar, setPayePar] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [version, setVersion] = useState(0)
  const remb = useRemboursement(payePar)
  const lg = useColonnes()
  useEffect(() => {
    source.litiges().then((d) => {
      const x = d.litiges.find((y) => (id ? y.id === id : !!y.remplacement)) ?? null
      setL(x)
      if (x) source.commandeLitige(x.ref).then((c) => setPayePar(c?.payePar ?? null))
    })
  }, [id, version])
  if (l === undefined) return null
  if (!l || !l.remplacement)
    return (
      <Ecran route="remplacement">
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="repeat" taille={26} />
            </div>
            <h3>{t(l?.etat === 'rembourse' ? 'Remboursement choisi' : 'Aucun remplacement en cours')}</h3>
            <p>{l?.etat === 'rembourse' ? tf('{m} F versés {ou}, {quand}.', { m: F(l.montant), ou: remb.ou, quand: remb.quand }) : t('Un remplacement commence quand le vendeur l’accepte dans un litige.')}</p>
            <div className="btns">
              <Link to={l ? chemin('litige-suivi', { id: l.id }) : chemin('litiges')} className="btn primary">
                <span>{t(l ? 'Voir le dossier' : 'Mes litiges')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const r = l.remplacement
  const n = SUIVI.findIndex((x) => x.k === r.etape)
  const choisir = async (autre: boolean) => {
    if (envoi) return
    setEnvoi(true)
    await source.choisirRemplacement(l.id, autre)
    setEnvoi(false)
    setVersion((v) => v + 1)
  }
  const sous = (texte: string) => (
    <span className="t13 c3" style={{ display: 'block', marginTop: '2px' }}>
      {texte}
    </span>
  )
  const article = (sousTitre: string) => (
    <div className="cl11-pc">
      <span className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }}>
        <Dessin id={l.dessin} />
      </span>
      <span className="grow">
        <b className="t15 b8" style={{ display: 'block' }}>
          {tf('{p} · neuf', { p: t(l.produit) })}
        </b>
        {sous(sousTitre)}
      </span>
    </div>
  )
  const livraison = (
    <>
      <div className="cl11-sep"></div>
      <div className="kv" style={{ paddingTop: '0' }}>
        <span className="k">{t('Livraison')}</span>
        <span className="v cg">{t('Offerte · 0 F')}</span>
      </div>
      <div className="kv">
        <span className="k">{t('Retrait')}</span>
        <span className="v">{t(l.relais)}</span>
      </div>
    </>
  )
  const jauge = (
    <div className="mt10 cl11-g">
      <div className="gauge">
        {SUIVI.map((e, i) => (
          <i key={e.k} className={(i <= n ? 'on' : '') + (i === n && r.etape !== 'remis' ? ' cur' : '')}></i>
        ))}
      </div>
      <div className="gauge-l">
        {SUIVI.map((e, i) => (
          <span key={e.k} className={i === n ? 'on' : ''}>
            {t(e.titre)}
          </span>
        ))}
      </div>
    </div>
  )
  const ancien = (
    <div className="card">
      <div className="cl11-row">
        <span className="ic-sq ">
          <Icone nom="undo-2" taille={20} />
        </span>
        <span className="grow">
          <span className="t" style={{ display: 'block' }}>
            {t('L’ancien article repart du relais vers le vendeur.')}
          </span>
          <span className="s" style={{ display: 'block' }}>
            {t('Tu n’as rien à faire.')}
          </span>
        </span>
      </div>
    </div>
  )
  const bloque = (
    <div className="note ink cl11-money">
      <Icone nom="lock" taille={18} />
      <div>
        <b>{tf('Tes {m} F restent bloqués', { m: F(l.montant) })}</b>
        {t(' jusqu’à la remise du nouvel article.')}
      </div>
    </div>
  )
  const dossier = (
    <div className="links">
      <Link to={chemin('litige-suivi', { id: l.id })}>{tf('Voir le dossier {id}', { id: l.id })}</Link>
    </div>
  )

  if (r.etape === 'autre' && r.autre)
    return (
      <Ecran route="remplacement" sousTitre={l.id}>
        <div className="hero night">
          <div className="hk">{t('Le vendeur n’a plus cet article')}</div>
          <div className="cl11-ht">{t('Un autre vendeur a le même article')}</div>
          <div className="hs">{tf('Tu choisis : ce vendeur, ou le remboursement de {m} F.', { m: F(l.montant) })}</div>
        </div>
        <div className="card">
          <div className="cl11-pc">
            <span className="thumb" style={{ width: '56px', height: '56px', borderRadius: '14px' }}>
              <Dessin id={l.dessin} />
            </span>
            <span className="grow">
              <b className="t15 b8" style={{ display: 'block' }}>
                {tf('{p} · neuf', { p: t(l.produit) })}
              </b>
              {sous(t('Même article, autre vendeur'))}
            </span>
          </div>
          <div className="cl11-tier mt10">
            <span className="tier">
              <Icone nom="badge-check" taille={14} />
              {tf('{b} · Trust Score {s}', { b: t(r.autre.boutique), s: r.autre.trust })}
            </span>
          </div>
          <div className="cl11-sep"></div>
          <div className="kv" style={{ paddingTop: '0' }}>
            <span className="k">{t('Pour toi')}</span>
            <span className="v">{t('0 F de plus')}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Écart de prix')}</span>
            <span className="v">{tf('{m} F payés par BelivaY', { m: F(r.autre.ecart) })}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Livraison')}</span>
            <span className="v cg">{t('Offerte · 0 F')}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Retrait')}</span>
            <span className="v">{t(l.relais)}</span>
          </div>
        </div>
        <div className="btns">
          <button type="button" className={'btn primary' + (envoi ? ' off' : '')} onClick={() => choisir(true)}>
            <span>{t('Accepter ce vendeur')}</span>
          </button>
        </div>
        <div className="btns">
          <button type="button" className={'btn secondary' + (envoi ? ' off' : '')} onClick={() => choisir(false)}>
            <span>{tf('Me faire rembourser {m} F', { m: F(l.montant) })}</span>
          </button>
        </div>
        <div className="hint-l">
          <Icone nom="badge-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Seul un vendeur avec un Trust Score d’au moins 75 peut te servir.')}</span>
        </div>
        <div className="hint-l">
          <Icone nom="banknote" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('Si tu choisis le remboursement : {m} F {ou}, {quand}.', { m: F(l.montant), ou: remb.ou, quand: remb.quand })}</span>
        </div>
        {dossier}
      </Ecran>
    )

  if (r.etape === 'retard')
    return (
      <Ecran route="remplacement" sousTitre={l.id}>
        <div className="hero green">
          <div className="hk">{t('Remboursement automatique')}</div>
          <div className="cl11-ht">{t('Remboursée')}</div>
          <div className="big" style={{ fontSize: '34px' }}>
            {F(l.montant)}&nbsp;F
          </div>
          <div className="hs">
            {tf('Tu recevras cette somme {ou}, {quand}.', { ou: remb.ou, quand: remb.quand })}
          </div>
        </div>
        <div className="note amber">
          <Icone nom="clock-alert" taille={18} />
          <div>
            {t('Le vendeur n’a pas renvoyé l’article avant le ')}
            <b>{dateA(r.avant, langue)}</b>
            {t('. Tu n’as rien eu à demander.')}
          </div>
        </div>
        {ancien}
        <div className="btns">
          <Link to={chemin('litiges')} className="btn secondary">
            <span>{t('Voir mes litiges')}</span>
          </Link>
        </div>
        {dossier}
      </Ecran>
    )

  if (r.etape === 'remis')
    return (
      <Ecran route="remplacement" sousTitre={l.id}>
        <div className="hero green">
          <div className="hk">{t('Remplacement remis')}</div>
          <div className="cl11-ht">{t('Ton nouvel article est à toi')}</div>
          <div className="hs">{tf('Le litige {id} est clos.', { id: l.id })}</div>
        </div>
        <div className="card">
          {article(r.dates.remis ? tf('Remis le {d}', { d: dateA(r.dates.remis, langue) }) : t('Remis'))}
          {jauge}
          {livraison}
        </div>
        <div className="card">
          <div className="cl11-row">
            <span className="ic-sq ">
              <Icone nom="banknote" taille={20} />
            </span>
            <span className="grow">
              <span className="t" style={{ display: 'block' }}>
                {tf('Ton paiement de {m} F est libéré pour le vendeur.', { m: F(l.montant) })}
              </span>
              <span className="s" style={{ display: 'block' }}>
                {t('L’argent restait bloqué jusqu’à cette remise.')}
              </span>
            </span>
          </div>
        </div>
        <div className="btns">
          <Link to={chemin('commande', { ref: l.ref })} className="btn primary">
            <span>{t('Voir ma commande')}</span>
          </Link>
        </div>
        {dossier}
      </Ecran>
    )

  if (r.etape === 'expedie' || r.etape === 'arrive')
    return (
      <Ecran route="remplacement" sousTitre={l.id} gabarit="colonnes" largeur={lg.largeur}>
        <Colonne>
        <div className="hero night">
          <div className="hk">{t(r.etape === 'arrive' ? 'Arrivé au relais' : 'Nouvel article en route')}</div>
          <div className="cl11-ht">{r.etape === 'arrive' ? tf('Au {r}', { r: t(l.relais) }) : tf('Au {r} avant le {d}', { r: t(l.relais), d: dateA(r.avant, langue) })}</div>
          <div className="hs">{t(r.etape === 'arrive' ? 'Ton code de retrait t’attend dans Mes commandes.' : 'Ton code de retrait t’attendra dans Mes commandes.')}</div>
        </div>
        <div className="card">
          {article(
            r.etape === 'arrive'
              ? r.dates.arrive
                ? tf('Arrivé au relais · {d}', { d: dateA(r.dates.arrive, langue) })
                : t('Arrivé au relais')
              : r.dates.expedie
                ? tf('Récupéré par le livreur · {d}', { d: dateA(r.dates.expedie, langue) })
                : t('Récupéré par le livreur'),
          )}
          {jauge}
          {livraison}
        </div>
        </Colonne>
        <Aside titre={t('Ton argent')}>
        {bloque}
        {ancien}
        <div className="btns">
          {r.etape === 'arrive' ? (
            <Link to={chemin('commandes')} className="btn primary">
              <Icone nom="qr-code" taille={18} />
              <span>{t('Mes commandes')}</span>
            </Link>
          ) : (
            <Link to={chemin('suivi', { ref: l.ref })} className="btn secondary">
              <span>{t('Suivre le colis')}</span>
            </Link>
          )}
        </div>
        {dossier}
        </Aside>
      </Ecran>
    )

  return (
    <Ecran route="remplacement" sousTitre={l.id} gabarit="colonnes" largeur={lg.largeur}>
      {/* Grands écrans (§ 5.10) : l'article et sa livraison à gauche, l'argent bloqué et le dossier à droite. */}
      <Colonne>
      <div className="hero night">
        <div className="hk">{t('Le vendeur renvoie un article neuf avant le')}</div>
        <div className="cl11-ht">{dateA(r.avant, langue)}</div>
        <div className="hs">{tf('Passé ce délai, tu es remboursée automatiquement de {m} F.', { m: F(l.montant) })}</div>
      </div>
      <div className="hint-l">
        <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{tf('Le vendeur a 72 h ouvrées pour renvoyer l’article (le dimanche ne compte pas). Sinon : {m} F {ou}, sans rien demander.', { m: F(l.montant), ou: remb.ou })}</span>
      </div>
      <div className="card">
        {article(r.dates.attente ? tf('Accepté par le vendeur le {d}', { d: dateA(r.dates.attente, langue) }) : t('Accepté par le vendeur'))}
        {livraison}
      </div>
      </Colonne>
      <Aside titre={t('Ton argent')}>
      {bloque}
      {ancien}
      <div className="btns">
        <Link to={chemin('litige-suivi', { id: l.id })} className="btn secondary">
          <span>{tf('Voir le dossier {id}', { id: l.id })}</span>
        </Link>
      </div>
      </Aside>
    </Ecran>
  )
}
