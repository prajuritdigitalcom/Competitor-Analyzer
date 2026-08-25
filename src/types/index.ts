export type AnalysisMode = 'free' | 'byok';

export type AnalysisStatus =
  | 'idle'
  | 'queued'
  | 'crawling'
  | 'analyzing'
  | 'fetching_external_data'
  | 'completed'
  | 'partial'
  | 'failed';

export type DataSource = 'CRAWLED' | 'CALCULATED' | 'ESTIMATED' | 'EXTERNAL API' | 'PRAJURIT DIGITAL';

export interface CrawlProgress {
  step: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  message: string;
  urlsDiscovered?: number;
  urlsCrawled?: number;
  currentUrl?: string;
}

export interface PageMetadata {
  title: string;
  titleLength: number;
  description: string;
  descriptionLength: number;
  canonical: string;
  isSelfCanonical: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
  lang?: string;
  charset?: string;
}

export interface HeadingItem {
  level: number; // 1, 2, 3, 4
  text: string;
}

export interface HeadingStructure {
  h1: string[];
  h2: string[];
  h3: string[];
  totalH1: number;
  totalH2: number;
  totalH3: number;
  isH1Missing: boolean;
  isH1Duplicate: boolean;
}

export interface SchemaItem {
  type: string;
  name?: string;
  rawJson?: any;
}

export interface LinkItem {
  url: string;
  text: string;
  isInternal: boolean;
  isNoFollow: boolean;
  targetDomain?: string;
}

export interface ImageItem {
  src: string;
  alt: string;
  hasAlt: boolean;
  isLazy: boolean;
  format: string;
}

export interface ArticleInventorySummary {
  totalArticles: number;
  inventoryLimit: number;
  inventoryCount: number;
  sampledLatestArticles: number;
  countSource: 'sitemap' | 'mixed' | 'crawl' | 'unknown' | 'legacy';
  countConfidence: 'high' | 'medium' | 'low';
  hasCompleteArticleCount: boolean;
  newestArticleDate?: string;
  oldestIndexedArticleDate?: string;
}

export interface ArticleCandidate {
  url: string;
  sourceSitemap?: string;
  sitemapType?: string;
  lastmod?: string;
  publishedDate?: string;
  confidence: number;
  classificationSource: string[];
}

export interface AnalysisScope {
  totalArticles: number;
  analyzedArticles: number;
  inventoryLimit: number;
  inventoryIsSampled: boolean;
  samplingStrategy: 'latest';
}

export interface CrawledPage {
  id: string;
  url: string;
  path: string;
  httpStatus: number;
  contentType: string;
  metadata: PageMetadata;
  headings: HeadingStructure;
  wordCount: number;
  paragraphCount: number;
  readingTimeMinutes: number;
  publishedDate?: string;
  lastModifiedDate?: string;
  author?: string;
  isArticle: boolean;
  articleConfidence: number; // 0 - 100
  articleSignals: string[];
  schemas: SchemaItem[];
  internalLinks: LinkItem[];
  externalLinks: LinkItem[];
  images: ImageItem[];
  bodyWordFrequency?: Record<string, number>;
  bodyTotalTokens?: number;
  isJsRenderedWarning?: boolean;
  aiReadyScore?: number; // 0 - 100 Structural AI Overview readiness proxy
  aiReadySignals?: string[];
  hasDirectAnswerParagraph?: boolean;
  hasListsOrTables?: boolean;
  hasFaqSchema?: boolean;
  authoritativeLinksCount?: number;
}

export interface KeywordItem {
  keyword: string;
  frequency: number;
  density: number;
  pagesCount: number;
  samplePages: string[];
  classification: 'Core' | 'Supporting' | 'Long-tail';
  intent: 'Informational' | 'Commercial' | 'Transactional' | 'Navigational';
  inTitle: boolean;
  inH1: boolean;
  inH2: boolean;
  inBody: boolean;
  inAnchor: boolean;
  inAlt: boolean;
}

export interface ContentCluster {
  id: string;
  name: string;
  articlesCount: number;
  totalWords: number;
  avgWords: number;
  subtopics: string[];
  articles: Array<{
    title: string;
    url: string;
    wordCount: number;
    publishedDate?: string;
  }>;
}

export interface PublishingFrequency {
  articlesPerMonth: number;
  articlesPerWeek: number;
  mostActiveMonth: string;
  quietestMonth: string;
  newestArticleDate?: string;
  oldestArticleDate?: string;
  monthlyBreakdown: Array<{
    month: string;
    count: number;
  }>;
}

export interface ScoreBreakdown {
  contentVolumeScore: number; // 0 - 100
  topicalCoverageScore: number; // 0 - 100
  publishingCadenceScore: number; // 0 - 100
  internalLinkEquityScore: number; // 0 - 100
  metadataQualityScore: number; // 0 - 100
  schemaCoverageScore: number; // 0 - 100
}

export interface CompetitorScore {
  overallScore: number; // 0 - 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'Needs Improvement';
  breakdown: ScoreBreakdown;
  summaryText: string;
}

export interface PerformanceSnapshot {
  mobileScore: number | null;
  desktopScore: number | null;
  lcp: number | null; // ms (Largest Contentful Paint)
  cls: number | null; // Cumulative Layout Shift
  inp: number | null; // ms (Interaction to Next Paint)
  fcp: number | null; // ms (First Contentful Paint)
  speedIndex: number | null;
  isMobileFriendly: boolean | null;
  isPartialData?: boolean;
  sampledUrls: string[];
  auditedAt: string;
}

