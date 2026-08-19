import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __tnpPgClient: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // We deliberately don't throw at import time in dev/build so that
  // `next build` can succeed before you've wired up a real database.
  // Any actual query will fail loudly and clearly instead.
  console.warn(
    "[db] DATABASE_URL is not set. Set it in .env.local before running the app for real."
  );
}

const client =
  global.__tnpPgClient ??
  postgres(connectionString ?? "postgres://placeholder:placeholder@localhost:5432/placeholder", {
    max: 10,
    onnotice: () => {},
  });

if (process.env.NODE_ENV !== "production") {
  global.__tnpPgClient = client;
}

export const db = drizzle(client, { schema });
