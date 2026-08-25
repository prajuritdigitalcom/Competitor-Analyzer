import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Download,
  Copy,
  Check,
  Layers,
  FileText,
  Key,
  Globe,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Zap,
  BarChart3,
  Calendar,
  Code,
  Tag,
  Share2,
  Info,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { AnalysisReport } from '../types/index.ts';
import { exportArticlesToCSV, exportKeywordsToCSV, exportReportToJSON, generateMarkdownSummary, printBrandedReport } from '../lib/storage.ts';
import { ArticleInventoryTable } from './ArticleInventoryTable.tsx';
import { ByokAdvancedView } from './ByokAdvancedView.tsx';
import { ClustersView } from './ClustersView.tsx';
import { InsightsView } from './InsightsView.tsx';
import { KeywordsView } from './KeywordsView.tsx';
import { PublishingTimelineView } from './PublishingTimelineView.tsx';
import { SeoTechnicalView } from './SeoTechnicalView.tsx';

interface DashboardProps {
  report: AnalysisReport;
  onReAnalyze: (url: string, mode: 'free' | 'byok') => void;
  onOpenContentGap: () => void;
  onOpenByokModal: () => void;
  onNewAnalysis: () => void;
}

type TabType = 'overview' | 'articles' | 'keywords' | 'clusters' | 'timeline' | 'seo' | 'byok';

