/**
 * La grille de garde, affichée au gérant.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI ELLE EST SUR L'ÉCRAN STOCK
 *
 * C'est la question qu'un client pose au comptoir, et la seule à laquelle le
 * gérant doit savoir répondre sans appeler personne : « ça me coûte combien
 * si je viens jeudi ? ». Une grille affichée sous les colis en garde met la
 * réponse là où la question se pose.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠ CETTE GRILLE EST UN AFFICHAGE, PAS LE CALCUL
 *
 * Le montant réellement facturé vient du serveur — `RelayParcel.garde_fee_due()`
 * dans `apps/shipping/models.py`, qui applique aujourd'hui : gratuit jusqu'à
 * J+3, puis 200 F par jour jusqu'à J+7.
 *
 * Les paliers ci-dessous décrivent un barème progressif différent. Tant que
 * les constantes du serveur n'ont pas été alignées, ce tableau annonce autre
 * chose que ce qui sera prélevé — et un gérant qui l'a lu donnera une réponse
 * fausse à son client. Les deux doivent être réconciliés.
 */

/** Les paliers, tels qu'ils s'affichent. */
const PALIERS: Array<{ jours: string; montant: string; tone: string }> = [
  { jours: "J1", montant: "0 F", tone: "text-[#4ADE80]" },
  { jours: "J2–J3", montant: "100 F", tone: "text-white" },
  { jours: "J4–J5", montant: "200 F", tone: "text-white" },
  { jours: "J6–J7", montant: "400 F", tone: "text-[#F0B23C]" },
];

export default function RelayGardeGrid() {
  return (
    <section
      className="overflow-hidden rounded-[18px] px-[18px] py-[18px] text-white shadow-[0_6px_18px_rgba(8,14,31,.28)]"
      style={{
        backgroundImage:
          "radial-gradient(80% 120% at 96% -4%, rgba(90,130,220,.30) 0%, rgba(90,130,220,0) 62%),"
          + " linear-gradient(140deg, #0A1230 0%, #101E48 48%, #17296010 100%), linear-gradient(0deg, #101C43, #101C43)",
      }}
    >
      <p className="text-[12.5px] font-black uppercase leading-none tracking-[0.09em] text-[#F0B23C]">
        La grille de garde
      </p>

      {/* Les quatre paliers dans un meme cadre : c'est une progression, pas
          quatre tarifs independants. Les separer en cartes ferait croire a un
          choix, alors que le client les traverse tous. */}
      <div className="mt-3 grid grid-cols-4 gap-1 rounded-[12px] bg-white/[.07] p-3">
        {PALIERS.map(({ jours, montant, tone }) => (
          <div key={jours} className="text-center">
            <div className="text-[11.5px] font-semibold leading-none text-white/55">{jours}</div>
            <div className={`mt-2 text-[17px] font-black leading-none ${tone}`}>{montant}</div>
          </div>
        ))}
      </div>

      {/* J8 sort du cadre : ce n'est plus un tarif de garde, c'est la fin de
          la garde. Le colis repart. */}
      <div className="mt-2 rounded-[12px] bg-white/[.07] px-3 py-3 text-center">
        <div className="text-[11.5px] font-semibold leading-none text-white/55">J8</div>
        <div className="mt-2 text-[17px] font-black leading-none text-[#F0B23C]">renvoi + 500 F</div>
      </div>

      <p className="mt-4 text-[13px] font-medium leading-[1.55] text-white/80">
        Vous touchez <strong className="font-black text-white">100 F par jour facturé</strong>, jours offerts
        aux abonnés compris (payés par BelivaY). Encombrant : garde doublée, pas le renvoi. Jamais
        facturés : fermeture, avis non vu, dossier en cours, groupage ; garde plafonnée à la valeur du
        colis. Rappel daté au client à la fin des J1, J3 et J5, puis le J7.
      </p>
    </section>
  );
}
