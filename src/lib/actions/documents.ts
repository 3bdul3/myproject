"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActiveCompanyId } from "@/lib/authz";
import type { CustomerDocuments } from "@/types";

export async function getCustomerDocuments(customerId: string) {
  const companyId = await getActiveCompanyId();
  const existing = await db.customerDocuments.findOneAsync<CustomerDocuments>(companyId, { customerId });
  if (existing) return existing;
  return { customerId, createdAt: new Date().toISOString() } as CustomerDocuments;
}

async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export async function uploadCustomerDocuments(customerId: string, formData: FormData) {
  const companyId = await getActiveCompanyId();
  const existing = await db.customerDocuments.findOneAsync<CustomerDocuments>(companyId, { customerId });

  const patch: Partial<CustomerDocuments> = {};

  const crFile = formData.get("crOrNationalIdFile");
  if (crFile instanceof File && crFile.size > 0) patch.crOrNationalIdFileDataUrl = await fileToDataUrl(crFile);

  const taxFile = formData.get("taxCertificateFile");
  if (taxFile instanceof File && taxFile.size > 0) patch.taxCertificateFileDataUrl = await fileToDataUrl(taxFile);

  const kycFile = formData.get("kycFile");
  if (kycFile instanceof File && kycFile.size > 0) patch.kycFileDataUrl = await fileToDataUrl(kycFile);

  if (existing) {
    await db.customerDocuments.updateAsync(companyId, { _id: existing._id }, { $set: patch });
  } else {
    await db.customerDocuments.insertAsync<CustomerDocuments>(companyId, {
      customerId,
      ...patch,
      createdAt: new Date().toISOString(),
    });
  }

  revalidatePath(`/sales/customers/${customerId}/documents`);
  revalidatePath("/accounting/invoices");
}
