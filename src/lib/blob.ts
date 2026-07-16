import "server-only";

// PDFs de revista podem passar fácil de 4.5MB — o limite de body de upload
// via servidor na Vercel. Por isso o upload é feito DIRETO do navegador pro
// Blob Store (ver app/api/blob/upload/route.ts + @vercel/blob/client no
// formulário), não por um Server Action recebendo o arquivo inteiro.
export const BLOB_UPLOAD_RULES = {
  pdf: {
    allowedContentTypes: ["application/pdf"],
    maximumSizeInBytes: 50 * 1024 * 1024, // 50MB
  },
  cover: {
    allowedContentTypes: ["image/png", "image/jpeg", "image/webp"],
    maximumSizeInBytes: 5 * 1024 * 1024, // 5MB
  },
} as const;

export type BlobUploadKind = keyof typeof BLOB_UPLOAD_RULES;
