import {
  ActionableInsight,
  AnalysisReport,
  AnalysisScope,
  ArticleCandidate,
  ArticleInventorySummary,
  ByokData,
  CompetitorScore,
  ContentCluster,
  ContentFreshness,
  ContentGapResult,
  CrawledPage,
  KeywordItem,
  PublishingFrequency,
  TrustSignals
} from '../src/types/index.js';
import { CrawlEngineResult } from './crawler.js';
import { fetchPageSpeedMetrics } from './pagespeed.js';
import { isStopword, tokenizeText } from './textUtils.js';

// 1. Keyword Extraction & Density Engine (Reads body text + metadata + headings)
export function extractKeywords(pages: CrawledPage[]): KeywordItem[] {
  const keywordMap = new Map<string, {
    bodyOccurrences: number;
    titleOccurrences: number;
    h1Occurrences: number;
    h2Occurrences: number;
    altOccurrences: number;
    anchorOccurrences: number;
    pages: Set<string>;
    inTitle: boolean;
    inH1: boolean;
    inH2: boolean;
    inBody: boolean;
    inAnchor: boolean;
    inAlt: boolean;
  }>();

  let totalSiteBodyTokens = 0;

  for (const page of pages) {
    const pageTotalTokens = page.bodyTotalTokens || Math.max(page.wordCount, 50);
    totalSiteBodyTokens += pageTotalTokens;

    const titleTokens = tokenizeText(page.metadata.title);
    const h1Tokens = tokenizeText(page.headings.h1.join(' '));
    const h2Tokens = tokenizeText(page.headings.h2.join(' '));
    const altTokens = tokenizeText(page.images.map(img => img.alt).join(' '));
    const anchorTokens = tokenizeText(page.internalLinks.map(l => l.text).join(' '));

    const titleText = page.metadata.title.toLowerCase();
    const h1Text = page.headings.h1.join(' ').toLowerCase();
    const h2Text = page.headings.h2.join(' ').toLowerCase();
    const altText = page.images.map(img => img.alt).join(' ').toLowerCase();
    const anchorText = page.internalLinks.map(l => l.text).join(' ').toLowerCase();

    // 1. Ingest body word frequencies (1-gram, 2-gram, 3-gram extracted from body)
    if (page.bodyWordFrequency) {
      for (const [term, freq] of Object.entries(page.bodyWordFrequency)) {
        if (term.length < 3 || isStopword(term)) continue;

        const cur = keywordMap.get(term) || {
          bodyOccurrences: 0,
          titleOccurrences: 0,
          h1Occurrences: 0,
          h2Occurrences: 0,
          altOccurrences: 0,
          anchorOccurrences: 0,
          pages: new Set<string>(),
          inTitle: false,
          inH1: false,
          inH2: false,
          inBody: false,
          inAnchor: false,
          inAlt: false,
        };

        cur.bodyOccurrences += freq;
        cur.inBody = true;
        cur.pages.add(page.url);

        if (titleText.includes(term)) {
          cur.inTitle = true;
          cur.titleOccurrences++;
        }
        if (h1Text.includes(term)) {
          cur.inH1 = true;
          cur.h1Occurrences++;
        }
        if (h2Text.includes(term)) {
          cur.inH2 = true;
          cur.h2Occurrences++;
        }
        if (altText.includes(term)) {
          cur.inAlt = true;
          cur.altOccurrences++;
        }
        if (anchorText.includes(term)) {
          cur.inAnchor = true;
          cur.anchorOccurrences++;
        }

        keywordMap.set(term, cur);
      }
    }

    // 2. Also register prominent title & heading tokens even if rare in body
    const structuralTokens = [...new Set([...titleTokens, ...h1Tokens, ...h2Tokens])];
    for (const token of structuralTokens) {
      if (token.length < 3 || isStopword(token)) continue;
      const cur = keywordMap.get(token) || {
        bodyOccurrences: 0,
        titleOccurrences: 0,
        h1Occurrences: 0,
        h2Occurrences: 0,
        altOccurrences: 0,
        anchorOccurrences: 0,
        pages: new Set<string>(),
        inTitle: false,
        inH1: false,
        inH2: false,
        inBody: false,
        inAnchor: false,
        inAlt: false,
      };

      cur.pages.add(page.url);
      if (titleTokens.includes(token)) {
        cur.inTitle = true;
        cur.titleOccurrences += 2;
      }
      if (h1Tokens.includes(token)) {
        cur.inH1 = true;
        cur.h1Occurrences += 2;
      }
      if (h2Tokens.includes(token)) {
        cur.inH2 = true;
        cur.h2Occurrences++;
      }
      if (altTokens.includes(token)) {
        cur.inAlt = true;
        cur.altOccurrences++;
      }
      if (anchorTokens.includes(token)) {
        cur.inAnchor = true;
        cur.anchorOccurrences++;
      }

      keywordMap.set(token, cur);
    }
  }

  // Convert to structured KeywordItem array
  const rawList: KeywordItem[] = [];
  const safeTotalSiteTokens = Math.max(totalSiteBodyTokens, 500);

  for (const [kw, data] of keywordMap.entries()) {
    const totalFrequency = data.bodyOccurrences + data.titleOccurrences + data.h1Occurrences + data.h2Occurrences;
    // Filter noise
    if (totalFrequency < 2 && data.pages.size < 2 && !data.inTitle && !data.inH1) continue;

    const wordsInKw = kw.split(' ').length;
    // Real density computed against total body tokens across site
    const density = parseFloat(((Math.max(data.bodyOccurrences, 1) / safeTotalSiteTokens) * 100).toFixed(2));

    // Intent detection
    let intent: KeywordItem['intent'] = 'Informational';
    if (/(beli|jual|harga|promo|diskon|murah|biaya|tarif|pesan|sewa|toko|order|buy|price|cost|shop)/i.test(kw)) {
      intent = 'Transactional';
    } else if (/(terbaik|review|rekomendasi|vs|kelebihan|kekurangan|perbandingan|jasa|layanan|best|top|review)/i.test(kw)) {
      intent = 'Commercial';
    } else if (/(login|masuk|daftar|portal|app|kontak|alamat|download)/i.test(kw)) {
      intent = 'Navigational';
    }

    // Classification
    let classification: KeywordItem['classification'] = 'Supporting';
    if (wordsInKw >= 3) {
      classification = 'Long-tail';
    } else if (data.pages.size >= Math.max(2, Math.floor(pages.length * 0.15)) || (data.inTitle && data.inH1)) {
      classification = 'Core';
    }

    rawList.push({
      keyword: kw,
      frequency: totalFrequency,
      density,
      pagesCount: data.pages.size,
      samplePages: Array.from(data.pages).slice(0, 5),
      classification,
      intent,
      inTitle: data.inTitle,
      inH1: data.inH1,
      inH2: data.inH2,
      inBody: data.inBody,
      inAnchor: data.inAnchor,
      inAlt: data.inAlt,
    });
  }

  // Sort by weighted SEO prominence
  return rawList
    .sort((a, b) => {
      const scoreA = (a.pagesCount * 12) + (a.inTitle ? 8 : 0) + (a.inH1 ? 6 : 0) + Math.min(a.frequency, 50);
      const scoreB = (b.pagesCount * 12) + (b.inTitle ? 8 : 0) + (b.inH1 ? 6 : 0) + Math.min(b.frequency, 50);
      return scoreB - scoreA;
    })
    .slice(0, 60);
}

