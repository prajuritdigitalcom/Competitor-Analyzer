import React, { useState } from 'react';
import { Sparkles, History, Key, Layers, Menu, X } from 'lucide-react';

interface NavbarProps {
  onOpenHistory: () => void;
  onOpenByokModal: () => void;
  onOpenContentGap: () => void;
  onNavigateHome: () => void;
  savedReportsCount: number;
  hasActiveApiKey: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenHistory,
  onOpenByokModal,
  onOpenContentGap,
  onNavigateHome,
  savedReportsCount,
  hasActiveApiKey,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div 
            onClick={onNavigateHome}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative">
              <img 
                src="https://i.ibb.co.com/wr0x733r/prajurit-digital.jpg" 
                alt="Prajurit Digital Logo" 
                className="w-9 h-9 rounded-xl object-cover ring-2 ring-pink-500/30 group-hover:ring-pink-500 transition shadow-lg shadow-pink-500/10"
              />
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
              </span>
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight">Competitor Analyzer</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-3">
            <button
              onClick={onNavigateHome}
              className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800/60 transition flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-pink-400" />
              Analyzer
            </button>

            <button
              onClick={onOpenContentGap}
              className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800/60 transition flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              Content Gap
            </button>

            <button
              onClick={onOpenByokModal}
              className={`text-sm font-medium px-3 py-2 rounded-lg transition flex items-center gap-1.5 border ${
                hasActiveApiKey
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'text-slate-300 border-slate-700/60 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Key className={`w-4 h-4 ${hasActiveApiKey ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span>BYOK API</span>
              {hasActiveApiKey && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>

            <button
              onClick={onOpenHistory}
              className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800/60 transition flex items-center gap-1.5 relative"
            >
              <History className="w-4 h-4 text-slate-400" />
              <span>Riwayat</span>
              {savedReportsCount > 0 && (
                <span className="text-[11px] font-bold bg-pink-600 text-white px-1.5 py-0.2 rounded-full">
                  {savedReportsCount}
                </span>
              )}
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onOpenHistory}
              className="p-2 text-slate-300 hover:text-white relative rounded-lg bg-slate-800/50"
            >
              <History className="w-5 h-5" />
              {savedReportsCount > 0 && (
                <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-pink-600 text-white px-1.5 py-0.2 rounded-full">
                  {savedReportsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white rounded-lg bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0F172A] border-b border-slate-800 px-4 py-4 space-y-2">
          <button
            onClick={() => {
              onNavigateHome();
              setMobileMenuOpen(false);
            }}
            className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg text-slate-200 hover:bg-slate-800"
          >
            <Sparkles className="w-4 h-4 text-pink-400" />
            Competitor Analyzer
          </button>
          <button
            onClick={() => {
              onOpenContentGap();
              setMobileMenuOpen(false);
            }}
            className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg text-slate-200 hover:bg-slate-800"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            Content Gap Comparison
          </button>
          <button
            onClick={() => {
              onOpenByokModal();
              setMobileMenuOpen(false);
            }}
            className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-200 hover:bg-slate-800"
          >
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              <span>Advanced SEO (BYOK)</span>
            </div>
            {hasActiveApiKey && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
                Active
              </span>
            )}
          </button>
          <button
            onClick={() => {
              onOpenHistory();
              setMobileMenuOpen(false);
            }}
            className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-200 hover:bg-slate-800"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              <span>Riwayat Analisis Lokal</span>
            </div>
            <span className="text-xs text-slate-400">{savedReportsCount} reports</span>
          </button>
        </div>
      )}
    </header>
  );
};
