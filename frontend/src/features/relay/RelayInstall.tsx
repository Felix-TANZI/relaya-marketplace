/**
 * Installer l'application — mettre BelivaY Relais sur l'écran d'accueil.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUE L'INSTALLATION APPORTE VRAIMENT, AUJOURD'HUI
 *
 * Une icône, un démarrage direct, et un plein écran sans barre d'adresse.
 * C'est réel, et c'est déjà beaucoup pour quelqu'un qui ouvre le portail
 * trente fois par jour.
 *
 * Elle n'apporte PAS le hors-ligne. Aucun service worker n'est enregistré :
 * sans réseau, l'application installée ne démarre pas. `offlineCache` ne
 * sert que dans une session déjà ouverte, et le portail relais n'alimente
 * pas la file d'envoi différé.
 *
 * Elle n'apporte pas non plus les notifications : aucune infrastructure push
 * n'existe (ni FCM, ni web push, ni jeton d'appareil).
 *
 * Les trois arguments affichés sont donc ceux qui tiennent. Promettre le
 * hors-ligne ferait perdre une réception à quelqu'un pendant une coupure —
 * et c'est exactement sur cette promesse qu'il aurait installé.
 */
import { useEffect, useState } from "react";
import { Bell, Download, Gauge, Maximize2, WifiOff } from "lucide-react";

/**
 * L'evenement que Chrome emet quand l'application est installable.
 *
 * Il n'est pas dans les types du DOM : on le decrit ici plutot que de
 * basculer en `any`, qui masquerait une faute de frappe sur `prompt`.
 */
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
import type { LucideIcon } from "lucide-react";

type Plateforme = "iphone" | "android";

const ETAPES: Record<Plateforme, Array<{ titre: string; detail: string }>> = {
  iphone: [
    { titre: "Ouvrez ce lien dans Safari", detail: "L'installation n'est possible que depuis Safari" },
    { titre: "Touchez le bouton Partager", detail: "Le carré avec une flèche, en bas de l'écran" },
    { titre: "« Sur l'écran d'accueil »", detail: "Faites défiler la liste si besoin" },
    { titre: "Touchez « Ajouter »", detail: "L'icône BelivaY apparaît sur votre écran" },
  ],
  android: [
    {
      titre: "Touchez « Installer » ci-dessous",
      detail: "Ou le menu ⋮ de Chrome → « Installer l'application »",
    },
    { titre: "Confirmez", detail: "L'icône BelivaY apparaît dans vos applications" },
  ],
};

/**
 * Pourquoi l'installer — les raisons qui tiennent AUJOURD'HUI.
 *
 * La maquette en annonce trois autres : « marche sans réseau »,
 * « notifications » et « moins de 5 Mo ». Les deux premières décrivent des
 * mécanismes absents ; la troisième est un poids que personne n'a mesuré.
 */
const RAISONS: Array<{ icon: LucideIcon; titre: string; detail: string }> = [
  {
    icon: Maximize2,
    titre: "Plein écran",
    detail: "Sans barre d'adresse : plus de place pour les colis et les codes",
  },
  {
    icon: Gauge,
    titre: "Ouverture directe",
    detail: "Une icône sur l'écran d'accueil, sans passer par le navigateur",
  },
  {
    icon: Bell,
    titre: "Toujours la bonne adresse",
    detail: "Plus de lien à retrouver, ni de mauvais portail ouvert par erreur",
  },
];

