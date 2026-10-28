// PR-06 · page ajoutée « Inventaire des étagères » (pointage) : le gérant passe case par case et pointe chaque colis
// trouvé (toucher ou scan de l'étiquette) ; un colis trouvé dans une autre case est corrigé au journal ; à la clôture
// (PIN), les colis non pointés sont signalés manquants à BelivaY (console : « colis manquants au relais »). Sert à
// vérifier que le plan des étagères dit vrai (CAL-22, FIC-02) et à prouver la garde (PR-CT03 : responsabilité de qui
// devait produire la preuve). Retours déposés compris (ils sont au relais, hors places).
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Feuille } from '@client/composants/Feuille'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { ETAGERES_PERMISES } from '../../calculs/capacite'
import { PARAMETRES } from '../../calculs/registre'
import { chemin } from '../../config/pages'
import type { ClasseColis } from '../../donnees/communs'
import type { Inventaire as Inv, RefusStock } from '../../donnees/domaines/stock'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { Annonce, CLASSE, ChampPin, Chargement, ErreurLecture, dateHeure, useAgir, useAnnonce } from './commun'

const REFUS: Record<RefusStock, string> = {
  introuvable: 'Étiquette inconnue du relais.',
  case_pleine: 'Case pleine.',
  etagere_interdite: 'Cette étagère ne convient pas à la taille du colis.',
  pas_au_relais: 'Ce colis n’est plus au relais (remis ou parti).',
  deja_pointe: 'Déjà pointé.',
  aucun_inventaire: 'Aucun inventaire en cours.',
  inventaire_en_cours: 'Un inventaire est déjà en cours.',
  pin_requis: 'PIN incorrect. Réessayez.',
}

function Ailleurs({ colis, ouverte, fermer, choisir }: { colis: { id: string; classe: ClasseColis; emplacement: string | null } | null; ouverte: boolean; fermer: () => void; choisir: (c: string) => void }) {
  const { t, tf } = usePreferences()
  const plan = useLecture(() => source.stock.plan(), []).donnees ?? []
  const premier = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (ouverte) requestAnimationFrame(() => premier.current?.focus())
  }, [ouverte])
  const cases = colis ? plan.filter((k) => ETAGERES_PERMISES[colis.classe].includes(k.etagere) && k.code !== colis.emplacement) : []
  return (
    <Feuille ouverte={ouverte && !!colis} fermer={fermer} titre={t('Trouvé dans une autre case')}>
      <div className="r6-feuille">
        <h2>{tf('Où est {ref} ?', { ref: colis?.id ?? '' })}</h2>
        <p>{tf('Prévu en {c}. Touchez la case où il est : l’emplacement est corrigé et noté au journal.', { c: colis?.emplacement ?? '—' })}</p>
        <div className="r6-choix" role="group" aria-label={t('Cases')}>
          {cases.map((k, i) => (
            <button key={k.code} ref={i === 0 ? premier : undefined} type="button" onClick={() => choisir(k.code)}>
              <Icone nom="r-lieu" taille={20} />
              <span className="r-ref">{k.code}</span>
              <span>{tf('{n}/{total} places', { n: k.occupee, total: k.capacite })}</span>
            </button>
          ))}
        </div>
      </div>
    </Feuille>
  )
}

function Terminer({ inv, ouverte, fermer, fait }: { inv: Inv; ouverte: boolean; fermer: () => void; fait: () => void }) {
  const { t, tf } = usePreferences()
  const { agir, occupe } = useAgir()
  const [pin, setPin] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const longueur = PARAMETRES.connexion.pinLongueur
  const reste = inv.attendus.length - inv.pointes.length
  const terminer = async () => {
    if (pin.length !== longueur) return
    const r = await agir('controle', inv.id, (o, s) => s.stock.terminerInventaire(pin, o))
    if (!r) return
    if (r.r.ok) {
      signal(r.r.bilan.manquants.length ? 'alerte' : 'succes')
      setPin('')
      fait()
    } else {
      signal('erreur')
      setPin('')
      setErreur(REFUS[r.r.raison])
    }
  }
  return (
    <Feuille ouverte={ouverte} fermer={fermer} titre={t('Terminer l’inventaire')}>
      <div className="r6-feuille">
        <h2>{t('Terminer l’inventaire')}</h2>
        <p>
          {reste > 0
            ? tf('{n} colis ne sont pas pointés : ils seront signalés manquants à BelivaY, qui vous contactera. Cherchez-les encore avant de terminer.', { n: reste })
            : t('Tous les colis sont pointés : le plan des étagères est à jour.')}
        </p>
        <ChampPin id="r6-pin-inv" longueur={longueur} valeur={pin} changer={setPin} erreur={erreur} valider={() => void terminer()} />
        <button type="button" className={'r-btn ' + (reste > 0 ? 'r-alerte' : 'r-principal')} disabled={pin.length !== longueur || occupe} onClick={() => void terminer()}>
          <Icone nom="check" taille={20} />
          <span>{reste > 0 ? tf('Terminer et signaler {n} manquants', { n: reste }) : t('Terminer l’inventaire')}</span>
        </button>
      </div>
    </Feuille>
  )
}