// 2. Topical Content Clustering Engine with semantic co-occurrence & normalized path grouping
export function buildContentClusters(pages: CrawledPage[], topKeywords: KeywordItem[]): ContentCluster[] {
  const clusterMap = new Map<string, {
    articles: Array<{ title: string; url: string; wordCount: number; publishedDate?: string }>;
    subtopics: Set<string>;
    totalWords: number;
  }>();

  // Core themes from top ranking multi-page keywords
  const coreThemes = topKeywords
    .filter(k => (k.classification === 'Core' || k.pagesCount >= 2) && k.keyword.length >= 4)
    .slice(0, 8)
    .map(k => k.keyword);

  // Normalized path mapping helper
  const normalizePathCluster = (path: string): string => {
    const segments = path.toLowerCase().split('/').filter(s => s.length > 0 && !s.includes('.'));
    if (segments.length === 0) return 'Beranda & Utama';

    const seg0 = segments[0];
    if (['blog', 'artikel', 'article', 'articles', 'posts', 'post', 'news', 'berita', 'insight', 'insights', 'edukasi'].includes(seg0)) {
      if (segments.length > 1 && !/^\d+$/.test(segments[1])) {
        return `Blog: ${segments[1].replace(/[-_]/g, ' ').toUpperCase()}`;
      }
      return 'Blog & Editorial';
    }
    if (['produk', 'product', 'products', 'layanan', 'services', 'service', 'jasa', 'katalog'].includes(seg0)) {
      return 'Produk & Layanan';
    }
    if (['portfolio', 'portofolio', 'project', 'projects', 'proyek', 'karya'].includes(seg0)) {
      return 'Portofolio & Proyek';
    }
    if (['tentang-kami', 'about-us', 'about', 'profil', 'profile', 'kontak', 'contact'].includes(seg0)) {
      return 'Profil & Informasi Perusahaan';
    }
    return seg0.replace(/[-_]/g, ' ').toUpperCase();
  };

  for (const page of pages) {
    const title = page.metadata.title || page.headings.h1[0] || page.path;
    const bodyKeys = Object.keys(page.bodyWordFrequency || {}).slice(0, 20);
    const combinedTokens = [
      ...tokenizeText(page.metadata.title),
      ...tokenizeText(page.headings.h1.join(' ')),
      ...tokenizeText(page.headings.h2.join(' ')),
      ...bodyKeys,
    ];
    const combinedText = combinedTokens.join(' ').toLowerCase();

    // Match against core themes based on keyword co-occurrence score
    let bestTheme = '';
    let bestScore = 0;

    for (const theme of coreThemes) {
      const themeWords = theme.toLowerCase().split(/\s+/);
      let matchCount = 0;
      for (const tw of themeWords) {
        if (combinedText.includes(tw)) matchCount++;
      }
      if (matchCount > 0 && matchCount >= themeWords.length) {
        const score = matchCount * 2 + (page.metadata.title.toLowerCase().includes(theme.toLowerCase()) ? 3 : 0);
        if (score > bestScore) {
          bestScore = score;
          bestTheme = theme.charAt(0).toUpperCase() + theme.slice(1);
        }
      }
    }

    // Fallback to normalized path grouping if no dominant keyword cluster matches
    const clusterName = bestTheme || normalizePathCluster(page.path);

    const cur = clusterMap.get(clusterName) || {
      articles: [],
      subtopics: new Set<string>(),
      totalWords: 0,
    };

    cur.articles.push({
      title,
      url: page.url,
      wordCount: page.wordCount,
      publishedDate: page.publishedDate,
    });
    cur.totalWords += page.wordCount;

    // Collect subtopics from H2 & H3
    for (const h2 of page.headings.h2.slice(0, 3)) {
      if (h2.length > 4 && h2.length < 60) {
        cur.subtopics.add(h2);
      }
    }

    clusterMap.set(clusterName, cur);
  }

  const clusters: ContentCluster[] = [];
  let index = 1;
  for (const [name, data] of clusterMap.entries()) {
    const articlesCount = data.articles.length;
    clusters.push({
      id: `cluster_${index++}`,
      name,
      articlesCount,
      totalWords: data.totalWords,
      avgWords: Math.round(data.totalWords / Math.max(articlesCount, 1)),
      subtopics: Array.from(data.subtopics).slice(0, 8),
      articles: data.articles.sort((a, b) => b.wordCount - a.wordCount),
    });
  }

  return clusters.sort((a, b) => b.articlesCount - a.articlesCount);
}

