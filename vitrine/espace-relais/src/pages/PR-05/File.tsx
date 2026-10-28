// PR-05 · « File du comptoir » (VAGUE-AMELIORATIONS.md n° 7 ; règles : calculs/file.ts) : les colis prêts au retrait,
// rangés ÉTAGÈRE PAR ÉTAGÈRE (A-01, A-02, B-01… puis le comptoir) pour aller les chercher d'un seul passage quand la
// file se forme. Les plus pressés se voient (dernier jour, garde à encaisser, à payer au comptoir) sans changer
// l'ordre. Jamais le nom du client (GEN-01) : la référence de sa commande. Le scan reste sur l'écran Retrait ;
// « Scan rapide » garde la douchette (elle tape le code et valide : le retrait s'ouvre, code vérifié).
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import '../../composants/comptoir/comptoir.css'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { clientsAttendus, tourneeEtageres } from '../../calculs/file'
import type { ColisRelais } from '../../donnees/domaines/colis'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { CLASSES, montant } from './commun'
import './pr05.css'

/** « A-03 » → « A » ; sans emplacement : le comptoir. */
const etagere = (e: string | null) => (e ? (/^([A-Z]+)/.exec(e.toUpperCase())?.[1] ?? e) : null)

export default function File() {
  const { t, tf } = usePreferences()
  const naviguer = useNavigate()
  const [scan, setScan] = useState('')
  const l = useLecture(() => source.stock.stock('tous'), [])
  const colis = l.donnees?.colis ?? []
  const clients = clientsAttendus(colis)
  const tournee = tourneeEtageres(colis)
  const parGroupe = new Map(clients.map((c) => [c.groupe, c]))
  const etageres: { nom: string | null; colis: ColisRelais[] }[] = []
  for (const c of tournee) {
    const e = etagere(c.emplacement)
    const der = etageres[etageres.length - 1]
    if (der && der.nom === e) der.colis.push(c)
    else etageres.push({ nom: e, colis: [c] })
  }
  const urgents = tournee.filter((c) => c.etat === 'dernier_jour').length
  // Même compte que « Aujourd'hui » (colis prêts, code envoyé) ; les commandes à payer au comptoir à part.
  const aPayer = tournee.filter((c) => c.paiement.mode === 'au_comptoir' && c.paiement.etat !== 'confirme').length
  const prets = tournee.length - aPayer
  const ouvrir = () => {
    const v = scan.trim()
    if (!v) return
    signal('toucher')
    naviguer(chemin('retrait', { scan: v }))
  }
  return (
    <Ecran route="file">
      <div className="p-0hxmj8 pr05 r5f">
        <div className="cpt-compteur" role="status">
          <b>{prets}</b>
          <span>{prets > 1 ? t('colis prêts au retrait') : t('colis prêt au retrait')}</span>
          {aPayer > 0 && <span className="r5f-p acc">{tf('+ {n} à payer au comptoir', { n: aPayer })}</span>}
          {urgents > 0 && <span className="r5f-p rouge">{tf('{n} au dernier jour', { n: urgents })}</span>}
        </div>
        <Link to={chemin('retrait')} className="cpt-action">
          <Icone nom="r-qr" taille={20} />
          {t('Scanner un client')}
        </Link>
        {!l.donnees ? null : !tournee.length ? (
          <p className="r5f-vide">{t('Aucun colis prêt au retrait pour l’instant.')}</p>
        ) : (
          etageres.map((e) => (
            <section key={e.nom ?? 'comptoir'} className="r5f-bloc" aria-labelledby={'r5f-e-' + (e.nom ?? 'comptoir')}>
              <h2 id={'r5f-e-' + (e.nom ?? 'comptoir')}>{e.nom ? tf('Étagère {e}', { e: e.nom }) : t('Comptoir')}</h2>
              <ol className="r5f-t">
                {e.colis.map((x) => {
                  const g = parGroupe.get(x.groupe)
                  return (
                    <li key={x.id}>
                      <Link to={chemin('colis', { ref: x.id })} className={'r5f-t-l' + (x.etat === 'dernier_jour' ? ' urgent' : '')}>
                        <span className="r5f-case">{x.emplacement ?? t('Comptoir')}</span>
                        <span className="grow">
                          <b>{x.id}</b>
                          <small>{tf('{c} · commande {g}', { c: t(CLASSES[x.classe]), g: x.groupe })}</small>
                          <span className="r5f-pills">
                            {x.etat === 'dernier_jour' && <span className="r5f-p rouge">{t('Dernier jour')}</span>}
                            {g && g.gardeDue > 0 && <span className="r5f-p ambre">{tf('Garde {m}', { m: montant(g.gardeDue) })}</span>}
                            {g && g.aPayer > 0 && <span className="r5f-p acc">{t('À payer au comptoir')}</span>}
                          </span>
                        </span>
                        <Icone nom="r-chevron-droite" taille={18} />
                      </Link>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))
        )}
        <form
          className="r5f-scan"
          onSubmit={(e) => {
            e.preventDefault()
            ouvrir()
          }}
        >
          <label htmlFor="r5f-scan">{t('Scan rapide')}</label>
          <div className="r5f-scan-l">
            <Icone nom="r-qr" taille={20} />
            <input id="r5f-scan" autoComplete="off" inputMode="text" placeholder={t('Douchette : code ou étiquette')} value={scan} onChange={(e) => setScan(e.target.value)} />
            <button type="submit" className="r5f-ok" disabled={!scan.trim()}>
              {t('Ouvrir')}
            </button>
          </div>
        </form>
      </div>
    </Ecran>
  )
}
