// Accueil « Rien à faire » (VD-04, route « accueil_calme ») — balisage du prototype, branché sur la source (domaine
// accueil, GET /seller/today vide, /money/earnings, /payouts/next, /demand) :
// - les chiffres n'apparaissent que quand il n'y a rien à faire (ACC-10, REFVD-R122) : l'accueil montre ce corps dès
//   que sa file est vide ; l'adresse « accueil_calme » le montre aussi (état du prototype) ;
// - « Gagné avec BelivaY » = gardé des ventes libérées depuis l'inscription ; la libération du jour ; le prochain
//   versement (date à gauche, montant à droite) et ce qui le compose (VD04-R10) ; « Une idée pour vendre plus » avec
//   le seul bouton plein, juste sous la carte clé (ACC-20, VD04-R11) ; le mois (gardé sur ventes libérées, tuiles
//   Commandes · Impayés · Transport : ACC-12) ; le produit qui rapporte le plus (nombre de ventes, sans répéter un
//   montant) ; le progrès en francs gardés au palier suivant (ACC-13) ;
// - un bloc qui n'a rien à dire n'est pas montré (ACC-11) ; accès Préparation : aucun montant ;
// - ajouts : liens vers les gains, les versements, Mes produits ; pied réel (connexion, actions en attente).
import { Link } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { nomPalier } from '../../composants/coque'
import { chemin } from '../../config/pages'
import type { Calme } from '../../donnees/domaines/accueil'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge, useMontantsVisibles, useSession } from '../../session'
import { Bouton, EtatBoutique, PiedConnexion, useFermer } from './boutique'
import { ErreurLecture, Squelette, useReseau } from './commun'

