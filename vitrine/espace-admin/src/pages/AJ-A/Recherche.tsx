// Rechercher partout (page ajoutée, S1 ; barre du haut, ⌘K, Menu) : commande, étiquette, paquet, litige, acteur
// (vendeur, relais, entreprise, livreur), dossier KYC, remboursement, ticket ; téléphone du client pour le Support et la
// Direction (le résultat reste masqué). Résultats selon le rôle et le périmètre, filtrés par la source ; pages de la
// console ouvertes au rôle ; un identifiant entier mène droit à sa fiche ; dernières recherches de l'appareil.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Perimetre } from '../../composants/Perimetre'
import { AucunResultat, Li, Note, Recherche as Champ, Sec } from '../../composants/prototype'
import { adresseDirecte, filtrer, indexDesPages, recentes, retenir } from '../../composants/recherche'
import { chemin } from '../../config/pages'
import type { ResultatRecherche } from '../../donnees/domaines/direct'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useRouteOuverte, useSession } from '../../session'

const GENRE: Record<ResultatRecherche['genre'], { t: string; i: string }> = {
  commande: { t: 'Commandes', i: 'shopping-bag' },
  etiquette: { t: 'Étiquettes', i: 'tag' },
  client: { t: 'Clients (téléphone)', i: 'phone' },
  paquet: { t: 'Paquets', i: 'boxes' },
  litige: { t: 'Litiges', i: 'scale' },
  vendeur: { t: 'Vendeurs', i: 'store' },
  relais: { t: 'Points relais', i: 'package-check' },
  entreprise: { t: 'Entreprises de livraison', i: 'truck' },
  livreur: { t: 'Livreurs', i: 'bike' },
  kyc: { t: 'Vérifications d’identité', i: 'id-card' },
  remboursement: { t: 'Remboursements', i: 'undo-2' },
  ticket: { t: 'Support', i: 'life-buoy' },
}

export default function Recherche() {
  const { t, tf } = usePreferences()
  const s = useSession()
  const ouverte = useRouteOuverte()
  const naviguer = useNavigate()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [recents, setRecents] = useState<string[]>(() => recentes())
  const resultats = useLecture(() => (q.trim().length >= 2 ? source.direct.chercher(q) : Promise.resolve([])), [q, s.role, s.agent?.id])
  const pages = useMemo(() => (q.trim() ? filtrer(indexDesPages(ouverte, t), q, 6) : []), [q, ouverte, t])
  const direct = adresseDirecte(q, ouverte)
  useEffect(() => {
    if (q.trim().length < 2) return
    const x = setTimeout(() => (retenir(q), setRecents(recentes())), 800)
    return () => clearTimeout(x)
  }, [q])
  const poser = (v: string) => setParams(v ? { q: v } : {}, { replace: true })
  const groupes = (Object.keys(GENRE) as ResultatRecherche['genre'][]).map((g) => ({ g, l: (resultats.donnees ?? []).filter((r) => r.genre === g) })).filter((x) => x.l.length)
  const rien = q.trim().length >= 2 && resultats.donnees !== null && !groupes.length && !pages.length
  return (
    <Ecran route="recherche">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (direct) naviguer(direct)
        }}
      >
        <Champ q={q} setQ={poser} placeholder={t('Commande, étiquette, paquet, acteur…')} aria={t('Rechercher partout')} />
      </form>
      <Perimetre route="recherche" />
      {direct && (
        <div className="card tight mt10">
          <Li icone="arrow-up-right" ton="acc" t={tf('Ouvrir {id}', { id: q.trim().toUpperCase() })} s={t('Identifiant reconnu : fiche directe')} to={direct} />
        </div>
      )}
      {resultats.erreur && (
        <Note ton="red" icone="circle-alert" className="mt10" role="alert">
          {t('La recherche n’a pas pu aboutir.')}{' '}
          <button type="button" className="btn sm secondary" onClick={resultats.relire}>
            {t('Réessayer')}
          </button>
        </Note>
      )}
      {!q.trim() && (
        <>
          {recents.length > 0 && (
            <>
              <Sec t={t('Dernières recherches')} />
              <div className="chips">
                {recents.map((r) => (
                  <button key={r} type="button" className="chip" onClick={() => poser(r)}>
                    <Icone nom="history" taille={15} />
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}
          <Note ton="ink" icone="info" className="mt14">
            {t('Exemples : BLV-52107, BV 24 8137, PQ-Z1-261013-003, Tonton PG, Relais Bastos, Yafé Express. Le téléphone d’un client se cherche par le Support et la Direction ; le résultat reste masqué.')}
          </Note>
        </>
      )}
      {q.trim().length === 1 && <p className="t13 c3 mt10">{t('Deux caractères au moins.')}</p>}
      {groupes.map(({ g, l }) => (
        <section key={g} aria-label={t(GENRE[g].t)}>
          <div className="divider-t">{`${t(GENRE[g].t)} · ${l.length}`}</div>
          <div className="card tight">
            {l.map((r) => (
              <Li key={r.genre + r.id} icone={GENRE[g].i} ton="acc" t={r.titre} s={r.sous} to={ouverte(r.route) ? chemin(r.route, r.params) : undefined} />
            ))}
          </div>
        </section>
      ))}
      {pages.length > 0 && (
        <section aria-label={t('Pages de la console')}>
          <div className="divider-t">{t('Pages de la console')}</div>
          <div className="card tight">
            {pages.map((p) => (
              <Li key={p.id} icone={p.icone} ton="acc" t={p.titre} s={p.sous} to={p.vers} />
            ))}
          </div>
        </section>
      )}
      {rien && <AucunResultat effacer={() => poser('')} texte={t('Rien dans votre périmètre ne correspond. Un dossier d’un autre rôle n’apparaît jamais ici.')} />}
    </Ecran>
  )
}
