import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { AnalysisMode, AnalysisReport, ContentGapResult } from './types/index.ts';
import { clearAllReports, deleteReportById, getAllReports, saveReportToHistory } from './lib/storage.ts';
import { postJson } from './lib/apiClient.ts';
import { Navbar } from './components/Navbar.tsx';
import { HeroAnalyzer } from './components/HeroAnalyzer.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { CrawlProgressModal } from './components/CrawlProgressModal.tsx';
import { ByokModal } from './components/ByokModal.tsx';
import { HistoryDrawer } from './components/HistoryDrawer.tsx';
import { ContentGapModal } from './components/ContentGapModal.tsx';
import { CompareReportsModal } from './components/CompareReportsModal.tsx';
import { Footer } from './components/Footer.tsx';

export default function App() {
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [currentReport, setCurrentReport] = useState<AnalysisReport | null>(null);
  const [selectedMode, setSelectedMode] = useState<AnalysisMode>('free');
  const [apiKey, setApiKey] = useState<string>('');
  
  // UI Modals & Drawers
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlingDomain, setCrawlingDomain] = useState('');
  const [byokModalOpen, setByokModalOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [contentGapModalOpen, setContentGapModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [comparePair, setComparePair] = useState<{ a: AnalysisReport; b: AnalysisReport } | null>(null);

  // Global Error Alert
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Load saved reports from IndexedDB on initial mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const list = await getAllReports();
        setReports(list);
      } catch (err) {
        console.error('Failed to load history:', err);
      }
    }
    loadHistory();

    // Check session storage for temporary BYOK key if saved
    const sessionKey = sessionStorage.getItem('kwinside_byok_key');
    if (sessionKey) {
      setApiKey(sessionKey);
    }
  }, []);

  // Trigger analysis
  const handleStartAnalysis = async (targetUrl: string, mode: AnalysisMode) => {
    setGlobalError(null);
    setCrawlingDomain(targetUrl);
    setIsCrawling(true);

    try {
      const payload: any = {
        url: targetUrl,
        mode,
        apiKey: mode === 'byok' ? apiKey : undefined,
      };

      const data = await postJson<{ success: boolean; report: AnalysisReport; error?: string }>(
        '/api/crawl',
        payload
      );

      if (!data.success || !data.report) {
        throw new Error(data.error || 'Gagal menganalisis website kompetitor.');
      }

      const newReport: AnalysisReport = data.report;
      setCurrentReport(newReport);

      // Save automatically to local IndexedDB
      await saveReportToHistory(newReport);
      const updatedList = await getAllReports();
      setReports(updatedList);

      // Trigger Confetti Effect
      try {
        confetti({
          particleCount: 75,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#EC4899', '#F472B6', '#6366F1', '#38BDF8'],
        });
      } catch {
        // ignore
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Terjadi kesalahan pada crawler.');
    } finally {
      setIsCrawling(false);
    }
  };

  // Re-Analyze handler
  const handleReAnalyze = (url: string, mode: AnalysisMode) => {
    handleStartAnalysis(url, mode);
  };

  // Save API Key
  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    sessionStorage.setItem('kwinside_byok_key', key);
  };

  // Clear API Key
  const handleClearApiKey = () => {
    setApiKey('');
    sessionStorage.removeItem('kwinside_byok_key');
  };

  // Delete single report
  const handleDeleteReport = async (id: string) => {
    await deleteReportById(id);
    const updated = await getAllReports();
    setReports(updated);
    if (currentReport?.id === id) {
      setCurrentReport(updated[0] || null);
    }
  };

  // Clear all history
  const handleClearAllHistory = async () => {
    await clearAllReports();
    setReports([]);
    setCurrentReport(null);
  };

  // Compare 2 reports
  const handleCompareReports = (repA: AnalysisReport, repB: AnalysisReport) => {
    setComparePair({ a: repA, b: repB });
    setCompareModalOpen(true);
  };

  // Helper to fetch or get existing report
  const getOrCrawlReport = async (urlStr: string): Promise<AnalysisReport> => {
    const clean = urlStr.trim().toLowerCase();
    const cleanDomain = clean.replace(/^https?:\/\//, '').split('/')[0];
    const existing = reports.find(
      r => r.originalUrl.toLowerCase() === clean ||
           r.domain.toLowerCase() === cleanDomain ||
           r.domain.toLowerCase().includes(cleanDomain)
    );
    if (existing) {
      return existing;
    }

    const data = await postJson<{ success: boolean; report: AnalysisReport; error?: string }>(
      '/api/crawl',
      { url: urlStr, mode: 'free' }
    );
    if (!data.success || !data.report) {
      throw new Error(data.error || `Gagal menganalisis domain ${urlStr}`);
    }
    const newRep: AnalysisReport = data.report;
    await saveReportToHistory(newRep);
    return newRep;
  };

  // Run live Content Gap analysis
  const handleRunLiveGapAnalysis = async (targetUrl: string, competitorUrl: string): Promise<ContentGapResult> => {
    // 1. Crawl both target and competitor reports in parallel
    const [targetRep, competitorRep] = await Promise.all([
      getOrCrawlReport(targetUrl),
      getOrCrawlReport(competitorUrl),
    ]);

    // 2. Refresh local reports list
    const updatedList = await getAllReports();
    setReports(updatedList);

    // 3. Call gap comparison API
    const data = await postJson<{ success: boolean; gapResult: ContentGapResult; error?: string }>(
      '/api/gap-compare',
      { targetReport: targetRep, competitorReport: competitorRep }
    );

    if (!data.success || !data.gapResult) {
      throw new Error(data.error || 'Gagal membandingkan peluang celah konten.');
    }

    return data.gapResult;
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col selection:bg-pink-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        onOpenHistory={() => setHistoryDrawerOpen(true)}
        onOpenByokModal={() => setByokModalOpen(true)}
        onOpenContentGap={() => setContentGapModalOpen(true)}
        onNavigateHome={() => setCurrentReport(null)}
        savedReportsCount={reports.length}
        hasActiveApiKey={Boolean(apiKey)}
      />

      {/* Global Error Banner */}
      {globalError && (
        <div className="max-w-4xl mx-auto px-4 mt-6 w-full animate-in fade-in">
          <div className="p-4 bg-rose-950/60 border border-rose-800/80 rounded-2xl text-xs sm:text-sm text-rose-200 flex items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0"></span>
              <span>{globalError}</span>
            </div>
            <button
              onClick={() => setGlobalError(null)}
              className="text-xs text-rose-300 hover:text-white underline font-semibold shrink-0"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {currentReport ? (
          <Dashboard
            report={currentReport}
            onReAnalyze={handleReAnalyze}
            onOpenContentGap={() => setContentGapModalOpen(true)}
            onOpenByokModal={() => setByokModalOpen(true)}
            onNewAnalysis={() => setCurrentReport(null)}
          />
        ) : (
          <HeroAnalyzer
            onStartAnalysis={handleStartAnalysis}
            selectedMode={selectedMode}
            onSelectMode={setSelectedMode}
            hasActiveApiKey={Boolean(apiKey)}
            onOpenByokModal={() => setByokModalOpen(true)}
            isLoading={isCrawling}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals and Drawers */}
      <CrawlProgressModal
        isOpen={isCrawling}
        domain={crawlingDomain}
        mode={selectedMode}
        onCancel={() => setIsCrawling(false)}
      />

      <ByokModal
        isOpen={byokModalOpen}
        onClose={() => setByokModalOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        onClearApiKey={handleClearApiKey}
      />

      <HistoryDrawer
        isOpen={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        reports={reports}
        onSelectReport={(report) => {
          setCurrentReport(report);
          setHistoryDrawerOpen(false);
        }}
        onReAnalyze={handleReAnalyze}
        onDeleteReport={handleDeleteReport}
        onClearAll={handleClearAllHistory}
        onCompareReports={handleCompareReports}
      />

      <ContentGapModal
        isOpen={contentGapModalOpen}
        onClose={() => setContentGapModalOpen(false)}
        savedReports={reports}
        currentReport={currentReport || undefined}
        onRunGapAnalysis={handleRunLiveGapAnalysis}
      />

      {comparePair && (
        <CompareReportsModal
          isOpen={compareModalOpen}
          onClose={() => {
            setCompareModalOpen(false);
            setComparePair(null);
          }}
          reportA={comparePair.a}
          reportB={comparePair.b}
        />
      )}
    </div>
  );
}
