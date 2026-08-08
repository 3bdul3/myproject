"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSupplierAuth } from "@/lib/supplierAuth";
import type { Bill, PurchaseOrder, SupplierDocuments } from "@/types";

export async function getMyBills() {
  const { supplierId, companyId } = await requireSupplierAuth();
  return db.bills.findAsync<Bill>(companyId, { supplierId }).sort({ date: -1 });
}

export async function getMyPurchaseOrders() {
  const { supplierId, companyId } = await requireSupplierAuth();
  const orders = await db.purchaseOrders.findAsync<PurchaseOrder>(companyId, { supplierId }).sort({ date: -1 });
  // Drafts haven't been sent to the supplier yet — they shouldn't see them.
  return orders.filter((o) => o.status !== "draft");
}

export async function getMySupplierDocuments() {
  const { supplierId, companyId } = await requireSupplierAuth();
  const existing = await db.supplierDocuments.findOneAsync<SupplierDocuments>(companyId, { supplierId });
  if (existing) return existing;
  return { supplierId, createdAt: new Date().toISOString() } as SupplierDocuments;
}

async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export async function uploadSupplierDocuments(formData: FormData) {
  const { supplierId, companyId } = await requireSupplierAuth();
  const existing = await db.supplierDocuments.findOneAsync<SupplierDocuments>(companyId, { supplierId });

  const patch: Partial<SupplierDocuments> = {};

  const crFile = formData.get("crFile");
  if (crFile instanceof File && crFile.size > 0) patch.crFileDataUrl = await fileToDataUrl(crFile);

  const vatFile = formData.get("vatCertificateFile");
  if (vatFile instanceof File && vatFile.size > 0) patch.vatCertificateFileDataUrl = await fileToDataUrl(vatFile);

  const bankFile = formData.get("bankLetterFile");
  if (bankFile instanceof File && bankFile.size > 0) patch.bankLetterFileDataUrl = await fileToDataUrl(bankFile);

  if (existing) {
    await db.supplierDocuments.updateAsync(companyId, { _id: existing._id }, { $set: patch });
  } else {
    await db.supplierDocuments.insertAsync<SupplierDocuments>(companyId, {
      supplierId,
      ...patch,
      createdAt: new Date().toISOString(),
    });
  }

  revalidatePath("/supplier/documents");
}