export default function Inventaire() {
  const { t, tf, langue } = usePreferences()
  const lecture = useLecture(() => source.stock.inventaire().then((inv) => ({ inv })), [])
  const { agir, occupe } = useAgir()
  const { avis, annoncer } = useAnnonce()
  const [scan, setScan] = useState('')
  const [feuille, setFeuille] = useState<'ailleurs' | 'terminer' | null>(null)
  const [cible, setCible] = useState<string | null>(null)
  const inv = lecture.donnees?.inv ?? null

  const commencer = async () => {
    const r = await agir('controle', 'inventaire', (o, s) => s.stock.commencerInventaire(o))
    if (!r) return
    signal(r.r.ok ? 'succes' : 'erreur')
    if (!r.r.ok) annoncer({ ton: 'erreur', texte: t(REFUS[r.r.raison]) })
    lecture.relire()
  }
  const pointer = async (id: string, trouveEn: string | null) => {
    const r = await agir('controle', id, (o, s) => s.stock.pointer(id, trouveEn, o))
    if (!r) return
    if (r.r.ok) {
      signal('succes')
      if (r.etat === 'en_file') annoncer({ ton: 'file', texte: t('Enregistré sur le téléphone : envoi au retour du réseau.') })
      else if (r.r.ecart === 'deplace') annoncer({ ton: 'ok', texte: tf('{ref} pointé en {c} : emplacement corrigé.', { ref: id, c: trouveEn ?? '' }) })
    } else {
      signal('erreur')
      annoncer({ ton: 'erreur', texte: t(REFUS[r.r.raison]) })
    }
    lecture.relire()
  }
  const scanner = () => {
    if (!inv) return
    const q = scan.trim().toUpperCase().replace(/\s+/g, '')
    setScan('')
    if (!q) return
    const a = inv.attendus.find((x) => x.id === q)
    if (!a) {
      signal('erreur')
      annoncer({ ton: 'erreur', texte: tf('{ref} n’est pas attendu sur vos étagères : mettez-le de côté et écrivez au support.', { ref: q }) })
      return
    }
    void pointer(a.id, null)
  }

  const contenu = () => {
    if (lecture.erreur) return <ErreurLecture erreur={lecture.erreur} relire={lecture.relire} />
    if (!lecture.donnees) return <Chargement lignes={5} titre="Chargement de l’inventaire…" />
    if (!inv || inv.termineA) {
      return (
        <>
          <div>
            <h1 className="p-bvhkrl">{t('Inventaire des étagères')}</h1>
            <div className="p-t2u0o2">{t('Vérifiez que chaque colis est bien à sa place, case par case.')}</div>
          </div>
          {inv?.bilan && (
            <div className="p-yi6rkz" role="status">
              <div className="p-unncbq">
                <h2 className="p-9j1bbu">{tf('Dernier inventaire · {d}', { d: dateHeure(inv.termineA!, langue) })}</h2>
              </div>
              <div className="p-mqmvkk">
                <span className="p-ytl255">{t('Colis pointés')}</span>
                <span className="p-2vq92h">{inv.bilan.pointes}</span>
              </div>
              <div className="p-mqmvkk">
                <span className="p-ytl255">{t('Emplacements corrigés')}</span>
                <span className="p-2vq92h">{inv.bilan.deplaces}</span>
              </div>
              <div className="p-mqmvkk">
                <span className="p-ytl255">{t('Manquants signalés à BelivaY')}</span>
                <span className={inv.bilan.manquants.length ? 'p-lgzow2' : 'p-2vq92h'}>{inv.bilan.manquants.length}</span>
              </div>
              {inv.bilan.manquants.map((id) => (
                <Link key={id} to={chemin('colis', { ref: id })} className="p-o24hsm">
                  <div className="p-toppw8">
                    <Icone nom="package-search" taille={20} className="p-672m16" />
                  </div>
                  <div className="p-rnqj8n">
                    <div className="p-ife3a2 r-ref">{id}</div>
                    <div className="p-dfa05r">{t('Introuvable à l’inventaire : BelivaY vous contactera.')}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="p-gh7puf">
            <Icone nom="list-checks" taille={18} className="p-672m16" />
            <div>{t('Pendant l’inventaire, vous continuez à recevoir et à remettre : un colis remis ou parti entre-temps n’est jamais compté manquant. Touchez chaque colis trouvé à sa place, ou scannez son étiquette ; s’il est ailleurs, dites où.')}</div>
          </div>
          <button type="button" className="r-btn r-principal" disabled={occupe} onClick={() => void commencer()}>
            <Icone nom="list-checks" taille={20} />
            <span>{t(inv ? 'Commencer un nouvel inventaire' : 'Commencer l’inventaire')}</span>
          </button>
        </>
      )
    }
    const pointes = new Map(inv.pointes.map((p) => [p.id, p]))
    const cases = [...new Set(inv.attendus.map((a) => a.emplacement ?? '—'))].sort()
    const pct = inv.attendus.length ? Math.round((inv.pointes.length / inv.attendus.length) * 100) : 100
    return (
      <>
        <div>
          <h1 className="p-bvhkrl">{t('Inventaire en cours')}</h1>
          <div className="p-t2u0o2">{tf('{id} · commencé {d} par {par}', { id: inv.id, d: dateHeure(inv.commenceA, langue), par: inv.par })}</div>
        </div>
        <div className="p-yi6rkz">
          <div className="p-9rmh6y">
            <div className="p-unncbq">
              <h2 className="p-9j1bbu">{t('Colis pointés')}</h2>
            </div>
            <span className="p-t8bz1l">{tf('{n} / {total}', { n: inv.pointes.length, total: inv.attendus.length })}</span>
          </div>
          <div className="r6-progres" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t('Avancement de l’inventaire')}>
            <i style={{ width: pct + '%' }} />
          </div>
          <div className="r6-scan">
            <div className="r6-recherche">
              <Icone nom="scan-barcode" taille={20} />
              <label htmlFor="r6-inv-scan" className="r6-cache">
                {t('Étiquette du colis')}
              </label>
              <input id="r6-inv-scan" className="r-ref" value={scan} placeholder={t('Étiquette : BLV-…')} autoComplete="off" autoCapitalize="characters" enterKeyHint="done" onChange={(e) => setScan(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && scanner()} />
            </div>
            <button type="button" className="r-btn r-second" onClick={scanner} disabled={!scan.trim() || occupe}>
              {t('Pointer')}
            </button>
          </div>
        </div>
        {cases.map((k) => (
          <div key={k} className="p-yi6rkz r6-inv-case">
            <h3>{tf('CASE {c}', { c: k })}</h3>
            {inv.attendus
              .filter((a) => (a.emplacement ?? '—') === k)
              .map((a) => {
                const p = pointes.get(a.id)
                return (
                  <div key={a.id}>
                    <button type="button" role="checkbox" aria-checked={!!p} aria-disabled={p ? 'true' : undefined} className="r6-inv-l" onClick={() => (p ? signal('toucher') : void pointer(a.id, null))}>
                      {p ? (
                        <div className="p-hwk5jv">
                          <Icone nom="check" taille={18} trait={2.4} className="p-q7qjlz" />
                        </div>
                      ) : (
                        <div className="p-a38490" />
                      )}
                      <span>
                        <span className="p-sj6gna r-ref">{a.id}</span>
                        <span className="r6-sub">{[t(CLASSE[a.classe]), p ? (p.trouveEn ? tf('trouvé en {c}', { c: p.trouveEn }) : t('à sa place')) : t('à pointer')].join(' · ')}</span>
                      </span>
                    </button>
                    {!p && (
                      <div className="r6-depart-b">
                        <button type="button" className="r6-lien" aria-haspopup="dialog" onClick={() => (setCible(a.id), setFeuille('ailleurs'))}>
                          {tf('{ref} est ailleurs ?', { ref: a.id })}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        ))}
        <div className="r6-cta a-seul">
          <button type="button" className="p-ncx7qc" aria-haspopup="dialog" onClick={() => (signal('toucher'), setFeuille('terminer'))}>
            <Icone nom="check" taille={18} className="p-7dsggt" />
            {t('Terminer l’inventaire')}
          </button>
        </div>
        <Terminer inv={inv} ouverte={feuille === 'terminer'} fermer={() => setFeuille(null)} fait={() => (setFeuille(null), lecture.relire())} />
        <Ailleurs
          colis={inv.attendus.find((a) => a.id === cible) ?? null}
          ouverte={feuille === 'ailleurs'}
          fermer={() => setFeuille(null)}
          choisir={(c) => {
            const id = cible
            setFeuille(null)
            if (id) void pointer(id, c)
          }}
        />
      </>
    )
  }

  return (
    <Ecran route="inventaire" fixes={<Annonce avis={avis} />}>
      <div className="p-0hxmj8 r-pile">{contenu()}</div>
    </Ecran>
  )
}
