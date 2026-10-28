// Publicité (AJ-P, DP-59) : tableau de bord (solde publicitaire, dépenses du jour et des 7 jours, impressions, clics,
// ventes générées, coût par vente) et « Mes campagnes » (en cours / programmées / terminées) : statistiques par
// campagne, pause et reprise, enchère et budget du jour (sponsorisé), arrêt (heures non diffusées remboursées),
// retrait d'une candidature à une vente flash. Garde-fous visibles. Réservé au propriétaire (argent.voir).
// Adresse : ?o=en_cours|programmees|terminees ; ?c=<campagne> ouvre ses statistiques.
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { jouer } from '@client/composants/Sons'
import { F } from '@client/i18n/format'
import { Vignette } from '../../composants/Dessin'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { PRODUIT_DE, type Campagne, type ReglesPub } from '../../donnees/domaines/publicite'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { AnnonceRefusee, coutParVente, PARAMETRES_PUBLICITE, tauxDeClicPourMille, verifierEnchereClic } from '../../calculs/publicite'
import { echeance } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { ApercuClient, Bouton, Chargement, EcranAJP, Erreur, Feuille, GardeFous, ICONE_EMPLACEMENT, NOM_EMPLACEMENT, PastilleEtat, Selecteur, texteMotif, texteRefus, useCompteur, useEnLigne, useF, useToast } from './commun'

const ROUTE = 'publicite'
type Onglet = 'en_cours' | 'programmees' | 'terminees'
const ONGLET_DE = (c: Campagne): Onglet => (c.etat === 'en_cours' || c.etat === 'en_pause' ? 'en_cours' : c.etat === 'programmee' || c.etat === 'candidature' ? 'programmees' : 'terminees')
const nombre = (n: number) => F(Math.round(n))
const taux = (clics: number, vues: number) => { const m = tauxDeClicPourMille(clics, vues); return `${Math.floor(m / 10)},${m % 10}` }

function Tuile({ k, v, s }: { k: string; v: string; s?: string }) {
  return (
    <div className="ajp-tuile">
      <div className="tk">{k}</div>
      <div className="tv">{v}</div>
      {s && <div className="ts">{s}</div>}
    </div>
  )
}

