import { createClient } from "@libsql/client";

const id = Number(Bun.argv[2]);
if (!Number.isSafeInteger(id) || id < 1) {
  throw new Error("Usage: bun run decrypt_ip.ts <log-row-id>");
}

const keyHex = Bun.env.KEY32_HEX;
const keyVersion = Bun.env.IP_ENCRYPTION_KEY_VERSION;
if (!keyHex || !/^[0-9a-fA-F]{64}$/.test(keyHex)) {
  throw new Error("KEY32_HEX must be a 64-character hex key.");
}
if (!keyVersion) throw new Error("IP_ENCRYPTION_KEY_VERSION is missing.");

const db = createClient({
  url: Bun.env.TURSO_DATABASE_URL!,
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
  if (row.encryption_key_version !== keyVersion) {
    throw new Error(`Row uses key version ${row.encryption_key_version}; current key is ${keyVersion}.`);
  }
  if (typeof row.client_ip_nonce !== "string" ||
      typeof row.client_ip_ciphertext !== "string") {
    throw new Error("This row has no encrypted IP.");
  }

  const fromBase64 = (value: string) =>
    Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  const keyBytes = Uint8Array.from(
    keyHex.match(/.{2}/g)!,
    (pair) => Number.parseInt(pair, 16),
  );
  const key = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"],
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(row.client_ip_nonce) },
    key,
    fromBase64(row.client_ip_ciphertext),
  );

  console.log(new TextDecoder().decode(plaintext));
} finally {
  await db.close();
}