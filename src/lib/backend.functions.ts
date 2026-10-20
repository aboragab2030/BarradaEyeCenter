// Server functions that replace the original backend functions
// (add-staff-user, admin-update-password, ai-chat, paymob-create-payment, paymob-settings).
// Each returns { status, body } so the browser keeps the original success/error handling.
import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validatePaymobKeys } from "@/lib/paymob/paymobHmac";
import {
  PAYMOB_BASE_URL,
  encryptSecret,
  isComplete,
  loadConfig,
  serviceClient,
  siteOrigin,
  type PaymobMode,
} from "@/lib/paymob/paymob.server";

type Body = Record<string, any>;
export type BackendResult = { status: number; body: any };

const asBody = (input: unknown): Body =>
  input && typeof input === "object" && !Array.isArray(input) ? (input as Body) : {};
const reply = (body: any, status = 200): BackendResult => ({ status, body });

// ---------------------------------------------------------------------------
// add-staff-user (admin only)
// ---------------------------------------------------------------------------
export const addStaffUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(asBody)
  .handler(async ({ data, context }): Promise<BackendResult> => {
    try {
      const { data: roleData, error: roleError } = await context.supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId)
        .eq("role", "admin");
      if (roleError || !roleData || roleData.length === 0) {
        return reply({ error: "Only admins can add users" }, 403);
      }

      const { email, password, name, loginUsername, role, permissions } = data;
      if (!email || !password || !name) return reply({ error: "email, password, and name are required" }, 400);
      if (typeof email !== "string" || email.length > 255) return reply({ error: "Invalid email" }, 400);
      if (typeof password !== "string" || password.length < 6 || password.length > 128) {
        return reply({ error: "Password must be between 6 and 128 characters" }, 400);
      }
      if (typeof name !== "string" || name.length > 100) return reply({ error: "Invalid name" }, 400);

      const validRole = role === "admin" ? "admin" : "staff";
      const validPermissions = Array.isArray(permissions) ? permissions.filter((p: unknown) => typeof p === "string") : [];

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      let newUserId: string;
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
      });

      if (createError) {
        if (createError.message?.includes("already been registered")) {
          const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          if (listError) return reply({ error: "Failed to look up existing user" }, 400);
          const existingUser = existingUsers.users.find((u) => u.email === email.trim());
          if (!existingUser) return reply({ error: "User exists but could not be found" }, 400);
          newUserId = existingUser.id;
          await supabaseAdmin.auth.admin.updateUserById(newUserId, { password });
        } else {
          console.error("Error creating user:", createError);
          return reply({ error: createError.message || "Failed to create user" }, 400);
        }
      } else {
        newUserId = newUser.user.id;
      }

      await supabaseAdmin.from("profiles").upsert(
        {
          user_id: newUserId,
          name: name.trim(),
          login_username: typeof loginUsername === "string" && loginUsername.trim() ? loginUsername.trim() : null,
          permissions: validPermissions,
          is_active: true,
        },
        { onConflict: "user_id" },
      );

      const { error: roleInsertError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: newUserId, role: validRole }, { onConflict: "user_id,role" })
        .select();

      if (roleInsertError) {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId);
        await supabaseAdmin.from("user_roles").insert({ user_id: newUserId, role: validRole });
      }

      return reply({ success: true, userId: newUserId });
    } catch (error) {
      console.error("Unexpected error:", error);
      return reply({ error: "Internal server error" }, 500);
    }
  });

