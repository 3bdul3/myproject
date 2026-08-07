import { listPostedTaxInvoices } from "@/lib/actions/accounting";
import { listCustomers } from "@/lib/actions/crm";
import { listSignedProposals } from "@/lib/actions/proposals";
import { PageHeader, Card } from "@/components/ui";
import InvoiceCreateForm from "@/components/InvoiceCreateForm";

export default async function NewInvoicePage() {
  const [customers, signedProposals, postedTaxInvoices] = await Promise.all([
    listCustomers(),
    listSignedProposals(),
    listPostedTaxInvoices(),
  ]);

  return (
    <div>
      <PageHeader
        title="New Invoice"
        subtitle="Create a proforma invoice, tax invoice, credit note, or debit note"
        breadcrumb={[
          { label: "Home", href: "/dashboard" },
          { label: "Transactions", href: "/accounting/invoices" },
          { label: "New" },
        ]}
      />

      <Card>
        <InvoiceCreateForm customers={customers} signedProposals={signedProposals} postedTaxInvoices={postedTaxInvoices} />
      </Card>
    </div>
  );
}