export default function RelayInstall() {
  const [plateforme, setPlateforme] = useState<Plateforme>(
    // On ouvre sur le telephone du gerant : lui faire choisir sa propre
    // plateforme est une question dont il a deja la reponse.
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "iphone" : "android",
  );

  /**
   * Chrome ne propose l'installation que s'il juge l'application installable.
   *
   * Aujourd'hui il ne le fera PAS : ses criteres exigent un service worker
   * avec un gestionnaire `fetch`, et aucun n'est enregistre. On capte quand
   * meme l'evenement — le jour ou le service worker arrive, le bouton
   * s'allume tout seul — et sans lui on renvoie au menu de Chrome.
   */
  const [invite, setInvite] = useState<InstallPrompt | null>(null);
  const [installe, setInstalle] = useState(false);

  useEffect(() => {
    const capter = (evenement: Event) => {
      evenement.preventDefault();
      setInvite(evenement as InstallPrompt);
    };
    const pose = () => setInstalle(true);
    window.addEventListener("beforeinstallprompt", capter);
    window.addEventListener("appinstalled", pose);
    return () => {
      window.removeEventListener("beforeinstallprompt", capter);
      window.removeEventListener("appinstalled", pose);
    };
  }, []);

  const installer = async () => {
    if (!invite) return;
    await invite.prompt();
    const choix = await invite.userChoice;
    if (choix.outcome === "accepted") setInstalle(true);
    // L'invite ne se rejoue pas : Chrome n'en emet qu'une par chargement.
    setInvite(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center pt-1">
        <span className="flex h-[76px] w-[76px] items-center justify-center rounded-[20px] bg-white shadow-[0_4px_16px_rgba(60,35,15,.12)] dark:bg-slate-900">
          <img src="/belivay-logo.png" alt="" className="h-9 w-auto object-contain dark:brightness-0 dark:invert" />
        </span>
        <h2 className="mt-4 text-center text-[23px] font-black leading-[1.14] tracking-[-0.03em] text-slate-900 dark:text-white">
          Installer BelivaY Relais
        </h2>
        <p className="mt-1.5 text-center text-[14px] font-medium leading-snug text-slate-500 dark:text-slate-400">
          Une icône sur l'écran d'accueil, sans passer par un store
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Téléphone"
        className="grid grid-cols-2 gap-1 rounded-[14px] bg-[#E8EDF8] p-1 dark:bg-slate-800/70"
      >
        {(["iphone", "android"] as Plateforme[]).map((item) => {
          const on = item === plateforme;
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setPlateforme(item)}
              className={`rounded-[11px] px-2 py-2.5 text-[14px] font-bold leading-tight transition active:scale-[.96] ${
                on
                  ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(60,35,15,.14)] dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {item === "iphone" ? "iPhone" : "Android"}
            </button>
          );
        })}
      </div>

      <section className="rounded-[14px] border border-slate-200 bg-white px-4 pb-2 pt-2 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <ol className="divide-y divide-slate-100 dark:divide-slate-800">
          {ETAPES[plateforme].map((etape, index) => (
            <li key={etape.titre} className="flex items-start gap-3 px-1 py-3.5">
              <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-[#2456D6] text-[14px] font-black text-white">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                  {etape.titre}
                </span>
                <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                  {etape.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>

        {plateforme === "android" ? (
          <div className="px-1 pb-3 pt-1">
            <button
              type="button"
              onClick={() => void installer()}
              disabled={!invite || installe}
              className="pr-btn flex w-full items-center justify-center gap-2.5 rounded-[12px] px-4 py-3.5 text-[16px] font-black text-white transition active:scale-[.97] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none dark:disabled:from-slate-700 dark:disabled:to-slate-700"
            >
              <Download size={18} strokeWidth={2.4} />
              {installe ? "Déjà installée" : "Installer"}
            </button>
            {/* Sans invite captee, le bouton ne peut rien faire : on dit ou
                aller plutot que de laisser appuyer dans le vide. */}
            {!invite && !installe ? (
              <p className="mt-2 text-center text-[12.5px] font-medium leading-snug text-slate-400 dark:text-slate-500">
                Votre navigateur ne propose pas l'installation directe. Passez par le menu ⋮ de
                Chrome → « Installer l'application ».
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-[14px] border border-slate-200 bg-white px-4 pb-2 pt-4 shadow-[0_1px_2px_rgba(60,35,15,.05),0_8px_24px_-12px_rgba(60,35,15,.16)] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="px-1 text-[17px] font-black tracking-[-0.02em] text-slate-900 dark:text-white">
          Pourquoi l'installer
        </h3>
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
          {RAISONS.map((raison) => (
            <li key={raison.titre} className="flex items-start gap-3 px-1 py-3.5">
              <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[11px] bg-[#EAF0FF] text-[#2456D6] dark:bg-blue-950/50 dark:text-blue-300">
                <raison.icon size={19} strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-black leading-tight text-slate-900 dark:text-white">
                  {raison.titre}
                </span>
                <span className="mt-1 block text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
                  {raison.detail}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/*
        Ce que l'installation ne donne PAS.

        Aucun service worker n'est enregistre : sans reseau, l'application
        installee ne demarre pas. Et aucune infrastructure push n'existe. Le
        taire ferait installer quelqu'un POUR ces deux raisons, et c'est
        pendant une coupure qu'il s'en apercevrait.
      */}
      <p className="flex items-start gap-2.5 rounded-[14px] bg-[#FFF4D6] px-4 py-3.5 text-[13px] font-medium leading-[1.55] text-[#8A5A00] dark:bg-amber-950/30 dark:text-amber-200">
        <WifiOff size={18} strokeWidth={2.2} className="mt-[2px] flex-shrink-0" />
        L'installation ne rend pas encore l'application utilisable sans réseau, et n'active pas les
        notifications : les deux arrivent. Gardez un registre papier pour les coupures.
      </p>
    </div>
  );
}
