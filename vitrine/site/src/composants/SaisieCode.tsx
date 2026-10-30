// Saisie d'un code à 6 chiffres (CIN-33, CIN-34, CIN-38), balisage de l'écran « Entre le code reçu par SMS »
// du prototype : six cases (.otp), message sous les cases, bouton plein, durée de validité. Le code se tape
// au clavier (un champ invisible posé sur les cases) et se remplit tout seul quand le téléphone le propose
// (autocomplete one-time-code). Le serveur décide : code faux (essais restants), trop d'essais (heure de
// reprise écrite), bon code.
// Trois pièces, pour les écrans qui gardent leur propre balisage autour des cases (« Changer de numéro ») :
// useSaisieCode (la logique), CasesCode (les six cases), MessageCode (la ligne sous les cases) ; SaisieCode
// les assemble dans la mise en page du prototype.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ErreurTropDeRequetes } from '../api/erreurs'
import type { EnvoiCode, ResultatCode } from '../donnees/source'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'
import { Bouton, Note } from './socle'

const heure = (ms: number) => {
  const d = new Date(ms)
  return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`
}

export interface Saisie {
  code: string
  envoi: EnvoiCode
  erreur: string | null
  estBloque: boolean
  reste: number // secondes avant de pouvoir renvoyer
  enCours: boolean
  pret: boolean // six chiffres, rien en cours, pas bloqué
  focus: number // change quand le champ doit reprendre le focus (code faux, code renvoyé)
  saisir(v: string): void
  valider(): Promise<void>
  renvoyer(): Promise<void>
}

export function useSaisieCode(p: {
  envoi: EnvoiCode
  valider: (code: string) => Promise<ResultatCode>
  renvoyer: () => Promise<EnvoiCode>
  reussi: (r: Extract<ResultatCode, { ok: true }>) => void
}): Saisie {
  const { t } = usePreferences()
  const [code, setCode] = useState('')
  const [envoi, setEnvoi] = useState(p.envoi)
  const [reste, setReste] = useState(p.envoi.renvoiSecondes)
  const [erreur, setErreur] = useState<string | null>(null)
  const [bloque, setBloque] = useState(0)
  const [enCours, setEnCours] = useState(false)
  const [focus, setFocus] = useState(0)

  // Blocage (CIN-34) : il se lève tout seul à l'heure de reprise.
  useEffect(() => {
    if (!bloque) return
    const id = setTimeout(() => (setBloque(0), setErreur(null)), Math.max(bloque - Date.now(), 0))
    return () => clearTimeout(id)
  }, [bloque])

  useEffect(() => {
    if (reste <= 0) return
    const id = setTimeout(() => setReste((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [reste])

  const estBloque = bloque > 0
  const valider = async () => {
    if (code.length !== 6 || enCours || estBloque) return
    setEnCours(true)
    const r = await p.valider(code)
    setEnCours(false)
    if (r.ok) return p.reussi(r)
    setCode('')
    if ('bloqueJusqua' in r) {
      setBloque(r.bloqueJusqua)
      setErreur(t('Trop d’essais. Réessaie à ') + heure(r.bloqueJusqua) + '.')
    } else
      setErreur(
        r.essaisRestants > 1
          ? t('Ce code ne correspond pas. Encore ') + r.essaisRestants + t(' essais.')
          : r.essaisRestants === 1
            ? t('Ce code ne correspond pas. Dernier essai.')
            : t('Ce code ne correspond pas.'),
      )
    setFocus((f) => f + 1)
  }
  // Un envoi par geste, seulement après le délai affiché (le serveur répond 429 trop_tot sinon) ; un 429 reçu
  // quand même remet le compte à rebours à ce que le serveur demande.
  const renvoiEnCours = useRef(false)
  const renvoyer = async () => {
    if (reste > 0 || renvoiEnCours.current) return
    renvoiEnCours.current = true
    try {
      const e = await p.renvoyer()
      setEnvoi(e)
      setReste(e.renvoiSecondes)
      setErreur(null)
      setCode('')
      setFocus((f) => f + 1)
    } catch (e) {
      if (!(e instanceof ErreurTropDeRequetes)) throw e
      setReste(e.reessayerDans ?? envoi.renvoiSecondes)
    } finally {
      renvoiEnCours.current = false
    }
  }
  return {
    code,
    envoi,
    erreur,
    estBloque,
    reste,
    enCours,
    pret: code.length === 6 && !enCours && !estBloque,
    focus,
    saisir: (v) => {
      setCode(v.replace(/\D/g, '').slice(0, 6))
      if (erreur && !estBloque) setErreur(null)
    },
    valider,
    renvoyer,
  }
}

// Envoi d'un code depuis un écran (« Recevoir le code », « Continuer », « renvoyer le SMS »…) : un envoi par geste.
// Un deuxième toucher pendant l'envoi ne renvoie rien. Avant la fin du délai de renvoi (renvoiSecondes du dernier
// envoi ; le serveur répondrait 429 trop_tot) : le même envoi redemandé (retour en arrière, puis le même bouton)
// reprend le code déjà parti, qui marche encore ; un renvoi demandé exprès ({ renvoi: true }) n'envoie rien (null).
export const RENVOI_TROP_TOT = 'Un code vient de partir : attends un peu avant d’en demander un autre.'
export function useEnvoiCode() {
  const enCours = useRef(false)
  const dernier = useRef<{ cle: string; envoi: EnvoiCode; prochain: number } | null>(null)
  return useCallback(async (cle: string, envoyer: () => Promise<EnvoiCode>, o?: { renvoi?: boolean }): Promise<EnvoiCode | null> => {
    if (enCours.current) return null
    const d = dernier.current
    const reste = d ? Math.ceil((d.prochain - Date.now()) / 1000) : 0
    if (d && reste > 0) {
      if (o?.renvoi) return null
      if (d.cle === cle) return { ...d.envoi, renvoiSecondes: reste }
    }
    enCours.current = true
    try {
      const envoi = await envoyer()
      dernier.current = { cle, envoi, prochain: Date.now() + envoi.renvoiSecondes * 1000 }
      return envoi
    } finally {
      enCours.current = false
    }
  }, [])
}

// Les six cases du prototype (.otp), avec le vrai champ posé dessus.
export function CasesCode({ s }: { s: Saisie }) {
  const { t } = usePreferences()
  const champ = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (s.focus) champ.current?.focus()
  }, [s.focus])
  return (
    <div className="otp-saisie">
      <div className={'otp' + (s.erreur ? ' cl03-err' : '')} aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={i < s.code.length ? 'f' : i === s.code.length && !s.estBloque ? 'cur' : ''}>
            {s.code[i] ?? ''}
          </span>
        ))}
      </div>
      <input
        ref={champ}
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        aria-label={t('Code à 6 chiffres')}
        disabled={s.estBloque}
        value={s.code}
        onChange={(e) => s.saisir(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && s.valider()}
      />
    </div>
  )
}

// La ligne sous les cases : erreur, ou délai avant de renvoyer, ou « Renvoyer le code ».
export function MessageCode({ s }: { s: Saisie }) {
  const { t } = usePreferences()
  return (
    <div className={'cl03-otpm' + (s.erreur ? ' err' : '')} role={s.erreur ? 'alert' : undefined}>
      {s.erreur ??
        (s.reste > 0 ? (
          t('Renvoyer le code dans ') + `${Math.floor(s.reste / 60)}:${String(s.reste % 60).padStart(2, '0')}`
        ) : (
          <button type="button" className="cl03-link" onClick={s.renvoyer} style={{ background: 'none', border: 0, margin: '0 auto' }}>
            {t('Renvoyer le code')}
          </button>
        ))}
    </div>
  )
}

// Démonstration seulement : le code à saisir (l'API ne le renvoie jamais).
export function CodeDemo({ s }: { s: Saisie }) {
  const { t } = usePreferences()
  if (!s.envoi.codeDemo) return null
  return (
    <div className="mt16">
      <Note ton="amber" icone="info">
        {t('Démonstration : le code est ') + s.envoi.codeDemo + '.'}
      </Note>
    </div>
  )
}

export function SaisieCode(p: {
  titre: string // « Entre le code reçu par SMS »
  envoi: EnvoiCode
  modifier?: ReactNode // lien « Modifier » après la destination
  bouton: string
  valider: (code: string) => Promise<ResultatCode>
  renvoyer: () => Promise<EnvoiCode>
  reussi: (r: Extract<ResultatCode, { ok: true }>) => void
}) {
  const { t } = usePreferences()
  const s = useSaisieCode(p)
  return (
    <>
      <h1 className="pg-t">{t(p.titre)}</h1>
      <p className="pg-s">
        {t('Envoyé à ') + s.envoi.destination + '. '}
        {p.modifier}
      </p>
      <CasesCode s={s} />
      <MessageCode s={s} />
      <div className="mt16">
        <Bouton icone="check" inactif={!s.pret} onClick={s.valider}>
          {t(p.bouton)}
        </Bouton>
      </div>
      <div className="hint-l">
        <Icone nom="clock" taille={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{t('Le code marche ') + s.envoi.valideMinutes + t(' minutes.')}</span>
      </div>
      <CodeDemo s={s} />
    </>
  )
}
