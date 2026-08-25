import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp, FileText, ExternalLink, Sparkles, Hash, BookOpen } from 'lucide-react';
import { ContentCluster } from '../types/index.ts';

interface ClustersViewProps {
  clusters: ContentCluster[];
}

export const ClustersView: React.FC<ClustersViewProps> = ({ clusters }) => {
  const [expandedClusterId, setExpandedClusterId] = useState<string | null>(clusters[0]?.id || null);

  const toggleCluster = (id: string) => {
    setExpandedClusterId(expandedClusterId === id ? null : id);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white">Topical Content Clusters</h3>
            <span className="text-xs bg-slate-800 text-pink-400 font-mono font-bold px-2 py-0.5 rounded-full border border-slate-700">
              {clusters.length} Klaster Topik
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Peta hierarki topik yang dibangun dari analisis kesamaan semantik & struktur artikel kompetitor.
          </p>
        </div>
      </div>

      {/* Cluster Cards Grid */}
      <div className="space-y-4">
        {clusters.map((cluster, idx) => {
          const isExpanded = expandedClusterId === cluster.id;
          return (
            <div
              key={cluster.id}
              className={`rounded-2xl border transition-all ${
                isExpanded
                  ? 'bg-slate-900 border-pink-500/40 shadow-lg shadow-pink-500/5'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Cluster Header */}
              <div
                onClick={() => toggleCluster(cluster.id)}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 font-bold flex items-center justify-center shrink-0 font-mono text-sm">
                    #{idx + 1}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm sm:text-base font-bold text-white truncate flex items-center gap-2">
                      <span>{cluster.name}</span>
                      {idx === 0 && (
                        <span className="text-[10px] bg-pink-500/20 text-pink-300 font-semibold px-2 py-0.5 rounded-full border border-pink-500/30">
                          Paling Dominan
                        </span>
                      )}
                    </h4>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                        <strong className="text-slate-200">{cluster.articlesCount}</strong> artikel
                      </span>
                      <span>•</span>
                      <span className="font-mono">
                        <strong className="text-slate-200">{cluster.totalWords.toLocaleString()}</strong> kata
                      </span>
                      <span>•</span>
                      <span className="font-mono">
                        avg <strong className="text-slate-200">{cluster.avgWords}</strong> kata/hal
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition shrink-0"
                >
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-pink-400" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>

              {/* Subtopics Pills */}
              {cluster.subtopics.length > 0 && (
                <div className="px-4 sm:px-5 pb-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 uppercase font-mono mr-1">Subtopik:</span>
                  {cluster.subtopics.map((sub, sIdx) => (
                    <span
                      key={sIdx}
                      className="text-[11px] bg-slate-800/80 text-slate-300 border border-slate-700/60 px-2 py-0.5 rounded-md"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              )}

              {/* Expanded Articles List */}
              {isExpanded && (
                <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 rounded-b-2xl animate-in fade-in">
                  <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-pink-400" />
                    <span>Daftar Artikel dalam Klaster Ini:</span>
                  </h5>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {cluster.articles.map((art, aIdx) => (
                      <div
                        key={aIdx}
                        className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-200 truncate">{art.title}</p>
                          <p className="text-[11px] text-slate-500 font-mono truncate">{art.url}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono text-pink-300 bg-pink-500/10 px-2 py-0.5 rounded">
                            {art.wordCount} kata
                          </span>
                          <a
                            href={art.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-pink-400 p-1 rounded hover:bg-slate-800 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
