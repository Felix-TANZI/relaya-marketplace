// Gelé — pourquoi (VD-09) : repris du prototype (route('gele')), branché sur la source (GET /money/frozen).
// - Carte rouge : total gelé = somme des cartes, l'addition écrite dessous (VD09-R17), pastille « Sans date de
//   versement » (GEL-01) ; un litige gagné libère aussitôt (VD09-R16, Q-60) ;
// - « À faire pour débloquer » : délais lus dans le registre (LIT-VENDEUR-H, RET-INSPECT-H) ; cartes triées par échéance,
//   la plus urgente seule en bouton plein et délai en rouge (GEL-03) ; compte à rebours vivant ; vérification
//   anti-fraude sans échéance, motif écrit sous 48 h (GEL-02, Q-64) ; filtre Litiges / Retours quand il y a les deux ;
// - Liens vers le litige (VD-07), le retour, le support ; seuils du remboursement automatique lus dans le registre
//   (VD07-R04 : jamais le palier du client, seulement « client très fiable ») ;
// - Œil des montants (DP-52), hors connexion, accès Préparation verrouillé.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTirerPourActualiser } from '@client/composants/Animations'
import { Ecran } from '../../composants/coque'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import type { Gele as DonneesGele, TypeGel } from '../../donnees/domaines/argent'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { duree, echeance } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { jourDe } from '../../calculs/temps'
import { Aide, AvecDonnees, BandeauHorsLigne, CommentCaMarche, Oeil, Onglets, Puces, jourCourtMois, useMontant } from './commun'

const TITRE: Record<TypeGel, string> = { litige: 'LITIGE · {ref}', retour: 'RETOUR · {ref}', verification: 'VÉRIFICATION · {ref}' }

