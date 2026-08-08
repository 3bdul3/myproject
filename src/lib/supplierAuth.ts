import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "supplier_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

interface SupplierSessionData {
  supplierId: string;
  companyId: string;
  exp: number;
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set — required to sign supplier portal sessions.");
  return secret;
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function encode(data: SupplierSessionData) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(token: string): SupplierSessionData | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SupplierSessionData;
    if (typeof data.exp !== "number" || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

export async function createSupplierSession(supplierId: string, companyId: string) {
  const exp = Date.now() + SESSION_DURATION_MS;
  (await cookies()).set(COOKIE_NAME, encode({ supplierId, companyId, exp }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(exp),
  });
}

export async function destroySupplierSession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getSupplierSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decode(token);
}

/** Call from every supplier-portal Server Component/action — redirects to login if the session is missing/expired. */
export async function requireSupplierAuth() {
  const session = await getSupplierSession();
  if (!session) redirect("/supplier/login");
  return session;
}
