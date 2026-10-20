import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import AppleAuthButton from '@/components/auth/AppleAuthButton';
import type { PortalLoginController } from './usePortalLogin';

/**
 * Rangee « ou continuer avec ».
 *
 * Google et Apple sont tous deux branches (GoogleAuthButton/AppleAuthButton
 * → AuthContext.googleLogin/appleLogin, endpoints backend existants) et sont
 * affiches sur toutes les plateformes et toutes les tailles d'ecran. Le flux
 * Apple hors iOS reclame un Services ID : voir l'en-tete d'AppleAuthButton.
 *
 * La tuile Facebook a ete retiree : aucun endpoint ne la branchait, elle se
 * contentait d'annoncer « bientot disponible ». Le jour ou le flux existe,
 * la rajouter ici sur le modele des deux autres.
 */
export default function SocialAuthRow({ ctl }: { ctl: PortalLoginController }) {
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
    </div>
  );
}
