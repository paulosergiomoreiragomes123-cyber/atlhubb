import type { CoverColor } from "@/src/modules/magazine/cover-colors";

// Formato único de personalização usado por todo lugar que monta a revista
// pra um consultor — leitor web (iframe do PDF), PDF sob demanda, preview do
// admin, QR Code público (ver profile/queries.ts:buildConsultantInfo e
// official-pdf-assembler.ts). Vivia em magazine-view.tsx (Magazine V3, web)
// antes da Magazine V4 virar o único jeito de exibir a revista — movido pra
// cá pra não deixar o único ponto de geração de PDF importando de um
// componente React que não é mais renderizado em lugar nenhum.
export type ConsultantInfo = {
  name: string;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  instagram: string | null;
  photoUrl: string | null;
  jobTitle: string | null;
  magazineMessage: string | null;
  coverColor: CoverColor;
  showQrCode: boolean;
  showPhoto: boolean;
  showInstagram: boolean;
  showCity: boolean;
};
