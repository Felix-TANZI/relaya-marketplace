// frontend/src/features/vendors/SellerWalletPage.tsx
// Compte BelivaY — solde, numéro de versement par défaut, demandes de retrait.
// Sert enfin VendorProfile.default_withdrawal_operator / default_withdrawal_phone.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import NextSettlementCard from '@/features/vendors/components/NextSettlementCard';
import {
  ArrowDownToLine, Check, Clock, Info, Lock, RefreshCw, Save,
  ShieldCheck, TriangleAlert, Users, Wallet, XCircle,
} from 'lucide-react';
import {
  vendorsApi,
  type VendorPaymentSummary,
  type WithdrawalRequest,
  type VendorProfile,
} from '@/services/api/vendors';
import { useToast } from '@/context/ToastContext';
import { fmtDate } from './orderUtils';
import { CAMEROON, detectOperator, isValidNationalNumber } from '@/lib/phone';
import { OperatorLogo } from '@/features/payments/OperatorLogo';
import {
  T, HERO, card, nf, fmtRate, WITHDRAWAL,
  VendorStyles, PageHead, GhostBtn, Hero, HeroAmount, Panel, Badge, Note, Skeleton,
} from './vendorTheme';

type Operator = 'MTN_MOMO' | 'ORANGE_MONEY';
const OP_LABEL: Record<Operator, string> = { MTN_MOMO: 'MTN Mobile Money', ORANGE_MONEY: 'Orange Money' };
const OP_PREFIX: Record<Operator, string> = { MTN_MOMO: '67X · 68X · 650-654', ORANGE_MONEY: '69X · 655-659' };
const OP_NAME: Record<Operator, string> = { MTN_MOMO: 'MTN', ORANGE_MONEY: 'Orange' };

function OperatorCard({ op, selected, onSelect, disabled }: {
  op: Operator; selected: boolean; onSelect: () => void; disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onSelect} disabled={disabled}
      className="flex items-center gap-3 rounded-2xl text-left transition-all disabled:opacity-60"
      style={{
        padding: 14,
        background: selected ? '#FFFBF7' : T.cream,
        border: selected ? `2px solid ${T.orange}` : `1px solid ${T.border}`,
        boxShadow: selected ? '0 12px 26px -18px rgba(244,121,32,.95)' : 'none',
      }}>
      <OperatorLogo provider={op} size={40} />
      <span className="flex-1 min-w-0">
        <span className="block font-bold" style={{ fontSize: 13, color: T.text }}>{OP_LABEL[op]}</span>
        <span className="block mt-0.5" style={{ fontSize: 10.5, color: T.muted }}>{OP_PREFIX[op]}</span>
      </span>
      <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
        style={{ background: selected ? T.orange : 'rgba(28,18,9,.08)', color: selected ? '#fff' : 'transparent' }}>
        <Check size={12} strokeWidth={3.4} />
      </span>
    </button>
  );
}

