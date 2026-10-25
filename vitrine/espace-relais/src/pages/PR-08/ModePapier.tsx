// PR-08 · page ajoutée « Mode papier » (AID-04, OFF-06, PR-RC-19, v6 D15) : panne générale annoncée par BelivaY hors
// système (SMS ou WhatsApp de diffusion, seul usage de WhatsApp côté relais). Pendant la panne, le gérant tient le
// registre papier (référence, code donné par le client, pièce d'identité, signature du client, heure) et ne remet que
// les colis SANS MONTANT à payer. Au retour du réseau, chaque ligne se saisit dans les PR-PAPIER-SAISIE-H heures, avec
// une photo de la page et le PIN du membre : le serveur vérifie le code et l'absence de montant, puis enregistre la
// remise à l'heure écrite (ou refuse la ligne, motif écrit). Le registre vierge s'imprime.
import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { aHeure, jourDe, minutesDe } from '../../calculs/temps'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { signal } from '../../composants/signaux'
import { chemin } from '../../config/pages'
import { usePeut } from '../../config/droits'
import { ReseauRequis, geste, origine, useEnLigne } from '../../donnees/fileHorsLigne'
import type { PanneGenerale, RefusLigne } from '../../donnees/domaines/aide'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { heure, jourLong } from '../../i18n/temps'
import { usePreferences } from '../../preferences'
import { useHorloge } from '../../session'
import { Chargement, ErreurLecture, useTexte, usePrisePhoto } from './commun'
import './pr08.css'

const MOTIFS: Record<RefusLigne, string> = {
  aucune_panne: 'Aucune panne générale annoncée : le registre papier ne s’utilise que sur diffusion de BelivaY.',
  delai_depasse: 'Délai de saisie dépassé : écrivez au support avec la photo de la page.',
  hors_panne: 'Cette heure est en dehors de la panne annoncée.',
  photo_manquante: 'Prenez la photo de la page du registre.',
  piece_requise: 'La pièce d’identité doit avoir été vérifiée.',
  signature_requise: 'La signature du client doit être sur le registre.',
  introuvable: 'Référence inconnue au relais.',
  code_faux: 'Le code écrit ne correspond pas à ce colis.',
  montant_du: 'Ce colis avait un montant à payer : il ne se remet jamais sur papier.',
  deja_remis: 'Ce colis est déjà remis.',
  pin_faux: 'PIN faux.',
  bloque: 'PIN bloqué pour quelques minutes.',
  transition_interdite: 'Ce colis ne pouvait pas être remis à cette heure.',
}

