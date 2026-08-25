import * as cheerio from 'cheerio';
import { ArticleCandidate, ArticleInventorySummary, CrawledPage, HeadingStructure, ImageItem, LinkItem, PageMetadata, SchemaItem } from '../src/types/index.js';
import { classifyArticleCandidate, dedupeArticleCandidates, sortArticleCandidatesByFreshness, extractDateFromCandidate } from './articleClassifier.js';
import { discoverSitemapInventory } from './sitemap.js';
import { isPrivateIpOrHost, normalizeSubUrl, validateAndNormalizeUrl, validateAndNormalizeUrlAsync } from './ssrf.js';
import { extractNGramsFrequency } from './textUtils.js';

const USER_AGENT = 'PrajuritCompetitorAnalyzer/1.0 (+https://prajuritdigital.com/bot; SEO & Competitor Intelligence)';
const DEFAULT_TIMEOUT_MS = 8000;
const ARTICLE_INVENTORY_LIMIT = 30;

export interface CrawlEngineOptions {
  maxUrls?: number;
  onProgress?: (step: string, message: string, progressData?: { urlsDiscovered?: number; urlsCrawled?: number; currentUrl?: string }) => void;
}

export interface CrawlEngineResult {
  domain: string;
  originalUrl: string;
  httpStatus: number;
  isHttps: boolean;
  crawlDurationMs: number;
  totalUrlsDiscovered: number;
  totalUrlsCrawled: number;
  failedUrlsCount: number;
  hasSitemap: boolean;
  sitemapUrlsCount: number;
  hasRobotsTxt: boolean;
  isRobotsRestricted: boolean;
  robotsDisallowRules: string[];
  isJsRenderedWebsite: boolean;
  articleInventory: ArticleInventorySummary;
  articleCandidates: ArticleCandidate[];
  articleInventoryPages: CrawledPage[];
  pages: CrawledPage[];
}

/**
 * Fetch helper with timeout and manual redirect handling with SSRF protection on every hop.
 */
export async function fetchWithTimeout(
  initialUrl: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxRedirects = 5
): Promise<Response> {
  let currentUrl = initialUrl;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    // DNS preflight + IP validation on every hop to eliminate TOCTOU / DNS-rebinding risks
    const ssrfCheck = await validateAndNormalizeUrlAsync(currentUrl);
    if (!ssrfCheck.isValid) {
      throw new Error(`SSRF Block: ${ssrfCheck.error || 'Akses ke host dilarang'}`);
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(ssrfCheck.normalizedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        redirect: 'manual',
      });
      clearTimeout(id);

      // Handle 3xx Redirects safely
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          return response;
        }

        const resolvedRedirect = new URL(location, currentUrl).toString();
        currentUrl = resolvedRedirect;
        redirectCount++;
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  throw new Error(`Too many redirects (exceeded ${maxRedirects})`);
}

export async function parseRobotsTxt(baseUrl: string): Promise<{
  hasRobotsTxt: boolean;
  isRestricted: boolean;
  disallowRules: string[];
  sitemapUrls: string[];
}> {
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).toString();
    const res = await fetchWithTimeout(robotsUrl, 4000);
    if (!res.ok) {
      return { hasRobotsTxt: false, isRestricted: false, disallowRules: [], sitemapUrls: [] };
    }
    const text = await res.text();
    const lines = text.split('\n');
    const disallowRules: string[] = [];
    const sitemapUrls: string[] = [];
    let isRestricted = false;

    let currentUserAgent = '';
    let isApplicableAgent = true;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('#') || !line) continue;

      if (/^User-agent:/i.test(line)) {
        currentUserAgent = line.split(':')[1]?.trim() || '';
        isApplicableAgent = currentUserAgent === '*' || /prajurit|bot/i.test(currentUserAgent);
      } else if (/^Disallow:/i.test(line)) {
        const path = line.split(':')[1]?.trim();
        if (path && isApplicableAgent) {
          disallowRules.push(path);
          if (path === '/' || path === '/*') {
            isRestricted = true;
          }
        }
      } else if (/^Sitemap:/i.test(line)) {
        const sitemap = line.substring(line.indexOf(':') + 1).trim();
        if (sitemap) {
          sitemapUrls.push(sitemap);
        }
      }
    }

    return {
      hasRobotsTxt: true,
      isRestricted,
      disallowRules,
      sitemapUrls,
    };
  } catch {
    return { hasRobotsTxt: false, isRestricted: false, disallowRules: [], sitemapUrls: [] };
  }
}

