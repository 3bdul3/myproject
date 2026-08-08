"use client";

import { useActionState } from "react";
import { supplierLoginAction } from "@/lib/actions/supplierAuth";
import PasswordField from "@/components/PasswordField";

export default function SupplierLoginPage() {
  const [state, formAction, pending] = useActionState(supplierLoginAction, undefined);

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-stone-900">Supplier Portal</h1>
        <p className="mb-6 text-xs text-stone-500">Sign in with the credentials your contact gave you</p>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Username</label>
            <input
              name="username"
              required
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <PasswordField label="Password" name="password" required />

          {state?.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
