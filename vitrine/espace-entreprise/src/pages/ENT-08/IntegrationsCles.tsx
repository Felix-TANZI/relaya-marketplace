// Page ajoutée à ENT-P26 (route('integrations-cles'), liée depuis Intégrations) : clés, rappels et journal des appels.
// L'environnement de test est ouvert dès maintenant ; la clé de production attend l'ouverture (integrations_actives).
// - Clés : masquées (aperçu « blv_test_••••••••3f9a ») ; « Afficher » montre la clé 30 s ; « Copier » la copie puis la
//   masque de nouveau ; « Régénérer » demande confirmation (feuille ?sheet=regenerer : l'ancienne cesse aussitôt).
// - Rappels : adresse https, événements choisis ; essai signé ; retrait montré fait, envoyé après 5 s sauf « Annuler ».
// - Journal des appels : recherche « / », puces Tous / Appels / Rappels / Erreurs (?q=, ?f=), zéro résultat, export
//   CSV ; « Appel de test » ; débit par minute (debit_par_cle) écrit avec le message clair quand il est atteint.
// Ajouts et retraits gardés hors connexion (geste) ; clés et essais demandent le réseau (secret, réponse attendue).
// Réservé au propriétaire (route roles ; Interdit écrit pour les autres rôles).
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Feuille, useFeuille } from '@client/composants/Feuille'
import { jouer } from '@client/composants/Sons'
import { Icone } from '../../composants/Icone'
import { Ecran } from '../../composants/coque'
import { AucunResultat, BarrePouce, Compte, correspond, exporterCsv, Exports, Hint, Interdit, Li, Limite, Note, Panel, Pill, Puces, Px, Recherche, St, Tete, useAnnuler, useLarge } from '../../composants/prototype'
import type { AppelApi, CleApi, EvenementRappel, RappelApi, RefusIntegrations } from '../../donnees/domaines/integrations'
import { geste } from '../../donnees/fileHorsLigne'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { useHorloge, usePeut } from '../../session'
import { Chargement, ErreurLecture, useAnnonce, useDates, useEnLigne } from '../ENT-07/commun'
import './ent08.css'

const EVENEMENTS: { id: EvenementRappel; t: string }[] = [
  { id: 'paquet_publie', t: 'Paquet publié' },
  { id: 'paquet_accepte', t: 'Paquet accepté' },
  { id: 'statut', t: 'Statut d’une mission' },
]
type Filtre = 'tous' | 'appels' | 'rappels' | 'erreurs'
const FILTRES: Filtre[] = ['tous', 'appels', 'rappels', 'erreurs']
const passe = (a: AppelApi, f: Filtre) => (f === 'appels' ? a.genre === 'appel' : f === 'rappels' ? a.genre === 'rappel' : f === 'erreurs' ? a.statut >= 400 : true)
const VUE_MS = 30_000

function useRefus() {
  const { t } = usePreferences()
  const R: Record<RefusIntegrations, string> = {
    fermee: t('La clé de production ouvrira après le lancement : utilisez l’environnement de test.'),
    existe: t('Elle existe déjà.'),
    introuvable: t('Introuvable : la page a été mise à jour.'),
    url: t('Adresse invalide : https:// et un nom de domaine.'),
    evenements: t('Choisissez au moins un événement.'),
    quota: t('Débit atteint : attendez la minute suivante.'),
    sans_cle: t('Créez d’abord la clé de test.'),
  }
  return (r: RefusIntegrations) => R[r]
}

