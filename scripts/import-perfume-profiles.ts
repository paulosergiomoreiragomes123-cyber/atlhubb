import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Transcrição literal das duas tabelas oficiais da Atlântica Natural
// (.claude/knowledge/tabela-olfativa-masculina.jpg, .../feminina.jpg),
// lidas e transcritas manualmente — não é OCR, não é gerado por IA.
// Este script roda UMA ÚNICA VEZ (upsert por nome+gênero); a revista nunca
// mais depende dessas imagens depois disso.

type MasculineEntry = {
  name: string;
  inspiredBy: string | null;
  olfactoryCategory: string;
  topNotes: string;
  heartNotes: string;
  baseNotes: string;
  occasion: string | null;
  ranking: string | null;
};

const MASCULINE: MasculineEntry[] = [
  // Amadeirados / Elegantes
  { name: "Zeus", inspiredBy: "Polo Green", olfactoryCategory: "Amadeirados/Elegantes", topNotes: "Hortelã, Bergamota, Limão", heartNotes: "Gerânio, Sálvia, Maçã Verde", baseNotes: "Patchouli, Vetiver, Almíscar, Musgo de Carvalho", occasion: null, ranking: null },
  { name: "The Boss", inspiredBy: "Boss Bottled", olfactoryCategory: "Amadeirados/Elegantes", topNotes: "Maçã, Bergamota, Ameixa", heartNotes: "Canela, Cravo, Gerânio", baseNotes: "Baunilha, Sândalo, Cedro, Vetiver", occasion: null, ranking: null },
  { name: "Black Privat", inspiredBy: "Armani Code", olfactoryCategory: "Amadeirados/Elegantes", topNotes: "Limão, Bergamota", heartNotes: "Azeitona, Flor de Oliveira, Guaiaco", baseNotes: "Fava Tonka, Couro, Tabaco", occasion: "Noite", ranking: "Top 3 mais marcante para a noite" },
  { name: "Advance", inspiredBy: "Creed Aventus", olfactoryCategory: "Amadeirados/Elegantes", topNotes: "Abacaxi, Bergamota, Maçã", heartNotes: "Bétula, Patchouli, Rosa", baseNotes: "Almíscar, Musgo de Carvalho, Âmbar Cinzento", occasion: null, ranking: null },
  { name: "Racing Car", inspiredBy: "Ferrari Black", olfactoryCategory: "Amadeirados/Elegantes", topNotes: "Maçã, Ameixa, Limão", heartNotes: "Canela, Cardamomo, Jasmim", baseNotes: "Baunilha, Cedro, Almíscar", occasion: null, ranking: null },
  { name: "Club For Men", inspiredBy: null, olfactoryCategory: "Amadeirados/Elegantes", topNotes: "Limão, Bergamota, Pimenta Rosa", heartNotes: "Lavanda, Gerânio, Noz-Moscada", baseNotes: "Patchouli, Vetiver, Âmbar", occasion: null, ranking: null },

  // Cítricos / Refrescantes
  { name: "Aqua For Men", inspiredBy: "Acqua Di Giò", olfactoryCategory: "Cítricos/Refrescantes", topNotes: "Bergamota, Limão, Laranja", heartNotes: "Jasmim, Alecrim, Frésia", baseNotes: "Almíscar, Patchouli, Cedro", occasion: "Dia", ranking: "Top 1 mais fresco para o dia" },
  { name: "Polo Club", inspiredBy: "Polo Blue", olfactoryCategory: "Cítricos/Refrescantes", topNotes: "Melão, Pepino, Mandarina", heartNotes: "Manjericão, Sálvia, Gerânio", baseNotes: "Camurça, Almíscar, Madeira", occasion: "Dia", ranking: "Top 2 mais fresco para o dia" },
  { name: "Ocean Elixir", inspiredBy: "Jean Paul Gaultier Elixir", olfactoryCategory: "Cítricos/Refrescantes", topNotes: "Hortelã, Bergamota", heartNotes: "Lavanda, Gerânio", baseNotes: "Baunilha, Fava Tonka", occasion: "Dia", ranking: "Top 3 mais fresco para o dia" },
  { name: "212 New York Men", inspiredBy: null, olfactoryCategory: "Cítricos/Refrescantes", topNotes: "Toranja, Bergamota, Especiarias", heartNotes: "Gengibre, Gardênia, Sálvia", baseNotes: "Sândalo, Incenso, Almíscar", occasion: "Dia", ranking: "Top 4 mais fresco para o dia" },
  { name: "521 Number Men", inspiredBy: null, olfactoryCategory: "Cítricos/Refrescantes", topNotes: "Limão, Bergamota, Cardamomo", heartNotes: "Lavanda, Violeta, Noz-Moscada", baseNotes: "Cedro, Âmbar, Almíscar", occasion: "Dia", ranking: "Top 5 mais fresco para o dia" },

  // Orientais / Sensuais
  { name: "Khalifa", inspiredBy: "Animale", olfactoryCategory: "Orientais/Sensuais", topNotes: "Limão, Lavanda, Bergamota", heartNotes: "Gerânio, Cravo, Noz-Moscada", baseNotes: "Couro, Patchouli, Musgo de Carvalho, Âmbar", occasion: "Noite", ranking: "Top 4 mais marcante para a noite" },
  { name: "Phamous", inspiredBy: "Phantom", olfactoryCategory: "Orientais/Sensuais", topNotes: "Limão, Lavanda", heartNotes: "Maçã, Defumado, Notas Metálicas", baseNotes: "Baunilha, Vetiver", occasion: null, ranking: null },
  { name: "Play Men", inspiredBy: "Bad Boy", olfactoryCategory: "Orientais/Sensuais", topNotes: "Pimenta Preta, Bergamota", heartNotes: "Sálvia, Cedro", baseNotes: "Fava Tonka, Cacau, Âmbar", occasion: null, ranking: null },
  { name: "Champion", inspiredBy: "Azzaro", olfactoryCategory: "Orientais/Sensuais", topNotes: "Limão, Bergamota", heartNotes: "Lavanda, Sálvia, Gerânio", baseNotes: "Musgo de Carvalho, Vetiver, Patchouli", occasion: null, ranking: null },
  { name: "Imortal Black", inspiredBy: "Invictus Black", olfactoryCategory: "Orientais/Sensuais", topNotes: "Toranja, Pimenta Rosa", heartNotes: "Louro, Hedione", baseNotes: "Guaiaco, Patchouli, Âmbar", occasion: "Noite", ranking: "Top 5 mais marcante para a noite" },

  // Doces / Marcantes
  { name: "Fortune", inspiredBy: "One Million", olfactoryCategory: "Doces/Marcantes", topNotes: "Toranja, Hortelã", heartNotes: "Canela, Rosa, Especiarias", baseNotes: "Couro, Âmbar, Patchouli", occasion: "Noite", ranking: "Top 2 mais marcante para a noite" },
  { name: "Rouge", inspiredBy: "Baccarat Rouge 540", olfactoryCategory: "Doces/Marcantes", topNotes: "Açafrão, Jasmim", heartNotes: "Âmbar", baseNotes: "Cedro, Resina", occasion: "Noite", ranking: "Top 1 mais marcante para a noite" },
  { name: "Dark Bloom", inspiredBy: "Bleu de Chanel", olfactoryCategory: "Doces/Marcantes", topNotes: "Limão, Hortelã, Pimenta Rosa", heartNotes: "Gengibre, Jasmim, Noz-Moscada", baseNotes: "Incenso, Madeira, Patchouli", occasion: null, ranking: null },
  { name: "Yes", inspiredBy: "Yves Saint Laurent Y", olfactoryCategory: "Doces/Marcantes", topNotes: "Maçã, Gengibre, Bergamota", heartNotes: "Gerânio, Sálvia, Bagas de Zimbro", baseNotes: "Âmbar Cinzento, Fava Tonka, Cedro", occasion: null, ranking: null },
  { name: "Indomável", inspiredBy: "Sauvage", olfactoryCategory: "Doces/Marcantes", topNotes: "Bergamota", heartNotes: "Pimenta de Sichuan, Lavanda, Anis", baseNotes: "Âmbar, Vetiver", occasion: null, ranking: null },
];

