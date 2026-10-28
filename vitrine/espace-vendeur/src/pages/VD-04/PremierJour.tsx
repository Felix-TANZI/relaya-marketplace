// Premier jour (VD-04, route « premier_jour ») — balisage du prototype, branché sur la source (GET /seller/onboarding) :
// - « Trois gestes pour commencer », dans l'ordre du serveur ; le PREMIER geste non fait porte le seul bouton plein,
//   les autres sont des lignes avec chevron (ACC-21) ; un geste fait est coché vert et reste visible (ACC-16) ;
//   « Ajouter vos produits » est fait dès un produit en ligne ; le numéro de versement, déjà vérifié à l'ouverture,
//   reste coché (Q-81) ;
// - palier de lancement : il suit les produits en vente pendant 2 mois après la signature, seuils lus des paramètres
//   (ACC-15, VD04-R12) ; barre vers le palier suivant ; seuils repliés sous « Comment ça marche » ;
// - offre de découverte en francs gardés, jamais en points (DP-55, Q-03), avec ce qui reste (Q-62) ;
// - « Besoin d'aide ? » : saisie assistée (gratuite pour les premières boutiques, DP-56 Q-40), support vendeur ;
// - fin de l'écran dès la première commande reçue ou les trois gestes faits (DP-57, I-3) : l'accueil reprend, et cet
//   écran le dit avec un lien. L'accueil montre ce corps tant que le premier jour n'est pas terminé.
import { Link } from 'react-router-dom'
import { F } from '@client/i18n/format'
import { Ecran, nomPalier } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { GestePremierJour, PremierJour as PJ } from '../../donnees/domaines/accueil'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useSession } from '../../session'
import { Bouton, PiedConnexion } from './boutique'
import { ErreurLecture, Squelette, useReseau } from './commun'

const GESTES: Record<GestePremierJour, { titre: string; aFaire: string; bouton: string; icone: string; vers: string }> = {
  produits: { titre: 'Ajouter vos produits', aFaire: 'Moins d’une minute par produit déjà connu', bouton: 'Ajouter un produit', icone: 'plus', vers: chemin('offre1') },
  horaires: { titre: 'Régler vos horaires', aFaire: 'Et les heures de passage du livreur', bouton: 'Régler vos horaires', icone: 'clock', vers: chemin('horaires') },
  numero: { titre: 'Vérifier votre numéro de versement', aFaire: 'Le numéro où vos ventes sont versées chaque vendredi', bouton: 'Vérifier mon numéro', icone: 'wallet', vers: chemin('numero_versement') },
}
const PALIERS = ['Argent', 'Or', 'Platine'] as const
const dateCourte = (j: string, l: 'fr' | 'en') => {
  const d = new Date(j + 'T12:00:00Z')
  const m = l === 'en' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'] : ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
  return `${d.getUTCDate()} ${m[d.getUTCMonth()]}`
}