function CarteCampagne({ c, maintenant, ouvrir, pause, reprendre, arreter, enchere }: { c: Campagne; maintenant: number; ouvrir: () => void; pause: () => void; reprendre: () => void; arreter: () => void; enchere: () => void }) {
  const { t, tf, langue } = usePreferences()
  const f = useF()
  const sponsorise = PRODUIT_DE[c.emplacement] === 'sponsorise'
  const active = c.etat !== 'terminee' && c.etat !== 'refusee'
  const quand =
    c.etat === 'programmee' || c.etat === 'candidature'
      ? tf('commence {quand}', { quand: echeance(c.debut, maintenant, langue) })
      : c.etat === 'terminee' || c.etat === 'refusee'
        ? tf('terminée {quand}', { quand: echeance(c.fin ?? c.debut, maintenant, langue) })
        : c.fin
          ? tf('jusqu’à {quand}', { quand: echeance(c.fin, maintenant, langue) })
          : tf('depuis {quand}', { quand: echeance(c.debut, maintenant, langue) })
  const ligne = sponsorise
    ? c.coutClic === null
      ? tf('Enchère {e} F : trop basse pour une place sur la page', { e: F(c.enchere ?? 0) })
      : tf('{c} F le clic (enchère {e} F) · budget {b} F par jour', { c: F(c.coutClic), e: F(c.enchere ?? 0), b: F(c.budgetJour ?? 0) })
    : c.emplacement === 'flash'
      ? tf('−{r} % · {p} F · vous gardez {g} F par vente', { r: c.remisePourCent ?? 0, p: F(c.prixPromo ?? 0), g: F(c.gardeFlash ?? 0) })
      : c.mode === 'enchere' && c.forfait === null
        ? tf('Enchère {e} F la semaine · payée seulement si elle gagne', { e: F(c.enchere ?? 0) })
        : tf('{p} F payés · {h} h diffusées sur {n} h', { p: F(c.forfait ?? 0), h: c.heuresDiffusees ?? 0, n: c.heuresPrevues ?? 0 })
  return (
    <div className="card ajp-camp ajp-entree" data-campagne={c.id}>
      <div className="otop">
        <span className="ajp-type">
          <Icone nom={ICONE_EMPLACEMENT[c.emplacement]} taille={14} />
          {t(NOM_EMPLACEMENT[c.emplacement])}
        </span>
        <span className="grow"></span>
        <PastilleEtat e={c.etat} enchere={c.mode === 'enchere'} />
      </div>
      <div className="ajp-prod">
        <Vignette nom={c.dessin} taille={44} />
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="t14 b8 ajp-ell">{`${c.titre} · ${t(c.variante)}`}</div>
          <div className="t12 c3 mt4">{ligne}</div>
          <div className="t12 c3">{quand}</div>
        </div>
      </div>
      {texteMotif(c.motif) && (
        <div className={'note ' + (c.etat === 'en_pause' ? 'amber' : 'or') + ' ajp-motif'}>
          <Icone nom={c.etat === 'en_pause' ? 'circle-pause' : 'info'} taille={16} />
          <div>{t(texteMotif(c.motif)!)}</div>
        </div>
      )}
      {c.etat !== 'candidature' && c.etat !== 'programmee' && (
        <div className="ajp-chiffres">
          <div>
            <b>{nombre(c.stats.impressions)}</b>
            <span>{t('vues')}</span>
          </div>
          <div>
            <b>{nombre(c.stats.clics)}</b>
            <span>{t('clics')}</span>
          </div>
          <div>
            <b>{String(c.stats.ventes)}</b>
            <span>{t('ventes')}</span>
          </div>
          <div>
            <b>{f(c.stats.depense)}</b>
            <span>{t(c.emplacement === 'flash' ? 'commission en plus' : 'dépensé')}</span>
          </div>
        </div>
      )}
      <div className="ajp-gestes">
        <button type="button" className="chip" onClick={ouvrir}>
          <Icone nom="chart-column" taille={15} />
          {t('Statistiques')}
        </button>
        {sponsorise && c.etat === 'en_cours' && (
          <button type="button" className="chip" onClick={pause}>
            <Icone nom="circle-pause" taille={15} />
            {t('Mettre en pause')}
          </button>
        )}
        {sponsorise && c.etat === 'en_pause' && (
          <button type="button" className="chip" onClick={reprendre}>
            <Icone nom="refresh-cw" taille={15} />
            {t('Reprendre')}
          </button>
        )}
        {sponsorise && active && (
          <button type="button" className="chip" onClick={enchere}>
            <Icone nom="pencil" taille={15} />
            {t('Modifier l’enchère')}
          </button>
        )}
        {active && (
          <button type="button" className="chip" onClick={arreter}>
            <Icone nom="x" taille={15} />
            {t(c.etat === 'candidature' ? 'Retirer' : c.etat === 'programmee' ? 'Annuler' : 'Arrêter')}
          </button>
        )}
      </div>
    </div>
  )
}

function FeuilleStats({ c, regles, fermer }: { c: Campagne; regles: ReglesPub; fermer: () => void }) {
  const { t, tf } = usePreferences()
  const f = useF()
  const cpv = coutParVente(c.stats.depense, c.stats.ventes)
  return (
    <Feuille ouverte fermer={fermer} titre={t('Statistiques de la campagne')}>
      <h2 className="pg-t" style={{ fontSize: '19px' }}>
        {`${c.titre} · ${t(c.variante)}`}
      </h2>
      <p className="pg-s">{t(NOM_EMPLACEMENT[c.emplacement])}</p>
      <div className="ajp-tuiles">
        <Tuile k={t('Vues')} v={nombre(c.stats.impressions)} />
        <Tuile k={t('Clics')} v={nombre(c.stats.clics)} s={tf('{p} % des vues', { p: taux(c.stats.clics, c.stats.impressions) })} />
        <Tuile k={t('Ventes générées')} v={String(c.stats.ventes)} />
        <Tuile k={t(c.emplacement === 'flash' ? 'Commission en plus' : 'Dépensé')} v={f(c.stats.depense)} />
        <Tuile k={t('Coût par vente')} v={cpv === null ? '—' : f(cpv)} />
        {PRODUIT_DE[c.emplacement] === 'sponsorise' ? <Tuile k={t('Clics non facturés')} v={nombre(c.stats.clicsNonFactures)} s={t('doublons du jour, budget atteint')} /> : <Tuile k={t('Remboursé')} v={f(c.stats.rembourse)} s={t('heures non diffusées')} />}
      </div>
      {PRODUIT_DE[c.emplacement] === 'sponsorise' && c.depenseJour !== null && (
        <div className="kv mt12">
          <span className="k">{t('Aujourd’hui')}</span>
          <span className="v">{tf('{d} F sur {b} F', { d: F(c.depenseJour), b: F(c.budgetJour ?? 0) })}</span>
        </div>
      )}
      {c.heuresPrevues !== null && (
        <div className="kv mt12">
          <span className="k">{t('Heures diffusées')}</span>
          <span className="v">{tf('{h} h sur {n} h', { h: c.heuresDiffusees ?? 0, n: c.heuresPrevues })}</span>
        </div>
      )}
      {c.emplacement === 'flash' && (
        <div className="kv mt12">
          <span className="k">{t('Vous gardez par vente')}</span>
          <span className="v cg">{tf('{g} F au lieu de {a} F', { g: F(c.gardeFlash ?? 0), a: F(c.gardeAvant ?? 0) })}</span>
        </div>
      )}
      <div className="divider-t">{t('Ce que voit le client')}</div>
      <ApercuClient c={c} apercu={[]} regles={regles} />
      <div className="mt14">
        <Bouton classe="secondary" onClick={fermer}>
          {t('Fermer')}
        </Bouton>
      </div>
    </Feuille>
  )
}

