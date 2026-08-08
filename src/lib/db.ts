import Datastore from "@seald-io/nedb";
import path from "path";

const dataDir = path.join(process.cwd(), "data");

function createStore(filename: string) {
  return new Datastore({ filename: path.join(dataDir, filename), autoload: true });
}

/* eslint-disable @typescript-eslint/no-explicit-any -- matches NeDB's own `Schema = Record<string, any>` constraint */
/**
 * Wraps a NeDB store so `companyId` is a required positional first argument on every
 * method — a missing/forgotten companyId is a TypeScript compile error, not a silent
 * cross-tenant data leak. See the multi-company retrofit plan for the full rationale.
 */
function tenantScoped(raw: Datastore) {
  return {
    findAsync<T extends Record<string, any>>(
      companyId: string,
      query: Record<string, unknown> = {},
      projection?: Record<string, unknown>
    ) {
      return raw.findAsync<T>({ ...query, companyId }, projection);
    },
    findOneAsync<T extends Record<string, any>>(companyId: string, query: Record<string, unknown> = {}) {
      return raw.findOneAsync<T>({ ...query, companyId });
    },
    insertAsync<T extends Record<string, any>>(companyId: string, doc: Record<string, unknown>) {
      return raw.insertAsync<T>({ ...doc, companyId } as unknown as T);
    },
    updateAsync<O extends object = object>(
      companyId: string,
      query: Record<string, unknown>,
      update: Record<string, unknown>,
      options?: O
    ) {
      return raw.updateAsync({ ...query, companyId }, update, options);
    },
    removeAsync(companyId: string, query: Record<string, unknown>, options: Record<string, unknown> = {}) {
      return raw.removeAsync({ ...query, companyId }, options);
    },
    countAsync(companyId: string, query: Record<string, unknown> = {}) {
      return raw.countAsync({ ...query, companyId });
    },
  };
}

const rawStores = {
  users: createStore("users.db"),
  companies: createStore("company_settings.db"),
  accounts: createStore("accounts.db"),
  journalEntries: createStore("journal_entries.db"),
  invoices: createStore("invoices.db"),
  payments: createStore("payments.db"),
  customers: createStore("customers.db"),
  leads: createStore("leads.db"),
  salesOrders: createStore("sales_orders.db"),
  products: createStore("products.db"),
  warehouses: createStore("warehouses.db"),
  stockMovements: createStore("stock_movements.db"),
  suppliers: createStore("suppliers.db"),
  purchaseOrders: createStore("purchase_orders.db"),
  employees: createStore("employees.db"),
  departments: createStore("departments.db"),
  attendance: createStore("attendance.db"),
  payroll: createStore("payroll.db"),
  proposals: createStore("proposals.db"),
  customerDocuments: createStore("customer_documents.db"),
  bills: createStore("bills.db"),
  supplierPayments: createStore("supplier_payments.db"),
  notifications: createStore("notifications.db"),
  approvalRequests: createStore("approval_requests.db"),
  leaveRequests: createStore("leave_requests.db"),
  tasks: createStore("tasks.db"),
  supplierDocuments: createStore("supplier_documents.db"),
  loginAttempts: createStore("login_attempts.db"),
  passwordResetTokens: createStore("password_reset_tokens.db"),
  auditLog: createStore("audit_log.db"),
};

