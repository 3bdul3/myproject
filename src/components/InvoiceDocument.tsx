import type { CompanySettings, Customer, Invoice, InvoiceDocType, NationalAddress } from "@/types";
import { TAX_RATE } from "@/lib/constants";
import { cairo } from "@/lib/fonts";

const DOC_LABELS: Record<InvoiceDocType, { ar: string; en: string }> = {
  proforma: { ar: "فاتورة مبدئية", en: "Proforma Invoice" },
  tax: { ar: "فاتورة ضريبية", en: "Tax Invoice" },
  credit_note: { ar: "إشعار دائن", en: "Credit Note" },
  debit_note: { ar: "إشعار مدين", en: "Debit Note" },
};

function addressLine(addr?: NationalAddress) {
  if (!addr) return "—";
  return (
    [
      addr.buildingNumber && `Bldg ${addr.buildingNumber}`,
      addr.streetName,
      addr.district,
      addr.city,
      addr.postalCode && `${addr.postalCode}${addr.additionalNumber ? "-" + addr.additionalNumber : ""}`,
    ]
      .filter(Boolean)
      .join(", ") || "—"
  );
}

function BilingualRow({ ar, value, en }: { ar: string; value: string; en: string }) {
  return (
    <div dir="rtl" className="grid grid-cols-3 items-baseline gap-2 border-b border-stone-100 py-1.5 text-xs last:border-0">
      <span className="text-right text-stone-500">{ar}</span>
      <span className="text-center font-semibold text-stone-800">{value || "—"}</span>
      <span dir="ltr" className="text-left text-stone-500">
        {en}
      </span>
    </div>
  );
}

function PartyBlock({
  roleAr,
  roleEn,
  nameAr,
  nameEn,
  vat,
  cr,
  address,
  showTaxIds,
}: {
  roleAr: string;
  roleEn: string;
  nameAr?: string;
  nameEn?: string;
  vat?: string;
  cr?: string;
  address?: NationalAddress;
  showTaxIds: boolean;
}) {
  return (
    <div className="rounded-xl border border-stone-200 p-3">
      <div dir="rtl" className="grid grid-cols-2 gap-4">
        <div className="space-y-1 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{roleAr}</p>
          <p className="text-sm font-semibold text-stone-900">{nameAr || "—"}</p>
          {showTaxIds && (
            <>
              <p className="text-xs text-stone-500">الرقم الضريبي: {vat || "—"}</p>
              <p className="text-xs text-stone-500">السجل التجاري: {cr || "—"}</p>
            </>
          )}
          <p className="text-xs text-stone-500">{addressLine(address)}</p>
        </div>
        <div dir="ltr" className="space-y-1 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{roleEn}</p>
          <p className="text-sm font-semibold text-stone-900">{nameEn || "—"}</p>
          {showTaxIds && (
            <>
              <p className="text-xs text-stone-500">VAT Number: {vat || "—"}</p>
              <p className="text-xs text-stone-500">CR Number: {cr || "—"}</p>
            </>
          )}
          <p className="text-xs text-stone-500">{addressLine(address)}</p>
        </div>
      </div>
    </div>
  );
}

