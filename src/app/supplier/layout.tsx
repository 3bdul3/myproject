import Link from "next/link";
import { getSupplierSession } from "@/lib/supplierAuth";
import { supplierLogoutAction } from "@/lib/actions/supplierAuth";
import { db } from "@/lib/db";
import type { Supplier } from "@/types";

export default async function SupplierLayout({ children }: { children: React.ReactNode }) {
  const session = await getSupplierSession();
  const supplier = session
    ? await db.suppliers.findOneAsync<Supplier>(session.companyId, { _id: session.supplierId })
    : null;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex h-14 items-center justify-between border-b border-stone-200 bg-white px-6">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold text-stone-900">Supplier Portal</span>
          {supplier && (
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/supplier/dashboard" className="text-stone-600 hover:text-brand-600">
                Dashboard
              </Link>
              <Link href="/supplier/documents" className="text-stone-600 hover:text-brand-600">
                Documents
              </Link>
            </nav>
          )}
        </div>
        {supplier && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-500">{supplier.name}</span>
            <form action={supplierLogoutAction}>
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
