# AtlHub — Documento de Arquitetura

> Status: Fases 1–3 implementadas, mais um bloco de plataforma administrativa completa (marcas, fornecedores, galeria de imagens, estoque com histórico, busca avançada, auditoria, dashboard, sidebar) construído antes da Fase 4 a pedido do cliente. **Fase 4 (assistente de IA + ingestão do Guia Oficial)** implementada e testada contra o Supabase real — o Guia 2026 é um PDF escaneado (sem texto extraível); um fallback de OCR (`tesseract.js` + `@napi-rs/canvas`, 2026-07-15, ver seção 9) ingeriu as 204 páginas em 212 chunks reais. Falta só a `AI_GATEWAY_API_KEY` (a ser adicionada no deploy) para o primeiro teste com modelo de verdade e para completar os embeddings pendentes (`npm run ai:reembed`, ver seção 9). **Fase 5 (revista digital, QR Code, compartilhamento)** implementada e testada contra o Supabase real — falta só o `BLOB_READ_WRITE_TOKEN` (idem, no deploy) para o upload real de PDF funcionar; o resto (CRUD, publicação, QR Code, página pública) já funciona hoje via URL manual. **Fase 6A (sincronização com a loja pública `loja.atlanticanatural.com.br`) implementada e testada ao vivo (2026-07-15)** — 298 produtos sincronizados de 21 categorias, rodado duas vezes contra o Supabase real confirmando idempotência (2ª execução: 0 criados, 0 atualizados, 298 sem mudança). Isso supera a decisão de negócio da seção 8/10 (registrada mais cedo no mesmo dia) — o cliente confirmou que a loja pública existe e deve ser sincronizada; ver seção 16. **Fase 7.1 (revista digital personalizada por consultor, estilo Natura/Avon, 2026-07-16)** substituiu a Fase 7 — sem PDF salvo, cada consultor vê/baixa a revista com o próprio contato (WhatsApp/Instagram/foto de `/consultor/perfil`), sem botão "Comprar"; ver seção 19. **Magazine V3 (2026-07-17)** substituiu por completo a geração/o template da Fase 7.1 — seções por categoria real (cada uma nova página), perfis olfativos de perfume (`PerfumeProfile`, importados uma única vez das tabelas oficiais), preço sempre atual da loja sem inventar desconto; testada ao vivo (260 produtos, 157 páginas de PDF geradas e inspecionadas) e já publicada em produção; ver seção 21. **Magazine V4 (2026-07-17) implementada e testada ao vivo** — o PDF baixado por consultor reaproveita byte a byte a revista oficial impressa "ED 17 Março 26" (55 páginas) em vez de recriar o layout do zero; mapeamento manual completo das 52 páginas de conteúdo (3–54, feito por seção contra o catálogo real), preço sempre atualizado sobreposto na posição impressa, página de detalhe nova logo após cada produto (Para que serve/Benefícios/Como usar, ou pros perfumes Inspirado em/família olfativa/notas/fixação/ocasião), tabelas olfativas oficiais inseridas após a seção de Fragrâncias, capa/contracapa personalizadas por consultor (foto, WhatsApp, Instagram, QR Code, mensagem). A versão **web** (`/consultor/revista`) continua sendo o catálogo Magazine V3 (dados sempre vivos) — só o PDF baixado usa a revista oficial; ver seção 22.
> Base técnica atual do repositório: Next.js 16.2.10 (App Router, modelo de Cache Components), React 19, TypeScript, Tailwind CSS v4, Prisma ORM + Supabase Postgres, Auth.js v5, React Hook Form + Zod, shadcn/ui, AI SDK v6 (`ai` + `@ai-sdk/react`) via Vercel AI Gateway, `@vercel/blob` (upload direto do navegador), `qrcode`, `cheerio` (parsing HTML da loja pública, Fase 6A), `@vercel/config` (`vercel.ts`, cron de sincronização), `tesseract.js` + `@napi-rs/canvas` (OCR do Guia Oficial, ver seção 9).

---

## 1. Objetivo da Plataforma

AtlHub é o portal privado dos consultores da **Atlântica Natural**. Não é um catálogo estático — é o sistema operacional de trabalho do consultor: onde ele se cadastra, é aprovado, consulta produtos e preços sempre atualizados, lê a revista digital e o Guia Oficial, tira dúvidas com uma IA especializada, acompanha treinamentos e comunicados, e gera QR Codes para vender.

Princípios que guiam todas as decisões abaixo:

1. **Acesso é privilégio, não padrão.** Todo usuário nasce sem acesso; um administrador humano decide quem entra.
2. **A informação de produto é viva.** Preços e dados vêm de uma fonte externa (a loja) e não podem divergir por muito tempo — o sistema deve se auto-atualizar, não depender de digitação manual.
3. **A IA responde com base na fonte oficial.** A IA especializada não "sabe" sobre os produtos por treinamento genérico — ela responde ancorada no Guia Oficial e no catálogo real, com rastreabilidade.
4. **O sistema é uma plataforma, não uma feature.** Cada módulo (catálogo, revista, treinamentos, comunicados, promoções, QR) é desenhado para crescer e para ganhar novos módulos sem reescrita.

---

## 2. Arquitetura Geral

### 2.1 Visão de alto nível

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cliente (Browser)                        │
│      Next.js App Router · React Server Components · PWA-ready   │
└───────────────────────────────┬───────────────────────────────-─┘
                                 │ HTTPS
┌────────────────────────────────▼──────────────────────────────-─┐
│                     Next.js (Vercel Functions)                  │
│  ─ Server Components / Server Actions (mutações)                │
│  ─ Route Handlers (webhooks, integrações, API interna)          │
│  ─ Routing Middleware (sessão, aprovação, papéis, redirects)     │
└───┬───────────────┬──────────────┬──────────────┬───────────────┘
    │               │              │              │
┌───▼────┐   ┌───────▼──────┐ ┌────▼─────┐  ┌─────▼──────┐
│Postgres│   │ Blob Storage │ │  Vector  │  │ AI Gateway │
│(Neon,  │   │ (PDFs, capas,│ │  Store   │  │ (modelos   │
│via     │   │ imagens, QR) │ │ (pgvector│  │ via AI SDK)│
│Vercel  │   │              │ │ no mesmo │  │            │
│Market- │   │              │ │ Postgres)│  │            │
│place)  │   └──────────────┘ └──────────┘  └────────────┘
└───┬────┘
    │
┌───▼─────────────────────────────┐
│  Jobs agendados (Vercel Cron)    │
│  ─ Sync de preços da loja        │
│  ─ Reprocessamento do Guia       │
│  ─ Reembedding / manutenção      │
└──────────────────────────────────┘
```

### 2.2 Padrão arquitetural

- **Monólito modular no Next.js**, hospedado na Vercel. Não há justificativa hoje para microsserviços — o volume de usuários (consultores de uma empresa) e a natureza do domínio (CRUD + IA + sync periódico) cabem confortavelmente em um único app bem organizado.
- **Server Components como padrão**, Client Components apenas onde há interatividade real (busca, chat de IA, upload, formulários). Isso mantém dados sensíveis (preços internos, status de aprovação) no servidor.
- **Server Actions** para mutações (aprovar usuário, criar promoção, marcar treinamento como concluído) em vez de uma API REST paralela — reduz superfície e duplicação.
- **Route Handlers** reservados para três casos: webhooks externos (ex.: notificação da loja, provedor de e-mail), endpoints consumidos por scripts/cron, e a futura API pública/mobile.
- **Separação de responsabilidades por domínio**, não por tipo técnico — ver seção 3.
- **Cache Components (`"use cache"`) do Next.js 16** como estratégia primária de cache para conteúdo semi-estático (catálogo, revista, guia), com invalidação por tag (`cacheTag` / `updateTag`) disparada pelos jobs de sincronização. Isso substitui os antigos padrões de ISR/`unstable_cache` — ver `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md` neste projeto.

### 2.3 Multi-tenant — decisão adiada, não descartada

Hoje o AtlHub atende uma única empresa (Atlântica Natural). Diferente do rascunho inicial deste documento, o schema implementado na Fase 1 **não** inclui uma tabela `organizations` nem `organization_id` — isso seria complexidade especulativa sem um segundo cliente real hoje. Se a plataforma for oferecida a outras redes de consultoria no futuro, essa dimensão entra como uma migration própria, não como campo morto carregado desde o início.

---

## 3. Organização das Pastas

Estrutura implementada na Fase 1 (evolução do scaffold do create-next-app). Duas correções em relação ao rascunho original: `(consultor)` e `(admin)` viraram pastas **sem parênteses** — grupos de rota `(x)` não entram na URL, então `(consultor)/painel` e `(admin)/painel` colidiriam na mesma URL `/painel`. `consultor/` e `admin/` como prefixo real resolve isso e também simplifica o `proxy.ts` (protege por prefixo de path).

```
atlhubb/
├── app/
│   ├── (public)/                  # grupo puramente organizacional, sem prefixo de URL
│   │   ├── login/
│   │   ├── cadastro/
│   │   └── aguardando-aprovacao/
│   │
│   ├── c/[slug]/                  # PÚBLICO — sem login, resolve QrCode e renderiza produto/revista/catálogo — Fase 5
│   │
│   ├── consultor/                 # prefixo real /consultor/*, protegido no proxy.ts
│   │   ├── layout.tsx             # chama requireApprovedUser()
│   │   ├── painel/
│   │   ├── catalogo/              # lista + ficha de produto — Fase 2
│   │   │   └── [id]/
│   │   ├── revista/               # lista de edições publicadas + leitor — Fase 5
│   │   │   └── [id]/
│   │   └── assistente-ia/         # chat com o assistente de IA — Fase 4
│   │       ├── layout.tsx         # lista de conversas do usuário + "nova conversa"
│   │       └── [id]/              # janela de chat de uma conversa específica
│   │
│   ├── admin/                     # prefixo real /admin/*, protegido no proxy.ts
│   │   ├── layout.tsx             # chama requireAdmin(), sidebar + topbar
│   │   ├── painel/                # dashboard: usuários, catálogo, estoque baixo, atividade recente
│   │   ├── usuarios/              # aprovação manual — Fase 1
│   │   ├── produtos/              # CRUD + preço + estoque + busca/filtros
│   │   │   ├── novo/
│   │   │   ├── [id]/              # dados, galeria, preço (histórico), estoque (histórico)
│   │   │   ├── importar/          # upload de CSV (upsert por SKU)
│   │   │   └── exportar/          # route handler, devolve o catálogo em CSV
│   │   ├── categorias/            # CRUD de categoria (com subcategoria)
│   │   │   └── [id]/
│   │   ├── marcas/                # CRUD de marca
│   │   │   └── [id]/
│   │   ├── fornecedores/          # CRUD de fornecedor (contato)
│   │   │   └── [id]/
│   │   ├── revista/               # CRUD de edição (upload PDF/capa ou URL manual) + publicar — Fase 5
│   │   │   └── [id]/
│   │   └── auditoria/             # log de "quem fez o quê", com busca e filtro por entidade
│   │
│   ├── api/
│   │   ├── auth/[...nextauth]/    # route handler do Auth.js
│   │   ├── ia/                    # route handler do chat (createAgentUIStreamResponse) — Fase 4
│   │   └── blob/upload/           # gera token de upload direto-do-navegador (admin only) — Fase 5
│   └── page.tsx                   # redirecionador de raiz por sessão/role/status
│
├── src/
│   ├── modules/                   # lógica de domínio, isolada por assunto
│   │   ├── auth/                  # schemas, DAL, Server Actions, erros de login
│   │   ├── users/                 # queries e Server Actions de aprovação
│   │   ├── products/              # schemas, queries (busca/filtros), Server Actions, csv.ts
│   │   ├── categories/            # schemas, queries, Server Actions
│   │   ├── brands/                # schemas, queries, Server Actions
│   │   ├── suppliers/             # schemas, queries, Server Actions
│   │   ├── stock/                 # queries (soma de movimentações), Server Actions
│   │   ├── audit/                 # recordAuditLog() + queries de listagem
│   │   ├── ai/                    # agent.ts (ToolLoopAgent), tools.ts, search.ts (busca híbrida),
│   │   │   # embeddings.ts (reembedding best-effort), conversations.ts (persistência), actions.ts
│   │   ├── magazine/               # schemas, queries, Server Actions (criar/publicar/despublicar)
│   │   └── qrcode/                 # getOrCreateQrCodeAction, queries (resolve por slug, incrementa scanCount)
│   │       # guide/, search/, trainings/, announcements/, promotions/ entram nas próximas fases
│   │
│   ├── components/
│   │   ├── auth/                  # LoginForm, SignupForm (RHF + Zod)
│   │   ├── consultor/             # ChatWindow (useChat), ShareButton (QR Code)
│   │   ├── admin/                 # UserRowActions, CategoryForm, BrandForm, SupplierForm,
│   │   │                          # ProductCreateForm, ProductDetailsForm, PriceAdjustmentForm,
│   │   │                          # StockMovementForm, StockCorrectionForm, CsvImportForm, MagazineForm
│   │   └── layout/                # AppHeader, AdminSidebar
│   │
│   ├── lib/                       # prisma client (com driver adapter), hash de senha, moeda (centavos)
│   └── generated/prisma/          # client do Prisma, gerado no postinstall — não versionado
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                    # bootstrap do primeiro admin
│
├── components/ui/                 # primitivos shadcn/ui (fora de src/, é a convenção do CLI)
├── auth.ts                        # config do Auth.js (providers, callbacks, sessão)
├── proxy.ts                       # checagem otimista de rota (era middleware.ts até o Next 15)
├── prisma.config.ts               # conexão do Prisma (Prisma 7 tirou isso do schema.prisma)
├── PROJECT.md                     # este documento
└── AGENTS.md / CLAUDE.md
```

Regra: **nada em `app/` contém lógica de negócio.** As rotas orquestram; a lógica mora em `src/modules/<dominio>`. Isso é o que permite, no futuro, expor a mesma lógica via API mobile sem duplicar regras.

---

## 4. Tecnologias Recomendadas

| Camada | Escolha recomendada | Justificativa |
|---|---|---|
| Framework | Next.js 16 (App Router, Cache Components) | Já é a base do projeto; SSR/RSC dá controle fino sobre o que é exposto a cada papel de usuário. |
| Hospedagem | Vercel | Cron nativo, Blob, preview deployments para revisar cada fase com o cliente. |
| Linguagem | TypeScript estrito | Domínio com múltiplos papéis, status e integrações externas — tipos evitam classes inteiras de bugs de permissão. |
| Banco de dados | Postgres via **Supabase** | Gerenciado, com `pgvector` disponível desde já para quando a Fase 4 (IA/RAG) precisar de busca semântica — não é só "um Postgres", já nasce com o caminho da IA pavimentado. |
| ORM | **Prisma** (Prisma 7, com driver adapter `@prisma/adapter-pg`) | Schema declarativo tipado, migrations versionadas e revisáveis em PR, `prisma studio` pra inspecionar dados. Prisma 7 exige um driver adapter explícito (não conecta mais direto) — ver `src/lib/prisma.ts`. |
| Autenticação | **Auth.js v5** (Credentials provider, sessão JWT, sem adapter de banco) | O fluxo de **aprovação manual** é regra de negócio própria da Atlântica: o `authorize()` do Credentials provider bloqueia login de quem não está `APROVADO`, com um erro específico por status (aguardando/reprovado/suspenso). Sem adapter de propósito — como não há login social, não precisamos das tabelas `Account`/`Session` do NextAuth; a sessão é só um JWT assinado. |
| Armazenamento de arquivos | **Implementado (Fase 5)**: Vercel Blob (`@vercel/blob`, upload direto do navegador) | PDF/capa de revista. Client upload (não server upload) de propósito — contorna o limite de 4.5MB de corpo de requisição da Vercel, ver seção 12.2. Imagem de produto continua sendo URL colada (decisão da Fase "plataforma administrativa"). |
| QR Code | **Implementado (Fase 5)**: `qrcode` (gera no servidor, `toDataURL`) | Aponta pra `/c/[slug]`, a página pública de compartilhamento — ver seção 12.3/12.4. |
| Busca | Postgres full-text search (busca lexical) + `pgvector` (busca semântica) combinadas (busca híbrida) | Cobre tanto "digite o nome exato do produto" quanto "quero um produto para pele oleosa" sem depender de serviço externo. |
| IA | **Implementado**: Vercel AI Gateway + AI SDK v6 (`ToolLoopAgent`, `@ai-sdk/react`), modelos via string `"provider/model"` | Fallback entre provedores, observabilidade e custo centralizados; agente com tools somente-leitura ao invés de contexto estático injetado — ver seção 11. |
| Geração de QR Code | `qrcode` (server-side, dentro de Server Action/Route Handler) | Geração determinística, sem dependência de serviço externo pago. |
| E-mail transacional | Resend (Vercel Marketplace) | Notificar consultor quando aprovado/reprovado, notificar admin de novo cadastro. Ainda não implementado (Fase 1 mostra a mensagem só na tela). |
| UI | Tailwind CSS v4 + **shadcn/ui** (base Radix, estilo `radix-nova`) + **React Hook Form** + **Zod** | Componentes acessíveis que ficam no repositório (não é dependência fechada); RHF + Zod dá validação client-side instantânea reaproveitando o mesmo schema que valida no servidor. |
| Leitura de PDF (Guia Oficial) | **Implementado**: `unpdf` (extração por página) + chunking próprio por parágrafo + fallback de OCR (`tesseract.js` + `@napi-rs/canvas`, 2026-07-15) | Extração por página permite citar `pageNumber`; OCR entra quando o PDF é escaneado (sem camada de texto, caso real do Guia 2026) — ver seção 9. |
| Jobs agendados | Vercel Cron (declarado em `vercel.ts`) | Sync de preços e reprocessamento de conteúdo em horários fixos, sem infra própria. |
| Observabilidade | Vercel Observability + logs estruturados nos módulos críticos (aprovação, sync de preço, IA) | Rastrear falhas de sync de preço e respostas da IA é operacionalmente crítico. |

**Por que essa combinação para um projeto de longo prazo:** Prisma dá migrations legíveis em PR (importante à medida que o schema cresce nas próximas 4 fases); Supabase já embute `pgvector`, evitando trocar de banco quando a IA chegar; Auth.js é mantido e auditado publicamente em vez de sessão artesanal, sem abrir mão do controle total sobre a aprovação manual; RHF+Zod compartilham uma única fonte de validação entre cliente e servidor; shadcn/ui entrega componentes que vivem no repositório (customizáveis sem limite) em vez de uma dependência de UI fechada.

---

## 5. Tipos de Usuário

| Papel | Descrição | Acesso |
|---|---|---|
| **CONSULTOR** | Usuário padrão (todo cadastro nasce assim). | Painel do consultor completo quando `status = APROVADO`: catálogo, revista, guia, busca, IA, treinamentos, comunicados, promoções, QR Code. |
| **ADMINISTRADOR** | Gestão da plataforma. | Tudo do consultor + painel admin: aprovar/reprovar/suspender usuários, gerenciar catálogo, publicar revista/comunicados/promoções, disparar reprocessamento do Guia, ver relatórios de uso. |

Campos de status no usuário: `role` (`CONSULTOR` \| `ADMIN`) e `status` (`AGUARDANDO` \| `APROVADO` \| `REPROVADO` \| `SUSPENSO`), como dois enums **separados** — papel e aprovação são dimensões diferentes (um admin também pode, em tese, ser suspenso). Implementação simplificada em relação ao rascunho original: o papel `PENDENTE` foi removido do enum `role` porque era redundante com `status = AGUARDANDO` — ter as duas coisas dizendo "ainda não tem acesso" de formas diferentes só convidava a bug de checar a dimensão errada.

Papéis futuros já previstos no desenho (não implementados agora): **Supervisor Regional** (aprova apenas consultores da sua região) e **Editor de Conteúdo** (publica revista/comunicados sem acesso a aprovação de usuários) — por isso `role` é um enum extensível, não um booleano `isAdmin`.

---

## 6. Estrutura do Banco de Dados

Desenho relacional (Postgres via Supabase, schema declarado em `prisma/schema.prisma`).

### 6.1 Identidade e acesso (implementado na Fase 1)

```prisma
enum Role { CONSULTOR ADMIN }
enum UserStatus { AGUARDANDO APROVADO REPROVADO SUSPENSO }

