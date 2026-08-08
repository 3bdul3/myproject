"use client";

import { useActionState } from "react";
import { changePassword } from "@/lib/actions/changePassword";
import PasswordField from "@/components/PasswordField";

export default function ChangePasswordPage() {
  const [state, formAction, pending] = useActionState(changePassword, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-stone-900">Update Your Password</h1>
        <p className="mb-6 text-xs text-stone-500">
          For your account&apos;s security, you need to set a new password before continuing.
        </p>

        <form action={formAction} className="space-y-4">
          <PasswordField label="Current Password" name="currentPassword" required autoComplete="current-password" />
          <PasswordField label="New Password" name="newPassword" required minLength={8} autoComplete="new-password" />
          <PasswordField
            label="Confirm New Password"
            name="confirmPassword"
            required
            minLength={8}
            autoComplete="new-password"
          />

          {state?.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? "Saving..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
