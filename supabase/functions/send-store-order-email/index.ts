import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c] ?? c);
}
function money(value: unknown) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value) || 0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed." }, 405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!supabaseUrl || !serviceKey) return reply({ error: "Supabase email function is not configured." }, 503);
    if (!resendApiKey) return reply({ error: "RESEND_API_KEY is not configured in Supabase secrets." }, 503);

    const body = await req.json();
    const storeSlug = typeof body?.storeSlug === "string" ? body.storeSlug.trim() : "";
    const orderNumber = typeof body?.orderNumber === "string" ? body.orderNumber.trim() : "";
    const requestedEmail = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[a-zA-Z0-9-]{1,100}$/.test(storeSlug) || !/^\d{1,20}$/.test(orderNumber)) {
      return reply({ error: "The store or order number is invalid." }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail)) {
      return reply({ error: "Enter a valid checkout email address." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: business, error: businessError } = await admin
      .from("businesses").select("*")
      .eq("store_slug", storeSlug).eq("storefront_enabled", true).maybeSingle();
    if (businessError || !business) return reply({ error: "Could not verify this storefront." }, 404);

    const { data: order, error: orderError } = await admin
      .from("orders").select("*").eq("business_id", business.id)
      .eq("order_number", Number(orderNumber)).maybeSingle();
    if (orderError || !order) return reply({ error: "Could not verify this order for the storefront." }, 404);

    // Resolve the address from the order's linked CRM customer, and require it to match checkout.
    let recipient = "";
    let customerName = "Customer";
    if (typeof order.customer_id === "string" && order.customer_id) {
      const { data: customer, error } = await admin.from("customers").select("id,full_name,email")
        .eq("id", order.customer_id).eq("business_id", business.id).maybeSingle();
      if (error || !customer) return reply({ error: "Could not verify the customer email for this order." }, 400);
      recipient = String(customer.email || "").trim().toLowerCase();
      customerName = String(customer.full_name || "Customer");
    } else {
      // Some deployments store checkout details directly on the order.
      recipient = String(order.customer_email || order.email || "").trim().toLowerCase();
      customerName = String(order.customer_name || order.full_name || "Customer");
    }
    if (!recipient || recipient !== requestedEmail) {
      return reply({ error: "The email address does not match the email saved with this order. Please contact the seller." }, 400);
    }

    const { data: items, error: itemsError } = await admin.from("order_items").select("*").eq("order_id", order.id);
    if (itemsError || !items?.length) {
      console.error("Order item lookup failed:", itemsError?.message);
      return reply({ error: "The order was saved, but its item details could not be loaded for email." }, 500);
    }
    const productIds = [...new Set(items.map((item: Record<string, unknown>) => String(item.product_id || "")).filter(Boolean))];
    const productsById = new Map<string, Record<string, unknown>>();
    if (productIds.length) {
      const { data: products } = await admin.from("products").select("*").in("id", productIds);
      for (const product of products || []) productsById.set(String(product.id), product as Record<string, unknown>);
    }
    const lines = items.map((item: Record<string, unknown>) => {
      const product = productsById.get(String(item.product_id || "")) || {};
      const name = String(product.name || product.product_name || product.title || item.product_name || "Product");
      const quantity = Number(item.quantity) || 1;
      const unit = Number(item.unit_price ?? item.price ?? product.price) || 0;
      const lineTotal = Number(item.subtotal ?? item.line_total) || unit * quantity;
      return { name, quantity, lineTotal };
    });
    const total = Number(order.total_amount) || 0;
    const sellerName = String(business.business_name || business.name || "the store");
    const paymentStatus = "Pending seller verification. A customer-provided reference does not confirm payment.";
    const textLines = [
      `Hello ${customerName},`,
      "",
      `Thank you for ordering from ${sellerName}.`,
      `Order number: ${order.order_number}`,
      "",
      "Items:",
      ...lines.map((line) => `- ${line.name} x ${line.quantity}: ${money(line.lineTotal)}`),
      "",
      `Order total: ${money(total)}`,
      `Payment status: ${paymentStatus}`,
      "",
      "Please keep your order number for reference. The seller will confirm payment separately.",
      "BentaBuddy Online Store",
    ];
    const htmlItems = lines.map((line) => `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">${esc(line.name)} × ${line.quantity}</td><td style="padding:8px;text-align:right;border-bottom:1px solid #e5e7eb">${esc(money(line.lineTotal))}</td></tr>`).join("");
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "BentaBuddy <onboarding@resend.dev>",
        to: [recipient],
        subject: `Order confirmation #${order.order_number} · ${sellerName}`,
        text: textLines.join("\n"),
        html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172b45"><h2>Order confirmation</h2><p>Hello ${esc(customerName)},</p><p>Thank you for ordering from <strong>${esc(sellerName)}</strong>.</p><p>Order number: <strong>#${esc(order.order_number)}</strong></p><table style="width:100%;border-collapse:collapse">${htmlItems}</table><p style="font-size:18px"><strong>Total: ${esc(money(total))}</strong></p><p><strong>Payment status:</strong> ${esc(paymentStatus)}</p><p>Please keep your order number. The seller will confirm payment separately.</p><p>BentaBuddy Online Store</p></div>`,
      }),
    });
    const result = await emailResponse.json().catch(() => ({}));
    if (!emailResponse.ok) {
      console.error("Resend rejected storefront email:", emailResponse.status, result?.message || result?.name);
      return reply({ error: typeof result?.message === "string" ? result.message.slice(0, 350) : "The email provider rejected this confirmation." }, 502);
    }
    return reply({ success: true, message: "Order confirmation accepted by the email provider.", id: result.id });
  } catch (error) {
    console.error("send-store-order-email error:", error);
    return reply({ error: "Could not send the storefront order confirmation email." }, 500);
  }
});