export default function IntegrationsCles() {
  const { t, tf } = usePreferences()
  const large = useLarge()
  const proprio = usePeut(['proprietaire'])
  const lecture = useLecture(() => (proprio ? source.integrations.espace() : Promise.resolve(null)), [proprio])
  const etat = useLecture(() => (proprio ? source.integrations.etat() : Promise.resolve(null)), [proprio])
  const { annoncer, vue } = useAnnonce()
  const refus = useRefus()
  const enLigne = useEnLigne()
  const e = lecture.donnees
  const appelTest = async () => {
    const r = await source.integrations.appelDeTest('/v1/packages?zone=Z3')
    annoncer(r.ok, r.ok ? tf('Appel de test : réponse {s}.', { s: r.statut }) : refus(r.raison))
  }
  const acts = (
    <button type="button" className="btn primary sm" disabled={!enLigne || !e?.cles.some((c) => c.env === 'test')} onClick={() => void appelTest()}>
      <Icone nom="send" taille={16} />
      {t('Appel de test')}
    </button>
  )
  return (
    <Ecran route="integrations-cles" actions={large ? acts : undefined}>
      <Px>
        <Tete route="integrations-cles" titre={t('Clés, rappels et journal')} />
        {!proprio ? (
          <Panel titre={t('Clés, rappels et journal')} icone="lock">
            <Interdit roles={['proprietaire']} quoi="Clés d’API, rappels et journal des appels" />
          </Panel>
        ) : (
          <>
            <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />
            {vue}
            {!e || !etat.donnees ? (
              !lecture.erreur && <Chargement n={3} />
            ) : (
              <>
                <Limite
                  icone="gauge"
                  titre={tf('Débit : {n} / {max} appels cette minute', { n: e.quota.cetteMinute, max: e.quota.parMinute })}
                  texte={t('par clé ; au-delà, réponse 429 et appel journalisé')}
                  atteinte={e.quota.cetteMinute >= e.quota.parMinute ? t('Débit atteint : attendez la minute suivante.') : undefined}
                />
                <div className="g g2">
                  <Cles cles={e.cles} actives={etat.donnees.actives} annoncer={annoncer} />
                  <Rappels rappels={e.rappels} reessaisH={etat.donnees.reessaisH} annoncer={annoncer} />
                </div>
                <Journal journal={e.journal} />
                <Interdit roles={['proprietaire']} quoi="Clés d’API, rappels et journal des appels" />
              </>
            )}
            <BarrePouce>{acts}</BarrePouce>
          </>
        )}
      </Px>
    </Ecran>
  )
}

