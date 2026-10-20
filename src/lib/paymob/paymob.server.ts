// Server-only Paymob helpers (ported from the original backend's _shared/paymob.ts).
// Uses the privileged backend client; never import this from browser code.
import type { SupabaseClient } from "@supabase/supabase-js";

export const PAYMOB_BASE_URL = "https://accept.paymob.com";

export async function serviceClient(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

// ---------- Encryption of stored secrets (AES-256-GCM) ----------
// Uses PAYMOB_ENCRYPTION_KEY if it is set; otherwise derives a key from the service role key,
// which only the backend knows. If that key ever changes, re-enter the Paymob keys in the admin page.

async function encryptionKey(): Promise<CryptoKey> {
  const material =
    process.env["PAYMOB_ENCRYPTION_KEY"] || `paymob-settings:${process.env["SUPABASE_SERVICE_ROLE_KEY"]}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

export async function encryptSecret(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), new TextEncoder().encode(plain));
  return `${b64(iv)}:${b64(new Uint8Array(cipher))}`;
}

export async function decryptSecret(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;
  try {
    const [ivText, dataText] = stored.split(":");
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(ivText) }, await encryptionKey(), unb64(dataText));
    return new TextDecoder().decode(plain);
  } catch (_e) {
    console.error("Could not decrypt a stored Paymob secret; re-enter it in the admin page");
    return null;
  }
}

// ---------- Config ----------

export type PaymobMode = "test" | "live";

export interface PaymobConfig {
  enabled: boolean;
  mode: PaymobMode;
  publicKey: string | null;
  secretKey: string | null;
  hmacSecret: string | null;
  cardIntegrationId: number | null;
  walletIntegrationId: number | null;
}

export async function loadSettingsRow(db: SupabaseClient) {
  const { data } = await db.from("payment_gateway_settings").select("*").eq("id", 1).maybeSingle();
  return data as Record<string, any> | null;
}

export async function loadConfig(db: SupabaseClient, mode?: PaymobMode): Promise<PaymobConfig> {
  const settings = await loadSettingsRow(db);
  const activeMode: PaymobMode = mode ?? (settings?.mode === "live" ? "live" : "test");
  const { data: secrets } = await db.from("payment_gateway_secrets").select("*").eq("mode", activeMode).maybeSingle();
  return {
    enabled: settings?.enabled === true,
    mode: activeMode,
    publicKey: settings?.[`${activeMode}_public_key`] ?? null,
    secretKey: await decryptSecret((secrets as any)?.secret_key_enc),
    hmacSecret: await decryptSecret((secrets as any)?.hmac_secret_enc),
    cardIntegrationId: settings?.[`${activeMode}_card_integration_id`] ?? null,
    walletIntegrationId: settings?.[`${activeMode}_wallet_integration_id`] ?? null,
  };
}

/** HMAC secrets of every configured mode (a webhook can arrive for a test payment after switching to live). */
export async function loadAllHmacSecrets(db: SupabaseClient): Promise<string[]> {
  const { data } = await db.from("payment_gateway_secrets").select("hmac_secret_enc");
  const out: string[] = [];
  for (const row of (data ?? []) as any[]) {
    const s = await decryptSecret(row.hmac_secret_enc);
    if (s) out.push(s);
  }
  return out;
}

export function isComplete(cfg: PaymobConfig): boolean {
  return Boolean(cfg.publicKey && cfg.secretKey && cfg.hmacSecret && (cfg.cardIntegrationId || cfg.walletIntegrationId));
}

/** Public origin of this site (for webhook and return URLs). */
export function siteOrigin(request: Request | undefined): string {
  const configured = process.env["SITE_URL"];
  if (configured) {
    try { return new URL(configured).origin; } catch { /* fall through */ }
  }
  if (request) {
    try { return new URL(request.url).origin; } catch { /* fall through */ }
  }
  return "https://barradaluxoreyecenter.lovable.app";
}
