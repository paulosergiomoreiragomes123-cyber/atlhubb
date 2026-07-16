"use client";

import { useState } from "react";
import Image from "next/image";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import { Search, Loader2, ShoppingBag } from "lucide-react";

import type { AtlhubUIMessage } from "@/src/modules/ai/agent";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCents } from "@/src/lib/currency";
import { cn } from "@/lib/utils";

// Normaliza o output das três tools de produto (cada uma com um shape
// ligeiramente diferente — ver src/modules/ai/tools.ts) num formato comum
// pra renderizar o cartão "Imagem + preço + Comprar" (Etapa 4/5) sem o
// consultor depender de o modelo escrever a URL como texto puro.
type ProductCardData = {
  id: string;
  name: string;
  priceCents: number | null;
  imageUrl: string | null;
  storeUrl: string | null;
};

function extractProductCards(toolType: string, output: unknown): ProductCardData[] {
  if (!output || typeof output !== "object") return [];

  if (toolType === "tool-searchProducts" || toolType === "tool-compareProducts") {
    const products = (output as { products?: unknown[] }).products;
    if (!Array.isArray(products)) return [];
    return products
      .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
      .map((p) => ({
        id: String(p.id ?? ""),
        name: String(p.name ?? ""),
        priceCents: typeof p.priceCents === "number" ? p.priceCents : null,
        imageUrl: typeof p.imageUrl === "string" ? p.imageUrl : null,
        storeUrl: typeof p.storeUrl === "string" ? p.storeUrl : null,
      }))
      .filter((p) => p.id && p.name);
  }

  if (toolType === "tool-getProductDetails") {
    const result = output as { found?: boolean; product?: Record<string, unknown> };
    if (!result.found || !result.product) return [];
    const p = result.product;
    const images = Array.isArray(p.images) ? p.images : [];
    return [
      {
        id: String(p.id ?? ""),
        name: String(p.name ?? ""),
        priceCents: typeof p.priceCents === "number" ? p.priceCents : null,
        imageUrl: typeof images[0] === "string" ? (images[0] as string) : null,
        storeUrl: typeof p.storeUrl === "string" ? p.storeUrl : null,
      },
    ].filter((c) => c.id && c.name);
  }

  return [];
}

function ProductCardRow({ cards }: { cards: ProductCardData[] }) {
  if (cards.length === 0) return null;

  return (
    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
      {cards.map((card) => (
        <div
          key={card.id}
          className="flex w-40 shrink-0 flex-col gap-1.5 rounded-lg bg-background p-2 text-left ring-1 ring-foreground/10 not-italic"
        >
          <div className="relative h-20 w-full overflow-hidden rounded-md bg-muted">
            {card.imageUrl ? (
              <Image src={card.imageUrl} alt={card.name} fill sizes="160px" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <ShoppingBag className="size-5" />
              </div>
            )}
          </div>
          <span className="line-clamp-2 text-xs font-medium text-foreground">{card.name}</span>
          {card.priceCents !== null && (
            <span className="text-xs font-semibold text-foreground">{formatCents(card.priceCents)}</span>
          )}
          {card.storeUrl && (
            <Button asChild size="sm" variant="outline" className="h-7 text-xs">
              <a href={card.storeUrl} target="_blank" rel="noopener noreferrer">
                Comprar
              </a>
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

const SUGGESTIONS = [
  "Sugira um kit para presente com até R$150",
  "Compare dois produtos da categoria mais vendida",
  "Gere uma legenda para Instagram sobre um dos produtos",
  "Quais produtos vocês têm com estoque disponível?",
];

export function ChatWindow({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: AtlhubUIMessage[];
}) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat<AtlhubUIMessage>({
    id,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/ia" }),
  });

  const isBusy = status === "submitted" || status === "streaming";

  function handleSend(text: string) {
    if (!text.trim() || isBusy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto py-4">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSend(suggestion)}
                className="rounded-full border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              {message.parts.map((part, index) => {
                if (part.type === "text") {
                  return <span key={index}>{part.text}</span>;
                }
                if (isToolUIPart(part)) {
                  const isDone = part.state === "output-available" || part.state === "output-error";
                  const cards =
                    part.state === "output-available" ? extractProductCards(part.type, part.output) : [];
                  return (
                    <div key={part.toolCallId}>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
                        {isDone ? <Search className="size-3" /> : <Loader2 className="size-3 animate-spin" />}
                        {toolLabel(part.type)}
                      </div>
                      <ProductCardRow cards={cards} />
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}

        {status === "submitted" && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Pensando…
            </div>
          </div>
        )}

        {status === "error" && (
          <Alert variant="destructive">
            <AlertDescription>
              {error?.message || "Não consegui falar com o assistente agora. Tente de novo em instantes."}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="flex gap-2 border-t pt-4"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(input);
            }
          }}
          placeholder="Pergunte sobre produtos, peça uma comparação, um kit, uma legenda…"
          rows={2}
          disabled={isBusy}
          className="flex-1 resize-none"
        />
        <Button type="submit" disabled={isBusy || !input.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  );
}

function toolLabel(type: string): string {
  const labels: Record<string, string> = {
    "tool-searchProducts": "Buscando produtos no catálogo…",
    "tool-getProductDetails": "Consultando detalhes do produto…",
    "tool-compareProducts": "Comparando produtos…",
    "tool-listCategories": "Consultando categorias…",
    "tool-listBrands": "Consultando marcas…",
  };
  return labels[type] ?? "Consultando o catálogo…";
}
