// src/verify-payment.js
// POST /api/verify-payment — Body: { orderId, paymentId, signature, url }
// Verifies the Razorpay HMAC signature, then issues a one-time unlock
// token (KV, 24h validity) that /api/audit accepts for the full report.
// Required: KV namespace AUDIT_KV, secret RAZORPAY_KEY_SECRET

import { corsHeaders } from "./worker.js";

export async function handleVerifyPayment(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const { orderId, paymentId, signature, url } = body;
  if (!orderId || !paymentId || !signature || !url) {
    return json({ error: "Missing fields." }, 400);
  }
  if (!env.RAZORPAY_KEY_SECRET || !env.AUDIT_KV) {
    return json({ error: "Payments not configured yet." }, 500);
  }

  const expected = await hmacSha256Hex(`${orderId}|${paymentId}`, env.RAZORPAY_KEY_SECRET);
  if (expected !== signature) {
    return json({ error: "Payment verification failed." }, 400);
  }

  const token = crypto.randomUUID();
  await env.AUDIT_KV.put(`unlock:${token}`, url, { expirationTtl: 60 * 60 * 24 });

  return json({ token });
}

async function hmacSha256Hex(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
