# AtlHub — Documento de Arquitetura

> Status: Fases 1–3 implementadas, mais um bloco de plataforma administrativa completa (marcas, fornecedores, galeria de imagens, estoque com histórico, busca avançada, auditoria, dashboard, sidebar) construído antes da Fase 4 a pedido do cliente. **Fase 4 (assistente de IA + ingestão do Guia Oficial)** implementada e testada contra o Supabase real — o Guia 2026 é um PDF escaneado (sem texto extraível); um fallback de OCR (`tesseract.js` + `@napi-rs/canvas`, 2026-07-15, ver seção 9) ingeriu as 204 páginas em 212 chunks reais. Falta só a `AI_GATEWAY_API_KEY` (a ser adicionada no deploy) para o primeiro teste com modelo de verdade e para completar os embeddings pendentes (`npm run ai:reembed`, ver seção 9). **Fase 5 (revista digital, QR Code, compartilhamento)** implementada e testada contra o Supabase real — falta só o `BLOB_READ_WRITE_TOKEN` (idem, no deploy) para o upload real de PDF funcionar; o resto (CRUD, publicação, QR Code, página pública) já funciona hoje via URL manual. **Fase 6A (sincronização com a loja pública `loja.atlanticanatural.com.br`) implementada e testada ao vivo (2026-07-15)** — 298 produtos sincronizados de 21 categorias, rodado duas vezes contra o Supabase real confirmando idempotência (2ª execução: 0 criados, 0 atualizados, 298 sem mudança). Isso supera a decisão de negócio da seção 8/10 (registrada mais cedo no mesmo dia) — o cliente confirmou que a loja pública existe e deve ser sincronizada; ver seção 16.
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

---

## 12. Estratégia para Revista Digital e QR Code (implementada — Fase 5)

### 12.1 Revista digital: sem `MagazinePage`, leitor via PDF nativo

O rascunho original (seção 6.4 do documento inicial) previa uma tabela `magazine_pages` com uma imagem por página, pensada pra um leitor "flip-book" customizado. Isso foi trocado por uma única coluna `pdfUrl` em `MagazineIssue`, lida pelo **visualizador nativo de PDF do navegador** (`<iframe src={pdfUrl} />`). Motivo: o navegador já entrega navegação por página, zoom e busca de graça — converter cada página de um PDF em imagem exigiria um pipeline de conversão (biblioteca de renderização, processamento por página) só pra reimplementar o que já existe. Publicação continua controlada (`RASCUNHO` → `PUBLICADA`), então nada de rascunho aparece pro consultor antes da hora.

### 12.2 Upload: direto do navegador pro Blob (não passa pelo servidor)

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
- [x] Cron via `vercel.ts` (a cada 6h) + `npm run store:sync` (manual/local)
- [ ] **Estoque não sincronizado de propósito** — a loja pública não expõe quantidade/disponibilidade de forma confiável; decisão explícita documentada na seção 16, não uma lacuna

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

`vercel.ts` (novo, convenção atual da Vercel — ver `@vercel/config`) declara um cron a cada 6h chamando `/api/cron/sync-loja`, protegida por `CRON_SECRET` (a Vercel envia `Authorization: Bearer` automaticamente quando essa env var está configurada no projeto).

### 16.9 Como operar

- **Sincronizar manualmente**: `npm run store:sync` (lê `LOJA_ATLANTICA_USERNAME`/`PASSWORD` do `.env`) ou o botão em `/admin/loja`.
- **Credenciais**: `.env` local apenas (gitignorado), nunca logadas — `client.ts` só loga sucesso/falha do login, nunca o payload.
- **Testado ao vivo (2026-07-15)**: 1ª execução — 21 categorias, 298 produtos, 298 criados, 0 erros; 2ª execução (idempotência) — 298 produtos, 0 criados, 0 atualizados, 298 sem mudança. `npm run lint` e `npm run build` limpos.
- **Pendência conhecida**: mesma da Fase 4 — sem `AI_GATEWAY_API_KEY` real, os embeddings dos 298 produtos sincronizados ficam pendentes (busca cai pro fallback de texto); rodar `npm run ai:reembed` ou o botão "Regerar embeddings" depois de configurar a chave.
