// src/audit.js
// Fetches the target site server-side, extracts signals, runs Claude
// analysis, returns a tiered report. Called from src/worker.js for
// POST /api/audit.
//
// Required bindings (wrangler.jsonc / dashboard):
//   - KV namespace: AUDIT_KV
//   - Secret: ANTHROPIC_API_KEY

import { corsHeaders } from "./worker.js";

export async function handleAudit(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const targetUrl = normalizeUrl(body.url);
  if (!targetUrl) return json({ error: "Enter a valid website URL." }, 400);

  let tier = "free";
  if (body.token && env.AUDIT_KV) {
    const unlockedUrl = await env.AUDIT_KV.get(`unlock:${body.token}`);
    if (unlockedUrl === targetUrl) tier = "full";
  }

  if (tier === "free" && env.AUDIT_KV) {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const rlKey = `rl:${ip}:${new Date().toISOString().slice(0, 10)}`;
    const count = parseInt((await env.AUDIT_KV.get(rlKey)) || "0", 10);
    if (count >= 5) {
      return json({ error: "Daily free-audit limit reached — try again tomorrow, or unlock the full report." }, 429);
    }
    await env.AUDIT_KV.put(rlKey, String(count + 1), { expirationTtl: 60 * 60 * 24 });
  }

  let html;
  try {
    const res = await fetch(targetUrl, {
      headers: { "User-Agent": "MohitParmarAuditBot/1.0 (+https://www.mohitparmar.co.in)" },
      cf: { cacheTtl: 0 },
    });
    if (!res.ok) return json({ error: `Couldn't fetch that site (status ${res.status}). Is it public?` }, 400);
    html = await res.text();
  } catch {
    return json({ error: "Couldn't reach that URL. Check it's spelled correctly and publicly accessible." }, 400);
  }

  const signals = extractSignals(html, targetUrl);
  signals.botAccess = await checkBotAccess(targetUrl);
  signals.hasLlmsTxt = await checkLlmsTxt(targetUrl);

  const analysis = await runAiAnalysis(env, signals, tier);

  return json({
    url: targetUrl,
    tier,
    signals: tier === "full" ? signals : trimSignalsForFree(signals),
    analysis,
  });
}

