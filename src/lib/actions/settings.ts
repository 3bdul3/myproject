"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActiveCompanyId } from "@/lib/authz";
import type { CompanySettings } from "@/types";

const emptySettings: Omit<CompanySettings, "_id" | "createdAt"> = {
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
};

export async function getCompanySettings(): Promise<CompanySettings> {
  const companyId = await getActiveCompanyId();
  const existing = await db.companies.findOneAsync<CompanySettings>({ _id: companyId });
  if (existing) return existing;
  return { ...emptySettings, createdAt: new Date().toISOString() };
}

export async function updateCompanySettings(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const existing = await db.companies.findOneAsync<CompanySettings>({ _id: companyId });

  let logoDataUrl = existing?.logoDataUrl;
  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    const buffer = Buffer.from(await logoFile.arrayBuffer());
    logoDataUrl = `data:${logoFile.type};base64,${buffer.toString("base64")}`;
  }

  const data = {
    nameAr: String(formData.get("nameAr") || ""),
    nameEn: String(formData.get("nameEn") || ""),
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
    bankName: String(formData.get("bankName") || ""),
    bankAccountName: String(formData.get("bankAccountName") || ""),
    bankAccountNumber: String(formData.get("bankAccountNumber") || ""),
    bankIban: String(formData.get("bankIban") || ""),
    logoDataUrl,
  };

  if (existing) {
    await db.companies.updateAsync({ _id: existing._id }, { $set: data });
  } else {
    // Existing companyId (from getActiveCompanyId) has no row yet — shouldn't normally
    // happen since Company creation always inserts a row, but insert defensively with the
    // same _id so this settings form still lands on the right company.
    await db.companies.insertAsync({ ...data, _id: companyId, createdAt: new Date().toISOString() });
  }

  revalidatePath("/settings/company");
  revalidatePath("/accounting/invoices");
  revalidatePath("/dashboard");
}
