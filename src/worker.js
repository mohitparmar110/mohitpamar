// src/worker.js
// Single Worker entry point. By default, Cloudflare tries to serve a
// matching file from the `public/` asset directory FIRST — this script
// only runs when no static file matched the request. That means our
// /api/* routes reach this handler naturally, with zero extra routing
// config needed (no run_worker_first required).
//
import { handleAudit } from "./audit.js";
import { handleCreateOrder } from "./create-order.js";
import { handleVerifyRazorpay } from "./verify-razorpay.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === "/api/audit" && request.method === "POST") {
      return handleAudit(request, env);
    }
    if (url.pathname === "/api/create-order" && request.method === "POST") {
      return handleCreateOrder(request, env);
    }
    if (url.pathname === "/api/verify-razorpay" && request.method === "POST") {
      return handleVerifyRazorpay(request, env);
    }

    // Reaching this point means: no static asset matched, AND no API
    // route matched. Genuine 404.
    return new Response("Not found", { status: 404 });
  },
};

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
