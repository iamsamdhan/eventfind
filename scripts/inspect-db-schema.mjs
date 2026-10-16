import { PrismaClient } from "@prisma/client";

try {
  process.loadEnvFile();
} catch {}

const prisma = new PrismaClient();

async function inspectSchema() {
  console.log("=== EventFind Database Schema Inspection ===");

  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  console.log("\nTables in public schema:");
  console.log(tables.map((t) => t.table_name).join(", "));

  const constraints = await prisma.$queryRaw`
    SELECT c.conname, c.contype, cl.relname 
    FROM pg_constraint c 
    JOIN pg_class cl ON cl.oid = c.conrelid 
    JOIN pg_namespace n ON n.oid = cl.relnamespace 
    WHERE n.nspname = 'public' 
    ORDER BY cl.relname, c.conname;
  `;

  console.log("\nConstraints:");
  for (const c of constraints) {
    const type =
      c.contype === "p"
        ? "PRIMARY KEY"
        : c.contype === "u"
        ? "UNIQUE"
        : c.contype === "f"
        ? "FOREIGN KEY"
        : c.contype;
    console.log(` - [${c.relname}] ${c.conname} (${type})`);
  }

  const indexes = await prisma.$queryRaw`
    SELECT tablename, indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    ORDER BY tablename, indexname;
  `;

  console.log("\nIndexes:");
  for (const idx of indexes) {
    console.log(` - [${idx.tablename}] ${idx.indexname}`);
  }
}

inspectSchema()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
