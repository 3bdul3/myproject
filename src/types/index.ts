export type Role = "admin" | "accountant" | "sales" | "hr" | "warehouse" | "transaction_manager";

export interface Base {
  _id?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface User extends Base {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  /** Required for locked roles (sales/hr/warehouse/transaction_manager); unused for admin/accountant, who access every company. */
  companyId?: string;
  /** TOTP secret, set once during enrollment and never cleared until re-enrolled. */
  totpSecret?: string;
  /** Only true once a code has been confirmed against totpSecret — enrollment alone doesn't require it at login. */
  totpEnabled?: boolean;
  /** Admin-set account suspension — a disabled user can't log in until re-enabled. */
  disabled?: boolean;
  /** Admin-assigned short login code — an alternative to email at sign-in. Globally unique like email. */
  loginCode?: string;
  /** Forces a password change on next login — set when an admin creates the account or resets its password. */
  mustChangePassword?: boolean;
  /** When the password was last changed — used to enforce the periodic rotation policy. */
  passwordChangedAt?: string;
}

// Account Classification (Financial Statement Categories)
export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

// Account Group (Legacy - for backward compatibility)
export type AccountGroup = "general" | "ar" | "ap_trade" | "ap_zakat";

// Account Sub-classification (More detailed categorization)
export type AccountCategory = 
  | "cash" 
  | "fixed_assets" 
  | "receivables" 
  | "payables" 
  | "tax" 
  | "revenue" 
  | "expenses" 
  | "equity";

// Sub-ledger Type (Separate from classification)
export type SubLedgerType = "general" | "customer" | "supplier";

// Account Posting Type (Header/Posting/Control)
export type AccountPostingType = "header" | "posting" | "control";

// Account Status
export type AccountStatus = "active" | "inactive";

export interface Account extends Base {
  companyId?: string;
  code: string;
  /** Derived `${companyId}:${code}` key, unique-indexed, since NeDB has no native compound unique index. */
  codeKey?: string;
  /** Parent account ID for hierarchical structure (parent/sub-accounts) */
  parentId?: string;
  /** Account name in Arabic */
  nameAr: string;
  /** Account name in English */
  nameEn: string;
  /** Legacy name field for backward compatibility */
  name?: string;
  /** Financial statement classification */
  type: AccountType;
  /** Legacy group field for backward compatibility */
  group?: AccountGroup;
  /** Detailed account category */
  category: AccountCategory;
  /** Sub-ledger association */
  subLedgerType: SubLedgerType;
  /** Posting behavior (header accounts cannot have direct journal entries) */
  postingType: AccountPostingType;
  /** Account status (active/inactive) */
  status: AccountStatus;
  /** Whether manual journal entries are allowed on this account */
  allowManualEntry: boolean;
  /** Current balance */
  balance: number;
  /** User who last modified this account (for audit trail) */
  lastModifiedBy?: string;
  /** Whether this account has been used in journal entries (prevents deletion) */
  hasJournalEntries?: boolean;
  /** Suggested next account code for child accounts */
  suggestedChildCode?: string;
}

export interface JournalLine {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry extends Base {
  companyId?: string;
  number: string;
  date: string;
  memo: string;
  lines: JournalLine[];
  sourceType?: "invoice" | "payment" | "bill" | "manual" | "credit_note" | "debit_note";
  sourceId?: string;
}

export type InvoiceDocType = "proforma" | "tax" | "credit_note" | "debit_note";

export type InvoiceStatus = "draft" | "posted" | "partial" | "paid" | "void" | "converted";

export interface LineItem {
  description: string;
  qty: number;
  price: number;
}

export interface Invoice extends Base {
  companyId?: string;
  docType: InvoiceDocType;
  number: string;
  customerId: string;
  customerName: string;
  date: string;
  dueDate: string;
  supplyDate?: string;
  poNumber?: string;
  projectDuration?: string;
  projectStartDate?: string;
  projectEndDate?: string;
  proposalId?: string;
  proposalNumber?: string;
  items: LineItem[];
  discount?: number;
  subtotal: number;
  /** VAT rate applied to this document (0, 0.05, or 0.15) — defaults to 0.15 (TAX_RATE) for documents created before this field existed. */
  taxRate?: number;
  tax: number;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
  salesOrderId?: string;
  relatedInvoiceId?: string;
  relatedInvoiceNumber?: string;
}

export interface Payment extends Base {
  companyId?: string;
  invoiceId: string;
  amount: number;
  date: string;
  method: "cash" | "bank" | "card";
  allocationNumber?: string;
  receiptDate?: string;
  approvalDate?: string;
}

export type ProposalStatus = "draft" | "sent" | "signed";

export interface Proposal extends Base {
  companyId?: string;
  number: string;
  customerId: string;
  customerName: string;
  projectStartDate: string;
  projectEndDate: string;
  amount: number;
  status: ProposalStatus;
  signedFileDataUrl?: string;
  serviceContractFileDataUrl?: string;
  notes?: string;
}

export interface CustomerDocuments extends Base {
  companyId?: string;
  customerId: string;
  crOrNationalIdFileDataUrl?: string;
  taxCertificateFileDataUrl?: string;
  kycFileDataUrl?: string;
}

export interface NationalAddress {
  buildingNumber: string;
  streetName: string;
  district: string;
  city: string;
  postalCode: string;
  additionalNumber: string;
  unitNumber?: string;
}

export interface Customer extends Base {
  companyId?: string;
  customerCode: string;
  nameAr: string;
  nameEn: string;
  vatNumber?: string;
  crNumber?: string;
  nationalAddress: NationalAddress;
  contactName: string;
  contactEmail: string;
  contactMobile: string;
  invoiceEmail: string;
  infoEmail?: string;
  /** Customer portal login — optional, set by an admin from the Customers page. */
  portalUsername?: string;
  portalPasswordHash?: string;
  portalActive?: boolean;
  /** Soft-delete flag — "deleting" a customer archives it instead of removing the record. */
  archived?: boolean;
  /** Admin-set hold — blocks new sales orders/invoices for this customer without hiding the record. */
  suspended?: boolean;
}

export type LeadStatus = "new" | "qualified" | "won" | "lost";

export interface Lead extends Base {
  companyId?: string;
  name: string;
  contact: string;
  source: string;
  status: LeadStatus;
  value: number;
  notes?: string;
  /** Soft-delete flag — "deleting" a lead archives it instead of removing the record. */
  archived?: boolean;
}

export type SalesOrderStatus = "draft" | "confirmed" | "invoiced" | "cancelled";

export interface SalesOrder extends Base {
  companyId?: string;
  number: string;
  customerId: string;
  customerName: string;
  date: string;
  items: Array<{ productId: string; productName: string; qty: number; price: number }>;
  total: number;
  status: SalesOrderStatus;
  invoiceId?: string;
}

export interface Product extends Base {
  companyId?: string;
  sku: string;
  /** Derived `${companyId}:${sku}` key, unique-indexed, since NeDB has no native compound unique index. */
  skuKey?: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  reorderLevel: number;
  /** Soft-delete flag — "deleting" a product archives it instead of removing the record. */
  archived?: boolean;
}

export interface Warehouse extends Base {
  companyId?: string;
  name: string;
  location: string;
}

export type StockMovementType = "in" | "out" | "adjust";

export interface StockMovement extends Base {
  companyId?: string;
  productId: string;
  productName: string;
  warehouseId: string;
  type: StockMovementType;
  qty: number;
  ref?: string;
  date: string;
}

export interface Supplier extends Base {
  companyId?: string;
  name: string;
  vatNumber?: string;
  crNumber?: string;
  email: string;
  phone: string;
  address?: string;
  /** Supplier portal login — optional, set by an admin from the Suppliers page. */
  portalUsername?: string;
  portalPasswordHash?: string;
  portalActive?: boolean;
  /** Admin-set hold — blocks new purchase orders/bills for this supplier without hiding the record. */
  suspended?: boolean;
}

export interface SupplierDocuments extends Base {
  companyId?: string;
  supplierId: string;
  crFileDataUrl?: string;
  vatCertificateFileDataUrl?: string;
  bankLetterFileDataUrl?: string;
}

export type PurchaseOrderStatus = "draft" | "ordered" | "received" | "cancelled";

export interface PurchaseOrder extends Base {
  companyId?: string;
  number: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: Array<{ productId: string; productName: string; qty: number; cost: number }>;
  total: number;
  status: PurchaseOrderStatus;
  warehouseId: string;
}

export type BillStatus = "draft" | "posted" | "partial" | "paid";

export interface Bill extends Base {
  companyId?: string;
  number: string;
  supplierId: string;
  supplierName: string;
  supplierInvoiceNumber: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  date: string;
  dueDate: string;
  hasVat: boolean;
  /** The VAT rate actually applied (0, 0.05, or 0.15) — defaults to 0.15 for bills created before this field existed, when hasVat is true. */
  vatRate?: number;
  subtotal: number;
  vat: number;
  total: number;
  amountPaid: number;
  status: BillStatus;
}

export interface SupplierPayment extends Base {
  companyId?: string;
  billId: string;
  amount: number;
  date: string;
  method: "cash" | "bank" | "card";
}

export type EmployeeStatus = "active" | "on_leave" | "terminated";

export interface Employee extends Base {
  companyId?: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  hireDate: string;
  salary: number;
  status: EmployeeStatus;
  /** Links this employee to their own login, so they can submit leave requests for themselves. */
  userId?: string;
}

export interface Department extends Base {
  companyId?: string;
  name: string;
  managerName?: string;
}

export type AttendanceStatus = "present" | "absent" | "late" | "leave";

export interface Attendance extends Base {
  companyId?: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
}

export type PayrollStatus = "draft" | "paid";

export interface Payroll extends Base {
  companyId?: string;
  employeeId: string;
  employeeName: string;
  month: string;
  baseSalary: number;
  deductions: number;
  bonuses: number;
  netPay: number;
  status: PayrollStatus;
}

/** A single tenant/business. `db.companies` is the tenant table itself — not company-scoped like everything else. */
export interface Company extends Base {
  nameAr: string;
  nameEn: string;
  vatNumber: string;
  crNumber: string;
  nationalAddress: NationalAddress;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIban: string;
  logoDataUrl?: string;
}

/** @deprecated use {@link Company} */
export type CompanySettings = Company;

export type NotificationType =
  | "approval_requested"
  | "approval_approved"
  | "approval_rejected"
  | "leave_requested"
  | "leave_decided";

export interface Notification extends Base {
  companyId?: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  read: boolean;
}

export type ApprovalTargetType = "invoice" | "bill" | "purchase_order";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface ApprovalRequest extends Base {
  companyId?: string;
  targetType: ApprovalTargetType;
  targetId: string;
  targetNumber: string;
  requestedByUserId: string;
  requestedByName: string;
  status: ApprovalStatus;
  decidedByUserId?: string;
  decidedByName?: string;
  decidedAt?: string;
  note?: string;
}

export interface LeaveRequest extends Base {
  companyId?: string;
  employeeId: string;
  employeeName: string;
  requestedByUserId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: ApprovalStatus;
  decidedByUserId?: string;
  decidedByName?: string;
  decidedAt?: string;
  note?: string;
}

export interface TaskItem extends Base {
  companyId?: string;
  userId: string;
  title: string;
  dueDate?: string;
  done: boolean;
  doneAt?: string;
}

export interface AuditLogEntry extends Base {
  companyId?: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
}
