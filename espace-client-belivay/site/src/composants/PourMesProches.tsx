// Accueil d'un compte diaspora (DP-54) : la carte « Pour mes proches », sous l'en-tête (qui reste intact). Ce que
// le compte attend (paniers à payer), ses proches reliés et le raccourci pour faire leurs courses.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { chemin } from '../config/pages'
import { source, type LienFamille } from '../donnees/source'
import { usePreferences } from '../preferences'
import { Icone } from './Icone'

export function PourMesProches() {
  const { t, tf } = usePreferences()
  const [d, setD] = useState<{ liens: LienFamille[]; aPayer: number } | null>(null)
  useEffect(() => {
    Promise.all([source.liensFamille(), source.demandesProches()]).then(([l, r]) => setD({ liens: l.liens.filter((x) => x.etat === 'actif'), aPayer: r.demandes.filter((x) => x.sens === 'recue' && x.etat === 'attente').length }))
  }, [])
  if (!d) return null
  return (
    <section className="card" style={{ marginTop: 14 }}>
      <div className="row" style={{ gap: 10 }}>
        <span className="ic-sq or">
          <Icone nom="globe" taille={20} />
        </span>
        <span className="grow">
          <b className="t15 b8" style={{ display: 'block' }}>
            {t('Pour mes proches')}
          </b>
          <span className="t13 c3">{d.liens.length ? tf('{n} proche(s) relié(s) au Cameroun', { n: d.liens.length }) : t('Relie un proche au Cameroun pour lui faire livrer ses courses')}</span>
        </span>
      </div>
      {d.aPayer > 0 && (
        <Link to={chemin('paniers-proches')} className="note amber" style={{ marginTop: 10 }}>
          <Icone nom="inbox" taille={18} />
          <div>{tf('{n} panier(s) envoyé(s) par tes proches à payer', { n: d.aPayer })}</div>
        </Link>
      )}
      <div className="chips">
        {d.liens.slice(0, 3).map((l) => (
          <Link key={l.id} className="chip" to={chemin('commander-pour', { lien: l.id })}>
            {tf('Courses pour {p}', { p: l.prenom })}
          </Link>
        ))}
        <Link className="chip" to={chemin(d.liens.length ? 'espace-diaspora' : 'proches')}>
          {t(d.liens.length ? 'Espace diaspora' : 'Relier un proche')}
        </Link>
      </div>
    </section>
  )
}
