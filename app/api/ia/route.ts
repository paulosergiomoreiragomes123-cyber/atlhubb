import { NextResponse } from "next/server";
import { createAgentUIStreamResponse } from "ai";

import { getCurrentUser } from "@/src/modules/auth/dal";
import { atlhubAssistant, type AtlhubUIMessage } from "@/src/modules/ai/agent";
import { loadConversation, saveConversationMessages } from "@/src/modules/ai/conversations";

// Respostas com tool calls podem levar mais que os ~10s default de algumas
// plataformas — o padrão da Vercel hoje já é 300s, isso só deixa explícito.
export const maxDuration = 60;

// Não usa requireApprovedUser() (que faz redirect(), pensado pra páginas).
// Isso é uma rota de API consumida por fetch — devolve 401 puro.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.status !== "APROVADO") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id, message }: { id: string; message: AtlhubUIMessage } = await request.json();

  // loadConversation já filtra por userId — se o ID não é do usuário logado
  // (ou não existe), cai aqui, nunca vaza a conversa de outra pessoa.
  const conversation = await loadConversation(id, user.id);
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }

  const previousMessages = (conversation.messages ?? []) as unknown as AtlhubUIMessage[];
  const messages = [...previousMessages, message];

  return createAgentUIStreamResponse({
    agent: atlhubAssistant,
    uiMessages: messages,
    originalMessages: messages,
    onEnd: async ({ messages: finalMessages }) => {
      await saveConversationMessages(id, user.id, finalMessages);
    },
    // Sem AI_GATEWAY_API_KEY configurada (normal em dev, antes do deploy —
    // ver PROJECT.md seção 11.6), a chamada ao modelo falha aqui dentro.
    // Sem isso, o erro apareceria cru no stream; com isso, vira uma mensagem
    // legível na UI do chat em vez de um crash.
    onError: (error) => {
      console.error("[ai] Erro no stream do assistente:", error);
      return "Não consegui falar com o modelo de IA agora. Se isso for ambiente de desenvolvimento, confira se AI_GATEWAY_API_KEY está configurada no .env.";
    },
  });
}
