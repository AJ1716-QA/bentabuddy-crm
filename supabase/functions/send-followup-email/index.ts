import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Please sign in before sending an email." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse({ error: "Supabase function configuration is incomplete." }, 500);
    }
    if (!resendApiKey) {
      return jsonResponse({ error: "RESEND_API_KEY is not configured in Supabase secrets." }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ error: "Your session is invalid or expired. Please sign in again." }, 401);
    }

    const body = await req.json();
    const followUpId = body?.followUpId;
    if (typeof followUpId !== "string" || !followUpId.trim()) {
      return jsonResponse({ error: "A follow-up ID is required." }, 400);
    }

    // The recipient is always read from the signed-in user's RLS-protected records.
    // The browser cannot supply an arbitrary recipient address, subject, or message.
    const { data: followUp, error: followUpError } = await supabase
      .from("follow_ups")
      .select("id,business_id,customer_id,lead_id,title,notes,due_at")
      .eq("id", followUpId.trim())
      .maybeSingle();

    if (followUpError) {
      console.error("Follow-up lookup failed:", followUpError.message);
      return jsonResponse({ error: "Could not verify this follow-up. Please try again." }, 400);
    }
    if (!followUp) return jsonResponse({ error: "Follow-up not found or you do not have access to it." }, 404);
    if (!!followUp.customer_id === !!followUp.lead_id) {
      return jsonResponse({ error: "Link this follow-up to one customer or lead before emailing." }, 400);
    }

    let recipientEmail = "";
    let recipientName = "";
    if (followUp.customer_id) {
      const { data: customer, error } = await supabase
        .from("customers")
        .select("id,full_name,email")
        .eq("id", followUp.customer_id)
        .eq("business_id", followUp.business_id)
        .maybeSingle();
      if (error) {
        console.error("Customer lookup failed:", error.message);
        return jsonResponse({ error: "Could not verify the linked customer." }, 400);
      }
      if (!customer) return jsonResponse({ error: "The linked customer was not found or is not accessible." }, 404);
      recipientEmail = typeof customer.email === "string" ? customer.email.trim() : "";
      recipientName = customer.full_name || "there";
    } else {
      const { data: lead, error } = await supabase
        .from("leads")
        .select("id,contact_name,email")
        .eq("id", followUp.lead_id)
        .eq("business_id", followUp.business_id)
        .maybeSingle();
      if (error) {
        console.error("Lead lookup failed:", error.message);
        return jsonResponse({ error: "Could not verify the linked lead." }, 400);
      }
      if (!lead) return jsonResponse({ error: "The linked lead was not found or is not accessible." }, 404);
      recipientEmail = typeof lead.email === "string" ? lead.email.trim() : "";
      recipientName = lead.contact_name || "there";
    }

    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return jsonResponse({ error: "The linked customer or lead does not have a valid email address." }, 400);
    }

    const subject = `Follow-up: ${String(followUp.title || "Reminder").slice(0, 180)}`;
    const dueDate = followUp.due_at ? new Date(followUp.due_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) : "not specified";
    const message = [
      `Hello ${recipientName},`,
      "",
      "This is a follow-up regarding:",
      String(followUp.title || "Follow-up"),
      `Due: ${dueDate}`,
      "",
      String(followUp.notes || "").trim(),
      "",
      "Regards,",
      "BentaBuddy",
    ].filter((line, index, arr) => line !== "" || (index > 0 && arr[index - 1] !== "")).join("\n");

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "BentaBuddy <onboarding@resend.dev>",
        to: [recipientEmail],
        subject,
        text: message,
      }),
    });

    const result = await emailResponse.json();
    if (!emailResponse.ok) {
      console.error("Resend rejected the email:", {
        status: emailResponse.status,
        name: result?.name,
        message: result?.message,
      });
      const safeMessage = typeof result?.message === "string" && result.message.length < 500
        ? result.message
        : "Resend rejected the email. Check the Resend dashboard for the detailed error.";
      return jsonResponse({ error: safeMessage }, emailResponse.status);
    }

    return jsonResponse({ success: true, message: "Email accepted by Resend.", id: result.id });
  } catch (error) {
    console.error("send-followup-email error:", error);
    return jsonResponse({ error: "Unexpected error while sending the email." }, 500);
  }
});
