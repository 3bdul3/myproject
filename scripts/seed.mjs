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
const companies = store("company_settings.db");

const now = new Date().toISOString();

async function seedCompanyOne() {
  const existing = await companies.findOneAsync({});
  if (existing) return existing._id;
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
    createdAt: now,
  });
  console.log("Created Company #1.");
  return created._id;
}

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

async function seedTransactionManager(companyId) {
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
    companyId,
    createdAt: now,
  });
  console.log("Created Transaction Manager user: transactions@erp.local / transactions123");
}

async function seedChartOfAccounts(companyId) {
  // Create hierarchical chart of accounts with parent/sub relationships
  const chart = [
    // ASSETS
    {
      code: "1000", nameAr: "الأصول", nameEn: "Assets", type: "asset", category: "fixed_assets",
      subLedgerType: "general", postingType: "header", status: "active", allowManualEntry: false
    },
    {
      code: "1010", nameAr: "الأصول المتداولة", nameEn: "Current Assets", type: "asset", category: "fixed_assets",
      subLedgerType: "general", postingType: "header", status: "active", allowManualEntry: false, parentId: "1000"
    },
    {
      code: "1011", nameAr: "النقد والبنوك", nameEn: "Cash & Banks", type: "asset", category: "cash",
      subLedgerType: "general", postingType: "header", status: "active", allowManualEntry: false, parentId: "1010"
    },
    {
      code: "1012", nameAr: "الصندوق", nameEn: "Cash", type: "asset", category: "cash",
      subLedgerType: "general", postingType: "posting", status: "active", allowManualEntry: true, parentId: "1011"
    },
    {
      code: "1013", nameAr: "البنك", nameEn: "Bank Account", type: "asset", category: "cash",
      subLedgerType: "general", postingType: "posting", status: "active", allowManualEntry: true, parentId: "1011"
    },
    {
      code: "1100", nameAr: "الذمم المدينة", nameEn: "Accounts Receivable", type: "asset", category: "receivables",
      subLedgerType: "customer", postingType: "control", status: "active", allowManualEntry: false, parentId: "1010"
    },
    {
      code: "1150", nameAr: "ضريبة القيمة المضافة المستحقة", nameEn: "VAT Receivable (Input)", type: "asset", category: "tax",
      subLedgerType: "general", postingType: "posting", status: "active", allowManualEntry: false, parentId: "1010"
    },
    {
      code: "1200", nameAr: "المخزون", nameEn: "Inventory", type: "asset", category: "fixed_assets",
      subLedgerType: "general", postingType: "posting", status: "active", allowManualEntry: true, parentId: "1010"
    },
    {
      code: "1500", nameAr: "الأصول الثابتة", nameEn: "Fixed Assets", type: "asset", category: "fixed_assets",
      subLedgerType: "general", postingType: "header", status: "active", allowManualEntry: false, parentId: "1000"
    },
    
    // LIABILITIES
    {
      code: "2000", nameAr: "الالتزامات", nameEn: "Liabilities", type: "liability", category: "payables",
      subLedgerType: "general", postingType: "header", status: "active", allowManualEntry: false
    },
    {
      code: "2010", nameAr: "الذمم الدائنة", nameEn: "Accounts Payable", type: "liability", category: "payables",
      subLedgerType: "general", postingType: "header", status: "active", allowManualEntry: false, parentId: "2000"
    },
    {
      code: "2020", nameAr: "الموردين", nameEn: "Trade Payables", type: "liability", category: "payables",
      subLedgerType: "supplier", postingType: "control", status: "active", allowManualEntry: false, parentId: "2010"
    },
    {
      code: "2100", nameAr: "الضرائب والزكاة", nameEn: "Tax & Zakat Accounts", type: "liability", category: "tax",
      subLedgerType: "general", postingType: "header", status: "active", allowManualEntry: false, parentId: "2000"
    },
    {
      code: "2110", nameAr: "ضريبة القيمة المضافة المستحقة", nameEn: "VAT Payable (Output)", type: "liability", category: "tax",
      subLedgerType: "general", postingType: "posting", status: "active", allowManualEntry: false, parentId: "2100"
    },
    {
      code: "2120", nameAr: "ضريبة القيمة المضافة القابلة للاسترداد", nameEn: "VAT Receivable (Input)", type: "liability", category: "tax",
      subLedgerType: "general", postingType: "posting", status: "active", allowManualEntry: false, parentId: "2100"
    },
    {
      code: "2130", nameAr: "ضريبة الخصم من المصدر", nameEn: "Withholding Tax", type: "liability", category: "tax",
      subLedgerType: "general", postingType: "posting", status: "active", allowManualEntry: false, parentId: "2100"
    },
    {
      code: "2140", nameAr: "الزكاة المستحقة", nameEn: "Zakat Payable", type: "liability", category: "tax",
      subLedgerType: "general", postingType: "posting", status: "active", allowManualEntry: false, parentId: "2100"
    },
    
    // EQUITY
    {
      code: "3000", nameAr: "حقوق الملكية", nameEn: "Equity", type: "equity", category: "equity",
      subLedgerType: "general", postingType: "header", status: "active", allowManualEntry: false
    },
    {
      code: "3100", nameAr: "رأس المال", nameEn: "Owner's Equity", type: "equity", category: "equity",
      subLedgerType: "general", postingType: "posting", status: "active", allowManualEntry: true, parentId: "3000"
    },
    
    // REVENUE
    {
      code: "4000", nameAr: "الإيرادات", nameEn: "Revenue", type: "revenue", category: "revenue",
      subLedgerType: "general", postingType: "header", status: "active", allowManualEntry: false
    },
    {
      code: "4100", nameAr: "إيرادات المبيعات", nameEn: "Sales Revenue", type: "revenue", category: "revenue",
      subLedgerType: "general", postingType: "posting", status: "active", allowManualEntry: true, parentId: "4000"
    },
    {
      code: "4900", nameAr: "خصومات المبيعات", nameEn: "Sales Discounts", type: "revenue", category: "revenue",
      subLedgerType: "general", postingType: "posting", status: "active", allowManualEntry: true, parentId: "4000"
    },
    
    // EXPENSES
    {
      code: "5000", nameAr: "المصروفات", nameEn: "Expenses", type: "expense", category: "expenses",
      subLedgerType: "general", postingType: "header", status: "active", allowManualEntry: false
    },
    {
      code: "5100", nameAr: "تكلفة البضاعة المباعة", nameEn: "Cost of Goods Sold", type: "expense", category: "expenses",
      subLedgerType: "general", postingType: "posting", status: "active", allowManualEntry: true, parentId: "5000"
    },
    {
      code: "5200", nameAr: "الرواتب والأجور", nameEn: "Payroll Expense", type: "expense", category: "expenses",
      subLedgerType: "general", postingType: "posting", status: "active", allowManualEntry: true, parentId: "5000"
    },
    {
      code: "5300", nameAr: "المصروفات التشغيلية", nameEn: "Operating Expense", type: "expense", category: "expenses",
      subLedgerType: "general", postingType: "posting", status: "active", allowManualEntry: true, parentId: "5000"
    },
  ];
  
  let added = 0;
  let updated = 0;
  
  // First pass: create all accounts without parent relationships
  for (const a of chart) {
    const { parentId, ...accountData } = a;
    const existing = await accounts.findOneAsync({ companyId, code: a.code });
    
    if (existing) {
      // Update existing account with new structure
      const updateData = {
        nameAr: a.nameAr,
        nameEn: a.nameEn,
        category: a.category,
        subLedgerType: a.subLedgerType,
        postingType: a.postingType,
        status: a.status,
        allowManualEntry: a.allowManualEntry,
        updatedAt: now
      };
      
      await accounts.updateAsync({ _id: existing._id }, { $set: updateData });
      updated += 1;
    } else {
      // Insert new account
      await accounts.insertAsync({
        ...accountData,
        companyId,
        codeKey: `${companyId}:${a.code}`,
        balance: 0,
        hasJournalEntries: false,
        createdAt: now,
      });
      added += 1;
    }
  }
  
  // Second pass: establish parent relationships using code references
  for (const a of chart) {
    if (a.parentId) {
      const parent = await accounts.findOneAsync({ companyId, code: a.parentId });
      const child = await accounts.findOneAsync({ companyId, code: a.code });
      
      if (parent && child && parent._id !== child._id) {
        await accounts.updateAsync({ _id: child._id }, { $set: { parentId: parent._id } });
      }
    }
  }
  
  console.log(
    added > 0 || updated > 0
      ? `Seeded ${added} new account(s), updated ${updated} existing account(s).`
      : "Chart of accounts already up to date."
  );
}

async function seedWarehouse(companyId) {
  const count = await warehouses.countAsync({ companyId });
  if (count > 0) return;
  await warehouses.insertAsync({ name: "Main Warehouse", location: "HQ", companyId, createdAt: now });
  console.log("Seeded default warehouse.");
}

async function seedDepartments(companyId) {
  const count = await departments.countAsync({ companyId });
  if (count > 0) return;
  const depts = ["Management", "Sales", "Finance", "Operations", "HR"];
  for (const name of depts) {
    await departments.insertAsync({ name, companyId, createdAt: now });
  }
  console.log(`Seeded ${depts.length} departments.`);
}

const companyId = await seedCompanyOne();
await seedAdmin();
await seedTransactionManager(companyId);
await seedChartOfAccounts(companyId);
await seedWarehouse(companyId);
await seedDepartments(companyId);
console.log("Seeding complete.");
process.exit(0);
