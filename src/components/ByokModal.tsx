import React, { useState } from 'react';
import { Key, ShieldCheck, CheckCircle2, AlertCircle, X, ExternalLink, RefreshCw, Zap } from 'lucide-react';
import { postJson } from '../lib/apiClient.ts';

interface ByokModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  onClearApiKey: () => void;
}

export const ByokModal: React.FC<ByokModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  onClearApiKey,
}) => {
  if (!isOpen) return null;

  const [inputKey, setInputKey] = useState(apiKey);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ isValid?: boolean; message?: string } | null>(null);

  const handleTestConnection = async () => {
    if (!inputKey.trim()) {
      setTestResult({ isValid: false, message: 'Masukkan API Key Kwinside terlebih dahulu.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const data = await postJson<{ isValid?: boolean; message?: string }>('/api/kwinside/test', {
        apiKey: inputKey.trim(),
      });
      setTestResult(data);
      if (data.isValid) {
        onSaveApiKey(inputKey.trim());
      }
    } catch (err: any) {
      setTestResult({ isValid: false, message: err.message || 'Gagal memverifikasi ke server Kwinside.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSaveApiKey(inputKey.trim());
    onClose();
  };

  const handleClear = () => {
    setInputKey('');
    onClearApiKey();
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Advanced SEO — BYOK</h3>
            <p className="text-xs text-slate-400">Bring Your Own API Key (Kwinside Provider)</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3.5 bg-slate-900/70 rounded-xl border border-slate-800 text-xs text-slate-300 mb-5 leading-relaxed space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Prinsip Keamanan & Privasi BYOK:</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            API Key tidak disimpan di server dan hanya digunakan selama proses analisis berlangsung.
          </p>
        </div>

        {/* Provider Select */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            SEO Provider
          </label>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-700/70">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
              <span className="text-sm font-bold text-white">Kwinside API</span>
              <span className="text-[10px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded font-mono">
                Official Default
              </span>
            </div>
            <a
              href="https://kwinside.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1 font-medium"
            >
              <span>Get API Key</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* API Key Input */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Kwinside API Key
          </label>
          <input
            type="password"
            placeholder="kwi_live_xxxxxxxxxxxxxxxxxxxx"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none transition"
          />
        </div>

        {/* Test Result Alert */}
        {testResult && (
          <div
            className={`mb-5 p-3 rounded-xl text-xs flex items-center gap-2 border ${
              testResult.isValid
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}
          >
            {testResult.isValid ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Testing...' : 'Test Connection'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl transition"
              >
                Hapus Kunci
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-pink-600/30 cursor-pointer"
            >
              Simpan Sesi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
