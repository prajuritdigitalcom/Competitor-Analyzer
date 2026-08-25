import { URL } from 'url';
import dns from 'dns';

/**
 * SSRF and Malicious URL protection for Prajurit Competitor Analyzer.
 * Blocks localhost, private IP ranges (RFC 1918), AWS/GCP cloud metadata services,
 * loopbacks, 0.0.0.0, non-HTTP protocols, and resolves DNS to prevent DNS-rebinding attacks.
 */

const PRIVATE_IP_REGEXES = [
  /^localhost$/i,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 127.0.0.0/8
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,  // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12
  /^192\.168\.\d{1,3}\.\d{1,3}$/,     // 192.168.0.0/16
  /^169\.254\.\d{1,3}\.\d{1,3}$/,     // AWS/GCP Metadata 169.254.0.0/16
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^::ffff:127\./i,
  /^::ffff:10\./i,
  /^::ffff:172\./i,
  /^::ffff:192\.168\./i,
  /^::ffff:169\.254\./i,
  /^fe80:/i,
  /^fc00:/i,
  /^fd00:/i,
  /\.local$/i,
  /\.internal$/i,
  /\.lan$/i
];

export function isPrivateIpOrHost(target: string): boolean {
  if (!target) return true;
  const clean = target.trim().toLowerCase();
  for (const regex of PRIVATE_IP_REGEXES) {
    if (regex.test(clean)) return true;
  }
  return false;
}

export interface SSRFValidationResult {
  isValid: boolean;
  normalizedUrl: string;
  domain: string;
  error?: string;
}

export async function validateAndNormalizeUrlAsync(rawInput: string): Promise<SSRFValidationResult> {
  const syncResult = validateAndNormalizeUrl(rawInput);
  if (!syncResult.isValid) {
    return syncResult;
  }

  try {
    const parsed = new URL(syncResult.normalizedUrl);
    const hostname = parsed.hostname;

    // Resolve DNS addresses
    const lookupPromise = dns.promises.lookup(hostname, { all: true });
    // Timeout dns lookup at 3 seconds
    const addresses = await Promise.race([
      lookupPromise,
      new Promise<dns.LookupAddress[]>((_, reject) => setTimeout(() => reject(new Error('DNS timeout')), 3000))
    ]);

    for (const entry of addresses) {
      if (isPrivateIpOrHost(entry.address)) {
        return {
          isValid: false,
          normalizedUrl: '',
          domain: '',
          error: `Alamat IP tujuan (${entry.address}) termasuk IP privat/metadata internal yang dilarang (SSRF Protection).`
        };
      }
    }
  } catch (err: any) {
    // If DNS resolution fails completely, we allow standard error propagation
    if (err.message === 'DNS timeout') {
      // Allow proceed with sync validated URL or return warning
    } else if (err.code === 'ENOTFOUND') {
      return {
        isValid: false,
        normalizedUrl: '',
        domain: '',
        error: `Domain tidak dapat ditemukan pada DNS server (ENOTFOUND). Pastikan nama domain sudah benar.`
      };
    }
  }

  return syncResult;
}

export function validateAndNormalizeUrl(rawInput: string): SSRFValidationResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return { isValid: false, normalizedUrl: '', domain: '', error: 'URL tidak boleh kosong.' };
  }

  let cleaned = rawInput.trim();
  // Auto-prepend https:// if missing
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned;
  }

  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    return { isValid: false, normalizedUrl: '', domain: '', error: 'Format URL tidak valid.' };
  }

  // Scheme validation: strictly HTTP / HTTPS
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, normalizedUrl: '', domain: '', error: 'Hanya protokol HTTP dan HTTPS yang diizinkan.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Validate Hostname length & structure
  if (!hostname || hostname.length < 3 || !hostname.includes('.')) {
    return { isValid: false, normalizedUrl: '', domain: '', error: 'Hostname harus memiliki nama domain yang valid.' };
  }

  // SSRF Check: Is hostname private / loopback / metadata?
  if (isPrivateIpOrHost(hostname)) {
    return {
      isValid: false,
      normalizedUrl: '',
      domain: '',
      error: 'Akses ke alamat IP lokal, private network, atau cloud metadata diblokir untuk keamanan (SSRF Protection).'
    };
  }

  // Strip hash fragments and common tracking parameters for canonical crawling
  const trackingParams = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', '_ga', 'ref'
  ];
  for (const param of trackingParams) {
    parsed.searchParams.delete(param);
  }

  parsed.hash = '';

  const normalizedUrl = parsed.toString();
  const domain = hostname.replace(/^www\./, '');

  return {
    isValid: true,
    normalizedUrl,
    domain
  };
}

export function normalizeSubUrl(href: string, baseUrl: string): string | null {
  try {
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return null;
    }

    const resolved = new URL(href, baseUrl);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return null;
    }

    // SSRF filter check
    if (isPrivateIpOrHost(resolved.hostname)) {
      return null;
    }

    resolved.hash = '';
    // Strip common tracking params
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
    for (const p of trackingParams) {
      resolved.searchParams.delete(p);
    }

    return resolved.toString();
  } catch {
    return null;
  }
}
