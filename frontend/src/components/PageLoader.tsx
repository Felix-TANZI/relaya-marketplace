// frontend/src/components/PageLoader.tsx
// Repli affiché pendant le chargement paresseux (React.lazy) d'une page.
//
// anim_06 — "L'ouverture de l'app" (voir 05_Propositions_animations/
// Ile_BelivaY_propositions_animees.html, tuile #dSpl : "Le vrai logo arrive
// en roulant, se pose avec un léger balancement, puis le nom se dévoile à sa
// droite."). Ce composant est le seul écran affiché avant que la première
// page ne soit prête (chargement initial de l'app, cf. AppLayout.tsx) — il
// remplace l'ancien spinner générique par le vrai logo BelivaY en fade+scale.
// Il sert aussi de repli pour les transitions entre pages lazy-loadées
// suivantes : un habillage identique et léger, cohérent partout.

export default function PageLoader() {
  return (
    <div className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-4">
      <img
        src="/belivay-logo.png"
        alt="BelivaY"
        className="belivay-splash-logo h-10 w-auto object-contain"
      />
      <div className="h-1 w-28 overflow-hidden rounded-full bg-primary/15">
        <div className="belivay-splash-bar-fill h-full w-1/3 rounded-full bg-primary" />
      </div>
    </div>
  );
}
