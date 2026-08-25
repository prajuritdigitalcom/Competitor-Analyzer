import React, { useState } from 'react';
import { Layers, X, Sparkles, ArrowRight, CheckCircle2, AlertCircle, TrendingUp, Lightbulb, FileText } from 'lucide-react';
import { AnalysisReport, ContentGapResult } from '../types/index.ts';

interface ContentGapModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedReports: AnalysisReport[];
  currentReport?: AnalysisReport;
  onRunGapAnalysis: (targetUrl: string, competitorUrl: string) => Promise<ContentGapResult>;
}

export const ContentGapModal: React.FC<ContentGapModalProps> = ({
  isOpen,
  onClose,
  savedReports,
  currentReport,
  onRunGapAnalysis,
}) => {
  if (!isOpen) return null;

  const [targetDomain, setTargetDomain] = useState('');
  const [competitorDomain, setCompetitorDomain] = useState(currentReport?.domain || '');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [gapResult, setGapResult] = useState<ContentGapResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const target = targetDomain.trim();
    const comp = competitorDomain.trim();

    if (!target || !comp) {
      setErrorMsg('Harap masukkan kedua URL atau domain.');
      return;
    }

    setLoading(true);
    try {
      // Find if both reports already exist in local saved reports
      const targetReport = savedReports.find(r => r.domain.toLowerCase().includes(target.toLowerCase()) || r.originalUrl.toLowerCase().includes(target.toLowerCase()));
      const compReport = savedReports.find(r => r.domain.toLowerCase().includes(comp.toLowerCase()) || r.originalUrl.toLowerCase().includes(comp.toLowerCase())) || currentReport;

      if (targetReport && compReport) {
        setLoadingStep('Membandingkan data laporan yang tersimpan...');
        const res = await fetch('/api/gap-compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetReport, competitorReport: compReport }),
        });
        const data = await res.json();
        if (data.success && data.gapResult) {
          setGapResult(data.gapResult);
        } else {
          setErrorMsg(data.error || 'Gagal membandingkan.');
        }
      } else {
        // Run live crawling & comparative gap analysis
        setLoadingStep('Melakukan deep crawl & analisis celah konten pada kedua domain...');
        const result = await onRunGapAnalysis(target, comp);
        setGapResult(result);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan komparasi.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl w-full max-w-3xl p-6 sm:p-8 shadow-2xl relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Free Content Gap Analysis</h3>
            <p className="text-xs text-slate-400">Temukan topik & peluang keyword yang dimiliki kompetitor tetapi belum ada di website Anda.</p>
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleCompare} className="space-y-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Website Anda (Target)
              </label>
              <input
                type="text"
                placeholder="websiteanda.com"
                value={targetDomain}
                onChange={(e) => setTargetDomain(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition"
              />
              {savedReports.length > 0 && (
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500">Pilih dari riwayat:</span>
                  {savedReports.slice(0, 3).map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setTargetDomain(r.domain)}
                      className="text-[10px] text-indigo-400 hover:underline bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-800"
                    >
                      {r.domain}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Website Kompetitor
              </label>
              <input
                type="text"
                placeholder="competitor.com"
                value={competitorDomain}
                onChange={(e) => setCompetitorDomain(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span className="text-xs sm:text-sm">{loadingStep || 'Menghitung Content Gap...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Bandingkan Content Opportunities</span>
              </>
            )}
          </button>
        </form>

        {/* Results Area */}
        {gapResult && (
          <div className="space-y-5 animate-in fade-in pt-4 border-t border-slate-800">
            {/* Header Result */}
            <div className="p-4 bg-gradient-to-r from-indigo-950/50 to-pink-950/40 border border-indigo-500/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-indigo-400 font-mono uppercase tracking-wider">Hasil Analisis Content Gap</span>
                <h4 className="text-lg font-extrabold text-white mt-0.5">
                  {gapResult.totalOpportunitiesCount} Peluang Konten Ditemukan!
                </h4>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">{gapResult.targetDomain} vs {gapResult.competitorDomain}</span>
              </div>
            </div>

            {/* Strategic Insights */}
            <div className="space-y-2">
              {gapResult.insights.map((ins, i) => (
                <div key={i} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-start gap-2.5 text-xs text-slate-200">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{ins}</span>
                </div>
              ))}
            </div>

            {/* Keyword Opportunities Table */}
            <div>
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Peluang Keyword Milik Kompetitor
              </h5>
              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0">
                    <tr>
                      <th className="p-2.5">Keyword Gap</th>
                      <th className="p-2.5">Frekuensi Kompetitor</th>
                      <th className="p-2.5">Search Intent</th>
                      <th className="p-2.5">Klasifikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {gapResult.keywordGaps.map((gap, i) => (
                      <tr key={i} className="hover:bg-slate-800/40">
                        <td className="p-2.5 font-semibold text-pink-300">{gap.keyword}</td>
                        <td className="p-2.5 font-mono">{gap.competitorFrequency}x</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                            {gap.intent}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-400">{gap.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
