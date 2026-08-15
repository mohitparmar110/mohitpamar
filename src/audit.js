// src/audit.js
// Fetches the target site server-side, extracts signals, runs the AI
// analysis, returns the report. Called from src/worker.js for
// POST /api/audit.
//
// Paid only — every request must carry a valid unlock token issued by
// /api/verify-payment. There is no free tier.
//
// Required bindings (wrangler.jsonc / dashboard):
//   - KV namespace: AUDIT_KV
//   - Secret: GEMINI_API_KEY   (from https://aistudio.google.com/apikey)
//   - Optional var: GEMINI_MODEL (defaults to gemini-3.6-flash)

import { corsHeaders } from "./worker.js";
import { calculateEvidenceScores, collectCrux, collectPageSpeed } from "./pagespeed.js";

// Supported report languages. Keep in sync with the frontend's
// language list in public/audit-tool.html.
const SUPPORTED_LANGS = { en: "English", fr: "French", de: "German", es: "Spanish", it: "Italian", nl: "Dutch", pt: "Portuguese", pl: "Polish" };

export async function handleAudit(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const targetUrl = normalizeUrl(body.url);
  if (!targetUrl) return json({ error: "Enter a valid website URL." }, 400);
  const competitorUrls = [...new Set((Array.isArray(body.competitorUrls) ? body.competitorUrls : [])
    .map(normalizeUrl)
    .filter((url) => url && url !== targetUrl))].slice(0, 3);

  const lang = SUPPORTED_LANGS[body.lang] ? body.lang : "en";

  if (!body.token || !env.AUDIT_KV) {
    return json({ error: "Payment required. Unlock a report for this URL first." }, 402);
  }
  const unlockedUrl = await env.AUDIT_KV.get(`unlock:${body.token}`);
  if (unlockedUrl !== targetUrl) {
    return json({ error: "This unlock token is invalid, expired, or doesn't match this URL." }, 402);
  }

  let html;
  try {
    html = await fetchHtml(targetUrl);
  } catch {
    return json({ error: "Couldn't reach that URL. Check it's spelled correctly and publicly accessible." }, 400);
  }

  const signals = extractSignals(html, targetUrl);
  const [botAccess, hasLlmsTxt, mobile, desktop, mobileCrux, desktopCrux, competitors] = await Promise.all([
    checkBotAccess(targetUrl),
    checkLlmsTxt(targetUrl),
    collectPageSpeed(targetUrl, env, "mobile"),
    collectPageSpeed(targetUrl, env, "desktop"),
    collectCrux(targetUrl, env, "PHONE"),
    collectCrux(targetUrl, env, "DESKTOP"),
    Promise.all(competitorUrls.map((url) => collectCompetitor(url, env))),
  ]);
  signals.botAccess = botAccess;
  signals.hasLlmsTxt = hasLlmsTxt;

  if (mobileCrux.available) mobile.field = mobileCrux;
  if (desktopCrux.available) desktop.field = desktopCrux;
  const pageSpeed = { mobile, desktop, fieldData: { mobile: mobileCrux, desktop: desktopCrux } };
  const scores = calculateEvidenceScores(signals, pageSpeed);
  const evidence = { signals, pageSpeed, scores, competitors };

  const analysis = await runAiAnalysis(env, evidence, lang);

  return json({
    url: targetUrl,
    lang,
    generatedAt: new Date().toISOString(),
    signals,
    pageSpeed,
    scores,
    competitors,
    analysis,
  });
}

function normalizeUrl(input) {
  if (!input) return null;
  let u = String(input).trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    const parsed = new URL(u);
    if (!/^https?:$/.test(parsed.protocol) || isPrivateHost(parsed.hostname)) return null;
    parsed.hash = "";
    return parsed.href;
  } catch {
    return null;
  }
}

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase();
  return host === "localhost" || host.endsWith(".local") || host === "0.0.0.0" || host === "127.0.0.1" ||
    host === "::1" || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
}

async function fetchHtml(targetUrl) {
  const response = await fetch(targetUrl, {
    headers: { "User-Agent": "MohitParmarAuditBot/1.0 (+https://www.mohitparmar.co.in)" },
    cf: { cacheTtl: 0 },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) throw new Error("Not HTML");
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > 1_500_000) throw new Error("Page too large");
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let html = "";
  while (bytes < 1_500_000) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 1_500_000) {
      await reader.cancel();
      break;
    }
    html += decoder.decode(value, { stream: true });
  }
  return html + decoder.decode();
}

