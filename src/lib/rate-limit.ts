if (process.env.NODE_ENV !== "test" && !process.env.NODE_TEST_CONTEXT) {
  require("server-only");
}
import { createAdminClient } from "./supabase/admin";
import { headers } from "next/headers";

export class RateLimitError extends Error {
  constructor(message = "Too many requests. Please try again later.") {
    super(message);
    this.name = "RateLimitError";
  }
}

export async function getClientIp(): Promise<string> {
  const reqHeaders = await headers();
  const cfIp = reqHeaders.get("cf-connecting-ip");
  if (cfIp) return cfIp;
  const forwardedFor = reqHeaders.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return "127.0.0.1";
}

export async function rateLimit(key: string, limit: number, durationSeconds: number) {
  const admin = createAdminClient();
  const now = new Date();
  
  try {
    // 1. Periodic cleanup of expired entries
    await admin
      .from("rate_limits")
      .delete()
      .lt("expires_at", now.toISOString());

    // 2. Query target key
    const { data: record, error: selectError } = await admin
      .from("rate_limits")
      .select("*")
      .eq("key", key)
      .maybeSingle();

    if (selectError) {
      console.error("Rate limiter fetch failure:", selectError);
      return; // Fail-open on DB connection issues to avoid locking out legitimate users
    }

    if (!record) {
      const expiresAt = new Date(now.getTime() + durationSeconds * 1000).toISOString();
      await admin.from("rate_limits").insert({
        key,
        hits: 1,
        expires_at: expiresAt,
      });
    } else {
      if (record.hits >= limit) {
        throw new RateLimitError();
      }
      await admin
        .from("rate_limits")
        .update({ hits: record.hits + 1 })
        .eq("key", key);
    }
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    console.error("Rate limiting execution error:", err);
  }
}
