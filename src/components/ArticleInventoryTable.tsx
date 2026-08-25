import React, { useState } from 'react';
import { Search, Download, ExternalLink, ArrowUpDown, Filter, CheckCircle2, AlertTriangle, FileText, Sparkles, User, Clock, RefreshCw, Calendar } from 'lucide-react';
import { ArticleInventorySummary, CrawledPage } from '../types/index.ts';

interface ArticleInventoryTableProps {
  pages: CrawledPage[];
  totalArticles?: number;
  articleInventory?: ArticleInventorySummary;
  onExportCSV: () => void;
}

type SortField = 'date' | 'wordCount' | 'articleConfidence' | 'headings' | 'links' | 'url' | 'aiReadyScore';

function getArticleTimestamp(page: CrawledPage): number {
  const dStr = page.publishedDate || page.lastModifiedDate;
  if (dStr) {
    const d = new Date(dStr);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  // Check URL date pattern e.g. /2026/08/ or 2026-08
  const match = page.url.match(/\/(\d{4})[/-](\d{2})(?:[/-](\d{2}))?/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = match[3] ? parseInt(match[3], 10) : 1;
    const d = new Date(Date.UTC(year, month, day));
    if (!isNaN(d.getTime())) return d.getTime();
  }
  return 0;
}

export const ArticleInventoryTable: React.FC<ArticleInventoryTableProps> = ({
  pages,
  totalArticles,
  articleInventory,
  onExportCSV,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'high_wordcount' | 'low_wordcount' | 'ai_ready'>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalCount = totalArticles ?? articleInventory?.totalArticles ?? pages.length;

  // Filter
  const filtered = pages.filter((page) => {
    const matchesSearch =
      page.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (page.metadata.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (page.author || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'high_wordcount') return page.wordCount >= 1000;
    if (filterType === 'low_wordcount') return page.wordCount < 400;
    if (filterType === 'ai_ready') return (page.aiReadyScore || 0) >= 60;

    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    if (sortField === 'date') diff = getArticleTimestamp(a) - getArticleTimestamp(b);
    else if (sortField === 'wordCount') diff = a.wordCount - b.wordCount;
    else if (sortField === 'articleConfidence') diff = a.articleConfidence - b.articleConfidence;
    else if (sortField === 'headings') diff = (a.headings.totalH1 + a.headings.totalH2) - (b.headings.totalH1 + b.headings.totalH2);
    else if (sortField === 'links') diff = a.internalLinks.length - b.internalLinks.length;
    else if (sortField === 'url') diff = a.path.localeCompare(b.path);
    else if (sortField === 'aiReadyScore') diff = (a.aiReadyScore || 0) - (b.aiReadyScore || 0);

    return sortAsc ? diff : -diff;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-base sm:text-lg font-bold text-white">Latest Article Inventory</h3>
            <span className="text-xs bg-pink-500/10 text-pink-400 font-mono font-bold px-2.5 py-0.5 rounded-full border border-pink-500/30">
              {totalCount > pages.length
                ? `${totalCount} total artikel • menampilkan ${pages.length} terbaru`
                : `${pages.length} artikel terbaru`}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Daftar artikel terbaru yang dianalisis secara mendalam beserta tanggal publish/update, metrik kata, heading, dan skor kesiapan AI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari judul, URL, atau penulis..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Filter dropdown */}
          <select
            value={filterType}
            onChange={(e: any) => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-700/80 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-pink-500"
          >
            <option value="all">Semua Artikel Terbaru</option>
            <option value="ai_ready">✨ AI-Ready (Skor ≥ 60)</option>
            <option value="high_wordcount">Artikel Panjang (&gt; 1.000 kata)</option>
            <option value="low_wordcount">Artikel Pendek (&lt; 400 kata)</option>
          </select>

          {/* Export CSV */}
          <button
            onClick={onExportCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-pink-400" />
            <span>Export CSV (30 Artikel)</span>
          </button>
        </div>
      </div>

      <div className="text-[11px] text-slate-500 mb-3 italic">
        * Pencarian & filter berlaku pada {pages.length} artikel terbaru yang dimuat ke dalam inventaris analisis.
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="p-3">
                <button
                  onClick={() => handleSort('url')}
                  className="flex items-center gap-1 hover:text-white"
                >
                  <span>Artikel & Informasi</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="p-3">
                <button
                  onClick={() => handleSort('date')}
                  className="flex items-center gap-1 hover:text-white text-pink-300"
                >
                  <Calendar className="w-3 h-3 text-pink-400" />
                  <span>Tanggal</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="p-3 text-right">
                <button
                  onClick={() => handleSort('wordCount')}
                  className="flex items-center gap-1 ml-auto hover:text-white"
                >
                  <span>Total Kata</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="p-3 text-center">
                <button
                  onClick={() => handleSort('headings')}
                  className="flex items-center gap-1 justify-center hover:text-white"
                >
                  <span>Headings</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="p-3 text-center">
                <button
                  onClick={() => handleSort('links')}
                  className="flex items-center gap-1 justify-center hover:text-white"
                >
                  <span>Links</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="p-3 text-center">
                <button
                  onClick={() => handleSort('aiReadyScore')}
                  className="flex items-center gap-1 justify-center text-pink-400 hover:text-pink-300"
                  title="Estimasi kesiapan struktural untuk dikutip AI Search"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>AI-Ready</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="p-3 text-center">
                <button
                  onClick={() => handleSort('articleConfidence')}
                  className="flex items-center gap-1 justify-center hover:text-white"
                >
                  <span>Confidence</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  Tidak ada artikel yang cocok dengan filter pencarian.
                </td>
              </tr>
            ) : (
              paginated.map((page) => (
                <tr key={page.id} className="hover:bg-slate-850 transition">
                  <td className="p-3 max-w-sm">
                    <div className="font-semibold text-slate-100 line-clamp-1 mb-1">
                      {page.metadata.title || page.headings.h1[0] || page.path}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-500">
                      <span className="truncate max-w-[200px]">{page.path}</span>
                      {page.author && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-slate-800/90 text-amber-300 px-1.5 py-0.5 rounded font-sans">
                          <User className="w-2.5 h-2.5" />
                          {page.author}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Date Column */}
                  <td className="p-3">
                    {page.lastModifiedDate ? (
                      <div className="flex flex-col gap-0.5 text-[11px]">
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-sans font-medium">
                          <RefreshCw className="w-2.5 h-2.5 shrink-0" />
                          <span>Upd: {page.lastModifiedDate.slice(0, 10)}</span>
                        </span>
                        {page.publishedDate && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Pub: {page.publishedDate.slice(0, 10)}
                          </span>
                        )}
                      </div>
                    ) : page.publishedDate ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-sans">
                        <Clock className="w-2.5 h-2.5 text-pink-400" />
                        <span>{page.publishedDate.slice(0, 10)}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-600 italic">
                        Tanggal tdk ada
                      </span>
                    )}
                  </td>

                  <td className="p-3 text-right font-mono font-bold text-white">
                    <span className={page.wordCount >= 1000 ? 'text-pink-400' : ''}>
                      {page.wordCount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1 font-normal">
                      (~{page.readingTimeMinutes} min)
                    </span>
                  </td>

                  <td className="p-3 text-center">
                    <div className="inline-flex items-center gap-1 font-mono text-[11px]">
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                        H1:{page.headings.totalH1}
                      </span>
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                        H2:{page.headings.totalH2}
                      </span>
                    </div>
                  </td>

                  <td className="p-3 text-center font-mono">
                    <span className="bg-indigo-950/40 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full text-[11px]">
                      {page.internalLinks.length}
                    </span>
                  </td>

                  {/* AI-Ready Structural Proxy */}
                  <td className="p-3 text-center">
                    <div className="inline-flex flex-col items-center gap-0.5" title="Skor kesiapan struktural (format poin, FAQ schema, direct answer). Estimasi heuristik, bukan konfirmasi live AI Overview.">
                      <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${(page.aiReadyScore || 0) >= 70 ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : (page.aiReadyScore || 0) >= 40 ? 'bg-slate-800 text-slate-300' : 'bg-slate-900 text-slate-500'}`}>
                        {page.aiReadyScore ?? 50}/100
                      </span>
                    </div>
                  </td>

                  <td className="p-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <div className="w-10 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            page.articleConfidence >= 75
                              ? 'bg-emerald-500'
                              : page.articleConfidence >= 45
                              ? 'bg-pink-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${page.articleConfidence}%` }}
                        ></div>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">
                        {page.articleConfidence}%
                      </span>
                    </div>
                  </td>

                  <td className="p-3 text-center">
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-pink-400 inline-block rounded-lg hover:bg-slate-800 transition"
                      title="Buka URL di tab baru"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
          <span>
            Menampilkan {(currentPage - 1) * itemsPerPage + 1}–
            {Math.min(currentPage * itemsPerPage, sorted.length)} dari {sorted.length} artikel terbaru (Hal {currentPage}/{totalPages})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 rounded-lg text-slate-200 font-semibold transition"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 rounded-lg text-slate-200 font-semibold transition"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