function PhoneField({ value, onChange, expected, disabled, label }: {
  value: string; onChange: (v: string) => void; expected: Operator; disabled?: boolean; label: string;
}) {
  const { t } = useTranslation();
  const valid = isValidNationalNumber(value, CAMEROON);
  const detected = detectOperator(value);
  const mismatch = valid && detected !== null && detected.name !== OP_NAME[expected];
  const bad = (value.length > 0 && !valid) || mismatch;

  return (
    <div>
      <label className="block font-semibold mb-1.5" style={{ fontSize: 12, color: T.text }}>{label}</label>
      <div className="flex items-stretch rounded-xl overflow-hidden"
        style={{
          background: disabled ? T.creamAlt : T.white,
          border: bad ? '1.5px solid #ef4444' : valid ? `1.5px solid ${T.orange}` : `1px solid ${T.border}`,
          boxShadow: valid && !bad ? '0 0 0 3px rgba(244,121,32,.14)' : 'none',
        }}>
        <span className="flex items-center gap-1.5 font-bold flex-shrink-0"
          style={{ padding: '0 13px', background: T.cream, borderRight: `1px solid ${T.border}`, fontSize: 13, color: T.muted }}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>{CAMEROON.flag}</span>+237
        </span>
        <input type="tel" maxLength={9} value={value} disabled={disabled}
          onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
          placeholder="6XX XXX XXX"
          className="flex-1 outline-none font-bold"
          style={{ padding: '13px 12px', fontSize: 16, letterSpacing: '.04em', color: T.text, background: 'transparent', minWidth: 0 }} />
        {valid && !mismatch && detected && (
          <span className="flex items-center flex-shrink-0" style={{ paddingRight: 11 }}>
            <span className="font-black rounded-lg" style={{ fontSize: 10, padding: '4px 9px', background: T.greenL, color: T.green }}>
              {detected.name}
            </span>
          </span>
        )}
      </div>
      {value.length > 0 && !valid ? (
        <p className="mt-1.5" style={{ fontSize: 11, color: '#ef4444' }}>
          {t('sl4_wallet.invalid_number')}
        </p>
      ) : mismatch ? (
        <p className="mt-1.5" style={{ fontSize: 11, color: '#ef4444' }}>
          {t('sl4_wallet.mismatch_number', { detected: detected?.name, expected: OP_LABEL[expected] })}
        </p>
      ) : valid ? (
        <p className="mt-1.5 flex items-center gap-1.5" style={{ fontSize: 11, color: T.green }}>
          <Check size={12} strokeWidth={2.6} />{t('sl4_wallet.prefix_match')}
        </p>
      ) : (
        <p className="mt-1.5" style={{ fontSize: 11, color: T.mutedL }}>
          {t('sl4_wallet.format_hint')}
        </p>
      )}
    </div>
  );
}

