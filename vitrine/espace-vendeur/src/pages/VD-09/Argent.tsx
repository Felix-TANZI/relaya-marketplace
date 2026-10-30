// Mon argent (VD-09, onglet 4) : repris du prototype (route('argent'), carte nuit, « Où est votre argent », « Ce que
// vous gardez »), branché sur la source (une seule lecture, GET /money/summary, ARG-01).
// - Carte nuit (ARG-06) : combien, quel jour, sur quel numéro ; « Passe à … » quand une somme se libère avant l'arrêté
//   du jeudi ; aucun bouton plein (rien à demander, ARG-02) ; l'œil masque les montants sur place (DP-52, comme le
//   portefeuille du client) ;
// - Quatre lignes (ARG-05, VD09-R04) dans leurs couleurs (jetons du thème), chacune avec sa phrase et son détail ; barre
//   proportionnelle ; « En circulation » sous un trait plus fort ; CONTRÔLE (VD09-R03, REFVD-R79) : l'écran refait la
//   somme et n'affiche aucun chiffre si elle diffère (alerte au suivi, relecture) ;
// - Ce que vous gardez (VD09-R08) : le mois, l'exemple d'une vente (calculé, src/calculs), gagné depuis l'inscription,
//   Documents ; rappel anti-fraude (NUM-02) ;
// - Hors connexion : montants du dernier calcul avec leur heure (VD09-R06) ; tirer pour actualiser ;
// - Accès Préparation : écran verrouillé (ARG-07), dock à quatre onglets sans point rouge (coque).
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTirerPourActualiser } from '@client/composants/Animations'
import { signalerErreur } from '@client/connecteurs/suivi'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { ResumeArgent } from '../../donnees/domaines/argent'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { jourDe } from '../../calculs/temps'
import { DetailVersement } from './Versement'
import { Aide, AvecDonnees, BandeauHorsLigne, Oeil, Onglets, PastilleOperateur, jourLongMois, numeroLisible, quand, useMontant } from './commun'

const POINT = { width: '12px', height: '12px', borderRadius: '50%', flexShrink: '0', margin: '0 4px 0 2px' } as const

/** « ce soir à 18 h » (après 17 h le jour même), sinon en mots simples. */
export function ceSoirOu(ms: number, maintenant: number, langue: 'fr' | 'en') {
  const memeJour = jourDe(ms) === jourDe(maintenant)
  const soir = Number(heure(ms, 'fr').slice(0, 2)) >= 17
  if (memeJour && soir) return langue === 'en' ? `tonight at ${heure(ms, 'en')}` : `ce soir à ${heure(ms, 'fr')}`
  return quand(ms, maintenant, langue)
}

function Ligne(p: { vers: string; couleur: string; titre: string; phrase: string; montant: string; testid: string }) {
  const { t } = usePreferences()
  return (
    <Link to={p.vers} className="li" data-ligne={p.testid}>
      <span style={{ ...POINT, background: p.couleur }}></span>
      <span className="grow">
        <span className="lt" style={{ display: 'block' }}>
          {t(p.titre)}
        </span>
        <span className="ls" style={{ display: 'block' }}>
          {p.phrase}
        </span>
      </span>
      <span className="rv">{p.montant}</span>
      <span className="chev">
        <Icone nom="chevron-right" taille={18} />
      </span>
    </Link>
  )
}