// ---------------------------------------------------------------------------
// admin-update-password (admin only)
// ---------------------------------------------------------------------------
export const adminUpdatePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(asBody)
  .handler(async ({ data, context }): Promise<BackendResult> => {
    try {
      const { data: roleData, error: roleError } = await context.supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId)
        .single();
      if (roleError || roleData?.role !== "admin") {
        return reply({ error: "Only admins can change passwords" }, 403);
      }

      const { userId, newPassword } = data;
      if (!userId || !newPassword) return reply({ error: "userId and newPassword are required" }, 400);
      if (typeof userId !== "string" || typeof newPassword !== "string") return reply({ error: "Invalid input" }, 400);
      if (newPassword.length < 6) return reply({ error: "Password must be at least 6 characters" }, 400);

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
      if (updateError) {
        console.error("Error updating password:", updateError);
        return reply({ error: "Failed to update password" }, 500);
      }
      return reply({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Unexpected error:", error);
      return reply({ error: "Internal server error" }, 500);
    }
  });

// ---------------------------------------------------------------------------
// ai-chat (public, rate limited per server instance like the original)
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60000;
const MAX_MESSAGE_LENGTH = 500;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.windowStart >= RATE_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export const aiChat = createServerFn({ method: "POST" })
  .inputValidator(asBody)
  .handler(async ({ data }): Promise<BackendResult> => {
    try {
      const forwarded = getRequestHeader("cf-connecting-ip") || getRequestHeader("x-forwarded-for");
      const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
      if (!checkRateLimit(`ip:${ip}`)) return reply({ error: "Rate limit exceeded. Please try again later." }, 429);

      const { message, language } = data;
      if (!message || typeof message !== "string") return reply({ error: "Message is required" }, 400);
      if (message.length > MAX_MESSAGE_LENGTH) {
        return reply({ error: "Message too long. Maximum length is 500 characters." }, 400);
      }
      const sanitizedMessage = message.trim();
      if (!sanitizedMessage) return reply({ error: "Message cannot be empty" }, 400);

      const systemPrompt =
        language === "ar"
          ? "أنت مساعد ذكي لمركز براده للعيون. ساعد المستخدمين في الإجابة عن استفساراتهم حول خدمات العيون، المواعيد، والأطباء. كن لطيفاً ومختصراً."
          : "You are a smart assistant for Barada Eye Center. Help users answering their questions about eye services, appointments, and doctors. Be kind and concise.";

      const { generateChatCompletion } = await import("@lovable.dev/ai-gateway");
      const completion = await generateChatCompletion({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: sanitizedMessage },
        ],
        max_tokens: 1000,
      });
      const content = (completion as any)?.choices?.[0]?.message?.content;
      return reply({ response: typeof content === "string" ? content : "" });
    } catch (error) {
      console.error("ai-chat error:", error instanceof Error ? error.message : "Unknown error");
      return reply({ error: "An unexpected error occurred" }, 500);
    }
  });

// ---------------------------------------------------------------------------
// paymob-create-payment (public; amount is always calculated on the server)
// ---------------------------------------------------------------------------
function safeReturnOrigin(request: Request, requested: unknown): string {
  const header = request.headers.get("origin");
  const candidate = typeof requested === "string" ? requested : header;
  try {
    const u = new URL(candidate ?? "");
    const host = u.hostname;
    const site = process.env["SITE_URL"];
    const allowed =
      u.protocol === "https:" &&
      (host.endsWith(".lovable.app") ||
        host.endsWith(".lovableproject.com") ||
        host.endsWith(".lovable.dev") ||
        (site && host === new URL(site).hostname));
    if (allowed) return u.origin;
  } catch {
    /* fall through */
  }
  return siteOrigin(request);
}

function splitName(full: string): { first: string; last: string } {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || "NA", last: parts.slice(1).join(" ") || "NA" };
}

