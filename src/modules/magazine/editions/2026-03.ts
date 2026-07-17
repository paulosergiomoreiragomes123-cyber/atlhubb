import type { OfficialEditionDefinition } from "./types";

// Edição impressa real "ED 17 Março 26" — 55 páginas. Mapeamento manual
// único (ver types.ts) feito olhando cada página renderizada + OCR pra
// achar a região de cada preço (scripts/ocr-page-prices.ts, ferramenta de
// apoio, não roda em produção). Cada SKU é conferido à mão contra o
// catálogo sincronizado (os códigos impressos na revista NÃO são o
// storeProductId — testado e confirmado, ver PROJECT.md). Produtos
// retratados que não existem mais no catálogo sincronizado ficam de fora —
// nunca é inventado um SKU só pra preencher a página.
export const EDITION_2026_03: OfficialEditionDefinition = {
  id: "2026-03",
  label: "Edição Março 2026",
  pdfPath: "magazine/editions/2026-03.pdf",
  publishedAt: "2026-03-01",
  coverPage: 1,
  indexPage: 2,
  backCoverPage: 55,
  fragrancePage: 47,
  contentPageRange: { start: 3, end: 54 },
  mapping: {
    // Página 3 — Linha Ozonizada ("Ozonizados", índice p.01). Só 4 dos 12
    // produtos retratados existem no catálogo hoje — a linha de óleos
    // "NatuOz" (Hot/Bronze/Bucal/Corpo/Rosto/Pés e Pernas/Fios/Power/
    // Intímo) e "NatuOz"/"NatuOz Family" (óleo de girassol) foram
    // descontinuadas desde a edição impressa.
    3: [
      { sku: "LOJA-342", priceBox: { xFrac: 0.1092, yFrac: 0.12, widthFrac: 0.0756, heightFrac: 0.0166 } }, // Hidratante Radiante
      { sku: "LOJA-343", priceBox: { xFrac: 0.4748, yFrac: 0.0576, widthFrac: 0.0756, heightFrac: 0.0166 } }, // Hidratante Sensual
      { sku: "LOJA-344", priceBox: { xFrac: 0.7975, yFrac: 0.1217, widthFrac: 0.1193, heightFrac: 0.0279 } }, // Hidratante Encantada
      { sku: "LOJA-345", priceBox: { xFrac: 0.0538, yFrac: 0.3367, widthFrac: 0.0756, heightFrac: 0.0131 } }, // Rosa Mosqueta
    ],
    // Página 4 — "Bem-Estar + Cuidados Diários" (ainda seção Ozonizados).
    // NatuOz Sabonete Líquido e o Carvão Ativado (preço não achado com
    // confiança pelo OCR, sobreposto por texto) ficam de fora.
    4: [
      { sku: "LOJA-386", priceBox: { xFrac: 0.158, yFrac: 0.342, widthFrac: 0.0765, heightFrac: 0.0137 } }, // Sabonete Corporal 400ml
      { sku: "LOJA-388", priceBox: { xFrac: 0.8353, yFrac: 0.5077, widthFrac: 0.0756, heightFrac: 0.0172 } }, // Pasta Dental Creme Novo 90g
      { sku: "LOJA-19", priceBox: { xFrac: 0.5387, yFrac: 0.6063, widthFrac: 0.0756, heightFrac: 0.0172 } }, // Desodorante Ozonizado
      { sku: "LOJA-12", priceBox: { xFrac: 0.6916, yFrac: 0.6063, widthFrac: 0.0765, heightFrac: 0.0172 } }, // Creme Dental Ozonizado
    ],
    // Página 5 — "Cuidados com o Corpo". Loção Corporal, Creme Super
    // Hidratante, Desodorante em Creme e Hidratante Para os Pés não têm
    // correspondência confiável no catálogo hoje.
    5: [
      { sku: "LOJA-25", priceBox: { xFrac: 0.5252, yFrac: 0.2375, widthFrac: 0.0756, heightFrac: 0.0137 } }, // Sabonete Íntimo Ozonizado 250ml
      { sku: "LOJA-391", priceBox: { xFrac: 0.5966, yFrac: 0.5523, widthFrac: 0.0756, heightFrac: 0.0172 } }, // Sabonete Antiacne
    ],
    // Página 6 — Gel de Massagem Extra Forte Ozonizado: sem correspondência
    // no catálogo hoje, página fica intacta (sem entrada aqui).
    // Página 7 — Depil Skin / Máscara Peel-Off Black. Peel-Off Black não
    // encontrado no catálogo hoje.
    7: [
      { sku: "LOJA-860", priceBox: { xFrac: 0.1849, yFrac: 0.2007, widthFrac: 0.0765, heightFrac: 0.0166 } }, // DepilSkin Creme Depilatório
    ],
    // Página 8 — Suplementos e Nutracêuticos (índice p.06).
    8: [
      { sku: "LOJA-871", priceBox: { xFrac: 0.4815, yFrac: 0.1057, widthFrac: 0.0916, heightFrac: 0.0166 } }, // Magnésio Dimalato Cápsulas
      { sku: "LOJA-880", priceBox: { xFrac: 0.62, yFrac: 0.185, widthFrac: 0.09, heightFrac: 0.017 } }, // Magnésio Bisglicinato
      { sku: "LOJA-870", priceBox: { xFrac: 0.3549, yFrac: 0.6026, widthFrac: 0.0917, heightFrac: 0.017 } }, // Cranberry Cápsulas
      { sku: "LOJA-869", priceBox: { xFrac: 0.5589, yFrac: 0.6026, widthFrac: 0.0922, heightFrac: 0.017 } }, // Vitamina C Ácido Ascórbico Cápsulas
      { sku: "LOJA-874", priceBox: { xFrac: 0.1359, yFrac: 0.9067, widthFrac: 0.0922, heightFrac: 0.0166 } }, // Cúrcuma 95% Cápsulas
      { sku: "LOJA-86", priceBox: { xFrac: 0.4514, yFrac: 0.9067, widthFrac: 0.0922, heightFrac: 0.0166 } }, // Vitamina B12
      { sku: "LOJA-87", priceBox: { xFrac: 0.751, yFrac: 0.9067, widthFrac: 0.0922, heightFrac: 0.0166 } }, // Vitamina D3
    ],
    // Página 9 — Linha A-Z (ainda Suplementos e Nutracêuticos).
    9: [
      { sku: "LOJA-47", priceBox: { xFrac: 0.4672, yFrac: 0.4887, widthFrac: 0.0916, heightFrac: 0.0166 } }, // A-Z Complex Multi
      { sku: "LOJA-46", priceBox: { xFrac: 0.4672, yFrac: 0.8753, widthFrac: 0.0916, heightFrac: 0.0172 } }, // A-Z Complex Mulher
    ],
    // Página 10 — ainda Suplementos e Nutracêuticos (numeração própria "08").
    10: [
      { sku: "LOJA-55", priceBox: { xFrac: 0.1575, yFrac: 0.4201, widthFrac: 0.0922, heightFrac: 0.017 } }, // Cloreto de Magnésio
      { sku: "LOJA-371", priceBox: { xFrac: 0.3529, yFrac: 0.5684, widthFrac: 0.0754, heightFrac: 0.017 } }, // Gotas ADEK
      { sku: "LOJA-71", priceBox: { xFrac: 0.5916, yFrac: 0.4099, widthFrac: 0.0922, heightFrac: 0.0166 } }, // ImuniPro
      { sku: "LOJA-372", priceBox: { xFrac: 0.8269, yFrac: 0.4208, widthFrac: 0.0759, heightFrac: 0.0166 } }, // Gotas Lisina
    ],
    // Página 11 — fundo fotográfico (fitness), OCR de texto não achou os
    // preços (fonte estilizada) — caixas brancas localizadas por detecção
    // de blob (script de apoio ad-hoc, não faz parte do app). "Beauty
    // Gomas" (goma/gummy) não tem correspondência confiável no catálogo
    // hoje — só existe "BEAUTY - HAIR/SKIN/NAILS" em cápsula, formato
    // diferente do retratado — fica de fora.
    11: [
      { sku: "LOJA-247", priceBox: { xFrac: 0.0588, yFrac: 0.4403, widthFrac: 0.2916, heightFrac: 0.022 } }, // Óleo de Abacate
      { sku: "LOJA-78", priceBox: { xFrac: 0.0588, yFrac: 0.6119, widthFrac: 0.2916, heightFrac: 0.022 } }, // Resveratrol Longevity
      { sku: "LOJA-65", priceBox: { xFrac: 0.6832, yFrac: 0.625, widthFrac: 0.2916, heightFrac: 0.022 } }, // Fibras Complex
    ],
    // Página 12 — Linha Capilar NatuOz (índice p.10). O par Condicionador+
    // Shampoo NatuOz "Força e Resistência" (código 136, caixa de preço
    // 129,80 em torno de xFrac 0.047/yFrac 0.488) não tem correspondência
    // confiável no catálogo hoje — fica de fora. "Ouro"/"GoldHydration" no
    // catálogo corresponde à linha "Banho de Ouro Ozonizado" retratada.
    12: [
      { sku: "LOJA-382", priceBox: { xFrac: 0.3622, yFrac: 0.4483, widthFrac: 0.1286, heightFrac: 0.0327 } }, // Condicionador Ouro (GoldHydration)
      { sku: "LOJA-381", priceBox: { xFrac: 0.363, yFrac: 0.4881, widthFrac: 0.1286, heightFrac: 0.0321 } }, // Shampoo Ouro (GoldHydration)
      { sku: "LOJA-385", priceBox: { xFrac: 0.484, yFrac: 0.5327, widthFrac: 0.1286, heightFrac: 0.0321 } }, // Máscara Ouro (GoldHydration)
      { sku: "LOJA-341", priceBox: { xFrac: 0.2546, yFrac: 0.554, widthFrac: 0.1269, heightFrac: 0.0321 } }, // Linha Men 4 em 1
      { sku: "LOJA-23", priceBox: { xFrac: 0.5924, yFrac: 0.5784, widthFrac: 0.1286, heightFrac: 0.0333 } }, // Natuliso
      { sku: "LOJA-99", priceBox: { xFrac: 0.7681, yFrac: 0.5071, widthFrac: 0.1832, heightFrac: 0.0469 } }, // Combo Alinhamento Absoluto
      { sku: "LOJA-21", priceBox: { xFrac: 0.0504, yFrac: 0.9329, widthFrac: 0.1815, heightFrac: 0.0226 } }, // Máscara Capilar Ozonizado
    ],
    // Página 13 — Linha Cronograma Capilar (índice p.11).
    13: [
      { sku: "LOJA-338", priceBox: { xFrac: 0.0664, yFrac: 0.2987, widthFrac: 0.0756, heightFrac: 0.0166 } }, // Shampoo Hidratante (785)
      { sku: "LOJA-339", priceBox: { xFrac: 0.316, yFrac: 0.2987, widthFrac: 0.0756, heightFrac: 0.0166 } }, // Condicionador Hidratante (786)
      { sku: "LOJA-340", priceBox: { xFrac: 0.2, yFrac: 0.8901, widthFrac: 0.0765, heightFrac: 0.0315 } }, // Máscara Hidratante (787)
      { sku: "LOJA-377", priceBox: { xFrac: 0.5538, yFrac: 0.9026, widthFrac: 0.0765, heightFrac: 0.0166 } }, // Crono Power Reconstrução (960)
      { sku: "LOJA-376", priceBox: { xFrac: 0.7824, yFrac: 0.9026, widthFrac: 0.0765, heightFrac: 0.0166 } }, // Crono Power Nutrição (959)
    ],
    // Página 14 — Linha Capilar Lançamentos (índice p.12).
    14: [
      { sku: "LOJA-392", priceBox: { xFrac: 0.0723, yFrac: 0.5582, widthFrac: 0.0916, heightFrac: 0.0166 } }, // Nanoxenol (975)
      { sku: "LOJA-379", priceBox: { xFrac: 0.2185, yFrac: 0.4887, widthFrac: 0.0756, heightFrac: 0.0166 } }, // Protetor Térmico (962)
      { sku: "LOJA-378", priceBox: { xFrac: 0.3908, yFrac: 0.5576, widthFrac: 0.0756, heightFrac: 0.0172 } }, // Óleo Finalizador (961)
      { sku: "LOJA-380", priceBox: { xFrac: 0.5546, yFrac: 0.4887, widthFrac: 0.0756, heightFrac: 0.0166 } }, // Ativador de Cachos (963)
    ],
    // Página 15 — Balm Modelador Ozonizado (índice p.13, produto único).
    // Caixa impressa tem prefixo "R$" antes do valor — caixa alargada pra
    // a esquerda pra cobrir o texto todo (formatCents já devolve "R$ x,xx").
    15: [
      { sku: "LOJA-262", priceBox: { xFrac: 0.62, yFrac: 0.8337, widthFrac: 0.135, heightFrac: 0.0166 } }, // Balm Modelador (557)
    ],
    // Página 16 — Linha Capilar Nutritivo/Reconstrutor (índice p.14). Preços
    // em legenda (pill list), não sobre a garrafa — 2 das 7 caixas (linha
    // Nutritivo, meio da lista) não isoladas pelo detector de blob (se
    // fundiram com a curva neon rosa de fundo); posição interpolada pela
    // altura de linha regular confirmada nas outras 5 caixas (~0.0449).
    16: [
      { sku: "LOJA-853", priceBox: { xFrac: 0.2328, yFrac: 0.7892, widthFrac: 0.0891, heightFrac: 0.0285 } }, // Shampoo Nutritivo (1203)
      { sku: "LOJA-854", priceBox: { xFrac: 0.2328, yFrac: 0.8341, widthFrac: 0.0891, heightFrac: 0.0285 } }, // Condicionador Nutritivo (1204)
      { sku: "LOJA-855", priceBox: { xFrac: 0.2328, yFrac: 0.879, widthFrac: 0.0891, heightFrac: 0.0285 } }, // Máscara Nutritiva (1205)
      { sku: "LOJA-856", priceBox: { xFrac: 0.2328, yFrac: 0.924, widthFrac: 0.0891, heightFrac: 0.0285 } }, // Leave In 10X Rosa Mosqueta (1206)
      { sku: "LOJA-850", priceBox: { xFrac: 0.5983, yFrac: 0.8195, widthFrac: 0.0866, heightFrac: 0.0285 } }, // Shampoo Reconstrutor (1200)
      { sku: "LOJA-851", priceBox: { xFrac: 0.6008, yFrac: 0.8628, widthFrac: 0.084, heightFrac: 0.0291 } }, // Condicionador Reconstrutor (1201)
      { sku: "LOJA-852", priceBox: { xFrac: 0.6025, yFrac: 0.9115, widthFrac: 0.0832, heightFrac: 0.0291 } }, // Máscara Reconstrutora (1202)
    ],
    // Página 17 — Alta Performance (índice p.15). Duas cápsulas "OstCálcio"
    // retratadas (799 e 798) são o mesmo produto (mesmo preço, mesmo pote)
    // — mapeado nas duas posições pro mesmo SKU.
    17: [
      { sku: "LOJA-352", priceBox: { xFrac: 0.1709, yFrac: 0.5202, widthFrac: 0.0759, heightFrac: 0.017 } }, // OstCálcio (799)
      { sku: "LOJA-351", priceBox: { xFrac: 0.8451, yFrac: 0.5199, widthFrac: 0.0759, heightFrac: 0.0166 } }, // 5 Magnésios (798)
      { sku: "LOJA-348", priceBox: { xFrac: 0.0984, yFrac: 0.6542, widthFrac: 0.0922, heightFrac: 0.0166 } }, // Natuliv Colágeno Tipo 2 (795)
      { sku: "LOJA-349", priceBox: { xFrac: 0.8816, yFrac: 0.6542, widthFrac: 0.0759, heightFrac: 0.0166 } }, // Avant (796)
      { sku: "LOJA-350", priceBox: { xFrac: 0.3573, yFrac: 0.7479, widthFrac: 0.0759, heightFrac: 0.0166 } }, // Inspire (797)
    ],
    // Página 18 — "Mind Expert" (804, produto único): sem correspondência
    // no catálogo hoje, página fica intacta (sem entrada aqui).
    // Página 19 — "Maca Peruana" (0010) e "Eleva Day" (190): nenhum dos
    // dois tem correspondência confiável no catálogo hoje, página intacta.
    // Página 20 — +Saúde +Imunidade +Beleza (índice p.18). "Biotina
    // Mastigável" (360) não existe no catálogo hoje — fica de fora.
    20: [
      { sku: "LOJA-245", priceBox: { xFrac: 0.1966, yFrac: 0.6295, widthFrac: 0.1521, heightFrac: 0.0327 } }, // Zinco Max (366)
      { sku: "LOJA-363", priceBox: { xFrac: 0.1899, yFrac: 0.8818, widthFrac: 0.1479, heightFrac: 0.0386 } }, // Zinco em Gotas (946)
      { sku: "LOJA-246", priceBox: { xFrac: 0.6739, yFrac: 0.6259, widthFrac: 0.1521, heightFrac: 0.0327 } }, // Complexo B (367)
    ],
    // Página 21 — Curcu+Mais (228, produto único).
    21: [
      { sku: "LOJA-61", priceBox: { xFrac: 0.6, yFrac: 0.4567, widthFrac: 0.2058, heightFrac: 0.0166 } }, // Curcu+Mais (228) — caixa alargada p/ cobrir "R$"
    ],
    // Página 22 — Linha Vitaminas (índice p.20), 9 produtos retratados.
    // Código 107 (dropper amarelo "VitaDrops D3") e 1017 (pote "Vitamina
    // D8-MN7") não têm correspondência confiável/exclusiva no catálogo
    // hoje — ficam de fora (o SKU de Vitamina D3 puro já foi usado no
    // código 9, atribuí-lo de novo ao 107 seria um chute).
    22: [
      { sku: "LOJA-70", priceBox: { xFrac: 0.0711, yFrac: 0.7957, widthFrac: 0.0922, heightFrac: 0.0166 } }, // Imunic tabletes (46)
      { sku: "LOJA-125", priceBox: { xFrac: 0.2031, yFrac: 0.8554, widthFrac: 0.0917, heightFrac: 0.0173 } }, // Imunic gotas (286)
      { sku: "LOJA-87", priceBox: { xFrac: 0.3477, yFrac: 0.604, widthFrac: 0.0922, heightFrac: 0.017 } }, // Vitamina D3 Concentrado (9)
      { sku: "LOJA-85", priceBox: { xFrac: 0.4816, yFrac: 0.604, widthFrac: 0.0922, heightFrac: 0.017 } }, // Vitamina A Gotas (154)
      { sku: "LOJA-88", priceBox: { xFrac: 0.617, yFrac: 0.6037, widthFrac: 0.0917, heightFrac: 0.0173 } }, // Vitamina K2MK7 (155)
      { sku: "LOJA-86", priceBox: { xFrac: 0.5613, yFrac: 0.8554, widthFrac: 0.0917, heightFrac: 0.017 } }, // Vitamina B12 (156)
      { sku: "LOJA-365", priceBox: { xFrac: 0.7121, yFrac: 0.8551, widthFrac: 0.0759, heightFrac: 0.017 } }, // Vitamina B9 Gotas (948)
    ],
    // Página 23 — Linha Emagrecimento "Mais Leve" (índice p.21).
    23: [
      { sku: "LOJA-249", priceBox: { xFrac: 0.2151, yFrac: 0.6164, widthFrac: 0.0916, heightFrac: 0.0166 } }, // Mais Leve Comprimidos (370)
      { sku: "LOJA-250", priceBox: { xFrac: 0.6168, yFrac: 0.4662, widthFrac: 0.0916, heightFrac: 0.0166 } }, // Mais Leve Pó/Chá (371)
    ],
    // Página 24 — Natural Café / Ora Pro Nobis / Atlântica Detox / Cromo
    // CTRL (índice p.22). "Ora Pro Nobis" (364) não tem correspondência no
    // catálogo hoje — fica de fora.
    24: [
      { sku: "LOJA-50", priceBox: { xFrac: 0.4034, yFrac: 0.5059, widthFrac: 0.0951, heightFrac: 0.0173 } }, // Natural Café Fibras (188)
      { sku: "LOJA-578", priceBox: { xFrac: 0.6429, yFrac: 0.6283, widthFrac: 0.2361, heightFrac: 0.0499 } }, // Atlântica Detox + SB Chá (10407)
      { sku: "LOJA-373", priceBox: { xFrac: 0.7672, yFrac: 0.9329, widthFrac: 0.0756, heightFrac: 0.0166 } }, // Cromo CTRL 70mg (956)
    ],
    // Página 25 — Chá Verde / Slim Chá (índice p.23, fecha Emagrecimento).
    25: [
      { sku: "LOJA-53", priceBox: { xFrac: 0.1756, yFrac: 0.4768, widthFrac: 0.0958, heightFrac: 0.0172 } }, // Chá Verde com Gengibre (0003)
      { sku: "LOJA-82", priceBox: { xFrac: 0.7109, yFrac: 0.5321, widthFrac: 0.0756, heightFrac: 0.0166 } }, // Slim Chá SB (0001)
    ],
    // Página 26 — Linha Casa (índice p.24). "Multilimpador Ultra" (1213)
    // não existe no catálogo hoje — fica de fora. Caixas alargadas pra a
    // esquerda pra cobrir o prefixo "R$" impresso.
    26: [
      { sku: "LOJA-861", priceBox: { xFrac: 0.14, yFrac: 0.6858, widthFrac: 0.09, heightFrac: 0.0166 } }, // Amaciante Ultra (1211)
      { sku: "LOJA-864", priceBox: { xFrac: 0.3825, yFrac: 0.6858, widthFrac: 0.09, heightFrac: 0.0166 } }, // Lava-Louças Ultra (1214)
      { sku: "LOJA-862", priceBox: { xFrac: 0.613, yFrac: 0.6851, widthFrac: 0.09, heightFrac: 0.017 } }, // Lava-Roupas Ultra (1212)
    ],
    // Página 27 — Linha Casa, continuação (Home Sprays + Odorizador).
    27: [
      { sku: "LOJA-866", priceBox: { xFrac: 0.0756, yFrac: 0.8308, widthFrac: 0.1639, heightFrac: 0.0303 } }, // Home Spray Bamboo (1216)
      { sku: "LOJA-865", priceBox: { xFrac: 0.4034, yFrac: 0.8355, widthFrac: 0.1445, heightFrac: 0.0303 } }, // Odorizador ATL N°2 (1215)
      { sku: "LOJA-867", priceBox: { xFrac: 0.6765, yFrac: 0.8308, widthFrac: 0.1647, heightFrac: 0.0303 } }, // Home Spray Lavanda (1217)
    ],
    // Página 28 — Linha Academia, Shake (índice p.26). 6 sabores, mesmo
    // preço único impresso (uma só caixa) — mapeado nos 6 SKUs pro mesmo
    // priceBox (o overlay desenha 6x no mesmo lugar, resultado idêntico a
    // desenhar 1x já que o preço é o mesmo).
    28: [
      { sku: "LOJA-80", priceBox: { xFrac: 0.8361, yFrac: 0.3129, widthFrac: 0.1059, heightFrac: 0.0196 } }, // Shake Chocolate (07)
      { sku: "LOJA-81", priceBox: { xFrac: 0.8361, yFrac: 0.3129, widthFrac: 0.1059, heightFrac: 0.0196 } }, // Shake Morango (08)
      { sku: "LOJA-79", priceBox: { xFrac: 0.8361, yFrac: 0.3129, widthFrac: 0.1059, heightFrac: 0.0196 } }, // Shake Baunilha (019)
      { sku: "LOJA-306", priceBox: { xFrac: 0.8361, yFrac: 0.3129, widthFrac: 0.1059, heightFrac: 0.0196 } }, // Shake Cookies (665)
      { sku: "LOJA-307", priceBox: { xFrac: 0.8361, yFrac: 0.3129, widthFrac: 0.1059, heightFrac: 0.0196 } }, // Shake Pão de Mel (666)
      { sku: "LOJA-308", priceBox: { xFrac: 0.8361, yFrac: 0.3129, widthFrac: 0.1059, heightFrac: 0.0196 } }, // Shake Vitamina de Frutas (667)
    ],
    // Página 29 — Linha Academia, continuação (índice p.27). "Creatina
    // Monohidratada" em pó (180, caixa de preço vazia na arte original) e
    // os 3 potes cilíndricos de creatina (957/958/1225, preço 159,80
    // compartilhado) não têm correspondência confiável no catálogo hoje —
    // só existem versões mastigáveis, formato diferente do retratado.
    29: [
      { sku: "LOJA-77", priceBox: { xFrac: 0.2807, yFrac: 0.2898, widthFrac: 0.1403, heightFrac: 0.0362 } }, // Picolinato de Cromo (183)
      { sku: "LOJA-74", priceBox: { xFrac: 0.7353, yFrac: 0.2815, widthFrac: 0.1403, heightFrac: 0.0362 } }, // Moro Treiny (186)
      { sku: "LOJA-89", priceBox: { xFrac: 0.4924, yFrac: 0.3913, widthFrac: 0.1269, heightFrac: 0.0321 } }, // ZMA (181)
      { sku: "LOJA-48", priceBox: { xFrac: 0.1168, yFrac: 0.3979, widthFrac: 0.1403, heightFrac: 0.0356 } }, // BCAA 2:1:1 (182)
      { sku: "LOJA-51", priceBox: { xFrac: 0.8008, yFrac: 0.4371, widthFrac: 0.1471, heightFrac: 0.0374 } }, // Café Pré-Treino (185)
      { sku: "LOJA-877", priceBox: { xFrac: 0.0933, yFrac: 0.6158, widthFrac: 0.0941, heightFrac: 0.0232 } }, // Glutamina em Pó (1227)
      { sku: "LOJA-868", priceBox: { xFrac: 0.2689, yFrac: 0.6158, widthFrac: 0.0941, heightFrac: 0.0232 } }, // ATL Natural Pré-Treino (1218)
    ],
    // Página 30 — Thermo Heat / Focuss (índice p.28, fecha Academia).
    30: [
      { sku: "LOJA-83", priceBox: { xFrac: 0.6555, yFrac: 0.1912, widthFrac: 0.1235, heightFrac: 0.0321 } }, // Thermo Heat (0002)
      { sku: "LOJA-66", priceBox: { xFrac: 0.2647, yFrac: 0.4299, widthFrac: 0.1227, heightFrac: 0.0321 } }, // Focuss Energia (0008)
    ],
    // Página 31 — Linha Imunidade, gotas (índice p.29).
    31: [
      { sku: "LOJA-356", priceBox: { xFrac: 0.1513, yFrac: 0.9483, widthFrac: 0.0866, heightFrac: 0.019 } }, // Ferro Gotas (803)
      { sku: "LOJA-367", priceBox: { xFrac: 0.3664, yFrac: 0.9483, widthFrac: 0.0866, heightFrac: 0.0196 } }, // Castanha da Índia (950)
      { sku: "LOJA-369", priceBox: { xFrac: 0.5832, yFrac: 0.9483, widthFrac: 0.0866, heightFrac: 0.0196 } }, // Unha de Gato (952)
      { sku: "LOJA-368", priceBox: { xFrac: 0.7866, yFrac: 0.9483, widthFrac: 0.0874, heightFrac: 0.0196 } }, // Centella Asiática (951)
    ],
    // Página 32 — Imunidade, cápsulas (índice p.30). "Cart Control" (006,
    // sem caixa de preço própria na arte), "Natucap" (375) e "Chlorella"
    // (189) não têm correspondência confiável no catálogo hoje.
    32: [
      { sku: "LOJA-355", priceBox: { xFrac: 0.1028, yFrac: 0.5738, widthFrac: 0.0869, heightFrac: 0.0197 } }, // Amargo (802)
      { sku: "LOJA-76", priceBox: { xFrac: 0.3832, yFrac: 0.5148, widthFrac: 0.0922, heightFrac: 0.017 } }, // Omega 3 Óleo de Peixe (0011)
      { sku: "LOJA-56", priceBox: { xFrac: 0.2478, yFrac: 0.9437, widthFrac: 0.1056, heightFrac: 0.0227 } }, // Coenzima Q10 (187)
      { sku: "LOJA-252", priceBox: { xFrac: 0.4126, yFrac: 0.9567, widthFrac: 0.1143, heightFrac: 0.038 } }, // NatuVitta (373)
    ],
    // Página 33 — Imuni Kids / Gummy Kids (índice p.31, fecha Imunidade).
    // "Gummy Kids" (361) não tem correspondência no catálogo hoje.
    33: [
      { sku: "LOJA-69", priceBox: { xFrac: 0.2782, yFrac: 0.4727, widthFrac: 0.1882, heightFrac: 0.054 } }, // Imuni Kids (191)
    ],
    // Página 34 — Dermo Natuoz (índice p.32).
    34: [
      { sku: "LOJA-17", priceBox: { xFrac: 0.0899, yFrac: 0.4947, widthFrac: 0.0756, heightFrac: 0.0166 } }, // Peeling de Cristal Ozonizado (204)
      { sku: "LOJA-14", priceBox: { xFrac: 0.3529, yFrac: 0.4703, widthFrac: 0.0756, heightFrac: 0.0166 } }, // Água Micelar Ozonizado (202)
      { sku: "LOJA-18", priceBox: { xFrac: 0.5403, yFrac: 0.5083, widthFrac: 0.0756, heightFrac: 0.0166 } }, // Sabonete Facial c/ Ácido Salicílico (203)
      { sku: "LOJA-15", priceBox: { xFrac: 0.7101, yFrac: 0.7025, widthFrac: 0.0756, heightFrac: 0.0166 } }, // Máscara Facial Argila Verde (201)
      { sku: "LOJA-16", priceBox: { xFrac: 0.0933, yFrac: 0.8884, widthFrac: 0.0756, heightFrac: 0.0172 } }, // Creme Hidratante Ozonizado (205)
    ],
    // Página 35 — Linha Dermo Clean (índice p.33). "Mousse de Limpeza
    // Facial" (550) não tem correspondência confiável no catálogo hoje.
    35: [
      { sku: "LOJA-260", priceBox: { xFrac: 0.4697, yFrac: 0.6372, widthFrac: 0.0765, heightFrac: 0.0166 } }, // Água Termal (555)
    ],
    // Página 36 — Sérum Facial (Hialurônico 554 / Colágeno 552 / Vitamina
    // C 551 / Niacinamida 553), fecha Linha Dermo (índice p.34). Nenhum
    // dos 4 sérums existe no catálogo sincronizado hoje — página intacta.
    // Página 37 — Qualidade de Vida, Beijo Bom / Menta Doce (índice p.35).
    // "Beijo Bom Menta" (706) usa o SKU genérico "spray bucal ozonizado"
    // (só variante sem sabor específico cadastrado no catálogo).
    37: [
      { sku: "LOJA-858", priceBox: { xFrac: 0.1345, yFrac: 0.2245, widthFrac: 0.0748, heightFrac: 0.0166 } }, // Beijo Bom Ice Extra Forte (1208)
      { sku: "LOJA-859", priceBox: { xFrac: 0.8387, yFrac: 0.2102, widthFrac: 0.0756, heightFrac: 0.0172 } }, // Beijo Bom Morango (1209)
      { sku: "LOJA-309", priceBox: { xFrac: 0.0588, yFrac: 0.8135, widthFrac: 0.0756, heightFrac: 0.0166 } }, // Beijo Bom Menta (706)
      { sku: "LOJA-354", priceBox: { xFrac: 0.5723, yFrac: 0.7292, widthFrac: 0.0756, heightFrac: 0.0137 } }, // Menta Doce Peppermint (801)
    ],
    // Página 38 — Melatonina (índice p.36). Só a versão "Gotas" (800)
    // existe no catálogo hoje — cápsula (143), gummy (363) e mastigável
    // (949) ficam de fora.
    38: [
      { sku: "LOJA-353", priceBox: { xFrac: 0.7857, yFrac: 0.4875, widthFrac: 0.0748, heightFrac: 0.0166 } }, // Gotas Melatonina (800)
    ],
    // Página 39 — Spray/Extrato de Própolis (índice p.37). "Spray de
    // Própolis Cravo e Canela" (953, lançamento) não tem correspondência
    // no catálogo hoje.
    39: [
      { sku: "LOJA-244", priceBox: { xFrac: 0.6672, yFrac: 0.4578, widthFrac: 0.0916, heightFrac: 0.0166 } }, // Extrato de Própolis Verde em Gotas (365)
    ],
    // Página 40 — Wave Green / Espirulina / Geleia Real / Essencial Beauty
    // (índice p.38).
    40: [
      { sku: "LOJA-580", priceBox: { xFrac: 0.1034, yFrac: 0.5143, widthFrac: 0.0933, heightFrac: 0.0172 } }, // Wave Green em Pó (20100)
      { sku: "LOJA-581", priceBox: { xFrac: 0.3185, yFrac: 0.8705, widthFrac: 0.0916, heightFrac: 0.0166 } }, // Wave Green +C Cápsulas (20200)
      { sku: "LOJA-64", priceBox: { xFrac: 0.4891, yFrac: 0.5422, widthFrac: 0.0916, heightFrac: 0.0172 } }, // Espirulina Microalga (0035)
      { sku: "LOJA-67", priceBox: { xFrac: 0.6311, yFrac: 0.8783, widthFrac: 0.0916, heightFrac: 0.0172 } }, // Geleia Real (0021)
      { sku: "LOJA-49", priceBox: { xFrac: 0.7613, yFrac: 0.5422, widthFrac: 0.0916, heightFrac: 0.0166 } }, // Essencial Beauty (0015)
    ],
    // Página 41 — L-Triptofano / Atlântica Calm+ / Night Chá (índice p.39).
    41: [
      { sku: "LOJA-84", priceBox: { xFrac: 0.1513, yFrac: 0.5309, widthFrac: 0.0916, heightFrac: 0.0166 } }, // L-Triptofano (106)
      { sku: "LOJA-589", priceBox: { xFrac: 0.3882, yFrac: 0.5564, widthFrac: 0.0916, heightFrac: 0.0166 } }, // Atlântica Calm+ (101022)
      { sku: "LOJA-75", priceBox: { xFrac: 0.758, yFrac: 0.4424, widthFrac: 0.0916, heightFrac: 0.0172 } }, // Night Chá (04)
    ],
    // Página 42 — Linha Colágeno (índice p.40). Nenhum dos 2 produtos
    // (Colágeno Sub 30 / Colágeno Ácido Hialurônico) existe no catálogo
    // sincronizado hoje — página intacta.
    // Página 43 — Aloe Vera / Vital Life (índice p.41). O frasco líquido
    // "Aloe Vera" 500ml (374) não tem SKU distinto no catálogo — só existe
    // a versão "Gotas" concentrada (LOJA-90), já usada no 3º produto (260).
    43: [
      { sku: "LOJA-251", priceBox: { xFrac: 0.53, yFrac: 0.5059, widthFrac: 0.1288, heightFrac: 0.016 } }, // Vital Life (372) — caixa alargada p/ cobrir o prefixo "R$"
      { sku: "LOJA-90", priceBox: { xFrac: 0.7445, yFrac: 0.56, widthFrac: 0.0916, heightFrac: 0.0172 } }, // Aloe Vera Gotas (260)
    ],
    // Página 44 — ATLVision (índice p.42, produto único).
    44: [
      { sku: "LOJA-248", priceBox: { xFrac: 0.33, yFrac: 0.6122, widthFrac: 0.1316, heightFrac: 0.0172 } }, // ATLVision (369) — caixa alargada p/ cobrir o prefixo "R$"
    ],
    // Página 45 — Lançamentos Wave (índice p.43). "Parazyme" (101028) não
    // tem correspondência no catálogo hoje.
    45: [
      { sku: "LOJA-588", priceBox: { xFrac: 0.1681, yFrac: 0.6194, widthFrac: 0.0933, heightFrac: 0.0172 } }, // Wave Dexa Plus (101020)
      { sku: "LOJA-582", priceBox: { xFrac: 0.5353, yFrac: 0.6205, widthFrac: 0.0916, heightFrac: 0.0172 } }, // Wave Saúde da Mulher (101027)
      { sku: "LOJA-583", priceBox: { xFrac: 0.7218, yFrac: 0.62, widthFrac: 0.0924, heightFrac: 0.0166 } }, // Wave Saúde e Vitalidade (101028)
    ],
    // Página 46 — Life Control (índice p.44, produto único, fecha
    // Qualidade de Vida). Caixa alargada p/ cobrir o prefixo "R$".
    46: [
      { sku: "LOJA-128", priceBox: { xFrac: 0.68, yFrac: 0.9068, widthFrac: 0.2351, heightFrac: 0.0214 } }, // Life Control (267)
    ],
    // Página 47 — Linha Bortoletto Fragrâncias (índice p.45): lista ~40
    // nomes de perfume (feminino/masculino) só em texto, sem foto/preço
    // individual — só o frasco "Bali" aparece de fato, com preço 15ml/
    // 100ml. Os demais ~39 nomes ficam sem detalhe (nunca inventar uma
    // página pra um perfume sem preço impresso pra ancorar). As tabelas
    // olfativas (masculina/feminina) entram automaticamente logo após
    // esta página via `fragrancePage`.
    //
    // buildPerfumeSections (generator.ts) funde as variantes 15ml+100ml
    // de uma mesma fragrância num único ProductSnapshotItem, indexado
    // pelo SKU da variante 100ml (preferida como "representante") — o SKU
    // da 15ml nunca aparece como chave no Map devolvido por
    // buildEnrichmentBySku. Por isso só o SKU 100ml é mapeável aqui; a
    // caixa de preço da 15ml permanece com o valor impresso original
    // (não é sobrescrita, mas também nunca fica errada/inventada).
    47: [
      { sku: "LOJA-899", priceBox: { xFrac: 0.565, yFrac: 0.8955, widthFrac: 0.1367, heightFrac: 0.0166 } }, // Fragrância Bali 100ml (funde com a 15ml LOJA-889 via nome normalizado) — caixa alargada p/ cobrir o prefixo "R$"
    ],
    // Página 48 — Material de Apoio, Pulseira Bioquântica Total Black
    // Fosco (0016, produto único, índice p.46). Não existe no catálogo
    // sincronizado hoje — página intacta.
    // Página 49 — Linha Nemawashi/Profit (índice p.47), 15 produtos. Sem
    // correspondência: "Summus Iluminador" (new_1006), "Summus Protetor
    // Solar Gel Extra Seco" (new_1014), "Nemawashi Whitter" (new_5030) e
    // o pote verde "Velvet" (new_5015 — só existe 1 SKU "Velvet
    // Esfoliante pés" no catálogo, já usado no tubo new_5013 cuja
    // descrição impressa bate mais precisamente).
    49: [
      { sku: "LOJA-810", priceBox: { xFrac: 0.1935, yFrac: 0.5694, widthFrac: 0.0975, heightFrac: 0.0183 } }, // Velvet Esfoliante pés (new_5013)
      { sku: "LOJA-825", priceBox: { xFrac: 0.4, yFrac: 0.5765, widthFrac: 0.0504, heightFrac: 0.0112 } }, // Trattapel Wash Gel (new_1009)
      { sku: "LOJA-793", priceBox: { xFrac: 0.5642, yFrac: 0.5765, widthFrac: 0.0504, heightFrac: 0.0112 } }, // Fair Hidratante Corporal (new_5017)
      { sku: "LOJA-833", priceBox: { xFrac: 0.7236, yFrac: 0.5769, widthFrac: 0.0504, heightFrac: 0.0112 } }, // Velvet Mãos e Rosto (new_1001)
      { sku: "LOJA-799", priceBox: { xFrac: 0.9128, yFrac: 0.5775, widthFrac: 0.0485, heightFrac: 0.0115 } }, // Nautilus Collagen Gel (new_5012)
      { sku: "LOJA-801", priceBox: { xFrac: 0.5585, yFrac: 0.7526, widthFrac: 0.0504, heightFrac: 0.0115 } }, // Summus Sabonete Esfoliante (new_1008)
      { sku: "LOJA-832", priceBox: { xFrac: 0.654, yFrac: 0.7533, widthFrac: 0.0547, heightFrac: 0.0098 } }, // Summus Área dos Olhos (new_1003)
      { sku: "LOJA-804", priceBox: { xFrac: 0.0777, yFrac: 0.8831, widthFrac: 0.0504, heightFrac: 0.011 } }, // Aloe Vera 98% (new_5021)
      { sku: "LOJA-791", priceBox: { xFrac: 0.2374, yFrac: 0.8828, widthFrac: 0.0504, heightFrac: 0.0116 } }, // Velvet Esfoliante Corporal (new_5018)
      { sku: "LOJA-797", priceBox: { xFrac: 0.5643, yFrac: 0.8709, widthFrac: 0.0504, heightFrac: 0.0113 } }, // Nautilus Detox Corporal (new_5010)
      { sku: "LOJA-827", priceBox: { xFrac: 0.9029, yFrac: 0.8816, widthFrac: 0.0504, heightFrac: 0.011 } }, // Summus Loção Adstringente (new_1005)
    ],
    // Página 50 — Linha Nemawashi/Profit, continuação (índice p.48).
    // "Atleta do Século Gel Creme" (new_5032), "Sabonete Íntimo Feminino"
    // (new_5005 — só existe a versão Ozonizada de outra linha, formato
    // diferente) e "Gaijin" (new_4001) não têm correspondência confiável.
    50: [
      { sku: "LOJA-818", priceBox: { xFrac: 0.2966, yFrac: 0.8753, widthFrac: 0.0697, heightFrac: 0.0154 } }, // Atleta do Século Loção Relaxante (new_5001)
      { sku: "LOJA-803", priceBox: { xFrac: 0.7109, yFrac: 0.8753, widthFrac: 0.0697, heightFrac: 0.0154 } }, // Velvet Absorvedor de Odores (new_5014)
    ],
    // Página 51 — Linha Nemawashi/Profit, fecha (índice p.49). "CollPower
    // Colágeno" (new_7034), "Shake Chocolate Belga" (new_7033 — só a
    // variante Morango 550g tem SKU próprio), "SupleHealth Vit C"
    // (new_7036/7098) e "Supleomega Ômega 3" (new_7002) não têm
    // correspondência confiável no catálogo hoje.
    51: [
      { sku: "LOJA-808", priceBox: { xFrac: 0.7538, yFrac: 0.4351, widthFrac: 0.0849, heightFrac: 0.0157 } }, // Shake Morango 550g (new_7038)
      { sku: "LOJA-836", priceBox: { xFrac: 0.3437, yFrac: 0.9038, widthFrac: 0.0706, heightFrac: 0.016 } }, // Suplebase Esmalte Base (new_6013)
      { sku: "LOJA-837", priceBox: { xFrac: 0.479, yFrac: 0.9038, widthFrac: 0.0857, heightFrac: 0.016 } }, // Suplenutri Cabelo e Unha (new_7001)
      { sku: "LOJA-828", priceBox: { xFrac: 0.6723, yFrac: 0.9038, widthFrac: 0.0849, heightFrac: 0.016 } }, // Cronic Complex (new_7036)
    ],
    // Página 52 — Óleos Essenciais (índice p.50). Topo (esq→dir): Alecrim
    // (307, sem correspondência no catálogo), Eucalipto (305), Menta
    // (247), Laranja Doce (243). Base: Gerânio (306), Limão Siciliano
    // (244), Lavanda (245), Melaleuca (246). Caixas alargadas pra a
    // esquerda pra cobrir o prefixo "R$" impresso (testado ao vivo: as
    // caixas originais, do tamanho exato do OCR do número, deixavam o "R$"
    // antigo visível ao lado do novo preço em 4 das 7 — "R$ R$142,98").
    52: [
      { sku: "LOJA-214", priceBox: { xFrac: 0.303, yFrac: 0.6142, widthFrac: 0.13, heightFrac: 0.0156 } }, // Eucalipto (305)
      { sku: "LOJA-42", priceBox: { xFrac: 0.5106, yFrac: 0.6138, widthFrac: 0.1727, heightFrac: 0.0163 } }, // Menta Piperita (247)
      { sku: "LOJA-38", priceBox: { xFrac: 0.7901, yFrac: 0.6145, widthFrac: 0.13, heightFrac: 0.0156 } }, // Laranja Doce (243)
      { sku: "LOJA-215", priceBox: { xFrac: 0.233, yFrac: 0.9491, widthFrac: 0.1305, heightFrac: 0.0156 } }, // Gerânio (306)
      { sku: "LOJA-40", priceBox: { xFrac: 0.4179, yFrac: 0.9488, widthFrac: 0.1305, heightFrac: 0.0156 } }, // Limão Siciliano (244)
      { sku: "LOJA-39", priceBox: { xFrac: 0.6009, yFrac: 0.9491, widthFrac: 0.13, heightFrac: 0.0156 } }, // Lavanda (245)
      { sku: "LOJA-41", priceBox: { xFrac: 0.7737, yFrac: 0.9491, widthFrac: 0.1305, heightFrac: 0.0159 } }, // Melaleuca (246)
    ],
    // Página 53 — DiaVitta / Óleo Semente de Abóbora (índice p.51, fecha
    // Óleos Essenciais). Caixas alargadas p/ cobrir o prefixo "R$".
    53: [
      { sku: "LOJA-878", priceBox: { xFrac: 0.13, yFrac: 0.905, widthFrac: 0.15, heightFrac: 0.0154 } }, // DiaVitta (1228)
      { sku: "LOJA-876", priceBox: { xFrac: 0.76, yFrac: 0.899, widthFrac: 0.15, heightFrac: 0.0154 } }, // Óleo Semente de Abóbora (1226)
    ],
    // Página 54 — Antiox (índice p.52, produto único, última página de
    // conteúdo). Caixa alargada p/ cobrir o prefixo "R$".
    54: [
      { sku: "LOJA-879", priceBox: { xFrac: 0.22, yFrac: 0.8925, widthFrac: 0.19, heightFrac: 0.0321 } }, // Antiox em Gotas (1229)
    ],
  },
};
