#!/usr/bin/env node
// scripts/backfill-blind-pii.mjs
//
// Populate the *_enc / *_blind columns added by migrations/neon/0005_blind_pii.sql
// for every row that still has the original plaintext but no ciphertext yet.
//
// Idempotent: re-running only touches rows where `<col>_enc = ''` AND the
// plaintext column is non-empty. Safe to re-run after partial failures.
//
// Required env (export before invoking — never hard-code):
//   DATABASE_URL      — Neon connection string (use a Neon BRANCH first).
//   NEON_FIELD_KEY    — base64 32-byte AES-256-GCM key.
//   NEON_BLIND_KEY    — base64 32-byte HMAC-SHA256 key.
//
// Usage:
//   node scripts/backfill-blind-pii.mjs                # dry-run (default)
//   node scripts/backfill-blind-pii.mjs --apply        # actually write
//   node scripts/backfill-blind-pii.mjs --apply --batch=200
//
// Tested against Node ≥ 20 (uses webcrypto via node:crypto).

import { neon } from "@neondatabase/serverless";
import { webcrypto } from "node:crypto";

if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto;
}

const {
  blindIndex,
  encryptField
} = await import("../functions/_lib/neon-blinder.js");

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const batchArg = [...args].find((a) => a.startsWith("--batch="));
const BATCH = batchArg ? Math.max(50, Math.min(1000, Number(batchArg.split("=")[1]) || 250)) : 250;

const required = ["DATABASE_URL", "NEON_FIELD_KEY", "NEON_BLIND_KEY"];
for (const name of required) {
  if (!process.env[name]) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
}

const env = {
  NEON_FIELD_KEY: process.env.NEON_FIELD_KEY,
  NEON_BLIND_KEY: process.env.NEON_BLIND_KEY
};

const sql = neon(process.env.DATABASE_URL);

// (table, [{ source, encCol, blindCol, normalize? }], pkCol)
const PLAN = [
  {
    table: "cases",
    pk: "case_id",
    fields: [
      { source: "email", encCol: "email_enc", blindCol: "email_blind" },
      { source: "phone", encCol: "phone_enc", blindCol: "phone_blind" },
      { source: "name",  encCol: "name_enc",  blindCol: "name_blind"  }
    ]
  },
  {
    table: "clients",
    pk: "id",
    fields: [
      { source: "email", encCol: "email_enc", blindCol: "email_blind" },
      { source: "phone", encCol: "phone_enc", blindCol: "phone_blind" },
      { source: "name",  encCol: "name_enc",  blindCol: "name_blind"  }
    ]
  },
  {
    table: "remotefix_consents",
    pk: "id",
    fields: [
      { source: "client_email", encCol: "client_email_enc", blindCol: "client_email_blind" }
    ]
  }
];

const log = (msg) => console.log(`[${apply ? "APPLY" : "DRY"}] ${msg}`);

let totalUpdated = 0;
let totalSkipped = 0;

for (const { table, pk, fields } of PLAN) {
  log(`▶ ${table}: scanning…`);

  // Build a WHERE clause that picks rows missing at least one *_enc but
  // having the corresponding plaintext.
  const conditions = fields
    .map((f) => `(${f.encCol} = '' AND ${f.source} <> '')`)
    .join(" OR ");

  let processed = 0;
  let cursor = "";
  for (;;) {
    // Column/table identifiers come from a static PLAN (never user input).
    // Only the cursor value is user-derived, so it travels via $1.
    const cursorClause = cursor ? `AND ${pk} > $1` : "";
    const params = cursor ? [cursor] : [];
    const query = `
      SELECT ${pk}, ${fields.map((f) => `${f.source}, ${f.encCol}`).join(", ")}
      FROM ${table}
      WHERE (${conditions}) ${cursorClause}
      ORDER BY ${pk} ASC
      LIMIT ${BATCH}
    `;
    // eslint-disable-next-line no-await-in-loop
    const rows = await sql.query(query, params);
    if (rows.length === 0) break;

    for (const row of rows) {
      const updates = [];
      const values = [];
      for (const f of fields) {
        const plaintext = row[f.source];
        const already = row[f.encCol];
        if (!plaintext || already) continue;
        // eslint-disable-next-line no-await-in-loop
        const cipher = await encryptField(plaintext, env);
        // eslint-disable-next-line no-await-in-loop
        const blind = await blindIndex(plaintext, env);
        updates.push(`${f.encCol} = $${values.length + 1}`);
        values.push(cipher);
        updates.push(`${f.blindCol} = $${values.length + 1}`);
        values.push(blind);
      }
      if (updates.length === 0) {
        totalSkipped += 1;
        continue;
      }
      if (apply) {
        values.push(row[pk]);
        // eslint-disable-next-line no-await-in-loop
        await sql.query(
          `UPDATE ${table} SET ${updates.join(", ")} WHERE ${pk} = $${values.length}`,
          values
        );
      }
      totalUpdated += 1;
    }

    processed += rows.length;
    cursor = rows[rows.length - 1][pk];
    log(`  ${table}: processed ${processed} (cursor=${cursor})`);
    if (rows.length < BATCH) break;
  }
}

log(`done — updated=${totalUpdated} skipped-already-done=${totalSkipped}`);
if (!apply) {
  console.log("\nDry-run only. Re-run with --apply to write the changes.");
}