// 2b. Semantic Content Clustering with Gemini AI (falls back seamlessly to rule-based)
export async function buildSemanticClustersAsync(
  pages: CrawledPage[],
  topKeywords: KeywordItem[]
): Promise<ContentCluster[]> {
  const deterministicClusters = buildContentClusters(pages, topKeywords);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || pages.length < 3) {
    return deterministicClusters;
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI();
    const sampleArticles = pages.slice(0, 25).map(p => ({
      title: p.metadata.title || p.path,
      h1: p.headings.h1[0] || '',
      url: p.url,
      wordCount: p.wordCount,
      publishedDate: p.publishedDate,
    }));

    const topKwNames = topKeywords.slice(0, 12).map(k => k.keyword).join(', ');

    const prompt = `Analisis daftar halaman berikut dan kelompokkan ke dalam 3-6 Topical Content Cluster tematis (Pillar Topics).
Top Keywords: ${topKwNames}
Halaman:
${JSON.stringify(sampleArticles, null, 2)}

Keluarkan JSON array murni:
[
  {
    "name": "Nama Cluster Topik (e.g. Panduan Pemasaran Digital)",
    "subtopics": ["Subtopik 1", "Subtopik 2"],
    "articleUrls": ["https://..."]
  }
]`;

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Clustering AI timeout')), 4000));
    const aiCall = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const response: any = await Promise.race([aiCall, timeoutPromise]);
    const parsedClusters = JSON.parse(response.text);

    if (Array.isArray(parsedClusters) && parsedClusters.length >= 2) {
      const pageUrlMap = new Map(pages.map(p => [p.url, p]));
      const assignedUrls = new Set<string>();
      const semanticResult: ContentCluster[] = [];

      let idx = 1;
      for (const cl of parsedClusters) {
        if (!cl.name || !Array.isArray(cl.articleUrls)) continue;
        const clArticles: Array<{ title: string; url: string; wordCount: number; publishedDate?: string }> = [];
        let totalWords = 0;

        for (const u of cl.articleUrls) {
          const matched = pageUrlMap.get(u);
          if (matched) {
            assignedUrls.add(u);
            clArticles.push({
              title: matched.metadata.title || matched.headings.h1[0] || matched.path,
              url: matched.url,
              wordCount: matched.wordCount,
              publishedDate: matched.publishedDate,
            });
            totalWords += matched.wordCount;
          }
        }

        if (clArticles.length > 0) {
          semanticResult.push({
            id: `cluster_ai_${idx++}`,
            name: String(cl.name),
            articlesCount: clArticles.length,
            totalWords,
            avgWords: Math.round(totalWords / clArticles.length),
            subtopics: Array.isArray(cl.subtopics) ? cl.subtopics.slice(0, 6) : [],
            articles: clArticles.sort((a, b) => b.wordCount - a.wordCount),
          });
        }
      }

      // Add unassigned pages to general cluster
      const unassignedPages = pages.filter(p => !assignedUrls.has(p.url));
      if (unassignedPages.length > 0 && semanticResult.length > 0) {
        const remainingTotalWords = unassignedPages.reduce((acc, p) => acc + p.wordCount, 0);
        semanticResult.push({
          id: `cluster_ai_${idx++}`,
          name: 'Topik Terkait Lainnya',
          articlesCount: unassignedPages.length,
          totalWords: remainingTotalWords,
          avgWords: Math.round(remainingTotalWords / unassignedPages.length),
          subtopics: [],
          articles: unassignedPages.map(p => ({
            title: p.metadata.title || p.path,
            url: p.url,
            wordCount: p.wordCount,
            publishedDate: p.publishedDate,
          })),
        });
      }

      if (semanticResult.length >= 2) {
        return semanticResult.sort((a, b) => b.articlesCount - a.articlesCount);
      }
    }
  } catch {
    // Fallback to deterministic cluster
  }

  return deterministicClusters;
}

// 3. Publishing Frequency & Cadence Engine
export function calculatePublishingFrequency(pages: CrawledPage[]): PublishingFrequency {
  const dates: Date[] = [];
  const monthMap = new Map<string, number>();

  for (const page of pages) {
    if (page.publishedDate) {
      const parsed = new Date(page.publishedDate);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2015 && parsed.getFullYear() <= 2030) {
        dates.push(parsed);
        const monthKey = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + 1);
      }
    }
  }

  dates.sort((a, b) => a.getTime() - b.getTime());

  let articlesPerMonth = 0;
  let articlesPerWeek = 0;
  let mostActiveMonth = 'N/A';
  let quietestMonth = 'N/A';
  let newestArticleDate: string | undefined;
  let oldestArticleDate: string | undefined;

  const monthlyBreakdown: Array<{ month: string; count: number }> = [];

  if (dates.length > 0) {
    oldestArticleDate = dates[0].toISOString().split('T')[0];
    newestArticleDate = dates[dates.length - 1].toISOString().split('T')[0];

    const monthsDiff = Math.max(
      1,
      (dates[dates.length - 1].getFullYear() - dates[0].getFullYear()) * 12 +
      (dates[dates.length - 1].getMonth() - dates[0].getMonth()) + 1
    );

    articlesPerMonth = parseFloat((dates.length / monthsDiff).toFixed(1));
    articlesPerWeek = parseFloat((articlesPerMonth / 4.33).toFixed(1));

    let maxCount = -1;
    let minCount = Infinity;

    for (const [month, count] of monthMap.entries()) {
      monthlyBreakdown.push({ month, count });
      if (count > maxCount) {
        maxCount = count;
        mostActiveMonth = month;
      }
      if (count < minCount) {
        minCount = count;
        quietestMonth = month;
      }
    }

    monthlyBreakdown.sort((a, b) => a.month.localeCompare(b.month));
  } else {
    articlesPerMonth = parseFloat((pages.length / 3).toFixed(1));
    articlesPerWeek = parseFloat((articlesPerMonth / 4).toFixed(1));
  }

  return {
    articlesPerMonth,
    articlesPerWeek,
    mostActiveMonth,
    quietestMonth,
    newestArticleDate,
    oldestArticleDate,
    monthlyBreakdown,
  };
}