model User {
  id           String     @id @default(cuid())
  name         String
  email        String     @unique
  passwordHash String
  role         Role       @default(CONSULTOR)
  status       UserStatus @default(AGUARDANDO)
  phone        String?
  city         String?
  state        String?
  approvedById String?    // sem relação FK de propósito — ver 6.7
  approvedAt   DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@map("users")
}
```

Sem tabelas `Account`/`Session`/`VerificationToken` do Auth.js: como só existe o Credentials provider (sem login social) e a sessão é um JWT stateless, essas tabelas não trariam benefício — só custo de schema. Elas voltam a fazer sentido se um dia entrar login social (Google, Microsoft) ou "derrubar sessão de outro dispositivo".

### 6.2 Catálogo de produtos e preços (implementado na Fase 2)

```prisma
enum ProductSource { MANUAL IMPORTADO }
enum PriceSource { AJUSTE_MANUAL SYNC_LOJA }

model ProductCategory {
  id       String @id @default(cuid())
  name     String
  slug     String @unique
  parentId String?          // self-relation, onDelete: SetNull — apagar o pai só "solta" as filhas
  products Product[]
}

model Brand {
  id      String  @id @default(cuid())
  name    String
  slug    String  @unique
  logoUrl String?
  products Product[]
}

model Supplier {
  id          String  @id @default(cuid())
  name        String
  contactName String?
  email       String?
  phone       String?
  notes       String?
  products    Product[]
}

model Product {
  id          String        @id @default(cuid())
  sku         String        @unique
  name        String
  description String?
  active      Boolean       @default(true)
  source      ProductSource @default(MANUAL) // sempre MANUAL — sem integração de loja (seção 8)
  categoryId  String?
  brandId     String?
  supplierId  String?
  images         ProductImage[]
  prices         ProductPrice[]
  stockMovements StockMovement[]

  // Fase 4 — IA. Ver seção 11 para a decisão de usar Float[] em vez de pgvector.
  attributes    Json?    // notas olfativas, família, intensidade etc. — editável no admin
  embedding     Float[]  @default([])
  embeddingHash String?  // evita reembedar se o texto-fonte não mudou
}

// Galeria de imagens: URLs coladas pelo admin (sem upload de arquivo — decisão
// explícita, ver seção abaixo). `position` define a ordem; a menor é a capa.
model ProductImage {
  id        String  @id @default(cuid())
  productId String
  url       String
  alt       String?
  position  Int     @default(0)
}

// Histórico insert-only: nunca UPDATE, sempre uma linha nova.
// "Preço atual" = linha mais recente por productId (ProductPrice.effectiveFrom desc, take 1).
model ProductPrice {
  id            String      @id @default(cuid())
  productId     String
  priceCents    Int
  currency      String      @default("BRL")
  source        PriceSource @default(AJUSTE_MANUAL)
  effectiveFrom DateTime    @default(now())
}

enum StockMovementReason { ENTRADA SAIDA AJUSTE }

// Mesmo padrão insert-only do preço, com SUM em vez de "pega a última linha":
// estoque atual = soma de quantityDelta por productId. ENTRADA/SAIDA são
// registradas por um humano; AJUSTE é calculado internamente (diferença até
// uma quantidade absoluta, ex.: depois de uma contagem física ou de um import CSV).
model StockMovement {
  id            String              @id @default(cuid())
  productId     String
  quantityDelta Int
  reason        StockMovementReason
  note          String?
  createdById   String?
  createdAt     DateTime            @default(now())
}
```

`product_embeddings` como tabela separada com pgvector (rascunho original) **não foi implementada** — o embedding vive direto em `Product.embedding` como `Float[]`. Motivo técnico detalhado na seção 11: bug conhecido do Prisma 7 com colunas `Unsupported("vector")`.

### 6.9 Conversas com a IA (Fase 4)

```prisma
// `messages` guarda o array de UIMessage do AI SDK inteiro — é o formato que
// o próprio SDK já serializa a cada turno, então salvar direto evita modelar
// manualmente parts/tool-calls/tool-results numa tabela relacional.
model Conversation {
  id        String   @id @default(cuid())
  userId    String
  title     String?  // gerado a partir da 1ª mensagem do usuário
  messages  Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Toda leitura filtra por `userId` (nunca só por `id`) — ver `src/modules/ai/conversations.ts`. É o que impede um consultor de ler a conversa de outro mesmo sabendo o ID (proteção contra IDOR).

**Decisões explícitas (2026-07-14), confirmadas com o cliente antes de implementar** — ver seção 6.8 abaixo para o log de auditoria que acompanha essas mudanças:
- **Estoque com histórico**, não uma coluna de quantidade sobrescrevível — mesma filosofia do preço.
- **Imagens continuam sendo URL colada** (agora em galeria, não upload real via Vercel Blob) — evita depender de uma conta/infra nova antes de ser necessário.
- **Sem papéis novos além de Consultor/Admin** — o log de auditoria (`AuditLog`) é o mecanismo de rastreabilidade, não uma matriz de permissões.

### 6.8 Auditoria (implementada — deixou de ser "adiada")

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  // actorId sem FK de propósito (igual a User.approvedById): o log deve
  // sobreviver mesmo que o usuário autor seja removido no futuro. Nome/e-mail
  // do autor ficam congelados aqui no momento da ação (denormalizado).
  actorId    String?
  actorName  String
  actorEmail String
  action     String   // string livre tipo "product.create", sem enum de propósito
  entityType String
  entityId   String?
  metadata   Json?
  createdAt  DateTime @default(now())
}
```

Toda Server Action de mutação no admin (usuários, produtos, categorias, marcas, fornecedores, preço, estoque, import CSV) chama `recordAuditLog()` depois de escrever no banco. A seção 6.7 original (que dizia "adiada para depois da Fase 1") está superada por esta.

### 6.3 Guia Oficial (schema Fase 2, ingestão + embedding implementados — ver seção 9)

```prisma
enum GuideDocumentStatus { PROCESSANDO PRONTO ERRO }

model GuideDocument {
  id      String              @id @default(cuid())
  title   String
  fileUrl String
  version Int                 @default(1)
  status  GuideDocumentStatus @default(PROCESSANDO)
  chunks  GuideChunk[]
}

model GuideChunk {
  id              String @id @default(cuid())
  guideDocumentId String
  content         String
  pageNumber      Int?
  embedding       Float[] @default([])
  embeddingHash   String?
}
```

`embedding`/`embeddingHash` em `GuideChunk` seguem exatamente o mesmo padrão de `Product.embedding` (seção 11.4: `Float[]`, não pgvector, mesmo bug conhecido do Prisma 7 com `Unsupported("vector")`). Aplicado via `prisma db push` (não `prisma migrate dev` — ver nota no início da seção 9).

### 6.4 Revista digital (implementada — Fase 5, ver seção 12.1)

```prisma
enum MagazineIssueStatus { RASCUNHO PUBLICADA }

// Sem model MagazinePage: o leitor usa o visualizador nativo de PDF do
// navegador em vez de converter cada página em imagem. Ver seção 12.1.
model MagazineIssue {
  id            String              @id @default(cuid())
  title         String
  pdfUrl        String
  coverImageUrl String?
  status        MagazineIssueStatus @default(RASCUNHO)
  publishedAt   DateTime?
}
```

### 6.5 Treinamentos, comunicados, promoções

```
trainings
  id, title, description, content_url, duration_minutes, published_at

training_progress
  id, user_id → users, training_id → trainings
  status (NAO_INICIADO | EM_ANDAMENTO | CONCLUIDO), completed_at

announcements
  id, title, body, published_at, expires_at, pinned boolean

promotions
  id, title, description, starts_at, ends_at, product_id → products (nullable)
  banner_url
```

### 6.6 QR Codes (implementada — Fase 5, ver seção 12.3)

```prisma
enum QrTargetType { PRODUTO CATALOGO REVISTA }

// Um por alvo (não um por consultor) — ver seção 12.3. PROMOCAO e
// PERFIL_CONSULTOR saíram da lista original: nenhum dos dois existe como
// entidade/página ainda, sem sentido modelar um alvo que não existe.
model QrCode {
  id              String       @id @default(cuid())
  slug            String       @unique
  targetType      QrTargetType
  productId       String?
  magazineIssueId String?
  scanCount       Int          @default(0)
  createdById     String?
  createdAt       DateTime     @default(now())
}
```

### 6.7 Auditoria

Implementada — ver seção 6.8. (O plano original desta seção era adiar até "volume ou compliance justificar"; o cliente pediu antes disso, junto com o resto da plataforma administrativa.)

---

## 7. Fluxo de Autenticação (implementado)

```
1. Visitante acessa /cadastro (signupAction em src/modules/auth/actions.ts)
2. Preenche dados → cria User com role=CONSULTOR, status=AGUARDANDO
3. Redirecionado para /aguardando-aprovacao — SEM sessão criada
   (não daria pra logar mesmo: authorize() bloqueia quem não é APROVADO)
4. Admin acessa /admin/usuarios → aprova, reprova ou (depois) suspende/reativa
     → Aprovado: status=APROVADO, approvedById/approvedAt preenchidos
     → Reprovado: status=REPROVADO
