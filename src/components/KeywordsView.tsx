import React, { useState } from 'react';
import { Search, Download, Check, Minus, Tag, Zap, Compass, ShoppingCart, Info, Globe } from 'lucide-react';
import { KeywordItem } from '../types/index.ts';

interface KeywordsViewProps {
  keywords: KeywordItem[];
  onExportCSV: () => void;
}

export const KeywordsView: React.FC<KeywordsViewProps> = ({
  keywords,
  onExportCSV,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedIntent, setSelectedIntent] = useState<string>('all');

  const filtered = keywords.filter((kw) => {
    const matchesSearch = kw.keyword.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedClass !== 'all' && kw.classification !== selectedClass) return false;
    if (selectedIntent !== 'all' && kw.intent !== selectedIntent) return false;

    return true;
  });

  const intentIcons: Record<string, any> = {
    Informational: Info,
    Commercial: Compass,
    Transactional: ShoppingCart,
    Navigational: Globe,
  };

  const intentColors: Record<string, string> = {
    Informational: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    Commercial: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    Transactional: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    Navigational: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  };

  const classColors: Record<string, string> = {
    Core: 'bg-pink-500/20 text-pink-300 border-pink-500/30 font-bold',
    Supporting: 'bg-slate-800 text-slate-300 border-slate-700',
    'Long-tail': 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white">Ekstraksi & Densitas Keyword</h3>
            <span className="text-xs bg-slate-800 text-pink-400 font-mono font-bold px-2 py-0.5 rounded-full border border-slate-700">
              {filtered.length} Frasa
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Diekstrak dari title, headings, body text, anchor, dan image alt dengan intent classification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Filter Klasifikasi */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-pink-500"
          >
            <option value="all">Semua Tipe</option>
            <option value="Core">Core Keyword</option>
            <option value="Supporting">Supporting</option>
            <option value="Long-tail">Long-tail Keyword</option>
          </select>

          {/* Filter Intent */}
          <select
            value={selectedIntent}
            onChange={(e) => setSelectedIntent(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-pink-500"
          >
            <option value="all">Semua Intent</option>
            <option value="Informational">Informational</option>
            <option value="Commercial">Commercial</option>
            <option value="Transactional">Transactional</option>
            <option value="Navigational">Navigational</option>
          </select>

          {/* CSV Export */}
          <button
            onClick={onExportCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-pink-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Keywords Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="p-3">Kata Kunci / Frasa</th>
              <th className="p-3 text-center">Tipe</th>
              <th className="p-3 text-center">Search Intent</th>
              <th className="p-3 text-center">Frekuensi</th>
              <th className="p-3 text-center">Densitas</th>
              <th className="p-3 text-center">Jumlah Halaman</th>
              <th className="p-3 text-center">On-Page Presence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  Tidak ada keyword yang sesuai filter.
                </td>
              </tr>
            ) : (
              filtered.map((kw, i) => {
                const IntentIcon = intentIcons[kw.intent] || Info;
                return (
                  <tr key={i} className="hover:bg-slate-850 transition">
                    <td className="p-3 font-semibold text-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-pink-300 font-bold">{kw.keyword}</span>
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${classColors[kw.classification] || ''}`}>
                        {kw.classification}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${intentColors[kw.intent] || ''}`}>
                        <IntentIcon className="w-3 h-3" />
                        <span>{kw.intent}</span>
                      </span>
                    </td>

                    <td className="p-3 text-center font-mono font-bold text-white">
                      {kw.frequency}x
                    </td>

                    <td className="p-3 text-center font-mono text-slate-300">
                      {kw.density}%
                    </td>

                    <td className="p-3 text-center font-mono text-indigo-300">
                      {kw.pagesCount} hal
                    </td>

                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1 font-mono text-[10px]">
                        <span
                          title="Title Presence"
                          className={`px-1.5 py-0.5 rounded ${
                            kw.inTitle ? 'bg-pink-500/20 text-pink-300 font-bold' : 'bg-slate-850 text-slate-600'
                          }`}
                        >
                          T
                        </span>
                        <span
                          title="H1 Heading Presence"
                          className={`px-1.5 py-0.5 rounded ${
                            kw.inH1 ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'bg-slate-850 text-slate-600'
                          }`}
                        >
                          H1
                        </span>
                        <span
                          title="H2 Subheading Presence"
                          className={`px-1.5 py-0.5 rounded ${
                            kw.inH2 ? 'bg-blue-500/20 text-blue-300 font-bold' : 'bg-slate-850 text-slate-600'
                          }`}
                        >
                          H2
                        </span>
                        <span
                          title="Anchor Text Presence"
                          className={`px-1.5 py-0.5 rounded ${
                            kw.inAnchor ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'bg-slate-850 text-slate-600'
                          }`}
                        >
                          A
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
