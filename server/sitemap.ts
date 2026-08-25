import { fetchWithTimeout } from './crawler.js';
import { RawUrlEntry } from './articleClassifier.js';
import { normalizeSubUrl, validateAndNormalizeUrl } from './ssrf.js';

export interface SitemapDiscoveryResult {
  allEntries: RawUrlEntry[];
  sitemapSources: string[];
  hasCompleteCount: boolean;
  hasSitemap: boolean;
}

const MAX_SITEMAPS_TO_PROCESS = 60; // Safety guard for total XML files traversed

/**
 * Extracts URL entries and sub-sitemaps from raw XML string using resilient regex.
 */
export function parseSitemapXml(
  xmlContent: string,
  sitemapUrl: string
): {
  entries: RawUrlEntry[];
  subSitemaps: string[];
} {
  const entries: RawUrlEntry[] = [];
  const subSitemaps: string[] = [];

  // 1. Detect sub-sitemaps in <sitemapindex> (<sitemap><loc>...</loc></sitemap>)
  const sitemapBlockRegex = /<sitemap>([\s\S]*?)<\/sitemap>/gi;
  let sitemapBlockMatch;
  while ((sitemapBlockMatch = sitemapBlockRegex.exec(xmlContent)) !== null) {
    const block = sitemapBlockMatch[1];
    const locMatch = /<loc>(.*?)<\/loc>/i.exec(block);
    if (locMatch && locMatch[1]) {
      const loc = locMatch[1].trim();
      if (loc) {
        subSitemaps.push(loc);
      }
    }
  }

  // 2. Detect url entries in <urlset> (<url><loc>...</loc><lastmod>...</lastmod></url>)
  const urlBlockRegex = /<url>([\s\S]*?)<\/url>/gi;
  let urlBlockMatch;
  let foundUrlBlocks = false;

  while ((urlBlockMatch = urlBlockRegex.exec(xmlContent)) !== null) {
    foundUrlBlocks = true;
    const block = urlBlockMatch[1];
    const locMatch = /<loc>(.*?)<\/loc>/i.exec(block);
    if (locMatch && locMatch[1]) {
      const loc = locMatch[1].trim();
      if (loc) {
        if (loc.endsWith('.xml') || loc.includes('sitemap')) {
          subSitemaps.push(loc);
        } else {
          const lastmodMatch = /<lastmod>(.*?)<\/lastmod>/i.exec(block);
          const lastmod = lastmodMatch ? lastmodMatch[1].trim() : undefined;
          entries.push({
            url: loc,
            lastmod,
            sourceSitemap: sitemapUrl,
          });
        }
      }
    }
  }

  // 3. Fallback if XML structure lacks strict tags (loose <loc> matcher)
  if (!foundUrlBlocks && subSitemaps.length === 0) {
    const looseLocRegex = /<loc>(.*?)<\/loc>/gi;
    let looseMatch;
    while ((looseMatch = looseLocRegex.exec(xmlContent)) !== null) {
      const loc = looseMatch[1]?.trim();
      if (!loc) continue;

      if (loc.endsWith('.xml') || loc.includes('sitemap')) {
        if (!subSitemaps.includes(loc)) {
          subSitemaps.push(loc);
        }
      } else {
        entries.push({
          url: loc,
          sourceSitemap: sitemapUrl,
        });
      }
    }
  }

  return { entries, subSitemaps };
}

/**
 * Robust XML sitemap discovery: recursively discovers and reads index & child sitemaps,
 * returning full entries with lastmod and source metadata.
 */
export async function discoverSitemapInventory(
  baseUrl: string,
  hints: string[] = []
): Promise<SitemapDiscoveryResult> {
  const allEntriesMap = new Map<string, RawUrlEntry>();
  const visitedSitemaps = new Set<string>();
  const sitemapQueue: string[] = [];
  const sitemapSources: string[] = [];
  let hasCompleteCount = true;

  const initialCandidates = [
    ...hints,
    new URL('/sitemap.xml', baseUrl).toString(),
    new URL('/sitemap_index.xml', baseUrl).toString(),
    new URL('/wp-sitemap.xml', baseUrl).toString(),
    new URL('/post-sitemap.xml', baseUrl).toString(),
  ];

  for (const cand of initialCandidates) {
    const norm = normalizeSubUrl(cand, baseUrl) || cand;
    if (!visitedSitemaps.has(norm) && !sitemapQueue.includes(norm)) {
      sitemapQueue.push(norm);
    }
  }

  let processedCount = 0;

  while (sitemapQueue.length > 0) {
    if (processedCount >= MAX_SITEMAPS_TO_PROCESS) {
      hasCompleteCount = false;
      break;
    }

    const currentSitemap = sitemapQueue.shift()!;
    if (visitedSitemaps.has(currentSitemap)) continue;
    visitedSitemaps.add(currentSitemap);

    // Validate SSRF
    const ssrfCheck = validateAndNormalizeUrl(currentSitemap);
    if (!ssrfCheck.isValid) continue;

    try {
      const res = await fetchWithTimeout(currentSitemap, 4500);
      if (!res.ok) continue;

      const contentLengthHeader = res.headers.get('content-length');
      if (contentLengthHeader && parseInt(contentLengthHeader, 10) > 8 * 1024 * 1024) {
        // Skip sitemaps exceeding 8MB to protect server memory
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      let text = await res.text();

      // Guard: Truncate string if unreasonably huge (> 8MB)
      if (text.length > 8 * 1024 * 1024) {
        text = text.slice(0, 8 * 1024 * 1024);
      }

      // Basic validation that response looks like XML/sitemap
      if (!text.includes('<loc>') && !text.includes('sitemap') && !text.includes('urlset') && !contentType.includes('xml')) {
        continue;
      }

      sitemapSources.push(currentSitemap);
      processedCount++;

      const { entries, subSitemaps } = parseSitemapXml(text, currentSitemap);

      // Collect URL entries (deduplicated by URL)
      for (const entry of entries) {
        if (!allEntriesMap.has(entry.url)) {
          allEntriesMap.set(entry.url, entry);
        } else {
          // If existing entry lacks lastmod but current has it, update
          const existing = allEntriesMap.get(entry.url)!;
          if (!existing.lastmod && entry.lastmod) {
            existing.lastmod = entry.lastmod;
          }
        }
      }

      // Add discovered sub-sitemaps to queue
      for (const sub of subSitemaps) {
        const normSub = normalizeSubUrl(sub, baseUrl) || sub;
        if (!visitedSitemaps.has(normSub) && !sitemapQueue.includes(normSub)) {
          sitemapQueue.push(normSub);
        }
      }
    } catch {
      // Individual sitemap request failed, continue processing remaining
    }
  }

  return {
    allEntries: Array.from(allEntriesMap.values()),
    sitemapSources,
    hasCompleteCount,
    hasSitemap: sitemapSources.length > 0,
  };
}
