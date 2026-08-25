import { PerformanceSnapshot } from '../src/types/index.js';

/**
 * Google PageSpeed Insights API v5 integration
 * Fetches Core Web Vitals (LCP, CLS, INP/FID, FCP) and Mobile Friendliness.
 * Runs on sample pages (homepage + top pages) with comprehensive diagnostics.
 */

// In-memory cache for PageSpeed audits (TTL: 1 hour)
interface PageSpeedCacheEntry {
  snapshot: PerformanceSnapshot;
  cachedAt: number;
}
const pageSpeedCache = new Map<string, PageSpeedCacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function fetchPageSpeedMetrics(
  targetUrl: string,
  sampleUrls: string[] = [],
  forceFresh = false
): Promise<PerformanceSnapshot> {
  // Support multiple common environment variable names for the API key
  const apiKey =
    process.env.PAGESPEED_API_KEY ||
    process.env.PAGESPEEDAPI ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    '';
  const hasApiKey = Boolean(apiKey && apiKey.trim().length > 0);
  const keyParam = hasApiKey ? `&key=${encodeURIComponent(apiKey.trim())}` : '';
  const cleanTarget = targetUrl.split('#')[0];

  // 1. Check in-memory cache if not forcing fresh audit
  if (!forceFresh) {
    const cached = pageSpeedCache.get(cleanTarget);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.snapshot;
    }
  }

  let errorReason: PerformanceSnapshot['errorReason'] = undefined;
  let errorDetails: string | undefined = undefined;

  try {
    const mobileUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(cleanTarget)}&category=performance&category=seo&strategy=mobile${keyParam}`;
    const desktopUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(cleanTarget)}&category=performance&category=seo&strategy=desktop${keyParam}`;

    const controller = new AbortController();
    // 40 seconds timeout for full Lighthouse audits from Google PageSpeed Insights
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    let mobileTimedOut = false;
    let desktopTimedOut = false;

    const [mobileRes, desktopRes] = await Promise.all([
      fetch(mobileUrl, { signal: controller.signal, headers: { 'Accept': 'application/json' } }).catch((err) => {
        if (err?.name === 'AbortError') mobileTimedOut = true;
        console.warn(`[PageSpeed Mobile] Fetch error for ${cleanTarget}:`, err?.name === 'AbortError' ? 'Timeout (40s)' : err?.message || err);
        return null;
      }),
      fetch(desktopUrl, { signal: controller.signal, headers: { 'Accept': 'application/json' } }).catch((err) => {
        if (err?.name === 'AbortError') desktopTimedOut = true;
        console.warn(`[PageSpeed Desktop] Fetch error for ${cleanTarget}:`, err?.name === 'AbortError' ? 'Timeout (40s)' : err?.message || err);
        return null;
      }),
    ]);
    clearTimeout(timeoutId);

    // Track status code and diagnostic errors if any failed
    let statusCode: number | null = null;
    let rawErrorText = '';

    if (mobileRes && !mobileRes.ok) {
      statusCode = mobileRes.status;
      rawErrorText = await mobileRes.text().catch(() => '');
      console.warn(`[PageSpeed Mobile] Response not OK (${mobileRes.status}):`, rawErrorText.slice(0, 300));
    } else if (desktopRes && !desktopRes.ok) {
      statusCode = desktopRes.status;
      rawErrorText = await desktopRes.text().catch(() => '');
      console.warn(`[PageSpeed Desktop] Response not OK (${desktopRes.status}):`, rawErrorText.slice(0, 300));
    }

    // Try parsing Google API structured error JSON
    let extractedMessage = '';
    if (rawErrorText) {
      try {
        const parsed = JSON.parse(rawErrorText);
        extractedMessage = parsed?.error?.message || parsed?.message || '';
      } catch {
        extractedMessage = rawErrorText.slice(0, 200);
      }
    }

    // Classify error reasons
    if (statusCode === 401 || statusCode === 403) {
      errorReason = 'AUTH_ERROR';
      errorDetails = extractedMessage || 'Google API Key ditolak (403/401). Pastikan PageSpeed Insights API telah di-enable di Google Cloud Console dan Application restrictions diset ke None.';
    } else if (statusCode === 429) {
      if (!hasApiKey) {
        errorReason = 'PUBLIC_QUOTA_EXHAUSTED';
        errorDetails = 'Kuota publik Google PSI habis karena IP shared serverless Vercel dibatasi. Tambahkan PAGESPEED_API_KEY di Vercel Environment Variables.';
      } else {
        errorReason = 'RATE_LIMITED';
        errorDetails = extractedMessage || 'Batas kuota harian atau rate-limit PageSpeed API tercapai (429).';
      }
    } else if (mobileTimedOut && desktopTimedOut) {
      errorReason = 'TIMEOUT';
      errorDetails = 'Permintaan ke Google PageSpeed Insights melebihi batas waktu 40 detik.';
    } else if (!mobileRes && !desktopRes) {
      errorReason = 'UNREACHABLE';
      errorDetails = 'Tidak dapat menghubungi server Google PageSpeed Insights (koneksi jaringan terputus).';
    } else if (statusCode && statusCode >= 500) {
      errorReason = 'UNKNOWN';
      errorDetails = `Server Google PSI mengembalikan status ${statusCode}: ${extractedMessage}`;
    }

    const mobileJson = mobileRes && mobileRes.ok ? await mobileRes.json().catch(() => null) : null;
    const desktopJson = desktopRes && desktopRes.ok ? await desktopRes.json().catch(() => null) : null;

    if (!mobileJson && !desktopJson) {
      // If no specific error code was set but no data returned
      if (!errorReason) {
        if (!hasApiKey) {
          errorReason = 'PUBLIC_QUOTA_EXHAUSTED';
          errorDetails = 'Data Core Web Vitals tidak dapat diambil. Tambahkan PAGESPEED_API_KEY di Vercel Environment Variables.';
        } else {
          errorReason = 'UNKNOWN';
          errorDetails = 'Respons Google PageSpeed Insights tidak valid.';
        }
      }

      const emptySnapshot: PerformanceSnapshot = {
        mobileScore: null,
        desktopScore: null,
        lcp: null,
        cls: null,
        inp: null,
        fcp: null,
        speedIndex: null,
        isMobileFriendly: null,
        isPartialData: true,
        sampledUrls: [cleanTarget, ...sampleUrls.slice(0, 3)],
        auditedAt: new Date().toISOString(),
        errorReason,
        errorDetails,
        hasApiKey,
      };
      return emptySnapshot;
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

    const snapshot: PerformanceSnapshot = {
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
      errorReason: undefined,
      errorDetails: undefined,
      hasApiKey,
    };

    // Save successful / partial snapshot to cache
    pageSpeedCache.set(cleanTarget, { snapshot, cachedAt: Date.now() });

    return snapshot;
  } catch (err: any) {
    console.error(`[PageSpeed] Unexpected exception while analyzing ${cleanTarget}:`, err?.message || err);
    return {
      mobileScore: null,
      desktopScore: null,
      lcp: null,
      cls: null,
      inp: null,
      fcp: null,
      speedIndex: null,
      isMobileFriendly: null,
      isPartialData: true,
      sampledUrls: [cleanTarget, ...sampleUrls.slice(0, 3)],
      auditedAt: new Date().toISOString(),
      errorReason: 'UNKNOWN',
      errorDetails: err?.message || 'Terjadi kesalahan sistem saat mengeksekusi audit PageSpeed.',
      hasApiKey,
    };
  }
}