function Cles({ cles, actives, annoncer }: { cles: CleApi[]; actives: boolean; annoncer: (ok: boolean, t: string) => void }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  const refus = useRefus()
  const enLigne = useEnLigne()
  const [params, setParams] = useSearchParams()
  const feuille = useFeuille('regenerer')
  const ouvrirRegenerer = (id: string) => {
    const p = new URLSearchParams(params)
    p.set('sheet', 'regenerer')
    p.set('cle', id)
    setParams(p, { state: { feuille: true } })
  }
  const [montree, setMontree] = useState<{ id: string; valeur: string } | null>(null)
  // Une clé montrée se masque d'elle-même au bout de 30 s.
  useEffect(() => {
    if (!montree) return
    const m = window.setTimeout(() => setMontree(null), VUE_MS)
    return () => window.clearTimeout(m)
  }, [montree])
  const cible = cles.find((c) => c.id === params.get('cle')) ?? cles[0]
  const afficher = async (c: CleApi) => {
    if (montree?.id === c.id) return setMontree(null)
    const r = await source.integrations.revelerCle(c.id)
    if (!r.ok) return annoncer(false, refus(r.raison))
    setMontree({ id: c.id, valeur: r.valeur })
  }
  const copier = async (c: CleApi) => {
    const r = montree?.id === c.id ? { ok: true as const, valeur: montree.valeur } : await source.integrations.revelerCle(c.id)
    if (!r.ok) return annoncer(false, refus(r.raison))
    try {
      await navigator.clipboard.writeText(r.valeur)
      jouer('copie')
      setMontree(null)
      annoncer(true, t('Clé copiée, puis masquée de nouveau.'))
    } catch {
      setMontree({ id: c.id, valeur: r.valeur })
      annoncer(false, t('Copie refusée par le navigateur : la clé est affichée, sélectionnez-la.'))
    }
  }
  const creer = async (env: 'test' | 'production') => {
    const r = await source.integrations.creerCle(env)
    if (!r.ok) return annoncer(false, refus(r.raison))
    const nouvelle = (await source.integrations.espace()).cles.find((c) => c.env === env)
    if (nouvelle) setMontree({ id: nouvelle.id, valeur: r.valeur })
    annoncer(true, t('Clé créée : copiez-la maintenant, elle sera masquée.'))
  }
  const regenerer = async () => {
    if (!cible) return
    const r = await source.integrations.regenererCle(cible.id)
    feuille.fermer()
    if (!r.ok) return annoncer(false, refus(r.raison))
    setMontree({ id: cible.id, valeur: r.valeur })
    annoncer(true, t('Clé régénérée : l’ancienne ne marche plus.'))
  }
  const test = cles.find((c) => c.env === 'test')
  const prod = cles.find((c) => c.env === 'production')
  return (
    <Panel titre={t('Clés d’API')} icone="key-round">
      {cles.map((c) => (
        <div key={c.id} className="e8-cle" data-cle={c.env}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <Pill ton={c.env === 'test' ? 'amber' : 'acc'} sm>
              {t(c.env === 'test' ? 'Test' : 'Production')}
            </Pill>
            <span className="t12 c3">{c.derniereUtilisation ? tf('utilisée {q}', { q: d.quand(c.derniereUtilisation, maintenant) }) : t('jamais utilisée')}</span>
          </div>
          <code className="mono e8-cle-v no-tr" data-cle-valeur aria-live="polite">
            {montree?.id === c.id ? montree.valeur : c.apercu}
          </code>
          <div className="btns e8-cle-b">
            <button type="button" className="btn secondary sm" disabled={!enLigne} onClick={() => void afficher(c)} aria-pressed={montree?.id === c.id}>
              <Icone nom={montree?.id === c.id ? 'eye-off' : 'eye'} taille={16} />
              {t(montree?.id === c.id ? 'Masquer' : 'Afficher')}
            </button>
            <button type="button" className="btn secondary sm" disabled={!enLigne} onClick={() => void copier(c)}>
              <Icone nom="copy" taille={16} />
              {t('Copier')}
            </button>
            <button type="button" className="btn ghost sm" disabled={!enLigne} onClick={() => ouvrirRegenerer(c.id)}>
              <Icone nom="refresh-cw" taille={16} />
              {t('Régénérer')}
            </button>
          </div>
          <p className="t12 c3">{tf('Créée {q} · montrée {s} s au plus, jamais dans une liste', { q: d.quand(c.creeLe, maintenant), s: VUE_MS / 1000 })}</p>
        </div>
      ))}
      {!test && (
        <div className="btns ec-btns">
          <button type="button" className="btn primary" disabled={!enLigne} onClick={() => void creer('test')}>
            <Icone nom="flask-conical" taille={16} />
            {t('Créer la clé de test')}
          </button>
        </div>
      )}
      {!prod &&
        (actives ? (
          <div className="btns ec-btns">
            <button type="button" className="btn secondary" disabled={!enLigne} onClick={() => void creer('production')}>
              <Icone nom="key-round" taille={16} />
              {t('Créer la clé de production')}
            </button>
          </div>
        ) : (
          <Limite icone="lock" titre={t('Clé de production')} texte={t('ouvrira après le lancement ; tout se fait déjà dans le portail')} />
        ))}
      {!enLigne && <Hint icone="wifi-off">{t('Hors connexion : les clés se montrent et se régénèrent avec le réseau.')}</Hint>}
      <Note ton="ink" icone="shield-check">
        {t('Gardez la clé côté serveur, jamais dans une application ou une page publique. Chaque affichage, copie ou régénération est journalisé dans les paramètres.')}
      </Note>
      <Feuille ouverte={feuille.ouverte} fermer={feuille.fermer} titre={t('Régénérer la clé')}>
        <h2 className="card-t">{t('Régénérer la clé')}</h2>
        <p className="e7-note mt10">{t('Une nouvelle valeur remplace l’ancienne, qui cesse de marcher aussitôt : vos logiciels devront utiliser la nouvelle. Ce geste ne s’annule pas.')}</p>
        {cible && (
          <p className="mt10">
            <code className="mono no-tr">{cible.apercu}</code>
          </p>
        )}
        <div className="btns ec-btns mt16">
          <button type="button" className="btn danger" disabled={!enLigne} onClick={() => void regenerer()}>
            <Icone nom="refresh-cw" taille={16} />
            {t('Régénérer maintenant')}
          </button>
          <button type="button" className="btn secondary" onClick={feuille.fermer}>
            {t('Annuler')}
          </button>
        </div>
      </Feuille>
    </Panel>
  )
}

