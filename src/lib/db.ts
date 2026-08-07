import Datastore from "@seald-io/nedb";
import path from "path";

const dataDir = path.join(process.cwd(), "data");

function createStore(filename: string) {
  return new Datastore({ filename: path.join(dataDir, filename), autoload: true });
}

export const db = {
  users: createStore("users.db"),
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
  companySettings: createStore("company_settings.db"),
  proposals: createStore("proposals.db"),
  customerDocuments: createStore("customer_documents.db"),
  bills: createStore("bills.db"),
  supplierPayments: createStore("supplier_payments.db"),
};

db.users.ensureIndexAsync({ fieldName: "email", unique: true }).catch(() => {});
db.accounts.ensureIndexAsync({ fieldName: "code", unique: true }).catch(() => {});
db.products.ensureIndexAsync({ fieldName: "sku", unique: true }).catch(() => {});

export function nextNumber(prefix: string, seq: number, width = 5) {
  return `${prefix}-${String(seq).padStart(width, "0")}`;
}
