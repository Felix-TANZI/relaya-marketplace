// frontend/src/features/vendors/v2/ouverture/useSmsOtp.ts
// Vérification du numéro de la boutique par code SMS (OUV-01, VD-D04.A05/A09).
// CNX-04 (proposé) : code à 6 chiffres, valable 10 minutes, 3 renvois par
// heure au plus — le minuteur de renvoi ci-dessous applique cette dernière
// règle côté écran (le serveur reste la source de vérité).

import { useCallback, useEffect, useRef, useState } from 'react';
import { sendShopPhoneOtp, verifyShopPhoneOtp } from './api';

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_RESENDS_PER_HOUR = 3;

export type SmsOtpStep = 'idle' | 'sent' | 'verifying' | 'verified';

export function useSmsOtp(phone: string) {
  const [step, setStep] = useState<SmsOtpStep>('idle');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const resendsThisHour = useRef(0);
  const hourWindowStart = useRef<number>(Date.now());

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const send = useCallback(async () => {
    const now = Date.now();
    if (now - hourWindowStart.current > 3600_000) {
      hourWindowStart.current = now;
      resendsThisHour.current = 0;
    }
    if (resendsThisHour.current >= MAX_RESENDS_PER_HOUR) {
      setError('sl9_ouverture.otp_error_too_many');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await sendShopPhoneOtp(phone);
      resendsThisHour.current += 1;
      setStep('sent');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError('sl9_ouverture.otp_error_send');
    } finally {
      setSending(false);
    }
  }, [phone]);

  const verify = useCallback(async () => {
    if (code.length < 6) return;
    setStep('verifying');
    setError(null);
    try {
      await verifyShopPhoneOtp(phone, code);
      setStep('verified');
    } catch {
      setError('sl9_ouverture.otp_error_invalid');
      setStep('sent');
    }
  }, [phone, code]);

  const reset = useCallback(() => {
    setStep('idle');
    setCode('');
    setError(null);
  }, []);

  return {
    step,
    code,
    setCode,
    sending,
    error,
    cooldown,
    canResend: cooldown === 0 && resendsThisHour.current < MAX_RESENDS_PER_HOUR,
    send,
    verify,
    reset,
  };
}

export type SmsOtpController = ReturnType<typeof useSmsOtp>;
