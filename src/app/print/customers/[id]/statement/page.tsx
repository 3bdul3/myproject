import { notFound } from "next/navigation";
import { getCustomerStatement } from "@/lib/actions/accounting";
import { getCompanySettings } from "@/lib/actions/settings";
import StatementDocument from "@/components/StatementDocument";

export default async function PrintCustomerStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { customer, rows, closingBalance } = await getCustomerStatement(id);
  if (!customer) notFound();

  const company = await getCompanySettings();

  return <StatementDocument customer={customer} rows={rows} closingBalance={closingBalance} company={company} />;
}