function Rappels({ rappels, reessaisH, annoncer }: { rappels: RappelApi[]; reessaisH: number; annoncer: (ok: boolean, t: string) => void }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  const refus = useRefus()
  const enLigne = useEnLigne()
  const annuler = useAnnuler()
  const [url, setUrl] = useState('')
  const [evs, setEvs] = useState<EvenementRappel[]>(['paquet_publie', 'statut'])
  const [erreur, setErreur] = useState<string | null>(null)
  const ajouter = async () => {
    const x = await geste('Ajouter un rappel', (s) => s.integrations.ajouterRappel(url, evs), url)
    if (x.etat === 'fait' && !x.r.ok) return setErreur(refus(x.r.raison))
    setErreur(null)
    setUrl('')
    annoncer(true, x.etat === 'en_file' ? t('Hors connexion : rappel gardé, envoyé au retour du réseau.') : t('Adresse de rappel ajoutée.'))
  }
  const essayer = async (id: string) => {
    const r = await source.integrations.essayerRappel(id)
    if (!r.ok) return annoncer(false, refus(r.raison))
    annoncer(r.statut < 300, r.statut < 300 ? tf('Essai reçu : réponse {s}.', { s: r.statut }) : tf('Essai en échec : réponse {s}. Vérifiez l’adresse.', { s: r.statut }))
  }
  return (
    <Panel titre={t('Rappels signés')} icone="webhook">
      {annuler.vue}
      {rappels.filter((r) => !annuler.enCours.has(r.id)).length === 0 && <p className="t13 c3">{t('Aucune adresse de rappel : ajoutez celle de votre logiciel.')}</p>}
      {rappels
        .filter((r) => !annuler.enCours.has(r.id))
        .map((r) => (
          <div key={r.id} className="e8-cle" data-rappel={r.id}>
            <code className="mono e8-cle-v no-tr">{r.url}</code>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {r.evenements.map((x) => (
                <Pill key={x} ton="ink" sm>
                  {t(EVENEMENTS.find((y) => y.id === x)?.t ?? x)}
                </Pill>
              ))}
              {r.dernierStatut !== null && <St t={tf('Réponse {s}', { s: r.dernierStatut })} ton={r.dernierStatut < 300 ? 'green' : 'red'} />}
              {!r.actif && <St t={t('Désactivé')} ton="ink" />}
            </div>
            <p className="t12 c3">{r.derniereTentative ? tf('dernier envoi {q}', { q: d.quand(r.derniereTentative, maintenant) }) : t('aucun envoi encore')}</p>
            <div className="btns e8-cle-b">
              <button type="button" className="btn secondary sm" disabled={!enLigne} onClick={() => void essayer(r.id)}>
                <Icone nom="send" taille={16} />
                {t('Envoyer un essai')}
              </button>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() =>
                  annuler.differer(r.id, t('Adresse de rappel retirée.'), async () => {
                    const x = await geste('Retirer un rappel', (s) => s.integrations.retirerRappel(r.id), r.url)
                    if (x.etat === 'fait' && !x.r.ok) annoncer(false, refus(x.r.raison))
                  })
                }
              >
                <Icone nom="trash-2" taille={16} />
                {t('Retirer')}
              </button>
            </div>
          </div>
        ))}
      <label className="champ">
        <span>{t('Adresse de votre logiciel (https)')}</span>
        <input type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" autoComplete="off" />
      </label>
      <div className="e8-zones" role="group" aria-label={t('Événements envoyés')}>
        {EVENEMENTS.map((x) => (
          <label key={x.id}>
            <input type="checkbox" checked={evs.includes(x.id)} onChange={(e) => setEvs(e.target.checked ? [...evs, x.id] : evs.filter((y) => y !== x.id))} />
            {t(x.t)}
          </label>
        ))}
      </div>
      {erreur && (
        <p className="note red mt10" role="alert">
          {erreur}
        </p>
      )}
      <div className="btns ec-btns mt10">
        <button type="button" className="btn primary" disabled={!url.trim()} onClick={() => void ajouter()}>
          <Icone nom="plus" taille={16} />
          {t('Ajouter l’adresse')}
        </button>
      </div>
      <Hint icone="repeat">{tf('Chaque rappel est signé et rejouable sans double effet ; en échec, il est retenté pendant {h} heures, puis désactivé.', { h: reessaisH })}</Hint>
    </Panel>
  )
}

