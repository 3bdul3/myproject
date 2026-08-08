"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getActiveCompanyId } from "@/lib/authz";
import { logAudit } from "@/lib/actions/auditLog";
import type { Account, Company } from "@/types";

/**
 * Admin-only, confirmation-gated: permanently clears every invoice, customer, supplier, purchase
 * order, bill, and their related payments/documents/approval requests across every company, and
 * resets every account's balance to zero. Does NOT touch structural setup — users, companies,
 * warehouses, products, stock movements, employees — or unrelated data like leads/tasks/leave
 * requests/notifications/audit log.
 */
export async function resetTransactionalData(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await auth();
  if (session?.user?.role !== "admin") return { error: "Admin only." };

  const confirmation = String(formData.get("confirmation") || "");
  if (confirmation !== "DELETE") {
    return { error: 'Type "DELETE" exactly to confirm.' };
  }

  const companies = await db.companies.findAsync<Company>({});

  for (const company of companies) {
    const companyId = company._id!;
    await db.invoices.removeAsync(companyId, {}, { multi: true });
    await db.journalEntries.removeAsync(companyId, {}, { multi: true });
    await db.payments.removeAsync(companyId, {}, { multi: true });
    await db.customers.removeAsync(companyId, {}, { multi: true });
    await db.salesOrders.removeAsync(companyId, {}, { multi: true });
    await db.proposals.removeAsync(companyId, {}, { multi: true });
    await db.customerDocuments.removeAsync(companyId, {}, { multi: true });
    await db.suppliers.removeAsync(companyId, {}, { multi: true });
    await db.purchaseOrders.removeAsync(companyId, {}, { multi: true });
    await db.bills.removeAsync(companyId, {}, { multi: true });
    await db.supplierPayments.removeAsync(companyId, {}, { multi: true });
    await db.supplierDocuments.removeAsync(companyId, {}, { multi: true });
    await db.approvalRequests.removeAsync(companyId, {}, { multi: true });

    const accounts = await db.accounts.findAsync<Account>(companyId, {});
    for (const a of accounts) {
      await db.accounts.updateAsync(companyId, { _id: a._id! }, { $set: { balance: 0 } });
    }
  }

  const activeCompanyId = await getActiveCompanyId();
  await logAudit(
    activeCompanyId,
    session.user.id,
    session.user.name ?? "",
    "reset_transactional_data",
    "system",
    undefined,
    `Cleared all invoices, customers, suppliers, and related financial data across ${companies.length} compan${companies.length === 1 ? "y" : "ies"}; reset account balances to zero`
  );

  revalidatePath("/", "layout");
  return { success: true };
}
