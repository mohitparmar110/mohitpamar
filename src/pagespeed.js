const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const CRUX_ENDPOINT = "https://chromeuxreport.googleapis.com/v1/records:queryRecord";
const CRUX_METRICS = [
  "largest_contentful_paint",
  "interaction_to_next_paint",
  "cumulative_layout_shift",
  "first_contentful_paint",
  "experimental_time_to_first_byte",
];

export async function collectCrux(targetUrl, env, formFactor = "PHONE") {
  if (!env.PAGESPEED_API_KEY) {
    return { available: false, error: "CrUX measurement is not configured." };
  }

  const endpoint = new URL(CRUX_ENDPOINT);
  endpoint.searchParams.set("key", env.PAGESPEED_API_KEY);
  const url = new URL(targetUrl);
  const queries = [
    { url: targetUrl, formFactor, metrics: CRUX_METRICS },
    { origin: url.origin, formFactor, metrics: CRUX_METRICS },
  ];

  for (const [index, query] of queries.entries()) {
    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      return { available: false, error: "CrUX measurement timed out." };
    }

    if (response.status === 404 && index === 0) continue;
    if (response.status === 404) {
      return { available: false, insufficientData: true, error: "Not enough real-user traffic for CrUX data." };
    }
    if (!response.ok) {
      return { available: false, error: `CrUX measurement failed (${response.status}).` };
    }

    const data = await response.json();
    const record = data.record || {};
    const metrics = record.metrics || {};
    return {
      available: true,
      source: "Chrome UX Report",
      scope: query.url ? "url" : "origin",
      formFactor,
      collectionPeriod: record.collectionPeriod || null,
      lcpMs: cruxP75(metrics.largest_contentful_paint),
      inpMs: cruxP75(metrics.interaction_to_next_paint),
      cls: cruxP75(metrics.cumulative_layout_shift, 3),
      fcpMs: cruxP75(metrics.first_contentful_paint),
      ttfbMs: cruxP75(metrics.experimental_time_to_first_byte),
    };
  }
}

export async function collectPageSpeed(targetUrl, env, strategy = "mobile") {
  const requestUrl = new URL(ENDPOINT);
  requestUrl.searchParams.set("url", targetUrl);
  requestUrl.searchParams.set("strategy", strategy);
  requestUrl.searchParams.set("locale", "en");
  for (const category of ["performance", "accessibility", "best-practices", "seo"]) {
    requestUrl.searchParams.append("category", category);
  }
  if (env.PAGESPEED_API_KEY) requestUrl.searchParams.set("key", env.PAGESPEED_API_KEY);

  let response;
  try {
    response = await fetch(requestUrl, { signal: AbortSignal.timeout(55_000) });
  } catch {
    return { strategy, available: false, error: "PageSpeed measurement timed out." };
  }
  if (!response.ok) {
    return { strategy, available: false, error: `PageSpeed measurement failed (${response.status}).` };
  }

  const data = await response.json();
  const lighthouse = data.lighthouseResult || {};
  const categories = lighthouse.categories || {};
  const audits = lighthouse.audits || {};
  const field = data.loadingExperience?.metrics || data.originLoadingExperience?.metrics || {};

  return {
    strategy,
    available: true,
    fetchedAt: lighthouse.fetchTime || new Date().toISOString(),
    testedUrl: lighthouse.finalDisplayedUrl || lighthouse.finalUrl || targetUrl,
    scores: {
      performance: score(categories.performance?.score),
      accessibility: score(categories.accessibility?.score),
      bestPractices: score(categories["best-practices"]?.score),
      seo: score(categories.seo?.score),
    },
    lab: {
      fcpMs: numeric(audits["first-contentful-paint"]?.numericValue),
      lcpMs: numeric(audits["largest-contentful-paint"]?.numericValue),
      tbtMs: numeric(audits["total-blocking-time"]?.numericValue),
      cls: numeric(audits["cumulative-layout-shift"]?.numericValue, 3),
      speedIndexMs: numeric(audits["speed-index"]?.numericValue),
      ttiMs: numeric(audits.interactive?.numericValue),
      ttfbMs: numeric(audits["server-response-time"]?.numericValue),
    },
    field: {
      lcpMs: percentile(field.LARGEST_CONTENTFUL_PAINT_MS),
      inpMs: percentile(field.INTERACTION_TO_NEXT_PAINT),
      cls: percentile(field.CUMULATIVE_LAYOUT_SHIFT_SCORE, 100),
      fcpMs: percentile(field.FIRST_CONTENTFUL_PAINT_MS),
      ttfbMs: percentile(field.EXPERIMENTAL_TIME_TO_FIRST_BYTE),
      overallCategory: data.loadingExperience?.overall_category || data.originLoadingExperience?.overall_category || null,
    },
    opportunities: Object.values(audits)
      .filter((audit) => audit?.details?.type === "opportunity" && Number(audit.details.overallSavingsMs) > 0)
      .sort((a, b) => Number(b.details.overallSavingsMs) - Number(a.details.overallSavingsMs))
      .slice(0, 6)
      .map((audit) => ({
        id: audit.id,
        title: audit.title,
        displayValue: audit.displayValue || null,
        savingsMs: Math.round(Number(audit.details.overallSavingsMs) || 0),
      })),
  };
}

