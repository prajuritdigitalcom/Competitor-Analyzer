import React, { useState } from 'react';
import { History, Search, Trash2, ExternalLink, Calendar, RefreshCw, X, ArrowRight, Layers, FileText, Sparkles, CheckSquare, Square } from 'lucide-react';
import { AnalysisReport } from '../types/index.ts';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reports: AnalysisReport[];
  onSelectReport: (report: AnalysisReport) => void;
  onReAnalyze: (url: string, mode: 'free' | 'byok') => void;
  onDeleteReport: (id: string) => void;
  onClearAll: () => void;
  onCompareReports: (reportA: AnalysisReport, reportB: AnalysisReport) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  reports,
  onSelectReport,
  onReAnalyze,
  onDeleteReport,
  onClearAll,
  onCompareReports,
}) => {
  if (!isOpen) return null;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const filteredReports = reports.filter(r => 
    r.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.originalUrl.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCompareSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter(item => item !== id));
    } else {
      if (selectedForCompare.length < 2) {
        setSelectedForCompare([...selectedForCompare, id]);
      } else {
        // Replace oldest
        setSelectedForCompare([selectedForCompare[1], id]);
      }
    }
  };

  const handleTriggerCompare = () => {
    if (selectedForCompare.length === 2) {
      const repA = reports.find(r => r.id === selectedForCompare[0]);
      const repB = reports.find(r => r.id === selectedForCompare[1]);
      if (repA && repB) {
        onCompareReports(repA, repB);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#1E293B] border-l border-slate-700/80 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Riwayat Analisis</h3>
                <p className="text-[11px] text-slate-400">Tersimpan lokal di browser (IndexedDB)</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search bar */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari domain riwayat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 font-medium"
              />
            </div>

            {/* Compare Bar if items selected */}
            {selectedForCompare.length > 0 && (
              <div className="p-2.5 bg-pink-950/40 border border-pink-500/30 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center gap-1.5 text-pink-300 font-medium">
                  <Layers className="w-3.5 h-3.5 text-pink-400" />
                  <span>{selectedForCompare.length}/2 dipilih untuk komparasi</span>
                </div>
                {selectedForCompare.length === 2 && (
                  <button
                    onClick={handleTriggerCompare}
                    className="px-2.5 py-1 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-lg text-[11px] transition cursor-pointer"
                  >
                    Bandingkan
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Reports List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredReports.length === 0 ? (
              <div className="text-center py-12 px-4">
                <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-300 mb-1">Belum Ada Riwayat</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Analisis website kompetitor pertama Anda dan hasilnya akan tersimpan otomatis di sini.
                </p>
              </div>
            ) : (
              filteredReports.map((report) => {
                const isSelectedForComp = selectedForCompare.includes(report.id);
                const score = report.competitorScore?.overallScore || 0;
                const dateFormatted = new Date(report.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={report.id}
                    onClick={() => {
                      onSelectReport(report);
                      onClose();
                    }}
                    className={`p-3.5 rounded-xl border transition cursor-pointer relative group ${
                      isSelectedForComp
                        ? 'bg-pink-950/30 border-pink-500/50'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm text-white truncate group-hover:text-pink-400 transition">
                            {report.domain}
                          </span>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {report.mode}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{dateFormatted}</span>
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div className="text-right shrink-0">
                        <div className="text-xs font-extrabold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-md border border-pink-500/20 font-mono">
                          {score} pts
                        </div>
                      </div>
                    </div>

                    {/* Stats pills */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-800/80 mb-3">
                      <span><strong>{report.contentStats?.totalArticles || 0}</strong> artikel</span>
                      <span>•</span>
                      <span><strong>{(report.contentStats?.totalWords || 0).toLocaleString()}</strong> kata</span>
                      <span>•</span>
                      <span><strong>{report.keywords?.length || 0}</strong> keywords</span>
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={(e) => toggleCompareSelect(report.id, e)}
                        className={`text-[11px] font-medium flex items-center gap-1.5 transition ${
                          isSelectedForComp ? 'text-pink-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {isSelectedForComp ? (
                          <CheckSquare className="w-3.5 h-3.5 text-pink-400" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span>Pilih Komparasi</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Re-analyze website"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReAnalyze(report.originalUrl || `https://${report.domain}`, report.mode);
                            onClose();
                          }}
                          className="p-1.5 text-slate-400 hover:text-pink-400 hover:bg-slate-800 rounded-lg transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Hapus dari history"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteReport(report.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer actions */}
          {reports.length > 0 && (
            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                Total {reports.length} report tersimpan
              </span>

              {confirmClearOpen ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-rose-400 font-medium">Yakin?</span>
                  <button
                    onClick={() => {
                      onClearAll();
                      setConfirmClearOpen(false);
                    }}
                    className="px-2 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-500 transition"
                  >
                    Hapus Semua
                  </button>
                  <button
                    onClick={() => setConfirmClearOpen(false)}
                    className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 transition"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClearOpen(true)}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Semua Riwayat</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
