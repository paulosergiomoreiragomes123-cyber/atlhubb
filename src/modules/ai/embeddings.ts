import "server-only";
import { embed } from "ai";
import { prisma } from "@/src/lib/prisma";
import { buildProductEmbeddingText, hashText } from "@/src/lib/embedding-utils";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";

// Best-effort de propósito: reembedar é um enriquecimento, não parte do
// contrato de "salvar produto". Se a AI Gateway não estiver configurada
// ainda (sem AI_GATEWAY_API_KEY) ou cair, o cadastro/edição do produto não
// pode falhar por causa disso — só loga e segue.
export async function reembedProductIfNeeded(productId: string): Promise<void> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
      },
    });
    if (!product) return;

    const text = buildProductEmbeddingText(product);
    const newHash = hashText(text);
    if (newHash === product.embeddingHash) return;

    const { embedding } = await embed({ model: EMBEDDING_MODEL, value: text });

    await prisma.product.update({
      where: { id: productId },
      data: { embedding, embeddingHash: newHash },
    });
  } catch (error) {
    console.error(`[ai] Falha ao reembedar produto ${productId}:`, error);
  }
}