type FeminineEntry = {
  name: string;
  inspiredBy: string | null;
  olfactoryCategory: string;
  occasion: string | null;
  ranking: string | null;
};

const FEMININE: FeminineEntry[] = [
  // Doces / Gourmand
  { name: "Bee", inspiredBy: "Lattafa Atheeri", olfactoryCategory: "Doces/Gourmand", occasion: null, ranking: "Top 8 entre as mais doces" },
  { name: "521 Sexy's", inspiredBy: "212 Sexy", olfactoryCategory: "Doces/Gourmand", occasion: null, ranking: "Top 7 entre as mais doces" },
  { name: "Athena", inspiredBy: "Olympéa", olfactoryCategory: "Doces/Gourmand", occasion: "Noite", ranking: "Top 3 entre as mais doces" },
  { name: "Crazy Love", inspiredBy: "Chanel Nº 5", olfactoryCategory: "Doces/Gourmand", occasion: null, ranking: null },
  { name: "Fantastic", inspiredBy: "Fantasy", olfactoryCategory: "Doces/Gourmand", occasion: null, ranking: "Top 4 entre as mais doces" },
  { name: "God Woman", inspiredBy: "Good Girl", olfactoryCategory: "Doces/Gourmand", occasion: null, ranking: "Top 2 entre as mais doces" },
  { name: "Madeleine", inspiredBy: "Coco Mademoiselle", olfactoryCategory: "Doces/Gourmand", occasion: null, ranking: null },
  { name: "Loved", inspiredBy: "Delina", olfactoryCategory: "Doces/Gourmand", occasion: "Noite", ranking: "Top 6 entre as mais doces" },
  { name: "Bali", inspiredBy: "Sabah Al Ward", olfactoryCategory: "Doces/Gourmand", occasion: null, ranking: "Top 9 entre as mais doces" },

  // Florais
  { name: "Amore", inspiredBy: "J'adore", olfactoryCategory: "Florais", occasion: null, ranking: null },
  { name: "Cloes", inspiredBy: "Chloé", olfactoryCategory: "Florais", occasion: null, ranking: "Top 4 entre as mais frescas" },
  { name: "Idoll", inspiredBy: "Idôle", olfactoryCategory: "Florais", occasion: null, ranking: "Top 3 entre as mais frescas" },
  { name: "Many", inspiredBy: "My Way", olfactoryCategory: "Florais", occasion: null, ranking: "Top 5 entre as mais frescas" },
  { name: "Gabby", inspiredBy: "Gabriela Sabatini", olfactoryCategory: "Florais", occasion: null, ranking: null },
  { name: "Lind", inspiredBy: "L'Interdit", olfactoryCategory: "Florais", occasion: null, ranking: null },

  // Amadeirados
  { name: "Libert", inspiredBy: "Libre", olfactoryCategory: "Amadeirados", occasion: null, ranking: null },
  { name: "Angeli", inspiredBy: "Angel", olfactoryCategory: "Amadeirados", occasion: "Noite", ranking: "Top 5 entre as mais doces" },
  { name: "Euphorica", inspiredBy: "Euphoria", olfactoryCategory: "Amadeirados", occasion: null, ranking: null },
  { name: "Luxuria", inspiredBy: "La Nuit Trésor", olfactoryCategory: "Amadeirados", occasion: "Noite", ranking: null },
  { name: "Fama", inspiredBy: "Fame", olfactoryCategory: "Amadeirados", occasion: null, ranking: null },

  // Cítricos / Frescos
  { name: "Very Summer", inspiredBy: "Light Blue", olfactoryCategory: "Cítricos/Frescos", occasion: "Dia", ranking: "Top 1 entre as mais frescas" },
  { name: "521 Hera Vip", inspiredBy: "212 Vip", olfactoryCategory: "Cítricos/Frescos", occasion: null, ranking: null },
  { name: "Yaha", inspiredBy: "Yara", olfactoryCategory: "Cítricos/Frescos", occasion: null, ranking: "Top 2 entre as mais frescas" },
  { name: "Vênus", inspiredBy: "CH Women", olfactoryCategory: "Cítricos/Frescos", occasion: null, ranking: null },
  { name: "La Bella", inspiredBy: "La Vie Est Belle", olfactoryCategory: "Cítricos/Frescos", occasion: null, ranking: null },

  // Sem coluna própria na tabela — só aparecem nos rankings ("Doces intensos (noite)"/Top 9)
  { name: "Esplêndida", inspiredBy: "Scandal", olfactoryCategory: "Doces/Gourmand", occasion: "Noite", ranking: "Top 1 entre as mais doces" },
  { name: "521 Vip Rose Elixir", inspiredBy: null, olfactoryCategory: "Doces/Gourmand", occasion: "Noite", ranking: null },
];

