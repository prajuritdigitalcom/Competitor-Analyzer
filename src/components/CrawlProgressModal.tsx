import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, Circle, Globe, AlertTriangle } from 'lucide-react';

interface CrawlProgressModalProps {
  isOpen: boolean;
  domain: string;
  mode: 'free' | 'byok';
  onCancel?: () => void;
}

interface StepItem {
  id: string;
  label: string;
  detail: string;
}

export const CrawlProgressModal: React.FC<CrawlProgressModalProps> = ({
  isOpen,
  domain,
  mode,
  onCancel,
}) => {
  if (!isOpen) return null;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps: StepItem[] = [
    { id: 'robots', label: 'Checking robots.txt', detail: 'Mengecek aturan disallow & izin crawling' },
    { id: 'sitemap', label: 'Discovering sitemap', detail: 'Mencari sitemap.xml & sitemap index' },
    { id: 'crawling', label: 'Crawling pages', detail: 'Mengunduh halaman & memetakan internal link' },
    { id: 'extracting', label: 'Extracting content', detail: 'Menghitung kata, schema JSON-LD, & metadata' },
    { id: 'keywords', label: 'Detecting keywords', detail: 'Mengekstrak n-gram & intent klasifikasi' },
    { id: 'clusters', label: 'Building content clusters', detail: 'Mengelompokkan artikel ke dalam topik pilar' },
    { id: 'insights', label: 'Generating insights', detail: 'Menghitung Prajurit Content Score & rekomendasi' },
    { id: 'pagespeed', label: 'Auditing PageSpeed', detail: 'Mengukur Core Web Vitals via Google PageSpeed Insights' },
  ];

  if (mode === 'byok') {
    steps.push({
      id: 'byok',
      label: 'Fetching Kwinside SEO data',
      detail: 'Menghubungi SEO API untuk ranking SERP & search volume',
    });
  }

  useEffect(() => {
    setCurrentStepIndex(0);
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isOpen, mode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pink-500 via-rose-400 to-indigo-500 animate-pulse"></div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/30 text-pink-400 flex items-center justify-center mx-auto mb-3">
            <Globe className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Menganalisis Website Kompetitor</h3>
          <p className="text-xs text-slate-400 font-mono bg-slate-900/60 px-3 py-1 rounded-full inline-block border border-slate-800">
            {domain}
          </p>
        </div>

        {/* Progress Checklist */}
        <div className="space-y-3 mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800/80">
          {steps.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isUpcoming = idx > currentStepIndex;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 transition-opacity duration-300 ${
                  isUpcoming ? 'opacity-40' : 'opacity-100'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {isCurrent && <Loader2 className="w-4 h-4 text-pink-400 animate-spin" />}
                  {isUpcoming && <Circle className="w-4 h-4 text-slate-600" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${
                        isDone
                          ? 'text-slate-200'
                          : isCurrent
                          ? 'text-pink-300 font-bold'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] text-pink-400 font-mono bg-pink-500/10 px-2 py-0.5 rounded-full animate-pulse">
                        processing
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {step.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Note */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
          <span className="text-[11px] text-slate-500">
            Proses crawl rata-rata membutuhkan 3–8 detik.
          </span>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition"
            >
              Batalkan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
