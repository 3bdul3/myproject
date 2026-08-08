"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  const [email, setEmail] = useState("admin@erp.local");
  const [password, setPassword] = useState("admin123");

  const needsTotp = state?.step === "totp";

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            M
          </span>
          <div>
            <h1 className="text-lg font-semibold text-stone-900">MSAA Event Management Agency</h1>
            <p className="text-xs text-stone-500">Sign in to your account</p>
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          {!needsTotp ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Email or Login Code</label>
                <input
                  name="email"
                  type="text"
                  autoCapitalize="off"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Password</label>
                <input
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </>
          ) : (
            <>
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="password" value={password} />
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Authentication code</label>
                <p className="mb-2 text-xs text-stone-500">Enter the 6-digit code from your authenticator app.</p>
                <input
                  name="totpCode"
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  required
                  maxLength={6}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm tracking-widest outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </>
          )}

          {state?.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? "Signing in..." : needsTotp ? "Verify" : "Sign in"}
          </button>
        </form>

        {!needsTotp && (
          <p className="mt-4 text-center text-xs">
            <Link href="/forgot-password" className="text-brand-600 hover:underline">
              Forgot password?
            </Link>
          </p>
        )}

        <p className="mt-6 text-xs text-stone-400">
          Default admin: admin@erp.local / admin123
        </p>
      </div>
    </div>
  );
}
