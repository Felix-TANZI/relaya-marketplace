// Accès du compte d'un acteur (client, vendeur, livreur, relais, entreprise), en tête de sa fiche : autorisé ou bloqué
// par BelivaY, demande en attente du second validateur, et le geste (bloquer, rétablir) pour qui en a le droit. Motif
// écrit, journalisé ; l'espace de l'acteur le reçoit par le pont (acces_change). Bloquer un partenaire (vendeur, relais,
// entreprise, livreur) passe à quatre yeux ; un client, aussitôt. Une lecture refusée (rôle sans la page) : rien.
import { useState } from 'react'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Icone } from '../../composants/Icone'
import { Banniere, Pill } from '../../composants/prototype'
import type { CodeZone } from '../../donnees/communs'
import type { EspaceActeur } from '../../donnees/domaines/acteurs'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useDate } from '../ADM-12/commun-s6'
import './surveiller.css'

const REFUS: Record<string, string> = {
  sans_effet: 'L’accès est déjà dans cet état.',
  deja_demande: 'Un blocage attend déjà son second validateur.',
}

export function AccesActeur({ espace, id, nom, zone }: { espace: EspaceActeur; id: string; nom: string; zone: CodeZone | null }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  const l = useLecture(() => source.acteurs.accesActeur(espace, id, zone), [espace, id, zone])
  const [feuille, setFeuille] = useState<'bloque' | 'autorise' | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const a = l.donnees
  if (!a) return null
  const bloque = a.etat === 'bloque'
  const bouton = a.peutChanger && !a.demande && (
    <button type="button" className={'btn sm ' + (bloque ? 'secondary' : 'ghost')} onClick={() => setFeuille(bloque ? 'autorise' : 'bloque')}>
      <Icone nom={bloque ? 'lock-open' : 'lock'} taille={16} />
      <span>{bloque ? t('Rétablir l’accès') : t('Bloquer l’accès')}</span>
    </button>
  )
  return (
    <div className="sv-acces" data-acces={a.etat}>
      {bloque ? (
        <Banniere ton="red" icone="lock" bouton={bouton || undefined} role="status">
          <b>{t('Accès bloqué par BelivaY')}</b> · {a.depuis ? tf('depuis le {d} par {p}', { d: date(a.depuis), p: a.par ?? '—' }) : ''}
          {a.motif && <div className="t13 mt4">{a.motif}</div>}
        </Banniere>
      ) : (
        <div className="sv-ligne">
          <Icone nom="shield-check" taille={18} />
          <span className="grow">
            <b>{t('Accès au compte')}</b> · {t('Autorisé')}
            {a.historique[0] && <span className="t12 c3"> · {tf('rétabli le {d}', { d: date(a.historique[0].le) })}</span>}
          </span>
          {a.demande && (
            <Pill ton="amber" sm icone="users">
              {tf('Blocage à contresigner ({id})', { id: a.demande.id })}
            </Pill>
          )}
          {bouton}
        </div>
      )}
      {info && (
        <p className="t13 c2 mt6" role="status">
          {info}
        </p>
      )}
      <DecisionMotivee
        ouverte={feuille === 'bloque'}
        fermer={() => setFeuille(null)}
        titre={tf('Bloquer l’accès de {n}', { n: nom })}
        resume={t('Plus aucune connexion à son espace tant que l’accès n’est pas rétabli ; ce qui est en cours (colis, versements dus) suit sa règle. Le motif lui est montré.')}
        libelle="Bloquer l’accès"
        icone="lock"
        danger
        quatreYeux={a.quatreYeux}
        rolesSecond={['superviseur']}
        refus={(r) => t(REFUS[r] ?? 'La décision n’a pas pu être enregistrée.')}
        envoyer={async (m) => {
          const r = await source.acteurs.changerAcces({ espace, acteurId: id, nom, zone, etat: 'bloque', motif: m })
          if (r.ok) setInfo(r.etat === 'a_contresigner' ? tf('Blocage envoyé au second validateur ({id}) : il s’applique à la contre-signature.', { id: r.id }) : t('Accès bloqué ; l’acteur voit le motif.'))
          l.relire()
          return r
        }}
      />
      <DecisionMotivee
        ouverte={feuille === 'autorise'}
        fermer={() => setFeuille(null)}
        titre={tf('Rétablir l’accès de {n}', { n: nom })}
        resume={t('L’acteur se connecte de nouveau à son espace ; le rétablissement est journalisé et lui est annoncé.')}
        libelle="Rétablir l’accès"
        icone="lock-open"
        refus={(r) => t(REFUS[r] ?? 'La décision n’a pas pu être enregistrée.')}
        envoyer={async (m) => {
          const r = await source.acteurs.changerAcces({ espace, acteurId: id, nom, zone, etat: 'autorise', motif: m })
          if (r.ok) setInfo(t('Accès rétabli.'))
          l.relire()
          return r
        }}
      />
    </div>
  )
}
