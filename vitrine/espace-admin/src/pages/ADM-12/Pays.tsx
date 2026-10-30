// ADM-P33 · Espaces pays (ADM-12 § 47). Structure du prototype : héros « Espace pays actif », carte « Préparer un
// nouvel espace pays », « Identité et paiement », « Tarifs, garde et fiscalité », « Textes, langues et calendrier »,
// « Zones de Yaoundé », « Conditions d'ouverture » ; espace en préparation (?pays=) : héros, conditions, paramètres.
// Chaque valeur vient du registre de l'espace (jamais codée en dur) ; une copie du Cameroun est bloquée tant qu'elle
// n'est pas revue ; un espace n'ouvre qu'avec ses textes légaux, son agrégateur certifié et ses zones (409 sinon).
// Réservé à la Direction (droits.ts).
import { useState } from 'react'
import { DecisionMotivee } from '../../composants/DecisionMotivee'
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { Kv, Note, Panel, Pill, Px, Sec, St, Table, Vide, useSurtitre, type Ton } from '../../composants/prototype'
import { chemin } from '../../config/pages'
import type { EspacePaysDetail, ParametrePays } from '../../donnees/domaines/gouvernance'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { useFonctions } from '../AJ-A/fonctions-page'
import { usePreferences } from '../../preferences'
import { EtatLecture, useDate, useRaison } from './commun-s6'

/** Pays de la CEMAC (cible d'extension) : la source refuse un code inconnu ou déjà préparé. */
const CEMAC: [string, string][] = [['GA', 'Gabon'], ['CG', 'Congo'], ['TD', 'Tchad'], ['CF', 'Centrafrique'], ['GQ', 'Guinée équatoriale']]
const ETAT_P: Record<ParametrePays['etat'], [string, Ton]> = { revu: ['Revu', 'green'], a_revoir: ['À revoir', 'amber'], manquant: ['Manquant', 'red'] }
const val = (p: EspacePaysDetail, code: string) => p.parametres.find((x) => x.code === code)?.valeur ?? '—'

function Condition({ ok, t: titre, s }: { ok: boolean; t: string; s: string }) {
  return (
    <div className="adme-cond">
      <span className={'ic ' + (ok ? 'ok' : 'ko')}>
        <Icone nom={ok ? 'check' : 'x'} taille={18} trait={2.6} />
      </span>
      <span className="grow">
        <b>{titre}</b>
        <span>{s}</span>
      </span>
    </div>
  )
}

