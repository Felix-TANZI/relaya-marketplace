// Écran « Inspection » (CL-15 ; EX-04), forme d'origine du prototype rendue réelle (DP-54) : la reprise (?id=…).
// Confirmée : la valeur (dans l'estimation), l'effacement certifié des données, la chronologie, payer la
// différence. En cours : la date limite du résultat (48 h après réception), la chronologie, ce qui se passe à la
// fin (valeur dans l'estimation ou contre-offre). Contre-offre refusée : le téléphone rendu au relais, avec le
// motif. Reprise refusée par le reconditionneur (compte encore lié, IMEI signalé…) : le motif et les photos du
// constat, puis le choix : récupérer son téléphone, contester le refus, ou acheter le neuf sans reprise.
// Écran repris à la main : outils/ecran.mjs ne le réécrit plus.
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Aside, Colonne } from '../../composants/Gabarits'
import { useDes } from '../../composants/ecran'
import { Icone } from '../../composants/Icone'
import { Styles } from '../../composants/Styles'
import { source } from '../../donnees/source'
import { chemin } from '../../config/pages'
import { F } from '../../i18n/format'
import { dateA, quand } from '../../i18n/dates'
import { usePreferences } from '../../preferences'
import { pageTroc, useTrocs } from './Commun'
import { ContesterTroc, EtapesTroc, FfTroc, MotifTroc } from './Troc'

