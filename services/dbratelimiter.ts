//import type { BunRequest } from "bun";
import { z } from "zod";
import { createClient } from "@libsql/client";

const db = createClient({
    url: Bun.env.TURSO_DATABASE_URL || "file:local.db",
    authToken: Bun.env.TURSO_AUTH_TOKEN,
});

const MAX_FREE_PROMPTS = 30;

// Define Zod schema for the visitor hash input
const visitorHashSchema = z.string().min(1, "Visitor hash cannot be empty");

export async function checkAndIncrementUsage(visitorHash: unknown): Promise<{ allowed: boolean; remaining: number }> {
  // Validate input using Zod
  const parsedHash = visitorHashSchema.parse(visitorHash);

  const now = new Date();

  const result = await db.execute({
    sql: "SELECT prompt_count, reset_at FROM visitor_usage WHERE visitor_hash = ?",
    args: [parsedHash],
  });

  let record = result.rows[0] as { prompt_count: number; reset_at: string } | undefined;

  if (!record || now > new Date(record.reset_at)) {
    const resetTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    await db.execute({
      sql: `INSERT OR REPLACE INTO visitor_usage (visitor_hash, prompt_count, reset_at) VALUES (?, 1, ?)`,
      args: [parsedHash, resetTime],
    });
    return { allowed: true, remaining: MAX_FREE_PROMPTS - 1 };
  }

  if (record.prompt_count >= MAX_FREE_PROMPTS) {
    return { allowed: false, remaining: 0 };
  }

  const newCount = record.prompt_count + 1;
  await db.execute({
    sql: `UPDATE visitor_usage SET prompt_count = ? WHERE visitor_hash = ?`,
    args: [newCount, parsedHash],
  });

  return { allowed: true, remaining: MAX_FREE_PROMPTS - newCount };
}