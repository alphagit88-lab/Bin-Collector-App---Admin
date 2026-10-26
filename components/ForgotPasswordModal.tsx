'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import PasswordInput from '@/components/PasswordInput';
import PasswordRequirements from '@/components/PasswordRequirements';
import { normalizePassword, validatePassword } from '@/lib/passwordValidation';

type Props = {
  open: boolean;
  initialIdentifier?: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

type OtpResponse = {
  maskedDestination: string;
  retryAfterSeconds: number;
};

export default function ForgotPasswordModal({ open, initialIdentifier = '', onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'identify' | 'reset'>('identify');
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [maskedDestination, setMaskedDestination] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && step === 'identify') setIdentifier(initialIdentifier);
  }, [open, initialIdentifier, step]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => setCountdown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  if (!open) return null;

  const requestOtp = async () => {
    if (!identifier.trim()) {
      setError('Email or phone number is required.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await api.post<OtpResponse>('/auth/forgot-password/request', { identifier: identifier.trim() });
    setLoading(false);
    if (!result.success || !result.data) {
      setError(result.message || 'Unable to send OTP.');
      return;
    }
    setMaskedDestination(result.data.maskedDestination);
    setCountdown(result.data.retryAfterSeconds || 30);
    setStep('reset');
  };

  const handleRequest = async (event: FormEvent) => {
    event.preventDefault();
    await requestOtp();
  };

  const handleReset = async (event: FormEvent) => {
    event.preventDefault();
    const passwordError = validatePassword(newPassword);
    if (!/^\d{6}$/.test(otp)) return setError('OTP must contain exactly 6 numbers.');
    if (passwordError) return setError(passwordError);
    if (normalizePassword(newPassword) !== normalizePassword(confirmPassword)) return setError('Passwords do not match.');

    setLoading(true);
    setError('');
    const result = await api.post('/auth/forgot-password/reset', {
      identifier: identifier.trim(),
      otp,
      newPassword: normalizePassword(newPassword),
    });
    setLoading(false);
    if (!result.success) return setError(result.message || 'Unable to reset password.');

    setStep('identify');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setCountdown(0);
    onClose();
    onSuccess(result.message || 'Password reset successfully.');
  };

  const changeIdentifier = () => {
    setStep('identify');
    setOtp('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="forgot-password-title" onMouseDown={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onMouseDown={event => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 id="forgot-password-title" className="text-xl font-bold text-gray-900">Forgot Password</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-gray-500 hover:bg-gray-100">&times;</button>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        {step === 'identify' ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <p className="text-sm text-gray-600">Enter your account email or phone number. The OTP will be sent within 30 seconds.</p>
            <div>
              <label htmlFor="reset-identifier" className="mb-2 block text-sm font-medium text-black">Email or Phone Number</label>
              <input id="reset-identifier" value={identifier} onChange={event => setIdentifier(event.target.value)} disabled={loading} className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981] disabled:cursor-not-allowed disabled:bg-gray-100" autoCapitalize="none" />
            </div>
            <button disabled={loading} className="h-10 w-full rounded-md bg-[#10B981] font-medium text-white hover:bg-[#059669] disabled:opacity-50">{loading ? 'Sending...' : 'Send OTP'}</button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-sm text-gray-600">Enter the 6-number OTP sent to <span className="font-semibold text-gray-800">{maskedDestination}</span>.</p>
            <button type="button" disabled={loading} onClick={changeIdentifier} className="text-left text-sm font-medium text-[#10B981] hover:underline disabled:text-gray-400">
              &larr; Change Email or Phone Number
            </button>
            <input value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6-number OTP" className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
            <div>
              <PasswordRequirements password={newPassword} />
              <PasswordInput value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="New Password" autoComplete="new-password" className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
            </div>
            <PasswordInput value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Confirm New Password" autoComplete="new-password" className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]" />
            <button disabled={loading} className="h-10 w-full rounded-md bg-[#10B981] font-medium text-white hover:bg-[#059669] disabled:opacity-50">{loading ? 'Resetting...' : 'Reset Password'}</button>
            <button type="button" disabled={loading || countdown > 0} onClick={requestOtp} className="w-full text-sm font-medium text-[#10B981] disabled:text-gray-400">
              {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
