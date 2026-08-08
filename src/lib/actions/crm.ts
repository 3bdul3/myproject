"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as XLSX from "xlsx";
import { db, nextNumber } from "@/lib/db";
import { auth } from "@/auth";
import { getActiveCompanyId } from "@/lib/authz";
import { customerDisplayName } from "@/lib/customer";
import { logAudit } from "@/lib/actions/auditLog";
import type { Customer, Lead, LeadStatus, Product, SalesOrder, StockMovement } from "@/types";

export async function listCustomers() {
  const companyId = await getActiveCompanyId();
  return db.customers.findAsync<Customer>(companyId, { archived: { $ne: true } }).sort({ createdAt: -1 });
}

export async function listArchivedCustomers() {
  const companyId = await getActiveCompanyId();
  return db.customers.findAsync<Customer>(companyId, { archived: true }).sort({ createdAt: -1 });
}

export async function getCustomer(id: string) {
  const companyId = await getActiveCompanyId();
  return db.customers.findOneAsync<Customer>(companyId, { _id: id });
}

export async function getNextCustomerCode(companyId: string) {
  const count = await db.customers.countAsync(companyId, {});
  return nextNumber("CUST", count + 1);
}

export async function createCustomer(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const customerCode = await getNextCustomerCode(companyId);
  await db.customers.insertAsync<Customer>(companyId, {
    customerCode,
    nameAr: String(formData.get("nameAr")),
    nameEn: String(formData.get("nameEn")),
    vatNumber: String(formData.get("vatNumber") || ""),
    crNumber: String(formData.get("crNumber") || ""),
    nationalAddress: {
      buildingNumber: String(formData.get("buildingNumber") || ""),
      streetName: String(formData.get("streetName") || ""),
      district: String(formData.get("district") || ""),
      city: String(formData.get("city") || ""),
      postalCode: String(formData.get("postalCode") || ""),
      additionalNumber: String(formData.get("additionalNumber") || ""),
      unitNumber: String(formData.get("unitNumber") || ""),
    },
    contactName: String(formData.get("contactName")),
    contactEmail: String(formData.get("contactEmail")),
    contactMobile: String(formData.get("contactMobile")),
    invoiceEmail: String(formData.get("invoiceEmail")),
    infoEmail: String(formData.get("infoEmail") || ""),
    createdAt: new Date().toISOString(),
  });
  revalidatePath("/sales/customers");
}

export async function importCustomersFromExcel(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  for (const row of rows) {
    if (!row.nameAr && !row.nameEn) continue;

    const customerCode = await getNextCustomerCode(companyId);
    await db.customers.insertAsync<Customer>(companyId, {
      customerCode,
      nameAr: row.nameAr || "",
      nameEn: row.nameEn || "",
      vatNumber: row.vatNumber || "",
      crNumber: row.crNumber || "",
      nationalAddress: {
        buildingNumber: row.buildingNumber || "",
        streetName: row.streetName || "",
        district: row.district || "",
        city: row.city || "",
        postalCode: row.postalCode || "",
        additionalNumber: row.additionalNumber || "",
        unitNumber: row.unitNumber || "",
      },
      contactName: row.contactName || "",
      contactEmail: row.contactEmail || "",
      contactMobile: row.contactMobile || "",
      invoiceEmail: row.invoiceEmail || "",
      infoEmail: row.infoEmail || "",
      createdAt: new Date().toISOString(),
    });
  }

  revalidatePath("/sales/customers");
}

export async function deleteCustomer(id: string) {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  const customer = await db.customers.findOneAsync<Customer>(companyId, { _id: id });
  await db.customers.updateAsync(companyId, { _id: id }, { $set: { archived: true } });
  if (session?.user && customer) {
    await logAudit(
      companyId,
      session.user.id,
      session.user.name ?? "",
      "archive_customer",
      "customer",
      id,
      `Archived customer ${customerDisplayName(customer)}`
    );
  }
  revalidatePath("/sales/customers");
}

export async function restoreCustomer(id: string) {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  const customer = await db.customers.findOneAsync<Customer>(companyId, { _id: id });
  await db.customers.updateAsync(companyId, { _id: id }, { $set: { archived: false } });
  if (session?.user && customer) {
    await logAudit(
      companyId,
      session.user.id,
      session.user.name ?? "",
      "restore_customer",
      "customer",
      id,
      `Restored customer ${customerDisplayName(customer)}`
    );
  }
  revalidatePath("/sales/customers");
}

/** Admin-only: sets/resets a customer's portal login. `portalUsername` is globally unique (see the sparse index in db.ts) since the portal login lookup must resolve a customer before any companyId is known. */
export async function setCustomerPortalCredentials(customerId: string, formData: FormData) {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (session?.user?.role !== "admin") return;

  const username = String(formData.get("portalUsername") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("portalPassword") || "");
  if (!username || !password) return;

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await db.customers.updateAsync(
      companyId,
      { _id: customerId },
      { $set: { portalUsername: username, portalPasswordHash: passwordHash, portalActive: true } }
    );
  } catch {
    redirect(
      `/sales/customers?error=${encodeURIComponent("That portal username is already taken — choose another.")}`
    );
  }

  await logAudit(
    companyId,
    session.user.id,
    session.user.name ?? "",
    "set_customer_portal_credentials",
    "customer",
    customerId,
    `Set portal credentials for customer (username: ${username})`
  );

  revalidatePath("/sales/customers");
}

