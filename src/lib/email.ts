import nodemailer from "nodemailer";

let warnedOnce = false;
let transporter: ReturnType<typeof nodemailer.createTransport> | null | undefined;

function getTransporter() {
  if (transporter !== undefined) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    if (!warnedOnce) {
      console.warn(
        "[email] GMAIL_USER/GMAIL_APP_PASSWORD not set in .env.local — email notifications are disabled (in-app notifications still work)."
      );
      warnedOnce = true;
    }
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  return transporter;
}

/** Never throws — a failed/disabled email must never break the business action that triggered it. */
export async function sendEmail(to: string, subject: string, text: string) {
  const t = getTransporter();
  if (!t) return;

  try {
    await t.sendMail({ from: process.env.GMAIL_USER, to, subject, text });
  } catch (err) {
    console.warn("[email] Failed to send:", err instanceof Error ? err.message : err);
  }
}
