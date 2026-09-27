import { useTranslation } from 'react-i18next';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import AppleAuthButton from '@/components/auth/AppleAuthButton';
import type { PortalLoginController } from './usePortalLogin';

function FacebookGlyph() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true" fill="#1877F2">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.96.93-1.96 1.89v2.27h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}

/**
 * Rangee « ou continuer avec » des maquettes.
 *
 * Google et Apple sont reellement branches (GoogleAuthButton/AppleAuthButton
 * → AuthContext.googleLogin/appleLogin, endpoints backend existants). Apple
 * n'est rendu que sur iOS natif : Apple n'exige "Sign in with Apple" que sur
 * cette plateforme (App Review Guideline 4.8, obligatoire des lors qu'un
 * fournisseur tiers comme Google est propose) — AppleAuthButton se rend donc
 * lui-meme en `null` sur Android/web. Facebook reste une tuile de maquette :
 * elle annonce clairement son indisponibilite plutot que d'echouer en
 * silence. Le jour ou l'endpoint existe, il suffit de remplacer son onClick.
 */
export default function SocialAuthRow({ ctl, accent }: { ctl: PortalLoginController; accent: string }) {
  const { t } = useTranslation();
  const tile = 'flex h-12 items-center justify-center rounded border border-gray-200 bg-white transition hover:border-[--tile-accent] dark:border-white/10 dark:bg-white/5';

  return (
    <div className="mt-4 space-y-3">
      {/* Google et Apple rendent chacun leur propre bouton pleine largeur :
          ni l'un ni l'autre ne se reduit a une tuile carree. */}
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

      <AppleAuthButton
        onCredential={ctl.handleAppleCredential}
        disabled={ctl.loading}
        onError={(message) => ctl.showToast(message, 'error')}
      />

      <button
        type="button"
        onClick={() => ctl.showToast(t('cl6_social_auth.facebook_coming_soon'), 'error')}
        className={tile}
        style={{ '--tile-accent': accent } as React.CSSProperties}
        aria-label={t('cl6_social_auth.continue_with_facebook')}
      >
        <FacebookGlyph />
      </button>
    </div>
  );
}
