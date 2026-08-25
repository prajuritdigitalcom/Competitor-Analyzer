import React from 'react';
import { Calendar, TrendingUp, BarChart3, Clock, Zap, AlertCircle } from 'lucide-react';
import { PublishingFrequency } from '../types/index.ts';

interface PublishingTimelineViewProps {
  frequency: PublishingFrequency;
}

export const PublishingTimelineView: React.FC<PublishingTimelineViewProps> = ({ frequency }) => {
  const maxMonthlyCount = Math.max(1, ...frequency.monthlyBreakdown.map(m => m.count));

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base sm:text-lg font-bold text-white">Frekuensi & Kecepatan Publikasi Konten</h3>
          <span className="text-xs bg-slate-800 text-pink-400 font-mono font-bold px-2 py-0.5 rounded-full border border-slate-700">
            Publishing Cadence
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Analisis konsistensi produksi konten kompetitor berdasarkan tanggal terbit artikel yang terdeteksi.
        </p>
      </div>

      {/* Cadence Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-pink-400" />
            <span>Rata-rata / Bulan</span>
          </div>
          <p className="text-2xl font-extrabold text-white font-mono">
            {frequency.articlesPerMonth}
            <span className="text-xs text-slate-500 font-normal ml-1">artikel/bln</span>
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Rata-rata / Minggu</span>
          </div>
          <p className="text-2xl font-extrabold text-white font-mono">
            {frequency.articlesPerWeek}
            <span className="text-xs text-slate-500 font-normal ml-1">artikel/mgg</span>
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>Bulan Paling Aktif</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-emerald-300 font-mono truncate">
            {frequency.mostActiveMonth || 'N/A'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Artikel Terbaru</span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-200 font-mono truncate">
            {frequency.newestArticleDate || 'Tidak Terdeteksi'}
          </p>
        </div>
      </div>

      {/* Monthly Timeline Chart */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-pink-400" />
          <span>Distribusi Publikasi Bulanan:</span>
        </h4>

        {frequency.monthlyBreakdown.length === 0 ? (
          <div className="p-6 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-500">
            Website tidak menyertakan tanggal terbit eksplisit pada tag meta atau schema JSON-LD.
          </div>
        ) : (
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-end gap-2 h-40 pt-4 px-2 overflow-x-auto">
              {frequency.monthlyBreakdown.map((item, idx) => {
                const heightPct = Math.max(12, Math.round((item.count / maxMonthlyCount) * 100));
                return (
                  <div key={idx} className="flex-1 min-w-[36px] flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition">
                      {item.count}
                    </span>
                    <div
                      className="w-full bg-gradient-to-t from-pink-600 to-rose-400 rounded-t-md transition-all group-hover:from-pink-500 group-hover:to-pink-300 shadow-sm"
                      style={{ height: `${heightPct}%` }}
                    ></div>
                    <span className="text-[9px] font-mono text-slate-500 truncate w-full text-center">
                      {item.month.slice(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
