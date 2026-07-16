import "server-only";

// Fase 7 v2 (2026-07-16): os kinds `pdf`/`cover` (upload manual de PDF/capa
// de revista) foram removidos junto com o fluxo de upload manual — a revista
// agora é gerada automaticamente e o PDF é montado na hora, sem upload. O
// kind que resta é a foto de perfil do consultor (aparece na revista
// personalizada, ver PROJECT.md).
export const BLOB_UPLOAD_RULES = {
  consultantPhoto: {
    allowedContentTypes: ["image/png", "image/jpeg", "image/webp"],
    maximumSizeInBytes: 5 * 1024 * 1024, // 5MB
  },
} as const;

export type BlobUploadKind = keyof typeof BLOB_UPLOAD_RULES;
