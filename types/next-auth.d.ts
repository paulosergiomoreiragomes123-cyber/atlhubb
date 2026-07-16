import type { DefaultSession } from "next-auth";
import type { Role, UserStatus } from "@/src/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    role: Role;
    status: UserStatus;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      status: UserStatus;
    } & DefaultSession["user"];
  }
}

// A augmentação precisa mirar "@auth/core/jwt" (onde a interface JWT é
// declarada de fato) e não "next-auth/jwt" — esse último só faz `export *`
// dela, e um re-export wildcard não participa do merge de declaração do
// TypeScript. Sem isso, `token.id`/`token.role`/`token.status` ficam `unknown`.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    status: UserStatus;
  }
}
