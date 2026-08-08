import { getPurchaseOrderByNumber } from "@/lib/actions/inventory";
import { launchPdfBrowser } from "@/lib/pdfBrowser";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const order = await getPurchaseOrderByNumber(number);
  if (!order) {
    return new Response("Not found", { status: 404 });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const printUrl = new URL(`/print/purchase-orders/${order._id}`, request.url);

  const browser = await launchPdfBrowser();

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
        "Content-Disposition": `attachment; filename="${order.number}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
