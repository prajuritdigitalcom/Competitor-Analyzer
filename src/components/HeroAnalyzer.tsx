import React, { useState } from 'react';
import { Search, Shield, Zap, Key, Sparkles, Globe, ArrowRight, CheckCircle2, AlertCircle, FileText, Database } from 'lucide-react';
import { AnalysisMode } from '../types/index.ts';

interface HeroAnalyzerProps {
  onStartAnalysis: (url: string, mode: AnalysisMode) => void;
  selectedMode: AnalysisMode;
  onSelectMode: (mode: AnalysisMode) => void;
  hasActiveApiKey: boolean;
  onOpenByokModal: () => void;
  isLoading: boolean;
}

export const HeroAnalyzer: React.FC<HeroAnalyzerProps> = ({
  onStartAnalysis,
  selectedMode,
  onSelectMode,
  hasActiveApiKey,
  onOpenByokModal,
  isLoading,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const sampleDomains = [
    'kompas.com',
    'techinasia.com',
    'detik.com',
    'dailyharvest.com',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!urlInput.trim()) {
      setErrorMsg('Silakan masukkan URL atau domain kompetitor.');
      return;
    }

    onStartAnalysis(urlInput.trim(), selectedMode);
  };

  const handleSampleClick = (sample: string) => {
    setUrlInput(sample);
    setErrorMsg('');
  };

  return (
    <div className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24">
      {/* Background glowing gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-pink-600/15 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Top Badges */}
        <div className="inline-flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-full px-4 py-1.5 mb-6 text-xs text-slate-300 shadow-inner">
          <span className="flex h-2 w-2 rounded-full bg-pink-500 animate-pulse"></span>
          <span className="font-medium text-pink-400">Analisis Kompetitor Otomatis</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">100% Gratis, Tanpa API Key</span>
        </div>

        {/* Hero Headlines */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-5">
          Bedah Website Kompetitor <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-pink-400 via-pink-500 to-rose-400 bg-clip-text text-transparent">
            dalam Hitungan Detik
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed font-normal">
          Analisis konten, keyword, struktur SEO, internal link, topical coverage, dan berbagai data website kompetitor secara gratis tanpa registrasi.
        </p>

        {/* Mode Selector */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 flex items-center shadow-lg">
            <button
              type="button"
              onClick={() => onSelectMode('free')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                selectedMode === 'free'
                  ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>FREE</span>
              <span className="text-[10px] bg-black/30 text-pink-200 px-1.5 py-0.5 rounded uppercase font-mono">
                No API
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectMode('byok')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                selectedMode === 'byok'
                  ? 'bg-slate-800 text-white border border-pink-500/40 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Key className="w-4 h-4 text-amber-400" />
              <span>ADVANCED</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded uppercase font-mono">
                BYOK
              </span>
            </button>
          </div>

          {selectedMode === 'byok' && (
            <button
              type="button"
              onClick={onOpenByokModal}
              className="text-xs text-pink-400 hover:text-pink-300 underline font-medium flex items-center gap-1"
            >
              {hasActiveApiKey ? '✓ API Key Kwinside Terpasang' : '⚙️ Atur API Key Kwinside'}
            </button>
          )}
        </div>

        {/* Mode Explanatory Subtitle */}
        <div className="mb-6">
          {selectedMode === 'free' ? (
            <p className="text-xs text-slate-400">
              ⚡ <strong className="text-slate-300">Free Mode:</strong> Merayapi halaman publik, mengekstrak konten, keyword density, schema, topik klaster, & struktur heading.
            </p>
          ) : (
            <p className="text-xs text-amber-300/90">
              🔑 <strong className="text-amber-200">BYOK Mode:</strong> Menggunakan API Key Kwinside Anda untuk membuka peringkat SERP, search volume, TOP keywords funnel, & estimasi traffic.
            </p>
          )}
        </div>

        {/* Main Input Form */}
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-5">
          <div className="relative flex flex-col sm:flex-row items-center gap-2 bg-slate-900/90 p-2 rounded-2xl border border-slate-700/80 shadow-2xl focus-within:border-pink-500 focus-within:ring-2 focus-within:ring-pink-500/20 transition-all">
            <div className="flex items-center gap-3 pl-3 w-full">
              <Globe className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="https://competitor.com atau competitor.com"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={isLoading}
                className="w-full bg-transparent text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-pink-600/30 shrink-0 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Menganalisis...</span>
                </>
              ) : (
                <>
                  <span>Analyze Competitor</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="mt-3 flex items-center justify-center gap-2 text-rose-400 text-xs font-medium bg-rose-950/40 border border-rose-800/50 py-2 px-3 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </form>

        {/* Quick Samples */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400 mb-10">
          <span className="text-slate-500">Coba contoh:</span>
          {sampleDomains.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => handleSampleClick(sample)}
              className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 transition cursor-pointer font-mono"
            >
              {sample}
            </button>
          ))}
        </div>

        {/* Value Props 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-4xl mx-auto pt-4 border-t border-slate-800/80">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center mb-3">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">Crawl & Ekstrak Instan</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Memetakan sitemap, robots.txt, inventaris artikel, total kata, dan struktur heading secara otomatis.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">Topical Clusters & Gaps</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mengelompokkan artikel ke dalam topik pilar, frekuensi publikasi, dan mendeteksi orphan pages.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <Shield className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">100% Privacy & Offline History</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Riwayat analisis disimpan di browser IndexedDB Anda. Tanpa database akun dan tanpa pelacakan API key.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