// 4. Competitor Content Intelligence Score (0 - 100) — Calibrated for sample crawl depth
export function computeCompetitorScore(
  pages: CrawledPage[],
  clusters: ContentCluster[],
  pubFreq: PublishingFrequency,
  seoSnapshot: AnalysisReport['seoSnapshot'],
  linkAnalysis: AnalysisReport['linkAnalysis']
): CompetitorScore {
  const articles = pages.filter(p => p.isArticle);
  const totalWords = pages.reduce((acc, p) => acc + p.wordCount, 0);
  const avgWordsPerArticle = articles.length > 0 ? Math.round(totalWords / articles.length) : 0;

  // Content Volume Score (20 pts) — Calibrated based on article density & length in sample
  let contentVolumeScore = 0;
  if (totalWords >= 15000 || articles.length >= 25 || (avgWordsPerArticle >= 800 && articles.length >= 15)) {
    contentVolumeScore = 100;
  } else if (totalWords >= 8000 || articles.length >= 15 || (avgWordsPerArticle >= 600 && articles.length >= 10)) {
    contentVolumeScore = 85;
  } else if (totalWords >= 4000 || articles.length >= 8) {
    contentVolumeScore = 70;
  } else if (totalWords >= 1500 || articles.length >= 4) {
    contentVolumeScore = 55;
  } else {
    contentVolumeScore = 35;
  }

  // Topical Coverage Score (20 pts)
  let topicalCoverageScore = 0;
  const deepClusters = clusters.filter(c => c.articlesCount >= 3);
  if (deepClusters.length >= 3 || clusters.length >= 5) topicalCoverageScore = 95;
  else if (deepClusters.length >= 2 || clusters.length >= 3) topicalCoverageScore = 80;
  else if (clusters.length >= 2) topicalCoverageScore = 65;
  else topicalCoverageScore = 45;

  // Publishing Cadence Score (15 pts)
  let publishingCadenceScore = 50;
  if (pubFreq.articlesPerMonth >= 6) publishingCadenceScore = 95;
  else if (pubFreq.articlesPerMonth >= 3) publishingCadenceScore = 80;
  else if (pubFreq.articlesPerMonth >= 1) publishingCadenceScore = 65;

  // Internal Link Equity Score (15 pts)
  let internalLinkEquityScore = 0;
  const orphanRatio = linkAnalysis.orphanPages.length / Math.max(pages.length, 1);
  if (orphanRatio === 0 && linkAnalysis.avgInternalLinksPerArticle >= 3) internalLinkEquityScore = 95;
  else if (orphanRatio < 0.2 && linkAnalysis.avgInternalLinksPerArticle >= 1.5) internalLinkEquityScore = 80;
  else if (orphanRatio < 0.4) internalLinkEquityScore = 60;
  else internalLinkEquityScore = 40;

  // Metadata Quality Score (15 pts)
  let metadataQualityScore = Math.round(
    (seoSnapshot.titleCoveragePct * 0.4) +
    (seoSnapshot.metaDescriptionCoveragePct * 0.4) +
    (seoSnapshot.h1CoveragePct * 0.2)
  );

  // Schema Coverage Score (15 pts)
  let schemaCoverageScore = Math.min(100, Math.round(seoSnapshot.schemaCoveragePct * 1.2));

  // Weighted Total
  const overallScore = Math.round(
    (contentVolumeScore * 0.20) +
    (topicalCoverageScore * 0.20) +
    (publishingCadenceScore * 0.15) +
    (internalLinkEquityScore * 0.15) +
    (metadataQualityScore * 0.15) +
    (schemaCoverageScore * 0.15)
  );

  let grade: CompetitorScore['grade'] = 'Needs Improvement';
  if (overallScore >= 90) grade = 'A+';
  else if (overallScore >= 80) grade = 'A';
  else if (overallScore >= 68) grade = 'B';
  else if (overallScore >= 50) grade = 'C';

  const summaryText = `Skor Intelligence Konten: ${overallScore}/100 (Grade ${grade}). Volume konten ${contentVolumeScore}/100, cakupan topical ${topicalCoverageScore}/100, dan kesehatan metadata ${metadataQualityScore}/100.`;

  return {
    overallScore,
    grade,
    breakdown: {
      contentVolumeScore,
      topicalCoverageScore,
      publishingCadenceScore,
      internalLinkEquityScore,
      metadataQualityScore,
      schemaCoverageScore,
    },
    summaryText,
  };
}

