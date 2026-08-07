"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
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
  const existing = await db.companySettings.findOneAsync<CompanySettings>({});
  if (existing) return existing;
  return { ...emptySettings, createdAt: new Date().toISOString() };
}

export async function updateCompanySettings(formData: FormData) {
  const existing = await db.companySettings.findOneAsync<CompanySettings>({});

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
    await db.companySettings.updateAsync({ _id: existing._id }, { $set: data });
  } else {
    await db.companySettings.insertAsync({ ...data, createdAt: new Date().toISOString() });
  }

  revalidatePath("/settings/company");
  revalidatePath("/accounting/invoices");
  revalidatePath("/dashboard");
}
