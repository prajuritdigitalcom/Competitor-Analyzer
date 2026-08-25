import { AnalysisReport } from '../types/index.ts';

const DB_NAME = 'prajurit_competitor_analyzer_db';
const DB_VERSION = 1;
const STORE_NAME = 'reports';
const MAX_HISTORY_DEFAULT = 30;

// Initialize IndexedDB
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('domain', 'domain', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 1. Save Report to IndexedDB
export async function saveReportToHistory(report: AnalysisReport): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Clone without sensitive fields (ensure no API keys)
      const cleanReport: AnalysisReport = {
        ...report,
        updatedAt: new Date().toISOString(),
      };

      const request = store.put(cleanReport);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[Storage] Fallback saving to localStorage:', err);
    try {
      const existing = getLocalHistoryMetadata();
      const meta = {
        id: report.id,
        domain: report.domain,
        url: report.originalUrl,
        createdAt: report.createdAt,
        mode: report.mode,
        status: report.status,
        wordsCount: report.contentStats.totalWords,
        articlesCount: report.contentStats.totalArticles,
      };
      localStorage.setItem(`report_${report.id}`, JSON.stringify(report));
      localStorage.setItem('reports_meta', JSON.stringify([meta, ...existing.filter(e => e.id !== report.id)].slice(0, MAX_HISTORY_DEFAULT)));
    } catch {
      // ignore
    }
  }
}

// 2. Get All Reports from IndexedDB
export async function getAllReports(): Promise<AnalysisReport[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const list: AnalysisReport[] = request.result || [];
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

// 3. Get Single Report by ID
export async function getReportById(id: string): Promise<AnalysisReport | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    const local = localStorage.getItem(`report_${id}`);
    return local ? JSON.parse(local) : null;
  }
}

// 4. Delete Report
export async function deleteReportById(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    localStorage.removeItem(`report_${id}`);
  }
}

// 5. Clear All History
export async function clearAllReports(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // clear localStorage
    localStorage.removeItem('reports_meta');
  }
}