// 5. Actionable Insight Engine with optional Gemini AI Synthesis
export async function generateActionableInsightsAsync(
  domain: string,
  pages: CrawledPage[],
  contentStats: AnalysisReport['contentStats'],
  clusters: ContentCluster[],
  keywords: KeywordItem[],
  pubFreq: PublishingFrequency,
  seoSnapshot: AnalysisReport['seoSnapshot'],
  linkAnalysis: AnalysisReport['linkAnalysis']
): Promise<ActionableInsight[]> {
  const deterministic = generateActionableInsights(domain, pages, contentStats, clusters, keywords, pubFreq, seoSnapshot, linkAnalysis);

  // If Gemini API Key is available, synthesize additional tactical commentary
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return deterministic;
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI();
    const prompt = `Analisis data SEO kompetitor untuk domain "${domain}":
- Total Artikel: ${contentStats.totalArticles}, Rata-rata kata: ${contentStats.avgWordsPerArticle}
- Cluster Topik Utama: ${clusters.slice(0, 4).map(c => c.name).join(', ')}
- Top Keywords: ${keywords.slice(0, 5).map(k => k.keyword).join(', ')}
- Meta Description Coverage: ${seoSnapshot.metaDescriptionCoveragePct}%, Schema: ${seoSnapshot.schemaCoveragePct}%
- Internal links/artikel: ${linkAnalysis.avgInternalLinksPerArticle}

Berikan 1 insight strategis dan rekomendasi taktis tajam untuk mengalahkan kompetitor ini dalam 2 kalimat bahasa Indonesia singkat, padat, dan actionable. Format JSON: {"title": "...", "description": "..."}`;

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 3500));
    const aiCall = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const response: any = await Promise.race([aiCall, timeoutPromise]);
    const parsed = JSON.parse(response.text);

    if (parsed && parsed.title && parsed.description) {
      deterministic.unshift({
        id: 'gemini_ai_strategy',
        type: 'opportunity',
        title: `⚡ AI Strategic Edge: ${parsed.title}`,
        description: parsed.description,
        metric: 'Gemini Strategy',
      });
    }
  } catch {
    // If Gemini timeout or error, smoothly fallback to deterministic insights
  }

  return deterministic;
}

export function generateActionableInsights(
  domain: string,
  pages: CrawledPage[],
  contentStats: AnalysisReport['contentStats'],
  clusters: ContentCluster[],
  keywords: KeywordItem[],
  pubFreq: PublishingFrequency,
  seoSnapshot: AnalysisReport['seoSnapshot'],
  linkAnalysis: AnalysisReport['linkAnalysis']
): ActionableInsight[] {
  const insights: ActionableInsight[] = [];

  // 1. Content Depth & Length
  if (contentStats.avgWordsPerArticle > 900) {
    insights.push({
      id: 'ins_depth_strong',
      type: 'strength',
      title: 'Dominasi Konten Mendalam (Long-form)',
      description: `${domain} memproduksi konten komprehensif dengan rata-rata ${contentStats.avgWordsPerArticle} kata per artikel. Untuk mengungguli mereka, buat konten pilar 1.500+ kata dengan visual original.`,
      metric: `${contentStats.avgWordsPerArticle} kata/artikel`,
    });
  } else if (contentStats.avgWordsPerArticle < 500 && contentStats.totalArticles > 0) {
    insights.push({
      id: 'ins_depth_thin',
      type: 'opportunity',
      title: 'Peluang Mengalahkan Thin Content',
      description: `Rata-rata panjang artikel kompetitor hanya ${contentStats.avgWordsPerArticle} kata. Publikasikan panduan mendalam (1.000+ kata) untuk merebut ranking kata kunci utama.`,
      metric: `${contentStats.avgWordsPerArticle} kata/artikel`,
    });
  }

  // 2. Topical Clustering
  const leadingCluster = clusters[0];
  if (leadingCluster && leadingCluster.articlesCount >= 4) {
    insights.push({
      id: 'ins_cluster_authority',
      type: 'strength',
      title: `Topical Authority Kuat pada "${leadingCluster.name}"`,
      description: `Kompetitor memiliki silo konten kuat pada pilar "${leadingCluster.name}" dengan ${leadingCluster.articlesCount} artikel saling terhubung.`,
      metric: `${leadingCluster.articlesCount} artikel`,
    });
  }

  // 3. Technical Meta Coverage
  if (seoSnapshot.metaDescriptionCoveragePct < 70) {
    insights.push({
      id: 'ins_meta_missing',
      type: 'opportunity',
      title: 'Kelemahan Snippet Meta Description',
      description: `${100 - seoSnapshot.metaDescriptionCoveragePct}% halaman kompetitor tidak memiliki meta description. Pastikan Anda menulis meta deskripsi yang menarik untuk CTR lebih tinggi.`,
      metric: `${seoSnapshot.metaDescriptionCoveragePct}% terisi`,
    });
  }

  // 4. Schema Markup
  if (seoSnapshot.schemaCoveragePct === 0) {
    insights.push({
      id: 'ins_schema_none',
      type: 'opportunity',
      title: 'Absennya Structured Data (Schema.org)',
      description: 'Kompetitor belum memanfaatkan Schema JSON-LD (Article/FAQ). Terapkan schema rich snippets untuk mendapatkan tampilan bintang atau FAQ di hasil Google.',
      metric: '0% Schema JSON-LD',
    });
  }

  // 5. Internal Linking
  if (linkAnalysis.orphanPages.length > 0) {
    insights.push({
      id: 'ins_orphan_pages',
      type: 'weakness',
      title: 'Terdeteksi Halaman Tanpa Internal Link (Orphan)',
      description: `Ditemukan ${linkAnalysis.orphanPages.length} halaman tanpa inlink internal. Hindari kesalahan ini pada website Anda dengan membuat struktur internal link terencana.`,
      metric: `${linkAnalysis.orphanPages.length} orphan pages`,
    });
  }

  // 6. Content Freshness Signal (2026 Update)
  const articlesWithDates = pages.filter(p => p.isArticle && (p.lastModifiedDate || p.publishedDate));
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const updatedRecentlyCount = articlesWithDates.filter(p => {
    const dStr = p.lastModifiedDate || p.publishedDate;
    if (!dStr) return false;
    const d = new Date(dStr);
    return !isNaN(d.getTime()) && d >= oneYearAgo;
  }).length;

  const freshnessPct = articlesWithDates.length > 0
    ? Math.round((updatedRecentlyCount / articlesWithDates.length) * 100)
    : 0;

  if (articlesWithDates.length >= 3 && freshnessPct < 30) {
    insights.push({
      id: 'ins_freshness_opportunity',
      type: 'opportunity',
      title: 'Celah Konten Usang (Content Refresh Opportunity)',
      description: `Hanya ${freshnessPct}% artikel kompetitor yang diperbarui dalam 12 bulan terakhir. Kompetitor jarang me-refresh konten lama mereka — ini celah strategis untuk merebut ranking dengan konten yang lebih segar dan mutakhir.`,
      metric: `${freshnessPct}% aktif diperbarui`,
    });
  }

  // 7. E-E-A-T & Author Trust Signals
  const articlesWithAuthor = pages.filter(p => p.isArticle && p.author).length;
  const authorPct = contentStats.totalArticles > 0 ? Math.round((articlesWithAuthor / contentStats.totalArticles) * 100) : 0;
  if (contentStats.totalArticles >= 3 && authorPct < 25) {
    insights.push({
      id: 'ins_eeat_opportunity',
      type: 'opportunity',
      title: 'Peluang Keunggulan E-E-A-T & Kredibilitas Penulis',
      description: `Hanya ${authorPct}% artikel kompetitor yang menampilkan identitas author terverifikasi. Cantumkan profil pakar (author byline) dan skema Person/Author untuk meraih skor kepercayaan E-E-A-T Google lebih tinggi.`,
      metric: `${authorPct}% artikel berpenulis`,
    });
  }

  // 8. AI-Overview Readiness
  const highAiReadyPages = pages.filter(p => (p.aiReadyScore || 0) >= 70);
  if (highAiReadyPages.length > 0) {
    insights.push({
      id: 'ins_aio_readiness',
      type: 'strength',
      title: 'Struktur Konten Siap Dikutip AI (AI-Overview Ready)',
      description: `Sebanyak ${highAiReadyPages.length} artikel memiliki struktur jawaban langsung, daftar poin, dan format FAQ yang ramah kutipan AI Search (Google AI Overview & ChatGPT).`,
      metric: `${highAiReadyPages.length} artikel AI-ready`,
    });
  }

  return insights;
}

