import * as OTPAuth from "otpauth";

const ISSUER = "MSAA ERP";

export function generateTotpSecret() {
  return new OTPAuth.Secret({ size: 20 });
}

export function buildTotpUri(label: string, base32Secret: string) {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(base32Secret),
  });
  return totp.toString();
}

export function verifyTotpCode(base32Secret: string, code: string): boolean {
  if (!code) return false;
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: "",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(base32Secret),
  });
  return totp.validate({ token: code, window: 1 }) !== null;
}
