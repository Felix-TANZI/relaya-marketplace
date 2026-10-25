// Page ajoutée « Export comptable » (AJ-A, groupe S2 ; A-VALIDER A-19, A-36) : le grand livre d'une période, au plan de
// comptes simple de la console (512 Agrégateur de paiement, 467 séquestre, 706 commissions, 708 frais de service, 401 vendeurs et
// partenaires, 419 Wallet, 627 frais Mobile Money), en CSV SIGNÉ (empreinte SHA-256 en dernière ligne, agent, rôle, heure) et
// journalisé ; vérification d'un fichier reçu (l'empreinte recalculée doit être celle de sa dernière ligne et du
// journal). Ouvert à la Direction, à la Finance et à l'Audit ; jamais un montant corrigé à la main.
import { useRef, useState } from 'react'
import { Ecran } from '../../composants/coque'
import { ExportSigne } from '../../composants/ExportSigne'
import { Icone } from '../../composants/Icone'
import { Choix, Hint, Note, Panel, Table } from '../../composants/prototype'
import { yaounde } from '../../calculs/temps'
import { empreinte } from '../../donnees/exports'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { useFonctions } from './fonctions-page'
import { usePreferences } from '../../preferences'
import { Fr, Lu, Mv, useDate } from '../ADM-05/commun'

type Periode = 'sept' | 'oct' | 'libre'
const COMPTES: [string, string][] = [
  ['512 Agrégateur de paiement', 'Encaissements, versements et remboursements chez l’agrégateur ; frais du client en transit'],
  ['467 Séquestre clients', 'Escrow : argent des clients jusqu’à la libération'],
  ['706 Commissions', 'Revenu : commission retenue à la libération'],
  ['708 Frais de service', 'Revenu : frais de livraison ; charges : parts des transporteurs et des relais'],
  ['401 Vendeurs et partenaires', 'Dû aux vendeurs, relais et entreprises jusqu’au vendredi'],
  ['419 Fonds clients Wallet', 'Soldes du Wallet (retirable et gestes commerciaux)'],
  ['627 Frais Mobile Money', 'Frais de versement et de remboursement'],
]

