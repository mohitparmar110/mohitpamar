// src/create-order.js
// POST /api/create-order — Body: { url: string, currency?: "GBP" | "EUR" }
// Creates a Razorpay order for unlocking the full audit report.
// Required secrets: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET

import { corsHeaders } from "./worker.js";

const PRICE_OPTIONS = Object.freeze({ GBP: 2000, EUR: 1000 });

export async function handleCreateOrder(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const url = normalizeUrl(body.url);
  if (!url) return json({ error: "Enter a valid website URL." }, 400);
  const currency = String(body.currency || "GBP").toUpperCase();
  const amount = PRICE_OPTIONS[currency];
  if (!amount) return json({ error: "Choose GBP or EUR for this audit." }, 400);

  const missingBindings = [];
  if (!env.RAZORPAY_KEY_ID) missingBindings.push("RAZORPAY_KEY_ID");
  if (!env.RAZORPAY_KEY_SECRET) missingBindings.push("RAZORPAY_KEY_SECRET");
  if (!env.AUDIT_KV) missingBindings.push("AUDIT_KV");
  if (missingBindings.length) {
    return json(
      { error: `Payments not configured: ${missingBindings.join(", ")}.` },
      500
    );
  }

  const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);

  let res;
  try {
    res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt: `audit_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`,
        notes: { audit_url: url },
      }),
    });
  } catch {
    return json({ error: "Could not reach the payment service. Please try again." }, 502);
  }

  if (!res.ok) {
    return json({ error: "Could not create payment order. Please try again." }, 502);
  }

  const order = await res.json();
  if (!order?.id || order.amount !== amount || order.currency !== currency) {
    return json({ error: "Payment service returned an invalid order." }, 502);
  }

  await env.AUDIT_KV.put(
    `razorpay-order:${order.id}`,
    JSON.stringify({ url, amount, currency }),
    { expirationTtl: 60 * 60 }
  );

  return json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: env.RAZORPAY_KEY_ID,
  });
}

function normalizeUrl(input) {
  if (!input) return null;
  let value = String(input).trim();
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    return new URL(value).href;
  } catch {
    return null;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
