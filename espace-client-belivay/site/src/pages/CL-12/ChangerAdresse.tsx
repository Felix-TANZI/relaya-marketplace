// Écran « Changer d'adresse » (CL-12), forme d'origine du prototype rendue réelle (DP-54) : une commande livrée à
// domicile (?ref=…) : la livraison prévue, ses boutiques et ce qui a été payé ; « Livrer ailleurs » ouvre la
// feuille des adresses enregistrées (zones servies ; en ajouter une par repères) : gratuit tant que le livreur n'a
// pas récupéré le colis, l'heure est recalculée ; pendant la livraison, l'adresse ne change plus (la tournée est
// fixée au départ du livreur).
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Dessin } from '../../composants/Dessin'
import { Ecran } from '../../composants/coque'
import { Feuille } from '../../composants/Feuille'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { source, type Adresse, type CommandeClient } from '../../donnees/source'
import { dateA } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { CommandeIntrouvable } from '../CL-08/Confirmee'
import { Boutique, DetailPaye, enTournee, LivraisonPrevue, Onglets, Retour } from './Commun'

const libelle = (a: Adresse) => `${a.nom} · ${a.quartier}`

export function ChangerAdresse() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const ref = params.get('ref')
  const [c, setC] = useState<CommandeClient | null | undefined>(undefined)
  const [adresses, setAdresses] = useState<Adresse[]>([])
  const [choix, setChoix] = useState<Adresse | null>(null)
  const [feuille, setFeuille] = useState(false)
  const [fait, setFait] = useState<Adresse | null>(null)
  const [envoi, setEnvoi] = useState(false)
  useEffect(() => {
    source.commandes().then((d) => setC(d.commandes.find((x) => (ref ? x.ref === ref : x.mode === 'domicile' && x.etat === 'preparation')) ?? null))
    source.adresses().then((d) => setAdresses(d.adresses))
  }, [ref])
  if (c === undefined) return null
  if (!c)
    return ref ? (
      <CommandeIntrouvable route="changer-adresse" />
    ) : (
      <Ecran route="changer-adresse">
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="house" taille={26} />
            </div>
            <h3>{t('Aucune livraison à domicile en cours')}</h3>
            <p>{t('L’adresse se change depuis une commande livrée à domicile, tant que le livreur ne l’a pas récupérée.')}</p>
            <div className="btns">
              <Link to={chemin('adresses')} className="btn primary">
                <span>{t('Mes adresses')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  const impossible = c.mode !== 'domicile' ? 'relais' : enTournee(c) ? 'tournee' : c.etat !== 'preparation' && c.etat !== 'paiement' ? 'fini' : null
  const actuelle = fait ?? adresses.find((a) => libelle(a) === c.lieu) ?? null
  const quand = c.arriveeLe ? tf('Vers le {d}', { d: dateA(c.arriveeLe, langue) }) : null
  const livrer = async () => {
    if (!choix || envoi) return
    setEnvoi(true)
    await source.changerLieu(c.ref, libelle(choix), 0)
    setEnvoi(false)
    setFeuille(false)
    setFait(choix)
    setChoix(null)
  }
  const entete = (
    <>
      <Onglets c={c} actif="lieu" />
      <div className="pg">
        <h1 className="pg-t">{t('Changer d’adresse')}</h1>
        <p className="pg-s">
          <span className="nw">{tf('{ref} · livraison à domicile.', { ref: c.ref })}</span>
          {t(' Gratuit tant que le livreur n’a pas récupéré ton colis.')}
        </p>
      </div>
    </>
  )

  if (impossible === 'relais' || impossible === 'fini')
    return (
      <Ecran route="changer-adresse" sousTitre={c.ref}>
        <Onglets c={c} actif="lieu" />
        <div className="card">
          <div className="empty">
            <div className="ei">
              <Icone nom="map-pin" taille={26} />
            </div>
            <h3>{t(impossible === 'relais' ? 'Cette commande va au relais' : 'L’adresse ne change plus')}</h3>
            <p>{t(impossible === 'relais' ? 'Tu peux changer de point relais tant que rien n’est collecté.' : 'La commande est livrée, annulée ou en litige.')}</p>
            <div className="btns">
              <Link to={chemin(impossible === 'relais' ? 'changer-relais' : 'suivi', { ref: c.ref })} className="btn primary">
                <span>{t(impossible === 'relais' ? 'Changer de relais' : 'Suivre la livraison')}</span>
              </Link>
            </div>
          </div>
        </div>
        <Retour c={c} />
      </Ecran>
    )

  const feuilles =
    impossible === 'tournee' ? (
      <Feuille ouverte={feuille} fermer={() => setFeuille(false)} titre={t('Ton colis est déjà en route')}>
        <div className="row">
          <span className="portrait" style={{ width: '52px', height: '52px' }}>
            <Dessin id="3b134582252a" />
          </span>
          <div className="grow">
            <div className="cl12-kick">{t('Changer d’adresse')}</div>
            <h2 className="cl12-st-t">{t('Ton colis est déjà en route')}</h2>
          </div>
        </div>
        <p className="t14 c2" style={{ lineHeight: '1.5', margin: '12px 0 0' }}>
          {t('Le livreur l’a récupéré : l’adresse ne peut plus changer pendant la livraison.')}
        </p>
        {actuelle && (
          <div className="card flat mt12" style={{ padding: '10px 14px' }}>
            <div className="b8 t14">{t(actuelle.nom)}</div>
            <div className="t13 c3">{tf('{q}, {r}', { q: t(actuelle.quartier), r: actuelle.reperes })}</div>
          </div>
        )}
        <div className="hint-l">
          <Icone nom="truck" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('La tournée est fixée au départ du livreur, comme pour un relais.')}</span>
        </div>
        <div className="btns mt16">
          <Link to={chemin('suivi', { ref: c.ref })} className="btn primary">
            <Icone nom="package" taille={18} />
            <span>{t('Suivre la livraison')}</span>
          </Link>
        </div>
        <div className="btns">
          <button type="button" className="btn ghost" onClick={() => setFeuille(false)}>
            <span>{t('Fermer')}</span>
          </button>
        </div>
      </Feuille>
    ) : (
      <Feuille ouverte={feuille} fermer={() => setFeuille(false)} titre={t('Où livrer ton colis ?')} forme="tiroir">
        <div className="cl12-kick">{t('Changer d’adresse')}</div>
        <h2 className="cl12-st-t">{t('Où livrer ton colis ?')}</h2>
        {adresses.map((a) => {
          const ici = actuelle?.id === a.id
          const on = choix?.id === a.id
          return (
            <a
              key={a.id}
              href="#"
              role="radio"
              aria-checked={on}
              aria-disabled={!a.zoneServie || ici}
              className={'radio' + (on ? ' on' : '')}
              onClick={(e) => (e.preventDefault(), a.zoneServie && !ici && setChoix(a))}
            >
              <span className="rd"></span>
              <span className="grow">
                <span className="rt" style={{ display: 'block' }}>
                  {t(a.nom)}
                  {ici && t(' · adresse actuelle')}
                </span>
                <span className="rs" style={{ display: 'block' }}>
                  {a.zoneServie ? tf('{q}, {r}', { q: t(a.quartier), r: a.reperes }) : tf('{q} : pas encore servi', { q: t(a.quartier) })}
                </span>
              </span>
            </a>
          )
        })}
        <Link to={chemin('adresses')} className="radio">
          <span className="ic-sq or" style={{ width: '28px', height: '28px', borderRadius: '9px' }}>
            <Icone nom="plus" taille={16} />
          </span>
          <span className="grow">
            <span className="rt" style={{ display: 'block' }}>
              {t('Ajouter une adresse par repères')}
            </span>
            <span className="rs" style={{ display: 'block' }}>
              {t('Quartier, carrefour, immeuble, étage.')}
            </span>
          </span>
        </Link>
        <div className="hint-l">
          <Icone nom="circle-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Gratuit : le livreur n’a pas encore récupéré ton colis. L’heure de livraison est recalculée.')}</span>
        </div>
        <div className="btns mt16">
          <button type="button" className={'btn primary' + (choix && !envoi ? '' : ' off')} onClick={livrer}>
            <Icone nom="check" taille={18} />
            <span>{choix ? tf('Livrer à « {a} »', { a: t(choix.nom) }) : t('Choisis une adresse')}</span>
          </button>
        </div>
        <div className="btns">
          <button type="button" className="btn ghost" onClick={() => (setFeuille(false), setChoix(null))}>
            <span>{t('Garder l’adresse actuelle')}</span>
          </button>
        </div>
      </Feuille>
    )

  return (
    <Ecran route="changer-adresse" sousTitre={c.ref} fixes={feuilles}>
      {entete}
      {fait && (
        <div className="note green">
          <Icone nom="circle-check" taille={18} />
          <div>
            <b>{t('Adresse changée, gratuitement.')}</b>
            {tf(' Le livreur livrera à « {a} » ; l’heure de livraison est recalculée.', { a: t(fait.nom) })}
          </div>
        </div>
      )}
      <LivraisonPrevue nom={actuelle ? actuelle.nom : c.lieu} detail={actuelle ? `${t(actuelle.quartier)}, ${actuelle.reperes}` : undefined} quand={fait ? null : quand}>
        {!fait && (
          <div className="btns">
            <button type="button" className="btn secondary" onClick={() => setFeuille(true)}>
              <Icone nom="map-pin" taille={18} />
              <span>{t('Livrer ailleurs')}</span>
            </button>
          </div>
        )}
      </LivraisonPrevue>
      {c.colis.map((x, i) => (
        <Boutique key={x.n} x={x} i={i}>
          {i === c.colis.length - 1 && <DetailPaye c={c} />}
        </Boutique>
      ))}
      <Retour c={c} />
    </Ecran>
  )
}