export default function Export() {
  const { t, tf } = usePreferences()
  const d = useDate()
  const [periode, setPeriode] = useState<Periode>('oct')
  const [du, setDu] = useState('2026-10-01')
  const [au, setAu] = useState('2026-10-13')
  const borne = (s: string, fin: boolean) => {
    const [a, m, j] = s.split('-').map(Number)
    return yaounde(a, m, j, fin ? 23 : 0, fin ? 59 : 0)
  }
  const [debut, fin] = periode === 'sept' ? [yaounde(2026, 9, 1), yaounde(2026, 9, 30, 23, 59)] : periode === 'oct' ? [yaounde(2026, 10, 1), yaounde(2026, 10, 31, 23, 59)] : [borne(du, false), borne(au, true)]
  const l = useLecture(() => source.argent.grandLivre(debut, fin), [debut, fin])
  const journal = useLecture(() => source.gouvernance.journal({ action: 'export.csv', limite: 20 }).catch(() => []), [])
  const fonctions = useFonctions([
    { verbe: 'Exporter', n: l.donnees ? (l.donnees as { lignes?: unknown[] }).lignes?.length ?? null : null, unite: ['écriture', 'écritures'], icone: 'download', onClick: () => document.getElementById('s2-export')?.scrollIntoView({ behavior: 'smooth' }) },
    { verbe: 'Contrôler', n: (journal.donnees ?? []).length, unite: ['export signé', 'exports signés'], icone: 'scroll-text', route: 'journal', params: { action: 'export.csv' } },
  ])
  const nom = `grand-livre-${new Date(debut + 3600_000).toISOString().slice(0, 10)}-${new Date(fin).toISOString().slice(0, 10)}.csv`
  return (
    <Ecran route="export" fonctions={fonctions}>
      <div className="g g21" style={{ marginTop: 0 }} id="s2-export">
        <Panel titre={t('Période et contenu')} icone="calendar">
          <Choix
            forme="seg"
            aria={t('Période')}
            actif={periode}
            choisir={setPeriode}
            items={[
              { id: 'sept', t: t('Septembre 2026') },
              { id: 'oct', t: t('Octobre 2026 à ce jour') },
              { id: 'libre', t: t('Dates choisies') },
            ]}
          />
          {periode === 'libre' && (
            <div className="row wrap mt10" style={{ gap: 12 }}>
              <label className="fld">
                <span className="fld-t">{t('Du')}</span>
                <span className="inp">
                  <input type="date" value={du} max={au} onChange={(e) => setDu(e.target.value || du)} />
                </span>
              </label>
              <label className="fld">
                <span className="fld-t">{t('Au')}</span>
                <span className="inp">
                  <input type="date" value={au} min={du} onChange={(e) => setAu(e.target.value || au)} />
                </span>
              </label>
            </div>
          )}
          <Lu l={l}>
            {(lignes) => {
              const debit = lignes.reduce((n, x) => n + x.debit, 0)
              const credit = lignes.reduce((n, x) => n + x.credit, 0)
              return (
                <>
                  <div className="mt14">
                    <Mv k={t('Écritures')} v={String(lignes.length)} />
                    <Mv k={t('Total des débits')} v={Fr(debit)} />
                    <Mv k={t('Total des crédits')} v={Fr(credit)} />
                    <Mv k={t('Équilibre')} v={debit === credit ? t('Σ débits = Σ crédits') : t('déséquilibre : carte Direction')} tot />
                  </div>
                  <div className="btns">
                    <ExportSigne nom={nom} objet={`Export comptable ${d.jour(debut)} – ${d.jour(fin)}`} entetes={['Date', 'Pièce', 'Compte', 'Libellé', 'Débit', 'Crédit']} lignes={() => lignes.map((x) => [x.date, x.piece, x.compte, x.libelle, x.debit, x.credit])} />
                  </div>
                  <Table
                    className="mt14"
                    cle={(x) => `${x.piece}-${x.compte}-${x.debit}`}
                    rows={lignes.slice(0, 12)}
                    legende={t('Aperçu du grand livre')}
                    vide={<p className="t13 c3">{t('Aucune écriture sur cette période.')}</p>}
                    cols={[
                      { k: 'd', t: t('Date'), rendu: (x) => x.date },
                      { k: 'c', t: t('Compte'), main: true, rendu: (x) => <><b>{x.compte}</b><div className="t2">{x.libelle}</div></> },
                      { k: 'db', t: t('Débit'), cls: 'r', rendu: (x) => (x.debit ? Fr(x.debit) : '') },
                      { k: 'cr', t: t('Crédit'), cls: 'r', rendu: (x) => (x.credit ? Fr(x.credit) : '') },
                    ]}
                    pied={lignes.length > 12 ? <span>{tf('{n} écritures de plus dans le fichier', { n: lignes.length - 12 })}</span> : undefined}
                  />
                </>
              )
            }}
          </Lu>
        </Panel>
        <div className="col" style={{ gap: 16, display: 'flex', flexDirection: 'column' }}>
          <Panel titre={t('Plan de comptes')} icone="book-open">
            {COMPTES.map(([c, s]) => (
              <Mv key={c} k={c} v={t(s)} />
            ))}
            <Hint icone="info">{t('Plan proposé, à valider par l’expert-comptable (A-19).')}</Hint>
          </Panel>
          <Verifier />
          <Panel titre={t('Derniers exports')} icone="history">
            {(journal.donnees ?? []).length === 0 ? (
              <p className="t13 c3">{t('Aucun export journalisé visible pour votre rôle.')}</p>
            ) : (
              (journal.donnees ?? []).map((x) => <Mv key={x.n} k={`${d.quand(x.le)} · ${x.agent}`} v={x.objet} />)
            )}
          </Panel>
        </div>
      </div>
    </Ecran>
  )
}

/** Vérifier un fichier exporté : l'empreinte de son contenu doit être celle de sa dernière ligne. */
function Verifier() {
  const { t, tf } = usePreferences()
  const ref = useRef<HTMLInputElement>(null)
  const [r, setR] = useState<{ ok: boolean; e: string } | null>(null)
  const verifier = async (f: File) => {
    const s = await f.text()
    const i = s.lastIndexOf('\r\n# SHA-256 ')
    if (i < 0) return setR({ ok: false, e: '' })
    const annoncee = s.slice(i + 12).split(' ')[0]
    // Le navigateur retire l'indicateur d'ordre des octets (BOM) en lisant le fichier : il fait partie du contenu signé.
    const corps = s.slice(0, i)
    const ok = (await empreinte(corps)) === annoncee || (await empreinte('\ufeff' + corps)) === annoncee
    setR({ ok, e: annoncee })
  }
  return (
    <Panel titre={t('Vérifier un fichier')} icone="fingerprint">
      <p className="t13 c2">{t('Un fichier modifié après l’export ne garde pas son empreinte.')}</p>
      <input ref={ref} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && void verifier(e.target.files[0])} />
      <button type="button" className="btn secondary mt10" onClick={() => ref.current?.click()}>
        <Icone nom="file-scan" taille={18} />
        <span>{t('Choisir un fichier exporté')}</span>
      </button>
      {r && (
        <Note ton={r.ok ? 'green' : 'red'} icone={r.ok ? 'circle-check' : 'circle-x'} className="mt10" role="status">
          {r.ok ? tf('Intact : empreinte {e}… retrouvée.', { e: r.e.slice(0, 16) }) : r.e ? t('Modifié : l’empreinte recalculée ne correspond pas.') : t('Ce fichier ne porte pas d’empreinte de la console.')}
        </Note>
      )}
    </Panel>
  )
}