export default function InvoiceDocument({
  invoice,
  customer,
  company,
  qrDataUrl,
}: {
  invoice: Invoice;
  customer: Customer | null | undefined;
  company: CompanySettings;
  qrDataUrl: string | null;
}) {
  const labels = DOC_LABELS[invoice.docType];
  const isTaxDocument = invoice.docType === "tax" || invoice.docType === "credit_note" || invoice.docType === "debit_note";
  const discount = invoice.discount ?? 0;
  const taxRate = invoice.taxRate ?? TAX_RATE;
  const showBank = isTaxDocument;
  const showQr = !!qrDataUrl;

  return (
    <div className={`${cairo.className} mx-auto max-w-3xl bg-white p-6 text-stone-900`}>
      <div className="mb-4 flex items-center justify-between border-b border-stone-200 pb-3">
        <div className="h-14 w-14 flex-shrink-0" />
        <div className="text-center">
          <h1 className="text-lg font-bold">{labels.en}</h1>
          <h1 dir="rtl" className="text-lg font-bold">
            {labels.ar}
          </h1>
        </div>
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-end">
          {company.logoDataUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={company.logoDataUrl} alt="Company logo" className="max-h-14 max-w-14 object-contain" />
          )}
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <PartyBlock
          roleAr="مقدم الخدمة"
          roleEn="Service Provider"
          nameAr={company.nameAr}
          nameEn={company.nameEn}
          vat={company.vatNumber}
          cr={company.crNumber}
          address={company.nationalAddress}
          showTaxIds={isTaxDocument}
        />
        <PartyBlock
          roleAr="العميل"
          roleEn="Bill To"
          nameAr={customer?.nameAr}
          nameEn={customer?.nameEn}
          vat={customer?.vatNumber}
          cr={customer?.crNumber}
          address={customer?.nationalAddress}
          showTaxIds={isTaxDocument}
        />
      </div>

      <div className="mb-4 rounded-xl border border-stone-200 p-3">
        <BilingualRow ar="رقم الفاتورة" en="Invoice Number" value={invoice.number} />
        <BilingualRow ar="تاريخ الإصدار" en="Issue Date" value={invoice.date} />
        <BilingualRow ar="تاريخ التوريد" en="Supply Date" value={invoice.supplyDate || "—"} />
        <BilingualRow ar="رقم أمر الشراء" en="PO Number" value={invoice.poNumber || "—"} />
        <BilingualRow ar="مدة المشروع" en="Project Duration" value={invoice.projectDuration || "—"} />
        {invoice.relatedInvoiceNumber && (
          <BilingualRow ar="مرجع الفاتورة" en="Reference Invoice" value={invoice.relatedInvoiceNumber} />
        )}
      </div>

      <div className="mb-4 rounded-xl border border-stone-200 p-3">
        <table className="w-full text-xs">
          <thead className="border-b border-stone-200 text-stone-500">
            <tr>
              <th className="py-2 text-left font-medium">
                م<br />
                No.
              </th>
              <th className="py-2 text-left font-medium">
                البند
                <br />
                Item Description
              </th>
              <th className="py-2 text-right font-medium">
                السعر الفردي
                <br />
                Unit Price
              </th>
              <th className="py-2 text-right font-medium">
                الكمية
                <br />
                Quantity
              </th>
              <th className="py-2 text-right font-medium">
                المبلغ الخاضع للضريبة
                <br />
                Taxable Amount
              </th>
              <th className="py-2 text-right font-medium">
                نسبة الضريبة
                <br />
                VAT Rate
              </th>
              <th className="py-2 text-right font-medium">
                مبلغ الضريبة
                <br />
                VAT Amount
              </th>
              <th className="py-2 text-right font-medium">
                الإجمالي
                <br />
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => {
              const amount = item.qty * item.price;
              const lineTax = Math.round(amount * taxRate * 100) / 100;
              return (
                <tr key={i} className="border-b border-stone-100 last:border-0">
                  <td className="py-2">{i + 1}</td>
                  <td className="py-2">{item.description}</td>
                  <td className="py-2 text-right font-mono">{item.price.toFixed(2)}</td>
                  <td className="py-2 text-right">{item.qty}</td>
                  <td className="py-2 text-right font-mono">{amount.toFixed(2)}</td>
                  <td className="py-2 text-right font-mono">{(taxRate * 100).toFixed(0)}%</td>
                  <td className="py-2 text-right font-mono">{lineTax.toFixed(2)}</td>
                  <td className="py-2 text-right font-mono">{(amount + lineTax).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="ml-auto mt-4 w-64 space-y-1 text-sm">
          <div className="flex justify-between text-stone-500">
            <span dir="rtl">الإجمالي قبل الضريبة / Subtotal</span>
            <span className="font-mono">{invoice.subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-stone-500">
              <span dir="rtl">الخصم / Discount</span>
              <span className="font-mono">-{discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-stone-500">
            <span dir="rtl">ضريبة القيمة المضافة / VAT ({(taxRate * 100).toFixed(0)}%)</span>
            <span className="font-mono">{invoice.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-stone-200 pt-1 font-semibold text-stone-800">
            <span dir="rtl">الإجمالي شامل الضريبة / Total (incl. VAT)</span>
            <span className="font-mono">{invoice.total.toFixed(2)}</span>
          </div>
          {invoice.docType === "tax" && (
            <>
              <div className="flex justify-between text-emerald-600">
                <span dir="rtl">المدفوع / Paid</span>
                <span className="font-mono">{invoice.amountPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-stone-800">
                <span dir="rtl">المتبقي / Balance</span>
                <span className="font-mono">{(invoice.total - invoice.amountPaid).toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={`grid gap-4 ${showBank && showQr ? "grid-cols-2" : "grid-cols-1"}`}>
        {showBank && (
          <div className="rounded-xl border border-stone-200 p-3">
            <div dir="rtl" className="mb-2 grid grid-cols-2 text-xs font-semibold text-stone-700">
              <span className="text-right">معلومات الحساب البنكي</span>
              <span dir="ltr" className="text-left">
                Bank Account Information
              </span>
            </div>
            <BilingualRow ar="اسم البنك" en="Bank Name" value={company.bankName || "—"} />
            <BilingualRow ar="اسم الحساب" en="Account Name" value={company.bankAccountName || "—"} />
            <BilingualRow ar="رقم الحساب" en="Account Number" value={company.bankAccountNumber || "—"} />
            <BilingualRow ar="الآيبان" en="IBAN" value={company.bankIban || "—"} />
          </div>
        )}

        {showQr && (
          <div className="rounded-xl border border-stone-200 p-3 text-center">
            <p className="mb-2 text-xs font-semibold text-stone-700">رمز الاستجابة السريعة / ZATCA QR Code</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="ZATCA QR Code" className="mx-auto h-32 w-32" />
          </div>
        )}
      </div>
    </div>
  );
}
