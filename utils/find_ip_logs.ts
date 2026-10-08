import { createClient } from "@libsql/client";
import { decryptIP, generateIPHash } from "./hash";

const id = Number(Bun.argv[2]);
if (!Number.isSafeInteger(id) || id < 1) {
  throw new Error("Usage: bun run utils/find_ip_logs.ts <log-row-id>");
}

const databaseUrl = Bun.env.TURSO_DATABASE_URL;

if (!databaseUrl) throw new Error("TURSO_DATABASE_URL is missing.");

const db = createClient({
  url: databaseUrl,
  authToken: Bun.env.TURSO_AUTH_TOKEN,
});

try {
  const selected = await db.execute({
    sql: `SELECT client_ip_nonce, client_ip_ciphertext, encryption_key_version
          FROM m2131_logs WHERE id = ?`,
    args: [id],
  });

  const source = selected.rows[0];
  if (!source) throw new Error(`No log row found with id ${id}.`);
  if (
    typeof source.client_ip_nonce !== "string" ||
    typeof source.client_ip_ciphertext !== "string" ||
    typeof source.encryption_key_version !== "string"
  ) {
    throw new Error("That row does not contain an encrypted IP.");
  }

  const ip = await decryptIP(
    source.client_ip_nonce,
    source.client_ip_ciphertext,
    source.encryption_key_version,
  );

  const ipHash = await generateIPHash(ip);

  console.log(`client_ip_hash: ${ipHash}`);

  const matches = await db.execute({
    sql: `SELECT id, timestamp, method, path, status_code, duration_ms
          FROM m2131_logs
          WHERE client_ip_hash = ?
          ORDER BY timestamp DESC`,
    args: [ipHash],
  });

  console.table(matches.rows.map((row) => ({ ...row, client_ip: ip })));
} finally {
  await db.close();
}