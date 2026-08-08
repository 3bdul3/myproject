"use server";

import { revalidatePath } from "next/cache";
import { db, nextNumber } from "@/lib/db";
import { getActiveCompanyId } from "@/lib/authz";
import { customerDisplayName } from "@/lib/customer";
import type { Customer, Proposal } from "@/types";

export async function listProposals() {
  const companyId = await getActiveCompanyId();
  return db.proposals.findAsync<Proposal>(companyId, {}).sort({ createdAt: -1 });
}

export async function listSignedProposals() {
  const companyId = await getActiveCompanyId();
  return db.proposals.findAsync<Proposal>(companyId, { status: "signed" }).sort({ createdAt: -1 });
}

export async function getProposal(id: string) {
  const companyId = await getActiveCompanyId();
  return db.proposals.findOneAsync<Proposal>(companyId, { _id: id });
}

export async function createProposal(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const customerId = String(formData.get("customerId"));
  const customer = await db.customers.findOneAsync<Customer>(companyId, { _id: customerId });

  const count = await db.proposals.countAsync(companyId, {});
  const number = nextNumber("PROP", count + 1);

  await db.proposals.insertAsync<Proposal>(companyId, {
    number,
    customerId,
    customerName: customer ? customerDisplayName(customer) : "Unknown",
    projectStartDate: String(formData.get("projectStartDate") || ""),
    projectEndDate: String(formData.get("projectEndDate") || ""),
    amount: Number(formData.get("amount") || 0),
    status: "draft",
    notes: String(formData.get("notes") || ""),
    createdAt: new Date().toISOString(),
  });

  revalidatePath("/sales/proposals");
}

export async function markProposalSent(id: string) {
  const companyId = await getActiveCompanyId();
  await db.proposals.updateAsync(companyId, { _id: id, status: "draft" }, { $set: { status: "sent" } });
  revalidatePath("/sales/proposals");
  revalidatePath(`/sales/proposals/${id}`);
}

export async function uploadSignedProposal(id: string, formData: FormData) {
  const companyId = await getActiveCompanyId();
  const proposal = await db.proposals.findOneAsync<Proposal>(companyId, { _id: id });
  if (!proposal) return;

  const patch: Partial<Proposal> = {};

  const signedFile = formData.get("signedFile");
  if (signedFile instanceof File && signedFile.size > 0) {
    const buffer = Buffer.from(await signedFile.arrayBuffer());
    patch.signedFileDataUrl = `data:${signedFile.type};base64,${buffer.toString("base64")}`;
  }

  const contractFile = formData.get("serviceContractFile");
  if (contractFile instanceof File && contractFile.size > 0) {
    const buffer = Buffer.from(await contractFile.arrayBuffer());
    patch.serviceContractFileDataUrl = `data:${contractFile.type};base64,${buffer.toString("base64")}`;
  }

  const nextSignedUrl = patch.signedFileDataUrl ?? proposal.signedFileDataUrl;
  if (nextSignedUrl) {
    patch.status = "signed";
  }

  await db.proposals.updateAsync(companyId, { _id: id }, { $set: patch });

  revalidatePath("/sales/proposals");
  revalidatePath(`/sales/proposals/${id}`);
}
