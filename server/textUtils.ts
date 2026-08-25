// Shared text analysis, stopword lists, and tokenizer utilities

export const INDONESIAN_STOPWORDS = new Set([
  'yang', 'untuk', 'pada', 'ke', 'para', 'namun', 'menurut', 'antara', 'dia', 'dua',
  'ia', 'seperti', 'jika', 'sehingga', 'kembali', 'dan', 'ini', 'karena', 'kepada',
  'oleh', 'saat', 'harus', 'sementara', 'setelah', 'belum', 'kami', 'sekitar',
  'bagi', 'serta', 'di', 'dari', 'telah', 'sebagai', 'masih', 'hal', 'ketika',
  'adalah', 'itu', 'dengan', 'sampai', 'kalau', 'bisa', 'akan', 'atau', 'ada',
  'mereka', 'sudah', 'saya', 'terhadap', 'secara', 'agar', 'lain', 'anda', 'kamu',
  'kita', 'juga', 'bukan', 'tidak', 'hanya', 'lebih', 'sangat', 'banyak', 'sedang',
  'tentang', 'tersebut', 'dalam', 'bisa', 'dapat', 'menjadi', 'beberapa', 'sebuah',
  'suatu', 'yaitu', 'yakni', 'merupakan', 'adapun', 'bagaimana', 'kenapa', 'mengapa',
  'siapa', 'dimana', 'kapan', 'apakah', 'seperti', 'antara', 'tanpa', 'lalu',
  'kemudian', 'bahkan', 'maupun', 'melalui', 'yakni', 'ialah', 'dimana', 'dimaksud',
  'paling', 'terus', 'selalu', 'lagi', 'pun', 'saja', 'punya', 'buat', 'tetapi',
  'maka', 'tiap', 'setiap', 'bila', 'apabila', 'begitu', 'sejak', 'hingga', 'pula',
  'selama', 'tertentu', 'tentu', 'biasa', 'biasanya', 'misalnya', 'contoh', 'contohnya',
  'web', 'website', 'halaman', 'klik', 'baca', 'selengkapnya', 'informasi', 'artikel'
]);

export const ENGLISH_STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can\'t', 'cannot', 'could', 'couldn\'t',
  'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t',
  'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here',
  'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
  'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it',
  'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my',
  'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same',
  'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so',
  'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll',
  'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under',
  'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re',
  'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where',
  'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with',
  'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve',
  'your', 'yours', 'yourself', 'yourselves', 'com', 'http', 'https', 'www',
  'page', 'read', 'more', 'click', 'here', 'post', 'blog', 'share'
]);

export function isStopword(token: string): boolean {
  const clean = token.toLowerCase().trim();
  if (clean.length <= 2) return true;
  if (/^\d+$/.test(clean)) return true;
  return INDONESIAN_STOPWORDS.has(clean) || ENGLISH_STOPWORDS.has(clean);
}

/**
 * Tokenize raw text into normalized words, filtering punctuation and noise.
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const rawTokens = normalized.split(/\s+/);
  return rawTokens.filter(t => t.length >= 3 && !isStopword(t));
}

/**
 * Generate 1-gram, 2-gram, and 3-gram frequencies from an array of tokens or raw body text.
 */
export function extractNGramsFrequency(text: string, maxTokens = 5000): {
  frequencyMap: Record<string, number>;
  totalTokens: number;
} {
  const frequencyMap: Record<string, number> = {};
  if (!text) return { frequencyMap, totalTokens: 0 };

  const tokens = tokenizeText(text).slice(0, maxTokens);
  const totalTokens = tokens.length;

  // 1-grams
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!isStopword(t)) {
      frequencyMap[t] = (frequencyMap[t] || 0) + 1;
    }
  }

  // 2-grams
  for (let i = 0; i < tokens.length - 1; i++) {
    const t1 = tokens[i];
    const t2 = tokens[i + 1];
    if (!isStopword(t1) && !isStopword(t2) && t1 !== t2) {
      const bi = `${t1} ${t2}`;
      frequencyMap[bi] = (frequencyMap[bi] || 0) + 1;
    }
  }

  // 3-grams
  for (let i = 0; i < tokens.length - 2; i++) {
    const t1 = tokens[i];
    const t2 = tokens[i + 1];
    const t3 = tokens[i + 2];
    if (!isStopword(t1) && !isStopword(t3)) {
      const tri = `${t1} ${t2} ${t3}`;
      frequencyMap[tri] = (frequencyMap[tri] || 0) + 1;
    }
  }

  return { frequencyMap, totalTokens };
}
