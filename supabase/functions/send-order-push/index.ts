import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!supabaseUrl || !serviceKey || !vapidPublicKey || !vapidPrivateKey) {
      console.error("send-order-push is missing required secrets.");
      return respond({ error: "Order notifications are not configured yet." }, 503);
    }

    const body = await req.json();
    const storeSlug = typeof body?.storeSlug === "string" ? body.storeSlug.trim() : "";
    const orderNumber = typeof body?.orderNumber === "string" ? body.orderNumber.trim() : "";
    const subscription = body?.subscription;
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;
    if (!/^[a-zA-Z0-9-]{1,100}$/.test(storeSlug) || !/^\d{1,20}$/.test(orderNumber)) {
      return respond({ error: "The store or order number is invalid." }, 400);
    }
    if (typeof endpoint !== "string" ||
        typeof p256dh !== "string" || typeof auth !== "string") {
      return respond({ error: "This device's notification subscription is invalid." }, 400);
    }
    const endpointUrl = new URL(endpoint);
    const host = endpointUrl.hostname.toLowerCase();
    const allowedPushHost =
      host === "fcm.googleapis.com" ||
      host.endsWith(".googleapis.com") ||
      host === "push.services.mozilla.com" ||
      host.endsWith(".push.services.mozilla.com") ||
      host === "updates.push.services.mozilla.com" ||
      host === "web.push.apple.com" ||
      host.endsWith(".notify.windows.com");
    if (endpointUrl.protocol !== "https:" || !allowedPushHost) {
      return respond({ error: "This browser's push service is not supported." }, 400);
    }

    // Only accept a same-site storefront URL, so notification clicks cannot redirect elsewhere.
    const page = new URL(typeof body?.pageUrl === "string" ? body.pageUrl : "");
    if (page.origin !== "https://aj1716-qa.github.io" ||
        !page.pathname.endsWith("/store.html") ||
        page.searchParams.get("store") !== storeSlug) {
      return respond({ error: "The storefront address could not be verified." }, 400);
    }

    // Verify the order against Supabase before sending any notification.
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: business, error: businessError } = await admin
      .from("businesses")
      .select("id,store_slug,storefront_enabled")
      .eq("store_slug", storeSlug)
      .eq("storefront_enabled", true)
      .maybeSingle();
    if (businessError) {
      console.error("Store verification failed:", businessError.message);
      return respond({ error: "Could not verify the store." }, 500);
    }
    if (!business) return respond({ error: "Store not found." }, 404);

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("order_number,total_amount,business_id")
      .eq("business_id", business.id)
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (orderError) {
      console.error("Order verification failed:", orderError.message);
      return respond({ error: "Could not verify the order." }, 500);
    }
    if (!order) return respond({ error: "Order not found for this store." }, 404);

    webpush.setVapidDetails("mailto:notifications@bentabuddy.app", vapidPublicKey, vapidPrivateKey);
    const total = new Intl.NumberFormat("en-PH", {
      style: "currency", currency: "PHP",
    }).format(Number(order.total_amount) || 0);
    const payload = JSON.stringify({
      title: "Order received · BentaBuddy",
      body: `Your order #${order.order_number} was sent to the seller. Total: ${total}. Payment is not yet confirmed.`,
      url: page.href,
    });

    try {
      await webpush.sendNotification(subscription, payload, { TTL: 60 * 60 * 24 });
    } catch (pushError) {
      const error = pushError as { statusCode?: number; message?: string };
      console.error("Web push delivery failed:", error.statusCode, error.message);
      return respond({ error: "The order was saved, but this device's notification could not be delivered." }, 502);
    }

    return respond({ success: true, message: "Order confirmation notification sent." });
  } catch (error) {
    console.error("send-order-push error:", error);
    return respond({ error: "Could not send the order notification." }, 500);
  }
});
