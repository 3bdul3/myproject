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
}

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export type AccountGroup = "ar" | "ap_trade" | "ap_zakat" | "general";

export interface Account extends Base {
  code: string;
  name: string;
  type: AccountType;
  group: AccountGroup;
  balance: number;
}

export interface JournalLine {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry extends Base {
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
  tax: number;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
  salesOrderId?: string;
  relatedInvoiceId?: string;
  relatedInvoiceNumber?: string;
}

export interface Payment extends Base {
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
}

export type LeadStatus = "new" | "qualified" | "won" | "lost";

export interface Lead extends Base {
  name: string;
  contact: string;
  source: string;
  status: LeadStatus;
  value: number;
  notes?: string;
}

export type SalesOrderStatus = "draft" | "confirmed" | "invoiced" | "cancelled";

export interface SalesOrder extends Base {
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
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  reorderLevel: number;
}

export interface Warehouse extends Base {
  name: string;
  location: string;
}

export type StockMovementType = "in" | "out" | "adjust";

export interface StockMovement extends Base {
  productId: string;
  productName: string;
  warehouseId: string;
  type: StockMovementType;
  qty: number;
  ref?: string;
  date: string;
}

export interface Supplier extends Base {
  name: string;
  vatNumber?: string;
  crNumber?: string;
  email: string;
  phone: string;
  address?: string;
}

export type PurchaseOrderStatus = "draft" | "ordered" | "received" | "cancelled";

export interface PurchaseOrder extends Base {
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
  number: string;
  supplierId: string;
  supplierName: string;
  supplierInvoiceNumber: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  date: string;
  dueDate: string;
  hasVat: boolean;
  subtotal: number;
  vat: number;
  total: number;
  amountPaid: number;
  status: BillStatus;
}

export interface SupplierPayment extends Base {
  billId: string;
  amount: number;
  date: string;
  method: "cash" | "bank" | "card";
}

export type EmployeeStatus = "active" | "on_leave" | "terminated";

export interface Employee extends Base {
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  hireDate: string;
  salary: number;
  status: EmployeeStatus;
}

export interface Department extends Base {
  name: string;
  managerName?: string;
}

export type AttendanceStatus = "present" | "absent" | "late" | "leave";

export interface Attendance extends Base {
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
}

export type PayrollStatus = "draft" | "paid";

export interface Payroll extends Base {
  employeeId: string;
  employeeName: string;
  month: string;
  baseSalary: number;
  deductions: number;
  bonuses: number;
  netPay: number;
  status: PayrollStatus;
}

export interface CompanySettings extends Base {
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
