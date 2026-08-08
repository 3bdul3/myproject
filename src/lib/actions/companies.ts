"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isMultiCompanyRole } from "@/lib/authz";
import type { Company } from "@/types";

export async function listCompanies() {
  return db.companies.findAsync<Company>({}).sort({ createdAt: 1 });
}

export async function setActiveCompany(companyId: string | FormData) {
  const id = companyId instanceof FormData ? String(companyId.get("companyId") || "") : companyId;
  if (!id) return;

  const session = await auth();
  if (!session?.user || !isMultiCompanyRole(session.user.role)) return;

  const exists = await db.companies.findOneAsync<Company>({ _id: id });
  if (!exists) return;

  (await cookies()).set("activeCompanyId", id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  revalidatePath("/", "layout");
}

export async function createCompany(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "admin") return;

  const nameAr = String(formData.get("nameAr") || "");
  const nameEn = String(formData.get("nameEn") || "");
  if (!nameAr || !nameEn) return;

  const created = await db.companies.insertAsync<Company>({
    nameAr,
    nameEn,
    vatNumber: String(formData.get("vatNumber") || ""),
    crNumber: String(formData.get("crNumber") || ""),
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
    createdAt: new Date().toISOString(),
  });

  revalidatePath("/settings/companies");

  if (created._id) {
    await setActiveCompany(created._id);
  }
  redirect("/settings/companies");
}