5. Usuário tenta logar (loginAction → Auth.js signIn):
     - status != APROVADO → authorize() lança um erro específico
       (ContaAguardandoAprovacaoError / ContaReprovadaError / ContaSuspensaError)
       e a mensagem certa aparece na própria tela de login
     - credenciais corretas + APROVADO → sessão JWT criada (8h), com role/status
       gravados no token no momento do login
6. proxy.ts faz a checagem OTIMISTA: só existência de sessão, para os prefixos
   /consultor e /admin — sem decidir papel/status (ver seção abaixo)
7. src/modules/auth/dal.ts faz a checagem SEGURA a cada acesso: reconsulta o
   User no banco (não confia no JWT) para role/status atuais
     - requireApprovedUser(): se status != APROVADO → redireciona /aguardando-aprovacao
     - requireAdmin(): se role != ADMIN → redireciona /consultor/painel
```

Decisão de design (duas camadas, não uma): `proxy.ts` (antigo `middleware.ts`, renomeado no Next 16) faz só a checagem otimista — "existe sessão?" — lendo o cookie, sem bater no banco. Autorização por papel/status fica **inteiramente no DAL**, chamado em cada layout **e** em cada página (não só no layout, por causa do "Partial Rendering": um layout não re-executa em toda navegação interna, então o `page.tsx` também chama o guard — custo zero, já que `getCurrentUser()` é cacheado por requisição). É esse desenho que garante que uma suspensão feita pelo admin tenha efeito imediato, mesmo com o JWT do usuário suspenso ainda "válido" por até 8h — o JWT nunca é a fonte de verdade para status, só um atalho para saber quem está logado.

---

## 8. Estratégia para Importar Produtos (revisada — implementada na Fase 3)

> **Superado em parte pela Fase 6A (2026-07-15, ver seção 16):** a frase abaixo ("nenhuma plataforma de e-commerce de terceiros") descrevia corretamente o sistema interno de gestão da Atlântica, mas a empresa também opera uma **loja pública de vendas** (`loja.atlanticanatural.com.br`) usada por consultores como vitrine — essa loja passou a ser sincronizada automaticamente (`Product.source = IMPORTADO`). O cadastro manual e o CSV descritos abaixo continuam existindo e funcionando exatamente como antes, lado a lado com os produtos sincronizados.

**Decisão de negócio (2026-07-14): a Atlântica Natural não usa nenhuma plataforma de e-commerce de terceiros** — os produtos vivem num sistema interno próprio da empresa, que o AtlHub não integra por ora. Isso descarta a ideia original de "importar da loja" via API/webhook. A estratégia real implementada:

1. **Cadastro manual individual** (`/admin/produtos/novo`) para o dia a dia — poucos produtos novos por vez.
2. **Import/export em lote via CSV** (`/admin/produtos/importar` e `/admin/produtos/exportar`, `src/modules/products/csv.ts`) para quando o admin precisa atualizar muitos produtos de uma vez: exporta o catálogo atual, edita em planilha, reimporta.
   - *Upsert* por `sku`: produto novo → cria (exige preço); produto existente → atualiza nome/descrição/categoria/imagem/ativo.
   - **Preço nunca é sobrescrito diretamente**: só vira uma nova linha em `ProductPrice` se o valor da planilha for diferente do preço atual — reimportar o mesmo CSV sem mudar nada não gera ruído no histórico.
   - Processa linha a linha: uma linha com erro (categoria inexistente, preço inválido) é reportada e pulada, sem abortar o restante do arquivo.
3. **Curadoria manual**: toda edição — via formulário ou via CSV — é tratada como `source = MANUAL`. O valor `IMPORTADO` do enum `ProductSource` fica reservado para se uma integração automática for adotada no futuro.

> Se um dia a Atlântica adotar uma plataforma de e-commerce (Shopify/VTEX/Nuvemshop/etc.) e quiser sincronização automática, a seção 10 abaixo descreve o desenho técnico original para isso — ele não foi implementado, mas o schema (`PriceSource.SYNC_LOJA`) já está preparado para não exigir migration quando chegar a hora.

---

## 9. Estratégia para Ler o Guia Oficial ✅ implementada (2026-07-14)

Objetivo: transformar o Guia Oficial (PDF) em conteúdo que a IA pode citar com precisão — não um resumo genérico.

1. **Ingestão via script** (`scripts/ingest-guide.ts` → `npm run guide:ingest`), não upload pelo admin ainda: o PDF já existe localmente (`.claude/knowledge/guia-produtos-atlantica-2026.pdf`, fora do git — ver `.gitignore`), então a rota implementada é um script standalone que lê o arquivo direto do disco. Um fluxo de upload real (Vercel Blob + Server Action, mesmo padrão da revista digital, seção 12.2) fica para quando houver um segundo documento a ingerir ou a necessidade de trocar o Guia sem redeploy — não construído agora (não pedido).
2. **Extração**: `unpdf` (`getDocumentProxy` + `extractText({ mergePages: false })`, `src/modules/guide/ingest.ts`) extrai texto por página, preservando `pageNumber` — é o que permite a IA responder "conforme a página 42 do Guia Oficial" (regra de grounding em `src/modules/ai/agent.ts`).
   - **OCR (implementado 2026-07-15)**: o Guia Oficial de 2026 (204 páginas) é um PDF **escaneado/sem camada de texto** — confirmado ao vivo (`extractText` retornava 0 caracteres em todas as páginas). Cada página com menos de `OCR_FALLBACK_MIN_CHARS` (20) cai pro fallback de OCR: `renderPageAsImage` (do próprio `unpdf`, via `@napi-rs/canvas` — binário nativo com build pré-compilado, sem toolchain de compilação, mesmo padrão do `sharp`) rasteriza a página como imagem, e `tesseract.js` (motor de OCR em WASM, idioma `por`) extrai o texto — tudo local, **sem serviço externo nem `AI_GATEWAY_API_KEY`**, funciona mesmo sem a chave configurada. Um único worker de OCR é reaproveitado pra todas as páginas (criar um por página seria muito mais lento). Testado ao vivo: 204/204 páginas OCR'adas, 212 chunks gerados, ingestão completa em poucos minutos.
   - **Gotcha técnico não óbvio**: o pdf.js manda o buffer do PDF pro worker interno via `postMessage`/structured clone com *transfer* — isso esvazia (detach) o `Uint8Array` original. Reusar a mesma instância entre `getDocumentProxy`/`extractText` e depois em `renderPageAsImage` (ou entre páginas de OCR sucessivas) quebra com `DataCloneError: Cannot transfer object of unsupported type`. Fix: sempre passar uma cópia nova (`new Uint8Array(buffer)`) a cada chamada que manda o buffer pro worker.
3. **Chunking**: cada página é dividida por parágrafo (`chunkPageText`) e os parágrafos são fundidos até um alvo de ~800–1200 caracteres, nunca cortando no meio de um parágrafo.
4. **Embedding**: cada chunk tenta gerar embedding (`openai/text-embedding-3-small` via AI Gateway) no momento da ingestão — **best-effort**, mesmo padrão de `reembedProductIfNeeded` (seção 11.5): sem `AI_GATEWAY_API_KEY` configurada, o chunk é salvo mesmo assim com `embedding: []`, nunca bloqueia a ingestão. `npm run ai:reembed` (`scripts/reembed-all.ts`) preenche depois os embeddings pendentes de produtos **e** chunks do Guia, de uma vez, quando uma chave real existir — sem precisar de código novo.
5. **Versionamento**: cada execução de `guide:ingest` cria uma nova versão (`GuideDocument.version`, maior versão existente + 1) sem apagar a anterior; a busca (`searchGuideChunks`) só considera a versão mais recente por título com `status=PRONTO`.
6. **Consumo pela IA**: tool `getGuideContent` (`src/modules/ai/tools.ts`, busca híbrida em `src/modules/guide/search.ts` — embedding + fallback de texto `contains`, mesmo padrão de `searchProducts`), registrada em `atlhubTools`. Mesmo desenho de agente+tools da seção 11, sem RAG clássico com contexto estático injetado.

**Pendência conhecida**: sem `AI_GATEWAY_API_KEY` real no `.env` (mesma pendência de infraestrutura da seção 11.6), os 212 chunks do Guia (versão 4, `status=PRONTO`, testados ao vivo em 2026-07-15) foram ingeridos com `embedding: []` e a busca opera só no fallback de texto até `npm run ai:reembed` (ou o botão "Regerar embeddings" em `/admin/loja`) ser rodado com uma chave válida. Três versões anteriores (1–3) ficam preservadas no banco como histórico — v1 é do texto vazio pré-OCR, v2/v3 são tentativas de OCR que quebraram por bugs já corrigidos (ver acima); nenhuma delas é usada em busca (`status != PRONTO` ou versão mais antiga), mas não foram apagadas — a critério do time, se quiser limpar o histórico de tentativas.

---

## 10. Estratégia para Sincronizar Preços da Loja — implementada na Fase 6A (ver seção 16)

> **Implementado em 2026-07-15** — ver seção 16 para o desenho real. O texto abaixo é o desenho original (pré-implementação); manteve-se como referência histórica porque o desenho real seguiu a mesma ideia geral (job agendado, scraping resiliente como a loja não expõe API, preço sempre em nova linha de histórico).

Objetivo (se a decisão mudar): preço no AtlHub nunca deveria divergir da loja por mais que um intervalo curto e previsível.

1. **Job agendado** (`app/api/cron/sync-precos`, declarado em `vercel.ts` com schedule, ex. a cada 1–3 horas — frequência a validar com o negócio).
2. **Modo de integração** — dois caminhos possíveis, a decidir na Fase 2 conforme a plataforma real da loja:
   - **API/Webhook** (preferido): a loja expõe endpoint de produtos/preços, ou dispara webhook em `app/api/webhooks/loja` a cada alteração — sync quase em tempo real.
   - **Fallback**: se a loja não expõe API confiável, scraping controlado (via Vercel Sandbox, para isolar execução) como solução de transição, migrando para API assim que disponível.
3. **Escrita**: toda mudança de preço detectada gera uma nova linha em `product_prices` (nunca sobrescreve) — isso automaticamente dá histórico de preço sem trabalho extra.
4. **Invalidação de cache**: após a sync, `updateTag` (Cache Components) invalida as páginas de catálogo afetadas, garantindo que o consultor veja o preço novo sem esperar o próximo build/ISR.
5. **Alertas de falha**: se o job falhar (fonte fora do ar, formato mudou), registra em log estruturado e — a partir da Fase 2 — notifica o admin, para nunca haver preço "silenciosamente desatualizado".
6. **Consistência com a IA**: a IA nunca deve citar preço de memória/embedding — preço é sempre lido em tempo real do banco na hora da resposta (ver seção 11), justamente porque preço muda com frequência incompatível com um embedding estático.

---

## 11. Estratégia para IA (implementada — Fase 4)

Objetivo: um assistente que responde como um especialista em produtos Atlântica, não um chatbot genérico — e que nunca inventa produto, preço, estoque ou característica. Capacidades: recomendar produtos, comparar (ex.: perfumes), sugerir kits, responder dúvidas, gerar copies/legendas, ajudar o consultor a vender.

### 11.1 Arquitetura: agente com tools, não "RAG clássico"

Em vez do desenho original (embedding da pergunta → busca → montar contexto → injetar no prompt), a implementação usa o padrão atual do AI SDK v6: um **`ToolLoopAgent`** que decide sozinho, a cada turno, quais ferramentas chamar. Isso é mais forte pra grounding do que injetar contexto estático: o modelo é *obrigado* a chamar uma tool real pra saber qualquer coisa sobre o catálogo — não existe um "resumo" pré-computado que ele possa citar sem checar.

```
Consultor manda mensagem (useChat)
       │
       ▼
POST /api/ia — carrega Conversation (escopada por userId), acrescenta a mensagem nova
       │
       ▼
ToolLoopAgent (src/modules/ai/agent.ts) decide se/quais tools chamar:
   ├─ searchProducts   → busca híbrida (texto + embedding) com filtros estruturados
   ├─ getProductDetails → produto completo (preço/estoque/imagens/atributos), por ID ou SKU
   ├─ compareProducts  → N produtos lado a lado
   ├─ listCategories / listBrands → contexto estrutural
       │
       ▼
Cada tool lê Prisma AO VIVO (preço = última linha, estoque = soma de movimentações —
mesmas queries já usadas no catálogo, nunca um valor cacheado/embarcado em embedding)
       │
       ▼
createAgentUIStreamResponse → streaming pro cliente + onEnd salva a Conversation
```

Nenhuma tool escreve no banco — o agente é somente-leitura por desenho. Nenhuma tool foi criada especificamente pra isso: todas reaproveitam queries que já existiam em `src/modules/products/queries.ts` e `src/modules/stock/queries.ts`.

### 11.2 Regras de grounding (aplicadas via instruções de sistema, `src/modules/ai/agent.ts`)

- O agente só pode falar sobre produto/preço/estoque que veio de uma tool call **nesta conversa** — nunca de memória do modelo.
- Antes de recomendar, comparar ou responder qualquer coisa sobre produto, é obrigado a chamar uma tool primeiro, mesmo se "achar" que já sabe.
- Se a busca não retorna nada, a instrução é admitir que não encontrou — nunca inventar um produto "pra ajudar".
- Preço e estoque são sempre o valor retornado pela tool naquele turno, nunca de uma resposta anterior da mesma conversa.
- Geração de copy/legenda é ancorada nos fatos retornados por tool (nome, preço, categoria, atributos) — instrução explícita de não inventar benefício/propriedade que não está no dado real.

### 11.3 Guia Oficial ✅ implementado (2026-07-14)

`GuideDocument`/`GuideChunk` existem desde a Fase 2; ingestão, embedding e a tool `getGuideContent` foram implementados junto com o restante desta fase — ver seção 9 para o desenho completo. Confirma a previsão original desta seção: entrou como mais uma tool do mesmo `ToolLoopAgent`, sem redesenho de arquitetura.

### 11.4 Embeddings: `Float[]` em vez de pgvector (decisão técnica documentada)

O rascunho original desta seção (e da seção 6.2) previa uma tabela `product_embeddings` com pgvector. Na implementação, isso foi trocado por `Product.embedding Float[]` com similaridade de cosseno calculada em memória (`cosineSimilarity` do próprio AI SDK), pelos seguintes motivos:

- **Bug conhecido do Prisma 7** com colunas `Unsupported("vector")` em drift detection (prisma/prisma#28867) — usar pgvector de verdade exigiria `previewFeatures = ["postgresqlExtensions"]`, `Unsupported("vector(1536)")`, e todo acesso via `$queryRaw`/`$executeRaw`, contornando o Prisma Client.
- Pra um catálogo desse porte (dezenas/centenas de produtos, não milhões), comparar embeddings em memória é da ordem de milissegundos — não precisa de índice vetorial no banco.
- `Float[]` é tipo nativo do Postgres, totalmente suportado pelo Prisma sem workaround, mantendo o Prisma Client como único caminho de acesso ao banco (consistente com o resto do projeto).
- Fica atrás de uma função (`searchProducts` em `src/modules/ai/search.ts`) que pode trocar de implementação pra pgvector de verdade se o catálogo crescer muito, sem mudar o resto do sistema.
- **Degradação graciosa**: se a chamada de embedding falhar (AI Gateway fora do ar, sem chave configurada), a busca cai automaticamente pra `contains` (texto simples) em vez de quebrar a ferramenta — testado e confirmado funcionando mesmo sem `AI_GATEWAY_API_KEY` configurada.

### 11.5 Reembedding

Acontece dentro das Server Actions de produto que já existiam (`createProductAction`, `updateProductAction`, `importProductsCsvAction`), agendado via `after()` do `next/server` — não bloqueia a resposta "produto salvo" com a latência da chamada de embedding, mas o Next mantém a função viva até terminar (diferente de um fire-and-forget de verdade, que poderia ser interrompido). Um hash do texto-fonte (`embeddingHash`) evita reembedar quando nada relevante mudou. **Best-effort de propósito**: se a chamada falhar (sem `AI_GATEWAY_API_KEY`, rede fora do ar), só loga e segue — nunca derruba o cadastro/edição do produto por causa disso.

### 11.6 Modelo e custo

- Acesso a modelos via **Vercel AI Gateway**, string `"provider/model"` — modelo de chat confirmado ao vivo via `GET https://ai-gateway.vercel.sh/v1/models` (nunca hardcoded de memória): `anthropic/claude-sonnet-5` como padrão recomendado (bom seguimento de instrução em contexto de RAG/grounding), com `openai/gpt-5.5` como alternativa de 1 linha — não há lock-in.
- Embedding: `openai/text-embedding-3-small` via Gateway, independente do provedor do modelo de chat.
- **Pré-requisito de infraestrutura**: o projeto não está linkado a um projeto Vercel (sem OIDC automático), então precisa de uma `AI_GATEWAY_API_KEY` no `.env` pra qualquer chamada real de modelo — todo o resto (schema, tools, busca com fallback de texto) já foi testado contra o Supabase real sem essa chave.

