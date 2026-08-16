// POST /api/verify-razorpay
// Verifies the Standard Checkout signature and captured payment before
// issuing a short-lived audit unlock token.

import { corsHeaders } from "./worker.js";

const AUDIT_PRICES = Object.freeze({ GBP: 2000, EUR: 1000 });

export async function handleVerifyRazorpay(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const paymentId = String(body.razorpayPaymentId || "");
  const orderId = String(body.razorpayOrderId || "");
  const signature = String(body.razorpaySignature || "");

  if (!paymentId.startsWith("pay_") || !orderId.startsWith("order_") || !/^[a-f0-9]{64}$/i.test(signature)) {
    return json({ error: "Invalid payment verification details." }, 400);
  }
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET || !env.AUDIT_KV) {
    return json({ error: "Payments not configured yet." }, 500);
  }

  const storedOrder = await env.AUDIT_KV.get(`razorpay-order:${orderId}`, "json");
  if (
    !storedOrder?.url ||
    !AUDIT_PRICES[storedOrder.currency] ||
    storedOrder.amount !== AUDIT_PRICES[storedOrder.currency]
  ) {
    return json({ error: "This payment order is invalid or expired." }, 400);
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.RAZORPAY_KEY_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${orderId}|${paymentId}`))
  );
  const provided = hexToBytes(signature);
  if (!provided || !crypto.subtle.timingSafeEqual(expected, provided)) {
    return json({ error: "Payment signature verification failed." }, 400);
  }

  const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
  let paymentResponse;
  try {
    paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
  } catch {
    return json({ error: "Could not confirm payment status. Please try again." }, 502);
  }
  if (!paymentResponse.ok) {
    return json({ error: "Could not confirm this payment." }, 400);
  }

  let payment = await paymentResponse.json();
  if (
    payment.status === "authorized" &&
    payment.captured !== true &&
    payment.order_id === orderId &&
    payment.amount === storedOrder.amount &&
    payment.currency === storedOrder.currency
  ) {
    let captureResponse;
    try {
      captureResponse = await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/capture`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount: storedOrder.amount, currency: storedOrder.currency }),
        }
      );
    } catch {
      return json({ error: "Payment received. Confirmation is still pending.", retryable: true }, 202);
    }
    if (captureResponse.ok) payment = await captureResponse.json();
    else return json({ error: "Payment received. Confirmation is still pending.", retryable: true }, 202);
  }
  if (
    payment.status !== "captured" ||
    payment.captured !== true ||
    payment.order_id !== orderId ||
    payment.amount !== storedOrder.amount ||
    payment.currency !== storedOrder.currency
  ) {
    return json({ error: "Payment received. Confirmation is still pending.", retryable: true }, 202);
  }

  const token = crypto.randomUUID();
  await env.AUDIT_KV.put(`unlock:${token}`, storedOrder.url, { expirationTtl: 60 * 60 * 24 });
  await env.AUDIT_KV.delete(`razorpay-order:${orderId}`);
  return json({ token, url: storedOrder.url });
}

function hexToBytes(hex) {
  if (!/^[a-f0-9]{64}$/i.test(hex)) return null;
  const bytes = new Uint8Array(32);
  for (let index = 0; index < 32; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
