import { notFound } from "next/navigation";
import { getInvoice } from "@/lib/actions/accounting";
import { getCustomer } from "@/lib/actions/crm";
import { getCompanySettings } from "@/lib/actions/settings";
import { getZatcaQrDataUrl } from "@/lib/zatca";
import InvoiceDocument from "@/components/InvoiceDocument";

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  const [customer, company] = await Promise.all([getCustomer(invoice.customerId), getCompanySettings()]);

  const isTaxDocument = invoice.docType === "tax" || invoice.docType === "credit_note" || invoice.docType === "debit_note";
  const isFinalized = invoice.status !== "draft";

  const qrDataUrl =
    isTaxDocument && isFinalized
      ? await getZatcaQrDataUrl({
          sellerName: company.nameEn || company.nameAr,
          vatNumber: company.vatNumber,
          timestamp: new Date(invoice.date).toISOString(),
          total: invoice.total.toFixed(2),
          vatTotal: invoice.tax.toFixed(2),
        })
      : null;

  return <InvoiceDocument invoice={invoice} customer={customer} company={company} qrDataUrl={qrDataUrl} />;
}