### 11.7 Persistência de conversa

`Conversation.messages` guarda o array de `UIMessage` do AI SDK inteiro (ver seção 6.9) — decisão confirmada com o cliente (não efêmero). Toda query filtra por `userId`, nunca só por `id da conversa` — proteção contra um consultor ler a conversa de outro.

### 11.8 Bug corrigido (2026-07-16): `/api/ia` esperava o protocolo errado do AI SDK

`app/api/ia/route.ts` lia `{ id, message }` (uma mensagem nova, singular) do corpo da requisição — formato de uma versão mais antiga do AI SDK. O `DefaultChatTransport` da versão realmente instalada (`ai@7.0.26`) manda `{ id, messages, trigger, messageId }`: o **histórico inteiro** da conversa (`this.state.messages`) a cada request, em `messages` (plural), não uma mensagem única. Como a rota lia a chave errada, `message` vinha `undefined`, e `[...previousMessages, undefined]` quebrava a validação interna do AI SDK com `AI_TypeValidationError`/`ZodError` — um HTTP 500 cru, não a degradação graciosa esperada (esse erro acontece na validação da lista de mensagens, antes mesmo de chegar no `onError` do stream).

**Fix**: ler `messages` (plural) do corpo, e validar com `safeValidateUIMessages<AtlhubUIMessage>({ messages, tools: atlhubTools })` (função oficial do AI SDK pra isso) em vez de um cast de tipo sem validação de verdade — qualquer formato inesperado agora vira um `400 { error: "Mensagens inválidas." }` legível, nunca mais um 500 não tratado. Como o client já manda o histórico completo, `conversation.messages` salvo no banco não precisa mais ser lido pra montar o array enviado ao agente — só continua sendo usado (via `loadConversation`) pra confirmar que a conversa pertence ao usuário logado (proteção de IDOR, inalterada). Testado ao vivo local: payload no formato atual (`messages` + `trigger`) chega até a chamada de modelo (degrada graciosamente por falta de `AI_GATEWAY_API_KEY`, como esperado); payload no formato antigo (`message` singular) e corpo malformado agora retornam 400 limpo em vez de crashar.

---

## 12. Estratégia para Revista Digital e QR Code (implementada — Fase 5)

### 12.1 Revista digital: sem `MagazinePage`, leitor via PDF nativo

> **Superado pela Fase 7 (2026-07-16, ver seção 18)**: a revista não depende mais de upload manual de PDF — é gerada automaticamente a partir do catálogo sincronizado, renderizada como página HTML responsiva. O texto abaixo descreve o desenho original (Fase 5); fica como referência histórica porque o `MagazineIssue` (e o próprio `<iframe>` de PDF) continuam existindo pra quem quiser exportar/baixar um PDF depois de gerada.

O rascunho original (seção 6.4 do documento inicial) previa uma tabela `magazine_pages` com uma imagem por página, pensada pra um leitor "flip-book" customizado. Isso foi trocado por uma única coluna `pdfUrl` em `MagazineIssue`, lida pelo **visualizador nativo de PDF do navegador** (`<iframe src={pdfUrl} />`). Motivo: o navegador já entrega navegação por página, zoom e busca de graça — converter cada página de um PDF em imagem exigiria um pipeline de conversão (biblioteca de renderização, processamento por página) só pra reimplementar o que já existe. Publicação continua controlada (`RASCUNHO` → `PUBLICADA`), então nada de rascunho aparece pro consultor antes da hora.

### 12.2 Upload: direto do navegador pro Blob (não passa pelo servidor)

> **Superado pela Fase 7**: não existe mais upload manual de PDF/capa no fluxo de criação — ver seção 18. `/api/blob/upload` continua existindo e ativo (agora usado pelo export de PDF gerado, seção 18.4).

PDFs de revista passam fácil dos **4.5MB** — o limite de corpo de requisição pra upload via servidor na Vercel. Por isso o upload usa o fluxo de **client upload** do `@vercel/blob`: o admin escolhe o arquivo, o navegador pede um token pro backend (`/api/blob/upload`, que confere que quem está pedindo é um admin aprovado antes de emitir), e o arquivo vai direto do navegador pro Blob Store — nunca passa pelo corpo de uma Server Action. Suporta até 5TB por arquivo dessa forma (na prática, o limite real aplicado é 50MB pro PDF e 5MB pra capa, configurado em `src/lib/blob.ts`).

Cada campo de upload (PDF, capa) também aceita uma **URL colada manualmente** como alternativa — útil pra testar/usar a feature antes de configurar `BLOB_READ_WRITE_TOKEN`, e pra reaproveitar um arquivo já hospedado em outro lugar.

### 12.3 QR Code: um por alvo, não um por consultor

`QrCode` tem no máximo uma linha por `(targetType, productId)` ou `(targetType, magazineIssueId)` — todo mundo que clica "Compartilhar" no mesmo produto reaproveita o mesmo link/QR, com contagem agregada (`scanCount`). Simplifica bastante em troca de não ter atribuição "esse acesso veio do consultor X" — aceitável pro "tracking simples" pedido no roadmap; atribuição por consultor fica pra se um dia for pedida de verdade.

Gerado com a lib `qrcode` (`toDataURL`), apontando pra `NEXT_PUBLIC_APP_URL/c/[slug]` — slug curto (8 caracteres) pra caber bem numa imagem de QR pequena.

### 12.4 A primeira área pública do AtlHub

`/c/[slug]` é a primeira parte do sistema **sem exigir login** — necessário porque quem escaneia o QR Code é o *cliente do consultor*, não um usuário cadastrado no AtlHub. `proxy.ts` não precisou de nenhuma mudança: ele só protege os prefixos `/consultor` e `/admin`, então `/c/*` já nasceu público por não cair em nenhum dos dois. A página resolve o `slug`, confere que o alvo ainda está válido pra exibição pública (produto `active`, revista `PUBLICADA` — um produto desativado ou uma edição despublicada depois de gerado o QR simplesmente some da versão pública, sem precisar apagar o `QrCode`), incrementa o contador de acesso (via `after()`, sem atrasar a resposta) e renderiza um layout mínimo, sem nenhum componente do admin/consultor.

---

## 13. Roadmap por Fases

Ordem definida para o desenvolvimento incremental: MVP funcional primeiro, recursos avançados depois. Cada fase pressupõe a anterior pronta — não dá para ter IA sem catálogo, não dá para sincronizar preço sem saber a fonte da loja, não dá para aprovar usuário sem autenticação.

### Fase 1 — Autenticação e aprovação de usuários ✅ implementada
- [x] Cadastro (`signupAction`) e login (`loginAction`) com React Hook Form + Zod
- [x] Aprovação manual pelo admin (`/admin/usuarios`: aprovar/reprovar/suspender/reativar)
- [x] Painel administrativo (`/admin/painel`, `/admin/usuarios`)
- [x] Painel do consultor (`/consultor/painel`, com placeholders das próximas fases)
- [x] `proxy.ts` (checagem otimista) + DAL (checagem segura por papel/status)
- [x] Prisma + Supabase Postgres, Auth.js v5, seed do primeiro admin
- [ ] E-mail transacional de aprovação/reprovação (mensagem hoje só aparece na tela — ver seção 4)

### Fase 2 — Banco de dados, produtos e categorias ✅ implementada
- [x] `Product`, `ProductCategory` (com subcategoria via self-relation), `ProductPrice` (histórico insert-only) no schema
- [x] Painel do consultor: `/consultor/catalogo` (lista com filtro por categoria) e `/consultor/catalogo/[id]` (ficha)
- [x] Painel admin: `/admin/produtos` (CRUD + ajuste de preço com histórico visível) e `/admin/categorias` (CRUD)
- [x] Estrutura de dados preparada para o Guia Oficial (`GuideDocument`/`GuideChunk`) — só o schema, sem upload/ingestão ainda
- Observação (superada no bloco "plataforma administrativa" abaixo): imagem de produto era uma URL única (`imageUrl`); virou galeria (`ProductImage[]`)

### Fase 3 — Atualização em lote de produtos e preços ✅ implementada (redefinida)
- [x] **Decisão de negócio (2026-07-14): sem integração com plataforma de e-commerce** — a Atlântica Natural usa sistema próprio; ver seção 8
- [x] Export de catálogo em CSV (`/admin/produtos/exportar`)
- [x] Import em lote via CSV com upsert por SKU (`/admin/produtos/importar`): cria produto novo, atualiza existente, preço só gera linha nova no histórico se mudou
- [x] Erros de linha reportados sem abortar o restante do arquivo
- Not implemented (descrito na seção 10 como referência futura, caso a decisão de negócio mude): sync automática via API/webhook de loja, cron de sincronização, alertas de falha de job

### Plataforma administrativa completa ✅ implementada (2026-07-14, antes da Fase 4 a pedido do cliente)
- [x] `Brand` e `Supplier`: CRUD próprio (`/admin/marcas`, `/admin/fornecedores`), produto passa a referenciar os dois
- [x] Galeria de imagens (`ProductImage[]`, substitui `Product.imageUrl`) — continua URL colada, sem upload real (decisão explícita, ver seção 6.2)
- [x] Estoque com histórico de movimentação (`StockMovement`, mesmo padrão insert-only do preço) — entrada/saída manual + correção para quantidade absoluta
- [x] CSV de import/export estendido: `brand_slug`, `supplier_name`, `stock` (quantidade absoluta), `image_urls` (várias, separadas por `|`)
- [x] Busca e filtros: nome/SKU, categoria, marca, status, estoque baixo — em `/admin/produtos` e `/consultor/catalogo`
- [x] `AuditLog` (seção 6.8) + `/admin/auditoria`, com toda Server Action de mutação do admin instrumentada
- [x] Dashboard ampliado: contagem de marcas/fornecedores, alerta de estoque baixo, feed de atividade recente
- [x] Sidebar de navegação no admin (a topbar sozinha não comportava mais os 7 itens de menu)
- Decisão explícita (não assumida): **sem papéis novos** além de Consultor/Admin — o `AuditLog` é o mecanismo de rastreabilidade

### Fase 4 — IA especializada nos produtos ✅ implementada em código (2026-07-14) — falta teste com modelo real
- [x] `ToolLoopAgent` (AI SDK v6) com tools somente-leitura (`searchProducts`, `getProductDetails`, `compareProducts`, `listCategories`, `listBrands`) — seção 11.1
- [x] Busca híbrida (texto + embedding) com degradação graciosa pro fallback de texto — testado sem `AI_GATEWAY_API_KEY`
- [x] `Product.attributes`/`embedding`/`embeddingHash` + reembedding best-effort via `after()` nas Server Actions existentes
- [x] `/api/ia` (autorização própria, sem `redirect()`) + `/consultor/assistente-ia` (chat com `useChat`, streaming, sugestões)
- [x] Persistência de conversa (`Conversation`, escopada por `userId`)
- [x] Ingestão do Guia Oficial (PDF → chunks → embedding best-effort → tool `getGuideContent`), ver seção 9 — implementado 2026-07-14, depois do resto da Fase 4
- [ ] **Bloqueado em teste real**: precisa de `AI_GATEWAY_API_KEY` no `.env` pra validar respostas de modelo de verdade e pra completar os embeddings pendentes (`npm run ai:reembed`) — schema/tools/fallback já validados contra o Supabase real sem essa chave

### Fase 5 — Revista digital, PDF, QR Codes e compartilhamento ✅ implementada (2026-07-14)
- [x] Revista digital: CRUD de edição (`/admin/revista`), rascunho/publicada, leitor via PDF nativo do navegador (`/consultor/revista`) — sem `MagazinePage`, ver seção 12.1
- [x] Upload direto do navegador pro Vercel Blob (contorna o limite de 4.5MB de upload via servidor), com URL manual como alternativa — ver seção 12.2
- [x] QR Code por produto/catálogo/revista (`ShareButton`), um por alvo com contagem agregada — ver seção 12.3
- [x] Compartilhamento: página pública `/c/[slug]` (primeira área do AtlHub sem login), incrementa `scanCount` a cada acesso — ver seção 12.4
- [ ] **Bloqueado em teste real de upload**: precisa de `BLOB_READ_WRITE_TOKEN` no `.env` (a ser adicionado no deploy) — CRUD, publicação, QR Code e a página pública já foram testados contra o Supabase real usando URL manual no lugar do upload
- Fora do escopo: QR Code pra `PROMOCAO` (entidade não existe ainda)

