// Public payment webhook (wallet / InstaPay / Fawry notifications). Requires the shared x-webhook-secret header.
import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PAYMENT_TYPE_MAP: Record<string, "wallet" | "instapay" | "fawry"> = {
  wallet: "wallet",
  "محفظة": "wallet",
  vodafone: "wallet",
  "فودافون": "wallet",
  instapay: "instapay",
  "انستاباي": "instapay",
  fawry: "fawry",
  "فوري": "fawry",
};

function normalizePaymentType(type: string): "wallet" | "instapay" | "fawry" | "other" {
  const normalized = type?.toLowerCase().trim();
  return PAYMENT_TYPE_MAP[normalized] || "other";
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/payment-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          const webhookSecret = process.env["PAYMENT_WEBHOOK_SECRET"];
          if (!webhookSecret) {
            console.error("CRITICAL: PAYMENT_WEBHOOK_SECRET not configured - webhook disabled for security");
            return json({ error: "Service temporarily unavailable" }, 503);
          }
          const providedSecret = request.headers.get("x-webhook-secret");
          if (!providedSecret || !safeEqual(providedSecret, webhookSecret)) {
            console.error("Invalid or missing webhook secret");
            return json({ error: "Unauthorized" }, 401);
          }

          const body = await request.json().catch(() => null);
          if (!body || typeof body !== "object") return json({ error: "Invalid body" }, 400);
          const { patient_name, amount, transaction_id, payment_type, payment_type_detail, patient_phone } = body as Record<string, any>;

          if (!patient_name || typeof patient_name !== "string") return json({ error: "patient_name is required" }, 400);
          if (!amount || typeof amount !== "number" || amount <= 0) return json({ error: "valid amount is required" }, 400);
          if (!transaction_id || typeof transaction_id !== "string") return json({ error: "transaction_id is required" }, 400);
          if (patient_name.length > 200) return json({ error: "patient_name too long" }, 400);
          if (transaction_id.length > 100) return json({ error: "transaction_id too long" }, 400);

          const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");

          const { data: existingPayment } = await supabase
            .from("payments")
            .select("id")
            .eq("transaction_id", transaction_id.trim())
            .maybeSingle();
          if (existingPayment) {
            return json({ error: "Transaction already processed", payment_id: existingPayment.id }, 409);
          }

          const { data: payment, error: insertError } = await supabase
            .from("payments")
            .insert({
              patient_name: patient_name.trim(),
              patient_phone: typeof patient_phone === "string" ? patient_phone.trim() || null : null,
              amount,
              transaction_id: transaction_id.trim(),
              payment_type: normalizePaymentType(payment_type || "other"),
              payment_type_detail: typeof payment_type_detail === "string" ? payment_type_detail.trim() || null : null,
              status: "paid",
              matched_at: new Date().toISOString(),
            })
            .select()
            .single();
          if (insertError || !payment) {
            console.error("Failed to insert payment:", insertError);
            return json({ error: "Failed to process payment" }, 500);
          }

          const { error: notifError } = await supabase.from("payment_notifications").insert({
            payment_id: payment.id,
            patient_name: patient_name.trim(),
            amount,
            message: `تم استلام دفعة بنجاح من ${patient_name.trim()} بقيمة ${amount} ج.م - رقم العملية: ${transaction_id.trim()}`,
            is_read: false,
          });
          if (notifError) console.warn("Failed to create notification:", notifError);

          return json({ success: true, payment_id: payment.id, message: "Payment received and processed successfully" });
        } catch (error) {
          console.error("Payment webhook error:", error instanceof Error ? error.message : "Unknown error");
          return json({ error: "An unexpected error occurred" }, 500);
        }
      },
    },
  },
});
