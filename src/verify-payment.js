// src/verify-payment.js
// POST /api/verify-payment — Body: { transactionId, url }
//
// The client already ran Paddle's overlay checkout and got a
// transaction ID back from the eventCallback. We don't trust that
// client-side "it succeeded" claim on its own — we ask Paddle's API
// directly whether that transaction is actually paid, and that it was
// for the URL the visitor is trying to unlock (checked via custom_data,
// which the frontend sets when opening checkout).
//
// Required: KV namespace AUDIT_KV, secret PADDLE_API_KEY

import { corsHeaders } from "./worker.js";

export async function handleVerifyPayment(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const { transactionId, url } = body;
  if (!transactionId || !url) {
    return json({ error: "Missing fields." }, 400);
  }
  if (!env.PADDLE_API_KEY || !env.AUDIT_KV) {
    return json({ error: "Payments not configured yet." }, 500);
  }

  const paddleApiBase = env.PADDLE_API_BASE || "https://api.paddle.com";

  let res;
  try {
    res = await fetch(`${paddleApiBase}/transactions/${encodeURIComponent(transactionId)}`, {
      headers: { Authorization: `Bearer ${env.PADDLE_API_KEY}` },
    });
  } catch {
    return json({ error: "Couldn't reach Paddle to verify the payment. Try again in a moment." }, 502);
  }

  if (!res.ok) {
    return json({ error: "Couldn't verify that transaction with Paddle." }, 400);
  }

  const responseBody = await res.json();
  const txn = responseBody?.data;

  if (!txn || txn.status !== "completed") {
    return json({ error: "Payment not confirmed yet. If you just paid, wait a moment and try again." }, 402);
  }

  // The frontend sets customData.audit_url when opening checkout — make
  // sure this transaction was actually for the URL being unlocked, not
  // a different one reused by a stale/copied transaction ID.
  const paidUrl = txn.custom_data?.audit_url;
  if (paidUrl !== url) {
    return json({ error: "This payment doesn't match the URL you're trying to unlock." }, 400);
  }

  const token = crypto.randomUUID();
  await env.AUDIT_KV.put(`unlock:${token}`, url, { expirationTtl: 60 * 60 * 24 });

  return json({ token });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
