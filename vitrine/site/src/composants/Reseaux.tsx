// Réseaux sociaux officiels et coordonnées de BelivaY (config/coordonnees.ts, remplaçables par le serveur) :
// pastilles d'icônes (pied de page, Aide, plan du site) et bloc « Nous contacter » (téléphone, e-mail, adresse,
// WhatsApp). Liens externes : nouvel onglet, sans référent ni accès à la page d'origine.
import type { NomReseau } from '../config/coordonnees'
import { usePreferences } from '../preferences'
import { useCoordonnees } from './contenus'
import { Icone } from './Icone'

// Logos des marques (pleins, 24 × 24) : Lucide n'en a pas pour TikTok, et ceux de Facebook et Instagram y sont dépréciés.
const LOGOS: Record<NomReseau, string> = {
  facebook: 'M13.5 21.5v-8.2h2.8l.4-3.3h-3.2V7.9c0-.9.3-1.6 1.6-1.6h1.7V3.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H7.3v3.3h2.8v8.2z',
  instagram:
    'M12 3.6c2.7 0 3 0 4.1.1 1 0 1.5.2 1.9.3.5.2.8.4 1.2.8.4.4.6.7.8 1.2.1.4.3.9.3 1.9.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c0 1-.2 1.5-.3 1.9-.2.5-.4.8-.8 1.2-.4.4-.7.6-1.2.8-.4.1-.9.3-1.9.3-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-1 0-1.5-.2-1.9-.3-.5-.2-.8-.4-1.2-.8-.4-.4-.6-.7-.8-1.2-.1-.4-.3-.9-.3-1.9-.1-1.1-.1-1.4-.1-4.1s0-3 .1-4.1c0-1 .2-1.5.3-1.9.2-.5.4-.8.8-1.2.4-.4.7-.6 1.2-.8.4-.1.9-.3 1.9-.3 1.1-.1 1.4-.1 4.1-.1M12 2c-2.7 0-3.1 0-4.1.1-1.1 0-1.8.2-2.4.5-.7.3-1.2.6-1.8 1.2S2.8 4.9 2.6 5.5c-.3.6-.4 1.4-.5 2.4C2 8.9 2 9.3 2 12s0 3.1.1 4.1c0 1.1.2 1.8.5 2.4.3.7.6 1.2 1.2 1.8s1.1.9 1.8 1.2c.6.2 1.4.4 2.4.5 1.1.1 1.4.1 4.1.1s3.1 0 4.1-.1c1.1 0 1.8-.2 2.4-.5.7-.3 1.2-.6 1.8-1.2s.9-1.1 1.2-1.8c.2-.6.4-1.4.5-2.4.1-1.1.1-1.4.1-4.1s0-3.1-.1-4.1c0-1.1-.2-1.8-.5-2.4-.3-.7-.6-1.2-1.2-1.8S19.1 2.8 18.4 2.6c-.6-.2-1.4-.4-2.4-.5C15.1 2 14.7 2 12 2zm0 4.9a5.1 5.1 0 1 0 0 10.2 5.1 5.1 0 0 0 0-10.2zm0 8.5a3.4 3.4 0 1 1 0-6.8 3.4 3.4 0 0 1 0 6.8zm5.3-9.9a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z',
  tiktok: 'M16.6 2.5h-3.1v12.9a2.8 2.8 0 1 1-2.8-2.8c.3 0 .6 0 .8.1V9.5a6 6 0 1 0 5.1 5.9V8.9a7.5 7.5 0 0 0 4.4 1.4V7.2a4.4 4.4 0 0 1-4.4-4.4z',
}

export function LogoReseau({ nom, taille = 18 }: { nom: NomReseau; taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={LOGOS[nom]} />
    </svg>
  )
}

// Pastilles des réseaux (« Nous suivre »).
export function Reseaux({ classe = '' }: { classe?: string }) {
  const { t, tf } = usePreferences()
  const c = useCoordonnees()
  return (
    <ul className={('rs-liens ' + classe).trim()} aria-label={t('Nous suivre')}>
      {c.reseaux.map((r) => (
        <li key={r.nom}>
          <a className={'rs-' + r.nom} href={r.url} target="_blank" rel="noopener noreferrer" aria-label={tf('BelivaY sur {r} (nouvel onglet)', { r: r.libelle })} title={r.libelle}>
            <LogoReseau nom={r.nom} />
          </a>
        </li>
      ))}
    </ul>
  )
}

// Coordonnées officielles en liste (téléphone, e-mail, adresse) et bouton WhatsApp.
export function Contacts({ whatsapp = true }: { whatsapp?: boolean }) {
  const { t } = usePreferences()
  const c = useCoordonnees()
  return (
    <div className="rs-contacts">
      <ul>
        <li>
          <Icone nom="phone" taille={16} />
          <a href={c.telephoneLien} aria-label={t('Appeler BelivaY') + ' ' + c.telephone}>
            <span className="nw">{c.telephone}</span>
          </a>
        </li>
        <li>
          <Icone nom="mail" taille={16} />
          <a href={'mailto:' + c.email}>{c.email}</a>
        </li>
        <li>
          <Icone nom="map-pin" taille={16} />
          <span>{t(c.adresse)}</span>
        </li>
      </ul>
      {whatsapp && (
        <a className="rs-wa" href={c.whatsapp} target="_blank" rel="noopener noreferrer">
          <Icone nom="message-circle" taille={17} />
          <span>{t('Contacter sur WhatsApp')}</span>
        </a>
      )}
    </div>
  )
}