export default function SellerWalletPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [summary, setSummary] = useState<VendorPaymentSummary | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [defOp, setDefOp] = useState<Operator>('MTN_MOMO');
  const [defPhone, setDefPhone] = useState('');
  const [savingDef, setSavingDef] = useState(false);

  const [wdOp, setWdOp] = useState<Operator>('MTN_MOMO');
  const [wdPhone, setWdPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [sum, wds, prof] = await Promise.all([
        vendorsApi.getPaymentSummary(),
        vendorsApi.getWithdrawals(),
        vendorsApi.getProfile(),
      ]);
      setSummary(sum);
      setWithdrawals(wds);
      setProfile(prof);

      const op = (prof.default_withdrawal_operator || 'MTN_MOMO') as Operator;
      const ph = (prof.default_withdrawal_phone || '').replace(/^\+?237/, '');
      setDefOp(op); setDefPhone(ph);
      setWdOp(op);  setWdPhone(ph);
    } catch {
      showToast(t('sl4_wallet.toast_load_error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => { load(); }, [load]);

  const saveDefault = async () => {
    if (!isValidNationalNumber(defPhone, CAMEROON)) return;
    try {
      setSavingDef(true);
      const updated = await vendorsApi.savePaymentPreferences({
        default_withdrawal_operator: defOp,
        default_withdrawal_phone: `+237${defPhone}`,
      });
      setProfile(updated);
      showToast(t('sl4_wallet.toast_number_saved'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('sl4_wallet.toast_save_number_error'), 'error');
    } finally {
      setSavingDef(false);
    }
  };

  const balance = summary?.total_released_xaf ?? 0;
  const upcoming = (summary?.total_blocked_xaf ?? 0) + (summary?.total_release_pending_xaf ?? 0);
  const feeRate = summary ? parseFloat(String(summary.withdrawal_fee_percent)) : 1.5;
  const minAmount = summary?.minimum_withdrawal_xaf ?? 1000;
  const pendingWd = summary?.pending_withdrawal ?? null;

  const amountNum = parseInt(amount, 10) || 0;
  const fee = Math.round((amountNum * feeRate) / 100);
  const net = amountNum - fee;

  const wdValid = isValidNationalNumber(wdPhone, CAMEROON);
  const wdDetected = detectOperator(wdPhone);
  const wdMismatch = wdValid && wdDetected !== null && wdDetected.name !== OP_NAME[wdOp];
  const canWithdraw = !pendingWd && amountNum >= minAmount && amountNum <= balance && wdValid && !wdMismatch;

  const defChanged = useMemo(() => {
    const savedOp = (profile?.default_withdrawal_operator || '') as string;
    const savedPh = (profile?.default_withdrawal_phone || '').replace(/^\+?237/, '');
    return savedOp !== defOp || savedPh !== defPhone;
  }, [profile, defOp, defPhone]);

  const submit = async () => {
    if (!canWithdraw) return;
    try {
      setSubmitting(true);
      const wd = await vendorsApi.createWithdrawal({
        amount_xaf: amountNum,
        operator: wdOp,
        phone_number: `+237${wdPhone}`,
      });
      showToast(t('sl4_wallet.toast_request_submitted', { reference: wd.reference }), 'success');
      setAmount('');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('sl4_wallet.toast_request_error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async () => {
    if (!pendingWd) return;
    try {
      setCancelling(true);
      await vendorsApi.cancelWithdrawal(pendingWd.id);
      showToast(t('sl4_wallet.toast_request_cancelled'), 'success');
      await load();
    } catch {
      showToast(t('sl4_wallet.toast_cancel_error'), 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <VendorStyles />
        <div className="rounded-3xl animate-pulse" style={{ height: 190, background: T.creamAlt }} />
        <Skeleton h={210} n={2} />
      </div>
    );
  }
  if (!summary) return null;

  const presets = [100_000, 250_000, 500_000].filter(p => p >= minAmount && p <= balance);
  const approved = withdrawals.filter(w => w.status === 'APPROVED');

  return (
    <div className="space-y-4 pb-10 v-anim">
      <VendorStyles />

      <PageHead
        kicker={t('sl4_wallet.kicker')} title={t('sl4_wallet.title')}
        subtitle={t('sl4_wallet.subtitle')}
        actions={
          <>
            {profile?.default_withdrawal_phone ? (
              <span className="flex items-center gap-1.5 rounded-full font-bold"
                style={{ padding: '9px 14px', fontSize: 11.5, background: T.greenL, border: `1px solid ${T.greenB}`, color: T.green }}>
                <Check size={13} strokeWidth={2.6} />{t('sl4_wallet.number_registered')}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full font-bold"
                style={{ padding: '9px 14px', fontSize: 11.5, background: T.amberL, border: `1px solid ${T.amberB}`, color: T.amber }}>
                <TriangleAlert size={13} />{t('sl4_wallet.number_missing')}
              </span>
            )}
            <GhostBtn icon={<RefreshCw size={13} />} onClick={load}>{t('sl4_wallet.refresh')}</GhostBtn>
          </>
        }
      />

      {/* ═══ PROCHAIN RÈGLEMENT ═══ */}
      {/* Le solde répond à « combien ». Cette carte répond à « quand »,
          et surtout à « pourquoi pas encore ». */}
      <div className="mb-5">
        <NextSettlementCard />
      </div>

      {/* ═══ SOLDE ═══ */}
      <Hero gradient={HERO.dark} blobColor="rgba(52,211,153,.5)">
        <div className="flex items-start justify-between gap-5 flex-wrap">
          <HeroAmount kicker="Solde retirable" value={nf(balance)} />
          <div className="text-right">
            <p className="font-bold uppercase" style={{ fontSize: 10, letterSpacing: '.16em', color: 'rgba(255,255,255,.4)' }}>
              {t('sl4_wallet.upcoming_label')}
            </p>
            <p className="font-black mt-1.5" style={{ fontSize: 22, color: T.amber, letterSpacing: '-.02em' }}>
              {nf(upcoming)} <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>FCFA</span>
            </p>
            <Link to="/seller/pending-funds">
              <span className="block mt-1 font-bold" style={{ fontSize: 10.5, color: 'rgba(255,255,255,.55)' }}>
                {t(summary.blocked_orders_count > 1 ? 'sl4_wallet.escrow_orders_count_plural' : 'sl4_wallet.escrow_orders_count', { count: summary.blocked_orders_count })}
              </span>
            </Link>
          </div>
        </div>
        <div className="flex gap-2.5 mt-5 flex-wrap">
          <Link to="/seller/settlements">
            <button type="button" className="flex items-center gap-2 rounded-xl font-semibold"
              style={{ padding: '12px 17px', fontSize: 12.5, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)', color: 'rgba(255,255,255,.85)' }}>
              <ArrowDownToLine size={14} />{t('sl4_wallet.settlements_button')}
            </button>
          </Link>
          <Link to="/seller/adjustments">
            <button type="button" className="flex items-center gap-2 rounded-xl font-semibold"
              style={{ padding: '12px 17px', fontSize: 12.5, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)', color: 'rgba(255,255,255,.85)' }}>
              <Info size={14} />{t('sl4_wallet.adjustments_button')}
            </button>
          </Link>
        </div>
      </Hero>

      <div className="flex gap-3.5 items-start flex-wrap">
        <div className="flex-1 flex flex-col gap-3.5" style={{ minWidth: 340 }}>

          {/* ═══ NUMÉRO PAR DÉFAUT ═══ */}
          <Panel
            title={t('sl4_wallet.default_number_title')}
            sub={t('sl4_wallet.default_number_sub')}
            right={
              <span className="font-bold uppercase rounded-lg"
                style={{ fontSize: 10, letterSpacing: '.1em', padding: '5px 10px', background: T.cream, border: `1px solid ${T.border}`, color: T.mutedL }}>
                {t('sl4_wallet.default_number_badge')}
              </span>
            }
          >
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))' }}>
              <OperatorCard op="MTN_MOMO"     selected={defOp === 'MTN_MOMO'}     onSelect={() => setDefOp('MTN_MOMO')} />
              <OperatorCard op="ORANGE_MONEY" selected={defOp === 'ORANGE_MONEY'} onSelect={() => setDefOp('ORANGE_MONEY')} />
            </div>

            <div className="mt-3.5">
              <PhoneField value={defPhone} onChange={setDefPhone} expected={defOp} label={t('sl4_wallet.credit_number_label')} />
            </div>

            <div className="flex gap-2.5 mt-4 flex-wrap">
              <button type="button" onClick={saveDefault}
                disabled={savingDef || !defChanged || !isValidNationalNumber(defPhone, CAMEROON)}
                className="flex items-center gap-2 rounded-xl font-bold text-white transition-all disabled:opacity-50"
                style={{ padding: '12px 19px', fontSize: 12.5, background: T.orange, boxShadow: '0 10px 22px -10px rgba(244,121,32,.85)' }}>
                {savingDef ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {savingDef ? t('sl4_wallet.save_button_saving') : t('sl4_wallet.save_button_save')}
              </button>
              {defChanged && (
                <button type="button"
                  onClick={() => {
                    setDefOp((profile?.default_withdrawal_operator || 'MTN_MOMO') as Operator);
                    setDefPhone((profile?.default_withdrawal_phone || '').replace(/^\+?237/, ''));
                  }}
                  className="rounded-xl font-semibold"
                  style={{ padding: '12px 17px', fontSize: 12.5, background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
                  {t('sl4_wallet.cancel_edit_button')}
                </button>
              )}
            </div>

            <div className="mt-3.5">
              <Note icon={<Users size={15} />}>
                {t('sl4_wallet.default_number_note')}
              </Note>
            </div>
          </Panel>

          {/* ═══ DEMANDE DE RETRAIT ═══ */}
          <Panel
            title={t('sl4_wallet.withdraw_panel_title')}
            sub={t('sl4_wallet.withdraw_panel_sub', { rate: fmtRate(summary.withdrawal_fee_percent), amount: nf(minAmount) })}
            right={
              <span className="text-right">
                <span className="block font-medium" style={{ fontSize: 10, color: T.muted }}>{t('sl4_wallet.available_balance_label')}</span>
                <span className="block font-black" style={{ fontSize: 16, color: T.green }}>{nf(balance)} FCFA</span>
              </span>
            }
          >
            {pendingWd ? (
              <div className="rounded-2xl" style={{ padding: 16, background: T.amberL, border: `1px solid ${T.amberB}` }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="flex items-center gap-2 font-bold" style={{ fontSize: 12.5, color: T.amber }}>
                      <TriangleAlert size={13} />{t('sl4_wallet.pending_request_title', { reference: pendingWd.reference })}
                    </p>
                    <p className="mt-1.5" style={{ fontSize: 11.5, color: T.muted }}>
                      {nf(pendingWd.amount_xaf)} FCFA → <strong>{OP_LABEL[pendingWd.operator as Operator]}</strong> {pendingWd.phone}
                      {' · '}{t('sl4_wallet.net_label')} <strong>{nf(pendingWd.net_xaf)} FCFA</strong>
                    </p>
                    <p className="mt-1" style={{ fontSize: 10.5, color: T.mutedL }}>
                      {t('sl4_wallet.submitted_on', { date: fmtDate(pendingWd.created_at) })}
                    </p>
                  </div>
                  <button type="button" onClick={cancel} disabled={cancelling}
                    className="flex items-center gap-1.5 rounded-xl font-semibold flex-shrink-0"
                    style={{ padding: '9px 14px', fontSize: 11.5, background: T.redL, border: `1px solid ${T.redB}`, color: T.red }}>
                    {cancelling ? <RefreshCw size={12} className="animate-spin" /> : <XCircle size={12} />}{t('sl4_wallet.cancel_withdrawal_button')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))' }}>
                  <OperatorCard op="MTN_MOMO"     selected={wdOp === 'MTN_MOMO'}     onSelect={() => setWdOp('MTN_MOMO')} />
                  <OperatorCard op="ORANGE_MONEY" selected={wdOp === 'ORANGE_MONEY'} onSelect={() => setWdOp('ORANGE_MONEY')} />
                </div>

                <div className="mt-3.5">
                  <PhoneField value={wdPhone} onChange={setWdPhone} expected={wdOp} label={t('sl4_wallet.credit_number_label')} />
                </div>

                <div className="mt-4">
                  <label className="block font-semibold mb-1.5" style={{ fontSize: 12, color: T.text }}>
                    {t('sl4_wallet.amount_label')}
                  </label>
                  <div className="flex items-stretch rounded-xl overflow-hidden"
                    style={{
                      background: T.white,
                      border: amountNum >= minAmount ? `1.5px solid ${T.orange}` : `1px solid ${T.border}`,
                      boxShadow: amountNum >= minAmount ? '0 0 0 3px rgba(244,121,32,.14)' : 'none',
                    }}>
                    <input type="number" min={minAmount} max={balance} step={500} value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder={t('sl4_wallet.amount_placeholder', { amount: nf(minAmount) })}
                      className="flex-1 outline-none font-black"
                      style={{ padding: 14, fontSize: 22, letterSpacing: '-.02em', color: T.text, background: 'transparent', minWidth: 0 }} />
                    <span className="flex items-center font-bold flex-shrink-0"
                      style={{ padding: '0 15px', background: T.cream, borderLeft: `1px solid ${T.border}`, fontSize: 12.5, color: T.muted }}>
                      FCFA
                    </span>
                  </div>

                  <div className="flex gap-2 mt-2.5 flex-wrap">
                    {presets.map(p => (
                      <button key={p} type="button" onClick={() => setAmount(String(p))}
                        className="rounded-full font-semibold transition-all"
                        style={{
                          padding: '8px 14px', fontSize: 11.5,
                          background: amountNum === p ? T.orangeB : T.cream,
                          border: `1px solid ${amountNum === p ? 'rgba(244,121,32,.35)' : T.border}`,
                          color: amountNum === p ? T.orange : T.muted,
                        }}>
                        {nf(p)}
                      </button>
                    ))}
                    {balance >= minAmount && (
                      <button type="button" onClick={() => setAmount(String(balance))}
                        className="rounded-full font-bold"
                        style={{
                          padding: '8px 14px', fontSize: 11.5,
                          background: amountNum === balance ? T.orangeB : T.cream,
                          border: `1px solid ${amountNum === balance ? 'rgba(244,121,32,.35)' : T.border}`,
                          color: amountNum === balance ? T.orange : T.muted,
                        }}>
                        {t('sl4_wallet.preset_all', { amount: nf(balance) })}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
                  <div className="flex items-center justify-between" style={{ padding: '13px 15px', background: T.cream }}>
                    <span style={{ fontSize: 11.5, color: T.muted }}>{t('sl4_wallet.requested_amount_label')}</span>
                    <span className="font-bold" style={{ fontSize: 13, color: T.text }}>
                      {amountNum > 0 ? `${nf(amountNum)} FCFA` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between"
                    style={{ padding: '13px 15px', background: T.white, borderTop: `1px solid ${T.borderL}` }}>
                    <span style={{ fontSize: 11.5, color: T.red }}>{t('sl4_wallet.withdrawal_fee_label', { rate: fmtRate(summary.withdrawal_fee_percent) })}</span>
                    <span className="font-bold" style={{ fontSize: 13, color: T.red }}>
                      {amountNum > 0 ? `− ${nf(fee)} FCFA` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between"
                    style={{ padding: '16px 15px', background: T.greenL, borderTop: `1px solid ${T.greenB}` }}>
                    <span className="font-bold" style={{ fontSize: 11.5, color: T.green }}>{t('sl4_wallet.you_will_receive_label')}</span>
                    <span className="font-black" style={{ fontSize: 22, color: T.green, letterSpacing: '-.02em' }}>
                      {amountNum >= minAmount ? `${nf(net)} FCFA` : '—'}
                    </span>
                  </div>
                </div>

                <button type="button" onClick={submit} disabled={!canWithdraw || submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white mt-4 transition-all disabled:opacity-50"
                  style={{ padding: 15, fontSize: 14, background: HERO.orange, boxShadow: canWithdraw ? '0 14px 28px -12px rgba(244,121,32,.9)' : 'none' }}>
                  {submitting
                    ? <><RefreshCw size={15} className="animate-spin" />{t('sl4_wallet.submit_sending')}</>
                    : <><Lock size={15} />{amountNum >= minAmount ? t('sl4_wallet.submit_confirm_amount', { amount: nf(amountNum) }) : t('sl4_wallet.submit_confirm_plain')}</>}
                </button>

                {balance < minAmount && (
                  <p className="text-center mt-2.5" style={{ fontSize: 12, color: T.muted }}>
                    {t('sl4_wallet.insufficient_balance', { amount: nf(minAmount) })}
                  </p>
                )}
                {amountNum > balance && (
                  <p className="text-center mt-2.5" style={{ fontSize: 12, color: T.red }}>
                    {t('sl4_wallet.amount_exceeds_balance')}
                  </p>
                )}
              </>
            )}
          </Panel>

          {/* ═══ HISTORIQUE ═══ */}
          <Panel
            pad={false}
            title={t('sl4_wallet.history_panel_title')} sub={t('sl4_wallet.history_panel_sub')}
            right={
              <span className="font-bold rounded-full"
                style={{ fontSize: 11, padding: '5px 11px', background: T.cream, border: `1px solid ${T.border}`, color: T.muted }}>
                {t(withdrawals.length > 1 ? 'sl4_wallet.history_count_plural' : 'sl4_wallet.history_count', { count: withdrawals.length })}
              </span>
            }
          >
            {withdrawals.length === 0 ? (
              <div className="text-center" style={{ padding: '40px 20px' }}>
                <span className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: T.orangeB, color: T.orange }}><Wallet size={24} /></span>
                <p className="font-bold" style={{ fontSize: 14, color: T.text }}>{t('sl4_wallet.empty_title')}</p>
                <p style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
                  {t('sl4_wallet.empty_sub')}
                </p>
              </div>
            ) : withdrawals.map(w => {
              const cfg = WITHDRAWAL[w.status] ?? WITHDRAWAL.CANCELLED;
              return (
                <div key={w.id} className="v-row" style={{ padding: '15px 20px', borderBottom: `1px solid ${T.borderL}` }}>
                  <div className="flex items-center gap-3.5 flex-wrap">
                    <OperatorLogo provider={w.operator} size={38} />
                    <div className="flex-1" style={{ minWidth: 150 }}>
                      <p className="font-black" style={{ fontSize: 12.5, color: T.text }}>{w.reference}</p>
                      <p style={{ fontSize: 11, color: T.mutedL, marginTop: 2 }}>
                        {fmtDate(w.created_at)} · {w.phone_number}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black" style={{ fontSize: 15, color: T.text }}>{nf(w.net_amount_xaf)} FCFA</p>
                      <p style={{ fontSize: 10.5, color: T.mutedL, marginTop: 2 }}>
                        brut {nf(w.amount_xaf)} · frais {nf(w.fee_amount_xaf)}
                      </p>
                    </div>
                    <Badge label={w.status_display} color={cfg.color} bg={cfg.bg} minWidth={88} />
                  </div>

                  {w.admin_note && (
                    <div className="flex gap-2.5 mt-3 rounded-xl"
                      style={{ padding: '11px 13px', background: T.redL, border: `1px solid ${T.redB}` }}>
                      <TriangleAlert size={14} style={{ color: T.red, flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <p className="font-bold uppercase" style={{ fontSize: 9.5, letterSpacing: '.12em', color: T.red }}>
                          {t('sl4_wallet.admin_note_title')}
                        </p>
                        <p style={{ fontSize: 11.5, lineHeight: 1.55, color: T.muted, marginTop: 3 }}>{w.admin_note}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </Panel>
        </div>

        {/* ═══ COLONNE DROITE ═══ */}
        <aside className="flex-1 flex flex-col gap-3.5" style={{ minWidth: 270, maxWidth: 340 }}>
          <div className="rounded-2xl p-5" style={card}>
            <p className="font-bold mb-4" style={{ fontSize: 13.5, color: T.text }}>{t('sl4_wallet.conditions_title')}</p>
            {[
              { ic: <ArrowDownToLine size={14} />, l: t('sl4_wallet.condition_min_label'),   v: `${nf(minAmount)} FCFA` },
              { ic: <Info size={14} />,            l: t('sl4_wallet.condition_fee_label'),          v: fmtRate(summary.withdrawal_fee_percent) },
              { ic: <Clock size={14} />,           l: t('sl4_wallet.condition_delay_label'),         v: t('sl4_wallet.condition_delay_value') },
              { ic: <Lock size={14} />,            l: t('sl4_wallet.condition_simultaneous_label'),   v: t('sl4_wallet.condition_simultaneous_value') },
            ].map(r => (
              <div key={r.l} className="flex items-center justify-between gap-2.5"
                style={{ padding: '11px 0', borderBottom: `1px solid ${T.borderL}` }}>
                <span className="flex items-center gap-2.5" style={{ fontSize: 11.5, color: T.muted }}>
                  <span style={{ color: T.mutedL }}>{r.ic}</span>{r.l}
                </span>
                <span className="font-black" style={{ fontSize: 12.5, color: T.text }}>{r.v}</span>
              </div>
            ))}
            <div className="mt-3.5">
              <Note icon={<Clock size={15} />} tone="amber">
                {t('sl4_wallet.single_request_note')}
              </Note>
            </div>
          </div>

          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: T.sidebar }}>
            <span className="v-glow absolute pointer-events-none"
              style={{ bottom: -60, right: -30, width: 150, height: 150, borderRadius: '50%',
                background: 'radial-gradient(circle,rgba(244,121,32,.45),transparent 70%)' }} />
            <div className="relative">
              <p className="font-bold uppercase" style={{ fontSize: 10, letterSpacing: '.18em', color: 'rgba(255,255,255,.4)' }}>
                {t('sl4_wallet.cumulative_title')}
              </p>
              <div className="flex flex-col gap-3.5 mt-4">
                {[
                  { l: t('sl4_wallet.cumulative_withdrawn'),                     v: approved.reduce((s, w) => s + w.net_amount_xaf, 0), c: '#fff' },
                  { l: t('sl4_wallet.cumulative_fees_paid'),     v: approved.reduce((s, w) => s + w.fee_amount_xaf, 0), c: T.amber },
                  { l: t('sl4_wallet.cumulative_commission_retained'), v: Math.round(summary.projection_monthly_xaf * (parseFloat(String(summary.commission_rate)) / 100)), c: T.orange },
                ].map((x, i) => (
                  <div key={x.l}>
                    {i > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,.1)', marginBottom: 14 }} />}
                    <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,.45)' }}>{x.l}</p>
                    <p className="font-black mt-1" style={{ fontSize: 19, color: x.c }}>
                      {nf(x.v)} <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>FCFA</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Note icon={<ShieldCheck size={15} />} tone="green">
            {t('sl4_wallet.secret_code_note')}
          </Note>
        </aside>
      </div>
    </div>
  );
}