// Affichage d'un compte à rebours de vente (ventes flash, accueil) : chaque chiffre dans sa case, pour que le
// chiffre qui change roule doucement (src/styles/animations.css, seulement sous html[data-mouv]) ; le texte reste
// « HH:MM:SS ». Urgence : moins d'une heure (« proche »), moins de dix minutes (« imminent »).
const deux = (n: number) => (n < 10 ? '0' : '') + n
const anime = () => typeof document !== 'undefined' && document.documentElement.dataset.mouv === '1'

export function Chrono({ secondes, classe = 'h0-cd' }: { secondes: number; classe?: string }) {
  const s = Math.max(0, secondes)
  const texte = deux(Math.floor(s / 3600)) + ':' + deux(Math.floor((s % 3600) / 60)) + ':' + deux(s % 60)
  const urgence = s === 0 ? 'fini' : s < 600 ? 'imminent' : s < 3600 ? 'proche' : 'calme'
  // Sans animations (réglage, navigateur piloté), le texte reste d'un seul tenant : rendu identique à l'origine.
  if (!anime())
    return (
      <span className={classe} data-s={s} role="timer">
        {texte}
      </span>
    )
  return (
    <span className={classe + ' blv-chrono'} data-s={s} data-urgence={urgence} aria-label={texte} role="timer">
      {texte.split('').map((c, i) =>
        c === ':' ? (
          <span key={'p' + i} className="blv-chrono-p" aria-hidden="true">
            :
          </span>
        ) : (
          <span key={i + '-' + c} className="blv-chrono-c" aria-hidden="true">
            {c}
          </span>
        ),
      )}
    </span>
  )
}

/** Chiffres d'une case (tuiles « HEURES / MIN / SEC ») : chaque chiffre roule quand il change. */
export function Chiffres({ texte }: { texte: string }) {
  if (!anime()) return <>{texte}</>
  return (
    <>
      {texte.split('').map((c, i) => (
        <span key={i + '-' + c} className="blv-chrono-c">
          {c}
        </span>
      ))}
    </>
  )
}

export const urgenceDe = (s: number) => (s <= 0 ? 'fini' : s < 600 ? 'imminent' : s < 3600 ? 'proche' : 'calme')
