import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/src/lib/prisma";
import { verifyPassword } from "@/src/lib/password";
import { loginSchema } from "@/src/modules/auth/schemas";
import {
  ContaAguardandoAprovacaoError,
  ContaBloqueadaError,
  ContaReprovadaError,
  ContaSuspensaError,
} from "@/src/modules/auth/errors";

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 15 * 60 * 1000;

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Sem adapter de banco de propósito: com o Credentials provider a sessão é
  // stateless (JWT). Persistir sessão em tabela própria só valeria a pena se
  // precisássemos de "derrubar sessão de outro dispositivo" — fora do escopo da Fase 1.
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8h — sessão curta de propósito, ver src/modules/auth/dal.ts
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (rawCredentials) => {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (!user) return null;

        // Bloqueio por força bruta: 5 tentativas erradas travam o login por
        // 15min. Checado antes de comparar a senha pra não gastar bcrypt à toa
        // numa conta já travada.
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new ContaBloqueadaError();
        }

        const passwordMatches = await verifyPassword(password, user.passwordHash);
        if (!passwordMatches) {
          const attempts = user.failedLoginAttempts + 1;
          const lockedUntil = attempts >= MAX_TENTATIVAS ? new Date(Date.now() + BLOQUEIO_MS) : null;
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: attempts, lockedUntil },
          });
          if (lockedUntil) throw new ContaBloqueadaError();
          return null;
        }

        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          });
        }

        // A checagem de status acontece aqui, no momento do login — não a cada
        // requisição. O DAL (src/modules/auth/dal.ts) reconsulta o banco a cada
        // acesso às áreas protegidas para pegar mudanças de status em tempo real
        // (ex.: suspensão), então esta checagem aqui só evita emitir um token
        // novo para quem já sabemos que não pode entrar.
        if (user.status === "AGUARDANDO") throw new ContaAguardandoAprovacaoError();
        if (user.status === "REPROVADO") throw new ContaReprovadaError();
        if (user.status === "SUSPENSO") throw new ContaSuspensaError();

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // user.id vem opcional no tipo base do Auth.js (pensado pra providers OAuth
      // que podem não ter id antes da criação da conta); no nosso authorize() ele
      // sempre existe, então a asserção abaixo é segura.
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.status = token.status;
      return session;
    },
  },
});
