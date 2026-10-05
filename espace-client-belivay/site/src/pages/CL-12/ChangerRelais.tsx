// Écran « Changer de point relais » (CL-12), forme d'origine du prototype rendue réelle (DP-54) : pour une commande
// (?ref=…) : ton relais (gérant, quartier, distance), les autres du plus proche au plus loin (un relais plein n'est
// pas proposé), le choix sur place et son détail (quartier, distance, horaires, prix), ce qui change. Gratuit tant
// que rien n'est collecté ; impossible pendant la tournée (l'ordre des arrêts est fixé au départ) ; colis déjà
// arrivés : transfert à 400 F par colis, plus la garde due, payés en Mobile Money (feuille du paiement). Tous les
// colis changent ensemble ; un nouveau code remplace l'ancien ; le 1er jour est gratuit au nouveau relais.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Dessin } from '../../composants/Dessin'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne, Zone } from '../../composants/Gabarits'
import { CartePosition, centreQuartier } from '../../composants/Position'
import { useColonnes } from '../CL-09/Commun'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type CommandeClient, type Relais } from '../../donnees/source'
import { F } from '../../i18n/format'
import { usePreferences } from '../../preferences'
import { CommandeIntrouvable } from '../CL-08/Confirmee'
import { enTournee, Onglets, Retour, TRANSFERT_PAR_COLIS } from './Commun'

