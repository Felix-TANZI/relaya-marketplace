import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import type { PortalLoginController } from './usePortalLogin';

function AppleGlyph() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true" className="fill-gray-900 dark:fill-white">
      <path d="M16.36 12.9c.02 2.6 2.28 3.46 2.3 3.47-.02.05-.36 1.24-1.2 2.46-.72 1.05-1.47 2.1-2.65 2.12-1.16.02-1.53-.69-2.86-.69-1.32 0-1.74.67-2.83.71-1.14.04-2.01-1.11-2.74-2.16-1.6-2.3-2.82-6.5-1.18-9.35.82-1.41 2.28-2.3 3.87-2.33 1.12-.02 2.18.75 2.86.75.68 0 1.97-.93 3.32-.79.57.02 2.16.21 3.18 1.71-.08.05-1.9 1.11-1.87 3.3M14.2 4.42c.6-.73 1.01-1.74.9-2.75-.87.04-1.92.58-2.55 1.3-.56.65-1.05 1.68-.92 2.67.97.08 1.96-.49 2.57-1.22" />
    </svg>
  );
}

function FacebookGlyph() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true" fill="#1877F2">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.96.93-1.96 1.89v2.27h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}

/**
 * Rangee « ou continuer avec » des maquettes : trois tuiles carrees.
 *
 * Google est le seul fournisseur reellement branche (GoogleAuthButton →
 * AuthContext.googleLogin, endpoint backend existant). Apple et Facebook sont
 * presents dans la maquette : les tuiles sont rendues mais annoncent
 * clairement leur indisponibilite plutot que d'echouer en silence. Le jour ou
 * les endpoints existent, il suffit de remplacer onClick par le handler.
 */
export default function SocialAuthRow({ ctl, accent }: { ctl: PortalLoginController; accent: string }) {
  const tile = 'flex h-12 items-center justify-center rounded border border-gray-200 bg-white transition hover:border-[--tile-accent] dark:border-white/10 dark:bg-white/5';

  return (
    <div className="mt-4 space-y-3">
      {/* Google rend son propre bouton (GIS web ou natif Capacitor) : on le
          laisse pleine largeur, il ne peut pas etre reduit a une tuile. */}
      {!ctl.googleUnavailable && (
        <GoogleAuthButton
          onCredential={ctl.handleGoogleCredential}
          disabled={ctl.loading}
          label="signin_with"
          locale={ctl.locale}
          onUnavailable={() => ctl.setGoogleUnavailable(true)}
          onError={(message) => ctl.showToast(message, 'error')}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => ctl.showToast('Connexion Apple bientôt disponible.', 'error')}
          className={tile}
          style={{ '--tile-accent': accent } as React.CSSProperties}
          aria-label="Continuer avec Apple"
        >
          <AppleGlyph />
        </button>
        <button
          type="button"
          onClick={() => ctl.showToast('Connexion Facebook bientôt disponible.', 'error')}
          className={tile}
          style={{ '--tile-accent': accent } as React.CSSProperties}
          aria-label="Continuer avec Facebook"
        >
          <FacebookGlyph />
        </button>
      </div>
    </div>
  );
}
