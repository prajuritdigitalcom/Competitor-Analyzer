import React, { useState } from 'react';
import {
  Code,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Link2,
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  EyeOff,
  Gauge,
  Smartphone,
  Monitor,
  Award,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';
import { AnalysisReport } from '../types/index.ts';

interface SeoTechnicalViewProps {
  report: AnalysisReport;
}

export const SeoTechnicalView: React.FC<SeoTechnicalViewProps> = ({ report }) => {
  const [activeSubTab, setActiveSubTab] = useState<'onpage' | 'cwv' | 'eeat' | 'schema' | 'links' | 'images' | 'technical'>('onpage');

  const { seoSnapshot, linkAnalysis, imageAnalysis, overview, performanceSnapshot, trustSignals, contentFreshness } = report;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white">Struktur SEO & Teknis 2026</h3>
            <span className="text-xs bg-slate-800 text-pink-400 font-mono font-bold px-2 py-0.5 rounded-full border border-slate-700">
              CWV • E-E-A-T • Schema
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit Core Web Vitals Google, sinyal kepercayaan E-E-A-T, metadata, schema, dan internal links.
          </p>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('onpage')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeSubTab === 'onpage' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            On-Page SEO
          </button>
          <button
            onClick={() => setActiveSubTab('cwv')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'cwv' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            Core Web Vitals
          </button>
          <button
            onClick={() => setActiveSubTab('eeat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === 'eeat' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            E-E-A-T & Freshness
          </button>
          <button
            onClick={() => setActiveSubTab('schema')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeSubTab === 'schema' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Schema ({seoSnapshot.schemaCoveragePct}%)
          </button>
          <button
            onClick={() => setActiveSubTab('links')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeSubTab === 'links' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Links
          </button>
          <button
            onClick={() => setActiveSubTab('images')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeSubTab === 'images' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Images ({imageAnalysis.altCoveragePct}%)
          </button>
          <button
            onClick={() => setActiveSubTab('technical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeSubTab === 'technical' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Technical
          </button>
        </div>
      </div>

      {/* 1. On-Page SEO Tab */}
      {activeSubTab === 'onpage' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Cakupan Title Tag</span>
              <p className="text-2xl font-extrabold text-white font-mono mt-1">
                {seoSnapshot.titleCoveragePct}%
              </p>
              <span className="text-[11px] text-slate-500">
                {seoSnapshot.duplicateTitleCount} judul duplikat
              </span>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Cakupan Meta Description</span>
              <p className="text-2xl font-extrabold text-white font-mono mt-1">
                {seoSnapshot.metaDescriptionCoveragePct}%
              </p>
              <span className="text-[11px] text-slate-500">
                {seoSnapshot.missingMetaDescriptionCount} URL tanpa deskripsi
              </span>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Struktur H1 Unik</span>
              <p className="text-2xl font-extrabold text-white font-mono mt-1">
                {seoSnapshot.h1CoveragePct}%
              </p>
              <span className="text-[11px] text-slate-500">
                {seoSnapshot.multipleH1Count} multiple H1 • {seoSnapshot.missingH1Count} missing H1
              </span>
            </div>
          </div>

          {/* Issue Warnings */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Diagnostik On-Page:
            </h4>
            {seoSnapshot.missingMetaDescriptionCount > 0 ? (
              <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl flex items-center gap-2.5 text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Celah Optimasi:</strong> Terdapat {seoSnapshot.missingMetaDescriptionCount} halaman yang tidak memiliki meta description unik.
                </span>
              </div>
            ) : (
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>100% halaman kompetitor memiliki tag meta description yang lengkap.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Core Web Vitals Tab (Google PSI) */}
      {activeSubTab === 'cwv' && (
        <div className="space-y-6 animate-in fade-in">
          {performanceSnapshot ? (
            <>
              {performanceSnapshot.isPartialData && (
                <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Sebagian metrik Core Web Vitals tidak dilaporkan oleh Google PSI untuk domain ini (biasa terjadi pada situs dengan data traffic field terbatas). Metrik yang tidak tersedia ditampilkan sebagai "—".
                  </span>
                </div>
              )}

              {/* Scores Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Smartphone className="w-3.5 h-3.5 text-pink-400" />
                      <span>Mobile Performance</span>
                    </div>
                    <p className={`text-2xl font-extrabold font-mono mt-1 ${performanceSnapshot.mobileScore === null ? 'text-slate-500' : performanceSnapshot.mobileScore >= 85 ? 'text-emerald-400' : performanceSnapshot.mobileScore >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {performanceSnapshot.mobileScore !== null ? `${performanceSnapshot.mobileScore}/100` : '—'}
                    </p>
                  </div>
                  {performanceSnapshot.mobileScore !== null ? (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${performanceSnapshot.mobileScore >= 85 ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : performanceSnapshot.mobileScore >= 50 ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'}`}>
                      {performanceSnapshot.mobileScore >= 85 ? 'Cepat' : performanceSnapshot.mobileScore >= 50 ? 'Sedang' : 'Perlu Optimasi'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 px-2 py-1 bg-slate-900 rounded-lg">N/A</span>
                  )}
                </div>

                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Desktop Performance</span>
                    </div>
                    <p className={`text-2xl font-extrabold font-mono mt-1 ${performanceSnapshot.desktopScore === null ? 'text-slate-500' : performanceSnapshot.desktopScore >= 85 ? 'text-emerald-400' : performanceSnapshot.desktopScore >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {performanceSnapshot.desktopScore !== null ? `${performanceSnapshot.desktopScore}/100` : '—'}
                    </p>
                  </div>
                  {performanceSnapshot.desktopScore !== null ? (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${performanceSnapshot.desktopScore >= 85 ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'}`}>
                      {performanceSnapshot.desktopScore >= 85 ? 'Optimal' : 'Standard'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 px-2 py-1 bg-slate-900 rounded-lg">N/A</span>
                  )}
                </div>

                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400">LCP (Largest Contentful)</span>
                  <p className={`text-2xl font-extrabold font-mono mt-1 ${performanceSnapshot.lcp === null ? 'text-slate-500' : performanceSnapshot.lcp <= 2500 ? 'text-emerald-400' : performanceSnapshot.lcp <= 4000 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {performanceSnapshot.lcp !== null ? `${(performanceSnapshot.lcp / 1000).toFixed(2)}s` : '—'}
                  </p>
                  <span className="text-[11px] text-slate-500">
                    Target Google: &lt; 2.5s
                  </span>
                </div>

                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400">CLS (Layout Shift)</span>
                  <p className={`text-2xl font-extrabold font-mono mt-1 ${performanceSnapshot.cls === null ? 'text-slate-500' : performanceSnapshot.cls <= 0.1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {performanceSnapshot.cls !== null ? performanceSnapshot.cls : '—'}
                  </p>
                  <span className="text-[11px] text-slate-500">
                    Target Google: &lt; 0.10
                  </span>
                </div>
              </div>

              {/* Detail Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-300">INP / Max Potential FID</span>
                  <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                    {performanceSnapshot.inp !== null ? `${performanceSnapshot.inp} ms` : '—'}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-300">FCP (First Contentful Paint)</span>
                  <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                    {performanceSnapshot.fcp !== null ? `${(performanceSnapshot.fcp / 1000).toFixed(2)} s` : '—'}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Mobile-Friendliness</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${performanceSnapshot.isMobileFriendly === true ? 'text-emerald-400 bg-emerald-500/10' : performanceSnapshot.isMobileFriendly === false ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 bg-slate-900'}`}>
                    {performanceSnapshot.isMobileFriendly === true ? '✓ Mobile Friendly' : performanceSnapshot.isMobileFriendly === false ? 'Perlu Optimasi Viewport' : '—'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-xl text-xs text-slate-400 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-pink-400 shrink-0" />
                  <span>
                    Audit PageSpeed diuji pada: <strong className="text-slate-200">{performanceSnapshot.sampledUrls[0]}</strong> ({performanceSnapshot.sampledUrls.length} sampel halaman)
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {new Date(performanceSnapshot.auditedAt).toLocaleTimeString('id-ID')}
                </span>
              </div>
            </>
          ) : (
            <div className="p-6 bg-slate-950/40 border border-slate-800 rounded-xl text-center space-y-2">
              <Gauge className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-300 font-semibold">Data Core Web Vitals tidak tersedia</p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Layanan Google PageSpeed Insights sedang sibuk atau URL target memerlukan waktu respon lebih lama.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3. E-E-A-T & Freshness Tab */}
      {activeSubTab === 'eeat' && (
        <div className="space-y-6 animate-in fade-in">
          {/* E-E-A-T Metrics */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              Sinyal Kepercayaan & Kredibilitas (E-E-A-T):
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400">Transparansi Penulis (Author)</span>
                <p className="text-2xl font-extrabold text-white font-mono mt-1">
                  {trustSignals?.articlesWithAuthorPct ?? 0}%
                </p>
                <span className="text-[11px] text-slate-500">
                  Artikel memiliki byline / Schema Author
                </span>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Halaman Tentang Kami</span>
                  <p className="text-sm font-bold text-white mt-1">
                    {trustSignals?.hasAboutPage ? '✓ Terverifikasi' : '✗ Tidak Terdeteksi'}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${trustSignals?.hasAboutPage ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {trustSignals?.hasAboutPage ? 'Valid' : 'Missing'}
                </span>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Halaman Kontak Resmi</span>
                  <p className="text-sm font-bold text-white mt-1">
                    {trustSignals?.hasContactPage ? '✓ Terverifikasi' : '✗ Tidak Terdeteksi'}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${trustSignals?.hasContactPage ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {trustSignals?.hasContactPage ? 'Valid' : 'Missing'}
                </span>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400">Rujukan Domain Kredibel</span>
                <p className="text-2xl font-extrabold text-white font-mono mt-1">
                  {trustSignals?.avgAuthoritativeOutboundLinksPerArticle ?? 0}
                </p>
                <span className="text-[11px] text-slate-500">
                  Outbound links/artikel (.gov, .edu, jurnal, wiki)
                </span>
              </div>
            </div>

            {trustSignals?.authoritativeDomainsFound && trustSignals.authoritativeDomainsFound.length > 0 && (
              <div className="mt-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1.5 font-semibold">
                  Domain Otoritas Tinggi yang Dirujuk Kompetitor:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {trustSignals.authoritativeDomainsFound.map((dom, i) => (
                    <span key={i} className="text-xs bg-indigo-950/50 text-indigo-300 border border-indigo-800/60 px-2.5 py-0.5 rounded-md font-mono">
                      {dom}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Freshness Audit */}
          <div className="border-t border-slate-800 pt-5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-pink-400" />
              Audit Kesegaran Konten (Content Freshness):
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Pembaruan 12 Bulan Terakhir</span>
                  <p className="text-2xl font-extrabold text-white font-mono mt-1">
                    {contentFreshness?.updatedWithin12MonthsPct ?? 0}%
                  </p>
                  <span className="text-[11px] text-slate-500">
                    Artikel aktif diperbarui / dipublikasikan
                  </span>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${(contentFreshness?.updatedWithin12MonthsPct ?? 0) >= 50 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}>
                  {(contentFreshness?.updatedWithin12MonthsPct ?? 0) >= 50 ? 'Fresh Cadence' : 'Celah Refresh'}
                </span>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400">Schema dateModified Tracking</span>
                <p className="text-2xl font-extrabold text-white font-mono mt-1">
                  {contentFreshness?.articlesWithModifiedDateCount ?? 0}
                </p>
                <span className="text-[11px] text-slate-500">
                  Halaman dengan metadata riwayat update eksplisit
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Schema JSON-LD Tab */}
      {activeSubTab === 'schema' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400">Cakupan Schema Structured Data</span>
              <h4 className="text-xl font-extrabold text-white mt-0.5">
                {seoSnapshot.schemaCoveragePct}% Coverage
              </h4>
            </div>
            <div className="text-right">
              <span className="text-xs text-pink-400 font-mono font-bold bg-pink-500/10 px-2.5 py-1 rounded-lg border border-pink-500/20">
                {seoSnapshot.detectedSchemaTypes.length} Tipe Terdeteksi
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Tipe Schema.org yang Digunakan:
            </h4>
            {seoSnapshot.detectedSchemaTypes.length === 0 ? (
              <p className="text-xs text-slate-500">Tidak ada schema JSON-LD atau Microdata terdeteksi.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {seoSnapshot.detectedSchemaTypes.map((type, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-200 truncate">{type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Link Intelligence Tab */}
      {activeSubTab === 'links' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Total Internal Links</span>
              <p className="text-xl font-bold text-white font-mono mt-1">
                {linkAnalysis.totalInternalLinks.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Rata-rata Link/Artikel</span>
              <p className="text-xl font-bold text-white font-mono mt-1">
                {linkAnalysis.avgInternalLinksPerArticle}
              </p>
            </div>
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Outbound Links</span>
              <p className="text-xl font-bold text-white font-mono mt-1">
                {linkAnalysis.totalExternalLinks}
              </p>
            </div>
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Domain Eksternal</span>
              <p className="text-xl font-bold text-white font-mono mt-1">
                {linkAnalysis.uniqueExternalDomains}
              </p>
            </div>
          </div>

          {/* Orphan Pages Warning */}
          {linkAnalysis.orphanPages.length > 0 && (
            <div className="p-4 bg-amber-950/30 border border-amber-800/60 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                <EyeOff className="w-4 h-4" />
                <span>Terdeteksi {linkAnalysis.orphanPages.length} Orphan Pages (Halaman Tanpa Internal Inlinks)</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Halaman-halaman ini sulit ditemukan oleh Google karena tidak memiliki tautan masuk dari artikel lain:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {linkAnalysis.orphanPages.slice(0, 6).map((orph, i) => (
                  <span key={i} className="text-[10px] font-mono bg-slate-900 text-amber-200/90 px-2 py-0.5 rounded border border-amber-800/40 truncate max-w-xs">
                    {orph.path}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Top Linked Hubs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Halaman Paling Banyak Di-link (Top Hubs)
              </h4>
              <div className="space-y-2">
                {linkAnalysis.topLinkedPages.slice(0, 5).map((page, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/50">
                    <span className="text-slate-300 truncate max-w-[200px] font-mono text-[11px]">
                      {page.url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                    </span>
                    <span className="font-mono text-pink-400 font-bold bg-pink-500/10 px-2 py-0.5 rounded">
                      {page.inlinksCount} inlinks
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Domain Eksternal Paling Sering Di-link
              </h4>
              <div className="space-y-2">
                {linkAnalysis.topExternalDomains.length === 0 ? (
                  <p className="text-xs text-slate-500">Tidak ada outbound external link.</p>
                ) : (
                  linkAnalysis.topExternalDomains.slice(0, 5).map((ext, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/50">
                      <span className="text-slate-300 truncate font-mono text-[11px]">{ext.domain}</span>
                      <span className="font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded">
                        {ext.count} links
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Image Analyzer Tab */}
      {activeSubTab === 'images' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Total Gambar Terdeteksi</span>
              <p className="text-2xl font-extrabold text-white font-mono mt-1">
                {imageAnalysis.totalImages}
              </p>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Cakupan ALT Text</span>
              <p className="text-2xl font-extrabold text-white font-mono mt-1">
                {imageAnalysis.altCoveragePct}%
              </p>
              <span className="text-[11px] text-slate-500">
                {imageAnalysis.imagesWithoutAlt} gambar tanpa ALT
              </span>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Lazy Loading Adoption</span>
              <p className="text-2xl font-extrabold text-white font-mono mt-1">
                {imageAnalysis.lazyLoadingPct}%
              </p>
            </div>
          </div>

          {/* Formats breakdown */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Distribusi Format Gambar:
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(imageAnalysis.formatsBreakdown).map(([fmt, count], i) => (
                <div key={i} className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
                  <span className="text-slate-400 uppercase">{fmt}: </span>
                  <strong className="text-white">{count}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Technical Snapshot Tab */}
      {activeSubTab === 'technical' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-300">Protokol HTTPS</span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                {overview.isHttps ? '✓ Secured HTTPS' : '✗ HTTP Insecure'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-300">Robots.txt Policy</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${overview.hasRobotsTxt ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                {overview.hasRobotsTxt ? (overview.isRobotsRestricted ? 'Restricted' : '✓ Standard Allowed') : 'Tidak Ditemukan'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-300">Sitemap XML Discovery</span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                {overview.hasSitemap ? `✓ Ditemukan (${overview.sitemapUrlsCount} URLs)` : '✗ Tidak Terdeteksi'}
              </span>
            </div>

            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-300">JavaScript Rendering Status</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${overview.isJsRenderedWebsite ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                {overview.isJsRenderedWebsite ? '⚠ JS Client-Rendered' : '✓ Static / SSR HTML'}
              </span>
            </div>
          </div>

          {overview.isJsRenderedWebsite && (
            <div className="p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-200/90 leading-relaxed flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Catatan JS-Rendered:</strong> Website ini tampaknya merender konten utama via JavaScript client-side (SPA). Sebagian body text mungkin diisi dinamis oleh browser engine.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
