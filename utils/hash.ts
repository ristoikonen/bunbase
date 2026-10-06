import { z } from "zod";
import { createClient } from "@libsql/client";

const db = createClient({
    url: Bun.env.TURSO_DATABASE_URL || "file:local.db",
    authToken: Bun.env.TURSO_AUTH_TOKEN,
});

const MAX_FREE_PROMPTS = 3;

const ipSchema = z.string().min(1, "IP cannot be empty");


export async function generateIPHash(ip: string): Promise<string> {
  const pepper = Bun.env.OPENSSL_HEX_SECRET_PEPPER;
  
  if (!pepper) {
    throw new Error("CRITICAL: OPENSSL_HEX_SECRET_PEPPER is missing from environment variables!");
  }

  const rawData = `${ip}:${pepper}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(rawData);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  return `anon_${hashHex.substring(0, 24)}`;
}


/**
 * Validates the visitor IP, hashes it, and checks/updates usage limits in Turso.
 */
export async function checkAndIncrementUsageOld(ipInput: unknown): Promise<{ allowed: boolean; remaining: number }> {
  // 1. Validate raw input with Zod
  const ip = ipSchema.parse(ipInput);

  // 2. Hash the IP using Bun's native crypto capabilities
  const visitorHash = await generateIPHash(ip);

  const now = new Date();

  // 3. Query Turso database using libsql client
  const result = await db.execute({
    sql: "SELECT prompt_count, reset_at FROM visitor_usage WHERE visitor_hash = ?",
    args: [visitorHash],
  });

  let record = result.rows[0] as { prompt_count: number; reset_at: string } | undefined;

  if (!record || now > new Date(record.reset_at)) {
    const resetTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    await db.execute({
      sql: `INSERT OR REPLACE INTO visitor_usage (visitor_hash, prompt_count, reset_at) VALUES (?, 1, ?)`,
      args: [visitorHash, resetTime],
    });
    return { allowed: true, remaining: MAX_FREE_PROMPTS - 1 };
  }

  if (record.prompt_count >= MAX_FREE_PROMPTS) {
    return { allowed: false, remaining: 0 };
  }

  const newCount = record.prompt_count + 1;
  await db.execute({
    sql: `UPDATE visitor_usage SET prompt_count = ? WHERE visitor_hash = ?`,
    args: [newCount, visitorHash],
  });

  return { allowed: true, remaining: MAX_FREE_PROMPTS - newCount };
}