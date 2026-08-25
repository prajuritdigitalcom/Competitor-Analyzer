# Prajurit Competitor Analyzer

Prajurit Competitor Analyzer adalah aplikasi intelijen konten & analisis arsitektur SEO kompetitor modern berbasis **React 19 + TypeScript + Express + Vite + Tailwind CSS**.

Dibangun khusus untuk praktisi SEO, content strategist, dan tim digital marketing untuk membedah arsitektur konten kompetitor secara mendalam, transparan, dan terukur.

---

## 🚀 Fitur Utama

1. **Dual-Mode Intelligence Engine**:
   - **Mode 100% Free**: Fast crawling tanpa API key, ekstraksi metadata, heading (H1-H3), sitemap XML discovery mendalam, kalkulasi word count, pendeteksian author byline, schema JSON-LD, internal linking graph, dan komputasi *Competitor Intelligence Score* (0-100).
   - **Mode BYOK (Bring Your Own Key)**: Integrasi opsional dengan **Kwinside API** untuk data keyword rankings, estimasi traffic organik, SERP features (Featured Snippets, PAA), GEO search citations, dan backlink referrers.

2. **Live Content Gap Analysis**:
   - Bandingkan topik dan kata kunci antara website target dan kompetitor.
   - Deteksi peluang keyword berfrekuensi tinggi milik kompetitor yang belum dimiliki website Anda.

3. **Core Web Vitals & E-E-A-T 2026 Audit**:
   - Integrasi langsung dengan Google PageSpeed Insights API (LCP, CLS, INP, FCP, Mobile Score).
   - Penanganan data transparan (menampilkan nilai asli tanpa fabrikasi).

4. **Inventaris Artikel & Sub-Sitemap Scanner**:
   - Memindai seluruh `sitemap.xml`, `post-sitemap.xml`, `artikel-sitemap.xml`, `news-sitemap.xml` untuk menghitung total artikel website secara akurat.
   - Menyajikan data 30 artikel terbaru dengan AI-Ready score, estimasi waktu baca, tanggal publish/update, dan klasifikasi otomatis.

5. **Export Fleksibel**:
   - Cetak Laporan PDF Branded dengan styling Prajurit Digital (terproteksi XSS).
   - Ekspor Artikel ke CSV.
   - Ekspor Keyword ke CSV.
   - Ekspor Laporan Lengkap ke JSON.

---

## 🛠️ Menjalankan Aplikasi

### Persyaratan
- Node.js 18+ atau 20+
- NPM

### Instalasi & Dev Server
```bash
npm install
npm run dev
```
Dev server berjalan di port `3000` (atau port default yang dikonfigurasi).

### Build & Jalankan Produksi
```bash
npm run build
npm start
```
Perintah `npm start` akan mengeksekusi server produksi Express melalui `tsx server.ts` yang menyajikan API `/api/*` dan bundle frontend statis di direktori `dist/`.

### Konfigurasi Environment (`.env`)
```env
PORT=3000

# Opsional: Gemini API Key untuk fitur GEO Search Grounding (analisis rujukan AI Search)
# serta PageSpeed Insights API jika diaktifkan pada Google Cloud project yang sama.
# Jika tidak diisi, aplikasi tetap berfungsi penuh dengan fallback kuota publik Google PSI.
GEMINI_API_KEY=
```

---

## 🛡️ Keamanan & Etika Crawling
- **SSRF & DNS-Rebinding Protection**: Memvalidasi URL dan menyelesaikan lookup DNS pada *setiap* hop permintaan dan redirect. Memblokir alamat IP lokal, loopback, private network (RFC 1918), dan metadata cloud instance (AWS/GCP `169.254.169.254`).
- **Robots.txt & Per-Path Disallow**: Mematuhi aturan `Disallow` per-path pada `robots.txt` target secara ketat.
- **Sitemap XML Memory Guard**: Membatasi ukuran pembacaan XML sitemap maksimum 8MB per file untuk menjaga stabilitas memori server.
- **Strict HTML Escaping**: Menggunakan fungsi sanitasi `escapeHtml()` pada seluruh data dinamis sebelum disuntikkan ke dokumen print/PDF untuk proteksi XSS total.
- **Express Trust Proxy & Rate Limiter**: Membatasi frekuensi request per-IP dengan pembersihan otomatis memori (*periodic TTL cleanup*). Pada arsitektur multi-instance/autoscaling, batasan ini berlaku *best-effort* per instance.
- **Zero Fabrication Policy**: Seluruh data yang disajikan berasal langsung dari crawling aktual dan provider API resmi. Jika data tertentu (mis. backlink Kwinside atau Core Web Vitals) tidak tersedia, aplikasi menampilkan status kosong (*not available*) tanpa angka tiruan/rekaan.

---

*Dikembangkan untuk tim Prajurit Digital (prajuritdigital.com)*