export function calculateEvidenceScores(signals, pageSpeed) {
  const mobile = pageSpeed?.mobile;
  const seoFallback = points([
    [signals.title, 15], [signals.metaDescription, 15], [signals.h1Count === 1, 12],
    [signals.hasCanonical, 10], [signals.hasViewportMeta, 8], [signals.internalLinkCount > 0, 10],
    [signals.imgCount === 0 || signals.imgWithAlt / signals.imgCount >= 0.8, 10],
    [signals.jsonLdTypes.length > 0, 10], [Object.keys(signals.ogTags).length >= 3, 10],
  ]);
  const geo = points([
    [signals.jsonLdTypes.length > 0, 22],
    [signals.jsonLdTypes.some((type) => /organization|person|product|service/i.test(String(type))), 18],
    [signals.hasLlmsTxt, 12],
    [signals.botAccess?.checked && !signals.botAccess.blockedAiBots?.length, 18],
    [signals.metaDescription, 10], [signals.h1Count === 1, 10], [signals.internalLinkCount >= 3, 10],
  ]);
  const aeo = points([
    [signals.questionHeadings >= 2, 25],
    [signals.jsonLdTypes.some((type) => /faq|howto|product/i.test(String(type))), 20],
    [signals.h2Count >= 3, 15], [signals.metaDescription, 10],
    [signals.botAccess?.checked && !signals.botAccess.blockedAiBots?.length, 20],
    [signals.h1Count === 1, 10],
  ]);
  const cro = points([
    [signals.h1Count === 1, 20], [signals.ctaTexts.length >= 1, 25],
    [signals.ctaTexts.length <= 12, 10], [signals.formFieldCount <= 8, 10],
    [Object.keys(signals.ogTags).length >= 3, 10], [signals.hasViewportMeta, 10],
    [mobile?.scores?.accessibility >= 80, 15],
  ]);
  const branding = points([
    [signals.topColors.length >= 2 && signals.topColors.length <= 6, 30],
    [signals.fonts.length <= 3, 25], [signals.title, 15],
    [Object.keys(signals.ogTags).length >= 3, 15], [signals.imgCount > 0, 15],
  ]);
  return {
    performance: mobile?.scores?.performance ?? null,
    seo: mobile?.scores?.seo ?? seoFallback,
    geo,
    aeo,
    cro,
    branding,
  };
}

function score(value) {
  return typeof value === "number" ? Math.round(value * 100) : null;
}

function numeric(value, decimals = 0) {
  return Number.isFinite(value) ? Number(Number(value).toFixed(decimals)) : null;
}

function percentile(metric, divisor = 1) {
  return Number.isFinite(metric?.percentile) ? Number((metric.percentile / divisor).toFixed(divisor === 1 ? 0 : 3)) : null;
}

function cruxP75(metric, decimals = 0) {
  const value = Number(metric?.percentiles?.p75);
  return Number.isFinite(value) ? Number(value.toFixed(decimals)) : null;
}

function points(entries) {
  return Math.min(100, entries.reduce((total, [condition, value]) => total + (condition ? value : 0), 0));
}
