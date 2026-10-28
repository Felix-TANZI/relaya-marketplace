// Voir comme le client (page ajoutée, Support et Direction) : ce que voit un client (ses commandes, leur état, le relais),
// en LECTURE SEULE, ouvert sur motif écrit, journalisé, pour ADM-DEMASQUE-MIN minutes ; un bandeau le rappelle tout du
// long. Aucun geste ici : pour agir, revenir à la fiche (Clients, Support, Litiges).
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PARAMETRES } from '../../calculs/registre'
import { Ecran } from '../../composants/coque'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Icone } from '../../composants/Icone'
import { Banniere, Px, Table, Vide } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { EtatLecture } from '../ADM-12/commun-s6'

const fr = (n: number) => `${n.toLocaleString('fr-FR').replace(/[\s  ]/g, ' ')} F`

export default function VueClient() {
  const { t, tf } = usePreferences()
  const [params] = useSearchParams()
  const id = params.get('id') ?? ''
  const n = useHorloge(5_000)
  const [ouvrir, setOuvrir] = useState(false)
  const l = useLecture(() => source.equipe.vueClient(id), [id, Math.floor(n / 60_000)])
  return (
    <Ecran route="vue-client" retour={chemin('clients', { id })}>
      <Px>
        <EtatLecture l={l} quoi="la vue du client">
          {(v) =>
            !v ? (
              <Vide
                icone="eye"
                t={t('Voir comme le client')}
                action={
                  <button type="button" className="btn primary" onClick={() => setOuvrir(true)}>
                    <Icone nom="eye" taille={18} />
                    <span>{tf('Ouvrir en lecture seule ({m} min)', { m: PARAMETRES.console.demasqueMin })}</span>
                  </button>
                }
              />
            ) : (
              <>
                <Banniere ton="amber" icone="eye" role="status">
                  <b>{tf('Lecture seule · vue de {c} · jusqu’à {h}', { c: v.client, h: new Date(v.jusqua + 3600_000).toISOString().slice(11, 16) })}</b> {t('Ouverture journalisée.')}
                </Banniere>
                <div className="card mt16">
                  <h2 className="card-t">{tf('{n} commande(s)', { n: v.commandes.length })}</h2>
                  <Table
                    cle={(c) => c.ref}
                    rows={v.commandes}
                    cols={[
                      { k: 'r', t: t('Commande'), main: true, rendu: (c) => <b>{c.ref}</b> },
                      { k: 'v', t: t('Vendeurs'), rendu: (c) => c.vendeurs },
                      { k: 'l', t: t('Relais'), rendu: (c) => c.relais ?? t('Domicile') },
                      { k: 't', t: t('Total'), rendu: (c) => fr(c.total) },
                      { k: 'e', t: t('État'), rendu: (c) => c.etat },
                    ]}
                  />
                </div>
                <div className="btns mt16">
                  <Link className="btn secondary" to={chemin('clients', { id })}>
                    {t('Revenir à la fiche du client')}
                  </Link>
                </div>
              </>
            )
          }
        </EtatLecture>
        <DecisionMotivee ouverte={ouvrir} fermer={() => setOuvrir(false)} titre={t('Voir comme le client')} resume={tf('Lecture seule, journalisée, {m} minutes au plus.', { m: PARAMETRES.console.demasqueMin })} libelle="Ouvrir" icone="eye" envoyer={async (m) => { const r = await source.equipe.ouvrirVueClient(id, m); return r.ok ? null : r }} />
      </Px>
    </Ecran>
  )
}