async function main() {
  let count = 0;

  for (const entry of MASCULINE) {
    await prisma.perfumeProfile.upsert({
      where: { name_gender: { name: entry.name, gender: "MASCULINO" } },
      create: {
        name: entry.name,
        gender: "MASCULINO",
        inspiredBy: entry.inspiredBy,
        olfactoryCategory: entry.olfactoryCategory,
        topNotes: entry.topNotes,
        heartNotes: entry.heartNotes,
        baseNotes: entry.baseNotes,
        occasion: entry.occasion,
        ranking: entry.ranking,
        sourceImage: "tabela-olfativa-masculina.jpg",
      },
      update: {
        inspiredBy: entry.inspiredBy,
        olfactoryCategory: entry.olfactoryCategory,
        topNotes: entry.topNotes,
        heartNotes: entry.heartNotes,
        baseNotes: entry.baseNotes,
        occasion: entry.occasion,
        ranking: entry.ranking,
      },
    });
    count++;
  }

  for (const entry of FEMININE) {
    await prisma.perfumeProfile.upsert({
      where: { name_gender: { name: entry.name, gender: "FEMININO" } },
      create: {
        name: entry.name,
        gender: "FEMININO",
        inspiredBy: entry.inspiredBy,
        olfactoryCategory: entry.olfactoryCategory,
        topNotes: null,
        heartNotes: null,
        baseNotes: null,
        occasion: entry.occasion,
        ranking: entry.ranking,
        sourceImage: "tabela-olfativa-feminina.jpg",
      },
      update: {
        inspiredBy: entry.inspiredBy,
        olfactoryCategory: entry.olfactoryCategory,
        occasion: entry.occasion,
        ranking: entry.ranking,
      },
    });
    count++;
  }

  console.log(`Importados/atualizados ${count} perfis olfativos (${MASCULINE.length} masculinos, ${FEMININE.length} femininos).`);
}

main().finally(() => prisma.$disconnect());
