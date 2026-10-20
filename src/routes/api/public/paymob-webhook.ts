// Public webhook for Paymob "Transaction processed" callbacks. Nothing is trusted until the HMAC is verified.
import { createFileRoute } from "@tanstack/react-router";
import { verifyPaymobHmac } from "@/lib/paymob/paymobHmac";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export const Route = createFileRoute("/api/public/paymob-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      // Paymob may also hit this URL with the browser "response" callback (GET); we use our own return page instead.
      GET: async () => json({ ok: true }),
      POST: async ({ request }) => {
        try {
          const hmac = new URL(request.url).searchParams.get("hmac") || "";
          const body = await request.json().catch(() => null);
          const obj = body?.obj;
          if (!obj || (body?.type && body.type !== "TRANSACTION")) return json({ ok: true, ignored: true });

          const { serviceClient, loadAllHmacSecrets } = await import("@/lib/paymob/paymob.server");
          const db = await serviceClient();
          const secrets = await loadAllHmacSecrets(db);
          if (!(await verifyPaymobHmac(obj, hmac, secrets))) {
            console.warn("Paymob webhook rejected: invalid HMAC");
            return json({ error: "invalid signature" }, 401);
          }

          const reference =
            typeof obj.order?.merchant_order_id === "string" && obj.order.merchant_order_id.startsWith("PM-")
              ? obj.order.merchant_order_id
              : null;

          const { data: result, error } = await db.rpc("paymob_apply_transaction", {
            _reference: reference,
            _paymob_order_id: obj.order?.id ?? null,
            _transaction_id: obj.id,
            _amount_cents: Number(obj.amount_cents),
            _success: obj.success === true,
            _pending: obj.pending === true,
            _source_type: obj.source_data?.type ?? null,
            _raw: body,
          });
          if (error) {
            console.error("paymob_apply_transaction failed:", error.message);
            return json({ error: "processing failed" }, 500); // Paymob will retry
          }
          console.log(`Paymob transaction ${obj.id} for ${reference ?? obj.order?.id}: ${result}`);
          return json({ ok: true, result });
        } catch (e) {
          console.error("paymob-webhook error:", e instanceof Error ? e.message : e);
          return json({ error: "unexpected error" }, 500);
        }
      },
    },
  },
});