function Journal({ journal }: { journal: AppelApi[] }) {
  const { t, tf } = usePreferences()
  const d = useDates()
  const maintenant = useHorloge()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const f = FILTRES.includes(params.get('f') as Filtre) ? (params.get('f') as Filtre) : 'tous'
  const regler = (k: 'q' | 'f', v: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        if (v && v !== 'tous') n.set(k, v)
        else n.delete(k)
        return n
      },
      { replace: true },
    )
  const lignes = journal.filter((a) => passe(a, f) && correspond(q, a.methode, a.chemin, a.statut))
  const n = (x: Filtre) => journal.filter((a) => passe(a, x)).length
  return (
    <Panel
      titre={t('Journal des appels')}
      icone="scroll-text"
      style={{ marginTop: 16 }}
      droite={<Exports csv={() => exporterCsv('journal-des-appels.csv', ['le', 'environnement', 'genre', 'methode', 'chemin', 'statut', 'duree_ms'], lignes.map((a) => [new Date(a.le).toISOString(), a.env, a.genre, a.methode, a.chemin, a.statut, a.dureeMs]))} desactive={!lignes.length} />}
    >
      <div className="e8-q"><Recherche q={q} setQ={(v) => regler('q', v)} placeholder={t('Chemin, statut (404, 429)…')} aria={t('Rechercher dans le journal des appels')} /></div>
      <Puces
        aria={t('Filtrer le journal')}
        actif={f}
        choisir={(v) => regler('f', v)}
        items={[
          { id: 'tous', t: 'Tous', n: n('tous') },
          { id: 'appels', t: 'Appels', n: n('appels') },
          { id: 'rappels', t: 'Rappels', n: n('rappels') },
          { id: 'erreurs', t: 'Erreurs', n: n('erreurs') },
        ]}
      />
      <Compte n={lignes.length} total={journal.length} />
      {lignes.length === 0 ? (
        journal.length ? (
          <AucunResultat effacer={() => setParams((p) => (p.delete('q'), p.delete('f'), p), { replace: true })} />
        ) : (
          <p className="t13 c3">{t('Aucun appel encore : lancez un appel de test.')}</p>
        )
      ) : (
        lignes.map((a) => (
          <Li
            key={a.id}
            icone={a.genre === 'rappel' ? 'webhook' : 'arrow-right-left'}
            ton={a.statut >= 400 ? 'red' : 'acc'}
            t={
              <span className="mono no-tr e8-mono">
                {a.methode} {a.chemin}
              </span>
            }
            s={`${d.quand(a.le, maintenant)} · ${a.dureeMs} ms · ${t(a.env === 'test' ? 'test' : 'production')}`}
            droite={<St t={String(a.statut)} ton={a.statut >= 400 ? 'red' : 'green'} />}
          />
        ))
      )}
      <Hint icone="info">{tf('{n} derniers appels et rappels de l’environnement de test, avec leurs tentatives.', { n: journal.length })}</Hint>
    </Panel>
  )
}
