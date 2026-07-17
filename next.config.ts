import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @napi-rs/canvas tem um binário nativo (.node) — sem isso aqui, o
  // bundler tenta empacotar o módulo e quebra em runtime com "Cannot find
  // native binding" (só apareceu agora, Magazine V4: primeira vez que esse
  // pacote roda DENTRO do servidor Next, não só em scripts standalone).
  // `unpdf`/`tesseract.js` usam o mesmo pacote por baixo.
  serverExternalPackages: ["@napi-rs/canvas", "unpdf", "tesseract.js"],
  images: {
    // Fase 6A — imagens de produto sincronizadas da loja pública são
    // hospedadas neste bucket S3 (confirmado por inspeção ao vivo:
    // s3.amazonaws.com/atlanticafiles/produtos/*.jpg|png).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "s3.amazonaws.com",
        pathname: "/atlanticafiles/**",
      },
    ],
  },
};

export default nextConfig;
