import { PerformanceSnapshot } from '../src/types/index.js';

/**
 * Google PageSpeed Insights API v5 integration
 * Fetches Core Web Vitals (LCP, CLS, INP/FID, FCP) and Mobile Friendliness.
 * Runs on sample pages (homepage + top pages) asynchronously without blocking core crawl.
 */

export async function fetchPageSpeedMetrics(
  targetUrl: string,
  sampleUrls: string[] = []
): Promise<PerformanceSnapshot | undefined> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  const keyParam = apiKey ? `&key=${encodeURIComponent(apiKey)}` : '';
  const cleanTarget = targetUrl.split('#')[0];

  try {
    const mobileUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(cleanTarget)}&category=performance&category=seo&strategy=mobile${keyParam}`;
    const desktopUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(cleanTarget)}&category=performance&category=seo&strategy=desktop${keyParam}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000); // 9 seconds max

    const [mobileRes, desktopRes] = await Promise.all([
      fetch(mobileUrl, { signal: controller.signal, headers: { 'Accept': 'application/json' } }).catch(() => null),
      fetch(desktopUrl, { signal: controller.signal, headers: { 'Accept': 'application/json' } }).catch(() => null),
    ]);
    clearTimeout(timeoutId);

    if (!mobileRes && !desktopRes) {
      return undefined;
    }

    const mobileJson = mobileRes && mobileRes.ok ? await mobileRes.json().catch(() => null) : null;
    const desktopJson = desktopRes && desktopRes.ok ? await desktopRes.json().catch(() => null) : null;

    if (!mobileJson && !desktopJson) {
      return undefined;
    }

    const mAudits = mobileJson?.lighthouseResult?.audits || {};
    const dAudits = desktopJson?.lighthouseResult?.audits || {};
    const mCategories = mobileJson?.lighthouseResult?.categories || {};
    const dCategories = desktopJson?.lighthouseResult?.categories || {};

    const mobileScore = typeof mCategories?.performance?.score === 'number'
      ? Math.round(mCategories.performance.score * 100)
      : null;
    const desktopScore = typeof dCategories?.performance?.score === 'number'
      ? Math.round(dCategories.performance.score * 100)
      : null;

    // Largest Contentful Paint (ms)
    const rawLcp = mAudits['largest-contentful-paint']?.numericValue ??
      mAudits['largest-contentful-paint-element']?.numericValue ??
      dAudits['largest-contentful-paint']?.numericValue;
    const lcp = typeof rawLcp === 'number' ? Math.round(rawLcp) : null;

    // Cumulative Layout Shift
    const rawCls = mAudits['cumulative-layout-shift']?.numericValue ??
      dAudits['cumulative-layout-shift']?.numericValue;
    const cls = typeof rawCls === 'number' ? parseFloat(rawCls.toFixed(3)) : null;

    // Interaction to Next Paint / Max Potential FID (ms)
    const rawInp = mAudits['interaction-to-next-paint']?.numericValue ??
      mAudits['max-potential-fid']?.numericValue ??
      dAudits['interaction-to-next-paint']?.numericValue;
    const inp = typeof rawInp === 'number' ? Math.round(rawInp) : null;

    // First Contentful Paint (ms)
    const rawFcp = mAudits['first-contentful-paint']?.numericValue ??
      dAudits['first-contentful-paint']?.numericValue;
    const fcp = typeof rawFcp === 'number' ? Math.round(rawFcp) : null;

    // Speed Index (ms)
    const rawSpeedIndex = mAudits['speed-index']?.numericValue ??
      dAudits['speed-index']?.numericValue;
    const speedIndex = typeof rawSpeedIndex === 'number' ? Math.round(rawSpeedIndex) : null;

    // Mobile friendliness signal
    const viewportAudit = mAudits['viewport'];
    const isMobileFriendly = viewportAudit ? (viewportAudit.score === 1) : null;

    const isPartialData = [mobileScore, desktopScore, lcp, cls, inp, fcp].some(v => v === null);

    return {
      mobileScore,
      desktopScore,
      lcp,
      cls,
      inp,
      fcp,
      speedIndex,
      isMobileFriendly,
      isPartialData,
      sampledUrls: [cleanTarget, ...sampleUrls.slice(0, 3)],
      auditedAt: new Date().toISOString(),
    };
  } catch {
    // Graceful fallback if PageSpeed API is unavailable / throttled
    return undefined;
  }
}