function normalizeUrl(input) {
  if (!input) return null;
  let u = String(input).trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    return new URL(u).href;
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

function stripTags(str) {
  return str.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

function extractSignals(html, baseUrl) {
  const signals = {
    title: null,
    metaDescription: null,
    h1Count: 0,
    h1Texts: [],
    h2Count: 0,
    questionHeadings: 0,
    imgCount: 0,
    imgWithAlt: 0,
    hasViewportMeta: false,
    hasCanonical: false,
    jsonLdTypes: [],
    ogTags: {},
    ctaTexts: [],
    formFieldCount: 0,
    fonts: [],
    internalLinkCount: 0,
    topColors: [],
  };

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  signals.title = titleMatch ? titleMatch[1].trim() : null;

  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  signals.metaDescription = descMatch ? descMatch[1].trim() : null;

  signals.hasViewportMeta = /<meta[^>]+name=["']viewport["']/i.test(html);
  signals.hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html);

  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  signals.h1Count = h1Matches.length;
  signals.h1Texts = h1Matches.map((m) => stripTags(m[1]).trim()).slice(0, 5);

  const h2Matches = [...html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)];
  signals.h2Count = h2Matches.length;
  signals.questionHeadings = h2Matches.filter((m) => /\?\s*$/.test(stripTags(m[1]).trim())).length;

  const imgMatches = [...html.matchAll(/<img[^>]*>/gi)];
  signals.imgCount = imgMatches.length;
  signals.imgWithAlt = imgMatches.filter((m) => /alt=["'][^"']+["']/.test(m[0])).length;

  const jsonLdMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of jsonLdMatches) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) if (item["@type"]) signals.jsonLdTypes.push(item["@type"]);
    } catch {
      /* malformed JSON-LD, skip */
    }
  }

  const ogMatches = [...html.matchAll(/<meta[^>]+property=["']og:([^"']+)["'][^>]+content=["']([^"']*)["']/gi)];
  for (const m of ogMatches) signals.ogTags[m[1]] = m[2];

  const ctaMatches = [...html.matchAll(/<(?:a|button)[^>]*>([\s\S]*?)<\/(?:a|button)>/gi)];
  signals.ctaTexts = ctaMatches
    .map((m) => stripTags(m[1]).trim())
    .filter((t) => t.length > 0 && t.length < 40)
    .slice(0, 20);

  signals.formFieldCount =
    (html.match(/<input[^>]*>/gi) || []).length +
    (html.match(/<select[^>]*>/gi) || []).length +
    (html.match(/<textarea[^>]*>/gi) || []).length;

  const colorCounts = {};
  const colorMatches = html.match(/#[0-9a-fA-F]{3,6}\b|rgba?\([^)]+\)/g) || [];
  for (const c of colorMatches) {
    const key = c.toLowerCase();
    colorCounts[key] = (colorCounts[key] || 0) + 1;
  }
  signals.topColors = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([color, count]) => ({ color, count }));

  const fontSet = new Set();
  const fontMatches = [...html.matchAll(/font-family\s*:\s*([^;"'}]+)/gi)];
  for (const m of fontMatches) fontSet.add(m[1].split(",")[0].trim());
  signals.fonts = [...fontSet].slice(0, 8);

  try {
    const base = new URL(baseUrl);
    const hrefMatches = [...html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)];
    signals.internalLinkCount = hrefMatches.filter((m) => {
      try {
        return new URL(m[1], base).hostname === base.hostname;
      } catch {
        return false;
      }
    }).length;
  } catch {
    /* ignore */
  }

  return signals;
}

async function checkBotAccess(targetUrl) {
  try {
    const robotsUrl = new URL("/robots.txt", targetUrl).href;
    const res = await fetch(robotsUrl);
    if (!res.ok) return { checked: true, robotsTxtFound: false, blockedAiBots: [] };
    const text = await res.text();
    const bots = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "CCBot", "anthropic-ai"];
    const blocked = bots.filter((bot) =>
      new RegExp(`User-agent:\\s*${bot}[\\s\\S]{0,200}?Disallow:\\s*/\\s*(?:$|\\n)`, "im").test(text)
    );
    return { checked: true, robotsTxtFound: true, blockedAiBots: blocked };
  } catch {
    return { checked: false, robotsTxtFound: false, blockedAiBots: [] };
  }
}

async function checkLlmsTxt(targetUrl) {
  try {
    const res = await fetch(new URL("/llms.txt", targetUrl).href);
    return res.ok;
  } catch {
    return false;
  }
}

function trimSignalsForFree(signals) {
  return {
    title: signals.title,
    hasViewportMeta: signals.hasViewportMeta,
    h1Count: signals.h1Count,
    topColors: signals.topColors.slice(0, 3),
    imgAltCoverage: signals.imgCount ? Math.round((signals.imgWithAlt / signals.imgCount) * 100) : null,
  };
}

async function runAiAnalysis(env, signals, tier) {
  if (!env.ANTHROPIC_API_KEY) {
    return { error: "Audit engine not configured yet (missing ANTHROPIC_API_KEY)." };
  }

  const instructions =
    tier === "full"
      ? "Give a complete, detailed audit across all five categories with specific, actionable fixes. 2-4 findings per category."
      : "Give ONLY a short teaser: exactly 2 findings total (your pick of the most impactful), each 1-2 sentences, drawn from CRO and SEO only. Do NOT mention GEO, AEO, or branding in the free tier. Leave those arrays empty. End topPriorities with one line noting the full report covers CRO, SEO, GEO, AEO, and branding in depth.";

  const prompt = `You audit websites for a paid CRO/SEO/branding tool. Analyze the extracted signals below and return ONLY valid JSON (no markdown fences, no preamble) in exactly this shape:
{
  "cro": [{"finding": "", "severity": "high|medium|low", "fix": ""}],
  "seo": [{"finding": "", "severity": "high|medium|low", "fix": ""}],
  "geo": [{"finding": "", "severity": "high|medium|low", "fix": ""}],
  "aeo": [{"finding": "", "severity": "high|medium|low", "fix": ""}],
  "branding": [{"finding": "", "severity": "high|medium|low", "fix": ""}],
  "topPriorities": ["", "", ""]
}

Definitions:
- GEO (Generative Engine Optimization): getting cited by AI answer tools like ChatGPT, Perplexity, Google AI Overviews — judge on structured data, quotable/clear statements, entity clarity (org/person schema), content freshness signals.
- AEO (Answer Engine Optimization): featured snippets, voice answers — judge on question-style headings, concise answer-first paragraphs, FAQ schema, and whether AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) are blocked in robots.txt (signals.botAccess).
- branding: color palette consistency (signals.topColors — too many near-duplicate colors is a red flag), font consistency (signals.fonts), visual hierarchy cues available from the signals.

Be specific and honest — if something is already done well, don't invent a problem. Base every finding strictly on the signals given; don't guess at things you can't see (e.g. actual rendered contrast, real page-speed numbers).

${instructions}

Extracted signals:
${JSON.stringify(signals, null, 2)}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: tier === "full" ? 2200 : 400,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    return { error: "AI analysis failed, but the raw signals above are still accurate." };
  }

  const data = await res.json();
  const textBlock = (data.content || []).find((b) => b.type === "text");
  const raw = textBlock ? textBlock.text : "{}";
  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    return { error: "Couldn't parse the AI response.", raw: clean };
  }
}