export const paymobCreatePayment = createServerFn({ method: "POST" })
  .inputValidator(asBody)
  .handler(async ({ data }): Promise<BackendResult> => {
    try {
      const request = getRequest();
      const { booking_id, phone, return_origin } = data;
      if (typeof booking_id !== "string" || typeof phone !== "string") return reply({ error: "بيانات غير مكتملة" }, 400);

      const db = await serviceClient();
      const cfg = await loadConfig(db);
      if (!cfg.enabled || !isComplete(cfg)) return reply({ error: "الدفع الإلكتروني غير متاح حالياً" }, 400);

      const { data: booking } = await db.from("bookings").select("*").eq("id", booking_id).maybeSingle();
      const b = booking as Record<string, any> | null;
      if (!b || (b.phone !== phone.trim() && b.phone2 !== phone.trim()) || b.payment_method !== "paymob") {
        return reply({ error: "الحجز غير موجود" }, 404);
      }
      if (b.payment_status === "paid") return reply({ error: "تم دفع هذا الحجز بالفعل" }, 400);
      if (new Date(b.created_at).getTime() < Date.now() - 2 * 60 * 60 * 1000) {
        return reply({ error: "انتهت مهلة الدفع لهذا الحجز، يرجى التواصل مع المركز" }, 400);
      }

      const { data: due, error: dueError } = await db.rpc("instapay_amount_due", {
        _service: b.service,
        _doctor_id: b.doctor_id,
        _doctor_name: b.doctor_name,
      });
      if (dueError) throw dueError;
      const amountCents = Math.round(Number(due) * 100);
      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        return reply({ error: "لا يمكن تحديد قيمة الكشف، يرجى التواصل مع المركز" }, 400);
      }

      const reference = "PM-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
      const origin = safeReturnOrigin(request, return_origin);
      const name = splitName(b.patient_name);

      const payload = {
        amount: amountCents,
        currency: "EGP",
        payment_methods: [cfg.cardIntegrationId, cfg.walletIntegrationId].filter(Boolean),
        items: [
          {
            name: String(b.service || "كشف").slice(0, 50),
            amount: amountCents,
            description: `حجز ${b.date} ${b.time}`.slice(0, 50),
            quantity: 1,
          },
        ],
        billing_data: {
          first_name: name.first,
          last_name: name.last,
          phone_number: b.phone,
          email: b.patient_email || "no-email@barradaluxoreyecenter.lovable.app",
          apartment: "NA",
          floor: "NA",
          street: "NA",
          building: "NA",
          city: b.governorate || "NA",
          state: b.governorate || "NA",
          country: "EG",
        },
        special_reference: reference,
        notification_url: `${siteOrigin(request)}/api/public/paymob-webhook`,
        redirection_url: `${origin}/?paymob_ref=${reference}`,
      };

      const res = await fetch(`${PAYMOB_BASE_URL}/v1/intention/`, {
        method: "POST",
        headers: { Authorization: `Token ${cfg.secretKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) {
        console.error("Paymob intention failed:", res.status, text.slice(0, 1000));
        return reply({ error: "تعذر بدء عملية الدفع، يرجى المحاولة لاحقاً أو اختيار طريقة دفع أخرى" }, 502);
      }
      const intention = JSON.parse(text);
      if (!intention.client_secret) {
        console.error("Paymob intention without client_secret:", text.slice(0, 1000));
        return reply({ error: "تعذر بدء عملية الدفع" }, 502);
      }

      const { error: insertError } = await db.from("paymob_payments").insert({
        booking_id: b.id,
        reference,
        intention_id: intention.id ? String(intention.id) : null,
        paymob_order_id: intention.intention_order_id ?? null,
        amount_cents: amountCents,
        mode: cfg.mode,
      });
      if (insertError) throw insertError;

      const checkoutUrl = `${PAYMOB_BASE_URL}/unifiedcheckout/?publicKey=${encodeURIComponent(cfg.publicKey!)}&clientSecret=${encodeURIComponent(intention.client_secret)}`;
      return reply({ checkout_url: checkoutUrl, reference, amount: amountCents / 100 });
    } catch (e) {
      console.error("paymob-create-payment error:", e instanceof Error ? e.message : e);
      return reply({ error: "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى" }, 500);
    }
  });

// ---------------------------------------------------------------------------
// paymob-settings (admin only). Secret values are encrypted and never returned.
// ---------------------------------------------------------------------------
const last4 = (s: string) => s.slice(-4);
const cleanText = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const cleanId = (v: unknown): number | null | "invalid" => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : "invalid";
};

export const paymobSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const b = asBody(input);
    return { method: b.method === "POST" ? ("POST" as const) : ("GET" as const), body: asBody(b.body) };
  })
  .handler(async ({ data, context }): Promise<BackendResult> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (isAdmin !== true) return reply({ error: "غير مصرح لك بهذه الصفحة" }, 403);
    const adminId = context.userId;

    const request = getRequest();
    const db = await serviceClient();
    const webhookUrl = `${siteOrigin(request)}/api/public/paymob-webhook`;

    const describe = async () => {
      const { data: settings } = await db.from("payment_gateway_settings").select("*").eq("id", 1).maybeSingle();
      const { data: secrets } = await db
        .from("payment_gateway_secrets")
        .select("mode, secret_key_last4, hmac_last4, secret_key_enc, hmac_secret_enc");
      const secretInfo: Record<string, unknown> = {};
      for (const mode of ["test", "live"]) {
        const row = ((secrets ?? []) as any[]).find((r) => r.mode === mode);
        secretInfo[mode] = {
          has_secret_key: Boolean(row?.secret_key_enc),
          has_hmac: Boolean(row?.hmac_secret_enc),
          secret_key_last4: row?.secret_key_last4 ?? null,
          hmac_last4: row?.hmac_last4 ?? null,
        };
      }
      return { settings, secrets: secretInfo, webhook_url: webhookUrl };
    };

    try {
      if (data.method === "GET") return reply(await describe());

      const body = data.body;
      const mode: PaymobMode = body.mode === "live" ? "live" : "test";
      const enabled = body.enabled === true;

      const update: Record<string, unknown> = { enabled, mode, updated_by: adminId, updated_at: new Date().toISOString() };
      for (const m of ["test", "live"] as const) {
        const publicKey = cleanText(body[`${m}_public_key`]);
        const secretKey = cleanText(body[`${m}_secret_key`]);
        const err = validatePaymobKeys(m, { publicKey, secretKey });
        if (err) return reply({ error: err }, 400);
        const card = cleanId(body[`${m}_card_integration_id`]);
        const wallet = cleanId(body[`${m}_wallet_integration_id`]);
        if (card === "invalid" || wallet === "invalid") return reply({ error: "رقم الـ Integration ID يجب أن يكون رقماً صحيحاً" }, 400);
        update[`${m}_public_key`] = publicKey;
        update[`${m}_card_integration_id`] = card;
        update[`${m}_wallet_integration_id`] = wallet;
      }

      for (const m of ["test", "live"] as const) {
        const secretKey = cleanText(body[`${m}_secret_key`]);
        const hmac = cleanText(body[`${m}_hmac_secret`]);
        if (!secretKey && !hmac) continue;
        const row: Record<string, unknown> = { mode: m, updated_at: new Date().toISOString() };
        if (secretKey) { row.secret_key_enc = await encryptSecret(secretKey); row.secret_key_last4 = last4(secretKey); }
        if (hmac) { row.hmac_secret_enc = await encryptSecret(hmac); row.hmac_last4 = last4(hmac); }
        const { error } = await db.from("payment_gateway_secrets").upsert(row as any, { onConflict: "mode" });
        if (error) throw error;
      }

      const { error: saveError } = await db.from("payment_gateway_settings").update({ ...update, enabled: false } as any).eq("id", 1);
      if (saveError) throw saveError;

      if (enabled) {
        const cfg = await loadConfig(db, mode);
        if (!isComplete(cfg)) {
          const label = mode === "live" ? "الحقيقي" : "التجريبي";
          return reply(
            {
              error: `لا يمكن التفعيل: بيانات الوضع ${label} ناقصة (Public Key و Secret Key و HMAC ورقم Integration واحد على الأقل). تم حفظ باقي البيانات والدفع الإلكتروني متوقف.`,
              saved: await describe(),
            },
            400,
          );
        }
        const { error } = await db.from("payment_gateway_settings").update({ enabled: true }).eq("id", 1);
        if (error) throw error;
      }

      return reply({ ok: true, ...(await describe()) });
    } catch (e) {
      console.error("paymob-settings error:", e instanceof Error ? e.message : e);
      return reply({ error: "حدث خطأ أثناء حفظ الإعدادات" }, 500);
    }
  });
