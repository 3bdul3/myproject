import { notFound } from "next/navigation";
import { getBill } from "@/lib/actions/ap";
import { getSupplier } from "@/lib/actions/inventory";
import { getCompanySettings } from "@/lib/actions/settings";
import BillDocument from "@/components/BillDocument";

export default async function PrintSupplierBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bill = await getBill(id);
  if (!bill) notFound();

  const [supplier, company] = await Promise.all([getSupplier(bill.supplierId), getCompanySettings()]);

  return <BillDocument bill={bill} supplier={supplier} company={company} />;
}
