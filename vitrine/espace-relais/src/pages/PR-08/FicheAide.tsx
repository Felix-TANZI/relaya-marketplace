// PR-08 · page ajoutée « Fiche du comptoir » (aide-fiche?id=…) : une fiche de travail ouverte depuis l'Aide —
// recevoir, remettre, garde en espèces, Mobile Money au comptoir, faire partir, constat, fermeture, sans réseau. Les
// étapes disent les règles avec les valeurs du registre (AID-02) ; « Ouvrir l'écran » mène au geste. Une fiche d'un
// geste que le membre n'a pas le droit de faire n'est pas servie (ARL-06).
import { Link, useSearchParams } from 'react-router-dom'
import { Ecran } from '../../composants/coque'
import { Icone } from '../../composants/Icone'
import { chemin } from '../../config/pages'
import { usePeutOuvrir } from '../../config/droits'
import { source } from '../../donnees/source'
import { useLecture } from '../../donnees/useLecture'
import { usePreferences } from '../../preferences'
import { Chargement, ErreurLecture, useTexte } from './commun'
import './pr08.css'

export default function FicheAide() {
  const { t, tf } = usePreferences()
  const tx = useTexte()
  const [p] = useSearchParams()
  const id = p.get('id') ?? ''
  // Enveloppe : null = lecture en cours ; { f: null } = fiche introuvable (ou d'un geste réservé au gérant).
  const l = useLecture(() => source.aide.fiche(id).then((f) => ({ f })), [id])
  const f = l.donnees?.f ?? null
  const ouvrable = usePeutOuvrir(f?.route ?? 'aide')
  if (l.erreur && !l.donnees)
    return (
      <Ecran route="aide-fiche">
        <ErreurLecture relire={l.relire} />
      </Ecran>
    )
  if (!l.donnees)
    return (
      <Ecran route="aide-fiche">
        <Chargement lignes={3} />
      </Ecran>
    )
  if (!f)
    return (
      <Ecran route="aide-fiche">
        <Introuvable />
      </Ecran>
    )
  return (
    <Ecran route="aide-fiche" titre={tx(f.titre)}>
      <div className="p-0hxmj8 r-pile">
        <div>
          <div className="r-kicker">{t('Fiche du comptoir')}</div>
          <h1 className="p-bvhkrl" style={{ marginTop: 6 }}>
            {tx(f.titre)}
          </h1>
          <div className="p-t2u0o2">{tx(f.resume)}</div>
        </div>
        <div className="p-yi6rkz">
          <ol className="pr08-etapes">
            {f.etapes.map((e, i) => (
              <li key={i}>{tx(e)}</li>
            ))}
          </ol>
          <div className="pr08-regles">{tf('Règles : {regles}', { regles: f.regles.join(', ') })}</div>
        </div>
        {ouvrable && (
          <Link className="r-btn r-principal" to={chemin(f.route)}>
            <Icone nom={f.icone} taille={20} />
            {t('Ouvrir l’écran')}
          </Link>
        )}
        <Link className="pr08-lien-bloc" to={chemin('aide')}>
          <Icone nom="r-aide" taille={18} />
          {t('Une autre question ? Revenir à l’aide')}
        </Link>
      </div>
    </Ecran>
  )
}

function Introuvable() {
  const { t } = usePreferences()
  return (
    <>
      <div className="r-vide" role="alert">
        <div className="r-vide-i">
          <Icone nom="r-document" taille={28} />
        </div>
        <h2>{t('Fiche introuvable')}</h2>
        <p>{t('Cette fiche n’existe pas, ou elle porte sur un geste réservé au gérant.')}</p>
      </div>
      <Link className="r-btn r-second" to={chemin('aide')}>
        <Icone nom="r-aide" taille={20} />
        {t('Revenir à l’aide')}
      </Link>
    </>
  )
}
