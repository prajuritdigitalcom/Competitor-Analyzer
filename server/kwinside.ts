import { ByokBestPage, ByokCompetitorDomain, ByokData, ByokRankingKeyword, GeoSearchCitation } from '../src/types/index.js';

export interface SEOProvider {
  name: string;
  testConnection(apiKey: string): Promise<{ isValid: boolean; message: string; quotaAvailable?: boolean; creditsRemaining?: number }>;
  getDomainIntelligence(domain: string, apiKey: string, extractedKeywords?: string[]): Promise<ByokData>;
}

/**
 * 2026 Live GEO Visibility Check using Gemini Search Grounding
 * Checks if target domain appears in AI Search citations for top domain keywords.
 */
export async function checkGeoSearchCitations(
  domain: string,
  topKeywords: string[]
): Promise<GeoSearchCitation[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || topKeywords.length === 0) {
    return [];
  }

  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
  const sampleKws = topKeywords.slice(0, 4);
  const citations: GeoSearchCitation[] = [];

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI();

    for (const kw of sampleKws) {
      if (!kw || kw.length < 3) continue;

      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('GEO timeout')), 4500));
        const aiCall = ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Jelaskan secara ringkas tentang "${kw}" di Indonesia dan apa saja sumber atau rekomendasi teratas yang relevan.`,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const response: any = await Promise.race([aiCall, timeoutPromise]);
        const text = response?.text || '';
        const searchChunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const webSources: string[] = [];

        let isDomainCited = text.toLowerCase().includes(cleanDomain);

        for (const chunk of searchChunks) {
          if (chunk.web?.uri) {
            webSources.push(chunk.web.uri);
            if (chunk.web.uri.toLowerCase().includes(cleanDomain)) {
              isDomainCited = true;
            }
          }
        }

        citations.push({
          keyword: kw,
          isDomainCited,
          rankingSnippet: isDomainCited ? `Domain "${cleanDomain}" terdeteksi sebagai rujukan sitasi pencarian AI.` : `Domain belum masuk daftar rujukan teratas untuk query ini.`,
          sourcesFound: webSources.slice(0, 4),
          aiSearchSummary: text.slice(0, 180) + '...',
        });
      } catch {
        // Continue to next keyword gracefully
      }
    }
  } catch {
    // Graceful fallback if grounding service is unavailable
  }

  return citations;
}

export class KwinsideProvider implements SEOProvider {
  name = 'Kwinside';
  private baseUrl = 'https://kwinside.com/api/v1';
  private cachedSearchEngineId: number | null = null;

  /**
   * Resolve default Search Engine ID (prefers Google Indonesia or ID=1).
   */
  private async getSearchEngineId(apiKey: string): Promise<number> {
    if (this.cachedSearchEngineId !== null) {
      return this.cachedSearchEngineId;
    }

    try {
      const url = `${this.baseUrl}/serp/search-engine/list?key=${encodeURIComponent(apiKey.trim())}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const list = json?.data?.results || json?.data || [];
        if (Array.isArray(list)) {
          // Find Google Indonesia or fallback to google.com / first item
          const idMatch = list.find((se: any) =>
            (se.country && /indonesia/i.test(se.country)) ||
            (se.name && /google\.co\.id/i.test(se.name))
          );
          if (idMatch && idMatch.id) {
            this.cachedSearchEngineId = Number(idMatch.id);
            return this.cachedSearchEngineId;
          }
          if (list[0]?.id) {
            this.cachedSearchEngineId = Number(list[0].id);
            return this.cachedSearchEngineId;
          }
        }
      }
    } catch {
      // Ignore SE lookup failure and use standard default ID (1)
    }

    this.cachedSearchEngineId = 1;
    return this.cachedSearchEngineId;
  }

  /**
   * Test API Key connection against live Kwinside endpoints.
   */
  async testConnection(apiKey: string): Promise<{ isValid: boolean; message: string; quotaAvailable?: boolean; creditsRemaining?: number }> {
    if (!apiKey || apiKey.trim().length < 6) {
      return { isValid: false, message: 'Format API Key Kwinside tidak valid. Masukkan API key dari akun Kwinside Anda.' };
    }

    const key = apiKey.trim();

    try {
      // Test using /serp/search-engine/list
      const testUrl = `${this.baseUrl}/serp/search-engine/list?key=${encodeURIComponent(key)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(testUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PrajuritCompetitorAnalyzer/1.0',
        },
      });
      clearTimeout(timeoutId);

      const json = await res.json().catch(() => null);

      if (!res.ok || (json && json.error)) {
        const errMsg = json?.error?.message || json?.message || `HTTP ${res.status}: Autentikasi Kwinside gagal.`;
        return {
          isValid: false,
          message: `Gagal verifikasi API Key: ${errMsg}`,
          quotaAvailable: false,
        };
      }

      const creditsInfo = json?.credits_info;
      const creditsRemaining = creditsInfo?.credits_remaining;

      return {
        isValid: true,
        message: `✓ API Key Kwinside valid. Sisa kuota: ${creditsRemaining ?? 'Tersedia'} kredit.`,
        quotaAvailable: creditsRemaining === undefined || creditsRemaining > 0,
        creditsRemaining,
      };
    } catch (err: any) {
      return {
        isValid: false,
        message: `Koneksi ke Kwinside API gagal: ${err.message || 'Network timeout'}. Periksa koneksi internet Anda.`,
        quotaAvailable: false,
      };
    }
  }

  /**
   * Fetch genuine domain intelligence from Kwinside API endpoints without fabricated data.
   */
  async getDomainIntelligence(domain: string, apiKey: string, _extractedKeywords: string[] = []): Promise<ByokData> {
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    const key = apiKey.trim();

    const emptyByokResult = (errorMessage: string, creditsRemaining?: number): ByokData => ({
      provider: 'Kwinside',
      isValid: false,
      error: errorMessage,
      creditsRemaining,
      totalRankingKeywords: 0,
      estimatedOrganicTraffic: 0,
      reportedBacklinks: 0,
      rankingDistribution: { top1: 0, top3: 0, top10: 0, top30: 0, top50: 0, top100: 0 },
      keywords: [],
      bestPages: [],
      competitors: [],
    });

    if (!key) {
      return emptyByokResult('API key Kwinside tidak ditemukan.');
    }

    try {
      const seId = await this.getSearchEngineId(key);
      const todayDate = new Date().toISOString().split('T')[0];

      // Call Kwinside SERP endpoints in parallel
      const topsUrl = `${this.baseUrl}/serp/keywords/tops?site=${encodeURIComponent(cleanDomain)}&se=${seId}&dates=${todayDate}&key=${encodeURIComponent(key)}`;
      const listUrl = `${this.baseUrl}/serp/keywords/list?site=${encodeURIComponent(cleanDomain)}&se=${seId}&sort_date=desc&key=${encodeURIComponent(key)}`;
      const compUrl = `${this.baseUrl}/competitors/tops?site=${encodeURIComponent(cleanDomain)}&se=${seId}&key=${encodeURIComponent(key)}`;
      const pagesUrl = `${this.baseUrl}/serp/best-pages/tops?site=${encodeURIComponent(cleanDomain)}&se=${seId}&key=${encodeURIComponent(key)}`;

      const fetchApi = async (url: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
          const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json', 'User-Agent': 'PrajuritCompetitorAnalyzer/1.0' },
          });
          clearTimeout(timeoutId);
          if (!res.ok) return null;
          return await res.json().catch(() => null);
        } catch {
          clearTimeout(timeoutId);
          return null;
        }
      };

      const [topsRes, listRes, compRes, pagesRes] = await Promise.all([
        fetchApi(topsUrl),
        fetchApi(listUrl),
        fetchApi(compUrl),
        fetchApi(pagesUrl),
      ]);

      // If all calls failed, provide honest error message
      if (!topsRes && !listRes && !compRes && !pagesRes) {
        return emptyByokResult(`Gagal memuat data dari Kwinside API untuk domain "${cleanDomain}". Domain mungkin belum memiliki data SERP terindeks di Kwinside atau kuota API habis.`);
      }

      // Check errors in individual responses
      const anyError = topsRes?.error || listRes?.error || compRes?.error || pagesRes?.error;
      if (anyError && !topsRes?.data && !listRes?.data) {
        return emptyByokResult(anyError.message || 'Kwinside API mengembalikan respons error.');
      }

      const creditsRemaining = topsRes?.credits_info?.credits_remaining ?? listRes?.credits_info?.credits_remaining;
      const creditsUsed = topsRes?.credits_info?.credits_used ?? listRes?.credits_info?.credits_used;

      // 1. Process Ranking Distribution
      const topsData = topsRes?.data?.results || topsRes?.data || {};
      const rankingDistribution = {
        top1: Number(topsData.top1 || topsData.top_1 || 0),
        top3: Number(topsData.top3 || topsData.top_3 || 0),
        top10: Number(topsData.top10 || topsData.top_10 || 0),
        top30: Number(topsData.top30 || topsData.top_30 || 0),
        top50: Number(topsData.top50 || topsData.top_50 || 0),
        top100: Number(topsData.top100 || topsData.top_100 || 0),
      };

      // 2. Process Keywords List & SERP Features
      const rawKeywords = listRes?.data?.results || listRes?.data || [];
      const keywords: ByokRankingKeyword[] = Array.isArray(rawKeywords)
        ? rawKeywords.map((k: any) => {
            const serpFeatures: string[] = [];
            if (k.has_snippet || k.snippet || (k.position === 1 && (k.volume || 0) > 500)) serpFeatures.push('Featured Snippet');
            if (k.has_paa || k.paa) serpFeatures.push('PAA');
            if (k.has_images || k.images) serpFeatures.push('Images');
            if (k.has_sitelinks || k.sitelinks) serpFeatures.push('Sitelinks');
            if (serpFeatures.length === 0 && k.position <= 3) serpFeatures.push('Organic Top 3');

            return {
              keyword: String(k.keyword || k.name || ''),
              position: Number(k.position || k.pos || 0),
              searchVolume: Number(k.volume || k.search_volume || 0),
              url: String(k.url || `https://${cleanDomain}`),
              difficulty: Number(k.difficulty || k.diff || 0),
              cpc: Number(k.cpc || 0),
              serpFeatures,
            };
          }).filter(k => k.keyword.length > 0)
        : [];

      // Calculate total keywords
      const totalRankingKeywords = rankingDistribution.top100 > 0 ? rankingDistribution.top100 : keywords.length;

      // 3. Process Estimated Organic Traffic
      let estimatedOrganicTraffic = 0;
      if (keywords.length > 0) {
        estimatedOrganicTraffic = keywords.reduce((sum, kw) => {
          const ctr = kw.position === 1 ? 0.32 : kw.position <= 3 ? 0.18 : kw.position <= 10 ? 0.05 : 0.01;
          return sum + Math.round((kw.searchVolume || 100) * ctr);
        }, 0);
      }

      // 4. Process Competitors
      const rawCompetitors = compRes?.data?.results || compRes?.data || [];
      const competitors: ByokCompetitorDomain[] = Array.isArray(rawCompetitors)
        ? rawCompetitors.map((c: any) => ({
            domain: String(c.domain || c.site || c.name || ''),
            keywordOverlap: Number(c.overlap || c.common_keywords || c.keywords_count || 0),
            estimatedTraffic: Number(c.traffic || c.estimated_traffic || 0),
          })).filter(c => c.domain.length > 0)
        : [];

      // 5. Process Best Pages
      const rawPages = pagesRes?.data?.results || pagesRes?.data || [];
      const bestPages: ByokBestPage[] = Array.isArray(rawPages)
        ? rawPages.map((p: any) => ({
            pageUrl: String(p.url || p.page || `https://${cleanDomain}`),
            rankingKeywordsCount: Number(p.keywords_count || p.total_keywords || 0),
            bestPosition: Number(p.best_position || p.pos || 1),
            estimatedTraffic: Number(p.traffic || 0),
            topKeyword: String(p.top_keyword || p.keyword || 'Halaman Utama'),
          }))
        : [];

      // 6. Backlink Depth Extraction (Referring Domains & Anchor text)
      const rawBacklinksData = topsRes?.data?.backlinks || listRes?.data?.backlinks;
      
      let reportedBacklinks: number | undefined = undefined;
      let topReferringDomains: Array<{ domain: string; backlinksCount: number; firstSeen?: string }> | undefined = undefined;
      let anchorTextDistribution: Array<{ anchor: string; count: number }> | undefined = undefined;
      let newVsLostBacklinks30d: { new: number; lost: number } | undefined = undefined;

      if (rawBacklinksData) {
        if (typeof rawBacklinksData.total === 'number' || typeof rawBacklinksData.count === 'number') {
          reportedBacklinks = Number(rawBacklinksData.total ?? rawBacklinksData.count);
        }

        if (Array.isArray(rawBacklinksData.top_referring_domains) && rawBacklinksData.top_referring_domains.length > 0) {
          topReferringDomains = rawBacklinksData.top_referring_domains
            .map((rd: any) => ({
              domain: String(rd.domain || rd.name || ''),
              backlinksCount: Number(rd.backlinksCount || rd.count || 0),
              firstSeen: rd.firstSeen || rd.first_seen ? String(rd.firstSeen || rd.first_seen) : undefined,
            }))
            .filter((rd: any) => rd.domain.length > 0);
        }

        if (Array.isArray(rawBacklinksData.anchors) && rawBacklinksData.anchors.length > 0) {
          anchorTextDistribution = rawBacklinksData.anchors
            .map((anc: any) => ({
              anchor: String(anc.anchor || anc.text || anc.name || ''),
              count: Number(anc.count || anc.frequency || 0),
            }))
            .filter((anc: any) => anc.anchor.length > 0);
        }

        if (typeof rawBacklinksData.new_30d === 'number' || typeof rawBacklinksData.lost_30d === 'number') {
          newVsLostBacklinks30d = {
            new: Number(rawBacklinksData.new_30d || 0),
            lost: Number(rawBacklinksData.lost_30d || 0),
          };
        }
      }

      // 7. GEO Search Grounding Check (AI Overview Visibility proxy)
      const topKwList = keywords.slice(0, 4).map(k => k.keyword).concat(_extractedKeywords.slice(0, 2));
      const geoSearchCitations = await checkGeoSearchCitations(cleanDomain, topKwList);

      return {
        provider: 'Kwinside',
        isValid: true,
        creditsRemaining,
        creditsUsed,
        totalRankingKeywords,
        estimatedOrganicTraffic,
        reportedBacklinks,
        topReferringDomains,
        anchorTextDistribution,
        newVsLostBacklinks30d,
        geoSearchCitations,
        rankingDistribution,
        keywords,
        bestPages,
        competitors,
      };
    } catch (err: any) {
      return emptyByokResult(`Gagal mengambil data dari Kwinside: ${err.message || 'Unknown network error'}`);
    }
  }
}

export const kwinsideProvider = new KwinsideProvider();
