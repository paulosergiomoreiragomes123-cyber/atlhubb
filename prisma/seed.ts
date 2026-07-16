import "dotenv/config";
import bcrypt from "bcryptjs";

import { prisma } from "@/src/lib/prisma";

// Não reaproveita src/lib/password.ts aqui de propósito: aquele arquivo importa
// "server-only", que lança erro sempre que é carregado fora do bundler do
// Next.js (é assim que ele impede vazar hashing pro bundle do cliente) — e
// este script roda com tsx puro, fora do Next. Duplicar duas linhas de bcrypt
// é mais simples do que contornar essa proteção.
const SALT_ROUNDS = 12;

// Bootstrap do primeiro admin: como só um admin aprova outros usuários,
// alguém precisa nascer já aprovado. Rode com `npm run db:seed`.
// Idempotente: rodar de novo apenas atualiza a senha/hash do mesmo e-mail.
async function main() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      "Defina ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD no .env antes de rodar o seed."
    );
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN", status: "APROVADO" },
    create: {
      name,
      email,
      passwordHash,
      role: "ADMIN",
      status: "APROVADO",
      approvedAt: new Date(),
    },
  });

  console.log(`Admin pronto: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