export function TrocInspection() {
  const { t, tf, langue } = usePreferences()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [d, recharger] = useTrocs()
  // Dès 1024 px : la chronologie et la suite à gauche ; l’état, la valeur et l’action à droite (§ 5.13).
  const grand = useDes('tab-l')
  if (!d) return null
  const tr = d.liste.find((x) => x.id === params.get('id')) ?? d.liste[0]
  if (!tr) return <Navigate to={chemin('troc')} replace />
  if (tr.etat === 'depot' || tr.etat === 'annule') return <Navigate to={chemin('troc-depot', { id: tr.id })} replace />
  const confirme = tr.valeur !== null && (tr.etat === 'confirme' || tr.etat === 'paye')
  const limite = tr.dates.recu ? tr.dates.recu + 48 * 3600e3 : null
  const q = (ms: number) => quand(ms, d.maintenant, langue)
  const etapes: [string, number | null, string][] = [
    [tf('Déposé au {r}', { r: t(tr.relais) }), tr.dates.depose, 'IMEI vérifié'],
    [t('Collecté par le livreur'), tr.dates.collecte, 'scellé et photo'],
    [t('Reçu par le reconditionneur'), tr.dates.recu, ''],
    [t(tr.dates.inspecte ? 'Inspecté' : 'Inspection en cours'), tr.dates.inspecte, tr.motif?.type === 'compte' || tr.motif?.type === 'imei' ? 'rien n’a été effacé' : 'données effacées'],
  ]
  const premiereAVenir = etapes.findIndex(([, le]) => !le)
  const chronologie = (
    <>
      <div className="sec">
        <h2>{t('Chronologie')}</h2>
      </div>
      <div className="card ">
        <div className="tl">
          {etapes.map(([titre, le, sous], i) => (
            <div key={i} className={'ti ' + (le ? 'done' : i === premiereAVenir ? 'cur' : '')}>
              <div className="tt">{titre}</div>
              <div className="td">{le ? q(le) + (sous ? ' · ' + t(sous) : '') : i === 3 && limite ? tf('Résultat au plus tard le {d}', { d: dateA(limite, langue) }) : t('à venir')}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
  const entete = (ic: string, couleur: string, titre: string, s: string, p: string) => (
    <div className="cl15-dh">
      <span className={'cl15-di ' + couleur}>
        <Icone nom={ic} taille={30} trait={2.2} />
      </span>
      <h2>{titre}</h2>
      <div className="s">{s}</div>
      <p className="cl15-p">{p}</p>
    </div>
  )
  const valeur1 = confirme && (
    <>
      <div className="card cl15-dn">
        {entete('check', 'green', t('Valeur confirmée'), t(tr.modeleNom), tf('Dans l’estimation ({a} à {b} F). Payés par le reconditionneur partenaire.', { a: F(tr.estimation.min), b: F(tr.estimation.max) }))}
        <div className="cl15-db">
          <div className="cl15-kv">
            <span className="k">{t('Reprise confirmée')}</span>
            <span className="v g">
              <span className="price">
                {F(tr.valeur!)}
                <small>{t(' F')}</small>
              </span>
            </span>
          </div>
        </div>
      </div>
    </>
  )
  const valeur2 = confirme && (
    <>
      {tr.etat === 'confirme' ? (
        <div className="btns">
          <Link to={chemin('troc-payer', { id: tr.id })} className="btn primary">
            <span>{tf('Payer {m} F et commander', { m: F(tr.prixLivre - tr.valeur!) })}</span>
          </Link>
        </div>
      ) : (
        tr.ref && (
          <div className="btns">
            <Link to={chemin('commande', { ref: tr.ref })} className="btn secondary">
              <span>{tf('Voir la commande {ref}', { ref: tr.ref })}</span>
            </Link>
          </div>
        )
      )}
    </>
  )
  if (confirme)
    return (
      <Ecran gabarit="colonnes" route="troc-inspection" sousTitre={tr.id}>
      <Colonne>
        <Styles id="ddcb0e469a" />
        <EtapesTroc n={3} />
        <FfTroc />
      {!grand && valeur1}
        <div className="card tight">
          <div className="li">
            <span className="ic green">
              <Icone nom="shield-check" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Données effacées')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Effacement certifié · certificat disponible')}
              </span>
            </span>
            <span className="t13 b7 cor">{t('Disponible')}</span>
          </div>
        </div>
        {chronologie}
      {!grand && valeur2}
      </Colonne>
      {grand && (
        <Aside titre="Valeur confirmée">
          {valeur1}
          {valeur2}
        </Aside>
      )}
    </Ecran>
    )
  if (tr.etat === 'refuse')
    return (
      <Ecran route="troc-inspection" sousTitre={tr.id}>
        <Styles id="ddcb0e469a" />
        <EtapesTroc n={3} />
        <FfTroc />
        <div className="card cl15-dn">{entete('circle-alert', 'red', t('Reprise refusée'), t(tr.modeleNom), t('Le reconditionneur ne peut pas reprendre ce téléphone. Tu n’as rien payé ; à toi de choisir la suite.'))}</div>
        <MotifTroc tr={tr} />
        <div className="sec">
          <h2>{t('Ton choix')}</h2>
        </div>
        <div className="btns">
          <button type="button" className="btn primary" onClick={async () => (await source.repondreTroc(tr.id, false), recharger())}>
            <span>{t('Récupérer mon téléphone')}</span>
          </button>
        </div>
        <div className="hint-l">
          <Icone nom="undo-2" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{tf('Rendu gratuitement au {r}, avec un code pour le retirer.', { r: t(tr.relais) })}</span>
        </div>
        <ContesterTroc tr={tr} fait={recharger} />
        <div className="btns">
          <button type="button" className="btn secondary" onClick={() => naviguer(chemin('fiche', { p: tr.p }))}>
            <span>{tf('Acheter le {p} sans reprise', { p: t(tr.titre) })}</span>
          </button>
        </div>
        {chronologie}
      </Ecran>
    )
  if (tr.etat === 'rendu')
    return (
      <Ecran route="troc-inspection" sousTitre={tr.id}>
        <Styles id="ddcb0e469a" />
        <EtapesTroc n={3} />
        <FfTroc />
        <div className="card cl15-dn">{entete('undo-2', 'amber', t(tr.contreOffre ? 'Contre-offre refusée' : 'Reprise refusée'), tf('Ton téléphone t’est rendu au {r}', { r: t(tr.relais) }), t('Gratuitement, avec un code pour le retirer. Tu n’as rien payé.'))}</div>
        <MotifTroc tr={tr} />
        {chronologie}
        <div className="btns">
          <Link to={chemin('troc')} className="btn secondary">
            <span>{t('Estimer une autre reprise')}</span>
          </Link>
        </div>
      </Ecran>
    )
  const etat1 = (
    <>
    <div className="card cl15-dn">
      {entete(
        'scan-line',
        'amber',
        t(tr.etat === 'contre' ? 'Inspection terminée' : 'Inspection en cours'),
        tr.etat === 'contre' ? t('Contre-offre : à toi de répondre') : limite ? tf('Résultat au plus tard le {d}', { d: dateA(limite, langue) }) : t('En route vers le reconditionneur'),
        tf('Estimation : {a} à {b} F. Tu ne paies rien avant la valeur confirmée.', { a: F(tr.estimation.min), b: F(tr.estimation.max) }),
      )}
    </div>
    </>
  )
  const etat2 = (
    <>
    {tr.etat === 'contre' && (
      <div className="btns">
        <Link to={chemin(pageTroc(tr), { id: tr.id })} className="btn primary">
          <span>{t('Voir la contre-offre')}</span>
        </Link>
      </div>
    )}
    </>
  )
  return (
    <Ecran gabarit="colonnes" route="troc-inspection" sousTitre={tr.id}>
      <Colonne>
      <Styles id="ddcb0e469a" />
      <EtapesTroc n={3} />
      <FfTroc />
      {!grand && etat1}
      {chronologie}
      {!grand && etat2}
      <div className="sec">
        <h2>{t('Quand l’inspection est finie')}</h2>
      </div>
      <div className="card tight">
        <div className="li">
          <span className="ic green">
            <Icone nom="check" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Valeur dans l’estimation')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Tu paies la différence, puis tu retires ton neuf')}
            </span>
          </span>
        </div>
        <div className="li">
          <span className="ic amber">
            <Icone nom="scan-line" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Écart avec l’état déclaré')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Contre-offre : tu acceptes, ou tu récupères ton téléphone')}
            </span>
          </span>
        </div>
      </div>
      </Colonne>
      {grand && (
        <Aside titre="Inspection">
          {etat1}
          {etat2}
        </Aside>
      )}
    </Ecran>
  )
}
