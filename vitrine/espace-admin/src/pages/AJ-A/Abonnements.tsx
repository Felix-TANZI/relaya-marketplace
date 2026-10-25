// Abonnements des clients (page ajoutée) : paliers Plus, Prime, Prime Duo, Business (site/src/donnees/prime.ts) — qui,
// depuis quand, renouvellement, usage du mois ; le Support accorde un geste commercial plafonné : au plus le prix d'un
// mois et le plafond de son niveau (logique-metier/ACCES-CONSOLE.md § 2). Lecture pour la Finance, la Médiation, l'Audit.
import { useState } from 'react'
import { Ecran } from '../../composants/coque'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Pill, Px, Table, useSurtitre } from '../../composants/prototype'
import type { AbonnementClient } from '../../donnees/domaines/acteurs'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useDroit } from '../../session'
import { EtatLecture, useDate } from '../ADM-12/commun-s6'

const fr = (n: number) => `${n.toLocaleString('fr-FR').replace(/[\s  ]/g, ' ')} F`

export default function Abonnements() {
  const { t, tf } = usePreferences()
  const surtitre = useSurtitre()
  const date = useDate()
  const droit = useDroit('abonnements')
  const l = useLecture(() => source.acteurs.abonnements(), [])
  const [geste, setGeste] = useState<AbonnementClient | null>(null)
  const [montant, setMontant] = useState('')
  const RAISONS: Record<string, string> = { plafond: 'Au-delà de votre plafond : la Direction accorde ce geste.', montant: 'Au plus le prix d’un mois de l’abonnement.' }
  return (
    <Ecran route="abonnements" kicker={surtitre}>
      <Px>
        <EtatLecture l={l} quoi="les abonnements des clients">
          {(d) => (
            <>
              <p className="t13 c3 mt8">{d.plafondGeste !== null ? tf('Votre plafond de geste : {f}', { f: fr(d.plafondGeste) }) : t('Geste commercial sans plafond de niveau (Direction)')}</p>
              <div className="mt12">
                <Table
                  cle={(a) => a.id}
                  rows={d.liste}
                  cols={[
                    { k: 'c', t: t('Client'), main: true, rendu: (a) => <><b>{a.client}</b><div className="t2">{`${a.id} · ${a.zone}`}</div></> },
                    { k: 'p', t: t('Palier'), rendu: (a) => <><Pill ton="blue" sm>{a.palier}</Pill><div className="t2">{tf('{f} par mois', { f: fr(a.prixMois) })}</div></> },
                    { k: 'u', t: t('Usage du mois'), rendu: (a) => tf('{n} commande(s) sur {m}', { n: a.commandesMois, m: a.plafondMois }) },
                    { k: 'r', t: t('Renouvellement'), rendu: (a) => <><Pill ton={a.etat === 'actif' ? 'green' : a.etat === 'grace' ? 'amber' : 'ink'} sm dot>{t(a.etat === 'actif' ? 'Actif' : a.etat === 'grace' ? 'En période de grâce' : 'Résilié')}</Pill><div className="t2">{date(a.renouvellement)}</div></> },
                    { k: 'g', t: '', cls: 'r', rendu: (a) => (droit.acces === 'oui' && a.etat !== 'resilie' ? <button type="button" className="btn sm secondary" onClick={() => (setGeste(a), setMontant(String(Math.min(a.prixMois, d.plafondGeste ?? a.prixMois))))}>{a.gestes.length ? tf('Geste ({n})', { n: a.gestes.length }) : t('Geste')}</button> : null) },
                  ]}
                />
              </div>
              <DecisionMotivee
                ouverte={!!geste}
                fermer={() => setGeste(null)}
                titre={geste ? tf('Geste commercial · {c}', { c: geste.client }) : ''}
                resume={geste ? tf('{p} · au plus {f}', { p: geste.palier, f: fr(geste.prixMois) }) : ''}
                libelle="Accorder le geste"
                envoyer={async (m) => {
                  const r = await source.acteurs.gesteAbonnement(geste!.id, Math.round(Number(montant.replace(/\D/g, ''))), m)
                  return r.ok ? null : r.raison === 'motif_court' ? r : t(RAISONS[r.raison] ?? 'Le geste n’a pas pu être fait. Rien n’a été appliqué.')
                }}
              >
                <label className="fld mt10">
                  <span className="fld-t">{t('Montant (F)')}</span>
                  <span className="inp">
                    <input inputMode="numeric" value={montant} onChange={(e) => setMontant(e.target.value)} />
                  </span>
                </label>
              </DecisionMotivee>
            </>
          )}
        </EtatLecture>
      </Px>
    </Ecran>
  )
}