export const db = {
  // Global — not company-scoped. `users` is login identity (one email across every company);
  // `companies` is the tenant table itself, nothing to scope it against. `loginAttempts` tracks
  // failed-login lockouts by a namespaced identifier (e.g. "staff:<email>"), not by company.
  // `passwordResetTokens` is tied to a user's global identity, same reasoning.
  users: rawStores.users,
  companies: rawStores.companies,
  loginAttempts: rawStores.loginAttempts,
  passwordResetTokens: rawStores.passwordResetTokens,

  // Tenant-scoped — company-aware, migrated off raw NeDB access.
  accounts: tenantScoped(rawStores.accounts),
  journalEntries: tenantScoped(rawStores.journalEntries),
  invoices: tenantScoped(rawStores.invoices),
  payments: tenantScoped(rawStores.payments),
  customers: tenantScoped(rawStores.customers),
  proposals: tenantScoped(rawStores.proposals),
  customerDocuments: tenantScoped(rawStores.customerDocuments),
  bills: tenantScoped(rawStores.bills),
  supplierPayments: tenantScoped(rawStores.supplierPayments),
  leads: tenantScoped(rawStores.leads),
  salesOrders: tenantScoped(rawStores.salesOrders),
  products: tenantScoped(rawStores.products),
  warehouses: tenantScoped(rawStores.warehouses),
  stockMovements: tenantScoped(rawStores.stockMovements),
  suppliers: tenantScoped(rawStores.suppliers),
  purchaseOrders: tenantScoped(rawStores.purchaseOrders),
  employees: tenantScoped(rawStores.employees),
  departments: tenantScoped(rawStores.departments),
  attendance: tenantScoped(rawStores.attendance),
  payroll: tenantScoped(rawStores.payroll),
  notifications: tenantScoped(rawStores.notifications),
  approvalRequests: tenantScoped(rawStores.approvalRequests),
  leaveRequests: tenantScoped(rawStores.leaveRequests),
  tasks: tenantScoped(rawStores.tasks),
  supplierDocuments: tenantScoped(rawStores.supplierDocuments),
  auditLog: tenantScoped(rawStores.auditLog),
};

/**
 * Supplier-portal login must resolve which supplier/company a username belongs to before any
 * companyId is known — the same structural reason `db.users` stays raw. Use ONLY inside
 * src/lib/supplierAuth.ts, never from a regular tenant-scoped action.
 */
export const rawSupplierLookup = rawStores.suppliers;

/** Same reasoning as rawSupplierLookup, for the customer portal. Use ONLY inside src/lib/actions/customerAuth.ts. */
export const rawCustomerLookup = rawStores.customers;

db.users.ensureIndexAsync({ fieldName: "email", unique: true }).catch(() => {});
// sparse: most users log in with email only, so `loginCode` is undefined for them — a sparse
// index only enforces uniqueness among documents that actually have the field set.
db.users.ensureIndexAsync({ fieldName: "loginCode", unique: true, sparse: true }).catch(() => {});
// The old bare `code` unique index predates multi-company support and would incorrectly
// block two different companies from both having an account coded e.g. "1000" — it must be
// dropped (removing an ensureIndexAsync call in code does not remove an already-persisted
// index from the datafile) before the replacement `codeKey` (companyId:code) index is added.
rawStores.accounts.removeIndexAsync("code").finally(() => {
  rawStores.accounts.ensureIndexAsync({ fieldName: "codeKey", unique: true }).catch(() => {});
});
rawStores.products.removeIndexAsync("sku").finally(() => {
  rawStores.products.ensureIndexAsync({ fieldName: "skuKey", unique: true }).catch(() => {});
});
// sparse: most suppliers never get portal access, so `portalUsername` is undefined for them —
// a sparse index only enforces uniqueness among documents that actually have the field set.
rawStores.suppliers.ensureIndexAsync({ fieldName: "portalUsername", unique: true, sparse: true }).catch(() => {});
rawStores.customers.ensureIndexAsync({ fieldName: "portalUsername", unique: true, sparse: true }).catch(() => {});
rawStores.loginAttempts.ensureIndexAsync({ fieldName: "identifier", unique: true }).catch(() => {});
rawStores.passwordResetTokens.ensureIndexAsync({ fieldName: "tokenHash", unique: true }).catch(() => {});

export function nextNumber(prefix: string, seq: number, width = 5) {
  return `${prefix}-${String(seq).padStart(width, "0")}`;
}