export interface TrustSignals {
  articlesWithAuthorPct: number;
  hasAboutPage: boolean;
  hasContactPage: boolean;
  hasPrivacyPolicy: boolean;
  avgAuthoritativeOutboundLinksPerArticle: number;
  authoritativeDomainsFound: string[];
}

export interface ContentFreshness {
  updatedWithin12MonthsPct: number;
  articlesWithModifiedDateCount: number;
  avgDaysSinceLastModified?: number;
}

export interface GeoSearchCitation {
  keyword: string;
  isDomainCited: boolean;
  rankingSnippet?: string;
  sourcesFound: string[];
  aiSearchSummary?: string;
}

export interface ByokRankingKeyword {
  keyword: string;
  position: number;
  searchVolume: number;
  url: string;
  difficulty?: number;
  cpc?: number;
  serpFeatures?: string[];
}

export interface ByokBestPage {
  pageUrl: string;
  rankingKeywordsCount: number;
  bestPosition: number;
  estimatedTraffic: number;
  topKeyword: string;
}

export interface ByokCompetitorDomain {
  domain: string;
  keywordOverlap: number;
  estimatedTraffic: number;
}

export interface ByokData {
  provider: 'Kwinside';
  isValid: boolean;
  error?: string;
  creditsRemaining?: number;
  creditsUsed?: number;
  totalRankingKeywords: number;
  estimatedOrganicTraffic: number;
  reportedBacklinks?: number;
  topReferringDomains?: Array<{ domain: string; backlinksCount: number; firstSeen?: string }>;
  anchorTextDistribution?: Array<{ anchor: string; count: number }>;
  newVsLostBacklinks30d?: { new: number; lost: number };
  geoSearchCitations?: GeoSearchCitation[];
  rankingDistribution: {
    top1: number;
    top3: number;
    top10: number;
    top30: number;
    top50: number;
    top100: number;
  };
  keywords: ByokRankingKeyword[];
  bestPages: ByokBestPage[];
  competitors: ByokCompetitorDomain[];
}

export interface ActionableInsight {
  id: string;
  type: 'strength' | 'weakness' | 'opportunity' | 'warning';
  title: string;
  description: string;
  metric?: string;
}

export interface AnalysisReport {
  id: string;
  domain: string;
  originalUrl: string;
  createdAt: string;
  updatedAt: string;
  mode: AnalysisMode;
  status: AnalysisStatus;
  crawlDurationMs: number;
  
  // Overview
  overview: {
    domain: string;
    analyzedUrl: string;
    httpStatus: number;
    isHttps: boolean;
    totalUrlsDiscovered: number;
    totalUrlsCrawled: number;
    failedUrlsCount: number;
    hasSitemap: boolean;
    sitemapUrlsCount: number;
    hasRobotsTxt: boolean;
    isRobotsRestricted: boolean;
    robotsDisallowRules: string[];
    isJsRenderedWebsite: boolean;
  };

  // Content Statistics
  contentStats: {
    totalArticles: number;
    totalWords: number;
    avgWordsPerArticle: number;
    shortestArticle: { title: string; words: number; url: string };
    longestArticle: { title: string; words: number; url: string };
    avgParagraphs: number;
    avgHeadings: number;
    avgInternalLinksPerArticle: number;
  };

  // Lists and modules
  pages: CrawledPage[];
  keywords: KeywordItem[];
  clusters: ContentCluster[];
  publishingFrequency: PublishingFrequency;
  
  // Technical & SEO
  seoSnapshot: {
    titleCoveragePct: number;
    metaDescriptionCoveragePct: number;
    missingMetaDescriptionCount: number;
    duplicateTitleCount: number;
    h1CoveragePct: number;
    missingH1Count: number;
    multipleH1Count: number;
    schemaCoveragePct: number;
    detectedSchemaTypes: string[];
  };

  linkAnalysis: {
    totalInternalLinks: number;
    uniqueInternalUrls: number;
    avgInternalLinksPerArticle: number;
    topLinkedPages: Array<{ url: string; inlinksCount: number }>;
    leastLinkedPages: Array<{ url: string; inlinksCount: number }>;
    orphanPages: Array<{ url: string; path: string }>;
    totalExternalLinks: number;
    uniqueExternalDomains: number;
    topExternalDomains: Array<{ domain: string; count: number }>;
  };

  imageAnalysis: {
    totalImages: number;
    imagesWithAlt: number;
    imagesWithoutAlt: number;
    altCoveragePct: number;
    lazyLoadingPct: number;
    formatsBreakdown: Record<string, number>;
  };

  // Scoring and Insights
  competitorScore: CompetitorScore;
  insights: ActionableInsight[];

  // Article Inventory & Sampling Scope
  articleInventory: ArticleInventorySummary;
  articleCandidates?: ArticleCandidate[];
  analysisScope?: AnalysisScope;
  articleInventoryPages: CrawledPage[];

  // 2026 Core Web Vitals & E-E-A-T Signals
  performanceSnapshot?: PerformanceSnapshot;
  trustSignals?: TrustSignals;
  contentFreshness?: ContentFreshness;

  // BYOK Data if available
  byokData?: ByokData;
}

export interface ContentGapResult {
  targetDomain: string;
  competitorDomain: string;
  comparedAt: string;
  commonTopics: string[];
  competitorUniqueTopics: string[];
  targetUniqueTopics: string[];
  commonKeywords: string[];
  keywordGaps: Array<{
    keyword: string;
    competitorFrequency: number;
    intent: string;
    category: string;
  }>;
  totalOpportunitiesCount: number;
  insights: string[];
}