export function CorpsPremierJour({ p }: { p: PJ }) {
  const { t, tf, langue } = usePreferences()
  const s = useSession()
  const premier = p.gestes.findIndex((g) => !g.fait)
  const faits = p.gestes.filter((g) => g.fait).length
  const l = p.lancement
  const suivant = l ? PALIERS.find((x) => l.actifs < l.seuils[x]) : undefined
  const seuilSuivant = l && suivant ? l.seuils[suivant] : null
  const d = p.decouverte
  const detailFait = (g: GestePremierJour) =>
    g === 'produits' ? tf(p.produitsEnLigne > 1 ? '{n} produits en ligne' : '{n} produit en ligne', { n: p.produitsEnLigne }) : g === 'horaires' ? t('Horaires et passage du livreur réglés') : p.numero ? tf('{numero} · vérifié', { numero: p.numero }) : t('Vérifié')
  return (
    <>
      <div className="pg-k" style={{ marginTop: '14px' }}>
        {tf('Bienvenue {prenom} · jour {n}', { prenom: s.membre?.prenom ?? '', n: p.jour })}
      </div>
      <div className="pg" style={{ paddingTop: '4px' }}>
        <h1 className="pg-t">{faits === p.gestes.length ? t('Vos trois gestes sont faits') : t('Trois gestes pour commencer')}</h1>
        <p className="pg-s">
          {faits === p.gestes.length ? t('Votre boutique est prête : vos premières commandes arrivent sur l’accueil.') : t('Votre boutique est ouverte. Faites ces trois gestes et vos premières commandes arrivent.')}
        </p>
      </div>
      {p.termine && (
        <div className="note green" role="status">
          <Icone nom="circle-check" taille={18} />
          <div>
            {t('Votre boutique a démarré : l’accueil montre désormais vos commandes.')}
            <Link to={chemin('accueil')} className="b8" style={{ display: 'flex', alignItems: 'center', gap: '2px', minHeight: '44px', marginBottom: '-10px' }}>
              {t('Aller à l’accueil')}
              <Icone nom="chevron-right" taille={16} />
            </Link>
          </div>
        </div>
      )}
      <div className="card tight">
        <div className="t12 b8 c3" style={{ padding: '12px 0 0', letterSpacing: '.06em', textTransform: 'uppercase' }}>
          {tf('{n} sur {total} faits', { n: faits, total: p.gestes.length })}
        </div>
        {p.gestes.map((g, i) => {
          const x = GESTES[g.cle]
          const pastille = g.fait ? (
            <span className="ic green vd4-fait" style={{ borderRadius: '50%' }}>
              <Icone nom="check" taille={20} trait={2.6} />
            </span>
          ) : (
            <span className="ic or" style={{ borderRadius: '50%' }}>
              <b className="t15">{t(String(i + 1))}</b>
            </span>
          )
          const texte = (
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(x.titre)}
              </span>
              <span className="ls" style={{ display: 'block' }}>
                {g.fait ? detailFait(g.cle) : t(x.aFaire)}
              </span>
            </span>
          )
          if (i === premier)
            return (
              <div key={g.cle} className="li" style={{ flexWrap: 'wrap', padding: '14px 0' }}>
                {pastille}
                {texte}
                <div style={{ flexBasis: '100%' }}>
                  <Bouton classe="primary" icone={x.icone} vers={x.vers}>
                    {t(x.bouton)}
                  </Bouton>
                </div>
              </div>
            )
          return (
            <Link key={g.cle} to={x.vers} className="li">
              {pastille}
              {texte}
              <span className="chev">
                <Icone nom="chevron-right" taille={18} />
              </span>
            </Link>
          )
        })}
      </div>
      {l && (
        <div className="card">
          <h3>{t('Plus vous publiez, plus vous gardez')}</h3>
          <div className="hint-l">
            <Icone nom="info" taille={15} style={{ flexShrink: '0', marginTop: '1px' }} />
            <span>{t('Palier : votre niveau de vendeur. Plus il est haut, plus vous gardez.')}</span>
          </div>
          <div className="row mt12">
            <span className={'medal ' + { Bronze: 'bronze', Argent: 'argent', Or: 'or', Platine: 'platine' }[l.palier]}>
              <Icone nom="award" taille={22} />
            </span>
            <div className="grow">
              <div className="b8 t15">{tf('Palier de lancement : {p}', { p: nomPalier(l.palier, langue) })}</div>
              <div className="t13 c3 mt4">
                {suivant && seuilSuivant !== null
                  ? tf(l.actifs > 1 ? '{n} produits en vente aujourd’hui · {s} pour passer {p}' : '{n} produit en vente aujourd’hui · {s} pour passer {p}', { n: l.actifs, s: seuilSuivant, p: nomPalier(suivant, langue) })
                  : tf('{n} produits en vente aujourd’hui · palier le plus haut', { n: l.actifs })}
              </div>
            </div>
          </div>
          <div className="bar mt10 vd4-barre" role="progressbar" aria-valuemin={0} aria-valuemax={seuilSuivant ?? l.actifs} aria-valuenow={l.actifs} aria-label={t('Produits en vente')}>
            <i style={{ width: `${Math.max(2, Math.min(100, Math.round((l.actifs / (seuilSuivant ?? Math.max(1, l.actifs))) * 100)))}%` }}></i>
          </div>
          <div className="t12 c3 mt6">{tf('Jusqu’au {date} ; ensuite, votre Trust Score décide.', { date: dateCourte(l.fin, langue) })}</div>
          <details className="more flat">
            <summary>
              <Icone nom="info" taille={18} style={{ color: 'var(--or-txt)', flexShrink: '0' }} />
              <span className="grow">{t('Comment ça marche')}</span>
              <Icone nom="chevron-down" taille={18} style={{ color: 'var(--ink-4)', flexShrink: '0' }} />
            </summary>
            <div className="more-b">
              <p>{t('Pendant les deux premiers mois après la signature, votre palier suit vos produits en vente. Ensuite, c’est votre Trust Score qui décide.')}</p>
              <div>
                {(['Bronze', ...PALIERS] as const).map((x) => (
                  <div key={x} className="row" style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}>
                    <span className={'medal ' + { Bronze: 'bronze', Argent: 'argent', Or: 'or', Platine: 'platine' }[x]}>
                      <Icone nom="award" taille={22} />
                    </span>
                    <div className="grow">
                      <div className="b8 t14">{nomPalier(x, langue)}</div>
                      <div className="t13 c3">{x === 'Bronze' ? t('dès le départ') : tf('{n} produits en vente', { n: l.seuils[x] })}</div>
                    </div>
                    {x === l.palier && <span className="pill or">{t('Vous')}</span>}
                  </div>
                ))}
              </div>
              <p className="mt8">{t('Trust Score : votre note de confiance, sur 100.')}</p>
            </div>
          </details>
        </div>
      )}
      <div className="card">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <span style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0', background: 'var(--green-soft)', color: 'var(--green)' }}>
            <Icone nom="gift" taille={20} />
          </span>
          <div className="grow">
            <div className="b8 t15">{t('Offre de découverte')}</div>
            <div className="t13 c2 mt4" style={{ lineHeight: '1.45' }}>
              {d.gainParVente !== null && d.prixReference !== null
                ? tf('Vous gardez {g} de plus sur chaque {titre} à {p}.', { g: t(`${F(d.gainParVente)} F`), titre: d.reference, p: t(`${F(d.prixReference)} F`) })
                : t('Vous gardez plus sur chaque vente, sans rien faire.')}
            </div>
            <div className="t13 c3 mt4" style={{ lineHeight: '1.45' }}>
              {d.fin && d.active
                ? tf('Encore {n} commandes ou jusqu’au {date}, la première limite atteinte.', { n: d.restantes, date: dateCourte(d.fin, langue) })
                : d.fin
                  ? t('Votre offre de découverte est terminée.')
                  : tf('Dès votre première commande payée, pendant {m} mois ou {c} commandes.', { m: d.mois, c: d.commandes })}
            </div>
          </div>
        </div>
      </div>
      <div className="sec">
        <h2>{t('Besoin d’aide ?')}</h2>
      </div>
      <div className="card tight" style={{ marginTop: '0' }}>
        <Link to={chemin('saisie_assistee')} className="li">
          <span className="ic or">
            <Icone nom="users" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Un agent BelivaY peut saisir vos produits')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {p.saisieAssisteeGratuite ? t('Photos prises chez vous, vous validez chaque fiche · gratuit pour les premières boutiques') : t('Photos prises chez vous, vous validez chaque fiche')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
        <Link to={chemin('aide')} className="li">
          <span className="ic green">
            <Icone nom="message-circle" taille={20} />
          </span>
          <span className="grow">
            <span className="lt" style={{ display: 'block' }}>
              {t('Une question ? Le support vendeur sur WhatsApp')}
            </span>
            <span className="ls" style={{ display: 'block' }}>
              {t('Aide seulement : jamais de commande ni de preuve')}
            </span>
          </span>
          <span className="chev">
            <Icone nom="chevron-right" taille={18} />
          </span>
        </Link>
      </div>
    </>
  )
}

export default function PremierJour() {
  const s = useSession()
  const enLigne = useReseau()
  const lecture = useLecture(() => Promise.all([source.accueil.premierJour(), source.accueil.file()]), [s.membre?.role])
  const d = lecture.donnees
  return (
    <Ecran route="premier_jour" calme>
      {lecture.erreur ? (
        <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />
      ) : !d ? (
        <Squelette cartes={3} />
      ) : (
        <>
          <CorpsPremierJour p={d[0]} />
          <PiedConnexion enLigne={enLigne} enAttente={d[1].actions.filter((a) => a.etat === 'en_attente').length} />
        </>
      )}
    </Ecran>
  )
}
