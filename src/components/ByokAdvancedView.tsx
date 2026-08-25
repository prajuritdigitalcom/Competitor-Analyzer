import React from 'react';
import { Key, Globe, TrendingUp, AlertCircle, ArrowUpRight, ShieldCheck, Sparkles, Link2, Search, ExternalLink } from 'lucide-react';
import { ByokData } from '../types/index.ts';

interface ByokAdvancedViewProps {
  byokData?: ByokData;
  onOpenByokModal: () => void;
}

export const ByokAdvancedView: React.FC<ByokAdvancedViewProps> = ({
  byokData,
  onOpenByokModal,
}) => {
  if (!byokData || !byokData.isValid) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-xl text-center space-y-4">
        <div className={`w-14 h-14 rounded-2xl ${byokData?.error ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'} border flex items-center justify-center mx-auto`}>
          {byokData?.error ? <AlertCircle className="w-7 h-7" /> : <Key className="w-7 h-7" />}
        </div>

        <div className="max-w-md mx-auto space-y-2">
          {byokData?.error ? (
            <>
              <h3 className="text-lg font-bold text-white">Gagal Mengambil Data Kwinside API</h3>
              <p className="text-xs text-rose-300 bg-rose-950/40 p-3 rounded-xl border border-rose-800/60 leading-relaxed font-mono">
                {byokData.error}
              </p>
              <p className="text-[11px] text-slate-400">
                Pastikan API Key Kwinside aktif dan domain yang dianalisis memiliki data SERP terindeks di search engine yang didukung.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-white mb-1">Buka SEO Intelligence Tingkat Lanjut (BYOK)</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Gunakan API Key Kwinside milik Anda sendiri untuk membuka estimasi traffic organik nyata, peringkat SERP, search volume, dan perbandingan domain kompetitor.
              </p>
            </>
          )}

          <div className="pt-3">
            <button
              onClick={onOpenByokModal}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-400 hover:to-pink-400 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-pink-500/20 cursor-pointer"
            >
              {byokData?.error ? 'Ubah / Periksa API Key Kwinside' : 'Aktifkan Kwinside API (BYOK)'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const {
    rankingDistribution,
    keywords,
    bestPages,
    competitors,
    totalRankingKeywords,
    estimatedOrganicTraffic,
    reportedBacklinks,
    topReferringDomains,
    anchorTextDistribution,
    newVsLostBacklinks30d,
    geoSearchCitations,
    creditsRemaining
  } = byokData;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white">Advanced SEO Intelligence 2026</h3>
            <span className="text-xs bg-amber-500/10 text-amber-300 font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span>Kwinside Provider (BYOK)</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Peringkat SERP, search volume, profil backlink mendalam, dan visibilitas AI Search (GEO).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {creditsRemaining !== undefined && (
            <span className="text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 px-2.5 py-1 rounded-lg font-mono">
              Sisa Kuota: {creditsRemaining} kredit
            </span>
          )}
          <span className="text-[10px] bg-slate-950 text-slate-400 border border-slate-800 px-2.5 py-1 rounded-lg">
            EXTERNAL API DATA
          </span>
          <button
            onClick={onOpenByokModal}
            className="text-xs text-pink-400 hover:text-pink-300 underline font-medium"
          >
            Kelola Kunci
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400">Total Ranking Keywords</span>
          <p className="text-2xl font-extrabold text-white font-mono mt-1">
            {totalRankingKeywords.toLocaleString()}
          </p>
          <span className="text-[11px] text-emerald-400">Keyword terindeks di SERP</span>
        </div>

        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400">Estimated Organic Traffic</span>
          <p className="text-2xl font-extrabold text-pink-400 font-mono mt-1">
            ~{estimatedOrganicTraffic.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-500">Estimasi kunjungan organik / bln</span>
        </div>

        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400">Reported Backlinks</span>
          <p className="text-2xl font-extrabold text-indigo-300 font-mono mt-1">
            {reportedBacklinks ? reportedBacklinks.toLocaleString() : 'N/A'}
          </p>
          <span className="text-[10px] text-slate-500">Tautan balik eksternal terindeks</span>
        </div>
      </div>

      {/* 2026 Live GEO Check / AI Search Grounding Citations */}
      {geoSearchCitations && geoSearchCitations.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-purple-950/40 via-slate-900 to-pink-950/30 border border-purple-800/40 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-800/30 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <h4 className="text-xs font-bold text-pink-300 uppercase tracking-wider">
                Visibilitas AI Search & GEO (Gemini Search Grounding)
              </h4>
            </div>
            <span className="text-[10px] bg-slate-950 text-slate-400 border border-slate-800 px-2 py-0.5 rounded">
              Estimasi berbasis Gemini Grounded Search
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {geoSearchCitations.map((geo, idx) => (
              <div key={idx} className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-white line-clamp-1">
                    "{geo.keyword}"
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${geo.isDomainCited ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                    {geo.isDomainCited ? '✓ Domain Dirujuk AI' : 'Belum Dikutip'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {geo.rankingSnippet}
                </p>
                {geo.sourcesFound.length > 0 && (
                  <div className="pt-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-400">
                    <span className="text-slate-500">Sumber:</span>
                    {geo.sourcesFound.slice(0, 2).map((s, si) => (
                      <span key={si} className="truncate max-w-[140px] font-mono text-purple-300 bg-purple-950/50 px-1.5 py-0.2 rounded border border-purple-800/40">
                        {s.replace(/^https?:\/\//, '').split('/')[0]}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranking Funnel Distribution */}
      <div>
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          Distribusi Posisi Ranking (Funnel SERP):
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-center">
            <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">TOP 1</span>
            <p className="text-lg font-extrabold text-white font-mono">{rankingDistribution.top1}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-center">
            <span className="text-[10px] font-mono text-emerald-300 uppercase font-bold">TOP 3</span>
            <p className="text-lg font-extrabold text-white font-mono">{rankingDistribution.top3}</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-center">
            <span className="text-[10px] font-mono text-indigo-300 uppercase font-bold">TOP 10</span>
            <p className="text-lg font-extrabold text-white font-mono">{rankingDistribution.top10}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">TOP 30</span>
            <p className="text-lg font-extrabold text-white font-mono">{rankingDistribution.top30}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">TOP 50</span>
            <p className="text-lg font-extrabold text-white font-mono">{rankingDistribution.top50}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">TOP 100</span>
            <p className="text-lg font-extrabold text-white font-mono">{rankingDistribution.top100}</p>
          </div>
        </div>
      </div>

      {/* Keywords Ranking Table with SERP Features */}
      <div>
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          Keyword Ranking & SERP Features:
        </h4>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Target Keyword</th>
                <th className="p-3 text-center">Posisi SERP</th>
                <th className="p-3 text-center">SERP Features</th>
                <th className="p-3 text-center">Search Volume</th>
                <th className="p-3 text-center">Difficulty</th>
                <th className="p-3">Ranking URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {keywords.map((k, i) => (
                <tr key={i} className="hover:bg-slate-850 transition">
                  <td className="p-3 font-semibold text-white">{k.keyword}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                        k.position <= 3
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : k.position <= 10
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      #{k.position}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      {(k.serpFeatures || ['Organic']).map((sf, sfi) => (
                        <span key={sfi} className="text-[10px] bg-slate-800 text-amber-300 px-1.5 py-0.2 rounded border border-slate-700 font-mono">
                          {sf}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-slate-200">
                    {k.searchVolume.toLocaleString()}/bln
                  </td>
                  <td className="p-3 text-center font-mono text-slate-400">
                    {k.difficulty || '-'}
                  </td>
                  <td className="p-3 font-mono text-[11px] text-slate-400 truncate max-w-xs">
                    {k.url}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Backlink Intelligence Depth */}
      <div className="border-t border-slate-800 pt-5">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Link2 className="w-4 h-4 text-indigo-400" />
          Kedalaman Analisis Backlink (Referring Domains & Anchors):
        </h4>

        {(!topReferringDomains || topReferringDomains.length === 0) && (!anchorTextDistribution || anchorTextDistribution.length === 0) && !newVsLostBacklinks30d ? (
          <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/80 text-center py-6">
            <Link2 className="w-6 h-6 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">Data rincian backlink tidak tersedia dari provider untuk domain ini.</p>
            <p className="text-[11px] text-slate-500 mt-1">Provider Kwinside belum memiliki indeks rujukan backlink spesifik untuk target domain yang dipilih.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Top Referring Domains */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">
                Top Referring Domains
              </span>
              <div className="space-y-1.5">
                {topReferringDomains && topReferringDomains.length > 0 ? (
                  topReferringDomains.map((rd, rdi) => (
                    <div key={rdi} className="p-2 bg-slate-900 rounded-lg flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-200">{rd.domain}</span>
                      <span className="text-[11px] font-mono text-indigo-400 font-bold">{rd.backlinksCount} links</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-500 py-2 text-center">Tidak ada data referring domains.</p>
                )}
              </div>
            </div>

            {/* Anchor Text Distribution */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">
                Distribusi Anchor Text
              </span>
              <div className="space-y-1.5">
                {anchorTextDistribution && anchorTextDistribution.length > 0 ? (
                  anchorTextDistribution.map((anc, ai) => (
                    <div key={ai} className="p-2 bg-slate-900 rounded-lg flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-300 truncate max-w-[150px]">"{anc.anchor}"</span>
                      <span className="text-[11px] font-mono text-slate-400">{anc.count} refs</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-500 py-2 text-center">Tidak ada data anchor text.</p>
                )}
              </div>
            </div>

            {/* Backlink Velocity 30d */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-300 block">
                Dinamika Tautan 30 Hari Terakhir
              </span>
              {newVsLostBacklinks30d ? (
                <>
                  <div className="grid grid-cols-2 gap-2 my-auto">
                    <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-center">
                      <span className="text-[10px] text-emerald-400 block font-bold">NEW LINKS</span>
                      <span className="text-lg font-mono font-bold text-white">+{newVsLostBacklinks30d.new}</span>
                    </div>
                    <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-center">
                      <span className="text-[10px] text-rose-400 block font-bold">LOST LINKS</span>
                      <span className="text-lg font-mono font-bold text-white">-{newVsLostBacklinks30d.lost}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Rasio perolehan backlink aktif kompetitor dalam 30 hari.
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-slate-500 py-4 text-center my-auto">Data dinamika 30 hari tidak tersedia.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Best Pages & Overlapping Competitors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Best Pages */}
        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Best Ranking Pages
          </h4>
          <div className="space-y-2.5">
            {bestPages.map((p, idx) => (
              <div key={idx} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                <div className="font-mono text-slate-300 text-[11px] truncate">{p.pageUrl}</div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>Top KW: <strong>{p.topKeyword}</strong></span>
                  <span className="text-pink-400 font-mono font-bold">~{p.estimatedTraffic} traffic</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Competitor Domains */}
        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Domain Kompetitor Serupa
          </h4>
          <div className="space-y-2.5">
            {competitors.map((c, idx) => (
              <div key={idx} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white">{c.domain}</span>
                  <div className="text-[10px] text-slate-500 font-mono">Overlap: {c.keywordOverlap}%</div>
                </div>
                <span className="font-mono text-indigo-400 font-bold">~{c.estimatedTraffic.toLocaleString()} est.</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
