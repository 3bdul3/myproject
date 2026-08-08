import Link from "next/link";
import { getCustomerSession } from "@/lib/customerAuth";
import { customerLogoutAction } from "@/lib/actions/customerAuth";
import { db } from "@/lib/db";
import { customerDisplayName } from "@/lib/customer";
import type { Customer } from "@/types";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await getCustomerSession();
  const customer = session
    ? await db.customers.findOneAsync<Customer>(session.companyId, { _id: session.customerId })
    : null;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex h-14 items-center justify-between border-b border-stone-200 bg-white px-6">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-stone-900">Customer Portal</span>
          {customer && (
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/customer/dashboard" className="text-stone-600 hover:text-brand-600">
                Dashboard
              </Link>
              <Link href="/customer/statement" className="text-stone-600 hover:text-brand-600">
                Statement
              </Link>
              <Link href="/customer/documents" className="text-stone-600 hover:text-brand-600">
                Documents
              </Link>
            </nav>
          )}
        </div>
        {customer && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-500">{customerDisplayName(customer)}</span>
            <form action={customerLogoutAction}>
              <button className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50">
                Sign out
              </button>
            </form>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}
