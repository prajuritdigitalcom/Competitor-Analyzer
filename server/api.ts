import express, { Request, Response, Router } from 'express';
import { assembleReport, computeContentGap } from './analyzer.js';
import { crawlWebsite } from './crawler.js';
import { kwinsideProvider } from './kwinside.js';
import { validateAndNormalizeUrl, validateAndNormalizeUrlAsync } from './ssrf.js';

export const apiRouter: Router = express.Router();

// Rate limiter in-memory helper per IP with configurable limit and bucket
// Note: In a multi-instance/autoscaling environment, this acts as a best-effort per-instance rate limiter.
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

// Periodically clean up expired rate limiter keys every 10 minutes to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of ipRequestCounts.entries()) {
    if (now > entry.resetTime) {
      ipRequestCounts.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

function getClientIp(req: Request): string {
  if (req.ip) {
    return req.ip;
  }
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

function checkRateLimit(ip: string, limit = 50, windowMs = 3600000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = ipRequestCounts.get(ip);

  if (!entry || now > entry.resetTime) {
    ipRequestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}

// 1. Health Check
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Prajurit Competitor Analyzer API',
    version: '1.2.0',
    timestamp: new Date().toISOString(),
  });
});

// 2. Validate URL & SSRF Preflight
apiRouter.post('/validate-url', async (req: Request, res: Response) => {
  const { url } = req.body || {};
  const validation = await validateAndNormalizeUrlAsync(url);
  res.json(validation);
});

// 3. Test Kwinside API Key
apiRouter.post('/kwinside/test', async (req: Request, res: Response) => {
  const { apiKey } = req.body || {};
  if (!apiKey) {
    res.status(400).json({ isValid: false, message: 'API Key Kwinside wajib diisi.' });
    return;
  }

  try {
    const testResult = await kwinsideProvider.testConnection(apiKey);
    res.json(testResult);
  } catch {
    res.status(500).json({ isValid: false, message: 'Gagal menghubungi server Kwinside.' });
  }
});

// 4. Main Crawl & Intelligence Engine
apiRouter.post('/crawl', async (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(clientIp, 50);

  if (!rateLimit.allowed) {
    res.status(429).json({
      error: 'Batas analisis tercapai (Rate limit). Silakan coba lagi beberapa saat lagi.',
    });
    return;
  }

  const { url, mode = 'free', apiKey, maxUrls } = req.body || {};

  // Validate mode
  if (mode !== 'free' && mode !== 'byok') {
    res.status(400).json({ error: "Parameter 'mode' harus bernilai 'free' atau 'byok'." });
    return;
  }

  // Validate maxUrls if provided (must be integer between 1 and 60)
  if (maxUrls !== undefined && (typeof maxUrls !== 'number' || !Number.isInteger(maxUrls) || maxUrls < 1 || maxUrls > 60)) {
    res.status(400).json({ error: "Parameter 'maxUrls' harus berupa bilangan bulat antara 1 dan 60." });
    return;
  }

  // Validate apiKey if provided in byok mode
  if (apiKey !== undefined && typeof apiKey !== 'string') {
    res.status(400).json({ error: "Parameter 'apiKey' harus berupa string." });
    return;
  }

  // Perform SSRF & DNS validation
  const validation = await validateAndNormalizeUrlAsync(url);
  if (!validation.isValid) {
    res.status(400).json({ error: validation.error });
    return;
  }

  try {
    const crawlDepth = Math.min(maxUrls || (mode === 'byok' ? 45 : 35), 60);

    // 1. Run Fast polite crawler
    const crawlResult = await crawlWebsite(validation.normalizedUrl, {
      maxUrls: crawlDepth,
    });

    if (crawlResult.pages.length === 0) {
      res.status(422).json({
        error: 'Website tidak dapat dijangkau atau memblokir akses crawler melalui firewall / bot protection.',
      });
      return;
    }

    // 2. If BYOK mode is requested and key provided, get external SEO data from Kwinside API
    let byokData = undefined;
    if (mode === 'byok' && apiKey) {
      try {
        const topKwNames = crawlResult.pages.slice(0, 5).map(p => p.metadata.title.split(' ')[0]).filter(Boolean);
        byokData = await kwinsideProvider.getDomainIntelligence(validation.domain, apiKey, topKwNames);
      } catch (err: any) {
        byokData = {
          provider: 'Kwinside' as const,
          isValid: false,
          error: err.message || 'Gagal memuat data dari Kwinside API.',
          totalRankingKeywords: 0,
          estimatedOrganicTraffic: 0,
          rankingDistribution: { top1: 0, top3: 0, top10: 0, top30: 0, top50: 0, top100: 0 },
          keywords: [],
          bestPages: [],
          competitors: [],
        };
      }
    }

    // 3. Compute Deep Intelligence Report
    const report = await assembleReport(crawlResult, mode, byokData);

    // 4. Strip heavy raw bodyWordFrequency from final JSON payload to keep client payload minimal
    report.pages = report.pages.map(p => {
      const { bodyWordFrequency, ...rest } = p;
      return rest as any;
    });
    if (report.articleInventoryPages) {
      report.articleInventoryPages = report.articleInventoryPages.map(p => {
        const { bodyWordFrequency, ...rest } = p;
        return rest as any;
      });
    }

    res.json({
      success: true,
      report,
    });
  } catch (err: any) {
    res.status(500).json({
      error: err.message || 'Terjadi kesalahan saat menganalisis website.',
    });
  }
});

// 5. Compare Content Gap between 2 Reports
apiRouter.post('/gap-compare', (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`gap_${clientIp}`, 60);

  if (!rateLimit.allowed) {
    res.status(429).json({
      error: 'Batas analisis content gap tercapai. Silakan coba lagi nanti.',
    });
    return;
  }

  const { targetReport, competitorReport } = req.body || {};
  if (!targetReport || !competitorReport) {
    res.status(400).json({ error: 'Kedua report (target & competitor) harus disertakan.' });
    return;
  }

  try {
    const gapResult = computeContentGap(targetReport, competitorReport);
    res.json({ success: true, gapResult });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal membandingkan content gap.' });
  }
});

// 6. On-demand Google PageSpeed Insights & Core Web Vitals
apiRouter.post('/pagespeed', async (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`psi_${clientIp}`, 30);

  if (!rateLimit.allowed) {
    res.status(429).json({
      error: 'Batas permintaan PageSpeed tercapai. Silakan coba lagi nanti.',
    });
    return;
  }

  const { url, sampleUrls } = req.body || {};
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'URL target wajib diisi dan harus berupa string.' });
    return;
  }

  // SSRF & DNS preflight check
  const syncCheck = validateAndNormalizeUrl(url);
  if (!syncCheck.isValid) {
    res.status(400).json({ error: syncCheck.error || 'URL tidak valid atau dilarang.' });
    return;
  }

  const asyncCheck = await validateAndNormalizeUrlAsync(syncCheck.normalizedUrl);
  if (!asyncCheck.isValid) {
    res.status(400).json({ error: asyncCheck.error || 'Host tidak valid atau privat.' });
    return;
  }

  try {
    const { fetchPageSpeedMetrics } = await import('./pagespeed.js');
    const snapshot = await fetchPageSpeedMetrics(
      asyncCheck.normalizedUrl,
      Array.isArray(sampleUrls) ? sampleUrls : [],
      Boolean(req.body?.forceFresh)
    );
    res.json({ success: true, snapshot });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal mengambil data Core Web Vitals.' });
  }
});