// 6. Content Gap Analysis between Domain A and Domain B
export function computeContentGap(reportA: AnalysisReport, reportB: AnalysisReport): ContentGapResult {
  const kwMapA = new Map(reportA.keywords.map(k => [k.keyword.toLowerCase(), k]));
  const kwMapB = new Map(reportB.keywords.map(k => [k.keyword.toLowerCase(), k]));

  const allKeywords = Array.from(new Set([...kwMapA.keys(), ...kwMapB.keys()]));

  const commonKeywords: string[] = [];
  const keywordGaps: Array<{
    keyword: string;
    competitorFrequency: number;
    intent: string;
    category: string;
  }> = [];

  for (const kw of allKeywords) {
    const inA = kwMapA.get(kw);
    const inB = kwMapB.get(kw);

    if (inA && inB) {
      commonKeywords.push(kw);
    } else if (!inA && inB) {
      keywordGaps.push({
        keyword: kw,
        competitorFrequency: inB.frequency,
        intent: inB.intent,
        category: inB.classification,
      });
    }
  }

  const clustersA = new Set(reportA.clusters.map(c => c.name.toLowerCase()));
  const clustersB = new Set(reportB.clusters.map(c => c.name.toLowerCase()));

  const commonTopics = reportA.clusters.filter(c => clustersB.has(c.name.toLowerCase())).map(c => c.name);
  const targetUniqueTopics = reportA.clusters.filter(c => !clustersB.has(c.name.toLowerCase())).map(c => c.name);
  const competitorUniqueTopics = reportB.clusters.filter(c => !clustersA.has(c.name.toLowerCase())).map(c => c.name);

  const insights: string[] = [];
  if (competitorUniqueTopics.length > 0) {
    insights.push(`Kompetitor (${reportB.domain}) memiliki ${competitorUniqueTopics.length} klaster topik yang belum Anda garap: ${competitorUniqueTopics.slice(0, 3).join(', ')}.`);
  }
  if (keywordGaps.length > 0) {
    insights.push(`Ditemukan ${keywordGaps.length} peluang kata kunci potensial yang dapat dijadikan artikel baru.`);
  }

  return {
    targetDomain: reportA.domain,
    competitorDomain: reportB.domain,
    comparedAt: new Date().toISOString(),
    commonTopics,
    competitorUniqueTopics,
    targetUniqueTopics,
    commonKeywords,
    keywordGaps: keywordGaps.slice(0, 30),
    totalOpportunitiesCount: competitorUniqueTopics.length + keywordGaps.length,
    insights,
  };
}

