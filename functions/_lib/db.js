import { neon } from "@neondatabase/serverless";

/**
 * Get a Neon SQL query function from the environment.
 * Expects env.DATABASE_URL to be set.
 */
export const getDb = (env) => {
  const url = env?.DATABASE_URL;

  if (!url) {
    throw new Error("La base de données n'est pas configurée (DATABASE_URL manquant).");
  }

  return neon(url);
};