export async function setCustomerPortalActive(customerId: string, active: boolean) {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (session?.user?.role !== "admin") return;

  await db.customers.updateAsync(companyId, { _id: customerId }, { $set: { portalActive: active } });
  revalidatePath("/sales/customers");
}

/** Admin-only: puts a customer on hold — blocks new sales orders/invoices without hiding or archiving the record. */
export async function setCustomerSuspended(customerId: string, suspended: boolean) {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  if (session?.user?.role !== "admin") return;

  const customer = await db.customers.findOneAsync<Customer>(companyId, { _id: customerId });
  await db.customers.updateAsync(companyId, { _id: customerId }, { $set: { suspended } });

  if (customer) {
    await logAudit(
      companyId,
      session.user.id,
      session.user.name ?? "",
      suspended ? "suspend_customer" : "reactivate_customer",
      "customer",
      customerId,
      `${suspended ? "Suspended" : "Reactivated"} customer ${customerDisplayName(customer)}`
    );
  }

  revalidatePath("/sales/customers");
}

export async function listLeads() {
  const companyId = await getActiveCompanyId();
  return db.leads.findAsync<Lead>(companyId, { archived: { $ne: true } }).sort({ createdAt: -1 });
}

export async function listArchivedLeads() {
  const companyId = await getActiveCompanyId();
  return db.leads.findAsync<Lead>(companyId, { archived: true }).sort({ createdAt: -1 });
}

export async function createLead(formData: FormData) {
  const companyId = await getActiveCompanyId();
  await db.leads.insertAsync<Lead>(companyId, {
    name: String(formData.get("name")),
    contact: String(formData.get("contact")),
    source: String(formData.get("source")),
    status: "new",
    value: Number(formData.get("value") || 0),
    notes: String(formData.get("notes") || ""),
    createdAt: new Date().toISOString(),
  });
  revalidatePath("/sales/leads");
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const companyId = await getActiveCompanyId();
  await db.leads.updateAsync(companyId, { _id: id }, { $set: { status } });
  revalidatePath("/sales/leads");
}

export async function deleteLead(id: string) {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  const lead = await db.leads.findOneAsync<Lead>(companyId, { _id: id });
  await db.leads.updateAsync(companyId, { _id: id }, { $set: { archived: true } });
  if (session?.user && lead) {
    await logAudit(companyId, session.user.id, session.user.name ?? "", "archive_lead", "lead", id, `Archived lead ${lead.name}`);
  }
  revalidatePath("/sales/leads");
}

export async function restoreLead(id: string) {
  const companyId = await getActiveCompanyId();
  const session = await auth();
  const lead = await db.leads.findOneAsync<Lead>(companyId, { _id: id });
  await db.leads.updateAsync(companyId, { _id: id }, { $set: { archived: false } });
  if (session?.user && lead) {
    await logAudit(companyId, session.user.id, session.user.name ?? "", "restore_lead", "lead", id, `Restored lead ${lead.name}`);
  }
  revalidatePath("/sales/leads");
}

export async function listSalesOrders() {
  const companyId = await getActiveCompanyId();
  return db.salesOrders.findAsync<SalesOrder>(companyId, {}).sort({ createdAt: -1 });
}

export async function createSalesOrder(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const customerId = String(formData.get("customerId"));
  const customer = await db.customers.findOneAsync<Customer>(companyId, { _id: customerId });
  if (customer?.suspended) {
    redirect(
      `/sales/orders?error=${encodeURIComponent(`${customerDisplayName(customer)} is suspended — reactivate them before creating a new sales order.`)}`
    );
  }
  const date = String(formData.get("date"));
  const items: Array<{ productId: string; productName: string; qty: number; price: number }> = JSON.parse(
    String(formData.get("items") || "[]")
  );

  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  const count = await db.salesOrders.countAsync(companyId, {});
  const number = nextNumber("SO", count + 1);

  await db.salesOrders.insertAsync<SalesOrder>(companyId, {
    number,
    customerId,
    customerName: customer ? customerDisplayName(customer) : "Unknown",
    date,
    items,
    total,
    status: "draft",
    createdAt: new Date().toISOString(),
  });

  revalidatePath("/sales/orders");
}

export async function confirmSalesOrder(orderId: string) {
  const companyId = await getActiveCompanyId();
  const order = await db.salesOrders.findOneAsync<SalesOrder>(companyId, { _id: orderId });
  if (!order || order.status !== "draft") return;

  const warehouse = await db.warehouses.findOneAsync<{ _id: string }>(companyId, {});
  if (warehouse) {
    for (const item of order.items) {
      await db.stockMovements.insertAsync<StockMovement>(companyId, {
        productId: item.productId,
        productName: item.productName,
        warehouseId: warehouse._id!,
        type: "out",
        qty: item.qty,
        ref: order.number,
        date: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Confirming an order no longer auto-creates a tax invoice: per the finalized
  // billing workflow, a tax invoice can only be issued once a signed Proposal and
  // the customer's document checklist are on file (see accounting.ts, createTaxInvoice).
  // The accountant issues the invoice manually from Accounting > Invoices, referencing
  // the matching Proposal.
  await db.salesOrders.updateAsync(companyId, { _id: orderId }, { $set: { status: "confirmed" } });

  revalidatePath("/sales/orders");
  revalidatePath("/inventory/stock");
}

export async function listProductsForSelect() {
  const companyId = await getActiveCompanyId();
  return db.products.findAsync<Product>(companyId, { archived: { $ne: true } }).sort({ name: 1 });
}
