import { notFound } from "next/navigation";
import { getPurchaseOrder, getSupplier } from "@/lib/actions/inventory";
import { getCompanySettings } from "@/lib/actions/settings";
import PurchaseOrderDocument from "@/components/PurchaseOrderDocument";

export default async function PrintPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getPurchaseOrder(id);
  if (!order) notFound();

  const [supplier, company] = await Promise.all([getSupplier(order.supplierId), getCompanySettings()]);

  return <PurchaseOrderDocument order={order} supplier={supplier} company={company} />;
}