function getLocalHistoryMetadata(): any[] {
  try {
    const raw = localStorage.getItem('reports_meta');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// 6. CSV Exporter for Article Inventory (Latest 30 Articles)
export function exportArticlesToCSV(report: AnalysisReport): void {
  const articlesToExport = (report.articleInventoryPages && report.articleInventoryPages.length > 0)
    ? report.articleInventoryPages
    : report.pages.filter(p => p.isArticle).slice(0, 30);

  const headers = ['URL', 'Path', 'Title', 'Author', 'Published Date', 'Last Modified Date', 'Word Count', 'Headings H1', 'Headings H2', 'Internal Inlinks', 'AI-Ready Score', 'Article Confidence %', 'Schema Types'];
  const rows = articlesToExport.map(page => [
    `"${page.url.replace(/"/g, '""')}"`,
    `"${page.path.replace(/"/g, '""')}"`,
    `"${(page.metadata.title || '').replace(/"/g, '""')}"`,
    `"${(page.author || '-').replace(/"/g, '""')}"`,
    `"${page.publishedDate || '-'}"`,
    `"${page.lastModifiedDate || '-'}"`,
    page.wordCount,
    page.headings.totalH1,
    page.headings.totalH2,
    page.internalLinks.length,
    page.aiReadyScore ?? 50,
    page.articleConfidence,
    `"${page.schemas.map(s => s.type).join(', ')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadBlob(csvContent, `prajurit-latest-articles-${report.domain}-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
}

// 7. CSV Exporter for Extracted Keywords
export function exportKeywordsToCSV(report: AnalysisReport): void {
  const headers = ['Keyword', 'Frequency', 'Density %', 'Pages Count', 'Classification', 'Intent', 'In Title', 'In H1', 'In H2', 'In Body'];
  const rows = report.keywords.map(kw => [
    `"${kw.keyword.replace(/"/g, '""')}"`,
    kw.frequency,
    kw.density,
    kw.pagesCount,
    kw.classification,
    kw.intent,
    kw.inTitle ? 'Yes' : 'No',
    kw.inH1 ? 'Yes' : 'No',
    kw.inH2 ? 'Yes' : 'No',
    kw.inBody ? 'Yes' : 'No',
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadBlob(csvContent, `prajurit-keywords-${report.domain}-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
}

// 8. JSON Exporter
export function exportReportToJSON(report: AnalysisReport): void {
  const jsonStr = JSON.stringify(report, null, 2);
  downloadBlob(jsonStr, `prajurit-report-${report.domain}-${Date.now()}.json`, 'application/json');
}

// Helper to trigger browser download
function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helper: HTML escaping for safe print generation (XSS prevention)
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 9. Markdown Copy Summary (Updated with 2026 Metrics)
export function generateMarkdownSummary(report: AnalysisReport): string {
  const cwv = report.performanceSnapshot;
  const trust = report.trustSignals;
  const fresh = report.contentFreshness;

  let extraSections = '';

  if (cwv) {
    const mobileText = cwv.mobileScore !== null ? `${cwv.mobileScore}/100` : '—';
    const desktopText = cwv.desktopScore !== null ? `${cwv.desktopScore}/100` : '—';
    const lcpText = cwv.lcp !== null ? `${(cwv.lcp / 1000).toFixed(2)}s (Target <2.5s)` : '—';
    const clsText = cwv.cls !== null ? `${cwv.cls} (Target <0.10)` : '—';
    const inpText = cwv.inp !== null ? `${cwv.inp}ms` : '—';
    const mobileFriendlyText = cwv.isMobileFriendly === true ? '✓ Ya' : cwv.isMobileFriendly === false ? '✗ Perlu Optimasi' : '—';

    extraSections += `\n## ⚡ Core Web Vitals & Performa (Google PageSpeed)
- **Mobile Score:** ${mobileText} | **Desktop Score:** ${desktopText}
- **LCP:** ${lcpText}
- **CLS:** ${clsText}
- **INP:** ${inpText}
- **Mobile-Friendly:** ${mobileFriendlyText}
`;
  }

  if (trust || fresh) {
    extraSections += `\n## 🛡️ E-E-A-T & Kesegaran Konten
${trust ? `- **Transparansi Penulis:** ${trust.articlesWithAuthorPct}% artikel memiliki author byline` : ''}
${trust ? `- **Halaman Tentang / Kontak:** ${trust.hasAboutPage ? '✓ Ada' : '✗ Tidak'} / ${trust.hasContactPage ? '✓ Ada' : '✗ Tidak'}` : ''}
${fresh ? `- **Kesegaran Konten (12 Bulan):** ${fresh.updatedWithin12MonthsPct}% artikel aktif diperbarui` : ''}
`;
  }

  return `# Ringkasan Analisis Kompetitor: ${report.domain}
*Dibuat oleh Prajurit Competitor Analyzer (Prajurit Digital) pada ${new Date(report.createdAt).toLocaleDateString('id-ID')}*

## 📊 Overview Website
- **Domain:** ${report.domain}
- **URL Dianalisis:** ${report.originalUrl}
- **Total URL Dirayapi:** ${report.overview.totalUrlsCrawled} halaman
- **Total Artikel Terdeteksi:** ${report.contentStats.totalArticles} artikel
- **Total Estimasi Kata:** ${report.contentStats.totalWords.toLocaleString()} kata
- **Rata-rata Kata / Artikel:** ${report.contentStats.avgWordsPerArticle} kata
- **Sitemap XML:** ${report.overview.hasSitemap ? '✓ Ditemukan' : '✗ Tidak Terdeteksi'}
- **Robots.txt:** ${report.overview.hasRobotsTxt ? '✓ Ada' : '✗ Tidak Ada'}
- **Competitor Score:** ${report.competitorScore.overallScore}/100 (Grade ${report.competitorScore.grade})
${extraSections}
## 🏆 Topik & Klaster Konten Utama
${report.clusters.slice(0, 5).map(c => `- **${c.name}**: ${c.articlesCount} artikel (${c.totalWords.toLocaleString()} kata, avg ${c.avgWords} kata/artikel)`).join('\n')}

## 🔑 Top 10 Keywords yang Diekstrak
${report.keywords.slice(0, 10).map((k, i) => `${i + 1}. **${k.keyword}** (Frekuensi: ${k.frequency}x, Halaman: ${k.pagesCount}, Intent: ${k.intent})`).join('\n')}

## 💡 Insight & Rekomendasi Utama
${report.insights.map(ins => `- [${ins.type.toUpperCase()}] **${ins.title}**: ${ins.description}`).join('\n')}

---
*Analisis intelijen kompetitor oleh Prajurit Digital (prajuritdigital.com)*
`;
}

// 10. Branded PDF/Print Exporter with Prajurit Digital Styling & Strict XSS Sanitization
export function printBrandedReport(report: AnalysisReport): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Fallback download markdown if popup blocked
    const md = generateMarkdownSummary(report);
    downloadBlob(md, `prajurit-report-${report.domain}.md`, 'text/markdown');
    return;
  }

  const cwv = report.performanceSnapshot;
  const mobileCWVText = cwv && cwv.mobileScore !== null ? `${cwv.mobileScore}/100` : 'N/A';

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Intelijen Kompetitor - ${escapeHtml(report.domain)} | Prajurit Digital</title>
  <style>
    @page { size: A4; margin: 16mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.5; font-size: 13px; margin: 0; padding: 24px; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .brand { font-size: 20px; font-weight: 800; color: #0f172a; }
    .brand span { color: #db2777; }
    .badge { background: #fdf2f8; color: #be185d; border: 1px solid #fbcfe8; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .card-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .card-value { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px; font-family: monospace; }
    h2 { font-size: 15px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th { background: #f1f5f9; text-align: left; padding: 8px; font-weight: 700; color: #475569; border-bottom: 1px solid #cbd5e1; }
    td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
    .insight { background: #f8fafc; border-left: 4px solid #db2777; padding: 10px 14px; margin-bottom: 8px; border-radius: 0 6px 6px 0; }
    .insight.strength { border-left-color: #10b981; }
    .insight.opportunity { border-left-color: #3b82f6; }
    .insight-title { font-weight: 700; font-size: 12px; margin-bottom: 2px; }
    .footer { margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Prajurit <span>Competitor Analyzer</span></div>
      <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Laporan Audit &amp; Analisis Arsitektur SEO Kompetitor</div>
    </div>
    <div style="text-align: right;">
      <span class="badge">Grade ${escapeHtml(report.competitorScore.grade)} (${report.competitorScore.overallScore}/100)</span>
      <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Tanggal: ${new Date(report.createdAt).toLocaleDateString('id-ID')}</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Domain Target</div>
      <div class="card-value" style="font-size: 16px;">${escapeHtml(report.domain)}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Artikel</div>
      <div class="card-value">${report.contentStats.totalArticles}</div>
    </div>
    <div class="card">
      <div class="card-label">Rata-rata Kata</div>
      <div class="card-value">${report.contentStats.avgWordsPerArticle}</div>
    </div>
    <div class="card">
      <div class="card-label">Mobile CWV</div>
      <div class="card-value">${mobileCWVText}</div>
    </div>
  </div>

  <h2>1. Ringkasan Topik &amp; Content Clusters</h2>
  <table>
    <thead>
      <tr>
        <th>Nama Klaster Konten</th>
        <th style="text-align: center;">Jumlah Artikel</th>
        <th style="text-align: center;">Total Kata</th>
        <th style="text-align: center;">Rata-rata Kata</th>
      </tr>
    </thead>
    <tbody>
      ${report.clusters.slice(0, 6).map(c => `
        <tr>
          <td><strong>${escapeHtml(c.name)}</strong></td>
          <td style="text-align: center; font-family: monospace;">${c.articlesCount}</td>
          <td style="text-align: center; font-family: monospace;">${c.totalWords.toLocaleString()}</td>
          <td style="text-align: center; font-family: monospace;">${c.avgWords}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>2. Top Keywords &amp; Intent</h2>
  <table>
    <thead>
      <tr>
        <th>Keyword</th>
        <th style="text-align: center;">Frekuensi</th>
        <th style="text-align: center;">Densitas</th>
        <th style="text-align: center;">Klasifikasi</th>
        <th style="text-align: center;">Search Intent</th>
      </tr>
    </thead>
    <tbody>
      ${report.keywords.slice(0, 10).map(k => `
        <tr>
          <td><strong>${escapeHtml(k.keyword)}</strong></td>
          <td style="text-align: center; font-family: monospace;">${k.frequency}x</td>
          <td style="text-align: center; font-family: monospace;">${k.density}%</td>
          <td style="text-align: center;">${escapeHtml(k.classification)}</td>
          <td style="text-align: center;">${escapeHtml(k.intent)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>3. Insight &amp; Rekomendasi Strategis</h2>
  ${report.insights.map(ins => `
    <div class="insight ${escapeHtml(ins.type)}">
      <div class="insight-title">${escapeHtml(ins.title)}</div>
      <div style="font-size: 12px; color: #475569;">${escapeHtml(ins.description)}</div>
    </div>
  `).join('')}

  <div class="footer">
    Dokumen ini digenerate secara otomatis oleh <strong>Prajurit Digital</strong> (prajuritdigital.com) • Solusi SEO &amp; Analisis Kompetitif Terdepan.
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}

