import { createClient } from "@libsql/client";
import { generateIPHash } from "./hash";

const id = Number(Bun.argv[2]);
if (!Number.isSafeInteger(id) || id < 1) {
  throw new Error("Usage: bun run utils/find_ip_logs.ts <log-row-id>");
}

const databaseUrl = Bun.env.TURSO_DATABASE_URL;
const keyHex = Bun.env.KEY32_HEX;
const keyVersion = Bun.env.IP_ENCRYPTION_KEY_VERSION;

if (!databaseUrl) throw new Error("TURSO_DATABASE_URL is missing.");
if (!keyHex || !/^[0-9a-fA-F]{64}$/.test(keyHex)) {
  throw new Error("KEY32_HEX must be a 64-character hex key.");
}
if (!keyVersion) throw new Error("IP_ENCRYPTION_KEY_VERSION is missing.");

const db = createClient({
  url: databaseUrl,
  authToken: Bun.env.TURSO_AUTH_TOKEN,
});

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

try {
  const selected = await db.execute({
    sql: `SELECT client_ip_nonce, client_ip_ciphertext, encryption_key_version
          FROM m2131_logs WHERE id = ?`,
    args: [id],
  });

  const source = selected.rows[0];
  if (!source) throw new Error(`No log row found with id ${id}.`);
  if (source.encryption_key_version !== keyVersion) {
    throw new Error(
      `Row uses key version ${String(source.encryption_key_version)}; ` +
      `configured key version is ${keyVersion}.`,
    );
  }
  if (
    typeof source.client_ip_nonce !== "string" ||
    typeof source.client_ip_ciphertext !== "string"
  ) {
    throw new Error("That row does not contain an encrypted IP.");
  }

  const keyBytes = Uint8Array.from(
    keyHex.match(/.{2}/g)!,
    (pair) => Number.parseInt(pair, 16),
  );
  const aesKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(source.client_ip_nonce) },
    aesKey,
    fromBase64(source.client_ip_ciphertext),
  );

  const ip = new TextDecoder().decode(plaintext);
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