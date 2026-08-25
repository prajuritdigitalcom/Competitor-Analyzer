import { ArticleCandidate } from '../src/types/index.js';
import { normalizeSubUrl } from './ssrf.js';

export interface RawUrlEntry {
  url: string;
  lastmod?: string;
  sourceSitemap?: string;
  sitemapType?: string;
}

// Common non-article query parameters to strip for deduplication
const STRIP_QUERY_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'msclkid', 'ref', 'source', 'v', 'preview',
];

/**
 * Normalizes an article URL: removes hash, unwanted tracking params, standardizes trailing slash.
 */
export function normalizeArticleUrl(rawUrl: string, baseUrl: string): string {
  try {
    const base = new URL(baseUrl);
    const resolved = new URL(rawUrl, base.origin);

    // Only allow same root domain (or www subdomain variation)
    const baseHostname = base.hostname.replace(/^www\./, '');
    const resolvedHostname = resolved.hostname.replace(/^www\./, '');
    if (baseHostname !== resolvedHostname) {
      return '';
    }

    // Strip fragment
    resolved.hash = '';

    // Strip tracking queries
    for (const param of STRIP_QUERY_PARAMS) {
      resolved.searchParams.delete(param);
    }

    let urlString = resolved.toString();
    // Normalize trailing slash for paths (except root or file extensions)
    if (!urlString.endsWith('/') && !/\.[a-zA-Z0-9]{2,5}$/.test(urlString) && resolved.pathname !== '/') {
      urlString += '/';
    }

    return urlString;
  } catch {
    return '';
  }
}

/**
 * Checks if a URL is pagination, taxonomy archive, system page, or non-article.
 */
