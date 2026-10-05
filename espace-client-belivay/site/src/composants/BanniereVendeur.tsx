// Bannière vendeur (Mon compte, Menu) en relief, au niveau de la carte orange du compte (consigne du porteur) :
// dégradé, reflet, ombre portée, boutique dessinée en volume, inclinaison au survol (ordinateur) et appui qui
// s'enfonce (téléphone). Deux variantes : « devenir vendeur » (pas de boutique) et « boutique ouverte ». Même lien
// (/devenir-vendeur), même place, mêmes textes que la bannière .vd-ban d'origine. Styles : fin de site.css.
import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

// Boutique en volume : auvent rayé, façade, vitrine, porte ; enseigne « ouvert » allumée pour la boutique ouverte.
function Boutique3D({ ouverte }: { ouverte: boolean }) {
  const u = 'vd3' + useId().replace(/[^\w]/g, '')
  return (
    <svg className="vd3-svg" viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
      <defs>
        <linearGradient id={u + 'mur'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#DDEFEB" />
        </linearGradient>
        <linearGradient id={u + 'cote'} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#B9DCD5" />
          <stop offset="1" stopColor="#8FC4BA" />
        </linearGradient>
        <linearGradient id={u + 'vitre'} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={ouverte ? '#FFE3A6' : '#BFE8F0'} />
          <stop offset="1" stopColor={ouverte ? '#FFB547' : '#6CB9C9'} />
        </linearGradient>
      </defs>
      <ellipse cx="31" cy="58" rx="24" ry="3.6" fill="rgba(0,0,0,.22)" />
      {/* Façade et côté */}
      <path d="M9 27h40v29H9z" fill={`url(#${u}mur)`} />
      <path d="M49 27l7-4v29l-7 4z" fill={`url(#${u}cote)`} />
      {/* Vitrine et porte */}
      <rect x="13" y="33" width="17" height="13" rx="2" fill={`url(#${u}vitre)`} />
      <path d="M14.5 34.5l6 0-5 9" stroke="rgba(255,255,255,.75)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <rect x="34" y="33" width="11" height="23" rx="2" fill="#0F766E" />
      <circle cx="42.2" cy="45" r="1.1" fill="#FFD27A" />
      {/* Auvent rayé en volume */}
      <path d="M6 18h46l4-4H12z" fill="#F7A04A" />
      <path d="M6 18h46v6a4 4 0 0 1-5.75 3.6A4 4 0 0 1 40.5 27a4 4 0 0 1-5.75.6A4 4 0 0 1 29 27a4 4 0 0 1-5.75.6A4 4 0 0 1 17.5 27a4 4 0 0 1-5.75.6A4 4 0 0 1 6 24z" fill="#EA6C1F" />
      <path d="M13.7 18h7.6v9.4a4 4 0 0 1-3.8-.4 4 4 0 0 1-3.8 0zM29 18h7.7v9.4a4 4 0 0 1-3.9-.4 4 4 0 0 1-3.8 0zM44.4 18H52v6a4 4 0 0 1-3.8 3.9 4 4 0 0 1-3.8-.4z" fill="#FFF4E8" />
      <path d="M52 18l4-4v6l-4 4z" fill="#C94E0E" />
      {ouverte ? (
        <g>
          <rect x="16" y="5" width="26" height="8" rx="4" fill="#FFD27A" />
          <circle cx="21" cy="9" r="1.8" fill="#16A34A" />
          <rect x="25" y="8" width="13" height="2" rx="1" fill="#7C4A03" />
        </g>
      ) : (
        <g fill="#FFE7B0">
          <path d="M50 3.5l1.3 3.2 3.2 1.3-3.2 1.3L50 12.5l-1.3-3.2-3.2-1.3 3.2-1.3z" />
          <circle cx="57.5" cy="13" r="1.6" />
        </g>
      )}
    </svg>
  )
}

export function BanniereVendeur({ ouverte, titre, sous, action }: { ouverte: boolean; titre: ReactNode; sous: ReactNode; action: ReactNode }) {
  return (
    <Link to="/devenir-vendeur" className={'vd-ban vd3' + (ouverte ? ' ouverte' : '')}>
      <span className="i">
        <Boutique3D ouverte={ouverte} />
      </span>
      <span>
        <b>{titre}</b>
        <small>{sous}</small>
      </span>
      <span className="go">{action}</span>
    </Link>
  )
}