// 7. Master Report Assembly
export async function assembleReport(
  crawlResult: CrawlEngineResult,
  mode: 'free' | 'byok',
  byokData?: ByokData
): Promise<AnalysisReport> {
  const {
    domain,
    originalUrl,
    httpStatus,
    isHttps,
    crawlDurationMs,
    totalUrlsDiscovered,
    totalUrlsCrawled,
    failedUrlsCount,
    hasSitemap,
    sitemapUrlsCount,
    hasRobotsTxt,
    isRobotsRestricted,
    robotsDisallowRules,
    isJsRenderedWebsite,
    pages,
  } = crawlResult;

  const totalPagesCount = Math.max(pages.length, 1);
  const articles = pages.filter(p => p.isArticle);

  // Article Inventory & Total Count resolution
  const fallbackInventory: ArticleInventorySummary = {
    totalArticles: articles.length,
    inventoryLimit: 30,
    inventoryCount: Math.min(30, articles.length),
    sampledLatestArticles: Math.min(30, articles.length),
    countSource: 'legacy',
    countConfidence: 'medium',
    hasCompleteArticleCount: true,
  };

  const articleInventory: ArticleInventorySummary = crawlResult.articleInventory || fallbackInventory;
  const articleCandidates: ArticleCandidate[] = crawlResult.articleCandidates || [];
  const articleInventoryPages: CrawledPage[] = (crawlResult.articleInventoryPages && crawlResult.articleInventoryPages.length > 0)
    ? crawlResult.articleInventoryPages
    : articles.slice(0, 30);

  const totalArticles = articleInventory.totalArticles;
  const analyzedSampleArticles = articleInventoryPages.length > 0 ? articleInventoryPages : articles;
  const totalAnalyzedCount = Math.max(analyzedSampleArticles.length, 1);

  const totalWords = analyzedSampleArticles.reduce((acc, p) => acc + p.wordCount, 0);
  const avgWordsPerArticle = analyzedSampleArticles.length > 0
    ? Math.round(totalWords / analyzedSampleArticles.length)
    : Math.round(pages.reduce((acc, p) => acc + p.wordCount, 0) / totalPagesCount);

  let shortestArticle = { title: '-', words: 0, url: '-' };
  let longestArticle = { title: '-', words: 0, url: '-' };

  if (analyzedSampleArticles.length > 0) {
    const sortedArticles = [...analyzedSampleArticles].sort((a, b) => a.wordCount - b.wordCount);
    shortestArticle = {
      title: sortedArticles[0].metadata.title || sortedArticles[0].path,
      words: sortedArticles[0].wordCount,
      url: sortedArticles[0].url,
    };
    longestArticle = {
      title: sortedArticles[sortedArticles.length - 1].metadata.title || sortedArticles[sortedArticles.length - 1].path,
      words: sortedArticles[sortedArticles.length - 1].wordCount,
      url: sortedArticles[sortedArticles.length - 1].url,
    };
  }

  const contentStats = {
    totalArticles,
    totalWords,
    avgWordsPerArticle,
    shortestArticle,
    longestArticle,
    avgParagraphs: parseFloat((analyzedSampleArticles.reduce((acc, p) => acc + p.paragraphCount, 0) / totalAnalyzedCount).toFixed(1)),
    avgHeadings: parseFloat((analyzedSampleArticles.reduce((acc, p) => acc + p.headings.totalH2 + p.headings.totalH3, 0) / totalAnalyzedCount).toFixed(1)),
    avgInternalLinksPerArticle: parseFloat((analyzedSampleArticles.reduce((acc, p) => acc + p.internalLinks.length, 0) / totalAnalyzedCount).toFixed(1)),
  };

  const analysisScope: AnalysisScope = {
    totalArticles,
    analyzedArticles: analyzedSampleArticles.length,
    inventoryLimit: 30,
    inventoryIsSampled: totalArticles > analyzedSampleArticles.length,
    samplingStrategy: 'latest',
  };

  // Keyword Analysis
  const keywords = extractKeywords(pages);

  // Content Clustering with Semantic AI + Rule-based fallback
  const clusters = await buildSemanticClustersAsync(pages, keywords);

  // Publishing Frequency
  const publishingFrequency = calculatePublishingFrequency(pages);

  // Trust & E-E-A-T Signals
  const articlesWithAuthor = analyzedSampleArticles.filter(p => p.author).length;
  const hasAboutPage = pages.some(p => /\/(about|tentang|profil|profile|tentang-kami|about-us)/i.test(p.path));
  const hasContactPage = pages.some(p => /\/(contact|kontak|hubungi|hubungi-kami)/i.test(p.path));
  const hasPrivacyPolicy = pages.some(p => /\/(privacy|kebijakan-privasi|syarat-ketentuan|terms)/i.test(p.path));
  const authoritativeDomainsFound = Array.from(new Set(
    pages.flatMap(p => p.externalLinks.map(l => l.targetDomain).filter(d => d && /(\.gov|\.edu|\.ac\.id|\.go\.id|wikipedia\.org|who\.int|nature\.com|nih\.gov|bps\.go\.id|kemkes\.go\.id|kominfo\.go\.id|reuters\.com|bbc\.com|scholar\.google|iso\.org|w3\.org)/i.test(d)))
  ));
  const totalAuthoritativeLinks = analyzedSampleArticles.reduce((acc, p) => acc + (p.authoritativeLinksCount || 0), 0);
  const avgAuthoritativeOutboundLinksPerArticle = analyzedSampleArticles.length > 0 ? parseFloat((totalAuthoritativeLinks / analyzedSampleArticles.length).toFixed(1)) : 0;
  const trustSignals: TrustSignals = {
    articlesWithAuthorPct: analyzedSampleArticles.length > 0 ? Math.round((articlesWithAuthor / analyzedSampleArticles.length) * 100) : 0,
    hasAboutPage,
    hasContactPage,
    hasPrivacyPolicy,
    avgAuthoritativeOutboundLinksPerArticle,
    authoritativeDomainsFound: authoritativeDomainsFound.slice(0, 10),
  };

  // Content Freshness Engine
  const articlesWithDates = pages.filter(p => p.isArticle && (p.lastModifiedDate || p.publishedDate));
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const updatedRecentlyCount = articlesWithDates.filter(p => {
    const dStr = p.lastModifiedDate || p.publishedDate;
    if (!dStr) return false;
    const d = new Date(dStr);
    return !isNaN(d.getTime()) && d >= oneYearAgo;
  }).length;
  const contentFreshness: ContentFreshness = {
    updatedWithin12MonthsPct: articlesWithDates.length > 0 ? Math.round((updatedRecentlyCount / articlesWithDates.length) * 100) : 0,
    articlesWithModifiedDateCount: pages.filter(p => p.lastModifiedDate).length,
  };

  // Google PageSpeed Insights & Core Web Vitals Snapshot (Async on sample URLs)
  const sampleArticleUrls = articles.slice(0, 3).map(a => a.url);
  const performanceSnapshot = await fetchPageSpeedMetrics(originalUrl, sampleArticleUrls);

  // SEO Snapshot
  const pagesWithTitle = pages.filter(p => p.metadata.titleLength > 0).length;
  const pagesWithMetaDesc = pages.filter(p => p.metadata.descriptionLength > 0).length;
  const pagesWithH1 = pages.filter(p => p.headings.totalH1 === 1).length;
  const pagesWithDuplicateH1 = pages.filter(p => p.headings.totalH1 > 1).length;
  const pagesMissingH1 = pages.filter(p => p.headings.totalH1 === 0).length;
  const pagesWithSchema = pages.filter(p => p.schemas.length > 0).length;

  const titleCounts = new Map<string, number>();
  for (const p of pages) {
    if (p.metadata.title) {
      titleCounts.set(p.metadata.title, (titleCounts.get(p.metadata.title) || 0) + 1);
    }
  }
  let duplicateTitleCount = 0;
  for (const count of titleCounts.values()) {
    if (count > 1) duplicateTitleCount += count;
  }

  const detectedSchemaTypes = Array.from(new Set(pages.flatMap(p => p.schemas.map(s => s.type))));

  const seoSnapshot = {
    titleCoveragePct: Math.round((pagesWithTitle / totalPagesCount) * 100),
    metaDescriptionCoveragePct: Math.round((pagesWithMetaDesc / totalPagesCount) * 100),
    missingMetaDescriptionCount: totalPagesCount - pagesWithMetaDesc,
    duplicateTitleCount,
    h1CoveragePct: Math.round((pagesWithH1 / totalPagesCount) * 100),
    missingH1Count: pagesMissingH1,
    multipleH1Count: pagesWithDuplicateH1,
    schemaCoveragePct: Math.round((pagesWithSchema / totalPagesCount) * 100),
    detectedSchemaTypes,
  };

  // Link Analysis
  let totalInternalLinks = 0;
  let totalExternalLinks = 0;
  const inlinksMap = new Map<string, number>();
  const outlinkDomainsMap = new Map<string, number>();

  for (const p of pages) {
    totalInternalLinks += p.internalLinks.length;
    totalExternalLinks += p.externalLinks.length;

    for (const inLink of p.internalLinks) {
      inlinksMap.set(inLink.url, (inlinksMap.get(inLink.url) || 0) + 1);
    }

    for (const extLink of p.externalLinks) {
      if (extLink.targetDomain) {
        outlinkDomainsMap.set(extLink.targetDomain, (outlinkDomainsMap.get(extLink.targetDomain) || 0) + 1);
      }
    }
  }

  const topLinkedPages: Array<{ url: string; inlinksCount: number }> = [];
  const leastLinkedPages: Array<{ url: string; inlinksCount: number }> = [];
  const orphanPages: Array<{ url: string; path: string }> = [];

  for (const p of pages) {
    const inCount = inlinksMap.get(p.url) || 0;
    topLinkedPages.push({ url: p.url, inlinksCount: inCount });
    if (inCount === 0 && p.path !== '/' && p.url !== originalUrl) {
      orphanPages.push({ url: p.url, path: p.path });
    }
  }

  topLinkedPages.sort((a, b) => b.inlinksCount - a.inlinksCount);
  leastLinkedPages.push(...topLinkedPages.slice().reverse().slice(0, 10));

  const topExternalDomains: Array<{ domain: string; count: number }> = [];
  for (const [extDom, count] of outlinkDomainsMap.entries()) {
    topExternalDomains.push({ domain: extDom, count });
  }
  topExternalDomains.sort((a, b) => b.count - a.count);

  const linkAnalysis = {
    totalInternalLinks,
    uniqueInternalUrls: inlinksMap.size,
    avgInternalLinksPerArticle: parseFloat((totalInternalLinks / totalPagesCount).toFixed(1)),
    topLinkedPages: topLinkedPages.slice(0, 10),
    leastLinkedPages,
    orphanPages,
    totalExternalLinks,
    uniqueExternalDomains: outlinkDomainsMap.size,
    topExternalDomains: topExternalDomains.slice(0, 10),
  };

  // Image Analysis
  let totalImages = 0;
  let imagesWithAlt = 0;
  let lazyImages = 0;
  const formatsBreakdown: Record<string, number> = {};

  for (const p of pages) {
    for (const img of p.images) {
      totalImages++;
      if (img.hasAlt) imagesWithAlt++;
      if (img.isLazy) lazyImages++;
      const fmt = img.format || 'other';
      formatsBreakdown[fmt] = (formatsBreakdown[fmt] || 0) + 1;
    }
  }

  const imageAnalysis = {
    totalImages,
    imagesWithAlt,
    imagesWithoutAlt: totalImages - imagesWithAlt,
    altCoveragePct: totalImages > 0 ? Math.round((imagesWithAlt / totalImages) * 100) : 100,
    lazyLoadingPct: totalImages > 0 ? Math.round((lazyImages / totalImages) * 100) : 0,
    formatsBreakdown,
  };

  // Competitor Score
  const competitorScore = computeCompetitorScore(pages, clusters, publishingFrequency, seoSnapshot, linkAnalysis);

  // Insights with AI strategic commentary
  const insights = await generateActionableInsightsAsync(
    domain,
    pages,
    contentStats,
    clusters,
    keywords,
    publishingFrequency,
    seoSnapshot,
    linkAnalysis
  );

  return {
    id: `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    domain,
    originalUrl,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mode,
    status: 'completed',
    crawlDurationMs,
    overview: {
      domain,
      analyzedUrl: originalUrl,
      httpStatus,
      isHttps,
      totalUrlsDiscovered,
      totalUrlsCrawled,
      failedUrlsCount,
      hasSitemap,
      sitemapUrlsCount,
      hasRobotsTxt,
      isRobotsRestricted,
      robotsDisallowRules,
      isJsRenderedWebsite,
    },
    contentStats,
    pages,
    keywords,
    clusters,
    publishingFrequency,
    seoSnapshot,
    linkAnalysis,
    imageAnalysis,
    competitorScore,
    insights,
    articleInventory,
    articleCandidates,
    analysisScope,
    articleInventoryPages,
    performanceSnapshot,
    trustSignals,
    contentFreshness,
    byokData,
  };
}
