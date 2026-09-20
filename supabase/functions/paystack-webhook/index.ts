// ==============================================================================
// supabase/functions/paystack-webhook/index.ts
// Secure Paystack Webhook Handler for H2O Multi-Tenant SaaS (AquaFlow ERP)
// Verifies HMAC-SHA512 signatures and updates subscriptions server-side
// ==============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Initialize Supabase Admin Client using privileged service_role within secure edge runtime
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Helper: Verify Paystack HMAC-SHA512 signature using Web Crypto API
async function verifyPaystackSignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature || !PAYSTACK_SECRET_KEY) return false;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(PAYSTACK_SECRET_KEY);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(rawBody));
  const hashArray = Array.from(new Uint8Array(signatureBytes));
  const expectedSignature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return expectedSignature.toLowerCase() === signature.toLowerCase();
}

serve(async (req: Request) => {
  // Only accept POST requests from Paystack
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const paystackSignature = req.headers.get("x-paystack-signature");

  // 1. VERIFY CRYPTOGRAPHIC HMAC SIGNATURE
  const isValid = await verifyPaystackSignature(rawBody, paystackSignature);
  if (!isValid) {
    console.error("[Paystack Webhook] Invalid HMAC signature rejection");
    return new Response(JSON.stringify({ error: "Unauthorized: Invalid webhook signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let eventData: any;
  try {
    eventData = JSON.parse(rawBody);
  } catch (err) {
    return new Response(JSON.stringify({ error: "Malformed JSON payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { event, data } = eventData;
  console.log(`[Paystack Webhook] Processing event: ${event}, reference: ${data?.reference}`);

  // 2. HANDLE CHARGE SUCCESSFUL (SUBSCRIPTION ACTIVATION / RENEWAL)
  if (event === "charge.success") {
    const reference = data.reference;
    const amountPaidInSubunits = data.amount; // In kobo/cents
    const currency = data.currency; // e.g. USD or GHS
    const metadata = data.metadata || {};
    const organizationId = metadata.organization_id;
    const requestedPlanId = metadata.plan_id; // 'starter', 'professional', or 'business'
    const billingCycle = metadata.billing_cycle || "monthly";

    if (!organizationId || !requestedPlanId) {
      console.warn("[Paystack Webhook] Missing organization_id or plan_id in transaction metadata");
      return new Response(JSON.stringify({ message: "Acknowledged without metadata" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. IDEMPOTENCY CHECK: Prevent duplicate processing of the same payment reference
    const { data: existingRecord } = await supabaseAdmin
      .from("billing_records")
      .select("id")
      .eq("payment_reference", reference)
      .maybeSingle();

    if (existingRecord) {
      console.log(`[Paystack Webhook] Reference ${reference} was already processed. Skipping duplicate.`);
      return new Response(JSON.stringify({ status: "already_processed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. VERIFY PLAN PRICING FROM TRUSTED DATABASE
    const { data: planRecord, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("id", requestedPlanId)
      .single();

    if (planError || !planRecord) {
      console.error(`[Paystack Webhook] Unknown plan_id: ${requestedPlanId}`);
      return new Response(JSON.stringify({ error: "Invalid subscription tier" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 5. UPDATE OR CREATE TRUSTED SUBSCRIPTION RECORD
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const { data: currentSub } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (currentSub) {
      await supabaseAdmin
        .from("subscriptions")
        .update({
          plan_id: requestedPlanId,
          status: "active",
          amount: amountPaidInSubunits / 100,
          currency: currency,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          payment_reference: reference,
          cancel_at_period_end: false,
        })
        .eq("id", currentSub.id);
    } else {
      await supabaseAdmin.from("subscriptions").insert({
        organization_id: organizationId,
        plan_id: requestedPlanId,
        status: "active",
        amount: amountPaidInSubunits / 100,
        currency: currency,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        payment_reference: reference,
        cancel_at_period_end: false,
      });
    }

    // 6. UPDATE ORGANIZATION PLAN_ID
    await supabaseAdmin
      .from("organizations")
      .update({ plan_id: requestedPlanId, status: "active" })
      .eq("id", organizationId);

    // 7. RECORD IMMUTABLE BILLING RECEIPT
    await supabaseAdmin.from("billing_records").insert({
      organization_id: organizationId,
      invoice_number: `PSTK-INV-${reference.slice(-8).toUpperCase()}`,
      amount: amountPaidInSubunits / 100,
      currency: currency,
      plan_name: planRecord.name,
      billing_cycle: billingCycle,
      status: "paid",
      payment_method: "Paystack Gateway",
      payment_reference: reference,
      paid_at: now.toISOString(),
      created_at: now.toISOString(),
    });

    // 8. APPEND AUDIT TRAIL
    await supabaseAdmin.from("audit_logs").insert({
      organization_id: organizationId,
      action: "UPDATE",
      table_name: "subscriptions",
      record_id: reference,
      user_email: "system.paystack@aquaflow.com",
      change_details: {
        event: "subscription_upgraded_via_webhook",
        plan: requestedPlanId,
        amount: amountPaidInSubunits / 100,
        currency,
        reference,
      },
    });

    console.log(`[Paystack Webhook] Successfully activated ${requestedPlanId} for organization ${organizationId}`);
    return new Response(JSON.stringify({ status: "success", plan: requestedPlanId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 9. HANDLE PAYMENT FAILURE OR SUBSCRIPTION CANCELLATION
  if (event === "invoice.payment_failed") {
    const reference = data.reference;
    const metadata = data.metadata || {};
    const organizationId = metadata.organization_id;

    if (organizationId) {
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("organization_id", organizationId);

      await supabaseAdmin.from("audit_logs").insert({
        organization_id: organizationId,
        action: "UPDATE",
        table_name: "subscriptions",
        record_id: reference || "failed_payment",
        user_email: "system.paystack@aquaflow.com",
        change_details: {
          event: "subscription_payment_failed",
          reason: data.gateway_response,
        },
      });
    }

    return new Response(JSON.stringify({ status: "recorded_failure" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ status: "unhandled_event", event }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
