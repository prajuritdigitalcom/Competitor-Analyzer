/**
 * Wrapper fetch POST yang aman: memeriksa Content-Type sebelum mem-parse JSON,
 * dan melempar pesan error yang jelas bagi pengguna alih-alih error parsing mentah.
 */
export async function postJson<T = any>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const rawText = await res.text();
    console.error('Respons server bukan JSON:', rawText.slice(0, 300));
    throw new Error(
      res.status === 404
        ? 'Endpoint API tidak ditemukan (404). Kemungkinan server backend belum berjalan dengan benar di environment ini.'
        : `Server memberi respons tak terduga (status ${res.status}). Coba lagi sebentar lagi.`
    );
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Permintaan gagal (status ${res.status}).`);
  }
  return data as T;
}