const MOIS = { fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] }
const JOURS_COURTS = { fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] }
const MOIS_COURTS = { fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'] }
/** « Vendredi 25 sept. » · « Friday 25 Sept ». */
const vendredi = (j: string, l: 'fr' | 'en') => {
  const d = new Date(j + 'T12:00:00Z')
  return `${JOURS_COURTS[l][d.getUTCDay()]} ${d.getUTCDate()} ${MOIS_COURTS[l][d.getUTCMonth()]}`
}
const montant = (n: number) => `${F(n)} F`

/** Le corps « Rien à faire », sous l'état de la boutique (montré aussi par l'accueil quand sa file est vide). */
export function CorpsCalme({ c }: { c: Calme }) {
  const { t, tf, langue } = usePreferences()
  const a = c.argent
  const mois = a?.mois
  const nomMois = mois ? MOIS[langue][Number(mois.debut.slice(5, 7)) - 1] : ''
  return (
    <>
      <div className="pg" style={{ paddingTop: '18px' }}>
        <h1 className="pg-t">{t('Rien à faire pour l’instant')}</h1>
        <p className="pg-s">{t('Toutes vos commandes sont prêtes. On vous prévient dès qu’une nouvelle arrive.')}</p>
      </div>
      {a && (a.gagne > 0 || a.prochainVersement) && (
        <div className="hero night">
          <div className="otop">
            <span className="hk">{t('Gagné avec BelivaY')}</span>
            <Icone nom="sparkles" taille={18} style={{ color: 'var(--gold-l)' }} />
          </div>
          <div className="big">
            {t(F(a.gagne))}
            <small>{t('FCFA')}</small>
          </div>
          <div className="hs">{t('Depuis votre inscription')}</div>
          {a.liberationDuJour && (
            <div className="hs" style={{ marginTop: '2px' }}>
              <b>{tf('{m} ce soir', { m: t(montant(a.gagne + a.liberationDuJour.garde)) })}</b>
              {tf(' à {h}, quand {ref} se libère', { h: heure(a.liberationDuJour.a, langue), ref: a.liberationDuJour.ref })}
            </div>
          )}
          {a.prochainVersement && (
            <>
              <div className="hline"></div>
              <div className="row" style={{ alignItems: 'flex-end' }}>
                <div className="grow">
                  <div className="t12" style={{ color: 'rgba(255,255,255,.75)', fontWeight: '800', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    {t('Prochain versement')}
                  </div>
                  <div className="b8 t15 mt4">{vendredi(a.prochainVersement.vendredi, langue)}</div>
                </div>
                <div className="b8" style={{ fontSize: '24px', letterSpacing: '-.02em', whiteSpace: 'nowrap' }}>
                  {t(montant(a.prochainVersement.montant))}
                </div>
              </div>
              <div className="t13 mt6" style={{ color: 'rgba(255,255,255,.78)' }}>
                {a.prochainVersement.ceSoir > 0
                  ? tf('{deja} déjà prêts, plus {soir} libérés d’ici là · vers {numero}', { deja: t(montant(a.prochainVersement.deja)), soir: t(montant(a.prochainVersement.ceSoir)), numero: a.prochainVersement.numero })
                  : tf('{deja} déjà prêts · vers {numero}', { deja: t(montant(a.prochainVersement.deja)), numero: a.prochainVersement.numero })}
              </div>
            </>
          )}
        </div>
      )}
      {c.idee && (
        <div className="card" style={{ border: '1.5px dashed var(--or-line)', boxShadow: 'none', background: 'var(--or-soft)' }}>
          <div className="kick" style={{ color: 'var(--or-txt)', fontSize: '12px' }}>
            {t('Une idée pour vendre plus')}
          </div>
          <div className="b8 t15 mt6" style={{ lineHeight: '1.35' }}>
            {tf('« {q} » : cherché {n} fois près de chez vous, sans résultat', { q: c.idee.recherche, n: c.idee.fois })}
          </div>
          <div className="mt12">
            <Bouton classe="primary" icone="plus" vers={chemin('offre1', { q: c.idee.recherche })}>
              {t('Ajouter ce produit')}
            </Bouton>
          </div>
          <div className="links" style={{ margin: '4px 0 -10px' }}>
            <Link to={chemin('demande')} style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
              {tf('Toutes les recherches des {n} derniers jours', { n: c.idee.jours })}
            </Link>
          </div>
        </div>
      )}
      {mois && (
        <div className="card">
          <h3>{tf('Votre mois de {mois}', { mois: nomMois })}</h3>
          <p className="t14 c2" style={{ margin: '8px 0 0', lineHeight: '1.5' }}>
            {t('Vous avez gardé ')}
            <b>{t(montant(mois.garde))}</b>
            {t(' sur ')}
            <b>{t(montant(mois.ventes))}</b>
            {t(' de ventes libérées.')}
          </p>
          <div className="split3 mt12">
            {(
              [
                ['Commandes', String(c.commandesDuMois), ''],
                ['Impayés', montant(mois.impayes), 'cg'],
                ['Transport', montant(mois.transport), 'cg'],
              ] as const
            ).map(([k, v, classe]) => (
              <div key={k} className="mini">
                <div className="mk" style={{ fontSize: '12px', letterSpacing: '.04em' }}>
                  {t(k)}
                </div>
                <div className={'mv ' + classe}>{t(v)}</div>
              </div>
            ))}
          </div>
          <div className="hint-l">
            <Icone nom="circle-check" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Un refus ne vous coûte rien, et le livreur vient chez vous.')}</span>
          </div>
          <div className="links" style={{ margin: '4px 0 -10px', flexWrap: 'wrap' }}>
            <Link to={chemin('gains')} style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
              {t('Voir mes gains')}
            </Link>
            <Link to={chemin('versements')} style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
              {t('Voir mes versements')}
            </Link>
          </div>
        </div>
      )}
      {(c.meilleurProduit || a?.progres) && (
        <div className="card">
          {c.meilleurProduit && (
            <Link to={chemin('gains')} className="li">
              <span className="ic or">
                <Icone nom="trophy" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {t('Votre produit qui rapporte le plus')}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {tf(c.meilleurProduit.ventes > 1 ? '{titre} · {n} ventes' : '{titre} · {n} vente', { titre: c.meilleurProduit.titre, n: c.meilleurProduit.ventes })}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          )}
          {a?.progres && (
            <Link to={chemin('palier')} className="li">
              <span className="ic or">
                <Icone nom="award" taille={20} />
              </span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>
                  {tf('Au palier {palier}, vous garderez {gain} de plus par {titre}', { palier: nomPalier(a.progres.palier, langue), gain: t(montant(a.progres.gainParVente)), titre: a.progres.titre.split(' ')[0] })}
                </span>
                <span className="ls" style={{ display: 'block' }}>
                  {tf('Il vous manque {p} points de Trust Score et {c} commandes livrées', { p: a.progres.points, c: a.progres.commandes })}
                </span>
              </span>
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          )}
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Palier : votre niveau de vendeur, qui suit votre Trust Score (note de confiance sur 100).')}</span>
          </div>
        </div>
      )}
    </>
  )
}

export default function AccueilCalme() {
  const { tf, langue } = usePreferences()
  const s = useSession()
  const montants = useMontantsVisibles()
  const maintenant = useHorloge()
  const enLigne = useReseau()
  const lecture = useLecture(() => Promise.all([source.accueil.calme(), source.accueil.aujourdhui(), source.accueil.file()]), [s.membre?.role])
  const fermer = useFermer(enLigne)
  const d = lecture.donnees
  const prenom = s.membre?.prenom ?? ''
  return (
    <Ecran route="accueil_calme" calme>
      <div className="pg-k" style={{ marginTop: '14px' }}>
        {montants ? tf('Bonjour {prenom} · {jour}', { prenom, jour: jourLong(maintenant, langue) }) : tf('Bonjour {prenom} · accès Préparation', { prenom })}
      </div>
      {lecture.erreur ? (
        <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />
      ) : !d ? (
        <Squelette cartes={3} />
      ) : (
        <>
          <EtatBoutique fermee={s.boutique?.etat === 'fermee_aujourdhui'} aPreparer={d[1].compteurs.preparer} rouvrir={() => void fermer(false)} fermer={() => void fermer(true)} enFile={d[2].actions.some((x) => x.type === 'fermer' && x.etat === 'en_attente')} />
          <CorpsCalme c={d[0]} />
          <PiedConnexion enLigne={enLigne} enAttente={d[1].enAttenteEnvoi} />
        </>
      )}
    </Ecran>
  )
}