### Fase 6A — Sincronização com a loja pública + IA com duas fontes ✅ implementada (2026-07-15)
- [x] Crawler resiliente (sem API pública disponível — confirmado por investigação técnica) autenticado como consultor, contra `loja.atlanticanatural.com.br` — ver seção 16
- [x] `Product.storeProductId`/`storeUrl`/`lastSyncedAt` (schema aditivo) + `StoreSyncRun` (histórico de execuções)
- [x] Sincronização testada ao vivo: 298 produtos, 21 categorias, idempotente (2ª execução: 0 criados/atualizados)
- [x] `searchProducts`/`getProductDetails`/`compareProducts` (IA) passam a incluir `storeUrl`/`imageUrl`; agente instruído a combinar Guia Oficial + produto sincronizado na resposta
- [x] Cartão de produto (imagem + preço + botão "Comprar") no chat do consultor (`ChatWindow`)
- [x] Comandos administrativos em `/admin/loja`: sincronizar agora, regerar embeddings, status de indexação (Guia + loja)
- [x] Cron via `vercel.ts` (diário — plano Hobby da Vercel não permite mais que 1x/dia, ver seção 16.8) + `npm run store:sync` (manual/local)
- [ ] **Estoque não sincronizado de propósito** — a loja pública não expõe quantidade/disponibilidade de forma confiável; decisão explícita documentada na seção 16, não uma lacuna

### Fase 7 — Revista digital gerada automaticamente ✅ implementada (2026-07-16)
- [x] Substitui o upload manual de PDF/capa por um gerador automático a partir
      do catálogo sincronizado (Fase 6A) — botão "Gerar Revista" com 5 filtros
      (Todos/Lançamentos/Promoções/Perfumes/Suplementos)
- [x] `MagazineIssue.productSnapshot` (JSON ponto-no-tempo) + `filterType`;
      `pdfUrl` agora opcional (só existe após exportar)
- [x] `MagazineView` — componente único reaproveitado no preview do admin,
      no leitor do consultor e na página pública `/c/[slug]`
- [x] Capa automática (gradiente + wordmark + mês/ano atual), paleta dedicada
      escopada (`.magazine-theme`, não afeta o resto do sistema)
- [x] Exportação em PDF sob demanda via `@react-pdf/renderer` (JS puro, sem
      binário nativo), upload pro Blob existente
- [x] Testado ao vivo local: filtro Perfumes (96 produtos reais), filtro
      Promoções (0 produtos, estado vazio tratado), PDF de 19MB gerado e
      baixado com sucesso, página pública `/c/[slug]` sem login
- Nenhuma tela removida — `/admin/revista`, `/admin/revista/[id]`,
  `/consultor/revista`, `/consultor/revista/[id]` continuam existindo

### Depois da Fase 5 — Maturidade e crescimento (sem data)
- Treinamentos e comunicados/promoções (podem ser intercalados antes se o negócio priorizar)
- Papéis adicionais (Supervisor Regional, Editor de Conteúdo)
- Tabela `audit_logs` própria (ver 6.7), se o volume/compliance justificar
- Multi-tenant real (ver 2.3), App mobile / API pública reaproveitando `src/modules/*`

---

## 14. Decisões em aberto

| Decisão | Bloqueia | Responsável | Status |
|---|---|---|---|
| ~~Qual plataforma é "a loja"?~~ | ~~Fase 3~~ | Cliente/negócio | **Resolvida em 2026-07-14**: nenhuma — sistema próprio, sem integração por ora (seção 8) |
| Formato e fonte do Guia Oficial (PDF único? múltiplos documentos?) | Fase 4 (ingestão) | Cliente/negócio | Em aberto |
| Volume estimado de consultores (dezenas? milhares?) | Dimensionamento de infra, mas não bloqueia código | Cliente/negócio | Em aberto |

A pergunta sobre frequência de defasagem de preço saiu da lista: sem sincronização automática, o preço é tão atual quanto o último cadastro manual ou import CSV — não há "defasagem" a gerenciar.

---

## 15. Auditoria completa (2026-07-14)

Auditoria de todo o projeto (rotas/links, autenticação/autorização, segurança, banco de dados, código duplicado/componentes não usados, performance/acessibilidade), com todos os achados corrigidos e verificados contra o Supabase real. `npm run lint` e `npm run build` limpos após as correções.

**Corrigido:**
1. `/aguardando-aprovacao` quebrava (TypeError) para usuário `APROVADO` — agora redireciona pra `/`; fallback defensivo pra status desconhecido.
2. `app/consultor/assistente-ia/page.tsx` não tinha `requireApprovedUser()` explícito (dependia só do layout pai) — adicionado, mesmo padrão de defesa em profundidade do resto do app.
3. Bloqueio por força bruta no login: 5 tentativas erradas travam a conta por 15min (`User.failedLoginAttempts`/`lockedUntil`, `ContaBloqueadaError` em `src/modules/auth/errors.ts`, lógica em `auth.ts`). Zera no login certo.
4. CSV Injection (Formula Injection) na exportação de produtos: células `name`/`description`/`supplier_name` que começam com `=`, `+`, `-`, `@` ou tab agora são prefixadas com `'` antes de ir pro CSV (`src/modules/products/csv.ts`).
5. Open redirect: `callbackUrl` que o `proxy.ts` já setava na querystring do login nunca era consumido. Agora `/login` lê, passa pro `loginAction`, que só aceita caminho relativo local (`/...`, nunca `//` nem URL absoluta) antes de redirecionar.
6. 6 páginas de detalhe/edição do admin sem link de volta pra lista (produtos, categorias, marcas, fornecedores, revista, novo produto) — adicionado `src/components/admin/back-link.tsx`.
7. Duplicação `FilterLink`/`buildHref` (3 páginas: produtos, catálogo, auditoria) extraída pra `src/components/filter-link.tsx` + `src/lib/query-href.ts`.
8. Duplicação `slugify`/`DIACRITICS_PATTERN` (`category-form.tsx`, `brand-form.tsx`) extraída pra `src/lib/slugify.ts`.
9. Dead code removido: `getSessionUser` (nunca importado) em `src/modules/auth/actions.ts`; componentes shadcn nunca usados `dropdown-menu.tsx`, `separator.tsx`, `skeleton.tsx`.
10. Índices faltando em colunas de FK usadas em filtro/join, confirmado por inspeção direta do Postgres (só existiam PK/unique): `Product.categoryId`/`brandId`/`supplierId`, `ProductCategory.parentId`, `QrCode.productId`/`magazineIssueId`.
11. `getQrCodeBySlug` (rota pública `/c/[slug]`, roda a cada scan de QR Code) usava `include` e trazia o produto inteiro, incluindo `embedding Float[]` (1536 posições) — trocado por `select` explícito só com os campos que a página usa.
12. Botão de copiar link (ícone só, sem texto) em `ShareButton` sem nome acessível — adicionado `aria-label`.

**Avaliado e decidido não corrigir:** condição de corrida em `getOrCreateQrCodeAction` (dois cliques simultâneos em "compartilhar" no mesmo produto/catálogo podem, em teoria, criar `QrCode` duplicado — o caso `CATALOGO` nem seria resolvido por um índice único composto simples, por causa de `NULL != NULL` no Postgres). Aceito como risco de baixa severidade: ferramenta interna de baixa concorrência, sem exposição a múltiplos usuários simultâneos no mesmo alvo na prática.

**Confirmado sem problema** (checado, não mudou nada): `proxy.ts`, `src/modules/auth/dal.ts`, todas as Server Actions (guardas de auth corretas), `/api/blob/upload`, ausência de XSS/segredos hardcoded, todos os links internos (nenhuma rota inexistente).

---

## 16. Fase 6A — Sincronização com a Loja Pública + IA com Duas Fontes (implementada 2026-07-15)

### 16.1 Contexto e decisão

A seção 8 registrava, no mesmo dia, a decisão de que a Atlântica não integra com plataforma de e-commerce. Essa decisão descrevia o sistema de gestão interno da empresa — mas a Atlântica também opera uma **loja pública de vendas**, `loja.atlanticanatural.com.br`, usada por cada consultor como vitrine (URL por consultor, ex.: `/psmoreira`). O cliente confirmou que essa loja deve alimentar o catálogo do AtlHub automaticamente, e que a IA deve responder combinando o Guia Oficial (Fase 4) com esse catálogo sincronizado.

### 16.2 Investigação técnica da loja (antes de qualquer código)

A loja é uma aplicação **ASP.NET MVC própria** (`X-AspNetMvc-Version: 5.2`, IIS), sem API JSON/GraphQL pública — confirmado por inspeção de HTML, headers, e `robots.txt`/`sitemap.xml` (ambos redirecionam pra `/`). Não há Shopify/VTEX/Nuvemshop/WooCommerce por trás. Por isso a Etapa 2 do pedido ("crawler resiliente" como alternativa a API) é o caminho correto, não um atalho.

Descobertas que moldaram o desenho (todas confirmadas ao vivo, não deduzidas):
- **Login**: `POST /clientes/login` (`Username`, `Password`, `Remember`), sem CSRF token. Cookie de sucesso: `.ASPXAUTH` (forms auth do ASP.NET).
- **Preço só aparece autenticado** — sem login, todo produto mostra "R$ 0,00". Por isso o crawler mantém sessão de consultor durante toda a sincronização.
- **Categorias**: 21 categorias na navegação da home (`/produtos/categoria/{slug}/{id}`), descobertas dinamicamente a cada sync (com uma lista conhecida como fallback caso a home mude de layout).
- **Listagem paginada**, mas aceita `quantidade` grande (`?pagina=1&quantidade=300&ordenacao=Latest`) — confirmado retornando a categoria inteira numa página só, evitando um loop de paginação no caso comum (fallback pra paginação real só se uma categoria ultrapassar 300 produtos).
- **Ficha do produto** (`/produtos/{slug}`): nome, preço, categoria (breadcrumb), galeria de imagens (`#pr_item_gallery [data-image]`), descrição (`.pr_desc`, nem sempre preenchida pela loja).
- **Sem sinal confiável de estoque/disponibilidade** nas páginas inspecionadas — ver 16.5.

### 16.3 Arquitetura do crawler (`src/modules/store-sync/`)

Mesmo padrão dos módulos existentes (`src/modules/guide/`), sem `"server-only"` de propósito (roda tanto dentro do Next — Server Action, cron — quanto fora, no script `npm run store:sync`):

- **`client.ts`**: sessão HTTP com cookie jar em memória, login, retry (3x com backoff), timeout, e throttle de 350ms entre requests (não sobrecarregar o site do cliente). Detalhe técnico não óbvio: o fetch do Node com `redirect: "follow"` **perde o `Set-Cookie` da resposta de redirect** (só expõe os headers da resposta final) — o `.ASPXAUTH` é setado exatamente no 302 do login, então o cliente usa `redirect: "manual"` e segue o `Location` manualmente, aplicando o cookie em cada salto.
- **`parser.ts`**: extração com `cheerio` a partir de seletores confirmados ao vivo (não um palpite) — `div.product[data-produto]` na listagem, `.product_view_description .product_description` na ficha (escopo explícito porque a mesma página reusa as mesmas classes na seção de "produtos relacionados"). Cada parser pula um item com log em vez de lançar, então uma mudança pequena no HTML da loja não derruba a sincronização inteira.
- **`sync.ts`** (`runStoreSync`): login → descobre categorias → lista produtos por categoria → busca a ficha de cada produto novo/existente → upsert em `Product`/`ProductCategory`/`ProductImage`/`ProductPrice` → grava `StoreSyncRun`. No fim, chama `reembedAllPending()` uma vez (em lote, não por produto) pra atualizar embeddings dos produtos que mudaram.
- **`queries.ts`** / **`actions.ts`**: leituras pro admin e a Server Action `syncStoreAction` (grava `AuditLog`, `revalidatePath`).

### 16.4 Regras de upsert (nunca sobrescreve o que não devia)

- **Chave de upsert**: `Product.storeProductId` (o "Código" numérico da loja), não o SKU — permite reidentificar o mesmo produto mesmo que nome/slug mudem na loja.
- **SKU gerado**: `LOJA-{storeProductId}`, determinístico, sem colisão com SKU manual.
- **Preço**: nunca sobrescreve — só insere uma nova linha em `ProductPrice` (`source: SYNC_LOJA`) se o valor mudou, mesmo padrão insert-only do resto do sistema.
- **`active`**: sync nunca desativa um produto existente (só ativa ao criar) — uma mudança na loja não pode esconder um produto que o admin depende pra vender.
- **Guia Oficial**: `GuideDocument`/`GuideChunk` são tabelas completamente separadas — o sync de loja nunca as toca, nada precisa de lógica extra pra "não apagar o guia".

### 16.5 Decisão explícita: estoque não é sincronizado

A loja pública não expõe uma quantidade numérica nem um sinal confiável de "indisponível/esgotado" nas páginas inspecionadas. Estoque no AtlHub é um histórico curado por humano (`StockMovement`, com `createdById`). Inventar um proxy (ex.: tratar "sem preço" como "sem estoque") poluiria um histórico hoje confiável. Decisão: **o crawler não grava `StockMovement`** — "estoque quando disponível" foi levado ao pé da letra, e hoje não está disponível de forma confiável. Estoque continua 100% manual via `/admin/produtos`, como já era.

### 16.6 Busca híbrida (IA com duas fontes)

Sem tool nova: `searchProducts`, `getProductDetails` e `compareProducts` (`src/modules/ai/tools.ts`) passaram a incluir `storeUrl` e `imageUrl` no retorno. A instrução de sistema do agente (`src/modules/ai/agent.ts`) foi estendida: ao recomendar um produto com `storeUrl`, sempre incluir "Link da loja" na resposta; se o Guia Oficial tiver conteúdo sobre o mesmo produto, combinar as duas fontes; se só uma tiver dado, usar só o que existe — a regra "nunca invente" (Fase 4) já cobria isso, só foi estendida pro caso de fonte parcial. `ChatWindow` (`src/components/consultor/chat-window.tsx`) ganhou um cartão de produto (imagem, preço, botão "Comprar") renderizado a partir do resultado real da tool call, não de texto que o modelo tentasse formatar sozinho.

### 16.7 Comandos administrativos (`/admin/loja`)

- **Sincronizar loja agora**: roda `runStoreSync` (mesma função do cron e do script), mostra resumo (categorias/produtos/criados/atualizados/erros).
- **Regerar embeddings**: roda `reembedAllPending()` (mesma lógica de `npm run ai:reembed`), útil depois de configurar `AI_GATEWAY_API_KEY` pela primeira vez.
- **Status**: produtos sincronizados, categorias, última execução (`StoreSyncRun`), documentos/chunks do Guia e quantos ainda não têm embedding.
- **Reindexar guia**: informativo, não executável do painel — `ingestGuideDocument` lê o PDF do disco local, que não existe numa function serverless em produção; o caminho real continua sendo `npm run guide:ingest` (local/CI), como já documentado na seção 9.

