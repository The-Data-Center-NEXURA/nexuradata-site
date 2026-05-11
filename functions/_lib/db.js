import { neon } from "@neondatabase/serverless";

/**
 * Get a SQL query function from the environment.
 * Supports Supabase/Postgres URLs via:
 * - env.DATABASE_URL
 * - env.SUPABASE_DATABASE_URL
 * - env.SUPABASE_DB_URL
 */
export const getDb = (env) => {
  const url = env?.DATABASE_URL || env?.SUPABASE_DATABASE_URL || env?.SUPABASE_DB_URL;

  if (!url) {
    throw new Error("La base de données n'est pas configurée (DATABASE_URL/SUPABASE_DATABASE_URL manquant).");
  }

  return neon(url);
};
