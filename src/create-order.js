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

  const url = body.url;
  if (!url) return json({ error: "Missing url." }, 400);

  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return json({ error: "Payments not configured yet." }, 500);
  }

  const amountPaise = parseInt(env.AUDIT_PRICE_PAISE || "49900", 10);
  const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      notes: { audit_url: url },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return json({ error: "Could not create payment order.", detail }, 502);
  }

  const order = await res.json();
  return json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: env.RAZORPAY_KEY_ID,
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