/**
 * Checks whether a specific URL matches any disallow rules from robots.txt
 */
export function isUrlDisallowed(urlStr: string, disallowRules: string[]): boolean {
  if (!disallowRules || disallowRules.length === 0) return false;
  try {
    const parsed = new URL(urlStr);
    const pathAndQuery = parsed.pathname + parsed.search;

    for (const rule of disallowRules) {
      if (!rule) continue;
      if (rule === '/' || rule === '/*') return true;

      if (rule.endsWith('$')) {
        const cleanRule = rule.slice(0, -1);
        if (pathAndQuery === cleanRule) return true;
      } else if (rule.includes('*')) {
        const regexPattern = '^' + rule.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
        if (new RegExp(regexPattern).test(pathAndQuery)) return true;
      } else {
        if (pathAndQuery.startsWith(rule)) return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Robust XML sitemap discovery: handles all sub-sitemaps and unions all candidate sources.
 */
export async function discoverSitemapUrls(baseUrl: string, hints: string[] = []): Promise<string[]> {
  const result = await discoverSitemapInventory(baseUrl, hints);
  return result.allEntries.map(e => e.url);
}

export function parsePageHtml(html: string, pageUrl: string, httpStatus: number): CrawledPage {
  const $ = cheerio.load(html);
  const parsedUrl = new URL(pageUrl);
  const hostname = parsedUrl.hostname;

  // Metadata Extraction
  const rawTitle = $('title').text().trim() || $('meta[property="og:title"]').attr('content')?.trim() || '';
  const metaDesc = $('meta[name="description"]').attr('content')?.trim() || $('meta[property="og:description"]').attr('content')?.trim() || '';
  const rawCanonical = $('link[rel="canonical"]').attr('href')?.trim() || '';
  const canonical = rawCanonical ? (normalizeSubUrl(rawCanonical, pageUrl) || rawCanonical) : pageUrl;
  const isSelfCanonical = !rawCanonical || canonical === pageUrl || canonical.replace(/\/$/, '') === pageUrl.replace(/\/$/, '');

  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
  const ogDescription = $('meta[property="og:description"]').attr('content')?.trim();
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim();
  const twitterCard = $('meta[name="twitter:card"]').attr('content')?.trim();
  const lang = $('html').attr('lang')?.trim() || $('meta[http-equiv="content-language"]').attr('content')?.trim();
  const charset = $('meta[charset]').attr('charset')?.trim() || $('meta[http-equiv="Content-Type"]').attr('content')?.trim();

  const metadata: PageMetadata = {
    title: rawTitle,
    titleLength: rawTitle.length,
    description: metaDesc,
    descriptionLength: metaDesc.length,
    canonical,
    isSelfCanonical,
    ogTitle,
    ogDescription,
    ogImage,
    twitterCard,
    lang,
    charset,
  };

  // Heading Extraction
  const h1s: string[] = [];
  $('h1').each((_, el) => {
    const txt = $(el).text().replace(/\s+/g, ' ').trim();
    if (txt) h1s.push(txt);
  });

  const h2s: string[] = [];
  $('h2').each((_, el) => {
    const txt = $(el).text().replace(/\s+/g, ' ').trim();
    if (txt && !h2s.includes(txt)) h2s.push(txt);
  });

  const h3s: string[] = [];
  $('h3').each((_, el) => {
    const txt = $(el).text().replace(/\s+/g, ' ').trim();
    if (txt && !h3s.includes(txt)) h3s.push(txt);
  });

  const headings: HeadingStructure = {
    h1: h1s,
    h2: h2s,
    h3: h3s,
    totalH1: h1s.length,
    totalH2: h2s.length,
    totalH3: h3s.length,
    isH1Missing: h1s.length === 0,
    isH1Duplicate: h1s.length > 1,
  };

  // Schema JSON-LD & Microdata Extraction
  const schemas: SchemaItem[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const content = $(el).html();
      if (!content) return;
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item['@type']) {
            schemas.push({ type: String(item['@type']), name: item.name, rawJson: item });
          }
        }
      } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
        for (const item of parsed['@graph']) {
          if (item['@type']) {
            schemas.push({ type: String(item['@type']), name: item.name, rawJson: item });
          }
        }
      } else if (parsed['@type']) {
        schemas.push({ type: String(parsed['@type']), name: parsed.name, rawJson: parsed });
      }
    } catch {
      // invalid JSON-LD, skip
    }
  });

  // Microdata itemtypes
  $('[itemtype]').each((_, el) => {
    const typeUrl = $(el).attr('itemtype') || '';
    const cleanType = typeUrl.split('/').pop();
    if (cleanType && !schemas.some(s => s.type === cleanType)) {
      schemas.push({ type: cleanType });
    }
  });

  // Links Extraction
  const internalLinks: LinkItem[] = [];
  const externalLinks: LinkItem[] = [];
  const seenUrls = new Set<string>();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    const rel = ($(el).attr('rel') || '').toLowerCase();
    const isNoFollow = rel.includes('nofollow') || rel.includes('sponsored');

    const resolved = normalizeSubUrl(href, pageUrl);
    if (!resolved || seenUrls.has(resolved)) return;
    seenUrls.add(resolved);

    try {
      const linkParsed = new URL(resolved);
      const isInternal = linkParsed.hostname === hostname || linkParsed.hostname.endsWith('.' + hostname) || hostname.endsWith('.' + linkParsed.hostname);
      
      const linkItem: LinkItem = {
        url: resolved,
        text: text.slice(0, 100),
        isInternal,
        isNoFollow,
        targetDomain: linkParsed.hostname.replace(/^www\./, ''),
      };

      if (isInternal) {
        internalLinks.push(linkItem);
      } else {
        externalLinks.push(linkItem);
      }
    } catch {
      // skip invalid url
    }
  });

  // Images Extraction
  const images: ImageItem[] = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('srcset') || '';
    if (!src) return;
    const alt = ($(el).attr('alt') || '').trim();
    const loading = $(el).attr('loading') || '';
    const isLazy = loading.toLowerCase() === 'lazy' || !!$(el).attr('data-src');
    const format = src.split('.').pop()?.split('?')[0]?.toLowerCase() || 'unknown';

    images.push({
      src: src.slice(0, 300),
      alt,
      hasAlt: alt.length > 0,
      isLazy,
      format,
    });
  });

  // Content Text Extraction (strip scripts, nav, footer, header, style, noscript, etc.)
  const clone$ = cheerio.load(html);
  clone$('script, style, noscript, nav, header, footer, svg, form, iframe, [role="navigation"], [role="banner"], [role="contentinfo"], .footer, .header, .nav, .sidebar, .comments').remove();

  let bodyText = clone$('article').text().trim();
  if (!bodyText || bodyText.length < 100) {
    bodyText = clone$('main').text().trim();
  }
  if (!bodyText || bodyText.length < 100) {
    bodyText = clone$('.content, .post-content, .entry-content, #content').text().trim();
  }
  if (!bodyText || bodyText.length < 100) {
    bodyText = clone$('body').text().trim();
  }

  bodyText = bodyText.replace(/\s+/g, ' ');
  const words = bodyText ? bodyText.split(/\s+/).filter(w => w.length > 0) : [];
  const wordCount = words.length;

  // Extract body word frequency map (1-gram, 2-gram, 3-gram) for accurate Keyword & Topical engine
  const { frequencyMap: bodyWordFrequency, totalTokens: bodyTotalTokens } = extractNGramsFrequency(bodyText);

  let paragraphCount = 0;
  clone$('p').each((_, el) => {
    if (clone$(el).text().trim().length > 20) paragraphCount++;
  });

  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  // Published and Last Modified Date Extraction
  let publishedDate: string | undefined;
  let lastModifiedDate: string | undefined;
  let author: string | undefined;

  const articleSchemaObj = schemas.find(s => s.rawJson?.datePublished || s.rawJson?.dateCreated || s.rawJson?.dateModified || s.rawJson?.author)?.rawJson;
  if (articleSchemaObj) {
    if (articleSchemaObj.datePublished) publishedDate = String(articleSchemaObj.datePublished);
    if (articleSchemaObj.dateModified) lastModifiedDate = String(articleSchemaObj.dateModified);
    if (articleSchemaObj.author) {
      if (typeof articleSchemaObj.author === 'string') {
        author = articleSchemaObj.author;
      } else if (articleSchemaObj.author.name) {
        author = String(articleSchemaObj.author.name);
      } else if (Array.isArray(articleSchemaObj.author) && articleSchemaObj.author[0]?.name) {
        author = String(articleSchemaObj.author[0].name);
      }
    }
  }

  if (!publishedDate) {
    const metaDate = $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="pubdate"]').attr('content') ||
      $('meta[name="publishdate"]').attr('content') ||
      $('time[datetime]').attr('datetime') ||
      $('time').text().trim();
    if (metaDate && metaDate.length > 4) {
      publishedDate = metaDate.slice(0, 25);
    }
  }

  if (!lastModifiedDate) {
    const metaModDate = $('meta[property="article:modified_time"]').attr('content') ||
      $('meta[property="og:updated_time"]').attr('content') ||
      $('meta[name="last-modified"]').attr('content');
    if (metaModDate && metaModDate.length > 4) {
      lastModifiedDate = metaModDate.slice(0, 25);
    }
  }

  if (!author) {
    const metaAuthor = $('meta[name="author"]').attr('content') ||
      $('meta[property="article:author"]').attr('content') ||
      $('.author-name, .byline, .post-author, [rel="author"]').first().text().trim();
    if (metaAuthor && metaAuthor.length < 50) {
      author = metaAuthor;
    }
  }

  // Authoritative Outbound Links Detection (.gov, .edu, .ac.id, .go.id, wikipedia, who, nature, etc.)
  const authoritativeDomainsRegex = /(\.gov|\.edu|\.ac\.id|\.go\.id|wikipedia\.org|who\.int|nature\.com|nih\.gov|bps\.go\.id|kemkes\.go\.id|kominfo\.go\.id|reuters\.com|bbc\.com|scholar\.google|iso\.org|w3\.org|ieee\.org)/i;
  let authoritativeLinksCount = 0;
  for (const extLink of externalLinks) {
    if (extLink.targetDomain && authoritativeDomainsRegex.test(extLink.targetDomain)) {
      authoritativeLinksCount++;
    }
  }

  // AI-Overview Readiness Score (Structural Proxy: 0 - 100)
  const aiReadySignals: string[] = [];
  let aiReadyScore = 0;

  // Signal 1: Direct Answer Paragraph in First 100 Words
  const firstParagraph = clone$('p').first().text().trim().toLowerCase();
  const hasDirectAnswerParagraph = firstParagraph.length >= 70 && firstParagraph.length <= 400 &&
    /(adalah|merupakan|yaitu|yakni|artinya|definisi|merujuk|is a|is an|refers to|defined as|means)/i.test(firstParagraph);
  if (hasDirectAnswerParagraph) {
    aiReadyScore += 25;
    aiReadySignals.push('Jawaban langsung ringkas di paragraf pembuka');
  }

  // Signal 2: Structured Lists or Tables (High citation in AI overviews)
  const hasListsOrTables = $('ul, ol, table').length > 0;
  if (hasListsOrTables) {
    aiReadyScore += 20;
    aiReadySignals.push('Struktur daftar poin (bullet/numbered list) atau tabel');
  }

  // Signal 3: FAQ Schema / Q&A pattern
  const hasFaqSchema = schemas.some(s => ['FAQPage', 'QAPage', 'Question', 'Answer'].includes(s.type)) ||
    $('h2, h3').toArray().some(el => /(apa|bagaimana|mengapa|kenapa|cara|tips|panduan|kapan|berapa|what|how|why)\b/i.test($(el).text()));
  if (hasFaqSchema) {
    aiReadyScore += 25;
    aiReadySignals.push('Struktur FAQ atau sub-pertanyaan berbasis intensi pencari');
  }

  // Signal 4: Subheadings hierarchy & Clear Topic Scoping
  if (headings.h2.length >= 3) {
    aiReadyScore += 15;
    aiReadySignals.push('Hierarki sub-topik mendalam (≥3 H2)');
  }

  // Signal 5: Authoritative Citations
  if (authoritativeLinksCount > 0) {
    aiReadyScore += 15;
    aiReadySignals.push(`Rujukan ke domain kredibel/otoritatif (${authoritativeLinksCount} link)`);
  }

  // Base score boost for long-form quality
  if (wordCount >= 600) {
    aiReadyScore = Math.min(100, aiReadyScore + 10);
  }

  aiReadyScore = Math.min(100, Math.max(aiReadyScore, 10));

  // Article Detection Heuristic
  const articleSignals: string[] = [];
  let confidence = 0;

  const hasArticleSchema = schemas.some(s => ['Article', 'BlogPosting', 'NewsArticle', 'TechArticle'].includes(s.type));
  if (hasArticleSchema) {
    confidence += 40;
    articleSignals.push('Schema Article / BlogPosting');
  }

  if ($('article').length > 0) {
    confidence += 25;
    articleSignals.push('<article> semantic tag');
  }

  const path = parsedUrl.pathname.toLowerCase();
  if (/\/(blog|post|artikel|news|insights|guides|tutorials|p|read)\//.test(path) || /\d{4}\/\d{2}/.test(path)) {
    confidence += 20;
    articleSignals.push('URL article path pattern');
  }

  if (wordCount >= 300) {
    confidence += 15;
    articleSignals.push('Substantial content length (>300 words)');
  }

  if (headings.h2.length >= 2) {
    confidence += 10;
    articleSignals.push('Structured H2 subheadings');
  }

  if (publishedDate) {
    confidence += 10;
    articleSignals.push('Publication date detected');
  }

  // Cap confidence at 100
  const articleConfidence = Math.min(100, confidence);
  const isArticle = articleConfidence >= 45 || (wordCount > 350 && headings.h2.length >= 1);

  // JavaScript Rendering Warning Heuristic
  const isJsRenderedWarning = wordCount < 50 && html.length > 2000 && ($('#root').length > 0 || $('#app').length > 0 || $('app-root').length > 0);

  return {
    id: `page_${Math.random().toString(36).substring(2, 9)}`,
    url: pageUrl,
    path: parsedUrl.pathname || '/',
    httpStatus,
    contentType: 'text/html',
    metadata,
    headings,
    wordCount,
    paragraphCount: Math.max(paragraphCount, 1),
    readingTimeMinutes,
    publishedDate,
    lastModifiedDate,
    author,
    isArticle,
    articleConfidence,
    articleSignals,
    schemas,
    internalLinks,
    externalLinks,
    images,
    bodyWordFrequency,
    bodyTotalTokens,
    isJsRenderedWarning,
    aiReadyScore,
    aiReadySignals,
    hasDirectAnswerParagraph,
    hasListsOrTables,
    hasFaqSchema,
    authoritativeLinksCount,
  };
}