function Contenu({ d, relire }: { d: ResumeArgent; relire: () => void }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge()
  const m = useMontant()
  useTirerPourActualiser(relire)
  // Contrôle des totaux avant tout affichage (VD09-R03) : un chiffre faux n'est jamais montré.
  const somme = d.aVerser + d.seLibere + d.enCours + d.gele
  const ecart = somme !== d.enCirculation
  useEffect(() => {
    if (!ecart) return
    signalerErreur(new Error(`argent : somme des états ${somme} ≠ en circulation ${d.enCirculation}`), 'ecran', { ecran: 'argent' })
    const id = setTimeout(relire, 4000)
    return () => clearTimeout(id)
  }, [ecart, somme, d.enCirculation, relire])
  if (ecart)
    return (
      <div className="card" role="alert">
        <div className="empty" style={{ padding: '18px 4px 4px' }}>
          <div className="ei">
            <Icone nom="refresh-cw" taille={26} />
          </div>
          <h3>{t('Vérification des montants')}</h3>
          <p>{t('Les totaux ne concordent pas : rien n’est affiché tant qu’ils ne sont pas justes. L’équipe est prévenue ; l’écran se recharge.')}</p>
        </div>
      </div>
    )
  const pv = d.prochainVersement
  const op = d.numero.operateur
  const numero = `${op} ${numeroLisible(d.numero.masque)}`
  const l = d.lignes
  const nbGel = l.gele.litiges + l.gele.retours + l.gele.verifications
  const morceaux = [
    l.gele.litiges ? tf(l.gele.litiges > 1 ? '{n} litiges' : '{n} litige', { n: l.gele.litiges }) : '',
    l.gele.retours ? tf(l.gele.retours > 1 ? '{n} retours' : '{n} retour', { n: l.gele.retours }) : '',
    l.gele.verifications ? tf(l.gele.verifications > 1 ? '{n} vérifications' : '{n} vérification', { n: l.gele.verifications }) : '',
  ].filter(Boolean)
  const phraseGel = morceaux.length > 1 ? morceaux.slice(0, -1).join(', ') + t(' et ') + morceaux[morceaux.length - 1] : (morceaux[0] ?? '')
  const part = (v: number) => (d.enCirculation ? v / d.enCirculation : 0)
  return (
    <>
      <div className="hero night">
        <div className="otop">
          <div className="hk">{pv ? tf('Prochain versement · {jour}', { jour: jourLongMois(pv.vendredi, langue) }) : t('Prochain versement')}</div>
          <Oeil clair style={{ margin: '-10px -10px -10px 0' }} />
        </div>
        <div className="big" data-net={d.detailVersement.net}>
          {m.n(d.detailVersement.net)}
          <small>{t('FCFA')}</small>
        </div>
        {d.numero.enRevue ? (
          <div className="hs">{t('Versements suspendus pendant la revue du nouveau numéro : rien n’est perdu.')}</div>
        ) : d.passeA ? (
          <div className="hs">
            {t('Passe à ')}
            <b>{m.f(d.passeA.net)}</b>
            {tf(' {quand}, quand {ref} se libère.', { quand: ceSoirOu(d.passeA.a, maintenant, langue), ref: d.passeA.ref })}
          </div>
        ) : (
          !d.aVerser && <div className="hs">{t('Rien à verser cette semaine : les ventes libérées apparaîtront ici.')}</div>
        )}
        <div className="hline"></div>
        <div className="row">
          <PastilleOperateur operateur={op} />
          <div className="grow">
            <div className="t15 b8">{tf('Sur {numero}, avant {h}', { numero, h: heure(pv?.heureLimite ?? '12:00', langue) })}</div>
            <div className="t13 mt4" style={{ color: 'rgba(255,255,255,.74)' }}>
              {d.numero.enRevue ? t('Nouveau numéro · en revue') : t('Automatique · vérifié')}
            </div>
          </div>
        </div>
        {d.detailVersement.ventes > 0 && <DetailVersement d={d.detailVersement} nuit />}
        <Link to={chemin('versements')} className="row t14 b8" style={{ color: 'var(--gold-l)', minHeight: '44px', marginTop: '6px', gap: '4px' }}>
          {t('Voir le prochain versement ')}
          <Icone nom="chevron-right" taille={16} />
        </Link>
      </div>
      <div className="card">
        <h3>{t('Où est votre argent')}</h3>
        <div style={{ display: 'flex', height: '10px', borderRadius: '999px', overflow: 'hidden', marginTop: '12px', gap: '2px', background: 'var(--sand-3)' }} aria-hidden="true">
          {[
            [d.aVerser, 'var(--green)'],
            [d.seLibere, 'var(--or)'],
            [d.enCours, 'var(--gold)'],
            [d.gele, 'var(--red)'],
          ].map(([v, c], i) => (Number(v) > 0 ? <i key={i} style={{ display: 'block', flex: String(Math.max(part(Number(v)), 0.045)), background: String(c) }}></i> : null))}
        </div>
        <div className="mt6">
          <Ligne testid="a_verser" vers={chemin('versements')} couleur="var(--green)" titre="À verser" phrase={d.aVerser ? t('Libéré · part vendredi') : t('Rien de libéré pour l’instant')} montant={m.f(d.aVerser)} />
          <Ligne
            testid="se_libere"
            vers={chemin('se_libere')}
            couleur="var(--or)"
            titre="Se libère"
            phrase={l.seLibere ? `${l.seLibere.ref} · ${ceSoirOu(l.seLibere.a, maintenant, langue)}` + (l.seLibere.autres ? tf(' · et {n} autre(s)', { n: l.seLibere.autres }) : '') : t('Aucune vente en délai de sécurité')}
            montant={m.f(d.seLibere)}
          />
          <Ligne
            testid="en_cours"
            vers={l.enCours && !l.enCours.autres ? chemin('commande', { ref: l.enCours.ref }) : chemin('se_libere')}
            couleur="var(--gold)"
            titre="En cours"
            phrase={l.enCours ? tf(l.enCours.autres ? '{ref} et {n} autre(s) · pas encore retirées' : '{ref} · pas encore retirée', { ref: l.enCours.ref, n: l.enCours.autres }) : t('Aucune commande en attente de retrait')}
            montant={m.f(d.enCours)}
          />
          <Ligne testid="gele" vers={chemin('gele')} couleur="var(--red)" titre="Gelé" phrase={nbGel ? tf('{quoi} · sans date', { quoi: phraseGel }) : t('Rien de gelé')} montant={m.f(d.gele)} />
        </div>
        <div className="row" style={{ paddingTop: '12px', borderTop: '1.5px solid var(--line-2)' }}>
          <span className="grow">
            <span className="t15 b8" style={{ display: 'block' }}>
              {t('En circulation')}
            </span>
            <span className="t12 c3" style={{ display: 'block', marginTop: '2px' }}>
              {t('La somme des quatre lignes')}
            </span>
          </span>
          <span className="b8 nw" data-total="circulation" style={{ fontSize: '20px', letterSpacing: '-.02em' }}>
            {m.f(d.enCirculation)}
          </span>
        </div>
      </div>
      <div className="card">
        <h3>{t('Ce que vous gardez')}</h3>
        <Link to={chemin('gains')} className="row mt10" style={{ alignItems: 'flex-end' }}>
          <div className="grow">
            <div className="t14 b7">{t('Ce mois-ci')}</div>
            <div className="t13 c3 mt4">{tf('sur {montant} de ventes', { montant: m.f(d.ventesDuMois) })}</div>
          </div>
          <div className="b8 cg nw" style={{ fontSize: '22px', letterSpacing: '-.02em' }}>
            {m.f(d.gardeDuMois)}
          </div>
        </Link>
        {d.exemple && <Aide>{tf('Sur une vente de {prix}, vous gardez {garde}, versés chaque vendredi (1 % de frais Mobile Money).', { prix: m.f(d.exemple.prix), garde: m.f(d.exemple.garde) })}</Aide>}
        <div className="mt6">
          <Link to={chemin('gains')} className="li" style={{ borderTop: '1px solid var(--line)' }}>
            <span className="ic green">
              <Icone nom="trending-up" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Gagné avec BelivaY')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Depuis votre inscription, vente par vente')}
              </span>
            </span>
            <span className="rv cg">{m.f(d.gagneDepuisInscription)}</span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
          {/* AJ-B (DP-58, vue réelle « Mes ajustements ») : ventes et reprises ligne par ligne, export comptable. */}
          <Link to={chemin('ajustements')} className="li">
            <span className="ic or">
              <Icone nom="list-checks" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Mes ajustements')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Ventes et reprises ligne par ligne, export comptable')}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
          <Link to={chemin('documents')} className="li">
            <span className="ic or">
              <Icone nom="file-text" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Relevés et documents')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {t('Relevé CSV, relevé mensuel, factures')}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
          <Link to={chemin('numero_versement')} className="li">
            <span className="ic green">
              <Icone nom="smartphone" taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t('Numéro de versement')}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {`${numero} · ${d.numero.enRevue ? t('en revue') : t('vérifié')}`}
              </span>
            </span>
            <span className="chev">
              <Icone nom="chevron-right" taille={18} />
            </span>
          </Link>
        </div>
      </div>
      <div className="note green">
        <Icone nom="shield-check" taille={18} />
        <div>{t('BelivaY ne vous demande jamais votre code secret Mobile Money. Un message qui le demande est une fraude.')}</div>
      </div>
    </>
  )
}

export default function Argent() {
  const { t } = usePreferences()
  const lecture = useLecture(() => source.argent.resume())
  return (
    <AvecDonnees route="argent" lecture={lecture} titreReserve>
      {(d) => (
        <Ecran route="argent">
          <div className="pg">
            <h1 className="pg-t">{t('Mon argent')}</h1>
          </div>
          <Onglets actif="argent" />
          <BandeauHorsLigne calculeA={d.calculeA} />
          <Contenu d={d} relire={lecture.relire} />
        </Ecran>
      )}
    </AvecDonnees>
  )
}
