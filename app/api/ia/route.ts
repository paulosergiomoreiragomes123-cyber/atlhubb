import { NextResponse } from "next/server";
import { createAgentUIStreamResponse, safeValidateUIMessages } from "ai";

import { getCurrentUser } from "@/src/modules/auth/dal";
import { atlhubAssistant, type AtlhubUIMessage } from "@/src/modules/ai/agent";
import { atlhubTools } from "@/src/modules/ai/tools";
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  // O DefaultChatTransport do AI SDK instalado manda { id, messages, trigger,
  // messageId } — o histórico INTEIRO da conversa (this.state.messages) a
  // cada request, não só a mensagem nova. Um formato antigo { id, message }
  // (mensagem única) já não é o que o client manda; ler "message" aqui
  // resultava em `undefined` sendo empilhado no array e o AI SDK rejeitando
  // com AI_TypeValidationError/ZodError antes mesmo de chamar o modelo.
  const { id, messages: rawMessages } = (typeof body === "object" && body !== null ? body : {}) as {
    id?: unknown;
    messages?: unknown;
  };
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Conversa inválida." }, { status: 400 });
  }

  // loadConversation já filtra por userId — se o ID não é do usuário logado
  // (ou não existe), cai aqui, nunca vaza a conversa de outra pessoa. Não
  // precisamos mais do `conversation.messages` salvo pra montar o array (o
  // client já manda o histórico completo) — só usamos pra confirmar posse.
  const conversation = await loadConversation(id, user.id);
  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }

  // Valida o array contra o schema real do agente (mesmas tools) em vez de
  // só um cast de tipo — qualquer formato inesperado vira um 400 legível em
  // vez de um ZodError não tratado estourando como 500.
  const validation = await safeValidateUIMessages<AtlhubUIMessage>({
    messages: rawMessages,
    tools: atlhubTools,
  });
  if (!validation.success) {
    console.error("[ai] Mensagens inválidas recebidas do cliente:", validation.error);
    return NextResponse.json({ error: "Mensagens inválidas." }, { status: 400 });
  }

  const messages = validation.data;

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
