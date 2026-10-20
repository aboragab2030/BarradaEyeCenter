// Pure helpers (no Deno APIs) so they can be unit-tested from the web app's test suite.

/** Field order Paymob uses to sign the "Transaction processed" callback. */
export const PAYMOB_HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/** Builds the string Paymob signs from the callback's `obj`. */
export function buildPaymobHmacString(obj: unknown): string {
  return PAYMOB_HMAC_FIELDS.map((field) => {
    const value = getPath(obj, field);
    return value === undefined || value === null ? "" : String(value);
  }).join("");
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hmacSha512Hex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toHex(sig);
}

/** Constant-time comparison of two hex strings. */
export function safeEqualHex(a: string, b: string): boolean {
  const x = (a || "").toLowerCase();
  const y = (b || "").toLowerCase();
  if (x.length !== y.length || x.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

/** True when `receivedHmac` matches the callback signed with any of the given secrets. */
export async function verifyPaymobHmac(obj: unknown, receivedHmac: string, secrets: string[]): Promise<boolean> {
  if (!receivedHmac) return false;
  const message = buildPaymobHmacString(obj);
  for (const secret of secrets) {
    if (!secret) continue;
    const expected = await hmacSha512Hex(message, secret);
    if (safeEqualHex(expected, receivedHmac)) return true;
  }
  return false;
}

/** Validates the settings form. Returns an Arabic error message or null. */
export function validatePaymobKeys(mode: "test" | "live", keys: { publicKey?: string | null; secretKey?: string | null }): string | null {
  const label = mode === "test" ? "التجريبي" : "الحقيقي";
  if (keys.publicKey && !keys.publicKey.startsWith(`egy_pk_${mode}_`) && !keys.publicKey.startsWith(`pk_${mode}_`)) {
    return `الـ Public Key للوضع ${label} غير صحيح (يجب أن يكون مفتاح ${mode})`;
  }
  if (keys.secretKey && !keys.secretKey.startsWith(`egy_sk_${mode}_`) && !keys.secretKey.startsWith(`sk_${mode}_`)) {
    return `الـ Secret Key للوضع ${label} غير صحيح (يجب أن يكون مفتاح ${mode})`;
  }
  return null;
}