function FeuilleEnchere({ c, regles, fermer, fait }: { c: Campagne; regles: ReglesPub; fermer: () => void; fait: (m: string) => void }) {
  const { t, tf } = usePreferences()
  const [e, setE] = useState(String(c.enchere ?? regles.clicPlancher))
  const [b, setB] = useState(String(c.budgetJour ?? regles.budgetJourMin))
  const [envoi, setEnvoi] = useState(false)
  const en = Number(e)
  const bu = Number(b)
  const refus = (() => {
    try {
      verifierEnchereClic(en, bu, PARAMETRES_PUBLICITE)
      return null
    } catch (e) {
      if (e instanceof AnnonceRefusee) return en < regles.clicPlancher ? ('sous_plancher' as const) : ('budget_min' as const)
      throw e
    }
  })()
  const max = refus ? 0 : Math.floor(bu / en)
  return (
    <Feuille ouverte fermer={fermer} titre={t('Modifier l’enchère')}>
      <h2 className="pg-t" style={{ fontSize: '19px' }}>
        {t('Enchère et budget du jour')}
      </h2>
      <p className="pg-s">{tf('Vous payez chaque clic réel, {p} F au moins ; jamais plus que le budget du jour.', { p: F(regles.clicPlancher) })}</p>
      <div className="aja-ligne-ch">
        <div className="fld">
          <label htmlFor="ajp-enchere">{t('Prix par clic (F)')}</label>
          <div className={'inp' + (refus === 'sous_plancher' ? ' err' : '')}>
            <input id="ajp-enchere" inputMode="numeric" value={e} onChange={(x) => setE(x.target.value.replace(/\D/g, '').slice(0, 6))} className="ajp-champ" />
          </div>
        </div>
        <div className="fld">
          <label htmlFor="ajp-budget">{t('Budget par jour (F)')}</label>
          <div className={'inp' + (refus && refus !== 'sous_plancher' ? ' err' : '')}>
            <input id="ajp-budget" inputMode="numeric" value={b} onChange={(x) => setB(x.target.value.replace(/\D/g, '').slice(0, 7))} className="ajp-champ" />
          </div>
        </div>
      </div>
      {refus ? (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={16} />
          <div>{texteRefus(refus, regles, tf)}</div>
        </div>
      ) : (
        <div className="t13 c2">{tf('Au moins {n} clics payés par jour : chaque clic coûte au plus votre enchère (second prix + 1 F).', { n: max })}</div>
      )}
      <div className="split2 mt14">
        <Bouton classe="secondary" onClick={fermer}>
          {t('Annuler')}
        </Bouton>
        <Bouton
          classe="primary"
          icone="check"
          inactif={!!refus || envoi}
          onClick={async () => {
            setEnvoi(true)
            const r = await source.publicite.enchere(c.id, en, bu)
            setEnvoi(false)
            if (r.ok) {
              jouer('interrupteur')
              fait(t('Enchère enregistrée'))
            } else jouer('erreur')
          }}
        >
          {t('Enregistrer')}
        </Bouton>
      </div>
    </Feuille>
  )
}

