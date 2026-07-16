import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
