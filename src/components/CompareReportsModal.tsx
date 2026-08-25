import React from 'react';
import { Layers, X, TrendingUp, TrendingDown, Minus, CheckCircle2, ArrowRight } from 'lucide-react';
import { AnalysisReport } from '../types/index.ts';

interface CompareReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportA: AnalysisReport;
  reportB: AnalysisReport;
}

export const CompareReportsModal: React.FC<CompareReportsModalProps> = ({
  isOpen,
  onClose,
  reportA,
  reportB,
}) => {
  if (!isOpen || !reportA || !reportB) return null;

  const renderDelta = (valA: number, valB: number, suffix = '', higherIsBetter = true) => {
    const diff = valB - valA;
    if (diff === 0) {
      return <span className="text-slate-400 font-mono text-xs flex items-center gap-1"><Minus className="w-3 h-3" /> 0</span>;
    }
    const isPositive = diff > 0;
    const isGood = higherIsBetter ? isPositive : !isPositive;

    return (
      <span className={`font-mono text-xs font-bold flex items-center gap-1 ${isGood ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        {isPositive ? '+' : ''}{diff.toLocaleString()}{suffix}
      </span>
    );
  };

  const metrics = [
    {
      label: 'Prajurit Content Score',
      valA: reportA.competitorScore?.overallScore || 0,
      valB: reportB.competitorScore?.overallScore || 0,
      suffix: ' pts',
    },
    {
      label: 'Total Artikel Terdeteksi',
      valA: reportA.contentStats?.totalArticles || 0,
      valB: reportB.contentStats?.totalArticles || 0,
      suffix: ' artikel',
    },
    {
      label: 'Total Estimasi Kata',
      valA: reportA.contentStats?.totalWords || 0,
      valB: reportB.contentStats?.totalWords || 0,
      suffix: ' kata',
    },
    {
      label: 'Rata-rata Kata / Artikel',
      valA: reportA.contentStats?.avgWordsPerArticle || 0,
      valB: reportB.contentStats?.avgWordsPerArticle || 0,
      suffix: ' kata',
    },
    {
      label: 'Jumlah Klaster Topik',
      valA: reportA.clusters?.length || 0,
      valB: reportB.clusters?.length || 0,
      suffix: ' klaster',
    },
    {
      label: 'Kata Kunci yang Diekstrak',
      valA: reportA.keywords?.length || 0,
      valB: reportB.keywords?.length || 0,
      suffix: ' keywords',
    },
    {
      label: 'Total Internal Links',
      valA: reportA.linkAnalysis?.totalInternalLinks || 0,
      valB: reportB.linkAnalysis?.totalInternalLinks || 0,
      suffix: ' links',
    },
    {
      label: 'Cakupan Meta Description',
      valA: reportA.seoSnapshot?.metaDescriptionCoveragePct || 0,
      valB: reportB.seoSnapshot?.metaDescriptionCoveragePct || 0,
      suffix: '%',
    },
    {
      label: 'Cakupan Schema JSON-LD',
      valA: reportA.seoSnapshot?.schemaCoveragePct || 0,
      valB: reportB.seoSnapshot?.schemaCoveragePct || 0,
      suffix: '%',
    },
    {
      label: 'Cakupan Image ALT Text',
      valA: reportA.imageAnalysis?.altCoveragePct || 0,
      valB: reportB.imageAnalysis?.altCoveragePct || 0,
      suffix: '%',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl w-full max-w-4xl p-6 sm:p-8 shadow-2xl relative my-8">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Komparasi Dua Laporan Analisis</h3>
            <p className="text-xs text-slate-400">Bandingkan metrik konten & struktur SEO secara langsung.</p>
          </div>
        </div>

        {/* Website Cards Header */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider">Report A</span>
            <h4 className="text-base font-extrabold text-white truncate">{reportA.domain}</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              {new Date(reportA.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <div className="p-4 bg-slate-900/80 rounded-xl border border-pink-500/30">
            <span className="text-[10px] uppercase font-mono text-pink-400 tracking-wider">Report B</span>
            <h4 className="text-base font-extrabold text-white truncate">{reportB.domain}</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              {new Date(reportB.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="p-3">Metrik Analisis</th>
                <th className="p-3">{reportA.domain}</th>
                <th className="p-3">{reportB.domain}</th>
                <th className="p-3 text-right">Selisih (B vs A)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-200">
              {metrics.map((m, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="p-3 font-semibold text-slate-300">{m.label}</td>
                  <td className="p-3 font-mono font-medium text-slate-300">
                    {m.valA.toLocaleString()}{m.suffix}
                  </td>
                  <td className="p-3 font-mono font-bold text-white">
                    {m.valB.toLocaleString()}{m.suffix}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end">
                      {renderDelta(m.valA, m.valB, m.suffix)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition"
          >
            Tutup Komparasi
          </button>
        </div>
      </div>
    </div>
  );
};