export default function Pays() {
  const { t } = usePreferences()
  const surtitre = useSurtitre()
  const raison = useRaison()
  const [params] = useSearchParams()
  const code = params.get('pays')
  const l = useLecture(() => source.gouvernance.pays(), [])
  const [copier, setCopier] = useState(false)
  const [cible, setCible] = useState('')
  const espace = code ? l.donnees?.find((p) => p.code === code) : null
  const prets = (l.donnees ?? []).map((p) => p.code)
  const enPrep = (l.donnees ?? []).filter((p) => p.etat === 'preparation')
  const fonctions = useFonctions([
    { verbe: 'Préparer', n: enPrep.length, unite: ['espace pays', 'espaces pays'], icone: 'globe', route: 'pays', params: { pays: enPrep[0]?.code } },
    { verbe: 'Copier', n: null, unite: ['modèle', 'modèles'], icone: 'copy', onClick: () => setCopier(true), droit: 'pays', geste: true },
    { verbe: 'Revoir', n: (l.donnees ?? []).reduce((n, p) => n + p.parametres.filter((x) => x.etat !== 'revu').length, 0), unite: ['paramètre', 'paramètres'], icone: 'sliders-horizontal', route: 'pays', params: { pays: enPrep[0]?.code }, geste: true },
  ])
  return (
    <Ecran
      route="pays"
      titre={espace ? `${t('Espace pays')} · ${espace.nom}` : undefined}
      nom={espace?.nom}
      retour={code ? chemin('pays') : undefined}
      kicker={surtitre}
      fonctions={espace ? undefined : fonctions}
      actions={
        code ? (
          <Link className="btn secondary" to={chemin('pays')}>
            <Icone nom="arrow-left" taille={18} />
            <span>{t('Tous les espaces')}</span>
          </Link>
        ) : (
          <>
            <button type="button" className="btn secondary" onClick={() => setCopier(true)}>
              <Icone nom="copy" taille={18} />
              <span>{t('Copier comme modèle')}</span>
            </button>
            <Link className="btn primary" to={chemin('parametrage')}>
              <Icone nom="sliders-horizontal" taille={18} />
              <span>{t('Paramétrer le Cameroun')}</span>
            </Link>
          </>
        )
      }
    >
      <Px>
        <EtatLecture l={l} quoi="les espaces pays">
          {(d) => (code ? espace ? <Preparation p={espace} /> : <Vide icone="globe" t={t('Espace introuvable')} s={t('Aucun espace pays ne porte ce code.')} action={<Link className="btn secondary" to={chemin('pays')}>{t('Tous les espaces')}</Link>} /> : <Actif d={d} copier={() => setCopier(true)} />)}
        </EtatLecture>
        <DecisionMotivee
          ouverte={copier}
          fermer={() => setCopier(false)}
          titre={t('Copier le Cameroun comme modèle')}
          resume={t('Toutes les valeurs sont copiées puis bloquées : aucune valeur de Yaoundé ne s’applique ailleurs tant qu’elle n’a pas été revue. L’espace reste fermé.')}
          libelle="Préparer l’espace"
          icone="copy"
          envoyer={async (m) => {
            const p = CEMAC.find((x) => x[0] === cible)
            if (!p) return t('Choisissez un pays.')
            const r = await source.gouvernance.copierPays(p[0], p[1], m)
            return r.ok ? null : raison(r.raison, { existe: 'Cet espace est déjà en préparation.', inconnu: 'Pays inconnu.' })
          }}
        >
          <label className="fld mt14">
            <span className="fld-t">{t('Pays')}</span>
            <span className="inp">
              <select value={cible} onChange={(e) => setCible(e.target.value)}>
                <option value="">{t('Choisir un pays de la CEMAC')}</option>
                {CEMAC.filter(([c]) => !prets.includes(c)).map(([c, n]) => (
                  <option key={c} value={c}>
                    {t(n)}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </DecisionMotivee>
      </Px>
    </Ecran>
  )
}

function Actif({ d, copier }: { d: EspacePaysDetail[]; copier: () => void }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  const cm = d.find((p) => p.etat === 'ouvert')!
  const enPrep = d.filter((p) => p.etat === 'preparation')
  const exploitees = cm.zones.filter((z) => z.exploitee)
  return (
    <>
      <div className="g g21" style={{ marginTop: 6 }}>
        <div className="hero night" style={{ marginTop: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
            <span className="hk">{t('Espace pays actif')}</span>
            <Pill ton="dk" dot>{t('Ouvert')}</Pill>
          </div>
          <div className="row mt10" style={{ gap: 14 }}>
            <span className="ico-b"><Icone nom="globe" taille={22} /></span>
            <div className="grow">
              <div className="ht" style={{ margin: 0 }}>{`${t(cm.nom)} · ${cm.devise}`}</div>
              <div className="hs" style={{ marginTop: 2 }}>{tf('{v} · {n} zones définies, {e} exploitées ({codes}) · {r} en vente seulement', { v: cm.ville, n: cm.zones.length, e: exploitees.length, codes: exploitees.map((z) => z.code).join(', '), r: cm.zones.length - exploitees.length })}</div>
            </div>
          </div>
          <div className="adme-m4">
            <div className="m4"><div className="l"><Icone nom="landmark" taille={14} />{t('Agrégateur')}</div><div className="v" style={{ fontSize: 18 }}>{cm.conditions.agregateur.ok ? t('Certifié') : t('À certifier')}</div><div className="s">{t('principal et secours')}</div></div>
            <div className="m4"><div className="l"><Icone nom="smartphone" taille={14} />{t('Mobile Money')}</div><div className="v">{val(cm, 'operateurs').split(',').length}</div><div className="s">{val(cm, 'operateurs')}</div></div>
            <div className="m4"><div className="l"><Icone nom="file-check" taille={14} />{t('Textes légaux')}</div><div className="v" style={{ fontSize: 18 }}>{val(cm, 'textes')}</div><div className="s">{t('en vigueur')}</div></div>
            <div className="m4"><div className="l"><Icone nom="map-pinned" taille={14} />{t('Relais')}</div><div className="v">{exploitees.reduce((a, z) => a + z.relais, 0)}</div><div className="s">{t('dans les zones exploitées')}</div></div>
          </div>
          <div className="adme-btns">
            <Link className="btn primary" to={chemin('parametrage')}>
              <Icone nom="sliders-horizontal" taille={18} />
              <span>{t('Paramétrer')}</span>
            </Link>
            <button type="button" className="btn dark" onClick={copier}>
              <Icone nom="copy" taille={18} />
              <span>{t('Copier comme modèle')}</span>
            </button>
          </div>
        </div>
        <div className="adme-country">
          <span style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--acc-soft)', color: 'var(--acc-txt)' }}>
            <Icone nom="plus" taille={22} />
          </span>
          <b className="t17">{t('Préparer un nouvel espace pays')}</b>
          {enPrep.map((p) => (
            <Link key={p.code} className="li" to={chemin('pays', { pays: p.code })}>
              <span className="ic amber"><Icone nom="globe" taille={20} /></span>
              <span className="grow">
                <span className="lt" style={{ display: 'block' }}>{tf('{n} · en préparation', { n: t(p.nom) })}</span>
                <span className="ls" style={{ display: 'block' }}>{tf('{r} revus · {a} à revoir · {m} manquants · copié {d}', { r: p.parametres.filter((x) => x.etat === 'revu').length, a: p.parametres.filter((x) => x.etat === 'a_revoir').length, m: p.parametres.filter((x) => x.etat === 'manquant').length, d: date(p.creeLe) })}</span>
              </span>
              <span className="chev"><Icone nom="chevron-right" taille={18} /></span>
            </Link>
          ))}
          <button type="button" className="btn secondary auto" onClick={copier}>
            <Icone nom="copy" taille={18} />
            <span>{t('Copier le Cameroun')}</span>
          </button>
        </div>
      </div>
      <div className="g g3">
        <Panel titre={t('Identité et paiement')} icone="landmark">
          <Kv k={t('Pays · devise')} v={val(cm, 'devise')} />
          <Kv k={t('Fuseau horaire')} v={val(cm, 'fuseau')} />
          <Kv k={t('Langues')} v={val(cm, 'langues')} />
          <Kv k={t('Agrégateur certifié et secours')} v={val(cm, 'PAY-AGREG')} />
          <Kv k={t('Opérateurs Mobile Money')} v={val(cm, 'operateurs')} />
          <Kv k={t('Prestataire carte (diaspora)')} v={val(cm, 'PAY-CARTE-PSP')} />
        </Panel>
        <Panel titre={t('Tarifs, garde et fiscalité')} icone="receipt" a={{ t: t('Paramétrage'), to: chemin('parametrage') }}>
          <Kv k={t('Livraison en relais')} v={val(cm, 'LIV-RELAIS-BASE')} />
          <Kv k={t('Livraison à domicile')} v={val(cm, 'LIV-DOM-BASE')} />
          <Kv k={t('Livraison offerte en relais')} v={val(cm, 'LIV-SEUIL-RELAIS')} />
          <Kv k={t('Garde au relais (F par jour, J1 à J7)')} v={val(cm, 'GARDE-GRILLE')} />
          <Kv k={t('TVA sur la commission')} v={val(cm, 'VD-TVA')} />
        </Panel>
        <Panel titre={t('Textes, langues et calendrier')} icone="file-check">
          <Kv k={t('Textes légaux')} v={<Link to={chemin('legal')}>{tf('{v} en vigueur', { v: val(cm, 'textes') })}</Link>} />
          <Kv k={t('Numéros d’urgence')} v={val(cm, 'urgence')} />
          <Kv k={t('Jours fériés')} v={val(cm, 'feries')} />
          <Kv k={t('Hébergement des données')} v={t('Selon la loi n° 2024/017 · paramètre de l’espace')} />
        </Panel>
      </div>
      <div className="g g21">
        <Panel titre={tf('Zones de {v}', { v: cm.ville })} icone="map" a={{ t: t('Pilotage des zones'), to: chemin('zones') }}>
          <div className="e-zones">
            {cm.zones.map((z) => (
              <div key={z.code} className={'e-zone' + (z.exploitee ? ' on' : '')}>
                <b>{z.code}</b>
                <span>{z.nom}</span>
                <Pill ton={z.exploitee ? 'acc' : 'ink'} sm>
                  {z.exploitee ? tf('Exploitée · {n} relais', { n: z.relais }) : t('Vente seulement')}
                </Pill>
              </div>
            ))}
          </div>
        </Panel>
        <div className="adme-stack">
          <Panel titre={t('Conditions d’ouverture')} icone="badge-check" droite={<Pill ton="green" sm icone="check">{t('3 sur 3')}</Pill>}>
            <Condition ok={cm.conditions.textes.ok} t={t('Textes légaux')} s={t(cm.conditions.textes.detail)} />
            <Condition ok={cm.conditions.agregateur.ok} t={t('Agrégateur certifié')} s={cm.conditions.agregateur.detail} />
            <Condition ok={cm.conditions.zones.ok} t={t('Zones')} s={cm.conditions.zones.detail} />
          </Panel>
          <Note ton="acc" icone="plane">
            <b>{t('Commande de la diaspora :')}</b> {t('payée par carte dans l’espace Cameroun. Aucun espace pays n’est créé pour le pays du payeur.')}
          </Note>
        </div>
      </div>
    </>
  )
}

function Preparation({ p }: { p: EspacePaysDetail }) {
  const { t, tf } = usePreferences()
  const date = useDate()
  const raison = useRaison()
  const [revoir, setRevoir] = useState<ParametrePays | null>(null)
  const [valeur, setValeur] = useState('')
  const [ouvrir, setOuvrir] = useState(false)
  const c = p.conditions
  const n = [c.textes, c.agregateur, c.zones].filter((x) => x.ok).length
  const CONDITION = ['PAY-AGREG', 'textes', 'ZONES-EXPLOITEES']
  return (
    <>
      <div className="g g21" style={{ marginTop: 6 }}>
        <div className="hero amber" style={{ marginTop: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
            <span className="hk">{t('Espace en préparation')}</span>
            <Pill ton="dk" icone="lock">{tf('{n} condition sur 3', { n })}</Pill>
          </div>
          <div className="ht mt8">{`${t(p.nom)} · ${p.devise} · ${p.ville}`}</div>
          <div className="hs">{tf('Copié du Cameroun comme modèle {d}. Chaque valeur copiée reste bloquée tant qu’elle n’a pas été revue : aucune valeur de Yaoundé ne s’applique ici.', { d: date(p.creeLe) })}</div>
          <div className="adme-m4">
            {(['revu', 'a_revoir', 'manquant'] as const).map((e) => (
              <div className="m4" key={e}>
                <div className="l"><Icone nom={e === 'revu' ? 'circle-check' : e === 'a_revoir' ? 'refresh-cw' : 'circle-x'} taille={14} />{t(ETAT_P[e][0])}</div>
                <div className="v">{p.parametres.filter((x) => x.etat === e).length}</div>
              </div>
            ))}
            <div className="m4"><div className="l"><Icone nom="lock" taille={14} />{t('Conditions')}</div><div className="v">{`${n} / 3`}</div><div className="s">{t('pour ouvrir')}</div></div>
          </div>
          <div className="adme-btns">
            <a className="btn primary" href="#parametres">
              <Icone nom="list-checks" taille={18} />
              <span>{t('Compléter')}</span>
            </a>
            <button type="button" className="btn dark" disabled={n < 3} onClick={() => setOuvrir(true)}>
              <Icone nom="lock" taille={18} />
              <span>{t('Ouvrir l’espace')}</span>
            </button>
          </div>
        </div>
        <Panel titre={t('Conditions d’ouverture')} icone="list-checks">
          <Condition ok={c.textes.ok} t={t('Textes légaux du pays')} s={t(c.textes.detail)} />
          <Condition ok={c.agregateur.ok} t={t('Agrégateur de paiement certifié')} s={t(c.agregateur.detail)} />
          <Condition ok={c.zones.ok} t={t('Zones')} s={t(c.zones.detail)} />
        </Panel>
      </div>
      <Sec t={t('Paramètres de l’espace')} id="parametres" />
      <Table
        cle={(x) => x.code}
        rows={p.parametres}
        cols={[
          { k: 'p', t: t('Paramètre'), main: true, rendu: (x) => <b>{t(x.libelle)}</b> },
          { k: 'v', t: t('Valeur'), rendu: (x) => x.valeur },
          { k: 'e', t: t('État'), rendu: (x) => <St t={t(ETAT_P[x.etat][0])} ton={ETAT_P[x.etat][1]} /> },
          {
            k: 'go',
            t: '',
            cls: 'r',
            rendu: (x) =>
              CONDITION.includes(x.code) ? (
                <span className="t12 c3">{t('Condition d’ouverture')}</span>
              ) : x.etat !== 'revu' ? (
                <button type="button" className="btn sm secondary" onClick={() => (setValeur(x.valeur.replace(/ \(copié du Cameroun, bloqué\)$/, '')), setRevoir(x))} aria-label={tf('Revoir : {p}', { p: t(x.libelle) })}>
                  {t('Revoir')}
                </button>
              ) : null,
          },
        ]}
        pied={
          <>
            <span>{tf('{n} paramètres · {r} revus', { n: p.parametres.length, r: p.parametres.filter((x) => x.etat === 'revu').length })}</span>
            <span>{t('Chaque paramètre est porté par l’espace pays')}</span>
          </>
        }
      />
      <DecisionMotivee
        ouverte={!!revoir}
        fermer={() => setRevoir(null)}
        motif="aucun"
        titre={revoir ? tf('Revoir : {p}', { p: t(revoir.libelle) }) : ''}
        resume={t('La valeur revue s’applique à cet espace seulement ; l’avant et l’après sont journalisés.')}
        libelle="Marquer comme revu"
        envoyer={async () => {
          const r = await source.gouvernance.revoirParametre(p.code, revoir!.code, valeur)
          return r.ok ? null : raison(r.raison, { vide: 'Saisissez la valeur du pays.', condition: 'Cette valeur est une condition d’ouverture : elle ne se saisit pas.', inconnu: 'Paramètre introuvable.' })
        }}
      >
        <label className="fld mt14">
          <span className="fld-t">{t('Valeur pour ce pays')}</span>
          <span className="inp"><input value={valeur} onChange={(e) => setValeur(e.target.value)} /></span>
        </label>
      </DecisionMotivee>
      <DecisionMotivee
        ouverte={ouvrir}
        fermer={() => setOuvrir(false)}
        titre={t('Ouvrir l’espace')}
        resume={t('L’ouverture rend l’espace visible des clients et des partenaires du pays ; elle est journalisée.')}
        libelle="Ouvrir l’espace"
        envoyer={async (m) => {
          const r = await source.gouvernance.ouvrirPays(p.code, m)
          return r.ok ? null : raison(r.raison, { conditions: 'Conditions d’ouverture manquantes (409) : textes légaux, agrégateur certifié et zones.' })
        }}
      />
    </>
  )
}
