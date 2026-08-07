"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { db, nextNumber } from "@/lib/db";
import { customerDisplayName } from "@/lib/customer";
import type { Customer, Lead, LeadStatus, Product, SalesOrder, StockMovement } from "@/types";

export async function listCustomers() {
  return db.customers.findAsync<Customer>({}).sort({ createdAt: -1 });
}

export async function getCustomer(id: string) {
  return db.customers.findOneAsync<Customer>({ _id: id });
}

export async function getNextCustomerCode() {
  const count = await db.customers.countAsync({});
  return nextNumber("CUST", count + 1);
}

export async function createCustomer(formData: FormData) {
  const customerCode = await getNextCustomerCode();
  await db.customers.insertAsync<Customer>({
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
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  for (const row of rows) {
    if (!row.nameAr && !row.nameEn) continue;

    const customerCode = await getNextCustomerCode();
    await db.customers.insertAsync<Customer>({
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
  await db.customers.removeAsync({ _id: id }, {});
  revalidatePath("/sales/customers");
}

export async function listLeads() {
  return db.leads.findAsync<Lead>({}).sort({ createdAt: -1 });
}

export async function createLead(formData: FormData) {
  await db.leads.insertAsync<Lead>({
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
  await db.leads.updateAsync({ _id: id }, { $set: { status } });
  revalidatePath("/sales/leads");
}

export async function deleteLead(id: string) {
  await db.leads.removeAsync({ _id: id }, {});
  revalidatePath("/sales/leads");
}

export async function listSalesOrders() {
  return db.salesOrders.findAsync<SalesOrder>({}).sort({ createdAt: -1 });
}

export async function createSalesOrder(formData: FormData) {
  const customerId = String(formData.get("customerId"));
  const customer = await db.customers.findOneAsync<Customer>({ _id: customerId });
  const date = String(formData.get("date"));
  const items: Array<{ productId: string; productName: string; qty: number; price: number }> = JSON.parse(
    String(formData.get("items") || "[]")
  );

  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  const count = await db.salesOrders.countAsync({});
  const number = nextNumber("SO", count + 1);

  await db.salesOrders.insertAsync<SalesOrder>({
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
  const order = await db.salesOrders.findOneAsync<SalesOrder>({ _id: orderId });
  if (!order || order.status !== "draft") return;

  const warehouse = await db.warehouses.findOneAsync<{ _id: string }>({});
  if (warehouse) {
    for (const item of order.items) {
      await db.stockMovements.insertAsync<StockMovement>({
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
  await db.salesOrders.updateAsync({ _id: orderId }, { $set: { status: "confirmed" } });

  revalidatePath("/sales/orders");
  revalidatePath("/inventory/stock");
}

export async function listProductsForSelect() {
  return db.products.findAsync<Product>({}).sort({ name: 1 });
}