function Contenu({ d, relire }: { d: DonneesGele; relire: () => void }) {
  const { t, tf, langue } = usePreferences()
  const maintenant = useHorloge()
  const m = useMontant()
  const [filtre, setFiltre] = useState<'tout' | TypeGel>('tout')
  useTirerPourActualiser(relire)
  const types = [...new Set(d.cartes.map((c) => c.type))]
  const cartes = d.cartes.filter((c) => filtre === 'tout' || c.type === filtre)
  if (!d.cartes.length)
    return (
      <div className="card">
        <div className="empty" style={{ padding: '18px 4px 4px' }}>
          <div className="ei" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
            <Icone nom="lock-open" taille={26} />
          </div>
          <h3>{t('Rien de gelé')}</h3>
          <p>{t('Aucun litige, retour ni vérification en cours : tout votre argent suit son chemin normal.')}</p>
        </div>
      </div>
    )
  const addition = d.cartes.map((c) => m.n(c.garde)).join(' + ') + (m.masque ? ' F' : ' F')
  return (
    <>
      <div className="hero red">
        <div className="otop">
          <span className="hk">{tf(d.cartes.length > 1 ? 'Gelé · {n} commandes' : 'Gelé · {n} commande', { n: d.cartes.length })}</span>
          <span className="pill dk">{t('Sans date de versement')}</span>
        </div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="big grow">
            {m.n(d.total)}
            <small>{t('FCFA')}</small>
          </div>
          <Oeil clair style={{ marginBottom: '2px' }} />
        </div>
        {d.cartes.length > 1 && <div className="hs">{addition}</div>}
        <div className="hline"></div>
        <div className="row t13" style={{ gap: '8px', alignItems: 'flex-start', lineHeight: '1.45', color: 'rgba(255,255,255,.9)' }}>
          <Icone nom="badge-check" taille={18} style={{ flexShrink: '0', marginTop: '1px' }} />
          <span>{t('Litige gagné : la somme se libère aussitôt et part le vendredi suivant.')}</span>
        </div>
      </div>
      <div className="sec">
        <h2>{t('À faire pour débloquer')}</h2>
      </div>
      <Aide>{tf('Litige : {l} h pour répondre. Retour : {r} h pour inspecter le produit.', { l: d.delais.litigeHeures, r: d.delais.inspectionHeures })}</Aide>
      {types.length > 1 && (
        <Puces
          etiquette="Filtrer"
          valeur={filtre}
          changer={setFiltre}
          choix={[{ v: 'tout', libelle: t('Tout') }, ...types.map((ty) => ({ v: ty, libelle: t(ty === 'litige' ? 'Litiges' : ty === 'retour' ? 'Retours' : 'Vérifications') }))]}
        />
      )}
      {cartes.map((c) => {
        const urgente = c === d.cartes[0]
        const depasse = c.echeance !== null && c.echeance <= maintenant
        const delai =
          c.type === 'litige'
            ? depasse
              ? t('Délai passé : BelivaY décide sous 24 h.')
              : tf('Répondez avant {quand}', { quand: echeance(c.echeance!, maintenant, langue) })
            : c.type === 'retour'
              ? depasse
                ? t('Délai d’inspection passé : écrivez au support.')
                : tf('Inspectez-le avant {quand}', { quand: echeance(c.echeance!, maintenant, langue) })
              : tf('Motif écrit sous {n} h · sans échéance', { n: d.delais.verificationHeures })
        const sousTitre =
          c.type === 'litige'
            ? `« ${t(c.motif)} »`
            : c.type === 'retour'
              ? `${t(c.motif.split(',')[0].replace(/^./, (x) => x.toUpperCase()))} · ${c.arrivee! <= maintenant ? t('arrivé') : jourDe(c.arrivee!) === jourDe(maintenant + 864e5) ? t('arrive demain') : jourDe(c.arrivee!) === jourDe(maintenant) ? t('arrive aujourd’hui') : tf('arrive {jour}', { jour: jourCourtMois(c.arrivee!, langue) })}`
              : t('Vérification en cours')
        const lien = c.type === 'litige' ? chemin('litige', { ref: c.ref }) : c.type === 'retour' ? chemin('retours') : chemin('messages', { fil: 'support', sujet: c.ref })
        const libelle = c.type === 'litige' ? 'Répondre au litige' : c.type === 'retour' ? 'Voir le retour' : 'Écrire au support'
        return (
          <div key={c.ref} className="card ord red" data-ref={c.ref}>
            <div className="otop">
              <span className="oref">{tf(TITRE[c.type], { ref: c.ref })}</span>
              <span className="b8 t15 cr nw">{m.f(c.garde)}</span>
            </div>
            <div className="art">
              <Vignette nom={c.article.dessin} taille={48} />
              <div className="grow">
                <div className="an" style={{ fontSize: '15.5px' }}>
                  {c.type === 'retour' ? `${c.article.titre} · ${t(c.article.variante)}` : c.article.titre}
                </div>
                <div className="av">{sousTitre}</div>
              </div>
            </div>
            <div className="row t13 b7 mt10" style={{ gap: '7px', alignItems: 'flex-start', color: urgente ? 'var(--red)' : 'var(--ink-2)' }}>
              <Icone nom={c.type === 'retour' ? 'search' : c.type === 'litige' ? 'clock' : 'shield-alert'} taille={16} style={{ flexShrink: '0', marginTop: '1px' }} />
              <span className="grow">{delai}</span>
              {c.echeance !== null && !depasse && <span className="nw c3">{tf('il reste {d}', { d: duree(c.echeance - maintenant, langue) })}</span>}
            </div>
            <div className="mt12">
              <Link to={lien} className={'btn ' + (urgente ? 'primary' : 'secondary')} style={urgente ? undefined : { height: '44px' }}>
                <Icone nom={c.type === 'verification' ? 'message-circle' : 'arrow-right'} taille={18} />
                <span>{t(libelle)}</span>
              </Link>
            </div>
          </div>
        )
      })}
      <CommentCaMarche>
        <p className="b8" style={{ color: 'var(--ink)' }}>
          {t('Ce qui peut geler')}
        </p>
        {[
          ['scale', 'Un litige ouvert par le client', null],
          ['undo-2', 'Un retour après un problème signalé', null],
          ['shield-alert', 'Une vérification anti-fraude', tf('Motif écrit sous {n} h', { n: d.delais.verificationHeures })],
        ].map(([ic, titre, sous]) => (
          <div key={titre} className="li">
            <span className="ic red">
              <Icone nom={ic!} taille={20} />
            </span>
            <span className="grow">
              <span className="lt" style={{ display: 'block' }}>
                {t(titre!)}
              </span>
              {sous && (
                <span className="ls" style={{ display: 'block' }}>
                  {sous}
                </span>
              )}
            </span>
          </div>
        ))}
        <p className="mt8">{t('Un gel est toujours attaché à une commande précise.')}</p>
        <p>{tf('Petit remboursement automatique au client ({s}, ou {e} pour un client très fiable) : BelivaY le paie. Vous êtes payé normalement.', { s: m.brut(d.remboursementAuto.standard), e: m.brut(d.remboursementAuto.tresFiable) })}</p>
      </CommentCaMarche>
    </>
  )
}

export default function Gele() {
  const { t } = usePreferences()
  const lecture = useLecture(() => source.argent.gele())
  return (
    <AvecDonnees route="gele" lecture={lecture}>
      {(d) => (
        <Ecran route="gele">
          <div className="pg">
            <h1 className="pg-t">{t('Gelé')}</h1>
          </div>
          <Onglets actif="gele" />
          <BandeauHorsLigne />
          <Contenu d={d} relire={lecture.relire} />
        </Ecran>
      )}
    </AvecDonnees>
  )
}
