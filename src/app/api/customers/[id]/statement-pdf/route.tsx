import puppeteer from "puppeteer-core";
import { getCustomer } from "@/lib/actions/crm";

export const runtime = "nodejs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) {
    return new Response("Not found", { status: 404 });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const printUrl = new URL(`/print/customers/${id}/statement`, request.url);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    if (cookieHeader) {
      await page.setExtraHTTPHeaders({ cookie: cookieHeader });
    }
    await page.goto(printUrl.toString(), { waitUntil: "load" });
    await page.emulateMediaType("screen");

    const pdfBuffer = await page.pdf({
      format: "a4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
    });

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${customer.customerCode || "statement"}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