### 16.8 Sincronização agendada

`vercel.ts` (novo, convenção atual da Vercel — ver `@vercel/config`) declara um cron **diário** (`0 3 * * *`, 03h UTC) chamando `/api/cron/sync-loja`, protegida por `CRON_SECRET` (a Vercel envia `Authorization: Bearer` automaticamente quando essa env var está configurada no projeto). Frequência diária por limite do plano Hobby da Vercel (confirmado ao vivo no primeiro deploy: "Hobby accounts are limited to daily cron jobs") — se o projeto migrar pro plano Pro, dá pra aumentar a frequência (ex.: a cada 6h) só editando o `schedule`.

### 16.9 Como operar

- **Sincronizar manualmente**: `npm run store:sync` (lê `LOJA_ATLANTICA_USERNAME`/`PASSWORD` do `.env`) ou o botão em `/admin/loja`.
- **Credenciais**: `.env` local apenas (gitignorado), nunca logadas — `client.ts` só loga sucesso/falha do login, nunca o payload.
- **Testado ao vivo (2026-07-15)**: 1ª execução — 21 categorias, 298 produtos, 298 criados, 0 erros; 2ª execução (idempotência) — 298 produtos, 0 criados, 0 atualizados, 298 sem mudança. `npm run lint` e `npm run build` limpos.
- **Pendência conhecida**: mesma da Fase 4 — sem `AI_GATEWAY_API_KEY` real, os embeddings dos 298 produtos sincronizados ficam pendentes (busca cai pro fallback de texto); rodar `npm run ai:reembed` ou o botão "Regerar embeddings" depois de configurar a chave.

---

## 17. Deploy em produção (Vercel) — feito e verificado ao vivo (2026-07-15)

### 17.1 O que foi configurado

Projeto `atlhubb` criado na Vercel e linkado ao repositório GitHub
(`paulosergiomoreiragomes123-cyber/atlhubb`), domínio de produção
`https://atlhubb.vercel.app`. Env vars de produção configuradas: `DATABASE_URL`,
`AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, `LOJA_ATLANTICA_USERNAME`/
`PASSWORD`, `BLOB_READ_WRITE_TOKEN` (Blob Store `atlhub-media`, acesso público —
necessário porque `/c/[slug]` exibe a revista publicamente sem login, ver seção
12.4). `AI_GATEWAY_API_KEY` não foi configurada como env var — ver 17.3.

### 17.2 Duas descobertas só visíveis rodando de verdade na Vercel

Nenhuma delas apareceu em teste local — só na primeira tentativa real de deploy:

1. **Cron do plano Hobby**: a Vercel rejeitou o deploy com o `vercel.ts`
   original (`schedule: "0 */6 * * *"`, a cada 6h) — "Hobby accounts are
   limited to daily cron jobs". Ajustado pra `"0 3 * * *"` (uma vez por dia,
   03h UTC). Se o projeto for pra plano Pro no futuro, só editar o `schedule`
   pra aumentar a frequência.
2. **Conexão direta com o Supabase não funciona em função serverless**: login
   e qualquer query no admin falhavam com `Can't reach database server` — a
   conexão direta (porta 5432) do Supabase exige IPv6 (sem o add-on pago de
   IPv4), e as funções serverless da Vercel só têm saída IPv4. Funciona
   perfeitamente local (a máquina de dev tem rota direta), mas nunca
   funcionaria implantado. Fix: `DATABASE_URL` de produção na Vercel usa a
   conexão com **connection pooling** do Supabase (Supavisor, porta 6543,
   `?pgbouncer=true`) — o `.env` local continua com a conexão direta (mais
   simples, sem motivo pra mudar em dev). Ver `.env.example` pro formato exato
   de cada uma.

### 17.3 `AI_GATEWAY_API_KEY` — provavelmente não precisa criar uma

Ao rodar `vercel link`, a Vercel já baixa um `VERCEL_OIDC_TOKEN` — testado ao
vivo (`embed()` de verdade, sem nenhuma `AI_GATEWAY_API_KEY` configurada): a
autenticação via OIDC funcionou (o erro de "sem autenticação" desapareceu). O
único obstáculo que restou foi de billing: **"AI Gateway requires a valid
credit card on file"**. Ou seja, rodando na Vercel, a IA deve autenticar
sozinha via OIDC assim que houver um cartão cadastrado em
`vercel.com/{team}/~/ai` — não é obrigatório criar uma `AI_GATEWAY_API_KEY`
manual. Uma chave manual continua útil só pros scripts locais
(`guide:ingest`/`ai:reembed`/`store:sync`), que rodam fora do runtime da
Vercel e não têm OIDC automático.

### 17.4 Verificado ao vivo em produção, pós-fix

Login admin (sessão criada, cookie `__Secure-authjs.session-token`),
`/admin/loja` (298 produtos, 14 categorias, 212 chunks do Guia — mesmos
números do Supabase local, é o mesmo banco), `/consultor/catalogo` (0 selos
"Esgotado" falsos), `/api/cron/sync-loja` sem o secret correto (401,
protegido), `POST /api/ia` sem `AI_GATEWAY_API_KEY`/cartão (degradação
graciosa, HTTP 200 com mensagem amigável, sem crash) — todos testados direto
contra a URL de produção, não só localhost.

---

## 18. Fase 7 — Revista Digital gerada automaticamente (implementada 2026-07-16)

### 18.1 Por que substituir o upload manual

O cliente não queria mais depender de montar um PDF fora do sistema — pediu
um gerador que monta a revista sozinho a partir dos 298 produtos já
sincronizados da loja pública (Fase 6A), com filtros, capa automática,
preview antes de publicar e exportação opcional em PDF. Nenhuma tela foi
removida: `/admin/revista`, `/admin/revista/[id]`, `/consultor/revista` e
`/consultor/revista/[id]` continuam existindo — só o fluxo de *criação*
(upload manual → gerador) e a forma de *ler* (iframe de PDF → HTML
responsivo) mudaram.

### 18.2 Snapshot ponto-no-tempo, não relação ao vivo

`MagazineIssue` ganhou `filterType` (enum `MagazineFilterType`) e
`productSnapshot` (JSON) — mesma filosofia de `Conversation.messages`: um
array de produtos **congelado no momento da geração**, não uma consulta ao
vivo. Isso significa que preview e publicação nunca mudam de conteúdo
mesmo que o catálogo seja atualizado depois (ex.: um novo sync da loja), e a
leitura (`MagazineView`) nunca precisa rejuntar `Product` — só lê o JSON já
pronto. `pdfUrl` virou opcional: só existe depois que alguém clica
"Exportar PDF" (a leitura normal é sempre a página HTML).

### 18.3 Definição dos filtros (decisão de negócio, não técnica)

Nenhum dos 5 filtros tinha campo próprio no banco — definidos com o cliente:
- **Todos**: `active: true`, sem outro filtro.
- **Lançamentos**: `createdAt` nos últimos 30 dias (produtos sincronizados
  recentemente).
- **Promoções**: categoria de slug `promocao` (existe na loja, mas sem
  produto nenhum sincronizado até 2026-07-16 — filtro mostra estado vazio
  corretamente, não é bug).
- **Perfumes**: categoria com "perfume" no nome (`PERFUME BORTOLETTO`, 96
  produtos).
- **Suplementos**: categoria `nutraceuticos` (a mais próxima que existe hoje).

`description`/`attributes` são `null` em 297 dos 298 produtos — a loja
raramente expõe isso, e o crawler (Fase 6A) capturou fielmente o que existe.
`MagazineView`/`pdf-template.tsx` só renderizam a seção de descrição quando
não é null — nunca inventam texto pra preencher o vazio (mesma regra de
"nunca invente" de toda a Fase 4/6A).

### 18.4 `MagazineView` — um componente, três lugares

`src/components/magazine/magazine-view.tsx` é renderizado sem alteração em:
`/admin/revista/[id]` (preview antes de publicar), `/consultor/revista/[id]`
(leitor) e `/c/[slug]` (destino `REVISTA` do QR Code, público sem login) —
ninguém vê uma versão diferente da outra. `getQrCodeBySlug`
(`src/modules/qrcode/queries.ts`) teve o `select` do `magazineIssue`
estendido pra incluir `filterType`/`productSnapshot` (mesmo cuidado de
performance já documentado ali, agora só trazendo o que a página usa de
verdade). `MagazineCoverPreview` (variante compacta, sem produtos) substitui
o antigo placeholder "Sem capa" no card de listagem do consultor.

### 18.5 Paleta dedicada — `.magazine-theme`

Bloco novo em `app/globals.css`, escopado numa classe (não toca `:root`/
`.dark`) — tons verde/dourado quentes (identidade "natural"), tipografia
serifada só nos títulos da revista. Um catálogo impresso tem identidade
visual própria e fixa por design, então `.magazine-theme` não reage ao dark
mode do resto do app de propósito.

### 18.6 Exportação em PDF sob demanda

`@react-pdf/renderer` (JS puro, sem binário nativo — mesmo padrão de
`tesseract.js`/`unpdf` já usados no projeto) via `src/modules/magazine/
pdf-template.tsx`: capa + páginas de produto em grade (`flexWrap`, já que
react-pdf não tem CSS grid), buscando as imagens direto da URL remota (S3).
`exportMagazinePdfAction` roda `renderToBuffer`, sobe pro Blob Store já
existente (`@vercel/blob`, mesmo usado no upload da Fase 5) e salva a URL em
`pdfUrl`. Testado ao vivo: PDF de 19,3MB com 96 produtos reais, upload e
download confirmados.

### 18.7 O que não mudou

`src/modules/qrcode/actions.ts` (já suportava `REVISTA` como destino),
`recordAuditLog`, os guards `requireAdmin`/`requireApprovedUser`, a rota
`/api/blob/upload` (reaproveitada, não recriada) — nada em produtos/
catálogo/IA/loja foi tocado.

---

## 19. Fase 7.1 — Revista Digital personalizada por consultor, estilo Natura/Avon (implementada 2026-07-16)

### 19.1 De catálogo único pra ferramenta de venda pessoal

O pedido foi ir além de "gerar sozinha" (seção 18): a revista vira uma
ferramenta de venda do **consultor**, não da Atlântica em abstrato. Sem link
"Comprar" pra loja — cada produto e a última página têm
"💬 Peça pelo WhatsApp" apontando pro número **de quem está mostrando a
revista**, com rodapé e última página trazendo nome/telefone/WhatsApp/
cidade/Instagram/foto de quem está logado. Isso muda a arquitetura: a
revista deixa de ser um documento único e passa a ser o mesmo catálogo
**personalizado na hora** pra cada consultor que visualiza ou baixa.

### 19.2 Perfil do consultor (`/consultor/perfil`)

`User` ganhou `whatsapp`/`instagram`/`photoUrl` (`prisma/schema.prisma`) —
separados de `phone` porque precisam de um formato confiável pro link
`wa.me`/QR Code. Módulo novo `src/modules/profile/` (self-service, separado
de `src/modules/users/` que é admin-only): o próprio consultor preenche em
`/consultor/perfil` (RHF+Zod, upload de foto via `/api/blob/upload`
reaproveitado — a checagem lá deixou de ser admin-only e passou a aceitar
qualquer usuário `APROVADO`, já que agora qualquer consultor precisa de
token de upload pra própria foto, não só o admin pra PDF/capa).

### 19.3 PDF gerado na hora, por consultor — não mais um arquivo salvo

`exportMagazinePdfAction`/`ExportMagazinePdfButton` (Fase 7) foram
removidos. `MagazineIssue.pdfUrl`/`coverImageUrl` saíram do schema — nada de
PDF é mais armazenado no Blob. Um Route Handler novo,
`app/api/revista/[id]/pdf/route.ts`, monta o PDF **na hora** com
`renderMaganizePdf` usando os dados de quem está autenticado no momento do
download (auth manual, `getCurrentUser()` + 401, mesmo padrão de
`/api/ia/route.ts`). Cada download é um PDF diferente — o admin baixando um
"PDF de exemplo" vê os próprios dados (ou campos ocultos, se vazios); um
consultor que preencheu o perfil vê os dele.

### 19.4 Filtros viraram checkboxes (união), mais ordenação

`filterType` (singular) virou `filterTypes MagazineFilterType[]` — o admin
marca vários no `GenerateMagazineForm` (shadcn `Checkbox`), combinados em
`OR` (`conditionForFilter` por item); marcar "Todos" ignora o resto.
Filtro novo: **Cosméticos** (categoria `cosmetico-ozonizado`, 60 produtos).
Ordenação nova (`MagazineSortBy`): Lançamentos, Nome, Preço têm critério
real; **Mais vendidos cai pro mesmo critério de Nome** — não existe dado de
venda em lugar nenhum do sistema (a Atlântica não processa pedido dentro do
AtlHub), e a UI deixa isso explícito no rótulo em vez de fingir uma
popularidade. Capa: usa a imagem do primeiro produto do snapshot já
ordenado como "produto em destaque" (não existe banner sincronizado pra
escolher manualmente).

### 19.5 Benefícios/Modo de uso — busca textual no Guia, com dois filtros de segurança

`src/modules/magazine/guide-excerpt.ts` (determinístico, sem IA/embedding —
decisão do cliente): procura o nome do produto literalmente no
`GuideChunk.content` (só documentos `PRONTO` mais recentes, mesmo filtro de
`searchGuideChunks`). Testado ao vivo contra os 298 produtos reais e dois
problemas de falso-positivo apareceram e foram corrigidos:
- **Chunk de índice/sumário**: uma página do Guia lista dezenas de produtos
  em sequência (ex.: "26 - NATUOZ SABONETE 27 - MÁSCARA FACIAL ...") — um
  nome de produto aparecendo ali como substring fazia produtos sem relação
  nenhuma compartilharem o mesmo trecho (confirmado: 26 produtos diferentes
  todos com o mesmo excerto de 3190 caracteres). `looksLikeIndexList` conta
  ocorrências do padrão "número - PALAVRA" no trecho e descarta candidatos
  assim, buscando o próximo (`findMany` + `take: 5`, não mais `findFirst`).
- **Nome de uma palavra só**: nomes curtos e genéricos (`FERRO`, `ZINCO`,
  `BCAA`, `CHIP`) batiam como palavra comum dentro da descrição de OUTRO
  produto (ex.: busca por "ZINCO" retornava a descrição do `ZMA`, que só
  *menciona* zinco como ingrediente; busca por "FERRO" retornava a
  descrição do Pré-Treino, que só cita "absorção de ferro" de passagem).
  Sem forma barata de confirmar que o trecho é realmente sobre aquele
  produto, `findGuideExcerptForProduct` agora **oculta** (retorna
  `null`/`null`) pra qualquer nome sem espaço — mesmo princípio de "nunca
  inventar" aplicado a "incerto demais também não conta como confirmado".
  Depois dos dois filtros: de 298 produtos, 35 com `beneficios` real
  (verificado manualmente que cada um bate com o próprio produto, sem
  duplicata de conteúdo), 7 com `modoDeUso` separado por marcador
  ("MODO DE USAR"/"COMO USAR") real no texto.