export default function Publicite() {
  const { t, tf } = usePreferences()
  const f = useF()
  const maintenant = useHorloge()
  const enLigne = useEnLigne()
  const [params, setParams] = useSearchParams()
  const { dire, toast } = useToast()
  const lecture = useLecture(() => Promise.all([source.publicite.tableau(), source.publicite.campagnes()]), [])
  const onglet = (['en_cours', 'programmees', 'terminees'].includes(params.get('o') ?? '') ? params.get('o') : 'en_cours') as Onglet
  const [arret, setArret] = useState<Campagne | null>(null)
  const [enchere, setEnchere] = useState<Campagne | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const solde = useCompteur(lecture.donnees?.[0].solde ?? 0)
  const groupes = useMemo(() => {
    const l = lecture.donnees?.[1] ?? []
    return { en_cours: l.filter((c) => ONGLET_DE(c) === 'en_cours'), programmees: l.filter((c) => ONGLET_DE(c) === 'programmees'), terminees: l.filter((c) => ONGLET_DE(c) === 'terminees') }
  }, [lecture.donnees])
  if (lecture.erreur) return <Erreur route={ROUTE} erreur={lecture.erreur} relire={lecture.relire} />
  if (!lecture.donnees) return <Chargement route={ROUTE} />
  const [tb, campagnes] = lecture.donnees
  const regles = tb.regles
  const stats = campagnes.find((c) => c.id === params.get('c')) ?? null
  const changer = (o: Record<string, string | null>) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(o)) if (v === null) p.delete(k)
    else p.set(k, v)
    setParams(p, { replace: true })
  }
  const geste = async (r: Promise<{ ok: boolean; raison?: string }>, ok: string) => {
    setErreur(null)
    const x = await r
    if (x.ok) {
      jouer('interrupteur')
      dire(ok)
    } else {
      jouer('erreur')
      setErreur(x.raison ? texteRefus(x.raison as never, regles, tf) : t('Ce geste n’a pas abouti.'))
    }
  }
  const visibles = groupes[onglet]
  return (
    <EcranAJP route={ROUTE} fixes={toast}>
      <div className="pg" style={{ paddingTop: '14px' }}>
        <h1 className="pg-t">{t('Publicité')}</h1>
      </div>

      <div className="ajp-solde">
        <div className="k">{t('Solde publicitaire')}</div>
        <div className="v" data-solde={tb.solde}>
          {f(Math.round(solde))}
        </div>
        <div className="s">{t('Prépayé par Mobile Money. Jamais retenu sur vos versements.')}</div>
        <div className="ajp-act">
          <Bouton classe="primary" icone="smartphone" vers={chemin('publicite_solde', { recharger: 1 })}>
            {t('Recharger')}
          </Bouton>
          <Bouton classe="secondary" icone="file-text" vers={chemin('publicite_solde')}>
            {t('Historique et factures')}
          </Bouton>
        </div>
      </div>

      <div className="ajp-tuiles">
        <Tuile k={t('Dépensé aujourd’hui')} v={f(tb.depensesJour)} />
        <Tuile k={t('Dépensé sur 7 jours')} v={f(tb.depensesSemaine)} />
        <Tuile k={t('Vues')} v={nombre(tb.semaine.impressions)} s={t('7 derniers jours')} />
        <Tuile k={t('Clics')} v={nombre(tb.semaine.clics)} s={tf('{p} % des vues', { p: taux(tb.semaine.clics, tb.semaine.impressions) })} />
        <Tuile k={t('Ventes générées')} v={String(tb.semaine.ventes)} s={t('7 derniers jours')} />
        <Tuile k={t('Coût par vente')} v={tb.coutParVente === null ? '—' : f(tb.coutParVente)} />
      </div>

      <div className="mt14">
        <Bouton classe="primary" icone="megaphone" vers={chemin('publicite_nouvelle')} inactif={!enLigne}>
          {t('Créer une campagne')}
        </Bouton>
      </div>

      {erreur && (
        <div className="note red" role="alert">
          <Icone nom="circle-alert" taille={16} />
          <div>{erreur}</div>
        </div>
      )}

      <Selecteur
        etiquette="Mes campagnes"
        valeur={onglet}
        changer={(o) => changer({ o })}
        choix={[
          ['en_cours', 'En cours', groupes.en_cours.length],
          ['programmees', 'Programmées', groupes.programmees.length],
          ['terminees', 'Terminées', groupes.terminees.length],
        ]}
      />
      {visibles.length === 0 ? (
        <div className="card" style={{ marginTop: '12px' }}>
          <div className="empty">
            <div className="ei">
              <Icone nom="megaphone" taille={24} />
            </div>
            <h3>{t(onglet === 'en_cours' ? 'Aucune campagne en cours' : onglet === 'programmees' ? 'Aucune campagne programmée' : 'Aucune campagne terminée')}</h3>
            <p>{t('Une campagne se crée en trois gestes : le produit, l’emplacement, la confirmation.')}</p>
          </div>
        </div>
      ) : (
        <div className="aja-liste deux">
          {visibles.map((c) => (
            <CarteCampagne
              key={c.id}
              c={c}
              maintenant={maintenant}
              ouvrir={() => changer({ c: c.id })}
              pause={() => void geste(source.publicite.pause(c.id), t('Campagne en pause : plus aucun clic payé'))}
              reprendre={() => void geste(source.publicite.reprendre(c.id), t('Campagne reprise'))}
              arreter={() => setArret(c)}
              enchere={() => setEnchere(c)}
            />
          ))}
        </div>
      )}

      <div className="ajp-deux">
        <GardeFous regles={regles} />
        <div className="card">
          <h3 className="b8 t15" style={{ margin: 0 }}>
            {t('Les quatre façons de se faire voir')}
          </h3>
          <div className="kv mt8">
            <span className="k">{t('Sponsorisé recherche et catégories')}</span>
            <span className="v">{tf('dès {p} F le clic', { p: F(regles.clicPlancher) })}</span>
          </div>
          <div className="kv">
            <span className="k">{t('À la une')}</span>
            <span className="v">{tf('{p} F la semaine', { p: F(regles.uneSemaine) })}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Carrousel de l’accueil')}</span>
            <span className="v">{tf('{p} F la semaine', { p: F(regles.carrouselSemaine) })}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Boost')}</span>
            <span className="v">{tf('{a} F 24 h · {b} F 7 jours', { a: F(regles.boost24h), b: F(regles.boost7j) })}</span>
          </div>
          <div className="kv">
            <span className="k">{t('Vente flash sur sélection')}</span>
            <span className="v">{tf('+{p} points de commission', { p: regles.flashMajorationPoints })}</span>
          </div>
          <p className="t12 c3 mt8" style={{ lineHeight: 1.45 }}>
            {t('Gratuit et au mérite : la vitrine de quartier et les ventes flash offertes restent dans « Se faire voir ».')}
          </p>
        </div>
      </div>

      {stats && <FeuilleStats c={stats} regles={regles} fermer={() => changer({ c: null })} />}
      {enchere && (
        <FeuilleEnchere
          c={enchere}
          regles={regles}
          fermer={() => setEnchere(null)}
          fait={(m) => {
            setEnchere(null)
            dire(m)
          }}
        />
      )}
      <Feuille ouverte={!!arret} fermer={() => setArret(null)} titre={t('Arrêter la campagne')}>
        {arret && (
          <>
            <h2 className="pg-t" style={{ fontSize: '19px' }}>
              {t(arret.etat === 'candidature' ? (arret.mode === 'enchere' ? 'Retirer l’enchère ?' : 'Retirer la candidature ?') : arret.etat === 'programmee' ? 'Annuler la campagne ?' : 'Arrêter la campagne ?')}
            </h2>
            <p className="pg-s">
              {arret.mode === 'enchere' && arret.forfait === null
                ? t('Rien n’est pris : l’enchère est retirée avant l’attribution.')
                : arret.forfait !== null
                ? tf('Les heures non diffusées vous sont remboursées sur le solde publicitaire : {h} h sur {n}.', { h: (arret.heuresPrevues ?? 0) - (arret.heuresDiffusees ?? 0), n: arret.heuresPrevues ?? 0 })
                : arret.emplacement === 'flash'
                  ? t('Rien n’est facturé : la commission majorée ne s’applique qu’aux ventes faites pendant la vente flash.')
                  : t('Plus aucun clic ne sera payé. Les clics d’aujourd’hui déjà reçus restent dus.')}
            </p>
            <div className="split2 mt14">
              <Bouton classe="secondary" onClick={() => setArret(null)}>
                {t('Garder')}
              </Bouton>
              <Bouton
                classe="danger"
                icone="x"
                onClick={async () => {
                  const c = arret
                  setArret(null)
                  const r = await source.publicite.arreter(c.id)
                  if (r.ok) {
                    jouer('interrupteur')
                    dire(r.rembourse > 0 ? tf('Campagne arrêtée : {m} F remboursés sur votre solde', { m: F(r.rembourse) }) : t('Campagne arrêtée'))
                    changer({ o: 'terminees' })
                  } else jouer('erreur')
                }}
              >
                {t(arret.etat === 'candidature' ? 'Retirer' : arret.etat === 'programmee' ? 'Annuler la campagne' : 'Arrêter')}
              </Bouton>
            </div>
          </>
        )}
      </Feuille>
    </EcranAJP>
  )
}
