// Sem validação rígida no cadastro (ver src/modules/profile/schemas.ts) —
// a sanitização pro formato que o wa.me exige (só dígitos, com DDI) fica
// centralizada aqui, chamada na hora de montar o link/QR Code.
export function sanitizeWhatsappNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";
  // Sem DDI e com cara de "DDD + número" (padrão BR, 10-11 dígitos) — prefixa
  // com 55. Já vier com DDI (ou qualquer outro formato), usa como está.
  if (!digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) {
    return `55${digits}`;
  }
  return digits;
}

export function buildWhatsappLink(rawNumber: string | null | undefined, message: string): string | null {
  if (!rawNumber) return null;
  const number = sanitizeWhatsappNumber(rawNumber);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
