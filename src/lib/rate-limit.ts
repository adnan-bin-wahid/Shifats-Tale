import "server-only";
import { createAdminClient } from "./supabase/admin";
import { headers } from "next/headers";

export class RateLimitError extends Error {
  constructor(message = "Too many requests. Please try again later.") {
    super(message);
    this.name = "RateLimitError";
  }
}

export class RateLimitUnavailableError extends Error {
  constructor(message = "Rate limiting is temporarily unavailable.") {
    super(message);
    this.name = "RateLimitUnavailableError";
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

/**
 * Consumes a rate-limit token atomically in PostgreSQL.
 *
 * The database function uses one INSERT .. ON CONFLICT statement, so concurrent
 * requests cannot bypass the limit through a read-then-write race. Database
 * failures are fail-closed and surfaced separately from a genuine limit hit.
 */
export async function rateLimit(key: string, limit: number, durationSeconds: number) {
  const admin = createAdminClient();
  const { data: allowed, error } = await admin.rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_duration_seconds: durationSeconds,
  });

  if (error) {
    console.error("Rate limiting execution error:", error.message);
    throw new RateLimitUnavailableError();
  }

  if (!allowed) {
    throw new RateLimitError();
  }
}
