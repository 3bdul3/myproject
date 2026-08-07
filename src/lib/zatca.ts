import QRCode from "qrcode";

function tlv(tag: number, value: string): Buffer {
  const valueBuffer = Buffer.from(value, "utf8");
  return Buffer.concat([Buffer.from([tag, valueBuffer.length]), valueBuffer]);
}

export function buildZatcaQrPayload(fields: {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  total: string;
  vatTotal: string;
}): string {
  const buffer = Buffer.concat([
    tlv(1, fields.sellerName),
    tlv(2, fields.vatNumber),
    tlv(3, fields.timestamp),
    tlv(4, fields.total),
    tlv(5, fields.vatTotal),
  ]);

  return buffer.toString("base64");
}

export async function getZatcaQrDataUrl(fields: {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  total: string;
  vatTotal: string;
}): Promise<string> {
  const payload = buildZatcaQrPayload(fields);
  return QRCode.toDataURL(payload, { margin: 1, width: 160 });
}
