"use client";

import { useActionState, useState } from "react";
import { enrollTotp, confirmTotpEnrollment, disableTotp } from "@/lib/actions/twoFactor";

export default function TwoFactorSettings({ enabled }: { enabled: boolean }) {
  const [enrollment, setEnrollment] = useState<{ qrDataUrl: string; secret: string } | null>(null);
  const [confirmState, confirmAction, confirmPending] = useActionState(confirmTotpEnrollment, undefined);
  const [starting, setStarting] = useState(false);

  async function startEnrollment() {
    setStarting(true);
    const result = await enrollTotp();
    setStarting(false);
    if (result) setEnrollment(result);
  }

  if (enabled) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-emerald-700">Two-factor authentication is enabled on your account.</p>
        <form action={disableTotp}>
          <button
            type="submit"
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Disable 2FA
          </button>
        </form>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-stone-500">
          Add an extra step to your sign-in using an authenticator app (Google Authenticator, Authy, etc.).
        </p>
        <button
          onClick={startEnrollment}
          disabled={starting}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
        >
          {starting ? "Generating..." : "Enable 2FA"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-500">
        Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={enrollment.qrDataUrl} alt="2FA QR code" className="h-40 w-40 rounded-lg border border-stone-200" />
      <p className="break-all text-xs text-stone-400">Or enter this key manually: {enrollment.secret}</p>
      <form action={confirmAction} className="flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Code</label>
          <input
            name="code"
            inputMode="numeric"
            maxLength={6}
            required
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={confirmPending}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
        >
          Confirm
        </button>
      </form>
      {confirmState?.error && <p className="text-sm text-red-600">{confirmState.error}</p>}
    </div>
  );
}
