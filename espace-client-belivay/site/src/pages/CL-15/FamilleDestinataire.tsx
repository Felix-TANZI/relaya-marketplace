// Écran « Qui retire le panier ? » (CL-15 ; EX-05), forme d'origine du prototype rendue réelle (DP-54) : la personne
// de la famille liée (ou en lier une : prénom, numéro, son relais ; elle reçoit un SMS), le nom du panier (pour soi),
// son relais (le sien en tête, avec son gérant ; les autres à leur distance) ; elle reçoit le code de retrait, le
// payeur la preuve ; ni son adresse ni ses commandes ne sont montrées.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { erreurNumero, espacer } from '../../donnees/numeros'
import { source, type Relais } from '../../donnees/source'
import { jourSeul } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { VideFamille, useFamille } from './Commun'
import { EtapesFamille, FfFamille, kg } from './Famille'

export function FamilleDestinataire() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [d, recharger] = useFamille()
  const [relais, setRelais] = useState<Relais[]>([])
  const [choix, setChoix] = useState<string | null>(null)
  const [rel, setRel] = useState<string | null>(null)
  const [nom, setNom] = useState<string | null>(null)
  const [nouveau, setNouveau] = useState(false)
  const [prenom, setPrenom] = useState('')
  const [numero, setNumero] = useState('')
  const [vu, setVu] = useState(false)
  useEffect(() => {
    source.relaisListe().then((r) => setRelais(r.relais))
  }, [])
  const p = d?.paniers.find((x) => x.id === params.get('panier'))
  useEffect(() => {
    if (!d || !p || choix !== null) return
    const x = p.destinataire ?? (d.destinataires[0] ? { prenom: d.destinataires[0].prenom, relais: d.destinataires[0].relais } : null)
    setChoix(x?.prenom ?? '')
    setRel(x?.relais ?? null)
    setNom(p.nom)
  }, [d, p, choix])
  if (!d) return null
  if (!p)
    return (
      <Ecran route="famille-destinataire">
        <Styles id="ddcb0e469a" />
        <VideFamille panier={null} icone="users" titre="Compose d’abord le panier" />
      </Ecran>
    )
  const erreurNouveau = prenom.trim().length < 2 ? 'Indique son prénom.' : (erreurNumero(numero) ?? (!rel ? 'Choisis son relais.' : null))
  const lier = async () => {
    setVu(true)
    if (erreurNouveau) return
    await source.lierDestinataire({ prenom: prenom.trim(), numero, relais: rel! })
    setChoix(prenom.trim())
    setNouveau(false)
    recharger()
  }
  const pret = !!choix && !!rel && (nom ?? '').trim().length >= 2
  const continuer = async () => {
    if (!pret) return
    await source.enregistrerPanierFamille({ id: p.id, nom: nom!.trim(), destinataire: { prenom: choix!, relais: rel! } })
    naviguer(chemin('famille-payer', { panier: p.id }))
  }
  // Le relais habituel de la personne choisie, en tête.
  const sonRelais = d.destinataires.find((x) => x.prenom === choix)?.relais ?? null
  const ordonnes = [...relais].sort((a, b) => (a.nom === sonRelais ? -1 : b.nom === sonRelais ? 1 : a.km - b.km))
  const prenomCourt = (choix ?? '').split(' ')[0]
  return (
    <Ecran gabarit="colonnes" route="famille-destinataire">
      <Colonne>
      <Styles id="ddcb0e469a" />
      <EtapesFamille n={1} />
      <FfFamille />
      <div className="pg">
        <h1 className="pg-t">{t('Qui retire le panier ?')}</h1>
        <p className="pg-s">{t('Tu n’as besoin ni de son adresse ni de son numéro : elle retire au relais avec son code.')}</p>
      </div>
      {d.destinataires.map((x) => (
        <a key={x.prenom} href={chemin('famille-destinataire', { panier: p.id })} role="radio" aria-checked={choix === x.prenom} className={'card' + (choix === x.prenom ? ' or' : '')} style={{ display: 'block', color: 'inherit' }} onClick={(e) => (e.preventDefault(), setChoix(x.prenom), setRel(x.relais), setNouveau(false))}>
          <div className="row">
            <span className={'ic-sq' + (choix === x.prenom ? ' or' : '')}>
              <Icone nom="user-round" taille={22} />
            </span>
            <div className="grow">
              <div className="t15 b8">{tf('{p} · famille liée', { p: x.prenom })}</div>
              <div className="t13 c3 mt4">{tf('Lien famille reçu le {d}', { d: jourSeul(x.lieLe, langue) })}</div>
            </div>
            <span className="pill green sm">
              <Icone nom="check" taille={13} />
              {t('Liée')}
            </span>
          </div>
        </a>
      ))}
      <div className="links cl15-lk">
        <a href={chemin('famille-destinataire', { panier: p.id })} role="button" aria-expanded={nouveau} onClick={(e) => (e.preventDefault(), setNouveau(!nouveau), setChoix(nouveau ? (d.destinataires[0]?.prenom ?? '') : ''))}>
          {t(nouveau ? 'Annuler' : '+ Lier une autre personne')}
        </a>
      </div>
      {nouveau && (
        <div className="card">
          <div className="fld">
            <label htmlFor="fd-prenom">{t('Son prénom')}</label>
            <div className="inp">
              <input id="fd-prenom" value={prenom} maxLength={30} onChange={(e) => setPrenom(e.target.value)} />
            </div>
          </div>
          <div className="fld">
            <label htmlFor="fd-num">{t('Son numéro')}</label>
            <div className="inp">
              <b className="t15">+237</b>
              <input id="fd-num" type="tel" inputMode="tel" placeholder="6XX XX XX XX" value={numero} onChange={(e) => setNumero(espacer(e.target.value))} />
            </div>
            <div className="hint">{t('Elle reçoit un SMS pour accepter le lien famille.')}</div>
          </div>
          {vu && erreurNouveau && (
            <div className="hint" role="alert" style={{ color: 'var(--red)' }}>
              {t(erreurNouveau)}
            </div>
          )}
        </div>
      )}
      <div className="fld">
        <label htmlFor="fd-nom">{t('Nom du panier (pour toi)')}</label>
        <div className="inp">
          <input id="fd-nom" className="grow" value={nom ?? ''} maxLength={30} onChange={(e) => setNom(e.target.value)} />
        </div>
      </div>
      <div className="sec">
        <h2>{t('Son relais')}</h2>
      </div>
      {ordonnes.map((r) => (
        <a key={r.nom} href={chemin('famille-destinataire', { panier: p.id })} role="radio" aria-checked={rel === r.nom} aria-disabled={r.plein} className={'radio' + (rel === r.nom ? ' on' : '')} style={r.plein ? { opacity: 0.55 } : undefined} onClick={(e) => (e.preventDefault(), !r.plein && setRel(r.nom))}>
          <span className="rd"></span>
          <span className="grow">
            <span className="rt" style={{ display: 'block' }}>
              {t(r.nom)}
            </span>
            <span className="rs" style={{ display: 'block' }}>
              {r.plein
                ? t('Plein aujourd’hui')
                : r.nom === sonRelais
                  ? tf('Son relais habituel · {g} · {h}', { g: r.gerant, h: t(r.horaires) })
                  : tf('{k} km · {h}', { k: kg(r.km), h: t(r.horaires) })}
            </span>
          </span>
        </a>
      ))}
      </Colonne>
      <Aside titre="Qui retire">
      <div className="card info cl15-box">
        <span className="bi">
          <Icone nom="key-round" taille={20} />
        </span>
        <div className="grow">
          <b className="bt">{prenomCourt ? tf('{p} reçoit le code de retrait, pas toi.', { p: prenomCourt }) : t('La personne choisie reçoit le code de retrait, pas toi.')}</b>
          <p>{t('Toi, tu reçois la preuve de retrait.')}</p>
        </div>
      </div>
      {/* DP-54 : ce que voit chacun, et ce qui se passe si le panier n'est pas retiré. */}
      <div className="hint-l">
        <Icone nom="shield-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Elle voit ton prénom et le contenu du panier. Toi, tu ne vois ni son numéro ni ses autres commandes.')}</span>
      </div>
      <div className="hint-l">
        <Icone nom="clock" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>
          {t('Le premier jour au relais est gratuit, puis la garde court. Pas retiré après 7 jours : le panier repart et tu es remboursé sur ta carte, moins la garde et le renvoi.')}{' '}
          <Link to={chemin('legal-doc', { d: 'garde' })}>{t('La politique de garde')}</Link>
        </span>
      </div>
      {nouveau ? (
        <div className="btns">
          <button type="button" className="btn primary" onClick={lier}>
            <span>{t('Lier cette personne')}</span>
          </button>
        </div>
      ) : (
        <div className="btns">
          <button type="button" className={'btn primary' + (pret ? '' : ' off')} onClick={continuer}>
            <span>{t('Continuer vers le paiement')}</span>
          </button>
        </div>
      )}
      </Aside>
    </Ecran>
  )
}