const distance = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${String(km).replace('.', ',')} km`)

export function ChangerRelais() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const ref = params.get('ref') ?? 'BLV-52107'
  const [c, setC] = useState<CommandeClient | null | undefined>(undefined)
  const [relais, setRelais] = useState<Relais[]>([])
  const [choix, setChoix] = useState<Relais | null>(null)
  const [etape, setEtape] = useState<'choix' | 'payer' | 'attente' | 'fait'>('choix')
  const [envoi, setEnvoi] = useState(false)
  const lg = useColonnes()
  useEffect(() => {
    source.commandeClient(ref).then((d) => setC(d?.commande ?? null))
    source.relaisListe().then((d) => setRelais(d.relais))
  }, [ref])
  if (c === undefined) return null
  if (!c) return <CommandeIntrouvable route="changer-relais" />
  const actuel = relais.find((r) => r.nom === c.lieu)
  const autres = relais.filter((r) => r.nom !== c.lieu && !r.plein).sort((a, b) => a.km - b.km)
  const arrives = c.colis.filter((x) => x.arrive && !x.annule).length
  const nb = c.colis.filter((x) => !x.annule).length
  const garde = c.garde?.du ?? 0
  const transfert = arrives * TRANSFERT_PAR_COLIS
  const frais = arrives ? transfert + garde : 0
  const impossible = c.mode !== 'relais' ? 'domicile' : ['retiree', 'annulee', 'litige'].includes(c.etat) ? 'fini' : enTournee(c) ? 'tournee' : null
  const confirmer = async () => {
    if (!choix || envoi) return
    setEnvoi(true)
    await source.changerLieu(c.ref, choix.nom, frais)
    setEnvoi(false)
    setEtape('fait')
  }

  if (etape === 'fait' && choix)
    return (
      <Ecran route="changer-relais" sousTitre={c.ref}>
        <div className="hero green">
          <div className="hk">{t(frais ? 'Transfert demandé' : 'Relais changé')}</div>
          {frais ? <div className="cl12-bigt">{t(choix.nom)}</div> : <div className="cl11-ht">{tf('Tes {n} colis iront au {r}', { n: nb, r: t(choix.nom) })}</div>}
          <div className="hs">
            {frais ? tf('{m} F payés avec Mobile Money.', { m: F(frais) }) : t('Un nouveau code de retrait remplace l’ancien. Au nouveau relais, le 1er jour de garde est gratuit.')}
          </div>
        </div>
        <div className="sec">
          <h2>{t('Ce qui change maintenant')}</h2>
        </div>
        <div className="card">
          <div className="tl">
            <div className="ti done">
              <div className="tt">{t('Ton ancien code ne marche plus')}</div>
              <div className="td">{tf('Le {r} ne peut plus te remettre ces colis.', { r: t(c.lieu) })}</div>
            </div>
            <div className="ti cur">
              <div className="tt">{tf('Tes {n} colis partent au {r}', { n: nb, r: t(choix.nom) })}</div>
              <div className="td">{t('Avec la prochaine collecte de la zone.')}</div>
            </div>
            <div className="ti">
              <div className="tt">{t('À l’arrivée, ton nouveau code')}</div>
              <div className="td">{t('Une notification t’avertit, puis un SMS t’apporte le code. Il t’attend aussi dans Mes commandes.')}</div>
            </div>
            <div className="ti">
              <div className="tt">{t('Le 1er jour est gratuit')}</div>
              <div className="td">{tf('Le décompte de garde repart au jour 1 au {r}.', { r: t(choix.nom) })}</div>
            </div>
          </div>
        </div>
        <div className="btns mt16">
          <Link to={chemin('suivi', { ref: c.ref })} className="btn primary">
            <Icone nom="package" taille={18} />
            <span>{t('Suivre ma commande')}</span>
          </Link>
        </div>
        <Retour c={c} />
      </Ecran>
    )

  const entete = (
    <>
      <Onglets c={c} actif="lieu" />
      <div className="pg">
        <h1 className="pg-t">{t('Changer de point relais')}</h1>
        <p className="pg-s">
          <span className="nw">{tf('{ref} · {n} colis.', { ref: c.ref, n: nb })}</span>
          {arrives
            ? tf(' Tes {n} colis sont déjà au {r} : le transfert vers un autre relais coûte {m} F ({p} F par colis).', { n: arrives, r: t(c.lieu), m: F(transfert), p: TRANSFERT_PAR_COLIS })
            : t(' Gratuit tant que rien n’est collecté.')}
        </p>
      </div>
      {c.mode === 'relais' && (
        <div className="card or cl12-rc">
          <span className="portrait" style={{ width: '48px', height: '48px' }}>
            <Dessin id="fd9a43c6de73" />
          </span>
          <div className="grow">
            <div className="cl12-rk">{t('Ton relais')}</div>
            <span className="cl12-rn">{t(c.lieu)}</span>
            {actuel && (
              <>
                <span className="cl12-rs">{tf('{g} · quartier {q}', { g: t(actuel.gerant), q: t(actuel.quartier) })}</span>
                <span className="cl12-rs fx">
                  <Icone nom="footprints" taille={15} />
                  {tf('{d} de chez toi · {h}', { d: distance(actuel.km), h: t(actuel.horaires) })}
                </span>
              </>
            )}
            {arrives > 0 && (
              <div className="mt8">
                <span className="pill green sm">{tf('{n} colis ici', { n: arrives })}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )

  if (impossible)
    return (
      <Ecran route="changer-relais" sousTitre={c.ref}>
        {entete}
        {impossible === 'tournee' ? (
          <>
            <div className="card cl12-box info">
              <div className="ib">
                <Icone nom="truck" taille={18} />
                <div className="grow">
                  <div className="bt">{t('Impossible pendant la tournée')}</div>
                  <p>{tf('Tes {n} colis sont avec le livreur, en route vers le {r}.', { n: nb, r: t(c.lieu) })}</p>
                </div>
              </div>
            </div>
            <div className="hint-l">
              <Icone nom="arrow-left-right" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span>{tf('Dès leur arrivée, tu pourras les faire transférer vers un autre relais : {m} F ({p} F par colis).', { m: F(nb * TRANSFERT_PAR_COLIS), p: TRANSFERT_PAR_COLIS })}</span>
            </div>
            <details className="more">
              <summary>
                <Icone nom="circle-help" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
                <span className="grow">{t('Pourquoi ?')}</span>
                <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
              </summary>
              <div className="more-b">
                <p>{t('L’ordre des arrêts de la tournée est fixé au départ du livreur. Changer la destination d’un colis en route casserait cet ordre et la facture de la course.')}</p>
              </div>
            </details>
            <div className="btns mt16">
              <Link to={chemin('suivi', { ref: c.ref })} className="btn primary">
                <Icone nom="package" taille={18} />
                <span>{t('Suivre ma commande')}</span>
              </Link>
            </div>
          </>
        ) : (
          <div className="card">
            <div className="empty">
              <div className="ei">
                <Icone nom="map-pin" taille={26} />
              </div>
              <h3>{t(impossible === 'domicile' ? 'Cette commande est livrée à domicile' : 'Le relais ne change plus')}</h3>
              <p>{t(impossible === 'domicile' ? 'Tu peux changer l’adresse de livraison tant que le livreur n’a pas récupéré le colis.' : 'La commande est retirée, annulée ou en litige.')}</p>
              <div className="btns">
                <Link to={chemin(impossible === 'domicile' ? 'changer-adresse' : 'suivi', { ref: c.ref })} className="btn primary">
                  <span>{t(impossible === 'domicile' ? 'Changer d’adresse' : 'Suivre ma commande')}</span>
                </Link>
              </div>
            </div>
          </div>
        )}
        <Retour c={c} />
      </Ecran>
    )

  // Feuille du transfert payant : détail, puis la validation sur le téléphone.
  const feuille = choix && (etape === 'payer' || etape === 'attente') && (
    <Feuille ouverte fermer={() => setEtape('choix')} titre={tf('Transfert vers le {r}', { r: t(choix.nom) })} forme="tiroir">
      <div className="cl12-kick">{tf('Transfert vers le {r}', { r: t(choix.nom) })}</div>
      <h2 className="cl12-st-t">{tf('Montant dû : {m} F', { m: F(frais) })}</h2>
      <table className="tbl cl12-tbl mt12">
        <tbody>
          <tr>
            <td>
              {tf('Transfert de tes {n} colis', { n: arrives })}
              <small>{tf('Une course vers le {r}, avec les colis de la zone', { r: t(choix.nom) })}</small>
            </td>
            <td className="r nw">{F(transfert)}&nbsp;F</td>
          </tr>
          {garde > 0 && (
            <tr>
              <td>
                {tf('Garde au {r}', { r: t(c.lieu) })}
                <small>{t('Le 1er jour est gratuit, puis 100 F par jour')}</small>
              </td>
              <td className="r nw">{F(garde)}&nbsp;F</td>
            </tr>
          )}
          <tr className="tot">
            <td>{t('Montant dû')}</td>
            <td className="r nw">{F(frais)}&nbsp;F</td>
          </tr>
        </tbody>
      </table>
      <div className="hint-l">
        <Icone nom="map-pin" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{tf('{r} · quartier {q} · {d} de chez toi · {h}.', { r: t(choix.nom), q: t(choix.quartier), d: distance(choix.km), h: t(choix.horaires) })}</span>
      </div>
      <div className="hint-l">
        <Icone nom="key-round" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{tf('Ensuite : un nouveau code, et le 1er jour gratuit au {r}.', { r: t(choix.nom) })}</span>
      </div>
      {etape === 'attente' ? (
        <>
          <div className="card cl08-wait">
            <span className="cl08-spin"></span>
            <div className="grow">
              <b>{t('Valide la demande sur ton téléphone')}</b>
              <span className="s">{t('Mobile Money · ton numéro vérifié')}</span>
            </div>
          </div>
          <div className="btns">
            <button type="button" className={'btn primary' + (envoi ? ' off' : '')} onClick={confirmer}>
              <Icone nom="circle-check" taille={18} />
              <span>{t('J’ai validé sur mon téléphone')}</span>
            </button>
          </div>
          <p className="scrim-note" style={{ marginTop: '8px' }}>
            {t('Pas de demande reçue, ou refusée ? Rien n’a été débité et ton relais ne change pas : tu peux réessayer.')}
          </p>
          <div className="btns">
            <button type="button" className="btn secondary" onClick={() => setEtape('payer')}>
              <Icone nom="rotate-ccw" taille={18} />
              <span>{t('Renvoyer la demande')}</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="btns mt16">
            <button type="button" className="btn primary" onClick={() => setEtape('attente')}>
              <Icone nom="smartphone" taille={18} />
              <span>{tf('Payer {m} F avec Mobile Money', { m: F(frais) })}</span>
            </button>
          </div>
          <p className="scrim-note" style={{ marginTop: '8px' }}>
            {t('Tu valides la demande sur ton téléphone.')}
          </p>
        </>
      )}
      <div className="btns">
        <button type="button" className="btn ghost" onClick={() => setEtape('choix')}>
          <span>{tf('Garder le {r}', { r: t(c.lieu) })}</span>
        </button>
      </div>
    </Feuille>
  )

  return (
    <Ecran route="changer-relais" sousTitre={c.ref} fixes={feuille || undefined} gabarit="colonnes" largeur={lg.largeur}>
      {/* Grands écrans (§ 5.10) : la liste des relais à gauche ; à droite la carte des relais, le relais choisi,
          « Ce qui change » et le bouton de confirmation. */}
      <Zone nom="haut">{entete}</Zone>
      <Colonne>
      {garde > 0 && arrives > 0 && (
        <div className="card cl12-box amber">
          <div className="ib">
            <Icone nom="clock" taille={18} />
            <div className="grow">
              <p>
                {t('Montant dû ici aujourd’hui : ')}
                <b>{F(garde)}&nbsp;F</b>
                {t(' de garde. Il se paie avec le transfert ; au nouveau relais, le 1er jour est gratuit.')}
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="cl12-lh">{t('Autres relais, du plus proche au plus loin')}</div>
      {autres.map((r, i) => {
        const on = choix?.nom === r.nom
        return (
          <a key={r.nom} href="#" role="radio" aria-checked={on} className={'card cl12-rc' + (i === 0 ? ' near' : '') + (on ? ' on' : '')} onClick={(e) => (e.preventDefault(), setChoix(r))}>
            <span className="cl12-ava">
              <Icone nom={on ? 'circle-check' : 'store'} taille={20} />
            </span>
            <span className="grow">
              <span className="cl12-rn">{t(r.nom)}</span>
              <span className="cl12-rs">{tf('Quartier {q} · {h} · fermé le {f}', { q: t(r.quartier), h: t(r.horaires), f: t(r.ferme) })}</span>
            </span>
            <span className={'cl12-rd' + (i === 0 ? ' near' : '')}>
              {distance(r.km)}
              <small>{i === 0 ? t('le plus proche') : arrives ? tf('Transfert {m} F', { m: F(transfert) }) : t('Gratuit')}</small>
            </span>
          </a>
        )
      })}
      <div className="hint-l">
        <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Un relais plein ou fermé aujourd’hui n’est pas proposé.')}</span>
      </div>
      </Colonne>
      <Aside titre={t('Le relais choisi')}>
      {lg.colonnes && <CarteRelais centre={choix ?? actuel ?? null} autres={autres} choisir={setChoix} />}
      {choix && (
        <div className="card flat mt12" style={{ padding: '6px 14px' }}>
          <div className="cl12-kick">{t('Changer de point relais')}</div>
          <h2 className="cl12-st-t">{tf('Tes {n} colis iront au {r}', { n: nb, r: t(choix.nom) })}</h2>
          <div className="kv">
            <span className="k">{t('Quartier')}</span>
            <span className="v ">{t(choix.quartier)}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Distance')}</span>
            <span className="v ">{tf('{d} de chez toi', { d: distance(choix.km) })}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Horaires')}</span>
            <span className="v ">{tf('{h} · fermé le {f}', { h: t(choix.horaires), f: t(choix.ferme) })}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Prix')}</span>
            <span className="v ">{frais ? <b>{F(frais)}&nbsp;F</b> : <span className="cg b8">{t('Gratuit')}</span>}</span>
          </div>
        </div>
      )}
      <div className="btns mt16">
        <button type="button" className={'btn primary' + (choix && !envoi ? '' : ' off')} onClick={() => choix && (frais ? setEtape('payer') : confirmer())}>
          {choix && !frais && <Icone nom="check" taille={18} />}
          <span>{choix ? (frais ? tf('Payer {m} F et transférer', { m: F(frais) }) : tf('Confirmer le {r}', { r: t(choix.nom) })) : t('Choisis un relais')}</span>
        </button>
      </div>
      <div className="card cl12-box ors">
        <div className="bt">{t('Ce qui change')}</div>
        <div className="cl12-cl">
          <Icone nom="key-round" taille={17} />
          <div>
            <b>{t('Un nouveau code de retrait')}</b>
            <span>{t('L’ancien ne marche plus au comptoir.')}</span>
          </div>
        </div>
        <div className="cl12-cl">
          <Icone nom="calendar-check" taille={17} />
          <div>
            <b>{t('Le 1er jour est gratuit au nouveau relais')}</b>
            <span>{t('Le décompte de garde repart au jour 1.')}</span>
          </div>
        </div>
        <div className="cl12-cl">
          <Icone nom="package" taille={17} />
          <div>
            <b>{tf('Tes {n} colis changent ensemble', { n: nb })}</b>
            <span>{t('Un seul relais, un seul code.')}</span>
          </div>
        </div>
      </div>
      {arrives ? (
        <details className="more">
          <summary>
            <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
            <span className="grow">{tf('Pourquoi {p} F par colis ?', { p: TRANSFERT_PAR_COLIS })}</span>
            <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
          </summary>
          <div className="more-b">
            <p>{t('C’est le prix d’une remise au relais : une course emmène tes colis au nouveau relais, avec les colis de la zone.')}</p>
          </div>
        </details>
      ) : (
        <div className="card cl12-box info">
          <div className="ib">
            <Icone nom="info" taille={18} />
            <div className="grow">
              <p>{tf('Colis déjà arrivé au relais ? Le transfert vers un autre relais coûte {p} F par colis.', { p: TRANSFERT_PAR_COLIS })}</p>
            </div>
          </div>
        </div>
      )}
      <Retour c={c} />
      </Aside>
    </Ecran>
  )
}

// Carte des relais (grands écrans) : le relais choisi (sinon l'actuel) au centre, les plus proches en repères
// (Google ou OSM, comme le choix du relais).
// Google Maps : cliquer le repère d'un autre relais le choisit dans la liste.
function CarteRelais({ centre, autres, choisir }: { centre: Relais | null; autres: Relais[]; choisir: (r: Relais) => void }) {
  const { t, tf } = usePreferences()
  const point = centre ? centreQuartier(centre.quartier) : null
  if (!centre || !point) return null
  const c = { ...point, libelle: t(centre.nom) }
  return (
    <div className="card cl12-carte">
      <CartePosition
        c={c}
        nom={centre.nom}
        texte={tf('{r} · quartier {q}', { r: centre.nom, q: centre.quartier })}
        choisir={(nom) => {
          const r = autres.find((x) => x.nom === nom)
          if (r) choisir(r)
        }}
        marqueurs={[
          { ...c, nom: centre.nom, principal: true },
          ...autres
            .filter((r) => r.nom !== centre.nom)
            .slice(0, 5)
            .flatMap((r) => {
              const x = centreQuartier(r.quartier)
              return x ? [{ lat: x.lat, lon: x.lon, nom: r.nom }] : []
            }),
        ]}
      />
    </div>
  )
}
