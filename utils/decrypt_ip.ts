import { createClient } from "@libsql/client";
import { decryptIP } from "./hash";

const id = Number(Bun.argv[2]);
if (!Number.isSafeInteger(id) || id < 1) {
  throw new Error("Usage: bun run decrypt_ip.ts <log-row-id>");
}

const databaseUrl = Bun.env.TURSO_DATABASE_URL;
if (!databaseUrl) throw new Error("TURSO_DATABASE_URL is missing.");
const db = createClient({
  url: databaseUrl,
  authToken: Bun.env.TURSO_AUTH_TOKEN,
});

try {
  const result = await db.execute({
    sql: `SELECT client_ip_nonce, client_ip_ciphertext, encryption_key_version
          FROM m2131_logs WHERE id = ?`,
    args: [id],
  });

  const row = result.rows[0];
  if (!row) throw new Error(`No log row found for id ${id}.`);
  if (typeof row.client_ip_nonce !== "string" ||
      typeof row.client_ip_ciphertext !== "string" ||
      typeof row.encryption_key_version !== "string") {
    throw new Error("This row has no encrypted IP.");
  }

  const ip = await decryptIP(
    row.client_ip_nonce,
    row.client_ip_ciphertext,
    row.encryption_key_version,
  );

  console.log(ip);
} finally {
  await db.close();
}