export const Dashboard: React.FC<DashboardProps> = ({
  report,
  onReAnalyze,
  onOpenContentGap,
  onOpenByokModal,
  onNewAnalysis,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [copied, setCopied] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  const { overview, contentStats, competitorScore, byokData } = report;

  const handleCopySummary = () => {
    const summary = generateMarkdownSummary(report);
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getGradeColor = (grade: string) => {
    if (grade === 'A+' || grade === 'A') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (grade === 'B') return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    if (grade === 'C') return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar Header */}
      <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/30 text-pink-400 flex items-center justify-center shrink-0">
            <Globe className="w-6 h-6" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight truncate">
                {report.domain}
              </h1>
              <span className="text-xs font-mono uppercase bg-slate-800 text-pink-400 px-2.5 py-0.5 rounded-full border border-slate-700 font-bold">
                {report.mode} MODE
              </span>
              {byokData?.isValid && (
                <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Kwinside API Connected</span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="font-mono text-slate-500 truncate max-w-xs sm:max-w-md">
                {report.originalUrl}
              </span>
              <span>•</span>
              <span>
                {new Date(report.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span>•</span>
              <span className="text-slate-500">
                Crawled in {(report.crawlDurationMs / 1000).toFixed(1)}s
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Re-Analyze */}
          <button
            onClick={() => onReAnalyze(report.originalUrl, report.mode)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            title="Crawl ulang website"
          >
            <RefreshCw className="w-3.5 h-3.5 text-pink-400" />
            <span>Re-analyze</span>
          </button>

          {/* Copy Summary */}
          <button
            onClick={handleCopySummary}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Tersalin!' : 'Copy Summary'}</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-pink-400" />
              <span>Export</span>
            </button>

            {downloadMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-30 animate-in fade-in">
                <button
                  onClick={() => {
                    printBrandedReport(report);
                    setDownloadMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-pink-300 hover:bg-slate-800 flex items-center gap-2 font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-pink-400" />
                  <span>Cetak / PDF Branded</span>
                </button>
                <div className="border-t border-slate-800 my-1"></div>
                <button
                  onClick={() => {
                    exportArticlesToCSV(report);
                    setDownloadMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-pink-400" />
                  <span>Articles CSV</span>
                </button>
                <button
                  onClick={() => {
                    exportKeywordsToCSV(report);
                    setDownloadMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Keywords CSV</span>
                </button>
                <button
                  onClick={() => {
                    exportReportToJSON(report);
                    setDownloadMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Code className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Full Report JSON</span>
                </button>
              </div>
            )}
          </div>

          {/* Content Gap Comparison Button */}
          <button
            onClick={onOpenContentGap}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white text-xs font-bold shadow-md shadow-pink-600/30 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Content Gap</span>
          </button>
        </div>
      </div>

      {/* Sample Ratio Transparency Banner */}
      {overview.totalUrlsDiscovered > overview.totalUrlsCrawled && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-xs text-amber-200 shadow-lg">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-300 text-sm">
              Sampling Crawl Transparan:
            </span>
            <p className="leading-relaxed">
              Analisis ini berdasarkan sample <strong className="text-white font-mono">{overview.totalUrlsCrawled} halaman</strong> dari total <strong className="text-white font-mono">{overview.totalUrlsDiscovered}+ halaman</strong> yang ditemukan di sitemap dan struktur internal website.
              {overview.totalUrlsCrawled / overview.totalUrlsDiscovered < 0.4 && ' Untuk situs berskala besar, metrik ini mencerminkan sampel halaman paling penting dan terindeks.'}
            </p>
          </div>
        </div>
      )}

      {/* JS Rendering Warning Banner in Overview */}
      {overview.isJsRenderedWebsite && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-xs text-rose-200 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-rose-300 text-sm">
              Peringatan Client-Side Rendering (SPA Detected):
            </span>
            <p className="leading-relaxed">
              Website ini terdeteksi menggunakan client-side JavaScript framework (React/Vue/Angular). Sebagian konten dinamis kemungkinan tidak terbaca penuh oleh crawler HTML statis tanpa JS pre-rendering.
            </p>
          </div>
        </div>
      )}

      {/* Competitor Intelligence Score Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Score & Grade */}
          <div className="flex items-center gap-5">
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-pink-500/10 border-2 border-pink-500/30 flex flex-col items-center justify-center text-center shadow-lg shadow-pink-500/10">
                <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono leading-none">
                  {competitorScore.overallScore}
                </span>
                <span className="text-[10px] text-pink-400 font-mono font-bold mt-1">
                  / 100 PTS
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase font-mono font-bold text-pink-400 tracking-wider">
                  Prajurit Content Intelligence Score
                </span>
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md border font-mono ${getGradeColor(competitorScore.grade)}`}>
                  GRADE {competitorScore.grade}
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                {competitorScore.summaryText}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 italic">
                * Skor ini dihitung transparan oleh Prajurit Digital berdasarkan parameter konten publik & bukan merupakan skor ranking resmi Google.
              </p>
            </div>
          </div>

          {/* Breakdown Bars */}
          <div className="w-full lg:w-72 space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 shrink-0">
            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">
              Parameter Breakdown:
            </div>
            {[
              { label: 'Content Volume', val: competitorScore.breakdown.contentVolumeScore },
              { label: 'Topical Coverage', val: competitorScore.breakdown.topicalCoverageScore },
              { label: 'Publishing Cadence', val: competitorScore.breakdown.publishingCadenceScore },
              { label: 'Internal Link Equity', val: competitorScore.breakdown.internalLinkEquityScore },
              { label: 'Metadata & On-Page', val: competitorScore.breakdown.metadataQualityScore },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] gap-2">
                <span className="text-slate-400 truncate">{item.label}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-pink-500 h-full rounded-full"
                      style={{ width: `${item.val}%` }}
                    ></div>
                  </div>
                  <span className="font-mono text-slate-200 font-bold w-6 text-right">
                    {item.val}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Discovered / Crawled</span>
            <span className="text-[9px] font-mono text-slate-500">CRAWLED</span>
          </div>
          <p className="text-xl font-extrabold text-white font-mono">
            {overview.totalUrlsCrawled}
            <span className="text-xs text-slate-500 font-normal"> / {overview.totalUrlsDiscovered}</span>
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Artikel Terdeteksi</span>
            <span className="text-[9px] font-mono text-pink-400 font-bold uppercase">
              {report.articleInventory?.countSource || 'SITEMAP'}
            </span>
          </div>
          <p className="text-xl font-extrabold text-pink-400 font-mono">
            {contentStats.totalArticles}
          </p>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            {report.articleInventory?.inventoryCount ?? 30} terbaru dianalisis
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Estimasi Kata</span>
            <span className="text-[9px] font-mono text-slate-500">CALCULATED</span>
          </div>
          <p className="text-xl font-extrabold text-white font-mono">
            {contentStats.totalWords.toLocaleString()}
          </p>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            Sampel {report.articleInventory?.inventoryCount ?? 30} artikel
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Rata-rata Kata/Hal</span>
            <span className="text-[9px] font-mono text-slate-500">CALCULATED</span>
          </div>
          <p className="text-xl font-extrabold text-indigo-300 font-mono">
            {contentStats.avgWordsPerArticle}
          </p>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            Per artikel dianalisis
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Topik Klaster</span>
            <span className="text-[9px] font-mono text-slate-500">PRAJURIT</span>
          </div>
          <p className="text-xl font-extrabold text-white font-mono">
            {report.clusters.length}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Schema Coverage</span>
            <span className="text-[9px] font-mono text-slate-500">CRAWLED</span>
          </div>
          <p className="text-xl font-extrabold text-emerald-400 font-mono">
            {report.seoSnapshot.schemaCoveragePct}%
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-800 flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Overview & Insights', icon: Sparkles, badge: report.insights.length },
          { id: 'articles', label: 'Article Inventory', icon: FileText, badge: report.articleInventory?.inventoryCount ?? report.articleInventoryPages?.length ?? Math.min(30, report.pages.filter(p => p.isArticle).length) },
          { id: 'keywords', label: 'Extracted Keywords', icon: Tag, badge: report.keywords.length },
          { id: 'clusters', label: 'Content Clusters', icon: Layers, badge: report.clusters.length },
          { id: 'timeline', label: 'Publishing Cadence', icon: Calendar },
          { id: 'seo', label: 'SEO & Technical', icon: Code },
          { id: 'byok', label: 'Advanced SEO (BYOK)', icon: Key, isByok: true },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.isByok ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Panels */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in">
          <InsightsView insights={report.insights} />
          
          {/* Quick Snapshot Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-pink-400" />
                <span>Ringkasan Konten Terpanjang vs Terpendek</span>
              </h4>

              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-pink-400 uppercase font-mono font-bold">Artikel Terpanjang:</span>
                <p className="text-xs font-semibold text-white truncate">{contentStats.longestArticle.title}</p>
                <p className="text-xs font-mono text-pink-300 font-bold">{contentStats.longestArticle.words.toLocaleString()} kata</p>
              </div>

              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Artikel Terpendek:</span>
                <p className="text-xs font-semibold text-white truncate">{contentStats.shortestArticle.title}</p>
                <p className="text-xs font-mono text-slate-300 font-bold">{contentStats.shortestArticle.words.toLocaleString()} kata</p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Klaster Topik Utama</span>
              </h4>

              <div className="space-y-2">
                {report.clusters.slice(0, 3).map((c, i) => (
                  <div key={i} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-white">{c.name}</p>
                      <span className="text-[11px] text-slate-500">{c.articlesCount} artikel • avg {c.avgWords} kata</span>
                    </div>
                    <span className="font-mono text-pink-400 font-bold bg-pink-500/10 px-2 py-0.5 rounded">
                      {c.totalWords.toLocaleString()} kata
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'articles' && (
        <ArticleInventoryTable
          pages={report.articleInventoryPages && report.articleInventoryPages.length > 0 ? report.articleInventoryPages : report.pages.filter(p => p.isArticle)}
          totalArticles={report.contentStats.totalArticles}
          articleInventory={report.articleInventory}
          onExportCSV={() => exportArticlesToCSV(report)}
        />
      )}

      {activeTab === 'keywords' && (
        <KeywordsView
          keywords={report.keywords}
          onExportCSV={() => exportKeywordsToCSV(report)}
        />
      )}

      {activeTab === 'clusters' && (
        <ClustersView clusters={report.clusters} />
      )}

      {activeTab === 'timeline' && (
        <PublishingTimelineView frequency={report.publishingFrequency} />
      )}

      {activeTab === 'seo' && (
        <SeoTechnicalView report={report} />
      )}

      {activeTab === 'byok' && (
        <ByokAdvancedView
          byokData={report.byokData}
          onOpenByokModal={onOpenByokModal}
        />
      )}

      {/* Disclaimer Notice */}
      <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed space-y-1">
        <p className="font-semibold text-slate-300">Data Disclaimer & Sumber Data Transparan:</p>
        <p>
          Data yang diperoleh melalui perayapan situs merepresentasikan informasi yang dapat diakses secara publik pada website yang dianalisis. Metrik SEO eksternal merupakan estimasi atau data dari provider pihak ketiga (Kwinside API) dan bukan merupakan akses data pribadi Google Analytics milik kompetitor.
        </p>
      </div>
    </div>
  );
};
