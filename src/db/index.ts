import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __tnpPgClient: ReturnType<typeof postgres> | undefined;
}

// ---------------------------------------------------------------------------
// Rule 3: Connection Pooling
// ---------------------------------------------------------------------------
// On Vercel (serverless), every function invocation can open a new long-lived
// Postgres connection, quickly hitting Neon's concurrent-connection limit
// under even moderate traffic.
//
// Solution: use the POOLED connection string that Neon provides, which routes
// through PgBouncer and multiplexes thousands of app connections down to a
// small pool of real DB connections.
//
// How to set this up (one-time):
//   1. Neon dashboard → your project → Connection Details
//   2. Enable "Connection pooling" → copy the pooled connection string
//   3. In Vercel → Settings → Environment Variables, add:
//        NEON_DATABASE_URL = <pooled connection string>
//   4. Also keep DATABASE_URL = <direct connection string> for local dev /
//      migrations (pooled connections don't support DDL statements like
//      `ALTER TABLE` which Drizzle uses for migrations).
//
// If NEON_DATABASE_URL is not set, we fall through to DATABASE_URL so local
// dev and self-hosted deployments continue to work without changes.
// ---------------------------------------------------------------------------
const isServerless = Boolean(process.env.VERCEL);

const connectionString =
  (isServerless ? process.env.NEON_DATABASE_URL : null) ??
  process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "[db] DATABASE_URL is not set. Set it in .env.local before running the app for real."
  );
}

const client =
  global.__tnpPgClient ??
  postgres(connectionString ?? "postgres://placeholder:placeholder@localhost:5432/placeholder", {
    // Serverless: keep connections short-lived — PgBouncer handles pooling.
    // Local dev: allow up to 10 concurrent connections.
    max: isServerless ? 1 : 10,
    // Idle connections on serverless waste resources; close them fast.
    idle_timeout: isServerless ? 20 : undefined,
    // Hard max lifetime to avoid stale connection issues across deploys.
    max_lifetime: isServerless ? 60 * 30 : undefined,
    onnotice: () => {},
  });

if (process.env.NODE_ENV !== "production") {
  global.__tnpPgClient = client;
}

export const db = drizzle(client, { schema });
