import "server-only";
import QRCode from "qrcode";

// Sem domínio de produção definido ainda (projeto não deployado) — usa
// NEXT_PUBLIC_APP_URL se existir, senão cai pra localhost. Configurar essa
// env var no deploy é o que faz o QR Code apontar pro domínio de verdade.
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function buildShareUrl(slug: string): string {
  return `${getAppUrl()}/c/${slug}`;
}

export function generateQrCodeDataUrl(slug: string): Promise<string> {
  return QRCode.toDataURL(buildShareUrl(slug), { width: 320, margin: 1 });
}

export function generateSlug(): string {
  // 8 caracteres, alfanumérico — curto o bastante pra caber bem num QR Code
  // e não deixar a URL pública gigante, mas com colisão improvável o
  // suficiente pro volume desse catálogo (ver getOrCreateQrCode, que já
  // trata colisão com retry mesmo assim).
  return Math.random().toString(36).slice(2, 10);
}