### 19.6 Cores por categoria — mesmo índice, dois lookups

`src/modules/magazine/category-colors.ts`: hash simples do nome da
categoria → índice 0–7, usado em paralelo por `getCategoryWebClasses`
(Tailwind, pro `MagazineView`) e `getCategoryPdfColors` (hex, pro
`pdf-template.tsx`) — a mesma categoria cai sempre na mesma cor nos dois
lugares, sem cadastro manual por categoria nova.

### 19.7 PDF: rodapé fixo de verdade + última página dedicada

`pdf-template.tsx` usa o prop `fixed` do `@react-pdf/renderer` (`<View
fixed>`) pro rodapé com dados do consultor repetir automaticamente em toda
página gerada — o motivo real de preferir essa lib a HTML convertido em vez
de paginar por scroll. Última página nova: "Gostou de algum produto? Fale
comigo no WhatsApp" + QR Code (gerado como data URL via `qrcode`, mesma lib
de `src/lib/qrcode.ts`) + foto/nome/telefone/cidade do consultor. Link
clicável real (`<Link src="https://wa.me/...">`) no lugar do texto antigo
"Comprar".

### 19.8 Consultor só vê a última edição publicada

`/consultor/revista` deixou de listar todas as edições publicadas em grade
— busca a mais recente (`listPublishedMagazineIssues()[0]`) e renderiza o
`MagazineView` completo direto, com o perfil do consultor logado.
`/consultor/revista/[id]` continua existindo (link direto/QR de uma edição
específica), também com o `consultant` da sessão atual.
`MagazineCoverPreview` (usado só pela grade antiga) foi removido.

### 19.9 Página pública `/c/[slug]` — personalizada por quem compartilhou

`QrCode` não tem relação FK com `User` (proposital, mesmo padrão de
`AuditLog.actorId`) — `getQrCodeBySlug` ganhou `createdById` no `select`, e
`app/c/[slug]/page.tsx` faz uma segunda query (`getMyProfile`) só quando
`targetType === "REVISTA"`, pra montar o `consultant` de quem gerou o QR
Code. É o caso de uso central do pedido: o cliente que escaneia o QR Code
de um consultor entra em contato **com aquele consultor**, não com um dado
genérico da revista.

### 19.10 Verificação

`npx tsc --noEmit`, `npm run lint`, `npm run build` limpos. Testado contra o
Supabase real via rotas de verificação temporárias (removidas antes do
commit): `buildMagazineSnapshot` pros 298 produtos reais (298/298
processados, contagens de `volume`/`beneficios`/`modoDeUso` conferidas —
ver seção 19.5), filtro Promoções com 0 produtos (estado vazio, PDF de
capa+última página gerado sem erro), filtro Perfumes com 96 produtos
(PDF de 19,3MB gerado com sucesso, cabeçalho `%PDF-1.3` válido). Fluxo
completo de login (preencher `/consultor/perfil`, ver rodapé/CTA com dados
reais como consultor, baixar PDF personalizado, escanear QR Code deslogado)
depende de credenciais de usuário que não estão disponíveis neste ambiente
de verificação — recomendado um teste manual rápido no navegador antes de
considerar a fase encerrada.

---

## 20. Fase 7.3 — Perfil completo de personalização (implementada 2026-07-16)

### 20.1 `/consultor/perfil` vira o painel de identidade da revista

O pedido foi expandir o perfil (seção 19.2) pra cobrir toda a
personalização visual/de contato da revista, não só WhatsApp/Instagram/
foto. `User` ganhou `jobTitle`, `magazineMessage`, `coverColor`
(`MagazineCoverColor`: VERDE/AZUL/ROXO/DOURADO, default VERDE) e quatro
interruptores (`showQrCode`/`showPhoto`/`showInstagram`/`showCity`, todos
`@default(true)`). Os interruptores controlam só a **exibição na revista**
— desligar "mostrar cidade" não apaga `city`, só oculta nas duas
renderizações (`MagazineView`/`pdf-template.tsx`); o dado continua salvo e
volta a aparecer se o consultor religar depois.

A tela virou três seções (`ProfileForm`): **Dados do consultor** (foto,
nome, WhatsApp, Instagram, cidade, estado, cargo — nome editável agora,
antes só existia no cadastro), **Personalização da revista** (mensagem
automática do CTA de WhatsApp, cor da capa) e **Opções de exibição**
(quatro `Switch`). `name`/`city`/`state` passaram a ser editáveis
self-service pela primeira vez (antes só o admin editava via
`/admin/usuarios`) — sem conflito real, é o mesmo padrão de "quem mexeu por
último vale" já aceito em outras telas do sistema.

### 20.2 Uma única fonte de defaults: `buildConsultantInfo`

Antes, cada uma das 4 páginas que montam `ConsultantInfo` (preview do
admin, leitor do consultor, `/consultor/revista/[id]`, `/c/[slug]`, PDF sob
demanda) construía o objeto campo a campo — arriscado com 14 campos agora.
`src/modules/profile/queries.ts` ganhou `buildConsultantInfo(profile,
fallbackName)`, com os mesmos defaults do schema Prisma num único lugar;
todo consumidor agora é `buildConsultantInfo(await getMyProfile(id),
fallbackName)`. O preview do admin (`/admin/revista/[id]`) deixou de usar
campos fixos `null` e passou a ler o perfil real do próprio admin (se ele
tiver preenchido `/consultor/perfil`) — mais correto e sem duplicar lógica.

### 20.3 Cor da capa — `src/modules/magazine/cover-colors.ts`

Mesmo princípio de `category-colors.ts`: um `Record<CoverColor, ...>` só,
com um lookup pro web (gradiente CSS em `oklch()`, aplicado inline no
`Cover` do `MagazineView`, substituindo o gradiente fixo anterior) e outro
pro PDF (cor sólida hex, já que `@react-pdf/renderer` não entende
`oklch()`/gradiente de `View` sem montar `<Svg>` à parte — uma cor sólida
por opção já cumpre "muda a identidade visual da capa" sem complexidade
extra). Só a capa muda de cor — o resto do tema (`.magazine-theme`,
cores de categoria) continua igual, por decisão de escopo (pedido foi
específico: "a cor da capa").

### 20.4 Última página vira "cartão de contato profissional"

`FinalSection` (web) e a última `Page` (PDF) ganharam `jobTitle` (Cargo,
logo abaixo do nome) e uma linha explícita "WhatsApp: {número}" — antes só
o link/QR Code carregavam essa informação, não havia o texto puro. Foto,
QR Code e cidade nessa página agora respeitam `showPhoto`/`showQrCode`/
`showCity`. Instagram não foi adicionado à última página (não fazia parte
do pedido) — continua só no rodapé de cada página, ali sim controlado por
`showInstagram`.

### 20.5 Mensagem automática

`consultant.magazineMessage` substitui o texto fixo "Olá! Vi a revista da
Atlântica Natural e quero saber mais." no link/QR Code de WhatsApp da
seção final/última página quando preenchido (`|| DEFAULT_MAGAZINE_MESSAGE`,
mesmo texto de exemplo do pedido do cliente) — vazio cai pro texto padrão,
nunca fica sem mensagem. A mensagem por produto (`"Tenho interesse no
produto X (Código Y)"`) não foi alterada — é mais específica que a genérica
e não fazia parte do pedido.

### 20.6 Verificação

`npx tsc --noEmit`, `npm run lint`, `npm run build` limpos após `npx prisma
db push` (campos novos aditivos, sem perda de dado). Testado via rota
temporária (removida antes do commit) que gera um PDF real com
`renderMagazinePdf` e extrai o texto de volta com `unpdf` (`extractText` —
já usado na ingestão do Guia, seção 9): com os quatro interruptores ligados,
cidade/Instagram/cargo/"WhatsApp:" aparecem no texto extraído do PDF; com
`showCity`/`showInstagram` desligados, cidade e Instagram somem do texto
(cargo e WhatsApp continuam, como esperado — não são controlados por
interruptor). As 4 cores de capa (`VERDE`/`AZUL`/`ROXO`/`DOURADO`) geram
PDFs com tamanho de arquivo diferente entre si, confirmando que a cor
escolhida realmente muda o byte final gerado. Fluxo de login real
(preencher o formulário no navegador, ver o resultado na revista) continua
fora do alcance deste ambiente por falta de credenciais — mesma ressalva da
seção 19.10.

---

## 21. Magazine V3 — revista premium do zero (implementada 2026-07-17)

### 21.1 Por que substituir de novo, e não só ajustar a v2

O cliente pediu explicitamente pra ignorar a Revista Digital v2 (Fases 7/
7.1/7.2) e construir do zero — cara de catálogo premium (Natura/Boticário/
Eudora), muito mais conteúdo por página, seções reais por categoria (cada
uma começando página nova), e um recurso novo pra perfumes: casar cada
fragrância sincronizada da loja com um perfil olfativo oficial (inspirado
em, notas, categoria, ocasião). `src/modules/magazine/{generator,schemas,
actions,pdf-template}.ts` e `src/components/{admin/generate-magazine-form,
magazine/magazine-view}.tsx` foram reescritos do zero (não adaptados).
`category-colors.ts`/`guide-excerpt.ts` foram removidos, substituídos por
`category-themes.ts`/`guide-matching.ts`. O que **não** mudou —
`src/modules/profile/*`, `cover-colors.ts`, `src/lib/whatsapp.ts`, o
mecanismo de PDF gerado na hora por consultor — é infraestrutura de
personalização já validada, não "a revista antiga" que o cliente queria
substituir.

### 21.2 `PerfumeProfile` — importado uma única vez, nunca por OCR na geração

O cliente enviou dois arquivos reais (`tabela-olfativa-masculina.jpg`,
`.../feminina.jpg`, hoje em `public/magazine/`, também embutidos como
páginas inteiras na revista) com as tabelas oficiais da Atlântica Natural.
Antes de aceitar isso como fonte, uma pesquisa direta no Guia Oficial já
ingerido (212 chunks) confirmou que **não existe** dado de "inspirado em"/
notas/família olfativa por fragrância em lugar nenhum do sistema — só uma
página com uma lista de nomes Feminino/Masculino e um texto de cuidados
genérico pra linha toda. As duas imagens foram lidas e transcritas
manualmente (não OCR) pra `scripts/import-perfume-profiles.ts`, rodado uma
única vez (`npx tsx scripts/import-perfume-profiles.ts`) — populou 21
perfis masculinos + 27 femininos em `PerfumeProfile`. A partir daí, a
geração da revista nunca mais toca essas imagens: só consulta a tabela.

