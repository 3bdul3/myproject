import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { getActiveCompanyId } from "@/lib/authz";

const HEADERS = [
  "customerCode (auto)",
  "nameAr",
  "nameEn",
  "vatNumber",
  "crNumber",
  "buildingNumber",
  "streetName",
  "district",
  "city",
  "postalCode",
  "additionalNumber",
  "unitNumber",
  "contactName",
  "contactEmail",
  "contactMobile",
  "invoiceEmail",
  "infoEmail",
];

const EXAMPLE_ROW = [
  "",
  "شركة المثال للتجارة (EXAMPLE - delete this row)",
  "Example Trading Co.",
  "300000000000003",
  "1010000000",
  "1234",
  "King Fahd Road",
  "Al Olaya",
  "Riyadh",
  "12211",
  "5678",
  "",
  "Mohammed Al-Otaibi",
  "mohammed@example.com",
  "+966500000000",
  "invoices@example.com",
  "info@example.com",
];

const PREFILLED_ROWS = 300;
const DATA_END_COL = "Q"; // last column (infoEmail)

export async function GET() {
  const companyId = await getActiveCompanyId();
  const initialCount = await db.customers.countAsync(companyId, {});

  const worksheet = XLSX.utils.aoa_to_sheet([HEADERS, EXAMPLE_ROW]);

  for (let i = 0; i < PREFILLED_ROWS; i++) {
    const row = i + 2; // row 2 = first data row (row 1 is header)
    const cellRef = `A${row}`;
    worksheet[cellRef] = {
      t: "str",
      v: "",
      f: `IF(COUNTA(B${row}:${DATA_END_COL}${row})>0,"CUST-"&TEXT(${initialCount}+${row}-1,"00000"),"")`,
    };
  }

  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:Q2");
  range.e.r = Math.max(range.e.r, PREFILLED_ROWS + 1);
  worksheet["!ref"] = XLSX.utils.encode_range(range);
  worksheet["!cols"] = HEADERS.map((h) => ({ wch: Math.max(14, h.length + 2) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="customers_template.xlsx"',
    },
  });
}
