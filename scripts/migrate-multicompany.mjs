import Datastore from "@seald-io/nedb";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
function store(name) {
  return new Datastore({ filename: path.join(dataDir, name), autoload: true });
}

const companies = store("company_settings.db");
const users = store("users.db");
const accounts = store("accounts.db");
const products = store("products.db");

// Every tenant-scoped collection except users/companies themselves.
const tenantStores = {
  accounts,
  journalEntries: store("journal_entries.db"),
  invoices: store("invoices.db"),
  payments: store("payments.db"),
  customers: store("customers.db"),
  leads: store("leads.db"),
  salesOrders: store("sales_orders.db"),
  products,
  warehouses: store("warehouses.db"),
  stockMovements: store("stock_movements.db"),
  suppliers: store("suppliers.db"),
  purchaseOrders: store("purchase_orders.db"),
  employees: store("employees.db"),
  departments: store("departments.db"),
  attendance: store("attendance.db"),
  payroll: store("payroll.db"),
  proposals: store("proposals.db"),
  customerDocuments: store("customer_documents.db"),
  bills: store("bills.db"),
  supplierPayments: store("supplier_payments.db"),
};

const LOCKED_ROLES = ["sales", "hr", "warehouse", "transaction_manager"];

async function getOrCreateCompanyOne() {
  const existing = await companies.findOneAsync({});
  if (existing) {
    console.log(`Company #1 already exists: ${existing.nameEn || existing.nameAr || existing._id}`);
    return existing._id;
  }
  const created = await companies.insertAsync({
    nameAr: "",
    nameEn: "",
    vatNumber: "",
    crNumber: "",
    nationalAddress: {
      buildingNumber: "",
      streetName: "",
      district: "",
      city: "",
      postalCode: "",
      additionalNumber: "",
      unitNumber: "",
    },
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankIban: "",
    createdAt: new Date().toISOString(),
  });
  console.log(`Created Company #1 (no prior company_settings row existed): ${created._id}`);
  return created._id;
}

async function backfillCollection(name, ds, companyId) {
  const result = await ds.updateAsync(
    { companyId: { $exists: false } },
    { $set: { companyId } },
    { multi: true }
  );
  const count = typeof result === "number" ? result : result?.numAffected ?? 0;
  console.log(`  ${name}: backfilled ${count} row(s)`);
}

async function backfillUsers(companyId) {
  const result = await users.updateAsync(
    { role: { $in: LOCKED_ROLES }, companyId: { $exists: false } },
    { $set: { companyId } },
    { multi: true }
  );
  const count = typeof result === "number" ? result : result?.numAffected ?? 0;
  console.log(`  users (locked roles only): backfilled ${count} row(s)`);
}

async function backfillCodeKeys(companyId) {
  const accountRows = await accounts.findAsync({ codeKey: { $exists: false } });
  for (const a of accountRows) {
    await accounts.updateAsync({ _id: a._id }, { $set: { codeKey: `${companyId}:${a.code}` } });
  }
  console.log(`  accounts.codeKey: backfilled ${accountRows.length} row(s)`);

  const productRows = await products.findAsync({ skuKey: { $exists: false } });
  for (const p of productRows) {
    await products.updateAsync({ _id: p._id }, { $set: { skuKey: `${companyId}:${p.sku}` } });
  }
  console.log(`  products.skuKey: backfilled ${productRows.length} row(s)`);
}

const companyId = await getOrCreateCompanyOne();

console.log("Backfilling companyId across tenant-scoped collections...");
for (const [name, ds] of Object.entries(tenantStores)) {
  await backfillCollection(name, ds, companyId);
}

console.log("Backfilling companyId on locked-role users...");
await backfillUsers(companyId);

console.log("Backfilling derived unique keys (codeKey/skuKey)...");
await backfillCodeKeys(companyId);

console.log("Migration complete. Company #1 id:", companyId);
process.exit(0);
