import { CredentialsSignin } from "next-auth";

// Subclasses de CredentialsSignin propagam intactas (com `code`) até quem chamou
// signIn(), porque o Auth.js relança o erro original quando `raw` + sem redirect
// automático (ver @auth/core/src/index.ts). É assim que authorize() consegue dizer
// *por que* o login falhou sem vazar isso pra URL como texto livre.
export class ContaAguardandoAprovacaoError extends CredentialsSignin {
  code = "conta_aguardando_aprovacao";
}

export class ContaReprovadaError extends CredentialsSignin {
  code = "conta_reprovada";
}

export class ContaSuspensaError extends CredentialsSignin {
  code = "conta_suspensa";
}

export class ContaBloqueadaError extends CredentialsSignin {
  code = "conta_bloqueada";
}

const MENSAGENS_POR_CODIGO: Record<string, string> = {
  conta_aguardando_aprovacao:
    "Seu cadastro ainda está aguardando aprovação de um administrador.",
  conta_reprovada: "Seu cadastro foi reprovado. Fale com um administrador.",
  conta_suspensa: "Sua conta está suspensa. Fale com um administrador.",
  conta_bloqueada:
    "Muitas tentativas erradas. Sua conta foi bloqueada por 15 minutos por segurança.",
  credentials: "E-mail ou senha inválidos.",
};

export function mensagemDeErroDeLogin(code: string | undefined): string {
  return MENSAGENS_POR_CODIGO[code ?? "credentials"] ?? MENSAGENS_POR_CODIGO.credentials;
}
