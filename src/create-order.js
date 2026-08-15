// src/create-order.js
// POST /api/create-order — Body: { url: string }
// Creates a Razorpay order for unlocking the full audit report.
// Required secrets: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
// Optional var: AUDIT_PRICE_PAISE (default 49900 = ₹499)

import { corsHeaders } from "./worker.js";

export async function handleCreateOrder(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const url = normalizeUrl(body.url);
  if (!url) return json({ error: "Enter a valid website URL." }, 400);

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

  const amountPaise = parseInt(env.AUDIT_PRICE_PAISE || "49900", 10);
  if (!Number.isInteger(amountPaise) || amountPaise < 100) {
    return json({ error: "Payment amount is not configured correctly." }, 500);
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
        amount: amountPaise,
        currency: "INR",
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
  if (!order?.id || order.amount !== amountPaise || order.currency !== "INR") {
    return json({ error: "Payment service returned an invalid order." }, 502);
  }

  await env.AUDIT_KV.put(
    `razorpay-order:${order.id}`,
    JSON.stringify({ url, amount: amountPaise, currency: "INR" }),
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
