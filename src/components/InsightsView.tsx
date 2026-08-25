import React from 'react';
import { Lightbulb, CheckCircle2, AlertTriangle, AlertCircle, ArrowUpRight, Sparkles, TrendingUp } from 'lucide-react';
import { ActionableInsight } from '../types/index.ts';

interface InsightsViewProps {
  insights: ActionableInsight[];
}

export const InsightsView: React.FC<InsightsViewProps> = ({ insights }) => {
  const typeIcons: Record<string, any> = {
    strength: CheckCircle2,
    weakness: AlertCircle,
    opportunity: Sparkles,
    warning: AlertTriangle,
  };

  const typeStyles: Record<string, { bg: string; border: string; text: string; iconColor: string; badge: string }> = {
    strength: {
      bg: 'bg-emerald-950/30',
      border: 'border-emerald-800/50',
      text: 'text-emerald-300',
      iconColor: 'text-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    weakness: {
      bg: 'bg-rose-950/30',
      border: 'border-rose-800/50',
      text: 'text-rose-300',
      iconColor: 'text-rose-400',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    opportunity: {
      bg: 'bg-indigo-950/30',
      border: 'border-indigo-800/50',
      text: 'text-indigo-300',
      iconColor: 'text-indigo-400',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    warning: {
      bg: 'bg-amber-950/30',
      border: 'border-amber-800/50',
      text: 'text-amber-300',
      iconColor: 'text-amber-400',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-base sm:text-lg font-bold text-white">Insight & Rekomendasi Strategis</h3>
          <span className="text-xs bg-pink-500/10 text-pink-400 font-mono font-bold px-2 py-0.5 rounded-full border border-pink-500/20">
            Factual Intelligence Engine
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Disimpulkan dari perayapan aktual, distribusi keyword, volume kata, kecepatan publikasi, dan struktur link.
        </p>
      </div>

      {/* Insights List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((ins) => {
          const style = typeStyles[ins.type] || typeStyles.opportunity;
          const Icon = typeIcons[ins.type] || Lightbulb;

          return (
            <div
              key={ins.id}
              className={`p-4 sm:p-5 rounded-2xl border ${style.bg} ${style.border} transition-all hover:scale-[1.01] flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${style.iconColor} shrink-0`} />
                    <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border ${style.badge}`}>
                      {ins.type}
                    </span>
                  </div>
                  {ins.metric && (
                    <span className="text-[11px] font-mono text-slate-300 font-bold bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
                      {ins.metric}
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-white mb-1.5 leading-snug">
                  {ins.title}
                </h4>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {ins.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