const hhmm = (t: number) => {
  const d = new Date(t + 3600_000)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

/** Heures possibles d'une ligne : de 5 en 5 minutes, du début à la fin de la panne (en cours : jusqu'à maintenant). */
function creneaux(p: PanneGenerale, maintenant = Date.now()): string[] {
  const fin = p.au ?? maintenant
  const l: string[] = []
  for (let t = p.du; t <= fin; t += 5 * 60_000) l.push(hhmm(t))
  return l
}

function Saisie({ panne, apres }: { panne: PanneGenerale; apres: () => void }) {
  const { t, tf, langue } = usePreferences()
  const en = useEnLigne()
  const maintenant = useHorloge()
  const ids = { ref: useId(), code: useId(), heure: useId(), pin: useId() }
  const [ref, setRef] = useState('')
  const [code, setCode] = useState('')
  const [h, setH] = useState(hhmm(panne.du))
  const [piece, setPiece] = useState(false)
  const [signature, setSignature] = useState(false)
  const [pin, setPin] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null)
  const [occupe, setOccupe] = useState(false)
  const prise = usePrisePhoto(setPhoto)
  const saisir = async () => {
    setRetour(null)
    setOccupe(true)
    try {
      const o = origine(maintenant)
      const instant = aHeure(jourDe(panne.du), minutesDe(h))
      const r = await geste(en, 'reglage', ref.trim().toUpperCase(), o, (s) => s.aide.saisirLigne({ panne: panne.reference, reference: ref, code, heure: instant, pieceVerifiee: piece, signature, photo, pin }, o), { reseauRequis: true, photos: photo ? 1 : 0 })
      if (!r.r.ok) {
        setRetour({ ok: false, texte: t(MOTIFS[r.r.raison]) })
        signal('erreur')
      } else {
        setRetour({ ok: true, texte: tf('Remise de {ref} enregistrée à {h}.', { ref: ref.trim().toUpperCase(), h: heure(instant, langue) }) })
        signal('succes')
        setRef('')
        setCode('')
        setPiece(false)
        setSignature(false)
        setPhoto(null)
      }
      setPin('')
      apres()
    } catch (e) {
      if (!(e instanceof ReseauRequis)) throw e
      setRetour({ ok: false, texte: t('Le réseau est nécessaire : le serveur vérifie le code de chaque ligne.') })
      signal('erreur')
    } finally {
      setOccupe(false)
    }
  }
  const pret = ref.trim() && code.trim() && pin.length > 0
  return (
    <form
      className="p-yi6rkz"
      aria-labelledby={ids.ref + '-t'}
      onSubmit={(e) => {
        e.preventDefault()
        void saisir()
      }}
    >
      <div className="p-unncbq">
        <h2 className="p-9j1bbu" id={ids.ref + '-t'}>
          {t('Saisir une ligne du registre')}
        </h2>
      </div>
      <div className="pr08-grille2">
        <div className="p-ky12xr">
          <label htmlFor={ids.ref}>{t('RÉFÉRENCE')}</label>
          <input id={ids.ref} className="p-vust5v" placeholder={t('BLV-00000')} value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} autoCapitalize="characters" spellCheck={false} maxLength={14} />
        </div>
        <div className="p-ky12xr">
          <label htmlFor={ids.heure}>{tf('HEURE ({jour})', { jour: jourLong(panne.du, langue) })}</label>
          <select id={ids.heure} className="p-vust5v" value={h} onChange={(e) => setH(e.target.value)}>
            {creneaux(panne).map((x) => (
              <option key={x} value={x}>
                {heure(x, langue)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="p-ky12xr">
        <label htmlFor={ids.code}>{t('CODE DONNÉ PAR LE CLIENT (ÉCRIT SUR LE REGISTRE)')}</label>
        <input id={ids.code} className="p-vust5v" inputMode="numeric" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} />
      </div>
      <div className="pr08-coches">
        <label className="pr08-coche">
          <input type="checkbox" checked={piece} onChange={(e) => setPiece(e.target.checked)} />
          <span className="pr08-case" aria-hidden="true" />
          {t('Pièce d’identité vérifiée')}
        </label>
        <label className="pr08-coche">
          <input type="checkbox" checked={signature} onChange={(e) => setSignature(e.target.checked)} />
          <span className="pr08-case" aria-hidden="true" />
          {t('Signature du client sur le registre')}
        </label>
      </div>
      {prise.input}
      {photo ? (
        <div className="pr08-joint" style={{ margin: 0 }}>
          <img src={photo} alt={t('Photo de la page du registre')} />
          <span className="r-grow">{t('Photo de la page prête')}</span>
          <button type="button" className="pr08-btn" onClick={prise.ouvrir}>
            {t('Reprendre')}
          </button>
        </div>
      ) : (
        <button type="button" className="p-rbzobc" onClick={prise.ouvrir} disabled={prise.occupe}>
          <Icone nom="r-appareil-photo" taille={18} className="p-emic6i" />
          {t('Photo de la page du registre')}
        </button>
      )}
      <div className="p-ky12xr">
        <label htmlFor={ids.pin}>{t('VOTRE PIN')}</label>
        <input id={ids.pin} className="p-vust5v" type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} />
      </div>
      {(retour || prise.erreur) && (
        <div className={retour?.ok ? 'pr08-ok' : 'pr08-alerte'} role={retour?.ok ? 'status' : 'alert'}>
          <Icone nom={retour?.ok ? 'check' : 'r-alerte'} taille={18} />
          <span>{retour?.texte ?? prise.erreur}</span>
        </div>
      )}
      <button type="submit" className="r-btn r-principal" disabled={occupe || !pret}>
        <Icone nom="check" taille={20} />
        {t('Saisir la ligne')}
      </button>
      {!en && <div className="pr08-note">{t('Le réseau est nécessaire : le serveur vérifie le code de chaque ligne.')}</div>}
    </form>
  )
}

export default function ModePapier() {
  const { t, tf, langue } = usePreferences()
  const tx = useTexte()
  const peutRemettre = usePeut('remettreColis')
  const l = useLecture(() => source.aide.registre(), [])
  if (l.erreur && !l.donnees)
    return (
      <Ecran route="mode-papier">
        <ErreurLecture relire={l.relire} />
      </Ecran>
    )
  if (!l.donnees)
    return (
      <Ecran route="mode-papier">
        <Chargement lignes={3} />
      </Ecran>
    )
  const r = l.donnees
  const p = r.panne
  const quandTxt = (x: number) => `${jourLong(x, langue)} ${heure(x, langue)}`
  return (
    <Ecran route="mode-papier">
      <div className="p-0hxmj8 r-pile">
        <div>
          <h1 className="p-bvhkrl">{t('Mode papier')}</h1>
          <div className="p-t2u0o2">{t('Seulement quand BelivaY annonce une panne générale par SMS ou WhatsApp de diffusion. Ne remettez que les colis sans montant à payer.')}</div>
        </div>
        {p ? (
          <div className="pr08-alerte" role="status">
            <Icone nom="r-reseau" taille={18} />
            <span>
              <b>{tf('Panne générale {ref}', { ref: p.reference })}</b> ·{' '}
              {p.au !== null ? tf('du {du} à {au}', { du: quandTxt(p.du), au: heure(p.au, langue) }) : tf('depuis {du}', { du: quandTxt(p.du) })}
              {p.saisirAvant !== null ? ' · ' + tf('à saisir avant {quand}', { quand: quandTxt(p.saisirAvant) }) : ''}
            </span>
          </div>
        ) : (
          <div className="r-vide">
            <div className="r-vide-i">
              <Icone nom="r-reseau" taille={28} />
            </div>
            <h2>{t('Aucune panne générale annoncée')}</h2>
            <p>{tf('Sans diffusion de BelivaY, travaillez dans l’application, même hors ligne : elle garde vos opérations et les envoie au retour du réseau. Une ligne papier se saisit dans les {h} h qui suivent la panne.', { h: r.papierSaisieH })}</p>
          </div>
        )}
        {p && (peutRemettre ? <Saisie panne={p} apres={l.relire} /> : <div className="pr08-note">{t('La saisie du registre est faite par un membre qui remet les colis.')}</div>)}
        {r.lignes.length > 0 && (
          <div className="p-yi6rkz">
            <div className="p-unncbq">
              <h2 className="p-9j1bbu">{t('Lignes saisies')}</h2>
            </div>
            {r.lignes.map((x, i) => (
              <div key={x.id}>
                {i > 0 && <div className="p-92xvtp" style={{ marginBottom: 12 }} />}
                <div className="p-bxuikp">
                  <div className="p-ife3a2 r-ref">{x.reference}</div>
                  <span className={x.etat === 'remise' ? 'p-nax3x4' : 'p-h4wlx0'}>{x.etat === 'remise' ? t('Remise enregistrée') : t('Refusée')}</span>
                </div>
                <div className="p-dfa05r">{[tf('Remis à {h}', { h: heure(x.heure, langue) }), tf('saisi par {qui}', { qui: x.par }), x.motif ? t(MOTIFS[x.motif]) : null].filter(Boolean).join(' · ')}</div>
              </div>
            ))}
          </div>
        )}
        <div className="p-yi6rkz pr08-imprime">
          <div className="p-unncbq">
            <h2 className="p-9j1bbu">{t('Registre papier')}</h2>
            <button type="button" className="pr08-btn pr08-sans-impression" onClick={() => window.print()}>
              <Icone nom="printer" taille={16} />
              {t('Imprimer')}
            </button>
          </div>
          <table className="pr08-table">
              <caption className="pr08-note" style={{ textAlign: 'left', paddingBottom: 8 }}>
                {t('Une ligne par colis remis pendant la panne.')}
              </caption>
              <thead>
                <tr>
                  {r.colonnes.map((c) => (
                    <th key={c.fr} scope="col">
                      {tx(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }, (_, i) => (
                  <tr key={i}>
                    {r.colonnes.map((c) => (
                      <td key={c.fr} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
        <Link className="pr08-lien-bloc pr08-sans-impression" to={chemin('aide-fiche', { id: 'sans-reseau' })}>
          <Icone nom="r-reseau" taille={18} />
          {t('Fiche « Sans réseau »')}
        </Link>
      </div>
    </Ecran>
  )
}