export async function crawlWebsite(targetUrl: string, options: CrawlEngineOptions = {}): Promise<CrawlEngineResult> {
  const startTime = Date.now();
  const maxUrls = options.maxUrls || 35; // Default safe depth for BFS site-wide crawl

  const validation = validateAndNormalizeUrl(targetUrl);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid URL');
  }

  const rootUrl = validation.normalizedUrl;
  const domain = validation.domain;

  options.onProgress?.('robots', 'Mengecek robots.txt & izin crawling...');
  const robotsInfo = await parseRobotsTxt(rootUrl);

  options.onProgress?.('sitemap', 'Mencari dan memetakan seluruh sumber sitemap XML...');
  const sitemapInventory = await discoverSitemapInventory(rootUrl, robotsInfo.sitemapUrls);

  // 1. Classify all discovered raw URL entries into Article Candidates
  const rawArticleCandidates: ArticleCandidate[] = [];
  for (const entry of sitemapInventory.allEntries) {
    const candidate = classifyArticleCandidate(entry, rootUrl);
    if (candidate) {
      rawArticleCandidates.push(candidate);
    }
  }

  // 2. Deduplicate candidates
  let deduplicatedCandidates = dedupeArticleCandidates(rawArticleCandidates);

  // 3. Exact count source & confidence
  let countSource: 'sitemap' | 'mixed' | 'crawl' | 'unknown' = 'sitemap';
  let countConfidence: 'high' | 'medium' | 'low' = 'high';

  if (sitemapInventory.hasSitemap && deduplicatedCandidates.length > 0) {
    const hasStrongSitemap = sitemapInventory.sitemapSources.some(s =>
      /post-sitemap|news-sitemap|artikel-sitemap|blog-sitemap|wp-sitemap-posts/i.test(s)
    );
    countConfidence = hasStrongSitemap ? 'high' : 'medium';
    countSource = 'sitemap';
  } else if (sitemapInventory.hasSitemap) {
    countSource = 'mixed';
    countConfidence = 'medium';
  } else {
    countSource = 'crawl';
    countConfidence = 'low';
  }

  // 4. Sort article candidates by freshness (latest first)
  let sortedCandidates = sortArticleCandidatesByFreshness(deduplicatedCandidates);

  // 5. Select Latest 30 candidates for in-depth inventory analysis
  const targetLatestCandidates = sortedCandidates.slice(0, ARTICLE_INVENTORY_LIMIT);

  // 6. Calculate date extremes if available
  const newestDateCandidate = sortedCandidates.find(c => c.publishedDate || c.lastmod);
  const oldestDateCandidate = [...sortedCandidates].reverse().find(c => c.publishedDate || c.lastmod);

  const newestArticleDate = newestDateCandidate ? (newestDateCandidate.publishedDate || newestDateCandidate.lastmod) : undefined;
  const oldestIndexedArticleDate = oldestDateCandidate ? (oldestDateCandidate.publishedDate || oldestDateCandidate.lastmod) : undefined;

  // 7. Initialize Queue for BFS Site Crawl & Latest Article Priority Fetching
  const pages: CrawledPage[] = [];
  const visitedUrls = new Set<string>();
  const queuedSet = new Set<string>();
  const urlQueue: string[] = [];

  const enqueue = (u: string, highPriority = false) => {
    const norm = normalizeSubUrl(u, rootUrl) || u;
    // Honor path-based Disallow rules from robots.txt (except root itself)
    if (norm !== rootUrl && robotsInfo.disallowRules.length > 0 && isUrlDisallowed(norm, robotsInfo.disallowRules)) {
      return;
    }
    if (!visitedUrls.has(norm) && !queuedSet.has(norm)) {
      queuedSet.add(norm);
      if (highPriority) {
        urlQueue.unshift(norm);
      } else {
        urlQueue.push(norm);
      }
    }
  };

  // Seed root first
  enqueue(rootUrl, true);

  // Seed common structural site pages (about, contact, privacy, etc.) to ensure trustSignals & linkAnalysis are preserved
  const structuralPaths = ['/about', '/tentang-kami', '/about-us', '/contact', '/kontak', '/privacy-policy', '/kebijakan-privasi'];
  for (const sp of structuralPaths) {
    try {
      const spUrl = new URL(sp, rootUrl).toString();
      enqueue(spUrl, false);
    } catch {}
  }

  // Seed latest 30 article candidates
  for (const cand of targetLatestCandidates) {
    enqueue(cand.url, true);
  }

  // Seed other general sitemap URLs up to safe buffer
  for (const entry of sitemapInventory.allEntries.slice(0, 100)) {
    enqueue(entry.url, false);
  }

  let rootHttpStatus = 200;
  let isHttps = rootUrl.startsWith('https://');
  let failedUrlsCount = 0;
  let isJsRenderedWebsite = false;

  const latestArticlesMap = new Map<string, CrawledPage>();
  let replacementIndex = ARTICLE_INVENTORY_LIMIT; // Index for replacement candidates (#31, #32, etc.)

  options.onProgress?.('crawling', `Memulai crawling artikel terbaru & struktur situs...`, {
    urlsDiscovered: Math.max(sitemapInventory.allEntries.length, urlQueue.length),
    urlsCrawled: 0,
    currentUrl: rootUrl,
  });

  const maxFetchTarget = Math.max(maxUrls, targetLatestCandidates.length + 5);

  while (urlQueue.length > 0 && pages.length < maxFetchTarget) {
    const currentUrl = urlQueue.shift()!;
    if (visitedUrls.has(currentUrl)) continue;
    visitedUrls.add(currentUrl);

    try {
      options.onProgress?.('crawling', `Crawling: ${currentUrl.replace(/^https?:\/\/[^/]+/, '') || '/'} (${pages.length + 1})`, {
        urlsDiscovered: Math.max(sitemapInventory.allEntries.length, urlQueue.length + pages.length),
        urlsCrawled: pages.length + 1,
        currentUrl,
      });

      const res = await fetchWithTimeout(currentUrl, 6000);
      if (currentUrl === rootUrl) {
        rootHttpStatus = res.status;
        isHttps = res.url.startsWith('https://');
      }

      if (!res.ok) {
        failedUrlsCount++;
        // If this failed URL was one of the latest article candidates, try fetching replacement candidate (#31, #32, ...)
        if (targetLatestCandidates.some(c => c.url === currentUrl) && replacementIndex < sortedCandidates.length) {
          const replacementCand = sortedCandidates[replacementIndex++];
          if (replacementCand) {
            enqueue(replacementCand.url, true);
          }
        }
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        continue;
      }

      const html = await res.text();
      const parsedPage = parsePageHtml(html, currentUrl, res.status);
      pages.push(parsedPage);

      if (parsedPage.isJsRenderedWarning) {
        isJsRenderedWebsite = true;
      }

      // Check if this page is one of the article inventory candidates or discovered as an article
      const isTargetCandidate = targetLatestCandidates.some(c => c.url === parsedPage.url || c.url === currentUrl || c.url.replace(/\/$/, '') === currentUrl.replace(/\/$/, ''));
      if (isTargetCandidate || parsedPage.isArticle) {
        if (!latestArticlesMap.has(parsedPage.url) && latestArticlesMap.size < ARTICLE_INVENTORY_LIMIT) {
          latestArticlesMap.set(parsedPage.url, parsedPage);
        }
      }

      // If this was a crawl-only site (no sitemap), dynamically build article candidates from crawled pages
      if (countSource === 'crawl' && parsedPage.isArticle) {
        const candidateEntry: ArticleCandidate = {
          url: parsedPage.url,
          sourceSitemap: 'direct-crawl',
          sitemapType: 'crawled-article',
          publishedDate: parsedPage.publishedDate,
          lastmod: parsedPage.lastModifiedDate,
          confidence: parsedPage.articleConfidence,
          classificationSource: parsedPage.articleSignals,
        };
        rawArticleCandidates.push(candidateEntry);
      }

      // Internal links discovery for BFS site graph
      if (pages.length + urlQueue.length < maxUrls * 2) {
        for (const link of parsedPage.internalLinks) {
          if (!visitedUrls.has(link.url) && !queuedSet.has(link.url)) {
            enqueue(link.url, /\/(blog|post|artikel|news|insights|guides)\//i.test(link.url));
          }
        }
      }

      // Polite delay between requests (40ms)
      await new Promise(resolve => setTimeout(resolve, 40));
    } catch {
      failedUrlsCount++;
      // If this failed URL was a candidate, try replacement
      if (targetLatestCandidates.some(c => c.url === currentUrl) && replacementIndex < sortedCandidates.length) {
        const replacementCand = sortedCandidates[replacementIndex++];
        if (replacementCand) {
          enqueue(replacementCand.url, true);
        }
      }
    }
  }

  // If no sitemap was present, update total articles from crawled candidates
  if (countSource === 'crawl') {
    deduplicatedCandidates = dedupeArticleCandidates(rawArticleCandidates);
    sortedCandidates = sortArticleCandidatesByFreshness(deduplicatedCandidates);
  }

  // Collect final 30 latest article pages
  const articleInventoryPages = Array.from(latestArticlesMap.values());

  const totalArticles = Math.max(deduplicatedCandidates.length, articleInventoryPages.length);

  const duration = Date.now() - startTime;

  return {
    domain,
    originalUrl: rootUrl,
    httpStatus: rootHttpStatus,
    isHttps,
    crawlDurationMs: duration,
    totalUrlsDiscovered: Math.max(sitemapInventory.allEntries.length, visitedUrls.size + urlQueue.length),
    totalUrlsCrawled: pages.length,
    failedUrlsCount,
    hasSitemap: sitemapInventory.hasSitemap,
    sitemapUrlsCount: sitemapInventory.allEntries.length,
    hasRobotsTxt: robotsInfo.hasRobotsTxt,
    isRobotsRestricted: robotsInfo.isRestricted,
    robotsDisallowRules: robotsInfo.disallowRules,
    isJsRenderedWebsite,
    articleInventory: {
      totalArticles,
      inventoryLimit: ARTICLE_INVENTORY_LIMIT,
      inventoryCount: articleInventoryPages.length,
      sampledLatestArticles: articleInventoryPages.length,
      countSource,
      countConfidence,
      hasCompleteArticleCount: sitemapInventory.hasCompleteCount,
      newestArticleDate,
      oldestIndexedArticleDate,
    },
    articleCandidates: sortedCandidates,
    articleInventoryPages,
    pages,
  };
}
