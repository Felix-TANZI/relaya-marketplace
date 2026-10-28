// Gabarit d'accès commun aux six applications (connexion, inscription, activation, candidature, mot de passe oublié,
// code, invitation). Refonte du 25 oct. 2026 (logique-metier/ACCES-REFERENCES.md) : une seule conception pour les six,
// la couleur et les mots de chaque acteur.
//   AccesCadre : en-tête (logo, espace, thème, FR/EN) → accroche en deux couleurs → photo de marque → carte qui la
//   chevauche (comme l'ancien belivay.com) ; sur grand écran, l'accroche et la photo à gauche, la carte posée sur la
//   photo à droite. Sous la carte : les autres espaces (Client · Vendeur · Livreur · Entreprise · Relais), la signature
//   « Notre pays, nos opportunités. » et les liens secondaires regroupés.
//   AccesChemins : en haut de la carte, les deux chemins visibles d'emblée (« Se connecter » / « Créer un compte »).
//   Dans la carte : titre court → une phrase → champs étiquetés → UN bouton principal → « ou » → fournisseurs
//   (Google, Apple : logos officiels, couleurs de leurs chartes) → liens discrets → AccesDemo (un seul compte, celui
//   de l'application ouverte, démonstration seulement).
// Couleur : --acc / --acc-txt (entreprise, livreur, relais, console), sinon --or / --or-txt (client, vendeur).
// Images attendues (aucune n'est inventée) : 16 photos 1600 × 1000 (16:10) dans site/src/assets/acces/ (client-1..3,
// diaspora-1..2, vendeur-1..3, livreur-1..2, entreprise-1..2, relais-1..2, equipe-1..2), chacune appariée à son
// accroche (compte/accroches.ts), tirée au hasard à chaque visite. Sans photo : fond de repli sobre aux couleurs de
// l'espace (logo BelivaY en filigrane). Voir logique-metier/PROMPTS-CONNEXION.md.
import chariot from '../assets/chariot-belivay.png'
import { ACCROCHES, type Paire, type Public } from './accroches'
import { LogoApple, LogoGoogle } from './logos'
export { LogoApple, LogoGoogle }
import { cloneElement, useEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react'

const CSS = `
.acc,.acc-liens,.acc-legal,.acc-ou,.acc-msg,.acc-note,.acc-tete{--ax-c:var(--acc,var(--or,#F07A2E));--ax-t:var(--acc-txt,var(--or-txt,#C2530F));--ax-ink:var(--ink,#1C1917);--ax-ink2:var(--ink-2,#44403C);--ax-mut:var(--ink-3,#5F5853);--ax-line:var(--line-2,var(--line,rgba(0,0,0,.12)));--ax-card:var(--card,#fff)}
.acc{color:var(--ax-ink);width:100%}
.acc *{box-sizing:border-box}
.acc-entete{display:flex;align-items:center;gap:10px;min-height:44px;margin:0 0 20px}
.acc-entete img{height:30px;width:auto;display:block}
.acc-espace{display:inline-flex;align-items:center;min-height:26px;padding:0 10px;border-radius:999px;font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ax-t);background:color-mix(in srgb,var(--ax-c) 12%,transparent)}
.acc-entete .acc-fin{margin-left:auto;display:flex;gap:8px;align-items:center}
.acc-tete{margin:0 0 20px}
.acc-sur{margin:0 0 6px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ax-t)}
.acc-titre{margin:0;font-size:26px;line-height:1.2;font-weight:800;letter-spacing:-.01em;color:var(--ax-ink);overflow-wrap:anywhere}
.acc-phrase{margin:8px 0 0;font-size:15px;line-height:1.5;color:var(--ax-ink2);max-width:46ch}
.acc-centre .acc-tete,.acc-centre .acc-phrase{text-align:center;margin-left:auto;margin-right:auto}
.acc-pile{display:flex;flex-direction:column;gap:12px}
.acc-pile>*{margin:0!important}
.acc .acc-pile .btn{width:100%;min-height:50px;flex:none;white-space:normal;text-align:center;line-height:1.25;padding-top:10px;padding-bottom:10px}
.acc .acc-pile .btn svg{flex:none}
.acc .acc-pile .btn>span{text-wrap:balance}
.acc .acc-pile .btn.secondary{min-height:48px;height:auto;font-size:15px;font-weight:700}
.acc .acc-pile .btn .acc-g{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#fff}
.acc-ou{display:flex;align-items:center;gap:12px;margin:20px 0;color:var(--ax-mut);font-size:13px;font-weight:600}
.acc-ou::before,.acc-ou::after{content:"";flex:1;height:1px;background:var(--ax-line)}
.acc-liens{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;column-gap:18px;row-gap:0;margin:16px 0 0;padding:0;list-style:none}
.acc-liens li{display:flex;align-items:center}
.acc-liens a,.acc-liens button{display:inline-flex;align-items:center;min-height:44px;padding:0 6px;border:0;background:none;font:inherit;font-size:14px;font-weight:700;color:var(--ax-t);text-decoration:none;cursor:pointer;border-radius:8px}
.acc-liens a:hover,.acc-liens button:hover:not(:disabled){text-decoration:underline;text-underline-offset:3px}
.acc-liens button:disabled{color:var(--ax-mut);cursor:default}
.acc a:focus-visible,.acc button:focus-visible,.acc input:focus-visible,.acc select:focus-visible,.acc textarea:focus-visible{outline:2px solid var(--ax-c);outline-offset:2px}
.acc-legal{margin:20px 0 0;font-size:12.5px;line-height:1.5;color:var(--ax-mut);text-align:center}
.acc-legal a{color:var(--ax-t);font-weight:700;text-decoration:none;display:inline-block;padding:6px 2px}
.acc-legal a:hover{text-decoration:underline}
.acc-msg{display:flex;gap:10px;align-items:flex-start;margin:12px 0 0;padding:12px 14px;border-radius:12px;font-size:14px;line-height:1.45;border:1px solid transparent}
.acc-msg svg{flex:none;margin-top:1px}
.acc-msg.err{color:var(--red,#B42318);background:color-mix(in srgb,var(--red,#B42318) 8%,transparent);border-color:color-mix(in srgb,var(--red,#B42318) 22%,transparent)}
.acc-msg.ok{color:var(--green,#1F7A4D);background:color-mix(in srgb,var(--green,#1F7A4D) 9%,transparent);border-color:color-mix(in srgb,var(--green,#1F7A4D) 22%,transparent)}
.acc-msg.info{color:var(--ax-ink2);background:color-mix(in srgb,var(--ax-c) 7%,transparent);border-color:color-mix(in srgb,var(--ax-c) 18%,transparent)}
.acc-msg b{color:inherit}
.acc-note{display:flex;gap:8px;align-items:flex-start;margin:14px 0 0;font-size:13px;line-height:1.45;color:var(--ax-mut)}
.acc-note svg{flex:none;margin-top:2px}
.acc-choix{margin:0;padding:0;border:0;display:grid;gap:10px;min-width:0}
.acc-choix-t{padding:0;margin:0 0 2px;font-size:14px;font-weight:800;color:var(--ax-ink)}
.acc-choix-l{display:flex;align-items:center;gap:12px;min-height:64px;padding:12px 14px;border:1px solid var(--ax-line);border-radius:16px;background:var(--ax-card);color:var(--ax-ink);text-decoration:none}
.acc-choix-l:hover{border-color:var(--ax-c)}
.acc-choix-l .grow{flex:1;min-width:0}
.acc-choix-l b{display:block;font-size:15.5px;font-weight:800;line-height:1.3}
.acc-choix-l small{display:block;margin-top:2px;font-size:13px;line-height:1.4;color:var(--ax-mut)}
.acc-choix-l>svg:last-child{flex:none;color:var(--ax-mut)}
.acc-choix-ic{flex:none;display:grid;place-items:center;width:40px;height:40px;border-radius:12px;color:var(--ax-t);background:color-mix(in srgb,var(--ax-c) 12%,transparent)}
.acc-plus{margin:16px 0 0;border-top:1px solid var(--ax-line)}
.acc-plus>summary{display:flex;align-items:center;min-height:44px;cursor:pointer;font-size:14px;font-weight:700;color:var(--ax-t);list-style:none}
.acc-plus>summary::-webkit-details-marker{display:none}
.acc-plus>summary::after{content:"";margin-left:auto;width:8px;height:8px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);transition:transform .15s}
.acc-plus[open]>summary::after{transform:rotate(225deg)}
.acc-plus>*:not(summary){margin-top:10px}
.acc-carte{background:var(--ax-card);border:1px solid var(--ax-line);border-radius:16px;padding:20px}
.acc-etapes{margin:0 0 20px;container-type:inline-size}
.acc-etapes-t{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;margin:0 0 8px;font-size:13px;line-height:1.35;color:var(--ax-mut)}
.acc-etapes-t b{color:var(--ax-ink);font-weight:800}
.acc-etapes ol{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;margin:0;padding:0;list-style:none}
.acc-etapes li{min-width:0}
.acc-etapes li i{display:block;height:6px;border-radius:999px;background:var(--ax-line)}
.acc-etapes li.fait i{background:color-mix(in srgb,var(--ax-c) 55%,transparent)}
.acc-etapes li.cur i{background:var(--ax-c)}
.acc-etapes li span{display:none;margin-top:6px;font-size:12px;line-height:1.3;font-weight:700;color:var(--ax-mut);hyphens:manual;-webkit-hyphens:manual;overflow-wrap:normal;word-break:keep-all}
.acc-etapes li.cur span{color:var(--ax-t)}
@container (min-width:520px){.acc-etapes li span{display:block}}
`

/** Styles du gabarit (une balise par page ; le navigateur les fusionne). */
export function AccesStyles() {
  return <style>{CSS}</style>
}

/** Racine d'une page d'accès : styles + couleur de l'application. `centre` centre le titre (écrans de code, PIN). */
export function Acces({ children, centre, style, className }: { children: ReactNode; centre?: boolean; style?: CSSProperties; className?: string }) {
  return (
    <div className={'acc' + (centre ? ' acc-centre' : '') + (className ? ' ' + className : '')} style={style}>
      <AccesStyles />
      {children}
    </div>
  )
}

/** En-tête compact du téléphone : logo BelivaY (forme normale, jamais animé) et nom de l'espace ; à droite, thème et langue. */
export function AccesEntete({ logo, espace, fin, mobileSeul }: { logo: string; espace?: string; fin?: ReactNode; mobileSeul?: boolean }) {
  return (
    <div className={'acc-entete' + (mobileSeul ? ' mobile' : '')}>
      <img src={logo} alt="BelivaY" />
      {espace && <span className="acc-espace">{espace}</span>}
      {fin && <span className="acc-fin">{fin}</span>}
    </div>
  )
}

/** Titre court (h1) et une phrase utile, propre à l'acteur. */
export function AccesTitre({ titre, phrase, surtitre, id, niveau = 1 }: { titre: ReactNode; phrase?: ReactNode; surtitre?: ReactNode; id?: string; niveau?: 1 | 2 }) {
  // niveau 2 : la page a déjà son titre (h1) dans l'en-tête de l'application.
  const H = niveau === 1 ? 'h1' : 'h2'
  return (
    <div className="acc-tete">
      {surtitre && <p className="acc-sur">{surtitre}</p>}
      <H className="acc-titre" id={id} tabIndex={-1}>
        {titre}
      </H>
      {phrase && <p className="acc-phrase">{phrase}</p>}
    </div>
  )
}

/**
 * Progression d'un parcours en plusieurs étapes : « Étape 2 sur 5 · Gérant » en clair, puis une barre en segments.
 * Les libellés sous les segments ne paraissent que s'il y a la place (jamais un mot coupé) ; sinon seul celui de
 * l'étape en cours, dans la ligne du haut.
 */
export function AccesEtapes({ etapes, actuelle, libelle }: { etapes: string[]; actuelle: number; libelle: (n: number, total: number) => string }) {
  return (
    <div className="acc acc-etapes">
      <AccesStyles />
      <p className="acc-etapes-t">
        <span>{libelle(actuelle, etapes.length)}</span>
        <b>{etapes[actuelle - 1]}</b>
      </p>
      <ol aria-label={libelle(actuelle, etapes.length)}>
        {etapes.map((e, i) => (
          <li key={e} className={i + 1 < actuelle ? 'fait' : i + 1 === actuelle ? 'cur' : ''} aria-current={i + 1 === actuelle ? 'step' : undefined}>
            <i />
            <span>{e}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Séparateur « ou » entre le bouton principal et les autres façons d'entrer. */
export function AccesOu({ texte }: { texte: string }) {
  return (
    <div className="acc-ou" role="separator">
      <AccesStyles />
      <span>{texte}</span>
    </div>
  )
}

/** Liens secondaires discrets (mot de passe oublié, créer un compte, aide…), centrés, espacés. */
export function AccesLiens({ label, children }: { label: string; children: ReactNode }) {
  const liens = (Array.isArray(children) ? children : [children]).flat().filter(Boolean)
  return (
    <nav aria-label={label}>
      <AccesStyles />
      <ul className="acc-liens">
        {liens.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </nav>
  )
}

const ICONES: Record<'err' | 'ok' | 'info', string> = {
  err: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  ok: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
}

/** Message annoncé aux lecteurs d'écran : erreur (alert), succès ou information (status). `annonce={false}` : un
 * récapitulatif dont chaque erreur est déjà annoncée sous son champ. */
export function AccesMessage({ ton = 'err', children, id, annonce = true }: { ton?: 'err' | 'ok' | 'info'; children: ReactNode; id?: string; annonce?: boolean }) {
  return (
    <>
      <AccesStyles />
      <div id={id} className={'acc-msg ' + ton} role={annonce ? (ton === 'err' ? 'alert' : 'status') : undefined}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONES[ton] }} />
        <span>{children}</span>
      </div>
    </>
  )
}

/** Petite ligne d'explication (sécurité, délai…), discrète. */
export function AccesNote({ children }: { children: ReactNode }) {
  return (
    <>
      <AccesStyles />
      <p className="acc-note">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span>{children}</span>
      </p>
    </>
  )
}

/** Mention légale en pied (conditions, confidentialité). */
export function AccesLegal({ children }: { children: ReactNode }) {
  return (
    <>
      <AccesStyles />
      <p className="acc-legal">{children}</p>
    </>
  )
}


// ── Cadre des pages d'accès ──────────────────────────────────────────────────────────────────────────────────────

export type Acteur = 'client' | 'vendeur' | 'entreprise' | 'livreur' | 'relais' | 'admin'
type Reglages = { langue: string; theme: string; setLangue: (l: 'fr' | 'en') => void; setTheme: (t: 'light' | 'dark') => void }

const CADRE = `
.axc{--ax-c:var(--acc,var(--or,#F07A2E));--ax-t:var(--acc-txt,var(--or-txt,#C2530F));--ax-ink:var(--ink,#1C1917);--ax-ink2:var(--ink-2,#44403C);--ax-mut:var(--ink-3,#5F5853);--ax-line:var(--line-2,var(--line,rgba(0,0,0,.12)));--ax-card:var(--card,#fff);
 color:var(--ax-ink);width:100%;max-width:560px;margin:0 auto;padding:4px 0 28px;box-sizing:border-box}
.axc *{box-sizing:border-box}
.axc-haut{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-height:48px;margin:0 0 14px}
.axc-haut .axc-esp{display:none}
.axc-sur{margin:0 0 10px}
.axc-haut>img{height:28px;width:auto;display:block}
.axc-retour{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;margin-left:-10px;border:0;background:none;color:var(--ax-ink);border-radius:12px;text-decoration:none}
.axc-esp{display:inline-flex;align-items:center;min-width:0;min-height:26px;padding:2px 10px;border-radius:999px;font-size:12px;line-height:1.2;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ax-t);background:color-mix(in srgb,var(--ax-c) 12%,transparent)}
.axc-regl{margin-left:auto;display:flex;gap:8px;align-items:center}
.axc-pill{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:44px;min-height:44px;padding:0 12px;border-radius:999px;border:1px solid var(--ax-line);background:var(--ax-card);color:var(--ax-ink);font:inherit;font-size:13px;font-weight:800;cursor:pointer}
.axc-pill:focus-visible,.axc a:focus-visible,.axc button:focus-visible{outline:2px solid var(--ax-c);outline-offset:2px}
.axc-vitrine{display:contents}
.axc-accroche{margin:2px 0 0;font-size:30px;line-height:1.12;font-weight:800;letter-spacing:-.02em;color:var(--ax-ink);text-wrap:balance;overflow-wrap:break-word}
.axc-accroche span{display:block;color:var(--ax-t)}
.axc-phrase{margin:10px 0 0;font-size:15px;line-height:1.5;color:var(--ax-ink2);max-width:52ch}
.axc-photo{position:relative;margin:18px 0 0;border-radius:22px;overflow:hidden;width:100%;aspect-ratio:16/10;max-height:340px;isolation:isolate;
 background:radial-gradient(60% 80% at 85% 10%,color-mix(in srgb,var(--ax-c) 45%,transparent) 0%,transparent 70%),linear-gradient(140deg,#1A1511 0%,#2A1E15 55%,color-mix(in srgb,var(--ax-c) 40%,#1A1511) 100%);background-color:#1A1511}
.axc-photo>img.ph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1}
.axc-photo>.wm{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);width:min(46%,300px);height:auto;opacity:.92;z-index:-1;pointer-events:none}
.axc-photo>.wm2{position:absolute;right:-8%;bottom:-30%;width:min(70%,420px);height:auto;opacity:.07;z-index:-1;pointer-events:none;filter:grayscale(1) brightness(4)}
.axc-photo::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,transparent 55%,rgba(0,0,0,.28) 100%)}
.axc-carte{position:relative;z-index:1;background:var(--ax-card);border:1px solid var(--ax-line);border-radius:22px;padding:20px 18px 22px;box-shadow:0 22px 44px -24px rgba(0,0,0,.45)}
.axc-vitrine+.axc-carte{margin:-52px 8px 0}
.axc-bas{margin:26px 0 0}
.axc-espaces ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(64px,1fr));gap:4px;margin:0;padding:0;list-style:none}
.axc-espaces a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:68px;padding:8px 4px;border-radius:14px;color:var(--ax-ink2);text-decoration:none;font-size:12.5px;font-weight:700;line-height:1.2;text-align:center}
.axc-espaces a svg{color:var(--ax-t)}
.axc-espaces a:hover{background:color-mix(in srgb,var(--ax-c) 7%,transparent)}
.axc-espaces a[aria-current=page]{background:color-mix(in srgb,var(--ax-c) 12%,transparent);color:var(--ax-t);font-weight:800}
.axc-espaces h2{margin:0 0 8px;text-align:center;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ax-mut)}
.axc-sign{margin:22px 0 0;text-align:center;font-family:"Snell Roundhand","Segoe Script","Apple Chancery","Brush Script MT",cursive;font-size:25px;line-height:1.35;color:var(--ax-ink)}
.axc-pied{margin:14px 0 0}
.axc-pied .acc-liens a,.axc-pied .acc-liens button{font-size:13px;font-weight:700;color:var(--ax-mut)}
.axc-chemins{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;margin:0 0 20px;border-radius:14px;background:color-mix(in srgb,var(--ax-ink) 6%,transparent)}
.axc-chemins a,.axc-chemins button{display:flex;align-items:center;justify-content:center;min-height:44px;padding:6px 8px;border:0;border-radius:11px;background:none;font:inherit;font-size:14.5px;font-weight:800;line-height:1.2;text-align:center;color:var(--ax-mut);text-decoration:none;cursor:pointer}
.axc-chemins [aria-current=page]{background:var(--ax-card);color:var(--ax-ink);box-shadow:0 1px 3px rgba(0,0,0,.14)}
.axc-fourn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:48px;padding:8px 16px;border-radius:14px;font:inherit;font-size:15px;font-weight:600;line-height:1.25;text-align:center;text-decoration:none;cursor:pointer}
.axc-fourn svg{flex:none}
.axc-fourn.google{background:#fff;color:#1F1F1F;border:1px solid #747775}
[data-theme=dark] .axc-fourn.google{background:#131314;color:#E3E3E3;border-color:#8E918F}
.axc-fourn.apple{background:#000;color:#fff;border:1px solid #000}
[data-theme=dark] .axc-fourn.apple{background:#fff;color:#000;border-color:#fff}
.axc-fourn[aria-disabled=true],.axc-fourn.off{opacity:.6;cursor:default}
.axc-fourn:focus-visible{outline:2px solid var(--acc,var(--or,#F07A2E));outline-offset:2px}
.axc-demo{margin:18px 0 0;padding:12px 0 0;border-top:1px dashed var(--line-2,var(--line,rgba(0,0,0,.14)));text-align:center}
.axc-demo button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 14px;border:1px dashed var(--line-2,var(--line,rgba(0,0,0,.2)));border-radius:12px;background:none;font:inherit;font-size:14px;font-weight:700;color:var(--acc-txt,var(--or-txt,#C2530F));cursor:pointer}
.axc-demo button[aria-busy=true]{opacity:.6}
.axc-demo small{display:block;margin-top:6px;font-size:12.5px;color:var(--ink-3,#5F5853)}
.axc-demo .e{margin:8px 0 0;font-size:13px;font-weight:600;color:var(--red,#B42318)}
@media (max-width:419px){.axc.compact .axc-haut .axc-esp{display:none!important}}
@media (min-width:600px){.axc-accroche{font-size:36px}}
@media (max-width:1023px){.axc.compact .axc-vitrine{display:none}.axc.compact .axc-carte{margin:0}.axc.compact .axc-haut .axc-esp{display:inline-flex}.axc.sans-tete .axc-haut{display:none}}
@media (min-width:1024px){
 .axc{max-width:none;width:min(1200px,calc(100vw - 64px));margin:0 calc(50% - min(600px,50vw - 32px));padding:20px 0 40px;display:grid;grid-template-columns:minmax(0,1fr) 452px;grid-template-areas:"haut haut" "acc carte" "photo carte" "bas bas";align-items:start}
 .axc-haut{grid-area:haut;margin-bottom:22px}
 .axc-haut .axc-esp{display:inline-flex}
 .axc-sur{display:none}
 .axc-vitrine{display:contents}
 .axc-texte{grid-area:acc;padding:8px 120px 0 0}
 .axc-accroche{font-size:48px;line-height:1.06}
 .axc-phrase{font-size:17px;margin-top:14px}
 .axc-photo{grid-area:photo;margin:28px 0 0;aspect-ratio:16/10;max-height:none;border-radius:28px}
 .axc .axc-carte,.axc.compact .axc-carte{grid-area:carte;align-self:center;margin:0 0 0 -96px;padding:28px 28px 30px;border-radius:26px}
 .axc-bas{grid-area:bas;margin:36px auto 0;width:min(720px,100%)}
}
`

const ESPACES: { a: Exclude<Acteur, 'admin'>; fr: string; en: string; href: string; svg: string }[] = [
  { a: 'client', fr: 'Client', en: 'Customer', href: '/connexion', svg: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>' },
  { a: 'vendeur', fr: 'Vendeur', en: 'Seller', href: '/vendeur/connexion', svg: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>' },
  { a: 'livreur', fr: 'Livreur', en: 'Courier', href: '/livreur/connexion', svg: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/><path d="m7.5 4.27 9 5.15"/>' },
  { a: 'entreprise', fr: 'Entreprise', en: 'Company', href: '/entreprise/connexion', svg: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>' },
  { a: 'relais', fr: 'Point relais', en: 'Pickup point', href: '/relais/connexion', svg: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' },
]

function Trait({ svg, taille = 22 }: { svg: string; taille?: number }) {
  return <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
}

/** Langue de la page (les applications tiennent `lang` à jour) : les rares mots propres au cadre. */
const anglais = () => typeof document !== 'undefined' && document.documentElement.lang === 'en'
const mot = (fr: string, en: string) => (anglais() ? en : fr)

// Photos d'accès fournies par le porteur (site/src/assets/acces/<photo>.jpg|webp) ; aucune n'est inventée.
const PHOTOS = import.meta.glob('../assets/acces/*.{jpg,jpeg,webp,png}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
/** Adresse de la photo `nom` (ex. « vendeur-2 »), ou null tant qu'elle n'est pas fournie. */
export function photoAcces(nom: string): string | null {
  for (const ext of ['webp', 'jpg', 'jpeg', 'png']) {
    const u = PHOTOS[`../assets/acces/${nom}.${ext}`]
    if (u) return u
  }
  return null
}

// Tirage d'une paire par public, gardé pour toute la visite. Seules les paires dont la photo existe participent ;
// sans aucune photo, toutes (sur le fond de repli). Sous un navigateur piloté (tests), la première, pour des captures
// stables.
const TIRAGES = new Map<Public, Paire>()
export function paireAcces(qui: Public): Paire {
  const deja = TIRAGES.get(qui)
  if (deja) return deja
  const toutes = ACCROCHES[qui]
  const avecPhoto = toutes.filter((p) => photoAcces(p.photo))
  const choix = avecPhoto.length ? avecPhoto : toutes
  const pilote = typeof navigator !== 'undefined' && navigator.webdriver
  const p = choix[pilote ? 0 : Math.floor(Math.random() * choix.length)]
  TIRAGES.set(qui, p)
  return p
}

/**
 * Cadre d'une page d'accès. `public` : les paires « accroche + photo » tirées (compte/accroches.ts ; par défaut celles
 * de l'acteur, la diaspora a les siennes) ; le second morceau de l'accroche à la couleur de l'acteur.
 * `compact` : au téléphone et à la tablette, sans accroche ni photo (étapes de code, de PIN : le formulaire d'abord).
 * `pied` : liens secondaires regroupés sous la signature. `debut` : un retour (classe axc-retour) avant le logo.
 * `sansTete` : au téléphone, pas d'en-tête du cadre (la page a déjà la barre de l'application, titre et retour). La console (`admin`) ne montre pas les autres espaces.
 */
export function AccesCadre({
  acteur,
  public: qui,
  logo,
  espace,
  phrase,
  reglages,
  compact,
  pied,
  debut,
  sansTete,
  children,
}: {
  acteur: Acteur
  public?: Public
  logo: string
  espace: string
  phrase?: string
  reglages?: Reglages
  compact?: boolean
  pied?: ReactNode
  debut?: ReactNode
  sansTete?: boolean
  children: ReactNode
}) {
  const en = reglages ? reglages.langue === 'en' : anglais()
  // Paire « accroche + photo » tirée pour ce public (compte/accroches.ts) ; la console prend celles de l'équipe.
  const [paire] = useState(() => paireAcces(qui ?? (acteur === 'admin' ? 'equipe' : acteur)))
  const photo = photoAcces(paire.photo)
  const accroche = en ? paire.en : paire.fr
  const m = (fr: string, e: string) => (en ? e : fr)
  return (
    <div className={'axc' + (compact ? ' compact' : '') + (sansTete ? ' sans-tete' : '')} data-acteur={acteur} data-image-acces={paire.photo}>
      <style>{CSS + CADRE}</style>
      <div className="axc-haut">
        {debut}
        <img src={logo} alt="BelivaY" />
        <span className="axc-esp">{espace}</span>
        {reglages && (
          <span className="axc-regl">
            <button type="button" className="axc-pill" aria-pressed={reglages.theme === 'dark'} aria-label={m('Thème sombre', 'Dark theme')} onClick={() => reglages.setTheme(reglages.theme === 'dark' ? 'light' : 'dark')}>
              <Trait taille={18} svg={reglages.theme === 'dark' ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-2.93 1.41-1.41M17.66 6.34l1.41-1.41M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41"/>' : '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'} />
            </button>
            <button type="button" className="axc-pill" lang={en ? 'fr' : 'en'} aria-label={en ? 'Passer en français' : 'Switch to English'} onClick={() => reglages.setLangue(en ? 'fr' : 'en')}>
              {en ? 'EN' : 'FR'}
            </button>
          </span>
        )}
      </div>
      <div className="axc-vitrine">
        <div className="axc-texte">
          <span className="axc-esp axc-sur">{espace}</span>
          <p className="axc-accroche">
            {accroche[0]} <span>{accroche[1]}</span>
          </p>
          {phrase && <p className="axc-phrase">{phrase}</p>}
        </div>
        <div className="axc-photo" aria-hidden="true">
          {photo ? (
            <img className="ph" src={photo} alt="" width={1600} height={1000} loading="eager" decoding="async" fetchPriority="high" />
          ) : (
            <>
              <img className="wm" src={logo} alt="" />
              <img className="wm2" src={chariot} alt="" />
            </>
          )}
        </div>
      </div>
      <div className="axc-carte">{children}</div>
      <div className="axc-bas">
        {acteur !== 'admin' && (
          <nav className="axc-espaces" aria-labelledby="axc-espaces-t">
            <h2 id="axc-espaces-t">{m('Changer d’espace', 'Switch space')}</h2>
            <ul>
              {ESPACES.map((e) => (
                <li key={e.a}>
                  <a href={e.href} aria-current={e.a === acteur ? 'page' : undefined}>
                    <Trait svg={e.svg} />
                    <span>{en ? e.en : e.fr}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <p className="axc-sign" lang="fr">
          Notre pays, nos opportunités.
        </p>
        {pied && <div className="axc-pied">{pied}</div>}
      </div>
    </div>
  )
}

/** Les deux chemins, visibles d'emblée en haut de la carte : se connecter, ou créer son compte. */
export function AccesChemins({ actif, connexion, inscription, label }: { actif: 'connexion' | 'inscription'; connexion: ReactElement; inscription: ReactElement; label?: string }) {
  const marque = (el: ReactElement, ici: boolean) => cloneElement(el as ReactElement<{ 'aria-current'?: 'page' }>, { 'aria-current': ici ? 'page' : undefined })
  return (
    <nav className="axc-chemins" aria-label={label ?? mot('Se connecter ou créer un compte', 'Sign in or create an account')}>
      {marque(connexion, actif === 'connexion')}
      {marque(inscription, actif === 'inscription')}
    </nav>
  )
}

/**
 * Bouton d'un fournisseur d'identité, aux couleurs de sa charte : Google (blanc, contour gris ; sombre : #131314) et
 * Apple (noir ; sombre : blanc), même taille que les autres boutons. `texte` : « Continuer avec Google »…
 */
export function BoutonFournisseur({ fournisseur, texte, onClick, occupe, desactive }: { fournisseur: 'google' | 'apple'; texte: string; onClick: () => void; occupe?: boolean; desactive?: boolean }) {
  return (
    <button
      type="button"
      className={'axc-fourn ' + fournisseur + (occupe || desactive ? ' off' : '')}
      aria-busy={occupe || undefined}
      aria-disabled={desactive || undefined}
      onClick={() => !occupe && !desactive && onClick()}
    >
      <style>{CADRE_FOURN}</style>
      {fournisseur === 'google' ? <LogoGoogle /> : <LogoApple />}
      <span>{texte}</span>
    </button>
  )
}
const CADRE_FOURN = CADRE.split('\n').filter((l) => l.startsWith('.axc-fourn') || l.startsWith('[data-theme=dark] .axc-fourn')).join('\n')

/**
 * Le compte de démonstration de l'application ouverte, et lui seul : un bouton discret. Jamais avec l'API (l'écran ne
 * le monte qu'en démonstration). Ouvert avec « ?personnage=1 », il se connecte seul, une fois. `connecter` rend le
 * texte d'un refus, ou null.
 */
export function AccesDemo({ qui, connecter }: { qui: string; connecter: () => Promise<string | null> }) {
  const [enCours, setEnCours] = useState(false)
  const [refus, setRefus] = useState<string | null>(null)
  const auto = useRef(false)
  const lancer = async () => {
    if (enCours) return
    setEnCours(true)
    setRefus(null)
    try {
      setRefus(await connecter())
    } catch {
      setRefus(mot('La connexion n’a pas pu se faire : réessayez.', 'Sign-in failed: try again.'))
    } finally {
      setEnCours(false)
    }
  }
  useEffect(() => {
    if (auto.current || new URLSearchParams(location.search).get('personnage') !== '1') return
    auto.current = true
    void lancer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <section className="axc-demo" aria-label={mot('Démonstration', 'Demo')}>
      <style>{CADRE.split('\n').filter((l) => l.startsWith('.axc-demo')).join('\n')}</style>
      <button type="button" aria-busy={enCours} onClick={() => void lancer()}>
        <Trait taille={17} svg='<polygon points="6 3 20 12 6 21 6 3"/>' />
        <span>{enCours ? mot('Connexion…', 'Signing in…') : mot('Essayer avec le compte de démonstration', 'Try the demo account')}</span>
      </button>
      <small>{qui}</small>
      {refus && (
        <p className="e" role="alert">
          {refus}
        </p>
      )}
    </section>
  )
}
