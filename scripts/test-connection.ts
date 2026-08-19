import { config } from "dotenv";
config({ path: ".env.local" });

console.log("DATABASE_URL loaded:", process.env.DATABASE_URL ? "YES" : "NO — this is the problem");
if (process.env.DATABASE_URL) {
  const masked = process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@");
  console.log("Value (password masked):", masked);
}

import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });
  try {
    const result = await sql`select now()`;
    console.log("✅ Connected successfully! Server time:", result[0].now);
  } catch (err) {
    console.log("❌ Connection failed:", err instanceof Error ? err.message : err);
  } finally {
    await sql.end();
  }
}

main();