async function collectCompetitor(url, env) {
  try {
    const [html, pageSpeed] = await Promise.all([
      fetchHtml(url),
      collectPageSpeed(url, env, "mobile"),
    ]);
    const signals = extractSignals(html, url);
    const [botAccess, hasLlmsTxt] = await Promise.all([checkBotAccess(url), checkLlmsTxt(url)]);
    signals.botAccess = botAccess;
    signals.hasLlmsTxt = hasLlmsTxt;
    return {
      url,
      available: true,
      scores: calculateEvidenceScores(signals, { mobile: pageSpeed }),
      performance: pageSpeed,
      summary: {
        title: signals.title,
        h1Count: signals.h1Count,
        structuredData: signals.jsonLdTypes,
        blockedAiBots: signals.botAccess?.blockedAiBots || [],
      },
    };
  } catch {
    return { url, available: false, error: "Competitor could not be measured." };
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

// --- Gemini ----------------------------------------------------------

const FINDING_ARRAY = {
  type: "array",
  items: {
    type: "object",
    properties: {
      finding: { type: "string" },
      severity: { type: "string", enum: ["high", "medium", "low"] },
      fix: { type: "string" },
    },
    required: ["finding", "severity", "fix"],
  },
};

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    cro: FINDING_ARRAY,
    seo: FINDING_ARRAY,
    geo: FINDING_ARRAY,
    aeo: FINDING_ARRAY,
    branding: FINDING_ARRAY,
    topPriorities: { type: "array", items: { type: "string" } },
  },
  required: ["cro", "seo", "geo", "aeo", "branding", "topPriorities"],
};

async function runAiAnalysis(env, evidence, lang) {
  if (!env.GEMINI_API_KEY) {
    return { error: "Audit engine not configured yet (missing GEMINI_API_KEY)." };
  }

  const model = env.GEMINI_MODEL || "gemini-3.6-flash";
  const langName = SUPPORTED_LANGS[lang] || "English";

  const prompt = `You audit websites for a paid CRO/SEO/branding tool. Analyze the extracted signals below and give a complete, detailed audit across all five categories with specific, actionable fixes — 2-4 findings per category.

Definitions:
- GEO (Generative Engine Optimization): getting cited by AI answer tools like ChatGPT, Perplexity, Google AI Overviews — judge on structured data, quotable statements, entity clarity, llms.txt, and crawler access.
- AEO (Answer Engine Optimization): featured snippets and voice answers — judge on question-style headings, concise answer-first structure, FAQ schema, and AI crawler access.
- branding: colour palette consistency, font consistency, and visual hierarchy cues available from the extracted HTML.
- performance: use only the measured PageSpeed values supplied. Lab data and field data are different; never present lab measurements as real-user Core Web Vitals.
- competitors: compare only submitted competitor URLs and their measured evidence. Do not infer market share, traffic, revenue, rankings, or commercial performance.

Be specific and honest — if something is already done well, don't invent a problem. Base every finding strictly on the evidence given. Never invent measurements or claim traffic, rankings, revenue, or conversion impact.

Write every "finding" and "fix" string in ${langName} (language code: ${lang}). Keep "severity" values as the literal English words high/medium/low regardless of language, since the frontend matches on those exact strings.

Measured and extracted evidence:
${JSON.stringify(evidence, null, 2)}`;

  let res;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            maxOutputTokens: 2400,
            temperature: 0.4,
          },
        }),
      }
    );
  } catch {
    return { error: "Couldn't reach the AI service. The raw signals above are still accurate." };
  }

  if (!res.ok) {
    let detail = "";
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message || "";
    } catch {
      /* non-JSON error body */
    }
    return {
      error: `AI analysis failed (status ${res.status}). The raw signals above are still accurate.`,
      detail: detail.slice(0, 200),
    };
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  if (!candidate) {
    return { error: "AI returned no analysis. The raw signals above are still accurate." };
  }
  if (candidate.finishReason && candidate.finishReason !== "STOP") {
    return { error: `AI stopped early (${candidate.finishReason}). Please try again.` };
  }

  const text = (candidate.content?.parts || []).map((p) => p.text || "").join("");
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Couldn't parse the AI response.", raw: text.slice(0, 500) };
  }
}
