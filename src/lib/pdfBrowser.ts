import puppeteer from "puppeteer-core";

/**
 * Local Windows dev boxes use the system Chrome install; deployed Linux containers have no
 * system Chrome, so they use @sparticuz/chromium's bundled, container-friendly binary instead.
 * Set CHROME_PATH to override either default (e.g. a non-default Windows Chrome install path).
 */
export async function launchPdfBrowser() {
  if (process.env.CHROME_PATH) {
    return puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  }

  if (process.platform === "win32") {
    return puppeteer.launch({
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      headless: true,
    });
  }

  const chromium = (await import("@sparticuz/chromium")).default;
  return puppeteer.launch({
    executablePath: await chromium.executablePath(),
    args: chromium.args,
    headless: true,
  });
}