export function isPaginationOrNonArticle(urlString: string, sourceSitemap = ''): boolean {
  try {
    const parsed = new URL(urlString);
    const path = parsed.pathname.toLowerCase();
    const search = parsed.search.toLowerCase();
    const sitemapLower = sourceSitemap.toLowerCase();

    // 1. Root / Homepage
    if (path === '/' || path === '') return true;

    // 2. Pagination patterns (Never count pagination as separate articles)
    if (
      /\/page\/\d+/i.test(path) ||
      /\/p\/\d+/i.test(path) ||
      /[?&](page|paged|p)=\d+/i.test(search) ||
      /\/halaman\/\d+/i.test(path)
    ) {
      return true;
    }

    // 3. Taxonomy, feed, search, account, e-commerce, attachments
    if (
      /\/(category|kategori|tag|tags|author|penulis|user|feed|rss|search|cari|cart|checkout|keranjang|account|akun|login|masuk|register|daftar|wp-admin|wp-content|wp-json|wp-includes|cdn-cgi|attachment|xmlrpc)\//i.test(path) ||
      /\/(category|kategori|tag|tags|author|penulis|feed|search|cart|checkout|account|login)\/?$/i.test(path)
    ) {
      return true;
    }

    // 4. Exclude static assets/media
    if (/\.(jpg|jpeg|png|webp|gif|svg|pdf|zip|rar|css|js|woff|woff2|mp4|mp3|xml)$/i.test(path)) {
      return true;
    }

    // 5. Sitemap source heuristics:
    // If the URL came specifically from page-sitemap, category-sitemap, tag-sitemap, author-sitemap, or product-sitemap
    if (
      sitemapLower.includes('category-sitemap') ||
      sitemapLower.includes('tag-sitemap') ||
      sitemapLower.includes('author-sitemap') ||
      sitemapLower.includes('user-sitemap') ||
      sitemapLower.includes('taxonomy')
    ) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

/**
 * Extracts a Date object from publishedDate string, lastmod XML, or URL date pattern.
 */
export function extractDateFromCandidate(candidate: ArticleCandidate): Date | null {
  if (candidate.publishedDate) {
    const d = new Date(candidate.publishedDate);
    if (!isNaN(d.getTime())) return d;
  }

  if (candidate.lastmod) {
    const d = new Date(candidate.lastmod);
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback: detect date pattern in URL e.g. /2026/08/15/ or /2026/08/ or 2026-08-15
  const match = candidate.url.match(/\/(\d{4})[/-](\d{2})(?:[/-](\d{2}))?/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = match[3] ? parseInt(match[3], 10) : 1;
    const d = new Date(Date.UTC(year, month, day));
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Classifies an individual URL entry into an ArticleCandidate.
 */
export function classifyArticleCandidate(entry: RawUrlEntry, baseUrl: string): ArticleCandidate | null {
  const normUrl = normalizeArticleUrl(entry.url, baseUrl);
  if (!normUrl) return null;

  const sourceSitemap = entry.sourceSitemap || '';
  if (isPaginationOrNonArticle(normUrl, sourceSitemap)) {
    return null;
  }

  const sitemapLower = sourceSitemap.toLowerCase();
  const parsed = new URL(normUrl);
  const path = parsed.pathname.toLowerCase();

  const classificationSource: string[] = [];
  let confidence = 50;
  let sitemapType = entry.sitemapType || 'unknown';

  // Level 1: Strong sitemap names (WordPress & common CMS)
  if (/post-sitemap\d*\.xml/i.test(sitemapLower) || /posts?-sitemap/i.test(sitemapLower)) {
    confidence = 95;
    sitemapType = 'post-sitemap';
    classificationSource.push('Post Sitemap XML (WordPress)');
  } else if (/news-sitemap/i.test(sitemapLower) || /berita-sitemap/i.test(sitemapLower)) {
    confidence = 95;
    sitemapType = 'news-sitemap';
    classificationSource.push('Google News / News Sitemap');
  } else if (/artikel-sitemap/i.test(sitemapLower) || /blog-sitemap/i.test(sitemapLower)) {
    confidence = 95;
    sitemapType = 'blog-sitemap';
    classificationSource.push('Blog / Artikel Sitemap');
  }

  // Level 2: Specific page sitemap penalty (unless path has clear article structure)
  if (/page-sitemap/i.test(sitemapLower)) {
    sitemapType = 'page-sitemap';
    // If it's a page sitemap, it is usually a static landing page (About, Contact, Services)
    // Only classify as article if it has an explicit /blog/ or /artikel/ subfolder
    if (!/\/(blog|artikel|post|news|insights)\//i.test(path)) {
      return null;
    }
    confidence = 70;
    classificationSource.push('Sub-folder in Page Sitemap');
  }

  // Level 3: URL Path Article Signals
  if (/\/(blog|post|posts|artikel|news|insight|insights|guides|tutorial|tutorials|knowledge|berita|read)\//i.test(path)) {
    confidence = Math.max(confidence, 85);
    classificationSource.push('Article URL Path Pattern');
  } else if (/\/\d{4}\/\d{2}\//.test(path)) {
    confidence = Math.max(confidence, 85);
    classificationSource.push('Year/Month Date URL Pattern');
  } else if (path.split('/').filter(Boolean).length >= 1 && path.length > 15 && path.includes('-')) {
    // Single slug with hyphens e.g. /tips-memilih-kayu-jati/
    if (confidence === 50) {
      confidence = 75;
      classificationSource.push('Content Slug Structure');
    }
  }

  return {
    url: normUrl,
    sourceSitemap: entry.sourceSitemap,
    sitemapType,
    lastmod: entry.lastmod,
    confidence,
    classificationSource,
  };
}

/**
 * Deduplicates article candidates by URL.
 */
export function dedupeArticleCandidates(candidates: ArticleCandidate[]): ArticleCandidate[] {
  const map = new Map<string, ArticleCandidate>();

  for (const c of candidates) {
    const existing = map.get(c.url);
    if (!existing) {
      map.set(c.url, c);
    } else {
      // Merge best attributes
      if (c.confidence > existing.confidence) {
        existing.confidence = c.confidence;
      }
      if (!existing.lastmod && c.lastmod) {
        existing.lastmod = c.lastmod;
      }
      if (!existing.publishedDate && c.publishedDate) {
        existing.publishedDate = c.publishedDate;
      }
      existing.classificationSource = Array.from(new Set([...existing.classificationSource, ...c.classificationSource]));
    }
  }

  return Array.from(map.values());
}

/**
 * Sorts article candidates by freshness (Published Date -> lastmod -> URL date -> unknown).
 * Newest first.
 */
export function sortArticleCandidatesByFreshness(candidates: ArticleCandidate[]): ArticleCandidate[] {
  return [...candidates].sort((a, b) => {
    const dateA = extractDateFromCandidate(a);
    const dateB = extractDateFromCandidate(b);

    if (dateA && dateB) {
      return dateB.getTime() - dateA.getTime();
    }
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;

    // Secondary sort: highest confidence first
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }

    // Tertiary sort: URL alphabetical for stability
    return a.url.localeCompare(b.url);
  });
}
