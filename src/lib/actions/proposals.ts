"use server";

import { revalidatePath } from "next/cache";
import { db, nextNumber } from "@/lib/db";
import { customerDisplayName } from "@/lib/customer";
import type { Customer, Proposal } from "@/types";

export async function listProposals() {
  return db.proposals.findAsync<Proposal>({}).sort({ createdAt: -1 });
}

export async function listSignedProposals() {
  return db.proposals.findAsync<Proposal>({ status: "signed" }).sort({ createdAt: -1 });
}

export async function getProposal(id: string) {
  return db.proposals.findOneAsync<Proposal>({ _id: id });
}

export async function createProposal(formData: FormData) {
  const customerId = String(formData.get("customerId"));
  const customer = await db.customers.findOneAsync<Customer>({ _id: customerId });

  const count = await db.proposals.countAsync({});
  const number = nextNumber("PROP", count + 1);

  await db.proposals.insertAsync<Proposal>({
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
  await db.proposals.updateAsync({ _id: id, status: "draft" }, { $set: { status: "sent" } });
  revalidatePath("/sales/proposals");
  revalidatePath(`/sales/proposals/${id}`);
}

export async function uploadSignedProposal(id: string, formData: FormData) {
  const proposal = await db.proposals.findOneAsync<Proposal>({ _id: id });
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

  await db.proposals.updateAsync({ _id: id }, { $set: patch });

  revalidatePath("/sales/proposals");
  revalidatePath(`/sales/proposals/${id}`);
}