Campos `topNotes`/`heartNotes`/`baseNotes` só existem pra `MASCULINO` — a
tabela feminina não tem essa quebra por fragrância, então ficam `null` pra
toda entrada `FEMININO` (nunca inventado). `occasion`/`ranking` vêm dos
rankings reais das duas tabelas ("Mais marcantes para noite"/"Mais frescos
para o dia"/"Top 9 mais doces"/"Top 5 mais frescos") — só preenchidos
quando a fragrância realmente aparece num desses rankings.

### 21.3 Casamento produto ↔ perfil — exato, nunca fuzzy

`src/modules/magazine/perfume-matching.ts`: `normalizePerfumeName` remove
o prefixo "Fragrância"/"Fragráncia" (as duas grafias existem de verdade nos
produtos sincronizados), o volume, acentos e variantes de apóstrofo
(reto/curvo/agudo — "521 Sexy's" tinha um apóstrofo diferente entre a
tabela e o produto sincronizado, só isso já exigiu normalização). Casamento
é sempre **exato** depois de normalizar os dois lados — nunca
fuzzy/Levenshtein, pra nunca atribuir o perfil de uma fragrância a outra
por engano. Testado contra os 96 produtos de perfume reais: 58 fragrâncias
únicas depois de agrupar variações de volume (15ml/100ml num só card, ver
21.4), 38 casaram com um gênero oficial (17 masculino + 21 feminino), 20
ficaram em "Outros Perfumes" (sem perfil — nomes reais que não estão em
nenhuma das duas tabelas, ex.: variantes "Elixir", "Fortune Gold Elixir",
ou fragrâncias fora do range coberto pelas tabelas enviadas). Isso é
esperado e correto: mostrar sem gênero é melhor que adivinhar errado.

### 21.4 Preço 15ml/100ml — agrupamento por fragrância-base

Produtos de perfume sincronizados existem em dois tamanhos (linhas
separadas na loja). `generator.ts` agrupa pelo nome normalizado e monta um
único item de catálogo com `volumePrices: { "15ml": ..., "100ml": ... }` —
só os tamanhos que existem de verdade pra aquela fragrância aparecem (nunca
um preço inventado pro tamanho que não é vendido).

### 21.5 Preço "De/Por" — arquitetura pronta, nunca inventado

Decisão do cliente (2026-07-16): mostrar só o preço atual por enquanto.
`generator.ts` já calcula `compareAtPriceCents` a partir do **histórico
real** de `ProductPrice` (as duas linhas mais recentes por produto) — se a
mais recente for menor que a anterior, essa anterior vira "De". Hoje é
sempre `null` porque nenhum produto ainda tem 2+ linhas de preço (só um
sync completo até agora) — no dia em que a loja realmente baixar um preço
num sync futuro, "De/Por" aparece sozinho, sem nenhuma mudança de código.

### 21.6 Benefícios/modo de uso/ingredientes — 4 segmentos, com dois filtros de segurança novos

`src/modules/magazine/guide-matching.ts` (sucessor de `guide-excerpt.ts`)
separa um trecho do Guia em até 4 campos por marcador real ("SOBRE O
PRODUTO" → descrição, "BENEFÍCIOS" → benefícios, "MODO DE USAR"/"SUGESTÃO
DE CONSUMO" → modo de uso, "INFORMAÇÃO NUTRICIONAL"/"COMPOSIÇÃO" →
ingredientes) — cada um só aparece se o próprio texto tiver aquele
marcador. Dois problemas reais apareceram testando contra o catálogo
inteiro e foram corrigidos:

- **Ruído de OCR em tabela nutricional**: a seção de ingredientes vem de
  tabelas de informação nutricional, a pior parte do OCR do Guia (muitas
  colunas numéricas apertadas) — viravam texto ilegível tipo "1AG 31SC made
  à G7 ÁEAL...Ao/[IN HR 2 UM". `looksLikeOcrNoise` (contagem de `[`, `]`,
  `|` — quase nunca aparecem em português real, mas sempre aparecem nesse
  tipo de ruído) oculta o segmento em vez de mostrar lixo ilegível como se
  fosse informação real de produto (ainda mais sensível em suplemento/
  vitamina).
- **Atribuição errada por nome genérico**: "COMPLEXO B" (produto real)
  batia por acaso dentro da lista de ingredientes de OUTRO suplemento
  (Pré-Treino, que menciona "vitaminas do complexo B" de passagem),
  mostrando a descrição errada. Corrigido exigindo que o nome buscado
  apareça dentro do próprio segmento de descrição ("SOBRE O PRODUTO..."),
  não em qualquer lugar do trecho inteiro. **Limitação conhecida e aceita**:
  isso não resolve 100% dos casos — "Complexo B" também aparece dentro da
  descrição do ANTIOX (que cita "um mix de vitaminas... do Complexo B" como
  ingrediente próprio), e uma tentativa de exigir a posição bem no início da
  descrição (testada) cortou também matches legítimos como "Picolinato de
  Cromo" (cuja menção real fica mais adiante no parágrafo) — a posição varia
  demais entre páginas do Guia pra usar como corte rígido. Fixar isso de
  verdade exigiria entendimento semântico (IA), explicitamente fora de
  escopo; o residual (nomes de produto que também são termos genéricos de
  nutriente, ex. "Complexo B") fica como limitação documentada, não
  resolvida às cegas.

Buscas agora tentam múltiplas variantes por especificidade (nome completo,
nome sem volume/tamanho) — "Código" como critério de casamento foi
descartado: confirmado que o Guia nunca menciona SKU/código de produto.

### 21.7 Seções por categoria — só o que é real

Sem filtro escolhido pelo admin: "Gerar Magazine" busca **todos** os
produtos ativos. Suplementos (`nutraceuticos`) e Cosméticos
(`cosmetico-ozonizado`) mantêm o agrupamento já aceito na v2; toda outra
categoria real (Óleos Essenciais, Vitaminas, Academia, Chás, Linha Casa
Ozônio, Linha Impera, Linha Nema, Maquiagem Ozônio, Material Apoio,
Serviços, Wave Global) vira sua própria seção com o nome real (limpo de
espaço duplo/ALL CAPS pra Title Case — cosmético, não muda o dado). Sem
seção "Kits" inventada: nenhum produto ou categoria real tem esse sinal
hoje. "Lançamentos" (createdAt < 30 dias) foi **testada e removida**: logo
depois de uma sincronização em massa, 100% do catálogo tem `createdAt`
recente — uma seção "Lançamentos" que é o catálogo inteiro não destaca
nada de verdade (mesmo princípio de nunca fingir "Mais vendidos" sem dado
real). Um limiar (só aparece se for ≤50% do catálogo) prepara pra quando a
loja sincronizar produtos de verdade novos aos poucos no futuro.
"Promoções" só apareceria se a categoria real `promocao` (existe no
crawler, hoje sem produto) algum dia tiver produto.

### 21.8 Layout — inspirado na Magazine oficial, sem copiar

A Magazine oficial da Atlântica (`magazine-oficial-referencia.pdf`, 55
páginas — renomeada nesta sessão por um bug de normalização Unicode no
nome original com "Ç") foi lida e analisada visualmente antes de desenhar
o layout. Achado importante: as páginas de produto reais são colagens
artísticas (flatlay com cenário, bottles compostos à mão sobre fotos de
lifestyle) — isso não é automatizável a partir de fotos de produto simples
sincronizadas da loja, então a V3 pega a linguagem (tipografia grande e
confiante, badges de preço, bloco de cor sólida por categoria, bastante
espaço, 1-2 produtos por página em vez de grade de 9) sem tentar recriar a
arte por cenário. Duas páginas especiais (as imagens reais das tabelas
olfativas, exatamente como enviadas) ficam sempre antes do catálogo
automático de perfumes. QR Code por produto (além do QR de contato do
rodapé/última página) — mensagem de WhatsApp já cita o produto/perfume.

### 21.9 Verificação

`npx tsc --noEmit`, `npm run lint`, `npm run build` limpos. Testado ao vivo
contra os 298 produtos reais sincronizados: 16 seções geradas, 260 itens de
catálogo (202 produtos normais + 58 fragrâncias agrupadas), PDF de 52,8MB/
157 páginas gerado com sucesso e inspecionado (texto extraído via `unpdf`
confirma cover/divisórias/CTA/última página; render de página-imagem via
`renderPageAsImage` confirma visual da capa, divisória de categoria e card
de produto). Primeira edição real ("Edição de Julho 2026") já criada e
publicada em produção via o mesmo caminho de código do botão "Gerar
Magazine" do admin. Fluxo de login real (perfil, download autenticado)
continua fora do alcance deste ambiente por falta de credenciais — mesma
ressalva de sempre.

---

## 22. Magazine V4 — PDF reaproveita a revista oficial impressa byte a byte (implementada, 2026-07-17)

### 22.1 Mudança de estratégia

O cliente pediu pra parar de recriar a revista do zero (Magazine V3) e usar
`magazine-oficial-referencia.pdf` (55 páginas, edição real impressa "ED 17
Março 26") como base — preservando ao máximo layout/cores/tipografia,
substituindo automaticamente só o preço (no lugar, sobre a arte) e
acrescentando, logo depois de cada página de produto, uma seção nova com
Para que serve/Principais benefícios/Como usar (e pra perfume: Inspirado
em/família olfativa/notas/fixação/ocasião). A versão **web** (`/consultor/
revista`, `MagazineView`) continua sendo o catálogo Magazine V3 (dados
sempre vivos) — só o **PDF baixado** passou a reaproveitar a revista
oficial. É uma divergência consciente entre as duas leituras, documentada
aqui pra não confundir manutenção futura.

### 22.2 Achado técnico decisivo: o PDF oficial não tem nenhum texto real

Antes de escrever qualquer código, extraí o texto de **todas as 55
páginas** via `pdf.js getTextContent()` — **0 itens de texto no documento
inteiro**. Cada página é uma imagem 100% achatada; não existe metadado de
produto/preço/SKU em lugar nenhum. Isso define a arquitetura inteira:

- **Não dá pra substituir o preço "no código-fonte"** — só cobrindo o
  preço antigo (pixel) com uma caixa branca + preço novo, na posição certa.
- A posição de cada preço foi achada com **OCR** (`tesseract.js`, já
  dependência do projeto — mesmo motor do Guia Oficial), pedindo a saída
  com bounding box por palavra (`recognize(image, {}, { blocks: true })` —
  por padrão o tesseract.js não devolve isso). Rodado **uma única vez** por
  página, ao montar o mapeamento (`scripts/ocr-page-prices.ts`, ferramenta
  de apoio, não roda em produção) — nunca reprocessado na geração da
  revista.
- Qual **SKU real** cada garrafa retrata é conferido à mão (nome do
  produto, não os códigos impressos na revista — testado, esses códigos
  **não são** o `storeProductId`, são uma numeração interna do impresso sem
  relação com o catálogo sincronizado).
- A edição impressa é **fixa** (março/2026) — o catálogo sincronizado
  evolui. Testado ao vivo na seção "Ozonizados" (página 3): só 4 dos 12
  produtos retratados existem no catálogo de hoje (a linha de óleos
  "NatuOz"/óleo de girassol foi descontinuada) — os outros 8 simplesmente
  não recebem preço atualizado nem página de detalhe (nunca inventa um SKU
  só pra preencher).

### 22.3 Bug real de z-order descoberto e corrigido (importante pra manutenção futura)

A primeira tentativa desenhou a sobreposição direto numa página copiada do
PDF original (`pdf-lib`: `copyPages` + `page.drawRectangle`/`drawText`).
Testado ao vivo: o conteúdo novo aparecia **atrás** do original em alguns
casos — dumping o content stream real do PDF gerado confirmou que os
operadores estavam na ordem certa no arquivo (`q → conteúdo original → Q →
conteúdo novo`), então não era bug do pdf-lib nem do arquivo gerado, e sim
um problema de interoperabilidade de alguns leitores de PDF (confirmado
com `pdf.js`) com Contents multi-stream + o wrap de graphics state que o
próprio pdf-lib insere ao desenhar numa página copiada.

Como o documento inteiro já é bitmap (nada de vetor pra perder), a solução
robusta foi abandonar completamente a composição em nível de PDF pra essas
páginas: **renderizar a página original como imagem** (mesma técnica do
OCR), **desenhar a sobreposição direto no canvas** (`@napi-rs/canvas`,
ordem de pintura sempre inequívoca — o que é desenhado por último sempre
fica por cima) e **embutir o resultado como uma única imagem de página**.
Páginas 100% novas (abertura personalizada, páginas de detalhe) continuam
usando a API vetorial normal do `pdf-lib` (sem original por baixo, sem
ambiguidade).

Dois bugs adicionais, ambos corrigidos:
- `@napi-rs/canvas`/`unpdf` precisam estar em `serverExternalPackages` no
  `next.config.ts` — sem isso, o Turbopack tenta empacotar o binário
  nativo e quebra em runtime ("Cannot find native binding"). Só apareceu
  agora porque é a primeira vez que esse pacote roda **dentro do servidor
  Next** (antes só era usado em scripts standalone).
- Reusar a mesma instância de `Uint8Array`/`Buffer` em múltiplas chamadas
  de `renderPageAsImage` quebra com `DataCloneError` (o pdf.js manda o
  buffer pro worker via structured clone, que "esvazia"/destrói o buffer
  original) — mesmo problema já documentado na ingestão do Guia Oficial
  (seção 9). Corrigido criando uma cópia nova a cada chamada.

### 22.4 Arquitetura final

`src/modules/magazine/editions/` — uma edição = um PDF real da revista
impressa + o mapeamento manual único feito uma vez pra ela. Começou como
um único arquivo (`official-edition-mapping.ts`) e foi refatorado pra um
diretório (`types.ts` define `OfficialEditionDefinition`/
`OfficialProductMapping`; `2026-03.ts` é a edição "ED 17 Março 26";
`registry.ts` exporta `OFFICIAL_EDITIONS` e `getActiveEdition()`, que
escolhe sempre a mais recente por `publishedAt`) — pra quando a Atlântica
publicar uma edição nova, o processo vira "adicionar um arquivo", sem
mexer no assembler. Mapeamento é `página → [{ sku, priceBox }]`, fração
0-1 da página (indefinição de escala). `src/modules/magazine/
official-pdf-assembler.ts` (`assembleOfficialMagazinePdf`) monta, nesta
ordem: página de abertura personalizada nova (antes da capa, já que a capa
oficial não tem área reservada pra sobrepor sem alterar a identidade
visual) → capa oficial intacta (cópia direta) → índice oficial intacto →
pra cada página de conteúdo (3 a 54): se tem produto mapeado, sobrepõe
preço(s) + insere página(s) de detalhe logo depois; sem nada mapeado,
cópia direta (evita reamostrar como imagem à toa, preserva qualidade);
logo após a página de Fragrâncias (absoluta 47), as duas imagens reais das
tabelas olfativas → contracapa oficial com overlay só na caixa branca já
reservada na própria arte (foto circular, nome, cargo, cidade, WhatsApp,
Instagram, mensagem personalizada, QR Code). `generator.ts` ganhou
`buildEnrichmentBySku` — busca só os SKUs específicos de uma página (não o
catálogo inteiro), reaproveitando 100% do enriquecimento já existente
(Guia, `PerfumeProfile`).

### 22.5 Status do mapeamento — completo (52/52 páginas de conteúdo)

Todas as páginas de conteúdo da edição 2026-03 (3 a 54: Ozonizados,
Suplementos e Nutracêuticos, Linha Capilar, Alta Performance/Desempenho,
Emagrecimento, Linha Casa, Linha Academia, Imunidade, Linha Dermo,
Qualidade de Vida, Fragrâncias, Material de Apoio, Linha Nemawashi/Profit,
Óleos Essenciais, Longevidade) foram conferidas produto-a-produto contra o
catálogo sincronizado real e mapeadas em `editions/2026-03.ts` — 159
correspondências de SKU no total. Cada página documenta em comentário
quais produtos retratados **não** têm correspondência hoje (linha
descontinuada, formato diferente, nome genérico demais pra atribuir com
segurança) — essas ficam de fora deliberadamente, nunca um SKU chutado só
pra preencher. Página sem nenhum produto mapeado (ex.: página 6, Gel de
Massagem; página 18, Mind Expert; página 42, Linha Colágeno) aparece
intacta (cópia direta, sem preço desatualizado "escondido").

### 22.6 Verificação final — PDF completo gerado e inspecionado

PDF de teste real gerado ponta a ponta pelo caminho de produção
(`assembleOfficialMagazinePdf`, mesma função usada por `/api/revista/
[id]/pdf`), contra o catálogo sincronizado real: **106 páginas** (55
originais + páginas de detalhe inseridas + abertura personalizada +
tabelas olfativas). Inspecionado visualmente (render página-a-página via
`renderPageAsImage`/`unpdf`, mesma técnica do assembler): capa/índice/
colagens de produto intactos, preço sobreposto sem fantasma nem
desalinhamento, contracapa com foto/QR/contato dentro da caixa reservada,
páginas de detalhe com os campos corretos (produto normal vs. perfume) e
com "sem dado" tratado graciosamente (nome aparece, campos vazios somem).

Dois problemas reais achados nessa verificação final e corrigidos:

- **PDF de 167MB/106 páginas com `embedPng`**: cada página com overlay é
  renderizada como imagem inteira (ver 22.3) e `canvas.toBuffer("image/
  png")` gera PNG sem perdas — inviável pra um consultor baixar no
  celular. Trocado por `canvas.toBuffer("image/jpeg", 88)` +
  `doc.embedJpg` (as páginas são fotos de revista, sem transparência
  nenhuma — JPEG é visualmente idêntico aqui). Resultado: **20,9MB**, uma
  redução de ~87%, na mesma faixa do PDF gerado do zero pela V3 (52,8MB).
- **"R$" duplicado na página 52 (Óleos Essenciais)**: 4 das 7 caixas de
  preço da página cobriam só o número (bounding box do OCR pro token
  numérico, sem incluir o token "R$" separado à esquerda), deixando o "R$"
  antigo visível ao lado do preço novo — "R$ R$142,98". O mesmo tipo de
  caixa já havia sido alargada em outras páginas de item único (Curcu+Mais,
  Vital Life, ATLVision, Life Control, página 53) mas foi esquecida
  nesta página de 7 itens lado a lado; corrigido alargando as 7 caixas
  pra a esquerda (mesmo padrão), sem invadir o preço do produto vizinho —
  reconferido visualmente após o ajuste.

Fluxo de login real (perfil, download autenticado) continua fora do
alcance deste ambiente por falta de credenciais — mesma ressalva de
sempre; a rota de produção (`/api/revista/[id]/pdf`) foi lida e conferida
por inspeção de código, não exercitada via navegador logado.
