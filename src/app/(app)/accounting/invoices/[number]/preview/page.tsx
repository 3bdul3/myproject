import { notFound } from "next/navigation";
import { getInvoiceByNumber } from "@/lib/actions/accounting";
import { getCustomer } from "@/lib/actions/crm";
import { getCompanySettings } from "@/lib/actions/settings";
import { getZatcaQrDataUrl } from "@/lib/zatca";
import { PageHeader } from "@/components/ui";
import InvoiceDocument from "@/components/InvoiceDocument";

export default async function InvoicePreviewPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const invoice = await getInvoiceByNumber(number);
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

  return (
    <div>
      <PageHeader
        title="Customer Preview"
        subtitle="This is exactly what the customer receives — review it, then download when ready"
        breadcrumb={[
          { label: "Home", href: "/dashboard" },
          { label: "Transactions", href: "/accounting/invoices" },
          { label: invoice.number, href: `/accounting/invoices/${invoice.number}` },
          { label: "Preview" },
        ]}
        action={
          <a
            href={`/api/invoices/${invoice.number}/pdf`}
            className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Download PDF
          </a>
        }
      />

      <div className="overflow-hidden rounded-lg border border-stone-200 shadow-sm">
        <InvoiceDocument invoice={invoice} customer={customer} company={company} qrDataUrl={qrDataUrl} />
      </div>
    </div>
  );
}
