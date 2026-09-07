import { Link } from 'react-router-dom';
import { ArrowRight, Check, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import SocialAuthRow from './SocialAuthRow';
import type { PortalLoginContent } from './types';
import type { PortalLoginController } from './usePortalLogin';

/**
 * La carte de connexion des maquettes : blanche en theme clair, ardoise en
 * theme sombre. Deux etats seulement — identifiants, puis code a six chiffres
 * quand le compte a la double authentification activee.
 */
export default function PortalLoginCard({
  content,
  ctl,
}: {
  content: PortalLoginContent;
  ctl: PortalLoginController;
}) {
  const { accent, accentDark, soft } = content.theme;
  const field =
    'h-12 w-full rounded border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-transparent focus:ring-4 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40';
  const ring = { '--tw-ring-color': soft } as React.CSSProperties;

  return (
    <div className="rounded border border-black/5 bg-white p-6 shadow-[0_26px_60px_-22px_rgba(0,0,0,.45)] dark:border-white/10 dark:bg-[#131A22] sm:p-7">
      {!ctl.twoFA ? (
        <form onSubmit={ctl.handleSubmit} noValidate>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {content.card.title}
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-white/60">{content.card.subtitle}</p>

          <div className="mt-6 space-y-3">
            <label className="relative block">
              <span className="sr-only">{ctl.t('auth.email')}</span>
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={ctl.credentials.username}
                onChange={ctl.handleChange}
                placeholder="Adresse e-mail"
                disabled={ctl.loading}
                required
                className={field}
                style={ring}
              />
            </label>

            <label className="relative block">
              <span className="sr-only">{ctl.t('auth.password')}</span>
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
              <input
                type={ctl.showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={ctl.credentials.password}
                onChange={ctl.handleChange}
                placeholder="Mot de passe"
                disabled={ctl.loading}
                required
                className={`${field} pr-12`}
                style={ring}
              />
              <button
                type="button"
                onClick={() => ctl.setShowPassword(!ctl.showPassword)}
                disabled={ctl.loading}
                className="absolute right-0 top-0 flex h-12 w-11 items-center justify-center text-gray-400 transition hover:text-gray-600 dark:text-white/40 dark:hover:text-white/70"
                aria-label={ctl.showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {ctl.showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </label>
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => ctl.setRemember(!ctl.remember)}
              className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/80"
              aria-pressed={ctl.remember}
            >
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition"
                style={{
                  background: ctl.remember ? accent : 'transparent',
                  borderColor: ctl.remember ? accent : undefined,
                }}
              >
                {ctl.remember && <Check size={11} strokeWidth={3.6} className="text-white" />}
              </span>
              <span className="whitespace-nowrap">Se souvenir de moi</span>
            </button>
            <Link
              to="/forgot-password"
              className="shrink-0 whitespace-nowrap text-xs font-medium underline"
              style={{ color: accent }}
            >
              {ctl.t('auth.forgot_password') || 'Mot de passe oublié ?'}
            </Link>
          </div>

          <button
            type="submit"
            disabled={ctl.loading}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded text-sm font-semibold text-white shadow-lg transition hover:brightness-95 disabled:opacity-50"
            style={{ background: `linear-gradient(180deg, ${accent}, ${accentDark})` }}
          >
            {ctl.loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
            ) : (
              <>
                {ctl.t('auth.login_button') || 'Se connecter'}
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <div className="mt-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
            <span className="shrink-0 whitespace-nowrap text-[11px] text-gray-400 dark:text-white/50">
              ou continuer avec
            </span>
            <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
          </div>

          <SocialAuthRow ctl={ctl} accent={accent} />

          {content.card.registerPath ? (
            <p className="mt-5 text-center text-xs text-gray-500 dark:text-white/60">
              Vous n'avez pas de compte ?{' '}
              <Link to={content.card.registerPath} className="font-semibold" style={{ color: accent }}>
                {content.card.registerLabel || "S'inscrire"}
              </Link>
            </p>
          ) : (
            content.card.registerHint && (
              <p className="mt-5 text-center text-xs text-gray-500 dark:text-white/60">
                {content.card.registerHint}
              </p>
            )
          )}
        </form>
      ) : (
        <form onSubmit={ctl.handleVerify} noValidate>
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded"
              style={{ background: soft, color: accentDark }}
            >
              <ShieldCheck size={20} />
            </span>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Vérification en deux étapes</h1>
              <p className="text-xs text-gray-500 dark:text-white/60">Ce compte a la double authentification activée</p>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-gray-600 dark:text-white/70">
            Un code à six chiffres a été envoyé à{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{ctl.twoFA.email}</span>.
          </p>

          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={ctl.code}
            onChange={(event) => ctl.setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            disabled={ctl.verifying}
            className="mt-5 h-14 w-full rounded border border-gray-200 bg-white text-center text-2xl font-bold tracking-[0.45em] text-gray-900 outline-none transition focus:border-transparent focus:ring-4 dark:border-white/10 dark:bg-white/5 dark:text-white"
            style={ring}
          />

          <button
            type="submit"
            disabled={ctl.verifying || ctl.code.length < 6}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded text-sm font-semibold text-white shadow-lg transition hover:brightness-95 disabled:opacity-50"
            style={{ background: `linear-gradient(180deg, ${accent}, ${accentDark})` }}
          >
            {ctl.verifying ? (
              <span className="h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
            ) : (
              <>
                Vérifier et se connecter
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <div className="mt-4 flex items-center justify-between text-xs">
            <button type="button" onClick={ctl.cancelTwoFA} className="font-medium text-gray-500 dark:text-white/60">
              Changer de compte
            </button>
            <button
              type="button"
              onClick={ctl.handleResend}
              disabled={ctl.resending}
              className="font-semibold disabled:opacity-50"
              style={{ color: accent }}
            >
              {ctl.resending ? 'Envoi...' : 'Renvoyer le code'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
