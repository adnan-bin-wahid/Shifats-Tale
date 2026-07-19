if (process.env.NODE_ENV !== "test" && !process.env.NODE_TEST_CONTEXT) {
  require("server-only");
}
import { createAdminClient } from "./supabase/admin";

/**
 * Traverses an object or value recursively and redacts values for keys containing sensitive substrings.
 */
function redactSecrets(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  try {
    const clone = JSON.parse(JSON.stringify(obj));
    const sensitiveKeys = [
      "password", "token", "secret", "key", "access_token", 
      "service_role", "private", "credential", "auth"
    ];

    const redact = (o: any) => {
      if (!o || typeof o !== "object") return;
      for (const k in o) {
        if (typeof o[k] === "string" && sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
          o[k] = "[REDACTED]";
        } else if (typeof o[k] === "object") {
          redact(o[k]);
        }
      }
    };

    redact(clone);
    return clone;
  } catch {
    return "[COMPLEX OBJECT REDACTED]";
  }
}

/**
 * Creates a redact-protected, append-only audit log entry.
 */
export async function writeAuditLog({
  actorUserId,
  action,
  entityType,
  entityId,
  oldValue = null,
  newValue = null,
  metadata = null,
  ipAddress = null,
}: {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
  ipAddress?: string | null;
}) {
  try {
    const admin = createAdminClient();
    const cleanOld = redactSecrets(oldValue);
    const cleanNew = redactSecrets(newValue);
    const cleanMeta = redactSecrets(metadata);

    const { error } = await admin.from("audit_logs").insert({
      actor_user_id: actorUserId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_value: cleanOld,
      new_value: cleanNew,
      metadata: cleanMeta,
      ip_address: ipAddress,
    });

    if (error) {
      console.error("Failed to insert audit log:", error.message);
    }
  } catch (err) {
    console.error("Exception occurred while inserting audit log:", err);
  }
}

/**
 * Backward compatibility wrapper matching old client signatures.
 */
export async function createAuditLog({
  actorProfileId,
  action,
  entityType,
  entityId,
  oldValue = null,
  newValue = null,
  ipAddress = null,
}: {
  actorProfileId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string | null;
}) {
  return writeAuditLog({
    actorUserId: actorProfileId,
    action,
    entityType,
    entityId,
    oldValue,
    newValue,
    ipAddress,
  });
}
