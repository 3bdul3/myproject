import Datastore from "@seald-io/nedb";
import bcrypt from "bcryptjs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
function store(name) {
  return new Datastore({ filename: path.join(dataDir, name), autoload: true });
}

const users = store("users.db");
const accounts = store("accounts.db");
const warehouses = store("warehouses.db");
const departments = store("departments.db");

const now = new Date().toISOString();

async function seedAdmin() {
  const existing = await users.findOneAsync({ email: "admin@erp.local" });
  if (existing) {
    console.log("Admin user already exists, skipping.");
    return;
  }
  const passwordHash = await bcrypt.hash("admin123", 10);
  await users.insertAsync({
    name: "System Admin",
    email: "admin@erp.local",
    passwordHash,
    role: "admin",
    createdAt: now,
  });
  console.log("Created admin user: admin@erp.local / admin123");
}

async function seedTransactionManager() {
  const existing = await users.findOneAsync({ email: "transactions@erp.local" });
  if (existing) {
    console.log("Transaction Manager user already exists, skipping.");
    return;
  }
  const passwordHash = await bcrypt.hash("transactions123", 10);
  await users.insertAsync({
    name: "Transaction Manager",
    email: "transactions@erp.local",
    passwordHash,
    role: "transaction_manager",
    createdAt: now,
  });
  console.log("Created Transaction Manager user: transactions@erp.local / transactions123");
}

async function seedChartOfAccounts() {
  const chart = [
    { code: "1000", name: "Cash", type: "asset", group: "general" },
    { code: "1100", name: "Accounts Receivable", type: "asset", group: "ar" },
    { code: "1150", name: "VAT Receivable (Input)", type: "asset", group: "general" },
    { code: "1200", name: "Inventory", type: "asset", group: "general" },
    { code: "2000", name: "Accounts Payable (Trade)", type: "liability", group: "ap_trade" },
    { code: "2100", name: "VAT Payable (Output)", type: "liability", group: "ap_zakat" },
    { code: "2060", name: "Zakat Payable", type: "liability", group: "ap_zakat" },
    { code: "3000", name: "Owner's Equity", type: "equity", group: "general" },
    { code: "4000", name: "Sales Revenue", type: "revenue", group: "general" },
    { code: "4900", name: "Sales Discounts", type: "revenue", group: "general" },
    { code: "5000", name: "Cost of Goods Sold", type: "expense", group: "general" },
    { code: "5100", name: "Payroll Expense", type: "expense", group: "general" },
    { code: "5200", name: "Operating Expense", type: "expense", group: "general" },
  ];
  let added = 0;
  let updated = 0;
  for (const a of chart) {
    const existing = await accounts.findOneAsync({ code: a.code });
    if (existing) {
      if (existing.name !== a.name || existing.group !== a.group) {
        await accounts.updateAsync({ _id: existing._id }, { $set: { name: a.name, group: a.group } });
        updated += 1;
      }
      continue;
    }
    await accounts.insertAsync({ ...a, balance: 0, createdAt: now });
    added += 1;
  }
  console.log(
    added > 0 || updated > 0
      ? `Seeded ${added} new account(s), updated ${updated} existing account(s).`
      : "Chart of accounts already up to date."
  );
}

async function seedWarehouse() {
  const count = await warehouses.countAsync({});
  if (count > 0) return;
  await warehouses.insertAsync({ name: "Main Warehouse", location: "HQ", createdAt: now });
  console.log("Seeded default warehouse.");
}

async function seedDepartments() {
  const count = await departments.countAsync({});
  if (count > 0) return;
  const depts = ["Management", "Sales", "Finance", "Operations", "HR"];
  for (const name of depts) {
    await departments.insertAsync({ name, createdAt: now });
  }
  console.log(`Seeded ${depts.length} departments.`);
}

await seedAdmin();
await seedTransactionManager();
await seedChartOfAccounts();
await seedWarehouse();
await seedDepartments();
console.log("Seeding complete.");
process.exit(0);
