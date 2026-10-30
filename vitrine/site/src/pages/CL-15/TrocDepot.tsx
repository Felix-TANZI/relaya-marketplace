// Écran « Dépôt au relais » (CL-15 ; EX-04), forme d'origine du prototype rendue réelle (DP-54) : la reprise (?id=…)
// à déposer : le code de dépôt, le gérant et l'heure de fermeture du relais, ce qu'il faut au comptoir (pièce
// d'identité, IMEI lu par le gérant, téléphone chargé, compte et code retirés ; un téléphone signalé volé est
// refusé), la suite (collecte scellée) ; annuler avant le dépôt. Déposé : ce qui a été vérifié et la suite.
// Annulée : le téléphone reste avec toi, rien n'est payé.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { dateA } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { useTrocs } from './Commun'
import { EtapesTroc, FfTroc } from './Troc'

export function TrocDepot() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const session = useSession()
  const [d, recharger] = useTrocs()
  // Dès 1024 px : ce qu’il faut au comptoir à gauche ; le code de dépôt en grand et les actions à droite (§ 5.13).
  const grand = useDes('tab-l')
  if (!d) return null
  const tr = d.liste.find((x) => x.id === params.get('id')) ?? d.liste[0]
  if (!tr)
    return (
      <Ecran route="troc-depot">
        <Styles id="ddcb0e469a" />
        <div className="card mt12">
          <div className="empty">
            <h3>{t('Aucune reprise en cours')}</h3>
            <div className="btns">
              <Link to={chemin('troc')} className="btn primary">
                <span>{t('Estimer une reprise')}</span>
              </Link>
            </div>
          </div>
        </div>
      </Ecran>
    )
  // Le gérant et l'heure de fermeture : ceux du relais habituel quand la reprise y est déposée.
  const habituel = session.relais && session.relais.nom === tr.relais ? session.relais : null
  const ligne = (ic: string, couleur: string, a: string, b: string) => (
    <div className="li" key={a}>
      <span className={'ic ' + couleur}>
        <Icone nom={ic} taille={20} />
      </span>
      <span className="grow">
        <span className="lt" style={{ display: 'block' }}>
          {t(a)}
        </span>
        <span className="ls" style={{ display: 'block' }}>
          {t(b)}
        </span>
      </span>
    </div>
  )
  if (tr.etat === 'annule')
    return (
      <Ecran route="troc-depot" sousTitre={tr.id}>
        <Styles id="ddcb0e469a" />
        <EtapesTroc n={2} />
        <FfTroc />
        <div className="card cl15-dn">
          <div className="cl15-dh">
            <span className="cl15-di red">
              <Icone nom="shield-x" taille={30} trait={2.2} />
            </span>
            <h2>{t('Reprise annulée')}</h2>
            <div className="s">{tf('{m} → {p}', { m: t(tr.modeleNom), p: t(tr.titre) })}</div>
            <p className="cl15-p">{t('Rien n’a été collecté, tu n’as rien payé.')}</p>
          </div>
        </div>
        <div className="card tight">
          {ligne('smartphone', '', 'Le téléphone reste avec toi', 'Rien n’a été collecté')}
          {ligne('wallet', '', 'Tu n’as rien payé', 'Le troc est annulé')}
        </div>
        <div className="cl15-inf">
          <Icone nom="message-square-text" taille={17} />
          <span>{t('Une erreur ? Écris au support avec ta facture d’achat : il vérifie avec la source de la liste.')}</span>
        </div>
        <div className="btns">
          <Link to={chemin('troc')} className="btn primary">
            <span>{t('Estimer une autre reprise')}</span>
          </Link>
        </div>
        <div className="btns">
          <Link to={chemin('messagerie')} className="btn secondary">
            <Icone nom="message-square-text" taille={18} />
            <span>{t('Écrire au support')}</span>
          </Link>
        </div>
      </Ecran>
    )
  const depose1 = (tr.dates.depose) && (
    <>
      <div className="card cl15-dn">
        <div className="cl15-dh">
          <span className="cl15-di green">
            <Icone nom="check" taille={30} trait={2.2} />
          </span>
          <h2>{t('Téléphone déposé')}</h2>
          <div className="s">{dateA(tr.dates.depose, langue)}</div>
          <p className="cl15-p">{habituel ? tf('Au {r}, remis à {g}.', { r: t(tr.relais), g: habituel.gerant }) : tf('Au {r}, remis au gérant.', { r: t(tr.relais) })}</p>
        </div>
      </div>
      <div className="card tight">
        {ligne('hash', 'green', 'IMEI vérifié', 'Non signalé volé')}
        {ligne('id-card', 'green', 'Pièce d’identité vérifiée', 'Carte nationale d’identité')}
      </div>
    </>
  )
  const depose2 = (tr.dates.depose) && (
    <>
      <div className="btns">
        <Link to={chemin('troc-inspection', { id: tr.id })} className="btn primary">
          <span>{t('Suivre l’inspection')}</span>
        </Link>
      </div>
    </>
  )
  if (tr.dates.depose)
    return (
      <Ecran gabarit="colonnes" route="troc-depot" sousTitre={tr.id}>
      <Colonne>
        <Styles id="ddcb0e469a" />
        <EtapesTroc n={2} />
        <FfTroc />
      {!grand && depose1}
        <div className="sec">
          <h2>{t('Ensuite')}</h2>
        </div>
        <div className="card ">
          <div className="tl">
            <div className="ti done">
              <div className="tt">{t('Déposé au relais')}</div>
              <div className="td">{dateA(tr.dates.depose, langue)}</div>
            </div>
            <div className={'ti ' + (tr.dates.collecte ? 'done' : 'cur')}>
              <div className="tt">{t('Collecte par un livreur')}</div>
              <div className="td">{tr.dates.collecte ? dateA(tr.dates.collecte, langue) : t('Scellé et photographié, vers le reconditionneur')}</div>
            </div>
            <div className={'ti ' + (tr.dates.collecte ? 'cur' : '')}>
              <div className="tt">{t('Inspection en 48 h au plus')}</div>
              <div className="td">{t('Tu reçois la valeur confirmée')}</div>
            </div>
          </div>
        </div>
      {!grand && depose2}
      </Colonne>
      {grand && (
        <Aside titre="Téléphone déposé">
          {depose1}
          {depose2}
        </Aside>
      )}
    </Ecran>
    )
  const depot1 = (
    <>
    <div className="hero night">
      <div className="hk">{t('Code de dépôt')}</div>
      <div className="code6" aria-label={tr.codeDepot}>
        {tr.codeDepot.split('').map((c, i) => (
          <span key={i}>{c}</span>
        ))}
      </div>
      <div className="hs center mt8">
        {habituel
          ? tf('À donner à {g} au {r} · {h}', { g: habituel.gerant, r: t(tr.relais), h: t(habituel.horaireDuJour).replace(/^./, (c) => c.toLowerCase()) })
          : tf('À donner au gérant du {r}, aux heures d’ouverture.', { r: t(tr.relais) })}
      </div>
    </div>
    </>
  )
  const depot2 = (
    <>
    <div className="btns">
      <Link to={chemin('relais-choix')} className="btn secondary">
        <Icone nom="map-pin" taille={18} />
        <span>{t('Voir le relais')}</span>
      </Link>
    </div>
    <div className="btns">
      <button type="button" className="btn ghost" onClick={async () => (await source.annulerTroc(tr.id), recharger())}>
        <span>{t('Annuler la reprise')}</span>
      </button>
    </div>
    </>
  )
  return (
    <Ecran gabarit="colonnes" route="troc-depot" sousTitre={tr.id}>
      <Colonne>
      <Styles id="ddcb0e469a" />
      <EtapesTroc n={2} />
      <FfTroc />
      {!grand && depot1}
      <div className="sec">
        <h2>{t('Au comptoir')}</h2>
      </div>
      <div className="card tight">
        {ligne('id-card', 'or', 'Ta pièce d’identité', 'Carte nationale d’identité ou passeport')}
        {ligne('hash', 'or', 'Le gérant lit l’IMEI', 'Il compose *#06# et vérifie que le téléphone n’est pas déclaré volé')}
        {ligne('smartphone', 'or', 'Ton téléphone chargé', 'Compte Google et code retirés')}
      </div>
      <div className="card red cl15-box">
        <span className="bi">
          <Icone nom="shield-x" taille={20} />
        </span>
        <div className="grow">
          <p>
            {t('Un téléphone signalé volé est ')}
            <b>{t('refusé au dépôt')}</b>
            {t('.')}
          </p>
        </div>
      </div>
      <div className="hint-l">
        <Icone nom="truck" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
        <span>{t('Ensuite, un livreur le collecte, scellé et photographié, vers le reconditionneur partenaire.')}</span>
      </div>
      {!grand && depot2}
      </Colonne>
      {grand && (
        <Aside titre="Code de dépôt">
          {depot1}
          {depot2}
        </Aside>
      )}
    </Ecran>
  )
}
